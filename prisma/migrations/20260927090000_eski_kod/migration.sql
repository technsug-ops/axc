-- K287 — ESKİ KOD TABLOSU (kullanıcı onayı 27.09.2026)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE (`EskiKod` · `ProductVariant`) — Windows'ta MySQL
-- harfe duyarsız, canlı Linux'ta DUYARLI. Dosya ELLE yazıldı, `migration:kontrol`
-- ile doğrulanır.
--
-- ⛔ SAF EKLEME: mevcut hiçbir sütun/veri değişmez. Yeniden kodlamada bırakılan
-- eski kodlar burada yaşar; `kod` benzersiz. Ürün silinemez (RESTRICT) — eski
-- kodun sahibi kaybolmaz.

-- CreateTable
CREATE TABLE `EskiKod` (
    `id` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NOT NULL,
    `kod` VARCHAR(191) NOT NULL,
    `kaynak` VARCHAR(40) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EskiKod_kod_key`(`kod`),
    INDEX `EskiKod_variantId_idx`(`variantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EskiKod` ADD CONSTRAINT `EskiKod_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `ProductVariant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
