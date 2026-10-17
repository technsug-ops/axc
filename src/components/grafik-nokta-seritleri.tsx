import { GRAFIK_KUTUSU as G } from "./grafik-olcek";

/**
 * DOKUNMA ŞERİTLERİ (K109) — sunucuda çizilir, SVG'nin EN ÜSTÜNE konur.
 * Grafiğin iç alanını noktalar arası orta çizgilerden boşluksuz dilimler;
 * `GrafikNoktaPenceresi` tıklamayı `data-nokta` ile, noktanın ekrandaki
 * yerini `data-nokta-isaret` ile bulur. `null` konumlu nokta şerit almaz
 * (hüküm yok → pencere yok).
 */
export function NoktaSeritleri({
  noktalar,
  alan,
}: {
  noktalar: ({ x: number; y: number } | null)[];
  /**
   * Şeritlerin kapladığı iç alan (SVG birimi). Verilmezse `GRAFIK_KUTUSU`.
   * K344: kârlılık kartı grafikleri kendi kutusuyla çizilir (900×260); ortak
   * kutuyla dilimlense şeritler çizimin dışına taşardı.
   */
  alan?: { sol: number; sag: number; ust: number; alt: number };
}) {
  const xler = noktalar.map((n) => n?.x ?? null);
  const dolu = xler.flatMap((x, i) => (x === null ? [] : [{ x, i }]));
  const sinir = alan ?? { sol: G.sol, sag: G.genislik - G.sag, ust: G.ust, alt: G.yukseklik - G.alt };
  const ust = sinir.ust;
  const alt = sinir.alt;
  return (
    <g>
      {dolu.map(({ x, i }, k) => {
        const sol = k === 0 ? sinir.sol : (dolu[k - 1].x + x) / 2;
        const sag = k === dolu.length - 1 ? sinir.sag : (x + dolu[k + 1].x) / 2;
        const n = noktalar[i]!;
        return (
          <g key={i}>
            <rect
              data-nokta={i}
              x={sol}
              y={ust}
              width={Math.max(1, sag - sol)}
              height={alt - ust}
              fill="transparent"
              className="cursor-pointer"
            />
            <circle data-nokta-isaret={i} cx={n.x} cy={n.y} r={1} fill="transparent" pointerEvents="none" />
          </g>
        );
      })}
    </g>
  );
}
