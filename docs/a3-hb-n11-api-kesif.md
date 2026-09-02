# A3 KEŞİF — Hepsiburada · N11 · Trendyol buy-box

> **Bu bir keşif raporudur. Kod yazılmadı, hiçbir uca istek atılmadı, ÖNERİ
> YOK.** Kapı kararları mimar ve Halil'de.
>
> **Okuma anı:** 02.09.2026

---

## 0 · ⛔ ÖNCE KANIT SEVİYESİ — BU RAPORUN EN ÖNEMLİ BÖLÜMÜ

Bu rapordaki satırların hepsi **aynı ağırlıkta değil.** İki kaynak türü var
ve karıştırılmaları hâlinde rapor, sahip olmadığı bir kesinliği iddia eder.

| Rozet | Anlamı |
|---|---|
| 🟢 **BELGEDEN** | Resmî geliştirici dokümanı **doğrudan okundu** |
| 🟡 **ALINTIDAN** | Doküman okunamadı; arama sonucu resmî sayfadan **alıntılıyor** |
| 🔴 **ÜÇÜNCÜ EL** | Entegratör blogu / satıcı rehberi — resmî değil |

⛔ **HEPSİBURADA VE N11 PORTALLARI OKUYUCUMA `403` DÖNDÜ.**
`developers.hepsiburada.com` ve `magazadestek.n11.com` bot korumalı; sayfa
gövdesi alınamadı. Bu yüzden o iki kanalın satırlarının çoğu 🟡/🔴.

> **Bu bir "bilgi yok" durumu DEĞİL, "birinci elden doğrulanmadı" durumu.**
> İkisi ayrı şeydir ve ayrı yazılır. Kesinleşmesi için ya tarayıcıdan
> bakılmalı ya da satıcı paneline girilip entegrasyon sayfası okunmalı.
> _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
> değildir".)_

---

## 1 · TRENDYOL — buy-box / rakip fiyat ucu 🟢 **VAR**

Bu bölüm **resmî dokümandan doğrudan okundu.**

| | |
|---|---|
| **Uç** | `POST https://apigw.trendyol.com/integration/product/sellers/{sellerId}/products/buybox-information` |
| **Dönen alanlar** | `barcode` · `buyboxOrder` · `buyboxPrice` · `hasMultipleSeller` · `secondBuyboxPrice` · `thirdBuyboxPrice` |
| **Sorgu tavanı** | **10 barkod / istek** |
| **Oran sınırı** | **1000 istek/dakika** |
| **Kapsam** | ⭐ Yalnız kendi konumumuz değil: **ikinci ve üçüncü buy-box fiyatı da dönüyor** — yani rakip fiyat bilgisi var |

⚠ **`POST` — okuma ucu ama fiil POST.** Barkod listesi gövdede gidiyor.
Bu, mevcut `api:dogrula` bekçisinin _"salt okuma betikleri GET kullanır"_
ölçütüyle **çarpışır**; kullanılacaksa o ölçüt bu uç için beyanla
genişletilmeli (susturulmadan).

📏 **BİZDEKİ DURUM ÖLÇÜLDÜ (02.09.2026):** TY istemcisi (`scripts/ty/istemci.ts`)
ve altı betik zaten var; kullanılan uçlar —

    order/sellers/{id}/orders            ✅   product/sellers/{id}/products   ✅
    order/sellers/{id}/claims            ✅   product/cargo-providers         ✅
    finance/.../settlements              ✅   oms/core/health-check           ✅
    finance/.../otherfinancials          ✅
    products/buybox-information          ⛔ KULLANILMIYOR

⭐ **Yani TY'de anahtar var, istemci var, altı uç çalışıyor. Buy-box
kullanılmamış tek yeni yetenek.**

---

## 2 · HEPSİBURADA

| Konu | Bulgu | Kanıt |
|---|---|---|
| **Resmî doküman** | `developers.hepsiburada.com` — portal var, Türkçe + referans sayfaları | 🟡 |
| **Kimlik doğrulama** | HTTP **Basic auth** (kullanıcı adı + parola, `Authorization` başlığı) | 🟡 |
| **Taban host** | `mpop.hepsiburada.com` (MPOP = Merchant Platform Open API) | 🟡 |
| **Ürün/listeleme okuma** | `getallproductsbymerchantid` — mağaza bazlı ürün listesi; `getproductbymerchantidandstatus` — statü bazlı; `checkproductstatus` — tekil statü | 🟡 |
| **Sipariş** | Sipariş entegrasyonu ayrı aile, okuma uçları var | 🟡 |
| **Hakediş / mutabakat** | **Settlements API** — hakediş, fatura, mutabakat raporları | 🟡 |
| **Test ortamı** | ⚠ **BULUNAMADI** — sandbox olup olmadığı okunamadı | ⛔ |
| **buy-box / rakip fiyat** | ⚠ **BULUNAMADI** — böyle bir uç olduğuna dair belge görülmedi | ⛔ |

### ⭐ HB KAPISININ ÖLÇÜLMÜŞ İŞ DEĞERİ — 02.09.2026 EKLENDİ

Bu rapor 01.09'da yazıldığında HB kapısı _"sırası gelince"_ diye duruyordu.
K136 ölçümü ona **para değeri** verdi ve soruyu değiştirdi.

    iade açığı (sistemde kaydı olmayan iade)      233 sipariş · ₺682.458
      ├─ Hepsiburada   ₺356.260   %52,2   ⛔ API YOK → kapatılamıyor
      └─ Trendyol      ₺326.198   %47,8   ✓ hakediş ucu VAR

⛔ **TY hakediş ucu bu açığın EN FAZLA YARISINI kapatır.** Öteki yarısı,
HB entegrasyonu açılmadan **hiçbir boruyla** kapanmıyor — elle giriş
dışında yolu yok.

⚠ **VE BU BİR ÖNERİ DEĞİL, BİR ÖLÇÜMDÜR.** Rakam kapıyı açmayı gerekli
kılmaz; kapıyı açmamanın **bedelini** görünür kılar. Karar yine mimar +
Halil'de _(kullanıcı 02.09: "HB'nin API'si var ama henüz başlamak
istemiyorum")_.

⚠ **KAPSAM UYARISI:** ₺682.458 rakamı kullanıcının ters satır listesinden
geliyor ve o liste **2026-08-03'te bitiyor**. Sonrası "iade yok" değil,
**ÖLÇÜLMEMİŞ** demektir _(bkz. `canli:liste-ufku`)_.

---

### ⛔ ORAN SINIRI — İKİ KAYNAK ÇELİŞİYOR, ÇÖZÜLEMEDİ

    "500 istek / 1 saniye"  (ürün statü ucu, IP başına)      🟡
    "1000 istek / 1 saniye" (sipariş entegrasyonu)           🟡
    "100 istek / dakika"    (satıcı başına, genel)           🔴

Birinci ikisi resmî sayfalardan alıntılanıyor ve **uç bazında**; üçüncüsü
bir entegratör blogundan ve **genel** diyor. Aradaki fark **600 kat**.

> ⛔ **BU RAPOR HANGİSİNİN DOĞRU OLDUĞUNU SÖYLEMİYOR.** Üçünü de kaynağıyla
> yazıyor. Bir sayı seçmek, ölçülmemiş bir şeyi ölçülmüş gibi göstermek
> olurdu. _(Anayasa: "kaynağı yazılmayan sayı, doğru olsa bile
> kullanılamaz"; "iki çelişen rakam yan yana bırakılmaz — ikisi de
> kaynağıyla yazılır ve hangisinin geçerli olduğu söylenir." Burada
> **hangisinin geçerli olduğu söylenemiyor** ve bu da yazılıyor.)_

**Kapanış yolu:** satıcı panelinden entegrasyon dokümanına girilip oran
sınırı sayfası okunur — ya da bir uçtan tek istek atılıp `429` eşiği
ölçülür (o artık keşif değil, deneme).

---

## 3 · N11

| Konu | Bulgu | Kanıt |
|---|---|---|
| **Resmî doküman** | `magazadestek.n11.com` — REST API sayfaları | 🟡 |
| **Kimlik doğrulama** | `appkey` + `appsecret` **başlıkta**; `Authorization` **kullanılmıyor** ("no auth") | 🟡 |
| **Ürün sorgulama** | `GET https://api.n11.com/ms/product-query` | 🟡 |
| **Süzgeçler** | `id` · `productMainId` · `stockCode` · `saleStatus` · `productStatus` · `brandName` · `categoryIds` · `page` · `size` | 🟡 |
| **Sayfalama** | `page` + `size` | 🟡 |
| **Yazma uçları** | `POST /ms/product/tasks/product-create` — **görev tabanlı**, `taskId` döner ve durum ayrıca sorgulanır | 🟡 |
| **Toplu tavan** | Tek istekte **en fazla 1000 SKU** | 🟡 |
| **Oran sınırı** | "Teslimat servisi **1000 istek/dakika**" — ⚠ yalnız O SERVİS için; ürün/sipariş uçları için **bulunamadı** | 🟡 / ⛔ |
| **Test ortamı** | ⚠ **BULUNAMADI** | ⛔ |
| **buy-box / rakip fiyat** | ⚠ **BULUNAMADI** | ⛔ |
| **Destek** | `sellerintegration@n11.com` | 🟡 |

⚠ **N11 KAPSAMI BİZDE ZATEN DAR:** ölçüldü 02.09.2026 — 1110 aktif
varyantın **yalnız 49'unda** N11 kanal kodu var (HB 1092 · TY 1070).
Bir N11 entegrasyonu bugün defterin **%4,4'üne** dokunur.

---

## 4 · ÜÇ KANAL YAN YANA

| | Trendyol | Hepsiburada | N11 |
|---|---|---|---|
| Anahtar elimizde | ✅ **var, kullanılıyor** | ⛔ yok | ⛔ yok |
| İstemci kodu | ✅ `scripts/ty/istemci.ts` | ⛔ | ⛔ |
| Kimlik doğrulama | Basic + `User-Agent` şartı 🟢 | Basic 🟡 | `appkey`/`appsecret` başlık 🟡 |
| Sipariş okuma | ✅ çalışıyor | var 🟡 | var 🟡 |
| Hakediş okuma | ✅ çalışıyor | var (Settlements) 🟡 | bulunamadı ⛔ |
| Ürün/listeleme okuma | ✅ çalışıyor | var 🟡 | var 🟡 |
| buy-box / rakip fiyat | ✅ **var, kullanılmıyor** 🟢 | bulunamadı ⛔ | bulunamadı ⛔ |
| Oran sınırı | 1000/dk (buy-box) 🟢 | ⛔ **ÇELİŞKİLİ** | kısmî 🟡 |
| Test ortamı | ✅ stage (IP beyaz liste) 🟢 | bulunamadı ⛔ | bulunamadı ⛔ |
| Bizdeki kapsam | 1070 varyant | 1092 varyant | **49 varyant** |

---

## 5 · BU RAPORUN SÖYLEMEDİKLERİ

⛔ Aşağıdakiler **bilinmiyor** ve rapor bunları tahmin etmiyor:

1. HB ve N11 anahtarlarının **nasıl alınacağı** — panelde hangi ekran, kim
   alabilir (TY'de "yalnız ana kullanıcı" şartı vardı; ötekilerde okunamadı).
2. HB'nin gerçek oran sınırı (üç çelişen rakam).
3. HB/N11'de **test ortamı** olup olmadığı.
4. HB/N11 uçlarının hesabımızda fiilen **açık olup olmadığı** — TY
   raporunda da aynı sınır vardı: doküman "var" der, hesap "yok" diyebilir.
5. buy-box ucunun **bizim ürünlerimizde ne döndüreceği** — 10 barkod
   tavanı 1070 TY varyantı için 107 istek demek; 1000/dk sınırında sorun
   görünmüyor ama **ölçülmedi.**

---

## 6 · KAPI KARARLARI — MİMAR + HALİL

Bu rapor **öneri içermez.** Karara bağlanacak sorular:

| # | Soru |
|---|---|
| **A** | TY buy-box ucu açılsın mı? (Anahtar ve istemci hazır; yeni bilgi rakip fiyatı.) |
| **B** | HB entegrasyonu için anahtar alınsın mı — ve önce oran sınırı belgesi okunsun mu? ⭐ **Ölçülmüş bedeli var:** kapı kapalıyken iade açığının **%52,2'si (₺356.260)** kapatılamıyor (bkz. §2). |
| **C** | N11 bugün **49 varyant** kapsıyor; sıraya girmeli mi, beklemeli mi? |
| **D** | Sıra "kanal kanal" mı, "yetenek yetenek" mi? (TY'de sipariş+hakediş çalışıyor; HB'de sıfırdan başlanacak.) |

---

## Kaynaklar

- [Trendyol — Ürün Buybox Kontrol Servisi](https://developers.trendyol.com/docs/%C3%BCr%C3%BCn-buybox-kontrol-servisi) 🟢
- [Trendyol — Developers portalı](https://developers.trendyol.com/) 🟢
- [Hepsiburada — Developer Portal (getting started)](https://developers.hepsiburada.com/hepsiburada/docs/getting-started) 🟡 *(403)*
- [Hepsiburada — Mağaza Bazlı Ürün Bilgisi Listeleme](https://developers.hepsiburada.com/hepsiburada/reference/getallproductsbymerchantid) 🟡 *(403)*
- [Hepsiburada — Ürüne Ait Statü Bilgisi Çekme](https://developers.hepsiburada.com/hepsiburada/reference/checkproductstatus) 🟡 *(403)*
- [Hepsiburada — Sipariş Entegrasyonu Önemli Bilgiler](https://developers.hepsiburada.com/hepsiburada/reference/siparis-entegrasyonu-onemli-bilgiler) 🟡 *(403)*
- [N11 — RestAPI Satıcı Ürün Sorgulama](https://magazadestek.n11.com/satis-surecleri/restapi-satici-urun-sorgulama-10493) 🟡 *(403)*
- [N11 — RestAPI Fiyat-Stok Güncelleme](https://magazadestek.n11.com/satis-surecleri/restapi-urun-bilgileri-ve-fiyat-stok-guncelleme-servisi-10173) 🟡 *(403)*
- [Zunapro — Hepsiburada MPOP & API rehberi](https://www.zunapro.com/turkey/en/blog/hepsiburada-integration-api-guide-seller-manual) 🔴
- [Codeilla — N11 REST API entegrasyon dokümanı](https://codeilla.com.tr/n11-entegrasyon-dokumani-rest-api/) 🔴
