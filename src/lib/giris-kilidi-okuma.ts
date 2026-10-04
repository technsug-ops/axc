import { sistemPrisma } from "@/lib/prisma";
import { GIRIS_KILIT_DK } from "@/lib/giris-kilidi";

/**
 * ============================================================================
 *  GİRİŞ KİLİDİNİN OKUMASI — FİRMALAR-ÜSTÜ (K303, 04.10.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ VAKA: kilit bu sorguyu firma süzgeçli istemciyle yapıyordu. Girişten
 *  önce firma yoktur → süzgeç `FIRMA_BAGLAMI_YOK` ile durdu ve deneme
 *  kurulumunda giriş ekranı hiç açılmadı (hata 2371615829). Firma olsaydı da
 *  süzgeç firmasız yazılan başarısız deneme izini (`izYaz`, firma yokken
 *  firmasız) GİZLERDİ ve kilit hiç tutmazdı.
 *
 *  Kural: aynı e-posta YA DA aynı IP hangi firmaya ait olursa olsun kilitlenir.
 *  Bekçisi `giris-firmasiz:dogrula` bu gövdeyi gerçek veritabanında ÇAĞIRIR.
 * ============================================================================
 */
export async function yakinBasarisizDenemeler(eposta: string, ip: string, simdi: Date): Promise<Date[]> {
  // SISTEM: girişten önce firma yoktur ve kilit firmalar-üstüdür; başarısız
  // deneme izi firmasız yazılır — süzgeçli istemci onu hiç göremezdi.
  const satirlar = await sistemPrisma.auditLog.findMany({
    where: {
      action: "GIRIS_BASARISIZ",
      createdAt: { gte: new Date(simdi.getTime() - GIRIS_KILIT_DK * 60_000), lte: simdi },
      OR: [
        { detail: { contains: `"eposta":${JSON.stringify(eposta)}` } },
        { detail: { contains: `"ip":${JSON.stringify(ip)}` } },
      ],
    },
    select: { createdAt: true },
  });
  return satirlar.map((s) => s.createdAt);
}
