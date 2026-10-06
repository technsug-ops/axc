-- K303 — firma başına pazaryeri API anahtarı (kullanıcı kararı 06.10.2026).
-- Yalnız YENİ tablo; var olan hiçbir tabloya/veriye dokunmaz. Anahtar AES-256-GCM
-- şifreli saklanır, ana sır PAZARYERI_ANAHTAR_SIRRI ortam değişkeninde.
-- CreateTable
CREATE TABLE `KanalAnahtari` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `channelAccountId` VARCHAR(191) NOT NULL,
    `sifreli` TEXT NOT NULL,
    `sonDort` VARCHAR(8) NOT NULL,
    `sonDenemeAt` DATETIME(3) NULL,
    `sonDenemeBasarili` BOOLEAN NULL,
    `sonHata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KanalAnahtari_channelAccountId_key`(`channelAccountId`),
    INDEX `KanalAnahtari_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `KanalAnahtari` ADD CONSTRAINT `KanalAnahtari_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KanalAnahtari` ADD CONSTRAINT `KanalAnahtari_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

