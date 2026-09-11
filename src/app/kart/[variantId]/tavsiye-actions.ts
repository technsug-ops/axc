"use server";

import { izYaz } from "@/lib/iz";
import { yetkiIste } from "@/lib/yetki";
import { tavsiyeVeriPaketiOlustur } from "@/lib/tavsiye/veri-toplama";
import { tavsiyeUret } from "@/lib/tavsiye/anlati-uret";
import { tavsiyeYedekAnlatiOlustur } from "@/lib/tavsiye/yedek-anlati";

/**
 * ============================================================================
 *  ÜRÜN TAVSİYESİ — SUNUCU EYLEMİ (K-TAVSIYE)
 * ----------------------------------------------------------------------------
 *  ⚠ YENİ İZİN AÇILMAZ — `satis.kar.gor` yeniden kullanılır. Bu eylem
 *  ürün kartı sayfasının ZATEN `satis.kar.gor`e bağlı olan Kârlılık
 *  bölümünün bir kardeşi; ikinci bir alan-izni açmak
 *  `lib/yetki/izinler.ts`'in "satis.kar.gor BİLİNÇLİ TEK İSTİSNADIR"
 *  kuralını çiğnerdi.
 *
 *  ⚠ İZ YALNIZ LLM ÇAĞRISI YAPILDIYSA YAZILIR — `YETERSIZ_VERI`/`URUN_YOK`
 *  sıfır maliyetli, deterministik durumlar; izlemeye değer bir olay değil.
 * ============================================================================
 */
export type TavsiyeAlSonucu =
  | { tamam: true; metin: string; kaynak: "YAPAY_ZEKA" | "YEDEK" }
  | { tamam: false; hata: "YETERSIZ_VERI" | "URUN_YOK" };

export async function urunTavsiyesiAl(variantId: string): Promise<TavsiyeAlSonucu> {
  await yetkiIste("satis.kar.gor");

  const durum = await tavsiyeVeriPaketiOlustur(variantId);
  if (durum.durum === "URUN_YOK") return { tamam: false, hata: "URUN_YOK" };
  if (durum.durum === "YETERSIZ_VERI") return { tamam: false, hata: "YETERSIZ_VERI" };

  const sonuc = await tavsiyeUret(durum.paket);

  await izYaz({
    action: "URUN_TAVSIYESI_ISTENDI",
    targetType: "ProductVariant",
    targetId: variantId,
    detail: JSON.stringify(
      sonuc.tamam
        ? {
            durum: "YAYINDA",
            saglayiciAdi: sonuc.saglayiciAdi,
            modelAdi: sonuc.modelAdi,
            girdiTokenSayisi: sonuc.girdiTokenSayisi,
            ciktiTokenSayisi: sonuc.ciktiTokenSayisi,
          }
        : {
            durum: sonuc.sebep,
            saglayiciAdi: sonuc.saglayiciAdi,
            modelAdi: sonuc.modelAdi,
            detay: sonuc.detay ?? [],
          },
    ),
  });

  return sonuc.tamam
    ? { tamam: true, metin: sonuc.metin, kaynak: "YAPAY_ZEKA" }
    : { tamam: true, metin: tavsiyeYedekAnlatiOlustur(durum.paket), kaynak: "YEDEK" };
}
