import { readFileSync, readdirSync, statSync } from "node:fs";
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
  kontrol(
    "  ...ve TEMİZLE bağlantısında da korunuyor",
    [...kutu.matchAll(/suzgecAdresi\(temelAdres, tasinanlar/g)].length === 2,
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

console.log("");
console.log("=".repeat(70));
if (kalan === 0) console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exitCode = 1;
}
console.log("");
