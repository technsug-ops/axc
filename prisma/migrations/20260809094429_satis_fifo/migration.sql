-- AlterTable
ALTER TABLE `stockmovement` ADD COLUMN `saleItemId` VARCHAR(191) NULL,
    ADD COLUMN `sourceMovementId` VARCHAR(191) NULL,
    MODIFY `type` ENUM('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'ADJUSTMENT', 'COUNT_CORRECTION') NOT NULL;

-- CreateTable
CREATE TABLE `Sale` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `soldAt` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sale_code_key`(`code`),
    INDEX `Sale_channelAccountId_idx`(`channelAccountId`),
    INDEX `Sale_soldAt_idx`(`soldAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleItem` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPriceAmount` DECIMAL(18, 4) NOT NULL,
    `unitPriceCurrency` ENUM('TRY', 'EUR') NOT NULL,

    INDEX `SaleItem_saleId_idx`(`saleId`),
    INDEX `SaleItem_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StockMovement_saleItemId_idx` ON `StockMovement`(`saleItemId`);

-- CreateIndex
CREATE INDEX `StockMovement_sourceMovementId_idx` ON `StockMovement`(`sourceMovementId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `SaleItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_sourceMovementId_fkey` FOREIGN KEY (`sourceMovementId`) REFERENCES `StockMovement`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
