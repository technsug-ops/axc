import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { sayfaIzni } from "@/lib/yetki";
import { tamYetkiliRolIdleri } from "@/lib/yetki/koruma";

import { KullaniciFormu } from "./kullanici-formu";
import { KullaniciSatiri, type KullaniciSatiriVerisi } from "./kullanici-satiri";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  KULLANICILAR
 * ----------------------------------------------------------------------------
 *  Parolayı SAHİP atar, kullanıcı ilk girişte değiştirir (e-posta altyapısı
 *  yok — karar 13.08.2026).
 *
 *  SON SAHİP KİLİDİ: sistemde tam yetkili tek kullanıcı kaldıysa onun rolü
 *  düşürülemez ve pasife alınamaz. Ekranda düğme kapalı VE sunucu ayrıca
 *  reddediyor — düğme gizlemek koruma değildir.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("kullanicilar") };
}

export default async function KullanicilarSayfasi() {
  const baglam = await sayfaIzni("kullanici.yonet");
  const t = await getTranslations("Kullanici");
  const bicim = await bicimlendirici();

  const [kayitlar, roller, tamYetkili] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        userCompanyRoles: {
          select: { id: true, roleId: true, role: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    prisma.role.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    tamYetkiliRolIdleri(),
  ]);

  // Kaç tam yetkili AKTİF kullanıcı var — "son sahip" kilidi buna bakar.
  const sahipSayisi = kayitlar.filter(
    (k) =>
      k.isActive &&
      k.userCompanyRoles.some((u) => tamYetkili.includes(u.roleId)),
  ).length;

  const kullanicilar: KullaniciSatiriVerisi[] = kayitlar.map((k) => {
    const uyelik = k.userCompanyRoles[0];
    const sahipMi = uyelik ? tamYetkili.includes(uyelik.roleId) : false;
    return {
      id: k.id,
      uyelikId: uyelik?.id ?? null,
      eposta: k.email,
      ad: k.name,
      rolId: uyelik?.roleId ?? null,
      rolAdi: uyelik?.role.name ?? null,
      aktif: k.isActive,
      parolaDegismeli: k.mustChangePassword,
      sonGiris: k.lastLoginAt ? bicim.tarih(k.lastLoginAt) : null,
      kendisiMi: k.id === baglam.kullaniciId,
      // SON SAHİP: tek tam yetkili aktif kullanıcı buysa kilitli.
      sonSahipMi: sahipMi && k.isActive && sahipSayisi === 1,
    };
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {sahipSayisi === 1 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("tekSahipBaslik")}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
            {t("tekSahipMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniKullanici")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("parolaNotu")}</p>
        </CardHeader>
        <CardContent>
          <KullaniciFormu roller={roller} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tanimliKullanicilar", { sayi: kullanicilar.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y rounded-lg border">
            {kullanicilar.map((k) => (
              <KullaniciSatiri key={k.id} kullanici={k} roller={roller} />
            ))}
          </div>
          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
