-- K303 ② paketler (kullanıcı kararı 30.09 + 06.10.2026: Individuel = firmaya özel seçim).
-- Yalnız tablolar; başlangıç dağılımı kodda tek sabitten `paket:baslangic` betiğiyle yazılır.
-- AlterTable
ALTER TABLE `Company` ADD COLUMN `paketId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Paket` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `aciklama` TEXT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `firmayaOzel` BOOLEAN NOT NULL DEFAULT false,
    `onerilenTutar` DECIMAL(14, 2) NULL,
    `onerilenParaBirimi` ENUM('TRY', 'EUR') NULL,
    `onerilenDonem` ENUM('AYLIK', 'YILLIK') NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Paket_ad_key`(`ad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaketOzelligi` (
    `paketId` VARCHAR(191) NOT NULL,
    `ozellik` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`paketId`, `ozellik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FirmaOzelligi` (
    `firmaId` VARCHAR(191) NOT NULL,
    `ozellik` VARCHAR(64) NOT NULL,

    PRIMARY KEY (`firmaId`, `ozellik`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_paketId_fkey` FOREIGN KEY (`paketId`) REFERENCES `Paket`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaketOzelligi` ADD CONSTRAINT `PaketOzelligi_paketId_fkey` FOREIGN KEY (`paketId`) REFERENCES `Paket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FirmaOzelligi` ADD CONSTRAINT `FirmaOzelligi_firmaId_fkey` FOREIGN KEY (`firmaId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

