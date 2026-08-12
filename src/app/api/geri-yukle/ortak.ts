import { get } from "@vercel/blob";

import { yedegiCoz, type CozumSonucu } from "@/lib/geri-yukle";

/**
 * ============================================================================
 *  GERİ YÜKLEME UÇLARI — ORTAK KAYNAK OKUMA
 * ----------------------------------------------------------------------------
 *  İki uç (analiz ve uygula) AYNI dosyayı AYNI şekilde okur. Ayrı okusalardı
 *  önizlemede görülen dosya ile yüklenen dosya farklı olabilirdi — bu ekranda
 *  böyle bir fark, kullanıcının onayladığı şeyin dışında bir veri yazmak
 *  demektir.
 *
 *  İKİ KAYNAK:
 *   1. DEPODAN — gece yedekleri Vercel Blob'da duruyor. Asıl felaket yolu
 *      budur: dosyayı indirip yeniden yüklemeye gerek yok, boyut sınırı da
 *      işlemez.
 *   2. DOSYADAN — kullanıcının diskindeki yedek. Sunucu istek gövdesi
 *      sınırına takılabilir; o durumda sebebi açıkça söylenir.
 * ============================================================================
 */

/** İndirme ucuyla AYNI kalıp — yalnız `yedek/` klasöründeki bilinen adlar. */
export const AD_KALIBI = /^(selliora|guvenlik)-[\w:.-]+\.json$/;

export type KaynakSonucu =
  | { tamam: true; metin: string; kaynakAdi: string }
  | { tamam: false; kod: string; ayrinti?: string };

/**
 * İstekten yedek metnini çıkarır.
 * Beklenen gövde: multipart/form-data, `dosya` (File) VEYA `ad` (depo adı).
 */
export async function kaynagiOku(istek: Request): Promise<KaynakSonucu> {
  let form: FormData;
  try {
    form = await istek.formData();
  } catch (e) {
    // En olası sebep: dosya sunucu gövde sınırından büyük.
    return { tamam: false, kod: "GOVDE_OKUNAMADI", ayrinti: String(e).slice(0, 200) };
  }

  const ad = form.get("ad");
  if (typeof ad === "string" && ad !== "") {
    if (!AD_KALIBI.test(ad)) return { tamam: false, kod: "GECERSIZ_AD" };
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return { tamam: false, kod: "DEPO_YOK" };
    }
    try {
      const sonuc = await get(`yedek/${ad}`, { access: "private" });
      if (!sonuc || sonuc.statusCode !== 200) {
        return { tamam: false, kod: "DEPODA_BULUNAMADI" };
      }
      const metin = await new Response(sonuc.stream).text();
      return { tamam: true, metin, kaynakAdi: ad };
    } catch (e) {
      return { tamam: false, kod: "DEPO_OKUNAMADI", ayrinti: String(e).slice(0, 200) };
    }
  }

  const dosya = form.get("dosya");
  if (dosya instanceof File && dosya.size > 0) {
    return { tamam: true, metin: await dosya.text(), kaynakAdi: dosya.name };
  }

  return { tamam: false, kod: "DOSYA_YOK" };
}

/** Okunan metni çözer — iki uç da bunu çağırır. */
export function metniCoz(metin: string): CozumSonucu {
  return yedegiCoz(metin);
}
