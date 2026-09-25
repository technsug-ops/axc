"use server";

import { prisma } from "@/lib/prisma";
import { gorselAdresiGecerliMi } from "@/lib/urun-gorseli";
import { yetkiBaglami } from "@/lib/yetki";

/**
 * ============================================================================
 *  KIRIK GÖRSEL BİLDİRİMİ (K273)
 * ----------------------------------------------------------------------------
 *  Tarayıcı bir görseli açamayınca buraya bildirir. İstemciye GÜVENİLMEZ:
 *  sunucu adresi KENDİSİ yoklar; gerçekten açılmıyorsa `gorselKirikUrl` yazılır
 *  ve bir sonraki senkron sırayı baştan işletir (Trendyol → N11). Açılıyorsa
 *  (geçici ağ hatası) hiçbir şey yazılmaz.
 *  ⚠ Bu dosya "use server": YALNIZ async fonksiyon dışa aktarılır — sabit bir
 *  dışa aktarım bütün eylemleri düşürür (30.08 vakası).
 *  ⚠ Hata yutulmaz: yoklama hatası günlüğe TAM yazılır, ekrana kod döner.
 * ============================================================================
 */
export async function gorselKirikBildir(
  variantId: string,
): Promise<{ durum: "KIRIK_YAZILDI" | "SAGLAM" | "ATLANDI" | "YETKISIZ" | "HATA" }> {
  try {
    const baglam = await yetkiBaglami();
    if (!baglam) return { durum: "YETKISIZ" };
    const v = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { gorselUrl: true, gorselKaynak: true, gorselKirikUrl: true },
    });
    /* Elle yüklenen senkronun işi değil; zaten kırık işaretliyse tekrar yoklanmaz. */
    if (!v?.gorselUrl || !v.gorselKaynak || v.gorselKaynak === "ELLE") return { durum: "ATLANDI" };
    if (v.gorselUrl === v.gorselKirikUrl) return { durum: "ATLANDI" };
    if (!gorselAdresiGecerliMi(v.gorselUrl, v.gorselKaynak)) return { durum: "ATLANDI" };

    let acildi = false;
    try {
      const kontrol = new AbortController();
      const zaman = setTimeout(() => kontrol.abort(), 6000);
      /* GET, HEAD değil: bazı görsel sunucuları HEAD'e 405 döner — sağlam görsel
         kırık sanılırdı. Başlık gelince gövde okunmadan kapatılır. */
      const r = await fetch(v.gorselUrl, { method: "GET", signal: kontrol.signal });
      clearTimeout(zaman);
      acildi = r.ok;
      await r.body?.cancel();
    } catch (e) {
      /* AĞ HATASI KIRIK DEĞİLDİR: bizim tarafın anlık sorunu sağlam görseli
         kırık işaretlerdi. Yalnız sunucunun HATA KODU (4xx/5xx) kırık sayılır. */
      console.error("[gorselKirikBildir] yoklama hatası:", variantId, e);
      return { durum: "HATA" };
    }
    if (acildi) return { durum: "SAGLAM" };
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { gorselKirikUrl: v.gorselUrl },
    });
    return { durum: "KIRIK_YAZILDI" };
  } catch (e) {
    console.error("[gorselKirikBildir] beklenmeyen hata:", variantId, e);
    return { durum: "HATA" };
  }
}
