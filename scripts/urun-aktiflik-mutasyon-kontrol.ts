import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÜRÜN AKTİFLİĞİ — MUTASYON HARNESS'İ (02.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run urun-aktiflik-mutasyon:kontrol
 * ============================================================================
 */

const BEKCI = "scripts/urun-aktiflik-dogrula.ts";
const BEKCI_BASLIGI = "ÜRÜN AKTİFLİĞİ BEKÇİSİ";
const KURAL = "src/lib/urun-aktiflik.ts";
const EYLEM = "src/app/urunler/actions.ts";
const FORM = "src/app/urunler/urun-formu.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KURAL,
    bul: "toplu temizliğin kuralıyla aynı yön.", koy: "aynı yön.",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "KURAL HEP AKTIF", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return varyantlar.some((v) => v.aktif);", koy: "  return true || varyantlar.length > 0;",
    bozdugu: "butun varyantlari pasif urun aktif gorunur" },
  { ad: "KURAL HEPSI AKTIF ISTIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: "  return varyantlar.some((v) => v.aktif);", koy: "  return varyantlar.length > 0 && varyantlar.every((v) => v.aktif);",
    bozdugu: "tek varyanti aktif urun pasif kalir (olculen vaka)" },
  { ad: "GUNCELLEME URUNU YAZMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "          isActive: urunAktifMi(veri.varyantlar),", koy: "",
    bozdugu: "varyant aktif edilince urun pasif kalir (eski kusur)" },
  /* ═══ K315 — pasiften aktife geçiş şartı ═══ */
  { ad: "K315 EAN SARTI YOK", yon: "KALDIRAN", dosya: KURAL,
    bul: '  if (!eanGecerliMi((g.barkod ?? "").trim())) eksik.push("EAN");', koy: "",
    bozdugu: "barkodsuz uyuyan kayit tek tikla geri acilir" },
  { ad: "K315 EAN YALNIZ DOLULUK", yon: "KALDIRAN", dosya: KURAL,
    bul: '  if (!eanGecerliMi((g.barkod ?? "").trim())) eksik.push("EAN");', koy: '  if (!(g.barkod ?? "").trim()) eksik.push("EAN");',
    bozdugu: "HBCV… gibi EAN olmayan kodla acilir" },
  { ad: "K315 KATEGORI SARTI YOK", yon: "KALDIRAN", dosya: KURAL,
    bul: '  if (!g.kategoriVar) eksik.push("KATEGORI");', koy: "",
    bozdugu: "kategorisiz kayit acilir; KDV %20 varsayilir, SKU kurulamaz" },
  { ad: "K315 MARKA SARTI YOK", yon: "KALDIRAN", dosya: KURAL,
    bul: '  if (!g.markaTablodaMi) eksik.push("MARKA");', koy: "",
    bozdugu: "markasiz kayit acilir; SKU'nun MRK parcasi yok" },
  { ad: "K315 KAPSAM: AKTIF KAYIT DA KILITLI", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (g.oncedenAktif !== false || !g.simdiAktif) return [];", koy: "  if (!g.simdiAktif) return [];",
    bozdugu: "zaten aktif yuzlerce kaydin duzenlenmesi kilitlenir" },
  { ad: "K315 KAPSAM: PASIF KALAN DA KILITLI", yon: "FAZLADAN", dosya: KURAL,
    bul: "  if (g.oncedenAktif !== false || !g.simdiAktif) return [];", koy: "  if (g.oncedenAktif !== false) return [];",
    bozdugu: "pasif birakilan eksik kayit hic kaydedilemez" },
  { ad: "K315 EYLEM HATAYI YOK SAYIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "  if (aktifEtmeHatalari.length) return { hatalar: aktifEtmeHatalari };", koy: "",
    bozdugu: "kural hesaplanir ama kayit yine yazilir" },
  { ad: "K315 EYLEM MARKAYI METINDEN OLCUYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "      markaTablodaMi: markaBagi !== null,", koy: "      markaTablodaMi: Boolean(veri.marka),",
    bozdugu: "tabloda olmayan serbest marka metniyle acilir" },
  { ad: "K315 EYLEM ESKI HALI OKUMUYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "      oncedenAktif: v.id ? (oncekiAktiflik.get(v.id) ?? null) : null,", koy: "      oncedenAktif: null,",
    bozdugu: "her kayit 'yeni' sayilir; sart hic calismaz" },
  { ad: "K315 FORM IPUCU CIZILMIYOR", yon: "KALDIRAN", dosya: FORM,
    bul: "{varyant.id && kayittaPasif.has(varyant.id) ? (", koy: "{false && varyant.id && kayittaPasif.has(varyant.id) ? (",
    bozdugu: "sart ancak kaydedince ogrenilir" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nÜRÜN AKTİFLİĞİ — MUTASYON TURU\n");

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
  console.log("  OK  Ürün aktifliği İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
