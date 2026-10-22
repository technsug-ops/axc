import { prisma } from "@/lib/prisma";
import { ERISIM_BOSLUGU_EYLEMI, erisimBosluguCoz, type ErisimBoslugu } from "@/lib/veritabani-erisim";

/** İzin açıldığı gün (izin doğum tarihi): öncesi için «boşluk yok» hüküm değildir. */
export const ERISIM_IZI_BASLANGICI = "22.10.2026";

/** Son `gun` günün erişim boşlukları — en yenisi önce. Çözülemeyen iz SAYILIR, gizlenmez. */
export async function sonErisimBosluklari(gun: number, adet: number): Promise<{ toplam: number; cozulemeyen: number; satirlar: ErisimBoslugu[] }> {
  const kosul = { action: ERISIM_BOSLUGU_EYLEMI, createdAt: { gte: new Date(Date.now() - gun * 24 * 60 * 60 * 1000) } };
  const [toplam, izler] = await Promise.all([
    prisma.auditLog.count({ where: kosul }),
    prisma.auditLog.findMany({ where: kosul, orderBy: { createdAt: "desc" }, take: adet, select: { detail: true } }),
  ]);
  const cozulen = izler.map((i) => erisimBosluguCoz(i.detail));
  return { toplam, cozulemeyen: cozulen.filter((c) => c === null).length, satirlar: cozulen.filter((c): c is ErisimBoslugu => c !== null) };
}
