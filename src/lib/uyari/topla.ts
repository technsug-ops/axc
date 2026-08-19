import { acikPartilerToplu } from "@/lib/stok";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { gorevSayilariniTopla } from "@/lib/panel/gorev-verisi";
import { nakitTakvimiKur } from "@/lib/panel/nakit-takvimi";
import { takvimSatirlariniTopla } from "@/lib/panel/takvim-verisi";
import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";

import { SUPHELI_ORAN_ESIGI } from "@/lib/komisyon/oran-uyarisi";

import { kanalKodsuzStokluVaryantlar, supheliVeriBulgusu } from "./faz2-veri";
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

/**
 * GECİKME KOŞULU — TEK KAYNAK.
 *
 * ⚠ İKİ SAYI TEK SINIRDAN. `hakedisGecikti` (kırmızı) ve
 * `hakedisBaglanmamis` (muafiyet beyanı) YALNIZCA `saleId` ile ayrılır;
 * gecikme tanımı ikisinde de aynıdır. Ayrı ayrı yazılsaydı biri
 * değiştirilip öteki unutulur, "kaç kalem muaf tutuldu" sorusunun cevabı
 * kırmızı sayıyla tutmazdı.
 *
 * ⚠ SINIR `bugun`, `new Date()` DEĞİL — İŞ TAKVİMİ günü. Vadesi BUGÜN
 * dolan kalem henüz gecikmiş değildir. (Bu sınır 19.08.2026'da bir
 * raporlama hatasına yol açtı: sonda `new Date()` ile ölçüp **83**
 * bulmuştum, ekran `bugun` ile **67** diyordu. İkisi de kendi sınırında
 * doğruydu; ayrışan şey ölçüt değil, benim raporumdu.)
 */
function gecikmeKosulu(bugun: Date) {
  return { paidAt: null, dueDate: { not: null, lt: bugun } };
}

export async function uyarilariTopla(): Promise<Uyari[]> {
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  const [
    takvimSatirlari,
    gorevSayilari,
    gecikenHakedis,
    baglanmamisHakedis,
    partiler,
    cevapsizTalep,
    sonYedek,
    supheBulgusu,
    supheliOranSayisi,
    kanalKodsuzlar,
    zararinaSatisSayisi,
  ] = await Promise.all([
      takvimSatirlariniTopla(bugun),
      gorevSayilariniTopla(),
      /**
       * VADE KALEMDE. `paidAt` boş VE vadesi bugünden önce olan kalemler.
       * `lt: bugun` — bugün vadesi dolan henüz GECİKMİŞ değildir.
       */
      /**
       * ═══════════════════════════════════════════════════════════════
       *  ⚠ HAYALET KIRMIZI — SATIŞA BAĞLANAMAYAN KALEM SAYILMAZ
       * ---------------------------------------------------------------
       *  Canlı bulgu 19.08.2026 (mimar): çan "67 hakediş kalemi gecikti ·
       *  ₺137.975" diyordu. Ölçüm: sistemdeki ÜÇ hakediş partisinin
       *  177 farklı sipariş numarasının **HİÇBİRİ** bir satış kaydıyla
       *  eşleşmiyor — en yeni parti dahil.
       *
       *  Yani bu kalemler bizim defterimizde takip edilen bir alacak
       *  DEĞİL, içe aktarılmış bir rapor satırı. Kanal çoktan ödemiş
       *  olabilir; sistem bilemez. "Gecikti" demek, bilmediğimiz bir şeyi
       *  iddia etmekti — ve her gün ₺138K'lık sahte panik taşımak rozete
       *  olan güveni bitirir ("her zaman çıkan uyarı bilgi taşımaz").
       *
       *  ⚠ MUAFİYET SESSİZ DEĞİL: dışarıda kalanlar `hakedisBaglanmamis`
       *  nötr uyarısında ADIYLA sayılıyor. Sessiz muafiyet, ₺138K'yı
       *  hiçbir yerde görünmeden yok ederdi.
       *
       *  Bağlama çalışır çalışmaz bu uyarı KENDİLİĞİNDEN doğru sayıya
       *  döner; kural değil, kapsam daraltıldı.
       * ═══════════════════════════════════════════════════════════════
       */
      prisma.settlementItem.aggregate({
        where: { ...gecikmeKosulu(bugun), saleId: { not: null } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.settlementItem.count({
        where: { ...gecikmeKosulu(bugun), saleId: null },
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
      /**
       * ⚠ SORGU BURADA YAZILMAZ — `faz2-veri.ts`ten çağrılır. Uyarının
       * götürdüğü EKRAN da aynı gövdeyi çağırıyor; iki taraf kendi
       * sorgusunu yazsaydı bir gün ayrışır, çan "1" derken liste 40
       * satır gösterirdi (görev kutusu vakası, 15.08.2026).
       */
      supheliVeriBulgusu(gunDegeri(isTakvimGunu(new Date()))),
      /**
       * ⚠ EŞİK K3'TEN OKUNUR, KOPYALANMAZ. Aynı sayı iki yerde yaşasaydı
       * biri değiştirilip öteki unutulurdu; form bir şeyi şüpheli sayarken
       * çan başka bir şeyi sayardı.
       */
      prisma.saleItem.count({
        where: {
          sale: { iptalTarihi: null },
          commissionRate: { lt: SUPHELI_ORAN_ESIGI },
        },
      }),
      kanalKodsuzStokluVaryantlar(),
      /**
       * ⚠ SÜZGEÇLE AYNI KOŞUL. `/satislar?kar=zarar` şunu uyguluyor:
       * `profitStatus: "CALCULATED"` VE `net2Amount < 0`. Buraya yalnız
       * `net2Amount < 0` yazsaydık, kârı henüz hesaplanmamış kalemler
       * sayıya girer ama listede çıkmazdı — sayı ile liste ayrışırdı.
       */
      prisma.saleItem.count({
        where: {
          sale: { iptalTarihi: null },
          profitStatus: "CALCULATED",
          net2Amount: { lt: 0 },
        },
      }),
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
    veriSupheli: { sayi: supheBulgusu.kalemSayisi },
    supheliOran: { sayi: supheliOranSayisi },
    kanalKodsuzStok: { sayi: kanalKodsuzlar.length },
    hakedisBaglanmamis: { sayi: baglanmamisHakedis },
    zararinaSatis: { sayi: zararinaSatisSayisi },
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
