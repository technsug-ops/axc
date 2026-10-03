-- ============================================================================
--  K303 AŞAMA 2 — ② GERİ DOLDURMA
-- ----------------------------------------------------------------------------
--  Bütün satırlar TEK firmaya bağlanır. Alt sorgu BİLEREK `LIMIT` taşımaz:
--  sistemde birden fazla firma varsa MySQL «Subquery returns more than 1 row»
--  der ve migration DURUR — hiçbir satır yanlış firmaya yazılamaz. Firma
--  yoksa alan boş kalır ve ③ (`NOT NULL`) durur.
--  Geri alma ölçütü yeniden hesaplanabilir: `companyId = <o firma>` → `NULL`.
--  `AuditLog.companyId` 28.09 ölçümünde 76.310/76.310 BOŞTU (yazıcısı geçirmiyordu).
--  Tablo adları şemadaki model adıyla HARF HARF (canlı MySQL harfe duyarlı).
--  YIKICI DEĞİLDİR: satır silinmez, sütun düşürülmez, veri dönüşmez.
-- ============================================================================

UPDATE `Product` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ProductVariant` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `VariantOption` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `EskiKod` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Category` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Brand` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `TyKategoriEslesme` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `DepoBolumu` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Location` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Supplier` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ChannelAccount` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ChannelSku` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ChannelFee` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `PenaltyTariff` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `KomisyonTarifesi` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `KomisyonTarifeKalemi` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Purchase` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `PurchaseItem` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `StockMovement` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Sale` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `SaleItem` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `SaleFee` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Return` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ReturnNotice` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ReturnItem` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ReturnFee` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Attachment` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Expense` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ExpenseCategory` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `ExpenseTemplate` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Compensation` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Settlement` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `SettlementItem` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `CreditCard` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `KartOdeme` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `GecmisEkstre` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `StockAdjustmentReason` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `StokSayimi` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `StokSayimSatiri` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `MuhasebeDonemi` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `AiOzet` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Role` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `RolePermission` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `Finansman` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `FinansmanHareketi` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `FinansmanBirimFiyati` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
UPDATE `AuditLog` SET `companyId` = (SELECT `id` FROM `Company`) WHERE `companyId` IS NULL;
