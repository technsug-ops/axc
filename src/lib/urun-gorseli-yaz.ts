import { prisma } from "@/lib/prisma";
import { gorselSec, type GorselKaynagi } from "@/lib/urun-gorseli";

/**
 * ============================================================================
 *  ÜRÜN GÖRSELİ YAZICISI — SENKRONLARIN ORTAK KAPISI (K273)
 * ----------------------------------------------------------------------------
 *  Trendyol ve N11 listeleme senkronları okudukları ürünlerin görsel adresini
 *  buraya verir; karar SAF kuraldan (`gorselSec`), burada yalnız okuma/yazma.
 *  Eşleştirme BARKODLA (kimlik varken dizeyle aranmaz).
 *
 *  ⛔ TOPLU YAZIM ŞARTLARI: satır satır, TEKRAR KOŞULABİLİR — her satır
 *  bağımsız, ikinci koşum zararsız (kural değişiklik yoksa `null` döner).
 *  Koşum başına TAVAN var: senkron rotası 60 sn içinde üç kanalı birden
 *  çekiyor; ilk dolumda ~1.100 satır tek koşuma sığmaz. Kalan bir sonraki
 *  koşumda (5 dk) devam eder — sayılar her koşumda yazar.
 * ============================================================================
 */
export const GORSEL_YAZIM_TAVANI = 150;

export type GorselYazimOzeti = {
  aday: number;
  eslesen: number;
  degisecek: number;
  yazilan: number;
  tavandaKalan: number;
};

export async function gorselleriYaz(
  adaylar: readonly { barkod: string; url: string; kaynak: Exclude<GorselKaynagi, "ELLE"> }[],
  /** KURU: hesaplar, YAZMAZ — ilk dolumdan önce etkiyi görmek için. */
  kuru = false,
): Promise<GorselYazimOzeti> {
  /* Barkod başına İLK aday — bir içeriğin birden çok görseli varsa ilki (ana görsel). */
  const tekil = new Map<string, { url: string; kaynak: Exclude<GorselKaynagi, "ELLE"> }>();
  for (const a of adaylar) {
    const b = a.barkod.trim();
    if (b === "" || a.url.trim() === "" || tekil.has(b)) continue;
    tekil.set(b, { url: a.url.trim(), kaynak: a.kaynak });
  }
  if (tekil.size === 0) return { aday: 0, eslesen: 0, degisecek: 0, yazilan: 0, tavandaKalan: 0 };

  const varyantlar = await prisma.productVariant.findMany({
    where: { barcode: { in: [...tekil.keys()] } },
    select: { id: true, barcode: true, gorselUrl: true, gorselKaynak: true, gorselKirikUrl: true },
  });
  const yazilacak: { id: string; url: string; kaynak: GorselKaynagi }[] = [];
  for (const v of varyantlar) {
    const aday = v.barcode ? tekil.get(v.barcode) : undefined;
    if (!aday) continue;
    const secim = gorselSec(
      { url: v.gorselUrl, kaynak: v.gorselKaynak, kirikUrl: v.gorselKirikUrl },
      aday,
    );
    if (secim) yazilacak.push({ id: v.id, ...secim });
  }
  const bu = yazilacak.slice(0, GORSEL_YAZIM_TAVANI);
  let yazilan = 0;
  for (const y of kuru ? [] : bu) {
    await prisma.productVariant.update({
      where: { id: y.id },
      data: { gorselUrl: y.url, gorselKaynak: y.kaynak, gorselAt: new Date() },
    });
    yazilan++;
  }
  return {
    aday: tekil.size,
    eslesen: varyantlar.length,
    degisecek: yazilacak.length,
    yazilan,
    tavandaKalan: yazilacak.length - bu.length,
  };
}
