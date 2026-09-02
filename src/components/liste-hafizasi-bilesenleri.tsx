"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

import { GeriBaglanti } from "@/components/baglanti";
import {
  hatirlananListe,
  hatirlananSonListe,
  listeyiHatirla,
  sonListeyiHatirla,
} from "@/lib/liste-hafizasi";

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
export function ListeyiHatirla({
  temel,
  etiket,
}: {
  temel: string;
  /**
   * ⚠ EKRANDAKİ ADI — bu sayfanın kendi başlığı, SÖZLÜKTEN.
   *
   * ⛔ NİYE BURADA: dönüş bağlantısının METNİ hedefle tutmak zorunda.
   * Etiket taban→ad eşlemesinden türetilseydi ELLE TUTULAN BİR LİSTE
   * doğardı ve yedinci liste eklendiğinde sessizce eskirdi. Listeyi en iyi
   * bilen, listenin KENDİSİDİR. _(Anayasa: "bekçi ölçütü elle tutulan liste
   * değil, tersten kurulur" — burada eşleme HİÇ DOĞMUYOR.)_
   */
  etiket: string;
}) {
  const parametreler = useSearchParams();

  useEffect(() => {
    const sorgu = parametreler.toString();
    const adres = sorgu ? `${temel}?${sorgu}` : temel;
    /** Taban başına hafıza — eski davranış, yerinde. */
    listeyiHatirla(temel, adres);
    /** Genel hafıza — "en son hangi listeyi gördüm" (K133). */
    sonListeyiHatirla({ temel, adres, etiket });
  }, [temel, parametreler, etiket]);

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
  /**
   * ⭐ SIRA (K133): genel "en son liste" → taban başına hafıza → düz adres.
   *
   * ⛔ VE HEDEFLE ETİKET BİRLİKTE SEÇİLİR, AYRI AYRI DEĞİL. Ayrı seçilseydi
   * bağlantı `/satislar`a giderken "‹ Ürünler" yazabilirdi — metin,
   * davranışı yanlış söylerdi (İlke #2). İkisi tek kaynaktan geliyor.
   *
   * ⚠ SUNUCU GÖRÜNTÜSÜ HÂLÂ DÜZ ADRES: JavaScript hiç çalışmasa da bağlantı
   * GERÇEK bir bağlantı olarak `href`e gider. Hidrasyon uyuşmazlığı doğmaz.
   */
  const secim = useSyncExternalStore(
    aboneOlma,
    () => {
      const son = hatirlananSonListe();
      if (son !== null) return JSON.stringify({ h: son.adres, e: son.etiket });
      const eski = hatirlananListe(href);
      return JSON.stringify({ h: eski ?? href, e: null });
    },
    () => JSON.stringify({ h: href, e: null }),
  );
  const { h: hedef, e: etiket } = JSON.parse(secim) as {
    h: string;
    e: string | null;
  };

  return (
    <GeriBaglanti href={hedef}>{etiket === null ? children : etiket}</GeriBaglanti>
  );
}
