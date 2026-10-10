-- K303 Aşama 4 (03.10.2026): FİRMA BAĞ KAPISI — bir kayıt BAŞKA firmanın kaydına bağlanamaz.
-- ÜRETİLMİŞ: scripts/firma-bag-tetikleyici-uret.ts (şemadan; elle düzenlemeyin).
-- Veritabanı tetikleyicisi: aynı işlemin içini görür; Prisma tetikleyicileri yönetmez.
-- İhlal: SQLSTATE 45000 'FIRMA_BAG_IHLALI: <tablo>.<alan> -> <hedef>'.

CREATE TRIGGER `VaryantGorseli_firma_bag_ekle` BEFORE INSERT ON `VaryantGorseli` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: VaryantGorseli.variantId -> ProductVariant';
    END IF;
  END IF;
END;

CREATE TRIGGER `VaryantGorseli_firma_bag_guncelle` BEFORE UPDATE ON `VaryantGorseli` FOR EACH ROW
BEGIN
  IF @selliora_bag_kapisi_kapali IS NULL THEN
    IF NEW.`variantId` IS NOT NULL AND (NOT (NEW.`variantId` <=> OLD.`variantId`) OR NOT (NEW.`companyId` <=> OLD.`companyId`)) AND NOT EXISTS (SELECT 1 FROM `ProductVariant` WHERE `id` = NEW.`variantId` AND `companyId` = NEW.`companyId`) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FIRMA_BAG_IHLALI: VaryantGorseli.variantId -> ProductVariant';
    END IF;
  END IF;
END;
