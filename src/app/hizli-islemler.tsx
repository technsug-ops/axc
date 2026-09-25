import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { MENU_ADRESLERI } from "@/lib/menu/katalog";
import { HIZLI_ISLEMLER, MENU_IKONLARI, ONE_CIKAN_ISLEM } from "@/lib/menu/ikonlar";

/**
 * ============================================================================
 *  HIZLI İŞLEMLER — TELEFON, DÖRT DAİRE (K270, kullanıcı 25.09.2026)
 * ----------------------------------------------------------------------------
 *  «Özellikle hızlı menü tuşları çok efektif olabilir.» Panelin ilk ekranında,
 *  görev ızgarasının hemen altında: en sık yapılan dört iş bir dokunuşta
 *  (İlke #9). Yalnız telefonda (`md:hidden`) — masaüstünde sol menü zaten
 *  bir tık uzakta.
 *  ⚠ ADRES · İKON · ETİKET KATALOGDAN: `MENU_ADRESLERI` · `MENU_IKONLARI` ·
 *  `Menu.*` sözlüğü. Burada hiçbir işin adı/adresi elle yazılmaz; sol menüyle
 *  ayrışamaz. Barkod okut koyu zemin: depodaki ilk hareket (İlke #7).
 * ============================================================================
 */
export async function HizliIslemler() {
  const t = await getTranslations("Panel");
  const tMenu = await getTranslations("Menu");
  return (
    <section aria-label={t("hizliIslemler")} className="space-y-2 md:hidden">
      <span className="px-0.5 text-[13px] font-semibold">{t("hizliIslemler")}</span>
      <div className="grid grid-cols-4 gap-2">
        {HIZLI_ISLEMLER.map((anahtar) => {
          const href = MENU_ADRESLERI[anahtar];
          const Ikon = MENU_IKONLARI[anahtar];
          /* Katalogda olmayan iş ÇİZİLMEZ — eksik bir tuş, kırık bir tuştan iyidir. */
          if (!href || !Ikon) return null;
          const oneCikan = anahtar === ONE_CIKAN_ISLEM;
          return (
            <Link
              key={anahtar}
              href={href}
              className="text-foreground flex flex-col items-center gap-1.5 no-underline"
            >
              <span
                className={`flex size-14 items-center justify-center rounded-2xl ${
                  oneCikan ? "bg-foreground text-background" : "bg-card text-primary border"
                }`}
              >
                <Ikon className="size-6" aria-hidden />
              </span>
              <span className="text-center text-[11px] leading-tight font-medium">
                {tMenu(anahtar)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
