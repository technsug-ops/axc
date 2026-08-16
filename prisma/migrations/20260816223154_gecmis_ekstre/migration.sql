-- CreateTable
CREATE TABLE `GecmisEkstre` (
    `id` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `donem` DATETIME(3) NOT NULL,
    `borc` DECIMAL(18, 4) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `odenenTutar` DECIMAL(18, 4) NULL,
    `odemeTarihi` DATETIME(3) NULL,
    `kaynak` ENUM('TURETILEN', 'GECMIS_EXCEL', 'ELLE') NOT NULL DEFAULT 'GECMIS_EXCEL',
    `hamDonemMetni` VARCHAR(100) NULL,
    `iceAktarimKodu` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GecmisEkstre_donem_idx`(`donem`),
    INDEX `GecmisEkstre_iceAktarimKodu_idx`(`iceAktarimKodu`),
    UNIQUE INDEX `GecmisEkstre_cardId_donem_key`(`cardId`, `donem`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `GecmisEkstre` ADD CONSTRAINT `GecmisEkstre_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `CreditCard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
