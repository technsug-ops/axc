import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ASKI SÜRECİ — MUTASYON HARNESS'İ (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run aski-sureci-mutasyon:kontrol
 *
 *  `aski-sureci:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular,
 *  bekçinin başlığını görmeden «kırmızı» saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/aski-sureci-dogrula.ts";
const BEKCI_BASLIGI = "ASKI SÜRECİ BEKÇİSİ";
const GOVDE = "src/lib/aski-sureci.ts";
const ACILIS = "src/lib/firma-acilisi.ts";
const EPOSTA = "src/lib/eposta.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "SISTEM: yönetim katmanı — sorgular firma kimliğiyle açıkça süzülür.", koy: "SISTEM: yönetim katmanı; sorgular firma kimliğiyle açıkça süzülür.",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "SON GUN DAHIL DEGIL", yon: "KALDIRAN", dosya: GOVDE,
    bul: "return fark >= 0", koy: "return fark > 0",
    bozdugu: "son gun 'suresi doldu' sayilir; firma bir gun erken askiya alinabilir" },
  { ad: "ASKI UYARIDAN ONCE GELMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: '  if (!f.aktif) return { tur: "ASKIDA", sebep: f.askiSebebi };\n', koy: "",
    bozdugu: "askidaki firma 'uyarida' gorunur" },
  { ad: "DIGER ACIKLAMA ISTEMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: 'if (sebep === "DIGER" && aciklama.length === 0)', koy: "if (false)",
    bozdugu: "sebepsiz (aciklamasiz 'diger') aski yazilir" },
  { ad: "GUN SINIRI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: "g.gun > UYARI_EN_COK_GUN", koy: "g.gun > 9999",
    bozdugu: "yillarca suren uyari acilir" },
  { ad: "BUGUN ISTANBUL DEGIL UTC", yon: "KALDIRAN", dosya: GOVDE,
    bul: "return gunDegeri(isTakvimGunu(an));", koy: "return new Date(Date.UTC(an.getUTCFullYear(), an.getUTCMonth(), an.getUTCDate()));",
    bozdugu: "gece yarisindan sonra Istanbul'da gun bir gun geri sayilir (anayasa: is saat dilimi sabit)" },
  { ad: "PASIF UYE ALICI OLUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "where: { companyId: firmaId, isActive: true, roleId: { in: tam }, user: { isActive: true, isSuperAdmin: false } },",
    koy: "where: { companyId: firmaId, roleId: { in: tam }, user: { isActive: true, isSuperAdmin: false } },",
    bozdugu: "pasife alinmis kisiye firma e-postasi gider" },
  { ad: "SUPER ADMIN ALICI OLUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "where: { companyId: firmaId, isActive: true, roleId: { in: tam }, user: { isActive: true, isSuperAdmin: false } },",
    koy: "where: { companyId: firmaId, isActive: true, roleId: { in: tam }, user: { isActive: true } },",
    bozdugu: "yonetim hesabi musteri bildirimini alir" },
  { ad: "ASKI ACIK UYARIYI KAPATMIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: ": { isActive: false, askiSebebi: aski!.sebep, askiAciklama: aski!.aciklama, uyariSonGun: null, uyariSebebi: null },",
    koy: ": { isActive: false, askiSebebi: aski!.sebep, askiAciklama: aski!.aciklama },",
    bozdugu: "askiya alinan firmada eski uyari asili kalir" },
  { ad: "ASKI KALKINCA SEBEP KALIYOR", yon: "KALDIRAN", dosya: ACILIS,
    bul: "? { isActive: true, askiSebebi: null, askiAciklama: null, uyariSonGun: null, uyariSebebi: null }",
    koy: "? { isActive: true }",
    bozdugu: "aktif firmada eski aski sebebi gorunmeye devam eder" },
  { ad: "EPOSTA HATASI KIRPILIYOR", yon: "KALDIRAN", dosya: EPOSTA,
    bul: "hata: String((hata as Error)?.message ?? hata).replace(/\\s+/g, \" \")",
    koy: "hata: String((hata as Error)?.message ?? hata).split(\"\\n\")[0]",
    bozdugu: "gonderilemeyen e-postanin asil sebebi (ikinci satir) kaybolur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nASKI SÜRECİ — MUTASYON TURU\n");

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
  console.log("  OK  Askı süreci İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
