import { readFileSync } from "node:fs";
import {
  KOD_ROLLERI,
  aramaKosulu,
  kapsananRoller,
  kodKosulu,
} from "../src/lib/varyant-arama-kurali";
import { kodDizisi } from "../src/lib/varyant-ozet";

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
 */
const serbest = kapsananRoller(aramaKosulu("ABC"));
for (const rol of KOD_ROLLERI) {
  kontrol(`serbest arama ${rol} alanını kapsıyor`, serbest.includes(rol));
}
kontrol(
  "  ...ürün adı da aranıyor (kodu bilmeyen adıyla bulur)",
  JSON.stringify(aramaKosulu("ABC")).includes('"product"'),
);

const okutma = kapsananRoller(kodKosulu("ABC"));
for (const rol of KOD_ROLLERI) {
  kontrol(`okutulan kod ${rol} alanını kapsıyor`, okutma.includes(rol));
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
console.log("=".repeat(70));
if (kalan === 0) {
  console.log(`TÜM KONTROLLER GEÇTİ (${gecen})`);
} else {
  console.log(`${kalan} KONTROL BAŞARISIZ (${gecen + kalan} kontrolden)`);
  process.exit(1);
}
