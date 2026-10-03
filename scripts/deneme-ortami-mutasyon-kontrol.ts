import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  DENEME ORTAMI — MUTASYON HARNESS'İ (K303, 03.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run deneme-ortami-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/deneme-ortami-dogrula.ts";
const BEKCI_BASLIGI = "DENEME ORTAMI BEKÇİSİ";
const GOVDE = "src/lib/deneme-ortami.ts";
const PROXY = "src/proxy.ts";
const TY = "scripts/ty/istemci.ts";
const N11 = "scripts/n11/istemci.ts";
const HB = "scripts/hb/istemci.ts";
const YERLESIM = "src/app/layout.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const KAPI = "  if (denemeOrtamiMi()) return null;\n";

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "SAF — deneme ortamı mı.", koy: "SAF — deneme mi.",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "ANAHTAR HEP KAPALI", yon: "KALDIRAN", dosya: GOVDE,
    bul: 'return env.DENEME_ORTAMI?.trim() === "1";', koy: "return false;",
    bozdugu: "denemede kimlik verilir, cron koşar" },
  { ad: "ANAHTAR GEVSEK (dolu her deger)", yon: "FAZLADAN", dosya: GOVDE,
    bul: 'return env.DENEME_ORTAMI?.trim() === "1";', koy: 'return (env.DENEME_ORTAMI?.trim() ?? "") !== "";',
    bozdugu: "\"0\" ya da yazim hatasi deneme sayilir" },
  { ad: "CRON ONEGI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: '  "/api/cron/",\n', koy: "",
    bozdugu: "denemede siparis/hakedis cekimi kosar" },
  { ad: "KESME HER YERDE (deneme kontrolu yok)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (!denemeOrtamiMi(env)) return false;\n", koy: "",
    bozdugu: "CANLIDA cron uclari 404 olur" },
  { ad: "TY KIMLIK KAPISI YOK", yon: "KALDIRAN", dosya: TY, bul: KAPI, koy: "",
    bozdugu: "denemede .env.canli bulunursa TY'ye gercek istek gider" },
  { ad: "N11 KIMLIK KAPISI YOK", yon: "KALDIRAN", dosya: N11, bul: KAPI, koy: "",
    bozdugu: "denemede N11'e gercek istek gider" },
  { ad: "HB KIMLIK KAPISI YOK", yon: "KALDIRAN", dosya: HB, bul: KAPI, koy: "",
    bozdugu: "denemede HB'ye gercek istek gider" },
  { ad: "PROXY KESME YOK", yon: "KALDIRAN", dosya: PROXY,
    bul: "  if (denemedeKapaliMi(yol)) return new NextResponse(null, { status: 404 });\n", koy: "",
    bozdugu: "denemede cron uclari acik" },
  { ad: "PROXY KESME ACIK YOLDAN SONRA", yon: "KALDIRAN", dosya: PROXY,
    /* YER DEĞİŞTİRME — ilk sürüm kopya EKLİYORDU, asıl satır yerinde kaldığı için
       bekçi haklı olarak yeşil kaldı (harness kusuru, bekçi değil). */
    bul: "  if (denemedeKapaliMi(yol)) return new NextResponse(null, { status: 404 });\n\n  if (acikMi(yol)) return NextResponse.next();",
    koy: "  if (acikMi(yol)) return NextResponse.next();\n\n  if (denemedeKapaliMi(yol)) return new NextResponse(null, { status: 404 });",
    bozdugu: "kesme hic devreye girmez (cron uclari acik listede)" },
  { ad: "SERIT CIZILMIYOR (oturumlu dal)", yon: "KALDIRAN", dosya: YERLESIM,
    bul: "      <body>\n        {denemeSeridi}\n", koy: "      <body>\n",
    bozdugu: "hangi kurulumda olundugu gorunmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nDENEME ORTAMI — MUTASYON TURU\n");
let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) { bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı) — ${m.dosya}`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
  }
  const isaret = m.yon === "KALDIRAN" ? "-" : m.yon === "FAZLADAN" ? "+" : "o";
  if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekçi ÇÖKTÜ (başlık basılmadı) — ölçüm geçersiz`);
  else if ((m.yon === "ZARARSIZ") === (sonuc.kod === 0)) { dogru++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else yanlis.push(m.yon === "ZARARSIZ" ? `${m.ad}\n       zararsız mutasyon KIRMIZI yandı` : `${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of yanlis) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${dogru}/${MUTASYONLAR.length} mutasyon beklendiği gibi davrandı`);
if (yanlis.length || bozuk.length) { console.log("\n  Beklenmeyen ya da ölçülemeyen mutasyon var — bekçi eksik.\n"); process.exitCode = 1; }
else console.log("  OK  Deneme ortamı kapıları İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
