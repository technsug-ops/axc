-- AlterTable
ALTER TABLE `ReturnNotice` ADD COLUMN `returnedVariantId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ReturnNotice` ADD CONSTRAINT `ReturnNotice_returnedVariantId_fkey` FOREIGN KEY (`returnedVariantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
