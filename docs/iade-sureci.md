# İade Süreci — Pazaryeri Gerçeği

> **Bu belge sistemin nasıl çalıştığını değil, PAZARYERİNİN nasıl çalıştığını
> anlatır.** Sistemi ona göre kuruyoruz; ikisi ayrıştığında kazanan bu belge.
>
> **Kaynak önceliği (CLAUDE.md):** kanalın kendi ekranı `(E)` `(EH)` **=**
> kargo firmasının takip ekranı `(KG)` > kullanıcının operasyon bilgisi
> `(K)` > dış hesaplayıcı. Aşağıdaki her satırın kaynağı yanında yazar.
>
> ⚠ **`(KG)` NİYE KANALLA AYNI SEVİYEDE:** kargo firması **kanaldan
> bağımsız üçüncü taraf.** Kanalın söylediğini onun kaydıyla
> karşılaştırmak, sistemin kendi tutarlılığına bakmaktan başka bir şeydir
> — ve bu belgede tam olarak bu yapıldı (§12.2). İkisi birbirini
> doğrulayabilir; biri ötekinin üstünde değildir.

**Yazıldı:** 23.08.2026 · **Kaynaklar:**
`(E)` Trendyol satıcı uygulaması ekran kaydı, 23.08.2026 01:47 ·
`(EH)` Hepsiburada satıcı paneli "Müşteri talepleri" ekranı, 23.08.2026 ·
`(B)` kullanıcının hazırladığı "İade Süreci" tablosu ·
`(KG)` Aras Kargo takip ekranı, 23.08.2026 ·
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

> **Üç yolda da kargo koduyla 2 iş günü içinde gönderilir** `(K)`.
> Değişken olan tek şey **kargoyu kimin ödediği.**

| Geliş yolu | Ne gönderilir | Kargo kimden |
|---|---|---|
| **Satıcı haklı bulundu** | aynı ürün, müşteriye geri | **Trendyol: satıcıya YANSITILMAZ** · **TY dışı: satıcı öder — beyan `(K)`, kanal bazında ÖLÇÜLMEDİ** |
| **Değişim (gerekçe E)** | **yeni ürün** | **her yerde satıcı öder** `(K)` |
| **Analiz bitti, geri gönderiliyor** | aynı ürün | **her yerde satıcı öder** `(K)` |

⚠ **SÜRE SÜTUNU KALDIRILDI — ÜÇÜNDE DE AYNIYDI.** Önce yalnız birinci
satırda "2 iş günü" yazıyordu, ötekilerde "—" vardı ve bu YANLIŞTI
_(kullanıcı düzeltmesi 23.08.2026)._ Sabit bir değeri sütunda tutmak, onu
değişkenmiş gibi gösterir; başlığa taşındı.

⚠ **KANAL ADI VERİLMİYOR — VE BU BİR TUTARLILIK DÜZELTMESİ.** Burada önce
_"diğer pazaryerleri: satıcı öder"_ yazıyordu. Kapsam tablosu N11 için
_"tecrübe yok"_ derken §5'in onun adına kural yazması ÇELİŞKİYDİ. Doğrusu:
kural TY için ölçüldü, ötesi **beyandır ve kanal bazında ölçülmedi.**
Hepsiburada §11'de ölçüldü ama **yalnız orada doğrulanan kısımlar** ona
yazılabilir; bu satır o kapsamda değil.

> ✅ **MODELİ SADELEŞTİRİYOR.** `islemSonTarihi` artık `ITIRAZ_KABUL`
> durumundaki HER kayıt için aynı anlamı taşıyor: *ürünü kargolama son
> tarihi.* Geliş yoluna göre değişen tek şey maliyet tarafı ve o zaten
> ayrı türetiliyor (`analizSonucu` / `itirazGerekcesi`). **Şema değişmedi.**

### Kargo sayısı — kanal farkı `(K)`

Satıcının haklı bulunduğu ve ürünün müşteriye geri gönderildiği senaryoda:

| | Ödenen kargo | Kaynak |
|---|---|---|
| **Trendyol** | **2** — siparişin müşteriye gidiş kargosu + müşteriden gelen iade kargosu | `(K)`, TY için |
| **TY dışı** | **3** — satış + iade + geri gönderim | `(K)` **beyan · kanal bazında ölçülmedi** |

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
- ⚠ Geri gönderim olursa **kargo ücreti her yerde satıcıya aittir** ve
  gönderim için yine **2 iş günü** vardır `(K)` — bu süre "Reddedilen"e
  hangi yoldan gelindiğine bakmaz (bkz. §5)

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
| 9 | **Kargo tazminatı bağı yok — ⚠ CANLI VAKA VAR** | `#11481463029`, 2 numaralı sayaçta ve **31.08.2026 12:35'te doluyor** (ölçüldü: Aras `(KG)` + TY ekranı). Dolarsa iade **sebebi ne olursa olsun** onaylanır, para gider, karşılığında kargo şirketinden tazmin doğar. Bugün iade ile `Compensation` arasında bağ yok → kapanan iade sistemde sessizce **KAYIP** görünür, oysa **ALACAK**. ⚠ Üstelik bu kayıt "parası geri alınabilir" sınıfında (§10): müşteri notu _"Parçası kırık"_, **desi 8**, ürün **₺2.169** — ve bugün `DIGER` kutusunda duruyor. |
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

## 12. SÜRELER — BEŞ ayrı sayaç `(K)` `(E)` `(EH)` `(KG)`

⚠ **BUNLAR BEŞ AYRI SAAT VE BİRBİRİNE KARIŞTIRILIYOR.** Belgenin ilk
yazımında ekrandaki "19 gün" ile kullanıcının söylediği "2 gün" çelişki
sanılmıştı; ikisi farklı sayaçlardı. Her biri **hangi olayla başlar** ve
**dolarsa ne olur** — asıl ayrım burada.

| # | Sayaç | Başlangıç | Süre | ⏳ DOLARSA NE OLUR |
|---|---|---|---|---|
| 1 | Müşteri kargoya versin | iade talebi | **7 gün** | iade **iptal** olur |
| 2 | Kargo satıcıya ulaşsın | **müşteri kargoya verince** | **10 gün** ✅ *ölçüldü* | ⚠ **iade SEBEBİ NE OLURSA OLSUN ONAYLANIR**, müşteriye parası iade edilir → satıcı **KARGO ŞİRKETİNE tazmin talebi** açar |
| 3 | Onay/red kararı | **iade satıcıya teslim edilince** | **2 gün** | iade otomatik onaylanır |
| 4 | Analiz (servis) | pazaryeri analize alınca | **28 gün** | — |
| 5 | **Geri gönderim** | **karar anı** — analizden dönene seçenek seçilince `(K)` | **2 iş günü** `(K)` | ⚠ **OTOMATİK ONAY + CEZA** — iade, MÜŞTERİNİN açtığı sebeple kapanır ve o sebebin cezası uygulanır; müşteriye parası yatırılır `(K)` |

⚠ **5 NUMARA ÜÇ YOLA DA İŞLER** — satıcı haklı · değişim · analiz sonrası
(§5). Önce yalnız birinciye yazılmıştı, yanlıştı `(K)`.

### 12.0 Beşinci sayaç — ÜÇ SORUNUN ÜÇÜ DE CEVAPLANDI `(K)` 25.08.2026

> Kapı şuydu: _"bu iki soru cevaplanmadan beşinci sayaç ekranda son tarih
> olarak gösterilemez."_ **İkisi de cevaplandı.** Ama cevap ÖLÇÜM değil
> **BEYAN** — kullanıcı anlatımı `(K)`, tek kaynak, ekran görüntüsüyle
> doğrulanmadı. Rozet bu yüzden `BEYAN` kalıyor: §12.2'deki `10 gün`
> `OLCULDU`ya **üç bağımsız kaynakla** geçmişti, burada bir kaynak var.

**(a) BİRİM ✅ — "2 İŞ GÜNÜ", takvim günü değil.** `(K)` 25.08.2026.
3 numaralı sayaçla ("2 gün") eşitlenmedi; ikisi ayrı duruyor. Fark gerçek:
**Cuma akşamı düşen bir kararda iki gün eder** — takvim günüyle sayarsak
Pazar biter, iş günüyle Salı.

⚠ **TESLİM EDİLEBİLİRLİK ÖLÇÜLDÜ — iki eksik çıktı, ikisi de kod tarafında:**

1. `isGunuEkle` (`src/lib/donem.ts`) **var** ve hakediş vadesinde zaten
   kullanılıyor. Ama **resmî tatilleri saymıyor, yalnız hafta sonunu** —
   araya bayram girerse son tarih 1–2 gün ERKEN çıkar. Bu sayaçta erken
   çıkmak lehimize (uyarı erken yanar), ama uydurma değil **bilinen bir
   sapma** olarak beyan edilir.
2. `SAYAC_KURALLARI`nda **birim alanı YOK.** Öteki dört sayaç takvim günü
   ve hesap `gunEkle` ile yapılıyor; "2" olduğu gibi yazılırsa **2 takvim
   günü** olur ve tam da yukarıdaki Cuma vakasında yanılır. Birim ayrımı
   açılmadan bu sayı koda GİRMEZ.

**(b) ÇIPA ✅ — KARAR ANI, kargo kodu DEĞİL.** `(K)` 25.08.2026:
_"Analizden dönen ürün seçeneklerden biri seçildiğinde."_

⚠ **VE İKİ ADAY ÇIPA ARASINDAKİ MESAFE ÖLÇEĞİYLE VERİLDİ: SAAT, GÜN DEĞİL.**
Seçimden sonra kayıt nihai karar için kısa süre **İhtilaflı**'da bekler,
sonra aksiyon alınır — **~1 saat**, ve _"net değil"_ diye beyan edildi
`(K)`. Yani _"karar anı mı, kargo kodu mu"_ sorusunun bedeli saatlerle
ölçülüyor. ⚠ Ama gece yarısını geçerse **1 iş günü** eder; gün sınırı
İstanbul gününe göre çizilir (anayasa).

**Sistemdeki karşılığı zaten var — şema DEĞİŞMİYOR.** Seçenek
`ANALIZ → ITIRAZ_KABUL` geçişinde soruluyor
(`analizSonucuIstenirMi` → `status === "ANALIZ"`), yani çıpa `GECIS_ANI`:
desteklenen bir tür. Son tarih `islemSonTarihi`ye yazılır ve o sütunun
kendi açıklaması bu işi zaten bekliyor.

⚠ **KAPSAM AÇIK KALDI — BEYAN BİR YOLU ANLATIYOR, SAYAÇ ÜÇ YOLDA İŞLİYOR.**
`ITIRAZ_KABUL`e üç durumdan geliniyor: `ITIRAZ_ACILDI` ·
`ITIRAZ_INCELEMEDE` · `ANALIZ`. Beyan **analiz yolunu** anlatıyor;
analiz olmadan "satıcı haklı" çıkan iki yolda çıpanın yine karar anı
olduğu **varsayılmadı.** Aynısı saymak, ölçülen kümenin dışına ölçüt
uygulamak olurdu.

**(c) DOLARSA NE OLUYOR ✅ — CEVAPLANDI `(K)` 25.08.2026.** Ve cevap
sorulan şıkların hiçbiri değil:

> _"İade otomatik olarak müşterinin açtığı seçenekten kapanır. Mesela
> müşteri kusurlu üründen açmışsa ve biz 'değişim yapacağız' deyip ürün
> göndermediysek, **kusurlu ürün gönderme cezası ile** iade kapanır,
> müşteriye parası yatırılır."_

⚠ **SONUCU BİZİM EYLEMİMİZ DEĞİL, MÜŞTERİNİN SEBEBİ BELİRLİYOR.** "Ceza
kesilir" demek eksik olurdu: kesilen ceza **iadenin hangi kapıdan
açıldığına** bağlı. Aynı gecikme, sebebi _"Beğenmedim"_ olan bir iadede
başka, _"Kusurlu ürün gönderildi"_ olan bir iadede başka sonuç doğurur.

⚠ **BU, BEŞ SAYACIN EN PAHALISI.** 2 ve 3 numara dolunca iade onaylanır
(mal yok, para gitti). Beşinci dolduğunda **mal BİZDE kalır, para yine
gider, üstüne ceza biner** — yani tek kayıpla değil üç kayıpla kapanır.

⛔ **AMA CEZANIN KENDİSİ ÖLÇÜLMEDİ.** Hangi sebep hangi cezayı doğuruyor,
tutarı ne — bunların hiçbiri bizim defterimizde takip edilmiyor. Sistem
**mekanizmayı** yazar, **rakamı YAZMAZ** (_"sistem, kendi defterinde takip
etmediği şey hakkında iddia kurmaz"_). Ceza tarifesi bir gün ölçülürse
ayrı kalem olarak açılır.

⚠ Ve bu satır bugün **bekçisiz**: `rma:dogrula` dört sayacın sonucunu
adıyla sınıyor, beşincisininkini sınamıyor — biri sonucu bir tahminle
değiştirse hiçbir kontrol kırmızı yanmaz. Sayaç koda girerken o kontrol
de yazılır.

**Üç sorunun ÜÇÜ de cevaplandı. Kalan tek şart:**

**Rozet `BEYAN` → `OLCULDU`.** Üçü de tek kaynaktan (kullanıcı anlatımı)
geliyor; §12.2'deki `10 gün` üç bağımsız kaynakla terfi etmişti.
"Reddedilen" sekmesinden tek ekran görüntüsü yeter: **karar tarihi,
kargo kodu ve kalan süre aynı karede.**

### 12.1 İkinci sayaç niye var — ve niye para tarafında

`(K)` _"Kargoda yaşanacak sorundan müşteriyi korumak için."_ İade kargoda
kaybolursa müşteri parasız ve ürünsüz kalmasın diye pazaryeri **süre
dolunca iadeyi otomatik onaylıyor** — sebep ne olursa olsun, itiraz hakkı
kullanılmadan.

> ⚠ **BU BİZİM İÇİN BİR KAYIP DEĞİL, BİR ALACAKTIR.** Ürün gelmedi ama para
> gitti; karşılığında **kargo şirketinden tazmin** talep edilir. Yani iade
> kapanırken bir **tazminat kaydı doğması gerekir** — bugün sistemde bu bağ
> yok (bkz. §9, madde 9).

### 12.2 ✅ KAPANDI — üç bağımsız kaynak, 25 saniye

`#11481463029` · Aras kargo kodu `7260035885654078`.

**`(KG)` Aras takibi:** _"Gönderi yola çıktı"_ — **21.08.2026 12:35:00,
Kocaeli.** Bu, 2 numaralı sayacın çıpası.

Pazaryerinin gösterdiği kalan süreden 10 gün geri sarınca:

| Kaynak | Sayaç bitişi | 10 gün geri → başlangıç | **Aras ile fark** |
|---|---|---|---|
| Video karesi `(E)` | 31.08 12:34:35 | 21.08 **12:34:35** | **25 saniye** |
| Masaüstü ekranı `(EH)` | 31.08 12:37:03 | 21.08 **12:37:03** | **2 dakika** |
| **Aras takibi `(KG)`** | — | 21.08 **12:35:00** | — |

**15 günlük rakip hipotez ELENDİ:** başlangıcı 16.08'e düşürüyordu, oysa
gönderi 21.08'de yola çıktı. 7 · 12 · 14 günlük hipotezler de binlerce
dakikayla sapıyor.

> ✅ **`10 gün` ROZETİ `BEYAN` → `OLCULDU`.** Sayaç **kargoya verilme
> anından** başlıyor ve **10 gün** sürüyor.

⚠ **DOĞRULAMA SİSTEMİN KENDİ TUTARLILIĞIYLA DEĞİL, DIŞ KAYNAĞIN KENDİ
ETİKETİYLE YAPILDI.** Üç kaynağın ikisi Trendyol'un kendi ekranı — onlar
birbirini doğrulasaydı yalnız _"TY kendi içinde tutarlı"_ demiş olurduk
(CLAUDE.md: _"bağımsızlık kaynağın ayrılığıyla ölçülür, yolun ayrılığıyla
değil"_). Belirleyici olan **üçüncüsü**: kargo firmasının kendi kaydı,
Trendyol'dan bağımsız.

⚠ **BU BİLGİ ŞEMAYI DEĞİŞTİRMİYOR.** `otomatikOnayTarihi` yine
pazaryerinin söylediği tarih olarak KAYDEDİLİR, hesaplanmaz — öteki dört
sayacın çıpası farklı ve hepsini türetmeye kalkmak bilmediğimiz
kurallardan tarih uydurmak olur. Ama artık **çapraz kontrol edilebilir:**
elle girilen tarih, kargoya verilme + 10 günden belirgin sapıyorsa ekran
soru sorabilir. _(Türetme değil, kontrol.)_

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
