import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ÖDEME TAKİBİ — MUTASYON HARNESS'İ (K303, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run odeme-takibi-mutasyon:kontrol
 *
 *  `odeme-takibi:dogrula`nın dişini sınar. ZARARSIZ yeşil kalmalı; öteki her
 *  mutasyon KIRMIZI yanmalı. Harness mutasyonun UYGULANDIĞINI doğrular.
 * ============================================================================
 */

const BEKCI = "scripts/odeme-takibi-dogrula.ts";
const BEKCI_BASLIGI = "ÖDEME TAKİBİ BEKÇİSİ";
const GOVDE = "src/lib/odeme-takibi.ts";
const EYLEM = "src/app/bezirga/(ic)/firmalar/actions.ts";
const LISTE = "src/app/bezirga/(ic)/firmalar/page.tsx";
const KART = "src/app/bezirga/(ic)/firmalar/[id]/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: GOVDE,
    bul: "/** Saf — vadeye göre durum. Vade günü DAHİL zamanında; ertesi gün gecikmiş. */", koy: "/** Saf — vadeye göre durum (vade günü DAHİL zamanında, ertesi gün gecikmiş). */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "VADE GUNU GECIKMIS SAYILIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "  if (fark < 0) return { tur: \"GECIKTI\"", koy: "  if (fark <= 0) return { tur: \"GECIKTI\"",
    bozdugu: "vade gunu odeyen firma gecikmis gorunur" },
  { ad: "AY SONU KISILMIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "Math.min(vade.getUTCDate(), sonGun)", koy: "vade.getUTCDate()",
    bozdugu: "31 Ocak vadesi Mart'a tasar" },
  { ad: "ODEME VADEYI KAYDIRMIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "const vadeSonra = vadeOnce && f.aboneDonemi ? vadeyiIlerlet(vadeOnce, f.aboneDonemi) : vadeOnce;", koy: "const vadeSonra = vadeOnce;",
    bozdugu: "odeme alindi ama firma gecikmis gorunmeye devam eder" },
  { ad: "GELECEK TARIHLI ODEME GECIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (gun.getTime() > bugunIs(an).getTime()) return { durum: \"HATA\", hata: \"GUN_GELECEKTE\" };\n", koy: "",
    bozdugu: "gelmemis para deftere girer" },
  { ad: "TERS KAYIT VADEYI KOSULSUZ GERI ALIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "const vadeGeriAlindi = Boolean(k.vadeSonra && simdi && simdi.getTime() === k.vadeSonra.getTime());", koy: "const vadeGeriAlindi = Boolean(k.vadeSonra);",
    bozdugu: "eski odemenin ters kaydi sonraki odemenin vadesini siler" },
  { ad: "IKINCI KEZ DUZELTILEBILIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (k.duzeltme) return { durum: \"HATA\", hata: \"ZATEN_DUZELTILDI\" };\n", koy: "",
    bozdugu: "ayni odeme iki kez dusulur" },
  { ad: "TERS KAYIT DUZELTILEBILIYOR", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (k.duzeltilenId) return { durum: \"HATA\", hata: \"TERS_KAYIT_DUZELTILEMEZ\" };\n", koy: "",
    bozdugu: "tersin tersi zinciri; defter okunmaz olur" },
  { ad: "TERS KAYIT EKSI DEGIL", yon: "KALDIRAN", dosya: GOVDE,
    bul: "tutar: (-kurus(k.tutar) / 100).toFixed(2),", koy: "tutar: (kurus(k.tutar) / 100).toFixed(2),",
    bozdugu: "duzeltme toplami dusurmek yerine ikiye katlar" },
  { ad: "NEDENSIZ TERS KAYIT", yon: "KALDIRAN", dosya: GOVDE,
    bul: "  if (!neden) return { durum: \"HATA\", hata: \"ACIKLAMA_ZORUNLU\" };\n", koy: "",
    bozdugu: "uc ay sonra 'bu neden dusuldu' cevapsiz" },
  { ad: "TOPLAM KURUSLA DEGIL", yon: "FAZLADAN", dosya: GOVDE,
    bul: "(toplamKurus.get(s.paraBirimi) ?? 0) + kurus(s.tutar));", koy: "(toplamKurus.get(s.paraBirimi) ?? 0) + Number(s.tutar.toString()));",
    bozdugu: "toplam kayan nokta / birim hatasi tasir" },
  { ad: "ODEME KAYDI GUNCELLENIYOR", yon: "FAZLADAN", dosya: GOVDE,
    bul: "    // SISTEM: ödeme defteri — ters kayıt.\n    sistemPrisma.firmaOdemesi.create({",
    koy: "    // SISTEM: ödeme defteri — ters kayıt.\n    sistemPrisma.firmaOdemesi.update({ where: { id: k.id }, data: {} }),\n    sistemPrisma.firmaOdemesi.create({",
    bozdugu: "defter kaydi yerinde degisir" },
  { ad: "ODEME EYLEMI KAPISIZ", yon: "KALDIRAN", dosya: EYLEM,
    bul: "export async function odemeKaydetEylemi(_onceki: OdemeEylemDurumu, formData: FormData): Promise<OdemeEylemDurumu> {\n  const t = await getTranslations(\"Yonetim\");\n  const k = await yonetimEylemi();",
    koy: "export async function odemeKaydetEylemi(_onceki: OdemeEylemDurumu, formData: FormData): Promise<OdemeEylemDurumu> {\n  const t = await getTranslations(\"Yonetim\");\n  const k = { id: \"x\" };",
    bozdugu: "super admin olmayan biri odeme yazar" },
  { ad: "LISTE ROZETI VADEYI OKUMUYOR", yon: "KALDIRAN", dosya: LISTE,
    bul: "odemeDurumu(f.sonrakiOdemeGunu, bugun)", koy: "odemeDurumu(null, bugun)",
    bozdugu: "geciken firma listede gorunmez" },
  { ad: "KART ODEMELERI OKUMUYOR", yon: "KALDIRAN", dosya: KART,
    bul: "await firmaOdemeleri(kart.id)", koy: "{ satirlar: [], toplamlar: [] }",
    bozdugu: "kartta defter bos gorunur" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nÖDEME TAKİBİ — MUTASYON TURU\n");

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
  console.log("  OK  Ödeme takibi İKİ YÖNDEN sınandı, zararsız yeşil kaldı\n");
}
