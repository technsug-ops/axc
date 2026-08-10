import { getTranslations } from "next-intl/server";

import { sablonMetinleri } from "@/lib/ice-aktarma/metinler";
import { sablonVerisi } from "@/lib/ice-aktarma/referans";
import { sablonUret } from "@/lib/ice-aktarma/sablon";

/**
 * ŞABLON İNDİRME.
 *
 * Route handler kullanılıyor çünkü çıktı bir DOSYA; Server Action'lar
 * ikili içerik döndürmek için uygun değil.
 *
 * Şablon her indirildiğinde YENİDEN üretilir: "Listeler" sayfası sistemdeki
 * güncel kategori, raf ve kanal hesaplarını taşımalı. Statik bir dosya
 * olsaydı yeni açtığınız raf şablonda görünmez, siz de o rafı yazdığınız
 * için dosya reddedilirdi.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const t = await getTranslations("IceAktarma");

  const [metinler, veri] = await Promise.all([
    sablonMetinleri(),
    sablonVerisi(),
  ]);

  const icerik = await sablonUret(metinler, veri);
  const dosyaAdi = `${t("baslik").replace(/\s+/g, "-").toLocaleLowerCase("tr")}.xlsx`;

  return new Response(new Uint8Array(icerik), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(dosyaAdi)}"`,
      "Cache-Control": "no-store",
    },
  });
}
