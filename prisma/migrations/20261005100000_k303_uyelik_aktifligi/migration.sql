-- K303 — üyelik aktifliği (kullanıcı kararı 05.10.2026). Yalnız sütun ekler;
-- varsayılan true olduğu için hiçbir üyeliğin durumu değişmez.
ALTER TABLE `UserCompanyRole` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
