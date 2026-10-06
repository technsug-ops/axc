/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEMEYİN. Kaynak: prisma/schema.prisma
 * Üretici: scripts/firma-bag-tetikleyici-uret.ts (K303 Aşama 4 — firma bağ kapısı).
 */
export const FIRMA_BAGLARI: readonly { tablo: string; alan: string; hedef: string }[] = [
  {
    "tablo": "ChannelSku",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "ChannelSku",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "Compensation",
    "alan": "purchaseItemId",
    "hedef": "PurchaseItem"
  },
  {
    "tablo": "Compensation",
    "alan": "returnItemId",
    "hedef": "ReturnItem"
  },
  {
    "tablo": "Compensation",
    "alan": "returnNoticeId",
    "hedef": "ReturnNotice"
  },
  {
    "tablo": "Compensation",
    "alan": "supplierId",
    "hedef": "Supplier"
  },
  {
    "tablo": "EskiKod",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "Expense",
    "alan": "categoryId",
    "hedef": "ExpenseCategory"
  },
  {
    "tablo": "Expense",
    "alan": "creditCardId",
    "hedef": "CreditCard"
  },
  {
    "tablo": "ExpenseTemplate",
    "alan": "categoryId",
    "hedef": "ExpenseCategory"
  },
  {
    "tablo": "Expense",
    "alan": "templateId",
    "hedef": "ExpenseTemplate"
  },
  {
    "tablo": "FinansmanHareketi",
    "alan": "faizGiderId",
    "hedef": "Expense"
  },
  {
    "tablo": "FinansmanHareketi",
    "alan": "finansmanId",
    "hedef": "Finansman"
  },
  {
    "tablo": "FinansmanHareketi",
    "alan": "reversesId",
    "hedef": "FinansmanHareketi"
  },
  {
    "tablo": "GecmisEkstre",
    "alan": "cardId",
    "hedef": "CreditCard"
  },
  {
    "tablo": "KanalAnahtari",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "KartOdeme",
    "alan": "cardId",
    "hedef": "CreditCard"
  },
  {
    "tablo": "KartOdeme",
    "alan": "faizGiderId",
    "hedef": "Expense"
  },
  {
    "tablo": "KartOdeme",
    "alan": "reversesId",
    "hedef": "KartOdeme"
  },
  {
    "tablo": "KomisyonTarifeKalemi",
    "alan": "tarifeId",
    "hedef": "KomisyonTarifesi"
  },
  {
    "tablo": "KomisyonTarifeKalemi",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "KomisyonTarifesi",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "Location",
    "alan": "bolumId",
    "hedef": "DepoBolumu"
  },
  {
    "tablo": "Product",
    "alan": "brandId",
    "hedef": "Brand"
  },
  {
    "tablo": "Product",
    "alan": "categoryId",
    "hedef": "Category"
  },
  {
    "tablo": "ProductVariant",
    "alan": "locationId",
    "hedef": "Location"
  },
  {
    "tablo": "ProductVariant",
    "alan": "productId",
    "hedef": "Product"
  },
  {
    "tablo": "Purchase",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "Purchase",
    "alan": "creditCardId",
    "hedef": "CreditCard"
  },
  {
    "tablo": "PurchaseItem",
    "alan": "purchaseId",
    "hedef": "Purchase"
  },
  {
    "tablo": "PurchaseItem",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "Purchase",
    "alan": "supplierId",
    "hedef": "Supplier"
  },
  {
    "tablo": "ReturnFee",
    "alan": "returnId",
    "hedef": "Return"
  },
  {
    "tablo": "ReturnFee",
    "alan": "returnItemId",
    "hedef": "ReturnItem"
  },
  {
    "tablo": "ReturnItem",
    "alan": "exchangeVariantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "ReturnItem",
    "alan": "locationId",
    "hedef": "Location"
  },
  {
    "tablo": "ReturnItem",
    "alan": "returnId",
    "hedef": "Return"
  },
  {
    "tablo": "ReturnItem",
    "alan": "saleItemId",
    "hedef": "SaleItem"
  },
  {
    "tablo": "ReturnItem",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "ReturnNotice",
    "alan": "reservedVariantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "ReturnNotice",
    "alan": "returnedVariantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "ReturnNotice",
    "alan": "returnId",
    "hedef": "Return"
  },
  {
    "tablo": "ReturnNotice",
    "alan": "saleId",
    "hedef": "Sale"
  },
  {
    "tablo": "Return",
    "alan": "saleId",
    "hedef": "Sale"
  },
  {
    "tablo": "RolePermission",
    "alan": "roleId",
    "hedef": "Role"
  },
  {
    "tablo": "Sale",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "SaleFee",
    "alan": "saleId",
    "hedef": "Sale"
  },
  {
    "tablo": "SaleFee",
    "alan": "saleItemId",
    "hedef": "SaleItem"
  },
  {
    "tablo": "SaleItem",
    "alan": "commissionTarifeId",
    "hedef": "KomisyonTarifesi"
  },
  {
    "tablo": "SaleItem",
    "alan": "saleId",
    "hedef": "Sale"
  },
  {
    "tablo": "SaleItem",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "Settlement",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "SettlementItem",
    "alan": "channelAccountId",
    "hedef": "ChannelAccount"
  },
  {
    "tablo": "SettlementItem",
    "alan": "saleId",
    "hedef": "Sale"
  },
  {
    "tablo": "SettlementItem",
    "alan": "settlementId",
    "hedef": "Settlement"
  },
  {
    "tablo": "StockMovement",
    "alan": "adjustmentReasonId",
    "hedef": "StockAdjustmentReason"
  },
  {
    "tablo": "StockMovement",
    "alan": "locationId",
    "hedef": "Location"
  },
  {
    "tablo": "StockMovement",
    "alan": "purchaseItemId",
    "hedef": "PurchaseItem"
  },
  {
    "tablo": "StockMovement",
    "alan": "returnItemId",
    "hedef": "ReturnItem"
  },
  {
    "tablo": "StockMovement",
    "alan": "saleItemId",
    "hedef": "SaleItem"
  },
  {
    "tablo": "StockMovement",
    "alan": "sayimSatiriId",
    "hedef": "StokSayimSatiri"
  },
  {
    "tablo": "StockMovement",
    "alan": "sourceMovementId",
    "hedef": "StockMovement"
  },
  {
    "tablo": "StockMovement",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "StokSayimSatiri",
    "alan": "sayimId",
    "hedef": "StokSayimi"
  },
  {
    "tablo": "StokSayimSatiri",
    "alan": "variantId",
    "hedef": "ProductVariant"
  },
  {
    "tablo": "TyKategoriEslesme",
    "alan": "categoryId",
    "hedef": "Category"
  },
  {
    "tablo": "UserCompanyRole",
    "alan": "roleId",
    "hedef": "Role"
  },
  {
    "tablo": "VariantOption",
    "alan": "variantId",
    "hedef": "ProductVariant"
  }
];
export const BAG_KAPISI_DEGISKENI = "selliora_bag_kapisi_kapali";
