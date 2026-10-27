import { prisma } from "@/lib/prisma";
import type { BuyboxKanali } from "./buybox";
import { etkinKural, tekBasinaKargo, VARSAYILAN_KURAL, type EtkinKural, type GenelKural, type UrunKurali } from "./buybox-kural";
import { kargoSecimi } from "./kargo-kaynagi";

/**
 * ============================================================================
 *  BUYBOX FİYAT KURALI — OKUMA (SUNUCU, K366). Hesap `buybox-kural.ts`te (saf).
 * ----------------------------------------------------------------------------
 *  Genel ayar `Company.buybox*` (tek firma: `findFirst` — maliyet yöntemi
 *  ayarıyla aynı okuma). Ürüne ayrı değerler `BuyboxKurali`. HİÇBİR ŞEY YAZMAZ.
 *  ⚠ Firma satırı yoksa varsayılan kural döner — ayar hiç kaydedilmemiş demek;
 *  boş sonuç uydurma bir değer değil, kullanıcının verdiği varsayılandır.
 * ============================================================================
 */

export async function genelKuralOku(): Promise<GenelKural> {
  const f = await prisma.company.findFirst({
    select: { buyboxMinMarj: true, buyboxAdimAmount: true, buyboxMaliyet: true, buyboxMod: true },
  });
  if (!f) return VARSAYILAN_KURAL;
  return {
    minMarj: Number(f.buyboxMinMarj.toString()),
    adim: Number(f.buyboxAdimAmount.toString()),
    maliyet: f.buyboxMaliyet,
    mod: f.buyboxMod,
  };
}

export async function urunKuraliOku(variantId: string): Promise<UrunKurali | null> {
  const k = await prisma.buyboxKurali.findUnique({
    where: { variantId },
    select: { minMarj: true, adimAmount: true, maliyet: true, mod: true },
  });
  if (!k) return null;
  return {
    minMarj: k.minMarj === null ? null : Number(k.minMarj.toString()),
    adim: k.adimAmount === null ? null : Number(k.adimAmount.toString()),
    maliyet: k.maliyet,
    mod: k.mod,
  };
}

export async function etkinKuralOku(variantId: string): Promise<{ genel: GenelKural; urun: UrunKurali | null; etkin: EtkinKural }> {
  const [genel, urun] = await Promise.all([genelKuralOku(), urunKuraliOku(variantId)]);
  return { genel, urun, etkin: etkinKural(genel, urun) };
}

const KANAL_ADI: Record<BuyboxKanali, string> = { TY: "Trendyol", HB: "Hepsiburada" };

/** Tek başına satışın arandığı pencere — fiyat penceresi de bunu okur (ikisi ayrışmasın). */
export const SON_SATIS_SAYISI = 30;

/**
 * «DESİ BEKLİYOR» — satırda uyarı (kullanıcı kararı 27.10.2026: «desi için
 * cevap gelmezse Buybox savaşları için desi bekliyor uyarısı ürünün yanında
 * görünsün»). Ürün kartında desi YOK ve ürün bu hesapta TEK BAŞINA hiç
 * satılmamış (kargosu bilinen) → öneri yapılamaz. Ölçüt pencerenin AYNI saf
 * kapısı (`tekBasinaKargo`): satır «bekliyor» derken pencere öneri veremez,
 * pencere öneri verirken satır «bekliyor» demez.
 * ⚠ Ürün desisi doluysa ama kanalın kargo firması/tarifesi yoksa bu uyarı
 * ÇIKMAZ — sebep desi değil; pencere kendi sebebini yazar.
 */
export async function desiBekleyenler(variantIds: readonly string[], kanal: BuyboxKanali): Promise<Set<string>> {
  if (variantIds.length === 0) return new Set();
  const [hesap, desisiz] = await Promise.all([
    prisma.channelAccount.findFirst({ where: { channel: { name: KANAL_ADI[kanal] }, satisIcin: true, isActive: true }, select: { id: true } }),
    prisma.productVariant.findMany({ where: { id: { in: [...variantIds] }, product: { desi: null } }, select: { id: true } }),
  ]);
  const adaylar = desisiz.map((v) => v.id);
  if (adaylar.length === 0) return new Set();
  if (hesap === null) return new Set(adaylar);
  const satislar = await prisma.sale.findMany({
    where: { channelAccountId: hesap.id, iptalTarihi: null, items: { some: { variantId: { in: adaylar } } } },
    orderBy: { soldAt: "desc" },
    select: {
      paketSayisi: true,
      cargoAmount: true,
      tahminiKargo: true,
      items: { where: { kaldirildiAt: null }, select: { variantId: true, quantity: true } },
    },
  });
  const sayi = (d: { toString(): string } | null) => (d === null ? null : Number(d.toString()));
  const bekleyen = new Set(adaylar);
  for (const id of adaylar) {
    const uygun = tekBasinaKargo(
      satislar
        .filter((s) => s.items.some((i) => i.variantId === id))
        /** Pencereyle AYNI pencere: ürünün bu hesaptaki son 30 satışı (`buyboxFiyatZemini`). */
        .slice(0, SON_SATIS_SAYISI)
        .map((s) => ({
          kalemSayisi: s.items.length,
          adet: s.items[0]?.quantity ?? 0,
          paketSayisi: s.paketSayisi,
          tutar: kargoSecimi({ cargoAmount: sayi(s.cargoAmount), tahminiKargo: sayi(s.tahminiKargo) }).tutar,
          desi: null,
        })),
    );
    if (uygun !== null) bekleyen.delete(id);
  }
  return bekleyen;
}
