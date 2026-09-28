-- K304-③ — ADETLE SAYILAN ALTIN BİRİMLERİ (kullanıcı onayı 29.09.2026)
-- çeyrek · yarım · tam · cumhuriyet · ata lira (kullanıcı listesi; gremse çıkarıldı)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE — dosya ELLE yazıldı, `migration:kontrol` doğrular.
-- ⚠ YENİ DEĞERLER SONA EKLENDİ — MySQL ENUM sıralıdır; mevcut değerlerin sırası
-- aynı kaldığı için saklanan hiçbir satırın anlamı değişmez.
-- ⛔ SAF GENİŞLETME: yalnız izin verilen değer kümesi büyür.
--
-- ⚠ `Finansman.currency` BU MİGRATION'DA DÜŞÜRÜLMEZ (bkz. şema notu): alan
-- şemadan çıktı ama canlıdaki kod onu hâlâ otomatik seçiyor. Yeni kod yayına
-- girince AYRI migration'la düşürülür.

-- AlterTable
ALTER TABLE `Finansman` MODIFY `birim` ENUM('TRY', 'EUR', 'USD', 'ALTIN_GRAM_24', 'ALTIN_GRAM_22', 'CEYREK_ALTIN', 'YARIM_ALTIN', 'TAM_ALTIN', 'CUMHURIYET_ALTINI', 'ATA_LIRA_ALTINI') NOT NULL DEFAULT 'TRY';

-- AlterTable
ALTER TABLE `FinansmanBirimFiyati` MODIFY `birim` ENUM('TRY', 'EUR', 'USD', 'ALTIN_GRAM_24', 'ALTIN_GRAM_22', 'CEYREK_ALTIN', 'YARIM_ALTIN', 'TAM_ALTIN', 'CUMHURIYET_ALTINI', 'ATA_LIRA_ALTINI') NOT NULL;
