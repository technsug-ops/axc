-- CreateTable
CREATE TABLE `OrtaklikAnlasmasi` (
    `id` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `gecerlilikAyi` DATE NOT NULL,
    `kalanYontemi` ENUM('SABIT', 'SERMAYE', 'KARMA') NOT NULL,
    `karmaSermayeYuzdesi` DECIMAL(5, 2) NULL,
    `zararYontemi` ENUM('DEVREDER', 'KAR_ORANI', 'SORUMLULUK') NOT NULL,
    `karKullanimi` ENUM('DAGIT', 'YENIDEN_YATIRIM') NOT NULL,
    `aciklama` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `OrtaklikAnlasmasi_projeId_gecerlilikAyi_key`(`projeId`, `gecerlilikAyi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrtaklikAnlasmaPayi` (
    `id` VARCHAR(191) NOT NULL,
    `anlasmaId` VARCHAR(191) NOT NULL,
    `katilimId` VARCHAR(191) NOT NULL,
    `sabitOran` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `emekUcreti` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `sorumlulukPayi` DECIMAL(5, 2) NOT NULL DEFAULT 0,

    INDEX `OrtaklikAnlasmaPayi_katilimId_idx`(`katilimId`),
    UNIQUE INDEX `OrtaklikAnlasmaPayi_anlasmaId_katilimId_key`(`anlasmaId`, `katilimId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrtaklikAnlasmasi` ADD CONSTRAINT `OrtaklikAnlasmasi_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikAnlasmaPayi` ADD CONSTRAINT `OrtaklikAnlasmaPayi_anlasmaId_fkey` FOREIGN KEY (`anlasmaId`) REFERENCES `OrtaklikAnlasmasi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikAnlasmaPayi` ADD CONSTRAINT `OrtaklikAnlasmaPayi_katilimId_fkey` FOREIGN KEY (`katilimId`) REFERENCES `OrtaklikKatilimi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

