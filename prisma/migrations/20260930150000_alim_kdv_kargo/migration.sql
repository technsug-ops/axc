-- K309 — ALIMIN FATURA YAPISI: KDV dahil/hariç · kargo dahil/ayrı · gümrük
-- (kullanıcı onayı 30.09.2026: «evet»)
--
-- ⚠ TABLO ADLARI BÜYÜK HARFLE — dosya ELLE yazıldı, `migration:kontrol` doğrular.
-- ⛔ SAF GENİŞLETME: varsayılanlar (true · true · boş) BUGÜNKÜ davranıştır —
-- mevcut alım ve tedarikçilerin hiçbir rakamı değişmez. Canlıdaki eski kod bu
-- alanları seçmediği için migration koddan ÖNCE koşar.

-- AlterTable
ALTER TABLE `Purchase` ADD COLUMN `customsAmount` DECIMAL(18, 4) NULL,
    ADD COLUMN `customsCurrency` ENUM('TRY', 'EUR') NULL,
    ADD COLUMN `fiyatKdvDahil` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `kargoDahil` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Supplier` ADD COLUMN `fiyatKdvDahil` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `kargoDahil` BOOLEAN NOT NULL DEFAULT true;
