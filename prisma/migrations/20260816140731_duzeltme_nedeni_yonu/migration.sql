-- AlterTable
ALTER TABLE `stockadjustmentreason` ADD COLUMN `yon` ENUM('EKSI', 'ARTI', 'HER_IKISI') NOT NULL DEFAULT 'HER_IKISI';
