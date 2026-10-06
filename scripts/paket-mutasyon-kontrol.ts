import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  PAKET — MUTASYON HARNESS'İ (K303 ②, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run paket-mutasyon:kontrol
 *
 *  `paket:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular.
 * ============================================================================
 */

const BEKCI = "scripts/paket-dogrula.ts";
const BEKCI_BASLIGI = "PAKET BEKÇİSİ";
const KATALOG = "src/lib/paket/ozellikler.ts";
const YONETIM = "src/lib/paket/yonetim.ts";
const ACILIS = "src/lib/firma-acilisi.ts";
const EYLEM = "src/app/bezirga/(ic)/paketler/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KATALOG,
    bul: "/** Özellik → kapsadığı menü ekranları (`MENU_ADRESLERI` anahtarları). */", koy: "/** Özellik → kapsadığı menü ekranları (MENU_ADRESLERI anahtarları). */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "EKRAN SAHIPSIZ KALDI", yon: "KALDIRAN", dosya: KATALOG,
    bul: '  finansman: ["finansman"],', koy: "  finansman: [],",
    bozdugu: "finansman ekrani hicbir pakette yonetilemez" },
  { ad: "EKRAN IKI OZELLIGE AIT", yon: "FAZLADAN", dosya: KATALOG,
    bul: '  nakitTakvimi: ["nakitTakvimi"],', koy: '  nakitTakvimi: ["nakitTakvimi", "kartBorcu"],',
    bozdugu: "bir paketten cikan ekran ötekinden acik kalir" },
  { ad: "HEP ACIK OZELLIGI YUTUYOR", yon: "FAZLADAN", dosya: KATALOG,
    bul: '"ozellikler", "geceTuru"] as const;', koy: '"ozellikler", "geceTuru", "finansman"] as const;',
    bozdugu: "paket disi birakilan ekran paketle kapatilamaz" },
  { ad: "FIRMAYA OZEL SECIM OKUNMUYOR", yon: "KALDIRAN", dosya: KATALOG,
    bul: "return new Set(paket.firmayaOzel ? firmaSecimi : paket.ozellikler);", koy: "return new Set(paket.ozellikler);",
    bozdugu: "Individuel firma hicbir ekran goremez" },
  { ad: "PAKETSIZ FIRMA HER SEYI GORUR", yon: "FAZLADAN", dosya: KATALOG,
    bul: "  if (!paket) return new Set();", koy: "  if (!paket) return new Set(OZELLIKLER);",
    bozdugu: "paketsiz firma bedava Premium olur" },
  { ad: "FINANSMAN HAZIR PAKETE GIRDI", yon: "FAZLADAN", dosya: KATALOG,
    bul: '"karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti"] },', koy: '"karlilikKarti", "urunAnalizi", "envanterDegeri", "aiOzeti", "finansman"] },',
    bozdugu: "06.10 karari (yalniz Individuel) delinir" },
  { ad: "INDIVIDUEL GECISI BAYAT SECIMI DONDURUYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: "const yenidenKur = p.firmayaOzel && !once.paket?.firmayaOzel;", koy: "const yenidenKur = false;",
    bozdugu: "paket degisimi sessizce ekran kapatir ya da eski ekrani acar" },
  { ad: "HAZIR PAKETTE FIRMA SECIMI YAZILIYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (!fp.paket?.firmayaOzel) return { durum: "HATA", hata: "OZEL_DEGIL" };\n', koy: "",
    bozdugu: "etkisiz secim yazilir; ekran ne gosterdigini bilemez" },
  { ad: "FIRMAYA OZEL PAKETE ICERIK YAZILIYOR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (p.firmayaOzel) return { durum: "HATA", hata: "FIRMAYA_OZEL" };\n', koy: "",
    bozdugu: "Individuel paketinde etkisiz icerik birikir" },
  { ad: "FIRMA SECIMINDE TANIMSIZ ANAHTAR", yon: "KALDIRAN", dosya: YONETIM,
    bul: '  if (secim.some((o) => !GECERLI.has(o))) return { durum: "HATA", hata: "OZELLIK_GECERSIZ" };\n  const fp = await firmaPaketi(firmaId);',
    koy: "  const fp = await firmaPaketi(firmaId);",
    bozdugu: "uydurma anahtar veritabanina girer" },
  { ad: "FIRMA PAKETSIZ ACILIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: "isActive: false, paketId }", koy: "isActive: false }",
    bozdugu: "yeni firma paketsiz dogar" },
  { ad: "PAKET SINANMADAN ACILIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: '  if (!(await sistemPrisma.paket.findUnique({ where: { id: paketId }, select: { id: true } }))) {\n    return { durum: "HATA", hata: "PAKET_YOK" };\n  }\n',
    koy: "",
    bozdugu: "olmayan paketle firma acilmaya calisilir (FK hatasi, yarim kurulum)" },
  { ad: "PAKET ICERIGI KAPISIZ", yon: "KALDIRAN", dosya: EYLEM,
    bul: 'export async function paketIcerigiEylemi(paketId: string, secim: string[]): Promise<{ hata?: string; tamam?: string }> {\n  const t = await getTranslations("Yonetim");\n  const k = await yonetimEylemi();',
    koy: 'export async function paketIcerigiEylemi(paketId: string, secim: string[]): Promise<{ hata?: string; tamam?: string }> {\n  const t = await getTranslations("Yonetim");\n  const k = { id: "x" };',
    bozdugu: "super admin olmayan biri paket icerigini degistirir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nPAKET — MUTASYON TURU\n");

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
  console.log("  OK  Paketler İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
