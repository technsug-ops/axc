import { ImageResponse } from "next/og";

import {
  B_YOLU,
  ELMAS_YOLU,
  MARKA_PALETI,
  MIKRO_B_YOLU,
  MIKRO_ELMAS_YOLU,
} from "@/lib/marka/cizim";

/**
 * ============================================================================
 *  MARKA İKONU — TEK ÇİZİM, HER BOYUT
 * ----------------------------------------------------------------------------
 *  Sekme simgesi, iOS ana ekran simgesi ve PWA manifest simgeleri AYNI
 *  gövdeden çizilir. Üç ayrı dosyaya üç ayrı çizim yazılsaydı biri
 *  değiştiğinde ötekiler sessizce eski kalırdı — telefonda bir renk,
 *  sekmede başka renk.
 *
 *  ⚠ ÇİZİM `lib/marka/cizim.tsx`TEN GELİR (04.10.2026, Bezirga paketi).
 *  Önceden `UYGULAMA.ad`ın baş harfi yazılıyordu; logo artık bir harf değil
 *  bir çizim ve sol menü de aynı yolları kullanıyor. `public/` içine hazır
 *  PNG konmadı: menü ile simge ayrı kaynaktan beslenirse biri eskir.
 *
 *  ⚠ ZEMİN MARKA KOBALTI, TEMA KABUĞU DEĞİL. Simge tema seçimini bilemez;
 *  kobalt hem varsayılan temanın kabuğu hem marka rengi (ikisi aynı değer,
 *  `pwa:dogrula` kabuk tarafını ölçer).
 * ============================================================================
 */

type İkonSecenegi = {
  boyut: number;
  /**
   * Android ikonu daire/kare/damla olarak KIRPAR. Kırpılacak ikonda köşe
   * yuvarlatma YAPILMAZ (zaten maskeleniyor) ve işaret küçültülür: güvenli
   * alan ikonun orta %80'lik dairesidir. İşaretin en uzak köşesi (64,40)
   * merkezden 108,8 birim — 256'lık ızgarada güvenli yarıçap 102,4. Bu
   * yüzden maskelide işaret %80'e iner (87 birim, payla içeride).
   */
  maskeli?: boolean;
};

/** 32 px ve altında paketin MİKRO çizimi (kılavuz: «16 ve 32 px'de mikro»). */
const MIKRO_SINIR = 32;

/** Ortak çizim — boyuttan bağımsız oranlar. */
export function markaIkonu({ boyut, maskeli = false }: İkonSecenegi) {
  const mikro = !maskeli && boyut <= MIKRO_SINIR;
  /** Yuvarlatma paketteki oran: 256'da 56 (mikro 16'da 3,5 — aynı oran). */
  const yaricap = maskeli ? 0 : Math.round(boyut * (56 / 256));
  const olcek = maskeli ? 0.8 : 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: MARKA_PALETI.kobalt,
          borderRadius: yaricap,
        }}
      >
        <svg
          width={Math.round(boyut * olcek)}
          height={Math.round(boyut * olcek)}
          viewBox={mikro ? "0 0 16 16" : "0 0 256 256"}
        >
          <path d={mikro ? MIKRO_B_YOLU : B_YOLU} fill={MARKA_PALETI.beyaz} />
          <path d={mikro ? MIKRO_ELMAS_YOLU : ELMAS_YOLU} fill={MARKA_PALETI.safran} />
        </svg>
      </div>
    ),
    { width: boyut, height: boyut },
  );
}
