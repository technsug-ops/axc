-- ============================================================================
--  DEPO BÖLÜMÜ — raf motoru için düzen tablosu (K50)
-- ----------------------------------------------------------------------------
--  ⚠ HİÇBİR VERİ DEĞİŞMİYOR: boş bir tablo ve ÜÇ NULLABLE sütun eklenir.
--  Mevcut 41 raf, ürün bağları ve stok hareketleri DOKUNULMADAN kalır;
--  geri doldurma YOK (göç onaylanana kadar bölümsüz kalırlar).
--
--  ⭐ Şema merdiveni ölçüldü: `Location.name` bölüm taşıyamıyor (`OFİS` ve
--  `Ofis` ayrı kayıt; rafsız bölüm kurulamıyor) ve kod öneki bölüm vermiyor
--  (`A` öneki hem OFİS hem adsız). Sorgu ihtiyacı → tablo + sütun.
-- ============================================================================

CREATE TABLE `DepoBolumu` (
    `id` VARCHAR(191) NOT NULL,
    `ad` VARCHAR(191) NOT NULL,
    `kisaltma` VARCHAR(191) NOT NULL,
    `sira` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DepoBolumu_kisaltma_key`(`kisaltma`),
    INDEX `DepoBolumu_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Location`
    ADD COLUMN `bolumId` VARCHAR(191) NULL,
    ADD COLUMN `unite` INTEGER NULL,
    ADD COLUMN `goz` INTEGER NULL;

CREATE INDEX `Location_bolumId_unite_goz_idx` ON `Location`(`bolumId`, `unite`, `goz`);

ALTER TABLE `Location`
    ADD CONSTRAINT `Location_bolumId_fkey`
    FOREIGN KEY (`bolumId`) REFERENCES `DepoBolumu`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
