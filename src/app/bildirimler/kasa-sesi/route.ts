import { getTranslations } from "next-intl/server";
import { apiIzni } from "@/lib/yetki";
import { UYGULAMA } from "@/lib/uygulama";
import { kasaOrnekleri, wavBaytlari } from "@/lib/kasa-sesi-tarifi";

/**
 * KASA SESİ DOSYASI (20.10.2026) — kullanıcı bunu indirip telefonda sitenin
 * bildirim sesi yapar (web bildirimi kendi sesini taşıyamaz). Dosya diskte
 * DURMAZ: uygulamadaki sesle AYNI tariften (`kasa-sesi-tarifi.ts`) üretilir,
 * yani ikisi hiçbir zaman ayrışmaz. Bildirim ekranıyla aynı izin.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const red = await apiIzni("satis.gor");
  if (red) return red;
  const t = await getTranslations("AnlikBildirim");
  return new Response(wavBaytlari(kasaOrnekleri()), {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Disposition": `attachment; filename="${UYGULAMA.teknikAd}-${t("kasaDosyaAdi")}.wav"`,
      "Cache-Control": "private, no-store",
    },
  });
}
