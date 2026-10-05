import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  FİRMA KARTI — MUTASYON HARNESS'İ (K303 süper admin ①, 05.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run firma-karti-mutasyon:kontrol
 *
 *  `firma-karti:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular,
 *  bekçinin başlığını görmeden «kırmızı» saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/firma-karti-dogrula.ts";
const BEKCI_BASLIGI = "FİRMA KARTI BEKÇİSİ";
const GOVDE = "src/lib/firma-karti.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " *  SISTEM: bu dosyanın bütün sorguları firmalar-üstüdür (yönetim katmanı",
    koy: " *  SISTEM: bu dosyanın sorgularının hepsi firmalar-üstüdür (yönetim katmanı",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "UYELIK KONTROLU YOK (kisi her firmadan bulunur)", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  const uyelik = await sistemPrisma.userCompanyRole.findUnique({\n    where: { userId_companyId: { userId: kullaniciId, companyId: firmaId } },",
    koy: "  const uyelik = await sistemPrisma.userCompanyRole.findFirst({\n    where: { userId: kullaniciId },",
    bozdugu: "bir firmanin kartindan BASKA firmanin kullanicisinin parolasi sifirlanir" },
  { ad: "SUPER ADMIN KORUMASI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: '  if (uyelik.user.isSuperAdmin) return { durum: "HATA", hata: "SUPER_ADMIN" };\n',
    koy: "",
    bozdugu: "yonetim hesabi bir firma kartindan sifirlanir (kilitleme / yetki yukseltme yolu)" },
  { ad: "ZORUNLU PAROLA DEGISIMI YOK", yon: "KALDIRAN", dosya: GOVDE,
    bul: "data: { passwordHash: ozet, mustChangePassword: true, sessionVersion: { increment: 1 } },",
    koy: "data: { passwordHash: ozet, mustChangePassword: false, sessionVersion: { increment: 1 } },",
    bozdugu: "gecici parola kalici parola olarak kalir" },
  { ad: "ACIK OTURUMLAR DUSMUYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "data: { passwordHash: ozet, mustChangePassword: true, sessionVersion: { increment: 1 } },",
    koy: "data: { passwordHash: ozet, mustChangePassword: true },",
    bozdugu: "eski parolayla acilmis oturumlar 30 gun daha gecerli kalir" },
  { ad: "PAROLA IZI YANLIS ADLA (iz kaybolur)", yon: "KALDIRAN", dosya: GOVDE,
    bul: 'action: "YONETIM_PAROLA_SIFIRLADI",',
    koy: 'action: "BASKA_IZ",',
    bozdugu: "kimin kimin parolasini sifirladigi bulunamaz" },
  { ad: "AD KIRPILMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  const ad = ham.trim();",
    koy: "  const ad = ham;",
    bozdugu: "bosluklu ad kaydedilir; acilisla iki farkli kural olur" },
  { ad: "AYNI AD DA IZ YAZIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: '  if (f.name === s.ad) return { durum: "TAMAM", degisti: false };\n',
    koy: "",
    bozdugu: "degismeyen ad icin iz yazilir; iz gurultuye doner" },
  { ad: "KARTA TICARI ALAN EKLENDI", yon: "FAZLADAN", dosya: GOVDE,
    bul: "      kullanici: f._count.uyelikler,",
    koy: "      kullanici: f._count.uyelikler,\n      ciro: 0,",
    bozdugu: "sayilar adet disi bir alan tasir (04.10 karari: ticari veri gorunmez)" },
  { ad: "KULLANICI SAYISI YANLIS KAYNAKTAN", yon: "KALDIRAN", dosya: GOVDE,
    bul: "      kullanici: f._count.uyelikler,",
    koy: "      kullanici: f._count.uyelikler + 1,",
    bozdugu: "kartta kullanici sayisi listeyle ayrisir (sayi = liste ilkesi)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nFİRMA KARTI — MUTASYON TURU\n");

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
  console.log("  OK  Firma kartı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
