-- SAYIM GECERSIZLESTI DAMGASI
--
-- Fiziksel sayimdan SONRA, sayim tarihinden ONCEYE bir hareket yazildiginda
-- bu sutun damgalanir: o varyantin sayimi artik gecerli degildir ve YENIDEN
-- SAYILMASI istenir.
--
-- NIYE SUTUN: uyari merkezi "N varyantin sayimi gecersizlesti" diye
-- SORGULAMAK zorunda; serbest metin geriye bakmaya yeter ama sorguya yetmez.
--
-- ETKI: 1104 satir, hepsi NULL dogar. Geri doldurma YOK.
-- GERI DONUS: nullable ve varsayilansiz — `DROP COLUMN` yeterli.
--
-- ⚠ MIGRATION ADININ SOYLEDIGI ISIN DISINA CIKMAZ: bu dosyada YALNIZ bu
-- sutun ve indeksi var. Baska tabloya dokunan tek ifade yok.

-- AlterTable
ALTER TABLE `ProductVariant` ADD COLUMN `sayimGecersizAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `ProductVariant_sayimGecersizAt_idx` ON `ProductVariant`(`sayimGecersizAt`);
