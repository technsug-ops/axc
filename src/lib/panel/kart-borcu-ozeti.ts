import { kartAlimTutari } from "@/lib/kart-alim-tutari";
import { prisma } from "@/lib/prisma";
import {
  kartBorcuHesapla,
  kartlarinAcikToplami,
  type BorcAlimi,
} from "@/lib/kart-borcu";
import { giderleriBorcaCevir } from "@/lib/kart-gideri";
import { alimIadeleriniBorcaCevir } from "@/lib/kart-iadesi";
import { kartaDonenAlimIadeleri } from "@/lib/kart-iadesi-veri";
import { ekstreleriBirlestir, birlesikToplamlar } from "@/lib/gecmis/birlesik";
import { sonOdemeTarihi } from "@/lib/kart-borcu";

/**
 * ============================================================================
 *  KART BORCU AÇIK TOPLAMI — GÜNLÜK ÖZET İÇİN (K-OZET)
 * ----------------------------------------------------------------------------
 *  `kart-borcu/page.tsx`'teki kart-başına hesabın AYNISI — hiçbir kural
 *  yeniden YAZILMAZ, yalnız o sayfanın çağırdığı saf fonksiyonlar burada da
 *  çağrılıyor (`kartBorcuHesapla` · `ekstreleriBirlestir` · `giderleriBorcaCevir`
 *  · `birlesikToplamlar`). Sorgu ayrı (dar seçim), hesap AYNI — bu yüzden
 *  buradaki "açık toplam" sayfadakiyle birebir tutar.
 *
 *  PURCHASEDAT ISTISNASI: KART BORCU SIPARIS GUNUNDE DOGAR — `kart-borcu`
 *  sayfasıyla AYNI gerekçe (mal-kabul günü değil, sipariş/alım günü borcu
 *  doğurur), üçüncü meşru kullanım yeri.
 * ============================================================================
 */
export async function acikKartBorcuOzetiGetir(
  bugun: Date,
): Promise<{ paraBirimi: string; tutar: number }[]> {
  const [kartlar, alimlar, kartGiderleri, odemeler, beyanKayitlari] =
    await Promise.all([
      prisma.creditCard.findMany({ where: { isActive: true } }),
      prisma.purchase.findMany({
        where: { creditCardId: { not: null }, NOT: { status: "CANCELLED" } },
        select: {
          id: true,
          code: true,
          purchasedAt: true,
          creditCardId: true,
          installmentCount: true,
          items: {
            select: { quantity: true, unitCostAmount: true, unitCostCurrency: true },
          },
        },
      }),
      prisma.expense.findMany({
        where: { creditCardId: { not: null } },
        select: {
          id: true,
          spentAt: true,
          amount: true,
          currency: true,
          creditCardId: true,
          installmentCount: true,
          description: true,
          category: { select: { name: true } },
        },
      }),
      prisma.kartOdeme.findMany({
        select: { cardId: true, donem: true, odenenAnaBorc: true },
      }),
      prisma.gecmisEkstre.findMany({
        select: {
          cardId: true,
          donem: true,
          borc: true,
          odenenTutar: true,
          odemeTarihi: true,
          hamDonemMetni: true,
        },
      }),
    ]);

  const kartinOdemeleri = (kartId: string) =>
    odemeler
      .filter((o) => o.cardId === kartId)
      .map((o) => ({
        donem: o.donem,
        odenenAnaBorc: Number(o.odenenAnaBorc.toString()),
      }));

  const kartinBeyanlari = (kartId: string) =>
    beyanKayitlari
      .filter((b) => b.cardId === kartId)
      .map((b) => ({
        donem: b.donem,
        borc: Number(b.borc.toString()),
        odenenTutar:
          b.odenenTutar === null ? null : Number(b.odenenTutar.toString()),
        odemeTarihi: b.odemeTarihi,
        hamDonemMetni: b.hamDonemMetni,
      }));

  const perKart: { paraBirimi: string; acikToplam: number }[] = [];
  /** K305 — karta dönen alım iadeleri. */
  const kartIadeleri = await kartaDonenAlimIadeleri();

  for (const kart of kartlar) {
    const borclar: BorcAlimi[] = [];
    for (const a of alimlar.filter((x) => x.creditCardId === kart.id)) {
      /* K308: tutar ORTAK gövdeden — kargo/vergi alım tutarının içinde. */
      const { tutar } = kartAlimTutari(a.items, kart.currency);
      if (tutar <= 0) continue;
      borclar.push({
        id: a.id,
        kod: a.code,
        tarih: a.purchasedAt,
        tutar,
        taksitSayisi: a.installmentCount,
      });
    }
    borclar.push(
      ...giderleriBorcaCevir(kartGiderleri, kart.id, kart.currency).borclar,
    );
    /* K305: karta dönen alım iadesi borçtan DÜŞER. */
    borclar.push(...alimIadeleriniBorcaCevir(kartIadeleri, kart.id, kart.currency));

    const sonuc = kartBorcuHesapla(
      borclar,
      {
        kesimGunu: kart.statementDay,
        sonOdemeGunu: kart.dueDay,
        limit: null,
      },
      bugun,
      kartinOdemeleri(kart.id),
    );
    if (!sonuc.hesaplanabilir) continue;

    const birlesik = ekstreleriBirlestir({
      turetilmis: sonuc.ekstreler,
      beyanlar: kartinBeyanlari(kart.id),
      sonOdemeGunuHesapla: (kesim) =>
        kart.dueDay === null ? null : sonOdemeTarihi(kesim, kart.dueDay),
      bugun,
    });
    const toplamlar = birlesikToplamlar(birlesik);
    perKart.push({ paraBirimi: kart.currency, acikToplam: toplamlar.acikToplam });
  }

  return kartlarinAcikToplami(perKart);
}
