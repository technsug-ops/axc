import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  YENİ FİRMA AÇILIŞI — MUTASYON HARNESS'İ (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-acilisi-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/firma-acilisi-dogrula.ts";
const BEKCI_BASLIGI = "FİRMA AÇILIŞI BEKÇİSİ";
const GOVDE = "src/lib/firma-acilisi.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", bul: "YENİ FİRMA AÇILIŞI — TEK GÖVDE", koy: "YENİ FİRMA AÇILIŞI (TEK GÖVDE)", bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "FIRMA AKTIF DOGUYOR", yon: "FAZLADAN",
    bul: "data: { name: g.ad, code: g.kod, isActive: false, paketId }", koy: "data: { name: g.ad, code: g.kod, isActive: true, paketId }",
    bozdugu: "kurulum bitmeden firma koduyla giris acilir; yarim kurulum gorunmez" },
  { ad: "AKTIFLESME TEK ISLEMDEN CIKTI", yon: "KALDIRAN",
    bul: "        await tx.company.update({ where: { id: firma.id }, data: { isActive: true } });\n", koy: "",
    bozdugu: "firma hic aktiflesmez ya da islem disinda yarim aktiflesir" },
  { ad: "KOD NORMALLESMIYOR", yon: "KALDIRAN",
    bul: "  const kod = firmaKoduNormalle(ham.kod);", koy: "  const kod = ham.kod;", bozdugu: "' abc ' yazilan kod reddedilir ya da kucuk harfle kaydolur" },
  { ad: "KOD TEK HARF KABUL", yon: "FAZLADAN",
    bul: "export const FIRMA_KODU_DESENI = /^[A-Z0-9]{2,10}$/;", koy: "export const FIRMA_KODU_DESENI = /^[A-Z0-9]{1,10}$/;", bozdugu: "tek harfli kod acilir" },
  { ad: "KOD UZUNLUK SINIRI KALKTI", yon: "FAZLADAN",
    bul: "export const FIRMA_KODU_DESENI = /^[A-Z0-9]{2,10}$/;", koy: "export const FIRMA_KODU_DESENI = /^[A-Z0-9]{2,}$/;", bozdugu: "sinirsiz uzun kod" },
  { ad: "KOD TURKCE KARAKTER/BOSLUK KABUL", yon: "FAZLADAN",
    bul: "export const FIRMA_KODU_DESENI = /^[A-Z0-9]{2,10}$/;", koy: "export const FIRMA_KODU_DESENI = /^.{2,10}$/;", bozdugu: "girişte yazilamayan kod acilir" },
  { ad: "E-POSTA DESENI GEVSEK", yon: "FAZLADAN",
    bul: "if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(yoneticiEposta))", koy: "if (!/^[^\\s@]+@[^\\s@]+$/.test(yoneticiEposta))", bozdugu: "gecersiz yonetici e-postasi kabul edilir" },
  { ad: "KOD CAKISMASI SORULMUYOR", yon: "FAZLADAN",
    bul: "  if (await sistemPrisma.company.findUnique({ where: { code: g.kod }, select: { id: true } })) {\n    return { durum: \"HATA\", hata: \"KOD_VAR\" };\n  }\n",
    koy: "", bozdugu: "var olan kodla acilis veritabani hatasina carpar, ekran sebebi soylemez" },
  { ad: "YARIM KURULUM AKTIFLESTIRILEBILIYOR", yon: "FAZLADAN",
    bul: "  if (durum === \"YARIM\") return { durum: \"HATA\", hata: \"YARIM_KURULUM\" };\n", koy: "",
    bozdugu: "rolleri/yoneticisi olmayan firma aktiflesir" },
  { ad: "YARIM OLCUTU ACILDI IZINI SORMUYOR", yon: "FAZLADAN",
    bul: "basladi.has(f.id) && !acildi.has(f.id)", koy: "basladi.has(f.id)",
    bozdugu: "bilerek pasife alinmis firma 'kurulum yarim' gorunur" },
  { ad: "YENI YONETICI PAROLA DEGISTIRMEK ZORUNDA DEGIL", yon: "FAZLADAN",
    bul: "mustChangePassword: true }", koy: "mustChangePassword: false }", bozdugu: "gecici parola kalici olur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nFİRMA AÇILIŞI — MUTASYON TURU\n");
let dogru = 0;
const yanlis: string[] = [];
const bozuk: string[] = [];
for (const m of MUTASYONLAR) {
  const asil = readFileSync(GOVDE, "utf8");
  const bul = desenNormalle(asil, m.bul);
  const koy = desenNormalle(asil, m.koy);
  const adet = asil.split(bul).length - 1;
  if (adet !== 1) { bozuk.push(`${m.ad}\n       desen ${adet} kez geçiyor (1 olmalı)`); continue; }
  const mutant = asil.replace(bul, koy);
  let sonuc: { kod: number; ciktiVar: boolean };
  try {
    dayanikliYaz(GOVDE, mutant);
    if (readFileSync(GOVDE, "utf8") !== mutant || mutant === asil) { bozuk.push(`${m.ad}\n       mutasyon diske UYGULANMADI`); continue; }
    sonuc = bekciyiKostur();
  } finally {
    dayanikliYaz(GOVDE, asil);
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
else console.log("  OK  Firma açılışı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
