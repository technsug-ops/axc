import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  K305 — ALIM İADESİ + VERİ DÜZELTMESİ — MUTASYON HARNESS'I (29.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run kart-iadesi-mutasyon:kontrol
 *  Üç bekçinin K305 ölçütlerini sınar: `kart-iadesi:dogrula` (kart borcu),
 *  `rapor:dogrula` (alım iadesi gelir değil), `duzeltme:dogrula` (sayım farkı
 *  GERÇEK NET dışı). Her mutasyon KENDİ bekçisini koşturur. ÜÇ YÖN:
 *  zararsız · kaldıran · fazladan. Çapası tutmayan mutasyon «ölçülemedi».
 * ============================================================================
 */

const BEKCI = "scripts/kart-iadesi-dogrula.ts";
const RAPOR_BEKCI = "scripts/rapor-dogrula.ts";
const DUZELTME_BEKCI = "scripts/duzeltme-dogrula.ts";
const BASLIK: Record<string, string> = {
  /* ⚠ Düzenli ifade: parantez KAÇIRILIR — ilk koşumda `(K305)` grup sayıldı, başlık
     hiç eşleşmedi ve 6 mutasyon «bekçi çöktü» raporlandı (harness kusuru, bekçi sağlamdı). */
  [BEKCI]: "KARTA DÖNEN ALIM İADESİ \\(K305\\)",
  [RAPOR_BEKCI]: "TÜM KONTROLLER GEÇTİ|KONTROL BAŞARISIZ",
  [DUZELTME_BEKCI]: "TÜM KONTROLLER GEÇTİ|KONTROL BAŞARISIZ",
};
const KURAL = "src/lib/kart-iadesi.ts";
const VERI = "src/lib/kart-iadesi-veri.ts";
const TAKVIM = "src/lib/panel/takvim-verisi.ts";
const OZET = "src/lib/panel/kart-borcu-ozeti.ts";
const RAPOR = "src/lib/rapor.ts";
const ALIM_TUTARI = "src/lib/kart-alim-tutari.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bekci: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu", yon: "ZARARSIZ", dosya: KURAL, bekci: BEKCI,
    bul: "  /** Tazminat talebinin kimliği. */", koy: "  /** Talep kimliği. */", bozdugu: "hicbir sey" },
  { ad: "IADE BORCU ARTIRIYOR (isaret)", yon: "FAZLADAN", dosya: KURAL, bekci: BEKCI,
    bul: "tutar: -i.tutar,", koy: "tutar: i.tutar,", bozdugu: "karta donen para borc gibi eklenir" },
  { ad: "BASKA KARTIN IADESI DUSUYOR", yon: "FAZLADAN", dosya: KURAL, bekci: BEKCI,
    bul: "i.kartId === kartId && ", koy: "", bozdugu: "iade yanlis kartin borcundan duser" },
  { ad: "NAKIT TAKVIMI IADEYI EKLEMIYOR", yon: "KALDIRAN", dosya: TAKVIM, bekci: BEKCI,
    bul: "    borcAlimlari.push(...alimIadeleriniBorcaCevir(kartIadeleri, kart.id, kart.currency));\n", koy: "",
    bozdugu: "takvim ile kart borcu ekrani farkli borc soyler" },
  { ad: "PANEL OZETI IADEYI EKLEMIYOR", yon: "KALDIRAN", dosya: OZET, bekci: BEKCI,
    bul: "    borclar.push(...alimIadeleriniBorcaCevir(kartIadeleri, kart.id, kart.currency));\n", koy: "",
    bozdugu: "panel kart borcu sisik" },
  { ad: "TAHSIL GUNU ISTANBUL'A CEVRILMIYOR", yon: "KALDIRAN", dosya: VERI, bekci: BEKCI,
    bul: "      tarih: gunDegeri(isTakvimGunu(tarih)),", koy: "      tarih,",
    bozdugu: "gece tahsil edilen iade yanlis ekstreye duser" },
  { ad: "RAPOR ALIM IADESINI GELIR SAYIYOR", yon: "FAZLADAN", dosya: RAPOR, bekci: RAPOR_BEKCI,
    bul: "      b.alimIadesiTutari += tz.tutar;\n      continue;\n", koy: "      b.alimIadesiTutari += tz.tutar;\n",
    bozdugu: "hasarli malin karta donen parasi kar yazilir" },
  { ad: "SAYIM FAZLASI YINE KAR", yon: "FAZLADAN", dosya: RAPOR, bekci: DUZELTME_BEKCI,
    bul: "    b.duzeltmeZarari = b.fireZarari;", koy: "    b.duzeltmeZarari = b.fireZarari + b.sayimZarari - b.fireKazanci - b.sayimKazanci;",
    bozdugu: "sayim fazlasi GERCEK NET'i sisirir (eylul +34 bin)" },
  { ad: "VERI DUZELTMESI HESAPLANMIYOR", yon: "KALDIRAN", dosya: RAPOR, bekci: DUZELTME_BEKCI,
    bul: "    b.veriDuzeltmeEtkisi = b.fireKazanci + b.sayimKazanci - b.sayimZarari;", koy: "    b.veriDuzeltmeEtkisi = 0;",
    bozdugu: "sayim farki ekrandan kaybolur" },
  /* K308 - alim tutari tek govde; kargo/vergi alim tutarinin ICINDE (kullanici beyani 29.09). */
  { ad: "K308 GOVDE TUTARI SISIRIYOR", yon: "FAZLADAN", dosya: ALIM_TUTARI, bekci: BEKCI,
    bul: "    tutar += Number(k.unitCostAmount.toString()) * k.quantity;", koy: "    tutar += Number(k.unitCostAmount.toString()) * k.quantity * 1.2;",
    bozdugu: "fiyatin icindeki KDV ikinci kez karta yazilir" },
  { ad: "K308 FARKLI PARA BIRIMI SESSIZ DUSUYOR", yon: "KALDIRAN", dosya: ALIM_TUTARI, bekci: BEKCI,
    bul: "      farkliVar = true;\n", koy: "",
    bozdugu: "kur cevrilmeyen kalem borctan sessizce duser, ekran uyarmaz" },
  { ad: "K308 TAKVIM YINE ELLE HESAPLIYOR", yon: "KALDIRAN", dosya: TAKVIM, bekci: BEKCI,
    bul: "      const { tutar } = kartAlimTutari(a.items, kart.currency);", koy: "      const tutar = a.items.reduce((t, k) => t + Number(k.unitCostAmount.toString()) * k.quantity, 0);",
    bozdugu: "iki ekran iki ayri olcutle borc kurar; biri degisince ayrisir" },
  { ad: "K308 PANEL KARGOYU YINE EKLIYOR", yon: "FAZLADAN", dosya: OZET, bekci: BEKCI,
    bul: "      const { tutar } = kartAlimTutari(a.items, kart.currency);", koy: "      const tutar = kartAlimTutari(a.items, kart.currency).tutar + Number((a as { shippingAmount?: number }).shippingAmount ?? 0);",
    bozdugu: "alim tutarinin icindeki kargo panelde ikinci kez borca yazilir" },
];

function bekciyiKostur(bekci: string): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + bekci, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: new RegExp(BASLIK[bekci]).test(cikti) };
}

console.log("\nK305 - MUTASYON TURU (alim iadesi + veri duzeltmesi)\n");
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
    sonuc = bekciyiKostur(m.bekci);
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
else console.log("\n  OK  K305 UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
