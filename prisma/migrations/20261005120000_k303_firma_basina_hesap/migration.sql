-- K303 — Model 2: firma başına hesap (kullanıcı kararı 05.10.2026).
-- E-posta tekilliği SİSTEMDEN FİRMA İÇİNE taşınır; her hesap bir firmaya aittir
-- (süper admin hariç, null). Sıra bilinçli: alan → doldur → eski tekillik kalkar
-- → yeni tekillik + yabancı anahtar. Ölçüldü (deneme, 05.10): 8 kişi = 7 tek
-- üyelikli + 1 süper admin (üyeliksiz); üyeliksiz ya da çok üyelikli kişi 0.

-- ① alan
ALTER TABLE `User` ADD COLUMN `hesapFirmasiId` VARCHAR(191) NULL;

-- ② doldur: süper admin olmayan her kişi, TEK üyeliğinin firmasına bağlanır.
--    Çok üyelikli kişi varsa alt sorgu birden çok satır döner ve migration DURUR
--    (yanlış firmaya sessizce bağlamak yerine).
UPDATE `User` u
SET u.`hesapFirmasiId` = (SELECT r.`companyId` FROM `UserCompanyRole` r WHERE r.`userId` = u.`id`)
WHERE u.`isSuperAdmin` = false;

-- ③ eski tekillik (sistemde tekil e-posta) kalkar
DROP INDEX `User_email_key` ON `User`;

-- ④ yeni tekillik (firma içinde) + yabancı anahtar
CREATE UNIQUE INDEX `User_hesapFirmasiId_email_key` ON `User`(`hesapFirmasiId`, `email`);
ALTER TABLE `User` ADD CONSTRAINT `User_hesapFirmasiId_fkey` FOREIGN KEY (`hesapFirmasiId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
