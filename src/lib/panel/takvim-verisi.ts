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
 *  ── KART ÖDEMELERİ TAKİP EDİLMİYOR (bilinen sınır) ───────────────────────
 *  Sistemde "bu ekstreyi ödedim" diye bir kayıt YOK. Bu yüzden geçmiş
 *  ekstreler ÖDENMİŞ SAYILIR ve takvime gecikmiş olarak GİRMEZ.
 *  Aksi hâlde aylar öncesinin ekstreleri "gecikmiş borç" diye toplanır ve
 *  ekranda kocaman, tamamen uydurma bir rakam çıkardı. `kart-borcu.ts`in
 *  `bekleyenToplam` tanımı da aynı varsayımda ("bugünden sonraki
 *  ekstreler") — iki yerde iki farklı varsayım olmasın.
 *  Gecikmiş bölümü bu yüzden bugün YALNIZ hakediş tarafından beslenir;
 *  orada `paidAt` gerçekten tutuluyor.
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
  const [kartlar, kartAlimlari] = await Promise.all([
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
      // Geçmiş ekstre ödendi sayılır (bkz. başlık: kart ödemeleri
      // takip edilmiyor). Son ödeme günü yoksa vade bilinmiyordur.
      if (ekstre.gecmisMi) continue;
      if (ekstre.toplam <= 0) continue;
      satirlar.push({
        yon: "CIKACAK",
        kaynak: "KART",
        tarih: ekstre.sonOdemeTarihi,
        tutar: ekstre.toplam,
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
      sale: { select: { code: true } },
      settlement: { select: { id: true, currency: true } },
    },
  });

  const raporluSatisIdleri = new Set<string>();
  for (const k of raporKalemleri) {
    if (k.saleId) raporluSatisIdleri.add(k.saleId);
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
      soldAt: { gte: geriye },
      net1Amount: { not: null },
      id: { notIn: [...raporluSatisIdleri] },
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
          stockMovements: {
            where: { type: "SALE_OUT" },
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
