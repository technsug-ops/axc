import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";
import { UYGULAMA } from "../src/lib/uygulama";

/**
 * ============================================================================
 *  UYGULAMA ADI KODA GÖMÜLMEZ — MUTASYON HARNESS'İ (04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run uygulama-adi-mutasyon:kontrol
 *
 *  `uygulama-adi:dogrula`nın dişini sınar. ZARARSIZ mutasyonlar (adı anlatan
 *  YORUM) yeşil kalmalı — yorum bir yasağı çiğnemez; öteki her mutasyon
 *  KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular, bekçinin
 *  başlığını görmeden «kırmızı» saymaz.
 *
 *  ⚠ Adlar bu dosyaya da ELLE yazılmaz — `UYGULAMA`dan okunur. Ad bir daha
 *  değişirse harness kendiliğinden yeni adla sınar; çapalar ad içermez.
 * ============================================================================
 */

const BEKCI = "scripts/uygulama-adi-dogrula.ts";
const BEKCI_BASLIGI = "UYGULAMA ADI KODA GÖMÜLMEZ";

const AD = UYGULAMA.ad;
const ESKI = UYGULAMA.eskiTeknikAdlar[0];

/**
 * `yalnizVarsa`: hedef dosya yalnız çok-firma dalında var (harness iki dalda
 * AYNI). Dosya yoksa mutasyon «geçti» SAYILMAZ, açıkça «bu dalda yok» diye
 * atlanır ve sayıya girmez; dosya varsa her zamanki gibi ölçülür.
 */
type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string; yalnizVarsa?: boolean };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - eski adi anlatan satir yorumu (tsx)", yon: "ZARARSIZ", dosya: "src/app/giris/page.tsx",
    bul: `<MarkaYazisi etiket={UYGULAMA.ad} className="text-foreground h-8 w-auto" />`,
    koy: `<MarkaYazisi etiket={UYGULAMA.ad} className="text-foreground h-8 w-auto" /> {/* eskiden ${ESKI} */}`,
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "ZARARSIZ - gecmisi anlatan // yorum (ts)", yon: "ZARARSIZ", dosya: "src/lib/oturum-imza.ts",
    bul: "export const OTURUM_CEREZI = `${UYGULAMA.teknikAd}_oturum`;",
    koy: "// 04.10.2026 oncesi cerez adi " + ESKI + "_oturum idi\nexport const OTURUM_CEREZI = `${UYGULAMA.teknikAd}_oturum`;",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "ZARARSIZ - tanim dosyasinda yorum", yon: "ZARARSIZ", dosya: "src/lib/uygulama.ts",
    bul: "/** Okumada tanınan bütün teknik adlar — güncel ad başta. */",
    koy: `/** Okumada tanınan bütün teknik adlar (${AD}, ${ESKI}) — güncel ad başta. */`,
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "MENU ETIKETI ELLE YAZILDI (guncel ad)", yon: "KALDIRAN", dosya: "src/components/app-sidebar.tsx",
    bul: `<MarkaYazisi etiket={UYGULAMA.ad} className="h-5 w-auto self-start text-white" />`,
    koy: `<MarkaYazisi etiket="${AD}" className="h-5 w-auto self-start text-white" />`,
    bozdugu: "ad degisikligi menude tek satirla yapilamaz" },
  { ad: "SEKME BASLIGI ELLE YAZILDI (BUYUK HARF)", yon: "KALDIRAN", dosya: "src/app/layout.tsx",
    bul: "template: `%s — ${UYGULAMA.ad}`,",
    koy: "template: `%s — " + AD.toUpperCase() + "`,",
    bozdugu: "harf buyuklugu degistirilerek yasak atlanir" },
  { ad: "CEREZ ADI ESKI TEKNIK ADLA ELLE YAZILDI", yon: "KALDIRAN", dosya: "src/lib/oturum-imza.ts",
    bul: "export const OTURUM_CEREZI = `${UYGULAMA.teknikAd}_oturum`;",
    koy: `export const OTURUM_CEREZI = "${ESKI}_oturum";`,
    bozdugu: "eski ad kodda yasamaya devam eder" },
  { ad: "SOZLUKTE YER TUTUCU YERINE AD", yon: "KALDIRAN", dosya: "messages/tr.json",
    bul: `"onizleme": "{kanal}: {uygulama} stoğu {stok}`,
    koy: `"onizleme": "{kanal}: ${AD} stoğu {stok}`,
    bozdugu: "sozluk metni ad degisikliginde eski adla kalir" },
  { ad: "SERVICE WORKER ONBELLEK ADI ESKI ADLA", yon: "KALDIRAN", dosya: "public/sw.js",
    // Çapa SABİT metin: `mutasyon-capa` şablon dizesini çözemez (ilk tur).
    bul: `const SURUM = "`,
    koy: `const SURUM = "${ESKI}`,
    bozdugu: "onbellek adi guncel teknik adla baslamaz (SURUM satiri yasaktan muaf, ayri olculmeli)" },
  { ad: "TEKNIK AD DEGISTI, SW GUNCELLENMEDI", yon: "FAZLADAN", dosya: "src/lib/uygulama.ts",
    bul: `teknikAd: "`,
    koy: `teknikAd: "x`,
    bozdugu: "yeni ad tanimlanir ama service worker eski onbellek adinda kalir" },
  { ad: "TABAN - src taramasi bos", yon: "KALDIRAN", dosya: BEKCI,
    bul: `const kodDosyalari = tara("src",`,
    koy: `const kodDosyalari = tara("src-yok",`,
    bozdugu: "tarama sifir dosya bulur, dongu donmez ve 'gecti' denir" },
  { ad: "ISTISNA GEREKCESIZ", yon: "KALDIRAN", dosya: BEKCI,
    // İlk denemede yalnız ilk satır boşaltılmıştı; kalan satırlar 40'ı geçtiği
    // için mutasyon kaçtı (bekçi değil ÖRNEK kör). Şimdi bütün gerekçe «yok».
    bul: `    gerekce:\n      "veritabanı oturum değişkeni`,
    koy: `    gerekce: "yok" ??\n      "veritabanı oturum değişkeni`,
    bozdugu: "gerekcesiz istisna yazilabilir (gerekce sozde kalir)" },
  { ad: "ESKI ADLA ADRES KLASORU VAR", yon: "FAZLADAN", dosya: BEKCI,
    // `src/app/api` gerçekten var: eski ad listesine o girmiş gibi davranılır.
    bul: "const eskiKlasorler = UYGULAMA.eskiTeknikAdlar.filter(",
    koy: `const eskiKlasorler = [...UYGULAMA.eskiTeknikAdlar, "api"].filter(`,
    bozdugu: "ad degisir, adres klasoru eski adla kalir; adres sessizce eski ad" },
  { ad: "ISTISNA BAYATLADI (yalniz cok-firma dalinda)", yon: "KALDIRAN", dosya: "src/lib/firma-baglari.uretilmis.ts",
    yalnizVarsa: true,
    bul: "export const BAG_KAPISI_DEGISKENI = ",
    koy: "export const BAG_KAPISI_DEGISKENI_2 = ",
    bozdugu: "istisna satiri degisir, istisna bos yere yasar ve eski ad gorunmeden kalir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nUYGULAMA ADI — MUTASYON TURU\n");

let dogru = 0;
let atlanan = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
  if (m.yalnizVarsa && !existsSync(m.dosya)) {
    atlanan++;
    console.log(`  --    ${m.ad} — ${m.dosya} bu dalda yok, atlandı`);
    continue;
  }
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) {
    bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`);
    continue;
  }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) {
      bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`);
      continue;
    }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) {
    bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  } else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) {
    dogru++;
    console.log(`  OK  ${isaret} ${m.ad}`);
  } else {
    yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı — bekçi yalancı kırmızı üretiyor` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
  }
}

console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(
  `\n  ${dogru}/${MUTASYONLAR.length - atlanan} mutasyon beklendiği gibi davrandı` +
    (atlanan ? ` (${atlanan} bu dalda yok, atlandı)` : ""),
);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  Uygulama adı yasağı İKİ YÖNDEN sınandı, zararsız yorumlar yeşil kaldı\n");
}
