import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { apiIzni } from "@/lib/yetki";
import { yedegiMetneCevir, yedekUret } from "@/lib/yedek";

/**
 * YEDEK İNDİRME — /api/yedek
 *
 * Route handler: çıktı bir dosya. Dosya adı İŞ saat dilimindeki güne göre
 * verilir (Europe/Istanbul), böylece Almanya'da gece yarısından sonra alınan
 * yedek Türkiye'nin gününü taşır.
 */
export const dynamic = "force-dynamic";

/**
 * Tam yedek 25 tabloyu okuyup tek dosyada birleştiriyor; varsayılan 10
 * saniyelik sunucusuz işlev süresi büyük veride yetmez. 60 sn, Vercel'in
 * Hobby planındaki üst sınırdır.
 */
export const maxDuration = 60;

export async function GET(istek: Request) {
  const red = await apiIzni("veri.aktar");
  if (red) return red;

  const tarifesiz =
    new URL(istek.url).searchParams.get("tarifesiz") === "1";

  const an = new Date();
  const yedek = await yedekUret(an, tarifesiz);
  const metin = yedegiMetneCevir(yedek);

  // Gün İŞ saat diliminden çözülür: Almanya'da gece yarısını geçmiş olsa da
  // dosya Türkiye'nin gününü taşır.
  const gunler = gunMetni(gunDegeri(isTakvimGunu(an)));
  const dosyaAdi = `selliora-yedek-${gunler}${tarifesiz ? "-hafif" : ""}.json`;

  return new Response(metin, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dosyaAdi}"`,
      "Cache-Control": "no-store",
    },
  });
}
