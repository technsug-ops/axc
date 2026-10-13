import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { PANEL_ONBELLEK_MS } from "@/lib/kisa-onbellek";

/**
 * Önbellekten gelen bloğun NE ZAMAN hesaplandığını yazar (K332, kullanıcı
 * kararı 11.10.2026: ağır panel blokları en fazla 2 dk eski olabilir). Eski
 * bir rakam taze gibi görünmesin — «doğru sayı + yanlış çerçeve» olmasın.
 */
export async function OnbellekNotu({ an }: { an: Date }) {
  const t = await getTranslations("Ortak");
  const bicim = await bicimlendirici();
  return (
    <p className="text-muted-foreground mt-1 text-[11px]">
      {t("onbellekNotu", { saat: bicim.saat(an), dakika: Math.round(PANEL_ONBELLEK_MS / 60000) })}
    </p>
  );
}
