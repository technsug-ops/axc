import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { kartAdresi } from "../src/lib/kart-adresi";
import { kodDizisi } from "../src/lib/varyant-ozet";
import {
  KOD_ROLLERI,
  ROL_KAPSAMI,
  SATIS_ROLLERI,
  VARYANT_ROLLERI,
  aramaKosulu,
  kapsananRoller,
  kodEsdegerleri,
  kodKosulu,
  kodKosuluToplu,
  satisKodKosulu,
} from "../src/lib/varyant-arama-kurali";

/** Yorumları siler — bir yasağı ANLATAN yorum, o yasağı ÇİĞNEMİŞ sayılmaz. */
function yorumsuz(kod: string): string {
  const blokYorumu = new RegExp("/\\*[\\s\\S]*?\\*/", "g");
  const satirYorumu = new RegExp("//[^\\n]*", "g");
  return kod.replace(blokYorumu, "").replace(satirYorumu, "");
}

/** `src` altındaki bütün kaynak dosyaları — liste TUTULMAZ, taranır. */
/** Yol ayiricisini duzlestirir. Ters bolu KARAKTER KODUYLA yaziliyor:
 *  betikle uretilen kacis dizileri bozulabiliyor (anayasa dersi 28.08). */
function duzYol(yol: string): string {
  return yol.split(String.fromCharCode(92)).join("/");
}

function kaynakDosyalari(kok: string): string[] {
  const cikti: string[] = [];
  for (const girdi of readdirSync(kok, { withFileTypes: true })) {
    const yol = join(kok, girdi.name);
    if (girdi.isDirectory()) cikti.push(...kaynakDosyalari(yol));
    else if (/\.tsx?$/.test(girdi.name)) cikti.push(yol);
  }
  return cikti;
}
/**
 * ⚠ ŞEMA SATIR SONUNDAN BAĞIMSIZ OKUNUR (24.08.2026).
 *
 * `npx prisma format` dosyayı CRLF'e çevirdi ve enum ayrıştıran kontrol
 * SESSİZCE 0 değer buldu: `split("
")` sonrası satırlar `
` ile
 * bitiyor, `/\/\/.*$/` deseni `$`i bulamadığı için yorum SİLİNMİYOR ve
 * `^[A-Z_]+$` testi düşüyor.
 *
 * Kontrol yanlış değildi — okuduğu METİN değişmişti. Windows'ta çalışan
 * her checkout'ta aynı tuzak var; bu yüzden düzeltme tek satırda değil,
 * OKUMA KAPISINDA yapılıyor.
 */
function semaMetni(): string {
  return readFileSync("prisma/schema.prisma", "utf8")
    .split("\r\n")
    .join("\n");
}

/**
 * ============================================================================
 *  ARAMA DOĞRULAMA — DÖRT KOD ROLÜNÜN HEPSİ ARANIYOR MU
 * ----------------------------------------------------------------------------
 *  NEDEN VAR: 15.08.2026'da kullanıcı Hepsiburada siparişi girerken
 *  pazaryerinin kodunu (HBCV…) yapıştırdı ve ürün çıkmadı. Kanal kodu
 *  sistemde EŞLEŞTİRİLMİŞTİ — bilgi vardı, arama sormuyordu.
 *
 *  TESTLER BUNU NEDEN GÖRMEDİ: arama kuralı Prisma sorgusunun İÇİNE gömülüydü.
 *  Gömülü bir `where` bloğu ne çağrılabilir ne sınanabilir; hiçbir test
 *  "hangi alanlar aranıyor" diye soramazdı. Eksik bir OR dalı, var olmayan
 *  bir özellik gibi sessizce duruyordu — hata vermiyor, sadece BULMUYORDU.
 *
 *  Kural artık saf: `varyant-arama-kurali.ts`. Buradaki kontroller kuralın
 *  BİÇİMİNİ değil KAPSAMINI sınıyor — yarın koşul yapısı değişse bile
 *  "dört rol de aranıyor mu" sorusu ayakta kalır.
 * ============================================================================
 */

let gecen = 0;
let kalan = 0;

function kontrol(ad: string, sonuc: boolean) {
  if (sonuc) {
    gecen += 1;
    console.log(`  OK    ${ad}`);
  } else {
    kalan += 1;
    console.log(`  HATA  ${ad}`);
  }
}

console.log("=".repeat(70));
console.log("ARAMA KURALI");
console.log("=".repeat(70));

/**
 * ANAYASADAKİ ÜÇ KOD ROLÜ + KANAL SKU. Biri unutulursa kullanıcı elindeki
 * kodla ürünü bulamaz ve "sistem çalışmıyor" der — haklı olarak.
 *
 * ⚠ DÖNGÜ `KOD_ROLLERI` DEĞİL `VARYANT_ROLLERI` (24.08.2026). Beşinci rol
 * (`shipmentCode`) eklendiğinde bu iki kontrol KIRMIZI yandı ve HAKLIYDI:
 * ölçüt "her rol varyant koşulunda aranıyor mu" diyordu, oysa gönderi
 * numarası bir SATIŞ kimliği. Ölçüt kapsamına bağlandı — rol eklendiğinde
 * kontrol hâlâ yakalar, ama yanlış tabloda aramaz.
 */
const serbest = kapsananRoller(aramaKosulu("ABC"));
for (const rol of VARYANT_ROLLERI) {
  kontrol(`serbest arama ${rol} alanını kapsıyor`, serbest.includes(rol));
}
kontrol(
  "  ...ürün adı da aranıyor (kodu bilmeyen adıyla bulur)",
  JSON.stringify(aramaKosulu("ABC")).includes('"product"'),
);

const okutma = kapsananRoller(kodKosulu("ABC"));
for (const rol of VARYANT_ROLLERI) {
  kontrol(`okutulan kod ${rol} alanını kapsıyor`, okutma.includes(rol));
}

/** ⚠ SATIŞ KAPSAMLI ROLLER DE AYNI TİTİZLİKLE SINANIR — dışarıda kalmasın. */
const satisOkutma = kapsananRoller(satisKodKosulu("ABC"));
for (const rol of SATIS_ROLLERI) {
  kontrol(`satış okutması ${rol} alanını kapsıyor`, satisOkutma.includes(rol));
}

/**
 * OKUTMADA KISMİ EŞLEŞME YASAK. Okutulan koda BENZEYEN başka bir ürün
 * eklenirse yanlış satış kaydedilir ve stok yanlış düşer — sessiz, pahalı
 * bir hata. Serbest aramada ise kısmi eşleşme ŞART.
 */
kontrol(
  "okutmada KISMİ eşleşme yok (yanlış ürün eklenmesin)",
  !JSON.stringify(kodKosulu("ABC")).includes("contains"),
);
kontrol(
  "  ...serbest aramada kısmi eşleşme VAR (insan tam kod yazmaz)",
  JSON.stringify(aramaKosulu("ABC")).includes("contains"),
);
kontrol(
  "  ...okutmada ürün adı aranmıyor (okuyucu ad okumaz)",
  !JSON.stringify(kodKosulu("ABC")).includes('"product"'),
);

/**
 * PASİF EŞLEŞME ÜRÜN GETİRMEZ. Kapatılmış bir listing'in kodu hâlâ ürün
 * getirseydi, artık satılmayan bir eşleşme satışa girerdi.
 */
kontrol(
  "kanal kodu araması yalnız AKTİF eşleşmeye bakıyor",
  JSON.stringify(aramaKosulu("ABC")).includes('"isActive":true') &&
    JSON.stringify(kodKosulu("ABC")).includes('"isActive":true'),
);

console.log("");
console.log("=".repeat(70));
console.log("SONUÇ SATIRINDA GÖRÜNEN KODLAR");
console.log("=".repeat(70));

/**
 * Kullanıcı pazaryeri koduyla ürünü bulduğunda o kodu SATIRDA görmeli;
 * görmezse doğru ürüne baktığından emin olamaz (İlke #3).
 */
const ornek = {
  id: "v1",
  urunAdi: "Ürün",
  marka: null,
  varyantAdi: null,
  sku: "axcali1752",
  companySku: "FRM-1",
  barcode: "8690000000001",
  kanalKodlari: [
    { kanal: "Hepsiburada", kod: "HBCV00009C3LML" },
    { kanal: "Trendyol", kod: "TY-42" },
  ],
};
const dizi = kodDizisi(ornek);
kontrol("sonuç satırı kanal kodunu yazıyor", dizi.includes("HBCV00009C3LML"));
kontrol("  ...kanal ADI da yazıyor (hangi pazaryeri belli)", dizi.includes("Hepsiburada"));
kontrol("  ...birden fazla kanal kodu KIRPILMIYOR", dizi.includes("TY-42"));
kontrol(
  "  ...sistem kodları da duruyor (SKU · Firma SKU · barkod)",
  dizi.includes("axcali1752") &&
    dizi.includes("FRM-1") &&
    dizi.includes("8690000000001"),
);
kontrol(
  "barkodu olmayan varyantta boş ayraç kalmıyor",
  !kodDizisi({ ...ornek, barcode: null, kanalKodlari: [] }).includes("· ·"),
);

// ===========================================================================
console.log("\nKANAL KODLARI EKRANI — KİMLİK VE ORAN LİSTEDE");
// ===========================================================================
/**
 * Kullanıcı 23.08.2026: _"Kanal Kodları sayfası efektif ve kaliteli bir
 * front end'e sahip değil."_
 *
 * ÖLÇÜLDÜ: ekranın adı "Kanal Kodları" ama tabloda KANAL KODU YOKTU — bizim
 * iç SKU'muz vardı. Komisyon oranı da yoktu; satırdaki tek komisyon sinyali
 * "oran eksik" rozetiydi ve canlıda eksik oran sayısı **SIFIR**, yani o rozet
 * hiç yanmıyordu. İkisini görmek için her satırı TEK TEK düzenleme
 * penceresinden açmak gerekiyordu (2.182 eşleme).
 *
 * Anayasa İlke #3 (kimlik kodları listede) ve #9 (az tıkla).
 *
 * ⚠ SÖZLÜK ANAHTARLARI ZATEN VARDI (`sutunKanalKodu`, `sutunOran`): sütunlar
 * niyet edilmiş, hiç çizilmemişti. "Yazılıp görünmeyen alan, yazılmamış
 * gibidir" — bu, aynı gün iade tarafında dört sütun çiftinde de çıkan desen.
 */
{
  const ekran = readFileSync("src/app/kanal-sku/page.tsx", "utf8");
  const ekranKod = ekran
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");

  const baslikBloku = /<TableHeader>([\s\S]*?)<\/TableHeader>/.exec(ekranKod);
  kontrol("başlık satırı kesilebildi", baslikBloku !== null);
  const basliklar = baslikBloku?.[1] ?? "";
  /**
   * ⚠ ÖLÇÜT BAŞLIK SATIRINDAN GÖVDEYE ÇEVRİLDİ — 23.08.2026.
   *
   * İlk hâli "kanal kodu için AYRI bir `<TableHead>` var mı" diye soruyordu.
   * O, çözümün BİR BİÇİMİNİ sabitliyordu; kullanıcının istediği ise şuydu:
   * _"tüm bilgiyi sağa scroll yapmadan görmek istiyorum."_ Yedi sütun o
   * isteği KARŞILAMIYORDU ve ölçüt yedi sütunu koruyordu.
   *
   * Doğru ölçüt: bilgi GÖVDEDE görünüyor mu (aşağıda ayrıca sınanıyor) ve
   * tablo yatay kaydırma gerektirmeyecek kadar dar mı. Başlığın kaç parça
   * olduğu bir uygulama ayrıntısı.
   */
  const basliksayisi = (basliklar.match(/<TableHead[\s>]/g) ?? []).length;
  kontrol(
    `tablo DAR: ${basliksayisi} sütun (yatay kaydırma istemeyecek kadar)`,
    basliksayisi <= 4,
  );
  kontrol("KOMİSYON sütunu var", /t\("sutunOran"\)/.test(basliklar));

  /**
   * ⚠ BAŞLIK YETMEZ, HÜCRE DE OLMALI. Yalnız başlığa bakan bir kontrol,
   * hücreyi boşaltan mutasyonu kaçırırdı: tabloda sütun görünür, içi boş.
   */
  const govdeBloku = /<TableBody>([\s\S]*?)<\/TableBody>/.exec(ekranKod);
  kontrol("gövde bloğu kesilebildi", govdeBloku !== null);
  const govde = govdeBloku?.[1] ?? "";
  kontrol(
    "  ...kanal kodu hücresi DEĞERİ basıyor",
    /deger=\{kayit\.channelSku\}/.test(govde),
  );
  kontrol(
    "  ...komisyon hücresi DEĞERİ basıyor",
    /komisyonMetni\(kayit\)/.test(govde),
  );
  /** Kimlik kodu tek tıkla kopyalanır (İlke #4). */
  kontrol(
    "  ...kanal kodu KOPYALANABİLİR",
    /<KopyalanabilirKod[\s\S]{0,120}deger=\{kayit\.channelSku\}/.test(govde),
  );
  /** Rakam sütunu hizalı — virgüller alt alta gelsin (629/2182 ondalıklı). */
  /**
   * ⚠ İKİ SINIF İKİ AYRI ÖĞEDE — dört sütuna inerken hücre `text-right`,
   * içindeki rakam `tabular-nums` oldu. Tek bitişik desen arayan ölçüt
   * DOĞRU davranışta kırmızı yandı; ikisi ayrı ayrı aranıyor.
   */
  const oranHucresi = govde.slice(
    govde.indexOf("komisyonMetni(kayit)") - 400,
    govde.indexOf("komisyonMetni(kayit)") + 80,
  );
  kontrol("oran hücresi kesilebildi", oranHucresi.length > 0);
  kontrol("  ...hücre SAĞA yaslı", /text-right/.test(oranHucresi));
  kontrol("  ...rakam tabular-nums (virgüller hizalansın)", /tabular-nums/.test(oranHucresi));

  /**
   * ⚠ ÜRÜN ADI SARIYOR, KIRPILMIYOR. Kullanıcı: _"ürün isimlerini gerekiyorsa
   * iki satır yap."_ Hücrenin varsayılanı `whitespace-nowrap` (para/tarih
   * bölünmesin diye); ürün adında ezilmesi gerekiyor, yoksa ad tek satırda
   * uzar ve tabloyu yana taşırır.
   */
  kontrol(
    "ürün adı SARIYOR (nowrap eziliyor)",
    /whitespace-normal/.test(govde),
  );
  kontrol(
    "  ...en fazla iki satır (satır yüksekliği patlamasın)",
    /line-clamp-2/.test(govde),
  );

  /**
   * ⚠ TELEFONDA DA GÖRÜNMELİ (İlke #8: mobil eşit vatandaş). Masaüstü
   * tablosu `md:block`, mobil kart `md:hidden` — biri düzeltilip öteki
   * unutulursa telefonda ekran yine eski hâlinde kalır.
   */
  const mobilBloku = ekranKod.slice(ekranKod.indexOf("md:hidden"));
  kontrol("mobil kart bloğu kesilebildi", mobilBloku.length > 0);
  kontrol(
    "  ...telefonda da kanal kodu var",
    /etiket: t\("sutunKanalKodu"\)/.test(mobilBloku),
  );
  kontrol(
    "  ...telefonda da komisyon var",
    /etiket: t\("sutunOran"\)/.test(mobilBloku),
  );

  /**
   * ⚠ BOŞLUK SESSİZ BIRAKILMAZ (İlke #5) — VE İKİ BOŞLUK FARKLI ŞEY SÖYLER:
   *   · ALIŞ hesabı  → komisyon KAVRAM OLARAK yok (tedarikçi katalog kodu)
   *   · SATIŞ hesabı → oran GİRİLMEMİŞ, doldurulması gerekir
   * Tek "—" ikisini aynı kefeye koyar ve düzeltilecek olan kaybolur.
   */
  const hucreBloku = ekranKod.slice(
    ekranKod.indexOf("function komisyonMetni"),
    ekranKod.indexOf("function duzenleyici"),
  );
  kontrol("komisyon hücresi bloğu kesilebildi", hucreBloku.length > 0);
  kontrol(
    "  ...iki boş hâl AYRI söyleniyor",
    /eksikOranRozeti/.test(hucreBloku) && /oranAlisHesabinda/.test(hucreBloku),
  );
  kontrol(
    "  ...ayrım hesabın ROLÜNDEN geliyor",
    /satisIcin/.test(hucreBloku),
  );

  /**
   * ⚠ BANT UYARISI LİSTEDE OLMAMALI — ÖLÇÜLDÜ VE ELENDİ.
   * `bantDisiMi` canlıda 577/1077 Hepsiburada satırında yanıyordu (%53,6).
   * Sebebi kural değil KAPSAM: bant HB hakediş komisyonlarından kuruluyor
   * (medyan %20,45), buradaki oranların medyanı %15 — iki farklı popülasyon.
   * Ayrıca bant yalnız HB'de var; TY (1057) ve N11 (48) için hiç yok.
   * Yarısında yanan uyarı okunmaz olur ve rozetin tamamına olan güveni
   * götürür ("yanlış uyarı, uyarısızlıktan kötüdür").
   */
  /**
   * ── SATIR BİR TABLO SATIRIDIR, YARIM KALMIŞ BİR FORM DEĞİL ──────────
   *
   * Kullanıcı 24.08.2026: _"hiç mi düzen görmedin, değiştir ve optimize et."_
   *
   * ÖLÇÜLDÜ: 2.182 satırın HER BİRİNDE iki `<Input>` + üç düğme + koşullu bir
   * uyarı metni çiziliyordu. Satır yükseklikleri uyarıya göre değişiyor,
   * "Sil" alt satıra kaçıyordu.
   *
   * ⚠ VE BİLGİ ZATEN ORADAYDI — OKUNUR DEĞİL, YAZILIR HÂLDE. Kanal kodu ve
   * oran birer input kutusunun içindeydi. Sütun olarak eklenince aynı değer
   * İKİ KEZ göründü. Doğru bölüşüm: **liste OKUR, diyalog YAZAR.**
   */
  const editor = readFileSync("src/app/kanal-sku/satir-duzenle.tsx", "utf8");
  const editorKod = editor
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ");
  const satirBloku = editorKod.slice(
    editorKod.indexOf("return ("),
    editorKod.indexOf("<DialogContent>"),
  );
  kontrol("satır bloğu kesilebildi", satirBloku.length > 0);
  kontrol(
    "  ...satırda AÇIK form alanı YOK (input diyalogta)",
    !/<Input/.test(satirBloku),
  );
  /**
   * ⚠ İLKE #1 KORUNUYOR: gizlenen şey EYLEM değil FORM ALANI. Üç eylem de
   * satırda ikon olarak duruyor — düzenle · pasife al · sil.
   */
  /**
   * ⚠ ÜÇ İKON ÜÇ AYRI YERDE — DİLİMLE ARANMAZ. Satırın kendi işaretlemesi
   * `Dialog` · `form(Power)` · `AlertDialog` diye sıralanıyor ve diyalog
   * GÖVDELERİ araya giriyor; ilk `<DialogContent>`e kadar kesen bir dilim
   * son iki ikonu dışarıda bırakıyor (ilk sürüm bu yüzden DOĞRU davranışta
   * kırmızı yandı). Ölçüt ikonların KENDİSİNE bağlandı.
   */
  /**
   * ⚠ HER İKON KENDİ TETİKLEYİCİSİNE BAĞLI ARANIR — MUTASYONLA ÖĞRENİLDİ.
   * `<Trash2>` dosyada İKİ yerde: satır ikonu ve onay diyaloğunun kırmızı
   * düğmesi. Dosya geneli arayan ölçüt, satır ikonunu SİLEN mutasyonu
   * kaçırdı — ötekini buluyordu. ("Aynı desen birden çok yerde geçiyorsa
   * işaret çağrı yerine bağlanır.")
   */
  kontrol(
    "  ...düzenle ikonu satırda (diyaloğu açıyor)",
    /<DialogTrigger asChild>[\s\S]{0,400}<Pencil/.test(editorKod),
  );
  kontrol(
    "  ...sil ikonu satırda (onay diyaloğunu açıyor)",
    /<AlertDialogTrigger asChild>[\s\S]{0,400}<Trash2/.test(editorKod),
  );
  kontrol(
    "  ...pasife al ikonu satırda",
    /<PowerOff className="size-4" \/>/.test(editorKod),
  );
  /**
   * ⚠ İKONLAR TELEFONDA 44px. Anayasa İlke #8 `icon-sm`/`icon-xs`in mobilde
   * tek başına kullanılmasını yasaklıyor; ölçüt `h-11` (44px) + `md:` ile
   * masaüstünde küçülme.
   */
  const ikonSayisi = (editorKod.match(/h-11 w-11 p-0 md:h-8 md:w-8/g) ?? []).length;
  kontrol(
    `  ...üç ikon da telefonda 44px (bulunan: ${ikonSayisi})`,
    ikonSayisi >= 3,
  );
  /** Form gerçekten diyalogta ve kaydediyor. */
  kontrol(
    "düzenleme formu DİYALOGTA",
    /<DialogContent>[\s\S]*?name="channelSku"/.test(editorKod) &&
      /<DialogContent>[\s\S]*?name="commissionRate"/.test(editorKod),
  );
  /** ⚠ Bant uyarısı diyalogta KALIYOR — orada doğru yerde. */
  kontrol(
    "  ...bant uyarısı diyalogta duruyor (listede değil)",
    /<DialogContent>[\s\S]*?bantUyarisi/.test(editorKod),
  );

  kontrol(
    "liste satırında bant uyarısı YOK (%53,6 yalancı pozitif ölçüldü)",
    !/bantDisiMi/.test(govde),
  );
}

console.log("");
// ===========================================================================
//  K41① GÖNDERİ NUMARASI — BEŞİNCİ KOD ROLÜ (24.08.2026)
// ===========================================================================
{
  /**
   * ⚠ ROL LİSTESİ TEK KAYIT YERİ. Komut _"ayrı liste yazma"_ diyordu ve
   * `kodKosulu` VARYANT sorguladığı için gönderi numarası oraya doğrudan
   * eklenemedi. Niyet `ROL_KAPSAMI` ile korundu: liste bir tane, yayım
   * kapsama göre ayrılıyor.
   */
  kontrol(
    "shipmentCode KOD_ROLLERI'nde (tek kayıt yeri)",
    (KOD_ROLLERI as readonly string[]).includes("shipmentCode"),
  );
  /**
   * ⚠ EXHAUSTIVE KONTROLÜN KENDİSİ SINANIR. `ROL_KAPSAMI`den bir rol
   * düşerse derleyici yakalar — ama derleyiciye güvenmek, bu dosyanın
   * kontrolü olmadan "yakalanır" varsaymaktır. Burada KAPSAM sayılıyor:
   * her rolün bir kapsamı OLMALI, eksiksiz.
   */
  const kapsamsiz = KOD_ROLLERI.filter((r) => ROL_KAPSAMI[r] === undefined);
  kontrol(
    "HER rolün kapsamı tanımlı (exhaustive Record eksiksiz)",
    kapsamsiz.length === 0,
  );
  kontrol(
    "  ...dört ürün rolü VARYANT kapsamında",
    VARYANT_ROLLERI.length === 4 &&
      ["sku", "companySku", "barcode", "channelSku"].every((r) =>
        (VARYANT_ROLLERI as readonly string[]).includes(r),
      ),
  );
  kontrol(
    "  ...gönderi numarası SATIS kapsamında",
    SATIS_ROLLERI.length === 1 && SATIS_ROLLERI[0] === "shipmentCode",
  );

  /**
   * ⚠ VARYANT KOŞULU KİRLENMEMELİ. `shipmentCode` oraya sızarsa beş çağıran
   * birden geçersiz sorgu üretir (okut · varyant-arama · kart-arama ·
   * urun-zemini · kart-arama-verisi).
   */
  kontrol(
    "kodKosulu'na SATIŞ alanı SIZMIYOR",
    !JSON.stringify(kodKosulu("X")).includes("shipmentCode"),
  );
  kontrol(
    "satisKodKosulu gönderi numarasını arıyor",
    JSON.stringify(satisKodKosulu("X")).includes("shipmentCode"),
  );
  /**
   * ⚠ SİPARİŞ NUMARASI DA ARANIR: depoda elindeki kâğıtta hangisi yazıyorsa
   * onu okutur. Yalnız gönderi numarası aramak, kullanıcıyı hangi kodun
   * hangi kutuya ait olduğunu ezberlemeye zorlardı.
   */
  kontrol(
    "  ...ve sipariş numarasını da arıyor",
    JSON.stringify(satisKodKosulu("X")).includes('"code"'),
  );

  // ── ŞEMA: BENZERSİZ ──────────────────────────────────────────────────
  const sema = semaMetni();
  const saleBloku = sema.slice(
    sema.indexOf("model Sale {"),
    sema.indexOf("model Sale {") + 3000,
  );
  /**
   * ⚠ BENZERSİZLİK ŞART: aynı kod iki satışa girilirse okutma İKİ sonuç
   * döndürür ve hangisinin doğru olduğu bilinemez — depoda yanlış kutu
   * paketlenir.
   */
  kontrol(
    "shipmentCode BENZERSİZ (aynı kod iki satışa giremez)",
    /shipmentCode\s+String\?\s+@unique/.test(saleBloku),
  );
  kontrol(
    "  ...ve NULLABLE (boş bırakılabilir)",
    /shipmentCode\s+String\?/.test(saleBloku),
  );

  // ── SUNUCU: ÇAKIŞMA HÜKMÜ ────────────────────────────────────────────
  const satisLib = readFileSync("src/lib/satis.ts", "utf8");
  kontrol(
    "kayıt sırasında çakışma SORULUYOR (ham DB hatasına bırakılmıyor)",
    /where: \{ shipmentCode: girdi\.shipmentCode \}/.test(satisLib),
  );
  kontrol(
    "  ...hüküm sipariş numarasıyla AYNI gövdeden",
    /siparisNoCakismaHukmu\(cakisan\)[\s\S]{0,200}girdi\.shipmentCode/.test(
      satisLib,
    ),
  );

  const gonderiEylemi = readFileSync(
    "src/app/satislar/[id]/gonderi-no-actions.ts",
    "utf8",
  );
  kontrol(
    "sonradan girişte de çakışma sorgulanıyor",
    /where: \{ shipmentCode: kod \}/.test(gonderiEylemi),
  );
  /** ⚠ AYNI SATIŞA AYNI KOD ÇAKIŞMA DEĞİLDİR — form iki kez gönderilebilir. */
  kontrol(
    "  ...ama AYNI satışa aynı kod çakışma sayılmıyor",
    /cakisan\.id !== saleId/.test(gonderiEylemi),
  );
  kontrol(
    "  ...boş değer null yazılıyor (boş dize @unique'te çakışırdı)",
    /shipmentCode: null/.test(gonderiEylemi),
  );

  // ── /okut: SATIŞ KİMLİĞİ ARAMASI ─────────────────────────────────────
  const okutEylemi = readFileSync("src/app/okut/actions.ts", "utf8");
  kontrol(
    "/okut varyant bulunamazsa SATIŞ kimliğinde arıyor",
    /satisKodCosulu|satisKodKosulu\(temiz\)/.test(okutEylemi),
  );
  /**
   * ⚠ KOVA İKİ KAYNAĞI DA SAYAR. Yalnız varyanta baksaydı, gönderi
   * numarasından bulunan sipariş `BILINMEYEN` kovasına düşerdi ve haftalık
   * kapsama ölçümü bulunmuş bir kodu "bulunamadı" diye sayardı.
   */
  kontrol(
    "  ...kova İKİ kaynağı da 'bulundu' sayıyor",
    /bulunduMu: varyant !== null \|\| satisKaydi !== null/.test(okutEylemi),
  );
  /**
   * ⚠ HANGİ ALANDA BULUNDUĞU SÖYLENİR. Kullanıcı "gönderi numarasından
   * bulundu" görmezse kodun neden eşleştiğini bilemez ve yanlış kutuyu
   * paketleyebilir.
   */
  kontrol(
    "  ...gönderi numarasından bulunduğu İŞARETLENİYOR",
    /satisKaydi\.shipmentCode === temiz[\s\S]{0,60}"shipmentCode"/.test(
      okutEylemi,
    ),
  );
  const okuyucu = readFileSync("src/app/okut/okuyucu.tsx", "utf8");
  kontrol(
    "  ...ve EKRANDA yazıyor (alanAdi sözlüğünde)",
    /shipmentCode: t\("alanShipmentCode"\)/.test(okuyucu),
  );

  // ── FORM: OKUNAN DEĞER DOĞRUDAN TAŞINIR ──────────────────────────────
  const gonderiFormu = readFileSync(
    "src/app/satislar/[id]/gonderi-no.tsx",
    "utf8",
  );
  /**
   * ⚠ ARA DURUMDAN OKUMA YASAK. React durumu senkron güncellenmiyor;
   * `setKod(x)` deyip hemen `kaydet()` çağırmak BİR ÖNCEKİ değeri
   * kaydederdi (fiyat denemesi vakası).
   */
  kontrol(
    "okunan değer PARAMETREYLE taşınıyor (ara durumdan okunmuyor)",
    /const kaydet = \(deger: string\)/.test(gonderiFormu) &&
      /gonderiNoKaydet\(saleId, deger\)/.test(gonderiFormu),
  );
  kontrol(
    "  ...okuma anında doğrudan o değerle kaydediliyor",
    /onOkundu=\{\(okunan\) => \{[\s\S]{0,120}kaydet\(okunan\)/.test(gonderiFormu),
  );

  // ── /satislar ARAMASI ────────────────────────────────────────────────
  const suzgec = readFileSync("src/lib/liste-suzgeci.ts", "utf8");
  /**
   * ⚠ ÖLÇÜT 30.08.2026'DA GÜNCELLENDİ — VE NİYE GÜNCELLENDİĞİ BURADA YAZAR.
   *
   * Eski hâli değişken ADINI sabitliyordu: `{ contains: arama }`. K100
   * (UPC-A ↔ EAN-13) süzgeci `kodEsdegerleri(arama).flatMap((e) => …)` içine
   * aldı ve değişken `e` oldu; kontrol KIRMIZI yandı. **Kod doğruydu** —
   * gönderi numarası hâlâ aranıyor; eskiyen şey ölçüttü.
   * _(Anayasa: "bekçinin kırmızısı her zaman kod yanlış demez" — eskiyen
   * ölçüt güncellenir, SUSTURULMAZ.)_
   *
   * ⭐ YENİ ÖLÇÜT DAHA GÜÇLÜ: artık yalnız "aranıyor mu" demiyor, aranan
   * değerin EŞDEĞER DÖNGÜSÜNDEN geldiğini de sınıyor. Yani biri yarın
   * gönderi numarasını eşdeğer açılımının DIŞINA çıkarırsa kırmızı yanar.
   */
  const esdegerDegiskeni = /kodEsdegerleri\([^)]*\)\s*\.\s*flatMap\(\s*\(\s*([A-Za-z_$][\w$]*)/.exec(
    suzgec,
  )?.[1];
  const gonderiDegiskeni = /shipmentCode:\s*\{\s*contains:\s*([A-Za-z_$][\w$]*)/.exec(
    suzgec,
  )?.[1];
  kontrol(
    "/satislar araması gönderi numarasını da buluyor",
    gonderiDegiskeni !== undefined,
  );
  kontrol(
    "  ...ve eşdeğer kod döngüsünün İÇİNDEN okuyor (K100)",
    esdegerDegiskeni !== undefined && gonderiDegiskeni === esdegerDegiskeni,
  );
}

// ===========================================================================
//  ÜRÜN ADI → KÂRLILIK KARTI (kullanıcı isteği 24.08.2026)
// ===========================================================================
{
  /**
   * ⚠ KART VARYANT SEVİYESİNDE. Tekil değilse bağlantı KURULMAZ — belirsizken
   * "ilkini al" demek, kullanıcıyı sessizce yanlış kartın önüne koymaktı.
   */
  kontrol(
    "tek varyantta kart adresi kuruluyor",
    kartAdresi([{ variantId: "v1" }]) === "/kart/v1",
  );
  /**
   * ⚠ ÖRNEK VERİ AYRIMI GÖSTERİYOR: aynı varyant iki kalemde geçerse kart
   * hâlâ BELİRSİZ DEĞİLDİR. Bu satır olmasaydı "kalem sayısı 1 olmalı"
   * yazan bir mutasyon yeşil kalırdı.
   */
  kontrol(
    "  ...aynı varyant iki kalemde olsa da tekil sayılıyor",
    kartAdresi([{ variantId: "v1" }, { variantId: "v1" }]) === "/kart/v1",
  );
  kontrol(
    "İKİ FARKLI varyantta bağlantı kurulmuyor (belirsiz)",
    kartAdresi([{ variantId: "v1" }, { variantId: "v2" }]) === null,
  );
  kontrol("boş kalemde bağlantı yok", kartAdresi([]) === null);

  /**
   * ⚠ ÜÇ EKRAN DA AYNI GÖVDEDEN GEÇER. Biri elle adres kursaydı, kural
   * değiştiğinde o ekran sessizce eski kalırdı (K34a dersi).
   */
  /**
   * ⚠ MASAÜSTÜ VE MOBİL AYRI KOD YOLU — İKİSİ DE SAYILIR (24.08.2026).
   *
   * İlk yazım yalnız "dosyada `kartAdresi` geçiyor mu" diye soruyordu ve
   * YEŞİL YANDI: tablo bağlıydı, mobil kart elle `/satislar/{id}` yazıyordu.
   * Kullanıcı telefonda buldu — aynı bilgi iki ekranda iki farklı yere
   * gidiyordu (İlke #10) ve telefonda karta erişimin başka yolu yoktu.
   *
   * Ölçüt artık ÇAĞRI SAYIYOR: her ekranda en az iki kez (tablo + mobil).
   * Yarın üçüncü bir görünüm eklenirse sayı tutmaz ve kontrol yakalar.
   */
  for (const [ad, yol, enAz] of [
    ["satışlar", "src/app/satislar/page.tsx", 2],
    ["alımlar", "src/app/alimlar/page.tsx", 2],
    ["ürünler", "src/app/urunler/page.tsx", 2],
  ] as const) {
    const kaynak = readFileSync(yol, "utf8");
    const cagri = (kaynak.match(/kartAdresi\(/g) ?? []).length;
    kontrol(
      `${ad}: kart kuralı ${enAz} yerde çağrılıyor (tablo + mobil) — ${cagri}`,
      cagri >= enAz,
    );
    kontrol(
      `  ...${ad}: elle /kart/ adresi kurmuyor`,
      !/href=\{`\/kart\//.test(kaynak),
    );
    /**
     * ⚠ MOBİL BLOK AYRICA SINANIR. Sayı tutup ikisinin de TABLODA olması
     * mümkün; `md:hidden` bloğunun içinde çağrı var mı diye bakılıyor.
     */
    const mobilBasi = kaynak.indexOf("md:hidden");
    kontrol(
      `  ...${ad}: mobil blok bulundu`,
      mobilBasi > 0,
    );
    kontrol(
      `  ...${ad}: MOBİL blokta da kart kuralı var`,
      mobilBasi > 0 && /kartAdresi\(/.test(kaynak.slice(mobilBasi)),
    );
  }

  /**
   * ⚠ ÜRÜNLERDE BELİRSİZ OLUNCA ÜRÜN SAYFASINA DÜŞER, bağlantı KAYBOLMAZ.
   * Satış/alımda kayıt zaten tek varyantlı; orada düşülecek bir yer yok ve
   * ad düz metin kalır.
   */
  const urunlerKaynak = readFileSync("src/app/urunler/page.tsx", "utf8");
  kontrol(
    "ürünler: belirsizken ürün sayfasına düşüyor (bağlantı kaybolmuyor)",
    /kartAdresi\([\s\S]{0,120}\) \?\? `\/urunler\/\$\{urun\.id\}`/.test(
      urunlerKaynak,
    ),
  );
}

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  § K100 — UPC-A ↔ EAN-13 EŞDEĞERLİĞİ (30.08.2026)
 * -----------------------------------------------------------------------
 *  ⛔ CANLI VAKA: Halil `/yerlestir`de `0194644037598` okuttu, ekran "ne
 *  ürün ne raf" dedi; baştaki sıfır elle silinince ürün çıktı.
 *
 *  ⭐ ÖLÇÜTLER SAF GÖVDEYİ ÇAĞIRIYOR — kaynak taranmıyor. Anayasa: "saf
 *  hesap katmanı, desen tarayan bekçiye muhtaç olmaz".
 * ═══════════════════════════════════════════════════════════════════════
 */
{
  console.log("");
  console.log("§ K100 — UPC-A / EAN-13 eşdeğerliği");

  const e13 = kodEsdegerleri("0194644037598");
  kontrol(
    "13 hane + baştaki sıfır -> 12 haneli hâli de aranıyor",
    e13.includes("0194644037598") && e13.includes("194644037598"),
  );
  const e12 = kodEsdegerleri("194644037598");
  kontrol(
    "12 hane -> sıfır eklenmiş hâli de aranıyor",
    e12.includes("194644037598") && e12.includes("0194644037598"),
  );

  /**
   * ⚠ SINIR SINANIYOR — KURAL GENİŞLEMESİN. Ölçüm yalnız 12 ↔ 13 için
   * yapıldı; 11/14/18 hane ve sayı olmayan kodlar ölçülmedi, bu yüzden
   * kural onlara DOKUNMAMALI. Dokunsaydı ölçülmemiş bir denklik koda
   * girerdi ve yanlış eşleşme YANLIŞ ÜRÜNE yazardı.
   */
  for (const kod of ["1234567890", "12345678901234", "HBCV00004IA2P8", ""]) {
    kontrol(
      `kapsam dışı kod dokunulmadan geçiyor: "${kod}"`,
      kodEsdegerleri(kod).length === 1,
    );
  }
  /**
   * ⚠ 13 HANE AMA SIFIRLA BAŞLAMIYORSA DOKUNULMAZ. `5702017419732` gibi
   * gerçek bir EAN-13'ten hane atmak, onu başka bir ürünün koduna
   * çevirebilirdi.
   */
  kontrol(
    "13 hane ama sıfırsız -> dokunulmuyor",
    kodEsdegerleri("5702017419732").length === 1,
  );
  /**
   * ⚠ "BÜTÜN BAŞTAKİ SIFIRLARI KIRP" DEĞİL — TAM BİR HANE. `011120272536`
   * katalogda GERÇEKTEN sıfırla başlayan 12 haneli bir koddur; hepsini
   * kırpan bir kural onu başka bir kümeye taşırdı.
   */
  kontrol(
    "12 hanede baştaki sıfır KIRPILMIYOR (yalnız eklenir)",
    !kodEsdegerleri("011120272536").includes("11120272536"),
  );

  /** Kural üç yayım yolunun ÜÇÜNE de ulaşıyor mu — gövdeler çağrılarak. */
  const kosulMetni = JSON.stringify(kodKosulu("0194644037598"));
  kontrol(
    "okutulan kod (kodKosulu) eşdeğeri taşıyor",
    kosulMetni.includes("194644037598") &&
      kosulMetni.includes("0194644037598"),
  );
  const topluMetni = JSON.stringify(kodKosuluToplu(["0194644037598"]));
  kontrol(
    "toplu çözüm (kodKosuluToplu) eşdeğeri taşıyor",
    topluMetni.includes('"194644037598"'),
  );
  const serbestMetni = JSON.stringify(aramaKosulu("0194644037598"));
  kontrol(
    "serbest arama (aramaKosulu) eşdeğeri taşıyor",
    serbestMetni.includes('"194644037598"'),
  );

  /**
   * ═══ DESEN YASAĞI — DOSYA LİSTESİ TUTULMUYOR ═══════════════════════
   *
   * ⛔ ANAYASA: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".
   * K100 yazılırken ALTI ayrı kopya bulundu (`/stok`, `/urunler`,
   * `alim-arama`, `liste-suzgeci`, dışa aktarmada iki yer) ve hiçbiri
   * paylaşılan kuralı kullanmıyordu. "Şu altı dosyayı düzelttim" demek,
   * YEDİNCİ ekran eklendiğinde sessizce yeşil kalmaktı.
   *
   * ⭐ ÖLÇÜT: `barcode: { contains: X }` yazan her yerde X, bir
   * `kodEsdegerleri(...)` dönüşünden gelen değişken OLMAK ZORUNDA.
   * Ham bir değişken (`arama`, `q`, `sorgu`) yazılamaz.
   */
  const taranan = kaynakDosyalari("src");
  const ihlaller: string[] = [];
  for (const yol of taranan) {
    const kod = yorumsuz(readFileSync(yol, "utf8"));
    /** Kuralın KENDİ dosyası muaf — eşdeğeri o üretiyor. */
    if (duzYol(yol).endsWith("lib/varyant-arama-kurali.ts")) continue;
    const eslesmeler = kod.match(/barcode:\s*\{\s*contains:\s*([A-Za-z_$][\w$]*)/g) ?? [];
    if (eslesmeler.length === 0) continue;
    /**
     * ⚠ BAĞLAYICI ARANIYOR, AD DEĞİL: `kodEsdegerleri` kelimesinin dosyada
     * geçmesi yetmez (yorumda da geçebilir) — dönüşünü bir değişkene BAĞLAYAN
     * çağrı aranıyor.
     */
    const baglayici = /kodEsdegerleri\([^)]*\)\s*\.\s*flatMap\(\s*\(\s*([A-Za-z_$][\w$]*)/.exec(kod);
    const bagliDegisken = baglayici?.[1] ?? null;
    for (const e of eslesmeler) {
      const degisken = /contains:\s*([A-Za-z_$][\w$]*)/.exec(e)?.[1] ?? "?";
      if (degisken !== bagliDegisken) {
        ihlaller.push(`${duzYol(yol)} -> contains: ${degisken}`);
      }
    }
  }
  kontrol(
    `çıplak barkod araması YOK (${taranan.length} dosya tarandı)`,
    ihlaller.length === 0,
  );
  for (const i of ihlaller) console.log("        " + i);
  /** ⚠ TARAMANIN KENDİSİ DE ÖLÇÜLÜR: hiç dosya bulunamazsa "temiz" değil,
   *  BOZUK demektir (anayasa: boş sonuç ile temiz sonuç ayrı şeylerdir). */
  kontrol("tarama gerçekten dosya buldu", taranan.length > 100);
}

console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
