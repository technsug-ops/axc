import { kaynakOku } from "./kaynak-oku";
import { abcSiniflari, abcUyelikleri, ABC_KOVALARI } from "../src/lib/panel/bi";
import { abcAdresi, abcSuzgeciCoz, ABC_PARAMETRESI } from "../src/lib/panel/abc-kumesi";

/**
 * ============================================================================
 *  ABC SATIRI → ÜRÜN LİSTESİ BEKÇİSİ (kullanıcı isteği 09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run abc-listesi:dogrula
 *
 *  «A · B · C · dönemde satışı yok satırlarına tıklanınca listeye gitmeli»
 *  (İlke #16). Söz «sayı = liste»: panelin 67'si tıklanınca 67 ürün açar.
 *  Ölçüldü (demo, son 30 gün): A 67 · B 43 · C 34 · satışsız 184 — panel =
 *  üyelik = liste, dördünde de.
 *
 *  ① KURAL (değerle) — üyelik sayıyla AYNI döngüden; adres kapsamı bozulmadan
 *     taşır; bozuk adres süzgeç UYDURMAZ.
 *  ② BAĞ — panel ve liste (ekran + Excel) AYNI yükleyiciyi çağırır.
 *  ③ EKRAN — satır bağlantısı yalnız ürün sayısı > 0 iken; liste süzgeci görünür.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 4;

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
console.log("ABC SATIRI → ÜRÜN LİSTESİ (09.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  /* Ayrımın bütün yakaları: A/B/C sınırları, satışsız stoklu, ne satışı ne stoğu olan. */
  const girdi = [
    { urunId: "a1", ciro: 500, stokDegeri: 10 },
    { urunId: "a2", ciro: 300, stokDegeri: 0 },
    { urunId: "b1", ciro: 150, stokDegeri: 5 },
    { urunId: "c1", ciro: 50, stokDegeri: 0 },
    { urunId: "s1", ciro: 0, stokDegeri: 40 },
    { urunId: "s2", ciro: 0, stokDegeri: 7 },
    { urunId: "yok", ciro: 0, stokDegeri: 0 },
  ];
  const sayi = abcSiniflari(girdi);
  const uyelik = abcUyelikleri(girdi);
  for (const k of ABC_KOVALARI) {
    const uye = [...uyelik.values()].filter((s) => s === k).length;
    kontrol(`«${k}» üyeleri = sınıf sayısı (aynı döngü)`, uye === sayi[k].urunSayisi && uye > 0, { uye, sayi: sayi[k].urunSayisi });
  }
  kontrol("sınırlar: a1,a2 → A · b1 → B · c1 → C · s1,s2 → satışsız",
    uyelik.get("a1") === "A" && uyelik.get("a2") === "A" && uyelik.get("b1") === "B" && uyelik.get("c1") === "C" &&
      uyelik.get("s1") === "SATISSIZ" && uyelik.get("s2") === "SATISSIZ");
  kontrol("ne satışı ne stoğu olan ürün HİÇBİR sınıfta değil", !uyelik.has("yok"));

  const kapsam = { baslangic: new Date("2026-09-09T21:00:00Z"), bitisHaric: new Date("2026-10-09T21:00:00Z"), para: "TRY" as const, kanal: "TRENDYOL" };
  const adres = abcAdresi("B", kapsam);
  kontrol("adres Ürünler'e ve tek parametreye gider", adres.startsWith(`/urunler?${ABC_PARAMETRESI}=`), adres);
  const coz = abcSuzgeciCoz(decodeURIComponent(adres.split("=")[1] ?? ""));
  kontrol("adres → çözüm kapsamı BİREBİR taşır (dönem anları · para · kanal · sınıf)",
    coz !== null && coz.kova === "B" && coz.kapsam.baslangic.getTime() === kapsam.baslangic.getTime() &&
      coz.kapsam.bitisHaric.getTime() === kapsam.bitisHaric.getTime() && coz.kapsam.para === "TRY" && coz.kapsam.kanal === "TRENDYOL", coz);
  const tumKanal = abcSuzgeciCoz(decodeURIComponent(abcAdresi("SATISSIZ", { ...kapsam, kanal: null }).split("=")[1] ?? ""));
  kontrol("kanalsız kapsam → kanal null (tüm kanallar)", tumKanal !== null && tumKanal.kapsam.kanal === null && tumKanal.kova === "SATISSIZ");
  for (const [ad, ham] of [
    ["bilinmeyen sınıf", "D~1~2~TRY~"],
    ["bilinmeyen para", "A~1~2~USD~"],
    ["ters aralık", "A~5~2~TRY~"],
    ["eşit aralık", "A~5~5~TRY~"],
    ["sayısal olmayan an", "A~x~2~TRY~"],
    ["eksik parça", "A~1~2~TRY"],
    ["fazla parça", "A~1~2~TRY~~x"],
    ["boş", ""],
  ] as const) {
    kontrol(`bozuk adres süzgeç UYDURMAZ (${ad})`, abcSuzgeciCoz(ham) === null);
  }
  kosanBolumler.push("kural");
}

console.log("\n2) bağ — panel ve liste aynı gövde");
{
  const panel = oku("src/app/panel-bi.tsx");
  kontrol("panel girdiyi ORTAK yükleyiciden alır", /abcGirdileriniYukle\(prisma, abcKapsami\)/.test(panel) && /const abc = abcSiniflari\(abcVerisi\.girdiler\);/.test(panel));
  kontrol("  ...panelde kendi stok/ciro hesabı KALMADI (ikinci ölçüt yok)", !/acikPartilerToplu/.test(panel) && !/urunCirosu/.test(panel));
  kontrol("  ...kapsam panelin çözülmüş döneminden",
    /const abcKapsami: AbcKapsami = \{ baslangic: donem\.baslangic, bitisHaric: donem\.bitisHaric, para, kanal \};/.test(panel));
  const sayfa = oku("src/app/urunler/page.tsx");
  kontrol("Ürünler süzgeci aynı gövdeden ve AND ile",
    /const abcKosulu = abc \? \{ id: \{ in: await abcUrunIdleri\(prisma, abc\.kova, abc\.kapsam\) \} \} : \{\};/.test(sayfa) &&
      /const kosul = \{ AND: \[[^\]]*abcKosulu\] \};/.test(sayfa));
  kontrol("  ...süzgeç sayfalama/Excel/düğmelerle taşınır", /\[ABC_PARAMETRESI\]: abc \? abcHam : undefined,/.test(sayfa));
  const kumesi = oku("src/lib/panel/abc-kumesi.ts");
  kontrol("liste kümesi üyelikten (aynı döngü) süzülür",
    /return \[\.\.\.abcUyelikleri\(girdiler\)\]\.filter\(\(\[, s\]\) => s === kova\)\.map\(\(\[id\]\) => id\);/.test(kumesi));
  kontrol("  ...yükleyici iptal edilmiş satışı ve kaldırılmış kalemi saymaz",
    /\.\.\.KALEM_GECERLI,/.test(kumesi) && /iptalTarihi: null,/.test(kumesi));
  const excel = oku("src/lib/disa-aktarma/listeler.ts");
  kontrol("Excel aynı süzgeci uygular (dosya = ekran)",
    /const abc = abcSuzgeciCoz\(p\[ABC_PARAMETRESI\]\);\s*return abc \? \{ id: \{ in: await abcUrunIdleri\(prisma, abc\.kova, abc\.kapsam\) \} \} : \{\};/.test(excel));
  kosanBolumler.push("bağ");
}

console.log("\n3) ekran");
{
  const panel = oku("src/app/panel-bi.tsx");
  const baglantilar = panel.match(/abc\[k\]\.urunSayisi > 0 \? \(\s*<Link\s+href=\{abcAdresi\(k, abcKapsami\)\}/g) ?? [];
  kontrol("sınıf ve ürün sayısı hücreleri bağlantı — YALNIZ sayı > 0 iken (iki hücre)", baglantilar.length === 2, baglantilar.length);
  kontrol("  ...telefonda 44 px dokunma alanı", /className="text-primary inline-flex min-h-11 items-center/.test(panel));
  const sayfa = oku("src/app/urunler/page.tsx");
  kontrol("Ürünler'de süzgeç şeridi görünür, kapsamı ve sayıyı yazar",
    /\{abc \? \(\s*<div[^>]*>\s*<Badge variant="secondary">\s*\{t\("abcSuzgeci", \{[\s\S]{0,400}?sayi: toplam,/.test(sayfa));
  kosanBolumler.push("ekran");
}

console.log("\n4) panelin öteki rakamları kaynağına (İlke #16, 09.10.2026)");
{
  /* Ölçüldü (demo, son 30 gün): ciro ₺1.245.440,08 · 378 sipariş · 380 adet · kanal 259/118/1 ·
     stok ₺2.502.671,99 = envanter «Ödenen (KDV dahil)» — panel = liste, yedisinde de. */
  const panel = oku("src/app/panel-bi.tsx");
  kontrol("liste adresi ORTAK kurucudan, panelin parametreleriyle",
    /const satisListesi = \(ek: Record<string, string \| undefined> = \{\}\) => suzgecAdresi\("\/satislar", listeParametreleri, ek\);/.test(panel) &&
      /const hesaplananlar = satisListesi\(\{ kar: "tam" \}\);/.test(panel));
  kontrol("  ...brüt ciro notu → dönem satışları", /<Link href=\{satisListesi\(\)\} className=\{kaynak\}>\{t\("dagilimNotu"/.test(panel));
  kontrol("  ...her kesinti tutarı → kârı hesaplanmış satışlar (dağılımın kaynağı)",
    /<Link href=\{hesaplananlar\} className=\{`tabular-nums \$\{kaynak\}`\}>\{tl\(s\.tutar\)\}<\/Link>/.test(panel));
  kontrol("  ...ödenecek KDV ve kalan NET-2 → kârı hesaplanmış satışlar",
    /href=\{hesaplananlar\}[^>]*>\{tl\(net1 - net2\)\}/.test(panel) && /href=\{hesaplananlar\}[^>]*>\{tl\(net2\)\}/.test(panel));
  kontrol("  ...hesaplanmayan ciro → kârı EKSİK satışlar", /href=\{satisListesi\(\{ kar: "eksik" \}\)\}[^>]*>\{tl\(hesaplanmayanCiro\)\}/.test(panel));
  kontrol("  ...sipariş sayısı → dönem satışları; adet → kârı hesaplanmış",
    /<Link href=\{satisListesi\(\)\} className=\{kaynak\}>\{t\("aovNotu"/.test(panel) &&
      /<Link href=\{hesaplananlar\} className=\{kaynak\}>\{t\("adetBasinaNet2Notu"/.test(panel));
  kontrol("  ...stok devir hızı ve stok günü → envanter değeri",
    (panel.match(/<Link href="\/envanter-degeri" className=\{kaynak\}>\{t\("(devirNotu|stokGunuNotu)"/g) ?? []).length === 2);
  kontrol("  ...kanal satırı → o kanalın satışları (44 px)",
    /href=\{satisListesi\(\{ kanal: kod \}\)\}\s*className="[^"]*min-h-11/.test(panel));
  const anaSayfa = oku("src/app/page.tsx");
  kontrol("panel ÇÖZÜLMÜŞ dönemi verir (kargosuz kutusuyla aynı kalıp)",
    /listeParametreleri=\{\{ pencere: donemTuru, baslangic: parametreler\.baslangic, bitis: parametreler\.bitis, kanal: seciliKanal \|\| undefined \}\}/.test(anaSayfa));
  kosanBolumler.push("öteki rakamlar");
}

console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(`KOŞUM YARIM KALDI — sonuç GEÇERSİZ (${kosanBolumler.length}/${BOLUM_SAYISI})`);
  process.exit(1);
} else if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
