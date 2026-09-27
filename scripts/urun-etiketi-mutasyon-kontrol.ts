import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜN ETİKETİ — MUTASYON HARNESS'I (K291, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-etiketi-mutasyon:kontrol
 *  `urun-etiketi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/urun-etiketi-dogrula.ts";
const BEKCI_BASLIGI = "ÜRÜN ETİKETİ (K291)";
const GOVDE = "src/lib/urun-etiketi.ts";
const SAYFA = "src/app/urunler/etiketler/page.tsx";
const BASICI = "src/app/urunler/etiketler/etiket-basici.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - govde yorumu", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "  /* Barkod: tam genişlik (kenar boşluklu), yüksekliğin ~%38'i; altında kod, altında ad. */", koy: "  /* Barkod. */", bozdugu: "hicbir sey" },
  { ad: "SESSIZ BOLGE KALKTI (kenar sifir)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const kenar = barkod.olur ? Math.max(en * 0.06, (10 * en) / (code128Genisligi(barkod.moduller) + 20)) : en * 0.06;", koy: "  const kenar = 0;", bozdugu: "barkod kenara yapisir, okuyucu basi/sonu ayiramaz" },
  { ad: "BARKOD YANLIS KODU CIZIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const barkod = code128B(kod);", koy: "  const barkod = code128B(kod + \"X\");", bozdugu: "etiket okutulunca baska kod doner" },
  { ad: "BASILAMAYAN KOD BOS ETIKET", yon: "KALDIRAN", dosya: GOVDE,
    bul: "`<text x=\"${en / 2}\" y=\"${boy * 0.45}\" text-anchor=\"middle\" font-family=\"monospace\" font-size=\"${Math.min(en, boy) * 0.08}\">BASILAMADI</text>`,", koy: "", bozdugu: "bos kagit cikar, neden yazmaz" },
  /* Sınır ilk hâlde İKİ kapıdaydı (`break` + sondaki `slice`); birini kaldıran mutasyon ötekinin
     arkasında kaçıyordu (ölçüldü 27.09). Çift kapı tek kapıya indi; mutasyon asıl kapıyı hedefler. */
  { ad: "AD SATIR SINIRI YOK", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    if (cikti.length === satir) break;\n", koy: "", bozdugu: "uzun ad etiketin disina tasar" },
  /* K291-② 40×30 karekod. */
  { ad: "40x30 CIZGI BARKODA DONDU (203 dpi'de guvensiz)", yon: "KALDIRAN", dosya: GOVDE,
    bul: 'export const KAREKODLU_OLCULER: readonly EtiketOlcusu[] = ["40x30"];', koy: "export const KAREKODLU_OLCULER: readonly EtiketOlcusu[] = [];", bozdugu: "1,6 noktalik cizgiler okunmaz" },
  { ad: "40x30 KOD YAZISI TASIYOR (sabit boy)", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const kodYazi = Math.min(3.2, sagEn / (enUzun * 0.64));", koy: "  const kodYazi = 3.2;", bozdugu: "OYU-LEG sag kenardan kesilir" },
  { ad: "SAYFA KODU FIRMA SKU DEGIL SKU", yon: "FAZLADAN", dosya: SAYFA,
    bul: "urunEtiketiSvg(v.companySku, ad, olcu)", koy: "urunEtiketiSvg(v.id, ad, olcu)", bozdugu: "etikette anlamsiz kimlik basilir" },
  { ad: "BASKI SAYFASI ETIKET OLCUSU DEGIL", yon: "KALDIRAN", dosya: BASICI,
    bul: "@page { size: ${en}mm ${boy}mm; margin: 0; }", koy: "@page { margin: 0; }", bozdugu: "A4 sayfaya basilir, etiketler kayar" },
  { ad: "ADETLER TEK SAYFAYA YIGILIYOR", yon: "KALDIRAN", dosya: BASICI,
    bul: 'breakAfter: "page", ', koy: "", bozdugu: "birden cok etiket ayni etikete ust uste basilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nURUN ETIKETI - MUTASYON TURU (K291)\n");
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
else console.log("\n  OK  Urun etiketi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
