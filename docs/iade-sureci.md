# İade Süreci — Pazaryeri Gerçeği

> **Bu belge sistemin nasıl çalıştığını değil, PAZARYERİNİN nasıl çalıştığını
> anlatır.** Sistemi ona göre kuruyoruz; ikisi ayrıştığında kazanan bu belge.
>
> **Kaynak önceliği (CLAUDE.md):** kanalın kendi ekranı > kullanıcının
> operasyon bilgisi > dış hesaplayıcı. Aşağıdaki her satırın kaynağı
> yanında yazar.

**Yazıldı:** 23.08.2026 · **Kaynaklar:**
`(E)` Trendyol satıcı uygulaması ekran kaydı, 23.08.2026 01:47 ·
`(EH)` Hepsiburada satıcı paneli "Müşteri talepleri" ekranı, 23.08.2026 ·
`(B)` kullanıcının hazırladığı "İade Süreci" tablosu ·
`(K)` kullanıcı anlatımı, 23.08.2026

## KAPSAM — hangi kanal ne kadar biliniyor

| Kanal | Durum | Not |
|---|---|---|
| **Trendyol** | ✅ **ÖLÇÜLDÜ** | Satıcı uygulaması ekran kaydı + kullanıcı anlatımı. Aşağıdaki her şey buradan. |
| **Hepsiburada** | ✅ **ÖLÇÜLDÜ** | Satıcı paneli ekran görüntüsü + kullanıcı anlatımı, 23.08.2026. Akış aynı, **üç yapısal fark** var — bkz. §11. |
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
Talep Oluşturulan ──(müşteri 7 gün kargoya vermezse)──▶ İptal
     │
     │ müşteri kargoya verdi
     ▼
Kargoya Verilen
     │
     │ kargo satıcıya TESLİM edildi
     │ >> 2 günlük onay/red süresi BURADA başlar (K)
     ▼
Aksiyon Bekleyen
     │
     ├── Onayla ─────────────────────────────▶ Onaylanan
     │                                         iade kesinleşti, `Return` doğar
     │
     └── Reddet + 8 gerekçeden biri + paketleme videosu
              │
              ▼
         İhtilaflı ── pazaryeri inceler
              │
              ├── satıcı haklı ────▶ Reddedilen
              │                      + kargo kodu · 2 iş günü içinde geri yolla
              │
              └── "servise gitsin" ▶ Analiz (28 gün)
                                        │ tamir / değişim / sorun yok
                                        ├──▶ Reddedilen  (geri gönder)
                                        └──▶ Onaylanan   (kapanır)
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

### 8.1 Sayaçlar — ÇÖZÜLDÜ 23.08.2026

Burada bir "çelişki" yazılıydı ve **çelişki bendeydi, kaynakta değil**:
farklı sayaçlar birbirine karıştırılmıştı. Dördü de ayrı ayrı çözüldü —
**bkz. §12**. Bu bölüm kapandı.

### 8.2 Diğer kanalların ekranı

**Hepsiburada ÖLÇÜLDÜ** (23.08.2026) — bkz. §11. **N11 · Amazon** için ekran
görülmedi; N11'de kullanıcının henüz iade tecrübesi yok ve **süresiz
bekler**. Tasarım onları BEKLEMEZ ama haklarında iddia da kurmaz: kanal
farkı VERİ olarak durur, ölçülmemiş kanal `belirsizlik` beyanıyla boş
kalır.

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
| 9 | **Kargo tazminatı bağı yok** | İade 10 günde ulaşmazsa otomatik onaylanır ve **kargo şirketinden tazmin** talep edilir (§12.1). Bu bir ALACAKTIR; bugün iade ile `Compensation` arasında bağ yok, yani kapanan iade sessizce kayıp görünür. |
| 10 | **Müşterinin notu ve görseli tutulmuyor** | İtiraz kararı bunlara bakılarak veriliyor (§13); bizde yok. |

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

---

## 11. HEPSİBURADA — aynı akış, üç yapısal fark `(EH)` `(K)`

Sekmeler: **Ürün bekleniyor** · **Yanıtlanacak** · **Gönderime hazır** ·
**Kargoda** · **Sonuçlandı** (379) · **Hepsiburada bekleniyor** ·
**Servis sürecinde**

### 11.1 Eşleme

| Hepsiburada | Trendyol | Bizdeki durum |
|---|---|---|
| **Ürün bekleniyor** | Talep Oluşturulan **+** Kargoya Verilen | `BEKLENIYOR` (+ isteğe bağlı `KARGOYA_VERILDI`) |
| **Yanıtlanacak** | Aksiyon Bekleyen | `MAL_GELDI` |
| **Hepsiburada bekleniyor** | İhtilaflı | `ITIRAZ_ACILDI` / `ITIRAZ_INCELEMEDE` |
| **Gönderime hazır** | Reddedilen (henüz kargolanmadı) | `ITIRAZ_KABUL`, `iadeKargoKodu` **boş** |
| **Kargoda** | (TY'de ayrı sekme yok — üstteki sayaç) | `ITIRAZ_KABUL`, `iadeKargoKodu` **dolu** |
| **Sonuçlandı** | Onaylanan | `KAPANDI` |
| **Servis sürecinde** | Analiz | `ANALIZ` — ⚠ ama sonu farklı, bkz. §11.4 |

### 11.2 FARK 1 — kargoya verilme ayrı aşama DEĞİL

`(K)` Müşteri kargoya verdiğinde iade **"Ürün bekleniyor"da kalmaya devam
eder.** Trendyol bunu ayrı sekmeye alıyor, Hepsiburada almıyor.

> ✅ **TASARIM DOĞRULANDI.** `KARGOYA_VERILDI` bizde **atlanabilir** ara adım
> olarak kuruldu (zorunlu olsaydı HB'de hiç kullanılmayan bir aşama
> operasyoncuya fazladan tık olurdu). Kanal farkı modeli bozmuyor.

### 11.3 FARK 2 — geri gönderim İKİ sekmeye bölünmüş

`(K)` Satıcı haklı bulunursa iade önce **"Gönderime hazır"a**, biz
kargoladığımızda **"Kargoda"ya** geçer. Trendyol'da bu tek sekme
("Reddedilen") + üstte bir sayaç ("Kargolanması Gereken").

> ✅ **YENİ DURUM GEREKMEDİ.** Ayrım `iadeKargoKodu` alanından TÜRETİLİYOR:
> boşsa "gönderime hazır", doluysa "kargoda". Merdivende bir basamak daha
> tasarruf — yeni bir `NoticeStatus` değeri açmak, iki kanalın sekme
> sayısını modele gömmek olurdu.

### 11.4 FARK 3 — SERVİS DALI BAŞKA BİTİYOR: "Hurda Geliri"

⚠ **EN BÜYÜK FARK BU VE PARA TARAFINDA.**

`(K)` HB'de servis sekmesi **genelde kullanılmaz.** Örnek: çalışmıyor diye
iade edilen bir blender'ı satıcı, kullanım hatası mı diye analize almak
ister. İade kısa süreliğine **"Servis sürecinde"** sekmesine alınır —

**ama Hepsiburada servis sürecini BEKLEMEDEN müşteriye parayı iade eder.**

Bundan sonrası Trendyol'da hiç olmayan bir yol:

1. Satıcı **Hepsiburada'ya tazmin talebinde** bulunur
2. Talep kabul edilirse satıcı **Hepsiburada'ya FATURA keser**
3. İade ürün **Hepsiburada'nın deposuna** gönderilir
4. Depoya ulaştıktan sonra tutar hakedişlere **"Hurda Geliri"** olarak eklenir

| | Trendyol | Hepsiburada |
|---|---|---|
| Analiz sonu | ürün **müşteriye** geri (ya da iade onaylanır) | ürün **pazaryerinin deposuna**, karşılığı **Hurda Geliri** |
| Para | iade tutarı geri alınır ya da kaybedilir | **fatura kesilir**, hakedişe gelir kalemi düşer |
| Bizde karşılığı | `ANALIZ` → `ITIRAZ_KABUL` / `ITIRAZ_RED` | ⛔ **YOK** — bkz. aşağıdaki açık kalem |

> ⛔ **AÇIK — MODELDE KARŞILIĞI YOK.** İki eksik:
> ① İadenin **tazminat talebine** bağlanması (`Compensation` modeli var,
> bağ yok). ② **"Hurda Geliri"** hakediş kaleminin tanınması — bu bir
> GELİR kalemi ve bugün hakediş tarafında böyle bir tür yok.
> ⚠ Bu iş **AÇILMADI**: hurda gelirinin hakediş dosyasında hangi satır
> adıyla geldiği görülmedi. Ölçülmeden kalem açmak, adını uydurmak olur.

### 11.5 Aynı olanlar

- **Müşterinin iade sebepleri** — `(K)` "Trendyol dosyasında bahsedilen
  iade sebepleri aynı"
- **Satıcının 2 seçeneği** — onayla / reddet, sebep ne olursa olsun
- **2 günlük onay/red süresi** — iade teslim edildiğinde başlar
- **Satıcının ret gerekçeleri** — `(K)` "Trendyol'daki seçenekler aynı"
- **Onaylanan iadede iade kargosu satıcıya ait**

---

## 12. SÜRELER — dört ayrı sayaç `(K)` `(E)` `(EH)`

⚠ **BUNLAR DÖRT AYRI SAAT VE BİRBİRİNE KARIŞTIRILIYOR.** Belgenin ilk
yazımında ekrandaki "19 gün" ile kullanıcının söylediği "2 gün" çelişki
sanılmıştı; ikisi farklı sayaçlardı. Her biri **hangi olayla başlar** ve
**dolarsa ne olur** — asıl ayrım burada.

| # | Sayaç | Başlangıç | Süre | ⏳ DOLARSA NE OLUR |
|---|---|---|---|---|
| 1 | Müşteri kargoya versin | iade talebi | **7 gün** | iade **iptal** olur |
| 2 | Kargo satıcıya ulaşsın | **müşteri kargoya verince** | **10 gün** | ⚠ **iade SEBEBİ NE OLURSA OLSUN ONAYLANIR**, müşteriye parası iade edilir → satıcı **KARGO ŞİRKETİNE tazmin talebi** açar |
| 3 | Onay/red kararı | **iade satıcıya teslim edilince** | **2 gün** | iade otomatik onaylanır |
| 4 | Analiz (servis) | pazaryeri analize alınca | **28 gün** | — |

### 12.1 İkinci sayaç niye var — ve niye para tarafında

`(K)` _"Kargoda yaşanacak sorundan müşteriyi korumak için."_ İade kargoda
kaybolursa müşteri parasız ve ürünsüz kalmasın diye pazaryeri **süre
dolunca iadeyi otomatik onaylıyor** — sebep ne olursa olsun, itiraz hakkı
kullanılmadan.

> ⚠ **BU BİZİM İÇİN BİR KAYIP DEĞİL, BİR ALACAKTIR.** Ürün gelmedi ama para
> gitti; karşılığında **kargo şirketinden tazmin** talep edilir. Yani iade
> kapanırken bir **tazminat kaydı doğması gerekir** — bugün sistemde bu bağ
> yok (bkz. §9, madde 9).

### 12.2 Ölçüm — iki bağımsız kaynak, 2 dakika fark

`#11481463029` iki ayrı kaynaktan okundu ve **aynı bitişi** verdi:

| Kaynak | Okuma anı | Kalan | Hesaplanan bitiş |
|---|---|---|---|
| Video karesi `(E)` | 23.08 01:47 | 8g 10:47:35 | 31.08.2026 **12:34** |
| Masaüstü ekranı `(EH)` | 23.08 13:23 | 7g 23:14:03 | 31.08.2026 **12:37** |

**Fark 2 dakika** — okuma anlarının yuvarlanmasından. Sayaç gerçek.

⚠ **"10 GÜN" KULLANICI BEYANIDIR, ARİTMETİKLE KANITLANMADI.** 10 günlük
saat başlangıcı **21.08 12:37**'ye düşüyor (talepten +5,8 gün) — yani
müşteri o gün kargoya vermiş olmalı. Bu MAKUL ama tek başına kanıt değil:
15 günlük bir saat de aynı bitişi verir (başlangıç 16.08, talepten +0,8
gün) ve o da makuldür. Ayırt edici veri **kargoya verilme tarihi** ve o
ekranda YOK — yalnız kargo takip kodu var. Kural kullanıcı beyanı olarak
kayda geçti, aritmetik onunla **çelişmiyor**.

### 12.3 Diğer kaydın sayacı — 28 günlük analiz saati

`#11475261428` "Analiz" sekmesindeydi ve 28 günlük saatte oturuyor:
bitiş 11.09 09:29, 28 gün geri → başlangıç **14.08 09:29**, yani talepten
+6,6 gün. Akış süresiyle uyumlu (kargoya verilme → teslim → ret → ihtilaf
→ analiz).

---

## 13. "Kargoya Verilen" ekranında duran alanlar `(EH)`

Trendyol'un liste ekranı, iade detayından **fazlasını** taşıyor:

| Alan | Örnek | Bizde |
|---|---|---|
| Sipariş tarihi | 06.08.2026 17:04 | ✓ |
| İade talep tarihi | 15.08.2026 18:27 | ✓ |
| Alıcı adı | Hilal Sarı Ersöz | ❌ |
| **Stok kodu** | `HBCV00000LCK69` | ✓ (bizim kodumuz) |
| Barkod | `TXF40A13303184` | ✓ |
| **Kargo firması + kod** | Aras · `7260035885654078` | ⏳ kod alanı eklendi |
| Kargo türü | "Trendyol anlaşmalı kargo" | ❌ — kargoyu pazaryeri atıyor |
| **Desi** | **8** — ve ekranda DEĞİŞTİRİLEBİLİR | ⏳ alan eklendi |
| **Müşteri notu** | _"Parçası kırık, montaj deneyemedik bile."_ | ❌ |
| **Müşteri görseli** | "Görsel - 1" | ❌ |
| Otomatik onaya kalan | 7 gün 23:14:03 | ⏳ alan eklendi |
| Eylem düğmesi | **"İadeyi Teslim Aldım"** | = bizde `MAL_GELDI` geçişi |

⚠ **DESİ 8, ÜRÜN ₺2.169.** İade kargosu desiyle fiyatlanıyor ve 8 desi ucuz
değil — `iadeDesi` alanının niye eklendiği tam olarak bu. Ekranda
değiştirilebilir olması da anlamlı: pazaryerinin yazdığı desi yanlışsa
düzeltiliyor ve maliyet ona göre çıkıyor.

⚠ **MÜŞTERİ NOTU VE GÖRSELİ TUTULMUYOR.** Bunlar müşterinin KANITI —
bizim paketleme videomuzun karşı tarafı. İtiraz kararını verirken okunan
şey bu. Bugün sistemde yok; açılmadı çünkü önce itiraz akışının ekranı
gerekiyor.
