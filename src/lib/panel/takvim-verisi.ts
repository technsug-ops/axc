import { kartBorcuHesapla, type BorcAlimi } from "@/lib/kart-borcu";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import {
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
    /**
     * ⚠ NEGATİF KALEM ARTIK ALINIYOR — mimar kararı 24.08.2026.
     *
     * Eski kod `tutar <= 0` olanı ATIYORDU ve gerekçesi şuydu: "negatif
     * kalem girecek para değildir". Doğru görünüyordu ama takvimi
     * İYİMSER yapıyordu: `IADE_TUTARI −7.025,75` atılınca aynı siparişin
     * `SIPARIS_TUTARI +7.025,75`'i tek başına kalıyor ve kanal o parayı
     * ödeyecekmiş gibi duruyordu — oysa iade onu geri almış.
     *
     * Ölçüldü (24.08): bekleyen kalemlerde `IADE_TUTARI −11.434,09` ·
     * `KUPON −3.660,50` · `PROMOSYON −222` · `INDIRIM −28,20`. Hepsi
     * girecek paradan DÜŞER.
     *
     * ⚠ SIFIR ATILIR, NEGATİF ATILMAZ: sıfır tutarlı kalem takvime bir
     * şey katmaz ama satır sayısını şişirir.
     */
    if (tutar === 0) continue;
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

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  TAHMİN BLOĞU KALDIRILDI — MİMAR KARARI 24.08.2026
   * ----------------------------------------------------------------------
   *  Burada `HAKEDIS_TAHMIN` satırları üretiliyordu: rapora düşmemiş
   *  satışlardan, kanal ayarındaki `payoutDays` ile vade TAHMİN edilerek.
   *
   *  ⚠ NİYE DÜŞTÜ — İKİ SEBEP:
   *  ① **Nakit ≠ kâr.** Girişler kanal belgesinden okunur; satış
   *     defterinden türetilmez. Tahmin, ölçülmüş bir vadeyle uydurulmuş
   *     bir vadeyi aynı toplama katıyordu.
   *  ② **Defter eksik ölçüldü** (K20: TY 01–20.08'de döküm 147 adet,
   *     bizde 71 — %48). Tahmin, eksik defterin üstüne kuruluyordu:
   *     girilmemiş satışın parası tahmine HİÇ girmiyor, ama kanal onu
   *     ödüyor ve hakediş dosyasında duruyor.
   *
   *  ⚠ VE ÇİFT SAYIM KAPISI DA GEREKSİZLEŞTİ: tek kaynak kaldığı için
   *  aynı para iki yoldan girmesi imkânsız. `raporluSatisIdleri` /
   *  `raporluSiparisNolari` kümeleri artık kullanılmıyor.
   * ══════════════════════════════════════════════════════════════════════
   */

  return satirlar;
}

/** Panelin kullandığı "bugün" — iş takvimi (Europe/Istanbul). */
export function takvimBugunu(): Date {
  return gunDegeri(isTakvimGunu(new Date()));
}

/**
 * ============================================================================
 *  TAKVİMİN UFKU — SON HAKEDİŞ PARTİSİ (24.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ HAKEDİŞ DOSYASI DONMUŞ KAYNAK. Girişler artık YALNIZ o dosyadan
 *  okunuyor; dolayısıyla takvimin görebildiği en son gün, son partinin
 *  taşıdığı en son vadedir. Bundan sonrası **yok değil, GÖRÜNMÜYOR** ve
 *  ikisi apayrı şey.
 *
 *  Ekran bunu kendisi söylemek zorunda: "son parti X — bundan sonrası
 *  görünmüyor". Söylemezse kullanıcı boş bir ufku "para gelmiyor" diye
 *  okur ve olmayan bir açığa hazırlanır.
 *  (Anayasa: donmuş kaynak akan kaynakla karşılaştırılırken iki damga.)
 * ============================================================================
 */
export type HakedisUfku = {
  partiSayisi: number;
  /** En eski ve en yeni parti — dosyanın dönemi. */
  ilkParti: Date | null;
  sonParti: Date | null;
  /** Kalemlerin taşıdığı EN SON vade — takvimin gerçek ufku. */
  sonVade: Date | null;
};

export async function sonHakedisPartisi(): Promise<HakedisUfku> {
  const [partiler, sonVadeli] = await Promise.all([
    prisma.settlement.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.settlementItem.findFirst({
      where: { dueDate: { not: null } },
      select: { dueDate: true },
      orderBy: { dueDate: "desc" },
    }),
  ]);
  return {
    partiSayisi: partiler.length,
    ilkParti: partiler[0]?.createdAt ?? null,
    sonParti: partiler[partiler.length - 1]?.createdAt ?? null,
    sonVade: sonVadeli?.dueDate ?? null,
  };
}
