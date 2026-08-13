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
  "iade.yaz",
  "elkitabi.gor",
];

/** Seed'lenecek roller. "Boş rol" açılmaz — ihtiyaç doğunca ekrandan. */
export const SAHIP_ROLU = "Sahip";
export const OPERASYON_ROLU = "Operasyon";
