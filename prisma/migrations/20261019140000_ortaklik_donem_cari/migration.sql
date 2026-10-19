-- CreateTable
CREATE TABLE `OrtaklikDonemi` (
    `id` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `ay` DATE NOT NULL,
    `anlasmaId` VARCHAR(191) NOT NULL,
    `sonuc` DECIMAL(18, 4) NOT NULL,
    `ucretToplami` DECIMAL(18, 4) NOT NULL,
    `mahsup` DECIMAL(18, 4) NOT NULL,
    `bolunen` DECIMAL(18, 4) NOT NULL,
    `devredenOnce` DECIMAL(18, 4) NOT NULL,
    `devredenSonra` DECIMAL(18, 4) NOT NULL,
    `karKullanimi` ENUM('DAGIT', 'YENIDEN_YATIRIM') NOT NULL,
    `kesinlestirenId` VARCHAR(191) NULL,
    `kesinlestiAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `geriAlindiAt` DATETIME(3) NULL,
    `geriAlmaGerekcesi` TEXT NULL,

    INDEX `OrtaklikDonemi_projeId_ay_idx`(`projeId`, `ay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrtakCariHareketi` (
    `id` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `katilimId` VARCHAR(191) NOT NULL,
    `tur` ENUM('HAK', 'HAK_TERS', 'ODEME', 'ODEME_TERS') NOT NULL,
    `tutar` DECIMAL(18, 4) NOT NULL,
    `ucretTutari` DECIMAL(18, 4) NULL,
    `payTutari` DECIMAL(18, 4) NULL,
    `tarih` DATE NOT NULL,
    `donemId` VARCHAR(191) NULL,
    `expenseId` VARCHAR(191) NULL,
    `reversesId` VARCHAR(191) NULL,
    `aciklama` TEXT NULL,
    `userId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrtakCariHareketi_expenseId_key`(`expenseId`),
    UNIQUE INDEX `OrtakCariHareketi_reversesId_key`(`reversesId`),
    INDEX `OrtakCariHareketi_projeId_idx`(`projeId`),
    INDEX `OrtakCariHareketi_katilimId_idx`(`katilimId`),
    INDEX `OrtakCariHareketi_donemId_idx`(`donemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrtaklikDonemi` ADD CONSTRAINT `OrtaklikDonemi_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikDonemi` ADD CONSTRAINT `OrtaklikDonemi_anlasmaId_fkey` FOREIGN KEY (`anlasmaId`) REFERENCES `OrtaklikAnlasmasi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikDonemi` ADD CONSTRAINT `OrtaklikDonemi_kesinlestirenId_fkey` FOREIGN KEY (`kesinlestirenId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_katilimId_fkey` FOREIGN KEY (`katilimId`) REFERENCES `OrtaklikKatilimi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_donemId_fkey` FOREIGN KEY (`donemId`) REFERENCES `OrtaklikDonemi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_expenseId_fkey` FOREIGN KEY (`expenseId`) REFERENCES `Expense`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `OrtakCariHareketi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtakCariHareketi` ADD CONSTRAINT `OrtakCariHareketi_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

