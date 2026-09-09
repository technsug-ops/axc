/**
 * ============================================================================
 *  KARGO TUTARI HANGİ SÜTUNDAN OKUNUR — TEK GÖVDE (K201, 09.09.2026)
 * ----------------------------------------------------------------------------
 *  İki sütun var ve ikisi FARKLI ŞEY söylüyor:
 *
 *      cargoAmount    GERÇEKLEŞEN — kanalın/taşıyıcının FİİLEN kestiği
 *      tahminiKargo   TAHMİN      — tarife × desi ile hesapladığımız
 *
 *  ⭐ SIRA: gerçekleşen varsa O kullanılır; yoksa tahmin. Kaynak
 *  önceliğinin ta kendisi — kanalın kendi kaydı, bizim hesabımızı yener.
 *
 *  ⛔ NİYE TEK GÖVDE: bu sırayı iki yer soruyor (kâr motoru ve ekran) ve
 *  ayrı ayrı yazılsaydı biri tahmini, öteki gerçekleşeni tercih ederdi —
 *  ve ikisi de "doğru" görünürdü. _(Anayasa: "iki yerde iki ölçüt olmaz".)_
 *
 *  ⛔ VE ÜZERİNE YAZMA YOK: hakediş gelince `cargoAmount` DOLAR, tahmin
 *  yerinde KALIR. Bu gövde yalnız HANGİSİNİN OKUNACAĞINI söyler; hiçbir
 *  şey silmez. Tahmin silinseydi "ne kadar yanılmışız" sorusu bir daha
 *  sorulamazdı — ve o soru, tahmini iyileştirmenin tek yolu.
 *
 *  ⚠ TABAN: iki sütun da KDV HARİÇ saklanıyor, dolayısıyla bu gövde de KDV
 *  hariç döndürür. Çağıran taraf `kdvDahilKargo` ile çevirir — iki sütun
 *  AYNI kapıdan geçer, ayrı çevrim yok.
 * ============================================================================
 */

export type KargoKaynakTuru =
  /** Kanalın/taşıyıcının fiilen kestiği — hakedişten ya da faturadan. */
  | "GERCEKLESEN"
  /** Bizim hesabımız — tarife × desi. Ekranda "tahmini" diye görünür. */
  | "TAHMINI"
  /** İkisi de yok — kargo maliyeti BİLİNMİYOR (sıfır DEĞİL). */
  | "YOK";

export type KargoSecimi =
  | { kaynak: "GERCEKLESEN" | "TAHMINI"; tutar: number }
  | { kaynak: "YOK"; tutar: null };

/**
 * ⚠ `0` MEŞRU BİR TUTARDIR ve "yok" ile karıştırılmaz: kargosu bedava olan
 * bir gönderi `0` yazar, bilinmeyen `null` yazar. Bu yüzden ölçüt
 * `!== null` — `> 0` DEĞİL. _(Anayasa: "varsayılan değer alanın anlamından
 * türetilir": `0` = "ölçtüm, sıfır çıktı", `null` = "bilmiyorum".)_
 */
export function kargoSecimi(satis: {
  cargoAmount: number | null;
  tahminiKargo: number | null;
}): KargoSecimi {
  if (satis.cargoAmount !== null) {
    return { kaynak: "GERCEKLESEN", tutar: satis.cargoAmount };
  }
  if (satis.tahminiKargo !== null) {
    return { kaynak: "TAHMINI", tutar: satis.tahminiKargo };
  }
  return { kaynak: "YOK", tutar: null };
}

/**
 * Ekranda gösterilecek mi — ⛔ "tahmini" ETİKETİ ZORUNLU.
 * Tahmini bir rakamı etiketsiz göstermek, sistemin bilmediği bir şeyi
 * biliyormuş gibi sunmaktır. _(Anayasa: "bir sayı etiketiyle taşınır".)_
 */
export function kargoTahminiMi(s: KargoSecimi): boolean {
  return s.kaynak === "TAHMINI";
}
