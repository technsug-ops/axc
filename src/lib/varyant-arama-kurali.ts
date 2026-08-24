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
  return [
    { sku: { contains: sorgu } },
    { companySku: { contains: sorgu } },
    { barcode: { contains: sorgu } },
    { channelSkus: { some: { channelSku: { contains: sorgu }, isActive: true } } },
    { product: { name: { contains: sorgu } } },
  ];
}

/**
 * OKUTULAN KOD — makine okur, TAM eşleşme.
 *
 * Kısmi eşleşme burada YASAK: okutulan koda benzeyen başka bir ürün
 * eklenirse yanlış satış kaydedilir ve stok yanlış düşer. Ürün adı da
 * aranmaz — okuyucu ad okumaz.
 */
export function kodKosulu(kod: string) {
  return [
    { barcode: kod },
    { companySku: kod },
    { sku: kod },
    { channelSkus: { some: { channelSku: kod, isActive: true } } },
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
