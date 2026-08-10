import { getTranslations } from "next-intl/server";

import {
  listeGecerliMi,
  listeSayfasi,
  LISTELER,
} from "@/lib/disa-aktarma/listeler";
import { indirmeBasliklari, xlsxUret } from "@/lib/disa-aktarma/xlsx";

/**
 * LİSTE DIŞA AKTARMA — /api/disa-aktarma/<liste>?<ekrandaki filtreler>
 *
 * Sorgu dizesi ekrandan aynen gelir; indirilen dosya EKRANDA GÖRÜLENİ taşır.
 * `liste=tumu` tüm listeleri tek dosyada, her biri ayrı sayfada verir.
 */
export const dynamic = "force-dynamic";

export async function GET(
  istek: Request,
  { params }: { params: Promise<{ liste: string }> },
) {
  const { liste } = await params;
  const t = await getTranslations("DisaAktarma");
  const url = new URL(istek.url);

  const parametreler: Record<string, string | undefined> = {};
  for (const [anahtar, deger] of url.searchParams) parametreler[anahtar] = deger;

  if (liste === "tumu") {
    const sayfalar = [];
    for (const anahtar of LISTELER) {
      // Tam dökümde filtre uygulanmaz: amaç her şeyi vermek.
      sayfalar.push(await listeSayfasi(anahtar, {}));
    }
    const icerik = await xlsxUret(sayfalar);
    return new Response(new Uint8Array(icerik), {
      headers: indirmeBasliklari(`${t("tumDosyaAdi")}.xlsx`),
    });
  }

  if (!listeGecerliMi(liste)) {
    return new Response(t("bilinmeyenListe"), { status: 404 });
  }

  const sayfa = await listeSayfasi(liste, parametreler);
  const icerik = await xlsxUret([sayfa]);

  return new Response(new Uint8Array(icerik), {
    headers: indirmeBasliklari(`${sayfa.ad}.xlsx`),
  });
}
