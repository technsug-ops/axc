-- HAKEDİŞ SATIR ANAHTARI — idempotentliğin gerçek temeli.
--
-- SEBEP (ölçüm 11.08.2026, gerçek Hepsiburada raporu):
-- 539 satırda yalnız 94 farklı "Kayıt No" var, 445 tekrar. HB'de o alan
-- bir FATURA numarasıdır (EFA2026000000101) ve faturanın tüm kalemleri
-- aynı numarayı taşır. Önceki kısıt `(channelAccountId, externalId)`
-- olduğu gibi kalsaydı 539 satırın 445'i REDDEDİLİRDİ.
--
-- Ölçülen tekil kombinasyon: Kayıt No + Sipariş No + Kayıt Tipi = 539/539.
-- Trendyol'da da tekil (298/298) — tek şema iki kanala yetiyor.
--
-- Canlıda ve yerelde 0 hakediş kalemi var; NOT NULL kolon eklemek risksiz.
--
-- ⚠ PRISMA'NIN ÜRETTİĞİ DOSYA YİNE ÜÇ YERDEN BOZUKTU (bir öncekiyle
-- aynı üç tuzak), elle düzeltildi:
--   1) Tablo adları küçük harfliydi — bekçi yakaladı.
--   2) `SettlementItem_channelAccountId_fkey` DÜŞÜRÜLÜP GERİ EKLENMİYORDU.
--      Prisma onu düşürmek zorunda çünkü kaldırılan benzersiz indeks o
--      kısıtı destekliyordu; geri eklenmeseydi kalemler kanal hesabına
--      kısıtsız bağlanırdı.
--   3) `Expense_categoryId_fkey` EKLENİYORDU — CANLIDA VAR (doğrulandı).
--      Yerel veritabanı sürüklenmesi; üretimde "duplicate foreign key"
--      ile patlardı. Satır silindi. (Aynı sorun bir önceki migration'da
--      `Expense_templateId_fkey` ile çıkmıştı — bkz. BEKLEYENLER.)

-- --------------------------------------------------------------------------
-- 1) ESKİ KISIT
-- --------------------------------------------------------------------------
ALTER TABLE `SettlementItem` DROP FOREIGN KEY `SettlementItem_channelAccountId_fkey`;

DROP INDEX `SettlementItem_channelAccountId_externalId_key` ON `SettlementItem`;

-- --------------------------------------------------------------------------
-- 2) YENİ KOLON
-- --------------------------------------------------------------------------
-- rowKey = externalId | siparişNo | HAM TİP
-- Ham tipten üretilir, normalleştirilmiş koddan DEĞİL: iki farklı
-- tanınmayan tip aynı siparişe düşünce ikisi de DIGER olur; koddan
-- üretilseydi biri sessizce kaybolurdu.
ALTER TABLE `SettlementItem` ADD COLUMN `rowKey` VARCHAR(191) NOT NULL;

-- --------------------------------------------------------------------------
-- 3) İNDEKSLER
-- --------------------------------------------------------------------------
-- externalId artık tekil değil ama ARANIR: kullanıcı HB panelindeki
-- fatura numarasıyla kalem arayabilmeli.
CREATE INDEX `SettlementItem_externalId_idx` ON `SettlementItem`(`externalId`);

CREATE UNIQUE INDEX `SettlementItem_channelAccountId_rowKey_key` ON `SettlementItem`(`channelAccountId`, `rowKey`);

-- --------------------------------------------------------------------------
-- 4) YABANCI ANAHTAR — düşürülen geri eklenir
-- --------------------------------------------------------------------------
ALTER TABLE `SettlementItem` ADD CONSTRAINT `SettlementItem_channelAccountId_fkey` FOREIGN KEY (`channelAccountId`) REFERENCES `ChannelAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
