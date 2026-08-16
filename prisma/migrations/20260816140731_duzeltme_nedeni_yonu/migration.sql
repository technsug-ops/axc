-- AlterTable
--
-- ⚠ TABLO ADI BÜYÜK HARFLE. Prisma bu SQL'i `stockadjustmentreason` diye
-- üretti: yerel MariaDB `lower_case_table_names=1` ile çalışıyor ve adı
-- küçültüyor. CANLI MySQL `lower_case_table_names=0` — harfe DUYARLI ve
-- tablonun gerçek adı `StockAdjustmentReason`. Küçük harfle gönderilseydi
-- migration canlıda "tablo yok" diyerek patlardı (mimar kontrolü 16.08.2026).
ALTER TABLE `StockAdjustmentReason` ADD COLUMN `yon` ENUM('EKSI', 'ARTI', 'HER_IKISI') NOT NULL DEFAULT 'HER_IKISI';
