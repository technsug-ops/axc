/**
 * ============================================================================
 *  ROL FORMU BEKÇİSİ — yeni rol eklenince form boşalıyor ve onay çıkıyor mu
 *  Çalıştırmak için: npm run rol-formu:dogrula
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA (04.10.2026, canlıda Halil testi): «Halil» rolü eklendi, ama
 *  `rolEkle` başarıda `{}` dönüyordu — yeşil onay YOK (İlke #5), ad ve
 *  işaretli kutular formda KALIYOR; rol eklenmemiş gibi görünüyordu.
 *
 *  Karar SAF GÖVDEDE (`rolEklendiMi`) ve DEĞERİYLE sınanır. Kaynak taraması
 *  yalnız gövdeye taşınamayan iki halka için: sunucunun başarı dönüşü ve
 *  formun o kararı kullandığı çağrı satırları (yorumsuz kodda, kullanım
 *  bloğuna bağlı, sayarak).
 *
 *  Bölümler (sayaçlı — biri koşmazsa sonuç GEÇERSİZ):
 *   1) saf karar: yalnız başarı «eklendi» sayılır (iki yön)
 *   2) sunucu: rolEkle başarıda eklenen adı döner
 *   3) form: başarıda boşalır + ortak bildirimi tetikler; hatada dokunmaz
 * ============================================================================
 */
import { rolEklendiMi } from "../src/app/ayarlar/roller/rol-formu-durumu";
import { kaynakOku } from "./kaynak-oku";

const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];
let hata = 0;
function olc(ad: string, kosul: boolean, ayrinti = "") {
  if (kosul) console.log(`  OK  ${ad}`);
  else {
    hata++;
    console.log(`  ⛔  ${ad}${ayrinti ? ` — ${ayrinti}` : ""}`);
  }
}
const yorumsuz = (yol: string) =>
  kaynakOku(yol)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const say = (metin: string, desen: RegExp) => (metin.match(desen) ?? []).length;

/* 1) Saf karar — iki yön */
console.log("1) saf karar (rolEklendiMi)");
olc("başlangıç {} → eklendi DEĞİL", rolEklendiMi({}) === false);
olc("hata → eklendi DEĞİL (form dolu kalır)", rolEklendiMi({ hatalar: ["x"] }) === false);
olc("hata + ad birlikte → eklendi DEĞİL", rolEklendiMi({ hatalar: ["x"], eklenen: "Halil" }) === false);
olc("boş ad → eklendi DEĞİL", rolEklendiMi({ eklenen: "" }) === false);
olc("başarı → eklendi", rolEklendiMi({ eklenen: "Halil" }) === true);
olc("başarı + boş hata listesi → eklendi", rolEklendiMi({ hatalar: [], eklenen: "Halil" }) === true);
kosanBolumler.push("saf karar");

/* 2) Sunucunun başarı dönüşü — rolEkle bloğuna daraltılmış */
console.log("2) sunucu başarı dönüşü");
const eylem = yorumsuz("src/app/ayarlar/roller/actions.ts");
const bas = eylem.indexOf("export async function rolEkle(");
const son = eylem.indexOf("export async function", bas + 1);
olc("rolEkle bloğu bulundu", bas >= 0 && son > bas, `bas=${bas} son=${son}`);
const rolEkleBlogu = bas >= 0 && son > bas ? eylem.slice(bas, son) : "";
olc(
  "başarı yolu tazeler ve eklenen adı döner",
  say(rolEkleBlogu, /tazele\(\);\s*return \{ eklenen: cozum\.data\.name \};/g) === 1,
);
olc("rolEkle başka hiçbir yerde boş {} dönmüyor", say(rolEkleBlogu, /return \{\s*\};/g) === 0);
olc("eklenen yalnız rolEkle'den döner", say(eylem, /eklenen:/g) === 1);
kosanBolumler.push("sunucu");

/* 3) Form — kararı kullanan çağrı satırları */
console.log("3) form davranışı");
const form = yorumsuz("src/app/ayarlar/roller/rol-formu.tsx");
olc("karar saf gövdeden içeri alınıyor", say(form, /import \{ rolEklendiMi \} from "\.\/rol-formu-durumu";/g) === 1);
olc(
  "başarıda ad ve kutular boşalıyor (karara bağlı)",
  say(form, /if \(rolEklendiMi\(durum\)\) \{\s*setAd\(""\);\s*setSecili\(new Set\(\)\);\s*\}/g) === 1,
);
// Fazladan yön: koşulsuz/ikinci bir boşaltma hatada da formu silerdi.
olc("ad yalnız o tek yerde boşaltılıyor", say(form, /setAd\(""\)/g) === 1);
olc("kutular yalnız o tek yerde boşaltılıyor", say(form, /setSecili\(new Set\(\)\)/g) === 1);
olc(
  "başarıda ortak yeşil bildirim tetikleniyor",
  say(form, /if \(rolEklendiMi\(durum\)\) router\.replace\(basariAdresi\(yol, "eklendi"\)/g) === 1,
);
olc("ad alanı kontrollü (boşaltma ekrana ulaşır)", say(form, /name="name"\s*value=\{ad\}\s*onChange=\{\(e\) => setAd\(e\.target\.value\)\}/g) === 1);
kosanBolumler.push("form");

if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`\n⛔ KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
console.log(hata === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n⛔ ${hata} KONTROL KIRMIZI`);
process.exit(hata === 0 ? 0 : 1);
