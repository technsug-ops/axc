import { prisma } from "@/lib/prisma";
import type { TahsisBaslangici, TahsisProjesi } from "@/app/giderler/tahsis-bolumu";

/** Gider formunun proje seçenekleri — ada göre. */
export async function tahsisProjeleri(): Promise<TahsisProjesi[]> {
  return prisma.ortaklikProjesi.findMany({ select: { id: true, ad: true }, orderBy: { ad: "asc" } });
}

/** Düzenleme formu giderin MEVCUT tahsisiyle açılır — açıp kaydetmek onu silmesin. */
export async function giderTahsisBaslangici(expenseId: string): Promise<TahsisBaslangici> {
  const satirlar = await prisma.ortaklikGiderTahsisi.findMany({ where: { expenseId }, select: { projeId: true, payYuzdesi: true }, orderBy: { createdAt: "asc" } });
  const kip = satirlar.length === 0 ? "yok" : satirlar.length === 1 ? "tek" : "cok";
  return { kip, satirlar: satirlar.map((s) => ({ projeId: s.projeId, pay: String(Number(s.payYuzdesi)) })) };
}
