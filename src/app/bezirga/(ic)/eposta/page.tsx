import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { gidenEpostalar } from "@/lib/eposta";
import { DURUM_YAZISI } from "@/lib/renkler";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";
import { sorunluEpostalar } from "@/lib/yonetim/durumlar";
import { YONETIM_YOLU } from "@/lib/oturum-imza";
import Link from "next/link";

import { SayfaBasligi } from "../sayfa-basligi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("gidenEpostalar") };
}

/**
 * GİDEN E-POSTALAR (K303, kullanıcı kararı 05.10.2026: «mailler super adminde
 * olmalı»). Kaynak iz (`EPOSTA_GONDERILDI` · `EPOSTA_GONDERILEMEDI` ·
 * `EPOSTA_AYAR_YOK`); gönderilemeyenin sebebi TAM yazar (İlke #5).
 */
export default async function GidenEpostalarSayfasi({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  /* «sorunlu» süzgeci — «Bugün»deki satır ve menü rozetiyle AYNI ölçüt
     (`sorunluEpostalar`): gönderilemeyen + ayarı olmayan, son 30 gün. */
  const sorunlu = (await searchParams).durum === "sorunlu";
  const liste = sorunlu ? await sorunluEpostalar() : await gidenEpostalar({ adet: 100 });

  return (
    <div className="max-w-4xl space-y-4">
      <SayfaBasligi baslik={t("gidenEpostalar")} aciklama={t("epostaListeNotu")} />
      <nav className="flex flex-wrap gap-1.5">
        <Link href={`${YONETIM_YOLU}/eposta`} aria-current={!sorunlu ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm no-underline ${!sorunlu ? "bg-foreground text-background" : "hover:bg-muted"}`}>{t("epostaSuzgecTumu")}</Link>
        <Link href={`${YONETIM_YOLU}/eposta?durum=sorunlu`} aria-current={sorunlu ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm no-underline ${sorunlu ? "bg-foreground text-background" : `hover:bg-muted ${DURUM_YAZISI.olumsuz}`}`}>{t("epostaSuzgecSorunlu")}</Link>
      </nav>
      <p className="text-muted-foreground text-sm">{t("epostaSayisi", { sayi: liste.length })}</p>
      {liste.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("epostaYok")}</p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {liste.map((e) => (
            <li key={e.id} className="space-y-1 px-3 py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-muted-foreground tabular-nums">{bicim.tarihSaat(e.an)}</span>
                <Badge variant={e.durum === "GONDERILDI" ? "secondary" : "destructive"}>
                  {e.durum === "GONDERILDI" ? t("epostaDurumGitti") : e.durum === "AYAR_YOK" ? t("epostaDurumAyarYok") : t("epostaDurumGitmedi")}
                </Badge>
                <span><span className="text-muted-foreground">{t("epostaKime")}: </span>{e.kime}</span>
                {e.firma ? <span className="text-muted-foreground">{t("epostaFirma")}: {e.firma}</span> : null}
              </div>
              <p><span className="text-muted-foreground">{t("epostaKonu")}: </span>{e.konu}</p>
              {e.hata ? <p className={`text-xs ${DURUM_YAZISI.olumsuz}`}>{e.hata}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
