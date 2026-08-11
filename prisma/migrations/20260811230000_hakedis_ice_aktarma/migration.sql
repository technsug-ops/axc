-- HAKEDİŞ İÇE AKTARMA — şema hazırlığı.
--
-- Canlıda ve yerelde 0 hakediş kaydı var; kısıt gevşetmeleri risksiz.
--
-- ⚠ PRISMA'NIN ÜRETTİĞİ DOSYA ÜÇ YERDEN BOZUKTU, ELLE DÜZELTİLDİ:
--
-- 1) Tablo adları küçük harfliydi (`settlementitem`, `channelaccount`).
--    Windows MySQL adları katlıyor; Linux'ta tablolar büyük harfli.
--    `npm run migration:kontrol` bunu yakaladı.
--
-- 2) `SettlementItem_settlementId_fkey` DÜŞÜRÜLÜYOR ama GERİ EKLENMİYORDU.
--    Prisma onu düşürmek zorunda çünkü kaldırılan
--    `(settlementId, saleId)` benzersiz indeksi o yabancı anahtarı
--    destekliyordu. Geri eklenmeseydi ilişki kısıtsız kalırdı:
--    settlement silinince kalemler öksüz kalırdı.
--
-- 3) `Expense_templateId_fkey` EKLENİYORDU — o kısıt 10.08 tarihli
--    `gider_muhasebe` migration'ında zaten oluşturulmuş ve CANLIDA VAR.
--    Sebebi yerel veritabanının sürüklenmesi; dosya üretime gitseydi
--    "duplicate foreign key constraint name" ile patlardı. Satır silindi.

-- --------------------------------------------------------------------------
-- 1) ESKİ KISITLAR
-- --------------------------------------------------------------------------
-- Satış başına TEK kalem kısıtı kalkıyor: Hepsiburada uzun format verir,
-- bir siparişin sipariş tutarı / komisyon / kargo / stopajı AYRI satırdır.
ALTER TABLE `SettlementItem` DROP FOREIGN KEY `SettlementItem_settlementId_fkey`;

DROP INDEX `SettlementItem_settlementId_saleId_key` ON `SettlementItem`;

-- --------------------------------------------------------------------------
-- 2) KOLONLAR
-- --------------------------------------------------------------------------
-- Trendyol 28 İŞ GÜNÜ öder; takvim günü sayılsaydı beklenen tarih ~13 gün
-- yanılırdı.
ALTER TABLE `ChannelAccount` ADD COLUMN `payoutDaysAreBusinessDays` BOOLEAN NOT NULL DEFAULT false;

-- `paidAt` zorunluluğu kalkıyor: Trendyol raporunda gerçekleşen ödeme
-- tarihi yok, yalnız vade var.
ALTER TABLE `Settlement` ADD COLUMN `sourceFile` VARCHAR(191) NULL,
    MODIFY `paidAt` DATETIME(3) NULL;

-- `saleId` zorunluluğu kalkıyor: rapordaki sipariş sistemde henüz yoksa
-- satır kaybolmaz, uyarı listesinde görünür ve sonradan bağlanabilir.
ALTER TABLE `SettlementItem` ADD COLUMN `channelAccountId` VARCHAR(191) NOT NULL,
    ADD COLUMN `code` VARCHAR(191) NOT NULL,
    ADD COLUMN `dueDate` DATETIME(3) NULL,
    ADD COLUMN `externalId` VARCHAR(191) NOT NULL,
    ADD COLUMN `orderNo` VARCHAR(191) NULL,
    ADD COLUMN `paidAt` DATETIME(3) NULL,
    ADD COLUMN `rawRow` TEXT NULL,
    ADD COLUMN `rawType` VARCHAR(191) NULL,
    MODIFY `saleId` VARCHAR(191) NULL;

-- --------------------------------------------------------------------------
-- 3) İNDEKSLER
-- --------------------------------------------------------------------------
CREATE INDEX `SettlementItem_settlementId_idx` ON `SettlementItem`(`settlementId`);

CREATE INDEX `SettlementItem_orderNo_idx` ON `SettlementItem`(`orderNo`);

CREATE INDEX `SettlementItem_dueDate_idx` ON `SettlementItem`(`dueDate`);

-- İDEMPOTENTLİK: aynı Kayıt No aynı kanal hesabına ikinci kez giremez.
-- Kapsam parti değil KANAL HESABI; yoksa aynı rapor yeni bir partiyle
-- tekrar yüklenebilirdi.
CREATE UNIQUE INDEX `SettlementItem_channelAccountId_externalId_key` ON `SettlementItem`(`channelAccountId`, `externalId`);

-- --------------------------------------------------------------------------
-- 4) YABANCI ANAHTARLAR
-- --------------------------------------------------------------------------
-- Düşürülen kısıt GERİ EKLENİYOR (bkz. üstteki 2 numaralı not).
ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_settlementId_fkey` FOREIGN KEY (`settlementId`) REFERENCES `Settlement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
