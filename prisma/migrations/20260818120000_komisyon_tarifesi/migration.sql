
-- AlterTable
ALTER TABLE `SaleItem` ADD COLUMN `commissionTarifeId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `KomisyonTarifesi` (
    `id` VARCHAR(191) NOT NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `pencereBaslangic` DATETIME(3) NOT NULL,
    `pencereBitis` DATETIME(3) NOT NULL,
    `tarifeGrubu` VARCHAR(191) NULL,
    `kaynakDosyaAdi` VARCHAR(191) NULL,
    `yuklemeSayisi` INTEGER NOT NULL DEFAULT 1,
    `yuklendiAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `KomisyonTarifesi_pencereBitis_idx`(`pencereBitis`),
    UNIQUE INDEX `KomisyonTarifesi_channelAccountId_pencereBaslangic_key`(`channelAccountId`, `pencereBaslangic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KomisyonTarifeKalemi` (
    `id` VARCHAR(191) NOT NULL,
    `tarifeId` VARCHAR(191) NOT NULL,
    `barkod` VARCHAR(191) NOT NULL,
    `saticiStokKodu` VARCHAR(191) NULL,
    `urunAdi` VARCHAR(191) NULL,
    `variantId` VARCHAR(191) NULL,
    `dilimSirasi` INTEGER NOT NULL,
    `altLimit` DECIMAL(18, 4) NULL,
    `ustLimit` DECIMAL(18, 4) NULL,
    `oran` DECIMAL(5, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KomisyonTarifeKalemi_variantId_idx`(`variantId`),
    INDEX `KomisyonTarifeKalemi_barkod_idx`(`barkod`),
    UNIQUE INDEX `KomisyonTarifeKalemi_tarifeId_barkod_dilimSirasi_key`(`tarifeId`, `barkod`, `dilimSirasi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SaleItem` ADD CONSTRAINT `SaleItem_commissionTarifeId_fkey` FOREIGN KEY (`commissionTarifeId`) REFERENCES `KomisyonTarifesi`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KomisyonTarifesi` ADD CONSTRAINT `KomisyonTarifesi_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KomisyonTarifeKalemi` ADD CONSTRAINT `KomisyonTarifeKalemi_tarifeId_fkey` FOREIGN KEY (`tarifeId`) REFERENCES `KomisyonTarifesi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KomisyonTarifeKalemi` ADD CONSTRAINT `KomisyonTarifeKalemi_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

