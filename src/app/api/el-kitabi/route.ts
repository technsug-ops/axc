import { getTranslations } from "next-intl/server";

import { apiIzni } from "@/lib/yetki";
import { bicimlendirici } from "@/lib/bicim";
import { gunDegeri, gunMetni, isTakvimGunu } from "@/lib/donem";
import { elKitabiTekDosya } from "@/lib/el-kitabi/uret";

/**
 * EL KİTABI — İNDİRİLEBİLİR TEK DOSYA
 *
 * Aynı üreteçten çıkar, o yüzden ekrandakiyle birebir aynıdır. Dosya adına
 * gün yazılır: elinizde iki farklı tarihli kopya varsa hangisinin güncel
 * olduğu belli olur.
 *
 * Uç nokta korumalıdır (proxy.ts): içinde iş kurallarınız ve kesinti
 * oranlarınız var.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const red = await apiIzni("elkitabi.gor");
  if (red) return red;

  const t = await getTranslations("ElKitabi");
  const bicim = await bicimlendirici();

  const an = new Date();
  const belge = await elKitabiTekDosya(bicim.tarih(an));
  const gun = gunMetni(gunDegeri(isTakvimGunu(an)));

  return new Response(belge, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t("dosyaAdi")}-${gun}.html"`,
      "Cache-Control": "no-store",
    },
  });
}
