-- K304 — GENİŞLET → DARALT, ikinci adım: eski `Finansman.currency` düşürülür
-- (kullanıcı onayı 29.09.2026).
--
-- ⚠ SIRA ÖLÇÜLDÜ: alan şemadan K304-③ ile (aa549e1) çıktı ve o kod CANLIDA —
-- Prisma artık bu sütunu SEÇMİYOR. Yerini `birim` aldı (K304-②, değer taşındı).
-- Ölçüldü 29.09.2026: taşınmamış değer yok (canlıda finansman kaydı 0'dı).

-- AlterTable
ALTER TABLE `Finansman` DROP COLUMN `currency`;
