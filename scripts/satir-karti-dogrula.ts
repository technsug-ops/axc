import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { SatirKarti, SatirListesi } from "../src/components/satir-karti";
import { DURUM_EYLEMI_KABI, DURUM_EYLEMI_SINIFI, EYLEM_SINIFI } from "../src/components/satir-eylemi";
import { DURUM_ZEMINI } from "../src/lib/renkler";

/**
 * ============================================================================
 *  SATIR KARTI — BEKÇİ (K235, 22.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — BEKCI. Hiçbir şey yazmaz, veritabanına gitmez.
 *
 *  ⭐ DEĞER TESTİ, KAYNAK TARAMASI DEĞİL. `SatirKarti` saf bir gövdedir
 *  (kanca yok, yan etki yok) ve React öğesi düz bir nesnedir — bu yüzden
 *  ÇAĞRILIP dönüşü sınanır. Anayasa: "saf hesap katmanı, desen tarayan
 *  bekçiye muhtaç olmaz."
 *
 *  ② KAPSAM bölümü kaynak tarar ama BİR ŞEYİ ÖLÇER, liste tutmaz: aynı
 *  listeyi İKİ KEZ çizen ekranların (masaüstü `<Table>` + telefon
 *  `ListeKarti`) sayısı. Bu sayı K235'in işini bitirene kadar DÜŞMELİ;
 *  ekranda yazar ki kalan iş görünür kalsın.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;
const kosanBolumler: string[] = [];
const BOLUM_SAYISI = 5; /* K272: +1 (telefon düzeni) · K275: +1 (durum düğmeleri) · K272-②③: +1 */

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(`  HATA  ${ad}`);
    if (gorulen !== undefined) console.log(`         ${JSON.stringify(gorulen)}`);
  }
}

/** React öğesi düz nesnedir: tipi ve props'u doğrudan okunur. */
type Ogeler = { type?: unknown; props?: Record<string, unknown> };
const tipi = (o: unknown): string => {
  const t = (o as Ogeler)?.type;
  return typeof t === "string" ? t : typeof t === "function" ? "BILESEN" : "?";
};
/** Ağaçtaki bütün metin düğümlerini sırayla toplar. */
function metinler(o: unknown, cikti: string[] = []): string[] {
  if (o === null || o === undefined || o === false || o === true) return cikti;
  if (typeof o === "string" || typeof o === "number") {
    cikti.push(String(o));
    return cikti;
  }
  if (Array.isArray(o)) {
    for (const x of o) metinler(x, cikti);
    return cikti;
  }
  const props = (o as Ogeler).props;
  if (props && "children" in props) metinler(props.children, cikti);
  return cikti;
}
/** Ağaçtaki bütün `className` değerleri — anatomi sınıfları burada aranır. */
function siniflar(o: unknown, cikti: string[] = []): string[] {
  if (o === null || typeof o !== "object") return cikti;
  if (Array.isArray(o)) {
    for (const x of o) siniflar(x, cikti);
    return cikti;
  }
  const props = (o as Ogeler).props;
  if (props) {
    if (typeof props.className === "string") cikti.push(props.className);
    if ("children" in props) siniflar(props.children, cikti);
  }
  return cikti;
}

console.log("\nSATIR KARTI — BEKÇİ");
console.log("=".repeat(70));

// ═══ 1) ANATOMİ — GÖVDE ÇAĞRILIR ═════════════════════════════════════════
console.log("\n1) ANATOMİ (gövde çağrılır, değer sınanır)");
{
  const duz = SatirKarti({ baslik: "Manşet" });
  kontrol("açılır verilmeyen satır DÜZ kutudur (<div>, <details> DEĞİL)", tipi(duz) === "div", tipi(duz));
  kontrol("  ...ve dokunma hedefi 56 px (min-h-14, İlke #8)", siniflar(duz).some((c) => c.includes("min-h-14")));

  const acilir = SatirKarti({ baslik: "Manşet", acilir: "döküm" });
  kontrol("açılır verilen satır <details> olur (JavaScript'siz, klavyeyle)", tipi(acilir) === "details", tipi(acilir));
  kontrol("  ...varsayılan KAPALI", acilir.props.open === false, acilir.props.open);
  kontrol(
    "  ...acikMi ile AÇIK başlar (katlama bilgiyi saklamanın yolu değil)",
    SatirKarti({ baslik: "M", acilir: "d", acikMi: true }).props.open === true,
  );
  kontrol("  ...açılır içerik ağaçta duruyor", metinler(acilir).includes("döküm"));

  /**
   * ⚠ BOŞ AÇILIR İÇERİK DE AÇILIR SATIRDIR. Ölçüt `acilir === undefined`;
   * `!acilir` yazılsaydı boş dize ya da 0 dönen bir döküm satırı sessizce
   * DÜZ kutuya düşer ve kullanıcı açacak bir şey bulamazdı.
   */
  kontrol("boş dize açılır içerik hâlâ <details>", tipi(SatirKarti({ baslik: "M", acilir: "" })) === "details");

  /** BAĞLAM SÜZÜLÜR: koşullu bağlam için dışarıda ayrı dizi kurulmasın. */
  const bagl = SatirKarti({ baslik: "M", baglam: ["ilk", null, "iki", false, undefined] });
  const m = metinler(bagl);
  kontrol("null/false/undefined bağlam ATILIR", !m.includes("null") && m.includes("ilk") && m.includes("iki"), m);
  kontrol("  ...ayıraç yalnız ARAYA girer (baştaki bağlamda yok)", m.filter((x) => x === " · ").length === 1, m);
  kontrol("bağlam yoksa ikinci satır HİÇ çizilmez", !metinler(SatirKarti({ baslik: "M" })).includes(" · "));
  kontrol(
    "hepsi elenirse ikinci satır çizilmez (boş gri şerit kalmaz)",
    !metinler(SatirKarti({ baslik: "M", baglam: [null, false] })).includes(" · "),
  );

  /** MANŞET RAKAMSA İRİ VE TABULAR — kolonlar hizalansın. */
  kontrol(
    "vurgulu manşet iri + tabular (rakam hizası)",
    siniflar(SatirKarti({ baslik: "₺1", vurgulu: true })).some((c) => c.includes("text-lg") && c.includes("tabular-nums")),
  );
  kontrol(
    "  ...vurgusuz manşet İRİ DEĞİL (her satır bağırmaz)",
    !siniflar(SatirKarti({ baslik: "Ad" })).some((c) => c.includes("text-lg")),
  );

  kontrol(
    "boş dize bağlam da ELENİR (yalnız başına ayıraç kalmasın)",
    !metinler(SatirKarti({ baslik: "M", baglam: ["", ""] })).includes(" · "),
  );

  /**
   * ZEMİN — tabloda satır zemininin boyanmasının karşılığı (ör. kanalda
   * kapalı duran listeleme). Renk `lib/renkler` tokeninden; verilmezse YOK.
   */
  kontrol(
    "zemin verilince renk sınıfı satırda",
    siniflar(SatirKarti({ baslik: "M", zemin: "uyari" })).some((c) => c.includes(DURUM_ZEMINI.uyari)),
  );
  kontrol(
    "  ...verilmezse zemin YOK (her satır renkliyse hiçbiri vurgulu değildir)",
    !siniflar(SatirKarti({ baslik: "M" })).some((c) => c.includes(DURUM_ZEMINI.uyari)),
  );
  kontrol(
    "  ...açılır satırda da geçerli",
    siniflar(SatirKarti({ baslik: "M", acilir: "d", zemin: "uyari" })).some((c) =>
      c.includes(DURUM_ZEMINI.uyari),
    ),
  );

  kontrol("sağ blok verilmezse çizilmez", !siniflar(SatirKarti({ baslik: "M" })).some((c) => c.includes("items-center gap-2")));
  kontrol("sağ blok verilirse ağaçta duruyor", metinler(SatirKarti({ baslik: "M", sag: "rozet" })).includes("rozet"));

  kontrol("liste kabı tek aralık kararı verir (space-y)", siniflar(SatirListesi({ children: "x" })).some((c) => c.includes("space-y-")));
  /**
   * ═══ ③ SAĞ SÜTUNLAR SABİTİ (K235-③, 23.09.2026) ══════════════
   * ⛔ VAKA: kullanıcı tazminat ekranının ekran görüntüsünü gönderdi —
   * açılır kutular her satırda başka bir x konumundaydı. Sebep: sağ blok
   * BÜTÜN olarak sağa yaslanıyor ve genişliği İÇERİĞİNE göre değişiyor;
   * tutar ve not uzadıkça ARADAKİ kontrol kayıyor.
   */
  {
    const sade = SatirKarti({ baslik: "x", sag: "y" }) as unknown;
    const izgarali = SatirKarti({
      baslik: "x",
      sag: "y",
      sagIzgara: "sm:grid-cols-[8rem_10rem_12rem]",
    }) as unknown;
    const sadeS = siniflar(sade).join(" | ");
    const izS = siniflar(izgarali).join(" | ");
    kontrol(
      "sagIzgara verilince sağ blok IZGARA oluyor",
      izS.includes("sm:grid") && izS.includes("sm:grid-cols-[8rem_10rem_12rem]"),
      izS,
    );
    /** ⚠ TELEFONDA SARMA KALIR: sabit sütun dar ekranda taşar. */
    kontrol(
      "  ...ama telefon sarması KALKMIYOR (flex-wrap duruyor)",
      izS.includes("flex flex-wrap"),
      izS,
    );
    /** ⚠ VARSAYILAN DEĞİŞMEDİ: izgara İSTEĞE BAĞLI, 12 ekranı birden bozmaz. */
    kontrol(
      "sagIzgara verilmezse eski davranış AYNEN duruyor",
      sadeS.includes("flex flex-wrap") && !sadeS.includes("sm:grid"),
      sadeS,
    );
  }

  /**
   * ⛔ BEYAN İLE GERÇEK GENİŞLİK AYRIŞMASIN: ızgara "seciciyi 10rem say"
   * diyorsa seçicinin kendisi de `w-40` olmalı. Biri değişip öteki
   * kalırsa kayma SESSİZCE geri gelir.
   * _(Anayasa: "iki yerde iki ölçüt olmaz".)_
   */
  {
    /** ⚠ YORUMSUZ KODDA ARANIR: bir kuralı ANLATAN yorum onu SAĞLAMIS sayilmaz. */
    const yorumsuzOku = (y: string) =>
      readFileSync(y, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/^\s*\/\/.*$/gm, " ");
    const sayfa = yorumsuzOku("src/app/tazminat/page.tsx");
    const secici = yorumsuzOku("src/app/tazminat/durum-secici.tsx");
    const notAlani = yorumsuzOku("src/app/tazminat/not-alani.tsx");
    kontrol(
      "tazminat sağ sütunları SABİT (ızgara beyanı var)",
      /sagIzgara="sm:grid-cols-\[8rem_10rem_12rem\]"/.test(sayfa),
    );
    kontrol(
      "  ...seçicinin gerçek genişliği beyanla AYNI (w-40 = 10rem)",
      /SelectTrigger className="h-9 w-40"/.test(secici),
    );
    kontrol(
      "  ...not alanının gerçek genişliği beyanla AYNI (sm:w-48 = 12rem)",
      /sm:w-48/.test(notAlani),
    );
    /** ⚠ `max-w` YETMEZ: kısa notta daralır ve blok yine kayar. */
    kontrol(
      "  ...not alanı `max-w` ile BİRAKILMADI (sabit genişlik şart)",
      notAlani.includes("sm:w-48"),
    );
  }

  kosanBolumler.push("anatomi");
}

// ═══ 2) KAPSAM — ÇİFT RENDER ENVANTERİ ═══════════════════════════════════
console.log("\n2) KAPSAM — aynı listeyi İKİ KEZ çizen ekranlar");
{
  /** Dosya listesi TUTULMAZ — `src/app` taranır. */
  function tsxDosyalari(kok: string, cikti: string[] = []): string[] {
    for (const g of readdirSync(kok, { withFileTypes: true })) {
      const yol = join(kok, g.name);
      if (g.isDirectory()) tsxDosyalari(yol, cikti);
      else if (g.name.endsWith(".tsx")) cikti.push(yol.split("\\").join("/"));
    }
    return cikti;
  }
  const dosyalar = tsxDosyalari("src/app");
  kontrol(`tarama gerçekten dosya buldu (${dosyalar.length})`, dosyalar.length > 50);

  /**
   * ⛔ YORUMSUZ METİNDE ARANIR — ve bunu bekçinin KENDİSİ yakaladı
   * (22.09.2026, ilk koşum): `/tazminat`a yazdığım açıklama yorumu
   * "masaüstü <Table> ve telefon ListeKarti" diyordu; tarama o yorumu
   * GERÇEK kullanım sanıp çevrilmiş ekranı kırmızı yaktı. Anayasa:
   * "bir yasağı ANLATAN yorum, o yasağı ÇİĞNEMİŞ sayılmaz."
   */
  const yorumsuz = (k: string) =>
    k.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const ciftRender = dosyalar.filter((y) => {
    const k = yorumsuz(readFileSync(y, "utf8"));
    return k.includes("ListeKarti") && k.includes("<Table>");
  });

  /**
   * ⚠ BU SAYI BİR HÜKÜM DEĞİL, KALAN İŞİN ÖLÇÜSÜ. K235 tek seferde bütün
   * listeleri çevirmiyor: tablonun DOĞRU araç olduğu ekranlar var (stok,
   * ürün analizi, rapor — sütunları karşılaştırmak işin kendisi). Sayı
   * ekranda durur ki kalan iş görünür kalsın ve bir sonraki tur nereden
   * devam edeceğini bilsin.
   */
  console.log(`         çift render (tablo + ListeKarti): ${ciftRender.length}`);
  for (const y of ciftRender) console.log(`           · ${y}`);

  /** ÇEVRİLMİŞ EKRAN GERİ DÖNMESİN — bu üçü artık tek render. */
  for (const cevrilmis of [
    "src/app/tazminat/page.tsx",
    "src/app/ayarlar/donemler/page.tsx",
    "src/app/nakit-takvimi/page.tsx",
  ]) {
    kontrol(`${cevrilmis} tek render (çift çizim geri gelmedi)`, !ciftRender.includes(cevrilmis));
  }

  /** ⛔ ORTAK GÖVDEDEN BESLENİYOR MU — kaynağın kendisi kopya olamaz. */
  const kullananlar = dosyalar.filter((y) => yorumsuz(readFileSync(y, "utf8")).includes("<SatirKarti"));
  kontrol(`SatirKarti'yi kullanan ekran sayısı (taban dolu) — ${kullananlar.length}`, kullananlar.length >= 4, kullananlar);
  kontrol(
    "hakediş ödeme satırı da ortak gövdeden (kaynağın kendisi ikinci kopya değil)",
    kullananlar.includes("src/app/hakedis/odeme-ozeti.tsx"),
  );
  kosanBolumler.push("kapsam");
}
/** K268 — sağ blok GENİŞ: alımlarda ürün/kalem/kart ortaya (satışlar düzeni). */
{
  const bilesenK = readFileSync("src/components/satir-karti.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol(
    "sagGenis verilince sağ blok satırın kalanını alıyor (sm:flex-[2] sm:min-w-0)",
    /sagGenis \? " sm:min-w-0 sm:flex-\[2\]" : ""/.test(bilesenK),
  );
  const alimlarK = readFileSync("src/app/alimlar/page.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const sagBasi = alimlarK.indexOf("sag={");
  const sagBloku = sagBasi >= 0 ? alimlarK.slice(sagBasi, sagBasi + 1600) : "";
  kontrol("alımlar sağ bloğu geniş ve ilk sütunu esnek (minmax(0,1fr))",
    /sagGenis\s+sagIzgara="sm:grid-cols-\[minmax\(0,1fr\)_auto_auto_auto\]"/.test(alimlarK));
  kontrol("  ...ürün (UzunAd) ve adet·kalem·kart ORTA sütunda, bağlamda değil",
    /<UzunAd/.test(sagBloku) && /toplamAdet/.test(sagBloku) && /creditCard/.test(sagBloku) &&
      !/baglam=\{\[[\s\S]{0,900}?<UzunAd/.test(alimlarK));
}


/**
 * === K272 — İÇ SAYFALAR TELEFON DÜZENİ (25.09.2026) =====================
 * Kullanıcı: «çok dağınık, farklı boylarda, farklı genişlikte, yazılar taşıyor».
 * Beş ortak bileşen: eylemler EŞİT ızgara · liste kartı eşit kutular · satır
 * kartı sağ blok tam genişlik · arama/Excel telefonda ikon. Masaüstü aynen.
 */
{
  /* DEĞER: eylem kutusu telefonda 52 px, tam genişlik, dikey; masaüstünde 32 px ikon. */
  kontrol("eylem kutusu telefonda 52 px · tam genişlik · ikon üstte (>= 44, İlke #8)",
    /\bh-\[52px\]/.test(EYLEM_SINIFI) && /\bw-full\b/.test(EYLEM_SINIFI) && /(^| )flex-col( |$)/.test(EYLEM_SINIFI), EYLEM_SINIFI);
  kontrol("  ...masaüstü AYNEN (md:h-8 md:w-8 ikon düğme)", /md:h-8 md:w-8/.test(EYLEM_SINIFI) && /md:flex-row/.test(EYLEM_SINIFI));
  const eylemK = readFileSync("src/components/satir-eylemi.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol("eylemler telefonda TEK SATIR eşit sütun ızgara (sarmalanmaz)",
    /className="grid w-full auto-cols-\[minmax\(0,1fr\)\] grid-flow-col[^"]*md:flex/.test(eylemK) && !/flex-wrap items-center gap-2 md:flex-nowrap/.test(eylemK));
  kontrol("  ...eylem adı taşmaz (truncate)", /max-w-full truncate md:hidden/.test(eylemK));
  const listeK = readFileSync("src/components/liste-karti.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol("liste kartı: alanlar EŞİT kutu, 3'ün katıysa 3 sütun",
    /const ucSutun = alanlar\.length % 3 === 0;/.test(listeK) && /bg-muted\/60 min-w-0 rounded-lg/.test(listeK));
  kontrol("  ...tek kalan kutu satırı doldurur (boş hücre yok)",
    /!ucSutun && alanlar\.length % 2 === 1 && i === alanlar\.length - 1 \? "col-span-2"/.test(listeK));
  kontrol("  ...eylemler tek satır eşit sütun, değer ve başlık taşmaz",
    /grid auto-cols-\[minmax\(0,1fr\)\] grid-flow-col gap-1\.5/.test(listeK) && /dd className="truncate/.test(listeK) && /line-clamp-2/.test(listeK));
  const kartK = readFileSync("src/components/satir-karti.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol("satır kartı: sağ blok telefonda TAM genişlik", /"flex flex-wrap items-center gap-2 max-sm:w-full"/.test(kartK));
  const aramaK = readFileSync("src/components/kod-arama-kutusu.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol("arama kutusu telefonda tam genişlik (min-w-0 flex-1)", /className="min-w-0 flex-1 md:max-w-xs md:min-w-44"/.test(aramaK));
  kontrol("  ...«Ara» ve «Temizle» telefonda İKON, ad ekran okuyucuda",
    (aramaK.match(/className="max-md:size-11 max-md:px-0"/g) ?? []).length === 2 &&
      (aramaK.match(/<span className="max-md:sr-only">/g) ?? []).length === 2);
  const excelK = readFileSync("src/components/excel-indir.tsx", "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  kontrol("Excel düğmesi telefonda İKON (44 px), ad ekran okuyucuda",
    /max-md:size-11 max-md:px-0/.test(excelK) && /<span className="max-md:sr-only">/.test(excelK));
  kosanBolumler.push("K272 telefon");
}

/* ────────────────────────────────────────────────────────────────────────
   K275 — DURUM DÜĞMELERİ (Kargolanacak · Paketlendi) telefonda IZGARA KUTUSU
   Kullanıcı 25.09: «Kargoya verildi butonu diğer butonun üzerine gelmiş».
   ──────────────────────────────────────────────────────────────────────── */
{
  console.log("\nK275 — durum düğmeleri telefonda ızgara kutusu");
  kontrol("durum sınıfı telefonda EYLEM kutusuyla AYNI ölçü (52 px · tam genişlik · alt alta)",
    /max-md:h-\[52px\]/.test(DURUM_EYLEMI_SINIFI) && /max-md:w-full/.test(DURUM_EYLEMI_SINIFI) && /max-md:min-w-0/.test(DURUM_EYLEMI_SINIFI) && /max-md:flex-col/.test(DURUM_EYLEMI_SINIFI), DURUM_EYLEMI_SINIFI);
  kontrol("  ...masaüstüne DOKUNMAZ (yalnız max-md: önekli)", DURUM_EYLEMI_SINIFI.split(/\s+/).every((s) => s.startsWith("max-md:")));
  kontrol("  ...kap hücreyi doldurur, taşmaz", /max-md:w-full/.test(DURUM_EYLEMI_KABI) && /max-md:min-w-0/.test(DURUM_EYLEMI_KABI));
  const temiz = (y: string) => readFileSync(y, "utf8").replace(/\r\n/g, "\n").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const paket = temiz("src/app/satislar/paketlendi-durumu.tsx");
  kontrol("Paketlendi: kap ve düğme durum sınıfını kullanıyor",
    paket.includes("className={`inline-flex flex-col gap-1 ${DURUM_EYLEMI_KABI}`}") && paket.includes("className={`md:h-8 ${DURUM_EYLEMI_SINIFI}`}"));
  /* K276: etiket EYLEMİN adı — iki hâlde de «Paketlendi»; durumu renk + ikon söyler. */
  kontrol("  ...etiket kesilir ve iki hâlde de EYLEM adı («Paketlendi»)",
    paket.includes('<span className="max-w-full truncate">{t("paketSuzgeciHazirlanan")}</span>') && !paket.includes('t("paketSuzgeciBekleyen")'));
  kontrol("  ...durum renk + ikonla ayrışıyor (dolu / çerçeveli)", paket.includes('variant={paketliMi ? "default" : "outline"}') && paket.includes("<PackageCheck"));
  const kargo = temiz("src/app/satislar/kargo-durumu.tsx");
  kontrol("Kargo: satır kipinde kap durum sınıfını kullanıyor",
    kargo.includes('const telefonKutusu = kip === "satir";') && kargo.includes("${telefonKutusu ? DURUM_EYLEMI_KABI : \"\"}"));
  kontrol("  ...asgari genişlik YALNIZ masaüstünde (telefonda taşmanın kökü)",
    kargo.includes("md:min-w-[8.75rem]") && !/[" ]min-w-\[8\.75rem\]/.test(kargo));
  kontrol("  ...işaretsiz düğme telefonda kutu, etiket «Kargolanacak»",
    kargo.includes("className={telefonKutusu ? `md:h-8 ${DURUM_EYLEMI_SINIFI}` : \"h-11 md:h-8\"}") &&
      kargo.includes('<span className="max-w-full truncate">{t("kargolanacak")}</span>') && !kargo.includes('{t("kargoyaVerildi")}'));
  kontrol("  ...ipucu ne YAPACAĞINI söylüyor", kargo.includes('title={t("kargoyaVerildiIsaretle")}'));
  const isaretliTel = kargo.slice(kargo.indexOf("{isaretli && telefonKutusu ? ("), kargo.indexOf("{isaretli ? ("));
  kontrol("  ...işaretliyken telefonda TEK kutu (tarih + kaldır), masaüstü hâli telefonda gizli",
    kargo.includes("{isaretli && telefonKutusu ? (") && isaretliTel.includes("className={`md:hidden ${DURUM_EYLEMI_SINIFI}`}") &&
      isaretliTel.includes("onClick={() => guncelle(null)}") && kargo.includes('${telefonKutusu ? "max-md:hidden" : ""}'));
  kosanBolumler.push("K275 durum düğmeleri");
}

/* ────────────────────────────────────────────────────────────────────────
   K272-② STOK SÜZGEÇLERİ · K272-③ İADE GEÇİŞ DÜĞMELERİ (telefon)
   ──────────────────────────────────────────────────────────────────────── */
{
  console.log("\nK272-②③ — stok süzgeç grupları · iade geçiş düğmeleri");
  const temiz2 = (y: string) => readFileSync(y, "utf8").replace(/\r\n/g, "\n").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const sabit = (kaynak: string, ad: string) => {
    const m = new RegExp(`const ${ad} =\\s*"([^"]*)"`).exec(kaynak);
    return m ? m[1] : "";
  };

  const suz = temiz2("src/app/stok/sirala-suzgec.tsx");
  const kap = sabit(suz, "SUZGEC_KABI");
  const grup = sabit(suz, "SUZGEC_GRUBU");
  const grupSiniflari = grup.split(/\s+/).filter(Boolean);
  kontrol("stok süzgeci: telefonda gruplar ALT ALTA", /max-md:flex-col/.test(kap) && /max-md:flex-nowrap/.test(kap), kap);
  kontrol("  ...her grup telefonda TEK SATIR, YANA KAYAR", /max-md:flex\b/.test(grup) && /max-md:overflow-x-auto/.test(grup), grup);
  kontrol("  ...masaüstünde grup KUTUSUZ (contents) — düzen aynen",
    grupSiniflari[0] === "contents" && grupSiniflari.slice(1).every((s) => s.startsWith("max-md:")), grup);
  kontrol("  ...ÜÇ grup: sıralama · raf yaşı · kanal kodu yok", (suz.match(/<div className=\{SUZGEC_GRUBU\}>/g) ?? []).length === 3);
  kontrol("  ...çip kayan satırda EZİLMEZ (shrink-0 · tek satır)", /"inline-flex h-11 shrink-0 [^"]*whitespace-nowrap/.test(suz));

  const bil = temiz2("src/app/iadeler/bildirim-durumu.tsx");
  const gkap = sabit(bil, "GECIS_KABI");
  const gdug = sabit(bil, "GECIS_DUGMESI");
  kontrol("iade geçişleri: telefonda EŞİT iki sütun", /max-md:grid max-md:grid-cols-2/.test(gkap), gkap);
  kontrol("  ...düğme kutuyu doldurur, uzun etiket KIRILIR (taşmaz), ≥44 px",
    /max-md:w-full/.test(gdug) && /max-md:whitespace-normal/.test(gdug) && /max-md:min-h-11/.test(gdug), gdug);
  kontrol("  ...masaüstüne dokunmaz (yalnız max-md:)", gdug.split(/\s+/).filter(Boolean).every((s) => s.startsWith("max-md:")), gdug);
  kontrol("  ...HİÇBİR düğme eski sınıfta kalmadı", !bil.includes('className="h-11 md:h-8"') && (bil.match(/\$\{GECIS_DUGMESI\}/g) ?? []).length === 5);
  kontrol("  ...«İadeyi işle» telefonda tam satır (açık ve kilitli hâl)", (bil.match(/max-md:col-span-2/g) ?? []).length === 2);
  kosanBolumler.push("K272-②③");
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
