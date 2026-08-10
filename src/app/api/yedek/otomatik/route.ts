import { del, list, put } from "@vercel/blob";

import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { yedegiMetneCevir, yedekUret } from "@/lib/yedek";

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

/** Kaç günlük yedek saklanır. */
const SAKLAMA_GUNU = 30;
const KLASOR = "yedek";

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

  const an = new Date();
  const gun = gunMetni(gunDegeri(isTakvimGunu(an)));

  try {
    // --- 1) YEDEĞİ ÜRET ---
    const yedek = await yedekUret(an, true);
    const icerik = yedegiMetneCevir(yedek);

    const { url } = await put(`${KLASOR}/selliora-${gun}.json`, icerik, {
      access: "public",
      contentType: "application/json; charset=utf-8",
      // Aynı gün ikinci kez çalışırsa üzerine yazsın; gün başına tek dosya.
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // --- 2) ESKİLERİ TEMİZLE ---
    const esik = new Date(an.getTime() - SAKLAMA_GUNU * 24 * 60 * 60 * 1000);
    const { blobs } = await list({ prefix: `${KLASOR}/` });
    const eskiler = blobs.filter((b) => new Date(b.uploadedAt) < esik);
    if (eskiler.length > 0) {
      await del(eskiler.map((b) => b.url));
    }

    const satir = Object.values(yedek.satirSayilari).reduce((t, n) => t + n, 0);

    return Response.json({
      durum: "TAMAM",
      gun,
      url,
      satir,
      boyutBayt: Buffer.byteLength(icerik, "utf8"),
      silinenEskiYedek: eskiler.length,
      saklananGun: SAKLAMA_GUNU,
    });
  } catch (e) {
    // SESSİZ BAŞARISIZLIK YASAK: hata gövdede döner, Vercel günlüğüne düşer.
    console.error("[otomatik-yedek] basarisiz:", e);
    return Response.json(
      { durum: "HATA", gun, mesaj: String(e) },
      { status: 500 },
    );
  }
}
