import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  DEFTER İZİ BEKÇİSİ (K90, 01.09.2026)
 *  ----------------------------------------------------------------------------
 *      npm run iz:dogrula
 *
 *  ⛔ İKİ DELİK ÖLÇÜLDÜ VE İKİSİ DE KAPATILDI:
 *
 *  ① "KİM" YAZILMIYORDU. `AuditLog.userId` şemada VARDI; 31 çağrı yerinin
 *     12'si onu hiç doldurmuyordu — ve o 12'nin **dokuzu İSTİSNA İZİYDİ**
 *     (`DONEM_ISTISNA_EYLEMI` · `SAYIM_KORUMASI_ISTISNASI`). Yani bir insanın
 *     uyarıyı AŞTIĞINI kaydeden izler, kim aştığını söylemiyordu.
 *     _(Anayasa: "istisna iz bırakır — üç ay sonra 'bu neden böyle'
 *     sorusunun cevabı olmalıdır.")_
 *
 *  ② İZSİZ DEFTER DEĞİŞİKLİĞİ VARDI. `/alimlar` düzenleme yolu, defterdeki
 *     maliyet damgasını `updateMany` ile değiştiriyor ve HİÇBİR iz
 *     bırakmıyordu.
 *
 *  ⭐ ÇARE ÇAĞRI YERLERİNİ TEK TEK DÜZELTMEK DEĞİL, DESEN YASAĞI: iz tek
 *  gövdeden (`izYaz`) geçer ve kullanıcıyı kendisi damgalar; 33'üncü çağrı
 *  yerini yazan kişinin hatırlaması gerekmez.
 *  _(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean, gorulen?: unknown) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(
      `  HATA  ${ad}${gorulen === undefined ? "" : ` — ${JSON.stringify(gorulen)}`}`,
    );
  }
}

/** ⚠ YORUMSUZ KODDA ARANIR: bir yasağı ANLATAN yorum, onu çiğnemiş değildir. */
function yorumsuz(m: string): string {
  return m
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function dosyalar(kok: string): string[] {
  const cikan: string[] = [];
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (statSync(yol).isDirectory()) {
      /** ⚠ ÜRETİLEN PRISMA İSTEMCİSİ TARANMAZ — bizim yazdığımız kod değil. */
      if (ad === "generated") continue;
      cikan.push(...dosyalar(yol));
    } else if (ad.endsWith(".ts") || ad.endsWith(".tsx")) {
      cikan.push(yol);
    }
  }
  return cikan;
}

const KAYNAKLAR = dosyalar("src");
const IZ_GOVDESI = join("src", "lib", "iz.ts");

console.log("\nDEFTER İZİ BEKÇİSİ");
console.log("=".repeat(62));

// --- 1) ÇIPLAK `auditLog.create` YASAK ----------------------------------
console.log("\n1) iz TEK GÖVDEDEN yazılır");
{
  /**
   * ⛔ TARAMANIN KOŞTUĞU AYRICA ÖLÇÜLÜR: dosya listesi boşalırsa "hiç ihlal
   * yok" YEŞİL yanardı — kontrolün en tehlikeli yalancı yeşili.
   */
  kontrol("kaynak taraması koştu", KAYNAKLAR.length > 200, KAYNAKLAR.length);

  const kacaklar: string[] = [];
  for (const yol of KAYNAKLAR) {
    if (yol === IZ_GOVDESI) continue;
    if (/auditLog\.create\(/.test(yorumsuz(readFileSync(yol, "utf8")))) {
      kacaklar.push(yol.replace(/\\/g, "/"));
    }
  }
  kontrol("çıplak `auditLog.create` YOK", kacaklar.length === 0, kacaklar);
  /** ⛔ VE GÖVDENİN KENDİSİ GERÇEKTEN YAZIYOR — "0 buldum" ile "temiz" ayrı. */
  kontrol(
    "iz gövdesi gerçekten yazıyor",
    /auditLog\.create\(/.test(readFileSync(IZ_GOVDESI, "utf8")),
  );
}

// --- 2) İZSİZ DEFTER DEĞİŞİKLİĞİ YASAK ----------------------------------
console.log("\n2) `StockMovement` güncelleyen her gövde İZ bırakır");
{
  /**
   * ⛔ ÖLÇÜT DOSYA LİSTESİ DEĞİL DESEN: "şu üç dosyada iz var mı" diye
   * saysaydık dördüncü yol eklendiğinde sessizce yeşil kalırdı — ve bu
   * depoda tam olarak yaşanmış bir hatadır.
   *
   * ⚠ ÖLÇÜT DOSYA DÜZEYİNDE: aynı gövde içinde iz yazılıyorsa yeterli
   * sayılıyor. Satır düzeyinde eşleştirme (hangi update hangi ize ait)
   * kaynak taramasıyla güvenilir kurulamaz; dosya düzeyi, iz yazmayı
   * TAMAMEN unutan yolu yakalar — ölçülen delik oydu.
   */
  const yazanlar: string[] = [];
  const izsizler: string[] = [];
  for (const yol of KAYNAKLAR) {
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    if (!/stockMovement\.(update|updateMany|delete|deleteMany)\(/.test(kod)) {
      continue;
    }
    yazanlar.push(yol.replace(/\\/g, "/"));
    if (!/izYaz\(/.test(kod)) izsizler.push(yol.replace(/\\/g, "/"));
  }
  /**
   * ⛔ "0 BULDUM" İLE "TEMİZ" AYRI: desen bozulursa hiçbir yazıcı bulunmaz
   * ve kontrol kendinden emin bir yeşil basardı.
   */
  kontrol(
    "defter yazıcısı bulundu",
    yazanlar.length > 0,
    yazanlar,
  );
  kontrol("izsiz `StockMovement` yazımı YOK", izsizler.length === 0, izsizler);
}

// --- 3) İZ GÖVDESİ "KİM"İ GERÇEKTEN DAMGALIYOR MU -----------------------
console.log("\n3) iz gövdesi — kim damgası ve boş oturum");
{
  const iz = readFileSync(IZ_GOVDESI, "utf8");
  /**
   * ⛔ VERİLMEMİŞSE OTURUMDAN ÇÖZÜLÜR. Bu satır düşerse `userId` sessizce
   * `undefined` gider ve iz yine "kim"siz yazılır — tam düzeltilen hata.
   */
  kontrol(
    "userId verilmemişse OTURUMDAN çözülüyor",
    /veri\.userId === undefined \? await izKullanicisi\(\)/.test(iz),
  );
  /**
   * ⛔ `null` İLE `undefined` AYRI: `null` "oturuma bakma, kimse yok" der
   * (cron · betik), `undefined` "oturuma bak". Tek değere indirilseydi cron
   * izleri sessizce oturum arardı.
   */
  kontrol("null ile undefined AYRI ele alınıyor", /: veri\.userId;/.test(iz));
  /**
   * ⛔ OTURUMSUZ BAĞLAM ÇÖKMEZ: betik ve cron yollarında `yetkiBaglami()`
   * çerez okuyamayıp fırlatıyor. Hata yutulmuyor, "oturum yok" olarak
   * OKUNUYOR — ve `userId` boş yazılıyor, uydurulmuyor.
   */
  kontrol("oturumsuz bağlam yakalanıyor", /catch \{\s*return null;/.test(iz));
}

console.log("\n" + "=".repeat(62));
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
