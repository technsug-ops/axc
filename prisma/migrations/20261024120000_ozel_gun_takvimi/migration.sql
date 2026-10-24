-- K363 Faz 2-b: özel gün takvimi (satış günü / alım kampanyası) — iki yeni tablo, mevcut tablolara dokunmaz
-- CreateTable
CREATE TABLE `OzelGun` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `tur` ENUM('SATIS_GUNU', 'ALIM_KAMPANYASI') NOT NULL,
    `channelId` VARCHAR(191) NULL,
    `aciklama` TEXT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OzelGun_ad_key`(`ad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OzelGunTarihi` (
    `id` VARCHAR(191) NOT NULL,
    `ozelGunId` VARCHAR(191) NOT NULL,
    `baslangic` DATE NOT NULL,
    `bitis` DATE NOT NULL,
    `kaynak` VARCHAR(191) NULL,
    `dogrulandi` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OzelGunTarihi_baslangic_idx`(`baslangic`),
    UNIQUE INDEX `OzelGunTarihi_ozelGunId_baslangic_key`(`ozelGunId`, `baslangic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OzelGun` ADD CONSTRAINT `OzelGun_channelId_fkey` FOREIGN KEY (`channelId`) REFERENCES `Channel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OzelGunTarihi` ADD CONSTRAINT `OzelGunTarihi_ozelGunId_fkey` FOREIGN KEY (`ozelGunId`) REFERENCES `OzelGun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
