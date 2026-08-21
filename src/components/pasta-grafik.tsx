"use client";

/**
 * ============================================================================
 *  PASTA GRAFİK — "SATIŞ FİYATI NEREYE GİDİYOR"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026 (nesatilir'in "Satış Grafiği"ne benzer):
 *  animasyonlu pasta, HER PAZARYERİ İÇİN ayrı.
 *
 *  ── KÜTÜPHANE YOK ───────────────────────────────────────────────────────
 *  Elle çizilmiş SVG. Bir grafik kütüphanesi tek bir pasta için ~50 KB
 *  taşırdı ve bu depoda zaten elle çizilen grafikler var
 *  (`uc-serili-grafik.tsx`) — ikinci bir çizim dili girmesin.
 *
 *  ── ANİMASYON: DAİRE, PATH DEĞİL ────────────────────────────────────────
 *  Dilimler `stroke-dasharray` ile çizilmiş HALKA parçaları. Sebebi CSS ile
 *  animasyon: `stroke-dashoffset` geçişi tek satırlık ve GPU'da akıcı;
 *  `<path>` ile aynı etkiyi kurmak her karede yeni yay hesabı isterdi.
 *
 *  ⚠ VE ANİMASYON HAREKET AZALTMA AYARINA SAYGI DUYUYOR: `prefers-reduced-
 *  motion` açıksa geçiş yok, grafik doğrudan son hâliyle çiziliyor.
 *
 *  ── RENK TEK BAŞINA KONUŞMAZ (renk sistemi kısıt #1) ────────────────────
 *  Her dilimin YANINDA etiketi ve tutarı yazıyor. Pasta yalnız oranı sezdirir;
 *  bilgiyi taşıyan şey listedir. Renk körü bir kullanıcı için grafik süs,
 *  liste veridir.
 * ============================================================================
 */

export type PastaDilimi = {
  /** Sözlükten çözülmüş etiket — bu bileşen metin üretmez. */
  etiket: string;
  tutar: number;
  /** Tailwind sınıfı değil, ham renk: SVG `stroke` niteliği alır. */
  renk: string;
};

const R = 60;
const CEVRE = 2 * Math.PI * R;

export function PastaGrafik({
  dilimler,
  toplam,
  bicimle,
  bosMesaj,
}: {
  dilimler: PastaDilimi[];
  /** Paydanın kendisi — satış fiyatı. Dilimler toplamı bundan küçük olabilir. */
  toplam: number;
  bicimle: (n: number) => string;
  bosMesaj: string;
}) {
  const gecerli = dilimler.filter((d) => d.tutar > 0);
  if (gecerli.length === 0 || toplam <= 0) {
    return <p className="text-muted-foreground text-xs">{bosMesaj}</p>;
  }

  /**
   * ⚠ PAYDA SATIŞ FİYATI, DİLİM TOPLAMI DEĞİL. Kâr da bir dilim olduğu için
   * ikisi normalde eşittir; ama zarar durumunda kâr dilimi YOKTUR ve
   * kesintiler toplamı satışı AŞAR. O hâlde dilim toplamına bölmek
   * "her şey yolunda" görünen bir pasta üretirdi — zarar kaybolurdu.
   */
  const payda = Math.max(
    toplam,
    gecerli.reduce((t, d) => t + d.tutar, 0),
  );

  /**
   * ⚠ RENDER SIRASINDA DEĞİŞKEN MUTASYONU YOK. İlk yazımda `let bitenAci`
   * map içinde artırılıyordu; React derleyicisi haklı olarak reddetti
   * ("cannot reassign variable after render completes"). Kaymalar ÖNCE
   * hesaplanıyor — üstelik böylesi okunur: her dilim kendinden öncekilerin
   * toplamı kadar kayar.
   */
  const kaymalar = gecerli.reduce<number[]>(
    (dizi, d, i) => [
      ...dizi,
      i === 0 ? 0 : dizi[i - 1]! + (gecerli[i - 1]!.tutar / payda) * CEVRE,
    ],
    [],
  );

  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg
        viewBox="0 0 160 160"
        className="size-32 shrink-0 -rotate-90"
        role="img"
        aria-hidden="true"
      >
        {/* Zemin halkası — dilimler paydayı doldurmuyorsa boşluk görünür. */}
        <circle
          cx="80"
          cy="80"
          r={R}
          fill="none"
          strokeWidth="32"
          className="stroke-muted"
        />
        {gecerli.map((d, i) => {
          const uzunluk = (d.tutar / payda) * CEVRE;
          const kayma = kaymalar[i]!;
          return (
            <circle
              key={d.etiket}
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke={d.renk}
              strokeWidth="32"
              /**
               * ⚠ `pathLength` YOK, gerçek çevre kullanılıyor: tarayıcılar
               * arasında `pathLength` yuvarlaması dilimler arasında saç teli
               * kalınlığında boşluk bırakabiliyor.
               */
              strokeDasharray={`${uzunluk} ${CEVRE - uzunluk}`}
              strokeDashoffset={-kayma}
              style={{
                /** Sırayla açılsın — göz her dilimi ayrı görsün. */
                animation: `pasta-ac 480ms ease-out ${i * 90}ms both`,
              }}
            />
          );
        })}
        <style>{`
          @keyframes pasta-ac { from { opacity: 0 } to { opacity: 1 } }
          @media (prefers-reduced-motion: reduce) {
            circle { animation: none !important }
          }
        `}</style>
      </svg>

      {/* ── LİSTE: ASIL VERİ BURADA ────────────────────────────────────────
          Renk yalnız pastayla eşleştirmeye yarar; etiket ve tutar yazılı. */}
      <ul className="min-w-0 flex-1 space-y-0.5 text-xs">
        {gecerli.map((d) => (
          <li key={d.etiket} className="flex items-center gap-1.5">
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: d.renk }}
            />
            <span className="text-muted-foreground min-w-0 flex-1 truncate">
              {d.etiket}
            </span>
            <span className="shrink-0 tabular-nums">{bicimle(d.tutar)}</span>
            <span className="text-muted-foreground w-10 shrink-0 text-right tabular-nums">
              %{((d.tutar / payda) * 100).toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
