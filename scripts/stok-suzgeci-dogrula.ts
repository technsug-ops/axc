import { kaynakOku } from "./kaynak-oku";
import { stokluUrunleriSec, stokSuzgeciCoz } from "../src/lib/stok";

/**
 * ============================================================================
 *  ÜRÜN LİSTESİ STOK SÜZGECİ BEKÇİSİ (07.10.2026) — `npm run stok-suzgeci:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği: «stok olmayan ürünleri gösterme butonu olsun».
 *  ① KURAL — «stokta» = ürünün TOPLAM stoğu > 0 (listedeki «Toplam stok»
 *     sütunuyla aynı ölçü), değerle; ayrımın iki yakası: eksi varyant artıyı
 *     sıfırlıyor · sıfır · hareketsiz.
 *  ② ZİNCİR — liste ve Excel AYNI gövdeden süzer; süzgeç arama/sayfalama/Excel
 *     adreslerinde TAŞINIR (sayı = liste = dosya).
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const oku = (y: string) => yorumsuz(kaynakOku(y));

console.log("=".repeat(70));
console.log("ÜRÜN LİSTESİ STOK SÜZGECİ (07.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  const urunu = new Map([["v1", "A"], ["v2", "A"], ["v3", "B"], ["v4", "C"], ["v5", "D"]]);
  const secilen = stokluUrunleriSec(
    [
      { variantId: "v1", toplam: 3 }, { variantId: "v2", toplam: -3 }, // A: toplam 0 → stoksuz
      { variantId: "v3", toplam: 2 }, // B: stoklu
      { variantId: "v4", toplam: 0 }, // C: sıfır → stoksuz
      { variantId: "v5", toplam: 1 }, { variantId: "vX", toplam: 9 }, // D stoklu; vX ürünsüz → atlanır
    ],
    urunu,
  );
  kontrol("yalnız TOPLAM stoğu > 0 olan ürünler", JSON.stringify([...secilen].sort()) === JSON.stringify(["B", "D"]), secilen);
  kontrol("  ...eksi varyant artı kardeşini sıfırlarsa ürün STOKSUZ (sütunla aynı ölçü)", !secilen.includes("A"));
  kontrol("adres değeri yalnız «var»", stokSuzgeciCoz("var") && !stokSuzgeciCoz("1") && !stokSuzgeciCoz(undefined));
  kosanBolumler.push("kural");
}

console.log("\n2) zincir — liste · Excel · adres");
{
  const liste = oku("src/app/urunler/page.tsx");
  kontrol("liste koşulu stoklu kimliklerden (ortak gövde)",
    /const stokKosulu = yalnizStoklu \? \{ id: \{ in: await stokluUrunIdleri\(\) \} \} : \{\};/.test(liste) &&
      /* 09.10.2026: koşula ABC süzgeci eklendi (`abcKosulu`) — ölçüt eskidi, niyet aynı. */
      /const kosul = \{ AND: \[suzgecArama \?\? \{\}, tyKategori \? tyKategoriUrunKosulu\(tyKategori\) : \{\}, stokKosulu, abcKosulu\] \};/.test(liste));
  kontrol("  ...sayım da AYNI koşulla (sayı = liste)", /prisma\.product\.count\(\{ where: kosul \}\)/.test(liste));
  kontrol("  ...Excel ve sayfalama süzgeci taşır", (liste.match(/parametreler=\{tasinan\}/g) ?? []).length === 2 &&
    /\[STOK_PARAMETRESI\]: yalnizStoklu \? "var" : undefined,/.test(liste));
  kontrol("  ...yeni arama süzgeci kaybetmez", /\.\.\.\(yalnizStoklu \? \{ \[STOK_PARAMETRESI\]: "var" \} : \{\}\),/.test(liste));
  kontrol("  ...düğme durumu söyler (açıkken «göster»)", /yalnizStoklu \? t\("stoksuzlarGizli"\) : t\("stoksuzlariGizle"\)/.test(liste));
  const excel = oku("src/lib/disa-aktarma/listeler.ts");
  kontrol("Excel AYNI gövdeden süzer", /stokSuzgeciCoz\(p\[STOK_PARAMETRESI\]\) \? \{ id: \{ in: await stokluUrunIdleri\(\) \} \} : \{\}/.test(excel));
  kosanBolumler.push("zincir");
}

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
