import sozluk from "../../../messages/tr.json";

import type { HataMetinleri } from "@/components/hata-ekrani";

/**
 * ============================================================================
 *  HATA METİNLERİ — SAĞLAYICISIZ OKUMA (K98)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `useTranslations` DEĞİL: bu metinleri `global-error.tsx` kullanıyor
 *  ve orası kök yerleşimin YERİNE geçiyor — `NextIntlClientProvider` düşmüş
 *  oluyor. Çeviri kancası orada çalışmaz.
 *
 *  ⭐ AMA METİN YİNE SÖZLÜKTEN: anahtarlar `messages/tr.json` içinde yaşıyor,
 *  koda gömülmüyor ve `i18n:kontrol` onları ölçmeye devam ediyor. Değişen tek
 *  şey okuma yolu.
 *
 *  ⚠ TEK DİL VARSAYIMI BURADA VE YALNIZ BURADA: İngilizce eklendiğinde bu
 *  gövde dili çözmek zorunda kalacak. O gün geldiğinde çare çerezden ya da
 *  `Accept-Language`tan okumaktır; bugün ikinci bir dil YOK ve olmayan bir
 *  ihtiyaç için katman açılmıyor.
 * ============================================================================
 */
const H = sozluk.Hata;

export const HATA_METINLERI: HataMetinleri = {
  baslik: H.baslik,
  KONTROL_EDILIYOR: H.KONTROL_EDILIYOR,
  VERITABANI_YOK: H.VERITABANI_YOK,
  SUNUCUYA_ULASILAMADI: H.SUNUCUYA_ULASILAMADI,
  SUNUCU_HATASI: H.SUNUCU_HATASI,
  neYapmali_VERITABANI_YOK: H.neYapmaliVERITABANI_YOK,
  neYapmali_SUNUCUYA_ULASILAMADI: H.neYapmaliSUNUCUYA_ULASILAMADI,
  neYapmali_SUNUCU_HATASI: H.neYapmaliSUNUCU_HATASI,
  tekrarDene: H.tekrarDene,
  kodEtiketi: H.kodEtiketi,
};
