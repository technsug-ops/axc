import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  KÂRLILIK KARTI ANALİZİ — MUTASYON HARNESS'I (K330, 10.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run kart-analizi-mutasyon:kontrol
 *  `kart-analizi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/kart-analizi-dogrula.ts";
const BEKCI_BASLIGI = "KARLILIK KARTI ANALIZI (K330, 10.10.2026)";
const SERI = "src/lib/urun-karti-seri.ts";
const ANALIZ = "src/lib/urun-karti-analiz.ts";
const GORSEL = "src/lib/urun-gorseli.ts";
const YAZICI = "src/lib/urun-gorseli-yaz.ts";
const SAYFA = "src/app/kart/[variantId]/page.tsx";
const PANO = "src/app/kart/[variantId]/kart-panosu.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - seri yorumu", yon: "ZARARSIZ", dosya: SERI,
    bul: "/** Oran (0–1) — payda sıfırsa `null`. */", koy: "/** Oran (0–1) — payda sıfırsa `null` (K330). */", bozdugu: "hicbir sey" },
  { ad: "ZARARSIZ - pano yorumu", yon: "ZARARSIZ", dosya: PANO,
    bul: "/** Alt çizgili sekmeler (Algoritmo) — adrese yazılır, dönem korunur. */", koy: "/** Alt çizgili sekmeler — adrese yazılır, dönem korunur. */", bozdugu: "hicbir sey" },
  { ad: "GUN UTC'DEN (Istanbul degil)", yon: "KALDIRAN", dosya: SERI,
    bul: "  return gunMetni(gunDegeri(isTakvimGunu(an)));", koy: "  return gunMetni(an);", bozdugu: "gece yarisi satislari yanlis gune yazilir" },
  { ad: "ONCEKI SIFIRDA UYDURMA YUZDE", yon: "FAZLADAN", dosya: SERI,
    bul: " || once === 0) return null;", koy: ") return null;", bozdugu: "onceki donem 0 iken sonsuz/uydurma artis yazar" },
  { ad: "SATISSIZDA STOK GUNU UYDURULUYOR", yon: "FAZLADAN", dosya: SERI,
    bul: "  if (satilanAdet <= 0 || gunSayisi <= 0) return null;", koy: "  if (satilanAdet <= 0 || gunSayisi <= 0) return 0;", bozdugu: "olculemeyen hiz 0 gun diye okunur" },
  { ad: "MERDIVENE HESAPLANAMAYAN KALEM GIRIYOR", yon: "FAZLADAN", dosya: SERI,
    bul: "      haric++;\n      continue;", koy: "      haric++;", bozdugu: "maliyetsiz kalem tam kar gibi toplanir" },
  { ad: "GUNLUK NET-2 KISMI TOPLAM", yon: "FAZLADAN", dosya: SERI,
    bul: "    n.net2 = n.net2 === null || k.net2 === null ? null : n.net2 + k.net2;", koy: "    n.net2 = (n.net2 ?? 0) + (k.net2 ?? 0);", bozdugu: "eksik NET tam gibi cizilir" },
  { ad: "SATISSIZ GUNE FIYAT 0", yon: "FAZLADAN", dosya: SERI,
    bul: "        return v ? v.ciro / v.adet : null;", koy: "        return v ? v.ciro / v.adet : 0;", bozdugu: "fiyat coktu sanilir" },
  { ad: "KALDIRILMIS KALEM SAYILIYOR", yon: "KALDIRAN", dosya: ANALIZ,
    bul: "      ...KALEM_GECERLI,\n      sale: { iptalTarihi: null, soldAt: { gte: bas, lt: bitHaric } },", koy: "      sale: { iptalTarihi: null, soldAt: { gte: bas, lt: bitHaric } },", bozdugu: "kart satislar ekranindan farkli rakam yazar" },
  { ad: "IZINSIZE NET-1 GIDIYOR", yon: "FAZLADAN", dosya: ANALIZ,
    bul: "      net1: karGorunur ? s(r.net1Amount) : null,", koy: "      net1: s(r.net1Amount),", bozdugu: "kar izni olmayan rol kari gorur" },
  { ad: "GERI ALINMIS IADE SAYILIYOR", yon: "KALDIRAN", dosya: ANALIZ,
    bul: "return: { ...IADE_GECERLI, occurredAt:", koy: "return: { occurredAt:", bozdugu: "geri alinmis iade orani sisirir" },
  { ad: "GALERI ESKISI SILINMEDEN YAZILIYOR", yon: "KALDIRAN", dosya: YAZICI,
    bul: "      prisma.varyantGorseli.deleteMany({ where: { variantId: g.id } }),\n", koy: "", bozdugu: "galeri yazilamaz ya da yarim kalir" },
  { ad: "N11 TRENDYOL GALERISINI EZIYOR", yon: "FAZLADAN", dosya: GORSEL,
    bul: "  if (mevcut.kaynak !== null && GORSEL_ONCELIGI[aday.kaynak] > GORSEL_ONCELIGI[mevcut.kaynak]) return false;\n", koy: "", bozdugu: "dusuk oncelikli kanal resimleri degistirir" },
  { ad: "GALERIDE TEKRAR", yon: "FAZLADAN", dosya: GORSEL,
    bul: " || sonuc.includes(url)) continue;", koy: ") continue;", bozdugu: "ayni resim iki kez" },
  { ad: "N11 GALERI TASIMIYOR", yon: "KALDIRAN", dosya: "scripts/canli-n11-listeleme-yaz.ts",
    bul: "          galeri: galeriAdresleri(Array.isArray(r.imageUrls) ? r.imageUrls : [], \"N11\"),\n", koy: "", bozdugu: "N11 urunlerinde galeri hic dolmaz" },
  { ad: "KAR SEKMESI IZINSIZE ACIK", yon: "FAZLADAN", dosya: SAYFA,
    bul: "  const sekme = istenenSekme === \"kar\" && !karGorunur ? \"genel\" : istenenSekme;", koy: "  const sekme = istenenSekme;", bozdugu: "adresle kar raporu izinsize acilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nKARLILIK KARTI ANALIZI - MUTASYON TURU (K330, 10.10.2026)\n");
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
else console.log("\n  OK  Kart analizi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
