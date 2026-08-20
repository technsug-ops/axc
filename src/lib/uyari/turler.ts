/**
 * ============================================================================
 *  UYARI MERKEZİ — TANIMLAR
 * ----------------------------------------------------------------------------
 *  Mimar sözleşmesi 15.08.2026. FAZ 1: yalnız KIRMIZI uyarılar — para kaybı
 *  ya da para riski. "Bilgi için bilgi" yok; her uyarı bir EYLEME götürür.
 *
 *  ── SEVİYE BAŞTAN VAR, İÇERİK DAR ───────────────────────────────────────
 *  `seviye` alanı Faz 1'de hep "kirmizi" dönüyor ama tip üç değeri de
 *  tanıyor. Amber ve nötr katman Faz 2'de doldurulacak; o gün tipi
 *  genişletmek yerine yalnız yeni kural yazmak yetecek. (EUR kararıyla aynı
 *  ilke: mimari genişlemeye hazır, içerik bugüne göre dar.)
 *
 *  ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 *  Uyarı yoksa çan GİZLENMEZ; nötr durur ve "temiz ✓" yazar. Bir şeyin
 *  YOKLUĞUNDAN "sorun yok" sonucu çıkarmak imkânsızdır — kullanıcı onu
 *  "ekran bozuk" diye okur (13.08.2026 dersi, görev kutusunda da geçerli).
 *
 *  ── YETKİ ETİKETİ HER UYARIDA ───────────────────────────────────────────
 *  Finans/kâr uyarıları `satis.kar.gor` ister; operasyonel olan (maliyetsiz
 *  stok) istemez. Depocuya nakit açığı ya da kârsız satış SIZMAZ. Etiket
 *  uyarının kendi tanımında durur ki toplayan taraf unutamasın.
 * ============================================================================
 */

import type { Izin } from "@/lib/yetki/izinler";

export const UYARI_SEVIYELERI = ["kirmizi", "amber", "notr"] as const;
export type UyariSeviyesi = (typeof UYARI_SEVIYELERI)[number];

export const UYARI_ANAHTARLARI = [
  /** Önümüzdeki 14 günde çıkacak para girecekten fazla. */
  "nakitAcigi",
  /** Stokta adedi olan ama birim maliyeti bilinmeyen partili varyantlar. */
  "maliyetsizStok",
  /** `profitStatus` CALCULATED değil — kâr hesaplanamadı. */
  "karHesaplanamayan",
  /** Vadesi geçmiş ve hâlâ ödenmemiş hakediş kalemi. */
  "hakedisGecikti",
  /**
   * CEVAPLANMAMIŞ DESTEK TALEBİ — 16.08.2026, kullanıcı sorusu:
   * "bu talepler bir developer paneline düşmeli, o nerede?"
   *
   * Panel /talepler'in kendisiydi ama ORAYA BAKMAK İÇİN BİR SEBEP YOKTU:
   * yeni talebin geldiğini söyleyen hiçbir işaret bulunmuyordu. Dış
   * bildirim (Telegram/e-posta) Faz 2 kararı; o gelene kadar çan bu
   * boşluğu kapatıyor — geliştirici sisteme girdiğinde görüyor.
   *
   * YALNIZ `destek.yonet` OLANDA çıkar: bildiren kişi kendi talebini zaten
   * biliyor, ona "1 talep var" demek gürültüdür.
   */
  "cevapsizTalep",
  /**
   * YEDEK YAŞI — 17.08.2026, mimar kararı.
   *
   * Canlıda son yedek 13.08'di ve DÖRT GÜN kimse fark etmedi. Otomatik
   * yedek kurulu görünüyordu; durduğunu söyleyen hiçbir işaret yoktu.
   * Sessiz yedeksizlik, para riskinin ta kendisidir.
   */
  "yedekEski",
  /** Hiç yedek yok YA DA yedek durumu okunamadı — ikisi de "elde yedek yok". */
  "yedekYok",

  // ── FAZ 2 ────────────────────────────────────────────────────────────
  /**
   * İMKÂNSIZ DEĞER — verim ya da maliyet payı ölçülen dağılımın dışında.
   * Eşikler ve gerekçesi `uyari/veri-supheli.ts`te; buraya kopyalanmaz.
   */
  "veriSupheli",
  /**
   * ⚠ `supheliOran` KALDIRILDI 20.08.2026 — ölçütü çürüdü.
   *
   * Uyarı "oran %3'ün altındaysa şüpheli" diyordu ve DÖRT DOĞRU KAYDI
   * suçluyordu. Trendyol her Salı komisyon tarifesi yayımlıyor ve fiyat
   * indirimi karşılığı komisyon indiriyor; %2,70 o mekanizmanın sonucu.
   *
   * Eşiği düşürmek çözmez — indirim oranı ilkece istediği kadar aşağı
   * inebilir. Doğru ölçüt "oran o ürünün O FİYATTAKİ diliminde yazan oran
   * mı" ve bu, satış formunda (`oran-uyarisi.ts`) uygulanıyor. GEÇMİŞE
   * dönük dilim-bilinçli denetim ayrı bir iş; BEKLEYENLER → K9.
   *
   * ⚠ YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR: %100 yanlış pozitif üreten
   * bir kutu, rozetin tamamına olan güveni götürür.
   */
  /**
   * STOKTA VAR, HİÇBİR KANALDA KODU YOK. Mal rafta ama hiçbir yerde
   * satışa açık değil.
   *
   * ⚠ HESAP BAZLI BOŞLUK BURAYA GİRMEZ. Ölçüldü 19.08.2026: 46 stoklu
   * varyant × 13 aktif hesap = **499 kodsuz çift**; 13 hesabın 10'unda
   * 46/46 boş, çünkü o hesaplar hiç kullanılmıyor. Çana konsaydı her gün
   * ~500 satır gösterir ve HİÇBİR bilgi taşımazdı. Hesap bazlı boşluk
   * kanal kodları ekranında sütun olarak yaşar.
   */
  "kanalKodsuzStok",
  /**
   * SATIŞA BAĞLANAMAYAN HAKEDİŞ KALEMİ — muafiyetin BEYANI.
   *
   * ⚠ Bu uyarı bir sorun değil, bir SUSKUNLUĞUN gerekçesidir. Geciken
   * hakediş sayımı artık yalnız satışa bağlı kalemleri sayıyor; dışarıda
   * kalanlar burada ADIYLA duruyor. Muafiyeti sessizce uygulasaydık,
   * ₺138K'lık kalem hiçbir yerde görünmeden yok olurdu — "görünmemesi
   * yok olması değildir".
   */
  "hakedisBaglanmamis",
  /**
   * GEÇMİŞTE KAYDEDİLMİŞ ZARARINA SATIŞ.
   *
   * ⚠ ASIL UYARI FORMDA (`satislar/zarar-uyarisi.tsx`) — kaydetmeden önce
   * görmek, kaydettikten sonra öğrenmekten iyidir. Buradaki sayaç GERİYE
   * dönük olanı taşır: form uyarısı yayına girmeden önce kaydedilenler ve
   * bilinçli olarak yine de kaydedilenler.
   *
   * Aynı koşul iki zamanda konuşuyor: orada önleyici, burada muhasebeci.
   */
  "zararinaSatis",
] as const;

export type UyariAnahtari = (typeof UYARI_ANAHTARLARI)[number];

/**
 * Her uyarının gideceği SÜZÜLÜ adres.
 *
 * ⚠ ADRES, SAYIYI ÜRETEN KOŞULUN AYNISINI TAŞIMALI. Görev kutusunda tam
 * bu hata yaşandı (15.08.2026): panel 5 diyor, açılan liste 4 gösteriyordu.
 * Sayı ile listenin ayrışması, panele olan güveni tek seferde bitirir.
 */
export const UYARI_ADRESLERI: Record<UyariAnahtari, string> = {
  nakitAcigi: "/nakit-takvimi",
  maliyetsizStok: "/stok?maliyet=yok",
  karHesaplanamayan: "/satislar?kar=eksik",
  /**
   * SÜZGEÇSİZ /hakedis — çünkü o ekranda "durum" süzgeci YOK.
   * `?durum=geciken` yazmak, olmayan bir süzgece bel bağlamak olurdu
   * (anayasa notu: gösterdiğim link VAR OLAN bir ekrana mı gidiyor).
   * Ekran gecikenleri kendi uyarı kutusunda AYNI sayıyla gösteriyor;
   * kalem listesi Faz 2 işi olarak BEKLEYENLER’e yazıldı.
   */
  hakedisGecikti: "/hakedis",
  cevapsizTalep: "/talepler?durum=ACIK",
  yedekEski: "/ayarlar/disa-aktarma",
  yedekYok: "/ayarlar/disa-aktarma",
  /** Süzgeç eşiği `veri-supheli.ts`ten okunur — listede kopyalanmaz. */
  veriSupheli: "/satislar?veri=supheli",
  /**
   * ⚠ `/kanal-sku?eksik=1` DEĞİL — o süzgeç "oranı eksik KOD" demek,
   * bizim uyarımız "kodu HİÇ OLMAYAN varyant". Oraya götürseydik sayı 2
   * derken liste bambaşka bir kümeyi gösterirdi.
   *
   * _Tasarım raporunda bu adresi "doğrulandı" diye yazmıştım; menü
   * etiketine bakmışım, rotaya değil. Rota `/kanal-sku`, anlamı da farklı._
   */
  kanalKodsuzStok: "/stok?kanal=yok",
  hakedisBaglanmamis: "/hakedis",
  /** Süzgeç ZATEN VAR (`KAR_SUZGECLERI` → "zarar"); yenisi açılmadı. */
  zararinaSatis: "/satislar?kar=zarar",
};

/**
 * ============================================================================
 *  SEVİYE HARİTASI — FAZ 2
 * ----------------------------------------------------------------------------
 *  Faz 1'de `kurallar.ts` içinde `seviye: "kirmizi"` SABİTTİ. Faz 2 üç
 *  seviyeyi de kullanıyor ve seviye artık uyarının KENDİ tanımında duruyor;
 *  kural gövdesi karar vermez, haritadan okur.
 *
 *  ── ÖLÇÜT ───────────────────────────────────────────────────────────────
 *  🔴 KIRMIZI  para kaybı ya da para riski — bekleyemez
 *  🟠 AMBER    veri güvenilirliği riski — rakamlar sessizce yanlış olabilir
 *  ⚪ NÖTR     kaçırılan fırsat — kayıp yok, eylem yine de var
 *
 *  `veriSupheli` niye AMBER: para kaybı DEĞİL, ama kırmızıya yakın —
 *  yanlış maliyet kâr rakamlarını sessizce bozar ve bozukluk kendini
 *  kâr gibi gösterir (OneBlade `₺981` "kâr" yazıyordu).
 * ============================================================================
 */
export const UYARI_SEVIYESI: Record<UyariAnahtari, UyariSeviyesi> = {
  nakitAcigi: "kirmizi",
  maliyetsizStok: "kirmizi",
  karHesaplanamayan: "kirmizi",
  hakedisGecikti: "kirmizi",
  cevapsizTalep: "kirmizi",
  yedekEski: "kirmizi",
  yedekYok: "kirmizi",
  veriSupheli: "amber",
  kanalKodsuzStok: "notr",
  /** Muafiyet beyanı — sorun değil, bilgi. Rozete girmez. */
  hakedisBaglanmamis: "notr",
  /** Para kaybı — Faz 1 ölçütüyle aynı sınıf. */
  zararinaSatis: "kirmizi",
};

/**
 * Uyarıyı görmek için gereken izin. `null` = herkese açık (operasyonel).
 *
 * Maliyetsiz stok OPERASYONEL bir eksiktir — depocu görüp alım girebilir,
 * içinde kâr bilgisi yoktur. Diğer üçü para/kâr taşır.
 */
export const UYARI_IZINLERI: Record<UyariAnahtari, Izin | null> = {
  nakitAcigi: "satis.kar.gor",
  maliyetsizStok: null,
  karHesaplanamayan: "satis.kar.gor",
  hakedisGecikti: "satis.kar.gor",
  cevapsizTalep: "destek.yonet",
  /**
   * Yedek uyarıları dışa aktarma ekranının iznine bağlı: uyarı oraya
   * götürüyor, göremeyeceği bir ekrana gönderen uyarı çıkmaz.
   */
  yedekEski: "veri.aktar",
  yedekYok: "veri.aktar",
  /** İkisi de NET/oran taşıyor — depocuya kâr bilgisi sızmaz. */
  veriSupheli: "satis.kar.gor",
  /** Kanal kodu OPERASYONEL — içinde kâr yok, depocu görüp açabilir. */
  kanalKodsuzStok: null,
  hakedisBaglanmamis: "satis.kar.gor",
  zararinaSatis: "satis.kar.gor",
};

export type Uyari = {
  anahtar: UyariAnahtari;
  seviye: UyariSeviyesi;
  /** Kaç kayıt — 0 ise uyarı YOK sayılır. */
  sayi: number;
  /** Varsa para tutarı (nakit açığı, geciken hakediş). Yoksa null. */
  tutar: number | null;
  paraBirimi: "TRY" | "EUR" | null;
  adres: string;
  izin: Izin | null;
};
