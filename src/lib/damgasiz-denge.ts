/**
 * ============================================================================
 *  DAMGASIZ HAREKET DENGESİ — SAF KARAR (K118, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE SAF GÖVDE: karar önce canlı veriyi okuyan betiğin İÇİNDE yazılmıştı
 *  ve mutasyonla sınanamadı — bugün canlıda dengesizlik YOK, dolayısıyla
 *  `net < 0` ve `net > 0` dalları hiç çalışmıyor. İki mutasyon (neti sabit
 *  sıfıra çeviren · yön karşılaştırmasını ters çeviren) YEŞİL geçti.
 *
 *  Sebep bekçi eksikliği değil, VERİNİN ayrımı gösterememesiydi. Canlı veriye
 *  kurgu eklenemez; çare kararı saf gövdeye almak ve kurguyla sınamak.
 *  _(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır" +
 *  "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_
 *
 *  ── ⛔ DEĞİŞMEZ ────────────────────────────────────────────────────────
 *  Maliyeti damgalanmamış hareketler VARYANT BAZINDA net sıfır olmalıdır.
 *  Ölçüldü (31.08.2026, canlı): 11 hareket · giriş 19 · çıkış 19 · dört
 *  varyantın DÖRDÜNDE de net 0 — hepsi iptal/geri-alma ve sayım düzeltme
 *  çevrimlerinin AYNA ÇİFTLERİ.
 *
 *  ── ⚠ İKİ YÖN AYRI ŞEYDİR ─────────────────────────────────────────────
 *    net < 0 → damgasız ÇIKIŞ fazla: maliyeti giderleşmemiş mal ÇIKMIŞ
 *    net > 0 → damgasız GİRİŞ fazla: maliyeti bilinmeyen mal GİRMİŞ
 *  İkisi de sorundur ama aynı sorun DEĞİLDİR ve aynı işi istemez. Tek sayıda
 *  toplansaydı biri ötekini götürür ve ikisi de görünmezdi.
 * ============================================================================
 */

export type DamgasizHareket = {
  variantId: string;
  sku: string;
  /** Pozitif = giriş, negatif = çıkış. */
  quantityDelta: number;
};

export type DengeSatiri = {
  sku: string;
  giris: number;
  cikis: number;
  /** giriş − çıkış. */
  net: number;
};

export type DengeSonucu = {
  hareket: number;
  girisAdet: number;
  cikisAdet: number;
  incelenen: number;
  /** net = 0 — ayna çifti, değerlemede boşluk açmaz. */
  temiz: number;
  /** net < 0 — maliyeti giderleşmemiş mal çıkmış. */
  giderlesmemis: DengeSatiri[];
  /** net > 0 — maliyeti bilinmeyen mal girmiş. */
  bilinmeyenGiren: DengeSatiri[];
};

export function damgasizDenge(
  hareketler: readonly DamgasizHareket[],
): DengeSonucu {
  const varyanta = new Map<string, { sku: string; giris: number; cikis: number }>();

  for (const h of hareketler) {
    const v = varyanta.get(h.variantId) ?? { sku: h.sku, giris: 0, cikis: 0 };
    /**
     * SIFIR DELTA BİR HAREKET DEĞİLDİR ve iki kovadan hiçbirine girmez.
     *
     * ⚠ BU DAL MUTASYONLA SINANAMIYOR — VE ÖLÇÜLDÜ. `else if (< 0)` yerine
     * düz `else` yazan mutasyon YEŞİL kalıyor, çünkü `Math.abs(0) === 0`:
     * sıfır delta çıkışa sayılsa bile toplama **hiçbir şey eklemiyor**.
     * Yani ölçüt eksik değil, mutasyon DAVRANIŞSAL OLARAK ETKİSİZ.
     *
     * ⛔ Bunun için sahte bir ölçüt yazıp "6/6" demedim; sınanamayan bir yolu
     * sınanmış saymak testi değil raporu düzeltmek olurdu.
     * _(Anayasa: tetiklenemeyen yol "geçti" sayılmaz.)_
     *
     * Koşul yine de duruyor: NİYETİ okunabilir kılıyor ve delta'nın anlamı
     * değişirse (ör. adet yerine tutar) sessiz bir hataya dönüşmesini
     * zorlaştırıyor.
     */
    if (h.quantityDelta > 0) v.giris += h.quantityDelta;
    else if (h.quantityDelta < 0) v.cikis += Math.abs(h.quantityDelta);
    varyanta.set(h.variantId, v);
  }

  const giderlesmemis: DengeSatiri[] = [];
  const bilinmeyenGiren: DengeSatiri[] = [];
  let temiz = 0;

  for (const v of varyanta.values()) {
    const net = v.giris - v.cikis;
    const satir: DengeSatiri = { sku: v.sku, giris: v.giris, cikis: v.cikis, net };
    if (net === 0) temiz += 1;
    else if (net < 0) giderlesmemis.push(satir);
    else bilinmeyenGiren.push(satir);
  }

  return {
    hareket: hareketler.length,
    girisAdet: hareketler
      .filter((h) => h.quantityDelta > 0)
      .reduce((t, h) => t + h.quantityDelta, 0),
    cikisAdet: Math.abs(
      hareketler
        .filter((h) => h.quantityDelta < 0)
        .reduce((t, h) => t + h.quantityDelta, 0),
    ),
    incelenen: varyanta.size,
    temiz,
    giderlesmemis,
    bilinmeyenGiren,
  };
}

/**
 * Sonuç bir SORUN gösteriyor mu — çıkış kodunun tek kaynağı.
 *
 * ⚠ İKİ LİSTE DE BAKILIR: yalnız birine bakan bir kapı, öteki yönü sessizce
 * geçirirdi. _(Anayasa: "iki yön ayrı sınanır".)_
 */
export function dengeBozukMu(s: DengeSonucu): boolean {
  return s.giderlesmemis.length > 0 || s.bilinmeyenGiren.length > 0;
}
