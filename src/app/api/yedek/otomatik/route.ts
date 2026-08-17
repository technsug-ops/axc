import { gunlukYedekYaz, SAKLAMA_GUNU } from "@/lib/yedek-yaz";

/**
 * ============================================================================
 *  OTOMATİK YEDEK — VERCEL CRON İLE HER GECE
 * ----------------------------------------------------------------------------
 *  Canlıya geçişin son ön şartı (BEKLEYENLER). Elle yedek zaten vardı ama
 *  kimse basmazsa yedek alınmıyordu; gerçek satış ve maliyet verisinde bu
 *  kabul edilemez.
 *
 *  NEDEN VERCEL BLOB, NEDEN KENDİ SUNUCUSU DEĞİL:
 *  Veritabanı All-Inkl'de duruyor. Yedeği de oraya yazmak, tek bir sağlayıcı
 *  sorununda veritabanını VE yedeği birlikte kaybetmek demekti. Blob ayrı bir
 *  sağlayıcıda — gerçek ayrım budur. (Kullanıcının sunucusuna ikinci kopya
 *  ileride eklenebilir; asıl kopyanın orada olmaması bilinçli.)
 *
 *  NEDEN HAFİF YEDEK:
 *  Dosyanın %99'unu kargo tarifeleri kaplıyor (44.841 satır) ve onlar
 *  `npx prisma db seed` ile aynen yeniden üretilebilen REFERANS veridir.
 *  İş verisinin tamamı hafif yedekte var; dosyanın içinde eksik olduğu
 *  `kargoTarifesiHaric: true` olarak yazılı. Tam yedek elle alınabilir.
 *
 *  GÜVENLİK: Vercel Cron isteği `Authorization: Bearer $CRON_SECRET` ile
 *  gelir. CRON_SECRET tanımlıysa doğrulanır; tanımlı değilse uç nokta
 *  KAPALIDIR — açık bir yedekleme ucu bırakmaktansa hiç çalışmasın.
 * ============================================================================
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(istek: Request) {
  const sir = process.env.CRON_SECRET;
  if (!sir) {
    return Response.json(
      {
        durum: "KAPALI",
        mesaj:
          "CRON_SECRET tanımlı değil. Otomatik yedek bilerek kapalı — korumasız bir yedekleme ucu açık bırakılmaz.",
      },
      { status: 503 },
    );
  }

  const yetki = istek.headers.get("authorization");
  if (yetki !== `Bearer ${sir}`) {
    return Response.json({ durum: "YETKISIZ" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        durum: "DEPO_YOK",
        mesaj:
          "Vercel Blob deposu bağlı değil. Vercel → Storage → Blob oluşturup projeye bağlayın.",
      },
      { status: 503 },
    );
  }

  /**
   * İŞ ARTIK ORTAK FONKSİYONDA (`lib/yedek-yaz.ts`). Ekrandaki "Şimdi yedek
   * al" düğmesi de AYNI fonksiyonu çağırıyor — cron ile elle alınan yedek
   * birebir aynı işi yapsın, ikisi ayrışmasın.
   */
  const sonuc = await gunlukYedekYaz();

  if (!sonuc.tamam) {
    return Response.json(
      { durum: sonuc.kod, mesaj: sonuc.mesaj },
      { status: sonuc.kod === "DEPO_YOK" ? 503 : 500 },
    );
  }

  return Response.json({
    durum: "TAMAM",
    gun: sonuc.gun,
    url: sonuc.url,
    satir: sonuc.satir,
    boyutBayt: sonuc.boyutBayt,
    silinenEskiYedek: sonuc.silinenEskiYedek,
    saklananGun: SAKLAMA_GUNU,
  });
}
