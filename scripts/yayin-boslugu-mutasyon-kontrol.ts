import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  YAYIN BOŞLUĞU — MUTASYON HARNESS'I (K329, 10.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yayin-boslugu-mutasyon:kontrol
 *  `yayin-boslugu:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/yayin-boslugu-dogrula.ts";
const BEKCI_BASLIGI = "YAYIN BOŞLUĞU (K329, 10.10.2026)";
const GOVDE = "src/lib/yayin-boslugu.ts";
const TOPLA = "src/lib/uyari/topla.ts";
const SAYFA = "src/app/ayarlar/gece-turu/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Saf: iki ölçüm + an → durum. */", koy: "/** Saf: iki ölçüm + an → durum (K329). */", bozdugu: "hicbir sey" },
  { ad: "ZARARSIZ - sayfa yorumu", yon: "ZARARSIZ", dosya: SAYFA,
    bul: " *  GECE BEKÇİ TURU EKRANI (K290)", koy: " *  GECE BEKÇİ TURU EKRANI (K290 · K329)", bozdugu: "hicbir sey" },
  { ad: "GERIDE HIC DENMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (dakika <= YAYIN_PAYI_DAKIKA) return", koy: "  if (true) return", bozdugu: "09.10 gibi 28 saatlik bosluk sessiz kalir" },
  { ad: "CAN GERIDEYI SAYMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  return d.durum === \"GERIDE\" ? 1 : 0;", koy: "  return 0;", bozdugu: "ekran bilir, can susar" },
  { ad: "TOPLAYICI OLCUMU VERMIYOR", yon: "KALDIRAN", dosya: TOPLA,
    bul: "    yayinBoslugu: { sayi: await yayinBosluguSayisiOlc() },\n", koy: "", bozdugu: "uyari hic dogmaz" },
  { ad: "PAY YOK (her push'ta yalanci kirmizi)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (dakika <= YAYIN_PAYI_DAKIKA) return", koy: "  if (false) return", bozdugu: "her push'tan sonra dakikalarca yalanci 'geride'" },
  { ad: "OLCULEMEDI GUNCEL SAYILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (!ana) return { durum: \"OLCULEMEDI\", neden: \"GITHUB_OKUNAMADI\", canliSha };", koy: "  if (!ana) return { durum: \"GUNCEL\", canliSha, anaSha: canliSha };", bozdugu: "olcemeyen kontrol 'guncel' der - yalanci yesil" },
  { ad: "CAN OLCULEMEYENI DE SAYIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  return d.durum === \"GERIDE\" ? 1 : 0;", koy: "  return d.durum === \"GERIDE\" || d.durum === \"OLCULEMEDI\" ? 1 : 0;", bozdugu: "yerelde ve GitHub sinirinda kalici yalanci uyari" },
  { ad: "YALNIZ PUSH OKUNUYOR (force/merge eski ucu birakir)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "const UCU_DEGISTIREN = [\"push\", \"force_push\", \"pr_merge\", \"merge_queue_merge\"];", koy: "const UCU_DEGISTIREN = [\"push\"];", bozdugu: "merge sonrasi kalici yalanci 'geride'" },
  { ad: "BOZUK SHA KABUL EDILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: " || !/^[0-9a-f]{40}$/.test(push.after)", koy: "", bozdugu: "bozuk cevap gercek uc sanilir" },
  { ad: "ZAMAN ASIMI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: "      signal: AbortSignal.timeout(4000),\n", koy: "", bozdugu: "GitHub yavaslarsa panel bekler" },
  { ad: "DEPO ADI GOMULU", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const sahip = process.env.VERCEL_GIT_REPO_OWNER?.trim();", koy: "  const sahip = \"technsug-ops\";", bozdugu: "baska firmanin kurulumu bizim depomuza bakar" },
  { ad: "EKRAN NEDENI YAZMIYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "t(`yayinOLCULEMEDI_${yayin.neden}`)", koy: "t(\"yayinGUNCEL\")", bozdugu: "olculemeyen durum ekranda 'guncel' gorunur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nYAYIN BOSLUGU - MUTASYON TURU (K329, 10.10.2026)\n");
let yakalanan = 0;
const kacan: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(m.dosya, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const n = asil.split(bul).length - 1;
  if (n !== 1) { bozuk.push(`${m.ad}\n       desen ${m.dosya} icinde ${n} kez geciyor (1 olmali) - OLCULEMEDI`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(m.dosya, mutant);
    if (readFileSync(m.dosya, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(m.dosya, asil);
    if (readFileSync(m.dosya, "utf8") !== asil) bozuk.push(`${m.ad}\n       GERI ALMA BASARISIZ - dosya mutasyonlu kaldi`);
  }
  const isaret = m.yon === "ZARARSIZ" ? "o" : m.yon === "KALDIRAN" ? "-" : "+";
  if (m.yon === "ZARARSIZ") {
    if (sonuc.kod === 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
    else if (!sonuc.ciktiVar) bozuk.push(`${m.ad}\n       bekci COKTU - olcum gecersiz`);
    else kacan.push(`${m.ad}\n       YALANCI KIRMIZI`);
    continue;
  }
  if (sonuc.kod !== 0 && sonuc.ciktiVar) { yakalanan++; console.log(`  OK  ${isaret} ${m.ad}`); }
  else if (sonuc.kod !== 0) bozuk.push(`${m.ad}\n       bekci COKTU (baslik basilmadi) - olcum gecersiz`);
  else kacan.push(`${m.ad}\n       KORUMASIZ: ${m.bozdugu}`);
}
console.log("");
for (const k of kacan) console.log("  X  " + k);
for (const b of bozuk) console.log("  !! " + b);
console.log(`\n  ${yakalanan}/${MUTASYONLAR.length} mutasyon beklendigi gibi davrandi`);
if (kacan.length || bozuk.length) { console.log("\n  Kacan ya da olculemeyen mutasyon var - bekci eksik.\n"); process.exitCode = 1; }
else console.log("\n  OK  Yayin boslugu UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
