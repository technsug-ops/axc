/**
 * ============================================================================
 *  HALKA GRAFİK — OK ÇİZGİLİ (K256, 23.09.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği (demo turu): _"yuvarlak olmaz mı, her renkten ok'la
 *  pazaryeri ismi çıkacak şekilde."_ `PastaGrafik` yanına liste koyar; bu
 *  bileşen adı ve tutarı DİLİMİN YANINA ok çizgisiyle bağlar — göz dilim ile
 *  adı eşleştirmek için renk tablosuna bakmaz.
 *
 *  ── SUNUCUDA ÇİZİLİR, "use client" YOK ──────────────────────────────────
 *  `PastaGrafik` fonksiyon prop (`bicimle`) aldığı için istemci bileşeniydi
 *  ve bir sarmalayıcı gerektiriyordu. Burada metinler HAZIR gelir (tutar ve
 *  yüzde biçimlenmiş dize) — RSC sınırından fonksiyon geçmez, sarmalayıcı
 *  gerekmez, karanlık tema `currentColor` sınıflarıyla kendiliğinden çalışır.
 *
 *  ── EN KÜÇÜKLER TEK DİLİMDE ─────────────────────────────────────────────
 *  11 kanal 11 ok demek; küçük dilimlerin okları birbirine girer. Dördü
 *  aşan dilimler «Diğer (N)» olarak toplanır ve bu EKRANDA YAZAR (dipnot):
 *  toplanan bir şey sessizce kaybolmaz.
 *
 *  ── RENK TEK BAŞINA KONUŞMAZ (kısıt #1) ─────────────────────────────────
 *  Her dilimin yanında adı ve tutarı, bandın üstünde yüzdesi yazar. Erişilebilir
 *  ad `aria-label`da tam cümle: ekran okuyucu grafiği atlamaz, okur.
 * ============================================================================
 */

export type HalkaDilimi = {
  etiket: string;
  tutar: number;
  /** Biçimlenmiş tutar — "₺17.890". Bu bileşen para biçimlemez. */
  tutarMetni: string;
  /** Ham renk (SVG `stroke`). Yalnız kategori paleti. */
  renk: string;
};

/** Dördü aşan dilimler tek dilimde toplanır — ok çizgileri birbirine girmesin. */
export const HALKA_DILIM_TAVANI = 4;

const CX = 235;
const CY = 136;
const R = 62;
const KALINLIK = 26;
const CEVRE = 2 * Math.PI * R;

/** Dilimleri tavana indirir: en büyükleri bırakır, kalanı «Diğer»de toplar. */
export function halkaDilimleriniTopla(
  dilimler: readonly HalkaDilimi[],
  digerEtiketi: (sayi: number) => string,
  digerRenk: string,
  digerTutarMetni: (tutar: number) => string,
): { dilimler: HalkaDilimi[]; toplananSayi: number } {
  const gecerli = [...dilimler].filter((d) => d.tutar > 0).sort((a, b) => b.tutar - a.tutar);
  if (gecerli.length <= HALKA_DILIM_TAVANI) return { dilimler: gecerli, toplananSayi: 0 };
  const kalan = gecerli.slice(HALKA_DILIM_TAVANI - 1);
  const tutar = kalan.reduce((t, d) => t + d.tutar, 0);
  return {
    dilimler: [
      ...gecerli.slice(0, HALKA_DILIM_TAVANI - 1),
      { etiket: digerEtiketi(kalan.length), tutar, tutarMetni: digerTutarMetni(tutar), renk: digerRenk },
    ],
    toplananSayi: kalan.length,
  };
}

/** Bir etiket iki satır (ad + tutar) ≈ 28 birim; oklar bundan yakın olamaz. */
export const OK_ETIKET_ARALIGI = 30;
/** Yazı en fazla ~90 birim; uç bu payı kadrajın dışına taşıramaz. */
const OK_UC_X_SOL = 96;
const OK_UC_X_SAG = 470 - 96;

export type OkUcu = { sagda: boolean; x: number; y: number };

/**
 * OK UÇLARINI AYIRIR VE KADRAJDA TUTAR (K261, 24.09.2026).
 * Kullanıcı: «halkanın yanındaki yazılar problemli». İki dilim yan yana
 * küçükse okları aynı noktaya varır ve yazılar üst üste biner; uç kadraj
 * kenarına yakınsa ad kesilir. Aynı taraftaki uçlar y'ye göre sıralanır ve
 * en az `OK_ETIKET_ARALIGI` kadar itilir; x sınıra kırpılır. SAF — SVG'den
 * bağımsız, değer testiyle sınanır. Sıra korunur (girdi indeksine göre döner).
 */
export function okEtiketleriniAyir(uclar: readonly OkUcu[]): OkUcu[] {
  const sonuc = uclar.map((u) => ({
    ...u,
    x: u.sagda ? Math.min(u.x, OK_UC_X_SAG) : Math.max(u.x, OK_UC_X_SOL),
  }));
  for (const taraf of [true, false]) {
    const indeksler = sonuc
      .map((u, i) => (u.sagda === taraf ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => sonuc[a]!.y - sonuc[b]!.y);
    for (let k = 1; k < indeksler.length; k++) {
      const onceki = sonuc[indeksler[k - 1]!]!;
      const bu = sonuc[indeksler[k]!]!;
      if (bu.y - onceki.y < OK_ETIKET_ARALIGI) {
        sonuc[indeksler[k]!] = { ...bu, y: onceki.y + OK_ETIKET_ARALIGI };
      }
    }
  }
  return sonuc;
}

export function HalkaGrafik({
  dilimler,
  toplam,
  toplamMetni,
  toplamEtiketi,
  yuzdeMetni,
  dipnot,
  bosMesaj,
  aciklama,
}: {
  dilimler: HalkaDilimi[];
  /** Payda — brüt ciro. Dilim toplamı bundan küçük olabilir; boşluk görünür. */
  toplam: number;
  /** Biçimlenmiş toplam — halkanın ortasında. */
  toplamMetni: string;
  /** "Toplam ciro" — ortadaki küçük yazı. */
  toplamEtiketi: string;
  /** Yüzdeyi ekran biçimine çevirir: (57.2) → "%57". Dil altyapısından gelir. */
  yuzdeMetni: (oran: number) => string;
  /** Alt dipnot — «Diğer» toplandıysa bunu yazar; yoksa boş geçilir. */
  dipnot?: string;
  bosMesaj: string;
  /** Ekran okuyucu için tam cümle — çağıran kurar (dil altyapısı). */
  aciklama: string;
}) {
  const gecerli = dilimler.filter((d) => d.tutar > 0);
  if (gecerli.length === 0 || toplam <= 0) {
    return <p className="text-muted-foreground text-xs">{bosMesaj}</p>;
  }
  const payda = Math.max(toplam, gecerli.reduce((t, d) => t + d.tutar, 0));

  /** Kaymalar önce hesaplanır — render içinde değişken mutasyonu yok. */
  const kaymalar = gecerli.reduce<number[]>(
    (dizi, d, i) => [...dizi, i === 0 ? 0 : dizi[i - 1]! + (gecerli[i - 1]!.tutar / payda) * CEVRE],
    [],
  );

  const yerlesim = gecerli.map((d, i) => {
    const uzunluk = (d.tutar / payda) * CEVRE;
    const ortaAci = ((kaymalar[i]! + uzunluk / 2) / CEVRE) * 2 * Math.PI - Math.PI / 2;
    const cos = Math.cos(ortaAci);
    const sin = Math.sin(ortaAci);
    const sagda = cos >= 0;
    /* Ok: bant dışından (R + kalınlık/2 + 3) dirseğe (R + 52), sonra yatay 16. */
    const bas = { x: CX + (R + KALINLIK / 2 + 3) * cos, y: CY + (R + KALINLIK / 2 + 3) * sin };
    const dirsek = { x: CX + (R + 52) * cos, y: CY + (R + 52) * sin };
    const uc = { x: dirsek.x + (sagda ? 16 : -16), y: dirsek.y };
    return {
      d,
      uzunluk,
      kayma: kaymalar[i]!,
      yuzde: (d.tutar / payda) * 100,
      bant: { x: CX + R * cos, y: CY + R * sin + 4 },
      bas,
      dirsek,
      uc,
      sagda,
    };
  });

  /* Uçlar ayrılır; ok, dirsekten AYRILMIŞ uca gider (K261). */
  const uclar = okEtiketleriniAyir(yerlesim.map((y) => ({ sagda: y.sagda, ...y.uc })));
  const yerlesimAyrik = yerlesim.map((y, i) => ({ ...y, uc: { x: uclar[i]!.x, y: uclar[i]!.y } }));

  return (
    <svg
      viewBox="0 0 470 266"
      className="block h-auto w-full"
      role="img"
      aria-label={aciklama}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={KALINLIK} className="stroke-muted" />
        {yerlesim.map((y) => (
          <circle
            key={y.d.etiket}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={y.d.renk}
            strokeWidth={KALINLIK}
            strokeDasharray={`${y.uzunluk} ${CEVRE - y.uzunluk}`}
            strokeDashoffset={-y.kayma}
          />
        ))}
      </g>
      {/* Bant yüzdeleri — koyu yazı; ölçüldü (K247): kanal renkleri üstünde
          koyu metin 4,7–9,8:1, beyaz 2,2–4,5:1. */}
      {yerlesim
        .filter((y) => y.yuzde >= 6)
        .map((y) => (
          <text
            key={`y-${y.d.etiket}`}
            x={y.bant.x}
            y={y.bant.y}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            className="fill-foreground"
          >
            {yuzdeMetni(y.yuzde)}
          </text>
        ))}
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="20" fontWeight="700" className="fill-foreground">
        {toplamMetni}
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" fontSize="11" className="fill-muted-foreground">
        {toplamEtiketi}
      </text>
      {yerlesimAyrik.map((y) => (
        <g key={`ok-${y.d.etiket}`}>
          <polyline
            fill="none"
            stroke={y.d.renk}
            strokeWidth="1.6"
            points={`${y.bas.x.toFixed(1)},${y.bas.y.toFixed(1)} ${y.dirsek.x.toFixed(1)},${y.dirsek.y.toFixed(1)} ${y.uc.x.toFixed(1)},${y.uc.y.toFixed(1)}`}
          />
          <circle cx={y.uc.x} cy={y.uc.y} r="2.8" fill={y.d.renk} />
          <text
            x={y.uc.x + (y.sagda ? 8 : -8)}
            y={y.uc.y - 4}
            textAnchor={y.sagda ? "start" : "end"}
            fontSize="12.5"
            fontWeight="600"
            className="fill-foreground"
          >
            {y.d.etiket}
          </text>
          <text
            x={y.uc.x + (y.sagda ? 8 : -8)}
            y={y.uc.y + 12}
            textAnchor={y.sagda ? "start" : "end"}
            fontSize="12"
            className="fill-muted-foreground tabular-nums"
          >
            {y.d.tutarMetni}
          </text>
        </g>
      ))}
      {dipnot ? (
        <text x={CX} y={258} textAnchor="middle" fontSize="11" className="fill-muted-foreground">
          {dipnot}
        </text>
      ) : null}
    </svg>
  );
}
