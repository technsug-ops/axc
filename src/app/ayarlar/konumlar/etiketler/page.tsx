import { getTranslations } from "next-intl/server";
import Link from "next/link";
import QRCode from "qrcode";

import { GeriBaglanti } from "@/components/baglanti";
import { prisma } from "@/lib/prisma";

import { YazdirButonu } from "./yazdir-butonu";

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
  return { title: tBaslik("rafEtiketleri") };
}

/**
 * Raf QR etiketleri — toplu yazdırma görünümü.
 *
 * QR içeriği = raf kodunun kendisi (örn. "A-01"). Böylece etiketi okuttuğunuzda
 * doğrudan raf kodu gelir; ayrı bir çözümleme tablosuna gerek kalmaz.
 *
 * SVG'ler SUNUCUDA üretilir (qrcode paketi). Sayfa hiç JavaScript yüklemeden
 * yazdırılabilir; yazıcıya en temiz giden yol budur.
 */
export default async function RafEtiketleriSayfasi() {
  const konumlar = await prisma.location.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });

  const t = await getTranslations("Raf");

  const etiketler = await Promise.all(
    konumlar.map(async (konum) => ({
      id: konum.id,
      code: konum.code,
      name: konum.name,
      svg: await QRCode.toString(konum.code, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
      }),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <GeriBaglanti href="/ayarlar/konumlar">{t("baslik")}</GeriBaglanti>
          <h1 className="mt-1 text-2xl font-semibold">
            {t("etiketlerBasligi")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("etiketlerOzeti", { sayi: etiketler.length })}
          </p>
        </div>
        <YazdirButonu />
      </div>

      {etiketler.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center print:hidden">
          <p className="font-medium">{t("aktifRafYok")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.rich("aktifRafYokIpucu", {
              baglanti: (parca) => (
                <Link
                  href="/ayarlar/konumlar"
                  className="underline underline-offset-4"
                >
                  {parca}
                </Link>
              ),
            })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-4 print:gap-2">
          {etiketler.map((etiket) => (
            <div
              key={etiket.id}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border border-black/30 p-3 text-center"
            >
              <div
                className="w-full max-w-32 [&>svg]:h-auto [&>svg]:w-full"
                // SVG sunucuda qrcode paketiyle üretildi; dış girdi yok.
                dangerouslySetInnerHTML={{ __html: etiket.svg }}
              />
              <div className="font-mono text-sm font-bold">{etiket.code}</div>
              {etiket.name ? (
                <div className="text-xs leading-tight text-black/60">
                  {etiket.name}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
