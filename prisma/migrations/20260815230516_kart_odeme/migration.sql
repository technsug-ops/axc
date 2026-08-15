-- CreateTable
CREATE TABLE `KartOdeme` (
    `id` VARCHAR(191) NOT NULL,
    `cardId` VARCHAR(191) NOT NULL,
    `donem` DATETIME(3) NOT NULL,
    `ekstreBorcu` DECIMAL(18, 4) NOT NULL,
    `odenenAnaBorc` DECIMAL(18, 4) NOT NULL,
    `odemeTarihi` DATETIME(3) NOT NULL,
    `faizOrani` DECIMAL(6, 4) NULL,
    `faizGun` INTEGER NULL,
    `faizTutar` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `faizGiderId` VARCHAR(191) NULL,
    `kaynak` ENUM('TURETILEN', 'GECMIS_EXCEL', 'ELLE') NOT NULL DEFAULT 'TURETILEN',
    `isReversal` BOOLEAN NOT NULL DEFAULT false,
    `reversesId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KartOdeme_faizGiderId_key`(`faizGiderId`),
    UNIQUE INDEX `KartOdeme_reversesId_key`(`reversesId`),
    INDEX `KartOdeme_cardId_donem_idx`(`cardId`, `donem`),
    INDEX `KartOdeme_odemeTarihi_idx`(`odemeTarihi`),
    INDEX `KartOdeme_kaynak_idx`(`kaynak`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_cardId_fkey` FOREIGN KEY (`cardId`) REFERENCES `CreditCard`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_faizGiderId_fkey` FOREIGN KEY (`faizGiderId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KartOdeme` ADD CONSTRAINT `KartOdeme_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `KartOdeme`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
