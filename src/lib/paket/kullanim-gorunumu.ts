import { getTranslations } from "next-intl/server";

import { DURUM_KUTUSU } from "@/lib/renkler";

import { firmaKullanimi, firmaSinirlari, SINIR_TURLERI, sinirDurumu, type SinirTuru } from "./sinirlar";

/**
 * Kullanım kutucuklarının görünümü — süper admin firma kartı ve «Paketim»
 * AYNI gövdeden (İlke #10). Dolu → sarı, aşılmış → kırmızı. Aşılma yalnız
 * aylık siparişte olabilir (yumuşak sınır); öteki ikisi sert kapıyla durur —
 * paket düşürülünce mevcut fazlalık da «aşıldı» görünür (silinmez).
 */
export async function kullanimGorunumu(firmaId: string) {
  const t = await getTranslations("PaketSiniri");
  const [kullanim, sinirlar] = await Promise.all([firmaKullanimi(firmaId), firmaSinirlari(firmaId)]);
  const durumlar = {} as Record<SinirTuru, { sinif: string; metin: string | null }>;
  const etiketler = {} as Record<SinirTuru, string>;
  for (const a of SINIR_TURLERI) {
    const d = sinirDurumu(kullanim[a], sinirlar[a]);
    etiketler[a] = t(`etiket_${a}`);
    durumlar[a] =
      d === "ASILDI" ? { sinif: DURUM_KUTUSU.olumsuz, metin: t("durumAsildi") }
      : d === "DOLU" ? { sinif: DURUM_KUTUSU.uyari, metin: t("durumDolu") }
      : { sinif: "", metin: null };
  }
  const dikkat = SINIR_TURLERI.filter((a) => ["DOLU", "ASILDI"].includes(sinirDurumu(kullanim[a], sinirlar[a])));
  return { kullanim, sinirlar, etiketler, durumlar, sinirsiz: t("sinirsiz"), dikkat };
}
