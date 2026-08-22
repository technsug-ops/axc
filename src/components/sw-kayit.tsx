"use client";

import { useEffect } from "react";

/**
 * ============================================================================
 *  SERVİS ÇALIŞANI KAYDI
 * ----------------------------------------------------------------------------
 *  `public/sw.js` dosyasını tarayıcıya tanıtır. Bu kayıt olmadan telefon
 *  "kur" teklifini göstermez.
 *
 *  ⚠ YALNIZ ÜRETİMDE. Geliştirmede kayıtlı bir servis çalışanı, sıcak
 *  yeniden yükleme (HMR) parçalarını önbelleğe alır ve "kodu değiştirdim,
 *  ekran değişmiyor" der. Saatlerce yanlış yerde hata aranır — bu, bu
 *  deponun defalarca yaşadığı "kod doğru, ekran yanlış" tuzağının
 *  tarayıcıdaki hâli.
 *
 *  ⚠ HİÇBİR DURUM TUTMAZ. Bileşen ekrana bir şey çizmez; `setState` yok,
 *  dolayısıyla efekt içinde durum güncellemesi de yok.
 * ============================================================================
 */
export function SwKayit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let iptal = false;

    /* Sayfa yüklenmesini yavaşlatmasın diye `load` sonrasına bırakılıyor:
       kayıt ağdan bir dosya çeker ve o an ekran hâlâ çiziliyor olabilir. */
    const kaydet = () => {
      if (iptal) return;
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((kayit) => {
          /* Her açılışta yeni sürüm var mı diye sorulur. Sorulmasaydı
             hatalı bir servis çalışanı telefonda günlerce yaşayabilirdi;
             sahadan geri çekmenin tek yolu budur. */
          void kayit.update();
        })
        .catch(() => {
          /* Kayıt başarısız olursa uygulama NORMAL çalışır — yalnız
             "kur" teklifi çıkmaz. Kullanıcıya hata basmak, hiçbir işine
             yaramayan bir uyarı olurdu. */
        });
    };

    if (document.readyState === "complete") kaydet();
    else window.addEventListener("load", kaydet, { once: true });

    return () => {
      iptal = true;
      window.removeEventListener("load", kaydet);
    };
  }, []);

  return null;
}
