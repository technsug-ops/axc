-- ============================================================================
--  SATIŞ İPTALİ — 17.08.2026
-- ----------------------------------------------------------------------------
--  Kullanıcı ihtiyacı: müşteri kargoya verilmeden iptal ediyor. İptal İADE
--  DEĞİLDİR — mal hiç çıkmadı, komisyon kesilmedi, kargo yanmadı. Bu yüzden
--  iptal edilen satış ciroya/NET'e/hakediş beklentisine HİÇ GİRMEZ; iade
--  gibi "düşülmez", hiç doğmamış sayılır.
--
--  ⚠ PRISMA'NIN ÜRETTİĞİ HÂLİ TABLO ADLARINI KÜÇÜK HARFLE YAZDI
--  (`sale`, `stockadjustmentreason`, `stockmovement`). Yerel MariaDB
--  `lower_case_table_names=1`; canlı MySQL `lower_case_table_names=0` —
--  harfe DUYARLI. Elle büyük harfe çevrildi. Bu tuzağın bu depodaki
--  BEŞİNCİ tekrarı; `migration:kontrol` bekçisi bunun için var ve commit
--  ÖNCESİ koşuluyor.
--
--  ── İKİ `MODIFY` VAR, İKİSİ DE YIKICI DEĞİL ─────────────────────────────
--  Enum'a SONA yeni değer ekleniyor (`SALE_CANCEL_IN`). MySQL ENUM'u
--  değerin SIRA NUMARASIYLA saklar; sona ekleme mevcut satırların
--  numaralarını değiştirmez, veri dönüşmez, satır silinmez.
--  `stockadjustmentreason.movementType` de aynı enum'u kullandığı için
--  birlikte güncelleniyor.
--
--  RETURN_IN KULLANILMADI: o "müşteri aldı, iade etti" demek ve hareket
--  tipleri kullanıcıya ETİKETLE gösteriliyor. İptali iade diye yazsaydık
--  ekranda "iadeden giriş" görünürdü.
-- ============================================================================

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `iptalEdenId` VARCHAR(191) NULL,
    ADD COLUMN `iptalNotu` TEXT NULL,
    ADD COLUMN `iptalSebebi` ENUM('MUSTERI_FIYAT', 'MUSTERI_VAZGECTI', 'MAGAZA_STOK_YOK', 'MAGAZA_KOTU_NIYET', 'MAGAZA_DIGER') NULL,
    ADD COLUMN `iptalTarihi` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `StockAdjustmentReason` MODIFY `movementType` ENUM('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'EXCHANGE_OUT', 'ADJUSTMENT', 'COUNT_CORRECTION', 'SALE_CANCEL_IN') NOT NULL DEFAULT 'ADJUSTMENT';

-- AlterTable
ALTER TABLE `StockMovement` MODIFY `type` ENUM('INITIAL', 'PURCHASE_IN', 'SALE_OUT', 'RETURN_IN', 'EXCHANGE_OUT', 'ADJUSTMENT', 'COUNT_CORRECTION', 'SALE_CANCEL_IN') NOT NULL;

-- CreateIndex
CREATE INDEX `Sale_iptalTarihi_idx` ON `Sale`(`iptalTarihi`);

-- AddForeignKey
ALTER TABLE `Sale` ADD CONSTRAINT `Sale_iptalEdenId_fkey` FOREIGN KEY (`iptalEdenId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
