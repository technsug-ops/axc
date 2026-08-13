import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";
import { IZINLER } from "@/lib/yetki/izinler";

import { RolFormu } from "./rol-formu";
import { RolSatiri, type RolSatiriVerisi } from "./rol-satiri";

/**
 * ============================================================================
 *  ROLLER
 * ----------------------------------------------------------------------------
 *  Roller VERİDİR: yeni rol açılır, izinleri onay kutularıyla düzenlenir.
 *  İzin LİSTESİ ise koddan gelir (lib/yetki/izinler.ts) — kullanıcının
 *  uyduracağı bir izin adının karşılığı olmaz.
 *
 *  İzin değişikliği BİR SONRAKİ İSTEKTE etkilidir; kimsenin yeniden giriş
 *  yapması gerekmez (oturumda rol değil userId taşınıyor).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("roller") };
}

export default async function RollerSayfasi() {
  await sayfaIzni("rol.yonet");
  const t = await getTranslations("Rol");

  const kayitlar = await prisma.role.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isSystem: true,
      isActive: true,
      izinler: { select: { permissionKey: true } },
      _count: { select: { uyelikler: true } },
    },
  });

  const roller: RolSatiriVerisi[] = kayitlar.map((r) => ({
    id: r.id,
    ad: r.name,
    sistemMi: r.isSystem,
    aktif: r.isActive,
    izinler: r.izinler.map((i) => i.permissionKey),
    kullaniciSayisi: r._count.uyelikler,
  }));

  const izinler = IZINLER.map((i) => ({ anahtar: i.anahtar, grup: i.grup }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniRol")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RolFormu izinler={izinler} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tanimliRoller", { sayi: roller.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y rounded-lg border">
            {roller.map((r) => (
              <RolSatiri key={r.id} rol={r} izinler={izinler} />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
