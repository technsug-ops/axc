import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { bicimlendirici } from "@/lib/bicim";
import { odemeGenelBakisi } from "@/lib/odeme-takibi";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tMenu = await getTranslations("YonetimMenu");
  return { title: tMenu("odemeler") };
}

const SUZGECLER = ["GECIKTI", "YAKLASIYOR", "ZAMANINDA", "TANIMSIZ"] as const;
type Suzgec = (typeof SUZGECLER)[number];

/** Vade durumu → referans `.chip` / `.pill` sınıfı. */
const SINIF: Record<Suzgec, string> = { GECIKTI: "bad", YAKLASIYOR: "warn", ZAMANINDA: "ok", TANIMSIZ: "" };

/**
 * ÖDEMELER — bütün firmalar, referans iskelet BİREBİR (`.segbar` çipleri +
 * `.tablewrap` tablolar). Üstte durum çipleri (sayı = liste; «gecikti» menü
 * rozeti ve «Bugün» ile AYNI gövde), firmaların vade durumu; altta BU AYIN
 * ödemeleri ve toplamı (İlke #15: tek tek gösterilen yerde toplam da olur;
 * ters kayıtlar toplamdan düşer). Ödeme GİRİŞİ firma kartında — bu sayfa
 * yalnız gösterir ve oraya götürür.
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
    <>
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama")} />

      <div className="yn-stack">
        <nav aria-label={t("durumSuzgeci")} className="yn-card yn-segbar" style={{ marginBottom: 0 }}>
          <div className="yn-segrow">
            <Link href={adres()} aria-current={!durum ? "true" : undefined} className={`yn-chip${!durum ? " on" : ""}`}>
              {t("tumu")} <b>{g.firmalar.length}</b>
            </Link>
            {SUZGECLER.map((s) => (
              <Link key={s} href={adres(s)} aria-current={durum === s ? "true" : undefined} className={`yn-chip ${SINIF[s]}${durum === s ? " on" : ""}`}>
                {t(`durum_${s}`)} <b>{sayi(s)}</b>
              </Link>
            ))}
          </div>
        </nav>

        <section>
          <h2>{t("firmalarBaslik")}</h2>
          {gorunen.length === 0 ? (
            <div className="yn-card yn-muted">{t("bos")}</div>
          ) : (
            <div className="yn-tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>{t("sutunFirma")}</th>
                    <th>{t("sutunVade")}</th>
                    <th>{t("sutunAbonelik")}</th>
                    <th>{t("sutunPaket")}</th>
                    <th>{t("sutunSonOdeme")}</th>
                  </tr>
                </thead>
                <tbody>
                  {gorunen.map((f) => {
                    const d = f.durum;
                    const durumMetni =
                      d.tur === "TANIMSIZ" ? t("tanimsiz")
                      : d.tur === "GECIKTI" ? t("gecikti", { gecen: d.gecenGun, tarih: bicim.tarih(d.vade) })
                      : t("kalan", { kalan: d.kalanGun, tarih: bicim.tarih(d.vade) });
                    return (
                      <tr key={f.id} className="click">
                        <td><Link href={`${YONETIM_YOLU}/firmalar/${f.id}#odemeler`} className="yn-rowlink">{f.ad}</Link></td>
                        <td><span className={`yn-pill ${SINIF[d.tur]}`}>{durumMetni}</span></td>
                        <td className="nw">
                          {f.tutar !== null && f.paraBirimi && f.donem ? t("abonelik", { tutar: bicim.para(f.tutar, f.paraBirimi), donem: ty(`donem${f.donem}`) }) : <span className="yn-muted">—</span>}
                        </td>
                        <td>{f.paket ? <span className="yn-pill acc">{f.paket}</span> : <span className="yn-muted">—</span>}</td>
                        <td className="yn-muted yn-small">
                          {f.sonOdeme ? t("sonOdeme", { tarih: bicim.tarih(f.sonOdeme.gun), tutar: bicim.para(f.sonOdeme.tutar, f.sonOdeme.paraBirimi) }) : t("odemeYok")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2>{t("buAyBaslik")}</h2>
          {g.buAy.length === 0 ? (
            <div className="yn-card yn-muted">{t("buAyBos")}</div>
          ) : (
            <>
              <div className="yn-kpis" style={{ marginBottom: 12 }}>
                <div className="yn-card yn-kpi">
                  <span>{t("buAyToplam", { sayi: g.buAy.length })}</span>
                  <b>{g.buAyToplam.map((x) => bicim.para(x.tutar, x.paraBirimi)).join(" · ")}</b>
                </div>
              </div>
              <div className="yn-tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("sutunTarih")}</th>
                      <th>{t("sutunFirma")}</th>
                      <th className="num">{t("sutunTutar")}</th>
                      <th>{t("sutunYontem")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.buAy.map((o) => (
                      <tr key={o.id}>
                        <td className="nw yn-muted">{bicim.tarih(o.gun)}</td>
                        <td><Link href={`${YONETIM_YOLU}/firmalar/${o.firmaId}#odemeler`} className="yn-rowlink">{o.firma}</Link></td>
                        <td className="num" style={{ fontWeight: 600, color: o.tersKayit ? "var(--bad)" : undefined }}>{bicim.para(o.tutar, o.paraBirimi)}</td>
                        <td>
                          {ty(`odemeYontemi${o.yontem}`)}
                          {o.tersKayit ? <span className="yn-pill bad" style={{ marginLeft: 6 }}>{ty("tersKayitEtiketi")}</span> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
