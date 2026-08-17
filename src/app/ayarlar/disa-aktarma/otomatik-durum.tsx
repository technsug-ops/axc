import { getTranslations } from "next-intl/server";
import { CalendarClock, Download, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { yedekKapsami } from "@/lib/yedek-yaz";

import { YedekAlButonu } from "./yedek-al-butonu";

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
      <div className={`space-y-2 rounded-lg p-4 ${DURUM_KUTUSU.uyari}`}>
        <div className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.uyari}`}>
          <TriangleAlert className="size-4 shrink-0" />
          {t("otomatikBaslik")}
        </div>
        <p className={`text-sm ${DURUM_YAZISI.uyari}`}>
          {t("otomatikKuruluDegil")}
        </p>
      </div>
    );
  }

  // Depo bağlıysa listeyi oku. Ağ hatası ekranı çökertmesin.
  let yedekler: {
    url: string;
    ad: string;
    tarih: Date;
    boyut: number;
    kapsam: "GUNLUK" | "TAM";
  }[] = [];
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "yedek/" });

    yedekler = blobs
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      )
      .slice(0, 10)
      .map((b) => {
        const ad = b.pathname.replace(/^yedek\//, "");
        return {
          // Yedekler ÖZEL: blob adresi doğrudan okunamaz. İndirme kendi
          // ucumuzdan geçer, depo jetonu tarayıcıya hiç gitmez.
          url: `/api/yedek/indir?ad=${encodeURIComponent(ad)}`,
          ad,
          tarih: new Date(b.uploadedAt),
          boyut: b.size,
          kapsam: yedekKapsami(ad),
        };
      });
  } catch {
    yedekler = [];
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4 shrink-0" />
          {t("otomatikBaslik")}
        </div>
        {/* UYARI ÇIKMAZA GÖTÜRMESİN: çan "yedeğin eski" dediğinde çözüm
            burada durur (bkz. yedek-al-actions.ts). */}
        <YedekAlButonu />
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
                <span className="min-w-0 font-mono text-xs">
                  {y.ad}
                  {/* KAPSAM BEYANI: kullanıcı 2,6 MB ile 17,5 MB arasında
                      seçim yaparken neyin eksik olduğunu bilmeliydi. */}
                  <span className="text-muted-foreground ml-2 font-sans">
                    {y.kapsam === "GUNLUK" ? t("kapsamGunluk") : t("kapsamTam")}
                  </span>
                </span>
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
      {/* NE EKSİK OLDUĞU YAZILIR — sessiz varsayım yok. */}
      <p className="text-muted-foreground text-xs">{t("kapsamNotu")}</p>
    </div>
  );
}
