/**
 * ============================================================================
 *  İZİN LİSTESİ — KOD SABİTİ
 * ----------------------------------------------------------------------------
 *  ROL VERİDİR, İZİN LİSTESİ DEĞİL. "alim.yaz" ancak o kodu koruyan bir
 *  satır varsa anlamlıdır; kullanıcının uyduracağı bir izin adının
 *  karşılığı olmaz. Rol yönetimi ekranında bu liste onay kutusu olarak
 *  görünür — seçenekler koddan gelir, veritabanından değil.
 *
 *  Veritabanında tanınmayan bir `permissionKey` bulunursa uygulama onu
 *  YOK SAYAR (yetki vermez) ve `yetki:dogrula` bildirir. Sessizce yetki
 *  veren bir yazım hatası olmaz.
 *
 *  İZİN MODELİ SAYFA BAZLIDIR (kullanıcı kararı 13.08.2026, seçenek A):
 *  sayfa ve işlem korunur, ALAN GİZLEME YOKTUR.
 *  `satis.kar.gor` BİLİNÇLİ TEK İSTİSNADIR: satış listesindeki NET-2
 *  kolonu ve satış detayındaki kâr bloğu ona bağlıdır. Operasyon satışı
 *  görmek ve girmek zorunda, ama marjı görmemeli. Başka hiçbir ekranda
 *  alan-izni AÇILMAZ — açılırsa bu model çöker ve her yeni ekran ayrı
 *  bir güvenlik kararı hâline gelir.
 * ============================================================================
 */

/** Bir iznin ne olduğu — rol ekranı bu listeden çizilir. */
export type IzinTanimi = {
  anahtar: string;
  /** Ekranda hangi başlık altında gruplanır. */
  grup: "operasyon" | "para" | "ayar" | "yonetim";
  /**
   * SAĞLAYICI İZNİ Mİ — FİRMA DÜZLEMİNDE DEĞİL, ÜRÜNÜ SAĞLAYAN DÜZLEMDE.
   *
   * ⚠ 16.08.2026 teşhisi: sistemde "sağlayıcı" diye bir KAVRAM yok. Roller
   * global (`Role`de `companyId` yok), 40 modelin yalnız 3'ünde
   * `companyId` var. Yani firma-üstü bir düzlem tanımlı değil ve
   * "bütün firmaları gör" yetkisi bir FİRMA rolünde duruyor.
   *
   * Tam ayrımı bugün KURMUYORUZ — kurulsaydı yalnız taleplerde izolasyon
   * olurdu, ürün/satış/kâr açık kalırdı; kısmi izolasyon izolasyon
   * değildir. Ayrım, çok-firma veri katmanı paketinin ilk maddesi
   * (bkz. BEKLEYENLER → engelleyici ön şart).
   *
   * BUGÜN YAPILAN SİGORTA: bu işaretli izinler `SONRADAN_DOGAN`
   * mekanizmasıyla HİÇBİR role OTOMATİK dağıtılmaz. Mevcut roller
   * korunur (elle verilmiş), ama yarın açılan tam yetkili bir rol bunları
   * kendiliğinden ALMAZ. Keskin uç körelir; kavram yerinde durur.
   */
  saglayici?: true;
};

export const IZINLER = [
  // --- OPERASYON ---
  { anahtar: "urun.gor", grup: "operasyon" },
  { anahtar: "urun.yaz", grup: "operasyon" },
  { anahtar: "alim.gor", grup: "operasyon" },
  { anahtar: "alim.yaz", grup: "operasyon" },
  { anahtar: "malkabul.yaz", grup: "operasyon" },
  { anahtar: "stok.gor", grup: "operasyon" },
  { anahtar: "stok.duzelt", grup: "operasyon" },
  { anahtar: "satis.gor", grup: "operasyon" },
  { anahtar: "satis.yaz", grup: "operasyon" },
  /**
   * DÜZELTME VE İPTAL, SATIŞ GİRMEKTEN AYRI İZİNLERDİR (18.08.2026).
   *
   * `satis.yaz` "yeni satış kaydet" demektir ve depo işidir. Bu ikisi ise
   * YAZILMIŞ bir kaydı geriye dönük değiştirir:
   *   · `satis.duzenle` — fiyat/adet/kargo değişir, NET yeniden hesaplanır,
   *     adet değişince STOK DEFTERİ hareket alır.
   *   · `satis.iptal`   — satış ciro ve kâr kümesinden çıkar, mal stoğa döner.
   *
   * Ayrı tutulmalarının sebebi rol değil ETKİ: ikisi de geçmişi değiştirir
   * ve ikisi de paraya dokunur. "Satış girebilen herkes fiyat da
   * düzeltebilir" varsayımı, eleman alındığı gün sessizce yanlış olur.
   *
   * ⚠ OPERASYON listesine BİLEREK EKLENMEDİ — ayrımın bütün amacı bu.
   * Depocu satış girer, fiyat düzeltip satış iptal edemez.
   *
   * "İptali geri al" da `satis.iptal`e bağlıdır: iptal edebilen geri de
   * alabilmeli, yoksa kendi hatasını düzeltemeyen bir rol doğar ve iş
   * yine sahibe düşer.
   */
  { anahtar: "satis.duzenle", grup: "operasyon" },
  { anahtar: "satis.iptal", grup: "operasyon" },
  { anahtar: "iade.gor", grup: "operasyon" },
  { anahtar: "iade.yaz", grup: "operasyon" },
  { anahtar: "elkitabi.gor", grup: "operasyon" },

  // --- PARA VE MARJ ---
  // Tek alan-izni burada: satış listesindeki NET-2 kolonu ve satış
  // detayındaki kâr bloğu. Gerekçe dosya başlığında.
  { anahtar: "satis.kar.gor", grup: "para" },
  { anahtar: "envanter.gor", grup: "para" },
  { anahtar: "rapor.gor", grup: "para" },
  { anahtar: "hakedis.gor", grup: "para" },
  { anahtar: "kart.gor", grup: "para" },
  { anahtar: "gider.yaz", grup: "para" },
  { anahtar: "tazminat.yaz", grup: "para" },
  { anahtar: "kar.duzelt", grup: "para" },
  { anahtar: "kanalsku.yaz", grup: "para" },

  // --- AYAR VE VERİ ---
  { anahtar: "ayar.yaz", grup: "ayar" },
  // Dışa aktarma TÜM veriyi indirir, geri yükleme TÜMÜNÜ siler.
  // Ayırmak yanlış güven verirdi; tek izin.
  { anahtar: "veri.aktar", grup: "ayar" },

  // --- YÖNETİM ---
  { anahtar: "kullanici.yonet", grup: "yonetim" },
  { anahtar: "rol.yonet", grup: "yonetim" },
  /**
   * DESTEK TALEBİ YÖNETİMİ — geliştiricide.
   *
   * Talep AÇMAK izin istemez: sistemi kullanan herkes "burada olmuyor"
   * diyebilmeli, aksi hâlde bildirim yine Telegram'a kaçar. Talebin
   * DURUMUNU değiştirmek ve çözüm notu yazmak bu izne bağlı — kullanıcı
   * kendi talebinin nerede olduğunu GÖRÜR ama ilerletemez.
   */
  /**
   * SAĞLAYICI İZNİ: talebi AÇAN müşteri firmadır, ÇÖZEN ürünü sağlayandır.
   * Bu yüzden firma rollerine otomatik dağıtılmaz (bkz. `saglayici`).
   */
  { anahtar: "destek.yonet", grup: "yonetim", saglayici: true },
] as const satisfies readonly IzinTanimi[];

export type Izin = (typeof IZINLER)[number]["anahtar"];

const ANAHTARLAR: ReadonlySet<string> = new Set(IZINLER.map((i) => i.anahtar));

/** Veritabanından gelen anahtar tanınıyor mu? */
export function izinTaninirMi(anahtar: string): anahtar is Izin {
  return ANAHTARLAR.has(anahtar);
}

/** Tüm izinler — SAHİP rolünün seed'i. */
export const TUM_IZINLER: readonly Izin[] = IZINLER.map((i) => i.anahtar);

/**
 * SAĞLAYICI DÜZLEMİNE AİT İZİNLER — otomatik dağıtım YASAK.
 *
 * `prisma/seed-yetki.ts` bu listedekileri "sonradan doğan izin" olarak
 * hiçbir role yağdırmaz; `scripts/yetki-bekci.ts` de bunların eksikliğini
 * HATA saymaz. İki yerde iki farklı ölçüt olmasın diye tek kaynak burası.
 *
 * Liste bugün tek elemanlı. Yeni bir sağlayıcı izni doğduğunda yapılacak
 * tek şey tanımına `saglayici: true` yazmaktır — mekanizma kendiliğinden
 * uygular.
 */
export const SAGLAYICI_IZINLERI: readonly Izin[] = IZINLER.filter(
  (i) => "saglayici" in i && i.saglayici === true,
).map((i) => i.anahtar);

/**
 * SONRADAN DOĞAN İZİNLERDEN HANGİLERİ ROLLERE OTOMATİK DAĞITILIR.
 *
 * Sağlayıcı izinleri ELENİR — bir firma rolü onları kendiliğinden almaz.
 * Kural saf fonksiyonda çünkü seed'in içine gömülseydi hiçbir test
 * göremezdi; bu oturumda tam bu tuzağa iki kez düşüldü.
 *
 * ÇİFT KATMAN BİLİNÇLİ: bir izin `SONRADAN_DOGAN` listesine yanlışlıkla
 * yazılsa bile `saglayici` işareti onu burada tekrar eler. Tek katman
 * olsaydı, listeye ekleyen bir kişi sigortayı farkında olmadan delerdi.
 */
export function otomatikDagitilacak(
  sonradanDogan: readonly string[],
): readonly string[] {
  const saglayici = new Set<string>(SAGLAYICI_IZINLERI);
  return sonradanDogan.filter((i) => !saglayici.has(i));
}

/** Firma düzlemine ait izinler — tam yetkili rolün sahip olması BEKLENEN küme. */
export const FIRMA_IZINLERI: readonly Izin[] = TUM_IZINLER.filter(
  (i) => !(SAGLAYICI_IZINLERI as readonly string[]).includes(i),
);

/**
 * OPERASYON rolünün başlangıç izinleri (kullanıcı kararı 13.08.2026).
 *
 * Alım maliyetini GÖRÜR — faturayı zaten eline alıyor; korunan sır marj,
 * tedarikçi fiyatı değil. `satis.kar.gor` YOK: satışı görür ve girer ama
 * NET-2'yi görmez. `envanter.gor` YOK: depo değeri kapalı.
 */
export const OPERASYON_IZINLERI: readonly Izin[] = [
  "urun.gor",
  "urun.yaz",
  "alim.gor",
  "alim.yaz",
  "malkabul.yaz",
  "stok.gor",
  "stok.duzelt",
  "satis.gor",
  "satis.yaz",
  // İADEYİ OPERASYON GİRİYOR — listesini de görmeli.
  // Kullanıcı kararı 13.08.2026: "iade giren rol iade listesini göremezse
  // işlevsiz bir rol teslim edilmiş olur." Para sütunları (NET-2 etkisi,
  // ceza, maliyet) `satis.kar.gor`e bağlı; Operasyon listeyi PARASIZ görür
  // ve koruma budur — sayfayı tümden kapatmak değil.
  "iade.gor",
  "iade.yaz",
  "elkitabi.gor",
];

/** Seed'lenecek roller. "Boş rol" açılmaz — ihtiyaç doğunca ekrandan. */
export const SAHIP_ROLU = "Sahip";
export const OPERASYON_ROLU = "Operasyon";

/**
 * ============================================================================
 *  TAM YETKİLİ Mİ — SAF ÖLÇÜT (K98, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ ÖLÇÜT İZİN KÜMESİDİR, ROL ADI DEĞİL. Bir rolün adının "Sahip" olması
 *  yetki vermez; canlıdaki rol zaten "CEO" ve seed'in kurduğu "Sahip" değil.
 *
 *  ⚠ TABAN NİYE `FIRMA_IZINLERI`, `TUM_IZINLER` DEĞİL — ÖLÇÜLDÜ:
 *  sağlayıcı izinleri (`saglayici: true`) firma rollerine **otomatik
 *  dağıtılmıyor** (`otomatikDagitilacak` onları eliyor). Yani sonradan
 *  doğmuş bir sağlayıcı izni, canlıdaki CEO rolünde OLMAYABİLİR. Taban
 *  `TUM_IZINLER` seçilseydi tam yetkili kullanıcı bile kapıdan geçemez ve
 *  ona açılan ekran 404 dönerdi — kural doğru, teslim edilemez olurdu.
 *
 *  Aynı taban `scripts/yetki-bekci.ts`in ve seed'in sonradan-doğan
 *  dağıtımının tabanıdır; iki yerde iki farklı ölçüt olmaz.
 *
 *  ⚠ SAF: veritabanına gitmez, oturum bilmez. Çağıran izin kümesini verir,
 *  bu gövde yalnız hüküm kurar — böylece bekçi onu ÇAĞIRARAK sınayabiliyor,
 *  kaynak metni tarayarak değil.
 * ============================================================================
 */
export function tamYetkiliMi(izinler: ReadonlySet<string>): boolean {
  /**
   * ⚠ BOŞ KÜME TAM YETKİLİ SAYILMAZ. `every` boş listede `true` döner;
   * taban boşalırsa (liste bozulursa) kapı herkese açılırdı. Taban da
   * ayrıca sınanıyor — "0 buldum" ile "hepsi var" ayrı şeylerdir.
   */
  if (FIRMA_IZINLERI.length === 0) return false;
  return FIRMA_IZINLERI.every((izin) => izinler.has(izin));
}
