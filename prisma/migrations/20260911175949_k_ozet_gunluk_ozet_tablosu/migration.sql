-- K-OZET — GÜNLÜK ÖZET (LLM ANLATISI) ÖNBELLEĞİ
--
-- ⚠ TABLO ADI `AiOzet` — BÜYÜK HARFLE (bkz. "üretilen migration'ın tablo
-- adı, üretildiği makineyi anlatır" — Windows'ta MySQL harfe DUYARSIZ,
-- canlı Linux'ta DUYARLI). Bu dosya ELLE yazıldı (yerel geliştirme
-- veritabanında `prisma migrate dev`in reddettiği bir drift vardı — iki
-- ESKİ migration checksum uyuşmazlığı, bu yeni tabloyla ilgisiz), bu
-- yüzden isim otomatik üretim riskini taşımıyor ama yine de `migration:kontrol`
-- ile doğrulanır.
--
-- ⛔ SAF EKLEME: hiçbir var olan tabloya dokunmaz, hiçbir foreign key yok
-- (bilerek — companyId de yok, bkz. şema başlığındaki gerekçe).

-- CreateTable
CREATE TABLE `AiOzet` (
    `id` VARCHAR(191) NOT NULL,
    `isGunu` DATE NOT NULL,
    `girdiJson` TEXT NOT NULL,
    `anlatiMetni` TEXT NULL,
    `durum` ENUM('YAYINDA', 'REDDEDILDI', 'HATA') NOT NULL,
    `dogrulamaJson` TEXT NOT NULL,
    `modelAdi` VARCHAR(191) NOT NULL,
    `girdiTokenSayisi` INTEGER NULL,
    `ciktiTokenSayisi` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiOzet_isGunu_createdAt_idx`(`isGunu`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
