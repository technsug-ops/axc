/**
 * TRENDYOL KATEGORİSİNE GÖRE ÜRÜN LİSTESİ (K295, kullanıcı 28.09.2026:
 * «kategoriye tıkladığı zaman o kategorideki ürünleri listelemeli»).
 *
 * SÜZGEÇ SÖZLEŞMESİNİN SAHİBİ BU DOSYA (İlke #16: adres, süzgeç sözleşmesinin
 * sahibi dosyadan üretilir). Eşleşme sayfasındaki «N ürün» sayısı, o sayıya
 * tıklayınca açılan Ürünler listesi ve Excel AYNI koşuldan okur — «sayı = liste».
 *
 * ⚠ AKTİF ÜRÜNLER: eşleşme sayfası yalnız aktif ürünleri sayıyor (senkron ve
 * eşleşme yalnız onlara yazıyor). Ürünler ekranı normalde pasifleri de gösterir;
 * bu süzgeç açıkken göstermez, yoksa «243 ürün» deyip 250 satır açardı.
 */
export const TY_KATEGORI_PARAMETRESI = "tyKategori";

/** Sayımın ve listenin ORTAK taban koşulu (kategoriden bağımsız). */
export const TY_KATEGORILI_URUN = { isActive: true, tyKategori: { not: null } } as const;

/** Tek bir Trendyol kategorisindeki ürünler — Ürünler ekranı ve Excel bunu kullanır. */
export function tyKategoriUrunKosulu(tyKategori: string) {
  return { isActive: true, tyKategori };
}

/** «N ürün» bağlantısının adresi. */
export function tyKategoriListeAdresi(tyKategori: string): string {
  return `/urunler?${TY_KATEGORI_PARAMETRESI}=${encodeURIComponent(tyKategori)}`;
}

/** Adresten gelen değer: boşsa süzgeç YOK. */
export function tyKategoriCoz(ham: string | undefined): string | null {
  const d = (ham ?? "").trim();
  return d === "" ? null : d;
}
