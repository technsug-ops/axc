# Çok firmalı yapı (multi-tenancy) — tasarım belgesi

_K303 · 28.09.2026 · Aşama 1 (tasarım). Bu belge KOD DEĞİLDİR; hiçbir şema
değişikliği, migration ya da canlı yazım içermez. Her uygulama aşaması ayrı
onayla açılır._

## 0. Karar ve sıra

- **Kullanıcı kararı 28.09.2026:** çok firmalı veri katmanına ŞİMDİ geçilir.
  13.08.2026 kararı («önce tek firma tamamlanır, sonra çok-firma, SaaS en
  son») bu noktada ÇEVRİLDİ: tek firma tarafında açık kalan Hepsiburada yazma
  (Faz 4'ün son maddesi) ve Halil testi bekleyen paketler SONRAYA kaldı.
  Eski gerekçe `CLAUDE.md`de silinmeden duruyor.
- SaaS'a özel işler (kayıt sayfası, faturalama, plan/abonelik) bu kapsamda
  DEĞİL. Kapsam: **veri katmanında firma ayrımı** + ikinci firmanın
  yöneticinin eliyle açılabilmesi.

## 1. Ölçülen başlangıç durumu (canlı, salt okuma, 28.09.2026)

| Ölçüm | Değer |
|---|---|
| Firma | **1** (`AXC`, aktif) |
| Kullanıcı–firma–rol üyeliği | 3, hepsi `AXC` |
| Şemadaki model | 51 |
| `companyId` taşıyan model | 3 — `UserCompanyRole` · `AuditLog` · `Talep` |
| Veritabanına giden dosya (`src/`) | 233 |
| Ham SQL (`$queryRaw`/`$executeRaw`) | 5 uygulama dosyası, 26 kullanım |
| Zamanlanmış çekim | 7 (`ty/hb/n11-cekim` · `ty/hb-hakedis-cekim` · `listeleme-cekim` · `ozet-uret`) |
| Pazaryeri kimlikleri | `.env` içinde TEK takım (TY · HB · HB-SIT · N11) |

Örnek hacim: ürün 1863 · varyant 1874 · stok hareketi 15383 · satış 8229 ·
satış kalemi 8378 · alım 2222 · hakediş kalemi 9105 · kanal SKU 2340 ·
kargo tarifesi 89912.

### ⚠ İki bulgu

1. **`AuditLog.companyId` 76.310 satırın 76.310'unda BOŞ.** Alan şemada
   duruyor, yazıcı (`izYaz`) onu kabul ediyor ama çağıranların hiçbiri
   geçirmiyor. Anayasa: _«şemadaki alan da bir iddiadır — yazıcısı yoksa vaat
   boştur»._ Aşama 2'de geçmiş `AXC`ye bağlanır; Aşama 3'te iz firma
   bağlamından OTOMATİK dolar (çağıranın hatırlamasına bırakılmaz).
2. **Firma adı yapıya gömülü DEĞİL.** `AXCALI` geçen 12 dosyanın hepsi yorum
   ya da ölçüm etiketi. Anayasadaki adlandırma kuralı tutmuş.

## 2. Hangi veri kimin — sınıflandırma

**Kullanıcı kararı 28.09.2026:** ortak veri = kanal tanımları + izin listesi +
kargo firmaları ve kargo tarifeleri. Geri kalan her şey firmaya ait.

### Ortak (firma alanı YOK)

| Model | Gerekçe |
|---|---|
| `Channel` | «Trendyol, Hepsiburada…» tanımı herkes için aynı |
| `CargoCarrier` · `CargoTariff` | kullanıcı kararı — herkes aynı kargo tarifesini görür |
| `User` | kimlik küreseldir; bir kişi birden fazla firmaya ÜYE olabilir (`UserCompanyRole`) |
| `Company` | firmanın kendisi |
| izin anahtarları | kodda (`lib/yetki/izinler.ts`), tablo değil |

⚠ **Bilinen bedel (kargo ortak):** anlaşmalı fiyatı olan bir firma kendi
tarifesini giremez. Bu ihtiyaç doğduğunda çözüm «firma tarifesi varsa o, yoksa
ortak tarife» katmanıdır — bugün açılmaz.

### Firmaya ait (`companyId` ZORUNLU)

Ürün ve katalog: `Product` · `ProductVariant` · `VariantOption` · `EskiKod` ·
`Category` · `Brand` · `TyKategoriEslesme` · `DepoBolumu` · `Location` ·
`Supplier`

Kanal: `ChannelAccount` · `ChannelSku` · `ChannelFee` · `PenaltyTariff` ·
`KomisyonTarifesi` · `KomisyonTarifeKalemi`

Para ve defter: `Purchase` · `PurchaseItem` · `StockMovement` · `Sale` ·
`SaleItem` · `SaleFee` · `Return` · `ReturnNotice` · `ReturnItem` ·
`ReturnFee` · `Attachment` · `Expense` · `ExpenseCategory` ·
`ExpenseTemplate` · `Compensation` · `Settlement` · `SettlementItem` ·
`CreditCard` · `KartOdeme` · `GecmisEkstre` · `StockAdjustmentReason` ·
`StokSayimi` · `StokSayimSatiri` · `MuhasebeDonemi` · `AiOzet`

Yetki ve iz: `Role` · `RolePermission` · `UserCompanyRole` (var) ·
`AuditLog` (var, boş) · `Talep` (var, zorunlu)

⚠ **`ChannelFee` ve `PenaltyTariff` firmaya ait** — anayasa: _«komisyon, ücret
ve kargo tarifeleri veri olarak tutulur, her müşteri kendi setini kullanır»_;
kullanıcı kararı yalnız KARGOYU ortak yaptı. İstenirse bu iki tablo da
sonradan ortağa alınabilir; ters yön (ortaktan firmaya) veriyi bölmeyi
gerektirdiği için daha pahalıdır.

**Neden çocuk tablolarda da `companyId`:** (`SaleItem`, `StockMovement`…)
otomatik süzgeç her sorguda doğrudan o tablonun kendi alanına bakabilsin;
«ebeveynden türet» kuralı her sorguda bir birleştirme ister ve süzgeç o
birleştirmeyi unutan tek sorguda delinir.

## 3. Tekillik kuralları — «sistemde tekil» → «firma içinde tekil»

| Bugün küresel tekil | Olacak |
|---|---|
| `ProductVariant.sku` · `barcode` · `companySku` | `(companyId, alan)` |
| `EskiKod.kod` | `(companyId, kod)` |
| `Category.name` · `code` · `Brand.anahtar` · `code` · `TyKategoriEslesme.tyKategori` | `(companyId, alan)` |
| `DepoBolumu.kisaltma` · `Location.code` · `Supplier.name` · `code` | `(companyId, alan)` |
| `Purchase.code` · `Sale.code` · `Sale.shipmentCode` · `StokSayimi.kod` · `Talep.kod` | `(companyId, alan)` |
| `ExpenseCategory.name` · `StockAdjustmentReason.name` · `systemKey` | `(companyId, alan)` |
| `ChannelAccount (channelId, code)` · `MuhasebeDonemi (yil, ay)` | başa `companyId` eklenir |

Değişmeyenler: `ChannelSku`, `SettlementItem`, `KomisyonTarifesi` tekillikleri
zaten `channelAccountId` üzerinden firmaya bağlı. `KartOdeme.faizGiderId` ·
`reversesId` · `ReturnNotice.returnId` kimliğe bağlı, firma-bağımsız.

⚠ **Aynı EAN iki firmada olabilir** — iki satıcı aynı ürünü satar. Barkod
araması (`kodKosulu`, `kodlaVaryantCoz`) bu yüzden firma süzgecinin İÇİNDE
koşmak zorunda; aksi hâlde K224'teki «iki varyant aynı kod» çakışması firmalar
arasında yeniden doğar.

## 4. Ayırma mekanizması — otomatik süzgeç + bekçi

**Kullanıcı kararı 28.09.2026.** MySQL'de satır düzeyi güvenlik yok; koruma
uygulama katmanında **mekanizmaya** bağlanır (anayasa: _«güvenlik mekanizmaya
bağlanır, disipline değil»_).

1. **İstek bağlamı.** Her istek başında aktif firma `AsyncLocalStorage`'a
   konur (`yetkiBaglami().companyId`'den). Bağlam yoksa firma verisine giden
   sorgu HATA VERİR — «firma bilinmiyor → hepsini göster» diye bir dal YOK.
2. **Firma istemcisi** (`$extends`, Prisma 7.9.1'de kararlı — paketin kendi
   tipinde `$allModels` doğrulandı). Firmaya ait modellerde:
   - okuma/sayma/toplama/güncelleme/silme → `where`e `companyId` EKLENİR
     (`AND` ile — anayasa: _«koşul AND ile eklenir, spread ile değil»_);
   - oluşturma → `data.companyId` bağlamdan YAZILIR; farklı bir değer
     gönderilirse HATA;
   - `findUnique` (tekil anahtar firma içermez) → sonuç bağlamın firmasına
     ait değilse `null`.
3. **Desen yasağı bekçisi** (dosya listesi TUTMAZ, anayasa): `src/` altında
   çıplak `prisma` kullanımı yasak; yalnız beyanlı yerler istisna
   (`SISTEM:` gerekçesiyle — giriş ekranı, cron döngüsünün kendisi).
4. **Ham SQL** (5 dosya) süzgeçten GEÇMEZ — her biri `companyId` parametresini
   açıkça taşır ve bekçi `$queryRaw` içeren her dosyada `companyId` geçişini
   kullanım bloğunda arar.
5. **Bilinen delik ve kapısı:** ilişki üzerinden okumalar (`include`) süzgeçten
   geçmez. Ebeveyn süzüldüğü için çocuk kendiliğinden doğru firmadadır —
   **şartı**: bir kayıt BAŞKA firmanın kaydına bağlanamasın. Yazma kapısı
   bağlanan kimliklerin (`variantId`, `channelAccountId`, `purchaseItemId`…)
   aynı firmada olduğunu doğrular; bekçi bu kapıyı mutasyonla sınar.

⛔ **İzolasyon bekçisi (Aşama 4) iki yönlü sınanır:** A firmasının oturumu B'nin
satırını GÖRMEMELİ (yanlış susma) ve kendi satırını KAYBETMEMELİ (yanlış
yanma). Süzgeci kaldıran mutasyon kırmızı yanmadan teslim edilmez.

## 5. Arka plan işleri ve kimlikler

- **Çekimler** (7 cron) firma firma döner: «kimliği tanımlı aktif her firma
  için, o firmanın bağlamında». Bir firmanın hatası ötekini durdurmaz ve
  ekranda firma adıyla yazar (İlke #5).
- **Pazaryeri kimlikleri** `.env`den veritabanına, **firma × kanal hesabı**
  başına taşınır; ŞİFRELİ saklanır (anahtar `.env`de, tek). `AXC`nin bugünkü
  kimlikleri geçişte kendi hesaplarına yazılır; `.env` satırları bir süre
  yedek olarak kalır, birincil sayılmaz.
- **Betikler** (`scripts/canli-*`) firma parametresi ister; parametresiz koşum
  HATA verir — bugün tek firma olduğu için sessizce «hepsi» üzerinde koşarlar.

## 6. Geçiş adımları (Aşama 2) — prova edildi

_Anayasa: «ileri uyumluluk iddiası taşıyan her teslimde geçiş sorgusu
bugünden yazılır ve gerçek veriyle prova edilir.»_

Her firmaya ait tabloda, üç ayrı migration:

1. `companyId VARCHAR(191) NULL` + indeks ekle (veri değişmez).
2. Geri doldur: `UPDATE <tablo> SET companyId = '<AXC kimliği>' WHERE companyId IS NULL`
   — tek firma olduğu için ölçüt kesin (anayasa: geri alma yolu ölçüte
   dayanır: `companyId = AXC` → `NULL`).
3. `NOT NULL` + yabancı anahtar + tekilliklerin `(companyId, alan)`a çevrilmesi.

**Prova sonucu (salt okuma, 28.09.2026):** firma 1, üyelik 3/3 `AXC`, kaynak
tablolarda sahipsiz kalacak satır yok (tek firmaya bağlanıyor). Tekillik
çevriminde çakışma çıkamaz: bugünkü küresel tekil değerler, firma içinde de
tekildir. Yapılacak ek ölçüm (Aşama 2 başında): geri doldurma sonrası her
tabloda `companyId IS NULL` sayısı **0**.

⚠ Tablo adları migration'da şemadaki model adıyla HARF HARF (`migration:kontrol`
— Windows `sale` üretir, canlı `Sale` ister).

## 7. Aşamalar ve teslim ölçütleri

| Aşama | İş | Kapanış |
|---|---|---|
| 0 | Karar kaydı (anayasa + pano) | ✓ 28.09 |
| 1 | Bu belge + prova | kullanıcı onayı |
| 2 | Şema + geçiş (3 migration, yedekli) | `companyId IS NULL` = 0 her tabloda; uygulama davranışı DEĞİŞMEDİ (bütün bekçiler yeşil) |
| 3 | Firma istemcisi + desen yasağı + ham SQL + cron döngüsü + kimlik taşıma | bekçi + mutasyon; canlıda tek firma olarak Halil testi |
| 4 | İkinci deneme firması + izolasyon testi | iki yönlü izolasyon bekçisi; gerçek cihazda iki firmayla deneme |

## 8. Açık sorular (Aşama 2'den önce)

1. **Roller firmaya mı ait, şablon mu?** Öneri: her firma kendi rollerini
   taşır; yeni firma açılınca bugünkü üç rolün kopyası kurulur.
2. **Kullanıcı birden fazla firmaya üyeyse** aktif firma nasıl seçilir? Öneri:
   üst çubukta firma seçici; seçim oturuma yazılır.
3. **Sistem nedenleri** (`StockAdjustmentReason.systemKey`) her yeni firmaya
   tohum olarak kopyalanır mı? Öneri: evet, firma açılışında.
