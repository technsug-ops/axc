import { existsSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";
import {
  DEGER_DESENI_KAYNAGI,
  HAZIR_RENKLER,
  CIZGI_SEVIYELERI,
  KISISEL_DEGISKENLERI,
  KISISEL_VARSAYILAN,
  kisiselTema,
  kontrastOrani,
  KONTRAST_ESIGI,
} from "../src/lib/marka/kisisel-tema";

/**
 * ============================================================================
 *  KİŞİSEL TEMA BEKÇİSİ (07.10.2026) — `npm run kisisel-tema:dogrula`
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «kaliteli bir kontrast ile kişiler istedikleri tema rengini ve
 *  kart yuvarlaklığını oluşturamazlar mı?» Gece ve pembe kaldırıldı.
 *  ① KURAL (değerle) — kontrast sözü: uygulanan vurgu beyaza VE kendi açık
 *     tonuna karşı ≥ 4,5:1; eşiği geçen renk DOKUNULMADAN kalır; köşe sınırlı;
 *     logo rengi tema değil marka (listede yok); depo değeri desenden geçer.
 *  ② ZİNCİR — başlık betiği, tema düğmesi ve CSS aynı sabitlerden okur;
 *     koyulaştırma EKRANDA söylenir; kişiselden çıkınca değişkenler silinir.
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
const oku = (y: string) => yorumsuz(kaynakOku(y));

console.log("=".repeat(70));
console.log("KİŞİSEL TEMA (07.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  const okunur = (renk: string) => {
    const s = kisiselTema({ renk, kose: 12 });
    return kontrastOrani(s.uygulanan, "#FFFFFF") >= KONTRAST_ESIGI &&
      kontrastOrani(s.uygulanan, s.degiskenler["--se-vurgu-bg"]) >= KONTRAST_ESIGI;
  };
  kontrol("hazır öneri listesi dolu", HAZIR_RENKLER.length >= 4, HAZIR_RENKLER.length);
  for (const renk of HAZIR_RENKLER) {
    const s = kisiselTema({ renk, kose: 12 });
    kontrol(`hazır ${renk}: eşiği geçiyor ve DOKUNULMADAN uygulanıyor`, okunur(renk) && !s.koyulasti && s.uygulanan === renk, s.uygulanan);
  }
  /* Ayrımın iki yakası: #1F7A8C beyaza karşı 4,98 (geçer) ama kendi açık
     tonuna karşı 4,38 (geçmez) — yalnız beyazı ölçen bir kural onu geçirirdi. */
  const petrol = kisiselTema({ renk: "#1F7A8C", kose: 12 });
  kontrol("beyazı geçip AÇIK TONU geçemeyen renk koyulaşıyor", petrol.koyulasti && okunur("#1F7A8C"), petrol.uygulanan);
  const sari = kisiselTema({ renk: "#FFD400", kose: 12 });
  kontrol("açık sarı koyulaşıyor ve okunur hâle geliyor", sari.koyulasti && okunur("#FFD400"), sari.uygulanan);
  kontrol("  ...seçilen renk de ayrıca tutuluyor (ekranda söylenir)", sari.secilen === "#FFD400");
  const beyaz = kisiselTema({ renk: "#FFFFFF", kose: 12 });
  kontrol("beyaz bile okunur bir vurguya dönüyor", okunur("#FFFFFF") && beyaz.uygulanan !== "#FFFFFF", beyaz.uygulanan);

  /* Kobalt girildiğinde kobalt paleti geri çıkmalı — türetme oranları
     paletten ölçüldü. Tolerans 16 birim: palet tonları elle biraz daha MAVİYE
     kaydırılmış (#B6C7DE ↔ düz karışım #B6C0D1, mavi kanalda 13); düz karışım
     rengin tonunu korur, kaydırmayı taklit etmez — ölçüldü 07.10.2026. */
  const kobalt = kaynakOku("src/styles/tema-kobalt.css");
  const k = kisiselTema({ renk: "#12356B", kose: 12 }).degiskenler;
  const kanal = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (const ad of ["--se-vurgu", "--se-vurgu-hover", "--se-vurgu-bg", "--se-vurgu-cizgi"] as const) {
    const palet = new RegExp(`${ad}:\\s*(#[0-9A-Fa-f]{6})`).exec(kobalt)?.[1];
    const sapma = palet ? Math.max(...kanal(palet).map((c, i) => Math.abs(c - kanal(k[ad])[i]!))) : NaN;
    kontrol(`kobalt girişi ${ad} paleti ±16 içinde üretiyor`, Number.isFinite(sapma) && sapma <= 16, { palet, uretilen: k[ad], sapma });
  }
  kontrol("köşe alt sınır (−5 → 0)", kisiselTema({ renk: "#12356B", kose: -5 }).kose === 0);
  kontrol("köşe üst sınır (99 → 20)", kisiselTema({ renk: "#12356B", kose: 99 }).kose === 20);
  kontrol("köşe sayı değilse varsayılan", kisiselTema({ renk: "#12356B", kose: "abc" }).kose === KISISEL_VARSAYILAN.kose);
  kontrol("köşe rem olarak yazılıyor (12 px → 0.75rem)", k["--radius"] === "0.75rem");
  /* Kart çizgisi (08.10.2026): 0 = çerçevesiz (Algoritmo), seviye arttıkça
     mürekkebin saydamlığı artar; renk değil ton. */
  const cizgi = (c: unknown) => kisiselTema({ renk: "#12356B", kose: 12, cizgi: c });
  kontrol("çizgi varsayılanı çerçevesiz", k["--se-kart-cizgi"] === "transparent" && cizgi(undefined).cizgi === 0);
  kontrol("çizgi seviyesi sınırlı (9 → en koyu, −2 → yok)", cizgi(9).cizgi === CIZGI_SEVIYELERI.length - 1 && cizgi(-2).cizgi === 0);
  kontrol("çizgi seviyeleri gittikçe belirginleşiyor",
    CIZGI_SEVIYELERI.every((v, i) => i === 0 ? v === 0 : v > CIZGI_SEVIYELERI[i - 1]!) && CIZGI_SEVIYELERI.length >= 4);
  kontrol("çizgi nötr mürekkep tonu (vurgudan bağımsız)",
    kisiselTema({ renk: "#6B3FA0", kose: 12, cizgi: 2 }).degiskenler["--se-kart-cizgi"] === "rgba(35, 43, 53, 0.16)");
  kontrol("geçersiz renk varsayılana düşüyor", kisiselTema({ renk: "red; x", kose: 12 }).uygulanan === KISISEL_VARSAYILAN.renk);
  kontrol("kâr yeşiline yakın ton uyarı veriyor", kisiselTema({ renk: "#2F9E5B", kose: 12 }).anlamUyarisi === "kar");
  kontrol("zarar kırmızısına yakın ton uyarı veriyor", kisiselTema({ renk: "#C62828", kose: 12 }).anlamUyarisi === "zarar");
  kontrol("marka kobaltı uyarı vermiyor", kisiselTema({ renk: "#12356B", kose: 12 }).anlamUyarisi === null);

  const desen = new RegExp(DEGER_DESENI_KAYNAGI);
  const uretilen = kisiselTema({ renk: "#6B3FA0", kose: 7 }).degiskenler;
  kontrol("üretilen her değişken izin listesinde ve desene uyuyor",
    KISISEL_DEGISKENLERI.every((ad) => typeof uretilen[ad] === "string" && desen.test(uretilen[ad])) && KISISEL_DEGISKENLERI.length >= 10,
    uretilen);
  kontrol("desen yabancı değeri reddediyor", !desen.test("#123456; background:url(x)") && !desen.test("red"));
  /* Logo rengi MARKADIR (kılavuz: «renklerin yeri değiştirilmez»). */
  kontrol("logo rengi kişisel temaya GİRMİYOR", !(KISISEL_DEGISKENLERI as readonly string[]).includes("--se-kabuk-marka"));
  kontrol("kâr/zarar renkleri kişisel temaya GİRMİYOR",
    !(KISISEL_DEGISKENLERI as readonly string[]).some((a) => /^--se-(kar|zarar|celiski)(-|$)/.test(a)));
}
kosanBolumler.push("kural");

console.log("\n2) zincir — betik · düğme · CSS");
{
  const duzen = oku("src/app/layout.tsx");
  const betikBasi = duzen.indexOf("const TEMA_BETIGI");
  const betik = duzen.slice(betikBasi, duzen.indexOf("`;", betikBasi));
  kontrol("başlık betiği kesildi", betikBasi > 0 && betik.length > 200);
  kontrol("  ...kişisel kaydı ortak anahtardan okuyor", betik.includes("localStorage.getItem(${JSON.stringify(KISISEL_ANAHTARI)})"));
  kontrol("  ...yalnız izinli adları yazıyor", betik.includes("var a=${JSON.stringify(KISISEL_DEGISKENLERI)}"));
  kontrol("  ...değeri desenden geçirip yazıyor",
    betik.includes("var r=new RegExp(${JSON.stringify(DEGER_DESENI_KAYNAGI)})") &&
      /if\(typeof v==="string"&&r\.test\(v\)\)\{k\.style\.setProperty\(a\[i\],v\);\}/.test(betik));
  kontrol("  ...yalnız kişisel temada", /if\(t==="kisisel"\)\{var o=JSON\.parse/.test(betik));

  const secici = oku("src/components/tema-secici.tsx");
  kontrol("kişiselden çıkınca değişkenler siliniyor", secici.includes('kisiselDegiskenleriYaz(tema === "kisisel" ? kisisel : null);'));
  kontrol("  ...silme gövdesi izinsiz adı bırakmıyor", /else stil\.removeProperty\(ad\);/.test(secici));
  kontrol("kişisel değişiklik depoya yazılıyor", secici.includes("yazDepoya(KISISEL_ANAHTARI, JSON.stringify(kayit));"));
  kontrol("koyulaştırma EKRANDA söyleniyor",
    /\{sonuc\.koyulasti \? \(\s*<p[^>]*>\s*\{t\("temaKoyulasti", \{ secilen: sonuc\.secilen, uygulanan: sonuc\.uygulanan \}\)\}/.test(secici));
  kontrol("anlam uyarısı EKRANDA söyleniyor", /\{sonuc\.anlamUyarisi \? \(\s*<p[^>]*>\s*\{t\(sonuc\.anlamUyarisi === "kar" \? "temaKarYakin" : "temaZararYakin"\)\}/.test(secici));
  kontrol("köşe kaydırıcısı sınırlardan", secici.includes("min={KOSE_SINIRI.alt}") && secici.includes("max={KOSE_SINIRI.ust}"));
  kontrol("çizgi kaydırıcısı seviyelerden ve kayda yazıyor",
    secici.includes("max={CIZGI_SEVIYELERI.length - 1}") && secici.includes("onChange={(e) => kisiselDegistir({ cizgi: Number(e.target.value) })}"));

  const kobalt = kaynakOku("src/styles/tema-kobalt.css");
  kontrol("kişisel tema kobalt yüzeylerine bağlı", /\[data-tema="kobalt"\],\s*(\/\*[\s\S]*?\*\/\s*)?\[data-tema="kisisel"\] \{/.test(kobalt));
  const kopru = oku("src/app/globals.css");
  kontrol("köprü seçicisi kişiseli sayıyor", kopru.includes('[data-tema="kisisel"],'));
  kontrol("kart halkası çizgi değişkenine bağlı", /\[data-slot="card"\] \{[^}]*--tw-ring-color: var\(--se-kart-cizgi, transparent\);/.test(kopru));
  kontrol("elle yazılmış kutu çizgisi de aynı değişkene bağlı",
    /\.rounded-lg\.border:not\(\.border-dashed\) \{\s*border-color: var\(--se-kart-cizgi, transparent\);/.test(kopru));
  kontrol("düğme ve girdi köşesi kart köşesine bağlı (sabit 8px değil)",
    (kopru.match(/border-radius: calc\(var\(--radius\) \* 2 \/ 3\);/g) ?? []).length === 2 && !/\[data-slot="button"\] \{\s*border-radius: 8px/.test(kopru));
  kontrol("kaldırılan tema dosyaları yok", !existsSync("src/styles/tema-gece.css") && !existsSync("src/styles/tema-pembe.css"));
}
kosanBolumler.push("zincir");

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI (${kosanBolumler.length}/${BOLUM_SAYISI}) — sonuç GEÇERSİZ`);
  process.exit(1);
}
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
