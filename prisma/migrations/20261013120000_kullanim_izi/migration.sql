-- CreateTable
CREATE TABLE `KullanimOlayi` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `tur` ENUM('SAYFA', 'TIKLAMA') NOT NULL,
    `sayfa` VARCHAR(191) NOT NULL,
    `oncekiSayfa` VARCHAR(191) NULL,
    `hedef` VARCHAR(191) NULL,
    `cihaz` ENUM('TELEFON', 'TABLET', 'MASAUSTU') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `KullanimOlayi_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `KullanimOlayi_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KullanimOlayi` ADD CONSTRAINT `KullanimOlayi_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KullanimOlayi` ADD CONSTRAINT `KullanimOlayi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

