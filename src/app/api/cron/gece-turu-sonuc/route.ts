import { NextRequest, NextResponse } from "next/server";

import { izYaz } from "@/lib/iz";
import { GECE_SONUC_EYLEMI, GECE_SONUC_GOVDE_TAVANI, geceTuruSonucuCoz } from "@/lib/gece-turu-sonuc";

/**
 * ============================================================================
 *  GECE TURU SONUCU — GITHUB'DAN GELEN RAPORU KAYDA YAZAR (15.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 15.10.2026: gece turu bilgisayardan GitHub'ın sunucusuna
 *  taşındı (`.github/workflows/gece-turu.yml`). Canlı veritabanı yalnız izinli
 *  IP'lerden bağlantı kabul ettiği için tur sonucunu buraya POST eder; uç
 *  `AuditLog`a `GECE_BEKCI_TURU` yazar — panel çanı ve `/ayarlar/gece-turu`
 *  bilgisayardaki turla AYNI kaydı okur (`gece-turu-veri.ts`).
 *
 *  · Kapı: öteki çekim uçlarıyla AYNI `CRON_SECRET`; yanlış/boş sır 404
 *    (rotanın varlığı bile sızmaz).
 *  · Gövde DENETLENİR (`geceTuruSonucuCoz`): bozuk/çelişkili rapor 400, kayda
 *    girmez. Gövde tavanı 64 KB.
 *  · Hata TAM loglanır, dışarıya kod döner (anayasa: yakalanmamış hata
 *    teşhisi siler).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function POST(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const metin = await istek.text();
  if (metin.length > GECE_SONUC_GOVDE_TAVANI) return NextResponse.json({ hata: "GOVDE_BUYUK" }, { status: 413 });
  let govde: unknown;
  try {
    govde = JSON.parse(metin);
  } catch {
    return NextResponse.json({ hata: "JSON_DEGIL" }, { status: 400 });
  }
  const sonuc = geceTuruSonucuCoz(govde);
  if (!sonuc.tamam) return NextResponse.json({ hata: sonuc.kod }, { status: 400 });
  try {
    /* İz TEK gövdeden (`izYaz`, `iz:dogrula`); oturum yok → kullanıcı açıkça boş. */
    await izYaz({ action: GECE_SONUC_EYLEMI, targetType: "Depo", userId: null, detail: JSON.stringify(sonuc.detay) });
    return NextResponse.json({ durum: "KAYDEDILDI" });
  } catch (hata) {
    console.error("[gece-turu-sonuc] iz yazılamadı:", hata);
    return NextResponse.json({ hata: "YAZILAMADI" }, { status: 503 });
  }
}
