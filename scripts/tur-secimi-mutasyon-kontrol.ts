import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TUR SEÇİMİ + GECE TURU — MUTASYON HARNESS'I (K290, 27.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run tur-secimi-mutasyon:kontrol
 *  `tur-secimi:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 *  ⚠ «Fazladan» burada ATLAMA demek: seçim, koşması gereken bir denetimi
 *  atlarsa koruma sessizce kalkar — bu harness'in asıl bekçiliği o yön.
 * ============================================================================
 */

const BEKCI = "scripts/tur-secimi-dogrula.ts";
const BEKCI_BASLIGI = "TUR SEÇİMİ + GECE TURU (K290)";
const SECIM = "scripts/tur-secimi.ts";
const TUR = "scripts/bekci.ts";
const KANCA = ".githooks/pre-push";
const GECE = "scripts/gece-turu.ts";
const VERI = "src/lib/gece-turu-veri.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - secim yorumu", yon: "ZARARSIZ", dosya: SECIM,
    bul: "/** Bir mutasyon denetiminin «dokunduğu» dosyalar; çözülemezse `null`. */", koy: "/** Dokunulan dosyalar. */", bozdugu: "hicbir sey" },
  { ad: "LISTE BILINMIYORKEN HICBIRI KOSMUYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: '  if (degisen === null) return hepsi("değişen dosya listesi bilinmiyor");', koy: "  if (degisen === null) return { kos: [], atla: denetimler.map((d) => d.ad), hepsiSebebi: null };", bozdugu: "aralik okunamayinca butun mutasyon denetimleri atlanir" },
  { ad: "COZULEMEYEN DENETIM ATLANIYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: "    if (d.dosyalar === null || d.dosyalar.some((f) => kume.has(f))) kos.push(d.ad);", koy: "    if (d.dosyalar !== null && d.dosyalar.some((f) => kume.has(f))) kos.push(d.ad);", bozdugu: "bagi bilinmeyen denetim hic kosmaz" },
  { ad: "ORTAK ALTYAPI DEGISINCE HEPSI KOSMUYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: "  if (altyapi) return hepsi(`ortak altyapı değişti: ${altyapi}`);", koy: "  if (false && altyapi) return hepsi(`ortak altyapı değişti: ${altyapi}`);", bozdugu: "harness araci degisir, denetimler atlanir" },
  { ad: "WINDOWS YOLU NORMALLESMIYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: "  const kume = new Set(degisen.map(yolu));", koy: "  const kume = new Set(degisen);", bozdugu: "ters bolulu yol eslesmez, denetim atlanir" },
  { ad: "HEDEF DOSYALAR DOKUNMA SAYILMIYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: "    const dosyalar = new Set<string>([harness, bekci, ...hedefler].map(yolu));", koy: "    const dosyalar = new Set<string>([harness, bekci].map(yolu));", bozdugu: "denetimin bozdugu dosya degisir, denetim atlanir" },
  { ad: "BEKCI DOSYASI DOKUNMA SAYILMIYOR", yon: "FAZLADAN", dosya: SECIM,
    bul: "    const dosyalar = new Set<string>([harness, bekci, ...hedefler].map(yolu));", koy: "    const dosyalar = new Set<string>([harness, ...hedefler].map(yolu));", bozdugu: "bekci degisir, disi test edilmez" },
  { ad: "TUR SECIMI UYGULAMIYOR (hepsi kosar - yavas ama guvenli yon)", yon: "KALDIRAN", dosya: TUR,
    bul: "  const mutasyonAdlari = tumMutasyon.filter((ad) => secim.kos.includes(ad));", koy: "  const mutasyonAdlari = tumMutasyon;", bozdugu: "push yine 45 dk surer" },
  { ad: "TAM_TUR BAYRAGI YOK SAYILIYOR", yon: "FAZLADAN", dosya: TUR,
    bul: '  if (process.env.TAM_TUR === "1") return null;\n', koy: "", bozdugu: "gece turu da yalniz degisenleri kosar" },
  { ad: "KANCA COKLU DALDA DA TABAN VERIYOR", yon: "FAZLADAN", dosya: KANCA,
    bul: 'if [ "$SATIR" -eq 1 ] && [ -n "$TABAN" ]; then', koy: 'if [ -n "$TABAN" ]; then', bozdugu: "iki dal gonderilince yanlis aralik secilir" },
  { ad: "GECE SON YESILI KIRMIZIDA DA ILERLETIYOR", yon: "FAZLADAN", dosya: GECE,
    bul: "  if (gecerli && kirmizilar.length === 0) durum.sonYesilSha = sha;", koy: "  if (gecerli) durum.sonYesilSha = sha;", bozdugu: "geriye tarama yanlis tabandan baslar, bozan push bulunamaz" },
  { ad: "GECIKMIS TUR SORUN SAYILMIYOR", yon: "FAZLADAN", dosya: VERI,
    bul: "  if (gecikti) return { sayi: 1, gecikti: true };", koy: "  if (gecikti && false) return { sayi: 1, gecikti: true };", bozdugu: "gece turu kacar, kimse fark etmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTUR SECIMI + GECE TURU - MUTASYON TURU (K290)\n");
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
else console.log("\n  OK  Tur secimi + gece turu UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
