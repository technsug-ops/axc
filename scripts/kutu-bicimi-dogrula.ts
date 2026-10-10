import { kaynakOku } from "./kaynak-oku";
import { KUTU_ETIKETI, KUTU_RAKAMI } from "../src/lib/kutu-bicimi";

/**
 * ============================================================================
 *  KUTU BİÇİMİ BEKÇİSİ (K330-③, 10.10.2026) — `npm run kutu-bicimi:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 10.10.2026: «sistemdeki bütün kutular» tek kart tasarımında.
 *  ① TEMA — kutu kalıplarını yakalayan kurallar yerinde (küçük köşeli kutu ·
 *     gri dolgulu kutu · kart başlığı); gri dolgu kuralı KATMANSIZ (yoksa
 *     `bg-*` aracı kazanır).
 *  ② ORTAK YAZI — ekranların kendi kutuları etiket/rakam yazısını tek
 *     kaynaktan (`kutu-bicimi.ts`) okur; eski `text-xs` etiket / `font-semibold`
 *     rakam geri dönmez.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 2;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuzCss = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ");
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("KUTU BICIMI (K330-3, 10.10.2026)");
console.log("=".repeat(70));

/* ① TEMA */
{
  const css = yorumsuzCss(kaynakOku("src/app/globals.css"));
  const katmanBasi = css.indexOf("@layer components {", css.indexOf(".rounded-md.border:is(.p-3, .p-4, .p-5, .p-6)") - 400);
  kontrol(
    "küçük köşeli KUTU (p-3 ve üstü) kart olur",
    /:where\(div, section, article, aside, details, li, dl\)\.rounded-md\.border:is\(\.p-3, \.p-4, \.p-5, \.p-6\):not\(\.border-dashed\) \{\s*border-radius: var\(--radius\);\s*border-color: var\(--se-kart-cizgi, transparent\);\s*box-shadow: var\(--se-golge-1\);\s*background-color: var\(--card\);/.test(css),
  );
  kontrol("  ...çip/etiket boyu (px-2) kapsam DIŞINDA", !/\.rounded-md\.border:is\([^)]*\.px-2/.test(css));
  kontrol("  ...kart içindeki kutu gölge almaz", /\.rounded-md\.border:is\(\.p-3, \.p-4, \.p-5, \.p-6\):not\(\.border-dashed\) \{\s*border-color: var\(--se-cizgi\);\s*box-shadow: none;/.test(css));
  kontrol("  ...kural components katmanında", katmanBasi >= 0);
  const griBas = css.indexOf(".bg-muted\\/40 {");
  kontrol("gri dolgulu kutu beyaz zemin alır", griBas >= 0 && /\.border:is\(\.rounded-lg, \.rounded-md\)\.bg-muted\\\/40 \{\s*background-color: var\(--card\);/.test(css));
  /* Katmansız mı: kuralın SEÇİCİSİNİN başladığı yerde süslü parantez derinliği 0 olmalı
     (hiçbir @layer/@media bloğunun içinde değil). İlk yazım satır başı «}» sayıyordu ve
     kural katmana alınınca YEŞİL kaldı — mutasyon yakaladı. */
  const seciciBas = css.lastIndexOf(":where(", griBas);
  const once = css.slice(0, seciciBas);
  const derinlik = (once.match(/\{/g) ?? []).length - (once.match(/\}/g) ?? []).length;
  kontrol("  ...gri dolgu kuralı KATMANSIZ (bg-* aracını ezer)", griBas >= 0 && seciciBas >= 0 && derinlik === 0, { derinlik });
  kontrol("kart başlığı 16 px / 600", /\[data-slot="card-title"\] \{\s*font-size: 1rem;\s*line-height: 1\.5rem;\s*font-weight: 600;/.test(css));
  kontrol("liste kartı tema kuralına girer (rounded-lg border)", /className="bg-card min-w-0 space-y-2\.5 rounded-lg border p-3"/.test(kaynakOku("src/components/liste-karti.tsx")));
  kosanBolumler.push("tema");
}

/* ② ORTAK YAZI */
{
  kontrol("ortak etiket 13 px orta kalın", KUTU_ETIKETI === "text-muted-foreground text-[13px] font-medium");
  kontrol("ortak rakam kalın + sabit genişlik", KUTU_RAKAMI === "font-bold tabular-nums");
  const kutular: [string, string, string][] = [
    ["nakit özeti", "src/app/nakit-ozeti.tsx", "function Kutu("],
    ["nakit takvimi", "src/app/nakit-takvimi/page.tsx", "function Kutu("],
    ["hakediş", "src/app/hakedis/page.tsx", "function OzetKutusu("],
    ["iadeler", "src/app/iadeler/page.tsx", "function Ozet("],
    ["kanal listeleme", "src/app/kanal-listeleme/page.tsx", "function Kutu("],
    ["kârlılık kartı", "src/app/kart/[variantId]/page.tsx", "function Kutu("],
  ];
  for (const [ad, yol, capa] of kutular) {
    const m = yorumsuz(kaynakOku(yol));
    const bas = m.indexOf(capa);
    const son = bas >= 0 ? m.indexOf("\nfunction ", bas + capa.length) : -1;
    const blok = bas >= 0 ? m.slice(bas, son > bas ? son : bas + 2500) : "";
    kontrol(`${ad}: kutu bulundu`, blok.length > 100);
    kontrol(`${ad}: etiket ortak biçimden`, /className=\{KUTU_ETIKETI\}/.test(blok));
    kontrol(`${ad}: rakam ortak biçimden`, /\$\{KUTU_RAKAMI\}/.test(blok));
    kontrol(`${ad}: eski küçük etiket geri dönmedi`, !/className="text-muted-foreground text-xs">\{(etiket|baslik)\}/.test(blok));
    kontrol(`${ad}: rakam yarı kalına geri dönmedi`, !/(text-2xl|leading-tight) font-semibold/.test(blok));
  }
  kosanBolumler.push("yazi");
}

console.log("=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrol içinde)`);
  process.exitCode = 1;
}
