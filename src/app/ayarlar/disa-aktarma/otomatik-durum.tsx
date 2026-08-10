import { getTranslations } from "next-intl/server";
import { CalendarClock, Download, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";

/**
 * ============================================================================
 *  OTOMATİK YEDEK DURUMU
 * ----------------------------------------------------------------------------
 *  Görünmeyen bir yedekleme, olmayan bir yedeklemedir. Bu blok üç sorunun
 *  cevabını ekranda tutar: kurulu mu, en son ne zaman alındı, dosya nerede.
 *
 *  Kurulum eksikse SESSİZ KALMAZ — neyin eksik olduğunu ve nereden
 *  tamamlanacağını yazar (Kullanıcı Kolaylığı #5).
 * ============================================================================
 */
export async function OtomatikYedekDurumu() {
  const t = await getTranslations("DisaAktarma");
  const bicim = await bicimlendirici();

  const depoBagli = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const sirVar = Boolean(process.env.CRON_SECRET);

  if (!depoBagli || !sirVar) {
    return (
      <div className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <TriangleAlert className="size-4 shrink-0" />
          {t("otomatikBaslik")}
        </div>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          {t("otomatikKuruluDegil")}
        </p>
      </div>
    );
  }

  // Depo bağlıysa listeyi oku. Ağ hatası ekranı çökertmesin.
  let yedekler: { url: string; ad: string; tarih: Date; boyut: number }[] = [];
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "yedek/" });
    yedekler = blobs
      .map((b) => ({
        url: b.url,
        ad: b.pathname.replace(/^yedek\//, ""),
        tarih: new Date(b.uploadedAt),
        boyut: b.size,
      }))
      .sort((a, b) => b.tarih.getTime() - a.tarih.getTime())
      .slice(0, 10);
  } catch {
    yedekler = [];
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="size-4 shrink-0" />
        {t("otomatikBaslik")}
      </div>

      {yedekler.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("otomatikHenuzYok")}</p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {t("otomatikKurulu", { sayi: yedekler.length, gun: 30 })}
          </p>

          <ul className="divide-y rounded-md border text-sm">
            {yedekler.map((y) => (
              <li
                key={y.url}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <span className="font-mono text-xs">{y.ad}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {bicim.tarih(y.tarih)} ·{" "}
                    {t("yedekBoyut", { kb: Math.max(1, Math.round(y.boyut / 1024)) })}
                  </span>
                  <Baglanti href={y.url} className="inline-flex items-center gap-1">
                    <Download className="size-3.5" />
                    {t("yedekIndirBaglanti")}
                  </Baglanti>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-muted-foreground text-xs">{t("otomatikNotu")}</p>
    </div>
  );
}
