import {
  GRAFIK_KUTUSU as G,
  eksen,
  eksenIsaretleri,
  etiketAtlamasi,
  xKonumu,
  yKonumu,
} from "./grafik-olcek";

/**
 * ============================================================================
 *  TEK SERİLİ ÇİZGİ GRAFİĞİ (K117, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  Envanter gelişimi ve ortalama kâr marjı için. İkisi de TEK bir sayı
 *  taşıyor; `CizgiGrafik` ise NET-2 + ciro ikilisi etrafında kurulu.
 *
 *  ⛔ NİYE `CizgiGrafik`E MARJI "gelir" DİYE VERMEDİM: teknik olarak
 *  çalışırdı ve tam bu yüzden tehlikeli. `gelir` alanına yüzde koymak, o
 *  dosyayı sonradan okuyan birine yanlış bir şey söyler — alanın ADI
 *  taşıdığı şeyi anlatmak zorundadır.
 *  _(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_
 *
 *  ── ⚠ BOŞ NOKTA "SIFIR" DEĞİLDİR ──────────────────────────────────────
 *  `deger: null` gelen ay çizilmez ve çizgi o ayı ATLAR. Sıfıra çekseydik
 *  satışı olmayan bir ay "%0 marj" gibi görünür ve eğrinin dibinde sahte
 *  bir çukur açardı. _(`CizgiGrafik`teki "kayıtlı olmayan ay da eksende
 *  durur — çizgi o ayı atlamaz" kuralının tersi DEĞİL: orada değer 0 diye
 *  BİLİNİYOR, burada BİLİNMİYOR.)_
 * ============================================================================
 */

export type TekNokta = {
  /** Eksende yazan kısa ad ("Ağustos"). */
  etiket: string;
  /** Ekran okuyucu ve `key` için tam ad ("Ağustos 2026"). */
  tamEtiket: string;
  /** `null` = o ay için hüküm YOK (hesaplanamadı ya da veri yok). */
  deger: number | null;
};

export function TekSeriliGrafik({
  noktalar,
  bicimle,
  bicimleKisa,
  bosMesaj,
}: {
  noktalar: TekNokta[];
  /** Eksen etiketleri — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  /** Nokta üstündeki kısa rakam. Verilmezse nokta rakamı çizilmez. */
  bicimleKisa?: (deger: number) => string;
  bosMesaj: string;
}) {
  const dolular = noktalar.filter(
    (n): n is TekNokta & { deger: number } => n.deger !== null,
  );
  if (dolular.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {bosMesaj}
      </p>
    );
  }

  const y = eksen(dolular.map((n) => n.deger));
  const isaretler = eksenIsaretleri(y);
  const atla = etiketAtlamasi(noktalar.length);
  const x = (i: number) => xKonumu(i, noktalar.length);
  const yk = (d: number) => yKonumu(d, y);

  /**
   * ⚠ ÇİZGİ YALNIZ DOLU NOKTALARI BİRLEŞTİRİR ama X KONUMU HERKESİN KENDİ
   * SIRASINDAN gelir. Boş ayı listeden düşürüp sıralasaydık eksen kayardı:
   * Mart ile Mayıs arasındaki boşluk yok olur, iki ay bitişik görünürdü.
   */
  const cizgi = noktalar
    .map((n, i) => (n.deger === null ? null : `${x(i)},${yk(n.deger)}`))
    .filter((p): p is string => p !== null)
    .join(" ");

  const sifirY = yk(0);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${G.genislik} ${G.yukseklik}`}
        className="h-auto max-h-[260px] w-full min-w-[560px]"
        role="img"
        aria-hidden="true"
      >
        {/* --- kılavuz çizgileri --- */}
        <g className="text-border">
          {isaretler.map((deger) => (
            <line
              key={deger}
              x1={G.sol}
              x2={G.genislik - G.sag}
              y1={yk(deger)}
              y2={yk(deger)}
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
        </g>
        <g className="text-muted-foreground" fontSize={12}>
          {isaretler.map((deger) => (
            <text
              key={deger}
              x={G.sol - 8}
              y={yk(deger) + 4}
              textAnchor="end"
              fill="currentColor"
            >
              {bicimle(deger)}
            </text>
          ))}
        </g>

        {/* --- sıfır çizgisi: eksiye düşen marj burada görünür --- */}
        {y.alt < 0 ? (
          <line
            x1={G.sol}
            x2={G.genislik - G.sag}
            y1={sifirY}
            y2={sifirY}
            className="text-foreground"
            stroke="currentColor"
            strokeWidth={1.5}
          />
        ) : null}

        <polyline
          points={cizgi}
          className="text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <g className="text-primary">
          {noktalar.map((n, i) =>
            n.deger === null ? null : (
              <circle
                key={n.tamEtiket}
                cx={x(i)}
                cy={yk(n.deger)}
                r={3.5}
                fill="currentColor"
              />
            ),
          )}
        </g>

        {/* --- nokta rakamları --- */}
        {bicimleKisa ? (
          <g className="text-foreground" fontSize={11} fontWeight={600}>
            {noktalar.map((n, i) =>
              n.deger !== null && i % atla === 0 ? (
                <text
                  key={n.tamEtiket}
                  x={x(i)}
                  y={yk(n.deger) - 10}
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {bicimleKisa(n.deger)}
                </text>
              ) : null,
            )}
          </g>
        ) : null}

        {/* --- ay etiketleri --- */}
        <g className="text-muted-foreground" fontSize={12}>
          {noktalar.map((n, i) =>
            i % atla === 0 ? (
              <text
                key={n.tamEtiket}
                x={x(i)}
                y={G.yukseklik - 12}
                textAnchor="middle"
                fill="currentColor"
              >
                {n.etiket}
              </text>
            ) : null,
          )}
        </g>
      </svg>
    </div>
  );
}
