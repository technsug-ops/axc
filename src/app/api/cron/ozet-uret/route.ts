import { NextRequest, NextResponse } from "next/server";
import { donguDurumKodu, zamanlanmisIsDongusu } from "@/lib/firma-dongusu";

import { ozetUretKos } from "@/lib/ozet/orkestrasyon";

/**
 * ============================================================================
 *  K-OZET — GÜNLÜK ÖZET ÜRETİM CRONU (TY/N11/HB İLE AYNI DESEN)
 * ----------------------------------------------------------------------------
 *  Günde bir kez koşar (öneri: 05:00 UTC / 08:00 İstanbul) — birincil tetik
 *  cron-job.org (10.09.2026'dan beri Vercel uçlarını çağıran birincil
 *  mekanizma, bkz. `.github/workflows/ty-cekim.yml`in kendi gerekçesi).
 *  GitHub Actions'a ayrı, günlük bir iş olarak yedek eklenir — bu, 10
 *  dakikalık kanal-çekim işinin İÇİNE EKLENMEZ, çünkü farklı içerik ve
 *  farklı kadans.
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>` — TY/N11/HB ile AYNI sır.
 *  Sır tutmayan istek 404 alır (rotanın varlığı bile sızmaz).
 *
 *  ⚠ İDEMPOTENT: `ozetUretKos` bugünün satırı zaten YAYINDA ise ikinci
 *  tetikte hiçbir şey yapmaz — gerçek API parası ikinci kez harcanmaz.
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

  /**
   * K303 Aşama 3b: özet HER aktif firma için kendi bağlamında üretilir (kanal
   * anahtarı istemez). Özetin kendi «atlandı»sı (bugünkü zaten yayında) bir
   * hata değildir — eskisi gibi 200.
   */
  const sonuc = await zamanlanmisIsDongusu({ kanalAnahtariGerekir: false }, () => ozetUretKos());
  return NextResponse.json(sonuc, { status: donguDurumKodu(sonuc, () => false) });
}
