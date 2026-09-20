import { odemeDurumu } from "@/lib/hakedis/eslestir";
import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  BEKLENEN HAKEDİŞ ÖZETİ — RAPOR SAYFASI İÇİN (K222-③, 20.09.2026)
 * ----------------------------------------------------------------------------
 *  `/hakedis`teki "Bekleyen Para" kutusunun AYNI ölçütünü (bkz. `odemeDurumu`)
 *  kullanan, tek amaçlı bir özet sorgusu. Kullanıcı kararı 20.09.2026: bu
 *  özet PANELE değil RAPOR'a girer — "ileriye bakan rapor sorusu" panelin
 *  "bugün ne yapmalıyım" sorusuna ait değildir (bkz. `NakitOzeti` başlığındaki
 *  21.08.2026 kararı, aynı gerekçe).
 *
 *  ⚠ EŞİK/KURAL TEK KAYNAKTAN: gecikme sınırı `odemeDurumu`nun kendisinden
 *  gelir (`HAKEDIS_ESIKLERI.gecikmeIsGunu`) — burada AYRI bir eşik
 *  YAZILMADI, yoksa iki ekran farklı günde "gecikti" demeye başlardı.
 * ============================================================================
 */
export type BeklenenHakedisOzeti = {
  /** Para birimi başına bekleyen toplam. Genelde tek kalem (TRY). */
  toplamlar: { paraBirimi: string; tutar: number }[];
  bekleyenSayisi: number;
  gecikenSayisi: number;
};

export async function beklenenHakedisOzetiGetir(
  bugun: Date,
): Promise<BeklenenHakedisOzeti> {
  const kalemler = await prisma.settlementItem.findMany({
    where: { paidAt: null },
    select: { amount: true, currency: true, dueDate: true },
  });

  const toplamHaritasi = new Map<string, number>();
  let gecikenSayisi = 0;
  for (const k of kalemler) {
    toplamHaritasi.set(
      k.currency,
      (toplamHaritasi.get(k.currency) ?? 0) + Number(k.amount.toString()),
    );
    const durum = odemeDurumu({
      beklenenTutar: null,
      gerceklesenTutar: null,
      vade: k.dueDate,
      odendiMi: false,
      bugun,
    });
    if (durum === "GECIKTI") gecikenSayisi++;
  }

  return {
    toplamlar: [...toplamHaritasi.entries()].map(([paraBirimi, tutar]) => ({
      paraBirimi,
      tutar,
    })),
    bekleyenSayisi: kalemler.length,
    gecikenSayisi,
  };
}
