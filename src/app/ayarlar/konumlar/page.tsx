import { getTranslations } from "next-intl/server";
import { sayfaIzni } from "@/lib/yetki";
import Link from "next/link";
import { Merge, Pencil, QrCode, TriangleAlert } from "lucide-react";

import { DurumDegistirButonu } from "@/components/durum-degistir-butonu";
import { KopyalanabilirKod } from "@/components/kopyalanabilir-kod";
import { SatirKarti, SatirListesi } from "@/components/satir-karti";
import { Badge } from "@/components/ui/badge";
import { rafKoduGecerliMi } from "@/lib/kimlik";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

import { konumDurumDegistir } from "./actions";
import { KonumFormu } from "./konum-formu";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";

/**
 * VERİTABANI OKUYAN SAYFA — HER İSTEKTE ÇİZİLİR.
 *
 * Statik kipte Next bu sayfayı DERLEME ANINDA üretmeye çalışır ve o sırada
 * veritabanına bağlanması gerekir. Derlemenin veritabanına bağımlı olması
 * kırılgandır (Vercel yapı makinesi uzak MySQL'e erişemeyebilir) ve zaten
 * bir ERP'de liste ekranı canlı veri göstermelidir.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("rafKonumlari") };
}

export default async function KonumlarSayfasi() {
  await sayfaIzni("ayar.yaz");

  const konumlar = await prisma.location.findMany({
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
    include: { _count: { select: { variants: true } } },
  });

  const t = await getTranslations("Raf");
  const ortak = await getTranslations("Ortak");

  function eylemler(konum: (typeof konumlar)[number]) {
    return (
      <>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/ayarlar/konumlar/${konum.id}/duzenle`}>
            <Pencil />
            {ortak("duzenle")}
          </Link>
        </Button>
        <DurumDegistirButonu
          kayitId={konum.id}
          aktifMi={konum.isActive}
          action={konumDurumDegistir}
        />
      </>
    );
  }

  // Standarda uymayan kodlar ÇALIŞMAYA DEVAM EDER — geçmişi bozmamak için
  // zorla düzeltilmez. Ama görünür olur: kod değişirse etiket yeniden basılır,
  // bu yüzden karar kullanıcınındır.
  const bicimsizSayi = konumlar.filter((k) => !rafKoduGecerliMi(k.code)).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">{t("aciklamaMetni")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/ayarlar/konumlar/birlestir">
              <Merge />
              {t("birlestir")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/ayarlar/konumlar/etiketler">
              <QrCode />
              {t("qrEtiketleri")}
            </Link>
          </Button>
        </div>
      </div>

      {bicimsizSayi > 0 ? (
        <div className={`rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("bicimsizBaslik", { sayi: bicimsizSayi })}
          </p>
          <p className={`mt-1 text-sm ${DURUM_YAZISI.uyari}`}>
            {t("bicimsizMetin")}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("yeniRaf")}</CardTitle>
        </CardHeader>
        <CardContent>
          <KonumFormu />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("tanimliRaflar", { sayi: konumlar.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {konumlar.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">{t("bosBaslik")}</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {t("bosIpucu")}
              </p>
            </div>
          ) : (
            /*
             * SATIR KARTI (K235-②): raf KODU manşet — depoda aranan şey o.
             * Ad, varyant sayısı ve biçim uyarısı bağlamda; durum ve
             * düzenle/pasife al sağda.
             */
            <SatirListesi>
              {konumlar.map((konum) => (
                <SatirKarti
                  key={konum.id}
                  baslik={
                    <span className="flex flex-wrap items-center gap-2">
                      <KopyalanabilirKod deger={konum.code} etiket={t("rafKodu")} />
                      {rafKoduGecerliMi(konum.code) ? null : (
                        <Badge
                          variant="outline"
                          className={`${DURUM_YAZISI.uyari} border-current/40`}
                        >
                          {t("bicimsizRozet")}
                        </Badge>
                      )}
                    </span>
                  }
                  baglam={[
                    konum.name,
                    `${t("varyantSutunu")}: ${konum._count.variants}`,
                  ]}
                  sag={
                    <>
                      {konum.isActive ? (
                        <Badge variant="secondary">{ortak("aktif")}</Badge>
                      ) : (
                        <Badge variant="outline">{ortak("pasif")}</Badge>
                      )}
                      {eylemler(konum)}
                    </>
                  }
                />
              ))}
            </SatirListesi>
          )}

          <p className="text-muted-foreground mt-3 text-xs">{t("listeNotu")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
