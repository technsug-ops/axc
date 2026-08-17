import { acikPartilerToplu } from "@/lib/stok";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import { nakitTakvimiKur } from "@/lib/panel/nakit-takvimi";
import { takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";

import { izneGoreSuz, nakitAcigiOlcumu, uyarilariKur } from "./kurallar";
import { maliyetsizVaryantlar } from "./maliyetsiz-stok";
import { yedekOlcumu } from "./yedek";
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

/**
 * SON BAŞARILI YEDEĞİN ZAMANI — depo listesinden.
 *
 * ⚠ NEDEN VERİTABANI DAMGASI DEĞİL: "yedek alındı" damgasını veritabanına
 * yazmak yeni bir tablo/kolon, yani migration demekti — ve tam bu sırada
 * canlı migration bekliyor. Daha önemlisi: damga veritabanında dursaydı,
 * veritabanının kendisi gittiğinde yedeğin varlığını da kaybederdik.
 * Dosyanın KENDİSİ tek doğru kanıttır; listeleme onu okur.
 *
 * OKUNAMAZSA `null` DÖNER — ve null "yedek yok" uyarısı yakar. Hata
 * yutulup "sorun yok" sayılmaz: doğrulanamayan yedek, yedek değildir.
 */
async function sonYedekZamani(): Promise<Date | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "yedek/" });
    if (blobs.length === 0) return null;
    return blobs
      .map((b) => new Date(b.uploadedAt))
      .reduce((enYeni, t) => (t > enYeni ? t : enYeni));
  } catch {
    return null;
  }
}

export async function uyarilariTopla(): Promise<Uyari[]> {
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  const [
    takvimSatirlari,
    gorevSayilari,
    gecikenHakedis,
    partiler,
    cevapsizTalep,
    sonYedek,
  ] = await Promise.all([
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
      sonYedekZamani(),
    ]);

  const takvim = nakitTakvimiKur({
    satirlar: takvimSatirlari,
    bugun,
    pencereGun: 14,
  });

  /**
   * Yedek yaşı İŞ TAKVİMİ GÜNÜNE göre ölçülür — yedek zamanı da aynı
   * takvime indirilir ki "bugün alındı" saat farkından "1 gün" görünmesin.
   */
  const yedek = yedekOlcumu(
    sonYedek === null ? null : gunDegeri(isTakvimGunu(sonYedek)),
    bugun,
  );

  const uyarilar = uyarilariKur({
    nakitAcigi: nakitAcigiOlcumu(takvim.netPozisyon),
    yedekEski: yedek.yedekEski,
    yedekYok: yedek.yedekYok,
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
  const [karGorunur, destekYonetir, veriAktarir] = await Promise.all([
    izinVarMi("satis.kar.gor"),
    izinVarMi("destek.yonet"),
    izinVarMi("veri.aktar"),
  ]);
  return izneGoreSuz(uyarilar, (izin) => {
    if (izin === "satis.kar.gor") return karGorunur;
    if (izin === "destek.yonet") return destekYonetir;
    if (izin === "veri.aktar") return veriAktarir;
    return true;
  });
}
