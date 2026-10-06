import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Lock, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DURUM_KUTUSU } from "@/lib/renkler";
import { OZELLIK_EKRANLARI, OZELLIKLER } from "@/lib/paket/ozellikler";
import { firmaPaketi, paketler } from "@/lib/paket/yonetim";
import { sayfaGirisi } from "@/lib/yetki";
import { kullanimGorunumu } from "@/lib/paket/kullanim-gorunumu";
import { KullanimKutulari } from "@/components/kullanim-kutulari";

export async function generateMetadata() {
  const t = await getTranslations("Paketim");
  return { title: t("baslik") };
}

/**
 * PAKETİM — firma uygulaması (K303 ② 2. adım, 06.10.2026). Firmanın paketi,
 * açık ve kapalı özellikleri. Kilitli bir ekrana gidilince buraya
 * `?ozellik=` ile gelinir ve NEDEN açılmadığı yazar (İlke #5: sessiz
 * başarısızlık yok). Fiyat GÖSTERİLMEZ (firmaya özel tutar; yönetim verisi).
 * Kendisi pakete bağlı değil (`HEP_ACIK`) — kapansaydı kilit açıklanamazdı.
 */
export default async function PaketimSayfasi({ searchParams }: { searchParams: Promise<{ ozellik?: string }> }) {
  const baglam = await sayfaGirisi();
  const { ozellik } = await searchParams;
  const t = await getTranslations("Paketim");
  const to = await getTranslations("PaketOzelligi");
  const tm = await getTranslations("Menu");
  const [fp, katalog, kg] = await Promise.all([firmaPaketi(baglam.companyId), paketler(), kullanimGorunumu(baglam.companyId)]);
  const acik = fp?.acik ?? new Set<string>();
  const hazir = katalog.filter((p) => !p.firmayaOzel);
  const hangiPaketlerde = (o: string) => hazir.filter((p) => p.ozellikler.includes(o)).map((p) => p.ad);
  const istenen = OZELLIKLER.find((o) => o === ozellik && !acik.has(o)) ?? null;
  const kapali = OZELLIKLER.filter((o) => !acik.has(o));
  const acikListe = OZELLIKLER.filter((o) => acik.has(o));
  const paketMetni = (o: string) => {
    const l = hangiPaketlerde(o);
    return l.length ? t("hangiPaketlerde", { liste: l.join(", ") }) : t("yalnizOzel");
  };

  return (
    <div className="min-w-0 max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-sm">{fp?.paket ? t("paketiniz", { ad: fp.paket.ad }) : t("paketYok")}</p>
      </div>

      {istenen ? (
        <div className={`space-y-2 rounded-lg border p-3 text-sm ${DURUM_KUTUSU.uyari}`}>
          <p className="flex items-center gap-2 font-semibold">
            <Lock className="size-4 shrink-0" />
            {t("kapaliBaslik", { ozellik: to(istenen) })}
          </p>
          <p>{t("kapaliMetin")}</p>
          <p>{paketMetni(istenen)}</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/talepler">
              <MessageSquarePlus />
              {t("talepAc")}
            </Link>
          </Button>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("kullanimBaslik")}</h2>
        <KullanimKutulari kullanim={kg.kullanim} sinirlar={kg.sinirlar} etiketler={kg.etiketler} durumlar={kg.durumlar} sinirsiz={kg.sinirsiz} />
        <p className="text-muted-foreground text-xs">{t("kullanimNotu")}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t("acikBaslik", { sayi: acikListe.length })}</h2>
        <ul className="divide-y rounded-lg border text-sm">
          {acikListe.map((o) => (
            <li key={o} className="px-3 py-2">
              <span className="font-medium">{to(o)}</span>
              <span className="text-muted-foreground block text-xs">{OZELLIK_EKRANLARI[o].map((e) => tm(e)).join(" · ")}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("hepAcikNotu")}</p>
      </section>

      {kapali.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t("kapaliListeBaslik", { sayi: kapali.length })}</h2>
          <ul className="divide-y rounded-lg border text-sm">
            {kapali.map((o) => (
              <li key={o} className={`px-3 py-2 ${o === istenen ? "bg-muted" : ""}`}>
                <span className="flex items-center gap-2 font-medium">
                  <Lock className="text-muted-foreground size-3.5 shrink-0" />
                  {to(o)}
                </span>
                <span className="text-muted-foreground block text-xs">{t("kapaliSatir", { paketler: paketMetni(o) })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
