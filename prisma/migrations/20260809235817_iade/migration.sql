-- Faz 2 / Asama 3 — iade akisi
--
-- RETURN_IN ve EXCHANGE_OUT hareket tipleri, Return/ReturnItem/ReturnFee,
-- ceza tarifesi (PenaltyTariff) ve kanal iade politikasi.
-- TAMAMEN EK: hic DROP COLUMN / DROP TABLE yok.
-- AlterTable
ALTER TABLE `channel` ADD COLUMN `disputedReshipPaidBySeller` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `stockmovement` ADD COLUMN `returnItemId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'EXCHANGE_OUT', 'ADJUSTMENT', 'COUNT_CORRECTION') NOT NULL;

-- CreateTable
CREATE TABLE `PenaltyTariff` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `orderAmountUpTo` DECIMAL(18, 4) NOT NULL,
    `amount` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `effectiveFrom` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PenaltyTariff_channelId_orderAmountUpTo_idx`(`channelId`, `orderAmountUpTo`),
    UNIQUE INDEX `PenaltyTariff_channelId_orderAmountUpTo_effectiveFrom_key`(`channelId`, `orderAmountUpTo`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Return` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `returnType` ENUM('UNDELIVERED', 'NORMAL', 'DISPUTED') NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `returnCargoAmount` DECIMAL(18, 4) NULL,
    `reshipCargoAmount` DECIMAL(18, 4) NULL,
    `cargoCurrency` ENUM('TRY', 'EUR') NULL,
    `penaltyAmount` DECIMAL(18, 4) NULL,
    `penaltyCurrency` ENUM('TRY', 'EUR') NULL,
    `penaltyNote` TEXT NULL,
    `net1Amount` DECIMAL(18, 4) NULL,
    `net2Amount` DECIMAL(18, 4) NULL,
    `profitCurrency` ENUM('TRY', 'EUR') NULL,
    `profitStatus` ENUM('CALCULATED', 'NO_COST', 'CURRENCY_MISMATCH', 'RULE_MISSING') NULL,
    `calculatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Return_saleId_idx`(`saleId`),
    INDEX `Return_occurredAt_idx`(`occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnItem` (
    `id` VARCHAR(191) NOT NULL,
    `returnId` VARCHAR(191) NOT NULL,
    `saleItemId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `soundQuantity` INTEGER NOT NULL DEFAULT 0,
    `damagedQuantity` INTEGER NOT NULL DEFAULT 0,
    `damageNote` TEXT NULL,
    `locationId` VARCHAR(191) NULL,
    `exchangeVariantId` VARCHAR(191) NULL,

    INDEX `ReturnItem_returnId_idx`(`returnId`),
    INDEX `ReturnItem_saleItemId_idx`(`saleItemId`),
    INDEX `ReturnItem_variantId_idx`(`variantId`),
    INDEX `ReturnItem_locationId_idx`(`locationId`),
    INDEX `ReturnItem_exchangeVariantId_idx`(`exchangeVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReturnFee` (
    `id` VARCHAR(191) NOT NULL,
    `returnId` VARCHAR(191) NOT NULL,
    `returnItemId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `amount` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReturnFee_returnId_idx`(`returnId`),
    INDEX `ReturnFee_returnItemId_idx`(`returnItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StockMovement_returnItemId_idx` ON `StockMovement`(`returnItemId`);

-- AddForeignKey
ALTER TABLE `PenaltyTariff` ADD CONSTRAINT `PenaltyTariff_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_returnItemId_fkey` FOREIGN KEY (`returnItemId`) REFERENCES `ReturnItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Return` ADD CONSTRAINT `Return_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `SaleItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnItem` ADD CONSTRAINT `ReturnItem_exchangeVariantId_fkey` FOREIGN KEY (`exchangeVariantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnFee` ADD CONSTRAINT `ReturnFee_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnFee` ADD CONSTRAINT `ReturnFee_returnItemId_fkey` FOREIGN KEY (`returnItemId`) REFERENCES `ReturnItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

