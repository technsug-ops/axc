import { EN_AZ_PAROLA_UZUNLUGU, parolaDogrula, parolaYeterliMi } from "@/lib/parola";

/**
 * ============================================================================
 *  PAROLA DEĞİŞİMİ KURALI — TEK GÖVDE (05.10.2026)
 * ----------------------------------------------------------------------------
 *  Firma tarafı (`/parola-degistir`) ve yönetim katmanı (`/bezirga/parola`)
 *  AYNI kuralı kullanır: eski parola doğru · yeni yeterince uzun · tekrar
 *  tutuyor · yeni eskisiyle aynı değil. Yönetim katmanına zorunlu parola
 *  değişimi eklenirken kural ikinci kez yazılmadı (anayasa: «iki yerde iki
 *  kural olmaz» — biri güncellenip öteki unutulurdu).
 *
 *  Hata KOD olarak döner; ekran sözlükten metne çevirir.
 * ============================================================================
 */

export type ParolaDegisimiHatasi = "ESKI_YANLIS" | "KISA" | "TEKRAR_TUTMUYOR" | "AYNI_PAROLA";

/** Sözlük anahtarı (`ParolaDegistir` ad alanı) — iki ekran da aynı metni yazar. */
export const PAROLA_HATA_ANAHTARI: Record<ParolaDegisimiHatasi, string> = {
  ESKI_YANLIS: "eskiYanlis",
  KISA: "kisa",
  TEKRAR_TUTMUYOR: "tekrarTutmuyor",
  AYNI_PAROLA: "ayniParola",
};

export { EN_AZ_PAROLA_UZUNLUGU };

/** Değişim geçerli mi — geçerliyse null, değilse İLK hatanın kodu. */
export async function parolaDegisimiHatasi(
  girdi: { eski: string; yeni: string; tekrar: string },
  mevcutOzet: string,
): Promise<ParolaDegisimiHatasi | null> {
  if (!(await parolaDogrula(girdi.eski, mevcutOzet))) return "ESKI_YANLIS";
  if (!parolaYeterliMi(girdi.yeni)) return "KISA";
  if (girdi.yeni !== girdi.tekrar) return "TEKRAR_TUTMUYOR";
  if (girdi.yeni === girdi.eski) return "AYNI_PAROLA";
  return null;
}
