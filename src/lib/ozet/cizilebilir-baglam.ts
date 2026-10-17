import type { OzetBaglam } from "@/lib/ozet/veri-toplama";

/**
 * Özet sayfası KAYITLI veriyi çizer (`AiOzet.girdiJson`); kayıt, onu üreten kod
 * düzeltilmeden ÖNCE yazılmış olabilir. Adresi ya da başlığı olmayan bağlam
 * `<Link>`i çökertir ve bütün sayfayı götürür (canlı arıza 17.10.2026).
 * Bozuk bağlam ATLANIR — kaynak bağlantısı eksik kalır ama özet okunur.
 * Kayıt silinmez/düzeltilmez: ertesi üretim yeni satırı doğru şekilde yazar.
 */
export function cizilebilirBaglamlar(baglamlar: unknown): OzetBaglam[] {
  if (!Array.isArray(baglamlar)) return [];
  return baglamlar.filter(
    (b): b is OzetBaglam =>
      typeof b === "object" && b !== null &&
      typeof (b as OzetBaglam).anahtar === "string" &&
      typeof (b as OzetBaglam).baslik === "string" &&
      typeof (b as OzetBaglam).adres === "string" &&
      (b as OzetBaglam).adres.startsWith("/"),
  );
}
