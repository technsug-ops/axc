-- K197-4 — KANALIN BİLDİRDİĞİ GERÇEKLEŞEN DESİ
--
-- ⚠ TABLO ADI `Sale` — BÜYÜK HARFLE. `prisma migrate diff` bunu bu makinede
-- yine `sale` diye üretti (Windows'ta MySQL harfe DUYARSIZ); canlı Linux'ta
-- DUYARLI ve orada tablo `Sale`. Bugün ÜÇÜNCÜ kez aynı şey oldu — araç
-- düzelmiyor, koruma her seferinde çalışıyor. Bekçisi: `migration:kontrol`.
--
-- ⛔ DEFTERE DOKUNMAZ: bu sütun `cargoAmount`ı, NET'i ve kâr hesabını
-- ETKİLEMEZ. Yalnız EKLER — NULL kabul ediyor, varsayılan yok, geri
-- doldurma yok. Boş = "kanal bu paket için desi söylemedi (ya da satış
-- sütun açılmadan önceydi)".

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `kanalKargoDesi` DECIMAL(9, 3) NULL;
