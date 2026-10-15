import { prisma } from "@/lib/prisma";
import { galeriYazilirMi, gorselSec, type GorselKaynagi, type KanalGorselKaynagi } from "@/lib/urun-gorseli";

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
 *  Koşum başına TAVAN var: senkron rotası (`listeleme-cekim`, GÜNDE BİR,
 *  04:50 UTC, 300 sn) üç kanalı birden çekiyor; ~1.200 satırlık dolum tek
 *  koşuma sığmaz. Kalan ertesi gece devam eder — sayılar her koşumda yazar.
 *  ⚠ İLK YAZIMDA "5 dk'da bir" yazılmıştı — YANLIŞTI, rota ölçülmeden
 *  sipariş çekimiyle karıştırılmıştı. İlk dolum bu yüzden 25.09.2026'da tek
 *  seferlik betikle yapıldı (1.227 TY + 1 N11, 9 tur).
 * ============================================================================
 */
export const GORSEL_YAZIM_TAVANI = 150;

export type GorselYazimOzeti = {
  aday: number;
  eslesen: number;
  degisecek: number;
  yazilan: number;
  tavandaKalan: number;
  /** K330 — galeri: değişecek · yazılan · tavanda kalan (aynı tavan, ayrı sayaç). */
  galeriDegisecek: number;
  galeriYazilan: number;
  galeriTavandaKalan: number;
};

/**
 * SAF: varyantın adayı — önce EAN (kanaldan bağımsız ürün kimliği), yoksa AYNI KANALDAKİ
 * kanal kodu. Başka kanalın koduyla eşleşmez (bir kanalın kodu ötekinin barkodu olabilir).
 */
export function adayBul<A extends { kaynak: KanalGorselKaynagi }>(
  v: { barcode: string | null; channelSkus: readonly { channelSku: string; channelAccount: { channel: { code: string } } }[] },
  tekil: ReadonlyMap<string, A>,
): A | undefined {
  const ean = v.barcode?.trim();
  if (ean) {
    const a = tekil.get(ean);
    if (a) return a;
  }
  for (const s of v.channelSkus) {
    const a = tekil.get(s.channelSku.trim());
    if (a && a.kaynak === s.channelAccount.channel.code) return a;
  }
  return undefined;
}

export async function gorselleriYaz(
  /** `galeri`: kanalın BÜTÜN resimleri, `galeriAdresleri` ile süzülmüş (K330). Yoksa galeriye dokunulmaz. */
  adaylar: readonly { barkod: string; url: string; kaynak: KanalGorselKaynagi; galeri?: readonly string[] }[],
  /** KURU: hesaplar, YAZMAZ — ilk dolumdan önce etkiyi görmek için. */
  kuru = false,
): Promise<GorselYazimOzeti> {
  /* Barkod başına İLK aday — bir içeriğin birden çok görseli varsa ilki (ana görsel). */
  const tekil = new Map<string, { url: string; kaynak: KanalGorselKaynagi; galeri: readonly string[] }>();
  for (const a of adaylar) {
    const b = a.barkod.trim();
    if (b === "" || a.url.trim() === "" || tekil.has(b)) continue;
    tekil.set(b, { url: a.url.trim(), kaynak: a.kaynak, galeri: a.galeri ?? [] });
  }
  if (tekil.size === 0)
    return { aday: 0, eslesen: 0, degisecek: 0, yazilan: 0, tavandaKalan: 0, galeriDegisecek: 0, galeriYazilan: 0, galeriTavandaKalan: 0 };

  /**
   * ⛔ EAN YETMEZ — KANAL KODU DA (15.10.2026, Fisher-Price vakası). İlanın barkodu bizim
   * KANAL KODUMUZDUR ve EAN'dan farklı olabilir (`TRD194735067237` ↔ `194735067237`);
   * yalnız EAN'la arayınca ilan bulunur ama ürüne HİÇ bağlanmazdı (ölçüldü: TY'de kodla
   * bulunup görselsiz kalan 22 ürün). Kanal kodu YALNIZ AYNI KANALIN adayıyla eşleşir.
   */
  const varyantlar = await prisma.productVariant.findMany({
    where: { OR: [{ barcode: { in: [...tekil.keys()] } }, { channelSkus: { some: { channelSku: { in: [...tekil.keys()] } } } }] },
    select: {
      id: true,
      barcode: true,
      channelSkus: { select: { channelSku: true, channelAccount: { select: { channel: { select: { code: true } } } } } },
      gorselUrl: true,
      gorselKaynak: true,
      gorselKirikUrl: true,
      gorselGalerisi: { select: { url: true, kaynak: true }, orderBy: { sira: "asc" } },
    },
  });
  const yazilacak: { id: string; url: string; kaynak: GorselKaynagi }[] = [];
  /** K330 — galeri (tek firmalı canlı: firma alanı yok; çok firmalı dal kendi sürümünde firmayı da yazar). */
  const galeriYazilacak: { id: string; kaynak: KanalGorselKaynagi; adresler: readonly string[] }[] = [];
  for (const v of varyantlar) {
    const aday = adayBul(v, tekil);
    if (!aday) continue;
    const secim = gorselSec(
      { url: v.gorselUrl, kaynak: v.gorselKaynak, kirikUrl: v.gorselKirikUrl },
      aday,
    );
    if (secim) yazilacak.push({ id: v.id, ...secim });
    const mevcutKaynak = (v.gorselGalerisi[0]?.kaynak ?? null) as GorselKaynagi | null;
    if (
      mevcutKaynak !== "ELLE" &&
      galeriYazilirMi(
        { kaynak: mevcutKaynak, adresler: v.gorselGalerisi.map((g) => g.url) },
        { kaynak: aday.kaynak, adresler: aday.galeri },
      )
    ) {
      galeriYazilacak.push({ id: v.id, kaynak: aday.kaynak, adresler: aday.galeri });
    }
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
  /**
   * K330 — GALERİ: varyant başına TEK işlem (sil + yaz) — yarım galeri kalmaz;
   * satır satır tekrar koşulabilir (aynı liste ikinci koşumda yazılmaz).
   */
  const galeriBu = galeriYazilacak.slice(0, GORSEL_YAZIM_TAVANI);
  let galeriYazilan = 0;
  for (const g of kuru ? [] : galeriBu) {
    await prisma.$transaction([
      prisma.varyantGorseli.deleteMany({ where: { variantId: g.id } }),
      prisma.varyantGorseli.createMany({
        data: g.adresler.map((url, sira) => ({ variantId: g.id, sira, url, kaynak: g.kaynak })),
      }),
    ]);
    galeriYazilan++;
  }
  return {
    aday: tekil.size,
    eslesen: varyantlar.length,
    degisecek: yazilacak.length,
    yazilan,
    tavandaKalan: yazilacak.length - bu.length,
    galeriDegisecek: galeriYazilacak.length,
    galeriYazilan,
    galeriTavandaKalan: galeriYazilacak.length - galeriBu.length,
  };
}
