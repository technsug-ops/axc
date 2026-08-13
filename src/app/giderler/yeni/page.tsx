import Link from "next/link";
import { sayfaIzni } from "@/lib/yetki";
import { getTranslations } from "next-intl/server";

import { GeriBaglanti } from "@/components/baglanti";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tarihGirdisi } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";

import { GiderFormu, type KategoriSecenegi } from "../gider-formu";

/**
 * TARİH ÜRETEN SAYFA — HER İSTEKTE YENİDEN ÇİZİLİR.
 *
 * Bu sayfa forma "bugün"ü yazıyor. Varsayılan (statik) kipte Next sayfayı
 * derleme anında bir kez üretir ve DERLEME GÜNÜ forma gömülü kalır: eylülde
 * kira girerken tarih alanında ağustos görünür. Üretim derlemesinde
 * doğrulandı — `value="2026-08-10"` çıktının içine yazılmıştı.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("yeniGider") };
}

export default async function YeniGiderSayfasi() {
  await sayfaIzni("gider.yaz");

  const t = await getTranslations("Gider");

  const kayitlar = await prisma.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const kategoriler: KategoriSecenegi[] = kayitlar.map((k) => ({
    id: k.id,
    ad: k.name,
    // "20.00" yerine "20" — form alanında okunur dursun.
    kdvOrani: String(Number(k.defaultVatRate.toString())),
    uyariAnahtari: k.warningKey,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <GeriBaglanti href="/giderler">{t("baslik")}</GeriBaglanti>
        <h1 className="mt-1 text-2xl font-semibold">{t("yeniGider")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {kategoriler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{t("kategoriYokBaslik")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("kategoriYokIpucu")}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/giderler">{t("baslik")}</Link>
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent>
            <GiderFormu
              kategoriler={kategoriler}
              bugun={tarihGirdisi(new Date())}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
