import type { DuzeltmeYonu } from "@/lib/stok-duzeltme";
import type { SatirHali } from "@/lib/sayim/kova";

/**
 * ============================================================================
 *  FİZİKSEL SAYIM — SATIR KARARI (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  Bir sapan satır için hangi yollar açık, hangi sırayla ve maliyet biliniyor
 *  mu. Ekran bu gövdeden beslenir — sıra ekranda ELLE dizilmez, yoksa iki
 *  ekran iki farklı sıra gösterir.
 *
 *  ═══ FAZLA'DA SIRA BİR KURALDIR, TAVSİYE DEĞİL ═══
 *
 *  Ölçüldü (27.08.2026, canlı): elle girilen ALIMLARIN ortanca gecikmesi
 *  **31 gün** (p75 82, max 819). Yani bugün yapılan bir sayımda çıkacak
 *  FAZLA'nın büyük kısmı "maliyeti bilinmeyen mal" DEĞİL, **faturası daha
 *  girilmemiş alım.**
 *
 *  ⛔ Önce fark yazılıp sonra fatura girilirse stok **İKİ KEZ** artar. Bu
 *  yüzden belge yolu üsttedir ve düzeltme yazıldığında satır KİLİTLENİR.
 * ============================================================================
 */

/**
 * BELGE_GIR       — kaydı girilmemiş alım/satış girilir; maliyet GERÇEK gelir
 * MALIYETLE_YAZ   — sayım fazlası, kullanıcının girdiği maliyetle
 * MALIYETSIZ_YAZ  — sayım fazlası, NO_COST parti (kâr "hesaplanamadı" der)
 * FIFODAN_DUS     — sayım eksiği; maliyet FIFO partisinden gelir
 */
export type SayimYolu = "BELGE_GIR" | "MALIYETLE_YAZ" | "MALIYETSIZ_YAZ" | "FIFODAN_DUS";

export type SatirKarari = {
  /** Ledger'a yazılacak yön. Sapma yoksa null. */
  yon: DuzeltmeYonu | null;
  /** Her zaman POZİTİF adet — yön ayrı alanda (stok-duzeltme deseni). */
  adet: number;
  /**
   * Maliyet sistemde biliniyor mu.
   * EKSİ → **evet**, FIFO partisinden gelir.
   * ARTI → **hayır**, karar gerekir ve UYDURULMAZ.
   */
  maliyetBiliniyorMu: boolean;
  /** Ekranda GÖSTERİLECEK SIRA — ilki en üstte durur. */
  yollar: SayimYolu[];
  /** Satır kilitli mi (düzeltme yazılmış). Kilitliyse hiçbir yol açık değildir. */
  kilitli: boolean;
};

export function satirKarari(hal: SatirHali): SatirKarari {
  const kilitli = hal.damga !== "YAZILMADI";

  if (hal.kova === "SAYILMADI" || hal.kova === "TUTUYOR") {
    return { yon: null, adet: 0, maliyetBiliniyorMu: false, yollar: [], kilitli };
  }

  /**
   * ⚠ BELİRSİZ SATIRDA HİÇBİR YOL AÇILMAZ. Sayım günü hareketi varsa sapmanın
   * gerçek mi yoksa gün içi sıra mı olduğu bilinemez; yazmak, bilmediğimiz bir
   * şey hakkında ledger'a hüküm yazmak olurdu.
   */
  if (hal.belirsiz || kilitli) {
    return {
      yon: hal.kova === "FAZLA" ? "ARTI" : "EKSI",
      adet: Math.abs(hal.fark ?? 0),
      maliyetBiliniyorMu: hal.kova === "EKSIK",
      yollar: [],
      kilitli,
    };
  }

  if (hal.kova === "FAZLA") {
    return {
      yon: "ARTI",
      adet: hal.fark ?? 0,
      /** Maliyet BİLİNMİYOR — sıfır maliyet VARSAYILMAZ. */
      maliyetBiliniyorMu: false,
      /** ⛔ BELGE ÜSTTE — gerekçesi dosya başlığında (ortanca 31 gün gecikme). */
      yollar: ["BELGE_GIR", "MALIYETLE_YAZ", "MALIYETSIZ_YAZ"],
      kilitli: false,
    };
  }

  return {
    yon: "EKSI",
    adet: Math.abs(hal.fark ?? 0),
    /** Maliyet FIFO partisinden gelir — gider yazılır, uydurma yok. */
    maliyetBiliniyorMu: true,
    yollar: ["BELGE_GIR", "FIFODAN_DUS"],
    kilitli: false,
  };
}
