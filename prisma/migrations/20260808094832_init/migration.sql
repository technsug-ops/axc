-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `brand` VARCHAR(191) NULL,
    `hasVariants` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_name_idx`(`name`),
    INDEX `Product_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `axcaliSku` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `locationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ProductVariant_sku_key`(`sku`),
    UNIQUE INDEX `ProductVariant_barcode_key`(`barcode`),
    UNIQUE INDEX `ProductVariant_axcaliSku_key`(`axcaliSku`),
    INDEX `ProductVariant_productId_idx`(`productId`),
    INDEX `ProductVariant_isActive_idx`(`isActive`),
    INDEX `ProductVariant_locationId_idx`(`locationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VariantOption` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    INDEX `VariantOption_name_value_idx`(`name`, `value`),
    UNIQUE INDEX `VariantOption_variantId_name_key`(`variantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Location_code_key`(`code`),
    INDEX `Location_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Channel` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('MARKETPLACE', 'OWN_STORE') NOT NULL DEFAULT 'MARKETPLACE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Channel_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelAccount` (
    `id` VARCHAR(191) NOT NULL,
    `channelId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `externalId` VARCHAR(191) NULL,
    `defaultCurrency` ENUM('TRY', 'EUR') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelAccount_channelId_idx`(`channelId`),
    UNIQUE INDEX `ChannelAccount_channelId_code_key`(`channelId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChannelSku` (
    `id` VARCHAR(191) NOT NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `channelSku` VARCHAR(191) NOT NULL,
    `externalListingId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChannelSku_variantId_idx`(`variantId`),
    UNIQUE INDEX `ChannelSku_channelAccountId_channelSku_key`(`channelAccountId`, `channelSku`),
    UNIQUE INDEX `ChannelSku_channelAccountId_variantId_key`(`channelAccountId`, `variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditCard` (
    `id` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `last4` CHAR(4) NOT NULL,
    `holderName` VARCHAR(191) NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL,
    `creditLimitAmount` DECIMAL(18, 4) NULL,
    `creditLimitCurrency` ENUM('TRY', 'EUR') NULL,
    `statementDay` INTEGER NULL,
    `dueDay` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CreditCard_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Purchase` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `supplierName` VARCHAR(191) NULL,
    `purchasedAt` DATETIME(3) NOT NULL,
    `receivedAt` DATETIME(3) NULL,
    `creditCardId` VARCHAR(191) NULL,
    `goodsAmount` DECIMAL(18, 4) NOT NULL,
    `goodsCurrency` ENUM('TRY', 'EUR') NOT NULL,
    `shippingAmount` DECIMAL(18, 4) NULL,
    `shippingCurrency` ENUM('TRY', 'EUR') NULL,
    `taxAmount` DECIMAL(18, 4) NULL,
    `taxCurrency` ENUM('TRY', 'EUR') NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Purchase_code_key`(`code`),
    INDEX `Purchase_purchasedAt_idx`(`purchasedAt`),
    INDEX `Purchase_status_idx`(`status`),
    INDEX `Purchase_creditCardId_idx`(`creditCardId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseItem` (
    `id` VARCHAR(191) NOT NULL,
    `purchaseId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitCostAmount` DECIMAL(18, 4) NOT NULL,
    `unitCostCurrency` ENUM('TRY', 'EUR') NOT NULL,

    INDEX `PurchaseItem_purchaseId_idx`(`purchaseId`),
    INDEX `PurchaseItem_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockMovement` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `type` ENUM('INITIAL', 'PURCHASE_IN', 'ADJUSTMENT', 'COUNT_CORRECTION') NOT NULL,
    `quantityDelta` INTEGER NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purchaseItemId` VARCHAR(191) NULL,
    `unitCostAmount` DECIMAL(18, 4) NULL,
    `unitCostCurrency` ENUM('TRY', 'EUR') NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StockMovement_variantId_occurredAt_idx`(`variantId`, `occurredAt`),
    INDEX `StockMovement_type_idx`(`type`),
    INDEX `StockMovement_purchaseItemId_idx`(`purchaseItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VariantOption` ADD CONSTRAINT `VariantOption_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelAccount` ADD CONSTRAINT `ChannelAccount_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSku` ADD CONSTRAINT `ChannelSku_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChannelSku` ADD CONSTRAINT `ChannelSku_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Purchase` ADD CONSTRAINT `Purchase_creditCardId_fkey` FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_purchaseId_fkey` FOREIGN KEY (`purchaseId`) REFERENCES `Purchase`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockMovement` ADD CONSTRAINT `StockMovement_purchaseItemId_fkey` FOREIGN KEY (`purchaseItemId`) REFERENCES `PurchaseItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
