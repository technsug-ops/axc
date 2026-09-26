-- K283 — TRENDYOL KATEGORİ EŞLEŞMESİ (kullanıcı onayı 26.09.2026)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE (`Product` · `Category` · `TyKategoriEslesme`) —
-- Windows'ta MySQL harfe duyarsız, canlı Linux'ta DUYARLI. Dosya ELLE yazıldı,
-- `migration:kontrol` ile doğrulanır.
--
-- ⛔ SAF EKLEME: mevcut hiçbir sütun/veri değişmez. `Product`a üç BOŞ alan,
-- bir indeks; yeni bir tablo ve onun `Category`ye bağı (kategori silinirse
-- eşleşme `NULL`a düşer — "karşılığı seçilmedi"; ürün kategorisi etkilenmez).

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `tyKategori` VARCHAR(191) NULL,
    ADD COLUMN `kategoriKaynak` ENUM('ELLE', 'TRENDYOL') NULL,
    ADD COLUMN `kategoriKaynakAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Product_tyKategori_idx` ON `Product`(`tyKategori`);

-- CreateTable
CREATE TABLE `TyKategoriEslesme` (
    `id` VARCHAR(191) NOT NULL,
    `tyKategori` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TyKategoriEslesme_tyKategori_key`(`tyKategori`),
    INDEX `TyKategoriEslesme_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TyKategoriEslesme` ADD CONSTRAINT `TyKategoriEslesme_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
