import { getTranslations } from "next-intl/server";
import { PackageCheck } from "lucide-react";

import { paketlemeIcinAra } from "@/app/paketle/actions";
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
 *  ⚠ VE `/okut` BİR ÖLÇÜM ALETİ: oradaki her okuma dört kovadan birine
 *  yazılıyor ve haftalık kapsam ölçümünü besliyor. Buradaki teyit okuması
 *  o kovalara girseydi ölçüm anlamını kaybederdi — "bilinmeyen ürün
 *  okuması" ile "bilinen siparişin teyidi" aynı kefeye düşerdi.
 *
 *  ── KÖPRÜ: `?kod=` ─────────────────────────────────────────────────────
 *  `/okut`ta okunan kod bir SİPARİŞ çıkarsa oradaki düğme buraya kodu
 *  taşıyarak gelir ve sipariş yüklenmiş açılır (tek okutma, tek tık).
 *
 *  ⚠ ADRESLE GELEN KOD, ELLE OKUTULANLA **AYNI KAPIDAN** GİRER: aynı
 *  `paketlemeIcinAra` çağrılıyor, yani aynı süzgeç (kargoya verilmemiş +
 *  iptal edilmemiş) ve aynı üç sebepli "bulunamadı" ayrımı geçerli. İkinci
 *  bir okuma yolu yazsaydık adres çubuğundan gelen kod başka kurala tabi
 *  olurdu ve fark ancak bir gün, canlıda görünürdü.
 *
 *  ⚠ KÖPRÜ TEK YÖNLÜ (mimar kararı 25.08.2026): buradan `/okut`a geçiş
 *  düğmesi AÇILMAZ. Akışın ortasında ölçüm ekranına düşen bir teyit
 *  okuması, kova karışmasını arka kapıdan geri getirirdi.
 *
 *  ⚠ İZİN `stok.gor` — YENİ İZİN AÇILMADI (okutma ekranıyla aynı gerekçe).
 * ============================================================================
 */
export default async function PaketleSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kod?: string }>;
}) {
  await sayfaIzni("stok.gor");

  const t = await getTranslations("Paketle");
  const p = await searchParams;

  const baslangic = p.kod ? await paketlemeIcinAra(p.kod) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <PackageCheck className="text-muted-foreground size-5" aria-hidden />
        <h1 className="text-xl font-semibold">{t("baslik")}</h1>
      </header>

      <p className="text-muted-foreground max-w-3xl text-sm">{t("aciklama")}</p>

      <Paketleyici baslangicKodu={p.kod ?? ""} baslangic={baslangic} />
    </div>
  );
}
