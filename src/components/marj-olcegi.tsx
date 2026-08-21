import { getTranslations } from "next-intl/server";

import {
  MARJ_ALT_SINIRLARI,
  MARJ_DOLULUGU,
  PIL_BOLME_SAYISI,
} from "@/lib/marj-bantlari";
import { MARJ_RAMPASI } from "@/lib/renkler";

/**
 * ============================================================================
 *  MARJ ÖLÇEĞİ — RENK NE DEMEK, EKRANDA YAZAR
 * ----------------------------------------------------------------------------
 *  Pil rengi tek başına bir şey öğretmez: "%9 yeşil" görmek, yeşilin nerede
 *  başladığını söylemez. Kullanıcının kendisi de ölçeği bir TABLOYLA
 *  gönderdi — yani ölçek, rengin ayrılmaz parçası.
 *
 *  Kullanıcı Kolaylığı İlkesi: ekran, ilk kez gören birinin yardım almadan
 *  kullanabileceği kadar açık olmalı. Eşikleri yalnız kodda tutsaydım
 *  operasyoncu "bu neden turuncu" sorusunu hiçbir yerde cevaplayamazdı.
 *
 *  ── AMA KAPALI GELİR (İlke #13) ─────────────────────────────────────────
 *  Ölçek her gün okunacak bir şey değil; bir kez öğrenilir. Sürekli açık
 *  dursaydı listenin üstünde altı satırlık kalıcı bir blok olurdu. Kapalı
 *  hâlde tek satır yer kaplıyor, tıklayınca açılıyor.
 *
 *  ⚠ EŞİKLER BURADA YAZILI DEĞİL, `MARJ_ALT_SINIRLARI`NDAN OKUNUYOR. Elle
 *  yazsaydım eşik değiştiği gün legend eskir ve ekran kendi renginle
 *  çelişirdi — kullanıcıya YANLIŞ bir cetvel öğretirdi.
 * ============================================================================
 */
export async function MarjOlcegi() {
  const t = await getTranslations("MarjGosterge");

  /**
   * Sunum sırası KÜÇÜKTEN BÜYÜĞE — kötüden iyiye okunur. Kaynak dizi
   * büyükten küçüğe (ilk eşleşen kazanır mantığı için); burada kopyası
   * ters çevriliyor, kaynağın kendisi DEĞİL (`toReversed` kopya döndürür).
   */
  const bantlar = MARJ_ALT_SINIRLARI.toReversed();

  return (
    <details className="group border-border/60 rounded-lg border">
      <summary className="text-muted-foreground hover:text-foreground marker:content-[''] flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs">
        {/* Kapalı hâlde bile RAMPA görünür: tek satırda ölçeğin ne olduğu
            anlaşılır, açmak ayrıntı için gerekir. */}
        <span className="flex items-center gap-[2px]" aria-hidden="true">
          {bantlar.map(([bant]) => (
            <span
              key={bant}
              className={`h-3 w-[5px] rounded-[1px] ${MARJ_RAMPASI[bant].dolgu}`}
            />
          ))}
        </span>
        {t("olcekBaslik")}
        <span className="ml-auto transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="grid gap-1 px-3 pt-1 pb-3 sm:grid-cols-2 lg:grid-cols-3">
        {bantlar.map(([bant, altSinir], i) => {
          const ustSinir = bantlar[i + 1]?.[1] ?? null;
          return (
            <div key={bant} className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-[2px]" aria-hidden="true">
                {Array.from({ length: PIL_BOLME_SAYISI }, (_, j) => (
                  <span
                    key={j}
                    className={`h-3 w-[5px] rounded-[1px] ${
                      j < MARJ_DOLULUGU[bant]
                        ? MARJ_RAMPASI[bant].dolgu
                        : "bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </span>
              <span
                className={`tabular-nums ${MARJ_RAMPASI[bant].yazi} font-medium`}
              >
                {/* ARALIK METNİ SÖZLÜKTEN, sayı yerinde: "%3 – %5" gibi bir
                    kalıbı koda gömmek i18n borcuna eklenirdi. */}
                {altSinir === -Infinity
                  ? t("olcekZarar")
                  : ustSinir === null
                    ? t("olcekUstsuz", { alt: altSinir })
                    : t("olcekAralik", { alt: altSinir, ust: ustSinir })}
              </span>
              <span className="text-muted-foreground">{t(`bant_${bant}`)}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
