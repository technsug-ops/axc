-- K285 — MARKA KOD TABLOSU (kullanıcı onayı 26.09.2026)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE (`Brand` · `Product`) — Windows'ta MySQL harfe
-- duyarsız, canlı Linux'ta DUYARLI. Dosya ELLE yazıldı, `migration:kontrol`
-- ile doğrulanır.
--
-- ⛔ SAF EKLEME: mevcut hiçbir sütun/veri değişmez. `Product.brand` (serbest
-- metin) OLDUĞU GİBİ kalır; yanına BOŞ bir `brandId` bağı eklenir. Marka
-- silinirse bağ `NULL`a düşer, ürün etkilenmez.
-- `anahtar` = markanın katlanmış yazımı (PHILIPS = Philips) — aynı markanın
-- yazım farkları tek kayda düşer. `code` = 3 harf, BENZERSİZ (Karaca/Karcher
-- çakışması tabloda imkânsız).

-- CreateTable
CREATE TABLE `Brand` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `anahtar` VARCHAR(191) NOT NULL,
    `code` VARCHAR(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Brand_anahtar_key`(`anahtar`),
    UNIQUE INDEX `Brand_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `brandId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Product_brandId_idx` ON `Product`(`brandId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_brandId_fkey` FOREIGN KEY (`brandId`) REFERENCES `Brand`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
