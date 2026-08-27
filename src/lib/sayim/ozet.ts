import { satirHali, type SatirGirdisi, type SatirHali } from "@/lib/sayim/kova";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM — KAPANIŞ ÖZETİ (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  ⛔ DÖRT SAYI AYRI BASILIR (anayasa: "boş sonuç ile temiz sonucu ayırt
 *  edemeyen denetim, denetim değildir"):
 *
 *      kapsam · SAYILDI · SAPAN · SAYILMADI
 *
 *  Dördüncüsü sıfırdan büyükse sayımın kapsamı da o kadar dardır ve bu
 *  EKRANDA YAZAR. "202 varyantı saydım" ile "202'nin 165'ini saydım" aynı
 *  cümle değildir.
 *
 *  ⛔ VE `fark` DİYE TEK BİR ALAN YOKTUR. Fazla ile eksik ayrı taşınır;
 *  gerekçesi `kova.ts` başlığında. Bu tipe net bir `fark` alanı eklemek,
 *  iki farklı işi (satış kaydı gir / maliyet kararı ver) tek sayıya ezmek
 *  olur.
 * ============================================================================
 */

export type SayimOzeti = {
  /** Oturum açılışında kapsamda olan satır sayısı. */
  kapsam: number;
  /**
   * ① incelendi — KAPSAM İÇİ ve `sayilanAdet` dolu satır (0 dahil: rafta yok
   * da bir ölçümdür).
   *
   * ⛔ KAPSAM DIŞI BULUNANLAR BURAYA GİRMEZ — ve niye (canlı bulgu
   * 28.08.2026): giriyordu ve ekranda **`sayıldı 231 > kapsam 204`** çıktı.
   * Dört sayı bir KAPSAM ÖLÇÜSÜDÜR; içine kapsam dışı bir bulgu karışınca
   * `kapsam = sayıldı + sayılmadı` eşitliği bozuluyor ve tablo kendi
   * kendini yalanlıyor. Kapsam dışı bulgular AYRI satırda (`kapsamDisi`).
   */
  sayildi: number;
  /** ② temiz — kapsam içi, sayıldı ve sistemle tutuyor. */
  tutuyor: number;
  /** ③ sapan — KAPSAM İÇİ fazla + eksik satır sayısı. */
  sapan: number;
  /** ④ incelenemedi — kapsamda ama sayılmadı. ⚠ SIFIR SAYILMADI DEMEK DEĞİL. */
  sayilmadi: number;

  /** ⛔ AYRI: sistemin AZ gösterdiği satır ve toplam adedi (kaydı girilmemiş ALIM). */
  fazlaSatir: number;
  fazlaAdet: number;
  /** ⛔ AYRI: sistemin FAZLA gösterdiği satır ve toplam adedi (kaydı girilmemiş SATIŞ). */
  eksikSatir: number;
  eksikAdet: number;

  /** Kapsam dışında bulunan (sistem yok sanıyordu) satır sayısı. */
  kapsamDisi: number;
  /** Sayım günü hareketi olduğu için hüküm verilemeyen satır sayısı. */
  belirsiz: number;
  /** Düzeltmesi yazılabilir satır sayısı. */
  yazilabilir: number;
  /** Yazıldı ama sonradan geriye dönük kayıt geldiği için yeniden açılan. */
  yenidenAcilan: number;
};

/**
 * ⚠ ADET HER ZAMAN POZİTİF TAŞINIR. `eksikAdet` negatif tutulsaydı iki kova
 * toplandığında sessizce sıfırlanabilirdi — tam da yasakladığımız birleşme.
 * Yön kovanın ADINDA yaşar, işaretinde değil.
 */
export function sayimOzeti(girdiler: readonly SatirGirdisi[]): SayimOzeti {
  const o: SayimOzeti = {
    kapsam: 0, sayildi: 0, tutuyor: 0, sapan: 0, sayilmadi: 0,
    fazlaSatir: 0, fazlaAdet: 0, eksikSatir: 0, eksikAdet: 0,
    kapsamDisi: 0, belirsiz: 0, yazilabilir: 0, yenidenAcilan: 0,
  };

  for (const g of girdiler) {
    const h = satirHali(g);

    if (g.kapsamdaydi) o.kapsam++;
    else o.kapsamDisi++;

    if (h.belirsiz) o.belirsiz++;
    if (h.yazilabilirMi) o.yazilabilir++;
    if (h.damga === "YENIDEN_ACILDI") o.yenidenAcilan++;

    switch (h.kova) {
      case "SAYILMADI":
        /**
         * ⚠ YALNIZ KAPSAM İÇİ SAYILIR. Kapsam dışı bir satır zaten okunarak
         * doğar; "sayılmadı" olması mümkün değil. Buraya düşerse sayı
         * ŞİŞERDİ ve kapsam raporu olduğundan kötü görünürdü.
         */
        if (g.kapsamdaydi) o.sayilmadi++;
        break;
      /**
       * ⚠ DÖRT SAYI KAPSAM İÇİNDEN; kova TOPLAMLARI (fazla/eksik adet)
       * kapsam dışını DA sayar. İkisi farklı sorulardır:
       *   dört sayı  → "kapsamın ne kadarını inceledim"
       *   kova toplamı → "toplam ne kadar sapma buldum"
       * Kapsam dışı bulgu ikincisine girer, birincisine girmez.
       */
      case "TUTUYOR":
        if (g.kapsamdaydi) { o.sayildi++; o.tutuyor++; }
        break;
      case "FAZLA":
        if (g.kapsamdaydi) { o.sayildi++; o.sapan++; }
        o.fazlaSatir++; o.fazlaAdet += h.fark ?? 0;
        break;
      case "EKSIK":
        if (g.kapsamdaydi) { o.sayildi++; o.sapan++; }
        o.eksikSatir++; o.eksikAdet += Math.abs(h.fark ?? 0);
        break;
    }
  }

  return o;
}

/**
 * SAYIM TAM MI — kapsamdaki her satır sayıldı mı.
 * ⚠ Tamlık, sapma OLMAMASI değildir: sapan bir sayım da TAM olabilir.
 * İkisi karıştırılırsa "eksiksiz sayım" cümlesi "hata yok" diye okunur.
 */
export function sayimTamMi(o: SayimOzeti): boolean {
  return o.sayilmadi === 0;
}

/** Satır hâllerini kova kova ayırır — ekran fazla/eksik LİSTELERİNİ ayrı basar. */
export function kovalaraAyir<T>(
  kayitlar: readonly (T & SatirGirdisi)[],
): { fazla: (T & { hal: SatirHali })[]; eksik: (T & { hal: SatirHali })[] } {
  const fazla: (T & { hal: SatirHali })[] = [];
  const eksik: (T & { hal: SatirHali })[] = [];
  for (const k of kayitlar) {
    const hal = satirHali(k);
    if (hal.kova === "FAZLA") fazla.push({ ...k, hal });
    else if (hal.kova === "EKSIK") eksik.push({ ...k, hal });
  }
  return { fazla, eksik };
}
