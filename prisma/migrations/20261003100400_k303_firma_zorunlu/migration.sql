-- K303 Aşama 3e (03.10.2026): firmaya ait 46 tabloda firma alanı BOŞ OLAMAZ.
-- Yol: veritabanı kuralı (CHECK). Prisma alanı isteğe bağlı kalır — firmayı
-- süzgeç yazar; bu kural, süzgeç bir gün atlanırsa firmasız satırı REDDEDER.
-- Ön şart (MySQL ve MariaDB, ölçüldü): ON UPDATE CASCADE olan alana CHECK
-- konamaz (MariaDB hata 1901). Firma kimliği hiç değişmediği için bağlantı
-- RESTRICT'e çevrilir — Prisma bunu bağlantıyı silip yeniden kurarak yapar.
-- AuditLog HARİÇ: oturum açılmadan önceki giriş izinin firması yoktur.
-- UserCompanyRole ve Talep zaten NOT NULL.
-- Prisma CHECK kurallarını yönetmez; ileriki migration'larda dokunmaz.

-- DropForeignKey
ALTER TABLE `Product` DROP FOREIGN KEY `Product_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Category` DROP FOREIGN KEY `Category_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `EskiKod` DROP FOREIGN KEY `EskiKod_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Brand` DROP FOREIGN KEY `Brand_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `TyKategoriEslesme` DROP FOREIGN KEY `TyKategoriEslesme_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductVariant` DROP FOREIGN KEY `ProductVariant_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `VariantOption` DROP FOREIGN KEY `VariantOption_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `DepoBolumu` DROP FOREIGN KEY `DepoBolumu_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Location` DROP FOREIGN KEY `Location_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `PenaltyTariff` DROP FOREIGN KEY `PenaltyTariff_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ChannelFee` DROP FOREIGN KEY `ChannelFee_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ChannelAccount` DROP FOREIGN KEY `ChannelAccount_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ChannelSku` DROP FOREIGN KEY `ChannelSku_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `CreditCard` DROP FOREIGN KEY `CreditCard_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `KartOdeme` DROP FOREIGN KEY `KartOdeme_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Finansman` DROP FOREIGN KEY `Finansman_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `FinansmanHareketi` DROP FOREIGN KEY `FinansmanHareketi_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `FinansmanBirimFiyati` DROP FOREIGN KEY `FinansmanBirimFiyati_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Purchase` DROP FOREIGN KEY `Purchase_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `PurchaseItem` DROP FOREIGN KEY `PurchaseItem_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `StockMovement` DROP FOREIGN KEY `StockMovement_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Sale` DROP FOREIGN KEY `Sale_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `SaleItem` DROP FOREIGN KEY `SaleItem_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `SaleFee` DROP FOREIGN KEY `SaleFee_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Return` DROP FOREIGN KEY `Return_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ReturnNotice` DROP FOREIGN KEY `ReturnNotice_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Attachment` DROP FOREIGN KEY `Attachment_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ReturnItem` DROP FOREIGN KEY `ReturnItem_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ReturnFee` DROP FOREIGN KEY `ReturnFee_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ExpenseCategory` DROP FOREIGN KEY `ExpenseCategory_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Expense` DROP FOREIGN KEY `Expense_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Supplier` DROP FOREIGN KEY `Supplier_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Settlement` DROP FOREIGN KEY `Settlement_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `SettlementItem` DROP FOREIGN KEY `SettlementItem_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Compensation` DROP FOREIGN KEY `Compensation_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `ExpenseTemplate` DROP FOREIGN KEY `ExpenseTemplate_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `StockAdjustmentReason` DROP FOREIGN KEY `StockAdjustmentReason_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `Role` DROP FOREIGN KEY `Role_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `RolePermission` DROP FOREIGN KEY `RolePermission_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `GecmisEkstre` DROP FOREIGN KEY `GecmisEkstre_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `KomisyonTarifesi` DROP FOREIGN KEY `KomisyonTarifesi_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `KomisyonTarifeKalemi` DROP FOREIGN KEY `KomisyonTarifeKalemi_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `StokSayimi` DROP FOREIGN KEY `StokSayimi_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `StokSayimSatiri` DROP FOREIGN KEY `StokSayimSatiri_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `MuhasebeDonemi` DROP FOREIGN KEY `MuhasebeDonemi_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `AiOzet` DROP FOREIGN KEY `AiOzet_companyId_fkey`;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `EskiKod` ADD CONSTRAINT `EskiKod_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `TyKategoriEslesme` ADD CONSTRAINT `TyKategoriEslesme_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `VariantOption` ADD CONSTRAINT `VariantOption_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `DepoBolumu` ADD CONSTRAINT `DepoBolumu_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PenaltyTariff` ADD CONSTRAINT `PenaltyTariff_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ChannelFee` ADD CONSTRAINT `ChannelFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ChannelAccount` ADD CONSTRAINT `ChannelAccount_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ChannelSku` ADD CONSTRAINT `ChannelSku_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Finansman` ADD CONSTRAINT `Finansman_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `FinansmanBirimFiyati` ADD CONSTRAINT `FinansmanBirimFiyati_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SaleFee` ADD CONSTRAINT `SaleFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Return` ADD CONSTRAINT `Return_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ReturnFee` ADD CONSTRAINT `ReturnFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExpenseCategory` ADD CONSTRAINT `ExpenseCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Compensation` ADD CONSTRAINT `Compensation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ExpenseTemplate` ADD CONSTRAINT `ExpenseTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StockAdjustmentReason` ADD CONSTRAINT `StockAdjustmentReason_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `Role_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `GecmisEkstre` ADD CONSTRAINT `GecmisEkstre_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `KomisyonTarifesi` ADD CONSTRAINT `KomisyonTarifesi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `KomisyonTarifeKalemi` ADD CONSTRAINT `KomisyonTarifeKalemi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StokSayimi` ADD CONSTRAINT `StokSayimi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StokSayimSatiri` ADD CONSTRAINT `StokSayimSatiri_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `MuhasebeDonemi` ADD CONSTRAINT `MuhasebeDonemi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AiOzet` ADD CONSTRAINT `AiOzet_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Firma boş olamaz (CHECK)
ALTER TABLE `Product` ADD CONSTRAINT `Product_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Category` ADD CONSTRAINT `Category_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `EskiKod` ADD CONSTRAINT `EskiKod_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Brand` ADD CONSTRAINT `Brand_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `TyKategoriEslesme` ADD CONSTRAINT `TyKategoriEslesme_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `VariantOption` ADD CONSTRAINT `VariantOption_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `DepoBolumu` ADD CONSTRAINT `DepoBolumu_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Location` ADD CONSTRAINT `Location_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `PenaltyTariff` ADD CONSTRAINT `PenaltyTariff_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ChannelFee` ADD CONSTRAINT `ChannelFee_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ChannelAccount` ADD CONSTRAINT `ChannelAccount_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ChannelSku` ADD CONSTRAINT `ChannelSku_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Finansman` ADD CONSTRAINT `Finansman_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `FinansmanBirimFiyati` ADD CONSTRAINT `FinansmanBirimFiyati_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `SaleFee` ADD CONSTRAINT `SaleFee_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Return` ADD CONSTRAINT `Return_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ReturnFee` ADD CONSTRAINT `ReturnFee_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ExpenseCategory` ADD CONSTRAINT `ExpenseCategory_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Expense` ADD CONSTRAINT `Expense_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Compensation` ADD CONSTRAINT `Compensation_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `ExpenseTemplate` ADD CONSTRAINT `ExpenseTemplate_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `StockAdjustmentReason` ADD CONSTRAINT `StockAdjustmentReason_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `Role` ADD CONSTRAINT `Role_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `GecmisEkstre` ADD CONSTRAINT `GecmisEkstre_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `KomisyonTarifesi` ADD CONSTRAINT `KomisyonTarifesi_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `KomisyonTarifeKalemi` ADD CONSTRAINT `KomisyonTarifeKalemi_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `StokSayimi` ADD CONSTRAINT `StokSayimi_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `StokSayimSatiri` ADD CONSTRAINT `StokSayimSatiri_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `MuhasebeDonemi` ADD CONSTRAINT `MuhasebeDonemi_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
ALTER TABLE `AiOzet` ADD CONSTRAINT `AiOzet_companyId_zorunlu` CHECK (`companyId` IS NOT NULL);
