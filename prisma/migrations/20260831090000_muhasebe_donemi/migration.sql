-- MUHASEBE DONEMI (K108)
--
-- NIYE: sistemde muhasebe donemi kavrami HIC YOKTU. Semadaki
-- `periodStart`/`periodEnd` yalniz `Settlement`ta ve o PAZARYERININ ODEME
-- donemi — bizim beyan donemimiz DEGIL. Ikisi karistirilmamali.
--
-- MERDIVEN INILDI, TABLOYA EN SON GELINDI:
--   1) mevcut alan: Settlement.period* BASKA bir seyin donemi     HAYIR
--   2) AuditLog: durum HER YAZIMDA sorgulanacak, o tablo "geriye
--      bakmak" icin (current-state deposu degil)                  HAYIR
--   3) turetilebilir mi: kapanis bir KARARDIR, veriden cikmaz     HAYIR
--   4) TABLO — sutun DEGIL, cunku her donem bir satir ve buyur    EVET
--
-- ETKI: 0 satir dogar. Satir ancak bir donem KAPATILDIGINDA yazilir;
-- satiri olmayan donem ACIKTIR. Yokluk = acik oldugu icin geri doldurma YOK.
--
-- GERI DONUS: tablo bos dogdugu icin `DROP TABLE` yeterli; hicbir mevcut
-- kayit bu tabloya bagli degil.
--
-- ⚠ MIGRATION ADININ SOYLEDIGI ISIN DISINA CIKMAZ: bu dosyada YALNIZ yeni
-- enum, yeni tablo, indeksleri ve `User`a giden yabanci anahtar var.
-- `User` TABLOSU DEGISMEZ — ters iliski Prisma tarafinda, sutun acmaz.

-- CreateTable
CREATE TABLE `MuhasebeDonemi` (
    `id` VARCHAR(191) NOT NULL,
    `yil` INTEGER NOT NULL,
    `ay` INTEGER NOT NULL,
    `durum` ENUM('ACIK', 'KAPALI') NOT NULL DEFAULT 'KAPALI',
    `kapatanId` VARCHAR(191) NULL,
    `kapatildiAt` DATETIME(3) NULL,
    `not` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MuhasebeDonemi_durum_idx`(`durum`),
    UNIQUE INDEX `MuhasebeDonemi_yil_ay_key`(`yil`, `ay`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MuhasebeDonemi` ADD CONSTRAINT `MuhasebeDonemi_kapatanId_fkey` FOREIGN KEY (`kapatanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
