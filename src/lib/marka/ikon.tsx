import { ImageResponse } from "next/og";

import { MARKA_RENKLERI } from "@/lib/marka/renkler";
import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  MARKA İKONU — TEK ÇİZİM, HER BOYUT
 * ----------------------------------------------------------------------------
 *  Sekme simgesi, iOS ana ekran simgesi ve PWA manifest simgeleri AYNI
 *  gövdeden çizilir. Üç ayrı dosyaya üç ayrı çizim yazılsaydı biri
 *  değiştiğinde ötekiler sessizce eski kalırdı — telefonda bir renk,
 *  sekmede başka renk.
 *
 *  ⚠ HARF `UYGULAMA.ad`DAN GELİR, ELLE YAZILMAZ. Anayasa: "Ad değişikliği
 *  tek satırlık iş olmalıdır." Sol menüdeki marka karesi de aynı harfi aynı
 *  şekilde alıyor (`app-sidebar.tsx`), yani ad değişince ikisi birlikte
 *  döner. `public/` içine hazır PNG konsaydı bu bağ kopardı.
 * ============================================================================
 */


type İkonSecenegi = {
  boyut: number;
  /**
   * Android ikonu daire/kare/damla olarak KIRPAR. Kırpılacak ikonda köşe
   * yuvarlatma YAPILMAZ (zaten maskeleniyor) ve harf küçük tutulur: güvenli
   * alan ikonun orta %80'lik dairesidir, harf onun da içinde kalmalı.
   * Yoksa telefonda "S" nin kenarları yenir.
   */
  maskeli?: boolean;
};

/** Ortak çizim — boyuttan bağımsız oranlar. */
export function markaIkonu({ boyut, maskeli = false }: İkonSecenegi) {
  const harf = UYGULAMA.ad.charAt(0).toLocaleUpperCase("tr-TR");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MARKA_RENKLERI.zemin,
          color: MARKA_RENKLERI.yazi,
          /* Maskeli: tam kare (OS kırpar). Normal: sol menüdeki kare gibi
             yuvarlatılmış — oran shadcn'in `rounded-md`sine yakın. */
          borderRadius: maskeli ? 0 : Math.round(boyut * 0.22),
          fontSize: Math.round(boyut * (maskeli ? 0.48 : 0.62)),
          /* ⚠ `letterSpacing` VE `fontWeight` BİLEREK YOK.
             · Harf aralığı tek harfte SAĞA boşluk ekler; kutu ortalanınca
               harf sola kaymış görünür. İlk çizimde tam bu oldu.
             · `fontWeight: 700` yazılmıştı ve HİÇBİR ŞEY YAPMIYORDU: çizici
               (`next/og`) yalnız normal ağırlıkta gömülü bir yazı tipi
               taşıyor, kalın sürümü yok. Sahip olmadığı etkiyi iddia eden
               bir satırdı; kaldırıldı. Kalın istenirse yol, yazı tipi
               dosyasını depoya koyup `fonts` seçeneğiyle vermektir —
               `.next` önbelleğindeki adı her derlemede değişen dosyaya
               bağlanmak DEĞİL. */
          lineHeight: 1,
        }}
      >
        {harf}
      </div>
    ),
    { width: boyut, height: boyut },
  );
}
