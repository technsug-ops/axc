import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { oturumdakiKullanici } from "@/lib/oturum";
import { prisma } from "@/lib/prisma";

import { ParolaFormu } from "./parola-formu";

/**
 * Parola değiştirme. YETKİ İSTEMEZ — bkz. actions.ts başlığı.
 * Giriş yoksa giriş ekranına döner.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("parolaDegistir") };
}

export default async function ParolaDegistirSayfasi() {
  const kullanici = await oturumdakiKullanici();
  if (!kullanici) redirect("/giris");

  const kayit = await prisma.user.findUnique({
    where: { id: kullanici.id },
    select: { mustChangePassword: true },
  });

  const t = await getTranslations("ParolaDegistir");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">
          {kayit?.mustChangePassword ? t("zorunluMetin") : t("aciklamaMetni")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{kullanici.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <ParolaFormu />
        </CardContent>
      </Card>
    </div>
  );
}
