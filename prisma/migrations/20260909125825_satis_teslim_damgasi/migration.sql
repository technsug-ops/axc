-- K195-2 — TESLİM TARAFI (kargo damgasının kardeşi)
--
-- ⚠ TABLO ADI `Sale` — BÜYÜK HARFLE. `prisma migrate diff` bunu Windows'ta
-- `sale` diye üretti (yerel MySQL harfe duyarsız); canlı Linux'ta harfe
-- DUYARLI ve orada tablo `Sale`. Küçük harfle gitseydi migration canlıda
-- "table doesn't exist" ile düşerdi. Bekçisi: `npm run migration:kontrol`.
--
-- Yalnız EKLER, hiçbir şeyi değiştirmez: üç sütun da NULL kabul ediyor,
-- geri doldurma yok, varsayılan yok. Boş = "kanal henüz söylemedi".

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `deliveredAt` DATETIME(3) NULL,
    ADD COLUMN `kanalKargoFirmasi` VARCHAR(191) NULL,
    ADD COLUMN `kargoTakipBaglantisi` VARCHAR(500) NULL;
