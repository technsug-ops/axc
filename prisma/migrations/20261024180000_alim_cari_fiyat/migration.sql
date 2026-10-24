-- K363 Faz 2-d: alım kalemine isteğe bağlı CARİ FİYAT (kuponsuz) — boş sütun, mevcut veriye dokunmaz
-- AlterTable
ALTER TABLE `PurchaseItem` ADD COLUMN `cariFiyatAmount` DECIMAL(18, 4) NULL;
