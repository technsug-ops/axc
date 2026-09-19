-- K220 — TRENDYOL ÖDEME EMRİ KİMLİĞİ
--
-- ⚠ TABLO ADI `SettlementItem` — BÜYÜK HARFLE (canlı Linux'ta harfe DUYARLI;
-- bkz. `migration:kontrol`). Bu dosya elle yazıldı — `prisma migrate diff`
-- Windows'ta yanlış harfle üretebiliyor (ölçülmüş, tekrarlayan bir tuzak).
--
-- ⛔ DEFTERE DOKUNMAZ: yalnız EKLER — NULL kabul ediyor, varsayılan yok,
-- geri doldurma yok. Boş = "bu kalem TY API'den değil Excel'den geldi,
-- ya da API henüz bir ödeme emrine bağlamadı".

-- AlterTable
ALTER TABLE `SettlementItem` ADD COLUMN `paymentOrderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `SettlementItem_paymentOrderId_idx` ON `SettlementItem`(`paymentOrderId`);
