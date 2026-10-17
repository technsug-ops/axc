-- CreateTable
CREATE TABLE `IsOrtagi` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `notlar` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrtaklikProjesi` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `baslangic` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrtaklikKatilimi` (
    `id` VARCHAR(191) NOT NULL,
    `projeId` VARCHAR(191) NOT NULL,
    `ortakId` VARCHAR(191) NOT NULL,
    `sorumluluk` VARCHAR(1000) NOT NULL,
    `sermaye` BOOLEAN NOT NULL DEFAULT false,
    `emek` BOOLEAN NOT NULL DEFAULT false,
    `komisyon` BOOLEAN NOT NULL DEFAULT false,
    `finansman` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrtaklikKatilimi_ortakId_idx`(`ortakId`),
    UNIQUE INDEX `OrtaklikKatilimi_projeId_ortakId_key`(`projeId`, `ortakId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrtaklikKatilimi` ADD CONSTRAINT `OrtaklikKatilimi_projeId_fkey` FOREIGN KEY (`projeId`) REFERENCES `OrtaklikProjesi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrtaklikKatilimi` ADD CONSTRAINT `OrtaklikKatilimi_ortakId_fkey` FOREIGN KEY (`ortakId`) REFERENCES `IsOrtagi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
