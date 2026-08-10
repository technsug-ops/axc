-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `channelAccountId` VARCHAR(191) NULL,
    ADD COLUMN `installmentCount` INTEGER NOT NULL DEFAULT 1,
    MODIFY `goodsAmount` DECIMAL(18, 4) NULL,
    MODIFY `goodsCurrency` ENUM('TRY', 'EUR') NULL;

-- CreateIndex
CREATE INDEX `Purchase_channelAccountId_idx` ON `Purchase`(`channelAccountId`);

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
