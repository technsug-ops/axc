-- ============================================================================
--  GÖNDERİ (TAKİP) NUMARASI — SATIŞA ELLE GİRİLEN BEŞİNCİ KOD (K41①)
-- ----------------------------------------------------------------------------
--  Halil kararı 24.08.2026: gönderi numarası da sipariş numarası gibi
--  sisteme ELLE girilir ve mevcut aramalara katılır.
--
--  ⚠ NİYE SÜTUN — merdiven ölçülerek inildi (şema en pahalı çözümdür):
--    ① Mevcut alan: `Sale.code` sipariş numarası, DOLU. Başka kimlik
--       alanı yok. ✗
--    ② Serbest metin (`Sale.note`): alan ARANACAK ve BENZERSİZ olacak;
--       serbest metinde benzersizliği veritabanı zorlayamaz, yani
--       "girilirse benzersiz" sözü tutulamazdı. ✗
--    ③ Türetme: kod pazaryerinde/kargoda oluşuyor, bizde hesaplanacak
--       hiçbir girdisi yok. ✗
--    ④ SÜTUN ✓
--
--  ⚠ NULLABLE @unique — MySQL birden çok NULL'a izin verir. `Sale.code`
--  ile birebir aynı davranış; boş bırakılabilir, GİRİLİRSE benzersiz.
--  Benzersizlik şart: aynı kod iki satışta olsaydı okutma İKİ sonuç
--  döndürür ve hangisinin doğru olduğu bilinemezdi.
--
--  ⚠ GERİ DOLDURMA YOK ve bu DOĞRU. Kod pazaryerinde SONRADAN oluşuyor;
--  göç anında 125 satışın 125'inde boş kalır. Uydurulmuş bir takip
--  numarası, hiç olmayandan kötüdür — okutulduğunda yanlış siparişi
--  açardı.
-- ============================================================================

ALTER TABLE `Sale` ADD COLUMN `shipmentCode` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `Sale_shipmentCode_key` ON `Sale`(`shipmentCode`);
