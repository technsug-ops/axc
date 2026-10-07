import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KANAL KDV UYUŞMAZLIĞI — MUTASYON HARNESS'İ (30.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kdv-uyusmazligi-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/kdv-uyusmazligi-dogrula.ts";
const BEKCI_BASLIGI = "KANAL KDV ORANI UYUŞMAZLIĞI BEKÇİSİ";
const KURAL = "src/lib/kdv-uyusmazligi-kurali.ts";
const GOVDE = "src/lib/kdv-uyusmazligi.ts";
const YAZ = "src/lib/kanal-listeleme-yaz.ts";
const V2 = "scripts/ty/urun-v2.ts";
const TOPLA = "src/lib/uyari/topla.ts";
const SAYFA = "src/app/kanal-sku/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Kanal oranı bilinmiyorsa `null` (hüküm yok); biliniyorsa ayrışıyor mu. */", koy: "/** Kanal oranı yoksa null. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "OLCULMEMIS ORAN UYUSMUYOR SAYILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (kanalOrani === null || !Number.isFinite(kanalOrani)) return null;", koy: "  if (kanalOrani === null || !Number.isFinite(kanalOrani)) return true;",
    bozdugu: "HB ve onay bekleyen ilanlarin hepsi yanlis uyari verir" },
  { ad: "YUVARLAMA KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return yuzde(kanalOrani) !== yuzde(bizimOran);", koy: "  return kanalOrani !== bizimOran;",
    bozdugu: "kayan nokta kuyrugu sahte uyusmazlik uretir" },
  { ad: "TY ORANI OKUNMUYOR", yon: "KALDIRAN", dosya: V2,
    bul: "      kdvOrani: sayiVeyaYok(v.vatRate),\n", koy: "",
    bozdugu: "senkron oran yazmaz, uyari hic yanmaz" },
  { ad: "ORAN DEGISINCE YAZILMIYOR", yon: "KALDIRAN", dosya: YAZ,
    bul: " || kayitliKdv !== k.kdv || s.externalListingId !== k.ilan) {", koy: " || s.externalListingId !== k.ilan) {",
    bozdugu: "ilan duzeltilse bile eski oran kalir, uyari sonmez" },
  { ad: "CAKISAN ILANDA BIRI SECILIYOR", yon: "FAZLADAN", dosya: YAZ,
    bul: "const ortakKdv = mevcut.kdv === kdv ? kdv : null;", koy: "const ortakKdv = kdv;",
    bozdugu: "iki farkli oranli ilandan rastgele biri yazilir" },
  { ad: "ILAN KALKINCA ORAN KALIYOR", yon: "KALDIRAN", dosya: YAZ,
    bul: "listelemeDurumu: \"YOK\", kanalAdet: null, kanalKdvOrani: null,", koy: "listelemeDurumu: \"YOK\", kanalAdet: null,",
    bozdugu: "kalkan ilanin eski orani bugun gecerli sanilir" },
  { ad: "GOVDE BOS ORANI DA OKUYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "where: { isActive: true, kanalKdvOrani: { not: null } },", koy: "where: { isActive: true },",
    bozdugu: "olculen sayisi sisik, olculmemis ilan kapsamda sanilir" },
  { ad: "CAN SAYISI ELLE", yon: "KALDIRAN", dosya: TOPLA,
    bul: "kdvOraniUyusmuyor: { sayi: (await kdvUyusmayanKanalSkulari()).kimlikler.length },", koy: "kdvOraniUyusmuyor: { sayi: 0 },",
    bozdugu: "uyusmazlik varken can susar" },
  { ad: "LISTE SUZGECI KALKTI", yon: "KALDIRAN", dosya: SAYFA,
    bul: "    ...(kdvUyusmazligi ? { id: { in: kdvUyusmazligi.kimlikler } } : {}),\n", koy: "",
    bozdugu: "can 9 der, liste butun kanal SKU'larini acar" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKANAL KDV UYUŞMAZLIĞI — MUTASYON TURU\n");

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
  console.log("  OK  kanal KDV uyuşmazlığı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
