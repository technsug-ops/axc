import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  TAKİPÇİ KUPONU — MUTASYON HARNESS'İ (K19-②)
 * ----------------------------------------------------------------------------
 *      npm run kupon-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/kupon-dogrula.ts";
const BEKCI_BASLIGI = "TAKİPÇİ KUPONU BEKÇİSİ";
const KUPON = "src/lib/fiyatlama/kupon.ts";
const EKRAN = "src/app/kart/[variantId]/fiyat-dene.tsx";
const SOZLUK = "messages/tr.json";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: KUPON,
    bul: " *  TAKİPÇİ KUPONU — FİYAT DENEMESİNDE (K19-②, 30.09.2026)", koy: " *  TAKİPÇİ KUPONU — FİYAT DENEMESİNDE (K19-②, 30.09.2026) zararsiz",
    bozdugu: "" },
  { ad: "KUPON FIYATTAN DUSULMUYOR", yon: "KALDIRAN", dosya: KUPON,
    bul: "hedefFiyat: girdi.hedefFiyat - kupon", koy: "hedefFiyat: girdi.hedefFiyat",
    bozdugu: "kuponlu NET kuponsuzla ayni cikar, kupon maliyeti gorunmez" },
  { ad: "FIYATTAN BUYUK KUPON HESAPLANIYOR", yon: "FAZLADAN", dosya: KUPON,
    bul: "kupon >= girdi.hedefFiyat", koy: "kupon > girdi.hedefFiyat * 2",
    bozdugu: "anlamsiz (eksi fiyatli) bir hesap ekrana basilir" },
  { ad: "DILIM DEGISIMI SUSTURULDU", yon: "KALDIRAN", dosya: KUPON,
    bul: "    dilimDegisti: (sonuc.dilim?.sira ?? null) !== (kuponsuz.dilim?.sira ?? null),", koy: "    dilimDegisti: false,",
    bozdugu: "olculmemis bir varsayim sessizce kullanilir" },
  { ad: "KUPONLU SATIR CIZILMIYOR", yon: "KALDIRAN", dosya: EKRAN,
    bul: "                {kuponlu !== null ? (", koy: "                {false ? (",
    bozdugu: "alan var, sonuc ekrana ulasmiyor" },
  { ad: "DILIM UYARISI CIZILMIYOR", yon: "KALDIRAN", dosya: EKRAN,
    bul: "                    {kuponlu.dilimDegisti ? (", koy: "                    {false ? (",
    bozdugu: "govde soyluyor, ekran susuyor" },
  { ad: "YER TUTUCU DEGER GIBI", yon: "FAZLADAN", dosya: SOZLUK,
    bul: "\"deneKuponIpucu\": \"örn. 15\"", koy: "\"deneKuponIpucu\": \"15\"",
    bozdugu: "gri 15 girilmis deger sanilir (Ilke #11 vakasi)" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nTAKİPÇİ KUPONU — MUTASYON TURU\n");

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
  console.log("  OK  takipçi kuponu İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
