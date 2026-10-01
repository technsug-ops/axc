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
const TY_COZ = "src/lib/kanal-gonderim-ty.ts";
const UC = "src/app/kart/[variantId]/uc-kanal-stok.tsx";
const SAYFA = "src/app/urunler/[id]/page.tsx";
const TY_PENCERE = "src/app/kart/[variantId]/ty-gonderim.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - yorum", yon: "ZARARSIZ", dosya: YAZICI,
    bul: "/** İki yükleme ucu — kapalı küme. Adres başka hiçbir yerden kurulamaz. */", koy: "/** İki yükleme ucu. */",
    bozdugu: "hicbir sey - YESIL kalmali" },
  { ad: "CANLI KILIDI KALKTI", yon: "KALDIRAN", dosya: YAZICI,
    /* 01.10.2026: kilit saf karara tasindi; bayrak acildi, mutasyon CAGRIYI siler. */
    bul: "  if (!hbYazmaAcikMi(k.ortam, HB_CANLI_YAZMA_ACIK)) return { tur: \"CANLI_KAPALI\" };\n", koy: "",
    bozdugu: "kilit bir gun kapatilsa bile canli HB magazasina stok/fiyat gider" },
  { ad: "KILIT KARARI HEP ACIK", yon: "FAZLADAN", dosya: YAZICI,
    bul: "  return ortam.toUpperCase() === \"TEST\" || canliAcik;", koy: "  return true || canliAcik || ortam === \"\";",
    bozdugu: "bayrak kapatilsa da canli magazaya yazilir - geri donus yolu calismaz" },
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
    bul: "kabulEdilenler.length > 0 && deneme < 5; deneme++", koy: "kabulEdilenler.length > 0 && deneme < 1; deneme++",
    bozdugu: "HB ~5-6 sn'de yansitiyor; tek okuma basariyi hep 'gorunmuyor' der" },
  /* ─── K169 TY sonuç okuması (01.10.2026) ─── */
  { ad: "TY: USTTEKI status GERI GELDI", yon: "KALDIRAN", dosya: EYLEM,
    bul: "sonucOkuma = batch.tur === \"VERI\" ? tyBatchCoz(batch.govde) :", koy: "sonucOkuma = batch.tur === \"VERI\" ? { durum: \"ISLEMDE\" as TyBatchDurumu, sebepler: [] } :",
    bozdugu: "TY isleseydi de ekran hep ISLEMDE der (olculen vaka)" },
  { ad: "TY: TEK SORGU", yon: "KALDIRAN", dosya: EYLEM,
    bul: "for (let deneme = 0; deneme < 5; deneme++) {", koy: "for (let deneme = 0; deneme < 1; deneme++) {",
    bozdugu: "TY birkac saniyede isliyor; tek sorgu basariyi hep 'isleniyor' gosterir" },
  { ad: "TY: FAILED BASARI SAYILIYOR", yon: "FAZLADAN", dosya: TY_COZ,
    bul: "  if (kalemler.some((k) => k.status === \"FAILED\")) return { durum: \"BASARISIZ\", sebepler };\n", koy: "",
    bozdugu: "reddedilen gonderim 'islendi' gorunur" },
  { ad: "TY: BOS LISTE BASARI", yon: "FAZLADAN", dosya: TY_COZ,
    bul: "  if (g.items.length === 0) return { durum: \"ISLEMDE\", sebepler: [] };\n", koy: "",
    bozdugu: "henuz islenmemis gonderim 'islendi' gorunur (every bos listede true)" },
  { ad: "TY: SEBEPLER GOSTERILMIYOR", yon: "KALDIRAN", dosya: TY_PENCERE,
    bul: "sonuc.sebepler.map(", koy: "[].map(",
    bozdugu: "kullanici neden reddedildigini goremez" },
  { ad: "TY: PENCERE SORMUYOR", yon: "KALDIRAN", dosya: TY_PENCERE,
    bul: "    sorguSn < SORGU_TAVANI_SN;", koy: "    sorguSn < 0;",
    bozdugu: "TY 12 sn'de bitirmiyor (olculdu); pencere hic sonuc gostermez" },
  { ad: "TY: SORGU SAHIPLIK KAPISI KALKTI", yon: "KALDIRAN", dosya: EYLEM,
    bul: "  if (!gonderim) return { tamam: false, kod: \"GONDERIM_YOK\" };", koy: "",
    bozdugu: "baska varyantin ya da uydurma kimligin sonucu sorgulanir ve ize yazilir" },
  { ad: "TY: SORGU KANALA YAZIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "  const batch = await gonderimSonucu(k, batchRequestId);", koy: "  await stokFiyatGonder(k, { barcode: \"x\", quantity: 0 });\n  const batch = await gonderimSonucu(k, batchRequestId);",
    bozdugu: "salt okuma sorgusu 5 sn'de bir kanala stok yazar" },
  { ad: "TY: SONUC IZI HER SORGUDA", yon: "FAZLADAN", dosya: EYLEM,
    bul: "    if (yazilmis === 0) {", koy: "    if (yazilmis >= 0) {",
    bozdugu: "her sorgu ayni sonucu tekrar ize yazar, sure olcumu kirlenir" },
  /* ─── Üç kanala stok — tek düğme (01.10.2026) ─── */
  { ad: "UC: TY'YE FIYAT GIDIYOR", yon: "FAZLADAN", dosya: UC,
    bul: "tyStokFiyatGonder(variantId, { stokGonder: true, fiyat: null })", koy: "tyStokFiyatGonder(variantId, { stokGonder: true, fiyat: 100 })",
    bozdugu: "tek dugme TY fiyatini ezer - Halil karari (fiyat kanal basina) cignenir" },
  { ad: "UC: HB KILIDI YOK SAYILIYOR", yon: "FAZLADAN", dosya: UC,
    bul: "    hb: o.hb.tamam && !o.hb.canliKapali,", koy: "    hb: o.hb.tamam,",
    bozdugu: "kilit kapaliyken HB'ye gonderilmeye calisilir" },
  { ad: "UC: ONIZLEMESIZ GONDER", yon: "FAZLADAN", dosya: UC,
    bul: "const gonderilebilir = onizleme !== null && hedefSayisi > 0;", koy: "const gonderilebilir = true;",
    bozdugu: "rakam gorulmeden gonderilir" },
  { ad: "UC: N11 DUSTU", yon: "KALDIRAN", dosya: UC,
    bul: "hedef.n11 ? n11StokFiyatGonder(variantId, { stokGonder: true, listeFiyati: null, satisFiyati: null }) : undefined,", koy: "undefined,",
    bozdugu: "N11 'ilan var' gorunur ama stok hic gitmez" },
  { ad: "UC: BIR YUZEYDE DUGME YOK", yon: "KALDIRAN", dosya: SAYFA,
    bul: "\n                      <UcKanalStokGonderim variantId={varyant.id} />", koy: "",
    bozdugu: "urun sayfasinin iki yuzeyinden birinde dugme gorunmez" },
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
