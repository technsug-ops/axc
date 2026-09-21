import { redirect } from "next/navigation";

import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  ESKİ TARİFE EKRANI → TEK KAPIYA YÖNLENDİRİR (K230-③, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı İKİ KEZ sordu: _"tarife penceresi ile komisyon yüklemenin farkı
 *  ne?"_ İkinci kez sorulması, ayrımın ekranda görünmediğinin kanıtıydı —
 *  cevabı her seferinde anlatmak gerekiyorsa cevap değil TASARIM eksiktir.
 *
 *  ⚠ ADRES SİLİNMEDİ, YÖNLENDİRİLDİ. Yer imi, el kitabı bağlantısı ya da
 *  eski bir sekme bu adrese gelebilir; 404 vermek, kullanıcıya "kaybettin"
 *  demek olurdu. Tarife aynası (`/ayarlar/tarife/[id]`) yerinde duruyor.
 * ============================================================================
 */
export default async function EskiTarifeEkrani() {
  /**
   * ⛔ YÖNLENDİRME DE BİR SAYFADIR — KAPISIZ OLAMAZ.
   * `yetki:dogrula` bunu yakaladı ve haklıydı. Muafiyet beyan etmek daha
   * kolaydı ama YANLIŞ sınıfı kayda geçirip meşrulaştırırdı: altı ay sonra
   * bakan biri "demek korumasız bir sayfa var ama muaf tutulmuş" diye okur.
   *
   * Ve kapı yalnız bir tören değil: kapısız hâlde yetkisiz bir ziyaretçi
   * yönlendirilip HEDEFTE 404 alırdı — yani sıçrama, orada bir şey OLDUĞUNU
   * söylerdi. Kapı burada olunca istek daha ilk adımda 404 alır; rotanın
   * varlığı bile sızmaz.
   */
  await sayfaIzni("kanalsku.yaz");
  redirect("/ayarlar/komisyon");
}
