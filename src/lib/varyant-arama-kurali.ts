/**
 * ============================================================================
 *  VARYANT ARAMA KURALI — HANGİ KODLAR ARANIR
 * ----------------------------------------------------------------------------
 *  Kural veritabanı sorgusunun İÇİNE gömülüydü; bu yüzden test edilemiyordu
 *  ve bir kod rolü unutulunca kimse fark etmiyordu. Tam olarak bu oldu:
 *  arama SKU, Firma SKU ve barkoda bakıyordu ama **Kanal SKU'ya bakmıyordu**.
 *
 *  Kullanıcı 15.08.2026: Hepsiburada siparişi girerken pazaryerinin kodunu
 *  (HBCV…) yapıştırıyor, ürün çıkmıyor; önce o koddan barkodu bulup geri
 *  gelmesi gerekiyordu. Oysa kanal kodu sistemde EŞLEŞTİRİLMİŞ durumda —
 *  bilgi vardı, arama sormuyordu.
 *
 *  ANAYASADAKİ DÖRT KOD ROLÜNÜN HEPSİ ARANIR:
 *    SKU (sistem içi) · Firma SKU (fiziksel etiket) ·
 *    Barkod/EAN (üretici) · Kanal SKU (pazaryeri)
 *
 *  Kural burada SAF olarak durduğu için `arama:dogrula` "dört rolün hepsi
 *  var mı" diye sorabiliyor; yarın beşinci bir rol eklenirse aynı yerden
 *  eklenir ve testi kırar.
 * ============================================================================
 */

/** Aranan kod rolleri — testler bunları dolaşır. TEK KAYIT YERİ. */
export const KOD_ROLLERI = [
  "sku",
  "companySku",
  "barcode",
  "channelSku",
  "shipmentCode",
] as const;

export type KodRolu = (typeof KOD_ROLLERI)[number];

/**
 * ============================================================================
 *  ROL KAPSAMI — HANGİ ROL HANGİ TABLODA YAŞIYOR (K41①, 24.08.2026)
 * ----------------------------------------------------------------------------
 *  Halil kararı: gönderi numarası da sipariş numarası gibi elle girilir ve
 *  mevcut aramalara katılır. Komut _"ortak `kodKosulu`ya beşinci alan olarak
 *  ekle, AYRI LİSTE YAZMA"_ diyordu.
 *
 *  ⚠ NİYE BİREBİR UYGULANAMADI: `kodKosulu` BEŞ yerden çağrılıyor ve
 *  hepsi `ProductVariant` sorguluyor (okut · varyant-arama · kart-arama ·
 *  urun-zemini · kart-arama-verisi). Dört rolün dördü de VARYANT alanı;
 *  gönderi numarası ise bir SATIŞ kimliğidir. Doğrudan eklemek geçersiz bir
 *  `ProductVariantWhereInput` üretir ve beş çağıranı birden bozardı —
 *  üstelik ürün ararken gönderi numarasının anlamı yoktur.
 *
 *  ⚠ NİYET KORUNDU: liste TEK, yayım kapsama göre ayrılıyor. `KOD_ROLLERI`
 *  hâlâ tek kayıt yeri; `ROL_KAPSAMI` exhaustive bir `Record` olduğu için
 *  ALTINCI bir rol eklenince DERLENMEZ. Yani "ayrı liste sessizce eski
 *  kalır" tuzağı (K34a dersi) kapalı — rol eklemeyi unutmak imkânsız.
 * ============================================================================
 */
export type RolKapsami = "VARYANT" | "SATIS";

export const ROL_KAPSAMI: Record<KodRolu, RolKapsami> = {
  sku: "VARYANT",
  companySku: "VARYANT",
  barcode: "VARYANT",
  channelSku: "VARYANT",
  shipmentCode: "SATIS",
};

export const VARYANT_ROLLERI = KOD_ROLLERI.filter(
  (r) => ROL_KAPSAMI[r] === "VARYANT",
);
export const SATIS_ROLLERI = KOD_ROLLERI.filter(
  (r) => ROL_KAPSAMI[r] === "SATIS",
);

/**
 * SERBEST METİN ARAMASI — insan yazar, KISMİ eşleşme.
 *
 * Ürün adı da aranır: kullanıcı kodu bilmiyorsa adıyla bulur.
 * Kanal SKU'da `isActive` şartı var — pasife alınmış bir eşleşme artık o
 * ürünü göstermemeli, yoksa kapatılan listing hâlâ ürün getirir.
 */
export function aramaKosulu(sorgu: string) {
  /**
   * ⚠ EŞDEĞERLER SERBEST METİNDE DE GEÇERLİ — VE BURASI DAHA SİNSİ.
   * `contains` uzun bir sorguyu KISA bir alanda bulamaz: aranan
   * `0194644037598`, kayıtlı `194644037598`den UZUN olduğu için hiçbir
   * satırı tutturmaz. Yani "kısmi eşleşme zaten yakalar" sanısı yanlıştır.
   */
  return kodEsdegerleri(sorgu).flatMap((e) => [
    { sku: { contains: e } },
    { companySku: { contains: e } },
    { barcode: { contains: e } },
    { channelSkus: { some: { channelSku: { contains: e }, isActive: true } } },
    { product: { name: { contains: e } } },
  ]);
}

/**
 * ============================================================================
 *  UPC-A ↔ EAN-13 — AYNI KODUN İKİ YAZILIŞI (K100, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI VAKA: Halil `/yerlestir`de `0194644037598` okuttu, ekran
 *  "Bu kod ne ürün ne raf olarak bulundu" dedi. Baştaki sıfır ELLE silinince
 *  ürün çıktı (Soundcore K20i Mor-A3994). Bilgi sistemde VARDI; arama
 *  sormuyordu — yani ekran susmuyor, YANLIŞ CEVAP veriyordu.
 *
 *  UPC-A 12 hanedir. EAN-13, aynı kodun başına `0` konmuş hâlidir; okuyucu
 *  ve kamera çoğu kez 13 haneli hâli döndürür, katalogda ise 12 hane yazılı.
 *  İki dize farklı, ürün AYNI.
 *
 *  ── ⛔ KURAL ÖLÇÜLDÜ, "MAKUL GÖRÜNDÜĞÜ" İÇİN YAZILMADI ──────────────────
 *  "Baştaki sıfırı kırp" makul görünür ve tam bu yüzden tehlikelidir: bu
 *  kodlar TAM eşleşmeyle aranıyor ve yanlış eşleşme YANLIŞ ÜRÜNE yazar
 *  (stok yanlış rafa, satış yanlış varyanta). Sorulan soru "kırpmak doğru
 *  mu" değil, **"kırpınca iki AYRI ürün aynı koda düşüyor mu"** oldu.
 *
 *  `npm run canli:barkod-sifir` (30.08.2026, salt okuma, n=1104 varyant):
 *
 *      12 hane (UPC-A)                 104        13 hane      925
 *      kural YÜZÜNDEN çakışan anahtar    0        ZATEN çakışan  0
 *      kuralla KURTARILAN okuma        104        (katalogun %9,4'ü)
 *      gönderi numarası 12/13 hane       0        → o role hiç dokunmuyor
 *
 *  Beş kod rolünün (barkod · Firma SKU · SKU · Kanal SKU · gönderi no)
 *  beşinde de çakışma sıfır. _(Anayasa: "bir sınırın yönü ölçülmeden
 *  çevrilmez" — burada yön de değeri de ölçüldü.)_
 *
 *  ── ⚠ BEYAN EDİLEN SINIR: YALNIZ 12 ↔ 13 ───────────────────────────────
 *  Katalogda 14 haneli (GTIN-14) 3 barkod var ve onların eşdeğerliği
 *  ÖLÇÜLMEDİ; kural onlara DOKUNMUYOR. Ölçmeden genişletmek, ölçülmemiş bir
 *  sınırı koda gömmek olurdu. Bir GTIN-14 okuması kaçarsa açılış şartı
 *  budur: aynı ölçüm 14 hane için koşulur.
 *
 *  ⚠ VE "BÜTÜN BAŞTAKİ SIFIRLARI KIRP" DEĞİL: `011120272536` katalogda
 *  GERÇEKTEN sıfırla başlayan 12 haneli bir koddur. Hepsini kırpan bir kural
 *  onu `11120272536`ya indirir ve başka bir kümeye taşırdı. Kural tam olarak
 *  bir hane ekler/çıkarır, fazlasını değil.
 * ============================================================================
 */
export function kodEsdegerleri(kod: string): string[] {
  const k = kod.trim();
  const cikti = new Set<string>([k]);
  /** EAN-13 → UPC-A: 13 hane ve baştaki hane `0` ise o hane atılır. */
  if (/^\d{13}$/.test(k) && k.startsWith("0")) cikti.add(k.slice(1));
  /** UPC-A → EAN-13: 12 hanenin başına `0` eklenir. */
  if (/^\d{12}$/.test(k)) cikti.add("0" + k);
  return [...cikti];
}

/**
 * OKUTULAN KOD — makine okur, TAM eşleşme.
 *
 * Kısmi eşleşme burada YASAK: okutulan koda benzeyen başka bir ürün
 * eklenirse yanlış satış kaydedilir ve stok yanlış düşer. Ürün adı da
 * aranmaz — okuyucu ad okumaz.
 */
/**
 * ⚠ VARYANTIN KENDİ ALANLARINDA YAŞAYAN KOD ROLLERİ — TEK KAYIT YERİ.
 * `kodKosulu` ve `kodKosuluToplu` ikisi de BURADAN türer; ayrı ayrı
 * yazılsalardı biri yarın ötekinden sessizce ayrışırdı.
 * `channelSku` bu listede DEĞİL çünkü varyantın alanı değil, İLİŞKİ.
 */
const VARYANT_KOD_ALANLARI = ["barcode", "companySku", "sku"] as const;

export function kodKosulu(kod: string) {
  /**
   * ⚠ TAM EŞLEŞME KORUNUYOR — GEVŞEMİYOR. `in` bir KÜMEYE tam eşleşmedir;
   * kısmi eşleşme değildir. Eşdeğerler ölçülmüş bir denkliktir (UPC-A ↔
   * EAN-13), "benzeyen kod" değil. _(Bkz. `kodEsdegerleri`.)_
   */
  const kodlar = kodEsdegerleri(kod);
  return [
    ...VARYANT_KOD_ALANLARI.map((alan) => ({ [alan]: { in: kodlar } })),
    { channelSkus: { some: { channelSku: { in: kodlar }, isActive: true } } },
  ];
}

/**
 * ============================================================================
 *  TOPLU KOD ÇÖZÜMÜ — AYNI KURAL, `in` İLE
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE VAR: içe aktarma yüzlerce kodu tek seferde çözmek zorunda; kod
 *  başına bir sorgu 400+ tur eder. Ama AYRI BİR LİSTE yazmak, K34a
 *  dersinin tam kendisi olurdu — bu yüzden alan listesi paylaşılıyor ve
 *  bir bekçi ikisinin aynı kümeyi kapsadığını sınıyor.
 *
 *  ⛔ CANLI VAKA 26.08.2026: içe aktarma barkodu YALNIZ
 *  `ProductVariant.barcode`da arıyordu ve **11 sipariş düştü**
 *  (`194645027819`, ₺27.807). O kod sistemde VARDI — `axcali2755`in
 *  Trendyol Kanal SKU'su olarak. Kimliği okuyan katmanın listesi eksikti.
 *  _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_
 * ============================================================================
 */
export function kodKosuluToplu(kodlar: string[]) {
  /**
   * ⚠ EŞDEĞERLER BURADA DA AÇILIR. İçe aktarma yüzlerce kodu tek seferde
   * çözüyor; tek kodluk yol (`kodKosulu`) denkliği bilip toplu yol bilmeseydi
   * aynı barkod EKRANDA bulunur, İÇE AKTARMADA kaçardı — ve kaçış sessiz
   * olurdu (satır "ürün bulunamadı" diye düşer).
   * _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_
   */
  const genis = [...new Set(kodlar.flatMap(kodEsdegerleri))];
  return [
    ...VARYANT_KOD_ALANLARI.map((alan) => ({ [alan]: { in: genis } })),
    { channelSkus: { some: { channelSku: { in: genis }, isActive: true } } },
  ];
}

/**
 * ============================================================================
 *  SATIŞ KİMLİĞİYLE OKUTMA — GÖNDERİ NUMARASI (K41①)
 * ----------------------------------------------------------------------------
 *  ⚠ TAM EŞLEŞME, kısmi DEĞİL — `kodKosulu` ile aynı gerekçe: okutulan koda
 *  benzeyen başka bir kayıt varsa yanlış sipariş açılır.
 *
 *  ⚠ SİPARİŞ NUMARASI DA ARANIR. Depoda elindeki kâğıtta hangisi yazıyorsa
 *  onu okutur; "yalnız gönderi numarası" demek, kullanıcıyı hangi kodun
 *  hangi kutuya ait olduğunu ezberlemeye zorlardı (İlke #9).
 *
 *  ⚠ `code` bir ROL DEĞİL, çünkü `KOD_ROLLERI` ÜRÜN kodu rollerini sayar
 *  (anayasadaki üç kod rolü + Kanal SKU). Sipariş numarası ürünü değil
 *  siparişi tanımlar; role listesine katmak "hangi ürün rolü aranıyor"
 *  testlerini anlamsız yapardı.
 */
export function satisKodKosulu(kod: string) {
  return [{ shipmentCode: kod }, { code: kod }];
}

/**
 * Bir koşul dizisinin hangi kod rollerini kapsadığını söyler.
 * Testler bununla "rollerin hepsi aranıyor mu" diye sorar; koşulun
 * biçimini değil KAPSAMINI sınamış olurlar.
 */
export function kapsananRoller(kosul: unknown[]): KodRolu[] {
  const metin = JSON.stringify(kosul);
  return KOD_ROLLERI.filter((rol) => metin.includes(`"${rol}"`));
}
