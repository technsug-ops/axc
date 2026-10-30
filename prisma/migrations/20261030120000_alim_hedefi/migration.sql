-- K363 Faz 3-d: alım fırsatı takibi — yeni tablo (varyant başına hedef alış fiyatı + son okunan TY/HB fiyatı). Mevcut tablolara dokunmaz, veri yazmaz/silmez.
-- CreateTable
CREATE TABLE `AlimHedefi` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `hedefAmount` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `sonKontrolAt` DATETIME(3) NULL,
    `tyFiyatAmount` DECIMAL(18, 4) NULL,
    `hbFiyatAmount` DECIMAL(18, 4) NULL,
    `sonAltindaAt` DATETIME(3) NULL,
    `sonAltindaAmount` DECIMAL(18, 4) NULL,
    `sonAltindaKanal` VARCHAR(2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AlimHedefi_variantId_key`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AlimHedefi` ADD CONSTRAINT `AlimHedefi_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
