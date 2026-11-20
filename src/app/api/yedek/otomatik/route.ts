import { YEDEK_UCU_KOSTU } from "@/lib/yedek-yaz";
import { izYaz } from "@/lib/iz";

/**
 * ============================================================================
 *  OTOMATİK YEDEK UCU — ⛔ K382 (21.11.2026): İŞ GITHUB ACTIONS'A TAŞINDI, UÇ 410 DÖNER
 * ----------------------------------------------------------------------------
 *  ÖLÇÜLDÜ: yedek 06.11'de 220 MB'a ulaştığında bu fonksiyon her gece «instance was
 *  killed because it ran out of available memory» ile öldü (ilk 24.10; 06.11'den sonra
 *  tek başarı YOK); 02:01'deki ölüm aynı kopyadaki `hb-cekim` çağrısını da götürdü.
 *  Bilgisayardan ölçüm 20.11: 273 MB · 232 sn — Vercel'in 60 sn tavanının çok üstünde.
 *  Gece yedeği artık `.github/workflows/gece-yedek.yml` → `scripts/canli-yedek-bulut.ts`
 *  (AYNI `gunlukYedekYaz`, AYNI Blob, AYNI manifest). Vercel cron'u `vercel.json`dan
 *  çıkarıldı. Bu uç KORUNDU ki cron-job.org'daki eski iş sessiz 404 değil açık bir cevap
 *  alsın; yetkili çağrıya 410 TASINDI döner, hiçbir iş yapmaz. Yeniden açmak bir KARARDIR.
 *  Aşağıdaki tarihçe SİLİNMEDİ.
 * ----------------------------------------------------------------------------
 *  (ESKİ) OTOMATİK YEDEK — VERCEL CRON İLE HER GECE
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

/** BAŞARILI çağrı izinin eylem kodu — tek kaynak `lib/yedek-yaz.ts` (K382: izi artık betik yazar). */
export const KOSTU_EYLEMI = YEDEK_UCU_KOSTU;

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
    /* 02.10.2026: 401 → 404 — «yetkisiz» demek orada bir uç OLDUĞUNU söyler (anayasa: reddedilen istek 404). */
    return new Response(null, { status: 404 });
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
  /*
   * ⛔ K382 (21.11.2026) — İŞ BU UÇTAN TAŞINDI. Gerekçe dosya başlığında. Yetkili çağıran
   * (cron-job.org'daki eski iş) açık cevap alır: 410 TASINDI. Günlüğe de düşer ki «niye yedek
   * yok» sorusu bu uca gelirse cevabı burada bulunsun.
   */
  console.warn("[yedek-ucu] K382: gece bulut yedeği GitHub Actions'ta — bu uç iş yapmaz (410).");
  return Response.json(
    {
      durum: "TASINDI",
      mesaj:
        "Gece bulut yedeği GitHub Actions'a taşındı (K382, 21.11.2026); bu uç artık yedek almaz. cron-job.org'daki eski iş silinmeli.",
    },
    { status: 410 },
  );
}
