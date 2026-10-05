import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { bicimlendirici } from "@/lib/bicim";
import { gidenEpostalar } from "@/lib/eposta";
import { DURUM_YAZISI } from "@/lib/renkler";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";

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
export default async function GidenEpostalarSayfasi() {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  const bicim = await bicimlendirici();
  const liste = await gidenEpostalar({ adet: 100 });

  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">{t("gidenEpostalar")}</h1>
      <p className="text-muted-foreground text-sm">{t("epostaListeNotu")}</p>
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
