import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { kabulKosulu, kabulGunu } from "../src/lib/panel/kabul-sayimi";

/**
 * ============================================================================
 *  MAL KABUL BEKÇİSİ (K112a, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run mal-kabul:dogrula
 *
 *  ⛔ NİYE: panel "Alım" derken SİPARİŞ gününü sayıyordu ve ölçüm bunun
 *  neredeyse her kaydı yanlış güne yazdığını gösterdi (1973 alımın 1931'inde
 *  `receivedAt ≠ purchasedAt`, ortanca 3 gün). Geri dönüş SESSİZ olurdu:
 *  ekran çalışmaya devam eder, yalnız rakam başka bir günü anlatır.
 *
 *  ⭐ ÖLÇÜTLERİN ÇOĞU DEĞER TESTİ — saf gövde ÇAĞRILIP sonucu ölçülüyor.
 *  Kaynak tarama yalnız gövdeye taşınamayan iki şey için: desen yasağı ve
 *  ekran metni. _(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç
 *  olmaz".)_
 * ============================================================================
 */

const BOLUM_SAYISI = 4;
const kosanBolumler: string[] = [];

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

/** Yorumları ayıklar — bir yasağı ANLATAN cümle onu ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

console.log("\nMAL KABUL BEKÇİSİ — K112a");
console.log("=".repeat(70));

// --- 1) KURAL GÖVDESİ: DEĞER TESTİ --------------------------------------
console.log("\n1) kabulKosulu — hangi tarihi süzüyor");
{
  const bas = new Date(Date.UTC(2026, 7, 1));
  const bit = new Date(Date.UTC(2026, 8, 1));
  const k = kabulKosulu({ baslangic: bas, bitisHaric: bit }) as Record<
    string,
    unknown
  >;
  const alanlar = Object.keys(k);
  kontrol("TEK alan süzülüyor", alanlar.length === 1, alanlar);
  kontrol("...ve o alan `receivedAt`", alanlar[0] === "receivedAt", alanlar[0]);
  /** ⛔ SİPARİŞ TARİHİNE GERİ DÖNÜŞ — vakanın kendisi. */
  kontrol("`purchasedAt` KULLANILMIYOR", !("purchasedAt" in k));

  const aralik = k.receivedAt as { gte?: Date; lt?: Date };
  kontrol("aralık YARI AÇIK — `gte` var", aralik?.gte?.getTime() === bas.getTime());
  kontrol("  ...ve `lt` (lte DEĞİL)", aralik?.lt?.getTime() === bit.getTime());
  kontrol("  ...`lte` yazılmamış", !("lte" in (aralik ?? {})));

  /**
   * ⚠ BOŞ `receivedAt` HİÇBİR GÜNE DÜŞMEZ — ve gövde bunu sessizce
   * `purchasedAt`e ÇEVİRMİYOR. Çevirseydi kabul edilmemiş bir sipariş
   * sipariş gününde "kabul edilmiş" görünürdü.
   */
  kontrol("boş kabul tarihi güne düşmüyor", kabulGunu({ receivedAt: null }) === null);
  const g = new Date(Date.UTC(2026, 7, 15));
  kontrol("dolu kabul tarihi aynen dönüyor", kabulGunu({ receivedAt: g }) === g);
}
kosanBolumler.push("kural gövdesi");

// --- 2) DESEN YASAĞI: PANELDE ÇIPLAK `purchasedAt` ----------------------
console.log("\n2) panelde çıplak `purchasedAt` yasağı");
{
  /**
   * ⚠ ÖLÇÜT DOSYA LİSTESİ DEĞİL, DESEN YASAĞI. "Şu üç dosyada doğru mu"
   * diye saysaydık dördüncü panel gövdesi eklendiğinde sessizce yeşil
   * kalırdı — ve bu tam olarak bu depoda yaşanmış bir hatadır.
   *
   * ⚠ İSTİSNA GEREKÇESİYLE BEYAN EDİLİR: kart takvimi `purchasedAt`
   * KULLANMAK ZORUNDA (borç sipariş gününde doğar). Beyanı dosyanın
   * kendisinde arıyoruz — beyansız kullanım hata sayılır.
   */
  const BEYAN = "KART BORCU SIPARIS GUNUNDE DOGAR";
  const kacaklar: string[] = [];
  const kok = "src/lib/panel";
  for (const ad of readdirSync(kok)) {
    const yol = join(kok, ad);
    if (!statSync(yol).isFile() || !ad.endsWith(".ts")) continue;
    const ham = readFileSync(yol, "utf8");
    const kod = yorumsuz(ham);
    if (!/purchasedAt/.test(kod)) continue;
    /** Beyan YORUMDA da olabilir — bilinçli bir karardır, koda gömülmez. */
    if (ham.includes(BEYAN)) continue;
    kacaklar.push(ad);
  }
  kontrol(
    "panel gövdelerinde beyansız `purchasedAt` yok",
    kacaklar.length === 0,
    kacaklar,
  );

  /** ⚠ VE BEYANIN KENDİSİ DE ÖLÇÜLÜR: istisna gerçekten VAR olmalı. */
  const takvim = readFileSync("src/lib/panel/takvim-verisi.ts", "utf8");
  kontrol(
    "kart takvimi istisnası BEYAN EDİLMİŞ",
    takvim.includes(BEYAN),
    "beyan yok — `purchasedAt` kullanımı gerekçesiz kalır",
  );
}
kosanBolumler.push("desen yasağı");

// --- 3) SAYI = LİSTE: TEK SORGU, TEK EKSEN ------------------------------
console.log("\n3) toplam ile seri AYNI kayıtlardan");
{
  const ham = readFileSync("src/lib/panel/gorev-verisi.ts", "utf8");
  const bas = ham.indexOf("export async function donemAlimi");
  const son = ham.indexOf("export async function", bas + 10);
  const blok = ham.slice(bas, son > bas ? son : bas + 4000);
  kontrol("donemAlimi gövdesi kesilebildi", bas >= 0 && blok.length > 500);

  const kod = yorumsuz(blok);
  /**
   * ⚠ İKİ SORGU OLSAYDI TOPLAM İLE GRAFİK AYRI SÜZGEÇLE AYRIŞABİLİRDİ.
   * Ölçüt sayım: gövdede TAM BİR `purchase.findMany` olmalı.
   */
  const sorguSayisi = (kod.match(/prisma\.purchase\.findMany/g) ?? []).length;
  kontrol("gövdede TEK purchase sorgusu var", sorguSayisi === 1, sorguSayisi);
  kontrol("  ...ve süzgeç `kabulKosulu` gövdesinden", /where:\s*kabulKosulu\(/.test(kod));
  kontrol("  ...grafik günü `receivedAt` taşıyor", /tarih:\s*a\.receivedAt/.test(kod));
  kontrol("  ...`purchasedAt`e düşmüyor", !/tarih:\s*a\.purchasedAt/.test(kod));

  /**
   * Panelin rakamı artık kabul tarihli listeye gidiyor — sayı = liste.
   *
   * ⚠ ÖLÇÜT KULLANIM BLOĞUNA DARALTILDI — VE SEBEBİ MUTASYONLA GÖRÜLDÜ.
   * İlk yazımda dosyanın TAMAMINDA `"/mal-kabul"` aranıyordu; o dize üç
   * yerde geçiyor (kart + iki grafik noktası) ve KART bağlantısını eski
   * hedefe çeviren mutasyon YEŞİL GEÇTİ — tarama grafik noktalarını
   * buluyordu. Ölçüt kartın kendi bloğuna bağlandı.
   * _(Anayasa: "aynı desen birden çok yerde geçiyorsa tarama ikincisini
   * bulur"; bu deponun en sık tekrarlayan körlüğü.)_
   */
  const panel = yorumsuz(readFileSync("src/app/page.tsx", "utf8"));
  const kartBasi = panel.indexOf('t("malKabulAdedi")');
  const kartBloku = kartBasi < 0 ? "" : panel.slice(kartBasi, kartBasi + 400);
  kontrol("mal kabul kartı bulundu", kartBasi >= 0);
  kontrol(
    "panel KARTI /mal-kabul'e bağlanıyor",
    /"\/mal-kabul"/.test(kartBloku),
    kartBloku.slice(0, 160),
  );
  /** ⚠ VE ESKİ HEDEF KARTTA KALMAMIŞ — iki yön ayrı sınanır. */
  kontrol("  ...kartta eski hedef (/alimlar) yok", !/"\/alimlar"/.test(kartBloku));
  kontrol(
    "  ...alım serisinin noktaları da",
    /noktaAdresi\("\/mal-kabul"/.test(panel),
  );
  kontrol(
    "  ...eski hedef (/alimlar) alım noktasında KALMADI",
    !/a:\s*noktaAdresi\("\/alimlar"/.test(panel),
  );
}
kosanBolumler.push("sayı = liste");

// --- 4) ROZET SÖZÜ: YASAK KELİMELER ------------------------------------
console.log("\n4) rozet tutamayacağı sözü vermiyor");
{
  /**
   * ⛔ "Satışta" · "aktif" · "yayında" YASAK. Pazaryerinin listeleme durumu
   * sistemde YOK (TY ürün ucu çağrılmıyor, HB/N11'de API yok). Rozet yalnız
   * "kod var" / "kod yok" diyebilir.
   *
   * ⚠ ÖLÇÜT SÖZLÜK DEĞERLERİNDE — ekranda GÖRÜNEN metin orada. Kaynak
   * dosyada aramak yalnız anahtarı bulurdu ve anahtar masumdur.
   */
  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as Record<
    string,
    Record<string, string>
  >;
  const bolum = sozluk.KabulListesi ?? {};
  kontrol("KabulListesi sözlük bölümü var", Object.keys(bolum).length > 0);

  const YASAK = ["satışta", "satista", "aktif", "yayında", "yayinda", "pasif"];
  const ihlaller: string[] = [];
  for (const [anahtar, deger] of Object.entries(bolum)) {
    const kucuk = String(deger).toLocaleLowerCase("tr");
    for (const y of YASAK) if (kucuk.includes(y)) ihlaller.push(anahtar + ": " + y);
  }
  kontrol("rozet metinlerinde yasak kelime yok", ihlaller.length === 0, ihlaller);

  /** ⚠ VE İZİN VERİLEN İKİ DEĞER GERÇEKTEN ORADA — yoksa rozet hiç konuşmaz. */
  kontrol("`kodVar` metni tanımlı", (bolum.kodVar ?? "").trim() !== "");
  kontrol("`kodYok` metni tanımlı", (bolum.kodYok ?? "").trim() !== "");

  /** ⛔ `isActive` EKRANDA GÖSTERİLMEZ — bizim bayrağımız, kanalın durumu değil. */
  const ekran = yorumsuz(readFileSync("src/app/mal-kabul/page.tsx", "utf8"));
  kontrol(
    "ekran `isActive` değerini BASMIYOR",
    !/\{[^}]*isActive[^}]*\}\s*</.test(ekran),
  );
  /** Eksik rozet TIKLANABİLİR olmalı — yoksa "ne yapacağım" cevapsız kalır. */
  kontrol(
    "eksik kanal rozeti kanal-SKU ekranına götürüyor",
    /href=\{`\/kanal-sku\?q=/.test(ekran),
  );

  /**
   * ═══ ÖN DOLDURMA ZİNCİRİ — HER HALKA AYRI SINANIR ═══════════════════
   *
   * ⚠ İKİ UCU SINAMAK YETMEZ. Bu depoda tam bu sınıftan bir canlı arıza
   * yaşandı: form alanı VARDI, yazma kodu onu KULLANIYORDU, ama `formuOku`
   * alanı hiç OKUMUYORDU ve hiçbir gider kaydedilemedi. Zincir "sorar mı ·
   * OKUR MU · kullanır mı" diye halka halka sorulur.
   */
  kontrol("  ...ve ürün kimliğini TAŞIYOR (`ekle=`)", /&ekle=\$\{/.test(ekran));

  const kanalSayfa = yorumsuz(readFileSync("src/app/kanal-sku/page.tsx", "utf8"));
  kontrol(
    "  ...kanal-SKU sayfası `ekle` parametresini OKUYOR",
    /ekle\?:\s*string/.test(kanalSayfa) && /=\s*await searchParams/.test(kanalSayfa),
  );
  kontrol(
    "  ...okunan kimlikle varyantı ÇEKİYOR",
    /where:\s*\{\s*id:\s*ekle\s*\}/.test(kanalSayfa),
  );
  kontrol(
    "  ...ve forma GEÇİRİYOR",
    /onDolu=\{onDoluVaryant\}/.test(kanalSayfa),
  );

  const form = yorumsuz(readFileSync("src/app/kanal-sku/yeni-esleme.tsx", "utf8"));
  /**
   * ⚠ SON HALKA: form onu GERÇEKTEN başlangıç değeri yapıyor mu? Prop'u
   * alıp kullanmamak, en sessiz kopuş biçimi — hiçbir hata çıkmaz, alan
   * boş açılır ve kimse sebebini bilmez.
   */
  kontrol(
    "  ...form onu BAŞLANGIÇ değeri yapıyor",
    /useState<VaryantSonucu \| null>\(onDolu\)/.test(form),
  );
}
kosanBolumler.push("rozet sözü");

// === ÖZET ===============================================================
console.log("\n" + "=".repeat(70));
if (kosanBolumler.length !== BOLUM_SAYISI) {
  console.log(
    `KOŞUM YARIM KALDI — ${kosanBolumler.length}/${BOLUM_SAYISI} bölüm. Sonuç GEÇERSİZ.`,
  );
  process.exit(1);
}
if (kalan === 0) {
  console.log(`OK  ${gecen}/${gecen} ölçüt geçti (${BOLUM_SAYISI} bölüm)`);
  process.exit(0);
}
console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
process.exit(1);
