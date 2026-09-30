import { prisma } from "@/lib/prisma";
import { kdvOraniniCoz } from "@/lib/kdv";
import { kdvUyusmuyorMu } from "@/lib/kdv-uyusmazligi-kurali";

export { KDV_SUZGEC_DEGERI, KDV_UYUSMAZLIGI_ADRESI, kdvUyusmuyorMu } from "@/lib/kdv-uyusmazligi-kurali";

/**
 * ============================================================================
 *  KANAL KDV ORANI ↔ BİZİM KDV ORANIMIZ (30.09.2026, kullanıcı isteği)
 * ----------------------------------------------------------------------------
 *  Trendyol her ilanda KDV oranını tutar (`variants[].vatRate`) ve listeleme
 *  senkronu onu `ChannelSku.kanalKdvOrani`na yazar. Bizim oranımız ürün
 *  istisnası > kategori > %20 zincirinden çözülür (`kdvOraniniCoz`).
 *  İkisi ayrışıyorsa ya ilan ya ürün kartı yanlıştır; HANGİSİNİN yanlış
 *  olduğunu sistem bilemez (diş fırçası vakası: ilan yanlıştı · oksimetre
 *  vakası: bizimki yanlıştı). Bu yüzden uyarı HÜKÜM VERMEZ, baktırır.
 *
 *  ⛔ KANAL ORANI BOŞSA HÜKÜM YOK: ölçülmemiş (HB ilanı, onay bekleyen ilan,
 *  senkron henüz koşmadı) ile «uyuşuyor» aynı şey değildir. Boş satır
 *  sayılmaz; kaç satırın ÖLÇÜLDÜĞÜ ayrıca döner ve ekranda yazar.
 *
 *  ⚠ SAYI = LİSTE: çan sayısı da `/kanal-sku?kdv=uyusmuyor` süzgeci de
 *  AYNI gövdeden (`kdvUyusmayanKanalSkulari`) beslenir. Oran zinciri
 *  veritabanında ifade edilemediği için süzgeç kimlik listesiyle kurulur.
 * ============================================================================
 */

export type KdvUyusmazligi = {
  kimlikler: string[];
  /** Kanal oranı dolu olan (ölçülmüş) satır sayısı — «kaçına bakıldı». */
  olculen: number;
};

export async function kdvUyusmayanKanalSkulari(): Promise<KdvUyusmazligi> {
  const satirlar = await prisma.channelSku.findMany({
    where: { isActive: true, kanalKdvOrani: { not: null } },
    select: {
      id: true,
      kanalKdvOrani: true,
      variant: {
        select: {
          product: {
            select: {
              vatRateOverride: true,
              category: { select: { name: true, vatRate: true } },
            },
          },
        },
      },
    },
  });
  const kimlikler: string[] = [];
  for (const s of satirlar) {
    const kanal = s.kanalKdvOrani === null ? null : Number(s.kanalKdvOrani.toString());
    if (kdvUyusmuyorMu(kanal, kdvOraniniCoz(s.variant.product).oran) === true) kimlikler.push(s.id);
  }
  return { kimlikler, olculen: satirlar.length };
}
