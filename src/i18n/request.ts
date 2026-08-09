import { getRequestConfig } from "next-intl/server";

import { BICIMLER, VARSAYILAN_DIL } from "./ayarlar";

/**
 * next-intl istek yapılandırması.
 *
 * Yönlendirme (URL öneki) kullanılmadığı için dil sabittir; ikinci dil
 * geldiğinde burası çerezden/başlıktan dil okuyacak şekilde genişler,
 * ekranlarda hiçbir değişiklik gerekmez.
 */
export default getRequestConfig(async () => {
  const locale = VARSAYILAN_DIL;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    formats: BICIMLER,
    /**
     * Saat dilimi bilinçli olarak çalışma ortamından alınıyor: mevcut
     * tarih gösterimi bugüne kadar da böyleydi, i18n geçişi görünümü
     * DEĞİŞTİRMEMELİ. Sabit bir iş saat dilimine (ör. Europe/Istanbul)
     * geçmek ayrı bir karar; tarihleri kaydırabileceği için burada
     * yapılmadı.
     */
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
});
