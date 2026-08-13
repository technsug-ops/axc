import { unzipSync, zipSync } from "fflate";

/**
 * ============================================================================
 *  XLSX PAKET NORMALLEŞTİRİCİ — TÜM YÜKLEMELERİN ORTAK KAPISI
 * ----------------------------------------------------------------------------
 *  11.08.2026: Trendyol'un indirdiği hakediş dosyaları GEÇERLİ xlsx ama
 *  `read-excel-file` onları açamıyordu:
 *
 *      InvalidInputError: Couldn't unzip `.xlsx` file contents
 *      ZipFileError: invalid signature: 0x41d
 *
 *  Sebep dosyanın bozuk olması DEĞİL, paketleme biçimi:
 *      50 4B 03 04   PK — geçerli zip
 *      2D 00         gereken sürüm 45 = ZIP64 uzantıları
 *      08 00         bayrak bit-3 = veri tanımlayıcı (boyutlar sonda)
 *
 *  `read-excel-file`'ın içindeki küçük açıcı (unzipper-esm) bu iki özelliği
 *  desteklemiyor. Dosyalar Excel'de ve `fflate` ile sorunsuz açılıyor.
 *
 *  ÇÖZÜM: paketi `fflate` ile aç, DÜZ zip olarak yeniden paketle, sonra
 *  `read-excel-file`'a ver. Hücre çözme (paylaşılan metinler, tarih
 *  biçimleri, satır/kolon eşlemesi) kanıtlanmış kütüphanede kalır;
 *  yalnız kap değişir. Kendi xlsx ayrıştırıcımızı yazmaktan çok daha az
 *  riskli — bir tarih biçimi hatası sessizce yanlış hakediş üretirdi.
 *
 *  `fflate` YENİ BAĞIMLILIK DEĞİL: `read-excel-file` zaten ona bağlı.
 *
 *  13.08.2026'da `hakedis/` altından buraya taşındı: komisyon listesi
 *  yükleyicisi de aynı kapıdan geçmek zorunda. Trendyol'un ÜRÜN LİSTESİ
 *  dosyası da tam olarak aynı ZIP64 biçiminde geliyor (ölçüldü) — kopya
 *  yazılsaydı biri düzeltilip diğeri unutulurdu.
 * ============================================================================
 */

/** Paket açılıp yeniden paketlenmesi gerekti mi? */
export type PaketSonucu = {
  bayt: Buffer;
  normallestirildi: boolean;
};

/**
 * Gerekiyorsa paketi normalleştirir. Zaten okunabilir bir paketse
 * DOKUNMAZ — gereksiz yeniden paketleme, gereksiz risk.
 */
export function paketiNormalle(bayt: Buffer): PaketSonucu {
  // ZIP yerel başlığı: imza(4) · sürüm(2) · bayrak(2)
  if (bayt.length < 8 || bayt.readUInt32LE(0) !== 0x04034b50) {
    // ZIP bile değil; olduğu gibi geçir, hatayı okuyucu versin.
    return { bayt, normallestirildi: false };
  }

  const gerekenSurum = bayt.readUInt16LE(4);
  const bayrak = bayt.readUInt16LE(6);
  const veriTanimlayici = (bayrak & 0x08) !== 0;
  const zip64 = gerekenSurum >= 45;

  if (!veriTanimlayici && !zip64) {
    return { bayt, normallestirildi: false };
  }

  const icerik = unzipSync(new Uint8Array(bayt));
  return { bayt: Buffer.from(zipSync(icerik)), normallestirildi: true };
}
