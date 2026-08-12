-- KANAL HESABI ROLÜ — ALIŞ mı SATIŞ mı?
--
-- SEBEP (12.08.2026, kullanıcı bildirdi ve canlı veriyle doğrulandı):
-- Arbitraj yapıldığı için AYNI pazaryerinde iki tür hesap var —
--   ALIŞ  : kampanya döneminde mal ALINAN kişisel hesaplar. Hesap başına
--           alım limiti olduğu için birden çok (s.ahmet, Seda, Eymen...).
--   SATIŞ : mal SATILAN mağaza hesabı (AXCALI).
-- Ölçüm: 13 hesabın 8'i yalnız alış, 2'si yalnız satış, 1'i ikisi,
-- 2'si hiç kullanılmamış.
--
-- Bu ayrım yapılmadığı için alım formu, satış formu, Kanal SKU ve hakediş
-- yükleme ekranı 13 hesabın HEPSİNİ gösteriyordu: Amazon'dan mal aldığınız
-- kişisel hesaba hakediş raporu yükleyebiliyordunuz.
--
-- ⚠ TABLO ADI BÜYÜK HARFLİ: Prisma `channelaccount` yazmıştı (Windows
-- MySQL katlaması). Elle düzeltildi, bekçi doğruluyor.

-- --------------------------------------------------------------------------
-- 1) KOLONLAR — ikisi de FALSE doğar
-- --------------------------------------------------------------------------
-- İkisi de false = ROL SEÇİLMEMİŞ. Böyle hesap hiçbir forma listelenmez ve
-- listede "rol seçilmedi" rozeti taşır. Varsayılan olarak bir tarafa
-- atamak, kullanıcının hiç görmediği bir kararı onun adına vermek olurdu.
ALTER TABLE `ChannelAccount` ADD COLUMN `alisIcin` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `satisIcin` BOOLEAN NOT NULL DEFAULT false;

-- --------------------------------------------------------------------------
-- 2) MEVCUT KAYITLARDAN ROL TÜRETME
-- --------------------------------------------------------------------------
-- Rol TAHMİN EDİLMİYOR, KULLANIMDAN OKUNUYOR: hesapta alım varsa alış
-- hesabıdır, satış varsa satış hesabıdır. Hiç kullanılmamışsa hiçbir şey
-- yazılmaz — kullanıcı kendisi seçer.
UPDATE `ChannelAccount` ca
SET `alisIcin` = true
WHERE EXISTS (SELECT 1 FROM `Purchase` p WHERE p.`channelAccountId` = ca.`id`);

UPDATE `ChannelAccount` ca
SET `satisIcin` = true
WHERE EXISTS (SELECT 1 FROM `Sale` s WHERE s.`channelAccountId` = ca.`id`);

-- Bu iki güncelleme sonrası ikisi de TRUE olan hesap, geçmişte hem alım hem
-- satış için kullanılmış demektir. Bu NORMAL BİR DURUM DEĞİLDİR (kullanıcı
-- kararı 12.08.2026); kayıt silinmez, ekranda amber uyarı ile gösterilir ve
-- ilgili alım/satış kayıtlarına bağlantı verilir.
