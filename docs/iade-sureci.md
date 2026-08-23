# İade Süreci — Pazaryeri Gerçeği

> **Bu belge sistemin nasıl çalıştığını değil, PAZARYERİNİN nasıl çalıştığını
> anlatır.** Sistemi ona göre kuruyoruz; ikisi ayrıştığında kazanan bu belge.
>
> **Kaynak önceliği (CLAUDE.md):** kanalın kendi ekranı > kullanıcının
> operasyon bilgisi > dış hesaplayıcı. Aşağıdaki her satırın kaynağı
> yanında yazar.

**Yazıldı:** 23.08.2026 · **Kaynaklar:**
`(E)` Trendyol satıcı uygulaması ekran kaydı, 23.08.2026 01:47 ·
`(B)` kullanıcının hazırladığı "İade Süreci" tablosu ·
`(K)` kullanıcı anlatımı, 23.08.2026

## KAPSAM — hangi kanal ne kadar biliniyor

| Kanal | Durum | Not |
|---|---|---|
| **Trendyol** | ✅ **ÖLÇÜLDÜ** | Satıcı uygulaması ekran kaydı + kullanıcı anlatımı. Aşağıdaki her şey buradan. |
| **Hepsiburada** | ⏳ **GELİYOR** | Kullanıcı 23.08.2026: _"çok benzer ama birkaç farklılık var, onu da göndereceğim."_ |
| **N11** | ⛔ **TECRÜBE YOK** | Kullanıcı: _"henüz iade tecrübem yok, yaşadığımda vereceğim."_ Süresiz bekler. |
| Amazon · diğerleri | ⛔ görülmedi | — |

⚠ **TASARIM N11'İ BEKLEMEZ — AMA N11 HAKKINDA İDDİA DA KURMAZ.**
Durum makinesi **ölçülmüş kanaldan** (Trendyol) kurulur; kanal farkları
**veri** olarak tutulur. Ölçülmemiş bir kanal için kural UYDURULMAZ:
`ChannelFee`de zaten kullanılan rozet düzeni burada da geçerli —
`OLCULDU` / `REFERANS` / `belirsizlik` (CLAUDE.md → "Kaynak önceliği:
içerden gelen bilgi üsttedir"). N11'de ilk iade yaşandığında kural
deftere geçer, o güne kadar **beyanla boş durur.**

⚠ Ortak sayılan tek şey **AKIŞIN ŞEKLİ** `(K)`: _"tüm pazaryerlerinin genel
mantığı bu"_ ve _"müşterinin iade oluşturabileceği seçenekler her
pazaryerinde böyle."_ **Maliyet kuralları kanal kanal değişiyor** — bkz. §5.

---

## 1. Durum akışı

```
 Talep Oluşturulan ──müşteri 7 gün kargoya vermezse──▶ İptal
        │ müşteri kargoya verdi
        ▼
  Kargoya Verilen
        │ kargo satıcıya TESLİM edildi   ⏳ 2 günlük onay/red süresi BURADA başlar (K)
        ▼
  Aksiyon Bekleyen ─────────────────────┐
        │                               │
     Onayla                          Reddet  (8 gerekçeden biri + paketleme videosu)
        │                               ▼
        │                          İhtilaflı        ← pazaryeri inceler
        │                          │        │
        │                 satıcı haklı    pazaryeri "servise gitsin" der
        │                          ▼        ▼
        │                    Reddedilen    Analiz  (28 gün)
        │                    + kargo kodu    │ tamir / değişim / sorun yok
        │                    2 iş günü       ├──▶ Reddedilen (geri gönder)
        │                    içinde yolla    └──▶ Onaylanan
        ▼
   Onaylanan  (iade kesinleşti — bizde `Return` doğar)
```

**Satıcı panelindeki sekmeler** `(E)`: Tüm İadeler · Talep Oluşturulan ·
Kargoya Verilen · Aksiyon Bekleyen · Onaylanan · Reddedilen · Analiz ·
İhtilaflı · **Askıda İadeler**

**Üstteki üç sayaç** `(E)`: Onay/Ret Bekleyen İadeler · Kargolanması Gereken
Reddedilen İadeler · Teslim Alınması Gereken İadeler

---

## 2. Askıda İadeler — ayrı bir şey

`(K)` **"Aksiyon Bekleyen" ile AYNI DEĞİL.** Aksiyon Bekleyen'de _senin_
yapman gereken bir işlem vardır; **Askıda**, iadenin normal akıştan ÇIKMIŞ
olduğu hâldir:

- kargo sürecinde problem
- iade sistemde normal statüye geçmemiş
- pazaryeri tarafından ek işlem/inceleme gerekiyor
- ücret iadesi ile ürünün iade statüsü arasında uyumsuzluk
- sistemsel/operasyonel nedenle standart akış tamamlanamamış

⚠ **Takip edilmesi önemli:** burada kalan iade, ürünün ve bedelin normal
kapanmasını geciktirir. Yani bu bir "arıza kutusu" ve boş kalması gerekir.

---

## 3. Müşterinin iade sebepleri (9)

`(E)` — Trendyol müşteri uygulamasındaki "İade Sebebi Seçiniz" listesinin
tamamı. `(K)`: bu liste her pazaryerinde aynı mantıkta.

| # | Sebep |
|---|---|
| 1 | Beğenmedim |
| 2 | Yanlış sipariş verdim |
| 3 | Daha iyi bir fiyat mevcut |
| 4 | Bedeni/Ebatı Büyük Geldi |
| 5 | Bedeni/Ebatı Küçük Geldi |
| 6 | Yanlış ürün gönderildi |
| 7 | Ürünümün parçası/aksesuarı eksik gönderildi |
| 8 | Kusurlu ürün gönderildi |
| 9 | Vazgeçtim |

⚠ **SEBEP, SATICININ SEÇENEĞİNİ DEĞİŞTİRMEZ** `(K)`: _"sebep ne olursa
olsun satıcının 2 seçeneği var — onayla, reddet."_ Sebep **yönlendiricidir**
(ne yapmalıyım), **kapı değildir**.

---

## 4. Satıcının ret (itiraz) gerekçeleri (8)

`(K)` — "Reddet" seçilince açılan liste. Seçimle birlikte **paketleme
videosu ve diğer görseller** yüklenir; iade **İhtilaflı**'ya taşınır.

| Kod | Gerekçe |
|---|---|
| A | Müşteriden gelen ürün kullanılmış |
| B | Müşteriden gelen iade yanlış |
| C | Müşteriden gelen ürün hijyen ürünü |
| D | İadeyi analize alacağım |
| E | Değişim yapacağım |
| F | Müşteriden gelen ürün hasarlı |
| G | Müşteriden gelen ürün eksik |
| Ğ | Siparişi kusurlu göndermedim |

⚠ **D SEÇENEĞİ TALEPTİR, KARAR DEĞİL** `(K)`: satıcı analizi *ister*, ama
**analiz kararını pazaryeri verir**. Satıcı hiç istemese de pazaryeri
analize alabilir.

---

## 5. "Reddedilen" TEK BİR DURUM DEĞİL — üç ayrı yoldan gelinir

Sekme adı aynı, **gönderilen şey ve parayı ödeyen taraf farklı.** Modelde
durumu tek başına tutmak YETMEZ; **nasıl gelindiği** de tutulmalıdır, yoksa
kargo maliyeti yanlış hesaplanır.

| Geliş yolu | Ne gönderilir | Süre | Kargo kimden |
|---|---|---|---|
| **Satıcı haklı bulundu** | aynı ürün, müşteriye geri | 2 iş günü `(K)` | **Trendyol: satıcıya YANSITILMAZ** · diğer pazaryerleri: satıcı öder `(K)` |
| **Değişim (gerekçe E)** | **yeni ürün** | — | **her yerde satıcı öder** `(K)` |
| **Analiz bitti, geri gönderiliyor** | aynı ürün | — | **her yerde satıcı öder** `(K)` |

### Kargo sayısı — kanal farkı `(K)`

Satıcının haklı bulunduğu ve ürünün müşteriye geri gönderildiği senaryoda:

| | Ödenen kargo |
|---|---|
| **Trendyol** | **2** — siparişin müşteriye gidiş kargosu + müşteriden gelen iade kargosu |
| **Diğer pazaryerleri** | **3** — satış + iade + geri gönderim |

> Bu, mimari için iyi haber: **akış tek, maliyet kuralı kanal bazlı.** Kural
> koda gömülmez, `ChannelFee` gibi VERİ olarak tutulur (CLAUDE.md → "kanal
> kesinti kuralları veri olarak tutulur").

---

## 6. Analiz dalı

`(K)` Pazaryeri "servise gitsin" derse iade **Analiz** sekmesine düşer.

- Satıcı ürünü servise gönderir · **28 gün** süresi vardır
- İşlem bitince satıcı üç seçenekten birini işaretler:
  **a)** Ürün tamir edildi · **b)** Ürün değişim yapıldı ·
  **c)** Üründe sorun bulunamadı
- Sonuç: ya **Reddedilen** (kargo koduyla geri gönderim) ya **Onaylanan**
  (kapanır)
- ⚠ Geri gönderim olursa **kargo ücreti her yerde satıcıya aittir**

---

## 7. İade detayında duran alanlar `(E)`

Trendyol'un iade detay ekranı şunları taşıyor — bizde karşılığı olmayanlar
işaretli:

| Alan | Örnek | Bizde |
|---|---|---|
| Sipariş numarası | `#11475261428` | ✓ |
| İade talep tarihi | 07.08.2026 19:12 | ✓ (`noticedAt`) |
| **Sipariş tarihi** | 04.08.2026 17:13 | ✓ (`Sale.soldAt`) |
| Alıcı adı | esra telimen | ❌ tutulmuyor |
| **Kargo firması** | Aras | ❌ |
| **Kargo kodu** | 7260035504348777 | ❌ |
| **İade desi** | 1 | ❌ |
| Satış tutarı | 1.919,00 ₺ | ✓ |
| **İndirim tutarı** | **−15,00 ₺** | ⚠ bkz. aşağıda |
| Faturalanmış tutar | 1.904,00 ₺ | ✓ (girilen tutar) |
| İade sebebi | Bedeni/Ebatı Küçük Geldi | ⚠ enum karşılığı yok |
| **Otomatik onaya kalan süre** | 19 gün 07:42 | ❌ **en kritik eksik** |

⚠ **`İndirim Tutarı −15,00 ₺` = takipçi kuponu (pano: K19).** Kupon iade
ekranında da görünüyor ve faturalanmış tutar üzerinden işliyor — yani
kuponun izi satış ve iade taraflarında birlikte yaşıyor.

---

## 8. ÖLÇÜLMEMİŞ — iddia kurulmayacak alanlar

> Bu bölüm bilerek var: **ölçülmemiş bir sayının üstüne kural yazılmaz.**

### 8.1 Otomatik onay sayacı hangi andan sayıyor?

İki kaynak **çelişiyor** ve hiçbiri tek başına yeterli değil:

- `(K)` _"İade satıcıya teslim edildiğinde **2 günlük** onay veya red süresi
  başlar."_
- `(E)` Ekranda **"Otomatik Onaya Kalan Süre"** yazıyor ve değerler çok daha
  büyük:

| İade | Talep tarihi | Kayıt anı | Geçen | Kalan | Toplam |
|---|---|---|---|---|---|
| `#11475261428` | 07.08 19:12 | 23.08 01:47 | 15g 6s | 19g 7s | ~34,6 gün |
| `#11481463029` | 15.08 18:27 | 23.08 01:47 | 7g 7s | 8g 10s | ~15,8 gün |

İkisi aynı toplamı vermiyor → sayaç **talep tarihinden sabit bir süre
saymıyor**. Muhtemelen İKİ AYRI SAAT var (2 günlük aksiyon süresi + daha
uzun bir otomatik onay süresi) ama **n=2 ile hangi andan saydığı
uydurulamaz.**

**Kapanış şartı:** "Aksiyon Bekleyen" sekmesindeki bir iadenin detayı —
sayaç ve teslim tarihi aynı ekranda görünecek şekilde. O gelince ölçülür.

### 8.2 Diğer kanalların ekranı

Hepsiburada · N11 · Amazon için sekme adları, ihtilaf sonuçları ve analiz
dalı **görülmedi**. Kullanıcı beyanı akışın ortak olduğu yönünde `(K)`;
tasarım buna göre kurulacak ama **kanal farkı VERİ olarak bırakılacak** ki
ilk belge geldiğinde kod değil satır değişsin.

### 8.3 İade hacmi

`(E)` Trendyol paneli **63 paket** iade gösteriyor (49 onaylanan · 13
reddedilen · 1 analiz). Sistemde **5 işlenmiş iade + 9 bildirim** var.

⚠ **"58 eksik" DENMEZ:** pencereler farklı — Trendyol'unki 23.02.2026'ya
kadar gidiyor, bizim ilk iademiz 03.07.2026. Kıyas ancak Trendyol'dan iade
dökümü alınıp aynı pencereye indirgenince kurulur.
_(CLAUDE.md → "kontrol tasarımı, veri kapsamı doğrulanmadan fark üretmez")_

---

## 9. Sistemimizle karşılaştırma — açık boşluklar

| # | Boşluk | Etki |
|---|---|---|
| 1 | **Otomatik onay süresi tutulmuyor** | Kaçarsa itiraz hakkı SESSİZCE düşer. Bir bildirimin en kritik alanı. |
| 2 | **`ITIRAZ_KABUL` yanlış modellenmiş** | Şema _"lehe — ürün müşteride kalır, kapandı"_ diyor. Gerçekte ürün BİZDE ve 2 iş günü içinde geri gönderilmeli. Para tarafı doğru (`Return` doğmuyor — ölçüldü), ama **fiziksel iş görünmüyor**. |
| 3 | **Analiz dalı yok** | 28 gün, üç sonuç, kargo her zaman bizde. |
| 4 | **"Kargoya Verilen" aşaması yok** | `BEKLENIYOR` iki aşamayı birden kapsıyor; 7 gün kuralı takip edilemiyor. |
| 5 | **Askıda İadeler karşılığı yok** | Akıştan çıkmış iade hiçbir yerde görünmüyor. |
| 6 | **Ret gerekçesi tutulmuyor** | 8 gerekçeden hangisiyle itiraz edildiği kayıtta yok; "Reddedilen"e hangi yoldan gelindiği de bilinemiyor → **kargo maliyeti hesaplanamaz** (bkz. §5). |
| 7 | **Kargo firması/kodu/desisi yok** | İade kargosunun maliyeti desiden çıkar; desi yoksa maliyet tahmin olur. |
| 8 | **Müşterinin 9 sebebi ile enum'umuz örtüşmüyor** | Çoğu `DIGER`'e düşer; sebep bazlı yönlendirme yapılamaz. |

---

## 10. Sebep → aksiyon tablosu `(B)`

Kullanıcının hazırladığı tablo. **Sistemde henüz karşılığı yok** — bugün
"sıradaki adım" yalnız DURUMA göre yazılıyor, sebebe göre değil.

| İade sebebi | İlk aksiyon | Sonra |
|---|---|---|
| Almaktan vazgeçtim · Ürün beğenilmedi · Daha ucuz buldum | Ürünü kontrol et → kullanılmamışsa stoğa al | Kullanılmışsa itiraz et → kabul: geri kargola (TY'de ücret bize yansımaz) / red: ürün hurda, 2. el sat |
| Yanlış ürün sipariş edildi | Kontrol et → uygunsa stoğa al | aynı |
| **Yanlış ürün gönderildi** (bizim hatamız) | Kontrol et → stok düzelt / doğru ürünü gönder | Müşteri değişim isterse doğru ürün gönderilir, **kargo bizden** |
| **Kusurlu ürün teslim edildi** | Test et → servise gönder | Analiz talep edilir; **28 gün** içinde dönüp kargolanmalı (**kargo bize yansır**). Pazaryeri analizi kabul etmezse iade onaylanır → **pazaryerine tazmin talebi** |
| **Ürün hasarlı** | Hasarı kontrol et → itiraz et (paketleme videosu) | Cezasız onay → **kargo şirketine tazmin başvurusu**. Cezalı onay → yine tazmin talebi |
| **Eksik parça/aksesuar** | Paketleme videosuna bak | Eksik değilse video ile itiraz. Eksikse ve tedarik edilebiliyorsa **2 gün içinde** verilen kargo koduyla gönderilir (**kargo bizden**); tedarik edilemiyorsa cezalı onay |
| **Boş paket geldi** | **Kesinlikle itiraz et**, kanıtları kaydet | aynı akış |
| **Ürün eksik geldi** | Adetli siparişte video izlenir | Eksikse tedarik, değilse itiraz |
| Diğer | Açıklama gir → manuel | — |

⚠ Hasar ve eksik parça vakaları **parası geri alınabilir** olanlar
(kargo tazminatı / tedarikçi tazminatı) — bugün hepsi `DIGER`'e düşüyor,
yani en çok para kurtarılabilecek vakalar en az izlenen kutuda.
