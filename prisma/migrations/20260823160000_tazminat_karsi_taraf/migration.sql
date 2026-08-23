-- ============================================================================
--  TAZMİNAT — KARŞI TARAF ÜÇ TÜRDEN BİRİ OLABİLİR
-- ----------------------------------------------------------------------------
--  Kaynak: docs/iade-sureci.md §12.1 · §11.4
--
--  İŞ DEĞERİ SOYUT DEĞİL — CANLI VAKA VAR:
--  İade `#11481463029`, 2 numaralı sayaçta ve 31.08.2026 12:35'te doluyor
--  (ölçüldü: Aras kargo takibi + Trendyol ekranı, 25 saniye farkla).
--  Dolarsa iade SEBEBİ NE OLURSA OLSUN otomatik onaylanır, para gider ve
--  karşılığında kargo şirketinden tazmin talep edilir. Bugün bu bağ yok →
--  kapanan iade sistemde sessizce KAYIP görünür, oysa ALACAKTIR.
--
--  ÖLÇÜLEN İKİ ENGEL:
--    · `supplierId` ZORUNLU ve karşı taraf kargo firması. Kargo firmaları
--      `Supplier`da DEĞİL, `CargoCarrier`da (8 tedarikçinin hepsi
--      pazaryeri/mağaza: AMZ · HB · TR · NON · TEK · MDIA · VTN · BI).
--    · Tazminat iadeye `returnItemId` ile bağlanıyor — ama bu vakada
--      `Return` HİÇ DOĞMUYOR (mal gelmedi), dolayısıyla `ReturnItem` de yok.
--
--  ⚠ KARGO FİRMALARI İKİNCİ KEZ `Supplier` OLARAK AÇILMADI. Aynı varlığın
--  iki kimliği olur ve bir gün ayrışırlar — Soundcore vakasının aynısı
--  (`194645027819` vs `194644037819`). `CargoCarrier` zaten var ve kargo
--  tarifesi ondan okunuyor; tazminat da ondan okuyacak.
--
--  ⚠ "EN AZ BİRİ DOLU" KISITI BURADA DEĞİL: Prisma bunu ifade edemiyor ve
--  MySQL CHECK'i şemadan yönetilemiyor. Kural UYGULAMA KATMANINDA duruyor
--  ve `tazminat:dogrula` onu sınıyor.
--
--  ── KURU KOŞUM (canlı, salt okuma, 23.08.2026) ──────────────────────────
--    Compensation toplam ....... 4   (OPEN=2 · SETTLED=2)
--      supplierId DOLU ......... 4   → NULLABLE'a çevrilmek satırları
--                                     ETKİLEMEZ; dolu kalırlar
--      purchaseItem'e bağlı .... 3
--      returnItem'e bağlı ...... 1
--      ikisine de bağsız ....... 0
--    CargoCarrier ............. 12   (ARAS · YURTICI · HEPSIJET · …)
--    ReturnNotice .............. 9
--
--  ⚠ ETKİLENEN SATIR: 0. Üç değişikliğin üçü de veri YAZMIYOR —
--  iki yeni kolon NULL doğuyor, biri zorunluluktan çıkıyor.
-- ============================================================================

-- ── 1) SUPPLIER ARTIK ZORUNLU DEĞİL ──────────────────────────────────────
--  Mevcut 4 kaydın dördünde de dolu; gevşetme onları bozmaz. Zorunluluk
--  kalkıyor çünkü karşı taraf kargo şirketi de olabilir.
ALTER TABLE `Compensation` MODIFY `supplierId` VARCHAR(191) NULL;

-- ── 2) KARŞI TARAF: KARGO ŞİRKETİ ────────────────────────────────────────
ALTER TABLE `Compensation` ADD COLUMN `carrierId` VARCHAR(191) NULL;

-- ── 3) KAYNAK: İADE BİLDİRİMİ ────────────────────────────────────────────
--  `returnItemId`in yanına, onun yerine DEĞİL: biri "iade işlendi, kalemi
--  hasarlı" der, öteki "iade hiç gelmedi ama alacak doğdu" der.
ALTER TABLE `Compensation` ADD COLUMN `returnNoticeId` VARCHAR(191) NULL;

-- ── İNDEKSLER ────────────────────────────────────────────────────────────
CREATE INDEX `Compensation_carrierId_idx`      ON `Compensation`(`carrierId`);
CREATE INDEX `Compensation_returnNoticeId_idx` ON `Compensation`(`returnNoticeId`);

-- ── YABANCI ANAHTARLAR ───────────────────────────────────────────────────
--  carrier → RESTRICT: tazminat talebi duran bir kargo firması silinemez;
--  silinirse talebin karşı tarafı kaybolur ve alacak sahipsiz kalır.
ALTER TABLE `Compensation`
  ADD CONSTRAINT `Compensation_carrierId_fkey`
  FOREIGN KEY (`carrierId`) REFERENCES `CargoCarrier`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

--  returnNotice → SET NULL: bildirim silinse bile TALEP KAYDI KALIR
--  (`purchaseItem` ve `returnItem` ile aynı desen). Alacak, kaynağından
--  bağımsız olarak yaşamaya devam eder.
ALTER TABLE `Compensation`
  ADD CONSTRAINT `Compensation_returnNoticeId_fkey`
  FOREIGN KEY (`returnNoticeId`) REFERENCES `ReturnNotice`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
