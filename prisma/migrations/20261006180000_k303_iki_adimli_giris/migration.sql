-- K303 ⑤ — süper admin iki adımlı giriş (TOTP; kullanıcı kararı 06.10.2026: zorunlu).
-- User tablosuna yalnız BOŞ alanlar; var olan veri değişmez. Yedek kodlar yalnız özet.
-- AlterTable
ALTER TABLE `User` ADD COLUMN `totpAcildiAt` DATETIME(3) NULL,
    ADD COLUMN `totpSifreli` TEXT NULL,
    ADD COLUMN `totpSonAdim` INTEGER NULL;

-- CreateTable
CREATE TABLE `IkiAdimYedekKodu` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ozet` TEXT NOT NULL,
    `kullanildiAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IkiAdimYedekKodu_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `IkiAdimYedekKodu` ADD CONSTRAINT `IkiAdimYedekKodu_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

