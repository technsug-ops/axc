import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  YÜKLENİYOR EKRANI — MUTASYON HARNESS'I (11.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run yukleniyor-mutasyon:kontrol
 *  `yukleniyor:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/yukleniyor-dogrula.ts";
const BEKCI_BASLIGI = "YUKLENIYOR EKRANI (11.10.2026)";
const EKRAN = "src/app/loading.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const NB = "src/components/niyetli-baglanti.tsx";
const MUTASYONLAR: Mutasyon[] = [
  /* K332 (12.10.2026) — önceden yükleme yalnız niyetle. */
  { ad: "BIR EKRAN YINE DOGRUDAN next/link", yon: "FAZLADAN", dosya: "src/components/baglanti.tsx",
    bul: 'import Link from "@/components/niyetli-baglanti";', koy: 'import Link from "next/link";', bozdugu: "o ekrandaki her baglanti yine ekrana girince yuklenir" },
  { ad: "ORTAK BAGLANTI EKRANA GIRINCE YUKLUYOR", yon: "FAZLADAN", dosya: NB,
    bul: "prefetch={acikVerildi ? prefetch : niyet ? null : false}", koy: "prefetch={acikVerildi ? prefetch : null}", bozdugu: "sayfa basina ~140 istek geri gelir" },
  { ad: "DOKUNMA NIYETI YOK (telefon)", yon: "KALDIRAN", dosya: NB,
    bul: "      onTouchStart={(e) => {\n        setNiyet(true);\n", koy: "      onTouchStart={(e) => {\n", bozdugu: "telefonda dokunusta onceden yukleme baslamaz" },
  { ad: "ACIK VERILEN prefetch EZILIYOR", yon: "FAZLADAN", dosya: NB,
    bul: "const acikVerildi = prefetch === true || prefetch === false;", koy: "const acikVerildi = false;", bozdugu: "cagiranin bilincli tercihi sessizce yok sayilir" },
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: EKRAN,
    bul: " *  ⚠ SUNUCUNUN HIZINI DEĞİŞTİRMEZ", koy: " *  ⚠ SUNUCUNUN HIZINI DEGISTIRMEZ", bozdugu: "hicbir sey" },
  { ad: "VARSAYILAN DISA AKTARIM YOK", yon: "KALDIRAN", dosya: EKRAN,
    bul: "export default async function Yukleniyor()", koy: "export async function Yukleniyor()", bozdugu: "Next ekrani okumaz, gec tepki geri gelir" },
  { ad: "DURUM ROLU YOK", yon: "KALDIRAN", dosya: EKRAN,
    bul: ' role="status"', koy: "", bozdugu: "ekran okuyucu yuklendigini soylemez" },
  { ad: "METIN SILINDI", yon: "KALDIRAN", dosya: EKRAN,
    bul: '<span className="sr-only">{t("sayfaYukleniyor")}</span>', koy: "", bozdugu: "ekran okuyucu bos durum okur" },
  { ad: "METIN KODA GOMULDU", yon: "FAZLADAN", dosya: EKRAN,
    bul: '{t("sayfaYukleniyor")}', koy: "Yükleniyor", bozdugu: "i18n kurali cignenir" },
  { ad: "ISTEMCI DOSYASINA DONDU", yon: "FAZLADAN", dosya: EKRAN,
    bul: 'import { getTranslations } from "next-intl/server";', koy: '"use client";\nimport { getTranslations } from "next-intl/server";', bozdugu: "sunucu sozlugu istemcide calismaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nYUKLENIYOR EKRANI - MUTASYON TURU (11.10.2026)\n");
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
else console.log("\n  OK  Yukleniyor ekrani UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
