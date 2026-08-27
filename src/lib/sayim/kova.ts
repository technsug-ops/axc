/**
 * ============================================================================
 *  FİZİKSEL SAYIM — KOVA AYRIMI (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  Veritabanına DOKUNMAZ. Girdiler çağıran tarafta ledger'dan okunur; burada
 *  yalnız hüküm verilir. Böylece her ayrım tek tek sınanabilir.
 *
 *  ⛔ RAF GERÇEK, DEFTER İDDİA. Bu dosyadaki bütün adlandırma o yönü taşır:
 *  sapma "sayımda eksik" değil, "SİSTEM fazla gösteriyor"dur.
 *
 *  ═══ İKİ KOVA ASLA BİRLEŞMEZ ═══
 *
 *  FAZLA ile EKSİK'i tek bir "fark" rakamına toplamak, iki APAYRI işi tek
 *  sayıya ezmek olurdu:
 *
 *    EKSİK → kaydı girilmemiş SATIŞ. Maliyet **BİLİNİYOR** (FIFO partisinden
 *            gelir), gider yazılır.
 *    FAZLA → kaydı girilmemiş ALIM. Maliyet **BİLİNMİYOR** — karar gerekir,
 *            UYDURULMAZ.
 *
 *  3 eksik + 3 fazla, net olarak `0` eder ve "her şey yolunda" der. Oysa
 *  ortada bir satış kaydı ve bir alım kaydı eksiktir; ikisi de para taşır ve
 *  ikisi de ayrı iş açar. Bu yüzden özet tipinde TEK BİR `fark` alanı YOKTUR
 *  ve olmayacaktır.
 *
 *  ═══ null ≠ 0 — SİSTEMİN EN KRİTİK AYRIMI ═══
 *
 *    sayilanAdet === null  →  SAYILMADI    (bakılmadı; sistem hüküm veremez)
 *    sayilanAdet === 0     →  SAYILDI      (bakıldı, rafta YOK → hepsi eksik)
 *
 *  Karıştırılırsa sayılmamış mal stoktan SESSİZCE silinir. `fark` bu yüzden
 *  SAYILMADI kovasında `0` değil **`null`** döner: `0` "tutuyor" demektir ve
 *  bakılmamış bir satır hakkında "tutuyor" demek bir YALANDIR.
 * ============================================================================
 */

/**
 * Bir sayım satırının ham hâli. Hepsi çağıran tarafından ledger'dan
 * çözülür — bu dosya sorgu yapmaz.
 */
export type SatirGirdisi = {
  /** ⛔ null = SAYILMADI · 0 = sayıldı, rafta yok. Bkz. dosya başlığı. */
  sayilanAdet: number | null;
  /**
   * SAYIM GÜNÜ SONU itibarıyla sistemin dediği adet
   * (`occurredAt <= sayimGunu` toplamı). "Bugünkü stok" DEĞİL — sayımdan
   * sonraki hareketler sapma sayılmaz.
   */
  sistemAdedi: number;
  /**
   * Oturum açılırken kapsamda mıydı. `false` = sayım sırasında kapsam dışı
   * bir kod okundu; reddedilmez, çünkü sistemin boş sandığı yerde mal
   * bulunması bulgunun kendisidir.
   */
  kapsamdaydi: boolean;
  /**
   * Varyantın SAYIM GÜNÜNDE hareketi var mı. Varsa sayımın o hareketten önce
   * mi sonra mı yapıldığı GÜN çözünürlüğünde ayrılamaz (ledger günlük);
   * satır "belirsiz" işaretlenir ve SESSİZCE YAZILMAZ.
   */
  ayniGunHareketVar: boolean;
  /** Düzeltme yazıldıysa anı; yazılmadıysa null. */
  duzeltmeYazildiAt: Date | null;
  /** Yazım anında karşılaştırılan sistem adedi. Bkz. `damgaHali`. */
  damgaSistemAdedi: number | null;
};

/**
 * ⚠ KOVALAR AYRI SAYILIR — birleştirme yasağı için bkz. dosya başlığı.
 * `SAYILMADI` bir sapma DEĞİLDİR; "incelenemedi" tarafında durur.
 */
export type SayimKovasi = "SAYILMADI" | "TUTUYOR" | "EKSIK" | "FAZLA";

/** Yazılmış bir düzeltmenin hâlâ geçerli olup olmadığı. */
export type DamgaHali = "YAZILMADI" | "GECERLI" | "YENIDEN_ACILDI";

export type SatirHali = {
  kova: SayimKovasi;
  /**
   * `sayilan − sistem`. **SAYILMADI'da `null`** — `0` "tutuyor" demek olurdu
   * ve bakılmamış satır hakkında hüküm kurardı.
   * Pozitif = FAZLA (sistem az gösteriyor) · Negatif = EKSİK.
   */
  fark: number | null;
  /** Kapsam dışında bulundu (oturum açılışında listede yoktu). */
  kapsamDisi: boolean;
  /** Sayım günü hareketi var — hüküm verilemez, yazılmaz. */
  belirsiz: boolean;
  damga: DamgaHali;
  /** Düzeltme yazılabilir mi. Belirsiz ve yazılmış satırlar yazılmaz. */
  yazilabilirMi: boolean;
};

/**
 * DAMGA GEÇERLİLİĞİ — sayım hükmü KAYDIN HÂLİNE bağlıdır (K6 deseni).
 *
 * Düzeltme yazıldıktan sonra sayım gününe ya da öncesine damgalı bir hareket
 * girilirse sistem adedi değişir; o zaman yazılan düzeltme artık YANLIŞ
 * miktarı taşır ve satır YENİDEN AÇILIR.
 *
 * ⚠ ÇÖZÜLEMEYEN İZ SUSTURMAZ: düzeltme yazılmış ama damga `null` ise bu
 * satır "geçerli" SAYILMAZ. Bozuk bir izin bir kalemi sonsuza kadar
 * sessizleştirmesi, tam olarak kaçındığımız şey.
 */
export function damgaHali(
  duzeltmeYazildiAt: Date | null,
  damgaSistemAdedi: number | null,
  guncelSistemAdedi: number,
): DamgaHali {
  if (duzeltmeYazildiAt === null) return "YAZILMADI";
  if (damgaSistemAdedi === null) return "YENIDEN_ACILDI";
  return damgaSistemAdedi === guncelSistemAdedi ? "GECERLI" : "YENIDEN_ACILDI";
}

/** Bir satırın hükmü. Saf: aynı girdi her zaman aynı çıktı. */
export function satirHali(g: SatirGirdisi): SatirHali {
  const damga = damgaHali(g.duzeltmeYazildiAt, g.damgaSistemAdedi, g.sistemAdedi);
  const kapsamDisi = !g.kapsamdaydi;

  /**
   * ⛔ İLK KAPI null KONTROLÜ — ve `!g.sayilanAdet` YAZILMAZ.
   * `0` da yalancıdır (falsy) ve o kontrol, RAFTA OLMADIĞI ÖLÇÜLMÜŞ bir
   * varyantı "sayılmadı" sayardı: gerçek bir eksik sessizce kaybolurdu.
   */
  if (g.sayilanAdet === null) {
    return {
      kova: "SAYILMADI",
      fark: null,
      kapsamDisi,
      belirsiz: g.ayniGunHareketVar,
      damga,
      yazilabilirMi: false,
    };
  }

  const fark = g.sayilanAdet - g.sistemAdedi;
  const kova: SayimKovasi = fark === 0 ? "TUTUYOR" : fark > 0 ? "FAZLA" : "EKSIK";

  return {
    kova,
    fark,
    kapsamDisi,
    belirsiz: g.ayniGunHareketVar,
    damga,
    /**
     * Yazılabilirlik ÜÇ şartı birden ister: sapma var · belirsiz değil ·
     * daha önce yazılmamış. Yeniden açılmış satır da yazılabilir DEĞİLDİR:
     * düzeltme zaten yazıldı, ikincisi çift sayardı — o satır yeniden
     * SAYILMAYI ister, yeniden yazılmayı değil.
     */
    yazilabilirMi: kova !== "TUTUYOR" && !g.ayniGunHareketVar && damga === "YAZILMADI",
  };
}
