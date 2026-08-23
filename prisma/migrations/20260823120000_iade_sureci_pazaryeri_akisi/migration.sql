-- ============================================================================
--  İADE SÜRECİ — PAZARYERİ AKIŞINA HİZALAMA
-- ----------------------------------------------------------------------------
--  Kaynak: docs/iade-sureci.md (Trendyol satıcı uygulaması ekran kaydı +
--  kullanıcı anlatımı, 23.08.2026). Modelimiz akışın YARISINI tutuyordu.
--
--  ⚠ SADECE EKLEME — hiçbir değer silinmedi, hiçbir satır güncellenmiyor.
--  Mevcut 9 bildirim ve 5 iade aynen geçerli kalır. Yeni sütunların hepsi
--  NULL kabul ediyor; geri doldurma GEREKMEZ çünkü:
--    · `otomatikOnayTarihi` pazaryerinin BEYAN ETTİĞİ tarihtir — geçmişe
--      dönük uydurulamaz, kapanmış bildirimde zaten yoktur.
--    · `itirazGerekcesi` / `analizSonucu` yalnız itiraz dalında dolar.
--    · Kargo kodu/desi ileriye dönük alanlardır.
--
--  ⚠ ENUM'A DEĞER EKLEMEK MySQL'de MEVCUT SATIRLARI ETKİLEMEZ: `MODIFY`
--  yalnız izin verilen küme büyür. Değer SİLİNSEYDİ o değeri taşıyan satır
--  boşalırdı — bu yüzden `KULLANILMIS_ITIRAZ` gibi bize ait sınıflandırmalar
--  da listede bırakıldı.
-- ============================================================================

-- ── 1) BİLDİRİM DURUMU: üç yeni aşama ────────────────────────────────────
--  KARGOYA_VERILDI  "Kargoya Verilen"  — mal yolda (ara adım, atlanabilir)
--  ANALIZ           "Analiz"           — ürün serviste, 28 gün
--  ASKIDA           "Askıda İadeler"   — iade NORMAL AKIŞTAN ÇIKTI
ALTER TABLE `ReturnNotice`
  MODIFY `status` ENUM(
    'BEKLENIYOR',
    'KARGOYA_VERILDI',
    'MAL_GELDI',
    'ITIRAZ_ACILDI',
    'ITIRAZ_INCELEMEDE',
    'ANALIZ',
    'ITIRAZ_KABUL',
    'ITIRAZ_RED',
    'ASKIDA',
    'KAPANDI',
    'IPTAL'
  ) NOT NULL DEFAULT 'BEKLENIYOR';

-- ── 2) İADE SEBEBİ: pazaryerinin kendi listesi ───────────────────────────
--  Ölçüldü: müşteri uygulamasındaki 9 seçeneğin çoğunun karşılığı yoktu ve
--  hepsi DIGER'e düşüyordu. En kötüsü DIGER'e düşenler tam da PARASI GERİ
--  ALINABİLİR olanlardı (hasar → kargo tazminatı, eksik parça → tedarikçi).
ALTER TABLE `ReturnNotice`
  MODIFY `reason` ENUM(
    'DEGISIM',
    'DEGISIM_KUSURLU',
    'CALISMIYOR',
    'CAYMA',
    'KULLANILMIS_ITIRAZ',
    'YANLIS_URUN',
    'BEDEN_BUYUK',
    'BEDEN_KUCUK',
    'DAHA_UCUZ',
    'PARCA_EKSIK',
    'HASARLI',
    'BOS_PAKET',
    'URUN_EKSIK',
    'DIGER'
  ) NOT NULL;

-- ── 3) YENİ ALANLAR ──────────────────────────────────────────────────────
--  İKİ AYRI SAAT, İKİ AYRI SÜTUN:
--    otomatikOnayTarihi → ONLARIN ne zaman otomatik onaylayacağı (OLGU)
--    islemSonTarihi     → BİZİM ne zamana kadar yapmamız gerektiği (YÜKÜMLÜLÜK)
--  Tek sütuna sıkıştırılmadı: aynı anda ikisi de anlamlı olabilir.
--
--  ⚠ `otomatikOnayTarihi` HESAPLANMAZ, KAYDEDİLİR. Kuralı (kaç günden, hangi
--  andan) ölçemedik — iki kayıt farklı toplam verdi (~34,6 ve ~15,8 gün,
--  docs/iade-sureci.md §8.1). Bilmediğimiz bir kuraldan tarih türetmek,
--  sistemin takip etmediği şey hakkında iddia kurmak olurdu.
ALTER TABLE `ReturnNotice`
  ADD COLUMN `otomatikOnayTarihi` DATETIME(3) NULL,
  ADD COLUMN `islemSonTarihi`     DATETIME(3) NULL,
  ADD COLUMN `itirazGerekcesi` ENUM(
    'KULLANILMIS',
    'IADE_YANLIS',
    'HIJYEN',
    'ANALIZ_TALEBI',
    'DEGISIM',
    'HASARLI',
    'EKSIK',
    'KUSURSUZ_GONDERILDI'
  ) NULL,
  ADD COLUMN `analizSonucu` ENUM(
    'TAMIR_EDILDI',
    'DEGISIM_YAPILDI',
    'SORUN_BULUNAMADI'
  ) NULL,
  ADD COLUMN `iadeKargoKodu` VARCHAR(191) NULL,
  ADD COLUMN `iadeDesi`      DECIMAL(10, 2) NULL;

-- ── 4) İNDEKSLER — "süresi dolmak üzere olanlar" sorgusu ─────────────────
--  Panel çanı ve iade ekranı bu iki tarihe göre sıralayacak. İndekssiz
--  tam tablo taraması, bildirim sayısı büyüdükçe her panel açılışını yer.
CREATE INDEX `ReturnNotice_otomatikOnayTarihi_idx` ON `ReturnNotice`(`otomatikOnayTarihi`);
CREATE INDEX `ReturnNotice_islemSonTarihi_idx`     ON `ReturnNotice`(`islemSonTarihi`);
