import { existsSync } from "node:fs";

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
