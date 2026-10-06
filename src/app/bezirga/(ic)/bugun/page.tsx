import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlertTriangle, BadgeCheck, Ban, Building2, CalendarClock, CircleCheck, Gauge, MailX, PackageX, Wallet, Wrench, type LucideIcon } from "lucide-react";

import { bicimlendirici } from "@/lib/bicim";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { buAyTahsilat, etiketSayilari, firmaOzetleri, firmalarAdresi, gonderilemeyenEpostaSayisi, YAPILACAK_ETIKETLERI, type FirmaEtiketi } from "@/lib/yonetim/durumlar";
import { bugunIs } from "@/lib/aski-sureci";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tMenu = await getTranslations("YonetimMenu");
  return { title: tMenu("bugun") };
}

const IKON: Record<FirmaEtiketi, LucideIcon> = {
  ODEME_GECIKTI: Wallet,
  UYARI_DOLDU: AlertTriangle,
  YARIM_KURULUM: Wrench,
  PAKETSIZ: PackageX,
  UYARIDA: CalendarClock,
  ODEME_YAKLASIYOR: CalendarClock,
  SINIR_DOLU: Gauge,
  ASKIDA: Ban,
  AKTIF: BadgeCheck,
};

/** Referans `.todo` satır sınıfı (bad / warn / acc). */
const SATIR: Record<FirmaEtiketi, "bad" | "warn" | "acc"> = {
  ODEME_GECIKTI: "bad",
  UYARI_DOLDU: "bad",
  YARIM_KURULUM: "bad",
  PAKETSIZ: "bad",
  UYARIDA: "warn",
  ODEME_YAKLASIYOR: "warn",
  SINIR_DOLU: "acc",
  ASKIDA: "warn",
  AKTIF: "acc",
};

/** «Firmalar nerede?» parçaları — referans COLORS: aktif teal · risk bad · kurulum ochre · uyuyan gri · kilitli koyu. Her firma TAM BİRİNE düşer (bekçi ölçer). */
const DURAK: { etiket: FirmaEtiketi; renk: string }[] = [
  { etiket: "AKTIF", renk: "var(--teal)" },
  { etiket: "UYARIDA", renk: "var(--ochre)" },
  { etiket: "UYARI_DOLDU", renk: "var(--bad)" },
  { etiket: "ASKIDA", renk: "#5B5552" },
  { etiket: "YARIM_KURULUM", renk: "#B9B3AC" },
];

/**
 * BUGÜN — referans `overview` BİREBİR: üstte `.kpis` (tıklanabilir sayı
 * kartları), altta `.grid2`: solda «Yapılacaklar» (`.todo` — renkli ikon
 * kutusu, başlık + ilk firmalar, kalın sayı), sağda «Firmalar nerede?»
 * (`.stagebar` + `.legend`). Sayılar ve listeler AYNI etiketten
 * (`lib/yonetim/durumlar`) — sayı = liste.
 */
export default async function BugunSayfasi() {
  await yonetimSayfasi();
  const t = await getTranslations("YonetimBugun");
  const bicim = await bicimlendirici();
  const [ozetler, gonderilemeyen, tahsilat] = await Promise.all([firmaOzetleri(), gonderilemeyenEpostaSayisi(), buAyTahsilat()]);
  const sayilar = etiketSayilari(ozetler);
  const ilkleri = (e: FirmaEtiketi) => {
    const l = ozetler.filter((o) => o.etiketler.includes(e));
    return l.slice(0, 3).map((o) => o.ad).join(" · ") + (l.length > 3 ? " …" : "");
  };
  const yapilacaklar = YAPILACAK_ETIKETLERI.filter((e) => (sayilar.get(e) ?? 0) > 0);
  const toplamKullanici = ozetler.reduce((a, o) => a + o.uyeSayisi, 0);
  const durakToplam = Math.max(1, DURAK.reduce((a, d) => a + (sayilar.get(d.etiket) ?? 0), 0));

  return (
    <>
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama", { tarih: bicim.tarih(bugunIs()) })} />

      <div className="yn-stack">
        <div className="yn-kpis">
          {[
            { href: firmalarAdresi(), etiket: t("kpiFirma"), deger: bicim.sayi(ozetler.length), alt: t("kpiFirmaAlt", { aktif: sayilar.get("AKTIF") ?? 0 }) },
            { href: `${YONETIM_YOLU}/odemeler`, etiket: t("kpiTahsilat"), deger: tahsilat.length ? tahsilat.map((x) => bicim.para(x.tutar, x.paraBirimi)).join(" · ") : bicim.sayi(0), alt: t("kpiTahsilatAlt") },
            { href: firmalarAdresi("ODEME_GECIKTI"), etiket: t("kpiGeciken"), deger: bicim.sayi(sayilar.get("ODEME_GECIKTI") ?? 0), alt: t("kpiGecikenAlt") },
            { href: firmalarAdresi(), etiket: t("kpiKullanici"), deger: bicim.sayi(toplamKullanici), alt: t("kpiKullaniciAlt") },
          ].map((k) => (
            <Link key={k.etiket} href={k.href} className="yn-card yn-kpi">
              <span>{k.etiket}</span>
              <b>{k.deger}</b>
              <small>{k.alt}</small>
            </Link>
          ))}
        </div>

        <div className="yn-grid2">
          <section className="yn-card" style={{ padding: "10px 8px" }}>
            <h2 style={{ padding: "8px 12px 0" }}>{t("yapilacaklar")}</h2>
            {yapilacaklar.length === 0 && gonderilemeyen === 0 ? (
              <div className="yn-allgood">
                <CircleCheck width={22} height={22} aria-hidden />
                {t("bekleyenYok")}
              </div>
            ) : (
              <div className="yn-todo">
                {yapilacaklar.map((e) => {
                  const Ikon = IKON[e];
                  return (
                    <Link key={e} href={firmalarAdresi(e)} className={SATIR[e]}>
                      <span className="ico"><Ikon aria-hidden /></span>
                      <span>
                        <span className="t">{t(`yapilacak_${e}`)}</span>
                        <span className="h">{ilkleri(e)}</span>
                      </span>
                      <b className="n">{sayilar.get(e)}</b>
                    </Link>
                  );
                })}
                {gonderilemeyen > 0 ? (
                  <Link href={`${YONETIM_YOLU}/eposta?durum=sorunlu`} className="bad">
                    <span className="ico"><MailX aria-hidden /></span>
                    <span>
                      <span className="t">{t("yapilacakEposta")}</span>
                      <span className="h">{t("yapilacakEpostaIpucu")}</span>
                    </span>
                    <b className="n">{gonderilemeyen}</b>
                  </Link>
                ) : null}
              </div>
            )}
          </section>

          <section className="yn-card">
            <h2>{t("firmalarNerede")}</h2>
            <div className="yn-stagebar" aria-hidden>
              {DURAK.map((d) => {
                const n = sayilar.get(d.etiket) ?? 0;
                return n ? <i key={d.etiket} style={{ width: `${(n / durakToplam) * 100}%`, background: d.renk }} /> : null;
              })}
            </div>
            <div className="yn-legend">
              {DURAK.map((d) => {
                const n = sayilar.get(d.etiket) ?? 0;
                const ic = (
                  <>
                    <span className="dot" style={{ background: d.renk }} />
                    <span><b>{t(`durak_${d.etiket}`)}</b></span>
                    <b>{n}</b>
                  </>
                );
                // Sıfır satır gizlenmez ama bağlantı da olmaz (anayasa: «sıfır satır bağlantı olmaz»).
                return n > 0 ? <Link key={d.etiket} href={firmalarAdresi(d.etiket)}>{ic}</Link> : <span key={d.etiket}>{ic}</span>;
              })}
            </div>
            <Link href={firmalarAdresi()} className="yn-btn sm" style={{ marginTop: 10 }}>
              <Building2 aria-hidden />
              {t("tumFirmalar")}
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
