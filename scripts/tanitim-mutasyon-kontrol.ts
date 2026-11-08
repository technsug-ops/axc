import { readFileSync, existsSync, unlinkSync, renameSync, copyFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TANITIM VİTRİNİ — MUTASYON HARNESS'İ (K372, 07.11.2026)
 *      npm run tanitim-mutasyon:kontrol
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE ZORUNLU: `tanitim-dogrula` geri alınamaz bir şeyi koruyor —
 *  gerçek iş verisinin herkese açık bir siteye çıkmasını. Böyle bir bekçinin
 *  KÖR olması, bekçi olmamasından kötüdür: koruma varmış gibi görünür.
 *
 *  ⚠ İKİ YÖN AYRI SINANIR (anayasa):
 *    − KALDIRAN : korumanın aradığı şey ortadan kalkar (beyan silinir,
 *                 görsel değişir, ayna boşalır)
 *    + FAZLADAN : olmaması gereken bir şey belirir (eşi olmayan görsel) ya
 *                 da doğru şey YANLIŞ YERE taşınır (beyan gövdeden yoruma)
 *
 *  Üç kapı:
 *    1) mutasyon UYGULANDIĞI diskten okunarak doğrulanır
 *    2) hüküm ÇIKIŞ KODUNDAN — bekçi başlığı basılmadıysa "ÇÖKTÜ"
 *    3) ZARARSIZ mutasyon ÖNCE koşar ve YEŞİL kalmalı; yoksa her şeyi
 *       kırmızı yakan bir harness "mükemmel" görünür
 *
 *  ── ŞEKİL: `dosya` + `bul` BEYAN EDİLİR ─────────────────────────────────
 *  `mutasyon-capa:dogrula` her çapayı hedef dosyasında ARAR. Bu yüzden
 *  mutasyonlar kapalı bir nesne olarak yazılır, kapanış (closure) içine
 *  gizlenmez — yoksa denetim "ÇÖZÜLEMEDİ" der ve çapam HİÇ sınanmamış
 *  kalır (ve bu "temiz" SAYILMAZ).
 *
 *  ⚠ ÜÇ MUTASYONUN METİN ÇAPASI YOK ve bu MEŞRU: bir görselin baytlarını,
 *  yeni bir dosyanın varlığını ve bir klasörün yokluğunu bozarlar. Bunlar
 *  `bul: null` ile AÇIKÇA beyan edilir — "çapa bulunamadı" ile "zaten
 *  çapasızmış" ayırt edilebilsin diye.
 *
 *  ⚠ İKİLİ DOSYA `copyFileSync` ile yazılır: `dayanikliYaz` metin kapısıdır
 *  ve bir JPEG'i utf8'den geçirmek bozar. Kapının var olma sebebi olan
 *  Windows dosya kilidi burada yok — `tanitim/gorsel/` altındaki görselleri
 *  açık tutan bir süreç yok (dev sunucusu da, izleyici de okumaz) ve geri
 *  alma zaten kaynağın kendisinden kopyalanıyor.
 * ============================================================================
 */

const BEKCI = "scripts/tanitim-dogrula.ts";
const BEKCI_BASLIGI = "TANITIM VİTRİNİ BEKÇİSİ";

const SAYFA = "tanitim/index.html";
const GORSEL_KLASOR = "tanitim/gorsel";
const GIZLI_KLASOR = "tanitim/gorsel-mutasyon-gizli";
const AYNA_KAYNAK = "public/kitap-ekran/satislar.jpg";

type Mutasyon = {
  ad: string;
  yon: "KALDIRAN" | "FAZLADAN";
  dosya: string;
  /** Metin çapası; ikili/varlık mutasyonlarında BEYANEN `null`. */
  bul: string | null;
  koy: string | null;
  bozdugu: string;
  /** `bul` null olduğunda kullanılır. */
  ozelUygula?: () => void;
  ozelGeriAl?: () => void;
  uygulandiMi: () => boolean;
};

const MUTASYONLAR: Mutasyon[] = [
  {
    ad: "VİTRİNE EŞİNDEN FARKLI BİR GÖRÜNTÜ KONDU",
    yon: "KALDIRAN",
    dosya: "tanitim/gorsel/satislar.jpg",
    bul: null,
    koy: null,
    bozdugu:
      "ornek veri hattindan gelmeyen bir goruntu vitrine girer; gercek musteri/SKU/kar internete cikar",
    ozelUygula: () => copyFileSync("tanitim/gorsel/stok.jpg", "tanitim/gorsel/satislar.jpg"),
    ozelGeriAl: () => copyFileSync(AYNA_KAYNAK, "tanitim/gorsel/satislar.jpg"),
    uygulandiMi: () =>
      !readFileSync("tanitim/gorsel/satislar.jpg").equals(readFileSync(AYNA_KAYNAK)),
  },
  {
    ad: "AYNADA EŞİ OLMAYAN GÖRSEL BELİRDİ",
    yon: "FAZLADAN",
    dosya: "tanitim/gorsel/ekip-fotografi.jpg",
    bul: null,
    koy: null,
    bozdugu:
      "elle konmus bir gorsel aynaya karisir; provenansi kanitlanamayan dosya sessizce yayimlanir",
    ozelUygula: () =>
      copyFileSync("tanitim/gorsel/satislar.jpg", "tanitim/gorsel/ekip-fotografi.jpg"),
    ozelGeriAl: () => {
      if (existsSync("tanitim/gorsel/ekip-fotografi.jpg"))
        unlinkSync("tanitim/gorsel/ekip-fotografi.jpg");
    },
    uygulandiMi: () => existsSync("tanitim/gorsel/ekip-fotografi.jpg"),
  },
  {
    ad: "AYNA KLASÖRÜ BOŞALDI (tarama hiç dönmüyor)",
    yon: "KALDIRAN",
    dosya: "tanitim/gorsel",
    bul: null,
    koy: null,
    bozdugu:
      "bos kume her kosulu saglar; bekci hicbir sey olcmeden TUM KONTROLLER GECTI der",
    ozelUygula: () => renameSync(GORSEL_KLASOR, GIZLI_KLASOR),
    ozelGeriAl: () => {
      if (existsSync(GIZLI_KLASOR) && !existsSync(GORSEL_KLASOR))
        renameSync(GIZLI_KLASOR, GORSEL_KLASOR);
    },
    uygulandiMi: () => !existsSync(GORSEL_KLASOR),
  },
  {
    ad: "SAYFA OLMAYAN BİR DOSYAYI GÖSTERİYOR",
    yon: "KALDIRAN",
    dosya: "tanitim/index.html",
    bul: 'src="gorsel/stok.jpg"',
    koy: 'src="gorsel/stok-yok.jpg"',
    bozdugu: "olu gorsel/stil baglantisi fark edilmeden yayimlanir, sayfa kirik cikar",
    uygulandiMi: () => readFileSync(SAYFA, "utf8").includes("gorsel/stok-yok.jpg"),
  },
  {
    ad: "KAHRAMANDAKİ «ÖRNEK VERİ» BEYANI SİLİNDİ",
    yon: "KALDIRAN",
    dosya: "tanitim/index.html",
    bul: "Bu sayfadaki bütün ekran görüntüleri örnek veriden alınmıştır —",
    koy: "Sistemden alınmış ekran görüntüleri —",
    bozdugu:
      "okuyan, ornek rakamlari gercek defter sanir; sayfa tutamayacagi bir soz vermis olur",
    uygulandiMi: () => !readFileSync(SAYFA, "utf8").includes("örnek veriden alınmıştır"),
  },
  {
    ad: "GALERİDEKİ «GERÇEK DEFTERİ GÖSTERMEZ» CÜMLESİ SİLİNDİ",
    yon: "KALDIRAN",
    dosya: "tanitim/index.html",
    bul: "ve gerçek defteri göstermez",
    koy: "ve sistemi gösterir",
    bozdugu: "galeri bolumunde uyari kalmaz; en cok bakilan yerde rakamlar gercek sanilir",
    uygulandiMi: () => !readFileSync(SAYFA, "utf8").includes("gerçek defteri göstermez"),
  },
  {
    /**
     * ⭐ KÖRLÜK SINAMASI: beyan GÖVDEDEN alınıp YORUMA konur. Desen dosyada
     * hâlâ geçiyor — `yorumsuz` süzgeci olmayan bir ölçüt YEŞİL kalırdı.
     * (Anayasa: "kaynak tarayan kontrol, deseni dosyada değil kullanım
     * bloğunda arar".)
     */
    ad: "BEYAN GÖVDEDEN YORUMA TAŞINDI (çizilmiyor ama dosyada duruyor)",
    yon: "FAZLADAN",
    dosya: "tanitim/index.html",
    bul: '<p class="kahraman-not">',
    koy: '<!-- örnek veriden alınmıştır --><p class="kahraman-not" hidden>XX',
    bozdugu:
      "beyan kaynakta gorunur ama EKRANDA cizilmez; olcut deseni bulur ve yanlis yere yesil yanar",
    uygulandiMi: () => readFileSync(SAYFA, "utf8").includes('kahraman-not" hidden'),
  },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, {
    shell: true,
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("");
console.log("TANITIM VİTRİNİ — K372 MUTASYON TURU");
console.log("");

let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];

/* ── ZARARSIZ SAĞLAMA ÖNCE ───────────────────────────────────────────── */
{
  const asil = readFileSync(SAYFA, "utf8");
  let s: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(SAYFA, asil.replace("<body>", "<body>" + desenNormalle(asil, "\n    <!-- zararsiz -->")));
    s = bekciyiKostur();
  } finally {
    dayanikliYaz(SAYFA, asil);
  }
  if (s.kod === 0 && s.ciktiVar) {
    console.log("  OK  = ZARARSIZ mutasyon (yorum) YEŞİL kaldı — harness ölçüyor");
  } else {
    bozuk.push("ZARARSIZ SAĞLAMA DÜŞTÜ — harness her şeyi kırmızı yakıyor, sonuçlar GEÇERSİZ");
  }
}

/* ── GERÇEK MUTASYONLAR ──────────────────────────────────────────────── */
for (const m of MUTASYONLAR) {
  const metinMi = m.bul !== null;
  const asil = metinMi ? readFileSync(m.dosya, "utf8") : "";
  let sonuc: { kod: number; ciktiVar: boolean } | null = null;

  try {
    if (metinMi) {
      const bul = desenNormalle(asil, m.bul as string);
      const adet = asil.split(bul).length - 1;
      if (adet !== 1) {
        bozuk.push(m.ad + "\n       çapa " + adet + " kez geçiyor (1 olmalı)");
        continue;
      }
      dayanikliYaz(m.dosya, asil.replace(bul, desenNormalle(asil, m.koy as string)));
    } else {
      m.ozelUygula?.();
    }

    if (!m.uygulandiMi()) {
      bozuk.push(m.ad + "\n       mutasyon diske UYGULANMADI — ölçüm geçersiz");
    } else {
      sonuc = bekciyiKostur();
    }
  } catch (e) {
    bozuk.push(m.ad + "\n       mutasyon kurulamadı: " + (e as Error).message);
  } finally {
    if (metinMi) dayanikliYaz(m.dosya, asil);
    else m.ozelGeriAl?.();
  }

  if (!sonuc) continue;

  const isaret = m.yon === "KALDIRAN" ? "-" : "+";
  if (sonuc.kod !== 0 && sonuc.ciktiVar) {
    yakalanan++;
    console.log("  OK  " + isaret + " " + m.ad);
  } else if (sonuc.kod !== 0) {
    bozuk.push(m.ad + "\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz");
  } else {
    kacan.push(m.ad + "\n       KORUMASIZ: " + m.bozdugu);
  }
}

/* ── GERİ ALMA DOĞRULANIR ────────────────────────────────────────────── */
{
  if (!existsSync(GORSEL_KLASOR)) {
    if (existsSync(GIZLI_KLASOR)) renameSync(GIZLI_KLASOR, GORSEL_KLASOR);
    else mkdirSync(GORSEL_KLASOR, { recursive: true });
  }
  if (existsSync("tanitim/gorsel/ekip-fotografi.jpg"))
    unlinkSync("tanitim/gorsel/ekip-fotografi.jpg");
  const son = bekciyiKostur();
  if (son.kod !== 0) {
    bozuk.push(
      "GERİ ALMA EKSİK — tur sonunda bekçi hâlâ KIRMIZI; çalışma ağacı mutasyonlu kalmış olabilir",
    );
  } else {
    console.log("  OK  = tur sonrası bekçi yeniden YEŞİL — geri alma tam");
  }
}

console.log("");
if (kacan.length) {
  console.log("  KAÇAN MUTASYONLAR — bekçi bunları GÖRMEDİ:\n");
  for (const k of kacan) console.log("  X  " + k);
  console.log("");
}
if (bozuk.length) {
  console.log("  HARNESS HATASI — mutasyon ölçülemedi:\n");
  for (const b of bozuk) console.log("  !! " + b);
  console.log("");
}

const toplam = MUTASYONLAR.length;
const kaldiran = MUTASYONLAR.filter((m) => m.yon === "KALDIRAN").length;
console.log(
  "  " + yakalanan + "/" + toplam + " mutasyon yakalandı" +
    "   (- kaldıran " + kaldiran + " · + fazladan " + (toplam - kaldiran) + ")",
);
if (kacan.length || bozuk.length) {
  console.log("\n  Kaçan ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  K372 tanıtım vitrini İKİ YÖNDEN de sınandı ve kırmızı yandığı GÖRÜLDÜ\n");
}
