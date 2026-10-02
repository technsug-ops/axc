import type { MetadataRoute } from "next";

/**
 * ARAMA MOTORLARINA KAPALI (02.10.2026, kullanıcı onayı).
 *
 * Selliora iç bir işletim sistemi — dizinlenecek hiçbir sayfası yok. Giriş
 * sayfasının arama sonuçlarında görünmesi sitenin VARLIĞINI duyururdu.
 * ⚠ İLERİDE TANITIM SAYFASI açılırsa (SaaS aşaması, bkz. BEKLEYENLER) YALNIZ
 * o sayfa `allow` alır; uygulama yolları kapalı kalır.
 * ⚠ `/robots.txt` proxy'nin ACIK_YOLLAR listesinde — yoksa tarayıcı robotu
 * dosya yerine giriş sayfasına yönlenirdi.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
