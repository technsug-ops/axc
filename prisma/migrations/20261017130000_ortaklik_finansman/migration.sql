-- AlterTable
ALTER TABLE `Finansman` ADD COLUMN `ortaklikKatilimiId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Finansman_ortaklikKatilimiId_idx` ON `Finansman`(`ortaklikKatilimiId`);

-- AddForeignKey
ALTER TABLE `Finansman` ADD CONSTRAINT `Finansman_ortaklikKatilimiId_fkey` FOREIGN KEY (`ortaklikKatilimiId`) REFERENCES `OrtaklikKatilimi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
