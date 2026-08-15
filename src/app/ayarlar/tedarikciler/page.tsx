import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import { TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bicimlendirici } from "@/lib/bicim";
import { prisma } from "@/lib/prisma";
import { acikAlacakToplami } from "@/lib/tazminat";

import { TedarikciFormu } from "./tedarikci-formu";
import {
  TedarikciSatiri,
  type TedarikciSatiriVerisi,
} from "./tedarikci-satiri";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 * Statik kipte derleme anında veritabanına bağlanmak gerekirdi; Vercel yapı
 * makinesi uzak MySQL'e erişemeyebilir ve zaten liste ekranı canlı veri
 * göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("tedarikciler") };
}

export default async function TedarikcilerSayfasi() {
  await sayfaIzni("ayar.yaz");

  const t = await getTranslations("Tedarikci");

  const bicim = await bicimlendirici();

  const kayitlar = await prisma.supplier.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { purchases: true } },
      // Açık alacak tedarikçi kartında görünsün: "bu firmadan ne
      // alacağım var?" sorusu ayrı ekrana gitmeden cevaplansın (#9).
      compensations: { select: { status: true, amount: true, currency: true } },
    },
  });

  const tedarikciler: TedarikciSatiriVerisi[] = kayitlar.map((s) => ({
    id: s.id,
    ad: s.name,
    kod: s.code,
    iletisim: s.contact,
    aktif: s.isActive,
    alimSayisi: s._count.purchases,
    acikAlacak: acikAlacakToplami(
      s.compensations.map((c) => ({
        durum: c.status,
        tutar: Number(c.amount.toString()),
        paraBirimi: c.currency,
      })),
    ).map((a) => bicim.para(a.tutar, a.paraBirimi)),
  }));

  // Kodu olmayan AKTİF tedarikçiyle yeni alım girilemez: alım numarası
  // kodu içeriyor. Sessizce beklemek yerine ekranda söylenir (#5).
  const kodsuzSayi = tedarikciler.filter(
    (s) => s.aktif && s.kod === null,
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
      </div>

      {kodsuzSayi > 0 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("kodsuzBaslik", { sayi: kodsuzSayi })}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
            {t("kodsuzMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniTedarikci")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TedarikciFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("tanimliTedarikciler", { sayi: tedarikciler.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tedarikciler.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {tedarikciler.map((s) => (
                <TedarikciSatiri key={s.id} tedarikci={s} />
              ))}
            </div>
          )}

          <p className="text-muted-foreground text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
