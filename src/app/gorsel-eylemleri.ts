"use server";

import { revalidatePath } from "next/cache";

import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import { elleGorselDenetle, gorselAdresiGecerliMi, type ElleGorselHatasi } from "@/lib/urun-gorseli";
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

/**
 * ============================================================================
 *  ELLE RESİM EKLEME (K273-③)
 * ----------------------------------------------------------------------------
 *  Kullanıcının yapıştırdığı linki `ELLE` kaynağıyla yazar; senkron bir daha
 *  dokunmaz. İzin: `urun.yaz` (ürün kartını düzenleyebilen). Biçim denetimi
 *  SAF kuraldan (`elleGorselDenetle`); sunucu adrese İSTEK ATMAZ (SSRF —
 *  gerekçe kuralın başlığında). Kırık işareti temizlenir.
 *  ⛔ İZ: eski ve yeni adres birlikte (`URUN_GORSELI_ELLE`).
 *  ⚠ Hata KOD döner, metne ekran çevirir; beklenmeyen hata TAM günlüğe.
 * ============================================================================
 */
export async function gorselElleKaydet(
  variantId: string,
  ham: string,
): Promise<{ durum: "KAYDEDILDI" } | { hata: ElleGorselHatasi | "YETKISIZ" | "BULUNAMADI" | "HATA" }> {
  try {
    const baglam = await yetkiBaglami();
    if (!baglam || !baglam.izinler.has("urun.yaz")) return { hata: "YETKISIZ" };
    const denetim = elleGorselDenetle(ham);
    if ("hata" in denetim) return { hata: denetim.hata };
    const v = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { gorselUrl: true, gorselKaynak: true },
    });
    if (!v) return { hata: "BULUNAMADI" };
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { gorselUrl: denetim.url, gorselKaynak: "ELLE", gorselAt: new Date(), gorselKirikUrl: null },
    });
    await izYaz({
      action: "URUN_GORSELI_ELLE",
      targetType: "ProductVariant",
      targetId: variantId,
      detail: JSON.stringify({ eskiUrl: v.gorselUrl, eskiKaynak: v.gorselKaynak, yeniUrl: denetim.url }),
    });
    for (const yol of ["/urunler", "/stok", "/satislar", "/alimlar"]) revalidatePath(yol);
    return { durum: "KAYDEDILDI" };
  } catch (e) {
    console.error("[gorselElleKaydet] beklenmeyen hata:", variantId, e);
    return { hata: "HATA" };
  }
}
