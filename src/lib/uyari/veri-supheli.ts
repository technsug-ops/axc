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

/**
 * ÜST KUYRUK ÖLÇÜMÜ — K141, 03.09.2026.
 *
 * ⚠ ÜSTTEKİ ÖLÇÜM AŞILMADI, TAMAMLANDI. `SUPHE_OLCUMU` (n=40) alt eşikleri
 * doğuran ölçümdür ve yerinde duruyor; bu ölçüm ÜST kuyruğu ölçer (n=5982).
 * İkisi ayrı soruya bakıyor, biri ötekinin yerine geçmez.
 * _(Anayasa: "aşılan rakam sessizce aşılmaz" — burada aşılmıyor, ve
 * aşılmadığı yazıyor.)_
 */
export const UST_KUYRUK_OLCUMU = {
  tarih: "03.09.2026",
  ornek: 5982,
  maliyetPayiP99: 0.892,
  /** Gövdeden sonraki en yüksek MEŞRU değer (zararına satış). */
  mesruEnYuksek: 1.48,
  /** Bozuk kaydın payı. Eşik bu ikisinin ARASINA konuldu. */
  bozukPay: 4.271,
} as const;

/** Verim bu katı aşarsa maliyet şüphelidir. p95 (%154) üstü. */
export const SUPHELI_VERIM = 2.0;

/** Maliyet, satışın bu payının altındaysa şüphelidir. p5 (%44,8) altı. */
export const SUPHELI_MALIYET_PAYI = 0.05;

/**
 * ============================================================================
 *  ÜÇÜNCÜ ÖLÇÜT — MALİYET ÇOK YÜKSEK (K141, 03.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ MODÜL TEK YÖNLÜ KURULMUŞTU VE ONU KİMSE FARK ETMEMİŞTİ. Yukarıdaki
 *  iki ölçüt de maliyetin ÇOK DÜŞÜK olmasını arıyor — çünkü doğdukları
 *  vaka (OneBlade `₺27,16`) öyleydi. Maliyetin ÇOK YÜKSEK olması için
 *  ölçüt YOKTU ve o yön serbest kaldı.
 *  _(Anayasa: "iki yön ayrı sınanır" — orada mutasyon, burada UYARININ
 *  kendisi.)_
 *
 *  ── VAKA ────────────────────────────────────────────────────────────────
 *  Kullanıcı zararına satış listesine bakıp dedi: _"iadenin olmadığı
 *  ürünlerde bu kadar zarar yapmak anlamsız. Bir hesap hatası var."_
 *  Ölçüldü — haklıydı:
 *
 *      11015495705 · axcali1805 · ciro ₺1.789 · maliyet ₺7.641,50  (%427)
 *      11015821765 · axcali1805 · ciro ₺1.789 · maliyet ₺7.641,50  (%427)
 *      "Fresh Kitchen Paslanmaz Çelik 12/15 Cm 2'li Şef Bıçağı"
 *
 *  ⭐ VE AYKIRILIK ZAMANDA DEĞİL, KARDEŞLERİNDE: aynı varyantın AYNI GÜN
 *  aynı tedarikçiden girilmiş dört partisi var —
 *
 *      16.02.2026  ALM-HB-260216-01     ₺537,62
 *      16.02.2026  ALM-HB-260216-03   ₺7.641,50   ← 13 KAT
 *      16.02.2026  ALM-HB-260216-04     ₺562,47
 *      16.02.2026  ALM-HB-260216-05     ₺612,47
 *
 *  Bu, "fiyat zamanla değişir" itirazının KAPSAMI DIŞINDA (anayasa:
 *  _"zaman içindeki fiyat farkı şüphe üretmez"_) — kıyas aynı gün, aynı
 *  tedarikçi, aynı varyant.
 *
 *  ── EŞİK UYDURULMADI: DAĞILIM ÖLÇÜLDÜ VE GEDİĞİNE KONDU ─────────────────
 *  MALİYET / CİRO · n=5982 iptalsiz kalem · 03.09.2026
 *
 *      p50 %67,9 · p90 %80,8 · p95 %84,1 · p99 %89,2   ← GÖVDE
 *      102 · 107 · 107 · 107 · 109 · 114 · 116          ← meşru zararına satış
 *      148                                              ← tek vaka
 *      ────────────── GEDİK ──────────────
 *      427 · 427                                        ← axcali1805
 *
 *  ⚠ `%100` EŞİK OLAMAZ: zararına satmak meşrudur ve 8 kalem tam orada.
 *  Eşik gövdenin bittiği yere değil, **gediğe** konur: `%200`. 148 ile 427
 *  arasında, ikisine de rahat mesafede.
 *  ⭐ Ve `SUPHELI_VERIM = 2.0` ile aynı çarpan: _"sattığının iki katını
 *  ödemişsin"_ — iş kararı değil, veri hatası.
 *
 *  ── ⚠ İKİ SINIR AÇIKÇA BEYAN EDİLİYOR ───────────────────────────────────
 *  ① `SUPHE_PENCERESI_GUN = 90` yüzünden yukarıdaki İKİ VAKA bu uyarıya
 *     DÜŞMEZ (satış 04.03.2026). Ölçüt geleceği korur; geçmişteki 10 kalem
 *     tek seferlik araçla ele alınır.
 *  ② Uyarı bir HÜKÜM değil, bir DAVETTİR. `₺7.641,50` gerçek de olabilir —
 *     doğrulanana kadar DÜZELTİLMEZ. _(Anayasa: "imkânsız görünen değer
 *     önce doğrulanır"; OneBlade hediye kuponuyla alınmıştı ve rakam
 *     gerçekti.)_ Bağımsız kaynak: `ALM-HB-260216-03` alımının HB sipariş
 *     geçmişi.
 * ============================================================================
 */
export const SUPHELI_MALIYET_PAYI_UST = 2.0;

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

export type SupheSebebi =
  | "VERIM_YUKSEK"
  | "MALIYET_DUSUK"
  /** Maliyet cironun 2 katından fazla — K141, 03.09.2026. */
  | "MALIYET_YUKSEK";

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
  /**
   * ⚠ AYNI PAY, ÜST YÖNDEN. Ayrı bir `if` — `else` DEĞİL: bir kalem iki
   * sebebi birden taşıyamaz (biri <%5, öteki >%200) ama ölçütler
   * birbirinin dalı da değildir. `else` yazmak, ileride alt eşik
   * değişince üst ölçütü sessizce sakatlardı.
   */
  if (girdi.ciro > 0 && girdi.maliyet / girdi.ciro > SUPHELI_MALIYET_PAYI_UST) {
    sebepler.push("MALIYET_YUKSEK");
  }
  return sebepler;
}

export function supheliMi(girdi: SupheGirdisi): boolean {
  return supheSebepleri(girdi).length > 0;
}
