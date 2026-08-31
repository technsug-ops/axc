import { readFileSync, readdirSync, statSync } from "node:fs";
import { RETAIL_BARCODE_FORMATS } from "zxing-wasm/reader";

import {
  DESTEKLENEN_FORMATLAR,
  URUN_DISI_PERAKENDE,
  URUN_FORMATLARI,
  perakendeBoslugu,
} from "../src/lib/barkod-formatlari";
import { join } from "node:path";

/**
 * ============================================================================
 *  KAMERA / BARKOD — DOĞRULAMA
 * ----------------------------------------------------------------------------
 *  Anayasa İlke #7: _"Kod girilebilen her alan USB okuyucu (Enter) ve kamera
 *  okumayı destekler; manuel giriş yedek kalır."_
 *
 *  Bu bekçi 23.08.2026'da açıldı çünkü kural VARDI ama teslim edilmemişti:
 *  kamera formlarda çalışıyordu, liste aramalarının ALTISINDA DA yoktu.
 *  Kural yazılı olmak yetmiyor; koşan bir ölçütü olmalı.
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

// ===========================================================================
console.log("\n7) KAMERA HER KOD ALANINDA — İlke #7");
// ===========================================================================
/**
 * Kullanıcı 23.08.2026: _"ürün araması yapılacak her yerde mutlaka kamera
 * ile barkod veya QR kod okuyabilecek sistemi ekle."_
 *
 * ⚠ BU YENİ BİR KURAL DEĞİLDİ — TESLİM EDİLMEMİŞ BİR KURALDI. Anayasa
 * (İlke #7) zaten şunu diyor: _"Kod girilebilen her alan USB okuyucu
 * (Enter) ve kamera okumayı destekler."_ Kamera FORMLARDA vardı (ürün,
 * alım, satış, mal kabul, kârlılık kartı, stok, raf) ama LİSTE
 * ARAMALARINDA yoktu — oysa depoda en sık yapılan şey elinde ürünle
 * "bu neydi" diye aramak.
 *
 * ⚠ ÖLÇÜT ELLE TUTULAN LİSTE DEĞİL. "Şu altı ekranda kamera var mı" diye
 * saysaydık yedinci ekran eklendiğinde kontrol yeşil kalırdı — ve bu tam
 * olarak yaşanan şeydi (altı ekranda da unutulmuştu). Ölçüt tersten
 * kurulu: KOD ARAYAN BİR KUTU, ORTAK BİLEŞENİ KULLANMAK ZORUNDA.
 */
{
  const dosyalar = (kok: string): string[] => {
    const sonuc: string[] = [];
    for (const ad of readdirSync(kok)) {
      const yol = join(kok, ad);
      if (statSync(yol).isDirectory()) sonuc.push(...dosyalar(yol));
      else if (ad.endsWith(".tsx")) sonuc.push(yol);
    }
    return sonuc;
  };

  /**
   * ARAMA KUTUSU İMZASI: `name="q"` ya da `name="bq"` taşıyan bir `<Input>`.
   * Bu, liste ekranlarının arama kutusunun deseni; ortak bileşene geçenlerde
   * artık hiç kalmamalı.
   */
  const kacaklar: string[] = [];
  for (const yol of dosyalar("src")) {
    const metin = readFileSync(yol, "utf8");
    const yorumsuzMetin = metin
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");
    /**
     * ⚠ BÜYÜK/KÜÇÜK HARF İKİSİ DE — MUTASYON GEÇTİ. İlk yazımda yalnız
     * shadcn'in `<Input>`u aranıyordu; düz HTML `<input name="q">` enjekte
     * eden mutasyon kontrolü rahatça geçti. Çıplak kutu çıplaktır, hangi
     * etiketle yazıldığı fark etmez.
     */
    if (/<[Ii]nput[^>]*\sname="b?q"/.test(yorumsuzMetin)) kacaklar.push(yol);
  }
  kontrol(
    "hiçbir liste araması ÇIPLAK <Input> kullanmıyor",
    kacaklar.length === 0,
    kacaklar,
  );

  /**
   * ⚠ VE ORTAK BİLEŞEN GERÇEKTEN KAMERA TAŞIMALI. Yukarıdaki kontrol tek
   * başına yalancı yeşil verebilirdi: herkes ortak bileşene geçer, bileşen
   * de kamerayı kaybeder ve kontrol hâlâ yeşil yanar.
   */
  const kutu = readFileSync("src/components/kod-arama-kutusu.tsx", "utf8");
  kontrol(
    "ortak arama kutusu BarkodGirisi kullanıyor (kamera + USB)",
    /<BarkodGirisi/.test(kutu) &&
      /from "@\/components\/barkod-okuyucu"/.test(kutu),
  );
  /**
   * ⚠ OKUYUNCA ARAMA KENDİLİĞİNDEN ÇALIŞMALI (İlke #9). Kamera okuduktan
   * sonra kullanıcının ayrıca "Ara"ya basması gerekseydi, kamera bir
   * kolaylık değil fazladan adım olurdu.
   */
  kontrol(
    "  ...okunan kod DOĞRUDAN aramayı tetikliyor",
    /onOkundu=\{ara\}/.test(kutu),
  );
  /**
   * Açık süzgeçler aramada kaybolmamalı — eskiden gizli alanlar taşıyordu.
   *
   * ⚠ DESEN İKİ YERDE GEÇİYOR: hem ARAMA hem TEMİZLE bağlantısı
   * `suzgecAdresi(temelAdres, tasinanlar, …)` çağırıyor. Dosyanın
   * tamamında arayan ilk yazım, arama yolunu bozan mutasyonu KAÇIRDI —
   * temizle satırı deseni ayakta tutuyordu. Ölçüt `ara` gövdesine
   * daraltıldı.
   */
  const araGovdesi = kutu.slice(
    kutu.indexOf("const ara = "),
    kutu.indexOf("return ("),
  );
  kontrol("  ...arama gövdesi kesilebildi", araGovdesi.length > 0);
  kontrol(
    "  ...açık süzgeçler ARAMADA korunuyor",
    /suzgecAdresi\(temelAdres, tasinanlar/.test(araGovdesi),
  );
  /**
   * ── TEMİZLE KUTUYU DA BOŞALTIR (24.08.2026) ──────────────────────────
   *
   * Kullanıcı: _"diğer taraflarda barkod silinmiyor, sadece aranan kayıtlar
   * gidiyor; barkod arama çubuğuna elle siliyorsun."_
   *
   * ⚠ ESKİ ÖLÇÜT BURADA İKİ `suzgecAdresi` ÇAĞRISI SAYIYORDU — biri arama,
   * biri Temizle bağlantısı. O sayım bir ÇÖZÜM BİÇİMİNİ sabitliyordu:
   * Temizle kendi adresini kuruyorsa iki çağrı olur. Temizle artık aynı
   * `ara()` gövdesinden geçtiği için süzgeç korumasını MİRAS ALIYOR ve
   * çağrı bire indi. Ölçüt biçimi değil davranışı sınıyor.
   */
  /**
   * ⚠ DİLİM ÇİZİM KOŞULUNDAN BAŞLAR. 400 karakter geriden başlayan ilk
   * yazım koşulu kapsamıyordu ve `{false ? (` mutasyonu YEŞİL KALDI —
   * düğme hiç çizilmezken `setSorgu("")` dosyada duruyordu. (/okut'ta da
   * aynı körlük çıktı; ikisi de aynı kökten.)
   */
  const temizleKosulu = kutu.indexOf("{baslangic || sorgu ? (");
  const temizleBasi = kutu.indexOf('ortak("temizle")', temizleKosulu);
  const temizleBloku = kutu.slice(temizleKosulu, temizleBasi + 40);
  kontrol(
    "TEMİZLE düğmesi çiziliyor (yazılmış bir şey varken)",
    temizleKosulu > 0 && temizleBasi > temizleKosulu,
  );
  /**
   * ⚠ İKİSİ BİRDEN: durumu boşaltmak listeyi tazelemez, adrese gitmek de
   * kutuyu boşaltmaz (istemci yönlendirmesinde bileşen yeniden kurulmuyor —
   * hatanın kökü tam buydu). Biri eksikse yarısı düzelmiş olur.
   */
  kontrol(
    "TEMİZLE arama kutusunu da boşaltıyor (elle silme yok)",
    /setSorgu\(""\)/.test(temizleBloku),
  );
  kontrol(
    "  ...ve listeyi de tazeliyor (aynı gövdeden, süzgeçler korunur)",
    /ara\(""\)/.test(temizleBloku),
  );
  /**
   * ⚠ SÜZGEÇ KORUMASI HÂLÂ ARAMA GÖVDESİNDE — Temizle oradan geçtiği için
   * yukarıdaki `araGovdesi` kontrolü ikisini birden kapsıyor.
   */
  kontrol(
    "  ...temizle bir <Link> DEĞİL (yönlendirme kutuyu boşaltmaz)",
    !/<Link/.test(temizleBloku),
  );


  /**
   * ── /okut EKRANININ TEMİZLESİ ────────────────────────────────────────
   * Aynı işlem her ekranda aynı çalışır (İlke #10). Okuma ekranı ortak
   * bileşeni kullanmıyor (sonucu adrese değil duruma yazıyor), bu yüzden
   * kendi Temizlesi ayrıca sınanıyor.
   */
  const okuyucu = readFileSync("src/app/okut/okuyucu.tsx", "utf8");
  /**
   * ⚠ DİLİM ÇİZİM KOŞULUNDAN BAŞLIYOR — 700 karakter geriden değil.
   *
   * İlk yazımda dilim düğmenin İÇİNDEN başlıyordu ve koşulu kapsamıyordu:
   * `{kod || sonuc ? (` yerine `{false ? (` yazan mutasyon YEŞİL KALDI.
   * Düğme hiç çizilmiyordu ama `setKod("")` dosyada duruyordu ve kontrol
   * onu buluyordu. (Anayasa: "koşul öldürülür, desen kalır".)
   */
  const okutKosulu = okuyucu.indexOf("{kod || sonuc ? (");
  const okutTemizleBasi = okuyucu.indexOf('ortak("temizle")', okutKosulu);
  const okutTemizle = okuyucu.slice(okutKosulu, okutTemizleBasi + 40);
  kontrol(
    "/okut temizle DÜĞMESİ çiziliyor (okunacak bir şey varken)",
    okutKosulu > 0 && okutTemizleBasi > okutKosulu,
  );
  kontrol(
    "/okut TEMİZLE barkod kutusunu boşaltıyor",
    /setKod\(""\)/.test(okutTemizle),
  );
  kontrol(
    "  ...ve alttaki sonucu da siliyor",
    /setSonuc\(null\)/.test(okutTemizle),
  );
  /**
   * ⚠ ODAK KUTUYA DÖNÜYOR: temizledikten sonraki tek iş yeni kod okutmak.
   * Odak bırakılsaydı USB okuyucunun tuşları hiçbir yere gitmezdi.
   */
  kontrol(
    "  ...odak kutuya geri veriliyor (USB okuyucu yazabilsin)",
    /kutuOdagi\.current\?\.focus\(\)/.test(okutTemizle),
  );

  /** Ortak bileşeni kullanan ekranlar — en az altı liste ekranı olmalı. */
  const kullananlar = dosyalar("src").filter((y) =>
    readFileSync(y, "utf8").includes("<KodAramaKutusu"),
  );
  kontrol(
    "ortak kutu liste ekranlarında kullanılıyor",
    kullananlar.length >= 6,
    kullananlar.map((y) => y.replace(/\\/g, "/")),
  );

  /**
   * ⚠ FİYAT DENEMESİ AYRI: orası liste süzgeci değil, TEK ÜRÜN arayan bir
   * kutu (`Bul`). Ortak bileşen oraya oturmuyor ama kamera kuralı yine
   * geçerli — `BarkodGirisi` doğrudan kullanılıyor.
   */
  const deneme = readFileSync("src/app/simulasyon/deneme.tsx", "utf8");
  kontrol("fiyat denemesinde de kamera var", /<BarkodGirisi/.test(deneme));
  /**
   * ⚠ BAYAT DURUM TUZAĞI. Kamera okuyunca önce `setKod` çalışır, hemen
   * ardından arama tetiklenir; React durumu senkron güncellenmediği için o
   * an `kod` HÂLÂ ESKİ değeri taşır. Okunan kod parametre olarak
   * geçirilmezse kamera yeni barkodu okur, sistem bir öncekini arardı.
   */
  kontrol(
    "  ...okunan kod PARAMETRE olarak geçiyor (bayat durum tuzağı)",
    /onOkundu=\{\(okunan\) => ara\(okunan\)\}/.test(deneme) &&
      /const ara = \(okunan\?: string\)/.test(deneme),
  );
  /**
   * ⚠ VE "Bul" DÜĞMESİ OLAYI KOD SANMAMALI. `onClick={ara}` yazılsaydı
   * tıklama olayı `okunan` parametresine düşer, `.trim()` çağrısı patlardı.
   * TypeScript bunu yakaladı; kontrol geri gelmesini engelliyor.
   */
  kontrol(
    "  ...Bul düğmesi tıklama olayını kod sanmıyor",
    !/onClick=\{ara\}/.test(deneme),
  );
}

// --- BİÇİM KAPSAMI — ÜRÜN **VE** KARGO ------------------------------------
/**
 * ⚠ CANLI BULGU 25.08.2026: `hepsiJET` etiketi kamerayla okunmadı. Biçim
 * listesi ÜRÜN kodları için kurulmuştu (`EAN13 · EAN8 · Code128 · QRCode`)
 * ve K41① ile kargo etiketi akışa girince GENİŞLEMEDİ. Okuyucu tanımadığı
 * bir sembolojiyi sessizce geçer — ekranda hata çıkmaz, hiçbir şey olmaz.
 *
 * ⚠ ÖLÇÜT SAYIM DEĞİL, İKİ KÜMENİN DE VARLIĞI. "Kaç biçim var" diye saymak
 * yarın biri ürün biçimini silip kargo biçimi eklediğinde yeşil kalırdı.
 */
{
  console.log("\nBİÇİM KAPSAMI — ürün VE kargo etiketleri");
  const ham = readFileSync("src/components/barkod-okuyucu.tsx", "utf8");
  /**
   * ⚠ YORUM AYIKLANIR — YOKSA AÇIKLAMA KENDİNİ İHLAL SANDIRIR. İlk yazımda
   * kontrol dosyanın tamamını tarıyordu ve TEMİZ koşumda kırmızı yandı:
   * eski davranışı ANLATAN yorum (`maxNumberOfSymbols: 1`) deseni
   * eşleştiriyordu. Bir yasağı açıklayan cümle, yasağı çiğnemiş değildir.
   */
  const okuyucu = ham
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  /**
   * ⚠ ÖLÇÜT DEĞERE BAĞLANDI — KAYNAK TARAMASI BIRAKILDI (K111, 31.08.2026).
   *
   * Eski hâli `okuyucu.includes('"EAN13"')` diyordu ve iki ayrı kusuru vardı:
   *
   * ① Liste saf modüle taşınınca (bekçi ÇAĞIRABİLSİN diye) desen dosyadan
   *    kalktı ve ölçüt kırmızı yandı. Kod DOĞRUYDU, ölçüt eskimişti
   *    (anayasa: "bekçinin kırmızısı her zaman 'kod yanlış' demez").
   *
   * ② ⛔ VE DAHA KÖTÜSÜ: `"QRCode"` ile `"DataMatrix"` ölçütleri ZATEN
   *    YALANCI YEŞİLDİ. O dizeler biçim listesinde değil, aşağıdaki
   *    `kareKodlar` kümesinde de geçiyor — biçim listesinden silinseler
   *    kontrol yine yeşil yanardı. Tam olarak anayasanın "aynı desen birden
   *    çok yerde geçiyorsa tarama ikincisini bulur" vakası.
   *
   * Artık modül çağrılıp DEĞERİ ölçülüyor; desen aranmadığı için yanlış
   * yerde bulunamıyor.
   */
  const bicimler = DESTEKLENEN_FORMATLAR as readonly string[];
  for (const bicim of ["EAN13", "EAN8", "UPCA", "Code128", "QRCode"]) {
    kontrol(`  ürün biçimi ${bicim} destekleniyor`, bicimler.includes(bicim));
  }
  /** ⚠ 14 haneli kargo numarası klasik ITF-14'tür — bu satır o vakanın bekçisi. */
  for (const bicim of ["ITF", "Code39", "Code93", "DataMatrix", "PDF417"]) {
    kontrol(`  kargo biçimi ${bicim} destekleniyor`, bicimler.includes(bicim));
  }

  /**
   * ⚠ TEK SEMBOL ARAMAYA GERİ DÖNÜLMEZ. Kargo etiketinde birden çok kod var;
   * tek sembolle okuyucu yanlış olanı (genelde QR) döndürür ve aranan değer
   * bulunamaz — kullanıcıya "okumadı" gibi görünür.
   */
  kontrol(
    "  tek sembolle sınırlanmıyor",
    !/maxNumberOfSymbols:\s*1\b/.test(okuyucu),
  );
  /**
   * ⚠ VE ÇİZGİLİ KOD TERCİHİ DURUYOR — takip numarası orada yazar.
   *
   * ⚠ ÖLÇÜT ADA DEĞİL DAVRANIŞA BAĞLI. İlk yazımda yalnız `kareKodlar`
   * kelimesi aranıyordu ve mutasyon YEŞİL KALDI: değişkenin TANIMI yeniden
   * adlandırılınca kullanım yerindeki kelime deseni ayakta tuttu. Aranan şey
   * artık seçimin kendisi — "biçimi kare kod kümesinde OLMAYAN ilk sonucu al".
   */
  kontrol(
    "  çizgili (1B) kod tercih ediliyor",
    /\.find\(\s*\(s\)\s*=>\s*!\w+\.has\(String\(s\.format\)\)\s*\)/.test(okuyucu),
  );

  /**
   * ⚠ ÇÖZÜNÜRLÜK İSTENİR (canlı bulgu 25.08.2026). Yalnız `facingMode`
   * istendiğinde tarayıcı çoğu cihazda 640×480 veriyor. Ürün barkodu
   * (~95 modül) o çözünürlükte okunuyor, KARGO barkodu (~220 modül, üstelik
   * A4'ün köşesinde) okunmuyordu — modül başına ~3 piksel kalıyor.
   */
  kontrol(
    "kamera ÇÖZÜNÜRLÜK istiyor (kargo barkodu için şart)",
    /width:\s*\{\s*ideal:/.test(okuyucu) && /height:\s*\{\s*ideal:/.test(okuyucu),
  );
  /**
   * ⚠ VE `ideal` KULLANILIR, `min` DEĞİL — `min` desteklemeyen cihazda
   * `OverconstrainedError` atar ve kamera HİÇ açılmaz. Dar çözünürlüklü
   * okuma, hiç okumamaktan iyidir.
   */
  kontrol(
    "  ...ve `min` ile kilitlenmiyor (cihaz dışlanmaz)",
    !/width:\s*\{\s*min:/.test(okuyucu),
  );

  /**
   * ⚠ SESSİZ YUTMA YASAK (İlke #5). Tarama döngüsündeki `catch` boştu ve
   * HER KAREYİ sessizce yutuyordu: çözücü hiç çalışmasa bile kamera açık
   * kalır, hiçbir şey olmaz, teşhis edilecek tek iz kalmazdı. 25.08'de tam
   * bu yaşandı — "kameralar okumuyor" bildirildi, elimizde hata kaydı yoktu.
   *
   * ⚠ ÖLÇÜT DAVRANIŞA BAĞLI: `catch` bloğu bir HATA ELE ALMA yapmalı.
   * Yalnız "catch var mı" demek yetmez; boş `catch {}` da vardır.
   */
  /**
   * ⚠ DESEN TARAMA DÖNGÜSÜNE DARALTILDI. İlk yazımda dosyanın tamamında
   * `catch (e) … setHata(` aranıyordu ve mutasyon YEŞİL KALDI: kamerayı
   * AÇARKEN kullanılan başka bir `catch (e)` de `setHata` çağırıyor ve
   * deseni ayakta tutuyordu. Aynı desen birden çok yerde geçiyorsa
   * kullanım bloğuna inilir — kaçıncı kez.
   */
  const cozumBasi = okuyucu.indexOf("kareyiCozumle(canvas, video)");
  const cozumBloku = cozumBasi < 0 ? "" : okuyucu.slice(cozumBasi, cozumBasi + 700);
  kontrol("tarama döngüsü bulundu", cozumBasi >= 0);
  kontrol(
    "  ...ve hatayı SESSİZCE yutmuyor",
    /catch\s*\(\w+\)\s*\{[\s\S]{0,500}?setHata\(/.test(cozumBloku),
    cozumBloku.slice(0, 90),
  );
}

/**
 * ============================================================================
 *  PERAKENDE BİÇİM KAPSAMI — LİSTE ELLE TUTULMUYOR (K111, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE: aynı liste İKİ KEZ eksik çıktı ve ikisinde de sessiz kaldı.
 *    ① 25.08 — kargo etiketi girdi, `ITF` yoktu (hepsiJET okunmadı)
 *    ② 31.08 — `UPCA` yoktu; kataloğun %9,2'si (104 varyant) okunamıyordu
 *
 *  ⭐ ÖLÇÜT TERSTEN KURULDU: "UPC-A var mı" diye SAYMIYOR. Kütüphanenin KENDİ
 *  perakende kataloğunu (`RETAIL_BARCODE_FORMATS`) okuyup her biçimin ya açık
 *  ya GEREKÇESİYLE beyan edilmiş olmasını şart koşuyor. Kütüphane yarın yeni
 *  bir perakende biçimi eklerse bekçi onu kendiliğinden sorar; kimsenin
 *  listeyi hatırlaması gerekmez. _(Anayasa: "bekçi ölçütü elle tutulan liste
 *  değil, tersten kurulur".)_
 *
 *  ⭐ VE KAYNAK TARAMIYOR: saf modül ÇAĞRILIP değeri ölçülüyor.
 * ============================================================================
 */
console.log("\n11) PERAKENDE BİÇİM KAPSAMI — K111");
{
  const acik = URUN_FORMATLARI as readonly string[];
  const hepsi = DESTEKLENEN_FORMATLAR as readonly string[];

  /**
   * ⭐ ÖNCE GÖVDENİN KENDİSİ SINANIR — SENTETİK VAKAYLA.
   *
   * ⛔ NİYE: bu ölçüt `perakendeBoslugu`ya güveniyor. Gövde körleştirilirse
   * (ör. `acik` kümesi kataloğun kendisinden kurulursa) her zaman BOŞ döner
   * ve ölçüt sonsuza kadar yeşil yanar. Mutasyon turunda tam bu senaryo
   * KAÇTI ve bu iki satır o kaçışı kapatmak için yazıldı.
   *
   * Anayasa: _"bekçinin yeşili, ölçtüğü doğrulanmadan güvence değildir"_ —
   * bir ölçütün ölçtüğünü gösteren şey, ayırdığı iki yakayı da göstermektir.
   */
  kontrol(
    "gövde BEYANSIZ bir biçimi gerçekten yakalıyor (sentetik)",
    perakendeBoslugu(["UYDURMA_BICIM"]).includes("UYDURMA_BICIM"),
  );
  kontrol(
    "  ...ve AÇIK olanı yanlışlıkla suçlamıyor",
    perakendeBoslugu(["EAN13"]).length === 0,
  );
  kontrol(
    "  ...ve BEYANLI olanı suçlamıyor",
    perakendeBoslugu(["EAN2"]).length === 0,
  );

  /** ⭐ ASIL ÖLÇÜT — beyansız eksik yasak. */
  const bosluk = perakendeBoslugu(RETAIL_BARCODE_FORMATS);
  kontrol(
    "zxing perakende kataloğunda BEYANSIZ eksik yok",
    bosluk.length === 0,
    bosluk.length ? "beyansız: " + bosluk.join(", ") : "",
  );

  /** Vakanın kendisi — 12 haneli barkod okunabilmeli. */
  kontrol("UPC-A açık (12 haneli barkod — 104 varyant)", acik.includes("UPCA"));
  kontrol("UPC-E açık", acik.includes("UPCE"));
  kontrol("EAN-13 hâlâ açık (925 varyant)", acik.includes("EAN13"));

  /**
   * ⚠ İKİNCİ YÖN: EK KOD BİÇİMLERİ AÇILMAMALI. `EAN2`/`EAN5` iki ve beş
   * haneli fiyat ekleridir; açılırlarsa `maxNumberOfSymbols: 4` taramasında
   * "12" gibi bir çöp değer asıl barkodun ÖNÜNE geçebilir. Yalnız "eksik
   * var mı" diye sorsaydık bu yön serbest kalırdı.
   */
  for (const ek of ["EAN2", "EAN5", "EANUPC"]) {
    kontrol(`  ...${ek} AÇIK DEĞİL (çöp okuma riski)`, !hepsi.includes(ek));
  }

  /** ⚠ ZİNCİR: ürün listesi okuyucuya GERÇEKTEN ulaşıyor mu? */
  for (const b of acik) {
    kontrol(`  ...${b} birleşik listede`, hepsi.includes(b));
  }

  /** ⛔ GEREKÇESİZ MUAFİYET YOK — beyan tek başına yetmez. */
  const gerekcesiz = Object.entries(URUN_DISI_PERAKENDE)
    .filter(([, g]) => g.trim() === "")
    .map(([k]) => k);
  kontrol(
    "her muafiyet GEREKÇELİ",
    gerekcesiz.length === 0,
    gerekcesiz.join(", "),
  );
}

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
