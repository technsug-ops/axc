import { readdirSync } from "node:fs";

import { kaynakOku } from "./kaynak-oku";

/**
 * ============================================================================
 *  DİYALOG BOYU BEKÇİSİ — UZUN DİYALOG ONAYLANABİLİR Mİ? (K371, 06.11.2026)
 * ----------------------------------------------------------------------------
 *      npm run diyalog-boyu:dogrula
 *
 *  BETIK SINIFI: SUREKLI — kapıdan geçmeli. Hiçbir şey YAZMAZ.
 *
 *  ⛔ NİYE VAR — KULLANICI CANLIDA ÇARPTI (06.11.2026): «bu siparişi telefonda
 *  onaylayamıyorum, satın alım çeşiti çok, ekran aşağıya inmiyor.» 11 partili
 *  bir siparişin onay diyaloğu ekranı aştı ve ONAYLA düğmesine hiç
 *  ulaşılamadı.
 *
 *  SEBEP: `AlertDialogContent` ve `DialogContent` `fixed top-1/2 …
 *  -translate-y-1/2` ile ortalanıyordu ve YÜKSEKLİK SINIRI YOKTU. İçerik
 *  ekranı aşınca kutu iki uçtan birden dışarı taşıyor; diyalog sayfa akışında
 *  olmadığı ve Radix gövde kaydırmasını kilitlediği için kaydırılacak bir şey
 *  de kalmıyor. Ekranda bir HATA görünmüyor — yalnız düğme yok.
 *
 *  ÖLÇÜLDÜ (gerçek tarayıcı, 11 seçenek, sarmalı satırlar):
 *    360×640  sınırsız → Onayla 702..738 px · ekran 640  → ULAŞILAMAZ
 *    390×844  sınırsız → kutu -56..900 (iki uçtan taşıyor)
 *    sınırlı           → kutu 16..828 · iç kaydırma 144 px · düğme ulaşılır
 *
 *  ⚠ ÖLÇÜT DOSYA LİSTESİ DEĞİL, DESEN YASAĞI: aynı kusura bir ekran ZATEN
 *  çarpmış ve kendi başına yükseklik sınırı koymuştu
 *  (`satislar/[id]/yeniden-hesapla.tsx`) — çare tek dosyada kaldı, kalan 45
 *  diyalog korumasız yaşadı. Bu bekçi iki şeyi birden ölçer:
 *    ① sınır ORTAK BİLEŞENDE duruyor mu,
 *    ② hiçbir tüketici KENDİ sınırını beyan etmiyor (iki yerde iki ölçüt
 *       olursa biri ötekini sessizce geçersizleştirir).
 *  Yarın açılan diyalog da kapsama kendiliğinden girer.
 *
 *  ⚠ TABAN DOLULUĞU AYRICA ÖLÇÜLÜR: tarama sıfır dosya bulursa döngü hiç
 *  dönmez ve bekçi "tüm kontroller geçti" der — boş küme her koşulu sağlar.
 *
 *  ⚠ YORUMSUZ KODDA ARANIR: bu depodaki bileşen dosyaları kusuru ANLATAN uzun
 *  yorum blokları taşıyor ve o yorumlarda sınıf adları geçiyor. Yorum, sınıfın
 *  yerinde durduğunu KANITLAMAZ.
 * ============================================================================
 */

const yorumsuz = (m: string) =>
  m.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/**
 * Yorumları UZUNLUĞU KORUYARAK boşaltır (satır sonları yerinde kalır).
 *
 * ⚠ NİYE `yorumsuz` yetmiyor: ② numaralı bölüm bir kullanımın KONUMUNU bulup
 * HAM metinde onun ÜSTÜNDEKİ beyanı arıyor. `yorumsuz` yorumu tek boşluğa
 * indirdiği için konumlar kayar ve beyan yanlış yerde aranır — ölçüt sessizce
 * kör kalırdı. Burada her yorum kendi uzunluğunca boşlukla değişir, böylece
 * iki metnin indisleri BİREBİR aynı kalır.
 */
function yorumBosalt(m: string): string {
  return m.replace(/\/\*[\s\S]*?\*\//g, (y) => y.replace(/[^\n]/g, " "));
}

/**
 * Bir tüketici ortak bileşenin sınırını EZEBİLİR — ama bedavaya değil:
 * kullanımın hemen üstünde GEREKÇELİ bir beyan durmak zorunda.
 * _(Anayasa: "istisnalar gerekçesiyle beyan edilir; beyan edilmemiş her
 * kullanım hata sayılır" — ve "muafiyet gerekçesiz verilemez".)_
 */
/**
 * ⚠ GEREKÇE AYNI SATIRDA: ilk yazımda desen `[\s\S]{19,}` idi ve satır sonunu
 * aşıyordu — boş bir `DIYALOG SINIRI ISTISNA:` bile, ARDINDAN GELEN KOD
 * gerekçe sayıldığı için geçiyordu. Yani muafiyet fiilen bedavaydı.
 */
const BEYAN = /DIYALOG SINIRI ISTISNA:[ \t]*(\S[^\n]{19,})/;
/** Beyanın kullanımdan ne kadar önce durabileceği (karakter). */
const BEYAN_PENCERESI = 500;

/** Her bölüm bittiğinde kendini kaydeder — yarım koşum "geçti" diyemez. */
const BOLUM_SAYISI = 3;
const kosanBolumler: string[] = [];

let basarisiz = 0;
let calisan = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  calisan++;
  if (kosul) {
    console.log(`  OK    ${ad}`);
  } else {
    basarisiz++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

console.log("");
console.log("DİYALOG BOYU BEKÇİSİ — K371");

/** `src/` altındaki bütün .tsx dosyaları — liste tutulmaz, taranır. */
function tsxDosyalari(): string[] {
  return readdirSync("src", { recursive: true, encoding: "utf8" })
    .filter((y) => y.endsWith(".tsx"))
    .map((y) => "src/" + y.split("\\").join("/"));
}

/**
 * Bir bileşen gövdesini ADIYLA değil KONUMUYLA keser: `function XContent({`
 * satırından bir SONRAKİ `function ` bildirimine kadar. Üstündeki yorum bloğu
 * böylece kapsam dışında kalır.
 */
function govde(kaynak: string, bilesen: string): string {
  const bas = kaynak.indexOf(`function ${bilesen}({`);
  if (bas < 0) return "";
  const son = kaynak.indexOf("\nfunction ", bas + 1);
  return kaynak.slice(bas, son < 0 ? kaynak.length : son);
}

/* ─────────────────────────────────────────────────────────────────────────
   ① ORTAK BİLEŞEN — sınır ve iç kaydırma, KONUMLANAN öğenin kendisinde
   ───────────────────────────────────────────────────────────────────────── */
console.log("\n1) ORTAK BİLEŞEN — yükseklik sınırı yerinde mi?");
{
  const BILESENLER: ReadonlyArray<readonly [string, string]> = [
    ["src/components/ui/alert-dialog.tsx", "AlertDialogContent"],
    ["src/components/ui/dialog.tsx", "DialogContent"],
  ];
  kontrol("taban dolu — iki diyalog bileşeni de ölçülüyor", BILESENLER.length === 2);

  for (const [yol, bilesen] of BILESENLER) {
    const blok = govde(yorumsuz(kaynakOku(yol)), bilesen);
    kontrol(`${bilesen} gövdesi bulundu`, blok.length > 200, { yol, uzunluk: blok.length });
    if (blok.length <= 200) continue;

    /**
     * Sınıflar `cn("…", className)` içindeki İLK dizede duruyor. Ölçüt o
     * dizeye bağlanır: `fixed` ile AYNI dizede olmayan bir `max-h-`, başka bir
     * iç öğeye konmuş demektir ve kutuyu sınırlamaz.
     */
    const sinif = /cn\(\s*"([\s\S]*?)"/.exec(blok)?.[1] ?? "";
    kontrol(`${bilesen} sınıf dizesi okundu`, sinif.length > 50, sinif.slice(0, 60));
    kontrol(
      `${bilesen} ekrana sabitlenmiş ve ortalanmış (ölçütün dayanağı)`,
      sinif.includes("fixed") && sinif.includes("top-1/2"),
      sinif.slice(0, 80),
    );
    kontrol(
      `${bilesen} YÜKSEKLİK SINIRI taşıyor (uzun içerik ekranı aşamaz)`,
      /max-h-\[/.test(sinif),
      sinif,
    );
    kontrol(
      `${bilesen} İÇ KAYDIRMA taşıyor (sınıra değen içerik kaydırılabilir)`,
      /\boverflow-y-auto\b/.test(sinif),
      sinif,
    );
    /**
     * Sınır `100%` olmalı: yüzde, sabit konumlu öğede `top-1/2` ile AYNI kabı
     * (ilk içeren blok) ölçer — ortalama ile sınır tek referanstan okunur.
     * `vh` ikinci bir referans açar ve ikisi ayrışabilir.
     */
    kontrol(
      `${bilesen} sınırı yüzdeyle kurulu (ortalamayla aynı referans)`,
      /max-h-\[calc\(100%/.test(sinif),
      sinif.match(/max-h-\[[^\]]*\]/)?.[0],
    );
  }
  kosanBolumler.push("ortak bileşen");
}

/* ─────────────────────────────────────────────────────────────────────────
   ② DESEN YASAĞI — tüketici KENDİ sınırını beyan edemez
   ───────────────────────────────────────────────────────────────────────── */
console.log("\n2) DESEN YASAĞI — tüketici kendi sınırını koymuyor");
{
  const YASAK = /(?:^|\s)(?:max-h-|h-\[|overflow-y-|overflow-auto|overflow-hidden)/;
  const ihlaller: string[] = [];
  const beyanlilar: string[] = [];
  let kullanim = 0;

  for (const yol of tsxDosyalari()) {
    const ham = kaynakOku(yol);
    // ⚠ Kullanımlar YORUMSUZ metinde aranır (belgede geçen örnek sayılmasın),
    //   ama indisler HAM metinle aynı kalsın diye yorumlar boşlukla doldurulur.
    const kod = yorumBosalt(ham);
    for (const m of kod.matchAll(/<(AlertDialogContent|DialogContent)\b([^>]*)>/g)) {
      kullanim++;
      const sinif = /className=\{?"([^"]*)"/.exec(m[2] ?? "")?.[1] ?? "";
      if (!YASAK.test(sinif)) continue;

      const onu = ham.slice(Math.max(0, (m.index ?? 0) - BEYAN_PENCERESI), m.index ?? 0);
      const yer = `${yol} — <${m[1]} className="${sinif}">`;
      if (BEYAN.test(onu)) beyanlilar.push(yer);
      else ihlaller.push(yer);
    }
  }

  // Taban doluluğu: tarama kör dönerse her koşul boş kümede sağlanır.
  kontrol(`taban dolu — ${kullanim} diyalog kullanımı tarandı (≥ 40)`, kullanim >= 40);
  kontrol(
    "ortak bileşenin sınırını ezen BEYANSIZ kullanım yok",
    ihlaller.length === 0,
    ihlaller,
  );
  // Beyanlı istisna meşrudur ama GÖRÜNÜR kalır — sessizce çoğalmasın.
  kontrol(
    `beyanlı istisna ${beyanlilar.length} (gerekçesi kodda yazılı)`,
    beyanlilar.length <= 3,
    beyanlilar,
  );
  kosanBolumler.push("desen yasağı");
}

/* ─────────────────────────────────────────────────────────────────────────
   ③ SİPARİŞ ONAYI — parti listesi kendi içinde kayar
   ───────────────────────────────────────────────────────────────────────── */
console.log("\n3) SİPARİŞ ONAYI — parti listesi diyaloğu uzatmıyor");
{
  const kod = yorumsuz(kaynakOku("src/app/satislar/siparis-onayi.tsx"));
  const yerler = [...kod.matchAll(/role="radiogroup"/g)].map((m) => m.index ?? -1);
  kontrol("taban dolu — parti seçim listesi tek ve bulundu", yerler.length === 1, yerler.length);

  if (yerler.length === 1) {
    /**
     * ⚠ KULLANIM BLOĞUNA DARALTILIR: aynı dosyada başka `max-h-` geçerse dosya
     * geneli tarama onu bulur ve ölçüt kör kalır. Pencere, radiogroup rolünden
     * GERİYE en yakın `<div` etiketine kadar.
     */
    const bas = kod.lastIndexOf("<div", yerler[0]!);
    kontrol("radiogroup kutusu bulundu", bas >= 0 && yerler[0]! - bas < 400, yerler[0]! - bas);
    const blok = bas >= 0 ? kod.slice(bas, yerler[0]!) : "";
    kontrol(
      "parti listesi YÜKSEKLİK SINIRI taşıyor (liste diyaloğu uzatamaz)",
      /max-h-\d/.test(blok),
      blok.replace(/\s+/g, " ").trim(),
    );
    kontrol(
      "parti listesi KENDİ İÇİNDE kayar",
      /\boverflow-y-auto\b/.test(blok),
      blok.replace(/\s+/g, " ").trim(),
    );
  }
  kosanBolumler.push("sipariş onayı");
}

/* ───────────────────────────────────────────────────────────────────────── */
console.log("");
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI}: ${kosanBolumler.join(" · ")})`,
  );
  process.exit(1);
}
if (basarisiz === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${calisan})`);
  process.exit(0);
} else {
  console.log(`${basarisiz} KONTROL BAŞARISIZ (${calisan} kontrol içinde)`);
  process.exit(1);
}
