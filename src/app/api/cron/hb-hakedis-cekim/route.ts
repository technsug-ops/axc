import { NextRequest, NextResponse } from "next/server";
import { donguDurumKodu, zamanlanmisIsDongusu } from "@/lib/firma-dongusu";

import { hbHakedisCekimKos } from "../../../../../scripts/canli-hb-hakedis-cekim";

/**
 * ============================================================================
 *  K221 — HB HAKEDİŞ ÇEKİMİNİN SUNUCU UCU (19.09.2026)
 * ----------------------------------------------------------------------------
 *  K166/K220'nin aynı deseni: çekirdek (`hbHakedisCekimKos`) Vercel'de
 *  koşar, dış bir zamanlayıcı çağırır. Günlük kadans yeterli — TY'deki
 *  gibi ödeme dönemleri hafta/ay mertebesinde.
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış
 *  tutan istek **404** alır — rotanın varlığı bile sızmaz.
 *
 *  ⚠ İDEMPOTENT: rowKey dedup'tan geçer, çift tetik zararsız.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
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
  /**
   * K303 Aşama 3b: iş firma firma döner (`lib/firma-dongusu.ts`). Kanal anahtarı
   * bugün tek takım olduğu için yalnız ANAHTAR FİRMASINDA koşar; ötekiler
   * «ATLANDI · anahtar tanımlı değil» yazar. Her firma kendi bağlamında koşar.
   */
  const sonuc = await zamanlanmisIsDongusu({ kanalAnahtariGerekir: true }, (companyId) =>
    hbHakedisCekimKos({ yaz: true, dbAdresi, companyId }),
  );
  /* K264: «atlandı» 200 DEĞİL 503 — zamanlayıcının yeşili «koştu» demek olsun. */
  return NextResponse.json(sonuc, { status: donguDurumKodu(sonuc, (o) => "atlandi" in o) });
}
