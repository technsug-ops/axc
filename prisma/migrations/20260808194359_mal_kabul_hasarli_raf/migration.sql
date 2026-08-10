-- AlterTable
ALTER TABLE `Purchase` MODIFY `status` ENUM('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `PurchaseItem` ADD COLUMN `damageNote` TEXT NULL,
    ADD COLUMN `damagedQuantity` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `locationId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `StockMovement_locationId_idx` ON `StockMovement`(`locationId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
