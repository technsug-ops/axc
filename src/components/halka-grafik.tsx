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
/**
 * K267 (kullanıcı 24.09.2026: «pasta grafik biraz büyüyebilir»): R 62→76,
 * kalınlık 26→30, kadraj 266→300 yüksek, merkez 136→150. Kartta boş alan
 * vardı; delik 98→122 birime çıktı, merkez rakam (`merkezYaziBoyu`) delikten
 * türediği için kendiliğinden büyüdü (11 karakter: 13 → 16,5).
 */
const CY = 150;
const R = 76;
const KALINLIK = 30;
const CEVRE = 2 * Math.PI * R;
/** Halkanın DELİĞİ — merkez yazının sığması gereken çap (R − kalınlık/2)·2. */
export const DELIK_CAPI = 2 * (R - KALINLIK / 2);
export const MERKEZ_YAZI_TAVANI = 20;
const MERKEZ_YAZI_TABANI = 10;
const MERKEZ_PAY = 6;
/**
 * Kalın, tabular rakamda karakter başına ≈0,6 em — canlı ekran görüntüsünden
 * ÖLÇÜLDÜ (24.09.2026): «₺622.904,97» 11 karakter × 20 → 133 birim.
 */
const KARAKTER_EM = 0.6;

/**
 * MERKEZ YAZI BOYU DELİKTEN TÜRETİLİR (K261-②, kullanıcı 24.09.2026: «sayıyı
 * biraz küçült, daireye sığmıyor»). Sabit 20 birim, 11 karakterlik toplamı
 * 133 birime yayıyor; delik 98. Yazı halkaya taşıp bant yüzdesinin (%42)
 * üstüne biniyordu. Boy = (delik − pay) / (0,6 × karakter), tavan 20 taban
 * 10, yarım birime yuvarlı. SAF — değer testiyle sınanır.
 */
export function merkezYaziBoyu(metin: string): number {
  const alan = DELIK_CAPI - 2 * MERKEZ_PAY;
  const sigan = alan / (KARAKTER_EM * Math.max(1, metin.length));
  return Math.max(MERKEZ_YAZI_TABANI, Math.min(MERKEZ_YAZI_TAVANI, Math.floor(sigan * 2) / 2));
}

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
/** Halka büyüyünce (K267) tepe/dip uçları kadrajın dışına taşabilir — y de kırpılır. */
const OK_UC_Y_UST = 20;
const OK_UC_Y_ALT = 300 - 30;

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
    y: Math.min(Math.max(u.y, OK_UC_Y_UST), OK_UC_Y_ALT),
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
      viewBox="0 0 470 300"
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
      <text
        x={CX}
        y={CY - 4}
        textAnchor="middle"
        fontSize={merkezYaziBoyu(toplamMetni)}
        fontWeight="700"
        className="fill-foreground tabular-nums"
      >
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
        <text x={CX} y={290} textAnchor="middle" fontSize="11" className="fill-muted-foreground">
          {dipnot}
        </text>
      ) : null}
    </svg>
  );
}

/**
 * ============================================================================
 *  HALKA — TELEFON, KOMPAKT (K270, kullanıcı 25.09.2026)
 * ----------------------------------------------------------------------------
 *  Ok çizgili halka (üstte) 470 birimlik kadrajı 358 px'e sıkışınca etiketler
 *  okunmuyordu. Onaylanan demo (Entegra kalıbı): halka SOLDA, kanallar SAĞDA
 *  liste — ad · tutar alt alta, yüzde sağda. Aynı dilimler, aynı toplam; yalnız
 *  şekil. Toplam merkezde; yazı boyu deliğe göre (`merkezYaziBoyu` ölçeklenir).
 * ============================================================================
 */
const KOMPAKT_R = 44;
const KOMPAKT_KALINLIK = 16;
const KOMPAKT_CEVRE = 2 * Math.PI * KOMPAKT_R;
const KOMPAKT_DELIK = 2 * (KOMPAKT_R - KOMPAKT_KALINLIK / 2);

export function HalkaKompakt({
  dilimler,
  toplam,
  toplamMetni,
  toplamEtiketi,
  yuzdeMetni,
  bosMesaj,
  aciklama,
}: {
  dilimler: HalkaDilimi[];
  toplam: number;
  toplamMetni: string;
  toplamEtiketi: string;
  yuzdeMetni: (oran: number) => string;
  bosMesaj: string;
  aciklama: string;
}) {
  if (toplam <= 0 || dilimler.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{bosMesaj}</p>;
  }
  /* Kayma birikimi `reduce` ile — render içinde değişken güncellenmez (lint). */
  const uzunluklar = dilimler.map((d) => (d.tutar / toplam) * KOMPAKT_CEVRE);
  const yaylar = dilimler.map((d, i) => ({
    renk: d.renk,
    uzunluk: uzunluklar[i]!,
    kayma: uzunluklar.slice(0, i).reduce((t, u) => t + u, 0),
  }));
  const boy = (merkezYaziBoyu(toplamMetni) * KOMPAKT_DELIK) / DELIK_CAPI;
  return (
    <div className="flex items-center gap-3.5">
      <svg
        viewBox="0 0 120 120"
        className="size-[148px] shrink-0"
        role="img"
        aria-label={aciklama}
      >
        <g transform={`rotate(-90 60 60)`}>
          <circle cx={60} cy={60} r={KOMPAKT_R} fill="none" strokeWidth={KOMPAKT_KALINLIK} className="stroke-muted" />
          {yaylar.map((y, i) => (
            <circle
              key={i}
              cx={60}
              cy={60}
              r={KOMPAKT_R}
              fill="none"
              stroke={y.renk}
              strokeWidth={KOMPAKT_KALINLIK}
              strokeDasharray={`${y.uzunluk} ${KOMPAKT_CEVRE - y.uzunluk}`}
              strokeDashoffset={-y.kayma}
            />
          ))}
        </g>
        <text x={60} y={57} textAnchor="middle" fontSize={boy} fontWeight="700" className="fill-foreground tabular-nums">
          {toplamMetni}
        </text>
        <text x={60} y={70} textAnchor="middle" fontSize="8.5" className="fill-muted-foreground">
          {toplamEtiketi}
        </text>
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {dilimler.map((d) => (
          <li key={d.etiket} className="bg-muted/60 flex min-h-[42px] items-center gap-2 rounded-lg px-2.5">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: d.renk }} aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-semibold">{d.etiket}</span>
              <span className="text-muted-foreground text-[11px] tabular-nums">{d.tutarMetni}</span>
            </span>
            <span className="text-[13px] font-bold tabular-nums">{yuzdeMetni(d.tutar / toplam)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
