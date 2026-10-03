-- ============================================================================
--  K303 AŞAMA 2 — ③ YABANCI ANAHTAR (zorunluluk Aşama 3 sonunda)
-- ----------------------------------------------------------------------------
--  Alan `Company`ye bağlanır. ZORUNLULUK (`NOT NULL`) BİLEREK BURADA DEĞİL:
--  kayıt oluşturan her kod satırı firma vermek zorunda kalırdı (ölçüldü: 295 tip
--  hatası, 131 dosya) ve Aşama 2'nin sözü «davranış değişmez» bozulurdu.
--  Firma istemcisi her yazımda doldurduğu bekçiyle kanıtlanınca Aşama 3'te.
--  `AuditLog`un yabancı anahtarı 13.08'den beri var — ona dokunulmaz.
--  «Sistemde tekil → firma içinde tekil» çevrimi BİLEREK burada DEĞİL:
--  koddaki tekil aramaları bozar; firma süzgeciyle birlikte Aşama 3'te.
--  Tablo adları şemadaki model adıyla HARF HARF (canlı MySQL harfe duyarlı).
--  YIKICI DEĞİLDİR: satır silinmez, sütun düşürülmez, veri dönüşmez.
-- ============================================================================

ALTER TABLE `Product` ADD CONSTRAINT `Product_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `VariantOption` ADD CONSTRAINT `VariantOption_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `EskiKod` ADD CONSTRAINT `EskiKod_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Category` ADD CONSTRAINT `Category_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Brand` ADD CONSTRAINT `Brand_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `TyKategoriEslesme` ADD CONSTRAINT `TyKategoriEslesme_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `DepoBolumu` ADD CONSTRAINT `DepoBolumu_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Location` ADD CONSTRAINT `Location_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Supplier` ADD CONSTRAINT `Supplier_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ChannelAccount` ADD CONSTRAINT `ChannelAccount_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ChannelSku` ADD CONSTRAINT `ChannelSku_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ChannelFee` ADD CONSTRAINT `ChannelFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PenaltyTariff` ADD CONSTRAINT `PenaltyTariff_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `KomisyonTarifesi` ADD CONSTRAINT `KomisyonTarifesi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `KomisyonTarifeKalemi` ADD CONSTRAINT `KomisyonTarifeKalemi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Sale` ADD CONSTRAINT `Sale_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SaleFee` ADD CONSTRAINT `SaleFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Return` ADD CONSTRAINT `Return_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ReturnFee` ADD CONSTRAINT `ReturnFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Expense` ADD CONSTRAINT `Expense_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ExpenseCategory` ADD CONSTRAINT `ExpenseCategory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `ExpenseTemplate` ADD CONSTRAINT `ExpenseTemplate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Compensation` ADD CONSTRAINT `Compensation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Settlement` ADD CONSTRAINT `Settlement_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CreditCard` ADD CONSTRAINT `CreditCard_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `GecmisEkstre` ADD CONSTRAINT `GecmisEkstre_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StockAdjustmentReason` ADD CONSTRAINT `StockAdjustmentReason_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StokSayimi` ADD CONSTRAINT `StokSayimi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `StokSayimSatiri` ADD CONSTRAINT `StokSayimSatiri_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `MuhasebeDonemi` ADD CONSTRAINT `MuhasebeDonemi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AiOzet` ADD CONSTRAINT `AiOzet_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Role` ADD CONSTRAINT `Role_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Finansman` ADD CONSTRAINT `Finansman_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `FinansmanBirimFiyati` ADD CONSTRAINT `FinansmanBirimFiyati_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

