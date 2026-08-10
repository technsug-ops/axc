import { prisma } from "@/lib/prisma";

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

/** Yedeğe giren tablolar — ekranda da bu liste gösterilir. */
export const YEDEK_TABLOLARI = [
  "Category",
  "Product",
  "ProductVariant",
  "VariantOption",
  "Location",
  "Channel",
  "ChannelAccount",
  "ChannelSku",
  "ChannelFee",
  "PenaltyTariff",
  "CargoCarrier",
  "CargoTariff",
  "CreditCard",
  "Purchase",
  "PurchaseItem",
  "StockMovement",
  "Sale",
  "SaleItem",
  "SaleFee",
  "Return",
  "ReturnItem",
  "ReturnFee",
  "ExpenseCategory",
  "Expense",
  "ExpenseTemplate",
] as const;

export type YedekDosyasi = {
  bicim: string;
  surum: number;
  olusturulmaAni: string;
  /** true ise kargo tarifeleri dosyada YOK; seed ile tamamlanır. */
  kargoTarifesiHaric: boolean;
  satirSayilari: Record<string, number>;
  tablolar: Record<string, unknown[]>;
};

/**
 * @param an Dosyaya yazılacak zaman damgası — dışarıdan verilir ki üretim
 *           saati okuma sorumluluğu tek yerde kalsın.
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
  const tablolar: Record<string, unknown[]> = {
    Category: await prisma.category.findMany(),
    Product: await prisma.product.findMany(),
    ProductVariant: await prisma.productVariant.findMany(),
    VariantOption: await prisma.variantOption.findMany(),
    Location: await prisma.location.findMany(),
    Channel: await prisma.channel.findMany(),
    ChannelAccount: await prisma.channelAccount.findMany(),
    ChannelSku: await prisma.channelSku.findMany(),
    ChannelFee: await prisma.channelFee.findMany(),
    PenaltyTariff: await prisma.penaltyTariff.findMany(),
    CargoCarrier: await prisma.cargoCarrier.findMany(),
    CargoTariff: tarifesiz ? [] : await prisma.cargoTariff.findMany(),
    CreditCard: await prisma.creditCard.findMany(),
    Purchase: await prisma.purchase.findMany(),
    PurchaseItem: await prisma.purchaseItem.findMany(),
    StockMovement: await prisma.stockMovement.findMany(),
    Sale: await prisma.sale.findMany(),
    SaleItem: await prisma.saleItem.findMany(),
    SaleFee: await prisma.saleFee.findMany(),
    Return: await prisma.return.findMany(),
    ReturnItem: await prisma.returnItem.findMany(),
    ReturnFee: await prisma.returnFee.findMany(),
    ExpenseCategory: await prisma.expenseCategory.findMany(),
    Expense: await prisma.expense.findMany(),
    ExpenseTemplate: await prisma.expenseTemplate.findMany(),
  };

  const satirSayilari: Record<string, number> = {};
  for (const [ad, satirlar] of Object.entries(tablolar)) {
    satirSayilari[ad] = satirlar.length;
  }

  return {
    bicim: "selliora-yedek",
    surum: 1,
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
