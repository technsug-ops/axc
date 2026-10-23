// Arka plan işi: küçük veritabanı havuzu (K332 — gerekçe lib/arka-plan-havuzu.ts).
import "@/lib/arka-plan-havuzu";
import { NextRequest, NextResponse } from "next/server";

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

/**
 * K325-⑦b — kâr tazelemenin bütçesi: istek başından 45 sn. Kalan 15 sn kalp
 * atışı ve bağlantı kapatma için; 60 sn dolarsa Vercel işlemi KESER ve kalp
 * atışı hiç yazılmaz (22.10–23.10 arızası, bkz. `butceliTazele`).
 */
const KAR_TAZELEME_BUTCESI_MS = 45_000;

export async function GET(istek: NextRequest) {
  const baslangic = Date.now();
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const dbAdresi = process.env.DATABASE_URL?.trim() ?? "";
  if (dbAdresi === "") {
    return NextResponse.json({ hata: "VERITABANI_TANIMSIZ" }, { status: 500 });
  }
  const ozet = await hbHakedisCekimKos({ yaz: true, dbAdresi, karTazelemeBitis: baslangic + KAR_TAZELEME_BUTCESI_MS });
  /* K264: «atlandı» 200 DEĞİL 503 — zamanlayıcının yeşili «koştu» demek olsun. */
  return NextResponse.json(ozet, { status: "atlandi" in ozet ? 503 : 200 });
}
