import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/** Dil altyapısı: istek yapılandırması src/i18n/request.ts içinde. */
const nextIntlIle = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * BEKÇİ DERLEMESİ Mİ (K48, 30.08.2026)?
 *
 * ⚠ YALNIZ `derleme:dogrula` BU DEĞİŞKENİ KURAR. Vercel kurmaz, dolayısıyla
 * CANLI DEPLOY'DA tip kontrolü ve lint TAM koşmaya devam eder — son kapı
 * körelmiyor. Genel olarak kapatılsaydı, bekçiyi hızlandırmak uğruna
 * üretimdeki tek gerçek kapı kaldırılmış olurdu.
 */
const bekciDerlemesi = process.env.BEKCI_DERLEME === "1";

const nextConfig: NextConfig = {
  /**
   * ⛔ TİP KONTROLÜ BEKÇİDE İKİ KEZ KOŞMAZ. `tsc:dogrula` zaten
   * `tsc --noEmit` koşuyor; build içindeki ikinci koşum hem gereksiz hem
   * pahalı — ölçüldü 30.08.2026: açıkken BELLEKTEN DÜŞÜYOR, kapalıyken
   * 122 sn'de çıkış 0.
   */
  typescript: { ignoreBuildErrors: bekciDerlemesi },
  /**
   * ⚠ AYRI ÇIKTI DİZİNİ: `.next`e yazsaydı açık bir `next dev` sunucusunun
   * yapısını ezer ve geliştirme ortası bozulurdu.
   */
  ...(bekciDerlemesi ? { distDir: ".next-bekci" } : {}),
  /**
   * TELEFONDAN TEST İÇİN GEREKLİ — sadece geliştirmeyi etkiler.
   *
   * Next.js geliştirme sunucusu, başlatıldığı adres (localhost) dışından
   * gelen istekleri /_next/static altındaki JavaScript parçalarına
   * güvenlik gereği ENGELLER. Telefondan http://192.168.178.59:3000
   * açıldığında sayfanın HTML ve CSS'i geliyor ama JavaScript'i gelmiyor;
   * sonuç olarak menü, diyaloglar ve butonlar sessizce ölü kalıyor.
   *
   * Buraya yerel ağ adresinizi yazıyoruz. Modem IP'nizi değiştirirse
   * (ipconfig ile bakabilirsiniz) bu satırı güncelleyip dev sunucusunu
   * yeniden başlatmak gerekir.
   *
   * Üretimde (Vercel) böyle bir kısıt yoktur; bu ayarın karşılığı yoktur.
   */
  allowedDevOrigins: ["192.168.178.59"],
};

export default nextIntlIle(nextConfig);
