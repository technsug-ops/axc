import { isValidElement, type ReactElement } from "react";

import { NoktaSeritleri } from "../src/components/grafik-nokta-seritleri";
import {
  GRAFIK_KUTUSU as G,
  ETIKET_ALT_SINIRI,
  ETIKET_SATIR_ARALIGI,
  noktaEtiketHizasi,
  noktaEtiketleri,
} from "../src/components/grafik-olcek";
import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  GRAFİK NOKTA PENCERESİ BEKÇİSİ (K109) — `npm run grafik-nokta:dogrula`
 * ----------------------------------------------------------------------------
 *  ① ŞERİT — gövde çağrılır: dokunma şeritleri iç alanı BOŞLUKSUZ ve
 *     ÖRTÜŞMESİZ kaplar, boş (null) nokta şerit almaz, `data-nokta` noktanın
 *     KENDİ sırasını taşır (boş ay atlanınca kaymaz).
 *  ② BAĞ — iki grafik sarmalayıcıyla sarılı, şeritler SVG'nin EN ÜSTÜNDE
 *     (sonra çizilen bir katman dokunmayı yutar), pencere metni sunucuda
 *     biçimleniyor, boş ay pencere açmıyor.
 *  ③ RAKAM KONUMU (03.10.2026) — gövde çağrılır: NET-2 rakamı ay satırına
 *     İNMEZ, ciro rakamı NET-2'nin ÜSTÜNDE kalır, uç noktalar içe yaslanır.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 3;
function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", JSON.stringify(gorulen));
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

type Serit = { i: number; sol: number; sag: number };
/** Gövdenin döndürdüğü ağaçtan şerit dikdörtgenlerini çıkarır. */
function seritler(noktalar: ({ x: number; y: number } | null)[]): Serit[] {
  const kok = NoktaSeritleri({ noktalar }) as ReactElement<{ children: ReactElement<{ children: ReactElement[] }>[] }>;
  const sonuc: Serit[] = [];
  for (const g of kok.props.children) {
    if (!isValidElement(g)) continue;
    for (const c of g.props.children) {
      const p = c.props as Record<string, unknown>;
      if (c.type === "rect") {
        const x = Number(p.x);
        sonuc.push({ i: Number(p["data-nokta"]), sol: x, sag: x + Number(p.width) });
      }
    }
  }
  return sonuc;
}

console.log("=".repeat(70));
console.log("GRAFİK NOKTA PENCERESİ BEKÇİSİ (K109)");
console.log("=".repeat(70));

console.log("\n1) şerit — gövde çağrılır");
{
  const x = (i: number, n: number) => G.sol + (i * (G.genislik - G.sol - G.sag)) / (n - 1);
  const tam = [0, 1, 2, 3].map((i) => ({ x: x(i, 4), y: 100 }));
  const s = seritler(tam);
  kontrol("her nokta bir şerit alır", s.length === 4 && s.every((r, k) => r.i === k), s);
  kontrol("şeritler iç alanın SOLUNDAN başlar, SAĞINDA biter", s[0].sol === G.sol && Math.abs(s[3].sag - (G.genislik - G.sag)) < 1e-9, s);
  kontrol("komşu şeritler arasında boşluk ve örtüşme YOK", s.every((r, k) => k === 0 || Math.abs(r.sol - s[k - 1].sag) < 1e-9), s);
  kontrol("sınır iki noktanın tam ORTASINDA", Math.abs(s[0].sag - (tam[0].x + tam[1].x) / 2) < 1e-9, s);

  const bosluklu = [tam[0], null, tam[2], tam[3]];
  const b = seritler(bosluklu);
  kontrol("boş (null) nokta şerit ALMAZ", b.length === 3 && !b.some((r) => r.i === 1), b);
  kontrol("  ...kalanlar KENDİ sırasını taşır (0,2,3 — kaymaz)", JSON.stringify(b.map((r) => r.i)) === "[0,2,3]", b);
  kontrol("  ...boş ayın alanı komşulara bölünür, ölü bölge yok", b.every((r, k) => k === 0 || Math.abs(r.sol - b[k - 1].sag) < 1e-9), b);
  const tek = seritler([{ x: G.sol + 500, y: 50 }]);
  kontrol("tek nokta bütün iç alanı alır", tek.length === 1 && tek[0].sol === G.sol && tek[0].sag === G.genislik - G.sag, tek);
}
kosanBolumler.push("şerit");

console.log("\n2) bağ — iki grafik");
for (const [ad, yol, noktaIfadesi] of [
  ["çizgi grafik (ciro · NET-2)", "src/components/cizgi-grafik.tsx", /<NoktaSeritleri noktalar=\{noktalar\.map\(\(n, i\) => \(\{ x: x\(i\), y: yKonum\(anaSeri\(n\)\) \}\)\)\} \/>/],
  ["tek serili grafik (envanter · marj)", "src/components/tek-serili-grafik.tsx", /<NoktaSeritleri\s+noktalar=\{noktalar\.map\(\(n, i\) => \(n\.deger === null \? null : \{ x: x\(i\), y: yk\(n\.deger\) \}\)\)\}\s+\/>/],
] as const) {
  const m = yorumsuz(kaynakOku(yol));
  kontrol(`${ad}: sarmalayıcıyla sarılı ve pencereler veriliyor`, /<GrafikNoktaPenceresi pencereler=\{pencereler\}>/.test(m) && /<\/GrafikNoktaPenceresi>/.test(m));
  kontrol(`  ...şeritler doğru noktalarla çiziliyor`, noktaIfadesi.test(m));
  kontrol(`  ...şeritler SVG'nin EN SONUNDA (üstte)`, /<NoktaSeritleri[\s\S]{0,160}\/>\s*<\/svg>/.test(m));
  kontrol(`  ...eski çıplak kap kalmadı`, !/<div className="overflow-x-auto">/.test(m));
}
{
  const c = yorumsuz(kaynakOku("src/components/cizgi-grafik.tsx"));
  kontrol("çizgi grafik penceresi TAM tutar yazar (kısaltma değil)", /\{ ad: gelirAdi, deger: bicimle\(n\.gelir\) \}/.test(c) && /\{ ad: net2Adi, deger: bicimle\(n\.net2\) \}/.test(c));
  kontrol("  ...NET-2 kapalıysa pencerede de YOK (yetki)", /satirlar: net2Goster\s*\?/.test(c));
  const t = yorumsuz(kaynakOku("src/components/tek-serili-grafik.tsx"));
  kontrol("tek serili: boş ay pencere AÇMAZ, satır seri adını taşır", /n\.deger === null \? null : \{ baslik: n\.tamEtiket, satirlar: \[\{ ad: seriAdi, deger: bicimle\(n\.deger\) \}\] \}/.test(t));
  const p = yorumsuz(kaynakOku("src/components/grafik-nokta-penceresi.tsx"));
  kontrol("sarmalayıcı istemci bileşeni ve fonksiyon ALMIYOR (sunucudan yalnız metin)", /^"use client";/.test(p.trimStart()) && !/bicimle/.test(p));
  kontrol("kapatma yolları: aynı nokta · Esc · dışarı dokunma", /secili\?\.i === i\)[\s\S]{0,40}setSecili\(null\)/.test(p) && /e\.key === "Escape"/.test(p) && /"pointerdown", disari/.test(p));
}
kosanBolumler.push("bağ");

/* ③ RAKAM KONUMU — 03.10.2026 «ciro ile net karışmış» vakası */
{
  const AY_SATIRI = G.yukseklik - 12;
  const dip = G.yukseklik - G.alt; // eksenin sıfır çizgisi (alt = 0 iken)
  // Ekim vakası: ay yeni başladı, ciro ₺97 B · NET-2 ₺8,2 B, eksen ₺2 Mn → iki nokta da dipte.
  const ekim = noktaEtiketleri(dip - 11, dip - 1);
  kontrol("NET-2 rakamı dipteyken ay satırına İNMEZ", ekim.netY <= ETIKET_ALT_SINIRI && ekim.netY < AY_SATIRI - 12, ekim);
  kontrol("  ...ve ciro rakamı NET-2 rakamının ÜSTÜNDE, satır boşluğuyla", ekim.ciroY <= ekim.netY - ETIKET_SATIR_ARALIGI, ekim);
  // Normal ay: ciro üstte, NET-2 ortada — eski yerleşim AYNEN (alt etiket noktanın altında).
  const normal = noktaEtiketleri(60, 200);
  kontrol("normal ayda NET-2 rakamı noktasının ALTINDA (eski yerleşim korunur)", normal.netY === 218 && normal.ciroY === 50, normal);
  // Yakın noktalar: zıt yönlere itilir (eski ölçüt).
  const yakin = noktaEtiketleri(150, 160);
  kontrol("yakın noktalarda etiketler zıt yönlere itilir", yakin.ciroY < 140 && yakin.netY > 178, yakin);
  kontrol("ilk nokta içe (start), son nokta içe (end), ortadakiler orta",
    noktaEtiketHizasi(0, 12) === "start" && noktaEtiketHizasi(11, 12) === "end" && noktaEtiketHizasi(5, 12) === "middle" && noktaEtiketHizasi(0, 1) === "middle");
  const c = yorumsuz(kaynakOku("src/components/cizgi-grafik.tsx"));
  kontrol("grafik konumu gövdeden alıyor", /const \{ ciroY, netY \} = noktaEtiketleri\(yKonum\(n\.gelir\), yKonum\(n\.net2\)\);/.test(c));
  kontrol("  ...ciro rakamı ciroY'ye, NET-2 rakamı netY'ye yazılıyor", /y=\{ciroY\}\s*textAnchor=\{hiza\}[\s\S]{0,200}?bicimleKisa\(n\.gelir\)/.test(c) && /y=\{net2Goster \? netY : yKonum\(anaSeri\(n\)\) - 10\}\s*textAnchor=\{hiza\}/.test(c));
}
kosanBolumler.push("rakam konumu");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
