import { GRAFIK_KUTUSU as G } from "./grafik-olcek";

/**
 * DOKUNMA ŞERİTLERİ (K109) — sunucuda çizilir, SVG'nin EN ÜSTÜNE konur.
 * Grafiğin iç alanını noktalar arası orta çizgilerden boşluksuz dilimler;
 * `GrafikNoktaPenceresi` tıklamayı `data-nokta` ile, noktanın ekrandaki
 * yerini `data-nokta-isaret` ile bulur. `null` konumlu nokta şerit almaz
 * (hüküm yok → pencere yok).
 */
export function NoktaSeritleri({ noktalar }: { noktalar: ({ x: number; y: number } | null)[] }) {
  const xler = noktalar.map((n) => n?.x ?? null);
  const dolu = xler.flatMap((x, i) => (x === null ? [] : [{ x, i }]));
  const ust = G.ust;
  const alt = G.yukseklik - G.alt;
  return (
    <g>
      {dolu.map(({ x, i }, k) => {
        const sol = k === 0 ? G.sol : (dolu[k - 1].x + x) / 2;
        const sag = k === dolu.length - 1 ? G.genislik - G.sag : (x + dolu[k + 1].x) / 2;
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
