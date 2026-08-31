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

/**
 * ⚠ ÖLÇEK GÖVDESİ ARTIK BURADA DEĞİL — `grafik-olcek.ts`e taşındı
 * (K117, 31.08.2026). İkinci bir grafik doğunca bu blok KOPYALANACAKTI;
 * kopyalanan bir eksen gövdesi, biri düzeltilip öteki unutulunca iki
 * grafiği farklı ölçekte gösterir ve fark ancak yan yana konunca görünür.
 * ⚠ KUTU ÖLÇÜSÜNÜN GEREKÇESİ DE ORAYA TAŞINDI — kararın izi koddan ayrı
 * kalmaz.
 */

export function CizgiGrafik({
  noktalar,
  gelirAdi,
  net2Adi,
  bicimle,
  bicimleKisa,
  bosMesaj,
  net2Goster = true,
}: {
  noktalar: GrafikNoktasi[];
  gelirAdi: string;
  net2Adi: string;
  /** Tutarı ekran biçimine çevirir — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  /**
   * Nokta üstüne yazılacak KISA biçim (`₺1,7 Mn`). Verilmezse nokta
   * rakamları çizilmez — grafiği kullanan her ekran aynı anda değişmek
   * zorunda kalmasın diye isteğe bağlı.
   *
   * ⚠ TAM TUTAR İÇİN DEĞİL. Kısaltma bir yuvarlamadır; hüküm kurulacak
   * rakam katlı tablodan okunur.
   */
  bicimleKisa?: (deger: number) => string;
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

  /** Konum ve ölçek `grafik-olcek.ts`ten — tek gövde, iki grafik. */
  const x = (i: number) => xKonumu(i, noktalar.length);
  const yKonum = (deger: number) => yKonumu(deger, y);

  const cizgi = (sec: (n: GrafikNoktasi) => number) =>
    noktalar.map((n, i) => `${x(i)},${yKonum(sec(n))}`).join(" ");

  const sifirY = yKonum(0);
  const alan = `${x(0)},${sifirY} ${cizgi(anaSeri)} ${x(noktalar.length - 1)},${sifirY}`;

  const isaretler = eksenIsaretleri(y);
  const etiketAtla = etiketAtlamasi(noktalar.length);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${G.genislik} ${G.yukseklik}`}
        className="h-auto max-h-[260px] w-full min-w-[560px]"
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
        <g className="text-muted-foreground" fontSize={12}>
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
        <polygon
          points={alan}
          className="text-primary"
          fill="currentColor"
          opacity={0.1}
        />
        <polyline
          points={cizgi(anaSeri)}
          className="text-primary"
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
        <g className="text-primary">
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

        {/* ================= NOKTA RAKAMLARI (K117, 31.08.2026) =============
            KULLANICI İSTEĞİ: "kırılımların üzerinde rakamlar okunsun."
            Eğri hangi ay yükseldiğini söylüyordu ama NE KADAR olduğunu
            söylemiyordu; okuyan katlı tabloyu açmak zorundaydı.

            ⛔ TAM TUTAR YAZILMIYOR, KISASI YAZILIYOR. `₺1.713.105,54` on iki
            nokta yan yana konunca üst üste biner ve eklenen etiket,
            eklenmemiş hâlden KÖTÜ olur. `bicimleKisa` bunu `₺1,7 Mn` yapar
            ve tam rakam bir tık ötedeki tabloda DURMAYA devam eder.

            ⚠ ETİKET ATLAMASI AY ETİKETİYLE AYNI RİTİMDE (`etiketAtla`):
            iki ayrı ritim olsaydı bazı aylarda rakam olur ay adı olmaz,
            okuyan hangi aya ait olduğunu bilemezdi.

            ⚠ YALNIZ ANA SERİ ETİKETLENİYOR. İki seriyi birden yazmak aynı
            dikey şeride iki rakam koyardı; hangisinin hangi çizgiye ait
            olduğu ancak renkten anlaşılırdı ve renk tek başına bilgi
            taşımaz (erişilebilirlik). Ciro rakamı tabloda duruyor. */}
        {bicimleKisa ? (
          <g className="text-foreground" fontSize={11} fontWeight={600}>
            {noktalar.map((n, i) =>
              i % etiketAtla === 0 ? (
                <text
                  key={n.tamEtiket}
                  x={x(i)}
                  /* ⚠ 10px YUKARI: nokta işaretinin (r=3.5) üstünde durur;
                     üstüne binerse iki öğe de okunmaz olur. */
                  y={yKonum(anaSeri(n)) - 10}
                  textAnchor="middle"
                  fill="currentColor"
                >
                  {bicimleKisa(anaSeri(n))}
                </text>
              ) : null,
            )}
          </g>
        ) : null}

        {/* --- ay etiketleri --- */}
        <g className="text-muted-foreground" fontSize={12}>
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
          <svg width={22} height={8} aria-hidden="true" className="text-primary">
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
