import { gunEkle, gunDegeri, isTakvimGunu } from "@/lib/donem";
import { beklenenHakedis, beklenenVade } from "@/lib/hakedis/eslestir";
import { satisCikisMaliyeti } from "@/lib/iade";
import { kartBorcuHesapla, type BorcAlimi } from "@/lib/kart-borcu";
import { prisma } from "@/lib/prisma";

import {
  TAKVIM_PARA_BIRIMI,
  type TakvimSatiri,
} from "./nakit-takvimi";

/**
 * ============================================================================
 *  NAKİT TAKVİMİ — VERİ TOPLAMA
 * ----------------------------------------------------------------------------
 *  Saf takvim mantığı `nakit-takvimi.ts`te; burası onu BESLEYEN katman.
 *  Hiçbir hesap kuralı burada doğmaz: kart tarafı `kart-borcu.ts`ten,
 *  hakediş tarafı `hakedis/eslestir.ts`ten okunur. İKİNCİ MOTOR YOK.
 *
 *  ── ÇİFT SAYIM: "RAPOR KAZANIR" ──────────────────────────────────────────
 *  Bir satışın parası iki yoldan görünebilir: pazaryeri raporundan gelen
 *  KESİN kalem (`SettlementItem`) ve rapora henüz düşmemişler için üretilen
 *  TAHMİN. İkisi birden sayılırsa aynı para iki kez girecek görünür.
 *  Kural: rapordan kalemi OLAN satış tahmin listesine GİRMEZ. Bu, vade
 *  motorunun zaten yazılı olan "RAPOR VARSA RAPOR KAZANIR" ilkesinin
 *  takvimdeki karşılığı.
 *
 *  ── KART ÖDEMELERİ ARTIK KAYITTAN OKUNUYOR (16.08.2026) ──────────────────
 *  Bu bölüm eskiden "sistemde ödedim kaydı YOK, o hâlde geçmiş ekstreler
 *  ÖDENMİŞ SAYILIR" diyordu. Varsayım dürüsttü ama bir varsayımdı.
 *
 *  `KartOdeme` geldi: hangi ekstreye ne ödendiği gerçek kayıtta duruyor.
 *  Artık geçmiş ekstre görmezden GELİNMEZ — kapanmışsa zaten kalanı
 *  sıfırdır ve takvime girmez; kapanmamışsa GERÇEKTEN gecikmiştir ve
 *  gecikmiş olarak girer. Kart tarafında kalan varsayım sıfır.
 *
 *  Takvime giren tutar `ekstre.kalan`dır, `ekstre.toplam` DEĞİL: kısmen
 *  ödenmiş bir ekstrenin tamamını nakit ihtiyacı saymak, ödenen parayı
 *  ikinci kez çıkacak göstermek olurdu.
 *
 *  ── TEK PARA BİRİMİ ──────────────────────────────────────────────────────
 *  Satırlar para birimini TAŞIR ama takvim TRY dışını toplamaz; ayıklama
 *  saf katmanda yapılır ki kural tek yerde sınanabilsin.
 * ============================================================================
 */

/** Tahmin üretilirken geriye kaç gün bakılır. */
const TAHMIN_GERIYE_GUN = 120;

export async function takvimSatirlariniTopla(
  bugun: Date,
): Promise<TakvimSatiri[]> {
  const satirlar: TakvimSatiri[] = [];

  // ---------------------------------------------------------------- KARTLAR
  const [kartlar, kartAlimlari, kartOdemeleri] = await Promise.all([
    prisma.creditCard.findMany({
      where: { isActive: true },
      orderBy: { label: "asc" },
    }),
    prisma.purchase.findMany({
      where: { creditCardId: { not: null }, NOT: { status: "CANCELLED" } },
      select: {
        id: true,
        code: true,
        purchasedAt: true,
        installmentCount: true,
        creditCardId: true,
        items: {
          select: {
            quantity: true,
            unitCostAmount: true,
            unitCostCurrency: true,
          },
        },
      },
      orderBy: { purchasedAt: "asc" },
    }),
    /**
     * TERS KAYITLAR AYIKLANMAZ. Ters alma yeni bir satır olarak yazılır ve
     * tutarı NEGATİFTİR (ledger değiştirilmez, düzeltilir). Hepsini toplamak
     * doğru neti verir; `isReversal` süzmek düzeltmeyi görünmez kılardı.
     */
    prisma.kartOdeme.findMany({
      select: { cardId: true, donem: true, odenenAnaBorc: true },
    }),
  ]);

  for (const kart of kartlar) {
    const borcAlimlari: BorcAlimi[] = [];
    for (const a of kartAlimlari) {
      if (a.creditCardId !== kart.id) continue;
      // Kartın para birimindeki kalemler; karışık para biriminde toplama
      // yapılmaz (kur çevrilmez).
      let tutar = 0;
      for (const k of a.items) {
        if (k.unitCostCurrency !== kart.currency) continue;
        tutar += Number(k.unitCostAmount.toString()) * k.quantity;
      }
      if (tutar <= 0) continue;
      borcAlimlari.push({
        id: a.id,
        kod: a.code,
        tarih: a.purchasedAt,
        tutar,
        taksitSayisi: a.installmentCount,
      });
    }

    const sonuc = kartBorcuHesapla(
      borcAlimlari,
      {
        kesimGunu: kart.statementDay,
        sonOdemeGunu: kart.dueDay,
        limit: null,
      },
      bugun,
      kartOdemeleri
        .filter((o) => o.cardId === kart.id)
        .map((o) => ({
          donem: o.donem,
          odenenAnaBorc: Number(o.odenenAnaBorc.toString()),
        })),
    );

    /**
     * KESİM GÜNÜ TANIMSIZSA BORÇ SIFIR DEĞİL, BİLİNMİYOR. Vadesiz satır
     * olarak geçer; takvime girmez ama ekranda "?" ile görünür.
     */
    if (!sonuc.hesaplanabilir) {
      satirlar.push({
        yon: "CIKACAK",
        kaynak: "KART",
        tarih: null,
        tutar: 0,
        paraBirimi: kart.currency,
        baslik: kart.label,
        adres: `/kart-borcu`,
      });
      continue;
    }

    for (const ekstre of sonuc.ekstreler) {
      // Kapanmış ekstre takvime girmez — kalanı sıfırdır, varsayım değil
      // kayıt söylüyor. Son ödeme günü yoksa vade bilinmiyordur.
      if (ekstre.kalan <= 0) continue;
      satirlar.push({
        yon: "CIKACAK",
        kaynak: "KART",
        tarih: ekstre.sonOdemeTarihi,
        tutar: ekstre.kalan,
        paraBirimi: kart.currency,
        baslik: kart.label,
        adres: `/kart-borcu`,
      });
    }
  }

  // ------------------------------------------------- HAKEDİŞ — RAPORDAN
  /**
   * `paidAt` boşsa kalem BEKLEYEN paradır (şema notu). Vadesi geçmiş ve
   * hâlâ ödenmemişse GERÇEKTEN gecikmiştir — kart tarafının aksine burada
   * ödeme bilgisi tutuluyor, varsayım yapmıyoruz.
   */
  const raporKalemleri = await prisma.settlementItem.findMany({
    where: { paidAt: null, dueDate: { not: null } },
    select: {
      id: true,
      amount: true,
      dueDate: true,
      saleId: true,
      orderNo: true,
      sale: { select: { code: true } },
      settlement: { select: { id: true, currency: true } },
    },
  });

  /**
   * ÇİFT SAYIM KAPISI İKİ ANAHTARLI — 15.08.2026 canlı denetimi.
   *
   * Kapı önce yalnız `saleId`ye bakıyordu. Canlıda ölçüldü: 110 rapor
   * kaleminin HİÇBİRİ bir satışa bağlı değil (`saleId` boş), çünkü
   * eşleştirme henüz yapılmamış. Yani koruma hiç devreye girmiyordu ve
   * çakışma olmaması TESADÜFTÜ — 75 rapor sipariş numarası ile 10 tahmin
   * satışı o gün kesişmiyordu. İlk kesişen siparişte aynı para iki kez
   * "girecek" sayılacaktı.
   *
   * İkinci anahtar SİPARİŞ NUMARASI: rapor kalemi bir satışa bağlanmamış
   * olsa bile sipariş numarasını taşıyor. Eşleştirme yapılmadan da kapı
   * çalışıyor.
   */
  const raporluSatisIdleri = new Set<string>();
  const raporluSiparisNolari = new Set<string>();
  for (const k of raporKalemleri) {
    if (k.saleId) raporluSatisIdleri.add(k.saleId);
    const siparisNo = (k.orderNo ?? "").trim();
    if (siparisNo) raporluSiparisNolari.add(siparisNo);
    const tutar = Number(k.amount.toString());
    // Negatif kalem (kesinti/mahsup) girecek para değildir; takvimi
    // yanıltmasın diye alınmaz — hakediş ekranında zaten görünüyor.
    if (tutar <= 0) continue;
    satirlar.push({
      yon: "GIRECEK",
      kaynak: "HAKEDIS_RAPOR",
      tarih: k.dueDate,
      tutar,
      paraBirimi: k.settlement.currency,
      baslik: k.sale?.code ?? "—",
      adres: `/hakedis`,
    });
  }

  // -------------------------------------------------- HAKEDİŞ — TAHMİN
  /**
   * Rapora düşmemiş satışlar. ÇİFT SAYIM KAPISI: rapordan kalemi olan
   * satış buraya GİRMEZ (`raporluSatisIdleri`).
   */
  const geriye = gunEkle(bugun, -TAHMIN_GERIYE_GUN);
  const satislar = await prisma.sale.findMany({
    where: {
      /**
       * İPTAL EDİLEN SATIŞTAN PARA GELMEZ. Tahmine girseydi takvim var
       * olmayan bir tahsilatı beklerdi ve nakit açığı uyarısı geç yanardı.
       */
      iptalTarihi: null,
      soldAt: { gte: geriye },
      net1Amount: { not: null },
      // İKİ ANAHTAR: eşleşmiş satış kimliği VE rapordaki sipariş numarası.
      id: { notIn: [...raporluSatisIdleri] },
      NOT: { code: { in: [...raporluSiparisNolari] } },
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      net1Amount: true,
      profitCurrency: true,
      channelAccount: {
        select: { payoutDays: true, payoutDaysAreBusinessDays: true },
      },
      items: {
        select: {
          /**
           * SÜZGEÇ YOK — 17.08.2026. `type: "SALE_OUT"` süzgeci adet
           * azaltmanın ayna girişini görmüyor ve nakit takvimi maliyeti
           * fazla sayıyordu (aynı kök: satış 11513025054).
           */
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
    },
  });

  for (const s of satislar) {
    const vade = beklenenVade(
      s.soldAt,
      null,
      s.channelAccount.payoutDays,
      s.channelAccount.payoutDaysAreBusinessDays,
    );

    /**
     * MALİYET BİLİNMİYORSA TUTAR ÜRETİLMEZ. "Planlı tarih, tutar yok"
     * satırı takvime GİRMEZ (sözleşme); vadesiz listesinde durur.
     */
    let maliyet: number | null = 0;
    for (const k of s.items) {
      const kalemMaliyeti = satisCikisMaliyeti(k.stockMovements);
      if (kalemMaliyeti === null) {
        maliyet = null;
        break;
      }
      maliyet += kalemMaliyeti;
    }

    const net1 = Number(s.net1Amount!.toString());
    const tutar = maliyet === null ? null : beklenenHakedis(net1, maliyet);

    satirlar.push({
      yon: "GIRECEK",
      kaynak: "HAKEDIS_TAHMIN",
      // Vade ya da tutar bilinmiyorsa satır VADESİZ sayılır: sıfır
      // varsaymak yerine "?" ile görünür.
      tarih: tutar === null ? null : (vade?.tarih ?? null),
      tutar: tutar ?? 0,
      paraBirimi: s.profitCurrency ?? TAKVIM_PARA_BIRIMI,
      baslik: s.code ?? "—",
      adres: `/satislar/${s.id}`,
    });
  }

  return satirlar;
}

/** Panelin kullandığı "bugün" — iş takvimi (Europe/Istanbul). */
export function takvimBugunu(): Date {
  return gunDegeri(isTakvimGunu(new Date()));
}
