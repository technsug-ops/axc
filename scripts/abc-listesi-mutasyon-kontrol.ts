import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ABC SATIRI → ÜRÜN LİSTESİ — MUTASYON HARNESS'I (09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run abc-listesi-mutasyon:kontrol
 *  `abc-listesi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/abc-listesi-dogrula.ts";
const BEKCI_BASLIGI = "ABC SATIRI → ÜRÜN LİSTESİ (09.10.2026)";
const BI = "src/lib/panel/bi.ts";
const KUME = "src/lib/panel/abc-kumesi.ts";
const PANEL = "src/app/panel-bi.tsx";
const SAYFA = "src/app/urunler/page.tsx";
const EXCEL = "src/lib/disa-aktarma/listeler.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kume dosyasi yorumu", yon: "ZARARSIZ", dosya: KUME,
    bul: " *  ABC KÜMESİ — PANEL İLE LİSTE AYNI GÖVDEDEN (kullanıcı isteği 09.10.2026)", koy: " *  ABC KÜMESİ — PANEL İLE LİSTE AYNI GÖVDEDEN (kullanıcı isteği 09.10.2026) ·", bozdugu: "hicbir sey" },
  { ad: "UYELIK SATISSIZI YAZMIYOR (184 der, bos liste acar)", yon: "KALDIRAN", dosya: BI,
    bul: "    uyelik.set(u.urunId, \"SATISSIZ\");\n", koy: "", bozdugu: "panel 184 der, liste 0 urun acar" },
  { ad: "UYELIK SINIFI KAYDIRIYOR", yon: "FAZLADAN", dosya: BI,
    bul: "    uyelik.set(u.urunId, sinif);", koy: "    uyelik.set(u.urunId, sinif === \"B\" ? \"C\" : sinif);", bozdugu: "B'nin urunleri C listesinde cikar" },
  { ad: "STOKSUZ SATISSIZ URUN DE SAYILIYOR", yon: "FAZLADAN", dosya: BI,
    bul: "    if (u.ciro > 0 || u.stokDegeri <= 0) continue;", koy: "    if (u.ciro > 0) continue;", bozdugu: "ne satan ne stogu olan urun 'satissiz' sayilir" },
  { ad: "ADRES KANALI DUSURUYOR", yon: "KALDIRAN", dosya: KUME,
    bul: "k.para, k.kanal ?? \"\"].join(AYRAC);", koy: "k.para, \"\"].join(AYRAC);", bozdugu: "Trendyol'a suzulmus panel tum kanallarin listesini acar" },
  { ad: "BOZUK ARALIK KABUL EDILIYOR", yon: "FAZLADAN", dosya: KUME,
    bul: "  if (!(baslangic.getTime() < bitisHaric.getTime())) return null;\n", koy: "", bozdugu: "ters aralikli adres bos liste acar, suzgec 'calisti' sanilir" },
  { ad: "LISTE IPTAL EDILEN SATISI SAYIYOR", yon: "FAZLADAN", dosya: KUME,
    bul: "          iptalTarihi: null,\n", koy: "", bozdugu: "iptal edilen siparis urunu A'ya tasir; panel ile liste ayrisir" },
  { ad: "PANEL KENDI HESABINA DONDU", yon: "KALDIRAN", dosya: PANEL,
    bul: "  const abc = abcSiniflari(abcVerisi.girdiler);", koy: "  const abc = abcSiniflari(abcVerisi.girdiler.filter((g) => g.ciro > 0));", bozdugu: "panel sayisi listeyle ayrisir (satissiz 0 der)" },
  { ad: "SIFIR SATIR DA BAGLANTI", yon: "FAZLADAN", dosya: PANEL,
    bul: "                      {abc[k].urunSayisi > 0 ? (\n                        <Link\n                          href={abcAdresi(k, abcKapsami)}", koy: "                      {true ? (\n                        <Link\n                          href={abcAdresi(k, abcKapsami)}", bozdugu: "0 urunluk satir bos listeye goturur" },
  { ad: "LISTE ABC SUZGECINI UYGULAMIYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "stokKosulu, abcKosulu] };", koy: "stokKosulu] };", bozdugu: "tiklaninca tum urunler acilir" },
  { ad: "SAYFALAMA SUZGECI DUSURUYOR", yon: "KALDIRAN", dosya: SAYFA,
    bul: "    [ABC_PARAMETRESI]: abc ? abcHam : undefined,\n", koy: "", bozdugu: "2. sayfada ya da Excel'de suzgec sessizce kalkar" },
  { ad: "EXCEL EKRANDAN FARKLI", yon: "KALDIRAN", dosya: EXCEL,
    bul: "          return abc ? { id: { in: await abcUrunIdleri(prisma, abc.kova, abc.kapsam) } } : {};", koy: "          return {};", bozdugu: "inen dosya tum urunleri icerir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nABC LISTESI - MUTASYON TURU (09.10.2026)\n");
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
else console.log("\n  OK  ABC listesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
