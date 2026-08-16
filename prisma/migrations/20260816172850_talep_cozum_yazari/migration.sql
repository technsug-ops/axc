-- ============================================================================
--  ÇÖZÜM NOTUNUN YAZARI VE ZAMANI — Faz 2 (mesaj dizisi) hazırlığı
-- ----------------------------------------------------------------------------
--  Mimar vizyonu 16.08.2026: talep Faz 2'de bir MESAJ DİZİSİ taşıyacak
--  (TalepMesaj). Geçişin YENİDEN YAZIM değil temiz bir göç olması için
--  bugünkü tek notun YAZARI ve ZAMANI şimdiden tutulmalı:
--
--    INSERT INTO TalepMesaj (talepId, gonderenId, gonderenTipi, metin, createdAt)
--    SELECT id, cozumNotuYazanId, 'GELISTIRICI', cozumNotu, cozumNotuZamani
--    FROM Talep WHERE cozumNotu IS NOT NULL;
--
--  `updatedAt` bu iş için KULLANILAMAZ: her durum değişikliğinde ezilir ve
--  notun yazıldığı anı değil, kaydın en son dokunulduğu anı söyler.
--
--  İKİSİ DE NULL: mevcut kayıtlar bozulmuyor, geçmiş notların yazarı
--  bilinmiyor olarak kalıyor (uydurmuyoruz).
--
--  ⚠ TABLO ADI ELLE BÜYÜK HARFE ÇEVRİLDİ. Prisma `talep` üretti; yerel
--  MariaDB adı küçültüyor, canlı MySQL harfe DUYARLI. Bu tuzağın bu
--  oturumdaki DÖRDÜNCÜ tekrarı.
--
--  YIKICI DEĞİLDİR: iki nullable sütun + bir yabancı anahtar. Silme yok.
-- ============================================================================

-- AlterTable
ALTER TABLE `Talep` ADD COLUMN `cozumNotuYazanId` VARCHAR(191) NULL,
    ADD COLUMN `cozumNotuZamani` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `Talep` ADD CONSTRAINT `Talep_cozumNotuYazanId_fkey`
  FOREIGN KEY (`cozumNotuYazanId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
