/**
 * ============================================================================
 *  KÂRLILIK KARTI GRAFİKLERİ (K330, 10.10.2026) — Algoritmo ürün sayfası
 * ----------------------------------------------------------------------------
 *  Sunucuda çizilen sade SVG'ler (kütüphane yok, JS yok). Renkler tema
 *  değişkenlerinden: vurgu (kobalt) · kâr (yeşil) · zarar (kırmızı) · uyarı
 *  (safran). Her grafik veri yoksa NEDENİNİ yazar (boş çerçeve çizmez).
 *
 *  ⚠ BOŞLUK UYDURULMAZ: değeri `null` olan gün çizgide BOŞLUK bırakır
 *  (satış olmayan günde «fiyat» yoktur; sıfır çizilseydi fiyat çöktü sanılırdı).
 * ============================================================================
 */

const RENK = {
  ciro: "var(--se-vurgu)",
  net: "var(--se-kar)",
  adet: "var(--se-zarar)",
  iade: "var(--se-bil, #E3A13A)",
  stok: "#F2C14E",
  cizgi: "var(--se-cizgi)",
  yazi: "currentColor",
} as const;

function ustSinir(degerler: readonly number[]): number {
  const m = Math.max(0, ...degerler);
  if (m <= 0) return 1;
  const us = 10 ** Math.floor(Math.log10(m));
  const adim = [1, 2, 2.5, 5, 10].map((k) => k * us).find((a) => a * 4 >= m) ?? us * 10;
  return adim * 4;
}

/** Değeri olan ardışık noktaları ayrı yollara böler (null = boşluk). */
function yollar(noktalar: readonly (readonly [number, number | null])[]): string[] {
  const sonuc: string[] = [];
  let yol = "";
  for (const [x, y] of noktalar) {
    if (y === null) {
      if (yol) sonuc.push(yol);
      yol = "";
      continue;
    }
    yol += `${yol ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }
  if (yol) sonuc.push(yol);
  return sonuc;
}

export type Lejant = { ad: string; renk: string; cizgi?: boolean };

export function GrafikLejanti({ ogeler }: { ogeler: readonly Lejant[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs">
      {ogeler.map((o) => (
        <span key={o.ad} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={o.cizgi ? "h-0.5 w-4 rounded" : "size-2.5 rounded-full"}
            style={{ background: o.renk }}
          />
          {o.ad}
        </span>
      ))}
    </div>
  );
}

const G = { gen: 900, yuk: 260, sol: 64, sag: 40, ust: 12, alt: 28 } as const;

/** İki fiyat yazısı arasındaki en küçük yatay mesafe (grafik birimi; «₺5.300,00» ~50 birim). */
const FIYAT_ETIKET_ARALIGI = 56;

/**
 * GÜNLÜK GRAFİK — ciro ve NET-2 çubuk (sol eksen, para), adet ve iade çizgi
 * (sağ eksen, adet). Algoritmo «Einnahmen und Aufträge» grafiğinin karşılığı.
 */
export function GunlukGrafik({
  noktalar,
  adlar,
  bicimlePara,
  bicimleGun,
  bosMesaj,
}: {
  noktalar: readonly { gun: string; ciro: number; net2: number | null; adet: number; iade: number }[];
  adlar: { ciro: string; net2: string | null; adet: string; iade: string };
  bicimlePara: (n: number) => string;
  bicimleGun: (gun: string) => string;
  bosMesaj: string;
}) {
  if (noktalar.length === 0 || noktalar.every((n) => n.ciro === 0 && n.adet === 0 && n.iade === 0)) {
    return <p className="text-muted-foreground py-10 text-center text-sm">{bosMesaj}</p>;
  }
  const paraUst = ustSinir(noktalar.flatMap((n) => [n.ciro, n.net2 ?? 0]));
  const adetUst = ustSinir(noktalar.flatMap((n) => [n.adet, n.iade]));
  const ic = { gen: G.gen - G.sol - G.sag, yuk: G.yuk - G.ust - G.alt };
  const adim = ic.gen / noktalar.length;
  const cubuk = Math.max(1.5, Math.min(14, adim * 0.32));
  const yPara = (v: number) => G.ust + ic.yuk - (Math.max(0, v) / paraUst) * ic.yuk;
  const yAdet = (v: number) => G.ust + ic.yuk - (v / adetUst) * ic.yuk;
  const xMerkez = (i: number) => G.sol + adim * i + adim / 2;
  const etiketAraligi = Math.max(1, Math.ceil(noktalar.length / 6));
  return (
    <div className="space-y-2">
      <GrafikLejanti
        ogeler={[
          { ad: adlar.ciro, renk: RENK.ciro },
          ...(adlar.net2 ? [{ ad: adlar.net2, renk: RENK.net }] : []),
          { ad: adlar.adet, renk: RENK.adet, cizgi: true },
          { ad: adlar.iade, renk: RENK.iade, cizgi: true },
        ]}
      />
      <svg viewBox={`0 0 ${G.gen} ${G.yuk}`} className="h-auto w-full" role="img" aria-label={adlar.ciro}>
        {[0, 1, 2, 3, 4].map((k) => {
          const y = G.ust + (ic.yuk * k) / 4;
          return (
            <g key={k}>
              <line x1={G.sol} x2={G.gen - G.sag} y1={y} y2={y} stroke={RENK.cizgi} strokeDasharray="3 3" />
              <text x={G.sol - 6} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {bicimlePara((paraUst * (4 - k)) / 4)}
              </text>
              <text x={G.gen - G.sag + 6} y={y + 4} className="fill-muted-foreground text-[10px]">
                {Math.round((adetUst * (4 - k)) / 4)}
              </text>
            </g>
          );
        })}
        {noktalar.map((n, i) => (
          <g key={n.gun}>
            <rect x={xMerkez(i) - cubuk - 0.5} y={yPara(n.ciro)} width={cubuk} height={G.ust + ic.yuk - yPara(n.ciro)} fill={RENK.ciro} rx={1.5}>
              <title>{`${bicimleGun(n.gun)} · ${adlar.ciro}: ${bicimlePara(n.ciro)} · ${adlar.adet}: ${n.adet} · ${adlar.iade}: ${n.iade}`}</title>
            </rect>
            {adlar.net2 && n.net2 !== null ? (
              <rect x={xMerkez(i) + 0.5} y={yPara(n.net2)} width={cubuk} height={G.ust + ic.yuk - yPara(n.net2)} fill={RENK.net} rx={1.5}>
                <title>{`${bicimleGun(n.gun)} · ${adlar.net2}: ${bicimlePara(n.net2)}`}</title>
              </rect>
            ) : null}
            {i % etiketAraligi === 0 ? (
              <text x={xMerkez(i)} y={G.yuk - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {bicimleGun(n.gun)}
              </text>
            ) : null}
          </g>
        ))}
        {(["adet", "iade"] as const).map((alan) => (
          <g key={alan}>
            {yollar(noktalar.map((n, i) => [xMerkez(i), yAdet(n[alan])] as const)).map((d, j) => (
              <path key={j} d={d} fill="none" stroke={RENK[alan]} strokeWidth={2} />
            ))}
            {noktalar.map((n, i) => (
              <circle key={n.gun} cx={xMerkez(i)} cy={yAdet(n[alan])} r={2.6} fill="white" stroke={RENK[alan]} strokeWidth={1.5} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

/**
 * STOK VE FİYAT — günlük gün sonu stoku çubuk (sağ eksen, adet), ortalama
 * satış fiyatı çizgi (sol eksen, para; satış olmayan gün boşluk).
 */
export function StokFiyatGrafigi({
  noktalar,
  adlar,
  bicimlePara,
  bicimleGun,
  bosMesaj,
}: {
  noktalar: readonly { gun: string; stok: number; fiyat: number | null }[];
  /** `fiyat` null ise fiyat çizgisi ve lejantı çizilmez (ör. iade grafiği). */
  adlar: { stok: string; fiyat: string | null };
  bicimlePara: (n: number) => string;
  bicimleGun: (gun: string) => string;
  bosMesaj: string;
}) {
  if (noktalar.length === 0) return <p className="text-muted-foreground py-10 text-center text-sm">{bosMesaj}</p>;
  const stokUst = ustSinir(noktalar.map((n) => n.stok));
  const fiyatUst = ustSinir(noktalar.map((n) => n.fiyat ?? 0));
  const ic = { gen: G.gen - G.sol - G.sag, yuk: G.yuk - G.ust - G.alt };
  const adim = ic.gen / noktalar.length;
  const cubuk = Math.max(2, Math.min(22, adim * 0.7));
  const yStok = (v: number) => G.ust + ic.yuk - (Math.max(0, v) / stokUst) * ic.yuk;
  const yFiyat = (v: number) => G.ust + ic.yuk - (v / fiyatUst) * ic.yuk;
  const x = (i: number) => G.sol + adim * i + adim / 2;
  const etiketAraligi = Math.max(1, Math.ceil(noktalar.length / 6));
  const sayiEtiketi = noktalar.length <= 35;
  /* Fiyat noktasının rakamı (kullanıcı 11.10.2026: «yeşillerde rakam yok, anlaşılmıyor»).
     Yan yana günlerde yazılar üst üste binmesin diye bir öncekinden FIYAT_ETIKET_ARALIGI
     birimden yakın noktaya yazı konmaz — o noktanın fiyatı üstüne gelince (title) okunur. */
  const fiyatEtiketli = new Set<number>();
  let sonEtiketX = -Infinity;
  noktalar.forEach((n, i) => {
    if (n.fiyat === null || !adlar.fiyat) return;
    if (x(i) - sonEtiketX < FIYAT_ETIKET_ARALIGI) return;
    fiyatEtiketli.add(i);
    sonEtiketX = x(i);
  });
  return (
    <div className="space-y-2">
      <GrafikLejanti ogeler={[{ ad: adlar.stok, renk: RENK.stok }, ...(adlar.fiyat ? [{ ad: adlar.fiyat, renk: RENK.net, cizgi: true }] : [])]} />
      <svg viewBox={`0 0 ${G.gen} ${G.yuk}`} className="h-auto w-full" role="img" aria-label={adlar.stok}>
        {[0, 1, 2, 3, 4].map((k) => {
          const y = G.ust + (ic.yuk * k) / 4;
          return (
            <g key={k}>
              <line x1={G.sol} x2={G.gen - G.sag} y1={y} y2={y} stroke={RENK.cizgi} strokeDasharray="3 3" />
              <text x={G.sol - 6} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {bicimlePara((fiyatUst * (4 - k)) / 4)}
              </text>
              <text x={G.gen - G.sag + 6} y={y + 4} className="fill-muted-foreground text-[10px]">
                {Math.round((stokUst * (4 - k)) / 4)}
              </text>
            </g>
          );
        })}
        {noktalar.map((n, i) => (
          <g key={n.gun}>
            <rect x={x(i) - cubuk / 2} y={yStok(n.stok)} width={cubuk} height={G.ust + ic.yuk - yStok(n.stok)} fill={RENK.stok} rx={1.5}>
              <title>{`${bicimleGun(n.gun)} · ${adlar.stok}: ${n.stok}${n.fiyat === null || !adlar.fiyat ? "" : ` · ${adlar.fiyat}: ${bicimlePara(n.fiyat)}`}`}</title>
            </rect>
            {sayiEtiketi && n.stok > 0 ? (
              <text x={x(i)} y={yStok(n.stok) - 3} textAnchor="middle" className="fill-foreground text-[9px] font-medium">
                {n.stok}
              </text>
            ) : null}
            {i % etiketAraligi === 0 ? (
              <text x={x(i)} y={G.yuk - 8} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {bicimleGun(n.gun)}
              </text>
            ) : null}
          </g>
        ))}
        {yollar(noktalar.map((n, i) => [x(i), n.fiyat === null ? null : yFiyat(n.fiyat)] as const)).map((d, j) => (
          <path key={j} d={d} fill="none" stroke={RENK.net} strokeWidth={2} />
        ))}
        {noktalar.map((n, i) =>
          n.fiyat === null || !adlar.fiyat ? null : (
            <g key={`f${n.gun}`}>
              <circle cx={x(i)} cy={yFiyat(n.fiyat)} r={3} fill="white" stroke={RENK.net} strokeWidth={1.5}>
                <title>{`${bicimleGun(n.gun)} · ${adlar.fiyat}: ${bicimlePara(n.fiyat)}`}</title>
              </circle>
              {fiyatEtiketli.has(i) ? (
                <text x={x(i)} y={Math.max(G.ust + 8, yFiyat(n.fiyat) - 7)} textAnchor="middle" className="text-[10px] font-semibold" fill={RENK.net}>
                  {bicimlePara(n.fiyat)}
                </text>
              ) : null}
            </g>
          ),
        )}
      </svg>
    </div>
  );
}

/**
 * Küçük çizgi (kanal fiyatı, alış fiyatı geçmişi) — eksen yok, boşluk korunur.
 *
 * ⚠ SABİT YÜKSEKLİK (kullanıcı 11.10.2026: «pc'de grafikler tam oturmamış», «noktalar
 * yukarı yaslanmış, değeri okunmuyor»). Eski hâl `viewBox` + `h-auto` idi: geniş
 * ekranda grafik ORANTILI büyüyor, noktalar satırın dışına taşıyordu. Artık çizgi
 * yatayda esner (`preserveAspectRatio="none"`, kalınlık sabit), noktalar HTML olarak
 * yüzdelik konumda durur — daire bozulmaz. `bicimle` verilirse İLK ve SON noktanın
 * değeri yazılır; her noktanın değeri üstüne gelince okunur.
 */
/**
 * KÜÇÜK FİYAT ÇİZGİSİ — NOKTALAR BİRLEŞİR (kullanıcı kararı 12.10.2026).
 *
 * ⚠ ESKİ HÂL VE NİYE DEĞİŞTİ (eski gerekçe silinmez): ilk sürüm, dosya
 * başındaki kurala uyup değeri olmayan günü çizgide BOŞLUK bırakıyordu. Seyrek
 * satışlı üründe bu, eksensiz birkaç yüzen yuvarlak ve üst üste binen fiyat
 * yazıları demekti — kullanıcı «anlamsız işaretler» dedi. Birleştirmek SIFIR
 * ÇİZMEK DEĞİLDİR (o kuralın korumaya çalıştığı yanılgı «fiyat çöktü» idi):
 * çizgi yalnız fiyatı OLAN noktalardan geçer, aradaki boş günlere değer
 * uydurulmaz. Kural günlük satış grafiğinde (`GunlukGrafik`) aynen geçerli.
 *
 * · Yüzen etiket YOK — üst üste biniyordu. İlk ve son nokta çizginin ALTINDA,
 *   solda ve sağda yazar (tarih verilmişse tarihle).
 * · Tek nokta çizgi DEĞİLDİR: çizilmez; `tekMetni` (yoksa değerin kendisi) yazar.
 */
export function MiniCizgi({
  degerler,
  renk = RENK.ciro,
  bicimle,
  tarihler,
  tekMetni,
  yukseklik = 40,
}: {
  degerler: readonly (number | null)[];
  renk?: string;
  bicimle?: (n: number) => string;
  /** `degerler` ile AYNI sırada — ilk/son noktanın tarihi altta yazar. */
  tarihler?: readonly string[];
  /** Yalnız bir nokta varsa çizgi yerine yazılacak metin. */
  tekMetni?: string;
  yukseklik?: number;
}) {
  const dolular = degerler.flatMap((d, i) => (d === null ? [] : [{ i, d }]));
  if (dolular.length === 0) return null;
  if (dolular.length === 1) {
    const metin = tekMetni ?? (bicimle ? bicimle(dolular[0]!.d) : null);
    return metin === null ? null : <p className="text-muted-foreground text-[11px] tabular-nums">{metin}</p>;
  }
  const ilk = dolular[0]!;
  const son = dolular[dolular.length - 1]!;
  const min = Math.min(...dolular.map((n) => n.d));
  const max = Math.max(...dolular.map((n) => n.d));
  const yay = max - min || 1;
  const ust = 6;
  const alt = 6;
  const x = (i: number) => 4 + (92 * i) / Math.max(1, degerler.length - 1);
  const y = (v: number) => (max === min ? ust + (yukseklik - ust - alt) / 2 : ust + (yukseklik - ust - alt) * (1 - (v - min) / yay));
  /* Yalnız DOLU noktalardan geçen tek yol — boş günler atlanır, değer uydurulmaz. */
  const yol = dolular.map((n, j) => `${j === 0 ? "M" : "L"}${x(n.i).toFixed(1)},${y(n.d).toFixed(1)}`).join("");
  const ucYazisi = (n: { i: number; d: number }) =>
    [tarihler?.[n.i], bicimle ? bicimle(n.d) : null].filter((s): s is string => Boolean(s)).join(" · ");
  return (
    <div className="space-y-0.5">
      <div className="relative w-full" style={{ height: yukseklik }}>
        <svg viewBox={`0 0 100 ${yukseklik}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d={yol} fill="none" stroke={renk} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
        {dolular.map((n) => {
          const uc = n.i === ilk.i || n.i === son.i;
          return (
            <span
              key={n.i}
              title={ucYazisi(n) || undefined}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
              style={{ left: `${x(n.i)}%`, top: y(n.d), width: uc ? 8 : 5, height: uc ? 8 : 5, border: `${uc ? 2 : 1.5}px solid ${renk}` }}
            />
          );
        })}
      </div>
      {bicimle || tarihler ? (
        <div className="text-muted-foreground flex justify-between gap-2 text-[10px] tabular-nums">
          <span>{ucYazisi(ilk)}</span>
          <span className="font-semibold" style={{ color: renk }}>{ucYazisi(son)}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Algoritmo halkası — ortada değer, altta açıklama. `oran` 0–1; `null` ise «?». */
export function DurumHalkasi({ oran, merkez, alt, renk = RENK.net }: { oran: number | null; merkez: string; alt: string; renk?: string }) {
  const r = 34;
  const cevre = 2 * Math.PI * r;
  const dolu = oran === null ? 0 : Math.max(0, Math.min(1, oran));
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 90 90" className="size-24" aria-hidden>
        <circle cx={45} cy={45} r={r} fill="none" stroke={RENK.cizgi} strokeWidth={8} />
        {dolu > 0 ? <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={renk}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${cevre * dolu} ${cevre}`}
          transform="rotate(-90 45 45)"
        /> : null}
        <text x={45} y={50} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
          {merkez}
        </text>
      </svg>
      <span className="text-muted-foreground text-xs">{alt}</span>
    </div>
  );
}
