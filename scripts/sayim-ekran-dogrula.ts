import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  SAYIM EKRANI BEKÇİSİ (K57) — PROSEDÜRÜN EKRANDAKİ KARŞILIĞI
 * ----------------------------------------------------------------------------
 *      npm run sayim-ekran:dogrula
 *
 *  ⚠ HESAP KURALLARI BURADA DEĞİL: onları `sayim:dogrula` DEĞER TESTİYLE
 *  ölçüyor (80 ölçüt) ve `sayim-mutasyon:kontrol` iki yönden sınıyor.
 *  Bu bekçi yalnız **ekran–gövde BAĞLARINI** ölçüyor: kural doğru olsa bile
 *  ekran onu çağırmıyorsa kullanıcıya ulaşmaz.
 *
 *  _(Anayasa: "saf hesap katmanı desen tarayan bekçiye muhtaç olmaz" — sıra
 *  ① saf gövdeye taşı ② değer testi ③ taşınmayan BAĞ için desen tara.)_
 *
 *  ⚠ HER ÖLÇÜT KULLANIM BLOĞUNA DARALTILIR ve YORUMSUZ kodda aranır.
 * ============================================================================
 */

let gecen = 0;
const dusen: string[] = [];

function kontrol(ad: string, kosul: boolean, ipucu?: string) {
  if (kosul) gecen++;
  else dusen.push(ad + (ipucu ? "\n       " + ipucu : ""));
}

/** ⚠ Bir kuralı ANLATAN yorum, o kuralı UYGULAMIŞ sayılmaz. */
function oku(yol: string): string {
  return readFileSync(yol, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ")
    .replaceAll("\r\n", "\n");
}

function blok(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  return i === -1 ? "" : metin.slice(i, i + uzunluk);
}

const eylem = oku("src/app/okut/sayim-actions.ts");
const kip = oku("src/app/okut/sayim-kipi.tsx");
const kamera = oku("src/components/barkod-okuyucu.tsx");
const bolum = oku("src/app/okut/sayim-bolumu.tsx");

console.log("\nSAYIM EKRANI BEKÇİSİ (K57)\n");

// ═══════════════════════════════════════════════════════════════════════════
//  ① ANINDA KAYIT — toplu yazım yolu AÇILMAZ
// ═══════════════════════════════════════════════════════════════════════════
//  Sayım TAM GÜN sürüyor; ara kaçınılmaz. Toplu yazım seçilseydi telefonun
//  uykuya geçmesi ya da uygulamanın kapanması günün tamamını silerdi.

/**
 * ⚠ PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ: yorumsuz gövde 1740 karakter
 * (`sayimaOkut` → `sayimiKapat` arası). İlk yazımda 2600 verilmişti ve
 * pencere BİR SONRAKİ fonksiyona taştı — `okutulmayanlariCevapla`daki
 * meşru `updateMany`yi görüp "toplu yazım var" diye kırmızı yandı.
 * ⛔ Dar pencere kör eder, geniş pencere YANLIŞ YANAR; ikisi de ölçümle
 * kapanır. Gövde büyürse bu sayı yeniden ölçülür.
 */
const okutBlok = blok(eylem, "export async function sayimaOkut", 1740);
kontrol("① okuma eylemi bulundu", okutBlok !== "");
kontrol(
  "① her okuma ANINDA yazılıyor (update ya da create)",
  /prisma\.stokSayimSatiri\.update\(/.test(okutBlok) &&
    /prisma\.stokSayimSatiri\.create\(/.test(okutBlok),
  "okuma tek satır yazmıyor — toplu yazım yolu açılmış olabilir",
);
kontrol(
  "① toplu yazım (createMany/updateMany) okuma yolunda YOK",
  !/createMany|updateMany/.test(okutBlok),
  "toplu yazım, ara verildiğinde günün tamamını riske atar",
);
kontrol(
  "① ekran okumayı sunucuya GÖNDERİYOR (yerelde biriktirmiyor)",
  /await sayimaOkut\(sayimId, ham\)/.test(kip),
  "okuma yerelde birikiyor olabilir — kapanan uygulama onu götürür",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ② TEK AÇIK OTURUM — kural SAF GÖVDEDEN geliyor
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "② sayım açma tek-oturum kapısını çağırıyor",
  /acikOturumVarMi\(/.test(blok(eylem, "export async function sayimAc", 1210)),
  "ikinci bir sayım açılabilir — ara verip dönen kullanıcı yeni oturum açar",
);
kontrol(
  "② kapalı oturuma okuma girmiyor",
  /acikOturumVarMi\(\[sayim\]\)/.test(okutBlok),
  "hüküm verilmiş bir sayıma sonradan okuma eklenebilir",
);
kontrol(
  "② oturum hâli ELLE hesaplanmıyor (gövdeden geliyor)",
  !/kapanisAt\s*===\s*null/.test(eylem),
  "hâlin tanımı iki yerde yaşarsa bir gün ayrışır",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ③ null ≠ 0 — SİSTEMİN EN KRİTİK AYRIMI
// ═══════════════════════════════════════════════════════════════════════════

const cevapBlok = blok(eylem, "export async function okutulmayanlariCevapla", 600);
kontrol("③ okutulmayanları cevaplama eylemi var", cevapBlok !== "");
kontrol(
  "③ 'dokunma' HİÇBİR ŞEY YAZMIYOR (sayılmadı, null kalır)",
  /karar === "dokunma"\)\s*return/.test(cevapBlok),
  "'sayılmadı' satır 0'a çevriliyor olabilir — SAYILMAMIŞ MAL STOKTAN SİLİNİR",
);
kontrol(
  "③ 'rafta yok' yalnız HÂLÂ sayılmamış satıra yazılıyor",
  /sayilanAdet:\s*null/.test(cevapBlok) && /data:\s*\{\s*sayilanAdet:\s*0\s*\}/.test(cevapBlok),
  "okutulmuş bir satır 0'a ezilebilir",
);
/**
 * ⚠ DESEN ÖNCE SAYILDI: `Math.max(0,` bu blokta İKİ kez geçiyor — biri
 * kapsam dışı `create` dalında, biri `update` dalında. Dosyaya bakan bir
 * ölçüt, `update` dalındaki koruma SİLİNSE bile ötekini bulup yeşil kalırdı
 * (mutasyon bunu yakaladı). İşaret ATAMAYA bağlandı ve İKİ dal AYRI sınandı.
 */
kontrol(
  "③ okuma dalında sıfırın ALTINA inilmiyor",
  /const sonraki = Math\.max\(0, \(mevcut\.sayilanAdet \?\? 0\) \+ delta\);/.test(okutBlok),
  "eksiye inen adet 'rafta yok'u bozar",
);
kontrol(
  "③ kapsam dışı dalında da sıfırın altına inilmiyor",
  /sayilanAdet: Math\.max\(0, delta\)/.test(okutBlok),
);
kontrol(
  "③ ve sıfır satırı SİLİNMİYOR",
  !/\.delete\(/.test(okutBlok),
  "0 satırı silinirse 'sayıldı, rafta yok' → 'sayılmadı'ya döner",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ④ BOŞ KARE KİLİDİ — ekran saf gövdeyi ÇAĞIRIYOR mu
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "④ ekran okuma kuralını çağırıyor (kural ekranda YAZILMIYOR)",
  /okumaKarari\(kilit\.current, ham\)/.test(kip),
  "kural ekrana kopyalanmış olabilir — orada sınanamaz",
);
kontrol(
  "④ boş kare olayı da gövdeye taşınıyor",
  /okumaKarari\(kilit\.current, null\)/.test(kip),
  "kadraj boş olayı gövdeye ulaşmıyor — kilit hiç açılmaz, 4 adet okutulamaz",
);
kontrol(
  "④ kilit useRef'te (useState DEĞİL — kare başına asenkron gecikme)",
  /useRef<OkumaKilidi>\(BOS_KILIT\)/.test(kip),
  "durum asenkron güncellenir; bir sonraki kare ESKİ kilidi görür",
);
kontrol(
  "④ kamera sürekli kipte açılıyor",
  /surekli/.test(blok(kip, "<KameraDugmesi", 400)),
  "kamera her okumada kapanır — 768 okumada 10–25 dk sadece açılış",
);
kontrol(
  "④ ekranda SÜRE EŞİĞİ yok (Date/setTimeout)",
  !/\bDate\b|\bsetTimeout\b/.test(kip),
  "kural fiziksel olaydan koparılıp uydurma bir süreye bağlanmış",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ⑤ KAMERA — sürekli kip YALNIZ istendiğinde
// ═══════════════════════════════════════════════════════════════════════════

const dongu = blok(kamera, "const kod = await kareyiCozumle", 700);
kontrol("⑤ okuma döngüsü bulundu", dongu !== "");
kontrol(
  "⑤ sürekli kipte kamera KAPANMIYOR",
  /if \(!surekli\) onKapat\(\);/.test(dongu),
  "sürekli kipte de kapanıyor — sayım kullanılamaz",
);
kontrol(
  "⑤ boş kare YALNIZ sürekli kipte bildiriliyor",
  /else if \(surekli\)/.test(dongu) && /onBosKare\?\.\(\)/.test(dongu),
  "boş kare sinyali yok — kilit hiç açılmaz",
);
/**
 * ⚠ DESEN İKİ YERDE: `KameraDiyalogu` ve `KameraDugmesi`. Birini `true`
 * yapan mutasyon, "var mı" diye bakan bir ölçütü GEÇERDİ. Bu yüzden SAYIYA
 * bağlandı — ikisi de kapalı olmalı.
 */
kontrol(
  "⑤ VARSAYILAN KAPALI — HER İKİ bileşende de",
  (kamera.match(/surekli = false/g) ?? []).length === 2,
  "sürekli kip varsayılan olmuş; ürün arama ekranında kamera hiç kapanmaz",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ⑥ EKRAN UYKUSU — tutulur VE BIRAKILIR
// ═══════════════════════════════════════════════════════════════════════════
//  ⛔ Bırakılmazsa batarya SESSİZCE biter ve kullanıcı bunu saatler sonra,
//  telefon ölünce fark eder.

const uyku = blok(kip, "let kilitNesnesi", 900);
kontrol("⑥ wakeLock bloğu bulundu", uyku !== "");
kontrol(
  "⑥ ekran uykusu ENGELLENİYOR",
  /wakeLock\?\.request\("screen"\)/.test(uyku),
  "telefon uykuya geçince kamera oturumu ölür",
);
kontrol(
  "⑥ ve TEMİZLİKTE BIRAKILIYOR",
  /return \(\) => \{[\s\S]{0,260}kilitNesnesi\?\.release\(\)/.test(uyku),
  "bırakılmazsa batarya sessizce biter",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ⑦ AÇILIŞ HATIRLATMASI — kapanışta değil AÇILIŞTA
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "⑦ sayım günü hareketi AÇILIŞTA ölçülüyor",
  /bugunHareket/.test(blok(eylem, "export async function sayimAc", 1210)),
  "uyarı için gereken ölçüm hiç yapılmıyor",
);
kontrol(
  "⑦ ve ekranda AÇILIŞTA yazıyor (koşuluyla birlikte)",
  /bugunHareketVar \? \([\s\S]{0,400}bugunHareketUyarisi/.test(kip),
  "anahtar dosyada var ama dal çizilmiyor olabilir",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ⑧ KAPSAM DIŞI KOD REDDEDİLMİYOR
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "⑧ kapsam dışı okuma satır AÇIYOR (reddedilmiyor)",
  /kapsamdaydi:\s*false/.test(okutBlok),
  "sistemin boş sandığı yerde bulunan mal sessizce kaybolur",
);

// ═══════════════════════════════════════════════════════════════════════════
//  ⑨ ARA VERME — dönüşte sayaç sıfırdan başlamıyor
// ═══════════════════════════════════════════════════════════════════════════

kontrol(
  "⑨ açık oturumda sayılan satır sayısı veritabanından okunuyor",
  /sayilanAdet:\s*\{\s*not:\s*null\s*\}/.test(bolum),
  "dönüşte sayaç 0'dan başlar — yapılan iş yok sayılır",
);
kontrol(
  "⑨ ve ekrana başlangıç olarak geçiyor",
  /sayilanBaslangic=\{sayilan\}/.test(bolum),
);

if (dusen.length === 0) {
  console.log("  ✓  " + gecen + "/" + gecen + " ölçüt geçti\n");
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
