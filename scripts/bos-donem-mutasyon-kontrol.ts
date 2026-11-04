import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  BOŞ DÖNEM UYARISI — MUTASYON HARNESSİ (K369, 04.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run bos-donem-mutasyon:kontrol
 *
 *  ⚠ KAPSAM BEYAN EDİLİYOR: bu harness `kart-analizi:dogrula`nın bütün
 *  ölçütlerini değil, yalnız **K369 kapısını** sınar — seçili dönemde satış
 *  yokken ekranın SEBEBİ söylemesi, tüm-zaman sayısını taşıması ve tek tıkla
 *  genişletmesi; artı «Tüm zamanlar» aralığının VERİDEN kurulması.
 *
 *  ⛔ NİYE BU: kullanıcı 04.11.2026 günü bildirdi — 4 satışı olan bir üründe
 *  kârlılık kartı bomboş açıldı ve ekranı bozuk sandı («veriler gözükmüyor»).
 *  Ölçüldü (`scripts/canli-kart-donemi-olcum.ts`): satışlar 11.08 · 29.08 ·
 *  10.09 · 12.09; varsayılan pencere son 30 gün (05.10–04.11) ve dördü de
 *  dışarıda. Veri sağlamdı, aritmetik doğruydu — eksik olan CÜMLEYDİ:
 *  «bu dönemde satış yok» hem «hiç satmadı»yı hem «pencerenin dışında»yı
 *  aynı gösteriyordu.
 *
 *  ⚠ VE SAYI ZATEN EKRANDAYDI: kartın başlığı «TÜM ZAMANLAR 4 satış» yazıyor.
 *  Sistem biliyordu, söylemiyordu — tam da mutasyonsuz bir bekçinin
 *  göremeyeceği yer, çünkü hiçbir şey hata vermiyor.
 *
 *  Üç kapı (öteki mutasyon harnessleriyle aynı gövde):
 *    ① desen kaynakta TAM BİR KEZ geçmeli — yoksa «ÖLÇÜLEMEDİ», «geçti» değil
 *    ② mutasyon diskten okunarak UYGULANDIĞI doğrulanır
 *    ③ hüküm ÇIKIŞ KODUNDAN — bekçinin başlığı basılmadıysa «ÇÖKTÜ»
 *
 *  ⚠ ÜÇ YÖN BİRDEN: ZARARSIZ mutasyon YEŞİL vermeli (yoksa hiçbir şeyi
 *  koşmayan bir harness «mükemmel» görünür), KALDIRAN ve FAZLADAN kırmızı.
 *
 *  ⚠ ÇAPALARDA TERS BÖLÜ YOK — BİLEREK: bu depoda betikle yazılan desenlerde
 *  çift ters bölü teke iniyor ve desen hiçbir şeyle eşleşmez; ölçüt her
 *  koşumda yeşil yanar. Çapalar düz dize.
 * ============================================================================
 */

const SAF = "src/lib/urun-karti.ts";
const PANO = "src/app/kart/[variantId]/kart-panosu.tsx";
const SAYFA = "src/app/kart/[variantId]/page.tsx";
const GALERI = "src/app/kart/[variantId]/urun-galerisi.tsx";

const BEKCI = "scripts/kart-analizi-dogrula.ts";

/** Bekçinin GERÇEKTEN koştuğunu gösteren açılış satırı (çökme ≠ yakalama). */
const BASLIK = "KARLILIK KARTI ANALIZI";

const SATIR = String.fromCharCode(10);

type Mutasyon = {
  ad: string;
  yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN";
  dosya: string;
  bul: string;
  koy: string;
  bozdugu: string;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    /**
     * ⚠ BU SENARYO HARNESSİ SINIYOR, KODU DEĞİL. Yalnız gerçek bozmalar
     * denenirse hiçbir şeyi koşmayan bir harness kusursuz görünür.
     */
    ad: "ZARARSIZ — yalnizca yorum degisti",
    yon: "ZARARSIZ",
    dosya: SAF,
    bul: " *  «TÜM ZAMANLAR» ARALIĞI — ürün kartı penceresi (K369, 04.11.2026)",
    koy: " *  TUM ZAMANLAR ARALIGI — urun karti penceresi (K369, 04.11.2026)",
    bozdugu: "hicbir sey — harnessin kendi saglamasi",
  },
  {
    ad: "SAF — baslangic hep «simdi» (urunun gecmisi tamamen kayboldu)",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "  const baslangic = enEski.getTime() <= an.getTime() ? enEski : an;",
    koy: "  const baslangic = an;",
    bozdugu:
      "«Tum zamanlar» bugunden bugune bakar; genisletme dugmesi hicbir sey acmaz",
  },
  {
    ad: "SAF — gelecek tarihli damga kapisi kalkti (ters aralik)",
    yon: "FAZLADAN",
    dosya: SAF,
    bul: "  const baslangic = enEski.getTime() <= an.getTime() ? enEski : an;",
    koy: "  const baslangic = enEski;",
    bozdugu:
      "ileri tarihli urun kaydinda baslangic bitisten SONRA olur; pencere ters kurulur",
  },
  {
    ad: "SAF — ilk satis yok sayildi (yalniz urun kaydina bakiyor)",
    yon: "KALDIRAN",
    dosya: SAF,
    bul: "    ilkSatis !== null && ilkSatis.getTime() < aktifSiden.getTime() ? ilkSatis : aktifSiden;",
    koy: "    aktifSiden;",
    bozdugu:
      "urun kaydindan ONCEYE damgalanmis satislar «tum zamanlar»a girmez — ice aktarmada sik",
  },
  {
    ad: "EKRAN — uyari dolu donemde de ciziliyor (yanlis yanma)",
    yon: "FAZLADAN",
    dosya: PANO,
    bul: "  if (a.adet > 0) return null;",
    koy: "  if (false) return null;",
    bozdugu:
      "satis OLAN donemde de «bu donemde satis yok» yazar; uyariya olan guven biter",
  },
  {
    ad: "EKRAN — genisletme baglantisi bosa cikti",
    yon: "KALDIRAN",
    dosya: PANO,
    bul: '        {t("donemBosGenislet")}',
    koy: '        {""}',
    bozdugu:
      "kullanici sebebi okur ama cikis yolu yoktur — «rakam kaynagina goturur» dusar",
  },
  {
    ad: "EKRAN — hic satilmamis dalina BAGLANTI kondu (sifir satir baglanti olmaz)",
    yon: "FAZLADAN",
    dosya: PANO,
    bul: '        {t("donemHicSatilmamis")}',
    koy: '        <Baglanti href={temel}>{t("donemHicSatilmamis")}</Baglanti>',
    bozdugu:
      "hic satmamis urunde tiklanabilir bir yol acar ve bos ekrana goturur (Ilke #2)",
  },
  {
    ad: "EKRAN — secicideki «Tum zamanlar» dugmesi bosaldi",
    yon: "KALDIRAN",
    dosya: PANO,
    bul: '            {t("donemTumZamanlar")}',
    koy: '            {""}',
    bozdugu:
      "uyariyi gormeyen kullanici tum zamanlara hic ulasamaz; en genis secenek 1 yil kalir",
  },
  {
    ad: "SAYFA — tum zaman sayisi hep null (her urun «hic satilmadi» der)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: "          tumSatis={ozet.hicSatilmamisMi ? null : ozet.satisSayisi}",
    koy: "          tumSatis={null}",
    bozdugu:
      "satmis urun «hic satilmadi» diye etiketlenir — dogru veriyi ORTEN bir yalan",
  },
  {
    ad: "SAYFA — secici ile uyari AYRI an kullaniyor",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '  const pencere = donemCozumu.pencere ?? pencereOlustur("SON_30_GUN", an);',
    koy: '  const pencere = donemCozumu.pencere ?? pencereOlustur("SON_30_GUN", new Date());',
    bozdugu:
      "gun donumunde pencere ile genisletme araligi ayrisir; link bir gun eksik acar",
  },
  /*
   * ═══ K370 — TELEFONDA SAYFAYA SIĞMA (04.11.2026) ═══
   * Kullanıcı: «Telefonda kârlılık kartı uyumsuz bir dizaynda» / «Bu ürünlerde
   * sayfaya sığmıyor.» Ölçüldü (gerçek tarayıcı, 320·360·390·412 px): ızgara
   * kutusu 324 px, PARÇASI 568 px — galeri şeridinin max-content'i taban
   * kırılımdaki örtük `auto` sütuna sızıyordu ve bütün künye ekran dışına
   * taşıyordu. Şeride `min-w-0` yazmak DÖRT genişlikte de ÇÖZMEDİ (ölçüldü).
   */
  {
    ad: "IZGARA — ust kart taban sutunu kalkti (telefonda kunye ekran disina tasar)",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '"grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]',
    koy: '"grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]',
    bozdugu:
      "ortuk sutun yine `auto` olur; galeri seridinin 568 px max-content'i parcaya sizar",
  },
  {
    /* ÖLÇÜT DOSYA LİSTESİ DEĞİL: aynı sayfadaki İKİNCİ ızgara da kapsamda. */
    ad: "IZGARA — ayrinti izgarasinin taban sutunu kalkti",
    yon: "KALDIRAN",
    dosya: SAYFA,
    bul: '"grid grid-cols-1 gap-6 lg:grid-cols-2"',
    koy: '"grid gap-6 lg:grid-cols-2"',
    bozdugu:
      "desen yasagi yalniz ust karta bakiyor olsaydi bu sessizce gecerdi",
  },
  {
    /* YARIN EKLENEN IZGARA DA YAKALANIR — ölçütün asıl vaadi bu. */
    ad: "IZGARA — sayfaya YENI bir taban sutunsuz izgara eklendi (yanlis susma)",
    yon: "FAZLADAN",
    dosya: SAYFA,
    bul: '{t("ayrintiBaslik")}</h2>',
    koy: '{t("ayrintiBaslik")}</h2><div className="grid gap-2 sm:grid-cols-3" />',
    bozdugu:
      "elle tutulan bir liste bu yeni izgarayi hic gormezdi; desen yasagi gormeli",
  },
  {
    ad: "GALERI — seridin kendi kaydirmasi kalkti (kucuk resimler ulasilamaz olur)",
    yon: "KALDIRAN",
    dosya: GALERI,
    bul: "flex max-h-52 gap-2 overflow-auto",
    koy: "flex max-h-52 gap-2",
    bozdugu:
      "parca sinirlandigi icin serit kirpilir; kaydirma da yoksa resimler kaybolur",
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BASLIK) };
}

console.log("");
console.log("BOŞ DÖNEM UYARISI — K369 MUTASYON TURU");
console.log("");

let beklendigiGibi = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);

  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(
      m.ad +
        SATIR +
        "       desen " +
        m.dosya +
        " içinde " +
        adet +
        " kez geçiyor (1 olmalı)",
    );
    continue;
  }

  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    const diskten = readFileSync(m.dosya, "utf8");
    if (diskten !== mutant || mutant === asil) {
      bozuk.push(m.ad + SATIR + "       mutasyon diske UYGULANMADI");
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    /* ⚠ GERİ ALMA DA BİR YAZIMDIR — ve tuttuğu ölçülür. */
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) {
      bozuk.push(m.ad + SATIR + "       GERİ ALMA TUTMADI — dosya mutant kaldı");
    }
  }

  const isaret = m.yon === "ZARARSIZ" ? "=" : m.yon === "KALDIRAN" ? "−" : "+";

  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0) {
      beklendigiGibi++;
      console.log("  ✓  " + isaret + " " + m.ad + "  (yeşil — doğru)");
    } else {
      bozuk.push(
        m.ad +
          SATIR +
          "       ZARARSIZ mutasyon KIRMIZI yandı — harness ya da bekçi kusurlu",
      );
    }
    continue;
  }

  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    beklendigiGibi++;
    console.log("  ✓  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(
      m.ad + SATIR + "       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz",
    );
  } else {
    kacan.push(m.ad + SATIR + "       KORUMASIZ: " + m.bozdugu);
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:");
  console.log("");
  for (const k of kacan) console.log("  ✗  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:");
  console.log("");
  for (const b of bozuk) console.log("  ⛔ " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const zararsiz = MUTASYONLAR.filter((m) => m.yon === "ZARARSIZ").length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " +
    beklendigiGibi +
    "/" +
    toplam +
    " senaryo beklendiği gibi" +
    "   (= zararsız " +
    zararsiz +
    " · − kaldıran " +
    kaldiran +
    " · + fazladan " +
    (toplam - zararsiz - kaldiran) +
    ")",
);
if (kacan.length || bozuk.length) {
  console.log("");
  console.log("  ⛔ Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.");
  console.log("");
  process.exitCode = 1;
} else {
  console.log("  ✓  K369 kapısı ÜÇ KATMANDA da sınandı ve kırmızı yandığı GÖRÜLDÜ");
  console.log("");
}
