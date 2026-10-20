-- CreateTable
CREATE TABLE `Hedef` (
    `id` VARCHAR(191) NOT NULL,
    `olcut` ENUM('CIRO', 'NET2', 'SIPARIS') NOT NULL,
    `donem` ENUM('GUN', 'HAFTA', 'AY', 'CEYREK', 'YIL') NOT NULL,
    `tutar` DECIMAL(18, 4) NULL,
    `gecerlilik` DATE NOT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Hedef_olcut_donem_gecerlilik_idx`(`olcut`, `donem`, `gecerlilik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HedefTebrigi` (
    `id` VARCHAR(191) NOT NULL,
    `hedefId` VARCHAR(191) NOT NULL,
    `donemBasi` DATE NOT NULL,
    `gerceklesen` DECIMAL(18, 4) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HedefTebrigi_hedefId_donemBasi_key`(`hedefId`, `donemBasi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Hedef` ADD CONSTRAINT `Hedef_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HedefTebrigi` ADD CONSTRAINT `HedefTebrigi_hedefId_fkey` FOREIGN KEY (`hedefId`) REFERENCES `Hedef`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

