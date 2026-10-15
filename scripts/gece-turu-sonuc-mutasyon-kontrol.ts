import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  GECE TURU GITHUB'DA — MUTASYON HARNESS'İ (15.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run gece-turu-sonuc-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/gece-turu-sonuc-dogrula.ts";
const BEKCI_BASLIGI = "GECE TURU GITHUB BEKÇİSİ";
const KAPI = "src/lib/gece-turu-sonuc.ts";
const UC = "src/app/api/cron/gece-turu-sonuc/route.ts";
const BETIK = "scripts/gece-turu.ts";
const IS = ".github/workflows/gece-turu.yml";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KAPI,
    bul: " *  SAF: gövdeyi DENETLER ve kayda yazılacak hâline çevirir; yazmaz.", koy: " *  SAF: gövdeyi DENETLER ve kayda yazılacak hâline çevirir; yazmaz (zararsiz).",
    bozdugu: "" },
  { ad: "CELISKILI YESIL KABUL", yon: "FAZLADAN", dosya: KAPI,
    bul: `if (durum === "YESIL" && (kirmizilar.length > 0 || g.yesil !== g.toplam || typeof g.toplam !== "number")) return { tamam: false, kod: "CELISKI" };`, koy: "",
    bozdugu: "kirmizi listesi dolu bir rapor YESIL diye kayda girer" },
  { ad: "BOS KIRMIZI KABUL", yon: "FAZLADAN", dosya: KAPI,
    bul: `if (durum === "KIRMIZI" && kirmizilar.length === 0) return { tamam: false, kod: "CELISKI" };`, koy: "",
    bozdugu: "hangi bekcinin kirmizi oldugunu soylemeyen rapor kabul edilir" },
  { ad: "YABANCI BAGLANTI KABUL", yon: "FAZLADAN", dosya: KAPI,
    bul: `!(g.calisma as string).startsWith(CALISMA_ONEKI) || `, koy: "",
    bozdugu: "ekrana keyfi bir dis baglanti basilabilir" },
  { ad: "YABANCI ALAN GECER", yon: "FAZLADAN", dosya: KAPI,
    bul: `const detay: Record<string, unknown> = { durum, kirmizilar, kaynak: "GITHUB" };`, koy: `const detay: Record<string, unknown> = { ...g, durum, kirmizilar, kaynak: "GITHUB" };`,
    bozdugu: "bilinmeyen alanlar kayda girer" },
  { ad: "UC HAM GOVDEYI YAZAR", yon: "FAZLADAN", dosya: UC,
    bul: "detail: JSON.stringify(sonuc.detay)", koy: "detail: metin",
    bozdugu: "denetlenmemis govde kayda yazilir" },
  { ad: "UC REDDI YUTAR", yon: "KALDIRAN", dosya: UC,
    bul: "  if (!sonuc.tamam) return NextResponse.json({ hata: sonuc.kod }, { status: 400 });\n", koy: "",
    bozdugu: "bozuk rapor 400 yerine yazima gider" },
  { ad: "GONDERILEMEYEN SONUC SESSIZ", yon: "KALDIRAN", dosya: BETIK,
    bul: "    throw new Error(`sonuç canlıya gönderilemedi: ${son}`);", koy: "    console.log(`sonuç canlıya gönderilemedi: ${son}`);",
    bozdugu: "canliya ulasmayan tur yesil biter, kacis gorunmez" },
  { ad: "TOHUM KURULMUYOR", yon: "KALDIRAN", dosya: BETIK,
    bul: `    if (GITHUB) hazirlik("tohum (örnek veri)", kos("npx tsx scripts/gece-turu-tohum.ts", GECE));\n`, koy: "",
    bozdugu: "bos veritabaninda veri isteyen bekciler sessizce atlar" },
  { ad: "IS CANLI VERITABANINA BAGLI", yon: "FAZLADAN", dosya: IS,
    bul: "      DATABASE_URL: mysql://root:gece@127.0.0.1:3306/axcali_gece", koy: "      DATABASE_URL: mysql://k:p@w0.kasserver.com:3306/canli",
    bozdugu: "gece turu canli veriye yazar" },
  { ad: "IS ZAMANLANMIYOR", yon: "KALDIRAN", dosya: IS,
    bul: `    - cron: "30 21 * * *"   # 21:30 UTC = 00:30 Istanbul`, koy: `    - cron: "30 21 31 2 *"   # hic`,
    bozdugu: "tur hic kosmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nGECE TURU GITHUB — MUTASYON TURU\n");

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
  console.log("  OK  gece turu GitHub geçişi İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
