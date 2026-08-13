/**
 * ============================================================================
 *  ÇİZGİ GRAFİK — ELLE SVG, KÜTÜPHANE YOK
 * ----------------------------------------------------------------------------
 *  KARAR 12.08.2026 (kalıcı): Bu grafik için grafik kütüphanesi KULLANILMAZ.
 *
 *  Gerekçe — Recharts 3.10.1 ölçüldü: kararlı, React 19 uyumlu ve o gün
 *  bilinen açığı yok. Ama 12 noktalı iki çizgi için yanında Redux Toolkit,
 *  react-redux, immer ve d3 (victory-vendor) getiriyor; 11 doğrudan
 *  bağımlılık. Elle SVG'nin karşılığı ~200 satır ve:
 *    - sıfır yeni bağımlılık, dolayısıyla sıfır yeni güvenlik yüzeyi
 *    - renkler Tailwind belirteçlerinden gelir; karanlık tema kendiliğinden
 *      çalışır (stroke="currentColor" + metin sınıfı)
 *    - HİÇ istemci JavaScript'i yok — sunucuda çizilir, "use client" gerekmez
 *
 *  İleride etkileşimli/karmaşık grafik gerekirse karar yeniden tartışılır;
 *  o gün gelene kadar bu dosya tek başına yeterlidir.
 *
 *  ERİŞİLEBİLİRLİK: Grafiğin altındaki tablo süs değil, ASIL okunabilir
 *  hâlidir. Ekran okuyucu ve dokunmatik cihaz (hover yok) oradan okur;
 *  SVG `aria-hidden` ile geçilir.
 * ============================================================================
 */

export type GrafikNoktasi = {
  /** Eksende yazan kısa etiket — "Ağu". */
  etiket: string;
  /** Fare üstüne gelince görünen tam metin — "Ağustos 2026". */
  tamEtiket: string;
  gelir: number;
  net2: number;
};

/** Çizim alanı — kullanıcı birimi (viewBox), piksel değil. */
const G = {
  genislik: 760,
  yukseklik: 260,
  sol: 84,
  sag: 14,
  ust: 16,
  alt: 34,
} as const;

const IC_GENISLIK = G.genislik - G.sol - G.sag;
const IC_YUKSEKLIK = G.yukseklik - G.ust - G.alt;

/** Y ekseninde kaç aralık olacak. 4 aralık = 5 çizgi. */
const ARALIK_SAYISI = 4;

/**
 * Ekseni "güzel" sayılara yaslar: 1, 2, 2,5 ve 5'in katları.
 * Ham maksimumu kullanmak eksende 13.847 gibi okunmaz sayılar üretir.
 */
function guzelAdim(hamAdim: number): number {
  if (hamAdim <= 0) return 1;
  const buyukluk = 10 ** Math.floor(Math.log10(hamAdim));
  const kalan = hamAdim / buyukluk;
  const carpan = kalan <= 1 ? 1 : kalan <= 2 ? 2 : kalan <= 2.5 ? 2.5 : kalan <= 5 ? 5 : 10;
  return carpan * buyukluk;
}

/**
 * Y ekseni sınırları. SIFIR HER ZAMAN İÇERİDEDİR — kâr eksiye düşebilir ve
 * sıfır çizgisi görünmezse "az kâr" ile "zarar" aynı görünür.
 */
function eksen(degerler: number[]) {
  const enBuyuk = Math.max(0, ...degerler);
  const enKucuk = Math.min(0, ...degerler);

  if (enBuyuk === 0 && enKucuk === 0) {
    return { alt: 0, ust: 1, adim: 1 };
  }

  const adim = guzelAdim((enBuyuk - enKucuk) / ARALIK_SAYISI);
  return {
    alt: Math.floor(enKucuk / adim) * adim,
    ust: Math.ceil(enBuyuk / adim) * adim,
    adim,
  };
}

export function CizgiGrafik({
  noktalar,
  gelirAdi,
  net2Adi,
  bicimle,
  bosMesaj,
  net2Goster = true,
}: {
  noktalar: GrafikNoktasi[];
  gelirAdi: string;
  net2Adi: string;
  /** Tutarı ekran biçimine çevirir — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  bosMesaj: string;
  /**
   * NET-2 çizilsin mi. `satis.kar.gor` izni olmayan kullanıcıda KAPALI olur.
   *
   * Kapatınca çizgi silinmez, ASIL ÇİZGİ CİRO OLUR: bu grafik NET-2 etrafında
   * kurulu (alan dolgusu, noktalar, eksen sınırları ondan gelir). Sadece
   * gizleseydik geriye kesikli, soluk, tek başına yetim bir ciro çizgisi
   * kalırdı — grafiği bozuk gösterirdi. Eksen de yalnız cirodan hesaplanır;
   * yoksa boşluk NET-2'nin nerede olduğunu ele verirdi.
   */
  net2Goster?: boolean;
}) {
  const doluMu = noktalar.some((n) => n.gelir !== 0 || (net2Goster && n.net2 !== 0));
  if (noktalar.length === 0 || !doluMu) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {bosMesaj}
      </p>
    );
  }

  /** Kalın çizgi + alan + noktalar bu seriyi izler. */
  const anaSeri = (n: GrafikNoktasi) => (net2Goster ? n.net2 : n.gelir);

  const y = eksen(
    net2Goster
      ? noktalar.flatMap((n) => [n.gelir, n.net2])
      : noktalar.map((n) => n.gelir),
  );

  // Tek noktalı seride payda sıfır olurdu; o durumda nokta ortaya konur.
  const adimX =
    noktalar.length > 1 ? IC_GENISLIK / (noktalar.length - 1) : 0;
  const x = (i: number) =>
    noktalar.length > 1 ? G.sol + i * adimX : G.sol + IC_GENISLIK / 2;
  const yKonum = (deger: number) =>
    G.ust + IC_YUKSEKLIK * (1 - (deger - y.alt) / (y.ust - y.alt));

  const cizgi = (sec: (n: GrafikNoktasi) => number) =>
    noktalar.map((n, i) => `${x(i)},${yKonum(sec(n))}`).join(" ");

  const sifirY = yKonum(0);
  const alan = `${x(0)},${sifirY} ${cizgi(anaSeri)} ${x(noktalar.length - 1)},${sifirY}`;

  const isaretler: number[] = [];
  for (let d = y.alt; d <= y.ust + y.adim / 2; d += y.adim) isaretler.push(d);

  // Etiketler sıkışırsa birer atlanır — üst üste binen yazı okunmaz.
  const etiketAtla = Math.ceil(noktalar.length / 12);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${G.genislik} ${G.yukseklik}`}
        className="h-auto w-full min-w-[560px]"
        role="img"
        aria-hidden="true"
      >
        {/* --- yatay kılavuz çizgileri ve tutar etiketleri --- */}
        <g className="text-border">
          {isaretler.map((deger) => (
            <line
              key={deger}
              x1={G.sol}
              x2={G.genislik - G.sag}
              y1={yKonum(deger)}
              y2={yKonum(deger)}
              stroke="currentColor"
              strokeWidth={1}
            />
          ))}
        </g>
        <g className="text-muted-foreground" fontSize={13}>
          {isaretler.map((deger) => (
            <text
              key={deger}
              x={G.sol - 8}
              y={yKonum(deger) + 4}
              textAnchor="end"
              fill="currentColor"
            >
              {bicimle(deger)}
            </text>
          ))}
        </g>

        {/* --- sıfır çizgisi: eksiye düşen kâr burada görünür --- */}
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

        {/* --- ana seri: alan ve çizgi (kalın, dolu) --- */}
        <polygon points={alan} className="text-foreground" fill="currentColor" opacity={0.08} />
        <polyline
          points={cizgi(anaSeri)}
          className="text-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* --- ciro çizgisi (kesikli, soluk) — ciro zaten ana çizgiyse yok --- */}
        {net2Goster ? (
          <polyline
            points={cizgi((n) => n.gelir)}
            className="text-muted-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="6 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}

        {/* --- nokta işaretleri --- */}
        <g className="text-foreground">
          {noktalar.map((n, i) => (
            <circle
              key={n.tamEtiket}
              cx={x(i)}
              cy={yKonum(anaSeri(n))}
              r={3.5}
              fill="currentColor"
            />
          ))}
        </g>

        {/* --- ay etiketleri --- */}
        <g className="text-muted-foreground" fontSize={13}>
          {noktalar.map((n, i) =>
            i % etiketAtla === 0 ? (
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

      {/* --- gösterge --- */}
      <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-2">
          <svg width={22} height={8} aria-hidden="true" className="text-foreground">
            <line x1={0} y1={4} x2={22} y2={4} stroke="currentColor" strokeWidth={2.5} />
          </svg>
          {net2Goster ? net2Adi : gelirAdi}
        </span>
        {net2Goster ? (
          <span className="flex items-center gap-2">
            <svg width={22} height={8} aria-hidden="true">
              <line
                x1={0}
                y1={4}
                x2={22}
                y2={4}
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </svg>
            {gelirAdi}
          </span>
        ) : null}
      </div>
    </div>
  );
}
