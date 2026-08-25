import { notFound } from "next/navigation";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Card, CardContent } from "@/components/ui/card";
import { tarihGirdisi } from "@/lib/bicim";
import { gunMetni } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import { GiderFormu, type KategoriSecenegi } from "../../gider-formu";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("giderDuzenle") };
}

export default async function GiderDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("gider.yaz");

  const { id } = await params;
  const t = await getTranslations("Gider");

  const [gider, kayitlar] = await Promise.all([
    prisma.expense.findUnique({ where: { id } }),
    prisma.expenseCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!gider) notFound();

  // Pasif kategoriler listede DURUR — geçmiş gider kategorisiz kalmasın.
  /**
   * AKTİF KARTLAR — gider kartla ödenebilsin diye (25.08.2026).
   * ⚠ Yalnız aktif olanlar: pasife alınmış bir karta yeni borç yazılmaz.
   */
  const kartlar = (
    await prisma.creditCard.findMany({
      where: { isActive: true },
      select: { id: true, label: true },
      orderBy: { label: "asc" },
    })
  ).map((k) => ({ id: k.id, ad: k.label }));
  const kategoriler: KategoriSecenegi[] = kayitlar
    .filter((k) => k.isActive || k.id === gider.categoryId)
    .map((k) => ({
      id: k.id,
      ad: k.name,
      kdvOrani: String(Number(k.defaultVatRate.toString())),
      uyariAnahtari: k.warningKey,
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/giderler">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("gideriDuzenle")}</h1>
      </div>

      <Card>
        <CardContent>
          <GiderFormu
            kartlar={kartlar}
            kategoriler={kategoriler}
            bugun={tarihGirdisi(new Date())}
            baslangic={{
              id: gider.id,
              // İş tarihleri UTC gece yarısı saklanır; girdi biçimine
              // yerel saatten değil, UTC gününden çevrilir.
              spentAt: gunMetni(gider.spentAt),
              categoryId: gider.categoryId,
              amount: String(Number(gider.amount.toString())),
              currency: gider.currency,
              vatRate: String(Number(gider.vatRate.toString())),
              description: gider.description ?? "",
              creditCardId: gider.creditCardId ?? "",
              installmentCount: String(gider.installmentCount),
              /**
               * ⚠ `null` -> `""` (BELİRTİLMEDİ). Alan 25.08.2026'da açıldı;
               * ondan önceki giderlerde yöntem BİLİNMİYOR. Burada "NAKIT"
               * yazılsaydı sistem bilmediği bir şeyi seçilmiş gibi
               * gösterirdi — ve kullanıcı bir daha hiç sorgulamazdı.
               */
              odemeYontemi: gider.odemeYontemi ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
