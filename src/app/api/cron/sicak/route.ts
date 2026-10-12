import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  SICAK TUT — SAYFA SUNUCUSUNU VE VERİTABANI BAĞLANTISINI UYANIK TUTAR
 *  (K332, kullanıcı kararı 12.10.2026 «A ve B'yi birlikte»)
 * ----------------------------------------------------------------------------
 *  Ölçüldü (canlı süre izi, 12.10): birkaç dakika boşta kalınca panelin ilk
 *  sorgusu 0,56–0,72 sn, gövdesi 3,4–3,7 sn; sıcakken 0,04 sn ve 1,7–2,6 sn.
 *  Pazaryeri çekimleri dakikada bir geliyor ama paneli UYANDIRMIYOR: o uçlar
 *  `maxDuration = 60` taşıyor ve Vercel farklı ayarlı yolları AYRI sunucu
 *  parçasında topluyor (belge: «routes with differing configurations are
 *  bundled into separate functions»).
 *
 *  ⛔ BU YÜZDEN BU UÇ `maxDuration` TAŞIMAZ — sayfalarla aynı parçaya düşsün
 *  diye. Bir ayar eklenirse uç ayrı parçaya gider ve sessizce işe yaramaz
 *  hâle gelir (bekçi: `cron-yollari:dogrula`).
 *
 *  · Kapı: diğer çekim uçlarıyla AYNI `CRON_SECRET`; yanlış/boş sır 404.
 *  · İş: tek `SELECT 1` — havuzdaki bağlantıyı taze tutar (KAS boştaki
 *    bağlantıyı 120 sn'de, bizim havuz 60 sn'de kapatıyor). Hiçbir şey yazmaz.
 *  · Tetik: cron-job.org, dakikada bir (kullanıcı hesabında kurulur).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const bas = performance.now();
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ durum: "SICAK", veritabaniMs: Math.round(performance.now() - bas), surecYasiSn: Math.round(process.uptime()) });
  } catch (hata) {
    /* Yakalanmamış hata teşhisi siler (anayasa) — TAM loglanır, dışarıya kod döner. */
    console.error("[sicak] veritabanı yoklaması düştü:", hata);
    return NextResponse.json({ durum: "VERITABANI_YOK" }, { status: 503 });
  }
}
