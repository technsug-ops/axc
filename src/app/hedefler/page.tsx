import { getTranslations } from "next-intl/server";
import Link from "@/components/niyetli-baglanti";
import { sayfaIzni } from "@/lib/yetki";
import { HedefIlerlemesi } from "./hedef-ilerlemesi";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("Hedef");
  return { title: t("kartBaslik") };
}

/**
 * K349-③ — HEDEFLER (kullanıcı 21.10.2026: «tıklandığında ayrı sayfada çıksın»).
 * Üst çubuktaki Hedefler düğmesinin açtığı sayfa: hedefi konmuş her ölçüt × dönemin
 * ilerlemesi. Ciroyu gören (`satis.gor`) açar; kâr satırları `satis.kar.gor` ile.
 * Hedef GİRMEK ayrı ekranda (Ayarlar → Hedefler, `hedef.yonet`).
 */
export default async function HedeflerSayfasi() {
  const baglam = await sayfaIzni("satis.gor");
  const t = await getTranslations("Hedef");
  const hedefYonetir = baglam.izinler.has("hedef.yonet");
  return <div className="min-w-0 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold">{t("kartBaslik")}</h1>
      {hedefYonetir ? <Link href="/ayarlar/hedefler" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{t("duzenle")}</Link> : null}
    </div>
    <p className="max-w-3xl text-sm text-muted-foreground">{t("sayfaAciklama")}</p>
    <HedefIlerlemesi karGorunur={baglam.izinler.has("satis.kar.gor")} hedefYonetir={hedefYonetir} />
  </div>;
}
