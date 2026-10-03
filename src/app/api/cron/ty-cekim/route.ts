import { NextRequest, NextResponse } from "next/server";
import { donguDurumKodu, zamanlanmisIsDongusu } from "@/lib/firma-dongusu";

import { tyCekimKos } from "../../../../../scripts/canli-ty-ice-aktar";

/**
 * ============================================================================
 *  K166 — TY ÇEKİMİNİN SUNUCU UCU: MAKİNEDEN BAĞIMSIZ RUTİN
 * ----------------------------------------------------------------------------
 *  Halil 04.09.2026: _"bilgisayarım kapalıyken Trendyol'dan siparişleri
 *  çekmedi — bu problemli bir durum değil mi?"_ Evet: rutin tek makineye
 *  bağlıydı. Bu uç, AYNI çekirdeği (`tyCekimKos` — tek gövde, iki okuyucu)
 *  Vercel üzerinde koşturur; dış bir zamanlayıcı 5-10 dakikada bir çağırır.
 *  Makinedeki görevler YEDEK katman olarak kalır — çift tetik zararsız
 *  (çakışmada-atla, defalarca canlıda kanıtlandı).
 *
 *  ⚠ TETİKLEYİCİ VERCEL CRON DEĞİL — anayasa dersi (18-19.08.2026): Vercel
 *  Cron iki gün sessizce hiç tetiklenmedi ve Hobby planında logu olmadığı
 *  için sebebi ÖĞRENİLEMEDİ; "yönetilemeyen bağımlılığa üçüncü şans
 *  verilmez". Dış, loglu bir zamanlayıcı kullanılır; kaçışın kendisi
 *  zaten görünür (panel "son çekim" rozeti + AuditLog izi).
 *
 *  ⚠ KAPI: `Authorization: Bearer <CRON_SECRET>`. Sır tutmayan/yanlış
 *  tutan istek **404** alır — rotanın varlığı bile sızmaz (anayasa:
 *  "yetkiniz yok" demek orada bir şey OLDUĞUNU söyler). `CRON_SECRET`
 *  ortamda TANIMSIZSA uç herkese kapalıdır — güvenli varsayılan.
 *
 *  ⚠ PENCERE DAR (3 gün): sık koşumun işi tazeliği yakalamak; geniş
 *  süpürme (60 gün) makinedeki günlük görevde duruyor.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
/** Çekim ölçüldü ~7-40sn; Hobby tavanı 60. */
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
   * ⛔ PENCERE 3 → 7 GÜN (kullanıcı kararı 02.10.2026). Ölçüldü: 26.09
   * siparişi (11646955949) 01.10'da teslim edildi; 3 günlük pencere onu artık
   * görmüyordu ve teslim yalnız ertesi sabahki 60 günlük çekimle (bir güne
   * kadar gecikmeyle) düştü — panel o süre boyunca «yolda» dedi. 7 gün =
   * 3 dilim (DILIM_GUN 3): dakikada 3 istek. 7 günden eski siparişin teslimi
   * yine sabahki 60 günlük çekime kalır — bilerek kabul edilen sınır.
   */
  /**
   * K303 Aşama 3b: iş firma firma döner (`lib/firma-dongusu.ts`). Kanal anahtarı
   * bugün tek takım olduğu için yalnız ANAHTAR FİRMASINDA koşar; ötekiler
   * «ATLANDI · anahtar tanımlı değil» yazar. Her firma kendi bağlamında koşar.
   */
  const sonuc = await zamanlanmisIsDongusu({ kanalAnahtariGerekir: true }, (companyId) =>
    tyCekimKos({ yaz: true, gun: 7, dbAdresi, companyId }),
  );
  /* K264: «atlandı» 200 DEĞİL 503 — cron-job.org'un yeşili «çekim koştu» demek
     olsun. 24.09'da N11 11 saat boyunca atlandı ve zamanlayıcı yeşil gördü. */
  return NextResponse.json(sonuc, { status: donguDurumKodu(sonuc, (o) => "atlandi" in o) });
}
