import { getTranslations } from "next-intl/server";
import { GeriBaglanti } from "@/components/baglanti";

import { kartOlustur } from "../actions";
import { KartFormu } from "../kart-formu";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yeniKart") };
}

export default async function YeniKartSayfasi() {
  const t = await getTranslations("Kart");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/kartlar">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniKart")}</h1>
      </div>

      <KartFormu action={kartOlustur} gonderEtiketi={t("kartiKaydet")} />
    </div>
  );
}
