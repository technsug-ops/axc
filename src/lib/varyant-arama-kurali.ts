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

/** Aranan kod rolleri — testler bunları dolaşır. */
export const KOD_ROLLERI = [
  "sku",
  "companySku",
  "barcode",
  "channelSku",
] as const;

export type KodRolu = (typeof KOD_ROLLERI)[number];

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
 * Bir koşul dizisinin hangi kod rollerini kapsadığını söyler.
 * Testler bununla "dört rolün hepsi aranıyor mu" diye sorar; koşulun
 * biçimini değil KAPSAMINI sınamış olurlar.
 */
export function kapsananRoller(kosul: unknown[]): KodRolu[] {
  const metin = JSON.stringify(kosul);
  return KOD_ROLLERI.filter((rol) => metin.includes(`"${rol}"`));
}
