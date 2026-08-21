/**
 * ============================================================================
 *  ÜÇ SERİLİ ÇİZGİ GRAFİK — ELLE SVG, KÜTÜPHANE YOK
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `cizgi-grafik.tsx` GENELLEŞTİRİLMEDİ:
 *  O bileşen iki seriye (`gelir`/`net2`) ve AYLIK eksene göre kurulmuş,
 *  içinde ölçülmüş kararlar var (viewBox oranı, eksen aralığı, boş veri
 *  metni). Genelleştirmek çalışan bir grafiği yeniden yazmak olurdu ve
 *  aylık grafiğin garantilerini riske atardı. Bu dosya AYNI DESENİ izler
 *  ama kendi sözleşmesiyle yaşar; ikisi ayrışırsa da biri ötekini bozmaz.
 *
 *  KÜTÜPHANE KARARI DEĞİŞMEDİ (12.08.2026, kalıcı): grafik kütüphanesi
 *  kullanılmaz — 12–31 noktalı üç çizgi için Redux/immer/d3 getirmek
 *  bağımlılık ve güvenlik yüzeyi demekti. Elle SVG sunucuda çizilir,
 *  `"use client"` gerekmez, karanlık tema `currentColor` ile kendiliğinden
 *  çalışır.
 *
 *  ERİŞİLEBİLİRLİK: Altındaki tablo SÜS DEĞİL, asıl okunabilir hâlidir.
 *  Ekran okuyucu ve dokunmatik cihaz (hover yok) oradan okur; SVG
 *  `aria-hidden` ile geçilir.
 * ============================================================================
 */

export type UcSeriNoktasi = {
  /** Eksende yazan kısa etiket — "21 Ağu". */
  etiket: string;
  /** Tam metin — tabloda ve `title`da. */
  tamEtiket: string;
  a: number;
  b: number;
  c: number;
};

/**
 * Çizim alanı — kullanıcı birimi (viewBox), piksel değil.
 * Oran 4,4:1; gerekçesi `cizgi-grafik.tsx`te ölçülmüş: yüksek kutu bilgi
 * taşımaz, yalnız yer kaplar ve ekranın üçte birini yer.
 */
const G = {
  genislik: 1240,
  yukseklik: 280,
  sol: 110,
  sag: 16,
  ust: 16,
  alt: 34,
} as const;

const IC_GENISLIK = G.genislik - G.sol - G.sag;
const IC_YUKSEKLIK = G.yukseklik - G.ust - G.alt;
const ARALIK = 4;

export function UcSeriliGrafik({
  noktalar,
  adlar,
  bicimle,
  bosMesaj,
}: {
  noktalar: UcSeriNoktasi[];
  adlar: { a: string; b: string; c: string };
  /** Değeri ekran biçimine çevirir — dil altyapısından gelir. */
  bicimle: (deger: number) => string;
  bosMesaj: string;
}) {
  if (noktalar.length === 0) {
    return <p className="text-muted-foreground text-sm">{bosMesaj}</p>;
  }

  const tumu = noktalar.flatMap((n) => [n.a, n.b, n.c]);
  const hamTavan = Math.max(...tumu, 0);
  /**
   * ⚠ TAVAN SIFIR OLAMAZ. Hiç hareket olmayan bir dönemde bölme sıfıra
   * düşer ve bütün noktalar NaN olurdu; grafik boş değil BOZUK çizilirdi.
   */
  const tavan = hamTavan === 0 ? 1 : hamTavan;

  const x = (i: number) =>
    noktalar.length === 1
      ? G.sol + IC_GENISLIK / 2
      : G.sol + (i / (noktalar.length - 1)) * IC_GENISLIK;
  const y = (d: number) => G.ust + IC_YUKSEKLIK - (d / tavan) * IC_YUKSEKLIK;

  const yol = (sec: (n: UcSeriNoktasi) => number) =>
    noktalar.map((n, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(sec(n))}`).join(" ");

  /**
   * ⚠ ETİKET SEYRELTİLİR. 31 günlük pencerede her günün adı yazılsaydı
   * yazılar üst üste biner ve eksen okunmaz olurdu. En fazla ~10 etiket.
   */
  const adim = Math.max(1, Math.ceil(noktalar.length / 10));

  /** Üç seri, üç ayrı renk — hepsi Tailwind belirtecinden, tema uyumlu. */
  const seriler = [
    { anahtar: "a" as const, ad: adlar.a, sinif: "text-chart-1" },
    { anahtar: "b" as const, ad: adlar.b, sinif: "text-chart-2" },
    { anahtar: "c" as const, ad: adlar.c, sinif: "text-chart-4" },
  ];

  return (
    <div className="min-w-0 space-y-3">
      {/* GÖSTERGE — renk tek başına konuşmaz, adı yanında yazar (kısıt #1). */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {seriler.map((s) => (
          <span key={s.anahtar} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={`inline-block h-0.5 w-4 rounded ${s.sinif}`}
              style={{ backgroundColor: "currentColor" }}
            />
            {s.ad}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${G.genislik} ${G.yukseklik}`}
        className="w-full"
        aria-hidden
      >
        {/* Y ekseni çizgileri ve değerleri */}
        {Array.from({ length: ARALIK + 1 }, (_, i) => {
          const deger = (tavan / ARALIK) * i;
          const yy = y(deger);
          return (
            <g key={i}>
              <line
                x1={G.sol}
                y1={yy}
                x2={G.genislik - G.sag}
                y2={yy}
                className="text-border"
                stroke="currentColor"
                strokeWidth={1}
              />
              <text
                x={G.sol - 8}
                y={yy + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[13px]"
              >
                {bicimle(deger)}
              </text>
            </g>
          );
        })}

        {/* X ekseni etiketleri — seyreltilmiş */}
        {noktalar.map((n, i) =>
          i % adim === 0 || i === noktalar.length - 1 ? (
            <text
              key={n.etiket + i}
              x={x(i)}
              y={G.yukseklik - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[13px]"
            >
              {n.etiket}
            </text>
          ) : null,
        )}

        {seriler.map((s) => (
          <path
            key={s.anahtar}
            d={yol((n) => n[s.anahtar])}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            className={s.sinif}
          />
        ))}
      </svg>

      {/*
        ⚠ TABLO ASIL OKUNABİLİR HÂL — süs değil.
        Dokunmatik cihazda hover yok; SVG'den değer okunamaz. Ekran okuyucu
        da SVG'yi atlıyor (`aria-hidden`). Bu tablo olmadan grafik, veriyi
        yalnız GÖREBİLENLERE gösterir.
      */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="py-1 pr-2 font-normal">—</th>
              {seriler.map((s) => (
                <th key={s.anahtar} className="py-1 pr-2 text-right font-normal">
                  {s.ad}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {noktalar.map((n, i) => (
              <tr key={n.tamEtiket + i} className="border-b last:border-0">
                <td className="text-muted-foreground py-1 pr-2 whitespace-nowrap">
                  {n.tamEtiket}
                </td>
                {seriler.map((s) => (
                  <td
                    key={s.anahtar}
                    className="py-1 pr-2 text-right tabular-nums"
                  >
                    {bicimle(n[s.anahtar])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
