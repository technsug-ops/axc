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

/** Reddedilen çağrı izinin eylem kodu. */
export const RED_EYLEMI = "YEDEK_UCU_REDDEDILDI";

/** BAŞARILI çağrı izinin eylem kodu. */
export const KOSTU_EYLEMI = "YEDEK_UCU_KOSTU";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Reddedilen çağrıyı GÜNDE BİR KEZ kaydeder. Hata yutulur: iz tutulamadı
 * diye reddin kendisi değişmez.
 */
async function redKaydiniYaz(istek: Request): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const bugun = new Date();
    bugun.setUTCHours(0, 0, 0, 0);

    const varMi = await prisma.auditLog.findFirst({
      where: { action: RED_EYLEMI, createdAt: { gte: bugun } },
      select: { id: true },
    });
    if (varMi) return;

    await prisma.auditLog.create({
      data: {
        action: RED_EYLEMI,
        targetType: "YedekUcu",
        detail: JSON.stringify({
          userAgent: istek.headers.get("user-agent")?.slice(0, 200) ?? null,
          /** Başlık VAR MI — değeri ASLA yazılmaz, sır sızdırılmaz. */
          authorizationVarMi: istek.headers.get("authorization") !== null,
          not: "Gün başına tek kayıt; sayı değil VARLIK ölçülüyor.",
        }),
      },
    });
  } catch {
    // İz tutulamadıysa red yine de geçerlidir.
  }
}

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
    /**
     * ⚠ RED SESSİZ KALMAZ — 19.08.2026 mimar hipotezi.
     *
     * Cron iki gece hiç koşmadı ve teşhis tavana dayandı. Açık ihtimal:
     * **Vercel zamanlayıcı çağırıyor ama `Authorization` başlığını
     * göndermiyor**; rota 401 dönüyor ve Vercel bunu SESSİZCE yutuyor.
     * Bugün bunu doğrulayacak hiçbir izimiz yok — 401'in kendisi hiçbir
     * yere yazılmıyor.
     *
     * Artık yazılıyor. `user-agent` de kaydediliyor: gelen istek
     * `vercel-cron/...` ise zamanlayıcı GERÇEKTEN çağırıyor ve sorun
     * başlıkta demektir. Hiç kayıt yoksa zamanlayıcı hiç çağırmıyordur.
     * Hipotez ancak böyle kesinleşir.
     *
     * ⚠ GÜNDE EN FAZLA BİR KAYIT. Bu uç herkese AÇIK; her reddi yazsaydık
     * dışarıdan gelen istek seliyle veritabanı şişirilebilirdi. Günde bir
     * satır, "çağrıldı mı" sorusunu cevaplamaya yeter — sayı değil VARLIK
     * aranıyor.
     */
    await redKaydiniYaz(istek);
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

  /**
   * ⚠ BAŞARIDA DA İZ — 19.08.2026 ölçüm boşluğu.
   *
   * Uca artık İKİ zamanlayıcı vuruyor: Vercel cron (00:00) ve
   * cron-job.org (03:00). İkisi de başarılı olursa **tek dosya** oluşur
   * ve hangisinin yazdığı ANLAŞILMAZ — dosya çağıranın kimliğini
   * taşımıyor.
   *
   * Açık soru tam da bu: **Vercel cron `Authorization` başlığı gönderiyor
   * mu?** Yalnız reddi kaydetseydik, Vercel başarılı olduğunda hiçbir şey
   * öğrenemezdik; "kayıt yok" hem "çağırmadı" hem "çağırdı ve başardı"
   * demeye gelirdi.
   *
   * `user-agent` yazılıyor: `vercel-cron/...` mı, `cron-job.org` mu.
   * Yarın sabah üç durum birbirinden ayrılabilecek.
   *
   * ⚠ SINIRSIZ YAZMA RİSKİ YOK: buraya ancak DOĞRU SIRRI bilen ulaşır.
   * Red tarafındaki "günde bir kayıt" sınırı burada gereksiz — üstelik
   * zararlı olurdu, çünkü İKİ çağıranı da aynı gün görmek istiyoruz.
   */
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.auditLog.create({
      data: {
        action: KOSTU_EYLEMI,
        targetType: "YedekUcu",
        detail: JSON.stringify({
          userAgent: istek.headers.get("user-agent")?.slice(0, 200) ?? null,
          gun: sonuc.gun,
          satir: sonuc.satir,
        }),
      },
    });
  } catch {
    // İz tutulamadıysa yedek yine de alınmıştır; başarı geri alınmaz.
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
