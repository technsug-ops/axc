import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  HESAP MODELİ — MUTASYON HARNESS'İ (K303 Model 2, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run hesap-modeli-mutasyon:kontrol
 *
 *  `hesap-modeli:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular.
 * ============================================================================
 */

const BEKCI = "scripts/hesap-modeli-dogrula.ts";
const BEKCI_BASLIGI = "HESAP MODELİ BEKÇİSİ";
const GOVDE = "src/lib/oturum-firmasi.ts";
const EKLE = "src/app/ayarlar/kullanicilar/actions.ts";
const ACILIS = "src/lib/firma-acilisi.ts";
const GIRIS = "src/app/giris/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Yönetim girişinin hesabı: YALNIZ firmasız süper admin hesabı", koy: "/** Yönetim girişinin hesabı: yalnız FİRMASIZ süper admin hesabı",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "FIRMA HESABI FIRMASIZ ARANIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: '  return sistemPrisma.user.findUnique({\n    where: { hesapFirmasiId_email: { hesapFirmasiId: firmaId ?? "-", email: eposta } },',
    koy: "  return sistemPrisma.user.findFirst({\n    where: { email: eposta },",
    bozdugu: "bir firmanin kodu baska firmanin hesabina girer" },
  { ad: "YONETIM KAPISI FIRMA HESABINI DA BULUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "where: { email: eposta, hesapFirmasiId: null, isSuperAdmin: true },", koy: "where: { email: eposta, isSuperAdmin: true },",
    bozdugu: "ayni e-postali bir firma hesabi super admin sayilabilir" },
  { ad: "KULLANICI EKLE SISTEM CAPINDA ARIYOR", yon: "FAZLADAN", dosya: EKLE,
    bul: "where: { hesapFirmasiId_email: { hesapFirmasiId: baglam.companyId, email: cozum.data.email } },", koy: "where: { email: cozum.data.email },",
    bozdugu: "'zaten var' baska firmanin hesabini sizdirir (eski kusur)" },
  { ad: "KULLANICI EKLE FIRMASIZ HESAP ACIYOR", yon: "KALDIRAN", dosya: EKLE,
    bul: "          hesapFirmasiId: firma.id,\n", koy: "",
    bozdugu: "eklenen kisi hicbir firmanin hesabi olmaz, giris yapamaz" },
  { ad: "FIRMA ACILISI FIRMASIZ YONETICI ACIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: "data: { email: g.yoneticiEposta, hesapFirmasiId: firma.id,", koy: "data: { email: g.yoneticiEposta,",
    bozdugu: "yeni firmanin yoneticisi firmasiz kalir" },
  { ad: "FIRMA GIRISI FIRMA VERMIYOR", yon: "KALDIRAN", dosya: GIRIS,
    bul: "const kullanici = await firmaHesabi(firma?.id ?? null, eposta);", koy: "const kullanici = await firmaHesabi(null, eposta);",
    bozdugu: "hic kimse firma girisi yapamaz (ya da yanlis hesap)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nHESAP MODELİ — MUTASYON TURU\n");

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
  console.log("  OK  Hesap modeli İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
