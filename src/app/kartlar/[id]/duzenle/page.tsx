import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { kartGuncelle } from "../../actions";
import { KartFormu, type KartGirdisi } from "../../kart-formu";

export default async function KartDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const kart = await prisma.creditCard.findUnique({ where: { id } });
  if (!kart) notFound();

  const baslangic: KartGirdisi = {
    label: kart.label,
    bankName: kart.bankName ?? "",
    last4: kart.last4,
    holderName: kart.holderName ?? "",
    currency: kart.currency,
    creditLimitAmount: kart.creditLimitAmount
      ? kart.creditLimitAmount.toString()
      : "",
    creditLimitCurrency: kart.creditLimitCurrency ?? kart.currency,
    statementDay: kart.statementDay ? String(kart.statementDay) : "",
    dueDay: kart.dueDay ? String(kart.dueDay) : "",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/kartlar/${kart.id}`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          ← {kart.label}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Kartı Düzenle</h1>
      </div>

      <KartFormu
        action={kartGuncelle}
        baslangic={baslangic}
        kartId={kart.id}
        gonderEtiketi="Değişiklikleri Kaydet"
      />
    </div>
  );
}
