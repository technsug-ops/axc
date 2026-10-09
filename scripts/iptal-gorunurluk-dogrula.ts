import { kaynakOku } from "./kaynak-oku";
import { IPTAL_GORUNUR_NOTR_SUZGECLER, satisKosulu, satisListesiParametreleri } from "../src/lib/liste-suzgeci";

/**
 * ============================================================================
 *  SATIŞ LİSTESİNDE İPTAL GÖRÜNÜRLÜĞÜ BEKÇİSİ (09.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run iptal-gorunurluk:dogrula
 *
 *  Kullanıcı: «Trendyol'da iptal olan siparişin bizde hiç kaydı çıkmıyor» —
 *  kayıt vardı, liste varsayılan olarak gizliyordu. Alımlar'daki gibi üstü
 *  çizili görünsün; toplamlara girmesin.
 *
 *  ① KURAL (değerle) — nötr süzgeçte göster, görev süzgecinde gizle, açık seçim
 *     kazanır; ORTAK koşulun varsayılanı (panel/rapor) DEĞİŞMEDİ.
 *  ② BAĞ — ekran ve Excel aynı gövdeyi çağırır; Excel iptali işaretler.
 *  ③ GÖRÜNÜM — telefon kartı da üstü çizili (masaüstü tabloyla aynı), iki ekran.
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
const oku = (y: string) => yorumsuz(kaynakOku(y));
const iptal = (p: Record<string, string | undefined>) => satisListesiParametreleri(p).iptal;
/** Koşul iptalleri atıyor mu — `iptalTarihi: null` koşulun içinde mi. */
const iptalAtiliyor = (p: Record<string, string | undefined>) =>
  JSON.stringify(satisKosulu(p, new Date("2026-10-09T10:00:00Z")).kosul).includes('"iptalTarihi":null');

console.log("=".repeat(70));
console.log("SATIŞ LİSTESİNDE İPTAL GÖRÜNÜRLÜĞÜ (09.10.2026)");
console.log("=".repeat(70));

console.log("\n1) kural — değerle");
{
  kontrol("süzgeçsiz liste → iptaller GÖRÜNÜR", iptal({}) === "1", iptal({}));
  kontrol("arama (11687161720 vakası) → GÖRÜNÜR", iptal({ q: "11687161720" }) === "1");
  kontrol("dönem + kanal + hesap + sayfa → GÖRÜNÜR",
    iptal({ pencere: "BU_AY", kanal: "TRENDYOL", hesap: "x", sayfa: "2" }) === "1");
  for (const [ad, deger] of [["kar", "eksik"], ["kargo", "bekleyen"], ["onay", "1"], ["veri", "supheli"], ["marj", "ciro"], ["marjsebep", "x"], ["iade", "var"], ["paket", "bekleyen"]] as const) {
    kontrol(`görev süzgeci «${ad}» → GİZLİ (sayı = liste)`, iptal({ [ad]: deger }) === "0", iptal({ [ad]: deger }));
  }
  kontrol("bilinmeyen süzgeç güvenli tarafa (GİZLİ) düşer", iptal({ yenisuzgec: "x" }) === "0");
  kontrol("boş değerli süzgeç süzgeç sayılmaz (GÖRÜNÜR)", iptal({ kar: "", kargo: "  " }) === "1");
  kontrol("açık seçim kazanır: görev listesinde iptal=1 → göster", iptal({ kar: "eksik", iptal: "1" }) === "1");
  kontrol("açık seçim kazanır: aramada iptal=0 → gizle", iptal({ q: "x", iptal: "0" }) === "0");
  kontrol("geçersiz iptal değeri boş sayılır", iptal({ iptal: "evet" }) === "1" && iptal({ kar: "eksik", iptal: "evet" }) === "0");
  kontrol("nötr küme tabanı: arama var, görev süzgeci yok",
    IPTAL_GORUNUR_NOTR_SUZGECLER.includes("q") && !["kar", "kargo", "onay", "veri", "marj", "iade", "paket"].some((s) => IPTAL_GORUNUR_NOTR_SUZGECLER.includes(s)));
  /* ⛔ ORTAK KOŞUL (panel, rapor) varsayılanı DEĞİŞMEDİ — iki yaka birlikte. */
  kontrol("ORTAK koşul boş parametrede iptalleri hâlâ ATAR (panel/rapor kaymaz)", iptalAtiliyor({}));
  kontrol("  ...liste parametresinden geçince ATMAZ", !iptalAtiliyor(satisListesiParametreleri({})));
  kontrol("  ...görev listesinde liste parametresi de ATAR", iptalAtiliyor(satisListesiParametreleri({ kar: "eksik" })));
  kosanBolumler.push("kural");
}

console.log("\n2) bağ — ekran ve Excel aynı gövde");
{
  const sayfa = oku("src/app/satislar/page.tsx");
  kontrol("Satışlar listesi koşulu liste parametresinden kurar",
    /const pListe = satisListesiParametreleri\(p\);\s*const \{ kosul, pencere \} = satisKosulu\(pListe,/.test(sayfa));
  kontrol("  ...seçenek kutusu ÇÖZÜLMÜŞ değeri yazar", /mevcut=\{\{ \.\.\.p, iptal: pListe\.iptal \}\}/.test(sayfa));
  kontrol("  ...«göster» ve «gizle» iki seçenek de var",
    /\{ deger: "1", etiket: tIpt\("suzgecGoster"\) \},\s*\{ deger: "0", etiket: tIpt\("suzgecGizle"\) \},/.test(sayfa));
  const excel = oku("src/lib/disa-aktarma/listeler.ts");
  kontrol("Excel aynı varsayılanı çağırır (dosya = ekran)", /const \{ kosul \} = satisKosulu\(satisListesiParametreleri\(p\)\);/.test(excel));
  kontrol("  ...iptal edilen satır dosyada İŞARETLİ (iptal tarihi sütunu)",
    /s\.iptalTarihi === null \? "" : gun\(s\.iptalTarihi\),\s*\]\),/.test(excel) && /tSatis\("iptalTarihiSutunu"\),\s*\],/.test(excel));
  kosanBolumler.push("bağ");
}

console.log("\n3) görünüm — telefon kartı da üstü çizili");
{
  const kart = oku("src/components/liste-karti.tsx");
  kontrol("kart başlığı iptalde üstü çizili", /<div className=\{`flex items-start gap-2\.5 \$\{iptal \? "line-through opacity-60" : ""\}`\}>/.test(kart));
  kontrol("  ...alanlar da üstü çizili (düğmeler değil)", /\$\{iptal \? "line-through opacity-60" : ""\}`\}>\s*\{alanlar\.map/.test(kart));
  const satis = oku("src/app/satislar/page.tsx");
  kontrol("Satışlar telefon kartı iptali geçer", /<ListeKarti\s+key=\{satis\.id\}\s+iptal=\{satis\.iptalTarihi !== null\}/.test(satis));
  kontrol("  ...masaüstü satır üstü çizili", /satis\.iptalTarihi !== null\s*\? "line-through opacity-60"/.test(satis));
  const alim = oku("src/app/alimlar/page.tsx");
  kontrol("Alımlar telefon kartı da aynı (İlke #10)", /<ListeKarti\s+key=\{alim\.id\}\s+iptal=\{iptalliMi\(alim\)\}/.test(alim));
  kosanBolumler.push("görünüm");
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
