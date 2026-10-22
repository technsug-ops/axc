import { prisma } from "@/lib/prisma";
import { SUNUCU_HATASI_EYLEMI, sunucuHatasiCoz, sunucuHatasiIzi, type HataBaglami, type HataIstegi } from "@/lib/hata/sunucu-hatasi";

/**
 * SUNUCU HATASI — YAZMA ve OKUMA (K353). Saf gövde `sunucu-hatasi.ts`.
 * `instrumentation.ts` → `onRequestError` buraya gelir; yalnız Node çalışma
 * ortamında (Prisma burada).
 */
export async function sunucuHatasiniKaydet(hata: unknown, istek: HataIstegi, baglam: HataBaglami): Promise<void> {
  const iz = sunucuHatasiIzi(hata, istek, baglam);
  if (iz === null) return;
  try {
    await prisma.auditLog.create({ data: iz });
  } catch (yazimHatasi) {
    /* Veritabanı yoksa iz yazılamaz (ekran zaten «veritabanına ulaşılamıyor» der).
       Sessiz geçilmez: hem asıl hata hem yazım hatası sunucu günlüğüne TAM. */
    console.error("[sunucu-hatasi] iz yazılamadı:", yazimHatasi, "asıl hata:", iz.detail);
  }
}

/** İzin açıldığı gün (izin doğum tarihi): bundan önce «kayıt yok» hüküm değildir. */
export const SUNUCU_HATASI_IZI_BASLANGICI = "22.10.2026";

export async function sonSunucuHatalari(gun: number, adet: number) {
  const sinir = new Date(Date.now() - gun * 24 * 60 * 60 * 1000);
  const kosul = { action: SUNUCU_HATASI_EYLEMI, createdAt: { gte: sinir } };
  const [toplam, satirlar] = await Promise.all([
    prisma.auditLog.count({ where: kosul }),
    prisma.auditLog.findMany({
      where: kosul,
      orderBy: { createdAt: "desc" },
      take: adet,
      select: { createdAt: true, targetId: true, detail: true },
    }),
  ]);
  return { toplam, satirlar: satirlar.map((s) => sunucuHatasiCoz(s.createdAt, s.targetId, s.detail)) };
}
