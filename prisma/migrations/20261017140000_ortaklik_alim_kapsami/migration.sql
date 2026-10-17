-- AlterTable
ALTER TABLE `PurchaseItem` ADD COLUMN `ortaklikProjesiId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `OrtaklikKapsamKurali` (
    `id` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrtaklikKapsamKurali_projeId_idx`(`projeId`),
    UNIQUE INDEX `OrtaklikKapsamKurali_variantId_key`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `PurchaseItem_ortaklikProjesiId_idx` ON `PurchaseItem`(`ortaklikProjesiId`);

-- AddForeignKey
ALTER TABLE `OrtaklikKapsamKurali` ADD CONSTRAINT `OrtaklikKapsamKurali_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikKapsamKurali` ADD CONSTRAINT `OrtaklikKapsamKurali_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseItem` ADD CONSTRAINT `PurchaseItem_ortaklikProjesiId_fkey` FOREIGN KEY (`ortaklikProjesiId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
