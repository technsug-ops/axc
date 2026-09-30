import { kdvAyir } from "../src/lib/kar";
import { IADE_PARA_KODLARI, iadeEtkisiHesapla, iadeParaFarki, iadeParaSatirlari } from "../src/lib/iade";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  İADE DÜZENLEME BEKÇİSİ (K44 · 1. adım) — `npm run iade-duzenle:dogrula`
 * ----------------------------------------------------------------------------
 *  ① DEĞER — kâr farkı gövdesi çağrılır: kargo KDV'si NET-2'ye farkla
 *     yansır, ceza KDV'siz, değişmeyen para farksız; iade hesabı AYNI
 *     gövdeyi kullanır (iki yerde iki kural olmaz).
 *  ② GÖVDE — «stoğa dokunmuyor» İDDİASI sınanır (anayasa: dokunmuyor iddiası
 *     da bir davranıştır); şartlı yazım; yalnız genel para satırları yeniden
 *     yazılır; dönem kapısı yalnız para değişince; hasar notu zorunlu; iz.
 *  ③ EKRAN — satış detayındaki her iadede görünür «Düzenle».
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen));
  }
}
const yorumsuz = (m: string) =>
  m.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
const yakin = (a: number, b: number) => Math.abs(a - b) < 1e-9;

console.log("=".repeat(70));
console.log("İADE DÜZENLEME BEKÇİSİ (K44)");
console.log("=".repeat(70));

console.log("\n1) değer — kâr farkı");
{
  const bos = { iadeKargosu: null, yenidenGonderimKargosu: null, ceza: null };
  const a = iadeParaFarki({ ...bos, iadeKargosu: 100 }, { ...bos, iadeKargosu: 150 });
  kontrol("kargo 100→150: NET-1 −50", yakin(a.net1Farki, -50), a);
  kontrol("  ...NET-2 = NET-1 + kargo KDV farkı (KDV dahil tutardan)", yakin(a.net2Farki, -50 + kdvAyir(150, 20) - kdvAyir(100, 20)), a);
  const c = iadeParaFarki(bos, { ...bos, ceza: 100 });
  kontrol("ceza 0→100: NET-1 ve NET-2 −100 (ceza KDV'siz)", yakin(c.net1Farki, -100) && yakin(c.net2Farki, -100), c);
  const d = iadeParaFarki({ ...bos, iadeKargosu: 80, ceza: 40 }, { ...bos, iadeKargosu: 80, ceza: 40 });
  kontrol("para değişmediyse fark SIFIR", d.net1Farki === 0 && d.net2Farki === 0, d);
  const e = iadeParaFarki({ ...bos, iadeKargosu: 80 }, bos);
  kontrol("tutar boşaltılınca satır KALKAR, NET-1 geri gelir", e.yeniSatirlar.length === 0 && yakin(e.net1Farki, 80), e);
  const s = iadeParaSatirlari({ iadeKargosu: 10, yenidenGonderimKargosu: 20, ceza: 30 });
  kontrol("üretilen kodlar düzenlemenin sildiği kümenin İÇİNDE", s.satirlar.every((x) => (IADE_PARA_KODLARI as readonly string[]).includes(x.code)), s);

  const h = iadeEtkisiHesapla({
    returnType: "NORMAL",
    kalemler: [],
    odemeGideri: 0,
    siparisToplami: 0,
    iadeKargosu: 60,
    yenidenGonderimKargosu: 24,
    ceza: 15,
    tazminatTahsilati: null,
  });
  kontrol("iade hesabı genel satırları AYNI gövdeden üretir", JSON.stringify(h.genelSatirlar) === JSON.stringify(iadeParaSatirlari({ iadeKargosu: 60, yenidenGonderimKargosu: 24, ceza: 15 }).satirlar), h.genelSatirlar);
  const iadeKaynak = yorumsuz(kaynakOku("src/lib/iade.ts"));
  kontrol("  ...iade hesabı gövdeyi ÇAĞIRIYOR, satırı elle kurmuyor", /iadeParaSatirlari\(girdi\)/.test(iadeKaynak) && (iadeKaynak.match(/code: "IADE_KARGO"/g) ?? []).length === 1);
}
kosanBolumler.push("değer");

console.log("\n2) gövde — lib/iade-duzenle.ts");
{
  const g = yorumsuz(kaynakOku("src/lib/iade-duzenle.ts"));
  kontrol("stok defterine DOKUNMUYOR (stockMovement yok)", !/stockMovement/.test(g));
  kontrol("şartlı yazım: okunan updatedAt hâlâ yerindeyse", /tx\.return\.updateMany\(\{\s*where: \{ id: girdi\.returnId, updatedAt: iade\.updatedAt \}/.test(g));
  kontrol("  ...form açıldıktan sonra değişmişse yazmaz", /iade\.updatedAt\.toISOString\(\) !== girdi\.beklenenGuncelleme\) return \{ durum: "DEGISMIS"/.test(g));
  kontrol("yalnız GENEL para satırları silinip yeniden yazılır (kalem · tazminat korunur)", /returnFee\.deleteMany\(\{\s*where: \{ returnId: girdi\.returnId, returnItemId: null, code: \{ in: \[\.\.\.IADE_PARA_KODLARI\] \} \}/.test(g));
  kontrol("dönem kapısı YALNIZ para değişince sorulur", /if \(paraDegisti\) \{\s*const kapi = await donemKapisi\(/.test(g));
  kontrol("hasarlı kalemde hasar notu zorunlu", /if \(k\.damagedQuantity > 0 && yeniNot === null\) \{\s*return \{ durum: "HASAR_NOTU_ZORUNLU"/.test(g));
  kontrol("eksi tutar reddedilir", /x !== null && x < 0\)\) \{\s*return \{ durum: "EKSI_TUTAR" \}/.test(g));
  kontrol("iz: eski ve yeni değer birlikte", /action: IADE_DUZENLENDI_EYLEMI[\s\S]{0,200}detail: JSON\.stringify\(\{\s*eski,\s*yeni,/.test(g));
}
kosanBolumler.push("gövde");

console.log("\n3) ekran");
{
  const b = yorumsuz(kaynakOku("src/components/iade-blogu.tsx"));
  kontrol("her iadede görünür «Düzenle» (izin varsa)", /duzenlenebilir \? \([\s\S]{0,300}href=\{`\/satislar\/\$\{saleId\}\/iade\/\$\{iade\.id\}\/duzenle`\}/.test(b));
  const s = yorumsuz(kaynakOku("src/app/satislar/[id]/page.tsx"));
  kontrol("satış detayı düzenleme iznini İZİNDEN okuyor", /duzenlenebilir=\{await izinVarMi\("iade\.yaz"\)\}/.test(s));
  const sayfa = yorumsuz(kaynakOku("src/app/satislar/[id]/iade/[iadeId]/duzenle/page.tsx"));
  const g2 = yorumsuz(kaynakOku("src/lib/iade-duzenle.ts"));
  /* K44 ②: ölçüt ESKİDİ, gevşemedi — kapı geri alınmış iadeyi de kapatıyor.
     Eski biçim: if (!iade || iade.saleId !== id) notFound(); */
  kontrol("düzenleme sayfası izinle korunuyor, başka satışın ve GERİ ALINMIŞ iadeyi açmıyor", /await sayfaIzni\("iade\.yaz"\)/.test(sayfa) && /if \(!iade \|\| iade\.saleId !== id \|\| iade\.geriAlindiAt !== null\) notFound\(\);/.test(sayfa));
  kontrol("  ...gövde de geri alınmış iadeyi düzenlemiyor", /if \(!iade \|\| iade\.geriAlindiAt !== null\) return \{ durum: "YOK" as const \};/.test(g2));
}
kosanBolumler.push("ekran");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
