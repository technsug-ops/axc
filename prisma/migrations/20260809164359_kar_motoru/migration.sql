-- Faz 2 / Aşama 2 — kâr motoru altyapısı
--
-- Kategori + KDV · kanal kesinti kuralları · kargo tarifesi ·
-- kâr snapshot alanları · axcaliSku -> companySku yeniden adlandırma.
--
-- companySku yeniden adlandırması ELLE yazıldı (aşağıda not var).
-- Migration öncesi mysqldump yedeği alındı.

-- DropIndex
DROP INDEX `ProductVariant_axcaliSku_key` ON `productvariant`;

-- AlterTable
ALTER TABLE `channelsku` ADD COLUMN `commissionRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `commissionUpdatedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `product` ADD COLUMN `categoryId` VARCHAR(191) NULL,
    ADD COLUMN `desi` DECIMAL(9, 3) NULL,
    ADD COLUMN `vatRateOverride` DECIMAL(5, 2) NULL;

-- AlterTable
-- ELLE DÜZELTİLDİ: Prisma burada DROP COLUMN + ADD COLUMN üretiyordu.
-- O biçim Firma SKU verisinin TAMAMINI siler ve dolu tabloda NOT NULL
-- kolon eklemeye çalıştığı için zaten hata verirdi.
-- CHANGE ile kolon YENİDEN ADLANDIRILIR, veri yerinde kalır.
ALTER TABLE `productvariant` CHANGE `axcaliSku` `companySku` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `sale` ADD COLUMN `calculatedAt` DATETIME(3) NULL,
    ADD COLUMN `cargoAmount` DECIMAL(18, 4) NULL,
    ADD COLUMN `cargoCarrierId` VARCHAR(191) NULL,
    ADD COLUMN `cargoCurrency` ENUM('TRY', 'EUR') NULL,
    ADD COLUMN `cargoDesi` DECIMAL(9, 3) NULL,
    ADD COLUMN `net1Amount` DECIMAL(18, 4) NULL,
    ADD COLUMN `net2Amount` DECIMAL(18, 4) NULL,
    ADD COLUMN `profitCurrency` ENUM('TRY', 'EUR') NULL,
    ADD COLUMN `profitStatus` ENUM('CALCULATED', 'NO_COST', 'CURRENCY_MISMATCH', 'RULE_MISSING') NULL;

-- AlterTable
ALTER TABLE `saleitem` ADD COLUMN `commissionRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `net1Amount` DECIMAL(18, 4) NULL,
    ADD COLUMN `net2Amount` DECIMAL(18, 4) NULL,
    ADD COLUMN `profitStatus` ENUM('CALCULATED', 'NO_COST', 'CURRENCY_MISMATCH', 'RULE_MISSING') NULL,
    ADD COLUMN `vatRate` DECIMAL(5, 2) NULL;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vatRate` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    INDEX `Category_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelFee` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `scope` ENUM('PER_SALE', 'PER_ITEM') NOT NULL,
    `basis` ENUM('SALE_AMOUNT', 'COMMISSION_AMOUNT', 'FIXED') NOT NULL,
    `rate` DECIMAL(9, 5) NULL,
    `amount` DECIMAL(18, 4) NULL,
    `currency` ENUM('TRY', 'EUR') NULL,
    `validFrom` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelFee_channelId_isActive_idx`(`channelId`, `isActive`),
    UNIQUE INDEX `ChannelFee_channelId_code_validFrom_key`(`channelId`, `code`, `validFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CargoCarrier` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CargoCarrier_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CargoTariff` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `carrierId` VARCHAR(191) NOT NULL,
    `desi` INTEGER NOT NULL,
    `amount` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `effectiveFrom` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CargoTariff_channelId_carrierId_desi_idx`(`channelId`, `carrierId`, `desi`),
    UNIQUE INDEX `CargoTariff_channelId_carrierId_desi_effectiveFrom_key`(`channelId`, `carrierId`, `desi`, `effectiveFrom`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SaleFee` (
    `id` VARCHAR(191) NOT NULL,
    `saleId` VARCHAR(191) NOT NULL,
    `saleItemId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `amount` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SaleFee_saleId_idx`(`saleId`),
    INDEX `SaleFee_saleItemId_idx`(`saleItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_categoryId_idx` ON `Product`(`categoryId`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductVariant_companySku_key` ON `ProductVariant`(`companySku`);

-- CreateIndex
CREATE INDEX `Sale_cargoCarrierId_idx` ON `Sale`(`cargoCarrierId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelFee` ADD CONSTRAINT `ChannelFee_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CargoTariff` ADD CONSTRAINT `CargoTariff_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CargoTariff` ADD CONSTRAINT `CargoTariff_carrierId_fkey` FOREIGN KEY (`carrierId`) REFERENCES `CargoCarrier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_cargoCarrierId_fkey` FOREIGN KEY (`cargoCarrierId`) REFERENCES `CargoCarrier`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleFee` ADD CONSTRAINT `SaleFee_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SaleFee` ADD CONSTRAINT `SaleFee_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `SaleItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
