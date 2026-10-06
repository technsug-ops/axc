/**
 * ÜRETİLMİŞ DOSYA — ELLE DÜZENLEMEYİN. Kaynak: prisma/schema.prisma
 * Yenilemek: npm run firma-modelleri:uret · Tazeliği: npm run firma-modelleri:dogrula
 * (K303 Aşama 3a — firma süzgecinin model ve ilişki haritası.)
 */
import type { ModelBilgisi } from "../../scripts/firma-modelleri-uret";

export const MODEL_HARITASI: Record<string, ModelBilgisi> = {
  "AiOzet": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      }
    },
    "yabanciAnahtarlar": []
  },
  "Attachment": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "user": {
        "hedef": "User",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "userId"
    ]
  },
  "AuditLog": {
    "firma": true,
    "iliskiler": {
      "user": {
        "hedef": "User",
        "liste": false
      },
      "company": {
        "hedef": "Company",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "userId"
    ]
  },
  "Brand": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "products": {
        "hedef": "Product",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "CargoCarrier": {
    "firma": false,
    "iliskiler": {
      "tariffs": {
        "hedef": "CargoTariff",
        "liste": true
      },
      "sales": {
        "hedef": "Sale",
        "liste": true
      },
      "compensations": {
        "hedef": "Compensation",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "CargoTariff": {
    "firma": false,
    "iliskiler": {
      "channel": {
        "hedef": "Channel",
        "liste": false
      },
      "carrier": {
        "hedef": "CargoCarrier",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelId",
      "carrierId"
    ]
  },
  "Category": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "products": {
        "hedef": "Product",
        "liste": true
      },
      "tyEslesmeleri": {
        "hedef": "TyKategoriEslesme",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "Channel": {
    "firma": false,
    "iliskiler": {
      "accounts": {
        "hedef": "ChannelAccount",
        "liste": true
      },
      "fees": {
        "hedef": "ChannelFee",
        "liste": true
      },
      "cargoTariffs": {
        "hedef": "CargoTariff",
        "liste": true
      },
      "penaltyTariffs": {
        "hedef": "PenaltyTariff",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "ChannelAccount": {
    "firma": true,
    "iliskiler": {
      "komisyonTarifeleri": {
        "hedef": "KomisyonTarifesi",
        "liste": true
      },
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channel": {
        "hedef": "Channel",
        "liste": false
      },
      "channelSkus": {
        "hedef": "ChannelSku",
        "liste": true
      },
      "purchases": {
        "hedef": "Purchase",
        "liste": true
      },
      "sales": {
        "hedef": "Sale",
        "liste": true
      },
      "settlements": {
        "hedef": "Settlement",
        "liste": true
      },
      "settlementItems": {
        "hedef": "SettlementItem",
        "liste": true
      },
      "apiAnahtari": {
        "hedef": "KanalAnahtari",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelId"
    ]
  },
  "ChannelFee": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channel": {
        "hedef": "Channel",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelId"
    ]
  },
  "ChannelSku": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelAccountId",
      "variantId"
    ]
  },
  "Company": {
    "firma": false,
    "iliskiler": {
      "odemeler": {
        "hedef": "FirmaOdemesi",
        "liste": true
      },
      "paket": {
        "hedef": "Paket",
        "liste": false
      },
      "ozellikler": {
        "hedef": "FirmaOzelligi",
        "liste": true
      },
      "kanalAnahtarlari": {
        "hedef": "KanalAnahtari",
        "liste": true
      },
      "uyelikler": {
        "hedef": "UserCompanyRole",
        "liste": true
      },
      "hesaplar": {
        "hedef": "User",
        "liste": true
      },
      "auditLogs": {
        "hedef": "AuditLog",
        "liste": true
      },
      "talepler": {
        "hedef": "Talep",
        "liste": true
      },
      "productListesi": {
        "hedef": "Product",
        "liste": true
      },
      "productVariantListesi": {
        "hedef": "ProductVariant",
        "liste": true
      },
      "variantOptionListesi": {
        "hedef": "VariantOption",
        "liste": true
      },
      "eskiKodListesi": {
        "hedef": "EskiKod",
        "liste": true
      },
      "categoryListesi": {
        "hedef": "Category",
        "liste": true
      },
      "brandListesi": {
        "hedef": "Brand",
        "liste": true
      },
      "tyKategoriEslesmeListesi": {
        "hedef": "TyKategoriEslesme",
        "liste": true
      },
      "depoBolumuListesi": {
        "hedef": "DepoBolumu",
        "liste": true
      },
      "locationListesi": {
        "hedef": "Location",
        "liste": true
      },
      "supplierListesi": {
        "hedef": "Supplier",
        "liste": true
      },
      "channelAccountListesi": {
        "hedef": "ChannelAccount",
        "liste": true
      },
      "channelSkuListesi": {
        "hedef": "ChannelSku",
        "liste": true
      },
      "channelFeeListesi": {
        "hedef": "ChannelFee",
        "liste": true
      },
      "penaltyTariffListesi": {
        "hedef": "PenaltyTariff",
        "liste": true
      },
      "komisyonTarifesiListesi": {
        "hedef": "KomisyonTarifesi",
        "liste": true
      },
      "komisyonTarifeKalemiListesi": {
        "hedef": "KomisyonTarifeKalemi",
        "liste": true
      },
      "purchaseListesi": {
        "hedef": "Purchase",
        "liste": true
      },
      "purchaseItemListesi": {
        "hedef": "PurchaseItem",
        "liste": true
      },
      "stockMovementListesi": {
        "hedef": "StockMovement",
        "liste": true
      },
      "saleListesi": {
        "hedef": "Sale",
        "liste": true
      },
      "saleItemListesi": {
        "hedef": "SaleItem",
        "liste": true
      },
      "saleFeeListesi": {
        "hedef": "SaleFee",
        "liste": true
      },
      "returnListesi": {
        "hedef": "Return",
        "liste": true
      },
      "returnNoticeListesi": {
        "hedef": "ReturnNotice",
        "liste": true
      },
      "returnItemListesi": {
        "hedef": "ReturnItem",
        "liste": true
      },
      "returnFeeListesi": {
        "hedef": "ReturnFee",
        "liste": true
      },
      "attachmentListesi": {
        "hedef": "Attachment",
        "liste": true
      },
      "expenseListesi": {
        "hedef": "Expense",
        "liste": true
      },
      "expenseCategoryListesi": {
        "hedef": "ExpenseCategory",
        "liste": true
      },
      "expenseTemplateListesi": {
        "hedef": "ExpenseTemplate",
        "liste": true
      },
      "compensationListesi": {
        "hedef": "Compensation",
        "liste": true
      },
      "settlementListesi": {
        "hedef": "Settlement",
        "liste": true
      },
      "settlementItemListesi": {
        "hedef": "SettlementItem",
        "liste": true
      },
      "creditCardListesi": {
        "hedef": "CreditCard",
        "liste": true
      },
      "kartOdemeListesi": {
        "hedef": "KartOdeme",
        "liste": true
      },
      "gecmisEkstreListesi": {
        "hedef": "GecmisEkstre",
        "liste": true
      },
      "stockAdjustmentReasonListesi": {
        "hedef": "StockAdjustmentReason",
        "liste": true
      },
      "stokSayimiListesi": {
        "hedef": "StokSayimi",
        "liste": true
      },
      "stokSayimSatiriListesi": {
        "hedef": "StokSayimSatiri",
        "liste": true
      },
      "muhasebeDonemiListesi": {
        "hedef": "MuhasebeDonemi",
        "liste": true
      },
      "aiOzetListesi": {
        "hedef": "AiOzet",
        "liste": true
      },
      "roleListesi": {
        "hedef": "Role",
        "liste": true
      },
      "rolePermissionListesi": {
        "hedef": "RolePermission",
        "liste": true
      },
      "finansmanListesi": {
        "hedef": "Finansman",
        "liste": true
      },
      "finansmanHareketiListesi": {
        "hedef": "FinansmanHareketi",
        "liste": true
      },
      "finansmanBirimFiyatiListesi": {
        "hedef": "FinansmanBirimFiyati",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "paketId"
    ]
  },
  "Compensation": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "supplier": {
        "hedef": "Supplier",
        "liste": false
      },
      "carrier": {
        "hedef": "CargoCarrier",
        "liste": false
      },
      "purchaseItem": {
        "hedef": "PurchaseItem",
        "liste": false
      },
      "returnItem": {
        "hedef": "ReturnItem",
        "liste": false
      },
      "returnNotice": {
        "hedef": "ReturnNotice",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "supplierId",
      "carrierId",
      "purchaseItemId",
      "returnItemId",
      "returnNoticeId"
    ]
  },
  "CreditCard": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "purchases": {
        "hedef": "Purchase",
        "liste": true
      },
      "giderler": {
        "hedef": "Expense",
        "liste": true
      },
      "odemeler": {
        "hedef": "KartOdeme",
        "liste": true
      },
      "gecmisEkstreler": {
        "hedef": "GecmisEkstre",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "DepoBolumu": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "raflar": {
        "hedef": "Location",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "EskiKod": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "variantId"
    ]
  },
  "Expense": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "category": {
        "hedef": "ExpenseCategory",
        "liste": false
      },
      "template": {
        "hedef": "ExpenseTemplate",
        "liste": false
      },
      "kartOdemesi": {
        "hedef": "KartOdeme",
        "liste": false
      },
      "finansmanHareketi": {
        "hedef": "FinansmanHareketi",
        "liste": false
      },
      "creditCard": {
        "hedef": "CreditCard",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "categoryId",
      "templateId",
      "creditCardId"
    ]
  },
  "ExpenseCategory": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "expenses": {
        "hedef": "Expense",
        "liste": true
      },
      "templates": {
        "hedef": "ExpenseTemplate",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "ExpenseTemplate": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "category": {
        "hedef": "ExpenseCategory",
        "liste": false
      },
      "expenses": {
        "hedef": "Expense",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "categoryId"
    ]
  },
  "Finansman": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "hareketler": {
        "hedef": "FinansmanHareketi",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "FinansmanBirimFiyati": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      }
    },
    "yabanciAnahtarlar": []
  },
  "FinansmanHareketi": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "finansman": {
        "hedef": "Finansman",
        "liste": false
      },
      "faizGider": {
        "hedef": "Expense",
        "liste": false
      },
      "reverses": {
        "hedef": "FinansmanHareketi",
        "liste": false
      },
      "reversedBy": {
        "hedef": "FinansmanHareketi",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "finansmanId",
      "faizGiderId",
      "reversesId"
    ]
  },
  "FirmaOdemesi": {
    "firma": false,
    "iliskiler": {
      "firma": {
        "hedef": "Company",
        "liste": false
      },
      "duzeltilen": {
        "hedef": "FirmaOdemesi",
        "liste": false
      },
      "duzeltme": {
        "hedef": "FirmaOdemesi",
        "liste": false
      },
      "yazan": {
        "hedef": "User",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "firmaId",
      "duzeltilenId",
      "yazanId"
    ]
  },
  "FirmaOzelligi": {
    "firma": false,
    "iliskiler": {
      "firma": {
        "hedef": "Company",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "firmaId"
    ]
  },
  "GecmisEkstre": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "card": {
        "hedef": "CreditCard",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "cardId"
    ]
  },
  "IkiAdimYedekKodu": {
    "firma": false,
    "iliskiler": {
      "user": {
        "hedef": "User",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "userId"
    ]
  },
  "KanalAnahtari": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelAccountId"
    ]
  },
  "KartOdeme": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "card": {
        "hedef": "CreditCard",
        "liste": false
      },
      "faizGider": {
        "hedef": "Expense",
        "liste": false
      },
      "reverses": {
        "hedef": "KartOdeme",
        "liste": false
      },
      "reversedBy": {
        "hedef": "KartOdeme",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "cardId",
      "faizGiderId",
      "reversesId"
    ]
  },
  "KomisyonTarifeKalemi": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "tarife": {
        "hedef": "KomisyonTarifesi",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "tarifeId",
      "variantId"
    ]
  },
  "KomisyonTarifesi": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      },
      "kalemler": {
        "hedef": "KomisyonTarifeKalemi",
        "liste": true
      },
      "satisKalemleri": {
        "hedef": "SaleItem",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "channelAccountId"
    ]
  },
  "Location": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "bolum": {
        "hedef": "DepoBolumu",
        "liste": false
      },
      "variants": {
        "hedef": "ProductVariant",
        "liste": true
      },
      "returnItems": {
        "hedef": "ReturnItem",
        "liste": true
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "bolumId"
    ]
  },
  "MuhasebeDonemi": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "kapatan": {
        "hedef": "User",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "kapatanId"
    ]
  },
  "Paket": {
    "firma": false,
    "iliskiler": {
      "ozellikler": {
        "hedef": "PaketOzelligi",
        "liste": true
      },
      "firmalar": {
        "hedef": "Company",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "PaketOzelligi": {
    "firma": false,
    "iliskiler": {
      "paket": {
        "hedef": "Paket",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "paketId"
    ]
  },
  "PenaltyTariff": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channel": {
        "hedef": "Channel",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "channelId"
    ]
  },
  "Product": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "brandKaydi": {
        "hedef": "Brand",
        "liste": false
      },
      "category": {
        "hedef": "Category",
        "liste": false
      },
      "variants": {
        "hedef": "ProductVariant",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "brandId",
      "categoryId"
    ]
  },
  "ProductVariant": {
    "firma": true,
    "iliskiler": {
      "komisyonTarifeKalemleri": {
        "hedef": "KomisyonTarifeKalemi",
        "liste": true
      },
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "product": {
        "hedef": "Product",
        "liste": false
      },
      "location": {
        "hedef": "Location",
        "liste": false
      },
      "options": {
        "hedef": "VariantOption",
        "liste": true
      },
      "channelSkus": {
        "hedef": "ChannelSku",
        "liste": true
      },
      "purchaseItems": {
        "hedef": "PurchaseItem",
        "liste": true
      },
      "saleItems": {
        "hedef": "SaleItem",
        "liste": true
      },
      "returnItems": {
        "hedef": "ReturnItem",
        "liste": true
      },
      "exchangeItems": {
        "hedef": "ReturnItem",
        "liste": true
      },
      "ayrilanBildirimler": {
        "hedef": "ReturnNotice",
        "liste": true
      },
      "donenBildirimler": {
        "hedef": "ReturnNotice",
        "liste": true
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      },
      "sayimSatirlari": {
        "hedef": "StokSayimSatiri",
        "liste": true
      },
      "eskiKodlar": {
        "hedef": "EskiKod",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "productId",
      "locationId"
    ]
  },
  "Purchase": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "supplier": {
        "hedef": "Supplier",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      },
      "creditCard": {
        "hedef": "CreditCard",
        "liste": false
      },
      "items": {
        "hedef": "PurchaseItem",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "supplierId",
      "channelAccountId",
      "creditCardId"
    ]
  },
  "PurchaseItem": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "purchase": {
        "hedef": "Purchase",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "compensations": {
        "hedef": "Compensation",
        "liste": true
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "purchaseId",
      "variantId"
    ]
  },
  "Return": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "sale": {
        "hedef": "Sale",
        "liste": false
      },
      "user": {
        "hedef": "User",
        "liste": false
      },
      "geriAlan": {
        "hedef": "User",
        "liste": false
      },
      "items": {
        "hedef": "ReturnItem",
        "liste": true
      },
      "fees": {
        "hedef": "ReturnFee",
        "liste": true
      },
      "notice": {
        "hedef": "ReturnNotice",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "saleId",
      "userId",
      "geriAlanId"
    ]
  },
  "ReturnFee": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "return": {
        "hedef": "Return",
        "liste": false
      },
      "returnItem": {
        "hedef": "ReturnItem",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "returnId",
      "returnItemId"
    ]
  },
  "ReturnItem": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "return": {
        "hedef": "Return",
        "liste": false
      },
      "saleItem": {
        "hedef": "SaleItem",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "location": {
        "hedef": "Location",
        "liste": false
      },
      "exchangeVariant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      },
      "fees": {
        "hedef": "ReturnFee",
        "liste": true
      },
      "compensations": {
        "hedef": "Compensation",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "returnId",
      "saleItemId",
      "variantId",
      "locationId",
      "exchangeVariantId"
    ]
  },
  "ReturnNotice": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "sale": {
        "hedef": "Sale",
        "liste": false
      },
      "reservedVariant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "returnedVariant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "return": {
        "hedef": "Return",
        "liste": false
      },
      "user": {
        "hedef": "User",
        "liste": false
      },
      "compensations": {
        "hedef": "Compensation",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "saleId",
      "reservedVariantId",
      "returnedVariantId",
      "returnId",
      "userId"
    ]
  },
  "Role": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "izinler": {
        "hedef": "RolePermission",
        "liste": true
      },
      "uyelikler": {
        "hedef": "UserCompanyRole",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "RolePermission": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "role": {
        "hedef": "Role",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "roleId"
    ]
  },
  "Sale": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      },
      "iptalEden": {
        "hedef": "User",
        "liste": false
      },
      "cargoCarrier": {
        "hedef": "CargoCarrier",
        "liste": false
      },
      "items": {
        "hedef": "SaleItem",
        "liste": true
      },
      "fees": {
        "hedef": "SaleFee",
        "liste": true
      },
      "returns": {
        "hedef": "Return",
        "liste": true
      },
      "returnNotices": {
        "hedef": "ReturnNotice",
        "liste": true
      },
      "settlementItems": {
        "hedef": "SettlementItem",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "channelAccountId",
      "iptalEdenId",
      "cargoCarrierId"
    ]
  },
  "SaleFee": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "sale": {
        "hedef": "Sale",
        "liste": false
      },
      "saleItem": {
        "hedef": "SaleItem",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "saleId",
      "saleItemId"
    ]
  },
  "SaleItem": {
    "firma": true,
    "iliskiler": {
      "commissionTarife": {
        "hedef": "KomisyonTarifesi",
        "liste": false
      },
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "sale": {
        "hedef": "Sale",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      },
      "fees": {
        "hedef": "SaleFee",
        "liste": true
      },
      "returnItems": {
        "hedef": "ReturnItem",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "commissionTarifeId",
      "saleId",
      "variantId"
    ]
  },
  "Settlement": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      },
      "items": {
        "hedef": "SettlementItem",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "channelAccountId"
    ]
  },
  "SettlementItem": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "settlement": {
        "hedef": "Settlement",
        "liste": false
      },
      "sale": {
        "hedef": "Sale",
        "liste": false
      },
      "channelAccount": {
        "hedef": "ChannelAccount",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "settlementId",
      "saleId",
      "channelAccountId"
    ]
  },
  "StockAdjustmentReason": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "movements": {
        "hedef": "StockMovement",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "StockMovement": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "purchaseItem": {
        "hedef": "PurchaseItem",
        "liste": false
      },
      "saleItem": {
        "hedef": "SaleItem",
        "liste": false
      },
      "returnItem": {
        "hedef": "ReturnItem",
        "liste": false
      },
      "sourceMovement": {
        "hedef": "StockMovement",
        "liste": false
      },
      "tuketimler": {
        "hedef": "StockMovement",
        "liste": true
      },
      "location": {
        "hedef": "Location",
        "liste": false
      },
      "user": {
        "hedef": "User",
        "liste": false
      },
      "adjustmentReason": {
        "hedef": "StockAdjustmentReason",
        "liste": false
      },
      "sayimSatiri": {
        "hedef": "StokSayimSatiri",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "variantId",
      "purchaseItemId",
      "saleItemId",
      "returnItemId",
      "sourceMovementId",
      "locationId",
      "userId",
      "adjustmentReasonId",
      "sayimSatiriId"
    ]
  },
  "StokSayimSatiri": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "sayim": {
        "hedef": "StokSayimi",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      },
      "hareketler": {
        "hedef": "StockMovement",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "sayimId",
      "variantId"
    ]
  },
  "StokSayimi": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "user": {
        "hedef": "User",
        "liste": false
      },
      "satirlar": {
        "hedef": "StokSayimSatiri",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "userId"
    ]
  },
  "Supplier": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "purchases": {
        "hedef": "Purchase",
        "liste": true
      },
      "compensations": {
        "hedef": "Compensation",
        "liste": true
      }
    },
    "yabanciAnahtarlar": []
  },
  "Talep": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "bildiren": {
        "hedef": "User",
        "liste": false
      },
      "cozumNotuYazan": {
        "hedef": "User",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "bildirenId",
      "cozumNotuYazanId"
    ]
  },
  "TyKategoriEslesme": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "category": {
        "hedef": "Category",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "categoryId"
    ]
  },
  "User": {
    "firma": false,
    "iliskiler": {
      "hesapFirmasi": {
        "hedef": "Company",
        "liste": false
      },
      "yedekKodlar": {
        "hedef": "IkiAdimYedekKodu",
        "liste": true
      },
      "stockMovements": {
        "hedef": "StockMovement",
        "liste": true
      },
      "stokSayimlari": {
        "hedef": "StokSayimi",
        "liste": true
      },
      "kapattigiDonemler": {
        "hedef": "MuhasebeDonemi",
        "liste": true
      },
      "girdigiOdemeler": {
        "hedef": "FirmaOdemesi",
        "liste": true
      },
      "iadeler": {
        "hedef": "Return",
        "liste": true
      },
      "iadeGeriAlmalari": {
        "hedef": "Return",
        "liste": true
      },
      "iadeBildirimleri": {
        "hedef": "ReturnNotice",
        "liste": true
      },
      "ekler": {
        "hedef": "Attachment",
        "liste": true
      },
      "userCompanyRoles": {
        "hedef": "UserCompanyRole",
        "liste": true
      },
      "auditLogs": {
        "hedef": "AuditLog",
        "liste": true
      },
      "talepler": {
        "hedef": "Talep",
        "liste": true
      },
      "talepCozumleri": {
        "hedef": "Talep",
        "liste": true
      },
      "iptalEttigiSatislar": {
        "hedef": "Sale",
        "liste": true
      }
    },
    "yabanciAnahtarlar": [
      "hesapFirmasiId"
    ]
  },
  "UserCompanyRole": {
    "firma": true,
    "iliskiler": {
      "user": {
        "hedef": "User",
        "liste": false
      },
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "role": {
        "hedef": "Role",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "userId",
      "roleId"
    ]
  },
  "VariantOption": {
    "firma": true,
    "iliskiler": {
      "company": {
        "hedef": "Company",
        "liste": false
      },
      "variant": {
        "hedef": "ProductVariant",
        "liste": false
      }
    },
    "yabanciAnahtarlar": [
      "variantId"
    ]
  }
};
