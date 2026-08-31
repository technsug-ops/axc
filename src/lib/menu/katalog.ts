import type { KatalogGrubu, KatalogOgesi } from "./duzen";

/**
 * ============================================================================
 *  MENÜ KATALOĞU — HANGİ EKRANLAR VAR (K51, 25.08.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ BU LİSTE KODDA KALIR VE VERİYE DÖNMEZ. Kullanıcı SIRAYI ve GRUBU
 *  değiştirir; hangi ekranların VAR OLDUĞUNU değiştirmez.
 *
 *  Tersi yapılsaydı — katalog da veritabanına konsaydı — koda eklenen yeni
 *  bir ekran menüde HİÇ GÖRÜNMEZDİ ve kimse ayarlara girip eklemeyi
 *  düşünmezdi. Ekran canlıda var, ulaşan yok: `/iadeler`in 13.08.2026'da
 *  sessizce kaybolmasının menü hâli.
 *
 *  ⚠ İKONLAR BURADA DEĞİL. Bu modül SAF olmalı ki bekçi onu içeri alıp
 *  sınayabilsin; ikon bir React bileşenidir ve `app-sidebar.tsx`teki
 *  eşlemede yaşar. Bekçi o eşlemenin TAM olduğunu ayrıca ölçüyor —
 *  ikonsuz bir katalog kalemi ekranda çizilemezdi.
 *
 *  ⚠ `varsayilanGrup` NE İŞE YARAR: kullanıcı hiç düzenleme yapmadıysa VE
 *  yeni bir ekran eklendiğinde geçerli olan yer. Kullanıcının kaydında adı
 *  geçmeyen her kalem buraya düşer — yani hiçbir ekran kaybolamaz.
 * ============================================================================
 */

/** Anahtar → adres. Tek kaynak; ikon eşlemesi ve sözlük buna bağlanır. */
export const MENU_ADRESLERI: Record<string, string> = {
  panel: "/",
  satislar: "/satislar",
  alimlar: "/alimlar",
  /** K112a — panelin "Mal kabul" sayısının açtığı liste (günün girişleri). */
  malKabul: "/mal-kabul",
  urunler: "/urunler",
  stok: "/stok",
  iadeler: "/iadeler",
  paketle: "/paketle",
  okut: "/okut",
  yerlestir: "/yerlestir",
  simulasyon: "/simulasyon",

  giderler: "/giderler",
  kartlar: "/kartlar",
  kartBorcu: "/kart-borcu",
  hakedis: "/hakedis",
  tazminat: "/tazminat",
  nakitTakvimi: "/nakit-takvimi",
  rapor: "/rapor",

  urunKarti: "/kart",
  kanalSkulari: "/kanal-sku",
  kanalHesaplari: "/ayarlar/kanallar",
  envanterDegeri: "/envanter-degeri",

  depoKurulumu: "/ayarlar/depo",
  rafKonumlari: "/ayarlar/konumlar",
  kategoriler: "/ayarlar/kategoriler",
  duzeltmeNedenleri: "/ayarlar/duzeltme-nedenleri",
  tedarikciler: "/ayarlar/tedarikciler",
  kullanicilar: "/ayarlar/kullanicilar",
  roller: "/ayarlar/roller",
  menuDuzeni: "/ayarlar/menu",
  donemler: "/ayarlar/donemler",
  /** K115 — maliyet motoru ve parti seçim kipi; değişim kuralı döneme bağlı. */
  maliyetYontemi: "/ayarlar/maliyet-yontemi",

  veriAktarimi: "/ayarlar/ice-aktarma",
  veriDisari: "/ayarlar/disa-aktarma",
  geriYukleme: "/ayarlar/geri-yukleme",
  gecmisEkstre: "/ayarlar/gecmis-ekstre",
  tarife: "/ayarlar/tarife",
};

/**
 * GRUPLARIN SIRASI — koddan.
 *
 * ⚠ V1'DE GRUP EKLENİP SİLİNMİYOR (kullanıcı kararı: V2). Kayıtta geçmeyen
 * bir grup DÜŞÜRÜLMEZ — katalog kuralının aynısı grup düzleminde de geçerli:
 * koda yeni bir grup eklendiğinde görünmesi gerekir.
 */
export const MENU_GRUPLARI: KatalogGrubu[] = [
  { anahtar: "grupPara" },
  { anahtar: "grupUrunKanal" },
  { anahtar: "grupTanimlar" },
  { anahtar: "grupVeri" },
  /**
   * AYARLAR — SİSTEMİN KENDİSİ (kullanıcı isteği 25.08.2026).
   *
   * ⚠ NİYE AYRI: `Tanımlar` İŞ VERİSİ tanımlar (raf, kategori, tedarikçi —
   * operasyonun konuştuğu şeyler). Kullanıcı/rol/menü düzeni ise sistemin
   * KENDİ ayarları; ikisini aynı başlık altında toplamak "tedarikçi ile
   * menü sırası aynı cins şeydir" demekti.
   *
   * ⚠ VE BU BİR KEŞİF SORUNUYDU: kullanıcı `Menü düzeni` ekranını
   * `Ayarlar` altında aradı, orada öyle bir başlık yoktu ve ekrana
   * ulaşamadı. Menü, aranan yere göre dizilir.
   *
   * ⚠ EN SONDA — sıklık sırası: buraya ayda bir girilir.
   */
  { anahtar: "grupAyarlar" },
];

/**
 * KATALOG — VARSAYILAN YERLERİYLE.
 *
 * ⚠ SIRA BURADA "VARSAYILAN"DIR, HÜKÜM DEĞİL. Kullanıcı 25.08.2026'da
 * günlük listeyi birebir verdi (`Panel · Satış · Alımlar · Ürünler · Stok ·
 * İade · Paketleme · Barkod okut · Fiyat Denemesi`) ve o sıra buraya
 * varsayılan olarak yazıldı — ama artık **ayardan değiştirilebilir** ve
 * kayıt varsa kayıt kazanır.
 */
export const MENU_KATALOGU: KatalogOgesi[] = [
  // ── GÜNLÜK (hep açık) — kullanıcının verdiği sıra ──────────────────────
  { anahtar: "panel", varsayilanGrup: null },
  { anahtar: "satislar", varsayilanGrup: null },
  { anahtar: "alimlar", varsayilanGrup: null },
  { anahtar: "malKabul", varsayilanGrup: null },
  { anahtar: "urunler", varsayilanGrup: null },
  { anahtar: "stok", varsayilanGrup: null },
  { anahtar: "iadeler", varsayilanGrup: null },
  { anahtar: "paketle", varsayilanGrup: null },
  { anahtar: "okut", varsayilanGrup: null },
  /**
   * ⚠ GÜNLÜK GRUPTA — YERLEŞTİRME BİR DEPO İŞİDİR, AYAR DEĞİL.
   * Ayarlar altına konsaydı operatör onu günde onlarca kez ayarlardan açmak
   * zorunda kalırdı; canlıda katalogun yaklaşık yüzde 88'i henüz
   * yerleştirilmemiş durumda ve bu ekran bir süre günlük iş olacak.
   */
  { anahtar: "yerlestir", varsayilanGrup: null },
  { anahtar: "simulasyon", varsayilanGrup: null },

  // ── PARA ────────────────────────────────────────────────────────────────
  { anahtar: "giderler", varsayilanGrup: "grupPara" },
  { anahtar: "kartlar", varsayilanGrup: "grupPara" },
  { anahtar: "kartBorcu", varsayilanGrup: "grupPara" },
  { anahtar: "hakedis", varsayilanGrup: "grupPara" },
  { anahtar: "tazminat", varsayilanGrup: "grupPara" },
  { anahtar: "nakitTakvimi", varsayilanGrup: "grupPara" },
  { anahtar: "rapor", varsayilanGrup: "grupPara" },

  // ── ÜRÜN VE KANAL ───────────────────────────────────────────────────────
  { anahtar: "urunKarti", varsayilanGrup: "grupUrunKanal" },
  { anahtar: "kanalSkulari", varsayilanGrup: "grupUrunKanal" },
  { anahtar: "kanalHesaplari", varsayilanGrup: "grupUrunKanal" },
  { anahtar: "envanterDegeri", varsayilanGrup: "grupUrunKanal" },

  // ── TANIMLAR ────────────────────────────────────────────────────────────
  { anahtar: "depoKurulumu", varsayilanGrup: "grupTanimlar" },
  { anahtar: "rafKonumlari", varsayilanGrup: "grupTanimlar" },
  { anahtar: "kategoriler", varsayilanGrup: "grupTanimlar" },
  { anahtar: "duzeltmeNedenleri", varsayilanGrup: "grupTanimlar" },
  { anahtar: "tedarikciler", varsayilanGrup: "grupTanimlar" },

  // ── VERİ ────────────────────────────────────────────────────────────────
  { anahtar: "veriAktarimi", varsayilanGrup: "grupVeri" },
  { anahtar: "veriDisari", varsayilanGrup: "grupVeri" },
  { anahtar: "geriYukleme", varsayilanGrup: "grupVeri" },
  { anahtar: "gecmisEkstre", varsayilanGrup: "grupVeri" },
  { anahtar: "tarife", varsayilanGrup: "grupVeri" },

  // ── AYARLAR — sistemin kendisi ──────────────────────────────────────────
  { anahtar: "kullanicilar", varsayilanGrup: "grupAyarlar" },
  { anahtar: "roller", varsayilanGrup: "grupAyarlar" },
  /**
   * ⚠ MENÜ DÜZENİ EKRANI KENDİ KATALOĞUNDA — ve bu bir döngü değil,
   * ZORUNLULUK: ekrana ulaşmanın tek yolu menü. Menüden düşürülebilseydi
   * kullanıcı kendi menüsünü kilitleyip bir daha açamazdı.
   * Bekçi bunu ayrıca ölçüyor.
   *
   * ⚠ VE ARTIK `Ayarlar` ALTINDA: kullanıcı onu tam orada aradı ve
   * bulamadı. Bir ekranın nerede olması gerektiğini, onu arayan söyler.
   */
  { anahtar: "menuDuzeni", varsayilanGrup: "grupAyarlar" },
  /**
   * MUHASEBE DÖNEMLERİ (K108) — Ayarlar altında.
   * ⚠ Bir OPERASYON ekranı değil, bir KARAR ekranı: ayda bir kez, dönem
   * bitince açılır. Günlük menüye (Stok · Satışlar) konsaydı her gün
   * görünür ve hiç kullanılmayan bir satır olurdu.
   */
  { anahtar: "donemler", varsayilanGrup: "grupAyarlar" },
  { anahtar: "maliyetYontemi", varsayilanGrup: "grupAyarlar" },
];

/**
 * MENÜDEN DÜŞÜRÜLEMEYECEK EKRANLAR.
 *
 * ⚠ KULLANICI KENDİNİ DIŞARIDA BIRAKAMAZ. Menü düzeni ekranı menüden
 * kaldırılabilseydi, onu kaldıran kullanıcı bir daha oraya ulaşamaz ve
 * düzeni geri alamazdı — geri dönüşü olmayan bir ayar.
 *
 * ⚠ AMA KAPI DEĞİL, ZEMİN: kullanıcı onu istediği gruba taşıyabilir,
 * istediği sıraya koyabilir. Yasak olan tek şey YOK ETMEK — ve V1'de zaten
 * yok etme yolu da yok (her katalog kalemi bir yere düşer). Bu liste,
 * ileride "gizle" özelliği açıldığında hazır dursun diye yazıldı ve bugün
 * bekçi tarafından ölçülüyor.
 */
export const MENUDEN_DUSURULEMEZ = ["panel", "menuDuzeni"] as const;

/**
 * MENÜ DÜZENİ EKRANININ İZNİ.
 *
 * ⚠ YENİ İZİN AÇILMADI — `ayar.yaz` mevcut ve bu ekran tam olarak onun işi.
 * Yeni izin açsaydık `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN` + canlı
 * senkron gerekirdi; unutulan tek satır ekranı GÖRÜNMEZ yapardı
 * (bkz. `/iadeler`, 13.08.2026).
 *
 * ⚠ VE BURADA DURUYOR ÇÜNKÜ `"use server"` DOSYASI SABİT DIŞA AKTARAMAZ.
 * Önce `eylemler.ts` içindeydi; `tsc` ve 51 bekçinin hepsi YEŞİLKEN
 * `npm run build` düştü: _"A 'use server' file can only export async
 * functions, found string."_ Derleme, bekçilerin görmediği bir kapıdır ve
 * bu yüzden zincirin parçasıdır.
 */
export const MENU_IZNI = "ayar.yaz" as const;
