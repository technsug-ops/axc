import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ERİŞİM (VERİ KAZINMASINA KARŞI) — MUTASYON HARNESS'İ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run erisim-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun UYGULANDIĞINI doğrular, bekçinin başlığını görmeden «kırmızı»
 *  saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/erisim-dogrula.ts";
const BEKCI_BASLIGI = "ERİŞİM BEKÇİSİ";
const KURAL = "src/lib/giris-kilidi.ts";
const GIRIS = "src/app/giris/actions.ts";
const OKUMA = "src/lib/giris-kilidi-okuma.ts"; // K303 04.10: kilidin okuması buraya taşındı
const DISA = "src/app/api/disa-aktarma/[liste]/route.ts";
const OLCUM = "src/app/api/olcum/route.ts";
const ROBOTS = "src/app/robots.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Kilit, sınırı dolduran en eski denemenin üstünden 15 dk dolunca açılır. */", koy: "/** Açılış anı. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "SINIR 5 -> 50 (kilit fiilen yok)", yon: "KALDIRAN", dosya: KURAL,
    bul: "export const GIRIS_DENEME_SINIRI = 5;", koy: "export const GIRIS_DENEME_SINIRI = 50;",
    bozdugu: "bot 49 deneme yapar, kilit hic devreye girmez" },
  { ad: "PENCERE YOK SAYILIYOR (eski denemeler de sayiliyor)", yon: "FAZLADAN", dosya: KURAL,
    bul: ".filter((d) => simdi.getTime() - d.getTime() < pencere && d.getTime() <= simdi.getTime())", koy: ".filter((d) => d.getTime() <= simdi.getTime())",
    bozdugu: "gecen haftaki 5 hatali deneme kullaniciyi bugun kilitler" },
  { ad: "KILIT KONTROLU KAPATILDI", yon: "KALDIRAN", dosya: GIRIS,
    bul: "  if (kilit.kilitli) {", koy: "  if (false && kilit.kilitli) {",
    bozdugu: "sayac doluyor ama giris kapanmiyor" },
  { ad: "IP SAYACI KALKTI (yalniz e-posta)", yon: "KALDIRAN", dosya: OKUMA,
    bul: '        { detail: { contains: `"ip":${JSON.stringify(ip)}` } },' + "\n", koy: "",
    bozdugu: "bot her denemede baska e-posta yazar, kilit hic dolmaz" },
  { ad: "BASARISIZ DENEMEDE IP YAZILMIYOR", yon: "KALDIRAN", dosya: GIRIS,
    bul: "detail: JSON.stringify({ eposta, ip }),", koy: "detail: JSON.stringify({ eposta }),",
    bozdugu: "IP sayaci hep sifir okur" },
  { ad: "TUMU INDIRMESI IZ BIRAKMIYOR", yon: "KALDIRAN", dosya: DISA,
    bul: '    await izYaz({ action: "TOPLU_INDIRME", targetType: "DisaAktarma", targetId: "tumu",', koy: '    void ({ action: "TOPLU_INDIRME", targetType: "DisaAktarma", targetId: "tumu",',
    bozdugu: "butun veri tek dosyada iner, hicbir yerde gorunmez" },
  { ad: "OLCUM UCU 401 DIYOR (varlik sizar)", yon: "FAZLADAN", dosya: OLCUM,
    bul: "    return new Response(null, { status: 404 });", koy: '    return Response.json({ durum: "YETKISIZ" }, { status: 401 });',
    bozdugu: "anahtarsiz istek ucun var oldugunu ogrenir" },
  { ad: "ROBOTS YALNIZ BIR KLASORU KAPATIYOR", yon: "KALDIRAN", dosya: ROBOTS,
    bul: 'return { rules: { userAgent: "*", disallow: "/" } };', koy: 'return { rules: { userAgent: "*", disallow: "/ozel" } };',
    bozdugu: "giris sayfasi arama motorlarinda gorunur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nERİŞİM — MUTASYON TURU\n");

let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];

for (const m of MUTASYONLAR) {
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
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) {
  console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n");
  process.exitCode = 1;
} else {
  console.log("  OK  Erişim korumaları İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
