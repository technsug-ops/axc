import type { PrismaClient } from "../src/generated/prisma/client";
import { firmaSeed, yetkiSeed } from "../prisma/seed-yetki";
import { firmaIstemcisi } from "../src/lib/firma-istemcisi";

/**
 * ============================================================================
 *  İZİN SENKRONU — BÜTÜN FİRMALAR (K303, 14.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ESKİ HÂL (silinmedi, gerekçesiyle): `canli:yetki` yalnız `firmaSeed`in
 *  döndürdüğü TEK firmada (`AXC`) koşuyordu — tek firmada doğruydu. Çok
 *  firmada yeni bir izin YALNIZ Axcali'nin tam yetkili rolüne gider, öteki
 *  firmaların Sahip'i almaz; bekçi kırmızı yanar ama senkron eksiği KAPATAMAZ
 *  (anayasa: «yetki iki bacaklıdır» — ikinci bacak her firmada).
 *  Bulundu: `kanal.anahtar` izni eklenirken (K303 2. adım).
 *
 *  ⚠ `firmaSeed` YALNIZ HİÇ FİRMA YOKKEN (ilk kurulum). Firma varken onu
 *  çağırmak, koddaki sabit firmayı «yoksa oluştur» diye geri getirirdi —
 *  deneme kurulumunda Axcali kopyası bilerek silinmişti.
 *  Pasif firma da dahil: yeniden açıldığında rolleri eksik doğmasın.
 * ============================================================================
 */
export async function butunFirmalardaYetki(prisma: PrismaClient, adres: string): Promise<string[]> {
  let firmalar = await prisma.company.findMany({ select: { id: true, name: true, code: true }, orderBy: { code: "asc" } });
  if (firmalar.length === 0) firmalar = [await firmaSeed(prisma)];
  for (const firma of firmalar) {
    /* K303 3d: rol/izin tabloları firmaya ait — firma istemcisiyle yazılır. */
    const fp = firmaIstemcisi(adres, firma.id);
    try {
      await yetkiSeed(fp, firma);
    } finally {
      await fp.$disconnect();
    }
  }
  return firmalar.map((f) => f.code);
}
