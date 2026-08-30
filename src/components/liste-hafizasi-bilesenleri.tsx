"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { GeriBaglanti } from "@/components/baglanti";
import { hatirlananListe, listeyiHatirla } from "@/lib/liste-hafizasi";

/**
 * ============================================================================
 *  LİSTE HAFIZASI — EKRAN TARAFI (K104-②, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  İki bileşen, tek sözleşme:
 *    · `<ListeyiHatirla>` süzgeçli listenin O ANKİ adresini kaydeder
 *    · `<ListeyeDon>`     o adrese döner; yoksa düz listeye
 *
 *  Gerekçenin tamamı ve `router.back()` kararının NİYE çevrildiği
 *  `lib/liste-hafizasi.ts` başlığında.
 * ============================================================================
 */

/**
 * Süzgeçli liste sayfalarına konur; hiçbir şey ÇİZMEZ.
 *
 * ⚠ ADRES DEĞİŞTİKÇE TAZELENİR (`parametreler` bağımlılıkta). Yalnız ilk
 * açılışta kaydedilseydi, kullanıcı süzgeci değiştirdikten sonra detaya
 * girip döndüğünde ESKİ süzgece dönerdi — sessizce yanlış bir liste.
 */
export function ListeyiHatirla({ temel }: { temel: string }) {
  const parametreler = useSearchParams();

  useEffect(() => {
    const sorgu = parametreler.toString();
    listeyiHatirla(temel, sorgu ? `${temel}?${sorgu}` : temel);
  }, [temel, parametreler]);

  return null;
}

/**
 * "‹ Liste" bağlantısı — hatırlanan süzgeçli adrese döner.
 *
 * ⚠ SUNUCUDA DÜZ ADRES ÇİZİLİR, İSTEMCİDE YÜKSELTİLİR. Böylece JavaScript
 * çalışmasa da, sayfa doğrudan bir linkle açılmış olsa da bağlantı GERÇEK
 * bir bağlantı olarak `/liste`ye gider. Hatırlanan adres varsa üzerine
 * yazılır. En kötü ihtimalde bugünkü davranışa düşer, daha kötüsüne değil.
 *
 * ⚠ VE HEDEF DEĞİŞSE BİLE GÖRÜNEN METİN AYNI KALIR: kullanıcı "Satışlar"a
 * döndüğünü bilir; adresin süzgeç taşıdığını bilmek zorunda değil.
 */
/**
 * ⚠ ABONELİK BOŞ — VE BU BİLİNÇLİ. Hatırlanan adres bu ekran AÇIKKEN
 * değişmez: onu yazan yer liste sayfası, burası ise detay. Sahte bir
 * dinleyici kurmak, hiç tetiklenmeyecek bir kanal açmak olurdu.
 */
function aboneOlma(): () => void {
  return () => {};
}

export function ListeyeDon({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  /**
   * ⚠ `useEffect` + `setState` DEĞİL, `useSyncExternalStore`.
   *
   * İlk yazımda değer efekt içinde `setHedef` ile atanıyordu ve lint haklı
   * olarak kırmızı yandı: efekt içinde senkron `setState` basamaklı render
   * üretir. Bu kancanın var olma sebebi tam olarak bu durum — DIŞ bir
   * depodan okunan, sunucuda BAŞKA olan bir değer.
   *
   * ⭐ ÜÇÜNCÜ PARAMETRE (sunucu görüntüsü) `href`: sunucu düz listeyi çizer,
   * istemci hidrasyondan sonra hatırlanan adrese yükseltir. Hidrasyon
   * uyuşmazlığı doğmaz ve JavaScript hiç çalışmasa bile bağlantı GERÇEK bir
   * bağlantı olarak `/liste`ye gider.
   */
  const hedef = useSyncExternalStore(
    aboneOlma,
    () => hatirlananListe(href) ?? href,
    () => href,
  );

  return <GeriBaglanti href={hedef}>{children}</GeriBaglanti>;
}
