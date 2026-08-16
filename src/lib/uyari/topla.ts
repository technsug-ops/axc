import { acikPartilerToplu } from "@/lib/stok";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import { nakitTakvimiKur } from "@/lib/panel/nakit-takvimi";
import { takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";

import { izneGoreSuz, nakitAcigiOlcumu, uyarilariKur } from "./kurallar";
import { maliyetsizVaryantlar } from "./maliyetsiz-stok";
import type { Uyari } from "./turler";

/**
 * ============================================================================
 *  UYARI TOPLAYICI — VERİ TARAFI
 * ----------------------------------------------------------------------------
 *  Dördü de MEVCUT motorlardan okunur; bu dosya yeni bir hesap YAZMAZ.
 *
 *  ── KOPYA YASAK (mimar kuralı) ──────────────────────────────────────────
 *  1. Nakit açığı  → `nakitTakvimiKur` (panelin kullandığı motorun aynısı)
 *  2. Maliyetsiz   → `acikPartilerToplu` + `maliyetsizVaryantlar`
 *                    (stok süzgeci de aynı fonksiyonu çağırıyor)
 *  3. Kârsız satış → `gorevSayilariniTopla` (panel görev kutusunun sayacı)
 *  4. Geciken hakediş → `SettlementItem.dueDate/paidAt`
 *
 *  Üçüncüsü özellikle önemli: çan kendi `prisma.sale.count` sorgusunu
 *  yazsaydı, görev kutusundaki koşul bir gün değişip çandaki kalırdı ve
 *  aynı ekranda iki farklı sayı görünürdü.
 *
 *  ── HAKEDİŞ VADESİ KALEMDE, ÜST KAYITTA DEĞİL ───────────────────────────
 *  ⚠ `Settlement.paidAt` bir İÇE AKTARMA partisine aittir; ödeme vadesi
 *  `SettlementItem.dueDate`te tutulur. Yanlış seviyeden okunursa uyarı
 *  sessizce boş çıkar — yani hata "0 uyarı" olarak görünür ve kimse fark
 *  etmez. Sözleşmede bu ayrıca uyarı olarak yazılmıştı (15.08.2026).
 *
 *  ── PAHALI HESAP, BLOKLAMAYAN ÇAĞRI ─────────────────────────────────────
 *  Maliyetsiz stok bütün stok hareketlerini okuyan FIFO motorunu çalıştırır.
 *  Bu yüzden çan sayıları sayfa çizimini BEKLETMEZ; bileşen bağlandıktan
 *  sonra çağırır (bkz. `uyari-cani.tsx`).
 * ============================================================================
 */

export async function uyarilariTopla(): Promise<Uyari[]> {
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  const [takvimSatirlari, gorevSayilari, gecikenHakedis, partiler, cevapsizTalep] =
    await Promise.all([
      takvimSatirlariniTopla(bugun),
      gorevSayilariniTopla(),
      /**
       * VADE KALEMDE. `paidAt` boş VE vadesi bugünden önce olan kalemler.
       * `lt: bugun` — bugün vadesi dolan henüz GECİKMİŞ değildir.
       */
      prisma.settlementItem.aggregate({
        where: { paidAt: null, dueDate: { not: null, lt: bugun } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      acikPartilerToplu(prisma, null),
      /**
       * CEVAPLANMAMIŞ TALEP — henüz ELE ALINMAMIŞ olanlar.
       *
       * Yalnız ACIK sayılıyor: INCELENIYOR/YAPILIYOR zaten görülmüş ve iş
       * başlamış demektir; onları da saymak uyarıyı iş bitene kadar yanar
       * hâlde tutar ve sönmeyen uyarı bir süre sonra okunmaz olur.
       */
      prisma.talep.count({ where: { durum: "ACIK" } }),
    ]);

  const takvim = nakitTakvimiKur({
    satirlar: takvimSatirlari,
    bugun,
    pencereGun: 14,
  });

  const uyarilar = uyarilariKur({
    nakitAcigi: nakitAcigiOlcumu(takvim.netPozisyon),
    maliyetsizStok: { sayi: maliyetsizVaryantlar(partiler).length },
    karHesaplanamayan: { sayi: gorevSayilari.karHesaplanamayan },
    cevapsizTalep: { sayi: cevapsizTalep },
    hakedisGecikti: {
      sayi: gecikenHakedis._count._all,
      tutar:
        gecikenHakedis._sum.amount === null
          ? null
          : Number(gecikenHakedis._sum.amount.toString()),
    },
  });

  /**
   * İZİN SÜZGECİ BURADA, sayım öncesinde. Rozet 3 gösterip listede 1 uyarı
   * çizmek "iki uyarı saklanıyor" demek olurdu — hem kafa karıştırır hem
   * saklananın varlığını sızdırır.
   */
  const [karGorunur, destekYonetir] = await Promise.all([
    izinVarMi("satis.kar.gor"),
    izinVarMi("destek.yonet"),
  ]);
  return izneGoreSuz(uyarilar, (izin) => {
    if (izin === "satis.kar.gor") return karGorunur;
    if (izin === "destek.yonet") return destekYonetir;
    return true;
  });
}
