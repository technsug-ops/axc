/**
 * ============================================================================
 *  N11 ÖZEL KARGO KAMPANYASI TARİFESİ — KANALIN KENDİ BELGESİ (K200)
 * ----------------------------------------------------------------------------
 *  KAYNAK: https://www.n11.com/kampanyalar/ozel-kargo-kampanyasi
 *  OKUNDU: 09.09.2026 (Halil'in ekran görüntüleri)
 *  ROZET:  OLCULDU — kaynak önceliğinde 1. basamak (kanalın kendi belgesi).
 *
 *  ⛔ TABAN: **KDV HARİÇ.** Sayfa birebir şöyle diyor:
 *      "Fiyatlara %20 KDV ve Posta Hizmet Bedeli dahil değildir."
 *  `CargoTariff.amount` da KDV hariç saklanıyor → taban AYNI, çevrim YOK.
 *  _(Anayasa: "para rakamı tabanıyla birlikte yazılır".)_
 *
 *  ⚠ VE SAYFANIN SÖYLEDİĞİ AMA BU TABLONUN TAŞIMADIĞI KALEMLER — BEYAN:
 *    · **Posta Hizmet Bedeli %2,35** (yasal; 30 kg / 300 dm³ altı gönderi)
 *    · Yurtiçi'nde gönderi başına **0,60 TL + KDV SMS** ücreti
 *    · 300 TL altı "Şartlı Kargo" siparişlerde SEPET ARALIĞINA göre SABİT
 *      ücret (ayrı tablo — buraya girmedi)
 *    · Başarısız teslimat ve ağır kargo ek maliyetleri
 *    · CEVA / Horoz'da "minimum taşıma bedeli" mantığı (desi×birim fiyat
 *      minimumun altındaysa minimum faturalanır) — o üç firma bu tabloda YOK
 *  Bu kalemler tabloya KARIŞTIRILMADI: tablo neyse o. Karıştırılsaydı
 *  rakamın tabanı bir daha geri kazanılamazdı.
 *
 *  ⚠ KAPSAM 1-45 DESİ. Sayfa 56'ya kadar sürüyor; 45'te kesildi çünkü
 *  (a) mimar kapsamı 1-45 diye verdi, (b) 55. satırın DHL hücresi ekran
 *  görüntüsünde bir kutunun altında kalıyordu ve OKUNAMADI. Okunamayanı
 *  tahmin etmek, tablonun tamamına olan güveni harcardı.
 *
 *  ⚠ "Dosya" SATIRI 1 DESİ İLE AYNI (sayfada birebir aynı değerler) ve ayrı
 *  bir kavram olduğu için buraya ALINMADI — bizim desi eksenimizde karşılığı
 *  yok, uydurma bir 0. basamak açmak gerekirdi.
 * ============================================================================
 */

/** Sayfadaki sütun sırası — tablo bu sırayla okundu. */
export const N11_FIRMALARI = [
  "Aras Kargo",
  "Sürat Kargo",
  "PTT Kargo",
  "Yurtiçi Kargo",
  "Kolay Gelsin",
  "DHL e-Commerce",
] as const;

export type N11Firmasi = (typeof N11_FIRMALARI)[number];

/**
 * desi → [Aras, Sürat, PTT, Yurtiçi, KolayGelsin, DHL] · KDV HARİÇ ₺
 *
 * ⚠ AKTARIM HATASI EN SİNSİ HATADIR: rakam makul görünür, hiçbir şey hata
 * vermez ve yanlış maliyet sessizce NET'e girer. Bu yüzden
 * `n11-tarife:dogrula` tabloyu YAPISAL olarak sınıyor (artan mı, sütun
 * sayısı, boşluk) — ve 40-43 satırları İKİ AYRI ekran görüntüsünde
 * göründüğü için aktarım orada çapraz doğrulandı.
 */
export const N11_TARIFESI: Record<number, readonly number[]> = {
  1: [90.5, 95.32, 81.82, 117.84, 98.39, 99.16],
  2: [92.14, 95.32, 81.82, 120.83, 98.39, 99.16],
  3: [102.81, 107.52, 101.29, 128.5, 108.89, 112.35],
  4: [113.82, 117.25, 102.88, 131.04, 120.44, 126.03],
  5: [122.05, 121.56, 102.88, 146.32, 129.89, 137.75],
  6: [132.97, 133.13, 106.25, 151.43, 140.39, 151.43],
  7: [141.02, 142.44, 112.16, 171.1, 149.84, 160.22],
  8: [150.45, 151.1, 123.97, 178.31, 160.34, 170.0],
  9: [159.07, 160.55, 135.78, 188.91, 169.79, 181.72],
  10: [170.09, 169.74, 153.48, 197.37, 181.34, 191.49],
  11: [179.27, 183.45, 161.34, 210.2, 191.83, 201.26],
  12: [185.87, 191.17, 169.22, 223.36, 203.39, 212.01],
  13: [194.3, 198.89, 177.09, 230.64, 213.89, 221.78],
  14: [201.8, 206.61, 184.95, 248.87, 225.44, 231.55],
  15: [209.24, 214.2, 192.83, 262.11, 236.99, 246.2],
  16: [220.97, 222.19, 200.7, 269.32, 248.53, 283.33],
  17: [232.63, 233.91, 208.57, 284.17, 260.09, 297.01],
  18: [244.37, 245.62, 216.44, 298.72, 271.64, 316.55],
  19: [256.06, 257.46, 224.31, 305.07, 283.19, 341.95],
  20: [261.08, 269.18, 232.18, 311.44, 294.73, 359.54],
  21: [274.24, 281.3, 240.05, 329.33, 306.29, 373.22],
  22: [286.25, 292.08, 245.96, 343.78, 317.84, 381.04],
  23: [298.24, 302.86, 253.83, 352.24, 329.39, 408.39],
  24: [308.9, 313.64, 261.7, 359.05, 340.94, 433.8],
  25: [319.5, 324.43, 269.57, 383.82, 352.49, 460.18],
  26: [334.36, 334.81, 277.45, 419.55, 364.04, 486.56],
  27: [347.93, 345.33, 285.31, 439.02, 375.59, 512.94],
  28: [360.06, 355.71, 293.19, 459.06, 387.14, 539.32],
  29: [373.97, 366.09, 301.05, 474.79, 398.69, 565.7],
  30: [384.58, 376.48, 308.92, 479.5, 410.24, 593.05],
  31: [397.15, 450.37, 432.88, 493.27, 421.74, 628.21],
  32: [409.72, 463.41, 442.72, 507.08, 433.24, 663.37],
  33: [422.29, 476.59, 452.56, 520.82, 444.74, 698.53],
  34: [434.86, 489.63, 464.36, 534.59, 456.24, 733.69],
  35: [447.43, 502.82, 474.21, 548.39, 467.74, 768.85],
  36: [460.0, 515.86, 484.03, 562.17, 479.24, 804.01],
  37: [472.57, 529.04, 495.84, 576.0, 490.74, 839.17],
  38: [485.14, 542.09, 505.68, 589.75, 502.24, 874.33],
  39: [497.71, 555.27, 515.52, 603.57, 513.74, 909.49],
  40: [510.28, 574.44, 527.32, 617.34, 525.24, 944.65],
  41: [522.85, 587.75, 537.17, 631.13, 536.74, 979.81],
  42: [535.42, 600.93, 547.0, 644.93, 548.24, 1014.97],
  43: [547.99, 614.24, 558.8, 658.61, 559.74, 1050.13],
  44: [560.56, 627.42, 568.65, 672.43, 571.24, 1085.29],
  45: [573.13, 640.74, 578.48, 686.2, 582.74, 1120.45],
};

/**
 * ALTI FİRMANIN ORTALAMASI — mimar kararı 09.09.2026: _"6 firma
 * ORTALAMASI, desi bazında (genele göre — tek firma değil)."_
 *
 * ⛔ NİYE ORTALAMA VE NİYE TEK FİRMA DEĞİL: N11'de kargo firmasını satışta
 * BİZ seçmiyoruz, alıcı/kanal seçiyor. Tek firmanın tarifesini kullanmak,
 * o firma seçilmediğinde sistematik olarak yanlış olurdu — ve hangi yönde
 * yanlış olacağı firmadan firmaya değişir (DHL 45 desi'de Aras'ın iki
 * katı). Ortalama, seçim bilinmediğinde en az taraflı tahmindir.
 *
 * ⚠ VE BU BİR TAHMİNDİR, ÖLÇÜM DEĞİL — çağıran taraf bunu ekranda söyler.
 */
export function n11OrtalamaTarife(desi: number): number | null {
  const satir = N11_TARIFESI[desi];
  if (satir === undefined) return null;
  const toplam = satir.reduce((t, x) => t + x, 0);
  /** ⚠ Kuruşa yuvarlanır — birim seçimi, tolerans değil. */
  return Math.round((toplam / satir.length) * 100) / 100;
}

/**
 * Tarifenin kapsadığı en büyük desi. ⛔ ÜSTÜ İÇİN HÜKÜM VERİLMEZ:
 * `n11OrtalamaTarife` `null` döner ve çağıran "hesaplanamadı" der.
 * Son satırı uzatmak (45'in fiyatını 60 desiye uygulamak) sessizce yanlış
 * bir maliyet üretirdi. _(Anayasa: "kapsayan pencere yoksa hüküm verilmez".)_
 */
export const N11_TARIFE_TAVANI = 45;

/**
 * ============================================================================
 *  POSTA HİZMET BEDELİ — %2,35 · KANALIN KENDİ KESİNTİSİYLE DOĞRULANDI
 * ----------------------------------------------------------------------------
 *  Sayfa iki şey söylüyor:
 *    "Fiyatlara %20 KDV ve Posta Hizmet Bedeli dahil değildir."
 *    "Posta Hizmet Bedeli %2,35 olarak belirlenmiştir."
 *
 *  ⭐ VE BU BİR BEYAN OLARAK KALMADI — KANALIN KENDİ KESİNTİ KAYDIYLA
 *  ÖLÇÜLDÜ (n11 satıcı paneli, 10 sipariş, 09.09.2026):
 *
 *      desi  kesilen    tarife(Aras)   oran
 *         9   195,37        159,07    1,2282
 *         2   113,17         92,14    1,2282
 *        11   220,18        179,27    1,2282
 *         3   126,28        102,81    1,2283
 *         1   111,16         90,50    1,2283
 *
 *      1,20 × 1,0235 = 1,2282   ← KDV × posta hizmet bedeli
 *
 *  ⭐ BU ÖLÇÜM AYNI ANDA AKTARIMI DA DOĞRULADI: beş farklı desi basamağında
 *  tarife satırı kanalın kestiği tutarla KURUŞUNA tuttu. Bekçi "yapısal
 *  olarak bozulmamış" diyordu; bu, "kaynağın kendisiyle doğrulandı"dır.
 *  _(Anayasa: "bağımsızlık kaynağın ayrılığıyla ölçülür".)_
 *
 *  ⚠ VE TARİFENİN SÜRÜMÜ VAR — ÖLÇÜLDÜ: aynı listedeki İKİ TEMMUZ satırı
 *  (03 ve 09 Tem) 3 desi için 119,12 kesilmiş, oran 1,1586. Bu, ESKİ bir
 *  tarifedir; 25 Temmuz'daki satır zaten yeni orana geçmiş. Yani tarife
 *  09–25 Temmuz arasında değişti.
 *  ⛔ BU TABLO **BUGÜNKÜ** TARİFEDİR ve geçmişe uygulanmaz — temmuz öncesi
 *  bir siparişin maliyetini bununla hesaplamak, o günkü gerçeği bugünün
 *  gözlüğüyle yazmak olurdu.
 *  _(Anayasa: "aynı veri, farklı soruya farklı pencereden bakar".)_
 * ============================================================================
 */
export const N11_POSTA_HIZMET_BEDELI = 0.0235;

/** Kanalın kesinti adı → tablodaki sütun. Tanınmayan ad `null` döner. */
export function n11FirmaSutunu(kanalAdi: string | null): number | null {
  if (kanalAdi === null) return null;
  const a = kanalAdi.toLocaleLowerCase("tr");
  if (a.includes("aras")) return 0;
  if (a.includes("sürat") || a.includes("surat")) return 1;
  if (a.includes("ptt")) return 2;
  if (a.includes("yurtiçi") || a.includes("yurtici")) return 3;
  if (a.includes("kolay")) return 4;
  if (a.includes("dhl")) return 5;
  return null;
}

export type N11MaliyetSonucu =
  | {
      tamam: true;
      /** KDV HARİÇ — `Sale.cargoAmount` ile aynı taban. */
      tutar: number;
      /** Tarife satırı (posta bedeli EKLENMEDEN) — teşhis için. */
      tarife: number;
      /** Hangi firma kullanıldı; `null` = altı firmanın ORTALAMASI. */
      firma: N11Firmasi | null;
    }
  | { tamam: false; kod: "DESI_YOK" | "TAVAN_DISI" };

/**
 * N11 KARGO MALİYETİ — TAHMİNİ.
 *
 * ⛔ BU BİR TAHMİNDİR, KANALIN KESTİĞİ TUTAR DEĞİL. Gerçek kesinti
 * hakedişte gelir; bu gövde onu BEKLERKEN kullanılacak rakamı üretir ve
 * çağıran taraf ekranda "tahmini" diye söyler.
 *
 * ⭐ FİRMA BASAMAĞI: kanal firmayı söylüyorsa (n11 `cargoProviderName`)
 * O firmanın tarifesi kullanılır; söylemiyorsa altı firmanın ORTALAMASI.
 * Ölçüldü (09.09.2026, n=10): N11 gönderilerimizin ONUNUN DA firması Aras
 * ve sabit ortalama NET'i sistematik olarak **%7,5 karamsar** gösteriyordu.
 * Ortalama bilmediğimiz durumun cevabıdır, bildiğimiz durumun değil.
 */
export function n11KargoMaliyeti(g: {
  desi: number | null;
  kanalFirmasi: string | null;
}): N11MaliyetSonucu {
  if (g.desi === null || !Number.isFinite(g.desi) || g.desi <= 0) {
    return { tamam: false, kod: "DESI_YOK" };
  }
  /** ⚠ Tarife TAM desi adımında; kesirli desi YUKARI yuvarlanır. */
  const adim = Math.ceil(g.desi - 0.0001);
  const satir = N11_TARIFESI[adim];
  if (satir === undefined) return { tamam: false, kod: "TAVAN_DISI" };

  const sutun = n11FirmaSutunu(g.kanalFirmasi);
  const tarife = sutun === null ? n11OrtalamaTarife(adim)! : satir[sutun];
  /** ⛔ POSTA HİZMET BEDELİ EKLENİR — kanalın kesintisiyle doğrulandı. */
  const tutar = Math.round(tarife * (1 + N11_POSTA_HIZMET_BEDELI) * 100) / 100;
  return {
    tamam: true,
    tutar,
    tarife,
    firma: sutun === null ? null : N11_FIRMALARI[sutun],
  };
}
