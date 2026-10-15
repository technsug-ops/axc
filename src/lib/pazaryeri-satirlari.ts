import type { PazaryeriSatiri } from "@/components/pazaryeri-linkleri";
import { ilanAdresi, listeKanallariCoz } from "@/lib/kanal-ilan-adresi";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  PAZARYERİ İLAN SATIRLARI — TEK GÖVDE (ürünler listesi + kârlılık kartı)
 * ----------------------------------------------------------------------------
 *  07.10.2026 (K320) ürünler sayfasının İÇİNDE kuruluyordu. 15.10.2026 kullanıcı:
 *  «kârlılık kartında da aynı linkler olsun, pazaryerine bakmak için ürünler
 *  sekmesine gitmek zorunda kalmasın» → gövde buraya taşındı; iki ekran AYNI
 *  çözümü çağırır (iki yerde iki kural olmaz — biri değişip öteki kalırsa aynı
 *  ürün iki ekranda farklı linke giderdi).
 *
 *  · Kanallar FİRMA SEÇİMİNDEN (`Company.urunListesiKanallari`, Ayarlar → Kanallar).
 *  · Yalnız SATIŞ hesaplarının aktif kanal kodları; adres SAKLANMAZ, kanal
 *    kalıbından kurulur (`kanal-ilan-adresi.ts`).
 *  · Bir varyantın o kanalda kaydı yoksa «KAYIT_YOK», kaydı var adresi
 *    kurulamıyorsa «LINK_YOK» (iki «yok» ayrı yazılır).
 * ============================================================================
 */
export async function pazaryeriSatirlariKur(
  companyId: string,
  variantIdleri: readonly string[],
): Promise<{ kanallar: string[]; satirlar: (variantId: string | undefined) => PazaryeriSatiri[] }> {
  const [firmaAyari, aktifKanallar, kanalKayitlari] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { urunListesiKanallari: true } }),
    prisma.channel.findMany({ where: { isActive: true }, select: { code: true, name: true } }),
    prisma.channelSku.findMany({
      where: { variantId: { in: [...variantIdleri] }, isActive: true, channelAccount: { satisIcin: true } },
      select: {
        variantId: true,
        channelSku: true,
        externalListingId: true,
        channelAccount: { select: { externalId: true, magazaAdi: true, channel: { select: { code: true } } } },
      },
    }),
  ]);
  const listeKanallari = listeKanallariCoz(firmaAyari?.urunListesiKanallari ?? null, aktifKanallar.map((k) => k.code));
  const kanalAdlari = new Map(aktifKanallar.map((k) => [k.code, k.name]));
  const satirlar = (variantId: string | undefined): PazaryeriSatiri[] =>
    listeKanallari.map((kod) => {
      const ad = kanalAdlari.get(kod) ?? kod;
      const kayitlar = kanalKayitlari.filter((k) => k.variantId === variantId && k.channelAccount.channel.code === kod);
      if (kayitlar.length === 0) return { kod, ad, durum: "KAYIT_YOK", adres: null };
      for (const k of kayitlar) {
        const adres = ilanAdresi(kod, { channelSku: k.channelSku, externalListingId: k.externalListingId, saticiId: k.channelAccount.externalId, magazaAdi: k.channelAccount.magazaAdi });
        if (adres) return { kod, ad, durum: "LINK", adres };
      }
      return { kod, ad, durum: "LINK_YOK", adres: null };
    });
  return { kanallar: listeKanallari, satirlar };
}
