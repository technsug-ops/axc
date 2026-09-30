-- KANAL KDV ORANI — Trendyol ilanındaki KDV oranı (kullanıcı onayı 30.09.2026: «YAP BUNLARI»)
--
-- ⚠ TABLO ADI BÜYÜK HARFLE — dosya ELLE yazıldı, `migration:kontrol` doğrular.
-- ⛔ SAF GENİŞLETME: boş (NULL) sütun = «ölçülmedi». Hiçbir satırın değeri
-- değişmez; canlıdaki eski kod bu alanı seçmediği için migration koddan ÖNCE koşar.

-- AlterTable
ALTER TABLE `ChannelSku` ADD COLUMN `kanalKdvOrani` DECIMAL(5, 2) NULL;
