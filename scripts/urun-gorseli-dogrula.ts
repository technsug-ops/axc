/**
 * ============================================================================
 *  ÜRÜN GÖRSELİ BEKÇİSİ (K273) — `npm run urun-gorseli:dogrula`
 * ----------------------------------------------------------------------------
 *  Saf seçim kuralını DEĞERLE sınar (kaynak taramaz): kaynak sırası, sabitlik,
 *  kırıkta sıraya dönüş, bilinen kırık adresin geri gelmemesi, elle yüklenenin
 *  korunması, izinli sunucu kapısı ve küçük adres üretimi.
 * ============================================================================
 */
import { readFileSync } from "node:fs";

import {
  GORSEL_KAYNAKLARI,
  GORSEL_ONCELIGI,
  gorselAdresiGecerliMi,
  gorselKirikMi,
  gorselSec,
  kucukGorselAdresi,
  type MevcutGorsel,
} from "../src/lib/urun-gorseli";

let gecen = 0;
let kalan = 0;
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

const TY1 = "https://cdn.dsmcdn.com/ty1948/prod/a/1_org_zoom.jpg";
const TY2 = "https://cdn.dsmcdn.com/ty2000/prod/b/1_org_zoom.jpg";
const N1 = "https://n11scdn3.akamaized.net/a1/org/12/71/IMG-1.png";
const BOS: MevcutGorsel = { url: null, kaynak: null, kirikUrl: null };
const esit = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log("=".repeat(70));
console.log("ÜRÜN GÖRSELİ — SEÇİM KURALI (K273)");
console.log("=".repeat(70));

/* Taban dolu — `every`/boş küme tuzağına karşı. */
kontrol("kaynak tabanı DOLU (3) ve ELLE en öncelikli", GORSEL_KAYNAKLARI.length === 3 && GORSEL_ONCELIGI.ELLE === 0);
kontrol("  ...Trendyol N11'den önce (kullanıcının sırası)", GORSEL_ONCELIGI.TRENDYOL < GORSEL_ONCELIGI.N11);

/* Boş → aday yazılır; geçersiz adres yazılmaz. */
kontrol("görsel yoksa Trendyol adayı YAZILIR", esit(gorselSec(BOS, { url: TY1, kaynak: "TRENDYOL" }), { url: TY1, kaynak: "TRENDYOL" }));
kontrol("  ...N11 adayı da yazılır (hangisi varsa)", esit(gorselSec(BOS, { url: N1, kaynak: "N11" }), { url: N1, kaynak: "N11" }));
kontrol("izinsiz sunucu REDDEDİLİR", gorselSec(BOS, { url: "https://kotu.example.com/a.jpg", kaynak: "TRENDYOL" }) === null);
kontrol("  ...https olmayan reddedilir", gorselSec(BOS, { url: "http://cdn.dsmcdn.com/a.jpg", kaynak: "TRENDYOL" }) === null);
kontrol("  ...başka kaynağın sunucusu reddedilir (N11 adresi TY diye gelirse)", !gorselAdresiGecerliMi(N1, "TRENDYOL"));
kontrol("aday yoksa değişiklik YOK", gorselSec(BOS, null) === null);
kontrol("Trendyol'un XML entegratör sunucusu kabul (ölçülen 5 ürün)", gorselAdresiGecerliMi("https://cdn1.xmlbankasi.com/p1/x/a.jpg", "TRENDYOL"));
kontrol("  ...ama N11 için kabul DEĞİL (kaynak başına liste)", !gorselAdresiGecerliMi("https://cdn1.xmlbankasi.com/p1/x/a.jpg", "N11"));
kontrol("  ...ve küçültme öneki ona EKLENMEZ (yolu yok)", kucukGorselAdresi("https://cdn1.xmlbankasi.com/p1/x/a.jpg", "TRENDYOL") === "https://cdn1.xmlbankasi.com/p1/x/a.jpg");

/* Sabitlik ve yükseltme. */
const tyCalisan: MevcutGorsel = { url: TY1, kaynak: "TRENDYOL", kirikUrl: null };
const n11Calisan: MevcutGorsel = { url: N1, kaynak: "N11", kirikUrl: null };
kontrol("çalışan Trendyol görseli SABİT (aynı kaynağın yeni adresi değiştirmez)", gorselSec(tyCalisan, { url: TY2, kaynak: "TRENDYOL" }) === null);
kontrol("çalışan Trendyol, N11 adayıyla DÜŞÜRÜLMEZ", gorselSec(tyCalisan, { url: N1, kaynak: "N11" }) === null);
kontrol("çalışan N11, Trendyol adayıyla YÜKSELTİLİR", esit(gorselSec(n11Calisan, { url: TY1, kaynak: "TRENDYOL" }), { url: TY1, kaynak: "TRENDYOL" }));

/* Kırık → sıraya dönüş. */
const tyKirik: MevcutGorsel = { url: TY1, kaynak: "TRENDYOL", kirikUrl: TY1 };
kontrol("kırık tanınıyor (url = son kırık adres)", gorselKirikMi(tyKirik) && !gorselKirikMi(tyCalisan));
kontrol("kırık Trendyol → sıradaki kaynak (N11) yazılır", esit(gorselSec(tyKirik, { url: N1, kaynak: "N11" }), { url: N1, kaynak: "N11" }));
kontrol("  ...kırık Trendyol → Trendyol'un YENİ adresi de yazılır", esit(gorselSec(tyKirik, { url: TY2, kaynak: "TRENDYOL" }), { url: TY2, kaynak: "TRENDYOL" }));
/* K273 TASARIM BULGUSU: N11'e düştükten sonra Trendyol AYNI bozuk adresi yollarsa
   «öncelikli kaynak kazanır» kuralı onu geri getirmemeli. */
const n11KirikTyAnisiyla: MevcutGorsel = { url: N1, kaynak: "N11", kirikUrl: TY1 };
kontrol("bilinen kırık adres GERİ GELMEZ (öncelik kuralı onu kurtaramaz)", gorselSec(n11KirikTyAnisiyla, { url: TY1, kaynak: "TRENDYOL" }) === null);
kontrol("  ...ama Trendyol'un YENİ adresi yükseltir", esit(gorselSec(n11KirikTyAnisiyla, { url: TY2, kaynak: "TRENDYOL" }), { url: TY2, kaynak: "TRENDYOL" }));

/* Elle yüklenen korunur. */
const elle: MevcutGorsel = { url: "https://x/elle.jpg", kaynak: "ELLE", kirikUrl: null };
kontrol("elle yüklenen görsele senkron DOKUNMAZ", gorselSec(elle, { url: TY1, kaynak: "TRENDYOL" }) === null);
kontrol("  ...kırık olsa bile (kullanıcının işi, ekranda yer tutucu)", gorselSec({ ...elle, kirikUrl: elle.url }, { url: TY1, kaynak: "TRENDYOL" }) === null);

/* Küçük adres. */
kontrol("Trendyol küçük adresi CDN küçültme önekini alır (749 KB → 7,5 KB ölçüldü)",
  kucukGorselAdresi(TY1, "TRENDYOL") === "https://cdn.dsmcdn.com/mnresize/128/192/ty1948/prod/a/1_org_zoom.jpg");
kontrol("  ...önek İKİ KEZ eklenmez", kucukGorselAdresi(kucukGorselAdresi(TY1, "TRENDYOL"), "TRENDYOL") === kucukGorselAdresi(TY1, "TRENDYOL"));
kontrol("  ...N11 adresi aynen (küçültme yolu ölçüldü, çalışmıyor)", kucukGorselAdresi(N1, "N11") === N1);

/* ────────────────────────────────────────────────────────────────────────
   BAĞLANTI — saf kural doğru olsa da zincirin halkaları kopabilir
   (anayasa: "zincir, halkalarının varlığıyla değil bağlantısıyla sınanır").
   Kaynak YORUMSUZ taranır ve ölçüt ÇAĞRIYA bağlanır, ada değil.
   ──────────────────────────────────────────────────────────────────────── */
console.log("");
console.log("BAĞLANTI — senkron → yazıcı → ekran → kırık bildirimi");
function yorumsuz(kod: string): string {
  const blokYorumu = /\/\*[\s\S]*?\*\//g;
  const satirYorumu = /(^|[^:])\/\/[^\n]*/g;
  return kod.split("\r\n").join("\n").replace(blokYorumu, "").replace(satirYorumu, "$1");
}
const oku = (yol: string) => yorumsuz(readFileSync(yol, "utf8"));
const adet = (metin: string, desen: string) => metin.split(desen).length - 1;

/* ① Senkronlar yazıcıyı ÇAĞIRIYOR — kaynak etiketi doğru. */
for (const [yol, kaynak] of [
  ["scripts/canli-kanal-listeleme-yaz.ts", "TRENDYOL"],
  ["scripts/canli-n11-listeleme-yaz.ts", "N11"],
] as const) {
  const m = oku(yol);
  kontrol(`${yol.split("/").pop()} yazıcıyı çağırıyor`, adet(m, "gorsel = await gorselleriYaz(") === 1);
  kontrol(`  ...adaylar ${kaynak} etiketiyle`, adet(m, `kaynak: "${kaynak}" as const`) === 1);
}

/* ② Trendyol okuması görseli TAŞIYOR — üç kurucunun üçü de. */
const tyNormal = oku("scripts/ty/urun-v2.ts");
kontrol("TY: ana görsel `images[0]`'dan okunuyor", adet(tyNormal, "const gorselUrl = anaGorsel(ham);") === 1 && adet(tyNormal, "gorselUrl: anaGorsel(ham),") === 1);
kontrol("  ...onaylı ürünün iki dalı da görseli taşıyor", adet(tyNormal, "gorselUrl,\n") === 2);

/* ③ Yazıcı kararı SAF kuraldan alıyor ve tavanı uyguluyor. */
const yazici = oku("src/lib/urun-gorseli-yaz.ts");
kontrol("yazıcı kararı `gorselSec`ten alıyor", adet(yazici, "const secim = gorselSec(") === 1);
kontrol("  ...koşum başına tavan uygulanıyor", adet(yazici, "yazilacak.slice(0, GORSEL_YAZIM_TAVANI)") === 1);

/* ④ Ekran: kart başlığın solunda çiziyor; dört liste bileşeni kullanıyor. */
const kart = oku("src/components/liste-karti.tsx");
kontrol("liste kartı `gorsel` yuvasını ÇİZİYOR", adet(kart, "{gorsel}") === 1);
for (const [yol, masaustu, telefon] of [
  ["src/app/urunler/page.tsx", 1, 1],
  ["src/app/stok/page.tsx", 1, 1],
  ["src/app/satislar/page.tsx", 1, 1],
  ["src/app/alimlar/page.tsx", 1, 0], /* SatirKarti tek gövde: masaüstü + telefon */
] as const) {
  const m = oku(yol);
  const kartta = adet(m, "gorsel={<UrunGorseli ");
  const tumu = adet(m, "<UrunGorseli ");
  kontrol(`${yol.split("/")[2]}: küçük resim masaüstünde (${masaustu}) ve telefon kartında (${telefon})`,
    kartta === telefon && tumu - kartta === masaustu, { kartta, tumu });
}

/* ⑤ Bileşen küçük adresi kullanıyor ve kırığı bildiriyor. */
const bilesen = oku("src/components/urun-gorseli.tsx");
kontrol("bileşen KÜÇÜK adresi yüklüyor", adet(bilesen, "src={kucukGorselAdresi(url, kaynak)}") === 1);
const hataBlogu = bilesen.slice(bilesen.indexOf("onError={"));
kontrol("  ...açılmayan görseli sunucuya bildiriyor", bilesen.includes("onError={") && adet(hataBlogu, "void gorselKirikBildir(variantId)") === 1);

/* ⑥ Kırık bildirimi: AĞ HATASI kırık yazmaz (sağlam görsel kırık sanılırdı). */
const eylem = oku("src/app/gorsel-eylemleri.ts");
const iA = eylem.indexOf("yoklama hatası");
const iB = eylem.indexOf("if (acildi)");
const iC = eylem.indexOf("data: { gorselKirikUrl: v.gorselUrl }");
kontrol("kırık bildirimi: ağ hatası YAZMADAN döner", iA >= 0 && iB >= 0 && iA < iB && eylem.slice(iA, iB).includes('return { durum: "HATA" };'));
kontrol("  ...kırık ancak sunucu açılmadı derse yazılır", iB >= 0 && iC >= 0 && iB < iC && eylem.slice(iB, iC).includes('return { durum: "SAGLAM" };'));

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
