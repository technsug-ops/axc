/**
 * ============================================================================
 *  KATEGORİ HAZIR LİSTESİ
 * ----------------------------------------------------------------------------
 *  Trendyol'un ANA (üst seviye) kategorileri. Alt kategori YOKTUR — bu liste
 *  pazaryerinin ağacını kopyalamak için değil, boş bir sisteme makul bir
 *  başlangıç vermek içindir.
 *
 *  ÜÇ KURAL:
 *
 *  1. LİSTE KAYIT ÜRETMEZ. Seçim yalnızca formu doldurur; kullanıcı
 *     düzenleyip Kaydet'e basmadan sistemde hiçbir kategori doğmaz.
 *     Seçilmeyen kategori VAR OLMAZ.
 *
 *  2. KDV ORANLARI TİPİK BAŞLANGIÇ DEĞERİDİR, VERGİ TAVSİYESİ DEĞİLDİR.
 *     Oran ürünün kendisine göre değişir; kullanıcı kendi ürününün gerçek
 *     oranını bilir ya da muhasebecisine sorar. Oranların karışık olduğu
 *     kategorilerde `karisikOran` doludur ve ekranda ayrıca uyarılır.
 *
 *  3. KODLAR ÇAKIŞMAZ. Kod önerisi normalde `kategoriKoduOner()` ile
 *     addan türer; türeyen kod listedeki başka bir kodla ya da kurulumla
 *     gelen kategorilerle (GEN/IND/SUP) çakışıyorsa ELLE farklı verilir ve
 *     `kodNedeni` alanında gerekçesi yazar. `kimlik:dogrula` bu listedeki
 *     her kodun tekilliğini her koşumda sınar.
 * ============================================================================
 */

export type KategoriOnerisi = {
  ad: string;
  /** 2-4 harf kimlik kısaltması — SKU'nun ilk parçası. */
  kod: string;
  /** Tipik KDV oranı (yüzde). Başlangıç değeri; formda değiştirilebilir. */
  kdv: number;
  /** Oran ürüne göre değişiyorsa gerçek aralık — ekranda uyarı çıkar. */
  karisikOran?: string;
  /** Kod addan türeyenden FARKLIYSA sebebi. Sessiz sapma olmasın. */
  kodNedeni?: string;
};

/**
 * Kurulum kategorilerinin kodları. Hazır liste bunlarla çakışamaz.
 * (Genel, İndirimli, Süper İndirimli — seed ile gelirler.)
 */
export const KURULUM_KODLARI = ["GEN", "IND", "SUP"] as const;

export const KATEGORI_ONERILERI: KategoriOnerisi[] = [
  // --- elektronik ---
  { ad: "Elektronik", kod: "ELE", kdv: 20 },
  { ad: "Bilgisayar & Tablet", kod: "BIL", kdv: 20 },
  { ad: "Telefon & Aksesuar", kod: "TEL", kdv: 20 },
  { ad: "Fotoğraf & Kamera", kod: "FOT", kdv: 20 },
  {
    ad: "Oyun & Konsol",
    kod: "KNS",
    kdv: 20,
    kodNedeni: "addan OYU türerdi; Oyuncak & Hobi ile çakışıyor",
  },

  // --- ev ---
  { ad: "Beyaz Eşya", kod: "BEY", kdv: 20 },
  { ad: "Küçük Ev Aletleri", kod: "KUC", kdv: 20 },
  { ad: "Isıtma & Soğutma", kod: "ISI", kdv: 20 },
  { ad: "Aydınlatma", kod: "AYD", kdv: 20 },
  { ad: "Ev & Yaşam", kod: "EVY", kdv: 20 },
  { ad: "Ev Tekstili", kod: "EVT", kdv: 20 },
  { ad: "Mutfak Gereçleri", kod: "MUT", kdv: 20 },
  { ad: "Mobilya", kod: "MOB", kdv: 20 },

  // --- yapı / araç ---
  { ad: "Yapı Market & Bahçe", kod: "YAP", kdv: 20 },
  { ad: "Hırdavat & El Aletleri", kod: "HIR", kdv: 20 },
  { ad: "Otomotiv & Motosiklet", kod: "OTO", kdv: 20 },

  // --- moda ---
  {
    ad: "Moda & Giyim",
    kod: "GYM",
    kdv: 10,
    kodNedeni: "addan MOD türerdi; GYM operasyonda konuşulan kısaltma",
  },
  { ad: "Ayakkabı & Çanta", kod: "AYA", kdv: 10 },
  { ad: "Takı & Mücevher", kod: "TAK", kdv: 20 },
  { ad: "Saat & Aksesuar", kod: "SAA", kdv: 20 },

  // --- kişisel ---
  { ad: "Kozmetik & Kişisel Bakım", kod: "KOZ", kdv: 20 },
  {
    ad: "Sağlık & Medikal",
    kod: "SAG",
    kdv: 20,
    karisikOran: "%10-20",
  },
  {
    ad: "Anne & Bebek",
    kod: "BEB",
    kdv: 20,
    kodNedeni: "addan ANN türerdi; BEB operasyonda daha anlaşılır",
  },

  // --- hobi ---
  { ad: "Oyuncak & Hobi", kod: "OYU", kdv: 20 },
  { ad: "Spor & Outdoor", kod: "SPO", kdv: 20 },
  { ad: "Kamp & Doğa", kod: "KAM", kdv: 20 },
  { ad: "Kitap & Kırtasiye", kod: "KIT", kdv: 20, karisikOran: "%0-20" },
  { ad: "Müzik & Enstrüman", kod: "MUZ", kdv: 20 },

  // --- tüketim ---
  {
    ad: "Süpermarket",
    kod: "SMK",
    kdv: 20,
    karisikOran: "%1-20",
    kodNedeni: "addan SUP türerdi; kurulumdaki Süper İndirimli ile çakışıyor",
  },
  { ad: "Temizlik & Sarf", kod: "TEM", kdv: 20 },
  { ad: "Pet Shop", kod: "PET", kdv: 20 },

  // --- diğer ---
  { ad: "Dijital Ürünler", kod: "DIJ", kdv: 20 },
  { ad: "Antika & Koleksiyon", kod: "ANT", kdv: 20 },
];
