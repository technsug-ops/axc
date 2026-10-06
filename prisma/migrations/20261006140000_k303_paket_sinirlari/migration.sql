-- K303 ② adet sınırları (kullanıcı kararı 06.10.2026). Hepsi boş başlar = sınırsız.
-- Kanal hesabı + kullanıcı SERT, aylık sipariş YUMUŞAK (kod katmanında).
-- AlterTable
ALTER TABLE `Company` ADD COLUMN `sinirAylikSiparis` INTEGER NULL,
    ADD COLUMN `sinirKanalHesabi` INTEGER NULL,
    ADD COLUMN `sinirKullanici` INTEGER NULL;

-- AlterTable
ALTER TABLE `Paket` ADD COLUMN `aylikSiparisSiniri` INTEGER NULL,
    ADD COLUMN `kanalHesabiSiniri` INTEGER NULL,
    ADD COLUMN `kullaniciSiniri` INTEGER NULL;

