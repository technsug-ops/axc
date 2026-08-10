-- KİMLİK STANDARDI — salt ekleme.
-- Hiçbir kolon silinmez/yeniden adlandırılmaz, hiçbir satır değiştirilmez.
-- Yeni kolonlar NULL doğar; MySQL'de NULL benzersizlik kuralını tetiklemez,
-- yani "kodu henüz girilmemiş" birden çok kayıt bir arada durabilir.
--
-- TABLO ADLARI BÜYÜK HARFLİ: Windows'taki MySQL tablo adlarını küçük harfe
-- katladığı için Prisma bu dosyayı `category` diye üretti; Linux sunucudaki
-- gerçek tablo `Category`. Elle düzeltildi, `npm run migration:kontrol` bekçisi
-- her koşumda doğruluyor.

-- AlterTable
ALTER TABLE `Category` ADD COLUMN `code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `supplierOrderNo` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Supplier` ADD COLUMN `code` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Category_code_key` ON `Category`(`code`);

-- CreateIndex
CREATE INDEX `Purchase_supplierOrderNo_idx` ON `Purchase`(`supplierOrderNo`);

-- CreateIndex
CREATE UNIQUE INDEX `Supplier_code_key` ON `Supplier`(`code`);
