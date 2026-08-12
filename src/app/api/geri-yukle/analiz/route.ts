import { farkRaporu } from "@/lib/geri-yukle";
import { mevcutSatirSayilari } from "@/lib/geri-yukle-calistir";

import { kaynagiOku, metniCoz } from "../ortak";

/**
 * ============================================================================
 *  GERİ YÜKLEME — ANALİZ (HİÇBİR ŞEY YAZMAZ)
 * ----------------------------------------------------------------------------
 *  "Denetle, sonra yaz" deseni: içe aktarma ekranında olduğu gibi burada da
 *  önce SADECE OKUYAN bir adım var. Kullanıcı ne olacağını görmeden onay
 *  düğmesi belirmez.
 *
 *  Bu uç veritabanına YAZMAZ; yalnızca sayar.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(istek: Request) {
  const kaynak = await kaynagiOku(istek);
  if (!kaynak.tamam) {
    return Response.json({ durum: "KAYNAK_HATASI", ...kaynak }, { status: 400 });
  }

  const cozum = metniCoz(kaynak.metin);
  if (!cozum.tamam) {
    return Response.json(
      { durum: "COZUM_HATASI", hata: cozum.hata },
      { status: 400 },
    );
  }

  const mevcut = await mevcutSatirSayilari();
  const fark = farkRaporu(cozum.yedek, mevcut);

  return Response.json({
    durum: "TAMAM",
    kaynakAdi: kaynak.kaynakAdi,
    boyutBayt: Buffer.byteLength(kaynak.metin, "utf8"),
    onizleme: {
      surum: cozum.yedek.surum,
      olusturulmaAni: cozum.yedek.olusturulmaAni,
      kargoTarifesiHaric: cozum.yedek.kargoTarifesiHaric,
    },
    fark,
  });
}
