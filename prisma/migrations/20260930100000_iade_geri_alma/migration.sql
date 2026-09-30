-- K44 · 2. adım — İADEYİ GERİ AL (kullanıcı onayı 30.09.2026: «devam et»)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE — dosya ELLE yazıldı, `migration:kontrol` doğrular.
-- ⛔ SAF GENİŞLETME: yalnız BOŞ alan eklenir; mevcut hiçbir satır değişmez.
-- Mevcut bütün iadelerde `geriAlindiAt` NULL kalır = «geçerli iade» — bugünkü
-- hiçbir rakam oynamaz. Canlıda çalışan eski kod bu alanları seçmediği için
-- migration koddan ÖNCE koşar (genişlet → sonra kod).

-- AlterTable
ALTER TABLE `Return`
  ADD COLUMN `geriAlindiAt` DATETIME(3) NULL,
  ADD COLUMN `geriAlmaNedeni` ENUM('YANLIS_GIRIS', 'MUSTERI_VAZGECTI', 'DIGER') NULL,
  ADD COLUMN `geriAlmaNotu` TEXT NULL,
  ADD COLUMN `geriAlanId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Return_geriAlindiAt_idx` ON `Return`(`geriAlindiAt`);

-- CreateIndex
CREATE INDEX `Return_geriAlanId_idx` ON `Return`(`geriAlanId`);

-- AddForeignKey
ALTER TABLE `Return` ADD CONSTRAINT `Return_geriAlanId_fkey` FOREIGN KEY (`geriAlanId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
