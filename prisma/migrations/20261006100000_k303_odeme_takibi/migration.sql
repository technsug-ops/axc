-- K303 — elle ödeme takibi (kullanıcı kararı 06.10.2026; anayasa kısmen çevrildi).
-- Firmaya abonelik alanları (hepsi boş başlar) + FirmaOdemesi defteri (silinmez,
-- düzeltme ters kayıtla). Firma alanı bilerek `firmaId` (süzgeç dışı, yönetim verisi).
-- AlterTable
ALTER TABLE `Company` ADD COLUMN `aboneDonemi` ENUM('AYLIK', 'YILLIK') NULL,
    ADD COLUMN `aboneParaBirimi` ENUM('TRY', 'EUR') NULL,
    ADD COLUMN `aboneTutari` DECIMAL(14, 2) NULL,
    ADD COLUMN `sonrakiOdemeGunu` DATETIME(3) NULL;
-- CreateTable
CREATE TABLE `FirmaOdemesi` (
    `id` VARCHAR(191) NOT NULL,
    `firmaId` VARCHAR(191) NOT NULL,
    `odemeGunu` DATETIME(3) NOT NULL,
    `tutar` DECIMAL(14, 2) NOT NULL,
    `paraBirimi` ENUM('TRY', 'EUR') NOT NULL,
    `yontem` ENUM('HAVALE', 'KART', 'NAKIT', 'DIGER') NOT NULL,
    `aciklama` TEXT NULL,
    `duzeltilenId` VARCHAR(191) NULL,
    `vadeOnce` DATETIME(3) NULL,
    `vadeSonra` DATETIME(3) NULL,
    `yazanId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `FirmaOdemesi_duzeltilenId_key`(`duzeltilenId`),
    INDEX `FirmaOdemesi_firmaId_odemeGunu_idx`(`firmaId`, `odemeGunu`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- AddForeignKey
ALTER TABLE `FirmaOdemesi` ADD CONSTRAINT `FirmaOdemesi_firmaId_fkey` FOREIGN KEY (`firmaId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `FirmaOdemesi` ADD CONSTRAINT `FirmaOdemesi_duzeltilenId_fkey` FOREIGN KEY (`duzeltilenId`) REFERENCES `FirmaOdemesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `FirmaOdemesi` ADD CONSTRAINT `FirmaOdemesi_yazanId_fkey` FOREIGN KEY (`yazanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
