-- K304-② — FİNANSMAN BORÇ BİRİMİ (USD · gram altın) + BİRİM FİYATI + ÖZELLİK ANAHTARI
-- (kullanıcı onayı 28.09.2026)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE — dosya ELLE yazıldı, `migration:kontrol` doğrular.
-- ⚠ ENUM SIRASI ŞEMAYLA BİREBİR (MySQL ENUM sıralıdır).
--
-- ⛔ GENİŞLET → DARALT: `Finansman.currency` bu migration'da DÜŞÜRÜLMEZ. Canlıdaki
-- K304 kodu onu okuyor (nakit takvimi dahil) ve migration kod yayından ÖNCE koşar;
-- düşürülseydi aradaki dakikalarda panel/nakit takvimi 500 verirdi. Yeni kod
-- canlıya çıkınca sütun AYRI bir migration'la kaldırılır.
-- Ölçüldü 28.09.2026: canlıda 0 finansman kaydı; değer yine de taşınır.

-- AlterTable: yeni birim sütunu
ALTER TABLE `Finansman` ADD COLUMN `birim` ENUM('TRY', 'EUR', 'USD', 'ALTIN_GRAM_24', 'ALTIN_GRAM_22') NOT NULL DEFAULT 'TRY';

-- Değer taşıma (TRY/EUR aynı yazım)
UPDATE `Finansman` SET `birim` = `currency`;

-- CreateTable
CREATE TABLE `FinansmanBirimFiyati` (
    `id` VARCHAR(191) NOT NULL,
    `birim` ENUM('TRY', 'EUR', 'USD', 'ALTIN_GRAM_24', 'ALTIN_GRAM_22') NOT NULL,
    `fiyat` DECIMAL(18, 4) NOT NULL,
    `gecerliGun` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FinansmanBirimFiyati_birim_gecerliGun_idx`(`birim`, `gecerliGun`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: özellik anahtarı (varsayılan KAPALI)
ALTER TABLE `Company` ADD COLUMN `finansmanCokBirim` BOOLEAN NOT NULL DEFAULT false;
