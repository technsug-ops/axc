/**
 * ============================================================================
 *  KOMİSYON LİSTESİ — ORTAK İÇ MODEL
 * ----------------------------------------------------------------------------
 *  Pazaryerinin satıcı panelinden inen ÜRÜN LİSTESİ dosyası, içinde her
 *  listeleme için geçerli komisyon oranı durur. İki pazaryeri iki ayrı
 *  biçim veriyor; iki okuyucu da çıktısını BU modele çevirir ve bundan
 *  sonraki her şey (eşleştirme, önizleme, yazım) biçimi bilmez.
 *
 *  ÖLÇÜLDÜ 13.08.2026 (gerçek dosyalarla):
 *    Hepsiburada · sayfa "Listelerim" · 2151 satır
 *      SKU=HBCV… · Satıcı Stok Kodu=HBV… · Komisyon Oranı="13%" · Barkod
 *      hücresinde ";" ile AYRILMIŞ ÇOKLU barkod olabiliyor.
 *    Trendyol · sayfa "Ürünler" · 1581 satır
 *      Barkod=8700216963503 · Komisyon Oranı="15.0" · Tedarikçi Stok Kodu
 *      616 satırda BOŞ — bu yüzden eşleşmenin taşıyıcısı olamaz.
 *
 *  NEDEN KANAL KODU PAZARYERİNE GÖRE DEĞİŞİYOR: canlıdaki eşlemelerde
 *  gelenek ölçüldü — Trendyol hesabında `channelSku` = BARKOD (14/14),
 *  Hepsiburada hesabında = HB SKU (1040 satır tuttu). Yaratılan yeni
 *  eşlemeler bu geleneğe uyar; başka bir kod yazmak aynı ürünü iki kodla
 *  taşıyan ikinci bir gerçeklik üretirdi.
 * ============================================================================
 */

/** Dosyanın hangi pazaryerinden indiği. Dosyanın KENDİSİNDEN tanınır. */
export type KomisyonPlatformu = "TRENDYOL" | "HEPSIBURADA" | "N11";

/** Okunmuş tek satır — pazaryeri biçiminden arınmış. */
export type KomisyonSatiri = {
  /**
   * Pazaryerinin kendi stok kodu; eşleşmenin BİRİNCİL anahtarı ve yeni
   * eşleme açılırsa yazılacak kanal kodu. HB: "SKU" · TY: "Barkod".
   */
  kanalKodu: string;
  /**
   * İkinci kod adayı — HB "Satıcı Stok Kodu", TY "Tedarikçi Stok Kodu".
   * Yalnız EŞLEŞTİRMEDE kullanılır, yeni eşlemeye yazılmaz.
   */
  ikinciKod: string | null;
  /**
   * Ürün barkod(lar)ı. HB tek hücrede ";" ile birden fazla verir; hepsi
   * denenir çünkü hangisinin bizim kataloğumuzdaki barkod olduğu belli
   * değildir.
   */
  barkodlar: string[];
  /** Yüzde olarak oran (13 = %13). Çözülemediyse null. */
  oran: number | null;
  /** Ham oran metni — geçersizse kullanıcıya bunu gösteriyoruz. */
  hamOran: string;
  /** Ürün adı — önizlemede satırı tanımak için. */
  urunAdi: string | null;
  /** Elektronik tablodaki satır numarası; hata mesajı buna işaret eder. */
  satirNo: number;
};

/** Bir dosyanın okunmuş hâli. */
export type KomisyonOkumasi = {
  platform: KomisyonPlatformu;
  /** Okunan sayfanın adı — önizlemede hangi sayfadan okuduğumuzu yazıyoruz. */
  sayfa: string;
  satirlar: KomisyonSatiri[];
  /** Tanınmayan/bulunamayan zorunlu başlıklar. */
  eksikSutunlar: string[];
};

/**
 * GEÇERLİ ORAN ARALIĞI.
 *
 * Sınır dışı satır YAZILMAZ, uyarı listesinde ham metniyle görünür.
 * Üst sınır 100: pazaryeri bir gün oranı binde cinsinden verirse ya da
 * hücre kaymışsa (fiyat kolonu okunmuşsa) 3499 gibi bir değer sessizce
 * yazılır ve kâr motoru o üründe eksi kâr üretirdi.
 */
export const ORAN_ARALIGI = { enAz: 0, enFazla: 100 } as const;
