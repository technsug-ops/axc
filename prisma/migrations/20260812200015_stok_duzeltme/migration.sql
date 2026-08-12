-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `adjustmentReasonId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StockAdjustmentReason` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `movementType` ENUM('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'EXCHANGE_OUT', 'ADJUSTMENT', 'COUNT_CORRECTION') NOT NULL DEFAULT 'ADJUSTMENT',
    `requiresNote` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StockAdjustmentReason_name_key`(`name`),
    INDEX `StockAdjustmentReason_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StockMovement_adjustmentReasonId_idx` ON `StockMovement`(`adjustmentReasonId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_adjustmentReasonId_fkey` FOREIGN KEY (`adjustmentReasonId`) REFERENCES `StockAdjustmentReason`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
