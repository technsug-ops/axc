import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

export default nextConfig;
