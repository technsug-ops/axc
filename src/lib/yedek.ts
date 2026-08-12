import { prisma } from "@/lib/prisma";

import { YEDEK_SURUMU, YEDEK_TABLOLARI, type YedekDosyasi } from "./yedek-bicim";

export { YEDEK_SURUMU, YEDEK_TABLOLARI };
export type { YedekDosyasi };

/**
 * ============================================================================
 *  YEDEK — VERİTABANININ TAM DÖKÜMÜ
 * ----------------------------------------------------------------------------
 *  VERİ SAHİPLİĞİ İLKESİ (CLAUDE.md): müşteri verisini istediği an TAM olarak
 *  dışa aktarabilir. Excel dökümü insan içindir ve ilişkileri taşımaz; bu
 *  dosya MAKİNE içindir ve her tabloyu ham hâliyle taşır.
 *
 *  NEDEN JSON, NEDEN mysqldump DEĞİL:
 *  `mysqldump` sunucuda mysql istemcisi ister. Vercel gibi ortamlarda böyle
 *  bir istemci yok; JSON dökümü nerede çalışırsak çalışalım üretilebilir.
 *  Sunucuya doğrudan erişimimiz olan bir ortama geçilirse zamanlanmış
 *  `mysqldump` bunun YERİNE değil YANINA konur.
 *
 *  Decimal ve Date değerleri JSON'a metin olarak iner; geri yüklemede aynı
 *  alan tipine yazılırlar. Kayıp yoktur.
 * ============================================================================
 */

export async function yedekUret(
  an: Date,
  /**
   * Kargo tarifesi hariç tutulsun mu?
   *
   * Tarife tablosu 44.841 satır ve dosyanın %99'unu o kaplıyor; oysa
   * `npx prisma db seed` ile aynen yeniden üretilebilen REFERANS verisi.
   * Hariç tutulan yedek birkaç yüz kilobayt kalır — her gün alınabilecek
   * kadar hafif. Tam yedek yine de varsayılandır: eksik veren bir yedeğin
   * varsayılan olması yanlış olurdu.
   */
  tarifesiz = false,
): Promise<YedekDosyasi> {
  // Sıra YEDEK_TABLOLARI ile aynıdır — bağımlılık sırası.
  const tablolar: Record<string, unknown[]> = {
    Category: await prisma.category.findMany(),
    Location: await prisma.location.findMany(),
    Channel: await prisma.channel.findMany(),
    CargoCarrier: await prisma.cargoCarrier.findMany(),
    CreditCard: await prisma.creditCard.findMany(),
    ExpenseCategory: await prisma.expenseCategory.findMany(),
    Supplier: await prisma.supplier.findMany(),
    // Parola ÖZETİ (scrypt) yedeğe girer — parolanın kendisi değil, geri
    // çevrilemez. Boş veritabanına geri yükleyip giriş yapabilmek için
    // gerekli; olmasaydı felaket sonrası kimse içeri giremezdi.
    // _Kullanıcı kararı 12.08.2026._
    User: await prisma.user.findMany(),
    Product: await prisma.product.findMany(),
    ProductVariant: await prisma.productVariant.findMany(),
    VariantOption: await prisma.variantOption.findMany(),
    PenaltyTariff: await prisma.penaltyTariff.findMany(),
    ChannelFee: await prisma.channelFee.findMany(),
    CargoTariff: tarifesiz ? [] : await prisma.cargoTariff.findMany(),
    ChannelAccount: await prisma.channelAccount.findMany(),
    ChannelSku: await prisma.channelSku.findMany(),
    ExpenseTemplate: await prisma.expenseTemplate.findMany(),
    Expense: await prisma.expense.findMany(),
    Purchase: await prisma.purchase.findMany(),
    PurchaseItem: await prisma.purchaseItem.findMany(),
    Sale: await prisma.sale.findMany(),
    SaleItem: await prisma.saleItem.findMany(),
    SaleFee: await prisma.saleFee.findMany(),
    Return: await prisma.return.findMany(),
    ReturnItem: await prisma.returnItem.findMany(),
    ReturnFee: await prisma.returnFee.findMany(),
    StockMovement: await prisma.stockMovement.findMany(),
    Settlement: await prisma.settlement.findMany(),
    SettlementItem: await prisma.settlementItem.findMany(),
    Compensation: await prisma.compensation.findMany(),
  };

  const satirSayilari: Record<string, number> = {};
  for (const [ad, satirlar] of Object.entries(tablolar)) {
    satirSayilari[ad] = satirlar.length;
  }

  return {
    bicim: "selliora-yedek",
    surum: YEDEK_SURUMU,
    olusturulmaAni: an.toISOString(),
    // Dosyanın kendisi eksiğini SÖYLER: geri yükleyen taraf tarifeleri
    // seed'den tamamlaması gerektiğini dosyadan okur, tahmin etmez.
    kargoTarifesiHaric: tarifesiz,
    satirSayilari,
    tablolar,
  };
}

/**
 * Decimal nesneleri JSON'a metin olarak iner.
 * `JSON.stringify` Decimal'i `{}` olarak yazardı; toJSON'u olmayan her
 * nesne için toString kullanılır — sessiz veri kaybı olmaz.
 */
export function yedegiMetneCevir(yedek: YedekDosyasi): string {
  return JSON.stringify(
    yedek,
    (_anahtar, deger) => {
      if (
        deger !== null &&
        typeof deger === "object" &&
        !Array.isArray(deger) &&
        deger.constructor?.name === "Decimal"
      ) {
        return (deger as { toString(): string }).toString();
      }
      return deger;
    },
    2,
  );
}
