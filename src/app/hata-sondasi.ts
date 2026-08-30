"use server";

import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  HATA SONDASI — VERİTABANI ULAŞILABİLİR Mİ (K98)
 * ----------------------------------------------------------------------------
 *  Hata ekranı sebebi TAHMİN ETMEZ, SORAR. Bu gövde tek bir şeyi ölçer:
 *  veritabanına bir tur atılabiliyor mu.
 *
 *  ⛔ SALT OKUMA — `SELECT 1`. Hiçbir tablo okunmaz, hiçbir şey yazılmaz.
 *  Hata anında koşan bir gövdenin veriye dokunması, zaten bozuk bir durumda
 *  ikinci bir risk açardı.
 *
 *  ⛔ YETKİ İSTENMEZ — VE BU BİLİNÇLİ. Bu uç oturum açmamış kullanıcıya da
 *  cevap verir, çünkü **giriş ekranının kendisi** düştüğünde de çalışması
 *  gerekiyor (30.08 vakasında düşen tam oydu). `yetkiIste` çağırsaydı,
 *  veritabanı çöktüğünde yetki sorgusu da çöker ve sonda hiçbir zaman cevap
 *  veremezdi — yani tam gerektiği anda susardı.
 *
 *  ⚠ SIZDIRDIĞI BİLGİ ÖLÇÜLDÜ: dönen tek şey `true`/`false`. Sürüm, sunucu
 *  adı, hata metni, tablo adı YOK. "Veritabanı ayakta mı" bilgisi zaten
 *  sitenin çalışıp çalışmamasından okunabiliyor.
 *
 *  ⚠ HATA YUTULMUYOR, KODA ÇEVRİLİYOR: ham mesaj sunucu günlüğüne TAM
 *  yazılır (kırpılmaz), çağırana yalnız `false` döner. _(K57-③: yakalanmamış
 *  hata, yutulmuş hatanın kardeşidir — ikisi de teşhisi öldürür.)_
 * ============================================================================
 */
export async function veritabaniUlasilabilirMi(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (e) {
    /**
     * ⚠ TAM MESAJ — kırpma YOK, "ilk satır" YOK. Prisma mesajları boş satırla
     * başlayabiliyor ve sebep mesajın SONUNDA olabiliyor; kırpan bir günlük
     * teşhisi de kırpar (26.08 dersi: 44 alım düştü, niye düştüğü ölçülemedi).
     */
    console.error(
      "[hata-sondasi] veritabanına ulaşılamadı:",
      e instanceof Error ? (e.stack ?? e.message) : String(e),
    );
    return false;
  }
}
