import { readFileSync } from "node:fs";

/**
 * ============================================================================
 *  KARE TEŞHİSİ BEKÇİSİ (K113, 31.08.2026)
 * ----------------------------------------------------------------------------
 *      npm run kare-tanisi:dogrula
 *
 *  ⛔ NİYE: bir kargo barkodu okunmuyor ve ÜÇ hipotez ölçümle elendi (biçim
 *  listesi · çözüm bütçesi · döngü kilidi). Geriye YAKALAMA YOLU kaldı ve
 *  teşhis TAVANA DAYANDI: kod `1920×1080` İSTİYOR ama `ideal` olarak, cihaz
 *  `640×480` verse de uygulama bunu hiçbir yerde SÖYLEMİYOR.
 *
 *  ⚠ BU BEKÇİ BİR ÖZELLİĞİ DEĞİL, BİR ÖLÇÜM YOLUNU KORUYOR. Teşhis satırı
 *  sessizce düşerse geriye yine tahmin kalır — ve tahminle geçen 40 dakikayı
 *  bugün zaten harcadık.
 *
 *  ⭐ EN KRİTİK ÖLÇÜT: `getSettings()` ÇÖZÜM DÖNGÜSÜNÜN DIŞINDA. 250 ms'de
 *  bir çağrılırsa teşhis aracı, teşhis ettiği şeyi ETKİLER — ölçüm kendi
 *  gürültüsünü ölçmeye başlar.
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

/** Yorumları ayıklar — bir davranışı ANLATAN cümle onu YAPMIŞ sayılmaz. */
function yorumsuz(metin: string): string {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

console.log("\nKARE TEŞHİSİ BEKÇİSİ — K113");
console.log("=".repeat(66));

const ham = readFileSync("src/components/barkod-okuyucu.tsx", "utf8");
const kod = yorumsuz(ham);

// --- 1) ⭐ GETSETTINGS DÖNGÜNÜN DIŞINDA ---------------------------------
console.log("\n1) getSettings() çözüm döngüsünün DIŞINDA");
{
  /**
   * ⚠ ÖLÇÜT KULLANIM BLOĞUNA DARALTILDI. Dosyanın tamamında "getSettings var
   * mı" diye sormak hiçbir şey söylemez — soru NEREDE olduğudur. Döngü
   * gövdesi kesiliyor ve İÇİNDE aranıyor.
   */
  const donguBasi = kod.indexOf("setInterval(async () => {");
  kontrol("tarama döngüsü bulundu", donguBasi >= 0);
  const donguSonu = kod.indexOf("}, 250);", donguBasi);
  kontrol("  ...döngü sonu bulundu", donguSonu > donguBasi);
  const dongu = donguBasi >= 0 && donguSonu > donguBasi
    ? kod.slice(donguBasi, donguSonu)
    : "";
  kontrol("  ...gövde kesilebildi", dongu.length > 200);

  /** ⛔ ASIL ÖLÇÜT. */
  kontrol(
    "döngü İÇİNDE getSettings() YOK",
    !/getSettings\s*\(/.test(dongu),
    dongu.slice(0, 120),
  );
  /** ⚠ Ve dışarıda GERÇEKTEN var — yoksa teşhis hiç okunmaz. */
  kontrol("döngü DIŞINDA getSettings() var", /getSettings\s*\(/.test(kod));
  /**
   * ⚠ BİR KEZ OKUNUYOR: kaynakta tam bir çağrı olmalı. İkincisi eklenirse
   * biri döngüye kaymış olabilir ve yukarıdaki dilim onu kaçırabilir.
   */
  kontrol(
    "  ...ve TAM BİR KEZ çağrılıyor",
    (kod.match(/getSettings\s*\(/g) ?? []).length === 1,
    (kod.match(/getSettings\s*\(/g) ?? []).length,
  );
}
kosanBolumler.push("getSettings konumu");

// --- 2) TEŞHİS SATIRI EKRANA ÇİZİLİYOR ----------------------------------
console.log("\n2) teşhis satırı çiziliyor ve sessiz düşmüyor");
{
  kontrol("tanı durumu var", /const \[tani, setTani\]/.test(kod));
  /**
   * ⚠ KOŞULUYLA BİRLİKTE ARANIYOR. `{false ? (` yapan bir mutasyon dalı
   * hiç çizmez ama `tani` dosyada durur — bu deponun en sık körlüğü.
   */
  kontrol(
    "satır KOŞULUYLA birlikte çiziliyor",
    /\{tani \?\s*\(?\s*<p[^>]*>\{tani\}<\/p>/.test(kod),
  );
  /** ⛔ Sessiz düşüş yasak: okunamadıysa da bir şey YAZILIR. */
  kontrol("okunamazsa da yazıyor", /setTani\(t\("taniOkunamadi"\)\)/.test(kod));
  /** ⚠ Odak desteklenmiyorsa BOŞ değil, "desteklenmiyor" yazar. */
  kontrol(
    "odak yoksa `odakYok` metnine düşüyor",
    /focusMode \?\? t\("odakYok"\)/.test(kod),
  );

  const sozluk = JSON.parse(readFileSync("messages/tr.json", "utf8")) as Record<
    string,
    Record<string, string>
  >;
  for (const a of ["tani", "odakYok", "taniOkunamadi", "kareyiKaydet"]) {
    kontrol(`  sözlükte ${a} var`, (sozluk.Kamera?.[a] ?? "").trim() !== "");
  }
  /** ⚠ Teşhis satırı HEM track'in beyanını HEM çizilen kareyi taşımalı. */
  for (const p of ["{genislik}", "{yukseklik}", "{kare_hizi}", "{odak}", "{kare}"]) {
    kontrol(`  metin ${p} taşıyor`, (sozluk.Kamera?.tani ?? "").includes(p));
  }
}
kosanBolumler.push("teşhis satırı");

// --- 3) KARE KAYDETME ÜRETİM AKIŞINA DOKUNMUYOR -------------------------
console.log("\n3) kare kaydetme tarama döngüsünü bozmuyor");
{
  const basi = kod.indexOf("function kareyiKaydet()");
  kontrol("kareyiKaydet gövdesi bulundu", basi >= 0);
  const govde = basi >= 0 ? kod.slice(basi, basi + 1400) : "";

  /**
   * ⛔ ASIL RİSK: paylaşılan canvas'a çizmek. Tarama döngüsü `canvasRef`i
   * 250 ms'de bir kullanıyor; araya girmek OKUMAYI bozardı. Teşhis aracı,
   * teşhis ettiği şeyi etkilememeli.
   */
  kontrol("AYRI canvas oluşturuyor", /createElement\("canvas"\)/.test(govde));
  kontrol("  ...paylaşılan canvasRef'e DOKUNMUYOR", !/canvasRef/.test(govde));
  /** ⚠ Ölçek yok: kare video'nun KENDİ boyutunda çiziliyor. */
  kontrol(
    "video'nun kendi boyutunda çiziliyor",
    /tuval\.width = video\.videoWidth/.test(govde),
  );
  /** ⛔ PNG — yeniden sıkıştırma teşhisi bozardı. */
  kontrol("PNG olarak veriliyor", /"image\/png"/.test(govde));
  kontrol("  ...JPEG DEĞİL", !/image\/jpe?g/.test(govde));
  /** ⚠ Nesne adresi bırakılmıyor — her kayıtta bellekte kopya kalırdı. */
  kontrol("nesne adresi serbest bırakılıyor", /revokeObjectURL/.test(govde));
}
kosanBolumler.push("kare kaydetme");

// --- 4) MASAÜSTÜ ARACI AYNI AYARLARI KULLANIYOR -------------------------
console.log("\n4) masaüstü aracı uygulamanın AYARLARINI kullanıyor");
{
  const arac = yorumsuz(readFileSync("scripts/kare-cozum-testi.ts", "utf8"));
  /**
   * ⛔ AYARLAR AYRIŞIRSA TEST BAŞKA ŞEYİ ÖLÇER. Araç kendi biçim listesini
   * yazsaydı "masaüstünde çözülüyor ama ekranda çözülmüyor" sonucu ANLAMSIZ
   * olurdu — iki farklı çözücü kıyaslanmış olurdu.
   */
  /**
   * ⚠ ÖLÇÜT KULLANIMA BAĞLI, ADA DEĞİL — VE SEBEBİ MUTASYONLA GÖRÜLDÜ.
   * İlk yazımda yalnız `/DESTEKLENEN_FORMATLAR/` aranıyordu; o ad IMPORT
   * SATIRINDA da geçiyor. Biçim listesini elle yazan mutasyon YEŞİL GEÇTİ:
   * `formats` sabit bir diziye döndü ama import ayakta kaldı ve tarama onu
   * buldu. Ölçüt `formats:` atamasına bağlandı.
   * _(Anayasa: "işaret çağrı yerine bağlanır, ada değil" — bu deponun en
   * sık tekrarlayan körlüğü.)_
   */
  kontrol(
    "biçim listesi ORTAK gövdeden ATANIYOR",
    /formats:\s*\[\s*\.\.\.DESTEKLENEN_FORMATLAR\s*\]/.test(arac),
  );
  kontrol(
    "  ...ve ortak modülden içeri alınıyor",
    /from "\.\.\/src\/lib\/barkod-formatlari"/.test(arac),
  );
  /** ⛔ Elle yazılmış biçim dizisi YASAK — iki çözücü doğar. */
  kontrol(
    "  ...elle yazılmış biçim dizisi YOK",
    !/formats:\s*\[\s*"/.test(arac),
  );
  kontrol("tryHarder açık", /tryHarder:\s*true/.test(arac));
  kontrol("maxNumberOfSymbols 4", /maxNumberOfSymbols:\s*4/.test(arac));
  /** ⚠ "Dosya yok" ile "çözülemedi" AYRI — karıştırılırsa yanlış hüküm. */
  kontrol("dosya yoksa AYRI mesaj", /DOSYA YOK/.test(arac));
  kontrol(
    "  ...ve bunun 'çözülemedi' OLMADIĞINI söylüyor",
    /'çözülemedi' sonucu DEĞİLDİR|çözülemedi. sonucu DEĞİLDİR/.test(arac),
  );
  /**
   * ⚠ GEÇERSİZ SONUÇ AYRI RAPORLANIYOR: sembol görülüp sağlamaya takılmak,
   * hiç bulunamamaktan FARKLI bir bilgidir (kare sınırda demektir).
   */
  kontrol("geçersiz sonuç ayrı yazılıyor", /GEÇERSİZ/.test(arac));
  /** ⚠ İlk çağrı wasm'ı ısıtır — tek ölçüm yanlış süre verir. */
  kontrol("süre birden çok kez ölçülüyor", /for \(let i = 0; i < 3; i\+\+\)/.test(arac));
}
kosanBolumler.push("masaüstü aracı");

console.log("\n" + "=".repeat(66));
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
