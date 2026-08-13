import { notFound } from "next/navigation";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { kartGuncelle } from "../../actions";
import { KartFormu, type KartGirdisi } from "../../kart-formu";

export default async function KartDuzenleSayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await sayfaIzni("kart.gor");

  const { id } = await params;
  const t = await getTranslations("Kart");
  const ortak = await getTranslations("Ortak");

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
        <GeriBaglanti href={`/kartlar/${kart.id}`}>{kart.label}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("kartiDuzenle")}</h1>
      </div>

      <KartFormu
        action={kartGuncelle}
        baslangic={baslangic}
        kartId={kart.id}
        gonderEtiketi={ortak("degisiklikleriKaydet")}
      />
    </div>
  );
}
