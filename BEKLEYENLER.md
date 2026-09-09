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

## 🔶 K197 — TAHMİN EDİLEN DESİ ile GERÇEKLEŞEN DESİ · 09.09.2026 · [KOD KOŞTU]

> **Halil kararı 09.09:** _"Geçmişte gösterilecek ufak tefek gelir veya kâr
> farklılıkları problem değil. Asıl sistemin doğru kurulması önemli."_
> → geçmiş yeniden-yazımı **RAFA**, mekanizma ileriye kurulur.

⭐ **BAŞLANGIÇ TEK BİR VAKAYDI VE YÖNÜ YANLIŞTI.** Halil bir siparişte fark
gördü (TY `5 desi` · defter `7 desi`, `11585155315`). Ölçüm yönü ÇÜRÜTTÜ:

    TY  n 37 · tutan 19 · biz FAZLA  5 · biz EKSİK 13   aralık  −3 … +2
    HB  n 12 · tutan  2 · biz FAZLA  4 · biz EKSİK  6   aralık −11 … +2

Yani genel eğilim TERSİ — daha çok EKSİK tahmin ediyoruz. Tek vakaya
bakılsaydı "desiyi düşürelim" gibi tam ters bir iş çıkardı.

⚠ **KANAL KIRILIMI ŞART OLDU:** ikisi havuzlanınca ortanca `0` çıkıyor ve
HB'nin ağır kuyruğu (−11) tamamen kayboluyordu. TY `cargoDeci` ile HB `Deci`
aynı adı taşıyor ama aynı ŞEYİ ölçtükleri ÖLÇÜLMEDİ.

### ⛔ "GEÇMİŞİ DÜZELTELİM" TEKNİK OLARAK İMKÂNSIZ — ÖLÇÜLDÜ

    TY sipariş ucu   2025-08 → 0 · 2025-11 → 0 · 2026-03 → 0
                     2026-07 → 90 · 2026-09 → 87
    HB /shipped      tarih parametresi HİÇ YOK
    hakediş          2026-07-14'te başlıyor

"0" iki şey olabilirdi (o hafta satış yoktu / uç bakmıyor). **Defter ayırdı:**
o aylarda 385 · 551 · 494 satış vardı → uç bakmıyor.

⭐ **VE DÜZELTİLECEK BİR ŞEY DE YOKTU:** defterdeki kargo TUTARI zaten dolu
(2025-08'den beri her ayda ~%99). 28.08'de Halil'in kendi dosyasından
yazılmış. Eksik olan DESİ — ve desi bir GİRDİ, tutar elimizdeyken gerekmiyor.

### 📏 TABAN ÖLÇÜLDÜ — VE TOPLAMIN YÖNÜNÜ TERSİNE ÇEVİRDİ

Hakedişteki `KARGO` kalemi **KDV DAHİL** (iki bağımsız kanıt: `rawType`
"Kargo Bedeli"; ve 146 tutarın 130'u tarife ×1,20'ye oturuyor, KDV hariç
tutara oturan **0**). `Sale.cargoAmount` ise KDV hariç:

    ham          15.066,17 vs 17.630,20  → defter %17 DÜŞÜK
    düzeltilmiş  18.079,40 vs 17.630,20  → defter %2,5 YÜKSEK

Taban çözülmeden yön yazılsaydı **ters bir alarm** gidecekti.

### ⚠ VE ASIL BULGUYU TOPLAM GİZLİYOR

Kuru koşum (`canli:hakedis-kargo-kosum`, 144 satış · 142 değişecek):
toplam etki ₺−374 ama satır bazında **±₺114**. Hatalar birbirini götürüyor.
"Toplam küçük, önemsiz" okuması ürün bazlı kârlılıkta YANLIŞ olurdu.

### ─── ④ `kanalKargoDesi` — MEKANİZMA KURULDU · [KOD KOŞTU — MIGRATION CANLIDA]

    Sale.kanalKargoDesi  Decimal?(9,3)   kanalın TARTTIĞI desi

⛔ **DEFTERE DOKUNMAZ.** `cargoAmount`, `cargoDesi`, NET ve kâr hesabı
DEĞİŞMEDİ. Bu bir ölçüm alanı; kesinti değil. Geçmiş tutarlar yeniden
YAZILMADI.

⛔ **TÜKETİCİSİ HENÜZ YOK — VE BU BİLEREK (K52 tuzağı).** Gerekçe ölçüldü:
**veri geçici.** Bugün toplanmazsa yarın hiç toplanamaz. Açılış şartı
(tüketici): örneklem varyant başına anlamlı olunca ürün desi kataloğu
bundan düzeltilir.

⚠ **DOĞUM TARİHİ 09.09.2026** — sütun yalnız İLERİYE dolar; eski satışlarda
kalıcı BOŞ kalacak ve **boşluk "fark yok" demek değildir.**

⚠ **N11 DESİ VERMİYOR — ÖLÇÜLDÜ, VARSAYILMADI:** 5 paketin birleşim
kümesinde 34 alan var, hiçbiri desi/deci/weight değil. Bekçinin tabanı bu
yüzden 3 değil **2** ve gerekçesi yazılı — 3 yazılsaydı her koşumda haksız
kırmızı yanar, sonra "gevşetelim" denir ve ölçüt ölürdü.

### BEKÇİ 58/58 · MUTASYON 15/15 KIRMIZI (4 yeni) · ÇAPA 237

    + DOLU kanal desisi eziliyor              KIRMIZI
    + İÇE AKTARMA KARGO TUTARINA DOKUNUYOR    KIRMIZI ← Halil'in şartı
    + HB dolu kanal desisini eziyor           KIRMIZI
    - TY kanal desisini hiç yazmiyor          KIRMIZI ← taban

⭐ İkincisi kritik: _"defter değişmez"_ bir İDDİADIR ve ancak **dokunan bir
mutasyon kırmızı yandığında** korunmuş olur.

⚠ **ÖLÇÜT DEĞİŞKEN ADINDAN KURTARILDI:** null koruması `data: { <alan>:
damga }` diye arıyordu; biri değişkeni `desi` diye adlandırsa desen tutmaz
ve kontrol SESSİZCE koşmazdı. Artık `data: { <alan>:` ile başlayan her yazım
yakalanıyor.

### 📋 RAFA KALDIRILANLAR (gerekçesiyle — silinmedi)

· **142 satırlık geçmiş yeniden-yazımı** — Halil kararı: geçmiş kabaca doğru
  yeter. Gerekirse ileride HB-tanım ölçümüyle açılır, öncelik değil.
· **16 oturmayan kesinti** (₺268,91 · ₺180,14 · ₺131,59 · ₺104,53 …) —
  bilinmeyen küme. HB tanım farkıyla UYUMLU ama onu KANITLAMIYOR; rakip
  okumaları elemiyor. Ölçümü ③ zamanında.
· **TY kargosu satır bazında çaprazlanamıyor** — hakedişe `KARGO_FATURA`
  diye TOPLU düşüyor (20 satır, ₺−65.333,64, hiçbiri satışa bağlı değil).

---

## ✅ K193 — 21 GÜNLÜK PENCERE: YEDEK ALMA İŞİ MAKİNEYE GEÇTİ · 09.09.2026 · [KOŞTU]

> **Kullanıcı bilgisi (09.09):** Blob kotası **30 Eylül'de** açılıyor.
> Yani üretimdeki gece yedeği **21 gün** çalışmayacak.

⛔ **ASIL TEHLİKE 21 GÜN YEDEKSİZLİK DEĞİL, YEDEK ALMANIN HATIRLAMAYA
BAĞLI KALMASIYDI.** Anayasadaki vaka birebir buydu: 17.08.2026'da son yedek
13.08'di ve **dört gün kimse fark etmedi.**

### ÖLÇÜM (09.09, yazımdan önce)

    son BASARILI gece yedegi : 31.08 04:00  → 9 gundur uretimde yedek YOK
    can (uretimde)           : yedekYok = 1 → 30 Eylul'e kadar HER GUN kirmizi
    yerel yedekler           : 31.08 · 08.09 · 09.09 dosyalar VAR
                               ama AuditLog'da HICBIR izi yok

### YAZILAN — ÜÇ PARÇA

**① GÜNLÜK YEDEK GÖREVE BAĞLANDI** (`scripts/gunluk-yedek.cmd`,
`Selliora Gunluk Yedek`, her gün 03:30). Çekirdek AYNI: kullanıcının
ekrandan bastığı düğmeyle aynı `gunlukYedekYaz` gövdesi, yazdığını GERİ
OKUYARAK. Ayrı bir yedek yolu açılsaydı ikisi sessizce ayrışırdı.

⚠ **ÇEKİM GÖREVİNDEN İKİ BİLİNÇLİ FARK:**
· `StartWhenAvailable = True` — kaçan koşum TELAFİ edilir. Günlük bir yedek
  kaçarsa ertesi güne kadar yedeksiz kalınır; çekimde bir sonraki tur 5
  dakika sonra.
· `DisallowStartIfOnBatteries = False` — 41 MB'lik yerel bir yazım için
  yedeksiz gün geçirmek mantıksız.
· Süre sınırı `PT10M` (çekimin `PT4M`'i 5 dakikalık ritim içindi).

**② DOĞRULANMIŞ YEDEK İZ BIRAKIYOR** — `AuditLog` → `YEDEK_ALINDI`
(gün · hedef · satır · boyut · doğrulama süresi). İz **geri okuma tuttuktan
SONRA** yazılıyor; yazma sonrasına konsaydı okunamayan bir dosya için de
"yedek alındı" derdi ve 31.08 vakasını üretirdi.

**③ ÇAN İZE DÜŞÜYOR — AMA BEYANLA.** Sıra: önce HEDEF (dosyanın kendisi tek
kanıt), okunamıyorsa `AuditLog` damgası. Yeni uyarı türü **`yedekIzden`,
AMBER**: _"yedek var (ize göre), depodan doğrulanamadı"_.
⚠ **KIRMIZI ÖNCELİKLİ:** iz eski ya da yoksa `yedekEski`/`yedekYok` yerinde
kalır — amber onları EZMEZ.
⚠ **ESKİ GEREKÇE SİLİNMEDİ:** _"damga veritabanında dursaydı, veritabanı
gittiğinde yedeğin varlığını da kaybederdik"_ — doğru, ve bu yüzden damga
BİRİNCİL yapılmadı, yalnız hedef susunca konuşan ikincil kaynak oldu.

**+ 30 EYLÜL İÇİN:** `canli:manifest-kur` — depo açıldığı gün bir kez koşar,
belirlenimci adları (`selliora-<gün>.json`) `get()` ile yoklayıp manifesti
mevcut dosyalardan kurar. `list()` KULLANMAZ.
⚠ Kapsam sınırı beyanlı: `guvenlik-*` yedekleri belirlenimci ad taşımadığı
için yoklanamaz ve manifeste girmez.
Kuru koşum bugün doğru davrandı: depo 403 → **kurulum YAPILMADI**.

### ⛔ GÖREVİ SINARKEN İKİ GERÇEK KUSUR ÇIKTI — İKİSİ DE BENİM

Görevi kurup **elle tetikledim** ve sonucu izledim; ikisi de ancak orada
göründü.

**① GÖREV "RUNNING"DA ASILI KALDI — VE BU TAM K189'UN SINIFI.**
`canli-yedek-cekirdek.ts` Prisma bağlantısını kapatmıyordu; yedek bitiyor,
günlüğe yazılıyor, **süreç ölmüyordu**. `BITTI` satırı hiç yazılmadı.
⚠ Bedeli ölçülü: görev `IgnoreNew` taşısaydı asılı örnek SONRAKİ günün
koşumunu sessizce reddettirirdi — çekimde bunun bedeli 69 dakikaydı, günlük
yedekte **bir gün yedeksizlik** olurdu. Kardeş betik
(`canli-yedek-dosya.ts`) `$disconnect`i zaten yapıyordu; kopya yazarken
eksik kalan parça buydu. `finally` içine alındı.

**② YEDEKLER YANLIŞ KLASÖRE DÜŞTÜ.** `YEDEK_KOK` GÖRECELİ bir yoldu
(`veri/yedek-yerel`) ve betik KLONDAN koşuyor — yedekler
`axcali-operasyon/veri/yedek-yerel` içine düştü, elle koşumların yazdığı
klasörden BAŞKA bir yere. İki klasör, iki ayrı 30 günlük saklama, ve
"yedeğim nerede" sorusuna iki cevap.
⭐ Çare mutlak yolu koda GÖMMEK değil: çağıran (cmd) kendi `KOK`unu biliyor
ve `YEDEK_KOK` ile veriyor; elle koşumda değişken yok, göreceli varsayılan
geliştirme ağacında aynı klasöre çözülüyor. Klondaki yanlış yerdeki dosya
temizlendi.

⚠ **İKİSİ DE "YAZDIM, ÇALIŞIYORDUR" DENSEYDİ GÖRÜNMEZDİ.** Betik elle
koşturulunca ikisi de sorunsuz görünüyordu; ortaya çıkaran tek şey görevi
GERÇEKTEN kurup tetiklemek oldu.
_(Anayasa: "sınanmamış ekran, ekran değildir" — görev hâli.)_

### 📋 KALAN — GÖREV KLONDAN KOŞUYOR, DÜZELTMELER PUSH'LA ULAŞIR

Görev kodu klondan koşuyor (K191 düzeltmesinde ölçüldü), dolayısıyla
yukarıdaki iki düzeltme ancak **push + klonun bir sonraki `git pull`u**
ile geçerli olur. Push sonrası görev yeniden tetiklenip **çıktığı
GÖRÜLMELİ** — bu doğrulama yapılmadan K193 kapanmaz.

---

## 🔶 K195 — KARGO TAKİBİ: KANALIN SÖYLEDİĞİNİ ATMAYI BIRAKTIK · 09.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

> **Halil kararı 09.09:** kargo takibi **pazaryerinden** (a); kargo firması
> API'leri (b) ERTELENDİ. Saat dilimi sorusuna cevap: **(c) — TY'yi esas al,
> HB'nin saatini yalnız GÜN olarak kullan.**

⭐ **ANA BULGU: KANALLAR DURUMU ZATEN SÖYLÜYORDU, BİZ ATIYORDUK.**
İş yeni API çağrısı eklemek değildi — gelen veriyi atmayı bırakmak.
**Sıfır yeni istek, sıfır yeni bağımlılık.**

    TY : packageHistories her pakette VAR → okunuyordu, DEFTERE YAZILMIYORDU
    HB : /shipped ve /delivered CAGRILIYOR ama yalniz siparis NUMARASI
         toplaniyor; ShippedDate/DeliveredDate ATILIYORDU

### ⛔ ÖLÇÜLEN TEHLİKE — HB'NİN TARİHİNDE SAAT DİLİMİ YOK

    HB dizesi               "2026-09-04T13:58:48"   ← dilim isareti YOK
    gercek an (Istanbul)    2026-09-04T10:58:48Z
    new Date() bu makinede  2026-09-04T11:58:48Z    ← 1 saat ERKEN
    new Date() Vercel'de    2026-09-04T13:58:48Z    ← 3 saat ERKEN

⚠ **VE BU TEORİK DEĞİL:** geliştirme makinesi `Europe/Berlin` (+2), çekim
görevi **orada** koşuyor; üretim Vercel `UTC`; iş `Europe/Istanbul` (+3).
Yani `new Date(dize)` **koştuğu yere göre farklı bir an** üretir ve hiçbir
hata vermez. _(Anayasa: "çalışma ortamının saat dilimi ASLA kullanılmaz";
"iç tutarlılık kaymayı gizler" — bütün kayıtlar aynı miktarda kayar,
hiçbir iç kontrol kırmızı yanmaz.)_

⭐ **KULLANICI DÜZELTMESİ:** önce _"aynı saat dilimini kullanıyorlar, problem
yok"_ denmişti; ardından _"ben Almanya'dayım, buradaki dilim HB ve
Trendyol'daki ile aynı değil"_ diye netleşti. Kanalların birbiriyle uyumu
sorunu çözmüyor — sorun **bizim ayrıştırıcımızın** hangi dilimi kullandığı.

**(c)'NİN DOĞRU UYGULAMASI DİZEDEN KESMEKTİR:** gün, `Date` KURULMADAN
dizenin ilk 10 hanesinden alınır. Önce `new Date()` yapıp sonra gününü
okumak, kaymış bir andan gün okumak olurdu — `00:30` gibi bir damgada
**GÜN de kayardı** (Berlin'de bir önceki güne düşer).

### YAZILAN

**①** `src/lib/kanal-kargo-damgasi.ts` — SAF gövde, iki biçimi tek sonuca
çevirir:

    TY  createdDate (epoch ms)  → { tur: "AN",  an }   saat GUVENILIR
    HB  "2026-09-04T13:58:48"   → { tur: "GUN", an }   saat IDDIA EDILMEZ

⭐ **KESİNLİK KAYBOLMUYOR, İŞARETLENİYOR.** Gün hassasiyetli damga tam gün
sınırına düşüyor ve depoda ZATEN VAR OLAN `gunHassasiyetliMi` ile ayırt
ediliyor — ikinci bir gövde yazılmadı. Bu, K163'te `soldAt` için alınmış
kararın aynısı ("elle kayıtlar gün hassasiyetinde kalır, ekran ayrımı
`gunHassasiyetliMi` ile yapar").

**②** TY ve HB içe aktarmaları `shippedAt`i **kanalın söylediğiyle**
dolduruyor — hem yeni satışta hem mevcut satışta.

⛔ **"EZME YOK" İLKESİ ÇİĞNENMEDİ:** yalnız `shippedAt` **NULL** olanlara
yazılıyor (`updateMany` koşulunda `shippedAt: null`). Dolu bir damga —
elle girilmiş olabilir — asla değişmiyor. **Boş bir alanı doldurmak ezme
değildir; ezme, var olan bir bilgiyi yok etmektir.**

⚠ **AYRI BİR BETİK YAZILMADI VE GEREKÇESİ ÖLÇÜLDÜ:** veri zaten elimizde;
ayrı bir betik aynı paketleri **ikinci kez** çekerdi — her 5 dakikada
gereksiz bir tur API isteği.

### ÖLÇÜLEN KAPSAM (09.09.2026)

    defter : satis 7953 · shippedAt DOLU 353 · BOS 7600
    TY     : son 7 gunde Shipped 91 · Delivered 63 paket
             111 paketin 111'i defterde · shippedAt BOS 20
    HB     : kargoda 14 · teslim 50 · hepsi defterde (kacak YOK)
             teslim edilen 50'nin 29'unda shippedAt BOS

⚠ **BU YETENEK İLERİYE DÖNÜKTÜR:** kanal uçları yalnız yakın pencereyi
veriyor; 7600 boş kaydı **geriye doldurmuyor**. Her çekimde yeni
kargolananlar dolacak. Bunu "K60 kapandı" diye yazmıyoruz — kapanan şey
bundan SONRASI.

### BEKÇİ 16/16 · MUTASYON 6/6 KIRMIZI

    ① HB naif new Date() kullanir (dilim tuzagi)      KIRMIZI ← en kritik
    ② TY ILK damgayi alir (en gec yerine)             KIRMIZI
    ③ TY durum suzgeci kalkar                         KIRMIZI
    ④ HB damgasi AN diye isaretlenir                  KIRMIZI
    ⑤ TY icin uydurma tarih yazilir                   KIRMIZI ← K60 yasagi
    ⑥ HB damgasi DOLU olani da ezer                   KIRMIZI

⭐ ①'in kırmızı yanması, saat dilimi tuzağının artık **korumalı** olduğunu
gösteriyor: biri "kolay yol" diye `new Date()`e dönerse bekçi durdurur.
⚠ Ölçüt ORTAMA BAĞLI YAZILMADI: "naif sonuç farklı" değil, "bizim
sonucumuz dizenin günü" diye kuruldu — makine UTC'ye taşınsa da aynı şeyi
ölçer.

### ✅ K195b — ÜÇÜNCÜ KANAL (N11) DA DAMGA BIRAKIYOR · 09.09.2026 · [KOD KOŞTU]

**ÖLÇÜLDÜ — N11'İN ŞEKLİ TY İLE BİREBİR AYNI** (`canli:n11-kargo-olcum`):

    packageHistories 5/5 pakette · ic alanlar: createdDate · status
    durumlar: Created 5 · Picking 5 · Shipped 4 · Delivered 3 · Cancelled 1
    createdDate = EPOCH MS  → dilim belirsizligi YOK
    ayrica: cargoTrackingNumber · cargoTrackingLink · cargoProviderName

⭐ Aynı olduğu için **ikinci bir çözücü yazılmadı** — ortak gövde olduğu
gibi kullanıldı. Ama gövdenin ADI düzeltildi:

    tyKargoDamgasi  →  gecmistenKargoDamgasi

⚠ **AD BİR İDDİADIR:** kanal adı taşıyan bir gövdeyi ikinci kanalın
çağırması, okuyana "burada TY'ye özel bir şey var" dedirtirdi.

### ⛔ BEKÇİNİN LİSTESİ DE ELLE TUTULUYORDU — DÜZELTİLDİ

`kargo-damgasi:dogrula` ilk yazımda TY ve HB'yi **elle** listeliyordu.
Üçüncü kanal eklenince görüldü ki elle liste **yeni içe aktarmayı hiç
görmez** — N11 uydurma tarih yazsaydı bekçi yeşil kalırdı.
→ Ölçüt artık `shippedAt` YAZAN her içe aktarmayı **tarayarak** buluyor ve
taban doluluğu ayrıca ölçülüyor (≥3 kanal).
_(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur" — ve
bugün aynı ders `kanal-yazma:dogrula`da da alınmıştı. İki bekçi, aynı gün,
aynı kök.)_

### BEKÇİ 19/19 · MUTASYON 9/9 KIRMIZI (3 yeni)

    ⑦ N11 uydurma tarih yazar                KIRMIZI
    ⑧ N11 DOLU damgayi ezer                  KIRMIZI
    ⑨ tarama tabani bosaltilir               KIRMIZI

### ⚠ COMMIT SIRASINDA BİR KAPI TUZAĞI FARK EDİLDİ

Bir önceki push'un bekçi turu koşarken commit atmak üzereydim. `git push`
kancası turu **push'tan ÖNCE** koşuyor; tur sırasında atılan yeni bir
commit, o push'a **biner ve bekçiden geçmemiş olur.**
> **KURAL: push turu koşarken commit atılmaz.** Tur bitene kadar beklenir.
Bu, "cmd push kapısı dışında" kararının farklı bir yüzü: orada kapı bilerek
yoktu, burada kapı VAR ama zamanlama onu atlatabiliyordu.

### 📋 2. FAZ — ŞEMA DEĞİŞİKLİĞİ ONAYI BEKLİYORDU · ONAY GELDİ 09.09 → bkz. ② 

_Aşağıdaki gerekçe SİLİNMEDİ: merdivenin niye indirildiği, kararın kendisi
kadar kayda değer. Onay ve koşum ② bölümünde._

`Sale.deliveredAt` **YOK** ve merdiven indirildi: mevcut alan yok, serbest
metin yetmez (panel "kaç paket yolda" diye SORGULAYACAK), türetilemez.
Yani sütun gerekiyor — ve migration onayı bekliyor:

    Sale.deliveredAt          DateTime?  teslim ani (kanal bildiriyor)
    Sale.kargoTakipBaglantisi String?    TY cargoTrackingLink
    Sale.kanalKargoFirmasi    String?    TY cargoProviderName

⚠ **SON SATIR AYRI BİR ALAN OLMALI:** `cargoCarrierId` **bizim satışta
seçtiğimiz** firma; `cargoProviderName` **kanalın fiilen kullandığı**.
Aynı alana yazmak, ikisi ayrıştığında farkı görünmez yapar — ve o fark tam
da tarife/maliyet hatalarının çıktığı yer.

⭐ **VE `cargoTrackingLink` (b) SEÇENEĞİNİ MUHTEMELEN GEREKSİZ KILIYOR:**
"paketim nerede" sorusunun cevabı TY'den zaten geliyor; 10+ kargo firmasıyla
ayrı ayrı sözleşme/API gerekmeyebilir.

### ─── ② TESLİM TARAFI YAZILDI · 09.09.2026 · [KOD KOŞTU — MIGRATION CANLIDA]

> **Halil AÇIK ONAYI 09.09:** _"deliveredAt — EVET, ekle."_ Ön şart:
> `canli:yedek-cekirdek` YEŞİL görülmeden migration YOK + `.bak` yedeği.

⚠ **YENİ SATIR AÇILMADI — BU K195'İN DEVAMIDIR.** Bir kalemin ikinci fazı
kendine satır açarsa pano taranamaz hâle gelir _("kimlik tekildir";
K51/K53 vakaları)_. Kod yorumlarında bir ara `K196` yazılmıştı, **19 atıf
`K195-2`'ye çevrildi** — ikinci bir kimlik doğmadan.

**ÖN ŞARTLAR ÖNCE, GÖRÜLEREK:**

    yedek  DOSYA hedefi · 87.113 satir · 42,02 MB
           yazildi ve GERI OKUNDU — ozetler birebir (225 ms)
    .bak   schema.prisma.bak-20260909-124621  (depo DISINA tasindi)

⛔ **VE `.bak` DEPOYA GİRMEK ÜZEREYDİ:** `.gitignore` `*.bak-*` desenini
tanımıyor. Şema yedeği bir anlık görüntüdür, sürüm geçmişi değil — depoya
girseydi ilerideki her okuyucu için ikinci bir "geçerli şema" doğardı.

**MIGRATION — `20260909125825_satis_teslim_damgasi`, canlıda KOŞTU:**

    ALTER TABLE `Sale` ADD deliveredAt · kanalKargoFirmasi · kargoTakipBaglantisi
    saglik kontrolu: 47 tablo · 534 kolon canlida DOGRULANDI

⛔ **HARF TUZAĞI ÖLÇÜLDÜ VE YAKALANDI:** `prisma migrate diff` tabloyu
**`sale`** diye üretti (yerel MySQL Windows'ta harfe DUYARSIZ). Canlı Linux
harfe DUYARLI ve orada tablo `Sale` — küçük harfle gitseydi migration
canlıda _"table doesn't exist"_ ile düşerdi. `migration:kontrol` 49/49 temiz.

### ⛔ ÜÇ SÜTUNUN DA YAZICISI ÖLÇÜLDÜ — "ALAN BİR İDDİADIR"

Sütun açmak, o bilginin tutulduğunu İDDİA etmektir; yazıcısı olmayan alan
boş bir vaattir (K52). Bu yüzden açmadan önce üç kanal da ölçüldü:

| sütun | TY | N11 | HB |
|---|---|---|---|
| `deliveredAt` | ✓ `Delivered` (epoch → AN) | ✓ aynı şekil | ✓ `DeliveredDate` (dilimsiz → GÜN) |
| `kargoTakipBaglantisi` | ⚠ `cargoTrackingLink` **30/50** | ⚠ kısmi | ⛔ **YOK — ölçüldü** |
| `kanalKargoFirmasi` | ✓ `cargoProviderName` **50/50** | ✓ | ⛔ **YOK — ölçüldü** |

⛔ **VE İLK "✓" YANLIŞTI — DÜZELTMESİ BURADA DURUYOR.** `cargoTrackingLink`
için önce koşulsuz "✓" yazmıştım; ölçüm **tek paketin** anahtar listesine
dayanıyordu. Gerçek doluluk **30/50** — yalnız kargoya verilmiş paketlerde
var. Sütun yine doğru (boş kalması doğru), ama iddia fazlaydı.

### ✅ CANLIDA DOĞRULANDI — YAZICI GERÇEKTEN YAZIYOR

Klon istemciyi tazeledikten (13:43:57) sonraki **İLK** turda yazıldı:

    TY  13:44:19  teslim damgasi  6 · takip/firma 46
    HB            teslim damgasi 50 · (kanal takip/firma VERMIYOR)
    N11           teslim damgasi  3 · takip/firma  4

    defter: deliveredAt 59 = 6 + 50 + 3   ✓ birebir
            takip baglantisi 31 · kanal kargo firmasi 51

⚠ **VE SONRAKİ TURLARIN `0` YAZMASI DOĞRU DAVRANIŞTIR** — ama ben önce
"yazıcı çalışmıyor" diye okudum. Son üç tura bakmıştım ve üçü de ilk
doldurmadan SONRAYDI. `0` burada _"hiçbir şey çalışmıyor"_ değil
**_"yapılacak yeni bir şey yok"_** demek.
_(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
değildir" — bu kez denetimi yapan bendim ve ayırt etmedim.)_

⚠ **HB'NİN BOŞLUĞU EKSİKLİK DEĞİL, ÖLÇÜLMÜŞ SINIR** (`canli:kargo-alan-olcum`):
teslim ucu `Id · Barcode · PackageNumber · OrderNumber · OrderNumbers ·
MerchantId · DeliveredDate · EtgbNo` veriyor, takip/firma yok. Vekil bir alan
(bizim seçtiğimiz `cargoCarrier`) YAZILMADI — o başka bir şeydir.

### ⭐ İKİ FARKLI EZME KURALI — VE İKİSİ DE GEREKÇELİ

    deliveredAt   bir OLAYIN ani → yalniz BOS olana yazilir, dolu damga
                  (elle girilmis olabilir) ASLA degismez
    takip/firma   kanalin O ANKI beyani → en son soyledigi gecerli
                  ⚠ ama `null` ASLA yazilmaz: susmak "yok" demek degildir

Karar iki içe aktarmada da gerekiyordu ve **saf bir gövdeye** taşındı
(`teslimGuncellemesi`). Kopyalansaydı kaynak tarayan bir ölçüt iki farklı
yazılışı (`where … null` ve `if (… === null)`) tek desenle kovalayamazdı.
Şimdi bekçi desen aramıyor — **gövdeyi çağırıp DEĞER sınıyor.**

### 📏 BÖLÜNMÜŞ SİPARİŞ ÖLÇÜLDÜ — SINIR UYDURULMADI

"Sipariş teslim edildi" ne demek? İki okuma da makuldü: _en az bir paket_ mi,
_bütün paketler_ mi. Kural yazılmadan önce ölçüldü (`canli:paket-bolunmesi`):

    satis 7953 · paket 1 → 7952 (%99,99) · paket 2 → 1 (%0,01)

Basit kural (en geç `Delivered` kazanır) seçildi ve **sınırı koda yazıldı**;
oran anlamlı hâle gelirse "bütün paketleri teslim" diye daraltılır. Şemadaki
TEK PAKET VARSAYIMI ile aynı taban. _(Anayasa: "bir sınırın yönü ölçülmeden
çevrilmez".)_

### ⛔ `as Aday` CAST'İ BİR TUZAK ÇIKARDI — KALDIRILDI

N11 aday nesnesi `as Aday` ile kuruluyordu. Cast, eksik alanı derleyiciden
**saklıyor**: `teslimAni` eklendiğinde orası `undefined` kalırdı,
`an > undefined` sessizce `false` döner ve **sütun hiç dolmazdı** — hata yok,
uyarı yok, yalnız boş bir kolon. Cast kaldırıldı; yarın eklenen alanı artık
derleyici gösteriyor.

### BEKÇİ 38/38 · MUTASYON 11/11 KIRMIZI · ÇAPA 233/233

⭐ **VE MUTASYONLAR ARTIK KALICI:** K195'in dokuz mutasyonu ELLE koşulmuştu
ve hiçbir yere yazılmamıştı — koşulduğu turda vardı, ertesi gün yoktu.
`kargo-damgasi-mutasyon-kontrol.ts` yazıldı (üç hedef dosya: saf gövde + TY +
HB); çapa bekçisi onu kendiliğinden kapsamına aldı (19 → 20 harness).

    + DOLU teslim damgasi EZILIYOR              KIRMIZI ← K60'in teslim tarafi
    + kanal SUSUNCA takip baglantisi SILINIYOR  KIRMIZI
    + ayni takip her turda yeniden yaziliyor    KIRMIZI
    - kargo firmasi hic tazelenmiyor            KIRMIZI
    - gecmisten ILK damga aliniyor              KIRMIZI
    + durum suzgeci kalkti                      KIRMIZI
    + HB naif new Date() kullaniyor             KIRMIZI ← dilim tuzagi
    + TY teslim alanina uydurma tarih yaziyor   KIRMIZI ← K60 yasagi
    - TY teslim alanini hic yazmiyor            KIRMIZI ← taban dolulugu
    + HB dolu teslim damgasini eziyor           KIRMIZI
    - teslim karari satir icine kopyalandi      KIRMIZI ← govde cagrilmiyor

⚠ **SONUNCUSU EN SİNSİSİNİ ÖLÇÜYOR:** ortak gövde ayakta kalır, değer
testleri YEŞİL yanar — ama onu kimse çağırmaz. _(Anayasa: "tur 98/98 yeşildi
ve panelde kutu YOKTU".)_

### ⚠ BU YETENEK İLERİYE DÖNÜKTÜR — GEÇMİŞ DOLDURULMUYOR

Kanal uçları yalnız yakın pencereyi veriyor. `deliveredAt` bugün boş doğar ve
her çekimde yeni teslimlerle dolar. **"Teslim takibi kapandı" DEĞİL** —
kapanan şey bundan SONRASI.

⛔ **HENÜZ EKRAN YOK:** üç sütun da yazılıyor ama hiçbir ekran okumuyor.
Anayasa gereği bu bir teslim sayılmaz _("altyapı tek başına teslim
değildir")_.

### 📋 "KAÇ PAKET YOLDA / TESLİM EDİLDİ" KUTUSU — AYRI KALEM, ONAY BEKLİYOR

_Mimar beyanı 09.09.2026:_ **onay HENÜZ VERİLMEDİ.** Altyapı bugünlük
yeterli; kutunun kendisi yarının işi ve **tasarımı ayrı bir karardır**:

    · kutu deseni ne olacak (panel kutusu mu, /satislar süzgeci mi)
    · nereye konacak
    · hangi SAYI yazacak — ve o sayı neye tıklayınca neyi açacak

⚠ **VE SORULMADAN YAZILMAZ:** İlke #16 gereği bir aksaklık sayısı ekranda
duruyorsa **tıklanınca kaynağını açmak zorunda** ("sayı = liste"). Kutuyu
tasarlamadan yazmak, adresi olmayan bir rakam üretirdi.

⚠ **KAPSAM SINIRI ŞİMDİDEN BELLİ VE KUTUYA YAZILACAK:** `deliveredAt` bugün
boş doğuyor ve yalnız **bundan sonraki** teslimlerle doluyor. "Teslim
edilmedi" ile "sistem bilmiyor" aynı görünürse kutu yanlış okunur.

---

## 🔶 K194 — N11'E STOK/FİYAT GÖNDERİMİ (İKİNCİ KANAL) · 09.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

> **Halil kararı 09.09:** stok TEK düğmeyle üç kanala, fiyat kanal başına
> AYRI düğmeyle. **"Yazım okumadan KATEGORİK tehlikeli — her yazım
> ÖNİZLE→ONAYLA protokolüyle, asla körlemesine toplu."**

**UÇ — RESMÎ DOKÜMANDAN** (n11 Mağaza Destek Merkezi, 09.09.2026):

    POST https://api.n11.com/ms/product/tasks/price-stock-update
    kimlik: appKey/appSecret BASLIKTA (auth semasi YOK)
    govde : { payload: { integrator, skus: [{ stockCode, listPrice,
                                              salePrice, quantity }] } }
    yanit : { id (taskId), type, status: IN_QUEUE | REJECT, reasons[] }

⭐ Mevcut okuma istemcimizin `baslikKur`u dokümanla **birebir** — kimlik
tarafında değişiklik gerekmedi.

### ⛔ TY'DEN AYRILAN YER — FİYAT İKİ SAYIDIR

TY'ye `salePrice` ve `listPrice` **aynı** değer gidiyor. N11 bunu
**reddediyor**: liste fiyatı satış fiyatından YÜKSEK olmalı, eşit bile
olamaz. Yani tek bir "fiyat" sayısı iki kanala gönderilemez.
⭐ Halil'in "fiyat kanal başına ayrı düğme" kararı bu yüzden doğruymuş —
ama form da N11 için **iki rakam** sormak zorunda.

### KANALIN KURALI İSTEK GİTMEDEN SINANIYOR

Doküman üç şart koyuyor ve ihlalde isteği `FAIL` yapıyor. Üçü de **ağa
çıkmadan** sınanıyor (`kalemGecerliMi`, saf gövde):

    ① listPrice ve salePrice BIRLIKTE     → FIYAT_TEK_BASINA
    ② listPrice > salePrice (esitlik YOK) → LISTE_FIYATI_DUSUK
    ③ kusurat en fazla 2 hane             → KURUSAT_HATALI

⚠ **YUVARLAMIYORUZ:** üç haneli bir fiyat sessizce ikiye yuvarlansaydı
kanala **bizim uydurduğumuz** bir rakam giderdi. Reddedip söylüyoruz.
⚠ **KURAL İHLALİNDE İZ YAZILMIYOR** — kanala hiçbir şey gitmedi; "gönderdim
sanıyordum" sorusu orada doğmaz.

### ⛔ "KABUL EDİLDİ" ≠ "İŞLENDİ" — VE BU EKRANDA YAZIYOR

N11 `IN_QUEUE` dönüyor; gerçek sonuç **TaskDetails** servisinden gelir ve
**o ucun yolu dokümanda verilmedi.** Uydurulmuş bir yol yanlış yere sorar ve
"sonuç okunamadı"yı "sorun yok" gibi gösterir.
→ Ekran görev numarasını gösteriyor ve **kuyruk kaydı olduğunu açıkça
söylüyor**; iz de `not: "TaskDetails ucu gelince sonuc sorgulanacak"`
taşıyor ki sonradan "başarılı" diye okunmasın.
📋 **AÇILIŞ ŞARTI:** TaskDetails ucunun tam yolu geldiğinde `gonderimSonucu`
yazılır ve ekran gerçek sonucu gösterir.

### ⛔ BEKÇİ ÇAKILIYDI — VE İKİNCİ KANAL BUNU ORTAYA ÇIKARDI

`kanal-yazma:dogrula` K169'da **TY yollarına çakılı** yazılmıştı. N11
eklenince görüldü ki çakılı bir bekçi **yeni yazıcıyı hiç görmez**: N11
önizlemesiz olsaydı bekçi yeşil kalırdı.
⭐ Liste artık `api-dogrula.ts`teki **beyandan türüyor**; üçüncü kanal (HB)
eklendiğinde kimsenin bu dosyaya satır yazması gerekmeyecek. Ekran yolları
da addan türetiliyor (`scripts/<kod>/yazici.ts` → `<kod>-gonderim.tsx` ·
`<kod>GonderimOnizle`), sapan bir kanal **bulunamaz ve kırmızı yanar**.
_(Anayasa: "bekçi ölçütü elle tutulan liste değil, tersten kurulur".)_

### BEKÇİ 37/37 · MUTASYON 10/10 KIRMIZI

    ①  onizlemesiz gonderim (dugme kapisi kalkar)      KIRMIZI
    ②  onizleme YAZICIYI cagirir (N11)                 KIRMIZI
    ⑩  ...ayni yon TY'de de                            KIRMIZI ← genelleme calisiyor
    ③  KABUL izi silinir                               KIRMIZI
    ④  RED izi silinir                                 KIRMIZI
    ⑤  stok ISTEMCIDEN alinir                          KIRMIZI
    ⑥  izin kapisi gonderimden kalkar                  KIRMIZI
    ⑦  yaziciya IKINCI POST eklenir                    KIRMIZI
    ⑧  liste>satis kurali GEVSER (>=)                  KIRMIZI
    ⑨  beyan listesi bosaltilir (taban)                KIRMIZI

⚠ **② İLK TURDA KAÇTI VE KUSUR MUTASYONDAYDI:** `void n11StokFiyatIste;`
yazmıştım — çağrı değil, referans. Ölçüt haklı olarak eşleşmedi. Gerçek
çağrıya çevrilince ısırdı. _(Anayasa: "mutasyon kaçıyorsa ÖNCE test verisi
sorgulanır".)_
⚠ **VE ÖLÇÜTÜN KENDİSİ İLK KOŞUMDA YANLIŞ KIRMIZI YANDI:**
`!blok.includes("Iste(")` yazmıştım ve `yetkiIste(` de o alt dizeyle
bitiyor — iki kanalda birden yanlış alarm. Aranan adlar tam yazıldı.
_(Anayasa: "ÖNCE DESENİ SAY" — bugün ÜÇÜNCÜ kez aynı tuzak.)_

### ⏳ HALİL TESTİ BEKLİYOR — KAPANMADI

⛔ **Yazıcı canlı N11 API'sine HİÇ gönderim yapmadı.** Jetonun YAZMA
yetkisi olup olmadığı da ölçülmedi — okuma çalışıyor, yazma ayrı bir
yetki olabilir.
**Test listesi:** ① `/urunler/<ürün>` → varyant satırında **N11'e Gönder**
② diyalog açılınca kanal kodu + Selliora stoğu + N11'in bildirdiği adet
görünmeli ③ liste 120 / satış 100 gir → gönder → görev numarası dönmeli
④ liste 100 / satış 100 gir → **gönderilmemeli**, ekran sebebi yazmalı.

📋 **HB YAZICISI BEKLİYOR:** `stock-uploads` ve `price-uploads` uçlarının
tam yolu + gövdesi gelene kadar yazılmayacak. Genel listing güncelleme ucu
`Price` + `AvailableStock` + `DispatchTime` + `CargoCompany1` alanlarının
HEPSİNİ zorunlu tutuyor; onunla stok göndermek **bayat bir fiyatla gerçek
fiyatı ezerdi**.
⚠ Ve HB'de fiyat eşiği aşılırsa listing **KİLİTLENİYOR** (MinLock/MaxLock);
o düğme yanıttaki `priceValidations` alanını ekranda göstermek ZORUNDA ve
kilit-kaldırma çağrısı da haritalanacak.

---

### ✅ K193 KAPANDI — GÖREV KLONDAN TEMİZ ÇIKIYOR (09.09.2026)

Push sonrası klon `b1c345b`e çekildi ve görev yeniden tetiklendi:

    State Ready · Son sonuc 0 · BITTI 07:25:33 cikis=0
    yedek DOGRU klasorde (41,80 MB) · klon klasoru BOS ✓
    sonraki kosum 10.09 03:30

İki kusur da kapandı: süreç artık ÇIKIYOR (asılı kalmıyor) ve yedek tek
klasöre düşüyor.

### 📋 AYNI TURDA İKİ BAYAT KAYIT DÜZELTİLDİ

**① `CLAUDE.md` faz göstergesi** aylarca _"Faz 3 (şimdi)"_ diyordu; oysa
Faz 3, Faz 3,5 ve Faz 4'ün üçte ikisi bitmişti (ölçüldü: `/hakedis`
`/kartlar` `/tazminat` `/giris` var; API okuma üç kanalda canlı, yazma
TY'de; barkod ve RBAC tamam). ⚠ Yanlış bir gösterge üstündeki KURALI da
işlevsizleştirir: buraya bakan biri Faz 4 işini "sırayı atlıyorsun" diye
reddedebilirdi. Kural yazıldı: **bir faz kapandığında satır AYNI teslimde
güncellenir.**

**② `schema.prisma`** hâlâ _"Stok senkronu KAPSAM DIŞI — kullanıcı şartı
01.09.2026"_ diyordu; oysa sahibi **05.09'da çevirdi** ve K169 ile TY'ye
yazma açıldı (Halil testi geçti). Eski cümle silinmedi, **çevrildiği
yazıldı** — bayat bir kural olmayan bir yasağı canlı tutar.

---

## ✅ K192 — BLOB ASKISININ KÖK SEBEBİ: `list()` KOTAYI YAKMIŞ · 08.09.2026 · [KOD KOŞTU]

> **Mimar ölçümü (Vercel ekranı):** Advanced Operations **2000/2000 — DOLU**.
> Storage 217 MB/1 GB · Simple 10/10k · Transfer 2,38 MB/10 GB — hepsi bol.
> **Veri silinme riski YOK** (storage temiz, geri sayım yok); kapanan şey
> ERİŞİM. Yuvarlanan pencere düşünce depo kendiliğinden açılır.

⛔ **DEPOYU DOLDURAN VERİ DEĞİL, ÇAĞRI SAYISIYDI.** Tek suçlu `list()` — ve
sekiz gündür "askı" diye baktığımız şey aslında **kendi kodumuzun ürettiği
bir kota tükenmesiydi.**

### KİM ÇAĞIRIYORDU — VE NE SIKLIKTA

    uyari/topla.ts          HER PANEL CIZIMINDE  1  ← en pahalisi
    otomatik-durum.tsx      her acilista         2  ← AYNI sorgu iki kez
    geri-yukleme/page.tsx   her acilista         1
    yedek-hedefi.oku()      her OKUMADA          1
    yedek-hedefi.sil()      her SILMEDE          1
    canli-test.ts           kosum basina         1
    k119-blob-olcum.ts      kosum basina         1  ← TESHIS ARACI

⚠ **TEŞHİS ARACININ KENDİSİ DE SUÇLUYDU:** askıyı ölçmek için yazdığım betik
her koşumda bir `list()` harcıyordu — teşhis ettiği arızayı besliyordu.

### ⭐ ÇARE ÖLÇÜLDÜ, VARSAYILMADI

`@vercel/blob` **tip bildirimine bakıldı**:

    del(urlOrPathname: string[] | string, ...)   ← PATHNAME kabul ediyor
    get(urlOrPathname: string, ...)              ← PATHNAME kabul ediyor

Yani okuma ve silme için `list()` **hiç gerekmiyormuş**. `oku()` her okumada
önce `listele()` çağırıyordu; `sil()` silinecek adresleri bulmak için
listeliyordu. İkisi de gereksizdi.

Geriye tek soru kaldı — _"hangi yedekler var"_ — ve o bir **MANİFEST**
dosyasından (`yedek/index.json`, `get` ile) cevaplanıyor. Manifest yazımdan
sonra güncelleniyor.
⚠ **MANİFEST TEK NOKTA ARIZA DEĞİL:** dosyanın kendisi hâlâ tek doğru
kanıttır ve ad deseni belirlenimci (`yedek/selliora-<gün>.json`), yani
manifest kaybolsa yeniden kurulabilir. Bir hızlandırıcıdır, bir defter
değil.

### YAZILAN

**①** `blobHedefi` `list()`siz: `oku` → doğrudan `get(pathname)`, `sil` →
doğrudan `del(pathname)`, `listele` → manifest.
**②** Çan, iki ekran ve iki betik **hedef soyutlamasından** geçiyor — hiçbiri
`@vercel/blob`u doğrudan çağırmıyor. `otomatik-durum` iki sorguyu **teke**
indirdi (aynı veriyi iki kez çekiyordu); ⚠ ama "son 10 yedek" ile "son 14
gün" AYRIMI korundu — tarama yine TAM listeden yapılıyor, 10'luk dilimden
değil.
**③** `blobUstverisi` **KALDIRILDI** — ölçüldü, `src/` ve `scripts/` altında
**0 çağıran**. `head()` de depo işlemi harcar; kotayı yakan sınıftan bir
çağrıyı çağıransız tutmanın tek etkisi, birinin onu "demek üstveri takip
ediliyor" diye okuması olurdu.

### BEKÇİ — DESEN YASAĞI · MUTASYON 4/4 KIRMIZI

`src/` ve `scripts/` altındaki **her dosya** taranıyor: hiçbiri
`@vercel/blob`dan `list` alamaz. Statik ve dinamik içe aktarma biçimlerinin
ikisi de yakalanıyor.

    ① bir dosya yine list aliyor           KIRMIZI
    ② kota taramasi bosaltilir             KIRMIZI  (bos taban)
    ③ manifest kaldirilir                  KIRMIZI
    ④ sil() pathname yolundan cikar        KIRMIZI

⚠ **ÖLÇÜT İLK KOŞUMDA KENDİNİ SUÇLADI:** aradığı dize kendi kaynağında
geçiyordu. Çare **dosya istisnası yazmak değildi** — o, yasağı yeniden bir
listeye çevirirdi; aranan ad parçalı kuruldu (`"l" + "ist"`) ve kaynakta hiç
geçmez oldu.

### 📋 HEDEF — ÜRETİMDE HÂLÂ ÇALIŞAN YOL YOK, VE SEBEBİ DEĞİŞTİ

`canli:yedek-cekirdek` yeşil (09.09 · 86.486 satır · 41,60 MB · geri okuma
242 ms) ve operatörün yolu bu.
⛔ **Vercel'de kalıcı disk YOK**, dolayısıyla üretimdeki gece işi için
`YEDEK_HEDEFI=DOSYA` bir çözüm DEĞİL — K119b'de bunun neden yalancı yeşil
olduğu yazılı. Üretim yolu Blob açılınca çalışacak.
⭐ **VE AÇILMASI İÇİN VERCEL'E GEREK YOK:** yuvarlanan pencere düşünce depo
kendi açılır; `list()` kalktığı için **bir daha dolmaz.**

---

## ✅ K191 — ÖLÜM SEBEBİ İŞARETİ: "YARIM KALDI" YETMEZ, "NEREDE" GEREK · 08.09.2026 · [KOŞTU]

> **Mimar kararı 08.09:** _"cmd her adımdan önce 'son adım' işaretini
> güncellesin. BITTI-SIK basılmadan sonlanırsa, son işaret ölen koşumun
> NEREDE öldüğünü söyler + çıkış kodu."_

### VAKA — AYNI GÜN AKŞAM, BEŞ KOŞUM ÖLDÜ

    20:42:00 · 20:47:00 · 20:52:01 · 20:57:01 · 21:02:00  (yerel)
    hepsi BASLADI, hicbiri BITMEDI · 22:07 TR'de kendiliginden duzeldi

K187'nin yarım-koşum işareti **her seferinde düştü ve işini yaptı** — ama
yalnızca _"yarım kaldı"_ diyebildi. NEREDE öldüğü hiçbir yerde yazmıyordu.

⭐ **VE K189'UN EŞİĞİ BUNU GÖRDÜ:** HB'nin boşluğu 30 dk > 20 dk eşik →
rozet `ESKİ` yanardı. Sabah konulan eşik, aynı gün akşam gerçek bir
kesintiyi yakaladı.

### ⚠ SAĞ KALAN YANLILIĞI — ÖLÇÜM SORUYU CEVAPLAYAMADI

`PT4M` tavanı hipotezini ölçtüm (tamamlanan koşum süreleri):

    n=129 · min 13 sn · ortanca 15 · p90 28 · p95 34 · tavan 240 sn
    tavani asan 2 · tavanin %75'ini gecen 0

⛔ **AMA BU ÖLÇÜM YALNIZ SAĞ KALANLARI GÖRÜYOR.** Ölen koşumların bitiş
damgası hiç yazılmadı, dolayısıyla süre hesabına **yapısı gereği**
giremiyorlar. "Koşumlar tavana uzak" doğru ve ölenler hakkında **hiçbir şey
söylemiyor.** Bu bir cevap değil, cevabın olmadığı yer.
_(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
değildir".)_

### YAZILAN

Her adımdan ÖNCE `raporlar/.son-adim` güncelleniyor:

    ADIM=HAZIRLIK → CEKIM-TY → TY-BITTI cikis=N → CEKIM-HB → HB-BITTI
    → CEKIM-N11 → BITTI

Koşum `BITTI-SIK` basmadan ölürse, **bir sonraki koşum** o dosyayı okur ve
ÜÇ LOGA DA `!! OLDUGU ADIM:` diye döker.
⚠ Çıkış kodları değişkene alındı (`TYKOD`/`HBKOD`/`N11KOD`): `%errorlevel%`
bir sonraki `echo` ile tazelendiği için aynı kod iki yerde kullanılamıyordu.

**SINANDI — ve iki yön ayrı:**

    ✓ temiz kosum   → ADIM=BITTI · yarim isaret silindi · "OLDUGU ADIM" BASILMADI
    ✓ olen kosum    → sonraki kosum uc loga da "OLDUGU ADIM: ADIM=CEKIM-HB" yazdi

Ölüm senaryosu **yalıtılmış kopyada** koşuldu: üretim günlüğüne sahte bir
olay yazmak, altı ay sonra gerçek bir vaka sanılırdı.

### ⛔ SEBEP HÂLÂ BİLİNMİYOR — VE YAZILMIYOR

Bekçi turu ve `max_user_connections` birer **HİPOTEZDİR**, kanıt değil.
İlk gerçek ölümde son-adım işareti yeri gösterecek; hüküm O ZAMAN kurulur.
_(Anayasa: "yanlış emsale dayanan gerekçe, emsal çürüdüğü gün kararı da
yeniden açtırır".)_

### 📋 PT4M — TESPİT KANITLANDI, ÖNLEME KANITLANMADI

    tespit tarafi  (isaret + esik)  → BU AKSAM KANITLANDI
    onleme tarafi  (PT4M tavani)    → KANITLANAMADI

Önleme tarafı ölen-koşum verisi olmadan sınanamaz (sağ-kalan yanlılığı) ve
**ilk gerçek tavan aşımında** sınanacak. O güne kadar "asılı bir örnek bir
sonrakini engelleyemez" cümlesi bir TASARIM İDDİASIDIR, ölçülmüş bir olgu
değil.

### 📋 EŞİK ALTI KESİNTİ GÖRÜNMEZ — BİLİNÇLİ, KAYDA GEÇTİ

Aynı akşam TY'nin boşlukları **11 ve 19 dakikaydı** ve 20 dakikalık eşiğin
altında kaldığı için rozet **hiç yanmadı**; yalnız HB'nin 30 dakikası
göründü. Bu bir kusur değil, **sinyal/gürültü dengesi**: eşik gövdenin
gediğine konuldu (`4 × periyot`), `1 × periyot` her gecikmede yanardı ve
uyarı okunmaz olurdu. Kayda geçiyor ki altı ay sonra "19 dakika niye
görünmedi" diye sorulduğunda cevap olsun.

### ⛔ AÇIK BULGU — ÇEKİM GELİŞTİRME AĞACINDAN KOŞUYOR (MİMAR KARARI BEKLİYOR)

Ölçüldü (08.09.2026, `Get-ScheduledTask`):

    Gorev calistiriyor : C:\Users\yapra\Desktop\axcali\scripts\kanal-sik-cekim.cmd
    Dosyadaki KOK      : C:\Users\yapra\Desktop\axcali          <- GELISTIRME AGACI
    Klon               : C:\Users\yapra\Desktop\axcali-operasyon  (VAR, kullanilmiyor)

Betiğin **kendi başlığı** şunu diyor: _"OPERASYON KLONUNDAN koşar… geliştirme
ağacındaki tur/mutasyon pencereleri çekimi ETKİLEMEZ."_ Görev bunun tersini
yapıyor — çekim, bekçi turlarının kaynak dosyaları geçici olarak
MUTASYONLADIĞI ağaçtan koşuyor.
⚠ Bu, bu akşamki ölümlerin sebebi olarak **YAZILMIYOR** (hipotez yasağı);
ama tasarım kararıyla fiiliyat arasında ölçülmüş bir ayrışmadır ve kendi
başına bir kalemdir. Karar: görev klonun cmd'sine mi çevrilsin, yoksa
`KOK` klona mı bağlansın?

### ⛔ YUKARIDAKİ BULGU YANLIŞTI — ÖLÇÜMLE ÇÜRÜTÜLDÜ (08.09.2026, aynı gece)

⚠ **KAYIT SİLİNMİYOR, ÜSTÜNE YAZILIYOR** — geçerli olan bu bölümdür.
_(Anayasa: "kesik iz silinmez; bozuk kayıt yerinde bırakılır ve üstüne onu
açıklayan ikinci bir iz yazılır".)_

**İDDİA:** _"Çekim geliştirme ağacından koşuyor; betiğin kendi başlığı
tersini söylüyor."_
**ÖLÇÜM:** `npm run` çağrılarının koştuğu dizin, hazırlıktan hemen sonra
yazdırıldı (yalıtılmış kopya, yalnız günlükler ayrı):

    CALISMA-DIZINI = C:\Users\yapra\Desktop\axcali-operasyon    ← KLON

**SEBEP:** `klon-tazele.cmd` içinde `cd /d ...axcali-operasyon` var ve o
betikte **`setlocal` YOK**; dolayısıyla dizin değişikliği çağıran koşumun
geri kalanında GEÇERLİ KALIYOR. Üç kanal da klondan koşuyor.

    Gorevin cagirdigi cmd DOSYASI      → gelistirme agaci
    KOK (gunluk yollari, klon-tazele)  → gelistirme agaci
    CEKIM KODUNUN KENDISI              → KLON  ✓

⭐ **KORUMA GERÇEKTEN VAR — "var sanılıyor" DEĞİL.** Bekçi turlarının kaynak
mutasyonladığı ağaçtan çekim koşmuyor; birleşik hipotezin o yarısı düşüyor.
Geriye `max_user_connections` tarafı kalıyor ve o da hâlâ HİPOTEZ.

⚠ **HATA BENDEYDİ VE ÇEREZ DEĞİLDİ:** `Get-ScheduledTask` çıktısını
(cmd dosyasının yolu) "çekimin koştuğu ağaç" diye okudum. İkisi ayrı şey ve
aradaki farkı ölçmeden rapor ettim — mimar bu yanlış önerme üstüne karar
verdi. _(Anayasa: "kendi sistemimizin davranışı da doğrulanır — bir betiğin
ne yaptığını söylemeden önce o betiğe BAKILIR".)_

### 📋 GERİYE KALAN DAR AYRIŞMA — KARAR BEKLİYOR

Gerçek ve ölçülmüş, ama iddia edilenden çok daha dar:
**cmd dosyasının KENDİSİ geliştirme ağacından okunuyor**, yani orkestrasyon
betiğine yapılan bir düzenleme **push'tan ÖNCE üretime giriyor.** Bu gece
kanıtlandı: K191 düzenlemesi yazıldığı anda 22:02'deki zamanlanmış koşum onu
kullandı — bekçi turundan geçmeden.

Çekim KODU bu kapıyı atlamıyor (klon yalnız push'lanmış kodu çeker); atlayan
tek şey orkestrasyon betiği.

**Klon durumu ölçüldü (08.09.2026 22:2x):**

    HEAD = origin/main = 7bdad10 · geride/onde 0/0 · calisma agaci TEMIZ
    node_modules VAR · uretilmis istemci 08.09 07:36 > sema 07.09 16:12
    .env.canli her kosumda kopyalaniyor
    mekanizma: her cekimde klon-tazele (git pull --ff-only + prisma
    bayatlik kapisi + .env kopyasi) — ELLE degil, OTOMATIK

Yani klon güncel ve güncel KALIYOR; taşımanın önünde teknik engel yok.
⚠ Bedeli: günlükler klonun `raporlar/`ına taşınır (geçmiş dev ağacında
kalır, sürekliliği kopar) ve cmd'ye acil bir düzeltme artık 15 dakikalık
bekçi turu ister.

### ✅ KARAR — CMD PUSH KAPISINA ALINMADI (mimar, 08.09.2026)

**HAYIR.** Gerekçe: bu bir **orkestrasyon betiği**, deploy EDİLMİYOR ve canlı
çekim sürekliliği için **anında düzeltilebilir** olmalı. Push kapısı 15
dakikalık bekçi turu dayatır ve 5 dakikalık çekim ritmiyle çelişir —
arızanın ortasında 15 dakika beklemek, kapının önlediği riskten büyük bir
risktir. Çekim KODU zaten klondan koşuyor ve push korumalı; atlayan tek şey
cmd.

⭐ **KORUMA PUSH DEĞİL GÖZLEM** — ve üçü de 08.09'da kuruldu:

    1) ESIK        cekim yasi 4 x periyot (20 dk)          K189
    2) YARIM KOSUM kosum bitmediyse SONRAKI kosum soyler    K187
    3) OLUM ADIMI  .son-adim: NEREDE oldugu + cikis kodu    K191

Bu betikteki bir hata sessiz kalamaz; üçü birden görünür kılar.

⚠ **BU BİR MUAFİYET DEĞİL, BEYANDIR.** Kapının yokluğu unutulmuş değil,
**tartılmış** bir karardır ve bedeli (gözleme bağımlılık) hem burada hem
betiğin kendi başlığında yazılıdır. **Gözlem üçlüsünden biri kaldırılırsa bu
karar YENİDEN tartılır.**
_(Anayasa: "kapatma kararı da panoya yazılır — gerekçesiyle" ve "beyan
edilmemiş her kullanım hata sayılır".)_

---

## ✅ K190 — ÇAPA BEKÇİSİ: REAKTİF TARAMA KALICI ÖLÇÜTE ÇEVRİLDİ · 08.09.2026 · [KOD KOŞTU]

> **Mimar kararı 08.09:** _"19 mutasyon harness'inin `bul` deseni hedef
> dosyasında TAM BİR KEZ geçmeli. Sıfır = çapa kopmuş, çok = belirsiz çapa —
> ikisi de 'ölçülemedi' (geçti DEĞİL)."_

⛔ **NİYE:** bugün bir refaktör bir mutasyon harness'inin ÇAPASINI sildi ve
bu ancak **~15 dakikalık tam tur sonunda**, push reddedilerek görüldü.
Harness doğru davranmıştı (_"geçti"_ değil _"ÖLÇÜLEMEDİ"_ dedi); eksik olan
**hızdı**. Bu bekçi aynı ölçütü **saniyeler içinde** koşar — mutasyonları
UYGULAMAZ, yalnız çapaların yerinde olduğunu sınar.

    harness            19
    incelenen capa    222
    temiz             222
    sapan               0
    incelenemeyen       0
    capasiz             1   (yeni dosya yaratan mutasyon — capasi YOK)

### ⚠ ÖNCE ORTAK GÖVDE — 17. KOPYAYI YAZMAMAK İÇİN

`desenNormalle` (satır sonu normalleştirme) **16 harness'te ayrı ayrı**
yazılıydı. Ölçüldü: 15'i birebir aynı, biri (`toplu-kargo`) `replaceAll`
kullanıyor — **davranış aynı, yazılış farklı; ortada hata YOK.** Ama çapa
bekçisi harness'lerle AYNI ölçüyle saymak zorunda ve onu 17. kopya olarak
yazmak tam da bu bekçinin önlemek istediği şeyi üretirdi.
→ `scripts/mutasyon-deseni.ts` açıldı (`desenNormalle` + `desenAdedi`), 16
harness ona bağlandı, yerel kopya kalmadı.
_(Anayasa: "kopyası olan seçici ölçüt iki kat tehlikelidir".)_

### ⚠ AİLE TEK BİÇİMLİ DEĞİLDİ — VARSAYMAK YERİNE ÖLÇÜLDÜ

Bekçi yazılırken üç şekil ortaya çıktı ve **üçü de ölçümle** bulundu; hiçbiri
varsayılmadı:

| Bulgu | Ölçüm | Sonuç |
|---|---|---|
| **İki sözlük** | 18 harness `bul`/`koy`, `urun-analizi` `eski`/`yeni` | yalnız `bul` aransaydı o harness'in **18 çapası sessizce incelenmemiş** kalırdı |
| **Hedef öğede yok** | 5 harness (`aylik-marj` · `baglanti-tanisi` · `kart-partileri` · `lot-kipi` · `parti-bagi-tanisi`) hedefi modül düzeyindeki `GOVDE`den okuyor | `dosya` alanı hiç yok, geri düşüm gerekti |
| **`String.fromCharCode(10)`** | `panel-mutasyon`da 2 çapa satır sonunu kod noktasıyla kuruyor | bu deponun **kaçış-yutulması dersinden doğan deyimi**; çözücü bilmezse o çapalar incelenemez kalır |

⭐ **KAYNAK METİN TARANMIYOR, AST OKUNUYOR.** `bul` değerleri kaçış dizisi,
tırnak karışımı ve dize BİRLEŞTİRME içeriyor; metin taramak bunları yanlış
okur. TypeScript'in kendi ayrıştırıcısı dizenin **pişmiş** değerini veriyor,
`dosya` alanındaki sabit adları da aynı dosyadaki bildirimlerinden çözülüyor.
⛔ **Harness'ler İÇE AKTARILAMAZ** — modül yüklenince turu KOŞARLAR (üst
düzey çağrı, `main()` sarmalı yok). Değer okuma yolu bu yüzden AST.

### MUTASYON 7/7 KIRMIZI — VE İKİ TEŞHİS AYRI ÇIKIYOR

    ① capa hedeften SILINIR      KIRMIZI   tani: KOPMUS
    ② capa hedefte CIFTLENIR     KIRMIZI   tani: BELIRSIZ
    ③ /stok capasi kopar         KIRMIZI   (bugunku GERCEK vaka)
    ④ ikinci sozluk taninmaz     KIRMIZI   (incelenemeyen 18)
    ⑤ GOVDE geri dusumu kalkar   KIRMIZI
    ⑥ fromCharCode cozumu kalkar KIRMIZI
    ⑦ taban kapisi bosalir       KIRMIZI   (yalanci yesil tuzagi)

⚠ **①② İLK TURDA "UYGULANAMADI" DÖNDÜ** — mutasyonu yanlış hedef dosyaya
yazmıştım. Harness bunu **sonuç saymadı**; düzeltilip ısırdığı GÖRÜLDÜ.
⚠ **VE BEKÇİNİN KENDİ TABANI AYRICA KANITLANIYOR:** harness < 15 ya da çapa
< 100 ise sonuç GEÇERSİZ. Boş taban her koşulu geçirir ve o hâl sessizce
yeşil yanardı.

### ⚠ YAZARKEN KENDİ TUZAĞIMA DÜŞTÜM

Ortak gövdeyi çıkarırken kullandığım glob (`scripts/*mutasyon*.ts`) **yeni
yazdığım `mutasyon-deseni.ts`'i de yakaladı** ve gövdesini kendi içinden
söktü; `tsc` yakaladı. _(Anayasa: "ÖNCE DESENİ SAY" — glob de bir desendir.)_

Tur 116 → **117**. `bekci-yetim` yeşil (yetim 0).
**Halil testi gerekmiyor** — bu bekçi ekran çizmiyor, geliştirme kapısı.

---

## ✅ K121b — PASİFİ ELEME KARARI ÇAĞIRANA GEÇTİ · 08.09.2026 · [KOD KOŞTU]

> **Kullanıcı bulgusu (08.09):** _"/stok kanal-SKU dalı isActive'siz, ortak
> gövde isActive'li — aynı SKU iki yoldan farklı sonuç verebilir."_ Ve hüküm
> önerisi: _"pasif mal da rafta, okutunca görünmeli."_

⛔ **ORTAK GÖVDE, ÇAĞIRANI ADINA HÜKÜM VERİYORDU.** Üç gövde de
(`aramaKosulu` · `kodKosulu` · `kodKosuluToplu`) kanal kodu dalına
`isActive: true` koyuyordu. Bu K121 ilkesiyle çelişiyordu: fiziksel sayım
rafta NE VARSA onu kaydeder ve pasife alınmış mal da raftadır.

### ⚠ İLK TALİMAT ÖLÇÜMLE DÜZELTİLDİ

Mimarın ilk komutu _"sayım yoluna varyant düzeyi `isActive: true` ekle"_ idi.
Ölçüm bunun **niyetin tersi** olduğunu gösterdi: sayım yolunda varyant
süzgeci ZATEN yok ve eklemek `axcali2601`'i tamamen kapatırdı. Kodu eleyen
şey varyant süzgeci değil, **ortak gövdedeki LİSTİNG süzgeciydi**.
Talimat düzeltildi ve gerekçesini ölçümden aldı.
_(Anayasa: "mimar talimatları da bu süzgeçten geçer".)_

### ÖLÇÜM (canlı — `npm run canli:isactive-olcum`)

    varyant 1848 · PASIF 1        (axcali2601)
    listing 2230 · PASIF 1        (43217 -> axcali2601)
    pasif kod aktif bir yoldan zaten cozuluyor : 0
    YALNIZ pasif listingden cozulur            : 1   <- suzgecin eledigi
    CAKISMA (kod baska varyanta da gidiyor)    : 0

⭐ **ÇAKIŞMA SIFIR OLDUĞU İÇİN GÜVENLİ.** Ölçülmeseydi bilinemezdi: aynı
kodun iki varyanta gitmesi `findFirst`i belirsizleştirir ve sessizce YANLIŞ
ÜRÜNE yazardı.

### KURU KOŞUM (`npm run canli:k121-kuru`)

    ① SAYIM YOLU — kod "43217"
       ONCE : BULUNAMADI ⛔
       SONRA: axcali2601 (PASIF — ama rafta)     <- K121'in kendisi
    ② VARYANT SUZGECI KOYAN 5 CAGIRAN
       ONCE 0 sonuc · SONRA 0 sonuc              <- DEGISIKLIK YOK
    ③ BUTUN KATALOG (2230 listing)
       farkli cevap veren kod: 1  (43217: 0 → 1)
    ④ CAKISMA (kod → birden cok varyant): 0

### YAZILANLAR

**①** Üç ortak gövdeden listing süzgeci KALKTI. Ortak gövde artık kod çözer,
hüküm vermez — pasifi eleme kararı çağıranın ve bekçinin denetlediği bir
karar.

**②** Sayım yolunun duruşu **KODA BEYAN EDİLDİ**: _"`isActive: true` burada
BİLEREK yok"_ + gerekçe. Beyansız bir yokluk, altı ay sonra "unutulmuş" diye
düzeltilirdi.

**③** ⛔ **ÜÇ ESKİYEN ÖLÇÜT SUSTURULMADI, ÇEVRİLDİ** — `arama:dogrula`da bir,
`ice-aktarma:dogrula`da iki tanesi tam tersini sabitliyordu. Kod yanlış
değildi; KARAR değişti. Her birinde niye çevrildiği yazılı ve eski gerekçe
karar bloğunda duruyor. _(Anayasa: "bekçinin kırmızısı her zaman 'kod yanlış'
demez" — ve yapılmayacak şey ölçütü silmektir.)_

**④** **DESEN YASAĞI BEKÇİSİ:** ortak gövde dışında çıplak `channelSkus: {
some: { channelSku:` dalı yazılamaz. Çağıran listesi de **elle tutulmuyor** —
`src/` taranarak bulunuyor (bugün 6) ve taban doluluğu ayrıca ölçülüyor.
⚠ Kapsam `src/` ile sınırlı ve bu BİLEREK: `scripts/` altındaki içe
aktarmalar varyant düzeyinde SÜZMEMELİ — bir sipariş satırı pasife alınmış
listing'e atıfta bulunabilir ve süzen bir içe aktarma onu sessizce düşürür.

### ⚠ İKİ ŞEY TALİMATTAN FARKLI YAZILDI — İKİSİ DE ÖLÇÜMLE

**① 26.08 ATFI GEREKÇEYE GİRMEDİ.** Talimat _"26.08'de bu süzgeç 11
sipariş/₺27.807 düşürmüştü — kök sebep"_ diyordu. Ölçüldü
(`npm run canli:2608-olcum`):

    194645027819 · listing AKTIF · varyant axcali2755 AKTIF
    varyant alanlarinda (barkod/firmaSKU/SKU) bulunan: 0
    → isActive suzgeci o satiri HIC ELEMIYORDU

O kaybın sebebi **alan eksikliğiydi** (`channelSku` hiç aranmıyordu) ve kod
yorumumuz da bunu yazıyor. İzlerde bu süzgecin fiilen bir satır düşürdüğüne
dair kayıt YOK. İçe aktarma faydası **ileriye dönük** olarak yazıldı — ama
hayalî değil: `kodKosuluToplu` beş canlı içe aktarmada kullanılıyor
(TY · HB · N11 · alış · satış).
⚠ **Yanlış emsale dayanan bir bekçi gerekçesi, emsal çürüdüğü gün kararı da
yeniden açtırır.** _(Anayasa: "denetim için 'ne oldu' doğru referanstır".)_

**② BEKÇİ İLK KOŞUMDA ÖLÇMEDİĞİM DÖRDÜNCÜ BİR DAL BULDU.** Kanal-SKU dalı
bugün ortak gövde dışında ÜÇ yerde ayrı yazılı ve **üçü de farklı
davranıyor**:

    /stok:400          pasifi GETIRIYOR    (isActive yok)
    /urunler:85        pasifi GETIRIYOR    (isActive yok)
    lib/iade/arama:67  pasifi ELIYOR       (isActive: true)
    ortak govde        karari CAGIRANA birakiyor

Üçü de bekçide **beyanlı istisna** olarak duruyor — beyan onları
MEŞRULAŞTIRMIYOR, dördüncüsünün sessizce doğmasını engelliyor.
→ **K121c açıldı** (mimar kararı 08.09: üçü de ortak gövdeye bağlanacak;
iade aramasının davranışı değişeceği için önce kuru koşum).

### BEKÇİ · MUTASYON 8/8 KIRMIZI

    ① kodKosulu suzgeci GERI gelir              KIRMIZI
    ② kodKosuluToplu suzgeci GERI gelir         KIRMIZI
    ③ aramaKosulu suzgeci GERI gelir            KIRMIZI
    ④ sayim yoluna varyant suzgeci EKLENIR      KIRMIZI
    ⑤ sayim yolundaki BEYAN silinir             KIRMIZI
    ⑥ oteki cagiran suzmeyi birakir             KIRMIZI   (ters yon)
    ⑦ cagiran taramasi bosaltilir               KIRMIZI   (bos taban)
    ⑧ BEYANSIZ yeni ciplak kanal-SKU dali       KIRMIZI

`arama:dogrula` 121/121 · `ice-aktarma:dogrula` 419/419 · `tsc` temiz.

**Halil test listesi:** ① `/okut` → sayım oturumu aç → `43217` okut →
`axcali2601` satırı gelmeli (önce "bulunamadı" diyordu). ② `/stok`'ta
`43217` ara → sonuç değişmemeli. ③ `/urunler`'de aynı kod → değişmemeli.

### ✅ K121c — ÜÇ ÇIPLAK DAL ORTAK GÖVDEYE BAĞLANDI · 08.09.2026 · [KOD KOŞTU]

_K121b'nin devamı. Ayrı satır açılmadı: kimlik K121'in kendisine ait._

⛔ **K121b'nin BEKÇİSİ BU İŞİ AÇTI.** Desen yasağı ilk koşumunda, benim
ölçmediğim bir dal buldu: `lib/iade/arama.ts:67`. O gün tablo şuydu —
kanal kodu dalı ortak gövde DIŞINDA **üç yerde** elle yazılıydı ve **üçü de
farklı davranıyordu**:

    /stok:400          pasifi GETIRIYOR   (isActive yok)
    /urunler:85        pasifi GETIRIYOR   (isActive yok)
    lib/iade/arama:67  pasifi ELIYOR      (isActive: true)

_(Anayasa: "aynı işlem her ekranda aynı görünür ve aynı çalışır" — bugün
çalışmıyordu ve bunu bir insan değil, ölçüt söyledi.)_

### KURU KOŞUM (`npm run canli:k121c-kuru`)

    taban: iade kaydi 224 · pasif listing 1
    ① IADE ARAMASI  43217 → axcali2601   ONCE 0 · SONRA 0
       → ETKILENEN IADE KAYDI: 0
       (axcali2601: satis kalemi 0 · iade kalemi 0)
    ② /stok    78 kod · FARK 0 ✓
    ③ /urunler 78 kod · FARK 0 ✓ · marka dalini tetikleyen kod 12 ✓

⭐ **DEĞİŞİKLİK İLKECE GERÇEK, DEFTERDE KARŞILIĞI SIFIR** — ve bu "etkisiz"
diye yazılmıyor: bugün 0, kapatılan ilk ilanda 1.

### MİMAR HÜKMÜ — İADE PASİFİ GETİRİR

İade araması **geçmiş bir olayın KAYDINI** arar, canlı bir ilanı değil.
Süzgeç şunu yapıyordu: _geçen ay aldığın iadeyi, bugün o pazaryeri ilanını
kapattığın için kanal koduyla bir daha bulamazsın._ Kayıt yerinde durur,
arama görmez; kayıp **sessizdir**.
⚠ Ve süzgecin **kendi gerekçesi yoktu**: kodda _"(`aramaKosulu` ile aynı
gerekçe)"_ yazıyordu — devralınmıştı, ve devraldığı gerekçe K121b'de düştü.

### YAZILANLAR

**①** `kanalKoduDali(e)` — kanal kodu dalı TEK YERE çıktı. Üç ekran onu
kendi şekliyle SARMALIYOR (`/stok` varyant · `/urunler` ürün · iade
araması iade); yazdıkları şey artık dalın kendisi değil.

**②** `/stok` → `OR: ortakAramaKosulu(arama)` (beş dal birden ortak
gövdeden). `/urunler` → varyant dalları sarmalanarak; **`name` ve `brand`
ÜRÜN düzeyinde KALDI** — ikisi ürünün alanı, varyantın değil ve sarmalanmış
bir ad araması varyantı olmayan bir ürünü sessizce düşürürdü (bugün öyle
ürün yok — 1837'de 0 — ama bunu bugünün ölçümüne bağlamak yarını garanti
etmez).

**③** ⛔ **DÖRDÜNCÜ ESKİYEN ÖLÇÜT ÇEVRİLDİ** (`rma:dogrula`): _"kanal SKU da
aranıyor (yalnız AKTİF eşleşme)"_ → _"(pasif eşleşme DE gelir)"_, gerekçesi
ve eski hâli yazılı. Susturulmadı.

**④** ⭐ **İSTİSNA MEKANİZMASI LİSTEDEN BEYANA ÇEVRİLDİ — VE BU BİR
DÜZELTMEDİR.** K121b'de yasak yol listesiyle geliyordu (`stok` · `urunler` ·
`iade/arama`) ve bu **tam da yasakladığımız desendi**: dördüncü ekran
listeye yazılmazsa sessizce geçerdi. Artık ölçüt şunu soruyor — **ya süz, ya
NİYE süzmediğini DOSYANDA yaz** (`PASİF DAHİL:` + gerekçe). Üç ekran duruşunu
kendi dosyasında beyan etti: sayım (fiziki varlık esas) · `/stok` (stok
ekranı, pasif mal da rafta) · `/urunler` (yönetim ekranı, pasif ürün rozetle
durur).

### ⚠ ÖLÇÜTÜN KENDİSİ İKİ KEZ KÖR ÇIKTI — İKİSİ DE MUTASYONLA BULUNDU

**① TAKMA AD KAÇIYORDU.** `/stok` gövdeyi `aramaKosulu as ortakAramaKosulu`
diye alıyor; `aramaKosulu(` arayan ölçüt onu **hiç görmüyordu** ve yeşil
kalıyordu. Küçük harfe indirgemek çare olmadı — bu kez `iadeAramaKosulu(`
gibi BAŞKA adların sonu eşleşti ve altı dosya yanlışlıkla "beyansız" çıktı.
**Doğru ölçüt: yerel adı dosyanın kendi İTHAL SATIRINDAN oku.** Körlüğün
kendisi de ölçülüyor artık (_"takma adla çağıran ekran da taranıyor"_).

**② SÖZCÜK SINIRI YOKTU.** Ağı genişletmek yanlış şeyleri de içeri aldı;
sınır konuldu. _(Anayasa: "ÖNCE DESENİ SAY".)_

### BEKÇİ · MUTASYON 11/11 KIRMIZI

    ①②③ uc ekrana ciplak dal geri gelir          KIRMIZI ×3
    ④   ortak govdeye isActive geri gelir         KIRMIZI
    ⑤⑥  /stok ve /urunler beyani silinir          KIRMIZI ×2
    ⑦   suzen cagiran (yerlestir) suzmeyi birakir KIRMIZI  (ters yon)
    ⑧   cagiran taramasi bosaltilir               KIRMIZI  (bos taban)
    ⑨   ithal-adi cozumu bozulur                  KIRMIZI  (takma ad korlugu)
    ⑩   iade dalina isActive geri gelir           KIRMIZI
    ⑪   iade kanal dali tamamen silinir           KIRMIZI

`arama:dogrula` 123/123 · `rma:dogrula` 541/541 · `ice-aktarma:dogrula`
419/419 · `suzgec` · `stok-siralama` · `panel` yeşil · `tsc` temiz.

**Halil test listesi:** ① `/stok`'ta bir kanal kodu ara → eskisi gibi
gelmeli. ② `/urunler`'de aynı kod → değişmemeli. ③ `/iadeler`'de bir kanal
kodu ara → iade kaydı gelmeli (pasif ilan da artık bulunur).

---

## ✅ K189 — ÇEKİM SESSİZCE 69 DAKİKA DURDU · 08.09.2026 · [KOD KOŞTU]

> **Kullanıcı bulgusu:** _"Bunlar neden düşmedi, bir arıza mı var yoksa
> yazıyor olmandan mı kaynaklı?"_ (12:02'de gelen iki TY siparişi)

### ① TEŞHİS — arıza, ve benim yazımım değil

    BASLADI-SIK 08.09.2026 11:07:02  hazirlik=0
    ^CBatchvorgang abbrechen (J/N)?          ← CEVAP BEKLIYOR

Konsol penceresinde **Ctrl+C**'ye basılmış; cmd _"Toplu işi sonlandır
(E/H)?"_ diye sordu ve batch orada asılı kaldı. Görev `IgnoreNew` taşıdığı
için 11:12'den itibaren gelen **her koşum reddedildi** (`-2147020576`).
**69 dakika** hiçbir kanal çekilmedi; o pencerede 6 sipariş bekledi.
Asılı süreç (PID 9312) sonlandırıldı, iki sipariş 12:16'da düştü.

⛔ **VE KİMSE SÖYLEMEDİ — arızayı kullanıcı GÖZÜYLE yakaladı.** İki ayrı
kusur birlikte çalıştı ve ikisi de bu sabahki kendi işimden doğdu.

### ② KUSUR 1 — EŞİK RUTİNE BAĞLI DEĞİLDİ

`TY_CEKIM_ESIK_SAAT = 26` ve gerekçesi kendi yorumunda yazılıydı: _"rutin
GÜNLÜKTÜR (24 saat) + 2 saat pay."_ **K187 rutini 5 dakikaya çekti, eşik
güncellenmedi.** 69 dakika = 1,15 saat → rozet kesinti boyunca **YEŞİL**.
_(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_

**ÇARE SAYIYI DÜZELTMEK DEĞİL, EŞİĞİ RUTİNE BAĞLAMAK:**

    CEKIM_PERIYODU_DK = 5                    ← TEK KAYIT YERI
    CEKIM_ESIK_DK     = 4 * CEKIM_PERIYODU_DK = 20 dk

Çarpan **ölçülerek** seçildi (128 aralık): gövde `5,0–6 dk`da kapanıyor,
sonra `38`e sıçrıyor — eşik o gediğe kondu. `1 × periyot` gövdenin İÇİNDE
yanardı, `10 ×` bugünkü kesintiyi kaçırırdı.

⭐ **ÜÇ KANAL DA ÖLÇÜLÜYOR.** Rozet yalnız TY'ye bakıyordu; K187 aynı göreve
HB ve N11'i de eklemişti. Artık üçünün **EN KÖTÜSÜ** çiziliyor — "en yeni"ye
bakan bir rozet iki kanal ölse bile yeşil kalırdı. Sıra `YOK > ESKİ > TAZE`.

**BEKÇİ:** eski ölçüt `TY_CEKIM_ESIK_SAAT === 26` idi ve **sayıyı**
sabitliyordu; yenisi **türetmeyi** sabitliyor (`CEKIM_ESIK_DK === 4 ×
CEKIM_PERIYODU_DK`) — periyot bir daha değişirse eşik onunla yürür.
10 ölçüt, aralarında _"08.09'daki 69 dk'lık kesinti ARTIK yakalanıyor"_.

### ③ KUSUR 2 — SESSİZ REDDETME (kök sebep)

Ölçüldü:

    ExecutionTimeLimit : PT72H    ← asili kosum UC GUN engelleyebilirdi
    Hidden             : False    ← gorunur pencere = Ctrl+C daveti
    MultipleInstances  : IgnoreNew

⭐ **MİMARIN (a)/(b) İKİLİSİNDEN FARKLI, ÜÇÜNCÜ YOL — VE İKİSİNİ BİRDEN
KAPATIYOR.** (a) "Ctrl+C yutulsun" batch'te güvenilir değil; (b) `Parallel`
veri yarışı, `Queue` gecikme biriktirir. Doğru cevap **tetiği kaldırmak +
kapsamayı sınırlamak**:

| ne | eski | yeni | gerekçe |
|---|---|---|---|
| `Hidden` | False | **True** | pencere yoksa Ctrl+C vektörü de yok |
| `ExecutionTimeLimit` | PT72H | **PT4M** | asılı örnek bir sonrakini engelleyemez |
| `MultipleInstances` | IgnoreNew | IgnoreNew | süre sınırıyla artık GÜVENLİ |

**PT4M ölçülerek seçildi** (999 koşum): `ortanca 10 sn · p95 28 · max 176 sn`.
Aralık 300 sn → gedik `176…300`. 240 sn, gözlenen en uzun koşumun **1,36
katı** ve aralığın 60 sn altında.

### ④ GÖRÜNÜRLÜK — yarım koşum işareti

Reddetme Görev Zamanlayıcı'da olur, betik onu göremez. **Ama yarım kalan
koşumu BİR SONRAKİ koşum görebilir:** işaret dosyası başlangıçta yazılır,
temiz bitişte silinir; duruyorsa **üç loga da** uyarı düşer.

    !! ONCEKI KOSUM YARIM KALDI - baslangici asagida:
    08.09.2026 11:07:02,23

⛔ **VE İLK YAZIMIM BOZUKTU — YAZILIYOR.** `for /f … do set ONCEKI` +
`%ONCEKI%` kullanmıştım; batch blok içinde `%VAR%`ı AYRIŞTIRMA anında okur ve
değişken henüz atanmamıştır. Uyarı düştü ama **tarihi BOŞ** çıktı: "yarım
kaldı" diyor, ne zamandan beri demiyordu. _(Anayasa: "hata mesajını kısaltan
her işlem teşhisi kısaltır".)_ Çare `type` ile dosyayı doğrudan dökmek.

**BEKÇİ + ÜÇ MUTASYON:** uyarıyı silen · işaret silmeyi kaldıran · gecikmeli
genişletme tuzağını geri getiren → **üçü de KIRMIZI**, doğru ölçütle.

⚠ **BEYAN EDİLEN SINIR:** `ExecutionTimeLimit` ve `Hidden` Görev Zamanlayıcı
ayarıdır, depoda yaşamaz ve bekçi ölçemez. `.cmd` başlığı ikisini de
gerekçesiyle yazıyor; bekçi yalnız **beyanın yerinde durduğunu** sınıyor.

---

## ✅ K188-④ — LAMBORGHINI ZİNCİRİ TAMAMLANDI (4/4) · 08.09.2026 · [KOŞTU — canlı]

> **Mimar+Halil onayı 08.09, dört adım.** Üçüncü adım deponun kendi kuralına
> takıldı; kapı **gevşetilmedi**, eksik olan ısrar yolu eklendi (K188-⑤) ve
> zincir ondan sonra tamamlandı.

### SONUÇ — ÜÇ DEFTER DE 1

    2025-07-13 PURCHASE_IN       +1 · 1.599,92   ← faturali alim, karta bagli
    2026-08-11 SALE_OUT          −1 · 1.599,92   ← satis onayi (FIFO bu partiden)
    2026-08-17 RETURN_IN         +1              ← iade NORMAL
    2026-08-29 COUNT_CORRECTION  +1 · 1.582,00
    2026-08-29 ADJUSTMENT        −1 · 1.582,00   ← sayim vekili notrlendi
    ─────────────────────────────────────────────
    LEDGER 1  ·  FIFO 1  ·  FIZIKSEL 1     ✓

    satis  2026-08-11 · CALCULATED · NET-1 766,48 · NET-2 634,43
    iade   2026-08-17 · NORMAL · atif 2026-08 = satisin ayi (K185-③) ✓

⭐ **NET-1 766,48 — ölçüm turundaki projeksiyonla KURUŞUNA aynı.** Projeksiyon
maliyeti 1.599,92 varsayarak kurulmuştu; motor aynı rakamı üretti.

### ① MALİYET — sapma 17,92

    kart 1.582,01 + Hepsipay 17,91 = 1.599,92     (fatura HD22025000334550)
    defterdeki eski rakam           1.582,00      ← yalniz kart, o da 1 kurus eksik

Alım `ALM-K188-4707418677` · 11.07.2025 (teslim 13.07) · Sip.Ref 4041064539 ·
Ziraat *3253, 2 taksit → kart borç takibine girdi.

### ② ÇİFT SAYIM ÖNLENDİ — VE ÇARE TERS KAYIT

29.08 `COUNT_CORRECTION` bir stok hatası değil, **eksik tarihçenin vekiliydi**
(kendi notu: _"Defter 0, sayılan 1"_). Gerçek tarihçe yazılınca bırakılsaydı
aynı mal iki kez sayılırdı. Kayıt **silinmedi**, ters işaretli `ADJUSTMENT`
ile nötrlendi ve **partiye bağlandı** (`sourceMovementId`) — bağlanmasaydı
ledger 1 derken FIFO 2 kalırdı ve hiçbiri hata vermezdi.

### ③ SAYIM KAPISI — İKİ KEZ TETİKLENDİ, İKİSİ DE İZLİ GEÇTİ

Satış `SALE_OUT` (11.08) ve iade `RETURN_IN` (17.08) — ikisi de 29.08 sayım
damgasından ÖNCEYE düşüyor. Israr gerekçesi ikisinde de aynı gerçeğe dayandı:
**zincirin net sayım etkisi 0 ve 29.08 sayımıyla tutarlı (rafta 1).**

    SAYIM_KORUMASI_ISTISNASI izi: 2   (onay + iade)
    sayimGecersizAt damgalandi        → varyant yeniden sayilmali

### ④ BAŞKA VARYANTA DOKUNULMADI — ÖLÇÜLDÜ

Bugün yazılan 30 stok hareketi atfedildi:

    K188 zinciri            5   (axcali2399 ×4 + axcali2383 iptali ×1)
    otomatik cekim/onay    25   (5 dakikalik cron)

⚠ **Genel sayaçlarla değil, hareket bazında atıfla ölçüldü** — canlı bir
sistemde toplamlar cron yüzünden sürekli oynuyor ve temiz kanıt vermiyor.

### ⑤ ⏭ TARİHLİ TETİKLEYİCİ (mimar) — SÜRESİZ AÇIK NOT DEĞİL

Kanal talebi **hâlâ `ClaimCreated`** (08.09 itibarıyla) ve defter iadeyi
tamamlanmış yazdı; mal 29.08 sayımında rafta görüldüğü için bu **bilinçli
bir ayrışma** ve `Return.note`a damgalandı.

> **HB talebi `4707418677` kapandığında sonuç defterle karşılaştırılır —
> RED çıkarsa iade kaydı geri alınır, mal rafta + satış geçerli olur.**

Tetikleyici bir TARİHE değil, **kanalın talebi kapatmasına** bağlı.

---

## ✅ K188-⑤ — ONAY YOLUNA SAYIM ISRARI EKLENDİ · 08.09.2026 · [KOD KOŞTU]

> **Tespit (mimar):** _"`israrGecerliMi` + `sayimGecersizlestir` mal-kabul ve
> stok-düzeltme ekranlarında VAR, onay yolunda YOK — aynı ilkenin üç yerinden
> ikisinde. Simetri tamamlanır."_

⛔ **ESKİ GEREKÇE ÇÜRÜDÜ VE SİLİNMEDİ.** Çekirdekte şu yazılıydı: _"canlı
akışta soldAt bugündür ve duraksama tetiklenmez; tetiklenirse bu bir sinyaldir
ve kayıt REDDEDİLİR."_ Öncül ölçümle çürüdü — geçmiş bir siparişin API'den
GEÇ yazılması gerçek ve tekrarlanan bir akış. Kayıt reddedilince satış onay
kuyruğunda **kapatılamaz** bir madde olarak kaldı (K49).

⭐ **KAPI GEVŞEMEDİ, KAPIYA KAPI EKLENDİ.** Israr verilmezse davranış
**birebir** eskisi (`SAYIM_DURAKSADI`). Otomatik onay ısrar geçirmez — istisna
her zaman bir İNSAN kararıdır. Geçen her ısrar İKİ şey birden yazar:
`sayimGecersizAt` damgası (ekranda görünsün, yeniden sayılsın) **ve**
`SAYIM_KORUMASI_ISTISNASI` izi (kim · ne zaman · hangi damga · gerekçe),
**aynı işlemde** — yazım geri alınıp iz kalmasın.

**BEKÇİ — 11 ÖLÇÜT, İKİ YÖNLÜ MUTASYON:**

    ① israrsiz cagri da geciyor      → ✗ "ısrarsız çağrı kapıyı YİNE durduruyor"
    ② israr geciyor ama iz yok       → ✗ "İZ yazılıyor" + 4 alan olcutu

İkisi de kırmızı yandı ve **tam doğru ölçütle** yakalandı.

---

## ✅ K188-② — MÜKERRER HB KAYDI TEMİZLENDİ (2/2) · 08.09.2026 · [KOŞTU — canlı]

> **Vaka:** aynı HB siparişi defterde İKİ kez duruyordu. Elle giriş (satış
> Excel'i) sipariş numarası yerine **başka bir ürünün kanal SKU'sunu**
> (`HBCV00009ULMCL`) kod olarak kullanmış; çakışma kontrolü `Sale.code`
> üstünden baktığı için iki kod çakışmamış. Ciro **₺5.979 çift sayılıyordu.**

### SONUÇ — TARİHÇE TEK HİKÂYE OKUYOR

    2026-08-10 PURCHASE_IN     +1 · 4.220,85
    2026-08-10 SALE_OUT        −1 · HBCV00009ULMCL (IPTALLI)
    2026-08-10 SALE_CANCEL_IN  +1 · 4.220,85        ← tarihi duzeltildi
    2026-08-10 SALE_OUT        −1 · 4873413946      ← gercek siparis
    ─────────────────────────────────────────────────
    LEDGER 0  ·  FIFO 0  ·  FIZIKSEL 0        ✓
    iptalsiz ciro 5.979,00 (tek kez) · mukerrer ₺5.979 gitti
    satis CALCULATED · NET-1 715,17 · NET-2 587,67 · FIFO maliyeti 4.220,85

### ① İPTAL — ve mekanizma K180 DEĞİLDİ

Mimar _"K180 kaldırma"_ demişti; **uygulanamadı ve sessizce uygulanmadı**:
K180'in `SON_KALEM` kapısı var, `HBCV00009ULMCL` tek kalemli. Niyeti karşılayan
yol deponun zaten sahip olduğu **satış iptali** oldu (önizle → imza → uygula),
ve anayasanın kendi cümlesi bunu söylüyor: _"İptal aynı sonucu verir — kayıt
ciroya/NET'e/hakedişe girmez, stok DOĞRU döner, geri alınabilir ve iz bırakır."_
Sebep kapalı kümede "mükerrer" değeri yok; `MAGAZA_DIGER` seçildi ve **notta
gerçek yazıldı**: sipariş iptal edilmedi, müşteri malı aldı.

### ② TARİH DÜZELTMESİ — DAR İSTİSNA, ÜÇ ŞARTLA

İptal partiyi AÇMADI: ledger disiplini gereği eski çıkışı yerinde bırakıp
**bugün tarihli** bir giriş yazdı. FIFO'nun `gunSonu(soldAt)` sınırı (K79) 10.08
satışı için 08.09 tarihli partiyi göremiyordu.

⛔ **KOŞUL A DEVREYE GİRDİ VE DURDUM:** zincirin net stok etkisi 0 olmalıydı,
+1 çıktı. Halil'e soruldu — **raf BOŞ**. Yani bugünkü tarih _"bugün rafa bir
adet geldi"_ diyordu ve bu iddia yanlıştı.

Metadata istisnasının üç şartı da sağlandı:

    ① degisen alan MIKTAR/PARA degil — yalniz occurredAt
    ② alternatifler OLCULUP ELENDI:
         ekran yolu YOK · iptali geri alma YOK (cift sayimi geri getirir)
         ADJUSTMENT -1 → satis SONSUZA KADAR maliyetsiz + kuyrukta (K49)
         FIFO sinirini gevsetme → K79: defterin %48,72'sini kilitler
    ③ iz eski VE yeni degerle yazildi (K188_IPTAL_TARIHI_DUZELTILDI)

⭐ **YENİ TARİH UYDURULMADI:** hareketin **tersini aldığı çıkışın tam anı**
(`cmtcugsb`, 2026-08-10T00:00:00Z). Betik o **tek hareketin kimliğine kilitli**
ve kimlik/tip/adet/SKU dördünü birden doğrulamadan yazmıyor — genel araç
değil, çünkü genel araç istisnayı kurala çevirir.

### ③ ONAY — ısrar GEREKMEDİ ve yazılmadı

Braun'un sayım damgası **hiç yok** (bu varyant hiç sayılmamış), yani kapı
zaten `SERBEST`. Lamborghini'de açtığım ısrar yolu burada **kullanılmadı** —
gerekmeyen bir istisna yazmak, istisnayı ucuzlatırdı. Ölçüldü: `SAYIM_KORUMASI_ISTISNASI` izi **0**.

### ④ DEĞİŞMEZLİK TURU

    LEDGER 0 = FIFO 0 = FIZIKSEL 0            ✓
    FIFO maliyeti 4.220,85                    ✓ mimarin bekledigi rakam
    iptalsiz ciro 5.979,00 — tek kez          ✓
    son 30 dk'da dokunulan varyant: axcali2383 (1 hareket) — baska YOK ✓

⚠ **BRAUN'DA İADE YOK** — Lamborghini'den farkı bu: mal satıldı ve gitti,
o yüzden beklenen son durum **0**, 1 değil.

---

## ✅ K188-③ — "3 SİPARİŞ BEKLİYOR" ROZETİ LİSTEYLE AYRIŞIYORDU · 08.09.2026 · [KOD KOŞTU]

> **Kullanıcı bulgusu:** _"Burada 3 sipariş bekliyor diyor, tıklayınca 13
> sipariş çıkıyor — doğrusu da 13 zaten."_

### ① ÖLÇÜM — ROZET EKRANDAKİYLE BİREBİR, YANİ RAKAM DEĞİL SORU YANLIŞTI

    LISTE (KARGO_BEKLEYEN + iptalsiz)  14      ← ekrandaki 13 + o an gelen 1
    ROZET (kargoHali)                   3      ← ekranla BIREBIR
       GOREV 3  ·  CIKMIS 7  ·  BILINMIYOR 4   → 3+7+4 = 14

Rozet doğru hesaplanıyordu; **yanlış soruyu** cevaplıyordu. Fark iki ayrı
kusurdan geliyordu ve ikisi de ayrı derslerin ihlaliydi:

**(a) BILINMIYOR 4 — KARARIN KAPSAMI EKSİK UYGULANMIŞ.** Dördü de onaylanmış
API siparişi. K164 kararı (_"onaylanınca kargo bekleyen kümesine GİRER"_)
`KARGO_BEKLEYEN` gövdesine uygulanmış, `kargoHali`'ye **uygulanmamıştı.**

**(b) CIKMIS 7 — ALANIN DOLULUĞU OLAY SAYILMIŞ.** `shipmentCode` dolu diye
"çıkmış" sayılıyorlardı. Ölçüm çürüttü:

    ice aktarilan satis 7651 · gonderi numarasi DOLU 476
                               bunlarin shippedAt'i DOLU  45
                               → numara var, kargo tarihi YOK: 431

Canlı TY çekimi **her yeni siparişe** numara yazıyor, sipariş daha depodayken.
Bu, K60-②'nin ta kendisi (_"alanın dolu olması, olayın gerçekleştiğini
göstermez"_) — kural anayasada yazılıydı ve bu satır onu çiğniyordu.

### ② ÇARE DALLARI YAMAMAK DEĞİL, TEK GÖVDE

`kargoBekliyorMu` saf yüklemi **zaten vardı** (`kargo-bekleyen.ts`) ve
`KARGO_BEKLEYEN` ile aynı anlamı taşıyordu; `kargoHali` onu kullanmıyordu.
Artık kullanıyor — _"bu sipariş kargo bekliyor mu"_ sorusunun tek sahibi var.
_(Anayasa: "aynı soruya iki cevap yasak".)_

    LISTE 17  ·  ROZET 17      → SAYI = LISTE ✓  (canlı, gövde çağrılarak)
    diger kovalar: CIKMIS 319 · BILINMIYOR 4619

⚠ **ÜÇÜNCÜ HÂL KALKMADI, TANIMI DÜZELDİ:** BİLİNMİYOR artık _"içe aktarılmış
ve HENÜZ ONAYLANMAMIŞ"_ — tarihsel defterin kendisi. Kargo numarasının
varlığına değil, onayın YOKLUĞUNA bakıyor.

⚠ **`PanelKargosu.shipmentCode` KALDIRILDI** — yerine `onaylandiAt`. Alan
panelde yalnız `kargoHali` tarafından okunuyordu ve tipin yorumu ölçümle
çürüyen iddiayı taşıyordu (_"numara varsa paket fiilen çıkmıştır"_). Eski
gerekçe silinmedi, **niye çevrildiğiyle birlikte** yerinde duruyor.

### ③ ⛔ İKİNCİ BULGU — "EKRANDA YAZAR" İDDİASI YANLIŞTI

`kargoHali`'nin belgesi şunu söylüyordu: _"üçüncü hâl kaybolmaz: ayrı sayılır
(`kargoBilinmiyorAdet`) ve **ekranda YAZAR**."_ Ölçüldü: o alan **hiçbir
bileşende kullanılmıyor** — hesaplanıp `panel.ts` içinde kalıyor. Yani
kaybolmasın diye açılan kova **kayboluyordu** ve yorum tersini söylüyordu.
_(Anayasa: "doğru davranışın GÖRÜNMEZLİĞİ de yalancı yeşildir".)_

İddia düzeltildi. ⏭ **EKRANA BAĞLANMASI AYRI KARAR VE AÇIK:** küme bugün
**4619 kayıt** (tarihsel defter) ve bu bir GÖREV değil KAYIT — uyarı kutusuna
konursa kapatılamayan madde üretir (K49). Yeri ve biçimi mimarın kararı;
sessizce bir rozet konmadı.

### ④ BEKÇİ — ESKİYEN ÖLÇÜTLER GÜNCELLENDİ, SUSTURULMADI

Üç ölçüt kırmızı yandı ve **haklıydılar**: adları eski kuralı taşıyordu
(_"görev YALNIZ elle girilen"_ · _"içe aktarılmış + numara var = CIKMIS"_ ·
_"kargo numarası olan hiçbir kovaya girmiyor"_). Üçü de kodun O GÜNKÜ
davranışını sabitliyordu, kuralı değil — yani düzeltmeye kalkanın karşısına
kırmızı yanarak çıktılar. _(Anayasa: "bekçi ölçütü kuralı sabitler,
davranışı değil".)_

**YENİ ÖLÇÜTLER:** rozet ile listenin AYNI cevabı verdiği **dört
kombinasyonda birden** sınanıyor; üç kaydın üçünün de bir kovaya düştüğü
ayrıca ölçülüyor (eskiden "numaralı" kayıt hiçbir kovaya girmiyor, yani
sessizce düşüyordu). **İki mutasyon, ikisi de kırmızı:** onay damgasını yok
sayan (eski kusurun geri gelmesi) · her şeyi GOREV sayan (yanlış yanma).

---

## ✅ K188 — STOK ARAMASI SİPARİŞ NUMARASINI DA EŞLEŞTİRİYOR · 08.09.2026 · [KOD KOŞTU]

> **Kullanıcı isteği:** _"Stoktaki arama butonu sipariş numarasını da
> eşleştirebilsin — 4864776792 · 4825253981."_

### ① ÖLÇÜM — ŞİKÂYET DOĞRU, VE SEBEBİ BİLGİ EKSİKLİĞİ DEĞİL

    "4864776792"   ESKI   0 varyant  →  YENI   1   axcali2850 · Ottawa Tencere Seti
    "4825253981"   ESKI   0 varyant  →  YENI   1   KUC-PH-1200W-01 · Philips Blender

Bilgi sistemde VARDI: ikisi de tek satışa ve tek varyanta çözülüyor,
varyantlar aktif. Ekran susmuyor, **yanlış cevap** veriyordu — "böyle bir
şey yok" diyordu. _(K100'ün aynısı: baştaki sıfır vakasında da bilgi vardı,
arama sormuyordu.)_

### ② İKİ ADIM ZORUNLU — VARYANT KOŞULUNA YAZILAMAZ

Sipariş numarası bir **SATIŞ kimliği** (`Sale.code`); `ProductVariantWhereInput`
içine konamaz. K41①'de aynı sınır gönderi numarası için ölçülmüştü. Çözüm:
`satis-kodundan-varyant.ts` — kimliği önce varyant kimliklerine çevirir,
sonra `id: { in: … }` olarak OR'a girer.

⭐ **TAM EŞLEŞME, KISMİ DEĞİL.** `satisKodKosulu` iki alanı da `@unique`
olduğu için tam eşleştirir. Kısmi eşleşme ilgisiz bir siparişin ürününü stok
listesine sokardı ve kullanıcı onu aradığı ürün sanardı. Ölçüldü: `"48252"`
→ 0 (ve öyle kalması DOĞRU).
⚠ **NORMAL ARAMA HİÇ DEĞİŞMEDİ:** `"Anker"` 85 → 85. Küme boşken satış dalı
**hiç eklenmiyor** — koşul sessizce genişleyemez.

### ③ İKİ EKRAN BİRDEN — VE BU BİLEREK

Kullanıcı `/stok` dedi; `/urunler` de aynı gövdeye bağlandı. Gerekçe kodun
içinde zaten yazılıydı: kanal SKU'su 12.08'de `/urunler`de düzeltilip
`/stok`ta unutulmuştu ve kullanıcı iki gün sonra bulmuştu. Yalnız `/stok`a
eklemek aynı hatayı **ayna simetrisiyle** tekrarlardı (İlke #10).

### ④ ⛔ YAN BULGU — ROL BEYAN EDİLMEMİŞTİ, İKİ YERDE SESSİZ KUSUR

`code` (sipariş numarası) **zaten aranıyordu** (`satisKodKosulu` · `/satislar`
süzgeci · `/okut`) ama `KOD_ROLLERI`'nde yoktu. Liste kendi _"TEK KAYIT YERİ"_
sözünü tutmuyordu ve bunun iki ölçülebilir bedeli vardı:

· `SATIS_ROLLERI.length === 1` ölçütü **yanlış bir şeyi sabitliyordu** —
  beyanı eklemeye kalkanın karşısına kırmızı yanarak çıkardı;
· `/okut` sipariş numarasıyla okutulan siparişi **buluyor** ama _"hangi alan
  eşleşti"_ sorusuna **`null`** dönüyordu; ekran bulduğu kodu adlandıramıyor,
  depocu hangi kâğıdın tuttuğunu göremiyordu. O satırın kendi yorumu bunu
  zaten söylüyordu ve dal onu tutmuyordu.

Rol beyan edilince `alanAdi` **derlenmedi** — exhaustive `Record` sözünü
tuttu ve eksik etiketi kendisi gösterdi (`alanCode`, iki sözlüğe de eklendi).

### ⑤ BEKÇİ — 7 MUTASYON, HEPSİ KIRMIZI

Saf parçalar (`satisAramasiHazirla` · `varyantIdleriniTopla`) **değerle**
sınanıyor, kaynak taranmıyor. ⚠ Bekçi CJS'e derleniyor ve üst düzey `await`
desteklenmiyor — `async` gövdeyi doğrudan çağıran ölçüt sonucunu ancak
ÖZETTEN SONRA okuyabilirdi; saf parçalar bu yüzden ayrıldı.

    OR dali silindi · govde cagrilmadi · bos kumede dal eklendi
    tekillestirme kaldirildi · bos-sorgu kapisi kaldirildi
    rol listeden silindi · satisKodKosulu KISMI eslesmeye cevrildi

⛔ **VE HARNESS'İM ARADA BİR DOSYAYI BOZDU — YAZILIYOR.** Yedek adları
`basename` ile üretiliyordu; `stok/page.tsx` ile `urunler/page.tsx` aynı ada
düştü, yedek birbirini ezdi ve `/stok`a `/urunler`in içeriği geri yazıldı
(789 → 422 satır). Fark ölçümle görüldü, HEAD'den kurtarıldı ve dört düzenleme
desen sayımıyla yeniden uygulandı (33 ekleme · 2 silme, `git diff` ile
doğrulandı). _(Anayasa: "geri alma da bir yazımdır — aynı şart ona da işler";
yedek adı yolun TAMAMINDAN türetilmeli.)_

⏭ **AÇIK VE ÖLÇÜLMEDİ:** `/stok`un kanal SKU dalında `isActive` şartı YOK,
ortak `aramaKosulu` gövdesinde VAR. Bu iş sırasında görüldü, **dokunulmadı** —
ayrı bir soru ve ayrı ölçüm ister (pasif listing'in kodu ürün getirmeli mi).

---

## ✅ K187 — OTOMATİK ÇEKİM ZİNCİRİ ONARILDI + ÜÇ KANALA GENİŞLEDİ · 08.09.2026 · [KOŞTU — canlı]

> **Halil'in tespiti:** _"TY sık çekimi 05.09'dan beri kırmızı, 779 koşum
> `cikis=1`; klonda `prisma generate` yapılmıyor."_ **Teşhis birebir doğru
> çıktı** — ve benim ilk çerçevem yanlıştı: _"çekim kırmızı"_ demiştim,
> kullanıcı düzeltti (_"bunların hepsi otomatik çekim, bilgisayarımda
> yerelden Windows görevlendiricisiyle çalıştı"_). **Çekim çalışıyordu.**

### ① NE KIRILMIŞTI — ÖLÇÜLDÜ, ÇIKARIM DEĞİL

    klon HEAD = origin/main (geride 0)      → git pull CALISIYOR
    prisma/schema.prisma      07.09 16:12   → sema GUNCEL, onaylandiAt VAR
    src/generated/prisma/     04.09 12:03   → istemci BAYAT, onaylandiAt YOK

Klon şemayı çekiyor, **üretilmiş Prisma istemcisini tazelemiyordu.** Koşum
`Unknown argument 'onaylandiAt'` ile **⑦. adımda** (`otomatikOnaylaKuyruk`)
çöküyordu. Çekim ve `AuditLog` yazımı ⑥'da bittiği için **sipariş deftere
giriyordu** — bu yüzden arıza 3 gün görünmedi.

    05.09 12:22 → 08.09 07:22   690 kosum cikis=1   (04.09'da 85 yesildi)
    son 24 saatte TY ice aktarma izi: 282  (~her 5 dk, kesintisiz)
    ayni donemde ice aktarilan satis: 26 → onayli 24 · onaysiz 2

⭐ **BEDELİ VERİ KAYBI DEĞİL, GÖRÜNMEZ EL EMEĞİ.** 24 onayın dağılımı izin
`tetik` alanından okundu: **22 ELLE** (Halil, ekrandan · son 07.09 18:59) +
**3 OTOMATIK_TEK_PARTI** (`userId` NULL · son 07.09 17:46). Otomatik olan
üçü klondan gelemezdi — `otomatikOnaylaKuyruk`'u **N11 çekimi de çağırıyor**
ve N11'in yerel görevi yok; son 24 saatteki **7 N11 izi** Vercel ucundan
geliyor, orada istemci build'de üretildiği için alan mevcut. Yani kuyruğu
ara sıra Vercel boşaltıyordu, gerisini Halil elle kapatıyordu.

### ② ÖLÇÜT OLAYA DEĞİL HÂLE BAĞLANDI — `scripts/klon-tazele.cmd`

İlk akla gelen ölçüt _"HEAD kımıldadı mı"_ idi ve **bugünkü bozuk hâli HİÇ
GÖREMEZDİ**: klon zaten `origin/main`'deydi. Konulan ölçüt yeniden
hesaplanabilir olan: **üretilmiş istemci şemadan ESKİ mi.** Kendini
iyileştirir, tazelemeden sonra kendiliğinden susar.
_(Anayasa: "geri alma yolu saklanan listeye değil yeniden hesaplanabilir
ölçüte dayanır" — burada aynı ölçüt ONARIM kapısında.)_

Çapa `models/Sale.ts`, `client.ts` DEĞİL: kırılan alan orada yaşıyor.
**Üç yönde sınandı** (istemci taze → atlandı · şemadan eski → generate
koştu · çapa dosyası hiç yok → generate koştu) ve her seferinde geri alındı,
klon `git status` 0 satır. ⚠ Ve harness'in kendisi **üç kez** kusurluydu
(`eval` tırnak bozması · bash `\"` kaçışı · `printf` `\U` yutması) — üçü de
"kapı bozuk" diye rapor edilecekti.

**KANIT — 07:32 koşumu `cikis=0`, 05.09'dan beri ilk yeşil.** 07:37'de yeni
`.cmd` üretimde koştu ve `PRISMA-TAZELEME: istemci guncel - atlandi` yazdı.

### ③ TETİK ÜÇ KANALA GENİŞLEDİ — mimar isteği 08.09

> _"Trendyol hangi sistematik ile cronjob çalıştırıyorsa Hepsiburada ve
> N11'de aynısını yapsın."_

**TEK GÖREV, TEK HAZIRLIK, SIRAYLA ÜÇ KANAL** — `scripts/kanal-sik-cekim.cmd`.
Üç ayrı görev kurulsaydı aynı klona 5 dakikada **üç `git pull`** düşerdi ve
`index.lock` çakışması sessiz başarısızlık üretirdi. Sıra **TY → HB → N11**
(mimar 07.09: _"devamlı ilk gönderim trendyol, ikinci hepsiburada"_).

    sure olculdu 08.09:  TY 6-26 sn · HB 9 sn · N11 4 sn
    ilk canli kosum:     07:47:01 → 07:47:24  ·  TOPLAM 23 sn  ·  ucu de cikis=0

Görev: `Selliora Kanal Sik Cekim` (5 dk · `IgnoreNew` · `StartBoundary`
korundu, faz kaymadı). Eski `Selliora TY Sik Cekim` **kaldırıldı** ve
`ty-sik-cekim.cmd` **silindi** — ölü kod bırakılmaz. Günlük TY görevi
(geniş pencere) yerinde, o da aynı hazırlık gövdesini çağırıyor.

⚠ **HER KANALIN LOGU AYRI** (`ty-` · `hb-` · `n11-cekim.log`): kanal bazında
_"kaç koşum kırmızı"_ sorusu ancak öyle sorulabiliyor. Hazırlığın sonucu
**üç loga da** yazılır — yoksa _"HB neden çekmiyor"_ diye bakan kişi klon
hatasını hiç görmezdi.

⚠ **AÇIK KALAN — GÖREV PİLDE KOŞMUYOR.** Görev tanımı
`DisallowStartIfOnBatteries: true` + `StopIfGoingOnBatteries: true` taşıyor
(eski görevden birebir devralındı, DEĞİŞTİRİLMEDİ). Makine pile geçerse
çekim **sessizce durur** ve logda hiçbir satır olmaz — yani "kayıt yok"
hüküm sayılamaz. Değiştirmek mimar kararı.

### ④ HB İLK RUTİN YAZIMI — 2 sipariş

    Sale TOPLAM 7913 → 7915   ✓ SAYIM TUTTU
    4864776792 · 08.09 01:10 · Packaged   (mimarin (d) disinda biraktigi)
    4825253981 · 08.09 02:00 · Packaged
    geri alma olcutu: importBatch = hb-20260908054711

`4864776792` mimar tarafından **elle yazımdan** çıkarılmıştı ve gerekçesi
tersini söylüyordu: _"taze sipariş (08.09 Packaged), K165 rutininin işi,
Halil teyit zinciri yok. **Bir sonraki normal çekimde otomatik aksın.**"_
Rutinin onu alması talimatın kendisi.

⭐ **ÖNİZLEME ARTIK NE YAZACAĞINI SÖYLÜYOR.** `YAZILACAK: 2` yazıyordu ve
hangi iki sipariş olduğu hiçbir yerde yoktu — gözetimsiz koşacak bir yazıcı
yazacağını ÖNCE söylemek zorunda (İlke #16: sayı = liste). Tutar bilerek
basılmıyor: etiketsiz para _"birim mi toplam mı"_ tuzağını davet ederdi.

### ⑤ ⛔ MİMAR KARARI KODA GİRMEMİŞTİ — VE BU TURDA ÇİĞNENDİ

Mimar 08.09: _"HB OTOMATİK ONAY: şimdilik EKLENMEYECEK."_ Ölçüldü:
`otomatikOnaylaKuyruk` **kanal ayırmıyordu**. Kararı ayakta tutan tek şey,
kuyruktaki iki HB siparişinin **çok partili** olmasıydı
(`aday 2 · onaylanan 0 · çok parti (elle) 2`).

⛔ **VE 07:47 KOŞUMUNDA ÇİĞNENDİ — KUSUR BENDE.** HB'yi N11'den ÖNCE
sıraladım; N11 adımı da `otomatikOnaylaKuyruk` çağırıyor ve klonda kapı
henüz yoktu. İki yeni HB siparişi yazımdan **saniyeler sonra** otomatik
onaylandı (`onaylandiAt 07:47:21` · `07:47:23`).

**SONUÇ ÖLÇÜLDÜ VE TEMİZ ÇIKTI** — mimarın açılış şartında görmek istediği
kanıtın kendisi:

    4825253981  ciro 6.699,00 · FIFO 5.069,00 partiye BAGLI
                komisyon %13x1,20 1.045,04 · stopaj 55,83 · odeme 53,59
                hizmet 12,60 · NET-1 462,94 · NET-2 376,48
    4864776792  ciro 4.055,00 · FIFO 2.783,00 partiye BAGLI
                komisyon %18x1,20   875,88 · stopaj 33,79 · odeme 32,44
                hizmet 12,60 · NET-1 317,29 · NET-2 258,78

Dört HB kesinti kuralının dördü de anayasadaki tarifeyle kuruşuna tutuyor.
**Ters kayıt ÖNERİLMİYOR:** doğru bir defter kaydını bir süreç adımı için
bozmak, kuralı kapsamı dışına uygulamak olur _(anayasa: "ilke, kendi
kapsamının dışına uygulanırsa hatayı korur")_. ⏭ **Karar mimarda.**

**KAPI ARTIK MEKANİZMADA:** `OTOMATIK_ONAY_KAPALI_KANALLAR` (`onay-kuyrugu.ts`),
kanalın KENDİ adıyla — hesap etiketiyle değil (K13b vakası). Kapı parti
kapısından ÖNCE. Sayaç `kanalKapali` iki çekimin de çıktısında GÖRÜNÜR
(sıfır satır gizlenmez). **Beş mutasyonla sınandı:** kapıyı silen · `continue`u
silen · sayacı gizleyen · sırayı bozan → **dördü KIRMIZI**; listeyi boşaltan
(= mimarın kapıyı açması) → **YEŞİL**, çünkü o bir insan kararıdır ve bekçinin
işi kararı denetlemek değil kararsızlığı yakalamak.

⏭ **AÇILIŞ ŞARTI (mimar, sayıya bağlı — tarihe değil):** _"HB otomatik onayı,
ilk N (≥10) HB siparişinin ELLE onayında FIFO/NET sınavı temiz geçtikten
SONRA açılır."_ Kapıyı açmak listeden bir satır silmektir.

### ⑥ ⛔ HB UCU YALANCI YEŞİLDİ — KUSUR BENDE, ÖLÇÜMLE DEĞİL KAYNAKLA ÇIKTI

`scripts/hb/istemci.ts` → `kimlikOku()` **yalnız `.env.canli` dosyasını**
okuyordu ve **Vercel'de o dosya YOK.** Zincir şöyle işliyordu:

    uc  → {atlandi:"KIMLIK"}  + HTTP 200
    akis → test "$KOD" = "200" → GECTI
    sonuc → "HB cekimi kuruldu" · sifir siparis, sifir uyari

TY ve N11 istemcileri K166'dan beri **süreç ortamını ÖNCE** deniyordu; HB
tek ayrık kanaldı (İlke #10 çiğnenmişti). **İkisi de düzeltildi:**

· `kimlikOku()` artık ortam → dosya sırasıyla okuyor (iki ortam ayrımı
  `_SIT_` öneki dahil korundu);
· yeni `kimlikEksikleri()` **eksik değişkenin ADINI** döndürüyor, değerini
  ASLA — satıcı kimliği bile gövdeye girmiyor;
· uç artık `{atlandi}` durumunda **503** dönüyor ve eksik adları yazıyor.
  `BEKCI_TURU` bilerek **200 kaldı**: o bir hata değil, bilinçli duraksama
  (doğru davranışı arıza saymak, bekçiyi işlevsizleştirirdi).

**BEKÇİ KAYNAK TARAMIYOR, GÖVDEYİ ÇAĞIRIYOR.** `kimlikOku` saf (`node:fs` +
`process.env`) olduğu için değer testi yazıldı; kullanılan kimlikler
UYDURMA (`SAHTE-MID` vb.) ve gerçek hiçbir değer bekçiye girmiyor.
**Üç mutasyon:** `process.env` dalını komple silen (= eski hâl) · eksik
listesine DEĞER sızdıran · ucu 200'e döndüren → **üçü de KIRMIZI.**

⏭ **AÇIK VE ÖLÇÜLMEDİ:** HB anahtarlarının Vercel env'inde olup olmadığı.
Artık cevabı uç kendisi verecek — bir sonraki Actions koşumu ya `200` +
sipariş sayısı ya `503` + eksik değişken ADI döndürecek. _(K119'un A3
satırı da bu ölçümle düzeltildi: silinmedi, SÜPERSEDE işaretlendi.)_

### ⑦ KAPANIŞ DOĞRULAMASI — CANLIDA GÖRÜLDÜ (08.09 08:24)

Görev 07:48'de bilerek **durdurulmuştu** (klon `8d80195`'te, kapı henüz
push edilmemişti — tetik açık kalsaydı kararın ihlalini otomatikleştirirdi).
Push (`dbdb9be`, bekçi **116/116 yeşil**) sonrası açıldı ve koşum ölçüldü:

    klon dbdb9be · uc kanal cikis=0 · toplam 19 sn
    TY  ⑦ aday 2 · onaylanan 0 · cok parti (elle) 0 · KANAL KAPALI (elle) 2
    N11 ⑥ aday 2 · onaylanan 0 · cok parti (elle) 0 · KANAL KAPALI (elle) 2
    HB    67 siparis enumere · 67'si defterde · YAZILACAK 0

⭐ **SAYAÇ `çok parti 2` → `KANAL KAPALI 2` GEÇTİ.** Ölçülebilir kanıt tam
buydu: iki HB siparişini artık parti yapılarının TESADÜFÜ değil, mimarın
KARARI tutuyor. Kapı canlıda ve mekanizma olarak çalışıyor.

⚠ **HB KAPSAMI 17 → 67 ÇIKTI VE SEBEBİ YAZILIYOR:** 07:47 koşumunda klon
`8d80195`'teydi ve `teslim` ucu (K-HB-KAPSAM'da eklenmişti) henüz onda
yoktu; enumerasyon yalnız açık+kargoda görüyordu. Aynı push o ucu da
taşıdı. **Rakam büyüdüğü için değil, kapsam genişlediği için değişti.**

⏭ **MİMAR KARARI BEKLEYEN TEK ŞEY:** ⑤'teki iki otomatik onay
(`4864776792` · `4825253981`) yerinde bırakılsın mı, ters kayıtla geri mi
alınsın. Ölçüm ters kayıt gerektirmiyor; karar yine de mimarın.

---

## 🔶 K-HB-KAPSAM — TUTAR KAYNAĞI ÖLÇÜLDÜ · 07.09.2026 · [MİMAR KARARI BEKLİYOR]

> **Mimar şartı:** _"Delivered/ClaimCreated siparişin SİPARİŞ-ANI tutarı hangi
> kaynaktan güvenilir alınıyor? Listeleme fiyatı KABUL DEĞİL."_
> Üç sonuçlu ölçüt: **SAĞLAM** · **AYIRT EDİLEMEDİ** · **DURUR**.

### ① HAKEDİŞ ÇAPRAZI — 131/135

    TUTAN 131 · tutmayan 4 · detayı okunamayan 0
    (SIPARIS_TUTARI + KAMPANYA = detay ucunun listesi)

⚠ **İLK KOŞUM YANLIŞ KÜMEDEYDİ VE BU YAZILIYOR:** önce son teslim/kargo
siparişleri alındı; 61'in **60'ının ödemesi düşmemişti** ve tek örnek de zaten
bilinen bir anomaliydi. Tek örnekle hüküm kurulmaz — ne olumlu ne olumsuz.
Örneklem hakedişi DÜŞMÜŞ siparişlere çevrildi.
_(Anayasa: "cevapsız kapsam sorusunun üstüne ölçüm kurulmaz".)_

⭐ **TUTMAYAN 4'ÜN SEBEBİ ÖLÇÜLDÜ — VE DETAY UCU SUÇLU DEĞİL:**

    4282663277  açık 177,66  ↔  HB indirimi 177,66   TAM EŞİT
    4702310503  açık 284,05  ↔  HB indirimi 284,05   TAM EŞİT
    4006304001  açık 284,05  ↔  HB indirimi 284,05   TAM EŞİT
    4636037047  açık 284,05  ↔  HB indirimi 284,05   TAM EŞİT
    hakediş kodları: yalnız SIPARIS_TUTARI + STOPAJ
    (KOMISYON · KARGO · KAMPANYA — ÜÇÜ DE YOK)

⛔ **AYIRT EDİCİ:** detay ucu bugünkü liste fiyatını yansıtsaydı açıklar
**rastgele** olurdu. Her biri tam olarak `hbDiscount` kadar — o rakamı yalnız
siparişin **o günkü kaydı** bilir. Yani kusur hakediş tarafında: dört hakediş
**eksik yazılmış**. _(Bu dördü K-HB-PAZARLAMA'da zaten "açık kalan küçük soru,
Σ ₺1.028,83" diye kayıtlıydı — aynı dört sipariş.)_

### ② BUGÜNKÜ LİSTE ÇAPRAZI — AYRIM ÜRETTİ

    bugünkü listeleme fiyatından FARKLI  64 / 135
    aynı                                 71

⭐ **VE HEDEF SİPARİŞİN BİRİNDE FARK ₺900:**

    4707418677  detay LİSTE 3.099,00  ·  bugünkü listeleme 3.999,00
    4873413946  detay LİSTE 5.979,00  ·  bugünkü listeleme 5.979,00 (aynı)

⛔ Listeleme fiyatı kullanılsaydı `4707418677` deftere **₺900 fazla** girerdi.
Mimarın şartı tam bunu engelledi.

### HÜKÜM — ÖLÇÜT HARFİYEN "DURUR", ATIF İSE BAŞKA YERİ GÖSTERİYOR

Ölçüt `tutmayan === 0` istiyor; 4 var → **DURUR**, mimara rapor.
⏭ **KARAR MİMARINDIR:** dört başarısızlık *"tutar kaynağı şüpheli"* mi demek,
yoksa *"hakediş eksik yazılmış"* mı? Ölçüm ikincisini gösteriyor (açık = HB
indirimi, kuruşuna) ama **ölçütü gevşetmek ölçümü yapanın işi değildir.**
_(Anayasa: "eşiği soruyu soran koyamaz".)_

⏭ Mimar atfı kabul ederse ① değerlendirilebilir 131 vakada **131/131** tutar →
hüküm **SAĞLAM** olur ve yazım açılır. Aksi hâlde yazım kapalı kalır.

⛔ **BUGÜN HİÇBİR ŞEY YAZILMADI.** Enumerasyon genişletilmedi, iki sipariş
(`4873413946` · `4707418677`, ₺9.078) yazılmadı.

---

## ✅ K181 — TRENDYOL ÜRÜN v2 GEÇİŞİ · 07.09.2026 · [KOŞTU — canlı, salt okuma]

> **Trendyol duyurusu 07.09.2026:** barkod bazlı ürün servisleri içerik
> (content) bazlı v2'ye geçiyor. Eski uçlar **15.09.2026'da tamamen
> kapanıyor**; o güne kadar günde **6×15 dk kademeli kesinti** veriyor.

### ① ÖNCE KAPSAM ÖLÇÜLDÜ — CANLI UYGULAMA ETKİLENMİYOR

📏 **ÖLÇÜLDÜ (kendi kaynağımızdan, 07.09):** `src/` altında **tek bir TY
çağrısı yok**; bütün trafik `scripts/` içinde.

    order/orders · order/claims · finance/settlements   → listede YOK
    inventory/price-and-inventory (K169 stok/fiyat)     → V1-V2 ORTAK
    product/batch-requests/{id}                         → adres AYNI
    product/products?page=   ⛔ TEK ETKİLENEN UÇ        → 15.09'da kapanıyor

Yani **günlük akışta hiçbir şey durmuyor**: sipariş çekme, hakediş, iade ve
stok/fiyat yazımı v2'den etkilenmiyor. Etkilenen tek uç ürün listesiydi ve
onu **üç betik ayrı ayrı** çağırıyordu (tarama · kanal listeleme · sağlık
sondası); hiçbiri zamanlanmış işte değil.

⚠ **VE TY'NİN İDDİASI DOĞRULANDI, KÖRÜ KÖRÜNE KABUL EDİLMEDİ:** _"eski
servisleri kullanmaya devam ediyorsunuz"_ — ölçüm bunu doğruluyor, o bir uç
yeter. ⛔ Ama biz yalnız KENDİ kodumuzu ölçebiliyoruz; hesaba başka bir
araçtan istek gidiyorsa buradan görünmez.

### ② ÜÇ YOL TEK YERE, SONRA v2'YE

Yol artık `ty/istemci.ts` → `UCLAR`ta. Geçiş üç yerde ayrı yapılsaydı biri
unutulur ve 15.09'da sessizce düşerdi. Bekçi **çıplak v1 yolunu istemci
dışında yasaklıyor** ve yolun sahibinde DURDUĞUNU da ayrıca ölçüyor.
_(Anayasa: "düzeltmenin çaresi dosya listesi değil, desen yasağıdır".)_

### ③ ALAN ADLARI UÇTAN ÖLÇÜLDÜ — BELGEDEN DEĞİL

`npm run canli:ty-urun-v2-sonda` (yeni, salt okuma). v2 tek liste değil ve
iki ucun şekli **birbirinden de farklı**:

    /products/approved    ürün 12 alan · variants[] İÇ DİZİ
                          adet variants[].stock.quantity · barkod varyantta
                          ⛔ `approved` ve `rejected` ALANI YOK
    /products/unapproved  DÜZ yapı, varyant dizisi YOK
                          status: rejected|pendingApproval · quantity ÜRÜNDE
                          ⭐ rejectReasonDetails[] — v1'de HİÇ YOKTU

Şekil farkı tek bir saf gövdede toplandı: `scripts/ty/urun-v2.ts`.
**Sınıflandırıcı yazılmadı** — panelin okuduğu `listelemeDurumu` gövdesi
aynen kullanılıyor; ikinci bir ölçüt "iki yerde iki cevap" olurdu.

### ④ GEÇİŞ SIRASINDA ÜÇ GERÇEK BULGU

⛔ **a) TARAMANIN KENDİ SINIFLANDIRICISI AYRIŞMIŞTI.** `A) SATIŞA AÇIK` dalı
`onSale`e **hiç bakmıyordu**, oysa hem başlığı hem rapor satırı baktığını
yazıyordu — onaylı, stoklu ama **vitrine çıkarılmamış** ürün "satışa açık"
sayılıyordu. Tek gövdeye bağlanınca kapandı ve bekçide kendi ölçütü var.

⛔ **b) `apiGet` HATA MESAJINI KIRPIYORDU** (`slice(0, 200)`) ve kırpma tam
sebebin üstüne denk geldi: ekrana `"key":"approved.products.filter.s` düştü,
gerisi gitti. Kırpma kaldırılınca gerçek sebep göründü —
**`INVALID_SIZE` · "Boyut 100 değerini aşamaz. Alınan: 200"**. v2'de sayfa
boyu tavanı **100**, v1'de 200'dü; bu belgede yazmıyor, **uç söyledi**.
Tavan artık `Math.min` ile istekte kısılıyor, çağırana güvenilmiyor.
_(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır".)_

⛔ **c) "42 KAYIT KAYBOLUYOR" ALARMI YANLIŞTI — BİRİM HATASIYDI.** İlk okumada
v1'in ÜRÜN sayısını (1642) v2'nin ÜRÜN sayısıyla (1600) kıyasladım. Ama v1
zaten **barkod bazlıydı**; v2 onaylı uçta bir içerik birden çok barkod
taşıyor. Doğru kıyas **barkod kümesi** üzerinden kuruldu (`--kiyas`, aynı an):

    v1 barkod        1642
    v2 barkod        1644
    YALNIZ v1'de        0   ← geçişte kaybedilen: HİÇBİR ŞEY
    YALNIZ v2'de        2   ← v1'in göstermediği

_(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli — biçim değil kimlik
süzer".)_ ⏳ Bu kıyas **ömürlü**: v1 15.09'da ölünce kip "kıyas kurulamaz"
der, sessizce "fark yok" DEMEZ.

### ⑤ ÖLÇÜM VE MUTASYON

    ty-urun-v2:dogrula   34/34   (4 bölüm, sayaçlı)
    MUTASYON             11/11   hepsi KIRMIZI, iki yönde
    canlı koşum          tarama + kanal listeleme, uçtan uca v2'de

Zincirin **bağı** ayrıca ölçüldü: `approved` alanını yazmayı unutan bir
normalleştirici, kusursuz bir sınıflandırıcıya her ürünü "ONAY_BEKLIYOR"
diye verirdi ve iki birim testi de yeşil kalırdı.

📏 **CANLI SONUÇ (07.09, v2):** 1576 onaylı + 24 onaysız → **1644 satır**
(varyant başına). ACIK 212 · STOKSUZ 1183 · PASIF 225 · ONAY_BEKLIYOR 24 ·
BILINMIYOR **0**. Kanal listeleme kuru koşumu **birebir aynı** dağılımı verdi.

### ⑥ AÇIK KALANLAR

⏭ **`hasViolation` ÖLÇÜLDÜ AMA KULLANILMIYOR.** v2 varyantlarında yeni bir
bayrak var ve v1'de yoktu. Adı "satılamaz" demeyi çağrıştırıyor ama anlamını
bilmiyoruz; sınıflandırmaya katsaydık, ölçmediğimiz bir şeye dayanarak ürün
"pasif" ilan edilirdi. **Açılış şartı:** `hasViolation: true` olan bir ürün
canlıda gerçekten satılamaz görülürse ya da TY bunu belgelerse.

⏭ **`nextPageToken` GEZİNMESİ YAZILMADI.** v2 belgesi 10.000 kaydı aşan
sorgularda istiyor; ölçüm: onaylı **1576**, onaysız **24** — sınırın çok
altında. **Açılış şartı:** katalog 10.000'e yaklaşırsa. `kesildiMi` bayrağı
o güne kadar tek emniyet.

⚠ **BROWNOUT GÖRÜLMEDİ AMA ELENMEDİ.** Duyuru günde 6×15 dk kesinti diyor
(günün ~%6'sı); iki sağlık sondası da 200 gördü. Tek atışın kaçırma ihtimali
~%94 — "görmedim" ile "yok" ayrı şeyler. Geçiş yapıldığı için artık önemsiz.

⚠ **`product/cargo-providers` YOLU HÂLÂ TAHMİN.** Sağlık sondasında `556`
dönüyor ve kendi kodumuz yolu "TAHMİN" diye işaretliyor — TY'nin kusuru
sayılmaz, listede de yok. Değişmedi, K181 kapsamında değil.

### ⏭ TARİHLİ TEMİZLİK — `urunlerV1` · **16.09.2026'DAN SONRA SİL**

⛔ Eski v1 ürün ucu (`ty/istemci.ts` → `UCLAR.urunlerV1`) canlı akışta HİÇ
kullanılmıyor; tek tüketicisi geçiş sırasında yazılan **kıyas sondası**
(`canli-ty-urun-v2-sonda.ts` — v1 1642 / v2 1644 / **yalnız v1'de 0** ölçümünü
yapan araç).

⚠ **BUGÜN SİLİNMEDİ, GEREKÇESİYLE:** TY bu ucu **15.09.2026'da kapatıyor**.
O güne kadar bir hafta var ve kanal bu arada bir şey değiştirirse kıyası
**yeniden koşabilmek** istiyoruz. Silinseydi ölçüm imkânsız olurdu.
_(Halil onayı 07.09: "15.09'dan sonra silinsin".)_

⏭ **ŞART:** 16.09.2026'da `UCLAR.urunlerV1` + kıyas sondasının v1 dalı silinir;
ölçüm sonucu bu kayıtta zaten duruyor, kaybolan bir şey olmaz.

⚠ **AYRIM KAYDA GEÇİYOR — "KULLANILMIYOR" ≠ "ÖLÜ":** aynı denetimde HB'nin
`UCLAR.siparisler` ucu da içe aktarmadan düştü ama **silinmedi**: sağlık
sondası (`canli-hb-saglik`) onu hâlâ çağırıyor ve silinseydi üç ölçüm ikiye
düşerdi. Bir şeyin çağrılmıyor olması ölü olduğunu göstermez; **tüketicisi
var mı** diye bakılır.

---

## ✅ K184 — HEPSİBURADA CANLI + LİSTİNG → K121 BORUSU · 07.09.2026 · [KOŞTU — canlıda yazıldı]

### ⓪ KAPANIŞ — MİGRATION KOŞTU, BAĞ KURULDU, DEFTER YAZILDI

⭐ **Halil onayı 07.09:** ikinci kimlik alanı açıldı.

    migration  20260907134238_kanal_api_hesap_kimligi
               ChannelAccount.apiHesapKimligi VARCHAR(191) NULL + @@index
               CANLI ✓  ·  YEREL ✓  ·  damga güncellendi (48 migration)

⚠ **PRISMA YİNE KÜÇÜK HARF YAZDI** (`channelaccount`) — düzeltildi
(`ChannelAccount`), Linux'ta düşerdi. `migration:kontrol` yeşil.
⭐ **VE MIGRATION ADININ DIŞINA ÇIKMADI:** tek sütun + tek dizin, yabancı
ifade yok.

    bağ        AXCALI.apiHesapKimligi ← Mağaza ID (36 karakter)
               externalId 7000222505 DOKUNULMADI ✓

⛔ **HEDEF ADLA DEĞİL ÖLÇÜMLE SEÇİLDİ:** "kanal SKU kaydı olan tek hesap".
Aday sayısı 1 değilse betik DURUYOR — "en olası olanı seç" diye bir kural yok.

    yazım      1098 satır güncellendi · hata 0
    defter     800 STOKSUZ · 215 ACIK · 72 PASIF · 11 YOK
               1098 satırın hepsinde ölçüm damgası

⭐ **66 ÜRÜN: PASIF AMA KANALDA STOĞU VAR** — HB tarafındaki "rafta var,
vitrinde yok". Panelin arayacağı sayı bu.

⚠ **DEFTER SAYILARI KANAL SAYILARINDAN FARKLI VE BU DOĞRU:** kanalda 2189
listing var, defter 1098'ini tanıyor. Fark bir kusur değil, KAPSAM — ve
aşağıda ⑤'te yazılı.

### ─── ② ÖLÇÜM VE KARARLAR (aynı kalemin devamı, yeni satır DEĞİL)

> HB canlı ortamı açıldı; `axcali_dev` entegratörüne servis anahtarı Halil
> tarafından verildi (portal adımı güvenlik gereği bizde değil).

### ① CANLI ERİŞİM AÇIK — ÖLÇÜLDÜ

    OMS paketler      200 · 1 kayıt
    Listing listesi   200 · totalCount 2189
    OMS siparişler    200 · totalCount 0   ← ÖLÇÜLMÜŞ sıfır, arıza DEĞİL

⚠ **BOŞ İLE BOZUK AYRILDI.** Sipariş ucu *işlem bekleyen* siparişleri veriyor
ve şu an bekleyen yok. Sağlık sondası eskiden _"test ortamı boş olabilir"_
diyordu; canlıda o cümle **yanlış konuşuyordu** — artık `totalCount`u basıyor.

### ② ANAHTAR SEÇİMİ — ÖLÇÜLDÜ, SEÇİLMEDİ

    merchantSku       benzersiz 2121/2189  ⛔ TEKİL DEĞİL (68 çakışma)
    hepsiburadaSku    benzersiz 2189/2189  ✓  eşleşen 1087 (defterin %99'u)
    uniqueIdentifier  hiç dolu değil (0)

⭐ **`hepsiburadaSku` ONAYLANDI.** ⛔ Ve TY vakası tekrarlanmadı: orada üç alan
tek kümeye KATLANMIŞTI, hangisinin eşleştiği görünmüyordu. Burada alanlar ayrı
ölçüldü, çakışma ayrı sayıldı. Gerekçe koda yorum olarak yazıldı.

### ③ ENUM EŞLEMESİ — ONAYLI, ALT-İZLE

    1652  STOKSUZ · stok-sifir
     222  ACIK · satilabilir
     219  PASIF · satilamaz-kilitsiz    ⚠ EN ÖNEMLİ KARAR
      96  PASIF · kilitli
    isSuspended / isFrozen : canlıda HİÇ görülmedi (0)

⛔ **219 KAYDA "STOKSUZ" DEMEK YALAN OLURDU** — raf DOLU, kilit YOK, HB
"satılamaz" diyor (sebep genelde `ByMerchant`, 504 kayıt). `PASIF` seçildi
çünkü yapılacak iş odur; ama **kilitli olanla aynı şey değil**, o yüzden
`kaynak` alt-izi ayrıca dönüyor.
⛔ **ONAY DURUMU UYDURULMAZ:** listing ucu onay bilgisi vermiyor → gövde
hiçbir girdide `ONAY_BEKLIYOR` DÖNDÜREMEZ (bekçide ölçütü var).

### ④ YAZIM KAPISI KAPALI — VE SEBEBİ KİMLİK CİNSİ

⛔ `ChannelAccount.externalId` HB'de **`7000222505`** (raporlardaki numara);
yeni API'nin Mağaza ID'si **36 karakterlik GUID**. Eşleşme kurulamıyor.

⚠ **"HESAP EKSİK" DEĞİL, KİMLİK CİNSİ FARKLI** — ve alan EZİLMEYECEK (mimar
kararı). 📏 Okuyucular ölçüldü: `canli-ty-ice-aktar` · `canli-hb-ice-aktar` ·
`canli-n11-ice-aktar` · `lib/kanal-listeleme-yaz` + ayarlar ekranı. Ezilseydi
TY/N11 tarafı değil ama HB içe aktarması ve raporla eşleşme bozulurdu.

⏭ **ÖNERİ (yazım ONAY BEKLİYOR):** `ChannelAccount`a nullable ikinci kimlik
alanı — ad önerisi **`apiHesapKimligi`** (`magazaGuid` değil: "GUID" bir
BİÇİMDİR ve biçim değişebilir; alan adı içeriğin ne olduğunu söylemeli, nasıl
yazıldığını değil). Migration tek sütun + `@@index`. Alan açılınca yazıcının
kapısı kendiliğinden çalışır — kod hazır ve kapıyı ölçüyor.

### ⑤ KURU KOŞUM — DAĞILIM RAPORU

    HB kanal SKU kaydı   1098      kanalda bulunan  1087
    kanalda YOK            11      değişecek satır  1098 (ilk koşum: hepsi)
    ⚠ kanalda VAR, defterde YOK  1102  ← kanalın yarısını defter tanımıyor

⚠ Son satır ayrı bir iştir ve açılış şartı yazılana kadar iş açılmaz; burada
yalnız **görünür** kılındı.

### ⑥ ÖLÇÜM

    hb-listeleme:dogrula   34/34   (5 bölüm, sayaçlı)
    MUTASYON               12/12   hepsi KIRMIZI
    kanala yazma           YOK — istemcide POST/PUT metodu tanımlı bile değil
    yazılan alan           yalnız 3: listelemeDurumu · kanalAdet · kanalOlcumAt

En değerli mutasyon ①: 219 kaydı `STOKSUZ`a düşüren senaryo kırmızı yandı.

### ⑦ SEBEP KODLARI — İKİNCİ KAYNAK

HB `deactivationReasons` / `lockReasons` 14 ayrı kod veriyor (`ByMerchant` 504 ·
`DuplicateProduct` 53 · `ProvidedCounterfeitProduct` 17 · `SalesRestriction` 10
· `TrademarkViolation` 2 …). ⏭ Kutuya **sebep sütunu** açıldığı gün bu kodlar
TY'nin `rejectReasonDetails`iyle **birlikte** kaynak olur — ikisi ayrı ayrı
değil, tek sütunun iki kanaldaki karşılığı olarak.

### ⑧ HB SİPARİŞ İÇE AKTARMA — TETİKLENEMEYEN YOL

`canli:hb-ice-aktar` kuru koşuldu ve bir ÖN ŞART yakaladı: canlı hesap bağı
olmadan çalışmıyor ve hesabı **kendiliğinden oluşturmuyor** (doğru davranış).
⛔ **VE 0 SİPARİŞLE "GEÇTİ" SAYILMAZ.** _(Anayasa: "tetiklenemeyen yol geçmiş
sayılmaz — testi değil raporu düzeltmek olur".)_
⏭ **ŞART:** ilk gerçek HB siparişi düştüğünde kuru koşum TEKRAR + Halil'e ilk
içe aktarma onayı.

### ─── ③ KUYRUK — KUTU HB'Yİ SAYMIYORDU, TY'NİN YERİNE KOYMUŞTU

⛔ **SORULAN İKİ ŞIKTAN HİÇBİRİ ÇIKMADI — ÜÇÜNCÜSÜ ÇIKTI.** Kutu HB satırlarını
"de" saymıyordu; hesabı **tek** seçiyordu ve ölçütü _"ölçüm damgası en çok olan
hesap"_ idi. 07.09'da HB'ye 1098 damga yazılınca TY (1051) **sessizce düştü**:

        damgalı satır   1098 Hepsiburada · AXCALI   ← kutu buna geçti
                        1051 Trendyol    · AXCALI   ← ekrandan kalktı

    EKRANDAN DÜŞEN (TY)                 YERİNE GELEN (HB)
      engelli      9  ₺ 23.400,23         engelli     16  ₺ 47.333,40
      kaydı yok   17  ₺ 83.279,64         kaydı yok   13  ₺ 61.344,21
      ölçülmemiş  25  ₺241.900,84         ölçülmemiş   0  ₺      0,00

⚠ **KİMSE BİR ŞEY BOZMADI — ÖLÇÜT TEKİLDİ** ve ikinci kanal doğduğu anda
birinciyi düşürdü. _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de
genişlemesidir".)_ Arıza benim yazımımla doğdu ve aynı turda kapatıldı.

**66'NIN ₺ KARŞILIĞI — VE 66 İLE KUTUNUN 16'SI FARKLI KÜME:**

    66 = PASIF + KANALIN kendi stoğu > 0
      ├─ DEFTERDE de stoklu   4  → ₺22.389,00  = kutunun PASIF satırı (birebir)
      └─ defterde stok YOK   62  → rafta yok; kutunun sözleşmesine girmez

⭐ Kutunun ölçütü **bizim defterimizdeki** stoktur ("rafta var, vitrinde yok").

**⚠ 62 SATIR — "HB DEPOSUNDA MALIM VAR MI" SORUSUNUN HAM HÂLİ.** Bu 62 üründe
HB kendi tarafında **stok görüyor**, bizim defterimiz **sıfır** diyor. İki
okuması var ve ikisi de mümkün:

    (a) HB deposunda/kanalında GERÇEKTEN mal var, defterimiz bilmiyor
        → görünmeyen sermaye; satılırsa stok eksiye düşer
    (b) HB'nin stok rakamı BAYAT (biz tükettik, kanal güncellenmedi)
        → zararsız, ama kanal yanlış vaat ediyor

⛔ **ÖLÇÜM İKİSİNİ AYIRT ETMİYOR — HÜKÜM VERİLMEDİ.** Ayırt edici kanıt
kanalın kendi deposundan gelir (HB stok raporu / depo dökümü), bizim
defterimizden değil. _(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini
kanıtlamaz".)_

⏭ **HALİL SORDUĞUNDA HAZIR OLAN CEVAP:** liste 62 üründür ve `PASIF +
kanalAdet>0 + defter stoğu 0` ölçütünden **yeniden üretilir** (saklanan liste
yok). Sorulacak tek soru: bu 62'nin HB tarafındaki adedi gerçek mi, bayat mı.
⏭ **İŞ AÇILIŞ ŞARTI:** bu 62'den biri gerçekten satılıp eşleşmezlik
ürettiğinde — ya da Halil kanalın stok dökümünü eline aldığında.

**YAPILAN İŞ — KUTU İKİ KANALLI:**

    · ölçülmüş HER hesap kendi kutusunu alır, KANAL ROZETİYLE
    · kutular ₺'ye göre sıralı (satır sıralamasıyla aynı ölçüt)
    · hesap seçimi TEK GÖVDEDE (`olculenHesaplar`) — üç kopya kaldırıldı
    · adres hesabı taşır (`?vhesap=`) ve `/stok` onu okur — yoksa HB satırına
      tıklayan TY listesini görürdü ("sayı = liste" bozulurdu)
    · koşum izi KENDİ KANALINDAN okunur (`kosumKanali`); eskiden kutu HB'yi
      çizip **TY'nin** koşum durumunu gösteriyordu
    · "iz YOK" ile "iz var ve temiz" AYRI söylenir
    · sıra ölçüldü: koşum düştü > damga bayat > iz yok. İlk yazımda "iz yok"
      öndeydi ve TY'nin **159 saatlik** bayatlığını ÖRTÜYORDU

    vitrin:dogrula   109/109  (9 bölüm, sayaçlı)
    MUTASYON          20/20   17 + 3 sıra turu; ikisi de iki YÖNLÜ

⭐ **EN DEĞERLİ İKİ MUTASYON:** ⑰ hiçbir listeye eklenmemiş YENİ bir dosya kendi
hesap sorgusunu kurunca kırmızı yandı (desen yasağı, dosya listesi değil) · ⑭
satır bloğundan bağlantıyı kaldıran senaryo — eski 2600 karakterlik sabit
pencere onu ARDINDAKİ bloktan buluyor ve YEŞİL kalıyordu; pencere ölçülen
sınıra bağlandı.

⚠ **BUGÜN İKİ KUTU DA "KOŞUM İZİ YOK" DİYECEK** ve bu DOĞRU: izler yeni alanı
(`kosumKanali`) bugün kazandı, mevcut kayıtlar onu taşımıyor. Her kanal kendi
yazıcısı bir kez daha koştuğunda kendiliğinden temizlenir — geriye dönük iz
YAZILMADI _(ledger disiplini izlere de işler)_.

**KAPSAM SAYISI (② — iş AÇILMADI, yalnız sayı):**

    kanaldan gelen listing         2190   (beyan 2190 · kesilmedi)
    defterde VAR                   1087
    defterde YOK                   1103
      ├─ isSalable + stok>0            9   ← ARANAN SAYI
      ├─ isSalable ama stok≤0          0
      └─ stok okunamadı                0

⚠ **1091 DEĞİL, 1103 — VE ⑤'TEKİ 1102 DE AŞILDI.** Üç rakam da aynı şeyi
ölçüyor, aralarındaki fark okuma ANIDIR: ⑤'te 2189 listing vardı, bu ölçümde
2190 (kanal akmaya devam ediyor); ve payda *eşleşen* 1087'dir, defterdeki 1098
değil. Geçerli olan **1103 · 07.09.2026 15:xx okuması**.
_(Anayasa: "donmuş kaynak akan kaynakla kıyaslanırken iki damga yazılır" +
"aşılan rakam sessizce aşılmaz".)_

⭐ **HÜKÜM: kapsam boşluğu ekran gerektirmiyor.** 1103 satırın yalnız **9'u**
satılabilir ve stoklu; geri kalanı kanalda ölü. Gelecek sipariş eşleşmezliği
riski bu dokuza sınırlı.

### ─── ④ SIT KİMLİKLERİ — KAYIP, ACELE YOK

⛔ `HEPSIBURADA_SIT_*` satırlarının kimlikleri elimizde YOK. Canlı çalıştığı
için acil değil; ama SIT olmadan **yazma uçları hiçbir yerde denenemez**.
⏭ Halil kayıtlıysa `.env.canli`ye ekler; değilse HB'den yeniden istenir.
⚠ Kimlikler sohbete YAPIŞTIRILMAZ — doğrudan `.env.canli`ye yazılır.

---

## 🔶 K-HB-PAZARLAMA — SATICI İNDİRİMİ · 07.09.2026 · [ÖLÇÜLDÜ · YAZIM BEKLİYOR]

> **Halil:** _"Axcali'nin sayfasını takip et butonuna tıklayan kişiye yapılan
> indirim kuponu… 15 TL'lik takip kuponu, her müşteri 1 sefer kullanabilir,
> liste fiyatından düşer. Bunun gibi başka marketing operasyonları da var."_

### ① YAPI KARARI (onaylı) — ŞEMA DEĞİŞİKLİĞİ YOK

    ciro           = unitPrice + hbDiscount        (liste = komisyon tabanı)
    kesinti satırı = SaleFee { code PAZARLAMA_INDIRIMI · name kanaldan · amount }

⛔ **KUPON CİROYA YAZILMAZ.** HB komisyonu **liste** üstünden kesiyor; ciroyu
düşürmek motorun `oran × ciro` komisyonunu da düşürür ve NET'i İKİ yerden
bozar. `SaleFee` serbest kodlu (`code`·`name`·`amount`) → merdivenin ilk
basamağı tutuyor, migration'a inilmedi.

⛔ **KAMPANYA BAŞINA KOD AÇILMAZ** — tek kod + **etiket**. Kampanya başına enum
değeri, her yeni pazarlama operasyonunda elle büyüyen bir liste doğurur ve o
liste eskir. _(KARGO_BEKLEYEN dersi: çare dosya/liste değil DESEN.)_ Ad kanalın
kendi alanından gelir; kanal ad vermezse deterministik dolgu — **elle ad YOK.**

⚠ **İKİ ARİTMETİK DÜZELTİLDİ (koda yorum olarak girecekti):**
· `406,20 = 3.385 × %12` **iki okumaya birden uyuyor**; API `commissionRate 10`
  ve `commission 338,50` diyor, `338,50 × 1,20 = 406,20`. Mekanizma **%10 + %20
  KDV**; `%12` bugün aynı sayıyı verir ama oran ya da KDV değişince sessizce
  bozulur. _(Anayasa: "iki okumayla da uyumlu gözlem hiçbirini kanıtlamaz".)_
· `3.147 = 3.385 − 238 − 15` **toplamıyor**: `3.385 − 238 = 3.147`, kupon
  fiyata GİRMEMİŞ. Ölçüm de öyle diyor (`unitPrice 3.147`).

### ② MEKANİZMA KAPISI — HAKEDİŞTEN ÖLÇÜLDÜ, CEVAP **(b)**

`4777369510` henüz `Packaged`, hakedişi DÜŞMEMİŞ. Bu yüzden kapı o siparişte
değil, **kuponu olan VE hakedişi düşmüş 18 sipariş** üstünde ölçüldü:

    SIPARIS_TUTARI + KAMPANYA = liste   → tutan 11 · tutmayan 7 (7'si iade/0)
    kupon tutarına EŞİT hakediş satırı  → 0   (on sekizinin HİÇBİRİNDE)

⛔ **(a) ÇIKMADI — KUPON HAKEDİŞTEN KESİLMİYOR.** HB bize **liste** üstünden
ödüyor ve kuponun karşılığı hiçbir satırda yok. Kural gereği **(b)**: yazım
BEKLER, kupon "sayılıyor, yeri çözülmedi" olarak görünür kalır.

⭐ **TÜRETME BİR HİPOTEZ VERDİ (kanıt DEĞİL):** `1.528,00 + 871,01 = 2.399,01`
· `3.385,00 + 15,00 = 3.400,00` — ikisi de **üstü çizili eski fiyat** gibi.
Yani `merchantDiscount` bir GİDER değil, **vitrin indirimi gösterimi** olabilir;
cebimizden çıkmadığı için hakedişte görünmüyor. Aynı 871,01 beş ayrı siparişte
tekrarlıyor ve o siparişlerde müşteri **listenin tamamını** ödemiş — bir kupon
böyle davranmaz.
⏭ **KESİNLEŞME ŞARTI:** takip kuponu FİİLEN kullanılmış bir sipariş hakedişe
düştüğünde `SIPARIS_TUTARI + KAMPANYA` listenin 15 TL altına iner mi.

### ③ ÖLÇÜM

    kupon taşıyan sipariş    30 / 164   (canlı 16 + hakedişli 148)
    toplam kupon             ₺9.041,07
    tarih aralığı            2026-06-05 … 2026-09-07
    CSV                      veri/ozel/k-hb-pazarlama-2026-09-07.csv (164 satır)

⚠ CSV `.gitignore`da — depoya girmez.

### ④ YAZIM — AÇILMADI

⛔ **②(b) çıktığı için `SaleFee` yazımı AÇILMADI.** İçe aktarma kuponu ciroya
karıştırmıyor, sayıyor ve ekranda beyan ediyor (`SATICI İNDİRİMİ OLAN KALEM`).
Bekçide iki yönlü mutasyonla korunuyor (gelire karıştıran senaryo KIRMIZI).

---

## 🔶 K180-② — KALDIRMA, GİRİŞİN GERÇEKLİĞİNİ ÖLÇMÜYOR · 07.09.2026 · [KUSUR · AÇIK]

> **Halil:** _"sayım da yoktu, eski siparişlerden, mükerrer girmişim siparişi;
> şimdi onu düzeltti ama stoğa attı — stok 0 olması lazımken 1 görünüyor."_

### ① CİRO/NET TARAFI DOĞRU ÇALIŞTI — KUSUR STOKTA

`10559161422` kaldırması ölçüldü ve **15 şartın 15'i tuttu**: ciro
2.078,00 → 1.039,00 · kalem 2 → 1 (öteki DURUYOR, sebep rozetiyle) · NET
damgası kaldırmadan SONRA tazelendi (11:38:06.491) · başka satış tazelenmedi ·
başka hareket yazılmadı. ⭐ Bu kısım kapanmıştır.

⛔ **AMA STOK YANLIŞ YAZILDI.** Kaldırma, satırın `SALE_OUT`'unu aynalayıp malı
stoğa geri veriyor — bu **gerçekten sevk edilmiş** bir satır için doğru. Mükerrer
satırda çıkışın arkasındaki giriş de kâğıttı; dönecek mal yoktu.

    2025-10-02  PURCHASE_IN      +1  "listeye-hizala-2"    ← KÂĞIT giriş
    2025-10-02  SALE_OUT         -1  10559161422           ← mükerrer satır
    2026-08-29  SALE_CANCEL_IN   +1  "mukerrer kalem"      ← ilk nötrleme
    2026-09-01  COUNT_CORRECTION -1                        ← SAYIM 0 dedi
    2026-09-07  SALE_CANCEL_IN   +1  ← K180 kaldırması     ⛔ HAYALET +1
    2026-09-07  ADJUSTMENT       -1  ← düzeltme            ✓ ledger 0 · FIFO 0

⚠ **VE `axcali3134`ün GERÇEK ALIMI HİÇ YOK:** bütün girişleri hizalama
betiklerinin yazdığı, her biri kendi satışını dengeleyen kâğıt çiftler.

### ② DÜZELTME YAZILDI — ve türü DEĞİŞTİRİLDİ

Halil `COUNT_CORRECTION` demişti; aynı mesajda **"sayım da yoktu"** diyor. O
türle yazmak defterde OLMAMIŞ bir sayımı iddia etmek olur ve hareket bir
`StokSayimSatiri`na da bağlanamazdı. `ADJUSTMENT` (manuel düzeltme) yazıldı,
**gerekçe metni birebir korundu**, sebep kapalı kümeden `"Diğer"` + zorunlu
açıklama. _(Anayasa: "mimar talimatları da bu süzgeçten geçer".)_
Sonuç: **ledger 0 · FIFO 0**, ciro/NET'e dokunulmadı.

### ③ GEÇİCİ FREN — ÖNİZLEMEDE UYARI

Ölçüt gelene kadar kaldırma önizlemesi kullanıcıya **stoğu kontrol etmesini**
söylüyor (`kagitGirisUyarisi`, sözlükten). Sessizce yanlış stok yazmaktansa
kontrolü söylemek. ⛔ Bu bir çözüm DEĞİL, frendir.

### ④ ÖLÇÜM KOŞTU — VE İKİ ADAY ÖLÇÜTÜ BİRDEN ELEDİ

📏 `canli:kagit-giris-olcum` (07.09, salt okuma) — kaldırılabilir 7781 kalem,
7786 çıkış, **hepsi parti bağlı** (bağsız 0):

    DOSYA_MALIYET    4348  %55,8   ← 4348'ünün de PurchaseItem'i YOK
    GERCEK_ALIM      3371  %43,3
    NOTSUZ_ALIM        35   · SAYIM 21 · DIGER 4 · IPTAL_AYNASI 3
    IADE                3   · HIZALAMA_BETIGI 1

⛔ **"Girişi betik yazmışsa kâğıttır" ÖLÇÜTÜ ÖLDÜ:** defterin **%55,8'ini**
kâğıt sayardı ve kaldırma yarıdan fazla üründe stok döndürmeyi reddederdi.
_(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez" — FIFO `soldAt` sınırının
defterin %48,72'sini kilitlemesiyle aynı sınıf.)_

⛔ **"ÇIKIŞ İLE PARTİSİ AYNI NOTU TAŞIYOR" HİPOTEZİ DE ÖLDÜ:** yalnız **5**
eşleşme, ve **3407 çıkış NOTSUZ** — ölçüt kümenin yarısında kör.

⭐ **ÖĞRENİLEN:** kâğıtlık girişin KÖKENİNDE değil, satırın **MÜKERRER**
olmasında. Sonraki aday eksen: _"kaldırılan satır, kendisini dengelemek için
açılmış bir partiyi ÖKSÜZ bırakıyor mu"_ — partinin tek tüketicisi bu çıkış mı,
ve parti bu satırla aynı koşumda mı doğdu.

⏭ **AÇILIŞ ŞARTI YOK — BU KALEM AÇIK VE SIRADA.** Ölçüt kurulunca ayna yazma
koşula bağlanır, ekran gerekçesini söyler ve mutasyon yazılır: **kâğıt-girişli
kurguda ayna yazan → KIRMIZI**.

---

## ✅ K180 — KALEM KALDIRMA AÇILDI (K78 KAPANDI) · 07.09.2026 · [KOD KOŞTU · migration CANLIDA]

> **Halil:** _"kalem silme yeteneğini aç — müşteri satışlarında birini iptal
> etmek isteyebilir; 3 örnek 3 ürün alır, bir tanesini beğenmez geri gönderir,
> diğerlerini tutar."_

⛔ **CÜMLENİN İKİ KARŞILIĞI VAR VE YALNIZ BİRİ BU İŞTİR.** Tarif edilen vaka
(müşteri geri gönderdi) bir **İADEDİR** ve **zaten çalışıyor** — ölçüldü
07.09: `11399165160` satılan 2 · iade 1, ayrıca 3 kalemli satışta tek kalemin
iadesi **5 vakada** var. Açılan yetenek onun kardeşi: o satır **HİÇ
SATILMAMIŞSA** (mükerrer içe aktarma satırı, hatalı giriş) kaldırılır.

⚠ **AYRIM YAPISAL OLARAK KORUNUYOR:** `SatisKalemKaldirmaSebebi` enumunda
müşteri iadesi seçeneği **YOK** (`MUKERRER_SATIR` · `HATALI_GIRIS`) ve bekçi
hem enumu hem ekran listesini bu yönden ölçüyor. Sebep kutusunda "müşteri iade
etti" olsaydı operatör en yakın kelimeyi seçer, gerçek bir satış deftere hiç
olmamış gibi geçer ve ciro · KDV matrahı · hakediş beklentisi **sessizce**
eksilirdi.

### ① MEKANİK — İPTALİN KALEM ÖLÇEĞİ

`SALE_OUT` **silinmez**; karşısına ters işaretli `SALE_CANCEL_IN` yazılır,
maliyeti çıkışın **aynası**. Kalemi gerçekten silmek `StockMovement.saleItemId`i
`SetNull` yapardı: _"stok düşük kalır, DÜŞÜREN KAYBOLUR"._

⛔ **AYNA `sourceMovementId` TAŞIMAZ** — K96 ölçümü (30.08): pozitif hareket
`acikPartiler` tarafından **yeni parti** sayılır; kaynak bağı da taşırsa eski
partinin tüketimini geri alır ve aynı adet FIFO'ya **iki kez** girer
(ledger 1, FIFO 2). ⭐ **AMA `saleItemId` TAŞIR** — iptalden ayrıldığı tek
nokta: kaldırma tek kalemi hedefler, ayna kaleme bağlı olmazsa `acikCikislar`
o çıkışı hâlâ açık görür ve geri alma yolu aynayı bulamaz.

**GERİ ALMA VAR** ve ölçütü **yeniden hesaplanabilir**: "şu hareketleri
yazmıştım" listesi hiçbir yerde saklanmıyor; ayna bugün `saleItemId` +
`SALE_CANCEL_IN` ile yeniden bulunuyor ve **hâlâ açık olması** şart. Kapandıysa
(mal bu arada satıldıysa) geri alma **durur ve sebebini yazar** — sessiz
duvar değil. _(Anayasa: 5595 satırlık `AuditLog.detail` yazıldığı anda
kırpılmıştı; geri alma yolu doğduğu anda bozuktu.)_

**DÖRT KAPI, HER BİRİ AYRI ÖLÇÜLDÜ:** `ZATEN_KALDIRILDI` · `SATIS_IPTAL` ·
`IADE_VAR` · `SON_KALEM`. Sonuncusu şunun içindir: son geçerli kalem
kaldırılsaydı geriye **cirosuz ama açık** bir satış kalırdı — kargo bekleyen
kovasında durur, hakediş eşleştirmesine girer, listede sıfır liralık bir satır
olarak yaşardı. Doğru yol **iptal** ve ekran bunu yazıyor.

### ② ASIL İŞ KALDIRMA DEĞİL, **19 OKUYUCUYU BAĞLAMAKTI**

📏 **ÖLÇÜLDÜ (07.09):** satış kaleminden para/adet hesaplayan **19 dosya, 34
sorgu**. Yarısı bağlanmamış bir kaldırma, **sessizce yanlış rakam** demektir.

⛔ **VE İLK BEKÇİ YANLIŞ ŞEYİ ÖLÇÜYORDU — MUTASYON YAKALADI.** Ölçüt _"bu
DOSYADA `KALEM_GECERLI` geçiyor mu"_ diye soruyordu. `page.tsx`te üç,
`kar-yeniden.ts`te üç ayrı sorgu var; **birinin** süzgecini silen mutasyon
**yeşil geçti** — kelime öteki sorgularda duruyordu. Ölçüt sorguya bağlandı:
her satış kalemi sorgusu **parantez dengesiyle** çıkarılıyor (sabit pencere
DEĞİL) ve süzgeç o bloğun içinde aranıyor.

⭐ **VE MUAFİYET DE BLOĞA YAZILIR, DOSYAYA DEĞİL.** Satış detayı kaldırılmış
kalemi **görmek zorunda** (üstü çizili + sebep rozeti + geri alma düğmesi) ve
beyanı artık kendi sorgusunun içinde. Gizleseydik kaldırma **izsiz** olurdu:
satır ekrandan kaybolur, "burada ne vardı" sorusunun cevabı kalmazdı.
_(Anayasa: "sıfır satır gizlenmez" — yok SAYILMAK ile ekrandan SİLİNMEK aynı
şey değildir.)_ Ekran onu **gösterir ama saymaz**: para ve adet sayan her yer
`gecerliKalemler` kümesinden okuyor.

⚠ **VE KÂR TAZELENMEDEN İŞ BİTMİYOR:** kalem süzülse bile satışın NET damgası
eski kalem kümesiyle hesaplanmış kalırdı — **ciro düşer, NET düşmez, marj
sessizce şişerdi**. Kaldırma da geri alma da `satisKarTazele` çağırıyor ve
bekçi bunu **sayıyla** ölçüyor (2 çağrı).

### ③ ÖLÇÜM VE MUTASYON

    kalem-kaldirma:dogrula   42/42   (6 bölüm, sayaçlı — yarım koşum GEÇERSİZ)
    kalem-gecerli:dogrula    41/41   (34 sorgu tek tek)
    MUTASYON                 25/25   hepsi KIRMIZI, iki yönde

Yanlış susma **ve** yanlış yanma ayrı sınandı (ör. `SON_KALEM` kapısını KALDIRAN
ve HEP YAKAN mutasyonlar). En değerlisi sonuncusu: **hiçbir listeye eklenmemiş
yeni bir okuyucu** dosyaya eklendi ve bekçi kırmızı yandı — desen yasağı
gerçekten desen yasağı.

### ④ İZİN — YENİ İZİN AÇILMADI (KARAR)

Ölçüt `satis.iptal`. Kaldırma iptalin kalem ölçeğidir: aynı yıkıcılık sınıfı,
aynı geri alma yükümlülüğü. Ayrı izin açmak _"yetki iki bacaklıdır"_ borcunu
doğururdu (`izinler.ts` **+** `seed-yetki.ts` → `SONRADAN_DOGAN`); ikincisi
unutulursa ekran canlıda **sessizce kaybolur** (13.08'de `/iadeler`de yaşandı).
⚠ `satis.yaz` yetmez: satış girebilmek, girilmiş bir satırı deftere hiç olmamış
saymaya yetki vermez.

### ⑤ ŞEMA — MERDİVEN ÖLÇÜLEREK İNİLDİ

① mevcut alan taşımıyor · ② serbest metin yetmez, bu alan **SORGULANACAK**
(ciro/NET/KDV/hakediş kaldırılanı dışlamalı — 34 sorgu) · ③ türetilemez: ciro
hareketten değil **kalemden** hesaplanıyor → ④ sütun.
`SaleItem.kaldirildiAt` + `kaldirmaSebebi` + `@@index([kaldirildiAt])`.
Migration `20260907084108_satis_kalemi_kaldirma` **canlıda ve yerelde koştu**;
şema commit'i ondan sonra push edildi.

### ⑥ HALİL TEST LİSTESİ (canlı adres, gerçek satış — tıklama düzeyinde)

1. **Çok kalemli** bir satışın detayını aç. Her kalem kartında **"Kalemi
   kaldır"** düğmesi görünüyor mu?
2. **Tek kalemli** bir satış aç: düğme **PASİF** ve üstüne gelince
   _"son geçerli kalem kaldırılamaz… doğru yol satışı İPTAL etmek"_ yazıyor mu?
3. Çok kalemli satışta **Kaldır → sebep seç → Önizle**: kaç adet stoğa döneceği,
   **birim maliyet** (çıkışın aynası), **ciro düşüşü** ve **kalan kalem sayısı**
   yazıyor mu? Onay düğmesi önizleme çizilmeden **pasif** mi?
4. **Onayla.** Satır **üstü çizili** kaldı mı, yanında **sebep rozeti** var mı,
   yerinde **"Kaldırmayı geri al"** düğmesi çıktı mı?
5. Aynı sayfada üstteki **adet** ve **kalem sayısı** düştü mü? **Kâr bloğunda**
   o kalem artık YOK mu, NET-2 kalan kalemlere göre yeniden mi hesaplandı?
6. `/stok`ta o varyantın adedi **kaldırılan kadar arttı** mı?
7. Panelde/raporda **ciro** o kalem kadar düştü mü (dönem seçimi satışın
   gününü kapsasın)?
8. **Geri al**'a bas: satır normale döndü mü, adet/ciro/NET eski hâline geldi
   mi, stok tekrar düştü mü?
9. **İadesi olan** bir kalemde "Kaldır" dene: _"bu kalemin iadesi var…"_
   engeli çıkıyor mu?

### ⑥b HALİL TESTİ — GEÇTİ · 07.09.2026 · [DEFTERDEN DOĞRULANDI]

Halil: _"bu tamam."_ ⛔ **Ve bu cümle olduğu gibi kabul edilmedi, ölçüldü** —
kaldırma gerçekten uygulandıysa defterde izi olmalı. `canli:kaldirma-izi`:

    10:28:27  SATIS_KALEMI_KALDIRMA       11571791924 · LEGO Azkaban · HATALI_GIRIS · 1
    10:28:32  SATIS_KALEMI_KALDIRMA_GERI  (5 sn sonra geri alınmış)

    gidiş-dönüş  SALE_OUT-1→parti · SALE_CANCEL_IN+1 · ADJUSTMENT-1→parti
                 net hareket -1 (beklenen -1) ✓
    şu an kaldırılmış duran kalem: 0

⭐ **DEFTER BAŞLANGICA DÖNDÜ.** Ayna kaynak bağı taşımıyor (K96), geri alma
partiyi kapatıyor, kalem geçerli hâline döndü — tasarlanan şeklin birebir
kendisi ve **gerçek veriyle**. _(Anayasa: "testi başlangıca dönüş üzerine
kur" — gidiş-dönüş sonrası rakam başlangıca eşit olmalı.)_

⚠ **BURADAN GÖREMEDİĞİM TEK ŞEY:** iz canlı DEFTERDE, ama tarayıcının canlı
adres mi yoksa canlı veritabanına bakan yerel sunucu mu olduğu izden
çıkmıyor. Halil testinin (a) maddesi canlı adres şartı koyuyor; kayıt bunu
söyleyemediği için burada **yazılı** kalıyor, "geçti" diye sayılmıyor.

### ⑦ AÇIK KALAN — `10559161422` HENÜZ DÜZELTİLMEDİ

Yetenek bunun için açıldı ama **kayıt HENÜZ dokunulmadı**: satış
`10559161422` (02.10.2025) `axcali3134` satırını **iki kez** taşıyor
(₺1.039 hayalet ciro · 1 adet hayalet stok çıkışı) ve tarih resmî ölçüm
penceresinin (01.08.2025+) **içinde**.
⏭ **SIRADAKİ ADIM:** o kalem **ekrandan** kaldırılır — betikle değil, yeni
yolun kendisiyle. _(K95'te "betik işi" diye yazılmıştı; artık ekran işi.)_

📏 **ÖNİZLEME ÖLÇÜLDÜ (07.09, `canli-10559161422-onizle.ts`, salt okuma):**

    satış 10559161422 · 02.10.2025 · iptalsiz · NET-1 250,2033 · NET-2 205,6166
      kalem A  axcali3134  1 × 1.039,00   net hareket -1
      kalem B  axcali3134  1 × 1.039,00   net hareket -1     ← biri fazla
      ciro 2.078,00

    ⭐ İKİ SATIR BİREBİR AYNI — hangisinin kaldırıldığı FARK ETMEZ:
      ikisi de "kaldırılabilir" · stoğa dönecek 1 adet · ayna birim maliyet 699
      ikisinin de kalem NET-2'si 136,1417 · kaldırınca kalan kalem 1

⚠ **VE NET-2 TAM 136,14 DÜŞMEYECEK:** sipariş başına kesintiler (TY sabit
gider vb.) satış seviyesinde duruyor ve kalem sayısıyla yarıya inmiyor —
iki kalemin NET-2 toplamı 272,28 iken satışın NET-2'si 205,62. Motor kalan
kalem üstünden yeniden hesaplayacak; ekrandaki yeni rakam "yanlış" değil.

---

## ✅ K179 — KALAN ALTI AÇIK KALEM KAPANDI · 07.09.2026 · [KARAR + ÖLÇÜM]

> **Halil:** _"bunları kapatalım, açık task istemiyorum."_
> ⛔ Hiçbiri "yapıldı" diye kapanmadı: her biri ya ÖLÇÜLDÜ ya da GEREKÇELİ
> karara bağlandı. Panoyu yalanlamak, açık kalem bırakmaktan kötüdür.

### ① K141 + K75 — AYNI ŞEY: KARGOSUZ SATIŞLAR · [ÖLÇÜLDÜ, KAPANDI]

İki kalem aynı kümeyi iki ayrı yerden anlatıyordu: K75 _"19 kargoyu listele,
elle gireyim"_, K141 _"19 satış kargosuz ve ekranda ayırt edilemiyor"_.

📏 **ÖLÇÜLDÜ (canlı 07.09, 01.08.2025→bugün):**

    açık satış 5945 · kargosuz 28
      ⭐ Elden Satış  9  ← kargo ZATEN OLMAZ, kusur değil
      pazaryeri     19  (TY 17 · HB 2)

⛔ **BU BİR BİRİKMİŞ LİSTE DEĞİL, YENİLENEN BİR HÂL.** 28.08'de de 19'du,
bugün de 19 — ama **başka satışlar**. Yeni sipariş kargosu girilene kadar
kargosuz duruyor; "şu 19'u gir, kapansın" diye kapanmıyor.
_(Anayasa: "kapanamayacak kayıp, görev değil kayıttır" — kapatılamayan madde
kutunun tamamına olan güveni eritir.)_

⭐ **VE EKRAN ZATEN SÖYLÜYOR:** satış detayında `kargoGirilmedi` bayrağı
`kar-blogu.tsx`te uyarı olarak çiziliyor — "kâr kargo düşülmeden hesaplandı"
diye. K141'in açık ucu (_"ayırt edilemiyor"_) detay seviyesinde KARŞILANMIŞ.
⚠ Liste seviyesinde sayaç YOK ve **bilerek açılmıyor**: sürekli yenilenen bir
hâl için sayaç, her gün yanan ve okunmaz hâle gelen bir rozet üretirdi.

⏭ **AÇILIŞ ŞARTI:** kargosuz satış sayısı operasyonu fiilen rahatsız ederse
(ör. ay sonu kapanışta gözden kaçarsa) liste süzgeci açılır — ve o gün ölçüt
**Elden Satış'ı DIŞLAMAK zorundadır**, yoksa sayı ilk günden %32 şişer.

### ② K167 ③ — N11 HAKEDİŞ/KESİNTİ · [UYUR — belgeye bağlı]

N11 komisyon/kesinti kuralları **N11'in kendi hakediş ekstresi olmadan**
yazılamaz. _(Anayasa: kaynak önceliği — kanalın kendi belgesi > dış
hesaplayıcı; ve "kapsayan pencere yoksa hüküm verilmez".)_
⏭ **AÇILIŞ ŞARTI:** ilk N11 komisyon faturası/hakediş dosyası eline geçtiğinde.
📏 Bugün N11'de **9 satış** var; kural yokluğu bu 9'un NET'ini etkiliyor ve
bu ekranda `REFERANS` rozetiyle zaten görünür.

### ③ K69 ③ — KRONOLOJİ DÜZELTMESİ · [UYUR — tanımı yetersiz]

⛔ **DÜRÜST KAYIT: BU KALEMİ BUGÜN ÖLÇEMEDİM.** Panoda yalnız
_"ayrı iş, 309 kalem / 423 hareket"_ yazıyor; hangi kronoloji, hangi yön,
hangi ölçütle sapıyor — kayıtlı değil. Ölçütü olmayan bir kalemi "kapandı"
yazmak da "yapıldı" demek kadar yanlış olurdu.
⏭ **AÇILIŞ ŞARTI:** bir kronoloji sapması **fiilen bir rakamı bozarsa**
(FIFO sırası, dönem toplamı ya da kâr) — o gün ölçütüyle birlikte yeniden
tanımlanır. K79 (geçmiş satış geleceğin partisini yiyor) bu ailenin ölçülmüş
ve **kapatılmış** hâli; kalan 309 kalem için öyle bir kanıt bugün yok.

### ④ K64 · K65 · K66 — AMAZON / ELDEN SATIŞ ARTIKLARI · [ÖLÇÜLDÜ + UYUR]

📏 **İÇE AKTARMALAR YAPILMIŞ (canlı 07.09):**

    Amazon/AMZN            63 satış
    Elden Satış             9 satış
    Amazon S.ahmet/SEDA/EKREM   0 satış (boş, aktif)

Yani K64 ② ve K65 ② **fiilen kapanmış**; pano onları `[BEKLİYOR]` diye
taşıyordu. _(K138'in aynısı: pano niyeti durum sanıyor.)_

⏭ **KALANLAR DIŞ BELGEYE BAĞLI — uyur:** Amazon `ChannelFee` kuralları
(Amazon'un kendi hakediş raporu gerekiyor) · 54 ASIN eşleştirmesi ·
`AMZN` hesabının pasife alınması. **Açılış şartı:** Amazon hakediş raporu.
⚠ Üç boş Amazon hesabı (S.ahmet · SEDA · EKREM) aktif duruyor; satışı yok,
zarar vermiyor — temizlik işi, iş değil.

### ⑤ K78 — SİPARİŞ SATIRI KALDIRILAMIYOR · [⚠ AŞILDI — bkz. K180]

> ⛔ **BU KALEM AYNI GÜN AÇILDI VE KAPANDI.** Aşağıdaki "uyur" kaydı sabahki
> hâldir ve **silinmiyor**: karar çevrildiğinde önceki gerekçe, NİYE
> çevrildiğiyle birlikte dosyada bırakılır. Geçerli olan **K180**.

Sistemde kalem silme yolu YOK ve iki kötü seçenek ölçülmüştü (tamamını iptal
→ gerçek adet de gider · betikle sil → `StockMovement.saleItemId` SetNull,
hareket sahipsiz kalır). **Halil kararı 28.08.2026: çözüm tasarımı AYRI TUR.**
Bugün de öyle kalıyor — karar değişmedi, sadece panoda "açık iş" gibi
duruyordu.

⭐ **BUGÜNKÜ YOL YAZILI OLSUN:** mükerrer satır çıkarsa **satışı iptal et,
doğru hâliyle yeniden gir** (K18'de bu yol açıldı: iptalli çakışma artık ayrı
hüküm veriyor ve ekran iptalli satışa bağlantı veriyor).
⏭ **AÇILIŞ ŞARTI:** mükerrer satır **ikinci kez** gerçek bir işi engellerse.

---

## ✅ K178 — ÜÇ AÇIK KALEM KAPANDI: pre-commit · sipariş saati · onay durumu · 07.09.2026

> **Halil:** _"bunları kapatalım, açık task istemiyorum."_

### ① K173 — `pre-commit` KAPISI KURULDU (üç kez tekrarlayan desenin çaresi)

Bekçi turu koşarken mutasyon harness'leri kaynağı **canlı olarak bozup geri
yazıyor**; o sırada atılan `git add -A` havada duran bir mutasyonu commit'e
alıyor ve harness dosyayı sonradan geri yazdığı için tur TEMİZ ağaca karşı
koşup **yeşil** yanıyor. Aynı desen **üç kez** yaşandı (K149 · 03.09 ·
K173/06.09) ve sonuncusu canlıya bozuk kod gönderdi.

Kapı **push'ta vardı, commit'te yoktu** — bir adım erkene alındı:
`.githooks/pre-commit` → `scripts/kilit-kapisi.ts`.
⚠ **ÖLÇÜT YAZILMADI, ÇAĞRILDI:** "tur koşuyor mu" sorusunun tek gövdesi
`bekci-kilit.ts`; bu kapı onun **üçüncü okuyucusu**. Kabukta ikinci bir kilit
ölçütü yazılsaydı biri canlı sayarken öteki bayat sayardı.

**KAPI SINANDI — beyanla değil denemeyle:**

    kilit YOK    → çıkış 0, commit serbest
    kilit CANLI  → çıkış 1, gerçek `git commit` REDDEDİLDİ
    kilit kalktı → çıkış 0

⚠ İlk deneme yanlış çıktı verdi: Git Bash'in `$$` değeri Windows PID'i değil,
`process.kill` onu ölü saydı. Gerçek bir Windows PID'iyle tekrarlandı.
⚠ **DÜRÜSTLÜK:** `git commit --no-verify` bu kapıyı atlar; koruma "mekanik
olarak imkânsız" değil, **kazayla imkânsız**.

### ② K163 + K164 — SATIŞ DETAYINDA SİPARİŞ SAATİ VE ONAY DURUMU

**Saat:** liste ekranı saati basıyordu, detay basmıyordu — aynı satış iki
ekranda farklı görünüyordu (İlke #10). ⚠ Ve ternary listede **İKİ yerde**
kopyalanmıştı; detaya üçüncü kopya eklemek yerine ortak gövdeye alındı:
`bicim.tarihSaat`. Saat **yalnız biliniyorsa** basılır — elle/Excel kayıtları
güne damgalıdır ve "00:00" basmak yokluğu değer gibi gösterirdi (İlke #11).

⛔ **ONAY DURUMUNDA ÖLÇÜTÜ ELDE KURDUM VE ÖLÇÜM ÇÜRÜTTÜ.** İlk yazımda
`importKaynak != null && onaylandiAt == null` → "onay bekliyor" dedim; canlı
ölçüm bunun **7608 satışa** o cümleyi bastıracağını gösterdi. Kuyruğun gerçek
ölçütü çok daha dar (kargolanmamış · stok bağı yok · saatli). Ekran ile
kuyruk ayrışsaydı panelin en temel sözü çiğnenirdi: **sayı = liste**.

⭐ Etiket artık kuyruğun **kendi gövdesinden** (`onayaUygunMu`) besleniyor ve
eşleme saf gövdeye çıkarıldı (`onayDurumuAnahtari`) — değerle sınanabilsin
diye. Gerçek dağılım (canlı 07.09, 7897 satış):

    ZATEN_ONAYLI  7551  → "Stoktan düşülmüş — onay akışı dışında"
                          (28'i onay izli → "Onaylandı · tarih")
    ICE_AKTARMA_DEGIL 261 · KARGOLANMIS 52 · IPTALLI 33
    ⭐ ONAY BEKLİYOR: 0   ← kuyruk bugün BOŞ

**KANIT:** `ice-aktarma:dogrula` 338/338 (9 yeni ölçüt) · **6 mutasyon 6
kırmızı** (detay saati · saf gövde çağrısı · ZATEN_ONAYLI ayrımı · hepsini
bekliyor sayma · ortak gövdedeki saat kapısı · listeye kopya geri gelmesi).
⚠ İki eskiyen ölçüt tazelendi (liste kopyalarını sayıyorlardı) — gevşetilmedi,
**yer değiştirdi**: kapı artık TEK yerde aranıyor.

---

## ✅ K177 — PANEL "BUGÜN"Ü UTC'DEN KURULUYORDU · 07.09.2026 · [KOD KOŞTU]

> **Halil:** _"gece 1'de siparişi çekmiş ama panele yansımamış."_ Satış
> listesi `07.09.2026 · 01:19` diyordu, panel ise **"Trendyol: bu dönemde
> satış yok"**. İki ekran birbirini yalanlıyordu.

**KÖK NEDEN — İKİ AYRI İŞ TEK GÖVDEYE BİNMİŞ.** `gunDegeri` hem tarih
SAKLAMA biçimini (Excel/elle kayıt UTC 00:00'a damgalanır — K163 sözleşmesi)
hem pencere SINIRINI üretiyordu. Sınır UTC'den kurulunca "bugün" fiilen
**İstanbul 03:00 → 03:00** oldu:

    BUGUN penceresi : 07.09 03:00 → 08.09 03:00   (İstanbul)
    olması gereken  : 07.09 00:00 → 08.09 00:00

Yani **İstanbul 00:00–03:00 arasında düşen her API siparişi bir ÖNCEKİ güne**
yazılıyordu — dokuz pencere türünün dokuzunda birden.

📏 **ÖLÇÜLDÜ (canlı):** 7852 satışın **7824'ü** gün-hassasiyetli (UTC 00:00
damgalı) ve **etkilenmiyor** — D günü 00:00 UTC, İstanbul D gününün İÇİNDE
(03:00). Yanlış kovaya düşen **2** kayıt vardı, ikisi de API çekimi.
⚠ Ama çekim **5 dakikada bir** koşuyor: bu sayı her gece büyürdü ve ayın
1'inde bir önceki AYA taşardı. Bugün küçük, yarın kanayan bir yer.

**ÇARE — İKİSİ AYRILDI:** `gunDegeri` saklama için AYNEN kaldı; sınırlar için
`gunBasiAni` (İstanbul gece yarısı ANI) eklendi. `Pencere`'ye **`ilkGun`**
eklendi: sınır ile ETİKET artık ayrı alanlar ve tipte gerekçesi yazılı
(`bicim.tarih`/`gunMetni` etiketi okur, karşılaştırmalar sınırı).
⚠ **OFSET GÖMÜLMEDİ** — Türkiye 2016'dan beri UTC+3 ama sabit bir "3", kural
değişirse sessizce yanlış olurdu; ofset `IS_SAAT_DILIMI`'nden ÖLÇÜLÜYOR.

**KANIT:** dokuz pencere türünün dokuzu da İstanbul 00:00 → 00:00 · gece
01:19 siparişi BUGÜNE düşüyor · tarih-only kayıtlar bozulmadı · hafta
pazartesi · ay sınırı · OZEL aralık · kıyas penceresi aynı hizada.
`donem:dogrula` **6. bölüm** (59 ölçüt) · **5 mutasyon 5 kırmızı**.

⛔ **VE ÖLÇÜT TAZELERKEN KENDİ KÖRLÜĞÜMÜ ÜRETTİM — MUTASYON YAKALADI.**
`rapor:dogrula` ve `suzgec:dogrula` sınırları `gunMetni` (UTC) ile okuyordu ve
haklı olarak kırmızı yandı. Onları `istGun` (İstanbul **günü**) yapınca yeşile
döndüler — **ama eski hatalı davranışla da uyumlu** hâle geldiler: UTC gece
yarısı = İstanbul 03:00, yani AYNI GÜN. Sınırı UTC'ye geri döndüren mutasyon
**yeşil geçti.** Ayırt edici olan tarih değil **SAAT**; iki bekçiye de "sınır
İstanbul 00:00'da" ölçütü eklendi ve mutasyon ① ikisinde de kırmızı yandı.
_(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz" —
bu kez gözlemi ben körleştirmiştim.)_

─── ② **TAM TUR İKİ BEKÇİ DAHA BULDU — VE BİRİ GERÇEK DAVRANIŞTI**

Ben yalnız bir alt küme koşmuştum; push kapısı tam turu koşturunca
`karsilastirma:dogrula` (5) ve `operasyon:dogrula` (1) kırmızı yandı.
_(Anayasa: "push öncesi BÜTÜN bekçiler koşulur, seçilmişler değil" —
alt küme koşmak tam bu yüzden yetmiyor.)_

· **`karsilastirma`** — ölçüt eskimesi: kıyas dönemin hangi GÜNLERİ kapsadığı
  soruluyordu ama okuma `baslangic` (sınır anı) üzerindendi. `ilkGun` etiket
  çapasına bağlandı (8 okuma).
· **`operasyon`** — ⛔ **ÖLÇÜT DEĞİL, GERÇEK TUTARSIZLIK.** `operasyonSerisi`
  ekseni UTC çapalarıyla (`imlec`/`sonraki`) kuruyor ama kırpmayı SINIR
  anlarıyla yapıyordu; ikisi karışınca son kovanın `sonGun`u pencereninkiyle
  tutmadı. **Grafik ekseni bir GÜN LİSTESİDİR, an değil** — kırpma da
  `ilkGun`/`sonGun` etiket çapalarına alındı. Kayıtların hangi kovaya düştüğü
  zaten `isTakvimGunu` ile İstanbul gününden okunuyordu, o taraf değişmedi.

⚠ **VE `as never` TİP KONTROLÜNÜ ATLATMIŞTI:** bekçinin elle kurduğu
`Pencere` nesnesi `as never` ile yazılmıştı, bu yüzden yeni `ilkGun` alanı
eksik kaldığı hâlde `tsc` sessiz kaldı ve seri **0 nokta** üretti. Cast,
tipin koruyacağı şeyi tam da eklenen alanda kör etti.

**MUTASYON — 7 senaryo, 7 kırmızı:** ①–⑤ (sınır/etiket/hafta/bitiş/kıyas) +
⑥ ekseni sınır anına döndüren + ⑦ eksen bitişini sınır anına döndüren.

---

## ✅ K176 — AYRIŞAN MALİYET DAMGALARI · 07.09.2026 · [KOŞTU — 01.08.2025→bugün]

`npm run canli:maliyet-hizala` (rapor kipi, salt okuma):

    taranan tüketim hareketi   8127
    AYRIŞAN damga               783   (%9,6)
    kârı etkilenecek satış      771

Parti maliyeti ile o partiden yemiş **çıkış damgası** ayrışmış. Kâr motoru
maliyeti ÇIKIŞ damgasından okur — yani bu satışların NET'i partinin bugünkü
maliyetiyle değil, damganın taşıdığı eski değerle hesaplanmış durumda.

⚠ **SINIF BİLİNEN, ÖLÇEĞİ BİLİNMİYORDU.** Aynı kök bugün iki kez daha çıktı:
`canli-alim-maliyet-duzelt` → `goodsAmount`a yazmıyordu (kapatıldı, K175 ③) ·
`canli-cikis-maliyeti-duzelt` → çıkışlara yazıp **alım kalemini** bırakmıştı
(LEGO artığı, K175 ⑧). Üçü de tek cümle: **düzeltme bazı okuyuculara ulaşıyor,
bazılarına ulaşmıyor.** Bugüne kadar panoda ölçeği YAZILI DEĞİLDİ.

⛔ **`--uygula` KOŞULMADI VE ÖLÇÜLMEDEN KOŞULMAZ.** 771 satışlık bir yazım,
K91'de ölen onarımın büyüklüğünde. Önce sorulacaklar:
1. 783'ün kaçı **gerçek artık** (düzeltme ulaşmamış), kaçı **meşru** fark?
2. Yön ne — damga partiden YÜKSEK mi DÜŞÜK mü, ve NET hangi yöne oynar?
3. Etkilenen satışların kaçı kapanmış **muhasebe dönemine** düşüyor?
   (Kapalı dönemin NET'i beyan edilmiş olabilir — dönem kapısı devreye girer.)
4. Yazım tamamı-ya-hiçbiri mi, satır satır tekrar-koşulabilir mi?

⭐ **YENİ BEKÇİ YAZILMADI — BİLİNÇLİ.** Bu sınıfın ölçen aracı ZATEN var
(`canli:maliyet-hizala`, rapor kipi). İkinci bir ölçüt eklemek aynı soruya iki
cevap üretirdi. _(Anayasa: "iki yerde iki ölçüt olmaz".)_ Eksik olan ölçüt
değil, bu rakamın **panoda görünmemesiydi**; o giderildi.

⏭ ~~SIRADAKİ ADIM ÖLÇÜM, YAZIM DEĞİL~~ — **ölçüldü ve KOŞTU (07.09).**

─── ② **HALİL KARARI: 01.08.2025'TEN BUGÜNE DÜZELT**

Ölçüm önce yön ve büyüklüğü verdi (`npm run canli:damga-olcum`):

    ayrışan 781 · etkilenen satış 770
    damga DÜŞÜK → maliyet ARTAR   +249.335   (kâr düşer)
    damga YÜKSEK → maliyet AZALIR  −61.991   (kâr artar)
    NET MALİYET ETKİSİ            +187.344
    ⭐ bunun ~%90'ı 2024–2025 ilk yarısında

Kullanıcı kesimi **01.08.2025** seçti — uydurma değil, kendi **resmî ölçüm
sınırı** (K153). Araca tarih penceresi eklendi (`--baslangic=`); pencere
ölçütü **satış günü** (`soldAt`), hareketin `occurredAt`i değil.

**KOŞTU** (`canli:maliyet-hizala -- --baslangic=2025-08-01 --uygula`):

    554 damga hizalandı · 545 satışın kârı tazelendi · iz MALIYET_HIZALAMA
    pencerede ayrışan damga: 0        (tekrar koşumla doğrulandı)
    01.08.2025 ÖNCESİ 2030 hareket — DOKUNULMADI
    Σ NET-2   2.351.682,26 → 2.277.716,34      −₺73.965,92   (marj %10,53 → %10,20)

⚠ **BU RAKAM KURUŞUNA ATFEDİLEBİLİR DEĞİL — İKİ SEBEP, İKİSİ DE KAYDA GEÇİYOR:**
① `TY_SIPARIS_ICE_AKTARMA` **5 dakikada bir** koşuyor; yazım sürerken defter
akmaya devam etti. _(Anayasa: "donmuş kaynak, akan kaynakla karşılaştırılırken
iki damga yazılır".)_
② Araç satır bazında **eski değeri saklamıyor** (iz yalnız `hizalananDamga` ve
`tazelenenSatis` sayılarını tutuyor) — ve uygulayan kişi çıktının satır satır
önce/sonra satırlarını `grep` ile eleyerek atfetmeyi büsbütün imkânsız kıldı.
_(Anayasa: "toplu yazımda önceki değer SATIR BAZINDA saklanır" · "hata mesajını
kısaltan her işlem teşhisi kısaltır" — ikincisi burada BAŞARI raporunda oldu.)_
⛔ **AÇIK:** `canli-maliyet-hizala` izine satır bazında önce/sonra eklenmeli.

─── ③ **YAN ETKİ: BİR SATIŞ NO_COST'A DÜŞTÜ — VE KAPATILDI**

`11518018178` (18.08.2026 · TY/AXCALI · LEGO Disney 43217 · ciro ₺4.185)
`CALCULATED → NO_COST` oldu. Sebep: çıkışın bağlı olduğu parti bir
**ADJUSTMENT** (19.08) ve `unitCostAmount = NULL`, alım kalemine de bağlı
değil. Hizalama damgayı partiye eşitleyince maliyet "bilinmiyor" oldu.

⭐ **DEĞER UYDURULMADI:** Halil beyanı **₺3.599** _("alış bu ve Excel'de
vardı")_. Defter destekliyor — `ALM-NON-260813-01/-02` · 13.08.2026 · ×2 @
3.599,00, satıştan beş gün önce.

**YAZILDI** (`canli:11518-maliyet -- --uygula`) → parti VE çıkış damgası
birlikte. ⚠ Yalnız damga yazılsaydı bir sonraki hizalama onu partiye (NULL)
eşitleyip **silerdi**; arıza aynı yoldan geri gelirdi.
Sonuç: `NO_COST → CALCULATED` · NET-1 **234,47** · NET-2 **189,58** ·
hizalama tekrar koşuldu, **ayrışan 0**.
⭐ **BAĞIMSIZ TEYİT:** 189,58, 20.08'de aynı ürün için yazılan iptal izindeki
NET-2 ile **birebir aynı**.

**DEFTERİN SON HÂLİ: 7851 satış, hepsi CALCULATED — maliyeti bilinmeyen satış
kalmadı.**

⛔ **KAPANDI — KULLANICI KARARI 07.09.2026:** _"01.08 öncesinin kâr durumu
bizim için mühim değil, tamamen dikkat dışı olacak. Sadece gerekli durumlarda
alım satım istatistikleri geleceğe yön versin ve fikir olsun yeter."_

01.08.2025 öncesi ayrışma (2030 hareket, ~₺113k) **düzeltilmeyecek** ve bu bir
erteleme değil, KARARDIR. O dönemin kâr rakamı kullanılmıyor; alım/satım
adet ve fiyatları zaten yerinde duruyor ve ürün analizi/fiyat denemesi onları
okuyabiliyor — istatistik tarafı için ayrıca iş açılmadı (kullanıcı istemedi).

⚠ **BU KALEM YENİDEN AÇILMAZ.** Tam turlu `canli:maliyet-hizala` (pencere
vermeden) hâlâ bu 2030 hareketi "ayrışan" diye sayar; o rakam bir iş DEĞİL,
kapsam dışıdır. Bunu bilmeden gören biri bir gün harcar.

---

## 💤 K174 — PROMOSYON ALIMLARININ KAYNAĞI BİLİNMİYOR · 06.09.2026 · [UYUR — açılış şartlı]

**KARAR (Halil, 06.09.2026): kaynak BOŞ bırakılır, uydurulmaz.** Boş alan
bir eksiklik değil **BEYANDIR**: _"sistem bunu bilmiyor."_ Uydurma bir
tedarikçi o beyanı susturur ve üstüne rapor kurulur.

### ÖLÇÜLDÜ — ŞEMA İŞİ GEREKMİYOR (asıl soru buydu)

    Purchase.supplierId       String?  -> Supplier        (onDelete: SetNull)
    Purchase.channelAccountId String?  -> ChannelAccount

İkisi de VAR ve nullable; kaynak yazmak düz bir `UPDATE`. **Migration
açılmadı çünkü GEREK YOK** — kalem "orantısız şema işi" diye değil,
**cevap olmadığı için** uyuyor. İki gerekçe farklıdır ve doğrusu budur.

### DÖRT KAYIT (üç değil) — ölçüt `PurchaseItem.promosyon`, dize DEĞİL alan

| kod | ürün | satıldığı kanal |
|---|---|---|
| `PROMO-K171B-…-1` | Arzum Ar2001 Tostçu | Trendyol / AXCALI |
| `PROMO-K171B-…-2` | Arzum Ar2001 Tostçu | Trendyol / AXCALI |
| `PROMO-K171B-…-3` | Huawei Freebuds SE 3 | Hepsiburada / AXCALI |
| `PROMO-KARCHER-…` | Karcher RM 503 | Hepsiburada / AXCALI |

Dördünde de `supplierId` NULL · `channelAccountId` NULL. `supplierName`
yer tutucu bir metin taşıyor: **"Promosyon"**.

### ⛔ NOTLARDAKİ NUMARALAR KAYNAĞI SÖYLEMİYOR — SATIŞ KODLARI

Deftere soruldu: `10470598902` · `10471782870` · `4199793212` ·
`4702076555` — dördü de **`Sale.code`**, dördünde de karşılık gelen
**ALIM YOK**.

⚠ **BİÇİMDEN HÜKÜM ÇIKARILMADI, SEBEBİ ŞU:** numaralar 11 hane "1…" (TY) ve
10 hane "4…" (HB) kalıbına uyuyor ve satış kanallarıyla da örtüşüyor — yani
_"demek ki TY/HB kampanyası"_ demek çok kolaydı. Ama bu gözlem **rakip
okumayı ELEMİYOR:** TY'de satılan bir mal distribütörden gelmiş olabilir.
**Satıldığı yer, geldiği yer değildir.**
_(Anayasa: "iki okumayla da uyumlu bir gözlem, hiçbirini kanıtlamaz".)_

### ⏭ AÇILIŞ ŞARTI — ikisinden biri

**①** Halil kaynağı **hatırlar** ya da belge çıkar (kampanya e-postası,
fatura, distribütör irsaliyesi) → dört kayda `supplierId` (+ varsa
`channelAccountId`) **izli** yazılır.
⭐ **VE AYNI GÜN `supplierName` YER TUTUCUSU DA DEĞİŞİR** (Halil şartı
06.09): `"Promosyon"` gerçek tedarikçiyle değiştirilir, yoksa aynı alım iki
ayrı "tedarikçi" adıyla anılır. **Ölçüldü:** bugün tedarikçi bazlı bir
gruplama raporu YOK (`groupBy supplier` hiçbir yerde geçmiyor), ama yer
tutucu görünmez değil — `lib/tedarikci-adi.ts`
(`supplier?.name ?? supplierName`) onu **dışa aktarmada ve ürün kartında**
tedarikçi adı olarak basıyor. Yani ihtiyaç bugün rapor değil **tutarlılık**;
gruplama doğduğu gün de hazır olur.

**②** **BEŞİNCİ promosyon alımı girilir** → o an form kaynağı SORAR ve soru
bir daha geçmişe kalmaz.
⚠ **FORMUN KAYNAK SORMASI K174'ÜN AÇILIŞ GÜNÜNÜN İŞİDİR, BUGÜNÜN DEĞİL**
(Halil, 06.09). Bugün form promosyon kutusunu soruyor, kaynağı sormuyor ve
**bu bilinçli**: cevabı olmayan bir soruyu forma eklemek, dört kaydı
düzeltmeden yeni kayıtlara zorunlu alan açardı.

⚠ **BU KALEM İŞ ÜRETMİYOR.** Uyarı kutusuna KONMAZ, panel rozeti almaz:
bugün kapatılabilir bir madde değil, bir KAYITTIR. Görev sanılırsa
kapatılamayan bir satır olarak kutunun tamamına olan güveni eritir.
_(Anayasa: "kapanamayacak kayıp, görev değil kayıttır".)_

---

## 📊 K173-② — TY ÇAPRAZI: SİPARİŞ 11538106902 · 06.09.2026 · [ÖLÇÜLDÜ · yazım yok]

> **TY finans SON HÂL (Halil, 3 ekran):** komisyon NET 0 (kesilip iade
> edilmiş) · iade −5.949 · kargo −141,42 (%2,4) · platform hizmet −13,19 ·
> iade kargo 0 · **Net Sipariş −154,61**.

### ②a — −₺907,22 SATIR SATIR TÜRETİLDİ · **TUTUYOR**

    − satış KDV iadesi    (5.949,00 @%20)   −991,50
    + komisyon KDV iptali (  505,67 @%20)   + 84,28
    + ödeme gideri KDV    (    0,00     )      0,00   ← TY'de ödeme gideri yok
    − kargo KDV indirimi  (    0,00     )      0,00   ← iade kargosu yok
    ─────────────────────────────────────────────────
    TÜRETİLEN −907,22   ·   KAYITLI −907,22   ·   FARK 0,00

Girdilerin ikisi de **TY'nin kendi rakamı** (5.949 ciro · 505,67 komisyon =
%8,5). Motorun sözleşmesi tutarlı: `kar.ts` _"tutarlar KDV DAHİLDİR"_ diyor;
HB'de komisyona KDV **eklenir**, TY'de eklenmez çünkü **zaten içindedir** —
bu yüzden 505,67'nin içinden 84,28 çıkarılıyor.
⚠ Motorun kendi yorumu bu bloğu **`S6 VARSAYIMI — muhasebeci teyidi
bekliyor`** diye işaretliyor; tek açık nokta bu ve TY'nin kendi belgesi onu
söylemiyor.

**222 İADE TARAMASI: 222/222 TUTUYOR · SAPAN 0.**
⛔ **İLK TURDA "13 SAPAN" ÇIKTI VE HATA BENDEYDİ.** Türetmeme motorun
formülündeki `+ tazminatKdv` terimini yazmamıştım; 13 kaydın 13'ünde de
`TAZMINAT_TAHSILATI` satırı vardı, 209 tutanın hiçbirinde yoktu. Terim
eklenince sapma **0**'a düştü. _(Anayasa: "boş sonuç ile temiz sonucu ayırt
edemeyen denetim" — burada denetimi eksik yazan bendim; deseni SAYMAK
teşhisi tek adımda verdi.)_

### ②b — ₺12,65 BULUNDU: **KARGO TAHMİNİ**, stopaj değil

    bizim iade sonrası NET-1   −167,26
    TY Net Sipariş             −154,61   (= −141,42 kargo − 13,19 hizmet)
    FARK                        −12,65

    kapanış kalemleri (giden ↔ dönen):
      maliyet   4.844,16 ↔ 4.844,16   AÇIK 0,00
      komisyon    505,67 ↔   505,67   AÇIK 0,00
      stopaj       49,58 ↔    49,58   AÇIK 0,00   ← TAM DÖNÜYOR
      kargo       154,07  (bizim)  ↔  141,42  (TY)   → **FARK 12,65**

**Stopaj tam dönüyor** (sorulmuştu). Fark tamamen kargoda: bizim `KARGO`
kesintimiz **tarife tahmini** (desi × tarife + %20), TY'nin fiilen kestiği
**141,42**. KDV hariç tabanda 128,39 ↔ 117,85 — aradaki 10,54'ün %20'lisi
tam 12,65.
⛔ **KAYNAK ÖNCELİĞİ GEREĞİ TY KAZANIR** (kanalın kendi belgesi > bizim
çıkarımımız). Yani bu siparişte NET-1'imiz **12,65 fazla karamsar**.
⏭ Bu tek sipariş bir DÜZELTME emri değil: aynı sapma kaç siparişte var,
yönü sabit mi — **ekstre mutabakatında ölçülecek** (K-5 kargo cephesi).

### ②c — TÜR ÇELİŞKİSİ: KANAL İÇİ ÇELİŞKİ **YOK**, ETİKET ELLE YAZILMIŞ

| soru | ölçülen |
|---|---|
| kayıtta claims kodu var mı | **YOK** — `note` tamamen boş |
| kayıt nereden geldi | **ELLE** — satışın `importKaynak` = null |
| ne zaman yazıldı | 05.09.2026 10:21:48 · `createdAt = updatedAt` (hiç düzenlenmemiş) |
| TY claims ucu bağlı mı | **HAYIR** — `scripts/ty/istemci.ts`'te uç VAR, iade kaydına HİÇ bağlanmamış |

⭐ **SONUÇ: "kanal içi çelişki" sorusu bugün DOĞMUYOR.** TY'nin iki ucu
çelişmiyor; **claims ucuna hiç sorulmadı.** Etiketi bir insan yazdı, kaynak
izi bırakmadan. Dolayısıyla "hangisi kazanır" kuralı bugün karara
bağlanamaz — bağlanacak bir çelişki yok.
⛔ **AMA 114'LÜK YAZIMDAN ÖNCE KARARA BAĞLANMALI VE ŞARTI BUDUR:** claims
içe aktarması `returnType`ı yazan İLK kod olduğunda, elle yazılmış etiketle
çakışma **o gün doğar**. Kural o gün yazılır; bugün yazılırsa olmayan bir
çelişki için uydurulmuş olur.

**TÜR–PARA BAĞI (kaynaktan):** `UNDELIVERED` = _"gelir ve kesintiler geri
gelir, mal stoğa döner, **gidiş kargosu yanar, ek kargo yok**"_ ·
`NORMAL` = _"aynısı **+ dönüş kargosu satıcı gideri**"_. Motor `iadeKargosu`nu
**türden TÜRETMİYOR** — elle girilen alan. Yani etiket parayı kendiliğinden
değiştirmiyor; operatöre _"dönüş kargosu gir"_ demek için var.
**Bu kayıtta finansal etki SIFIR** (iade kargosu boş, TY de "iade kargo 0"
diyor). Tür düzeltmesi bu yüzden **saf metadata**: para 0, yalnız etiket.
⏭ Düzeltme **onay bekliyor** (metadata istisnası: miktar/para değil · iz
bırakan betik · kaydın kimliğine kilitli). Canlıda tür dağılımı:
**NORMAL 219 · UNDELIVERED 2 · DISPUTED 1** — yani UNDELIVERED zaten
istisna, ikisinden biri bu.

### ②c-3 — "TY SONRADAN KESERSE" BEKLEYEN SINIF

    TRENDYOL    · NORMAL   kargo 0:  7  · kargo>0: 125
    HEPSIBURADA · NORMAL   kargo 0:  3  · kargo>0:  80
    AMAZON      · NORMAL   kargo 0:  0  · kargo>0:   4
    TRENDYOL    · DISPUTED kargo 0:  0  · kargo>0:   1

**10 kayıt** (TY 7 + HB 3) NORMAL olduğu hâlde dönüş kargosu taşımıyor.
Kural gereği NORMAL'de dönüş kargosu satıcıdadır → bunlar ya gerçekten
kesilmedi ya **henüz** kesilmedi. **Ekstre mutabakatına not düşüldü**;
kendi başına bir hata değil, izlenecek bir sınıf.

---

## ✅ K173-③ — NET-2 TÜKETİCİ SINIFLAMASI · 06–07.09.2026 · [HALİL TESTİ GEÇTİ]

**AYIRT EDİCİ SORU:** bu kümede `net2 > net1` olabilir mi? Olamıyorsa kırpma
gövdesine bağlamak gereksiz; olabiliyorsa bağ **ya da gerekçeli muafiyet**
şart. Ölçüldü (canlı, 06.09):

    tek SATIŞ kaydında net2 > net1     7845 satışın  107'sinde   (%1,4)
    tek KALEM kaydında                 8007 kalemin   42'sinde
    DÖNEM toplamında (satış-yalnız)      28 dönemin    0'ında
    DÖNEM toplamında (satış + iade)      28 dönemin    0'ında
    ÜRÜN toplamında (varyant)          1628 varyantın  5'inde   ⛔ GERÇEKLEŞİYOR

| # | dosya | okuma türü | karar |
|---|---|---|---|
| 1 | `lib/panel.ts` | dönem + kanal·hesap + kanal·ay | **BAĞLI** ✓ |
| 2 | `lib/rapor.ts` | dönem (brüt) | **BAĞLI** ✓ |
| 3 | `components/iade-blogu.tsx` | tek sipariş (satış+iade) | **BAĞLI** ✓ (K170c) |
| 4 | `lib/donem-raporu.ts` | **dönem** (muhasebeciye giden sayfa) | ⏳ **BAĞLANMALI** — bugün 28/28 temiz ama küme yapısal olarak aşabilir; ekran net1 ve net2'yi YAN YANA basıyor |
| 5 | `lib/panel-listeler.ts` | **ürün** (SaleItem toplamı) | ⏳ **KARAR MİMARDA** — 5 varyantta fiilen aşıyor |
| 6 | `lib/rapor/urun-analizi.ts` | **ürün** (SaleItem toplamı) | ⏳ **KARAR MİMARDA** — aynı küme |
| 7 | `lib/satis-toplami.ts` | liste toplamı — **yalnız net2** toplar | **HAM KALIR** — kıyaslanacak net1 yok; kırpmanın referansı olmaz |
| 8 | `lib/iade-liste.ts` | **iade-yalnız** toplam (`toplamEtki2`) | **HAM KALIR** — kırpma net1'e indirir ve **KDV sütununu tamamen sıfırlar**; iadelerin KDV etkisi ayrı bir sorudur |
| 9 | `app/page.tsx` | panel çıktısını **çizer** | **HAM KALIR** — kaynağı (1) zaten kırpılmış |
| 10 | `app/rapor/page.tsx` | rapor çıktısını **çizer** | **HAM KALIR** — kaynağı (2) zaten kırpılmış |
| 11 | `app/rapor/urunler/page.tsx` | `Math.max(0, net2)` — Pareto payı | **HAM KALIR** — kırpma değil, negatifi paydan çıkarma |
| 12 | `app/okut/sayim-yazim-actions.ts` | — | **YANLIŞ ALARM** — net2 yalnız bir YORUMDA geçiyor, tüketici değil |

⛔ **ÜRÜN KÜMESİ (5·6) NEDEN MİMARA BIRAKILDI — VE KIRPMA BURADA ŞÜPHELİ.**
Kırpmanın gerekçesi **KDV DÖNEMİDİR**: ödenecek KDV dönem başına hesaplanır,
negatife düşen kısım nakde dönmez. Bir ÜRÜN ise KDV dönemi değildir; zararına
satılan bir ürünün ürettiği KDV alacağı, aynı dönemin öteki ürünlerinin
KDV'sinden **gerçekten** düşer. Yani orada kırpmak, gerçek bir etkiyi
gizleyebilir. _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı
korur".)_ Karar: **ürün satırında ya kırpma YOK ve net2>net1 açıklanır, ya
da kırpma VAR ve fazlalık ürün satırında da "KDV mahsubu" diye yazar.**
Bu bir tercih değil, mimar kararıdır.

⏭ **YASAK BUNDAN SONRA YAZILIR.** Desen yasağı (`donemNet2` dışında net2
kırpma) ancak muaf liste **gerekçeleriyle** kesinleştikten sonra
kurulmalı — bugün yazılsaydı 7·8·9·10·11'i haksız yere kırmızı yakar ve
susturulmak zorunda kalırdı. _(Anayasa: "bir sınırın yönü ölçülmeden
çevrilmez".)_

─── ② **KARAR (Halil, 06.09.2026) — ÜRÜN DÜZEYİNDE KIRPMA YOK**

Yukarıdaki iki şıktan **birincisi** seçildi ve şartı bağlandı:

> **Ürün kümesinde `net2 > net1` KIRPILMAZ.** Fazlalık bir hata değil
> **BİLGİDİR** — iadenin KDV avantajı. Silmek, gerçekleşen bir etkiyi
> gizlerdi.
>
> **ŞART — ÇIPLAK YEŞİL YASAK.** O satırlarda bağlam **zorunludur**:
> **"KDV mahsubu içerir"** işareti. Rakam bağlamsız duramaz.

**DESEN YASAĞI BUNA GÖRE KURULUR — kapsam ikiye ayrılır:**

| küme | kural |
|---|---|
| **agregasyon** (dönem · kanal · ay) | `donemNet2` gövdesine **BAĞLI** |
| **detay** (ürün · satır) | **MUAF** — ama gerekçe BEYAN edilir; **gerekçesiz muafiyet KIRMIZI** |

**MUAF (gerekçeli):** `lib/panel-listeler.ts` · `lib/rapor/urun-analizi.ts`
— ikisi de ürün toplamı okur ve **ürün bir KDV DÖNEMİ DEĞİLDİR.** Kırpmanın
gerekçesi dönemdir; kapsamı dışına taşınırsa koruduğu şey doğruluk değil
hatanın kendisi olur.

**BAĞLANACAK:** `lib/donem-raporu.ts` — dönem okuması, yani agregasyon
tarafı (üstteki tablonun ④'ü).

⚠ **ÜÇÜNCÜ BİR DETAY TÜKETİCİSİ ÖLÇÜLDÜ — 12'LİK TABLODA YOKTU.**
`urunlereTopla` **üç** yerden çağrılıyor: `app/page.tsx` ·
`lib/rapor/urun-analizi-verisi.ts` · **`lib/urun-karti.ts`**. Sonuncusu ilk
taramada görünmemişti. Kategori kararı onu kendiliğinden kapsıyor (detay →
gerekçeli muaf), ama **listeye ADIYLA girmesi şart**: eksik liste, yasak
yazıldığı gün o dosyayı sessizce muaf bırakır ve kimse fark etmez.
_(Anayasa: "kapsam genişlemesi, bağımlı listelerin de genişlemesidir".)_

### ÖRNEK KAYDA GİRDİ — 5 varyant, EKRANIN KENDİ GÖVDESİNDEN ölçüldü

`npm run canli:k173-urun-asimi` (salt okuma) · gövde
`panel-listeler.ts → urunlereTopla()` · canlı 06.09.2026 · 7998 kalem →
**1628 varyant · AŞAN 5** — ilk ölçümle **birebir aynı**.

    SKU           ÜRÜN                             NET-1      NET-2      FARK
    axcali1797    Steampickup 3-In-1 Buharlı…   -2463,71   -2090,27   +373,44
    axcali1951    80117 LEGO® Chinese Festiv…   -1087,87    -928,65   +159,22
    axcali1713    Braun Bnt400 Ateş Ölçer         788,50     890,06   +101,57  ⛔
    axcali2213    Karaca Sakura Powersteel 316    -84,42     -77,18     +7,23
    axcali2334    Portable 360 Bluetooth Hop.     -34,58     -33,02     +1,56

⛔ **BEŞİN DÖRDÜ ZARARDA — ORADA MAHSUP ZARARI KÜÇÜLTÜYOR.** Tehlikeli olan
tek satır **`axcali1713`**: kârda, ve NET-2 NET-1'in ÜSTÜNDE. Bağlamsız bir
yeşil orada _"bu ürün 890 kazandırdı"_ diye okunur; oysa **101,57'si nakit
değil**, ödenecek KDV'den düşen alacaktır. Şartın niçin konduğu tam olarak
bu satırda görünüyor — ve bu, K173-②d'de satış kutusunda verilen kararın
(nakit sonuç ile KDV mahsubu AYRI satır) ürün tarafındaki kardeşidir.

⏭ **SIRADAKİ İŞ — AYRI PAKET, KOD:**
① `donem-raporu.ts` → `donemNet2`'ye bağlanır
② ürün satırlarına **"KDV mahsubu içerir"** işareti + çıplak yeşil yasağı
③ desen yasağı bekçisi — **iki yönlü mutasyonla**: işareti SİLEN (yanlış
   susma) · işareti HER satıra basan (yanlış yanma) · muaf beyanını silen ·
   **gerekçesiz muafiyet** (bedava muafiyet olmaz)

─── ③ **KOD KOŞTU** (06.09.2026) — `367e44e`

**① AGREGASYON BAĞLANDI.** `donem-raporu.ts` artık `donemNet2`'den geçiyor;
`devredenKdv` ayrı alan olarak dönüyor ve dönem ekranı onu **şarta bağlı**
yazıyor. Kırpma olduğunda net1 ile net2 ekranda **eşit** görünür — açıklama
satırı olmasaydı muhasebeci eşitliği hata sanardı.

**② ÜRÜN SATIRI KIRPILMIYOR, ŞERH TAŞIYOR.** Yeni saf gövde
`kdvMahsubu(satir)` (`panel-listeler.ts`): `net2 − net1`, kuruşa yuvarlı,
negatifse 0. Şerh **üç ekranda**: panel (üç ürün listesi) · `/rapor/urunler`
(masaüstü tablo **ve** mobil kart) · ürün kartı (birim NET kutusunun notu).
Metin `Ortak` sözlüğünden — aynı kavram üç ekranda, ikinci sözlüğe kopya yok.

**③ BEKÇİ `net2-kirpma:dogrula`** — 25 ölçüt · 4 bölüm · bölüm sayacı özetten
ÖNCE koşar. **Muaf liste elle tutulmuyor:** ölçüt tersten kurulu —
`urunlereTopla` **çağıran her dosya** `NET2 KIRPMA MUAFIYETI:` + en az 20
karakter gerekçe yazmak zorunda. Yarın eklenen dördüncü çağrı da yakalanır.

**10 MUTASYON · 10 KIRMIZI**, iki yön de sınandı (şerhi silen · şerhi
koşulsuz basan · beyanı silen · gerekçesiz muafiyet · agregasyon bağını
koparan · negatifi döndüren · kuruş kapısını kaldıran · mobil şerhi silen ·
kart şerhini silen · devreden satırını silen).

⛔ **İKİ ÖLÇÜT KUSURU MUTASYONLA ÇIKTI — ikisi de yalancı yeşildi:**
· `blok()` çapası `"  return {"` idi ve dosyada ÖNCE `donemSiniri`'nde
  geçiyordu; üç ölçüt yanlış metni ölçüyordu ve biri **yanlış sebeple**
  yeşil yanıyordu. Çapa tekil bir ÇAĞRIYA bağlandı.
· kuruş kapısı `yakin()` toleransıyla (0,005) sınanıyordu ve ölçtüğü etki
  (0,000001) **toleransın içinde** kalıyordu — mutasyon ⑦ kaçtı. Ölçüt
  yanlış değildi, **örnek veri kördü**; kesin eşitliğe çevrildi.

### ✅ HALİL TESTİ GEÇTİ — 07.09.2026

Halil gerçek cihazda baktı: **`axcali1713` · `axcali1797` · `axcali2213` —
"rakamlar tutuyor".** Kârda olan tek satır (`axcali1713`, birim NET ₺148,34 +
şerh ₺101,57) ve negatifli satırlar ekranda doğrulandı. _"Sınanmamış ekran,
ekran değildir"_ boşluğu **kapandı.**

### (önceki durum kaydı) ÖLÇÜLDÜ, EKRANDA TEYİT YOK

Kod canlıda (`57d0f18`), bekçi turu **110/110** ve rakamlar gövdeden
ölçüldü — ama **hiçbir ekran gerçek cihazda görülmedi.** Bu satır o boşluğu
kapatmaz, ADINI koyar: _"sınanmamış ekran, ekran değildir."_ Beklenen asgari
teyit: **Braun `axcali1713` → birim NET ₺148,34 + şerh ₺101,57** ve
**negatifli bir SKU'da da şerhin çıktığı** (dördünden herhangi biri).

### HALİL TEST LİSTESİ (canlı adres, gerçek cihaz)

Rakamlar **ekranın kendi gövdesinden** ölçüldü (`urunlereTopla` +
`kdvMahsubu`, canlı 06.09.2026). Ürün kartı dönem SÜZMÜYOR — bu yüzden test
hedefi orası; rakam süzgeçten bağımsız birebir tutmalı.

| # | Ekran | Beklenen |
|---|---|---|
| ① | Ürün kartı → **`axcali1713`** (Braun Bnt400) | **Birim NET ₺148,34** · altında **"KDV mahsubu içerir (₺101,57)"** |
| ② | Ürün kartı → **`axcali1797`** (Steampickup) | Birim NET **−₺696,76** · **"KDV mahsubu içerir (₺373,44)"** |
| ③ | Ürün kartı → **`axcali1951`** (LEGO 80117) | Birim NET **−₺232,16** · **"(₺159,22)"** |
| ④ | Ürün kartı → **`axcali2213`** (Karaca Sakura) | Birim NET **−₺77,18** · **"(₺7,23)"** |
| ⑤ | Ürün kartı → **`axcali2334`** (Portable 360) | Birim NET **−₺16,51** · **"(₺1,56)"** |
| ⑥ | `/rapor/urunler` → süzgeç **Özel: 01.04.2026–31.07.2026** | `axcali1713` satırında NET-2 hücresinin ALTINDA aynı şerh; telefonda da görünür (İlke #8) |
| ⑦ | Panel → ürün listeleri | Şerh çıkan bir liste varsa ALTINDA açıklama: _"…o tutar nakit değildir…"_ |

⛔ **BİR YOL BUGÜN TETİKLENEMİYOR VE "GEÇTİ" SAYILMIYOR:** dönem ekranındaki
**devreden KDV** satırı. Ölçüldü — **28 dönemin 28'inde devreden 0**, yani
satır bugün hiçbir dönemde çizilmiyor. Kodu bekçiyle ve mutasyonla sınandı
(⑩), ama **gerçek cihazda görülmedi** ve raporda öyle yazıyor.
_(Anayasa: "tetiklenemeyen bir yolu geçmiş saymak, testi değil raporu
düzeltmektir".)_

---

## 🚨 K173 — `git add -A` KOŞAN MUTASYON TURUNU COMMIT'E ALDI · 06.09.2026 · [CANLIYA SIZDI · İLERİ DÜZELTİLDİ]

_K149'un **ÜÇÜNCÜ tekrarı.** İkincisi 03.09.2026'da yaşandı ve `pre-push`
kancasının kendi başlığında yazılı: "bir mutasyon turu `src/lib/panel.ts`i
değiştirdi, `git add -A` bozuk hâli commit'e süpürdü, harness dosyayı
SONRADAN geri yazdı ve push bekçi turunu TEMİZ çalışma ağacına karşı koştu.
Tur yeşil yandı, BOZUK COMMIT canlıya gitti." **Bugün aynı desen, aynı
mekanizmayla, üçüncü kez.**_

⛔ **ÜÇ KEZ TEKRARLAYAN BİR DESEN ARTIK "DİKKAT" İLE ÇÖZÜLMEZ.** Anayasanın
kendi ölçütü: bir başarısızlık tekrarladıysa, bizim tarafımız ölçüldüyse ve
teşhis aracı yoksa — mekanizma değişir. Burada ilk iki şart sağlanıyor;
üçüncüsü de kısmen (bu kez push'un kaynağı ölçülemedi). **Açık madde:
`pre-commit` kapısı** (aşağıda).

**NE OLDU.** Bir push'u arka plana attım; o push **20 dakikalık bekçi turunu**
koşuyor ve tur içindeki mutasyon harness'leri kaynak dosyaları **canlı olarak
bozup geri yazıyor.** Tur koşarken aynı ağaçta çalışmaya devam ettim ve
`git add -A` yaptım — havada duran bir mutasyonu commit'e aldım:

    58d3178  src/lib/panel/gorev-verisi.ts
      -  where: kabulKosulu(pencere),                        ← DOĞRU (ortak gövde)
      +  where: { purchasedAt: { gte: …, lt: … } },           ← MUTASYON

Commit'in adı _"K170c iade sonrası net kutusu"_ idi ve içinde alakasız bir
dosya vardı — **etiket içindekini anlatmıyordu.**

**KAPI BİR PUSH'U DURDURDU.** `pre-push`, turu koşturmadan ÖNCE _"çalışma
ağacı giden commit'ten ayrışmış"_ diyerek reddetti:
> _"Tur çalışma ağacını okur, giden commit'i DEĞİL. Ayrışma varsa yeşil
> sonuç gidenin değil, elindekinin güvencesidir."_

⛔ **AMA COMMIT YİNE DE UZAĞA GİTTİ — VE ÖNCEKİ CÜMLEM YANLIŞTI.**
İlk raporumda _"bozuk commit uzağa GİTMEDİ"_ yazdım; **o ölçüm YAZILDIĞI AN
doğruydu** (`origin/main` 65b4a8d'deydi) ama sonra aşıldı. `ls-remote` ile
ölçüldü: `origin/main` = **58d3178** ve içeriğinde kalıntı DURUYOR.
_(Anayasa: "aşılan rakam sessizce aşılmaz" — eski cümle silinmiyor, niye
düştüğüyle birlikte duruyor.)_

⚠ **PUSH'UN KAYNAĞI BELİRLENEMEDİ — VE UYDURULMUYOR.** Ölçülenler:
`origin/main` reflog'unda bu commit **`fetch` ile öğrenilmiş**, benim
`update by push` kaydım YOK; operasyon klonu (`axcali-operasyon`) yalnız
`pull --ff-only` yapıyor ve 14:22'de bu commit'i **çekmiş** (yani o saatte
uzakta zaten vardı); bu çalışma kopyasından atılan üç push'un üçü de
izlerinde. Yani commit bu kopyadan gitmedi ve nereden gittiği elimdeki
izlerle **ölçülemiyor**. Ölçülemeyen şey tahmin edilmiyor.

**⛔ VE KALINTI ZARARSIZ DEĞİLDİ — CANLIDA YANLIŞ RAKAM ÜRETİYORDU:**

    dogru   where: kabulKosulu(pencere)     → receivedAt (MAL KABUL günü)
    kalinti where: { purchasedAt: {…} }     → purchasedAt (SİPARİŞ günü)

Panelin "dönem alımı" rakamı, malın RAFA GİRDİĞİ gün yerine SİPARİŞ
verildiği güne göre sayıyordu. Üstelik bu tam olarak `kabul-sayimi.ts`'in
kendi belgesinde yasaklanan desen: _"çıplak `purchasedAt` yazmak YASAK"_ —
ve bekçisi VAR. **Bekçi kırmızı yanmadı çünkü turu TEMİZ çalışma ağacına
karşı koştu** (harness dosyayı commit'ten sonra geri yazmıştı); yani ölçüm
doğruydu, **yanlış şeyi ölçtü.**

**DÜZELTME İLERİ YÖNDE — GEÇMİŞ YENİDEN YAZILMADI.** `--force` ile 58d3178'i
silmek, operasyon klonunun `pull --ff-only`sini kırardı ve TY/N11 çekim
rutini sessizce eskimiş kodda kalırdı. Bunun yerine üstüne düzelten bir
commit yazıldı _(anayasa: "kesik iz silinmez, üstüne onu açıklayan ikinci
bir iz yazılır ve geçerli olan o olur")_.

**⛔ ASIL DERS — SEBEP `git add -A` DEĞİL, EŞZAMANLILIK.** Depoda zaten K161
_"iki eşzamanlı bekçi turu birbirini kirletti → tek tur kilidi"_ var; ama o
kilit **iki turu** birbirinden korur, **turu ile COMMIT'i** korumaz. Tur
koşarken çalışma ağacı geçici olarak yalan söyler ve o an atılan her toplu
`add` kumar olur.

> **KURAL:** bekçi turu koşarken git'e YAZILMAZ. Push'u arka plana atmak,
> ağacı o süre boyunca **tur'a devretmek** demektir; tur bitmeden commit
> atılmaz. Ve her hâlükârda `git add -A` yerine **dosyaları adıyla** eklemek
> kalıntıyı yapısal olarak eler.

⏭ AÇIK — DEĞERLENDİRİLECEK: `pre-commit` kancası, tur kilidi tutulurken
commit'i reddedebilir (K161'in kilidi zaten var; mekanizma bedava). Kapı
push'ta var, commit'te yok — koruma bir adım erkene alınabilir.
_(Anayasa: "güvenlik mekanizmaya bağlanır, disipline değil".)_

📌 **KAYNAĞI BELİRLENEMEYEN PUSH — KARAR (Halil, 06.09.2026):** tek vaka
olarak kaydedilir, bugün kovalanmaz. **Tekrarında inceleme açılır.**

---

## 📕 KILAVUZA GİREN İKİ MADDE · 06.09.2026

### "PUSH EDİLDİ Mİ" ÖLÇÜMÜ KARAR ANINDA TAZELENİR

Bir commit'in uzağa gidip gitmediği **ANLIK** bir olgudur; ölçüm ile karar
arasında geçen her dakika onu bayatlatır. 06.09'da _"bozuk commit uzağa
gitmedi"_ ölçümü **yazıldığı an doğruydu** (`origin/main` 65b4a8d) ve karar
verildiğinde **yanlıştı** (58d3178 gitmişti). Üstüne kurulan "kapı tuttu"
cümlesi de yanlış oldu.

> **KURAL:** geri alma / `--force` / ileri-düzeltme kararı verilmeden **HEMEN
> ÖNCE** `git ls-remote` ile tazelenir. Daha önce ölçülmüş olmak yeterli
> değildir; `origin/main` yerel bir **önbellektir**, gerçeğin kendisi değil.

_(Anayasa: "donmuş kaynak, akan kaynakla karşılaştırılırken iki damga
yazılır" kuralının GIT tarafı.)_

### ETİKETSİZ RAKAM TAŞINAMAZ

Bir sayı özete/rapora/mesaja taşınırken **hangi satıra ait olduğu** yanında
gider. Casio vakası bu kuralın en pahalı örneği: **₺219,06 · 0,9× · +₺20,10
üçü de DOĞRUYDU** ve üçü de **1. kademenindi**; etiket düşünce yanlarına
**3. kademenin FİYATI** (3.292) yazıldı ve adet başına **₺63,20**
kaybettirecek bir talimat üretildi.

> **ÖLÇÜT:** bir rakamın yanında **kademe / kanal / dönem / kaynak** yoksa o
> rakam **taşınmaz**. Özet, satırı tek satıra indirirken etiketi de indirir —
> ve etiketsiz kalan sayı en makul görünen satırdan alınır.

_("Bir sayı etiketiyle taşınır" kuralı zaten vardı; vakası şimdi eklendi.)_

---

## ✅ K170 — DEVREDEN KDV: İADE NET-2'Yİ ŞİŞİRMEZ · 05–06.09.2026 · [KOŞTU — ① ve ② kapandı]

> **Halil (ekran görüntülü):** _"bir iade girdim, iadeden doğan zararı ARTI
> ilave etmiş; seçili dönemdeki hesap bambaşka."_ Panel NET-1 −160 (zararda)
> · NET-2 +670 (kârda) — İMKÂNSIZ (NET-2 ≤ NET-1 olmalı).

**KÖK NEDEN.** `iade.ts`: `net2Etkisi = net1Etkisi − ödenecekKdvDeğişimi`.
İade satış KDV'sini geri getirir → ödenecekKdvDeğişimi büyük NEGATİF → net2
net1'in ÜSTÜNE çıkar. Bugünkü iade: net1 −549,60 (doğru) · **net2 +357,62
(ters)**. Panele +357 eklenince NET-2 şişti. Dünkü küçük iadelerde gizliydi
(satış küçük, KDV geri dönüşü net1 kaybını aşamıyordu); büyük tutarlı iadede
(₺5.949) yüzeye çıktı.

**ŞART 0 ÖLÇÜLDÜ.** MUHASEBE AYI toplamında 28 dönemin **28'inde** ödenecek
KDV POZİTİF, devreden 0 — sorun ayın kendisinde değil, ayın PARÇASI olan dar
pencerede (tek satış+iade izole, telafi edecek satış yok). Kırpma bu yüzden
GÖSTERİLEN KÜMEDE (kanal·hesap·dönem), snapshot'ta değil.

**⭐ MUHASEBE DAYANAĞI (Halil, 05.09.2026):** _"her ayın 15-20'sinde geçen
ayki satışların iadeleri için GİDER PUSULASI düzenliyorum; o ayın satış
KDV'sinden iadeler düşülerek hesaplanıyor."_ Kırpma bir yaklaşıklık değil,
kullanıcının FİİLEN işlettiği sürecin karşılığı: iade KDV avantajı o dönemin
satış KDV'siyle mahsuplaşır, yetmezse devreder.

**KURULAN — Seçenek 1, beş şart:** tek gövde `src/lib/net-devreden.ts` →
`donemNet2(net1, hamNet2)`: `net2 = min(hamNet2, net1)` · `devreden =
max(0, hamNet2 − net1)`. Panel (kanal·hesap·genel) ve rapor (brutNet2) bu
gövdeden geçer (şart 1). Ekran: "Devreden KDV: ₺X (gelecek döneme mahsup)"
— panel Seçili dönem + kanal kutusu + rapor kartı, **yalnız X>0 iken**
(şart 2·İlke #49). Snapshot (Sale/Return.net2Amount) DOKUNULMAZ — geçmiş
yeniden yazılmaz, gösterimde kırpılır (şart 4).

**KANITLAR:** ⭐ **canlı gövde ölçümü** — kullanıcının senaryosunda artık
NET-2 = −167,26 (= NET-1, kırpıldı) · devreden 835,24 (eski +670 yerine).
panel:dogrula 10 K170 ölçütü · **4 mutasyon 4 kırmızı** (kırpma kaldıran ·
devreden sıfırlayan · genel kırpmayı atlayan · kanal kırpmayı atlayan) ·
bit-bit geri · kâr bekçisi yeşil · build ✓. ⚠ Eski panel/rapor testleri
GERÇEKÇİ OLMAYAN veri kullanıyordu (net2 > net1); `satis()` helper'ı net1'i
net2'den TÜRETECEK şekilde düzeltildi + tek-iade beklentisi kırpmaya
güncellendi (niye yazıldı).

─── ① **KAYNAKTA KIRPILMAZ — KALEM KAPANDI, YENİDEN AÇILMAZ** · 06.09.2026
· [ÖLÇÜLDÜ · karar]

Soru şuydu: `iade.ts` net2Etkisi kaynakta da kırpılsın mı? **Ölçüm HAYIR
dedi ve gerekçesi kalıcıdır.** Canlıda 222 iade tarandı:

    net2 > net1 (KDV baskın)  216   %97,3
    normal (net2 ≤ net1)        6
    incelenemeyen               0

**AYIRT EDİCİ SONUÇ:** snapshot kırpılsaydı `net2 = net1` olurdu ve K172'nin
türettiği KDV satırı (`net1 − net2`) **216 iadenin 216'sında SIFIRA**
düşerdi — **₺92.972,02**'lik ölçülmüş bilgi silinirdi. Yani "düzeltme",
düzelttiğini sandığı şeyi yok ederdi.
⚠ Ve `net2 > net1` tek başına ANORMAL DEĞİL: iade satış KDV'sini geri
getirir, o yüzden iadenin net-2 maliyeti net-1'den küçüktür (ör. net1
−186,70 · net2 −93,07 — ikisi de zarar). **NET-2 ≤ NET-1 değişmezi DÖNEM
kümesinin kuralıdır, tek kaydın değil** — ödenecek KDV dönem başına
hesaplanır (Halil'in gider pusulası süreci de aylık). _(Anayasa: ilke kendi
kapsamının dışına uygulanırsa hatayı korur.)_

⭐ **AMA ÖLÇÜM GERÇEK BİR KUSUR BULDU — BAŞKA YERDE.** İade bloğu kalem
başına YALNIZ NET-2 etkisini basıyordu ve pozitifse **YEŞİL**: sipariş
11538106902 ekranda `+357,62` yeşil duruyordu — okuyan _"bu iade
kazandırdı"_ diye anlıyor. Halil'in 05.09'da PANELDE bildirdiği yanılgının
kayıt ekranındaki hâli. Üstelik iade FORMU önizlemesi ikisini zaten yan
yana gösteriyordu (İlke #10 ayrışması). **Eksik olan kırpma değil,
BAĞLAMDI.** Blok artık üçlüyü birlikte veriyor:

    NET-1 etkisi −549,60  −  iade KDV etkisi −907,22  =  NET-2 etkisi +357,62

**Bekçi:** `iade-kdv:dogrula` 11/11 — üç gösterim ölçütü + _"kaynak
kırpılmıyor"_ ölçütü (kapanış kararının KOŞAN karşılığı: biri `Math.min`
ile clamp eklerse kırmızı yanar). **4 mutasyon 4 kırmızı** (NET-1 satırını
silen · NET-1 yerine net2 basan · NET-2'yi kovan · kaynağa clamp ekleyen).

─── ② **AYLIK SERİ DE KIRPILIR (GRAFİK + TABLO)** · 06.09.2026 · [KOD KOŞTU]

`aylikSeri` artık NET-2'yi **kanal·ay bazında** `donemNet2`'den geçiriyor
(panel/rapor ile TEK gövde) ve `AyNoktasi.devreden` taşıyor. Aylık tabloda
NET-2 hücresinin altında **"devreden KDV ₺X"** — yalnız >0 iken (İlke #49,
kanal kutusuyla aynı desen). Grafik çizgisi zaten `nokta.net2` okuduğu için
kırpmayı kendiliğinden aldı. NET-1 **HAM kalır** (kırpma yalnız net2'ye).

⛔ **KIRPMA AY TOPLAMINDA DEĞİL, KANAL·AY BAZINDA** — K170b dersinin aylık
eksene taşınması: ayın karışık toplamına uygulansaydı bir kanalın KDV'si
öteki kanalın devredenini gizlerdi. Bekçi verisi bunu BİLEREK ayırt ediyor
(iki kanal): kanal bazlı `632,74 / devreden 835,24` ↔ ay toplamı
`832,74 / 635,24`. Tek kanallı örnekle sınansaydı iki okuma aynı sonucu
verir, mutasyon kaçardı.

**KANITLAR:** `panel:dogrula` **687 ölçüt** (11'i yeni; "aylık NET-2 = panel
NET-2" sayı=liste bağı dahil) · **6 mutasyon 6 kırmızı** (kırpmayı kaldıran ·
ay toplamında kırpan · devredeni sıfırlayan · NET-1'i de kırpan · ekran
satırını silen · ekranı koşulsuz çizen) · tsc ✓ · i18n 0 eksik (yeni anahtar
yok — mevcut `net1Etkisi`/`devredenKdvKisa` kullanıldı) · bit-bit geri
alındı, kalıntı taraması temiz (K149).

⚠ **VE PUSH BİR KEZ KIRMIZI DÖNDÜ — KOD DEĞİL, VEKİL ESKİMİŞTİ.**
`aylik-marj-mutasyon:kontrol` iki mutasyonda _"desen 0 kez geçiyor"_ dedi:
çapaları `nokta.net2` idi, refaktörde `kanalNet.net2` oldu. **Harness doğru
davrandı** — bulunamayan deseni YEŞİL saymadı, `UYGULANAMADI` diye kırmızı
yaktı (anayasa: "desen bulunamayan bir mutasyon yeşil değil UYGULANAMADI'dır";
bu koruma olmasaydı iki mutasyon sessizce ölür ve kimse görmezdi). Çapalar
tazelendi, ölçütün ANLAMI değişmedi.

⭐ **VE TAZELERKEN BEKÇİDE BİR BOŞLUK BULUNDU — YENİ ÖLÇÜT DOĞDU.** Aylık
tablo NET-2'yi KIRPILMIŞ basıyor; `aylikMarj` ham net2 kullansaydı kullanıcı
**ekrandaki NET-2'yi ekrandaki net ciroya böldüğünde BAŞKA bir sayı**
bulurdu — üstelik `aylikMarj`ın kendi belgesi bunu yasaklıyordu ("ekrandaki
rakam, ekrandaki rakamlardan türetilebilmeli"). Bekçi bunu hiç ölçmüyordu.
`aylik-marj:dogrula` **6. bölüm** eklendi (BÖLÜM_SAYISI 5→6) ve 9. mutasyon
yazıldı. Örnek veri iki okumayı **işaret düzeyinde** ayırıyor: kırpılmış
**%−100** ↔ ham **%+325**; devredeni olmayan bir ayla sınansaydı iki okuma
aynı sonucu verir ve mutasyon kaçardı.
**Sonuç:** `aylik-marj:dogrula` 19/19 (6 bölüm) · mutasyon turu **9/9**.

─── ③ **HALİL TESTİ DÜŞTÜ — İKİ BULGU, BİRİ BENİM HATAM** · 06.09.2026
· [ÖLÇÜLDÜ · düzeltildi]

> **Halil (ekran görüntülü):** _"① Eylül rakamlarında ve diğerlerinde
> devreden KDV yok. ② Bu siparişte rakamlar tutmuyor; ayrıca iade edilmiş
> bir üründe NET-1'de de NET-2'de de kâr edemezsin, mantık dışı değil mi?"_

**BULGU ① — EKRAN DOĞRUYDU, TEST BEKLENTİM YANLIŞTI (benim hatam).**
_"Eylül satırında devreden görünmeli"_ diye yazdım ve **bunu hiç
ölçmemiştim.** Ölçüm (06.09, canlı, kanal·ay):

    TRENDYOL     56 satış · 2 iade · net1 17.669,67 · net2 15.396,82 → devreden 0
    HEPSIBURADA  25 satış · 1 iade · net1 13.003,51 · net2 10.842,09 → devreden 0
    N11           3 satış · 0 iade · net1    383,01 · net2    304,61 → devreden 0

Ayın satışları iade KDV'sini fazlasıyla karşılıyor; **devreden 0 DOĞRU
davranıştır** ve satırın çizilmemesi kuralın ta kendisi (İlke #49). K170'in
kendi notu bunu zaten söylüyordu (_"28 dönemin 28'inde ödenecek KDV
pozitif"_) — beklentiyi yazarken kendi ölçümümü okumadım.
⛔ **DERS:** Halil test listesindeki her rakam, **yazılmadan önce ölçülür.**
Ölçülmemiş bir beklenti, doğru çalışan bir ekranı "bozuk" diye raporlatır ve
kullanıcının zamanını yakar. _(Anayasa: "ekrandaki rakamlar teslim
raporundakiyle BİREBİR tutmalı" — tutmayan taraf kod değil, RAPORDU.)_

**BULGU ② — GERÇEK HATA, VE YAYGIN: KUTU KIRPILMIYORDU.**
Satış detayındaki **"İade sonrası net"** kutusu şunu basıyordu:

    NET-1  −₺167,26  (kırmızı, zarar)      NET-2  +₺667,98  (kâr)

NET-2 = NET-1 − ödenecek KDV olduğuna göre **İMKÂNSIZ.** Halil'in cümlesi
kuralın kendisi: iade edilmiş bir satış ikisinde birden kâr gösteremez.
**Ölçüldü: iadeli 222 satışın 207'sinde (%93,2) aynı desen vardı.**
K170 paneli, raporu ve aylık seriyi kırpıyordu; **kutu atlanmıştı** —
kural bir yerde uygulanıp ötekinde bırakılmıştı _(anayasa: "kararın kapsamı,
uygulandığı yerle sınırlı sayılmaz" — bu, o dersin ikinci kez tekrarı)_.

**DÜZELTME:** kutu artık aynı gövdeden geçiyor (`donemNet2(sonNet1,
hamSonNet2)`) → **NET-1 −167,26 · NET-2 −167,26**, ve altında sebep yazıyor
(İlke #5, yalnız alacak varken): _"Bu satışın ₺835,24 KDV alacağı NET-2'ye
kâr olarak eklenmez — dönemin diğer satışlarının KDV'sinden mahsup edilir,
bu satıştan nakit girmez."_

⭐ **VE İKİ BULGU ÇELİŞMİYOR — FARKLI PENCERELER.** Kutu _"BU SATIŞ ne
getirdi"_, panel _"BU AY ne getirdi"_ sorusuna bakar. Satışta alacak 835,24
görünür; Eylül'ün kanal toplamında 0'dır çünkü ayın öteki satışları onu
soğurmuştur. İkisi de doğru _(anayasa: aynı veri, farklı soruya farklı
pencereden bakar)_. Bu yüzden satır **"gelecek döneme mahsup" DEMİYOR** —
mahsup çoğu zaman aynı dönemde olur; söylediği şey _"bu satıştan nakit
girmez"_.

**KANITLAR:** `iade-kdv:dogrula` **15/15** (4 yeni K170c ölçütü) ·
**5 mutasyon 5 kırmızı** (kırpmayı kaldıran · `donemNet2` çağrısını atlayan ·
alacak satırını silen · koşulsuz çizen · kırpmayı ters yöne çeviren) ·
tsc ✓ · i18n 0 eksik (1 yeni anahtar, tr+en) · kalıntı taraması temiz.

**HALİL TEST LİSTESİ — ÖLÇÜLMÜŞ RAKAMLARLA (deploy sonrası):**
① Satışlar → **11538106902** → iade bloğu, ÜST satır: **NET-1 etkisi
   −₺549,60** · **NET-2 etkisi +₺357,62** · altında **İade KDV etkisi
   −₺907,22**. Sağlama: −549,60 − (−907,22) = +357,62.
② **AYNI SAYFANIN EN ALTI — asıl düzeltme burada:** "İade sonrası net"
   kutusunda artık **NET-1 −₺167,26 · NET-2 −₺167,26** (ikisi EŞİT) ve
   altında ₺835,24'lük KDV alacağı açıklaması. **Eski hâl +₺667,98 idi.**
③ Panel → *Son 12 ay* → Para → *Aylık rakamlar*: **Eylül'de devreden
   satırı OLMAMASI DOĞRUDUR** (ölçüldü, üç kanalda da 0). Bu madde artık
   bir hata arayışı değil, kuralın teyidi.

---

## ✅ K169 — KANALA İLK YAZMA: TY'YE STOK/FİYAT GÖNDERİMİ · 05.09.2026 · [HALİL TESTİ GEÇTİ]

> **Halil:** _"stok girdiğimi Trendyol'a push edebilir miyim, fiyat
> indirimini push edebilir miyim?"_ → _"başla şekerim"_. 01.09'un "stok
> senkronu kapsam dışı" şartını SAHİBİ çevirdi (eski gerekçe
> `schema.prisma`da duruyor).

**KURULAN:**
- `scripts/ty/yazici.ts` — kanala yazan İLK dosya. Uç resmî dokümandan:
  POST `/integration/inventory/sellers/{id}/products/price-and-inventory`
  (barcode zorunlu; quantity/salePrice/listPrice opsiyonel — yalnız birini
  göndermek serbest). Uç ve fiil SABİT — ikinci uca yazmak dosyada
  imkânsız. Batch sonucu OKUMA istemcisindeki `topluIslem` GET'iyle.
- `api:dogrula` → **KANALA_YAZMASI_BEYANLI** mekanizması (beyan =
  taahhüt: gerekçe + bekçi `kanal-yazma:dogrula` 10 ölçüt).
- Yeni izin **`kanal.yaz`** (izinler + seed SONRADAN_DOGAN; Operasyona
  BİLEREK verilmedi — paraya dokunur). ⚠ Deploy sonrası `npm run
  canli:yetki` ZORUNLU.
- Eylemler (`kart/[variantId]/actions.ts`): önizleme SALT-OKUMA (barkod ·
  Selliora stok · TY'nin bildirdiği adet KIYASI) + gönderim (stok SUNUCUDA
  yeniden çözülür — istemciden sayı alınmaz; fiyat kullanıcıdan, boş =
  dokunma; kabul DE red DE `KANAL_GONDERIMI` izi; TY'nin 15-dk tekrar
  reddi AYRI kodla ekrana).
- Ekran: ürün sayfası varyant satırı, iki görünümde (İlke #10) — **kartta
  DEĞİL**: "kart okuma yüzeyi" kuralı + bekçisi; düğme yalnız `kanal.yaz`
  görene çizilir.

**KANITLAR:** kanal-yazma 10/10 · 3 mutasyon 3 doğru ölçütte kırmızı
(ikinci POST · sunucu-stok çözümünü kaldıran · rakamsız gönderim) ·
bit-bit geri · build ✓.

✅ HALİL TESTİ GEÇTİ (05.09.2026): deploy + `canli:yetki` 28/28 sonrası
Halil gerçek cihaz + canlı adreste denedi — _"Gönderdim çalışıyor."_
(İlk turda düğmeyi listede aradı; düğme ürün DETAYINDA, varyant satırında —
tarif netleştirildi, buldu, gönderdi.)
⏭ AÇIK: toplu gönderim (çok ürün) ayrı karar; HB/N11 gönderimi kanal
onayları sonrası aynı desenle.

---

## 🔶 K167 — N11 BAŞLADI · 04.09.2026 · [② KOŞTU — canlı]

> **Halil:** _"Ayrıca N11 API'sini aldım."_ Üçüncü kanal.

Uç mimarisi doğrulandı (resmî developer.n11.com): TY'nin yakın kopyası —
`GET api.n11.com/rest/delivery/v1/shipmentPackages` · header appkey/appsecret
· GMT+3 ms pencereler · lines[]. İstemci (`scripts/n11/istemci.ts`, GET-only
imza, env→dosya kimlik sırası) + sağlık betiği (`canli:n11-saglik`, beş-sonuç
ayrımı) yazıldı; `api:dogrula` izlerine `api.n11.com` + `n11/istemci` girdi.
⏭ Halil `.env.canli`ye `N11_APP_KEY` / `N11_APP_SECRET` girecek → sağlık →
zarf/alan ölçümü → çekim (TY disiplini; muhtemelen hızlı — yapı klon).

─── ② İÇE AKTARMA KURULDU VE KOŞTU · 05.09.2026 · [KOŞTU — canlı]

> **Halil:** anahtarları girdi → _"Onay veriyorum"_ (içe aktarma paketi).

**ÖLÇÜLMÜŞ EŞLEME (4 canlı paket):**
- Ciro tabanı **`sellerInvoiceAmount`** (satıcının faturaladığı): 4/4
  kayıtta indirim N11 FONLU (sellerDiscount=0, mallDiscount>0), satıcı tam
  fiyat faturalıyor — alıcının ödediği `dueAmount` ciro DEĞİL.
  ⭐ ÇAPRAZ TEYİT: Halil'in elle girdiği 3 sipariş kuruşuna aynı rakamları
  taşıyor (3499/1989/4999 · komisyon 18/16/13) — taban defterle doğrulandı.
- ⛔ **4/4 kayıt TEK ADET — birim/toplam AYIRT EDİLEMEDİ.** `n11BirimFiyat`
  adet>1'de null döner, sipariş "ÇOK ADET ÖLÇÜLEMEDİ" kovasında kırmızı
  durur, YAZILMAZ. Açılış şartı: ilk çok adetli kayıt + ayırt edici kanıt
  (hakediş satırı — TY'de 29.08 böyle çözüldü). Bölme/çarpma yazılmadı.
- Sipariş anı `packageHistories` "Created" damgasından (epoch ms — MUTLAK
  an, saat dilimi tuzağı doğamaz); çok paketli siparişte en erken Created.
  soldAt GERÇEK AN (K163) → onay kuyruğu süzgecinden kendiliğinden geçer.
- `commissionRate` satır düzeyi ORAN; dolu (0 dahil) aynen, null →
  ChannelSku (RULE_MISSING dersi). `taxDeductionRate=1` iş sabitiyle
  tutarlı, yazılmıyor (motor kendi kuralından). `sellerCampaignCommissionRate`
  4/4'te 0 — anlamı ölçülemedi, YAZILMIYOR; açılış şartı: ilk >0 kayıt.
- İptal: paket VE satır düzeyinde `Cancelled` yazılmaz (ölçüldü: iptal
  pakette totalAmount=0). `cargoTrackingNumber` var ama `shipmentCode`
  YAZILMIYOR (K165 kararının kopyası — K60-② doluluk ≠ olay izi).

**DİSİPLİN:** TY/HB kopyası — --yaz kilidi · çakışmada atla · StockMovement
ÜRETMEZ (K164 kuyruğu düşürür) · importKaynak "n11-enumerasyon" (doğum
beyanı burada) · AuditLog `N11_SIPARIS_ICE_AKTARMA` · bekçi-kilidi kapısı ·
`api:dogrula` YAZICI beyannamesi · sayfalama zarf beyanından (`totalPages`,
404'e bel bağlanmaz) · sellerId tekil değilse hüküm yok.

**HESAP BAĞI (izli):** çekim kırmızı durdu, sellerId **4534966** basıldı →
AXCALI (N11 satış hesabı) `externalId`ine bağlandı — AuditLog
`KANAL_HESAP_KIMLIK_BAGI` (Halil onayı 05.09.2026). Dolu externalId ezilmez.

**KOŞUM (05.09.2026):** 4 paket → 1 iptal atıldı, 3 sipariş → **3'ü de
ÇAKIŞTI** (Halil elle girmişti) → yazılan 0, kopya 0, sayım tuttu. İkinci
koşum zararsız (ölçüldü). Bekçi: `ice-aktarma:dogrula` **315/315**
(K167-② bloğu özet satırının ÖNÜNDE) · **4 mutasyon 4 kırmızı**
(bölme geri gelir · çok-adet kovası kalkar · iptal koşulu `{false&&}` ·
bozuk tarihte an uydurulur) — iptal ölçütleri koşul+sonuç birlikte arar
(`{false&&}` körlüğü kapatıldı).

─── ③ MAKİNEDEN BAĞIMSIZ RUTİN · 05.09.2026 · [KOŞTU — uçtan uca canlı]

> **Halil:** _"Yapalım."_ K166 deseninin birebir kopyası.

Çekirdek ayrıştı (`n11CekimKos` — tek gövde: betik argv, rota env; tipli
özet + atlandi: BEKCI_TURU/KIMLIK/VERITABANI/CEKIM/HESAP). Rota
`/api/cron/n11-cekim` (GET · Bearer CRON_SECRET · yanlış/boş sır **404** ·
maxDuration 60 · build kanıtı `ƒ /api/cron/n11-cekim`). Tetik: GitHub
Actions AYNI workflow'a ikinci adım (`if: always()` — TY kırmızı olsa da
koşar) + Vercel cron günlük yedek (04:10) + proxy ACIK_YOLLAR + yetki
istisnası. Bekçi: K167-③ bloğu (rota çekirdeği çağırıyor · sır kapısı 404 ·
betik aynı gövde) — **3 mutasyon 3 kırmızı** (kapı kaldıran · 404→401 ·
çekirdek bağını koparan).
✅ UÇTAN UCA KANITLI (05.09.2026): yanlış sır **404** · doğru sır ama
env'siz `{"atlandi":"KIMLIK"}` (görünür kaçış) · Halil Vercel'e
N11_APP_KEY/N11_APP_SECRET ekleyip redeploy etti → uç GERÇEK çekim koştu:
`{"kip":"YAZIM","apiPaket":4,"iptalPaket":1,"cakisanAtlandi":3,
"yazilan":0,"saleOnce":7871,"saleSonra":7871}`. N11 artık bilgisayardan
bağımsız 10 dakikada bir çekiliyor (TY ile aynı workflow).
⏭ AÇIK: ② çok-adet kanıtı gelince kova açılır; ③ N11 hakediş/kesinti
uçları (komisyon faturası) ileride.

---

## ✅ K166 — TY ÇEKİMİ MAKİNEDEN BAĞIMSIZ · 04.09.2026 · [KOŞTU — uçtan uca canlı 06.09]

> **Halil:** _"bilgisayarım kapalıyken Trendyol'dan siparişleri çekmedi —
> bu problemli bir durum değil mi?"_ → _"BAŞLA"_.

**MİMARİ:** çekirdek parametrikleşti (`tyCekimKos` — tek gövde: betik argv
ile, sunucu ucu `/api/cron/ty-cekim` env ile çağırır; dönüş tipli özet).
TY kimlik okuması önce SÜREÇ ORTAMINA bakar (Vercel), yoksa `.env.canli`
(yerel). Çekirdek `dbAdresi` parametresi alır (Vercel DATABASE_URL).
Rota: GET · `maxDuration 60` · dar pencere (3 gün — geniş süpürme
makinedeki günlük görevde). Yerel build KANITLI (`ƒ /api/cron/ty-cekim`).

**KAPI:** `Authorization: Bearer CRON_SECRET`; sır tutmayan/boş-sır **404**
(varlık sızmaz). Sır üretildi, `.env.canli`de (ekrana basılmadı).
Mutasyon: kapıyı kaldıran senaryo 2 ölçütte KIRMIZI, bit-bit geri.

**TETİKLEYİCİ:** birincil = DIŞ loglu zamanlayıcı (Halil kuracak,
5-10 dk). Vercel Cron yalnız YEDEK (günlük 07:00 TR, vercel.json) —
anayasa: 18-19.08 vakası, birincil sayılmaz; Vercel cron isteği
CRON_SECRET'ı Bearer olarak kendisi ekler, kapıyla uyumlu.
Makinedeki iki görev yedek katman olarak DURUYOR (çift tetik zararsız —
çakışmada-atla defalarca canlıda kanıtlı).

**Bekçi:** ice-aktarma +4 (tek gövde · sır kapısı · 404 · betik çağrısı);
api-dogrula izi çekirdek IMPORT'una bağlandı (tırnaklı — yorumdaki ad
yakalanmaz; ilk hâli bir onarım betiğini yorumdan kapsamıştı).
K162-② kapı ölçütü tipli dönüşe tazelendi (öz aynı).

─── ② TETİKLEYİCİ DEĞİŞTİ + UÇTAN UCA KANIT · 06.09.2026 · [KOŞTU]

**Eski plan (cron-job.org) AŞILDI, sessizce değil:** tetikleyici GitHub
Actions oldu (`.github/workflows/ty-cekim.yml`, commit `3cee41f` — dış
hesap istemez, her koşumun logu Actions sekmesinde; K167-③ N11 adımı da
aynı workflow'a bindi). Env değerleri Vercel'e girildi (kanıt aşağıda —
`atlandi:KIMLIK` gelmiyor).

**UÇTAN UCA KANIT (06.09, ben):** yanlış sır → **404** (varlık sızmaz) ·
doğru sır → **200** + tipli özet: `{aday:32, cakisanAtlandi:32, yazilan:0,
hata:0, saleOnce:7883, saleSonra:7883}` — yerel görev zaten çekmişti,
çift tetik zararsızlığı canlıda bir kez daha görüldü.

**ÖLÇÜLEN ETKİN SIKLIK (06.09, AuditLog 24 saat):** Actions cron `*/10`
tanımlı ama fiilen **~saatte 1** koşuyor (ücretsiz katman kısması; ayırt
edici kanıt: makinede N11 görevi YOK, gece 00–06 dahil saatte ~1
`N11_SIPARIS_ICE_AKTARMA` izi — o izler yalnız Actions→Vercel yolundan
gelebilir). Katmanlar birlikte: yerel 5-dk görev (makine açıkken) +
Actions ~1/saat + Vercel günlük yedek. **Makine kapalıyken çekim aralığı
~1 saate düşer.**

─── ③ **KAPANDI — SAATLİK ÇEKİM YETERLİ** (Halil kararı 06.09.2026)

**cron-job.org EKLENMEZ.** Gerekçe: A3'e (dış bağımlılık cephesi) dokunur
ve **K121 kararıyla tutarlıdır** — yönetilemeyen bir dış bağımlılık daha
açmak, kazandığı 50 dakikadan pahalıdır. Bugünkü üç katman (yerel 5-dk
görev · Actions ~1/saat · Vercel günlük yedek) yeterli sayıldı.

⏭ **AÇILIŞ ŞARTI:** gecikme **fiilen iş kaçırırsa** Halil bildirir. Şartsız
bekleyen bir kalem değil — kapalı, gerekçeli, yeniden açılabilir.
_(Anayasa: "kapatma kararı da panoya yazılır — gerekçesiyle".)_

---

## 🔶 K165 — HB SİPARİŞ İÇE AKTARMA YAZILDI · 04.09.2026 · [KOŞTU — SIT]

> **Halil:** _"başla"_ (HB çekimi, TY disiplininin kopyası).

**ÖLÇÜLMÜŞ EŞLEME (2 test siparişi — 1 ve 2 adetli):**
- `unitPrice` KESİN BİRİM (2 adetlide totalPrice 200 / unitPrice 100 —
  ayırt edici kanıt; TY'nin "price bölme" faciası burada DOĞMADAN kapandı).
- Damgalar zone'suz İSTANBUL yereli (kanıt: 13:12Z'de oluşturulan sipariş
  "16:12" damgalı) → `hbAni` +03:00 ile UTC'ye çevirir; soldAt GERÇEK AN
  (K163) → onay kuyruğu saat süzgecinden kendiliğinden geçer.
- `commissionRate` ayrı ORAN alanı; 0 = kanal belgesi AYNEN, null =
  ChannelSku'dan doldur (bugünkü 11569147554 RULE_MISSING dersi yapısal).
- Kalem düzeyi dönüş → orderNumber gruplaması; Cancelled kalem YAZILMAZ
  (iptal anı uydurulmaz); packageNumber Open'da boş → shipmentCode BOŞ.
- Test siparişi oluşturma: `oms-stub-external-sit` POST (doküman arşiv+ayna
  kopyasından söküldü; salt-rakam OrderNumber şart). Scratchpad aracı —
  repoya GİRMEDİ (istemci GET-only kalır).

**DİSİPLİN:** --yaz kilidi · çakışmada atla · StockMovement ÜRETMEZ (K164
kuyruğu düşürür) · importKaynak "hb-enumerasyon" (YENİ değer, doğum beyanı
burada) · AuditLog `HB_SIPARIS_ICE_AKTARMA` · bekçi-kilidi kapısı (K162-②)
· `api:dogrula` YAZICI beyannamesi (bekçisi: ice-aktarma:dogrula).
**Hesap ayrımı:** SIT merchantId → "Hepsiburada — Test (SIT)" hesabı
(yalnız TEST ortamında otomatik; CANLIDA OLUŞTURMAZ, kırmızı durur — canlı
kimlik elle bağlanır. AXCALI externalId 7000222505 karışamaz).

**Bekçi:** +11 ölçüt (değer testleri: hbAni/hbKomisyonOrani; desenler
kullanım-bloklu). 3 mutasyon 3 doğru ölçütte kırmızı: adete bölen ·
UTC sayan · stok yazan. Önizleme SIT'te koştu: 2 sipariş dürüstçe
"kod kataloğumuzda yok" kovasında (HB'nin test ürünleri defterde yok).

⛔ **KARAR (Halil, 07.09.2026): (b) — DEFTERE TEST KAYDI GİRİLMEYECEK.**
Prova canlıya geçiş gününde **gerçek katalogla** kendiliğinden olacak.
Gerekçe: K155 hassasiyeti — "liste satışların fiziki sayımıdır"; deftere test
ürünü + test alımı sokup sonra temizlemek, temizlenmiş sayılsa bile iz bırakır
ve sayımın dayanağını bulandırır. **Bu kalem yeniden açılmaz.**

~~⏭ AÇIK — HALİL KARARI BEKLİYOR: SIT uçtan-uca provası (çekim→kuyruk→onay)~~
için deftere TEST ÜRÜNÜ + küçük test alımı girmek gerekir (sonra
iptal/pasifle temizlenir) — YA DA prova canlıya geçişte gerçek katalogla
kendiliğinden olur. Defter temizliği kararı Halil'in (K155 hassasiyeti).
⏭ CANLI GEÇİŞ GÜNÜ: HEPSIBURADA_ORTAM=CANLI + canlı anahtarlar + AXCALI
HB hesabının externalId kontrolü + 5-dk rutine HB koşumu eklenmesi.

─── ② SIT ZORUNLU TEST ZİNCİRLERİ KOŞULDU · 05.09.2026 · [KOŞTU — kanıtlı]

**LİSTELEME ✓ (04.09):** envanter XML yükleme `a4b48bc3-8291-4ed3-921c-8166e332fd78`
"Done" · fiyat/stok değişimi doğrulandı (110/9) · deactivate→salable=false ·
activate→true.

**SİPARİŞ ✓ (05.09):** oluştur (0527495047 · 0527557173) → listele →
paketle 201 (`5000125574`) → paket listele → **boz** 200 → **böl** (2 adetli
kalemden 1 adetlik `5000125575`; defter teyidi: siparişte kalan adet 1) →
**fatura linki** `PUT /packages/…/packagenumber/{no}/invoice` 204 (uç,
linkin ContentType'ını KENDİSİ doğruluyor — pdf/html şart) → **iptal**
`POST /lineitems/…/id/{lineItemId}/cancelbymerchant?reason=` 200 (sipariş
listeden düştü) · kargo takip alanları paket kaydında (trackingInfoCode/Url).
⭐ **Oto-paketleme ayarı GEREKMEDİ** — paketleme metodunu biz çağırıyoruz;
Halil'den bekleyen "açtım" kalemi KAPANDI (daha güçlü kanıt: metod bizim).

**KATALOG ✓ (05.09):** kategori listesi · kategori attribute · import →
**trackingId `c22d1260-1543-42cd-af1c-84980ac340b6`** (verilen 3 test
barkodu, tüm zorunlu alanlar; ilk koşum `3b09e4ce-a2eb-470c-86fc-a83ae24cfa3d`)
· status sorgulama ✓. Fastlisting DTO da söküldü (merchant/merchantSku/
barcode|hbSku/productName → trackingId `bd694116…`).

⚠ **ÖLÇÜLEN İKİ SIT KUSURU (bizim entegrasyonun değil, ortamın):**
① Görsel indirici hiçbir hosta erişemiyor — HB'nin KENDİ CDN'inden ölçülmüş
552×552 görsel dahil 5 ayrı host "boyut(250x250) ya da erişim problemi"
aldı; ürünler "Ürün Bilgileri Eksik"te kalıyor (SSS zaten "SIT'te ürün
ilerlemez, normaldir" diyor). ② Dokümanın verdiği 3 test barkodu SIT'in
HB-ürün deposunda YOK — fastlisting ölçtü: "HB product not found by
barcode". "Eşleşen" bu yüzden üretilemiyor; `approve-prematch` /
`reject-prematch` uçları bulundu (var: 500, 404 değil) ama PRE_MATCHED
ürün olmadan koşamaz. Bu ikisi ticket'ta HB'ye not edilir.

✅ **TICKET AÇILDI (Halil, 05.09.2026)** — HB canlı onayı bekleniyor
(doküman: entegratör yetkilendirme ~2 saat sürebilir; onay gelince
`HEPSIBURADA_ORTAM=CANLI` tek satır).
⏭ ~~HALİL — TICKET (canlıya geçişin kapısı):~~ Canlı Merchant Panel →
Yardım Merkezi → Talepler → "API Entegrasyon Teknik Destek" → tür
**"API Entegratör yetkilendirme işlemleri"** → mesaja: trackingid
`c22d1260-1543-42cd-af1c-84980ac340b6`, entegrasyon modeli **API**
(webhook kullanılmıyor), listeleme+sipariş zincirlerinin koşulduğu.
Kanıt logları scratchpad: hb-katalog-kanit.log · hb-siparis-kanit.log ·
hb-listeleme-kanit.log.

### ─── ② CANLIDA HİÇ KOŞMAMIŞ — İKİ TIKANMA · 07.09.2026

> **Halil:** _"Hepsiburada'daki siparişleri elimle girdim, 4132853379 ve
> 4423830471 bunlar API'den gelmedi."_

⛔ **VE HAKLIYDI.** Ben `/orders` ucunun `totalCount 0`'ını _"işlem bekleyen
sipariş yok"_ diye okumuştum; o cümle ölçüm değil YORUMDU. Panelde 4
gönderime hazır + 12 kargoda duruyordu.

**① HESAP ÇÖZÜMÜ — İKİ GÖVDE, İKİ FARKLI ALAN (kapatıldı)**

    listeleme yazıcısı  → apiHesapKimligi   ✓ çalışıyordu
    sipariş içe aktarma → externalId        ⛔ HİÇ eşleşmedi

CANLI'da `externalId` = `7000222505` (rapor numarası), API'nin Mağaza ID'si
36 karakterlik AYRI kimlik. Betik "HESAP YOK" deyip **ilk adımda duruyordu** —
yani içe aktarma canlıda **bir kez bile koşmamış.** Aynı soruya iki cevap
veren iki gövde, birinin bozukluğunu ötekinin sağlığıyla gizledi.
⭐ Çözüm ORTAK GÖVDEDE: `src/lib/kanal-hesabi-hb.ts`, iki çağıran da oradan.
Önizleme artık `kanal hesabı : AXCALI` diyor ve uçtan uca koşuyor.

**② UÇ ÖLÇÜMÜ — 16 SİPARİŞ NEREDE (salt okuma)**

    /packages?offset&limit          4 kayıt · status Open    = "Gönderime hazır 4" ✓
    /packages/{id}/shipped         12 kayıt · totalCount 12  = "Kargoda 12"        ✓
    /packages/{id}/delivered                 totalCount 69   = geçmiş teslimler
    /orders  (12 durum denendi)     0                        ← betiğin baktığı yer

⛔ **`?status=` PARAMETRESİ YOK SAYILIYOR** — 12 farklı değer için `/packages`
hep AYNI 4 kaydı döndürdü. Durum filtresi query değil **YOL**. Buna güvenen
bir kod sessizce hep aynı kümeyi çeker ve "durum süzdüm" sanırdı.

⛔ **VE İKİ UÇ AYNI ŞEKLİ DÖNMÜYOR:** `Open` paketi TAM kayıt (kalemler,
tutarlar, komisyon); `shipped`/`delivered` **ince ve PascalCase**
(`Id · Barcode · PackageNumber · OrderNumber · DeliveredDate`) — **tutar
YOK.** Yani sipariş `Open`dan çıktıktan sonra tutarları o uçtan alınamaz.
⏭ Çekim tasarımının ilk kısıtı budur (③'te çözülecek).

**③ GELİR ALANI — KANALIN KENDİ ÖDEME KAYDIYLA SEÇİLDİ**

API tek kalemde İKİ taban veriyor ve ikisi de "makul" görünüyor:

    merchantTotalPrice  6.399,00   liste (defterimizde duran)
    unitHBDiscount      1.400,63
    totalPrice          4.998,37   müşterinin ödediği (6399 − 1400,63)
    commission            831,87   = 6399 × %13   (4998,37 × %13 = 649,79)

⭐ **AYIRT EDİCİ KANIT HAKEDİŞTEN GELDİ (129 sipariş):**

    hakediş SIPARIS_TUTARI ↔ defterdeki ciro:  eşit 40 · KÜÇÜK 88 · BÜYÜK 0
    komisyon ↔ SIPARIS_TUTARI × oran:          tutan 0 · komisyon DAHA BÜYÜK 127

⛔ **BURADA VERDİĞİM HÜKÜM YANLIŞTI — VE ESKİ GEREKÇE SİLİNMİYOR.**

> _(çürütülen hüküm, 07.09.2026)_ "HB ödemeyi müşterinin ödediği taban
> üstünden yapar; defterdeki ciro YÜKSEK. Gelir alanı `totalPrice`,
> komisyon `commission`dan aynen. Yan bulgu: indirimli 88 satışta ciro
> liste fiyatıyla duruyor — ayrı düzeltme kalemi."

**NİYE ÇÜRÜDÜ:** kıyası `SIPARIS_TUTARI` **TEK BAŞINA** üstüne kurdum. Oysa
AYNI ölçümün kod dağılımında `KAMPANYA` **POZİTİF ₺49.695,18** ile duruyordu
ve onu hesaba katmadım. Eksik olan gözlem değil, **gözlemin bir parçasıydı.**

⭐ **HALİL BEYANI + HB PANELİ MEKANİZMAYI VERDİ (07.09.2026):**

    Listeleme fiyatı    6.399,00   ← bizim satışa çıkardığımız tutar
    Hepsiburada indirimi 1.400,63  ← HB'nin müşteriye yaptığı indirim
    Satış fiyatı        4.998,37   = 6.399,00 − 1.400,63
    Hepsiburada komisyonu 998,24   = 831,87 × 1,20 (API KDV HARİÇ, panel DAHİL)

HB indirimi (1.400,63) kendi komisyonundan (998,24) **BÜYÜK** → aradaki
**402,39**'u BİZE ödüyor. Kasa: `4.998,37 + 402,39 = 5.400,76 = 6.399,00 −
998,24` — kuruşuna. Hakedişte bu, `KAMPANYA` satırı olarak görünüyor.

⭐ **ÖLÇÜM (135 sipariş, salt okuma):**

    ciro = SIPARIS_TUTARI               43   (indirimsiz)
    ciro = SIPARIS_TUTARI + KAMPANYA    86   ← mekanizma birebir tuttu
    hiçbiri tutmadı                      6   Σ kalan ₺1.028,83

**GEÇERLİ HÜKÜM:** gelir tabanı **listeleme fiyatıdır** ve **defterdeki ciro
DOĞRUDUR.** Komisyon da doğru: motor `oran × ciro` hesaplıyor
(`%13 × 6.399 = 831,87`) ve HB kuralı gereği üstüne %20 KDV ekliyor
(`998,24`) — panelle birebir.
⛔ İçe aktarmanın gelir alanı **`totalPrice + totalHBDiscount`**
(= `merchantTotalPrice − totalMerchantDiscount`). Yalın `totalPrice`
kullanılsaydı HB'nin karşıladığı indirim ciromuzdan **düşerdi**;
yalın `merchantTotalPrice` ise BİZİM yaptığımız indirimi de gelir sayardı.
⏭ `totalMerchantDiscount > 0` vakası henüz görülmedi — ③'te ölçülür.

⚠ **AÇIK KALAN KÜÇÜK SORU (iş açılmadı):** 6 siparişte formül tutmadı,
Σ **₺1.028,83**. Dördünde `KAMPANYA` satırı HİÇ yok (`4282663277` ·
`4702310503` · `4006304001` · `4636037047`), ikisinde kuruş artığı
(−0,02 · −0,99). Kampanya satırı başka bir hakediş dönemine düşmüş olabilir
— **hüküm verilmedi**, ölçüldü ve yazıldı.

⭐ **K-HB-İNDİRİM KAPANDI — DÜZELTİLECEK BİR ŞEY YOK.** Kalem bir düzeltme
işi olarak açılmıştı; ölçüm onu ELEDİ. _(Anayasa: "imkânsız görünen değer
önce doğrulanır — düzeltilmez"; burada doğrulama HATA demedi, kaydın DOĞRU
olduğunu söyledi.)_

### ─── ③ ÇEKİM YOLU KURULDU — 16/16 SİPARİŞ GÖRÜNÜYOR · 07.09.2026

    PAKET UÇLARI → açık 4 · kargoda +12 · toplam 16 sipariş   ← panelle BİREBİR
    ÇAKIŞTI → ATLANDI (ezme YOK)   15
      ├─ aynı kanal (beklenen)     15   ← Halil'in elle girdikleri
      └─ ÇAPRAZ KANAL               0
    YAZILABİLİR                     1   → 4777369510 · Packaged · birim gelir 3.385,00

⭐ **ÇAKIŞMA SINAVI GEÇTİ:** `4132853379` · `4423830471` · `4318708967` üçü de
kanalda VAR, defterde VAR → ATLANDI. Ezme yok.
⚠ **`4318938967` diye bir kayıt YOK — YANLIŞ OKUYAN BENDİM** (ekran
görüntüsünden). Defterdeki doğru numara `4318708967` ve Halil'in verdiği
numaraydı. _(Anayasa: "kimlik varken dizeyle aranmaz" — ben ekrandan okudum.)_

**ATLA KÜRESEL KALDI, SINIF EKLENDİ.** Anahtarı "kanal + sipariş no"ya
daraltmak istenmişti; şema onu kaldırmıyor — `Sale.code` **global `@unique`**
ve daraltılsaydı aday elemede geçer, `INSERT` kısıta çarpardı (TY'nin
26.08.2026 tuzağı). Bunun yerine çakışma İKİ CİNSE ayrıldı: *aynı kanal*
beklenen, *çapraz kanal* ise o HB siparişinin deftere **hiç yazılamayacağı**
anlamına gelir — ekranda yüksek sesle yazar ve **parti kimliğiyle ize** geçer.

    ice-aktarma:dogrula   354/354
    MUTASYON               13/13   iki yönlü (⑤ "yanlış yanma" dahil)

⛔ **`?status=` PARAMETRESİ BEKÇİYE BAĞLANDI** — uç onu yok sayıyor; kullanan
kod "durum süzdüm" sanır ve hep aynı kümeyi çeker. Ayrım yalnız YOLDA.

### ─── ④ İLK CANLI OTOMATİK İÇE AKTARMA · 07.09.2026 · [KOŞTU]

> **Halil onayı:** _"yazılsın"_ — tek sipariş `4777369510`.

    ANLIK GÖRÜNTÜ → KURU KOŞUM → YAZIM → BİT BİT KIYAS

    saleToplam        7905 → 7906   ✓ kurunun öngördüğü +1
    hbSaleToplam      3312 → 3313   ✓
    stockMovement    14850 → 14850  ✓ oynamadı (K164 — tasarım)
    saleFee          34872 → 34872  ✓ oynamadı
    NET-1 / NET-2 toplamı           ✓ İKİSİ DE kuruşuna aynı
    durum  CALCULATED 7875→7875 · RULE_MISSING 2→2 · null 28→29 (yalnız yeni kayıt)

    KALEM  axcali1714 · adet 1 · birim 3.385,00 · KDV 20 · komisyon oranı 10
           kupon sınavı ✓ 3.385,00 (liste) — 3.370 DEĞİL, 3.400 DEĞİL
           komisyon: 3.385,00 × %10 = 338,50 → ×1,20 = 406,20  (panelle birebir)
    iz     hb-20260907164510 · yazılan 1 · hata 0 · çapraz çakışma 0
    geri alma ölçütü: `importBatch` — liste değil, YENİDEN HESAPLANABİLİR

⭐ **CANLI EKRAN BAĞIMSIZ TEYİT ETTİ (Halil, 16:39):** toplam satış
`8.016 → 8.017` · ciro `22.369.227,13 → 22.372.612,13` = **tam +3.385,00** ·
NET-2 toplamı **hiç oynamadı** ve kutu _"1 satışın kârı hesaplanamadı — toplama
girmedi"_ diyor. Satır onay kuyruğunda `Onayla` düğmesiyle duruyor.

⛔ **SINIR — STOK/NET BAĞI BU TURDA SINANMADI.** İçe aktarma `StockMovement`
YAZMAZ; bağı K164 onay kuyruğu kurar. `profitStatus null` · `SaleFee 0` beklenen
hâldir, kusur değil. **Sınav, Halil `4777369510`'u onayladığında koşar** —
FIFO'dan doğru parti + NET `CALCULATED` orada sınanır.
_(Anayasa: "tetiklenemeyen yol geçmiş sayılmaz" — bu iki madde AÇIK yazılıyor.)_

⭐ **TETİKLENEMEZ YOL KAPANDI:** HB sipariş içe aktarması 04.09'dan beri
"canlıda hiç koşmadı" hâlindeydi ve Halil siparişleri elle giriyordu. Artık
uçtan uca koştu, gerçek bir siparişi gerçek rakamlarla yazdı.

⏭ **KUPON KAPISI — TARİHLİ BEKLEYİŞ: ~11.10.2026.** `4777369510` hakedişe
düştüğünde `SIPARIS_TUTARI + KAMPANYA` listenin (3.385,00) **15 TL altına
iniyor mu** bakılacak. İnerse takip kuponu gerçek bir gider ve `SaleFee`
yazımı açılır; inmezse kupon vitrin gösterimidir ve kalem kapanır.
_(HB ödeme vadesi ölçüldü: teslimden ~34 gün.)_

⚠ **SATICI İNDİRİMİ — GELİRE GİRMEDİ, SAYILDI (16 kalemin 12'sinde var).**
Ölçüm (`4777369510`): komisyon `338,50 ÷ (3.147,00 + 237,996) = %10,0000`
kayıtlı oranla TAM; satıcı indirimi (15,00) eklenirse %9,9559 ✗. Yani indirim
ne `unitPrice`ta ne komisyon tabanında, hakediş kodlarında da karşılığı yok.
⏭ **K-HB-PAZARLAMA olarak ayrı açılıyor** (aşağıda).

---

## ✅ K164 — ONAY KUYRUĞU KURULDU · 04.09.2026 · [KOD KOŞTU]

> **Halil:** _"onay kuyruğunu yap"_ — akış: sipariş düşer → FIFO maliyeti
> onaylanır → stok düşer → NET hesaplanır → kargolanacaklara girer.

**KURULAN:**
- `src/lib/onay-kuyrugu.ts` — kuyruğun TEK sahibi (İlke #16: panel sayısı,
  liste süzgeci, eylem ön-kontrolü aynı gövdeden). Canlı-akış ayrımı
  VERİDEN: yalnız SAATLİ `soldAt` kuyruğa girer (K163 sonrası çekimler);
  tarihsel ~425 kayıt gürültü yapmaz (K49/K60). Ölçüldü: canlıda kuyruk
  tam **2 gerçek sipariş** (11566296780 · 11568452783), sıfır tarihsel.
- **Onay eylemi** (`siparisiOnayla`): saf ön-kontrol (`onayaUygunMu`) →
  sayım + dönem kapıları (satış akışıyla AYNI gövdeler) → FIFO
  (`acikPartiler` + `gunSonu` sınırı + `fifoDagit` — ikinci FIFO yazılmadı)
  → SALE_OUT (occurredAt=soldAt: **saat stok defterine taşınır**, K163) →
  AuditLog `SIPARIS_ONAYI` (parti/maliyet dağılımıyla) → kâr tazeleme
  (işlem dışı; düşerse `karTazelendi:false` GÖRÜNÜR döner).
- **Ekran:** satış satırında "Onayla" (yalnız kuyruktaki satırda, İlke #1) +
  Türkçe onay diyaloğu (İlke #6 — ledger yazımı) + kodlu hata eşlemesi.
  Panel SEVKİYAT kartına "Onay bekleyen sipariş (API)" satırı (sayı=liste,
  adres sahibinden `/satislar?onay=1`).
- **`KARGO_BEKLEYEN` evrimi:** bağı kurulan içe aktarılan satış kümeye
  GİRER (ölçüt alan doluluğu değil OLAYIN İZİ: SALE_OUT). Biçim `AND`
  taşıyıcı — paketle/okut sorgularındaki kardeş `OR` (kod araması) spread
  ile ezilirdi; liste-suzgeci push biçimine geçti (`:382` dizi-bilinçli).
- **Paketleme yanlış teşhisi düzeldi:** `shippedAt` boş + kümede değilse
  artık "KARGOYA VERİLMİŞ" değil **"ONAY BEKLİYOR — panelden onaylayın"**.
- İki canlı siparişin saati TY orderDate'inden yazıldı (tek seferlik,
  kimlik kilitli, `SIPARIS_SAAT_DUZELTME` izli; ikinci koşum DOKUNMADI).
  ⚠ LEGO'nun anı 02:12 İSTANBUL (23:12Z) — betiğin ilk gün-kıyası UTC'ye
  bakıp meşru yazımı durdurdu, İstanbul-günü kıyasına çevrildi (saat
  dilimi tuzağı, bu kez fazla ihtiyat yönünde).

**BEKÇİLER:** `ice-aktarma:dogrula` +14 ölçüt (K164 bloğu: eylem kapısı ·
saat taşınımı · parti izi · kâr tazeleme · saf gövde DEĞER testleri ·
paketle ayrımı · sayı=liste) — 4 mutasyon 4 doğru ölçütte kırmızı, bit-bit
geri alındı. `kargo-bekleyen:dogrula` iki-dallı ölçüte güncellendi (+bağ
dalı mutasyonu kırmızı) + `onay-kuyrugu` İSTİSNALAR'a gerekçesiyle girdi.
`suzgec:dogrula` referans-eşitlikli AND ölçütüne geçti. `panel:dogrula`
7-görev dünyasına güncellendi. Eski marj imza ölçütü öz korunarak tazelendi.

─── ② İZ DÜZELTMESİ — `Sale.onaylandiAt` (04.09.2026, Halil migration
onayıyla). ①'in kargo-küme dalı SALE_OUT bağına bakıyordu ve **YANLIŞTI**:
o izi ÜÇ mekanizma dolduruyor (elle satış · K55 tarihsel bağ · onay) —
canlıda 7533 tarihsel kayıt kümeye sızdı, panel **7540** gösterdi (Halil
buldu). _"Bu alanı dolduran mekanizma, aradığım olay mı?" sorusu ilk
turda sorulmadı; mutasyon testleri izi doğruladı ama İZİN SEÇİMİNİ
sınayamazdı — iki okumayla uyumlu iz, hiçbirini kanıtlamaz._
ÇÖZÜM: onayın ÖZ İZİ — `Sale.onaylandiAt DateTime?` (tek yazıcı:
`siparisiOnayla`, SALE_OUT'la aynı işlemde). Migration canlıda koştu
(harf bekçisi `sale`→`Sale` düzeltmesini yakaladı), damga güncel.
Kuyruk + kargo kümesi + saf gövde + uygunluk yeni ize döndü; SALE_OUT
kontrolü ikinci savunma olarak KALDI (çift düşüm emniyeti — ayrı soru).
ÖLÇÜLDÜ: kargo kümesi **7540 → 7** · kuyruk **3** (panelle birebir).
Mutasyonlar: onay dalını silen · SALE_OUT'a GERİ dönen · öz-iz yazımını
silen — üçü de kırmızı, bit-bit geri alındı. AuditLog geçiş doldurması:
0 iz (henüz onay yapılmamıştı — boş, doğal).

─── ③ MALİYET GÖRÜLMEDEN ONAY VERİLMEZ (04.09.2026, Halil düzeltmesi:
_"maliyet onaylayarak gitmemiz gerekiyordu"_). İlk diyalog genel cümleyle
onaylatıyordu — kararın KENDİSİ (hangi parti · adet · birim maliyet ·
toplam) ekranda değildi. Eklendi: `onayOnizleme` SALT-OKUMA eylemi aynı
FIFO gövdeleriyle planı hesaplar (yazmaz), diyalog açılır açılmaz basar;
**rakam gelmeden Onayla düğmesi pasif** (mekanik kapı). Önizleme taahhüt
değil: yazım anı kendi işleminde yeniden hesaplar. Bekçi +6 ölçüt; iki
mutasyon (önizlemeyi sunucudan çekmeyen · önizlemeye YAZMA ekleyen) kırmızı
görüldü. ⚠ Önceki push turu, sözlük düzenlememin ortasına denk gelip
i18n'de yarış-kırmızısı verdi — kilit turlar-arası korur, TUR SIRASINDA
düzenlemeyi değil; ders: push arka plandayken sözlük/kaynak düzenlenmez.

─── K168 — PARTİ SEÇİMİ + TEK PARTİ OTOMATİK ONAY · 05.09.2026 · [KOŞTU — canlı kanıtlı]

> **Halil (ekran görüntülü):** _"FIFO'dan ilk gireni seçiyor ama farklı
> zamanlarda alınmış ürünler var; herhangi birini seçebilmeliyim. Tek
> parti mal varsa onaya gerek olmasın."_

**① PARTİ SEÇİMİ (K110 onay diyaloğuna bağlandı).** Onay diyaloğu artık her
kalemde SINIR-İÇİ bütün açık partileri gösterir (tarih · kalan · birim
maliyet); FIFO'nun ilki **önerilen** işaretli, operatör başka partiyi
seçebilir — "düşülecek maliyet" seçime göre anında güncellenir. Yeni
dağıtıcı YAZILMADI: `partileriOncele` (zaten depoda, K110'dan) seçileni
listenin başına alır, AYNI `fifoDagit` çalışır. Seçilen parti araya giren
satışla tükenmişse SESSİZCE FIFO'ya düşmez → `SECIM_GECERSIZ` (İlke #5).
İz `secim: OPERATOR|FIFO` damgası taşır. Kalan adet siparişi karşılamayan
parti seçilemez (gri). ⭐ **Canlı ölçüm:** `axcali1793` için 4 parti
(₺6.499×2 · ₺6.424 · ₺6.378,03); FIFO ₺6.499 öneriyor, en ucuz seçilince
dağıtım gerçekten ₺6.378,03'ten düşüyor.

**② TEK PARTİ OTOMATİK ONAY.** Her kalemde TAM BİR sınır-içi parti varsa
seçilecek bir şey yoktur → sipariş çekim anında kendiliğinden onaylanır
(stok düşer, NET hesaplanır, kargolanacaklara girer). Çok partili sipariş
otomatik onaylanmaz, operatöre (elle onay) bırakılır. ⭐ **Canlı ölçüm:**
N11 çekiminde `aday 1 · onaylanan 0 · çok parti 1` — çok partili
`axcali1793` DOKUNULMADI (onaylandiAt null, SALE_OUT 0).

**MİMARİ — TEK ÇEKİRDEK (İlke #16).** Onay mantığı `src/lib/onay-cekirdegi.ts`e
ayrıştı; elle onay (`siparisiOnayla`, otomatik:false) ve otomatik onay
(`otomatikOnaylaKuyruk`, otomatik:true) AYNI kapılardan geçer (uygunluk ·
sayım · dönem · FIFO/seçim · SALE_OUT · iz). Otomatik onay yalnız İZ
DAMGASINI (`tetik: OTOMATIK_TEK_PARTI|ELLE`) değiştirir — sayım/dönem
kapısını GEVŞETMEZ (duraksarsa kuyrukta kalır). Çekim (N11+TY, İlke #10)
yazımdan sonra çağırır; **sayfa açılışında (GET) çağrılmaz** — sessiz
GET-yazımı bu deponun kaçındığı şey. Kâr motoru (`karYenidenYaz` ·
`satisKarTazele`) opsiyonel `db` parametreli oldu (global prisma betikte
canlıyı göstermeyebilir) — ⭐ **betik prisma'sıyla idempotent çalıştığı
ölçüldü** (11570620205 iki kez tazelendi, ikinci koşum bit-bit sabit).

**KANITLAR:** `ice-aktarma:dogrula` 328/328 · **K168 için 5 mutasyon 5
kırmızı** (tekParti kapısı kalkar · oto damgası ELLE olur · elle onay oto:true
geçer · N11 çağrısı kalkar · dönem kapısı gevşer) · eskiyen 4 ölçüt çekirdeğe
yönlendirildi (davranış aynı, dosya değişti — niye eskidiği yazıldı) · kâr
bekçisi yeşil · build ✓ (`ƒ` rotalar) · bit-bit geri.

⏭ AÇIK: ① satış DETAY ekranına saat + onay durumu gösterimi; ② rozet
eşiği (K162-② notu); ③ tek-partili otomatik onayın uçtan-uca canlı kanıtı
ilk tek-partili API siparişi geldiğinde görülecek (bugün kuyruk çok-partili;
mantık mutasyon + çekirdek elle-onay kanıtıyla sınandı).

---

## ✅ K163 — SİPARİŞ SAATİ DAMGASI · 04.09.2026 · [KOD KOŞTU]

> **Halil:** _"siparişlerin sipariş edildiği tarihe saat damgasını
> vurabilir miyiz"_ — ve ardından: _"stok ve alımda da olabilir"._

**KURAL: kaynakta VARSA atılmaz, YOKSA uydurulmaz.**
- **TY API çekimi** artık `soldAt`e GERÇEK ANI yazar (eski kod `isGunuUtc`
  ile güne yuvarlıyordu — kaynakta duran bilgiyi atıyordu). Şema değişmedi
  (alan zaten DateTime). Gün sınıflandırması pencere sorgularında zaten
  İstanbul'a göre; UTC gün-parçası kovalaması üretimde YOK (ölçüldü —
  `haftaAnahtari` bile İstanbul takvim günü üzerinden).
- **Elle/Excel satışlar** günde kalır: saat bilinmiyor, 00:00 basmak
  yokluğu değer gibi gösterirdi (İlke #11'in saat hâli). Ayrım saf gövdede:
  `gunHassasiyetliMi` (`donem.ts`) — UTC gece yarısı = "saat bilinmiyor".
- **Ekran:** satış listesi tablo + kart görünümü saati yalnız BİLİNİYORSA
  basar (`04.09.2026 · 15:41`). Biçim i18n'den: `bicim.saat` (İstanbul).
- **STOK ve ALIM cevabı:** alım/mal kabul tarihleri KULLANICI BEYANI
  (teslim tarihi elle girilir) — saat kaynağı yok, uydurulmaz; işlem ANI
  zaten her kayıtta `createdAt`ta duruyor. Onay kuyruğu stok düşerken
  `occurredAt = soldAt` yazacağı için API satışının saati stoğa
  KENDİLİĞİNDEN taşınacak.

**Bekçi:** `ice-aktarma:dogrula` +7 ölçüt (gerçek an · geri dönüş yasağı ·
saf gövde DEĞER testi · iki görünüm × İlke #11 kapısı). Eski "güne yuvarla"
ölçütü ÖZÜ korunarak güncellendi (düzeltilmiş andan türetme kaldı; pencere
260→900 ölçülerek büyütüldü). İki mutasyon kırmızı görüldü, bit-bit geri
alındı.

✖ KAPANDI — GERİYE DÖNÜK DOLDURMA YAPILMAYACAK (Halil kararı 04.09.2026):
_"Saatleri geçmişe devam ettirmene gerek yok, mevcuttan ileriye gitmesi
yeterli."_ Geçmiş 440 API satışı gün hassasiyetinde KALIR; bu kalem
YENİDEN AÇILMAZ (kapatma kararı da panoya yazılır kuralı).
⏭ AÇIK: satış DETAY ekranına saat gösterimi — onay kuyruğu paketiyle.

---

## 🔶 K162 — CANLI SİPARİŞ AKIŞI: ÇEKİM 30 DK'YA İNDİ + ONAY KUYRUĞU ÖNERİSİ · 04.09.2026 · [KISMEN KOŞTU]

> **Halil (04.09 sabahı, canlı LEGO siparişi üstünden):** çekilen sipariş
> kargolanacaklarda yok, stok düşmemiş, paketleme "KARGOYA VERİLMİŞ" diyor.
> Önerisi: _"düzenlenecek sipariş sekmesine düşer, maliyet seçilince
> onaylanır ve kargolanacak sekmesine dahil olur — pazaryerlerindeki gibi."_

**ÖLÇÜLEN KÖKLER:**
- `KARGO_BEKLEYEN` = `shippedAt: null` **ve `importKaynak: null`** — K49
  gerekçesi TARİHSEL içe aktarma içindi; canlı API siparişi de aynı dışlamaya
  takılıyor _(ilke, kapsamı dışına uygulanınca hatayı korur)_.
- Paketleme mesajı YANLIŞ TEŞHİS: satışta `shippedAt=NULL` ölçüldü; sipariş
  "kargoya verilmiş" değil "kapsam dışı". _(Metin, sahip olmadığı anlamı
  iddia etmez.)_
- Panel "ALIM KAYDI YOK" satırı LEGO'ya ait DEĞİL (LEGO varyantı
  `OYU-LG-598P-01`: 23 alım kaydı, ledger stok 6) — başka satışın.
- enumerasyon kaynaklı 440 satışın **425'i shippedAt boş** → kuyruk ölçütü
  bunları ayırmadan kurulamaz (K49: kapatılamayan madde üretir).
- Sabah koşumu yeni siparişi getirmedi çünkü sipariş sonradan düştü; rutin
  GÜNLÜKTÜ.

**KOŞAN KISIM (bugün):**
- Yeni sipariş elle dar pencereli yazımla alındı (7853→7854 ✓ sayım tuttu).
- **`Selliora TY Sik Cekim`** görevi kuruldu: 30 dk'da bir, dar pencere
  (`scripts/ty-sik-cekim.cmd`, ASCII+CRLF). ⚠ Kaçış bozulması bu turda ÜÇ
  araçta yaşandı — python unicode kaçışı, printf'in BEL'e çevirdiği dizi,
  ve JSON katmanının çift ters bölüyü teke indirmesi; dosya chr(92) ile
  kuruldu ve baytları `cat -A` ile doğrulandı. Duman testi: cikis=0,
  "yazılan 0" (çakışmada atla — idempotentlik canlıda bir kez daha görüldü).
  Günlük 08:00 geniş tarama (60 gün) yedek olarak KALDI.
- Kurulum/kaldırma: PowerShell Register-ScheduledTask / Unregister-ScheduledTask,
  görev adı "Selliora TY Sik Cekim" (komut yoruma değil buraya yazılır).

─── ② ÇEKİM 5 DAKİKAYA İNDİ + CANLI-YAZIM KAPISI (04.09.2026, Halil:
"zamanı kısaltmamız lazım" + "kontrolü yap"). Webhook yeteneği bugün YOK
(TY/HB webhook'u internete açık imzalı alıcı uç ister — Faz 4 kalemi);
aralık 30 dk → **5 dk** yapıldı (koşum 7 sn, idempotent).
⚠ SIKLIK BİR RİSKİ ÖNE ÇIKARDI VE KAPANDI: harness hedef listesi ile
çekimin import zinciri KESİŞİYOR (`varyant-arama-kurali.ts`) — tur
sırasında koşan çekim mutant kuralla siparişi yanlış varyanta
bağlayabilirdi. Kapı: kilit CANLIYKEN çekim ATLANIR (çıkış 0, sebep
yazılır). Ölçüt ORTAK gövdede `scripts/bekci-kilit.ts` (bekçi + çekim
aynı bayatlık kuralını okur — iki yerde iki ölçüt olmaz).
Kanıtlar: iki yönlü mutasyon (kapıyı öldüren 257/259 · körelten 258/259,
ikisi de KENDİ ölçütünde kırmızı) · uçtan uca canlı-kilit koşumu ATLANDI/
kilitsiz normal · bit-bit geri alma. Görevler yeniden AÇIK.
⚠ Rozet eşiği (26 saat) BEKLİYOR: 5 dk periyoda göre eşik, makinenin
açık kalma düzenine bağlı — gece kapalıysa 1 saatlik eşik her sabah
yalancı kırmızı yakar. Halil'in düzeni öğrenilince türetilecek.

─── ③ OPERASYON KLONU (04.09.2026, Halil: "daha efektif bir yolu yok mu").
② kapısının bedeli ölçüldü: 11568452783 siparişi tur penceresine denk
geldi ve 12+ dk bekledi. Yapısal çözüm: çekim görevleri artık
`Desktop/axcali-operasyon` KLONUNDAN koşuyor — GitHub'a push'lanmış
(bekçiden geçmiş) kod; geliştirme ağacındaki tur/mutasyon pencereleri
çekimi ETKİLEMEZ, bekleme penceresi KALKTI. Her koşum: git pull --ff-only
(düşerse bayat-ama-doğrulanmış kodla devam) + .env.canli ana kopyadan
tazelenir (tek kaynak). Ana ağaçtaki ② kapısı elle koşumlar için savunma
derinliği olarak DURUYOR.
⚠ KLON BAKIMI: package-lock/şema değiştiren push'tan sonra klonda
`npm ci` gerekir (postinstall prisma generate'i koşuyor) — unutulursa
çekim logu kırmızı yazar (sessiz düşmez). Duman: görev klondan koştu,
cikis=0; bekleyen sipariş klondan yazıldı (7854→7855 ✓).

✔ ONAY KUYRUĞU PAKETİ — Halil onayladı (_"onay kuyruğunu yap"_) → **K164'te KURULDU.** Plan şuydu:
① "Onay bekleyen sipariş" kutusu (ölçüt: importKaynak dolu + stok bağı yok
   + iptal yok + CANLI AKIŞ — tarihsel 425 ayrımı için TY paket geçmişinden
   gerçek Shipped anı okunabilir mi ÖLÇÜLECEK; okunuyorsa geriye dönük
   `shippedAt` doldurma ayrı onaylı yazım olur);
② Onay ekranı: FIFO maliyet önerisi → onayla → StockMovement yazılır →
   NET hesaplanır;
③ `KARGO_BEKLEYEN` evrimi: bağ kurulmuş içe aktarılan satış kümeye GİRER
   (ölçüt alan doluluğu değil OLAYIN İZİ: çıkış hareketi);
④ Paketleme yanlış teşhisi düzelir ("içe aktarıldı, onay bekliyor" ayrı
   mesaj); ⑤ rozet eşiği 26 saat → yeni periyottan türetilir.

---

## 🔶 K160 — HB SİPARİŞ ÇEKİM İSKELETİ (ÖNİZLEME-YALNIZ) · 04.09.2026 · [KOŞTU]

> **Halil:** _"onay veriyorum"_ (HB sipariş çekim iskeleti, TY kopyası).

**KURULAN — üç dosya:**
- `scripts/hb/istemci.ts` — ORTAK gövde (kimlik · Basic auth · User-Agent=
  developer · `-sit` ortam anahtarı · `apiGet` fiilsiz imza · offset
  sayfalaması). _TY dersi "tek gövde, iki okuyucu" doğuştan uygulandı._
- `scripts/canli-hb-saglik.ts` istemciye bağlandı (kendi `fetch`i kalktı —
  içinde artık hiçbir HTTP fiili geçmiyor, `api:dogrula` ölçütü).
- `scripts/canli-hb-ice-aktar.ts` — **YAZIM YOLU TANIMSIZ, BİLEREK.**
  TY'de alan adları ölçülerek bağlanmıştı (`commission` 564/564, tahmin
  `commissionRate` 0/564); HB SIT'inde sipariş verisi YOK → eşleme
  ölçülemez → yazım açılmaz. Betiğin işi: çekim + İLK kaydın alan ADLARINI
  raporlamak (değer basılmaz) + sayfalama kanıtı.

**ÖLÇÜLENLER (SIT, 04.09.2026):**

    sipariş zarfı   totalCount VAR (0 ✓) · paket zarfı: beyan YOK
    listing         30 kayıt · 3 tur (limit 10) · beyan totalCount=30 ✓
    ⚠ menzil dışı offset **404 dönüyor** (boş dizi DEĞİL) — 404 bu uçta
      iki anlamlı; sonlanma bu yüzden totalCount'a bağlandı, 404'e değil
      _(iki okumayla uyumlu işarete hüküm bağlanmaz)_

**BEKÇİ KAPSAMI GENİŞLEDİ:** `api:dogrula` yalnız TY izlerini tanıyordu —
sağlık betiğinin _"bu bekçi beni tarıyor"_ iddiası BOŞTU. İzler listeye
döndü (`apigw.trendyol.com` + `hepsiburada.com` · `ty/istemci` +
`hb/istemci`); üç HB dosyası üç ölçütte taranıyor. Mutasyonla kanıtlandı:
`hb/istemci.ts`e `method: "POST"` → **çıkış 1** (2 kontrol kırmızı);
bit-bit geri alındı, temiz koşum 0.

⏭ AÇILIŞ ŞARTI (yazım yolu): SIT'te test siparişi doğduğunda (HB "Sipariş
Entegrasyonu" test adımları) alan adları ①/② çıktısıyla ölçülür; yazım
TY disipliniyle (önce sayım · çakışmada atla · importBatch · AuditLog ·
ikinci koşum 0) AYRI pakette açılır.

---

## ✅ K161 — İKİ EŞZAMANLI BEKÇİ TURU BİRBİRİNİ KİRLETTİ → TEK TUR KİLİDİ · 04.09.2026 · [KOD KOŞTU]

> **VAKA:** K159 push'unun pre-push turu ile elle başlatılan tur AYNI ANDA
> koştu. Harness'ler aynı dosyaları bozup geri yazar; iki tur yarışınca
> biri ötekinin MUTANTINI "asıl" diye kopyalayıp geri yazdı:
> `"kodVar": "Satışta"` sözlükte KALDI, hook turu kırmızı yandı, **push
> düştü** (`PUSH=1` — görev sarmalayıcısı 0 gösteriyordu, push adımı 1'di:
> "aracın çıktısı okunur, kodu değil" bir kez daha).
> Artığı bulan şey tesadüftü: bir SONRAKİ turun yalancı kırmızısı.

**MEKANİZMA (`scripts/bekci.ts`):** `.bekci-kilidi` — ikinci tur AÇILMAZ,
sebebini yazar, çıkış 1. Bayat kilit (ölü PID ya da >90 dk) DEVRALINIR ve
devralma ekrana yazılır (boş ≠ temiz). Kilit yalnız SAHİBİYSE silinir.

**KAPI İKİ YÖNDEN SINANDI:**
- canlı PID'li kilit → tur REDDETTİ (çıkış 1 · 0 bekçi koştu · başkasının
  kilidi silinmedi) — `| tail` ilk ölçümde kodu yutmuştu, borusuz ölçüldü;
- ölü PID'li kilit → tur DEVRALDI ve koştu (bu kalemin kapanış turunda).

**TEMİZLİK:** mutant `git diff` ile arandı; TEK artık `kodVar` çıktı,
onarıldı, çalışma ağacı HEAD'e bit-bit döndü (meşru 4 dosya hariç).

---

## ✅ K133 — DETAYA GİRİNCE LİSTEYE DÖNÜLEMİYOR · **KOD KOŞTU 02.09.2026**

> Kullanıcı: _"Bu ekrandan ürünün üzerine tıklayınca geri ekrana gelemiyorum.
> Bu normal mi?"_ — **Normal değil.**

### ⛔ KÖK: HAFIZA TABAN ADRESE GÖRE, AMA DETAYA ÇOK YERDEN GİRİLİYOR

`lib/liste-hafizasi.ts` başlığında doğru soru zaten yazılı:

> _"DOĞRU SORU 'bir adım geri' değil, **'en son hangi listeyi gördüm'**."_

Ama uygulaması **taban adres başına**: `sessionStorage[selliora:liste:{temel}]`.
Ürün detayı `<ListeyeDon href="/urunler">` diyor, yani YALNIZ `/urunler`
anahtarına bakıyor. Başka bir listeden gelindiyse o anahtar boştur ve
bağlantı düz `/urunler`e gider — **kullanıcının süzgeci kaybolur.**

📏 **ÖLÇÜLDÜ 02.09.2026 — ürün detayına giren ekranlar:**

    /rapor/urunler  ·  /stok  ·  /kart  ·  /alimlar/[id]
    /satislar/[id]  ·  panel kartları
    ListeyiHatirla KOYULMUŞ olanlar: alimlar · giderler · kanal-sku ·
                                     panel · satislar · stok · urunler

Yani `/stok`ta hafıza VAR ama ürün detayı onu OKUMUYOR (farklı anahtar).
`/rapor/urunler`de hafıza HİÇ YOK.

⚠ **BU YENİ BİR KUSUR DEĞİL — K129 onu GÖRÜNÜR YAPTI.** `/stok`tan girip
dönen kullanıcı da aynı şeyi yaşıyordu; yeni ekran gelince fark edildi.

### ⛔ VE ÜÇ SATIRLIK BİR DÜZELTME DEĞİL — DENENDİ, ÇÜRÜDÜ

**Cazip çare:** genel bir "son liste" anahtarı yaz, `ListeyeDon` onu tercih
etsin. **Ama etiket sabit:** bağlantı "‹ Ürünler" yazarken `/satislar`a
giderse metin davranışı YANLIŞ söyler (İlke #2 + "metin, sahip olmadığı
anlamı iddia etmez"). Yani etiket de hedeften türetilmeli — bu, bileşenin
arayüzünü değiştirir.

**İkinci cazip çare:** dönüş adresini bağlantıya parametre olarak taşı
(`?donus=...`). O da aynı işi yapan İKİNCİ bir mekanizma kurar ve ikisi
zamanla ayrışır.

### ✅ ÇÖZÜM — GENEL HAFIZA, VE ETİKET LİSTENİN KENDİSİNDEN

⭐ **MODÜL KENDİ DOĞRU SORUSUNU BAŞLIĞINDA ZATEN YAZMIŞTI** — _"'bir adım
geri' değil, EN SON HANGİ LİSTEYİ GÖRDÜM."_ Uygulaması taban başına
kalmıştı. Genel anahtar (`__son__`) o soruyu olduğu gibi cevaplıyor.

⛔ **ETİKET DE SAKLANIYOR VE BU TASARIMIN ÇEKİRDEĞİ.** Yalnız adres
saklansaydı bağlantı **"‹ Ürünler" yazarken `/satislar`a giderdi** — metin
davranışı YANLIŞ söyler (İlke #2). Etiketi taban→ad eşlemesinden türetmek
ise **elle tutulan bir liste** doğururdu ve yedinci liste eklendiğinde
sessizce eskirdi. Çözüm: **etiketi listenin KENDİSİ yazar** — sayfa zaten
kendi başlığını biliyor (`Basliklar` sözlüğü), eşleme HİÇ DOĞMUYOR.

⛔ **İKİNCİ MEKANİZMA KURULMADI.** Dönüş adresini bağlantıya parametre
olarak taşımak (`?donus=…`) aynı işi yapan ikinci bir yol olurdu ve ikisi
zamanla ayrışırdı. Yeni gövde var olanın ÜSTÜNE bindi, yanına değil —
taban başına hafıza yedek olarak yerinde.

⚠ **PANEL GENEL HAFIZAYA GİRMEZ, BİLEREK:** tabanı `/` ve `guvenliTaban`
onu reddediyor. `/` tabanıyla HER adres doğrulamayı geçerdi ve depodan
gelen değer bir gezinme hedefine dönüştüğü için bu açık yönlendirme riski.

⭐ **TYPESCRIPT YEDİ ÇAĞRI YERİNİ BİRDEN ZORLADI** — `etiket` zorunlu prop
olunca derleme durdu ve hiçbir liste unutulamadı. Elle liste tutulmadı.

**Bekçi `liste-donusu:dogrula` 27 ölçüt · 4 bölüm · mutasyon 9/9 KIRMIZI.**

### ⛔ VE BEKÇİ İLK TURDA KÖRDÜ — ALTI MUTASYONUN DÖRDÜ KAÇTI

Bu, mutasyonun niye zorunlu olduğunun ders kitabı örneği. Dört ayrı körlük:

| Kaçan | Sebep |
|---|---|
| yazma kapısı kalktı | **okuma tarafı aynı kontrolü yapıyor** — sonuç yine `null`, iki halka birbirini maskeliyor |
| okuma kapısı kalktı | yazma kapısı bozuk kaydı zaten geçirmiyor → okuma kapısı **hiç tetiklenmiyor** |
| genel hafıza silindi | ⛔ `indexOf(a) < indexOf(b)` — bulunamayınca **`-1` döner ve `-1 < n` DOĞRUDUR** |
| taban kapısı kalktı | örnek veri **iki kapıya birden** takılıyordu; ayrım görünmüyordu |

**Üç düzeltme:** ① yazma tarafı **depoya bakarak** izole ölçülüyor
(`depoBos()`), ② okuma tarafı için depoya **doğrudan enjeksiyon**, ③ her
örnek **yalnız BİR kapıya** takılıyor — ötekiler geçiyor.
_(Anayasa: "örnek veri ayrımın iki yakasını göstermeli"; "sıfır üç farklı
şey olabilir" — burada `-1` "yok" demekti, ölçüt onu "önce geliyor" okudu.)_

### 📎 KAPANIŞ — DERSLER ANAYASAYA GEÇTİ (02.09.2026)

Üç madde `CLAUDE.md`e yazıldı; burada tekrarlanmıyor, kaynağı orası:
· **İki kapı aynı şeyi koruyorsa mutasyon kapı başına izole edilir**
· **Sessiz varsayılan üreten ifadeler ayrıca kapılanır** (`indexOf`/`-1`,
  `every`/`[]`, `??`, `Math.max()`)
· **Kritik yazım, yazıldığı doğrulanmadan yapılmış sayılmaz** (aynı gün üç
  sessiz `replace`; geri almanın kendisi de bir yazımdır)

⭐ **PANEL GEREKÇESİ KODA YAZILDI** — `lib/liste-hafizasi.ts` →
`guvenliTaban` başlığında, **reddin gerçekleştiği yerde** (çağrı yerinde
değil). Başlık açıkça _"GERİ EKLEMEYİN"_ diyor ve niye eklenemeyeceğini
ölçtürüyor: `/` tabanıyla `guvenliAdres` hiçbir şeyi elemez, ve buradan
okunan değer doğrudan bir gezinme hedefine dönüşür.

### 🔶 HALİL TEST LİSTESİ

1. `/stok` → **"91–180 gün"** çipine bas → bir ürüne tıkla → ürün detayında
   sol üstteki geri bağlantısı **"‹ Stok"** demeli ve tıklayınca
   **süzgeçli listeye** dönmeli (91–180 seçili).
2. `/rapor/urunler` → Stokta bekleyen → bir ürüne tıkla → geri bağlantısı
   **"‹ Ürün analizi"** demeli ve süzgeçli analize dönmeli.
   ⛔ "‹ Ürünler" yazıyorsa test DÜŞER.
3. `/satislar`da gez, sonra panelden bir ürüne git → geri **"‹ Satışlar"**
   demeli. (En son gördüğün liste odur; metin de onu söyler.)
4. Tarayıcının geri tuşu da eskisi gibi çalışmalı.

---

## ✅ K137 — İŞLENMİŞ İADE ARAMASI · 02.09.2026 · [KAPANDI]

_Kullanıcı: "iadeler kısmında arama kısmı yok. Detaylı arama kısmını buraya
da ekle."_

⛔ **HAKLIYDI VE EKSİK YARIMDI:** arama kutusu bu sayfada **VARDI** — yalnız
**Bildirimler** sekmesinde (`bq`). İşlenmiş iadelerde tarih penceresi ve üç
açılır süzgeç vardı, arama YOKTU. Ortak bileşen sayfaya girmiş, ikinci
sekmeye taşınmamıştı.

### NE EKLENDİ

`src/lib/iade/arama.ts` → `iadeAramaKosulu` (saf, `bildirimAramaKosulu`nun
kardeşi — AYRI tablo olduğu için ortak gövdeye zorlanmadı).

    aranıyor: talep no · SEBEP NOTU · sipariş no · gönderi no ·
              SKU · firma SKU · barkod · ürün adı · kanal SKU (aktif)

⭐ **SEBEP NOTU DA ARANIYOR** — K136a'da sebep `Return.note`a yazıldı
(`IADE_SEBEP[kaynak:…]: «Beğenmedim»`). Aranabilir olmasaydı "kaç iade
beğenmemekten" sorusunun cevabı olmazdı; o soru enum genişletmesinin
**açılış şartı**.

⭐ **ARAMA `kosul`A GİRDİ, LİSTEYE DEĞİL:** `kosul` üç yerde okunuyor —
`count`, liste ve **dönem özeti**. Yalnız listeye uygulansaydı üstteki
kartlar süzgeçten bağımsız kalır ve İlke #15 kırılırdı. Excel de aynı
kümeyi indiriyor.

⛔ **BOŞ MESAJ ÜÇE AYRILDI.** Eskiden her hâlde _"Bu dönemde iade yok."_
yazıyordu; arama açıkken bu **yanlış bilgiydi** (dönemde iade VAR, eşleşen
yok). Artık: arama varsa `bosAramaSonucu` · süzgeç varsa `bosSuzgecSonucu` ·
ikisi de yoksa `bosListe`.

### 🐞 BEKÇİ ÜÇ KEZ KAÇTI — ÜÇÜ DE ÖLÇÜT KUSURU, VERİ DEĞİL

| Kaçan mutasyon | Kök sebep |
|---|---|
| `sale.code`u listeden sil | Ölçüt `IADE_ARAMA_ALANLARI`'nı DOLAŞIYORDU — listeden silinen alan, onu sınayan kontrolü de siliyordu. **Kendi tabanını doğruluyordu.** |
| `sale.shipmentCode`u sil | aynı kök |
| Kod eşdeğerini kaldır | Ölçüt `includes("194644037598")` idi; aranan `0194644037598` bunu zaten **ALT DİZE** olarak içeriyor. Ölçüt kendi girdisinin parçasıyla tatmin oluyordu. |

⭐ **ÇARE İKİ PARÇALI:** ① taban doluluğu AYRICA kanıtlanıyor
(`length >= 8` + operasyonun eline geçen kimlikler ADIYLA); ② eşdeğer
KENDİ DEĞERİ olarak aranıyor (`"contains":"194644037598"`, tırnaklarıyla).
_(Anayasa: "`EVERY` kapısı taban doluluğunu ayrıca kanıtlar" — liste
boşalmıyor ama KÜÇÜLÜYOR ve etkisi aynı.)_

✓ **10/10 mutasyon kırmızı** (yanlış susma + yanlış yanma yönü).
✓ `rma:dogrula` 532 ölçüt · i18n ✓ · lint ✓ · tsc ✓

### ⭐ ② SEBEP LİSTEYE DE KONDU (kullanıcı sorusu, aynı gün)

_Kullanıcı Tür sütununu işaret ederek: "Beğenmedim kısmı burda mı olsa
acaba?"_

⛔ **ALTINDA GERÇEK KUSUR VARDI:** arama sebep notunu ARIYOR ama satır
**niye eşleştiğini söylemiyordu.** "Beğenmedim" yazıp kaydı bulan kullanıcı,
sebebi görmek için detaya girmek zorundaydı _(İlke #9 ihlali)_.

**Yer seçimi kullanıcınındı ve doğruydu:** Tür = _NASIL_ döndü (normal ·
teslim edilemedi · itirazlı), sebep = _NİYE_ döndü. İkisi aynı soruya bakar,
aynı hücrede durur. Mobil kartta da var _(İlke #8/#10)_.

### ⚠ VE KALIP TEK BAŞINA YETMEZ — ÖLÇÜLDÜ

    toplam Return 17  ·  notu dolu 10  ·  notu boş 7
    ⭐ kurallı kalıp   8   (IADE_SEBEP[kaynak:…]: «…»)
    ⚠ serbest metin   2   ← ve İKİSİ DE gerçek operasyon notu:
      "Değişim olarak düzeltildi — para satıcıda kaldı…"
      "İADE REDDEDİLDİ TRENDYOL KABUL ETTİ, ÜRÜN MÜŞTERİYE…"

⛔ Yalnız kalıbı çözen bir gösterim o ikisini **görünmez** yapardı — üstelik
en çok okunması gereken notlar onlar. `iadeSebebiCoz` asla `null` dönmez:
kalıp tutmazsa notun KENDİSİ döner. Ve **kırpma yok** — serbest notlarda
hüküm sonda olabiliyor.

### 🐞 BİR MUTASYON DAHA KAÇTI — BU SEFER VERİ KÖRDÜ

`«»` girdisiyle yazdığım ölçüt, `metin === ""` dalını öldüren mutasyonu
yakalayamadı. Sebep kodda değildi: `«(.+)»` **en az bir karakter** istiyor,
yani `«»` kalıba hiç girmiyor ve o dal çalışmıyordu — ölçüt doğru cevabı
YANLIŞ yoldan alıyordu. Girdi `«   »` yapıldı (boşluk kalıba girer, `trim`
sonrası boşalır) ve mutasyon kırmızıya döndü.
_(Anayasa: "mutasyon kaçıyorsa ÖNCE test verisi sorgulanır" — mutasyon
silinmez, ölçüt gevşetilmez, VERİ düzeltilir.)_

✓ **15/15 mutasyon kırmızı** · `rma:dogrula` 546 ölçüt

### 🧾 HALİL TEST LİSTESİ

0. `/iadeler` → İşlenmiş iadeler → `4287210000` satırında **Tür**
   sütununun altında sebep yazmalı:
   _"Yanlış sipariş verdim seçeneğinden iade"_

1. `/iadeler` → **İşlenmiş iadeler** sekmesi → arama kutusu GÖRÜNMELİ
   (kamera ikonuyla)
2. `4287210000` yaz → Ara → **1 kayıt**; üstteki özet kartları da o tek
   kaydın rakamına düşmeli (adet 1)
3. `Beğenmedim` yaz → **1 kayıt** (`11409234590`) — sebep notundan buluyor
4. `zzzz` yaz → **"«zzzz» ile eşleşen iade yok"** yazmalı,
   _"Bu dönemde iade yok"_ DEĞİL
5. Temizle → liste geri gelmeli, kutu da boşalmalı
6. Arama açıkken **Excel indir** → inen dosya yalnız eşleşenleri taşımalı

---

## ✅ K150 — BARKOD KARIŞMASININ KÂR ETKİSİ DÜZELTİLDİ · 03.09.2026 · [KOD KOŞTU]

> **Halil:** _"ekranda düzelmesi önemli değil, zararsız hale getirmen
> yeterli; stok, ciro ve KDV olarak zararsız hale gelmesi yeterli."_
> · _"gerçeğin peşinde koşmaya devam et."_

Araç: `npm run canli:cikis-maliyeti-duzelt` — iki partinin kimliğine kilitli.

### ⭐ ÖLÇÜLDÜ: HALİL'İN SAYDIĞI ÜÇ EKSENDE ZARAR ZATEN YOKTU

    STOK  axcali2110 sayım 3 dedi, defter 3 — 27.08 sayımı mühürlemiş
    CİRO  satışlar gerçek, fiyatları hiç değişmedi
    KDV   iki alım da GERÇEKTEN yapıldı (₺2.251,75 · ₺8.598 ödendi)

⛔ **BOZUK OLAN TEK ŞEY KÂR:** yanlış partiden yiyen 7 satış ucuz maliyet
taşıyordu.

### ⭐ ÜÇ ADAY ÖLÇÜLDÜ, EN DARI SEÇİLDİ

| yol | karar |
|---|---|
| `PurchaseItem.unitCostAmount` | ⛔ **KDV tabanını bozar** — o para gerçekten ödendi |
| `PURCHASE_IN` damgası | ⛔ **gereksiz** — iki parti de KAPALI, kimse okumuyor |
| ⭐ **ÇIKIŞ damgaları** | ✓ kâr motoru maliyeti **buradan** okuyor |

    dokunulan çıkış 7 · doğrulama 7/7 ✓ · stok miktarı bozulmadı ✓
    Ocak alım toplamı ₺1.141.085,86 — DEĞİŞMEDİ ✓

⚠ **VE BİR TUTARSIZLIK BİLEREK BIRAKILDI:** parti ₺450,35 derken çıkışlar
₺1.399 diyor. Alternatifi KDV tabanını bozmaktı. Gerekçe hem alımın notuna
hem `CIKIS_MALIYETI_DUZELTILDI` izine yazıldı.

### ⛔ VE TAHMİNİM YANLIŞ TABANDAYDI — DÜZELTMESİ BURADA

Halil'e _"kâr ₺11.143,25 azalacak"_ dedim. **Ölçülen düşüş ₺9.286,04.**

    ham maliyet artışı  5×948,65 + 2×3.200,00 = 11.143,25   ← NET-1 tabanı
    ölçülen NET-2 düşüşü                        9.286,04    ← GEÇERLİ
    fark                                        1.857,21

⭐ **SEBEP:** maliyet **KDV DAHİL**; artınca indirilecek KDV de artıyor, o
yüzden NET-2 **maliyet ÷ 1,20** kadar düşüyor (948,65/1,2 = 790,54 ·
3.200/1,2 = 2.666,67 — ikisi de satır satır tuttu).
_(Anayasa: "para rakamı tabanıyla birlikte yazılır" — ₺11.143,25 NET-1'in
etkisiydi, NET-2'nin değil. K75'te aynı hata yapılmıştı ve orada da
düzeltilmişti.)_

⛔ **VE İKİNCİ TAHMİNİM DE YANLIŞTI:** _"5 satış zarara düşecek"_ dedim;
hiçbiri düşmedi (+112 ile +224 arasına indiler). Aynı kök: ham maliyeti
NET-2'ye doğrudan uyguladım.

    10865503820   913,93 → 123,38      10867393016  3.089,84 → 423,17
    10865580290 1.014,98 → 224,44      10876683465  2.720,80 →  54,13
    10867340812   902,61 → 112,07
    10867425096   902,61 → 112,07
    4343296468  1.014,63 → 224,08

✓ NET tazelendi 7/7 · doğrulama 7/7 · `canli:net-tazele` ile.

### ✅ AÇIK KALAN KALEM ÖLÇÜLDÜ VE KAPANDI — KORBELL YAZILMAYACAK

Ölçüm yapıldı (03.09) ve cevap **"yazma"** çıktı. Gerekçe üç ölçümde:

    ① SAYIM GORDU   29.08: defter 7 → duzeltme −3 → Halil rafta 4 saydi
       8 adet geçmişe eklenirse defter 15 olur, sayılan 4 ile arası 11 AÇILIR
    ② STOK ZATEN KAPATILMIS  bu varyantta alim kaydi OLMAYAN 8 giris var:
       +7 @₺796 (eksik-alim-20260829) · 7×+1 @₺863 (dosya-maliyet-20260828)
    ③ MALIYET ZATEN DOGRU     sentetik ₺863,00 ↔ gercek ₺863,28 → 28 KURUS

⭐ **AÇIK OLAN TEK EKSEN KDV TABANI** — ₺6.906,24 şubat alımına girmemiş.
Ama bu Korbell'e özgü değil; K151'de ölçüldü ve oraya taşındı.

⛔ **VE PANODAKİ NOT YANLIŞTI — DÜZELTMESİ BURADA:** yukarıda _"Korbell Çöp
Kovası · İKİ barkodun da varyantı YOK"_ yazıyordu. Ölçüm: barkod **TEK**
(`9723484564032`) ve varyantı **VAR** — `OYUNEN88141740`. Ad araması `0`
döndürmüştü çünkü ürün sistemde **"Bebek Bezi Çöp Kovası Sistemi"** adıyla
duruyor, "Korbell" adıyla değil.
_(Anayasa: "kimlik varken dizeyle aranmaz" — ve "sıfır üç farklı şey
olabilir": burada `0`, yokluk değil BULUNAMAMAYDI.)_

⭐ **VE NİYE GİRMEDİĞİ DE BULUNDU:** eski `Alımlar.xlsx`ta o 4 satırın
barkodu `6009631456297`ydi — sistemde karşılığı olmayan bir kod. İçe
aktarma barkoda baktı, bulamadı, **doğru davrandı.** Halil hücreleri
düzeltti; bir sonraki aktarma bu satırları görecek.

⭐ **VE KAYNAK DOSYA DÜZELDİ:** Halil `Alımlar.xlsx`taki 20 hücreyi
düzeltti; ad↔barkod çelişkisi **7 → 1**'e indi ve kalan tek çelişki
(Stanley IceFlow) GERÇEK — Rose Quartz ve Lila iki ayrı renk. Yani bir
sonraki içe aktarma aynı hatayı tekrarlamayacak.

---

## 🔶 K159 — TY YAZMA ERTELENDİ (KARAR) + HB TEST API BAŞLADI · 04.09.2026

**TY→KANAL YAZMA — HALİL KARARI: "yazma sonra olsun".** Teknik imkân ve
risk tablosu sunuldu (stok · fiyat · kargo bildirimi · listing); Faz 4
kalemi öne ÇEKİLMEDİ. ⏭ Açılış şartı: Halil "başla" dediğinde — önerilen
ilk uç STOK (oversell'i keser). O güne kadar istemci SALT OKUMA kalır
(`api-dogrula` bekçisi bunu zaten tarıyor).

**HB TEST API:** Halil anahtarları `.env.canli`ye ekledi
(HEPSIBURADA_MERCHANT_ID / _API_KEY / _ORTAM=TEST — değerler hiçbir
çıktıya girmedi, girmez). `canli:hb-saglik` yazıldı — TY sağlık
disiplininin aynısı (GET-only · anahtar yalnız bellekte · BEŞ sonuç
ayrımı: AÇIK / AÇIK-BOŞ / YETKİSİZ / YOL_YOK / ULAŞILAMADI).

İlk ölçüm (SIT ortamı):

    OMS siparişler   YETKİSİZ (401)      ← host+yol VAR, kimlik reddedildi
    OMS paketler     YETKİSİZ (401)
    Listing listesi  YETKİSİZ (401)

─── ② 401 ÇÖZÜLDÜ (04.09.2026) — HB e-postası geldi: **User-Agent =
DEVELOPER USERNAME** (`axcali_dev`), merchantId DEĞİL. Basic auth kurgusu
zaten doğruydu (Username=MerchantId, Password=SecretKey); tek yanlış
başlıktı. `.env.canli`ye `HEPSIBURADA_DEVELOPER` eklendi, betik ona
bağlandı (boşsa KIRMIZI — sessiz düşme yok). Yeniden ölçüm:

    OMS siparişler   AÇIK/BOŞ (200, kayıt yok — test ortamı boş)
    OMS paketler     AÇIK/BOŞ (200)
    Listing listesi  AÇIK     (200, ~30 kayıt)

⚠ SIT sipariş tarafı BOŞ: HB'nin test adımları dokümanı test siparişi
üretmeyi tarif ediyor (Sipariş Entegrasyonu dokümanı). Çekim iskeleti
boş ortamda da yazılabilir; doğrulaması test siparişi doğunca yapılır.
✓ SIRADAKİ KAPANDI: Halil onay verdi (04.09.2026) → iskelet K160'ta.

---

## ✅ K158 — TY GÜNLÜK ÇEKİM RUTİNİ + PANEL ROZETİ · 04.09.2026 · [KOD KOŞTU]

> **Halil:** _"TY'de devam edelim."_ Durum ölçülmüştü: son çekim 9 gün
> önceydi; Eylül'ün 47 satışının 47'si elle girilmişti, API'den 0.

### ⭐ KURULAN — İKİ PARÇA

**① Windows Görev Zamanlayıcı (bu makinede):** her gün 08:00,
`scripts/ty-gunluk-cekim.cmd` → `canli:ty-ice-aktar --yaz`.
· Anahtarlar makinede kalır (A3 sınırı bozulmaz) · çakışan sipariş ASLA
ezilmez (taze koşum kanıtı: 521 pencere siparişinin 520'si zatenVar —
elle girişler API ile birebir tutuyor) · log kırpılmaz:
`raporlar/ty-cekim.log` · duman testi: çıkış 0, gerçek çekim yaptı.
Kurulum: `schtasks /Create /TN "Selliora TY Cekim" /TR "...cmd" /SC DAILY /ST 08:00`
Kaldırma: `schtasks /Delete /TN "Selliora TY Cekim" /F`

**② Panel rozeti "son TY çekimi":** zamanlayıcı kaçarsa EKRAN söyler
(Vercel Cron dersi: kaçışın kendisi görünür kılınır). Saf gövde
`lib/panel/ty-cekim-yasi.ts`: eşik **26 saat** (rutin günlük 24 + 2 pay
— rutinden türetilmiş, uydurma değil) · `YOK` ayrı dal (yokluk tazelik
sanılmasın) · ESKİ/YOK kırmızı (renk JETONDAN — ham `text-red-600`
tasarım bekçisine takıldı, `DURUM_YAZISI.olumsuz`a çevrildi).
Bekçi 654→659 (eşik İKİ YAKASI + YOK + sabit + kaynak bağı) · **2
mutasyon kırmızı** (YOK dalı · eşik karşılaştırması).

### ⛔ İKİ DERS — İKİSİ DE BU KURULUMDA YENDİ

1. **Ölçüt bloğu özetin İÇİNE kondu ve mutasyonlar YEŞİL geçti** — blok
   `if (basarisiz === 0)` dalındaydı: kontroller koşuyor, sonucu çıkışı
   etkilemiyordu (anayasa: "ölçüt bloğu özet ve çıkış kodundan ÖNCE
   koşar" — birebir tekrar). Blok öne taşındı, mutasyonlar ancak o zaman
   kırmızı yandı.
2. **`.cmd` yorumundaki KOMUT ÇALIŞTI:** ilk sürüm UTF-8/Türkçe
   karakterliydi, batch parse bozuldu, `rem` satırları komut gibi koştu
   ve yorumda örnek diye duran `schtasks /Delete` GÖREVİ SİLDİ. Kural:
   `.cmd` saf ASCII + CRLF yazılır ve YORUMA KOMUT YAZILMAZ (komutlar
   panoya). Ayrıca `schtasks` Git Bash'ten çağrılmaz (yol çevirisi
   bozuyor) — PowerShell'den.

### HALİL TEST LİSTESİ
1. Yarın 08:00 sonrası panel: "Trendyol çekimi: N saat önce" gri satır.
2. `raporlar/ty-cekim.log` sonunda bugünün BASLADI/BITTI çifti.
3. Makineyi bir sabah kapalı bırak → rozet KIRMIZI "rutin kaçtı" yazmalı.
mobil doğrulama kullanıcıda · i18n ✓ (3 yeni anahtar tr+en)

⏭ HB API: anahtar YOK — başvuru Halil'de (soruldu, cevap bekleniyor).

---

## ✅ K157 — MARJ ŞERHİ RAKAMI KAYNAĞA GÖTÜRÜYOR (İLKE #16) · 04.09.2026 · [KOD KOŞTU]

> **Halil (panel ekran görüntüsüyle):** _"Burada hata ekranı hataya
> gitmeli."_ — "1 satış: ALIM KAYDI YOK" düz metindi; rakam vardı,
> gidilecek yer yoktu. İlke #16'nın birebir vakası.

### ⭐ TASARIM — SAYI = LİSTE, TEK SAHİPTEN

Sınıflandırma bellek-içi (varyantın ilk alımı ↔ satış tarihi), basit
where'e çevrilemez → çözüm KİMLİK KÜMESİ sözleşmesi (süzgeçteki
`supheliIdler` deseninin aynısı):

- `ice-aktarma-serhi` (SAHİP): `marjSiniflandir` çıkarıldı — şerhin
  SAYISI da listenin KÜMESİ de aynı gövdeden. + `MARJ_SEBEPLERI` ·
  `MARJ_PARAM` · `marjSebepAdresi` (İlke #16 ⚠: adres sahibinden) ·
  `marjSebepSatisIdleri` · `marjPencereden` (tek çevirim, off-by-one
  iki yerde iki türlü olmaz).
- `/satislar`: `marjsebep=` paramı → küme sahibinden çözülür →
  `satisKosulu(..., marjIdler)` AND ile. Excel/sayfalama parametre
  taşımasına eklendi.
- `MarjSerhi`: üç sebep satırı da LİNK (İlke #2: noktalı altçizgi);
  "bağlı marj" satırı link DEĞİL (aksaklık değil, bilgi). Şerh artık
  ÇAĞIRAN SAYFANIN PENCERESİNİ sayıyor (29.08 dersinin bu kutuya da
  uygulanışı — iki sayfada da penceresiz çağrılıyordu).

⛔ **VE BİR ÇAKIŞMA ISIRMADAN YAKALANDI:** param adı `marj` OLAMAZDI —
o ad /satislar'da ciro/sermaye ölçü seçici olarak DOLU; çakışsaydı ölçü
seçen kullanıcının listesi sessizce boşalırdı. Ad: `marjsebep`, tek
sabitten (`MARJ_PARAM`) okunuyor.

### BEKÇİ — 252 → 256 · 3 MUTASYON KIRMIZI

İki eski çapa güncellendi (formül sarmalayıcıya taşındı, `s.` öneki —
davranış aynı, ölçüt eskimişti; bekçi susturulmadı). Dört yeni ölçüt:
bileşen adresi sahibinden alıyor · elle `/satislar?` YASAK · sayfa
kümeyi sahibinden çözüp koşula geçiriyor · koşul AND + sahip sabiti.
Mutasyonlar: adresi literale çeviren · kümeyi koşula geçirmeyen ·
AND push'unu kaldıran — üçü de KIRMIZI, bit-bit geri.

### HALİL TEST LİSTESİ (canlı, gerçek cihaz)

1. Panele gir, "Bugün" süzgeci — sarı kutuda "1 satış: ALIM KAYDI YOK"
   satırı artık NOKTALI ALTI ÇİZİLİ. Tıkla.
2. /satislar açılmalı, listede TAM 1 satış olmalı (bugünün alımsız
   satışı) ve sayfa toplamları o 1 satışı göstermeli.
3. Panelde pencereyi değiştir (Son 30 gün) — kutudaki sayı değişirse
   tıklayınca liste de AYNI sayıda satır göstermeli (sayı = liste).
mobil doğrulama kullanıcıda · i18n: ✓ (yeni metin yok) · kullanıcı
kolaylığı: ✓ (#2 #5 #15 #16)

---

## ✅ K156 — TAZMİN 13 YAZILDI + KURAL REVİZYONU: API > LİSTE > ELLE · 04.09.2026 · [KOD KOŞTU]

### ⭐ KURAL REVİZYONU (Halil): "Esasında API daha üstün olmalı"

K155'in "liste her şeyin üstünde" hâli AYNI GÜN revize edildi — satış
değerlerinde sıra: **kanal API'si > liste > elle giriş.** Uygulaması:
dün listeye çekilen 17 fiyattan **API kaynaklı 5'i** API değerine geri
döndürüldü (motorla, izli); Halil _"sen düzelt"_ deyince listenin o 5
hücresi de openpyxl ile düzeltilip **`Satislar_V2 (3).xlsx`** olarak
kaydedildi (orijinal dokunulmadı; her hücrede eski değer assert'lendi).
⭐ (3) ile köprü: **tutar farkı 0** · tek kalan iptalli `4120311526`
(beyanlı). OneBlade testi Halil teyidiyle kesinleşti (iptal edilmişti).

### ⭐ TAZMİN — MOTOR UZANTISI + 13 YENİDEN YAZIM

Motora `tazminatTahsilati` girdisi eklendi (Halil: _"tazmin faturalı →
KDV'li; komisyon/kargo/diğer 0; kâr = tazmin − alış"_):
`TAZMINAT_TAHSILATI` satırı NET-1'e +, faturası kesildiği için
**ödenecek KDV artar** (kalemin KDV oranıyla). Bekçi 102→107 (5 değer
ölçütü) · **2 mutasyon kırmızı kanıtlı** (satırı kaldıran · KDV terimini
kaldıran) · boş girdide eski davranış birebir.

    yazılan 13/13 · hata 0 · STOK 0 ✓ · tahsilat ₺60.462,25
    dünkü 13 sağlam-iade SİLİNDİ (stok yazmadıkları ÖLÇÜLDÜKTEN sonra;
    kimlikleri izde) → hasarlı + tazminatlı yeniden yazıldı
    Compensation SETTLED 13/13 (TY 3 · HB 10) — talepsiz-hasar rozeti sussun
    iade tarafı NET-2 etkisi +₺225,86; kombine okuma Halil formülü:
    kâr ≈ tazmin − alış − tazmin KDV'si (maliyet satırları hasarlıda net-0)

### ⭐ AYRICA BU TURDA (Halil "sen düzelt" + köprü artıkları)

- `10559161422` kalem 0→1 (motor STOK_YETMIYOR → maliyet çifti fallback)
- `4747680294` mükerrer kalem sıfırlandı · `11265267349` ₺0-kalem
  sıfırlandı (hareketsiz — işaretli maliyeti zaten 0'dı)

**V2 BAZ MANDASI KAPANDI:** satış ✓ iade ✓ tazmin ✓ kargo ✓ komisyon ✓
elden ✓ — defter, Halil'in baz dosyalarının kendisi.

---

## 📌 K155 — "LİSTE, SATIŞLARIN FİZİKİ SAYIMIDIR" · DEFTER LİSTEYE HİZALANDI · 04.09.2026 · [KOD KOŞTU]

> **Halil:** _"Nasıl stoklarda fiziki sayım okeyse, şu anda verdiğim
> satışlarda son çalışılan liste — bunu baz al. Bu tarih aralığında
> gerisi umurumda değil."_
> ⭐ KURAL: resmî dönemde (01.08.2025+) satışların son sözü LİSTEDİR —
> sayımın stok için olduğu gibi. Listeyle çelişen defter değeri listeye
> çekilir; listede olmayan elle giriş iptal edilir. Bu beyan, "kanal >
> defter" kaynak sırasının da ÜZERİNDEDİR (kullanıcı ısrarı, izli).

### ⭐ SON KÖPRÜ — SIFIR FARK

    Satislar_V2 (2).xlsx (md5 3a41d5b0…) ₺17.625.773,71
      − 4120311526 (sistemde İPTALLİ; listede hâlâ satış)  −6.499,00
      = PANEL ₺17.619.274,71  ✓ KURUŞUNA
    panelde-var-dosyada-yok 0 · tutar farkı 0 · elden 31.349,00 birebir

### YAPILANLAR (hepsi ekran motorlarıyla ya da beyanlı dar yolla)

1. **17 fiyat hizası** — `duzenlemeUygula` (neden KANAL_FARKI, izli).
   API kuruşları dahil LİSTE kazandı (Halil beyanı; eski gerekçe izde).
2. **Kodsuz OneBlade (03.08, ₺1.649) İPTAL** — `iptalUygula`
   (MAGAZA_DIGER): listede yok + Halil'in test şüphesi.
3. **3 çok-kalemli**, teker teker ölçülüp:
   · `10559161422` kalem2 0→1 (motor STOK_YETMIYOR dedi — Ekim 2025'te
     parti yok; dosya-maliyet çifti fallback, net stok 0, maliyet kalem1
     damgasından)
   · `4747680294` mükerrer kalem2 SIFIRLANDI (ters çift, net stok 0)
   · `11265267349` onarım artığı ₺0-kalem SIFIRLANDI — ⭐ hareket
     YAZILMADI: işaretli maliyeti zaten 0'dı; yazmak kârı şişirirdi.
     _(Panel "adet 6.041"in +1'i buydu.)_
4. Motorun `adet=0` reddi EKRAN kuralı olarak yerinde bırakıldı; sıfırlama
   dar elle-yolla, ters kayıtla, `SATIS_KALEMI_SIFIRLANDI` iziyle.

### ⭐ AYRICA BUGÜN: DOSYA KAZASI YAKALANDI

Halil listeyi güncellerken **03.09.2025** tarihli 9 satır silinmişti
(bir yıl önceki aynı gün — tarih filtresi iki yılı yakaladı, ₺21.410).
Köprü yakaladı, liste verildi, Halil geri ekledi, (2) sürümüyle kapandı.

### ⏭ AÇIK

- TAZMİN 13: motora KDV'li tahsilat satırı + hasarlıya çevirme (Halil
  cevapları alındı: tahsilat = satış fiyatı hücresi, FATURALI/KDV'li).
- `4120311526`: listede TÜR düzeltmesi Halil'de (opsiyonel).

---

## 🔶 K154 — V2 BAZ DOSYALARI: SATIŞ HATTI KAPANDI · İADE/TAZMİN SIRADA · 03.09.2026 · [KISMEN KOŞTU]

> **Halil:** _"Bu verdiklerim son veriler ve AXcali için BAZ sayılmalı;
> stok hariç bütün düzeltmeleri bu verilere göre yap."_ Üç dosya, md5'li:
> `Satislar_V2` `3872cefd…` · `iade_v2` `62eab900…` · `tanzim_v2` `0c325a5a…`
> J/L/M/N/O kolonları da baz: alış · komisyon oranı/tutarı · diğer · KARGO.

### ⭐ SATIŞ HATTI — V2 ↔ DEFTER MUTABIK

    dosya 5.892 sipariş → zaten defterde 5.998 satır · YENI GIREN 13 · ₺36.241
    ters yön: defterde olup V2'de olmayan resmî dönem satışı = yalnız
    BUGÜNÜN 5 API satışı (dosya onlardan önce kaydedilmiş) → çelişki YOK
    maliyet: 13/13 yazıldı (parti dosya-maliyet-v2-20260903) · kâr tazelendi

### ⭐ İKİ MOTOR DÜZELTMESİ (bekçili + mutasyon kanıtlı)

1. **TR metin tarihi:** `"13.08.2025"` yazılmış 8 hücre `OKUNAMADI`
   düşüyordu → tarih kapısına GG.AA.YYYY dalı (taşma korumalı: 31.02
   KAYMAZ, yıl kapıları aynen işler). +4 ölçüt · 2 mutasyon kırmızı ✓
2. **copSku sırası:** "rakamsız SKU = çöp" kontrolü eşleştirmeden ÖNCE
   koşuyordu ve TANIMLI harf-SKU'ları atıyordu (`MTTEFOPTIGRILL` kayıtlıydı,
   satışı 4 kez çöp sayıldı). Sıra düzeltildi: önce eşleştir.

⭐ Halil'in tarih beyanları uygulandı: `11094348152` → 30.03.2026 ·
`11560868627` → 02.09.2026 (API'den zaten girmiş çıktı) — mini dosya +
TEK MOTOR ile. `9548963835` → 11.10.2024: **Halil kararıyla DIŞARIDA**
(resmî sınır öncesi).

### ⏭ HALİL'E MİKRO LİSTE (satış hattının kalanı)

    ① KANAL ÇELİŞKİSİ 8 satır (₺28.510): satır 81 · 1622 · 1715 · 2525 ·
      2781 · 4522 · 4805 · 4885 — etiket TY/HB derken numara öteki kanalın
      biçiminde. PAZAR YERI hücresi mi yanlış, numara mı?
    ② DEPO (elden satış) 9 satır (₺31.349): sipariş no yerine BARKOD
      taşıyorlar (elden satışın numarası yok) ve KDV/stopaj sorusu açık:
      elden satışta stopaj yok — KDV işliyor mu? Cevaba göre kapı açılır.
    ③ Karaca satır 5271: kod hücresi hâlâ boş.

### ⭐ ② İADELER YAZILDI — TARİHSEL KİPLE · 03.09.2026

Motora `stokYazilmaz` kipi eklendi (**5 mutasyon kırmızı kanıtlı**, iade
bekçisi 94→102): para tarafı TAM işler (ciro geri · komisyon geri ·
maliyet geri · stopaj/ödeme gideri iadesi · KDV düzeltmesi), stok HİÇ
oynamaz — 27.08 sayımı son söz. Değişim/yanlış-ürün bu kipte YASAK;
gerekçe zorunlu ve Return.note'a damgalı. İkinci motor AÇILMADI.

    yazılan 199/199 · hata 0 · Return 18 → 217 ✓
    STOK HAREKETİ: 0 ✓  (betik kendisi ölçüyor, 0 değilse kırmızı)
    ⭐ MOTORUN YAZDIĞI NET-2 ETKİSİ: −₺62.052,42
    tarih: 195 V1 "Geldiği Tarih" · 4 satış tarihine geri düşüş (beyanlı)
    kargo: 195 siparişte V1'den (KDV dahil kabul, beyanlı)
    dönem kapısı: GEC_GIRILEN_KAYIT ısrarıyla, iz bırakarak

⚠ **ÖNİZLEME −₺113.378 DEMİŞTİ, MOTOR −₺62.052 YAZDI** — fark sessiz
geçilmedi: önizleme kaba üç terimdi (−ciro+komisyon+maliyet); motor
stopaj/ödeme gideri iadelerini, KDV düzeltmesini ve kargo giderini de
taşıyor. Bağlayıcı rakam MOTORUN; önizleme "yaklaşık" beyanlıydı.

Dışarıda (gerekçeli): `4634137503` sayım SONRASI geliş → stoklu ayrı tur ·
`4775170966` çok kalemli satışta kalem eşleşmedi (Halil'e) · 13 zaten
kayıtlı ✓ · 1 iptalli ✓.

### ⭐ ③ KESİNTİ DOĞRULAMASI + KARGO DOLDURMA · 03.09.2026

**KOMİSYON — V2 İLE MUTABIK.** İlk ölçümde ×2,000 çıktı ve **benim
hatamdı**: `sale.fees` ile `items.fees` AYNI kayıtları veriyor (7.942
kalemin 7.942'si `saleItemId` dolu), iki yoldan toplayınca ikiye
katlanmış. _(Anayasa: "iki okumayla da uyumlu gözlem hiçbirini kanıtlamaz"
— ×2'nin bu kadar düzgün olması işaretti.)_ Tek yoldan: p25–p95 **tam
1,000** · 4.911 kuruşuna tutan · 958'de küçük fark (×0,995–1,020, net
−₺56.165) → haftalık oran değişimi izi, AYRI KALEM.

**KARGO TABANI ÖLÇÜLDÜ:** defter ÷ dosya = **tam 0,833 = 1/1,20** —
defter KDV hariç (bilinen), dosya KDV dahil. Uyuşmazlık DEĞİL.

**KARGO DOLDURMA (canli-kargo-v2-yaz, V2 md5 kilidi):**

    yazılan 602/602 · hata 0 · resmî dönem kargolu satış → 5.880
    dosya ₺69.967,37 (dahil) → deftere ₺58.305,63 (hariç, ÷1,20 ölçülü)
    TY 425 · HB 125 · AMZN 52 · firma kolonu yok → cargoCarrierId null (beyanlı)
    kâr tazeleme motorla · geri alma ölçütü: dosya değeri ÷1,20 kuruş eşleşmesi

### ⭐ ④ HALİL'İN ÜÇ CEVABI UYGULANDI + KOMİSYON DÜZELTMESİ · 03.09.2026

**KOMİSYON:** 655/655 yazıldı, hata 0 — HB Ağu–Ara 2025'in KDV'siz
kalmış komisyonları V2 DAHİL değerine çekildi (+₺53.845 komisyon).
304 desen-dışı satır `raporlar/komisyon-v2-halile.csv`te bekliyor.

**HALİL CEVAP ① "Numara geçerli":** 8 kanal-çelişkili satırın PAZAR YERİ
etiketi numaradan türetildi (mini dosya + TEK motor): 8 satış girdi,
maliyet 7/7 (₺15.009) · kargo 8/8. Karaca (cevap ③ `8683650186700` —
varyant ZATEN tanımlıydı: `axcali2182`) aynı turda girdi.

**HALİL CEVAP ② "Elden satışta KDV işlemez":** DEPO 9 satış
`canli-elden-satis-yaz` ile yazıldı (₺31.349 ciro): `code=null` (elden
satışın sipariş numarası yoktur — kapı notu), `vatRate=0` snapshot,
komisyon 0, stopaj yok (kanal kural kümesi boş, ölçüldü), maliyet J
kolonundan çiftle (net stok 0 ✓). Aktarmanın DEPO kapısı YERİNDE duruyor
— kapının iki gerekçesi bu betikte çözüldü, genel yol hâlâ kapalı.

**İADE ARTIKLARI:** `4634137503` yazıldı (NET-2 −₺171,13 · stok 0) —
meğer sayım SONRASI değilmiş: V1 hücresi `31.12.20.25` YAZIM HATALI ve
metin kıyası onu yanlış kovaya atmıştı; gerçek geliş 31.12.2025, beyanla
düzeltildi. ⭐ Ardından 199 iadenin occurredAt aralığı ölçüldü:
2025-08-15 → 2026-07-28, aralık dışı 0 — bozuk tarih sızmamış.

    resmî dönem artık: kargolu satış 5.888 · iade kaydı 218

### ⏭ SIRADA (V2 baz mandası — kalanlar)


- **TAZMİN 13 — HALİL'İN İKİ CEVABINI BEKLİYOR:** ① tahsil edilen tutar
  hangi kolon ([10] liste mi, KALAN mı)? ② tahsilat KDV'li mi?
  Ölçüldü: `Compensation` modülü yalnız ALACAK takibi — tahsilat NET'e
  HİÇBİR yerden girmiyor; doğru yol iade motoruna tahsilat satırı +
  13 iadenin kalemlerini HASARLI'ya çevirmek (maliyet geri gelmez).
- **KOMİSYON 958 FARKI** (net −₺56.165): kanal/oran kırılımı ölçülecek;
  dosya baz ama fark sistematik mi tekil mi anlaşılmadan yazılmaz.
- **İADE ARTIĞI:** `4634137503` (sayım sonrası, stoklu tur) ·
  `4775170966` (çok kalemli, kalem sorusu Halil'e).

---

## 📌 K153 — RESMİ ÖLÇÜM SINIRI: 01.08.2025 · KULLANICI KARARI 03.09.2026 · [KARAR]

> **Halil:** _"tamam, tüm official ölçümüzü 2025 Ağustos ayının başından
> itibaren alalım."_

### ⭐ SINIR VERİDEN ÇIKTI, UYDURULMADI

Kodsuz satış satırlarının (B sütunu `trendyol`/`hepsiburada`, kod yok) ay
dağılımı ölçüldü:

    2024-06 → 2025-07   1.604 satir · ~₺3,4M   ← karisik donem
    2025-08                 2 satir             ← VERI BURADA DUZELIYOR
    2026                    3 tek satir         ← elle duzeltilecek

⚠ Haziran–Temmuz 2024'ün 111 satırında sipariş numarası da yok — hiçbir
yöntemle giremezler.

### KARARIN ANLAMI

- **Ağustos 2025'ten bugüne rakamlar RESMİDİR** — satışlar defterle
  %99,7 kuruşuna mutabık (K152 sonrası).
- **Öncesi KISMİDİR ve öyle beyan edilir:** kodlu olan her eski satış
  girdi ve DOĞRU (silinmez, dursun); kodsuz ₺3,4M dosyada var, deftere
  bağlanamaz. _Rakam kaybolmadı, kayda geçti._
- **Ad eşleştirmesiyle zorla bağlama YAPILMADI** — gerekçe: benzer ad
  aynı kimlik değildir; yanlış bağ doğru ürünün kâr geçmişini kirletir.
  **Yanlış veri, eksik veriden tehlikelidir.**

### ⭐ STOK TARAFI ÖLÇÜLDÜ — HALİL'İN BEYANI %99,94 DOĞRU

> **Halil:** _"Stok kısmı sorunsuz çünkü 2025 Ağustos'tan önce giren
> hiçbir aktif stok yok."_

Ölçüldü (03.09.2026): 01.08.2025 öncesine damgalı **1.700 partinin
1.699'u tamamen tükenmiş.** Tek istisna, beyanlı:

    axcali2523 · Imaginext DC Batglider · parti 15.03.2025 · kalan 1 · ₺689

Yani aktif stoğun tamamı (bir adet hariç) resmî dönemin malı — sınır
stok tarafında da temiz.

### ⏭ AÇIK UÇLAR

1. **3 tek satır** Halil'de: Karaca (satır 9525, sip 11359141121) +
   2026-02 (₺9.100) + 2026-03 (₺9.984) — kod yazılınca resmî dönem %100.
2. Halil bugünkü satışlarla güncel satış dosyası + **temiz alış listesi**
   verecek (alış listesinde İADE KOLONU kalmalı).
3. Pazaryeri iade listeleri bekleniyor (K: iade şişkinliği ~₺118K).

⚠ **AÇILIŞ ŞARTI:** Halil eski kütleyi (2024-06→2025-07 kodsuz) elle
eşleştirmek isterse bu kalem yeniden açılır; öneri listesi çıkarılmıştı.

---

## ✅ K152 — "HEPSİNİ İÇERİ AL": 724 ÜRÜN + 1.889 SATIŞ + MALİYETLERİ · 03.09.2026 · [KOD KOŞTU]

> **Halil:** _"satış listesini tekrar veriyorum … kontrol et ve HEPSİNİ
> içeri al."_ Dosya: `Guncel Satislar..xlsx` · md5 `78f40868…` (her adım
> bu kimliğe kilitli — K151 dersinin ilk uygulaması).

### ⭐ ÜÇ ADIM, ÜÇÜ DE SAYIMLA DOĞRULANDI

    ① URUN TANIMI   724 urun · hata 0 · Product 1103→1827 ✓
       EAN → barcode · kanal kodu (HBCV/TYBA/ENT) → sku · kategori BOS
       (KDV cozumu anayasa sirasiyla %20) · parti urun-tanim-20260903
    ② SATIS         1.889 satis · 1.916 kalem · ₺4.778.657,32
       Sale 5919→7808 ✓ · StockMovement 10844→10844 (STOK OYNAMADI) ✓
       eslesmeyenListing 1918 → 1 · parti satis-20260903133148
    ③ MALIYET       1.912 kalem · ₺3.326.074,07 · hata 0 · NET STOK 0 ✓
       kar tazelendi 1885/1885 · parti dosya-maliyet-20260903

### ⭐ SONUÇ — YENİ GİREN SATIŞLARIN DEFTERİ

    ciro   ₺4.768.583,32       NET-1  ₺841.242,89      NET-2  ₺694.412,71
    2024:  799 satis · ₺1,74M ciro     2025: 972 · ₺2,48M     2026: 114 · ₺0,54M

⚠ **KDV alım tabanına GİRMEDİ** — maliyet partisi belge üretmez (fatura
yok); 28.08 kararının aynısı. ⚠ Maliyet tabanı VARSAYILMADI, ölçüldü:
damgalı 3.422 kalemde FIFO ÷ dosya = p50 tam 1,000 (%90,3 birebir).

### 📏 DOSYADAN GİREMEYENLER — SEBEBİYLE, KAYITLI

    kodu kullanilamaz (barkod hucresi "trendyol" vb.)  ~1.491+ satir  → ad eslestirmesi gerekli
    siparis numarasi BOS                                 381 satir · ₺859.182
    komisyon orani bos 2 · kanal celiskisi 8 · tarih bozuk ~8 (2027/2029 yazimlari)
    maliyeti dosyada olmayan 4 kalem → NO_COST (uydurulmadi)

### ⭐ AKTARMA DÜZELTMESİ
Başlık satırı sabit `data[5]` yerine **aranıyor** — eski dışa aktarım 6.
satırda, yenisi 1. satırda; sabit indeks "KOLON BULUNAMADI" veriyordu.

---

## ⛔ K151 — GERİ ÇEKİLDİ · RAKAMLARIM YANLIŞ DOSYADAN ÇIKMIŞTI · 03.09.2026 · [DÜZELTİLDİ]

> **Halil:** _"sana alım dosyası, satış dosyası ve iade dosyasını verdim.
> Ayrıca stok istedin saydım. Bunların bu kadar yanlış vermesi mümkün
> değil."_ — **Haklıydı. Hata bendeydi.**

### ⛔ GERİ ÇEKİLEN İKİ RAKAM — SİLİNMİYOR, NİYE YANLIŞ OLDUĞUYLA DURUYOR

    ⛔ "39 satir eksik · ₺190.189,01"      GECERSIZ
    ⛔ "toplam fark ₺1.047.781,07 (%9,49)" GECERSIZ

**Sebep tek ve basit: YANLIŞ DOSYAYLA KIYASLADIM.**

| | içe aktarılan | benim kıyasladığım |
|---|---|---|
| dosya | `alislar (5).xlsx` | `Alımlar.xlsx` |
| md5 | `b4ccfd3b0e99388a2ed0780c2770dcc6` | başka |
| satır | 2283 | 2156 |
| sayfa | **ALIŞLAR** | Sayfa1 |
| kolonlar | + `Fatura` · `Envantere İşlendimi` · **`İade`** | bunlar YOK |

İçe aktarma iade edilmiş alımı **bilerek atıyor**
(`canli-alis-ice-aktar.ts:260`). Benim kıyasladığım dışa aktarımda o kolon
olmadığı için **iadeleri de "eksik" diye saydım.**

### ⭐ DOĞRU ÖLÇÜM — ELMA ↔ ELMA (gerçek kaynak, md5 doğrulandı)

    dosyada GECERLI   1952 satir · 4109 adet · ₺9.841.960,22
    defterde          2025 kalem · 4218 adet · ₺9.993.538,82
    fark               +109 adet · +₺151.578,60   (%+1,54)

⭐ **DEFTER DOSYADAN EKSİK DEĞİL, FAZLA.** İçe aktarma hiçbir satır
kaybetmemiş. _(Fazlalık meşru: elle girilen alımlar ve düzeltmeler —
ör. `ALM-HB-260216-03` maliyet düzeltmesi.)_

### 📏 DIŞARIDA KALANLAR — SİSTEM ZATEN SAYIYOR VE SEBEBİNİ YAZIYOR

    iadeli             106 satir · 245 adet · ₺707.278,32   ✓ DOGRU atiliyor
    eslesmeyenBarkod   140 satir · 303 adet · ₺967.339,43   ⚠ urun TANIMLI DEGIL
    barkodsuz           82 satir · 155 adet · ₺397.271,49   ⚠ dosyada barkod BOS
    adetSifir            3 satir ·   0 adet · ₺        0,00

⚠ **Kayıp veri DEĞİL — ürün tanımı bekleyen satırlar.** Tanım açılınca bir
sonraki aktarma onları alır. En büyükleri: Philips Lumea 9900 (₺98.631) ·
Bissell Spotclean (₺62.944) · DJI Mini 4K (₺36.000). Bir satırda barkod
hücresine **"İSTANBUL"** yazılmış (Xiaomi 15T Pro, ₺42.999) — dosya hatası.

⭐ **AÇIK OLAN GERÇEK KALEM:** `eslesmeyenBarkod` + `barkodsuz` =
**₺1.364.610,92** alım KDV indirim tabanına hiç girmemiş. Sistem bunu
biliyor, **ekranda söylemiyor.**

### ⛔ DERS — CEVAP SİSTEMİN KENDİ İZİNDEYDİ, BEN SORMADIM

`AuditLog → ALIS_ICE_AKTARMA` her koşumda şunu yazıyor: dosya adı · md5 ·
satır sayısı · **hangi satır hangi sebeple elendi**. Ben bu izi okumadan
Halil'in elindeki dışa aktarımla **dört tur** ölçüm yaptım.

> **KURAL:** dış bir dosya ile defter kıyaslanmadan önce **sistemin o
> dosyayı nasıl okuduğu kendi izinden doğrulanır** — dosya kimliği (md5)
> dahil. İzde yazan dosya ile elimdeki dosya aynı değilse kıyas
> **KURULMAZ**, çünkü çıkacak sayı fark değil **kapsam boşluğudur.**

⚠ **VE AYNI TURDA ÜÇ HATA DAHA, HEPSİ AYNI KÖKTEN** — _ölçmeden önce
neyin üstünde ölçtüğümü doğrulamamak_:

| # | hata | kök |
|---|---|---|
| 1 | NET-2 düşüşü ₺11.143 dedim, ₺9.286 çıktı | maliyetin KDV DAHİL olduğunu sormadım |
| 2 | "5 satış zarara düşecek" — hiçbiri düşmedi | aynı kök |
| 3 | "Korbell'in varyantı yok" — VARDI | ad araması `0` döndü, "yok" diye okudum |
| 4 | ₺502.870,72 — %55'i yanlış pozitif | sipariş nosunu anahtar sanmıştım |

⭐ **HALİL'İN ELİNE VERİLEN CÜMLE (kullanıcı kararı 03.09.2026):** bir rakam
sunulduğunda sorulacak soru —
**_"bunu neyin üstünde ölçtün, ve o kaynağı sistemin kendi izinden mi
doğruladın?"_**
Cevapta md5 / iz kaydı / betik adı geçmiyorsa rakam ham tahmindir.

### ⏭ AÇIK — HALİL'İN KARARINI BEKLİYOR

**"Son içe aktarma" ekranı:** hangi dosya · kaç satır girdi · kaç satır
hangi sebeple girmedi · o satırların listesi. İz bugün `AuditLog`'un içine
gömülü; ne Halil görüyor ne ben bakmayı hatırlıyorum.
~~⛔ Onay alınmadan açılmaz.~~

⭐ **ONAY GELDİ (Halil, 07.09.2026): _"Ekran yap"_ — YAPILACAK.**
Niye gerekli, bugünkü kanıtıyla: `₺1.364.610,92` tutarında alım barkod
eşleşmediği için KDV indirim tabanına HİÇ girmemiş ve bunu **hiçbir ekran
söylemiyor**. İz `AuditLog`ın içinde duruyor ama kimse bakmıyor —
görünmeyen bir iz, olmayan bir izdir.

---


## 🚨 K149 — MUTASYON KALINTISI ÜRETİME SIZDI · 03.09.2026 · [KAPI KURULDU]

⛔ **CANLIYA BOZUK KOD GİTTİ VE TUR YEŞİL YANDI.**

K148 commit'i (`1213c2e`) `src/lib/panel.ts`te şunu taşıyordu:

    - kanallariSirala([...kanallar.values()], kanalKipi)
    + [...kanallar.values()].sort((a, b) => b.gelir - a.gelir)

K106'da sabitlenen kanal sırası (TY · HB · N11 · Amazon · Elden) canlıda
**ciro sırasına döndü.** Düzeltme: `9c76dcb`.

### ⛔ SIRA ÖLÇÜLDÜ — VE HATA BEKÇİDE DEĞİL

    ① harness panel.ts'i mutasyona uğrattı
    ② `git add -A && commit`  → MUTASYON COMMIT'E GİRDİ
    ③ harness dosyayı geri yazdı
    ④ push bekçi turunu koştu → ÇALIŞMA AĞACI temizdi → YEŞİL
    ⑤ push geçti, BOZUK COMMIT gitti

⭐ **VE BEKÇİ KUSURSUZDU.** `panel-dogrula.ts:5007` hem çağrıyı arıyor
(`/const liste = kanallariSirala\(/`) hem eski sıralamayı **açıkça
yasaklıyor**. İkisi de mutasyonda kırmızı yanardı.

⛔ **ÖLÇÜM DOĞRUYDU — YANLIŞ ŞEYİ ÖLÇTÜ.** Tur çalışma ağacını okuyor,
giden commit'i DEĞİL. _(Anayasa: "ölçüm ile karar arasındaki boru da
ölçümün parçasıdır" — orada `| tail` ve `echo` yutuyordu, burada zamanlama.)_

### ⭐ KAPI KURULDU — `.githooks/pre-push`

Turdan ÖNCE, bekçilerin okuduğu dizinlerde çalışma ağacı ↔ HEAD ayrışması
aranıyor. Ayrışma varsa tur gidenden BAŞKA bir şeyi ölçecek demektir ve
push **DURUR**.

    OLCULEN="src scripts prisma messages package.json"
    git diff --name-only HEAD -- $OLCULEN   →  boş değilse çıkış 1

⚠ **KAPSAM BİLEREK DAR:** yalnız bekçilerin okuduğu dizinler. Başka yerdeki
yarım iş push'u durdurmaz — yanlış yere konan kapı, aşılmak için bahane
üretir.

✓ **İKİ YÖN DE SINANDI:** `src/` altında kirli dosya → **çıkış 1, DURDU**;
temiz ağaç → **çıkış 0, GEÇTİ**; geri yazma bit-bit doğrulandı.

### ⏭ VE İKİ DAVRANIŞ KURALI

1. ⛔ **Mutasyon turu koşarken `git add -A` YAPILMAZ.** Harness'in geri
   yazması commit ile yarışıyor ve bu turda yarışı harness kaybetti.
2. ⛔ **Commit öncesi `git status` OKUNUR** — beklenmeyen bir `src/`
   dosyası varsa commit DURUR. Bu turda beklenen liste pano + betiklerdi;
   `panel.ts` orada yoktu ve gözden kaçtı.

---

## ✅ K148 — 14.08 TEST KAYITLARI NÖTRLENDİ · DAR İSTİSNA · 03.09.2026 · [KOD KOŞTU]

> **Halil:** _"bu alım kesin yok, bu test alımı"_ · _"KDV'ye etki etmeyecek
> şekilde her şeye etkisinin sıfır olacağı şekle çevirebilir miyiz. Bu bir
> istisna olur."_

Araç: `npm run canli:test-kaydi-notrle` — kimliğe kilitli, vaka bazlı.

### ⭐ ÖLÇÜLDÜ: NEREDEYSE HER ŞEY ZATEN SIFIRDI

    axcali1603   ledger 0 · FIFO açık 0 · UYUYOR
    axcali1752   ledger 0 · FIFO açık 0 · UYUYOR
    test iadesi  NET-1 0 · NET-2 0
    kesintileri  MALIYET_GERI +1.438,99 · DEGISIM_MALIYET −1.438,99 → 0
    bağlı GERÇEK satış 11502693455 · iade ona DOKUNMUYOR

⛔ **SIFIR OLMAYAN TEK ŞEY:** alım, ağustos toplamına ₺2.048 katıyordu ve o
toplam **KDV takibinin tabanı**. Düzeltilen yalnızca bu.

    ağustos alım  ₺607.564,12 → ₺605.516,12   (−₺2.048,00)

### ⛔ VE UYGULAMANIN KENDİ KAPISI BUNU REDDEDİYORDU

    alimlar/actions.ts:479
      if (toplamGelen > 0) return { hatalar: [t("iptalEdilemez")] };

⭐ **KAPI HAKLI — AMA KAPSAMI DIŞINDAYIZ.** "Malı gelmiş alım iptal
edilemez" kuralı, deftere girmiş gerçek bir hareketi dayanaksız bırakmamak
için var. Burada mal ZATEN GELMEDİ: kayıt testti ve stok etkisi 27.08
sayımıyla sıfırlandı. _(Anayasa: "ilke, kendi kapsamının dışına
uygulanırsa hatayı korur".)_

### ⛔ İADE SİLİNMEDİ — ÖLÇÜLDÜ, VARSAYILMADI

Şema silme kuralları:

    Return → ReturnItem        : Cascade  (kalemler silinir)
    StockMovement.returnItemId : SetNull  ⛔ 4 HAREKET SAHİPSİZ KALIR
    ReturnNotice.returnId      : SetNull  ⛔ bildirim sahipsiz kalır

Silmek, **görünen bir test kaydını görünmeyen bozuk veriye** çevirirdi —
`sfsfsf` satış silme vakasının aynısı. Ve iadenin parasal etkisi zaten
sıfır; silinecek bir etki yok.
⭐ Bu yüzden iade **BEYAN EDİLDİ**: notuna test olduğu yazıldı, listede
öyle görünüyor. Görünür test kaydı, görünmez bozuk veriden iyidir.

### ⛔ HİÇBİR STOK HAREKETİNE DOKUNULMADI

`PURCHASE_IN +1` deftere girmiş bir olaydır; 29.08 sayım düzeltmesi onu
zaten götürmüş. Ters kayıt yazmak stoğu **−1**'e düşürürdü.
⭐ Ölçüldü: FIFO alım durumuna BAKMIYOR (`lib/stok.ts`), o yüzden
`CANCELLED` parti zincirini bozmuyor — parti zaten kapalı.

### ✅ DOĞRULAMA — YAZIM SONRASI

    alım durumu CANCELLED ✓ · alım beyanı ✓ · iade beyanı ✓
    stok hareketi 1/1 ✓ DOKUNULMADI
    axcali1603 ledger 0 · FIFO 0 · UYUYOR ✓
    axcali1752 ledger 0 · FIFO 0 · UYUYOR ✓
    bağlı gerçek satış 11502693455 NET-2 189,265 — DEĞİŞMEDİ ✓
    test partisini yiyen 11396146008 NET-2 69,36 — DEĞİŞMEDİ ✓
    ⭐ tekrar koşulabilir: ikinci koşum "ZATEN İPTALLİ" der

⚠ **METADATA İSTİSNASININ ÜÇ ŞARTI SAĞLANDI:** ① değişen alan miktar/para
DEĞİL (`status` + `note`) · ② alternatifler ölçülüp elendi · ③ iz eski
değerle birlikte (`TEST_KAYDI_NOTRLENDI`).

---

## 🚨 K147 — DÖRT ŞÜPHELİ ALIM FATURAYLA SINANDI · 03.09.2026 · [ÜÇÜ KAPANDI · KARIŞMA ÖLÇÜLDÜ]

K145'in bulduğu dört "kardeş parti sapması" Halil'in faturalarıyla teker
teker sınandı. **Dördünden yalnız biri gerçek fiyat hatasıydı** — ve
beşincisi, hiç beklenmeyen bir kusur çıktı.

| # | alım | ölçüm | FATURA NE DEDİ | sonuç |
|---|---|---|---|---|
| ① | `ALM-HB-260216-03` | 14,21× | x2 · ₺1.598 → birim **₺799** | ✅ **DÜZELTİLDİ** (K146) |
| ② | `ALM-HB-260427-07` | 2,00× | **₺1.500 DOĞRU** — Halil alış hesabını düzeltmiş | ✅ **KAPANDI, hata yok** |
| ③ | `ALM-BI-260814-01/02` | 1,84× | ⛔ **SAHTE POZİTİF** — `-01` İPTALLİ | ✅ **KAPANDI, ölçüt düzeltildi** |
| ④ | `ALM-AMZ-260101-07` | 3,11× | ⛔ fiyat değil **ÜRÜN KARIŞMASI** | 📏 **ÖLÇÜLDÜ — 2 hasar** |

### ⛔ ③ SAHTE POZİTİF — TARAMAM İPTALLİ ALIMI ELEMİYORDU

    ALM-BI-260814-01   ₺1.111,00   ⛔ İPTAL
    ALM-BI-260814-02   ₺2.048,00   ✓ teslim alındı

Ortada fiyat farkı YOK; iptal edilmiş bir kayıt var. Halil ekranda gördü:
_"böyle bir alım bulamadım, test olabilir mi."_
_(Anayasa: "kayıp abartısı, kayıp küçültmesi kadar yanlıştır — bir kayıp
rakamı yazarken sorulur: bu sayının içinde KAYBETMEYEN kayıt var mı?")_

⭐ **ÇARE GEÇİCİ BETİK DEĞİL, KALICI ÖLÇÜT:** ilk tarama tek seferlik bir
betikteydi ve kusuru onunla birlikte kayboldu.
`npm run canli:kardes-parti-sapmasi` yazıldı —
`status notIn [CANCELLED, DRAFT]`, gruplama tedarikçiyi de içeriyor,
dağılım HER KOŞUMDA basılıyor ve **eşiğin hâlâ gedikte olduğu ölçülüyor**.

### 🚨 ④ `ALM-AMZ-260101-07` — FİYAT HATASI DEĞİL, ÜRÜN KARIŞMASI

Halil Amazon faturasını gönderdi: sipariş `406-5483511-3513154` ·
LEGO Çiçekli Pikap 31172 · **5 adet × ₺1.399 = ₺6.995** (Genel Toplamla
birebir). Ve haklı olarak sordu: _"benim listemde doğru, sen nasıl yanlış
çektin kaynaktan?"_

⭐ **ÇEKMEDİM — KAYNAKTA GERÇEKTEN ₺450,35 VAR.** `Alımlar.xlsx` üç satırda
o fiyatı taşıyor (539 · 542 · 546) ve o satırlar **BAŞKA BİR ÜRÜN**:

    Ürün Adı : LEGO Marvel Iron Man Hulkbuster Thanos'a Karşı 76263
    Fiyatı   : 450,35    Adet: 5    Toplam: 2.251,75
    Barkod   : 5702017419794 / 5702017835990

Çiçekli Pikap dosyada **11 satırda geçiyor ve hepsi 1399**.
01.01.2026'da Amazon'dan **dört ayrı ürün** alınmış:

    Hulkbuster 76263        450,35   3 satır
    Çiçekli Pikap 31172   1.399,00   2 satır
    Porsche 911 GT3 RS    1.160,95   2 satır
    Cookplus Pamuk Şeker  2.073,99   1 satır

⛔ **AMA SİSTEMDE `-03` · `-05` · `-07` ÜÇÜ DE `axcali2110` (Çiçekli
Pikap).** Yani içe aktarma **Hulkbuster satırını Çiçekli Pikap varyantına
bağlamış.**

⛔ **VE BU YÜZDEN FİYAT DÜZELTİLMEDİ.** ₺1.399 yazsaydım ortaya
_"1.399'a alınmış bir Çiçekli Pikap"_ çıkardı; oysa o siparişte Hulkbuster
alınmış. Yanlış kaydı **doğru görünen** bir kayda çevirmek olurdu.
_(Anayasa: "imkânsız görünen değer önce doğrulanır — düzeltilmez"; burada
doğrulama fiyatı değil ÜRÜNÜ çürüttü.)_

### ✅ ÖLÇÜLDÜ · 03.09.2026 — İÇE AKTARMA DOĞRU, KAYNAK DOSYA YANLIŞ

⭐ **KORKULAN ŞEY ÇIKMADI.** 01.01.2026'nın **yedi alımından altısı doğru**
eşleşmiş. İçe aktarma **BARKODLA** eşleştiriyor ve doğrusu da o.

    -01  402-7378419-2515516  axcali2280  brk 5702017419794  Hulkbuster    ✓
    -03  402-2789363-4803560  axcali2110  brk 5702017835990  Çiçekli Pikap ✓
    -04  406-1628311-8913918  axcali2280  brk 5702017419794  Hulkbuster    ✓
    -05  406-5483511-3513154  axcali2110  brk 5702017835990  Çiçekli Pikap ✓
    -07  sipariş no BOŞ       axcali2110  brk 5702017835990  ⛔ KARIŞIK

⛔ **HATA TEK HÜCREDE:** `Alımlar.xlsx` satır **546**'nın ürün adı
_"LEGO Marvel Iron Man Hulkbuster 76263"_ ama **barkodu Çiçekli
Pikap'ınki** (`5702017835990`). Aynı ürünün öteki beş satırı
(330 · 331 · 338 · 539 · 542) doğru barkodu taşıyor (`5702017419794`).
İçe aktarma barkoda güvendi ve **doğru davrandı.**

### 📏 KAPSAM ÖLÇÜLDÜ — 7 ÇELİŞKİ, AMA YALNIZ 2 GERÇEK HASAR

Ölçüt: **aynı ürün adı, birden çok barkod** (880 farklı ürün adı tarandı).
Liste: `raporlar/barkod-celiskisi.csv`

| ürün | çoğunluk | azınlık | sistemde ne oldu |
|---|---|---|---|
| LEGO Hulkbuster 76263 | 5 satır | **1** | ⛔ `axcali2110`'a (Çiçekli Pikap) bağlandı |
| Karaca Maestrochef Stella | 1 | **1** | ⛔ `axcali2093`'e (**Dreame ROBOT SÜPÜRGE**) bağlandı |
| Stanley IceFlow | 2 | 1 | ✓ `axcali3015` (Lilac) — ayrı renk, MEŞRU görünüyor |
| Korbell Çöp Kovası | 11 | 4 | ⚠ İKİ barkodun da varyantı YOK |
| Grundig HD 6481 | 8 | 1 | ⚠ azınlık barkodun varyantı yok |
| JBL Charge6 | 2 | 1 | ⚠ azınlık barkodun varyantı yok |
| Anker Soundcore C40i | 1 | 1 | ⚠ birinin varyantı yok |

⛔ **İKİNCİ HASAR YENİ BULUNDU — `ALM-HB-260107-05`:**

    axcali2093 · Dreame Robot Süpürge D9 Max · 3 alım
       07.01.2026  ALM-HB-260107-05  x2 · ₺4.299,00   ⛔ bu Karaca MİKSER satırı
       09.01.2026  ALM-HB-260109-03  x1 · ₺7.499,00   ✓
       09.01.2026  ALM-HB-260109-04  x1 · ₺7.499,00   ✓

Robot süpürgenin öteki iki alımı ₺7.499; ₺4.299 mikserin fiyatı. Gerçek
Maestrochef varyantı (`axcali3104`) sistemde AYRI duruyor.

⚠ **VE 109 BARKOD BİRDEN ÇOK AD TAŞIYOR — AMA ÇOĞU MASUM:** aynı ürünün
farklı yazılışı (_"Philips OneBlade 2'li Yedek Bıçak"_ ↔ _"QP220/51"_).
Bu yön hasar üretmiyor; barkod aynıysa varyant da aynı.

### ⏭ HALİL'E — HANGİ BARKOD DOĞRU

⛔ **HİÇBİR ŞEY YAZILMADI.** İki hasarın düzeltilmesi için önce hangi
barkodun doğru olduğu söylenmeli; sonra o alımlar doğru varyanta taşınır.
⚠ Taşıma basit bir fiyat düzeltmesi DEĞİL: alım kalemi + parti hareketi +
o partiden yemiş çıkışlar birlikte gider (K146'daki üç yer kuralı).

⏭ **AYRI KALEM:** barkodu hiç eşleşmeyen satırlar (Korbell 15 satır dahil)
sisteme girmiş mi, girdiyse nasıl eşleşmiş — bugün açılmadı.
⛔ "Ölçülemedi" ile "temiz" AYNI ŞEY DEĞİLDİR ve öyle yazıyor.

---

## ✅ K146 — 19 KARGO + BIÇAK MALİYETİ YAZILDI · NET TAZELENDİ · 03.09.2026 · [KOD KOŞTU]

### ⭐ ① 19 SATIŞIN KARGOSU — HALİL DOLDURDU, YAZILDI

K75'in kalıntısıydı: satış dosyasında kargo satırı YOKTU, toplu yazım
yasaktı. Halil listeyi indirdi, **19/19'unu elle doldurdu** (tutar + firma).

    yazılan 19/19 · ₺2.368,61 (KDV hariç) · KDV ₺473,72
    firma da yazıldı: 15 Aras Kargo · 4 hepsiJET

⭐ **TABAN ÖLÇÜLDÜ, VARSAYILMADI:** dosyada `₺101` ALTI kez geçiyor ve
`101 ÷ 1,20 = 84,17` — defterde `4120311526`ın kargosu tam **84,17**.
Yani dosya KDV DAHİL; yazarken 1,20'ye bölündü.

⛔ **VE BİR KİMLİK KAYBI YAKALANDI:** Excel `0681327845`in **baştaki
sıfırını sildi**, dosyaya `681327845` diye geldi ve ilk koşumda "defterde
YOK" düştü. Sıfır dolgusu eklendi, denendiği EKRANDA yazıyor. 18 → 19/19.

### ⭐ ② BIÇAK MALİYETİ — FATURA TEYİDİYLE DÜZELTİLDİ

Halil'in HB faturası: sipariş `479 182 345 7` · 16.02.2026 · **x2 ·
1.598,00 TL**. Beyanı: _"Ben Excel listesine yanlış girmişim."_

    ESKİ 7.641,50/adet (toplam 15.283,00)
    YENİ   799,00/adet (toplam  1.598,00)

⭐ **BAĞIMSIZ TEYİT:** kardeş parti oranı **14,21× → 1,49×**. K145
bekçisinin eşiği `1,5×` ve düzeltilmiş değer tam altına oturuyor. Öteki
okuma (₺1.598/adet) olsaydı `2,97×` kalır, hâlâ şüpheli çıkardı.
⚠ Betik birim/toplam ayrımına KARAR VERMEZ: `--toplam=` ya da `--birim=`
açıkça istenir, varsayılan YOKTUR. _(TY `price` vakasında bu ayrım yanlış
yapılmıştı.)_

⚠ **DÜZELTME ÜÇ YERE BİRDEN GİTTİ:** `PurchaseItem` · `PURCHASE_IN`
damgası · o partiden yemiş **ÇIKIŞ** damgaları (kâr motoru maliyeti
oradan okur). Doğrulama 3/3.

### ⛔ ③ VE `canli:kar-tazele` BU 21 SATIŞI GÖRMÜYORDU

Yazımdan sonra `canli:kar-tazele` koşuldu ve **beş** satış buldu —
**hiçbiri bu 21'den değildi.** Bıçak satışları hâlâ NET-2 −5.296,15
gösteriyordu, maliyet ₺799'a düşmüş olmasına rağmen.

⭐ **SEBEP KAPSAM:** o betik _"adet düzenlemesinden etkilenen satışlar"_
için yazılmış — damga ile defterin AYRIŞTIĞI satırları arıyor. Girdi
değiştiğinde ayrışma OLMAZ: defter de damga da tutarlıdır, yalnız ikisi
de ESKİ girdiyle hesaplanmıştır.
_(Anayasa: "düzeltme yolu, TÜM OKUYUCULARA ulaştığı ölçülmeden 'var'
sayılmaz" — okuyucu vardı, kapsamı dardı.)_

⭐ **ÇARE — `canli:net-tazele`:** ekranın çağrısının aynısını kullanır
(`karYenidenYaz`, `satislar/[id]/hesap-actions.ts`ten). İkinci bir hesap
yazılsaydı aynı satış iki yoldan iki türlü hesaplanırdı.

    tazelenen 21/21 · doğrulama 21/21 · ikinci koşum 0/21 (kalıcı)

    kargo 19 satış   NET-2  −2.368,58
    bıçak  2 satış   NET-2 +11.404,16   (−5.296,15 → +405,93, her biri)
    ⭐ TOPLAM ETKİ            +9.035,58

### ⛔ VE İKİ KUSUR ÇIKTI — İKİSİ DE KOŞARKEN YAKALANDI

**① `--iz` konum argümanlarını EZİYORDU.** 21 satış istendi, 19'u koştu ve
iki bıçak satışı **sessizce düştü**. `hedefKodlar = ...` yerine birleşim
yazıldı ve ekranda `iz 19 · komut satırından 2 · BİRLEŞİK 21` diye
yazıyor.

**② ÇİFT KOŞUM — VE SEBEBİ AÇIKLANDI.** `KARGO_ELLE_YAZILDI` izi **28**
kayıt gösterdi (19 benzersiz, 9'u iki kez), hepsi 08:04:16–08:04:30
arasında. Sebep: **Halil kendi PowerShell'inde koşarken ben de koştum.**
⭐ Zarar YOK ve bu tesadüf değil TASARIM: `cargoAmount` MUTLAK alan
(üzerine yazar), ikinci koşum kargosu olanı zaten atlıyor. **19/19 değer
ayrıca doğrulandı** — hiçbiri iki katına çıkmamış.
⚠ Tek gerçek kayıp: anlık görüntü dosyasının adı sabit olduğu için ikinci
koşum birincininkini EZDİ (9 satırlık görüntü kaldı). `net-tazele`de
dosya adına damga kondu; kargo betiğinde **açık kalem**.

---

## ✅ K138 — PANO YAZIMI "BEKLİYOR" DERKEN KOŞMUŞTU · BEKÇİ 03.09.2026 · [KOD KOŞTU]

⛔ **BEŞ GÜN SESSİZ KALDI VE BUGÜN YANLIŞ BİLGİ ÜRETTİ.**

K75 satırı `[ÖLÇÜLDÜ, YAZIM ONAY BEKLİYOR]` diyordu; aynı panoda birkaç yüz
satır aşağıda `✅ KARGO YAZILDI · 28.08.2026 · [KOŞTU]` kaydı duruyordu.
Ben panonun ilk yarısını okuyup kullanıcıya şunu söyledim:

> _"5583 siparişte kargo gideri düşülmemiş, kârlar olduğundan yüksek."_

**Yanlıştı.** Kullanıcı düzeltti: _"nasıl düşmemiş kargo, hesaplarda
görünüyor."_ Deftere sorunca çıktı:

    cargoAmount DOLU 5806/5903  ·  toplam ₺583.497,58
    iz: KARGO_DOSYADAN_YAZILDI · 28.08.2026 16:48:59

⛔ **BEDELİ:** defterin ₺557 bin yanlış olduğu iddiası. Muhasebeciye
gitseydi ya da bir karar verilseydi, o karar yanlış rakama dayanacaktı.

### ⭐ KÖK — KURAL VARDI, BEKÇİSİ YOKTU

Anayasada bu tuzağın maddesi **20.08'den beri yazılı**: _"pano, işin
DURUMUNU değil NİYETİNİ kaydederse kurgu üretir."_ Ama `pano:dogrula`
durum tutarlılığına **hiç bakmıyor** (ölçüldü).

⚠ **VE İLK TARAMAM DA KÖR ÇIKTI:** "bekliyor" etiketli kalemle "[KOŞTU]"
etiketli kalemde aynı betiği arayan bir tarama yazdım, **0 çelişki** dedi.
Sebep: K75'in `[KOŞTU 28.08.2026]` alt başlığı **kendi içinde**, bir
seviye aşağıda — bölme onu ayrı kalem saydı.

### ✅ BEKÇİ YAZILDI · 03.09.2026 — VE İKİ VAKA DAHA BULDU

⭐ **ÖLÇÜT "YAN YANA OLMASIN" DEĞİL, "BAŞLIK DOĞRUYU SÖYLESİN".** Bir
kalemin bir parçasının koşup ötekinin beklemesi MEŞRUDUR (K74: maliyetler
yazıldı, ②④⑨ onay bekliyor). Yasaklanan şey bu değil — yasaklanan,
başlığın **yalnız bekleyeni söyleyip koşanı gizlemesi.**

📏 **ÖLÇÜLDÜ (61 kalem):** "bekliyor" başlıklı **3** kalemin **2'sinde**
gövdede `[KOŞTU]` alt başlığı vardı ve **ikisi de gerçek kusurdu.**
Sahte pozitif: 0.

    K83  [KURU KOŞUM, YAZIM ONAY BEKLİYOR]
         ### ✅ YAZILDI [KOŞTU 29.08.2026] — 181 hareket   ⛔ BAŞLIK YALAN
    K74  [ÖLÇÜLDÜ, YAZIM ONAY BEKLİYOR]
         ### ✅ K74 MALİYETLERİ YAZILDI [KOŞTU]            ⛔ yarısı gizli

İkisinin de başlığı düzeltildi; K75 de aynı turda `[KOŞTU · kalıntı 19]`
oldu. **Bekçi yazılmadan önce pano gerçeğe uyduruldu** — yoksa ölçüt ilk
gün kırmızı doğar ve susturulmaya davet çıkarırdı.

### ⛔ VE İLK İKİ ÖLÇÜT KÖR ÇIKTI — DESEN İKİ YÖNDEN DE YANLIŞTI

    ① K138'in ilk taraması "bekliyor" ile "[KOŞTU]"yu AYRI kalem saydı → 0
    ② bugünkü ilk denemem /\[KOŞTU\]/ arıyordu; K83'ün işareti
      `[KOŞTU 29.08.2026]` biçiminde ve KAÇTI — üstelik aynı desen düz
      metinde de geçtiği için K138'in KENDİ BELGESİNE yanıyordu

Desen hem **genişletildi** (tarih/önek alabilir) hem **daraltıldı** (yalnız
`###`+ alt başlığında sayılır). _(Anayasa: "kaynak tarayan kontrol, deseni
kullanım bloğunda arar".)_

### ⛔ VE İLK MUTASYON TURU 7'DE 4 KAÇIRDI — SEBEP BEKÇİ DEĞİL, VERİYDİ

Panoyu düzelttiğim an bekçinin ısıracağı **canlı vaka kalmadı**; "ölçütü
öldüren mutasyon" ile "temiz pano" ayırt edilemez oldu. Ölçüt kaynağı
tarıyordu ve tarama boş dönünce her mutasyon yeşil geçiyordu.

⭐ **ÇARE SAF GÖVDE:** `durumCeliskileri(satirlar)` panoyu okumaz, satır
dizisi alır — ve **dört değer testiyle** sınanır (üçü gerçek vakadan:
K83'ün eski hâli · K74'ün bugünkü dürüst hâli · K138'in kendi belgesi).
Artık mantığı bozan her mutasyon kırmızı yanıyor.
_(Anayasa: "mutasyon kaçıyorsa önce test verisi sorgulanır" · "saf hesap
katmanı, desen tarayan bekçiye muhtaç olmaz".)_

✓ **8/8 mutasyon kırmızı** — iki yön ayrı: yanlış susma (K83 başlığını
yalanına döndür · K74'ten YAZILDI'yı çıkar · saf gövdeyi boşalt · desenden
tarihi düş · taban eşiğini gerçek sayının üstüne al) ve yanlış yanma (alt
başlık sınırını kaldır · dürüst başlık muafiyetini kaldır · `##` sınırını
gevşet).

⚠ **AÇIK KALAN — BU BEKÇİ K75'İ YAKALAMAZDI.** K75'in `[KOŞTU 28.08.2026]`
kaydı **başka bir kalemde** duruyordu, kendi gövdesinde değil. Kalemler
ARASI aynı işi anlatan çifti bulmak bu ölçütün kapsamı DIŞINDA ve bugün
açılmadı. `pano:dogrula` bunu bilmez; K75 sınıfının gerçek çaresi durumu
panodan değil **defterden** sormaktır (`canli:kargo-mutabakat-izi`).

---

## ✅ K139 — EKSİK KARGOLAR YAZILDI · 02.09.2026 · [KOŞTU]

Kullanıcı sordu: _"hangi satışlar kargosuz, listesini ver."_

    açık kargosuz 54  →  (a) dosyada VAR 36 · (b) çelişkili 18 · (c) yok 0
    ⭐ 36 satışın 35'i aynı ürün: LEGO Disney "Yukarı Bak" Evi

⭐ **NİYE 28.08'DE KAÇMIŞLAR — ÖLÇÜLDÜ:** 35'i deftere yazımdan **SONRA**
girmiş (betik göremezdi), 1'i önce girmiş ve atlanmış (sebep açık).

    npm run canli:kargo-yaz -- --yaz
    cargoAmount 5817 → 5854 (+37) · 584.931,57 → 588.620,45

⚠ Elle girilmedi: dosyada **124,00** yazıyor, deftere giren **103,33**
(KDV hariç). 36 kez elle girmek %20'lik bir hata riskiydi.

### ⭐ VE "DEĞERLER DOĞRU MU" AYRICA ÖLÇÜLDÜ (`canli:kargo-degeri-dogrula`)

Önce yanlış soruyu sormuştum: kaç satışta kargo VAR. 5806 satırın hepsi
yanlış olsaydı o ölçüm de aynı sonucu verirdi.

    ✓ kuruşuna TUTUYOR 5595  ·  ⛔ SAPAN 132 (1.018,35)
    ⚠ dosyada ÇELİŞKİLİ 8   ·  ⚠ dosyada YOK 82 (kıyaslanamaz)
    TABAN: p05…p95 hepsi 1.2000 · tam 1,20 olan 5596 · tam 1,00 olan 2

Taban tartışmasız; `÷1,20` doğru karardı. Sapanların çoğu kuruş kuyruğu
(daha önce elle girilmiş satırlar), dördü gerçek ayrışma.

---

## ✅ K140 — `11265267349` TAM ONARIM · 02.09.2026 · [KOŞTU]

Kullanıcı ekranda 0,00 tutarlı, −3.288,49 zararda bir satış buldu.

### ⛔ NE OLMUŞ — İADE NEGATİF SATIŞ SATIRI OLARAK GİRİLMİŞ

    kalem 1:  1 adet  +2.550,00  maliyet 1.934,00
    kalem 2:  1 adet  −2.550,00  maliyet 1.999,00   ⛔

Fiyat ve komisyon netleşiyor, **maliyet netleşmiyor** → ciro 0, zarar
3.933. Ve negatif satır `SALE_OUT −1`: malı geri getirmek yerine **bir
adet daha düşürmüş.** Bu varyantta `RETURN_IN` **hiç yoktu.**

Zincir: stok erken sıfırlandı → 28.08 maliyet betiği açıkta kalan iki
satış için **iki hayalet parti** açtı (`dosya-maliyet-20260828`).

### ⭐ KANALIN KENDİ KAYDI HİKÂYEYİ DOĞRULADI

    27.05  DAMAGEDITEM   "Kusurlu ürün gönderildi"   → Rejected
    15.06  SELLERREQUEST "Satıcı Talebi İle İade"    → Accepted · 1 adet

Kullanıcının anlattığı (4 stok · 5 satış · 5.si iadeden dönen mal) **birebir
doğruydu**; yanlış olan defterin kaydıydı.

### YAZILAN

    A1 sahte kalemin fiyatı −2.550 → 0        (düzenleme kapısından)
    A2 kaleme bağlı ters ADJUSTMENT +1        (stok ve maliyet netlenir)
    B  gerçek İADE: 15.06 · 1 adet · NORMAL · sağlam 1 · ty-claims notu
    C  2 çıkış gerçek partilere bağlandı      (1.945 → 1.999 ve 1.934)
    D  2 hayalet parti SİLİNDİ
    E  3 satışın kârı tazelendi

    ⭐ stok 2 → 0 ✓
    11265267349  NET-2  −3.288,49 → +417,34
    11272966624  NET-2     283,23 →  238,23
    4901581069   NET-2     246,43 →  255,60

### 🐞 YOL BOYUNCA ÜÇ KEZ KENDİ KURALIMA TAKILDIM

**① `NOT` süzgeci NULL satırı attı.** `NOT: { note: { contains: … } }`
yazdım; gerçek partilerin `note`u BOŞ ve SQL onları eledi — C durdu.
**Anayasada bu kuralın kendi maddesi var** (02.09'da yazılmış) ve yine
düştüm. Çare: `OR: [{ note: null }, { NOT: … }]`.

**② Kimliği fiyatın İŞARETİNE bağladım.** A1 fiyatı 0 yapınca ikinci
koşumda kalem "bulunamadı" oldu ve şekil kapısı C/D'yi engelledi.
Ölçüt `< 0` → `<= 0`.

**③ Düzenleme kapısı iki kez reddetti** — `FIYAT_GECERSIZ`, `ADET_GECERSIZ`.
⭐ **VE KAPILAR HAKLIYDI:** uygulamada satır silme yolu yok, olmaması
doğru. Çözüm anayasanın kendi kuralıydı: kaleme bağlı ters `ADJUSTMENT` —
çünkü `kalemMaliyeti` maliyeti TİPTEN değil **BAĞDAN ve işaretiyle**
topluyor.

⚠ Her seferinde betik **DURDU ve söyledi**; yarım yazım olmadı. Kayıt
silinmedi — sahte kalem yerinde, üstüne onu açıklayan ters hareket yazıldı.

---

## ✅ K145 — KARDEŞ PARTİ SAPMASI TARANDI + KART ETİKETİ YALAN SÖYLÜYORDU · 03.09.2026 · [KOD KOŞTU]

_Halil: "ALM-HB-260216-03 aramasında sipariş no'ya tıkladığımda çıkan ekran
ile ürün ismine tıkladığımda çıkan ekran birbirinin aynısı değil. Bunun gibi
bir hata başka üründe de var mı?"_

⚠ İki ekran **farklı olmalı** (biri ALIM, biri ÜRÜN) — ama Halil haklıydı:
aynı satırdan gidilen iki ekran **aynı ürün için farklı şey söylüyordu.**
Alım ekranı ₺7.641,50, ürün kartı _"Ortalama maliyet: ? maliyet bilinmiyor"_.
İki ayrı bulgu çıktı.

### ⭐ ① BAŞKA ÜRÜNDE DE VAR — ÜÇ TANE DAHA

Ölçüt: **aynı varyant + aynı gün + aynı para birimi** grubunda en yüksek ÷
en düşük birim maliyet. Zaman ekseni YOK — anayasa _"zaman içindeki fiyat
farkı şüphe üretmez"_ diyor ve bu kıyas onun kapsamı dışında.

    538 grup (>=2 kalem) · n=538
    p50 1,000x · p75 1,011x · p90 1,051x · p95 1,099x · p99 1,319x
    ────────────────── GÖVDE BİTER ──────────────────
    1,84x  ·  2,00x  ·  3,11x  ·  14,21x        ← YALNIZ DÖRT GRUP

| oran | SKU | gün | aralık | ürün |
|---|---|---|---|---|
| **14,21×** | `axcali1805` | 16.02.2026 | 537,62 → **7.641,50** | Fresh Kitchen 2'li Şef Bıçağı |
| **3,11×** | `axcali2110` | 01.01.2026 | **450,35** → 1.399,00 | LEGO 31172 Çiçekli Pikap |
| **2,00×** | `axcali2002` | 27.04.2026 | **1.500,00** → 2.999,00 | Braun Series 3 |
| **1,84×** | `axcali1603` | 14.08.2026 | 1.111,00 → 2.048,00 | Zolo 20.000mAh Powerbank |

⚠ **VE YÖN ÖNEMLİ — ÜÇÜNDE AYKIRI OLAN *DÜŞÜK* TARAF.** Yüksek aykırı kârı
olduğundan **kötü**, düşük aykırı olduğundan **iyi** gösterir. İkincisi daha
tehlikelidir: kimse "kârım fazla çıkmış" diye şikâyet etmez.

⛔ **HİÇBİRİ DÜZELTİLMEDİ — DAVETTİR, HÜKÜM DEĞİL.** Her biri fatura ile
doğrulanır. _(OneBlade `₺27,16` de imkânsız görünmüştü ve GERÇEKTİ.)_
**Liste:** `raporlar/kardes-parti-sapmasi.csv`

### ⛔ ② KART ETİKETİ YALAN SÖYLÜYORDU — VE YARIM DEPOYU ETKİLİYORDU

_"Ortalama maliyet: ? — maliyet bilinmiyor"_ cümlesi **yanlıştı.** Kutu
ELDE KALAN partilerin ortalamasıdır; stok bitince açık parti kalmaz ve
`null` döner. Sistem o ürünün alım maliyetini **BİLİYOR** — hatta YAN
KUTUDA gösteriyor (`Son alım maliyeti ₺649,00`).

    📏 1114 varyantın **518'i** (%46,5) alımı OLDUĞU hâlde "bilinmiyor" görüyordu
       alımı YOK 385  ·  alımı VAR + stok>0 211  ·  ⭐ alımı VAR + stok 0 → **518**

⭐ **VE ÇARE ZATEN YAN KUTUDAYDI.** `sonAlim` kutusu **21.08.2026'da** aynı
kusuru düzeltmiş ve gerekçesi kodda yazılı: _"Eskiden stok bitince bu kutu
'alım yok' derdi — alım VARDI, stok yoktu."_ Karar bu kutuya
**UYGULANMAMIŞ.** _(Anayasa: "kararın kapsamı, uygulandığı yerle sınırlı
sayılmaz" · "kolon başlığı bir iddiadır".)_

Yeni metin iki sebebi AYRI söylüyor ve ayrım **yan kutunun ölçütünden**
geliyor (`sonAlimTarihi`) — iki kutu aynı soruya iki cevap vermesin:

    alımı YOK    → "alım kaydı yok"
    stok BİTMİŞ  → "stok bitti — açık parti yok"

    kart:dogrula  105 → 111 ölçüt   ·   i18n tr+en ✓

✓ **5/5 mutasyon kırmızı:** eski yalan metne dönüş · iki sebebi tek metne
indirme · ayrımı yan kutudan koparma · dolu kutuya not basma · blok
çapasını bozma (pencere gerçekten daralıyor mu).

---

## 🔵 K141 — `CALCULATED` EKSİK MALİYETİ SÖYLEMİYOR · 03.09.2026 · [ÜST ÖLÇÜT KOŞTU · kargo rozeti açık]

Kullanıcı CSV'de gördü: kargosuz satışların `durum` sütunu **CALCULATED**.

⛔ `CALCULATED` = **"motor çalıştı"**, "her maliyet hesaba girdi" DEĞİL.
Kargo `null` iken de motor sonuç üretir. Şemada `NO_COST` · `RULE_MISSING`
· `CURRENCY_MISMATCH` var; **eksik KARGO için durum YOK** — kargosuz satış
kargolu satıştan ekranda ayırt edilemiyor.

⚠ Uyarı merkezinde de kural yok: 13 kuraldan hiçbiri ciro 0'ı ya da
"zarar cirodan büyük"ü yakalamıyor. `11265267349` üç ağdan da geçti.

### ✅ ÖLÇÜLDÜ VE YAZILDI · 03.09.2026 [KOD KOŞTU]

⛔ **ÖNCE KÜME ÖLÇÜLDÜ — VE İKİ ÖNERİDEN BİRİ DÜŞTÜ.**

    ① ciro 0 olan satış        : **0**    ← küme BOŞ, kural yazılmadı
    ② |zarar| > ciro olan satış : **2**    ← GERÇEK, ve sebebi bulundu
    ③ kargosuz ama CALCULATED   : 19       ← K75'in kalıntısıyla aynı 19

`ciroSifir` için kural AÇILMADI: tek vakası `11265267349`'du ve onarıldı.
Bugün tetiklenmeyen bir desen için kutu açmak, kutunun tamamına olan
güveni harcar. _(Anayasa: "kaydetme kararı tüketicisi doğduğunda verilir".)_

### ⭐ ② KULLANICI HAKLIYDI — VE SEBEP YAPISALDI

Kullanıcı zararına satış listesine bakıp demişti: _"iadenin olmadığı
ürünlerde bu kadar zarar yapmak anlamsız. Bir hesap hatası var."_

    11015495705 · axcali1805 · ciro ₺1.789 · maliyet ₺7.641,50  (%427)
    11015821765 · axcali1805 · ciro ₺1.789 · maliyet ₺7.641,50  (%427)
    "Fresh Kitchen Paslanmaz Çelik 12/15 Cm 2'li Şef Bıçağı"

⭐ **VE AYKIRILIK ZAMANDA DEĞİL, KARDEŞLERİNDE** — aynı varyantın AYNI GÜN
aynı tedarikçiden girilmiş dört partisi var:

    16.02.2026  ALM-HB-260216-01     ₺537,62
    16.02.2026  ALM-HB-260216-03   ₺7.641,50   ← 13 KAT
    16.02.2026  ALM-HB-260216-04     ₺562,47
    16.02.2026  ALM-HB-260216-05     ₺612,47

Yani anayasadaki _"zaman içindeki fiyat farkı şüphe üretmez"_ kuralının
KAPSAMI DIŞINDA: kıyas aynı gün, aynı tedarikçi, aynı varyant.

### ⛔ VE UYARI MERKEZİ TEK YÖNLÜ KURULMUŞTU

`veri-supheli.ts`in iki ölçütü de maliyetin **ÇOK DÜŞÜK** olmasını
arıyordu — çünkü doğdukları vaka (OneBlade `₺27,16`) öyleydi. Maliyetin
**ÇOK YÜKSEK** olması için ölçüt **YOKTU** ve o yön serbest kaldı.
_(Anayasa: "iki yön ayrı sınanır" — orada mutasyon, burada UYARININ
kendisi.)_

### ⭐ EŞİK UYDURULMADI — DAĞILIM ÖLÇÜLDÜ, GEDİĞİNE KONDU

MALİYET / CİRO · **n=5982** iptalsiz kalem · 03.09.2026

    p50 %67,9 · p90 %80,8 · p95 %84,1 · p99 %89,2   ← GÖVDE
    102 · 107 · 107 · 107 · 109 · 114 · 116          ← MEŞRU zararına satış
    148                                              ← tek vaka
    ────────────── GEDİK ──────────────
    427 · 427                                        ← axcali1805

⚠ **`%100` EŞİK OLAMAZDI:** zararına satmak meşrudur ve 8 kalem tam orada;
eşik oraya konsaydı dokuzu da ilk gün yanlış alarm verirdi. Eşik gövdenin
bittiği yere değil **gediğe** kondu: **%200**.
⭐ `SUPHELI_VERIM = 2.0` ile aynı çarpan — _"sattığının iki katını
ödemişsin"_ iş kararı değil, veri hatasıdır.

    veri-supheli.ts  2 → 3 ölçüt   ·   uyari:dogrula  245 → 252

⭐ **TEK GÖVDE, İKİ TÜKETİCİ:** `supheSebepleri` hem çan sayısını hem
`/satislar?veri=supheli` listesini besliyor — üçüncü sebep ikisine birden
aktı, ayrışma imkânsız.

✓ **6/6 mutasyon kırmızı** — iki yön ayrı: yanlış susma (ölçütü kaldır ·
eşiği %500'e çek · karşılaştırmayı ters çevir) ve yanlış yanma (eşiği
%120'ye çek · `ciro > 0` kapısını kaldır · ölçüm kaydını bozarak eşik
kapısını körleştir).

### ⏭ AÇIK KALAN — BEYAN

· ⚠ **BU İKİ VAKA UYARIYA DÜŞMEZ:** `SUPHE_PENCERESI_GUN = 90` ve satışlar
  04.03.2026. Ölçüt GELECEĞİ korur; geçmişteki 10 kalem (pay >%100) tek
  seferlik araç işi.
· ⛔ **VE ₺7.641,50 DÜZELTİLMEDİ.** Uyarı bir hüküm değil DAVETTİR; rakam
  gerçek de olabilir. Bağımsız kaynak: `ALM-HB-260216-03` alımının HB
  sipariş geçmişi. _(OneBlade `₺27,16` de imkânsız görünmüştü ve hediye
  kuponuyla alındığı için GERÇEKTİ.)_
· ⏭ **EKSİK KARGO ROZETİ HÂLÂ AÇIK:** `CALCULATED` "motor çalıştı" demek,
  "her maliyet girdi" değil. 19 satış kargosuz ve ekranda kargolu olandan
  ayırt edilemiyor. Bu ayrı bir iş; bugün açılmadı.

---

## ✅ K142 — SATIŞ DEFTERİ SAĞLIK TARAMASI · 02.09.2026 · [ÖLÇÜLDÜ]

_"Başka problem var mı"_ sorusunun cevabı sayımdır. 5864 açık satış:

    1  CIRO_SIFIR · 1 CIRO_SIFIR_AMA_NET_VAR · 1 NEGATIF_BIRIM
    0  KALEMSIZ · HESAPLANAMAYAN · NET_YOK · KOMISYONSUZ
   54  KARGOSUZ  ·  121 ZARAR  ·  3 ZARAR_CIROYU_ASAN

⭐ **"API'den önce problem yoktu" iddiası ÖLÇÜLDÜ VE ÇÜRÜDÜ** bu vakada:
`CIRO_SIFIR` ve `ZARAR_CIROYU_ASAN` kayıtlarının hepsi **`satis-excel`**
kaynaklı, API'den değil.

⭐ **TERS KALEM TARAMASI (`canli:ters-kalem`) — 6024 KALEM, TEK VAKA.**
Üç ayrı ölçüt (kalem düzeyi · ters çift · geniş desen) aynı tek satışı
buldu. Yayılmış çürüme YOK.
⚠ Önceki tarama SATIŞ düzeyinde sayıyordu; bir satışta üç ters çift olsa
yine "1" yazardı. Birim KALEM olmalıydı.

---

## 🔵 K143 — ZARARLARIN KAYNAĞI ÖLÇÜLDÜ · 02.09.2026 · [ÖLÇÜLDÜ]

Kullanıcı: _"iadenin olmadığı ürünlerde bu kadar zarar anlamsız, bir hesap
hatası var."_ **Hesap doğru** (`ciro − maliyet − kesinti = NET-1`, fark
0,00) ama zamanlama sezgisi tuttu:

    129 iadesiz zarar
      ⛔ FİYAT MALİYETİN ALTINDA :  12   → 20.182,36
      ⚠ fiyat üstünde, KESİNTİ yiyor : 115
    ⭐ KARGO OLMASA KÂRDA olurdu : 78   (zararı 2.971,93)
      kargosuz DA zararda        : 49

**78 satış 28.08'de kargo yazılana kadar kârda görünüyordu.** Değişen
görüntü, gerçek değil — o satışlar zaten zarardaydı, sistem bilmiyordu.

### ⛔ VE FİYAT ÇAPRAZIMI YANLIŞ TABANDA KURDUM

Yorumda _"taban aynı"_ yazdım ama ÖLÇMEDİM: 30/30 "sapan" çıktı, hepsi
aynı yönde. Ayırt edici kanıt tek satırda göründü — `11428632368` farkı
**−91,80**, o satışın komisyonu da tam **91,80**. `SIPARIS_TUTARI`
**komisyon düşülmüş** tutarmış.
Taban düzeltilince 13 tutuyor, 16 sapıyor; kalan farklar **13,19** (TY
sabit gider) gibi — ekstre başka kalemler de düşüyor.
⛔ **Tabanı tam çözülmeden fiyat hükmü VERİLMEDİ.** 98 sipariş zaten
ekstrede yok.

---

## 🔵 K144 — TY API DURUM RAPORU · 02.09.2026 · [ÖLÇÜLDÜ]

_"Her şeyiyle bağlı mıyız?"_ → **Hayır.** Üç ayrı soru, üç ayrı cevap:

    ① UÇ VAR MI        siparisler · hakedis · iadeler   (yazma fiili YOK)
    ② ÇALIŞIYOR MU     üçü de ✓ (81 · 113 · 351 kayıt)
    ③ DEFTERE AKIYOR MU  API'den 439/5906 = %7,4

⛔ **AKIŞ DURMUŞ:** ilk API kaydı 26.08, son API kaydı da 26.08 — tek
seferlik çekim. **Otomatik zamanlayıcı YOK**, içe aktarma elle koşuluyor.
⛔ Bağlanmamışlar: stok/fiyat ve paket statü (bilerek, yazma ucu) ·
buy-box (kapı kararı A'da) · ürün/listeleme okuma.

---

## ✅ K136c — SAĞLAM ADET ÖLÇÜM YOLU · 02.09.2026 · [ÖLÇÜLDÜ · YAZIM YOK]

Araç: `npm run canli:iade-adet-olcum` — salt okuma, yazma bayrağı YOK.

### ⚠ ÖNCE BİR AYRIM: ŞARTNAME İKİ SORUYU TEK ADLA ANIYOR

    (A) İADE ADEDİ   — kaç birim geri geldi?   → quantity
    (B) SAĞLAM ADET  — kaçı rafa girdi?        → soundQuantity

Adım ①③ (A)'yı, adım ④ (B)'yi ölçer. K136a'daki ₺21.948'lik yayılım
**(B)'den** geliyordu; ikisi karıştırılırsa "adet çözüldü" denip asıl
soru açık kalır.

### ⭐ ① ADET EKSENİ NEREDEYSE BOŞ ÇIKTI

    adet=1 kalem (belirsizlik YOK) : 119
    ⛔ adet>1 kalem (BELİRSİZ)      :   1   → 11399165160 (axcali1649×2)
    ⛔ ₺ yayılımı                   : 1.721,50

**120 kalemin 119'u tek adet.** Bu eksen pratikte sorun değil.

### ⭐ ② CLAIMS YAPISI — HİPOTEZ AYIRT EDİCİ KANITLA DESTEKLENDİ

`claimItems` içinde adet/quantity alanı **YOK** — ama her `claimItem`
kendi `orderLineItemId`sini taşıyor. Hipotez: _adet = kabul edilmiş
claimItem sayısı._

    kabul kalem = satış adedi   : 112
    ⭐ kabul kalem < satış adedi :   2   10863545466(1/2) · 11265267349(1/2)
    ⛔ kabul kalem > satış adedi :   0

⭐ **KISMİ İADE GÖRÜLÜYOR** → hipotez desteklendi. Hepsi eşit çıksaydı
sınanamazdı ("her satıra bir kalem" de aynı sonucu verirdi). Ve "fazla"
sıfır — satılandan çok iade yok, yani imkânsız durum üretmiyor.

### ⛔ ③ EKSTRE ÇAPRAZI BOŞ — VE BU "TEMİZ" DEĞİL

    ekstrede IADE_TUTARI olan sipariş: 0/114

Bu yol **veri olmadığı için** cevap vermiyor; "fark yok" DEĞİL, "bakacak
şey yok". Eski siparişlerin ekstresi sisteme hiç girmemiş.

### ⭐ ④b BEDAVA KANIT — SAYIM 7 VARYANTI ZATEN ÇÖZDÜ

    ⭐ sayım fazlası iade adedini TAM açıklıyor :  7
    ⚠ sayılmış ama açıklamıyor                 : 12
    ⚠ hiç sayılmamış (ÖLÇÜLEMEZ, 'yok' DEĞİL)  : 78
    → Halil'in ELLE sayması gereken varyant    : 90   (97 değil)

K136a'daki 4/4 deseninin aynısı. Elle sayım listesi buradan **7 kısaldı**.

### 📋 ④ HEDEFLİ SAYIM LİSTESİ

    97 FARKLI varyant  ·  raf: 86 DEPO · 6 OFİS · 5 (raf yok)
    kabul edilen kalemlerin sebep sınıfı:
      17  TESLİM EDİLMEDİ  → mal hiç açılmadı, SAĞLAM dönmesi beklenir
      91  müşteri vazgeçmesi → hasar iddiası YOK
      11  ⛔ HASAR İMALI (kusurlu/analiz/eksik parça) → BAKILMALI

⚠ Sebep kodu hasarı **söylemiyor**, ihtimalini gösteriyor. Hüküm değil,
baktırma sebebi.

### ⛔ ⑤ KARARIN BEDELİ ÖLÇÜLDÜ — VE SAYMAYA DEĞER

    KARARIN BEDELİ: ₺226.250,98   (sağlam=0 ↔ sağlam=tamamı)
    ✓ tüm siparişlerin maliyeti biliniyor

90 varyant elle saymak ciddi bir iş; **ne kazandıracağı yazılmadan
"sayılsın" demek bedeli bilinmeyen bir işi emretmek olurdu.** Rakam
konunca karar kolay: ₺226K'lık bir ayrım için 90 varyant sayılır.

### ✅ ⑧ MUTABAKAT — SORU KAPANDI · [HALİL BEYANI 03.09.2026]

> **Halil:** _"Bu konuda mutabakata vardığımızı, sayım yapılan tarih
> itibarıyla bir problemin olmadığını yaz sisteme."_

⭐ **KAYIT:** **27.08.2026 sayımı ve 29.08'de yazılan 181 `COUNT_CORRECTION`
ile stok mutabakatı SAĞLANMIŞTIR.** O tarih itibarıyla defter ile fiziki
raf arasında **problem YOKTUR.**

**KANIT — ÖLÇÜLDÜ 03.09.2026, tek satırda:**

    sayım listesindeki rafta malı olan 11 varyantın
    ⭐ 11'inde BUGÜNKÜ raf adedi = SAYILAN adet     (ayrışan 0)

Defter rafa uyuyor. Dolayısıyla **sağlam adet tavanı 89/89'unda SIFIR** ve
açık kalan karar **₺0**. 114 TY iadesi yazılacaksa `soundQuantity = 0` ile
yazılır; stok defterine hiçbir şey eklenmez ve **mutabakat olduğu gibi
ayakta kalır.**

### ⛔ VE ÜÇÜNCÜ HATAM BURADAYDI — EN İNCESİ

_"Sayım fazlası"_ diye gösterdiğim rakamı şöyle hesaplamıştım:

    fazla = sayılanAdet − defter(27.08 gün sonuna kadar)

Ama düzeltmeler **29.08 tarihli** — yani bu toplamın **DIŞINDA** kalıyorlar.
Gösterdiğim "fazla" boş kapasite değil, **K83'te 181 hareketle deftere
ÇOKTAN YAZILMIŞ düzeltmenin kendisiydi.** Aynı rakamı iki kez saydım.

⚠ **VE ÜÇÜNÜN DE KÖKÜ AYNI:** elimdeki mutabakatı OKUMADAN üstüne yeni bir
soru kurdum. K83 panoda duruyordu ve _"fiziki varlık esastır · sayım SON
SÖZ"_ diye yazıyordu.
_(Anayasa: "fiziksel sayım son sözdür" · "kaydetme kararı tüketicisi
doğduğunda verilir" — burada tüketici zaten doğmuş ve KARAR VERİLMİŞTİ.)_

⛔ **BU KALEM YENİDEN AÇILMAZ.** Sağlam adet sorusu için yeni bir sayım,
yeni bir liste ya da yeni bir karar İSTENMEZ. Açılış şartı: 27.08 sonrası
yapılacak YENİ bir fiziksel sayım.

### ⛔ ⑦ SAYIM FÖYÜ GERİ ÇEKİLDİ · 03.09.2026 — KULLANICI DURDURDU

_Halil: "bu nedir. sana sayım sırasında zaten kesin sayım sonuçlarını
verdim."_ **HAKLIYDI.**

⛔ **89 VARYANTLIK ELLE SAYIM LİSTESİ VAR OLMAYAN BİR İŞ İSTİYORDU.**

    89 varyantın →  rafta MALI OLAN   : **11**   ₺28.556,81
                    rafta MALI OLMAYAN: **78**   ₺171.577,59

**78'inin rafında bugün hiçbir şey yok** — sayılacak bir şey de yok. Ve
rafta malı olan **11'in HEPSİ 27.08 sayımında zaten sayılmış** (11/11).
Yani sayım, bu işin sayılabilir kısmını **eksiksiz** kapsamış.

⭐ **HATA ÖLÇÜT SEÇİMİNDEYDİ.** Liste kurulurken şu soruldu:
_"sayım fazlası iade adedini TAM açıklıyor mu"_ (`fazla === iade`). Ama
**"rafta sayılacak bir şey var mı"** HİÇ SORULMADI. Ölçüt doğruydu,
kapsamı yanlıştı — ve sonuç, operatöre boş rafa baktıran bir liste oldu.
_(Anayasa: "kural doğru mu değil, KURAL TESLİM EDİLEBİLİR Mİ".)_

### 📏 SAYIMIN GERÇEK KAPSAMI — ÖLÇÜLDÜ

    27.08.2026 · iki sayım, ikisi de TUM_STOK
      467 satır · adedi GİRİLMİŞ 231 varyant · BOŞ 236 satır
      bugün stoğu > 0 olan 233 varyantın **212'si sayılmış (%91)**
      ⭐ `sayılanAdet = 0` girilmiş satır: **0**

Yani boş satır _"sayılmadı"_ değil, büyük olasılıkla **"rafta yok"** demek —
sayım özensiz değildi, kapsamı stoklu mala odaklıydı.
⚠ Ama sistem ikisini AYIRT EDEMİYOR (`null` ile `0` aynı görünüyor);
bu ayrı bir kalem ve bugün açılmadı.

### ⛔ VE YENİ BİR SAYIM DA ÇÖZMEZ — ÖLÇÜLDÜ

    89 varyantta "satılan > alınan" olan: **0**
       satılan = alınan : 83   ·   satılan < alınan : 6

Defterde iade malının geri geldiğine dair **hiçbir aritmetik iz yok.**
Rafta olmayan malı saymak da, defteri yeniden toplamak da aynı cevabı
verir: **bilinmiyor.**

⏭ **GERİYE İKİ YOL KALDI, İKİSİ DE KARAR — ÖLÇÜM DEĞİL:**
① pazaryerinin kendi kaydından sağlam adedi çekmek (TY claims / HB) ·
② sebep sınıfına göre politika (teslim edilmedi → sağlam · hasar imalı →
  değil · gerisi → ?).

⚠ **VE 11 VARYANTIN SAYIM SONUCU YORUMLANIRKEN DİKKAT:** `fazla > iade`
iade malının geri geldiğini **KANITLAMAZ** — fazla başka sebeplerden de
gelebilir. Föy bunu _"uyumlu"_ diye yazıyor, _"kanıtlandı"_ diye değil.
_(Anayasa: "iki okumayla da uyumlu bir gözlem, hiçbirini kanıtlamaz".)_

### ⛔ ⑥ SAYIM FÖYÜ — GEÇERSİZ, ⑦'DE GERİ ÇEKİLDİ (kayıt için duruyor)

_Halil şartnamesi: "90 varyant ₺ etkisine göre sıralı, %80 eşiği
işaretli, raf sırasına dizili — PDF/ekran."_

⚠ **ŞARTNAME İKİ SIRALAMA İSTİYOR VE İKİSİ ÇELİŞİYOR.** Çözüm birini
seçmek değil, ikisini **farklı işe koşmak**: ₺ etkisi hangi satırların
sayılmaya değdiğini belirler (%80 kesimi, işaretlenir) · raf sırası listenin
DİZİLİŞİdir. ₺'ye göre dizilseydi Halil aynı rafa beş kez giderdi.

⚠ **VE RAKAM PANODAKİNDEN FARKLI ÇIKTI — SESSİZCE DEĞİŞMEDİ:**

    02.09  97 varyant → 7 bedava çözüldü → **90** sayılacak
    03.09  96 varyant → 7 bedava çözüldü → **89** sayılacak   ← GEÇERLİ

Sebep: 02.09'da K136a'nın 8 iadesi yazıldı; iadesi yazılan sipariş hedef
kümeden çıkıyor. _(Anayasa: "donmuş kaynak, akan kaynakla karşılaştırılırken
iki damga yazılır".)_

⛔ **VE BİR ETİKET HATASI YAPTIM — DÜZELTMESİ BURADA DURUYOR.** Commit
mesajına _"89 varyant · ₺222.317,98"_ yazdım. **Yanlış.** İki ayrı rakamı
tek etiketle taşıdım:

    ₺222.317,98   SİPARİŞ bazlı — kararin TAMAMININ bedeli
                  (sayimin BEDAVA çözdüğü 7 varyant DAHİL)
    ₺200.134,41   VARYANT bazlı — **listenin toplamı**, sayılacak 89 kalem
    ₺ 22.183,57   fark = sayımın bedavaya çözdüğü kısım

Betik ikisini zaten AYRI basıyor ve **kapsam karşılaştırması yapıyor**
(ayrışırsa liste yayımlanmaz); hatayı yapan ölçüm değil, rakamı taşıyan
cümleydi. _(Anayasa: "bir sayı etiketiyle taşınır".)_

    ⭐ %80'i ilk **46** varyantta: ₺160.476,34
      kalan 43 varyant                ₺ 39.658,07
    raf: 80 DEPO · 4 OFİS · 5 (raf yok)
    ✓ her varyantın maliyeti biliniyor

**ÇIKTI:** `raporlar/k136c-sayim-listesi.csv` (89 satır, raf sırasında) +
telefonda işaretlenebilir föy (toplam süzgeçle birlikte değişir — İlke #15;
SKU tık-kopyala — İlke #4; dokunma alanı 44px — İlke #8).

⏭ **KARAR HALİL'DE:** ① 89 varyant sayılsın mı, ② yoksa sebep sınıfına
göre politika mı (teslim edilmeyen → sağlam, hasar imalı → sayılsın,
gerisi → ?). ⛔ Yazım bu karardan sonra, AYRI onayla.

---

## ✅ K136b — TY GEÇMİŞ FİZİBİLİTESİ · 02.09.2026 · [ÖLÇÜLDÜ · YAZIM YOK]

_Halil şartnamesi: "TY hakediş GEÇMİŞ çekimi + claims geçmiş ufku, tek
fizibilite raporu (salt okuma, Halil makinesi, A3 içinde)."_
Araç: `npm run canli:ty-gecmis-fizibilite` — salt okuma, yalnız `GET`.

### ⭐ ASIL SAYI: KAPSAMA %99,1

    açık TY siparişi          115
    ⭐ claims'te GÖRÜNEN      114   ciro 317.591,00
    ⛔ claims'te GÖRÜNMEYEN     1   ciro     840,00

**TY yarısı bu boruyla neredeyse TAMAMEN adreslenebilir.** Açığın TY
tarafı ₺319.503,50 idi; claims'in gördüğü ₺317.591 — yani **%99,4'ü.**

⚠ **"GÖRÜNEN" ≠ "YAZILABİLİR".** K136a'da her sipariş için ÜÇ şey
gerekiyordu: sebep · tarih · tür. Claims ilk ikisini veriyor
(`customerClaimItemReason` · `lastModifiedDate`, K136a'da 3/3 beyanla
tuttu). **TÜR henüz ölçülmedi** — açık soru.

### ① CLAIMS UCU

    çekilen 351 · ucun kendi beyanı 351   ✓ TAM
    ufuk (claimDate) 2023-10-04 → 2026-08-28
    farklı sipariş numarası 308

### ② HAKEDİŞ UCU — VE BİR PARAMETRE HATASI

İlk denemede `400` döndü ve ben mesajı **80 karaktere kırptığım için**
sebebi göremedim (`CheApiBusinessException` ile kesiliyordu). Tam cevap:

    "Size değeri 500 ya da 1000 olmalıdır"

⛔ `size=50` geçmiştim. Kırpma olmasaydı ilk turda çözülürdü.
_(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır" — bu ders
bugün ÜÇÜNCÜ kez tetiklendi.)_

Düzeltilince veri aktı — 15 günlük pencerelerle geriye:

    2026-08-18 → 2026-09-02   113 kayıt
    2025-12-21 → 2026-01-05   201 kayıt
    2024-08-28 → 2024-09-12    15 kayıt
    2024-04-30 → 2024-05-15     5 kayıt

⚠ **GİDİLEBİLEN en eski pencere 2024-03-16 — ve bu UCUN sınırı DEĞİL,
döngü tavanım (60 pencere ≈ 2,5 yıl).** Uç daha geriye de veriyor olabilir.
Rapor bunu kendisi yazıyor.
_(Aynı gün ÜÇ kez aynı tuzak: zaman aşımı · alan haritası derinliği · şimdi
döngü tavanı. Üçünde de aracımın sınırı kaynağın yokluğu gibi göründü.)_

📌 **Bizim için yeterli:** Excel listesindeki en eski iade **2024-08**.

### ⚠ YAN BULGU — 58 SİPARİŞ DEFTERDE HİÇ YOK

    (a) claims'te VAR + listede VAR + defterde SATIŞ YOK : 58

Bunlar iade açığı değil, **K56 kovası** (sisteme hiç girilmemiş satışlar).
Ayrı iş; bu boruyla çözülmez çünkü bağlanacak satış kaydı yok.

### ⭐ TÜR SORUSU KAPANDI — HİPOTEZ ÇÜRÜDÜ, CEVAP DAHA İYİ ÇIKTI

Hipotez şuydu: _"claims bir MÜŞTERİ talebidir, talep açan malı almıştır →
hepsi NORMAL."_ **Yanlış.** Sebep kodu dağılımı çürüttü:

    66  DISLIKE · Beğenmedim
    59  WRONGORDER · Yanlış sipariş verdim
    51  DAMAGEDITEM · Kusurlu ürün gönderildi
    44  SMALLSIZE · Bedeni/Ebatı Küçük Geldi
    38  ABANDON · Vazgeçtim
    ⭐ 25  UNDELIVERED · Teslim edilemeyen gönderi
    ⭐  3  CLAIMEDINSHIP · Taşıma Sürecinde İade Edildi
       … 20 farklı kod

⭐ **YANİ TÜR VARSAYILMIYOR, KANALIN KENDİ KODUNDAN OKUNUYOR.** Bu
varsaymaktan kat kat sağlam: K136a'da tür ekstrenin `KARGO_IADE` satırından
türetiliyordu ve TY ekstresinde o satır **hiç yoktu**.

⚠ **VE DEFTER TARAFI HİPOTEZİ SINAYAMADI:** sistemde `UNDELIVERED` iade
**0** — ayrımın öteki yakası yok. "Sınanamadı" ile "doğrulandı" aynı şey
değildir; hipotezi çürüten şey defter değil, kodun kendisi oldu.

### ⭐ 114 SİPARİŞ YAZIMA HAZIR — ÜÇ ALANIN ÜÇÜ DE ÇÖZÜLÜYOR

    'Accepted' talebi OLAN sipariş : 114/114
    hiç 'Accepted' talebi YOK      :   0
    TÜR (sipariş bazında):
        97  NORMAL
        17  UNDELIVERED
         0  ⛔ KARIŞIK

⚠ **DURUM SÜZGECİ ŞART:** 351 talebin 235'i `Accepted`, 70'i `Cancelled`,
53'ü `Rejected`, 1'i `Created`. Reddedilen bir talep **iade değildir** (mal
müşteride kaldı). K136a'da `11409234590`'ın iki talebi vardı ve doğru olan
`Accepted` olandı — o süzgeç orada elle uygulanmıştı, burada ölçüldü.

    sebep  → customerClaimItemReason.code + .name   ✓
    tarih  → lastModifiedDate (K136a'da 3/3 tuttu)  ✓
    tür    → sebep kodundan                          ✓

### ⛔ GERİYE TEK BİLİNMEYEN: SAĞLAM ADET

K136a'da en pahalı karar buydu (8 siparişte ₺21.948 yayılım) ve orada
**fiziksel sayım** çözdü — 4/4 varyantta fazla = iade adedi. **O çapraz
114 siparişte ölçeklenmez:** varyantların çoğu 27.08 sayımına hiç girmedi.

⚠ Ve claims de söylemiyor: `DAMAGEDITEM` (kusurlu gönderdik) ya da
`ANALYSISREQUEST` gibi kodlar malın satılabilir dönüp dönmediğini
belirtmiyor.
⏭ **Toplu yazım açılmadan önce bu ölçülmeli.**

⛔ **YAZIM YOK.** Toplu yazım AYRI onayla.
⛔ **HB yarısı (₺332.252,97) bu boruyla KAPANMIYOR** — A3 kapı kararı **B**.

---

## ✅ K136a — EKSTRE YOLU UÇTAN UCA SINANDI · 02.09.2026 · [KAPANDI · YAZILDI]

_Halil onayı: "YAZIM ONAYI VERİLDİ — kuru koşum temizse." Kuru koşum temiz
çıktı, yazım yapıldı, teyit temiz._

### ⭐ SONUÇ

    yazıldı 8/8  ·  atlandı 0  ·  hata 0
    stok kusuru 0  ·  NET kusuru 0
    Return       9 → 17   (+8)
    StockMovement 10804 → 10812   (+8, her varyantta tam +1)
    ⭐ AÇIK İADE  233 → 225   ·  tutar 682.458 → 651.756,47
       HB 332.252,97 (−24.007,00)  ·  TY 319.503,50 (−6.694,45)
    ikinci koşum: 8 ATLANDI, +0 yazım → **idempotent ÖLÇÜLDÜ**

Orijinal satış NET snapshot'ları **8/8 bit-bit sabit** — iade etkisi ayrı
`Return` kaydında, satışa dokunulmadı.

### ⭐ KAYNAK ÖNCELİĞİ UYGULANDI VE ÖLÇÜLDÜ (`canli:ty-claims-olcum`)

Halil'in kuralı: **pazaryeri API > ekstre > beyan.** Yazımdan ÖNCE ölçüldü:

    TY claims ucu       AYAKTA · 351 kayıt · ucun kendi beyanıyla TAM
    sebep alanı         VAR — customerClaimItemReason.code + .name
                        (+ customerNote: müşterinin kendi cümlesi)
    geçmiş ufku         2023-09-30 → 2026-08-29   ⭐ 05.06.2026'yı KAPSIYOR
    beyan ↔ claims      3/3 TUTTU (sebep VE tarih birlikte)

⭐ **Üç TY siparişinde beyan API ile BİREBİR tuttu** — `WRONGORDER` ·
`DISLIKE` · `WRONGORDER`, ve tarihler `lastModifiedDate` ile aynı gün.
HB'de API kapısı açılmadı → 5 siparişte beyan tek kaynak (SINIR, eksiklik
değil).

⛔ **VE İKİ KEZ ARACIMIN TAVANI KAYNAĞIN YOKLUĞU GİBİ GÖRÜNDÜ:**
① `tumSayfalar` 20 sn'de düştü → "ULASILAMADI" dedi; uç aslında ayaktaydı.
② alan haritası 3 derinlikte kesiliyordu → **"sebep alanı HİÇ YOK"** dedi;
sebep 4. derinlikteydi. İkisi de yanlış hükümdü ve ikisi de düzeltildi.

### 📝 NOT BİÇİMİ — SEÇENEK A UYGULANDI

    IADE_SEBEP[kaynak:ty-claims]: «Yanlış sipariş verdim»
    IADE_SEBEP[kaynak:halil-beyani-0209]: «Küçük geldi seçeneğinden iade»

`ReturnReason` enum'u GENİŞLETİLMEDİ. Biçim kurallı, ileride nottan
**deterministik türetme** yapılabilir.

### ⚠ 1 KURUŞLUK FARK — SEBEBİ ÖLÇÜLDÜ, HESAP DEĞİL GÖSTERİM

`4586626981` kuru koşumda −235,94, defterde −235,95 göründü. Ham değer:

    NET-2 = -235.945   ← TAM YARIM NOKTA

Kuru koşum motorun **float** çıktısını yuvarlıyor (float `-235.945`
aslında `-235.94499…`), defter aynı değeri `Decimal(18,4)` saklayıp
yarım-yukarı yuvarlıyor. **Hesap aynı, iki yuvarlama ayrışıyor.**
⏭ Uyur-kalem: aynı değer iki ekranda 1 kuruş farklı görünebilir.

### ⛔ İKİ UYUR-KALEM — AÇILIŞ ŞARTLARIYLA

**① `ReturnReason` enum boşluğu.** Pazaryerinin 9 sebebinden 5'inin
karşılığı var; **8 gerçek iadenin 7'si `DIGER`'e düşüyor**
("Yanlış sipariş verdim" ×6 · "Beğenmedim" ×1). 23.08'de liste
genişletilirken en sık geçen ilk iki madde alınmamış.
⛔ **AÇILIŞ ŞARTI:** sebebe göre sayım/süzme ihtiyacı FİİLEN doğduğunda —
o gün nottan deterministik türetme + migration BİRLİKTE gider.
⚠ Enum sırası: yeni değer **SONA** eklenir (27.08 `YANLIS_URUN` kayması).

**② `SAYIM_ISRAR_SEBEPLERI`'nde `GEC_GIRILEN_IADE` YOK.** Kapalı listede
`GEC_GIRILEN_ALIM` ve `GEC_GIRILEN_SATIS` var; liste alım/satış için
kurulmuş ve **iade oradan düşüyor**. Sekiz kayıt `DIGER` + zorunlu
açıklamayla geçti — uygun olmayan bir etiketi seçmek kaydı yanlış
sınıflandırırdı.
⛔ **AÇILIŞ ŞARTI:** ikinci bir geç-girilen iade partisi geldiğinde.

### ⛔ GERİ ALMA YOLU — SİLMEK DEĞİL

Ölçüldü: `StockMovement.returnItemId` **SetNull**. `Return` silinirse
`RETURN_IN` hareketleri **sahipsiz kalır ve stok yüksek kalmaya devam
eder** (satış silme tuzağının aynısı); parti tüketilmişse
`sourceMovementId` **Restrict** silmeyi zaten engeller.
→ Geri alma **ters işaretli `ADJUSTMENT`**tir ve izdeki ESKİ değerlere
dayanır. Sekiz izin sekizi de `JSON.parse` geçiyor (28.08'deki kırpılma
vakası tekrarlanmadı) ve önceki NET-1/NET-2/durum taşıyor.

### ⛔ HALİL TESTİ İKİ MADDEDE DÜŞTÜ — İKİSİ DE BENİM HATAM (02.09 akşamı)

**① MADDE 5 SINANAMADI: `Return.note` HİÇBİR EKRANDA ÇİZİLMİYORDU.**
Alan aylardır YAZILIYORDU (iade formu, sonra K136a'nın 8 kaydı) ama
`IadeGorunumu` tipinde alan yoktu → sayfa eşlemiyordu → bileşen
çizmiyordu. Halil satış detayına baktı ve sebebi bulamadı.

⛔ **Bu, "şemadaki alan bir iddiadır" kuralının AYNADAKİ hâli:** orada
alanın yazıcısı yoktu, burada **okuyucusu** yok. Sonuç aynı — veri orada,
kimse göremiyor. Ve Halil `ReturnReason` yerine notu tam da sebep
kaybolmasın diye seçmişti.

✓ **DÜZELTİLDİ:** `IadeGorunumu.note` + sayfa eşlemesi + `iade-blogu`
çizimi + `Iade.kayitNotu` (tr/en). Metin AYRIŞTIRILMADAN çiziliyor —
kalıp çözülseydi, kalıp taşımayan serbest notlar sessizce görünmez olurdu.
✓ **BEKÇİ:** `iade:dogrula` → **5b bölümü**, zincir halka halka
(tip · eşleme · çizim · sözlük ×2). **6/6 mutasyon kırmızı yandı**, yorum
körlüğü yönü dâhil.

**② MADDE 3'ÜN RAKAMI YANLIŞTI: `axcali1797` 4→5 değil, 1→2.**
Ekran **2** gösterdi ve haklıydı. İki hata üst üste binmişti:

    ⛔ `4 → 5` BAŞKA varyanta aitti — SALTP1314D1AVDF (Casio, 11438301199)
    ⛔ `4` rakamı SAYIM GÜNÜ (27.08) itibarıyladır, BUGÜNKÜ raf değil;
       arada 29.08'de yazılan üç `sayım farkı −1` hareketi var

Sebep: yazım betiği stok değişimini **UUID** ile basıyor, SKU ile değil —
hangi satırın hangi ürün olduğu okunamıyordu.
_(Anayasa: "sonda parametresi ekranın parametresi değildir".)_
✓ `canli:iade-yazim-teyit` → **④ bölümü** artık SKU ile ve BUGÜNKÜ rakamla
basıyor; ekranla aynı parametreden okunuyor.

### 🧾 HALİL TEST LİSTESİ — DÜZELTİLMİŞ (canlı, gerçek cihaz)

⚠ Madde 3 ve 5 düzeltildi; 5 ancak **deploy sonrası** sınanabilir.

1. `/satislar` → `4287210000` → detay: **İade** bölümü, **03.07.2026**,
   `Normal İade` rozeti
2. Aynı ekran: orijinal NET-2 **−756,19** DEĞİŞMEMİŞ; iade etkisi
   **+1.914,86**; iade sonrası **1.158,67**
3. `/stok?q=axcali1797` → **2** _(1 → 2; düzeltildi)_
4. `/stok?q=axcali1761` → **1** _(0 → 1)_
5. ⭐ **DEPLOY SONRASI:** `11409234590` detayı → İade bloğunda
   **"Kayıt notu: IADE_SEBEP[kaynak:ty-claims]: «Beğenmedim»"** satırı
   GÖRÜNMELİ _(bu satır 02.09 akşamına kadar hiç çizilmiyordu)_
6. `/stok?q=SALTP1314D1AVDF` → **5** _(4 → 5 — asıl sahibi bu)_

---

## 🔵 K136 — İADE AÇIĞI KANAL AYRIMI · 02.09.2026 · [ÖLÇÜLDÜ]

> Kullanıcı sordu: _"Bu ciro farkı diğer pazaryerlerinden kaynaklanmış
> olabilir mi? Biliyorsun HB'de ve N11'de de satıyorum, Amazon'da da
> sattım."_ — **Soru meşruydu ve cevabı ölçülmemişti.**

### ⛔ AÇIK 28.08'DEN BERİ KANAL AYRIMI OLMADAN RAPORLANIYORDU

`canli-iade-acigi.ts` içinde `channel` kelimesi **HİÇ geçmiyordu.**
₺694.431 tek bir yığın gibi duruyordu ve hangi pazaryerinden geldiği
sorulmamıştı. _(Anayasa: "kontrol tasarımı, veri kapsamı doğrulanmadan
FARK üretmez".)_

### 📏 ÖLÇÜM — kanal ayrımı eklendi (`npm run canli:iade-acigi`)

    Hepsiburada   115 satır   ₺356.259,97   %52,2
    Trendyol      123 satır   ₺326.197,95   %47,8
    N11 · Amazon        —             —      (açık YOK)

⭐ **BULGU: HB ORANTISIZ.** HB cironun **%35,9**'u ama iade açığının
**%52,2**'si. TY %63,7 ciro ↔ %47,8 açık. Bu, rakam tek yığındayken
görülemezdi.

⚠ N11 (7 satış) ve Amazon (11 satış) küçük ve açık çıkmadı — makul.

### 📏 RAKAM TAZELENDİ (28.08 → 02.09)

    satır   243 → 238      sipariş 238 → 233
    tutar   ₺694.431,92 → ₺682.457,92

⚠ **BU, İADE EDİLEN KALEMLERİN TUTARI** — o satışların tam cirosu
(₺710.189) DEĞİL. İki rakam karıştırılmaz (betiğin kendi uyarısı).
📏 Toplam ciroya oranı: **₺682.458 / ₺17.203.860 = %4,0**

⚠ **SON 30 GÜNDE 0 KAYIT** — açık birikmiş bir geçmiş, BÜYÜMÜYOR.
En yoğun: 2025-10 (23) · 2025-11 (29) · 2025-12 (25) · 2026-01 (23).

### ⭐ KARARA ETKİSİ: K73'ÜN "EKSTRE YOLU" SEÇİMİ GÜÇLENDİ

Açığın **yarısından fazlası HB'de** ve HB'de API yok (kullanıcı kararı
02.09: _"Hepsiburada'nın API'si var ama henüz başlamak istemiyorum"_).
Dolayısıyla **TY `claims` ucu bu açığın ancak %48'ini çözer.**
Ekstre yolu her iki kanalı da kapsıyor — tek yol o.

### ⏭ ÖLÇÜLMEYEN — VE ÖLÇÜLMEDİĞİ YAZILIYOR

**NET-2 etkisi ölçülmedi.** Ciro etkisi ₺682.458 ama kâr etkisi daha
küçük olacak (iade edilen malın maliyeti de geri döndü). Karar için asıl
rakam odur ve **bugün elimizde yok.**

---

## 🔵 K135 — "EKSİK ÖDEME" TEŞHİSİ ÇÜRÜDÜ · 02.09.2026 · [ÖLÇÜLDÜ]

_K134'ten sonra hakediş teyidi ilk kez rakam üretti ve `EKSIK_ODEME 31`
göründü. Ölçüldü — **eksik ödeme DEĞİL.**_

### ⛔ İKİ HİPOTEZ KURULDU, İKİSİ DE ÇÜRÜDÜ

**Hipotez 1 — "pazaryeri eksik ödüyor."** Çürüdü: ölçüm `EKSİK görünen
503 / ölçülebilen 503` verdi, yani **%100**. Hiçbir pazaryeri HER siparişte
eksik ödemez. Bu oran eksik ödemenin değil **TANIM UYUŞMAZLIĞININ**
imzasıdır.

**Hipotez 2 — "komisyon düşülmemiş (K66 deseni)."** Fark/beklenen oranları
komisyon oranlarına benziyordu (%7,3 · %13,5 · %14 · %16) ve K66 tam bu
deseni kaydetmişti. **Ölçüm çürüttü:**

    'soru açık' kümesinin kalemleri : 202
    commissionRate BOŞ olan         : 0   (%0,0)
    profitStatus RULE_MISSING       : 0

⭐ **ORAN BENZERLİĞİ KANIT DEĞİLDİ.** Komisyona benzeyen bir oran başka bir
kesintiden de gelebilir; ayırt edici kanıt `commissionRate` alanıydı ve o
**dolu** çıktı. _(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini
kanıtlamaz".)_

### 📏 ÖLÇÜLENLER — `npm run canli:eksik-odeme` (salt okuma)

    eksik görünen 503 · ölçülebilen 503  →  %100

    negatif kalem TAŞIYAN (netleme)   301   toplam −238.263,65
    yalnız POZİTİF kalem (soru açık)  202   toplam − 72.496,52

    fark/beklenen: min %2,7 · p25 %5,6 · ortanca %8,9 · p75 %14,8 · max %84,4

**HAKEDİŞ VERİSİ DEMONSTRE OLARAK KISMİ:**

    SIPARIS_TUTARI    499 kalem      KOMISYON          138 kalem
    KUPON             153            TAHSILAT_BEDELI   138
    KARGO             140            STOPAJ            135

⚠ 499 sipariş satırına karşılık yalnız 138 komisyon satırı. Kesinti
satırları çoğu siparişte **yüklü değil.**

### ⛔ VE AÇIKLAMA UYDURULMADI

Kısmi veri "eksik görünmeyi" açıklıyor **gibi duruyor** ama yön tutmuyor:
eksik olan `KOMISYON` satırları **negatif** ve yüklenselerdi `gerçekleşen`
DAHA DA düşerdi — fark kapanmaz, büyürdü.

> **Yani bugün elimizde: hipotez 1 çürük, hipotez 2 çürük, kısmi veri
> gözlemi yönü tutmuyor. AÇIKLAMA YOK ve olmadığı yazılıyor.**
> _(Anayasa: "bir soruyu kapatmak, yanındakini de kapattığı anlamına
> gelmez" — açıklanmayan yazılır, uydurulmaz.)_

⏭ **SIRADAKİ ÖLÇÜM:** `SIPARIS_TUTARI`nın tabanı. Anayasada bir ölçüm var —
_"11373352181 · price 2074 · komisyon %8,5 → SIPARIS_TUTARI 1897,71 =
2074 − 176,29"_ — yani satır komisyon DÜŞÜLMÜŞ geliyor. Eğer öyleyse
`beklenen`in tabanı ile satırın tabanı farklı ve mesele bir **taban
uyuşmazlığıdır.** Tek satırda göz göze doğrulanabilir.

⛔ **BU ARADA HİÇBİR EKRANDA "EKSİK ÖDEME" RAKAMI GÖSTERİLMEMELİ.**
Doğrulanmamış bir alacak rakamı, 19.08'deki ₺138K sahte paniğinin aynısını
üretir ve rozetin tamamına olan güveni götürür.

---

## ✅ K134 — HAKEDİŞ BAĞI KURULDU · **1209 KALEM** · 02.09.2026

_Kullanıcı kararı: "TY'yi bitirelim sonra geçelim HB'ye."_ İlk adım bu oldu.

### ⛔ PANODAKİ TEŞHİS BAYATLAMIŞTI — VE BUNU ÖLÇÜM GÖSTERDİ

K8 şöyle diyordu (24.08): _"motor kusursuz, **defter eksik**"_ · _"defter
dolmadan tetik kurmanın anlamı yok."_ **O gün doğruydu. Bugün değildi.**

    TY satış (defterde)   24.08: 121   →   bugün: 3931
    hakediş kalemi              1136   →         1408
    BAĞLI                          ~8  →          130

Defter 24.08'den sonra doldu (2025-01 → 2026-09, aylara düzgün dağılmış) ama
**eşleştirme motoru o günden beri tekrar koşmadı.** Kilit "defter eksik"
değildi artık — kimse kapıyı çalmamıştı.

⚠ **DERS: KAPANIŞ ŞARTI SAĞLANDIĞINDA KİMSE HABER VERMİYOR.** _"Defter
dolunca tetik kurulur"_ diye yazılmış bir kalem, defter dolduğunda
kendiliğinden uyanmaz. Şart yazılırken **onu kimin ölçeceği** de yazılmalı.

### ✅ YAZIM — ÜÇ ŞART DA UYGULANDI

**(a) ANLIK GÖRÜNTÜ ALINDI** (`veri/yedek-yerel/hakedis-bag-oncesi.json`)
ve yazımdan sonra **bit-bit karşılaştırıldı:**

    toplam   1408 → 1408   fark 0
    bağlı     130 → 1339   fark +1209
    bağsız   1278 →   69   fark −1209

    ⛔ önce BAĞLIYKEN şimdi bağsız olan : 0
    ⭐ önce bağsızken şimdi BAĞLI olan  : 1209
    ✓ TUTUYOR — toplam değişmedi, hiçbir mevcut bağ bozulmadı

⚠ **İZ SAYISI KANIT DEĞİL, VERİ KARŞILAŞTIRMASI KANIT.** `AuditLog`
yazıldı ama doğrulama ondan değil, kimlik kümesinin karşılaştırılmasından
geldi — 01.09'da `AuditLog` sayısı `0` görülüp "kısmi yazım yok" denmiş ve
YANLIŞ çıkmıştı.

**(b) YARIM COMMIT MÜMKÜN DEĞİL:** betik **satır satır tekrar-koşulabilir**
kalıpta — her satır bağımsız `updateMany`, ve `WHERE`de `saleId: null`
şartı duruyor. Koşum yarıda kesilse ikinci koşum kaldığı yerden devam eder.
**İkinci koşum doğrulandı: 0 bağlanacak, 7 karşılığı yok.**

**(c) KAPASİTE:** çift eşleşme **0**, kanal uyuşmazlığı **0** — betik
ikisini de reddediyor ve hiçbiri çıkmadı.

### ⭐ SONUÇ: EŞLEŞME ORANI %9 → %95

    hakediş kalemi 1408 · satışa BAĞLI 1339 · oran %95
    rapordaki farklı sipariş no 506 · bugün karşılığı OLAN 504

**H3 kilidi açıldı** — hakediş teyidi ilk kez rakam üretiyor.

### ⚠ YENİ GÖRÜNEN RAKAMLAR — BUNLAR HÜKÜM DEĞİL, DAVET

    TOPLAM beklenen      1.575.699,99
    TOPLAM gerçekleşen   1.584.676,11
    FARK                     8.976,12   (%0,57)

    durum: GECIKTI 296 · FAZLA_ODEME 107 · BEKLIYOR 61 ·
           EKSIK_ODEME 31 · ODENDI 8

⛔ **BU RAKAMLARIN HİÇBİRİ DOĞRULANMADI.** Dün görünmüyorlardı, bugün
görünüyorlar — o kadar. Özellikle:
· `EKSIK_ODEME` örnekleri büyük negatifler taşıyor (−7.033 · −4.608).
  İade/talep netlemesi mi, gerçek eksik ödeme mi **ölçülmedi.**
· `GECIKTI 296` — gecikme ölçütünün bu yeni kümede doğru davrandığı
  sınanmadı. _(Anayasa: 19.08'de "67 kalem gecikti ₺137.975" sahte paniği
  tam bu sınıftandı; o zaman kural "bağsız kalem alacak değildir" diye
  daraltılmıştı ve şimdi bağ kurulduğu için kural kendiliğinden geçerli
  hâle geldi — ama SAYININ doğruluğu ayrı bir soru.)_

⏭ **SIRADAKİ ÖLÇÜM:** bu üç durumun her biri ayrı bakılacak. İlk bakılacak
`EKSIK_ODEME` — çünkü tek satırda ₺7.033 taşıyor ve yönü paraya doğru.

---

## ✅ K132 — HB AVANTAJLI TEKLİFLER (K-HB-TEKLIF) · 02–06.09.2026 · [KAPANDI — teklif girildi]

─── ⭐ **KAPANIŞ: CASIO TEKLİFİ GİRİLDİ** (Halil, 05.09.2026)

HB paneli → **Fiyatı Güncelle = 3658** · kademe 1 · komisyon **%14,10**.
Beklenen etki: adet başına NET-2 **₺198,96 → ₺219,07** (**+%10,1**).

⭐ **RAKAM BAĞIMSIZ DOĞRULANDI (06.09.2026).** Motor ikinci kez
çağrılmadı — dört kademe **kanalın kendi kesinti kurallarından ELLE**
hesaplandı (komisyon ×1,20 · stopaj KDV-hariç %1 · ödeme gideri %0,8 ·
hizmet 12,60 · FIFO 2.697,75) ve **dördü de panonun tablosuyla kuruşuna
tuttu**. _(Anayasa: bağımsızlık KAYNAĞIN ayrılığıyla ölçülür — aynı motoru
tekrar koşturmak aynı kaynağı iki kez sormaktır.)_

    kademe 1  3.658 · %14,10 → 219,07   ⭐ +%10,1   ← GİRİLEN
    kademe 2  3.475 · %11,30 → 192,41      −%3,3
    kademe 3  3.292 ·  %9,10 → 135,75   ⛔ −%31,8

⏭ **TEYİT — VADELİ (Halil kararı 06.09.2026):** sonraki kanal taramasında
Casio DW-9052 / HB için `ChannelSku.commissionRate` **%14,1**'e düşmüş
olmalı. **7 gün içinde düşmezse kutuda uyarı:** _"teklif işleme girmemiş
olabilir, HB panelinden kontrol et."_
⛔ **SÜRESİZ BEKLEYEN TEYİT, TEYİT DEĞİLDİR** — bu yüzden vade yazıldı.
Vade başlangıcı giriş günü (05.09) → **son gün 12.09.2026.**

### 🟢 ÖZGÜN KAYIT — HB AVANTAJLI TEKLİFLER · 02.09.2026 · [KOD KOŞTU]

_06.09.2026'da BİRLEŞTİRİLDİ._ Bu kayıt ayrı bir `## K132` başlığı olarak
duruyordu; `pano:dogrula` kimliği iki satırda buldu ve push'u durdurdu.
Kimlik TEKİLDİR — aynı kalemin ikinci fazı yeni satır açmaz, mevcut
satırın devamı olur. **Metnin tek satırı elden geçmedi**; yalnız başlık
düzeyi `##` → `###` indi ve aradaki `---` ayıracı kalktı.

_Kullanıcı HB tarife ekranına `Avantajlı_Teklifler-02-09-2026-10_00.xlsx`
yükledi, ekran reddetti. **Ekran haklıydı, mesajı yanlıştı.**_

### ⛔ BU DOSYA TARİFE DEĞİL — VE YÜKLENSEYDİ KÂRI BOZARDI

HB koşullu teklif veriyor: _"fiyatı 8.886'ya indirirsen komisyonu %13'ten
%4,7'ye düşürürüm."_ Oran ancak teklif KABUL EDİLİP fiyat düşürülürse
geçerli. Tarife tablosuna girseydi `dilimBul` **bugünkü 15.269'luk fiyata**
%4,7 uygulardı — komisyon olduğundan DÜŞÜK, **NET olduğundan YÜKSEK** çıkar
ve rakam tamamen makul görünürdü.

⭐ **AYNI KORUMA SINIFI:** 20.08.2026'da Trendyol'un "İndirimli Komisyon
Tarifeleri" dosyası için birebir aynı karar verilmişti.

### ✅ ① MESAJ DÜZELTİLDİ — YENİ ENGEL KODU `TEKLIF_DOSYASI`

Eskiden `SUTUN_EKSIK` düşüyordu: doğru ama kullanışsız teşhis, üstelik
_"henüz desteklenmiyor"_ diye okunuyordu — yani "eksik özellik, sonra
eklenir". Oysa bu dosya **hiçbir zaman** tarife olarak yüklenmemeli.

⚠ **TANIMA YAPIYA BAĞLI, ADA DEĞİL:** iki satırlı başlık (`Teklif N` üstte,
`Üst Fiyat`/`Komisyon` altta). Dosya adı yalnız **ikinci onay** — ve bu
güvenli, çünkü tanıma **yalnız okuma ZATEN DÜŞTÜĞÜNDE** danışılıyor: yanlış
pozitifin bedeli bozuk veri değil, yanlış bir mesaj.

⚠ **VE BÜTÜN SAYFALAR TARANIYOR:** bu dosyanın İLK sayfası "Açıklama"
(kolon sözlüğü), veri "Teklifler"de. Mevcut hata mesajı **yanlış sayfaya
bakarak** üretiliyordu.

⚠ **İKİ YOL DA TANIYOR:** "Önce göster" ile "Yaz" aynı cevabı veriyor;
ayrışsaydı aynı dosyaya iki farklı hata çıkardı.

**Bekçi `tarife:dogrula` 136 → 142 ölçüt · mutasyon 3/3 KIRMIZI**
(yalnız ilk sayfaya bakma · yalnız "Teklif" kelimesine bakma [yanlış yanma] ·
dosya adı tanımasını kaldırma).
⚠ **VE BİR SABİT SAYI ESKİDİ, SUSTURULMADI:** `kodlar.length === 4` ölçütü
beşinci kod eklenince kırmızı yandı — kod doğruydu, ölçüt eskiydi. Sayıya
değil KAPSAMAYA bağlandı.

### ✅ ② SALT OKUMA DEĞERLENDİRME — `npm run canli:hb-teklif -- "<dosya>"`

⭐ **KÂR HESABI YENİDEN YAZILMADI:** `simulasyonKur` çağrılıyor — fiyat
denemesi ekranının gövdesinin aynısı. İkinci bir hesap yazsaydım biri
değişince öteki sessizce ayrışır, iki ekran aynı fiyata iki NET-2 verirdi.

    incelenen 24 · EŞLEŞTİ 24 · EŞLEŞMEDİ 0 · maliyetsiz 1
    (eşleşme HB SKU üstünden — dosyada barkod kolonu YOK)

⛔ **SONUÇ NET: 23 değerlendirilebilir teklifin 16'sı SATIŞI ZARARA
ÇEVİRİYOR.** Bugünkünden iyi olan **1 tane** (Casio, 0,9×).

    ÜRÜN                          BUGÜN N2   EN İYİ N2   ÇARPAN
    Delonghi Dedica               3.417,16     -238,93   ⛔ ZARAR
    Jbl Xtreme 3                  2.483,35    1.083,57      2,3×
    LEGO Icons Retro Radyo        1.058,72     -122,84   ⛔ ZARAR
    Anker Nano 45W                  409,17      217,72      1,9×
    Casio DW-9052                   198,96      219,06      0,9×  ⭐

⚠ **RAPOR HÜKÜM VERMİYOR — TALEP TAHMİNİ YOK.** Çarpan yalnız başabaşı
ölçer: _"2,3× = bugünkü parayı kazanmak için 2,3 kat satmalısın."_ Satılıp
satılamayacağını sistem BİLMEZ ve tahmin etmez; kararı operatör verir.

⚠ **KARGO HARİÇ VE BEYAN EDİLİYOR:** dosya desi taşımıyor. Kargo iki
senaryoda da aynı olduğu için karşılaştırmayı etkilemez, ama rakamlar
panelin NET-2'siyle **birebir aynı değildir.**

⚠ **STOK SÜTUNU KARARIN PARÇASI:** 24 üründen **10'unun stoğu 1–3.** Stoğu
1 olan üründe "2,3 kat sat" zaten imkânsız — teklif orada anlamsız.

⚠ **BİRİM DOĞRULANDI:** komisyonlar yüzde olarak geliyor (mevcut %10–18,
teklif %3–14,1); 1'den küçük değer YOK, yani kesir/yüzde karışıklığı yok.
Açıklama sayfasında örnek `0.15` diye geçiyordu — ölçülmeseydi bütün
komisyonlar 100 kat yanlış olabilirdi.

⚠ **VE BİR KANAL KODU VARSAYIMI YAKALANDI:** betiği `"HB"` koduyla yazdım,
gerçek kod `HEPSIBURADA`. Eşleşmeyince betik boş dönerdi ve **boş dönüş
makul görünürdü** — anayasadaki "kanal adına gömülü sözlük" tuzağı. Kod
ölçüldü, ve bulunamazsa artık mevcut kodlar EKRANA basılıyor.

**Çıktı:** `raporlar/hb-teklif-degerlendirme-0209.csv` (60 satır, kademe
başına bir satır).

### ⛔ TARİH DÜZELTMESİ — VE ÖLÇÜM İKİMİZİ DE DÜZELTTİ

Kullanıcı _"teklif bitişi 08.09 23:59"_ dedi, ben rapora `09.09` yazmıştım.
Ölçüldü — **ikimiz de kendi saat dilimimizi okuyorduk:**

    ham damga (dosyada)   2026-09-08T23:58:59.999Z   ← kullanıcının okuduğu (UTC)
    makine yereli (DE)    09.09.2026 01:58            ← benim okuduğum
    ⭐ İSTANBUL İŞ SAATİ   09.09.2026 02:58            ← GEÇERLİ OLAN

Anayasa iş saat dilimini SABİTLİYOR (`Europe/Istanbul`); ne UTC damgası ne
makinenin yereli hüküm kurar. _(Anayasa: "dış kaynağın kendi etiketiyle
karşılaştır — iç tutarlılık kaymayı gizler".)_

⛔ **VE ASIL BULGU: BÜTÜN TEKLİFLER AYNI GÜN BİTMİYOR.** "Karar penceresi
6 gün" cümlesi 24 ürünün hepsi için doğru değil — **beş farklı bitiş var:**

    07.09.2026 02:58    1 ürün    ← 5 gün
    09.09.2026 02:58   16 ürün    ← 7 gün  (Casio dahil)
    22.09.2026 02:58    2 ürün
    24.09.2026 02:58    1 ürün
    01.10.2026 02:58    4 ürün    ← 29 gün

Tek bir pencere yazmak, 20+ günü olan 7 ürünü gereksiz aceleye sokardı ve
5 günü olanı geç fark ettirirdi. Tarih artık **satır başına** CSV'de.

### 📌 KARAR KAYDI (Halil, 02.09.2026)

| Küme | Sayı | Karar |
|---|---|---|
| Teklif NET-2'si ≤ 0 (zarar) | **16** | 🔴 **RET** |
| Gri bölge — çarpan 1,9–2,3 ve/veya stok 1–3 | **6** | 🔴 **RET** |
| Casio DW-9052 — tek aday | **1** | ✅ **KABUL — 3658 girildi (05.09.2026)** |
| Maliyeti yok (raf 0) | 1 | değerlendirilemedi |

**Casio — ÜÇ KADEMESİ AYRI AYRI ÖLÇÜLDÜ (bugün 3.850 / %18 → ₺198,96):**

    kademe 1   3.658 TL   %14,10   →  ₺219,06   0,91×   ⭐ BUGÜNDEN İYİ
    kademe 2   3.475 TL   %11,30   →  ₺192,41   1,03×      bugünden kötü
    kademe 3   3.292 TL   %9,10    →  ₺135,76   1,47×   ⛔ %32 KÖTÜ

### ✅ ÇELİŞKİ ÇÖZÜLDÜ · 03.09.2026 — HESAP DEĞİL, ETİKET YANLIŞTI

_Halil: "iki hesabı yan yana koy; hangisi yanlıştı, neden?"_

⭐ **HİÇBİR HESAP YANLIŞ DEĞİLDİ.** Motor (`simulasyonKur`) 02.09'da ve
03.09'da **birebir aynı** rakamları verdi. Üç kademe, kalem kalem:

| kademe | fiyat | kom % | FIFO maliyet | komisyon | stopaj | ödeme gid. | hizmet | ödenecek KDV | **NET-2** |
|---|---|---|---|---|---|---|---|---|---|
| **bugün** | 3.850,00 | 18,00 | 2.697,75 | 831,60 | 32,08 | 30,80 | 12,60 | 46,21 | **198,96** |
| **1** | 3.658,00 | 14,10 | 2.697,75 | 618,93 | 30,48 | 29,26 | 12,60 | 49,91 | **219,06** ⭐ |
| 2 | 3.475,00 | 11,30 | 2.697,75 | 471,21 | 28,96 | 27,80 | 12,60 | 44,27 | 192,41 |
| 3 | 3.292,00 | 9,10 | 2.697,75 | 359,49 | 27,43 | 26,34 | 12,60 | 32,64 | **135,76** ⛔ |

**MEKANİZMA TEK CÜMLE:** fiyattan vazgeçilen para, komisyondan kazanılan
paradan büyük olduğu anda kademe kötüleşir — ve bu yalnız 1. kademede
lehimize.

    kademe 1   fiyat −192,00   komisyon +212,67   →  NET-2 +20,10  ✅
    kademe 2   fiyat −375,00   komisyon +360,39   →  NET-2  −6,55
    kademe 3   fiyat −558,00   komisyon +472,11   →  NET-2 −63,20  ⛔

⛔ **HATA NEREDEYDİ — GİT'TEN OKUNDU, HATIRLAMAYLA DEĞİL.** Commit
`e0704cc` (02.09) şöyle yazıyordu:

    "bugün NET-2/adet ₺198,96 → teklifte ₺219,06, çarpan 0,9×.
     Toplam kazanç ~₺40 (2 adet × ₺20,10)."
    "HB panelinden `Fiyatı Güncelle = 3292` girilir."

**₺219,06 · 0,9× · ₺20,10 — ÜÇÜ DE 1. KADEMENİN.** Paragraftaki tek yanlış
şey FİYATTI: 3. kademeninki yazılmıştı.

⭐ **KÖK SEBEP: ÖZET KADEME ETİKETİNİ DÜŞÜRDÜ.** Üç kademe tek satıra
indirildi ("en iyi NET-2") ve rakam **hangi kademeye ait olduğu
söylenmeden** taşındı. Etiket düşünce fiyat herhangi bir satırdan
alınabilir hâle geldi ve hiçbir şey itiraz etmedi — en derin indirim
sezgiyle "en iyi teklif" sanıldı. Panonun kendi satırı bu tuzağı zaten
adlandırıyor: _"KOMİSYON EN ÇOK DÜŞEN KADEME EN İYİSİ DEĞİL."_
_(Anayasa: "bir sayı etiketiyle taşınır".)_

⛔ **GİRİLECEK RAKAM: `3658`.** `3292` girilseydi teklif "kabul edildi"
sanılır, adet başına **₺63,20** kaybedilirdi.

⚠ **KOMİSYON EN ÇOK DÜŞEN KADEME EN İYİSİ DEĞİL.** Kademe 3'te komisyon
%18→%9,1 (yarı yarıya) ama fiyat 3.850→3.292 düşüyor; fiyat kaybı komisyon
kazancını yiyor. "En büyük indirim en iyi teklif" sezgisi burada yanlış —
ve tam bu yüzden rapor **her kademeyi ayrı** hesaplıyor.

⚠ **VE KAZANÇ SANILANDAN KÜÇÜK — İKİ STOK RAKAMI ÇELİŞİYOR:**
dosya **stok 2** diyor, bizim defterde **raf 1**. Kazanç 2 adetse ~₺40,
1 adetse ~₺20. Çelişki bu karar için önemsiz (ikisi de küçük) ama
**kayda geçiyor**: HB'de bilmediğimiz bir adet var ya da defter eksik.

⭐ **KABUL EDİLİRSE SİSTEM TARAFINDA İŞ YOK:** HB panelinden
`Fiyatı Güncelle = 3658` girilir, o kadar. Sonraki kanal taraması yeni
komisyonu **kendiliğinden** görür — elle oran girilmez, tarife yüklenmez.

⚠ **~₺20 İÇİN KARAR YİNE HALİL'İN:** rapor talep tahmini yapmıyor.
Sistem hüküm vermez.

### ⏭ KALICI EKRAN — ⭐ AÇILIŞ ŞARTI DOLDU (02.09.2026)

Şart _"dosya periyodik gelirse"_ idi ve **Halil aynı gün bildirdi: dosya
periyodik geliyor.** Yani tüketici doğdu; kalıcı "teklif değerlendirme"
ekranı artık şarta bağlı değil, **sıraya girdi.**

⛔ **AMA HEMEN YAZILMIYOR — SIRA A3'TE.** Kullanıcı kararı: _"API'den önce
hepsini temizleyelim."_ Temizlik bitti; bu ekran YENİ İŞ ve A3'ten sonraya
kalır. Bugünkü betik her yeni dosyada koşabilir, yani boşluk yok.

**Ekran yazıldığında ne gerekecek (bugünden ölçülmüş):**
· eşleştirme HB SKU üstünden — barkod kolonu YOK
· iki satırlı başlık ayrıştırma (`Teklif N` + `Üst Fiyat`/`Komisyon`)
· bitiş tarihi **satır başına** ve **İstanbul** saatinde
· kâr `simulasyonKur`dan — ikinci hesap YAZILMAZ
· kargo hariç beyanı her NET-2 rakamının **yanında**

### 🔶 HALİL TEST LİSTESİ

1. `/ayarlar/tarife` → Hepsiburada — AXCALI seç → **aynı dosyayı** yükle →
   **"Önce göster"**.
   → Kırmızı kutuda **"Bu bir Avantajlı Teklifler kampanya dosyası — tarife
   DEĞİL…"** yazmalı. ⛔ "sütunlar bulunamadı" yazıyorsa test DÜŞER.
2. Aynı dosyayla **"Yaz"** dene → **aynı** mesaj çıkmalı (iki yol ayrışmasın).
3. **Gerçek bir HB komisyon tarifesi** yükle → normal önizleme açılmalı.
   ⛔ Bu adım geçmezse tanıma fazla geniş demektir.

---

## ✅ K129 — ÜRÜN ANALİZİ TAM LİSTESİ · **HALİL TESTİ GEÇTİ 02.09.2026**

> **Halil onayı:** yoğunlaşma cümlesi tıklanıyor, problem yok.
> ⚠ İlk denemede tıklanmıyordu — sebep koddaki bir hata DEĞİL, **deploy
> gecikmesiydi**; kullanıcı eski sürümü görüyordu. Ayırt edici kontrol
> ("Tam listeyi aç" düğmesi ve menüde "Ürün analizi" var mı") bunu bir
> turda ayırdı. _(Anayasa: "sınanmamış ekran, ekran değildir" — ama
> "ekran yok" ile "ekran henüz yayınlanmadı" AYRI şeyler.)_

_Kullanıcı isteği 02.09.2026, beş madde. **A paketi (1-4) teslim edildi;**
B paketi (`/stok` yaş kovaları) sırada._

> Kullanıcı: _"Kârının %70,5'i 39 üründen geliyor. Burası çok önemli bir veri,
> süzülebilir ve listelenebilir olmalı."_ Panel bir HÜKÜM veriyordu, DÖKÜMÜ
> yoktu — düz metin olarak yazılan bir hüküm okuyanı "hangileri?" diye
> aramaya bırakır ve çoğu zaman aranmaz (İlke #16).

### ✅ TESLİM — `/rapor/urunler`, TEK SAYFA DÖRT EKSEN

⛔ **DÖRT AYRI SAYFA AÇILMADI.** Dördü de aynı kümeyi farklı sıralıyor;
dört sayfa dört ayrı süzgeç kodu ve dört ayrı bakım demekti, ikisi
ayrıştığı gün aynı soruya iki cevap doğardı (İlke #10).

· **dağılım** (kümülatif pay) · **verim/marj** · **hacim** · **stokta bekleyen**
· süzgeç: marka · kategori · en az adet · en az ciro · sıralama+yön
· satır tavanı **25/50/100**, varsayılan **50** — kullanıcı şartı birebir
· masaüstünde tablo, telefonda kart listesi (İlke #8); JavaScript'siz GET formu

📏 **ÖLÇÜM PLANI DEĞİŞTİRDİ:** marka süzgeci yazılmadan önce doluluk ölçüldü —
`Product.brand` **1090/1100 (%99,1)** dolu (LEGO 221 · Karaca 159 · TEFAL 101).
Boş çıksaydı süzgeç yazılmayacaktı; ölü süzgeç, olmayan bir yeteneği vaat eder.
Kategori **%100** dolu çıktı ve bedava ikinci eksen oldu.

### ⛔ İKİ EKSEN İKİ AYRI KÜMEYE BAKAR — VE BU EKRANDA YAZAR

Satış eksenleri "dönemde satılan"a, stok ekseni "bugün rafta duran"a bakar.
Tek sorguya sıkıştırmak cazipti ve **yanlış olurdu**: dönemde hiç satılmamış
ama aylardır bekleyen mal satış kümesinde HİÇ GÖRÜNMEZ — oysa ölü sermayenin
ta kendisi odur. Stok ekseninde dönem/kanal süzgecinin **uygulanmadığı
ekranda yazıyor**; sessizce yok sayılsaydı kullanıcı "temmuzu seçtim, rakam
değişmedi" diye sisteme güvenini yitirirdi.

### ⚠ YAZARKEN ÜÇ HATA YAPILDI VE ÜÇÜ DE ÖLÇÜMLE YAKALANDI

① **Kendi ayıracımı kurmuştum** (`marka=A~B`). Onay kutusu ızgarası zaten
tekrarlı parametre üretiyor; ayıraç bir gün marka adının içinde geçerdi ve
süzgeç **sessizce** iki markaya bölünürdü. Tekrarlı parametreye çevrildi.
② **Pencere sözleşmesini kendim tanımlamıştım** (`lte: bitis`); repo yarı
açık aralık kullanıyor (`lt: bitisHaric`). Sınır günü iki ekranda farklı
davranırdı ve fark yalnız ayın son gününde görünürdü.
③ **`Ortak.tersAralik` anahtarının var olduğunu VARSAYMIŞTIM** — `Rapor`
ad alanındaymış; `i18n:kontrol` yakaladı.

### ⚠ BİR İŞARET DENENDİ VE TABAN ORANIYLA ELENDİ

Sıralama önceliği için _"kaynak partisi tükenmiş"_ benzeri bir işaret
düşünülmedi; onun yerine **para** ölçüt yapıldı. _(K128'de aynı sınıftan bir
işaret ölçülüp elenmişti: %50,0 ↔ %59,5.)_

**Bekçi `urun-analizi:dogrula` 65 ölçüt · 8 bölüm · mutasyon 11/11 KIRMIZI.**
Mutasyonlar iki yönlü: davranışı KALDIRAN 8 (toplam kırpık listeden ·
null başa · markasız satır geçiyor · tavan sabit · `~` bölmesi geri geldi ·
sermaye sıfır sayılıyor · panel adresi elle · bölüm sayacı düştü) ve
FAZLADAN yapan 3 (pareto her sırada · eksen varsayılanları tek değer ·
hesaplanamayan sayısı sıfırlanıyor).
⭐ **Ölçütlerin çoğu DEĞER TESTİ** — gövde saf olduğu için kaynak taranmıyor;
desen yanlış yerde bulunamaz çünkü desen aranmıyor.

### 🔶 HALİL TEST LİSTESİ — canlıda, gerçek cihazda

1. Panel → **Ürün analizi** → "Dağılım" sekmesi → _"Kârının %70,5'i 39
   üründen geliyor"_ cümlesine **TIKLA**.
   → `/rapor/urunler` açılmalı, **satır tavanı 50**, sıra **NET-2 azalan**,
   ve listenin ilk 39 satırının kümülatif payı **%70,5'e ulaşmalı**.
   ⛔ Cümledeki sayı ile listedeki sayı TUTMUYORSA test DÜŞER.
2. Sekmelerden **"Stokta bekleyen"** → dönem süzgecini değiştir.
   → Rakam **DEĞİŞMEMELİ** ve ekranda bunun sebebi yazıyor olmalı.
3. **Marka** kutusunu aç → `LEGO` + `Karaca` işaretle → Uygula.
   → Üstteki toplam **süzgecin tamamının** toplamı olmalı; satır tavanını
   25'e düşür, **toplam DEĞİŞMEMELİ** (yalnız görünen satır sayısı azalır).
4. **Satır** seçicisini 100 yap → 100 satıra kadar listelenmeli.
5. **Telefonda** aç: tablo yerine kart listesi çıkmalı, marka kutusu
   parmakla işaretlenebilmeli.
6. Sıralamayı **"Ürün adı"** yap → dağılım sekmesinde kümülatif pay sütunu
   **KAYBOLMALI** ve niye gösterilmediği yazmalı.

⏭ **B PAKETİ SIRADA:** `/stok` yaş kovaları (`<15 · 15-30 · 30-45 · 45-60 ·
60-90 · 90-180 · 180+`). ⭐ Ölçüldü: `/stok`ta **zaten** yaş süzgeci var
(`YAS_SUZGEC_KODU`, 3 bant) — iş sıfırdan değil, 3 bandı 7 kovaya
genişletmek. ⛔ Rozet eşiklerine (31/61 gün) DOKUNULMAYACAK: onlar
14.08.2026 mimar kararı ve ÖLÇÜLMÜŞ; yeni kovalar SÜZGEÇ, rozet değil.

---

## ✅ K131 — RAF YAŞI KOVALARI · **HALİL TESTİ GEÇTİ 02.09.2026**

> **Halil onayı:** eski bağlantı çalışıyor — `/stok?yas=kirmizi` açılıyor.
> Kovaları eski kodların YERİNE koysaydım bu bağlantı hiçbir hata vermeden
> boş liste açacaktı; test tam onu sınadı ve geçti.

_Kullanıcı isteğinin 5. maddesi (B paketi). Sınırlar **kullanıcı tarafından
düzeltildi** — ilk yazımım kusurluydu._

> Kullanıcı: _"Stok sayfasında bunlara göre sıralama olsun (örn. 15 günden az
> · 15-30 · 30-45 · 45-60 · 60-90 · 90-180 · 180 günden fazla)."_

### ⭐ KULLANICI SINIR SEMANTİĞİNİ DÜZELTTİ — VE HAKLIYDI

İlk yazımda sınırlar **yarı açıktı** (`15-30` = gün 15..29). Kullanıcı sordu:

> _"Ara rakamlarda olanlar nerede gösteriliyor? Acaba bir sonraki süzgeci
> 1 sayı fazlasından mı başlatsak — 16–30, 31–45, 46–60, 61–90, 91–180, 181+?"_

**Kayıp yoktu** (30 günlük kalem `30-45`teydi) ama **etiket belirsizdi**:
`15-30` yazan çipe bakan biri 30'un hangi kovada olduğunu bilemez.

⛔ **VE ÖLÇÜM DAHA BÜYÜK BİR KUSUR GÖSTERDİ — BANDI KESİYORDU:**

    ESKİ  30-45 → gün 30..44 = NÖTR + AMBER karışık     ⛔
    ESKİ  60-90 → gün 60..89 = AMBER + KIRMIZI karışık  ⛔
    bandı kesen kova: 2/7

Yani tek bir kovada **iki farklı renkte satır** çıkıyordu. Kullanıcının
önerisiyle kesişme **0/7** ve kovalar rozet bantlarının İÇİNE tam oturuyor.
_(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez" — burada ölçüm sınırı
çevirtti.)_

### 📏 CANLI ÖLÇÜM — `npm run canli:yas-dagilimi` (salt okuma)

    rafta stoğu olan 230 kalem · ortanca 53 gün · p75 135 · max 536

    0-15      83 kalem   ₺466.785,13
    16-30     10 kalem   ₺ 68.276,96
    31-45     15 kalem   ₺256.532,72
    46-60     12 kalem   ₺155.372,54
    61-90     29 kalem   ₺305.873,80
    91-180    53 kalem   ₺506.051,27
    181+      28 kalem   ₺178.813,14

    BOŞ KOVA 0/7 · KAPSAMA TAM (230 = 230)

    ⭐ KOVA/BANT ÖRTÜŞMESİ — üçü de tutuyor:
       NÖTR     93 = 0-15 + 16-30              93  ✓
       AMBER    27 = 31-45 + 46-60             27  ✓
       KIRMIZI 110 = 61-90 + 91-180 + 181+    110  ✓

**90 günden uzun bekleyen 81 kalem / ₺684.864.**

### ⛔ İKİ SÖZCÜK DAĞARCIĞI — ESKİ KODLAR YERİNDE KALDI

Panelin "ölü sermaye" rozeti **`/stok?yas=kirmizi`**'ye gidiyor (110 kalem).
Kova kodları o kodun YERİNE konsaydı bağlantı hiçbir hata vermeden **boş
liste** açardı. Tek `yas` parametresi, tek kapı (`yasSeciminiCoz`), iki
dağarcık: **BANT** (31/61 — ölçülmüş mimar kararı, DOKUNULMADI) ve **KOVA**.

⭐ Kovalar bantlara uyduruldu, **bantlar kovalara değil**: kullanıcının
süzgeci taşınabilir, ölçülmüş bir eşik taşınamaz.

### ⚠ VE MEVCUT BİR HATA ORTAYA ÇIKTI, DÜZELTİLDİ

`/stok`taki aktif süzgeç rozeti **koşulsuz "61+ gündür bekleyenler"** yazıyordu
— `?yas=amber` seçiliyken bile. Rozet, süzgecin GERÇEKTE ne süzdüğünü yanlış
söylüyordu; kovalar eklenince aynı satır yedi kez daha yanlış olacaktı.
_(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_

### ✅ NEREYE KONDU

· **`/stok`** — yedi kova çipi, `YAS_KOVALARI` dizisinden çiziliyor
· **`/rapor/urunler` stok ekseni** — aynı kovalar (İlke #10). ⛔ Öteki
  eksenlerde ÇİZİLMİYOR: satış satırlarının `yasGun`u `null`, kova seçilse
  boş liste açardı.
· **Ölçüm betiği kovaları GÖVDEDEN okuyor** — ikinci bir sınır listesi yok;
  olsaydı ölçüm bir sınır, ekran başka bir sınır kullanır ve rapor
  "doğrulanmış" görünürdü.

**Bekçi `urun-analizi:dogrula` 95 → 106 ölçüt · mutasyon 17/17 KIRMIZI.**
⭐ En değerli ölçüt kullanıcının bulgusundan doğdu: **hiçbir kova bir rozet
bandını KESMEZ** — ve ölçüt sınır SAYILARINA değil, `kovaBul` + `yasBandi`
gövdelerinin DAVRANIŞINA bağlı. Mutasyon: sınırı yarı açığa döndüren senaryo
kırmızı yanıyor.

### 🔶 HALİL TEST LİSTESİ

1. **Panel → Ürün analizi → "Dağılım (nereye yoğunlaşmalıyım)" sekmesi →
   üstten İKİNCİ kırmızı rozet: `110 kalem 61+ gündür rafta · ₺… bağlı`**
   → tıkla → `/stok?yas=kirmizi`, **110 kalem**, ekrandaki süzgeç rozeti
   **"61+ gündür bekleyenler"**. ⛔ Boş liste = test DÜŞER.
   ⚠ **İLK YAZIMDA BU MADDE UYGULANAMAZDI:** rozeti iç adıyla ("ölü sermaye")
   yazmıştım; ekranda o metin **HİÇ GEÇMİYOR** ve kullanıcı aradı, bulamadı.
   Test listesi ekranda YAZAN metni söyler, kodun içindeki adı değil.
   _(Anayasa: "kural doğru mu değil, teslim edilebilir mi" — talimatın
   kendisi de bu süzgeçten geçer.)_
2. `/stok` → **"91–180 gün"** → **53 kalem**, rozet **"Raf yaşı: 91–180 gün"**.
3. Aynı çipe **tekrar** bas → süzgeç kalkar, tüm liste döner.
4. **"15 gün ve altı"** → 83 · **"16–30 gün"** → 10 · **"181 günden fazla"** → 28.
5. ⭐ **ÖRTÜŞME TESTİ:** "31–45" (15) + "46–60" (12) = **27**, ve bu sayı
   panelin AMBER bandıyla aynı olmalı.
6. `/rapor/urunler` → **Stokta bekleyen** → aynı kovalar, **aynı sayılar**.
7. **Dağılım** sekmesine geç → kova çipleri **GÖRÜNMEMELİ**.
8. **Telefonda** çipler parmakla basılabilmeli (44 px).

---

## ✅ K130 — PANO KİMLİK ARACI KAPANDI · 02.09.2026 · [KOD KOŞTU]

⛔ **ARAÇ 16 NUMARA GERİDEYDİ.**

    npm run pano:sonraki  →  "K → K128"    (100 kimlik okundu)
    gerçek en büyük       →  K144

Kimlikler yalnız **tablo satırından** okunuyordu (`| **K128** |`); pano ise
kalemlerin çoğunu **başlık** olarak yazıyor (`## 🚨 K138 — …`).
📏 Ölçüldü: başlık biçimli **71**, tablo satırı **42**.

⚠ **BEDELİ AYNI GÜN ÖDENDİ:** K138–K144 araca sorulmadan ELLE numaralandı,
çünkü yanlış söyleyeceği biliniyordu. Aracın kurulma gerekçesi tam da elle
atamanın üç kez tutmamasıydı — araç kendi kör noktası yüzünden kurulma
sebebini geri getirmişti.

### ⭐ ÇÖZÜM — TEK GÖVDE, İKİ BİÇİM

`satirKimligi(satir)` eklendi ve **üç çağıran** ona bağlandı
(`pano:sonraki` · `pano:dogrula`nın iki yeri). Biçim listesi çağıranlarda
dursaydı biri güncellenip öteki unutulurdu — kusurun kendisi zaten öyle
doğmuştu.

    K128 → K145   ·   okunan kimlik 100 → 151

### ⛔ DESEN İKİ TUZAK TAŞIYOR — İKİSİ DE ÖLÇÜLDÜ, İKİSİ DE KAPANDI

**① Satır ortasındaki atıf kimlik DEĞİLDİR.**
`## ✅ DEFTER ONARIMI — KAPANDI (K20 · K21 · K22)` üç kod geçiriyor ama
başlığın kimliği hiçbiri değil. Kod **başlığın BAŞINDA** aranıyor.

**② Alt bölüm aynı kodu tekrar eder — ve bu MEŞRUDUR.**
`### 📐 K55 ÖLÇÜLDÜ` · `### 🚦 K55 KURU KOŞUM` · `### ✅ K55 KOŞTU` —
altısı da K55'in alt bölümü. Ölçüldü: `###`+ düzeyinde **8 kod** meşru
olarak tekrar ediyor; sayılsalardı bekçi sekiz sahte çakışma üretip
kullanılamaz hâle gelirdi.
⭐ Ölçüt: kalem başlığı **tam iki diyez**. `##` düzeyinde tekrar eden 5 kod
vardı ve **beşi de gerçek kusur** çıktı — sahte pozitif yok.

### 🐞 VE AÇILINCA ALTI ÇAKIŞMA ÇIKTI — İKİSİ BUGÜN BENİM ÇÖPÜMDÜ

    K137  ×2   ⛔ 106 satır BİREBİR aynı blok, iki kez yazılmış  → SİLİNDİ
    K136b ×2   ⛔ bayat "[SIRADA]" kopyası kalmış               → SİLİNDİ
    K74 · K84 · K66 · A3   iki fazlı teslim (eski)             → alt bölüme İNDİRİLDİ

⚠ **SİLMEDEN ÖNCE ÖLÇÜLDÜ:** K137 blokları satır satır karşılaştırıldı
(birebir aynı), K136b'nin bayat kopyası özgün bilgi taşımıyor diye
anahtar kelimeyle sınandı. Panonun yedeği alındı.
⭐ İki fazlı olanlar **silinmedi** — `##` → `###` indirildi. İçerik aynen
duruyor, yalnız kimlik üretmiyor; anayasa zaten "ikinci faz yeni satır
açmaz, aynı satırın devamıdır" diyor.

### ⛔ VE İLK MUTASYON TURU BİR ÖLÇÜT KAÇIRDI — EN ÖNEMLİSİNİ

Başlık desenini **tamamen kaldıran** mutasyon **YEŞİL GEÇTİ**: kimlik
okunmayınca çakışma da olmuyor. Yani bekçi, aracın **kör hâlini "temiz"
diye onaylıyordu.**

⭐ Anayasadaki `EVERY` kapısı dersinin aynısı: bir kapı yalnız "çakışma var
mı" diye sorarsa **tabanın BOŞ olması kapıyı açar.** Taban doluluğu AYRICA
kanıtlandı:

    ⭐ panodan en az 100 kimlik okunuyor   (bugün 139)
      ...ve en az 40'ı BAŞLIK biçiminden   (bugün 71)

Ve okuyucunun kendisi **değer testiyle** sınandı (kaynak taraması yok):
tablo · başlık · simgesiz başlık · harf ekli kimlik okunuyor; satır ortası
atıf, alt bölüm ve kodsuz başlık okunmuyor.

✓ **4/4 mutasyon kırmızı** · `pano:dogrula` 27 ölçüt
---

## ✅ K128 — SAYIM FAZLASININ MALİYETİ · **KAPANDI 02.09.2026**

> **Kapanış cümlesi (kullanıcı):** _"Önemsiz bir fark: sistem akışını
> bozmuyorsa mühim değil."_ — ve kriter ÖLÇÜLEREK uygulandı, varsayılmadı.

### ⭐ KAPANIŞ ÖLÇÜMÜ — `npm run canli:parti-oykusu -- --hepsi`

Soru bütün sayım fazlalarına soruldu: _sayım anında SAYIM PARTİSİ DIŞINDA
açık parti var mıydı, ve varsa FİYATI FARKLI MIYDI?_ Yoksa "en son parti"
ataması defterle tutarlı **tek seçenektir** ve soru kendiliğinden kapanır.

    incelenen sayım fazlası partisi   77
    ✓ SORU KAPALI                     67   (açık parti yok ya da aynı fiyat)
    ⚠ soru açık                       10   — ve 9'u HENÜZ SATILMAMIŞ

    ⭐ BUGÜNKÜ PARA ETKİSİ: 1 adet · ÜST SINIR ₺25,00

⛔ **YANİ K128'İN TAMAMININ BUGÜNKÜ ETKİSİ ₺25.** Kullanıcının kriteri
("akışı bozuyor mu") bu rakamla tartışmasız karşılanıyor.

⚠ **İLERİDE DOĞACAK ETKİ AYRI SAYILDI VE SIFIR DEĞİL.** Satılmamış 9
partinin üst sınırı **~₺1.480** ve bunun **₺1.136'sı TEK ÜRÜNDE**:
`axcali1726` FISHER PRICE (2 adet, birim fark ₺567,88). Kalan sekizinin
toplamı ₺344. ⚠ Bu bir KAYIP DEĞİL: iki gerçek parti arasında hangisinin
seçildiği sorusu ve üst sınır — gerçek sapma bunun içinde bir yerde.

⏭ **AÇILIŞ ŞARTI:** `axcali1726` satılırsa ve NET-2'si şüpheli görünürse
tek satırlık bir bakış yeter (`npm run canli:parti-oykusu`). Ondan önce
iş yok.

### 📌 GEÇMİŞ — turun kendisi (kayıtta kalıyor)

_02.09 sabahı bir doğrulama turu yapıldı ve KENDİM ÇÜRÜTTÜM: sayfa cevabı
ekranda gösteriyordu, dönen 7 teyidin 7'si de "tuttu" ve ölçtüğüm şey
doğruluk değil YANKI'ydı. Sonra soru doğru sorulunca (fiyat değil, malın
YAŞI) ve defterden ayırt edici kanıt çıkarılınca (sayım anında hangi parti
açıktı) 77 partinin 67'si tek koşumda kapandı._

⭐ **DERS: DOĞRU SORU, DOĞRU CEVAPTAN ÖNCE GELİR.** "Maliyet doğru mu" diye
sormak kullanıcıyı ekrandaki rakamı okumaya itiyordu. "Sayım anında hangi
parti açıktı" sorusu ise DEFTERDEN cevaplanabiliyordu ve kullanıcıya hiç
sorulması gerekmiyordu.

---

### 📎 TURUN AYRINTISI — kapanana kadarki ölçümler

⚠ **BU BÖLÜM AYRI BİR KALEM DEĞİL, K128'İN DEVAMI.** İlk yazımda buraya
`K128-ESKİ KAYIT` diye ikinci bir BAŞLIK açmıştım — panoda aynı kimlik iki
satırda geçemez (anayasa: "işaret kimliğin parçası değildir"; K10'da dört
kez çakışmış bir desen). Aynı kalemin ikinci fazı yeni satır açmaz, mevcut
satırın altına eklenir.

_02.09'da maliyet doğrulama turu **GEÇERSİZ** ilan edildi (araç cevabı
gösteriyordu — döngüsel teyit, `b2d3baf`). Geriye iki soru kalmıştı; biri
bugün kapandı, öteki kullanıcıya ölçülmüş hâlde verildi._

### ✅ ① `satis.xlsx` BEYANI — **KAPANDI 02.09.2026, KULLANICI BEYANIYLA**

> Kullanıcı: _"satis.xlsx dosyası muteber bir dosya ve onu faturalardan
> aldığım bilgilerle yazdım."_

Kaynak hiyerarşisinde bu dosya artık **ikinci basamak değil, birincinin
türevi**: rakamlar kanalın/tedarikçinin faturasından okunmuş. `M` sütunundan
yazılan alış fiyatları için ayrı bir fatura çaprazı **AÇILMAZ**.
⚠ Bu bir ölçüm değil BEYANDIR ve öyle yazılmıştır — ileride tek bir kalem
tutmazsa açılış şartı budur, tekrar tur açılmaz.

### 🔵 ② "FAZLA MAL EN SON PARTİDEN" VARSAYIMI — **AÇIK, LİSTE VERİLDİ**

`canli-sayim-esas.ts:349` rafta fazla çıkan mala **o varyantın en son
partisinin** birim maliyetini yazdı. Türetmedir, uydurma değildir — ama
kampanya döngüsüyle alan bir firmada fazla mal **eski stok** olabilir.
⛔ Fiyat farkının YÖNÜ şüphe üretmez (anayasa); sorulan şey fiyat değil
**malın YAŞI**.

**ÖLÇÜM — `npm run canli:sayim-fazlasi` (salt okuma, CSV üretir):**

    incelenen sayım fazlası partisi   77
      ⭐ yayılma var (soru anlamlı)    42
      ✓ tek fiyat, soru doğmuyor      34
      ⚠ maliyet HİÇ yok (NO_COST)      1   axcali2601 · 14 adet

    ⭐ BUGÜNKÜ PARA ETKİSİ ÇOK KÜÇÜK: 77 partiden SATILAN yalnız 2 ADET
       axcali2467 Tefal Easyblend  1 adet · atanan 2.361,50 ↔ en eski 1.931,34
       axcali2177 Cake Pro kalıp   2 adet (1 satıldı) · 427,48 ↔ 356,38

    mesafe (kayıp DEĞİL, sonucun düşebileceği aralık)
      tam aralık toplamı    61.154,06
      en eski seçilseydi    45.868,13

⚠ **BİR İŞARET DENENDİ VE ÖLÇÜMLE ELENDİ.** _"Maliyeti alınan parti sayım
anında zaten tükenmişse fazla mal ondan olamaz"_ diye ayırt edici bir işaret
kuruldu; **taban oranı çürüttü** — bütün fazlalarda %50,0, yayılması
olanlarda %59,5. İki oran birbirine yakın, yani işaret ayırt etmiyor.
Dikkat sırasını **para** belirliyor. _(İşaret çıktıda duruyor ama hüküm
olarak kullanılmıyor; ölçülmeden kullanılsaydı dikkati boşa yönlendirirdi.)_

⚠ **AYKIRI DEĞERLER — ÖNCE DOĞRULANIR, DÜZELTİLMEZ.** Üç satırda fiyat farkı
kampanyayla açıklanamayacak kadar büyük ve bunlar **veri sorusu**, fiyat
sorusu değil:
· `axcali1841` — 2025-08-09 tarihli üç parti **₺1,00** (yayılma %84.800)
· `axcali1852` — 4.800'lerin arasında tek bir **₺1.638,53**
· `axcali2975` — 899,99 → 2.600,70 (%189, LEGO; gerçek de olabilir)
⛔ OneBlade dersi geçerli: ₺27,16 "imkânsız" görünmüştü ve **gerçekti**
(hediye kuponu). Bunlar düzeltilmez, **sorulur.**

**KULLANICIDA:** `veri/ozel/sayim-fazlasi-2026-09-02.csv` — 77 satır, küme
etiketi + bütün alım fiyatları tarihiyle. Fatura/kutu tarihine bakıp malın
yaşı söylenecek.
⛔ **KOD DEĞİŞİKLİĞİ YAPILMADI ve cevap gelmeden YAPILMAZ** — hangi partinin
doğru olduğu bilinmeden yazılacak her düzeltme, doğru bir kaydı bozma
riskini düzeltme kılığında taşır.

---

## 🟠 K119 — YEDEK BORU HATTI · **DARALDI** (çekirdek bağlandı, askı sürüyor)

_K119a 31.08.2026 · K119b 08.09.2026 teslim edildi. Kalan: Blob askısı —
bizim tarafımızdan çözülemez, gece otomasyonu üretimde yedek üretmiyor._

> ⛔ **KALAN KURAL:** gece otomasyonu ÇALIŞMIYOR. Migration ve toplu yazım
> öncesi **`npm run canli:yedek-cekirdek`** koşulur ve YEŞİL olmalıdır.
> ⚠ Komut 08.09'da değişti: eski `canli:yedek-dosya` yalnız HEDEFİ sınıyordu,
> yenisi kullanıcının bastığı düğmeyle aynı ÇEKİRDEĞİ koşuyor ve yazdığını
> GERİ OKUYOR. Salt okuma ölçümler serbest.

### ✅ K119a — YAPILANLAR

**① HEDEF ARAYÜZÜ** (`src/lib/yedek-hedefi.ts`): `yaz · listele · oku · sil`.
İki uygulama — `blobHedefi` (mevcut) ve `dosyaHedefi` (yerel, tarih damgalı).
⚠ **OKU arayüzde ZORUNLU ve bu ölçülmüş bir karar:** 31.08'de yazma da
listeleme de "çalışıyor" görünüyordu; kırılan şey OKUMAYDI.
⛔ **Üretim gövdesine DOKUNULMADI** — `yedekUret`/`yedegiMetneCevir` aynen;
elle alınan yedekle gece yedeği aynı şeyi içermeye devam ediyor.

**② TAM YEDEK ALINDI VE GERİ OKUNDU** — `npm run canli:yedek-dosya`

    boyut          30.864.379 B   (Blob'un son başarılısı 30.770.681 B)
    JSON.parse     BAŞARILI
    StockMovement  yedek 10780 · canlı 10780
    Sale           yedek  5882 · canlı  5882
    Purchase       yedek  1986 · canlı  1986
    ProductVariant yedek  1108 · canlı  1108
    alan alan      5 tuttu · 0 tutmadı

⚠ **DOĞRULAYICI İLK TURDA YANLIŞ YERE BAKTI** ve dördü de `-1` döndü —
**yedek doğruydu**, ben `cozulen.stockMovement` arıyordum; gerçek şekil
`tablolar.StockMovement` ve tablo adları PascalCase. Düzeltildi ve dosyanın
**kendi içindeki** `satirSayilari` beyanı ile dizi uzunluğu da ayrıca
karşılaştırılıyor.
⚠ **İKİNCİ KOPYA (KAS) KURULMADI** — mevcut erişim ölçülmedi, fizibilite
notu: hedef arayüzü hazır olduğu için üçüncü bir uygulama (`sftpHedefi`)
yazmak yalnız `yaz/oku/sil` gövdesi demek; üretim tarafına dokunulmaz.

**④ `deploy:bekci`'YE SONDA EKLENDİ** — "D) YEDEK HEDEFİ — yaz · oku · sil".
Hedef ölüyse tur KIRMIZI ve deploy durur. Mutasyon **3/3 kırmızı**
(okuma bozuk · yazma yok · silme yok).
⚠ **SİLME MUTASYONU İLK TURDA KAÇTI:** sonda `sil()`in döndürdüğü SAYIYA
bakıyordu; silmeyi hiç yapmayıp `1` döndüren kurgu yeşil geçti. Ölçüt
davranışa bağlandı — silmeden sonra **yeniden okunuyor**.

### ✅ K119b — ÇEKİRDEK SOYUTLAMAYA BAĞLANDI + YALANCI YEŞİL KAPATILDI · 08.09.2026 · [KOD KOŞTU]

⛔ **K119a SOYUTLAMAYI KURDU, ÇEKİRDEĞİ ONA BAĞLAMADI — VE HİÇBİR ŞEY
SÖYLEMEDİ.** `yedek-hedefi.ts` yazıldı, iki uygulaması sınandı, `deploy:bekci`
sondası eklendi. Ama **kullanıcının bastığı düğme ile gece cron'unun koştuğu
gövde** (`lib/yedek-yaz.ts`) `put()`u DOĞRUDAN çağırmaya devam ediyordu.
Soyutlamayı yalnız betikler kullanıyordu; depo askıya alınınca üretim yolunun
başka hiçbir çıkışı yoktu.
_(Anayasa: "düzeltme yolu, TÜM okuyuculara ulaştığı ölçülmeden 'var' sayılmaz"
— K119a'da bu ölçüm hiç yapılmamıştı.)_

**① ASKI ÖLÇÜLDÜ — ÇÖZÜLMEMİŞ (08.09.2026, `scripts/k119-blob-olcum.ts`)**

    ① LISTELE       ✓  21 dosya   (ustveri okunuyor — 31.08'deki gibi)
    en yeni         yedek/selliora-2026-08-31.json · 29,35 MB · 8 GUNLUK
    ② duz fetch     403 ⛔   (yedek-hedefi.oku bunu yapiyordu)
    ③ get(private)  403 ⛔   (api/yedek/indir'in kullandigi DOGRU yol)

⚠ **BLOB'DA BUGÜN SIFIR KULLANILABİLİR YEDEK VAR** — dosyalar duruyor, hiçbiri
okunamıyor. Listeleme çalıştığı için pano "yedek var" diyebilirdi.

**② `oku()` ZATEN BOZUKTU — VE BU AYRI BİR ARIZA.** Gövde düz `fetch(url)`
yapıyordu; dosyalar `access:"private"` yazılıyor ve özel bir blob'un URL'sine
jetonsuz `fetch` atmak **tasarım gereği** `403` verir. Yani depo tertemiz
olsaydı BİLE `blobHedefi.oku` okuyamazdı ve hatası "askı" gibi görünürdü.
`get(access:"private")`e çevrildi.
⚠ **ETKİSİ KANITLANMADI:** iki yol da bugün `403` veriyor (depo askıda), ikisi
ayırt edilemiyor. Düzeltme kendi başına doğru; askı kalkmadan "çözüldü"
denemez. _(Anayasa: "tetiklenemeyen yol 'geçti' sayılmaz".)_

**③ ÇEKİRDEK BAĞLANDI** — `yedek-yaz.ts`te `@vercel/blob` importu ve `put()`
YOK; hedef `YedekHedefi` üstünden geliyor ve sınama için enjekte edilebiliyor.

**④ ⭐ YAZMAK YETMEZ: BAŞARI ANCAK GERİ OKUMADAN SONRA İLAN EDİLİYOR.**
`yedegiHedefeYaz()` = **yaz → geri oku → sha256 karşılaştır**. Uzunluk değil
ÖZET: aynı boyutta bozuk bir dosya uzunluk testini geçerdi.
⛔ **`OKUNAMADI` AYRI BİR KOD** — "yazılamadı" ile aynı kefeye konmuyor;
31.08'de yazma çalışıyordu, kırılan okumaydı. Rota `500`, ekran kendi cümlesini
yazıyor (`yedekOkunamadi`): "tekrar deneyin" demek, her denemede yazılıp hiç
okunamayan bir dosya üretirdi.
⛔ **VE ATLAMAK YAPISAL OLARAK İMKÂNSIZ:** `adres` ile `dogrulamaMs` yalnız o
gövdeden çıkıyor — çağrıyı silen mutasyon DERLEMEYİ düşürür. Koruma disipline
değil mekanizmaya bağlı.

**⑤ ⛔ SESSİZ YEREL YEDEK YOK — VE BU MİMAR TALİMATININ DÜZELTİLMİŞ HÂLİ.**
Talimat "çözülmediyse hedef yerel/başka" diyordu. Üretimde bunun karşılığı
YOK: düğme ve cron **Vercel'de** koşuyor (`vercel.json` → `crons`, `fra1`) ve
orada kalıcı disk yok. Sessizce yerele düşen bir seçici "yedek alındı" yazıp
bir saat sonra var olmayan bir dosya üretirdi — **tam da kapatmaya çalıştığımız
yalancı yeşil.** Bu yüzden hedef **BEYANLA** seçiliyor
(`YEDEK_HEDEFI=DOSYA` + `YEDEK_KOK`); beyan yoksa hiçbir koşulda DOSYA
seçilmiyor, `DEPO_YOK` görünür hata olarak dönüyor.
_(Anayasa: "mimar talimatları da bu süzgeçten geçer — karşılığı yoksa eksiği
bildirip niyeti karşılayan yolu öner".)_

**⑥ UÇTAN UCA KANIT — `npm run canli:yedek-cekirdek` (canlı veriyle)**

    secilen hedef  DOSYA · Yerel klasor (veri/yedek-yerel)
    ✓ yazildi ve GERI OKUNDU — ozetler birebir
      gun 2026-09-08 · satir 86.000 · boyut 41,26 MB
      geri okuma 184 ms · toplam 6.823 ms

⭐ **31.08'den beri ilk DOĞRULANMIŞ yedek.** Ve bu betik bilerek ayrı:
`canli-yedek-dosya.ts` HEDEFİN çalıştığını kanıtlıyordu, **çekirdeğin**
değil — kendi `yedekUret` çağrısını yapıyor, `gunlukYedekYaz`a hiç uğramıyor.
K119a'nın boşluğu tam oradaydı.

**⑦ BEKÇİ — `yedek:dogrula` 33 → 51 ölçüt · MUTASYON 10/10 KIRMIZI**

Ölçütler kaynak taramıyor, **gövdeyi çağırıyor**: `yedegiHedefeYaz` bilerek
veritabanından bağımsız yazıldı ki sahte hedeflerle sınanabilsin.
_(Anayasa: "saf hesap katmanı, desen tarayan bekçiye muhtaç olmaz".)_

    ① geri okuma kaldirildi              KIRMIZI
    ② bos okuma BASARI sayilir           KIRMIZI   (yanlis susma)
    ③ ozet karsilastirmasi hep dogru     KIRMIZI
    ④ saglam hedef de OKUNAMADI doner    KIRMIZI   (yanlis yanma)
    ⑤ jeton yoksa SESSIZCE yerele dus    KIRMIZI
    ⑥ DOSYA beyani yok sayilir           KIRMIZI
    ⑦ cekirdek yine @vercel/blob'a bagli KIRMIZI
    ⑧ rota basarisizlikta BASARI doner   KIRMIZI
    ⑨ BASKA bir yedek govdesi baglanir   KIRMIZI   (desen yasagi, liste degil)
    ⑩ taranan taban bosaltilir           KIRMIZI   (bos-taban tuzagi)

⚠ **② İLK TURDA "KIRMIZI" GÖRÜNDÜ AMA ISIRMAMIŞTI:** kuralı `if(false)` yapan
kurgu bekçiyi ÇÖKERTİYORDU (`null` özete gidiyor) — çıkış kodu `1`, ama hüküm
ölçütten değil çökmeden geliyordu. Mutasyon çökmeyen hâle çevrildi (boş okuma
→ başarı döner) ve ölçütün ısırdığı GÖRÜLDÜ.
_(Anayasa: "aracın çıktısı okunur — rengi ya da kodu değil".)_

⚠ **VE DESEN YASAĞI İLK YAZILDIĞINDA TEK DOSYALIK LİSTEYDİ** (`yedek-yaz.ts`).
Yarın açılacak bir `yedek-arsiv.ts` yakalanmazdı — K119a'nın hatasının aynısı.
`src/lib/yedek*.ts`in tamamına genişletildi, tek muafiyet ADIYLA beyanlı
(`yedek-hedefi.ts` soyutlamanın kendisi) ve **taban doluluğu ayrıca ölçülüyor.**

**⑧ İKİ YANLIŞ İDDİA KENDİ BELGEMİZDE BULUNDU VE DÜZELTİLDİ:**
· `yedek.ts` _"hariç tutulan yedek birkaç yüz kilobayt kalır"_ diyordu —
  ölçüldü: **41,26 MB** (31.08'de 29,49 MB; sekiz günde %40 büyüme, sebebi
  K187'nin 5 dakikalık üç kanal çekimi).
· `canli-yedek-dosya.ts` başlığı _"TAM YEDEK"_ diyordu ama `yedekUret(an,
  true)` yani **tarifesiz** yedek alıyor. Geri yükleme kararı bu başlığa
  bakarak verilirdi. _(Anayasa: "kolon başlığı bir iddiadır".)_

⛔ **KALAN — DEĞİŞMEDİ:** Blob askısı bizim tarafımızdan çözülemez. Gece
otomasyonu üretimde HÂLÂ yedek üretmiyor; migration ve toplu yazım öncesi
**`npm run canli:yedek-cekirdek`** koşulur ve yeşil olmalıdır.

### ⏳ ASKI KALKINCA (sırası belli)

1. 21 eski Blob yedeğinin **geri okunurluğu** doğrulanacak (bugün `403`).
2. **CRON SUNUCUYA TAŞINMASI — AÇILIŞ ŞARTI: İKİNCİ FİRMA KAYDI.** Bugün
   ~~TY istemcisi bilerek `scripts/`te ve anahtar Vercel’e ÇIKMIYOR (A3 sınırı).~~
   ⛔ **SÜPERSEDE — K166 (04.09.2026), ölçüldü 08.09.2026.** Satır silinmiyor,
   tarihçe kalıyor: K166 çekimi makineden bağımsız yaptı ve `scripts/ty/istemci.ts`
   artık **süreç ortamını ÖNCE** okuyor (_"Vercel'de `.env.canli` DOSYASI YOK"_);
   N11 istemcisi de aynı desende. **Ölçülmüş kanıt** — son 24 saatte **7 adet
   `N11_SIPARIS_ICE_AKTARMA` izi** var ve N11'in yerel görevi YOK; o izler
   Vercel ucundan geliyor, yani **N11 anahtarı bulutta ve çalışıyor.**
   ⚠ **VE KENDİ ÇIKARIMIMI GERİ ALIYORUM:** daha önce _"anahtarlar Vercel
   env'inde MEVCUT"_ demiştim ve dayanağım koşum çıktısındaki `pencere.gun: 3`
   idi — oysa o, `.cmd` dosyasının `--gun=3` argümanıydı. O bir ÖLÇÜM değil
   çıkarımdı; yukarıdaki N11 izi ölçümün kendisidir.
   ⚠ **HB HÂLÂ AYRIK DEĞİL AMA YENİ:** `scripts/hb/istemci.ts` 08.09'a kadar
   YALNIZ dosyadan okuyordu ve uç bu yüzden `{atlandi:"KIMLIK"}` + HTTP **200**
   veriyordu (K187-⑥). Desen TY'ye çevrildi; **anahtarların Vercel env'inde
   olup olmadığı AYRI bir sorudur ve ölçülmedi** — uç artık kimliksizken
   **503** dönüp eksik değişkenin ADINI söylüyor, yani bir sonraki Actions
   koşumu cevabı kendisi verecek.
   Şart: anahtarlar **firma bazında sunucuya taşınırken**, gizli-anahtar
   yönetimiyle **birlikte**. Tek firmada bu iş sıfır değer taşır ve karşılığında
   uygulamayı pazaryerine ulaşabilir hâle getirir.
3. Otomasyon hedefi karara bağlanacak: **yalnız Blob mu, ÇİFT HEDEF mi.**
   _(Ölçülmüş görüş: çift hedef — tek hedefe bağlı kalmak 31.08'de sıfır
   yedeğe düşürdü.)_

---

## ✅ K91 — PARTİ BAĞI ONARIMI · **KAPANDI** (01.09.2026)

> **Kapanış cümlesi:** _Kapasite kısıtı eklenince onarımdan geriye hiçbir şey
> kalmıyor. K91 bu biçimiyle ölü._

**K91c ölçümü (01.09.2026, salt okuma, temiz defter):**

    taban            hareket 10780 · ileri-yiyen 803 · aday 64 · negatif parti 0
    yazılsaydı       32 parti aşılır · toplam aşım 64 adet
    a1 kapasite yeter    0 satır
    a2 kapasite aşılıyor 64 satır
    ince sınıflama (iş tarihi sırasıyla)  yine 0 satır

⛔ **31 HEDEF PARTİNİN 31'İ DE ÖMÜR BOYU TAM TÜKENMİŞ** — kalan kapasite tam
`0`. Üç vaka elle açıldı, üçünde de aynı. Ölçüt zaman sıralı oynatmada "o an
açık" görünen bir parti seçiyor, ama o parti ömrü boyunca zaten tamamen
tüketilmiş; simülasyon MEVCUT bağı tükettiği için (bilinçli — defterin gerçek
hâlini üretsin diye) hedefin gerçek kapasitesini hiç görmüyordu.

✅ **Ölçüm yazımın gördüğünü GÖRDÜ (32 = 32)** — bu doğrulanmadan rapor
yayımlanmayacaktı.

**803 ileri-yiyen bağ DEFTERDE KALIYOR.** Kart parti panelindeki gri dipnot
(K115④) bunu zaten söylüyor: bağ kayması GEÇMİŞ çıkışların hangi partiden
düşüldüğünü etkiler, açık partileri ve parayı değil. NET-2 kuruşuna doğru.

⚠ **VE BİR YAZIM DENENDİ, GERİ ALINDI — ARTIĞIYLA BİRLİKTE.** 63 satır
yazıldı, değişmezlik turu kırmızı yandı (negatif parti 1→32), geri alındı.
Sonra **anlık görüntü karşılaştırmasıyla** zaman aşımına uğrayan ilk
denemeden commit olmuş **tek bir artık satır** bulundu (`cmtamxrol0`) ve o da
geri alındı. Defter şimdi anlık görüntüyle **bit-bit aynı** (sapma 0).
_Dersler anayasaya geçti: "toplu yazım üç şartla koşar"._

---

## ✅ K48 — BEKÇİ DERLEMEYİ SINAMIYOR · KAPANDI 03.09.2026 · [KOD KOŞTU]

> **BEDELİ ÖLÇÜLDÜ:** 30.08'de **üç push boyunca üç ekran canlıda yoktu**
> (`/yerlestir`, `/paketle` raf okuması, toplu taşıma) ve **hiçbir bekçi
> görmedi.** Tur 63/63 yeşildi ve kod **yayınlanamıyordu.** Halil test
> listesini uygulayınca çıktı: A ✓ B ✓ (önceki deploy) · C ✗ D ✗ E ✗
> (yayınlanmamış üç paket). **"Yeşil" yanlış güvence verdi.**

### ⛔ KÖK — TEK SATIR, BÜTÜN MODÜLÜ DÜŞÜRDÜ

    // src/app/yerlestir/actions.ts   ("use server")
    export const YERLESTIRME_EYLEMI = "URUN_YERLESTIRILDI";

`"use server"` dosyasında yalnız async fonksiyon dışa aktarılabilir. Sabit
konunca modülün BÜTÜN dışa aktarımları düştü ve derleme patladı.

### 📏 ÖLÇÜM — `tsc` NEYİ GÖRMÜYOR (4 sınıf enjekte edildi, tek build)

| # | Sınıf | `tsc` | `next build` | Desen yasağı |
|---|---|---|---|---|
| 1 | `"use server"` async olmayan dışa aktarım | ✗ | ✓ | ✅ **KAPANDI** — `sunucu-eylemi:dogrula` (64. bekçi) |
| 2 | İstemci → sunucu modülü (`@/lib/prisma` → `fs`·`net`·`tls`) | ✗ | ✓ | ⏭ kapanabilir — içe aktarma grafı |
| 3 | İstemci → `next/headers` | ✗ | ✓ | ⏭ aynı grafla, 2 ile aynı bekçi |
| 4 | `"use client"` içinde `export const metadata` | ✗ | **✗** | ⛔ **İKİSİ DE GÖRMÜYOR** — sessiz sınıf |

⚠ **4. SINIF AYRI BİR KALEM:** ne `tsc` ne `build` yakalıyor; metadata
sessizce yok sayılıyor. Bir sekme başlığı yanlış kalır ve kimse anlamaz.

### 📏 MALİYET ÖLÇÜMÜ

    bekçi turu (bugün, 64 doğrulama)          218 sn
    next build — BAŞARILI (tip kontrolü KAPALI) 122 sn
    next build — BAŞARISIZ (hızlı düşer)         33 sn
    next build — tip kontrolü AÇIK          ⛔ BELLEKTEN DÜŞÜYOR
                                            (12,7 GB RAM, 0,5 GB boş)

⭐ **TİP KONTROLÜ `next build` İÇİNDE GEREKSİZ:** `tsc:dogrula` onu zaten
ayrı koşuyor. `typescript.ignoreBuildErrors` ile build **122 sn'de çıkış 0**
veriyor ve bellekten düşmüyor. Yani _"build yerelde koşamıyor"_ artık
doğru değil — ölçüldü.

### ⚠ İKİNCİ BULGU — `tsc` KENDİ BAŞINA YETMİYOR

`.next` silinince `tsc --noEmit` **düşüyor**: `LayoutProps` Next'in
ÜRETTİĞİ bir tip. Yani bekçi turu kendi kendine yeterli değil — temiz bir
klonda `tsc:dogrula` bir build/dev koşmadan kırmızı yanar.

### ⏭ KARAR BEKLEYEN — ÜÇ YOL, MALİYETLERİ ÖLÇÜLDÜ

| Yol | Maliyet | Yakalama gecikmesi |
|---|---|---|
| **(a)** Build her push'ta | tur 218 → **~340 sn** (+%56) | **sıfır** |
| **(b)** Yalnız desen yasakları | ~2 sn | bilinen sınıflarda sıfır, **bilinmeyende sonsuz** |
| **(c)** Günde bir / elle | ~0 | **24 saate kadar** — bugünkü bedelin ta kendisi |

### ✅ KARAR UYGULANDI — (a) + 2/3 bekçisi · 30.08.2026 [KOŞTU]

**Kullanıcı kararı:** build tura girer, tip kontrolü kapalı; 2+3 için içe
aktarma grafı bekçisi; sınıf 4 ölçülüp kapatılabiliyorsa eklenir; `.next`
bağımlılığı ayrı kalem.

    tur 64 → 66 doğrulama · 218 → 311 sn (öngörü ~340)
      derleme:dogrula        54,5 sn (sıcak önbellek; soğuk 122 sn)
      istemci-siniri:dogrula  2,8 sn
      sunucu-eylemi:dogrula   2,0 sn

· **① `derleme:dogrula`** — `next build`, tip kontrolü `BEKCI_DERLEME`
  değişkeniyle kapalı. ⚠ **Vercel o değişkeni KURMUYOR**, canlı deploy'da
  tip kontrolü tam koşuyor; son kapı körelmedi. Çıktı `.next-bekci`ye —
  `.next`e yazsaydı açık bir `next dev` sunucusunu ezerdi.
  ⚠ Bekçi "çıkış 0" ile yetinmiyor, `Compiled successfully` satırını da
  arıyor: yapılandırma bir gün derlemeyi atlarsa çıkış 0 gelir ve bekçi
  hiçbir şey ölçmemiş olurdu.
· **② + ③ + ④ `istemci-siniri:dogrula`** — üçü de aynı sınırın tarafında,
  tek bekçide. Graf `"use server"` sınırında DURUYOR (istemcinin sunucu
  eylemi çağırması meşru) ve `import type` sayılmıyor (derlemede silinir).
· **④ ÖLÇÜLDÜ VE KAPATILABİLDİ** — `"use client"` içinde `metadata`.
  Build bile görmüyordu; artık tek kapısı bu bekçi.

### ⛔ BEKÇİ YAZILIRKEN ÜÇ KUSUR ÇIKTI — ÜÇÜNÜ DE MUTASYON BULDU

1. **76 YANLIŞ POZİTİF:** graf `"use server"` sınırında durmuyordu; her
   istemci → eylem → `yetki` → `oturum` → `next/headers` zinciri kirli
   sayıldı. Ölçüm çürüttü: `next build` bu 76'nın hiçbirine kızmıyor.
2. **DESEN LİSTESİ YANLIŞTI:** `^@prisma/client$` yazmıştım, bu deponun
   gerçek zinciri `@prisma/client/runtime/client` ve `@prisma/adapter-mariadb`.
   Listeyi ölçmeden, genel Next dünyasından yazmışım — prisma'yı DOĞRUDAN
   içeri alan mutasyon YEŞİL geçti.
3. ⛔ **ÇIKARICI İÇE AKTARMALARI HİÇ GÖRMÜYORDU:** tembel `[\s\S]*?` aralığı
   dosyanın başındaki bir `export type`tan başlayıp ilk `from`a kadar her
   şeyi yutuyor, aradaki gerçek `import` satırları o aralıkta kalıyor ve
   "tip" sayılıp atlanıyordu. **Bekçi yeşildi çünkü BAKMIYORDU.**

### ✅ SON BORÇ KAPANDI · 03.09.2026 — İDDİA VARDI, ÖLÇEN YOKTU

Bu dosya 30.08'den beri şunu **iddia ediyordu**:

    "`tsc:dogrula`nın üretilmiş yapıya bağımlılığı zaten kaldırıldı"

İddia **doğruydu** — ölçüldü: temiz klonu taklit eden bir `tsconfig` ile
`tsc --noEmit` çıkış **0**, **585 kaynak dosyası** görüldü (`layout.tsx`
dahil). Ama iddiayı **ölçen hiçbir şey yoktu**: `layout.tsx`in yanına
_"depoda başka üretilmiş tip kullanımı YOK (tarandı)"_ yazılmıştı.
**Tarama bir kerelik bakıştır; desen yasağı değildir.**

⚠ **VE BOZULMA SESSİZ OLURDU:** `LayoutProps<"/">` yazan biri yerelde
hiçbir şey görmez — `.next/types` durduğu için `tsc` geçer. Yalnız temiz
klonda düşer ve düşen şey `tsc:dogrula` olur: sebebi koddaki bir hata değil,
**eksik bir çıktı gibi görünür.**

⭐ **YASAK ADA DEĞİL, ÇÖZÜLMEMİŞ ATFA BAĞLI.** Ölçüldü: Next 12 global tip
üretiyor ve bir kısmı tehlikeli derecede genel (`Routes` · `PageProps` ·
`ParamMap`). Adı yasaklamak kendi tipimize de yanardı. Ölçüt: **dosya o adı
KENDİ tanımlamıyor ya da içe aktarmıyorsa** atıf globaldir ve yasaktır.

⭐ **VE LİSTE ELLE TUTULMUYOR:** üretilmiş dizin varsa gerçek çıktıyla
karşılaştırılıyor; Next yeni bir tip üretirse **taban eskidi** diye kırmızı
yanar. Dizin yoksa (temiz klon) kontrol **ATLANDI diye YAZILIR**, sessizce
yeşil verilmez.

    derleme:dogrula   1 → 10 kontrol   (yasak ~1 sn, build'den ÖNCE düşer)

⚠ **VE BU YAZILIRKEN İKİ KUSUR ÇIKTI — İKİSİNİ DE MUTASYON BULDU:**

1. **Tarama döngüsünü silen mutasyon YEŞİL kalacaktı** — `ihlaller.length
   === 0` ölçütü, döngü HİÇ KOŞMASA da `true` verir. Anayasadaki `EVERY`
   kapısı dersinin aynısı: taranılan dosya sayısı **ayrıca** kanıtlandı
   (585/585).
2. **İlk turdaki bir mutasyon GEÇERSİZDİ** — bugün zaten geçen bir koşulu
   `true` yapmak hiçbir şeyi değiştirmiyor. Ve ondan önceki mutasyon **iki
   kapıyı birden** tetikliyordu (taban `>=10` **ve** tazelik) — hangisinin
   ısırdığı belirsizdi. _(Anayasa: "iki kapı aynı şeyi koruyorsa mutasyon
   kapı başına izole edilir".)_ Tek tip çıkarılıp (taban 12→11, `>=10`
   kapısını GEÇEN bir örnek) tazelik tek başına sınandı → kırmızı.

⚠ **VE HARNESS DOSYAYI MUTASYONLU BIRAKTI:** izole koşum Türkçe karakterde
çöktü ve geri yazmaya varamadı. Kopyadan geri yazıldı ve **geri yazıldığı
doğrulandı**. _(Anayasa: "geri alma da bir yazımdır".)_

✓ **8/8 mutasyon kırmızı** — iki yön ayrı: yanlış susma (gerçek
`LayoutProps` kullanımı · döngü silme · saf gövde boşaltımı · taban boşaltımı ·
tazelik · bölüm sayacı) ve yanlış yanma (yerel tanımı yok sayma · yorum
soymayı kaldırma).

### ⏭ KAPSAM DIŞINDA — BEYAN

· **Tamlık iddia EDİLMİYOR:** dört sınıf ölçüldü, Next sürümü değiştikçe
  sınıf doğar. Desen yasağı bilinen sınıfların listesi, build yer gerçeği —
  ikisi birbirinin yedeği. _(Anayasa: "bir kaynağın listesi kendi tamlığını
  kanıtlayamaz".)_
· **Süre büyürse çözüm build'i ÇIKARMAK değil** (kullanıcı kararı): paralel
  koşum ya da önbellek ölçülür. **Ayrı kalem, bugün de açılmadı.**

### ✅ `.next` BAĞIMLILIĞI KALDIRILDI (madde 4)

Ölçüldü: `.next` yokken tur **63/64** — düşen tek şey `tsc:dogrula`, sebep
`layout.tsx`teki `LayoutProps<"/">` (Next'in ÜRETTİĞİ tip). Temiz bir klonda
tur, bir `build`/`dev` koşulmadan kırmızı yanardı ve sebebi koddaki bir hata
değil, eksik bir çıktı olurdu.

⭐ **Çare belgelemek değil, bağımlılığı kaldırmak:** tip elle yazıldı
(`{ children: React.ReactNode }`). Depoda başka üretilmiş tip kullanımı YOK
(tarandı). Doğrulandı: `.next` silinip `tsc --noEmit` koşuldu → **çıkış 0**.

---

## 📊 DÖRT CEPHE — 28.08.2026 [KOŞTU] `npm run canli:dort-cephe`

Halil sordu: _"alımlar satışlar iadeler kargolar düzeldi mi?"_ Dördü ayrı
ölçüldü; **ikisi düzeldi, biri kilitli, biri hiç başlamadı.**

| cephe | hâl |
|---|---|
| **ALIMLAR** | ✅ neredeyse temiz — 1971 alım · 2011 kalem · FIFO açık parti **811 adet / ₺2.235.150,51** (ödenen, KDV dahil) · ⚠ **2 varyantta ayrışma** |
| **SATIŞLAR** | ✅ **DÜZELDİ** — 5810 satış (37 iptal) · kalem `CALCULATED` **5880** · `NO_COST` **10** · `RULE_MISSING` **3** |
| **İADELER** | 🔒 **KİLİTLİ** — defterde **8** `Return`, dosyada **366** · bkz. K73 |
| **KARGOLAR** | ⛔ **HİÇ BAŞLAMADI** — 5773 geçerli satışın yalnız **%2,7'sinde** kargo var |

**② SATIŞLARDA ASIL KANIT — mekanizma tuttu:**

    NET-2 yazılı satış 5763  =  CALCULATED 5763   ✓ BİREBİR

Bugün alınan _"NET yalnız `CALCULATED` iken yazılır"_ kararı **ölçülerek
doğrulandı**: eksik hesaplı hiçbir satış NET taşımıyor.
Komisyon oranı boş kalem **5319 → 3** · maliyet bağı olmayan **2493 → 10**.

**① AYRIŞMANIN KAYNAĞI BULUNDU — VE BUGÜNÜN İŞİ DEĞİL.**
`canli:defter-ayrismasi`: incelenen 1040 · temiz 1038 · **sapan 2** ·
incelenemeyen 0. İkisi de **23.08.2026 tarihli `EXCHANGE_OUT`** satırı ve
ikisi de **partisiz çıkış** — ledger düşüyor, FIFO düşmüyor:

    axcali1660  ledger  2 ↔ FIFO  3   (cmt6bwbno… · 23.08 21:37)
    axcali1610  ledger 11 ↔ FIFO 12   (cmt6d7clk… · 23.08 22:14)

⭐ Anayasadaki **"hayalet adet"** deseninin ta kendisi. Değişim akışı
negatif hareketi `sourceMovementId` olmadan yazıyor. ⛔ Hüküm verilmedi —
hangi defterin doğru olduğu vakaya göre değişir.

**④ KARGO — ALTYAPI VAR, VERİ YOK.**

    tanımlı firma 12 · yüklü tarife satırı 44.841     ← hazır
    kargo firması seçili   153 / 5773   (%2,7)
    kargo ücreti girili    161 / 5773   (%2,8)
    desi girili            154 / 5773   (%2,7)
    kâr hesabındaki KARGO kesintisi: 161 satır · ₺21.843,97

⚠ **YÖN KESİN, BÜYÜKLÜK ÖLÇÜLMEDİ:** 5612 satışta kargo hiç düşülmüyor,
yani **NET-2 olduğundan YÜKSEK**. Kaç lira olduğu ancak desi × tarife ile
hesaplanır; gözlenen 161 satışın ortalamasını 5612'ye çarpmak **kaba bir
tahmin olurdu** ve o sayı ekrana yazılmaz.

---

## 🆕 K69 — DOSYA MALİYETİ ASIL VERİ · 28.08.2026

> **Kullanıcı kararı:** _"M sütunundaki alış fiyatı ASIL VERİ. Bu rakamlar
> KDV DAHİL ve sahih."_ Ve içe aktarmadaki _"hesap sütunları yazılmaz"_
> kararı kâr/ROI/KDV için doğruydu ama **alış fiyatı hesap SONUCU değil,
> kullanıcının KAYDI** — komisyon oranında aynı hata yapılıp düzeltilmişti.

**KDV ÖLÇÜLEREK DOĞRULANDI, KABUL EDİLMEDİ:** defterdeki `unitCostAmount`
KDV dahil (`envanter.ts` ondan `kdvHaric` alıyor) ve dosya **1128 kalemde
BİREBİR** tutuyor (×1,000). Komisyondaki ×1,20 tuzağı burada yok (2 kalem).

| # | İş | Durum |
|---|---|---|
| ① | FIFO boş kalemlere dosya maliyeti | **[KAPANDI 28.08.2026]** — 2551 kalem · ₺4.522.783 |
| ② | 2175 çelişen kalem | **[ŞERHLİ AÇIK]** — dokunulmadı |
| ③ | Kronoloji düzeltmesi | **[BEKLİYOR]** — ayrı iş, 309 kalem / 423 hareket |

**ÜÇ KARAR:**
· **FIFO ÜSTÜNE YAZILMAZ** — _"ölçülmüş gerçek, ölçülmemiş beyanla
  değiştirilmez."_ Çelişen 2175 kalem şerhli kalır (defter ₺4.917.625 ↔
  dosya ₺4.717.391).
· Aykırı satır yazılmaz, ayrı kovada bekler.
· Karşılığı olmayan 10 kalem `NO_COST` kalır — uydurulmaz.

**⭐ ₺1,00'LIK SATIRLAR DOĞRULANDI VE YAŞIYOR.** Kullanıcı: _"bu ürünle
promosyon geldi ve sattım, ondan dolayı maliyetlerini 1 lira yazdım."_
Dosyadaki **tüm** ucuz satırlar tarandı — tam 5, listesiyle birebir.
⛔ Ölçüt SİLİNMEDİ, istisna BEYAN edildi (`DOGRULANMIS_UCUZ`): yarın doğan
yeni bir ucuz satır yine işaretlenecek.

### ✅ ① KAPANDI — SONUÇ

    2551 kalem · 5102 hareket · hata 0 · 2505 satış tazelendi
    kutu         2516 → 21
    panel marjı  %11,56 → %12,63   (ÖLÇÜLDÜ, panelin kendi gövdesinden)
    CALCULATED 5753 · NO_COST 8 · RULE_MISSING 10 · (boş) 3
    ikinci koşum 0 ✓   ·   ihlal taraması 0 ✓
    geri alma: `note` = 'dosya-maliyet-20260828'

⚠ **TAHMİNİM YANLIŞ ÇIKTI:** _"maliyet artacağı için marj düşecek"_ demiştim,
**yükseldi.** Sebep: 2551 kalem `NO_COST`tan çıkıp hesaba GİRDİ — hem paya
hem paydaya eklendiler. Küme değişince oran karşılaştırılamaz kuralını kuru
koşuma yazmıştım, kendi cümlemde uygulamamışım.

⚠ **RAPOR "TUTMADI" DEDİ, SEBEBİ BİZDE DEĞİLDİ.** Genel sayaç kullanılmıştı
ve fark 5104/5102 · net stok 771→781 çıktı. Aradaki 2 hareket ve +10 stok,
koşum SÜRERKEN kullanıcının girdiği iki alımdı (`ALM-HB-260828-08/09`,
axcali3101, 10:59 ve 11:00). Sayaç kendi partisine daraltıldı: **5102
hareket, net stok 0 ✓**. Aynı anda başkası yazabiliyorsa genel sayaç
**yalancı kırmızı** üretir.

**KALAN:** `NO_COST` 8 (dosyada karşılığı yok) · `RULE_MISSING` 10 (8'i
Amazon — komisyon oranı yok, K64 ④'e bağlı).

---

## 🆕 K70 — İADE AÇIĞI · 28.08.2026

> Kullanıcı: _"iadeleri daha önce ters işlem yani negatif tutarla
> kapattım."_ Ters satırların tam listesini verdi (391 satır).

⚠ **SAYIM UYUŞMAZLIĞI LİSTEYLE ÇÖZÜLDÜ.** Kullanıcı "256" demişti, ölçüm
`ÜRÜN ALIŞ FİYATI` sütununda **391** diyordu. Listenin kendisi **391 satır**
çıktı — ölçüm doğruymuş. Rakamı tartışma değil **liste** kapattı.

    liste 391 satır · 385 sipariş · TÜR iade=366 · iptal=24 · satış=1

**⭐ İADE AÇIĞI ÖLÇÜLDÜ:**

    satış VAR, iade kaydı YOK : 243 satır · 238 sipariş
    ⭐ CİRO BU KADAR FAZLA     : ₺694.431,92
    son 90 gün 16 kayıt ₺60.606 · son 180 gün 64 kayıt ₺220.709
    en yoğun: 2025-11 (29) · 2025-12 (25) · 2026-01 (23) · 2026-05 (23)

⚠ ₺694.432 **iade edilen kalemlerin** tutarıdır; o satışların tam cirosu
(₺710.189) DEĞİL. İki rakam karıştırılmaz.

**③ 143 SİPARİŞ SİSTEMDE HİÇ YOK — Türk Kahvesi ile AYNI KOVA.** Ana satış
dosyasında 299 satırları var (155'i satış satırı; TÜR: satış=141 ·
tazmin=13 · Zarar=1). Yani satışları da girmemiş.

**④ İADE İÇE AKTARMASI — İKİ ALAN EKSİK, UYDURULAMAZ.**
Dosyada var: sipariş no · tarih · adet · tutar · SKU.
⛔ Dosyada YOK: **iade SEBEBİ** (`ReturnReason`) ve **iade TÜRÜ**
(`UNDELIVERED`/`NORMAL`/`DISPUTED`).
· `reason` iade akışının tamamını yönlendiriyor; `DIGER` diye toplu yazmak
  366 iadeyi analiz edilemez hâle getirirdi — ve o kova zaten en az izlenen.
· `returnType` **KARGO MALİYETİNİ** değiştiriyor (iade-sureci §5).
⭐ **ÖNERİ:** `ReturnNotice` değil doğrudan `Return` + `ReturnItem`
(mal gelmiş, süreç bitmiş) · ve dosyaya **iki sütun** eklenmesi istenir —
kullanıcı biliyor, sistem bilmiyor. **YAZILMADI.**

**⑤ 24 İPTAL SATIRI:** sistemde iptal işaretli **0** · **NORMAL görünen 5**
(ciroda duruyor) · sistemde yok 19.

### ⭐ HALİL DOĞRULADI — 5 DEĞİL, 4 İPTAL + 1 İADE

⚠ **DOSYADAKİ `TÜR` SÜTUNU TEK BAŞINA HÜKÜM VERMEZ.** Ölçüm beşini de
"iptal" saydı çünkü dosya öyle diyordu; kullanıcı ayırdı:

    İPTAL (4)  4234503772 · 4597407440 · 4852324050 · 4002405216
    ⛔ İADE (1) 4619254455 — satış GERÇEKLEŞTİ, mal döndü

`4619254455`e iptal yazmak satışı **hiç olmamış** gibi gösterirdi; o 243'lük
iade kovasına ait ve iade içe aktarma kararını bekliyor.

**✅ İPTAL YAZILDI — 28.08.2026** (`canli:iptal-yaz -- --yaz`,
uygulamanın kendi `iptalOnizle`/`iptalUygula` gövdesiyle; ikinci iptal
mantığı YAZILMADI). Ölçülen fark beklenenle **birebir**:

    ciro farkı  −5.475,00   (beklenen −5.475,00)   ✓
    stok farkı       +4     (beklenen +4 — mal geri döner) ✓
    düşen NET-2  ₺840,57  ·  iptal 4 · engellendi 0

İz: `AuditLog: DOSYADAN_IPTAL_ISARETLENDI` (hariç tutulan `4619254455`
gerekçesiyle birlikte yazıldı). Geri alma: satış ekranından iptal geri alınır.
⚠ **SEBEP BİR İDDİADIR VE UYDURULMADI:** dosya KİMİN iptal ettiğini
söylemiyor; `MAGAZA_DIGER` yalnız zorunlu alanı karşılamak için seçildi
(açıklamayı ZORUNLU kılan tek değer) ve gerçek durum nota yazıldı.
Ölçüldü: `iptalSebebi` hiçbir HESABI sürmüyor — yalnız ekran gruplaması
(`lib/satis-iptali.ts`), yani bedeli yanlış rakam değil yanlış ETİKET.

⚠ **Kâr tazelemesi GEREKMEZ:** iptal kârı yeniden hesaplamaz —
`iptalTarihi` dolunca satış bütün süzgeçlerden **düşer**. Kayıt yerinde
durur, yalnız sayılmaz.
⚠ **Stok:** iptalde mal geri döner. Toplu yazım yapılacaksa **iptal
akışının kendi gövdesi** kullanılmalı; ikinci bir iptal mantığı yazılmaz.

### ⭐ İADE İÇE AKTARMA — ÖNCEKİ RAPORUM EKSİKTİ

_"İki alan eksik: reason ve returnType"_ demiştim. Şema okundu:
**`Return` modelinde `reason` alanı HİÇ YOK.** O yalnız `ReturnNotice`ta
ve o model malın GELMESİNİ bekleyen aşamanın kaydı — burada süreç bitmiş.

⛔ **VE BU RAPORUM DA EKSİKTİ — BİR DEĞİL, ÜÇ BİLİNMEYEN VAR.** Yazma
gövdesi (`lib/iade.ts → iadeKaydet`) okundu; şemaya bakmak yetmiyormuş:

| # | bilinmeyen | bedeli |
|---|---|---|
| 1 | `returnType` | **şemada NÖTR DEĞER YOK** — üç değer de bir şey iddia ediyor |
| 2 | `saglamAdet` / `hasarliAdet` | ⭐ **EN AĞIRI: STOK.** `RETURN_IN` yalnız sağlam adet için yazılıyor |
| 3 | `iadeKargosu` | `KARGO` sütunu satışın mı iadenin mi — belirsiz |

**② EN AĞIR OLANI ÖNCEDEN HİÇ GÖRÜLMEMİŞTİ.** "Hepsi sağlam" dersek
**stok +236 adet** artar ve mal hurdaya gittiyse envanter değeri şişer;
"hepsi hasarlı" dersek gerçekten dönen mal kaybolur. Dosya bunu söylemiyor.

**B SEÇENEĞİ KURU KOŞUMU — YAZILABİLİR KÜME ÖLÇÜLDÜ:**

    dosyadaki iade satırı 366
    ⭐ YAZILABİLİR         236 Return + 236 ReturnItem · 236 adet · ₺683.923,92
    dışarıda: satış sistemde yok 125 · zaten iade kaydı var 4 · kalem eşleşmedi 1

⚠ **VE "CİRO ₺694.432 DÜZELİR" CÜMLEM FAZLA İYİMSERDİ.** `Return` yazmak
`Sale.items`i DEĞİŞTİRMEZ — ciro rakamı **aynı kalır**, iade etkisi kâr
motorunda AYRI taşınır. Bugünkü hâlden yine de iyi, ama beklenti düzeltilir.

**B için merdiven inildi:** `Return.note` serbest metin ve `code` boş —
tür BİLİNMİYOR diye işaretlenip **kargo hesabı dışında** bırakılabilir,
yeni sütun açmadan. Tür VARSAYMAK ise kargo maliyetini değiştirir
(iade-sureci §5) ve yasak.
⚠ Dosyada tür ipucu arandı: `KARGO` sütunu 193/366 satırda dolu — kullanıcı
bunun **KULLANILMAYACAĞINI** söyledi: ipucu ölçüm değildir.

✅ **KARAR VERİLDİ 28.08.2026 — B İPTAL, EKSTRE YOLU SEÇİLDİ.**
Ayrıntı ve açılış şartı: **K73** (kilitli). **YAZILMADI.**

---

## 🆕 K71 — TANINMAYAN TÜRLER · 28.08.2026

Dosyadaki `TÜR` sütununun tam dökümü ölçüldü; içe aktarmanın tanıdığı
yalnız `satış`:

    satış   9743 · 25.871.523,48      iade      387 · 1.020.513,02
    tazmin    27 ·     91.279,89      iptal      24 ·    51.077,00
    TATİL      8 ·          0,00      aktarma     7 ·    11.294,00
    Zarar      1 ·          0,00

**`tazmin` 27 · ₺91.279,89 liste / ₺71.485,89 alış** (HB 24 · TY 3),
23.08.2024 → 18.08.2026.

⭐ **ÇAPRAZ SONUCU DEĞİŞTİRDİ: `tazmin` AYRI BİR SATIŞ TÜRÜ DEĞİL.**
Ters-satır listesinde **27/27'si** geçiyor — ve orada **26'sı `iade`,
1'i `iptal`** yazıyor. Yani `tazmin`, satışın kendisi değil, **iade
edilmiş bir siparişe düşülmüş "tazmini istendi" NOTU.**

    sistemde satış olarak VAR 14 · ⛔ YOK 13
    o 14'ün hâli: iptal 0 · iade kaydı olan 1 · CALCULATED 13 · NO_COST 1
    ⭐ BUGÜN CİRODA DURAN TUTAR: ₺72.829,00

Yani **bu 14 sipariş K73'ün (iade açığı) içinde** — dosya iade diyor,
defter kâr sayıyor. Kalan 13 ise "hiç girilmemiş satış" kovasında.
⚠ Ürün kimliği yalnız **3/27** satırda tanınıyor (SKU/barkod eşleşmiyor).

`Compensation` modeli var, **4 kayıt** — ama **dördü de `supplierId`**
(karşı taraf TEDARİKÇİ). Dosya kimden tazmin alındığını söylemiyor;
model ya `supplierId` ya `carrierId` istiyor, ikisi farklı iş.
⛔ Ölçülmeden eşleştirilmedi.

**`aktarma` 7 · ₺11.294 liste / ₺6.778 alış** — hepsi HB, 13.06.2024 →
16.04.2025. **Bu kümede tutunacak hiçbir kimlik yok:**

    sipariş no BOŞ 3 · dolu 4 → sistemde VAR 0
    ters-satır listesinde geçen 0 · ürünü tanınan 0/7
    3 satır AYNI ürün (Homend Toastbuster), AYNI gün (31.01.2025)
    1 satırın "no"su aslında sipariş no değil: HBCV00003JIJSK (HB ürün kodu)

⛔ **BUGÜN YAPILACAK BİR ŞEY YOK** — bağlanacak kayıt da, tanınacak ürün
de yok. Kalem **kayıt** olarak durur, görev olarak değil.

**`Zarar` 1** — `4383491870`, 30.09.2024, liste ₺0,00 · alış ₺1.070,00
(Schafer granit tencere). Sistemde satış olarak YOK, ters listede VAR.
Tek satır; ürünü de tanınmıyor.

**`TATİL` 8** — ✅ **KAPANDI: VERİ DEĞİL.** 01–08.08.2024, sekiz ardışık
gün; sipariş no yok, tutar yok, `Satış Miktarı` sütununda bile "TATİL"
yazıyor. Tatil günlerini işaretleyen satırlar. **Bir daha sorulmaz.**

⛔ Hiçbiri eşleştirilmedi; tür atanmadı; yazılmadı.
Ölçüm: `npm run canli:k71-olcum` (salt okuma).


---

## 🆕 K72 — İKİ VAKA HALİL'DEN · 28.08.2026

### ✅ ① `11540657420` — Barbie · **ÇÖZÜLDÜ (teşhis)**

Fatura (e-Arşiv `TEA2026000002461`, 27.08) satışı doğruluyor: ₺1.944,00.
Sistemde satış VAR (`enumerasyon` ile TY API'den gelmiş) ama **stok
hareketi YOK** → maliyet bağı kurulamıyor.

⛔ **BU BÖLÜMDEKİ TEŞHİS YANLIŞTI — DÜZELTMESİ K74'TE.** Kesik bir çıktı
(`tail -45`) okunduğu için bir alım satırı görülmedi. Doğrusu: **10 alındı,
10 satıldı, alım eksiği YOK**; engel bugün elle yazılmış _"test amaçlı"_ bir
`ADJUSTMENT −1`. Aşağıdaki sayılar KESİK ÖLÇÜMDEN gelir, geçerli değildir:

    axcali1869 defteri: 9 giren · 9 çıkan · net stok 0
    ⭐ FIFO AÇIK PARTİ KALANI: 0
    satış kalemi 11 · stok hareketi OLMAYAN 2

Yani **satılan adet alınan adetten 2 fazla.** Satış anında düşecek parti
kalmadığı için `SALE_OUT` yazılamıyor. Alım girilince kendiliğinden düzelir.

⚠ **VE ÖNCEKİ CÜMLEMİ DÜZELTİYOR:** "alımı hiç girilmemiş" demiştim,
kullanıcı itiraz etmişti ve HAKLIYDI — alımlar girilmiş (dokuz kez, hepsi
₺1.200). Eksik olan **son iki adedin alımı.**

### ② `4120311526` — Razer mouse, teslim edilmeden iade

> Kullanıcı: _"Müşteri kargoda iptal ederse TEK kargo bize yansıyor.
> Bu ürün henüz teslim edilmeden iptal edildiği için tek kargo ücreti
> bize yansıdı."_

| kaynak | ne diyor |
|---|---|
| **HB paneli** (kanalın kendi belgesi) | tutar 0 · komisyon 0 · hizmet 0 · stopaj 0 · **KARGO −94,20** · net **−94,20** |
| ters-satır listesi | TÜR iade · adet −1 · liste −6.499 · alış −4.948 · **KARGO −101** |
| **defterimiz** | ₺6.499'luk GERÇEKLEŞMİŞ satış · STOPAJ 54,16 · ÖDEME_GİDERİ 51,99 · HİZMET 12,60 · ⛔ iade kaydı YOK · kargo YOK |

⭐ **KARGO İKİ KAYNAKTA FARKLI: 101 ≠ 94,20.** Kaynak önceliği kuralı
gereği **kanalın kendi belgesi kazanır** (₺94,20 `OLCULDU`, ₺101 kullanıcı
tahmini).

### ⭐ KULLANICININ ÖLÇÜTÜ `returnType`i TAHMİNDEN ÇIKARABİLİR

"Tek kargo = teslim edilmeden döndü" bir **sayılabilir** ölçüttür ve
ekstrede karşılığı var: `KARGO` ve **`KARGO_IADE`** ayrı kodlar.

**AMA KAPSAM ÖLÇÜLDÜ VE BUGÜN YETMİYOR:**

    dosyadaki iade siparişi 360
    ⭐ ekstrede görülen        9  (%2,5)
    ⛔ ekstrede hiç yok      351
    kargo bacağı sayılabilen  5 → 1 bacak=2 · 2 bacak=3

Ölçüt DOĞRU ve teslim edilebilir; **veri kapsamı yok.** 236 iadenin türü
bugün ölçülemez. **Açılış şartı: HB/TY hakediş ekstrelerinin yüklenmesi** —
o gün tür TAHMİN edilmeden ÖLÇÜLEREK yazılabilir.

---

## 🔒 K73 — İADE İÇE AKTARMA · KİLİTLİ · 28.08.2026

> ⚠ Halil bu kalemi "K72" diye adlandırdı; o kod bugün **İKİ VAKA**ya
> gitmişti. Kimlik tekil olmak zorunda (aynı kodu ikinci kez kullanmak
> panoyu taranamaz yapar), bu yüzden **K73**.

**⛔ B SEÇENEĞİ İPTAL — KARAR: EKSTRE YOLU.** _(Halil, 28.08.2026.)_

Gerekçe kayda geçti:
· Üç bilinmeyen çıktı; en ağırı `saglamAdet`/`hasarliAdet` — "hepsi
  sağlam" demek **stok +236** demek ve hurdaya gitmiş mal envanteri şişirir.
  **Bugün tam bu sınıftan bir hatayı düzelttik** (uydurma kargo tarihleri).
· Ciro zaten düzelmiyor: `Return` yazmak `Sale.items`i değiştirmiyor.
  **B'nin kazancı küçük, bedeli büyük.**
· Ekstre yolu türü **ÖLÇÜLEBİLİR** kılıyor — `KARGO` ↔ `KARGO_IADE` ayrı
  kodlar. Uydurma gerekmez.

**DURUM:** 236 iade · ₺683.924 yazılabilir hâlde bekliyor. Üç bilinmeyen:
`returnType` · `saglamAdet`/`hasarliAdet` · `iadeKargosu`.

⛔ **AÇILIŞ ŞARTI: HB/TY hakediş ekstrelerinin yüklenmesi.**
Bugünkü kapsam **%2,5** (360 iadenin 9'u ekstrede). Ekstre gelince tür
**kargo bacağı sayımıyla** belirlenir — tahmin edilmez.

⚠ **KAPANANA KADAR BU BİR BULGUDUR, GÖREV DEĞİL:** 243 satışın iadesi
defterde YOK. Somut örnek `4120311526` (Razer) — defter **₺6.499 kâr**
sayıyor, gerçek **₺94,20 zarar**. Bugün kapatılamaz; kaydı burada durur.

---

## 🆕 K74 — HALİL'İN ON VAKASI · KURU KOŞUM 03.09 · [MALİYETLER YAZILDI · ②⑨ İŞ YOK · ④ TIKALI]

Ölçüm: `npm run canli:on-vaka` · `canli:on-vaka-b` · `canli:barbie-adj`
(üçü de salt okuma).

### ⛔ ÖNCE BİR DÜZELTME — BARBIE HAKKINDAKİ CÜMLEM YANLIŞTI

K72'de _"9 alınmış, 11 satılmış, son iki adedin alımı girilmemiş"_ yazmıştım.
**Yanlış.** Sebep: hareket dökümünü `tail -45` ile okumuştum ve **ilk satır
kesilmişti** (`2026-03-25 PURCHASE_IN 1`). Kesik çıktının üstüne hüküm kurdum.

    DOĞRUSU: alınan 10 · satılan 10 · Halil'in beyanı 10  →  TUTUYOR

⭐ **GERÇEK SEBEP BAŞKAYDI VE BUGÜN DOĞDU:**

    2026-08-28 14:02:57 UTC  ADJUSTMENT −1 · ₺1.200 · NOT: "test amaçlı"

Ekrandan elle yapılmış bir **test düzeltmesi** son açık partiyi tüketmiş;
`11540657420` o yüzden maliyetsiz kaldı. Alım eksiği YOK.
_(Anayasa dersi: boru sonuna güvenilmez — bu sefer `tail` kesti.)_

### ÖLÇÜM TABLOSU

| # | sipariş | Halil ne diyor | defter ne diyor |
|---|---|---|---|
| ① | `11540657420` | 10 alındı, 9'u sorunsuz | ✓ 10/10 · engel: bugünkü **"test amaçlı"** ADJUSTMENT |
| ② | `4120311526` | teslim edilmedi · stoğa girdi · ₺94,20 kargo · sonra satıldı | iade kaydı **YOK** · ₺6.499 ciroda · kargo **YOK** |
| ③ | `10828937011` | 2 adet · birim ₺1.634 | 2 kalem, **ikisi de** NO_COST |
| ④ | `4673224319` | kullanılmış iade · tazmin **kazanıldı** ₺1.216,87 + hurda | NO_COST · iade YOK · **hakediş satırı YOK** |
| ⑤⑥⑦⑧ | 4 sipariş | promosyon, maliyet **0** | dördü de NO_COST · `axcali3070` · 5 satış kalemi, **0 alım kalemi** |
| ⑨ | `10559161422` | mükerrer, iptal edilecek | ⭐ **mükerrerlik DOSYADA**: satış dosyasında **birebir aynı İKİ satır** |
| ⑩ | `4138485546` | 2 adet · birim ₺2.549, _"diğerinde problem yok"_ | ⚠ **İKİSİ DE** NO_COST |

### ✅ K74 MALİYETLERİ YAZILDI — 28.08.2026 [KOŞTU]

`npm run canli:k74-maliyet -- --yaz` + `-- --tazele`

    yazılan hareket 18 (9 kalem × PURCHASE_IN + SALE_OUT)
    net stok farkı 0 ✓  ·  partiye ait hareket 18/18 ✓
    ⭐ İKİNCİ KOŞUM: yazılacak kalem 0  ✓ (dokuzu da "hareketi var")

**YEDİSİ DE `NO_COST` → `CALCULATED`:**

    10828937011  NET-1   478,19 · NET-2   392,66
    4138485546   NET-1   960,83 · NET-2   790,83
    4673224319   NET-1   588,99 · NET-2   488,77
    10635054169  NET-1   148,52 · NET-2   123,33
    4762343000   NET-1   223,43 · NET-2   185,67
    4405769515   NET-1   239,67 · NET-2   199,17
    10571819650  NET-1   166,91 · NET-2   138,69
    ⭐ TOPLAM NET-2: ₺2.319,12   (önce: yedisi de NET taşımıyordu)

⚠ **VE BİR HATA YAPTIM, KOD DÜZELTİLDİ.** İlk koşumda hareketler yazıldı ama
kâr tazelemesi **düştü**: betik canlıya kendi istemcisiyle bağlanmıştı, kâr
motoru ise uygulamanın `prisma` tekilini çağırıyor → `DATABASE_URL` yok.
⭐ **Düşmesi ŞANSTI:** `canli-kar-tazele.ts` başlığı tam bu tuzağı anlatıyor —
_"betik kendi istemcisiyle bağlanıp motoru öylece çağırsaydı, CANLIDAN OKUYUP
YERELE YAZARDI."_ Adres artık her şeyden önce kuruluyor.
Hareketler ikinci kez YAZILMADI; `--tazele` kapısı yalnız kâr damgasını
tamamladı ve izi o yazdı (satır bazında önceki değerlerle).

### ⚠ ÜÇ SORU — YAZIMDAN ÖNCE CEVAP GEREKİYOR

**② stok aritmetiği 1 adet tutmuyor.** `axcali1633`: 3 alım · 3 satış
(`4662729595` 01.07 · `4120311526` 04.07 · `11473158422` 03.08). İade
yazılırsa mal stoğa döner ve **net stok 1** olur — Halil _"stokta yok"_
diyor. Ya bir alım fazladan girilmiş ya da bir satış eksik.

**④ iki bilinmeyen:** ürünün alış maliyeti ne (dosyadaki tazmin satırı
`₺575,40` diyor) ve ₺1.216,87 tazmin **nereye** yazılacak — `Compensation`
karşı tarafı `supplierId`/`carrierId` istiyor, oysa ödeyen **kanal**.

**⑨ tamamı mı, bir kalemi mi?** Sipariş 2 kalem taşıyor çünkü **dosyada iki
satır var**. Siparişin tamamını iptal etmek **gerçek olan 1 adedi de** siler.

### ✅ ② ④ ⑨ KURU KOŞUM · 03.09.2026 [KOŞTU] — `npm run canli:k74-uc-vaka`

⛔ **ÜÇÜNÜN DE CEVABI PANODAKİNDEN FARKLI ÇIKTI.** Üç soru da defterin
ESKİ hâline dayanıyordu; 29.08–01.09 arasında ikisi zaten çözülmüş.

**② `4120311526` — İŞ YOK, VE İKİ AYRI SEBEPLE.**

    satış İPTAL EDİLMİŞ    29.08.2026   (pano bunu bilmiyordu)
    kâr durumu             RULE_MISSING
    kargo                  ₺84,17       (Halil ₺94,20 diyor — küçük fark, ayrı)

`axcali1633` defteri iki şeyi birden söylüyor:

    2026-08-29  SALE_CANCEL_IN   +1   "Halil: teslim edilmedi"   ← +1 ZATEN YAZILMIŞ
    2026-09-01  COUNT_CORRECTION -1   fiziksel sayım              ← ve RAFTA YOK dedi
    net stok 0

⭐ Yani iade yazımı **üçüncü kez** aynı +1'i yazardı — ve fiziksel sayım
zaten hüküm vermiş. _(Anayasa: "fiziksel sayım son sözdür".)_
⚠ Kanal tarafı **kanıt vermedi**: TY claims 8 sayfada bu siparişi
bulamadı. Bu "iade yok" DEMEK DEĞİL (sipariş **Hepsiburada**, TY claims
onu zaten göremez) — ölçüm YAPILAMADI, ve öyle yazıyor.

**⑨ `10559161422` — İŞ YOK, ZATEN NÖTRLENMİŞ.**

    kalem 1  adet 1 · ₺1.039 · net maliyet ₺699,00      ← gerçek satış
    kalem 2  adet 0 · ₺1.039 · net maliyet ₺0,00        ← mükerrer
             2025-10-02 SALE_OUT      −1 · 699
             2026-08-29 SALE_CANCEL_IN +1 · 699  "mukerrer kalem"

Fazla kalem 29.08'de geri alınmış, adedi 0'a çekilmiş, **kalem
silinmemiş** — tam istenen desen. Ters kayıt atmak **çift geri alma**
olurdu.

⛔ **VE BETİĞİM TAM ONU ÖNERİYORDU.** İlk yazımda ⑨ dalı koşulsuz _"ters
`ADJUSTMENT` at"_ diyordu. Ölçüt eklendi: adet 0 **ve** net maliyet 0 ise
"yapılacak iş yok" der. _(Anayasa: "alanın DOLU olması olayın
gerçekleştiğini göstermez" — burada TERSİ: kalemin DURMASI, işin
yapılmadığını göstermez.)_

⛔ **VE MALİYETİ İLK ÖLÇÜMÜMDE YANLIŞ HESAPLADIM.** `Math.abs(quantityDelta)
× birim` toplamıştım ve ⑨'un ikinci kalemi **"₺1.398 maliyet"** göründü —
oysa iki hareket birbirini götürüyor ve net **₺0**. `kalemMaliyeti`
İŞARETLİ topluyor (`toplam -= birim × quantityDelta`). Kendi hesabımı
silip **gövdenin kendisini çağırdım**; ikinci bir hesap bir gün sessizce
ayrışırdı. _(Bu oturumda aynı `Math.abs` tuzağına ikinci düşüş.)_

**④ `4673224319` — TEK GERÇEK TIKANIKLIK, VE İKİ KAPI BİRDEN KAPALI.**

    ⭐ maliyet BİLİNİYOR: ₺575,04   ← pano "bilinmiyor" diyordu, BAYAT
    ⛔ "Hepsiburada" adlı Supplier YOK        (10 tedarikçi tarandı)
    ⛔ iade kaydı YOK · bildirim YOK          (tazmin bağlanacak kayıt yok)
    ✓ mevcut tazmin kaydı 0                  (çift yazım riski yok)

⚠ **VE ŞEMANIN KENDİ İDDİASI ÇÜRÜDÜ.** `Compensation` başlığı diyor ki:
_"Pazaryerleri ZATEN `Supplier` listesinde (arbitrajda onlardan da alım
yapılıyor), yani o taraf ek alan GEREKTİRMEDİ."_ **Hepsiburada için
DOĞRU DEĞİL** — ölçüldü, yok. Şema bir alanı açarken taşıdığını
varsaydığı veriyi taşımıyor. _(Anayasa: "şemadaki alan da bir iddiadır —
yazıcısı yoksa vaat boştur".)_

### ⛔ VE "SUPPLIER YOK" BULGUM YANLIŞTI — DÜZELTMESİ BURADA

_Halil onayı geldi: "Hepsiburada Supplier kaydı açılır (tek kayıt,
migration yok)."_ ⛔ **AÇILMADI — ÇÜNKÜ ZATEN VARDI.**

    HB — "Hepsi Burada"   (id cmsnwd7f4000004kvqs4eys3r)

Ölçütüm kanal adının ilk kelimesini arıyordu:
`"Hepsi Burada".toLocaleLowerCase("tr")` içinde `"hepsiburada"` **GEÇMİYOR**
(araya boşluk giriyor) → 0 sonuç → rapor _"Supplier YOK"_ dedi. Onay o
yanlış rapora dayanıyordu ve uygulansaydı **MÜKERRER KİMLİK** doğardı —
şemanın kendi uyarısının yasakladığı şey: _"aynı varlığın iki kimliği olur
ve bir gün ayrışırlar (Soundcore vakasının aynısı)."_

⚠ **VE KİMLİK YOLU YOK:** `Channel`in `supplierId`si bulunmuyor, eşleştirme
mecburen ADLA yapılıyor. Ölçüt normalleştirmeye çevrildi (boşluk/nokta/
tire/büyük-küçük) **ve bulunamazsa TAM LİSTE basılıyor** — okuyan gözüyle
görsün, dizeye körü körüne güvenilmesin (İlke #5).
⭐ Aynı alımın (`ALM-HB-260216-03`) tedarikçisi de zaten "Hepsi Burada".

⏭ **④ İÇİN KALAN — TEK ENGEL:**
① ✅ karşı taraf HAZIR (`supplierId` = Hepsi Burada) ·
② ⛔ **tazmin bağlanacak kayıt YOK** — ne `Return` ne `ReturnNotice`.
   Sıra: önce iade/bildirim, SONRA tazmin ·
③ ⏭ ₺1.216,87 ile dosyadaki ₺575,40 farkı ne (hurda geliri ayrı mı).

⛔ **HİÇBİRİ YAZILMADI.**

---

## ✅ K75 — KARGO SÜTUNU (R) · YAZILDI 28.08.2026 · [KOŞTU · kalıntı 19]

> Halil: _"Satış dosyasının R kısmında kargo ücretleri mevcut."_
### ⛔ PANO KURGU ÜRETİYORDU — DÜZELTİLDİ 03.09.2026

Başlık **[YAZIM ONAY BEKLİYOR]** diyordu; iş **28.08'de yapılmıştı.** Aynı
panoda `✅ KARGO YAZILDI · 28.08.2026 · [KOŞTU]` kaydı duruyordu ve rakamlar
neredeyse birebir aynıydı (5595 ↔ 5583 · ₺559.499 ↔ ₺558.134) — yani pano
**aynı işi hem yapılmış hem bekliyor** diye taşıyordu.

⛔ **VE BU KURGU BANA BİR HATA YAPTIRDI:** panodaki satıra bakıp kullanıcıya
_"5583 siparişte kargo gideri düşülmemiş"_ dedim. Kullanıcı durdurdu:
_"nasıl düşmemiş kargo saçmalama hesaplarda görünüyor."_ **Haklıydı** —
cevap panodan değil DEFTERDEN okunmalıydı.
_(Anayasa: "panonun kendisi de doğrulanan bir veridir"; "pano, işin DURUMUNU
değil NİYETİNİ kaydederse kurgu üretir".)_

### ✅ ÇİFT DÜŞÜM RİSKİ ÖLÇÜLDÜ — SIFIR

_Halil ön şartı: "30.08'de yazılan 'kargo 5.595 kayıt' hangi alandı, K75
hangi alana yazacak, kesişim kaç sipariş? Çift düşüm riski sıfır
kanıtlanmadan yazım yok."_
Araç: `npm run canli:kargo-mutabakat-izi` (salt okuma).

⚠ **İKİ ALAN VAR VE İKİSİ DE "KARGO" DENİYOR** — ayrı sayıldı:

    `Sale.cargoAmount`  kargo ÜCRETİ (para)  ← K75 buraya yazacaktı
    `Sale.shippedAt`    kargo TARİHİ (an)     ← K60'ta yazılıp GERİ ALINDI

    ⭐ KESİŞİM (zaten yazılmış olup yeniden yazılacak) : en az **5578**
    ⭐ cargoAmount BOŞ olan satış (mutlak tavan)        : **52**
    ⭐ ALAN CİNSİ: **MUTLAK** (üzerine yazar) · artımlı kullanım: YOK
    ✓ **ÇİFT DÜŞÜM İMKÂNSIZ** — aynı değeri ikinci kez yazmak toplamı
      değiştirmez.

⚠ **VE DEĞERLERİN DOĞRULUĞU AYRICA ÖLÇÜLDÜ** (`canli:kargo-degeri-dogrula`):
_"alanın DOLU olması, değerin DOĞRU olduğunu göstermez."_ 5595 satır
kuruşuna `dosya ÷ 1,20` çıktı; taban kanıtı olarak oran p05–p95 boyunca
**tam 1,2000**.

### ⏭ AÇIK KALAN — **19 SATIŞ**

    kargosuz toplam 52
      (a) İPTALLİ   33   ← kargo zaten beklenmez, kusur DEĞİL
      ⭐ açık satis  19   ← 15 Trendyol · 4 Hepsiburada

Bunlar dosyada kargo satırı TAŞIMIYOR; **toplu** yazacak değer yok. ⛔
Sistemin bilmediği bir değeri toplu yazmak yasak — `null` bir eksiklik
değil **BEYANDIR**.

### ⭐ HALİL KARARI 03.09.2026 — ELLE GİRİLECEK

İlk karar _"19 satır null kalır, onay sayfasında beyan edilir"_ idi;
Halil aynı gün değiştirdi: **"19 kargoyu listele, elle gireyim."**
Kaynak toplu yazımda yoktu ama **operatörde var** — ve anayasa toplu
yazımı yasaklıyor, TEK TEK girişi değil (_"tek satır işaretleme açık
kaldı çünkü orada kullanıcı tarihi kendisi giriyor"_).

    ⭐ LİSTE: raporlar/kargosuz-19-elle-girilecek.csv
    sütunlar: tarih · siparişNo · kanal · kargoKodu · ciro · sku · ürün
              · **selliora** (doğrudan düzenleme adresi)
    15 Trendyol · 4 Hepsiburada · en eski 25.08.2024 · en yeni 30.06.2026

⚠ **GİRİLEN DEĞER KDV HARİÇ OLMALI** — `cargoAmount` şemada öyle
saklanıyor. Faturada KDV dahil rakam varsa **1,20'ye bölünür** (K75'in
taban ölçümünün aynısı).
⚠ `11265267349` bu listede: 03.09'da onarılan satış.
⚠ Ayrıca **28 sipariş "çelişen"** kovasında (aynı siparişe dosyada farklı
kargo değerleri) — ayrı kalem, bugün açılmadı.



Ölçüm: `npm run canli:kargo-kolonu` (salt okuma).

    R sütununun başlığı  : "KARGO"  ✓ (adı da değeri de kargo diyor)
    satış satırı 9743 · R DOLU 9616 (%98,7) · boş 127
    değer: min 20 · p25 85 · ortanca 100 · p75 120 · p95 200 · max 659
    TOPLAM ₺1.075.311,77  ·  ⛔ negatif değer 1 (ayrı incelenecek)

**⭐ TABAN ÖLÇÜLDÜ — DOSYA KDV **DAHİL**.** Bu, yazımın en kritik kararıydı:
`Sale.cargoAmount` şemada **KDV HARİÇ** saklanıyor (`lib/kargo-kdv.ts`:
_"ölçüldü 32/32 satışta KARGO kesintisi = cargoAmount × 1,20"_). Yanlış
tabanda yazmak doğrudan **%20 hata** demekti.

    kargosu ZATEN olan 147 satışta oran (dosya ÷ defter):
      p25 1,2000 · ortanca 1,2028 · p75 1,2102
      ⭐ oranı tam 1,20 olan 74 · oranı 1,00 olan yalnız 2

Ortanca 1,20'ye oturuyor, 1,00'e değil → **dosya kullanıcının bildiği
KDV DAHİL tutarı taşıyor.** Yazarken **1,20'ye bölünür.**

⚠ **VE BİR TAHMİNİM ÖLÇÜMLE ÇÜRÜDÜ:** çakışan örneklerin ilk altısı Amazon
numarasıydı ve _"147'nin hemen hepsi Amazon"_ diye yazacaktım. Ölçüm:
Amazon biçimli sipariş **11/5752**. Örneklem sıralamadan geliyordu, kümeden
değil.

**YAZILABİLİR KÜME:**

    ⭐ 5721 satış · ₺681.081,46 (KDV DAHİL)  →  cargoAmount = R ÷ 1,20
    dokunulmayacak: kargosu ZATEN olan 147 (hangisi doğru — ölçülmedi)
    sistemde olmayan sipariş 3388 (K56 kovası)

⛔ **FİRMA VE DESİ DOSYADA YOK** (ölçüldü). `cargoCarrierId` ve `cargoDesi`
**BOŞ bırakılır** — boş kalması bir BEYANDIR: hangi firmayla gittiğini
sistem bilmiyor. Vekil bir firma seçmek olmayan bilgiyi uydurmak olurdu.

⚠ Yazım sonrası kâr tazelenir; **NET-2 ~₺681 bin AŞAĞI iner.** Bu bir
kayıp değil, bugüne kadar **eksik düşülmüş bir giderin** deftere girmesidir.

### ⭐ KURU KOŞUM [KOŞTU 28.08.2026] — `npm run canli:kargo-yaz`

⚠ **VE ÖNCEKİ RAKAMIM DÜZELDİ.** Ölçüm satır bazlıydı; kargo **SİPARİŞ**
başınadır. Sipariş bazına indirilince ve satırları çelişen siparişler
ayrılınca sayı düştü:

    önce (satır bazlı)  : 5721 · ₺681.081
    ⭐ ŞİMDİ (sipariş)   : 5583 · ₺669.760,96 KDV DAHİL

    KOVALAR
      dosyada kargolu sipariş  9140
      ⭐ YAZILACAK              5583
      ⛔ satırları ÇELİŞEN        28   ← aynı siparişe farklı kargo
      ⛔ kargosu ZATEN olan      143   ← DOKUNULMUYOR
      ⛔ sistemde yok / iptalli 3386

    ⭐ YAZILACAK DEĞER (KDV HARİÇ) : ₺558.134,04   ← `cargoAmount`
       aradaki KDV                 : ₺111.626,92

**NET ETKİSİ — MOTORA SORULDU, TAHMİN EDİLMEDİ.** `karHesapla` aynı girdiyle
iki kez çağrıldı (kargolu/kargosuz):

    ₺100 KDV-hariç kargo → ΔNET-1 −120,00 · ΔNET-2 −100,00
    ölçülen çarpan: NET-1 ×1,20 · NET-2 ×1,00

⚠ **VE BU BİR CÜMLEMİ DÜZELTTİ:** _"NET-2 ~₺681 bin aşağı iner"_ demiştim.
**Yanlış** — o rakam NET-1'in etkisi. Kargo KDV'si İNDİRİLİYOR
(`odenecekKdv`den düşüyor), o yüzden NET-2 yalnız **KDV HARİÇ** kadar iner:

    5583 satışın 5574'ü CALCULATED · kargosu ₺557.458,22 (hariç)
    ⭐ NET-1 düşüşü : ₺668.949,86
    ⭐ NET-2 düşüşü : ₺557.458,22

**NEGATİF — YAZILACAK KÜMEDE YOK, AMA DOSYADA 168 SATIR VAR.**

    TÜRE GÖRE: iade = 167 (₺20.771,00) · satış = 1 (₺125,00)

Tek negatif SATIŞ satırı `11265267349` — ve o sipariş **iki satır** taşıyor
(`+125/+2.550` ve `−125/−2.550`), yani çelişen 28'in içinde, yazılmıyor.
⭐ **VE 167 İADE SATIRI K73'ÜN ÜÇÜNCÜ BİLİNMEYENİNE DOKUNUYOR:** `iadeKargosu`
dosyada olabilir. ⛔ Ama ölçülmedi — gidiş kargosu mu, iade kargosu mu,
ikisi mi belli değil. İade işine geçince ilk ölçülecek şey bu.

**143 ŞERHLİ KAYIT — sapma para olarak KÜÇÜK.**

    oran (dosya ÷ defter): p25 1,2000 · ortanca 1,2028 · p75 1,2102
    tam 1,20 olan 74 · tam 1,00 olan 2 · ikisi de değil 67
    |dosya − defter×1,20| toplamı: ₺1.209,87

⛔ Dokunulmuyor (FIFO kararının aynısı: ölçülmüş gerçek beyanla
değiştirilmez), ama sapma burada şerhli duruyor.

---

## 🆕 K76 — TEST NOTLU STOK DÜZELTMELERİ · 28.08.2026 · [ÖLÇÜLDÜ]

Ölçüm: `npm run canli:test-duzeltmeleri` (salt okuma).
⚠ Ölçüt **dosya listesi değil DESEN**: bir kayda bağlı OLMAYAN (elle
girilmiş) her `ADJUSTMENT` taranıyor — yarın yazılan da yakalanır.

    elle girilmiş düzeltme 19 · notu test/deneme geçen 5 · NOTSUZ 2

| yazıldı | SKU | adet | birim | not |
|---|---|---|---|---|
| 28.08 14:02 | `axcali1869` | **−1** | ₺1.200,00 | _"test amaçlı"_ ← Barbie |
| 26.08 11:09 | `axcali1752` | **+1** | ₺1.438,99 | _"Test amaçlı **düşüldü**"_ ⚠ not ile yön ters |
| 25.08 21:14 | `axcali1685` | **−1** | ₺5.749,00 | _"Test amaçlı stok **girildi**"_ ⚠ not ile yön ters |
| 25.08 21:14 | `axcali1685` | **−1** | ₺5.749,00 | ⚠ **AYNI DAKİKA, İKİNCİ KEZ** |
| 12.08 23:39 | `axcali2595` | −1 | ₺279,00 | _"test - kutu ezildi"_ ← gerçek olabilir |

⚠ **İKİ AYRI KUSUR GÖRÜNÜYOR VE İKİSİ DE HÜKÜM DEĞİL:** üç kayıtta **notun
söylediği yön ile hareketin yönü ters**, ve `axcali1685` aynı dakikada iki
kez yazılmış (**−2 adet · ₺11.498**). Hangisinin kasıt hangisinin kaza
olduğu **ölçülemez** — kararı Halil verir.
NOTSUZ ikisi: `OYU-HT-260812-01` (+1 maliyetsiz · −2 ₺325,00).

### BARBIE GERİ ALMA — KURU KOŞUM

    ŞU AN                    : ledger 0 · FIFO açık parti 0
    ters kayıt (+1) sonrası  : ledger 1 · FIFO açık parti 1

⚠ **TEK BAŞINA YETMEZ:** `11540657420`in `SALE_OUT`u yok; serbest kalan
parti o satışa **kendiliğinden bağlanmaz**. İkinci adım
`canli:ice-aktarma-stok-bagi` (K55).
⚠ **VE ÇARE SİLMEK DEĞİL:** `lib/stok-duzeltme.ts` kuralı —
_"hareket silinmez; yanlış düzeltme ters işaretli ikinci düzeltmeyle
kapatılır."_ Ters kayıt **ekrandan** yapılır, ikinci bir düzeltme mantığı
yazılmaz.

---

## 🆕 K77 — İADE DOSYASI · O SÜTUNU · 28.08.2026 · [ÖLÇÜLDÜ]

> Halil: _"İade dosyası O sütununda iadelerin kargo ücretleri mevcut."_

Ölçüm: `npm run canli:iade-kargo-kolonu` (salt okuma).

    O sütununun başlığı: "KARGO" ✓ (dosyadaki tek KARGO sütunu da bu)
    iade satırı 366 · dolu 193 (%52,7) · negatif 167 · pozitif 26
    |değer|: min 50 · ortanca 110 · p95 200 · max 350 · TOPLAM ₺23.021,00

### ⛔ AMA SÜTUN ARADIĞIMIZ ŞEYİ TAŞIMIYOR — VE BU BİR UMUDUMU ÇÜRÜTTÜ

Bir önceki turda _"bu sütun `iadeKargosu`nun ta kendisi olabilir"_ demiştim.
Ölçüm çürüttü: **değerler satış dosyasının kargosuyla AYNI.**

    satış kargosuyla AYNI : 186
    FARKLI                :   4   (ve dördü de kuruş farkı: 114,14↔114,00 gibi)
    satış satırı yok      :   3

Yani O sütunu **yeni bir kargo bacağı değil, satışın kargosunun TERS
İŞARETLİ AYNASI.** `4120311526` bunu tek satırda gösteriyor:

    iade dosyası  O = −101,00
    satış dosyası KARGO = +101,00      ← aynı sayı, ters işaret
    ⭐ HB paneli   = −94,20            ← kanalın kendi belgesi

⚠ **VE ÜÇ KAYNAK ÜÇ FARKLI ŞEY SÖYLÜYOR.** Dosya kargoyu **sıfırlıyor**
(+101 −101 = 0), HB ise **fiilen ₺94,20 kesmiş.** Halil'in kuralı
(_"teslim edilmeden dönende TEK kargo yansır"_) HB'yi doğruluyor: kargo
sıfır değil, **bir bacak.** Dosyanın aynalaması o bacağı siliyor.

⛔ **SONUÇ: K73'ÜN ÜÇÜNCÜ BİLİNMEYENİ KAPANMADI.** `iadeKargosu` hâlâ
bilinmiyor; elimizdeki tek gerçek ölçüm kanal panelinden geliyor ve o da
tek vaka. Diğer iki bilinmeyen (`returnType` · `saglamAdet`/`hasarliAdet`)
zaten açıktı. **K73 kilitli kalır.**

⚠ Yine de sütun işe yaramaz değil: hangi iadede kargonun ters kaydedildiğini
söylüyor ve **163 iade satırı hem kargolu hem satışı sistemde** (₺19.738,00).
Ekstre geldiğinde kıyas tarafı olur.

---

### 🔓 K74 — HALİL'İN ÜÇ CEVABI GELDİ · 28.08.2026

**① `4120311526` (Razer) — ÇÖZÜLDÜ.** Halil: _"1 alım 2 kere kaydedilmiş."_
Yani gerçek **2 alım**, defterdeki 3'ün biri mükerrer. Aritmetik kapanıyor:

    gerçek alım 2 · kalıcı satış 2 (4662729595 · 11473158422) · stok 0 ✓
    aradaki 4120311526: satıldı → teslim edilemedi → stoğa döndü → yeniden satıldı

**② `4673224319` — HİKÂYE TAMAM, İKİ AYRINTI ÖLÇÜLDÜ.** Halil: HB tazmin
talebini onayladı, **ürün HB deposuna gönderildi, kargosunu BİZ ödedik
(₺100)**, tazmin ödemesi alındı.

⚠ **VE DOSYADA İKİ FARKLI ALIŞ FİYATI VAR — ikisi de M sütununda:**

    satış satırı  (05.11.2025) : liste 1.484,00 · alış **575,04** · KARGO 85,00
    tazmin satırı (03.02.2026) : liste 1.216,87 · alış **575,40**

`575,04` ↔ `575,40` — rakamlar yer değiştirmiş görünüyor, biri yazım hatası.
⛔ Hangisinin doğru olduğu **ölçülemez**; satışa bağlı olan `575,04`.
⚠ Ve ₺100 iade kargosu dosyanın hiçbir sütununda YOK (satış satırı ₺85 diyor,
o gidiş kargosu). **Halil'in beyanı tek kaynak.**

**⛔ TAZMİNİN KARŞI TARAFI ŞEMADA YOK — ÖLÇÜLDÜ.** `Compensation` modelinde
`supplierId` ve `carrierId` **ikisi de opsiyonel**, ama **`channelAccountId`
diye bir alan YOK.** Yani HB'nin ödediği tazmin bugün ancak _"karşı taraf
boş + not"_ olarak yazılabilir; **sorgulanamaz.**
_Bu zaten bilinen bir açık:_ `docs/iade-sureci.md` §11.4 aynı şeyi söylüyor
(_"Hurda Geliri" hakediş kalemi de tanınmıyor_).

**③ `10559161422` — TEYİT ALINDI.** Halil: _"sadece 1 tanesi yanlış, diğeri
doğru."_ ⭐ Siparişin **tamamı iptal EDİLMEYECEK**; **tek kalem** kaldırılır.

---

## ✅ KARGO YAZILDI · 28.08.2026 · [KOŞTU]

`npm run canli:kargo-yaz -- --yaz` — satış dosyasının **R (KARGO)** sütunu.

    yazıldı 5595 satış
    DOĞRULAMA: kayıt 5595/5595 ✓ · toplam ₺559.499,05 / ₺559.499,05 ✓
    kâr tazelendi 5595 · başarısız 0

    NET-1  2.444.999,67 → 1.776.097,22   (−668.902,45)
    NET-2  2.015.414,97 → 1.457.996,25   (−557.418,72)

⚠ **SAYI 5583 DEĞİL 5595 ÇIKTI, SEBEBİ YAZILI:** ilk deneme `$transaction`ın
5 sn tavanına çarpıp düştü (hiçbir satır yazılmadı — ölçüldü, kargolu satış
161→161). Yeniden koşulabilirlik için _"kargosu hedef değere kuruşuna eşit
olan kayıt bizimdir"_ ölçütü konuldu; bu ölçüt **zaten hedef değerde olan 12
kaydı** da kümeye aldı. Yazılan değer aynı, veri değişmedi — ama `--geri` o
12'yi de boşaltır. Küçük ve **bilinen** risk.

### ⛔ VE BİR KUSUR BULUNDU — İZ SESSİZCE KESİLMİŞTİ

`AuditLog.detail`e 5595 satış kimliği kondu. Alan MySQL `TEXT` (65.535 bayt)
ve JSON tam tavanda kırpıldı: **65.511 karakter, `JSON.parse` DÜŞÜYOR.**

> **Geri alma yolu YAZILDIĞI ANDA BOZUKTU ve hiçbir şey söylemedi.**

⭐ **ÇARE LİSTE SAKLAMAK DEĞİL, KÜMEYİ DETERMİNİSTİK KURMAK:** ölçüt
_"kargosu, dosyadaki değerin 1,20'ye bölümüne kuruşuna eşit"_. Aynı ölçüt
yazımın yeniden-koşulabilirlik kapısında da var; iki yerde iki ölçüt olmaz.
Kesilmiş iz **silinmedi**; üstüne onu açıklayan ikinci iz yazıldı
(`KARGO_DOSYADAN_YAZILDI_IZ_ONARIMI`) — ledger disiplini izlere de işler.

⚠ **DERS:** bir listeyi ize gömmek, ize sığdığını VARSAYMAKTIR. Sığmadığında
veritabanı hata vermez, **keser** — ve kesik iz sessizce yeşil görünür.

### ⚠ ₺1.404,50 AÇIKLANAMADI — VE UYDURULMADI

Beklenen NET-2 düşüşü (NET taşımayan 9 satışın kargosu düşülünce)
₺558.823,22; ölçülen ₺557.418,72. Fark **₺1.404,50** (değişimin %0,25'i).

**ARANDI, BULUNAMADI:**
· "bayat NET damgası" hipotezi **çürütüldü** — kargosuz 27 satışta motorun
  hesabı kayıtlı NET'e **birebir** eşit (fark 0).
· Yazılan kümede de durum aynı: **120/120 satışta kayıtlı NET = motor.**

⭐ **YANİ BUGÜNKÜ RAKAMLAR DOĞRU.** Açıklanamayan şey, yazımdan ÖNCEKİ
toplamın bileşimi — ve **satış bazında saklanmadığı için artık atfedilemez.**
⛔ Sebep uydurulmadı; açıklanamadığı yazıldı.

⚠ **SONRAKİ TOPLU YAZIMLARDA ÖNCEKİ DEĞER SATIŞ BAZINDA SAKLANIR** — yoksa
artık bir fark çıktığında kaynağı aranamaz. (Bu betikte toplam saklandı,
satır saklanmadı; eksik olan buydu.)

---

## ✅ K78 — SİPARİŞ SATIRI KALDIRILAMIYOR · 28.08.2026 · [KAPANDI 07.09.2026 → K180]

`10559161422`de dosya aynı satırı **iki kez** taşıyor ve içe aktarma
sadakatle iki kalem yazmış. Halil: _"sadece 1 tanesi yanlış, diğeri doğru."_

⛔ **SİSTEMDE YOLU YOK — ÖLÇÜLDÜ:**
· `lib/satis-duzenleme.ts` → `yeniAdet <= 0` **reddediliyor** (`ADET_GECERSIZ`)
· kalem SİLME diye bir işlem hiç yok; kapsam **FİYAT + ADET + KARGO**

**İki kötü seçenek:**
· tamamını iptal → **gerçek olan 1 adet de** silinir
· betikle `SaleItem` sil → `StockMovement.saleItemId` **SetNull**, hareket
  sahipsiz kalır: _"stok düşük kalır, düşüren kaybolur"_ (anayasa)

⚠ **VE BU TEKRARLAYACAK:** dosyada mükerrer satır bir kez değil; içe aktarma
her seferinde sadakatle yazacak. Tek vaka değil, **desen.**
⛔ Bugün yazılmadı; **çözüm tasarımı AYRI TUR** (kullanıcı kararı 28.08.2026).

---

## 🚨 K79 — GEÇMİŞ SATIŞ GELECEĞİN PARTİSİNİ YİYOR · 29.08.2026

> **HALİL BULDU, SİSTEM DEĞİL.** `10383153730` 27.07.2025'te satılmış ama
> tükettiği parti **13.08.2026** tarihli. Ekranda stok 0 göründü, bekleyen
> sipariş **kaydedilemedi.**

⚠ **VE ÖNCE KENDİMİ DÜZELTTİM:** _"bu bugünkü işimden çıkmış"_ demiştim.
Ölçüm çürüttü: 810 bozuk bağın **809'u NOTSUZ**, bugün yazdığım her hareket
parti notu taşıyor. Bu **eski** bir durum — panoda _"809 geriye dönük FIFO
bağı"_ olarak zaten duruyordu, ama **kilitlenen gerçek stok** olarak hiç
ölçülmemişti. Sayı biliniyordu, **bedeli bilinmiyordu.**

### ✅ A — `axcalistan01` ONARILDI [KOŞTU]

    ÖNCE : 2025-07-27 SALE_OUT −1 → parti 2026-08-13 (382 gün sonra)
           ledger 0 · FIFO açık 0   ← sipariş girilemiyordu
    SONRA: 2025-07-27 PURCHASE_IN +1 ₺1.792,00 (dosya M sütunu)
           ledger 1 · FIFO açık 1   ✓ İKİ DEFTER TUTUYOR
           10383153730 → CALCULATED · NET-1 473,58 · NET-2 390,65

⭐ **VE ÖDÜNÇ ALINAN RAKAM YANLIŞTI:** satış ₺1.069,49 maliyet gösteriyordu
(2026 partisinin maliyeti); dosyadaki gerçek maliyet **₺1.792,00**. Yani
o satışın kârı **₺722,51 fazla** yazılıydı.

**ÇARE NİYE "BAĞI KOPARMAK" DEĞİL:** satış gerçek, mal çıktı. Bağ koparılsa
ledger 0 kalır FIFO 1 olur → **iki defter ayrışır** ("hayalet adet"). Eksik
olan ALIM'dı; satış tarihine parti açıldı.

### 📏 B — TÜMÜ ÖLÇÜLDÜ [KURU KOŞUM]

    bozuk bağ 809 · etkilenen varyant 181 · serbest kalacak adet 809
    dosyada maliyeti OLAN 808  ·  ⛔ NO_COST'a düşecek 1

    MALİYET  ödünç alınan 1.634.178,54 → gerçek 1.439.598,55
             ⭐ FARK −194.579,99   (maliyet DÜŞER → NET ARTAR)
    STOK     ⭐ ENVANTER DEĞERİ ARTIŞI 1.630.579,54

⚠ **Fark NEGATİF, yani ödünç alınan maliyetler toplamda GERÇEKTEN YÜKSEKTİ.**
`axcalistan01`da tersiydi (ödünç düşük çıkmıştı) — **tek vakadan yön
çıkarılmaz**, kümenin yönü ayrı ölçüldü.

### ✅ B YAZILDI + SINIR KAPATILDI — 29.08.2026 [KOŞTU]

    onarılan bağ 809 · net stok farkı +809  ✓ (beklenen +809)
    tazelenen satış 798/798 · hepsi CALCULATED
    NET-1  87.895,28 → 282.475,27   ⭐ FARK +194.579,99
    NET-2  70.336,79 → 232.486,78   ⭐ FARK +162.149,99

⭐ **NET-1 FARKI, KURU KOŞUMUN ÖNGÖRDÜĞÜ MALİYET FARKININ BİREBİR AYNASI:**
kuru koşum _"maliyet −194.579,99"_ demişti, ölçülen NET-1 artışı
**+194.579,99**. Kuruşuna tutuyor — motorun ve planın aynı şeyi söylediğinin
kanıtı.

### ⭐ KÖK KAPATILDI — `sinir` ALTI YAZMA YOLUNA GEÇTİ

    src/lib/stok.ts        acikPartiler'e `sinir?` EKLENDİ + `gunSonu()` yardımcısı
    src/lib/satis.ts       gunSonu(girdi.soldAt)        ← 809'un kaynağıydı
    src/lib/iade.ts (×2)   gunSonu(girdi.occurredAt)
    stok/duzeltme-actions  gunSonu(tarih)
    okut/sayim-yazim       gunSonu(tarih)
    iadeler/bildirim       gunSonu(new Date())
    satislar/[id]/iade     gunSonu(girdi.occurredAt)    ← önizleme, yazımla AYNI
    satis-duzenleme-veri   gunSonu(once.soldAt)         ← adet artışı da FIFO'dan düşer
    iptal-geri-alma-veri   `SINIR YOK:` beyanıyla açık

⚠ **VE İKİ ÖLÇÜM YOLU DÜZELTTİ:**
① `acikPartiler` `sinir`i **hiç kabul etmiyordu** — sorun "verilmedi" değil,
  **verilemiyordu.**
② `satis-duzenleme-veri` ilk taramada gözden kaçtı; `fifoDagit`e **dolaylı**
  besliyor (`adetPlani` → `satis-adet.ts`). Bekçi yakaladı, ben değil.

**BEKÇİ — `fifo-sinir:dogrula`, DESEN YASAĞI:**
> Sonucu `fifoDagit`e giden çağrı `sinir` geçirmek zorunda; sınır
> `gunSonu(...)` olmalı; `stok.ts` süzgeci `lt` kalmalı. İstisna yalnız
> `SINIR YOK: <gerekçe>` beyanıyla.

**DÖRT MUTASYON, DÖRDÜ DE KIRMIZI YANDI (görüldü):**
sınırı kaldıran · sınırı gün BAŞINA çeviren · `lt`→`lte` · beyansız istisna.
Beyanlı istisna yeşil kaldı (yanlış yanma yönü de sınandı).

⚠ **VE BEKÇİ YAZILIRKEN KENDİ KUSURUNU ÜRETTİ:** `\b` yine `0x08`e döndü
(betikle kod yazma tuzağı). `kontrol-karakteri:dogrula` yakaladı — ölçüt
kendisini ölçen bekçiye yakalandı.

---

## 🆕 K81 — HURDA ÇAPRAZI · 29.08.2026 · [ÖLÇÜLDÜ]

`hurda.xlsx` · md5 **teyit edildi** (`fa335f…41`) · sayfa "Hurda takip" · 62 satır.

**⭐ K73'ÜN İKİNCİ BİLİNMEZLİĞİNİ KISMEN KAPATIYOR:** hurdaya giden mal
**hasarlı** dönmüş demektir → `saglamAdet=0 · hasarliAdet=adet`.

    ⭐ İADE LİSTESİYLE KESİŞEN : 56 sipariş · 56 adet · ₺197.408,00
    ⛔ hurdada VAR, iadede YOK : 5

⚠ **İKİ ÖN RAKAM TUTMADI — ve fark BENDE DEĞİL, ölçümde:**

| beyan | ölçülen |
|---|---|
| kesişim **58** | **56** |
| tutar **41/62 · ₺138.385** | **15/62 · ₺45.854** |

Satır 62 ✓ · HB 47 / TY 15 ✓ · sipariş no 61/62 ✓ · SKU 16/62 ✓ · Ödendi
51/10 ✓ — **altı rakamdan dördü birebir tuttu**, ikisi tutmadı. Tutar
sütununda **47 satır boş**; beyandaki 41 başka bir sütundan sayılmış olabilir.

**⛔ KALAN 304 İADE SAĞLAM SAYILAMAZ — ÇIKARIM YAPILMADI.** _"Hurda
listesinde yok"_ ile _"sağlam döndü"_ aynı şey değildir; liste eksik de
olabilir. **Halil'e sorulacak.**

**③ 5 SİPARİŞ:** dördü sistemde **hiç yok** (K56 kovası), biri
(`10920524864`) var ve `CALCULATED`.

**④ DURUM SÜTUNLARI KOVA DEĞİL, NOT.** İki sütun (I·J), **38 farklı değer**,
üç ayrı "ödendi" yazımı (`ödendi` 26 · `ÖDENDİ` 3 · `Ödendi` 3), araya
serpilmiş tarihler ve serbest notlar. Desenle kovalama denendi:
**sınıflanamayan 31 / 85** — yani üçte biri hiçbir kovaya girmiyor.
⭐ **Hüküm: bu sütun ayrıştırılmaz, NOT olarak taşınır.**

**⑤ TUTARSIZ 47 SATIR:** 36'sında `Ödendi=1` ama tutar YOK → **kayıt eksik**;
10'unda `Ödendi=0` → henüz tazmin alınmamış olabilir.

**⑥ ÜRÜN EŞLEŞTİRME:** sipariş numarasıyla sistemde bulunan **31/61**.
⭐ **Çok kalemli sipariş 0** — yani bulunanlarda ürün sipariş numarasından
tek anlamlı çıkıyor, SKU'nun 16/62 olması engel DEĞİL.

### ⭐ KÖK BULUNDU — VE PARAMETRE HİÇ YOK

    export async function acikPartiler(db, variantId)   ← `sinir` YOK

Tek varyantlık yardımcı `sinir`i **hiç kabul etmiyor**; `acikPartilerToplu`
kabul ediyor ama bu kapıdan geçen çağrılar onu geçiremez. Yani sorun
"parametre verilmedi" değil, **verilemiyor.**

`fifoDagit`e besleyen 7 dosya var. Sınıflandırma:

| çağrı | tarih elde var mı | hüküm |
|---|---|---|
| `lib/satis.ts:188` **SATIŞ KAYDI** | `soldAt` ✓ | ⛔ **SINIR ZORUNLU — 809'un kaynağı bu** |
| `lib/iade.ts:599` · `:752` | `girdi.occurredAt` ✓ | ⛔ sınır gerekli |
| `app/stok/duzeltme-actions.ts:156` | form `tarih` alanı ✓ | ⛔ sınır gerekli (geri tarihli düzeltme aynı tuzağa düşer) |
| `app/okut/sayim-yazim-actions.ts:123` | `veri.sayimGunu` ✓ | ⛔ sınır gerekli — **sayım da geri tarihli olabiliyor** |
| `app/iadeler/bildirim-actions.ts:845` | değişim anı | ⛔ sınır gerekli |
| `app/satislar/[id]/iade/actions.ts:137` | önizleme | ⛔ yazma yoluyla **AYNI** olmalı |
| `lib/iptal-geri-alma-veri.ts:138` | — | ✅ **BİLİNÇLİ AÇIK:** "ayna partisi bugün tükenmiş mi" diye soruyor; tarih sınırı başka bir soruyu cevaplardı |

Görüntüleme yolları (`page.tsx` · `stok/page.tsx` · `kalem-bilgisi` ·
`urun-karti-verisi`) bugünün stoğunu gösteriyor → **açık kalır.**
`envanter-veri.ts` zaten parametreli.

⚠ **VE BİR TUZAK: `lt` mi `lte` mi.** `acikPartilerToplu` süzgeci
`occurredAt: { lt: sinir }` — **kesin ÖNCE**. Satışa `soldAt` verilirse
**aynı gün alınan mal dışarıda kalır** ve bugün çalışan satışlar
kaydedilemez hâle gelir. Sınır günün SONU olmalı; bu ölçülmeden değiştirilmez.

### BEKÇİ ÖNERİSİ — liste değil, DESEN

> Sonucu `fifoDagit`e giden bir `acikPartiler`/`acikPartilerToplu` çağrısı
> **`sinir` geçirmek ZORUNDA.** Geçirmeyen çağrı, yanında
> `/** SINIR YOK: <gerekçe> */` beyanı taşımıyorsa **KIRMIZI.**

Böyle kurulunca yarın açılan ekran da yakalanır; kimsenin listeye eklemeyi
hatırlaması gerekmez. İki yönde mutasyonla sınanır: sınırı KALDIRAN çağrı
kırmızı yanmalı, beyanlı istisna yeşil kalmalı.

⛔ **B YAZILMADI. Kod değişikliği (sinir) YAZILMADI** — ikisi de onay
bekliyor ve `lt`/`lte` sorusu önce ölçülmeli.

---

## 🚨 K82 — ÇOKLU ADETTE BİRİM FİYAT BÖLÜNÜYORDU · 29.08.2026 · [KAPANDI]

> **HALİL BULDU.** _"2 adet × ₺2.074 satılmış ama sistem birim fiyatı
> ₺1.037 gösteriyor ve satış zararda."_ `11373352181`

### ⭐ ÇELİŞKİ BAĞIMSIZ KANITLA ÇÖZÜLDÜ

İki kaynak çelişiyordu: TY API `price=2074` (adet 2) ↔ Halil'in dosyası
(iki satır, her biri adet 1 × ₺2.074). Hakem **kanalın kendi ödeme kaydı**
oldu:

    hakediş: SIPARIS_TUTARI 1897,71  ·  SIPARIS_TUTARI 1897,71   (İKİ SATIR)
             1897,71 = 2074 − 176,29   (2074'ün %8,5'i = komisyon)

İki satır = iki adet · her satır birim fiyattan komisyon düşülmüş hâli.
⭐ **Birim fiyat 2074, sipariş toplamı 4148. Bölme YANLIŞTI.**

### KÖK — ÖLÇÜM GERÇEKTİ, ÇIKARIM YANLIŞTI

`canli-ty-ice-aktar.ts → birimFiyatCoz` adete bölüyordu. Gerekçesi
26.08.2026 ölçümüydü: _"adet>1 olan 11 kalemin 11'inde de
`price === amount`"_. **Ölçüm gerçek, çıkarım yanlış:** o eşitlik **iki
okumayla da uyumlu** ve rakip hipotezi elemiyor. Ayırt edici kanıt hiç
aranmamıştı. → Anayasaya madde olarak geçti.

⚠ **VE HATA KENDİNİ EN AZ GÖRÜNÜR KILAN KÜMEDE YAŞIYORDU:** tek adetli 553
kalemde bölme fark yaratmıyor (`x/1 = x`), yalnız çok adetlilerde bozuyor.

⚠ **VE TEST HATAYI SABİTLEMİŞTİ.** `ice-aktarma:dogrula`da
_"adet 2 → satır toplamı ikiye bölünür"_ yazılıydı — bir KURALI değil kodun
DAVRANIŞINI sabitleyen ölçüt. Düzeltmeye kalkanın karşısına kırmızı yanarak
çıkardı. Tersine çevrildi, **üç mutasyonla** sınandı (bölmeyi geri getiren ·
adetle çarpan · sıfır kapısını kaldıran) — üçü de kırmızı.

### ✅ ONARIM [KOŞTU] — 7 kalem, hepsi zarardan kâra

    kalem 7 · hepsi adet 2 · hepsi `enumerasyon` kaynaklı
    ciro 16.766,00 → 33.532,00   ⭐ EKSİK CİRO 16.766,00
    ⭐ hâlâ NET-1 negatif olan: 0 / 7

| sipariş | NET-1 önce → sonra | NET-2 önce → sonra |
|---|---|---|
| `11492207627` | −1.401,70 → **482,77** | −1.170,80 → 396,88 |
| `11438745987` | −899,08 → **1.643,26** | −753,29 → 1.361,28 |
| `11431419530` | −377,94 → **4.943,28** | −323,10 → 4.103,10 |
| `11419703466` | −217,94 → **706,55** | −183,20 → 585,63 |
| `11399165160` | −286,55 → **1.059,09** | −241,18 → 877,79 |
| `11373352181` | −1.255,96 → **624,46** | −1.049,52 → 514,63 |
| `11370752568` | −344,94 → **604,30** | −288,97 → 500,56 |

⭐ **HALİL'İN HESABI BİREBİR TUTTU:** `11373352181` için brüt kâr
4.148 − 3.036,20 = **1.111,80** (Halil ₺1.112 demişti); kesintiler sonrası
NET-1 **624,46**.

⚠ **VERDİĞİ BEŞE EK OLARAK İKİ SİPARİŞ DAHA BULUNDU** (`11373352181`
örnekti, `11399165160` hiç bildirilmemişti) — küme listeden değil
**ölçütten** kuruldu: `enumerasyon` kaynaklı + adet>1 + iptalsiz.

⛔ **ELLE GİRİLEN 3 ÇOK ADETLİ KALEME DOKUNULMADI** — onların birim fiyatını
kullanıcı kendi girdi, bölme oraya hiç uğramadı.

**Maliyet tarafı DOĞRUYDU** (FIFO birim maliyeti × adet); yalnız fiyat
bölünüyordu. Komisyon ORAN olarak saklı olduğu için kendiliğinden düzeldi.

---

## ✅ K83 — FİZİKSEL SAYIM ESAS · YAZILDI 29.08.2026 · [KOŞTU · 181 hareket]

> Halil **7 saat** fiziksel sayım yaptı ve kuralı koydu: **fiziki varlık
> esastır.** Sonraki Excel aktarımları stok rakamlarını bozdu — sıra
> yanlıştı, sayım SON SÖZ olmalı.

Ölçüm: `npm run canli:sayim-esas` (salt okuma).
Dosya md5 **birebir teyit edildi** (`41d7b2…52`) · sayfa `SELLİORA` 1103 satır.
⛔ `TRENDYOL` sayfası (218 barkod) bu işe **dahil değil** — kanal listeleme stoğu.

    "Olması gereken" DOLU : 207   ✓ (beyanla aynı)
    ⭐ SKU EŞLEŞMESİ       : 207/207 BULUNDU · bulunamayan 0

### ⭐ İKİ FARK AYRI ÖLÇÜLDÜ — VE KAYMA ÇOK KÜÇÜK ÇIKTI

    ① SAYIM ANINDAKİ (dosyanın kendi iki sütunu)
       tutuyor 106 · FAZLA 52 (−207) · AZ 49 (+104) · net −103
       ⭐ mimarın ölçümüyle BİREBİR

    ② BUGÜNKÜ (sistemin şu anki adedi ↔ sayılan)
       tutuyor 104 · FAZLA 53 (−208) · AZ 50 (+105) · net −103

    ⚠ SAYIMDAN BUGÜNE KAYAN SATIR: 2 / 207

⭐ **Yani sayımdan bu yana yalnız 2 satır oynamış.** Düzeltme ②'ye göre
yapılır; ① kayıt olarak durur.

### DÜZELTME PLANI — `COUNT_CORRECTION`

    EKSİ yön (mal gitmiş) : 53 varyant · −208 adet
    ARTI yön (mal fazla)  : 50 varyant · +105 adet

    ARTI'da maliyet: FIFO'da parti VAR 43 (₺135.195,16) · ⛔ parti YOK → NO_COST 7
    EKSİ'de FIFO   : düşülecek maliyet ₺499.809,07 · ⛔ parti YETMEYEN 0

⭐ **ENVANTER DEĞERİ NET ETKİSİ: −₺364.613,91** (499.809,07 çıkar,
135.195,16 girer). Bu bir kayıp TESPİTİ değil, kaydı: mal zaten yoktu,
defter fazla gösteriyordu.

⛔ **UYDURMA MALİYET YAZILMAZ:** 7 varyantta FIFO'da hiç parti yok; onların
partisi **NO_COST** doğar ve satıldığında kâr dürüstçe "hesaplanamadı" der.

### KÂR ETKİSİ — YOK (bilerek)

`COUNT_CORRECTION` **kâr tablosuna girmez** (kullanıcı kararı 12.08.2026):
düzeltme bir satış değildir, NET-1/NET-2'ye karışmaz; dönem raporunda AYRI
kalem olarak GERÇEK NET'ten düşer.
⚠ Bu varyantlarda maliyet bağı olmayan satış kalemi **0** — yani ARTI
partileri bekleyen bir bağlama işi yok.

### GERİ ALMA — DETERMİNİSTİK

Kimlik listesi DEĞİL: `note` içinde `sayim-fiziksel-20260829` geçen
hareketler. `npm run canli:sayim-esas -- --geri`

### ✅ YAZILDI [KOŞTU 29.08.2026] — 181 hareket

    yazılan hareket 181 (COUNT_CORRECTION) · eksi 132 · artı 49
    net stok 1617 → 1515   fark −102   (beklenen −102)   ✓
    envanter değeri: ARTI +₺133.823,64 · EKSİ −₺499.009,17
    ⭐ NET −₺365.185,53

⭐ **DOĞRULAMA — SAYILAN 207 VARYANTIN 207'Sİ ARTIK TUTUYOR:**
kuru koşum yeniden koşuldu → `tutuyor 207 · fazla 0 · az 0 · net 0`.
**İkinci koşum: 0 yeni hareket** (betik kendi damgasını görüp duruyor).

⚠ **RAKAM 103 DEĞİL 102 ÇIKTI VE SEBEBİ YAZILI:** kuru koşum ile yazım
arasında bir varyantın farkı kapandı (defter oynadı). Ölçüm anı ile yazım
anı aynı an değildir; sapma değil, zamandır.

**7 NO_COST PARTİ** (FIFO'da hiç parti yok, maliyet UYDURULMADI):
`axcali1604` +1 · `axcali1696` +1 · `axcali1820` +2 · `axcali2587` +2 ·
`axcali2601` +14 · `axcali2850` +2 · `KOZ-PH-BRI92-01` +1

**İZ:** `AuditLog → FIZIKSEL_SAYIM_ESAS_ALINDI` · 1748 karakter, JSON
sağlam. ⭐ **Sayım anındaki fark (①) ize YAZILDI** — `tutuyor 106 · fazla 52
· az 49 · net −103` orada duruyor, kaybolmuyor.

**GERİ ALMA ÖLÇÜTÜ DOĞRULANDI:** `note` içinde sayım kodu geçen hareket
**181/181** buluyor.
⚠ **AMA TAM TUR CANLIDA KOŞULMADI** — 181 hareketi silip yeniden yazmak,
arada stoğu yanlış bırakırdı. **Ölçüt sınandı, kapı sınanmadı;** istenirse
koşulur. _(Dürüstlük notu: dün kargo yazımında geri alma yolu bozuktu ve
ancak sorulunca çıktı.)_

⚠ **İKİ DEFTER:** 102 varyantın 100'ünde `ledger = FIFO`. Ayrışık 2
(`axcali1660` · `axcali1610`) — **dünkü `EXCHANGE_OUT` partisiz çıkış
vakasının aynısı, yeni ayrışma DOĞMADI.**

---

## 🆕 K84 — SAYIM KORUMASI · 29.08.2026 · [ÖLÇÜLDÜ, KOD YAZILMADI]

Ölçüm: `npm run canli:sayim-korumasi` (salt okuma).

**① STOK YAZAN 10 YOL — DOKUZU GERİYE DÖNÜK YAZABİLİYOR.** Yalnız
`iadeler/bildirim-actions` `new Date()` kullanıyor; kalan dokuzun tarihi
dışarıdan geliyor (dosya · form · satış tarihi).

**② ⭐ MEŞRU GERİYE DÖNÜK VAKA VAR — TAM YASAK YANLIŞ OLURDU:**

    sayımdan SONRA yazılan hareket
      iş tarihi sayımdan SONRA (normal) : 16
      ⛔ iş tarihi sayımdan ÖNCE         : 15   ← HEPSİ `PURCHASE_IN`

Onbeşi de **geç girilen alım** (`OYU-LG-598P-01`, iş tarihi ocak/mart,
yazılış 26.08). Yasaklasaydık gerçekten olmuş bir mal kabulünü kaydetmek
imkânsızlaşırdı. _(29.08 `sinir` dersinin aynısı: makul görünen kısıt
çalışan akışı kilitler.)_

**③ YÖN AYRIMI — ASIL TEHLİKE AŞAĞI YÖNDE:**
· stoğu **ARTIRAN** geç kayıt (alım) sayılmış rafı düşürmez; sayımın
  "fazla" dediğini haklı çıkarabilir — çelişki değil, bilgi.
· stoğu **DÜŞÜREN** geç kayıt (satış · içe aktarma · düzeltme) sayılmış
  malı yok eder. **29.08 arızasının kaynağı bu.**

**④ ÖNERİ — YASAK DEĞİL DURAKSAMA (⛔ kod yazılmadı):**
(a) sayım damgasından öncesine yazılacaksa işlem **DURUR ve sebebi
yazar**; kullanıcı ısrar ederse istisna **iz bırakarak** geçer.
(b) geçen her istisnada varyant **"sayım geçersizleşti"** diye işaretlenir
ve yeniden sayılması istenir.

**⑤ BEKÇİ ÖNERİSİ — desen yasağı, liste değil:**
> `stockMovement.create` çağıran ve `occurredAt`i sabit OLMAYAN her yol,
> yazmadan önce `sayimKorumasi(variantId, occurredAt)` kapısından geçmek
> ZORUNDA. Geçmeyen çağrı, yanında `SAYIM KORUMASI YOK: <gerekçe>` beyanı
> taşımıyorsa KIRMIZI. İki yönde mutasyonla sınanır.

### ✅ GERİ ALMA KAPISI KOŞULDU [29.08.2026] — ÇALIŞIYOR

_"Ölçüt sınandı, kapı sınanmadı"_ demiştim; kapı da koşuldu.
⚠ **Önce risk ölçüldü:** artı partilerden tüketim **0**, son 1 saatte başka
hareket **0** → en kötü ihtimal bir saat önceki hâle dönmekti, o da dosyadan
yeniden yazılabilirdi.

    yazım        1617 → 1515 · 181 hareket
    GERİ ALMA    1515 → 1617 · 0 hareket        ✓ tam eski değere döndü
    yeniden yaz  1617 → 1515 · 181 hareket      ✓ rakamlar BİREBİR aynı
                 (ARTI +133.823,64 · EKSİ −499.009,17 · net −365.185,53)

⭐ Yeniden yazımın **aynı rakamları** üretmesi ayrıca bir belirlenimlilik
kanıtı: küme listeden değil ölçütten kuruluyor.

---

### 🔒 K84 — SAYIM KORUMASI · 29.08.2026 · [KURAL VE BEKÇİ HAZIR · KAPI BAĞLI DEĞİL]

**⭐ (c) SORUSUNUN CEVABI — ARTIRAN HAFİF DEĞİL, ve gerekçe FİZİKSEL:**

| yön | ne olur |
|---|---|
| **DÜŞÜREN** (satış · aktarma · eksi düzeltme) | sayılmış malı **yok eder** — rafta vardı, defterden siliniyor |
| **ARTIRAN** (geç girilen alım) | mal sayım sırasında raftaysa **sayan kişi onu ZATEN saydı**; geriye dönük alım aynı malı **ikinci kez** ekler, stok **şişer** |

⭐ **İkisi de sayımı geçersiz kılar → ikisi de AYNI sertlikte duraksatır.**
Değişen tek şey **kullanıcıya söylenen cümle**, çünkü yapılacak kontrol farklı.

⚠ **VE KENDİ ÖLÇÜMÜMDE KUSUR BULDUM:** ilk turda sayımın **iş tarihi** ile
**yazılış anını** tek değişkende tutmuşum; meşru hareketleri tehlikeli
gösteriyordu. İki çıpa ayrıldı, ölçüm tekrarlandı:

    iş tarihi sayımdan SONRA (normal) : 16 → 11
    ⛔ iş tarihi sayımdan ÖNCE         : 15   (değişmedi, hepsi `PURCHASE_IN`)

⚠ **VE ÖRNEKLEM DAR OLDUĞU YAZILI:** bugünden önce sistemde yalnız birkaç
sayım vardı; _"yalnız alım geriye dönüyor"_ gözlemi **zayıf tabanlı.** Kural
bu gözleme değil, yukarıdaki **fiziksel gerekçeye** dayanıyor.

**TESLİM EDİLEN:**
· `src/lib/sayim-korumasi.ts` — saf gövde. Sayım damgası yoksa/hareket
  sonraysa/adet 0 ise SERBEST; öncesine yazılıyorsa **DURAKSA** + yön + sebep.
· ⭐ **AYNI GÜN SERBEST — bilerek:** sayım günü yapılan satış sayımdan önce
  de sonra da olabilir; kilitlersek sayım gününün TAMAMI kapanırdı.
  _(FIFO `sinir` kararının TERS yöndeki kardeşi.)_
· `sayim-korumasi:dogrula` — ① saf gövde **çağrılır**, değeri sınanır
  ② geriye dönük yazabilen her yol kapıdan geçmeli, geçmiyorsa beyan taşımalı.
  **Desen yasağı, liste değil.**
· **DÖRT MUTASYON, DÖRDÜ DE KIRMIZI:** artıranı serbest yapan · aynı günü
  kilitleyen · korumayı kaldıran · beyansız yol ekleyen.

### ⛔ KAPI HİÇBİR YOLA BAĞLANMADI — VE BU KODA YAZILI

Dokuz yolun dokuzunda `SAYIM KORUMASI YOK:` **borç kaydı** duruyor. Gerekçe
uydurulmadı; beyan aynen şunu diyor: _"kapı henüz bağlanmadı, eksik olan
KULLANICI TARAFI — duraksama bir soru sorar ve ısrar yolu gerektirir, o ekran
yok. Ekransız bağlamak meşru bir işi SESSİZCE kilitlerdi."_

⚠ **VE BİR KAPSAM BULGUSU:** arızayı yapan aktarım **`src/` içinde değil,
`scripts/` altında.** Bekçi bugün yalnız `src`i tarıyor — betikler kapsam
dışı. Bu, bekçinin bilinen sınırı olarak burada yazılı.

### İSTİSNA EKRANDA NEREYE — ÖNERİ

Halil: _"AuditLog yeterli değil, kullanıcı yeniden sayması gerektiğini
bilmeli."_ Katılıyorum. Önerim:
· **Uyarı merkezine YENİ ANAHTAR:** `sayimGecersizlesti` — _"N varyantın
  sayımı geçersizleşti, yeniden sayılmalı."_ Bu kalem **kapatılabilir**
  (yeniden say → kapanır), yani K49 ölçütünü geçiyor: uyarı kutusuna girer.
· Rakama tıklayınca **süzülmüş liste** açılır (İlke #16).
⛔ Yazılmadı — kapı bağlanmadan uyarının besleyeceği veri doğmaz.

---

## 🆕 K85 — `scripts/` KAPSAMI · 29.08.2026 · [ÖLÇÜLDÜ]

> Halil'in tespiti: _"koruma bugün ARIZANIN GELDİĞİ YERİ kapsamıyor."_
> **Doğru** — ve ölçüm bunu daha da kötü gösterdi.

Ölçüm: `npm run scripts-kapsami:olc` (salt okuma).

    `scripts/` altında .ts dosyası      : 213
    ⭐ `stockMovement.create` ÇAĞIRAN   : 14
       occurredAt SABİT (zaten temiz)  :  4
       kapıdan geçen                   :  0
       beyanı olan                     :  0
    ⛔ KAPSAM UZATILIRSA YENİ İHLAL     : 10

### ⛔ VE SINIFLANDIRMA DENEMEM ÇÖKTÜ — ASIL BULGU BU

_"Tek seferlik onarım"_ ile _"sürekli koşan aktarım"_ı desenle ayırmayı
denedim (`PARTI =` · `KODLAR =` · `--geri` işaretleri). **Ölçüt çöktü:**

    canli-alis-ice-aktar.ts   → "tek seferlik" sayıldı
    canli-satis-ice-aktar.ts  → "tek seferlik" sayıldı
    ⛔ OYSA ARIZAYI YAPAN AKTARIMLAR TAM BUNLAR.

İşaretler **iki sınıfta da** geçiyor; desen NİYETİ ayırt edemiyor.
_(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz" —
bugün ikinci kez aynı tuzak, bu sefer kendi bekçimde.)_

⚠ **VE YANLIŞ SINIFLANDIRMA SESSİZ OLURDU:** bekçi "sürekli koşan 3 araç"
diye rapor vermişti ve o üçü (`fifo-dogrula` · `rma-prova` ·
`canli-deneme-sifirla`) **risksiz olanlardı.** Gerçek risk taşıyan iki
aktarım muaf sayılıp geçecekti.

### ⭐ ÖNERİ — SINIF TAHMİN EDİLMEZ, BEYAN EDİLİR

    /** BETİK SINIFI: SUREKLI */                    → kapıdan geçmeli
    /** BETİK SINIFI: TEK_SEFERLIK — <gerekçe> */    → muaf

Beyanı **olmayan** betik KIRMIZI. Böylece yarın eklenen bir aktarım
_"tek seferlik sanılıp"_ sessizce geçemez ve muafiyet **insan kararı**
olarak koda yazılır.

**ON İHLAL — sınıfını Halil belirler:**

| betik | npm komutu |
|---|---|
| `canli-alis-ice-aktar` | VAR ⛔ **aktarım** |
| `canli-satis-ice-aktar` | VAR ⛔ **aktarım** |
| `canli-ice-aktarma-stok-bagi` | VAR |
| `canli-dosya-maliyet-kuru` | VAR |
| `canli-ileri-parti-onar` | VAR |
| `canli-k74-maliyet` | VAR |
| `canli-sayim-esas` | VAR |
| `fifo-dogrula` · `rma-prova` | VAR (test/bekçi) |
| `canli-deneme-sifirla` | yok |

⛔ **KOD DEĞİŞMEDİ.** Doğru sıra: **önce beyan kuralı, sonra kapsam.**

---

### ✅ BEYAN KURALI YAZILDI + KAPSAM `scripts/`E UZATILDI [29.08.2026]

    bekçi ölçütü 21 → 31 kontrol
    ⭐ VE TAM OLARAK ARIZAYI YAPAN İKİ AKTARIMI YAKALADI:
       canli-alis-ice-aktar · canli-satis-ice-aktar → "SUREKLI ama kapı yok"

**ON BETİĞİN SINIFI — Halil'in kararıyla, körlemesine değil:**

| sınıf | betik | gerekçe |
|---|---|---|
| **SUREKLI** | `canli-alis-ice-aktar` · `canli-satis-ice-aktar` | her yeni dosyada yeniden koşar; **29.08 arızasını bu sınıf yaptı** |
| TEK_SEFERLIK | `canli-ice-aktarma-stok-bagi` | K55, `--geri=<parti>` ile geri alınır |
| TEK_SEFERLIK | `canli-dosya-maliyet-kuru` | `dosya-maliyet-20260828` partisine kilitli |
| TEK_SEFERLIK | `canli-ileri-parti-onar` | `ileri-parti-onarim-20260829` partisine kilitli |
| TEK_SEFERLIK | `canli-k74-maliyet` | YEDİ sipariş kimliğine kilitli |
| TEK_SEFERLIK | `canli-sayim-esas` | sayım koduna kilitli, ikinci koşum 0 döndürür |
| TEK_SEFERLIK | `fifo-dogrula` · `rma-prova` | bekçi/prova — canlı stoğa dokunmaz |
| TEK_SEFERLIK | `canli-deneme-sifirla` | 23.08, ÜÇ sipariş numarasına kilitli |

**⚠ KOMUTSUZ BETİK — ÖLÇÜLDÜ, ÖLÜ KOD DEĞİL.** `canli-deneme-sifirla`
`package.json`da hiç yok (0 eşleşme) ama **koşulmuş**: üç sipariş
numarasına kilitli, ve iki betik (`canli-11467-geri-yukle` ·
`canli-11473-degisim-var`) ondan söz ediyor — biri onun bir kısmını GERİ
ALMIŞ. Yani "gövdesiz beyin" değil, **kayıt dışı koşulmuş bir araç.**
⭐ Asıl bulgu: `tsx` ile doğrudan koşulan betikler `package.json`
listesinde görünmüyor — **bekçi listesi oradan okunduğu için o betikler
hiçbir listeye girmiyor.** Beyan kuralı bunu kapatıyor: liste değil, dosyanın
kendisi konuşuyor.

**ÜÇ MUTASYON — AYRIM DOĞRU ÇALIŞTI:**
· beyanı SİL → **KIRMIZI** ✓
· `SUREKLI`→`TEK_SEFERLIK` gerekçeli çevir → **YEŞİL** ✓ (insan kararı)
· `TEK_SEFERLIK` gerekçesiz → **KIRMIZI** ✓ (muafiyet bedava değil)

⛔ İki `SUREKLI` aktarımda kapı hâlâ bağlı değil; **borç beyanı en görünür
yere** (dosyanın ilk satırlarına) konuldu ve doğru davranış yazılı:
_"betikte SORU SORULMAZ — ATLA VE RAPORLA."_

---

## 📐 ŞEMA KURU KOŞUMU — `sayimGecersizAt`

    KOLON   ProductVariant.sayimGecersizAt  DateTime?  · nullable
    İNDEKS  @@index([sayimGecersizAt])
    ETKİLENEN SATIR  1104 (hepsi) — hepsi NULL doğar, GERİ DOLDURMA YOK
    GERİ DÖNÜŞ       kolon nullable, varsayılansız → `DROP COLUMN` yeter

⭐ **NİYE VARYANTTA:** uyarı merkezi _"N varyantın sayımı geçersizleşti"_
diye **SORGULAMAK** zorunda. Serbest metin geriye bakmaya yeter, sorguya
yetmez — merdivenin 2. basamağından 4.'ye çıkış gerekçesi bu.

⚠ **İNDEKS BUGÜN GEREKLİ DEĞİL, YARIN GEREKLİ:** 1104 satır küçük bir
tablo. Kolonla birlikte açmak migration'ı ikiye bölmemek için.
⚠ **VERİ KAYBI RİSKİ YOK:** damgaların ikinci kopyası `AuditLog`ta
(iz iki yere yazılıyor).

⛔ **MIGRATION KOŞULMADI, ŞEMA DEĞİŞMEDİ.** Anayasa: şema commit'i
migration canlıda koşana kadar push edilmez. **Onay bekliyor.**

### ✅ `sayimGecersizAt` MIGRATION KOŞTU [29.08.2026]

    SQL (yalnız iki ifade, adının dışına çıkmadı):
      ALTER TABLE `ProductVariant` ADD COLUMN `sayimGecersizAt` DATETIME(3) NULL;
      CREATE INDEX `ProductVariant_sayimGecersizAt_idx` ON `ProductVariant`(`sayimGecersizAt`);

    ⚠ deploy:bekci ÖNCE  : ÇIKIŞ 1  ← migration koşmadan push edilemez (doğru)
    canlı migrate         : 40 migration, yenisi uygulandı ✓
    damga güncellendi     : prisma/canli-migrasyon-damgasi.json (commit edilir)
    sağlık kontrolü       : 45 tablo · 502 kolon canlıda doğrulandı
    yerel migrate deploy  : ✓   ·   prisma generate: ✓
    ⚠ deploy:bekci SONRA : ÇIKIŞ 0  ✓

**MIGRATION SONRASI SAYIM — hepsi tuttu:**

    ProductVariant toplam : 1104   (beklenen 1104)  ✓
    sayimGecersizAt DOLU  :    0   (beklenen 0)     ✓
    NULL                  : 1104   ✓ hepsi
    ⭐ kolon canlıdan OKUNDU: EVET ✓ (axcali3026 → null)

⭐ **Son satır önemli:** kolon yazılarak değil **okunarak** doğrulandı —
şemada olması canlıda okunabildiğini göstermez _(8cb0023 dersi)_.

⚠ **DEV SUNUCUSU YENİDEN BAŞLATILMALI** — `prisma generate` sonrası çalışan
sunucu eski istemciyi önbellekte tutar ve "Unknown field" verir. **Bu adım
Halil'de.**

---

## 📌 PANO — BEKÇİ LİSTESİNİN KÖR NOKTASI KAPANDI

`tsx` ile **doğrudan** koşulan betikler `package.json`da görünmüyor; bekçi
listesi oradan okunduğu için o betikler **hiçbir listeye girmiyordu.**
Vaka: `canli-deneme-sifirla` — koşulmuş, canlı veriyi değiştirmiş, bir kısmı
sonradan geri alınmış, ama hiçbir listede yok.

⭐ **Beyan kuralı bunu kapattı: liste değil, DOSYANIN KENDİSİ konuşuyor.**
Bir betik `stockMovement.create` çağırıyorsa sınıfını beyan etmek zorunda —
`package.json`da olsun olmasın.

## 📐 ISRAR EKRANI — TASARIM (kod yazılmadı)

**NEREDE ÇIKAR:** duraksama, stok yazan **her yolun kendi onay adımında**
çıkar — ayrı bir ekran açılmaz. Üç yer:

| yol | nerede |
|---|---|
| **ekran işlemleri** (mal kabul · stok düzeltme · satış · iade) | kaydet düğmesine basınca, **kaydetmeden önce** araya giren onay bloğu |
| **toplu aktarım** (betikler) | ekran yok → **SORULMAZ, ATLANIR ve raporlanır**: "N satır sayım korumasına takıldı" |
| **API/otomatik** | aynı: atlanır + raporlanır |

⭐ **BETİKTE SORU SORULMAZ — VE BU BİLEREK.** Kimse başında değil; "ısrar"
kavramı orada yok. Atlamak, sessizce yazmaktan iyidir çünkü **atlanan satır
raporda görünür**, sessizce yazılan görünmez.

**NE SORAR** (metin sözlükten, İlke #5 — sebep ekranda yazar):

    ⚠ Bu ürün 29.08.2026'da SAYILDI.
    Yazmak üzere olduğunuz hareketin tarihi 27.07.2025 — sayımdan ÖNCE.

    [DÜŞÜREN ise]
    Sayımda rafta bulunan mal, bu kayıtla defterden düşecek.
    Sayım o malı GÖRDÜ; şimdi yok sayıyorsunuz.

    [ARTIRAN ise]
    Bu mal sayım sırasında raftaysa SAYAN KİŞİ ONU ZATEN SAYDI.
    Bu kayıt aynı malı İKİNCİ KEZ ekleyebilir ve stok şişer.

    ☐ Anlıyorum, yine de kaydet — bu varyantın sayımı GEÇERSİZLEŞECEK
      ve yeniden sayılması istenecek.
    Sebep: [kapalı liste ▾]  (açıklama zorunlu değilse "diğer" hariç)

⚠ **ONAY HER SEFERİNDE SORULUR** — "bir kez onayladım, artık sorma"
YOKTUR (anayasadaki ısrar kuralı).

**İZ NEYE YAZILIR — İKİ YERE:**
① `AuditLog` → `SAYIM_KORUMASI_ASILDI`: varyant · sayım tarihi · hareket
  tarihi · yön · sebep · kullanıcı. _(Geçmişe bakmak için.)_
② ⭐ **VARYANTIN KENDİSİNE**: `sayimGecersizAt` damgası — çünkü uyarı
  merkezi bunu **sorgulamak** zorunda ("N varyantın sayımı geçersizleşti").
  Merdiven: serbest metin geriye bakmaya yeter ama **sorgu gerekiyor**,
  o yüzden sütun. _(Anayasa: "geriye bakmak → serbest metin; SORGU → yapı".)_

⛔ Şema kalemi olduğu için **migration onayı ayrıca istenir.**

---

## 🚨 K88 — İLERİ PARTİ ONARIMININ ÖLÇÜTÜ YANLIŞTI · 29.08.2026 · [DÜZELTİLDİ]

> **HALİL BULDU:** _"bundan sayımda 4 tane saydık, 1 satış girdim, 3 kalması
> lazım — 20 görünüyor."_ (`axcali2997`)

### ⛔ HATA BENDEYDİ VE ÖNCÜLDEYDİ

`canli-ileri-parti-onar` şu varsayımla çalışıyordu:

    "partisi çıkıştan SONRA tarihli  ⇒  o satışın alımı defterde YOK"

**Yanlış.** Alım çoğu zaman defterde VARDIR, yalnız daha GEÇ tarihle
girilmiştir. Her ileri bağ için yeni parti açmak **aynı malı iki kez saydı.**

⚠ **VE DOĞRULAMAM YANLIŞ ŞEYİ DOĞRULUYORDU:** _"net stok +809, beklenen
+809 ✓"_ demiştim. Aritmetik doğruydu, **öncül yanlıştı.**

### ✅ DÖRT ADIM — her adımdan sonra ölçüldü

    başlangıç      net stok 1515 · axcali2997 = 20
    ① sayım geri al        1617 · sayım hareketi 0
    ② ileri-parti geri al   807 · axcali2997 = −1
       ⭐ İZ TAM: 810/810 eski bağ geri yüklendi · NO_COST satış 1 → 1
         (hiçbir satış maliyetini KAYBETMEDİ — yazmadan önce ölçüldü)
    ③ eksik-alim yaz        830 · negatif stoklu varyant 3 → 0
    ④ sayım yeniden koş     962 · ⭐ tutuyor 207/207 · net 0

### ⭐ YENİ ÖLÇÜT VE FARKI

    ⛔ ESKİ (ileri bağ başına) : 810 parti · 810 adet · 182 varyant
    ✅ YENİ (adet açığı)       :   3 parti ·  23 adet ·   3 varyant
    ⭐ FARK                    : 787 adet AZ

**179 varyantın hiç açığı yokmuş** — alımları defterde zaten vardı.
Gerçekten eksik olan üç varyant: `axcali2723` +15 · `OYUNEN88141740` +7 ·
`axcalistan01` +1. Üçünün de maliyeti dosyadan; **NO_COST yok.**

**Yeni ölçüt nasıl çalışıyor:** varyantın hareketleri kronolojik yürütülür;
stok ilk nerede negatife düşerse parti **o çıkışın tarihine** damgalanır.
Tarih uydurulmaz, FIFO sırası bozulmaz, varyant başına **tek parti**.
⚠ Net stoğu ≥ 0 olup geçmişte anlık negatife düşen varyant **kapsam dışı** —
orada mal alınmış, sadece geç kaydedilmiş; parti eklemek çift sayım olurdu.

### ✅ `axcali2997` KAPANDI

    sistem 6 · Halil 3 · fark −3   ← ölçüldü, VARSAYILMADI
    6'nın bileşimi: gerçek alım +22 · mal kabul +4 · ③'ün eklediği +7 · satış −27
    bugünkü satış `11548483041` sistemde VAR ve stok hareketi doğmuş ✓
    ⭐ COUNT_CORRECTION −3 (FIFO'dan, birim ₺796,00) → SONRA 3 ✓
    ikinci koşum: "BEKLENEN −3 DEĞİL (0) — YAZILMADI" ✓

⚠ **NİYE 207'LİK KÜMEYE GİRMEMİŞTİ:** sayım dosyasında satırı VAR ama
`Olması gereken Stok` sütunu **BOŞ**. Boş sütun _"sayılmadı"_ demektir ve
betik onu bilerek atlar — uydurmamak için.

### ✅ KAPANDI — 07.09.2026 (Halil: _"bu ürünün stoku şu an 0 zaten"_)

~~Halil'in henüz girmediği 3 satış var (`axcali2997`). Girildiğinde stok **0**
olacak.~~ **Ölçüldü ve amaç gerçekleşmiş.**

⚠ **VE SKU ARTIK YOK:** `axcali2997` diye bir varyant defterde bulunmuyor —
mükerrer kayıt birleştirmesinde kod değişmiş. "2997" taşıyan kayıt
**`OYUNEN88141740`** (Bebek Bezi Çöp Kovası): **stok 0** · 59 hareket ·
37 satış kalemi.

⛔ **DÜRÜSTLÜK NOTU:** o üç satışın TEK TEK girildiğini kanıtlayamıyorum —
stok 0'a başka bir yoldan da (sayım düzeltmesi) inmiş olabilir. Kanıtlanan
şey kalemin BEKLENEN SONUCU: stok 0. Kalem bu gerekçeyle kapanıyor, "üç satış
girildi" diye değil. _(Anayasa: "bir sayı etiketiyle taşınır".)_

---

## 🆕 K89 — AD KARMAŞASININ SOMUT KANITI · 29.08.2026 · [ÖLÇÜLDÜ]

Dosya: `ISIM UZELLMEMIS.xlsx` · md5 **8e6df13a…** (teyit edildi) · 44 satır,
tek ürün (`LEGO Disney 43217 Up House`).

    ⭐ AD tekil değer : 5     ← aynı ürün, beş ad
    ⭐ SKU tekil      : 3     ← 41'i aynı: 5702017424842

**Beş ad:** ikisi görünmez karakterle ayrışıyor — `│` (U+2502) ve `|`
(U+007C). Gözle bakan "aynı ad" der, makine "farklı" der.

⭐ **AD EŞLEŞTİRMEYİ REDDETME KARARININ (26.08) SOMUT KANITI.** Karcher
`SC 3 → SC 4` vakasının kardeşi: orada ad **yanlış ürünü** buluyordu,
burada ad **aynı ürünü beş parçaya** bölüyor. Kodla eşleşen 41 satır
sorunsuz.

⚠ **AMA "SKU HEP AYNI" DEĞİL — KALAN ÜÇÜ ÖLÇÜLDÜ:** `trendyol` (2) ve
`B0BBSBDCP7` (1, Amazon ASIN'i). Yani kod sütunu da kirli; ad eşleştirmesi
reddedilirken bu üçü **başka bir kovaya** düşer, sessizce geçmez.

### ⛔ VE "FİRMA BARKODU BOŞ" TESPİTİ SİSTEME UYMUYOR — ÖLÇÜLDÜ

Dosyada `AXCALI BARKOD` sütunu **44/44 boş** ✓. Ama bu, üründe firma
kimliği olmadığı anlamına GELMİYOR:

    SİSTEMDE (1104 varyant)
      Firma SKU BOŞ         : 0     %0,0
      Barkod (EAN) BOŞ      : 1     %0,1
      HEM ikisi birden boş  : 0

⭐ **Boşluk DOSYANIN sütununda, KATALOGDA değil.** K35 (firma etiketi)
kaleminin gerekçesi bu rakamla **zayıflıyor** — okutulacak kimliği olmayan
varyant yok. _(Kalem kapanmıyor ama gerekçesi düzeltiliyor: sorun etiket
eksikliği değil, dosyaya yazılmaması.)_

### ⛔ İSİM DÜZELTME GEREKMİYOR — SİSTEMDE ZATEN İKİ AD VAR, BEŞ DEĞİL

    OYU-LG-598P-01  5702017866932  LEGO ® Disney "Yukarı Bak" Evi 43217 …
    axcali2601      5702017424842  Disney 43217 'Up' House
    ⭐ sistemdeki tekil ad: 2   (dosyada 5)

Beş ad **pazaryerinden gelen satış dosyasının** metni; katalogda karşılığı
yok. Mükerrer çift birleşince **tek ad kalır** — ayrı bir isim temizliği
işine gerek yok.

---

### ⚠ İKİ AÇIK NOT

**· `10415881283` — aynı kampanyanın dördü FARKLI maliyetle duruyor.**
Üçü ₺1,00 yazıldı, dördüncüsünde FIFO damgası ₺849 var ve ① kararı gereği
dokunulmadı. **Kararın doğal sonucu, hata değil.**
⭐ **AMA defterdeki ₺849 muhtemelen promosyon kaydedilirken yanlış
girilmiş. FIFO damgalarının doğruluğu bir gün ölçülürse İLK BAKILACAK
VAKA budur.**

**· `10030751247` — Türk Kahvesi ₺1.700, dosyada VAR, sisteme HİÇ girmemiş.**
K56 içe aktarmasının kaçırdıklarından olabilir.
⭐ **ÖLÇÜM (yazımdan sonra, ayrı iş):** dosyada olup sistemde hiç olmayan
BAŞKA satış var mı? Kaç tane, kaç TL? K56 bunu hangi kovaya koymuştu?

---

## ✅ K66 KAPANDI + ⚠ K68b AÇILDI — 28.08.2026

**KOMİSYON AÇIĞI KAPANDI.** 5200 satış · 5319 kalem yazıldı, **başarısız 0**.
`AuditLog: KOMISYON_ORANI_GERIYE_DOLDURULDU` · geri alma
`npm run canli:komisyon-doldur -- --geri`.
Oranı hâlâ boş: **14 kalem** (Amazon 11 + TY 2 + HB 1) — planlandığı gibi.
K67'nin kör kovası (**yalnız komisyon eksik**) `2829 → 3`.

⚠ **"MARJ DÜŞECEK" DEDİM, TABLO %34,00 GÖSTERDİ — İKİSİ DE YANLIŞ OKUMA.**
Önce/sonra toplamları **karşılaştırılamaz**: 2443 satışın `net2`'si YOKTU,
şimdi VAR. Küme değişti, oran değil. Kendi kuralımı kendi raporuma
uygulamam gerekti. _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_

Komisyonun etkisi doğrudan ölçüldü: `SaleFee KOMISYON` toplamı
**₺2.066.869,50**. ⚠ Bu defterdeki **TÜM** komisyondur; kuru koşumun
₺1.811.040'ı yalnız YENİ yazılanların tahminiydi — farklı kümeler.

### ⭐ %34,00 GEÇERSİZ — iki farklı rakamın karışımı

| | satış | ciro | Σ net2 | marj |
|---|---|---|---|---|
| **maliyeti OLAN** | 3248 | 10.406.700,83 | 1.151.847,40 | **%11,07** |
| **maliyeti YOK** | 2443 | 6.370.520,17 | 4.552.585,02 | **%71,46** ⚠ |

**GERÇEK MARJ ~%11,07** ve iki bağımsız ölçüm aynı yeri gösteriyor:
yazımdan ÖNCE `CALCULATED` kümesi **%11,10** diyordu.

### ⚠ K68b — KÖK BULUNDU: `kalemMaliyeti` boş listede `0` dönüyordu

`for (const h of hareketler)` hiç dönmeyince `dortBasamak(0)` dönüyordu.
Yani **"FIFO bağı yok"** ile **"maliyet gerçekten sıfır"** aynı görünüyordu:
kalem `CALCULATED` sayılıyor, `net2` maliyet düşülmeden yazılıyordu.

    bağı olmayan kalem      2573   ciro 6.585.533,44   yazılmış "net2" 4.573.976,43
      bunun CALCULATED'ı      2493   <-- maliyet 0 sayıldı

⭐ **AYRIM TERTEMİZ:** `MALIYET = 0` olup HAREKETİ OLAN kalem sayısı **0**.
Yani gerçekten sıfır maliyetli tek bir parti bile yok — her sıfır
"bilinmiyor" demekti. Belirsizlik yok, hipotez yok.

⚠ Bu, aynı gün komisyon tarafında düzeltilen null↔0 hatasının **kâr
tarafındaki hâli — ama TERS yönde**: orada `null` yazılıyordu ("komisyon
yok" denmesi gerekirken), burada `0` ("bilinmiyor" denmesi gerekirken).

| # | İş | Durum |
|---|---|---|
| ① | `kalemMaliyeti` boş listede `null` dönsün | **[KOŞTU 28.08.2026]** — 4 mutasyon, 4'ü de kırmızı |
| ② | Bağsız satışların kârının TAZELENMESİ | **[KOŞTU 28.08.2026]** — 2525/2525, hata 0 |
| ③ | Maliyet bağının kurulması | **[KOŞTU 28.08.2026]** — 12 bağlandı, **2561 kaldı** |

**③ SONUÇ — küçük çıktı ve sebebi yapısal:**

    BAĞLANACAK 12 · ATLANAN 2561 (528 varyant, hepsinin AÇIK PARTİSİ 0)
    StockMovement 5350 → 5362 (+12) ✓   ·   kâr tazelendi 12/12
    hâlâ bağsız satış 2510              ·   ikinci koşum: 0 ✓
    PANEL MARJI 11,56% — DEĞİŞMEDİ (12 kalem 5893'ün içinde iz bırakmadı)

⛔ **KALAN 2561 SATIŞ TARAFINDA KAPANMAZ** — ama sebebi TEK DEĞİL.

⚠ **BENİM HATAM, KULLANICI DÜZELTTİ (28.08.2026).** Hem betik hem raporum
_"o ürünlerin alımı sisteme hiç girilmemiş"_ diyordu. `axcali1869` bunu
çürüttü: alım **GİRİLMİŞ** (`ALM-HB-260815-09`, 4 adet, teslim alınmış)
ama **10 adet satılmış**. Alım yok değil, **YETMİYOR.**

    ⛔ ALIM HİÇ GİRİLMEMİŞ    328 varyant · 1501 kalem · ₺3.814.348
    ⚠ ALIM VAR AMA YETMİYOR   200 varyant · 1060 kalem · ₺2.758.690

**İKİSİ FARKLI İŞ TARİF EDER** ve tek cümle 200 varyanta yanlış iş
söylüyordu:
· _"alım hiç yok"_ → o ürünün alımını **GİR**
· _"alım yetmiyor"_ → **EKSİK ADEDİ** gir (mevcut alım doğru, tam değil)

Mesaj kaynağında düzeltildi; ayrım artık `PURCHASE_IN` toplamından
**ÖLÇÜLÜYOR**, tahmin edilmiyor. Üç ölçüt eklendi, üçü de mutasyonla
kırmızı yandı — biri özellikle **eski yanlış cümlenin geri gelmesini**
yasaklıyor.
_(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_

### ⚠ GERİYE DÖNÜK BAĞ — kabul edildi, İZLİ

**12/12 hareket geriye dönük**: parti satıştan SONRA damgalı.

    gecikme: en küçük 96 gün · ortanca 142 gün · EN BÜYÜK 384 gün
    en uçtaki: satış 2025-08-09 → parti 2026-08-28

**KULLANICI KARARI 28.08.2026:** _"o malın gerçek alımı hiç kaydedilmedi;
bugün girilen alım o eksik kaydın yerine geçiyor. Maliyet GERÇEK (aynı
ürün, gerçek fatura), yalnız tarihi geç. Alternatif 'hiç maliyet' — daha
doğru değil, daha az bilgi."_

⚠ **VE TARİH SINIRI KONSAYDI KOŞUM 0 KALEM BAĞLARDI** — yani kullanıcının
alım girme işi hiçbir şey kazandırmazdı: girdiği her alım, girmeden önceki
satışlara bağlanamazdı.

**İZ:** her geriye dönük bağ `AuditLog`a gecikme günüyle yazılıyor
(`geriyeDonukBag`) **ve ekranda da basılıyor** — kaydedilip görünmemek
"kaydedilen ≠ görünen" hatası olurdu.

### ⚠ `sinir` PARAMETRESİ — İKİ KULLANIM AYRI, BEKÇİYLE SABİT

| Kullanım | `sinir` | Soru |
|---|---|---|
| **K55 stok bağı** | **VERİLMEZ** | "bu satışın maliyeti ne?" |
| **tarihli envanter** _(K53)_ | **ZORUNLU** | "o TARİHTE elimde ne vardı?" |

Karıştırılırsa iki farklı soruya tek cevap verilmiş olur. Beş ölçüt
eklendi (`ice-aktarma:dogrula`), beşi de mutasyonla kırmızı yandı:
K55'e `sinir` eklemek · tarihli envanterden kaldırmak · `AuditLog` izini silmek ·
ekran satırını silmek · gerekçe yorumunu silmek.
| ④ | `CALCULATED` olmayan satırlarda NET alanları | **[KOŞTU 28.08.2026]** — kod + veri |

**② SONUÇ — panel marjı ÖLÇÜLDÜ (tahmin değil):**

    ÖNCE                              SONRA
    CALCULATED  5691  5.704.432,43    CALCULATED  3245  1.147.279,90
    (boş)         82          0,00    NO_COST     2525  4.714.528,05
                                      (boş)          3          0,00
    PANEL MARJI  34,43%          →    PANEL MARJI  11,56%

⛔ Σ net2 yan yana yazıldı, **oranları BÖLÜNMEDİ** — küme değişti.
İkinci koşum: hedef aynı 2525, panel marjı **değişmedi (11,56%)** → idempotent.
Doğrulama taraması: **`CALCULATED` + maliyetsiz kalem = 0** (çıkış kodu 0).

**⚠ KULLANICININ YAKALADIĞI DÖRT SATIR — kaçış DEĞİLDİ.** `4071382273 ·
4558198425 · 4088751365 · 4106341348` teyit çıktısında hem `CALCULATED`
hem "maliyet bağı yok" görünüyordu. Ölçüldü: o an **107 kalem** o hâldeydi
ve **107/107'si hedef kümedeydi** — yani koşum onlara henüz ulaşmamıştı.
Koşum bitince sayı **0**'a indi. _(İki ihtimalden hangisi olduğu tahmin
edilmedi, ölçüldü.)_

### ⚠ ④ AÇIK — `NO_COST` satırlarda `net2Amount` DOLU

`karYenidenYaz` durumdan bağımsız olarak `net2Amount` yazıyor. Sonuç:
**2525/2525 `NO_COST` satırında `net2Amount` dolu** ve toplamı
**₺4.714.528** — maliyeti düşülmemiş bir rakam.

✅ **BUGÜN KİMSE ONU TOPLAMIYOR** (ölçüldü): `satis-toplami.ts` süzgeçte
`profitStatus: "CALCULATED"` şartını taşıyor, panel `durum`a bakıyor.
⛔ Ama alan bir İDDİADIR: `net2Amount` dolu olan bir satır "kârı budur"
der. Süzgeci unutan İLK tüketici ₺4,7M'yi kâra yazar.
_(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur"
kuralının tersi: burada yazıcı VAR ama yazdığı şey geçersiz.)_
**KARAR VE SONUÇ (kullanıcı, 28.08.2026):** _"₺4,7M'lik iddiayı disipline
değil MEKANİZMAYA bağlarız."_

    ÖNCE   NO_COST 2525 · net1 5.668.424,24 · net2 4.714.528,05
    SONRA  NO_COST 2525 · net1         0,00 · net2         0,00
    temizlenen: satış 2526 · kalem 2574   ·   kalan ihlal: 0 ✓
    PANEL MARJI: 11,56% — DEĞİŞMEDİ (zaten süzülüyordu) ✓
    ikinci koşum: hedef 0 ✓

⚠ **`net1` DE ŞİŞİKTİ** — ölçüldü, ₺5.668.424. `net1 = satış − maliyet −
komisyon − stopaj` ve maliyet `0` sayılıyordu. İkisi birlikte temizlendi.

⚠ **KURAL DURUMA GENEL YAZILDI**, `NO_COST`a özel değil: `RULE_MISSING` ve
`CURRENCY_MISMATCH` de eksik bir hesabı temsil eder. Bugün o durumda satır
yok ama yarın doğan bir satır aynı yalanı taşırdı.

⚠ **TEMİZLİK 1 SATIR FAZLA:** 2526/2574 güncellendi (2525/2573 değil) —
fazlası bir İPTAL EDİLMİŞ satış. Ölçüt `iptalTarihi` süzmüyor ve bu
bilinçli: iptal satışın da geçersiz bir NET taşımasının sebebi yok.

⚠ **NE SİLİNDİ, NE KALDI:** yalnız `net1Amount` ve `net2Amount`.
`profitStatus`, `profitCurrency`, `SaleFee` kalemleri ve stok defteri
ELLENMEDİ — kesintiler ÖLÇÜLMÜŞ gerçeklerdir, geçersiz olan yalnız
onlardan türetilen NET.

⚠ **`karYenidenYaz` KULLANILMADI:** kod düzeltildi (`netYaz`) ama o yalnız
YENİ yazmaları etkiler. Var olan satırlar için motoru yeniden koşturmak
~40 dk sürer ve hiçbir hesabı değiştirmezdi — yapılacak tek şey geçersiz
bir değeri SİLMEKTİ. Hesaplama değil, temizlik.

**Süzgeç zorunluluğu KALDIRILMADI** — `satis-toplami.ts`teki
`profitStatus: "CALCULATED"` şartı ikinci savunma olarak duruyor.

⚠ **① TEK BAŞINA EKRANI DEĞİŞTİRMEZ:** `profitStatus` ve `net2Amount`
SAKLANIYOR; kod düzeldi ama defterdeki damgalar eski. Tazeleme koşmadan
panel hâlâ ₺4,5M sahte kârı gösterir.

✅ **VE PANEL KENDİLİĞİNDEN DÜZELECEK:** `donemOrtalamaMarji` hesaplanamayan
kalemleri hem paydan hem PAYDADAN çıkarıyor (`hesaplananCiro`). Yani ayrı
bir ekran yaması GEREKMİYOR — tazeleme yeter.

⚠ **BİR BEKÇİ ESKİ DAVRANIŞI SABİTLEMİŞTİ:** `iade:dogrula` içinde
_"hareket yoksa maliyet sıfır"_ ölçütü vardı ve **gerekçesizdi** — kodun o
anki davranışını sabitliyordu, bir kuralı değil. Sarmalayıcının kendi
belgesi zaten _"uydurulmaz"_ diyordu. Ölçüt tersine çevrildi, eski hâli
gerekçesiyle bırakıldı.

### ⚠ BEKÇİ KÖR NOKTASI — İlke #16 ölçütlerinde yaşandı

Yeni yazılan altı ölçüt **kör kaldı** ve sebebi öğreticiydi: blok
`panel-dogrula.ts`te **özetten SONRA** koşuyordu, `process.exitCode` çoktan
yazılmıştı. Ölçüm doğruydu, **karara ulaşmıyordu.**
_(Anayasa: "ölçüm ile karar arasındaki boru da ölçümün parçasıdır" —
`| tail -2` ve `echo $?` vakalarının bekçi içindeki hâli.)_
Blok özetin ÖNÜNE alındı, altı mutasyonun altısı da kırmızı yandı.

---

### ⭐ K66 — commissionRate BOŞ YAZILIYOR · 28.08.2026 · **EN BÜYÜK BULGU**

> İçe aktarma `commissionRate` alanını **hiç yazmıyor**. `null` "bilinmiyor"
> demek olduğu için kâr motoru komisyonu HİÇ DÜŞMÜYOR — ve NET olduğundan
> **YÜKSEK** çıkıyor.

| # | İş | Durum |
|---|---|---|
| ① | Kapsam ölçümü | **[KOŞTU 28.08.2026]** |
| ② | Geriye doldurma kuru koşumu | **[KOŞTU]** — `npm run canli:komisyon-doldur` |
| ③ | Yazma + `karYenidenYaz` | **[KURU KOŞUM HAZIR · ONAY BEKLİYOR]** |
| ④ | İçe aktarmanın oranı YAZMASI | **[KOŞTU 28.08.2026]** — beş yeni bekçi ölçütü, beşi de mutasyonla kırmızı yandı |
| ⑤ | AMAZON 11 kalem | **[BEKLİYOR]** — %1,00 doğrulanacak, HARİÇ tutuldu |

**③ KURU KOŞUM — Amazon HARİÇ:**

    DOLDURULABİLİR   5319 / 5333        TRENDYOL 3381 · HEPSIBURADA 1938
    etkilenecek satış  5200             belirsiz 2 · dosyada yok 1
    ciro          15.087.879,55
    komisyon (KDV hariç)   1.811.040,15
    komisyon (HB KDV'li)   1.979.025,43
    HARİÇ: AMAZON 11 kalem · 45.221,00 TL  (oran %1,00 — yer tutucu şüphesi)

⛔ **SONRAKİ NET-2 TAHMİN EDİLMEDİ.** Komisyon KDV'si indirilecek KDV'ye
giriyor ve NET-2 ödenecek KDV'yi de düşüyor; zinciri yalnız kâr motoru
bilir. Tahmini bir rakam basmak, sistemin kendi hesabı sanılacak bir sayı
üretirdi. Yazımdan SONRA aynı tablo yeniden basılır ve fark ÖLÇÜLÜR.

⚠ **MARJ DÜŞECEK VE BU BEKLENEN.** ₺1.811.040 komisyon ilk kez düşülüyor.
Düşüş **"bozuldu" değil, "İLK KEZ DOĞRU"** demektir.

**④ NE YAPILDI:** içe aktarma artık `KOMİSYON ORANI` kolonunu okuyup
`SaleItem.commissionRate`e yazıyor. Oranı okunamayan kalem **`oranYok`
kovasına düşüyor, sessizce boş yazılmıyor.** Komisyonsuz kanalda (DEPO)
oran `0` yazılır — `null` değil.

Beş ölçüt eklendi ve **beşi de mutasyonla kırmızı yandığı GÖRÜLDÜ**:
kaldıran yön (yazma satırı silindi · kapı silindi · `0` yerine `null` ·
makul aralık kapısı silindi) ve **yanlış kaynak yönü** (oran `KOMİSYON
TUTARI`ndan türetildi → KDV iki kez uygulanırdı).

**KAPSAM — ölçüldü:**

    iptalsiz kalem 5891 · oranı BOŞ 5333 (%90,5)
      TRENDYOL     3383 / 3910   (%86,5)
      HEPSIBURADA  1939 / 1964   (%98,7)
      AMAZON         11 /   11  (%100)
      N11             0 /    6    (%0)

    KAYNAK BAZINDA — ayrım keskin:
      satis-excel      5333 / 5333   (%100 boş)   ⭐
      elle girilmiş       0 /  147
      enumerasyon         0 /  411

**⭐ YÖN TERSİNE ÇIKTI — İLK HİPOTEZİM YANLIŞTI VE SİLİNMİYOR.**
"Oranı olmayan satışın `net2Amount`i null kalır, marj DÜŞÜK çıkar" dedim.
Ölçüm çürüttü: `net2Amount` **RULE_MISSING satışlarda da yazılıyor** —
yalnızca komisyon düşülmeden.

    profitStatus     satış   ciro            Σ net2          marj
    RULE_MISSING      2757    8.708.782,38    1.856.720,88   %21,32   ⭐
    CALCULATED         489    1.688.824,45      187.731,37   %11,12
    (boş)             2525    6.590.842,44             0,00       —

Yani ekrandaki marj **olduğundan YÜKSEK**, düşük değil. Komisyonu düşülmüş
kümenin marjı %11,12; düşülmemiş kümenin marjı %21,32.
⚠ **%11,12 "GERÇEK MARJ" DEĞİLDİR — BAYAT OKUMA RİSKİ.** Yalnız 489
satışlık, temsili olmayabilecek bir kümenin marjı; o küme `elle` ve
`enumerasyon` kaynaklı satışlardan oluşuyor ve `satis-excel` kümesini
temsil etmesi için hiçbir sebep yok. Kanıtladığı tek şey **yönün ters**
olduğu. Bu satır bir rapora alıntılanacaksa yanında bu şerh de gider.

**MARJ ŞERHİ BUNU HİÇ GÖRMÜYOR** — çünkü şerh MALİYET BAĞINI ölçüyor:

    ✓ ikisi de tam (maliyet + oran)            489 kalem
    ⚠ yalnız maliyet bağı eksik (oran var)      69 kalem   ← şerhin gördüğü
    ⭐ yalnız komisyon oranı eksik (maliyet var) 2829 kalem  ← şerh KÖR
    ⛔ ikisi de eksik                          2504 kalem

**② KURU KOŞUM SONUCU — dosyanın kendi kolonundan:**

    DOLDURULABİLİR 5330 / 5333  (%99,9)
      TRENDYOL 3381 · HEPSIBURADA 1938 · AMAZON 11
      belirsiz 2 · dosyada yok 1
    ciro 15.133.100,55  →  düşülecek komisyon (KDV hariç) 1.811.492,36

**KAYNAK SEÇİMİ — ikisi ölçümle ELENDİ:**
- **Tarife defteri:** yüklü 3 pencere var, oranı boş **5333 kalemin 0 tanesi**
  bir pencereye düşüyor. Ve zaten yasaktı — `dilimBul` kendi belgesinde
  _"kayda YAZILMAZ, kayıt kanalın kendi beyanından gelir (mimar kararı
  18.08.2026)"_ diyor. Tarife "ne olurdu"yu yanıtlar, "ne oldu"yu değil.
- **Hakediş:** 1284 kalem var, satışa bağlı olan **13**. Kaynak önceliğinde
  1. basamak ama kapsamı ~%1.
- **Satış dosyasının kolonu:** 2. basamak (kendi defterimiz), kapsam %99,9.

**⚠ KOLONUN NE ANLATTIĞI ÖLÇÜLDÜ — VE İLK OKUMAM YANLIŞTI:**
`(TUTAR/FİYAT) ÷ ORAN` dağılımı 3705 satırda `×1,20` çıkıyordu ve bunları
"tutmayan" diye saymıştım. Sapma değil — **Hepsiburada'nın komisyona
eklediği %20 KDV.** Anayasada yazılıydı; ölçütüm hesaba katmıyordu.

    5734 satır  ×1,00   (KDV'siz)
    3705 satır  ×1,20   (komisyona +%20 KDV)
      40 satır  başka   (kuyruk, ayrı sayılır)

⛔ Bu yüzden yazılacak değer `KOMİSYON ORANI` (**KDV HARİÇ**) olmalı,
`TUTAR/FİYAT` değil: motorda `HEPSIBURADA · KOMISYON_KDV · %20` kuralı
yüklü ve KDV'yi kendisi ekliyor. KDV dahil oran yazılsaydı **iki kez**
uygulanırdı.

**⚠ MARJ ŞERHİ ÜÇÜNCÜ SEBEBİ DE SAYMALI — AYRI KALEM (K67).** Şerh bugün
iki sebep ayrıştırıyor (`alimYok` · `bekleyen` · `donemDisi`), üçü de
MALİYET tarafında. **Komisyon oranı eksikliği hiç sayılmıyor** ve 2829
kalemi kör bırakıyor: o kalemlerin maliyeti VAR, şerh onları "kapsanan"
sayıyor, ama NET'leri komisyonsuz. Şerhin `kapsanmayanPay` ölçütü
maliyeti ölçüyor; NET'in DOĞRU hesaplandığını ölçmüyor.
⛔ ③ koştuktan sonra bu kova küçülecek ama SIFIRLANMAYACAK (Amazon 11 +
belirsiz 2 + dosyada yok 1 kalır) — o yüzden şerh yine de saymalı.

**⚠ AMAZON'UN %1'İ ŞÜPHELİ — YAZILMADAN ÖNCE DOĞRULANMALI.** 11 kalemin
hepsi tam `%1,00`. Amazon TR komisyonu tipik olarak %8–15. Bu bir yer
tutucu olabilir. _(Anayasa: "imkânsız görünen değer önce doğrulanır.")_

**⛔ ③ YAZMA TEK BAŞINA YETMEZ:** oran yazıldıktan sonra her satışın kârı
`karYenidenYaz` ile tazelenmeli, yoksa `net2Amount` komisyonsuz hâliyle
kalır ve ekran hiç değişmez.

**④ AÇIK KAPANMAZSA YENİDEN DOĞAR:** içe aktarma oranı yazmadığı sürece
her yeni koşum yine boş kalem üretir. Bugünkü 23 satış da öyle girdi.

---

## 🆕 K65 — ELDEN SATIŞ (DEPO) KANALI · 28.08.2026

> Kullanıcı düzeltmesi: `DEPO` bir depo hareketi DEĞİL, **elden yapılan
> satışların yazıldığı yer.** İçe aktarmadaki eski gerekçe çürüdü ve
> `canli-satis-ice-aktar.ts` içinde NIYE çevrildiğiyle birlikte duruyor.

| # | İş | Durum |
|---|---|---|
| ① | `DEPO` kanalı + `Elden Satış` hesabı + `KANAL_ESLEMESI` satırı | **[KOŞTU 28.08.2026]** — `AuditLog: KANAL_ACILDI`. Şema değişikliği YOK. |
| ② | 10 elden satışın içe aktarılması | **[BEKLİYOR]** — artık YALNIZ barkod/`Sale.code` sorunu |
| ③ | `Channel.type` vekil kaydı | **[KAYIT]** — kapanamaz, açılış şartı aşağıda |

**② NİYE BEKLİYOR — İKİ SEBEP, İKİSİ DE ÖLÇÜLDÜ:**
1. `Sipariş Numarası` kolonu DEPO satırlarında **BARKOD** taşıyor
   (`8720389039577`, `5702017747682`…). Olduğu gibi yazılsaydı barkod
   `Sale.code`a girerdi — hem yanlış hem `@unique` çakışması. Elden satışın
   sipariş numarası **yoktur**; doğru değer `null`.
2. ~~KDV ve stopaj elden satışta işliyor mu?~~ **CEVAPLANDI 28.08.2026** —
   kullanıcı: _"Elden satışta kargo ve pazaryeri yok, gerisi aynı."_
   Ve ölçüldü: **hiçbir `ChannelFee` gerekmiyor.**
   · KDV ürünün KENDİ kategorisinden geliyor (`kalem.kdvOrani`)
   · Stopaj motorun genel kuralı (`kar.ts:37`, `STOPAJ_ORANI = 1`)
   · Komisyon ve kargo YOK → kalem `commissionRate = 0` ile yazılır
   ⚠ `null` DEĞİL `0`: `null` "bilinmiyor" der ve `RULE_MISSING` üretir;
   `0` "komisyon yok" der ve NET hesaplanır (`kar.ts:198`).

Kapı mekanik: `ADIM2_BEKLEYEN` kümesi. Kuru koşumda **`adim2Bekliyor: 10`**
saydı — satırlar görünüyor ama yazılmıyor. Cevap gelince kümeden `DEPO`
çıkarılır.

**③ `type = OWN_STORE` VEKİLDİR — kapanamaz kayıt, görev DEĞİL.**
Elden satış "kendi siteniz" değildir; örtüşen şey DAVRANIŞ (üçüncü taraf
komisyonu yok), ad değil. Bugün zararsız çünkü **ölçüldü: `Channel.type`
kodun hiçbir yerinde OKUNMUYOR** — seed yazıyor, hiçbir ekran/karar branch
etmiyor. Şema değişikliği bu yüzden **hak edilmedi**.
> ⛔ **AÇILIŞ ŞARTI:** bir rapor/ekran ilk kez `Channel.type`a göre
> dallandığında gerçek enum değeri (`DIRECT`) eklenir — o gün migration hak
> edilmiş olur. Şartsız bekleyen alan, unutulmuş alandır.

**AYRI KOVALAR — 10'luk kümeye KARIŞTIRILMAZ:**
- `4440897248` — 10 hane "4" ile başlıyor: **HB iadesi**, DEPO değil ve
  **sistemde zaten var.** Kuru koşumda `TÜR=iade` olduğu için `turFarkli`
  kovasına düştü; DEPO kovasına hiç girmiyor. Bu turda **işlenmez.**
- `2024-07-07` — "Elden ( ahmet pekel )", komisyon 637 · kargo 120, kimliği
  çözülmüyor. Öteki 11'den farklı; `numarasiz` kovasında ayrı duruyor.

---

## 🆕 K64 — AMAZON SATIŞLARI · 28.08.2026

> Kullanıcı haklı çıktı: Amazon satışları **zaten `satis.xlsx` içinde** —
> 64/64 orada. Sisteme girmemeleri sessiz bir düşme değil, içe aktarmanın
> **bilinçli bekletmesiydi** (`KANAL_ESLEMESI` yalnız TY/HB/N11 taşıyordu).

| # | İş | Durum |
|---|---|---|
| ① | Amazon **SATIŞ** hesabı (`AMZN`) | **[KOŞTU 28.08.2026]** — `AuditLog: KANAL_HESABI_ACILDI` |
| ② | 23 satışın içe aktarılması (AMZN 11 + TY 12) | **[KOŞTU 28.08.2026]** — parti `satis-20260827234322` |
| ③ | 54 ASIN → varyant eşleştirmesi | **[BEKLİYOR]** — ②'den sonra |
| ④ | Amazon `ChannelFee` kuralları | **[BEKLİYOR]** — Amazon'un kendi hakediş raporu |
| ⑤ | `AMZN` hesabını PASİFE al | **[BEKLİYOR]** — ② bittikten sonra, Ayarlar → Kanallar |

**② KOŞTU — önce/sonra sayımı tuttu, ikinci koşum 0:**

    Sale           5780 → 5803   (fark 23, beklenen 23) ✓
    SaleItem       5900 → 5923   (fark 23, beklenen 23) ✓
    SALE_OUT       3323 → 3326   (fark  3, beklenen  3) ✓
    ikinci koşum:  plan 0 satış ✓

⚠ **23 KALEMİN YALNIZ 3'ÜNE STOK HAREKETİ YAZILDI — 20'sinde FIFO PARTİSİ
YOKTU.** Bu bir kusur değil, kural: parti yoksa hareket yazılmaz, negatif
stok üretilmez. Ama sonucu şu: o 20 ürünün stoğu DÜŞMEDİ ve maliyetleri
bağlanmadı — K55'in (alım defteri açığı) aynı kuyruğu.
Geri alma: `npm run canli:satis-aktar -- --geri=satis-20260827234322 --yaz`

**MAĞAZA KAPALI (kullanıcı, 28.08.2026) — hesap yine de açıldı.** Kapanmış bir
mağazanın geçmiş satışları da defterin parçasıdır; bağlanacak hesap olmasa
64 satış (₺255.555) hiçbir yere yazılamaz ve ciro eksik kalır. Kapanmışlık
`isActive` ile ifade edilir, hesabın YOKLUĞUYLA değil.
> ⚠ `isActive = true` açıldı ve sebebi yazılı: `false` olsaydı hesap satış
> listesinin SÜZGEÇ menüsünde de görünmezdi (`satislar/page.tsx:166`) ve
> kullanıcı kendi Amazon satışlarını süzemezdi. ② bitince ⑤ ile kapatılır.

**⚠ SORUM YANLIŞTI VE ÖLÇÜMLE DÜZELTİLDİ.** "Hangi hesap — S.ahmet, SEDA,
EKREM?" diye sordum; varsayımım satış hesabının bu üçünün içinde olduğuydu.
Ölçüm bunu çürüttü — **üçü de ALIŞ hesabı:**

    YAN1  EKREM     alisIcin=EVET  satisIcin=hayir   19 alım ·  0 satış
    ANA   S.ahmet   alisIcin=EVET  satisIcin=hayir   44 alım ·  0 satış
    YAN   SEDA      alisIcin=EVET  satisIcin=hayir   25 alım ·  0 satış

Yani Amazon **satış mağazası sistemde HİÇ TANIMLI DEĞİL.** Doğru soru:
_"Amazon'da sattığınız mağaza hesabının adı ne?"_ (TY/HB'de bu `AXCALI`.)

**ÖLÇÜLEN KAPSAM:** dosyada 65 Amazon satış satırı var; **54'ü SKU
kolonunda ASIN** (`B0…`) taşıyor ve hiçbir varyanta bağlı değil.
Kimliği bugün çözülen **11 satır · ₺45.221**.

**② KURU KOŞUM — içe aktarmanın KENDİ gövdesinden:**

    ② PLAN
       satış   23        KANAL BAŞINA:
       kalem   23          TY     12 satış     15856.00
       tutar   61077.00    AMZN   11 satış     45221.00

⚠ **AYRI SONDA YAZILDI VE `76` SAYDI — YANLIŞTI.** Sonda tarih kapısını,
belirsiz SKU elemesini ve kanal çelişkisi süzgecini taşımıyordu. Döküm
artık `yazilacaklar` dizisinden üretiliyor ve bunu bir bekçi ölçütü
sabitliyor (iki mutasyonla kırmızı yandığı görüldü).
_(Anayasa: "sonda parametresi ekranın parametresi değildir".)_

---

## 📌 AÇIK KALAN ÖLÇÜM ŞERHLERİ — 28.08.2026

| Kalem | Durum |
|---|---|
| **`axcali1752`** (Bialetti Moka Pot) | **[AÇIK]** — sistem dosyadan FAZLA gösteriyor; öteki yönün sorusu, ayrı ölçülecek |
| **A kalemi (HBCV) kapsamı** | **[KAPANMADI]** — "Listelerim" dökümü yalnız **AKTİF** listingleri veriyor; eşleşmeyen 385 kod KAPALI listinglerdir. Halil'in indirdiği dosya yanlış değil, **KAPSAMI dar.** Çare: kapalı listing dökümü ya da HB API |
| **C bölümü ölçüm kusuru** | **[KAYIT]** — "eşleşmeyen satırlar bu varyantların kodlarını taşıyor mu" sorusunun cevabı **tanım gereği sıfırdı**; döngüsel bir soruydu ve bulgu diye sunulmadı |

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

### 🔬 A3-② MUTABAKAT — [KOŞTU 26.08.2026] · SALT OKUMA

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

### ✅ K55 — ALIM DEFTERİ AÇIĞI · **BÜYÜK ÖLÇÜDE KAPANDI** (26.08.2026)

**1569 alım · 1609 kalem · 1608 `PURCHASE_IN` yazıldı.** Stok bağı **260
kalem** kurdu.

| | önce | sonra |
|---|---|---|
| **ekran marjı** | %2,58 | **%10,12** |
| maliyet bağı olanların | %9,31 | **%11,12** ⚠ |
| şerhteki satış | 329 | **69** |

⚠ **`%11,12` O GÜNÜN KAPSAMIYDI ve AŞILDI** — geçerli olan **%19,67**
(27.08 kâr tazeleme, 3244 satış üstünden).

✅ **`[YANLIŞ CEVAP VEREN EKRAN]` ETİKETİ MARJ İÇİN KALKTI** — ekran artık
gerçeği gösteriyor. İki rakam birbirine yaklaştı; kalan **69 adıyla şerhli**.

**KALAN 69:** 29 bağ bekliyor (alım VAR) + 40 **alım kaydı yok**.
Kaynağı: **130 eşleşmeyen barkod** + **79 barkodsuz satır**.

⚠ **8 ALIM: teslim tarihi okunamadı** (`"11.02.0202"` — 2026 yerine 0202
yazılmış). Satın alma tarihine düşüldü, **ekranda sayılı, UYDURULMADI.**

<details><summary>açık ölçümü (26.08, arşiv)</summary>

### 🆕 K55 — ALIM DEFTERİ AÇIĞI (AÇILIŞ ÖLÇÜMÜ)

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
| maliyet bağı olanların | %9,31 | **%11,12** ⚠ |
| şerhteki satış | 329 | **69** |

⚠ **`%11,12` O GÜNÜN KAPSAMIYDI ve AŞILDI** — geçerli olan **%19,67**
(27.08 kâr tazeleme, 3244 satış üstünden).

⚠ Şerh artık **iki satır**: `29` bağ bekliyor (alım var) · `40` **ALIM KAYDI
YOK**. İçe aktarma satışlarının **342/411**'inin kârı hesaplanmış.

**DEFTER AYRIŞMASI:** incelenen 707 · temiz 705 · **SAPAN 2** ·
incelenemeyen 0. K54'ün iki hayaleti yerinde, **yeni sapan DOĞMADI**.
Ayrı kova 329 → **69**.

⏭ **K55 KÜÇÜLDÜ AMA KAPANMADI:** 69 kalem hâlâ alım kaydı bekliyor —
130 eşleşmeyen barkod + 79 barkodsuz satır oradan besleniyor.

_(Çözüm bulundu: alış Excel'i içe aktarıldı — yukarıdaki özete bak.)_

</details>

### ⚠ ENVANTER — İKİNCİ ŞERH KOŞUYOR (26.08.2026)

Halil bildirdi: alışlar girince stok **₺8,5M / 3595 adet** göründü.
Sebep ölçülüydü ama **ekranda yazılı değildi.**

    alım defteri   1955 kayıt · en eski 2024-05-30
    satış defteri   556 kayıt · en eski 2026-06-17
    → satış defteri 748 GÜN SIĞ
    → kapsanmayan pencerede HÂLÂ AÇIK: 3115 adet

Envanter değeri **ve** stok ekranlarında ikinci şerh — **mevcut 69'luk
şerhin YANINA, yerine değil.** İki ayrı sebep, iki ayrı çözüm:
· `MarjSerhi` → satış defterde **VAR**, maliyet bağı yok
· yeni şerh → satış defterde **HİÇ YOK**

⚠ **ÖLÇÜT GÜN FARKINA BAĞLI DEĞİL — ve bu kasıtlı.** Gün farkına
bağlansaydı satış aktarımından sonra da (~18 gün) fark kalır ve şerh
**sönmezdi**. Ölçüt farkın ÜRETTİĞİ çarpıklık: kapsanmayan pencerede
**hâlâ açık** parti adedi. Sıfırlanınca şerh kendiliğinden söner.

### ⏭ K56 — SATIŞ EXCEL'İ (sıradaki)

**ÖLÇÜLDÜ 26.08.2026 — salt okuma, yazma yok.**
`satis.xlsx` · md5 `0674f15faf27ed5c661f55fc75a278a3` **birebir tuttu** ·
sayfa `SATIŞ` · **10205 satır** (beyan 10197 → 8 fark).

**⓪ BEYAN — tür ve kanal BİREBİR tuttu:**
satış **9743** · iade 387 · tazmin 27 · iptal 24 · TATİL 8 · aktarma 7 ·
Zarar 1 · **(boş) 8** ← beyanda yoktu, 8 farkın kaynağı bu.
TY 6186 · HB 3917 · AMZN 68 · DEPO 12 · N11 6 · **(boş) 16**.

⚠ **TARİH ARALIĞI BEYANDAN GENİŞ:** beyan `2024-06→2026-08`, ölçülen
**`2024-01-14 → 2029-03-30`**. Gelecek tarihli **3** satır teyit edildi
(`2027-10-11` · `2029-03-30` · `2026-09-28`) · **11 satırın tarihi
okunamıyor**.

> ### ⭐ ÇAKIŞMA — ASIL CEVAP
>
> | | |
> |---|---|
> | dosyadaki tekil sipariş no | **9163** |
> | **defterde de VAR** | **544** |
> | defterde YOK | **8619** |
> | eşleşen dosya satırı | 565 / 10205 |
>
> **Çift kayıt riski dar: dosyanın %94'ü defterde YOK.**
> Eşleşen 544'ün **410'u içe aktarma**, 134'ü elle girilen.

✅ **KANAL DOĞRULAMASI 564/565 TUTTU** — numara eşleşmesi tesadüf değil.
⚠ Tek istisna `4702310503`: dosya **TY** diyor, defter **Hepsiburada**.
_(HB numaraları 10 hane "4" ile başlar — dosyadaki kanal etiketi şüpheli.)_

⛔ **YAZILAMAZ OLANLAR — ürün eşleşmesi zayıf:**
SKU ile eşleşen **6210** · barkodla **0** · belirsiz 41 ·
**hiçbiri 3954** (737 tekil SKU). Eşleşmeyenlerin çoğu **Hepsiburada
listing kodu** (`HBCV…` / `HBV…`) — bunlar `ChannelSku` alanına ait,
`sku` alanına değil.

**YENİLERİN YILI:** 2024 → 1335 · 2025 → **4921** · 2026 → 2954.
⛔ **419 satırın sipariş numarası HİÇ YOK.**

### 🔬 K56-② — 737 EŞLEŞMEYEN SKU TEŞHİSİ (26.08.2026, salt okuma)

⛔ **ÖNCE BİR RAKAMIMI DÜZELTİYORUM: ₺181.160 → ₺9.084.024 (50 KAT).**
`Satış Fiyat` kolonunu okumuştum; başlık doğru görünüyordu ama **yalnız 85
satırda dolu** (hepsi 2024). Doluluk ölçülünce gerçek kolon göründü:

    Alış fiyatı        63      Satış Fiyat        85
    ÜRÜN ALIŞ FİYATI 10153    ÜRÜN LİSTE FİYATI 10162   ← gerçek
    Satış tutarı      7874    Toplam kar        10186

_"%100'ü ilk 10 SKU'da" gibi imkânsız bir yoğunlaşma çıkmasa fark
edilmezdi._ **₺181.160 aşıldı, geçerli olan ₺9.084.024.**

**② KOD BİÇİMİ — ve en büyük grup ÇÖP:**

| Biçim | Kod | Satır | Örnek |
|---|---|---|---|
| `HBCV…` HB listing | 385 | 1171 | `HBCV00003GJJF7` |
| sadece rakam (barkod) | 127 | 408 | `194735192069` |
| `HBV…` eski listing | 120 | 388 | `HBV00000XYB03` |
| başka desen | 96 | 296 | `HRBSCPFS2000` |
| ⛔ **RAKAM YOK (çöp)** | **8** | **1671** | `trendyol` · `hepsiburada` |
| `axcali…` bizim SKU | 1 | 3 | `AXCALI180734` |

⛔ **8 ÇÖP KOD 1671 SATIR TAŞIYOR** — SKU sütununa kod yerine **pazaryeri
adı** yazılmış. `trendyol` tek başına **1473 satır · ₺3.128.321 = açığın
%34'ü.**

**③ HACİM:** 737 SKU · **₺9.084.024**. İlk 10 → %43,4 · ilk 30 → %51,6 ·
ilk 120 → %69,4. **Dağınık değil, ama tepe de tek koda bağlı.**

**① AD EŞLEŞTİRMESİ — İŞE YARAMIYOR.** Yöntem: Levenshtein, eşik
`max(2, uzunluk/4)` (`benzerleriBul`, ortak gövde). En büyük 120 SKU'dan
**yalnız 13'ü** aday buldu. Sebep ölçüldü: dosyadaki adlar **pazaryeri
listing başlığı**, bizimkiler ürün adı.
⛔ **VE ADAYLARIN BİR KISMI YANLIŞ ÜRÜNE İŞARET EDİYOR:**
`Karcher SC 3` → `Karcher SC 4` · `JBL Charge6 Mor` → `JBL Charge6 Mavi` ·
`Homend Artfood Siyah` → `Homend Artfood Krem`. **Ad eşleşmesi bu veride
kullanılamaz.**

**④ ALIŞ ÇAPRAZI:** en büyük 120'den **13'ü** alış dosyasında karşılık
buldu — köprü yine ADLA kuruldu, yani aynı zayıflık.

> ### ⑤ DÖNEM — EN GÜÇLÜ BULGU
>
> | Yıl | Eşleşmeyen | Tutar | Eşleşen | **Eşleşmeme** |
> |---|---|---|---|---|
> | 2024 | 1382 | 2.884.910 | 364 | **%79,2** |
> | 2025 | 2429 | 5.614.917 | 2492 | **%49,4** |
> | **2026** | **133** | 576.981 | **3392** | **%3,8** |
>
> **Sorun ESKİ dönemde.** 2026 zaten %96 eşleşiyor; eşleşmeme geriye
> gidildikçe artıyor. Son aylarda 8–45 satır.

### 🚦 K56 KURU KOŞUM — **ONAY BEKLİYOR** (26.08.2026)

`npm run canli:satis-kuru -- --dosya="…"` · **salt okuma, tek satır yazılmadı.**
`satis.xlsx` · md5 `0674f15faf27ed5c661f55fc75a278a3` · **10205 satır**.

**② YAZILACAK:** **5219 satış** (sipariş no başına) · **5339 kalem** ·
5339 adet · **₺15.178.095** · kaynak `satis-excel`.
Yıla göre: 2024 → 290 · 2025 → 2359 · **2026 → 2690**.

**③ DIŞARIDA — sekiz kova, toplam satır sayısıyla TUTUYOR (4866+5339=10205):**

| Kova | Adet | Sebep |
|---|---|---|
| `eslesmeyenListing` | **1932** | HBCV/HBV/başka desen — ürün sistemde YOK |
| `copSku` | **1491** | SKU yerine pazaryeri adı — ürün bilgisi dosyada YOK |
| `zatenVar` | **553** | çakışmada ATLA, ezme yok |
| `turFarkli` | **462** | satış DEĞİL |
| `numarasiz` | 381 | sipariş numarası hiç yok |
| `belirsizSku` | 36 | kod >1 varyanta işaret ediyor |
| `tarihOkunamayan` | 8 | |
| `gelecekTarihli` | **3** | tarih GELECEKTE |

⚠ **`gelecekTarihli` KOVASI SONRADAN AÇILDI — ve 1 satır yazılabilir listeye
SIZMIŞTI.** Makul yıl kapısı (2000–2100) `2029-03-30`u geçiriyor: yıl geçerli
ama gün gelmedi. Kova ayrılmasaydı yazıma kadar görünmezdi.

**TÜR KIRILIMI — sistemde karşılığı ne (hiçbiri bu turda yazılmıyor):**
iade 387 → `Return`/`ReturnItem` · tazmin 27 → `Compensation` ·
iptal 24 → `Sale.iptalTarihi` · **TATİL 8 → ⛔ karşılığı YOK** ·
(boş) 8 → ⛔ tür belirsiz · **aktarma 7 → ⛔ karşılığı YOK** ·
Zarar 1 → `ADJUSTMENT`/hurda, ayrı karar.

⚠ **KANAL ETİKETİ ↔ NUMARA BİÇİMİ ÇELİŞKİSİ: 8 satır.** `4637289070` HB
deseni taşıyor ama etiket `TY`; `10711449394` tersi. Bu satırların defterde
karşılığı YOK — _"defter kazanır"_ kuralı **uygulanamaz**, karar gerekiyor.

**④ STOK:** 885 varyanttan **542'sinde açık parti var**.
✓ `SALE_OUT` yazılır **2629 kalem** · ⛔ parti yok, atlanır **2710 kalem**.
_(Satış tarafındaki kural: parti yoksa hareket yazılmaz, negatif stok yok.)_

**⑤ ENVANTER ETKİSİ:** kapsanmayan pencerede açık **3115** → bu aktarım
**2629 adet** eritir → kalan **~486**.
⚠ **KABA TAHMİN VE NİYE KABA OLDUĞU YAZILI:** şerhin ölçütü "satış
defterinin en eski tarihinden önce alınmış açık parti"; bu aktarım satış
defterini 2024'e indirdiği için **pencerenin kendisi de daralacak** —
gerçek düşüş bundan büyük olabilir.

**⑥ İDEMPOTENTLİK:** ikinci koşum **0** ✓ (anahtar `Sale.code`, global unique).

### ✅ K56 SATIŞ İÇE AKTARMA — KOŞTU (26–27.08.2026)

Parti `satis-20260826215218` · **hata 0** · `AuditLog: SATIS_ICE_AKTARMA`.

| | önce | sonra | fark |
|---|---|---|---|
| `Sale` | 588 | **5778** | +5190 ✓ |
| `SaleItem` | 588 | **5898** | +5310 ✓ |
| `StockMovement` | 2505 | **5331** | +2826 ✓ |
| `SALE_OUT` | 495 | **3321** | +2826 ✓ |

**Dört sayım da tuttu.** İkinci koşum **0 yazdı** (`zatenVar` 5865) ✓

⚠ **İki kova ölçümle doğdu ve YAZILMADI:** `kanalCozulemedi` **21**
(dosya kanalı söylüyor, hesabı değil — Amazon'da üç hesap, üçü sıfır
satışlı) · `kanalCeliskisi` **8** (etiket TY, numara HB deseni — yanlış
kanal kesinti kurallarını değiştirir, NET sessizce yanlış çıkardı).

> ### ⭐ ENVANTER — DERİNLİK ŞERHİ SÖNDÜ
>
>     satış defteri en eski   2026-06-17  →  2024-01-14
>     alım defteri en eski                   2024-05-30
>     kapsanmayan pencerede AÇIK   3115  →  0
>
> Satış defteri artık alım defterinden **derin**; şerhin ölçütü
> sağlanmıyor ve şerh **kendiliğinden söndü** — sabit sayıya
> bağlanmadığı için.
>
> **Envanter: 3595 → 770 adet · ₺2.193.421** (ödenen, KDV dahil).

⛔ **AMA MARJ EKRANI YİNE ÇÖKTÜ: %10,12 → %1,11.** 5190 yeni satış ciroya
girdi, yalnız 2826'sı stok hareketi aldı — gerisinin kârı hesaplanamadı.
Maliyet bağı olanların marjı **%11,12** (o anki kapsam).
Marj şerhi **yanıyor ve doğru sebebi söylüyor**: bağ bekleyen **3810** ·
alım kaydı yok **1452**.

⚠ **BU SATIRDAKİ ÜÇ RAKAM DA AŞILDI** (27.08 kâr tazeleme sonrası):
`%1,11 → %12,08` · `%11,12 → %19,67` · bağ bekleyen `3810 → 691`.

**STOK BAĞI YENİDEN KOŞTU → 0 kalem bağlandı.** Sebep: içe aktarma
FIFO'yu **koşum içinde zaten tüketti** (2826 hareket). Geriye açık parti
kalmadı; 2553 kalem karşılıksız.

**DEFTER AYRIŞMASI:** incelenen 707 · temiz 705 · **SAPAN 2** ·
incelenemeyen 0. **Yeni sapan DOĞMADI**; K54'ün iki hayaleti yerinde.
Ayrı kova (stok bağı kurulmamış) **2502**.

### ⚠ MARJ EKRANI — SEBEP ÜÇE AYRILDI, RAKAM SUSTURULDU (27.08.2026)

**⛔ `[YANLIŞ CEVAP VEREN EKRAN]` etiketi marj için GERİ GELDİ** ve iki iş
yapıldı.

**① ŞERH ÜÇ SATIR:**

| Sebep | Sayı | Ne demek |
|---|---|---|
| (a) bağ bekliyor | **3809** ⚠→691 | alım VAR, henüz bağlanmadı |
| (b) alım kaydı YOK | **1452** ⚠→1441 | o varyantın alımı hiç girilmemiş |
| **(c) DÖNEMİ KAPSAMIYOR** | **1** | satış, alım defteri başlamadan önce |

⚠ **(c) BEKLENENDEN ÇOK KÜÇÜK ÇIKTI — 1 satış.** Yazılan 5778 satışın
yalnız biri `2024-05-30`dan önce. Kova gerekliydi ve doğru çalışıyor, ama
bugünkü açığı açıklayan sebep değil; **açığın %72'si (a)**.
⛔ (c) **kapatılabilir bir açık DEĞİL, tutanaktır** — ekran bunu yazıyor ki
kimse kapatmaya çalışmasın. Ölçüt `min(Purchase.purchasedAt)`, sabit tarih
değil: alım defteri geriye büyürse sayı kendiliğinden düşer.

**② MARJ RAKAMI ARTIK BASILMIYOR.**

    kapsanmayan pay  %90,06   ·   eşik %0,50        ⚠ AŞILDI → %38,59
    ekran            "hesaplanamıyor (5259/5746 satışın maliyeti yok)"
    şerhte           maliyet bağı olanların marjı %11,12  ⚠ AŞILDI → %19,67

⚠ **EŞİK VERİDEN DEĞİL, GÖSTERİM HASSASİYETİNDEN TÜRETİLDİ — ve niye:**
aylık kapsanmayan pay dağılımı ölçüldü (n=27): `22,6 · 30,8 · 87,0 ·
100,0 × 24`, en büyük gedik 56,2 puan (ortası %58,9). **Ama o gedik
_"hangi aylar kapsanıyor"_ sorusunu cevaplıyor**, bizimki _"rakam ne zaman
yanıltır"_. Marj tek ondalıkla yazılıyor; ~%11'lik bir marjda tek ondalık
= göreli **%0,45**. Kapsanmayan pay bunun üstündeyse ekrandaki basamak
zaten yanlış.
⚠ **Komuttaki `%X` gelmedi (mesaj kesilmişti)** — eşik bu yüzden
türetildi. Başka bir değer isteniyorsa tek satır.

⛔ **ÖLÇÜLEN ÇARPIKLIK:** ekran **%1,11**, gerçek **%11,12** — **on kat**.
⚠ _(İkisi de o günün kapsamı; 27.08'de aşıldı → %12,08 ve %19,67.)_
Bir rakamı on kat yanlış basmak, hiç basmamaktan kötüdür.

**BEKÇİ 207 kontrol** · 9 mutasyon kırmızı. Ve **beş ölçüt eskidiği için
kırmızı yandı** (kod doğruydu): gövde üçüncü sebeple büyüyünce blok
penceresi yetmedi, "iki sebep" kontrolleri üçe çıkarıldı.

### 🔬 (a) KOVASI TEŞHİSİ — HİPOTEZ ÇÜRÜDÜ, SEBEP BAŞKA (27.08.2026)

⛔ **ASIL BULGU BENİM KUSURUM: satış aktarımı KÂR MOTORUNU ÇAĞIRMIYORDU.**

    kârı hesaplanmamış içe aktarma satışı      5259
      ⭐ stok hareketi VAR, kârı yok            2757   ← HESAP eksiği
         stok hareketi YOK                     2502   ← VERİ eksiği

Alım tarafındaki `canli:stok-bagi` kârı **zaten tazeliyordu**; satış
aktarımı tazelemiyordu — **iki yol sessizce ayrışmıştı.** Ekran 2757'yi
"bağ bekliyor" diye sayıyordu: sayı doğru, **anlamı yanlıştı.**
✅ `--kar-tazele` eklendi ve koşuyor.

✅ **BEKÇİ ARTIK BU AYRIŞMAYI YAKALIYOR:** _"`SALE_OUT` yazan her betik kâr
tazeleme yolunu taşır"_ — dosya listesi değil DAVRANIŞ ölçütü, yarın
üçüncü yol eklenirse de tutar. 27.08 kusurunun kendisi mutasyonla kırmızı
yandı.

**① DÖNEM — hipotez ÇÜRÜDÜ.** Beklenen "2024 + 2025 ilk yarı ağırlıklı"
değil, **tam tersi**: 2024→57 · 2025→432 · **2026→578**. Yoğunlaşma
**2025-10'dan SONRA** — yani alım defterinin başladığı dönemde.

**② VARYANT BAZINDA:** 201 varyant · adet yetmiyor **63** · tarih sonra
**0** · **ikisi de 137**. Sorduğun ayrımın cevabı: _"tarih sonra" tek
başına HİÇ YOK._

**③ `min(purchasedAt)` YANILTICIYDI — seyrek kuyruk:**

    2024-05    1 alım ·   1 adet    ← tek kayıt, sınırı buraya çekiyordu
    2025-08    2 alım ·   5 adet
    2025-10   55 alım · 162 adet    ← defterin GERÇEK başlangıcı

### ✅ (c) ÖLÇÜTÜ VARYANT BAZLI OLDU — EŞİKSİZ

`min(purchasedAt)` **bırakıldı**; "yoğun ay" eşiği de **kullanılmadı**
(dağılımdan türetilmemiş sayı uydurmadır).

    satış < o VARYANTIN ilk alımı   → (c) KAPSAM DIŞI, kapatılamaz
    satış ≥ ilk alım, parti yok     → (a) ADET AÇIĞI, kapatılabilir
    varyantın hiç alımı yok         → (b) ALIM KAYDI YOK

| Kova | YENİ | ESKİ | fark |
|---|---|---|---|
| (a) adet açığı | **2669** | 3051 | −382 |
| (b) alım kaydı yok | 1443 | 1443 | 0 |
| **(c) KAPSAM DIŞI** | **382** | **0** | **+382** |

⭐ Eski ölçüt **382 kapatılamaz satışı kapatılabilir sanıyordu.**
`axcali2534` artık doğru: ilk satış 2024-11, ilk alım 2026-02 → kapsam dışı.

### 📗 (a) KAPANABİLİRLİK — **kalıcı DEĞİL**

525 varyant · **ilk satış ayına göre neredeyse tamamı 2025-12 ve sonrası**
(2025-12: 89 varyant · 2026-01: 92 · 2026-02: 81). 2025-11 öncesi yalnız
**3 varyant**.

> ⭐ **Eksik alımlar alış dosyasının KAPSADIĞI dönemde** (2025-10+). Yani
> belge bulunabilir — **kalıcı bir açık değil.**

⚠ **ÖLÇÜLMEYEN:** kaç varyantta *toplam alım < toplam satış* olduğu ayrıca
ölçülmedi; "belge bulunabilir" bir DÖNEM tespiti, adet tespiti değil.

### 📐 (a) KOVASI — ADET TESPİTİ (27.08.2026, salt okuma)

**(a) kovası: 446 varyant · 1892 kalem.** Üçe ayrıldı:

| Kova | Varyant | Kalem | Tutar |
|---|---|---|---|
| alım < satış → **BELGE EKSİK** | **188** | 913 | 2.608.868 |
| alım ≥ satış → ⭐ **ADET YETERLİ** | **258** | 979 | **3.605.118** |
| alım = 0 | — | — | (b) kovası |

⭐ **İkinci kova BOŞ DEĞİL** — `axcali2032` tekil bir görünüm değilmiş.

**İKİNCİ KOVANIN SEBEBİ ÖLÇÜLDÜ (240 varyant):**

    stoğa HİÇ girmemiş        0 varyant
    kısmen girmiş             3
    tamamı girmiş           237      ← sipariş = teslim, sorun burada DEĞİL

    açık parti VAR           69
    açık parti YOK (tükenmiş) 171

> ### ✅ VE KALEM DÜZEYİNDE SORU KAPANDI — AÇIKLANAMAYAN YOK
>
>     BAĞSIZ KALEM: 2550
>       açık parti HİÇ YOK                 2550
>       açık parti VAR ama TARİHİ SONRA       0
>       açık parti var, ADET yetmiyor         0
>       ⛔ KURULABİLİRDİ (açıklanamayan)      0
>
> **Her bağsız kalemin açık partisi sıfır.** "Parti yanlış dağıtıldı"
> iddiası **kurulamadı** — desen yok, tek vaka da yok.

⚠ **VARYANT DÜZEYİNDEKİ 69 İLE KALEM DÜZEYİNDEKİ 0 ÇELİŞMİYOR:** o 69
varyantın açık partisi var ama kârı bekleyen kalemleri **hareket almış**
durumda (kâr tazeleme kuyruğunda). Gerçekten bağsız olanların hiçbirinde
parti yok.

**`axcali2032` DÖKÜMÜ — FIFO doğru çalışıyor:** 5 alım (+6, +5, +5, +7,
+5), 22 satış çıkışı, **0 bağsız kalem**, ledger bakiye 9. Sipariş
`11303193632` 7 adet ve **iki partiye bölünmüş** (`8sqwp1xx` × 4 +
`3qtmm27x` × 3) — dağıtım beklendiği gibi.

### ✅ KÂR TAZELEME KOŞTU — 2757/2757 (27.08.2026)

`AuditLog: SATIS_ICE_AKTARMA_KAR` · hata 0.

| | önce | sonra | **KAPSAM (sonra)** |
|---|---|---|---|
| genel marj | %1,11 | **%12,08** | 5746 satış |
| maliyet bağı olanların | %11,12 | **%19,67** | **3244 satış** |
| kapsanmayan pay | %90,06 | **%38,59** | 2502 / 5746 |
| kârı hesaplanmış satış | 342 | **3099** | — |

⚠ **KAPSAM SÜTUNU BOŞUNA DEĞİL:** `%11,12` ile `%19,67` aynı şeyin iki
ölçümü DEĞİL — **iki farklı kümenin** marjı. Kapsam yazılmasaydı ikisi
çelişiyor sanılırdı.

⛔ **RAKAM HÂLÂ BASILMIYOR** — kapsanmayan pay **%38,59**, eşik **%0,50**.
Ekran: _"hesaplanamıyor (2502/5746 satışın maliyeti yok)"_.

⚠ **VE MALİYET BAĞI OLANLARIN MARJI DA DEĞİŞTİ: %11,12 → %19,67.** Kapsam
değişince payda değişti; **iki rakam da aynı anda hareket etti** ve bu
beklenen bir şey — ama _"gerçek marj %11,12"_ diye kaydedilmiş bir cümle
varsa **artık geçersiz**, geçerli olan **%19,67**.

**ÜÇ KOVA:** (a) **691** _(önce 3809)_ · (b) **1441** · (c) **370**.
(a)'daki büyük düşüş kâr tazelemenin kendisi — o satışların bağı zaten
vardı.

### 📗 BELGE EKSİK LİSTESİ — HALİL İÇİN ÇALIŞMA DOSYASI

`npm run canli:belge-eksik -- --excel="…"` · **salt okuma**.

**188 varyant · 700 kalem · açık fark 984 adet · ₺1.971.340**

    ilk  10 varyant → %20,9      ilk  60 → %65,6
    ilk  30 varyant → %43,8      ilk 100 → %84,0

⚠ **DAĞINIK: %84'ü kapatmak 100 ayrı ürünün belgesini ister.** En büyük
kalem `KUC-AN-260812-01` (Anker Motion Boom): alım 7, satış 21, **açık 14
adet, ₺61.667**.

📄 **Dosya: `C:/Users/yapra/Downloads/belge-eksik-varyantlar.csv`**
_(CSV — Excel doğrudan açar; `;` ayraç + BOM, Türkçe karakterler için.)_

⛔ **LİSTEYE KAPSAM DIŞI VE ALIMI HİÇ OLMAYAN VARYANT GİRMEDİ** — onlar
belge aramakla kapanmaz. Bekçi bu üç elemeyi ayrı ayrı sınıyor; biri
düşerse Halil bulunamayacak bir belgenin peşine giderdi.

⏭ **AÇIK KALAN — 2502 satış, üç ayrı iş:**
· **370 kapsam dışı** → ⛔ KAPANMAZ, kalıcı şerh
· **188 varyant / ₺1,97M** → belge aranabilir _(liste hazır)_
· **1441 alım kaydı yok** → o ürünlerin alımı hiç girilmemiş

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

### 📊 ÜÇ ÖLÇÜM — SAYIM ÖNCESİ TABAN (27.08.2026, salt okuma)

**① KAYNAK KIRILIMI — ilk kez alındı**

| SATIŞ (iptalsiz) | Kayıt | Adet | Tutar | Aralık | Kârlı |
|---|---|---|---|---|---|
| aktarım: satis-excel | 5190 | 5310 | 15.072.024 | 2024-01→2026-08 | %53,1 |
| aktarım: TY API | 411 | 418 | 1.348.454 | 2026-06→2026-08 | %83,2 |
| **ELLE GİRİLEN** | 145 | 148 | 499.561 | 2026-06→2026-08 | **%100,0** |

| ALIM | Kayıt | Adet | Tutar | Aralık |
|---|---|---|---|---|
| aktarım: alis-excel | 1569 | 3251 | 7.759.477 | 2025-10→2026-08 |
| ELLE GİRİLEN | 386 | 899 | 2.169.011 | 2024-05→2026-08 |

> ### ✅ ELLE GİRİLENLERDE AÇIK YOK
>
> | Kaynak | (a) | (b) | (c) | Toplam |
> |---|---|---|---|---|
> | satis-excel | 662 | 1401 | 370 | **2433** |
> | TY API | 29 | 40 | 0 | **69** |
> | **ELLE** | **0** | **0** | **0** | **0** |
>
> **Giriş disiplini bulgusu YOK** — açığın tamamı aktarımdan geliyor.

**ENVANTER 770 ADEDİN KAYNAĞI:** elle **458** (₺1.213.040) · alis-excel
**306** (₺957.107) · ⛔ alıma bağlı değil **6** (₺23.274).

---

**② 188 VARYANTIN BOŞLUK TARİHİ**

Boşluk **2025-10-26 → 2026-08-26**, tepe **2026-01 (115 kalem)**.
Alım tarihleri: **150 varyantta alım YALNIZ satıştan önce** · 22'sinde
arada da var · 16'sında kısmen sonra.

⛔ **ÇAPRAZ CEVABI: ÇAKIŞIYOR.** Boşluğun her ayında alım defteri
**yoğun** (2026-01: 115 boşluk kalemi ↔ 515 alım adedi). Yani **dosya o
dönemi kapsıyor ama BU ürünleri kapsamıyor** — sebep dosya kapsamı değil.

⛔ **(d) BARKODSUZ SATIRLAR BOŞLUĞU AÇIKLAMIYOR:** 155 barkodsuz alış
satırından 188 varyantla **TAM eşleşen 2**, yakın **4**, eşleşmeyen
**182**. Belge aramaya gerek var.

---

**③ TERS YÖN — alım var, satış yok**

**202 varyant · 770 adet · ₺2.193.421**

⛔ **HİÇ SATIŞI OLMAYAN: 81 varyant · 299 adet · ₺930.766**
**80'inin kanal SKU'su VAR** — yani ürünler fiilen satışta.

⚠ **HÜKÜM YOK — İKİ OKUMA DA MÜMKÜN ve ölçüm ikisini AYIRAMAZ:**
satışı deftere girilmemiş olabilir **ya da** gerçekten satılmamış stok.
**Ayrımı yalnız FİZİKSEL SAYIM kurar.**

⚠ **BEKLEME SÜRESİ TEK BAŞINA AYIRT ETMİYOR:** `axcali1610` 3 gün
beklemiş ve hiç satışı yok (normal), `axcali1834` 178 gün beklemiş ve hiç
satışı yok (şüpheli) — ama `OYU-LG-598P-01` 1 gün beklemiş, satışı VAR ve
37 adet açık. Üç desen de aynı listede.

**Açık partilerin alım ayı:** 2026-06 (₺424.246) · 2026-07 (₺428.781) ·
2026-08 (₺251.714) — **yeni alım ağırlıklı, bu normal stok görüntüsü.**
Eski uçta 2025-03'te 1 varyant / 1 adet.

📄 **SAYIM ADAY LİSTESİ: `C:/Users/yapra/Downloads/sayim-adaylari.csv`**
202 satır · tutara göre sıralı · SKU · ürün · açık adet · ödenen · en
eski/yeni parti · son satış · bekleme günü · kanal SKU sayısı.

### 🔬 K57 — FİZİKSEL SAYIM · [MIGRATION CANLIDA BEKLİYOR] (27.08.2026)

**Tasarım turu onaylandı** (iki tablo · kapsam 202 varyantın tamamı).
Migration `20260827061946_stok_sayimi` **yerelde koştu, canlıda KOŞMADI** —
canlı veritabanına erişim yok (bkz. K59). `deploy:bekci` bu yüzden bilerek
kırmızı; şema commit'i **push EDİLMEZ** (`8cb0023` vakası).

    ALTER StockMovement +sayimSatiriId · CREATE StokSayimi · CREATE StokSayimSatiri
    2 CreateTable · 1 AlterTable · 1 CreateIndex · 4 AddForeignKey · 0 yıkıcı ifade

**Saf gövde YAZILDI ve bekçisi koşuyor** — `src/lib/sayim/`
(`kova` · `ozet` · `oturum` · `karar`), veritabanına hiç dokunmuyor.

| Bekçi | Sonuç |
|---|---|
| `sayim:dogrula` | ✅ **62 ölçüt** · değer testi, kaynak taraması YOK |
| `sayim:mutasyon` | ✅ **15/15 yakalandı** (− kaldıran 7 · + fazladan 8) · 40 sn |

⚠ **HARNESS BİR KÖR NOKTA BULDU VE BEKÇİ DÜZELTİLDİ** (mutasyon silinmedi):
`sayilmadi` sayacının kapsam kapısını (`if (g.kapsamdaydi)`) silen mutasyon
**yeşil geçti** — çünkü test verisinde kapsam DIŞI + SAYILMAMIŞ satır yoktu.
Ayrımın iki yakasını gösteren satır eklendi, mutasyon kırmızıya döndü.
_Ölçüt doğruydu, ÖRNEK VERİ kördü — "örnek veri ayrımın iki yakasını
göstermeli" kuralının dokuzuncu vakası._

⚠ **`yedek:dogrula` da kırmızı yandı ve haklıydı:** iki yeni tablo yedek
listesinde yoktu. Eklendi — ve **stok defterinden ÖNCEye**, çünkü
`StockMovement.sayimSatiriId` sayım satırına bakıyor; ters sırada geri
yükleme yabancı anahtar hatası verirdi.

**Kalan (migration canlıya inince):** `/okut` ikinci kipi + açılış
hatırlatması · kapanış ekranı (fazla/eksik ayrı, belge yolu üstte, yazınca
kilit) · Halil test listesi.

✅ **`sayim-mutasyon:kontrol` TURA GİRDİ** (kullanıcı kararı 27.08.2026):
_"mutasyon turu koşmuyorsa bekçinin bekçisi yoktur."_

⚠ **İKİ DÜZELTME — ikisi de benim hatam, sessizce geçilmiyor:**

**① ÖNERDİĞİM AD TURA GİRMİYORDU.** `sayim:mutasyon-kontrol` dedim; seçici
`ad.endsWith(":kontrol")` arıyor ve o ad `-kontrol` ile bitiyor. Tur 52
bekçiyle koştu, mutasyon **hiç çalışmadı** ve fark ancak koşum listesinde
görüldü. Doğru ad **`sayim-mutasyon:kontrol`** (`migration:kontrol` deseni).
_"Kural doğru mu değil, teslim edilebilir mi" — ad bir SÖZDÜ, seçici onu
tanımıyordu._

**② BEYAN ETTİĞİM BEDEL AŞILDI.** Ölçüldü:

    tahminim   +40 sn  →  tur ~140 sn      (tek başına koşum: 40 sn)
    GERÇEK     +89 sn  →  tur  189 sn      (tur içinde adım: 52,9 sn)

Fark, harness'in **15 alt süreç** açmasından: `bekci.ts` bekçileri
**SIRAYLA** koşuyor (`for (const ad of liste)`, paralel yok), ama harness'in
kendi alt süreçleri makineyi doldurup öteki adımları da yavaşlatıyor.
Karar aynı yönde kalıyor — ama tahmini bilen biri için kaynaksız bir sayı
doğmasın.

⚠ **AÇIK KALEM (kullanıcı şartı): süre büyürse çözüm mutasyonu ÇIKARMAK
DEĞİL**, paralel koşum ya da önbellek ölçmek. `bekci.ts` bugün tamamen
sırayla koşuyor — ölçülecek ilk yer orası.

### 🆕 K58 — ENUM SIRA AYRIŞMASI · ŞEMA ↔ VERİTABANI (27.08.2026)

`ReturnReason` şemada ile veritabanında **AYNI 14 DEĞERİ FARKLI SIRAYLA**
taşıyordu: `YANLIS_URUN` veritabanında 6., şemada 13. sıradaydı. Ayrışma
**23.08'den beri** vardı.

MySQL'de ENUM **sıralıdır** (değerler içeride sıra numarasıyla saklanır), o
yüzden Prisma bunu bir kusur sayıyor ve **her yeni migration'a kendiliğinden
yamıyordu**: K57'nin sayım migration'ına

    ALTER TABLE `returnnotice` MODIFY `reason` ENUM(...) NOT NULL;

satırı böyle girdi. Yani adı `stok_sayimi` olan bir paket, canlıda **veri
taşıyan** bir kolonu yeniden sıralayacaktı.

✅ **ÇÖZÜM: ALTER YAZILMADI, GEREKSİZ KILINDI.** Şemanın sırası
veritabanınınkine uyduruldu (değer kümesi zaten aynıydı) → migration'da
`returnnotice` geçen satır **0**, canlıda hiçbir ALTER koşmayacak, hiçbir
veri değişmedi. Enum'un yanına niye o sırada olduğu yazıldı; sona taşınırsa
aynı kaçak geri gelir.

⛔ **AÇIK KALEM — `deploy:bekci` KATMAN A ENUM DEĞER SIRASINA BAKMIYOR.**
_"Şemadaki her alanın migration'ı var"_ diyor ve ALANLARI sayıyor; enum
değerlerinin sırasını (hatta kümesini) hiç ölçmüyor. Ayrışma **4 gün boyunca
yeşil yandı** ve ancak alakasız bir migration üretilirken göründü.
**Açılış şartı yok — bu doğrudan iştir:** katman A enum kümesi + sırası
karşılaştırmasıyla genişletilir, ve genişletme **iki yönlü mutasyonla**
sınanır (sıra bozan · değer ekleyen).

### 🆕 K59 — CANLI VERİTABANINA ERİŞİM YOK · **HALİL'DE** (27.08.2026)

Sebep **ölçüldü ve daraltıldı — KAS'ta değil, AĞDA:**

| Hedef | Sonuç |
|---|---|
| `w0216a46.kasserver.com:3306` | `ECONNREFUSED` (~2 sn sonra) |
| `github.com:443` · `example.com:80` | **AÇIK** (15–32 ms) |
| `8.8.8.8:53` · `1.1.1.1:53` · `github.com:22` | `ECONNREFUSED` |
| `127.0.0.1:3306` (yerel) | AÇIK (1 ms) |

**8.8.8.8:53 kapalı olamaz** — yani reddeden karşı taraf değil, **çıkış
yolu**. Dışarı yalnız **80/443** açık.

    Bağlanılan ağ:  SSID "i-Punkt HOTSPOT" · şifresiz (Offen) · 192.168.179.6
    Çıkış IP:       109.250.119.195      DNS: 192.168.179.1

⛔ **AÇIK BİR HOTSPOT'A BAĞLANILMIŞ** ve o hotspot yalnız web'e izin veriyor.
Kum havuzu dışında da aynı sonuç — yani araç kısıtı değil, ağın kendisi.
Canlı SİTE çalışıyor (`/giris` 200), Selliora'da bir arıza YOK.

**Halil'in yapacağı:** kendi WiFi'ına (ya da telefon hotspot'una) geç →
`npm run canli:migrate` tek komutla biter. **KAS panelinde değişiklik
GEREKMİYOR** — ilk teşhisim IP izin listesini işaret ediyordu, ölçüm onu
çürüttü.

### 🚨 K60 — GÖREV KUTUSU: "5192 KARGOYA VERİLMEMİŞ" · **[YANLIŞ CEVAP VEREN EKRAN]** (27.08.2026)

Panel _"Bugün ne göndermeliyim"_ **5192 bekleyen** · **0 paketlendi** diyor.
Rakam gerçek bir iş DEĞİL: K56'nın içe aktardığı geçmiş satışlar.

**MEKANİZMA — koddan okundu, kesin:**

    panel.ts:314   if (kargo.kargoTarihi === null) → bekleyen++
                   "DÖNEM KONTROLÜ YOK: bekleyen zamansızdır"

    canli-satis-ice-aktar.ts:401  sale.create({ code, channelAccountId,
                                   soldAt, importBatch, importKaynak, items })
                                   ⛔ shippedAt YAZILMIYOR
    canli-ty-ice-aktar.ts:379     shipmentCode YAZIYOR, shippedAt YAZMIYOR

⛔ **VE KAYNAK DOSYADA KARGO TARİHİ YOK** (ölçüldü — `satis.xlsx` · SATIŞ
sayfası · 31 kolon): `Tarih` var, kargo/teslim tarihi kolonu **hiç yok**.
Yani geri doldurulacak bir veri de yok.

**KÖK SEBEP — `shippedAt = null` İKİ AYRI ŞEY DEMEK:**

| null'ın anlamı | Doğru davranış |
|---|---|
| elle girilen satış, **henüz kargolanmadı** | ✅ GÖREV |
| içe aktarılan satış, **sistem hiç bilmiyor** | ⛔ görev DEĞİL — KAYIT |

Panel kuralı _"bekleyen zamansızdır"_ **doğruydu**: her satış kendi günü
girildiğinde null yalnız birinci anlamı taşıyordu. 14 aylık geçmiş deftere
girince ikinci anlam doğdu ve kural kendi kapsamının dışına taştı.
_(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_

⚠ **VE KUTU ARTIK KAPANAMAZ.** Halil aylar önce teslim edilmiş 5192 siparişi
kargolayamaz. K49: _"görev kutusundaki her madde kapatılabilir olmalıdır;
kapatılamayan madde kutunun TAMAMINA olan güveni eritir."_ "0 paketlendi"
ilerleme satırı da bu yüzden sonsuza kadar 0.

**ÖNERİ — ÜÇ KOVA, hepsi elimizdeki veriden (yeni alan YOK, uydurma YOK):**

| Koşul | Sonuç |
|---|---|
| `importKaynak = null` + `shippedAt = null` | **GÖREV** (bugünkü davranış korunur) |
| içe aktarılmış + `shipmentCode` DOLU | kargo numarası var → çıkmış → görev değil |
| içe aktarılmış + `shipmentCode` BOŞ | **BİLİNMİYOR** → görev değil, **tutanakta sayılır** |

⛔ **`shippedAt` GERİ DOLDURULMAZ.** Ne dosyada ne API'de kargo tarihi var;
bir tarih uydurmak ledger'a sahte bir olay yazmak olurdu.
_(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_

⚠ **VE KAYBOLMAZ:** üçüncü kova ekranda **yazar** — _"N içe aktarılmış
siparişin kargo bilgisi sistemde yok; bu sayım onları kapsamıyor."_

⚠ **`panel:dogrula` KIRMIZI YANACAK ve HAKLI OLMAYACAK:** `panel-dogrula.ts:898`
_"bekleyen 3 — BUGÜN penceresinde"_ tam da bugünkü (yanlışa dönmüş) davranışı
sabitliyor. Ölçüt ESKİDİ; susturulmaz, **kapsamına bağlanır** ve niye
değiştiği yazılır.

**KARDEŞ SATIR — aynı kutuda "5259 Kârı hesaplanamayan satış".** Aynı
aileden ama **aynı şey değil:** o kova K55/K56 ile **kapanabilir** (bağ
bekleyen 691 · alım kaydı yok 1441) ve marj şerhi sebebini üçe ayırıp zaten
söylüyor. Dokunulmadı — kapanabilir bir açık görev kutusunda kalabilir.

⛔ **SAYILARIN BİLEŞİMİ ÖLÇÜLMEDİ** (5192'nin kaçı excel, kaçı TY API,
kaçında `shipmentCode` var): canlı veritabanına erişim yok (K59). Mekanizma
koddan **kesin**, dağılım ölçülünce yazılacak.

### 🚦 K60-② UYDURMA KARGO TARİHİ — KURU KOŞUM KOŞTU, **YAZIM ONAY BEKLİYOR** (27.08.2026)

`npm run canli:kargo-geri-al` (salt okuma). **Hiçbir şey yazılmadı.**

    ① o iki günde kargo tarihi taşıyan satış      5613   ← tahmin 5613, TUTTU
       içe aktarılmış (etkilenir)                 5601
       ELLE GİRİLMİŞ (dokunulmaz)                   12

    ② kaynak:  satis-excel  5190   (27.08: 5190)
               enumerasyon   411   (26.08: 410 · 27.08: 1)

    ③ elle girilenler, YERİNDE KALIR:  26.08 → 11  ·  27.08 → 1

⚠ **TAHMİNİM TUTMADI, DÜZELTİLİYOR:** elle girilenler için `26.08 → 13,
27.08 → 0` demiştim; gerçek **11 ve 1**. Küçük fark ama rakamı bilen biri
için kaynaksız bir sayı doğmasın.

**④ RİSK ÖLÇÜMÜ — VE ÖLÇÜT DEĞİŞTİRİLDİ.** İstenen ölçüt _"shipmentCode dolu
olanlar hariç"_ idi. **Mekanizma niyeti karşılamıyor:** TY içe aktarması
`shipmentCode`u HER siparişe yazıyor, yani o alanın dolu olması _"26/27.08'de
kargolandı"_ demek değil. Ona göre hariç tutmak **409 satırda uydurma tarihi
KORUMAK** olurdu.

Gerçek ayırt edici **`updatedAt` yığılması** — toplu tık binlerce satırı
saniyeler içinde günceller:

    2026-08-27, 09:55    5191 satır   %92,7   ← TEK DAKİKADA. Toplu tık, tartışmasız.
    2026-08-26, 22:39–43   260 satır          ← o günün tıkları
    2026-08-26, 18:19       74 · 15:30  68
    2026-08-26, 19:20–21     2 satır          ← DAĞINIK, hariç tutuluyor

    GERİ ALINACAK   5599      (5601 − 2 dağınık)
    iptalli hedef      0
    shipmentCode: var 409 · yok 5190   (ölçüldü, ölçüt DEĞİL)

⚠ **KURU KOŞUMUN KENDİ KUSURU DA BULUNDU VE DÜZELTİLDİ:** "dakika" kovası
`slice(0, 16)` ile kesiliyordu ve dakikanın son hanesi düşüyordu — kova
aslında **10 DAKİKALIKTI**. Sayılar makul göründüğü için fark edilmesi zordu;
etiket "dakika" diyordu, ölçtüğü başkaydı. `slice(0, 17)` ile düzeltildi ve
tablo yeniden üretildi.

**⛔ YAZIM İÇİN ONAY BEKLİYOR** — ölçütü DEĞİŞTİRDİĞİM için kendiliğinden
koşmadım. Komut: `npm run canli:kargo-geri-al -- --yaz` (tek toplu `AuditLog`
kaydı, gerekçesiyle).

### ✅ K60-② GERİ ALMA — KOŞTU (27.08.2026)

    önce  5601   →   sonra  2      (etkilenen 5599)
    ikinci koşum:  GERİ ALINACAK 0        ← idempotent

**Elle girilen 12'ye DOKUNULMADI** — teyit: 26.08 → 11 · 27.08 → 1, ikinci
koşumda aynı. Hariç tutulan 2 dağınık damgalı satır da yerinde.

`AuditLog: KARGO_TARIHI_GERI_ALINDI` — gerekçe · ölçüt · hariç tutulanlar ·
öncesi/sonrası/etkilenen, hepsi kayıtta.

**PANELİN GÖRECEĞİ (K60 gövdesiyle canlı veri üzerinde hesaplandı):**

| Kova | Adet |
|---|---|
| **GÖREV** (kargoya verilmemiş) | **0** |
| ÇIKMIŞ | 556 |
| **BİLİNMİYOR** (ekranda şerh) | **5190** |

Günlük grafik: 26.08 **421 → 13** · 27.08 **5192 → 1**. Sahte gün silindi.

⛔ **AMA K60 KODU CANLIDA DEĞİL — VE BU BİR AÇIK PENCERE.** Geri alma canlı
VERİYİ düzeltti; üç kovayı uygulayan KOD hâlâ commit'siz. Bugünkü canlı
panel eski kuralla sayıyor, yani görev kutusu şimdi **~5599 bekleyen**
gösteriyor.

⚠ **VE DÜĞME KAPISI DA CANLIDA DEĞİL:** aynı toplu düğme bugün yine
tıklanırsa aynı hasar tekrarlanır. `.githooks/pre-push` → `deploy:bekci`
migration canlıda koşmadığı için push'u durduruyor, yani K60 ekranı
**migration'dan önce canlıya çıkamaz.**

**Halil'e:** _"Kargoya verildi olarak işaretle"_ düğmesine migration + deploy
tamamlanana kadar **BASMAYIN.**

### ✅ K60-③ DÜĞME KAPISI — KURULDU (27.08.2026)

Aynı turda, tekrar olmasın diye.

| Katman | Ne yapıldı |
|---|---|
| **Sunucu** | `updateMany` koşuluna `importKaynak: null` — içe aktarılmış sipariş toplu işaretlenemez |
| **Ekran** | düğmeye giden küme aynı süzgeci uyguluyor (düğmedeki sayı = işlenecek sayı) |
| **Onay metni** | artık SOMUT: _"{sayi} sipariş için KARGO TARİHİ olarak {tarih} yazılacak. ⛔ Bu tarih gerçek kargo tarihi değilse veri bozulur."_ |
| **Elenen küme** | sessizce elenmiyor: _"⛔ İçe aktarılmış N sipariş bu kümede YOK: sistem onların gerçek kargo tarihini bilmiyor…"_ |

⚠ **Tarih İSTANBUL gününden kuruluyor** — çıplak yerel tarih, Almanya'da gece
yarısından sonra sunucunun yazacağından FARKLI gün gösterirdi.
⚠ **Tek tek işaretleme AÇIK kaldı:** orada kullanıcı tarihi KENDİSİ giriyor,
yani bir kaynağı var.

**Bekçiler:** `toplu-kargo:dogrula` **14 ölçüt** · `toplu-kargo-mutasyon:kontrol`
**9/9 mutasyon** (− kaldıran 6 · + fazladan 3).

⚠ **HARNESS ÜÇÜNCÜ KAPISI İŞE YARADI — ÜÇ MUTASYON "YEŞİL" GÖRÜNECEKTİ.**
`src/app/satislar/actions.ts` **CRLF**, öteki dosyalar LF; çok satırlı
desenler `
` arıyordu ve o dosyada **0 kez** eşleşti. Harness bunu
"yakalandı" saymadı, **HARNESS HATASI** dedi. Çare desen yamamak değil
**okuma/eşleşme kapısı** oldu (`desenNormalle`) — yoksa yarın eklenen
dördüncü desen aynı tuzağa düşerdi.

⚠ **Sayfalama hâlâ YOK** (`/satislar` bütün defteri çekiyor) — ayrı kalem,
bu turda kapsam dışı.

### ⛔ K60-④ DÜZELTME BEŞ OKUYUCUYA ULAŞMAMIŞTI (27.08.2026)

**Kullanıcı buldu, bekçi değil:** geri alma koştu, K60 kodu yazıldı, ekran
düzeltilmiş görünüyordu — **görev kutusu hâlâ 5599 gösteriyordu.**

Sebep: aynı soruyu **ALTI** yer soruyor, ben **birini** düzeltmişim.

    ✓ panel.ts                     ← düzeltilmişti (pazaryeri kartı)
    ✗ panel/gorev-verisi.ts (×2)   ← GÖREV KUTUSU · ekrandaki rakam
    ✗ liste-suzgeci.ts             ← rakama tıklayınca açılan liste
    ✗ paketle/actions.ts           ← paketleme ekranı
    ✗ okut/actions.ts (×2)         ← barkod okuma akışı

**ÇARE — TEK GÖVDE + DESEN YASAĞI:** `src/lib/kargo-bekleyen.ts` açıldı, altı
okuyucu oradan besleniyor. Bekçi **dosya listesi TUTMUYOR**; çıplak
`shippedAt: null` yazmayı yasaklıyor — yarın eklenen yedinci ekran da
yakalanır. Üç istisna gerekçesiyle beyan edildi.

`kargo-bekleyen:dogrula` **14 ölçüt · 6/6 mutasyon**, sonuncusu belirleyici:
**hiçbir listeye eklenmemiş YENİ bir dosya** çıplak koşul yazınca kırmızı
yandı.

⚠ **İKİ BEKÇİ KIRMIZI YANDI VE HAKLI OLMADILAR** — `paketleme:dogrula` ve
`panel:dogrula` çıplak metni arıyordu. **Susturulmadılar**, `KARGO_BEKLEYEN`e
bağlandılar, niye eskidikleri koda yazıldı ve **dişleri mutasyonla sınandı**
(ikisi de kırmızı yandı). `paketleme`nin eski gerekçesi (_"sabite saklanmış
süzgeci bekçi göremez"_) `iptalTarihi` için HÂLÂ geçerli ve o koşul çağrı
yerinde bırakıldı.

### ✅ K57 MIGRATION CANLIDA KOŞTU (27.08.2026)

    39 migration · damga 2026-08-27 · deploy:bekci YEŞİL
    45 tablo · 501 kolon canlıda doğrulandı

**DÖRT SAYIM:**

    StokSayimi            0    ✓
    StokSayimSatiri       0    ✓
    StockMovement      5336
    sayimSatiriId dolu    0    ✓ geri doldurma YOK

⚠ **`StockMovement` İÇİN "DEĞİŞMEDİ" DİYEMEM — ölçüm penceresi kaçtı.**
Migration'dan hemen ÖNCE sayım almadım; elimdeki taban bu sabah 02:00'daki
`5331`. Fark **+5** ve ölçüldü: **beşi de `PURCHASE_IN`, bugün yazılmış** —
yani Halil'in gün içi alım girişi, migration değil (migration hiçbir hareket
yazmaz; migration anından sonra doğan 3 hareketin hepsi de alım). Doğru
cümle _"değişmedi"_ değil, **"migration hareket yazmadı, fark gün içi
giriştir."**

### ✅ K61 — YAVAŞLIK: SAYFALAMA + TOPLAMLAR VERİTABANINA (27.08.2026)

**Kullanıcı düzeltmesi çerçeveyi değiştirdi:** _"Milyonlarca data ile çalışan
ERP'ler var."_ Haklı — 5778 satır AZ bir veri. İlk çerçevem ("veri büyüdü")
tetiği anlatıyordu, kusuru değil.

**AYIRT EDİCİ ÖLÇÜM — ağ tabanı çıkarılmış:**

    SELECT 1 (saf gidiş-dönüş)                  29 ms   ← taban
    sale.count() — 5778 satır                   30 ms   →   1 ms iş
    50 satış, sığ seçim                         32 ms   →   3 ms iş
    50 satış + kalemleri                        94 ms   →  65 ms iş
    TÜM defter + derin include                1600 ms   → 1571 ms iş
    aggregate: NET-2 / adet                  57 / 58 ms

**Veritabanı 5778 satırı 1 ms'de sayıyor.** `Sale_soldAt_idx` planı
`type=index · rows=50 · Using index` — bu sorgu MİLYONLARCA satırda da 50
satır maliyetinde çalışır. Yavaş olan veri değil, **ekranın satır sayısıyla
DOĞRUSAL büyüyen yazılış biçimiydi.**

**ÜÇ KUSUR, hepsi yazım:** ① `/satislar` ve `/alimlar`da sayfalama yok ·
② derin `include` zinciri (satır başına 5+ tablo) · ③ **toplamlar bellekte**
— ekranın defteri komple çekmesinin ASIL sebebi buydu.

⚠ ③ çözülmeden ① yapılsaydı ekran hızlanır, **toplamlar sessizce sayfanın
toplamına düşerdi** (İlke #15). Yavaşlıktan tehlikeli: yanlış rakam.

**SONUÇ — ölçüldü:**

    ÖNCE   sorgu 1609 ms · 5746 satır · 10,1 MB
    SONRA  sorgu  158 ms ·   50 satır ·   91 KB     ← yük 111 KAT küçük
           toplamlar (veritabanı) 200 ms
           ────────────────────────────
           1609 ms  →  358 ms

Toplamlar süzgecin TAMAMINI ölçüyor: `5746 kayıt · ciro ₺16.920.038,27 ·
5876 adet · NET-2 ₺187.008,67 · hesaplanamayan 5259`.

**Yeni gövdeler:** `lib/satis-toplami.ts` · `lib/alim-toplami.ts`.
İptal koşulu **`AND` ile** ekleniyor — spread, kullanıcının kendi `?iptal=1`
süzgecini sessizce ezerdi (17.08.2026 vakası).

**Bekçi:** `sayfalama-toplami:dogrula` **18 ölçüt · 8/8 mutasyon** —
sayfalanmış diziden toplayan her ifade, `take`/`skip` silinmesi, süzgeç
taşımayan çubuk, spread'e dönen gövde: hepsi kırmızı yanıyor.

⚠ **İKİ BEKÇİ DAHA ESKİDİ, SUSTURULMADI:**
· `toplam:dogrula` — `adetToplami(` arıyordu; ölçüt **yer değiştirdi**,
  gevşemedi: adet toplamının ekrana vardığı hâlâ ölçülüyor, kaynağı artık
  veritabanı gövdesi.
· `iptal:bekci` — yeni gövdedeki 6 sorguda süzgeç bir satır YUKARIDA
  (`iptalsiz()`), bekçinin penceresi dışında. **Gerekçesiyle beyan edildi**
  ve süzgecin varlığı `sayfalama-toplami:dogrula` tarafından ayrıca ölçülüyor
  — beyanla geçilmedi.

⛔ **AÇILIŞ ŞARTI YAZILI:** ciro toplamı çarpım gerektirdiği için (`SUM(a*b)`
`_sum`la yapılamaz, `kosul` ham SQL'e çevrilemez) kalemleri okuyor — satır
başına ÜÇ skaler alan, 5898 kalem ≈ 0,2 MB. **~200 bin kalemi geçince**
çözüm `SaleItem.lineTotalAmount` sütunu + `_sum`; bugün eklemek tüketicisi
doğmadan sütun açmak olurdu.

⚠ **KALAN, AÇILMADI:** `/satislar` derin `include` zinciri hâlâ satır başına
5+ tablo çekiyor (50 satırda sorun değil) · panel kargo sorgusu 5600 satışın
bütün kalemlerini ciro için çekiyor, `groupBy`a inebilir · `/satislar`
varsayılan penceresi "tüm zamanlar" — 12.08.2026'da bilinçle böyle bırakıldı
(_"süzgeç eklemek kayıt gizlemek anlamına gelmemeli"_), **dokunulmadı.**

### 🟡 K57 SAYIM EKRANI — ① SAYIM KİPİ KOŞUYOR · ② KAPANIŞ EKRANI KALDI (28.08.2026)

**TESLİM EDİLEN — sayıma BUGÜN başlanabilir:**

| Parça | Durum |
|---|---|
| Şema (2 tablo + bağ) | ✅ canlıda (39 migration) |
| Hesap gövdeleri (`lib/sayim/`) | ✅ `kova · ozet · oturum · karar · okuma` |
| Sunucu eylemleri | ✅ `sayimAc · sayimaOkut · sayimiKapat · okutulmayanlariCevapla` |
| `/okut` sayım kipi | ✅ yapışık sayaç · sürekli kamera · `−`/`+` · wakeLock |
| **Kapanış ekranı** | ⏳ **YOK** — fazla/eksik listesi, belge yolu, düzeltme yazımı |

**ÜÇ ÖLÇÜM YAPILDI, ÜÇÜ DE TASARIMI DEĞİŞTİRDİ:**

    ① kamera HER OKUMADA kapanıyordu (`onOkundu` → `onKapat`)
       768 adet × (getUserMedia + play + odak) ≈ 10–25 dk yalnız açılış
       → `surekli` kipi eklendi; varsayılan KAPALI, öteki ekranlar aynen

    ② tekrar koruması YOKTU — gerekmiyordu da (kamera zaten kapanıyordu)
       açık kalınca sabit barkod SANİYEDE 4 KEZ sayılırdı
       → BOŞ KARE KURALI (eşiksiz), onaylandı

    ③ wakeLock hiç kullanılmıyordu → tam günde telefon uyur, kamera ölür
       → yalnız oturum açıkken tutulur, kapanışta BIRAKILIR

**BEKÇİLER:** `sayim:dogrula` **80 ölçüt** · `sayim-mutasyon:kontrol`
**20/20** · `sayim-ekran:dogrula` **30 ölçüt · 18/18 mutasyon**.

⚠ **BOŞ DİZE ÜÇÜNCÜ HÂL ÇIKTI.** İlk yazımda çözücünün döndürdüğü `""` bir
KOD sayılıyordu: kilit ona geçiyor ve gerçek ürün yeniden sayılıyordu
(`["A","","A"]` → 2, doğrusu 1). Ne ürün ne boş kare — kilit hiç oynatılmaz.
Değer testi yakaladı.

⚠ **PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ.** `sayim-ekran:dogrula` ilk yazımda
2600 karakterlik pencere kullandı ve bir sonraki fonksiyona taşıp MEŞRU bir
`updateMany`yi "toplu yazım" sanarak yanlış yandı. Gövde ölçüldü: 1740.

⚠ **İKİ ÖLÇÜT DESEN SAYMA KÖRLÜĞÜNE DÜŞTÜ, MUTASYON YAKALADI.**
`Math.max(0,` okuma bloğunda İKİ kez (create + update dalı), `surekli = false`
kamera dosyasında İKİ kez. İkisi de ATAMAYA/SAYIYA bağlandı.

**KALAN (② — kapanış ekranı):** dört sayı + **beşinci ayrı: belirsiz** ·
fazla/eksik AYRI liste · fazlada belge yolu ÜSTTE · düzeltme yazılınca satır
KİLİTLENİR · `stok.duzelt` izni · Halil test listesi kapanış kısmı.

### 🆕 K62-② BEKÇİ BELGELERE GENİŞLETİLDİ — ALTI VAKA DAHA (28.08.2026)

İlk yazımda yalnız `src/` ve `scripts/` taranıyordu. Aynı gün ölçüldü:

    CLAUDE.md         5 backspace   ← İKİSİ tam da BU KURALI anlatan örneğin içinde
    BEKLEYENLER.md    1 backspace

⛔ **KURAL, KENDİ METNİNİ BOZARAK YAZILMIŞTI.** _"Ters bölülü desenler ham
dizeyle kurulur"_ diyen paragraf betikle eklendi ve içindeki kaçışlar yine
backspace'e döndü. Ekranda `/Date/` gibi görünüyordu.

⚠ **BELGE BOZULMASI KODDAN SİNSİ:** derleyici yok, test yok, mutasyon yok —
yalnız okuyan biri **yanlış öğrenir.** Kapsam köke uzatıldı (`CLAUDE.md` ·
`BEKLEYENLER.md` · `ARSIV.md` · `README.md` · `AGENTS.md`), 595 dosya
taranıyor, mutasyonla kırmızı yandığı görüldü.

**Ders yazıldı:** bu tuzak _"dikkat edilerek"_ atlatılmıyor. Aynı oturumda
**üç kez** düşüldü ve üçünü de ölçüm yakaladı, göz değil.

### 🆕 K62 — GÖRÜNMEZ KARAKTER BEKÇİSİ · ÜÇÜNCÜ VAKA BULUNDU (28.08.2026)

Python'un ham OLMAYAN dizesinde ters bölü + `b` yazmak → **0x08 backspace**. Dosyaya düşen
desen ekranda `/Date/` gibi görünür ama hiçbir şeyle eşleşmez → ölçüt
**her zaman yeşil.**

`kontrol-karakteri:dogrula` yazıldı (585 dosya taranıyor, liste tutmuyor) ve
**aylardır duran üçüncü bir vakayı buldu:** `talep-dogrula.ts` →
_"varsayılan KAPALI (open özniteliği yok)"_ ölçütü
`!/<details[^>]*<BS>open<BS>/` idi, yani `!false` = **her koşumda yeşil.**
Onarıldı, mutasyonla dişi olduğu görüldü.

### 🚨 K57-③ CANLI ÇÖKME — GÜNDE İKİNCİ SAYIM (28.08.2026, DÜZELTİLDİ)

Halil "Sayım başlat"a bastı, ekran **`This page couldn't load`** verdi.

**ÖLÇÜM — tahmin edilmedi, canlıdan okundu:**

    sayim-20260827   204 satır
      açılış  13:37:31
      kapanış 13:37:47      ← 16 saniye sonra kapatılmış

**SEBEP:** `kod` şemada `@unique`, `sayimKodu` günde **TEK** kod üretiyor.
Oturum açılıp kapandıktan sonra ikinci "Sayım başlat" **tekillik ihlaliyle**
düştü — ve hata yakalanmadığı için 500 döndü.

⛔ **İKİ AYRI KUSUR, İKİSİ DE DÜZELTİLDİ:**

**① Kod tekilleşmesi.** Çare _"günde bir sayım"_ DEĞİL — aynı gün ikinci
sayım meşrudur (ilki yarım kalmış olabilir, bir raf yeniden sayılabilir).
`bosSayimKodu` boş olanı seçiyor: `sayim-20260827-2`. Rastgele sonek de
tekilliği sağlardı ama kod düzeltme hareketine damgalanıyor ve **insanın
okuyacağı bir iz** — üç ay sonra "bu hangi sayımdı" sorusuna cevap vermeli.

**② Yakalanmamış hata 500 döndürüyordu.** Kullanıcı yalnız _"This page
couldn't load"_ gördü, hiçbir yerde NEDEN yazmadı (İlke #5 ihlali).
`create` artık `try/catch` içinde: mesaj **tam** loglanıyor, ekrana
_"Sayım açılamadı"_ düşüyor.

**Bekçi:** `sayim:dogrula` **85 ölçüt** (5 yeni) · `sayim-mutasyon:kontrol`
**22/22**.

⚠ **HARNESS ÜÇÜNCÜ KAPISI YİNE İŞE YARADI.** İlk mutasyon döngü gövdesini
siliyordu; o hâlde `bosSayimKodu` 99 turdan sonra `throw` ediyor, bekçi
ÇÖKÜYOR ve harness bunu **"yakalandı" saymadı** — çökme, ölçütün ölçtüğünü
kanıtlamaz. Mutasyon değer bozan hâle çevrildi.

⚠ **CANLIDA DURAN KAYIT:** `sayim-20260827` (204 satır, kapalı, hiç okuma
yok, düzeltme yazmamış). Silinebilir — `StockMovement → satır` bağı
`Restrict` olduğu için düzeltme yazmış bir oturum zaten silinemezdi.
**Karar Halil'de**; durması da zararsız (kapanmış bir sayım kaydı).

### ✅ K57-② KAPANIŞ EKRANI — TESLİM (28.08.2026)

**Sayım artık uçtan uca kullanılabilir:** başlat → okut → kapat → **hüküm ver**.

| Parça | Durum |
|---|---|
| `lib/sayim/kapanis-verisi.ts` | ✅ üç ölçüm: sayım günü sonu stoğu · aynı gün hareketi · **hareketsiz satış** |
| `okut/sayim-yazim-actions.ts` | ✅ `COUNT_CORRECTION` · FIFO · damga · sunucu kilidi |
| `okut/sayim-kapanis.tsx` | ✅ beş sayı · fazla/eksik AYRI · belge yolu üstte |
| `docs/sayim-proseduru.md` | ✅ **sürüm 2** — belge ilk kez dosya oldu |

**ÜÇ EK UYGULANDI:**

**① Üçüncü bilgi.** Eksik satırında _"Bu üründe stok hareketi olmayan N satış
kaydı var"_ — N=0 ise satır ÇİZİLMEZ. Ölçüm gerçek: canlıda 2553/5866 satış
kalemi (%43,5) stok hareketi taşımıyor; kapsamdaki 204 varyanttan **1'i** bu
durumda. Risk düşük ama sıfır değil.

**② Dil düzeltildi.** _"maliyet gider yazılır"_ cümlem YANLIŞTI — gider
tablosuna yazılmıyor. Doğru metin: _"Ciroya ve NET-2'ye GİRMEZ, gider
tablosuna YAZILMAZ; GERÇEK NET'ten düşer."_ **Bekçi dil ölçütü taşıyor:**
hiçbir sayım metni "gider yazılır" diyemez.

**③ Asimetri ekranda.** _"Emin değilseniz SAYIM FARKI seçin…"_ — tavsiye
satırı, kapı değil.

**Bekçiler:** `sayim:dogrula` **85** · `sayim-mutasyon:kontrol` **22/22** ·
`sayim-ekran:dogrula` **61 ölçüt · 13/13 mutasyon**.

⚠ **BİR MUTASYON ÖN-EK KÖRLÜĞÜNDEN KAÇTI.** Sıra kontrolü
`indexOf("yolBelgeGirFazla")` yapıyordu; mutasyon anahtarı
`yolBelgeGirFazlaSonra` yapınca `indexOf` onu **yine buldu** (ön ek) ve sıra
aynı konumu ölçüp yeşil kaldı. Desen tam çağrıya bağlandı
(`t("yolBelgeGirFazla")`), mutasyon kırmızıya döndü.

⚠ **BELGE DOSYA OLARAK YOKMUŞ.** _"HTML prosedürü düzeltilecek"_ denince
arandı: `docs/`te sayım belgesi **hiç yoktu** — prosedür şimdiye kadar yalnız
sohbette yaşamıştı. `docs/sayim-proseduru.md` kuruldu ve aşılan sürüm
**sessizce değiştirilmedi**: sürüm 2'nin başında hangi iki cümlenin niye
düzeldiği yazıyor.

⛔ **HENÜZ YOK — ekranda "yakında" yazıyor:** "Satışı gir" ve "Alımı gir"
düğmeleri kapalı. O iki yol mevcut satış/alım formlarına bağlanacak; bugün
kullanıcı ilgili ekrana kendisi gidiyor.

### ✅ K57-④ PROSEDÜR SÜRÜM 3 + BELGE ÜRETECİ (28.08.2026)

**§3.1 eklendi — "Okuttuğunuz kod bulunamazsa".** Gerçek kullanımın ilk
gününde çıktı, belgede yoktu: ① önce ürünü ADIYLA ara ② varsa o üründe kodu
TANIT ③ gerçekten yoksa yeni ürün aç. Dört kod rolü tablosu ve "yeni ürünün
stoğu 0'dır" notu da girdi.

**Bekleyen iki düzeltme sürüm 2'de ZATEN yapılmıştı** — doğrulandı, tekrar
edilmedi: `"alım yap"` ve `"gider yazılır"` yalnız _"ne değişti"_ notlarında
geçiyor, canlı talimat olarak değil.

**ÖLÇÜLDÜ — Halil'in yaptığı doğruydu:**

    mevcut varyanta kod eklendi      9   ← DOĞRU YOL
    yeni kanal SKU                   3
    yeni ürün + varyant açıldı       4
    aynı barkod iki üründe           0   ← çakışma YOK

Açılan 4 ürün tek tek kontrol edildi: ikisi gerçekten yeni, ikisi (LEGO)
benzer seriden ama **farklı setler, barkodlar ayrı.** Dördü de haklı.

### 🆕 K63 — BELGE ÜRETECİ + BAYATLIK BEKÇİSİ (28.08.2026)

⚠ **`docs/iade-sureci.html` ELLE üretilmişti ve üretecin kendisi depoda
YOKTU.** HTML'in başındaki _"Bu dosya ... ÜRETİLDİ"_ uyarısı, gerçekten üreten
bir komut olmadıkça bir İDDİADIR — ve kaynak değişip HTML üretilmezse **yalan**
olur.

`belge:uret` yazıldı (`docs/*.md → docs/*.html`, `iade-sureci.html`in stilini
tek kaynaktan alıyor). ⛔ **Bağımlılık EKLENMEDİ:** depoda markdown kütüphanesi
yok ve bu belgelerin sözdizimi dar/bilinen. Tanınmayan satır **sessizce
yutulmaz**, paragraf olarak çıkar.

`belge:dogrula` — belgeyi yeniden üretip **bayt bayt** karşılaştırıyor.
Mutasyon: `.md`ye tek satır eklendi, bekçi kırmızı yandı ✓

⛔ **VE BEKÇİ KENDİ ARACIMDA KUSUR BULDU:** `belge-uret.ts` ilk yazımda kod
yer tutucusu olarak **0x00 (NUL)** kullanıyordu; `kontrol-karakteri:dogrula`
onu yakaladı. Teknik olarak işe yarardı ama görünmez karakteri kaynağa yazmak
tam da o bekçinin yasakladığı şey — **kural kendi araçlarım için de geçerli.**
Görünür bir işarete çevrildi. Aynı turda ikinci kusur: `new RegExp(... "(\d+)"
...)` — JS dizesinde `\d` sadece `d` oluyordu ve satır içi kod HİÇ
üretilmiyordu; kaçış düzeltildi (11 satır içi kod → 12 `<code>`).

⚠ **KAPSAM DIŞI GEREKÇESİYLE BEYAN EDİLDİ:** `iade-sureci` (üreteçten önce
elle üretildi, bayt bayt eşleşmiyor — açılış şartı: bir kez `belge:uret` ile
üretilmesi) · `el-kitabi` (veritabanından üretiliyor, md kaynağı yok).

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

## 📏 PANO KURALI — ORAN SAYISI KAPSAMIYLA YAZILIR

_Kullanıcı kararı 27.08.2026._ Bir marj/oran sayısı panoya girerken
**yanına ölçüldüğü KAPSAM da yazılır** — "kaç satış üstünden".

**Vaka:** _"gerçek marj %11,12"_ panoda **beş ayrı yerde** duruyordu. Kâr
tazeleme koşunca **%19,67** oldu ve eski rakam **çelişki gibi** göründü —
oysa ikisi de doğruydu: biri 487 satışın, öteki 3244 satışın marjı.

> **Kapsam yazılmayan bir oran, kapsam değiştiği an BAYATLAR — ve
> bayatlığı GÖRÜNMEZ olur.** Sayı hâlâ doğru göründüğü için kimse
> sorgulamaz; iki rakam yan yana gelince "hangisi doğru" diye tartışılır,
> oysa soru **"hangi küme"** olmalıdır.

⚠ Aşılan rakam **SİLİNMEZ**, `⚠ AŞILDI → yeni` diye işaretlenir. Elinde
eski rakam olan biri için kaynaksız bir sayı doğmasın.
⚠ **VE AYNI TABLO İKİ YERDEYSE İKİSİ DE İŞARETLENİR** — birini işaretleyip
ötekini bırakmak "hangisi güncel" sorusunu doğurur.
_("Kaynağı yazılmayan sayı kullanılamaz" kuralının oran tarafı.)_

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

### 🛡 A3 GÜVENLİK ÇERÇEVESİ — mimar kararı 25.08.2026

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
| **H18** | **Melontik ölçütü** | Çapraz teyit için **gerçek** Melontik çıktısı. _Sunumdaki rakamlar demoydu; doğrulanmamış ölçüte göre motor bozulmak üzereydi._ |
| **H25** | **İade süreci — iki ölçüm kaldı** | ✅ **10 GÜNLÜK SAAT KAPANDI:** Aras takibi `(KG)` "yola çıktı 21.08 12:35" ile TY ekranının sayacı **25 saniye** farkla buluştu; rozet `BEYAN → OLCULDU`. 🔻 **Kalan ① KÜÇÜLDÜ 25.08.2026 — ÜÇ SORUNUN İKİSİ CEVAPLANDI `(K)`:** birim **2 İŞ GÜNÜ** (takvim günü değil) · çıpa **KARAR ANI** — _"analizden dönen ürün seçeneklerden biri seçildiğinde"_, kargo kodu DEĞİL. ⚠ İki aday çıpa arasındaki mesafe de ölçeğiyle geldi: seçimden sonra kayıt **~1 saat** "İhtilaflı"da bekleyip aksiyona geçiyor — yani fark **saat**, gün değil (gece yarısını geçerse 1 iş günü eder). ✅ **ÜÇÜNCÜ SORU DA CEVAPLANDI 25.08.2026 `(K)` — ve cevap şıkların hiçbiri değil:** _"iade otomatik olarak MÜŞTERİNİN AÇTIĞI SEÇENEKTEN kapanır; kusurlu üründen açılmışsa ve biz değişim deyip göndermediysek **kusurlu ürün gönderme cezasıyla** kapanır, müşteriye parası yatırılır."_ ⚠ **Sonucu bizim eylemimiz değil MÜŞTERİNİN SEBEBİ belirliyor** — "ceza kesilir" demek eksik olurdu. ⚠ **Beş sayacın EN PAHALISI:** 2 ve 3 dolunca mal yok/para gitti; beşinci dolunca **mal BİZDE kalır, para yine gider, üstüne ceza biner.** ⛔ **Cezanın KENDİSİ ölçülmedi** (hangi sebep hangi ceza, tutar ne) — sistem mekanizmayı yazar, rakamı YAZMAZ. ⚠ **ROZET `BEYAN`, `OLCULDU` DEĞİL:** tek kaynak var; §12.2'deki `10 gün` üç bağımsız kaynakla terfi etmişti. ⚠ **KOD TARAFINDA İKİ EKSİK ÖLÇÜLDÜ:** `SAYAC_KURALLARI`nda **birim alanı yok** (öteki dördü takvim günü, hesap `gunEkle`) ve `isGunuEkle` **resmî tatil saymıyor, yalnız hafta sonu**. Şema DEĞİŞMİYOR — çıpa `GECIS_ANI`, sütun `islemSonTarihi`, ikisi de mevcut. ⚠ **KAPSAM AÇIK:** beyan **analiz yolunu** anlatıyor, sayaç `ITIRAZ_KABUL`e gelen **üç yolda** işliyor (`ITIRAZ_ACILDI` · `ITIRAZ_INCELEMEDE` · `ANALIZ`). Gereken (hem (c) hem terfi için): "Reddedilen" sekmesindeki bir iadenin detayı (karar tarihi + kargo kodu + kalan süre aynı ekranda). ⏳ **Kalan ②:** N11 — tecrübe yok, süresiz bekler. |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K110** | **PARTİYİ BEN SEÇEYİM (belirli tanımlama) · [KOD KOŞTU 31.08.2026]** | ✅ Satış formunda parti seçici; şema değişikliği **SIFIR** — yeni dağıtım gövdesi yazılmadı, `fifoDagit`e verilen listenin SIRASI değiştirildi (`partileriOncele`). ⚠ **SEÇİCİ DARALTILDI:** ölçüt "2+ parti" değil **"maliyeti FARKLI 2+ parti"** — ölçüldü, 102 çok partili varyantın **61'inde maliyetler aynı**, yani gürültünün %60'ı bu ölçütle düştü. Bekçi `parti-secimi:dogrula` 29/29 · mutasyon 7/7. |
| **K111** | **UPC-A OKUNMUYORDU · [KOD KOŞTU 31.08.2026]** | ✅ `UPCA`/`UPCE` `EAN13`in KARDEŞİ (`EANUPC` altında) — EAN13'ü açmak onları KAPSAMIYOR. Mattel kutusu bu yüzden okunmuyordu; katalogun **%9,2'si** okunamaz hâldeydi. Biçim listeleri `src/lib/barkod-formatlari.ts`e taşındı ki bekçi kaynağı taramak yerine **çağırsın**. Bekçi `kamera:dogrula` 50/50 · mutasyon 8/8. |
| **K112** | **MAL KABUL → SATIŞA AÇILMA · [ÖLÇÜM YAPILDI 31.08.2026]** | ✅ Ölçüm koştu, CSV üretildi. ─── ② **K112a PANEL SÜTUNU · [KOD KOŞTU]** — panelin "Alım" ekseni `receivedAt`e çevrildi ve adı **"Mal kabul"** oldu; rakama tıklanınca `/mal-kabul` günün girişlerini VARYANT düzeyinde açıyor (kanal rozetleri: yalnız **"kod var" / "kod yok"** — _"satışta"_, _"aktif"_, _"yayında"_ ibareleri YASAK, sistem onu bilmiyor). Süzgeç + arama + `eksik=1` var. Bekçi `mal-kabul:dogrula` 31/31 · mutasyon 10/10. ─── ③ **K112b TY TAM TARAMA — [AÇIK]** 33 sayfa listeleme taraması, beş sınıf (A–E) + CSV + ham JSON. İki kez araç sorunundan düştü; sayılar **hâlâ bilinmiyor**. |
| **K113** | **BARKOD YAKALAMA TEŞHİSİ · [KOD KOŞTU 31.08.2026]** | ✅ Teşhis satırı + "Kareyi kaydet" düğmesi + masaüstü çözme aracı. ⛔ Davranış DEĞİŞMEDİ (çözünürlük isteği ve biçim listesi elden geçmedi — kullanıcı şartı). Aras etiketi için üç hipotez elendi; **yakalama yolu gerçek cihazda ölçülmeden dördüncü hipotez kurulmaz.** Bekçi `kare-tanisi:dogrula` 35/35 · mutasyon 9/9. |
| **K114** | **`/alimlar` TARİH EKSENİ SEÇİCİSİ · [KOD KOŞTU 01.09.2026]** | ✅ Kullanıcı 31.08'de _"bugün teslim aldıklarım çıkmıyor"_ dedi; liste **sipariş** tarihine göre süzüyordu. 📏 **YÖN ÖLÇÜLDÜ (kısıt yazılmadan önce):** sipariş→kabul gecikmesi **ortanca 3 gün** (p25 2 · p75 4 · max 48), iki eksen yalnız **%1,4** örtüşüyor — yani "ne aldım" ile "ne geldi" pratikte AYRI iki soru. Son 30 günde sipariş **168** ↔ kabul **152**; bugün **4 ↔ 0**. ⛔ **VARSAYILAN `siparis` KALDI** — mevcut davranışın korunması; `kabul` varsayılan olsaydı eski bağlantılar sessizce başka küme gösterirdi. ⚠ **ALAN ADI TEK GÖVDEDE** (`alim-ekseni.ts`): süzgeç `receivedAt`e bakıp sıralama `purchasedAt`te kalsaydı liste DOĞRU kümeyi YANLIŞ sırada gösterirdi. ⭐ **BOŞ SONUÇ KENDİNİ ANLATIYOR:** ekseni adlandırmak yetmedi, **rakam** da veriliyor — _"Bu liste Mal kabul tarihi eksenine göre süzüyor; aynı dönemde Sipariş tarihi eksenine göre 4 kayıt var"_ + tek tıkla geçiş. Ve kabul ekseninde görünmeyen **31 alım** (%1,6, mal kabulü yapılmamış) ayrıca BEYAN ediliyor. **Bekçi `alim-ekseni:dogrula` 24/24 · mutasyon 7/7 kırmızı** (varsayılan çevrildi · iki eksen aynı alana bakıyor · öteki eksen kendisi · süzgeç sabit alana döndü · sıralama sabit kaldı · seçici ekrandan kalktı · boş sonuç sustu). ⚠ Bekçide **ZİNCİR bölümü** var — K121'de tur 98/98 yeşilken kutu ekranda olmadığı için. |
| **K121** | **RAFTA VAR, VİTRİNDE YOK · [KOD KOŞTU 01.09.2026 · ② DÜZELTME 01.09 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ Kanal listeleme durumu deftere girdi ve panele kutu olarak bağlandı. **①** Şema (migration 44): `ChannelSku` + `listelemeDurumu` (DEFAULT `BILINMIYOR`) · `kanalAdet` · `kanalOlcumAt`; taban migration öncesi/sonrası birebir. **②** Yazma yolu — 1073 satırın hepsi işlendi (1061 yazıldı · 11 `YOK` · 1 barkodsuz). ⛔ **PAZARYERİNE HİÇBİR ŞEY YAZILMAZ** (stok senkronu kapsam dışı) ve bekçi TY istemcisinde yazma metodu OLMADIĞINI ölçüyor. **③** Kutu: üç sayılan satır + dördüncü satır "kanal kaydı yok" (**toplama girmez**, ekranda da yazıyor); satırlar ₺'ye göre sıralı; damga her zaman görünür, koşum düştüyse **"son koşum BAŞARISIZ"** der ve sebebi yazar. **④** `vitrin:dogrula` 51/51 · mutasyon 8/9. ─── ⚠ **ÜÇ DÜZELTME KULLANICI BULDUĞU İÇİN YAPILDI:** ① kutu ekranda YOKTU (tur 98/98 yeşildi) — `git checkout -- src/` üç düzenlememi birden silmişti; bekçiye **ZİNCİR** bölümü eklendi. ② panel ızgarası taştı (`grid-cols-5` içinde 2+2+3=7) — kutu ızgaradan çıkarıldı, içerik `max-w-3xl` ile sınırlandı (İlke #12). ③ "kanal kaydı yok"ta iki sayı çelişiyor sanıldı — ölçüldü: **2 = hiçbir kanalda kodu yok**, **9 = bu kanalda kaydı yok**, 2 kümesi 9'un ALT KÜMESİ (kalan 7'sinin HB'de kodu var). Kapsam yazılmamıştı; başlıkta artık kanal adı duruyor. ─── ✅ **HALİL TESTİ GEÇTİ 01.09.2026** — kullanıcı saha listesindeki 14 maddeyi koştu, kutu ve üç satır gerçek cihazda canlı adreste görüldü. ⏳ **KALAN TEK İŞ ZAMANLAYICI — EKRAN DEĞİL:** `scripts/gece-kanal-karsilastirma.ps1` yazıldı ve **gerçekten koşturuldu** (çıkış 0, 1061 satır); Windows Görev Zamanlayıcı görevi henüz TANIMLANMADI (üç adımlık tarif betiğin başlığında). ─── ② **KUTU BİR SABAH KENDİLİĞİNDEN BOŞALDI — KULLANICI SORDU (01.09.2026):** _"bu bilgilendirmeler neden gitmiş"_. Kutu önceki gün **23 ürün · ₺249.636** derken bugün üç sayılan satırın üçü de EKRANDAN KALKMIŞTI. 📏 **ÖLÇÜLDÜ — İKİ AYRI SEBEP, İKİSİ DE GERÇEK:** ① kod `adet > 0` olmayan satırı hiç çizmiyordu, yani **"baktım, temiz" ile "bu satır artık yok" ekranda AYNI görünüyordu** (anayasa: boş sonuç ≠ temiz sonuç); ② asıl sebep: Halil o sabah **19 ürüne TY kanal kodu ekledi** (05:03–09:25, `createdAt` damgaları birebir söylüyor) ve gece koşumu ondan sonra hiç koşmadı — yeni satır varsayılan `BILINMIYOR` doğuyor ve kutu onları **hiçbir yerde saymıyordu.** ⚠ **VE O 19 SATIR SESSİZ DEĞİLDİ:** aynı gün TY tarama dosyasıyla çaprazlandı (salt okuma) — **6'sı STOKSUZ · 4'ü PASIF**, yani **10'u gerçekten satılamaz durumda**, 5'i AÇIK, 4'ü kanalın cevabında hiç yok. Ekrandan düşen para **₺228.680,95**. ⭐ **ÇÖZÜM:** üç satır artık **HER ZAMAN** çiziliyor (sıfır olan `0 · temiz` yazar ve bağlantı DEĞİLDİR — açılacak liste yok, İlke #2) ve **beşinci satır** açıldı: _"Henüz karşılaştırılmadı"_ — sayıya GİRMEZ (defterin hükmü yok) ama görünür, tıklanır, sebebi yazar. Kalıp da düzeldi: üç rakam artık **kompakt kutucuk ızgarası** (İlke #12), tam genişlikte "etiket solda rakam sağda" satır değil. ⛔ **VE ÜÇÜNCÜ BİR KUSUR ÇIKTI:** `kosumIziniYaz` kendi belgesinde _"İZ HER KOŞUMDA YAZILIR — başarıda da"_ diyordu, kod onu **yalnız hesap bulunamadığında** çağırıyordu; bir kez düşen koşumdan sonra kutu sonsuza kadar "BAŞARISIZ" derdi ve "hiç koşmadı" ile "koştu ve düzeldi" ayırt edilemezdi (_"şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur"_). Artık başarıda, tarama düşüşünde ve çöküşte yazılıyor. **Bekçi 51 → 75 ölçüt · 8 bölüm · mutasyon 8/8 KIRMIZI.** ⚠ Bir mutasyon önce KAÇTI: `s.adet === 0 ?` deseni blokta İKİ yerde geçiyordu; ölçüt `return` satırına bağlanınca kırmızı yandı. |
| **K115** | **MALİYET YÖNTEMİ FİRMA SEÇENEĞİ · [① KOD KOŞTU 31.08.2026]** | ✅ **①** Şema canlıda (`MaliyetYontemi` · `LotKipi`, migration 43 — ⚠ **bu migration K119’un YEDEKSİZ PENCERESİNDE koştu**: 31.08 15:29, son başarılı yedek 31.08 01:00) — **taban birebir doğrulandı** (hareket 10780 · negatif 6082/6082 · satış 5843 · NET-2 1.713.105,5422 önce/sonra AYNI). Üç lot kipi (FIFO · HIBRIT · LOT) **tek motor** üstünde; varsayılan `HIBRIT` (`FIFO` seçilseydi K110 seçicisi sütun eklendiği an sessizce kaybolurdu). Hareketli ortalama gövdesi yazıldı ama **ARAYÜZDE KAPALI ve sunucuda REDDEDİLİYOR** (`ACIK_YONTEMLER = ["FIFO"]`). Ayar ekranı + dönem sınırı kapısı (`yontemDegisimKarari`) hazır. Bekçi `lot-kipi:dogrula` 22/22 · mutasyon 8/8. ─── ② **[KOD KOŞTU 31.08.2026 — YARISI TESLİM EDİLEMEDİ, GEREKÇE ÖLÇÜLDÜ]** ⛔ **"Kurgu firmayı FIFO'ya sabitle" BUGÜN ETKİSİZ:** `fifo-dogrula.ts`te firma kurgusu YOK (eşleşen şey `companySku`, ürün alanı) · `maliyetYontemi` sütununu **hiçbir yer OKUMUYOR** · `hareketliOrtalama` gövdesinin **ÇAĞIRANI YOK**. Sabitleme satırı yazılsaydı hiçbir şey yapmaz ve onu kaldıran mutasyon YEŞİL kalırdı — anayasa bunu yasaklıyor ("ölçüt mutasyonsuz teslim edilmez"). **③ bağlandığı gün anlam kazanır ve o gün yazılır.** ✅ **TESLİM EDİLEN YARISI: `maliyet-yontemi:dogrula` 27/27 · 6 bölüm · mutasyon 11/11** (− 6 · + 5) — motor VE değişim kapısı birlikte. İki değişmez her senaryoda ayrıca ölçülüyor (havuz maliyeti ≥ 0 · havuz adedi = ledger adedi). ⚠ **İKİ MUTASYON İLK TURDA KAÇTI, İKİSİ DE KÖR VERİ:** ① fazla çıkış kapısı — `2@100 → −5` iki okumada da `STOK_YOK` veriyordu; ayrım ancak çıkıştan SONRA yeni giriş gelince göründü. ② kuruş tozu sıfırlaması — **200+ kurgu tarandı, kalıntı üreten TEK BİRİ YOK**; satır savunma amaçlı ve **bugün tetiklenemiyor**, korumasız olduğu harness'te BEYAN edildi ve kaynaktaki abartılı iddia ("0,0001 sızardı") ölçüme göre düzeltildi. ─── ⛔ **③ KAPALI KALIYOR — KULLANICI KARARI 31.08.2026.** Axcali FIFO’da kalıyor ve ortalamanın bugün **hiçbir kullanıcısı yok**; açmak operasyonel SIFIR değer, buna karşılık **canlıda sınanmamış bir motor açık** olurdu. Gerekçe ayrıca anayasadan: _13.08.2026 kararı — önce tek firma için her şey tamamlanır, SaaS’a özel iş AÇILMAZ._ ⭐ Açılış şartı: **yakın planda ikinci firma / demo ihtiyacı doğarsa** — o gün "iki yöntem canlıda seçilebilir" demo değeri taşır. Bekçisi hazır (`maliyet-yontemi:dogrula` 27/27 · mutasyon 11/11); açmak **bir günlük iş**. ─── ④ **KART PARTİ PANELİ [KOD KOŞTU 31.08.2026]** — ürün kartında açık partiler (tarih · adet · maliyet · alım kodu · "sıradaki" rozeti · toplam). İki ölçüm tasarımı değiştirdi: şerh **107/231 varyantta (%46,3)** yanıyor ve K91b kapandığı için kapatılamaz → uyarı şeridi değil **gri dipnot**; kodsuz 100 partinin **88'i `COUNT_CORRECTION`** → "bağlanamadı" değil hareketin ADI yazıyor. Bekçi `kart-partileri:dogrula` 12/12 · mutasyon 8/8. |
| **K116** | **SAĞLIK TURU KALICILAŞTIRMA — [KOD KOŞTU 31.08.2026]** | ✅ **①** `siparisKesintiKurallari` ORTAK GÖVDEYE çıkarıldı — ⛔ ölçüldü ki aynı kural **İKİ YERDE birden** yazılıydı (`satis.ts` + `kar-yeniden.ts`); biri kaysaydı bir yol çift sabit gider yazar, öteki yazmazdı. Korunan değişmez: **sipariş başına kesinti BİR KEZ** (`SABIT_GIDER`·`HIZMET_BEDELI`·`ODEME_GIDERI`). Ölçüldü (canlı): bölünmüş 86 satışın HİÇBİRİNDE ikinci satır yok — doğru çalışıyordu ama **korumasızdı**. `kar:dogrula` 74 → **82 ölçüt**; 5 mutasyon (tekilleştirmeyi kaldıran · `PER_PACKAGE` düşüren · `PER_ITEM` sızdıran · paket işaretini hep true yapan · kodu her seferinde yeni yapan) **beşi de kırmızı**. ⚠ **VE ESKİ ÖLÇÜT REFAKTÖRLE KÖRELDİ:** `kar:dogrula` `.filter(...)` desenini iki dosyada arıyordu, davranış ortak gövdeye taşınınca kırmızı yandı — kod doğruydu, aranan DİZE taşınmıştı _(anayasa: "dize, davranışın vekilidir")_. Ölçüt gevşetilmedi, **değer testine çevrildi**: artık desen aranmıyor, gövde ÇAĞRILIP değeri ölçülüyor. ─── ✅ **②** ADET=0 kalemi TEŞHİS EDİLDİ: TY `10559161422` (02.10.2025, içe aktarma `satis-20260826215218`), **iptal DEĞİL**, `CALCULATED`, NET-2 ₺69,475; satışta **başka bir kalem daha var** (adet 1) ve bağlı iki hareket `SALE_OUT −1` + `SALE_CANCEL_IN +1` = **net 0**. Yani bu bir bozulma değil, **adedi 1→0 indirilmiş bir kalemin ledger-tutarlı izi**; ciro katkısı 0, stok etkisi 0. ✅ **KARAR VERİLDİ 31.08.2026: DURSUN.** Ledger-tutarlı bir indirimin izi; silmek izi yok eder. ⭐ Ekranda **"kalem iptal edilmiş" açıklaması** gösterilecek — küçük bir arayüz kalemi, K119 kalkınca sıraya girer (yazma gerektirmez, salt gösterim). ─── ⛔ **③ ÖNCÜLÜ ÖLÇÜMLE ÇÜRÜDÜ, İŞ AÇILMADI:** "maliyeti null olan stok (bugün 14 adet)" — **elde duran böyle stok YOK** (431 açık partinin **0**’ında maliyet boş). İstenen ayrım `envanter.ts`te **zaten var** ve çalışıyor: `bilinmeyenler` ayrı kovada, toplama girmiyor, `/envanter-degeri`de kendi kartı var. ⚠ **"14 adet" BENİM RAPORUMDAKİ BAŞKA BİR RAKAMDI** ve eksik yazmışım: maliyeti damgalanmamış **ÇIKIŞ** hareketleri — 6 hareket, **19 adet** (14 değil; `COUNT_CORRECTION −14` + 4 `ADJUSTMENT` + `COUNT_CORRECTION −1`). Bu envanter DEĞERİ sorunu değil, **gider tarafı boşluğu**: o mallar defterden maliyetleri giderleşmeden çıktı. → **K118 açıldı.** ─── ✅ **④** pano satırı yazıldı (ölçüm kayıtlarında). |
| **K120** | **TÜKETİM ATAMASINI YENİDEN KURMA — [AÇIK · ŞARTA BAĞLI]** | K91 kapandığında geriye kalan TEK şekil. Kapasiteyi sağlayan bir onarım, satır satır yeniden yönlendirme DEĞİL, **varyant bazında bütün tüketim atamasının yeniden kurulması** olur. ⛔ **BUGÜN AÇILMAZ:** defterin yarısını yeniden yazar; para tarafına dokunmasa da risk/fayda oranı bugünkü ihtiyaca göre kötü — 803 ileri-yiyen bağ geçmiş çıkışların ATFINI etkiliyor, toplamı ve NET-2yi değil. ⭐ **AÇILIŞ ŞARTI: DIŞ TALEP** — bir müşteri ya da muhasebeci **parti bazlı maliyet denetimi** istediğinde. O gün atıf denetlenebilir olmak zorunda kalır ve iş kendini haklı çıkarır. _(Şartsız bekleyen kalem, unutulmuş kalemdir.)_ |
| **K118** | **MALİYETİ DAMGALANMAMIŞ ÇIKIŞLAR — [ÖLÇÜLDÜ · ÖNCÜL ÇÜRÜDÜ · KAPALI]** | ⛔ **BENİM KURDUĞUM CÜMLE YANLIŞTI ve ölçümle düzeltildi.** _"O mallar defterden maliyetleri giderleşmeden çıktı"_ demiştim; ölçüldü (31.08.2026, canlı): damgasız **GİRİŞ 5 hareket · 19 adet**, damgasız **ÇIKIŞ 6 hareket · 19 adet**, **NET 0 — dört varyantın DÖRDÜNDE de.** Bunlar iptal/geri-alma ve sayım düzeltme çevrimlerinin **AYNA ÇİFTLERİ**; gider tarafında boşluk YOK. ─── **①** FIFO'dan türetme ÖLÇÜLDÜ (yazılmadı): 6 çıkışın **3'ü türetilebilir (₺7.902,45)**, 3'ü türetilemez (o an açık parti yok — sayım eksiği olduğu için mal zaten FIFO'da değil). ⛔ **AMA TÜRETİLENİ YAZMAK BOŞLUK KAPATMAZ, AÇAR:** o üçü de bir ayna çiftinin çıkış yarısı ve giriş yarısı da damgasız; yalnız birine damga yazmak ₺7.902'lik bir dengesizlik ÜRETİRDİ. ⚠ Ve ölçümün kendisi bir yalancı yeşil ürettiği için düzeltildi: `p.birimMaliyet === null` kontrolü `FifoPayi` şekli `{parti, adet}` olduğu için **`undefined`**e bakıyordu; üç satır `NaN` tutarla "✓ türetilebilir" işaretlendi. Çıkış TEK KAPIDAN (`Number.isFinite`) geçirildi. ─── ⛔ **② EKRAN YAZILMADI — GEREKÇESİYLE.** Boşluk olmadığı için kart hep boş görünürdü; K49: okunmayan satır kutunun TAMAMINA olan güveni eritir. Yerine **DEĞİŞMEZ** kuruldu: `npm run canli:damgasiz-denge` — damgasız hareketler varyant bazında net sıfır olmalı; **iki yön AYRI** sayılır (net&lt;0 giderleşmemiş mal çıkmış · net&gt;0 maliyeti bilinmeyen mal girmiş). Gerçek bir boşluk doğduğu gün konuşur. ─── ✅ **③ SINIF ALANI AÇILMADI, VARSAYILAN YAZILMADI** — kullanıcı şartına uyuldu; vergi sınıflaması kodda karar edilmedi. ─── **BEKÇİ:** `damgasiz-denge:dogrula` **26/26** (4 bölüm) · mutasyon **5/6 kırmızı**. ⚠ Karar canlı betiğin İÇİNDEYDİ ve sınanamıyordu (canlıda dengesizlik yok → `net<0` ve `net>0` dalları hiç çalışmıyor; iki mutasyon yeşil geçti). Saf gövdeye (`damgasiz-denge.ts`) taşınıp kurguyla sınandı. ⚠ Kalan 1 mutasyon **davranışsal olarak ETKİSİZ** (`Math.abs(0) === 0`) ve **beyan edildi** — sahte ölçüt yazılıp "6/6" denmedi. ⚠ **VE HARNESS'İN KENDİSİ İKİ KEZ KUSURLUYDU:** grep desenine Türkçe karakter yazılmıştı (kabuk kodlaması tutmadı) ve ayıraç desendeki iki dik çizgiyle çakıştı; ikisi de "bekçi çöktü" diye YANLIŞ rapor üretti — bekçi aslında yakalamıştı.
| **K109** | **PANEL GRAFİĞİNDE NOKTA TIKLANINCA RAKAM PENCERESİ · [AÇIK]** | 🕓 **[AÇILDI 31.08.2026]** Kullanıcı: _"buradaki noktalarda üzerine tıklandığında küçük bir pencerede rakamlar görünebilsin."_ Son 12 ay grafiğinde (NET-2 ve ciro çizgileri) nokta başına ay · ciro · NET-2 gösteren küçük bir pencere. ⚠ **ÖLÇÜLECEK:** grafik bugün hangi gövdeden çiziliyor ve dokunma hedefi telefonda 44 px'e çıkarılabiliyor mu (İlke #8) — nokta yarıçapı bugün küçük. Kod yazılmadı.
| **K107** | **MALİYET YÖNTEMİ SEÇENEĞİ (FIFO ↔ hareketli ortalama) · [ERTELENDİ — açılış şartı: İKİNCİ FİRMA]** | 🕓 **[ÖLÇÜLDÜ 31.08.2026, KOD YAZILMADI]** ⚠ **Kimlik notu: kullanıcı bunu `K99` diye açtı ama o kod ALINMIŞTI** (iki farklı "tam yetkili" ölçütü, 30.08) — K107 olarak açıldı. **⛔ KARAR: PAKET 2·3·4 BUGÜN AÇILMIYOR.** _Gerekçe (kullanıcı, 31.08.2026):_ ① canlıda **tek firma** var ve FIFO kullanıyor — ortalama yöntemini bugün kimse kullanmayacak, yani **tüketicisi doğmadan yapı açmak** olurdu (K52 sınıfı: yazıcısı olmayan alan, boş bir vaat); ② `Company` **hiçbir veriye bağlı DEĞİL** (ölçüldü: ilişkileri yalnız `uyelikler` · `auditLogs` · `talepler`), yani _"firma bazında yöntem"_ bugün **"tek firma"** demek — çok-firma katmanı olmadan seçenek **fiilen yok**. ⏭ **AÇILIŞ ŞARTI: ikinci firma kaydı.** O gün paketler **1→2→3→4 sırayla** açılır. 📏 **FİZİBİLİTE ÖLÇÜMÜ (salt okuma, canlı):** **① Dağınıklık YOK — hüküm bu.** Maliyete dokunan 68 dosya var ama _"maliyet nedir"_ sorusunu cevaplayan **TEK gövde**: `src/lib/stok.ts` (`acikPartiler` · `acikPartilerToplu` · `fifoDagit` · `partileriSinirla`). Kalanlar ya onu **çağırıyor** (15 dosya) ya **damgayı okuyor** (32 dosya). Kullanıcının ölçütüyle _"1'e yakınsa iş orta"_ — **1'dir**, yani asıl kod işi görece küçük. **② ASIL MALİYET BEKÇİDE:** `fifo:dogrula` **23** · `parti-bagi:dogrula` **14** · `fifo-sinir:dogrula` **19** ölçüt ortalama yönteminde **tamamen anlamsızlaşır** (toplam **56**); ayrıca 8 bekçide **63 ölçüt** daha parti/FIFO/maliyet/damga değiyor → **~119 ölçüt etkilenir.** ⭐ **VE BEKÇİ YÖNTEMİ KARARA BAĞLANDI (kullanıcı, 31.08):** 119 ölçütü **tek tek şartlandırmak DEĞİL**, bekçi turunu **İKİ KÜMEYE ayırmak** — FIFO bekçileri yalnız FIFO firmasında koşar. _(Öneri olarak kayıtta; o gün ölçülüp kesinleşir.)_ **③ HAREKET YAPISI — beklenenden İYİ:** `StockMovement.unitCostAmount` **zaten var ve zaten dolu** (şemadaki yorumu bile _"ileride stok değerlemesi için saklanır"_ diyor). Canlı ölçüm: 10.774 hareket · giriş 4694/**4689 damgalı** · çıkış 6080/**6074 damgalı**. Ortalama yönteminde `SALE_OUT` damgası hareket anındaki hareketli ortalamadan gelir — **damga için yeni alan GEREKMİYOR.** ⛔ **AMA `sourceMovementId` SORUN:** bugün çıkışların **6080/6080'i (%100)** partiye bağlı; ortalama yönteminde parti kavramı yok → alan boş kalır → `parti-bagi:dogrula` **her ortalama-firmada her harekette** kırmızı yanar. **④ ŞEMA:** merdiven inildi — damga için ① mevcut alan **yeterli** ✓; yöntem ayarı için ①✗ ②✗ (menuDuzeni menünündür, overload olur) ③✗ → **2 sütun/tablo**: `Company.maliyetYontemi` + dönem kaydı. **⑤ ÖNERİ: HAREKETLİ ortalama** — basit ortalama dönem sonu ister ve **üç şeyi birden kırar**: fiyat denemesi anlık maliyet istiyor · NET satış anında snapshot'lanıyor · dönem içinde her satış `NO_COST` damgalanırdı (anayasa: _"bilinmeyen sıfıra çevrilmez"_). Sistem her hareketi sıralı tuttuğu için hareketli ortalama **hesaplanabilir** (teyit edildi). **⑦ LOT TAKİBİ TANITIMDA VAAT EDİLEBİLİR ✅** — parti alanları `hareketId · occurredAt · girenAdet · kalanAdet · birimMaliyet · paraBirimi · locationId`; satış→parti sorgusu **%100 dolu**; parti kodu ürün kartında görünür (`ALM-HB-260821-13`, tedarikçi ve giriş tarihiyle). Tanıtım metni buna göre güçlendirildi (**raf** izlenebilirliği eklendi). ⛔ **LIFO KAPSAM DIŞI:** ölçülmedi, tartışılmadı, şemaya konmadı. _Gerekçe:_ VUK ve TMS 2'de **yasak**; sisteme koymak kullanılamayacak bir yöntemi taşımak ve **her bekçiye üçüncü bir şart** eklemek olurdu. |
| **K100** | **BARKOD BAŞTAKİ SIFIR — okutulan kod bulunamıyordu · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Halil `/yerlestir`de `0194644037598` okuttu, ekran _"Bu kod ne ürün ne raf olarak bulundu"_ dedi; baştaki sıfır ELLE silinince ürün çıktı. Bilgi sistemde VARDI — ekran susmuyor, **YANLIŞ CEVAP** veriyordu. ⭐ **TEŞHİS: UPC-A ↔ EAN-13.** UPC-A 12 hanedir, EAN-13 aynı kodun başına `0` konmuş hâli; okuyucu 13 hane döndürüyor, katalogda 12 hane yazılı. ⛔ **KURAL ÖLÇÜLMEDEN YAZILMADI** — soru _"kırpmak doğru mu"_ değil, **"kırpınca iki AYRI ürün aynı koda düşüyor mu"** idi (kodlar TAM eşleşmeyle aranıyor; yanlış eşleşme YANLIŞ ÜRÜNE yazar). `npm run canli:barkod-sifir` (salt okuma, n=1104): **12 hane 104 · 13 hane 925 · kural yüzünden çakışan anahtar 0 · zaten çakışan 0 · KURTARILAN okuma 104** (katalogun %9,4'ü) · gönderi numarası 12/13 hane **0** (o role hiç dokunmuyor). Beş kod rolünün beşinde de çakışma sıfır. ⚠ **BEYAN EDİLEN SINIR: yalnız 12↔13 ölçüldü.** Katalogdaki **3 adet 14 haneli (GTIN-14)** barkodun eşdeğerliği ÖLÇÜLMEDİ ve kural onlara DOKUNMUYOR; bir GTIN-14 okuması kaçarsa açılış şartı aynı ölçümü 14 hane için koşmaktır. ⚠ **VE ALTI KOPYA BULUNDU:** `/stok` · `/urunler` · `alim-arama` · `liste-suzgeci` · dışa aktarmada iki yer paylaşılan kuralı **kullanmıyordu** — yani _"düzelttim"_ demek o ekranlara ulaşmamak olurdu. Hepsi bağlandı, rol kümeleri ve `isActive` şartları DEĞİŞMEDİ. ⛔ **ÇARE DOSYA LİSTESİ DEĞİL DESEN YASAĞI:** çıplak `barcode: { contains: X }` yazılamaz, `X` `kodEsdegerleri(...)` dönüşünden gelmek zorunda (**532 dosya taranır, liste tutulmaz**) — yedinci ekran eklendiğinde de yakalanır. ⏭ **HALİL TESTİ:** `/yerlestir`de `0194644037598` okut → **Soundcore K20i Mor-A3994** gelmeli; `/stok` arama kutusuna aynı kodu yapıştır → ürün çıkmalı. |
| **K98** | **HATA EKRANI KİMİN HATASI OLDUĞUNU SÖYLEMİYORDU · [HALİL TESTİ: A GEÇTİ · B AÇIK]** | ⏳ **[YAZILDI + BEKÇİSİ KOŞTU 30.08.2026]** Barındırma kesintisinde Halil `A server error occurred. ERROR 800923320` gördü; ekran kimin hatası olduğunu söylemiyordu — operatör "ben mi bozdum, sistem mi çöktü" diye bilemeyince çalışmayı bırakıyor _(İlke #5)_. ⛔ **SEBEP YAZILAMAZDI:** hata sınırına düşen `Error` üretimde yalnız `digest` taşır, mesajı taşımaz — _"veritabanına bağlanılamıyor"_ yazmak sistemin bilmediği şey hakkında iddia kurmak olurdu. ⭐ **ÇARE: EKRAN SORAR.** `SELECT 1` sondası (`src/app/hata-sondasi.ts`, salt okuma) veritabanına ulaşılıp ulaşılamadığını ÖLÇER; ekran ölçtüğünü söyler. Dört hâl AYRI tutuldu ve üçü farklı işe yol açıyor: `VERITABANI_YOK` (sağlayıcıya bakılır) · `SUNUCUYA_ULASILAMADI` (beklenir) · `SUNUCU_HATASI` (kod iletilir) · `KONTROL_EDILIYOR`. ⚠ **SONDA YETKİ İSTEMİYOR VE BU BİLİNÇLİ:** 30.08'de düşen tam da **giriş ekranıydı** (korumalı rotalar 307, çizilen tek sayfa `/giris` 500). `yetkiIste` çağırsaydı veritabanı çöktüğünde sonda da çöker, yani tam gerektiği anda susardı. Sızdırdığı bilgi ÖLÇÜLDÜ: dönen tek şey `true`/`false`. Muafiyet `yetki-dogrula.ts`e **gerekçesiyle** beyan edildi. ⚠ **`global-error.tsx` KÖK YERLEŞİMİN YERİNE GEÇİYOR**, yani `NextIntlClientProvider` düşmüş oluyor — oraya konacak bir `useTranslations` tam da her şeyin yandığı anda hata ekranının KENDİSİNİ düşürürdü. Metin yine de koda gömülmedi: `lib/hata/metinler.ts` sözlükten doğrudan okuyor. ✅ **BEKÇİ: `hata:dogrula` · 60 ölçüt · 6 bölüm (tur 66 → 68 doğrulama: bekçi + mutasyon harness'i)** — §1–§3 saf gövdeleri ÇAĞIRIP değer sınıyor (desen aranmıyor), kaynak taraması yalnız çizim/sunucu eylemi için ve YORUMSUZ kodda, kullanım bloğuna daraltılmış; pencereler kapanış işaretiyle ÖLÇÜLÜYOR. Bölüm sayacı var _(K93 şablonu)_. ✅ **MUTASYON: `hata-mutasyon:kontrol` · 17/17 yakalandı** (− kaldıran 11 · + fazladan 6). En kritik ikisi: `useTranslations`ı global-error'a KOYAN mutasyon ve `if (!iptal) setSonda({durum:"CEVAPSIZ"})` koşulunu `if (false)` yapan mutasyon (desen dosyada kalıyor, dal hiç çizilmiyor — deponun en sık yalancı yeşili). ⚠ **VE HARNESS'İN KENDİSİ KUSURLU ÇIKTI:** devralınan kapı 2 (`diskten.includes(bul)`) **EKLEYEN** mutasyonlarda yanlış alarm veriyor — bir satırın ÜSTÜNE ekleyen mutasyonda eski satır zaten yerinde kalır. İki `FAZLADAN` mutasyonu bu yüzden "ölçülemedi" düştü. **Kolay çare onları SİLMEK olurdu, yani "yanlış yanma" yönünü tamamen korumasız bırakmak.** Kapı tam eşitliğe (`diskten !== mutant`) çevrildi ve **üç harness'in üçünde de** düzeltildi _(kararın kapsamı uygulandığı yerle sınırlı sayılmaz)_; öteki ikisinde bugün ısırmadığı ÖLÇÜLDÜ (21 ve 9 çiftin 0'ı ekleyen). ✅ **DENEME ROTASI AÇILDI (kullanıcı kararı 30.08.2026, (A) seçeneği):** `/sistem/hata-denemesi` — **K98 testi için açıldı, ÜRETİM ÖZELLİĞİ DEĞİL.** Menüye konmadı; adresi Halil test listesinde. Sayfa hiçbir şey yazmaz, yalnız hata atar; `SUNUCU_HATASI` yolu böylece gerçek cihazda görülebiliyor. ⛔ **KAPI: yalnız TAM YETKİLİ rol; başka rol 404 alır** — "yetkiniz yok" bile denmez, rotanın VARLIĞI sızmaz. Ölçüt **izin kümesi**, rol adı değil (`tamYetkiliMi`, saf gövde). ⚠ **VE TABAN ÖLÇÜLEREK SEÇİLDİ:** `TUM_IZINLER` denseydi canlıdaki **CEO** rolü kapıdan geçemez, Halil **404** alırdı — sağlayıcı izinleri (`saglayici: true`) firma rollerine otomatik dağıtılmıyor (`otomatikDagitilacak` onları eliyor), yani sonradan doğmuş bir sağlayıcı izni CEO'da olmayabilir. Taban `FIRMA_IZINLERI` seçildi: bekçinin ve seed'in tabanıyla AYNI. Bekçide bu senaryonun kendi ölçütü var ("sağlayıcı izni OLMAYAN tam yetkili rol de geçer — CEO vakası"). ✅ **BEKÇİ 60 → 71 ölçüt / 6 → 7 bölüm · MUTASYON 17 → 24 (15 kaldıran · 9 fazladan).** §7'nin yedi mutasyonu ayrı ayrı kırmızı yandı ve GÖRÜLDÜ: kapıyı SİLEN · kapı ile hatanın YER DEĞİŞTİRDİĞİ (ikisi de dosyada durur, varlık ölçütleri yeşil kalır — sırayı ölçen kontrol yakaladı) · ret dalını `if (false)` yapan · ölçütü `every → some` gevşeten · yetki tabanını BOŞALTAN · hatayı atmayan · sayfaya `prisma` sokan. ✅ **HALİL TESTİ KOŞTU 30.08.2026 — CANLI ADRES, GERÇEK CİHAZ.** `axc-seven.vercel.app/sistem/hata-denemesi`. **Masaüstü:** rota açıldı (CEO 404 almadı) · başlık _"Bu ekran çizilemedi"_ + turuncu üçgen · ölçülen durum **birebir** _"Veritabanı çalışıyor; hata bu ekranın kendisinde."_ · ne-yapmalı satırı birebir · `Hata kodu: 503434463` · **"Tekrar dene" → aynı ekran, AYNI kod** (digest hatadan türetiliyor; değişmemesi doğrusu — gerçek arızada değişmesi ya da ekranın açılması beklenirdi) · ham hata mesajı ekranda YOK. **Telefon:** giriş yapıldıktan sonra ekran düzgün çizildi, "Tekrar dene" çalıştı. ⚠ **VE RAPORUM DÜZELTİLDİ — DENEME ROTASI SAYFA SINIRINI SINIYOR, KÖK SINIRI DEĞİL.** Ekran görüntüsünde **sol menü duruyor**, yani devreye giren `src/app/error.tsx`; kök yerleşim ayakta. Oysa 30.08 vakası tam da kök yerleşimin düşmesiydi (yerleşim oturum için veritabanına gidiyor, düşüyor, `/giris` 500 veriyor) — yani `global-error.tsx` **hâlâ gerçek cihazda görülmedi.** Dünkü rapor "SUNUCU_HATASI yolu sınandı" diyordu; doğrusu **"sayfa sınırındaki SUNUCU_HATASI yolu"**. ✅ **B4 GEÇTİ — VE İKİNCİ KAPIYI GÖSTERDİ.** Telefondan oturumsuz girilince **giriş ekranı** çıktı, 404 değil: istek `src/proxy.ts`te (Next 16'da `middleware.ts`in yerine geçen dosya) durdu, sayfa hiç koşmadı. Kapı iki katmanlı ve **ikisi ayrı ayrı sınanır**: ① oturum yok → `/giris` (proxy, varsayılan KAPALI) · ② oturum var + izin eksik → **404** (`sayfaTamYetki`). ⏭ **KAPANMADI — DÖRT YOL AÇIK:** ① **B testi** (kısıtlı ROL → 404) — Operasyon rolünde kullanıcı gerekiyor, ikinci katman hâlâ gerçek cihazda sınanmadı · ② `global-error.tsx` kök sınırı · ③ `VERITABANI_YOK` · ④ `SUNUCUYA_ULASILAMADI`. Son üçü emirle tetiklenemiyor; **gerçek kesintide doğrulanacak**. Tetiklenemeyen yolu "geçti" saymak testi değil raporu düzeltmek olurdu. ⏭ **KONTROLLÜ TETİK YOLU AÇILSIN MI (kök sınır için) — KARAR AÇIK:** anayasa _"ekran tetiklenemiyorsa tetikleyecek yol açılır"_ diyor, ama bunun bedeli **kök yerleşime dokunmak**: kapı yanlış kurulursa siteyi düşürür. Ayrı paket, ayrı onay; bugün açılmadı. ⚠ _(Kimlik notu: K97 kullanılmadı — kod dosyalarındaki yorumlar zaten K98 diyor, gap kasıtlı.)_ |
| **K52** | **`SaleItem.commissionTarifeId` — yazıcısı YOK, şema taşımadığı bilgiyi vaat ediyor · [AÇIK — ŞARTLI]** | 🕓 **[AÇILDI 25.08.2026, ÖLÇÜLDÜ]** Şema diyor ki _"bu tarifeden oran snapshot'lamış satış kalemleri"_; **uygulamada sıfır atama var** ve canlıda **0/140 kalem** dolu — kapsanan pencerede duran 31 kalemde de boş. Yani sistem, yaptığını söylediği şeyi hiç yapmıyor. ⚠ **BUGÜN ZARARSIZ ve bu ölçüldü:** oranın kendisi `SaleItem.commissionRate`'te satış anında DONUYOR, doğruluk oradan geliyor; kayıp yalnız **KÖKEN İZİ** — bir oranın hangi tarife penceresinden geldiği. Tarife üzerine yazılabildiği için (aynı pencere ikinci kez yüklenirse kalemler silinip yeniden kuruluyor) köken izi bugün zaten kırılgan. ⚠ **AÇILIŞ ŞARTI:** bir oran itirazı ya da denetim, _"bu oran nereden geldi"_ sorusunu gerçekten sorduğunda. Bugün o soruyu soran yok; olmayan ihtiyaca sütun doldurulmaz. ⚠ **VE ÜÇÜNCÜ SEÇENEK YOK:** ya bağlanır ya kaldırılır — _"dursun, ileride lazım olur"_ bir karar değil, kararın ertelenmesidir. Alan durduğu **her ay yanıltıcılığı artar**: onu boş bırakan gerekçeyi hatırlayan kişi sayısı azalır. Anayasaya madde olarak girdi. _(Kardeşi: K31'de bulunan üç ölü sütun — orada da şema bir şey vaat ediyordu, kod tutmuyordu.)_ |
| **K50** | **RAF MOTORU — 🟡 KİLİT KALKTI, SIRA BEKLİYOR (üç komut birleşti)** | 📦 **ÜÇ KOMUT TEK KALEM.** 25.08'de sırayla geldi: ① _barkodlu raf sistemi_ (`K42-RAF` adıyla — çakışma, K50'ye alındı) ② _raf motoru: kurulum ekranı + esneklik + toplu taşıma_ ③ iki ek: _barkod üretimi sistemin içinde_ ve _etikette barkod + karekod birlikte_. İkinci komut birinciyi **kapsıyor ve düzeltiyor**, o yüzden ayrı kalem açılmadı.  ⚠ **ASIL DÜZELTME — DEPO DÜZENİ ARTIK VERİ, ŞABLON DEĞİL.** İlk komut Halil'den üç sayı istiyordu (koridor · ünite · göz). İkinci komut bunu iptal etti: _"depo düzeni firmadan firmaya değişir; kanal kesinti kuralları nasıl veri olduysa depo düzeni de VERİDİR — firma deposunu kendisi çizer."_ **Yani Halil'e soru sorulmuyor, ekran veriliyor** (`/ayarlar/depo`). Bu, benim _"üç sayıyı bekliyorum"_ dediğim engeli ortadan kaldırdı.  **KAPSAM — yedi başlık:** **①** `/ayarlar/depo`: bölüm ekle (ad serbest, KISALTMASI kurallı — büyük harf/rakam, boşluksuz, Türkçe karaktersiz, barkod-güvenli; ad ↔ kısaltma AYRI alanlar) · bölüme ünite, üniteye göz sayısı (bölüm bölüm farklı olabilir, ünite bazında istisna da) · **göz numarası YERDEN YUKARI, SABİT KURAL — ayar değil**, gerekçesi ekranda yazar (üste kat eklenince etiket sökülmez) · **ÖNİZLEME** (üretilecek kodlar + toplam) · onaysız tek raf yazılmaz. **②** **ETİKET SİSTEMİN İÇİNDE ÜRETİLİR** — SVG + kütüphane, **dış servis/API çağrısı YOK**. Her etikette **üç gösterim, TEK değer**: sol `Code128` (el terminali) · sağ `QR` (telefon) · alt okunabilir yazı (`RAF-A1-3`). ⚠ **QR'a zengin veri KONMAZ** (adres/URL/liste yasak) — iki kod ayrışırsa aynı etiket iki kimlik taşır. A4 toplu basım + **tek raf yeniden basımı**; yeniden basım AYNI kodu çizer (K35 kuralı). Basım izi `AuditLog`a. **③** `/yerlestir` okut-koy: raf okut → ürün okut → onay. Ardışık yerleştirme (tek raf, çok ürün). Konum GÜNCELLEMEDİR; eski→yeni `AuditLog`a. **④** `/paketle` konum doğrulaması (okut-al): _"beklenen rafta mıydı"_ → `AuditLog`, **NÖTR, akış DURMAZ**. Ekranda raf zaten var (K46), değişiklik yalnız iz. **⑤** `/okut` raf modu: `RAF-` önekli kod → o rafa kayıtlı ürün listesi. Başlık **"kayıt"**, "envanter" DEĞİL — adet iddiası yok. **⑥** **TOPLU TAŞIMA:** kaynak raf okut → hedef raf okut → liste + onay → tek harekette. **TEK `AuditLog` kaydı** (ürün başına satır değil), kısmî taşıma işaret kutularıyla. **⑦** **GÖÇ:** mevcut **41 raf** ilk açılışta gösterilir; düzen çizilince göç tablosu (eski ad → yeni kod) **önerilir**. ⚠ **ONAYSIZ TEK AD DEĞİŞMEZ.** 1090 ürünün raf bağı korunur, önce/sonra sayım raporlanır.  ⚠ **ESNEKLİK SINIRLARI — ekranda ve el kitabında da anlatılır:** raf kodu **KİMLİKTİR, KOORDİNAT DEĞİL** (ünite fiziksel taşınırsa sistemde hiçbir şey değişmez; _"rafı taşıdım"_ işlemi YOKTUR — eksiklik değil tasarım) · kapasite artırma = **ekleme**, mevcut kodlara dokunmaz · silme yalnız raf BOŞSA · **kod yeniden düzenleme YOK** (basılı etiket yalanlar, konum geçmişi kopar).  ✅ **İSİMLENDİRME ÇELİŞKİSİ KARARA BAĞLANDI 25.08.2026 — seçenek (a):** elle değişiklik **YALNIZ bölüm adı/kısaltmasında** ("Salon" → `SLN`; kısaltma kurallı: büyük harf/rakam, boşluksuz, TR karaktersiz). **Üretilen raf kodu ŞABLONA KİLİTLİ** (`RAF-<kısaltma><ünite>-<göz>`), elle düzenlenemez — içerikten ad türetme yasağı ve bekçileri aynen geçerli. ⚠ **KISALTMA SONRADAN DEĞİŞMEZ** (kod kalıcılığı): bölümün GÖRÜNEN adı değişebilir, kısaltması değişemez ve **ekran bunu baştan söyler**. _Gerekçe: kısaltma basılı etiketin içinde; değişirse etiket yalan söyler._  **SINIR (V1):** yalnız IZGARA düzeni (bölüm→ünite→göz). Serbest biçim (palet alanı, askı, tipli konum) **V2** — ihtiyaç ölçülünce. Olmayan ihtiyaca genel çözüm yazılmaz.  🧪 **BEKÇİ + MUTASYON (asgari set, komuttan):** şablon dışı kod üretimi · içerik-adlı raf · dolu raf silme · **göz numarasını üstten saydıran AYAR eklenmesi** (sabit kuralın kendisi sınanır) · kod yeniden adlandırma yolu · onaysız toplu taşıma · göç/taşımada ürün bağı kaybı (önce/sonra sayım) · **etiket sayfasında dış adres çağrısı** · **QR içeriği ≠ barkod içeriği**. Her mutasyonun UYGULANDIĞI teyit edilir.  ✅ **KOŞUM KİLİDİ AÇILDI** — API öncesi kapanış **5/5** kapandı (25.08). Bugünkü plan _"bugün başla"_ diyor. ⛔ **AMA ADIM (a) BUGÜN KOŞULAMIYOR:** iki ön ölçüm (raf doluluk + 41 adın biçimi) **canlı veritabanı gerektiriyor** ve yerel betikle bugün **altı kez** bağlanılamadı (`pool timeout`, `active=0` — tek bağlantı bile kurulamıyor). Canlı SİTE çalışıyor, yani veritabanı ayakta; tıkanan bizim yerel yolumuz. **Ölçüm yapılmadan göç tablosu üretilmez.** ─── ⑨ **İKİ RAF DESENİ BİRBİRİNİ TANIMIYORDU — [KAPANDI 01.09.2026]** ⛔ Kullanıcı _"depo düzeninin çalışma prensiplerini bilmediğimiz için çizmedik, kılavuz gerekiyor"_ dedi. Kılavuz yazılmadan ÖNCE ölçüldü ve kılavuzun okuyucuyu **duvara götüreceği** anlaşıldı: `kodSablonaUyuyorMu("RAF-SLN1-2")` **true**, `rafKoduGecerliMi("RAF-SLN1-2")` **FALSE**. Yani `/ayarlar/depo` bir raf üretir üretmez `/ayarlar/konumlar` onu **"biçimsiz"** diye işaretleyecek ve düzenleme formu kaydetmeyi reddedecekti — sadece ADINI değiştirmek isteyen biri duvara çarpardı. ⭐ İki biçim de geçerli oldu; **eski desen kaldırılmadı** (canlıdaki 43 rafın hepsi ona uyuyor ve göç onaylanana kadar yaşayacak), serbest metin hâlâ reddediliyor. **Bekçi `depo:dogrula` 196 → 209 · mutasyon 3/3 KIRMIZI** (şablon kodu reddediliyor · eski kodlar reddediliyor · kapı tamamen açıldı = yanlış yanma). ⏭ **KILAVUZ TESLİM EDİLDİ** — kod anatomisi, üç kavram, değişmeyen beş kural, Türkçe harf tuzağı, bugünkü 43 rafın ölçülmüş tablosu, dört adımlık kurulum, göç, geri alınabilirlik tablosu ve iki bilinen eksik. ⚠ **BİLİNEN EKSİK: etiket basımının izi tutulmuyor** — plan "basım izi kaydedilir" diyordu, kodda yok. | |
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
| **K34** | **Sevkiyat doğrulaması — KİLİTLİ** | 📦 Depoda paketlerken barkod okutulur; sistem **kargoya verilmemiş** siparişler arasında arar, bulamazsa **uyarır**. Depo kuralı geçerli: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_ **İş değeri:** yanlış ürün göndermenin maliyeti = iade + iki kargo + ceza + itibar; entegratörler bunu ayrı paket olarak satıyor, bizde bu kontrol hiç yok. ⛔ **AÇILIŞ ŞARTI: AĞUSTOS DEFTERİNİN KAPANMASI.** Kontrol "kargoya verilmemiş siparişler" kümesinde arıyor ve o kümenin **%73,4'ü sistemde yok** (TY `01.08–20.08`: kanal 143, bizde 38 — araç `canli:eksik-siparis`; HB'de oran **%88,2**). Doğru ürün paketlenirken sistem "bulamadım" diyecek; sebep yanlış ürün değil, **satışın hiç girilmemiş olması.** Uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı her seferinde elle onaylar ve iki hafta içinde **uyarıyı okumadan tıklamayı öğrenir** — o noktada mekanizma yanmıştır, gerçek bir yanlış üründe de aynı tıkla geçilir. **YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR.** ⛔ **ÖLÇÜLMEMİŞ DÖRT ŞEY** (kural yazılmayacak): ① barkod hangi kayda bakacak — EAN mi, Firma SKU mu, Kanal SKU mu? Halil'den depo etiketi fotoğrafı bekleniyor. ⚠ **Tek alana bağlanmayacak:** üçünde de aransın ve **hangisinde bulduğunu SÖYLESİN** — Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ② çok satırlı siparişte "bu kalemi okuttum" izi yok (bugün yalnız `shippedAt: null`). ③ elle onayın izi nereye — `AuditLog` mu, satışa alan mı? Şema merdiveni: önce ucuzu ölçülür. ④ defter eksik (yukarıdaki şart). |
| **K35** | **Firma etiketi basımı — KİLİTLİ** | 🏷 Firma SKU barkoda çevrilir, etiket basılır; ürünün üstünde İKİ barkod olur (EAN üreticinin, Firma SKU bizim). Sistemde bugün barkod **ÜRETİMİ/BASIMI YOK** — yalnız okuma var. ⛔ **AÇILIŞ ŞARTI: yazıcı ve etiket kararı.** Etiket boyutu bilinmeden basım ekranı tasarlamak, ölçmeden kural yazmaktır. Ölçülecek: boyut · yazıcı türü (termal/lazer) · SKU'ların Code128 uygunluğu. ⚠ **GEREKÇE DÜZELTİLDİ 23.08.2026 — ÖLÇÜMLE.** Mimarın gerekçesi şuydu: _"EAN ürünü tanımlar, hangi MALI elde tuttuğunu tanımlamaz; Firma SKU o boşluğu kapatır."_ **Şemada karşılığı yok:** `sku` · `barcode` · `companySku` **üçü de varyant başına ve `@unique`**; FIFO partisi `StockMovement`ta ve **hiçbir etiket partiyi tanımlamıyor** — motor en eski açık partiyi kendi seçiyor. Firma SKU okutmak da "bu mal" demez. ⚠ **İKİNCİ GEREKÇE DE ÖLÇÜMLE DÜŞTÜ:** "EAN'ı olmayan ürün" — canlıda **1086 aktif varyantın 1085'inde EAN var** (%99,9); tek istisnada stok yok. Firma SKU'su boş olan: **0**. ✅ **AYAKTA KALAN TEK GEREKÇE:** kullanıcı beyanı — _"istisna birkaç üründe EAN farklı olabilir"_ (pakettekiyle kayıtlı olan tutmuyor). **Bu bizim defterimizden ölçülemez** çünkü fark ancak okutunca görünür. ⭐ **K34a tam bunu ölçüyor** — bir hafta paketlerken kaç EAN tutmadığı sayılırsa K35'in iş değeri rakama döner. Yani K35'in gerekçesi K34a'nın çıktısıdır. ⚠ **ÜÇ ALANDA ARANACAK** (bu kural ayakta): EAN · Firma SKU · Kanal SKU — ve **hangisinde bulduğu SÖYLENECEK**. Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ⚠ **YENİ RİSK SINIFI — VE BU GEREKÇE SAĞLAM:** bugüne kadar bütün kimlikler DIŞARIDAN geldi (EAN üreticiden, Kanal SKU pazaryerinden). Basımla birlikte **ilk kez kimlik ÜRETEN taraf biz oluyoruz.** Yanlış basılmış etiket, yanlış girilmiş satırdan KALICIDIR: satır düzeltilir, etiket kutunun üstünde depoda durur ve altı ay sonra okutulur. Kapsama baştan girenler: ① **basılan her etiketin izi** (hangi SKU · ne zaman · kaç adet) — iki kez basılmış kod ya da hiç basılmamış SKU ancak bu izle bulunur; ② **yeniden basım TEKİL** — aynı SKU'nun ikinci etiketi AYNI kodu taşır, yeni kod üretmez. Bu koda gömülecek kural değil, açıkça verilmiş karardır. |
| **K36a** | **Değişim MAL maliyeti satışın NET'ine — ✅ [KOŞTU] 23.08.2026** | 💱 **Mimar kararı 23.08.2026:** değişimde giden ürünün **FIFO maliyeti + kargosu** o **SATIŞIN** NET'ine yazılır; iadenin NET'inde bırakılmaz. _Gerekçe: değişim o satışı kurtarmanın bedelidir; ayrı cebe konursa satış kârlı görünür, değildir._ ⚠ **HURDADAN FARKI AÇIKÇA KONDU:** hurdada satış ÖLDÜ (dönem kalemi), değişimde satış YAŞIYOR (satışın maliyeti). ⚠ **BUGÜN BÖYLE DEĞİL — ÖLÇÜLDÜ:** `EXCHANGE_OUT` hareketi yalnız `returnItemId` taşıyor ve para `iade.ts`te _"Değişim: yerine giden ürünün maliyeti"_ satırıyla **iadenin** `net2Amount`'ına yazılıyor. Satışın NET'i yalnız `saleItemId` taşıyan hareketlerden hesaplanıyor (`kalemMaliyeti`, tip bakmaz). ⚠ **İKİ YOL BİRDEN değişecek** (form yolu + yeni düğme) yoksa aynı fiziksel olay iki farklı cebe yazılır ve üç ay sonra karşılaştırılamaz. ⚠ **ÇİFT SAYIM TUZAĞI:** harekete `saleItemId` eklenirse `degisimMaliyeti` satırı iadeden KALDIRILMALI — yoksa aynı lira iki kez. 📌 Kapsam: canlıda bugün **1** `EXCHANGE_OUT` hareketi var; değişen kural mevcut kâr damgalarını bayatlatır, yeniden hesap gerekir. |
| **K42** | **Fire zararı düzeltme trafiğini kayıp sayıyor — [ÖLÇÜLDÜ, KARAR BEKLİYOR]** | 🔥 **MERDİVEN İNİLDİ 24.08.2026 ve UCUZ ÇÖZÜM ÇÜRÜDÜ.** **ÖLÇÜM:** ağustos fire zararı ₺15.951,36 · kazanç ₺13.475,20 · net **−2.476**. Eşleşen çift **4 tane, ₺13.475 — zararın %84,5'i**. Gerçek kayıp yalnız iki harekette: `Fire` ₺650 + `Hasar/kırılma` ₺1.799 ≈ **₺2.449**. **BASAMAK 1 DENENDİ:** elle düzeltme neden seçmeyi ZORUNLU tutuyor (`duzeltme-actions.ts`), sistem yazıcıları (`iptal-geri-alma`, `satis-duzenleme`) hiç neden vermiyor → _"fire zararı = BEYAN EDİLMİŞ kayıp"_ ölçütü mevcut alanla (`adjustmentReasonId`) kurulabiliyor, şema açılmıyor. ⚠ **AMA ÖLÇÜM ONU ÇÜRÜTTÜ:** süzgeçle zarar 9.926 · kazanç 11.076 · net **+1.150** — görünen net gerçeğe (−2.449) YAKLAŞMIYOR, UZAKLAŞIYOR. Sebep: sistem aynaları ASİMETRİK (zarar 6.025 ↔ kazanç 2.399), çünkü iptalin `+` tarafı `SALE_CANCEL_IN` fire süzgecinde HİÇ YOK, geri almanın `−` tarafı VAR. **Tek yönlü sızıntı.** ⚠ **VE ASIL GÜRÜLTÜ KALIYOR:** kalan ₺9.926 zararın ₺7.198'i KULLANICI GİRDİSİ bir çift (`OYU-LG-598P-01`: _"mükerrer kayıt"_ ↔ _"Sayım farkı"_) ve **hiçbir alan bu ikisini "aynı olay" diye işaretlemiyor.** Veriden ayırt edilemez. 💡 **İKİ AYRI İŞ, İKİ AYRI KARAR:** ① **tek yönlü sızıntı** — `SALE_CANCEL_IN`in `+` tarafı sayılmadığı hâlde geri almanın `−` tarafı sayılıyor; bu bir DOĞRULUK hatası, ayrı düzeltilebilir. ② **düzeltme mi kayıp mı** — nedenlere bir ayrım gerekir (`StockAdjustmentReason`e bayrak = **şema, basamak 4**) ya da rakam olduğu gibi bırakılıp ekranda kayıp/kazanç/net ÜÇÜ BİRDEN okunur yapılır. ⛔ **HİÇBİRİ UYGULANMADI** — ölçüm, ucuz çözümün işe yaramadığını gösterdi; yarım düzeltme görünen rakamı daha yanlış yapardı. |
| **K43** | **Yedi liste ekranı sütun tavanının üstünde — [AÇIK]** | 📐 **ÖLÇÜLDÜ 23.08.2026.** `yerlesim:dogrula` liste tablolarında **7 sütun tavanı** tutuyor ama ölçütü **elle tutulan üç dosyaydı**; `src/app` altında `<TableHeader>` taşıyan **20 sayfa** var ve **YEDİSİ tavanın üstünde**: `iadeler` **9** · `stok` · `kartlar` · `giderler` · `envanter-degeri` · `ayarlar/kanallar` · `alimlar/[id]` **8**. ⚠ **HÜKÜM DEĞİL, SORU.** Tavan (7) o üç ekranın İÇERİK genişliğine göre ölçüldü (_"~1045px'e sığıyor, 8. sütun taşırıyor"_). Sütunları dar olan bir ekran (rozet · ikon · kısa sayı) sekizle de sığabilir. Gerçek ölçüt piksel genişliği ve o **tarayıcı ister** — projede otomasyon yok (karar 08.08.2026). Yani sayı bir **VEKİLDİR** ve vekil, ölçüldüğü kümenin dışına uygulanamaz. ⚠ **BU YÜZDEN ÖLÇÜT KÖRLEMESİNE TERSİNE ÇEVRİLMEDİ:** hepsine uygulamak yedi ekranı birden **uydurma kırmızıyla** yakardı. `/kanal-sku` listeye eklendi (aynı şekilde metin ağırlıklı, tam 7 sütun). ⛔ ✅ **BEKÇİ TARAFI KAPANDI 01.09.2026 — LİSTE KALKTI, BEYAN GELDİ.** Ölçüt **dört dosyayı** sayıyordu; depoda `<TableHeader>` taşıyan **24 dosya** var, yani bekçi koruduğunu sandığı şeyin altıda birini ölçüyordu ve sekizinci ekran yarın eklenseydi sessizce yeşil kalırdı. Liste kaldırıldı: `src/app` **taranıyor**, tavanı aşan ekran kendi dosyasında `SUTUN TAVANI ISTISNASI: <n> — <gerekçe>` **beyan ediyor**, beyansız aşım **kırmızı**, beyan **sayıyla** okunuyor (8 beyan edip 9'a çıkan ekran yine kırmızı). Yedi ekran her koşumda **tutanak** olarak basılıyor. 🧪 mutasyon 5/5 kırmızı. ⛔ **AÇILIŞ ŞARTI DEĞİŞMEDİ — PİKSEL ÖLÇÜMÜ SENDE: gerçek cihazda bakış.** Halil dar viewport'ta yedi ekranı açıp yatay kaydırma çubuğu çıkıyor mu diye bakar; çıkanlar `iki-satir.tsx` ile daraltılır, çıkmayanlar için tavan o ekran sınıfına göre yeniden ölçülür. |
| **K36b** | **Değişim kargosu — ✅ [KOŞTU] 24.08.2026, ŞEMA GEREKMEDİ** | 🚚 **KAPANDI.** Kalem _"kargo yanlış cebe yazılıyor"_ diye açılmıştı; ölçüm gösterdi ki kargo **hiçbir cebe yazılamıyordu** — alan (`Return.reshipCargoAmount`) ŞEMADA VARDI ama **iki kapıyla** birden kapalıydı: ① blok yalnız `returnType === DISPUTED` iken çiziliyordu (o iade NORMAL'di), ② input `disputedReshipPaidBySeller` false ise DISABLED'dı (TY'de false). ⚠ **BAYRAK YANLIŞ DEĞİL, KAPSAMININ DIŞINA UYGULANIYORDU** — şemadaki tanımı _"itirazlı iadede AYNI ürün müşteriye geri gönderilirken"_; değişimde giden YENİ bir üründür ve şema zaten _"değişimde her zaman satıcıda"_ diyordu. Ölçüt artık **"müşteriye mal çıkıyor mu"**; politika **kilit değil ipucu**. ✅ **VAKA KAPATILDI:** `11473322212`ye kanal belgesinden `₺174,32` yazıldı (`Değişim Gönderisi · 8 desi · ARAS`), iade NET-1 `1.698,00 → 1.523,68` · NET-2 `1.714,83 → 1.569,57`. Betik idempotent, iz `AuditLog`ta belgesiyle. ⚠ **ÇİFT SAYIM VE SIFIR SAYIM BİRLİKTE SINANDI:** `141,42 + 174,32 = 315,74` = TY panelindeki Kargo sütunu birebir; korkulan çift sayım değil, **ters yüzü** gerçekleşmişti — bacak hiç yazılmamıştı. 🧪 `rma:dogrula` 495→507 · 7 mutasyon, 7'si yakalandı. ⏭ **AÇIK KALAN (K36b'nin asıl sorusu):** kargo hâlâ İADENİN NET'inde; K36a kuralına göre SATIŞIN NET'ine mi gitmeli? Bu bir **atıf** sorusu, "kaydedilebiliyor mu" sorusu değil — ayrı karar. |
| **K37** | **Değişim ürünü gönderildi düğmesi — ✅ [KOŞTU] 23.08.2026** | 🔘 Bildirim satırında düğme: `EXCHANGE_OUT` hareketini **FIFO'dan doğrudan** yazar, iade formuna hiç uğramaz. ⚠ **NİYE GEREKLİ — ÖLÇÜLDÜ:** `11473322212` satışının 1 adedi zaten iade edilmiş, form _"Tamamı iade edildi"_ diyerek kapanıyor; oysa gönderilen değişim ürünü bir **iade değil bir ÇIKIŞ**. Kalan iade hakkı, iadeyle ilgisi olmayan bir stok çıkışını engelliyor. Hareket **bağlı** doğar (satış + bildirim) ve maliyeti K36 kuralıyla satışın NET'ine gider. 📌 İlk vaka: `11473322212`'nin açık `ITIRAZ_KABUL` bildirimi, 1 × `axcali1610` → stok **12 → 11** beklenir. |
| **K38** | **Hurda zararı — ✅ [KOŞTU] 23.08.2026** | 🗑 **Halil hükmü 23.08.2026:** `11473322212`'den dönen kırık `axcali1672` **çöp** — satılabilir stoktan düşülür. ⚠ **VAKA NASIL DOĞDU:** iade işlenirken form `1 sağlam` diye ön-dolu geliyordu (o hata bugün düzeltildi) ve kırık mal **stoğa girdi**: `RETURN_IN +1 × ₺1799`, ledger stoğu **1**. ✅ **KÂR TARAFI ÖLÇÜLDÜ — CEVAP (a)'ya YAKIN:** rapor **zaten** _fire zararı_ tutuyor (`ADJUSTMENT`+`COUNT_CORRECTION`, **FIFO maliyetiyle**, kayıp ve kazanç AYRI, **dönem** tarafında — satışın NET'ine değil). Yani istenen tasarımın çoğu kurulu. ⚠ **AMA BİR İSTİSNASI TAM BURAYA ÇARPIYOR:** `returnItemId` dolu hareketler fire toplamından **bilerek dışlanıyor** (çift sayım koruması; canlıda 08.2026'da net etki −1.327,99 ölçülmüş). Hurdayı iadeye bağlasaydık **hiçbir yere** yazılmayacaktı. **KARAR (mimar, 23.08):** hareket `returnItemId`**siz** yazılır → fire zararına girer; bağ **`AuditLog`'da YAPILANDIRILMIŞ (JSON)** durur: satış no + bildirim id + _"Halil hükmü 23.08: çöp"_. Serbest metin `note` tek başına yetmez — üç ay sonra aranamaz. 📌 Neden zaten var: _"Hasar / kırılma"_ (`ADJUSTMENT`, `EKSI`). Şema açılmıyor. Beklenen: `axcali1672` **1 → 0**. |
| **K39** | **Kapanmış bildirim iptal edilebilsin — ✅ [KOŞTU] 24.08.2026** | ✅ **TESLİM.** `KAPANDI → IPTAL` geçişi açıldı; ekranda gerekçe zorunlu diyalog (`en az 10 karakter`), iz `AuditLog`ta **önceki durum + gerekçe + kim** ile. ⚠ **SESSİZ YAN ETKİ YAKALANDI VE KAPATILDI:** `kapaliMi` eskiden _"ileri geçişi kalmamış"_ diye TÜRETİLİYORDU ve bu tesadüfen doğruydu. `KAPANDI`ya çıkış eklenince türetme bozulacaktı — `kapaliMi("KAPANDI")` **false** dönerdi ve iki şey birden sessizce yanlış çalışırdı: ① panel çanı kapanmış HER bildirimi "bekleyen iş" sayardı, ② `durumDegistir`in kapalı-bildirim kapısı açılırdı. Ölçüt artık AÇIKÇA yazılı (`UC_DURUMLAR`): kapalı olmak, çıkışı olmamak değildir. ⚠ **ÖLÇÜT "HANGİ VERİYİ BOZAR":** `returnId` doluysa arkasında işlenmiş iade var — iptal onu SAHİPSİZ bırakırdı (iade yaşar, doğuran bildirim "hiç olmadı" der). Bu kayıtlarda düğme **hiç çizilmiyor** ve sunucu ayrıca reddediyor. ⚠ **"TEST" İŞARETİ KONMADI** (mimar kararı): ikinci doğruluk kanalı yok, durum tek dil. ⚠ **İPTAL PARAYA VE STOĞA DOKUNMAZ** — bekçi bunu koşulur hâlde tutuyor (`stockMovement` ve `satisKarTazele` yasak). 📌 **SAYIM AŞILDI:** pano _"3 aday"_ diyordu; o rakam yalnız `11473322212`nin bildirimlerini sayıyordu. **Tüm defterde ölçüm (`npm run canli:k39-adaylar`): 19 bildirim · 11 KAPANDI · 8 IPTAL · aday 8 · korunan 3** (`11502693455` · `11471381662` · `11473322212`). Geçerli olan **8**. ⚠ Adaylardan biri (`11504122276`, 14.08 10:59) **1 adet ayrılmış** taşıyor — iptal ayırmayı düşürür, bakılsın. 🧪 `rma:dogrula` 464→495 · **22 mutasyon, 22'si de yakalandı.** |
| **K40** | **Hasarlı iadede tazmin sorusu geç kalıyor — ⏸ YARIN (iade paketi)** | ⏱ Tazmin sorusu iade **İŞLENMEDEN** sorulmalı; işlendikten sonra geç kalınıyor — bu vakada kaçtı (`11473322212`, kırık `axcali1672` stoğa girdi, tazmin hiç açılmadı). K31 ekranına ileride hatırlatma satırı olabilir. ⛔ **BUGÜN DEĞİL** — mimar açıkça iş açmadı, kalem yalnız kaydedildi ki unutulmasın. |

---

## 📌 Ölçüm kayıtları — iş değil, gerekçe

Bunlar kapanmış ölçümlerin **bugün geçerli** özetleri; ayrıntı arşivde.

- **TY İÇE AKTARMA ÇOK ADEDİ ÇOK SATIRA ÇEVİRİR (31.08.2026):** içe
  aktarılan satışların **%0,12'sinde** adet>1 (7/5688), elle girilenlerin
  **%1,5'inde** (3/194) — **12 kat** fark. Aynı satışta aynı varyanttan
  birden çok satır olan **86** satış var. **Para etkisi ÖLÇÜLDÜ: YOK** —
  sabit giderler (`SABIT_GIDER` 33 · `HIZMET_BEDELI` 4 · `ODEME_GIDERI` 4)
  bölünmüş satışların **hiçbirinde** birden çok kez yazılmamış; kalem
  başına olanlar (`KOMISYON` · `MALIYET` · `STOPAJ`) doğru şekilde satır
  başına. ⚠ **SATIR SAYISINA DAYALI BİR METRİK YAZILIRSA BU BİLİNMELİ** —
  "kaç kalem sattık" sorusuna satır sayarak cevap veren her rapor, içe
  aktarılan satışları olduğundan çok gösterir. _(Ölçüm:
  `scripts/canli-rakam-saglik.ts` · `scripts/canli-sabit-gider-kontrol.ts`)_

- **RAKAM SAĞLIĞI — ALIŞ · SATIŞ · MALİYET (31.08.2026, canlı):**
  geçerli satış **5843** (39 iptal), tamamı `CALCULATED` — ve damga
  **karşılıklı**: hareketi hiç olmayan 28 satış kalemi var ama bunları
  içeren **geçerli satış SIFIR** (hepsi iptallerde). Yani 28.08'in
  "2493 satış maliyetsiz hâlde hesaplandı sayılıyor" hatası **kapandı**.
  NET yazma kapısı iki yönde de temiz (0 / 0). Çıkışların **6082'sinin
  6'sında** birim maliyet yok ve **hiçbiri satışa bağlı değil**
  (`ADJUSTMENT`/`COUNT_CORRECTION`); parti bağı olmayan çıkış **0**.
  Alışta sıfır maliyetli kalem **0**; 1986 alımın **27'sinde** (%1,4) mal
  kabul tarihi yok.
  ⚠ **AÇIK KALAN ÜÇ ŞEY:** ① stoklu 231 varyantın **107'sinde** parti bağı
  şüpheli (K91b kapandı, onarım yolu yok) — geçmiş satışların maliyet
  ATFINI etkiler, toplamı değil; ② **1 satış kaleminde adet = 0**
  (K116②); ③ 29.08 sayımında **14 adet maliyetsiz** düşülmüş — envanter
  değerlemesinde boşluk, satış kârında değil (K116③).

- **K98 turunun üç bulgusu (30.08.2026):**
  · **Renk anlam taşır ve tek kaynaktan gelir.** Hata ekranının simgesine
    `text-amber-600` yazdım; `panel:dogrula` kırmızı yandı ve **haklıydı**.
    Doğrusu `DURUM_YAZISI.uyari` (`src/lib/renkler.ts`). Bekçi izlenmeyen
    dosyaları da tarıyor, o yüzden commit'ten ÖNCE yakaladı.
  · **Mutasyon harness'inin kapısı EKLEYEN mutasyonu ölçemiyordu.** Kapı
    _"diskte hâlâ eski satır var mı"_ diye bakıyordu; bir satırın ÜSTÜNE
    ekleyen mutasyonda eski satır zaten yerinde kalır. İki `FAZLADAN`
    mutasyonu "ölçülemedi" düştü. ⛔ **Kolay çare onları SİLMEK olurdu —
    yani "yanlış yanma" yönünü büsbütün korumasız bırakmak.** Kapı tam
    eşitliğe çevrildi ve **üç harness'e birden** uygulandı; ötekilerde bugün
    ısırmadığı ölçüldü (21 ve 9 çiftin 0'ı ekleyen).
  · **Bildirilen çıkış kodu İKİ KEZ yalan söyledi.** Hem bekçi turu hem push
    için ortam _"exit code 0"_ dedi; gerçek kod boruda başka yerdeydi
    (`| tail` ve `; echo` ikisi de yutuyor). İlk tur aslında **1**'di
    (`panel:dogrula`). Çıktı okunmasaydı **kırmızıyla push edilecekti** —
    anayasadaki `| tail -2` dersinin üçüncü vakası.
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
