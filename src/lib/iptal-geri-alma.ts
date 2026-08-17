/**
 * ============================================================================
 *  İPTALİ GERİ AL — SAF KURALLAR
 * ----------------------------------------------------------------------------
 *  ⚠ GERÇEK DÜNYA KANITI 17.08.2026: iptal ekranı canlıya çıktı ve İLK
 *  TESTTE gerçek bir satış (11512722550) yanlışlıkla iptal edildi. Geri alma
 *  yolu tasarlanmamıştı; tek seferlik bir script'le kurtarıldı.
 *
 *  Ders: geri dönüşü tasarlanmamış her yıkıcı işlem, ilk gerçek kullanımda
 *  bir kayba dönüşür. "Onay diyaloğu var" yeterli değildir.
 *
 *  ── ÜÇ KİLİT ────────────────────────────────────────────────────────────
 *  1. Satış iptalli DEĞİLSE geri alınacak bir şey yok.
 *  2. İptalin yazdığı ayna hareket bulunamazsa stok geri çevrilemez.
 *  3. ⚠ İPTALDEN SONRA O MALDAN ÇIKIŞ YAPILMIŞSA GERİ ALINAMAZ.
 *     İptal stoğa 1 adet geri koydu; o adet başka bir satışta kullanıldıysa
 *     geri alma stoğu EKSİYE düşürür. Bu kilit sessiz bir pasif düğme
 *     DEĞİLDİR: ekran hangi hareketin engellediğini yazar ve ona bağlanır.
 *
 *  ── İZ TEMİZLENMEZ ──────────────────────────────────────────────────────
 *  Geri alma, iptal kaydını SİLMEZ. Durum kutusu kalkar ama defterde
 *  "iptal edildi" ve "iptal geri alındı" satırları yan yana durur. Hikâye
 *  birikir; bugünkü vaka altı satırlık bir iz bıraktı ve her satırı gerekliydi.
 * ============================================================================
 */

/** Geri alma nedenleri — kapalı liste, aynı desen (bkz. iptal taksonomisi). */
export const GERI_ALMA_NEDENLERI = [
  /** Bugünkü vaka: gerçek satış yanlışlıkla iptal edildi. */
  "YANLISLIKLA",
  /** Müşteri iptalden vazgeçti, satış devam ediyor. */
  "MUSTERI_DEVAM",
  /** Diğer — AÇIKLAMA ZORUNLU. */
  "DIGER",
] as const;

export type GeriAlmaNedeni = (typeof GERI_ALMA_NEDENLERI)[number];

export const GERI_ALMA_ACIKLAMA_ZORUNLU: readonly GeriAlmaNedeni[] = ["DIGER"];

export type GeriAlmaEngeli =
  | "IPTALLI_DEGIL"
  | "AYNA_YOK"
  | "SONRAKI_CIKIS"
  | "NEDEN_YOK"
  | "ACIKLAMA_YOK";

/** İptalin yazdığı stoğa giriş hareketi. */
export type AynaHareket = {
  hareketId: string;
  variantId: string;
  /** POZİTİF — iptal bunu stoğa eklemişti. */
  adet: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
  /**
   * Hatalı yazılmış kaynak bağı. Eski kayıtlarda dolu olabilir; geri alma
   * onu da temizler (bkz. hayalet parti hatası 17.08.2026).
   */
  kaynakHareketId: string | null;
};

/** İptalden SONRA o varyanttan yapılmış çıkış — üçüncü kilidin kanıtı. */
export type SonrakiCikis = {
  hareketId: string;
  tip: string;
  adet: number;
  tarih: Date;
  /** Varsa bağlı satışın kimliği — ekran ona bağlantı verir. */
  satisId: string | null;
  satisKodu: string | null;
};

export type GeriAlmaGirdisi = {
  iptalliMi: boolean;
  aynalar: AynaHareket[];
  sonrakiCikislar: SonrakiCikis[];
  neden: GeriAlmaNedeni | null;
  aciklama: string | null;
};

export type TersHareket = {
  variantId: string;
  /** NEGATİF — ayna hareketi tüketir. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
  /** Ayna partisini tüketir ki FIFO'da açık kalmasın. */
  sourceMovementId: string;
  /** Kaynak bağı temizlenecek ayna hareket (hatalı eski kayıtlar için). */
  temizlenecekAynaId: string | null;
};

export type GeriAlmaPlani =
  | {
      olur: false;
      engel: GeriAlmaEngeli;
      /**
       * SESSİZ PASİF DÜĞME YOK (mimar şartı): üçüncü kilit devredeyse
       * ENGELLEYEN HAREKETLER geri döner ve ekran onları yazar.
       */
      engelleyenler?: SonrakiCikis[];
    }
  | {
      olur: true;
      hareketler: TersHareket[];
      /** Stoktan çıkacak toplam adet — önizlemede gösterilir. */
      stoktanCikacakAdet: number;
    };

export function geriAlmaPlani(girdi: GeriAlmaGirdisi): GeriAlmaPlani {
  // KİLİT 1 — iptalli değilse geri alınacak bir şey yok.
  if (!girdi.iptalliMi) return { olur: false, engel: "IPTALLI_DEGIL" };

  // KİLİT 2 — ayna hareket yoksa stok geri çevrilemez.
  if (girdi.aynalar.length === 0) return { olur: false, engel: "AYNA_YOK" };

  /**
   * KİLİT 3 — İPTALDEN SONRA ÇIKIŞ VARSA GERİ ALINAMAZ.
   *
   * İptal stoğa mal koydu; o mal başka bir satışta kullanıldıysa geri alma
   * stoğu eksiye düşürür. Engelleyen hareketler GERİ DÖNER — kullanıcı
   * neden yapamadığını ve hangi kaydın engellediğini görür.
   */
  if (girdi.sonrakiCikislar.length > 0) {
    return {
      olur: false,
      engel: "SONRAKI_CIKIS",
      engelleyenler: girdi.sonrakiCikislar,
    };
  }

  if (girdi.neden === null) return { olur: false, engel: "NEDEN_YOK" };

  if (
    GERI_ALMA_ACIKLAMA_ZORUNLU.includes(girdi.neden) &&
    (girdi.aciklama === null || girdi.aciklama.trim() === "")
  ) {
    return { olur: false, engel: "ACIKLAMA_YOK" };
  }

  const hareketler: TersHareket[] = girdi.aynalar
    .filter((a) => a.adet > 0)
    .map((a) => ({
      variantId: a.variantId,
      // TERS: ayna pozitifti, bu negatif.
      quantityDelta: -a.adet,
      // Maliyet aynen taşınır — envanter değeri kaymaz.
      birimMaliyet: a.birimMaliyet,
      birimMaliyetParaBirimi: a.birimMaliyetParaBirimi,
      locationId: a.locationId,
      sourceMovementId: a.hareketId,
      /**
       * Eski kayıtlarda ayna hareket hatalı bir kaynak bağı taşıyor olabilir
       * (hayalet parti hatası). Geri alma sırasında temizlenir; yeni iptaller
       * bu bağı zaten hiç yazmıyor.
       */
      temizlenecekAynaId: a.kaynakHareketId === null ? null : a.hareketId,
    }));

  return {
    olur: true,
    hareketler,
    stoktanCikacakAdet: hareketler.reduce(
      (t, h) => t + Math.abs(h.quantityDelta),
      0,
    ),
  };
}

/** Plan imzası — EK 1, aynı desen (bkz. `satis-duzenleme.ts`). */
export function geriAlmaImzasi(plan: GeriAlmaPlani): string {
  if (!plan.olur) return `ENGEL:${plan.engel}`;
  return plan.hareketler
    .map(
      (h) =>
        `${h.variantId}|${h.quantityDelta}|${h.sourceMovementId}|${h.birimMaliyet ?? ""}`,
    )
    .sort()
    .concat(`ADET:${plan.stoktanCikacakAdet}`)
    .join("§");
}
