-- ============================================================================
--  TALEBE FİRMA BAĞI — SaaS hazırlığı, 16.08.2026
-- ----------------------------------------------------------------------------
--  Destek veren taraf GELİŞTİRİCİDİR; açan taraf müşteri firmadır. Bu alan
--  olmadan ikinci firma geldiği gün talepler karışır ve bir firma diğerinin
--  talebini okur.
--
--  ⚠ PRISMA'NIN ÜRETTİĞİ HÂLİ İKİ YERDEN BOZUKTU, ELLE DÜZELTİLDİ:
--
--  1. TABLO ADI KÜÇÜK HARFLE geldi (`talep`). Yerel MariaDB
--     `lower_case_table_names=1` ile çalışıp adı küçültüyor; CANLI MySQL
--     `lower_case_table_names=0` — harfe DUYARLI. Küçük harfle gitseydi
--     "Table doesn't exist" ile patlardı. (Bu, aynı tuzağın bu oturumdaki
--     ÜÇÜNCÜ tekrarı; `migration:kontrol` bekçisi bunun için var.)
--
--  2. DOLU TABLOYA `NOT NULL` sütun ekliyordu. Canlıda 1 talep var; Prisma
--     bunu kendi uyarısında da söylüyordu ("not possible if the table is
--     not empty"). Üç adıma bölündü: önce boş bırak, sonra doldur, sonra
--     zorunlu yap. Böylece mevcut kayıt KAYBOLMUYOR.
--
--  YIKICI DEĞİLDİR: hiçbir satır silinmez, hiçbir sütun düşürülmez.
--  `MODIFY` yalnız yeni eklenen sütunu boş bırakılamaz yapıyor — tip
--  değişmiyor, veri dönüşmüyor.
-- ============================================================================

-- 1) Önce BOŞ bırakılabilir olarak ekle (mevcut satırlar hayatta kalsın).
ALTER TABLE `Talep` ADD COLUMN `companyId` VARCHAR(191) NULL;

-- 2) Mevcut talepleri ilk firmaya bağla.
--    Bugün tek firma var (Axcalı); "en eski firma" ölçütü, kimlik elle
--    yazılmadığı için başka kurulumda da doğru çalışır.
UPDATE `Talep`
SET `companyId` = (SELECT `id` FROM `Company` ORDER BY `createdAt` ASC LIMIT 1)
WHERE `companyId` IS NULL;

-- 3) Artık boş satır kalmadı; zorunlu hâle getir.
ALTER TABLE `Talep` MODIFY `companyId` VARCHAR(191) NOT NULL;

-- 4) Dizin ve yabancı anahtar.
CREATE INDEX `Talep_companyId_idx` ON `Talep`(`companyId`);

ALTER TABLE `Talep` ADD CONSTRAINT `Talep_companyId_fkey`
  FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
