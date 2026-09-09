-- K201 — TAHMİNİ KARGO (kanalın kestiği DEĞİL, bizim hesabımız)
--
-- ⚠ TABLO ADI `Sale` — BÜYÜK HARFLE. `prisma migrate diff` bunu bu makinede
-- yine `sale` diye üretti (bugün DÖRDÜNCÜ kez). Canlı Linux'ta MySQL harfe
-- DUYARLI ve orada tablo `Sale`. Bekçisi: `npm run migration:kontrol`.
--
-- ⛔ `cargoAmount`a DOKUNMAZ. Gerçekleşen kesinti orada kalır; bu sütun
-- hakediş gelene kadar kullanılacak TAHMİNİ taşır ve hakediş gelince
-- SİLİNMEZ — iki sütun yan yana durur, "ne kadar yanılmışız" sorulabilsin.
--
-- Yalnız EKLER: NULL kabul ediyor, varsayılan yok, geri doldurma yok.

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `tahminiKargo` DECIMAL(18, 4) NULL;
