/**
 * ÜRÜN AKTİFLİĞİ VARYANTLARDAN TÜRER (02.10.2026, kullanıcı onayı «yap»).
 *
 * ⛔ VAKA: HBCV00006G7MR1 (Anker Boom 2) 26.09 toplu «uyuyan ürün» temizliğinde
 * ürün + varyant pasife alındı. Düzenleme formu yalnız VARYANT aktifliğini
 * yazıyordu; `Product.isActive`in arayüzde YAZICISI YOKTU. Varyant aktif
 * edilince alım açıldı ama ürün listede «pasif» rozetiyle kaldı, etiket ve
 * SKU önizleme ekranları onu göstermedi.
 * _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur".)_
 *
 * KURAL: ürün, EN AZ BİR varyantı aktifse aktiftir. Hepsi pasifse pasif —
 * toplu temizliğin kuralıyla aynı yön.
 */
export function urunAktifMi(varyantlar: readonly { aktif: boolean }[]): boolean {
  return varyantlar.some((v) => v.aktif);
}
