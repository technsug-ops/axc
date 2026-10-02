import { eanGecerliMi } from "@/lib/supheli-urun";

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

/**
 * ============================================================================
 *  PASİFTEN AKTİFE GEÇİŞ — EKSİK BİLGİYLE AÇILMAZ (K315, kullanıcı kararı
 *  03.10.2026: «EAN + kategori + marka, hepsi olsun»)
 * ----------------------------------------------------------------------------
 *  26.09 temizliği 619 «uyuyan» kaydı pasife aldı: kategori/marka boş, stok 0,
 *  90 gün satış yok, kanalda açık değil. Formdaki tek tık onları EKSİK hâlde
 *  dolaşıma geri sokuyordu — ayıklanan kayıt, ayıklandığı sebeple geri geliyordu.
 *
 *  · EAN — gerçek GTIN (biçim + kontrol hanesi; şüpheli ürün kuralıyla AYNI gövde)
 *  · KATEGORİ — KDV oranı ve SKU'nun KAT parçası buradan
 *  · MARKA — marka TABLOSUNA bağlı (SKU'nun MRK parçası); serbest metin yetmez
 *
 *  ⛔ KAPSAM YALNIZ GEÇİŞ: `oncedenAktif === false` ve şimdi aktif. Zaten aktif
 *  kaydın düzenlenmesi KİLİTLENMEZ (yüzlerce çalışan kayıt); yeni varyant
 *  (`oncedenAktif === null`) kapsam dışı — kullanıcı kararı yeni ürünü kapsamadı.
 *  Eksikte kayıt REDDEDİLİR ve sebebi söylenir; kutu sessizce kaldırılmaz.
 * ============================================================================
 */
export type AktifEtmeEksigi = "EAN" | "KATEGORI" | "MARKA";

export function aktifEtmeEksikleri(g: {
  /** Kayıttaki eski hâl; yeni varyantta `null`. */
  oncedenAktif: boolean | null;
  simdiAktif: boolean;
  barkod: string | null | undefined;
  kategoriVar: boolean;
  markaTablodaMi: boolean;
}): AktifEtmeEksigi[] {
  if (g.oncedenAktif !== false || !g.simdiAktif) return [];
  const eksik: AktifEtmeEksigi[] = [];
  if (!eanGecerliMi((g.barkod ?? "").trim())) eksik.push("EAN");
  if (!g.kategoriVar) eksik.push("KATEGORI");
  if (!g.markaTablodaMi) eksik.push("MARKA");
  return eksik;
}
