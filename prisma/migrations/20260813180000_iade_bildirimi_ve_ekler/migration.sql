-- AlterTable
ALTER TABLE `Return` ADD COLUMN `userId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `StockAdjustmentReason` ADD COLUMN `systemKey` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ReturnNotice` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `noticedAt` DATETIME(3) NOT NULL,
    `reason` ENUM('DEGISIM', 'DEGISIM_KUSURLU', 'CALISMIYOR', 'CAYMA', 'KULLANILMIS_ITIRAZ', 'YANLIS_URUN', 'DIGER') NOT NULL,
    `status` ENUM('BEKLENIYOR', 'MAL_GELDI', 'ITIRAZ_ACILDI', 'ITIRAZ_INCELEMEDE', 'ITIRAZ_KABUL', 'ITIRAZ_RED', 'KAPANDI', 'IPTAL') NOT NULL DEFAULT 'BEKLENIYOR',
    `note` TEXT NULL,
    `reservedVariantId` VARCHAR(191) NULL,
    `reservedQuantity` INTEGER NOT NULL DEFAULT 0,
    `returnId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ReturnNotice_returnId_key`(`returnId`),
    INDEX `ReturnNotice_saleId_idx`(`saleId`),
    INDEX `ReturnNotice_status_idx`(`status`),
    INDEX `ReturnNotice_noticedAt_idx`(`noticedAt`),
    INDEX `ReturnNotice_reservedVariantId_idx`(`reservedVariantId`),
    INDEX `ReturnNotice_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `blobPath` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,

    INDEX `Attachment_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `Attachment_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Return_userId_idx` ON `Return`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `StockAdjustmentReason_systemKey_key` ON `StockAdjustmentReason`(`systemKey`);

-- AddForeignKey
ALTER TABLE `Return` ADD CONSTRAINT `Return_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_reservedVariantId_fkey` FOREIGN KEY (`reservedVariantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_returnId_fkey` FOREIGN KEY (`returnId`) REFERENCES `Return`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
