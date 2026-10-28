// Arka plan işi: küçük veritabanı havuzu (K332 — gerekçe lib/arka-plan-havuzu.ts).
import "@/lib/arka-plan-havuzu";
import { NextRequest, NextResponse } from "next/server";

import { buyboxOtomatikTur } from "@/lib/buybox-otomatik";

/**
 * ============================================================================
 *  K366 adım 3 — BUYBOX OTOMATİK FİYAT UCU (27.10.2026; aralık `KONTROL_ARALIGI_DK`, 28.10.2026 itibarıyla 2 dk)
 * ----------------------------------------------------------------------------
 *  Tetikleyici: birincil cron-job.org (:00 :15 :30 :45), yedek
 *  `.github/workflows/buybox-otomatik.yml` (:07 :22 :37 :52). Yalnız modu
 *  OTOMATİK olan ürünlere bakar; fiyatı kurala göre kanala YAZAR
 *  (`lib/buybox-otomatik.ts`). Saatlik Buybox istatistiğine DOKUNMAZ.
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`; tutmayan istek 404 alır.
 *  ⚠ ÇİFT TETİK: aynı fiyat 15 dk içinde ikinci kez gönderilmez (tekrar
 *  kapısı, TY'nin kendi 15 dk kuralı); kapının arasına giren eşzamanlı iki
 *  tur aynı fiyatı iki kez yollayabilir — TY ikinciyi reddeder, HB'de aynı
 *  fiyat zararsızdır. Yedek bu yüzden birincilden 7 dk kaydırıldı.
 *  ⛔ DÜŞEN KANAL ya da REDDEDİLEN GÖNDERİM DURUM KODUNA YANSIR (500): zamanlayıcı
 *  yarım turu «başarılı» göstermesin.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/**
 * Bir gönderim kanal sonucunu 12 sn'ye kadar bekler (kart gövdesi, ölçülmüş
 * yansıma süresi). Son 60 sn'de YENİ gönderime başlanmaz; kalan ürünler bir
 * sonraki tura kalır ve cevapta «ZAMAN_YETMEDI» diye sayılır.
 */
export const maxDuration = 300;
const PAY_MS = 60_000;

export async function GET(istek: NextRequest) {
  const sir = process.env.CRON_SECRET?.trim() ?? "";
  const gelen = istek.headers.get("authorization") ?? "";
  if (sir === "" || gelen !== `Bearer ${sir}`) {
    return new NextResponse(null, { status: 404 });
  }
  const basladi = Date.now();
  const sonuc = await buyboxOtomatikTur(new Date(), basladi + maxDuration * 1000 - PAY_MS);
  const sorunlu = sonuc.kanallar.filter((k) => k.coktu || k.reddedilen > 0).length;
  return NextResponse.json({ ...sonuc, sorunlu, sureMs: Date.now() - basladi }, { status: sorunlu > 0 ? 500 : 200 });
}
