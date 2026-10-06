import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  İKİ ADIMLI GİRİŞ — MUTASYON HARNESS'İ (K303 ⑤, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run iki-adim-mutasyon:kontrol
 *
 *  `iki-adim:dogrula`nın dişini sınar. Her mutasyon gerçek bir GÜVENLİK
 *  gerilemesidir; ZARARSIZ yeşil kalmalı, öteki her biri KIRMIZI yanmalı.
 * ============================================================================
 */

const BEKCI = "scripts/iki-adim-dogrula.ts";
const BEKCI_BASLIGI = "İKİ ADIMLI GİRİŞ BEKÇİSİ";
const TOTP = "src/lib/iki-adim/totp.ts";
const DEPO = "src/lib/iki-adim/depo.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: TOTP,
    bul: "/** Yeni gizli anahtar — 20 bayt (160 bit, RFC 4226 önerisi), base32. */", koy: "/** Yeni gizli anahtar: 20 bayt (160 bit, RFC 4226 önerisi), base32. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "PENCERE GENISLEDI", yon: "FAZLADAN", dosya: TOTP,
    bul: "export const PENCERE = 1;", koy: "export const PENCERE = 2;",
    bozdugu: "eski/gelecek kodlar kabul edilir, kaba kuvvete kapi acilir" },
  { ad: "TEKRAR KORUMASI YOK", yon: "KALDIRAN", dosya: TOTP,
    bul: "      if (sonAdim !== null && a <= sonAdim) { tekrar = true; continue; }\n", koy: "",
    bozdugu: "goren biri ayni kodu yeniden kullanir" },
  { ad: "ALGORITMA BOZUK", yon: "KALDIRAN", dosya: TOTP,
    bul: "  const o = h[h.length - 1]! & 0x0f;", koy: "  const o = h[h.length - 1]! & 0x07;",
    bozdugu: "uretilen kod dogrulama uygulamasiyla tutmaz" },
  { ad: "ACILMAMIS ANAHTARLA GIRIS", yon: "KALDIRAN", dosya: DEPO,
    bul: '  if (!a.acik) return { durum: "HATA", hata: "ACIK_DEGIL" };\n', koy: "",
    bozdugu: "kurulumu bitirmemis anahtar giris acar" },
  { ad: "ACIK IKI ADIMDA YENI ANAHTAR", yon: "KALDIRAN", dosya: DEPO,
    bul: '  if (u.totpAcildiAt) return { durum: "HATA", hata: "ZATEN_ACIK" };\n', koy: "",
    bozdugu: "parolayi bilen kisi yeni anahtar uretip ikinci adimi ele gecirir" },
  { ad: "VERITABANI TEKRAR KOSULU GEVSEDI", yon: "KALDIRAN", dosya: DEPO,
    bul: "{ totpSonAdim: { lt: d.adim } }", koy: "{ totpSonAdim: { lte: d.adim } }",
    bozdugu: "esanli iki istek ayni kodla gecer" },
  { ad: "YEDEK KOD DUZ METIN", yon: "FAZLADAN", dosya: DEPO,
    bul: "  const ozetler = await Promise.all(kodlar.map((k) => parolaOzetle(yedekKodNormal(k))));", koy: "  const ozetler = kodlar.map((k) => yedekKodNormal(k));",
    bozdugu: "veritabanini okuyan yedek kodlari gorur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nİKİ ADIMLI GİRİŞ — MUTASYON TURU\n");

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
  console.log("  OK  İki adımlı giriş İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
