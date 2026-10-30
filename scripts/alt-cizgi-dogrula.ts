import { kaynakOku } from "./kaynak-oku";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  ALT ÇİZGİ YASAĞI BEKÇİSİ (30.10.2026) — `npm run alt-cizgi:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 30.10.2026 (alım rehberi ekran görüntüsüyle): _"alti
 *  cizgili yazi kötü duruyor, programın hiçbir yerinde istemiyorum."_
 *  ① DESEN YASAĞI — `src/` altındaki hiçbir kaynakta (yorumsuz) `underline`
 *     geçemez: `underline` · `hover:underline` · `underline-offset-*` ·
 *     CSS `text-decoration: underline`. Dosya listesi tutulmaz; yarın yazılan
 *     ekran da yakalanır. (`no-underline` serbest — çizgiyi KALDIRIR.)
 *  ② İLKE #2 YERİNDE — alt çizgi gidince «tıklanabilir görünür» işaretini
 *     renk taşır: ortak `Baglanti` vurgu renginde ve kalın.
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
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("ALT CIZGI YASAGI (30.10.2026)");
console.log("=".repeat(70));

/* ① DESEN YASAĞI */
{
  const dosyalar: string[] = [];
  const gez = (k: string) => {
    for (const ad of readdirSync(k)) {
      const y = join(k, ad);
      if (statSync(y).isDirectory()) gez(y);
      else if (/\.(tsx?|css)$/.test(y)) dosyalar.push(y.split("\\").join("/"));
    }
  };
  gez("src");
  /** `no-underline` / `text-underline-offset` önünde tire var → sayılmaz. */
  const YASAK = /(?<![\w-])underline(?![\w])/;
  const ihlal = dosyalar.filter((y) => YASAK.test(yorumsuz(kaynakOku(y))));
  kontrol("taranan kaynak ≥ 300 dosya (taban dolu)", dosyalar.length >= 300, dosyalar.length);
  kontrol("hiçbir kaynakta alt çizgi yok", ihlal.length === 0, ihlal);
  kosanBolumler.push("yasak");
}

/* ② İLKE #2 — RENK TAŞIR */
{
  const m = yorumsuz(kaynakOku("src/components/baglanti.tsx"));
  const bas = m.indexOf("export function Baglanti(");
  const son = m.indexOf("export function GeriBaglanti(");
  const blok = bas >= 0 && son > bas ? m.slice(bas, son) : "";
  kontrol("ortak bağlantı bulundu", blok.length > 0);
  kontrol("  ...vurgu renginde ve kalın", /"text-primary\b[^"]*\bfont-medium\b[^"]*"/.test(blok), blok.match(/"[^"]*text-[^"]*"/)?.[0]);
  kosanBolumler.push("renk");
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
