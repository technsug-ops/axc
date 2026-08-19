/**
 * ============================================================================
 *  İMKÂNSIZ DEĞER SİNYALİ — VERİ GÜVENİLİRLİĞİ
 * ----------------------------------------------------------------------------
 *  Mimar kararı 19.08.2026, "görünen ≠ görülen" dersinin kalıcı ilacı.
 *
 *  ── VAKA ────────────────────────────────────────────────────────────────
 *  Philips OneBlade'in birim maliyeti `₺27,16` girilmişti (gerçeği bin
 *  liralar mertebesinde). Rakam GÜNLERCE iptal önizleme ekranında yazılı
 *  durdu; kimse görmedi. NET-2 `₺981` KÂR gösteriyordu, oysa satış büyük
 *  olasılıkla ZARARINAYDI. Hata ancak bekleme maliyeti ölçümünde, basit
 *  ortalamayı `%116,7`'ye çektiği için fark edildi.
 *
 *  **Ekranda olmak fark edilmek değildir.** Bir insanın dikkatine bel
 *  bağlayan doğrulama, doğrulama değildir — imkânsız değerler kendini
 *  işaretlemelidir.
 *
 *  ── EŞİKLER UYDURULMADI, ÖLÇÜLDÜ ────────────────────────────────────────
 *  Canlı dağılım (n=40 iptalsiz kalem, 19.08.2026):
 *
 *      VERİM (NET-2 ÷ maliyet)
 *        min %1 · p25 %15 · ortanca %23 · p75 %33 · p90 %60
 *        **p95 %154** · max %3613
 *
 *      MALİYET / SATIŞ PAYI
 *        **p5 %44,8** · p10 %51,8 · ortanca %66 · max %91 · min %1,9
 *
 *  ⚠ EŞİK SEÇİMİ p95/p5'E GÖRE YAPILDI, YUVARLAK SAYIYA GÖRE DEĞİL.
 *  `%100` denenseydi meşru bir kalemi (Anker 322 kablosu, verim %154)
 *  yakalar ve ilk gün yanlış alarm verirdi. `%200` p95'in belirgin
 *  üstünde ve yalnız bozuk kaydı buluyor.
 *
 *  ── İKİ ÖLÇÜT, "VEYA" İLE ───────────────────────────────────────────────
 *  Biri kâr üzerinden (verim), öteki fiyat üzerinden (maliyet payı) bakar.
 *  ⚠ Bu bağımsızlık DARDIR: ikisi de aynı maliyet alanından besleniyor.
 *  Aynı satırda buluşmaları teyit değil TUTARLILIK'tır — kaynak ayrılığı
 *  yok. (_"Bağımsızlık kaynağın ayrılığıyla ölçülür" dersi._)
 *
 *  ── SAYIYI ÜRETEN KOŞUL, LİSTEYİ ÜRETEN KOŞULLA AYNI ────────────────────
 *  `/satislar?veri=supheli` süzgeci bu eşikleri BURADAN okur, kopyalamaz.
 *  Görev kutusunda tam bu hata yaşanmıştı: panel 5 diyor, liste 4
 *  gösteriyordu.
 * ============================================================================
 */

/**
 * ⚠ EŞİKLER KAYNAĞIYLA ANILIR — ölçüm tarihi ve tabanı burada yazılı
 * durur ki, bir yıl sonra bakan biri bunların nereden geldiğini
 * sormak zorunda kalmasın.
 */
export const SUPHE_OLCUMU = {
  tarih: "19.08.2026",
  ornek: 40,
  verimP95: 1.54,
  maliyetPayiP5: 0.448,
} as const;

/** Verim bu katı aşarsa maliyet şüphelidir. p95 (%154) üstü. */
export const SUPHELI_VERIM = 2.0;

/** Maliyet, satışın bu payının altındaysa şüphelidir. p5 (%44,8) altı. */
export const SUPHELI_MALIYET_PAYI = 0.05;

/**
 * ⚠ TARAMA PENCERESİ — sinyalin işi YENİ giriş hatasını erken yakalamak.
 * Maliyet sütun olarak saklanmıyor (ledger'dan çözülüyor), dolayısıyla
 * ölçüm hareketleri yüklemek zorunda ve çan her sayfada çiziliyor.
 * Sınırsız tarama 150 paket/gün hedefinde on binlerce satır okurdu.
 *
 * Bedeli açıkça yazılı: bundan eskisini bu uyarı GÖRMEZ. Geçmişin
 * taranması tek seferlik araçların işi.
 */
export const SUPHE_PENCERESI_GUN = 90;

export type SupheGirdisi = {
  /** Kalemin NET-2'si; hesaplanamadıysa null. */
  net2: number | null;
  /** Kaleme bağlı hareketlerden çözülen toplam maliyet; bilinmiyorsa null. */
  maliyet: number | null;
  /** Kalemin satış tutarı (birim fiyat × adet). */
  ciro: number;
};

export type SupheSebebi = "VERIM_YUKSEK" | "MALIYET_DUSUK";

/**
 * Kalem şüpheli mi — ve NEDEN.
 *
 * ⚠ SEBEP DE DÖNER, YALNIZ "EVET" DEĞİL. Kullanıcıya "bu kayıt şüpheli"
 * demek eyleme götürmez; "maliyet satışın %2'si" götürür. Sebepsiz uyarı,
 * uyarı değil huzursuzluktur.
 *
 * ⚠ EKSİK VERİ ŞÜPHE DEĞİLDİR. Maliyeti ya da NET'i bilinmeyen kalem
 * BURADA sayılmaz — onun kendi uyarısı var (`maliyetsizStok`,
 * `karHesaplanamayan`). İki uyarının aynı kaydı iki kez saydırması,
 * rozeti şişirir ve ikisine de güveni azaltır.
 */
export function supheSebepleri(girdi: SupheGirdisi): SupheSebebi[] {
  const sebepler: SupheSebebi[] = [];
  if (girdi.net2 === null || girdi.maliyet === null) return sebepler;
  /** Sıfır ya da eksi maliyet bölmeye girmez — o ayrı bir bozukluktur. */
  if (girdi.maliyet <= 0) return sebepler;

  if (girdi.net2 / girdi.maliyet > SUPHELI_VERIM) sebepler.push("VERIM_YUKSEK");
  /** Ciro sıfırsa pay hesaplanamaz; bölme yapılmaz. */
  if (girdi.ciro > 0 && girdi.maliyet / girdi.ciro < SUPHELI_MALIYET_PAYI) {
    sebepler.push("MALIYET_DUSUK");
  }
  return sebepler;
}

export function supheliMi(girdi: SupheGirdisi): boolean {
  return supheSebepleri(girdi).length > 0;
}
