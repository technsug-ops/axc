import { YONETIM_YOLU } from "@/lib/oturum-imza";
import { getTranslations } from "next-intl/server";

import { ListeyeDon } from "@/components/liste-hafizasi-bilesenleri";
import { yonetimSayfasi } from "@/lib/yonetim-oturumu";
import { paketler } from "@/lib/paket/yonetim";

import { SayfaBasligi } from "../../sayfa-basligi";
import { YeniFirmaFormu } from "./yeni-firma-formu";

export async function generateMetadata() {
  const t = await getTranslations("Yonetim");
  return { title: t("yeniFirma") };
}

/** YENİ FİRMA — Selliora yönetim katmanı (K303 4c-2), referans `.card` içinde. Açılış `lib/firma-acilisi.ts` gövdesinde. */
export default async function YeniFirmaSayfasi() {
  await yonetimSayfasi();
  const t = await getTranslations("Yonetim");
  return (
    <>
      <SayfaBasligi baslik={t("yeniFirma")} ust={<ListeyeDon href={`${YONETIM_YOLU}/firmalar`}>{t("firmalar")}</ListeyeDon>} />
      <section className="yn-card" style={{ maxWidth: 760 }}>
        <YeniFirmaFormu paketler={(await paketler()).map((p) => ({ id: p.id, ad: p.ad, firmayaOzel: p.firmayaOzel }))} />
      </section>
    </>
  );
}
