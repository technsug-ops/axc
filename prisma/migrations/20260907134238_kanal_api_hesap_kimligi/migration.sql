-- AlterTable
ALTER TABLE `ChannelAccount` ADD COLUMN `apiHesapKimligi` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `ChannelAccount_apiHesapKimligi_idx` ON `ChannelAccount`(`apiHesapKimligi`);
