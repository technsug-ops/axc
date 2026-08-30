/**
 * ============================================================================
 *  TOPLU RAF TAŞIMA — SAF KARAR (K50 ⑥)
 * ----------------------------------------------------------------------------
 *  Kaynak rafı okut → hedef rafı okut → "N ürün taşınacak" → onayla.
 *
 *  ⚠ VERİTABANI YOK — `depo:dogrula` bunu ÇAĞIRARAK sınıyor.
 *
 *  ⚠ KISMÎ TAŞIMA MEŞRUDUR: rafın tamamı değil, seçilen ürünler taşınır.
 *  Depoda gerçek iş böyle: raf bölünür, bir kısmı yeni rafa gider. Hepsini
 *  zorlamak, operatörü ürünleri tek tek `/yerlestir`den geçirmeye iterdi.
 * ============================================================================
 */

export type TasimaGirdisi = {
  kaynakId: string | null;
  hedefId: string | null;
  /** Kaynak rafta duran aktif varyantların kimlikleri. */
  kaynaktakiler: readonly string[];
  /** Kullanıcının seçtiği varyantlar. */
  secili: readonly string[];
};

export type TasimaKarari =
  | { tur: "KAYNAK_YOK" }
  | { tur: "HEDEF_YOK" }
  /** ⛔ Aynı rafa taşımak bir işlem değil; yazma yapılmaz ve SÖYLENİR. */
  | { tur: "AYNI_RAF" }
  /** ⛔ Kaynak boşsa taşınacak bir şey yok — "0 ürün taşındı" izi yazılmaz. */
  | { tur: "KAYNAK_BOS" }
  | { tur: "SECIM_YOK" }
  | { tur: "HAZIR"; adet: number; kismi: boolean };

/**
 * ⚠ SEÇİM KAYNAKLA KESİŞTİRİLİR. İstemciden gelen listede kaynakta olmayan
 * bir kimlik varsa (ekran açıkken ürün başka rafa gitmiş olabilir) o kimlik
 * SAYILMAZ — yoksa ekran "12 ürün taşınacak" der, 11'i taşınır ve fark
 * kimseye söylenmez.
 */
export function tasimaKarari(g: TasimaGirdisi): TasimaKarari {
  if (g.kaynakId === null) return { tur: "KAYNAK_YOK" };
  if (g.hedefId === null) return { tur: "HEDEF_YOK" };
  /**
   * ⛔ AYNI RAF KONTROLÜ HEDEF KONTROLÜNDEN SONRA: hedef seçilmemişken
   * "aynı raf" demek yanlış bilgi olurdu.
   */
  if (g.kaynakId === g.hedefId) return { tur: "AYNI_RAF" };
  if (g.kaynaktakiler.length === 0) return { tur: "KAYNAK_BOS" };

  const kaynakKumesi = new Set(g.kaynaktakiler);
  const gecerli = [...new Set(g.secili)].filter((id) => kaynakKumesi.has(id));
  if (gecerli.length === 0) return { tur: "SECIM_YOK" };

  return {
    tur: "HAZIR",
    adet: gecerli.length,
    /** ⚠ Kısmî olduğu EKRANDA yazar — "rafı taşıdım" sanılmasın. */
    kismi: gecerli.length < g.kaynaktakiler.length,
  };
}

/**
 * İZ İÇİN SKU LİSTESİ — TAVANLI VE KIRPILMA BEYAN EDİLİR.
 *
 * ⛔ 28.08.2026 DERSİ: 5595 satışın kimliği `AuditLog.detail`e kondu, alan
 * MySQL `TEXT` (65.535 bayt) ve JSON TAM TAVANDA KIRPILDI — geri alma yolu
 * YAZILDIĞI ANDA BOZUKTU ve hiçbir yerde hata vermedi.
 *
 * ⭐ BURADA GERİ ALMA LİSTEYE BAĞLI DEĞİL: taşımayı geri almak, aynı
 * ekranda hedefi kaynak yapıp yeniden taşımaktır — yeniden hesaplanabilir
 * bir yol. Liste yalnız TEŞHİS için duruyor.
 *
 * ⚠ TAVAN ÖLÇÜLDÜ: en kalabalık raf canlıda 969 varyant (DEPO kovası).
 * 500 SKU × ~13 bayt ≈ 6,5 KB — 65.535'in çok altında. Aşılırsa liste
 * kırpılır ve KIRPILDIĞI yazılır; sessizce eksik bir liste, tam liste
 * sanılır.
 */
export const IZ_SKU_TAVANI = 500;

export function izListesi(skular: readonly string[]): {
  skular: string[];
  kirpildi: boolean;
  toplam: number;
} {
  return {
    skular: skular.slice(0, IZ_SKU_TAVANI),
    kirpildi: skular.length > IZ_SKU_TAVANI,
    toplam: skular.length,
  };
}

/**
 * İZ EYLEMİ — `AuditLog.action`.
 *
 * ⛔ Sunucu eylemi dosyasında duramaz — gerekçe `lib/depo/yerlestirme.ts`te.
 */
export const TOPLU_TASIMA_EYLEMI = "RAF_TOPLU_TASIMA";
