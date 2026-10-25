-- K363 Faz 3-b: Buybox istatistiği (saatlik ölçüm sayıları + ürün bazında durum değişimi) — iki yeni tablo, mevcut tablolara dokunmaz
-- CreateTable
CREATE TABLE `BuyboxOlcumu` (
    `id` VARCHAR(191) NOT NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `olculduAt` DATETIME(3) NOT NULL,
    `incelenen` INTEGER NOT NULL,
    `birinci` INTEGER NOT NULL,
    `kaybedilen` INTEGER NOT NULL,
    `gorunmuyor` INTEGER NOT NULL,
    `sorgulanamadi` INTEGER NOT NULL,
    `rakipli` INTEGER NOT NULL,
    `rakipliBirinci` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BuyboxOlcumu_channelAccountId_olculduAt_idx`(`channelAccountId`, `olculduAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuyboxDegisimi` (
    `id` VARCHAR(191) NOT NULL,
    `olcumId` VARCHAR(191) NOT NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `olculduAt` DATETIME(3) NOT NULL,
    `oncekiDurum` ENUM('BIRINCI', 'KAYBEDILDI', 'GORUNMUYOR') NULL,
    `yeniDurum` ENUM('BIRINCI', 'KAYBEDILDI', 'GORUNMUYOR') NOT NULL,
    `siramiz` INTEGER NULL,
    `bizimFiyatAmount` DECIMAL(18, 4) NULL,
    `buyboxFiyatAmount` DECIMAL(18, 4) NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL,
    `buyboxSaticisi` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BuyboxDegisimi_channelAccountId_variantId_olculduAt_idx`(`channelAccountId`, `variantId`, `olculduAt`),
    INDEX `BuyboxDegisimi_olculduAt_idx`(`olculduAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BuyboxOlcumu` ADD CONSTRAINT `BuyboxOlcumu_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyboxDegisimi` ADD CONSTRAINT `BuyboxDegisimi_olcumId_fkey` FOREIGN KEY (`olcumId`) REFERENCES `BuyboxOlcumu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyboxDegisimi` ADD CONSTRAINT `BuyboxDegisimi_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyboxDegisimi` ADD CONSTRAINT `BuyboxDegisimi_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
