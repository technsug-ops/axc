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
 * ============================================================================
 *  DESİ HANGİ KAYNAKTAN — ÜÇ BASAMAK, HER BİRİ ÖNCEKİNDEN ZAYIF (K201)
 * ----------------------------------------------------------------------------
 *  _Mimar kararı 09.09.2026, ve ARA BASAMAK ÖLÇÜMLE EKLENDİ:_
 *
 *      TARTIM     kanalKargoDesi — taşıyıcının FİİLEN tarttığı
 *      TAHMIN     cargoDesi      — bizim ürüne-özel tahminimiz (Σ ürün desi)
 *      KURESEL    ortanca        — "ürün hakkında hiçbir şey bilinmiyor"
 *
 *  ⛔ ARA BASAMAĞI ÖLÇÜM YAKALADI: ilk sıra "tartım → küresel ortalama"
 *  idi. Ölçüm (09.09.2026) gösterdi ki N11 satışlarının ürünlerinden
 *  **0/10**'u TY/HB'de tartılmış — yani öğrenme basamağı hiç devreye
 *  girmiyor ve her tahmin doğrudan KÜRESEL bir sayıya düşüyordu. Oysa aynı
 *  satışların **10/10**'unda ürüne-özel `cargoDesi` DOLU.
 *  ⭐ Küresel sayı EN SONA konur: "ürün hakkında hiçbir şey bilmiyorum"
 *  bir SON ÇAREDİR, ilk tercih değil.
 * ============================================================================
 */

/**
 * KÜRESEL SON ÇARE — ORTANCA, ORTALAMA DEĞİL.
 *
 * 📏 ÖLÇÜM (09.09.2026, n=57 tartılmış satış):
 *     min 1 · ortanca 3 · ORTALAMA 4,04 · max 19 · oran 1,345
 *
 * ⛔ DAĞILIM KUYRUKLU VE SEÇİM SONUCU DEĞİŞTİRİYOR — bu yüzden seçim
 * SESSİZCE yapılmadı, kullanıcıya soruldu ve ORTANCA seçildi: tek bir
 * 19 desilik gönderi tipik tahmini şişirmesin.
 * _(Anayasa: "türetilmiş bir rakam, seçimden bağımsız mı diye sorulmadan
 * ekrana çıkmaz" — ve "eşiği soruyu soran koyamaz".)_
 *
 * ⚠ ÖRNEKLEM BÜYÜYÜNCE YENİDEN ÖLÇÜLÜR. Bugün n=57 ve taban `kanalKargoDesi`
 * ile birlikte büyüyor. Ölçen: `npm run canli:kargo-kapsam` → ⑥.
 */
export const KURESEL_DESI_ORTANCASI = 3;

export type DesiKaynagi = "TARTIM" | "TAHMIN" | "KURESEL";

export function desiSecimi(satis: {
  kanalKargoDesi: number | null;
  cargoDesi: number | null;
}): { desi: number; kaynak: DesiKaynagi } {
  /** ⚠ `> 0` ölçütü: sıfır desi bir ölçüm değil, bozuk bir kayıttır. */
  if (satis.kanalKargoDesi !== null && satis.kanalKargoDesi > 0) {
    return { desi: satis.kanalKargoDesi, kaynak: "TARTIM" };
  }
  if (satis.cargoDesi !== null && satis.cargoDesi > 0) {
    return { desi: satis.cargoDesi, kaynak: "TAHMIN" };
  }
  return { desi: KURESEL_DESI_ORTANCASI, kaynak: "KURESEL" };
}

/**
 * Ekranda gösterilecek mi — ⛔ "tahmini" ETİKETİ ZORUNLU.
 * Tahmini bir rakamı etiketsiz göstermek, sistemin bilmediği bir şeyi
 * biliyormuş gibi sunmaktır. _(Anayasa: "bir sayı etiketiyle taşınır".)_
 */
export function kargoTahminiMi(s: KargoSecimi): boolean {
  return s.kaynak === "TAHMINI";
}
