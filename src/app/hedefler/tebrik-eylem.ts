"use server";

import { prisma } from "@/lib/prisma";
import { izinVarMi } from "@/lib/yetki";
import { HEDEF_DONEMLERI, hedefPenceresi, type HedefDonemi, type HedefOlcutu } from "@/lib/hedef/hedef-karar";

export type GorunenTebrik = { id: string; olcut: HedefOlcutu; donem: HedefDonemi };

/**
 * K349-③ (kullanıcı 21.10.2026): «hedef tamamlandığında pop-up açılarak kutlansın».
 * Kutlama penceresi (üst çubuktaki Hedefler düğmesi) dakikada bir sorar: İÇİNDE
 * BULUNULAN dönemlerde verilmiş tebrikler. Kaynak tebrik satırları (`HedefTebrigi`)
 * — hedef geçilince sipariş çekiminden sonra açılır, hedef × dönem başına TEK.
 * Kâr tebriği yalnız `satis.kar.gor` ile; izinsiz kullanıcıya boş liste. Yazmaz.
 */
export async function guncelTebrikler(): Promise<GorunenTebrik[]> {
  if (!(await izinVarMi("satis.gor"))) return [];
  const karGorunur = await izinVarMi("satis.kar.gor");
  const an = new Date();
  const kosul = HEDEF_DONEMLERI.map((donem) => ({ donemBasi: hedefPenceresi(donem, an).ilkGun, hedef: { donem, ...(karGorunur ? {} : { olcut: { not: "NET2" as const } }) } }));
  try {
    const satirlar = await prisma.hedefTebrigi.findMany({ where: { OR: kosul }, orderBy: { createdAt: "asc" }, select: { id: true, hedef: { select: { olcut: true, donem: true } } } });
    return satirlar.map((s) => ({ id: s.id, olcut: s.hedef.olcut, donem: s.hedef.donem }));
  } catch (hata) {
    console.error("[hedef-tebrik] tebrikler okunamadı:", hata);
    return [];
  }
}
