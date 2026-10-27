import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";

import { DurumRozeti } from "@/components/durum-rozeti";
import { bicimlendirici } from "@/lib/bicim";
import { KACIRMA_ESIGI_DK, KONTROL_ARALIGI_DK, type OtomatikGecmis } from "@/lib/buybox-otomatik-verisi";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  SON OTOMATİK DEĞİŞİKLİKLER (K366 adım 3) — Buybox ekranında, kanal başına.
 * ----------------------------------------------------------------------------
 *  Zamanlanmış işin gönderdiği (ya da kanalın reddettiği) fiyatlar: ne zaman ·
 *  ürün · eski → yeni · neden · sonuç. En yeni 20 — liste veriyle BÜYÜMEZ
 *  (İlke #13). «Son kontrol» zamanı ve kaçan iş kırmızı (koşmayan iş görünür).
 *  Otomatik ürün de kayıt da yoksa hiç çizilmez (söyleyecek bir şey yok).
 * ============================================================================
 */
/** Kâr (NET-2 · marj) yalnız kârı görebilene (`satis.kar.gor`). */
export async function OtomatikGecmisi({ gecmis, karGorunur }: { gecmis: OtomatikGecmis; karGorunur: boolean }) {
  if (!gecmis.otomatikVar && gecmis.kayitlar.length === 0) return null;
  const t = await getTranslations("Buybox");
  const bicim = await bicimlendirici();
  const para = (n: number | null) => (n === null ? t("bilinmiyor") : bicim.para(n, "TRY"));
  return (
    <section className="max-w-3xl space-y-2 rounded-lg border p-3">
      <h2 className="text-base font-semibold">{t("otomatikBaslik")}</h2>
      {gecmis.kacti ? (
        <p className={`text-sm ${DURUM_YAZISI.olumsuz}`} role="alert">
          {gecmis.sonKontrol === null ? t("otomatikHicKosmadi") : t("otomatikKacti", { an: bicim.tarihSaat(gecmis.sonKontrol), dk: KACIRMA_ESIGI_DK })}
        </p>
      ) : gecmis.sonKontrol !== null ? (
        <p className="text-muted-foreground text-xs">{t("otomatikSonKontrol", { an: bicim.tarihSaat(gecmis.sonKontrol), dk: KONTROL_ARALIGI_DK })}</p>
      ) : null}
      {gecmis.kayitlar.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("otomatikKayitYok")}</p>
      ) : (
        <ul className="divide-y">
          {gecmis.kayitlar.map((k) => (
            <li key={k.id} className="space-y-0.5 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-muted-foreground text-xs tabular-nums">{bicim.tarihSaat(k.an)}</span>
                <DurumRozeti durum={k.gonderildi ? "olumlu" : "olumsuz"}>{k.gonderildi ? t("otomatikGonderildi") : t("otomatikReddedildi", { kod: k.kanalSonucu })}</DurumRozeti>
              </div>
              {k.urunId === null ? (
                <p className="font-medium">{k.urunAdi}</p>
              ) : (
                <Link href={`/urunler/${k.urunId}`} className="font-medium underline underline-offset-2 hover:no-underline">
                  {k.urunAdi}
                </Link>
              )}
              <p className="tabular-nums">{t("otomatikFiyat", { eski: para(k.eski), yeni: para(k.yeni) })}</p>
              <p className="text-muted-foreground text-xs">
                {t(k.neden === "BUYBOX_AL" ? "otomatikNeden_BUYBOX_AL" : "otomatikNeden_IKINCI_ALTI", { rakip: para(k.rakipFiyati) })}
                {karGorunur && k.net2 !== null && k.marj !== null ? ` · ${t("otomatikKar", { net2: para(k.net2), marj: bicim.yuzde(k.marj) })}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
