import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ESKİ KOD — MUTASYON HARNESS'I (K287, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run eski-kod-mutasyon:kontrol
 *  `eski-kod:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/eski-kod-dogrula.ts";
const BEKCI_BASLIGI = "ESKİ KOD (K287)";
const KURAL = "src/lib/varyant-arama-kurali.ts";
const KAYIT = "src/lib/okuma/kayit.ts";
const OZET = "src/lib/varyant-ozet.ts";
const ONIZLEME = "src/lib/sku-onizleme-veri.ts";
const ONER = "src/app/urunler/sku-oner.ts";
const FORM = "src/app/urunler/urun-formu.tsx";
const YEDEK = "src/lib/yedek-bicim.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - eski kod dali yorumu", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** K287 — eski kod dalı (serbest arama); `kanalKoduDali` ile aynı gerekçe ve şekil. */", koy: "/** K287 — eski kod dali. */", bozdugu: "hicbir sey" },
  { ad: "OKUTMA ESKI KODU ARAMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "    { eskiKodlar: { some: { kod: { in: kodlar } } } },\n", koy: "", bozdugu: "eski etiketli urun okutulunca bulunamaz" },
  { ad: "TOPLU COZUM ESKI KODU ARAMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "    { eskiKodlar: { some: { kod: { in: genis } } } },\n", koy: "", bozdugu: "eski kodla gelen siparis/alim eslesmez" },
  { ad: "OKUTMA ESKI KODDA KISMI ESLESME", yon: "FAZLADAN", dosya: KURAL,
    bul: "    { eskiKodlar: { some: { kod: { in: kodlar } } } },", koy: "    { eskiKodlar: { some: { kod: { contains: kod } } } },", bozdugu: "benzeyen eski kod yanlis urune yazar" },
  { ad: "SERBEST ARAMA ESKI KODU ARAMIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "    eskiKodDali(e),\n", koy: "", bozdugu: "listede eski kodla arama bos doner" },
  { ad: "ESKI KOD GUNCELDEN ONCE SOYLENIYOR", yon: "FAZLADAN", dosya: KAYIT,
    bul: 'const ARAMA_SIRASI = ["barcode", "companySku", "sku", "channelSku", "eskiKodlar"] as const;', koy: 'const ARAMA_SIRASI = ["eskiKodlar", "barcode", "companySku", "sku", "channelSku"] as const;', bozdugu: "guncel kod okutulunca eski kod dendigi olur" },
  { ad: "OKUTMA SECIMI ESKI KODU OKUMUYOR", yon: "KALDIRAN", dosya: OZET,
    bul: "  eskiKodlar: { select: { kod: true } },\n", koy: "", bozdugu: "ekran hangi kodun tuttugunu soyleyemez" },
  { ad: "ONIZLEME ESKI KODU BOS SAYIYOR", yon: "FAZLADAN", dosya: ONIZLEME,
    bul: "  for (const e of eskiKodlar) kullanilan.add(e.kod.trim());\n", koy: "", bozdugu: "eski kod baska urune yeni kod olarak verilir" },
  { ad: "ONERI MARKAYI ADDAN HESAPLIYOR", yon: "FAZLADAN", dosya: ONER,
    bul: "  const brandId = await markaBagiBul(girdi.marka);", koy: "  const brandId = await markaBagiBul(girdi.marka); void urunKisaltmasi;", bozdugu: "Karaca/Karcher cakismasi geri gelir" },
  { ad: "ONERI ESKI KODU CAKISMA SAYMIYOR", yon: "FAZLADAN", dosya: ONER,
    bul: " ||\n      (await prisma.eskiKod.count({ where: { kod } })) > 0;", koy: ";", bozdugu: "onerilen kod bir eski etiketle ayni olabilir" },
  { ad: "FORM PAZARYERI SKU'SUNU EZIYOR", yon: "FAZLADAN", dosya: FORM,
    bul: '                            ...(varyant.sku.trim() === "" ? { sku: kod } : {}),', koy: "                            sku: kod,", bozdugu: "pazaryeri kodu kaybolur, siparisler eslesmez" },
  { ad: "YEDEK ESKI KODLARI TASIMIYOR", yon: "KALDIRAN", dosya: YEDEK,
    bul: '  "EskiKod",\n', koy: "", bozdugu: "geri yuklemede eski kodlar kaybolur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nESKI KOD - MUTASYON TURU (K287)\n");
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
else console.log("\n  OK  Eski kod UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
