# Bekleyen İşler

> **Yalnız AÇIK kalemler.** Kapanan iş buradan **silinir**, gerekçesiyle
> birlikte → **[ARSIV.md](ARSIV.md)**'e geçer.
>
> **Durum etiketi zorunlu:** `[KOMUT]` verildi/taşınmadı ·
> `[YAZILDI]` betik var/koşmadı · `[KOŞTU]` ölçüm yapıldı ·
> `[BEKLİYOR]` dış bir şeye bağlı.
> _Pano işin DURUMUNU değil NİYETİNİ kaydederse zamanla kurgu üretir._
>
> **Kimlik tekildir.** Aynı kod ikinci kez kullanılmaz; aciliyet ayrı
> sütunda yaşar, kodun içinde değil.

---

## 🚨 [YANLIŞ CEVAP VEREN EKRAN] — bu etiket varken YENİ CEPHE AÇILMAZ

> Bir ekran **rakam gösteriyor ve rakam yanlışsa**, o ekran susan bir
> ekrandan tehlikelidir: kullanıcı ona bakıp karar verir. Bu etiketi
> taşıyan kalem varken yeni bir cephe açılmaz — önce yanlış cevap susar.

| Ekran | Durum |
|---|---|
| **Nakit takvimi** | ✅ **ETİKET KALKTI 24.08.2026** — ekranın verdiği cevap, koşumun ölçtüğü diple **aynı**: 14 gün `−₺143.485,15` (dip 03.09) · 30 gün `−₺242.975,35` (dip 18.09). "Açık yok" artık yazılamıyor. |

> **Şu an bu etiketi taşıyan kalem YOK.**

---

## 🏁 API ÖNCESİ KAPANIŞ — beşi kapanmadan Faz 4 kodu YAZILMAZ

| # | İş | Durum |
|---|---|---|
| 1 | **K20 sayımı** | ✅ **[KOŞTU 24.08.2026]** — `npm run canli:k20-sayim` |
| 2 | **Nakit takvimi düzeltmesi** | ✅ **[KOŞTU 24.08.2026]** — girişler kanal belgesinden, tahmin kaldırıldı |
| 3 | **Halil'de üç madde** | ✅ **ÜÇÜ DE KAPANDI 25.08.2026.** ✅ API anahtarı geldi. ✅ **Test 4 GEÇTİ** — `/okut`'ta `7260036314074719` okutuldu, sipariş gönderi numarasıyla eşleşti. ✅ 5. sayaç **CEVAPLANDI** (3/3 — rozet `BEYAN`, terfi için ekran görüntüsü, bkz. H25①). ✅ **`11473322212` değişim düğmesi — KONUSUZ KALDI, test yapıldı ve sonucu bu:** düğme çıkmıyor çünkü bildirim **`İPTAL`** durumunda (_"Bildirim iptal edildi, mal hiç gelmedi"_ — K39 ile temizlenen test artığı). ⚠ **BU BİR KUSUR DEĞİL, DOĞRU DAVRANIŞ:** görünme şartı üç bacaklı (ayrılan ürün var · iadeye bağlanmamış · **`status !== IPTAL`**) ve iptal edilmiş bir bildirim _"bu hiç olmadı"_ demektir; üstünden `EXCHANGE_OUT` yazmak stok defterine **sahipsiz bir çıkış** koyardı. ⏭ Aynı satışa **açık** bir bildirim doğarsa düğme kendiliğinden görünür; ayrıca iş yok. |
| 4 | **H10 Salı tarifesi** | ✅ **[KOŞTU 25.08.2026]** — dosya geldi (`870249-25-08-2026-08-00-45.xlsx`), **ekrandan** yüklendi. Yeni pencere `25.08 08:00 → 01.09 07:59` · **712 kalem** · 177 bağlı, 1 bağsız. Boşluk doğmadı: önceki pencere `25.08 07:59`da bitti, yenisi `08:00`da başladı. |
| 5 | **A3-① sağlık ölçümü** | ✅ **[KOŞTU 25.08.2026, İKİNCİ KEZ TAZELENDİ]** — `npm run canli:ty-saglik` · **YETKİSİZ = 0**, anahtar tam çalışıyor.<br>**AÇIK 4:** SİPARİŞ (5 kayıt) · **HAKEDİŞ (86 kayıt)** · İADE (5) · ÜRÜN süzgeci (5) — dördünün de alan haritası çıktı. **AÇIK/BOŞ 1:** diğer finans (uç çalışıyor, pencerede kayıt yok). **ULAŞILAMADI 2:** sağlık ucu + kargo firmaları — ⚠ ikisinin de **yolu tahmin edilmişti**, `556` TY'nin kapalı olduğunu GÖSTERMEZ; kendi bilgisizliğimiz karşı tarafın kusuru gibi raporlanmaz.<br>✅ **GERİYE DÖNÜK SINIR DA ÖLÇÜLDÜ — [KOŞTU 26.08.2026]** `npm run canli:ty-sinir` (salt okuma, yalnız GET). ⛔ işareti kalktı; A3-② tasarımının beklediği sayı artık elde:<br>**SİPARİŞ ucu** — 14 günlük pencere `3 ay` öncesine kadar **veri getiriyor** (112 kayıt); `6 ay` öncesi 0 kayıt (**KABUL/BOŞ — hüküm değil**). Pencere GENİŞLİĞİ: `90 gün` tek istekte **kabul** (112 kayıt), `180 gün` 0.<br>**HAKEDİŞ ucu** — **15 GÜN SERT TAVAN, KANITLI:** 30/60/90 gün `400` ile reddedildi ve mesaj birebir yazıyor: _"Başlangıç ve bitiş tarihi arasındaki fark 15 günden büyük olamaz"_. Bu bir tahmin değil, ucun kendi beyanı.<br>**İADE ucu** — `3 ay` öncesine kadar kabul.<br>⚠ **DOKÜMANDAKİ ÇELİŞKİ ÇÖZÜLDÜ:** bir sayfa *"geriye 1 ay"*, öteki *"3 ay"* diyordu — **ölçüm 3 ayı doğruluyor**, sipariş ucunda 1 aylık sınır YOK. ⚠ **VE "KABUL/BOŞ" SINIR KANITI SAYILMADI:** uç pencereyi kabul edip o tarihlerde kayıt olmadığını söylüyor olabilir; kendi defterimizle kıyaslanmadan *"sınır burası"* denmez ve bu çıktıda **ayrı kova** olarak duruyor. **Sayım: KABUL 19 · KABUL/BOŞ 2 · REDDETTİ 3 · YETKİSİZ 0 · ULAŞILAMADI 0.** |

---

## 🔬 A3-② MUTABAKAT — [KOŞTU 26.08.2026] · SALT OKUMA

> `npm run canli:ty-mutabakat -- --gun=30` · veritabanına hiçbir şey yazılmadı,
> hiçbir yazma ucu çağrılmadı.

**KAPSAM BEYANI (rakamlardan önce):** Trendyol · AXCALI (`externalId 870249`,
kimlikle bulundu, adla değil) · `2026-07-27 → 2026-08-26` · defter tarafı
iptaller DAHİL, ayrı işaretli · API tarafı 3 günlük 20 dilim, 60 günlük
DEĞİŞİKLİK penceresi.

| Kova | Adet | Kanıt değeri |
|---|---|---|
| **(a)** API'de VAR, defterde YOK | **123 sipariş · 124 adet · ₺446.537,36** | ✅ **TEK YÖNLÜ KANIT** |
| **(b)** İkisinde de var, alanlar tutuyor | **83** | temiz |
| **(c)** İkisinde de var, ALAN FARKI | **22** | desen çıktı ↓ |
| **(d)** Defterde VAR, API'de YOK | **2** | ⛔ yorumlanamaz — ve ikisi de bilinen test artığı (`sfsfsf` · `115180181780`, ikisi de İPTAL) |
| eşleştirilemeyen | **1** | sipariş numarası YOK — hiçbir kovaya giremez |

### ⚠ İLK TASARIM ÇÖPE ATILDI — VE RAKAMLAR YAYIMLANMADAN

**① `startDate/endDate` `orderDate`i SÜZMÜYOR.** Paketin SON DEĞİŞİKLİK anını
süzüyor. Ölçüm: `10.08→27.08` penceresi `orderDate 04.08→21.08` döndürdü.
İlk tasarım bunu `orderDate` sanmıştı; o varsayımla üretilen **(a)=104 ·
(d)=74** rakamları **fark değil KAPSAM BOŞLUĞUYDU.**

**② TEK GENİŞ PENCERE SESSİZCE EKSİK DÖNÜYOR — 7 KAT.**
`tek 90 günlük pencere → 114 kayıt (totalPages: 1)` · `13 × 7 günlük dilim →
804 FARKLI sipariş`. Hiçbir hata vermeden, `totalElements: 114` diyerek.

**③ DİLİM ÖLÇÜLEREK SEÇİLDİ:** `14 gün → 234 · 7 gün → 234 · 3 gün → 260 ·
1 gün → 198 (5 hata)`. 3 gün seçildi.

**④ ⛔ YAKINSAMA SAĞLANMADI:** 3 günlük dilim 7 günlükten 26 kayıt fazla
buluyor. Yani **API tarafı bir ALT SINIRDIR.** Bunun iki sonucu var ve ikisi
de rapora yazılı: **(a) tek yönlü kanıttır** (görülen kayıt yok sayılamaz),
**(d) kanıt DEĞİLDİR** (API'de görünmemek orada olmadığını göstermez).

⚠ **VE DÜZELTME KENDİNİ DOĞRULADI:** dilimleme açılınca **(d) 74 → 2**'ye
düştü, **(b) 26 → 83**'e çıktı. Eski 74'ün tamamı enumerasyon artefaktıymış.

### (c) — 22 SAPMA, İKİ DESEN ÇIKTI

`ALAN DAĞILIMI: tarih=20 · tutar=5 · adet=1 · paketSayisi=1`

· **TARİH KAYMALARI: `+1 gün × 20` — hepsi aynı yönde, sistematik.**
  Bu 20 ayrı hata değil BİR mekanizma: `orderDate` saat taşıyor (**H20**).
· **TUTAR SAPMALARI: `15,00 × 3` · `−7.798,00 × 1` · `−21,00 × 1`.**
  `₺15` takipçi kuponu (**K19**). Diğer ikisi **tek tek bakılacak** —
  `−7.798` büyük ve açıklanmadı.

### ⚠ İKİ AÇIKLANMAMIŞ SAPMA — DOSYA AÇILDI, BİRİ ARACIN KUSURU ÇIKTI

**`−7.798,00` → ARACIN KUSURUYDU, VERİ DEĞİL.** `11522079868` siparişinde API
**üç paket** döndürdü: `4090482527` (`order-creation`, UnPacked, 2 adet) ve
onun bölünmüşleri `4090491834` + `4090491835` (`split`, Delivered, 1'er adet).
Araç üçünü de topluyor, **15.596** çıkarıyordu; siparişin gerçeği **7.798** ve
**defter `paketSayisi: 2` ile DOĞRUYU söylüyordu.**
⚠ **ÖLÇÜT `createdBy` DEĞİL, BAĞ:** _"`order-creation` olanı at"_ demek
bölünmemiş siparişlerin hepsini atardı. Doğru ölçüt ilişkidir — bir paketin
kimliği başka bir paketin `originPackageIds`inde geçiyorsa o **EBEVEYNDİR** ve
yerini çocukları almıştır. Düzeltildi: **(b) 83→84 · (c) 22→21**, sapma kayboldu.

**`−21,00` → AÇIKLANAMADI, UYDURULMADI.** `11467475277` · 01.08 · tek kalem
`8720689013949` · 1 adet · API `1.833,00` · defter `1.812,00` · **indirim 0 ·
iade yok · tek paket.** İki taraf da tek satır; fark neden 21, görünmüyor.
⏭ **[AÇIK — FATURA BEKLİYOR]** Halil'in faturasından bakılacak; kaynak sırasında fatura 1. basamak.

### ⚠ ENUMERASYON TAMLIĞI — ÇAPRAZ KURULDU, CEVAP: EKSİK

| Kaynak | Sayı |
|---|---|
| ① API dilimlemesi (3 günlük, 60 gün) | **497** farklı sipariş no |
| ② Hakediş satırları | 431 `orderNo` → **283 sipariş numarası biçiminde** · **148 BAŞKA CİNS ⛔ kıyasa girmez** |
| ③ Defter (tüm TY geçmişi) | **110** |

**ÇAPRAZ: hakedişte VAR · API dilimlemesinde YOK = 70.** Hepsinin hakediş anı
**21–26 Temmuz**, yani paketleri API'nin 60 günlük değişiklik penceresinin
**içinde** dokunulmuş olmalıydı. Sınıra yakın 0, açıkça eski 0.

> **⛔ DİLİMLEME EKSİK. `123` rakamı bir ALT SINIRDIR ve öyle yazılacak.**

⚠ **VE ÇAPRAZIN KENDİSİ ÖNCE KİRLİ ÇIKTI:** ilk koşum **"134 bulunamadı"**
dedi; ölçüldü ki `SettlementItem.orderNo` **iki cins kimlik** taşıyor
(283 × `1…` 11 hane = sipariş no · **148 × `4…` 10 hane = PAKET kimliği**).
Biçime göre ayrılınca gerçek sayı **70**. _"Bulunamadı"_ ile
_"karşılaştırılamadı"_ ayrı sayıldı.

### ✅ A3-③a — YANLIŞ ALARM, ÖLÇÜMLE KAPANDI (26.08.2026)

⛔ **BENİM TEŞHİSİM YANLIŞTI ve kalem açılmamalıydı.** `orderNo`daki 10
haneli "4…" kodlara _"paket kimliği"_ demiştim; **biçim benzerliğine
bakmıştım.** Ölçüm çürüttü:

    Trendyol — AXCALI : 409 kalem · hepsi 11 hane "1…" · diğer 0
    Hepsiburada       : 820 kalem · hepsi 10 hane "4…" · diğer 0

Ayrılan şey başka bir kimlik cinsi değil **BAŞKA BİR KANAL**. HB sipariş
numaraları gerçekten 10 hane "4" ile başlıyor; defterdeki **24 HB satışının
hepsi** o biçimde ve **ikisi doğrudan eşleşti** (`4006304001` · `4702310503`).
Kolonda **şema sorunu YOK**, ayırt edici sütuna da gerek yok.

⚠ **VE BU, KIYASI DAHA SAĞLAM YAPTI:** süzgeç biçimden **kanal hesabı
kimliğine** çevrildi. Biçim süzgeci doğru kümeyi **tesadüfen** veriyordu —
biçim değiştiği gün sessizce yanlış küme verirdi. Çapraz sayısı **70 → 37**.

⚠ **K8 SAYISI DA DÜZELDİ:** 1271 bağsız kalemin **816'sı HEPSİBURADA** kalemi
— TY eşleştirmesinin onları bağlayamaması **kusur değil, kapsam**. TY tarafında
bağsız kalem **400**, `orderNo` boş **55**. _("Kapsam boşluğu fark değildir"
kuralının hakediş tarafı.)_

### 🔬 ENUMERASYON — MEKANİZMA ADLANDIRILDI (26.08.2026)

**Kaçan 37 siparişten 8 örnek TEK TEK çekildi — 8/8 ✓.** Yani kayıtlar API'de
VAR; enumerasyon onları düşürüyor.

**Ortak özellik ARANDI, BULUNAMADI:** 8'inin de `status: Delivered` ·
`createdBy: order-creation` · `shipmentPackageStatus: Delivered` ·
`deliveryType: normal` · aynı kargo firması. **Ayırt edici bir alan yok** —
yani düşme, kaydın bir özelliğinden değil **enumerasyon davranışından**
geliyor.

**SIRALAMA/SAYFALAMA ELENDİ:** aynı 3 günlük dilim dört farklı sıralamayla
(varsayılan · `PackageLastModifiedDate` ASC/DESC · `CreatedDate` ASC)
**dördünde de 14 kayıt, 14 farklı sipariş** döndürdü. Sayfalama kayması
değil.

⚠ **VE DİLİM KÜÇÜLTMEK ÇARE DEĞİL:** 1 günlük dilim 5 hata alıyor ve DAHA AZ
buluyor (198 < 260). Ayrıca aynı ölçüm iki koşumda 497 ↔ 560 verdi — tarih
penceresi enumerasyonu **kararlı bile değil.**

> **MEKANİZMA:** _tarih penceresi enumerasyonu sessizce kayıt düşürüyor;
> sebebi kaydın özelliği ya da sıralama DEĞİL._ Bu bir TY davranışı ve
> bizim tarafımızdan kapatılamıyor.

**⏭ TELAFİ YOLU ÖLÇÜLDÜ VE ÇALIŞIYOR:** `?orderNumber=` ile **tek tek çekme
8/8 başarılı.** Kuru koşum bu mekanizmayı telafi ederek kurulacak — sipariş
numarası BAŞKA bir kaynaktan biliniyorsa (hakediş · kargo faturası) o sipariş
tek tek çekilip doğrulanabilir.
⚠ **AMA BU TAMLIK VERMEZ:** hiçbir kaynakta adı geçmeyen bir sipariş yine
görünmez. Liste **ALT SINIR** olarak kalır ve raporda öyle yazar.

### 🆕 A3-④/⑤ — OTOMATİK ÇEKİM + HAKEDİŞ/KARGO UÇLARI (tasarım turu, 26.08)

**KOD YAZILMADI.** Ölçüm koştu, tasarım raporlandı, karar Halil'de.

⛔ **HIZ LİMİTİ BAŞLIĞI YOK.** Yanıt başlıkları ölçüldü (17 başlık, hepsi
basıldı): `rate` · `limit` · `remain` · `retry` · `quota` geçen TEK BAŞLIK
YOK. Uç sınırını beyan etmiyor → sıklık **ölçümle** seçilecek, beyanla değil.

⚠ **VE AŞIRI YÜKLENME `429` DEĞİL `500` OLARAK GELİYOR.** Aynı çağrı 2 sn
arayla `200` + 3 kayıt, hızlı ardışıkta `13/13 HTTP 500`. Naif bir yeniden
deneme döngüsü bunu "uç bozuk" diye okur. _(Ölçüldü: `Stoppage`.)_

**⑥ HAKEDİŞ UCU — KURU KOŞUM:** 15 günlük 13 dilim · **hata 0 · boş 0** ·
**1863 kalem** (6 ay). Defterde bu hesapta **463** → API **4 KAT** fazla.
✅ Kalem `id` alanı taşıyor (`14020236951`) → kimlik anahtarı hazır, uydurma
bileşik anahtar gerekmiyor.
✅ `orderNumber` **VE** `shipmentPackageId` **AYRI ALANLAR** — 26.08'de
düzelttiğim karışıklığın kaynağı burada kapanıyor.
✅ `commissionRate` + `commissionAmount` **kalem düzeyinde** → K9 dilim
şemasının bağımsız teyidi mümkün. ⚠ Ölçüm planı yazıldı, **hüküm verilmedi.**

**⑦ KARGO FATURASI — API'DE VAR.** ⚠ İlk sondam bulamadı ve sebep **benim
kusurumdu**: `size=50` gönderiyordum, uç `500 ya da 1000` istiyor ve hatayı
`400` diye döndürüyor. "Uç yok" diye rapor edilecekti.
`otherfinancials?transactionType=DeductionInvoices` → **`Kargo Fatura`
63 kalem · ₺284.674,65** (6 ay). Ayrıca `Platform Hizmet Bedeli` 59 kalem ·
₺26.003,90 → ₺13,19'un kanalın kendi belgesindeki karşılığı.

⛔ **HTTP 500 VEREN DÖRT TÜR:** `Stoppage` · `CreditNote` ·
`CommissionInvoice` · `FinancialItem` (4/13). TY tarafı — bizim
parametremiz değil (aynı çağrı yavaş koşulunca `Stoppage` 200 döndü).

**⑧ GEÇMİŞ SINIRI — YAZILDI:** API sipariş **90 gün**, hakediş **6 ay**.
Defterin en eski hareketi **2025-08**. ⛔ **ARADAKİ DÖNEM API'DEN KAPANMAZ**
— elle giriş ya da dosya dökümü. Bu bir SINIR, çözülecek sorun değil.

⏭ **KARAR BEKLEYEN:** anahtarın Vercel'e taşınması (risk raporu verildi) ·
iki mod (geçmişi doldur / yeni sipariş al) · sıklık.

### ⚠ −21 VAKASI — ÖLÇÜLDÜ, DÜZELTİLMEDİ (26.08)

`11467475277` · 01.08 · **elle girilmiş** (`importBatch` boş) ·
tek kalem `8720689013949` × 1 @ **1.812,00** · API/fatura **1.833,00**.
Kâr hesaplanmış: NET-1 `280,11` · NET-2 `230,91`.
⛔ **DÜZELTİLMEDİ:** tutar bir PARA alanı ve metadata istisnası kapsamına
girmiyor; düzeltme satış düzenleme ekranından yapılır ve kârı tazeler.
⏭ Halil ekrandan düzeltir; ya da açık talimat verirse izli betikle.

### ✅ TEST ARTIĞI TARAMASI — NEREDEYSE TEMİZ (26.08)

| Kova | Sonuç |
|---|---|
| (a) sipariş kodu şüpheli | **1** — `sfsfsf`, **zaten İPTALLİ** |
| (b) sipariş numarasız satış | **2** (biri iptalli, biri aktif 03.08) |
| (c) tutarı sıfır/negatif | **0** |
| (d) kalemsiz satış | **0** |
| (e) ürün adı şüpheli | **0** |
| (f) alım/gider açıklaması | **0** |

⚠ **İLK DESENİM GÜRÜLTÜ ÜRETTİ ve düzeltildi:** `111` gerçek sipariş
numaralarını (`11453897111`), `zzz` LEGO **DREAMZzz**'i, `xxx` **XXXL**'i
yakaladı — 11 gerçek ürün "şüpheli" işaretlendi. Rakam ve tek harf
tekrarları elendi. _Bir desen 11 gerçek kaydı işaretliyorsa o desen ölçüt
değil gürültüdür._
⚠ **HÜKÜM YOK** — bunlar aday; işaret Halil'in.

### ⚠ MARJ ŞERHİ — KOŞUYOR (26.08.2026)

İçe aktarılan satışlar **ciroya giriyor, NET'e girmiyor**. Ekran marjı
**%2,58**, maliyet bağı olanlarda **%9,31**. Haziran **%0,3** (47 satışın
46'sı içe aktarma), temmuz **%0,2** (287'nin 283'ü) — o aylarda ekran marjı
**anlamsız**.

Panel · satışlar · rapor ekranlarında iki rakamlı şerh. Sönme ölçütü
`profitStatus` (⚠ `importBatch` DEĞİL — bağ kurulunca satır hâlâ
`importBatch` taşıyacak, şerh sönmezdi).

### ✅ KİMLİK ARAMASI — 11 SİPARİŞ KURTARILDI (26.08.2026)

İçe aktarma barkodu **yalnız `ProductVariant.barcode`da** arıyordu.
`194645027819` sistemde **VARDI** — `axcali2755`in **Trendyol Kanal SKU'su**
olarak — sorgu göremiyordu. ₺27.807 defterin dışındaydı.

⚠ **ŞEMA DEĞİŞİKLİĞİ GEREKMEDİ:** merdiven 1. basamakta durdu. `ChannelSku`
bu iş için zaten var; ikinci barkod alanı da yeni tablo da gereksiz.
⚠ **AYRI LİSTE YAZILMADI:** `kodKosuluToplu`, `kodKosulu` ile aynı
`VARYANT_KOD_ALANLARI` sabitinden türüyor.
⚠ **BELİRSİZ KOD YAZILMIYOR:** `channelSku` yalnız (hesap, kod) çiftinde
tekil — aynı kod iki hesapta iki farklı varyanta işaret edebilir.

**İkinci parti koştu:** 12 sipariş (2 iptal dahil) · 574 → 586 ·
`ty-20260826130847`. ✅ **ÜÇÜNCÜ PARTİ KOŞTU (26.08):** Halil iki ürün kartını açtı, ikisi de
`barcode` alanında doğrulandı (`ELK-DJ-DM-01` · `OYU-LG-LMC10-01`).
2 sipariş yazıldı · **586 → 588** ✓ · `ty-20260826151804` · ikinci koşum **0**.

> **⛔ 13'LÜK LİSTE KAPANDI.** Son koşumda `YAZILAMAZ: 0`.
> 11'i Kanal SKU düzeltmesiyle, 2'si ürün tanımıyla girdi.

### ✅ STOK + MALİYET BAĞI — KOŞTU (26.08.2026)

**Karar: bağlanabilen bağlanır.** 82 satış bağlandı, kârları tazelendi.
`StockMovement` **541 → 624** (+83) ✓ · `AuditLog: ICE_AKTARMA_STOK_BAGI`.
⛔ **329 satış ATLANDI** — hareket YAZILMADI. Negatif stok yok, kaynaksız
çıkış kovası yok. Sebep: o ürünlerin **alımı deftere hiç girmemiş** (K55).

**defter-ayrışması:** SAPAN **2** — K54'ün iki hayaleti, ayrı kovada.
⚠ Bağdan hemen sonraki koşum **3** demişti, sonraki iki koşum **2**; bir
varyant arada temize geçti. _Defter akıyor — ölçüm anı yazılır._

**Geri alma** (ters kayıt, silme değil):

    npm run canli:stok-bagi -- --geri=ty-20260826111346 --uygula
    npm run canli:stok-bagi -- --geri=ty-20260826130847 --uygula
    npm run canli:stok-bagi -- --geri=ty-20260826151804 --uygula

<details><summary>tasarım ölçümü (26.08, arşiv)</summary>

### 🔬 K55 — STOK + MALİYET BAĞI · TASARIM ÖLÇÜMÜ

**KOD YAZILMADI.** Ölçüm (26.08.2026, salt okuma):

| | |
|---|---|
| bağsız kalem | **437** (iptalsiz **409**) |
| farklı varyant | **152** · toplam **416 adet** |
| tarih aralığı | 27.06 → 26.08 |
| **FIFO YETERLİ** | **24 varyant** (%16) |
| FIFO yetersiz | 23 |
| **HİÇ hareket yok** | **105** (%69) |
| **karşılıksız kalacak adet** | **336 / 416 (%81)** |

⛔ **"PARTİ YETMEZSE" BİR İSTİSNA DEĞİL, ÇOĞUNLUK.** Tasarımın merkezi
soru buydu ve cevap ölçümle geldi: kalemlerin **%81'i** maliyet kaynağı
bulamayacak. Bu, üç seçenek arasındaki tercihi bir ayrıntı olmaktan çıkarıp
**işin kendisi** yapıyor.

✅ **`occurredAt` KARARI ÖLÇÜLDÜ:** `Sale.soldAt` (İstanbul gününün UTC gece
yarısı). Mevcut `SALE_OUT` hareketlerinin **151/152**'si zaten birebir böyle
— yeni kayıtların farklı davranması bir tutarsızlık olurdu.

</details>

### 🆕 K55 — ALIM DEFTERİ AÇIĞI (26.08.2026, AÇILDI)

**329 satış maliyet bağı kuramıyor** çünkü o ürünlerin alımı deftere hiç
girmemiş. 128 varyant · 335 adet karşılıksız.

> **Satışlar API'den akıyor, alımlar elle giriliyor — makas buradan
> açılıyor.** Bu bir satış arızası değil; satış tarafında yapılacak bir şey
> yok.

### 📐 K55 ÖLÇÜLDÜ (26.08.2026) — ÖNERİ YOK, DÖRT TABLO

**① AÇIK DAĞINIK, TOPLU DEĞİL.** 128 varyant · 335 adet · **₺1.156.864**.

    ilk  5 ürün → %16,8      ilk 20 ürün → %42,0
    ilk 10 ürün → %26,7      ilk 40 ürün → %63,7   ilk 64 → %81,2

⛔ **Az sayıda üründe TOPLANMIYOR** — %80'i kapatmak **64 ayrı ürün** ister.
47 varyant tek kalemlik. En büyük tek kalem ₺61.671 (Philips espresso).

**② ZAMAN — İKİ FARKLI SORUN, İKİSİ DE VAR.**

| Ay | Kalem | Adet | Tutar | Pay |
|---|---|---|---|---|
| 2026-06 | 36 | 37 | 128.231 | %11,1 |
| **2026-07** | **244** | **249** | **856.279** | **%74,0** |
| 2026-08 | 49 | 49 | 172.354 | %14,9 |

Temmuz ağırlıklı (geçmiş dönem) **ama ağustos da 49 kalem** — bugünkü akışta
da boşluk var.

**③ ALIM DEFTERİ KAPSAMI — İLK KEZ ÖLÇÜLDÜ.**
380 alım · 380 kalem · **886 adet** · 30.05.2024 → 26.08.2026.
**174 / 1097 varyanta dokunuyor (%15,9).**
⚠ Defter **yeni**: 2026-03'ten itibaren ciddileşiyor (03: 24 · 06: 62 ·
07: 79 · **08: 144**).

**④ TEDARİKÇİ.** Hepsi Burada 248 alım / 537 adet · Amazon 83 / 236 ·
N11 13 · Trendyol 9. Karşılıksız varyantların ürünü **yalnız 25'inde**
başka bir alımda geçiyor — 13'ü Hepsi Burada, 11'i Amazon.

⛔ **VE ASIL BULGU — SORUN NİCELİK DEĞİL KAPSAM:**

    ALINAN  886 adet   ·   SATILAN 566 adet   →  alım defteri 320 adet FAZLA

Yani defter **küçük değil, BAŞKA ÜRÜNLERİ** kapsıyor:

| | |
|---|---|
| alımı olan varyant | 174 |
| satışı olan varyant | 194 |
| **ikisi de olan** | **91** |
| satışı var alımı **hiç yok** | **103** |

**Açığın şekli:** miktar eksiği **97 adet** (ürün var, adet yetmiyor) ·
**ürün eksiği 231 adet** (o ürün deftere hiç girmemiş). **%70'i ürün eksiği.**

⚠ **VE 25 VARYANTIN ALIMI VAR AMA AÇIK PARTİSİ YOK — SEBEP ÖLÇÜLDÜ:**
31/35 alım kalemi `RECEIVED` ve stok hareketi VAR. Yani mal girmiş, önceki
satışlarda FIFO'dan tükenmiş. **"Mal kabul bekliyor" DEĞİL** (yalnız 4 kalem:
3 `CANCELLED` + 1 `ORDERED`).

⚠ **BİR OKUMAM YANLIŞTI — DÜZELTMESİ:** ilk tabloda "Hepsi Burada 248" ile
"Hepsiburada 7" yan yana çıkınca **çift tedarikçi kaydı** sandım. `Supplier`
tablosunda tek kayıt var; 7'si `supplierId` BOŞ olan alımların **serbest
metin** adı. Gerçek bulgu: **22 alımın tedarikçi bağı yok** (14'ü adsız).

### 📗 ALIŞ EXCEL'İ ÖLÇÜLDÜ (26.08.2026) — AÇIĞIN **%92'Sİ KAPANIYOR**

`Downloads/alislar (5).xlsx` · sayfa `ALIŞLAR` · **salt okuma, hiçbir şey
yazılmadı.** Dosya depoya GİRMEDİ.

**⓪ BEYAN DOĞRULANDI — üç sapma var, üçü de küçük:**

| | beyan | ölçülen |
|---|---|---|
| satır | 2280 | **2283** |
| barkod dolu | 2128 | **2128** ✓ |
| barkod boş | 152 | **155** |
| tekil barkod | 771 | **771** ✓ |
| toplam tutar | 11.913.849 | **11.913.849,46** ✓ |
| tarih aralığı | 25.10.25→25.08.26 | ✓ |

⚠ **3 satır fazla ve 3 satırın TARİHİ OKUNAMIYOR** — aynı 3 satır olması
muhtemel. ⚠ Ayrıca komut metni `alislar (4).xlsx` diyor, yol `(5)` veriyor;
**ikisi farklı dosya** (md5 ayrı). Verilen yol kullanıldı.

**① EŞLEŞME:** 771 tekil barkodun **698'i bulundu** (%90,5) · 73 bulunamadı ·
belirsiz 0. Alan kırılımı: `barcode` **697** · `channelSku` **1**.

> **⭐ ASIL CEVAP:** K55'in 128 karşılıksız varyantının **111'i dosyada var**
> (109 adedi TAM karşılıyor, 2 kısmi). **295/335 adet · ₺1.072.764 · %92,7.**

**② ÇAKIŞMA:** `supplierOrderNo` **işe yarar bir kimlik anahtarı**:
sistemdeki 385 alımın 355'inde dolu, **314'ü dosyayla eşleşiyor**.
İkinci aday (varyant+gün+adet) **321 satır** buluyor — iki yöntem tutarlı.
Yani **~2.000 satır YENİ**.

⛔ **`Envantere İşlendimi` KOLONU TAMAMEN BOŞ (2283/2283).** Halil'in elle
takibi bu dosyada hiç doldurulmamış. Bu yüzden _"dosya işlenmedi der,
sistemde var: 321"_ satırı bir ÇELİŞKİ DEĞİL — boş kolonun artefaktı.
**İki taraf ayrı sayıldı ve biri ötekinin yerine geçmedi.**

**③ TEMİZLİK:**
· **155 barkodsuz satır** — ürün adıyla tam eşleşen yalnız **5**.
· **Barkod uzunluğu:** 13 hane 671 · 12 hane 86 · 11 hane 11 · 14 hane 1 ·
  **8 hane 2 → değerleri `İSTANBUL` ve `iSTANBUL`** (çöp veri; üstelik tam
  I/i tuzağının kendisi).
· ⚠ **Kısa barkodlar SIFIR KAYBI DEĞİL:** 99 kısa koddan başa `0` eklenince
  sistemde bulunan yalnız **2**. Gerisi farklı standart (UPC-A 12 hane).
· **Mağaza → tedarikçi:** 8 ad eşleşti, **5 yeni aday**: `BEYMEN` · `A101` ·
  `HUAWEİ` · `Ahmet Pekel` · `(boş)` (4 satır).

**④ FIFO ETKİSİ:** 329 karşılıksız kalemin **285'i bağ kurar** —
290 adet · **₺1.065.534 · açığın %92,1'i.**
✅ **SIRA HATASI 0** — hiçbir alım satıştan sonraya düşmüyor.
⛔ Kalan **44 kalem / 45 adet** dosyada da yok.

### 🚦 K55 KURU KOŞUM ÜRETİLDİ — **ONAY BEKLİYOR** (26.08.2026)

`npm run canli:alis-kuru -- --dosya="…"` · **salt okuma, tek satır yazılmadı.**

**① DOSYA KİMLİĞİ RAPORUN İLK SATIRINDA** (artık her koşumda):
`alislar (5).xlsx` · md5 `b4ccfd3b0e99388a2ed0780c2770dcc6` · **2283 satır**.

**② YAZILACAK:** **1574 alım** (sipariş no başına gruplanmış) · **1615 kalem** ·
3266 adet · **₺7.788.253** · kaynak `alis-excel`.
⚠ 1614'ü barkodla, **1'i ürün adıyla** — ad eşleşmesi ayrı işaretli.
Tarih: 2025-10 → 2026-08, en yoğun 2026-01 (251 kalem).

**③ DIŞARIDA — altı ayrı kova, toplamı satır sayısıyla TUTUYOR (668+1615=2283):**

| Kova | Adet | Sebep |
|---|---|---|
| `zatenVar` | **348** | sipariş no ya da varyant+gün+adet eşleşti |
| `eslesmeyenBarkod` | **130** | barkod var, ürün sistemde YOK |
| `iadeli` | **106** | iade edilmiş — stok vermez |
| `barkodsuz` | **79** | barkod yok, ürün adı da eşleşmedi |
| `adetSifir` | 3 | adet ≤ 0 |
| `copBarkod` | **2** | `İSTANBUL` · `iSTANBUL` |

**④ TEDARİKÇİ:** 8 eşleşti · **2 yeni aday: `A101` · `Ahmet Pekel`** (1'er kalem).
⛔ **Otomatik AÇILMAZ** — onay gelene kadar o 2 kalem dışarıda.

**⑤ İDEMPOTENTLİK:** ikinci koşum **0** — beyan değil, aynı sınıflandırma
yazım sonrası hâlle yeniden koşularak **simüle edildi**.

**⑦ STOK:** `PURCHASE_IN`, `occurredAt` = Satın Alma Tarihi.
`StockMovement` **636 → 2251** · `PURCHASE_IN` **358 → 1973**.
⚠ Satış tarafındaki karardan farklı ve sebebi net: orada parti YOKTU,
burada parti **bizzat bu kayıtlar**.

**⑧ SONRASI:** stok bağı yeniden koşunca **260 kalem** bağ kurar ·
₺990.061 · **açığın %85,6'sı**. Yine bağlanamayan 69 kalem.

⚠ **RAKAM DÜŞTÜ: 285 → 260 — VE SEBEBİ ÖLÇÜLDÜ, VARSAYILMADI.**

    süzgeçsiz (ilk ölçümün yaptığı)   289
    yalnız iade elendi                285   ← önceki rapordaki rakam
    yalnız zatenVar elendi            264
    ikisi de elendi (kuru koşum)      260   ← GEÇERLİ OLAN

İlk ölçüm sistemde **zaten olan 348 satırı yeni parti sayıyordu** — aynı malı
iki kez stoğa koymak olurdu. `285` aşıldı, geçerli olan **260**.

⛔ **RAPORUN AÇTIĞI TEK ŞEMA KALEMİ** (yazımdan ÖNCE ayrı migration onayı):

    Purchase.importBatch  String?   @@index([importBatch])
    Purchase.importKaynak String?   ← 'alis-excel'

⚠ Merdiven ölçüldü: `supplierOrderNo` bu işi **göremez** — o tedarikçinin
numarası ve elle girilen kayıtlarda da dolu; parti kimliği yapmak iki anlamı
tek kolona koyardı. `note` da sorgulanacağı için yetmez.

### ✅ K55 ALIŞ İÇE AKTARMA — KOŞTU (26.08.2026)

**Migration:** `Purchase.importBatch` + `importKaynak` · canlı + yerel · damga **38**.

| | önce | sonra | fark |
|---|---|---|---|
| `Purchase` | 386 | **1955** | +1569 ✓ |
| `PurchaseItem` | 386 | **1995** | +1609 ✓ |
| `StockMovement` | 636 | **2244** | +1608 ✓ |
| `PURCHASE_IN` | 358 | **1966** | +1608 ✓ |

**İdempotentlik:** son koşum **0 yazdı**, `zatenVar` 1961 ✓

⛔ **İLK KOŞUMDA 44 ALIM DÜŞTÜ VE SEBEBİ İKİ KUSURDU:**

**① Sınanmayan dal.** `tariheCevir` geçerliliği YALNIZ metin dalında
sınıyordu; `Date` ve `number` dalları doğrulamasız geçiyordu.

**② Yutulan hata mesajı.** `message.split()[0]` Prisma hatalarında **boş
satır** düşürüyordu — ekrana `⛔ 471 054 764 0 — ` yazıldı, sebep KAYBOLDU.
44 alım düştü ve niye düştüğü **ölçülemedi**. _(İlke #5'in tam ihlali:
sessiz başarısızlık.)_

**GERÇEK SEBEP — KAYNAK VERİ:** 8 satırın Teslim Tarihi **`"11.02.0202"`**
(birinin `2026` yerine `0202` yazması). `new Date()` bunu **yıl 202** diye
geçerli sayıyor, `Intl` `202-11-02` (üç haneli yıl) biçimliyor,
`new Date("202-11-02T…")` **Invalid Date** dönüyor. Zincirin başındaki hata
SONUNDA görünüyor.

⚠ **UYDURULMADI.** _"0202 demek ki 2026'ymış"_ diye düzeltmek bir tahmindir.
Makul yıl kapısı kondu (2000–2100), değer **kullanılamaz** sayıldı, satın
alma tarihine düşüldü ve **ekranda sayıldı**: `⚠ TESLİM TARİHİ OKUNAMAYAN 8`.

**Kalan 8 alım yazıldı, hata 0.**

### ✅ STOK BAĞI YENİDEN KOŞTU — 260 kalem

Kuru koşumun öngördüğü rakam **birebir tuttu**: 329 → **260 bağlandı** ·
`StockMovement` 2244 → 2504 ✓ · 260 satışın kârı tazelendi ·
**69 kalem** atlandı.

**MARJ — önce/sonra:**

| | önce | sonra |
|---|---|---|
| ekran marjı | %2,58 | **%10,12** |
| maliyet bağı olanların | %9,31 | **%11,12** |
| şerhteki satış | 329 | **69** |

⚠ Şerh artık **iki satır**: `29` bağ bekliyor (alım var) · `40` **ALIM KAYDI
YOK**. İçe aktarma satışlarının **342/411**'inin kârı hesaplanmış.

**DEFTER AYRIŞMASI:** incelenen 707 · temiz 705 · **SAPAN 2** ·
incelenemeyen 0. K54'ün iki hayaleti yerinde, **yeni sapan DOĞMADI**.
Ayrı kova 329 → **69**.

⏭ **K55 KÜÇÜLDÜ AMA KAPANMADI:** 69 kalem hâlâ alım kaydı bekliyor —
130 eşleşmeyen barkod + 79 barkodsuz satır oradan besleniyor.

⏭ **Seçenekler ÖLÇÜLECEK, bugün açılmaz:** tedarikçi belgelerinden toplu
giriş · Amazon/toptancı dökümü · geriye dönük toplu alım kaydı.

⚠ **EKRANDA GÖRÜNÜYOR ve sebebi AYRI yazıyor** — marj şerhi iki satır:
_"N satış maliyet bağı bekliyor"_ ile _"M satış: ALIM KAYDI YOK"_ tek cümleye
karışmıyor, çünkü **çözümün yeri farklı.**

### ⛔ ANAHTAR — YALNIZ-OKUMA ANAHTARI **BULUNAMADI** (26.08.2026)

Resmî dokümantasyon (`developers.trendyol.com/docs/2-authorization`) okundu:
**çoklu anahtar · kapsamlı (scoped) anahtar · salt-okuma anahtarı · rotasyon
· iptal · yeniden üretme — HİÇBİRİ GEÇMİYOR.** Doküman yalnız "Hesap
Bilgilerim → Entegrasyon Bilgileri"nden alınacağını söylüyor.

⚠ **VE BU "YOK" DEMEK DEĞİL — "DOKÜMANDA YOK" DEMEK.** Panelde bir
yenileme düğmesi olabilir; dokümantasyon onu yazmıyor. _(Anayasa: "yokluk
iddiası da iddiadır".)_

⏭ **HALİL ÖLÇECEK — tek soru:** partner.trendyol.com → Mağaza → Hesap
Bilgilerim → Entegrasyon Bilgileri sayfasında **"yenile / sıfırla / yeni
anahtar üret"** benzeri bir düğme var mı? Ekran görüntüsü yeterli.
· **VARSA** → rotasyon yolu belgelenir, sonra Vercel'e taşınır.
· **YOKSA** → taşıma bir KARARDIR: sızma hâlinde anahtarı iptal etmenin tek
yolu Trendyol desteğidir ve süresi bilinmiyor.

### ⏭ SIRADAKİ — VE ONAY KAPISI

**(a) kovası içe aktarmanın kuru koşumunu doğuruyor.** Yazma ancak Halil'in
onayından sonra (kendi çerçevesi: _"içe aktarma başlamadan önce kuru koşum
raporu + onayım"_).
⛔ **ENUMERASYON TAMLIĞI ÖLÇÜLDÜ VE SAĞLANMADI:** çapraz, API dilimlemesinin
bulamadığı **37 sipariş** gösterdi (kanal kimliğiyle süzülmüş hâli; biçim
süzgeciyle 70 çıkıyordu). `123` bir ALT SINIRDIR ve kuru koşum raporunda
sayıyla desteklenerek öyle yazılacak.
✅ **MEKANİZMA ADLANDIRILDI VE TELAFİ YOLU ÖLÇÜLDÜ** — bkz. yukarıdaki
"ENUMERASYON — MEKANİZMA" bölümü. Kuru koşum artık kurulabilir.

### ✅ A3-③ İÇE AKTARMA — KOŞTU (26.08.2026)

**425 satış yazıldı · sayım tuttu (145→570) · ikinci koşum 0.**
Parti `ty-20260826111346` · `AuditLog: TY_SIPARIS_ICE_AKTARMA`.
⛔ **13 sipariş YAZILAMADI** (₺52.842) — 3 barkod kataloğumuzda yok.
⚠ Yazımdan önce üç ölçüm üç hatayı yakaladı: `price` satır toplamı ·
komisyon alanı `commission` · `orderDate` 3 saat kaymış.

<details><summary>kuru koşum raporu (26.08, arşiv)</summary>

### 🚦 A3-③ KURU KOŞUM — RAPOR (26.08.2026)

`npm run canli:ty-kuru-kosum -- --gun=60` · **salt okuma, tek satır yazılmadı**
(`api:dogrula` bunu koşulur hâlde tutuyor: yalnız GET · prisma yazma çağrısı yok).

**KAPSAM:** Trendyol — AXCALI (`externalId 870249`) · `2026-06-27 → 2026-08-26`
(`orderDate`e göre) · 3 günlük 30 dilim · okuma anı `2026-08-26T10:27:47Z`.

| | |
|---|---|
| aday sipariş | **441** · 449 adet · **₺1.549.713,55** |
| ⛔ **YAZILABİLİR** | **428** |
| ⛔ barkodu kataloğumuzda olmayan | **13** — önce ÜRÜN tanımlanmalı |
| durum | Delivered 411 · **Cancelled 28** (₺165.511) · Returned 2 |
| çakışma | defterde 111 kod var → **106 aday atlandı** |
| bölünmüş | 1 sipariş (2 ebeveyn paket elendi) |

**⛔ VARYANT KAPISI EN SERT SINIR:** `SaleItem.variantId` **zorunlu**
(`onDelete: Restrict`). Bu bir tercih değil **şemanın kendisi** — barkodu
bilinmeyen siparişin kalemi yazılamaz. _13 sipariş bu yüzden dışarıda._

**⚠ ÇAPRAZ BU KOŞUMDA `0` DÖNDÜ — VE BU TAMLIK KANITI DEĞİL.** Aynı çapraz
önceki koşumda **37** vermişti. Enumerasyon bu turda o kayıtları yakaladı;
bir sonraki turda yine kaçırabilir. Sıfırı "boşluk yok" diye okumak, en sinsi
yalancı yeşil olurdu — betik bunu **ekrana kendisi yazıyor.**

**⛔ RAPORUN AÇTIĞI TEK ŞEMA KALEMİ** (yazımdan ÖNCE, ayrı migration onayı):

    Sale.importBatch  String?   @@index([importBatch])
    Sale.importKaynak String?   ← 'enumerasyon' | 'hakediş çaprazı'

İkincisi Halil'in kendi ①. şartının gereği: **kaynak raporda değil KAYITTA
durmalı.** Rapor silinir, kayıt kalır.

**KARARLAR — rapor bunları öneriyor, onay bekliyor:**
- **İptaller listeye GİRER**, `iptalTarihi` dolu yazılır. Hiç yazılmasaydı o
  sipariş "hiç olmadı" olurdu ve kargo gideri sahipsiz kalırdı.
- **Çakışmada ATLA, ÜZERİNE YAZMA** — elle girilmiş kayıt üstün (Halil'in
  girdiği kupon düşülmüş tutar API brütünden daha doğru olabilir).
- **`StockMovement` ÜRETİLMEZ.** `SALE_OUT` yazsaydı FIFO'dan mal düşerdi ve
  geri alması ledger'a ters kayıt gerektirirdi. Stok bağı **ayrı ve sonraki**
  bir karar.
- Geri alma **silme değil işaretleme** (`iptalTarihi`).

_(Onay verildi ve yazım koştu — yukarıdaki özete bak.)_

</details>

---

## 📎 KAYIT ÇELİŞKİSİ — 25.08.2026, mimar düzeltmesi

> **Mimar tarafı da bir KAYIT KAYNAĞIDIR — ve pano ile çeliştiğinde
> ÖLÇÜM kazanır.** Bugün *"sıradaki teslim nakit takvimi, üç turdur
> bekliyor"* denildi; pano ise işi **24.08'de kapanmış** gösteriyordu
> (iki ayrı satırda, rakamlarıyla). Tahmin edilmedi, panoya bakıldı,
> çelişki kapandı: **kayıt geçerliydi, hatırlama bayattı.**

⚠ Aynı gün ikinci kez oldu: bugünün planı *"A3-① anahtar girilir
girilmez koş"* diyordu; pano **koştuğunu** yazıyordu. Yeniden koşuldu —
pano haklıydı, üstelik ölçüm tazelenmiş oldu.

**Not (iş değil, hatırlatma):** hakediş partilerinin düzenli yüklenmesi
**nakit ufkunun kendisidir** — tarife rutini (H10♻) gibi bir rutin satırı
hak ediyor. Sırası gelince açılır.

---

## ✅ 25.08.2026 — GÜN İÇİ KAPANANLAR

| İş | Durum |
|---|---|
| **K53 — TARİHLİ ENVANTER DEĞERİ** | ✅ **[KOŞTU]** — `/envanter-degeri?tarih=YYYY-MM-DD`. Kullanıcı tarih seçer, ekran o ana kadarki defteri kurar. 📊 **ÖLÇÜM ① — TÜR × İŞ TARİHİ ALANI:** sorunun varsayımı düzeltildi — **tür başına ayrı alan YOK, tek defter tek alan**: `StockMovement.occurredAt`, `[variantId, occurredAt]` indeksli. **15 yazma noktasının hepsi okundu, hepsi `occurredAt`i açıkça yazıyor** — yani "alanı olmayan tür" sınıfı yok. **Ama anlamı türe göre değişiyor ve asıl bulgu bu:** `PURCHASE_IN`·`SALE_OUT`·`RETURN_IN`·`ADJUSTMENT`·`COUNT_CORRECTION` → kullanıcı seçiyor (canlıda geriye tarihli kayıt VAR: 241/320 · 66/143 · 1/3 · 6/20 · 1/3 farklı gün) · `SALE_CANCEL_IN` ve satış düzenleme `ADJUSTMENT`'ları → `girdi.an` = işlem ANI, kullanıcı seçmiyor (0/7 farklı) · **`EXCHANGE_OUT` → `new Date()`, tek gerçek boşluk** (0/8 farklı). ⚠ **VEKİL KULLANILMADI** — `createdAt`e bağlamak tam yasaklanan şeydi; boşluk şerhle yaşıyor (bugün 8 hareket). 📊 **ÖLÇÜM ② — KURU KOŞUM:** `1 Haziran açılışı` → 78 `PURCHASE_IN`, net 265 adet, **başka tür YOK**; kaynak belge 84 alım · **0 satış** · 0 iade; defterin en eski hareketi `2025-08-18`. ⚠ **1 HAZİRAN SATIŞ TARAFINI HİÇ SINAMIYOR** (o tarihte defterde satış yok) — kullanıcı şartı gereği **İKİNCİ KURU KOŞUM `1 Ağustos`** koşuldu: giriş 531 · çıkış −5 · **LEDGER 526 = FIFO 526 ✓** — tüketim süzgeci ÇALIŞIYOR. **MOTOR:** `acikPartilerToplu(db, ids, sinir?)` — **ikinci motor açılmadı**, mevcut gövde parametrelendi; süzgeç **girişlere VE tüketimlere** uygulanıyor (yalnız girişlere uygulansaydı temmuzda tüketilen parti haziran fotoğrafında da tükenmiş görünürdü — stok DÜŞÜK çıkar, rakam makul, kimse fark etmez) ve **`occurredAt`ten, `createdAt`ten DEĞİL**. **DİL:** ekran adı "değer/fotoğraf", **"sayım" yasak ve bekçili**; kalıcı şerh _"kayıtlardan kurulmuş defter fotoğrafıdır — fiziksel sayım değildir"_ **koşulsuz** yazıyor (bugünün rakamı da fotoğraftır). **Pirinç şerh** kapsam için, **ay adı VERMEDEN** (ağustos %48 ölçüldü, öteki aylar ölçülmedi). **Sınır örnekle:** _"seçilen günün BAŞLANGICI itibarıyla"_. **Geçersiz/gelecek tarih sessizce bugüne DÜŞMEZ**, ekranda söylenir. **Excel aynı sınırı taşır** ve aynı gövdeden çözer. 🧪 `panel:dogrula` 507→**533** · **6 mutasyon** (tüketim süzgeci kaldırıldı · `createdAt`e bağlandı · başlığa "sayım" kondu · şerh koşula bağlandı · geçersiz tarih sessizleşti · Excel tarihi taşımadı) — 6'sı da kırmızı. ─── **② ARALIK MODU (26.08.2026, Halil seçimi):** ✅ **[KOŞTU]** — Halil dört okuma arasından bunu seçti (ölçülmüş rakamlarla soruldu: A 261 · B 266 · C 526 · D 531 adet — iki kata varan fark). **İKİ UÇ DA AÇIKÇA SEÇİLİR, BAZ TARİH YOK.** 📊 **GERÇEK KOŞUM:** `01.06 → 31.07` → açılış **265** (₺543.664,54) · kapanış **526** (₺1.379.065,09) · fark **+261** (₺835.400,55) · **çapraz ✓ ledger neti +261**. ⚠ **KOMUTTAKİ "1 Ağustos" BEKLENTİSİ DÜZELTİLDİ, RAKAM BÜKÜLMEDİ:** kabul edilen kurala göre **bitiş günü döneme DAHİL**, o yüzden `01.06 → 01.08` kapanışı **529** çıkıyor (1 Ağustos'ta 3 adet daha girmiş). Beklenen 526, `bitiş = 31 Temmuz`da çıkıyor. İkisi de doğru; sınır kuralı tam da tasarlandığı gibi çalışıyor. **SINIRLAR ASİMETRİK VE BİLİNÇLİ:** açılış = başlangıç gününün BAŞI, kapanış = bitiş gününün SONU. Aynı kuralla kurulsaydı dönem bir gün eksik olurdu ve **3 adet sessizce kaybolurdu**. ⚠ **ÜÇÜNCÜ HESAP YOLU AÇILMADI:** fark, iki fotoğrafın ÇIKARMASI; aynı motor iki kez koşuyor. ⚠ **İÇ TUTARLILIK ÇAPRAZI ÖLÇÜLDÜ, VARSAYILMADI — VE HEM SUSMAYI HEM KONUŞMAYI BİLİYOR:** `01.06–31.07` ve `01.06–01.08` → **✓ tutuyor**; `20.08–25.08` → **✗ ayrışma 2** — yani **K54 kendiliğinden görünür oldu**. Ekran bunu söylüyor ama **hüküm vermiyor**. ⚠ **TEK UÇ = HATA**, ters sıra = hata, gelecek = hata — **her sebep AYRI mesaj** (tek bir "geçersiz" mesajı NE yanlış yapıldığını gizlerdi). **Aynı gün geçerli** (tek günlük dönem meşru). ⚠ **TEK TARİH DAVRANIŞI KORUNDU** (geriye uyumlu, mutasyonla sınandı). **Excel ÜÇ SAYFA** — açılış · kapanış · fark, ve **çapraz şerhi dosyanın İÇİNDE** (ekranda uyarı görüp dosyayı indiren biri orada bulamazsa temiz sanır). 🧪 `panel:dogrula` 533→**560** · **6 mutasyon** (bitiş sınırı gün başı · ters sıra serbest · tek uç varsayılsın · fark ayrı sorgudan · tek tarih bozuldu · çapraz hep tutuyor desin) — 6'sı da kırmızı. ⚠ **"BİR ÇOK ÜRÜNDE BU DEĞER SIFIR, HESAPLAR YANLIŞ MI" — HESAP DOĞRU, SAĞLAMASI YAPILDI.** Kullanıcı üst üste `₺0,00` görüp sordu. **DÖRT BAĞIMSIZ YOLLA sağlandı** (`01.06→05.07`): ① ham hareketlerden ELLE kurulan FIFO **265 → 399 · ₺543.664,54 → ₺886.463,48** ② motor **birebir aynı, kuruşuna** ③ saf ledger toplamı (FIFO'ya hiç bakmadan) **265 → 399, fark +134** ④ kaynak belgeler **alım +136 · satış −2 = +134**. ⚠ **Motor kendi kendini onaylamasın diye ELLE yol motoru HİÇ ÇAĞIRMIYOR** (anayasa: kendi kendini doğrulayan ölçüm ölçüm değildir). **YANLIŞ OLAN EKRANDI:** 73 satırın **43'ü** dönemde hiç değişmemişti ve tablo **SIRASIZDI** (`Map` ekleme sırası) — hepsi tepede duruyordu. Üstelik **sıralama düğmeleri aralık görünümüne hiç etki etmiyordu**: duran ama iş yapmayan düğme (İlke #5). **Çözüm:** satırlar **mutlak para hareketine göre** sıralanıyor (azalış da üstte — stok erimesi görülmesi gereken şeydir), sıra **kararlı**, değişmeyen satır **gizlenmiyor ama SAYILIYOR ve ekranda söyleniyor**, ölü sıralama düğmeleri aralıkta çizilmiyor. 🧪 +7 kontrol · 5 mutasyon. ⚠ **VE HALİL TESTİ RAKAM UYUŞMAZLIĞIYLA DÜŞTÜ — HATA BENDEYDİ:** ekran açılışta `₺453.053,78`, teslim raporum `₺543.664,54` diyordu. **İKİSİ DE DOĞRUYDU:** ekran `Mal bedeli (KDV hariç)`, raporum ham `Ödenen (KDV dahil)` toplamını ölçmüştü. ⚠ **ADET RAKAMLARI BİREBİR TUTUYORDU** (265 · 526 · +261) — sapan yalnız paraydı. ⚠ **VE FARK SABİT ÇARPAN DEĞİL:** ölçüldü, açılışta oran tam `1,200000` (hepsi %20), kapanışta `1,194847` (karışık oran, KDV kategoriden). _"1,2'ye böl"_ diye çevrilemez. **Çözüm:** aralık görünümü artık **iki tabanı da ETİKETLİ** taşıyor — tek fotoğraf görünümü zaten öyle yapıyordu, aralığın yapmaması İlke #10 ihlaliydi. Sütun başlıkları ve Excel sütunları da tabanı söylüyor. Anayasaya madde: _"para rakamı tabanıyla birlikte yazılır."_ 🧪 +4 kontrol · 4 mutasyon — **biri önce YEŞİL kaldı** (desen fark sayfasının başlığında da geçiyordu → 9. vaka). ⚠ **CANLI ARIZA — HALİL BULGULADI VE ÖZELLİK HİÇ KULLANILAMIYORDU:** _"tarihler giriliyor fakat program tarihleri kaydetmiyor ve envanter rakamı değişmiyor."_ **Aralık alanına yazmak İMKÂNSIZDI:** alanların değeri doğrudan ADRESTEN geliyordu ve adrese gidiş yalnız iki uç da doluyken tetikleniyordu; ilk tarihi girerken ikinci uç zorunlu olarak boş → gidiş yok → adres değişmiyor → `value` hâlâ `""` → **React her tuşta girdiyi siliyor.** ⚠ **565 KONTROL YEŞİLDİ VE HİÇBİRİ SÖYLEMEDİ** — saf kural, sunucu, sözlük, Excel hepsi doğruydu; kullanıcıya ULAŞAN yol kopuktu. **Çözüm:** gerçeğin kaynağı YEREL DURUM, adres yalnız tamamlanmış sonucu taşır; öteki uç da yerelden okunuyor (çekirdek buydu). Yarım seçimde ekran ne beklendiğini SÖYLÜYOR. Anayasaya madde: _"kontrollü girdi, durumu olmadan yazılamaz."_ 🧪 +5 kontrol · 5 mutasyon — **biri önce YEŞİL kaldı** (render koşulu öldürüldü, iki desen dosyada durdu → desen tablosuna 8. vaka). ⚠ **VE DÖRT ÖLÇÜT ESKİDİ, SUSTURULMADI GENİŞLETİLDİ:** Excel parametresi tekten üçe çıktı · hata mesajı tekilden çoğula geçti · motor sayımı `typeof` yüzünden 3 sayıyordu (çağrı yerine bağlandı). |
| **K54** | **İki defter ayrışması — 2 birim, kaynağı bulundu · [AÇIK]** | ⚠ **K53 ÖLÇÜMÜ SIRASINDA ÇIKTI, ARANMIYORDU.** Bugün: **LEDGER 636 · FIFO 638 → +2**. `canli:defter-ayrismasi` doğruluyor: 150 varyantın **2'si sapan** (`axcali1660` M300 SSD 4→5 · `axcali1610` Vestel blender 11→12), incelenemeyen 0. 🔎 **KAYNAK BULUNDU:** 164 çıkış hareketinin **2'si `sourceMovementId` TAŞIMIYOR** — ikisi de `2026-08-23` tarihli `EXCHANGE_OUT`, notları _"Yanlış sıfırlama geri yüklendi — kullanıcı düzeltmesi"_ ve _"Değişim gerçekten yapıldı — yenisi gönderildi"_. Yani vaka-bazlı düzeltme betikleri partiye bağlamadan çıkış yazmış: **ledger düştü, FIFO düşmedi → hayalet adet.** ⚠ **BU K53'Ü DOĞRUDAN İLGİLENDİRİYOR:** tarihli envanter FIFO'dan okuyor, `/stok` ledger'dan — **iki ekran bugün 2 birim farklı gösteriyor.** ⛔ **HÜKÜM VERİLMEDİ:** hangi defterin doğru olduğu vakaya göre değişir; körlemesine hizalamak veriyi bozar. **Yapılacak:** iki hareketin geçmişi tek tek okunup karar verilir (ADJUSTMENT ile mi düzeltilir, parti bağı mı kurulur). _(Anayasa: "stoğun kendisi de iki defterdir" — üçüncü vaka.)_ |
| **K51 — MENÜ VERİYE DÖNDÜ** | ✅ **[KOŞTU]** — `/ayarlar/menu`. Sıra ve gruplama artık `Company.menuDuzeni`de; kullanıcı ok düğmeleriyle diziyor, açılır listeyle gruba taşıyor. 📊 **MERDİVEN ÖLÇÜLDÜ:** ① `Company`de serbest metin YOK (6 kolon ölçüldü) ② `AuditLog` current-state deposu DEĞİL — menü HER RENDER'da okunuyor, `ORDER BY + LIMIT 1` gerekirdi (232 satır, büyüyor) ③ türetilemez ④ **SÜTUN** (yeni tablo değil). Kuru koşum → canlı → **36 migration** → yerel. ⚠ **EN KRİTİK KİLİT: KAYITLI DÜZEN BİR EKRANI GİZLEYEMEZ.** Katalog KODDA; kayıt yalnız sırayı söyler. Tersi yapılsaydı koda eklenen yeni ekran menüde HİÇ görünmezdi ve kimse ayarlara girip eklemeyi düşünmezdi — `/iadeler`in 13.08'de sessizce kaybolmasının menü hâli. Katalogda var/kayıtta yok → varsayılan yerine **eklenir ve BEYAN edilir**; kayıtta var/katalogda yok → **yok sayılır ve SAYILIR**. ⚠ **BOŞ KAYIT MENÜYÜ BOŞALTAMAZ**, **bozuk JSON ÇÖKERTMEZ** (menü her sayfada çiziliyor), **aynı öğe iki yerde duramaz**, **grubu bulunamayan ekran günlüğe düşer**. ⚠ **`Panel` ve `Menü düzeni` KİLİTLİ** — kullanıcı kendi menüsünü kilitleyip bir daha açamasın diye; kilit hem katalogda hem YAZMA eyleminde, ikisi de mutasyonla sınandı. ⚠ **SÜRÜKLE-BIRAK YOK, bilerek:** telefonda parmakla tutup kaydırmak sayfayı da kaydırır; ok düğmeleri her cihazda aynı (44 px, İlke #8). ⚠ **V2 (grup ekleme/adlandırma) İÇİN BİÇİM HAZIR VE PROVA EDİLDİ:** grup kaydı isteğe bağlı `ad` alanı kabul ediyor, V1 yazmıyor ama **silmiyor da** — bekçi V2 şekilli bir kaydı V1 gövdesinden geçirip sıranın korunduğunu ölçüyor. İddia değil prova. ⚠ **BEKÇİ ÖLÇÜTÜ TAŞINDI, SUSTURULMADI:** _"hep açık liste en fazla N öğe"_ ve elle tutulan _"kullanıcının verdiği SIRA"_ kontrolleri **kaldırıldı** — ikisi de artık kullanıcının TERCİHİNİ polisliyordu. Yerlerine YAPI kontrolleri geldi: her katalog kaleminin ikonu/adresi/etiketi var mı · varsayılan grubu tanımlı mı · mükerrer anahtar var mı · sabit liste kenar çubuğuna geri geldi mi. **"7 → 8 → 9" tartışması böylece kapandı.** ⚠ **VE `el-kitabi:dogrula` KIRMIZI YANDI — HAKLIYDI:** menü kaynağı değişince `app-sidebar.tsx` metnini tarayan ölçüt "2 öğe buldum" dedi. Kod yanlış değildi, ölçüt eskimişti; katalogtan İÇERİ ALINACAK şekilde taşındı. ⚠ **VE `npm run build` BİR KUSUR YAKALADI — `tsc` + 51 BEKÇİ YEŞİLKEN:** `MENU_IZNI` sabiti `"use server"` dosyasından dışa aktarılıyordu, _"a 'use server' file can only export async functions"_. Derleme, bekçilerin görmediği ayrı bir kapıdır. 🧪 `panel:dogrula` 469→**503** · **8 mutasyon** (yeni ekran gizlensin · tanınmayan sessizce geçsin · aynı öğe iki yerde · bozuk JSON çöksün · ikonsuz kalem · kilit kalksın · yanlış grup adı · sabit liste geri gelsin) + **2 V2 mutasyonu** (`ad` reddedilsin · yazma `ad`ı silsin) — hepsi kırmızı. `el-kitabi:dogrula` +1 bölüm (Ayarlar — Menü düzeni, 2 sık hata). ⚠ **VE HALİL BULGULADI — TESLİMDEN DAKİKALAR SONRA:** _"ok'a bastım, bir üste çıkmıyor."_ **Taşıma ÇALIŞIYORDU; GÖRÜNMÜYORDU.** Saf mantık ayrıca koşturulup doğrulandı, buton doğru bağlıydı, deploy bekçisi yeşildi. Kusur **geri bildirimdeydi ve İKİ TANEYDİ:** ① sol menü kaydedene kadar değişmiyor (tasarım gereği) ama **ekran bunu söylemiyordu** — kullanıcı oka basıp SOL MENÜYE bakıyordu ② _"Kaydedilmemiş değişiklik var"_ ve **Kaydet düğmesi ~30 satırın altındaydı**, ekranın dışında. Çözüm: taşınan satır **mavi çerçeveyle vurgulanıyor** (ok VE grup seçici) · kaydet şeridi **yapışkan** · _"sol menü kaydettikten sonra değişir"_ ekranda yazıyor. ⚠ **DERS ANAYASADA ZATEN VARDI:** _"doğru davranışın GÖRÜNMEZLİĞİ de yalancı yeşildir"_ — muafiyet vakasının arayüz tarafı. **503 kontrol yeşildi ve hiçbiri özelliğin KULLANILAMAZ olduğunu söylemedi.** `panel:dogrula` 503→**507**, 4 mutasyon. ⚠ **VE ASIL KEŞİF SORUNU ORTAYA ÇIKTI:** kullanıcı `Menü düzeni` ekranını **`Ayarlar` altında aradı** — öyle bir grup YOKTU (ayar ekranları `Tanımlar` ve `Veri` altına dağılmıştı) ve ekrana hiç ulaşamadı. **`Ayarlar` grubu açıldı:** `Kullanıcılar · Roller · Menü düzeni`. Ölçüt net — `Tanımlar` **İŞ VERİSİ** tanımlar (raf, kategori, tedarikçi: operasyonun konuştuğu şeyler), `Ayarlar` **sistemin kendisidir**. _Bir ekranın nerede olması gerektiğini, onu ARAYAN söyler._ ⚠ Ve ölçüldü ki `menuDuzeni` canlıda **NULL** — kullanıcı hiç kaydetmemiş, yani yeni grup ona görünecek (kayıtlı düzen olsaydı kendi tercihi kazanırdı ve grup boş kalırdı). |
| **Menü sırası — kullanıcı listesi** | ✅ **[KOŞTU]** — kullanıcı sırayı 25.08'de BİREBİR verdi: `Panel · Satış · Alımlar · Ürünler · Stok · İade · Paketleme · Barkod okut · Fiyat Denemesi`. ⚠ **ÖNCEKİ SIRA BENİM ÇIKARIMIMDI** (_alım önce, çünkü stok önce gelir_); kullanıcı günü tersten yaşıyor — gün **satışla** açılıyor. **Sıra gerekçe istemez: sırayı işi yapan bilir.** ⚠ **İKİ EKRAN GRUPTAN GÜNLÜĞE ÇIKTI:** `urunler` ve `okut`. İkincisi 22.08'de *"sıklığa göre günlük listeye ait"* diye işaretlenmiş ve karar kullanıcıya SORULMUŞTU — cevap bu listeyle geldi. ⚠ **VE BİR EKRAN GÜNLÜKTEN ÇIKTI: `Kârlılık kartı` listede YOK.** Silinmedi, "Ürün ve kanal" grubuna taşındı; adresi (`/kart`) ve davranışı aynı, geri alınması **tek satır**. ✅ **ONAYLANDI 25.08.2026:** listeden düşmesi kasıtlı değildi (kullanıcı unutmuş) ama **grupta kalması onaylandı** — yani sonuç aynı, gerekçe netleşti. ⚠ **KAYDA GEÇEN İLKE:** _menü sırası KULLANIM GERÇEĞİNDEN gelir, çıkarımdan değil._ Benim dizilimim mantıklıydı (alım→stok→satış) ve **yanlıştı**; kullanıcının günü satışla açılıyor. Eski gerekçe (_"mağazada telefonla barkod okutup alım kararı verilen an"_) dosyada bırakıldı — çürüdüğü için değil, kullanıcı gününü daha iyi bildiği için taşındı. 🧪 `panel:dogrula` +1 kontrol · **sınır 8 → 9, kaynağıyla** (bu sayı bir ölçüm değil, kullanıcının onayladığı listenin uzunluğu — üç kararın üçü de yazılı). ⚠ **VE ARTIK YALNIZ SAYI DEĞİL SIRA DA SINANIYOR:** sayı sınırı listenin UZAMASINI durdurur ama İÇİNİN karışmasını durdurmaz; iki satırın yeri sessizce değişse hiçbir bekçi görmezdi. 2 mutasyon (sıra bozuldu · onuncu öge eklendi) — ikisi de kırmızı. ⏭ Kalıcı çözüm **K51**. |
| **K49 — tarife kapsam boşluğu** | ✅ **[KOŞTU]** — ekran üç pencereyi de AYRI AYRI doğru gösteriyordu ama **aralarındaki deliği hiç söylemiyordu**; 72 saat ancak veritabanına elle bakınca göründü. 📊 **ÖLÇÜM (canlı, salt okuma):** 3 pencere · `14–18.08` (96,0sa · 640 kalem) · `21–25.08` (96,0sa · 672) · `25.08–01.09` (**168,0sa** · 712). **DELİK: `18.08 07:59 → 21.08 08:00` = 72 saat 1 dakika · 2 TAM gün (19 · 20 Ağustos) · o aralıkta 14 SATIŞ var.** ⚠ **İLK ÖLÇÜM 16'YDI, AŞILDI — ve niye aşıldığı yazılıyor:** ilk sorguda iptal süzgeci yoktu ve `iptal:bekci` bunu KIRMIZI yakaladı. İptal edilmiş satışta zaten kâr hesaplanmıyor; onu saymak kaybı **olduğundan büyük** gösterirdi. Geçerli rakam **14**, eski **16** iptalli iki kaydı da içeriyordu. ⚠ **KAYIP TELAFİ EDİLEMEZ:** TY'nin tam dilimli ileri tarifesi arşivden inmiyor — delik **kapanmaz, yalnız görünür olur.** ⚠ **EŞİK GEDİĞE KONDU:** kaynak dosya pencereyi `07:59` bitirip `08:00` başlatıyor, yani bitişik pencerelerde bile **60 saniyelik dikiş** var. Ölçülen dağılım iki noktadan ibaret ve arası uçurum — `0,017sa (dikiş)` … `72sa (delik)`; eşik **1 saat**, tam gediğin içinde. ⚠ **GÜN SAYIMI EŞİKSİZ VE UÇLARI SAYMAZ:** 18.08 saat 07:59'a kadar, 21.08 saat 08:00'den sonra kapsanıyor — "4 gün" deseydik iki günü haksız yere kayıp ilan ederdik. Saat dilimi aritmetiği hiç yapılmadı, yalnız takvim günü kıyası. ⚠ **BOŞLUK BÜTÜN GEÇMİŞTEN hesaplanıyor**, listelenen son 10'dan değil — kesilmiş listeden hesaplansaydı 11. pencerenin öncesindeki delik hiç doğmaz ve ekran *"kapsam kesintisiz"* derdi (sayfalamanın yalancı yeşili). Listelenemeyen boşluk varsa **sayısı yazılıyor**. ⚠ **PANELE TAŞINMADI, BİLEREK:** kapanamayan bir uyarı görev kutusunda sonsuza kadar yanar ve rozetin tamamına olan güveni götürür. **İki yön de sınandı** — geçmiş delik rozeti YAKMIYOR, biten pencere hâlâ YAKIYOR. ⚠ **TUTANAK KUSUR İLE SINIRI AYIRT ETTİRİYOR (kullanıcı düzeltmesi):** kayıt ilk hâlinde _"ara verdin"_ diye okundu; **kronoloji tersini söylüyor ve ölçüldü** — sistemin İLK tarife kaydı `18.08 14:36` ve o kayıt bile **geriye dönük** (yüklediği pencere o sabah 07:59'da bitmişti); delik penceresi `18.08 08:00`'de, yani sistemde **henüz tek bir tarife bile yokken** 6,6 saat önce açıldı. `21.08` penceresi `22.08 00:50`'de (pencere AÇIKKEN), `25.08` penceresi `25.08 03:00`'te (pencere BAŞLAMADAN) yüklendi → **rutin kurulduğundan beri kaçan pencere 0.** Ekran artık bunu kendisi söylüyor. ⚠ **Ölçüt tarih gömülerek değil VERİDEN** (`min(yuklendiAt)`) — ve `pencereBaslangic` DEĞİL, çünkü ilk yükleme geriye dönüktü. ⚠ **Muafiyet sınırsız değil:** rutinden SONRA kaçan pencere hâlâ kusur (mutasyonla sınandı). ⚠ **UÇ DAMGASINDA SAAT VAR:** `.slice(0,10)` yapılsaydı 72 saatlik delik *"18→21, arada bir şey yok"* diye okunurdu — ekranın zaten bir kez düştüğü tuzağın ters yönü. ⚠ **VE BEKÇİ BU TESLİMDE GERÇEK BİR KUSUR YAKALADI:** boşluğa düşen satışları sayan sorgu iptal süzgeci taşımıyordu; `iptal:bekci` (kaynak tarayan, liste tutmayan bekçi) `page.tsx:121`'i adıyla gösterdi. Ekrana basılacak rakam **16 → 14**. ⚠ **VE BU BİR KAYIP ABARTISIYDI:** kaybı olduğundan küçük göstermek açık hatadır ve aranır; **büyük göstermek de aynı ölçüde hatadır ama kimse kontrol etmez** — kötü haber, iyi haberden daha az sorgulanır. Anayasaya madde olarak girdi. Bekçi turu rutin koşulmasaydı yanlış bir sayı yayımlanacaktı. ✅ **"14 SATIŞIN KOMİSYON ORANINI DÜZELTELİM Mİ" — KAPANDI 25.08.2026, ÖLÇÜLDÜ, DÜZELTİLECEK BİR ŞEY YOK.** Kullanıcı sordu; ölçüm (canlı, salt okuma): **14 satış · 14 kalem · komisyon oranı YOK: 0 · NET-2 hesaplanmamış: 0 · hepsi `CALCULATED`.** Oranlar kayıtlı ve kâr hesaplanmış. ⚠ **VE DELİK BU SATIŞLARA HİÇBİR ŞEY KAYBETTİRMEDİ:** tarife snapshot'ı (`commissionTarifeId`) **bütün defterde 0/140** — KAPSANAN pencerede duran 31 kalemde de boş. Yani deliğin bedeli bu satışlarda değil, **`Fiyat dene`de**: o dönem için _"şu fiyata satsam komisyon ne olur"_ sorusu cevapsız kalır. ⚠ **DELİĞİN GERÇEK BEDELİ BÖYLECE TANIMLANDI:** satış defteri DEĞİL, o dönem için `Fiyat dene`nin susması. Kayıp yeri yanlış tarif edilseydi düzeltilecek bir şey aranır ve doğru çalışan kayıtlara dokunulurdu. ⚠ **BULGU — `commissionTarifeId`'nin HİÇBİR YAZICISI YOK** (uygulama genelinde sıfır atama): şema _"bu tarifeden oran snapshot'lamış satış kalemleri"_ diyor, kod bunu hiç yapmıyor. Kolon başlığı bir iddiadır. **Bugün zararsız** — oran zaten `SaleItem.commissionRate`'te donmuş durumda ve doğruluğu ondan geliyor; kayıp yalnız **köken izi** (hangi pencereden geldiği). Kalem açıldı: **K52**. ⚠ **ORAN DOĞRU MU sorusu AYRIDIR ve cevabı tarifede değil FATURADADIR** — kullanıcının önerisi (_"satış faturalarından bakarız"_) kaynak sırasında **1. basamak**, tarifeden üstün: tarife niyeti, fatura sonucu söyler. Araç zaten var: `npm run canli:oran-denetimi -- --dosya="…"`. 🧪 `tarife:dogrula` 98→**132** · **16 mutasyon, 16'sı da kırmızı** (eşik ↑ · eşik ↓ · hesap ayrımı · gömülü pencere · gün sayımı uçları · render koşulu · kesilmiş liste · "kapanmaz" cümlesi · saat kırpması · **panel deliği görev sayarsa** · **rozet susturulursa** · görüş sınırı hepsini affeder · hiçbirini affetmez · kayıt yokken sınır iddia eder · sınır cümlesi çizilmez · sınır pencere tarihinden okunur). |
| **Gider kartla ödenebiliyor** | ✅ **[KOŞTU]** — kullanıcı: _"giderleri ve vergileri de kartla ödüyorum; bugün 4-5 binlik vergi ödedim."_ Ölçülen boşluk: `kartBorcuHesapla` YALNIZ alımlardan besleniyordu, kartla ödenen gider kart borcunda ve **nakit takviminde HİÇ görünmüyordu**. `Expense.creditCardId` + `installmentCount` (adlar alımla birebir aynı — iki ad, iki zihin modeli demekti). ⚠ **Taksit var çünkü kullanıcı SONRADAN böldürüyor:** _"devlete peşin kartla ödüyorum, sonra banka uygulamasına girip taksit seçeneği varsa böldürüyorum."_ Tek çekim varsayılsaydı borç yanlış aya yığılırdı. ⚠ **GERİ DOLDURMA YOK ve bu bilinçli** — mevcut giderlerin hangisinin kartla ödendiğini sistem bilmiyor; uydurulmuş bir kart bağı kart borcunu **olmayan bir borçla** şişirirdi. ⚠ **DÖNÜŞÜM TEK GÖVDEDE** (`lib/kart-gideri.ts`), dört çağrı yeri var; ayrı yazılsaydı iki ekran aynı kart için farklı borç gösterirdi. ⚠ **Para birimi ÇEVRİLMEZ**, atlanan gider **sayılır** ve ekranda söylenir. |
| **Gider formu kaydedilemiyordu** | ✅ **[KOŞTU] — CANLI HATA, BENİM HATAM.** Her kayıtta _"Taksit sayısı tam sayı olmalı"_ ve gider hiç kaydedilemiyordu. Kök neden: şema doğruluyordu, yazma kullanıyordu, **ama `formuOku` alanları formdan HİÇ OKUMUYORDU** — `veri.installmentCount` hep `undefined`. ⚠ **BEKÇİ NİYE YAKALAMADI:** zincirin **iki ucunu** sınıyordu (formda alan var mı · yazmada kullanılıyor mu) ama **ORTASINI** değil. Anayasaya madde olarak girdi: _"bir zincir, halkalarının VARLIĞIYLA değil BAĞLANTISIYLA sınanır."_ **Taksit isteğe bağlı yapıldı** (kullanıcı kararı): boş bırakmak meşru bir cevap — tek çekim. |
| **Ödeme yöntemi — Nakit / Havale / Kart** | ✅ **[KOŞTU]** — kullanıcı: _"havale ile ödeme veya cash ödeme ana kategorileri olmalı, kartla ödeme tıklanırsa altta kartlar açılsın."_ `Expense.odemeYontemi ENUM('NAKIT','HAVALE','KART') NULL` — kuru koşum (canlı, salt okuma: kolon yok · 11 gider · MariaDB 10.11) → canlı koşum → damga (**35 migration**) → yerel. ⚠ **SAKLANDI, ÇÜNKÜ SAKLAMAMANIN BEDELİ ÖLÇÜLDÜ:** form üç seçenek gösterip seçimi saklamasaydı düzenlemeye girildiğinde "Havale" seçilmiş bir gider ekranda **başka türlü görünürdü**. Ekranın yanlış bir şey göstermesi bir sütundan pahalıdır. ⚠ **GERİ DOLDURMA YOK:** eski kayıtlar `null` kalır, ekran **"Belirtilmedi"** der — "Nakit" VARSAYILMAZ. _(Alanın doğum tarihi 25.08.2026; ondan öncesi için boşluk hüküm değildir.)_ ⚠ **YÖNTEM YOK + KART VAR ise ekran "Kartla" DEMEZ**, `"Belirtilmedi · Garanti"` der — iki olgu ayrı yazılır, kartın varlığından yöntem **çıkarılmaz**. ⚠ **HİÇBİR HESABA GİRMİYOR** (bilinçli, bekçiyle kilitli): borç `creditCardId`den yürür, bu alan beyan/görünüm. Biri gün gelip hesaba bağlarsa bekçi kırmızı yanar ve karar **yeniden verilir**. ⚠ **NAKİT/HAVALE seçilince kart SESSİZCE SİLİNMEZ** — çelişki ekranda söylenir, kullanıcı tek tıkla kaldırır; sessiz silme kart borcunu uyarısız azaltırdı. ⚠ **Sütun AÇILMADI** (tablo zaten 8 sütunla tavanın üstünde); bilgi açıklama hücresinin ikinci satırında. Ekran ve Excel **aynı gövdeyi** çağırıyor (`lib/gider-odemesi.ts`). 🧪 `kart-odeme:dogrula` 135→**169** · **13 mutasyon**, ikisi önce YEŞİL kaldı ve bekçi düzeltildi (① `const celiski =` aranıyordu, render koşulu `{false ? (` yapılınca dal hiç çizilmedi ② `yontemSec`in karta dokunmadığı hiç ölçülmüyordu). |
| **Menü grupları açılıp kapanmıyordu** | ✅ **[KOŞTU] — İKİ AYRI KUSUR.** ① _"Tanımlar devamlı açık kalıyor"_: `acik = icindeSecili \|\| acikKayit` ifadesi, o grubun içindeki bir sayfadayken grubu **zorla açık** tutuyordu — başlığa basmak hiçbir şey yapmıyordu (tıklanınca iş yapmayan düğme = sessiz başarısızlık, #5). **Üç durum** yapıldı; otomatik açılma kaldırılmadı ama **açık tercih onu yeniyor**. ② _"Para kategorisi açılıp kapanmıyor"_: durum YALNIZ `localStorage`'ta yaşıyordu ve yazma başarısız olursa `catch {}` onu **sessizce yutuyordu**. Artık gerçeğin kaynağı **bellek**, depolama yalnız kalıcılık. ⚠ Anayasaya madde: _"kalıcılık katmanı, çalışma katmanının önkoşulu yapılmaz"_ — **sessiz yutma sınıfının üçüncü üyesi** (kamera `catch`i · menü `catch {}`). 🧪 `panel:dogrula` +3 kontrol · 3 mutasyon. |
| **Geçici betik kalıbı** | ✅ **[KOŞTU]** — `scripts/tmp/` + `.gitignore`. 24.08'de bir ölçüm betiği commit'e sızmıştı; sebep dikkatsizlik değil **sıralamaydı** (silme komutu yazma komutuyla aynı zincirde koşunca dosya doğmadan çalıştı). ⚠ **MEKANİZMA, ALIŞKANLIK DEĞİL:** _"bir dahaki sefere silerim"_ bir niyettir; niyet unutulur, `.gitignore` unutmaz. ⚠ **İZİN LİSTESİ, YASAK LİSTESİ DEĞİL:** her şey yok sayılır, `BENIOKU.md` tek istisna — `*.ts` yok sayılsaydı yarın yazılan bir `.mjs` sızardı. 🧪 `gecici:dogrula` (11 kontrol) — **ölçüt metin değil DAVRANIŞ**: `.gitignore` okunmuyor, **git'in kendisine soruluyor** (`git check-ignore`), yoksa kuralı ileride ezen bir satır görünmezdi. 3 mutasyon (kural kaldırıldı · `.ts`'e daraltıldı · istisna kaldırıldı) — 3'ü de kırmızı. **Bekçi sayısı 50 → 51.** |
| **El kitabı — gider bölümü** | ✅ **[KOŞTU]** — kullanıcı sormuştu: _"KDV yazmayın diyor; KDV çıkmadığı zaman ödenen damga vergisi var, 791 TL, onu yazıyor muyuz? Bir de gelir vergisini yazıyor muyuz? Kitapta detay yok."_ Kitap gerçekten susuyordu. **Eklendi:** hangi vergi nereye tablosu (damga · MTV · ödenen gelir vergisi → **EVET, KDV 0** · ödenecek KDV · stopaj → **HAYIR**) · **fark bloğu** (kâr motorunun reddedilmiş varsayımsal %15'i ≠ fiilen ödenen gelir vergisi — tek ortak yanı adı) · kart/taksit akışı (kullanıcının kendi anlattığı "bankada sonradan böldürme" sırasıyla) · para birimi kuralı · "Belirtilmedi" ne demek · 4 sık hata. 🧪 `el-kitabi:dogrula` 41→**52** · 6 mutasyon; **biri İKİ KEZ yeşil kaldı** — `"Damga vergisi"` bölümde ÜÇ kez geçiyor, satıra daraltınca da MTV satırının GEREKÇE hücresi (_"Damga vergisiyle aynı mantık"_) yakalanıyordu. Ancak **ilk hücreye** (kalem adı) bağlanınca kırmızı yandı. |
| **Push kapısı** | ✅ **[KOŞTU]** `.githooks/pre-push` → bekçi sıfır dönmeden push geçmez. `core.hooksPath` ile kurulur (`prepare`), yani **depoyla gelir** — kişisel alışkanlık değil. 🧪 **Mutasyonla sınandı** (kasıtlı derleme hatası → `exit 1`) **ve ilk gün gerçek bir push durdurdu**: `okuma:dogrula` eskimişti (raf dalı öne geçince desen kaydı), ölçüt **güncellendi, susturulmadı**. ⚠ **DÜRÜSTLÜK SINIRI KAYITLI:** `git push --no-verify` bu kapıyı atlar ve git'ten kaldırılamaz — koruma **"kazayla imkânsız"**, "mekanik imkânsız" DEĞİL. |
| **Kamera — kargo barkodu** | ✅ **KAPANDI 25.08.2026, Halil doğruladı: _"şimdi çalışıyor"_.** Kök neden **çözünürlük**: `getUserMedia` yalnız `facingMode` istiyordu, tarayıcı çoğu cihazda **640×480** veriyor. EAN-13 ürün barkodu ~95 modül → modül başına **~6 px** (okur); 16 haneli kargo barkodu ~220 modül, üstelik A4'ün köşesinde → **~3 px** (okumaz). `1920×1080` **`ideal`** ile istendi (`min` DEĞİL — desteklemeyen cihazda kamera hiç açılmazdı) + sürekli odak denemesi.

⚠ **TEŞHİSİ ÇÖZEN ŞEY HALİL'İN YAN CÜMLESİYDİ:** _"Okut kısmına ürün barkodu denedim OKUDU."_ O cümle olmadan iki yanlış yolda daha ilerlerdim. **Neyin ÇALIŞTIĞI, neyin çalışmadığı kadar bilgidir** — arıza raporunda "şu da denendi ve oldu" satırı, arızanın kendisinden daha ayırt edicidir.

⚠ **İKİ HİPOTEZ ÖLÇÜMLE ELENDİ, TAHMİNLE DEĞİL:** ① wasm sürüm uyumsuzluğu — `public/zxing_reader.wasm` paketteki 3.1.2 ile **birebir aynı bayt**; ② biçim listesi fırlatıyor — Node'da eski ve yeni liste denendi, **ikisi de OK** döndü.

⚠ **VE İKİNCİ BİR KUSUR ORTAYA ÇIKTI:** tarama döngüsünde `catch {}` vardı, **her kareyi sessizce yutuyordu.** Çözücü hiç çalışmasa bile kamera açık kalır ve teşhis edilecek tek iz kalmazdı — _"kameralar okumuyor"_ bildirildiğinde elimizde hiçbir hata kaydı yoktu. Artık ilk hata ekranda yazıyor (her karede değil). 🧪 `kamera:dogrula` 25→29 · **3 mutasyon, biri önce yeşil kaldı** (desen kamerayı AÇARKEN kullanılan başka bir `catch(e)+setHata` çiftini buluyordu → tarama döngüsüne daraltıldı). |
| **Raf modu `/okut`'ta** | ✅ **[KOŞTU]** — K50 ⑤. Etiketler zaten vardı (`/ayarlar/konumlar/etiketler`), **okuma tarafı yoktu**; Halil bulguladı. Sıra: ürün → satış → **RAF**. ⚠ **Ölçüm kovalarına GİRMİYOR** (`iziYaz`dan önce dönülüyor): raf okuması ürün okuması değildir, kovaya girseydi `BILINMEYEN` şişer ve haftalık kapsam ölçümü *"defter eksik"* derken aslında *"raf okutuldu"* demiş olurdu. ⚠ Başlık **"kayıt"**, envanter değil — çıkışlar rafı boşaltmıyor, adet iddiası yok. ⚠ **Son-yerleştirme sütunu YOK çünkü İZİ YOK** (K50 ③ gelince eklenir); `updatedAt` vekil YAPILMADI. |

---

## 🧭 OPERASYON — Halil, bugünden itibaren

### ⏳ HALİL'DE BEKLEYEN — dördü de kısa

| # | İş | Not |
|---|---|---|
| 1 | **Raf QR testi** | `/okut`'ta bir raf QR'ı okut (`A1`, `A10`…). Beklenen: *"Raf A1"* + o rafa kayıtlı ürünler + *"konum kaydıdır, adet sayımı değil"* notu. |
| 3 | **`11504122276` → İptal et** | Depodan ürün ÇIKMADIYSA `İptal et`. ⚠ `Değişim ürünü gönderildi` **geri alınamaz** bir stok çıkışı yazar. |
| 4 | **31.08 ekran görüntüsü** | "Reddedilen" detayı: **karar tarihi + kargo kodu + kalan süre aynı karede.** H25① rozetini `BEYAN` → `OLCULDU` yapar. ⚠ Sayaç **31.08.2026 12:35**'te doluyor — bugünden **6 gün**. _(Komutta "4 gün" yazıyordu; tarih yazıldı, gün sayısı bayatlamasın.)_ |

- **Yeni satış girerken panelden GÖNDERİ NUMARASINI da gir.** Alan formda
  duruyor; okutarak da girilebilir. Alan doluysa `/okut` **tekil siparişe**
  düşer ve elle sipariş seçme adımı kalkar.
- **Eski 121 satışa geri doldurma YOK** — kod uydurulamaz. Sonradan panelde
  görürsen satış detayından girilebilir; **zorunlu değil.**

---

## 🛡 A3 GÜVENLİK ÇERÇEVESİ — mimar kararı 25.08.2026

> **TEST DOMAİNİ AÇILMAYACAK.** Canlıda salt okuma disipliniyle
> ilerlenecek. Gerekçe: _"iki defter ayrışır, üçüncü bir mutabakat işi
> doğurur; koruma domain ayrımı değil, **YAZAMAYAN İSTEMCİDİR**."_

| # | Şart | Durum |
|---|---|---|
| 1 | API istemcisi TEK modülden çıkar, **yalnız GET/okuma** uçlarını bilir. Yazma ucu fonksiyon olarak BİLE tanımlanmaz — _çağrılamayan şey yanlışlıkla çağrılamaz._ İleride yazma gerekirse ayrı modül + ayrı karar. | ✅ bugün geçerli (iki betik, ikisi de yalnız GET) |
| 2 | **Bekçi:** API'ye dokunan kodda `POST/PUT/DELETE/PATCH` → KIRMIZI | ✅ **[KOŞTU]** `npm run api:dogrula` · mutasyonla sınandı |
| 3 | Ölçüm betikleri deftere YAZMAZ (`prisma.create/update/delete` → KIRMIZI) | ✅ **[KOŞTU]** aynı bekçide |
| 4 | Anahtar yalnız `.env.canli`de; log/rapor/commit'te maskeli | ✅ bekçi anahtar **DEĞERİNİ** arıyor (adı sır değil) |
| 5 | **İçe aktarma (A3-③) başlamadan kuru koşum raporu + mimar onayı** — migration disipliniyle aynı kapı | ⏳ sırası gelmedi |

⚠ **DOSYALAR ADLA DEĞİL İÇERİKLE BULUNUR** (`apigw.trendyol.com` izi):
yarın başka adla yazılan bir modül de kendiliğinden kapsama girer.
Elle liste tutulsaydı, listeye eklenmeyen dosya sessizce korumasız kalırdı.

---

## 🔴 KARAR BEKLEYEN — sırada bu var

| # | İş | Durum |
|---|---|---|
| **A3** | 🔴 **AŞAMA 3 — pazaryeri API'si açılsın mı?** | ⏳ **GEREKÇE AĞIRLAŞTI 22.08.2026: SORUN TEK KANALDA DEĞİL.** Ölçüm iki kanala genişletildi (`npm run canli:eksik-siparis`, salt okuma):<br>**Trendyol** `01.08→20.08` — 143 sipariş, bizde **38**, eksik **105** (%73,4)<br>**Hepsiburada** `03.08→15.08` — 51 sipariş, bizde **6**, eksik **45** (%88,2)<br>İkisinde de **okunamayan satır 0** — yani bunlar soru değil, KANIT. ⚠ Pencereler farklı, iki kanal birbiriyle KIYASLANMAZ; her rakam kendi penceresinde okunur. **Hüküm:** elle giriş yetişmiyor ve bu Trendyol'a özel bir hacim sorunu değil — daha az sipariş gelen HB'de oran daha da kötü. Keşif ağustosun kapanmasını beklemiyor.<br>🔺 **AĞIRLAŞTI 24.08.2026 — ÜÇÜNCÜ, BAĞIMSIZ ÖLÇÜM.** Eksiklik artık sipariş dökümünden değil **hakediş tarafından** da görünüyor: kanalın ödeme kalemleri **385 farklı sipariş** adlandırıyor, bizim TÜM defterimizde **121 satış** var (kanal ve dönem farkı gözetmeden). Bu bir kapsam tartışmasına dayanmaz — üst küme alt kümeden büyük. **A3 artık üç kalemi birden kilitliyor: H3 · K8 · K19①.**<br>🔺 **BEŞİNCİ TANIK 24.08.2026 — VE TÜRCE FARKLI: GEREKÇE DOSYASI KAPANDI.** Önceki dört tanık BELGEydi (sipariş dökümü · hakediş raporu · iade paneli · kargo faturası). Beşincisi belge değil, **sistemin KENDİ eşleştirme motorunun cevabı**: `npm run canli:k8-olcum` → bağlanamayan **1081 kalem / 380 sipariş**, ve bunların **hiçbiri** biçim/kanal sorunu değil (b kovası = **0**). Motor 13 partide 13 kez boşa attı. ⛔ **Beş bağımsız kaynak, tek yön. A3 için toplanacak gerekçe kalmadı** — kalan tek şey karar.<br>🔎 **KEŞİF RAPORU HAZIR 24.08.2026** — `docs/a3-trendyol-api-kesif.md` (salt okuma araştırma, kod yazılmadı, hiçbir uca istek atılmadı). **TEKNİK ENGEL YOK:** ihtiyacımız olan üçü de API'de ve üçü de salt okuma — **sipariş çekme** (A3'ün kendisi) · **hakediş** (H3·K8·K19① kilitlerini birden açar) · **kargo faturası** (K45'in elle indirdiği dosya). ⚠ **İKİ SINIR TASARIMI BELİRLİYOR:** sipariş ucu tek istekte **en fazla 2 hafta**, geriye **1 ay** (bir sayfada 3 ay yazıyor — **çelişki, ölçülmeli**), **10.000 kayıt tavanı**. ⚠ **İKİ BULGU BUGÜNKÜ İŞLERİ DOĞRULADI:** `orderDate` **saat taşıyor** (H20'nin açık kararı artık teorik değil) · paket bölünmesi `createdBy:"split"` + `originPackageIds` ile **görünüyor** (`Sale.paketSayisi` türetilebilir; `11473322212`'de elle bulduğumuz 2×₺13,19 bir daha elle bulunmaz). ⚠ **HAKEDİŞ SATIRI `orderNumber` TAŞIYOR** → K8'in eşleştirme kuralı **değişmiyor**, veri başka kapıdan giriyor. Üstelik `commissionRate` VE `commissionAmount` ikisi de var — kanalın **fiilen kestiği** komisyon, yani anayasadaki "gerçek bağımsız teyit". ✅ **ANAHTAR GELDİ VE ÖLÇÜLDÜ 25.08.2026** (`npm run canli:ty-saglik`, **yalnız GET**): **YETKİSİZ 0** — anahtar tam yetkili. **SİPARİŞ ✅** · **HAKEDİŞ ✅ 15 günde 86 kayıt** (`commissionRate` + `commissionAmount` ikisi de geliyor → kanalın FİİLEN kestiği komisyon) · **İADE ✅** (`cargoTrackingNumber` dahil) · **ÜRÜN ✅** · **DİĞER FİNANS açık ama pencerede kayıt yok.** ⚠ İki uç 556 döndü ama **yolları TAHMİNDİ** (dokümantasyon indeksi adı veriyor, tam yolu vermiyor) — "TY kapalı" demek, kendi bilgisizliğimi karşı tarafın kusuru gibi raporlamak olurdu. ⚠ İlk koşumda `size=5` gönderip hakediş uçlarından 400 aldım; onu "ULAŞILAMADI" saymak çalışan bir ucu kapalı göstermekti — ayrı kova açıldı (**İSTEK HATALI**), `size=500` ile açıldı. ⏭ **SIRADAKİ ADIM KOD DEĞİL:** ~~satıcı panelinden **API anahtarı**~~ (⚠ yalnız ANA KULLANICI alabilir) + `HealthCheck` ile hangi uçların **hesabımızda açık** olduğunu ölçmek. Rapordaki her şey dokümantasyondan; hesabın gerçeği ancak anahtarla görülür.<br>🔺 **DÖRDÜNCÜ BAĞIMSIZ TANIK 24.08.2026 — GEREKÇE ARTIK MUTABAKAT.** TY **kargo faturası** detayı okundu (`npm run canli:kargo-mutabakat`, salt okuma): **12 satırın 8'i** (7 farklı sipariş) defterimizde **hiç olmayan** siparişlere ait — `11249504556` · `11462653918` · `11409234590` · `11429466372` · `11428406427` · `11429908093` · `11400535991`. Artık dört ayrı BELGE TÜRÜ aynı yönü gösteriyor: sipariş dökümü · hakediş raporu · iade paneli · kargo faturası. ⚠ **VE NİTELİK AĞIRLAŞTI:** bu siparişlerin kargo gideri **fiilen ÖDENMİŞ**. Boşluk yalnız görünmeyen ciro değil, **hiçbir satışa bağlanamayan gerçek para** — o siparişlerde kâr tanım gereği yanlış. ⏭ Bu 7 numara, defter kapatma işinde **çapraz kontrol**: eksik-sipariş içe aktarım listesinde de var mı? Yoksa **beşinci** boşluk türü — dökümde de olmayan sipariş.<br>✅ **KULLANICI TEYİDİ 24.08.2026:** _"bunlar reel siparişler."_ Yani `(c)` kovası **veri artefaktı DEĞİL** — o siparişler gerçekten oldu, kargoları gerçekten ödendi, sistemde yoklar. ⚠ **SORUNUN CİNSİ DEĞİŞTİ:** eksik sipariş artık yalnız _görünmeyen ciro_ (kazanılmamış para) değil, **çıkmış para** — ödenmiş bir gider hiçbir satışa bağlanamıyor. NET-2 yalnız eksik değil, **fazla iyimser.** |

---

## ⏸ HALİL'E BAĞLI — kod işi kalmadı

| # | İş | Ne gerekiyor |
|---|---|---|
| **H3** | **Satışlarımızın ödendiği dosya** | 🔻 **[KOŞTU 24.08.2026] GEREKÇE ÇÜRÜDÜ — DARBOĞAZ TAKVİM DEĞİL, BİZ.** Eski gerekçe _"dosya ~20.09'a kadar yok"_ idi. Ölçüldü (`npm run canli:hakedis-ortusme`, salt okuma): elimizdeki **1136 kalem zaten `08.07 → 03.09` vade aralığını taşıyor** — yani doğru dönem ELİMİZDE. **Kesişim yine de 5.** Sebep biçim değil (hakediş 10 hane×129 + 11 hane×256; satış aynı biçimde), **KAPSAM**: hakediş **385 farklı sipariş** adlandırıyor, bizim TÜM defterimizde **121 satış** var. ⛔ **Yeni dosya indirmek bu tabloyu değiştirmez** — eksik olan onların satırı değil bizim siparişimiz. **H3 artık A3'e bağlı**, takvime değil. |
| **H8** | **HB hizmet bedeli — soru değişti** | 🕓 **[BEKLİYOR] eylül ortası HB ekstresi.** Ölçüldü: hesabı kesilmiş 99 siparişin yalnız **14'ünde** ₺12,60 kesilmiş; motorumuz **%100'ünden** kesiyor. Koşul hiçbir dosyada görünmüyor. **Kural DEĞİŞTİRİLMEDİ** — sıfıra çekmek de en az mevcut hâli kadar dayanaksız. Kapanış: 13 HB satışımızın ekstresi düşünce satış satış kıyaslanır. |
| **H10♻** | **RUTİN: her Salı/Cuma tarife dosyasını indir** | ♻ **SÜREKLİ — ERİŞİM AÇILDI 24.08.2026.** Tam dilimli ileri tarife arşivden **inmiyor**; o hafta indirilmezse bir daha elde edilemez. ✅ **SALI DOSYASI GELDİ VE YÜKLENDİ 25.08.2026** — ekrandan, terminalsiz. **Yüklü: 3 pencere, üçü de Trendyol.** ⚠ **BU HAFTAKİ DOSYA 7 GÜNLÜK** (Salı→Salı), öncekiler 4 günlüktü (Cuma→Salı) — dosyanın kendi kolonu da `Tarih aralığı (7 Gün)` diyor. Cuma dosyası yine de **beklenir**: gelmezse kapsam zaten var, gelirse yüklenir.<br><br>⛔ **VE ÖLÇÜM KALICI BİR DELİK BULDU — 72 SAAT.** Gerçek sınırlar (İstanbul, `canli:tarife-yukle` raporundan değil **veritabanından** okundu):<br>`14.08 08:00 → 18.08 07:59` 640 kalem<br>**⛔ 18 · 19 · 20 Ağustos — KAPSAYAN PENCERE YOK**<br>`21.08 08:00 → 25.08 07:59` 672 kalem<br>`25.08 08:00 → 01.09 07:59` 712 kalem<br>**18.08 Salı dosyası hiç indirilmemiş.** O üç günün satışlarında `Fiyat dene` dilim veremez ve komisyon denetimi hüküm kuramaz. Arşivden inmediği için **kapatılamaz** — rutinin niye rutin olduğunun somut kanıtı. ⚠ **HEPSİBURADA TARİFESİ HÂLÂ SIFIR** (HB Çarşamba yayımlıyor); bugün HB ve N11 `Fiyat dene`de _"dilim tarifesi yok — tek oranla hesaplandı"_ diyor, yani üç kanal **eşit zeminde kıyaslanmıyor**. _(Gerekçe ve ölçüm: ARSIV → K47.)_ |
| **H16** | **Canlı tur** | Kart sırası · yapışkan çubuk · döküm görüntüsü · kıyas ibaresi — hepsi deploy'da, gerçek cihazda bakılacak. |
| **H17** | **Yedek — ilk gece doğrulaması** | Dış zamanlayıcı kuruldu, test 200 verdi. `/ayarlar/disa-aktarma` → **kırmızı eksik gün kutusu kaybolmuş olmalı.** |
| **H18** | **Melontik ölçütü** | Çapraz teyit için **gerçek** Melontik çıktısı. _Sunumdaki rakamlar demoydu; doğrulanmamış ölçüte göre motor bozulmak üzereydi._ |
| **H23** | **İadeler ekranı — sekmeli düzen** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üç sekme (Bildirimler / İşlenmiş iadeler / Kırılım), durum süzgeci, süzgeç yalnız etkilediği sekmede. ⚠ **Panel rozeti 0 → 3 oldu** (ölçüt düzeltildi: `ITIRAZ_RED` bekleyen sayılmıyordu). Test listesi teslim raporunda, 9 madde. |
| **H24** | **Tema görünürlüğü — üst çubuk + zemin** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üst çubuk kabuk renginde (telefonda temanın göründüğü tek yer), sayfa zemini bir kademe koyu. Test listesi teslim raporunda, 8 madde. |
| **H25** | **İade süreci — iki ölçüm kaldı** | ✅ **10 GÜNLÜK SAAT KAPANDI:** Aras takibi `(KG)` "yola çıktı 21.08 12:35" ile TY ekranının sayacı **25 saniye** farkla buluştu; rozet `BEYAN → OLCULDU`. 🔻 **Kalan ① KÜÇÜLDÜ 25.08.2026 — ÜÇ SORUNUN İKİSİ CEVAPLANDI `(K)`:** birim **2 İŞ GÜNÜ** (takvim günü değil) · çıpa **KARAR ANI** — _"analizden dönen ürün seçeneklerden biri seçildiğinde"_, kargo kodu DEĞİL. ⚠ İki aday çıpa arasındaki mesafe de ölçeğiyle geldi: seçimden sonra kayıt **~1 saat** "İhtilaflı"da bekleyip aksiyona geçiyor — yani fark **saat**, gün değil (gece yarısını geçerse 1 iş günü eder). ✅ **ÜÇÜNCÜ SORU DA CEVAPLANDI 25.08.2026 `(K)` — ve cevap şıkların hiçbiri değil:** _"iade otomatik olarak MÜŞTERİNİN AÇTIĞI SEÇENEKTEN kapanır; kusurlu üründen açılmışsa ve biz değişim deyip göndermediysek **kusurlu ürün gönderme cezasıyla** kapanır, müşteriye parası yatırılır."_ ⚠ **Sonucu bizim eylemimiz değil MÜŞTERİNİN SEBEBİ belirliyor** — "ceza kesilir" demek eksik olurdu. ⚠ **Beş sayacın EN PAHALISI:** 2 ve 3 dolunca mal yok/para gitti; beşinci dolunca **mal BİZDE kalır, para yine gider, üstüne ceza biner.** ⛔ **Cezanın KENDİSİ ölçülmedi** (hangi sebep hangi ceza, tutar ne) — sistem mekanizmayı yazar, rakamı YAZMAZ. ⚠ **ROZET `BEYAN`, `OLCULDU` DEĞİL:** tek kaynak var; §12.2'deki `10 gün` üç bağımsız kaynakla terfi etmişti. ⚠ **KOD TARAFINDA İKİ EKSİK ÖLÇÜLDÜ:** `SAYAC_KURALLARI`nda **birim alanı yok** (öteki dördü takvim günü, hesap `gunEkle`) ve `isGunuEkle` **resmî tatil saymıyor, yalnız hafta sonu**. Şema DEĞİŞMİYOR — çıpa `GECIS_ANI`, sütun `islemSonTarihi`, ikisi de mevcut. ⚠ **KAPSAM AÇIK:** beyan **analiz yolunu** anlatıyor, sayaç `ITIRAZ_KABUL`e gelen **üç yolda** işliyor (`ITIRAZ_ACILDI` · `ITIRAZ_INCELEMEDE` · `ANALIZ`). Gereken (hem (c) hem terfi için): "Reddedilen" sekmesindeki bir iadenin detayı (karar tarihi + kargo kodu + kalan süre aynı ekranda). ⏳ **Kalan ②:** N11 — tecrübe yok, süresiz bekler. |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K52** | **`SaleItem.commissionTarifeId` — yazıcısı YOK, şema taşımadığı bilgiyi vaat ediyor · [AÇIK — ŞARTLI]** | 🕓 **[AÇILDI 25.08.2026, ÖLÇÜLDÜ]** Şema diyor ki _"bu tarifeden oran snapshot'lamış satış kalemleri"_; **uygulamada sıfır atama var** ve canlıda **0/140 kalem** dolu — kapsanan pencerede duran 31 kalemde de boş. Yani sistem, yaptığını söylediği şeyi hiç yapmıyor. ⚠ **BUGÜN ZARARSIZ ve bu ölçüldü:** oranın kendisi `SaleItem.commissionRate`'te satış anında DONUYOR, doğruluk oradan geliyor; kayıp yalnız **KÖKEN İZİ** — bir oranın hangi tarife penceresinden geldiği. Tarife üzerine yazılabildiği için (aynı pencere ikinci kez yüklenirse kalemler silinip yeniden kuruluyor) köken izi bugün zaten kırılgan. ⚠ **AÇILIŞ ŞARTI:** bir oran itirazı ya da denetim, _"bu oran nereden geldi"_ sorusunu gerçekten sorduğunda. Bugün o soruyu soran yok; olmayan ihtiyaca sütun doldurulmaz. ⚠ **VE ÜÇÜNCÜ SEÇENEK YOK:** ya bağlanır ya kaldırılır — _"dursun, ileride lazım olur"_ bir karar değil, kararın ertelenmesidir. Alan durduğu **her ay yanıltıcılığı artar**: onu boş bırakan gerekçeyi hatırlayan kişi sayısı azalır. Anayasaya madde olarak girdi. _(Kardeşi: K31'de bulunan üç ölü sütun — orada da şema bir şey vaat ediyordu, kod tutmuyordu.)_ |
| **K50** | **RAF MOTORU — 🟡 KİLİT KALKTI, SIRA BEKLİYOR (üç komut birleşti)** | 📦 **ÜÇ KOMUT TEK KALEM.** 25.08'de sırayla geldi: ① _barkodlu raf sistemi_ (`K42-RAF` adıyla — çakışma, K50'ye alındı) ② _raf motoru: kurulum ekranı + esneklik + toplu taşıma_ ③ iki ek: _barkod üretimi sistemin içinde_ ve _etikette barkod + karekod birlikte_. İkinci komut birinciyi **kapsıyor ve düzeltiyor**, o yüzden ayrı kalem açılmadı.  ⚠ **ASIL DÜZELTME — DEPO DÜZENİ ARTIK VERİ, ŞABLON DEĞİL.** İlk komut Halil'den üç sayı istiyordu (koridor · ünite · göz). İkinci komut bunu iptal etti: _"depo düzeni firmadan firmaya değişir; kanal kesinti kuralları nasıl veri olduysa depo düzeni de VERİDİR — firma deposunu kendisi çizer."_ **Yani Halil'e soru sorulmuyor, ekran veriliyor** (`/ayarlar/depo`). Bu, benim _"üç sayıyı bekliyorum"_ dediğim engeli ortadan kaldırdı.  **KAPSAM — yedi başlık:** **①** `/ayarlar/depo`: bölüm ekle (ad serbest, KISALTMASI kurallı — büyük harf/rakam, boşluksuz, Türkçe karaktersiz, barkod-güvenli; ad ↔ kısaltma AYRI alanlar) · bölüme ünite, üniteye göz sayısı (bölüm bölüm farklı olabilir, ünite bazında istisna da) · **göz numarası YERDEN YUKARI, SABİT KURAL — ayar değil**, gerekçesi ekranda yazar (üste kat eklenince etiket sökülmez) · **ÖNİZLEME** (üretilecek kodlar + toplam) · onaysız tek raf yazılmaz. **②** **ETİKET SİSTEMİN İÇİNDE ÜRETİLİR** — SVG + kütüphane, **dış servis/API çağrısı YOK**. Her etikette **üç gösterim, TEK değer**: sol `Code128` (el terminali) · sağ `QR` (telefon) · alt okunabilir yazı (`RAF-A1-3`). ⚠ **QR'a zengin veri KONMAZ** (adres/URL/liste yasak) — iki kod ayrışırsa aynı etiket iki kimlik taşır. A4 toplu basım + **tek raf yeniden basımı**; yeniden basım AYNI kodu çizer (K35 kuralı). Basım izi `AuditLog`a. **③** `/yerlestir` okut-koy: raf okut → ürün okut → onay. Ardışık yerleştirme (tek raf, çok ürün). Konum GÜNCELLEMEDİR; eski→yeni `AuditLog`a. **④** `/paketle` konum doğrulaması (okut-al): _"beklenen rafta mıydı"_ → `AuditLog`, **NÖTR, akış DURMAZ**. Ekranda raf zaten var (K46), değişiklik yalnız iz. **⑤** `/okut` raf modu: `RAF-` önekli kod → o rafa kayıtlı ürün listesi. Başlık **"kayıt"**, "envanter" DEĞİL — adet iddiası yok. **⑥** **TOPLU TAŞIMA:** kaynak raf okut → hedef raf okut → liste + onay → tek harekette. **TEK `AuditLog` kaydı** (ürün başına satır değil), kısmî taşıma işaret kutularıyla. **⑦** **GÖÇ:** mevcut **41 raf** ilk açılışta gösterilir; düzen çizilince göç tablosu (eski ad → yeni kod) **önerilir**. ⚠ **ONAYSIZ TEK AD DEĞİŞMEZ.** 1090 ürünün raf bağı korunur, önce/sonra sayım raporlanır.  ⚠ **ESNEKLİK SINIRLARI — ekranda ve el kitabında da anlatılır:** raf kodu **KİMLİKTİR, KOORDİNAT DEĞİL** (ünite fiziksel taşınırsa sistemde hiçbir şey değişmez; _"rafı taşıdım"_ işlemi YOKTUR — eksiklik değil tasarım) · kapasite artırma = **ekleme**, mevcut kodlara dokunmaz · silme yalnız raf BOŞSA · **kod yeniden düzenleme YOK** (basılı etiket yalanlar, konum geçmişi kopar).  ✅ **İSİMLENDİRME ÇELİŞKİSİ KARARA BAĞLANDI 25.08.2026 — seçenek (a):** elle değişiklik **YALNIZ bölüm adı/kısaltmasında** ("Salon" → `SLN`; kısaltma kurallı: büyük harf/rakam, boşluksuz, TR karaktersiz). **Üretilen raf kodu ŞABLONA KİLİTLİ** (`RAF-<kısaltma><ünite>-<göz>`), elle düzenlenemez — içerikten ad türetme yasağı ve bekçileri aynen geçerli. ⚠ **KISALTMA SONRADAN DEĞİŞMEZ** (kod kalıcılığı): bölümün GÖRÜNEN adı değişebilir, kısaltması değişemez ve **ekran bunu baştan söyler**. _Gerekçe: kısaltma basılı etiketin içinde; değişirse etiket yalan söyler._  **SINIR (V1):** yalnız IZGARA düzeni (bölüm→ünite→göz). Serbest biçim (palet alanı, askı, tipli konum) **V2** — ihtiyaç ölçülünce. Olmayan ihtiyaca genel çözüm yazılmaz.  🧪 **BEKÇİ + MUTASYON (asgari set, komuttan):** şablon dışı kod üretimi · içerik-adlı raf · dolu raf silme · **göz numarasını üstten saydıran AYAR eklenmesi** (sabit kuralın kendisi sınanır) · kod yeniden adlandırma yolu · onaysız toplu taşıma · göç/taşımada ürün bağı kaybı (önce/sonra sayım) · **etiket sayfasında dış adres çağrısı** · **QR içeriği ≠ barkod içeriği**. Her mutasyonun UYGULANDIĞI teyit edilir.  ✅ **KOŞUM KİLİDİ AÇILDI** — API öncesi kapanış **5/5** kapandı (25.08). Bugünkü plan _"bugün başla"_ diyor. ⛔ **AMA ADIM (a) BUGÜN KOŞULAMIYOR:** iki ön ölçüm (raf doluluk + 41 adın biçimi) **canlı veritabanı gerektiriyor** ve yerel betikle bugün **altı kez** bağlanılamadı (`pool timeout`, `active=0` — tek bağlantı bile kurulamıyor). Canlı SİTE çalışıyor, yani veritabanı ayakta; tıkanan bizim yerel yolumuz. **Ölçüm yapılmadan göç tablosu üretilmez.** |
| **K41a** | **Gönderi numarası — ✅ [KOŞTU] 24.08.2026** | 📦 **CANLIDA.** `Sale.shipmentCode String? @unique` — migration koştu (33 migration · 470 kolon doğrulandı · damga güncellendi). **Sayım 125 → 125, dolu 0** (beklenen: kod satıştan SONRA oluşuyor, geri doldurulmaz). Yeni satış formunda + satış detayında **sonradan** girilebilir, ikisinde de **okutulabilir**. `/okut` varyant bulamazsa satış kimliğinde arar → sonuç **tekil** (`@unique`) → **Paketlendi doğrudan o satıra**. `/satislar` araması da bulur. ⚠ **"AYRI LİSTE YAZMA" NİYETİ KORUNDU, MEKANİZMA DEĞİŞTİ:** `kodKosulu` beş yerden çağrılıyor ve hepsi `ProductVariant` sorguluyor; gönderi no bir `Sale` kimliği. Liste **TEK** (`KOD_ROLLERI`), yayım kapsama göre ayrıldı (`ROL_KAPSAMI` **exhaustive** — altıncı rol derlenmeden eklenemez, nitekim beşinciyi eklerken `alanAdi` sözlüğü derhal kırıldı). 🧪 `arama:dogrula` 67 kontrol · **10 mutasyon, 10'u da yakalandı.** |
| **K41b** | **Barkodsuz iç etiket basılsın mı?** | 🔴 **KARAR HALİL'DE.** Gönderi numarası akışı bunu **BEKLEMİYOR** — pazaryeri etiketiyle çift okutma bugün çalışır durumda. Karar geciktiğinde hiçbir iş durmuyor. _(K35 etiket basımıyla kardeş; orada da açılış şartı yazıcı/etiket kararıydı.)_ |
| **K44** | **`Return` yazıldıktan sonra DÜZENLENEMİYOR** | 🕓 **[AÇILMADI, KAYDA GEÇTİ] 24.08.2026.** Sistemde bir iadeyi düzenleyecek ekran ya da eylem **yok** — `/satislar/[id]/iade/` yalnız YENİ iade oluşturuyor, `return.update` çağıran hiçbir uygulama yolu bulunmuyor. Bugünkü form düzeltmesi (değişim kargosu alanı) **bundan sonraki** iadeleri kapsıyor; geçmiş kayda ulaşamıyor — `11473322212` vaka-bazlı betikle düzeltildi. ⛔ **BUGÜN GEREKÇESİZ:** kargo mutabakatında `(b) eksik bacak = 0` ve `(d)` farkları sistematik yuvarlama çıktı, yani geçmişte düzeltilecek bacak görünmüyor. **Açılış şartı:** geçmiş bir kayda dokunma ihtiyacı doğuran ilk gerçek vaka. _(K39'un kardeşi: orada kapanmış BİLDİRİM düzeltilemiyordu, burada kapanmış İADE.)_ |
| **K45** | **Kargo faturası — düzenli mutabakat** | 🕓 **ARAÇ HAZIR, RUTİN KURULMADI.** `npm run canli:kargo-mutabakat "<fatura.xlsx>"` — salt okuma, kolon bulunamazsa **hata fırlatır** ("0 sapma" demez). İlk koşum (12 satır): (a) 1 · (b) 0 · (c) 8 · (d) 3. **(d)'nin üçü de tam `−0,01`** — bizde `106,75`, faturada `106,76`; `88,96 × 1,20 = 106,752`, biz aşağı TY yukarı yuvarlıyor. **HÜKÜM: sapma değil düzen farkı, iş açılmaz.** ⏭ Rutin hâline getirme kararı, TY'nin fatura yayım ritmi ölçüldükten sonra. |
| **K8** | **Hakediş eşleştirme — 🔻 KÜÇÜLDÜ, KOD İŞİ DEĞİL** | ✅ **[KOŞTU 24.08.2026] 8 KALEM BAĞLANDI** (0 → 8, iki sipariş: `11466103125` · `11466139735` · `11467064391` · `11470255175` · `11471381662`). İkinci koşum 0 yazdı — idempotent. İz artık `AuditLog`ta (`HAKEDIS_ESLESTIRME`). ⚠ **KALEM YENİDEN TANIMLANDI:** _"eşleştirme mekanizmasını yaz"_ diye duruyordu; ölçüm çürüttü. Mekanizma **var** (`lib/hakedis/eslestir.ts`, yükleme anında koşuyor), tekrar-koşum betiği **var** (`canli:hakedis-esle`), ve **doğru çalışıyor**. 📊 **ÖLÇÜM (`npm run canli:k8-olcum`):** 1136 kalem · sipariş no boş 47 · bağlanacak 8 · **(a) defterde hiç yok 1081 kalem / 380 sipariş** · **(b) sipariş var ama eşleşme kurulamadı = 0.** Ham kod ve temizlenmiş kod ayrı denendi, fark çıkmadı: **sistematik biçim/kanal bozukluğu YOK.** Yani motor kusursuz, **defter eksik.** ⏭ **KALAN ÜÇ PARÇA A3 SONRASINA:** ① koşum tetiği (satış girilince / rapor yüklenince) ② bağsız kalem ekranı ③ eşleşme oranı rozeti. **Defter dolmadan tetik kurmanın anlamı yok** — tetik her koşumda 1081 kez boşa arar. |
| **H11** | **Bağsız hakediş yığını büyüyor** | ⚠ Gecikme sayımı dışındaki kalem 19.08 sabahı 67, akşamı **168**. Yığın büyüdükçe sistemin "alacağım ne" sorusuna cevabı küçülüyor. K8 ile birlikte çözülür. |
| **K24** | 🕓 **Alım KDV oranı SNAPSHOT değil** | **AÇIK SINIR, beyan edildi 21.08.2026.** KDV sekmesi çalışıyor ama iki taraf farklı: **satış** oranı `SaleItem.vatRate` ile satış anında DONDURULMUŞ; **alım** oranı ürünün BUGÜNKÜ kategorisinden çözülüyor (`PurchaseItem`de oran alanı yok). Bir kategorinin oranı değişirse **geçmiş alımların KDV'si geriye dönük kayar** ve eski bir dönemin "ödenecek KDV"si bugün başka çıkar. Ekranda yazılı. **Çare:** `PurchaseItem.vatRate` snapshot alanı — şema işi, ayrı karar. ⚠ Bugün risk düşük: 18 kategorinin oranları mevzuata bağlı ve nadir değişir; ama değiştiğinde SESSİZ kayar. |
| **K18** | **Sipariş no çakışması — VERİ DÜZELTMESİ** | ✅ Kod tarafı kapandı (kök sebep: çakışma kontrolü `iptalTarihi`yi süzmüyordu; ayrıntı arşivde). ⏳ **KALAN, HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K20** | **Gecikmiş borç sayımı — ✅ [KOŞTU] 24.08.2026** | 📊 `npm run canli:k20-sayim` (salt okuma). **Damga:** döküm DONMUŞ, defter AKIYOR — sistem okuma `24.08 21:06 UTC`.<br>**TRENDYOL / AXCALI** · `01–20.08` satır 71 · brüt 71 · net 65 · **₺233.239,73** · iptal 3 · `20–24.08` satır 28 · brüt 28 · **₺72.951,00** · iptal 0<br>**HEPSİBURADA / AXCALI** · `01–20.08` satır 21 · brüt 20 · **₺76.503,00** · iptal 1 · `20–24.08` satır 2 · **₺38.268,00**<br>**N11 / AXCALI** · `01–20.08` satır 3 · **₺8.397,00** · `20–24.08` **sıfır**<br>⚖ **DÖKÜM KIYASI (yalnız TY, yalnız 01–20.08):** döküm **147 adet / ₺464.657** · bizde **71 adet / ₺233.239,73** → **FARK −76 adet / −₺231.417,27.** Yani defterde **kayıtlı olan, olması gerekenin YARISI kadar** (%48). ⚠ **20–24.08 KIYASA GİRMEZ** — o pencere hiçbir dökümle kapatılmadı; 28 satış girilmiş ama karşılığı ölçülmedi. ⚠ **HB DÖKÜMÜ 15.08'E KADARDI** → o kanalda kıyas KURULAMAZ, rakamlar yalnız sayımdır. ✅ **ÇİFT KAYIT YOK:** 121 farklı (sipariş no + barkod) ikilisi, **tekrar eden 0**. |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K31** | **İade durum makinesi — ✅ ①②③④ TESLİM 23.08.2026 (H25① hariç)** | ✅ **MODEL CANLIDA** (23.08.2026). ✅ **① SON TARİH UYARILARI TESLİM:** dört ölçülmüş sayaç ekranda ve panel çanında (müşteri kargoya versin 7g→iptal · kargo ulaşsın 10g→**otomatik onay** · onay/red 2g→otomatik onay · analiz 28g→otomatik onay). Her sayaç **sonucunu da yazıyor** — "3 gün kaldı" tek başına uyarı değil. ⚠ **ŞEMA DEĞİŞMEDİ:** K31 migration'ında açılıp **ölü duran** iki sütun kullanıldı (`otomatikOnayTarihi`, `islemSonTarihi` — ölçüldü: sıfır okuyucu, sıfır yazıcı). ⚠ **YAZILAN HER TARİH TÜRETMEDİR, ÇIPA DEĞİL:** `AuditLog`a hangi geçişte hangi kuralla hangi andan hesaplandığı yazılıyor (`IADE_SON_TARIH`, `kaynak: TURETME|PANEL`), ekranda **nötr** gösteriliyor ve _"bu tarih hesaplandı"_ diye beyan ediliyor. **Pazaryeri paneliyle ayrışırsa KAZANAN PANEL** — elle yazılabiliyor ve türetmeyi eziyor. ⚠ **2. SAYACIN ÇIPASI BİZDE DOĞMUYOR** (kargoya veren müşteri): isteğe bağlı elle giriş var, girilmezse sayaç **boş durur ve "çıpa girilmedi" der** — uydurulmaz. ⚠ **5. SAYAÇ (geri gönderim) SATIR OLARAK VAR, TARİH YOK** — birim ve başlangıç anı ölçülmedi (H25①); ölçülmemiş sayacın **sütunu da yok** ki yanlışlıkla tarih yazılamasın. ⚠ **BİLİNMEYEN ÇANA DÜŞMEZ:** kalan süresi bilinmeyen kayıt acil sayılmıyor — cevaplanamayan uyarı rozetin tamamına olan güveni götürür. Eşik sayacın kendi uzunluğuna bağlı (çeyrek, en az 1 gün) ve **sözleşme olduğu beyan edildi**, ölçüm değil. 🧪 `rma:dogrula` 311→352 · **10 mutasyon, 10'u da yakalandı**. ✅ **④ RET GEREKÇESİ + ANALİZ SONUCU TESLİM** (kullanıcı bildirdi 23.08: _"iadeye itiraz edince red sebepleri gelmiyor"_). Ölçüldü: `itirazGerekcesi` ve `analizSonucu` da **ölü sütunlardı** — sıfır okuyucu, sıfır yazıcı. İtiraz diyaloğunda **8 ret gerekçesi ZORUNLU** (pazaryeri de gerekçesiz itiraz kurdurmuyor; seçilmeden onay düğmesi basılmıyor ve sebebi ekranda yazıyor), **3 analiz sonucu SORULUYOR ama boş geçilebiliyor** (pazaryerinin zorunlu tutup tutmadığı ölçülmedi — ölçmediğimiz kuralı dayatmayız). ⚠ **BUGÜNKÜ HATANIN TEKRARI YAPISAL OLARAK ENGELLENDİ:** kabul kümesi de etiket kümesi de TEK exhaustive `Record`tan türüyor; bekçi formun sunduğu 8+3 değeri sunucuda **tek tek ÇAĞIRARAK** sınıyor. Boş ile tanınmayan **ayrı mesaj** veriyor. ⚠ Gerekçe **para tarafını belirliyor** (docs §5): `DEGISIM` seçilirse kargo her kanalda satıcıya ait, satıcı haklı bulunduğunda TY yansıtmıyor. Seçilen gerekçe **listede görünüyor** — yazılıp görünmeyen alan yazılmamış gibidir. 🧪 `rma:dogrula` 352→376 · **10 mutasyon, 10'u da yakalandı** (biri önce yeşil kaldı: ölçüt varlığa bakıyordu, yokluğa değil). ✅ **② KARGOLANACAK KUTUSU:** `ITIRAZ_KABUL`de ürün BİZDE ve geri gönderilecek — bu fiziksel iş hiçbir yerde görünmüyordu. Kural **TÜRETİLDİ, yeni durum/alan AÇILMADI**: kargo kodu boş → *gönderime hazır*, dolu → *kargoda* (HB'nin iki sekmesinin türetildiği yöntemin aynısı). `iadeKargoKodu` da **ölü sütundu** — üçüncü çift; artık ekrandan yazılıyor. ⚠ Kutu **50'lik listeden türetilmiyor, AYRI sorgudan** besleniyor: süzülmüş listeden süzseydik 51. sıradaki iş sessizce görünmezdi (15.08 tuzağı). ⚠ **İki hâl de NÖTR** — "gönderime hazır" bir gecikme değil sıradaki adım; pazaryeri kodu henüz atamamış olabilir. ✅ **③ ASKIDA ARIZA KUTUSU:** boş olması beklenen yer, boşken de yazıyor (**açık sıfır**), doluysa sayı kırmızı. `KARGOYA_VERILDI` düğmesi zaten vardı ve **atlanabilir** olduğu bekçiyle sabitlendi (HB'de bu aşama yok — zorunlu olsaydı her HB iadesinde fazladan tık). 🧪 `rma:dogrula` 376→396 · **10 mutasyon, 10'u da yakalandı** (biri önce yeşil kaldı: dilim, aranan `className`'in ÖNÜNDEN değil ARDINDAN kesiliyordu). ⏳ **TEK KALAN: H25① — beşinci sayacın birimi/çıpası** (N11 deneyimi yok, süresiz). |
| **K32** | **HB "Hurda Geliri" — hakedişte karşılığı yok** | ⛔ **ÖLÇÜLMEDİ, AÇILMADI.** HB'de servis dalı Trendyol'dan farklı bitiyor: HB servisi beklemeden müşteriye parayı iade eder, satıcı tazmin talebi açar, kabul edilirse **HB'ye fatura keser**, ürün HB deposuna gider ve tutar hakedişe **"Hurda Geliri"** olarak düşer. İki eksik: ① iadenin `Compensation` kaydına bağlanması ② hakedişte bu GELİR kaleminin tanınması. ⚠ **Açılış şartı:** hurda gelirinin hakediş dosyasında hangi satır adıyla geldiğinin görülmesi — ölçmeden kalem açmak adını uydurmak olur. |
| **K34a** | **Uyarısız okuma — ✅ TESLİM 23.08.2026** | 📷 `/okut` — barkodu okut, sistem o barkod hakkında ne bildiğini söyler. **UYARI YOK · ONAY KAPISI YOK · İSTİSNA KAYDI YOK · hiçbir şey engellenmez** (bekçi bunu koşulur hâlde tutuyor: ekranda `destructive`/`AlertDialog`/`required` yasak). ⚠ **ŞEMA DEĞİŞMEDİ** — merdiven birinci basamakta durdu: iz `AuditLog`ta yaşıyor (`action` → kova, indeksli; `createdAt` → hafta, indeksli; `targetType/targetId` → varyant; `detail` → yapılandırılmış JSON; `userId` → kim okuttu). Migration · canlı koşum · damga bedeli hiç doğmadı (K2 vakasıyla aynı karar). ⚠ **DÖRT KOVA** (`ACIK_SIPARISTE_VAR` · `ACIK_SIPARISTE_YOK` · `ESLESTIRILDI` · `BILINMEYEN`) ve bu bir DENETİM ÇERÇEVESİDİR: temiz · sapan · sapan · **incelenemedi**. `BILINMEYEN` bir bulgu DEĞİL — ekranda da öyle yazıyor. Tek "bulunamadı" rakamı basılmıyor. ⚠ **ÜÇÜNCÜ KOVANIN ADI EYLEMDİR, HÜKÜM DEĞİL** (mimar düzeltmesi): `BASKA_BARKOD` → `ESLESTIRILDI`. Kullanıcının yaptığı şey eşleştirme; kodun NİYE tutmadığı (ürünün barkodu farklı · kayıtta EAN yanlış · parti farklı geldi) üç ayrı işe yol açar ve SORULMUYOR. **`sebep` alanı açıldı ve boş** — vaka birikince desen kendisi çıkacak; alan şimdi açıldı ki o gün göç "yeniden yazım" olmasın. ⚠ **"Biliyorsan göster" bir KAPI DEĞİL:** isteğe bağlı, atlanabilir, metinde de öyle yazıyor; gösterilirse `BILINMEYEN` → `ESLESTIRILDI`. ⚠ **DÖRT ALANDA ARANIYOR** (ortak `kodKosulu`): EAN · Firma SKU · sistem SKU · Kanal SKU — ve **hangisinde bulduğu yazıyor**; çakışmada sıra sabit (barkod kazanır). 🕐 **Saat dilimi**: `createdAt` bir AN, iş günü UTC gece yarısı — hafta kovalaması İstanbul takvim gününe çevrilerek yapılıyor, yoksa gece 00:00–03:00 okumaları bir önceki haftaya düşerdi. ⚠ **MENÜ: "Ürün ve kanal" grubunda, günlük listede DEĞİL** — hep açık liste kullanıcının onayladığı 7 satır (22.08.2026) ve eşiği kendi işime uyduramam. **Sıklığa göre günlük listeye ait** (paket başına ≥1, ~30/gün → hedef 150): takas kullanıcıya soruldu, karar gelirse tek satır. 🧪 `okuma:dogrula` (52 kontrol) + **9 mutasyon, 9'u da yakalandı**. ⏭ Bir hafta sonra kova dağılımı K34'ün ve K35'in gerekçesini üretecek. |
| **K26** | 🧹 **`scripts/kart-dogrula.ts` HİÇ koşmuyor** | **ÖLÇÜLDÜ 21.08.2026.** 12 KB'lık "KART BORCU DOĞRULAMA" dosyası; kendi başlığında _"Çalıştırma: `npm run kart:dogrula`"_ yazıyor **ama o komut başka bir dosyayı koşuyor** (`urun-karti-dogrula.ts` — ürün kartı). İki farklı şey "kart" adını taşıyor ve biri sessizce yetim kalmış. Kart borcu tarafı `kart-odeme:dogrula` (121 kontrol) ile kısmen kapanıyor. **Karar:** ya npm girdisi açılır ya dosya silinir — ikisinden biri, ama _"duruyor"_ üçüncü seçenek değil. |
| **K13c** | **HB'de zararına duran 6 ürün** | 🕓 Bugünkü fiyat + açık parti maliyetiyle NET-2 **negatif**: Philips 5000 10in1 (−46,11) · LEGO 101 Dalmaçyalı (−301,77) · LEGO Endgame (−289,07) · Hogwarts (−25,68) · LEGO "Yukarı Bak" (−291,92) · Hot Wheels Rhino (−58,13). **Fiyat mı yanlış maliyet mi — önce bakılır**, düzeltilmez. |
| **H12/H13** | **Hakediş teyidinde önce bakılacak satışlar** | `11331575354` (i9000 Ultra · 17.06 · **₺12.960** · oran %2,70 · "iade var" rozetli) — **tek başına üçlüden büyük.** Ayrıca `11493262226` · `11492798173` · `11492628481`. |
| **H14** | **Ödeme hizmeti hipotezi** | H2/K8 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı. |
| **H4** | **Philips kanal düzeltmesi — kalan yarısı** | Kanal taşıması ✓ (Halil yaptı). ⛔ **Oran düzeltmesi İPTAL — `%2,70` DOĞRU** (TY fiyat indirimi karşılığı komisyon indiriyor; `~₺721` tahmini geçersiz). Kalan: kanal-değişince-kâr-tazelenir düzeltmesi canlıya çıkınca doğrulanacak. |

---

## 🕓 ZAMANA / KOŞULA BAĞLI — bugün açılmaz

| # | İş | Açılış şartı |
|---|---|---|
| **H20** | **`soldAt` saat taşımıyor** | 🕓 **VERİ GELDİ, KARAR AÇIK.** TY sipariş dökümü saat taşıyor (144/144) ve K9'un iki sınır kalemi çözüldü (`11475234462` → 04.08 17:04 · `11518039572` → 18.08 20:58; ikisi de 08:00 sonrası → yeni pencere). **Şemaya saat ALINMADI.** Açılış: içe aktarma yazıldığında saat de alınsın mı — ayrı karar.<br>🔎 **CEVAP VERİDEN GELDİ 24.08.2026:** TY API'sinde `orderDate` **epoch milisaniye, GMT+3** — yani saat **var ve API veriyor**. Karar artık teorik değil; A3 yazılırken saat alınacak mı, o an belli olur. |
| **K6** | **Eşik yeniden ölçümü** | Satış kalemi **200'ü geçince.** `veri-supheli.ts` eşikleri n=40 tabanından çıktı (p95 %154, p5 %44,8). Araç: `canli:bekleme-olcum`. _Eşik kaynağıyla anılır; taban büyüyünce kaynak eskir._ |
| **K7** | **`satis.veri.dogrula` ayrı izni** | **Faz 4 / RBAC.** Bugün `satis.duzenle` istiyor. Ayrı izin daha temiz ama iki bacaklı yetki işi doğurur ve tek kullanıcıda boş katmandır. |
| **K10** | **Pano kodu ataması elle — 🔺 ÜÇÜNCÜ KEZ ÇAKIŞTI** | 🧹 Kodlar elle veriliyor. 20.08'de **iki satır da `H6`** oldu; **24.08'de iki satır da `K42`** oldu (biri fire zararı, biri yönlendirmeli paketleme — ikincisi `K46`ya alındı). ⚠ **ÇAKIŞMAYI MİMAR DEĞİL UYGULAYAN ÜRETTİ:** komutta verilen kodu **kullanılmakta mı diye bakmadan** yazdım. Kod verilmiş olması onu boş yapmıyor. Çare değişmedi: en büyük numaranın bir fazlası — betik ya da tek kaynaklı sayaç. Elle atama üçüncü kez tutmadı; **bu artık bir tercih değil, ölçülmüş bir kusur.** |
| **K34** | **Sevkiyat doğrulaması — KİLİTLİ** | 📦 Depoda paketlerken barkod okutulur; sistem **kargoya verilmemiş** siparişler arasında arar, bulamazsa **uyarır**. Depo kuralı geçerli: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_ **İş değeri:** yanlış ürün göndermenin maliyeti = iade + iki kargo + ceza + itibar; entegratörler bunu ayrı paket olarak satıyor, bizde bu kontrol hiç yok. ⛔ **AÇILIŞ ŞARTI: AĞUSTOS DEFTERİNİN KAPANMASI.** Kontrol "kargoya verilmemiş siparişler" kümesinde arıyor ve o kümenin **%73,4'ü sistemde yok** (TY `01.08–20.08`: kanal 143, bizde 38 — araç `canli:eksik-siparis`; HB'de oran **%88,2**). Doğru ürün paketlenirken sistem "bulamadım" diyecek; sebep yanlış ürün değil, **satışın hiç girilmemiş olması.** Uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı her seferinde elle onaylar ve iki hafta içinde **uyarıyı okumadan tıklamayı öğrenir** — o noktada mekanizma yanmıştır, gerçek bir yanlış üründe de aynı tıkla geçilir. **YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR.** ⛔ **ÖLÇÜLMEMİŞ DÖRT ŞEY** (kural yazılmayacak): ① barkod hangi kayda bakacak — EAN mi, Firma SKU mu, Kanal SKU mu? Halil'den depo etiketi fotoğrafı bekleniyor. ⚠ **Tek alana bağlanmayacak:** üçünde de aransın ve **hangisinde bulduğunu SÖYLESİN** — Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ② çok satırlı siparişte "bu kalemi okuttum" izi yok (bugün yalnız `shippedAt: null`). ③ elle onayın izi nereye — `AuditLog` mu, satışa alan mı? Şema merdiveni: önce ucuzu ölçülür. ④ defter eksik (yukarıdaki şart). |
| **K35** | **Firma etiketi basımı — KİLİTLİ** | 🏷 Firma SKU barkoda çevrilir, etiket basılır; ürünün üstünde İKİ barkod olur (EAN üreticinin, Firma SKU bizim). Sistemde bugün barkod **ÜRETİMİ/BASIMI YOK** — yalnız okuma var. ⛔ **AÇILIŞ ŞARTI: yazıcı ve etiket kararı.** Etiket boyutu bilinmeden basım ekranı tasarlamak, ölçmeden kural yazmaktır. Ölçülecek: boyut · yazıcı türü (termal/lazer) · SKU'ların Code128 uygunluğu. ⚠ **GEREKÇE DÜZELTİLDİ 23.08.2026 — ÖLÇÜMLE.** Mimarın gerekçesi şuydu: _"EAN ürünü tanımlar, hangi MALI elde tuttuğunu tanımlamaz; Firma SKU o boşluğu kapatır."_ **Şemada karşılığı yok:** `sku` · `barcode` · `companySku` **üçü de varyant başına ve `@unique`**; FIFO partisi `StockMovement`ta ve **hiçbir etiket partiyi tanımlamıyor** — motor en eski açık partiyi kendi seçiyor. Firma SKU okutmak da "bu mal" demez. ⚠ **İKİNCİ GEREKÇE DE ÖLÇÜMLE DÜŞTÜ:** "EAN'ı olmayan ürün" — canlıda **1086 aktif varyantın 1085'inde EAN var** (%99,9); tek istisnada stok yok. Firma SKU'su boş olan: **0**. ✅ **AYAKTA KALAN TEK GEREKÇE:** kullanıcı beyanı — _"istisna birkaç üründe EAN farklı olabilir"_ (pakettekiyle kayıtlı olan tutmuyor). **Bu bizim defterimizden ölçülemez** çünkü fark ancak okutunca görünür. ⭐ **K34a tam bunu ölçüyor** — bir hafta paketlerken kaç EAN tutmadığı sayılırsa K35'in iş değeri rakama döner. Yani K35'in gerekçesi K34a'nın çıktısıdır. ⚠ **ÜÇ ALANDA ARANACAK** (bu kural ayakta): EAN · Firma SKU · Kanal SKU — ve **hangisinde bulduğu SÖYLENECEK**. Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ⚠ **YENİ RİSK SINIFI — VE BU GEREKÇE SAĞLAM:** bugüne kadar bütün kimlikler DIŞARIDAN geldi (EAN üreticiden, Kanal SKU pazaryerinden). Basımla birlikte **ilk kez kimlik ÜRETEN taraf biz oluyoruz.** Yanlış basılmış etiket, yanlış girilmiş satırdan KALICIDIR: satır düzeltilir, etiket kutunun üstünde depoda durur ve altı ay sonra okutulur. Kapsama baştan girenler: ① **basılan her etiketin izi** (hangi SKU · ne zaman · kaç adet) — iki kez basılmış kod ya da hiç basılmamış SKU ancak bu izle bulunur; ② **yeniden basım TEKİL** — aynı SKU'nun ikinci etiketi AYNI kodu taşır, yeni kod üretmez. Bu koda gömülecek kural değil, açıkça verilmiş karardır. |
| **K36a** | **Değişim MAL maliyeti satışın NET'ine — ✅ [KOŞTU] 23.08.2026** | 💱 **Mimar kararı 23.08.2026:** değişimde giden ürünün **FIFO maliyeti + kargosu** o **SATIŞIN** NET'ine yazılır; iadenin NET'inde bırakılmaz. _Gerekçe: değişim o satışı kurtarmanın bedelidir; ayrı cebe konursa satış kârlı görünür, değildir._ ⚠ **HURDADAN FARKI AÇIKÇA KONDU:** hurdada satış ÖLDÜ (dönem kalemi), değişimde satış YAŞIYOR (satışın maliyeti). ⚠ **BUGÜN BÖYLE DEĞİL — ÖLÇÜLDÜ:** `EXCHANGE_OUT` hareketi yalnız `returnItemId` taşıyor ve para `iade.ts`te _"Değişim: yerine giden ürünün maliyeti"_ satırıyla **iadenin** `net2Amount`'ına yazılıyor. Satışın NET'i yalnız `saleItemId` taşıyan hareketlerden hesaplanıyor (`kalemMaliyeti`, tip bakmaz). ⚠ **İKİ YOL BİRDEN değişecek** (form yolu + yeni düğme) yoksa aynı fiziksel olay iki farklı cebe yazılır ve üç ay sonra karşılaştırılamaz. ⚠ **ÇİFT SAYIM TUZAĞI:** harekete `saleItemId` eklenirse `degisimMaliyeti` satırı iadeden KALDIRILMALI — yoksa aynı lira iki kez. 📌 Kapsam: canlıda bugün **1** `EXCHANGE_OUT` hareketi var; değişen kural mevcut kâr damgalarını bayatlatır, yeniden hesap gerekir. |
| **K41** | **`11473322212` iade tipi — ✅ ÇÖZÜLDÜ 24.08.2026** | ✅ **CEVAP AXCALI'DAN GELDİ:** _"Değişim oldu, para bizde kaldı, yeni ürün gönderildi, hasarlı ürün çöp oldu."_ İade **para iadesi** gibi hesaplanmıştı; **değişime** çevrildi. **ÖNCE:** `KAYIP_GELIR −2.980` · `KOMISYON_IADE +439,55` · `STOPAJ_IADE +24,83` · NET-2 **−377,38**. **SONRA:** ciro ve komisyon DURUYOR, yalnız `MALIYET_GERI +1.799` ve `IADE_KARGO −101` kaldı · NET-2 **+1.714,83**. Fark **+2.092,21**. ⚠ **KÖK NEDEN ZİNCİRİ, ÜÇÜ DE AYNI GÜN BULUNDU:** ① iade formunun ön-doldurması GEREKÇEYE bağlıydı, müşteri sebebi `HASARLI` olduğu için ayrılan değişim ürünü forma hiç taşınmadı; ② motor değişimi tek satırdan anlıyor (`degisimMi = kalem.degisimMaliyeti !== null`), alan boş gelince `false`; ③ iade para iadesi gibi hesaplandı. Üçü de düzeltildi (ön-dolu artık VERİYE bakıyor). ⚠ **SNAPSHOT DOKUNULMAZLIĞI BURAYA UYMADI VE SEBEBİ YAZILDI:** o ilke DOĞRU koşullarla hesaplanmış damgayı korur; bu damga YANLIŞ GİRDİYLE hesaplanmıştı, korunacak olan geçmiş değil hatanın kendisiydi. ⚠ **`MALIYET_GERI` KALDI VE DOĞRU:** eski mal fiziken döndü, maliyeti geri geldi; sonra K38 ile hurdaya düşüp kayıp DÖNEM tarafına yazıldı (fire zararı ₺1.799). Aynı lira iki kez düşmüyor. 📌 Ledger'a dokunulmadı: yalnız kesinti dökümü (fotoğraf) ve NET damgası yeniden yazıldı; iz `AuditLog`ta önceki/yeni değerlerle. |
| **K42** | **Fire zararı düzeltme trafiğini kayıp sayıyor — [ÖLÇÜLDÜ, KARAR BEKLİYOR]** | 🔥 **MERDİVEN İNİLDİ 24.08.2026 ve UCUZ ÇÖZÜM ÇÜRÜDÜ.** **ÖLÇÜM:** ağustos fire zararı ₺15.951,36 · kazanç ₺13.475,20 · net **−2.476**. Eşleşen çift **4 tane, ₺13.475 — zararın %84,5'i**. Gerçek kayıp yalnız iki harekette: `Fire` ₺650 + `Hasar/kırılma` ₺1.799 ≈ **₺2.449**. **BASAMAK 1 DENENDİ:** elle düzeltme neden seçmeyi ZORUNLU tutuyor (`duzeltme-actions.ts`), sistem yazıcıları (`iptal-geri-alma`, `satis-duzenleme`) hiç neden vermiyor → _"fire zararı = BEYAN EDİLMİŞ kayıp"_ ölçütü mevcut alanla (`adjustmentReasonId`) kurulabiliyor, şema açılmıyor. ⚠ **AMA ÖLÇÜM ONU ÇÜRÜTTÜ:** süzgeçle zarar 9.926 · kazanç 11.076 · net **+1.150** — görünen net gerçeğe (−2.449) YAKLAŞMIYOR, UZAKLAŞIYOR. Sebep: sistem aynaları ASİMETRİK (zarar 6.025 ↔ kazanç 2.399), çünkü iptalin `+` tarafı `SALE_CANCEL_IN` fire süzgecinde HİÇ YOK, geri almanın `−` tarafı VAR. **Tek yönlü sızıntı.** ⚠ **VE ASIL GÜRÜLTÜ KALIYOR:** kalan ₺9.926 zararın ₺7.198'i KULLANICI GİRDİSİ bir çift (`OYU-LG-598P-01`: _"mükerrer kayıt"_ ↔ _"Sayım farkı"_) ve **hiçbir alan bu ikisini "aynı olay" diye işaretlemiyor.** Veriden ayırt edilemez. 💡 **İKİ AYRI İŞ, İKİ AYRI KARAR:** ① **tek yönlü sızıntı** — `SALE_CANCEL_IN`in `+` tarafı sayılmadığı hâlde geri almanın `−` tarafı sayılıyor; bu bir DOĞRULUK hatası, ayrı düzeltilebilir. ② **düzeltme mi kayıp mı** — nedenlere bir ayrım gerekir (`StockAdjustmentReason`e bayrak = **şema, basamak 4**) ya da rakam olduğu gibi bırakılıp ekranda kayıp/kazanç/net ÜÇÜ BİRDEN okunur yapılır. ⛔ **HİÇBİRİ UYGULANMADI** — ölçüm, ucuz çözümün işe yaramadığını gösterdi; yarım düzeltme görünen rakamı daha yanlış yapardı. |
| **K43** | **Yedi liste ekranı sütun tavanının üstünde — [AÇIK]** | 📐 **ÖLÇÜLDÜ 23.08.2026.** `yerlesim:dogrula` liste tablolarında **7 sütun tavanı** tutuyor ama ölçütü **elle tutulan üç dosyaydı**; `src/app` altında `<TableHeader>` taşıyan **20 sayfa** var ve **YEDİSİ tavanın üstünde**: `iadeler` **9** · `stok` · `kartlar` · `giderler` · `envanter-degeri` · `ayarlar/kanallar` · `alimlar/[id]` **8**. ⚠ **HÜKÜM DEĞİL, SORU.** Tavan (7) o üç ekranın İÇERİK genişliğine göre ölçüldü (_"~1045px'e sığıyor, 8. sütun taşırıyor"_). Sütunları dar olan bir ekran (rozet · ikon · kısa sayı) sekizle de sığabilir. Gerçek ölçüt piksel genişliği ve o **tarayıcı ister** — projede otomasyon yok (karar 08.08.2026). Yani sayı bir **VEKİLDİR** ve vekil, ölçüldüğü kümenin dışına uygulanamaz. ⚠ **BU YÜZDEN ÖLÇÜT KÖRLEMESİNE TERSİNE ÇEVRİLMEDİ:** hepsine uygulamak yedi ekranı birden **uydurma kırmızıyla** yakardı. `/kanal-sku` listeye eklendi (aynı şekilde metin ağırlıklı, tam 7 sütun). ⛔ **AÇILIŞ ŞARTI: gerçek cihazda bakış.** Halil dar viewport'ta yedi ekranı açıp yatay kaydırma çubuğu çıkıyor mu diye bakar; çıkanlar `iki-satir.tsx` ile daraltılır, çıkmayanlar için tavan o ekran sınıfına göre yeniden ölçülür. |
| **K36b** | **Değişim kargosu — ✅ [KOŞTU] 24.08.2026, ŞEMA GEREKMEDİ** | 🚚 **KAPANDI.** Kalem _"kargo yanlış cebe yazılıyor"_ diye açılmıştı; ölçüm gösterdi ki kargo **hiçbir cebe yazılamıyordu** — alan (`Return.reshipCargoAmount`) ŞEMADA VARDI ama **iki kapıyla** birden kapalıydı: ① blok yalnız `returnType === DISPUTED` iken çiziliyordu (o iade NORMAL'di), ② input `disputedReshipPaidBySeller` false ise DISABLED'dı (TY'de false). ⚠ **BAYRAK YANLIŞ DEĞİL, KAPSAMININ DIŞINA UYGULANIYORDU** — şemadaki tanımı _"itirazlı iadede AYNI ürün müşteriye geri gönderilirken"_; değişimde giden YENİ bir üründür ve şema zaten _"değişimde her zaman satıcıda"_ diyordu. Ölçüt artık **"müşteriye mal çıkıyor mu"**; politika **kilit değil ipucu**. ✅ **VAKA KAPATILDI:** `11473322212`ye kanal belgesinden `₺174,32` yazıldı (`Değişim Gönderisi · 8 desi · ARAS`), iade NET-1 `1.698,00 → 1.523,68` · NET-2 `1.714,83 → 1.569,57`. Betik idempotent, iz `AuditLog`ta belgesiyle. ⚠ **ÇİFT SAYIM VE SIFIR SAYIM BİRLİKTE SINANDI:** `141,42 + 174,32 = 315,74` = TY panelindeki Kargo sütunu birebir; korkulan çift sayım değil, **ters yüzü** gerçekleşmişti — bacak hiç yazılmamıştı. 🧪 `rma:dogrula` 495→507 · 7 mutasyon, 7'si yakalandı. ⏭ **AÇIK KALAN (K36b'nin asıl sorusu):** kargo hâlâ İADENİN NET'inde; K36a kuralına göre SATIŞIN NET'ine mi gitmeli? Bu bir **atıf** sorusu, "kaydedilebiliyor mu" sorusu değil — ayrı karar. |
| **K37** | **Değişim ürünü gönderildi düğmesi — ✅ [KOŞTU] 23.08.2026** | 🔘 Bildirim satırında düğme: `EXCHANGE_OUT` hareketini **FIFO'dan doğrudan** yazar, iade formuna hiç uğramaz. ⚠ **NİYE GEREKLİ — ÖLÇÜLDÜ:** `11473322212` satışının 1 adedi zaten iade edilmiş, form _"Tamamı iade edildi"_ diyerek kapanıyor; oysa gönderilen değişim ürünü bir **iade değil bir ÇIKIŞ**. Kalan iade hakkı, iadeyle ilgisi olmayan bir stok çıkışını engelliyor. Hareket **bağlı** doğar (satış + bildirim) ve maliyeti K36 kuralıyla satışın NET'ine gider. 📌 İlk vaka: `11473322212`'nin açık `ITIRAZ_KABUL` bildirimi, 1 × `axcali1610` → stok **12 → 11** beklenir. |
| **K38** | **Hurda zararı — ✅ [KOŞTU] 23.08.2026** | 🗑 **Halil hükmü 23.08.2026:** `11473322212`'den dönen kırık `axcali1672` **çöp** — satılabilir stoktan düşülür. ⚠ **VAKA NASIL DOĞDU:** iade işlenirken form `1 sağlam` diye ön-dolu geliyordu (o hata bugün düzeltildi) ve kırık mal **stoğa girdi**: `RETURN_IN +1 × ₺1799`, ledger stoğu **1**. ✅ **KÂR TARAFI ÖLÇÜLDÜ — CEVAP (a)'ya YAKIN:** rapor **zaten** _fire zararı_ tutuyor (`ADJUSTMENT`+`COUNT_CORRECTION`, **FIFO maliyetiyle**, kayıp ve kazanç AYRI, **dönem** tarafında — satışın NET'ine değil). Yani istenen tasarımın çoğu kurulu. ⚠ **AMA BİR İSTİSNASI TAM BURAYA ÇARPIYOR:** `returnItemId` dolu hareketler fire toplamından **bilerek dışlanıyor** (çift sayım koruması; canlıda 08.2026'da net etki −1.327,99 ölçülmüş). Hurdayı iadeye bağlasaydık **hiçbir yere** yazılmayacaktı. **KARAR (mimar, 23.08):** hareket `returnItemId`**siz** yazılır → fire zararına girer; bağ **`AuditLog`'da YAPILANDIRILMIŞ (JSON)** durur: satış no + bildirim id + _"Halil hükmü 23.08: çöp"_. Serbest metin `note` tek başına yetmez — üç ay sonra aranamaz. 📌 Neden zaten var: _"Hasar / kırılma"_ (`ADJUSTMENT`, `EKSI`). Şema açılmıyor. Beklenen: `axcali1672` **1 → 0**. |
| **K39** | **Kapanmış bildirim iptal edilebilsin — ✅ [KOŞTU] 24.08.2026** | ✅ **TESLİM.** `KAPANDI → IPTAL` geçişi açıldı; ekranda gerekçe zorunlu diyalog (`en az 10 karakter`), iz `AuditLog`ta **önceki durum + gerekçe + kim** ile. ⚠ **SESSİZ YAN ETKİ YAKALANDI VE KAPATILDI:** `kapaliMi` eskiden _"ileri geçişi kalmamış"_ diye TÜRETİLİYORDU ve bu tesadüfen doğruydu. `KAPANDI`ya çıkış eklenince türetme bozulacaktı — `kapaliMi("KAPANDI")` **false** dönerdi ve iki şey birden sessizce yanlış çalışırdı: ① panel çanı kapanmış HER bildirimi "bekleyen iş" sayardı, ② `durumDegistir`in kapalı-bildirim kapısı açılırdı. Ölçüt artık AÇIKÇA yazılı (`UC_DURUMLAR`): kapalı olmak, çıkışı olmamak değildir. ⚠ **ÖLÇÜT "HANGİ VERİYİ BOZAR":** `returnId` doluysa arkasında işlenmiş iade var — iptal onu SAHİPSİZ bırakırdı (iade yaşar, doğuran bildirim "hiç olmadı" der). Bu kayıtlarda düğme **hiç çizilmiyor** ve sunucu ayrıca reddediyor. ⚠ **"TEST" İŞARETİ KONMADI** (mimar kararı): ikinci doğruluk kanalı yok, durum tek dil. ⚠ **İPTAL PARAYA VE STOĞA DOKUNMAZ** — bekçi bunu koşulur hâlde tutuyor (`stockMovement` ve `satisKarTazele` yasak). 📌 **SAYIM AŞILDI:** pano _"3 aday"_ diyordu; o rakam yalnız `11473322212`nin bildirimlerini sayıyordu. **Tüm defterde ölçüm (`npm run canli:k39-adaylar`): 19 bildirim · 11 KAPANDI · 8 IPTAL · aday 8 · korunan 3** (`11502693455` · `11471381662` · `11473322212`). Geçerli olan **8**. ⚠ Adaylardan biri (`11504122276`, 14.08 10:59) **1 adet ayrılmış** taşıyor — iptal ayırmayı düşürür, bakılsın. 🧪 `rma:dogrula` 464→495 · **22 mutasyon, 22'si de yakalandı.** |
| **K40** | **Hasarlı iadede tazmin sorusu geç kalıyor — ⏸ YARIN (iade paketi)** | ⏱ Tazmin sorusu iade **İŞLENMEDEN** sorulmalı; işlendikten sonra geç kalınıyor — bu vakada kaçtı (`11473322212`, kırık `axcali1672` stoğa girdi, tazmin hiç açılmadı). K31 ekranına ileride hatırlatma satırı olabilir. ⛔ **BUGÜN DEĞİL** — mimar açıkça iş açmadı, kalem yalnız kaydedildi ki unutulmasın. |
| **K14t** | **TUZAK: hesap ADLA bulunuyor** | `panel.ts:251`. **Bugün güvenli** (arama kanal içinde, tek kanalda çakışan ad yok). **Açılış: tek bir kanala harf farkıyla ikinci hesap açılması** — MySQL harf duyarsız karşılaştırması o an ikisini birleştirir. |
| **K14c** | **Sessiz desen: kanal adına gömülü sözlük** | `canli-komisyon-envanter.ts:55`. Eşleşmezse **sessizce boş** döner ve boş dönüşü **makul görünür**. Düzeltilmiyor (iş değeri yok). **Açılış: kanal adının düzenlenmesi.** |

---

## 📌 Ölçüm kayıtları — iş değil, gerekçe

Bunlar kapanmış ölçümlerin **bugün geçerli** özetleri; ayrıntı arşivde.

- **PWA Halil testi (22.08.2026, gerçek cihaz — Android, canlı adres):**
  **8/8 geçti.** İlk turda 7 madde ölçüldü, madde 4 (iPhone) cihaz yoktu;
  aynı gün iPhone bulundu ve **sorunsuz** geçti. Ölçülenler:
  kurulum teklifi çıktı · simge ve adres çubuksuz açılış ✓ · sistem çubuğu
  temayla döndü ✓ · uçak modunda **rakam değil "Bağlantı yok"** çıktı ✓ ·
  bağlantı gelince panel açıldı ✓ · el kitabında bölüm ✓ · **bilgisayardan
  değiştirilen satış telefonda yenileyince YENİ rakamla geldi ✓** — yani
  önbellek veriye dokunmuyor, tasarım sahada doğrulandı.
- **Eksik sipariş (22.08.2026, iki kanal, salt okuma):** TY `01.08–20.08` → 143 sipariş, bizde 38, **eksik 105** · HB `03.08–15.08` → 51 sipariş, bizde 6, **eksik 45**. Okunamayan satır **0/0**. Araç: `npm run canli:eksik-siparis -- "<dosya>"`. ⚠ HB dosyasında adresler tırnak içinde SATIR SONU taşıyor: naif ayrıştırma 62 ham satırı 62 kayıt sanıp "9 okunamadı" diye **olmayan bir eksiklik uydurmuştu**; doğru ayrıştırmayla 51 kayıt, 0 okunamayan.
- **N11 (fatura, 22.08.2026):** komisyon faturasındaki 3 siparişin **üçü de sistemde yok** (`218135584424` · `218277164422` · `231686994420`). Temmuzda 60 alım kaydına karşı **1 satış**; temmuzda stok düzeltmesi **0**, yani girmek çift düşme yaratmaz.
- **Hakediş örtüşmesi (24.08.2026, salt okuma — `npm run canli:hakedis-ortusme`):** 1136 kalem · **385 farklı sipariş no** · sistemde 121 satış · **kesişim 5**. Sipariş no BOŞ olan kalem 47. Biçim **uyuşuyor** (hakediş 10hane×129 + 11hane×256; satış 10hane×20 + 11hane×92 + 12hane×7). Vade ufku `08.07 → 03.09`, satış ufku `17.06 → 24.08` — **dönemler örtüşüyor.** ⚠ Yani `0`a yakın eşleşme bir gecikme değil, **kapsam boşluğu**: eksik olan kanalın satırı değil bizim siparişimiz. _Bu ölçüm H3'ün "~20.09'a kadar bekle" gerekçesini düşürdü._
- **Kapsam (en güçlü):** TY sipariş dökümü `01.08–20.08` → **143 sipariş, bizde 38, eksik 105.** Sipariş numarasıyla eşleştirildi.
- **Kapsam (tarife raporu):** geçerli olan **geniş** dosya `…19_04_51.xlsx` (97 satır, `30.06–21.08`) → rapor 227 adet, bizde 9, ciro **₺747.024** (`Toplam Tarifeli Brüt Ciro`, **KDV dahil** — ölçüldü, en büyük sapma %0,29). **Aşıldı:** dar dosya `…18_40_30.xlsx` → 72/8.
- **Oran denetimi:** **sapma 0** — _"~₺18.000 eksik kâr"_ tahmini çürüdü.
- **Aylık:** haziran 1 satır (net 0) · temmuz 1 satır (net 0) · ağustos 38 satır. **Ağustostan önce net sıfır TY satışı.**
- **Hesap:** TY'nin tek satış hesabı **AXCALI** (`externalId = 870249`, rapor dosyasının satıcı kimliği). `s.ahmet` ve `SEDA` **alım** hesapları, sıfır satış → kapsam karışmıyor.
- **`HIZMET_BEDELI` ₺12,60'ın payı:** fiyatın **binde 3'ü**, marjın **onda biri** (NET-2'ye oranla A max %5,54 · B max %15,18).
- **Buy box verisi (ölçüldü 21.08.2026, gerçek dosyalar):** Trendyol ürün
  listesinde **`BuyBox Fiyatı` kolonu VAR** — 1581 satırın 189'unda dolu ve
  o 189, `Durum` alanı temiz olan **canlı listelerin tamamı** (kalan 1392'nin
  hepsinde bir sorun var: 790 "stok girin", 373 "fiyat girin", 136 orijinallik
  şüphesi, 40 arşiv). Barkod **189/189** dolu → kimlikle eşleşir.
  **Hepsiburada fiyat VERMİYOR**, yalnız sıra veriyor (`Buybox Sırası`:
  1. sırada 1071 · 2-3'te 515 · 4+'ta 565). N11 dosyası elde yok, ölçülmedi.
  ⛔ **OTOMASYON BİLEREK AÇILMADI** — kullanıcı kararı 21.08.2026:
  _"buybox fiyatlarını manuel gireceğim, ürün arama sırasında anlık takip
  ediyorum; otomasyona ihtiyacım şu an yok."_ `ChannelSku`'ya sütun eklemek
  ve dosyadan doldurmak **teknik olarak hazır**; açılış şartı kullanıcının
  elle takibi yetersiz bulması. _Bu kalem yeniden açılana kadar iş değildir._
- **Fiyat farkı (aynı dosya):** bizim TY fiyatımız buy box'a göre ortanca
  **+%24,1** (p25 +5,6 · p75 +47,1 · max +177,2); **170/189 listede buy
  box'ın ÜSTÜNDEYİZ.** Kasıtlı mı bayat mı — sorulmadı.
- **Bekçi taraması (21.08.2026, hepsi koşturuldu):** 36 `dogrula` betiğinden
  **34'ü yeşil**, ikisi kırmızı (`yerlesim` → K23 · `yedek` → K25). Bütün
  bekçiler çıkış kodu üretiyor — sorun kodda değil, **koşulmuyor olmasında**.
  Her teslimde rutin olarak koşulan: `simulasyon · kar · panel · i18n · lint ·
  tsc · build` = **7 tanesi**. Kalan 29'u yalnız dokunulan alana göre
  koşuluyordu; `yedek:dogrula`nın kırmızısı bu yüzden görünmemişti.
  _Yetim dosya: `kart-dogrula.ts` (K26), npm girdisi yok._
- **Ölçüm anı:** rapor tarafı **donmuş**, sistem tarafı **akıyor** — aynı gün iki koşum 8→9 verdi. Her kıyasta iki damga yazılır.
