import { getTranslations } from "next-intl/server";
import { CalendarClock, Download, TriangleAlert } from "lucide-react";

import { Baglanti } from "@/components/baglanti";
import { bicimlendirici } from "@/lib/bicim";
import { DURUM_KUTUSU, DURUM_YAZISI } from "@/lib/renkler";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { gercekKacisSayisi, yedekBoslugu } from "@/lib/yedek-bosluk";
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

  /**
   * BOŞLUK TARAMASI — son 14 gün. Liste 10 kayıtla sınırlı olduğu için
   * tarama AYRI listeden yapılır; "son 10 yedek" ile "son 14 gün" farklı
   * sorulardır ve birini ötekinin yerine kullanmak eksik gün gizlerdi.
   */
  let tumTarihler: { tarih: Date }[] = [];
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: "yedek/" });
    tumTarihler = blobs.map((b) => ({ tarih: new Date(b.uploadedAt) }));
  } catch {
    tumTarihler = [];
  }
  const bugun = gunDegeri(isTakvimGunu(new Date()));

  /**
   * REDDEDİLEN ÇAĞRILAR — 19.08.2026 hipotezinin sınavı.
   *
   * Açık ihtimal: Vercel zamanlayıcı ucu çağırıyor ama `Authorization`
   * başlığını göndermiyor; rota 401 dönüyor ve kimse görmüyor. Rota artık
   * günde bir kez iz bırakıyor; iz de burada görünmezse yine sessiz
   * kalırdı — "kaydedilen ≠ görünen".
   */
  let redler: { tarih: Date; userAgent: string | null }[] = [];
  try {
    const { prisma } = await import("@/lib/prisma");
    const kayitlar = await prisma.auditLog.findMany({
      where: { action: "YEDEK_UCU_REDDEDILDI" },
      select: { createdAt: true, detail: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    redler = kayitlar.map((k) => {
      let ua: string | null = null;
      try {
        ua = (JSON.parse(k.detail ?? "{}") as { userAgent?: string }).userAgent ?? null;
      } catch {
        ua = null;
      }
      return { tarih: k.createdAt, userAgent: ua };
    });
  } catch {
    redler = [];
  }
  const bosluk = yedekBoslugu(tumTarihler, bugun, 14);
  const kacisSayisi = gercekKacisSayisi(bosluk, bugun);

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

      {/* ---------------- KAÇIRILAN GÜNLER ----------------
          ⚠ Cron İKİ KEZ kaçtı (18 ve 19.08.2026) ve ikisi de ancak biri
          fark ettiği için anlaşıldı. Liste doluyken bile ARADA gün eksik
          olabilir; göz bunu yakalamaz. Var olanı listelemek, OLMAYANI
          göstermez. */}
      {kacisSayisi > 0 ? (
        <div className={`space-y-1 rounded-md p-3 ${DURUM_KUTUSU.olumsuz}`}>
          <p className={`flex items-center gap-2 text-sm font-medium ${DURUM_YAZISI.olumsuz}`}>
            <TriangleAlert className="size-4 shrink-0" />
            {t("yedekKacti", { sayi: kacisSayisi })}
          </p>
          <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>
            {bosluk.eksikGunler
              .filter((g) => bicim.tarih(g) !== bicim.tarih(bugun))
              .slice(0, 10)
              .map((g) => bicim.tarih(g))
              .join(" · ")}
          </p>
          <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{t("yedekKactiNe")}</p>
        </div>
      ) : null}

      {/* ---------------- REDDEDİLEN ÇAĞRILAR ----------------
          Zamanlayıcı ucu çağırıyor ama yetkisiz mi? Bu blok onu söyler.
          `user-agent` içinde "vercel" geçiyorsa Vercel GERÇEKTEN
          çağırıyor demektir ve sorun başlıktadır. */}
      {redler.length > 0 ? (
        <div className={`space-y-1 rounded-md p-3 ${DURUM_KUTUSU.uyari}`}>
          <p className={`text-sm font-medium ${DURUM_YAZISI.uyari}`}>
            {t("yedekReddedildi", { sayi: redler.length })}
          </p>
          {redler.map((r, i) => (
            <p key={i} className={`text-xs ${DURUM_YAZISI.uyari}`}>
              {bicim.tarih(r.tarih)} · {r.userAgent ?? "—"}
            </p>
          ))}
          <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("yedekReddedildiNe")}</p>
        </div>
      ) : null}

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
