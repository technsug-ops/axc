import { userAgentFromString } from "next/server";

/**
 * ============================================================================
 *  PANEL — TELEFONDA 12 AYLIK OKUMA YAPILMAZ (K332, kullanıcı fikri 11–12.10.2026)
 * ----------------------------------------------------------------------------
 *  12 aylık grafik telefonda zaten GİZLİ (K270, `max-md:hidden`). Arkadan
 *  dolması (Suspense) sunucuda ölçüldü ama telefonda kazandırmadı: canlı
 *  ölçümde «Toplam» ≈ «Sunucu + İndirme» (2.173 ≈ 59 + 2.065) — sayfa ancak
 *  akışın TAMAMI inince açılıyor. Yerelde üst kısım 0,6–0,9 sn'de, grafik
 *  1,8–2,5 sn'de geliyordu. Telefonda görünmeyen bölümün okuması bu yüzden
 *  hiç başlatılmaz.
 *
 *  ⚠ ÖLÇÜT CİHAZ TÜRÜDÜR, EKRAN GENİŞLİĞİ DEĞİL: sunucu genişliği bilemez;
 *  tarayıcının kendini tanıttığı satırdan (`userAgent`, Next'in kararlı
 *  yardımcısı) cihaz türü okunur. YALNIZ «mobile» elenir — tablet ve
 *  bilgisayar grafiği görür (tablet yatayda 768 px'i geçer ve grafik orada
 *  ÇİZİLİR; elenseydi boş bir alan kalırdı).
 *  ⚠ TANINAMAYAN cihaz (boş satır, bilinmeyen tarayıcı) TELEFON SAYILMAZ:
 *  yanlış elemek grafiği görmesi gereken birinden saklar; yanlış okumak
 *  yalnız biraz yavaşlatır. Şüphede okunur.
 * ============================================================================
 */
export function telefonMu(tarayiciSatiri: string | null | undefined): boolean {
  if (!tarayiciSatiri) return false;
  return userAgentFromString(tarayiciSatiri).device.type === "mobile";
}
