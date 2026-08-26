-- A3-③ İÇE AKTARMA İZİ
--
-- İki alan, ikisi de NULLABLE ve GERİ DOLDURULMAZ:
--   importBatch  — toplu yazımın kimliği; geri alma bu alanla yapılır
--   importKaynak — 'enumerasyon' | 'hakediş çaprazı'
--
-- ⚠ ELLE GİRİLEN 111 SATIŞTA NULL KALIR ve bu DOĞRUDUR. Uydurulamaz:
--   o satırlar bir içe aktarmadan gelmedi. NULL burada "bilinmiyor"
--   değil, "içe aktarma değil" demek.
--
-- ⚠ VARSAYILAN YOK: `DEFAULT ''` konsaydı elle girilen satırla içe
--   aktarılan satır ayırt edilemezdi ve ayrımın kendisi bilgi.
ALTER TABLE `Sale`
  ADD COLUMN `importBatch` VARCHAR(191) NULL,
  ADD COLUMN `importKaynak` VARCHAR(191) NULL;

-- Geri alma tüm partiyi bu alandan bulacak.
CREATE INDEX `Sale_importBatch_idx` ON `Sale`(`importBatch`);
