import { getTranslations } from "next-intl/server";

import { cokBirimAcikMi } from "@/lib/finansman/veri";
import { sayfaIzni } from "@/lib/yetki";

import { FinansmanCokBirimAnahtari } from "./anahtar";

/**
 * ============================================================================
 *  AYARLAR → ÖZELLİKLER (K304-②, 28.09.2026)
 * ----------------------------------------------------------------------------
 *  Firma bazında AÇ/KAPA isteğe bağlı özellikler. Kullanıcı kararı: «herkesin
 *  ihtiyacı olmayabilir». İlk özellik: finansmanda USD ve gram altın birimleri.
 *  Yeni izin açılmadı — ayar ekranı `ayar.yaz` işidir (menü düzeni gerekçesi).
 * ============================================================================
 */

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const tBaslik = await getTranslations("Basliklar");
  return { title: tBaslik("ozellikler") };
}

export default async function OzelliklerSayfasi() {
  const baglam = await sayfaIzni("ayar.yaz");
  const t = await getTranslations("Ozellikler");
  const acik = await cokBirimAcikMi(baglam.companyId);
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("baslik")}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("aciklama")}</p>
      </div>
      <FinansmanCokBirimAnahtari acik={acik} />
    </div>
  );
}
