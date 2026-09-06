import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { kdvMahsubu, type UrunSatiri } from "../src/lib/panel-listeler";

/**
 * ============================================================================
 *  K173-③ — NET-2 KIRPMASININ KAPSAMI
 * ----------------------------------------------------------------------------
 *  Halil kararı 06.09.2026, kapsam İKİYE ayrılır:
 *
 *    AGREGASYON (dönem · kanal · ay)  ->  `donemNet2` gövdesine BAĞLI
 *    DETAY      (ürün · satır)        ->  MUAF, ama GEREKÇE beyan edilir
 *
 *  Ürün kümesinde `net2 > net1` KIRPILMAZ: fazlalık hata değil BİLGİDİR
 *  (iadenin KDV avantajı). Kırpmanın gerekçesi KDV DÖNEMİDİR; bir ürün KDV
 *  dönemi değildir, dolayısıyla orada kırpmak gerçekleşen bir etkiyi gizler.
 *  _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_
 *
 *  ⛔ KIRPMAMANIN BEDELİ ŞERHTİR. Rakam bağlamsız duramaz: fazlalık NAKİT
 *  DEĞİL, ödenecek KDV'den düşen alacaktır. Bu yüzden bekçi İKİ YÖNÜ birden
 *  ölçer — şerhin VARLIĞI (yanlış susma) ve ŞARTA BAĞLI olduğu (yanlış yanma).
 *
 *  ⚠ MUAF LİSTE ELLE TUTULMAZ. Ölçüt tersten kurulur: `urunlereTopla`
 *  ÇAĞIRAN her dosya beyan vermek zorundadır. Elle liste tutulsaydı yarın
 *  eklenen dördüncü çağrı sessizce muaf kalırdı — nitekim 06.09'da tam bu
 *  oldu: `lib/urun-karti.ts` ilk taramanın 12'lik tablosunda YOKTU.
 *  _(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_
 * ============================================================================
 */

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

let hata = 0;
let gecen = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen++;
    console.log("  ✓ " + ad);
  } else {
    hata++;
    console.log("  ✗ " + ad);
  }
}

function yakin(ad: string, olculen: number, beklenen: number) {
  kontrol(ad + " (" + olculen + " = " + beklenen + ")", Math.abs(olculen - beklenen) < 0.005);
}

/**
 * Yorumlar ölçüme GİRMEZ: bir davranışı anlatan yorum, o davranış silinse
 * bile deseni ayakta tutar ve bekçi yalancı yeşil verir.
 */
function yorumsuz(kaynak: string): string {
  return kaynak
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Desen KULLANIM BLOĞUNDA aranır, dosyanın tamamında değil. */
function blok(metin: string, capa: string, uzunluk: number): string {
  const i = metin.indexOf(capa);
  return i < 0 ? "" : metin.slice(i, i + uzunluk);
}

function oku(yol: string): string {
  return readFileSync(yol, "utf8");
}

const satir = (net1: number, net2: number): UrunSatiri => ({
  variantId: "v",
  urunAdi: "u",
  sku: "s",
  adet: 1,
  ciro: 100,
  net1,
  net2,
  hesaplananCiro: 100,
  hesaplananAdet: 1,
  hesaplanamayanKalem: 0,
  kalemSayisi: 1,
});

// ══ 1) DEĞER — saf gövde ÇAĞRILIR, kaynağı TARANMAZ ════════════════════════
console.log("\n1) KDV MAHSUBU GÖVDESİ — değer testi");
yakin("net2 > net1 -> fark", kdvMahsubu(satir(788.5, 890.06)), 101.56);
yakin("net2 = net1 -> 0", kdvMahsubu(satir(500, 500)), 0);
yakin("net2 < net1 -> 0 (olağan hâl)", kdvMahsubu(satir(500, 400)), 0);
yakin("zararda da ölçülür", kdvMahsubu(satir(-2463.71, -2090.27)), 373.44);
/**
 * ⛔ KURUŞ KUYRUĞU MAHSUP SAYILMAZ. Decimal->float artığı (0,000001) olmayan
 * bir mahsubu VAR gösterir ve şerh HER satıra basılırdı; o an şerh bilgi
 * değil gürültü olur ve okunmaz hâle gelirdi.
 */
/**
 * ⛔ BURADA TOLERANS KULLANILAMAZ — ÖLÇÜLDÜ (06.09.2026, mutasyon ⑦).
 * `yakin()` 0,005 toleransla bakıyor; kuruş kapısını KALDIRAN mutasyon
 * 0,000001 döndürüyor ve |0,000001 − 0| tolerans İÇİNDE kalıyor. Yani ölçüt
 * yanlış değildi, ÖRNEK VERİ körüdü: tolerans, ölçmeye çalıştığı etkiden
 * büyüktü. Kuruş kapısı KESİN EŞİTLİKLE sınanır.
 * _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır".)_
 */
kontrol(
  "float kuyruğu (0,000001) -> TAM 0",
  kdvMahsubu(satir(100, 100.000001)) === 0,
);
kontrol(
  "kuruş ALTI kırpılır: 0,014 -> TAM 0,01",
  kdvMahsubu(satir(100, 100.014)) === 0.01,
);
/** Kuruş altı atılır ama kuruşun KENDİSİ yutulmaz — sınırın iki yakası. */
kontrol("tam 1 kuruşluk mahsup sayılır", kdvMahsubu(satir(100, 100.01)) === 0.01);
kosanBolumler.push("değer");

// ══ 2) AGREGASYON — kırpma gövdesine BAĞLI ═════════════════════════════════
console.log("\n2) AGREGASYON TARAFI — donemNet2'ye bağlı");
const donemRaporu = yorumsuz(oku("src/lib/donem-raporu.ts"));
kontrol(
  "donem-raporu donemNet2'yi İÇERİ ALIYOR",
  /import \{ donemNet2 \} from "@\/lib\/net-devreden";/.test(donemRaporu),
);
kontrol(
  "donem-raporu kırpmayı ÇAĞIRIYOR",
  /const kirpilmis = donemNet2\(net1, net2\);/.test(donemRaporu),
);
/**
 * ⚠ ÇAĞIRMAK YETMEZ, DÖNDÜRÜLMESİ de gerekir: çağrılıp kullanılmayan bir
 * kırpma hiçbir rakamı değiştirmez ve yalnız çağrıyı arayan bekçi yeşil yanar.
 */
/**
 * ⚠ ÇAPA TEKİL OLMALI. İlk yazımda çapa "  return {" idi ve dosyada ONDAN
 * ÖNCE `donemSiniri` içinde aynı desen geçiyordu: blok YANLIŞ yere bakıyor,
 * üç ölçüt birden yanlış metni ölçüyordu — biri (çıplak net2 yok) YANLIŞ
 * SEBEPLE yeşil yanıyordu. Çapa artık tekil bir ÇAĞRIYA bağlı.
 * _(Anayasa: "önce deseni SAY; birden çoksa işaret çağrı yerine bağlanır".)_
 */
const donus = blok(donemRaporu, "const kirpilmis = donemNet2(", 900);
kontrol("return bloğu KIRPILMIŞ net2'yi veriyor", /net2: kirpilmis\.net2,/.test(donus));
kontrol("return bloğunda ÇIPLAK net2 YOK", !/^\s*net2,\s*$/m.test(donus));
kontrol("devreden KDV kaybolmuyor (ayrı alan)", /devredenKdv: kirpilmis\.devreden,/.test(donus));
/**
 * Ekran devredeni YAZAR: kırpma olduğunda net1 ile net2 EŞİT görünür ve
 * açıklama olmadan muhasebeci o eşitliği bir hata sanar.
 */
const donemEkran = yorumsuz(oku("src/app/ayarlar/donemler/[donem]/page.tsx"));
kontrol(
  "dönem ekranı devredeni ŞARTA BAĞLI yazıyor",
  /r\.devredenKdv > 0 \?/.test(donemEkran) && /etiket=\{t\("devredenKdv"\)\}/.test(donemEkran),
);
kosanBolumler.push("agregasyon");

// ══ 3) MUAFİYET — beyan ZORUNLU, liste TERSTEN kurulur ═════════════════════
console.log("\n3) DETAY MUAFİYETİ — gerekçeli beyan");
function tsDosyalari(kok: string, birikim: string[] = []): string[] {
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      if (ad === "generated") continue;
      tsDosyalari(yol, birikim);
    } else if (/\.tsx?$/.test(ad)) {
      birikim.push(yol);
    }
  }
  return birikim;
}
const cagiranlar = tsDosyalari("src").filter((y) =>
  yorumsuz(oku(y)).includes("urunlereTopla("),
);
/**
 * ⚠ TABAN DOLULUĞU AYRICA KANITLANIR. Aşağıdaki döngü BOŞ listede hiçbir şey
 * ölçmez ve bekçi yine yeşil yanardı; `every` kapılarındaki tuzağın aynısı.
 */
kontrol(
  "TABAN DOLU — urunlereTopla çağıran dosya sayısı (" + cagiranlar.length + ")",
  cagiranlar.length >= 4,
);
/**
 * ⛔ BEYAN GEREKÇESİZ OLAMAZ. "Muaf" demek yetmez, NİÇİN muaf olduğu yazılır;
 * gerekçesiz muafiyet muafiyeti bedavaya çevirir ve üç ay sonra kimse
 * kararın sebebini bulamaz.
 */
const beyanDeseni = /NET2 KIRPMA MUAFIYETI:[^\n]{20,}/;
for (const yol of cagiranlar) {
  kontrol(yol + " — gerekçeli muafiyet beyanı VAR", beyanDeseni.test(oku(yol)));
}
kosanBolumler.push("muafiyet");

// ══ 4) ŞERH — VARLIK ve ŞARTA BAĞLILIK ayrı ayrı ═══════════════════════════
console.log("\n4) ŞERH — çıplak rakam yasağı (iki yön)");
const panel = yorumsuz(oku("src/app/page.tsx"));
const serhBlok = blok(panel, "const mahsupSerhi", 500);
kontrol(
  "panel şerh üreticisi kdvMahsubu'nu ÇAĞIRIYOR",
  /const tutar = kdvMahsubu\(satir\);/.test(serhBlok),
);
/**
 * ⛔ İKİNCİ YÖN — YANLIŞ YANMA. Şerhi koşulsuz basan bir mutasyon (tutar > 0
 * kapısını kaldıran) yalnız "şerh var mı" diye soran bir ölçütten geçerdi;
 * o hâlde mahsubu olmayan her satıra "KDV mahsubu içerir" yazardı.
 */
kontrol(
  "panel şerhi ŞARTA BAĞLI (tutar > 0) — koşulsuz basmıyor",
  /tutar > 0\s*\?\s*tOrtak\("kdvMahsubuSerhi"/.test(serhBlok),
);
/**
 * Üç liste de NET-2'den türüyor (tutar · marj · tutar); biri şerhsiz kalsaydı
 * o listede rakam bağlamsız dururdu. Sayı ölçülür, varlık değil.
 */
const serhKullanimi = (panel.match(/degerSerhi: mahsupSerhi\(s\),/g) ?? []).length;
kontrol(
  "panelin ÜÇ ürün listesi de şerh taşıyor (" + serhKullanimi + "/3)",
  serhKullanimi === 3,
);
kontrol(
  "panel şerhin ANLAMINI da yazıyor (liste bazında)",
  /liste\.some\(\(x\) => x\.degerSerhi\) \? tOrtak\("kdvMahsubuNotu"\)/.test(panel),
);
/**
 * ⚠ TANIMLAMAK ÇİZMEK DEĞİLDİR. Alan tipte durup çizim bloğundan düşerse
 * şerh hiçbir ekranda görünmez; sunum katmanı ayrıca ölçülür.
 */
const kartlar = yorumsuz(oku("src/app/panel-kartlari.tsx"));
kontrol(
  "panel kartı şerhi ÇİZİYOR (tanımlamakla kalmıyor)",
  /\{s\.degerSerhi \?/.test(kartlar) && /\{s\.degerSerhi\}/.test(kartlar),
);
/** İlke #8 ve #10: aynı bilgi masaüstünde de mobilde de aynı şeyi söyler. */
const raporEkran = yorumsuz(oku("src/app/rapor/urunler/page.tsx"));
const raporSerh = (raporEkran.match(/kdvMahsubu\(s\) > 0/g) ?? []).length;
kontrol(
  "ürün raporu İKİ görünümde de şerhli — masaüstü + mobil (" + raporSerh + "/2)",
  raporSerh === 2,
);
const kartEkran = yorumsuz(oku("src/app/kart/[variantId]/page.tsx"));
kontrol(
  "ürün kartı birim NET kutusu şerhli ve ŞARTA BAĞLI",
  /ozet\.satir !== null && kdvMahsubu\(ozet\.satir\) > 0/.test(kartEkran) &&
    /ortak\("kdvMahsubuSerhi"/.test(kartEkran),
);
kosanBolumler.push("şerh");

// ══ ÖZET — bloklardan SONRA koşar ══════════════════════════════════════════
/**
 * ⛔ SAYAÇ MEKANİZMADIR, SIRA DİSİPLİNDİR. Bir blok koşmazsa (sıra bozulsa,
 * erken dönülse, hata yutulsa) bekçi "geçti" DEMEZ, GEÇERSİZ der.
 */
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    "\nKOŞUM YARIM KALDI — " +
      kosanBolumler.length +
      "/" +
      BOLUM_SAYISI +
      " bölüm koştu; sonuç GEÇERSİZ\n",
  );
  process.exit(1);
}
console.log(
  "\n" +
    (hata === 0 ? "TÜM KONTROLLER GEÇTİ" : "BAŞARISIZ") +
    " (" +
    gecen +
    "/" +
    (gecen + hata) +
    ") · " +
    BOLUM_SAYISI +
    " bölüm\n",
);
process.exit(hata === 0 ? 0 : 1);
