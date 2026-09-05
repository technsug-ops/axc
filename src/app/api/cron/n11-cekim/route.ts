import { NextRequest, NextResponse } from "next/server";

import { n11CekimKos } from "../../../../../scripts/canli-n11-ice-aktar";

/**
 * ============================================================================
 *  K167-③ — N11 ÇEKİMİNİN SUNUCU UCU: MAKİNEDEN BAĞIMSIZ RUTİN
 * ----------------------------------------------------------------------------
 *  K166'nın (TY ucu) birebir kopyası — Halil 05.09.2026: _"Yapalım."_
 *  AYNI çekirdek (`n11CekimKos` — tek gövde, iki okuyucu) Vercel üzerinde
 *  koşar; GitHub Actions 10 dakikada bir çağırır, Vercel cron günlük yedek.
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış
 *  tutan istek **404** alır — rotanın varlığı bile sızmaz. `CRON_SECRET`
 *  ortamda TANIMSIZSA uç herkese kapalıdır — güvenli varsayılan.
 *
 *  ⚠ N11 anahtarları (N11_APP_KEY/N11_APP_SECRET) Vercel ortamında
 *  TANIMSIZSA çekirdek `{atlandi:"KIMLIK"}` döner — hata değil, kurulum
 *  eksiği; cevapta görünür (sessiz kaçış yok).
 *
 *  ⚠ Pencere parametresi YOK: N11 paket ucu bugün bütün kayıtları veriyor
 *  (ölçüldü 05.09.2026 — 1 sayfa); sayfalama zarf beyanından yürür.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/** TY çekimi ~7-40sn ölçülmüştü; N11 bugün 4 paket — Hobby tavanı 60. */
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
  const ozet = await n11CekimKos({ yaz: true, dbAdresi });
  return NextResponse.json(ozet);
}
