import type { prisma as prismaIstemcisi } from "@/lib/prisma";

/**
 * ============================================================================
 *  KANALIN BİLDİRDİĞİ MAĞAZA ADI (K320, kullanıcı kararı 09.10.2026)
 * ----------------------------------------------------------------------------
 *  İlan linkindeki `?magaza=` değeri `ChannelAccount.magazaAdi`de durur. N11
 *  bunu ilan ucunun kendi cevabında veriyor (`sellerNickname`, ölçüldü 113/113);
 *  Hepsiburada vermiyor — orada Kanal Hesapları ekranından yazılır.
 *
 *  ⭐ KARAR SAF: kanaldan gelen adların kümesi TEK değerse o ad; boşsa ya da
 *  birden çok farklı ad geldiyse `null` — biri seçilmez (iki mağaza karışmış
 *  demektir, sessizce birini yazmak yanlış linki kalıcı yapar).
 *  Yazım betikte değil burada (betik veritabanına doğrudan yazmaz).
 * ============================================================================
 */
export function kanalMagazaAdiCoz(adlar: readonly unknown[]): string | null {
  const kume = new Set(adlar.map((a) => String(a ?? "").trim()).filter((a) => a !== ""));
  return kume.size === 1 ? [...kume][0]! : null;
}

/**
 * Kanalın son beyanı esastır: ad çözüldüyse ve kayıtlıdan farklıysa yazılır.
 * Döner: yazılan ad, değişiklik yoksa `null`.
 */
export async function kanalMagazaAdiniYaz(
  db: typeof prismaIstemcisi,
  hesap: { id: string; magazaAdi: string | null },
  ad: string | null,
): Promise<string | null> {
  if (ad === null || hesap.magazaAdi === ad) return null;
  await db.channelAccount.update({ where: { id: hesap.id }, data: { magazaAdi: ad } });
  return ad;
}
