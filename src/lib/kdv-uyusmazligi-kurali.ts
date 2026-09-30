/**
 * KANAL KDV UYUŞMAZLIĞI — SAF KURAL (veritabanına gitmez; çan tanımı da okur).
 * Ayrıntılı gerekçe: `kdv-uyusmazligi.ts`.
 */

/** `/kanal-sku?kdv=…` süzgeç değeri — adres SAHİBİNDEN üretilir (İlke #16). */
export const KDV_SUZGEC_DEGERI = "uyusmuyor";
export const KDV_UYUSMAZLIGI_ADRESI = `/kanal-sku?kdv=${KDV_SUZGEC_DEGERI}`;

/** Kuruş gibi oran da iki haneye yuvarlanır — `DECIMAL(5,2)` sütunun birimi. */
const yuzde = (x: number) => Math.round(x * 100) / 100;

/** Kanal oranı bilinmiyorsa `null` (hüküm yok); biliniyorsa ayrışıyor mu. */
export function kdvUyusmuyorMu(kanalOrani: number | null, bizimOran: number): boolean | null {
  if (kanalOrani === null || !Number.isFinite(kanalOrani)) return null;
  return yuzde(kanalOrani) !== yuzde(bizimOran);
}

