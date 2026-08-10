-- ===========================================================================
--  VERİ TAŞIMA — serbest metin tedarikçi adları Supplier kayıtlarına
-- ---------------------------------------------------------------------------
--  Tedarikçi bugüne kadar `purchase.supplierName` içinde serbest metindi.
--  Faz 3'te tazminat bir TEDARİKÇİYE açıldığı için kayıt olması gerekti.
--
--  KURAL (kullanıcı kararı 10.08.2026): aynı yazım = aynı tedarikçi.
--  Baştaki/sondaki boşluk kırpılır; onun dışında yazım aynen korunur —
--  "Er Ticaret" ile "er ticaret" ayrı kalır, çünkü hangisinin doğru olduğuna
--  karar vermek bu betiğin işi değil. Ekrandan birleştirilebilir.
--
--  VERİ KAYBI YOK: `supplierName` sütunu DURUYOR. Eski kayıtların yazıldığı
--  hâli ve içe aktarma izi olarak kalıcıdır; yalnızca yanına `supplierId`
--  eklendi.
--
--  TEKRAR ÇALIŞTIRILABİLİR: `INSERT ... WHERE NOT EXISTS` ve boş `supplierId`
--  koşulu sayesinde ikinci koşumda hiçbir şey değişmez.
-- ===========================================================================

-- 1) Benzersiz adlar için tedarikçi kaydı aç.
INSERT INTO `Supplier` (`id`, `name`, `isActive`, `createdAt`, `updatedAt`)
SELECT UUID(), TRIM(p.`supplierName`), TRUE, NOW(3), NOW(3)
FROM `Purchase` p
WHERE p.`supplierName` IS NOT NULL
  AND TRIM(p.`supplierName`) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM `Supplier` s WHERE s.`name` = TRIM(p.`supplierName`)
  )
GROUP BY TRIM(p.`supplierName`);

-- 2) Alımları o kayıtlara bağla.
UPDATE `Purchase` p
JOIN `Supplier` s ON s.`name` = TRIM(p.`supplierName`)
SET p.`supplierId` = s.`id`
WHERE p.`supplierName` IS NOT NULL
  AND TRIM(p.`supplierName`) <> ''
  AND p.`supplierId` IS NULL;
