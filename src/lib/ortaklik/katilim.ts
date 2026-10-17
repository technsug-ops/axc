import type { Prisma } from "@/generated/prisma/client";

/**
 * Ortaklık projeleri Türk lirasıyla açılır (kullanıcı kararı 17.10.2026: «ana ortaklık
 * unsuru Türk lirası olacak, euro hiç kullanılmayabilir»). Sütun KALIR — para tutarının
 * yanında birimi taşınır (anayasa) ve EUR gerekirse yalnız ekrana seçim eklenir.
 * Girdide birim YOK: istemciden gelen bir değer bu sabiti ezemez.
 */
export const PROJE_PARA_BIRIMI = "TRY" as const;

/** `baslangicGunu` = "YYYY-AA-GG". DATE alanı UTC takvim günü olarak saklanır; İstanbul
 *  gece yarısını doğrudan yazmak UTC'de önceki güne düşürürdü. */
export async function projeEkle(tx: Prisma.TransactionClient, girdi: { ad: string; baslangicGunu: string }) {
  return tx.ortaklikProjesi.create({ data: { ad: girdi.ad, baslangic: new Date(`${girdi.baslangicGunu}T00:00:00.000Z`), currency: PROJE_PARA_BIRIMI } });
}

export type Katkilar = { sermaye: boolean; emek: boolean; komisyon: boolean; finansman: boolean };

export async function katilimEkle(tx: Prisma.TransactionClient, girdi: { projeId: string; ortakId: string; sorumluluk: string } & Katkilar) {
  const proje = await tx.ortaklikProjesi.findUnique({ where: { id: girdi.projeId } });
  const ortak = await tx.isOrtagi.findUnique({ where: { id: girdi.ortakId } });
  if (!proje || !ortak) throw new Error("ORTAKLIK_KAYIT_YOK");
  return tx.ortaklikKatilimi.create({ data: girdi });
}

/**
 * Katkı değişikliği bağlı finansmanla çelişemez: sermaye kaynağı bağlıyken
 * «sermaye» kaldırılırsa kaynak, katkısı olmayan bir katılıma ait kalırdı.
 */
export async function katilimGuncelle(tx: Prisma.TransactionClient, id: string, girdi: { sorumluluk: string } & Katkilar) {
  const katilim = await tx.ortaklikKatilimi.findUnique({ where: { id }, include: { finansmanKaynaklari: { select: { tur: true } } } });
  if (!katilim) throw new Error("ORTAKLIK_KAYIT_YOK");
  for (const f of katilim.finansmanKaynaklari) {
    if ((f.tur === "SERMAYE" && !girdi.sermaye) || (f.tur === "ORTAK_BORCU" && !girdi.finansman)) throw new Error("KATKI_BAGLI");
  }
  return { once: { sorumluluk: katilim.sorumluluk, sermaye: katilim.sermaye, emek: katilim.emek, komisyon: katilim.komisyon, finansman: katilim.finansman }, sonra: await tx.ortaklikKatilimi.update({ where: { id }, data: girdi }) };
}

/**
 * Silme yalnız YANLIŞ AÇILMIŞ kayıt içindir: bağlı bir şeyi olan kayıt silinmez
 * (Finansman'daki «hareketi olmayan kaynak silinir» kuralıyla aynı ölçüt).
 * Bağlar veritabanında RESTRICT; burada önceden sayılır ki ekran NEDENİNİ söylesin.
 */
export async function katilimSil(tx: Prisma.TransactionClient, id: string) {
  const k = await tx.ortaklikKatilimi.findUnique({ where: { id }, include: { _count: { select: { finansmanKaynaklari: true } } } });
  if (!k) throw new Error("ORTAKLIK_KAYIT_YOK");
  if (k._count.finansmanKaynaklari) throw new Error("SILINEMEZ_BAGLI");
  await tx.ortaklikKatilimi.delete({ where: { id } });
  return k;
}

export async function projeSil(tx: Prisma.TransactionClient, id: string) {
  const p = await tx.ortaklikProjesi.findUnique({ where: { id }, include: { _count: { select: { katilimlar: true, alimKalemleri: true, kapsamKurallari: true } } } });
  if (!p) throw new Error("ORTAKLIK_KAYIT_YOK");
  if (p._count.katilimlar || p._count.alimKalemleri || p._count.kapsamKurallari) throw new Error("SILINEMEZ_BAGLI");
  await tx.ortaklikProjesi.delete({ where: { id } });
  return p;
}

export async function ortakSil(tx: Prisma.TransactionClient, id: string) {
  const o = await tx.isOrtagi.findUnique({ where: { id }, include: { _count: { select: { katilimlar: true } } } });
  if (!o) throw new Error("ORTAKLIK_KAYIT_YOK");
  if (o._count.katilimlar) throw new Error("SILINEMEZ_BAGLI");
  await tx.isOrtagi.delete({ where: { id } });
  return o;
}
