-- K273 — ÜRÜN GÖRSELİ (pazaryerinden otomatik)
--
-- ⚠ TABLO ADI `ProductVariant` — BÜYÜK HARFLE (canlı Linux'ta harfe DUYARLI;
-- bkz. `migration:kontrol`). Bu dosya elle yazıldı.
--
-- ⛔ DEFTERE DOKUNMAZ: yalnız dört boş sütun EKLER — NULL kabul ediyor,
-- varsayılan yok, geri doldurma yok. Görseller senkronla dolar; boş = "hiçbir
-- kaynakta görsel yok" (uydurulmaz).

-- AlterTable
ALTER TABLE `ProductVariant`
  ADD COLUMN `gorselUrl` VARCHAR(500) NULL,
  ADD COLUMN `gorselKaynak` ENUM('ELLE', 'TRENDYOL', 'N11') NULL,
  ADD COLUMN `gorselAt` DATETIME(3) NULL,
  ADD COLUMN `gorselKirikUrl` VARCHAR(500) NULL;
