import {
  simulasyonZeminleri,
  type SimulasyonZemini,
} from "@/lib/fiyatlama/kart-verisi";
import { VARSAYILAN_KDV_ORANI } from "@/lib/kar";
import { kdvOraniniCoz } from "@/lib/kdv";
import { prisma } from "@/lib/prisma";
import { kodKosulu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  ÜRÜN ZEMİNİ — "BARKODU OKUT, GERİSİ GELSİN"
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"ürün EAN, barkod, pazaryeri SKU gibi
 *  bilgileri girdiğimde bizde satılmışsa otomatik ortalama alım ve satım
 *  fiyatını, komisyon bilgisini yazsın. Ona göre kâr çıksın."_
 *
 *  nesatilir'in yapamayacağı şey tam olarak budur: orada üç rakamı da
 *  kullanıcı bilmek zorunda. Bizde alış maliyeti FIFO'da, komisyon oranı
 *  tarifede, satış geçmişi defterde ZATEN duruyor.
 *
 *  ── ORTALAMA ALIM: AÇIK PARTİ DEĞİL, BÜTÜN GEÇMİŞ ───────────────────────
 *  ⚠ Kârlılık kartındaki `ortalamaMaliyet` AÇIK PARTİLERİN ortalamasıdır —
 *  "elimdeki malın maliyeti" sorusunun cevabı. Burada sorulan soru farklı:
 *  _"bu ürünü genelde kaça alıyorum"_. Stoğu tükenmiş bir üründe açık parti
 *  yoktur ve o soru yine de cevaplanabilir olmalı.
 *
 *  Bu ayrım bugün bir kez daha canını yaktı: aynı gün, kartın "son alım"
 *  kutusu da açık partiden okuduğu için stok bitince "alım yok" diyordu ve
 *  93 varyantın 26'sı etkileniyordu. Aynı hatayı burada tekrarlamıyoruz.
 *
 *  ── ORTALAMALAR ADETLE AĞIRLIKLI ────────────────────────────────────────
 *  Basit ortalama, 1 adetlik bir alımla 50 adetlik bir alımı eşitler ve
 *  gerçekte ödenmeyen bir "ortalama" üretir.
 *
 *  ── HİÇBİR ŞEY YAZILMAZ ─────────────────────────────────────────────────
 *  Salt okuma. Bu modül bir denemeyi besler, kayıt üretmez.
 * ============================================================================
 */

export type UrunZemini = {
  variantId: string;
  ad: string;
  sku: string;
  barkod: string | null;
  firmaSku: string | null;

  /** Adetle ağırlıklı ortalama alış (KDV DAHİL). Alımı yoksa null. */
  ortalamaAlis: number | null;
  alimAdedi: number;

  /** Adetle ağırlıklı ortalama satış fiyatı (KDV DAHİL). Satışı yoksa null. */
  ortalamaSatis: number | null;
  satisAdedi: number;

  /** Ürünün KDV oranı — kategoriden çözülür. */
  kdvOrani: number;

  /** Elde kalan adet — "stok yok" ile "hiç alınmamış" ayrı şeyler. */
  eldekiAdet: number;

  /** Kanal zeminleri: gerçek dilim tarifesi ve kesinti kuralları. */
  zeminler: SimulasyonZemini[];
};

/**
 * Koddan ürün zemini kurar — barkod · SKU · firma SKU · kanal SKU.
 *
 * ⚠ ARAMA `kodKosulu`DAN GEÇİYOR, kendi sorgusunu yazmıyor. Bu depoda tam
 * bu tuzağa düşülmüştü: `varyantAra` kuralı doğruydu ama Kanal SKU'yu hiç
 * sormuyordu. Ortak koşulu çağırmak, o kümenin bir daha ayrışmamasını sağlar.
 */
export async function urunZemini(
  kod: string,
  an: Date,
): Promise<UrunZemini | null> {
  const temiz = kod.trim();
  if (temiz === "") return null;

  const varyant = await prisma.productVariant.findFirst({
    where: { isActive: true, OR: kodKosulu(temiz) },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      companySku: true,
      product: {
        select: {
          name: true,
          vatRateOverride: true,
          category: { select: { name: true, vatRate: true } },
        },
      },
    },
  });
  if (varyant === null) return null;

  /**
   * ── ORTALAMA ALIŞ — LEDGER'DAN ─────────────────────────────────────────
   * Alıma bağlı GİRİŞ hareketleri. Düzeltme (ADJUSTMENT) ve iade girişi
   * "alım" değildir; ikisi de pozitif hareket üretir ve süzülmezse ortalama
   * bozulur.
   *
   * ⚠ MALİYET HAREKETİN DAMGASINDAN (`unitCostAmount`): kasadan fiilen
   * çıkan tutarı taşıyan yer orası (kupon vakası 19.08.2026).
   */
  const girisler = await prisma.stockMovement.findMany({
    where: {
      variantId: varyant.id,
      purchaseItemId: { not: null },
      quantityDelta: { gt: 0 },
      unitCostAmount: { not: null },
    },
    select: { quantityDelta: true, unitCostAmount: true },
  });

  let alimAdet = 0;
  let alimTutar = 0;
  for (const g of girisler) {
    alimAdet += g.quantityDelta;
    alimTutar += g.quantityDelta * Number(g.unitCostAmount);
  }

  /**
   * ── ORTALAMA SATIŞ — İPTALLİ HARİÇ ─────────────────────────────────────
   * İptal edilen satış hiç doğmamış sayılır; fiyat ortalamasına girmesi
   * gerçekte alınmamış bir parayı ortalamaya katmak olurdu.
   */
  const kalemler = await prisma.saleItem.findMany({
    where: { variantId: varyant.id, sale: { iptalTarihi: null } },
    select: { quantity: true, unitPriceAmount: true },
  });

  let satisAdet = 0;
  let satisTutar = 0;
  for (const k of kalemler) {
    satisAdet += k.quantity;
    satisTutar += k.quantity * Number(k.unitPriceAmount);
  }

  const stok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });

  /**
   * KDV: ÜRÜN İSTİSNASI > KATEGORİ ORANI > VARSAYILAN %20 (anayasa sırası).
   * `kdvOraniniCoz` senkron ve saf; kaynağı da söylüyor ama burada yalnız
   * oran taşınıyor — ekran onu değiştirebiliyor.
   */
  const kdv = kdvOraniniCoz({
    vatRateOverride: varyant.product.vatRateOverride,
    category: varyant.product.category,
  });

  return {
    variantId: varyant.id,
    ad: varyant.name
      ? `${varyant.product.name} — ${varyant.name}`
      : varyant.product.name,
    sku: varyant.sku,
    barkod: varyant.barcode,
    firmaSku: varyant.companySku,
    /** ⚠ SIFIR ADETTE null — sıfıra bölmek yerine "bilinmiyor" doğru cevap. */
    ortalamaAlis: alimAdet > 0 ? alimTutar / alimAdet : null,
    alimAdedi: alimAdet,
    ortalamaSatis: satisAdet > 0 ? satisTutar / satisAdet : null,
    satisAdedi: satisAdet,
    kdvOrani: kdv.oran ?? VARSAYILAN_KDV_ORANI,
    eldekiAdet: stok._sum.quantityDelta ?? 0,
    zeminler: await simulasyonZeminleri(varyant.id, an),
  };
}
