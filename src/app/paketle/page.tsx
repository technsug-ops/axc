import { getTranslations } from "next-intl/server";
import { PackageCheck } from "lucide-react";

import { Paketleyici } from "@/app/paketle/paketleyici";
import { sayfaIzni } from "@/lib/yetki";

/**
 * ============================================================================
 *  YÖNLENDİRMELİ PAKETLEME (K46)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `/okut`TAN AYRI EKRAN: iki ekranın GİRİŞİ farklı. `/okut` "elimdeki
 *  bu kod ne" diye sorar (ürün önce); burada soru "bu kutuyu nasıl
 *  paketlerim" (sipariş önce). İkisini tek ekrana koymak, her okumada
 *  "ürün mü arıyorum sipariş mi" belirsizliği üretir ve ikisini birden
 *  kötüleştirirdi. Mantık ORTAK — `paketlendiIsaretle` tek yerde.
 *
 *  ⚠ İZİN `stok.gor` — YENİ İZİN AÇILMADI (okutma ekranıyla aynı gerekçe).
 * ============================================================================
 */
export default async function PaketleSayfasi() {
  await sayfaIzni("stok.gor");

  const t = await getTranslations("Paketle");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <PackageCheck className="text-muted-foreground size-5" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>

      <Paketleyici />
    </div>
  );
}
