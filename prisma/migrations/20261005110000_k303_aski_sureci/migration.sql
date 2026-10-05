-- K303 — askı süreci (kullanıcı kararı 05.10.2026): uyarı → süre → onaylı askı.
-- Yalnız boş (NULL) sütun ekler; hiçbir firmanın durumu değişmez.
-- AlterTable
ALTER TABLE `Company` ADD COLUMN `askiAciklama` TEXT NULL,
    ADD COLUMN `askiSebebi` ENUM('ODEME_GECIKMESI', 'SOZLESME_IHLALI', 'FIRMA_ISTEGI', 'GUVENLIK', 'DIGER') NULL,
    ADD COLUMN `uyariSebebi` ENUM('ODEME_GECIKMESI', 'SOZLESME_IHLALI', 'FIRMA_ISTEGI', 'GUVENLIK', 'DIGER') NULL,
    ADD COLUMN `uyariSonGun` DATETIME(3) NULL;
