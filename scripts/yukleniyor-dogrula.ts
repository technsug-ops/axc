import { existsSync, readdirSync, statSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import tr from "../messages/tr.json";
import en from "../messages/en.json";

/**
 * ============================================================================
 *  YÜKLENİYOR EKRANI BEKÇİSİ (11.10.2026) — `npm run yukleniyor:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «mobilde tıklamalara geç reaksiyon alıyoruz». Sistemde HİÇ
 *  `loading.tsx` yoktu; dinamik sayfada gezinme sunucu sayfayı bitirene kadar
 *  başlamıyordu. Kök yükleniyor ekranı bunu kapatır — silinir ya da adı
 *  bozulursa geç tepki SESSİZCE geri gelir (hata vermez, yalnız yavaş hissettirir).
 *  ① dosya kökte ve Next'in okuyacağı biçimde (varsayılan dışa aktarım)
 *  ② ekran okuyucuya söylenir ve metin sözlükten gelir (i18n kuralı)
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
    if (gorulen !== undefined) console.log("        ", gorulen);
  }
}
const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

console.log("=".repeat(70));
console.log("YUKLENIYOR EKRANI (11.10.2026)");
console.log("=".repeat(70));

const YOL = "src/app/loading.tsx";
const kaynak = existsSync(YOL) ? yorumsuz(kaynakOku(YOL)) : "";

/* ① DOSYA */
{
  kontrol("kök yükleniyor ekranı var", kaynak.length > 0);
  kontrol("  ...Next'in okuyacağı varsayılan dışa aktarım", /export default (async )?function \w+\(/.test(kaynak));
  kontrol("  ...istemci dosyası DEĞİL (sunucuda çizilir, sözlüğü sunucudan okur)", !/^\s*["']use client["']/.test(kaynak));
  kosanBolumler.push("dosya");
}

/* ② SÖYLENİŞ */
{
  kontrol("ekran okuyucuya «durum» olarak söylenir", /<div [^>]*role="status"[^>]*>/.test(kaynak));
  kontrol("  ...metin sözlükten (koda gömülü değil)", /<span className="sr-only">\{t\("sayfaYukleniyor"\)\}<\/span>/.test(kaynak));
  kontrol("  ...sözlük bölümü Ortak", /const t = await getTranslations\("Ortak"\);/.test(kaynak));
  const trM = (tr as { Ortak?: Record<string, string> }).Ortak?.sayfaYukleniyor;
  kontrol("tr sözlüğünde metin DOLU", typeof trM === "string" && trM.trim().length > 0, trM);
  kontrol("en sözlüğünde anahtar var (iskelet)", typeof (en as { Ortak?: Record<string, string> }).Ortak?.sayfaYukleniyor === "string");
  kosanBolumler.push("soylenis");
}

/* ═══ ③ ÖNCEDEN YÜKLEME YALNIZ NİYETLE (K332, 12.10.2026) ═══
   Canlı kayıt: bilgisayarda sayfa başına ~140 istek — ekrana giren her `<Link>`
   önceden yükleniyordu (satır başına 3 + menünün tamamı) ve 3 bağlantılık
   veritabanını tıkıyordu. Ölçüt DESEN YASAĞI (dosya listesi değil): `src`
   altında `next/link` yalnız beyanlı iki yerde; yarın eklenen ekran da yakalanır. */
{
  const ISTISNALAR = new Map([
    ["src/components/niyetli-baglanti.tsx", "ortak bileşenin kendisi"],
    ["src/components/alt-cubuk.tsx", "telefon alt çubuğu, 4 ana bağlantı — ekrana girince yükleme ucuz, telefondaki hızlı geçişi korur"],
  ]);
  const dosyalar: string[] = [];
  const gez = (k: string) => {
    for (const ad of readdirSync(k)) {
      const yol = `${k}/${ad}`;
      if (statSync(yol).isDirectory()) gez(yol);
      else if (/\.tsx?$/.test(ad)) dosyalar.push(yol);
    }
  };
  gez("src");
  const dogrudan = dosyalar.filter((y) => /from\s+["']next\/link["']/.test(yorumsuz(kaynakOku(y))));
  const ihlal = dogrudan.filter((y) => !ISTISNALAR.has(y));
  const ortak = dosyalar.filter((y) => /import Link from "@\/components\/niyetli-baglanti";/.test(kaynakOku(y)));
  kontrol("taban DOLU — ortak bağlantıyı kullanan en az 80 dosya", ortak.length >= 80, ortak.length);
  kontrol("`next/link` yalnız beyanlı istisnalarda (desen yasağı)", ihlal.length === 0, ihlal);
  kontrol("  ...beyanlı istisnalar gerçekten kullanıyor (beyan bayatlamadı)", [...ISTISNALAR.keys()].every((y) => dogrudan.includes(y)), dogrudan);
  const nb = yorumsuz(kaynakOku("src/components/niyetli-baglanti.tsx"));
  kontrol("ortak bağlantı istemci bileşeni", /^\s*["']use client["']/.test(kaynakOku("src/components/niyetli-baglanti.tsx")));
  kontrol("  ...niyet görülene kadar ÖNCEDEN YÜKLEME YOK, açık verilen değere dokunmaz",
    /prefetch=\{acikVerildi \? prefetch : niyet \? null : false\}/.test(nb) && /const acikVerildi = prefetch === true \|\| prefetch === false;/.test(nb));
  kontrol("  ...niyet üç yoldan: fare · dokunma · klavye odağı (çağıranın olayı da korunur)",
    (nb.match(/setNiyet\(true\);/g) ?? []).length === 3 &&
      /onMouseEnter\?\.\(e\)/.test(nb) && /onTouchStart\?\.\(e\)/.test(nb) && /onFocus\?\.\(e\)/.test(nb));
  kosanBolumler.push("onyukleme");
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
