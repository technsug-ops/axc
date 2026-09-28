import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  FİNANSMAN — MUTASYON HARNESS'I (K304, 28.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run finansman-mutasyon:kontrol
 *  `finansman:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/finansman-dogrula.ts";
const BEKCI_BASLIGI = "FİNANSMAN (K304)";
const KURAL = "src/lib/finansman/kural.ts";
const VERI = "src/lib/finansman/veri.ts";
const TAKVIM = "src/lib/panel/takvim-verisi.ts";
const EYLEM = "src/app/finansman/eylemler.ts";
const SEED = "prisma/seed-yetki.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** Borç mu — kalan borç yalnız bunlarda anlamlıdır. */", koy: "/** Borç mu. */", bozdugu: "hicbir sey" },
  { ad: "PLANLI HAREKET BAKIYEYE GIRIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "    if (!h.gerceklesti) {", koy: "    if (false) {", bozdugu: "odenmemis taksit borcu dusurur" },
  { ad: "MAHSUP NAKIT SAYILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return 0;\n}", koy: "  return h.anapara;\n}", bozdugu: "kasadan cikmayan para takvimde gorunur" },
  { ad: "SERMAYE GERI ODENEBILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '  SERMAYE: ["GIRIS"],', koy: '  SERMAYE: ["GIRIS", "GERI_ODEME"],', bozdugu: "sermaye borc gibi azalir" },
  { ad: "BELIRSIZ SAYI KABUL EDILIYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "    if (!/^-?\\d{1,3}(\\.\\d{3})+$/.test(s)) return null;\n", koy: "",
    bozdugu: "12.5 sessizce 125 ya da 12,5 okunur" },
  { ad: "TAKVIM GERCEKLESMISI DE ALIYOR", yon: "FAZLADAN", dosya: VERI,
    bul: 'where: { gerceklestiAt: null, isReversal: false, tur: { in: ["GIRIS", "GERI_ODEME"] } },',
    koy: 'where: { isReversal: false, tur: { in: ["GIRIS", "GERI_ODEME"] } },', bozdugu: "odenmis taksit takvimde ikinci kez cikar" },
  { ad: "TAKVIM FINANSMANI EKLEMIYOR", yon: "KALDIRAN", dosya: TAKVIM,
    bul: '    satirlar.push({ ...f, kaynak: "FINANSMAN" });', koy: "    void f;", bozdugu: "kredi taksiti nakit takviminde gorunmez" },
  { ad: "KAR MOTORU FINANSMANI OKUYOR (desen)", yon: "FAZLADAN", dosya: TAKVIM,
    bul: "  return satirlar;\n}", koy: "  await prisma.finansmanHareketi.count();\n  return satirlar;\n}",
    bozdugu: "finansman modulu disinda tablo okunur" },
  { ad: "GERCEKLESTIR YETKISIZ", yon: "KALDIRAN", dosya: EYLEM,
    bul: '  const baglam = await yetkiIste("finansman.yonet");\n  const t = await getTranslations("Finansman");\n\n  const gun = gunMetninden(tarih);',
    koy: '  const baglam = { companyId: null };\n  const t = await getTranslations("Finansman");\n\n  const gun = gunMetninden(tarih);',
    bozdugu: "izinsiz kullanici taksit isaretler, gider yazilir" },
  { ad: "TERS KAYIT FAIZI TERSLEMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "amount: -Number(h.faizGider.amount.toString())", koy: "amount: Number(h.faizGider.amount.toString())",
    bozdugu: "yanlis taksitin faizi iki kez gider olur" },
  { ad: "PLAN SIL GERCEKLESMISI DE SILIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "where: { id: h.id, gerceklestiAt: null, isReversal: false }", koy: "where: { id: h.id, isReversal: false }",
    bozdugu: "olmus bir odeme defterden silinir" },
  { ad: "KAYNAK SIL GERCEKLESMIS HAREKETE BAKMIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: '      if (olmus > 0) throw new Error("GERCEKLESMIS_VAR");\n', koy: "",
    bozdugu: "olmus para tasiyan kaynak defterden silinir" },
  { ad: "KAYNAK SIL TERS KAYDI SAYMIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "OR: [{ gerceklestiAt: { not: null } }, { isReversal: true }]", koy: "OR: [{ gerceklestiAt: { not: null } }]",
    bozdugu: "ters kaydi olan kaynak silinir" },
  /* K304-② */
  { ad: "OZELLIK KAPISI KALKTI (kapaliyken altin kaydi)", yon: "FAZLADAN", dosya: EYLEM,
    bul: '  if (EK_BIRIMLER.includes(birim) && !(await cokBirimAcikMi(baglam.companyId))) return { tamam: false, hata: t("hata.BIRIM_KAPALI") };\n', koy: "",
    bozdugu: "ozellik kapaliyken USD/altin borc acilir" },
  { ad: "KAPALIYKEN DE TUM BIRIMLER", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return cokBirimAcik ? TUM_BIRIMLER : TEMEL_BIRIMLER;", koy: "  return TUM_BIRIMLER;",
    bozdugu: "anahtar bir sey ifade etmez" },
  { ad: "FIYATSIZ BIRIM UYDURULUYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (tlFiyati === null || !Number.isFinite(tlFiyati) || tlFiyati <= 0) return null;", koy: "  if (tlFiyati === null) return miktar;",
    bozdugu: "80 gr altin 80 TL diye toplanir" },
  { ad: "ALTIN FAIZI TL GIRMEDEN GIDER OLUYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: '  if (giderTl === null || !Number.isFinite(giderTl) || giderTl <= 0) return "GIDER_TL_GEREKLI";', koy: '  if (giderTl === null) return { tutar: giderBiriminde, paraBirimi: "TRY" };',
    bozdugu: "2 gram faiz 2 TL gider diye yazilir" },
  { ad: "FIYATSIZ BIRIM SESSIZCE DUSUYOR", yon: "KALDIRAN", dosya: VERI,
    bul: "    if (tl === null) fiyatsizBirimler.push(birim);\n    else borcTl += tl;", koy: "    if (tl !== null) borcTl += tl;",
    bozdugu: "TL toplami eksik ama ekran bunu soylemez" },
  { ad: "IZIN TAM YETKILIYE DAGITILMIYOR", yon: "KALDIRAN", dosya: SEED,
    bul: '    "finansman.yonet",\n', koy: "", bozdugu: "ekran menude gorunur, tiklayinca 404" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nFINANSMAN - MUTASYON TURU (K304)\n");
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
else console.log("\n  OK  Finansman UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
