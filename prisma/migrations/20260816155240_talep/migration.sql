-- CreateTable
CREATE TABLE `Talep` (
    `id` VARCHAR(191) NOT NULL,
    `kod` VARCHAR(191) NOT NULL,
    `tur` ENUM('HATA', 'ISTEK') NOT NULL,
    `durum` ENUM('ACIK', 'INCELENIYOR', 'YAPILIYOR', 'COZULDU', 'KAPANDI', 'REDDEDILDI', 'ERTELENDI') NOT NULL DEFAULT 'ACIK',
    `baslik` VARCHAR(191) NOT NULL,
    `aciklama` TEXT NOT NULL,
    `rota` VARCHAR(500) NULL,
    `tarayici` VARCHAR(500) NULL,
    `bildirenId` VARCHAR(191) NOT NULL,
    `cozumNotu` TEXT NULL,
    `kapatilmaZamani` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Talep_kod_key`(`kod`),
    INDEX `Talep_durum_idx`(`durum`),
    INDEX `Talep_tur_idx`(`tur`),
    INDEX `Talep_bildirenId_idx`(`bildirenId`),
    INDEX `Talep_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Talep` ADD CONSTRAINT `Talep_bildirenId_fkey` FOREIGN KEY (`bildirenId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
