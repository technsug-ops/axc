import { NextRequest, NextResponse } from "next/server";

import { tyHakedisCekimKos } from "../../../../../scripts/canli-ty-hakedis-cekim";
import { tyKargoGercekYazKos } from "../../../../../scripts/canli-ty-kargo-gercek-olcum";

/**
 * ============================================================================
 *  K220 — TY HAKEDİŞ + GERÇEK KARGO ÇEKİMİNİN SUNUCU UCU (19.09.2026)
 * ----------------------------------------------------------------------------
 *  K166'nın (`ty-cekim`) aynı deseni: çekirdek (`tyHakedisCekimKos` ·
 *  `tyKargoGercekYazKos`) Vercel'de koşar, dış bir zamanlayıcı çağırır.
 *
 *  ⚠ İKİ İŞ TEK UÇTA: ikisi de aynı TY hakediş/finans API'sinden besleniyor
 *  ve ikisi de GÜNLÜK kadans yeterli — ödeme dönemleri hafta/ay mertebesinde,
 *  sipariş çekimindeki gibi dakika hassasiyeti GEREKMİYOR. Ayrı uca
 *  bölünmedi: aynı işin genişlemesi (bkz. `ty-cekim.yml` başlığındaki
 *  "içerik adından geniş" istisnası).
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış
 *  tutan istek **404** alır — rotanın varlığı bile sızmaz.
 *
 *  ⚠ İKİSİ DE İDEMPOTENT: hakediş rowKey dedup'ından, kargo yalnız BOŞ
 *  `cargoAmount`a yazmaktan geçer — çift tetik zararsız (ölçüldü 19.09.2026,
 *  aynı gün ikinci koşum 0 yeni / 0 tazelenen / 0 yazılan verdi).
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/** İlk koşum (45 gün, 12 tip × 3 pencere) ölçüldü ~40-70sn; Hobby tavanı 60
 *  — Pro planda 300'e çıkar, günlük tekrarlarda pencere zaten dar kalır. */
export const maxDuration = 60;

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const dbAdresi = process.env.DATABASE_URL?.trim() ?? "";
  if (dbAdresi === "") {
    return NextResponse.json({ hata: "VERITABANI_TANIMSIZ" }, { status: 500 });
  }
  const hakedis = await tyHakedisCekimKos({ yaz: true, dbAdresi });
  const kargo = await tyKargoGercekYazKos({ yaz: true, dbAdresi });
  /* K264: iki işten biri «atlandı» ise 503 — zamanlayıcının yeşili «koştu» demek olsun. */
  const dusen = [hakedis, kargo].filter((o) => "atlandi" in o).length;
  return NextResponse.json({ hakedis, kargo, dusen }, { status: dusen > 0 ? 503 : 200 });
}
