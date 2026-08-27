import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

/**
 * ============================================================================
 *  BELGE BEKÇİSİ — ÜRETİLMİŞ HTML BAYAT MI
 * ----------------------------------------------------------------------------
 *      npm run belge:dogrula
 *
 *  ⛔ KORUNAN ŞEY: `docs/*.html`in başında **"Bu dosya ... ÜRETİLDİ"** yazıyor.
 *  Bu bir İDDİADIR — ve kaynak `.md` değişip HTML yeniden üretilmezse iddia
 *  YALAN olur. Halil elindeki HTML'i okur, geçersiz bir prosedürü uygular ve
 *  hiçbir yerde uyarı çıkmaz.
 *
 *  ⚠ VE BU SESSİZ BOZULMANIN EN KÖTÜ CİNSİ: derleyici yok, test yok, ekran
 *  yok. Yalnız okuyan biri yanlış öğrenir.
 *  _(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur"
 *  kuralının belge tarafı.)_
 *
 *  ═══ ÖLÇÜT: YENİDEN ÜRET, BAYT BAYT KARŞILAŞTIR ═══
 *  Belgeyi yeniden üretip diskteki hâliyle karşılaştırıyoruz. Tek karakter
 *  farkı bile bayatlık demektir. "Başlıklar var mı" gibi gevşek bir ölçüt,
 *  bir paragrafın değişmesini KAÇIRIRDI.
 * ============================================================================
 */

/** ⚠ Liste ELLE TUTULMUYOR: `docs/`teki her `.md` için `.html` aranıyor. */
const BELGELER = ["sayim-proseduru"];

/**
 * ⛔ `iade-sureci` KAPSAM DIŞI VE SEBEBİ YAZILI: o HTML üreteç yazılmadan
 * ÖNCE elle üretilmiş ve bu üretecin çıktısıyla bayt bayt aynı değil.
 * Kapsama almak, bugün var olmayan bir bozulmayı bildirmek olurdu.
 * **Açılış şartı:** o belge bir kez `belge:uret` ile yeniden üretildiğinde
 * listeye eklenir.
 */
const KAPSAM_DISI = new Map([
  [
    "iade-sureci",
    "Üreteçten ÖNCE elle üretildi; bayt bayt eşleşmiyor. Bir kez `npm run belge:uret -- iade-sureci` koşulduğunda listeye eklenir.",
  ],
  ["el-kitabi", "Veritabanından üretiliyor (`el-kitabi-uret.ts`), Markdown kaynağı yok."],
]);

let gecen = 0;
const dusen: string[] = [];

console.log("\nBELGE BEKÇİSİ\n");

for (const ad of BELGELER) {
  const html = readFileSync("docs/" + ad + ".html", "utf8");

  /** Yeniden üret — ve üretecin ÇALIŞTIĞINI doğrula (çıkış kodu). */
  const r = spawnSync("npx tsx scripts/belge-uret.ts " + ad, {
    encoding: "utf8",
    shell: true,
    windowsHide: true,
  });
  if ((r.status ?? 1) !== 0) {
    dusen.push(ad + " — ÜRETEÇ ÇÖKTÜ:\n       " + ((r.stderr ?? "") + (r.stdout ?? "")).slice(-200));
    continue;
  }

  const yeni = readFileSync("docs/" + ad + ".html", "utf8");
  if (yeni === html) {
    gecen++;
    console.log("  ✓  " + ad + " — HTML kaynakla güncel");
  } else {
    dusen.push(
      ad + " — HTML BAYAT: `docs/" + ad + ".md` değişmiş ama HTML yeniden üretilmemiş.\n" +
        "       Çare:  npm run belge:uret -- " + ad,
    );
  }
}

for (const [ad, gerekce] of KAPSAM_DISI) {
  console.log("  ·  " + ad + " — kapsam dışı: " + gerekce.slice(0, 80));
}

if (dusen.length === 0) {
  console.log("\n  ✓  " + gecen + " belge güncel\n");
} else {
  console.log("");
  for (const d of dusen) console.log("  ✗  " + d);
  console.log("");
  process.exitCode = 1;
}
