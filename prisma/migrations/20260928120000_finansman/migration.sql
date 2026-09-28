-- K304 — FİNANSMAN: SERMAYE · ORTAK BORCU · ÜÇÜNCÜ KİŞİ BORCU · BANKA KREDİSİ
-- (kullanıcı onayı 28.09.2026)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE (`Finansman` · `FinansmanHareketi` · `Expense`) —
-- Windows'ta MySQL harfe duyarsız, canlı Linux'ta DUYARLI. Dosya ELLE yazıldı,
-- `migration:kontrol` ile doğrulanır.
--
-- ⚠ ENUM SIRASI ŞEMAYLA BİREBİR (MySQL'de ENUM sıralıdır — K58 dersi).
--
-- ⛔ SAF EKLEME: iki yeni tablo. Mevcut hiçbir tablo, sütun ya da satır DEĞİŞMEZ.
-- `Expense` tablosuna sütun EKLENMEZ — bağ `FinansmanHareketi.faizGiderId`
-- tarafında durur (KartOdeme.faizGiderId deseni).

-- CreateTable
CREATE TABLE `Finansman` (
    `id` VARCHAR(191) NOT NULL,
    `tur` ENUM('SERMAYE', 'ORTAK_BORCU', 'UCUNCU_KISI_BORCU', 'BANKA_KREDISI') NOT NULL,
    `kaynakAdi` VARCHAR(191) NOT NULL,
    `currency` ENUM('TRY', 'EUR') NOT NULL DEFAULT 'TRY',
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Finansman_tur_idx`(`tur`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinansmanHareketi` (
    `id` VARCHAR(191) NOT NULL,
    `finansmanId` VARCHAR(191) NOT NULL,
    `tur` ENUM('GIRIS', 'GERI_ODEME', 'SERMAYEYE_MAHSUP') NOT NULL,
    `vade` DATETIME(3) NOT NULL,
    `gerceklestiAt` DATETIME(3) NULL,
    `anapara` DECIMAL(18, 4) NOT NULL,
    `faiz` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `vergi` DECIMAL(18, 4) NOT NULL DEFAULT 0,
    `faizGiderId` VARCHAR(191) NULL,
    `isReversal` BOOLEAN NOT NULL DEFAULT false,
    `reversesId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FinansmanHareketi_faizGiderId_key`(`faizGiderId`),
    UNIQUE INDEX `FinansmanHareketi_reversesId_key`(`reversesId`),
    INDEX `FinansmanHareketi_finansmanId_idx`(`finansmanId`),
    INDEX `FinansmanHareketi_vade_idx`(`vade`),
    INDEX `FinansmanHareketi_gerceklestiAt_idx`(`gerceklestiAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_finansmanId_fkey` FOREIGN KEY (`finansmanId`) REFERENCES `Finansman`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_faizGiderId_fkey` FOREIGN KEY (`faizGiderId`) REFERENCES `Expense`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinansmanHareketi` ADD CONSTRAINT `FinansmanHareketi_reversesId_fkey` FOREIGN KEY (`reversesId`) REFERENCES `FinansmanHareketi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
