-- K303 Aşama 3d (03.10.2026): «sistemde tekil» → «firma içinde tekil».
-- Yalnız dizin değişir; veri DEĞİŞMEZ. Tek firmada çakışma imkânsız (eski tekillik zaten tutuyordu).
-- Üç kanal tablosunda FK sil/kur: eski tekil dizin kalkabilsin diye; kanal dizinleri ayrıca mevcut.
-- DropForeignKey
ALTER TABLE `PenaltyTariff` DROP FOREIGN KEY `PenaltyTariff_channelId_fkey`;

-- DropForeignKey
ALTER TABLE `ChannelFee` DROP FOREIGN KEY `ChannelFee_channelId_fkey`;

-- DropForeignKey
ALTER TABLE `ChannelAccount` DROP FOREIGN KEY `ChannelAccount_channelId_fkey`;

-- DropIndex
DROP INDEX `Category_name_key` ON `Category`;

-- DropIndex
DROP INDEX `Category_code_key` ON `Category`;

-- DropIndex
DROP INDEX `EskiKod_kod_key` ON `EskiKod`;

-- DropIndex
DROP INDEX `Brand_anahtar_key` ON `Brand`;

-- DropIndex
DROP INDEX `Brand_code_key` ON `Brand`;

-- DropIndex
DROP INDEX `TyKategoriEslesme_tyKategori_key` ON `TyKategoriEslesme`;

-- DropIndex
DROP INDEX `ProductVariant_sku_key` ON `ProductVariant`;

-- DropIndex
DROP INDEX `ProductVariant_barcode_key` ON `ProductVariant`;

-- DropIndex
DROP INDEX `ProductVariant_companySku_key` ON `ProductVariant`;

-- DropIndex
DROP INDEX `DepoBolumu_kisaltma_key` ON `DepoBolumu`;

-- DropIndex
DROP INDEX `Location_code_key` ON `Location`;

-- DropIndex
DROP INDEX `PenaltyTariff_channelId_orderAmountUpTo_effectiveFrom_key` ON `PenaltyTariff`;

-- DropIndex
DROP INDEX `ChannelFee_channelId_code_validFrom_key` ON `ChannelFee`;

-- DropIndex
DROP INDEX `ChannelAccount_channelId_code_key` ON `ChannelAccount`;

-- DropIndex
DROP INDEX `Purchase_code_key` ON `Purchase`;

-- DropIndex
DROP INDEX `Sale_code_key` ON `Sale`;

-- DropIndex
DROP INDEX `Sale_shipmentCode_key` ON `Sale`;

-- DropIndex
DROP INDEX `ExpenseCategory_name_key` ON `ExpenseCategory`;

-- DropIndex
DROP INDEX `Supplier_name_key` ON `Supplier`;

-- DropIndex
DROP INDEX `Supplier_code_key` ON `Supplier`;

-- DropIndex
DROP INDEX `StockAdjustmentReason_name_key` ON `StockAdjustmentReason`;

-- DropIndex
DROP INDEX `StockAdjustmentReason_systemKey_key` ON `StockAdjustmentReason`;

-- DropIndex
DROP INDEX `Role_name_key` ON `Role`;

-- DropIndex
DROP INDEX `Talep_kod_key` ON `Talep`;

-- DropIndex
DROP INDEX `StokSayimi_kod_key` ON `StokSayimi`;

-- DropIndex
DROP INDEX `MuhasebeDonemi_yil_ay_key` ON `MuhasebeDonemi`;

-- CreateIndex
CREATE UNIQUE INDEX `Category_companyId_name_key` ON `Category`(`companyId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Category_companyId_code_key` ON `Category`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `EskiKod_companyId_kod_key` ON `EskiKod`(`companyId`, `kod`);

-- CreateIndex
CREATE UNIQUE INDEX `Brand_companyId_anahtar_key` ON `Brand`(`companyId`, `anahtar`);

-- CreateIndex
CREATE UNIQUE INDEX `Brand_companyId_code_key` ON `Brand`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `TyKategoriEslesme_companyId_tyKategori_key` ON `TyKategoriEslesme`(`companyId`, `tyKategori`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_companyId_sku_key` ON `ProductVariant`(`companyId`, `sku`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_companyId_barcode_key` ON `ProductVariant`(`companyId`, `barcode`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_companyId_companySku_key` ON `ProductVariant`(`companyId`, `companySku`);

-- CreateIndex
CREATE UNIQUE INDEX `DepoBolumu_companyId_kisaltma_key` ON `DepoBolumu`(`companyId`, `kisaltma`);

-- CreateIndex
CREATE UNIQUE INDEX `Location_companyId_code_key` ON `Location`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `PenaltyTariff_companyId_channelId_orderAmountUpTo_effectiveF_key` ON `PenaltyTariff`(`companyId`, `channelId`, `orderAmountUpTo`, `effectiveFrom`);

-- CreateIndex
CREATE UNIQUE INDEX `ChannelFee_companyId_channelId_code_validFrom_key` ON `ChannelFee`(`companyId`, `channelId`, `code`, `validFrom`);

-- CreateIndex
CREATE UNIQUE INDEX `ChannelAccount_companyId_channelId_code_key` ON `ChannelAccount`(`companyId`, `channelId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `Purchase_companyId_code_key` ON `Purchase`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `Sale_companyId_code_key` ON `Sale`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `Sale_companyId_shipmentCode_key` ON `Sale`(`companyId`, `shipmentCode`);

-- CreateIndex
CREATE UNIQUE INDEX `ExpenseCategory_companyId_name_key` ON `ExpenseCategory`(`companyId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Supplier_companyId_name_key` ON `Supplier`(`companyId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Supplier_companyId_code_key` ON `Supplier`(`companyId`, `code`);

-- CreateIndex
CREATE UNIQUE INDEX `StockAdjustmentReason_companyId_name_key` ON `StockAdjustmentReason`(`companyId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `StockAdjustmentReason_companyId_systemKey_key` ON `StockAdjustmentReason`(`companyId`, `systemKey`);

-- CreateIndex
CREATE UNIQUE INDEX `Role_companyId_name_key` ON `Role`(`companyId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Talep_companyId_kod_key` ON `Talep`(`companyId`, `kod`);

-- CreateIndex
CREATE UNIQUE INDEX `StokSayimi_companyId_kod_key` ON `StokSayimi`(`companyId`, `kod`);

-- CreateIndex
CREATE UNIQUE INDEX `MuhasebeDonemi_companyId_yil_ay_key` ON `MuhasebeDonemi`(`companyId`, `yil`, `ay`);

-- AddForeignKey
ALTER TABLE `PenaltyTariff` ADD CONSTRAINT `PenaltyTariff_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelFee` ADD CONSTRAINT `ChannelFee_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelAccount` ADD CONSTRAINT `ChannelAccount_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
