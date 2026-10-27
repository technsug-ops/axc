-- K366: Buybox fiyat kuralı — firma geneli ayar (Company'ye 5 kolon, hepsi varsayılanlı: mevcut satır değişmez) + ürüne ayrı kural tablosu. Veri yazmaz, siler ya da taşımaz.
-- AlterTable
ALTER TABLE `Company` ADD COLUMN `buyboxAdimAmount` DECIMAL(18, 4) NOT NULL DEFAULT 50,
    ADD COLUMN `buyboxAdimCurrency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    ADD COLUMN `buyboxMaliyet` ENUM('EN_DUSUK', 'ORTALAMA', 'EN_YUKSEK') NOT NULL DEFAULT 'EN_DUSUK',
    ADD COLUMN `buyboxMinMarj` DECIMAL(5, 2) NOT NULL DEFAULT 6,
    ADD COLUMN `buyboxMod` ENUM('ONAYLI', 'OTOMATIK') NOT NULL DEFAULT 'ONAYLI';

-- CreateTable
CREATE TABLE `BuyboxKurali` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `minMarj` DECIMAL(5, 2) NULL,
    `adimAmount` DECIMAL(18, 4) NULL,
    `adimCurrency` ENUM('TRY', 'EUR') NULL,
    `maliyet` ENUM('EN_DUSUK', 'ORTALAMA', 'EN_YUKSEK') NULL,
    `mod` ENUM('ONAYLI', 'OTOMATIK') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BuyboxKurali_variantId_key`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BuyboxKurali` ADD CONSTRAINT `BuyboxKurali_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

