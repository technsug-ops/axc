import { gunlukYedekYaz, SAKLAMA_GUNU } from "@/lib/yedek-yaz";
import { izYaz } from "@/lib/iz";

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

    /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
    await izYaz({
      action: RED_EYLEMI,
      targetType: "YedekUcu",
      detail: JSON.stringify({
        userAgent: istek.headers.get("user-agent")?.slice(0, 200) ?? null,
        /** Başlık VAR MI — değeri ASLA yazılmaz, sır sızdırılmaz. */
        authorizationVarMi: istek.headers.get("authorization") !== null,
        not: "Gün başına tek kayıt; sayı değil VARLIK ölçülüyor.",
      }),
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

  /**
   * ⛔ HEDEF KAPISI BURADA TEKRAR EDİLMEZ (K119b, 08.09.2026).
   *
   * Burada `BLOB_READ_WRITE_TOKEN` DOĞRUDAN sorgulanıyordu — yani rota
   * hedefin Blob olduğunu VARSAYIYORDU. Beyanlı bir yerel hedef seçilse
   * (`YEDEK_HEDEFI=DOSYA`) bu kapı onu jetonsuz diye reddederdi: hedef
   * soyutlaması var ama rota onu göremez. Karar tek gövdede
   * (`varsayilanYedekHedefi`) ve cevabı `DEPO_YOK` koduyla buraya geliyor.
   * _(Anayasa: "iki yerde iki ölçüt olmaz".)_
   */
  /**
   * İŞ ARTIK ORTAK FONKSİYONDA (`lib/yedek-yaz.ts`). Ekrandaki "Şimdi yedek
   * al" düğmesi de AYNI fonksiyonu çağırıyor — cron ile elle alınan yedek
   * birebir aynı işi yapsın, ikisi ayrışmasın.
   */
  const sonuc = await gunlukYedekYaz();

  if (!sonuc.tamam) {
    /**
     * ⛔ BAŞARISIZLIK, BAŞARI DURUMU DÖNEMEZ — VE `OKUNAMADI` KENDİ
     * ADIYLA GEÇER.
     *
     * ⚠ BU YORUMDA BİLEREK HTTP KODU YAZMIYOR: bekçi ölçütü tam bu dalın
     * İÇİNDE başarı kodunu arıyor ve yorumda geçen bir sayı onu yanlış
     * yere baktırırdı. _(Anayasa: ölçüt yorumsuz kodda arar.)_
     *
     * `DEPO_YOK` bir YAPILANDIRMA eksiğidir (503: hizmet kurulmamış),
     * `OKUNAMADI` ve `HATA` ise gerçek bir arızadır (500). Üçünü tek
     * duruma indirmek, "yedek hiç kurulmamış" ile "yedek alınıyor ama geri
     * okunamıyor"u aynı satıra yazardı; ikincisi 31.08 vakasının ta
     * kendisidir ve ayrı görünmesi gerekir.
     */
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
    /** ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90). */
    await izYaz({
      action: KOSTU_EYLEMI,
      targetType: "YedekUcu",
      detail: JSON.stringify({
        userAgent: istek.headers.get("user-agent")?.slice(0, 200) ?? null,
        gun: sonuc.gun,
        satir: sonuc.satir,
        /** Hangi hedefe yazıldığı İZDE durur — sonradan sorulabilsin. */
        hedefTuru: sonuc.hedefTuru,
        /** Geri okuma maliyeti: 60 sn tavanına ne kadar yaklaşıyoruz. */
        dogrulamaMs: sonuc.dogrulamaMs,
      }),
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
    hedefTuru: sonuc.hedefTuru,
    dogrulamaMs: sonuc.dogrulamaMs,
  });
}
