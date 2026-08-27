-- AlterTable
ALTER TABLE `StockMovement` ADD COLUMN `sayimSatiriId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `StokSayimi` (
    `id` VARCHAR(191) NOT NULL,
    `kod` VARCHAR(191) NOT NULL,
    `sayimGunu` DATETIME(3) NOT NULL,
    `kapsamTuru` ENUM('TUM_STOK', 'LISTE', 'RAF') NOT NULL,
    `acilisAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `kapanisAt` DATETIME(3) NULL,
    `yazimAt` DATETIME(3) NULL,
    `iptalAt` DATETIME(3) NULL,
    `userId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StokSayimi_kod_key`(`kod`),
    INDEX `StokSayimi_sayimGunu_idx`(`sayimGunu`),
    INDEX `StokSayimi_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StokSayimSatiri` (
    `id` VARCHAR(191) NOT NULL,
    `sayimId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `sayilanAdet` INTEGER NULL,
    `kapsamdaydi` BOOLEAN NOT NULL DEFAULT true,
    `duzeltmeYazildiAt` DATETIME(3) NULL,
    `damgaSistemAdedi` INTEGER NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StokSayimSatiri_variantId_idx`(`variantId`),
    UNIQUE INDEX `StokSayimSatiri_sayimId_variantId_key`(`sayimId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `StockMovement_sayimSatiriId_idx` ON `StockMovement`(`sayimSatiriId`);

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_sayimSatiriId_fkey` FOREIGN KEY (`sayimSatiriId`) REFERENCES `StokSayimSatiri`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StokSayimi` ADD CONSTRAINT `StokSayimi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StokSayimSatiri` ADD CONSTRAINT `StokSayimSatiri_sayimId_fkey` FOREIGN KEY (`sayimId`) REFERENCES `StokSayimi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StokSayimSatiri` ADD CONSTRAINT `StokSayimSatiri_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
