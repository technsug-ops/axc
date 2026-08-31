import {
  komisyonKdvOrani as kesintiKomisyonKdvOrani,
  siparisKesintiKurallari,
} from "@/lib/siparis-kesintileri";
import { kalemMaliyeti } from "@/lib/kalem-maliyeti";
import { kdvDahilKargo } from "@/lib/kargo-kdv";
import { karHesapla, type KarGirdisi, type KarSonucu,
  type KarDurumu,
} from "@/lib/kar";
import { kdvHaricKargo } from "@/lib/kargo-kdv";
import { prisma } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KÂR YENİDEN HESAPLAMA
 * ----------------------------------------------------------------------------
 *  Kâr satış anında snapshot'lanır. Yanlış bir oran veya eksik kargo sonradan
 *  fark edilirse bu servis kullanılır: DEĞERLERİ DÜZELTİP yeniden hesaplar.
 *
 *  NE DEĞİŞİR : komisyon oran/tutarı, kargo firması/desi/tutarı, kâr snapshot'ı
 *  NE DEĞİŞMEZ: stok hareketleri, FIFO partileri, satılan adet, satış fiyatı
 *
 *  Yani ledger'a DOKUNULMAZ — kâr hesabı yeniden yazılır, mal hareketi değil.
 *  Bu ayrım bilinçlidir: stok düzeltmesi ters ADJUSTMENT ile yapılır.
 *
 *  `onizle` ile yazmadan sonuç alınır; ekran eski/yeni değerleri yan yana
 *  gösterip kullanıcıdan onay ister (Kullanıcı Kolaylığı #6).
 * ============================================================================
 */

export type YenidenHesaplaGirdisi = {
  saleId: string;
  /** Kalem kimliği -> düzeltilmiş komisyon. */
  kalemler: {
    saleItemId: string;
    commissionRate: number | null;
    commissionAmount: number | null;
  }[];
  cargoCarrierId: string | null;
  cargoDesi: number | null;
  /**
   * Elle girilen kargo tutarı — KDV DAHİL. Doluysa tarife kullanılmaz
   * (komisyondaki oran/tutar ikilisinin aynısı: panel gerçeği kazanır).
   */
  cargoAmountManual: number | null;
};

export type YenidenHesaplaSonucu = {
  onceki: { net1: number | null; net2: number | null; durum: string | null };
  yeni: KarSonucu;
  paraBirimi: Currency;
};

/** Kâr girdisini veritabanından toplar; hesaplar ama YAZMAZ. */
export async function karOnizle(
  girdi: YenidenHesaplaGirdisi,
): Promise<YenidenHesaplaSonucu | null> {
  const satis = await prisma.sale.findUnique({
    where: { id: girdi.saleId },
    include: {
      channelAccount: { select: { channelId: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          /**
           * MALİYET LEDGER'IN KENDİSİDİR — KALEME BAĞLI TÜM HAREKETLER.
           *
           * ⚠ 17.08.2026: burada `where: { type: "SALE_OUT" }` vardı ve adet
           * azaltmada yazılan ayna girişi (ADJUSTMENT) görmüyordu; kâr iki
           * adetlik maliyetle hesaplanıyordu. Süzgeç kaldırıldı, kural
           * `lib/kalem-maliyeti.ts`e taşındı: bağ varsa hareket sayılır.
           */
          stockMovements: {
            select: {
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
            },
          },
        },
      },
    },
  });
  if (!satis) return null;

  const kurallar = await prisma.channelFee.findMany({
    where: {
      channelId: satis.channelAccount.channelId,
      isActive: true,
      validFrom: { lte: satis.soldAt },
    },
    orderBy: { validFrom: "desc" },
  });
  /**
   * ⛔ TEKİLLEŞTİRME VE SÜZME ARTIK ORTAK GÖVDEDE (K116①, 31.08.2026).
   * Bu blok `satis.ts` ve `kar-yeniden.ts` içinde AYNI ANDA yazılıydı; biri
   * kaysaydı BİR YOL çift sabit gider yazar, öteki yazmazdı ve fark ancak
   * aynı satışı iki yoldan geçiren biri tarafından görülürdü.
   */

  const komisyonKdvOrani = kesintiKomisyonKdvOrani(kurallar);

  /**
   * ⚠ İKİ KAPSAM DA ALINIR — `PER_SALE` ve `PER_PACKAGE`.
   * Süzgeç yalnız `PER_SALE` yazsaydı, paket başına kural sessizce
   * DÜŞERDİ ve kesinti hiç uygulanmazdı: kâr daha da şişerdi.
   * _"Tip listesi değil, bağ" dersinin kapsam hâli._
   */
  const siparisKesintileri = siparisKesintiKurallari(kurallar);

  // --- kargo: elle tutar tarifeyi EZER ---
  let kargoTarifesi: number | null = null;
  let kargoTarifesiBulunamadi = false;

  // != null bilerek: undefined de null gibi ele alinir.
  if (girdi.cargoAmountManual != null) {
    // Elle girilen tutar KDV DAHİL; motor KDV hariç bekliyor.
    kargoTarifesi = kdvHaricKargo(girdi.cargoAmountManual);
  } else if (girdi.cargoCarrierId && girdi.cargoDesi != null) {
    const tarife = await prisma.cargoTariff.findFirst({
      where: {
        channelId: satis.channelAccount.channelId,
        carrierId: girdi.cargoCarrierId,
        desi: Math.max(0, Math.ceil(girdi.cargoDesi)),
      },
      select: { amount: true },
    });
    if (tarife) kargoTarifesi = Number(tarife.amount.toString());
    else kargoTarifesiBulunamadi = true;
  }

  const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

  const kalemler: KarGirdisi["kalemler"] = satis.items.map((kalem) => {
    const { maliyet, paraBirimi } = kalemMaliyeti(
      kalem.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        birimMaliyet:
          h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
        birimMaliyetParaBirimi: h.unitCostCurrency,
      })),
    );
    const maliyetParaBirimi = paraBirimi as Currency | null;

    const duzeltme = duzeltmeler.get(kalem.id);

    return {
      satisTutari: Number(kalem.unitPriceAmount.toString()) * kalem.quantity,
      satisParaBirimi: kalem.unitPriceCurrency,
      maliyet,
      maliyetParaBirimi,
      // KDV oranı satış anındaki snapshot'tan gelir; yeniden hesapta DEĞİŞMEZ.
      kdvOrani: kalem.vatRate ? Number(kalem.vatRate.toString()) : 20,
      komisyonTutari: duzeltme?.commissionAmount ?? null,
      komisyonOrani: duzeltme?.commissionRate ?? null,
    };
  });

  const yeni = karHesapla({
    kalemler,
    komisyonKdvOrani,
    siparisKesintileri,
    kargoTarifesi,
    kargoTarifesiBulunamadi,
    /**
     * ⚠ PAKET SAYISI SATIŞTAN OKUNUR. Yeniden hesap, kaydın kendi
     * gerçeğiyle koşmalı; varsayılan 1'e düşseydi bölünmüş bir satış her
     * tazelemede yeniden şişerdi.
     */
    paketSayisi: satis.paketSayisi,
  });

  return {
    onceki: {
      net1: satis.net1Amount ? Number(satis.net1Amount.toString()) : null,
      net2: satis.net2Amount ? Number(satis.net2Amount.toString()) : null,
      durum: satis.profitStatus,
    },
    yeni,
    paraBirimi: satis.profitCurrency ?? kalemler[0]?.satisParaBirimi ?? "TRY",
  };
}

/** Önizlemedeki sonucu KALICI yazar. Ledger'a dokunmaz. */
/**
 * ⛔ NET YALNIZ `CALCULATED` İKEN YAZILIR — ötekilerde `null` (28.08.2026).
 *
 * `karHesapla` durumu ne olursa olsun bir sayı üretir: maliyet
 * bilinmiyorsa `0` sayıp, komisyon kuralı yoksa `0` sayıp devam eder.
 * O sayı bir HESAP DEĞİL, bir ARTIKTIR — ve kayda yazıldığında alan
 * "kârı budur" diye **iddia eder.**
 *
 * ⚠ ÖLÇÜLDÜ 28.08.2026 canlı: `NO_COST` satırlarda `net1` **₺5.668.424**,
 * `net2` **₺4.714.528** yazılıydı — maliyeti düşülmemiş rakamlar.
 * Bugün onları toplayan tüketici yoktu (`satis-toplami.ts` süzgecinde
 * `profitStatus: "CALCULATED"` var), ama koruma **DİSİPLİNE** bağlıydı:
 * süzgeci unutan İLK tüketici o rakamı kâra yazardı.
 *
 * ⛔ KURAL DURUMA GENELDİR, `NO_COST`A ÖZEL DEĞİL: `RULE_MISSING` ve
 * `CURRENCY_MISMATCH` de eksik bir hesabı temsil eder. Yalnız `NO_COST`
 * yazılsaydı, yarın doğan bir `RULE_MISSING` satırı aynı yalanı taşırdı.
 *
 * ⚠ SÜZGEÇ ZORUNLULUĞU KALDIRILMADI — ikinci savunma olarak duruyor.
 * _(Anayasa: "maliyet bilinmiyorsa NET de bilinmiyor"; "varsayılan değer
 * alanın anlamından türetilir".)_
 */
function netYaz(durum: KarDurumu, deger: number): string | null {
  return durum === "CALCULATED" ? String(deger) : null;
}

export async function karYenidenYaz(
  girdi: YenidenHesaplaGirdisi,
): Promise<boolean> {
  const onizleme = await karOnizle(girdi);
  if (!onizleme) return false;

  const { yeni, paraBirimi } = onizleme;

  await prisma.$transaction(async (tx) => {
    const satis = await tx.sale.findUnique({
      where: { id: girdi.saleId },
      include: { items: { orderBy: { id: "asc" }, select: { id: true } } },
    });
    if (!satis) return;

    // Eski kesinti dökümü silinir; yerine yenisi yazılır.
    // Bu SaleFee kayıtları hesabın fotoğrafıdır, ledger değildir —
    // yeniden hesapta değişmeleri beklenir.
    await tx.saleFee.deleteMany({ where: { saleId: girdi.saleId } });

    const kargoKalemi = yeni.siparisKesintileri.find((k) => k.code === "KARGO");
    const kargoHaric =
      kargoKalemi === undefined ? null : kargoKalemi.tutar / 1.2;

    await tx.sale.update({
      where: { id: girdi.saleId },
      data: {
        cargoCarrierId: girdi.cargoCarrierId,
        cargoDesi: girdi.cargoDesi === null ? null : String(girdi.cargoDesi),
        cargoAmount: kargoHaric === null ? null : String(kargoHaric),
        cargoCurrency: kargoHaric === null ? null : "TRY",
        net1Amount: netYaz(yeni.durum, yeni.net1),
        net2Amount: netYaz(yeni.durum, yeni.net2),
        profitCurrency: paraBirimi,
        profitStatus: yeni.durum,
        calculatedAt: new Date(),
      },
    });

    const duzeltmeler = new Map(girdi.kalemler.map((k) => [k.saleItemId, k]));

    for (const [i, kalem] of satis.items.entries()) {
      const sonuc = yeni.kalemler[i];
      if (!sonuc) continue;
      const duzeltme = duzeltmeler.get(kalem.id);

      await tx.saleItem.update({
        where: { id: kalem.id },
        data: {
          commissionRate:
            duzeltme?.commissionRate === null ||
            duzeltme?.commissionRate === undefined
              ? null
              : String(duzeltme.commissionRate),
          net1Amount: netYaz(sonuc.durum, sonuc.net1),
          net2Amount: netYaz(sonuc.durum, sonuc.net2),
          profitStatus: sonuc.durum,
        },
      });

      for (const kesinti of sonuc.kesintiler) {
        await tx.saleFee.create({
          data: {
            saleId: girdi.saleId,
            saleItemId: kalem.id,
            code: kesinti.code,
            amount: String(kesinti.tutar),
            currency: paraBirimi,
          },
        });
      }
    }

    for (const kesinti of yeni.siparisKesintileri) {
      await tx.saleFee.create({
        data: {
          saleId: girdi.saleId,
          code: kesinti.code,
          amount: String(kesinti.tutar),
          currency: paraBirimi,
        },
      });
    }
  });

  return true;
}

/**
 * SATIŞIN KÂRINI TAZELE — GİRDİYİ KAYITTAN KURAR.
 *
 * ⚠ ORTAK GÖVDE, ÜÇÜNCÜ KOPYA DEĞİL. Bu girdi kurulumu (`items` →
 * `commissionRate`, kargo firması/desi, KDV dahil kargo) hesap değiştirme ve
 * yeniden hesapla yollarında zaten iki kez yazılıydı. Üçüncüsünü elle
 * yazsaydık aynı satış üç yoldan üç türlü hesaplanabilirdi.
 *
 * ⚠ KOMİSYON ORANI TAŞINMAZ: kalemdeki snapshot oran korunur — oran
 * değişikliği ayrı bir düzeltmedir ve kendi ekranından yapılır.
 */
export async function satisKarTazele(saleId: string): Promise<boolean> {
  const satis = await prisma.sale.findUnique({
    where: { id: saleId },
    select: {
      cargoCarrierId: true,
      cargoDesi: true,
      cargoAmount: true,
      items: { select: { id: true, commissionRate: true } },
    },
  });
  if (!satis) return false;

  return karYenidenYaz({
    saleId,
    kalemler: satis.items.map((k) => ({
      saleItemId: k.id,
      commissionRate:
        k.commissionRate === null ? null : Number(k.commissionRate.toString()),
      commissionAmount: null,
    })),
    cargoCarrierId: satis.cargoCarrierId,
    cargoDesi:
      satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
    /** DB KDV hariç saklar; motor KDV dahil bekler (`lib/kargo-kdv.ts`). */
    cargoAmountManual: kdvDahilKargo(
      satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
    ),
  });
}
