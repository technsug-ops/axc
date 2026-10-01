import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  K194-HB — HEPSİBURADA YAZMA — MUTASYON HARNESS'İ (01.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run hb-yazma-mutasyon:kontrol
 *
 *  ZARARSIZ yeşil kalmalı; öteki her mutasyon KIRMIZI yanmalı. Harness
 *  mutasyonun diske UYGULANDIĞINI doğrular, bekçinin başlığını görmeden
 *  «kırmızı» saymaz (çöken bekçi ölçüm değildir).
 * ============================================================================
 */

const BEKCI = "scripts/kanal-yazma-dogrula.ts";
const BEKCI_BASLIGI = "KANAL-YAZMA BEKÇİSİ";
const YAZICI = "scripts/hb/yazici.ts";
const HUKUM = "src/lib/kanal-gonderim-hb.ts";
const EYLEM = "src/app/kart/[variantId]/actions.ts";
const PENCERE = "src/app/kart/[variantId]/hb-gonderim.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: YAZICI,
    bul: "/** İki yükleme ucu — kapalı küme. Adres başka hiçbir yerden kurulamaz. */", koy: "/** İki yükleme ucu. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "CANLI KILIDI KALKTI", yon: "KALDIRAN", dosya: YAZICI,
    bul: "  if (k.ortam.toUpperCase() !== \"TEST\" && !HB_CANLI_YAZMA_ACIK) return { tur: \"CANLI_KAPALI\" };\n", koy: "",
    bozdugu: "onay verilmeden canli HB magazasina stok/fiyat gider" },
  { ad: "KURAL KAPISI KALKTI", yon: "KALDIRAN", dosya: YAZICI,
    bul: "  if (!kural.gecerli) return { tur: \"KURAL_IHLALI\", kod: kural.kod, mesaj: kural.mesaj };\n", koy: "",
    bozdugu: "bos ya da gecersiz kalem HB'ye gider" },
  { ad: "UC SERBEST PARAMETRE OLDU", yon: "FAZLADAN", dosya: YAZICI,
    bul: "/${YUKLEME_UCLARI[tur]}`", koy: "/${String(tur).toLowerCase()}-uploads`",
    bozdugu: "adres kapali kumeden cikar, tek uc taahhudu sozde kalir" },
  { ad: "ILK ILAN OKUNUYOR (suzgec yok sayilinca)", yon: "FAZLADAN", dosya: YAZICI,
    bul: "  const ilan = liste.find((x) => (x as { hepsiburadaSku?: unknown })?.hepsiburadaSku === hbSku) as", koy: "  const ilan = liste[0] as",
    bozdugu: "baska ilanin stogu dogrulama sanilir" },
  { ad: "STOK DURUMDAN BASARILI SAYILIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "const hukum = parcaHukmu(durum, p.gonderilen, kanaldaki(p.tur));", koy: "const hukum: ParcaHukmu = \"DOGRULANDI\";",
    bozdugu: "olmayan SKU'ya giden stok 'tamam' gorunur (HB hata vermiyor)" },
  { ad: "DONE BASARI SAYILIYOR", yon: "FAZLADAN", dosya: HUKUM,
    bul: "  return durum.durum === \"Done\" ? \"KANALDA_GORUNMUYOR\" : \"ISLENIYOR\";", koy: "  return durum.durum === \"Done\" ? \"DOGRULANDI\" : \"ISLENIYOR\";",
    bozdugu: "Done dendigi anda ilan eski fiyattayken 'tamam' denir (olculen vaka)" },
  { ad: "GERI OKUMA TEK DENEME", yon: "KALDIRAN", dosya: EYLEM,
    bul: "deneme < 5; deneme++", koy: "deneme < 1; deneme++",
    bozdugu: "HB ~5-6 sn'de yansitiyor; tek okuma basariyi hep 'gorunmuyor' der" },
  { ad: "FIYAT HATASI OKUNMUYOR", yon: "KALDIRAN", dosya: HUKUM,
    bul: "  if (durum && (durum.hatalar.length > 0 || durum.kilitler.length > 0)) return \"RED\";\n", koy: "",
    bozdugu: "reddedilen ya da kilitlenen fiyat basarili gorunur" },
  { ad: "CANLI KAPALIYKEN GONDER ACIK", yon: "FAZLADAN", dosya: PENCERE,
    bul: "onizleme?.tamam === true && !onizleme.canliKapali &&", koy: "onizleme?.tamam === true &&",
    bozdugu: "kullanici kapali kanala gonder'e basar, sebep yazmaz" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nHB YAZMA — MUTASYON TURU\n");

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
  console.log("  OK  HB yazma İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
