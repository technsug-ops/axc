import { prisma } from "@/lib/prisma";
import { yetkiBaglami } from "@/lib/yetki";
import { paketiSuz } from "@/lib/kullanim/olay";

/**
 * ============================================================================
 *  KULLANIM İZİ UCU (kullanıcı kararı 13.10.2026 «bu programı ölçmek istiyorum»)
 * ----------------------------------------------------------------------------
 *  Tarayıcıdaki `KullanimIzi` bileşeni sayfa açılışlarını ve tıklamaları
 *  biriktirip buraya toplu gönderir (`navigator.sendBeacon`).
 *
 *  · KİM ve HANGİ FİRMA oturumdan okunur — tarayıcının söylediğine bakılmaz.
 *    Oturum yoksa (giriş sayfası, süresi dolmuş oturum) hiçbir şey yazılmaz.
 *  · Paket SUNUCUDA yeniden süzülür (`paketiSuz`): kalıp, rakam gizleme ve
 *    bağlantı hedefi burada bir kez daha uygulanır; bozuk olay atılır.
 *  · Cevap her zaman 204 — iz, kullanıcının işini ASLA durdurmaz ve tarayıcıya
 *    bilgi sızdırmaz. Hata sessiz YUTULMAZ: tam hâliyle sunucu kaydına yazılır
 *    (anayasa: yakalanmamış hata, yutulmuş hatanın kardeşidir).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function POST(istek: Request) {
  try {
    const baglam = await yetkiBaglami();
    if (!baglam) return new Response(null, { status: 204 });
    let govde: unknown;
    try {
      govde = JSON.parse(await istek.text());
    } catch {
      return new Response(null, { status: 204 });
    }
    const olaylar = paketiSuz((govde as { olaylar?: unknown } | null)?.olaylar);
    if (olaylar.length > 0) {
      await prisma.kullanimOlayi.createMany({
        data: olaylar.map((o) => ({
          companyId: baglam.companyId,
          userId: baglam.kullaniciId,
          tur: o.tur,
          sayfa: o.sayfa,
          oncekiSayfa: o.oncekiSayfa,
          hedef: o.hedef,
          cihaz: o.cihaz,
        })),
      });
    }
  } catch (hata) {
    console.error("[kullanim] iz yazılamadı:", hata);
  }
  return new Response(null, { status: 204 });
}
