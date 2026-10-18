import { prisma } from "@/lib/prisma";
import type { Pencere } from "@/lib/donem";
import { projeGiderSonucu } from "@/lib/ortaklik/gider";

/**
 * İNCE KABUK — pencerede (`spentAt`, raporla aynı eksen) projeye tahsis edilmiş
 * giderleri okur, `projeGiderSonucu`nu çağırır. Kural burada yazılmaz.
 */
export async function projeGiderleriGetir(projeId: string, pencere: Pencere) {
  const tahsisler = await prisma.ortaklikGiderTahsisi.findMany({
    where: { projeId, expense: { spentAt: { gte: pencere.baslangic, lt: pencere.bitisHaric } } },
    select: {
      payYuzdesi: true,
      expense: { select: { id: true, spentAt: true, amount: true, vatRate: true, description: true, category: { select: { name: true } } } },
    },
  });
  return projeGiderSonucu(tahsisler.map((t) => ({
    giderId: t.expense.id,
    tarih: t.expense.spentAt,
    kategori: t.expense.category.name,
    aciklama: t.expense.description,
    tutar: Number(t.expense.amount),
    kdvOrani: Number(t.expense.vatRate),
    pay: Number(t.payYuzdesi),
  })));
}
