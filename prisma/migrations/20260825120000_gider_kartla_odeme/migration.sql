-- ============================================================================
--  GİDER KARTLA ÖDENEBİLİR — KART BORCUNUN EKSİK YARISI
-- ----------------------------------------------------------------------------
--  Kullanıcı 25.08.2026: _"giderleri ve vergileri de kartla ödüyorum; bugün
--  4-5 binlik vergi ödedim. Kartlarla sadece ürün almıyorum."_
--
--  ⚠ ÖLÇÜLEN BOŞLUK: kart borcu `kartBorcuHesapla(alimlar, …)` ile YALNIZ
--  alımlardan hesaplanıyordu. Kartla ödenen her gider borçta HİÇ
--  görünmüyordu — kart borcu ekranı ve NAKİT TAKVİMİ o kadar eksik
--  gösteriyordu. Bugünkü ~₺4-5 bin vergi hiçbir yerde yoktu.
--
--  ⚠ MERDİVEN ÖLÇÜLEREK İNİLDİ (şema en pahalı çözümdür):
--    ① Mevcut alan: `Expense.kartOdemesi` VAR ama TERS YÖNDE — kart
--       ekstresi ödenirken doğan gecikme faizini gidere bağlıyor.
--       "Bu gideri şu kartla ödedim" demiyor. ✗
--    ② Serbest metin (`description`): borç hesabı SORGU istiyor
--       (kart bazında, dönem bazında gruplama), geriye bakış değil.
--       Serbest metinden borç toplanamaz. ✗
--    ③ Türetme: hangi giderin hangi kartla ödendiği sistemde HİÇBİR
--       yerden çıkmıyor — girdisi yok. ✗
--    ④ SÜTUN ✓
--
--  ⚠ ADLAR ALIMLA BİREBİR AYNI (`creditCardId` · `installmentCount`).
--  İki yerde iki farklı ad, iki farklı zihin modeli demekti; aynı ad,
--  aynı anlam, aynı hesap gövdesi (`BorcAlimi`).
--
--  ⚠ TAKSİT NİYE VAR — İLK KARAR ÇEVRİLDİ. Kullanıcı önce "taksite gerek
--  yok" dedi, sonra düzeltti ve gerekçesi net: _"devlete peşin kartla
--  ödüyorum, sonra banka uygulamasına girip taksit seçeneği varsa
--  böldürüyorum."_ Taksit ödeme ANINDA değil SONRADAN bankada seçiliyor —
--  ama karta yansıyan borç taksitli. Tek çekim varsayılsaydı borç yanlış
--  aya yığılır ve nakit takvimi yine yanlış çıkardı.
--
--  ⚠ GERİ DOLDURMA YOK ve bu DOĞRU. Mevcut 10 giderin hangisinin kartla
--  ödendiğini sistem bilmiyor; uydurulmuş bir kart bağı, kart borcunu
--  OLMAYAN bir borçla şişirirdi. Boş kalır, kullanıcı isterse tek tek
--  girer.
--
--  ⚠ `ON DELETE SET NULL` — alımdaki davranışın aynısı. Kart silinirse
--  gider kaydı YAŞAR, yalnız kart bağı düşer. `Restrict` olsaydı bir kart
--  hiç silinemez hâle gelirdi.
-- ============================================================================

ALTER TABLE `Expense` ADD COLUMN `creditCardId` VARCHAR(191) NULL;

ALTER TABLE `Expense` ADD COLUMN `installmentCount` INTEGER NOT NULL DEFAULT 1;

CREATE INDEX `Expense_creditCardId_idx` ON `Expense`(`creditCardId`);

ALTER TABLE `Expense` ADD CONSTRAINT `Expense_creditCardId_fkey`
  FOREIGN KEY (`creditCardId`) REFERENCES `CreditCard`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
