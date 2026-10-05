import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yonetimSayfasiParolaEkrani } from "@/lib/yonetim-oturumu";

import { ParolaFormu } from "@/app/parola-degistir/parola-formu";
import { yonetimParolamiDegistir } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("parolaDegistir") };
}

/**
 * YÖNETİM PAROLA EKRANI (05.10.2026). Süper admin geçici parolayla girince
 * kapı (`yonetimSayfasi`) buraya gönderir. Form ve kural firma tarafıyla
 * AYNI (`ParolaFormu` + `lib/parola-degisimi.ts`); yalnız eylem yönetimin.
 * Kapı `yonetimSayfasiParolaEkrani`: oturum ister, parola zorunluluğuna bakmaz.
 */
export default async function YonetimParolaSayfasi() {
  const k = await yonetimSayfasiParolaEkrani();
  const t = await getTranslations("ParolaDegistir");
  const ty = await getTranslations("Yonetim");
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
          <p className="text-muted-foreground text-sm">
            {k.parolaDegismeli ? ty("parolaZorunluMetin") : t("aciklamaMetni")}
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{k.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <ParolaFormu eylem={yonetimParolamiDegistir} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
