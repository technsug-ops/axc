-- K330 (10.10.2026): ürün resim galerisi — kanalın verdiği bütün resimler.
-- Tek firmalı canlı sürümü: firma alanı YOK (çok firmalı dal kendi sürümünde taşır).
-- CreateTable
CREATE TABLE `VaryantGorseli` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `sira` INTEGER NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `kaynak` ENUM('ELLE', 'TRENDYOL', 'N11') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `VaryantGorseli_variantId_sira_key`(`variantId`, `sira`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VaryantGorseli` ADD CONSTRAINT `VaryantGorseli_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
