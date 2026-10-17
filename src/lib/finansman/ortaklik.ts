import type { Prisma } from "@/generated/prisma/client";

/** Bağ kaynağın bütün hareketlerini katılıma bağlar; parasal hareketler aynı Finansman defterinde kalır. */
export async function finansmanBagla(tx: Prisma.TransactionClient, katilimId: string, finansmanId: string) {
  const katilim = await tx.ortaklikKatilimi.findUnique({ where: { id: katilimId }, include: { proje: true } });
  const kaynak = await tx.finansman.findUnique({ where: { id: finansmanId } });
  if (!katilim || !kaynak) throw new Error("BAG_KAYIT_YOK");
  if (kaynak.birim !== katilim.proje.currency) throw new Error("BAG_BIRIM");
  if (!((kaynak.tur === "SERMAYE" && katilim.sermaye) || (kaynak.tur === "ORTAK_BORCU" && katilim.finansman))) throw new Error("BAG_KATKI");
  // Koşullu yazım: eşzamanlı ikinci bağlama sayım 0 döner ve reddedilir.
  const sonuc = await tx.finansman.updateMany({ where: { id: finansmanId, ortaklikKatilimiId: null }, data: { ortaklikKatilimiId: katilimId } });
  if (sonuc.count !== 1) throw new Error("BAG_ZATEN_VAR");
  return { projeId: katilim.projeId, ortakId: katilim.ortakId };
}

/**
 * Yanlış bağ ÇÖZÜLEBİLİR (kullanıcı kararı 17.10.2026). Hareketler yerinde kalır —
 * bağ bir etikettir, para kaydı değil. Eski bağ ize yazılır ki «bu kaynak önce
 * hangi projedeydi» sorusu cevapsız kalmasın.
 * ⛔ AÇILIŞ ŞARTI: ortaklık dönemi KESİN kapanınca (Aşama 4) kapanmış döneme
 * hareketi giren bağ çözülemez olur — kesinleşmiş hak hesabının kaynağı kaymasın.
 */
export async function finansmanBagCoz(tx: Prisma.TransactionClient, finansmanId: string) {
  const kaynak = await tx.finansman.findUnique({ where: { id: finansmanId }, include: { ortaklikKatilimi: true } });
  if (!kaynak || !kaynak.ortaklikKatilimi) throw new Error("BAG_KAYIT_YOK");
  const sonuc = await tx.finansman.updateMany({ where: { id: finansmanId, ortaklikKatilimiId: kaynak.ortaklikKatilimiId }, data: { ortaklikKatilimiId: null } });
  if (sonuc.count !== 1) throw new Error("BAG_KAYIT_YOK");
  return { katilimId: kaynak.ortaklikKatilimi.id, projeId: kaynak.ortaklikKatilimi.projeId, ortakId: kaynak.ortaklikKatilimi.ortakId };
}
