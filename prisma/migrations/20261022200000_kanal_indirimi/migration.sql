-- K325-⑧: kanalın karşıladığı birim indirim (HB stopaj/ödeme gideri tabanı)
ALTER TABLE `SaleItem` ADD COLUMN `channelDiscountAmount` DECIMAL(18, 4) NULL;
