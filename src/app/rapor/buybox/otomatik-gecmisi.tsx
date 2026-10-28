import { getTranslations } from "next-intl/server";
import { ChevronDown } from "lucide-react";
import Link from "@/components/niyetli-baglanti";

import { DurumRozeti } from "@/components/durum-rozeti";
import { bicimlendirici } from "@/lib/bicim";
import type { BuyboxDurumu } from "@/lib/buybox";
import { otomatikGrupla } from "@/lib/buybox-istatistik";
import { KACIRMA_ESIGI_DK, KONTROL_ARALIGI_DK, type OtomatikGecmis } from "@/lib/buybox-otomatik-verisi";
import { DURUM_YAZISI } from "@/lib/renkler";

/**
 * ============================================================================
 *  SON OTOMATİK DEĞİŞİKLİKLER (K366 adım 3) — Buybox ekranında, kanal başına.
 * ----------------------------------------------------------------------------
 *  28.10.2026 (kullanıcı: «kullanışlı değil, her üründeki değişikliği
 *  defalarca görüyoruz»): BUGÜNÜN değişiklikleri ÜRÜN BAŞINA TEK SATIR —
 *  günün ilk fiyatı → son kabul edilen fiyat, değişiklik sayısı, Buybox şu an
 *  kimde. En çok değişen üstte; yarışan ürün «fiyat yarışı» rozeti taşır.
 *  Saat saat döküm satırın «ayrıntı»sında, varsayılan KAPALI. Satır sayısı
 *  ürün sayısıyla sınırlı (İlke #13); günün toplamı başlıkta (İlke #15).
 *  «Son kontrol» zamanı ve kaçan iş kırmızı (koşmayan iş görünür).
 *  Otomatik ürün de bugün kayıt da yoksa hiç çizilmez (söyleyecek bir şey yok).
 * ============================================================================
 */
/** Kâr (NET-2 · marj) yalnız kârı görebilene (`satis.kar.gor`). */
export async function OtomatikGecmisi({
  gecmis,
  karGorunur,
  durumlar,
}: {
  gecmis: OtomatikGecmis;
  karGorunur: boolean;
  /** Sayfanın CANLI sorgusundaki durum — «Buybox şu an». */
  durumlar: ReadonlyMap<string, BuyboxDurumu>;
}) {
  if (!gecmis.otomatikVar && gecmis.kayitlar.length === 0) return null;
  const t = await getTranslations("Buybox");
  const bicim = await bicimlendirici();
  const para = (n: number | null) => (n === null ? t("bilinmiyor") : bicim.para(n, "TRY"));
  const gruplar = otomatikGrupla(gecmis.kayitlar);
  const kabulToplam = gruplar.reduce((s, g) => s + g.gonderilen, 0);
  const redToplam = gruplar.reduce((s, g) => s + g.reddedilen, 0);
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
      {gruplar.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {gecmis.sonKayitAni === null ? t("otomatikKayitYok") : t("otomatikBugunYok", { an: bicim.tarihSaat(gecmis.sonKayitAni) })}
        </p>
      ) : (
        <>
          <p className="text-sm">
            {t("otomatikBugunOzet", { urun: gruplar.length, degisiklik: kabulToplam })}
            {redToplam > 0 ? <span className={DURUM_YAZISI.olumsuz}>{` · ${t("otomatikBugunRed", { sayi: redToplam })}`}</span> : null}
          </p>
          {gecmis.kesik ? <p className={`text-xs ${DURUM_YAZISI.uyari}`}>{t("otomatikKesik")}</p> : null}
          <ul className="divide-y">
            {gruplar.map((g) => {
              const ilk = g.kayitlar[0];
              const son = g.kayitlar[g.kayitlar.length - 1];
              const fark = g.ilkFiyat !== null && g.sonFiyat !== null ? g.sonFiyat - g.ilkFiyat : null;
              const durum = durumlar.get(g.variantId);
              return (
                <li key={g.variantId} className="space-y-1 py-2 text-sm">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {ilk.urunId === null ? (
                      <span className="font-medium">{ilk.urunAdi}</span>
                    ) : (
                      <Link href={`/urunler/${ilk.urunId}`} className="font-medium underline underline-offset-2 hover:no-underline">
                        {ilk.urunAdi}
                      </Link>
                    )}
                    <DurumRozeti durum="bilgi">{t("otomatikDegisiklikSayisi", { sayi: g.gonderilen })}</DurumRozeti>
                    {g.yaris ? <DurumRozeti durum="uyari">{t("otomatikYaris")}</DurumRozeti> : null}
                    {g.reddedilen > 0 ? <DurumRozeti durum="olumsuz">{t("otomatikRedSayisi", { sayi: g.reddedilen })}</DurumRozeti> : null}
                    {durum === undefined ? null : (
                      <DurumRozeti durum={durum === "BIRINCI" ? "olumlu" : "notr"}>{t("otomatikSuAn", { durum: t(`durum_${durum}`) })}</DurumRozeti>
                    )}
                  </div>
                  <p className="tabular-nums">
                    {g.sonFiyat === null ? t("otomatikHicKabul", { ilk: para(g.ilkFiyat) }) : t("otomatikFiyat", { eski: para(g.ilkFiyat), yeni: para(g.sonFiyat) })}
                    {fark !== null && Math.abs(fark) >= 0.005 ? <span className="text-muted-foreground">{` (${fark > 0 ? "+" : "−"}${para(Math.abs(fark))})`}</span> : null}
                    <span className="text-muted-foreground text-xs">{` · ${t("otomatikSonDegisiklik", { an: bicim.saat(son.an) })}`}</span>
                  </p>
                  {karGorunur && son.net2 !== null && son.marj !== null ? (
                    <p className="text-muted-foreground text-xs">{t("otomatikSonKar", { net2: para(son.net2), marj: bicim.yuzde(son.marj) })}</p>
                  ) : null}
                  <details className="group">
                    <summary className="text-muted-foreground hover:text-foreground inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-xs underline underline-offset-2 md:min-h-7">
                      <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
                      {t("otomatikAyrinti", { sayi: g.kayitlar.length })}
                    </summary>
                    <ol className="mt-1 space-y-1 border-l pl-3">
                      {g.kayitlar.map((k) => (
                        <li key={k.id} className="text-xs">
                          <span className="tabular-nums">{bicim.saat(k.an)}</span>
                          {" · "}
                          <span className="tabular-nums">{t("otomatikFiyat", { eski: para(k.eski), yeni: para(k.yeni) })}</span>
                          {k.gonderildi ? null : <span className={DURUM_YAZISI.olumsuz}>{` · ${t("otomatikReddedildi", { kod: k.kanalSonucu })}`}</span>}
                          <span className="text-muted-foreground block">
                            {t(k.neden === "BUYBOX_AL" ? "otomatikNeden_BUYBOX_AL" : "otomatikNeden_IKINCI_ALTI", { rakip: para(k.rakipFiyati) })}
                            {karGorunur && k.net2 !== null && k.marj !== null ? ` · ${t("otomatikKar", { net2: para(k.net2), marj: bicim.yuzde(k.marj) })}` : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
