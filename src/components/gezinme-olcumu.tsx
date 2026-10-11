"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { UYGULAMA } from "@/lib/uygulama";

/**
 * ============================================================================
 *  GEZİNME ÖLÇÜMÜ — TEST İÇİN AÇILDI, ÜRETİM ÖZELLİĞİ DEĞİL (11.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «mobilde tıklamalara geç reaksiyon» (~2 sn). Yerel ölçüm sunucu
 *  çiziminin 0,1–0,25 sn, canlı basit cevabın 0,15–0,3 sn olduğunu gösterdi;
 *  2 saniyenin nerede harcandığı TELEFONDA ölçülmeli. Bu araç tarayıcının
 *  kendi kaydını (`PerformanceResourceTiming`) okur: dokunuştan sayfanın
 *  dolmasına kadar TOPLAM süre, sunucuyu BEKLEME, İNDİRME ve boyut.
 *
 *  · Yalnız `?hiz=1` ile açılır (`?hiz=0` kapatır); açık değilken hiçbir şey
 *    dinlemez, hiçbir şey çizmez.
 *  · Sunucuya / veritabanına HİÇBİR ŞEY yazmaz; son 20 ölçüm yalnız o
 *    cihazın tarayıcısında durur.
 *  · Ölçüm bitince bu dosya ve yerleşimdeki tek satır KALDIRILIR (pano K332).
 * ============================================================================
 */

const ACIK_ANAHTARI = `${UYGULAMA.teknikAd}-gezinme-olcumu-acik`;
const LISTE_ANAHTARI = `${UYGULAMA.teknikAd}-gezinme-olcumu`;
const TAVAN = 20;

type Olcum = { yol: string; toplam: number; bekleme: number | null; indirme: number | null; kb: number | null; onceden: boolean };

function okuListe(): Olcum[] {
  try {
    const ham = JSON.parse(localStorage.getItem(LISTE_ANAHTARI) ?? "[]") as unknown;
    return Array.isArray(ham) ? (ham as Olcum[]).slice(0, TAVAN) : [];
  } catch {
    return [];
  }
}

export function GezinmeOlcumu() {
  const t = useTranslations("GezinmeOlcumu");
  const [durum, setDurum] = useState<{ acik: boolean; liste: Olcum[] }>({ acik: false, liste: [] });

  useEffect(() => {
    let acik = false;
    try {
      const istek = new URLSearchParams(location.search).get("hiz");
      if (istek === "1") localStorage.setItem(ACIK_ANAHTARI, "1");
      if (istek === "0") localStorage.removeItem(ACIK_ANAHTARI);
      acik = localStorage.getItem(ACIK_ANAHTARI) === "1";
    } catch {
      acik = false;
    }
    if (!acik) return;
    queueMicrotask(() => setDurum({ acik: true, liste: okuListe() }));

    const ekle = (o: Olcum) =>
      setDurum((d) => {
        const liste = [o, ...d.liste].slice(0, TAVAN);
        try {
          localStorage.setItem(LISTE_ANAHTARI, JSON.stringify(liste));
        } catch {
          /* Depolama yoksa ölçüm bu oturumda ekranda kalır. */
        }
        return { ...d, liste };
      });

    const tikla = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      const hedef = a.pathname;
      const t0 = performance.now();
      const bekle = () => {
        const bitti = location.pathname === hedef && document.querySelector("[data-yukleniyor]") === null;
        if (bitti) {
          const t1 = performance.now();
          const kayitlar = performance
            .getEntriesByType("resource")
            .filter((r): r is PerformanceResourceTiming => r.name.includes("_rsc") && new URL(r.name).pathname === hedef);
          const bu = kayitlar.filter((r) => r.startTime >= t0 - 30).pop();
          const once = bu ? undefined : kayitlar.pop();
          const k = bu ?? once;
          ekle({
            yol: hedef,
            toplam: Math.round(t1 - t0),
            bekleme: k ? Math.round(k.responseStart - k.startTime) : null,
            indirme: k ? Math.round(k.responseEnd - k.responseStart) : null,
            kb: k && k.transferSize > 0 ? Math.round(k.transferSize / 1024) : null,
            onceden: bu === undefined && once !== undefined,
          });
          return;
        }
        if (performance.now() - t0 < 30000) requestAnimationFrame(bekle);
      };
      requestAnimationFrame(bekle);
    };
    document.addEventListener("click", tikla, true);
    return () => document.removeEventListener("click", tikla, true);
  }, []);

  if (!durum.acik) return null;
  return (
    <div className="bg-card fixed bottom-24 left-2 z-50 max-h-64 w-80 overflow-auto rounded-md border p-2 text-[11px] shadow-lg md:bottom-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-semibold">{t("baslik")}</span>
        <button
          type="button"
          className="text-muted-foreground min-h-11 px-2 underline"
          onClick={() => {
            try {
              localStorage.removeItem(LISTE_ANAHTARI);
            } catch {
              /* yok */
            }
            setDurum((d) => ({ ...d, liste: [] }));
          }}
        >
          {t("temizle")}
        </button>
      </div>
      {durum.liste.length === 0 ? (
        <p className="text-muted-foreground">{t("bos")}</p>
      ) : (
        <table className="w-full tabular-nums">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="font-medium">{t("sayfa")}</th>
              <th className="text-right font-medium">{t("toplam")}</th>
              <th className="text-right font-medium">{t("bekleme")}</th>
              <th className="text-right font-medium">{t("indirme")}</th>
              <th className="text-right font-medium">{t("boyut")}</th>
            </tr>
          </thead>
          <tbody>
            {durum.liste.map((o, i) => (
              <tr key={i} className="border-t">
                <td className="max-w-24 truncate">{o.yol}</td>
                <td className="text-right font-semibold">{o.toplam}</td>
                <td className="text-right">{o.bekleme ?? "–"}{o.onceden ? "*" : ""}</td>
                <td className="text-right">{o.indirme ?? "–"}</td>
                <td className="text-right">{o.kb ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-muted-foreground mt-1">{t("not")}</p>
    </div>
  );
}
