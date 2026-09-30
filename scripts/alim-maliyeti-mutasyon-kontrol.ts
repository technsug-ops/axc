import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ALIM FATURA YAPISI — MUTASYON HARNESS'İ (K309)
 * ----------------------------------------------------------------------------
 *      npm run alim-maliyeti-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/alim-maliyeti-dogrula.ts";
const BEKCI_BASLIGI = "ALIM FATURA YAPISI BEKÇİSİ";
const GOVDE = "src/lib/alim-maliyeti.ts";
const FATURA = "src/lib/alim-fatura.ts";
const MALKABUL = "src/app/alimlar/[id]/mal-kabul/actions.ts";
const ALIM = "src/app/alimlar/actions.ts";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: " *  ALIMIN GERÇEK MALİYETİ — TEK GÖVDE (K309, kullanıcı kararı 30.09.2026)", koy: " *  ALIMIN GERÇEK MALİYETİ — TEK GÖVDE (K309, kullanıcı kararı 30.09.2026) zararsiz",
    bozdugu: "" },
  { ad: "DAHIL ALIMDA KDV YINE EKLENIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  const kdv = f.fiyatKdvDahil ? 0 : pozitif(f.kdv);", koy: "  const kdv = pozitif(f.kdv);",
    bozdugu: "fiyatin icindeki KDV ikinci kez maliyete ve karta yazilir" },
  { ad: "GUMRUK KARTA YAZILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    kartEki: kdv + kargo,", koy: "    kartEki: kdv + kargo + gumruk,",
    bozdugu: "gumrukte odenen para kart borcu sanilir" },
  { ad: "KARISIK PARA KILIDI KALKTI", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (new Set(kalemler.map((k) => k.paraBirimi)).size > 1) return { durum: \"KARISIK_PARA\", birim: girilen };", koy: "",
    bozdugu: "TL eki EUR kaleme dagitilir (kur cevrilmeden)" },
  { ad: "ORAN YERINE ESIT DAGITIM", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    const pay = (maliyetEki * (k.birim * k.adet)) / toplam;", koy: "    const pay = maliyetEki / kalemler.length;",
    bozdugu: "ucuz kaleme pahali kalemin kargosu yuklenir" },
  { ad: "MAL KABUL FATURA FIYATI YAZIYOR", yon: "KALDIRAN", dosya: MALKABUL,
    bul: "              unitCostAmount: hareketMaliyeti(kalem),", koy: "              unitCostAmount: kalem.unitCostAmount,",
    bozdugu: "kargo/gumruk/KDV stok maliyetine hic girmez, kar sisik cikar" },
  { ad: "ALAN YOK HAYIR SAYILIYOR", yon: "FAZLADAN", dosya: FATURA,
    bul: "  if (deger === null) return undefined;", koy: "  if (deger === null) return false;",
    bozdugu: "kutuyu cizmeyen form butun tedarikcileri KDV haric yapar" },
  { ad: "KDV TUTARI ZORUNLULUGU KALKTI", yon: "KALDIRAN", dosya: ALIM,
    bul: "  if (!veri.fiyatKdvDahil && veri.kdv === null) h.push(t(\"kdvTutariZorunlu\"));", koy: "",
    bozdugu: "haric alim KDV'siz kaydedilir, maliyet ve kart eksik" },
  { ad: "DUZENLEMEDE INIS MALIYETI YAZILMIYOR", yon: "KALDIRAN", dosya: ALIM,
    bul: "              unitCostAmount: String(yeniMaliyet),", koy: "              unitCostAmount: String(yeni.unitCostAmount),",
    bozdugu: "sonradan girilen kargo/KDV stoktaki maliyete ulasmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nALIM FATURA YAPISI — MUTASYON TURU\n");

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
  console.log("  OK  alım fatura yapısı İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
