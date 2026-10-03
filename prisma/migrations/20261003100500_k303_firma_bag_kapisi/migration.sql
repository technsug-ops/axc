-- K303 Aşama 4 (03.10.2026): FİRMA BAĞ KAPISI — bir kayıt BAŞKA firmanın kaydına bağlanamaz.
-- ÜRETİLMİŞ: scripts/firma-bag-tetikleyici-uret.ts (şemadan; elle düzenlemeyin).
-- Veritabanı tetikleyicisi: aynı işlemin içini görür; Prisma tetikleyicileri yönetmez.
-- İhlal: SQLSTATE 45000 'FIRMA_BAG_IHLALI: <tablo>.<alan> -> <hedef>'.

CREATE TRIGGER `ChannelSku_firma_bag_ekle` BEFORE INSERT ON `ChannelSku` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ChannelSku.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ChannelSku.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `ChannelSku_firma_bag_guncelle` BEFORE UPDATE ON `ChannelSku` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ChannelSku.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ChannelSku.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `Compensation_firma_bag_ekle` BEFORE INSERT ON `Compensation` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`purchaseItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `PurchaseItem` WHERE `id` = NEW.`purchaseItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.purchaseItemId -> PurchaseItem';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.returnItemId -> ReturnItem';
    END IF;
    IF NEW.`returnNoticeId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ReturnNotice` WHERE `id` = NEW.`returnNoticeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.returnNoticeId -> ReturnNotice';
    END IF;
    IF NEW.`supplierId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Supplier` WHERE `id` = NEW.`supplierId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.supplierId -> Supplier';
    END IF;
  END IF;
END;

CREATE TRIGGER `Compensation_firma_bag_guncelle` BEFORE UPDATE ON `Compensation` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`purchaseItemId` IS NOT NULL AND (NOT (NEW.`purchaseItemId` <=> OLD.`purchaseItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `PurchaseItem` WHERE `id` = NEW.`purchaseItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.purchaseItemId -> PurchaseItem';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND (NOT (NEW.`returnItemId` <=> OLD.`returnItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.returnItemId -> ReturnItem';
    END IF;
    IF NEW.`returnNoticeId` IS NOT NULL AND (NOT (NEW.`returnNoticeId` <=> OLD.`returnNoticeId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ReturnNotice` WHERE `id` = NEW.`returnNoticeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.returnNoticeId -> ReturnNotice';
    END IF;
    IF NEW.`supplierId` IS NOT NULL AND (NOT (NEW.`supplierId` <=> OLD.`supplierId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Supplier` WHERE `id` = NEW.`supplierId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Compensation.supplierId -> Supplier';
    END IF;
  END IF;
END;

CREATE TRIGGER `EskiKod_firma_bag_ekle` BEFORE INSERT ON `EskiKod` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: EskiKod.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `EskiKod_firma_bag_guncelle` BEFORE UPDATE ON `EskiKod` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: EskiKod.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `Expense_firma_bag_ekle` BEFORE INSERT ON `Expense` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ExpenseCategory` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.categoryId -> ExpenseCategory';
    END IF;
    IF NEW.`creditCardId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`creditCardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.creditCardId -> CreditCard';
    END IF;
    IF NEW.`templateId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ExpenseTemplate` WHERE `id` = NEW.`templateId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.templateId -> ExpenseTemplate';
    END IF;
  END IF;
END;

CREATE TRIGGER `Expense_firma_bag_guncelle` BEFORE UPDATE ON `Expense` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND (NOT (NEW.`categoryId` <=> OLD.`categoryId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ExpenseCategory` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.categoryId -> ExpenseCategory';
    END IF;
    IF NEW.`creditCardId` IS NOT NULL AND (NOT (NEW.`creditCardId` <=> OLD.`creditCardId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`creditCardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.creditCardId -> CreditCard';
    END IF;
    IF NEW.`templateId` IS NOT NULL AND (NOT (NEW.`templateId` <=> OLD.`templateId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ExpenseTemplate` WHERE `id` = NEW.`templateId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Expense.templateId -> ExpenseTemplate';
    END IF;
  END IF;
END;

CREATE TRIGGER `ExpenseTemplate_firma_bag_ekle` BEFORE INSERT ON `ExpenseTemplate` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ExpenseCategory` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ExpenseTemplate.categoryId -> ExpenseCategory';
    END IF;
  END IF;
END;

CREATE TRIGGER `ExpenseTemplate_firma_bag_guncelle` BEFORE UPDATE ON `ExpenseTemplate` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND (NOT (NEW.`categoryId` <=> OLD.`categoryId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ExpenseCategory` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ExpenseTemplate.categoryId -> ExpenseCategory';
    END IF;
  END IF;
END;

CREATE TRIGGER `FinansmanHareketi_firma_bag_ekle` BEFORE INSERT ON `FinansmanHareketi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`faizGiderId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Expense` WHERE `id` = NEW.`faizGiderId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.faizGiderId -> Expense';
    END IF;
    IF NEW.`finansmanId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Finansman` WHERE `id` = NEW.`finansmanId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.finansmanId -> Finansman';
    END IF;
    IF NEW.`reversesId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `FinansmanHareketi` WHERE `id` = NEW.`reversesId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.reversesId -> FinansmanHareketi';
    END IF;
  END IF;
END;

CREATE TRIGGER `FinansmanHareketi_firma_bag_guncelle` BEFORE UPDATE ON `FinansmanHareketi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`faizGiderId` IS NOT NULL AND (NOT (NEW.`faizGiderId` <=> OLD.`faizGiderId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Expense` WHERE `id` = NEW.`faizGiderId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.faizGiderId -> Expense';
    END IF;
    IF NEW.`finansmanId` IS NOT NULL AND (NOT (NEW.`finansmanId` <=> OLD.`finansmanId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Finansman` WHERE `id` = NEW.`finansmanId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.finansmanId -> Finansman';
    END IF;
    IF NEW.`reversesId` IS NOT NULL AND (NOT (NEW.`reversesId` <=> OLD.`reversesId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `FinansmanHareketi` WHERE `id` = NEW.`reversesId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: FinansmanHareketi.reversesId -> FinansmanHareketi';
    END IF;
  END IF;
END;

CREATE TRIGGER `GecmisEkstre_firma_bag_ekle` BEFORE INSERT ON `GecmisEkstre` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`cardId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`cardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: GecmisEkstre.cardId -> CreditCard';
    END IF;
  END IF;
END;

CREATE TRIGGER `GecmisEkstre_firma_bag_guncelle` BEFORE UPDATE ON `GecmisEkstre` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`cardId` IS NOT NULL AND (NOT (NEW.`cardId` <=> OLD.`cardId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`cardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: GecmisEkstre.cardId -> CreditCard';
    END IF;
  END IF;
END;

CREATE TRIGGER `KartOdeme_firma_bag_ekle` BEFORE INSERT ON `KartOdeme` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`cardId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`cardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.cardId -> CreditCard';
    END IF;
    IF NEW.`faizGiderId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Expense` WHERE `id` = NEW.`faizGiderId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.faizGiderId -> Expense';
    END IF;
    IF NEW.`reversesId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `KartOdeme` WHERE `id` = NEW.`reversesId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.reversesId -> KartOdeme';
    END IF;
  END IF;
END;

CREATE TRIGGER `KartOdeme_firma_bag_guncelle` BEFORE UPDATE ON `KartOdeme` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`cardId` IS NOT NULL AND (NOT (NEW.`cardId` <=> OLD.`cardId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`cardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.cardId -> CreditCard';
    END IF;
    IF NEW.`faizGiderId` IS NOT NULL AND (NOT (NEW.`faizGiderId` <=> OLD.`faizGiderId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Expense` WHERE `id` = NEW.`faizGiderId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.faizGiderId -> Expense';
    END IF;
    IF NEW.`reversesId` IS NOT NULL AND (NOT (NEW.`reversesId` <=> OLD.`reversesId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `KartOdeme` WHERE `id` = NEW.`reversesId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KartOdeme.reversesId -> KartOdeme';
    END IF;
  END IF;
END;

CREATE TRIGGER `KomisyonTarifeKalemi_firma_bag_ekle` BEFORE INSERT ON `KomisyonTarifeKalemi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`tarifeId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `KomisyonTarifesi` WHERE `id` = NEW.`tarifeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifeKalemi.tarifeId -> KomisyonTarifesi';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifeKalemi.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `KomisyonTarifeKalemi_firma_bag_guncelle` BEFORE UPDATE ON `KomisyonTarifeKalemi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`tarifeId` IS NOT NULL AND (NOT (NEW.`tarifeId` <=> OLD.`tarifeId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `KomisyonTarifesi` WHERE `id` = NEW.`tarifeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifeKalemi.tarifeId -> KomisyonTarifesi';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifeKalemi.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `KomisyonTarifesi_firma_bag_ekle` BEFORE INSERT ON `KomisyonTarifesi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifesi.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `KomisyonTarifesi_firma_bag_guncelle` BEFORE UPDATE ON `KomisyonTarifesi` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: KomisyonTarifesi.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `Location_firma_bag_ekle` BEFORE INSERT ON `Location` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`bolumId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `DepoBolumu` WHERE `id` = NEW.`bolumId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Location.bolumId -> DepoBolumu';
    END IF;
  END IF;
END;

CREATE TRIGGER `Location_firma_bag_guncelle` BEFORE UPDATE ON `Location` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`bolumId` IS NOT NULL AND (NOT (NEW.`bolumId` <=> OLD.`bolumId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `DepoBolumu` WHERE `id` = NEW.`bolumId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Location.bolumId -> DepoBolumu';
    END IF;
  END IF;
END;

CREATE TRIGGER `Product_firma_bag_ekle` BEFORE INSERT ON `Product` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`brandId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Brand` WHERE `id` = NEW.`brandId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Product.brandId -> Brand';
    END IF;
    IF NEW.`categoryId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Product.categoryId -> Category';
    END IF;
  END IF;
END;

CREATE TRIGGER `Product_firma_bag_guncelle` BEFORE UPDATE ON `Product` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`brandId` IS NOT NULL AND (NOT (NEW.`brandId` <=> OLD.`brandId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Brand` WHERE `id` = NEW.`brandId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Product.brandId -> Brand';
    END IF;
    IF NEW.`categoryId` IS NOT NULL AND (NOT (NEW.`categoryId` <=> OLD.`categoryId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Product.categoryId -> Category';
    END IF;
  END IF;
END;

CREATE TRIGGER `ProductVariant_firma_bag_ekle` BEFORE INSERT ON `ProductVariant` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`locationId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ProductVariant.locationId -> Location';
    END IF;
    IF NEW.`productId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Product` WHERE `id` = NEW.`productId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ProductVariant.productId -> Product';
    END IF;
  END IF;
END;

CREATE TRIGGER `ProductVariant_firma_bag_guncelle` BEFORE UPDATE ON `ProductVariant` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`locationId` IS NOT NULL AND (NOT (NEW.`locationId` <=> OLD.`locationId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ProductVariant.locationId -> Location';
    END IF;
    IF NEW.`productId` IS NOT NULL AND (NOT (NEW.`productId` <=> OLD.`productId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Product` WHERE `id` = NEW.`productId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ProductVariant.productId -> Product';
    END IF;
  END IF;
END;

CREATE TRIGGER `Purchase_firma_bag_ekle` BEFORE INSERT ON `Purchase` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`creditCardId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`creditCardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.creditCardId -> CreditCard';
    END IF;
    IF NEW.`supplierId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Supplier` WHERE `id` = NEW.`supplierId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.supplierId -> Supplier';
    END IF;
  END IF;
END;

CREATE TRIGGER `Purchase_firma_bag_guncelle` BEFORE UPDATE ON `Purchase` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`creditCardId` IS NOT NULL AND (NOT (NEW.`creditCardId` <=> OLD.`creditCardId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `CreditCard` WHERE `id` = NEW.`creditCardId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.creditCardId -> CreditCard';
    END IF;
    IF NEW.`supplierId` IS NOT NULL AND (NOT (NEW.`supplierId` <=> OLD.`supplierId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Supplier` WHERE `id` = NEW.`supplierId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Purchase.supplierId -> Supplier';
    END IF;
  END IF;
END;

CREATE TRIGGER `PurchaseItem_firma_bag_ekle` BEFORE INSERT ON `PurchaseItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`purchaseId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Purchase` WHERE `id` = NEW.`purchaseId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: PurchaseItem.purchaseId -> Purchase';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: PurchaseItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `PurchaseItem_firma_bag_guncelle` BEFORE UPDATE ON `PurchaseItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`purchaseId` IS NOT NULL AND (NOT (NEW.`purchaseId` <=> OLD.`purchaseId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Purchase` WHERE `id` = NEW.`purchaseId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: PurchaseItem.purchaseId -> Purchase';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: PurchaseItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `Return_firma_bag_ekle` BEFORE INSERT ON `Return` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`saleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Return.saleId -> Sale';
    END IF;
  END IF;
END;

CREATE TRIGGER `Return_firma_bag_guncelle` BEFORE UPDATE ON `Return` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`saleId` IS NOT NULL AND (NOT (NEW.`saleId` <=> OLD.`saleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Return.saleId -> Sale';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnFee_firma_bag_ekle` BEFORE INSERT ON `ReturnFee` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`returnId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnFee.returnId -> Return';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnFee.returnItemId -> ReturnItem';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnFee_firma_bag_guncelle` BEFORE UPDATE ON `ReturnFee` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`returnId` IS NOT NULL AND (NOT (NEW.`returnId` <=> OLD.`returnId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnFee.returnId -> Return';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND (NOT (NEW.`returnItemId` <=> OLD.`returnItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnFee.returnItemId -> ReturnItem';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnItem_firma_bag_ekle` BEFORE INSERT ON `ReturnItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`exchangeVariantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`exchangeVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.exchangeVariantId -> ProductVariant';
    END IF;
    IF NEW.`locationId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.locationId -> Location';
    END IF;
    IF NEW.`returnId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.returnId -> Return';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.saleItemId -> SaleItem';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnItem_firma_bag_guncelle` BEFORE UPDATE ON `ReturnItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`exchangeVariantId` IS NOT NULL AND (NOT (NEW.`exchangeVariantId` <=> OLD.`exchangeVariantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`exchangeVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.exchangeVariantId -> ProductVariant';
    END IF;
    IF NEW.`locationId` IS NOT NULL AND (NOT (NEW.`locationId` <=> OLD.`locationId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.locationId -> Location';
    END IF;
    IF NEW.`returnId` IS NOT NULL AND (NOT (NEW.`returnId` <=> OLD.`returnId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.returnId -> Return';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND (NOT (NEW.`saleItemId` <=> OLD.`saleItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.saleItemId -> SaleItem';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnNotice_firma_bag_ekle` BEFORE INSERT ON `ReturnNotice` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`reservedVariantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`reservedVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.reservedVariantId -> ProductVariant';
    END IF;
    IF NEW.`returnedVariantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`returnedVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.returnedVariantId -> ProductVariant';
    END IF;
    IF NEW.`returnId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.returnId -> Return';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.saleId -> Sale';
    END IF;
  END IF;
END;

CREATE TRIGGER `ReturnNotice_firma_bag_guncelle` BEFORE UPDATE ON `ReturnNotice` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`reservedVariantId` IS NOT NULL AND (NOT (NEW.`reservedVariantId` <=> OLD.`reservedVariantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`reservedVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.reservedVariantId -> ProductVariant';
    END IF;
    IF NEW.`returnedVariantId` IS NOT NULL AND (NOT (NEW.`returnedVariantId` <=> OLD.`returnedVariantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`returnedVariantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.returnedVariantId -> ProductVariant';
    END IF;
    IF NEW.`returnId` IS NOT NULL AND (NOT (NEW.`returnId` <=> OLD.`returnId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Return` WHERE `id` = NEW.`returnId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.returnId -> Return';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND (NOT (NEW.`saleId` <=> OLD.`saleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: ReturnNotice.saleId -> Sale';
    END IF;
  END IF;
END;

CREATE TRIGGER `RolePermission_firma_bag_ekle` BEFORE INSERT ON `RolePermission` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`roleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Role` WHERE `id` = NEW.`roleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: RolePermission.roleId -> Role';
    END IF;
  END IF;
END;

CREATE TRIGGER `RolePermission_firma_bag_guncelle` BEFORE UPDATE ON `RolePermission` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`roleId` IS NOT NULL AND (NOT (NEW.`roleId` <=> OLD.`roleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Role` WHERE `id` = NEW.`roleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: RolePermission.roleId -> Role';
    END IF;
  END IF;
END;

CREATE TRIGGER `Sale_firma_bag_ekle` BEFORE INSERT ON `Sale` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Sale.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `Sale_firma_bag_guncelle` BEFORE UPDATE ON `Sale` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Sale.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `SaleFee_firma_bag_ekle` BEFORE INSERT ON `SaleFee` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`saleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleFee.saleId -> Sale';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleFee.saleItemId -> SaleItem';
    END IF;
  END IF;
END;

CREATE TRIGGER `SaleFee_firma_bag_guncelle` BEFORE UPDATE ON `SaleFee` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`saleId` IS NOT NULL AND (NOT (NEW.`saleId` <=> OLD.`saleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleFee.saleId -> Sale';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND (NOT (NEW.`saleItemId` <=> OLD.`saleItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleFee.saleItemId -> SaleItem';
    END IF;
  END IF;
END;

CREATE TRIGGER `SaleItem_firma_bag_ekle` BEFORE INSERT ON `SaleItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`commissionTarifeId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `KomisyonTarifesi` WHERE `id` = NEW.`commissionTarifeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.commissionTarifeId -> KomisyonTarifesi';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.saleId -> Sale';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `SaleItem_firma_bag_guncelle` BEFORE UPDATE ON `SaleItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`commissionTarifeId` IS NOT NULL AND (NOT (NEW.`commissionTarifeId` <=> OLD.`commissionTarifeId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `KomisyonTarifesi` WHERE `id` = NEW.`commissionTarifeId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.commissionTarifeId -> KomisyonTarifesi';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND (NOT (NEW.`saleId` <=> OLD.`saleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.saleId -> Sale';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SaleItem.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `Settlement_firma_bag_ekle` BEFORE INSERT ON `Settlement` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Settlement.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `Settlement_firma_bag_guncelle` BEFORE UPDATE ON `Settlement` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: Settlement.channelAccountId -> ChannelAccount';
    END IF;
  END IF;
END;

CREATE TRIGGER `SettlementItem_firma_bag_ekle` BEFORE INSERT ON `SettlementItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.saleId -> Sale';
    END IF;
    IF NEW.`settlementId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Settlement` WHERE `id` = NEW.`settlementId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.settlementId -> Settlement';
    END IF;
  END IF;
END;

CREATE TRIGGER `SettlementItem_firma_bag_guncelle` BEFORE UPDATE ON `SettlementItem` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`channelAccountId` IS NOT NULL AND (NOT (NEW.`channelAccountId` <=> OLD.`channelAccountId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ChannelAccount` WHERE `id` = NEW.`channelAccountId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.channelAccountId -> ChannelAccount';
    END IF;
    IF NEW.`saleId` IS NOT NULL AND (NOT (NEW.`saleId` <=> OLD.`saleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Sale` WHERE `id` = NEW.`saleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.saleId -> Sale';
    END IF;
    IF NEW.`settlementId` IS NOT NULL AND (NOT (NEW.`settlementId` <=> OLD.`settlementId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Settlement` WHERE `id` = NEW.`settlementId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: SettlementItem.settlementId -> Settlement';
    END IF;
  END IF;
END;

CREATE TRIGGER `StockMovement_firma_bag_ekle` BEFORE INSERT ON `StockMovement` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`adjustmentReasonId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `StockAdjustmentReason` WHERE `id` = NEW.`adjustmentReasonId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.adjustmentReasonId -> StockAdjustmentReason';
    END IF;
    IF NEW.`locationId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.locationId -> Location';
    END IF;
    IF NEW.`purchaseItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `PurchaseItem` WHERE `id` = NEW.`purchaseItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.purchaseItemId -> PurchaseItem';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.returnItemId -> ReturnItem';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.saleItemId -> SaleItem';
    END IF;
    IF NEW.`sayimSatiriId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `StokSayimSatiri` WHERE `id` = NEW.`sayimSatiriId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.sayimSatiriId -> StokSayimSatiri';
    END IF;
    IF NEW.`sourceMovementId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `StockMovement` WHERE `id` = NEW.`sourceMovementId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.sourceMovementId -> StockMovement';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `StockMovement_firma_bag_guncelle` BEFORE UPDATE ON `StockMovement` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`adjustmentReasonId` IS NOT NULL AND (NOT (NEW.`adjustmentReasonId` <=> OLD.`adjustmentReasonId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `StockAdjustmentReason` WHERE `id` = NEW.`adjustmentReasonId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.adjustmentReasonId -> StockAdjustmentReason';
    END IF;
    IF NEW.`locationId` IS NOT NULL AND (NOT (NEW.`locationId` <=> OLD.`locationId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Location` WHERE `id` = NEW.`locationId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.locationId -> Location';
    END IF;
    IF NEW.`purchaseItemId` IS NOT NULL AND (NOT (NEW.`purchaseItemId` <=> OLD.`purchaseItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `PurchaseItem` WHERE `id` = NEW.`purchaseItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.purchaseItemId -> PurchaseItem';
    END IF;
    IF NEW.`returnItemId` IS NOT NULL AND (NOT (NEW.`returnItemId` <=> OLD.`returnItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ReturnItem` WHERE `id` = NEW.`returnItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.returnItemId -> ReturnItem';
    END IF;
    IF NEW.`saleItemId` IS NOT NULL AND (NOT (NEW.`saleItemId` <=> OLD.`saleItemId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `SaleItem` WHERE `id` = NEW.`saleItemId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.saleItemId -> SaleItem';
    END IF;
    IF NEW.`sayimSatiriId` IS NOT NULL AND (NOT (NEW.`sayimSatiriId` <=> OLD.`sayimSatiriId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `StokSayimSatiri` WHERE `id` = NEW.`sayimSatiriId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.sayimSatiriId -> StokSayimSatiri';
    END IF;
    IF NEW.`sourceMovementId` IS NOT NULL AND (NOT (NEW.`sourceMovementId` <=> OLD.`sourceMovementId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `StockMovement` WHERE `id` = NEW.`sourceMovementId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.sourceMovementId -> StockMovement';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StockMovement.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `StokSayimSatiri_firma_bag_ekle` BEFORE INSERT ON `StokSayimSatiri` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`sayimId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `StokSayimi` WHERE `id` = NEW.`sayimId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StokSayimSatiri.sayimId -> StokSayimi';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StokSayimSatiri.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `StokSayimSatiri_firma_bag_guncelle` BEFORE UPDATE ON `StokSayimSatiri` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`sayimId` IS NOT NULL AND (NOT (NEW.`sayimId` <=> OLD.`sayimId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `StokSayimi` WHERE `id` = NEW.`sayimId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StokSayimSatiri.sayimId -> StokSayimi';
    END IF;
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: StokSayimSatiri.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `TyKategoriEslesme_firma_bag_ekle` BEFORE INSERT ON `TyKategoriEslesme` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: TyKategoriEslesme.categoryId -> Category';
    END IF;
  END IF;
END;

CREATE TRIGGER `TyKategoriEslesme_firma_bag_guncelle` BEFORE UPDATE ON `TyKategoriEslesme` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`categoryId` IS NOT NULL AND (NOT (NEW.`categoryId` <=> OLD.`categoryId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Category` WHERE `id` = NEW.`categoryId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: TyKategoriEslesme.categoryId -> Category';
    END IF;
  END IF;
END;

CREATE TRIGGER `UserCompanyRole_firma_bag_ekle` BEFORE INSERT ON `UserCompanyRole` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`roleId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `Role` WHERE `id` = NEW.`roleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: UserCompanyRole.roleId -> Role';
    END IF;
  END IF;
END;

CREATE TRIGGER `UserCompanyRole_firma_bag_guncelle` BEFORE UPDATE ON `UserCompanyRole` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`roleId` IS NOT NULL AND (NOT (NEW.`roleId` <=> OLD.`roleId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `Role` WHERE `id` = NEW.`roleId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: UserCompanyRole.roleId -> Role';
    END IF;
  END IF;
END;

CREATE TRIGGER `VariantOption_firma_bag_ekle` BEFORE INSERT ON `VariantOption` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: VariantOption.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `VariantOption_firma_bag_guncelle` BEFORE UPDATE ON `VariantOption` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: VariantOption.variantId -> ProductVariant';
    END IF;
  END IF;
END;
