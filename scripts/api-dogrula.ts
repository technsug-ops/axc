import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  A3 GÜVENLİK ÇERÇEVESİ BEKÇİSİ — YAZAMAYAN İSTEMCİ
 * ----------------------------------------------------------------------------
 *  Mimar kararı 25.08.2026: **test domaini AÇILMAYACAK**, canlıda salt okuma
 *  disipliniyle ilerlenecek. Gerekçe kayda geçti: _"iki defter ayrışır,
 *  üçüncü bir mutabakat işi doğurur; koruma domain ayrımı değil, YAZAMAYAN
 *  İSTEMCİDİR."_
 *
 *  ⚠ ÖLÇÜT: **çağrılamayan şey yanlışlıkla çağrılamaz.** Pazaryeri API'sine
 *  dokunan kod yalnız `GET` bilir; yazma ucu (statü güncelleme · stok · fiyat)
 *  fonksiyon olarak BİLE tanımlanmaz. İleride yazma gerekirse ayrı modül +
 *  ayrı karar.
 *
 *  ⚠ VE ÖLÇÜM BETİKLERİ DEFTERE YAZMAZ. Sağlık/sınır/mutabakat ölçümleri
 *  salt okumadır; `prisma.create/update/delete` çağrısı geçerse KIRMIZI.
 *
 *  ⚠ DESEN YASAĞI, ELLE LİSTE DEĞİL: dosyalar dizinden TARANIYOR. Yarın
 *  eklenen bir API betiği de kendiliğinden kapsama girer; kimsenin listeye
 *  eklemeyi hatırlaması gerekmez. (23.08 dersi.)
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen++;
    console.log(`  OK    ${ad}`);
  } else {
    kalan++;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

/** Yorumları ayıklar — bir yasağı ANLATAN yorum, yasağı ÇİĞNEMİŞ sayılmasın. */
function yorumsuzla(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** Bir dizini yinelemeli tarar. */
function dosyalar(kok: string, uzanti = ".ts"): string[] {
  const cikti: string[] = [];
  let girdiler: string[];
  try {
    girdiler = readdirSync(kok);
  } catch {
    return cikti;
  }
  for (const ad of girdiler) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) cikti.push(...dosyalar(yol, uzanti));
    else if (yol.endsWith(uzanti) || yol.endsWith(".tsx")) cikti.push(yol);
  }
  return cikti;
}

/**
 * PAZARYERİ API'SİNE DOKUNAN DOSYALAR — ADLA DEĞİL, İÇERİKLE bulunur.
 *
 * ⚠ Dosya adına göre seçseydik (`canli-ty-*`) yarın başka adla yazılan bir
 * modül sessizce kapsam dışı kalırdı. Ölçüt: pazaryeri tabanına `fetch`
 * atan her dosya.
 */
const API_IZI = "apigw.trendyol.com";

/**
 * ⚠ BEKÇİ KENDİNİ TARAMAZ — ve bu bir kaçamak değil, ölçüt düzeltmesi.
 * İlk koşumda üç kontrol birden kırmızı yandı: bu dosya aradığı desenleri
 * (`method: "POST"`, `.create(`) ARAMA DİZESİ olarak taşıyor ve kendini
 * ihlalci sanıyordu. Yasağı TANIMLAYAN dosya, yasağı ÇİĞNEYEN dosya
 * değildir. (Aynı sınıf: "sınıf adını yoruma yazınca tarama kendi desenini
 * buluyor" — anayasada adıyla anılan tuzak.)
 */
const KENDI = join("scripts", "api-dogrula.ts");

/**
 * ⚠ İSTEMCİYİ ÇAĞIRAN DOSYA DA API DOSYASIDIR — VE BU BOŞLUK ÖLÇÜLDÜ
 * (26.08.2026). Bekçi dosyaları `apigw.trendyol.com` dizesine göre
 * buluyordu; A3-②'de API çağrıları TEK İSTEMCİ MODÜLÜNE toplanınca
 * `canli-ty-mutabakat.ts` o dizeyi hiç içermez oldu ve **taranmadı**.
 * Oysa o dosya `prisma` kullanıyor — yazma yasağı tam orada gerekliydi.
 *
 * ⚠ İYİ BİR REFAKTÖR, BEKÇİYİ KÖR ETTİ. Ölçüt "dizeyi içeren dosya"
 * olmaktan çıkıp **"API'ye ULAŞAN dosya"** oldu: doğrudan taban adresi
 * yazan YA DA istemci modülünü içeri alan.
 */
const ISTEMCI_IZI = "ty/istemci";

const tumDosyalar = [...dosyalar("scripts"), ...dosyalar("src")];
const apiDosyalari = tumDosyalar
  .filter((y) => y !== KENDI)
  .filter((y) => {
    try {
      const icerik = readFileSync(y, "utf8");
      return icerik.includes(API_IZI) || icerik.includes(ISTEMCI_IZI);
    } catch {
      return false;
    }
  });

console.log("\n1) PAZARYERİ API — YAZMA UCU YOK");

/**
 * ⚠ BOŞ SONUÇ HÜKÜM DEĞİL. Hiç dosya bulunamazsa "yazma yok" YEŞİL yanardı
 * ve bu, kontrolün en tehlikeli yalancı yeşili olurdu.
 */
kontrol("API'ye dokunan dosya bulundu", apiDosyalari.length > 0, apiDosyalari);

/** ⚠ SATIR SATIR: hangi dosyada, hangi satırda olduğu söylenmeli. */
const YASAK = [
  { desen: 'method: "POST"', ad: "POST" },
  { desen: 'method: "PUT"', ad: "PUT" },
  { desen: 'method: "DELETE"', ad: "DELETE" },
  { desen: 'method: "PATCH"', ad: "PATCH" },
];

for (const yol of apiDosyalari) {
  const y = yorumsuzla(readFileSync(yol, "utf8"));
  const bulunanlar = YASAK.filter((x) => y.includes(x.desen)).map((x) => x.ad);
  kontrol(`  ${yol} — yalnız GET`, bulunanlar.length === 0, bulunanlar);

  /**
   * ⚠ VE `GET` AÇIKÇA YAZILMALI — AMA YALNIZ `fetch` ÇAĞIRAN DOSYADA.
   *
   * ⚠ ÖLÇÜT REFAKTÖRLE İKİYE AYRILDI (26.08.2026): A3-②'de bütün API
   * çağrıları TEK İSTEMCİ MODÜLÜNE toplandı. Onu İÇERİ ALAN dosyalarda
   * artık `fetch` yok, dolayısıyla `method: "GET"` de yok — ve kontrol
   * altı dosyada birden kırmızı yandı.
   *
   * ⚠ KOD YANLIŞ DEĞİLDİ, ÖLÇÜT ESKİMİŞTİ. Ve doğru davranış susturmak
   * değil AYIRMAK:
   *   · `fetch` çağıran dosya → `method: "GET"` AÇIKÇA yazılı olmalı
   *   · yalnız istemciyi çağıran dosya → hiçbir HTTP fiili GEÇMEMELİ
   *     (yasak listesi zaten yukarıda sınandı)
   * İkincisine "GET yaz" demek, olmayan bir `fetch` için tören istemekti.
   *
   * ⚠ VE BU AYRIM ÖLÇÜTÜ GEVŞETMİYOR: istemci modülünün kendisi `fetch`
   * çağırdığı için birinci sınıfa giriyor ve tam olarak sınanıyor.
   */
  if (y.includes("fetch(")) {
    kontrol(`    ...\`fetch\` çağırıyor → GET açıkça yazılı`, y.includes('method: "GET"'));
  } else {
    kontrol(
      `    ...\`fetch\` çağırmıyor (istemciyi kullanıyor) → fiil yok`,
      bulunanlar.length === 0,
    );
  }
}

// --- 2) ÖLÇÜM BETİKLERİ DEFTERE YAZMAZ --------------------------------------
console.log("\n2) ÖLÇÜM BETİKLERİ DEFTERE YAZMAZ");

const YAZMA_IZI = [
  ".create(",
  ".createMany(",
  ".update(",
  ".updateMany(",
  ".upsert(",
  ".delete(",
  ".deleteMany(",
];

/**
 * ═══ YAZMA İZİ PRİSMA ÇAĞRISINA BAĞLI — ÇIPLAK FİİLE DEĞİL ═══════════════
 *
 * ⚠ 26.08.2026 YANLIŞ POZİTİF: kontrol `.delete(` arıyordu ve bir ölçüm
 * betiğindeki **`Map.delete()`** çağrısını prisma silmesi sandı
 * (`siparisler.delete(no)` — aday listesinden çakışanı düşürüyor).
 *
 * Ayırt edici şey ZİNCİR DERİNLİĞİ: prisma yazması her zaman
 * `<istemci>.<model>.<fiil>(` yani İKİ noktadır; `Map`/`Set` çağrıları
 * tek nokta. Ölçüt buna bağlandı.
 *
 * ⛔ VE SINIRI YAZILIYOR: `const t = prisma.sale; t.delete(...)` biçiminde
 * bir kaçış hâlâ mümkün. Bu bir AĞ, duvar değil — beyan listesi ve
 * `ice-aktarma:dogrula` asıl güvenceyi taşıyor.
 */
function prismaYazmalari(govde: string): string[] {
  return YAZMA_IZI.filter((fiil) =>
    new RegExp("[A-Za-z0-9_$]+\\.[A-Za-z0-9_$]+\\." + fiil.slice(1, -1) + "\\(").test(govde),
  );
}

/**
 * ═══ YAZAN BETİK ADIYLA BEYAN EDİLİR — SUSTURULMAZ ═══════════════════════
 *
 * ⚠ 26.08.2026'da bu kontrol KIRMIZI yandı ve **kod doğruydu**: A3-③ içe
 * aktarması onaylı bir YAZICI. Bekçinin kırmızısı burada _"kod yanlış"_
 * değil _"ölçütüm eskidi"_ diyordu — API'ye ulaşan her betiğin ölçüm
 * betiği olduğu varsayımı, ilk yazıcı doğduğu gün düştü.
 *
 * ⚠ SUSTURULMADI, DARALTILDI. Kontrolü silmek ya da beklentiyi gevşetmek
 * ölçmeyi bırakmak olurdu. Bunun yerine istisna **ADIYLA ve GEREKÇESİYLE**
 * beyan ediliyor — `yetki-bekci.ts`teki kısıtlı rol beyanının aynısı.
 *
 * ⛔ LİSTEYE GİRMEK BİR MUAFİYET DEĞİL, BİR TAAHHÜTTÜR: beyan edilen betik
 * kendi bekçisini taşımak zorunda (burada `ice-aktarma:dogrula`, 33
 * kontrol + 13 mutasyon). Beyan, denetimsizlik demek değildir.
 *
 * ⚠ VE LİSTE BOŞ DEĞİLSE EKRANDA YAZAR: sessiz bir muafiyet listesi,
 * zamanla kimsenin bakmadığı bir kapı olur.
 */
const YAZMASI_BEYANLI: { dosya: string; gerekce: string; bekcisi: string }[] = [
  {
    dosya: "canli-ty-ice-aktar.ts",
    gerekce:
      "A3-③ onaylı içe aktarma — Sale/SaleItem yazar. Yazım `--yaz` bayrağına kilitli, " +
      "her kayıt importBatch+importKaynak taşır, AuditLog bırakır.",
    bekcisi: "ice-aktarma:dogrula",
  },
];

for (const yol of apiDosyalari) {
  const dosyaAdi = yol.split(new RegExp("[\\\\/]")).pop() ?? yol;
  const beyan = YAZMASI_BEYANLI.find((b) => b.dosya === dosyaAdi);
  const y = yorumsuzla(readFileSync(yol, "utf8"));
  const bulunanlar = prismaYazmalari(y);
  if (beyan) {
    /**
     * ⚠ BEYAN, BEKÇİSİ OLMADAN GEÇMEZ. Beyan edilen betiğin kendi
     * doğrulaması `package.json`da KAYITLI olmalı — yoksa liste, denetimi
     * kaldırmanın kolay yoluna dönerdi.
     */
    const komutlar = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    kontrol(
      `  ${yol} — YAZICI olarak beyanlı, bekçisi kayıtlı (${beyan.bekcisi})`,
      Boolean(komutlar.scripts[beyan.bekcisi]),
      beyan.bekcisi,
    );
    continue;
  }
  kontrol(`  ${yol} — prisma yazma çağrısı yok`, bulunanlar.length === 0, bulunanlar);
}

if (YAZMASI_BEYANLI.length > 0) {
  console.log(`
  ⚠ YAZMASI BEYANLI ${YAZMASI_BEYANLI.length} BETİK — muafiyet değil, taahhüt:`);
  for (const b of YAZMASI_BEYANLI) {
    console.log(`     ${b.dosya}`);
    console.log(`       gerekçe : ${b.gerekce}`);
    console.log(`       bekçisi : npm run ${b.bekcisi}`);
  }
}

// --- 3) ANAHTAR SIZMAZ ------------------------------------------------------
/**
 * ⚠ ANAHTAR YALNIZ BELLEĞE OKUNUR. `console.log` ile bir anahtar DEĞERİNİ
 * basmak, ekran görüntüsü paylaşılan bir çıktıda sırrı yayınlamak olurdu.
 *
 * ⚠ ARANAN ŞEY DEĞER, AD DEĞİL — ölçüt düzeltmesi. İlk yazımda ortam
 * değişkeninin ADI da (`TRENDYOL_API_KEY`) sızıntı sayılıyordu ve
 * `canli-ty-saglik.ts` kırmızı yandı: orada anahtar basılmıyor, kullanıcıya
 * **hangi satırı dolduracağı** söyleniyor. Bir değişkenin adı sır değildir;
 * yardım metnini yasaklamak, yardımı yasaklamak olurdu.
 */
// --- 2b) KENDİNİ "SALT OKUMA" İLAN EDEN API UCU YAZMAZ ----------------------
/**
 * ⚠ ÖLÇÜT BEYANA BAĞLI, LİSTEYE DEĞİL. Bir API dosyası başlığında kendini
 * **SALT OKUMA** diye ilan ediyorsa, o beyan SINANIR. Elle dosya listesi
 * tutsaydık, yarın eklenen ölçüm ucu listeye yazılmadığı için korumasız
 * kalırdı (23.08 dersi: ölçüt tersten kurulur).
 *
 * ⚠ NİYE GEREKLİ: yerel bağlantı reddedildiği için ölçümler artık canlının
 * kendi havuzundan, bir API ucundan koşuyor (`/api/olcum`). Ölçüm ucunun
 * yazma yeteneği olmamalı — bir gün biri "şunu da düzeltiverelim" derse
 * bekçi durdurur.
 */
console.log("\n2b) SALT OKUMA BEYANI OLAN API UCU YAZMAZ");

const beyanliUclar = dosyalar("src/app/api").filter((y) => {
  try {
    return readFileSync(y, "utf8").includes("SALT OKUMA");
  } catch {
    return false;
  }
});

kontrol("beyanlı uç bulundu", beyanliUclar.length > 0, beyanliUclar);

for (const yol of beyanliUclar) {
  const y = yorumsuzla(readFileSync(yol, "utf8"));
  const bulunanlar = prismaYazmalari(y);
  kontrol(`  ${yol} — yazma çağrısı yok`, bulunanlar.length === 0, bulunanlar);
  /**
   * ⚠ VE KORUMASIZ AÇIK BIRAKILMAZ: sır kontrolü olmadan uç yayına girmez.
   *
   * ⚠ DESEN OKUMAYA BAĞLI, ADA DEĞİL. İlk yazımda yalnız `CRON_SECRET`
   * aranıyordu ve mutasyon (`const sir = "acik"`) YEŞİL KALDI: o kelime
   * KAPALI hata mesajının METNİNDE de geçiyor ve deseni ayakta tutuyordu.
   * Aynı sınıf, kaçıncı kez — desen ADA değil KULLANIMA bağlanır.
   */
  kontrol(`    ...ve sır ORTAMDAN okunuyor`, y.includes("process.env.CRON_SECRET"));
  /** ⚠ Ve okunan sır GERÇEKTEN karşılaştırılıyor — okuyup atmak korumaz. */
  kontrol(`    ...ve karşılaştırılıyor`, /Bearer \$\{sir\}/.test(y));
}

console.log("\n3) ANAHTAR DEĞERİ EKRANA BASILMIYOR");

for (const yol of apiDosyalari) {
  const y = yorumsuzla(readFileSync(yol, "utf8"));
  const satirlar = y.split(/\r?\n/).filter((l) => l.includes("console.log"));
  /** Değer sızıntısı: anahtarı taşıyan DEĞİŞKENİN basılması. */
  const sizan = satirlar.filter((l) => /\.\s*(key|secret)\b/.test(l));
  kontrol(`  ${yol} — anahtar DEĞERİ loglanmıyor`, sizan.length === 0, sizan);
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
