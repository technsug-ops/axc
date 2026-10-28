-- Tarife kalemine ürünün kendi geçerlilik aralığı (28.10.2026).
-- Yalnız İKİ BOŞ SÜTUN eklenir; mevcut satırlar NULL kalır = «tarifenin
-- penceresiyle geçerli». Geri doldurma YOK, veri değişmez.
ALTER TABLE `KomisyonTarifeKalemi`
    ADD COLUMN `gecerlilikBaslangic` DATETIME(3) NULL,
    ADD COLUMN `gecerlilikBitis` DATETIME(3) NULL;
