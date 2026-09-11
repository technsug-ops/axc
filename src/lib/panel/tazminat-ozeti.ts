import { prisma } from "@/lib/prisma";
import { acikAlacakToplami, type TazminatKaydi } from "@/lib/tazminat";

/**
 * ============================================================================
 *  TAZMİNAT AÇIK ALACAK ÖZETİ — GÜNLÜK ÖZET İÇİN DAR SORGU
 * ----------------------------------------------------------------------------
 *  Hesabın kendisi `acikAlacakToplami` (src/lib/tazminat.ts) — burada yeni
 *  bir kural YAZILMAZ, yalnız o saf fonksiyonun ihtiyaç duyduğu dar alan
 *  seti çekilir. `/tazminat` sayfası kendi tam `include` ağacını kullanmaya
 *  devam eder; bu sorgu ondan bağımsız ve daha dar (yalnız üç alan).
 * ============================================================================
 */
export async function acikTazminatOzetiGetir(): Promise<
  { paraBirimi: string; tutar: number }[]
> {
  const kayitlar = await prisma.compensation.findMany({
    select: { status: true, amount: true, currency: true },
  });

  const saf: TazminatKaydi[] = kayitlar.map((k) => ({
    durum: k.status,
    tutar: Number(k.amount.toString()),
    paraBirimi: k.currency,
  }));

  return acikAlacakToplami(saf);
}
