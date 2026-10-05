import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  FİRMA ÜYELİĞİ — MUTASYON HARNESS'İ (K303, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kullanici-uyeligi-mutasyon:kontrol
 *
 *  `kullanici-uyeligi:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki
 *  her mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular,
 *  bekçinin başlığını görmeden «kırmızı» saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/kullanici-uyeligi-dogrula.ts";
const BEKCI_BASLIGI = "FİRMA ÜYELİĞİ BEKÇİSİ";
const GOVDE = "src/lib/kullanici-uyeligi.ts";
const KAPI = "src/lib/oturum-firmasi.ts";
const SATIS = "src/app/satislar/yeni/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " *  SISTEM: bu gövde iki kapıdan çağrılır", koy: " *  SISTEM: bu gövde İKİ kapıdan çağrılır",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "UYELIK FIRMASIZ ARANIYOR (kisi her firmadan bulunur)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  return sistemPrisma.userCompanyRole.findUnique({\n    where: { userId_companyId: { userId, companyId } },",
    koy: "  return sistemPrisma.userCompanyRole.findFirst({\n    where: { userId },",
    bozdugu: "bir firmanin yoneticisi baska firmanin kisisini pasife alir" },
  { ad: "SON SAHIP KORUMASI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (u.isActive && !(await firmadaBaskaSahipVarMi(companyId, userId))) {",
    koy: "  if (false) {",
    bozdugu: "firmanin son yetkilisi pasife alinir, firma yonetilemez" },
  { ad: "SON SAHIP SAYIMI FIRMASIZ", yon: "KALDIRAN", dosya: GOVDE,
    bul: "    where: { companyId, userId: { not: haricUserId }, roleId: { in: roller }, isActive: true, user: { isActive: true } },",
    koy: "    where: { userId: { not: haricUserId }, isActive: true, user: { isActive: true } },",
    bozdugu: "baska firmadaki yetkili bu firmanin son yetkilisini kurtariyor sayilir" },
  { ad: "PASIFE ALMA BUTUN UYELIKLERE YAYILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    sistemPrisma.userCompanyRole.update({ where: { id: u.id }, data: { isActive: yeni } }),",
    koy: "    sistemPrisma.userCompanyRole.updateMany({ where: { userId }, data: { isActive: yeni } }),",
    bozdugu: "bir firmada pasife almak kisiyi butun firmalarinda kapatir (eski kusur)" },
  { ad: "UYELIK IZI YANLIS ADLA", yon: "KALDIRAN", dosya: GOVDE,
    bul: '        action: yeni ? "UYELIK_AKTIFLESTI" : "UYELIK_PASIFE_ALINDI",',
    koy: '        action: "BASKA_IZ",',
    bozdugu: "kim kimi hangi firmada pasife aldi bulunamaz" },
  { ad: "GIRIS KAPISI PASIF UYELIGE BAKMIYOR", yon: "KALDIRAN", dosya: KAPI,
    bul: "    where: { userId: kullaniciId, companyId: firmaId, isActive: true, company: { isActive: true }, role: { isActive: true } },",
    koy: "    where: { userId: kullaniciId, companyId: firmaId, company: { isActive: true }, role: { isActive: true } },",
    bozdugu: "pasife alinan kisi o firmaya girmeye devam eder" },
  { ad: "KOSULSUZ FIRMA SECIMI GERI GELDI", yon: "FAZLADAN", dosya: SATIS,
    bul: "prisma.company.findUnique({ where: { id: baglam.companyId }, select: { lotKipi: true } });",
    koy: "prisma.company.findFirst({ select: { lotKipi: true } });",
    bozdugu: "satis formu baska firmanin parti kipini okur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nFİRMA ÜYELİĞİ — MUTASYON TURU\n");

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
  console.log("  OK  Firma üyeliği İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
