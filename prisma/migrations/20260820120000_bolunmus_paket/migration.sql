-- ============================================================================
--  BÖLÜNMÜŞ PAKET — paket başına hizmet bedeli
-- ----------------------------------------------------------------------------
--  ÖLÇÜLDÜ 20.08.2026, Trendyol panelinden:
--    11438745987 (1 paket)  -> platform hizmet 13,19
--    11361665302 (2 paket)  -> platform hizmet 26,38  = 2 × 13,19
--
--  Motor bu bedeli SİPARİŞ BAŞINA sabit sayıyordu; bölünmüş her siparişte
--  kesinti eksik, kâr ŞİŞKİN hesaplanıyordu.
--
--  ⚠ GERİ DOLDURMA YOK: `DEFAULT 1` mevcut bütün satırları doğru bırakır —
--  bölünmemiş sipariş zaten tek pakettir.
--
--  ⚠ ENUM GENİŞLETMESİ, DEĞER DEĞİŞTİRMESİ DEĞİL: mevcut PER_SALE ve
--  PER_ITEM satırlarına DOKUNULMAZ. TY'nin SABIT_GIDER kuralı ayrı bir
--  onayla ve ayrı bir adımda PER_PACKAGE'a taşınacak (veri işi, şema işi
--  değil).
-- ============================================================================

-- AlterTable
ALTER TABLE `Sale` ADD COLUMN `paketSayisi` INTEGER NOT NULL DEFAULT 1;

-- AlterEnum: FeeScope += PER_PACKAGE
ALTER TABLE `ChannelFee` MODIFY COLUMN `scope` ENUM('PER_SALE', 'PER_ITEM', 'PER_PACKAGE') NOT NULL;
