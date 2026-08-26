-- K55 ALIŞ İÇE AKTARMA İZİ
--
-- İki alan, ikisi de NULLABLE ve GERİ DOLDURULMAZ:
--   importBatch  — toplu yazımın kimliği; geri alma bu alanla yapılır
--   importKaynak — bugün tek değer: 'alis-excel'
--
-- ⚠ ELLE GİRİLEN 385 ALIMDA NULL KALIR ve bu DOĞRUDUR. NULL burada
--   "bilinmiyor" değil, "içe aktarma değil" demek.
--
-- ⚠ `supplierOrderNo` BU İŞİ GÖREMEZ: o tedarikçinin sipariş numarası
--   ve elle girilen kayıtlarda da dolu (355/385). İki anlamı tek kolona
--   koymak, o kolonu okuyan her sorguyu kirletirdi.
ALTER TABLE `Purchase`
  ADD COLUMN `importBatch` VARCHAR(191) NULL,
  ADD COLUMN `importKaynak` VARCHAR(191) NULL;

-- Geri alma tüm partiyi bu alandan bulacak.
CREATE INDEX `Purchase_importBatch_idx` ON `Purchase`(`importBatch`);
