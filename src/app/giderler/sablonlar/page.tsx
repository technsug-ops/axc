import { getTranslations } from "next-intl/server";

import { sayfaIzni } from "@/lib/yetki";
import { GeriBaglanti } from "@/components/baglanti";
import { ListeKarti } from "@/components/liste-karti";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { ayKaydir, gunDegeri, isTakvimGunu } from "@/lib/donem";
import { prisma } from "@/lib/prisma";

import type { KategoriSecenegi } from "../gider-formu";
import { SablonEylemleri } from "./sablon-eylemleri";
import { SablonFormu } from "./sablon-formu";

/**
 * "BU AY EKLENDİ Mİ?" ZAMANA BAĞLI — HER İSTEKTE YENİDEN ÇİZİLİR.
 *
 * Statik kipte sayfa yalnızca bir kayıt değiştiğinde tazelenir; ay dönümü
 * bir kayıt değişikliği DEĞİLDİR. Eylülün 1'inde ekran hâlâ "bu ay eklendi"
 * der ve kirayı bir daha girmenize izin vermezdi.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("giderSablonlari") };
}

export default async function SablonlarSayfasi() {
  await sayfaIzni("gider.yaz");

  const t = await getTranslations("Gider");
  const ortak = await getTranslations("Ortak");
  const bicim = await bicimlendirici();

  // "Bu ay" İŞ saat diliminde çözülür — Almanya'da gece yarısından sonra
  // açılan ekranda ay bir gün erken dönmesin.
  const bugun = isTakvimGunu(new Date());
  const ayBasi = gunDegeri({ yil: bugun.yil, ay: bugun.ay, gun: 1 });
  const sonrakiAy = ayKaydir(bugun.yil, bugun.ay, 1);
  const sonrakiAyBasi = gunDegeri({ ...sonrakiAy, gun: 1 });

  const [sablonlar, kategoriKayitlari] = await Promise.all([
    prisma.expenseTemplate.findMany({
      include: {
        category: { select: { name: true, isFixed: true } },
        // Yalnız BU AY üretilmiş giderler — düğmeyi kapatan koşul.
        expenses: {
          where: { spentAt: { gte: ayBasi, lt: sonrakiAyBasi } },
          select: { id: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const kategoriler: KategoriSecenegi[] = kategoriKayitlari.map((k) => ({
    id: k.id,
    ad: k.name,
    kdvOrani: String(Number(k.defaultVatRate.toString())),
    uyariAnahtari: k.warningKey,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <GeriBaglanti href="/giderler">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("sablonBaslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("sablonAciklama")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sablonEkle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SablonFormu kategoriler={kategoriler} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("sablonSayisi", { sayi: sablonlar.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sablonlar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("sablonBosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("sablonBosIpucu")}
              </p>
            </div>
          ) : (
            sablonlar.map((sablon) => {
              const tutar = Number(sablon.amount.toString());
              const oran = Number(sablon.vatRate.toString());
              return (
                <ListeKarti
                  key={sablon.id}
                  baslik={
                    <span className="flex flex-wrap items-center gap-2">
                      {sablon.name}
                      <Badge variant="outline">
                        {sablon.category.isFixed ? t("sabit") : t("degisken")}
                      </Badge>
                      {!sablon.isActive ? (
                        <Badge variant="secondary">{ortak("pasif")}</Badge>
                      ) : null}
                    </span>
                  }
                  altBaslik={
                    sablon.dayOfMonth
                      ? t("ayinGunu", { gun: sablon.dayOfMonth })
                      : undefined
                  }
                  alanlar={[
                    { etiket: ortak("kategori"), deger: sablon.category.name },
                    {
                      etiket: ortak("tutar"),
                      deger: (
                        <span className="text-base font-semibold">
                          {bicim.para(tutar, sablon.currency)}
                        </span>
                      ),
                    },
                    { etiket: ortak("oran"), deger: `%${oran}` },
                    {
                      etiket: ortak("aciklama"),
                      deger: sablon.description ?? t("aciklamaYok"),
                    },
                  ]}
                  eylemler={
                    <SablonEylemleri
                      sablonId={sablon.id}
                      aktifMi={sablon.isActive}
                      buAyEklendiMi={sablon.expenses.length > 0}
                    />
                  }
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
