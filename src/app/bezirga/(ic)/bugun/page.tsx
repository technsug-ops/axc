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

/** Referans: `.todo` satır rengi (bad / warn / acc). */
const RENK = {
  olumsuz: "bg-[#FCE9DF] text-[#C2410C] dark:bg-[#3A1D12] dark:text-[#F4A27A]",
  uyari: "bg-[#FBF0D9] text-[#8A5A00] dark:bg-[#33270C] dark:text-[#E5BE7C]",
  bilgi: "bg-[#E3F2EF] text-[#197A71] dark:bg-[#12302D] dark:text-[#7FD3C8]",
} as const;
const ETIKET_RENK: Record<FirmaEtiketi, keyof typeof RENK> = {
  ODEME_GECIKTI: "olumsuz",
  UYARI_DOLDU: "olumsuz",
  YARIM_KURULUM: "olumsuz",
  PAKETSIZ: "olumsuz",
  UYARIDA: "uyari",
  ODEME_YAKLASIYOR: "uyari",
  SINIR_DOLU: "bilgi",
  ASKIDA: "uyari",
  AKTIF: "bilgi",
};

/** «Firmalar nerede?» parçaları — her firma TAM BİRİNE düşer (bekçi ölçer). */
const DURAK: { etiket: FirmaEtiketi; renk: string }[] = [
  { etiket: "AKTIF", renk: "#197A71" },
  { etiket: "UYARIDA", renk: "#E3A83A" },
  { etiket: "UYARI_DOLDU", renk: "#C2410C" },
  { etiket: "ASKIDA", renk: "#5B5552" },
  { etiket: "YARIM_KURULUM", renk: "#B9B3AC" },
];

/**
 * BUGÜN — referans iskeletin `overview` sayfası (HA-Kompass admin). Solda
 * YAPILACAKLAR (her satır sayı + ilk firmalar + süzülmüş listeye bağlantı),
 * sağda «Firmalar nerede?» çubuğu; üstte tıklanabilir sayı kartları.
 * Sayılar ve listeler AYNI etiketten (`lib/yonetim/durumlar`) — sayı = liste.
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
    <div className="space-y-4">
      <SayfaBasligi baslik={t("baslik")} aciklama={t("aciklama", { tarih: bicim.tarih(bugunIs()) })} />

      {/* SAYI KARTLARI — referans `.kpis` (her biri tıklanabilir) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { href: firmalarAdresi(), etiket: t("kpiFirma"), deger: bicim.sayi(ozetler.length), alt: t("kpiFirmaAlt", { aktif: sayilar.get("AKTIF") ?? 0 }) },
          { href: `${YONETIM_YOLU}/odemeler`, etiket: t("kpiTahsilat"), deger: tahsilat.length ? tahsilat.map((x) => bicim.para(x.tutar, x.paraBirimi)).join(" · ") : bicim.sayi(0), alt: t("kpiTahsilatAlt") },
          { href: firmalarAdresi("ODEME_GECIKTI"), etiket: t("kpiGeciken"), deger: bicim.sayi(sayilar.get("ODEME_GECIKTI") ?? 0), alt: t("kpiGecikenAlt") },
          { href: firmalarAdresi(), etiket: t("kpiKullanici"), deger: bicim.sayi(toplamKullanici), alt: t("kpiKullaniciAlt") },
        ].map((k) => (
          <Link key={k.etiket} href={k.href} className="bg-card hover:border-foreground/30 grid min-h-11 gap-0.5 rounded-xl border p-4 no-underline">
            <span className="text-muted-foreground text-xs font-semibold">{k.etiket}</span>
            <b className="text-2xl leading-tight font-bold tabular-nums">{k.deger}</b>
            <small className="text-muted-foreground text-xs">{k.alt}</small>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* YAPILACAKLAR — referans `.todo` */}
        <section className="bg-card rounded-xl border p-2">
          <h2 className="px-3 pt-2 pb-1 font-semibold">{t("yapilacaklar")}</h2>
          {yapilacaklar.length === 0 && gonderilemeyen === 0 ? (
            <p className={`flex items-center gap-3 p-3 text-sm font-semibold ${RENK.bilgi} rounded-lg`}>
              <CircleCheck className="size-5 shrink-0" />
              {t("bekleyenYok")}
            </p>
          ) : (
            <ul className="grid">
              {yapilacaklar.map((e) => {
                const Ikon = IKON[e];
                return (
                  <li key={e}>
                    <Link href={firmalarAdresi(e)} className="hover:bg-muted grid min-h-11 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2.5 no-underline">
                      <span className={`grid size-9 place-items-center rounded-lg ${RENK[ETIKET_RENK[e]]}`}><Ikon className="size-[18px]" aria-hidden /></span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{t(`yapilacak_${e}`)}</span>
                        <span className="text-muted-foreground block truncate text-xs">{ilkleri(e)}</span>
                      </span>
                      <b className="text-lg tabular-nums">{sayilar.get(e)}</b>
                    </Link>
                  </li>
                );
              })}
              {gonderilemeyen > 0 ? (
                <li>
                  <Link href={`${YONETIM_YOLU}/eposta?durum=sorunlu`} className="hover:bg-muted grid min-h-11 grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2.5 no-underline">
                    <span className={`grid size-9 place-items-center rounded-lg ${RENK.olumsuz}`}><MailX className="size-[18px]" aria-hidden /></span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{t("yapilacakEposta")}</span>
                      <span className="text-muted-foreground block truncate text-xs">{t("yapilacakEpostaIpucu")}</span>
                    </span>
                    <b className="text-lg tabular-nums">{gonderilemeyen}</b>
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </section>

        {/* FİRMALAR NEREDE? — referans `.stagebar` + `.legend` */}
        <section className="bg-card rounded-xl border p-4">
          <h2 className="mb-2 font-semibold">{t("firmalarNerede")}</h2>
          <div className="bg-muted mb-3 flex h-3.5 overflow-hidden rounded-lg" aria-hidden>
            {DURAK.map((d) => {
              const n = sayilar.get(d.etiket) ?? 0;
              return n ? <i key={d.etiket} className="block h-full" style={{ width: `${(n / durakToplam) * 100}%`, background: d.renk }} /> : null;
            })}
          </div>
          <ul className="grid gap-1">
            {DURAK.map((d) => {
              const n = sayilar.get(d.etiket) ?? 0;
              const ic = (
                <>
                  <span className="size-2.5 rounded-[3px]" style={{ background: d.renk }} />
                  <span className="font-medium">{t(`durak_${d.etiket}`)}</span>
                  <b className="tabular-nums">{n}</b>
                </>
              );
              return (
                <li key={d.etiket}>
                  {n > 0 ? (
                    <Link href={firmalarAdresi(d.etiket)} className="hover:bg-muted grid min-h-11 grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1.5 text-sm no-underline">{ic}</Link>
                  ) : (
                    // Sıfır satır gizlenmez ama bağlantı da olmaz (anayasa: «sıfır satır bağlantı olmaz»).
                    <span className="text-muted-foreground grid min-h-11 grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2.5 px-1.5 text-sm">{ic}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <Link href={firmalarAdresi()} className="text-muted-foreground mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs underline underline-offset-4">
            <Building2 className="size-3.5" />
            {t("tumFirmalar")}
          </Link>
        </section>
      </div>
    </div>
  );
}
