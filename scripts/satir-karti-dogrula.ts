import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { SatirKarti, SatirListesi } from "../src/components/satir-karti";
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
const BOLUM_SAYISI = 2;

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
