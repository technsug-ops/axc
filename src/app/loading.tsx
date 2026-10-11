import { getTranslations } from "next-intl/server";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * ============================================================================
 *  ORTAK YÜKLENİYOR EKRANI (kullanıcı 11.10.2026: «mobilde tıklamalara geç
 *  reaksiyon alıyoruz»)
 * ----------------------------------------------------------------------------
 *  Sistemde HİÇ `loading.tsx` yoktu. Bütün sayfalar dinamik (oturum + canlı
 *  veri); bu sürümün belgesine göre yükleniyor ekranı olmayan dinamik sayfada
 *  gezinme sunucu sayfayı BİTİRENE kadar başlamaz — telefonda dokunuş «hiçbir
 *  şey olmadı» gibi görünür (`node_modules/next/dist/docs/01-app/01-getting-
 *  started/04-linking-and-navigating.md` → «Dynamic routes without loading.tsx»).
 *  Bu dosya kökte durur: kendi yükleniyor ekranı olmayan her sayfaya işler;
 *  menü ve üst çubuk (yerleşim) yerinde kalır, yalnız içerik alanı iskelete döner.
 *
 *  ⚠ SUNUCUNUN HIZINI DEĞİŞTİRMEZ — dokunuşa ANINDA karşılık verir. Yavaş
 *  sayfanın kendisi ayrıca ölçülür.
 * ============================================================================
 */
export default async function Yukleniyor() {
  const t = await getTranslations("Ortak");
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{t("sayfaYukleniyor")}</span>
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
