# A3 KEŞİF — Trendyol Satıcı API'si

> **Bu bir keşif raporudur, entegrasyon değil.** Kod yazılmadı, hiçbir uca
> istek atılmadı. Kaynak: Trendyol'un **kendi geliştirici dokümantasyonu**.
>
> **Okuma anı:** 24.08.2026
> **Kaynak sürüm:** `developers.trendyol.com` **v3.0**
> **Taban adres:** `https://apigw.trendyol.com`

⚠ **Bu rapordaki her satır dokümantasyondan okundu.** Bulunamayan şey
"bulunamadı" diye yazıldı, varsayılmadı. Hesabımızda (AXCALI · seller
`870249`) fiilen hangi uçların **açık** olduğu **ölçülmedi** — bunun için
API anahtarı gerekiyor ve o ayrı bir adım.

---

## 1 · Yetkilendirme

| | |
|---|---|
| **Yöntem** | HTTP **Basic auth** |
| **Anahtar nereden** | Satıcı paneli → *Hesap Bilgilerim* → **Entegrasyon Bilgileri** |
| **Kim alabilir** | ⚠ **Yalnız ana kullanıcı (master user)** |
| **Verilenler** | `supplierId` · `API KEY` · `API SECRET KEY` |
| **Zorunlu başlık** | `User-Agent: {SellerID} - SelfIntegration` |
| | ⚠ Bu başlık **eksikse 403** döner. Aracı firma yoksa `SelfIntegration` yazılır. |
| **Bölge başlığı** | `storeFrontCode` — bölge ayrımı için header |

**Ortamlar:** `stage` (test) ve `production`. Kimlik bilgileri **ayrı**.

- **Stage:** IP beyaz listesi **ZORUNLU**
- **Production:** IP beyaz listesi **gerekmiyor** (ama IP kara listeye alınabilir)

⚠ **Anahtar depoya girmez** — dokümantasyon da açıkça uyarıyor. Bizde
`.env.canli` deseni zaten var; anahtar oraya gider ve `.gitignore`da kalır.

---

## 2 · Hangi uçlar var

Dokümantasyon indeksinden okundu (`llms.txt`). **A3'ün ilgilendiği dört
aile de mevcut:**

### ✅ SİPARİŞ — bize lazım olan bu

| Uç | Ne yapar |
|---|---|
| **Get Shipment Packages** | Sipariş paketlerini çeker |
| **Get Shipment Packages via Stream** | İmleç tabanlı, büyük veri için |
| **Get Shipment Packages on Awaiting Confirmation** | Onay bekleyenler |
| **Discount Representations** | İndirim/kupon nasıl görünür |

### ✅ İADE

Getting Returned Orders · Approve · Reject · Return Reasons · Claim Issue
Reasons · Get Claim Audit Information

### ✅ HAKEDİŞ / FİNANS

| Uç | Ne yapar |
|---|---|
| **Get Settlements** | Satış/iade işlem kayıtları |
| **Get Other Financials** | Ödeme emirleri, kesinti faturaları, komisyonlar |
| **Current Account Statement** | Cari hesap ekstresi |
| **Cargo Invoice Details** | ⚠ **Kargo faturası** — bugün elle indirdiğimiz dosya |

### ✅ ÜRÜN / STOK

Product Create/Update/Filter · **Stock and Price Update** · Buybox Check ·
Batch Request Status

### ✅ WEBHOOK

Create/Filter/Update/Delete · aktif-pasif. ⚠ **Çekmek yerine bildirim
alma** yolu var — ileride "her 15 dakikada bir sor" yerine kullanılabilir.

---

## 3 · SALT OKUMA sınırı

Faz 4'ün ilk kapısı **yalnız okuma.** Yazma uçları raporda **VAR ama
KAPSAM DIŞI** diye duruyor.

**OKUR (kapsam içi):**
`Get Shipment Packages` · `Get Shipment Packages Stream` ·
`Getting Returned Orders` · `Get Settlements` · `Get Other Financials` ·
`Current Account Statement` · `Cargo Invoice Details` ·
`Product Filter` · `getBrands` / `getCategoryTree` / `getCargoProviders` ·
`API HealthCheck`

**YAZAR (VAR ama KAPSAM DIŞI):**
`Update Tracking Number` · `Update Package Status` · `Cancel Package` ·
`Split Shipment Packages` · `Change Cargo Provider` ·
`Approve/Reject Returned Orders` · `Create Return Request` ·
`Product Create/Update/Archive/Delete` · `Stock and Price Update` ·
`sendInvoiceLink` / `uploadInvoiceFile` · `Webhook Create/Update/Delete`

⚠ **`Stock and Price Update` özellikle dikkat:** stok ve fiyatı Trendyol'a
YAZAR. Bizim defterimiz kaynak olduğunda çok değerli — ama **Faz 4'ün ilk
kapısında değil.** Yanlış bir stok yazımı canlı listingi bozar.

---

## 4 · Sipariş ucu — alan alan

**`GET https://apigw.trendyol.com/integration/order/sellers/{sellerId}/v2/orders`**

### Sınırlar

| | |
|---|---|
| Tarih aralığı | ⚠ **en fazla 2 hafta** tek istekte |
| Geriye dönük | ⚠ **1 ay** (bir yerde "3 ay" da yazıyor — **çelişki, ölçülmeli**) |
| Sayfa boyu | `size` **en fazla 200** |
| Sayfa | `page` 0–49 güvenli aralık |
| Kayıt tavanı | ⚠ **10.000 kayıt** — `shipmentPackageId` ile sayılır, `orderNumber` ile değil |
| Hız | **dakikada 1000 istek** |
| Sıralama | `orderByField=PackageLastModifiedDate` · `ASC`/`DESC` |

**Durum değerleri:** `Created` · `Picking` · `Invoiced` · `Shipped` ·
`Cancelled` · `Delivered` · `UnDelivered` · `Returned` ·
`AtCollectionPoint` · `UnSupplied`

### Bizim şemamızla eşleşme

| TY alanı | Bizde | Not |
|---|---|---|
| `orderNumber` | `Sale.code` | ✅ birebir — eşleştirmenin anahtarı |
| `orderDate` | `Sale.soldAt` | ⚠ **epoch milisaniye, GMT+3** — yani **SAAT TAŞIYOR** |
| `cargoTrackingNumber` | `Sale.shipmentCode` | ✅ **bugün açtığımız alan** |
| `cargoProviderName` | `Sale.cargoCarrier` | ✅ |
| `lines[].barcode` | `ProductVariant.barcode` | ✅ EAN |
| `lines[].stockCode` | `ProductVariant.companySku`? | ⚠ hangisine denk düştüğü **ölçülmeli** |
| `lines[].quantity` | `SaleItem.quantity` | ✅ |
| `lines[].lineUnitPrice` | `SaleItem.unitPriceAmount` | ✅ |
| `lines[].commission` | `SaleItem.commissionRate` | ⚠ tip `int` — **oran mı tutar mı, ölçülmeli** |
| `lines[].vatRate` | `SaleItem.vatRate` | ✅ |
| `lineTotalDiscount` · `lineSellerDiscount` · `lineTyDiscount` | — | ⚠ **K19 kuponu burada** — hangisinin mağazaya ait olduğu ayrışıyor |
| `shipmentPackageId` | — | karşılığı yok |
| `createdBy` | — | `order-creation` · `cancel` · `split` · `transfer` |
| `originPackageIds` | — | bölünme/iptal sonrası dolar |

### ⚠ İki bulgu — bugünkü işlerimizi doğruluyor

**① `orderDate` SAAT TAŞIYOR.** Panoda `H20` diye duruyor: *"`soldAt` saat
taşımıyor, karar açık — içe aktarma yazıldığında saat de alınsın mı?"*
**Cevap veri tarafından geldi: API saati veriyor.** Karar artık teorik
değil.

**② PAKET BÖLÜNMESİ GÖRÜNÜYOR.** `createdBy: "split"` + `originPackageIds`
+ her parçaya **yeni `cargoTrackingNumber`**. Yani `Sale.paketSayisi`
(K-merdiveninde sütun olarak açılmıştı) API'den **türetilebilir** —
`11473322212`'de elle bulduğumuz `2 × ₺13,19` bir daha elle bulunmaz.

---

## 5 · Hakediş ucu

**`GET https://apigw.trendyol.com/integration/finance/che/sellers/{sellerId}/settlements`**

| | |
|---|---|
| Tarih aralığı | ⚠ **en fazla 15 gün** |
| Sayfa boyu | `size` **en fazla 500** |
| Süzgeç | `transactionType` (tekil) veya `transactionTypes` (çoğul — **çoğul kazanır**) |

**Yanıt alanları:** `id` · `transactionDate` · `barcode` ·
`transactionType` · `receiptId` · `description` · `debt` · `credit` ·
`paymentPeriod` · `commissionRate` · `commissionAmount` ·
`sellerRevenue` · **`orderNumber`** · `paymentOrderId` · `paymentDate` ·
`sellerId` · `country` · `orderDate` · `affiliate`

### ⚠ K8 için belirleyici bulgu

**Hakediş satırı `orderNumber` TAŞIYOR.** Yani API'den gelen kalem, tıpkı
bugün dosyadan gelen gibi sipariş numarasıyla eşleşecek — **eşleştirme
kuralımız değişmiyor**, yalnız veri başka kapıdan giriyor.

Ve **`orderDate` de var**: sipariş tarihi hakediş satırının kendisinde.
Bugün ölçtüğümüz "sipariş→ödeme 28 gün" gecikmesi API'den **doğrudan**
hesaplanabilir, iki dosyayı yan yana koymadan.

⚠ **`commissionRate` ve `commissionAmount` İKİSİ DE VAR.** Bu, bugün
`H3`'ün beklediği şey: kanalın **fiilen kestiği** komisyon. Tarifeden
türetilmiş oranımızla karşılaştırılabilir hâle geliyor — anayasadaki
*"gerçek bağımsız teyit"* tam bu.

---

## 6 · Bulunamayanlar (varsayılmadı)

- **Hesabımızda hangi uçlar açık** — API anahtarı olmadan ölçülemez
- **Geriye dönük sınır 1 ay mı 3 ay mı** — iki farklı sayfada iki farklı
  değer okundu, **çelişki**
- **`lines[].commission` oran mı tutar mı** — tip `int`, anlamı yazmıyor
- **`stockCode` bizim hangi kod rolümüze denk** — SKU mu, Firma SKU mu
- **Hepsiburada API'si** — bu keşif yalnız Trendyol. HB ayrı yapılmalı
- **Hız limiti hakediş ucunda** — sipariş ucunda 1000/dk yazıyor,
  hakedişte belirtilmemiş

---

## 7 · Ne demek

**Teknik engel yok.** İhtiyacımız olan üç şeyin üçü de API'de var ve
**hepsi salt okuma**:

1. **Sipariş çekme** → A3'ün kendisi, defterin %73–88'lik boşluğu
2. **Hakediş** → H3 · K8 · K19① kilitlerini birden açar
3. **Kargo faturası** → K45'in elle indirdiği dosya

Ve iki sınır bugünden bilinmeli, çünkü tasarımı belirliyorlar:

- **2 haftalık pencere + 1 ay geri** → geçmiş ağustos verisi için
  **birden çok istek** gerekir, tek çağrı yetmez
- **10.000 kayıt tavanı** → hacim büyüdüğünde `Stream` ucuna geçilir

⏭ **SIRADAKİ ADIM KOD DEĞİL:** satıcı panelinden **API anahtarı almak**
(ana kullanıcı gerekiyor) ve `HealthCheck` ile **hangi uçların açık
olduğunu ÖLÇMEK.** Bu rapordaki her şey dokümantasyondan; hesabın gerçeği
ancak anahtarla görülür.

---

## Kaynaklar

- [Developers Trendyol — ana sayfa](https://developers.trendyol.com/)
- [Getting Started (kimlik doğrulama)](https://developers.trendyol.com/v3.0/docs/getting-started-1)
- [Order Integration API Endpoints](https://developers.trendyol.com/v3.0/docs/2-order-integration-api-endpoints)
- [Get Shipment Packages](https://developers.trendyol.com/v3.0/docs/2-get-shipment-packages)
- [Get Shipment Packages via Stream](https://developers.trendyol.com/v3.0/docs/get-shipment-packages-stream)
- [Order Services Best Practices](https://developers.trendyol.com/v3.0/docs/order-services-best-practices)
- [Current Account Statement Integration](https://developers.trendyol.com/v3.0/docs/1current-account-statement-integration)
- [Getting Returned Orders](https://developers.trendyol.com/v3.0/docs/2-getting-returned-orders)
- [Cargo Invoice Details](https://developers.trendyol.com/v2.0/docs/cargo-invoice-details)
