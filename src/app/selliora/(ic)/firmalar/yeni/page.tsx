import { getTranslations } from "next-intl/server";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { YeniFirmaFormu } from "./yeni-firma-formu";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("yeniFirma") };
}

/** YENİ FİRMA — Selliora yönetim katmanı (K303 4c-2). Açılış `lib/firma-acilisi.ts` gövdesinde. */
export default async function YeniFirmaSayfasi() {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  return (
    <div className="space-y-4">
      <div>
        <ListeyeDon href="/selliora/firmalar">{t("firmalar")}</ListeyeDon>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniFirma")}</h1>
      </div>
      <YeniFirmaFormu />
    </div>
  );
}
