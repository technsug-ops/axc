import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { odemeGenelBakisi } from "@/lib/odeme-takibi";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { DURUM_YAZISI } from "@/lib/renkler";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tMenu = await getTranslations("YonetimMenu");
  return { title: tMenu("odemeler") };
}

const SUZGECLER = ["GECIKTI", "YAKLASIYOR", "ZAMANINDA", "TANIMSIZ"] as const;
type Suzgec = (typeof SUZGECLER)[number];

/**
 * ÖDEMELER — bütün firmalar (referans iskelet, 06.10.2026). Üstte durum
 * çipleri (sayı = liste; «gecikti» menü rozeti ve «Bugün» ile AYNI gövde),
 * firmaların vade durumu; altta BU AYIN ödemeleri ve toplamı (İlke #15:
 * tek tek gösterilen yerde toplam da olur; ters kayıtlar toplamdan düşer).
 * Ödeme GİRİŞİ firma kartında — bu sayfa yalnız gösterir ve oraya götürür.
 */
export default async function OdemelerSayfasi({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await yonetimSayfasi();
  const ham = (await searchParams).durum;
  const durum: Suzgec | undefined = SUZGECLER.find((s) => s === ham);
  const t = await getTranslations("YonetimOdemeler");
  const ty = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  const g = await odemeGenelBakisi();
  const sayi = (s: Suzgec) => g.firmalar.filter((f) => f.durum.tur === s).length;
  const gorunen = durum ? g.firmalar.filter((f) => f.durum.tur === durum) : g.firmalar;
  const adres = (s?: Suzgec) => `${YONETIM_YOLU}/odemeler${s ? `?durum=${s}` : ""}`;

  return (
    <div className="space-y-6">
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama")} />

      <nav aria-label={t("durumSuzgeci")} className="flex flex-wrap gap-1.5">
        <Link href={adres()} aria-current={!durum ? "true" : undefined} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm no-underline ${!durum ? "bg-foreground text-background" : "hover:bg-muted"}`}>
          {t("tumu")} <b className="tabular-nums">{g.firmalar.length}</b>
        </Link>
        {SUZGECLER.map((s) => (
          <Link key={s} href={adres(s)} aria-current={durum === s ? "true" : undefined} className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-sm no-underline ${durum === s ? "bg-foreground text-background" : `hover:bg-muted ${s === "GECIKTI" ? DURUM_YAZISI.olumsuz : s === "YAKLASIYOR" ? DURUM_YAZISI.uyari : ""}`}`}>
            {t(`durum_${s}`)} <b className="tabular-nums">{sayi(s)}</b>
          </Link>
        ))}
      </nav>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("firmalarBaslik")}</h2>
        {gorunen.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("bos")}</p>
        ) : (
          <ul className="bg-card divide-y rounded-xl border text-sm">
            {gorunen.map((f) => {
              const d = f.durum;
              const durumMetni =
                d.tur === "TANIMSIZ" ? t("tanimsiz")
                : d.tur === "GECIKTI" ? t("gecikti", { gecen: d.gecenGun, tarih: bicim.tarih(d.vade) })
                : t("kalan", { kalan: d.kalanGun, tarih: bicim.tarih(d.vade) });
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-3">
                  <Link href={`${YONETIM_YOLU}/firmalar/${f.id}#odemeler`} className="inline-flex min-h-11 min-w-40 items-center font-medium underline-offset-4 hover:underline">{f.ad}</Link>
                  <span className={d.tur === "GECIKTI" ? DURUM_YAZISI.olumsuz : d.tur === "YAKLASIYOR" ? DURUM_YAZISI.uyari : "text-muted-foreground"}>{durumMetni}</span>
                  {f.tutar !== null && f.paraBirimi && f.donem ? (
                    <span className="tabular-nums">{t("abonelik", { tutar: bicim.para(f.tutar, f.paraBirimi), donem: ty(`donem${f.donem}`) })}</span>
                  ) : null}
                  {f.paket ? <Badge variant="secondary">{f.paket}</Badge> : null}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {f.sonOdeme ? t("sonOdeme", { tarih: bicim.tarih(f.sonOdeme.gun), tutar: bicim.para(f.sonOdeme.tutar, f.sonOdeme.paraBirimi) }) : t("odemeYok")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("buAyBaslik")}</h2>
        {g.buAy.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("buAyBos")}</p>
        ) : (
          <>
            <p className="text-sm">
              {t("buAyToplam", { sayi: g.buAy.length })} <b className="tabular-nums">{g.buAyToplam.map((x) => bicim.para(x.tutar, x.paraBirimi)).join(" · ")}</b>
            </p>
            <ul className="bg-card divide-y rounded-xl border text-sm">
              {g.buAy.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                  <span className="text-muted-foreground tabular-nums">{bicim.tarih(o.gun)}</span>
                  <Link href={`${YONETIM_YOLU}/firmalar/${o.firmaId}#odemeler`} className="inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline">{o.firma}</Link>
                  <span className={`font-semibold tabular-nums ${o.tersKayit ? DURUM_YAZISI.olumsuz : ""}`}>{bicim.para(o.tutar, o.paraBirimi)}</span>
                  <span className="text-muted-foreground">{ty(`odemeYontemi${o.yontem}`)}</span>
                  {o.tersKayit ? <span className="text-muted-foreground">{ty("tersKayitEtiketi")}</span> : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
