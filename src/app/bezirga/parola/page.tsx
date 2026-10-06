import { getTranslations } from "next-intl/server";

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
    <div className="yn-login">
      <div>
        <h1>{t("baslik")}</h1>
        <p className="yn-muted yn-small" style={{ margin: "4px 0 0" }}>
          {k.parolaDegismeli ? ty("parolaZorunluMetin") : t("aciklamaMetni")}
        </p>
      </div>
      <section className="yn-card">
        <h2>{k.email}</h2>
        <ParolaFormu eylem={yonetimParolamiDegistir} />
      </section>
    </div>
  );
}
