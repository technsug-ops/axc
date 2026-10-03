-- ============================================================================
--  K303 AŞAMA 2 — ① FİRMA ALANI (BOŞ) + DİZİN
-- ----------------------------------------------------------------------------
--  Firmaya ait 46 tabloya boş bırakılabilir `companyId` ve dizini eklenir.
--  Veri değişmez; uygulama davranışı değişmez.
--  Tablo adları şemadaki model adıyla HARF HARF (canlı MySQL harfe duyarlı).
--  YIKICI DEĞİLDİR: satır silinmez, sütun düşürülmez, veri dönüşmez.
-- ============================================================================

ALTER TABLE `Product` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Product_companyId_idx` ON `Product`(`companyId`);

ALTER TABLE `ProductVariant` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ProductVariant_companyId_idx` ON `ProductVariant`(`companyId`);

ALTER TABLE `VariantOption` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `VariantOption_companyId_idx` ON `VariantOption`(`companyId`);

ALTER TABLE `EskiKod` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `EskiKod_companyId_idx` ON `EskiKod`(`companyId`);

ALTER TABLE `Category` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Category_companyId_idx` ON `Category`(`companyId`);

ALTER TABLE `Brand` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Brand_companyId_idx` ON `Brand`(`companyId`);

ALTER TABLE `TyKategoriEslesme` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `TyKategoriEslesme_companyId_idx` ON `TyKategoriEslesme`(`companyId`);

ALTER TABLE `DepoBolumu` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `DepoBolumu_companyId_idx` ON `DepoBolumu`(`companyId`);

ALTER TABLE `Location` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Location_companyId_idx` ON `Location`(`companyId`);

ALTER TABLE `Supplier` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Supplier_companyId_idx` ON `Supplier`(`companyId`);

ALTER TABLE `ChannelAccount` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ChannelAccount_companyId_idx` ON `ChannelAccount`(`companyId`);

ALTER TABLE `ChannelSku` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ChannelSku_companyId_idx` ON `ChannelSku`(`companyId`);

ALTER TABLE `ChannelFee` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ChannelFee_companyId_idx` ON `ChannelFee`(`companyId`);

ALTER TABLE `PenaltyTariff` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `PenaltyTariff_companyId_idx` ON `PenaltyTariff`(`companyId`);

ALTER TABLE `KomisyonTarifesi` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `KomisyonTarifesi_companyId_idx` ON `KomisyonTarifesi`(`companyId`);

ALTER TABLE `KomisyonTarifeKalemi` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `KomisyonTarifeKalemi_companyId_idx` ON `KomisyonTarifeKalemi`(`companyId`);

ALTER TABLE `Purchase` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Purchase_companyId_idx` ON `Purchase`(`companyId`);

ALTER TABLE `PurchaseItem` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `PurchaseItem_companyId_idx` ON `PurchaseItem`(`companyId`);

ALTER TABLE `StockMovement` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `StockMovement_companyId_idx` ON `StockMovement`(`companyId`);

ALTER TABLE `Sale` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Sale_companyId_idx` ON `Sale`(`companyId`);

ALTER TABLE `SaleItem` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `SaleItem_companyId_idx` ON `SaleItem`(`companyId`);

ALTER TABLE `SaleFee` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `SaleFee_companyId_idx` ON `SaleFee`(`companyId`);

ALTER TABLE `Return` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Return_companyId_idx` ON `Return`(`companyId`);

ALTER TABLE `ReturnNotice` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ReturnNotice_companyId_idx` ON `ReturnNotice`(`companyId`);

ALTER TABLE `ReturnItem` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ReturnItem_companyId_idx` ON `ReturnItem`(`companyId`);

ALTER TABLE `ReturnFee` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ReturnFee_companyId_idx` ON `ReturnFee`(`companyId`);

ALTER TABLE `Attachment` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Attachment_companyId_idx` ON `Attachment`(`companyId`);

ALTER TABLE `Expense` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Expense_companyId_idx` ON `Expense`(`companyId`);

ALTER TABLE `ExpenseCategory` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ExpenseCategory_companyId_idx` ON `ExpenseCategory`(`companyId`);

ALTER TABLE `ExpenseTemplate` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `ExpenseTemplate_companyId_idx` ON `ExpenseTemplate`(`companyId`);

ALTER TABLE `Compensation` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Compensation_companyId_idx` ON `Compensation`(`companyId`);

ALTER TABLE `Settlement` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Settlement_companyId_idx` ON `Settlement`(`companyId`);

ALTER TABLE `SettlementItem` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `SettlementItem_companyId_idx` ON `SettlementItem`(`companyId`);

ALTER TABLE `CreditCard` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `CreditCard_companyId_idx` ON `CreditCard`(`companyId`);

ALTER TABLE `KartOdeme` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `KartOdeme_companyId_idx` ON `KartOdeme`(`companyId`);

ALTER TABLE `GecmisEkstre` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `GecmisEkstre_companyId_idx` ON `GecmisEkstre`(`companyId`);

ALTER TABLE `StockAdjustmentReason` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `StockAdjustmentReason_companyId_idx` ON `StockAdjustmentReason`(`companyId`);

ALTER TABLE `StokSayimi` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `StokSayimi_companyId_idx` ON `StokSayimi`(`companyId`);

ALTER TABLE `StokSayimSatiri` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `StokSayimSatiri_companyId_idx` ON `StokSayimSatiri`(`companyId`);

ALTER TABLE `MuhasebeDonemi` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `MuhasebeDonemi_companyId_idx` ON `MuhasebeDonemi`(`companyId`);

ALTER TABLE `AiOzet` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `AiOzet_companyId_idx` ON `AiOzet`(`companyId`);

ALTER TABLE `Role` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Role_companyId_idx` ON `Role`(`companyId`);

ALTER TABLE `RolePermission` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `RolePermission_companyId_idx` ON `RolePermission`(`companyId`);

ALTER TABLE `Finansman` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `Finansman_companyId_idx` ON `Finansman`(`companyId`);

ALTER TABLE `FinansmanHareketi` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `FinansmanHareketi_companyId_idx` ON `FinansmanHareketi`(`companyId`);

ALTER TABLE `FinansmanBirimFiyati` ADD COLUMN `companyId` VARCHAR(191) NULL;
CREATE INDEX `FinansmanBirimFiyati_companyId_idx` ON `FinansmanBirimFiyati`(`companyId`);

