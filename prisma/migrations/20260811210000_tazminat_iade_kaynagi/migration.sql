-- TAZMİNATIN İKİNCİ KAYNAĞI: müşteriden hasarlı dönen iade kalemi.
-- Salt ekleme: bir nullable kolon, bir indeks, bir yabancı anahtar.
-- Mevcut talep kayıtlarına DOKUNMAZ; hepsinde `returnItemId` NULL doğar.
--
-- SET NULL: iade kalemi silinirse talep kaydı KALIR, yalnız bağı kopar.
-- Talebin kendisi bir alacak geçmişidir; kaynağı silindi diye silinmez.
--
-- TABLO ADI BÜYÜK HARFLİ: Windows'taki MySQL tablo adlarını küçük harfe
-- katladığı için Prisma bu dosyayı `compensation` diye üretti; Linux
-- sunucudaki gerçek tablo `Compensation`. Elle düzeltildi,
-- `npm run migration:kontrol` bekçisi doğruluyor.

-- AlterTable
ALTER TABLE `Compensation` ADD COLUMN `returnItemId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Compensation_returnItemId_idx` ON `Compensation`(`returnItemId`);

-- AddForeignKey
ALTER TABLE `Compensation` ADD CONSTRAINT `Compensation_returnItemId_fkey` FOREIGN KEY (`returnItemId`) REFERENCES `ReturnItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
