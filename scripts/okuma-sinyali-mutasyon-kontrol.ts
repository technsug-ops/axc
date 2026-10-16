import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  OKUMA SİNYALİ + KASA SESİ — MUTASYON HARNESS'İ (15.10.2026)
 *      npm run okuma-sinyali-mutasyon:kontrol
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz.
 * ============================================================================
 */

const BEKCI = "scripts/okuma-sinyali-dogrula.ts";
const BEKCI_BASLIGI = "OKUMA SİNYALİ + KASA SESİ BEKÇİSİ";
const IMLEC = "src/lib/kasa-imleci.ts";
const EYLEM = "src/app/kasa-sesi-eylem.ts";
const BILESEN = "src/components/kasa-sesi.tsx";
const PAKET = "src/app/paketle/paketleyici.tsx";
const SINYAL = "src/lib/okuma-sinyali.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: SINYAL,
    bul: " *  · DOSYASIZ: sesler", koy: " *  · DOSYASIZ (zararsiz): sesler", bozdugu: "" },
  { ad: "ILK SORUDA GECMIS SIPARISLER CALAR", yon: "FAZLADAN", dosya: IMLEC,
    bul: `  if (!imlecIso) return { tur: "TABAN" };`, koy: `  if (!imlecIso) return { tur: "SAY", imlec: new Date(0) };`,
    bozdugu: "sayfa acilinca butun gecmis siparisler icin kasa sesi calar" },
  { ad: "ESKI IMLEC TABAN SAYILMIYOR", yon: "FAZLADAN", dosya: IMLEC,
    bul: " || simdi.getTime() - imlec.getTime() > KASA_IMLEC_TAVANI_MS", koy: "",
    bozdugu: "bir gun kapali sekme acilinca yuz siparislik ses" },
  { ad: "IZINSIZE SIPARIS AKISI", yon: "FAZLADAN", dosya: EYLEM,
    bul: `  if (!(await izinVarMi("satis.gor"))) return null;\n`, koy: "",
    bozdugu: "satis gorme izni olmayana siparis sayisi sizar" },
  { ad: "IPTAL DE SAYILIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "lte: simdi }, iptalTarihi: null }", koy: "lte: simdi } }",
    bozdugu: "iptal edilen siparis de kasa sesi calar" },
  { ad: "HATADA IMLEC ILERLIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "    return { sayi: 0, imlec: karar.imlec.toISOString() };", koy: "    return { sayi: 0, imlec: simdi.toISOString() };",
    bozdugu: "sayim dustugu dakikadaki siparisler sessizce kacar" },
  { ad: "SES KAPALIYKEN DE CALIYOR", yon: "FAZLADAN", dosya: BILESEN,
    bul: "if (cevap.sayi > 0 && tercihOku()) {", koy: "if (cevap.sayi > 0) {",
    bozdugu: "kullanici kapattigi halde ses calar" },
  { ad: "UST CUBUKTA YOK", yon: "KALDIRAN", dosya: "src/app/layout.tsx",
    bul: "                    <KasaSesi />\n", koy: "",
    bozdugu: "ozellik yazili ama hicbir sayfada calismaz" },
  { ad: "ETIKET OKUTMASI SESSIZ", yon: "KALDIRAN", dosya: PAKET,
    bul: `      tonCal(cevap.durum === "BULUNDU");\n`, koy: "",
    bozdugu: "yanlis etiket okutulunca uyari yok" },
  { ad: "FAZLADAN OKUTMA DOGRU SESI CALAR", yon: "FAZLADAN", dosya: PAKET,
    bul: "    tonCal(bulunan !== null && !fazladan);", koy: "    tonCal(bulunan !== null);",
    bozdugu: "fazla urun pakete girer, onay sesi yanilir" },
  { ad: "EKRAN PARLAMIYOR", yon: "KALDIRAN", dosya: SINYAL,
    bul: "  parla(sinyal);\n", koy: "",
    bozdugu: "yalniz ses kalir - gurultulu depoda gorulmez" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nOKUMA SİNYALİ + KASA SESİ — MUTASYON TURU\n");

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
  console.log("  OK  okuma sinyali + kasa sesi İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
