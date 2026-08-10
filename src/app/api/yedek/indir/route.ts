import { get } from "@vercel/blob";

/**
 * ============================================================================
 *  ÖZEL YEDEK DOSYASINI İNDİRME
 * ----------------------------------------------------------------------------
 *  Otomatik yedekler ÖZEL (private) olarak saklanıyor: içlerinde satış,
 *  maliyet ve kâr rakamları açık metin duruyor, düz bir adresle okunabilir
 *  olmamalılar.
 *
 *  Özel bir blob'u okumak jeton ister. Jetonu tarayıcıya vermek yerine
 *  dosyayı SUNUCU okuyup akıtıyor — `BLOB_READ_WRITE_TOKEN` hiçbir zaman
 *  istemciye ulaşmıyor.
 *
 *  Yol adı DIŞARIDAN geliyor, bu yüzden sıkı süzülüyor: yalnızca `yedek/`
 *  klasöründeki, beklenen isim kalıbına uyan dosyalar. Aksi hâlde bu uç
 *  nokta depodaki her şeyi okutan bir kapı olurdu.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

/** selliora-2026-08-10.json — başka hiçbir şey. */
const AD_KALIBI = /^selliora-\d{4}-\d{2}-\d{2}\.json$/;

export async function GET(istek: Request) {
  const ad = new URL(istek.url).searchParams.get("ad") ?? "";

  if (!AD_KALIBI.test(ad)) {
    return Response.json({ durum: "GECERSIZ_AD" }, { status: 400 });
  }

  try {
    const sonuc = await get(`yedek/${ad}`, { access: "private" });

    // `get` bulunamayınca null döner; ayrıca sonuç statusCode'a göre
    // ayrışıyor — akış yalnızca 200'de var.
    if (!sonuc || sonuc.statusCode !== 200) {
      return Response.json({ durum: "BULUNAMADI" }, { status: 404 });
    }

    return new Response(sonuc.stream, {
      headers: {
        "Content-Type":
          sonuc.headers.get("content-type") ??
          "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${ad}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[yedek-indir] okunamadi:", e);
    return Response.json({ durum: "BULUNAMADI" }, { status: 404 });
  }
}
