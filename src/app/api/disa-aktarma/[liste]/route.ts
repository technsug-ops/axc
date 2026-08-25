import { getTranslations } from "next-intl/server";

import { apiIzni } from "@/lib/yetki";
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
  const red = await apiIzni("veri.aktar");
  if (red) return red;

  const { liste } = await params;
  const t = await getTranslations("DisaAktarma");
  const url = new URL(istek.url);

  const parametreler: Record<string, string | undefined> = {};
  for (const [anahtar, deger] of url.searchParams) parametreler[anahtar] = deger;

  if (liste === "tumu") {
    const sayfalar = [];
    for (const anahtar of LISTELER) {
      // Tam dökümde filtre uygulanmaz: amaç her şeyi vermek.
      /** ⚠ "Tümü" indirmesinde parametre YOK — hepsi bugünün fotoğrafı. */
      const c = await listeSayfasi(anahtar, {});
      if (Array.isArray(c)) sayfalar.push(...c);
      else sayfalar.push(c);
    }
    const icerik = await xlsxUret(sayfalar);
    return new Response(new Uint8Array(icerik), {
      headers: indirmeBasliklari(`${t("tumDosyaAdi")}.xlsx`),
    });
  }

  if (!listeGecerliMi(liste)) {
    return new Response(t("bilinmeyenListe"), { status: 404 });
  }

  /**
   * ⚠ TEK SAYFA DA ÇOK SAYFA DA OLABİLİR (K53-② aralık kipi üç sayfa
   * üretiyor). Dosya adı İLK sayfadan alınır; aralıkta o "Açılış <tarih>"
   * olur ve dosyanın hangi döneme ait olduğu adından okunur.
   */
  const cikti = await listeSayfasi(liste, parametreler);
  const sayfalar = Array.isArray(cikti) ? cikti : [cikti];
  const icerik = await xlsxUret(sayfalar);

  return new Response(new Uint8Array(icerik), {
    headers: indirmeBasliklari(`${sayfalar[0]?.ad ?? liste}.xlsx`),
  });
}
