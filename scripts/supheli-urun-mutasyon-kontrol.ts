import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { dayanikliYaz, desenNormalle } from "./mutasyon-deseni";

/**
 * ============================================================================
 *  ŞÜPHELİ ÜRÜN — MUTASYON HARNESS'I (K284, 26.09.2026)
 * ----------------------------------------------------------------------------
 *      npm run supheli-urun-mutasyon:kontrol
 *  `supheli-urun:dogrula`nın dişini sınar. ÜÇ YÖN: zararsız · kaldıran ·
 *  fazladan. Çapası tutmayan mutasyon «ölçülemedi» sayılır, yeşil DEĞİL.
 * ============================================================================
 */

const BEKCI = "scripts/supheli-urun-dogrula.ts";
const BEKCI_BASLIGI = "ŞÜPHELİ ÜRÜN LİSTESİ";
const KURAL = "src/lib/supheli-urun.ts";
const VERI = "src/lib/supheli-urun-veri.ts";
const EYLEM = "src/app/urunler/supheli/eylemler.ts";
const LISTE = "src/lib/disa-aktarma/listeler.ts";
const URUNLER = "src/app/urunler/page.tsx";

type Mutasyon = { ad: string; yon: "ZARARSIZ" | "KALDIRAN" | "FAZLADAN"; dosya: string; bul: string; koy: string; bozdugu: string };

const MUTASYONLAR: Mutasyon[] = [
  { ad: "ZARARSIZ - kural yorumu degisti", yon: "ZARARSIZ", dosya: KURAL,
    bul: "/** GTIN kontrol hanesi (EAN-8 · UPC-A · EAN-13 · GTIN-14 — aynı algoritma). */", koy: "/** GTIN kontrol hanesi. */", bozdugu: "hicbir sey" },
  { ad: "KONTROL HANESI SORULMUYOR", yon: "FAZLADAN", dosya: KURAL,
    bul: "  return EAN_BICIMI.test(kod) && kontrolHanesiDogruMu(kod);", koy: "  return EAN_BICIMI.test(kod);", bozdugu: "yanlis yazilmis EAN gecerli sayilip urune yazilir" },
  { ad: "TY'DE BULUNAMAYAN EAN TEMIZ SAYILIYOR", yon: "KALDIRAN", dosya: KURAL,
    bul: '  if (!tyKategoriVar) return "TY_BULUNAMADI";\n', koy: "", bozdugu: "TY'de karsiligi olmayan urun listeden duser" },
  { ad: "SIFIR TAMAMLAMA KONTROLSUZ (uydurma EAN)", yon: "FAZLADAN", dosya: KURAL,
    bul: '      if (s.length < uzunluk && eanGecerliMi(s.padStart(uzunluk, "0"))) return s.padStart(uzunluk, "0");', koy: '      if (s.length < uzunluk) return s.padStart(uzunluk, "0");', bozdugu: "kisa sayi sifirla doldurulup EAN diye yazilir" },
  { ad: "CELISKI KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if (s.sizinMi === "HAYIR" && s.ean !== "") { hata("CELISKI", s.ean); continue; }\n', koy: "", bozdugu: "hem EAN hem «hayir» yazilan urun sessizce pasife alinir" },
  { ad: "GECERSIZ EAN KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if (!eanGecerliMi(s.ean)) { hata("GECERSIZ_EAN", s.ean); continue; }\n', koy: "", bozdugu: "kontrol hanesi tutmayan kod urune yazilir" },
  { ad: "EAN TEKRAR KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if ((eanSay.get(s.ean) ?? 0) > 1) { hata("EAN_TEKRAR", s.ean); continue; }\n', koy: "", bozdugu: "ayni EAN iki urune yazilmaya calisilir" },
  { ad: "EAN BASKA URUNDE KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if (sahip !== undefined && sahip !== s.kimlik) { hata("EAN_BASKA_URUNDE", s.ean); continue; }\n', koy: "", bozdugu: "baska urunun EAN'i ikinci urune yazilmaya calisilir" },
  { ad: "KIMLIK TEKRAR KAPISI KALKTI", yon: "FAZLADAN", dosya: KURAL,
    bul: '    if ((kimlikSay.get(s.kimlik) ?? 0) > 1) { hata("KIMLIK_TEKRAR"); continue; }\n', koy: "", bozdugu: "ayni urunun iki celisik satirindan biri sessizce kazanir" },
  { ad: "SAYI LISTEDEN FARKLI KOSULLA", yon: "FAZLADAN", dosya: VERI,
    bul: "    where: SUPHELI_ADAY_KOSULU,\n    select: { barcode: true", koy: "    where: { isActive: true },\n    select: { barcode: true", bozdugu: "Urunler sayfasindaki sayi listeyle ayrisir" },
  { ad: "IPTAL EDILMIS SATIS ISLEM SAYILIYOR", yon: "FAZLADAN", dosya: VERI,
    bul: "WHERE s.iptalTarihi IS NULL GROUP BY", koy: "GROUP BY", bozdugu: "iptal satisi olan urun «islem goruyor» diye one cikar" },
  { ad: "EXCEL BASKA GOVDEDEN", yon: "KALDIRAN", dosya: LISTE,
    bul: "(await supheliSatirlari()).map(", koy: "([] as Awaited<ReturnType<typeof supheliSatirlari>>).map(", bozdugu: "indirilen liste ekrandaki sayiyla ayrisir" },
  { ad: "EAN YAZIMI SARTSIZ", yon: "FAZLADAN", dosya: EYLEM,
    bul: "          where: { id: e.kimlik, barcode: e.eski },", koy: "          where: { id: e.kimlik },", bozdugu: "onizlemeden sonra degisen barkod ezilir" },
  { ad: "ESKI DEGER IZE YAZILMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "JSON.stringify({ eski: e.eski, yeni: e.yeni })", koy: "JSON.stringify({ yeni: e.yeni })", bozdugu: "geri alma ve teshis icin eski barkod kaybolur" },
  { ad: "UYGULA IZIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: 'Promise<UygulamaSonucu> {\n  try {\n    /* İzin eylemin KENDİ gövdesinde (yetki bekçisi yardımcıya gizlenmiş kontrolü göremez). */\n    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };\n',
    koy: 'Promise<UygulamaSonucu> {\n  try {\n', bozdugu: "urun yetkisi olmayan barkod yazar / urun pasife alir" },
  { ad: "ONIZLEME IZIN SORMUYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: 'Promise<OnizlemeSonucu> {\n  try {\n    /* İzin eylemin KENDİ gövdesinde (yetki bekçisi yardımcıya gizlenmiş kontrolü göremez). */\n    if (!(await izinVarMi("urun.yaz"))) return { tamam: false, hata: "YETKISIZ" };\n',
    koy: 'Promise<OnizlemeSonucu> {\n  try {\n', bozdugu: "yetkisiz kullanici urun/barkod bilgisini okur" },
  { ad: "ONIZLEME YAZIYOR", yon: "FAZLADAN", dosya: EYLEM,
    bul: "    const gosterilen = plan.hatalar.slice(0, HATA_GOSTERIM_TAVANI);", koy: "    await prisma.productVariant.updateMany({ where: { id: \"x\" }, data: {} });\n    const gosterilen = plan.hatalar.slice(0, HATA_GOSTERIM_TAVANI);", bozdugu: "onaysiz yazim - Ilke #6 kirilir" },
  { ad: "AKTIF VARYANTI KALMAYAN URUN PASIFE ALINMIYOR", yon: "KALDIRAN", dosya: EYLEM,
    bul: "      if (aktif > 0) continue;", koy: "      continue;", bozdugu: "tum varyantlari pasif urun listelerde kalir" },
  { ad: "URUNLER BAGLANTISI BASKA SAYACTAN", yon: "KALDIRAN", dosya: URUNLER,
    bul: "resimEkleyebilir ? await supheliSayisi() : null", koy: "resimEkleyebilir ? 0 : null", bozdugu: "supheli urun varken baglanti 0 der" },
];

function bekciyiKostur(): { kod: number; ciktiVar: boolean } {
  const r = spawnSync("npx tsx " + BEKCI, { shell: true, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
  const cikti = (r.stdout ?? "") + (r.stderr ?? "");
  return { kod: r.status ?? 1, ciktiVar: cikti.includes(BEKCI_BASLIGI) };
}

console.log("\nSUPHELI URUN - MUTASYON TURU (K284)\n");
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
else console.log("\n  OK  Supheli urun listesi UC YONDEN sinandi, kirmizi yandigi GORULDU.\n");
