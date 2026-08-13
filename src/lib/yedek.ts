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
  /**
   * Hangi veritabanından okunacak. Varsayılan uygulamanın kendi istemcisi.
   *
   * DIŞARIDAN VERİLEBİLMESİ ŞART: canlıya bağlanan bir betik yedek isterse,
   * ortak istemci `.env`'deki YEREL adrese bakar ve yanlış veritabanını
   * yedekler. 12.08.2026'da kimlik göçünde tam olarak bu oldu — göç canlıya,
   * yedek yerele gidecekti. Sahte güvenlik ağı, hiç ağ olmamasından kötüdür.
   */
  istemci: typeof prisma = prisma,
): Promise<YedekDosyasi> {
  // Sıra YEDEK_TABLOLARI ile aynıdır — bağımlılık sırası.
  const tablolar: Record<string, unknown[]> = {
    Category: await istemci.category.findMany(),
    Location: await istemci.location.findMany(),
    Channel: await istemci.channel.findMany(),
    CargoCarrier: await istemci.cargoCarrier.findMany(),
    CreditCard: await istemci.creditCard.findMany(),
    ExpenseCategory: await istemci.expenseCategory.findMany(),
    Supplier: await istemci.supplier.findMany(),
    // Parola ÖZETİ (scrypt) yedeğe girer — parolanın kendisi değil, geri
    // çevrilemez. Boş veritabanına geri yükleyip giriş yapabilmek için
    // gerekli; olmasaydı felaket sonrası kimse içeri giremezdi.
    // _Kullanıcı kararı 12.08.2026._
    User: await istemci.user.findMany(),
    StockAdjustmentReason: await istemci.stockAdjustmentReason.findMany(),
    // YETKİ: rol tanımları ve üyelikler. Parola özeti User'da zaten var;
    // bunlar olmadan boş veritabanına dönüşte kimse hiçbir şey yapamaz.
    Company: await istemci.company.findMany(),
    Role: await istemci.role.findMany(),
    RolePermission: await istemci.rolePermission.findMany(),
    UserCompanyRole: await istemci.userCompanyRole.findMany(),
    AuditLog: await istemci.auditLog.findMany(),
    Product: await istemci.product.findMany(),
    ProductVariant: await istemci.productVariant.findMany(),
    VariantOption: await istemci.variantOption.findMany(),
    PenaltyTariff: await istemci.penaltyTariff.findMany(),
    ChannelFee: await istemci.channelFee.findMany(),
    CargoTariff: tarifesiz ? [] : await istemci.cargoTariff.findMany(),
    ChannelAccount: await istemci.channelAccount.findMany(),
    ChannelSku: await istemci.channelSku.findMany(),
    ExpenseTemplate: await istemci.expenseTemplate.findMany(),
    Expense: await istemci.expense.findMany(),
    Purchase: await istemci.purchase.findMany(),
    PurchaseItem: await istemci.purchaseItem.findMany(),
    Sale: await istemci.sale.findMany(),
    SaleItem: await istemci.saleItem.findMany(),
    SaleFee: await istemci.saleFee.findMany(),
    Return: await istemci.return.findMany(),
    ReturnItem: await istemci.returnItem.findMany(),
    ReturnFee: await istemci.returnFee.findMany(),
    StockMovement: await istemci.stockMovement.findMany(),
    Settlement: await istemci.settlement.findMany(),
    SettlementItem: await istemci.settlementItem.findMany(),
    Compensation: await istemci.compensation.findMany(),
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
