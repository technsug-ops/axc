import { redirect } from "next/navigation";

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
export default function EskiTarifeEkrani() {
  redirect("/ayarlar/komisyon");
}
