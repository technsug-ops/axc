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
      </svg>
    </div>
  );
}

/** Küçük çizgi (kanal fiyatı, alış fiyatı geçmişi) — eksen yok, boşluk korunur. */
export function MiniCizgi({ degerler, renk = RENK.ciro, gen = 220, yuk = 36 }: { degerler: readonly (number | null)[]; renk?: string; gen?: number; yuk?: number }) {
  const dolu = degerler.filter((d): d is number => d !== null);
  if (dolu.length === 0) return null;
  const min = Math.min(...dolu);
  const max = Math.max(...dolu);
  const yay = max - min || 1;
  const x = (i: number) => (degerler.length === 1 ? gen / 2 : 4 + ((gen - 8) * i) / (degerler.length - 1));
  const y = (v: number) => (max === min ? yuk / 2 : 4 + (yuk - 8) * (1 - (v - min) / yay));
  const ilk = degerler.findIndex((d) => d !== null);
  const son = degerler.length - 1 - [...degerler].reverse().findIndex((d) => d !== null);
  return (
    <svg viewBox={`0 0 ${gen} ${yuk}`} className="h-9 w-full" aria-hidden preserveAspectRatio="none">
      {yollar(degerler.map((d, i) => [x(i), d === null ? null : y(d)] as const)).map((d, j) => (
        <path key={j} d={d} fill="none" stroke={renk} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
      {[ilk, son].map((i) => (
        <circle key={i} cx={x(i)} cy={y(degerler[i] as number)} r={3.5} fill="white" stroke={renk} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
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
        <circle
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={renk}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${cevre * dolu} ${cevre}`}
          transform="rotate(-90 45 45)"
        />
        <text x={45} y={50} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">
          {merkez}
        </text>
      </svg>
      <span className="text-muted-foreground text-xs">{alt}</span>
    </div>
  );
}
