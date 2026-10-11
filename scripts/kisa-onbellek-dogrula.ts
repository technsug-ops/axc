import { kaynakOku } from "./kaynak-oku";
import { kisaOnbellek, kisaOnbellegiBosalt, PANEL_ONBELLEK_MS } from "../src/lib/kisa-onbellek";

/**
 * ============================================================================
 *  KISA ÖNBELLEK BEKÇİSİ (K332, 11.10.2026) — `npm run kisa-onbellek:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: panelin ağır blokları en fazla 2 dk eski olabilir.
 *  ① DEĞER — süre içinde aynı sonuç, süre dolunca yeniden hesap; hata
 *     önbelleğe YAZILMAZ; anahtarlar karışmaz; eşzamanlı istek tek hesabı paylaşır.
 *  ② BAĞ — vitrin ve iş zekası önbellekten, anahtar FİRMAYI taşır, blok
 *     hesaplandığı saati YAZAR (eski rakam taze görünmesin).
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

async function main() {
  console.log("=".repeat(70));
  console.log("KISA ONBELLEK (K332, 11.10.2026)");
  console.log("=".repeat(70));

  /* ① DEĞER */
  {
    kisaOnbellegiBosalt();
    let sayac = 0;
    const uret = async () => ++sayac;
    const a = await kisaOnbellek("k", 1000, uret, 10_000);
    const b = await kisaOnbellek("k", 1000, uret, 10_500);
    kontrol("süre içinde ikinci istek HESAPLAMAZ (aynı değer, aynı an)", a.deger === 1 && b.deger === 1 && sayac === 1 && a.an.getTime() === b.an.getTime());
    const c = await kisaOnbellek("k", 1000, uret, 11_001);
    kontrol("süre dolunca YENİDEN hesaplar", c.deger === 2 && sayac === 2 && c.an.getTime() === 11_001);
    const d = await kisaOnbellek("baska", 1000, uret, 11_002);
    kontrol("farklı anahtar karışmaz", d.deger === 3);

    kisaOnbellegiBosalt();
    let dene = 0;
    const patlar = async () => {
      dene++;
      if (dene === 1) throw new Error("ilk deneme düştü");
      return "tamam";
    };
    let yakalandi = false;
    try {
      await kisaOnbellek("h", 60_000, patlar, 1);
    } catch {
      yakalandi = true;
    }
    const sonra = await kisaOnbellek("h", 60_000, patlar, 2);
    kontrol("hata FIRLAR ve önbelleğe YAZILMAZ (sonraki istek yeniden dener)", yakalandi && sonra.deger === "tamam" && dene === 2);

    kisaOnbellegiBosalt();
    let es = 0;
    const yavas = () => new Promise<number>((coz) => setTimeout(() => coz(++es), 20));
    const [x, y] = await Promise.all([kisaOnbellek("e", 1000, yavas, 5), kisaOnbellek("e", 1000, yavas, 6)]);
    kontrol("eşzamanlı istekler TEK hesabı paylaşır", x.deger === 1 && y.deger === 1 && es === 1);

    kisaOnbellegiBosalt();
    let t = 0;
    for (let i = 0; i < 205; i++) await kisaOnbellek(`t${i}`, 60_000, async () => ++t, 100);
    const ilk = await kisaOnbellek("t0", 60_000, async () => -1, 100);
    const son = await kisaOnbellek("t204", 60_000, async () => -1, 100);
    kontrol("bellek tavanı: en eski kayıt düşer, yenisi kalır", ilk.deger === -1 && son.deger === 205);
    kontrol("panel süresi kullanıcı kararı: 2 dk", PANEL_ONBELLEK_MS === 120_000);
    kisaOnbellegiBosalt();
    kosanBolumler.push("deger");
  }

  /* ② BAĞ */
  {
    const panel = yorumsuz(kaynakOku("src/app/page.tsx"));
    kontrol("vitrin önbellekten ve anahtar FİRMALI", panel.includes("kisaOnbellek(`vitrin:${panelFirmasi}`, PANEL_ONBELLEK_MS, vitrinKutusunuTopla)"));
    kontrol("  ...firma istek başına yetki bağlamından", panel.includes('const panelFirmasi = (await yetkiBaglami())?.companyId ?? "-";'));
    kontrol("  ...vitrin bloğu hesaplandığı saati yazar", /<VitrinSerhi veri=\{vitrin\} \/>\s*\{vitrin\.length > 0 \? <OnbellekNotu an=\{vitrinOnbellegi\.an\} \/> : null\}/.test(panel));
    const bi = yorumsuz(kaynakOku("src/app/panel-bi.tsx"));
    kontrol("iş zekası önbellekten; anahtar firma + dönem + kanal + para",
      bi.includes("`bi:${biFirmasi}:${donem.baslangic.getTime()}:${donem.bitisHaric.getTime()}:${kanal ?? \"\"}:${para}`") &&
        bi.includes('const biFirmasi = (await yetkiBaglami())?.companyId ?? "-";'));
    kontrol("  ...iş zekası hesaplandığı saati yazar", /<OnbellekNotu an=\{biOnbellegi\.an\} \/>/.test(bi));
    const not = yorumsuz(kaynakOku("src/components/onbellek-notu.tsx"));
    kontrol("not metni sözlükten ve süreyi sabitten okur", /t\("onbellekNotu", \{ saat: bicim\.saat\(an\), dakika: Math\.round\(PANEL_ONBELLEK_MS \/ 60000\) \}\)/.test(not));
    kosanBolumler.push("bag");
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
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
