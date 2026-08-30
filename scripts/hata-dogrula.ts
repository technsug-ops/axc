import { readFileSync } from "node:fs";

import {
  EKRAN_DURUMLARI,
  hataEkranDurumu,
  hataKodu,
} from "../src/lib/hata/durum";
import { HATA_METINLERI } from "../src/lib/hata/metinler";
import {
  FIRMA_IZINLERI,
  SAGLAYICI_IZINLERI,
  TUM_IZINLER,
  tamYetkiliMi,
} from "../src/lib/yetki/izinler";

/**
 * ============================================================================
 *  HATA EKRANI BEKÇİSİ (K98)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run hata:dogrula
 *
 *  ⛔ NİYE VAR — CANLI VAKA 30.08.2026. Barındırma sağlayıcısında kesinti oldu,
 *  kök yerleşim veritabanına gidemedi ve Halil şunu gördü:
 *
 *      This page couldn't load
 *      A server error occurred.        ERROR 800923320
 *
 *  Ekran KİMİN hatası olduğunu söylemiyordu. Operatör "ben mi bozdum, sistem
 *  mi çöktü" diye bilemez ve çalışmayı bırakır. _(İlke #5: sessiz başarısızlık
 *  yasak — bir şey olmadıysa NİYE olmadığı ekranda yazar.)_
 *
 *  ── BU BEKÇİNİN ODAĞI: EKRANIN SUSMASI ──────────────────────────────────
 *  Buradaki en pahalı bozulma patlamak DEĞİL, ekranın yanlış ya da eksik
 *  konuşmasıdır — ve hata ekranı nadiren görüldüğü için bozulduğu FARK
 *  EDİLMEZ. Kimse her gün 500 almıyor; bozulma aylar sonra, tam da her şeyin
 *  yandığı gün ortaya çıkar.
 *
 *  ── SIRA: ÖNCE DEĞER, SONRA KAYNAK ──────────────────────────────────────
 *  Anayasa: _"saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz."_
 *  §1–§3 gövdeleri ÇAĞIRIR ve DEĞERİNİ sınar; desen aranmaz, dolayısıyla
 *  desen yanlış yerde bulunamaz. Kaynak taraması yalnız çizim ve sunucu
 *  eylemi için — orada saf gövde yok — ve o taramalar YORUMSUZ kodda,
 *  KULLANIM BLOĞUNA daraltılarak yapılır.
 *
 *  ── YEDİ BÖLÜM ──────────────────────────────────────────────────────────
 *   §1 SAF KARAR      — sonda cevabı → ekran durumu (dört hâl AYRI kalır)
 *   §2 HATA KODU      — digest gösterimi; boş kod satır AÇMAZ
 *   §3 SÖZLÜK BAĞI    — her durumun metni VAR ve tr/en anahtarları eş
 *   §4 SONDA          — salt okuma · yazma yok · mesaj kırpılmıyor
 *   §5 İKİ SINIR      — error.tsx · global-error.tsx ayrışmıyor
 *   §6 EKRAN GÖVDESİ  — ölçülen durum kullanıcıya ULAŞIYOR mu
 *   §7 DENEME ROTASI  — yetki kapısı VAR ve hatadan ÖNCE koşuyor
 *
 *  ⚠ BÖLÜM SAYACI: bir bölüm sessizce koşmazsa özet "geçti" DEMEZ, koşumu
 *  GEÇERSİZ ilan eder. _(K93, 30.08.2026: ölçütler koştu, `OK` bastı, ama
 *  özet onlardan ÖNCE hesaplanıyordu ve üç mutasyon yeşil geçti.)_
 * ============================================================================
 */

console.log("\nHATA EKRANI BEKÇİSİ (K98)\n");

let gecen = 0;
const dusen: string[] = [];

/**
 * ⚠ BÖLÜM EKLENİNCE BU SAYI DA ARTAR. Artırmayı unutmak "yarım kaldı" der ve
 * doğru davranır; eksik bırakmak yeşil yanardı.
 */
const BOLUM_SAYISI = 7;
const kosanBolumler: string[] = [];

function kontrol(ad: string, kosul: boolean, ipucu?: string) {
  if (kosul) {
    gecen++;
  } else {
    dusen.push(ad + (ipucu ? "\n       " + ipucu : ""));
  }
}

/**
 * TEK OKUMA KAPISI — satır sonu burada normalleşir.
 *
 * ⚠ 24.08.2026 dersi: `prisma format` şemayı CRLF'e çevirince desenler `$`
 * bulamadı ve bir bekçi SESSİZCE boş buldu. Boş bulmak "temiz" gibi görünür.
 * Bu depoda dosyaların bir kısmı CRLF, bir kısmı LF — kapı tek olmalı.
 */
function oku(yol: string): string {
  return readFileSync(yol, "utf8").replace(/\r/g, "");
}

/**
 * ⚠ YORUM SOYULUR. Bir davranışı ANLATAN yorum, o davranış silinse bile
 * deseni ayakta tutar; bir yasağı anlatan yorum da onu çiğnemiş sayılmaz.
 * Bu dosyaların yorumları ağır — `useTranslations`, `error.message`,
 * `console.error` üçü de yorumlarda GEÇİYOR. Soyulmasaydı §4 ve §5 ölçütleri
 * yorum metnini ölçerdi.
 */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/**
 * Deseni KULLANIM BLOĞUNA daraltır.
 *
 * ⚠ PENCERE ÖLÇÜLÜR, TAHMİN EDİLMEZ: her çağıranın ardından pencerenin
 * kapanış işaretini taşıdığı ayrıca sınanır. Gövde büyüyünce dar pencere
 * sessizce kör kalır — bu depoda iki kez yaşandı (2600 → 4200 → 6500).
 */
function blok(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
}

// ═══════════════════════════════════════════════════════════════════════════
//  §1 SAF KARAR — SONDA CEVABI → EKRAN DURUMU
// ---------------------------------------------------------------------------
//  Gövde ÇAĞRILIYOR. Ekranın hangi cümleyi kuracağı burada belirleniyor ve
//  dördü de FARKLI işe yol açıyor:
//    · VERITABANI_YOK       → sağlayıcıya bakılır
//    · SUNUCUYA_ULASILAMADI → beklenir
//    · SUNUCU_HATASI        → ekranın kendisi bozuk, kod iletilir
//  Üçe indirilseler ekran doğru ama işe yaramaz bir cümle kurardı.
// ═══════════════════════════════════════════════════════════════════════════
{
  kontrol(
    "§1 sonda cevap vermeden ekran KONTROL EDİLİYOR der",
    hataEkranDurumu({ durum: "BEKLIYOR" }) === "KONTROL_EDILIYOR",
    "sebep daha ölçülmeden hüküm kuruluyor",
  );
  kontrol(
    "§1 sonda CEVAPSIZ ise sunucuya ulaşılamadı",
    hataEkranDurumu({ durum: "CEVAPSIZ" }) === "SUNUCUYA_ULASILAMADI",
    "sondanın kendisi düştüğünde bu da BİLGİDİR — susulmaz",
  );
  kontrol(
    "§1 sonda cevap verdi + veritabanı YOK",
    hataEkranDurumu({ durum: "CEVAP", veritabani: false }) === "VERITABANI_YOK",
  );
  kontrol(
    "§1 sonda cevap verdi + veritabanı VAR → hata ekranın kendisinde",
    hataEkranDurumu({ durum: "CEVAP", veritabani: true }) === "SUNUCU_HATASI",
  );

  /**
   * ⭐ AYRIMIN İKİ YAKASI: dört giriş dört FARKLI çıkış vermeli. İki hâli tek
   * cümleye ezen bir mutasyon tek tek eşitliklerden kaçabilir; küme boyutu
   * kaçamaz.
   */
  const cikislar = new Set([
    hataEkranDurumu({ durum: "BEKLIYOR" }),
    hataEkranDurumu({ durum: "CEVAPSIZ" }),
    hataEkranDurumu({ durum: "CEVAP", veritabani: false }),
    hataEkranDurumu({ durum: "CEVAP", veritabani: true }),
  ]);
  kontrol(
    "§1 dört hâl AYRI kalıyor (hiçbiri birbirine ezilmemiş)",
    cikislar.size === 4,
    "üretilen küme: " + JSON.stringify([...cikislar]),
  );

  kosanBolumler.push("saf karar");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §2 HATA KODU — DESTEĞİN TEK TUTAMAĞI
// ---------------------------------------------------------------------------
//  Gösterilir (gizlemek "hangi hata" sorusunu cevapsız bırakır) ama YALNIZ
//  digest. Ham mesaj ekrana basılmaz — §5 onu ayrıca ölçüyor.
// ═══════════════════════════════════════════════════════════════════════════
{
  kontrol("§2 digest yoksa satır AÇILMAZ", hataKodu(undefined) === null);
  kontrol(
    "§2 boş digest satır AÇMAZ",
    hataKodu("") === null,
    "boş bir ERROR etiketi, olmayan bir tutamağı varmış gibi gösterir",
  );
  kontrol(
    "§2 yalnız boşluktan ibaret digest satır AÇMAZ",
    hataKodu("   ") === null,
  );
  kontrol(
    "§2 normal digest aynen gösterilir",
    hataKodu("800923320") === "800923320",
  );
  kontrol("§2 digest kırpılıyor", hataKodu(" 800923320 ") === "800923320");

  /** ⚠ SINIR DEĞERİ: tam 64 kırpılMAZ, 65 kırpılır. Bir eksik/bir fazla. */
  const tamAltmisDort = "a".repeat(64);
  kontrol("§2 64 karakter kırpılmaz", hataKodu(tamAltmisDort) === tamAltmisDort);
  const uzun = hataKodu("a".repeat(100));
  kontrol("§2 uzun digest kırpılır", uzun !== null && uzun.length === 65);
  kontrol(
    "§2 kırpıldığı BELLİ olur (üç nokta)",
    uzun !== null && uzun.endsWith("…"),
    "sessiz kırpma, kısaltılmış kodu tam kod sanmaya yol açar",
  );

  kosanBolumler.push("hata kodu");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §3 SÖZLÜK BAĞI — ZİNCİRİN ORTA HALKASI
// ---------------------------------------------------------------------------
//  Anayasa: _"zincir, halkalarının varlığıyla değil BAĞLANTISIYLA sınanır."_
//  Sözlükte anahtar olması ve ekranda alan olması ayrı ayrı doğru olabilir;
//  ölçülen şey ARADAKİ bağ — `metinler.ts` gerçekten okuyor mu.
// ═══════════════════════════════════════════════════════════════════════════
{
  const alanlar = Object.entries(HATA_METINLERI);
  kontrol(
    "§3 metin gövdesi sözlükten DOLU geliyor",
    alanlar.length > 0 &&
      alanlar.every(([, d]) => typeof d === "string" && d.trim() !== ""),
    "boş gelen alan: " +
      JSON.stringify(
        alanlar.filter(([, d]) => !String(d).trim()).map(([a]) => a),
      ),
  );

  /**
   * ⭐ EKRAN `metin[durum]` YAZIYOR: dört durumun dördü de metin gövdesinde
   * ANAHTAR olmak zorunda. Biri eksik olsaydı ekran `undefined` basardı —
   * ve tam da kimsenin bakmadığı ekranda.
   */
  const metinler = HATA_METINLERI as unknown as Record<string, string>;
  for (const durum of EKRAN_DURUMLARI) {
    kontrol(
      "§3 " + durum + " durumunun metni var",
      typeof metinler[durum] === "string" && metinler[durum].trim() !== "",
    );
  }

  /** i18n kuralı: yeni anahtar İKİ sözlüğe birden girer (en boş iskelet). */
  const tr = JSON.parse(oku("messages/tr.json")) as Record<
    string,
    Record<string, string>
  >;
  const en = JSON.parse(oku("messages/en.json")) as Record<
    string,
    Record<string, string>
  >;
  kontrol("§3 tr sözlüğünde Hata bölümü var", typeof tr.Hata === "object");
  kontrol("§3 en sözlüğünde Hata bölümü var", typeof en.Hata === "object");
  kontrol(
    "§3 tr ve en anahtar kümeleri EŞ",
    JSON.stringify(Object.keys(tr.Hata ?? {}).sort()) ===
      JSON.stringify(Object.keys(en.Hata ?? {}).sort()),
    "İngilizce eklendiğinde eksik anahtar sessizce Türkçe kalır",
  );

  kosanBolumler.push("sözlük bağı");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §4 SONDA — HATA ANINDA KOŞAN GÖVDE
// ---------------------------------------------------------------------------
//  ⚠ BURADA SAF GÖVDE YOK: sonda tanımı gereği veritabanına gidiyor, yani
//  ölçüt kaynağa bakmak zorunda. Tarama YORUMSUZ kodda ve yakalama bloğuna
//  DARALTILARAK yapılıyor.
// ═══════════════════════════════════════════════════════════════════════════
{
  const yol = "src/app/hata-sondasi.ts";
  const kod = yorumsuz(oku(yol));

  kontrol(
    "§4 sonda bir sunucu eylemi",
    kod.trim().startsWith('"use server"'),
    "istemciden çağrılamayan bir sonda hiçbir zaman cevap veremez",
  );
  kontrol(
    "§4 tek yaptığı SELECT 1 (hiçbir tablo okunmuyor)",
    /\$queryRaw`SELECT 1`/.test(kod),
    yol + " — sonda ya hiç sormuyor ya da veriye dokunuyor",
  );

  /**
   * ⭐ "DOKUNMUYOR" DA BİR DAVRANIŞTIR ve fazladan dokunan bir mutasyonla
   * sınanır. Zaten bozuk bir durumda koşan bir gövdenin yazması, ikinci bir
   * risk açardı.
   */
  kontrol(
    "§4 SALT OKUMA — yazma çağrısı yok",
    !/\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\(|\$executeRaw/.test(
      kod,
    ),
    "hata anında koşan gövde veriye yazıyor",
  );

  const yakalama = blok(kod, "catch (e)", 500);
  kontrol(
    "§4 pencere yeterli (yakalama bloğu tam)",
    yakalama.includes("return false;"),
    "pencere kısa kaldı — ölçüt yanlış yere bakıyor olabilir",
  );
  kontrol(
    "§4 hata YUTULMUYOR — günlüğe yazılıyor",
    /console\.error\(/.test(yakalama),
    "K57-③: yakalanmamış hata, yutulmuş hatanın kardeşidir",
  );
  kontrol(
    "§4 mesaj TAM taşınıyor (kırpma yok)",
    /e\.stack \?\? e\.message/.test(yakalama) &&
      !/\.slice\(|\.substring\(|\.split\(/.test(yakalama),
    "26.08 dersi: 44 alım düştü, mesaj kırpıldığı için NİYE düştüğü ölçülemedi",
  );
  /**
   * ⚠ İLK YAZIMDA BU ÖLÇÜT YANLIŞ ŞEYİ ÖLÇÜYORDU: `message` ile `return`
   * arasındaki UZAKLIĞA bakıyordu ve doğru kodda kırmızı yanıyordu (mesaj
   * günlüğe yazılıyor, hemen ardından `return false` geliyor). Kaynak
   * SIRASINI ölçme, DAVRANIŞI ölç — burada davranış "ne dönüyor"dur.
   */
  const donusler = [...kod.matchAll(/return\s+([^;]*);/g)].map((m) =>
    (m[1] ?? "").trim(),
  );
  kontrol(
    "§4 çağırana yalnız true/false dönüyor",
    donusler.length > 0 &&
      donusler.every((d) => d === "true" || d === "false"),
    "hata metni çağırana sızıyor — dönenler: " + JSON.stringify(donusler),
  );

  kosanBolumler.push("sonda");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §5 İKİ SINIR — AYRIŞMA YASAĞI
// ---------------------------------------------------------------------------
//  `error.tsx` sayfa düştüğünde, `global-error.tsx` KÖK YERLEŞİM düştüğünde
//  devreye giriyor. 30.08 vakası ikincisiydi: yerleşim oturum için
//  veritabanına gidiyor, veritabanı yoksa yerleşim patlıyor ve `error.tsx`
//  hiç devreye giremiyor.
// ═══════════════════════════════════════════════════════════════════════════
{
  const sayfa = yorumsuz(oku("src/app/error.tsx"));
  const kok = yorumsuz(oku("src/app/global-error.tsx"));

  for (const [ad, kod] of [
    ["error.tsx", sayfa],
    ["global-error.tsx", kok],
  ] as const) {
    kontrol(
      "§5 " + ad + " istemci bileşeni",
      kod.trim().startsWith('"use client"'),
      "hata sınırı istemci bileşeni OLMAK ZORUNDA",
    );
    kontrol(
      "§5 " + ad + " ORTAK gövdeyi çiziyor",
      /<HataEkrani/.test(kod),
      "iki ayrı ekran gün gelip ayrışır ve ayrışan tarafı kimse fark etmez",
    );
    /**
     * ⛔ HAM MESAJ EKRANA BASILMAZ: kullanıcıya bir şey anlatmaz, iç ayrıntı
     * sızdırır. Bu bir "dokunmuyor" iddiası ve fazladan basan mutasyonla
     * ayrıca sınanıyor.
     */
    kontrol(
      "§5 " + ad + " ham hata mesajını EKRANA basmıyor",
      !/error\.message/.test(kod),
      "K57-③: hata koda çevrilir, mesaja değil",
    );
  }

  /**
   * ⭐ ASIL KIRILGAN YER BURASI. `global-error.tsx` kök yerleşimin YERİNE
   * geçiyor, yani `NextIntlClientProvider` DÜŞMÜŞ oluyor. Oraya konan bir
   * `useTranslations`, tam da her şeyin yandığı anda hata ekranının KENDİSİNİ
   * düşürür — ve bunu kimse görmez, çünkü hata ekranı nadiren çizilir.
   */
  kontrol(
    "§5 global-error çeviri KANCASI kullanmıyor (sağlayıcı yok)",
    !/useTranslations/.test(kok),
    "sağlayıcısız kancanın bedeli: hata ekranının kendisi patlar",
  );
  kontrol(
    "§5 global-error metni yine SÖZLÜKTEN alıyor",
    /HATA_METINLERI/.test(kok),
    "sağlayıcı yok diye metin koda gömülemez (i18n kesin kuralı)",
  );
  kontrol(
    "§5 global-error kendi html/body'sini çiziyor",
    /<html/.test(kok) && /<body/.test(kok),
    "kök yerleşimin yerine geçen sınır bunu yapmak zorunda",
  );
  kontrol(
    "§5 error.tsx sağlayıcı VARKEN çeviri kancasını kullanıyor",
    /useTranslations\("Hata"\)/.test(sayfa),
  );

  /**
   * ⭐ ZİNCİRİN ORTA HALKASI — ve liste ELLE TUTULMUYOR: beklenen alanlar
   * `HATA_METINLERI`nin kendisinden türetiliyor. Yarın yeni bir metin alanı
   * eklenirse ölçüt onu kendiliğinden arar; kimsenin listeye yazmayı
   * hatırlaması gerekmez.
   */
  for (const alan of Object.keys(HATA_METINLERI)) {
    kontrol(
      "§5 error.tsx " + alan + " alanını veriyor",
      new RegExp(alan.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":").test(sayfa),
      "eksik alan ekranda undefined basar",
    );
  }

  kosanBolumler.push("iki sınır");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §6 EKRAN GÖVDESİ — ÖLÇÜLEN DURUM KULLANICIYA ULAŞIYOR MU
// ---------------------------------------------------------------------------
//  Anayasa: _"doğru davranışın GÖRÜNMEZLİĞİ de yalancı yeşildir."_ Sonda
//  doğru ölçüp ekran onu basmazsa, kural çalışır ve kimse görmez.
// ═══════════════════════════════════════════════════════════════════════════
{
  const yol = "src/components/hata-ekrani.tsx";
  const kod = yorumsuz(oku(yol));

  kontrol(
    "§6 ekran saf karar gövdesini ÇAĞIRIYOR",
    /hataEkranDurumu\(sonda\)/.test(kod),
  );
  kontrol(
    "§6 ölçülen durum EKRANA basılıyor",
    /\{metin\[durum\]\}/.test(kod),
    "kural doğru çalışıp sonucu kullanıcıya ulaşmıyorsa ölçüm boşa gider",
  );

  const etki = blok(kod, "useEffect(() => {", 700);
  kontrol(
    "§6 pencere yeterli (useEffect tam)",
    etki.includes("}, []);"),
    "pencere kısa kaldı — ölçüt yanlış yere bakıyor olabilir",
  );
  kontrol(
    "§6 ekran açılır açılmaz SORUYOR",
    /veritabaniUlasilabilirMi\(\)/.test(etki),
    "sebep ölçülmüyor, tahmin ediliyor",
  );
  /**
   * ⚠ KOŞUL SONUCUYLA BİRLİKTE ARANIYOR. Yalnız "CEVAP" dizesini aramak,
   * koşulu `if (false)` yapan bir mutasyonu yeşil bırakırdı — desen dosyada
   * kalır, dal hiç çizilmez. (Bu deponun en sık tekrarlayan yalancı yeşili.)
   */
  kontrol(
    "§6 sonda cevabı DURUMA yazılıyor",
    /if \(!iptal\) setSonda\(\{ durum: "CEVAP", veritabani: v \}\);/.test(etki),
  );
  kontrol(
    "§6 sondanın DÜŞMESİ de bir cevap (CEVAPSIZ)",
    /if \(!iptal\) setSonda\(\{ durum: "CEVAPSIZ" \}\);/.test(etki),
    "yutulan hata ekranı sonsuza kadar 'kontrol ediliyor'da bırakır",
  );

  const dugme = blok(kod, "<button", 400);
  kontrol("§6 pencere yeterli (düğme tam)", dugme.includes("</button>"));
  kontrol(
    "§6 tekrar dene düğmesi sınırı yeniden çalıştırıyor",
    /onClick=\{yenidenDene\}/.test(dugme),
  );
  kontrol(
    "§6 düğme telefonda 44px (anayasa #8)",
    /h-11/.test(dugme),
    "depo aşamasında birincil cihaz telefon",
  );

  const kodSatiri = blok(kod, "{kod ? (", 300);
  kontrol("§6 pencere yeterli (kod satırı tam)", kodSatiri.includes(") : null}"));
  kontrol(
    "§6 hata kodu satırı KOŞULLU (boş kodda çizilmiyor)",
    /\{kod \? \(/.test(kod),
    "boş bir ERROR etiketi olmayan bir tutamağı varmış gibi gösterir",
  );
  kontrol(
    "§6 kod satırı sözlük etiketiyle çıkıyor",
    /\{metin\.kodEtiketi\}/.test(kodSatiri),
  );

  kosanBolumler.push("ekran gövdesi");
}

// ═══════════════════════════════════════════════════════════════════════════
//  §7 DENEME ROTASI — /sistem/hata-denemesi
// ---------------------------------------------------------------------------
//  Hata ekranını gerçek cihazda görmenin tek yolu. Ama açtığı şey bir HATA
//  SAYFASI: korumasız kalırsa canlıda herkesin tetikleyebileceği bir uç olur.
//  Bu yüzden kapının VARLIĞI değil, ÖNCE koştuğu da ölçülüyor.
// ═══════════════════════════════════════════════════════════════════════════
{
  /**
   * ⭐ ÖNCE DEĞER: kapının ölçütü saf bir gövde (`tamYetkiliMi`), o yüzden
   * ÇAĞRILIYOR. Desen aranmadığı için desen yanlış yerde bulunamaz.
   */
  kontrol(
    "§7 tam izin kümesi kapıyı AÇAR",
    tamYetkiliMi(new Set<string>(FIRMA_IZINLERI)),
  );
  kontrol(
    "§7 TEK izin eksikse kapı KAPALI",
    !tamYetkiliMi(new Set<string>(FIRMA_IZINLERI.slice(1))),
    "kısıtlı bir rol hata sayfasını tetikleyebilir",
  );
  kontrol(
    "§7 boş küme tam yetkili SAYILMAZ",
    !tamYetkiliMi(new Set<string>()),
    "`every` boş listede true döner — taban boşalırsa kapı herkese açılır",
  );
  /**
   * ⚠ TABANIN KENDİSİ DE ÖLÇÜLÜR. `tamYetkiliMi` içindeki boş-taban kapısı
   * ancak taban gerçekten boşalırsa iş görür ve o hâli DIŞARIDAN sınamanın
   * yolu yok (sabit modül düzeyinde). O yüzden riskin kaynağı doğrudan
   * ölçülüyor: taban boşsa kapı herkese açılırdı.
   */
  kontrol(
    "§7 yetki tabanı BOŞ DEĞİL",
    FIRMA_IZINLERI.length > 0,
    "taban boşalırsa her kullanıcı tam yetkili sayılır",
  );

  /**
   * ⭐ TESLİM EDİLEBİLİRLİK ÖLÇÜTÜ — ve bu testin doğuş sebebi:
   * taban `TUM_IZINLER` seçilseydi, sağlayıcı izni OLMAYAN canlıdaki CEO
   * rolü kapıdan geçemez ve Halil 404 alırdı. Yani kural doğru, ekran
   * teslim edilemez olurdu. Bu ölçüt tam o senaryoyu sabitliyor.
   */
  const saglayicisiz = new Set<string>(
    TUM_IZINLER.filter(
      (i) => !(SAGLAYICI_IZINLERI as readonly string[]).includes(i),
    ),
  );
  kontrol(
    "§7 sağlayıcı izni OLMAYAN tam yetkili rol de geçer (CEO vakası)",
    SAGLAYICI_IZINLERI.length === 0 || tamYetkiliMi(saglayicisiz),
    "taban TUM_IZINLER'e kayarsa canlıdaki tam yetkili kullanıcı 404 alır",
  );

  const kapi = yorumsuz(oku("src/lib/yetki/index.ts"));
  const kapiBloku = blok(kapi, "export async function sayfaTamYetki", 500);
  kontrol(
    "§7 pencere yeterli (kapı gövdesi tam)",
    kapiBloku.includes("return baglam;"),
  );
  kontrol(
    "§7 kapı saf ölçütü kullanıyor",
    /if \(!tamYetkiliMi\(baglam\.izinler\)\) notFound\(\);/.test(kapiBloku),
    "kapı kendi ölçütünü yazarsa iki yerde iki farklı tam-yetki tanımı doğar",
  );
  /**
   * ⚠ İLK YAZIMDA BU ÖLÇÜT `redirect(` GEÇMEMELİ diyordu ve DOĞRU KODDA
   * kırmızı yandı: kapı, kardeş kapılarla aynı parola-değiştirme yolunu
   * paylaşıyor (`parolaDegismeliMi()` → `redirect("/parola-degistir")`) ve
   * o yönlendirme meşru. Ölçüt "blokta şu kelime geçmesin" değil, REDDİN
   * KENDİSİ ne yapıyor olmalı — iki ret dalı da 404 döndürmeli.
   */
  kontrol(
    "§7 reddedilen istek 404 alıyor (rotanın varlığı sızmıyor)",
    /if \(!baglam\) notFound\(\);/.test(kapiBloku) &&
      /if \(!tamYetkiliMi\(baglam\.izinler\)\) notFound\(\);/.test(kapiBloku) &&
      !/YetkisizHata/.test(kapiBloku),
    "'yetkiniz yok' demek, rotanın VAR OLDUĞUNU söylemektir",
  );

  const rota = "src/app/sistem/hata-denemesi/page.tsx";
  const sayfa = yorumsuz(oku(rota));
  kontrol("§7 deneme rotası kapıyı çağırıyor", /await sayfaTamYetki\(\);/.test(sayfa));
  kontrol(
    "§7 deneme rotası hata ATIYOR",
    /throw new Error\(/.test(sayfa),
    "atmazsa ekran hiç çizilmez ve rota işe yaramaz",
  );

  /**
   * ⛔ SIRA — BU ÖLÇÜTÜN KENDİSİ ASIL KORUMA. Kapı ile hata YER DEĞİŞTİRİRSE
   * ikisi de dosyada durur, iki desen de bulunur ve varlık ölçütleri yeşil
   * kalır; ama hata sayfası HERKESE çizilir. Ölçüt bu yüzden konuma bakıyor.
   */
  const kapiYeri = sayfa.indexOf("await sayfaTamYetki();");
  const hataYeri = sayfa.indexOf("throw new Error(");
  kontrol(
    "§7 kapı hatadan ÖNCE koşuyor",
    kapiYeri >= 0 && hataYeri >= 0 && kapiYeri < hataYeri,
    "sıra ters: hata yetkisiz kullanıcıya da çizilir",
  );

  kontrol(
    "§7 deneme rotası HİÇBİR ŞEY yazmıyor",
    !/prisma|\.create\(|\.update\(|\.delete\(/.test(sayfa),
    "deneme sayfası veriye dokunuyor",
  );

  kosanBolumler.push("deneme rotası");
}

// ═══════════════════════════════════════════════════════════════════════════
//  ÖZET — BÜTÜN ÖLÇÜT BLOKLARINDAN SONRA
// ---------------------------------------------------------------------------
//  ⚠ K93 (30.08.2026): yeni ölçüt dosyanın SONUNA eklenirse özet ve çıkış
//  kodu ondan ÖNCE hesaplanır; sayaç artar, kimse okumaz, mutasyonlar yeşil
//  geçer. Sıra insan disiplini — aşağıdaki bölüm sayacı MEKANİZMA.
// ═══════════════════════════════════════════════════════════════════════════
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    "  ⛔ KOŞUM YARIM KALDI — sonuç GEÇERSİZ (" +
      kosanBolumler.length +
      "/" +
      BOLUM_SAYISI +
      " bölüm): " +
      kosanBolumler.join(" · "),
  );
  process.exit(1);
} else if (dusen.length === 0) {
  console.log(
    "  ✓  " + gecen + "/" + gecen + " ölçüt geçti (" + BOLUM_SAYISI + " bölüm)\n",
  );
} else {
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("\n  " + dusen.length + " ölçüt DÜŞTÜ · " + gecen + " geçti\n");
  process.exitCode = 1;
}
