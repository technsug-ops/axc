import { getTranslations } from "next-intl/server";

import { sayfaIzni } from "@/lib/yetki";
import { Yukleyici } from "./yukleyici";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("iceAktarma") };
}

export default async function IceAktarmaSayfasi() {
  await sayfaIzni("veri.aktar");

  const t = await getTranslations("IceAktarma");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          {t("aciklamaMetni")}
        </p>
      </div>

      <Yukleyici />
    </div>
  );
}
