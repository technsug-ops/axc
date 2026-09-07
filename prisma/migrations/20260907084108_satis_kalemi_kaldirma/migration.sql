-- AlterTable
ALTER TABLE `SaleItem` ADD COLUMN `kaldirildiAt` DATETIME(3) NULL,
    ADD COLUMN `kaldirmaSebebi` ENUM('MUKERRER_SATIR', 'HATALI_GIRIS') NULL;

-- CreateIndex
CREATE INDEX `SaleItem_kaldirildiAt_idx` ON `SaleItem`(`kaldirildiAt`);
