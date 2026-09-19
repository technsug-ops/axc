# Arşiv — kapanmış işler, kararlar ve dersler

> ⚠ **BU DOSYA GEÇMİŞTİR, YAPILACAK İŞ LİSTESİ DEĞİLDİR.**
> Açık işler için → **[BEKLEYENLER.md](BEKLEYENLER.md)**
>
> 20.08.2026'da `BEKLEYENLER.md` 3.527 satıra ulaşmıştı ve içinde yalnız
> **8 açık kalem** vardı; geri kalanı kapanmış iş, karar ve ders kaydıydı.
> Aynı gün dosyanın kazara **ikiye kopyalandığı** ortaya çıktı (7.022 satır)
> ve fark edilmesi tesadüf oldu — 3.500 satırda bozulma görünmüyor.
>
> **Bölme yöntemi:** bu dosya, o günkü panonun **birebir kendisidir** —
> tek satır elden geçmedi, hiçbir şey özetlenmedi. Açık kalemler yeni
> panoya **yeniden yazıldı**, buradan silinmedi. Yani bir kalem iki yerde
> geçiyorsa çelişki değil: **buradaki geçmişi, oradaki bugünü** söyler.
>
> Kapanmış kalemler GEREKÇESİYLE burada durur; _"bakılmayacak"_ da bir
> sonuçtur ve silinmez.

---

## ✅ K216 — HB KARGO TARİFESİ PDF YÜKLEME + TARİFE-TABANLI TAHMİNİN "GERÇEKLEŞEN" DİYE YAZILMA HATASI · 17.09.2026 → 19.09.2026 · [KAPANDI — Halil testi geçti]

> **HALİL TESTİ SONUCU (19.09.2026):** Kullanıcı doğruladı — geçti
> (`/ayarlar/hb-kargo-tarife` ekranı + "Yeniden Hesapla" diyaloğundaki
> düzeltilmiş desi ön-doldurma, ikisi de "BUNLAR OK").

> ⚠ **KOD İÇİNDE "K202"/"K202-2" OLARAK GEÇİYOR — YANLIŞ KOD, DÜZELTİLMEDİ.**
> Bu iş 17-18.09.2026'da yazılırken kod `pano:sonraki`ye sorulmadan "K202"
> seçilmişti; o kod ARSIV.md'de zaten BAŞKA, ilgisiz bir kaleme aitti
> (`K202 — BEKÇİ TURU VERGİSİ`, 09.09.2026). Kod yorumlarını (22 dosya)
> geriye dönük değiştirmek düşük getirili/riskli bir taramaydı — commit
> mesajları da zaten "K202" diyor, tarih tartışmasız. Panodaki GERÇEK,
> çakışmasız kimlik **K216**; koddaki "K202" etiketleri tarihsel kalıntı
> olarak okunmalı. _(Bu, K48/K215 vakasıyla AYNI kök: kod yazılırken
> panonun kendi "sıradaki boş kod" kaynağına bakılmadı.)_

### ① GERÇEK CANLI VAKA — SİPARİŞ `4633427855` (18.09.2026)

Kullanıcı satış detayında "Yeniden Hesapla" ekranını açtı, kargo tutarını
BOŞ bıraktı (yalnız firma/desi doğruladı). Sistem ürünün TAHMİNİ desisiyle
(kanalın gerçek tartım desisi değil) taze bir tarife hesapladı ve —
unutulmuş bir bayrak yüzünden — bunu **"gerçekleşen"** diye `cargoAmount`a
yazdı. Yanlış desi + yanlış "bu gerçek mi tahmini mi" damgası aynı anda.

### ② KÖK SEBEP — OPSİYONEL BAYRAK, ZORUNLU OLMALIYDI

`karYenidenYaz`'ın beş doğrudan çağıranından **yalnız biri**
(`satisKarTazele`) "bu tutar tahmin mi gerçek mi" bayrağını doğru
geçiyordu; diğer dördü (`hesap-actions.ts` · `satis-duzenleme-veri.ts` ·
`iptal-geri-alma-veri.ts` · kullanıcının "Yeniden Hesapla" ekranı) hiç
geçmiyordu — bayrak **opsiyonel** olduğu için TypeScript bunu yakalamıyordu.

**Yapısal düzeltme:** "bu tutar nereden geliyor" sorusu artık çağırandan
gelen opsiyonel bir bayrak değil, TypeScript'in ZORUNLU kıldığı üç durumlu
birleşik tip: `CargoTutariBilgisi = {tur:"YOK"} | {tur:"GERCEK";…} |
{tur:"TAHMIN";…}`. Unutmak artık **derleme hatası**. `satisKarTazele`
ayrıca desiyi de artık `desiSecimi()` (TARTIM→TAHMIN→KÜRESEL) üzerinden
okuyor, ham `cargoDesi`yi değil. 21 dosya etkilendi (5 canlı yol + 16
geçmiş onarım betiği, tip değişikliğini derlemek için).

### ③ GEÇMİŞ ONARIMI — KANIT TABANLI, UYDURMA YOK

`scripts/canli-k202-2-onar.ts` (iki aşamalı: kanıtlı satışların
`cargoAmount`ı önce `null`lanır, sonra `kargoTartimGeldiTazele` ile
tazelenir) — bir satış yalnız ① `cargoAmount` bizim `CargoTariff`
tablomuzdaki BİR partiye kuruşuna eşitse VE ② (`kanalKargoDesi` farklıysa
YA DA eşleşen parti `soldAt` için geçerli parti değilse) "kirli" sayıldı.
Canlı tarama **17 satış** buldu (13 Hepsiburada + 4 Trendyol, 15-17 Eylül);
onarıldı ve tazelendi, idempotent (ikinci koşum 0/0).

### ④ HB KARGO TARİFESİ PDF YÜKLEME EKRANI — KALICI ÇÖZÜM

Kullanıcı talebi (17.09.2026): _"Bu durumun kalıcı olarak çözülmesi
gerekiyor. PDF ile bunun programın içerisinden çözümü olmalı"_ — HB'nin
resmî kargo tarifesi (desi × 11 taşıyıcı) o güne kadar yalnız terminalden,
elle çalıştırılan tek seferlik bir betikle yükleniyordu.

`/ayarlar/hb-kargo-tarife` — iki adımlı (önizle→yaz) yükleme ekranı,
`pdfjs-dist` (saf JS/WASM, harici ikili yok) ile **konum-tabanlı** sütun
eşleme: her metin parçasının x/y koordinatı okunup en-yakın-x eşlemesiyle
tabloya oturtuluyor — `pdftotext -table`'ın sıralı-indeks yaklaşımının
sütun-kayması hata sınıfının TAMAMINDAN kaçınıyor. Gerçek üretim PDF'iyle
sınandı: önceki elle-doğrulanmış çıkarımla **bayt bayt aynı** sonuç. Ham
PDF Blob'a arşivleniyor. 24 değer-testli mutasyon-sınanmış kontrol
(`kargo-tarife-pdf-dogrula.ts`).

### ⑤ "YENİDEN HESAPLA" DİYALOĞU — DESİ ÖN-DOLDURMA DÜZELTİLDİ

Aynı vakadan (①) çıkan ikinci düzeltme: form artık ham `satis.cargoDesi`
(ürün tahmini) değil, salt-okunur üstteki satırla PAYLAŞILAN
`desiSecimi()` sonucunu (`desiGosterim`) ön dolduruyor. Kanal gerçek
desiyi bildirmişken form hâlâ ürün tahminini gösteriyordu; kullanıcı formu
değiştirmeden onaylarsa YANLIŞ desiyle yeniden hesaplanıyordu. KÜRESEL
basamak burada da GÖSTERİLMİYOR (İlke #11 — bilinmeyen bir değer dolu
görünmez).

**İlgili önkoşul (aynı gün, ayrı commit):** K201-4 — kargo tarifesi
sorguları `effectiveFrom` sıralaması olmadan okunuyordu; PDF yükleme ve bu
düzeltme, doğru tarife partisinin seçildiği bu düzeltmeye dayanıyor.

⚠ **FOLLOW-UP, BUGÜN KAPSAM DIŞI:** K201-3 (16.09.2026, `574ee5e`,
"Trendyol'a gönderilen barkod ChannelSku değil variant.barcode'dan
okunsun") aynı kümeden ayrı bir düzeltme ve o da panoya hiç yazılmamış —
bugünkü Halil onayı bunu kapsamıyor, ayrıca belgelenecek.

---

## ✅ K192 — BLOB ASKISININ KÖK SEBEBİ: `list()` KOTAYI YAKMIŞ · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K193 — 21 GÜNLÜK PENCERE: YEDEK ALMA İŞİ MAKİNEYE GEÇTİ · 09.09.2026 → 19.09.2026 · [KOŞTU]

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

## 🔶 K197 — TAHMİN EDİLEN DESİ ile GERÇEKLEŞEN DESİ · 09.09.2026 → 19.09.2026 · [KOD KOŞTU · KAPANDI]

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

## ✅ K191 — ÖLÜM SEBEBİ İŞARETİ: "YARIM KALDI" YETMEZ, "NEREDE" GEREK · 08.09.2026 → 19.09.2026 · [KOŞTU]

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

## ✅ K190 — ÇAPA BEKÇİSİ: REAKTİF TARAMA KALICI ÖLÇÜTE ÇEVRİLDİ · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K121b — PASİFİ ELEME KARARI ÇAĞIRANA GEÇTİ · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K189 — ÇEKİM SESSİZCE 69 DAKİKA DURDU · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K188-④ — LAMBORGHINI ZİNCİRİ TAMAMLANDI (4/4) · 08.09.2026 → 19.09.2026 · [KOŞTU — canlı]

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

## ✅ K188-⑤ — ONAY YOLUNA SAYIM ISRARI EKLENDİ · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K188-② — MÜKERRER HB KAYDI TEMİZLENDİ (2/2) · 08.09.2026 → 19.09.2026 · [KOŞTU — canlı]

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

## ✅ K188-③ — "3 SİPARİŞ BEKLİYOR" ROZETİ LİSTEYLE AYRIŞIYORDU · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K188 — STOK ARAMASI SİPARİŞ NUMARASINI DA EŞLEŞTİRİYOR · 08.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K187 — OTOMATİK ÇEKİM ZİNCİRİ ONARILDI + ÜÇ KANALA GENİŞLEDİ · 08.09.2026 → 19.09.2026 · [KOŞTU — canlı]

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

## ✅ K181 — TRENDYOL ÜRÜN v2 GEÇİŞİ · 07.09.2026 → 19.09.2026 · [KOŞTU — canlı, salt okuma]

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

## ✅ K184 — HEPSİBURADA CANLI + LİSTİNG → K121 BORUSU · 07.09.2026 → 19.09.2026 · [KOŞTU — canlıda yazıldı]

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

---

## ✅ K180 — KALEM KALDIRMA AÇILDI (K78 KAPANDI) · 07.09.2026 → 19.09.2026 · [KOD KOŞTU · migration CANLIDA]

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

## ✅ K179 — KALAN ALTI AÇIK KALEM KAPANDI · 07.09.2026 → 19.09.2026 · [KARAR + ÖLÇÜM]

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

## ✅ K178 — ÜÇ AÇIK KALEM KAPANDI: pre-commit · sipariş saati · onay durumu · 07.09.2026 → 19.09.2026

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

## ✅ K177 — PANEL "BUGÜN"Ü UTC'DEN KURULUYORDU · 07.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K176 — AYRIŞAN MALİYET DAMGALARI · 07.09.2026 → 19.09.2026 · [KOŞTU — 01.08.2025→bugün]

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

---

## ✅ K173-③ — NET-2 TÜKETİCİ SINIFLAMASI · 06–07.09.2026 → 19.09.2026 · [HALİL TESTİ GEÇTİ]

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

## 🚨 K173 — `git add -A` KOŞAN MUTASYON TURUNU COMMIT'E ALDI · 06.09.2026 → 19.09.2026 · [CANLIYA SIZDI · İLERİ DÜZELTİLDİ]

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

## 📕 KILAVUZA GİREN İKİ MADDE · 06.09.2026 → 19.09.2026

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

## ✅ K170 — DEVREDEN KDV: İADE NET-2'Yİ ŞİŞİRMEZ · 05–06.09.2026 → 19.09.2026 · [KOŞTU — ① ve ② kapandı]

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

## ✅ K169 — KANALA İLK YAZMA: TY'YE STOK/FİYAT GÖNDERİMİ · 05.09.2026 → 19.09.2026 · [HALİL TESTİ GEÇTİ]

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

---

## ✅ K166 — TY ÇEKİMİ MAKİNEDEN BAĞIMSIZ · 04.09.2026 → 19.09.2026 · [KOŞTU — uçtan uca canlı 06.09]

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

---

## ✅ K164 — ONAY KUYRUĞU KURULDU · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K163 — SİPARİŞ SAATİ DAMGASI · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## ✅ K161 — İKİ EŞZAMANLI BEKÇİ TURU BİRBİRİNİ KİRLETTİ → TEK TUR KİLİDİ · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K133 — DETAYA GİRİNCE LİSTEYE DÖNÜLEMİYOR · **KOD KOŞTU 02.09.2026 → 19.09.2026**

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

## ✅ K137 — İŞLENMİŞ İADE ARAMASI · 02.09.2026 → 19.09.2026 · [KAPANDI]

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

## ✅ K150 — BARKOD KARIŞMASININ KÂR ETKİSİ DÜZELTİLDİ · 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## 🔶 K159 — TY YAZMA ERTELENDİ (KARAR) + HB TEST API BAŞLADI · 04.09.2026 → 19.09.2026 · [KAPANDI — K169/K160 ile üstlenildi]

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

---

## ✅ K158 — TY GÜNLÜK ÇEKİM RUTİNİ + PANEL ROZETİ · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K157 — MARJ ŞERHİ RAKAMI KAYNAĞA GÖTÜRÜYOR (İLKE #16) · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K156 — TAZMİN 13 YAZILDI + KURAL REVİZYONU: API > LİSTE > ELLE · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## 📌 K155 — "LİSTE, SATIŞLARIN FİZİKİ SAYIMIDIR" · DEFTER LİSTEYE HİZALANDI · 04.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## ✅ K152 — "HEPSİNİ İÇERİ AL": 724 ÜRÜN + 1.889 SATIŞ + MALİYETLERİ · 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ⛔ K151 — GERİ ÇEKİLDİ · RAKAMLARIM YANLIŞ DOSYADAN ÇIKMIŞTI · 03.09.2026 → 19.09.2026 · [DÜZELTİLDİ]

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


---

## 🚨 K149 — MUTASYON KALINTISI ÜRETİME SIZDI · 03.09.2026 → 19.09.2026 · [KAPI KURULDU]

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

## ✅ K148 — 14.08 TEST KAYITLARI NÖTRLENDİ · DAR İSTİSNA · 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## ✅ K146 — 19 KARGO + BIÇAK MALİYETİ YAZILDI · NET TAZELENDİ · 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K138 — PANO YAZIMI "BEKLİYOR" DERKEN KOŞMUŞTU · BEKÇİ 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K139 — EKSİK KARGOLAR YAZILDI · 02.09.2026 → 19.09.2026 · [KOŞTU]

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

## ✅ K140 — `11265267349` TAM ONARIM · 02.09.2026 → 19.09.2026 · [KOŞTU]

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

## ✅ K145 — KARDEŞ PARTİ SAPMASI TARANDI + KART ETİKETİ YALAN SÖYLÜYORDU · 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

---

## ✅ K142 — SATIŞ DEFTERİ SAĞLIK TARAMASI · 02.09.2026 → 19.09.2026 · [ÖLÇÜLDÜ]

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

---

## 🔵 K143 — ZARARLARIN KAYNAĞI ÖLÇÜLDÜ · 02.09.2026 → 19.09.2026 · [ÖLÇÜLDÜ]

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

## 🔵 K144 — TY API DURUM RAPORU · 02.09.2026 → 19.09.2026 · [ÖLÇÜLDÜ]

_"Her şeyiyle bağlı mıyız?"_ → **Hayır.** Üç ayrı soru, üç ayrı cevap:

    ① UÇ VAR MI        siparisler · hakedis · iadeler   (yazma fiili YOK)
    ② ÇALIŞIYOR MU     üçü de ✓ (81 · 113 · 351 kayıt)
    ③ DEFTERE AKIYOR MU  API'den 439/5906 = %7,4

⛔ **AKIŞ DURMUŞ:** ilk API kaydı 26.08, son API kaydı da 26.08 — tek
seferlik çekim. **Otomatik zamanlayıcı YOK**, içe aktarma elle koşuluyor.
⛔ Bağlanmamışlar: stok/fiyat ve paket statü (bilerek, yazma ucu) ·
buy-box (kapı kararı A'da) · ürün/listeleme okuma.

---

---

## ✅ K136a — EKSTRE YOLU UÇTAN UCA SINANDI · 02.09.2026 → 19.09.2026 · [KAPANDI · YAZILDI]

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

---

## ✅ K134 — HAKEDİŞ BAĞI KURULDU · **1209 KALEM** · 02.09.2026 → 19.09.2026

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

## ✅ K132 — HB AVANTAJLI TEKLİFLER (K-HB-TEKLIF) · 02–06.09.2026 → 19.09.2026 · [KAPANDI — teklif girildi]

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

## ✅ K129 — ÜRÜN ANALİZİ TAM LİSTESİ · **HALİL TESTİ GEÇTİ 02.09.2026 → 19.09.2026**

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

## ✅ K131 — RAF YAŞI KOVALARI · **HALİL TESTİ GEÇTİ 02.09.2026 → 19.09.2026**

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

## ✅ K130 — PANO KİMLİK ARACI KAPANDI · 02.09.2026 → 19.09.2026 · [KOD KOŞTU]

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

## ✅ K128 — SAYIM FAZLASININ MALİYETİ · **KAPANDI 02.09.2026 → 19.09.2026**

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

---

## ✅ K91 — PARTİ BAĞI ONARIMI · **KAPANDI** (01.09.2026 → 19.09.2026)

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

## ✅ K215 — BEKÇİ DERLEMEYİ SINAMIYOR (İKİNCİ TUR — `tsc` HÂLÂ KÖR NOKTA TAŞIYOR) · KAPANDI 03.09.2026 → 19.09.2026 · [KOD KOŞTU]

> ⚠ **YENİDEN NUMARALANDI (19.09.2026):** bu kalem 77 maddelik arşiv
> temizliğinde yanlışlıkla eski `K48` koduyla taşınmıştı — o kod 25.08.2026'da
> zaten FARKLI bir olaya (`tsc:dogrula`nın ilk eklenmesi) verilmişti ve
> "boşluk yeniden kullanılmaz" kuralı gereği kod ikinci kez verilemez. İkisi
> aynı konuya (derleme denetimi) değiniyor ama AYRI olaylar — biri `tsc:dogrula`yı
> KURUYOR (25.08), bu ise onun körlüklerini ÖLÇÜP `sunucu-eylemi:dogrula`yı
> EKLİYOR (03.09). `pano:dogrula`nın kendi K10 çakışma kontrolü yakaladı.

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

## 📊 DÖRT CEPHE — 28.08.2026 → 19.09.2026 [KOŞTU] `npm run canli:dort-cephe`

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

---

## 🆕 K69 — DOSYA MALİYETİ ASIL VERİ · 28.08.2026 → 19.09.2026

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

## 🆕 K70 — İADE AÇIĞI · 28.08.2026 → 19.09.2026

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

## 🆕 K71 — TANINMAYAN TÜRLER · 28.08.2026 → 19.09.2026

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

## 🆕 K72 — İKİ VAKA HALİL'DEN · 28.08.2026 → 19.09.2026

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

## 🔒 K73 — İADE İÇE AKTARMA · KİLİTLİ · 28.08.2026 → 19.09.2026

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

## 🆕 K74 — HALİL'İN ON VAKASI · KURU KOŞUM 03.09 → 19.09.2026 · [MALİYETLER YAZILDI · ②⑨ İŞ YOK · ④ TIKALI]

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

## ✅ K75 — KARGO SÜTUNU (R) · YAZILDI 28.08.2026 → 19.09.2026 · [KOŞTU · kalıntı 19]

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

---

## 🆕 K77 — İADE DOSYASI · O SÜTUNU · 28.08.2026 → 19.09.2026 · [ÖLÇÜLDÜ]

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

## ✅ KARGO YAZILDI · 28.08.2026 → 19.09.2026 · [KOŞTU]

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

## ✅ K78 — SİPARİŞ SATIRI KALDIRILAMIYOR · 28.08.2026 → 19.09.2026 · [KAPANDI 07.09.2026 → K180]

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

## 🚨 K79 — GEÇMİŞ SATIŞ GELECEĞİN PARTİSİNİ YİYOR · 29.08.2026 → 19.09.2026

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

## 🆕 K81 — HURDA ÇAPRAZI · 29.08.2026 → 19.09.2026 · [ÖLÇÜLDÜ]

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

## 🚨 K82 — ÇOKLU ADETTE BİRİM FİYAT BÖLÜNÜYORDU · 29.08.2026 → 19.09.2026 · [KAPANDI]

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

## ✅ K83 — FİZİKSEL SAYIM ESAS · YAZILDI 29.08.2026 → 19.09.2026 · [KOŞTU · 181 hareket]

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

---

## 🚨 K88 — İLERİ PARTİ ONARIMININ ÖLÇÜTÜ YANLIŞTI · 29.08.2026 → 19.09.2026 · [DÜZELTİLDİ]

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

---

## 🏁 API ÖNCESİ KAPANIŞ — beşi kapanmadan Faz 4 kodu YAZILMAZ · 24–28.08.2026 → 19.09.2026 · [KAPANDI — beşi de kapandı, Faz 4 çoktan sürüyor]

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

---

## ✅ K214 — SATIŞ DETAYI: KANALIN DOĞRULADIĞI DESİ EKRANA YANSIMIYORDU · 11.09.2026 → 19.09.2026 · [KAPANDI — Halil testi geçti]

> **HALİL TESTİ SONUCU (19.09.2026):** Kullanıcı doğruladı — geçti.

### TALEP (kullanıcı, iki ekran görüntüsü, 11.09.2026)
Bizim ekranımız bir Trendyol siparişinde "Aras Kargo — 40 desi" gösteriyordu;
Trendyol'un kendi panelinde aynı sipariş "Desi: 61" diyordu. Kullanıcı:
_"başlangıçta tahmini desi yazılması normal fakat pazar yerine kargo
tarafından gönderilen desi doğrulaması sonucunda ekrana girdiğimiz desinin
otomatik pazar yerinden çekilmesi gerekiyor... bu konuyu daha önce çalıştık
ama sonuç vermedi."_

### TEŞHİS — VERİ DOĞRUYDU, EKRAN YANLIŞ ALANI OKUYORDU
Canlı DB'de o satış sorgulandı:

    cargoDesi        40   ← BİZİM TAHMİNİMİZ (satış anında, Σ ürün desi)
    kanalKargoDesi   61   ← KANALIN DOĞRULADIĞI GERÇEK DESİ — zaten DOĞRU yakalanmıştı

K197-4 (09.09.2026) `kanalKargoDesi`yi TY/N11 içe aktarmasında ZATEN doğru
topluyordu. `src/lib/kargo-kaynagi.ts`'teki `desiSecimi()` de ZATEN doğru
öncelik sırasını (TARTIM → TAHMIN → küresel) uyguluyordu — değer testleriyle
kanıtlı. **Eksik olan, satış detayı ekranının (`satislar/[id]/page.tsx`)
bu sırayı hiç ÇAĞIRMAMASIYDI** — ham `cargoDesi`yi doğrudan basıyordu.
_(Anayasa: "zincir, halkalarının varlığıyla değil bağlantısıyla sınanır" —
saf gövde doğruydu, tüketici hiç yoktu; K52'nin dokümante ettiği "tüketicisi
henüz yok" boşluğu tam burada yaşıyordu.)_

### YAPILAN
- `src/app/satislar/[id]/page.tsx` → kargo firması/desi satırı artık
  `desiSecimi({ kanalKargoDesi, cargoDesi })` çağırıyor; TARTIM varsa O
  gösteriliyor, yoksa TAHMIN (etiketli: _"— 61 desi"_ ya da _"— 40 desi
  (tahmini)"_). `desiSecimi`in üçüncü (KÜRESEL) basamağı BİLEREK
  render edilmiyor — o basamak kargo MALİYETİ hesabı için var, ekran
  bilinmeyen bir şeyi GÖSTERMEZ (İlke #11).
- `cargoDesi` sütununa DOKUNULMADI — şemanın "kanalKargoDesi cargoDesi'nin
  üstüne asla yazılmaz" kuralı (09.09.2026) korundu; bu yalnız bir
  GÖSTERİM düzeltmesi, iki sütun ayrı ayrı yaşamaya devam ediyor.
- Test: `scripts/kargo-kaynagi-dogrula.ts`'e kaynak-tarama bağlanma testi
  (desiSecimi çağrısı · doğru iki alanı geçiriyor · KÜRESEL basamak
  gösterilmiyor · tahmini etiketi VAR) — **4 mutasyonla** sınandı, hepsi
  kırmızı yandı; ilk yazımda bir kontrol ("kanalKargoDesi geçiriliyor mu")
  yalnız anahtar ADINI arıyordu ve değeri `null`e sabitleyen bir mutasyonu
  KAÇIRDI — kaynak alana (`satis.kanalKargoDesi`) daraltılınca yakalandı.

### HALİL TESTİ — kapanma şartı
1. `/satislar/{id}` → `kanalKargoDesi` DOLU olan (kargoya verilip kanal
   desiyi doğrulamış) bir siparişi aç. "Kargo firması" satırında kanalın
   GERÇEK desisi görünmeli — "(tahmini)" etiketi OLMAMALI.
2. Henüz kargoya verilmemiş / kanal desi doğrulamamış bir sipariş aç:
   bizim tahminimiz görünmeli, yanında **"(tahmini)"** yazmalı.
3. Ekrandaki rakam, kanalın kendi panelindeki (Trendyol/N11/HB) desiyle
   BİREBİR tutmalı (Halil testi madde c) — yaklaşık değil.

---

## ✅ K213 — SONRADAN İPTAL OLAN SİPARİŞ OTOMATİK TESPİT (TY + N11 + HB) · 11.09.2026 → 19.09.2026 · [KAPANDI — Halil testi geçti]

> **HALİL TESTİ SONUCU (19.09.2026):** Kullanıcı doğruladı — geçti.

### TALEP (kullanıcı, ekran görüntüsü + metin, 11.09.2026)
_"Sipariş kargoya verilmeden önce müşteri tarafından Vazgeçtim / Daha Ucuz
Buldum / Kargoya Teslimi Geç görünüyor gibi sebeplerle iptal edilebilir,
bu durumda sipariş yok hükmündedir, bu iptaller pazaryerinden çekilerek,
cirodan ve kârdan düşülüp iptal edilen miktar kadar stoğa eklenmeli."_

### TEŞHİS
Elle iptal (satış detayından "İptal Et") zaten doğru çalışıyordu — cironun/
kârın/hakedişin dışına çıkarıyor ("hiç doğmamış sayılır") ve stoğu
`SALE_CANCEL_IN` ile aynen geri veriyor (17.08.2026'da kurulmuş, olgun bir
motor). Eksik olan **OTOMATİK tarafıydı**: periyodik TY çekimi
(`canli-ty-ice-aktar.ts`) 26.08.2026'dan beri şu kuralı taşıyor —
_"çakışan (zaten içe aktarılmış) sipariş varsa ATLA, üzerine yazma."_
Yani sipariş önce AKTİF import edilip sistemde satış olarak durduktan
SONRA pazaryerinde iptal edilirse, sonraki çekimler onu görmezden geliyor
ve kimse elle iptal etmediği sürece o satış cirodan/kârdan düşmüyor —
tam kullanıcının bildirdiği sızıntı.

### KARAR (AskUserQuestion, kullanıcı: "Evet, otomatik yap")
Otomatik tespit yazıldı. Karar sırasında **yalnız Trendyol** kapsandı —
talepteki ekran görüntüsü TY siparişiydi ve HB/N11 için kullanıcı
"mümkünse" demişti; kapsam bilinçli olarak dar tutuldu (aşağıya bkz.).

### YAPILAN
- `src/lib/satis-iptali.ts` → saf fonksiyon `otomatikIptalAdayiMi(aday,
  mevcutSatisIptalTarihi)`: TY'nin `Cancelled` dediği VE iptal anı
  çözülebilen VE bizim tarafta henüz iptalli olmayan siparişleri "aday"
  sayar. Tahmin yok — TY'nin kendi beyanı (`durum === "Cancelled"`) ve
  kendi zaman damgası (`iptalTarihi`) dışında hiçbir şeye bakmıyor.
- `src/lib/satis-iptali-veri.ts` → `iptalUygula`nın `kullaniciId` tipi
  `string | null`e gevşetildi. `izYaz`in kendi kuralıyla AYNI: `null`
  "oturuma bakma, bilerek kimse yok" demek (K90) — otomatik tetikte
  uydurma bir kullanıcı yazılmıyor.
- `scripts/canli-ty-ice-aktar.ts` → mevcut (çakışan) siparişler taranırken
  her aday için ÖNCE `iptalOnizle` (aynı önizle→uygula motoru, elle iptal
  ekranıyla BİREBİR), engel yoksa `--yaz` altında `iptalUygula`. Not alanı
  _"...otomatik tespit edildi (K213, canli-ty-ice-aktar)"_ — sessiz değil,
  hangi satışın neden otomatik iptal olduğu kayıtta okunur.
- Test: `scripts/iptal-dogrula.ts`'e 5 değer testi (saf fonksiyonun dört
  dalı + Shipped durumunun aday sayılmadığı), `scripts/ice-aktarma-
  dogrula.ts`'e kaynak-tarama bağlanma testi (import · çağrı sırası ·
  `--yaz` kapısı · sebep sabitliği · not metni · `kullaniciId: null` ·
  aynı motorun elle ekranla ortak olduğu) — **6 mutasyonla** sınandı,
  hepsi kırmızı yandı, dosya bit-bit geri yüklendi.

### ─── ② N11 GENİŞLETMESİ · 11.09.2026 · [YAZILDI — HALİL TESTİ BEKLİYOR]
Kullanıcı: _"Bağlı tüm pazaryerlerinde değil mi... yani bağlı tüm
pazaryerlerinde otomatik iptalleri kanallardan okuyup otomatik iptal
edilecek"_ — kapsam TY ile sınırlı bırakılmasın diye düzeltti.

**Ölçüldü, sonra yazıldı.** N11'in `packageHistories`i TY ile **birebir
aynı** biçimde geliyor (zaten K195'te ölçülmüştü) ve canlıda gerçek bir
iptal edilmiş paket üstünde doğrulandı — gerçek `"Cancelled"` geçmiş
girdisi, gerçek epoch damgası:

    ÖRNEK paket 232818314428: history=[{"status":"Created",...},
      {"status":"Picking",...}, {"status":"Cancelled","createdDate":1787907749580}]

**AMA N11'in mekanizması TY'den YAPISAL OLARAK FARKLI** ve bu yüzden K213'ün
TY kodu doğrudan kopyalanamadı: N11'de tam iptal olmuş bir paket şimdiye
kadar aday listesine (`adaylar`) HİÇ girmiyordu (erken `continue`, iptal
anı çöpe gidiyordu). TY'de ise iptalli paket yine de aday listesine girip
`iptalTarihi` dolu yazılıyordu — K213'ün asıl `cakisanlar` mekanizması
buna dayanıyordu. N11'de bu yol yoktu, yeni bir yol açıldı: iptal anı ayrı
bir haritada (`iptalliPaketler`) tutulup yalnız **hiçbir parçası artık
açık olmayan** siparişler (aday listesinde karşılığı olmayanlar) otomatik
iptal adayı sayılıyor — kısmi iptal (siparişin bir parçası hâlâ açık)
kasıtlı olarak dışarıda bırakıldı, yanlışlıkla aktif bir siparişi iptal
etmemek için.

**YAPILAN:**
- `src/lib/kanal-kargo-damgasi.ts` → `gecmistenKargoDamgasi`nin `durum`
  tipi `"Shipped" | "Delivered"`den `| "Cancelled"`e genişletildi (TY'nin
  kendi `iptalAniCoz`ı dokunulmadı — farklı dönüş biçimi; N11 ortak
  gövdeyi kullanıyor, ikinci bir kopya yazılmadı).
- `scripts/canli-n11-ice-aktar.ts` → `otomatikIptalAdayiMi`/`iptalOnizle`/
  `iptalUygula` TY ile AYNI motor; yeni `iptalliPaketler` haritası +
  "adaylar'da karşılığı yok" süzgeci; not _"...otomatik tespit edildi
  (K213, canli-n11-ice-aktar)"_.
- Test: `scripts/ice-aktarma-dogrula.ts`'e kaynak-tarama bağlanma testi
  (TY'nin K213 bölümüyle aynı desende + N11'e özgü "kısmi iptal HARİÇ"
  ölçütü) — **7 mutasyonla** sınandı (TY'nin 6'sı + N11'in kendine özgü
  kısmi-iptal-guard'ı), hepsi kırmızı yandı, dosya bit-bit geri yüklendi.
  Kısmi-iptal-guard mutasyonu en riskli olanıydı: kaldırılırsa hâlâ
  parçası kargoda olan bir sipariş otomatik iptal edilebilirdi.

### ─── ③ HB GENİŞLETMESİ · 11.09.2026 · [YAZILDI — HALİL TESTİ BEKLİYOR]
Kullanıcı ilk turda "hiçbir bilinen HB ucu iptali göstermiyor" tespitine
itiraz etti: _"Entegra ve Melontik gibi firmalar hepsi burada dan iptal
bilgilerini alıyor, o halde bizim de almamız lazım, tekrar dener misin"_
— haklıydı; ilk tur yalnız TOPLU uçlara (`/packages`, `/shipped`,
`/delivered`) bakmıştı, TEK sipariş ucunu (`siparisDetay`) hiç sınamamıştı.

**Yeniden ölçüldü, gerçek bir kanıt bulundu.** Bizim elle iptal ettiğimiz
gerçek bir HB siparişinin (`4428007117`, sebep MUSTERI_VAZGECTI) detayı
çekilince:

    "status": "CancelledByCustomer"
    "lastStatusUpdateDate": "2026-09-06T15:24:12.971"

İkinci bir MUSTERI_VAZGECTI siparişinde (`4348472605`) de AYNI durum +
gerçek damga görüldü — **2/2 doğrulandı.** ⚠ AMA MAGAZA_DIGER sebepli bir
elle iptal (`4120311526`) HB'de `"ClaimCreated"` çıktı — yani her elle
iptalimiz kanalın kendi "Cancelled*" durumuna karşılık gelmiyor; otomatik
tetik yalnız kanalın GERÇEKTEN öyle dediği siparişlere basıyor.

**İLK SÜRÜMDE TOPLU "İPTAL EDİLENLER" LİSTESİ BULUNAMAMIŞTI** — `/orders`
ucu her parametre kombinasyonunda `totalCount: 0` döndürmüştü (5 farklı
deneme). Bu yüzden ilk sürüm TY/N11'deki "kanal ne söylüyorsa tara" yerine
**"hâlâ açık saydığımız her siparişi tek tek yokla"** tasarımıyla kuruldu
(pencere 30 gün + tavan 200 + her aday için `siparisDetay`) ve bu hâliyle
CANLIYA gitti.

### ─── ③-b GERÇEK UÇ BULUNDU, MEKANİZMA SADELEŞTİRİLDİ · 11.09.2026

⭐ **KULLANICI HB DESTEĞİNE TASK AÇMIŞTI ("kargo takip entegrasyonu") VE
YANIT GERÇEK UCU AÇIK ETTİ.** HB'nin cevap e-postasındaki doküman
bağlantısı (`op=Get__orders_merchantid_merchantId_cancelled`) bir uç
adını taşıyordu; portal otomatik okuyucuya kapalıydı ama uç CANLIYA
doğrudan denendi ve **gerçek, toplu veri döndü**:

    GET /orders/merchantid/{id}/cancelled
    { "totalCount": 7, "items": [
      { "orderNumber": "4348472605", "cancelDate": "2026-09-06T09:52:15.004",
        "cancelledBy": "Customer", "cancelReasonCode": "ISelectedWrongProduct",
        "lineItemId": "...", "quantity": 1, "sku": "..." }, ... ] }

Bu, daha önce elle doğrulanmış siparişle (`4348472605`) BİREBİR eşleşti.
İlk sürümün "toplu uç yok" sonucu YANLIŞTI — aranmamıştı, YOK sanılmıştı.

**MEKANİZMA BAŞTAN YAZILDI — TY/N11 İLE AYNI DESENE DÖNÜLDÜ:**
- "Her açık siparişi tek tek yokla" (pencere + tavan + `siparisDetay`)
  TAMAMEN kaldırıldı; artık toplu uç TEK seferde taranıyor
  (`UCLAR.iptalEdilenSiparisler`, `hb/istemci.ts`).
- ⛔ **SATIR = KALEM, SİPARİŞ DEĞİL.** Bir sipariş birden çok kalemliyse ve
  listede yalnız BİR KISMI görünüyorsa, sipariş HÂLÂ AÇIKTIR — otomatik
  iptal EDİLMEZ (N11'in "kısmi iptal hariç" guard'ının aynısı, burada
  satır-sayısı ↔ geçerli-kalem-sayısı karşılaştırmasıyla).
- ⭐ **SEBEP ARTIK UYDURULMUYOR.** Yeni saf gövde `hbIptalSebebiCoz`
  (`src/lib/satis-iptali.ts`) kanalın kendi `cancelledBy`/`cancelReasonCode`
  beyanını kapalı kümemize çevirir (`FoundCheapper`→MUSTERI_FIYAT,
  `Customer` dışı→MAGAZA_DIGER, diğerleri→MUSTERI_VAZGECTI) — TY'nin
  aksine artık HER ZAMAN MUSTERI_VAZGECTI yazılmıyor.
- İptal anı hâlâ GÜN hassasiyetinde (`hbKargoDamgasi(cancelDate)`,
  K195'in HB saat dilimi çözümüyle AYNI).
- Test: `scripts/ice-aktarma-dogrula.ts`'e kaynak-tarama bağlanma testi
  yeniden yazıldı, `scripts/iptal-dogrula.ts`'e `hbIptalSebebiCoz` için
  6 değer testi eklendi — toplam **9 mutasyonla** sınandı (kısmi-iptal
  guard'ı en riskliydi: kaldırılırsa hâlâ parçası açık bir sipariş
  otomatik iptal edilebilirdi), hepsi kırmızı yandı, dosyalar bit-bit
  geri yüklendi.

⭐ **VE ESKİ MEKANİZMA CANLIDA GERÇEKTEN ÇALIŞTI — REBUILD ÖNCESİ KANIT.**
Rebuild başlamadan hemen önce, eski (per-order-yoklama) sürüm gerçek bir
siparişi (`4702303732`) doğru şekilde otomatik iptal etmiş bulundu:
`iptalNotu: "...otomatik tespit edildi (K213...)"`, `iptalEdenId: null`
(insan değil, sistem), `iptalTarihi` gün hassasiyetinde doğru. Bu K213'ün
TEMEL mantığının (saf gövdeler, `iptalOnizle`→`iptalUygula` motoru)
production'da zaten kanıtlandığını gösteriyor — rebuild yalnız KEŞİF
yöntemini (toplu uç vs. tek tek yoklama) değiştirdi, karar mantığına
dokunmadı.

### HALİL TESTİ — kapanma şartı (TY + N11 + HB)
Bu bir OTOMATİK, finansal etkili değişiklik — canlı zamanlanmış cron'lara
giriyor. Sentetik deneme yerine gerçek bir vakayla doğrulanmalı:
1. Trendyol'da (veya N11/HB'de) az riskli bir siparişi (ör. düşük tutarlı)
   müşteri adına "Vazgeçtim" ile iptal ettir (ya da bir sonraki gerçek
   müşteri iptalini bekle).
2. O siparişin sistemde zaten **aktif satış** olarak durduğunu doğrula
   (`/satislar` içinde sipariş kodunu ara).
3. Bir sonraki zamanlanmış çekim (TY 5 dakikada bir · N11/HB kendi
   cron'u) geçtikten sonra aynı satışı aç: **İptal Edildi** rozeti
   görünmeli, iptal notu _"...otomatik tespit edildi (K213...)"_ okunmalı.
4. `/rapor` panelindeki GERÇEK NET / ciro rakamının o satış tutarı kadar
   **düştüğünü**, `/stok` üzerinden ilgili varyantın adedinin iptal
   edilen miktar kadar **arttığını** doğrula.
5. N11'e özgü: parçası hâlâ kargoda/teslimde olan BÖLÜNMÜŞ bir sipariş
   varsa, o sipariş otomatik iptal EDİLMEMELİ (kısmi iptal guard'ı) —
   fırsat çıkarsa bu senaryo da bir kez elle doğrulanmalı.
6. HB'ye özgü: **zaten bir kez gerçek vakada doğrulandı** (sipariş
   `4702303732`, yukarıya bkz.) — rebuild sonrası bir dahaki gerçek HB
   iptalinde tekrar teyit edilmeli, artık toplu listeden (`/cancelled`)
   geliyor olması dışında davranış aynı kalmalı.
7. Ekrandaki rakamlar teslim raporundaki beklenenle birebir tutmalı
   (Halil testi madde c) — yaklaşık değil.

---

## ✅ K212 — ÜRÜN ANALİZİ: ARAMA · FAVORİ/İNCELENECEK · MEVSİM SEKMESİ · 11.09.2026 → 19.09.2026 · [KAPANDI — canlı migration koştu, Halil testi geçti]

> **HALİL TESTİ SONUCU (19.09.2026):** Kullanıcı doğruladı — geçti ("otomatik mevsim önerisi" ayrı, açık kalem olarak BEKLEYENLER.md'de bırakıldı).

Kullanıcı: _"barkod EA ve diğer SKU'larla ürün arama butonu koy. Favori
ürünler ve incelenilecek ürünler şeklinde etiketleyebilelim. Mevsimsel
bir sekme — 1./2./3./4. çeyrekte çok satan. Yaz/kış tag'ları da olabilir,
best practise peşinde koş."_

### KARARLAR (kullanıcı, 11.09.2026)
1. Favori/İncelenecek etiketleri **ORTAK** — kullanıcı bazlı değil, tek
   liste tüm ekibe görünür.
2. Mevsimsel sekme **TÜM GEÇMİŞ**, takvim çeyreğine göre (yıldan bağımsız
   toplanır) — arbitraj ürünleri genelde 1-2 yıl yaşıyor.
3. Yaz/Kış: **YALNIZ ELLE** — otomatik öneri YAPILMADI.

### ⛔ OTOMATİK MEVSİM ÖNERİSİ NEDEN YOK — ÖLÇÜLDÜ, KURULMADI
Canlıda ölçüldü (11.09.2026): ürünlerin **%79'u** (1296/1639) yalnız 1-2
farklı ayda satılmış. İlk bakışta çeyreklik dağılım bimodal (uçlarda
yığılmış) görünüyordu — ama bu örneklem küçüklüğü, gerçek mevsimsellik
değil: bir ürün tek kez Haziran'da satıldıysa "%100 yaz" çıkar, oysa bu
kampanya rastlantısı olabilir. En az 4 farklı ayda satılmış (daha
güvenilir) 163 ürüne bakıldığında dağılım **DÜZ/rastgele** çıktı — net
mevsimsel sinyal yok. Kullanıcı kararı: yanlış öneri hiç önermemekten
kötü; veri yeterince büyüdükçe yeniden değerlendirilecek (bu kalem
**bilerek** kapatılmadı, açık bırakılıyor — bkz. "kapatılamayacak kayıp,
görev değil kayıttır": burada TERSİ, ileride görev olabilecek bir kayıt).

### YAPILAN
- **Arama** — barkod/EAN, SKU, Firma SKU, kanal kodları, ürün adı;
  TR-duyarsız (İ/i) VE ASCII-duyarsız (kod alanlarında "I"→"ı" tuzağı —
  bkz. aşağıdaki hata) çift normalleştirme.
- **Favori / İncelenecek** — satır içi tek-tık toggle (yıldız/bayrak
  ikonu), ortak liste, `Product.isFavorite`/`needsReview`.
- **Sezon (Yaz/Kış)** — elle atama, satır içi iki düğme, `Product.season`.
- **Mevsim ekseni** — 5. sekme, 1./2./3./4. Çeyrek çipleri, TÜM geçmiş
  satışlar TRY sabit (dönem/kanal/para süzgeci bu ekseni etkilemiyor).

### ⚠ KENDİ TESTİMİN YAKALADIĞI HATA (kaynak taramayla değil, DEĞER testiyle)
İlk yazımda arama `toLocaleLowerCase("tr")` kullanıyordu — TEK BAŞINA.
Türkçe kuralında ASCII **"I"** (barkod/SKU kodlarında sık) **"ı"**
(noktasız) olur; "HB-PHI-77" kodu tr-locale'de "hb-phı-77" olup düz "i"
ile yazan kullanıcının aramasıyla eşleşmiyordu. Kendi yazdığım değer testi
("arama: kanal kodunda geçen metin bulunur") bunu ANINDA yakaladı.
Düzeltme: hem düz `toLowerCase()` hem `toLocaleLowerCase("tr")` denenir,
biri eşleşirse yeter (`aramaEsleserMi`, `urun-analizi.ts`).

### ⛔ ŞEMA DEĞİŞİKLİĞİ — CANLIDA HENÜZ KOŞMADI
`Product.isFavorite` / `needsReview` / `season` (+ 2 indeks) — migration
`20260911071208_k212_urun_etiketleri` yerel geliştirme veritabanında
uygulandı ve doğrulandı (`migration:kontrol` ✓, `deploy:bekci` A/H ✓).
**CANLIYA henüz koşmadı** — `npm run canli:migrate` onay bekliyor. Kod bu
migration olmadan deploy edilirse `Product` sorguları 500 verir (K
"deploy edilen kod, koşulmayan migration" vakasının aynısı).

### Canlı veri doğrulaması (salt okuma, `scripts/tmp/`, silindi)
- Q3 için en yüksek cirolu 3 ürün: iki bağımsız yoldan (kütüphanenin
  mantığı + bağımsız sorgu) hesaplandı — **birebir aynı sonuç**.
- `urun-analizi:dogrula` 147/147 (11 bölüm, K212 için 31 yeni ölçüt).
  `tsc`/`lint`/`i18n`/`yerlesim`/`sunucu-eylemi`/`api`/`yetki` temiz.

### ─── ② DÜZELTME: ARAMA KAMERASIZ KALMIŞTI · 11.09.2026 · [YAZILDI — HALİL TESTİ BEKLİYOR]
Kullanıcı ekran görüntüsüyle bildirdi: _"barkod sadece yazılmasın, aynı
zamanda diğer taraflarda olduğu gibi kamera ile okutulabilsin."_ Haklıydı —
anayasanın İlke #7'si ("kod girilebilen her alan kamera destekler") ve
`kamera:dogrula`nın "hiçbir liste araması ÇIPLAK `<Input>` kullanmıyor"
desen-yasağı zaten VARDI, ama K212'nin arama kutusu bunu ÇİĞNEDİ ve bekçi
YEŞİL kaldı.

**Kök sebep — desen tek bir isme kilitliydi.** `kamera-dogrula.ts`'in
kontrolü yalnız `name="q"`/`name="bq"` arıyordu (öteki liste ekranlarının
tarihsel adlandırması); K212 yeni bir alan adı seçti — `name="arama"` —
ve desen onu hiç görmedi. _("Bekçi ölçütü elle tutulan liste değil,
tersten kurulur" kuralının kendisi de elle tutulu bir listeymiş — burada
bir ADLAR listesiydi, ekranlar değil.)_

**YAPILAN:**
- `src/app/rapor/urunler/analiz-arama-kutusu.tsx` (yeni, istemci bileşeni)
  → `BarkodGirisi` (kamera + USB okuyucu) doğrudan kullanılıyor, ortak
  `KodAramaKutusu` DEĞİL: o bileşen `suzgecAdresi` ile düz
  `Record<string,string>` kuruyor, bu sayfanın süzgeçleri ise TEKRARLI
  parametre taşıyor (`marka=LEGO&marka=Karaca`). Sayfanın KENDİ saf URL
  kurucusu (`analizAdresi`, `urun-analizi.ts`) doğrudan çağrıldı — ikinci
  bir URL kurma ölçütü YAZILMADI.
- `scripts/kamera-dogrula.ts` → desen-yasağı `name="arama"`yı da kapsayacak
  şekilde genişletildi ve YENİ bir "geçici, kasıtlı çıplak kutu" dosyasıyla
  mutasyonla sınandı (kırmızı yandığı görüldü, dosya silindi) — aynı hata
  bir sonraki farklı isimli arama kutusunda TEKRARLANMASIN diye.

### ─── ③ DÜZELTME: FİLTRE PANELİ YENİDEN DÜZENLENDİ · 11.09.2026 · [YAZILDI — HALİL TESTİ BEKLİYOR]
Kullanıcı: _"filtrelerin frontend'i daha efektif olabilir."_ Belirsizdi;
AskUserQuestion ile netleştirildi — kullanıcı üçünü BİRDEN seçti: **daha
kompakt**, **daha az tıkla sonuca ulaşılsın**, **görsel hiyerarşi/gruplama
netleşsin**.

**YAPILAN:**
- **Az tıkla** — Sırala/Yön/Satır Sayısı artık DEĞİŞİNCE ANINDA uygulanıyor
  (yeni `otomatik-gonder-secim.tsx`, `onChange` → `form.requestSubmit()`).
  Önceden Dönem/Kanal/Para/Etiket çipleri tek tıktı ama bu üçü hâlâ
  "Uygula" bekliyordu — tutarsızlık giderildi. En Az Adet/Ciro BİLEREK
  dokunulmadı: serbest metin, her tuşta göndermek sayfa geçişi demek.
- **Kompakt** — "Satır Sayısı" eskiden ekranın EN ALTINDA, ayrı bir
  satırdaydı; şimdi Sırala/Yön'ün yanında, TEK bir 5 sütunlu ızgarada
  (Sırala · Yön · Satır · En Az Adet · En Az Ciro). Bir satır tasarruf.
- **Gruplama** — büyük bölümler (Görünüm+Eşikler / Raf Yaşı / Dönem-Kanal-
  Para / Etiketler / Marka-Kategori / Uygula-Temizle) artık ince bir üst
  çizgiyle (`border-t`) ayrılıyor; göz hangi filtrenin hangi grupla
  ilişkili olduğunu daha kolay ayırt ediyor.
- Test: `scripts/urun-analizi-dogrula.ts`'e yeni bölüm (12.) — Sırala/Yön/
  Satır'ın `OtomatikGonderSecim` İÇİNDE olduğu, `analiz-satir` kimliğinin
  TEK yerde tanımlı kaldığı (eski blok gerçekten silindi, kopyalanmadı),
  En Az Adet/Ciro'nun hâlâ düz `<Input>` olduğu, `onChange`'in gerçekten
  `requestSubmit` çağırdığı — **4 mutasyonla** sınandı, hepsi kırmızı
  yandı, dosyalar bit-bit geri yüklendi.

### HALİL TESTİ — kapanma şartı (canlı migration koştuktan sonra)
1. `/rapor/urunler` → **Ara** kutusuna bir barkod/SKU yaz → doğru ürün(ler)
   listelenmeli. Ürün adının bir parçasını yaz → o da bulunmalı.
   **Ve** kamera ikonuna bas → telefon/tablette kamera açılmalı, bir
   barkod okutunca arama KENDİLİĞİNDEN çalışmalı (Ara'ya basmaya gerek
   yok). **Sırala**/**Yön**/**Satır sayısı** kutularından birini
   değiştir → sayfa KENDİLİĞİNDEN yenilenmeli, "Uygula"ya basmaya gerek
   kalmamalı.
2. Bir üründe **yıldız** ikonuna bas → favori işaretlenmeli (renk değişir),
   tekrar basınca kalkmalı. **Bayrak** ikonu için aynısı (incelenecek).
3. **Yaz**/**Kış** düğmesine bas → seçili görünmeli; tekrar basınca
   kalkmalı; ikisi birden AÇIK olamamalı (biri seçilince öteki kapanır mı
   diye bakılmaz — ayrı sorular, ikisi birden açık kalabilir; bu bilinçli).
4. Üstteki **"Yalnız favoriler"** çipine bas → yalnız favori işaretli
   ürünler görünmeli. **"Yalnız incelenecek"** için aynısı. **Mevsim**
   çiplerinde Yaz/Kış için aynısı.
5. **"Mevsimsel"** sekmesine geç → 1./2./3./4. Çeyrek çipleri görünmeli;
   birine bas → o çeyrekte (TÜM geçmiş yıllar) en çok satan ürünler
   sıralı gelmeli. Dönem/Kanal/Para kutuları bu sekmede GÖRÜNMEMELİ.
6. Favori/incelenecek/sezon işaretleri **başka bir sekmeye geçince de
   KORUNMALI** (aynı ürün "Dağılım"da da "Mevsimsel"de de aynı etiketi
   göstermeli — ortak, ürüne ait).
7. Mobilde (dar ekran): tüm yeni düğmeler 44px dokunma alanında olmalı,
   arama kutusu ve mevsim/çeyrek çipleri satır kırılmadan kullanılabilmeli.

Geçerse: kapat, ARSIV.md'e taşı (K212'nin "otomatik öneri yapılmadı"
kısmı ayrı, açık bir kalem olarak kalır — bkz. yukarıdaki gerekçe).

---

## ✅ K210 — ÜRÜN ANALİZİ: DÖNEM/KANAL/PARA FİLTRESİ EKLENDİ · 11.09.2026 → 19.09.2026 · [KAPANDI — Halil testi geçti]

> **HALİL TESTİ SONUCU (19.09.2026):** Kullanıcı doğruladı — geçti (K211 satır taşması düzeltmesi dahil).

Kullanıcı: _"bu sayfa bizim için çok değerli, verilerinde hata olmamalı,
bütün filtreler çalışmalı, BI olarak best practice hedeflenmeli."_

**Ölçülen boşluk:** `/rapor/urunler` sayfasında `pencere`/`baslangic`/
`bitis`/`kanal`/`para` parametreleri koddaydı ve sorguyu GERÇEKTEN
etkiliyordu (ölçüldü — `satisEkseniVerisi(pencere, paraBirimi, kanalKodu)`)
ama süzgeç çubuğunda bunları AYARLAYACAK hiçbir görünür kontrol yoktu —
yalnız gizli alan olarak taşınıyorlardı. Sıralama (`SIRALAMA_ALANLARI`)
zaten her görünen sütun için vardı (dropdown), o taraf gerçek bir boşluk
değildi.

**Yapılan:** `analiz-suzgeci.tsx`'e üç yeni bölüm eklendi (yalnız
`eksen !== "stok"` — stok ekseni bu üçünü hiç parametre almıyor):
- **Dönem** — Bu Ay/Son 3 Ay/Son 6 Ay tek-tık çip + "Özel aralık"
  `<details>` içinde kendi küçük formu (JS'siz, `pencere=OZEL` çakışmasın
  diye ayrı form).
- **Kanal** — aktif kanallardan (`prisma.channel.findMany`) türetilen
  çipler. `hamSatirlar`dan DEĞİL: kanal DB sorgusunda süzülüyor, süzülmüş
  satırdan seçenek türetilseydi seçili olmayan kanallar listeden düşerdi.
- **Para birimi** — TRY/EUR çip.

**Canlı veri doğrulaması (salt okuma, `scripts/tmp/`, silindi):** bu ayın
en yüksek cirolu 3 ürünü İKİ bağımsız yoldan hesaplandı (kütüphanenin
kendi mantığı + bağımsız `groupBy`) — **birebir aynı sonuç.** `urun-analizi:
dogrula` 116/116, `tsc`/`lint`/`i18n`/`yerlesim` temiz.

### HALİL TESTİ — kapanma şartı
1. Canlıda `/rapor/urunler` aç → "Dağılım" sekmesi.
2. **Dönem** satırında "Son 3 Ay" çipine bas → liste ve toplamlar değişmeli,
   URL'de `pencere=SON_3_AY` görünmeli.
3. "Özel aralık" aç → iki tarih gir → Uygula → seçtiğin aralık uygulanmalı.
4. **Kanal** satırında bir kanala bas (ör. Hepsiburada) → yalnız o kanalın
   satışları görünmeli; "Tüm kanallar" ile geri dönülebilmeli.
5. **Para birimi**nde EUR'a bas → yalnız EUR satışlar (varsa) görünmeli;
   yoksa boş liste + "süzgeci gevşetin" notu görünmeli (sessiz boş liste
   OLMAMALI).
6. Marka/kategori/min adet/min ciro/raf yaşı kovası/sıralama/satır sayısı
   filtrelerinin HİÇBİRİ bu değişiklikle bozulmamış olmalı — hepsini tek
   tek dene.
7. Mobilde (dar ekran) aynı adımlar — çipler ve `<details>` formu 44px
   dokunma alanında olmalı.

Geçerse: kapat, ARSIV.md'e taşı. Geçmezse: ekran görüntüsüyle bildir.

### ─── ② K211 — UZUN ÜRÜN ADI SATIR TAŞMASI (kullanıcı canlıda buldu, 11.09.2026)

K210'u test ederken ekran görüntüsüyle bildirildi: uzun ürün adları
(ör. "Philips 7000 Serisi Buharlı Ütü — 2800W, SteamGlide Plus Taban...")
hücre dışına taşıp ALTTAKİ satırın kimlik kodlarının (barkod/kanal SKU)
üstüne biniyordu. **K210'un DEĞİL, önceden var olan bir bug** — bu satır
hiç dokunulmamış koddaydı, K210'un getirdiği süzgeçlerle ilgisi yok, kullanıcı
sadece o ekranı açıkken fark etti.

**Kök sebep:** `ui/table.tsx`'teki `TableCell` varsayılanı
`whitespace-nowrap` (para/tarife bölünmesin diye, bilinçli) — ürün adı
hücresi bunu geri almıyordu, uzun başlık satır yüksekliğini büyütmeden
kutunun dışına taşıyordu.

**Düzeltme:** ürün adı hücresine `whitespace-normal` + `line-clamp-2`
(`kanal-sku/page.tsx`'teki AYNI desen — ad uzun ve kullanıcı okumak
istiyor ama satır sınırsız uzamasın).

Halil testine ek madde: **8.** yukarıdaki test listesinde, ürün adı çok
uzun bir kalem varsa (ör. Philips ütü) o satırın metni ALTTAKİ satıra
binmemeli, en fazla 2 satırda kalıp "…" ile kesilmelidir.

---

## ✅ K194 — N11'E STOK/FİYAT GÖNDERİMİ (İKİNCİ KANAL) · 09.09.2026 → 11.09.2026 · [KAPANDI — Halil testi geçti]

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

### ⭐ HALİL TESTİ (11.09.2026) — GEÇTİ

Gerçek üründe (`/urunler/...`, LEGO City Acil Yardım Ambulansı 60451,
varyant OYU-LG-LC-02) "N11'e Gönder" denendi. Kullanıcı onayı: _"K194'ü
kapatabilirsin, geçti testten."_

⚠ **HB YAZICISI BU KAPANIŞA DAHİL DEĞİL — AYRI, AÇIK KALDI.** `stock-uploads`
ve `price-uploads` uçlarının tam yolu + gövdesi hâlâ net değildi; bu kalem
BEKLEYENLER.md'de kendi başlığı altında AÇIK bırakıldı (bkz. "HB'ye
stok/fiyat gönderimi").

---

## ✅ K195③ — TAKİP KODU VE KARGO FİRMASI: "HB VERMİYOR" YANLIŞ UCA BAKIYORMUŞ · 10.09.2026 → 11.09.2026 · [KAPANDI — Halil testi geçti]

⚠ **K195'İN DEVAMIYDI — K195 ANA KALEMİ VE ②'Sİ AYRI, HÂLÂ AÇIK.** Bu yalnız
③ alt kaleminin kapanışıdır (aynı kural, K195-2'de uygulandığı gibi: parça
parça kapanır).

> **Kullanıcı sordu (10.09.2026):** _"hepsiburada siparişlerinde kargo takip
> numarasını çekmiyor niye acaba, sistemde var hâlbuki — ismi teslimat
> numarası olarak geçtiği için mi?"_ Ekran görüntüsü: sipariş 4136602020,
> Selliora'da "Kargo takip no" boş, HB'nin kendi panelinde **"TESLİMAT
> NUMARASI 62755152995927"** açıkça yazılı.

⛔ **YUKARIDAKİ "HB TAKİP/FİRMA VERMİYOR" TESPİTİ (K195-2) DOĞRU ÖLÇÜLMÜŞTÜ
AMA YANLIŞ UCA BAKIYORDU.** `/shipped` ve `/delivered` (K195'in okuduğu
uçlar) **gerçekten** bu iki alanı vermiyor — ölçüm o kapsamda doğruydu.
Ama TAM KAYIT ucu (`siparisDetay` — "kaçak" yeni sipariş oluştururken zaten
çağrılıyordu) `items[].barcode` ve `items[].cargoCompanyModel.name`
TAŞIYOR. Canlı HB API'sinden doğrudan çekildi (10.09.2026):

    "barcode": "62755152995927"          ← ekrandaki "TESLİMAT NUMARASI" BİREBİR
    "cargoCompanyModel": { "name": "hepsiJET" }

⚠ **VE VERİTABANI SORGUSU DA CANLIDAN YAPILDI** (`.env.canli` →
`CANLI_DATABASE_URL`, `canli-migrate.ts` ile AYNI güvenlik deseni: yerelMi
kontrolü, parola ekrana yazılmaz, çocuk sürece yalnız ortam değişkeniyle
geçer). Ölçüldü:

    HB toplam                          3329
    shipmentCode BOŞ                   3274  (%98,3)
    kargoya verilmiş AMA kodu BOŞ        26  (73 gönderilmişin %36'sı)
    kanalKargoFirmasi DOLU                0  (%0)

### DÜZELTME — İLK SÜRÜM, VE HALİL TESTİNİN BULDUĞU İKİNCİ KUSUR

`canli-hb-ice-aktar.ts`'e üçüncü bir geri doldurma adımı eklendi:
`shipmentCode` boş siparişler için `siparisDetay` çağrılır, `barcode`→
`shipmentCode` ve `cargoCompanyModel.name`→`kanalKargoFirmasi` yazılır.

⛔ **İLK KOŞUL YANLIŞ ÇIKTI — HALİL TESTİ AYNI GÜN YAKALADI.** İlk sürüm
`shippedAt: { not: null }` şartı koyuyordu ("kargoya verilmemiş siparişte
henüz barkod yoktur" varsayımı). Halil az önce satılmış bir HB siparişini
(4529951386) test etti, alan yine boş kaldı. Canlı HB API'sinden ölçüldü:

    status: "Packaged"   ← "Shipped" DEĞİL
    barcode: "62755155627683"   ← ZATEN DOLU

**Barkod "Packaged" durumunda hazır oluyor — "Shipped"ten ÖNCE.** Yani
`shippedAt` şartı barkodun VAR OLDUĞU anı değil ONDAN SONRAKİ bir anı
arıyordu; tam bu yüzden az önce satılan sipariş hiç denenmiyordu.

**DÜZELTİLMİŞ KOŞUL ÖLÇÜLEREK KURULDU** (yaş dağılımı, canlı, 10.09.2026):

    son 1-14 gün, shipmentCode boş      1   ← tam bu vaka
    son 30 gün                          4
    son 90 gün                        137
    TÜM ZAMANLAR (önceki ölçüm)       3274

3274'ün ezici çoğunluğu K195'ten ÖNCEKİ çok eski satış — bir daha
denemenin faydası yok. Koşul artık: **"kargoya verilmiş OLARAK
İŞARETLENMİŞ (her yaştan) YA DA son 30 günde satılmış (durumundan
bağımsız)"** — hem dünkü 26'lık backlog'u hem bugünkü "Packaged" vakasını
kapsıyor, eski/durgun kayıtları bir daha denemiyor.

⛔ **BÖLÜNMÜŞ PAKET UYDURULMAZ:** bir siparişin kalemleri FARKLI barcode ya
da FARKLI firma taşıyorsa (birden fazla fiziksel paket), o alan **atlanır
ve sayılır** — tek bir değer varmış gibi tahmin edilmez.

⛔ **YÜK TAVANLANDI:** `KOD_GERI_DOLDURMA_TAVANI = 100` — her koşumda en
fazla 100 ekstra `siparisDetay` isteği, en yeni siparişten geriye doğru.

⚠ **EZME YOK — İKİ ALAN İKİ AYRI YAZMA:** `shipmentCode` ve
`kanalKargoFirmasi` ayrı `updateMany` çağrılarıyla, her biri kendi NULL'ına
yazılır — biri dolu öteki boşken tek sorgu doluyu haksız ezerdi.

### ✅ DOĞRULAMA — CANLIDA GERÇEKTEN KOŞULDU VE ÖLÇÜLDÜ

Düzeltme sonrası `npx tsx scripts/canli-hb-ice-aktar.ts` (önizleme kipi —
bu üç geri doldurma adımı `--yaz` gerektirmeden, K195'teki üç kardeşiyle
AYNI şekilde koşar) canlıya karşı çalıştırıldı:

    TAKİP KODU GERİ DOLDURULDU (K195-3)   3
    KARGO FİRMASI GERİ DOLDURULDU (K195-3) 4
      ├─ aday (bu tur, tavan 100)          5

Ardından sipariş 4529951386 **canlı veritabanından** okundu:

    shipmentCode:      "62755155627683"   ← HB API'sindeki barcode İLE BİREBİR
    kanalKargoFirmasi: "hepsiJET"         ← BİREBİR
    shippedAt:         null                ← DOĞRU (henüz Shipped değil, Packaged)

`tsc` temiz. `kargo-damgasi:dogrula` 57/57, `kanal-yazma:dogrula` 37/37,
`kargo-damgasi-mutasyon:kontrol` 15/15 kırmızı yandığı görülerek.

### ⭐ HALİL TESTİ (11.09.2026) — GEÇTİ

Sipariş 4529951386 gerçek cihazda `/satislar`de açıldı: "Kargo takip no"
alanı "62755155627683" gösterdi, kargo firması "hepsiJET" göründü.
Kullanıcı onayı: _"tamam."_

---

## ✅ K203 — AYNI ÜRÜNDEN BİRDEN FAZLA ADET: TEK OKUTMA YETMİYORDU · 10.09.2026 → 11.09.2026 · [KAPANDI — Halil testi geçti]

> **Halil fotoğrafla buldu:** `/paketle`de TEFAL MB470B, tek kalem, **adet
> 2**. Raftan bir tanesini okutunca ekran _"Eşleşti — doğru ürün.
> Paketleyebilirsiniz."_ dedi — ikinci fiziksel birim hiç doğrulanmadan.

⛔ **KÖK SEBEP:** `PaketKalemi.teyitli` bir **boolean**'dı — "en az bir kez
okutuldu mu" sorusuna cevap veriyordu, **"kaç kez okutuldu"** sorusuna değil.
`adet: 2` olan bir kalemde tek okutma tüm satırı teyitli işaretliyor ve
`paketlenebilirMi` "Paketlendi" düğmesini açıyordu.

⚠ **25.08'DEKİ "ÇOK KALEMLİ SİPARİŞ" KARARIYLA KARIŞTIRILMAZ.** O karar
(bir kalem teyitli bugün yeterli) **KALEM SAYISI**yla ilgili — sipariş içinde
kaç FARKLI ürün olduğu. K203 farklı bir soru: **TEK kalemin İÇİNDEKİ adet**.
İkisi bağımsız, biri ötekini kapatmıyor.

### DÜZELTME

`teyitli: boolean` → `teyitliAdet: number`. Her başarılı okutma sayacı 1
artırır, `adet`te **tavanlanır** (`Math.min`). `kalemTamTeyitliMi(k)` eşiği
**tek yerde** tutuyor — çağıranlar kendi `>= adet` karşılaştırmasını
yazmıyor, ayrışma riski kapandı.

**Ekran üç mesaj gösteriyor (sessiz kalan yok):**

    devam ediyor   "Eşleşti — 1/2 okutuldu. Bu üründen 1 tane daha okutun."
    tamamlandı     "Eşleşti — doğru ürün. Paketleyebilirsiniz."
    zaten tam      "Bu ürün için gereken 2 adedin hepsi zaten okutulmuştu —
                    fazladan okutmaya gerek yok."

Kalem satırındaki **Adet kutusu artık `okutulan/toplam`** gösteriyor
(`1/2`, `2/2`) — adet 1 olsa bile aynı biçimde (İlke #10: aynı işlem her
yerde aynı görünür). Kısmi teyit **tam teyitle aynı yeşile boyanmıyor**
(`DURUM_KUTUSU.bilgi`) — aksi hâlde "bitti" yanılgısı üretirdi.

### DOĞRULAMA

`paketleme:dogrula` **102/102** (23'ü yeni). Asıl vaka **mutasyonla
sınandı**: `kalemTamTeyitliMi` eski davranışa (`teyitliAdet > 0`)
döndürüldüğünde iki test **kırmızı yandığı görülerek** doğrulandı, sonra
geri yüklendi. `tsc` + `lint` + `i18n:kontrol` + gerçek `next build` (98s)
temiz. Push'un kendi pre-push turu **126/126 yeşil**.

### ⭐ HALİL TESTİ (11.09.2026) — GEÇTİ

Gerçek 2+ adetlik bir siparişte `/paketle`de denendi: "1/2 okutuldu" ve
"2/2" mesajları sırasıyla doğru çıktı, düğme yalnız ikinci okutmadan sonra
açıldı. Kullanıcı onayı: _"bu tamam."_

---

## ✅ K197-⑤ — KANAL DESİSİ ARTIK ÜRÜN KARTINDA · 10.09.2026 → 11.09.2026 · [KAPANDI — Halil testi geçti]

⛔ **YENİ SATIR AÇILMADI — BU K197'NİN DEVAMIYDI.**

> **Kullanıcı sordu:** _"API'den desileri çekemiyoruz"_ (Trendyol ve
> Hepsiburada'da da).

⛔ **KANAL VERİSİ ZATEN GELİYORDU — TÜKETİCİSİ HİÇ YOKTU.** Ölçüldü:
`kanalKargoDesi` canlıda TY %85, HB %80 dolu (09.09'dan bu yana). Ama
`src/app` altında bu alana **sıfır** referans vardı — K197'nin kendi
"açılış şartı" notu ("örneklem anlamlı olunca") artık dolmuştu: **182
farklı varyantın** en az bir örneği, **73 varyantın 3+ örneği** var.

### YAPILAN

`/kart/[variantId]` sayfasına kanal ortalaması eklendi. Saf gövde
(`kanalDesiOrtalamasi`, `src/lib/urun-karti-verisi.ts`) DB'siz sınanabilir
— `kartVerisiniTopla` onu çağırır, kopyalamaz.

⛔ **İKİ SÜZGEÇ, İKİSİ DE GEREKÇELİ:**
1. **Yalnız TEK KALEMLİ satışlar** — `kanalKargoDesi` PAKETİN TAMAMI,
   bu ürünün kendisi değil. Çok kalemli bir siparişte bu değeri kullanmak
   yanlış bir "ürün desisi" üretirdi.
2. **ADEDE bölünür** — K203'ün aynı dersi: tek kalemde adet > 1 olabilir,
   paket desisi birim desisi değildir.

Ürün kartında kanal ortalaması farklıysa **"bu değere güncelle"** çıkar;
tek tıkla `Product.desi` yazılır, iz bırakır (`URUN_DESI_KANALDAN_GUNCELLENDI`).
Aynıysa düğme hiç çıkmaz (gereksiz eylem gösterilmez). 3'ten az örneklemde
"az örneklem" notu düşer ama düğme yine de çalışır (uyarı sorar, ısrar
engellemez).

⚠ **SUNUCU EKRANA GÜVENMEZ:** istemciden yalnız `variantId` gider,
ortalama SUNUCUDA yeniden hesaplanır — ekranda geçen sürede yeni bir
satış girmişse bayat rakam donmaz.

### DOĞRULAMA

`kart:dogrula` **119/119** (8'i yeni). Asıl mantık mutasyonla sınandı:
çok-kalemli filtre kaldırıldığında ilgili test **kırmızı yandığı
görülerek** doğrulandı, sonra geri yüklendi. `tsc` + `i18n:kontrol` +
`lint:dogrula` + gerçek `next build` (73s) temiz.

### ⭐ HALİL TESTİ (11.09.2026) — GEÇTİ

**Örnek:** `/kart/131d781b-b908-4a8f-bd3d-1737f4597045` (SKU `axcali1773`,
Karaca Misto 6 Parça Standlı Servis Seti). Kullanıcı doğruladı: kart
sayfasında kanal ölçümü ve "bu değere güncelle" bağlantısı göründü, tıklayınca
değer güncellendi. Kullanıcı onayı: _"bu tamam."_

---

## ✅ K180-② — KALDIRMA, GİRİŞİN GERÇEKLİĞİNİ ÖLÇMÜYOR · 07.09.2026 → 11.09.2026 · [KAPANDI — mimar kararı]

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

### ③ GEÇİCİ FREN — ÖNİZLEMEDE UYARI (KALICI OLDU)

Genel ölçüt gelene kadar kaldırma önizlemesi kullanıcıya **stoğu kontrol
etmesini** söylüyor (`kagitGirisUyarisi`, sözlükten). Sessizce yanlış stok
yazmaktansa kontrolü söylemek — bu uyarı KAPANIŞTAN SONRA DA YERİNDE KALDI,
zararsız bir güvenlik ağı.

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
ve parti bu satırla aynı koşumda mı doğdu. **BU EKSEN HİÇ YAZILMADI —
kapanış kararı aşağıda.**

### ⭐ KAPANIŞ (11.09.2026) — MİMAR KARARI: PRATİKTE SORUN YOK

Bulunan tek somut vaka (`10559161422`) elle düzeltilmişti (② adımı) ve
ledger/FIFO **0**'da duruyor — bugün hiçbir bozuk kayıt yok. Genel bir
otomatik-tespit mekanizması için **iki aday ölçüt ölçülüp ikisi de elendi**
(④). Mimara üçüncü bir aday ölçütün (parti "öksüz" kalıyor mu) yazılıp
yazılmayacağı soruldu; karar: **"stokta problem yok, kapat."**

> **KURAL:** kalıcı geçici fren (③, `kagitGirisUyarisi`) YERİNDE KALIYOR —
> gelecekte benzer bir vaka çıkarsa kullanıcı zaten uyarılıyor ve elle aynı
> şekilde düzeltilebilir. Genel otomasyon **istenmedi**; bu bir teknik
> yetersizlik değil, mimarın **risk toleransı kararıdır** — nadir görülen
> bir kenar durumu için üçüncü bir ölçüt denemesi (ilk ikisi yanlış çıkmıştı)
> bu aşamada değerli görülmedi.
> _("Kapatma kararı da panoya yazılır" kuralı: "bakılmayacak" da bir sonuçtur.)_

---

## ✅ K-HB-KAPSAM — TUTAR KAYNAĞI ÖLÇÜLDÜ, MİMAR KABUL ETTİ, YAZIM ZATEN GERÇEKLEŞMİŞ · 07.09.2026 → 11.09.2026 · [KAPANDI]

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

### HÜKÜM (07.09.2026) — ÖLÇÜT HARFİYEN "DURUR", ATIF İSE BAŞKA YERİ GÖSTERİYOR

Ölçüt `tutmayan === 0` istiyor; 4 var → **DURUR**, mimara rapor.
⏭ **KARAR MİMARINDIR:** dört başarısızlık *"tutar kaynağı şüpheli"* mi demek,
yoksa *"hakediş eksik yazılmış"* mı? Ölçüm ikincisini gösteriyor (açık = HB
indirimi, kuruşuna) ama **ölçütü gevşetmek ölçümü yapanın işi değildir.**
_(Anayasa: "eşiği soruyu soran koyamaz".)_

⛔ **07.09.2026'DA HİÇBİR ŞEY YAZILMADI.** Enumerasyon genişletilmedi, iki
sipariş (`4873413946` · `4707418677`, ₺9.078) yazılmadı; `--sadece=` onay
süzgeci bu iki siparişe kilitli olarak koda yazıldı (K165 script'i) ama
tetiklenmedi.

### ⭐ KAPANIŞ (11.09.2026) — MİMAR KABUL ETTİ, KONTROL EDİLDİ: YAZIM ZATEN OLMUŞ

Mimara (kullanıcıya) AskUserQuestion ile soruldu: _"4 siparişteki tutmazlığın
sebebi (HB'nin hakediş kaydı indirimi eksik yazmış) kabul edilsin ve kalan
131/131 'sağlam' sayılıp o 2 kayıp sipariş (₺9.078) siparişin kendi
fiyatıyla deftere işlensin mi?"_ — **"Evet, açıklamayı kabul et, yaz"**
seçildi.

Onaylanan `--sadece=4873413946,4707418677` yazımı ÇALIŞTIRILMAK üzere önce
önizleme (`--yaz` olmadan) koşuldu — ve KAÇAK RADARI **0** döndü: her iki
sipariş de defterde **zaten VARDI**, tutarlar (`₺5.979` · `₺3.099`,
toplam ₺9.078) beklenenle **kuruşuna** tutuyordu. 07.09'dan bu yana geçen
dört günde (K184②③④, K195, K197, K201 iyileştirmeleri) normal periyodik HB
çekimi bu iki siparişi zaten doğru fiyatla yakalamış — özel bir yazım
gerekmedi, mimarın onayı fiilen zaten gerçekleşmiş bir durumu doğruladı.

> **KURAL:** bir yazım onaylandığında, yazımdan ÖNCE mevcut durum kontrol
> edilir — aradan geçen sürede normal operasyon aynı sonucu zaten üretmiş
> olabilir. Kontrol etmeden "yazdım" demek, gereksiz bir ikinci yazım (ya da
> daha kötüsü, sessizce farklı bir tutarla ikinci kayıt) riski taşırdı.

---

## ✅ K205 — ÇEKİM BİRİNCİLİ cron-job.org'A TAŞINDI, HB'NİN GERÇEK ENGELİ BULUNDU · 10.09.2026 · [KAPANDI — canlı]

> **Kullanıcı sordu:** _"Sistemin pazaryerlerinden bilgi yenilemesini benim
> bilgisayarimdan bagimsiz hale nasil getirebiliriz."_

⛔ **KÖK SEBEP VERCEL KİMLİK BİLGİLERİ DEĞİLDİ — İLK TEŞHİS YANLIŞTI.**
GitHub Actions'ın gerçek çalışma geçmişi API'den çekildi: HB adımı
08.09.2026'dan beri **her koşumda** 401 `{"durum":"YETKISIZ"}` alıyordu.
Bu yanıt `hb-cekim/route.ts`'in kendi kodunda YOK (o 404/503 döner) —
`src/proxy.ts`'teki genel giriş duvarı isteği kendi `CRON_SECRET`
kapısına ulaşmadan reddediyordu. `ACIK_YOLLAR` listesine `hb-cekim`
(08.09'da eklenirken) ve `/api/olcum` (hiç) yazılmamıştı.

⭐ **AYNI HATA İKİNCİ KEZ — K166'NIN KENDİ DERSİ TEKRARLANMIŞTI.** TY için
05.09'da BİREBİR aynı şey yaşanmış, elle düzeltilmiş ama bir bekçiye
çevrilmemişti. `cron-yollari:dogrula` yazıldı: `CRON_SECRET` kullanan
HER `route.ts` taranır (klasör adına değil davranışa bağlı — `/api/olcum`
"cron" klasöründe değil ama aynı deseni taşıyor), her biri `ACIK_YOLLAR`'da
mı diye doğrulanır. Mutasyonla sınandı: bir satır silindiğinde kırmızı
yandığı görüldü.

**AYRI BİR ÖLÇÜM DAHA:** GitHub Actions'ın "10 dakikalık" zamanlaması
GERÇEKTE 2-6 saat arayla tetikleniyordu — GitHub'ın kısa aralıklı
`schedule:` tetikleyicileri için belgelenmiş bir platform sınırı,
düzeltilemez.

### DÜZELTME — İKİ KATMAN

1. **Kod:** `src/proxy.ts`'e iki satır (`/api/cron/hb-cekim`,
   `/api/olcum`) + `cron-yollari:dogrula` bekçisi. Push edildi, canlıda
   doğrulandı (`curl` ile bizzat çağrıldı — HB 200, gerçek çekim koştu:
   59 sipariş, 0 hata).
2. **Mimari:** birincil tetik **cron-job.org**'a taşındı (üçüncü taraf,
   dakika hassasiyetinde, hem bilgisayardan hem GitHub'ın kendi
   zamanlama sınırından BAĞIMSIZ) — Vercel uçlarını (`ty-cekim` ·
   `hb-cekim` · `n11-cekim`) doğrudan çağırıyor. Kullanıcı kurdu, üçü de
   canlıda **200 OK** görüldü.

### ROL DEĞİŞİKLİĞİ — KULLANICI KARARI: "2) YEDEK, SEYREK"

    cron-job.org (5 dk)              → BİRİNCİL (yeni)
    GitHub Actions (10 dk, "elinden gelince" — gerçekte 2-6 saat) → YEDEK
    Görev Zamanlayıcı (5 dk → 1 SAAT) → YEDEK, seyrekleştirildi

Windows Görev Zamanlayıcı'daki `Selliora Kanal Sik Cekim` görevi
**kaldırılmadı**, aralığı `PowerShell Set-ScheduledTask` ile 5 dakikadan
**1 saate** çekildi (`scripts/kanal-sik-cekim.cmd`'e dokunulmadı — aralığı
görev tanımı tutuyor, betik değil). Üç kaynağın aynı anda çalışması
zararsız — çakışan sipariş atlanır, ezme yok.

⚠ **ESKİ GEREKÇELER SİLİNMEDİ, ÇEVRİLDİĞİ YAZILDI:** hem
`.github/workflows/ty-cekim.yml`'in "birincil" iddiası hem
`kanal-sik-cekim.cmd`'in kendi rol notu güncellendi — biri "10.09'da
ikinci kez rol değişti" diyor, öteki "5 dk → 1 saat, bilgisayar zaten
açıkken bedava yedeklilik ama artık kritik değil" diyor.

### AYRI, KAPANMAMIŞ: `/api/yedek/otomatik` (günlük yedek) → **bkz. BEKLEYENLER.md K206**

Bu düzeltmeyle **ilgisiz** bir ayrı arıza bulundu: canlıda test edilince
`"Error: Vercel Blob: This store has been suspended."` döndü. K192'nin
(Blob kotası) bir tekrarı olabilir — **ölçülmedi**, açık kalem olarak
panoya taşındı, burada kapatılmadı.

### DOĞRULAMA

`ice-aktarma:dogrula` 419/419, `cron-yollari:dogrula` 8/8 (mutasyonla
sınandı), `gecici:dogrula` 11/11. Push'un pre-push turu 127/127 yeşil.
Canlıda üç uç da `curl` ve cron-job.org'un kendi geçmişiyle **200 OK**
doğrulandı — bu, betikle değil gerçek üretimde ölçülmüş bir kapanış.

---

## ✅ K202 — BEKÇİ TURU VERGİSİ: KÖK SEBEP + İKİ DÜZELTME · 09.09.2026 · [KAPANDI]

> **Halil açtı 09.09:** tur **15,8 → 39,6 dakika** (2,5×). Aynı gece
> bilgisayar kapanması bir mutasyon turunu **yarıda kesti** ve
> `kanal-kargo-damgasi.ts` **8695 baytın tamamı sıfır** hâlde bulundu —
> `finally` bloğuna ulaşamayan bir harness, mutantı diskte donmuş
> bıraktı. HEAD'den geri yüklendi, 15/15 mutasyon kırmızı yandığı
> görülerek doğrulandı.

### ÖLÇÜM — dört aday, ikisi doğrulandı, ikisi kapandı

**Tur 1 (DB kapalı, ölçülmeden koşuldu):** 25,0 dk, 120/124 yeşil, 4
kırmızı — hepsi **AYNI kök sebep**: `ECONNREFUSED 127.0.0.1:3306`,
bilgisayar kapanmasından sonra yerel MySQL bir daha başlatılmamış.

    yedek:dogrula   493,8s → 6,8s   (47 tablo × ~10,5s havuz zaman aşımı)
    fifo:dogrula     32,0s → 2,7s
    iade:dogrula     21,9s → 2,4s
    toplu:dogrula    21,7s → 2,1s
    ────────────────────────────
    569,4s (%38 of 1499s) SADECE bağlantı beklemesi, gerçek iş değil

**Tur 2 (DB açık, temiz):** 18 dk 38 sn, 124/124 yeşil. DB kapalılığı
**tek** sebep değildi — taban hâlâ 15,8 dk'nın üstünde:

    23 mutasyon bekçisi   = 640,0s (%57,8) ← EN GÜÇLÜ AÇIKLAMA
    diğer 101 bekçi       = 467,1s (lint 153s + derleme 85s + tsc 22s + 98×~2s)

**Dört hipotez, nihai:**
| hipotez | sonuç |
|---|---|
| ① bekçi sayısı arttı | **DOĞRULANDI** — mutasyon kategorisi turun çoğunluğu ve her oturumda büyüyor |
| ② tek bekçi ağır | `yedek:dogrula`'da GERÇEK bir tasarım açığı (erişim kontrolü yok) — düzeltildi (SORUN A) |
| ③ eşzamanlı çekim | **KAPANDI** — çekim yalnız Vercel Cron'da, yerel turla çakışamaz |
| ④ ortak ön-yükleme | desteklenmedi — 98 bekçi ~2,1s/komut, normal süreç başlatma maliyeti |

### SORUN A — `yedek:dogrula` sağlık sondası

`src/lib/db-saglik.ts` — ham `net.connect` ile TEK hızlı TCP denemesi
(Prisma havuzuna dokunmadan). DB kapalıysa GERÇEK TUR (47 tablo) hiç
başlamıyor, **görünür** uyarı basıyor:

    TÜM KONTROLLER GEÇTİ (45) — ⚠ GERÇEK TUR ATLANDI (DB erişilemedi, bkz. yukarı)

⚠ **GÖRÜNÜRLÜK `bekci.ts`'in TEK SATIRLIK özetine kadar** izlendi:
`ozetle()` `.find()` ile "KONTROL"/"GEÇTİ" geçen İLK satırı seçiyor —
atlama uyarısı KAPANIŞ satırının kendisine eklendi, aradaki hiçbir satır
"KONTROL"/"GEÇTİ" içermediği doğrulanarak (tek eşleşme olduğu ölçüldü).

**Doğrulandı — iki yönde de:**
- DB açık: 56/56 kontrol, atlama YOK (regresyon yok) — `TÜM KONTROLLER GEÇTİ (56)`
- DB kapalı (simüle, gerçek DB'ye dokunmadan `DATABASE_URL` override): 45/45,
  **3,4 saniye** (494 → 3,4s), atlama görünür

Değer testi `db-saglik:dogrula` (7/7) — gerçek soket açıp kapatarak
AÇIK↔KAPALI ayrımını ölçer, kaynak taraması değil.

### SORUN B — 23 mutasyon bekçisi paralel (push kapısında KALDI)

⛔ **PARALELLEŞTİRMEDEN ÖNCE ÇAKIŞMA TARANDI** — iki harness AYNI hedef
dosyayı mutasyona uğratıp `finally`de geri yazıyorsa paralel koşum YARIŞ
DURUMU üretir (bugün onarılan sıfır-bayt bozulmasının kesinti YERİNE
eşzamanlılıkla üretilen türü). `scripts/mutasyon-hedefleri.ts`
`readFileSync`/`writeFileSync` çağrılarını kaynaktan takip ederek GERÇEK
hedefleri çıkardı:

    messages/tr.json           ← kare-tanisi · mal-kabul · toplu-kargo
    src/app/page.tsx           ← mal-kabul · panel · urun-analizi
    src/app/satislar/page.tsx  ← liste-hafizasi · toplu-kargo
    src/lib/panel.ts           ← aylik-marj · panel

`mal-kabul` ve `panel` köprü — 7 harness TEK bağlı küme
(`SIRALI_MUTASYON_GRUP`), kalan 15 tam paralel (eş zamanlı sınır 4 =
ölçülen CPU sayısı). Beyan `mutasyon-cakisma:dogrula` ile her koşumda
gerçek taramayla karşılaştırılıyor — mutasyonla sınandı: beyandan bir
isim silindiğinde KIRMIZI yandığı görüldü.

⛔ **ÇIKARILMADI — SADECE HIZLANDI.** Seyrek CI'ye taşıma REDDEDİLDİ:
mutasyon bekçileri push anında çapa-kopmasını yakalıyor (aynı gün
stok-siralama + urun-analizi vakaları) — seyrek koşarsa "push edildi,
koruması kör" penceresi açardı.

**Sonuç ölçüldü:** 126/126 yeşil (2 yeni bekçi dahil), **0 KIRMIZI**,
**18 dk 38 sn → 14 dk 15 sn** (duvar saati, **%23,5 daha hızlı**).
Çakışan 4 dosyada (panel.ts · tr.json · page.tsx · satislar/page.tsx)
null bayt / bütünlük kontrolü temiz, ağaçta mutant artığı yok.

⚠ **İKİ SAYI AYRI TUTULDU:** paralel koşumda "bekçi süreleri toplamı"
(1536s) duvar saatinden (855s) BÜYÜKTÜR — aynı anda geçen saniyeler
birden çok kez sayılıyor. Kapanış satırı bunu açıkça yazıyor.

**Yan bulgu — ilk deneme çöktü, düzeltildi:** `bekci.ts`'e top-level
`await` yazıldı ve `Top-level await is currently not supported with the
"cjs" output format` ile çöktü (bu depo `tsx`i CJS'e derliyor — diğer
betiklerin `main().catch(...)` deseni kullanmasının sebebi buymuş).
`main()` sarmalayıcısına çevrildi, ikinci koşum temiz geçti.

_(Bu, "eşik ölçüldüğü popülasyonun dışına uygulanamaz" ve "bir sınırın
yönü ölçülmeden çevrilmez" derslerinin PARALELLEŞTİRME tarafı: paralel
koşum "bağımsız" olduğu VARSAYILARAK değil, dosya hedefleri TARANARAK
güvenli hâle getirildi.)_

---

## ✅ K-HB-ELLE-KIYAS — ELLE GİRİLEN HB SİPARİŞLERİ ↔ API · 07–08.09.2026 · [KAPANDI]

> **KAPANIŞ CÜMLESİ (mimar):** _"Elle 62 siparişte **sistematik sapma YOK**;
> 56 birebir, tekil farklar net **₺35,56**, hakem hakedişte."_

**KAYNAK:** `veri/ozel/k-hb-elle-kiyas-2026-09-07.csv` (66 satır = 1 başlık +
**65 kayıt**). Dosya `veri/ozel/` altında ve `.gitignore`da — gerçek sipariş
verisi depoya girmez; arşiv dosyayı **adlandırır**, taşımaz.

### SAYIM MUTABAKATI — mimar kararlardan ÖNCE istedi, üçü de kapandı

    65 = 56 (a birebir) + 1 (b) + 6 (c) + 2 (d)        ← CSV'den yeniden sayildi
    kaynak: 62 ELLE + 1 OTOMATIK + 2 YOK (defterde olmayan)
    62 ELLE + 1 OTOMATIK = 63 defter kaydi · kiyaslanamayan sipariş 0

⛔ **ÜÇ SAYIM TUTARSIZLIĞI BENİM RAPORUMDAYDI** ve kullanıcı üçünü de yakaladı:
① `65 = 55+0+7+2` yazmıştım (64 eder) — otomatik siparişi (a) sayımından
düşürmüştüm; ② _"62 vs 63"_ — biri ELLE sayısı, öteki defter kaydı, ikisi
farklı soru; ③ `35,54 ↔ 35,56` — aşağıda.

### ⭐ ₺35,54 ↔ ₺35,56 ÇÖZÜLDÜ — İKİSİ DE DOĞRU, FARKLI KÜME

Ve önce **taban tuzağına** düşülüyordu: CSV'de `defterKomisyon_TL` **KDV
DAHİL**, `apiKomisyonKDVharic_TL` **KDV HARİÇ**. Ham kıyas 63 satırda
"₺8.815,64 fark" üretiyor — o fark değil, **KDV'nin kendisi** (oran tam
`1,200000`). _(Anayasa: "para rakamı tabanıyla birlikte yazılır".)_

Aynı tabanda (defter ↔ api × 1,20):

    kurusuna TUTAN                                57 / 63 satir
    uc ORAN uyusmazligi (c)                       net  35,5640 TL
      4252875794  %7 != %4    181,19 - 103,54  =  +77,6540
      4686454655  %7 != %4    181,19 - 103,54  =  +77,6540
      4394362957  %12 != %13 1436,98 - 1556,72 = -119,7440
    + uc kurus tozu (-0,0060 +0,0080 -0,0160)         -0,0140
    ------------------------------------------------------------
    kurus tozu DAHIL                              net  35,5500 TL

**₺35,56 = yalnız oran uyuşmazlıkları · ₺35,55 = kuruş tozu dahil.** Mimarın
cümlesindeki rakam birincisidir. ⚠ Önceki notumdaki `35,5440` **yanlıştı**,
düzeltilen değer `35,5640`; eski rakamı elinde tutan biri için kaynaksız bir
sayı doğmasın diye ikisi de yazılıyor.

### (c) — TARİHLİ BEKLETME · HAKEM HAKEDİŞ

Altı kayıt (⚠ önceki notumda **7** yazıyordu; CSV **6** diyor ve geçerli olan
CSV). Üçü oran, üçü tarih uyuşmazlığı — hiçbiri düzeltilmedi, çünkü hakem
kanalın **kendi ödeme kaydıdır**, bizim iki okumamız değil.

    siparis        defter      api         cins    beklenen hakedis
    4252875794     09.08       09.08       oran    ~12.09.2026
    4686454655     09.08       09.08       oran    ~12.09.2026
    4394362957     13.08       13.08       oran    ~16.09.2026
    4833471574     17.08       15.08       tarih   ~18.09.2026
    4820193459     17.08       16.08       tarih   ~19.09.2026
    4866824058     25.08       21.08       tarih   ~24.09.2026

⚠ **TARİHLER BEKLENTİDİR, SÖZ DEĞİL.** Taban ölçülmüş HB gecikmesi:
**~34 gün** (24 iş günü, **teslimden** sonra başlar — bkz. H3). Sipariş
gününe eklendi; teslim geciktiyse hakediş de gecikir. Bu satır **kapanamayan
madde değil**: hakediş düştüğünde tek sorguyla kapanır.

### (b) — TEK KAYIT, KAPANDI

`4701917734` · defter ciro **9.252,00** ↔ liste **9.252,13** (₺0,13).
Komisyon aynı tabanda **₺0,016** sapıyor. Sistematik değil, yuvarlama.

### (d) — İKİ SİPARİŞ YAZILDI

`4873413946` · `4707418677` — kanalda VAR, defterde YOKTU. Halil teyidi
07.09: _"ikisi de benim, tutarlar doğru."_ Yazım K165 protokolüyle
(anlık görüntü ↔ bit-bit kıyas) yapıldı. ⚠ `4707418677` yazıldığı anda
`ClaimCreated` idi ve bu bilgi kanalda AKAR — `note` alanına yazım anı
donduruldu, sonradan öğrenilemezdi.

### ⏭ KAPANIŞTA AÇIK KALAN — VE AÇIK OLDUĞU YAZILIYOR

· (c)'nin 6 kaydı hakediş bekliyor (yukarıdaki tarihler).
· **Kaçak radarı bir SAYI değil, ZAMAN DAMGALI GÖZLEMDİR:** _"07.09 22:28
  koşumunda kanalda olup defterde olmayan **3** sipariş gördü"_ —
  `4864776792` · `4873413946` · `4707418677`. Bu bir stok değil akıştır;
  ertesi gün başka bir sayı çıkar ve çıkması normaldir. Nitekim 08.09
  07:47 koşumu **2** gördü ve ikisini de yazdı (K187-④).
· Satıcı indirimi (`SATICI İNDİRİMİ OLAN KALEM`) ciroya hâlâ GİRMİYOR —
  yeri çözülmedi; ayrı kalem: **K-HB-PAZARLAMA**.

---

## ✅ K186 — GRAFİK RAKAMLARI + İADE ORANI ÇİZGİSİ · 07.09.2026 · [KOD KOŞTU]

> **Halil:** _"karşılaştırmada iki parametre seçtiğimde rakamlar kapanıyor;
> birden fazla parametre seçildiğinde de gösterilsin"_ · _"adet kısmında da
> aynı problem var"_ · _"bu sayfa çizgi grafikle desteklensin"_ (iade oranı).

### ① RAKAMLAR HER SERİDE — ÇAKIŞMADAN KAÇMA, ÇAKIŞMAYI ÇÖZ

⛔ **ESKİ GEREKÇE ÇÜRÜDÜ.** Rakamlar `seciliSeriler.length === 1` şartına
bağlıydı ve gerekçesi _"iki çizginin rakamları aynı dikey şeride biner"_ idi.
Doğruydu ama yanlış çareydi: **kaçınmak yerine çözülür.** `cizgi-grafik.tsx`
ciro/NET-2 çiftinde bunu zaten yapıyordu.

    ay sütunundaki etiketler Y'ye göre SIRALANIR
    aralarında en az ETIKET_ARALIGI (14 px) kalacak şekilde İTİLİR
    sıra bozulmaz — üstteki çizginin rakamı üstte kalır
    renk serinin KENDİ rengi → sahiplik konumdan DEĞİL renkten de okunur

### ② İADE ORANI ÇİZGİ GRAFİĞİ — TABLONUN GÖVDESİNDEN

⛔ **İKİNCİ BİR BÖLME YAZILMADI:** grafik tablonun `oran()` gövdesini
çağırıyor. Ayrı yazılsaydı tablo ile grafik sessizce ayrışır, hangisinin doğru
olduğu ancak yan yana konunca görülürdü. _(Anayasa: "sayı = liste".)_
⛔ **TOPLAM SERİSİ ORANLARI ORTALAMIYOR** — pay ve payda toplanıp yeniden
bölünüyor; tablonun toplam satırıyla aynı sayı. Ortalasaydı 9 satışlık kanal
3.687 satışlık kanal kadar konuşurdu.
⚠ `null` ay (o kanalda hiç satış yok) çizgiyi **keser**, sıfıra çekmez.
⭐ **İKİNCİ GRAFİK GÖVDESİ YAZILMADI:** karşılaştırma bileşeni yeniden
kullanıldı — seri seçimi, karışık birim kapısı ve `null` kesmesi bedavaya
geldi. Bileşene tek ekleme: `YUZDE` birim türü.

    panel:dogrula   713/713
    MUTASYON          8/8   iki yönlü

⭐ **EN DEĞERLİ İKİ MUTASYON:** ⑤ grafiğin KENDİ bölmesini kurması ve ⑥ toplam
serisinin oranları ortalaması — ikisi de kırmızı yandı. İkisi de "makul
görünen ama sessizce ayrışan" sınıfından.

### ③ İLK CANLI SİPARİŞİN ONAY SINAVI GEÇTİ (Halil onayladı, 07.09)

K165-④'te _"stok/NET bağı bu turda SINANMADI"_ diye açık bırakılan iki madde
onay kuyruğundan geçince kapandı:

    profitStatus   CALCULATED ✓
    NET-1 / NET-2  317,7117 / 260,0583 TRY
    SaleFee (6)    MALIYET 2.499,00 · KOMISYON 406,20 · STOPAJ 28,21
                   ODEME_GIDERI 27,08 · HIZMET_BEDELI 12,60 · KARGO 94,20
    STOK           SALE_OUT −1 @ 2.499 · kaynak VAR
                   → parti PURCHASE_IN 10.04.2026 @ 2.499  ✓ FIFO
    varyant stoğu  2

⭐ **ARİTMETİK KURUŞUNA KAPANDI:**
`3.385,00 − 2.499,00 − 406,20 − 28,21 − 27,08 − 12,60 − 94,20 = 317,7117`
⭐ **KOMİSYON 406,20 — HB PANELİYLE BİREBİR.** `%10 + %20 KDV` mekanizması
doğrulandı; `%12` kısayolu aynı sayıyı verirdi ama oran ya da KDV değişince
sessizce bozulurdu (bu yüzden koda yazılmadı).
⭐ **KUPON 15,00 KESİNTİLERDE YOK** — yeri çözülene kadar ne ciroya ne gidere
karışıyor. Doğru davranış.

---

## 🚨 K185 — KARŞILAŞTIRMA SEKMESİ CANLIDA 500 VERDİ · 07.09.2026 · [KOD KOŞTU]

> **Halil:** _"karşılaştırma çalışmıyor"_ — `?grafik=karsilastirma` →
> _"Bu ekran çizilemedi"_ (hata kodu 3940646026).

⛔ **SEBEP: SUNUCUDAN İSTEMCİYE FONKSİYON GEÇİRİLİYORDU.** K182'de yazdığım
grafik `"use client"` ve panel ona seri başına İKİ FONKSİYON veriyordu
(`bicimle` · `bicimleKisa`). Next.js bunları serileştiremez; ekran patlar.

⚠ **VE TUR YEŞİLDİ.** 42 bekçinin hiçbiri görmedi — hepsi kaynağı ölçüyor,
ekranın ÇİZİLDİĞİNİ ölçen yok. _(Anayasa: "sınanmamış ekran, ekran değildir" —
bu kural K182 teslim edilirken çiğnendi: ekran hiç görülmeden yayımlandı.)_

⭐ **ÇARE ÖN-BİÇİMLEME DEĞİL, BİRİM TANIMI:** eksen işaretleri SEÇİME bağlı
olarak istemcide hesaplanıyor, dolayısıyla sunucuda önceden biçimlenemezler.
Seri artık yalnız `birimTuru` (`PARA`/`SAYI`) + `paraBirimi` taşıyor; biçimi
istemci kendi `useBicim()` kancasından çözüyor (anayasa: biçim dil
altyapısından gelir).

⛔ **VE SINIF DESENE BAĞLANDI:** `npm run istemci-prop:dogrula` — `"use client"`
taşıyan HER dosyanın dışa aktarılan prop tipinde fonksiyon alanı aranır.
Dosya listesi tutmaz; yarın eklenen bileşen de yakalanır. İstisna beyanla
geçer (`// SUNUCUDAN GECMEZ: <gerekçe>`), beyansız olan kırmızıdır.

    istemci-prop:dogrula   7/7   (2 bölüm, sayaçlı) · 129 "use client" dosyası
    MUTASYON               7/7   — ⑦ hiçbir listeye eklenmemiş YENİ bileşen de
                                   kırmızı yandı; ⑤ beyanlı istisna yeşil kaldı

⚠ **VE BEKÇİ KENDİ KUSURUNU MUTASYONLA BULDU:** beyan bir YORUMDUR ama ölçüt
yorumları maskelenmiş metinde arıyordu — beyanlı istisna da kırmızı yanıyordu.
Mutasyon ⑤ yakaladı; beyan artık HAM metinden okunuyor (maskeleme konumları
koruduğu için aynı ofsetten bakılabiliyor).

### ─── ② KANAL SIRASI — VAR OLAN KARAR YENİ EKRANDA UYGULANMAMIŞ

> **Halil:** _"en çok Trendyol'da satış yaptığımdan, ben aksini söyleyene kadar
> ilk Trendyol, ikinci Hepsiburada olsun."_

⭐ **KARAR ZATEN VARDI** (`lib/kanal-sirasi.ts` → `TRENDYOL · HEPSIBURADA · N11
· AMAZON · DEPO`) ama `page.tsx` onu ÇAĞIRMIYORDU: `kanalSecenekleri`
alfabetik sıralanıyordu ve K182'nin iade/ısı tabloları öyle diziliyordu
(Amazon · Elden Satış · Hepsiburada · N11 · Trendyol — Halil ekranda gördü).
Sıralama iki basamaklı: önce sabit sıra, sonra ad.
_(Anayasa: "kararın kapsamı, uygulandığı yerle sınırlı sayılmaz".)_

### ─── ③ İADE ATFI — SATIŞIN AYINA GEÇTİ · [KOD KOŞTU]

> **Halil:** _"İadeyi bugün gerçekleşen cirodan kesmesine gerek yok, siparişin
> olduğu günün sorunu hepsi; kârını da oradan kesmeli — sistem zaten oradan
> kesiyor. Sipariş vadede, iade başlatılınca ödemesi donduruluyor, iade
> onaylanınca direkt o siparişten kesiliyor."_

Bugünkü davranış kodda yazılı: `panel.ts:146` → _"İadenin KENDİ tarihi
(occurredAt) — satışın tarihi değil."_ Yani iade **iade ayına** yazılıyor.

⭐ **BU, "İADE ORANI ANLAMSIZ" ŞİKÂYETİNİN DE KÖKÜ:** pay iade ayından, payda
satış ayından geliyor — tablo başlığındaki _"oran %100'ü aşabilir"_ şerhi tam
bunun itirafı. Aynı kohorta çekilirse şerh gereksizleşir.

    ÖLÇÜM (223 iade, salt okuma)
      satışa bağlı        223   ·  bağsız 0
      AYNI ayda           152   ·  FARKLI ayda  71  (%31,8 ← ay değiştirir)
      satış→iade gün: ortanca 8,5 · p75 12,5 · p90 18,5 · max 57,5

**KAPSAM ÖLÇÜLDÜ VE DAR ÇIKTI — 4 satır:**

| Ne | Nerede | Önce | Sonra |
|---|---|---|---|
| Atıf | `page.tsx` · `rapor/page.tsx` | `iade.occurredAt` | `iade.sale.soldAt` |
| Pencere | `page.tsx` · `rapor/page.tsx` | `where: { occurredAt: … }` | `where: { sale: { soldAt: … } }` |

⛔ **PENCERE ATIFLA BİRLİKTE DEĞİŞTİ — VE ASIL TUZAK BURADAYDI.** Yalnız atıf
çevrilseydi Eylül'de dönen Ağustos malı Eylül penceresiyle ÇEKİLİR ama Ağustos
kovasına yazılırdı: görüntülenen hiçbir aya düşmez, **sessizce kaybolurdu.**
Mutasyon ② tam bunu sınıyor.

⭐ **TÜKETİCİLER DEĞİŞMEDİ:** `panel.ts:471 · 741 · 743` zaten `iade.tarih`i
okuyor — atıf tek yerden geldiği için üçü kendiliğinden doğruya döndü. K60'ın
altı okuyuculu vakası burada tekrarlamadı.
⚠ `/iadeler` listesindeki tarih sütunu **değişmedi**: orada sorulan şey "bu
iade ne zaman oldu", atıf değil.

### ② MUHASEBE TARAFI AYRIŞIYOR — ÖLÇÜLDÜ, BİLEREK BÖYLE

    donem-raporu.ts:95    satışlar → soldAt
    donem-raporu.ts:114   iadeler  → return.occurredAt     ← OLAY tarihi, KALDI

⛔ **KDV DÜZELTMESİ İADENİN GERÇEKLEŞTİĞİ DÖNEMDE BEYAN EDİLİR.** Satışın ayına
yazmak, kapanmış bir KDV dönemini geriye dönük değiştirmek olurdu. İki atıf bir
tutarsızlık değil, **iki farklı sorunun iki doğru cevabı** — ve hangi ekranın
hangi soruyu sorduğu koda yazıldı, yoksa biri ötekine "düzeltilir".
⚠ **VE FARK EKRANDA SÖYLENİYOR** (İlke #10): iade oranı notu artık hem atıf
kuralını hem muhasebe ayrışmasını yazıyor; eski _"oran %100'ü aşabilir"_ şerhi
KALDIRILDI — o cümle artık doğru değil ve kalsaydı ekran yalan söylerdi.

⭐ **PANO CÜMLESİ (Halil):** _"aylık NET geç iadeyle geriye dönük değişir —
atıf kuralı, kusur değil."_ Bu ekranda da yazıyor.

### ③ KAPALI DÖNEM VE K108 KİLİDİ — ÖLÇÜLDÜ

    kapalı döneme düşen satışın GEÇ iadesi:  0   ← ARANAN SAYI

⚠ **AMA SIFIRIN SEBEBİ ÖNEMLİ:** `MuhasebeDonemi` tablosunda **hiç kayıt yok**
(toplam 0), dolayısıyla kapalı dönem de yok. Bu _"geç iade yok"_ değil,
**"soru henüz doğmamış"** demek. İlk dönem kapatıldığında yeniden ölçülür.
_(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
değildir".)_

⭐ **K108 KİLİDİ GÖRÜNTÜLEMEYİ ETKİLEMİYOR:** `donemKorumasi` bir **yazma
kapısı** — çağıranları mal kabul, stok düzeltme ve iade eylemleri; `DURAKSA`
döndürüp kullanıcıya soruyor. Panel ve rapor onu hiç okumuyor.

    panel:dogrula   698/698
    MUTASYON          8/8   iki yönlü

⭐ **EN DEĞERLİ MUTASYON ⑤:** kuralı muhasebe dönem raporuna da uygulayan
senaryo **kırmızı yandı**. Doğru bir ilkeyi ait olmadığı yere taşımak, orada
koruduğu şeyi bozar. _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa
hatayı korur".)_

### ④ İKİ TARİH İLKESİ — YENİ RAPOR EKRANI AÇAN HERKESİ BAĞLAR

    YÖNETİM ekranları (panel · rapor · oran tabloları)  →  SATIŞIN ayı
    MUHASEBE / KDV (dönem raporu · beyan)              →  OLAYIN ayı

⭐ **AYIRT EDİCİ SORU:** bu ekran hangi soruyu soruyor —
_"o ay ne kazandım"_ mı, yoksa _"o dönemde ne beyan ederim"_ mi?
Birincisi olayı **sebebine** (satışa) yazar; ikincisi **gerçekleştiği ana**.

⭐ **KILAVUZA GİRDİ (Halil onayı 07.09):** `CLAUDE.md` → _"İKİ TARİH İLKESİ —
bir olay sebebine mi, anına mı yazılır"_. Sebebi: pano kapanan işlerle
küçülüyor, bu kayıt K185 kapanınca **arşive gidecek** ve altı ay sonra yeni bir
rapor ekranı açan kişi onu görmeyecekti. Kılavuz her oturumun başında okunuyor.

⛔ **YENİ BİR TARİH ALANI OKUYAN HER EKRAN BU SORUYU CEVAPLAR VE GEREKÇESİNİ
KODA YAZAR.** Cevaplamayan ekran, iki atıftan hangisine düştüğünü bilmeden
yayımlanmış olur — ve iki ekran sessizce ayrışır. 07.09'da tam bu yaşandı:
panel iadeyi olay gününe yazıyordu, kimse yanlış olduğunu söylemiyordu, ve
iade oranı tablosu bu yüzden "anlamsız" görünüyordu.

⚠ **İKİ ATIF BİR TUTARSIZLIK DEĞİLDİR** — iki farklı sorunun iki doğru cevabı.
Ama hangi ekranın hangi soruyu sorduğu **kodda yazılı** olmak zorunda, yoksa
biri ötekine "düzeltilir". _(Anayasa: "aynı veri, farklı soruya farklı
pencereden bakar".)_ Ve fark **ekranda da** söylenir (İlke #10).

### ⑤ ÖLÜ KOD TEMİZLİĞİ — DEĞİŞİKLİĞİN ARTIKLARI

> **Halil:** _"Yapılan bütün gelişmeler, hesaplamalar ve değişimler mevcut
> sistemde ölü kod bırakmadan uygulanmalı."_

Denetim dört kalıntı buldu ve **ikisi ölü koddan kötüydü** — artık yanlış şey
söylüyorlardı:

| Nerede | Sorun | Yapıldı |
|---|---|---|
| `panel.ts` · `PanelIadesi.tarih` | belge _"iadenin KENDİ tarihi"_ diyordu | yeni kural + gerekçe |
| `rapor.ts` · `RaporIade.tarih` | aynı | yeni kural + gerekçe |
| `page.tsx` iade sorgusu | `occurredAt` seçiliyor, okunmuyor | kaldırıldı |
| `rapor/page.tsx` iade sorgusu | aynı | kaldırıldı |

⛔ **BELGE KODDAN KÖTÜ ESKİR:** ölü bir alan yalnız yer kaplar; **eskimiş bir
belge bir sonraki okuyucuya YANLIŞ KURALI ÖĞRETİR** ve üstüne akıl yürütülür.
Bu yüzden ikisi de bekçiye bağlandı: belge ile atıf ayrışırsa kırmızı yanar.

    panel:dogrula   703/703
    MUTASYON          6/6   (4 gerçek + kontrol + tip-adı körlüğü)

⭐ **MUTASYON ⑥ ÖLÇÜTÜN KENDİ KÖRLÜĞÜNÜ SINADI:** tip yeniden adlandırılınca
ölçüt sessizce kör kalmıyor, **kırmızı yanıyor** (`indexOf` → `-1` tuzağı).

⚠ **VE "KULLANILMIYOR" İLE "BİLEREK BEKLETİLİYOR" AYRI TUTULDU:** HB sağlık
sondasının kullandığı `UCLAR.siparisler` ve TY'nin kapanacak `urunlerV1` ucu
SİLİNMEDİ — ilki canlı bir tüketiciye sahip, ikincisi 15.09.2026 kapanışında
ne kaybettiğimizi ölçmek için duruyor. Silinseydi ölçüm imkânsız olurdu.

### ⑥ AÇIK KALANLAR — TETİKLENEMEZ YOL VE HALİL TESTİ

⏭ **TETİKLENEMEZ YOL — KAPALI DÖNEM + GEÇ İADE.** Bugün ölçülemiyor:
`MuhasebeDonemi` tablosunda hiç kayıt yok, dolayısıyla kapalı dönem de yok.
Ölçüm `0` verdi ama bu bir **hüküm değil**. **Açılış şartı: ilk dönem
kapanışı** — o gün yeniden ölçülür ve kapalı döneme düşen geç iadenin ekranda
nasıl göründüğü sınanır. _(Anayasa: "tetiklenemeyen yol 'geçti' sayılmaz".)_

⏭ **HALİL EKRAN TESTİ BEKLENİYOR (deploy sonrası) — K185 BU MADDE KAPANMADAN
KAPANMAZ:**
· **iade oranı tablosu** → 71 iadenin ay değiştirdiği görünmeli · eski
  _"%100'ü aşabilir"_ şerhi KALKMIŞ olmalı · sıra **Trendyol → Hepsiburada**
· **`?grafik=karsilastirma`** → artık çizilmeli (bugün 500 veriyordu)

⛔ **NİYE ŞART:** bugün karşılaştırma sekmesi tam bu adım atlandığı için
canlıda patladı — tur 42/42 yeşilken ekran hiç çizilmiyordu.
_(Anayasa: "sınanmamış ekran, ekran değildir".)_

### ⑦ KAPANIŞ — HALİL EKRAN TESTİ GEÇTİ · 07.09.2026

> **Halil:** _"iade oranı tablosu ✓ · karşılaştırma grafiği (binişme yok) ✓ ·
> iade grafiği = tablo toplamı ✓"_

⭐ **ÜÇÜNCÜSÜ EN DEĞERLİ TEYİT:** iade grafiğinin tablonun toplam satırıyla
aynı sayıyı vermesi, grafiğin tablonun `oran()` gövdesinden beslendiğini
GERÇEK EKRANDA doğruluyor. Ayrışsaydı ancak yan yana konunca görülürdü.

⛔ **VE BU MADDE OLMADAN KAPANMAZDI, ÇÜNKÜ AYNI GÜN BEDELİ ÖDENDİ:** K182
teslim edilirken ekran hiç görülmedi ve karşılaştırma sekmesi canlıda 500
verdi — tur 42/42 yeşilken. _(Anayasa: "sınanmamış ekran, ekran değildir".)_

⭐ **"SINANMAMIŞ EKRAN" SINIFINDA BEKLEYEN KALMADI:** bugünkü üç ekran paketi
(çok kanallı vitrin kutusu · iade atfı + oran tablosu · karşılaştırma grafiği
ve rakamları) uçtan uca doğrulandı.

**K185 ve K186 KAPANDI — arşive.**

---

## ✅ K175 — K-ALM-260216 MALİYET DÜZELTMESİ · 06–07.09.2026 · [KOŞTU — 3 alım, 5 satış]

> **Halil teyidi 07.09:** üç siparişte de **fiilen ödenen ₺1.598** — kupon YOK,
> defter eksikmiş. (HB "Siparişlerim" ekranından bakıldı.)

### ① EŞLEŞTİRME — beş Sip.Ref.No'nun beşi de defterde

| Sip.Ref.No | kayıt | tarih | fatura | defter (önce) | fark |
|---|---|---|---|---|---|
| 4791823457 | `ALM-HB-260216-03` | 16.02 | 1.598,00 | 1.598,00 | 0,00 ✓ |
| 4256569478 | `ALM-HB-260216-01` | 16.02 | 1.598,00 | 1.075,24 | +522,76 |
| 4025334987 | `ALM-HB-260216-04` | 16.02 | 1.598,00 | 1.124,94 | +473,06 |
| 4205447254 | `ALM-HB-260216-05` | 16.02 | 1.598,00 | 1.224,94 | +373,06 |
| 4308842479 | `ALM-HB-260516-15` | 16.05 | 1.298,00 | 1.298,00 | 0,00 ✓ |
| | | **toplam** | **7.690,00** | **6.321,12** | **+1.368,88** |

⛔ **ÇAPRAZIN İLK HÂLİ ("fark −₺48,50") GEÇERSİZDİ** ve sebebi kayda geçiyor:
defter tarafı **₺7.641,50** sanılmıştı; o sayı bir toplam değil,
`ALM-HB-260216-03`ün **03.09'da silinmiş BİRİM maliyetiydi** (ve `7641,50 × 2
= 15.283` hâlâ o kaydın bayat `goodsAmount`ında duruyordu). Kapsam düzeltilince
fark yön değiştirdi: fatura defterden **BÜYÜK**.
_(Anayasa: "dış dosya ile defter kıyaslanmadan önce, sistemin o kaydı nasıl
tuttuğu KENDİ İZİNDEN doğrulanır" — iz okununca yanlış öncül tek adımda çıktı.)_

⚠ **EKRANDAKİ İLK BEŞ NUMARA DEFTERDE HİÇ YOKTU** (0/5, ne sipariş no ne satış
kodu). Onlar Sip.Ref değildi; Halil doğru numaraları verince eşleşme **5/5**
oldu. Biçim de ayrışıyordu: defterdeki HB sipariş no'ları 10 hane ve **4** ile
başlıyor.

### ② YAZIM — üç yer + özet alanı, sonra NET

`npm run canli:alim-maliyet-duzelt -- <KOD> --toplam=1598 --uygula` ×3 →
`canli:goods-hizala --uygula` → `canli:net-tazele -- <5 kod> --uygula`.

| satış | NET-1 | NET-2 |
|---|---|---|
| `11023053211` | 714,76 → 478,23 | 593,17 → 396,06 |
| `11023201569` | 726,63 → 490,10 | 603,04 → 405,93 |
| `11027642274` | 676,63 → 490,10 | 561,38 → 405,93 |
| `11028050913` | 676,63 → 490,10 | 561,38 → 405,93 |
| `11419703466` | 706,55 → 183,79 | 585,63 → 149,99 |
| **TOPLAM** | **−1.368,88** | **−1.140,73** |

Aradaki **₺228,15** kayıp değil: maliyet KDV dahil, artan maliyet indirilecek
KDV'yi büyüttü. ⭐ **Üç bağımsız yol aynı sayıya çıktı** (fatura−defter farkı ·
maliyet artışı toplamı · motorun NET-1 düşüşü = 1.368,88).

**DEĞİŞMEZLİK TURU:** Σnet2 `2.352.822,99 → 2.351.682,26` (beklenen birebir) ·
satış 7850 → 7850 · ciro değişmedi · 7850/7850 CALCULATED. **Başka satış
oynamadı.**

⛔ **`canli:kar-tazele` KULLANILMADI** — o betik başka vakalara kilitli
(Soundcore · Blanco · belirli sipariş kodları); `--uygula` denseydi **alakasız
6 satış** yeniden yazılacaktı. Doğrusu `canli:net-tazele`.

### ③ ÖZET ALANI — kusur tek vaka değil, ARACIN DESENİYDİ

`canli:alim-maliyet-duzelt` üç yere yazıyordu (kalem · parti · çıkış damgaları),
**dördüncüyü — `Purchase.goodsAmount` — atlıyordu.** Ölçüldü: yazımdan önce
2 sapan vardı, üç düzeltme **3 yeni sapan üretti** → 5. Araç düzeltildi (özet
artık aynı işlemde yazılıyor, karışık para biriminde yazılmıyor), sapanlar
hizalandı (**5/5 defterden doğrulandı**, tekrar koşum **2024/2024 temiz**).
`ALM-HB-251224-01`in ₺1,00'ı da teşhis edildi: tek kalem `axcali2480 ×1 @
874,00`, özet 875,00 — kalem esas.

**Yeni bekçi `goods-amount:dogrula`** (11 ölçüt): `purchaseItem`a birim maliyet
YAZAN her dosya `goodsAmount`a da dokunmak zorunda — ya da gerekçeli muafiyet.
Liste elle tutulmuyor. **6 mutasyon 6 kırmızı.**
⚠ İki ölçüt kusuru mutasyonla çıktı: ① `goodsAmount` dizesi dosyada aranıyordu,
`if (false)` ile dal öldürülünce yeşil kaldı → çağrı bloğuna + ölü dal yasağına
bağlandı; ② snapshot ölçütü `void 0 &&` önekiyle kaçtı → satır başına bağlandı.
⚠ Bekçi ayrıca **elle bulamadığım bir dosyayı** yakaladı (`mal-kabul/actions.ts`)
ve o **yanlış pozitif** çıktı: iki desen aynı dosyada ama AYRI ifadelerde —
ölçüt çağrı bloğuna daraltıldı (pencere değil, parantez eşleyerek).

### ④ SINIF TARAMASI — "başka tuhaf birim var mı"

`npm run canli:kardes-parti-sapmasi` (mevcut araç; ölçüt **aynı gün** kardeş
partiler — zaman ekseni DEĞİL, çünkü _"zaman içindeki fiyat farkı şüphe
üretmez"_). 535 grup · p99 `1,257×` · eşik `1,50×` hâlâ gedikte.

⭐ **`axcali1805` listeden DÜŞTÜ** — dört kardeş de ₺799,00 olunca yayılma
`1,000×`. Bugünkü düzeltmenin bağımsız kanıtı.

⏳ **TEK YENİ ADAY — hüküm YOK:** `axcali2110` (LEGO Creator) · 01.01 · Amazon ·
**3,11×** → `ALM-AMZ-260101-03/05` ₺1.399,00 ↔ `ALM-AMZ-260101-07` **₺450,35**;
aykırı olan DÜŞÜK ve o kaydın **sipariş no'su YOK**. Faturayla doğrulanacak.
(Öteki kuyruk satırı `axcali2002` `2,00×` **zaten doğrulanmıştı** — ₺1.500 gerçek.)

### ⑤ "GELİR YARIM" ALARMI — ÇÜRÜDÜ, KUSUR BENİM ETİKETİMDEYDİ

Halil TY ekranını gönderdi: `11419703466` · birim ₺1.139 × 2 = **₺2.278** ve
_"defterde toplam 1.139 görünüyor, gelir yarım"_. **Ölçüm çürüttü:**

    unitPriceAmount 1.139,00 × adet 2  =  CIRO 2.278,00      ← TY ile birebir
    KOMISYON 410,04 = 2.278 × %18                            ← TAM tutar üstünden
    STOPAJ    18,98 = (2.278 ÷ 1,2) × %1
    NET-1 = 2.278 − 1.598 − 410,04 − 18,98 − 13,19 − 54 = 183,79 ✓

⭐ **AYIRT EDİCİ KANIT KANALIN KENDİ ÖDEME KAYDINDA:** bu siparişin hakedişi
**İKİ SATIR** ve toplamı **₺1.867,96** = `2.278 − 410,04`; satır başına
`933,98 = 1.139 − %18`. İki satır = iki adet. Bu gözlem yalnız TEK okumayla
uyumlu. _(Anayasadaki `11373352181` vakasının birebir aynısı.)_

⛔ **ALARMI ÜRETEN ŞEY BENİM RAPORUMDU.** `canli:alim-maliyet-duzelt` çıktısında
sütun yalnız **`fiyat 1.139,00`** diye geçiyordu; o `unitPriceAmount`, yani
BİRİM fiyat. 2 adetlik satırda etiketsiz "fiyat" iki okumaya açık ve ben onu
tabloma öyle taşıdım. **Araç düzeltildi** — artık `BİRİM 1.139,00 ×2 =
2.278,00` yazıyor. _(Anayasa: "bir sayı etiketiyle taşınır" — kuralı kendi
raporumda çiğnedim.)_

⭐ **KURAL ANAYASAYA İKİNCİ VAKA OLARAK İŞLENDİ** (07.09, Halil talimatı):
etiket yalnız cümlede değil **araç çıktısında da** taşınır; bir sütun başlığı
"fiyat" diyorsa birim mi toplam mı olduğunu SÖYLEMİYOR demektir. Bu aynı
zamanda "birim mi toplam mı" dersinin **üçüncü yüzü**: birincisi dış veride
(TY `price`), ikincisi komut satırında (`--toplam=`/`--birim=`), üçüncüsü
**kendi çıktımızda** — ilk ikisi düşünülmüştü, üçüncüsü düşünülmemişti.

⛔ **DESEN BEKÇİYE BAĞLANDI:** `npm run canli:adet-geliri` (bkz. ⑥) —
"dikkat et" bir mekanizma değildir.

### ⑥ SINIF TARAMASI GENİŞLETİLDİ — çok adetli satışlar

**Ölçek küçük:** defterde çok adetli satış **yalnız 10**. Bağımsız kaynak
kanalın hakedişi (ciro ÷ Σ SIPARIS oranı; hakediş komisyon düşülmüş olduğu
için 1'in biraz üstü beklenir):

    temiz (0,80–1,25)  6   ·   YARIM? 0   ·   KATLI? 0   ·   hakediş YOK 4

**Yarım/katlı gelir YOK.** ⚠ Hakedişi olmayan 4 satış "temiz" SAYILMADI,
*incelenemeyen* diye ayrı yazıldı.

### ⑦ ÖTEKİ DÖRT SATIŞ — çapraz KURULAMADI, sebebi ölçüldü

Maliyeti düzeltilen öteki dört satış (`11023201569` · `11023053211` ·
`11027642274` · `11028050913`) tek adetli ve **dördünde de komisyon TAM ciro
üzerinden** (%20 × ciro = kayıtlı komisyon, kuruşuna). Ama ekstre çaprazı
kurulamadı: **hakediş satırı 0.**

⭐ **SEBEP ÖLÇÜLDÜ, AÇIK BIRAKILMADI:** ekstre kapsamı **2026-05 → 2026-08**
(kalem dağılımı: 05→11 · 06→647 · 07→612 · 08→69). Dört satış **Mart 2026** —
pencerenin tamamen dışında. Yani "ekstrede yok" bir kusur değil, **görüş
alanının sınırı**. _(Anayasa: "tutanak, kusur ile sınırı ayırt ettirir".)_
⚠ Bu dördü için bağımsız teyit BUGÜN mümkün değil; maliyet düzeltmesi
Halil'in fatura teyidine dayanıyor ve gelir tarafı **doğrulanmamış** olarak
kalıyor — kayıtta öyle yazıyor.

⏭ **BİRLEŞİK YAZIM PAKETİNE GEREK KALMADI:** gelir tarafında düzeltilecek bir
şey çıkmadı, maliyet + NET zaten yazılmıştı. Açık kalan tek şey aşağıdaki
faturalar.

### ⏭ AÇIK — HALİL'DEN BEKLENİYOR

⛔ **İKİ FATURA İSTEĞİ DE GERİ ÇEKİLDİ (07.09) — İKİSİ DE GEREKSİZDİ.**
Halil sordu: _"faturayı ne yapacaksın, sana alım ve satım listesini verdi ya."_
Haklıydı ve ölçüm doğruladı:

· **Üç Mayıs faturası:** dört mayıs alımı da kuruşu kuruşuna **₺1.298,00**
  (yayılma `1,000×`) ve içlerinden birinin faturası (`4308842479`) zaten elde,
  tutuyor. Aynı rakamı taşıyan üç kardeşi ayrıca faturalatmak, verinin ZATEN
  verdiği cevabı kullanıcıya tekrar sordurmaktı.
· **`axcali2110` Amazon faturası:** değer zaten 03.09'da belirlenmişti
  (`CIKIS_MALIYETI_DUZELTILDI` izi, 450,35 → 1.399). Halil yine de gönderdi ve
  **birim ₺1.399,00 doğrulandı** (₺1.999 liste − ₺500 iskonto; defter fiilen
  ödeneni tutuyor).

> **DERS:** belge istemeden önce sorulur — **bu soruyu defterin kendi izi zaten
> cevaplıyor mu?** Kullanıcıya iş açmak da bir maliyettir ve ölçülmeden
> yapılmaz. _(Anayasa: "cevap zaten yazılıydı ve sorulmadı" — 03.09'daki alım
> dosyası vakasının birebir tekrarı.)_

⚠ **AÇIK KALAN TEK GÖZLEM (iş DEĞİL):** Amazon faturası **1 adet** için
kesilmiş (`QTY 1`), defterdeki `ALM-AMZ-260101-07` ise **5 adet**. Birim fiyat
doğrulandı; adet sorusu ayrı ve Halil'de şüphe yoksa açılmayacak.

### ─── ⑧ KAPANIŞ — FATURA ÇAPRAZI KAPANDI · 07.09.2026

> **Halil:** _"Mayıs'ın son üç faturası geldi — 4082444351 · 4493666766 ·
> 4762659958, üçü de 1.298,00, defterle kuruşuna eşit. 8/8 kayıt kanıtlı.
> Bekleyen fatura kalemi KALMADI."_

⭐ **EŞLEŞME YÖNTEMİ — TEK SATIR:** `Sip. Ref. No`, faturanın **Genel
Açıklamalar** alanından okundu; **tutar üstünden DEĞİL.** Mayıs'ın dört
alımının **dördü de** ₺1.298,00 taşıyor ve aynı varyantı (`axcali1805`)
içeriyor — tutar bağı ayırt edici olmazdı, dördünden hangisi olduğunu
söyleyemezdi.

| Defter kaydı | HB Sip.Ref | SEB Sipariş No | Belge No | Tutar | Durum |
|---|---|---|---|---|---|
| `ALM-HB-260216-01` | 4256569478 | — | — | 1.598,00 | HB ekranı (07.09) |
| `ALM-HB-260216-03` | 4791823457 | — | — | 1.598,00 | HB ekranı (07.09) |
| `ALM-HB-260216-04` | 4025334987 | — | — | 1.598,00 | HB ekranı (07.09) |
| `ALM-HB-260216-05` | 4205447254 | — | — | 1.598,00 | HB ekranı (07.09) |
| `ALM-HB-260516-12` | 4762659958 | 9381582956 | `DGS2026000013490` | 1.298,00 | **e-fatura PDF** |
| `ALM-HB-260516-13` | 4493666766 | 6120358020 | `DGS2026000013492` | 1.298,00 | **e-fatura PDF** |
| `ALM-HB-260516-14` | 4082444351 | 8565570612 | `DGS2026000013495` | 1.298,00 | **e-fatura PDF** |
| `ALM-HB-260516-15` | 4308842479 | — | (elde, 07.09 öncesi) | 1.298,00 | fatura |
| | | | | **8/8** | **kanıtlı** |

⚠ **İKİ KİMLİK CİNSİ AYRI YAZILDI:** `Sip. Ref. No` **Hepsiburada**'nın sipariş
numarası, `Sipariş No` ise **Groupe SEB**'in kendi numarası. İkisi aynı PDF'te
yan yana duruyor ve karıştırılırsa altı ay sonra bakan yanlış kaynağa gider.
_(Anayasa: "benzer ad, aynı kimlik değildir".)_

⚠ **VE DEFTERDE REFERANS BOŞLUKLU YAZILI** — `supplierOrderNo` alanında
`476 265 995 8` biçiminde duruyor. Düz numarayla (`4762659958`) yapılan ilk
arama **0 döndü** ve bu bir "yok" değil **bulunamama**ydı; kayıtlar yerindeydi.
_(Anayasa: "sıfır üç farklı şey olabilir" — kimlik yok / eşleşme yok / satır
yok; ayrımı yapmadan hüküm kurulmaz.)_

⭐ **VE İSTENMEYEN İKİ FATURA GERİ ÇEKİLMİŞTİ, YİNE DE GELDİ — DERS DEĞİŞMEDİ:**
belge istemeden önce _"bu soruyu defterin kendi izi zaten cevaplıyor mu"_ diye
sorulur. Bu üç fatura kaydı **doğruladı**, düzeltmedi: defter zaten doğruydu.
Kullanıcıya iş açmak da bir maliyettir.

⛔ **BEKLEYEN FATURA KALEMİ KALMADI.** Kalem panodan kaldırıldı, arşive
gerekçesiyle geçti.

---

## ✅ 22.08.2026 KAPANANLAR — N11 · yerleşim · yedek

Panodan gerekçesiyle indi (pano yalnız AÇIK kalemleri taşır).

| # | İş | Sonuç |
|---|---|---|
| **H22** | ✅ **N11 kesintileri ÖLÇÜLDÜ — kapandı 22.08.2026** | Gerçek N11 hakediş ekstresi geldi ve denklem **kuruşuna** kapandı (9.599 − 1.535,84 − 115,19 − 76,79 − 79,99 = 7.791,19). Ölçülen: komisyon **%16** üstüne KDV yok · **Pazarlama Bedeli %1,20** · **Pazaryeri Bedeli %0,80** (bizde HİÇ yoktu) · vergi kesintisi = stopaj (KDV hariç %1). Matrah **KDV DAHİL** — stopaj satırıyla bağımsız doğrulandı. nesatilir'in `%1,258`i çürüdü. Simülasyon kuralı düzeltildi, rozet `REFERANS → OLCULDU`. ⚠ **KALAN İKİ İŞ, aşağıda K27 ve K28.** |
| **K27** | ✅ **N11 kuralları DEFTERE geçti — 22.08.2026** | Canlıya yazıldı: `PAZARLAMA_HIZMET %1,20` · `PAZARYERI_BEDELI %0,80`, ikisi de `SALE_AMOUNT` (KDV dahil matrah). `AuditLog → N11_KESINTI_YAZ`. Geri alma yolu hazır: `npm run canli:n11-kesinti -- --geri --uygula`. ⚠ **GEÇMİŞ SATIŞLAR DEĞİŞMEDİ** — snapshot dokunulmazlığı korundu. İki N11 satışı (`284353754425` NET-2 138,04 · `283855414424` NET-2 664,31) hâlâ kesintisiz rakamı taşıyor; tazelenirse toplam **~₺80,80 düşer**. **Yeniden hesaplamak KULLANICI kararı** — bkz. K29. |
| **K29** | ✅ **Geçmiş TAZELENDİ — 22.08.2026** | Kullanıcı kararı: _"doğru olana doğru, geçmişi de tazele."_ ⚠ **ÖNCE BİR ENGEL ÖLÇÜLDÜ:** motor kesintiyi `validFrom <= soldAt` ile süzüyor; kural bugüne yazıldığı için 15/19 Ağustos satışlarına HİÇ uygulanmıyordu — tazeleme tek kuruş değiştirmezdi. `validFrom` **kanıtın kapsadığı** tarihe çekildi (`01.07.2026` — komisyon faturasının dönemi, en eski satırı 03.07). Daha geriye GİDİLMEDİ: öncesi için kanıt yok. Sonuç: `284353754425` **138,04 → 107,22** · `283855414424` **664,31 → 614,33** (toplam **−80,80**). ⚠ **TAHMİN TUTTU:** uygulamadan önce −30,82 / −49,98 denmişti, aynen o çıktı. İz: `N11_KESINTI_GECMISE_AC` + `N11_KAR_TAZELE`. |
| **K28** | ✅ **KAPANDI 22.08.2026 — motor DOĞRUYMUŞ** | Soru: hakedişten kesilen komisyon indirilecek KDV içeriyor mu? N11'in resmî e-faturası okundu (`DPE2026000325810`, 31.07.2026 — Excel'deki fatura numarasının **tam kendisi**, yani kapsam tartışması yok). Üç kalem de matrah+KDV olarak ayrılıyor ve toplamları hakedişteki kesintinin tam kendisi: komisyon `2.425,49 + 485,10 = 2.910,59` ↔ hakediş `2.910,59`. **Kesilen tutarlar KDV DAHİL**, içindeki KDV indirilebilir — motorun varsayımı doğruymuş, artık varsayım değil ölçüm. N11'in `belirsizlik` alanı **null** oldu: kanal tamamen ölçülü. |
| **K23** | ✅ **KAPANDI 22.08.2026 — sütun katlandı** | Üç seçenekten **①** yapıldı (kullanıcı onayı). **Satışlar:** `Adet` ürün adının altına indi — alımlar zaten "ürün + toplam adet" düzenindeydi, yani ekranlar arası tutarlılık da kazanıldı (İlke #10). **Alımlar:** `Kart` tutarın altına ("ne kadar ödedim, hangi kartla"), kalem sayısı ürün hücresine (toplam adetin yanına). **Hiçbir bilgi düşmedi** — ikisi de kendi doğal komşusuna taşındı. ⚠ **Marj kapatılmadı:** 17.08.2026'da kullanıcı isteğiyle NET rozetinden ÇIKARILMIŞTI; geri koymak alınmış bir kararı bozmak olurdu. Mutasyon iki yönlü sınandı. `yerlesim:dogrula` 10/10 ve **bekçi turu 42/42 yeşil**. |
| **K25** | ✅ **YEDEK BOŞLUĞU KAPANDI — 22.08.2026** | Tarife tabloları yedeğe eklendi (sürüm 5 → 6). ⚠ **VE LİSTEYE EKLEMEK YETMEDİ:** yedeği üreten kod bir döngü değil, elle yazılmış bir nesne — listeye tablo eklemek dosyaya veri koymuyordu. Yeni bekçi (`1b) ÜRETİCİ BEKÇİSİ`) bunu yakaladı ve **üç tablo daha** çıktı: `KartOdeme` · `GecmisEkstre` · `Talep`. Bunlar listede vardı, üreticide YOKTU. ⚠ Geri yükleme _"dosyada olmayan tablo BOŞALIR"_ diyor: bir yedekten dönülse **kart ödemeleri silinirdi** ve kart borcu tamamen yanlış çıkardı. Beşi de eklendi, mutasyonla sınandı, `yedek:dogrula` 30 → 33. |

| **K18** | **Sipariş no çakışması — SİSTEM OPERATÖRÜ YANLIŞA ZORLADI** | ✅ **KÖK SEBEP BULUNDU + DÜZELTİLDİ 20.08.2026.** Kullanıcı anlattı: siparişi girdi → hata fark etti → **iptal etti** → aynı numarayla yeniden girmek istedi → sistem _"bu sipariş mevcut"_ deyip **reddetti** → başka çıkış olmadığı için sona `0` ekledi. **Bu parmak hatası DEĞİL, tasarım kusuru:** `satisKaydet`'teki çakışma kontrolü `iptalTarihi`yi süzmüyordu. **DÜZELTME (şemaya dokunulmadı):** kural saf işleve çıktı (`siparisNoCakismaHukmu`), iptalli çakışma artık **ayrı hüküm** veriyor ve ekran _"o satışın iptalini geri alın"_ diyip **iptalli satışa bağlantı** veriyor. Test: `iptal:dogrula` 38 → **43**, mutasyon (iptalTarihi görmezden gelinsin) **2 kontrolü kırmızı yaktı.** ⚠ **VERİ DÜZELTMESİ HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |

_(K18'in kalan veri düzeltmesi panoda AÇIK duruyor.)_

---

## ✅ K33 TAZMİNAT KARŞI TARAFI — KAPANDI 23.08.2026

İade 10 günde ulaşmazsa pazaryeri **sebebi ne olursa olsun** onaylıyor,
para gidiyor; karşılığında kargo şirketinden tazmin isteniyor. Bu bir
KAYIP değil ALACAK ama sistemde bağ yoktu — kapanan iade sessizce kayıp
görünüyordu.

**Şema (canlıda):** `carrierId` (→ `CargoCarrier`) · `returnNoticeId`
(→ `ReturnNotice`) eklendi, `supplierId` zorunluluktan çıktı. Göç sonrası
sayım **8/8 tuttu, sapma 0.**

⚠ **KARGO FİRMALARI İKİNCİ KEZ `Supplier` OLARAK AÇILMADI** — aynı
varlığın iki kimliği bir gün ayrışır (Soundcore vakası). `CargoCarrier`
zaten vardı.

⚠ **`returnItemId` KALDIRILMADI:** ikisi ayrı soruya cevap veriyor —
biri _"iade işlendi, kalemi hasarlı"_, öteki _"iade HİÇ GELMEDİ ama alacak
doğdu"_. Bu vakada `Return` hiç doğmuyor.

⚠ **YAKALANAN TUZAK — KURAL VARDI, KAPI YOKTU.** `karsiTarafGecerliMi`
yazıldı, saf fonksiyon olarak sınandı ve **altı kontrol yeşil yandı** —
ama fonksiyon hiçbir yerden çağrılmıyordu. Şimdi `talepAç` içinde,
yazmadan ÖNCE. Bekçi üçünü de sınıyor: çağrılıyor mu · yazmadan önce mi ·
sebep ekranda yazıyor mu.

⚠ **İKİNCİ TUZAK:** _"mesaj uzunluğu > 20"_ diye bir kontrol yazılmıştı ve
mutasyon onu geçti. **Uzunluk, açıklayıcılığın vekili olamaz** — ölçüt
içeriğe çevrildi (neyin eksik olduğu + ne yapılacağı).

`tazminat:dogrula` 3 → **39 kontrol** · 12 mutasyon, hepsi kırmızı.

---

## ✅ PWA — KAPANDI 22.08.2026 (Halil testi geçti, iOS dahil)

Uygulama telefona kurulabiliyor: manifest + simgeler + servis çalışanı.

**Halil testi 8/8 geçti.** İlk turda 7 madde ölçüldü, madde 4 (iPhone ·
Safari) cihaz olmadığı için **ölçülemedi** ve `K30` olarak panoda açık
bırakıldı. Aynı gün iPhone bulundu ve test edildi: **sorun yok.**

**Kararlar — yeniden açılmaz:**
- **Çevrimdışı ÇALIŞMAZ, bilerek.** Önbelleğe giren tek küme
  `/_next/static/`; adresinde içerik özeti olduğu için bayatlaması
  imkânsız. Sayfa ve API cevabı ASLA saklanmıyor. Gerekçe `CLAUDE.md` →
  "PWA var, çevrimdışı yok". Sahada doğrulandı (test maddesi 8):
  bilgisayardan değiştirilen satış telefonda yenileyince YENİ rakamla
  geldi.
- **Kapı açıldı** (`proxy.ts`): tarayıcı manifest ve simgeleri çerezsiz
  çeker; kapatılsa kurulum teklifi hiç çıkmaz ve ekranda hata görünmezdi.
- **Eski iOS etiketi elle basılıyor** (`apple-mobile-web-app-capable`):
  Next yalnız yeni adı basıyor (`metadata.js:606`), eski Safari sürümleri
  yalnız eskisine bakar. Sigorta; gerekmediği sürümde etkisiz.

Bekçi: `npm run pwa:dogrula` (61 kontrol, 25 mutasyon denendi, 25'i
kırmızı).

---

## ✅ FİYAT DENEMESİ — KAPANDI 22.08.2026 (Halil testi geçti)

**Ne yapıldı.** "Bu ürünü şu fiyata satarsam elime ne kalır — ve hangi
pazaryerinde en çok kalır?" sorusunu cevaplayan ekran (`/simulasyon`).
Altı teslimde tamamlandı; hepsi 21–22.08.2026.

**Zincir — her adımı kullanıcı geri bildirimi açtı:**

1. Ekran yazıldı, sonra **baştan yazıldı** — _"bu nasıl kötü bir front
   end dir yahu"_. İlk hâli GET formu + 8 sütunlu tabloydu.
2. Barkod/SKU ile ürün çekme — alış maliyeti, komisyon ve satış geçmişi
   defterden kendiliğinden geliyor. _nesatilir'in yapamayacağı şey buydu:
   orada üç rakamı da kullanıcı bilmek zorunda._
3. **Komisyon kanal başına** — ölçüldü: aynı üründe kanaldan kanala fark
   ortanca 2 puan, **max 14,4 puan** (1.000 ₺'de ₺144).
4. **Kanal kutuları görünmüyordu** — kullanıcı canlıda yakaladı. Kök
   sebep sıralama tuzağıydı: kutular sonuç kutusunun içindeydi, sonuç
   kutuları da kapı ORTAK oranı şart koştuğu için çizilmiyordu. Yani
   _"kanal oranı YOKSA"_ etiketli alanı doldurmadan kanal oranı
   girilemiyordu — ekran kendi etiketiyle çelişiyordu.
5. **Buy box fiyatı kanal başına** — asıl iş değeri burada. Motor tek
   fiyat alıyordu; kullanıcının sorusu ise her kanalın KENDİ buy box'ı.
6. Görünüm: kartlar ayrıldı, gri gitti, renk **duruma** bağlandı, girdi
   kutuları girdi gibi göründü (kenarlık + ₺/% birim işareti).

**Kanıt — kullanıcının elle hesabı motorla tuttu** (alış 1.000, kargo 200):

| Kanal | Buy box | Komisyon | Halil | Selliora NET-2 | Fark |
|---|---|---|---|---|---|
| Trendyol | 2.150 | %5 | 673,02 | **673,17** | +0,15 |
| N11 | 2.175 | %12 | 554 | **540,62** | −13,38 |
| Hepsiburada | 2.250 | %13 | 533,25 | **538,25** | +5,00 |

**En düşük satış fiyatı en yüksek kârı veriyor** — ve sıralama iki
hesapta da aynı. Bu terslik gözle görülmez; ekranın bütün varlık sebebi bu.

⚠ **N11 FARKI (₺12,39) — ÖLÇÜT DÜŞTÜ, 22.08.2026.**

İlk yazımda şöyle demiştim: _"Gerçek bir N11 ekstresinden geliyorsa
kullanıcınınki doğru, bizimki eksik."_ **Bu çerçeve yanlıştı ve burada
bilerek bırakılıyor** — kullanıcı sorunca kaynağı sordum, cevap:
_"bir örnek olarak vermiştim."_ Yani `₺27,36` gerçek bir N11 rakamı değil.

⚠ **VE NEREDEYSE MOTOR DEĞİŞTİRİLİYORDU.** Aritmetik kusursuz tutuyordu:
`12,58 / 1.000 = %1,258` ve `%1,258 × 2.175 = 27,3615` — kullanıcının
rakamıyla **0,0015 ₺** fark. Düzeltilmiş NET-2 de `554,07` çıkıyordu,
onun `554`'üyle kuruşuna. Denklem kapanıyordu ve tam bu yüzden ikna
ediciydi.

**Melontik dersinin birebir tekrarı:** _"doğru çalışan bir motor, yanlış
bir ölçüt uğruna bozulmak üzereydi."_ Ölçütün gerçekliği ölçümden ÖNCE
sorulmalıydı; ben ölçümü yapıp sonra sordum.

**GERİYE KALAN SORU BİZDEN KAYNAKLI VE GEÇERLİ:** `PAZARLAMA_HIZMET =
12,58` tek bir senaryodan (nesatilir, satış ₺1.000) alındı ve kodun kendi
notu _"sabit mi ciro yüzdesi mi ayırt edilemedi"_ diyor. Bu belirsizlik
1.000 ₺ dışındaki her fiyatta N11 hesabını kaydırıyor. Kapanışı gerçek bir
N11 ekstresi getirir — nesatilir'e ikinci bir senaryo girmek DEĞİL, çünkü
o aynı kaynağın ikinci yoludur. _Bkz. BEKLEYENLER → H22._

**Kararlar:**
- **Buy box OTOMASYONU AÇILMADI** — kullanıcı: _"manuel gireceğim, ürün
  arama sırasında anlık takip ediyorum, otomasyona ihtiyacım şu an yok."_
  Ölçüm yapıldı ve panoda duruyor: TY ürün listesinde `BuyBox Fiyatı`
  kolonu VAR (189/189 canlı listede dolu, barkodlu), HB fiyat vermiyor
  yalnız SIRA veriyor. Şema işi yapılmadı. **Açılış şartı:** elle takibin
  yetersiz bulunması.
- **Marka rengi kullanılmadı.** Trendyol'u turuncu yapmak, turuncunun
  "uyarı" anlamını bu ekranda bozardı. Renk kanalın KİMLİĞİNE değil
  HÜKMÜNE bağlı.
- **Ortak satış fiyatı isteğe bağlı.** Kullanıcının elinde tek bir fiyat
  yok, üç ayrı buy box var; ortak alanı şart koşan kapı onu olmayan bir
  rakamı uydurmaya zorlardı.

**Testler:** `simulasyon:dogrula` 82 → **139 kontrol**. On dört mutasyon
denemesi, hepsi kırmızı yandı.

⚠ **MUTASYON İKİ KEZ TESTİN KENDİSİNİ YAKALADI:**
- `yakin()` `null` gelince **TypeError ile çöküyordu** — sonda ortada
  ölüyor, geri kalan kontroller hiç koşmuyordu. Rapor "4 hata" diyordu;
  düzeltilince aynı mutasyon **10 hata** verdi.
- _"En düşük fiyatlı kanal kazanıyor"_ kontrolü **kördü**: bütün NET'ler
  `null` olduğunda sıralama girdiyi bozmuyor, TRENDYOL zaten ilk sırada
  ve kontrol yeşil kalıyordu.
- `bg-card` kontrolü **yalancı yeşildi**: desen bloğun YORUMUNDA da
  geçiyordu. İşaret `className`e bağlandı.

**Halil testi ✓ 22.08.2026** — sekiz madde, gerçek cihaz + canlı adres.
Kullanıcı onayı: _"bu testler ok"._

---

## ✅ DEFTER ONARIMI — KAPANDI 20.08.2026 (K20 · K21 · K22)

**Zincir:** sipariş no çakışması → kullanıcı numaraya `0` ekledi → iptal/geri
alma → **iki ayrı yazılım hatası** → **iki hayalet adet** + şişik NET.

**Kod düzeltmeleri (testli, mutasyonla sınanmış):**
- `AYNA_ADET_UYUSMAZ` — geri alma, satışın kendi adedinden fazlasını
  düşüremez. _Vaka: 1 adetlik satış 2 adet düşürdü._
- `AYNA_TUKENMIS` — tükenmiş parti ikinci kez tüketilemez. _Hayaletin
  kaynağı buydu._
- Ayna süzgeci `gte` → **tam damga** (`occurredAt === iptalTarihi`).
- Sipariş no çakışmasında iptalli kayıt **ayrı hüküm** + ekranda çıkış yolu.

**Veri onarımı** — `canli:defter-onarim` (3 vaka, kimliğe kilitli, `--geri`
ile geri alınabilir, `AuditLog`'a **3 iz**). Miktar/para değişmedi; yalnız
`sourceMovementId` ve `unitCostAmount`.

**SONUÇ — ölçüldü:**

| | ledger | FIFO | beklenen |
|---|---|---|---|
| `OYU-LG-598P-01` | 4 | 4 | 4 ✅ |
| `axcali1667` | 2 | 2 | 2 ✅ |

`canli:defter-ayrismasi` → **72 varyantın 72'si temiz, çıkış kodu 0.**
Satış `11518018178`: CANLI · doğru numara · **NET-2 3.188,75 → 189,58** ✅

⚠ **YOL BOYUNCA İKİ HATAM:** ① "ledger 1 eksik, +1 ekle" dedim — pozitif
düzeltme **iki deftere birden** yazıyor, ayrışma kapanmadı yön değiştirdi
(ledger 3→4 ✓, FIFO 4→5 ✗). ② Onarım betiğinde ayırt ediciyi "kaynağı açık
partilerde yok" diye kurdum; partiyi **son adedine kadar** tüketen hareket
de listeden çıkıyor — kilit iki kayıt bulup durdu, doğrusu **kapasiteyle
kıyas** oldu. İkisi de kilit/önizleme sayesinde veriye ulaşmadı.

# Bekleyen İşler

Karara bağlanmış ama bilinçli olarak sonraki pakete bırakılmış işler.
Sırası gelince CLAUDE.md'deki **Kullanıcı Kolaylığı İlkeleri** kontrol
listesiyle birlikte teslim edilir.

## 📌 AÇIK KOMUTLAR — 18.08.2026, gün sonu

_Bu bölüm **komut bazlı**; aşağısı paket bazlı. Amaç: verilen bir talimatın
listede kaybolmaması. **Her komut kapandığında buradan SİLİNİR**, ayrıntısı
ilgili pakette kalır._

> **NİYE VAR:** 18.08'de iki komut tekrar gönderildi çünkü yapılıp
> yapılmadığı taranabilir değildi. İkisi de yapılmıştı — kayıt eksik değil,
> **görünürlük** eksikti. Kural: kayıt varsa yetmez, ARANABİLİR olmalı.

### ⏸ HALİL'E BAĞLI (kod işi kalmadı)

| # | İş | Ne gerekiyor |
|---|---|---|
| ~~H1~~ | ~~Dilim tarifesi~~ | ✅ **KAPANDI 19.08** — 640 kalem yazıldı, geri okunarak doğrulandı, çapraz teyit tuttu. **Aşama 1 açılabilir** |
| H2 | **Hakediş `.xlsx` teyidi** | Taze dönem dosyası → `canli:hakedis-esle` (hesap kırılımı) → `canli:hakedis-teyit` |
| H3 | **SATIŞLARIMIZIN ÖDENDİĞİ DOSYA — ~20.09 SONRASI** | 🔁 **ÜÇÜNCÜ KEZ TANIMLANDI 20.08.2026 — artık TARİHE değil OLAYA bağlı.** _"Ağustos dosyası"_ iki kez yanlış çıktı: ağustos **ödeme** dosyası haziran/temmuz **siparişlerini** taşıyor. **Ölçüldü:** TY sipariş→ödeme ortanca **28 gün** (n=267; p25 23 · p75 32 · max 41) · HB **~34 gün** (24 iş günü, teslimden sonra). 20.08'de gelen 7 TY + 3 HB dosyasında **188+46 sipariş no, eşleşen `0`** — kusur değil **takvim**. **PROJEKSİYON:** TY satışlarımız (`17.06–20.08`) → ödeme **`15.07–17.09`** · HB (`06.08–20.08`) → ödeme **`09.09–23.09`**. **İSTENECEK: ~20.09 sonrası TY ödeme dosyaları + HB ekstresi.** ⛔ Bugün yükleme YAPILMADI: bağsız yığını 168'den ~400'e çıkarır, hiçbir şey bağlamaz. |
| H4 | **Philips kanal düzeltmesi** | 🔁 **YARISI ÇÜRÜDÜ 20.08.2026.** Kanal taşıması ✓ (Halil yaptı). ⛔ **ORAN DÜZELTMESİ İPTAL — `%2,70` DOĞRU:** Trendyol her Salı tarife yayımlıyor ve fiyat indirimi karşılığı komisyon indiriyor. **`~₺721` tahmini GEÇERSİZ** — hiçbir kayıp yok. _Eski hâli:_ `11492798173` · `11493262226` HB'de kayıtlı ama TY biçiminde sipariş no taşıyor (HB aralığı `4.01–4.99 milyar`, bunlar `11,49 milyar`; ayrıca 10.08'de dört satış tek TY dizisinde). **Taşıma onaylı**, kanal-değişince-kâr-tazelenir düzeltmesi canlıya çıkınca yapılır. ⚠ `%2,70` sapması AYRI kusur — her iki kanalda da kayıtlı oran `%15`. |
| ~~H7~~ | ~~**Geçmiş tarife pencereleri**~~ | ✅ **KAPANDI 20.08.2026 — arşiv erişilebilir ama DOSYA BAŞKA TÜR.** Gelen dosya "İndirimli Komisyon Tarifeleri" raporu: 74 satır, 7 kesintisiz pencere (`30.06–04.08`), 56 barkod (53'ü katalogda). ⚠ **Bu bir tarife değil FATURA ÖZETİ:** aralıklar yalnız satış OLAN yerlerde dolu (74 satırın 71'inde tek aralık). `Komisyon Değişimi` kolonu mekanizmayı yazıyor (`%12.00 → %3.3`) — **`%2,70` üçüncü ve kesin kez meşru.** Simülasyon için gereken ileri tarife BU DEĞİL → **H9**. |
| ~~H9~~ | ~~**Arşivde İLERİ tarife var mı?**~~ | ✅ **KAPANDI 20.08.2026: HAYIR.** Arşiv yalnız **performans raporu** veriyor (32 kolon, gerçekleşen oran); Salı/Cuma yayımlanan tam dilimli tarife (161 satır, `1.KOMİSYON…4.KOMİSYON`) o ekrandan inmiyor. **SONUÇ: geçmiş dönemlerde DİLİM SİMÜLASYONU kurulamaz, yalnız DENETİM yapılabilir.** İleri tarife için tek yol → **H10 rutini**. |
| H20 | **`soldAt` saat bilgisi taşımıyor** | 🕓 **ACİL DEĞİL.** Satış tarihi gün hassasiyetinde (`00:00`); tarife pencereleri ise `08:00→07:59`. Tam sınır gününe düşen satışın hangi pencereye ait olduğu **veriden çözülemez** ve K9 orada hüküm vermiyor (doğru davranış). TY sipariş dökümünde saat VAR (`27.06.2026 13:54`) — içe aktarma yazıldığında saat de alınabilir. O gün bu belirsizlik kendiliğinden kapanır. |
| H10♻ | **RUTİN: her Salı/Cuma tarife dosyasını indir** | ♻ **SÜREKLİ KALEM.** İleri tarife (tam dilimli) arşivden İNMİYOR — yalnız güncel hâli var. Her yayımda indirilip biriktirilmezse o hafta bir daha elde edilemez ve `Fiyat dene` o dönem için simülasyon yapamaz. _TY haftayı ikiye bölüyor: Salı 08:00→Cuma 07:59 (3 gün) · Cuma 08:00→Salı 07:59 (4 gün)._ Yükleme: `npm run canli:tarife-yukle`. |
| H8 | **HB hizmet bedeli — SORU DEĞİŞTİ** | 🔴 **ÖLÇÜLDÜ 20.08.2026, ASIL SORU BAŞKA ÇIKTI.** HB ekstresi (633 tekil satır, 114 sipariş, `04.06–13.08`): **4 sipariş 2 paketli — DÖRDÜNDE DE hizmet bedeli HİÇ kesilmemiş.** Yani "paket başına mı" sorusu cevaplanamıyor: bölünecek bedel yok. **Bulunan asıl gerçek: hesabı kesilmiş 99 siparişin yalnız 14'ünde (%14) ₺12,60 kesilmiş** — hepsi `Durum: Ödendi`, yani "henüz oluşmadı" değil. Motorumuz HB satışlarının **%100'ünden** kesiyor. Koşul dosyada YOK: iki grup da kargo kaydı taşıyor (14/14 · 85/85), ciro aralıkları iç içe (ortanca 2.181 ↔ 3.034), **aynı günde hem kesilen hem kesilmeyen var** (24 sipariş), `Açıklama` boş. **Kural DEĞİŞTİRİLMEDİ** — sıfıra çekmek de en az mevcut hâli kadar dayanaksız olurdu. **KAPANIŞ ŞARTI:** 13 HB satışımızın hepsi ağustos; ekstreleri ~24 iş günü sonra (≈ eylül ortası) düşecek. O dosya gelince satış satış kıyaslanır. Kullanıcı hipotezi (_"siparişin geldiği kargoya verirsen hizmet bedeli almıyor"_) o zaman sınanabilir; bugünkü veri onu ne doğruluyor ne çürütüyor. |
| ~~H5~~ | ~~**`sfsfsf` test kaydı**~~ | ✅ **KAPANDI 20.08.2026 — İPTAL EDİLDİ, silinmedi.** Halil ekrandan iptal etti (`MAGAZA_DIGER`, not: "yanlış kayıt"). Doğrulandı: `SALE_CANCEL_IN +1` yazıldı, `axcali1690` stoğu geri döndü (toplam 1). Kayıt duruyor ve geri alınabilir. _Silme reddinin gerekçesi anayasada: cascade silme `saleItemId`yi boşaltır, stok düşük kalır ama düşüren kaybolur._ |
| H19 | **`min −28` ters tarihli alım** | ⛔ **BAKILMAYACAK — KARAR 20.08.2026, üçüncü kez soruldu üçüncü kez aynı cevap.** Sipariş→teslim dağılımında teslimi siparişten **28 gün ÖNCE** damgalı en az bir kayıt var. Gerekçe sabittir: **mekanizma kuruldu** (mal kabul formundaki geç teslim uyarısı `TERS` hâlini yakalıyor), eski kayıt **para/stok/NET etkisiz**. _"Arandıkça değil, çıktıkça"_ — kendini gösterirse bakılır. **Bu kalem yeniden açılmaz.** |
| H11 | **BAĞSIZ HAKEDİŞ YIĞINI BÜYÜYOR** | ⚠ **ACİLİYET ARTTI.** Gecikme sayımı dışındaki kalem 19.08 sabahı **67**, akşamı **168**. Yığın büyüyor demek, hakediş↔satış bağı kurulmadıkça sistemin "alacağım ne" sorusuna verecek cevabı KÜÇÜLÜYOR demektir. H2 (hakediş `.xlsx` teyidi) sırayı öne alıyor. _Kayıt 19.08.2026._ |
| H12 | **DÖRT satış özel satır** | `11493262226` · `11492798173` · `11492628481` (Philips 5000, ~−721 TL) **+ `11331575354` — i9000 Ultra SkinIQ** |
| H13 | **⚠ İ9000 — TEK BAŞINA ÜÇLÜDEN BÜYÜK** | `11331575354` · Trendyol · 17.06 · **₺12.960** · oran **%2,70** · ~12 puan fark ≈ **~₺1.590 potansiyel şişkinlik** · üstelik **"iade var" rozetli**. Hakediş teyidinde ÖNCE bu bakılır. |
| H14 | **Ödeme hizmeti hipotezi** | H2 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı |
| H15 | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor |
| H16 | **Canlı tur** | Kart sırası · yapışkan çubuk · döküm görüntüsü · kıyas ibaresi (hepsi deploy'da) |
| H17 | **Yedek — ilk gece doğrulaması** | ✅ Dış zamanlayıcı KURULDU ve test 200 verdi. Yarın sabah `/ayarlar/disa-aktarma` → **kırmızı eksik gün kutusu kaybolmuş olmalı** |
| H18 | **Melontik ölçütü** | Çapraz teyit için GERÇEK Melontik çıktısı (sunum demo çıktı) |

### 🔧 BİZDE — karar bekleyen

| # | İş | Durum |
|---|---|---|
| K7 | **`satis.veri.dogrula` ayrı izni** | 🕓 **SaaS/RBAC kalemi — bugün AÇILMAZ.** Veri doğrulama bugün `satis.duzenle` istiyor. Ayrı izin daha temiz olurdu ama iki bacaklı yetki işi doğurur (izin anahtarı + seed + canlı senkron) ve tek kullanıcıda boş katmandır. Faz 4'te RBAC ile birlikte. _Karar 19.08.2026._ |
| K10 | **Pano kodu ataması elle** | 🧹 **ACİL DEĞİL.** `H*`/`K*` kodları elle veriliyor; 20.08.2026'da **iki satır da `H6`** oldu (yeni kalem + eski "Canlı tur") ve pano okunmaz hâle geldi. Çakışan kimlik, panonun taranabilirliğini bitirir. Çare: kod ataması en büyük numaranın bir fazlası olsun — ya bir betikle ya da tek kaynaklı bir sayaçla. |
| K9 **[KOŞTU]** | **Oran denetimi** — `canli:oran-denetimi` | ✅ **20.08.2026.** Salt okuma, `--uygula` YOK. **GEÇERLİ:** geniş · `…19_04_51.xlsx` · 97 satır · `30.06–21.08` → rapor **227 adet** · sistemde **9** · fark **218** · ciro **₺747.024**. **AŞILDI:** dar · `…18_40_30.xlsx` · 25 satır · `28.07–21.08` → rapor 72 · sistemde 8 (yanlış değil, **dar pencerenin** sayısı). **ORAN SONUCU: SAPMA 0** — `"~₺18.000 eksik kâr"` çürüdü. **CİRO ETİKETİ ÖLÇÜLDÜ:** kolon raporun kendi adıyla `Toplam Tarifeli Brüt Ciro`; eşleşen 6 satırda rapor birim cirosu ↔ bizim **KDV DAHİL** birim fiyatımız → **en büyük sapma %0,29.** KDV ayrımı olsaydı fark ~%16,7 olurdu; **taban AYNI, ciro KDV DAHİL.** ⚠ Kalan küçük fark (ör. ₺15'lik sabitler) **açıklanmadı** — taban sorusunu kapatır, o farkı kapatmaz. **İKİ DAMGA basılıyor:** rapor üretim anı + sistem okuma anı. Sınır günü 2 kalemde hüküm yok (**H20**). |
| K8 | **H2 — hakediş eşleştirme mekanizması** ⛔ _H3'e bağlı: ~20.09'a kadar iş göremez_ | 🔨 **KÜÇÜK TUTULACAK.** Anahtar = sipariş no (biçim testi yapıldı: HB 10 hane, TY 11 hane, satış kodlarıyla BİREBİR uyumlu). Rapor/`--uygula` ayrımı, bağlanamayan kalemler ADIYLA beyan edilir (648 dersi). ⚠ **Bugün BOŞ çalışacağını bilerek yazılıyor** — doğru dosya gelince anında iş görsün. |
| K6 | **Eşik yeniden ölçümü — n=200'de** | 🕓 **ZAMANA BAĞLI.** `veri-supheli.ts` eşikleri (`verim > %200`, `maliyet payı < %5`) **n=40** tabanından çıktı (19.08.2026; p95 %154, p5 %44,8). Satış kalemi **200'ü geçince** dağılım yeniden ölçülür ve eşikler tazelenir. Ölçüm aracı: `canli:bekleme-olcum` (verim dağılımı bölümü). _Eşik kaynağıyla anılır; taban büyüdüğünde kaynak eskir._ |
| K1 | **Uyarı Merkezi Faz 2** | ✅ **KAPANDI 20.08.2026** — beş adayın dördü yazıldı, biri ölçümle düşürüldü; Halil canlıda uçtan uca doğruladı (aşağıda). |
| K5 | **Aşama 1 — fiyatlama aracı** | ✅ **KAPANDI 19.08.2026** — üç katman da bitti, Halil canlıda iki yönlü doğruladı (aşağıda) |

_K2 (yükleme kaydı) · K3 (oran uyarısı) · ham arşiv kalemi 18.08'de
kapandı; ayrıntıları ilgili paketlerde. **Pano kuralı: kapanan komut
buradan SİLİNİR** — birikirse pano da taranamaz hâle gelir._

### ✅ BU OTURUMDA KAPANANLAR (ayrıntı ilgili pakette)

satış düzeltme+iptal · adet dilimi · marj anahtarı · hafif yetki dilimi ·
kanal kodsuz kayıtlar · komisyon envanteri · dosya muayenesi · tarife
şeması+migration · tarife okuyucu+yazma yolu · N11 okuyucusu · kanal
kırılımı · EUR ertelemesi · yükleme kaydı (AuditLog) · oran uyarısı +
Kural #11 · ham arşiv kalemi (gerekçeli kapanış)

**ANAYASAYA GİREN DERSLER (bugün 5):** iki defter birlikte ölçülür ·
tutarlılık ≠ doğruluk · şema değişikliği en pahalı çözümdür · yeni izin
doğum tarihi beyan edilir · _(ölçüm ikiliği: kaynağın varlığı,
güncelliğinden önce gelir)_

---


### 🔴 CRON — TEŞHİS KAPANDI, DIŞ ZAMANLAYICIYA GEÇİLDİ (19.08.2026)

**AYIRT EDİCİ TEST SONUCU: `YETKISIZ` (401).** Uç açık, `CRON_SECRET`
mevcut, doğrulama çalışıyor. **(A) ve (B) elendi.**

Dört katman zaten tek tek ölçülmüştü ve hepsi temizdi: yol birebir ·
tanım hiç değişmemiş · ara katman ucu açık tutuyor · kimlik kontrolü
standart desen. Geriye **Vercel zamanlayıcısının kendisi** kalıyor —
**ve Hobby planında logu olmadığı için ne olduğu öğrenilemez.**
**Teşhis burada tavan yaptı.** _Anayasa: "yönetilemeyen bağımlılık —
üçüncü şans verilmez."_

#### ✓ ÇİFT TETİK ZARARSIZ — ÖLÇÜLDÜ, VARSAYILMADI

`lib/yedek-yaz.ts` okundu: dosya adı güne sabit
(`yedek/selliora-{gün}.json`), `addRandomSuffix: false` +
`allowOverwrite: true`, ve `put` **ancak içerik TAM üretildikten sonra**
çağrılıyor. İki zamanlayıcı aynı gün tetiklerse **aynı dosya tazelenir,
kopya oluşmaz**; yarım içerik iyi bir yedeğin üstüne yazamaz.
→ **Vercel cron tanımda KALIYOR** (bedava yedeklilik), ama birincil değil.

---


#### ✅ DIŞ ZAMANLAYICI KURULDU — 19.08.2026, test 200 OK

`cron-job.org` → günlük 03:00, `Authorization: Bearer <CRON_SECRET>`,
başarısızlık bildirimi açık. **Testlauf: 200 OK · 5,46 sn.**

**KURULUMDA İKİ TUZAK ÇIKTI, ikisi de kayda değer:**

1. **`CRON_SECRET` boşluk taşıdı ve BUILD ÇÖKTÜ.** Vercel açıkça söyledi:
   _"contains leading or trailing whitespace, which is not allowed"_.
   Kaynak: kod bloğu kopyalanırken **sondaki satır sonu** da geliyordu ve
   gözle görünmüyordu. İki deneme de aynı sebeple düştü.
   → **Çözüm: kopyalama bırakıldı, ELLE YAZILABİLİR sır üretildi**
   (24 karakter, küçük harf + rakam, karışan harfler `l 1 0 O i` yok).
   Üçüncü denemede build yeşil.

   ⚠ **Yan sonuç:** build çöktüğü için redeploy hiç tamamlanmamıştı;
   uygulama eski sırla çalışmaya devam ediyordu. 401'lerin sebebi
   header değil **başarısız dağıtımdı** — hata mesajı okunmasaydı
   header ayarlarıyla saatlerce uğraşılırdı.

2. **"Sensitive" alan BOŞ görünüyor ama yer tutucu doluymuş gibi
   duruyor.** Vercel `sk_live_a12…` diye gri bir örnek gösteriyor;
   kullanıcı "silinecek bir şey yok" dedi ve haklıydı.
   _Kural #11'in vahşi doğadaki örneği — yer tutucu değer sanıldı._

**VERCEL CRON TANIMDA KALDI.** Build hatası düzeldiğine göre Vercel'in
kendi cron'u da düzelmiş olabilir; iki kaynak birbirini yedekler ve
çift tetik zararsız (idempotent, ölçüldü).

**YARIN SABAH:** `/ayarlar/disa-aktarma` → kırmızı eksik gün kutusu
kaybolmuş olmalı. Sarı **"yetkisiz çağrı"** kutusu çıkarsa, Vercel'in
kendi cron'unun başlık gönderip göndermediği de anlaşılacak.


#### ❓ AÇIK SORU — Vercel cron `Authorization` gönderiyor mu? (ölçüm kuruldu)

**ÖLÇÜLDÜ, KODDAN:** rota Vercel-cron isteğini **YALNIZ `Authorization:
Bearer $CRON_SECRET`** ile tanıyor. Başka hiçbir işaret aranmıyor —
`x-vercel-*` başlığı yok, `user-agent` kontrolü yok. `vercel.json` cron
tanımı da başlık taşımıyor (şemasında öyle bir alan yok).

**Yani mimarın hipotezi mekanik olarak MÜMKÜN:** Vercel tetikliyor,
başlık gelmiyor, rota 401 dönüyor, Vercel sessizce yutuyor.

**⚠ ÖLÇÜM BOŞLUĞU VARDI VE KAPATILDI.** Yalnız RED kaydediliyordu. Ama
artık uca **iki** zamanlayıcı vuruyor (Vercel 00:00 · cron-job.org 03:00)
ve ikisi de **aynı dosyayı** üretiyor. İkisi de başarılı olsaydı tek
dosya oluşur ve **hangisinin yazdığı anlaşılmazdı** — "kayıt yok" hem
"çağırmadı" hem "çağırdı ve başardı" demeye gelirdi.
→ **Başarılı çağrı da artık iz bırakıyor** (`YEDEK_UCU_KOSTU`,
`user-agent` ile) ve ekranda **"Yedeği kim aldı"** listesinde görünüyor.

_Başarıda gün sınırı YOK — bilerek: iki çağıranı da aynı gün görmek
istiyoruz. Sınırsız yazma riski de yok, buraya ancak doğru sırrı bilen
ulaşır._

**YARIN SABAH ÜÇ DURUM BİRBİRİNDEN AYRILACAK:**

| Ekranda gördüğün | Hüküm |
|---|---|
| "kim aldı" listesinde **`vercel-cron/...`** | Vercel başlığı **GÖNDERİYOR** → eski kaçışların sebebi başkaydı (muhtemelen bozuk `CRON_SECRET`) |
| Sarı **"yetkisiz çağrı"** kutusunda `vercel-cron/...` | **HİPOTEZ DOĞRU** — tetikliyor ama başlık yok. _Anayasa vakası güncellenir: "Vercel suçlu" hükmü **"bizim kapı Vercel'i tanımıyordu"**ya döner._ |
| Yalnız `cron-job.org` var, Vercel hiç yok | Vercel tetiklemiyor — özgün teşhis ayakta kalır |

_Acele değil; dış zamanlayıcı A planı ve çalışıyor. Bu ölçüm yalnız
anayasa vakasının doğru yazılması için._

### 📋 HALİL İÇİN: DIŞ ZAMANLAYICI KURULUMU

**ÖNCE — `CRON_SECRET` değerini al:**
Vercel → projeye gir → **Settings** → **Environment Variables** →
listede `CRON_SECRET` → yanındaki **göz/Reveal** ile değeri göster,
kopyala. _(Değeri hiçbir yere yapıştırıp bırakma; doğrudan aşağıdaki
alana gidecek.)_

**SONRA — zamanlayıcıyı kur** (`cron-job.org`, ücretsiz):

| # | Adım | Ne yazılacak |
|---|---|---|
| 1 | Hesap aç, e-postayı doğrula | — |
| 2 | **Create cronjob** | — |
| 3 | **Title** | `Selliora gunluk yedek` |
| 4 | **URL** | `https://axc-seven.vercel.app/api/yedek/otomatik` |
| 5 | **Schedule** | Her gün, saat **03:00** |
| 6 | **Timezone** | **Europe/Istanbul** _(seçenek varsa; yoksa 03:00 UTC de olur — gece koşması yeterli)_ |
| 7 | **Advanced → Request method** | `GET` |
| 8 | **Advanced → Headers** → yeni satır | ad: `Authorization` · değer: `Bearer ` + kopyaladığın sır |
| 9 | **Notifications** | **"on failure" / başarısızlıkta e-posta** AÇIK |
| 10 | Kaydet, sonra **"Run now"** ile hemen dene | — |

**BAŞARI ÖLÇÜTÜ:** HTTP **200** ve gövdede `"durum":"TAMAM"` ile birlikte
`gun`, `satir`, `boyutBayt` alanları. Başka bir şey görürsen:
· `401 YETKISIZ` → başlıkta `Bearer ` öneki eksik ya da sır yanlış
kopyalanmış · `503 KAPALI` → sır Vercel'de silinmiş.

> ✅ **ZAMAN AŞIMI KORKUSU YERSİZ ÇIKTI — ÖLÇÜLDÜ 19.08.2026: 5,46 sn.**
> Rotanın `maxDuration = 60` olmasına bakıp "60 saniye sürebilir, servis
> 30'da pes eder" diye uyarmıştım. **Üst sınırı gerçek süre sanmışım.**
> Gerçek koşu 5,5 saniye; hiçbir servisin varsayılanına yaklaşmıyor.
> _Ders: bir sınır değeri, ölçülmüş bir süre değildir._

**9. ADIM NİYE ÖNEMLİ:** iki kaçışı da biz fark ettik, sistem söylemedi.
Bildirim açıkken **üçüncü kaçışı servis kendisi haber verir.**

#### ✓ EKSİK GÜN KUTUSU HAZIR (18.08)

`/ayarlar/disa-aktarma` sayfasında son 14 gün taranıyor; yedeği olmayan
günler tarihleriyle kırmızı kutuda yazıyor. **Kurulumdan sonraki ilk
doğrulama oradan okunacak:** ertesi gün kutu kaybolmuş olmalı.
_Bugün eksikse kaçış sayılmaz (cron gece koşar); en eski yedekten öncesi
de sayılmaz._ `yedek-bosluk:dogrula` 18 kontrol, üç mutasyon kırmızı.

#### HOBBY → PRO

Kök sebep zamanlayıcı olduğu için **Pro'ya geçmek şart değil** — dış
zamanlayıcı sorunu kaynağında çözüyor ve **ücretsiz**. Pro'nun bu vakadaki
tek gerçek faydası **log saklama** olurdu (teşhisi tahmine bırakmamak).
Dış zamanlayıcı kendi log'unu tuttuğu için o ihtiyaç da karşılanıyor.
**Öneri: şimdilik Hobby'de kal.** _Karar Halil'in._


#### ✅ H1 ÖLÇÜLDÜ — 19.08.2026: **158/160 eşleşti**

Dilim dosyası `canli:tarife-yukle` ile **rapor kipinde** koşuldu
(yazma yok). _Penceresi geçmiş olması ölçümü engellemedi — "yeni pencere"
beklerken asıl sayıyı geciktirmişim._

```
pencere        14.08.2026 08:00 → 18.08.2026 07:59
okunan satır   160        (161 satır, 1 mükerrer elendi)
yazılan kalem  640        (160 × 4 dilim)
eşleşen ürün   158
BAĞSIZ ürün      2  (8 kalem)
```

**→ AŞAMA 1 KAPSAMI: %98,75.** Fiyatlama aracı 158 üründe dilim
simülasyonu yapabilir. Kapsam sorunu YOK.

#### 🔧 GERÇEK VERİ BİR HATA BULDU — eşleşme tek aşamalıydı

İlk koşuda 3 bağsız çıktı. Üçünden birini ölçtüm: **`Soundcore Q21i`
sistemde ZATEN VARDI** (`axcali2755`).
· katalog barkodu → `194644037819`
· **Trendyol kanal SKU'su → `194645027819`** ← tarife dosyasındaki barkod

Yanlış negatif. Sebebi: **dosya PAZARYERİNİN kendi kodunu taşıyor**, bizim
katalog barkodumuzu değil; ikisi çoğu üründe aynı ama aynı olmak ZORUNDA
değil. Mevcut komisyon içe aktarması bunu zaten üç aşamalı yapıyordu —
tarife tarafında tek aşamaya indirmek **bir gerilemeydi** ve ancak gerçek
veri gösterdi.

**DÜZELTİLDİ:** eşleşme iki aşamalı — **(1) o hesabın kanal SKU'su,
(2) katalog barkodu.** Kanal kodu önce gelir çünkü dosyayla aynı dildedir.
Çatışmada kanal SKU'su kazanır. Bağsız **3 → 2** düştü.
`tarife:dogrula` 71 → **78**, üç mutasyon kırmızı (kanal aşaması kalkar ·
sıra ters · barkod yedeği kalkar).

**KALAN 2 BAĞSIZ — gerçek katalog eksiği:**
· `8720689017237` Philips Lumea IPL — katalogda **hiç yok** (arama 0 sonuç)
· `84778745798` Aktiviteli İlk Adım Yürüteç — benzer ürünler var ama
  barkodu tutan yok; **ayrı bir listing olabilir**

_Bunlar kusur değil, katalog kapsamı: TY'de listelenip bizde açılmamış
iki ürün. Kalemler yine de yazılacak (bağsızlık sessiz kalmaz)._

#### ✅ YAZILDI VE VERİTABANINDAN GERİ OKUNARAK DOĞRULANDI

Betiğin kendi raporuna güvenilmedi; kayıt **geri okundu**:

```
tarife kaydı   1  ·  Trendyol — AXCALI
pencere        2026-08-14T05:00Z → 2026-08-18T04:59Z   (08:00–07:59 İstanbul ✓)
kalem          640   (bağlı 632 · bağsız 8)
yükleme sayısı 1
```

**DİLİM YAPISI DOĞRU YAZILMIŞ** (Manuel Rondo, sunum slayt 18'deki ürün):
`769,99+ → %18` · `701,29–769,98 → %12,8` · `641,09–701,28 → %11,1` ·
`641,08 altı → %9,3`. **Uçlar açık.**

**ÇAPRAZ TEYİT ✓:** `dilimBul(1999)` → 1. dilim %18.
`ChannelSku.commissionRate` → %18. **İki bağımsız yol aynı sonucu verdi**
— biri kanalın beyanı (yükleme ekranı yazdı), öteki bizim türetmemiz
(tarifeden hesaplandı). Ayrışsalardı dilim yapısı ya da beyan hatalı
olurdu; tutmaları ikisini birden doğruluyor.

**AŞAMA 1 AÇILABİLİR.** Zemin hazır: 158 üründe tam tarife, doğrulanmış
dilim yapısı, çalışan yükleme yolu.


### 🔔 K1 — UYARI MERKEZİ FAZ 2 ✅ KAPANDI 20.08.2026

**Halil canlıda doğruladı: A · B · C · D · E tam.** Son açık madde C2
(satış formunda yön satırı) 20.08'de geçti — Fiorino `1.260` denemesi
"kâra geçer" cümlesini çıkardı.

`uyari:dogrula` **84 → 236 kontrol**, yirmi altı mutasyon kırmızı.

#### Beş aday, dört teslim

| # | Aday | Sonuç |
|---|---|---|
| 3 | **İmkânsız değer** (`veriSupheli`, amber) | ✅ eşikler ölçüldü: verim `>%200` (p95 %154), maliyet payı `<%5` (p5 %44,8) |
| 4 | Snapshot kaynaksız | ❌ **DÜŞTÜ** — koşul canlıda **0 satır**. Yerine `supheliOran` (amber, K3 eşiğini OKUR, kendini söndüren) |
| 2 | **Kanal kodsuz stok** (nötr) | ✅ varyant seviyesinde **2 satır**; hesap bazlı küme **499** olurdu ve hiçbir bilgi taşımazdı |
| 1 | **Zararına satış** | ✅ iki zamanda: formda önleyici (K5 motoru), çanda geriye dönük sayaç |
| 5 | **Üç seviyeli ekran** | ✅ kırmızı → amber → nötr; rozet yalnız kırmızı+amber, nötr için rakamsız nokta |

#### Yol boyunca doğan işler

| İş | Sebep |
|---|---|
| **Hayalet kırmızı kesildi** | Çan "67 hakediş kalemi gecikti · ₺137.975" diyordu; **177 sipariş numarasının hiçbiri** bir satışla eşleşmiyordu. Gecikme artık yalnız `saleId` dolu kalemde iddia ediliyor, muafiyet nötr uyarıyla BEYAN ediliyor |
| **K6 — DOĞRULANDI mekanizması** | OneBlade `₺27,16` GERÇEK çıktı (hediye kuponu). Susturma kaydın HÂLİNE bağlı; değer değişirse düşer. Yeni tablo açılmadı (`AuditLog`) |
| **Geç teslim uyarısı** | İki bozuk parti tarihi (Schafer 48 gün, LEGO 30) mal kabul formunun bugüne varsayılan gelmesinden doğdu. Eşik **15 gün** — dağılımın boş bandı (11–20'de sıfır kayıt) |
| **Kâr durumu satırı** | Kâr hâlinde ekran sessizdi; sessizlik "hesap çalışıyor mu?" tereddüdü yaratıyordu |
| **Dayanak rakamları** | Kutu "maliyet ortalaması" diyordu ama RAKAMI vermiyordu — kelime vardı, sayı yoktu |

#### Anayasaya giren dersler (bu paketten)

Sistem kendi defterinde takip etmediği şey hakkında iddia kurmaz ·
Muafiyetin uygulanması ve beyanı ayrı sınanır · Susturma kaydın hâline
bağlanır · İmkânsız görünen değer önce DOĞRULANIR · Eşik dağılımın
gediğine konur · Metin sahip olmadığı anlamı iddia etmez · Sonda
parametresi ekranın parametresi değildir · Kontrol tasarımı kapsam
doğrulanmadan "fark" üretmez · **Kaynak tarayan kontrol deseni dosyada
değil kullanım bloğunda arar** (dört tekrardan sonra)

### 🧮 K5 — FİYATLAMA ARACI ✅ KAPANDI 19.08.2026

**Üç katman da bitti; Halil canlıda (`axc-seven.vercel.app`) gerçek ürünle
iki yönlü doğruladı — Halil testi a–e geçti.**

`simulasyon:dogrula` **45 → 141 kontrol**, yirmi mutasyon kırmızı.

**Katman 2 — `kart/[variantId]/fiyat-dene.tsx`:** kanal başına komisyon ·
NET-1 · NET-2 · başabaş · bir alt dilim önerisi · beyanlar. Hesap istemcide,
hiçbir şey kaydedilmiyor.

**Sonradan eklenenler (hepsi canlı testten doğdu):**

| Ekleme | Sebep |
|---|---|
| **Yön hükmü — varış noktası** | "ARTAR" yeşil satırı NET-2 negatifken "kâra geçer" diye okundu. Beş hâl, `ZARAR_AZALIR` **amber** |
| **Başabaş noktası, KANAL BAŞINA** | NET-2 `−₺1,53` görünüyordu, sıfır noktası söylenmiyordu; kullanıcı deneme yanılmayla arıyordu |
| **Stokta bekleme satırı** | Çıkış kararının ikinci yarısı: başabaş "kaça satmalıyım", bekleme "daha ne kadar bekleyebilirim" |
| **Kâr yeşil / zarar kırmızı** | Eksi işareti tabular-nums sütunda gözden kaçıyordu |
| **`≈ ₺0,00`** | Başabaşın bir kuruş altında ekranda **`−₺0,00`** yazıyordu — öyle bir rakam yok |

**CANLI ÖLÇÜM — TEFAL Manuel Rondo (Halil, 19.08.2026):**

| Fiyat | TY NET-2 | HB NET-2 |
|---|---|---|
| `1.125,00` | `−₺1,53` | `−₺41,04` |
| `1.127,28` ← TY başabaş | **`₺0,01`** | `−₺39,58` |
| `1.127,27` | `≈ ₺0,00` kırmızı | `−₺39,59` |
| `1.189,18` | `₺41,79` | `≈ ₺0,00` kırmızı |
| **Başabaş** | **`₺1.127,28`** | **`₺1.189,19`** |

İki kanalın **ayrı** başabaşı doğru: HB komisyona %20 KDV ekliyor +
12,60 TL hizmet bedeli + %0,8 ödeme gideri. Marjinal oranlar TY **0,675**
· HB **0,639**; farkları tam komisyon-KDV çarpanı kadar (0,952 ↔ 0,956).
⚠ Bu **iç tutarlılık**, bağımsız kanıt değil — ikisi de aynı kâr
motorundan geliyor.

**Yön satırı bir kuruşluk sınırda hüküm değiştirdi:** `1.127,28`'de
"KÂRDAN ZARARA DÜŞER", `1.127,27`'de "zarar artar — inmek kazandırmıyor".
Aynı öneri, aynı hedef fiyat; tek fark mevcut NET-2'nin işareti.

**DERS — RAPORA ÖLÇÜLMEMİŞ RAKAM YAZILMAZ.** Teslim raporunda ekranın
"nasıl görüneceğini" anlatmak için uydurulmuş rakamlar (`₺1.129,40`,
`3 adet · 95 gün`) ölçüm gibi okundu ve mimar "senin verdiğinden farklı
çıkıyor" dedi. Gerçek rakamlar (`₺1.127,28`, `1 adet · 123 gün`) doğruydu.
**Kural #11'in ("yer tutucu değer gibi görünmez") rapor tarafındaki
kardeşi:** rapora ya ölçülmüş rakam ya `₺X` yazılır. Halil testi (c)
zaten bunu şart koşuyordu.

---

### 🧮 K5 — 1. KATMAN AYRINTISI (SAF MOTOR)

`lib/fiyatlama/simulasyon.ts` — veritabanına gitmez, `simulasyon:dogrula`
**45 kontrol**, altı mutasyon kırmızı.

**`simulasyonKur(girdi)`** → dilim · komisyon oranı · NET-1/NET-2 · beyanlar.
**`birAltDilim(dilimler, fiyat)`** → bir alt dilime inmek için gereken fiyat.

**GERÇEK VAKA SINANDI — Manuel Rondo, canlıdaki tarifeyle:**
`769,99 → %18` · `769,98 → %12,8`. **Bir kuruş fiyat kaybı, 5,2 puan
komisyon kazancı** ve NET-2 artıyor. Aşama 1'in varlık sebebi bu tek
satırda.

**DÖRT TASARIM KARARI:**
1. **NET hesabı KOPYALANMADI** — mevcut `karHesapla` çağrılıyor.
   Simülasyon yalnız GİRDİYİ değiştirir, hesabı değil. Kendi formülümüzü
   yazsaydık aynı kural iki yerde yaşardı (bu projenin birinci dersi).
2. **Simülasyon KAYIT DEĞİLDİR** — hiçbir rakam yazılmaz.
   `ChannelSku.commissionRate` kanalın beyanıdır ve bu modül ona dokunmaz.
3. **EKSİK VERİ BEYAN EDİLİR:** `DILIM_YOK` · `PENCERE_BITTI` ·
   `MALIYET_YOK` · `ORAN_YOK`. Dilim yoksa tek oranla hesaplanır **ama
   söylenir** — beyansız tahmin, dilim varmış gibi okunur.
4. **PENCERE BİTMİŞSE ENGELLENMEZ, UYARILIR.** Eski tarife de fikir
   verir; ama beyansız göstermek bayat oranla fiyat değiştirtir.

**`birAltDilim` HEDEFİ ALT DİLİMİN ÜST SINIRIDIR** — bir kuruş daha inmek
gereksiz kayıptır. En ucuz dilimde öneri üretilmez (uydurma hedef yok).

> **ÜÇÜNCÜ KEZ AYNI TUZAK — test verisi ayrımı göstermiyordu.**
> "Dilim BİRİM fiyattan çözülür, ciroya göre değil" kuralını 1.000 × 3 ile
> sınamıştım; 1.000 de 3.000 de aynı dilimde olduğu için mutasyon YEŞİL
> kaldı. Kural doğruydu, test **korumuyordu.** 700 × 3'e çevrildi: birim
> 3. dilimde, ciro 1. dilimde — artık ayrışıyorlar ve mutasyon kırmızı.
> _Kalıp aynı: yalancı yeşilin kaynağı çoğu zaman kod değil, ayrımı
> göstermeyen ÖRNEK VERİ._

#### ✓ 2. KATMAN — "FİYAT DENE" KARTTA (19.08.2026)

`kart/[variantId]/fiyat-dene.tsx` + `lib/fiyatlama/kart-verisi.ts`.
`simulasyon:dogrula` 45 → **63**, üç ekran mutasyonu daha kırmızı.

**ÜÇ ŞART DA KARŞILANDI:**
1. **Beyanlar ekranda yaşıyor** — dört beyan da kullanıcı diliyle
   basılıyor. _Motorun dürüstlüğü ekrana ulaşmazsa yok hükmünde._
2. **Yön dürüst:** fark pozitifse yeşil "NET-2 X ARTAR — inmek
   kazandırıyor", negatifse kırmızı "AZALIR — kazandırmıyor".
   **Test iki yönü de sürüyor:** dar oran farkı (%18→%17,5) kurgusuyla
   inmenin ZARARLI olduğu vaka eklendi; aynı motor iki zıt sonuç üretti
   — yönün veriden okunduğunun kanıtı. _Tek yönlü test bunu gösteremezdi
   ve araç "her zaman in" aracı sanılırdı._
3. **Mobil:** `inputMode="decimal"`, kuruş kabul ediyor (dilim sınırları
   kuruşla oynanıyor: 769,98). Mutasyon `numeric`e çevirince kırmızı.

**EKRAN HİÇBİR ŞEY YAZMIYOR** — test kaynağı tarayıp doğruluyor
(`prisma.` · `Action(` · `fetch(` yok). Simülasyon kayıt değildir.

**KANAL BAŞINA AYRI KUTU:** dilimler, KDV kuralı ve sipariş kesintileri
kanaldan kanala değişiyor; tek "ortalama" zemin hangi kanalda ne olacağı
sorusunu cevapsız bırakırdı.

> **TEST BİR KIRILGANLIK BULDU.** Beyan eşlemesi if/else zinciriydi ve
> son dal "geri kalan her şey"di — `PENCERE_BITTI` adı ekranda hiç
> geçmiyordu. Yeni bir beyan türü eklense ekran onu **sessizce "tarifenin
> geçerliliği bitti"** diye yazardı: yanlış cümle, doğru görünümle.
> Tüketici `switch`e çevrildi; yeni tür eklenince `never` satırı
> **derlemeyi durduruyor.** Ekran, motorun beyanlarıyla eşit adımda
> kalmak zorunda.

#### ✅ CANLI TEST — ÇEKİRDEK ÇALIŞTI, VE BİR EKSİK BULDU (19.08.2026)

**Halil ekranda doğruladı:** `1999 → %18 (1. dilim)` · `769,98 → %12,8
(2. dilim)` · öneri zinciri her katta bir sonrakini gösteriyor
(`2. dilimdeyken 701,28 → %11,1`) · **tek ekranda iki kanal, ikisi de
dürüst** (HB "dilim tarifesi yok — tek oranla", TY dilimli) · sarı
beyanlar görünüyor (pencere bitti + tek-oran).

**LEGO kartında YÖN SATIRI ÇIKTI** — kırmızı, `NET-2 ₺350,85 AZALIR`.
İki yönün biri canlıda görüldü.

> **⚠ O EKRAN BEKLENMEYEN BİR ŞEY GÖSTERDİ: alt dilimin oranı da %8,5 —
> AYNI.** İnmek komisyon kazandırmıyor, yalnız 465 TL ciro kaybettiriyor.
> Araç doğru davranıyordu ama **sebebi söylemiyordu**; kullanıcı "neden
> azaldı" diye düşünüp dilim yapısına bakmayı akıl etmezdi.
>
> **ÖLÇÜLDÜ: stoklu 30 üründen 8'inde (%27) 1. ve 2. dilimin oranı AYNI.**
> LEGO tesadüf değil, yaygın bir hâl.
>
> **DÜZELTİLDİ:** `birAltDilim` artık `oranKazanci` da döndürüyor. Sıfırsa
> ekran _"Alt dilimin oranı da %X — inmek komisyon kazandırmaz, yalnız
> ciro kaybettirir"_ diyor; eksiyse _"alt dilim DAHA YÜKSEK"_. Bu,
> "kâr azaldı"dan **farklı bir sebep** ve ayrı cümleyi hak ediyor.
> `simulasyon:dogrula` 63 → **72**, iki mutasyon daha kırmızı.

**○ EKSİK KALAN — YEŞİL VAKA.** TEFAL Rondo Halil'in stok ürünü değil
(hiç alımı yok) → maliyetsiz → NET-2 boş → yön satırı görünmedi.
**Beyan davranışı doğru** ("Ürün maliyeti bilinmiyor") ama testin asıl
cümlesi görünmedi.

**ADAY BULUNDU (canlıdan, stoklu + oran farkı en büyük):**
| ürün | dilim 1 → 2 | fark | hedef fiyat |
|---|---|---|---|
| **Fiorino İndüksiyon Çelik 3 Parça** | %21 → %8,4 | **12,6 puan** | 1.254,64 |
| Hatır Neo-S Türk Kahve Makinesi | %14,75 → %5 | 9,8 puan | 2.205,72 |
| Optiss Elektronik Mutfak Tartısı | %14,75 → %5,2 | 9,6 puan | 914,01 |

→ **Fiorino kartında** mevcut fiyatı gir; yeşil `NET-2 ARTAR` satırı
çıkmalı. İki yön de görülünce 3. katman kapanır.


#### 🔴 YÖN SATIRI VARIŞ NOKTASINI SÖYLEMİYORDU (19.08.2026)

**Halil gerçek testte yanıldı** ve bulgu keskin: NET-2 **zaten
negatifken** de yeşil _"ARTAR — inmek kazandırıyor"_ yazıyordu. Yeşil
renk + "kazandırıyor" kelimesi **"kâra geçer" diye okunuyor**; oysa ürün
hâlâ zararda, sadece **daha az zararda.**

> **Yön DOĞRUYDU, VARIŞ NOKTASI beyansızdı** — "kaydedilen ≠ görünen"
> dersinin yön satırındaki hâli. Fark rakamı hesapta vardı; ne anlama
> geldiği ekranda yoktu.

**DÜZELTİLDİ — hüküm iki şeye birden bakıyor:** farkın işareti VE
sonucun işareti. Mimar iki hâl istedi; ölçünce **beş gerçek hâl** çıktı
ve dördü farklı karar gerektiriyor:

| Hâl | Cümle | Renk |
|---|---|---|
| `KARA_GECER` | "ZARARDAN KÂRA GEÇER (NET-2 +X olur)" | yeşil |
| `KAR_ARTAR` | "kâr büyür (NET-2 +X olur)" | yeşil |
| **`ZARAR_AZALIR`** | **"Zarar azalır ama ÜRÜN HÂLÂ ZARARDA (NET-2 −Y olur)"** | **amber** |
| `ZARARA_GECER` | "KÂRDAN ZARARA DÜŞER" | kırmızı |
| `KOTULESIR` | "zarar artar" | kırmızı |

**İKİ İNCELİK:**
· **`KAR_ARTAR` ayrı tutuldu** — zaten kârdayken "kâra geçer" demek
  yanlış olurdu; mimarın iki hâlli önerisi bunu kapsamıyordu.
· **SIFIR KÂR SAYILMAZ.** NET-2 tam sıfıra gelmek "kâra geçmek" değil,
  başabaştır; yeşil demek olmayan bir kazancı müjdelemek olurdu.
  `hedef > 0` şartı katı ve testi var.

Hüküm ve renk **saf katmanda** (`yonHukmu`, `yonRengi`) — ekran yalnız
metne çeviriyor, `switch` tüketici. `simulasyon:dogrula` 72 → **90**,
dört mutasyon kırmızı (asıl hatayı geri getiren M1 dahil).

## 🎯 ANA PLAN — "MELONTİK'E YETİŞ VE GEÇ"

_Mimar + Halil onaylı, 18.08.2026._ Bundan sonraki bütün işler bu
haritanın bir aşamasına aittir. **Aşama atlanmaz; her aşama keşif
raporuyla açılır.**

| # | Aşama | Çıkış ölçüsü |
|---|---|---|
| **0** | **Zemin teyidi** — hakediş .xlsx + komisyon envanteri | NET-2 **bağımsız** doğrulandı |
| 1 | Fiyatlama zekâsı (offline) | Melontik'in offline analizi tam karşılandı |
| 2 | Hakediş derinliği | Melontik'i **ilk geçiş** |
| 3 | API salt okuma | Örtüşme temiz · ⚡ **GEREKÇE ALTINCI KEZ, ARTIK ÖLÇÜLÜ BÜYÜKLÜKLE (20.08.2026): geniş aralık komisyon raporu (`30.06–21.08`) `227 ADET` satış diyor, bizde `8`. Kaydı HİÇ olmayan 94 satırın cirosu `₺751.583` — ve bu ALT SINIR.** Elle giriş satışların ~%96'sını kaçırıyor. OneBlade `14/0` · Burby Wood `10/0` · Soundcore `6/0` · Philips `12/3`. Elle giriş satışların BÜYÜK KISMINI kaçırıyor. · Dördüncü ölçüm: TY indirimli komisyon raporu temmuzda `56 ÜRÜNDE` satış yaptığımızı söylüyor; sistemde o dönemden neredeyse hiç satış yok. Elle girişin kapsam boşluğu artık kendi verimizle değil KANALIN verisiyle ölçülü.** · Önceki ölçüm `245 / 50 / 0` — 245 hakediş sipariş no, 50 satış kodu, **sıfır kesişim**. Biçimler BİREBİR uyumlu (HB 10 hane, TY 11 hane); sorun anahtar değil KAPSAM. Zincir tek yerden kopuyor: **elle giriş → kapsam boşluğu → hakediş kör → K-5 kapalı** |
| 4 | Yarı otomatik | Elle giriş **istisna** |
| 5 | Tam otomatik | Melontik aboneliği **iptal** |

**AŞAMA 0 — ZEMİN TEYİDİ** _(açık)_
- [ ] **Hakediş .xlsx teyidi** — ⏸ Halil'in dosyasına bağlı, araçlar hazır.
      **AŞAMA 0'IN TEK BACAĞI** (Melontik çapraz teyidi 18.08.2026'da
      düşürüldü — gerekçe aşağıda). Tek güvenilir bağımsız kaynak budur:
      kanalın kendi ödeme dökümü.
      → `canli:hakedis-esle` (hesap kırılımı) → taze `.xlsx` → `canli:hakedis-teyit`

      **BİRLİKTE BAKILACAK — ÖDEME HİZMETİ HİPOTEZİ (iddia DEĞİL):**
      Trendyol/HB hakediş dosyalarında bir **tahsilat/ödeme bedeli**
      satırı var mı? `TAHSILAT_BEDELI` hakediş okuyucusunda TANIMLI ama
      kâr motorunun kesinti kodları arasında YOK.
      · Kanal kesiyor + biz düşmüyorsak → NET'lerimiz bugüne kadar
        **olduğundan iyi** görünmüştür. Gerçek risk.
      · Kesmiyorsa → düzeltilecek bir şey yok.
      _Bu soru Melontik farkından TÜREMEZ; o fark geçersiz sayıldı. Kendi
      başına değerli olduğu için burada duruyor._

- [x] **Komisyon envanteri — ARAÇ YAZILDI 18.08.2026.**
      `npm run canli:komisyon-envanter` (salt okuma). Dört bölüm:
      doluluk · yaş (haftalık ritme göre bayat bayrağı) · **snapshot
      tazeliği** · dilim.

      **DİLİM SORUSU KOD OKUNARAK CEVAPLANDI, ölçüme gerek kalmadı:**
      `ChannelSku` TEK oran taşıyor, fiyat aralığı alanı YOK · okuyucu
      satır başına tek oran alıyor · **ham dosya saklanmıyor**, yani
      kaynakta dilim var mıydı diye geriye dönük bakılamıyor · içe aktarma
      yalnız TY ve HB tanıyor, **N11 dahil diğer kanallar elle**.
      → **Aşama 1 sonucu: dilim simülasyonu bugünkü veriyle KURULAMAZ.**
      Dilimin nereden geleceği Aşama 1'in İLK sorusudur.

      _(eski kayıt: komut yoktu — `komisyon:dogrula` saf hesabı sınar,
      `komisyon:prova` yerel ve yazan bir provadır.)_
      _Ölçüldü 18.08.2026: depoda `komisyon:dogrula` (saf hesap) ve
      `komisyon:prova` (YEREL, YAZAN uçtan uca prova) var; ikisi de
      envanter değil. Canlıyı okuyup "komisyon oranlarımızın hâli ne"
      diyen bir araç bulunmuyor._

      Kapsam önerisi (salt okuma): kaç ChannelSku'da oran tanımlı / boş ·
      kanal bazında dağılım · **oranların yaşı** (komisyon haftalık
      değişiyor: TY salı, HB çarşamba) · son N günün satışlarında
      snapshot'lanan oran ile bugünkü oranın farkı.
      _Aşama 1 fiyatlama zekâsının girdisi budur; oran envanteri
      bilinmeden dilim simülasyonu kurulamaz._

**❌ DÜŞÜRÜLDÜ — Melontik çapraz teyit** _(18.08.2026)._
      Sunumdaki kâr rakamları **demo**; Melontik'e maliyetler düzgün
      girilmemiş (sunum slayt 13'teki "maliyeti olmayan ürün" uyarısı bunu
      doğruluyor). Çürük ölçütle karşılaştırma yapılmaz.

      > **DERS — ÖLÇÜT DE KAYNAĞIYLA ANILIR.** Karşılaştırmanın değeri
      > ölçülen tarafa değil **ÖLÇÜTE** bağlıdır. Doğrulanmamış ölçütten
      > çıkan fark teşhis değil gürültüdür ve peşinden **doğru çalışan bir
      > motoru bozma** girişimi başlatır. Ölçütün gerçekliği ölçümden ÖNCE
      > sorulur. _Türetilmiş maliyet ayrıştırması da bu yüzden İPTAL:
      > demo orandan türeyen denklem kapanır ve kapandığı için İKNA EDİCİ
      > görünür — en tehlikeli hâli budur._

      **KALICI KAZANIMLAR (demo'dan bağımsız, geçerli):**
      1. **Ciro doğrulaması 2/2 ✓** — `11505178853` 4.784,00 ve
         `11504122276` 6.200,00 birebir tuttu. Sipariş numaraları ve
         cirolar GERÇEK: **kayıtlarımız pazaryeriyle örtüşüyor.**
      2. **4 eksik sipariş** → elle giriş kapsam boşluğu kanıtı, Aşama 3
         gerekçe hanesinde.
      3. **Betik kusuru düzeltildi (iç işimiz):** kâr dökümü
         `ODENECEK_KDV` diye olmayan bir kesinti arıyor ve "0,00" basıyordu;
         134,28'lik NET-1→NET-2 farkını açıklayamıyordu. Artık kesintiler
         KAYITTAN okunuyor ve ödenecek KDV fark olarak TÜRETİLİP basılıyor.
      4. `TAHSILAT_BEDELI` sorusu → yukarıdaki hakediş kalemine bağlandı.

      Araç duruyor (`canli:melontik-teyit`); gerçek Melontik çıktısı
      gelirse referans değiştirilip koşulabilir, ama **Aşama 0'ın şartı
      değil.**

- [ ] **SNAPSHOT FARKI — 3 KALEM ÖN AYRIM** _(18.08.2026)._
      Philips 5000 10in1, üç sipariş: `11493262226` · `11492798173` ·
      `11492628481`. Snapshot **2,70** → güncel **15,00**.

      ⚠ **ORAN GEÇMİŞİ TUTULMUYOR (ölçüldü).** Komisyon yüklemesi
      `ChannelSku.commissionRate`i ÜSTÜNE yazar; ne ayrı geçmiş tablosu ne
      `AuditLog` kaydı var, yalnız `commissionUpdatedAt` damgası kalır.
      **"2,70 hangi yüklemeyle geldi" sorusu sistemden CEVAPLANAMAZ.**

      Cevaplanabilen ve ayrımı yapmaya yeten soru:
      · güncelleme > satış → snapshot o günkü orandı, **meşru**
      · güncelleme < satış → satışta zaten yeni oran vardı, buna rağmen
        farklı yazılmış → **elle giriş ihtimali**, incelenmeli
      → `npm run canli:komisyon-envanter -- 11493262226 11492798173 11492628481`

      **HÜKÜM BURADA VERİLMEZ.** Nihai hakem hakediş `.xlsx`'indeki GERÇEK
      kesintidir. .xlsx teyit aracına not: **bu üç sipariş ÖZEL satır**
      olarak işaretlenecek (gerçek komisyon · snapshot · güncel).

- [x] **ENVANTER ARACI İÇ ÇELİŞKİSİ — ÇÖZÜLDÜ 18.08.2026.**
      Bölüm 2 "son güncelleme günü 18.08" derken Bölüm 1 "en yeni 14.08"
      diyordu. **Çelişki değildi — YANILTICI ETİKETTİ, ki daha kötüsüdür.**

      · Bölüm 1 VERİDEN okuyor (`commissionUpdatedAt`).
      · Bölüm 2'nin rakamı **veriden hiç gelmiyordu**: takvimden hesaplanan
        BEKLENEN YAYIM GÜNÜ. Bugün salı olduğu için 18.08 yazıyordu.

      "Son güncelleme günü" ifadesi "oran şu gün güncellendi" diye okunur.
      Artık ikisi **yan yana ve adlarıyla**: `beklenen yayım X · veride en
      yeni Y`. TY ritmi de düzeltildi: **haftada iki gün (salı + cuma)**,
      dosyadan ölçüldü. Tek gün yazılıydı, cuma yayımını kaçırıyordu.

      **YÜKLEME ŞÜPHESİNİN MUHTEMEL CEVABI — kod okundu:**
      `komisyon/plan.ts` oranı **zaten aynı** olan satırı yazma planına
      HİÇ ALMAZ (`ayniKalan` sayacı). Dosya yüklenip her oran aynı çıkarsa
      `commissionUpdatedAt` **ilerlemez.** Yani "en yeni 14.08" dürüst
      olabilir: yükleme koşmuş, eşleşmiş, hiçbir oranı değiştirmemiştir.

      > **`commissionUpdatedAt` "DEĞİŞTİ" demektir, "DOĞRULANDI" değil.**
      > Bu ayrım bugün ölçülemiyor ve **yeni tarife tablosunun gerekçesi**:
      > yükleme, hiçbir oran değişmese bile bir PENCERE bırakır.

      Araca güne göre güncelleme dağılımı eklendi — "bugün bir şey değişti
      mi" artık tek bakışta görünüyor.

#### 📄 ÜÇ DOSYA MUAYENE EDİLDİ 18.08.2026 — dilim YALNIZ TY tarifesinde

`Downloads/Komisyon Oranlari/` klasöründeki üç dosya yüklemeden ÖNCE
incelendi. **Üçü de tek oranlı ürün listesi; DİLİM TAŞIMIYOR.**

| Dosya | Satır | Sayfa | Mevcut içe aktarma | Oran aralığı | Dilim |
|---|---|---|---|---|---|
| Trendyol ürün listesi | 1583 | `Ürünler` | ✓ TANIDI | %3,6 – %23 (40 farklı) | yok |
| Hepsiburada | 2153 | `Listelerim` | ✓ TANIDI | %4 – %22 (15 farklı) | yok |
| **N11** | 48 | `Ürün Bilgileri Güncelle` | ✗ **TANIMADI** | — | yok |

**KRİTİK AYRIM:** bu TY dosyası (1,27 MB, 1583 satır) **dilim tarifesi
DEĞİL** — ürün listesi ihracı. Dilim, ayrı bir ihraçta geliyor:
_"Komisyon Tarifeleri"_ sayfası (64 KB, 161 satır). İkisi karıştırılmamalı;
**tarife yükleme betiği ürün listesiyle beslenirse "kolon eksik" der.**

**N11 CEVABI — soru DEĞİŞTİ.** Ritim hâlâ bilinmiyor ama daha somut bir
şey ölçüldü: **dosya VAR ve `Komisyon Oranı` kolonu taşıyor, ama okuyucumuz
onu TANIMIYOR** (yalnız TY ve HB tanınıyor). Yani N11 oranları bugün
sisteme hiç girmiyor — 48 ürün. _Kalem aşağıda güncellendi._

**AŞAMA 1/4 İÇİN YAN BULGULAR:**
· TY ürün listesinde `BuyBox Fiyatı` · `Trendyol'da Satılacak Fiyat` ·
  `Desi` · `KDV Oranı` var.
· HB listesinde `Buybox Sırası` · `Vade Süresi` · `İndirimli Fiyat` var.
· İkisi de **Aşama 4'ün Buybox işinin** hazır girdisi — API'siz.

- [x] **N11 KOMİSYON İÇE AKTARMA — YAZILDI 18.08.2026.**
      Üçüncü platform tanıyıcısı + kolon eşlemesi. Gerçek dosyayla
      denendi: **48 satır, 48 tekil kanal kodu, 8 farklı oran**, 47
      satırda barkod. `komisyon:dogrula` 69 → **90**.

      **KANAL KODU `Stok Kodu` — TAHMİNLE DEĞİL ÖLÇÜMLE SEÇİLDİ.**
      Dosyada dört tekil aday vardı (`Stok Kodu` · `Ürün Kodu` ·
      `Group ID` · `Catalog ID`). Sistemdeki üç mevcut N11 kaydı
      `EN10000556236` biçiminde, yani `Stok Kodu`. Başkası seçilseydi
      **mevcut kayıtların hiçbiri eşleşmez, üçü de yeniden yaratılır ve
      N11 tarafında ikizler doğardı.** `Ürün Kodu` ikinci aday olarak
      duruyor. Dosyadaki `EN10051441050` zaten sistemde kayıtlı — eşleşme
      ilk yüklemede kurulacak.

      **Barkod zorunlu DEĞİL** (48'in 47'sinde dolu, ölçüldü): zorunlu
      olsaydı barkodsuz tek satır dosyayı tümden reddettirirdi.

      **İKİ YALANCI YEŞİL DAHA YAKALANDI:**
      1. _"Barkod zorunlu olsun"_ mutasyonu yeşil kaldı — testim barkod
         **değerini** boşaltıyordu ama **kolon** başlıkta duruyordu;
         zorunluluk kolonun VARLIĞINA bakıyor. Test kolonu tümden
         kaldıracak şekilde düzeltildi.
      2. _"N11 kanal eşlemesini sil"_ mutasyonu yeşil kaldı — `kanalPlatformu`
         **hiçbir testte geçmiyordu.** Eşleme olmadan yükleme "dosya ile
         hesap çelişiyor" kontrolünü yapamaz ve **N11 dosyası Trendyol
         hesabına yüklenebilirdi.** Fonksiyon dışa açıldı ve sınandı.

      _Ritim sorusu HÂLÂ AÇIK: N11 komisyonları hangi sıklıkla değişiyor?
      Cevap gelene kadar envanter N11 için "bayatlık ölçülemedi" diyor —
      sessizce "güncel" saymıyor._

- [x] ~~**N11 KOMİSYON İÇE AKTARMA — okuyucu tanımıyor.**~~
      _Ölçüldü 18.08.2026._ N11 dosyası `Komisyon Oranı` taşıyor (48 ürün,
      sayfa `Ürün Bilgileri Güncelle`) ama `komisyon/okuyucu.ts` yalnız
      TRENDYOL ve HEPSIBURADA tanıyor.

      ⚠ _Düzeltme: "N11 oranları sisteme hiç girmiyor" demiştim, envanter
      bunu yalanladı — **3 N11 kanal SKU'su var ve üçünün de oranı dolu**
      (14–15.08). Yani oranlar ELLE girilebiliyor ve girilmiş. Eksik olan
      DOSYADAN içe aktarma; 48 üründen 3'ü elle kaydedilmiş._

      **HALİL'E SORU (hâlâ açık):** N11 komisyonları hangi sıklıkla
      değişiyor? Ritim bilinmeden envanterdeki bayatlık bayrağı N11 için
      "ölçülemedi" demeye devam eder.

      _Kapsam küçük: üçüncü bir platform tanıyıcısı + kolon eşlemesi.
      Dilim yok, tek oran._

- [ ] ~~**N11 GÜNCELLEME RİTMİ — HALİL'E SORU.**~~
      Envanter aracı TY (salı) ve HB (çarşamba) ritmini biliyor; **N11 için
      ritim tanımsız** ve araç bunu "bayatlık ölçülemedi" diye açıkça
      yazıyor — sessizce "güncel" saymıyor.
      **Sorular:** N11 komisyonları hangi sıklıkla değişiyor? Bir dosya
      indirilebiliyor mu, yoksa elle mi takip ediliyor?
      _Cevap gelince `GUNCELLEME_GUNU` haritasına eklenir._

- [x] **KOMİSYON DOSYASI MUAYENESİ — ARAÇ HAZIR 18.08.2026.**
      `npm run komisyon:muayene -- "yol\dosya.xlsx"` — veritabanına HİÇ
      bağlanmaz. Halil taze Trendyol komisyon Excel'ini indirince
      **YÜKLEMEDEN ÖNCE** koşulacak.

      **NİYE ÖNCE:** yükleme yalnız tek oranı alır; dilim kolonu varsa bile
      sessizce düşer ve ham dosya saklanmadığı için geriye dönük
      bakılamazdı. Soru bir kez kaçırılırsa bir hafta daha beklerdi.

      Araç dilimi **iki biçimde** arıyor — kolon başlığında (fiyat/aralık/
      alt/üst/kademe…) **ve satır tekrarında** (aynı barkod birden çok
      satırda = her dilim bir satır). İkincisi olmasaydı "başlıkta ipucu
      yok" deyip dilimi kaçırabilirdik.

      ⚠ **Normalleştiriciden geçiyor** (`lib/tablo/paket.ts`): Trendyol
      dosyaları ZIP64 + veri tanımlayıcılı geliyor ve `read-excel-file`
      onları açamıyor. Atlansaydı araç ilk gerçek dosyada "okunamadı" der,
      suç dosyaya atılırdı. **Gerçek bir TY dosyasıyla denendi, çalışıyor.**

      **ARŞİV BAŞLADI:** muayene edilen dosya `veri/ozel/arsiv/` altına
      kopyalanıyor (gitignore'da — depo herkese açık, dosya ürün/fiyat/oran
      taşır). "Kaynakta ne vardı" sorusu bir daha cevapsız kalmayacak.

      **✓ KOŞULDU 18.08.2026 — DİLİM VAR.** Taze TY dosyasında dört dilim,
      dilim başına komisyon ve İKİ termin seti (3/4 gün) bulundu. Ayrıntı
      ve sonuçları için aşağıdaki "DİLİM BULUNDU" bölümüne bak.

### 🔑 KOMİSYON DİLİMİ — ÖLÇÜM + ŞEMA TASARIMI (18.08.2026)

Taze TY komisyon dosyası **yüklemeden önce** incelendi (`komisyon:muayene`)
ve tam ölçüldü. "Dilim elle tanımlanacak" varsayımı düştü: **veriden
geliyor.**

#### ÖNCE BİR DÜZELTME — "termin" yorumum yanlıştı

`Tarih aralığı (3 Gün)` / `(4 Gün)` kolonlarını görüp "komisyon kargo
vaadine bağlı" dedim. **Yanlış.** Ölçüm: 3 Gün bloğu **161/161 satırda
BOŞ**, 4 Gün bloğu **161/161 dolu** ve hepsinde aynı pencere
_"14 Ağustos 08.00 – 18 Ağustos 07.59"_ — tam dört gün.

**"(3/4 Gün)" tarife PENCERESİNİN UZUNLUĞU'dur, kargo vaadi değil.** TY
haftada iki kez yayımlıyor: Salı 08:00→Cuma 07:59 (3 gün) ve Cuma
08:00→Salı 07:59 (4 gün). Şablonun iki pencere yuvası var, o hafta hangisi
geçerliyse o dolu.

> **DERS (kendi kuralımı çiğnedim):** başlıkları okuyup **değerleri
> okumadım.** Üstelik ilk muayene çıktımda yalnız DÖRT komisyon değeri
> basılmıştı — sekiz kolon varken. Kanıt gözümün önündeydi, yorumum onu
> ezdi. **Kolon başlığı bir iddiadır; doğrulaması hücrededir.**

#### ÖLÇÜLEN YAPI (161 satır, 35 kolon, tek sayfa)

| Ölçüm | Sonuç |
|---|---|
| Dilim sayısı | **4, istisnasız** — 161/161 satırda dördü de dolu |
| Limit kolonları | 6'sı da 161/161 dolu |
| Dilimler ürüne özel mi | **Evet** — 160 farklı limit demeti, 146 farklı oran demeti |
| `TARİFE GRUBU` | **Tek değer** → dosya/tarife kimliği, ürün grubu DEĞİL |
| `KOMİSYONA ESAS FİYAT` vs `GÜNCEL TSF` | **161/161 eşit** → aynı şey |
| Tekrarlı barkod | 1 tane, **iki satır birebir aynı** → dilim değil, mükerrer satır |
| Eşleşme anahtarı | BARKOD 160 farklı · `SATICI STOK KODU` yalnız 98 farklı (+null) |

**DİLİM YAPISI — açık uçlu dört kademe** (örnek: Manuel Rondo):
`≥769,99 → %18` · `701,29–769,98 → %12,8` · `641,09–701,28 → %11,1` ·
`≤641,08 → %9,3`. Band 1'in üstü, band 4'ün altı **açık**.

**`GÜNCEL KOMİSYON` = fiyatın düştüğü dilimin oranı** — 5/5 örnekte
doğrulandı. Yani bugünkü tek oranımız aslında "şu anki fiyata karşılık
gelen dilim".

#### ⚠ EN ÖNEMLİ BULGU — HEPSİ EN PAHALI DİLİMDE

Örneklenen ürünlerin **hepsinde** güncel fiyat 1. dilimde, yani **en
YÜKSEK komisyon** geçerli (1999₺ ürün için %18, oysa 769,98'e inse %12,8).
Trendyol'un mekanizması bu: **fiyatı düşürene komisyon indirimi.**

Fiyatlama aracının cevaplayacağı soru tam olarak budur: _fiyatı bir dilim
aşağı çekmek, komisyon kazancıyla telafi ediyor mu?_ Melontik'in 18.
slaydı aynı hesabı yapıyor — **aynı dosyadan.**

#### ŞEMA ÖNERİSİ — SALT EKLEME, İKİ YENİ TABLO

```
KomisyonTarifesi          bir yükleme = bir geçerlilik penceresi
  channelAccountId        (dosya mağaza bazlı iniyor)
  pencereBaslangic/Bitis  DateTime — hücreden çözülür
  tarifeGrubu             dosyadaki TARİFE GRUBU
  kaynakDosyaAdi          arşivdeki karşılığı
  @@unique([channelAccountId, pencereBaslangic])

KomisyonTarifeKalemi      ürün × dilim
  tarifeId
  barkod / saticiStokKodu / urunAdi   ham kimlik (eşleşme sonradan)
  variantId?                          eşleştiyse
  dilimSira    1..4
  altLimit?    null = alt uç AÇIK
  ustLimit?    null = üst uç AÇIK
  oran         Decimal(5,2)
  @@unique([tarifeId, barkod, dilimSira])
```

**`ChannelSku.commissionRate` KALIYOR.** Bugünkü kâr motoru onunla
çalışıyor; kaldırmak büyük patlama olurdu. Yeni tablo **üstüne** biner:
`commissionRate` artık "güncel fiyata karşılık gelen dilimin oranı" olarak
_türetilir_, anlamı netleşir ama yeri değişmez.

**Satış snapshot'ına ek (mimar maddesi 5):** `SaleItem`e
`commissionTarifeId?` — oranın hangi pencereden geldiği. Bugün "snapshot
bayat mıydı" sorusu **cevaplanamıyor** (oran geçmişi tutulmuyor); bu alan
onu gelecekte ölçülebilir yapar.

**MİGRATION:** üç tablo/alan da **salt ekleme**, hepsi nullable, geçmiş
veri dokunulmaz — geri doldurma YOK. SQL onaya gelecek; disiplin geçerli
(yerel → onay → canlı → damga → push).

#### YAN SONUÇLAR

- **Halil'e N11 sorusu DÜŞTÜ değil, DEĞİŞTİ:** TY ritmi dosyadan ölçüldü
  (**haftada 2×: salı + cuma**) ve envanter aracına yazılacak. N11 sorusu
  hâlâ açık.
- **Eldeki dosyanın penceresi 18.08 07:59'da BİTTİ.** Arşive
  _"pencere: 14–18 Ağu"_ damgasıyla girdi; yeni pencere dosyası gerekiyor.
- **Mükerrer satır var** (1 barkod, 2 özdeş satır) → içe aktarma
  tekilleştirmeli; "iki dilim" sanmamalı.
- **Eşleşme anahtarı BARKOD olmalı**: `SATICI STOK KODU` 161 satırda
  yalnız 98 farklı değer taşıyor ve boş olanlar var.


#### ⏸ MIGRATION HAZIR, PUSH EDİLMEDİ — `20260818120000_komisyon_tarifesi`

**Bekçi doğru davrandı:** `deploy:bekci` "migration dosyası var, canlıda
koşulmamış" diyerek build'i durdurdu. Disiplin: yerel commit → Halil
`npm run canli:migrate` → damga → **ancak sonra push**. _(8cb0023 vakası:
şema deploy edilip migration koşmayınca canlı 500 vermişti.)_

**SQL — salt ekleme, 7 ifade:** `SaleItem.commissionTarifeId` (nullable) ·
`KomisyonTarifesi` · `KomisyonTarifeKalemi` + 4 yabancı anahtar.
Hiçbir sütun düşmüyor, hiçbir veri taşınmıyor, geri doldurma yok.
`migration:kontrol` 29/29 temiz (harf duyarlılığı).

**ÜÇ KESKİNLEŞTİRME İŞLENDİ:**
1. **`commissionRate`in kaynağı beyan edildi:** dosyadaki `GÜNCEL KOMİSYON`
   kolonu — TY'nin kendi beyanı. Sistem fiyattan dilim çözerek
   TÜRETMEZ. Fiyatlama aracı türetme yapar ama o **simülasyondur, kayıt
   değil.** İki kaynak ayrışırsa tek doğru TY'nin beyanıdır.
2. **Aynı pencere ikinci kez yüklenirse: ÜZERİNE YAZILIR**, reddedilmez.
   _Gerekçe:_ bir pencerenin tarifesi kanalın YAYIMLADIĞI BİR OLGUDUR;
   aynı pencerenin iki yüklemesi aynı içeriğe yakınsamalıdır. Reddetseydik
   ilk yükleme eksik/bozuk geldiğinde düzeltmenin tek yolu elle silmek
   olurdu. **Ledger dokunulmazlığı burada geçerli DEĞİL** — bu referans
   veri, hareket kaydı değil. Sessiz de olmuyor: `yuklemeSayisi` ve
   `yuklendiAt` yazılıyor.
3. **Bağsız kalem SAKLANIR ve SAYILIR.** `variantId` null olabilir; kalem
   yine de duruyor ve yükleme raporunda "X kalem bağsız" diye görünecek.
   _Hakediş 648 dersinin tekrarı olmasın: bağsızlık sessiz kalmaz._

**Eşleşme anahtarı BARKOD** — ölçüldü: 161 satırda 160 farklı barkod,
`SATICI STOK KODU` yalnız 98 farklı değer + boşluklar.


#### ✓ TARİFE OKUYUCUSU YAZILDI 18.08.2026 — `lib/komisyon/tarife-okuyucu.ts`

Saf katman; veritabanına gitmez. **Gerçek dosyayla denendi:** 161 satır →
160 kalem + 1 mükerrer, 0 atlanan, pencere **14 Ağu 08:00 → 18 Ağu 07:59**
(İstanbul, doğru çözüldü), `dilimBul(1999)` kanal beyanıyla aynı.

**ÜÇ TASARIM NOKTASI:**
1. **DOLU BLOK SEÇİLİR.** `1.KOMİSYON`…`4.KOMİSYON` başlıkları dosyada İKİ
   KEZ geçiyor (iki pencere yuvası). "İlk bloğu al" deseydik gerçek
   dosyada **tamamen boş** bloğu okur ve tarifeyi oransız yazardık —
   sessizce. Okuyucu en dolu bloğu seçiyor; ikisi de boşsa **reddediyor**.
2. **MÜKERRER İMZASI DİLİMLERİ DE KAPSAR.** Yalnız barkoda baksaydı, aynı
   barkodun FARKLI tarifeyle gelmesi (gerçek bir çelişki) mükerrer sanılıp
   **sessizce silinirdi**. Birebir aynı satır elenir ve sayılır; farklı
   olan ikisi de saklanır.
3. **PENCEREDE YIL YOK.** Metin "14 Ağustos 08.00-18 Ağustos 07.59" diyor,
   yıl yazmıyor. Yıl yükleme anından alınıyor ve **Aralık→Ocak dönümü**
   ayrıca ele alınıyor — yoksa yılda bir kez pencere "geçmişte bitmiş"
   görünür ve tarife hiç geçerli sayılmazdı.

**SAAT DİLİMİ ÖLÇÜLÜR, SABİT YAZILMAZ.** Dosyadaki 08.00 Türkiye saatidir;
ofset o tarihteki gerçek İstanbul ofsetinden okunur.

> **YALANCI YEŞİL YAKALANDI.** Sabit `+3` mutasyonu önce YEŞİL kaldı:
> Türkiye 2016'dan beri kalıcı UTC+3, bugünkü tarihlerde sabit ile ölçülen
> aynı sonucu veriyor. Yani "yaz saati dönerse korur" iddiam **korumasızdı**.
> 2015 Ocak vakası eklendi (o tarihte UTC+2, 08.00 → 06:00Z) ve mutasyon
> kırmızıya döndü.

`tarife:dogrula` **51 kontrol**, altı mutasyon kırmızı: ilk bloğu al ·
mükerrer imzası yalnız barkod · yıl dönümü yok · sabit ofset · 1. dilimin
üstü kapalı · atlanan satır sessiz.

#### ✓ YAZMA YOLU DA HAZIR 18.08.2026

`lib/komisyon/tarife-plan.ts` (saf) + `lib/komisyon/tarife-yaz.ts` (veri) +
`npm run canli:tarife-yukle -- "dosya.xlsx" [--uygula]`.

- **Barkod anahtar** — iki tarafta da kırpılıyor.
- **Bağsız kalem YAZILIR ve SAYILIR.** Atsaydık tarife eksik olur, üstelik
  eksikliği bilinmezdi — hakediş 648 dersinin tam tekrarı. Rapor "BAĞSIZ
  ürün N (M kalem)" satırını **sıfırken bile** yazar: bağsızlığın olmaması
  ile bakılmamış olması ayırt edilebilsin.
- **Aynı pencere ikinci kez → içerik YENİLENİR** (eski kalemler silinip
  yeniden yazılır) ve `yuklemeSayisi` artar. `upsert` değil silme+yazma,
  çünkü upsert dosyadan DÜŞEN bir kalemi eskisi gibi bırakırdı.
  Önizleme "bu pencere daha önce yüklenmiş, N. yükleme" diye **onaydan
  önce** uyarıyor.
- **Penceresiz tarife REDDEDİLİR** — hangi aralığa ait olduğu bilinmeyen
  oran tablonun varlık sebebini boşa çıkarır.
- **Hesap seçimi otomatik DEĞİL:** birden çok TY satış hesabı varsa betik
  durur ve sorar. Yanlış hesaba yazılan tarife sessizce yanlış ürünlere
  bağlanırdı.
- **`ChannelSku.commissionRate`e DOKUNULMUYOR.** Onu mevcut komisyon
  yükleme yolu yazıyor (üç aşamalı eşleştirme + eksik eşleme yaratma).
  Kopyalasaydık aynı kural sistemde iki yerde yaşardı.
- Ham dosya arşive (`veri/ozel/arsiv/`, gitignore).

`tarife:dogrula` **71 kontrol**. Mutasyonlar kırmızı: bağsız kalem atılır ·
penceresiz kabul edilir · BAĞSIZ satırı koşullu olur · satır tarafı
kırpılmaz.

> **İKİNCİ YALANCI YEŞİL YAKALANDI.** Barkod kırpma mutasyonu önce YEŞİL
> kaldı: testi `tarifeOku` üzerinden kurmuştum ve okuyucu barkodu zaten
> kırpıyor, dolayısıyla plan katmanının kırpması o yolda hiç iş yapmıyordu.
> `tarifePlaniKur` dışa açık saf bir fonksiyon; test doğrudan çağrı yoluna
> taşındı ve mutasyon kırmızıya döndü.

**○ İLK GERÇEK YÜKLEME:** Halil'in **yeni pencere (18–21 Ağu)** dosyasıyla.
Önce bayraksız koş (rapor), rakamlar uyunca `--uygula`.


#### 🔴 SNAPSHOT BULGUSU — ÜÇ SATIŞ ELLE GİRİLMİŞ ORANLA KAYITLI (18.08.2026)

Envanter koştu; snapshot tazeliği bölümü **üç satışta fark** buldu ve ön
ayrım kökü kesinleştirdi.

| Sipariş | Kanal | Satış | snapshot | güncel | ciro | tahmini etki |
|---|---|---|---|---|---|---|
| `11493262226` | HB | 10.08 | **2,70** | 15,00 | 1.958,00 | ~−240,83 |
| `11492798173` | HB | 10.08 | **2,70** | 15,00 | 1.961,00 | ~−241,20 |
| `11492628481` | TY | 10.08 | **2,70** | 15,00 | 1.946,00 | ~−239,36 |

Üçü de **aynı ürün** (Philips 5000 Serisi 10in1), iki farklı kanal, aynı
gün. Toplam tahmini kâr etkisi **~−721,40** — yani bu üç satışın kârını
olduğundan **fazla** göstermişiz.

**KÖK: ORAN ELLE GİRİLMİŞ.** Kanal SKU kayıtları **12–13.08'de açılmış**,
satışlar ise **10.08**. Satış anında ortada kayıt YOKTU; snapshot
kayıttan gelemezdi. `2,70` satış formuna elle yazılmış. Aynı oranın iki
ayrı kanalda birden çıkması da bunu destekliyor — kanal tarifesi olsaydı
ikisinin tutması beklenmezdi.

> **ARAÇ KUSURU DÜZELTİLDİ.** Ön ayrım ilk hâlde "snapshot meşru
> görünüyor" diyordu: yalnız `commissionUpdatedAt`i satış tarihiyle
> karşılaştırıyor, kaydın satış anında VAR OLUP OLMADIĞINA bakmıyordu.
> Gereken veri (`createdAt`) **aynı ekranda basılıydı** ve hüküm onu
> görmezden geliyordu. Kural düzeltildi: **kaynağın var olup olmadığı,
> güncel olup olmadığından ÖNCE gelir.**

**HÜKÜM YİNE DE BURADA VERİLMEZ.** Nihai hakem kanalın FİİLEN kestiği
komisyondur — hakediş `.xlsx`inde yazılı. Üç sipariş o teyitte **özel
satır** olarak karşılaştırılacak (gerçek · snapshot · güncel).

**KALICI SORU (ayrı kalem):** satış formu kanal SKU'su yokken oran
girilmesine izin veriyor ve girilen değer hiç doğrulanmıyor. %2,70 gibi
gerçekçi olmayan bir oran uyarı üretmiyor. _Uyarı Merkezi Faz 2'nin
adayı._


#### ✓ ENVANTER — KANAL KIRILIMI EKLENDİ 18.08.2026

Güncelleme tarihi dağılımı artık **kanal kırılımlı**. Toplam sayı "bugün
15 kayıt değişti" diyordu ama hangi kanalda olduğunu söylemiyordu.

İlk koşuda hemen işe yaradı — **N11 okuyucusu yayına girdikten sonra
yüklenmiş:**

| tarih | toplam | HB | N11 | TY |
|---|---|---|---|---|
| 18.08 | 56 | — | **41** | 15 |
| 15.08 | 8 | 7 | 1 | — |
| 13.08 | 2082 | 1056 | — | 1026 |

**N11 doluluk 3 → 44.** Aktif kanal SKU'su 2113 → 2154; oranı boş kayıt
hâlâ **0**.

**✓ BAYRAK ETİKETİ DÜZELTİLDİ (ikinci kez) 18.08.2026.**
`BAYAT 1029/1044` bir **HÜKÜM** cümlesiydi ve iki ayrı durumu tek kelimeye
sıkıştırıyordu: gerçekten tazelenmemiş kayıt ile "yükleme koştu, oran
DEĞİŞMEDİ" kaydı. İkincisi bayat değildir.

`ayniKalan`ın kendisine ulaşamıyoruz ama **aynı ayrımı veriden kurduk**:
yayım gününden beri damgalanan = o yüklemede DEĞİŞEN; daha eski damgalı =
değişmeyen. Artık **hüküm değil SAYIM** basılıyor:

```
Trendyol   beklenen yayım 2026-08-18 · veride en yeni 2026-08-18
           → yayımdan beri GÜNCELLENEN 15 · DEĞİŞMEYEN 1029  (toplam 1044)
```

Altında ayrımın sınırı yazılı: "DEĞİŞMEYEN" bayat demek değildir, iki
durumu birden kapsar ve **bu veriyle ayrılamaz**.

**○ AÇIK KALAN — `ayniKalan` sayısı BASILAMIYOR.** Mimar "bayrak
etiketine `ayniKalan` sayısı" istedi; **bugünkü veriyle mümkün değil**:
o sayı yükleme ANINDA üretilip **hiçbir yere yazılmıyor**, envanter
sonradan okuyamaz. Uydurma bir sayı basmaktansa araç **belirsizliği
yazıyor**: tablodaki `—` iki şey demek olabilir — (a) o gün o kanala
yükleme yapılmadı, (b) yükleme yapıldı ama hiçbir oran değişmedi.

_Ayrım için yükleme sonuçlarının kaydedilmesi gerekiyor (küçük bir tablo:
kim, ne zaman, hangi dosya, kaç okundu/güncellendi/aynı kaldı). Kalem
aşağıda._

- [x] **KOMİSYON YÜKLEME KAYDI — YAZILDI 18.08.2026.**
      `AuditLog`un **dördüncü yazıcısı**: `KOMISYON_YUKLEME`.
      Şema değişikliği YOK, migration YOK.

      **EN KRİTİK KARAR — SIFIR YAZIMDA DA KAYIT DÜŞER.** Uç nokta,
      yazacak satır kalmadığında transaction AÇMADAN erken dönüyor.
      Kaydı yalnız yazma yoluna koysaydık **tam olarak ayırt etmek
      istediğimiz vakada hiçbir kayıt düşmezdi** — araç kendi varlık
      sebebini karşılamazdı. İki yol da kayıt yazıyor; `yazimYapildi`
      alanı ikisini ayırıyor.

      `detail`: dosya · hesap · platform · okunan · güncellenen ·
      yaratılan · **ayniKalan** · yazimYapildi. Sayılar **ekranın gördüğü
      nesneden** alınıyor — iki gösterim ayrışamaz.

      **Hata YUTULUR:** kayıt yazılamadı diye yükleme başarısız sayılmaz;
      oranlar zaten yazılmıştır ve "olmadı" demek yalan olurdu.

      **ENVANTER GÜNCELLENDİ:** belirsizlik notu artık "ayırt edilemez"
      demiyor, `AuditLog` kayıtlarını basıyor. ⚠ Ama sınırı da yazıyor:
      **iz 18.08'de açıldı; ondan önceki günler için "kayıt yok" hüküm
      sayılmaz.** Bu yazılmasaydı geçmişe bakan biri yanlış sonuç
      çıkarırdı.

      `komisyon:dogrula` 90 → **107**, beş mutasyon kırmızı.

- [x] ~~**KOMİSYON YÜKLEME KAYDI — eski kayıt**~~

      **İHTİYAÇ GERÇEK:** yükleme sonuçları hiçbir yere yazılmıyor;
      `ayniKalan`, `guncellenen`, `yaratilan` ekranda gösterilip
      kayboluyor. Envanter "yükleme koştu ama değişiklik yoktu" ile
      "yükleme hiç koşmadı" ayrımını yapamıyor.

      **AMA ÖNERDİĞİM ÇÖZÜM FAZLAYDI.** `KomisyonYuklemesi` tablosu
      onaylandı; ölçtükten sonra geri alıyorum: **`AuditLog` bu işi
      olduğu gibi yapıyor** ve şemada zaten var.

      | İhtiyaç | `AuditLog` karşılığı |
      |---|---|
      | kim | `userId` |
      | ne zaman | `createdAt` (indeksli) |
      | hangi hesap | `targetType` + `targetId` |
      | dosya adı + sayımlar | `detail` (Text, serbest) |
      | aranabilirlik | `action` indeksli → `KOMISYON_YUKLEME` |

      **Kazanç:** migration YOK · şema onayı YOK · canlı koşum YOK ·
      damga YOK. Üstelik `AuditLog`un üç gerçek yazıcısı zaten var
      (`SATIS_DUZENLEME`, `SATIS_IPTAL`, `SATIS_IPTAL_GERI_ALINDI`);
      dördüncüsü aynı deseni izler.

      **Yeni tablo NE ZAMAN gerekirdi:** yükleme kayıtları üzerinde
      SORGU yapılacaksa (kanal × dönem toplamları, grafik). Bugün ihtiyaç
      "geriye dönük bakabilmek" — o kadarına serbest metin yeter. Tablo,
      ihtiyaç sorguya dönüşünce açılır.

      **`detail` İÇERİĞİ — mimar şartı 18.08.2026:**
      dosya adı · okunan · güncellenen · yaratılan · `ayniKalan` ·
      kanal hesabı. **Yükleme ekranının sonuç mesajıyla BİREBİR aynı
      sayılar** — iki gösterim TEK kaynaktan beslenir; ekran bir şey,
      kayıt başka bir şey derse hangisine güvenileceği bilinmez.

      **YAYINA GİRİNCE:** envanterdeki "(a) yükleme yok / (b) değişiklik
      yok" belirsizlik notu, `AuditLog`a bakma tarifiyle güncellenir
      (küçük iş, aynı turda).

      ⚠ **SIRA — BLOKAJ DEĞİL:** TY dilim yüklemesi sınavından sonra.
      _Aynı boşluk tarife tarafında YOK — `KomisyonTarifesi` zaten pencere
      kaydı bırakıyor; bu, o dersin `ChannelSku` tarafına uygulanması._


#### ✓ SATIŞ FORMU ORAN UYARISI — K3 KAPANDI 18.08.2026

Bugünkü ~721 TL'lik bulgunun **tekrarını önleyen** iş.
`lib/komisyon/oran-uyarisi.ts` (saf) + satış formunda görünür uyarı.

**ÜÇ UYARI, ÖNCELİK SIRASIYLA:**
1. **KAYNAK YOK** — ürün için kayıtlı oran yok, kullanıcı körüne yazıyor.
   **Asıl vaka buydu:** kanal SKU'su satıştan sonra açılmıştı. Girilen
   değer makul görünse BİLE uyarır, çünkü doğruluğu hiçbir şeye dayanmıyor.
2. **ŞÜPHELİ DÜŞÜK** — eşik %3.
3. **ÖNERİDEN SAPTI** — kayıtlıdan >5 puan fark.

**EŞİK UYDURULMADI, ÖLÇÜLDÜ.** 18.08 canlı ölçümü: TY %3,6–23 · HB %4–22.
Görülen en düşük oran **%3,6**; eşik onun ALTINA (%3) konuldu — gerçek bir
oranı yanlışlıkla suçlamamak için pay bırakıldı ama %2,70 yakalanıyor.
Test bu sınırı iki yönden de tutuyor: %3,6 işaretlenmez, %2,99 işaretlenir.

**UYARI, ENGEL DEĞİL.** Oran gerçekten düşük olabilir (kampanya, özel
anlaşma); kaydı durdurmak operasyoncuyu kilitler ve "sistem çalışmıyor"
dedirtirdi.

**YAN BULGU — KURAL #11 İHLALİ.** Komisyon alanının yer tutucusu `"0"`du.
Anayasa bunu açıkça yasaklıyor ("0 değil, örn. 3") ve burada özellikle
tehlikeliydi: gri bir sıfır hem girilmiş değer sanılır hem **%0 komisyon
mümkün görünen bir değerdir.** `örn. 15` oldu, sözlükten geliyor.

`komisyon:dogrula` 107 → **126**, altı mutasyon kırmızı.

**AŞAMA 1 — FİYATLAMA ZEKÂSI (offline)**
- [ ] Fiyatlama aracı (dilim + simülasyon)
- [ ] Zararına satış uyarısı → **uyarı merkezi Faz 2** (amber katman)
- [ ] Ürün aralık filtreleri

**AŞAMA 2 — HAKEDİŞ DERİNLİĞİ**
- [ ] Fazla kargo kontrolü (desi × tarife **vs** fiilen kesilen)
- [ ] Dönem damgası _(bulgu 18.08: `Settlement.periodStart/periodEnd`
      şemada var, hiçbir yerde yazılmıyor)_
- [ ] Teyit rutini

**AŞAMA 3 — API SALT OKUMA**
_Gerekçe hanesi (18.08.2026): Melontik teyidinde 6 siparişin **4'ü
sistemde yoktu**. Sınır tarih DEĞİL: bulunmayan `11504867891`, bulunan
`11504122276`'dan BÜYÜK numaralı — yani aynı dönemde, elle giriş
atlanmış. **Elle giriş kapsam boşluğu ölçüldü ve bu aşamanın en somut
gerekçesi.**_
- [ ] Trendyol/HB sipariş çekme **READ-ONLY**
- [ ] Elle giriş ↔ API karşılaştırma raporu
- [ ] Komisyon/fiyat otomatik

**AŞAMA 4 — YARI OTOMATİK**
- [ ] Önizleme + onay ile satış kaydı · Buybox · canlı kâr v1

**AŞAMA 5 — TAM OTOMATİK** → Melontik aboneliği iptal

> **SIRA NOTU:** EUR bu haritanın hiçbir aşamasında YOK — SaaS'a bağlandı
> (kullanıcı kararı 18.08.2026, Türk piyasasına çalışılacak).

## AÇIK PAKET SIRASI — 13.08.2026 itibarıyla

## ✅ ANA SİSTEM TAMAMLANDI — 14.08.2026

**Tek firma tamamlama hedefi doldu.** Sistem canlıda, günlük kullanımda ve
test ağı tam. Faz 0–3 ile Faz 3,5 (tek kullanıcılı giriş) kapalı; RMA ve
Panel Aşama 2 Halil testleri gerçek cihazda, canlı adreste geçti.

Bundan sonrası **büyüme/ek paket**: eksik bir temel kapatılmıyor, üstüne
yeni yetenek ekleniyor. Bu ayrım kayıtta dursun — "yarım kalan iş" ile
"henüz başlanmamış iş" karıştırılmasın.

Mimar onaylı sıra, **paket ADIYLA**:
**~~RMA KALANI~~ ✓ · ~~PANEL AŞAMA 2~~ ✓ · ~~AŞAMA 3 PAKET 1~~ ✓ →
~~PANEL AŞAMA 3 PAKET 2~~ ✓ → ~~KART ÖDEME TAKİBİ~~ ✓ → ~~RAPOR FİRE/KAZANÇ
ETİKETİ~~ ✓ → ~~UYARI MERKEZİ FAZ 1~~ ✓ →
~~DESTEK MODÜLÜ~~ ✓ → ~~GEÇMİŞ VERİ~~ ✓ → ~~SATIŞ DÜZELTME+İPTAL~~ ✓ →
MELONTİK CASE.**

_Sıra 15.08.2026'da güncellendi: **kart ödeme takibi ÖNE ALINDI** — nakit
takviminin eksik yarısı, kullanıcı önceliği._

_Sıradaki: **Kart ödeme takibi** — ekstre dönemi bazlı ödeme kaydı, faiz
iki giriş yollu, migration SQL'i onaya gelir. Panel Aşama 3'ün son testi
(O1–O4) geçince başlar._

_Ondan sonra: **Uyarı merkezi Faz 1** — dört kırmızı uyarı (nakit açığı,
maliyetsiz stok, kârı hesaplanamayan satış, geciken hakediş), üst çubukta
çan. Her uyarı `lib/uyari/*.ts` altında saf fonksiyon; panel görev kutusu
ile çan aynı hesabı çağırır, kopya yasak._

_Renk sistemi tüm uygulamaya uygulandı (`6a11ba3`) ve ham Tailwind renk
sınıfı `panel:dogrula` ile yasaklandı — 288 kaynak dosyası taranıyor._

### ✅ KART ÖDEME TAKİBİ — KAPANDI 16.08.2026

Halil testi geçti; canlı denetim temiz (gecikmiş ₺0,00, kesilmemişe
ödenmiş ₺0,00, 58 kayıt / 37 asıl / 21 ters). **Kart tarafında kalan
varsayım sıfır:** "geçmiş ekstreler ödenmiş sayılır" KODDAN kalktı, bir
ekstrenin kapanıp kapanmadığı `KartOdeme` kaydından okunuyor.

**Canlıda çıkan ve kapatılan kusurlar — hepsi aynı iki aileden:**

_A · Kayan nokta sunuma sızdı (üç kez)._ Para karşılaştırmaları artık
`src/lib/para.ts` üzerinden kuruş çözünürlüğünde. **Ders: bir tutarın
SUNUMU yuvarlanıp KARARI ham sayıyla verilirse ekran kendiyle çelişir —
yuvarlama o tutarın girdiği BÜTÜN karar noktalarında geçerli olmalı.**
1. Ön-dolu alanda `283.33000000000004`.
2. "Girilen tutar kalan borcu AŞIYOR — kalan yalnızca ₺7.137,87" (ham
   değer `7137.869999999999`; `toFixed(10)` bile gizliyordu).
3. Dört ödemesi de iptal edilmiş ekstre "kısmen ödendi" görünüyordu
   (net `5.68e-14`).

_B · Kural doğruydu, EKRAN söylemiyordu._ (Anayasa notu: "kural teslim
edilebilir mi".)
- Kayıttan sonra form bayat kalıyordu (`useState` ilk değeri donmuş).
- Sayfa izni (`kart.gor`) ödeme iznini (`satis.kar.gor`) kapsamıyordu:
  kullanıcı yapamayacağı bir işe DAVET ediliyordu (K19).
- Ters ALINMIŞ ödeme satırı canlı bir ödeme gibi duruyordu → kullanıcı
  "sistem sıfırlamamış" dedi; sistem sıfırlamıştı, ekran söylemiyordu.
- Ödenmemiş ekstreyi bulmak için on sekmeyi tek tek açmak gerekiyordu.
- Solukluk "geçmiş"e bağlıydı; dikkat isteyen kayıt tam da silikleşendi.
- Kesilmemiş ekstreye ödeme uyarısız geçiyordu → **₺163.782,83 yanlış
  işaretlendi.** Artık kırmızı uyarı + onay kapısı (engel değil).

**Testin dişi:** `panel:dogrula` ve `kart:dogrula`'daki iki kontrol eski
VARSAYIMI kilitliyordu (`if (ekstre.gecmisMi) continue;` satırının
VARLIĞINI arıyordu; "bekleyen 2500'e düşer" derken ₺2.000 hiçbir toplamda
görünmüyordu). Bu turda ayrıca **iki yalancı yeşil** (`indexOf` −1 tuzağı,
biçime bağlı metin kontrolü) ve **bir kusurlu mutasyon** (test verisi eksi
yönde artık bırakıyordu, `Math.max(0, …)` yutuyordu) yakalandı.

Testler: `kart-odeme:dogrula` 121 · `kart:dogrula` 48 · `panel:dogrula` 316.

### ✅ RAPOR FİRE/KAZANÇ ETİKETİ — KAPANDI 16.08.2026

Halil testi canlıda geçti; kullanıcı iki fire girip rakamları birebir
doğruladı (fire ₺929,00 / fazla çıkan ₺279,00 / düzeltme ₺650,00 /
GERÇEK NET ₺2.277,83 = 3.218,33 − 290,50 − 650,00).

**1 · ÇİFT SAYIM.** İade işlenirken stok defterine `ADJUSTMENT` yazılıyor;
o paranın etkisi iadenin NET-2'sinde ZATEN var. Fire toplamına da
eklenince aynı lira iki kez sayılıyordu.
- **Kusur neden görülmedi: her iki taraf da TEK BAŞINA doğruydu.** İade
  motoru doğru hesaplıyor, fire toplamı doğru topluyordu. Hata
  ARALARINDAKİ boşluktaydı ve iki testin de kapsamı dışındaydı. _İki
  doğru bileşen, aralarında sınanmamış bir bağ — aranacak kalıp budur._
- **Süzgeç sorguya DEĞİL saf katmana konuldu** (`iadeKaynakliMi`).
  Sorgudaki `returnItemId: null` testin göremeyeceği bir yerde yaşar ve
  bir gün sessizce kaybolabilirdi.
- **Yön SABİT DEĞİL:** hasarlı mal stoktan düşerse GERÇEK NET düşük,
  iade geri girip maliyeti geri gelirse yüksek çıkar. Canlı ölçüm
  (08.2026): net etki −1.327,99, GERÇEK NET ₺4.255,82 görünüyordu;
  doğrusu ₺2.927,83. _Raporlarken yönü ters yazdım; kayıt düzeltildi
  (`14c46fd`). Hesap doğruyken KAYDIN yanlış olması ayrı bir hatadır._

**2 · KAYIP VE KAZANÇ AYNI ALANDA TOPLANIYORDU.** ₺500 fire ile ₺500 fazla
çıkan mal aynı dönemdeyse net sıfır çıkıyor ve kutu HİÇ ÇİZİLMİYORDU —
iki gerçek olay birden ekrandan siliniyordu. **Doğru bir toplam, olmamış
gibi gösterilen iki olayı telafi etmez.** Kutunun görünürlük ölçütü artık
net değil, HAREKETİN VARLIĞI. Net etki değişmedi (kayıp − kazanç).

`duzeltme:dogrula` 49 → 67. Üç mutasyonla doğrulandı.

### ✅ UYARI MERKEZİ FAZ 1 — KAPANDI 16.08.2026

Üst çubukta çan, dört kırmızı uyarı, hepsi `lib/uyari/*.ts` altında saf
fonksiyon. **Gerçek bir uyarı tetiklenerek sınandı** — çan boşken
"çalışıyor" demek kolaydır, asıl sınav uyarı doğunca doğru mesajı, doğru
sayıyı, doğru linki göstermek ve **sorun çözülünce sönmektir.**

Canlı test zinciri (F1 Williams · `OYU-HT-260812-01`):
maliyetsiz numune girildi → çan **1** · "1 ürünün maliyeti bilinmiyor" →
tıklandı → `/stok?maliyet=yok` **tek varyant** → sayım farkıyla düşüldü →
çan **"Temiz ✓"**. Defterde **4 hareket**, hiçbiri silinmedi, stok 0.

**KOPYA YASAK.** Dördü de mevcut motorlardan okunuyor; çan kendi sorgusunu
yazmıyor. Kârsız satış sayısı doğrudan panel görev kutusunun sayacından
gelir — ayrı yazılsaydı koşullardan biri değişince aynı ekranda iki farklı
sayı görünürdü.

**Sözleşmedeki iki adresin karşılığı YOKTU** (anayasa notu: gösterdiğim
link var olan bir ekrana mı gidiyor):
- `/hakedis?durum=geciken` — o ekranda "durum" süzgeci hiç yok; süzgeçsiz
  `/hakedis`'e bağlandı (ekran aynı sayıyı kendi kutusunda gösteriyor).
- `/stok?maliyet=yok` — süzgeç yoktu, EKLENDİ. Çan ve liste aynı
  fonksiyonu çağırıyor.
_Mimar talimatı da bu süzgeçten geçer: talimat niyeti söyler, karşılığı
olup olmadığını kontrol etmek uygulayanın işidir._

**Yetki süzgeci SAYIMDAN ÖNCE:** rozet 3 gösterip listede 1 uyarı çizmek
"iki uyarı saklanıyor" demek olurdu — saklananın varlığını sızdırırdı.
**Açık sıfır:** uyarı yoksa çan gizlenmez, "temiz ✓" yazar. Yükleniyor ile
sıfır AYRI hâller; yüklenmemişken rozet çizilmez ki sahte bir "0 uyarı"
güvencesi verilmesin.

**Testin dişi:** (1) kendi başlık yorumumdaki `prisma.sale.count` cümlesi
testi kırmızıya çevirdi — kaynak metnine bakan kontrol KODA bakmalı,
anlatıya değil. (2) Süzgeç listesi hesaplanıp sorguya hiç bağlanmamıştı;
`?maliyet=yok` bütün stoğu gösterecekti ve yalnız ESLint'in
kullanılmayan-değişken uyarısı yakaladı.

`uyari:dogrula` 49 kontrol. Yedi mutasyonla doğrulandı.

### ✅ SATIŞ DÜZELTME + İPTAL — KAPANDI 17.08.2026

_Kullanıcı sözleşmesi 17.08.2026, aynı gün kapandı._ Halil'in talebi tekti:
_"Bir daha yanlış yaptığımda script çalışmamalı, daha kolay halletmeliyim."_
Teslim ölçüsü de öyleydi: **bir fiyat hatası 30 saniyede, yardımsız,
ekrandan düzeltilebiliyor.** Ölçü tutturuldu.

**TAMAMLANAN DOKUZ PARÇA:**

| # | Parça | Kanıt |
|---|---|---|
| 1 | Şema + migration | `20260817051944_satis_iptali`, canlıda koştu |
| 2 | Saf mekanik | `lib/satis-iptali.ts`, `lib/satis-duzenleme.ts`, `lib/satis-adet.ts` |
| 3 | 47-sorgu bekçisi | `iptal:bekci` — ad listesi YOK, 3 kaçak mutasyonu kırmızı |
| 4 | Veri katmanı | plan imzası (EK 1) her yazma yolunda |
| 5 | Düzenleme ekranı | fiyat · kargo · **adet** |
| 6 | İptal ekranı | taksonomi · önizleme · `?iptal=1` süzgeci |
| 7 | İptali geri al | üç kilit, üçüncüsü ekranda açıklamalı |
| 8 | İz defteri | `AuditLog` + **alan bazında eski→yeni** |
| 9 | `kar-tazele` onarımı | `npm run canli:kar-tazele` — rapor + `--uygula` |

**HALİL TESTİ ✓** (canlı, gerçek veri, kuruşuna):
- fiyat 2.085 → 2.805, geri alındı, orijinale birebir döndü
- kargo döngüsü: 106,75 gösterdi, dokunmadan kaydedildi, **aynen kaldı**
- gerçek yanlış iptal (11512722550) ekrandan geri alındı, terminalsiz
- adet 1→2→1: **NET-1 840,32 · NET-2 695,08** — başlangıca döndü
- **madde 8 — stok üstü adet (1→99): rakamlı engel çalışıyor.** "Yapamazsın"
  demiyor, kaç adet gerektiğini ve kaç adet olduğunu söylüyor. _Doğrulandı
  18.08.2026 turunda._

**✅ MARJ ANAHTARI — KAPANDI, canlı doğrulandı 18.08.2026.** Satış
listesinde "Marj: Ciro | Sermaye" geçişi, `0.13×` biçimi kârlılık kartıyla
birebir, tercih kullanıcı bazında hatırlanıyor. Marj kendi sütununda,
rozetler eşit genişlikte ve NET ile aynı puntoda.

---

#### YEDİ BULGU — hepsi canlı testte doğdu

| # | Bulgu | Ne olurdu | Nasıl bulundu |
|---|---|---|---|
| 1 | **Tedarikçi görünmüyor** | 8 alımda serbest metin tedarikçi ekranda yok | kullanıcı sordu |
| 2 | **Kargo KDV tek yönlü** | her düzenlemede kargo **%20 küçülür** | mimar yakaladı |
| 3 | **Hayalet FIFO partisi** | ledger 1 parti, FIFO 2 parti | ölçüm (23/23 tarandı) |
| 4 | **Toplam sızması** | `?iptal=1` açıkken toplam 105.184 → 106.618 | kullanıcı gördü |
| 5 | **Panel kargo süzgeci** | kanal seçiliyken kart tüm kanalları sayıyor | kullanıcı gördü |
| 6 | **Panel kıyas süzgeci** | rakam kanalın, rozet tüm kanalların | **tarama buldu** |
| 7 | **Maliyet süzgeci / `Math.abs`** | 1 adetlik satış 2 adetlik maliyetle → NET-2 +695 → **−1.304** | kullanıcı gördü |

_5 ve 6 aynı ekranda, aynı satırın bir altındaydı: biri düzeltilip öteki
bırakılsaydı kart doğru rakamı yanlış rozetle gösterecekti._

_7'nin taraması aynı süzgeci **sekiz yerde** buldu, **dördü hatalıydı**
(kâr motoru · iade · nakit takvimi · iade önizlemesi) ve aynı kökün ikinci
yüzü ortaya çıktı: adedi düşürülmüş satış iptal edilseydi **stok şişerdi**._

---

#### ALTI DERS

1. **TEK KAYNAK.** Aynı kural iki yerde yaşarsa biri düzeltilir, öteki
   unutulur. Kural saf fonksiyona çıkar, iki taraf da onu çağırır.
2. **ÇİFT YÖN ÇEVİRİ.** Bir çeviri varsa **iki yönü aynı dosyada** yaşar.
   İleri yön yeni yazılmıştı, geri yön başka dosyaya gömülüydü; tek yön
   eklemek hatayı çözmedi, yerini değiştirdi. (`lib/kargo-kdv.ts`)
3. **KAYDEDİLEN ≠ GÖRÜNEN.** Bilgi karar anında gözle görülmüyorsa yok
   hükmündedir. Aynı gün ÜÇ kez: tedarikçi · yedek kapsamı · iz farkları.
4. **GERİ ALINAMAZ İŞLEM TASARLANMAZ.** İptal yazıldı, geri alma
   yazılmadı — ve ilk kurbanı GERÇEK bir satış oldu. Yıkıcı bir işlem
   teslim ediliyorsa dönüş yolu **aynı pakette** olur.
5. **TİP LİSTESİ DEĞİL BAĞ.** "Şu tipleri say" diyen süzgeç, yarın
   eklenecek tipi sessizce dışarıda bırakır. Ölçüt bağ olmalı: hareket bu
   kaleme bağlıysa o kalemin akışıdır ve **işaretiyle** girer.
6. **İKİ DEFTER BİRLİKTE ÖLÇÜLÜR.** Stok simetrisi test ediliyordu, kâr
   simetrisi edilmiyordu; stok doğru dönerken kâr ayrıştı. Gidiş-dönüş
   testi **başlangıca dönüş** üzerine kurulur ve defterlerin birbiriyle
   tutarlılığı da yazılır (`maliyet = net adet × birim`).
   _Ek tuzak: simetriyi TEK değerle yazma — 2c − c kayan noktada tam çıkar
   ve yuvarlamayı sınamaz; mutasyon bunu gösterdi._

---

#### AÇIK KÜÇÜKLER — bu paketten arta kalanlar

- [x] **Stok düşümü döküm görüntüsü — YAPILDI 18.08.2026.** Geri dönüşler
      kendi satırında ("Stoğa döndü (adet düşürüldü)", +N) ve altta **net
      düşüm** toplamı (Kural #15). `kalemDusumleri` GENİŞLETİLMEDİ: ürün
      kârlılık kartı onu "alımdan satışa kaç gün" için kullanıyor ve ayna
      girişin kaynak bağı yok — karışsaydı gün hesabı bozulurdu. Ayrı
      kaynak: `kalemGeriDonusleri`.

### ✅ DÜZELTME NEDENİ YÖNÜ — KAPANDI 16.08.2026

Kullanıcı sorusu: _"stoğa eklerken neden girmek sağlıklı mı?"_ **Evet —
hatta eksiden daha önemli:** yoktan mal belirmesi eksilmesinden daha
şüphelidir; hayalet envanter ve sahte kâr sisteme bu kapıdan girer.

Ama soru gerçek bir kusuru yakaladı: liste yönü hiç sormuyordu, "Stoğa
ekle"de **Fire** seçilebiliyordu. Zararsız da değil — rapor o kaydı
FİRE KAZANCI satırına yazar ve ekran kendini yalanlar.

`yon DuzeltmeYonu @default(HER_IKISI)` eklendi (salt-ekleme, tek sütun).
Dört ARTI neden derlendi: kayıp mal bulundu · tedarikçi fazla gönderdi ·
numune/hediye giriş · yanlış varyanttan aktarıldı (açıklama zorunlu).

**ÜÇ TUZAK ÜST ÜSTE ÇIKTI, üçü de aynı aileden:**
1. **Migration YANLIŞ TABLOYA çıktı** (`expensecategory`) — aynı yorum
   satırı iki modelde vardı. SQL okunmasaydı gider kategorilerine anlamsız
   bir sütun eklenecekti.
2. **Tablo adı küçük harfliydi** (`stockadjustmentreason`). Canlı ölçüm:
   gerçek ad `StockAdjustmentReason`, `lower_case_table_names=0` — harfe
   DUYARLI. Küçük harfle gitseydi migration canlıda patlardı.
   **Depoda `migration:kontrol` adında bir harf bekçisi ZATEN VARDI ve
   mutasyon denemesinde doğru yakaladı — ben onu commit'ten önce
   koşmamıştım. Bekçi var ama çalıştırılmadıysa yok gibidir.**
3. **Yönü yönetecek EKRAN unutulmuştu.** Kullanıcının açtığı her neden
   sonsuza dek HER_IKISI kalıyordu — kapatılan kapı ayarlardan yeniden
   açılıyordu. Canlıda örneği vardı ("Nakliye hasarı").
   _Kendi paketimden çıkan "kural teslim edilebilir mi" ihlali._

**Yön TİP GİBİ kilitlenmez:** tip geçmiş raporu oynatır (dünkü fire bugün
sayım farkı olurdu), yön yalnız SEÇİM listesini süzer ve yazılmış
kayıtların anlamına dokunmaz — o yüzden sonradan düzeltilebilmeli.
Süzgeç sunucuda da doğrulanıyor: ekran süzgeci güvenlik değil kolaylıktır.

**Yedek kapsamı tersine kanıtlandı:** `yedek:dogrula` önce `ColumnNotFound`
verdi — yedek Prisma modeli üzerinden okuduğu için yeni sütunu İSTİYORDU.
Bekçinin "eksik" demesi, kapsamın tam olduğunun kanıtı oldu.

`duzeltme:dogrula` 67 → 95. Yedi mutasyonla doğrulandı.

> **VERİ BEKLEYEN GÖZLE DOĞRULAMALAR** — kod işi değil, canlıda o veri
> doğduğunda bakılacak. Kapanmamış iş sayılmaz, unutulmasın diye burada:
> - **Kısmi hasarlı iade (2+ adetli satış).** Önizleme = kayıt eşitliği
>   otomatik testle kapatıldı (`iade:dogrula`, mutasyon denemesiyle
>   kanıtlandı); canlıda 2+ adetli satış olmadığı için gözle bakılamadı.
>   İlk 2+ adetli iade doğduğunda: önizlemedeki NET-1/NET-2 ile kaydedilen
>   değer birebir mi? _Not 14.08.2026._

_Sıra kararı 14.08.2026: RMA'nın gövdesi (bildirim durum makinesi + 6.
senaryo) kritik ve yarım bırakılmaz; Panel Aşama 2 hemen ardından açılır._
_Aşama 3 kararı 14.08.2026: RMA **ve** Panel Aşama 2 Halil testleri
geçtikten SONRA başlanır — ikisi de kullanıcıda beklerken üçüncü paket
açılmaz._
Gerekçe: geçmiş veri referans olduğu için en son; RMA kalanı günlük akışta
karşımıza çıkıyor. (Komisyon paketi 13.08.2026'da tamamlandı, aşağıda.)

> **SIRA HEP PAKET ADIYLA YAZILIR — rakam kısaltması KULLANILMAZ.**
> _Karar 13.08.2026, bugünkü karışıklığın dersi:_ "1 → 4 → 3 → 2" ifadesi
> paket NUMARASI olarak yazılmıştı, pozisyon olarak okunabiliyordu ve aynı
> mesajın düz yazısıyla çelişiyordu. Numara, listedeki sıra değiştiğinde
> anlamını kaybediyor; ad kaybetmiyor.

Bir paket **Halil testini** geçmeden sıradakine geçilmez
(tanım: CLAUDE.md → Halil testi).

- [x] ~~**KOMİSYON İÇE AKTARMA (HB + TY)**~~ ✓ 13.08.2026
      `/kanal-sku/komisyon-aktar`: dosya → platform tanıma → denetle →
      önizle → onayla → tek transaction. İzin `kanalsku.yaz` (SAHİP'e açık,
      Operasyon'a kapalı). `komisyon:dogrula` (65, veritabanısız) +
      `komisyon:prova` (33, yerel yazma yolu; canlı adreste çalışmayı
      REDDEDER).
      **KULLANICI KARARLARI (13.08.2026):**
      - Eksik eşleme **YARATILIR** (barkod varyanta tutuyorsa). Bu karar
        olmasa TY tarafı 1042 yerine 14 oranla çıkardı.
      - Dolu oranın **ÜZERİNE YAZILIR**, önizlemede eski→yeni listelenir.
        Pazaryeri dosyası en güncel kaynaktır (oranlar haftalık değişir).
      **GERÇEK VERİYLE PROVA (canlı, salt okunur, 13.08.2026):**
      - HB `Listelerim` 2151 satır → **1024 boş oran dolacak** · 26 yeni
        eşleme · 7 aynı · 13 tekrar (aynı ürünün ikinci listelemesi) ·
        1081 satır katalogda yok
      - TY `Ürünler` 1581 satır → **1028 yeni eşleme** · 3 oran değişecek
        (17→20 · 14→14,75 · 16→14) · 11 aynı · 539 katalogda yok
      - Kanal kodu geleneği ÖLÇÜLDÜ ve korundu: TY'de `channelSku`=barkod
        (14/14), HB'de = HB SKU.
      **AÇIK SIFIR (mimar kararı 13.08.2026): "oran yok" uyarısı yazımdan
      sonra kaç kalıyor, ONAYDAN ÖNCE söylenir.** Önizlemede ayrı kutu +
      liste + "oranı eksik olanları listele" bağlantısı; sonuç satırında
      yazımdan SONRA ÖLÇÜLEN (tahmin değil) sayı. Sıfırsa da cümle yazılır.
      Ölçüm: HB'de **7** kalıyor (kanal kodu dosyada hiç geçmiyor —
      listeden kalkmış ürünler), TY'de **0**. İki dosya sonrası sistem
      genelinde oranı boş eşleme: **7** (1031'den düşüyor).
      **İKİ TUZAK — kalıcı olarak kilitlendi:**
      - `readXlsxFile(yol, { sheet: "Ad" })` **1 satır** döndürüyor. Sayfa
        ADIYLA değil BAŞLIK İMZASIYLA seçiliyor (`platformTani`); TY dosyası
        iki sayfalı ve sıra garanti değil.
      - Yüzde ayrıştırıcı para ayrıştırıcısından AYRI olmak zorunda:
        `sayiCoz("16.666")` → 16666 (para için doğru, oran için felaket).
        `yuzdeCoz` noktayı da virgülü de ONDALIK sayar. Doğrulama betiği
        bu hatayı yazarken yakaladı.
      - Aralık dışı oran (ör. fiyat kolonu kayması: 3299) YAZILMAZ, uyarıya
        düşer.

- [x] ~~**SÜZGEÇ AŞAMA 1**~~ ✓ 13.08.2026 · **Halil testi GEÇTİ 14.08.2026**
      (gerçek cihaz + canlı adres, mimar onaylı). Aynı gün ek düzeltme:
      liste tabloları tek ekrana sığdırıldı (bkz. aşağıdaki yerleşim notu).
      Satışlar süzgeçleri (dönem · kanal · kanal hesabı · kâr durumu · iade
      var/yok) · Alımlar süzgeçleri (dönem · durum · hesap · tedarikçi · kart)
      · panelde kanal adı TIKLANABİLİR (`/satislar?kanal=X&pencere=BU_AY`) ·
      kanal altında HESAP KIRILIMI · panelde CİRO SUNUMU dört yüzeyde.
      `suzgec:dogrula` (34) · `panel:dogrula` 75 → 94.

      **ÜÇ KARAR, GEREKÇELİ:**
      - **Dönem varsayılanı "tüm zamanlar".** Satışlar/Alımlar bugüne kadar
        dönemsiz çalışıyordu; varsayılanı "son 30 gün" yapmak eski kayıtları
        hiç uyarı vermeden ekrandan kaldırırdı. Süzgeç eklemek, kayıt
        gizlemek anlamına gelmemeli.
      - **Sıfır iade gösterimi:** kutularda "iade yok", tablo/kart
        satırlarında "— iade". "−0,00" ELENDİ: yuvarlanmış küçük bir tutar
        sanılıyor (anayasa 11. ilkenin aynı tuzağı). Karar tek bileşende:
        `src/components/ciro-sunumu.tsx`.
      - **Ekran ve Excel AYNI koşul kurucusunu kullanıyor**
        (`src/lib/liste-suzgeci.ts`). `/iadeler` bu koşulu iki kez yazıyor
        (Aşama 0 borcu); Satışlar ve Alımlar aynı borcu almadı.

      **ÖLÇÜLDÜ — sayfalama GEREKMİYOR:** canlıda 9 satış · 50 alım · 2 iade.
      Ürünler/Kanal SKU'da sayfalama 1000+ kayıt yüzünden vardı; burada
      sayfalama çubuğu gürültüden başka bir şey olmazdı. (Bu, aşağıdaki
      "Alımı ÜRÜN/SKU ile arama — önce ÖLÇ" maddesinin sayfalama sorusunu da
      cevaplıyor.)

      **CİRO SUNUMU KAYNAĞI:** `ReturnLine.KAYIP_GELIR` mutlak toplamı —
      `/iadeler` ile aynı yer. Değişim bu satırı hiç üretmediği için
      "değişimde ciro DURUR" kuralı kendiliğinden geçerli.

- [x] ~~**RMA KALANI (İADE MODÜLÜ)**~~ ✓ 14.08.2026 — **HALİL TESTİ GEÇTİ,
      MİMAR ONAYLI.** T1–T5 gerçek cihazda, canlıda doğrulandı.
      Bildirim akışı · "iadeyi işle" ile ön-dolu Return · 6. senaryo
      (yanlış ürün) · itiraz döngüsü · dosya ekleri — hepsi kapandı.
      `rma:dogrula` 121 → **240 kontrol**, dokuz bölüm.

      **Test sırasında çıkan ve düzeltilen canlı hatalar** (her biri artık
      test kilidinde):
      - Ön-dolu dönen ürün ekranda çizilmiyordu (alanlar `adet > 0`e
        bağlıydı; bildirimden gelindiğinde adet boştu).
      - Geri gelen mala STOK YETERLİLİĞİ uygulanıyordu ve hata yanlış rolü
        suçluyordu ("değişim ürününde stok yok"). Yeterlilik ≠ maliyet
        bilgisi; ayrım `donenMalDagilimi`de.
      - "Stoğa dönmeyen maliyet" tamamen hasarlı iadede ₺0,00 gösteriyordu;
        kaynak hiç üretilmiyordu. `MALIYET_DONMEYEN` kendi satırı oldu
        (net-nötr ayrıştırma), geçmiş iki iade `maliyet:geri-doldur` ile
        tamamlandı.
      - Dosya yükleme sayfayı çökertiyordu: beyan edilen sınır (5 MB)
        Server Action gövde tavanından (1 MB) büyüktü. Yükleme Route
        Handler'a taşındı, sınır 4 MB, istemci önden eliyor.
      - Blob deposu private'ken kod herkese açık erişim gönderiyordu.
        Özel erişim + yetkili indirme ucu (`/api/ekler/[id]`).
      - Geri alınamaz durum geçişleri onay sormuyordu (İlke #6).

      **AÇIK KALAN GÖZLE DOĞRULAMA (kod işi değil, veri bekliyor):**
      Kısmi hasarlı iade (2+ adetli satışta 1 sağlam 1 hasarlı) önizleme =
      kayıt eşitliği **otomatik testle** kapatıldı (`iade:dogrula`,
      mutasyon denemesiyle kanıtlandı). Canlıda 2+ adetli satış
      OLMADIĞI için gözle doğrulanamadı. **İlk 2+ adetli iade doğduğunda
      bakılacak:** önizlemedeki NET-1/NET-2 ile kaydedilen değer birebir mi.
      _Not 14.08.2026._

- [x] ~~**KART ÖDEME TAKİBİ**~~ ✓ KAPANDI 16.08.2026 — Halil testi geçti, mimar onaylı.
      _Kapanış notu 17.08: geçmiş ekstreler artık gerçek ödeme kayıtlarından
      okunuyor; "geçmiş ekstre ödenmiş sayılır" varsayımı koddan kaldırıldı._
      _Kullanıcı önceliği: **nakit takviminin eksik yarısı.**_ Sistem kart
      borcunu alımlardan türetiyor ama **"ödendi" kaydı YOK** → nakit takvimi
      kart tarafını ve gecikmişi gösteremiyor. Bu paket onu kapatır.
      **SIRA: Panel Aşama 3'ün son testi (O1–O4) geçince BAŞLAR.**

      **KAYIT BİRİMİ: EKSTRE DÖNEMİ** — her ekstre, kesim gününden kesim
      gününe bir dönemdir.

      | # | Alan | Kaynak |
      |---|---|---|
      | 1 | Kart bilgileri (banka, sahip, kesim/son ödeme günü, limit) | ✅ mevcut |
      | 2 | **Ekstre borcu** | alımlardan TÜRETİLİR (`kart-borcu.ts`), ön-dolu |
      | 3 | Son ödeme tarihi | kesim gününden ✅ mevcut |
      | 4 | **Ödenen ana borç** | ön-dolu (sistemin hesabı), **kullanıcı DÜZELTEBİLİR** — banka farklı kesmiş olabilir |
      | 5 | **Kalan** | TÜRETİLİR = ekstre borcu − ödenen. 0 → kapandı · artı → **kısmi ödeme, açık kalan görünür** |
      | 6 | **Faiz (gecikme)** | iki giriş yolu, aşağıda |

      **FAİZ — İKİ GİRİŞ YOLU (kullanıcı hangisini isterse):**
      - **(a)** günlük faiz oranı **%** + gecikme **gün** sayısı → **sistem
        çarpar.** Örnek: 1.000 × %3 × 2 gün = **60 TL**.
      - **(b)** faiz tutarı **doğrudan elle** (60).

      > **SİSTEM FAİZ ORANINI UYDURMAZ.** Oran bankaya, karta ve güne göre
      > değişir; üretilirse panel yanlış olur. **Kullanıcı girer, sistem
      > yalnız çarpar.** _Bu, 14.08.2026'daki "sistem faizi hesaplamaz"
      > kararının rafine hâli: hesaplamayan şey ORANDIR, çarpma değil._

      **FAİZ MİMARİSİ — AYRI AÇIK ALAN, FARK HESABI DEĞİL:**
      - Faiz ana borçtan **TÜRETİLMEZ.** Fark hesabı sinsidir: ana borç bir
        kuruş şaşarsa o fark "faiz" sanılır ve gider yazılır.
      - Girilen faiz → gider modülüne **"finansman gideri / kart gecikme
        faizi"** → **O DÖNEMİN kârını** düşürür. Belirli bir alıma
        bağlanmaz; genel finansman maliyetidir ("Diğer Giderler" mantığı).
      - **ANA BORÇ ÖDEMESİ KÂRI ETKİLEMEZ** — maliyet alımda zaten sayıldı.
        Faiz EK giderdir. İki rakam ayrı satır; toplanmaz, karışmaz.
      - _Kilit örnek:_ 1.000 TL gecikmiş, günlük %3, 2 gün → 60 TL faiz
        gideri; ödeme kaydedilince o dönem kârından düşer.

      **İLKELER:**
      - **Ledger değişmez:** ödeme kaydı SİLİNMEZ; yanlışsa **ters kayıtla**
        düzeltilir (StockMovement ilkesinin aynısı).
      - **Preview-before-write:** kaydetmeden önce *"şu ödeniyor · şu kalıyor
        · şu faiz gider yazılacak"* önizlemesi.
      - **Sessiz sıfır yasak:** faiz girilmezse 0 (gecikme yok) ama kullanıcı
        AÇIKÇA bırakır/girer; kalan tutar açıkça gösterilir.
      - **Yetki:** kart ödeme = sahip/finans (`satis.kar.gor` + kart yetkisi).
        **Operasyon GÖRMEZ.**

      **MİGRATION — SALT-EKLEME, ⚠ SQL ONAYA GELİR (çalıştırılmadan):**
      yeni tablo **`KartOdeme`** (id, cardId, donem, ekstreBorcu,
      odenenAnaBorc, odemeTarihi, faizOrani?, faizGun?, faizTutar, kalan,
      **source**, oluşturulma). Faiz gideri `Gider` tablosuna bağlanır.
      **Harf bekçisi:** tablo adı büyük harf.

      **GEÇMİŞ VERİ İLE TEK TABLO — `source` alanı:**
      `TURETILEN` (canlı, alımlardan) · `GECMIS_EXCEL` (geçmiş beyan) ·
      `ELLE`. **Birlikte tasarlanır:** ayrı tasarlanırsa iki farklı ekstre
      kavramı doğar ve biri diğerini gölgeler.

      **NAKİT TAKVİMİ BAĞLANTISI:** ödeme kaydı gelince takvim kart tarafındaki
      gerçekleşen ödemeyi bilir → **gecikmiş kart ekstreleri gösterilebilir**
      (bugün gecikmiş yalnız hakedişten besleniyor).
      _Bugünkü geçici varsayım kalkar:_ geçmiş ekstreler "ÖDENMİŞ sayılır"
      varsayımı (`kart-borcu.ts` → `bekleyenToplam` ile aynı) yerini
      GERÇEK kayda bırakır.

      **TEST — `kart-odeme:dogrula`:** faiz İKİ yoldan da doğru
      (oran × gün = tutar) · ana borç ön-dolu geliyor VE düzeltilebiliyor ·
      kalan = borç − ödenen · faiz gideri DOĞRU döneme yazılıyor ·
      ledger değişmezliği (ters kayıt) · kısmi ödemede açık kalan görünüyor.
      _Mutasyon: **faiz gideri kâra karışmasın** kilidi — ana borcu kâra
      düşür → test kırmızı._

- [x] ~~**RAPOR: FİRE/DÜZELTME — ÇİFT SAYIM + ETİKET**~~ ✓ KAPANDI 16.08.2026 — mimar onaylı.
      _RMA kaynaklı düzeltmeler çift sayılıyordu; zarar ve kazanç ayrı satıra
      bölündü. Canlı ölçüm: GERÇEK NET ₺4.255,82 → ₺2.927,83 (rapor fazla
      gösteriyormuş — yön ilk teşhiste ters söylenmişti, ölçüm düzeltti)._

      > ⚠ **TEŞHİS 16.08.2026'da BÜYÜDÜ.** Önce yalnız "etiket yanıltıyor"
      > sanılmıştı; canlı araştırma **PARA HATASI** olduğunu gösterdi.
      > Detay aşağıda "ÇİFT SAYIM" başlığında.

      **ÇİFT SAYIM (asıl kusur, ölçüldü):**
      Fire/düzeltme hesabı `ADJUSTMENT` ve `COUNT_CORRECTION` hareketlerini
      sayıyor — ama **RMA'dan DOĞAN hareketleri de** sayıyor. Onların parası
      iade NET-2'sinde ZATEN var; ikinci kez saymak çift sayımdır.

      _Canlı kanıt (Ağustos 2026):_ dört hareketin ikisi elle girilmiş ve
      **birbirini götürüyor** (279 kayıp + 279 düzeltme = 0). Kalan
      −₺1.327,99'un **tamamı** `returnItemId` dolu, `systemKey:
      SEVKIYAT_HATASI` olan otomatik hareketlerden geliyor.

      Bialetti (axcali1752) defteri eksiksiz — `ADJUSTMENT +1` ile
      `EXCHANGE_OUT −1` aynı saniyede, net stok etkisi SIFIR. İadenin
      kalemleri de sıfırlanmış: `MALIYET_GERI +1.438,99` ·
      `DEGISIM_MALIYET −1.438,99` · **NET-2 = 0.**
      Rapor buna rağmen ₺1.438,99'u "düzeltme kazancı" sayıyor.

      ```
      GERÇEK NET (ekranda) = 3.218,33 − 290,50 + 1.327,99 = ₺4.255,82
      DOĞRUSU              = 3.218,33 − 290,50           = ₺2.927,83
      ```
      **Gerçek net ₺1.327,99 FAZLA gösteriliyor.**

      **DÜZELTME (1) — ASIL:** `returnItemId` DOLU olan hareketler
      fire/düzeltme hesabına **GİRMEZ**. Bu, nakit takviminde kurduğumuz
      çift sayım kapısının aynısı.
      _Mutasyon: RMA doğumlu hareketi hesaba geri sok → test kırmızı._

      **DÜZELTME (2) — ETİKET** (aşağıdaki özgün kural aynen geçerli, ama
      artık YALNIZ elle girilen düzeltmeler için):

      _Özgün kayıt:_
      _Bulundu 16.08.2026, kart ödeme Halil testi sırasında._
      **SIRA: kart ödeme paketi kapanır kapanmaz İLK İŞ.** Uzun bekletilmez;
      ekran şu an yanlış bir şey söylüyor.
      _Bu, rapor ekranının ÖNCEDEN gelen kusuru — kart ödeme paketinin
      parçası değil._

      **SORUN:** `ADJUSTMENT` hareketlerinin NETİ "Fire / hasar / kayıp"
      başlığı altında gösteriliyor. Ama net KAZANÇ olabiliyor.
      _Canlı ölçüm (Ağustos 2026, 4 hareket):_

      | tarih | delta | birim | sonuç | not |
      |---|---|---|---|---|
      | 13.08 | −1 | ₺279,00 | kayıp 279,00 | "test - kutu ezildi" |
      | 13.08 | +1 | ₺279,00 | kazanç −279,00 | "yanlis sayim" |
      | 14.08 | +1 | ₺1.438,99 | kazanç −1.438,99 | **not YOK** |
      | 14.08 | −1 | ₺111,00 | kayıp 111,00 | |

      **Net −₺1.327,99 = ₺1.327,99 KAZANÇ**, ama ekran "kayıp" diyor.
      Formül `− −₺1.327,99` ile gerçek neti ARTIRIYOR
      (`3.218,33 − 290,50 + 1.327,99 = 4.255,82`).
      **Aritmetik doğru, SUNUM ters.**

      **DÜZELTME:** kayıp ve kazanç **AYRI SATIR**; asla tek "net"te toplanıp
      "zarar/kayıp" denmez. Pozitif `ADJUSTMENT`lar **kazanç**, negatifler
      **kayıp**, ayrı toplanır. Örnek: `kayıp ₺390,00 · kazanç ₺1.717,99`.
      **Renk:** kayıp kırmızı, kazanç yeşil (durum bazlı palet).

      > Bu, **Pareto'daki kâr/zarar ayrımı ilkesinin aynısı**: iki yön iki
      > gerçektir, tek sayıda toplanınca ikisi de kaybolur.

      **KİLİT:** pozitif toplam "kazanç" satırında, negatif "kayıp"ta;
      **hiçbir kazanç "kayıp/zarar" başlığı altında görünmez.**
      _Mutasyon: kazancı kayıp toplamına sok → test kırmızı._

      ✅ **AÇIK VERİ SORUSU KAPANDI 16.08.2026.** ₺1.438,99'luk hareket
      MEŞRU: RMA 6. senaryosunun (sevkiyat hatası) otomatik ürünü,
      `returnItemId` dolu, kullanıcı girmemiş. Defter eksiksiz, eşi
      `EXCHANGE_OUT` olarak duruyor, net stok etkisi sıfır. Sorun harekette
      DEĞİL, raporun onu sayıyor olmasında.
      _Yan not: "notu olmayan büyük ELLE düzeltme" yine de uyarı merkezi
      Faz 2 konusu olabilir._

- [x] ~~**GEÇMİŞ VERİ AKTARIMI**~~ ✓ KAPANDI 17.08.2026 — Halil testi TÜM
      MADDELER geçti, mimar onaylı. _106 satır okundu · 10 kart · 4 atlandı →
      89 yazıldı · 17 çakışma. İkinci yükleme SIFIR yazdı (mükerrer koruması
      çalıştı)._ Aşağıdaki kapsam notu tarihe kaldı:
      — geçmiş kart ekstreleri · geçmiş hakediş
      tahsilatları. Dosya: `C:\Users\yapra\Desktop\excel\hakedis ve kredi kartlari`
      **KAPSAM KÜÇÜLDÜ — kart günleri İŞE GEREK YOK (ölçüldü 13.08.2026):**
      `CreditCard` şemasında `statementDay` ve `dueDay` alanları ZATEN VAR
      (Int?, ayın günü 1-31) ve **canlıda 10 kartın 10'unda da dolu** —
      limitleriyle birlikte. Aralık dışı değer taşıyan kart yok. Yani bu
      paketin "kart kesim/son ödeme günleri" bacağı düştü; kalan iş yalnız
      geçmiş EKSTRELER ve geçmiş TAHSİLATLAR.
      **ANALİZ SONUCU: İKİ YENİ TABLO GEREKİYOR, migration onayı şart.**
      Mimar kararı 13.08.2026: yön ONAYLI (beyan verisi ayrı tablolarda,
      Settlement/kart-borcu motoruna karışmaz), ama **SQL taslağı bu pakete
      sıra gelince onaya gelir** — şimdi kod yazılmıyor.
      Gerekçe: kart borcu alımlardan TÜRETİLİR (geçmiş alımlar sistemde
      yok); `Settlement` pazaryeri rapor dosyasından doğar ve satırları
      siparişlerle eşleşir (eşleşecek sipariş yok). Mevcut modellere
      koymak iki motoru da kirletir. `source=GECMIS_EXCEL` damgası şart.

- [x] ~~**PANEL AŞAMA 2 — İŞ ZEKÂSI**~~ ✓ 14.08.2026 (commit 43c3427) —
      **HALİL TESTİ GEÇTİ (P1–P8, gerçek cihaz, canlı), MİMAR ONAYLI.**
      P3'te (NET-1/NET-2) RMA'nın `0ee7504` düzeltmesi sonrası iade
      rakamlarının da tuttuğu teyit edildi — ayrıştırma net-nötrdü, iade
      bloğu netleri kayıtlı değerlerden okuyor.
      Teslim edilen: dönem süzgeci (bugün/bu hafta/bu ay/özel) · kanal
      süzgeci artık BLOKLARI da süzüyor · NET-1 kutusu + aylık tablo sütunu ·
      en çok satılan · en çok kâr eden · en az kâr bırakan · stokta bekleyen
      (YAŞLANMA, bant satır rozeti, ikinci sıralama bağlı sermayeye göre).
      Kargoya verilen/bekleyen kutusu 13.08.2026'da `Sale.shippedAt` ile
      gelmişti; dönem süzgecine bağlandı.

      **BU PAKETTEN DOĞAN BORÇLAR:**
      - `/stok` ekranında **YAŞ SÜTUNU YOK.** Panel bu yüzden "tamamını gör"
        bağlantısı VERMİYOR (soruyu cevaplamayan ekrana göndermemek için) ve
        yalnız "N kalem daha var" diyor. Yaş sütunu /stok'a eklenince
        bağlantı da açılır.
      - Ürün listeleri **KALEM NET-2'sine** dayanıyor; sipariş başına
        kesintiler (hizmet bedeli, sabit gider) kalemde yok. Ekranda yazılı.
        Sipariş kesintisini kalemlere dağıtmak ayrı bir karar — mimara ait.
      - Yaşlanma listesi panelde **8 satır**; tamamı (14.08.2026'da 19 kalem)
        için ayrı ekran yok.

      _Aşağıdaki ölçüm ve kararlar kayıt için duruyor._
      Kullanıcı: "Paneli daha efektif kullanmak istiyorum... bir nevi
      business intelligence olarak bana destek olsun."
      İstenenler: dönem seçimi (bugün · bu hafta · bu ay · özel aralık) ·
      kanal kırılımı (HB · TY · N11) · toplam sipariş · kargoya teslim edilen
      sipariş · ciro · NET-1 ve NET-2 · en çok satılan ürünler · en çok kâr
      edilen ürünler · en çok stokta bekleyen ürünler · en az kâr bırakan
      ürünler.

      **ÖLÇÜLDÜ 14.08.2026 — 8 kalemin 7'si BUGÜNKÜ VERİYLE üretilebilir,
      1'i ÜRETİLEMEZ:**
      - Dönem + kanal süzgeci: altyapı HAZIR (`lib/liste-suzgeci.ts` →
        `pencereCoz`, `components/suzgec-cubugu.tsx`). Panel bugün sabit
        "bu ay" gösteriyor; süzgeç çubuğu takılacak.
      - Toplam sipariş · ciro: panel zaten hesaplıyor.
      - NET-1: `Sale.net1Amount` var ama panel yalnız NET-2 gösteriyor;
        eklenmesi ekran işi, hesap işi değil.
      - Ürün bazlı kâr sıralaması (en çok / en az kâr): **`SaleItem` üzerinde
        `net1Amount`, `net2Amount`, `profitStatus` VAR** — kalem bazlı kâr
        snapshot'ı zaten yazılıyor. Sıralama doğrudan bu alanlardan çıkar.
      - En çok satılan: `SaleItem.quantity` toplamı.
      - En çok stokta bekleyen: **ÖLÇÜT YAŞLANMA, ADET DEĞİL** (mimar kararı
        14.08.2026). Gerekçe: arbitrajda asıl risk yaşlanan paradır —
        faizsiz kart süresi işlerken satılmayan mal ölü sermayedir.
        "50 adet var" eyleme dönüşmez; "bu 8 kalem 45+ gündür rafta"
        doğrudan işe götürür ("rakam eyleme dönüşür" ilkesi).
        Sıralama: **en eski FIFO partisinin giriş tarihine göre azalan**.
        Adet ve **bağlı sermaye (KDV hariç maliyet)** YAN SÜTUN olarak durur
        ama sıralama ölçütü YAŞ.
        Eşik bandı önerisi: **0-30 / 31-60 / 60+ gün** — kesin eşik Panel
        Aşama 2 tasarımında ÖNİZLEMEYLE netleşecek.
      - ⛔ **KARGOYA TESLİM EDİLEN SİPARİŞ — BUGÜN İZLENMİYOR.** `Sale`
        üzerinde kargo firması, desi ve ücret var (satışta snapshot'lanıyor)
        ama **"kargoya verildi" durumu/tarihi YOK**. Bu rakam ancak yeni bir
        alan (ör. `shippedAt`) + onu dolduran bir akış ile doğar; uydurulamaz.
        Migration ve akış kararı mimara ait.

      **NOT — kâr sıralaması yanıltıcı olabilir:** kalem NET'i sipariş
        genelindeki kesintilerin (kargo, ödeme gideri) payını taşımıyorsa
        tek kalemli ve çok kalemli siparişler aynı ölçekte karşılaştırılmaz.
        Yazımdan önce `lib/kar.ts`'in kalem/sipariş ayrımı okunacak ve
        sıralamanın hangi rakama dayandığı EKRANDA yazılacak.

- [x] ~~**PANEL AŞAMA 3 — PAKET 1: NAKİT VE EYLEM ODAĞI**~~ ✓ 15.08.2026 —
      **HALİL TESTİ GEÇTİ (A→B→C→D, gerçek cihaz + canlı).** Mimar onayı
      alındı; paket KAPANDI ve Paket 2 açıldı.
      **ÇİFT SAYIM CANLI SORGUYLA DOĞRULANDI, KESİŞİM 0.** Kapanma şartı
      buydu. Ölçüm: 110 rapor kalemi · 10 tahmin satırı · kesişim 0 ·
      sipariş no çakışması 0 · ödenmiş satış tahminde 0.
      _Denetimde çıkan ve düzeltilen:_ rapor kalemlerinin hiçbiri satışa
      bağlı değildi (saleId boş), yani kimliğe bakan kapı hiç devreye
      girmiyordu — çakışmama TESADÜFTÜ. Kapı iki anahtarlı yapıldı
      (satış kimliği + sipariş numarası).
      _Ayrıca:_ sessiz süzgeç kaybı (ALIM_DURUM_KODLARI şemayla uyuşmuyordu)
      ve "sayı = liste" uyuşmazlığı düzeltildi.
      `panel:dogrula` 179 → 244, `suzgec:dogrula` 47 → 51.

      _Kapandı — özgün kapsam:_
      _Mimar sözleşmesi 14.08.2026. RMA **ve** Panel Aşama 2 testleri
      geçmeden BAŞLANMAZ. Paket 1 Halil testini geçmeden Paket 2 yazılmaz._

      **1a. NAKİT TAKVİMİ (paketin kalbi).** Önümüzdeki 14 gün, iki sütun.
      **PARA BİRİMİ: TEK — TRY** (mimar kararı 14.08.2026). Çıkacak,
      girecek ve net pozisyon hepsi TRY. EUR için bkz. "Çok para birimi"
      büyüme paketi; bugün EUR kodu/ekranı YOK.
      **GECİKMİŞLER TAKVİME GİRER** (mimar kararı 14.08.2026): vadesi
      geçmiş ama ödenmemiş kalemler en üstte ayrı "GECİKMİŞ" başlığında.
      Takvimden düşerlerse görünmez olurlar; oysa en acil madde onlar.
      **GİRECEK TARAFINDA "RAPOR KAZANIR":** rapordan kalemi olan satış
      tahmin listesine GİRMEZ (çift sayım olurdu); satırda kaynak rozeti
      (rapor / tahmin) durur.
      - **ÖDENECEK (kart):** her kartın son ödeme günü + o güne düşen borç.
        Kaynak alımlar (kart + taksit) → kesim/ödeme günü kurallarıyla
        türetilir. **Mevcut `lib/kart-borcu.ts` kullanılır, İKİNCİ MOTOR
        AÇILMAZ.**
      - **GELECEK (hakediş):** vade motorundan beklenen ödeme tarihi +
        tutar; **BEKLENEN = NET-1 + MALİYET**. Yalnız tutarı bilinen
        satırlar; "planlı tarih, tutar yok" olanlar takvime GİRMEZ, ayrı
        not olarak yazılır.
      - **ALT SATIR:** 14 günde çıkacak toplam · girecek toplam · NET
        pozisyon (açık ise KIRMIZI, ör. −7.250).
      - Pencere seçilebilir: **14 / 30 gün**.
      - Her satır tıklanınca kaynağına gider (kart → o kartın borç detayı,
        hakediş → o settlement).
      - **İLKE: tahmin değil, sistemdeki gerçek vade/borç.** Bilinmeyen
        vade **"?"** ile gösterilir, SIFIR VARSAYILMAZ (sessiz sıfır yasak).
      - Para asla Float; `Europe/Istanbul` sabit.

      **1b. "BUGÜN NE YAPMALIYIM" KUTUSU.** Tek kart, beş tıklanabilir sayı,
      hepsi mevcut veriden:
      - kargoya verilmemiş sipariş (`shippedAt` boş) → süzülmüş satış listesi
      - bekleyen iade bildirimi (mal yolda / karar bekleyen `ReturnNotice`)
        → `/iadeler` süzülü
      - mal kabul bekleyen alım (`ORDERED`/`PARTIAL`) → `/alimlar` süzülü
      - kârı hesaplanamayan satış (`NO_COST`/`RULE_MISSING`) → süzülü liste
      - oranı boş kanal SKU → `/kanal-sku?eksik=1`
      - **Her sayı 0 ise satır "temiz ✓" gösterir, GİZLENMEZ (açık sıfır).**

- [x] ~~**PANEL AŞAMA 3 — PAKET 2: RAKAM YARGIYA DÖNSÜN**~~ ✓ **15.08.2026
      — PAKET TAMAMEN KAPANDI, MİMAR ONAYLI.** Dört maddenin dördü de
      Halil testinden geçti:
      **2c Pareto/dağılım** (`f944ef3`, D1–D13) ·
      **2a karşılaştırma — rapor + panel** (`dfc18b6` + `bd89176`, K1–K12) ·
      **Sermaye verimi, iki oran** (`02a3a5c` + `7a00812`, S1–S9) ·
      **2b zarara giden satışlar** (`8bff858`, Z1–Z6).

      _Pakette çıkan ve düzeltilen üç sessiz hata:_ `paylariDenkle` hiç
      satış olmayan dönemde SAHTE %100 üretiyordu · panel sorgu aralığı
      kıyas penceresini kapsamıyordu (veri yokluğu değil SORGU yokluğu) ·
      doğrulama betiğinin kapanış bloğu kesilip çıkış kodu 0'a düşmüştü
      (yalancı yeşil).

      _Sıradaki: uyarı merkezi Faz 1._

      _Özgün kapsam:_
      _Paket 1 Halil testini geçmeden yazılmaz._

      **ÖNCELİK SIRASI — KULLANICI BELİRLEDİ 15.08.2026.** Paket 2 içinde
      bu sırayla ilerlenir:
      1. **2c Pareto/dağılım** (YENİ) — "nereye yoğunlaşmalıyım"
      2. **2a Dönem karşılaştırması** — "ilerliyor muyum"
      3. **Sermaye verimi (Kâr/Maliyet)** — "param nerede verimli"
      4. **2b Zarar + ölü sermaye (yaşlanma)** — "neyi kesmeliyim"

      ---

      ✅ **2c KAPANDI 15.08.2026** (`f944ef3`) — **HALİL TESTİ GEÇTİ
      (D1–D13, gerçek cihaz + canlı), MİMAR ONAYLI.**
      Tanım (b) uygulandı: iki ayrı liste. `dagilim:dogrula` 43 kontrol.
      _Denetimde çıkan ve düzeltilen:_ `paylariDenkle` yuvarlama artığını
      KOŞULSUZ en büyük paya ekliyordu; ciro sıfırken girdiler `[0,0]`
      olduğu için artık 100 çıkıyor ve hiç satış olmayan bir dönemde ekrana
      **"%100 Trendyol"** yazacaktı — sözleşmenin adıyla yasakladığı
      SAHTE %100. Denkleştirme artık yalnız ham toplam %100'e yakınsa
      çalışıyor; bir YUVARLAMA düzeltmesidir, eksik veri tamamlama aracı
      değil. Hatayı testin kendisi yakaladı.

      ✅ **PANEL AŞAMA 3 TAMAMEN KAPANDI 15.08.2026 — MİMAR ONAYLI.**
      Son test O2 (ölü sermaye rozetinin hedefi) `cfc9db1` ile düzeltilip
      geçti. **Dört kullanıcı sorusu da panelde cevaplanıyor:**
      _nereye yoğunlaşmalıyım_ (Pareto) · _ilerliyor muyum_ (karşılaştırma) ·
      _param nerede verimli_ (sermaye verimi) · _neyi kesmeliyim_ (zarar +
      ölü sermaye). Melontik eşleme etiketleri, renk sistemi, nakit takvimi
      ve görev kutusu dahil.
      _O2'de çıkan ve düzeltilen:_ rozet panelin kendi sekmesine gidiyordu
      (eyleme götürmüyordu) **ve** sayısı `sermayeToplami.kalem`den
      geliyordu — o yalnız maliyeti bilinen kalemleri sayıyor, liste ise
      hepsini gösterecekti. Düzeltilirken YENİ bir "sayı ≠ liste" hatası
      doğması önlendi.

      ✅ **2a PANEL AYAĞI KAPANDI 15.08.2026** (`bd89176`) — kural tek
      kaynakta (`lib/karsilastirma.ts`), panelde ikinci kaydırma hesabı yok
      (testle kilitli). _Denetimde çıkan:_ sorgu aralığı kıyas penceresini
      kapsamıyordu; "geçen yıl aynı dönem" 12 ay geriye düşüyor, grafik
      penceresi ise 11 ay — panel "geçen yıl 0 satış" derdi. **Veri
      yokluğu değil SORGU yokluğu**, sessiz sıfırın en sinsi hâli.
      `panel:dogrula` 299 → 306. **HALİL TESTİ GEÇTİ (K1–K12, gerçek cihaz
      + canlı), MİMAR ONAYLI — 2a HEM RAPOR HEM PANELDE TAMAMLANDI,
      madde tamamen kapalı.**
      _Testte çıkan ve düzeltilen:_ kıyas dönemi bomboşken "karşılaştırılamaz"
      rozeti BEŞ KUTUDA tekrarlanıyor ve kutulardan taşıyordu. Bütün
      kutularda aynı olan rozet bilgi taşımaz; durum artık seçicinin altında
      BİR KEZ yazılıyor (`c024de1`).

      ✅ **SERMAYE VERİMİ KAPANDI 15.08.2026** (`02a3a5c` + `7a00812`) —
      **HALİL TESTİ GEÇTİ (S1–S9, gerçek cihaz + canlı), MİMAR ONAYLI.**

      Panelde "Sermaye verimi" sekmesi, ürün ürün, **İKİ ORAN HİYERARŞİYLE**
      (mimar kararı 15.08.2026):
      - **ANA (büyük, SIRALAMA ÖLÇÜTÜ):** NET-2 / maliyet **KDV HARİÇ** —
        "sermaye verimi", malın kendisinden kazanç. Pay ile payda aynı
        tabanda: NET-2'nin içinde alışta ödenen KDV zaten geri verilmiş.
      - **İKİNCİL (küçük, altta):** NET-2 / maliyet **KDV DAHİL** — "bağlı
        nakit verimi", kasadan çıkan paranın verimi. Kullanıcının işi
        faizsiz kart süresine dayalı: ödenen 1.200 ₺'nin TAMAMI bağlı,
        200 ₺ KDV aylar sonra beyannameyle geri geliyor.
      - Ekranda iki taban da yazılı ve etiketli. Maliyeti bilinmeyen ürün
        ATILMIYOR, sona konuyor.

      `dagilim:dogrula` 43 → 58.
      _Testin dişi:_ bölüm yeniden yazılırken betiğin **kapanış bloğu
      kesilmişti**; özet satırı basılmıyor ve betik kural bozulsa bile
      **çıkış kodu 0** dönüyordu — CI'da hep yeşil sayılacaktı. Lint
      uyarısı yakaladı; blok geri kondu, çıkış kodu kanıtlandı (bozunca 1,
      düzeltince 0). Bkz. hafıza: yalancı yeşil.

      **2c. PARETO / DAĞILIM ANALİZİ — KULLANICININ 1 NUMARASI**
      _Karar 15.08.2026._ Cironun ve kârın (NET-2) yüzde olarak NEREDEN
      geldiğini gösterir.

      - **Kanal dağılımı:** "ciro %X Trendyol · %Y Hepsiburada · %Z N11".
        Dönem süzgecine bağlı.
      - **Ürün yoğunlaşması:** ürünler kâra göre sıralı, KÜMÜLATİF yüzde
        (ilk ürün %25, ilk 5 %70, ilk 10 %85 gibi).
      - **CİRO VE NET-2 İÇİN AYRI DAĞILIM.** Biri hacmi, diğeri gerçek
        kazancı gösterir; **farklı olabilirler ve o fark önemlidir.**
      - **Görsel:** yatay bar ya da kümülatif çizgi — ama **yüzde HER ZAMAN
        yazılı**, sadece grafik değil.
      - **Eyleme dönük not** ("kârının %70'i 5 üründe") ama **abartısız**:
        yorumu kullanıcı yapar, panel dağılımı dürüstçe gösterir.

      **2c KURALLARI (hepsi test edilir):**
      - Yüzde paydası = **dönemin toplamı** (ciro dağılımı → dönem toplam
        cirosu; kâr dağılımı → dönem toplam NET-2). Tüm zaman DEĞİL.
      - **Toplam %100 olmalı.** Yuvarlama farkı "diğer"e ya da en büyüğe
        verilir, KAYBOLMAZ (sessiz yokluk yasak).
      - **NET-2 negatif ürünler dağılımda kalır:** zarar edenler payı
        düşürür. "Kârın %70'i 5 üründe ama 3 ürün zarar ettiriyor" —
        ikisi BİRLİKTE görünür.
      - **Sıfır satış / tek kanal:** dağılım anlamsızsa "tek kanaldan
        geliyor, dağılım yok" denir. **Sahte %100 gösterilmez.**
      - **Renk:** paletten. Burada durum bazlı değil KATEGORİ bazlı —
        her kanal hep aynı ton.
      - _Mutasyon: payda dönem yerine tüm zaman → test kırmızı._

      ---

      **2a. KARŞILAŞTIRMA + MARJ%.**
      _Kapsam genişletildi 15.08.2026 (karar: seçenek a) — panel + rapor
      TEK PAKETTE, kural TEK SAF FONKSİYONDA. İki kopya YASAK: bu oturumda
      `PARTIAL`/`PARTIALLY_RECEIVED` hatası tam bu yüzden çıkmıştı._
      - ✅ **RAPORDA YAPILDI 15.08.2026** (`dfc18b6`) · **PANELDE HENÜZ YOK.**
        Ciro, NET-1, NET-2'nin yanına değişim — **hem SAYI hem ORAN**
        (▲₺2.400 · %18). İkisi birlikte: yalnız yüzde küçük rakamlarda
        abartır (2→6 TL "%200"), yalnız sayı büyüklüğün anlamını kaçırır.

        **KIYAS REFERANSLARI (üçü de seçilebilir, açılır):**
        önceki dönem · 3 ay önce · geçen yıl aynı dönem.

        **EŞİT GÜN KARŞILAŞTIRMASI (TUZAK 1'in çözümü).** Ayın 15'inde
        "bu ay ↔ geçen ay" ciroyu yarım, gideri tam alır → yapay ▼.
        Çözüm: kıyas penceresi AY KAYDIRMASIYLA kurulur, "bu ayın ilk 15
        günü ↔ geçen ayın ilk 15 günü". Kıyaslanan aralık ekranda YAZILI:
        `01–15 Ağu ↔ 01–15 Tem`. Tanım ekranda = savunulabilir.
        _Ayrıca gider satırında "dikkatli oku" işareti: aylık sabit
        giderler belirli güne düşer, eşit gün kıyası bunu tam yakalamaz._

        **İADE SATIRI ROZET ALMAZ (TUZAK 2'nin çözümü).** Geçmiş ayın malı
        bu ay iade edilince etkisi bu ayın hanesine yazılır; rozet bunu
        "performans düşüşü" sanardı. Performans değil, GEÇMİŞE DÖNÜK
        DÜZELTME. Kartta "karşılaştırma yapılmaz" notu var.

        **SESSİZ SIFIR YASAK.** Üç hâl ayrı: kıyas döneminde KAYIT YOK →
        "karşılaştırılamaz"; kayıt var ama değer 0 → sayı gösterilir,
        yüzde gösterilmez; normal → ikisi de.

        **MİMARİ:** kural TEK saf fonksiyonda — `src/lib/karsilastirma.ts`.
        Panel de rapor da onu çağırır. `karsilastirma:dogrula` (46 kontrol).

        **KALAN — PANEL EKSİĞİ 2c İLE AYNI TURDA GELİR** (mimar kararı
        15.08.2026, ayrı tur DEĞİL). Gerekçe: `lib/karsilastirma.ts` tek
        kaynak olduğu için panele bağlamak onu ÇAĞIRMAK demek — yeni mantık
        yok. 2c de panel işi. Tek deploy, tek test.
        _O panel turunda sıra: önce 2c (Pareto), sonra 2a'nın panel ayağı;
        ama İKİSİ TEK PAKETTE kapanır._
      - ✅ **İKİ KÂR ORANI — YAPILDI 15.08.2026** (`c54c8af`).
        Tanımlar 14.08.2026'da mühürlendi, **payda 15.08.2026'da
        değiştirilmedi ama PAY kuralı değişti** (aşağıya bakın).
        İkisi AYNI ANDA durur, biri diğerinin yerine GEÇMEZ ve her birinin
        YANINDA tanım etiketi yazar:

        | kutu | pay | payda | etiket |
        |---|---|---|---|
        | Kâr / Maliyet | **o kutunun kendi kârı** | ürün maliyeti, **KDV HARİÇ** | `maliyete göre (KDV hariç)` |
        | Kâr / Satış fiyatı | **o kutunun kendi kârı** | **brüt ciro (KDV DAHİL)** | `satış fiyatına göre (brüt)` |

        > **PAY KURALI DEĞİŞTİ — kullanıcı kararı 15.08.2026:**
        > _"net 1 kendi içinde, net 2 kendi içinde değerlendirilmeli."_
        > NET-1 kutusundaki oranlar NET-1'den, NET-2 kutusundakiler
        > NET-2'den hesaplanır.
        >
        > **Eski karar ve gerekçesi (14.08.2026):** pay ikisinde de NET-2
        > olacaktı, çünkü "NET-1 stopaj öncesidir ve yanıltır; iki kutu
        > farklı kâr tanımı kullansa oranlar karşılaştırılamazdı."
        >
        > **Neden değişti:** aynı sayıyı iki kutuda tekrarlamak bilgi
        > taşımıyordu. Eski gerekçedeki uyarı GEÇERSİZ DEĞİL — NET-1'in
        > maliyet oranı stopaj öncesi olduğu için NET-2'ninkinden HEP
        > yüksek çıkar. İki kutu yan yana okunurken bu fark akılda
        > tutulmalı; oranlar birbirinin yerine geçmez, aynı işin iki
        > aşamasıdır.

        **Marj paydası neden brüt ciro:** rakip araçlar müşteri ödemesi
        üzerinden hesaplıyor; karşılaştırılabilir olsun. _Kullanıcının
        canlı örneği: ciro 6.200,00 · NET-2 272,85 → **%4,40**. Rakip
        araç %4,35 diyor; fark muhtemelen onların paydaya iade/kesinti
        katmasından. Tanım kutuda yazılı olduğu için bizimki savunulabilir._

        **Maliyet paydası neden KDV hariç:** KDV eklemek paydayı yapay
        şişirir, oran olduğundan düşük görünür.

        > ⚠ **UYGULAMA UYARISI — MALİYET KDV DÂHİL SAKLANIYOR.**
        > Kullanıcının gerekçesinde "FIFO maliyeti zaten KDV hariç
        > tutuluyor" deniyordu; **bu doğru değil** (ölçüldü 14.08.2026):
        > `lib/kar.ts` başlığı "TUTARLAR KDV DAHİLDİR — satış, **maliyet**,
        > komisyon…" diyor, `IadeGirdisi.maliyet` "KDV DAHİL toplam maliyet
        > (FIFO partilerinden)" olarak belgeli ve `alisKdv = kdvAyir(maliyet,
        > kdvOrani)` KDV'yi maliyetin İÇİNDEN çıkarıyor.
        > **KARAR DEĞİŞMEDİ, GEREKÇE DEĞİŞTİ:** payda KDV hariç OLACAK ama
        > bu kendiliğinden gelmiyor — FIFO maliyetinden `kdvAyir` ile
        > ürünün KENDİ KDV oranıyla ayrıştırılacak. Bu adım atlanırsa oran
        > sessizce düşük çıkar ve kimse fark etmez.

      - **"SERMAYE VERİMİ" SEKMESİ — Ürün analizine EKLENECEK.**
        _Gerekçesi kullanıcının 14.08.2026 örneği:_ "1.000 ₺'lik üründen
        200 ₺, 10.000 ₺'lik üründen 250 ₺ kazandım; sistemde 250 kazandığım
        'en çok kazandıran' oluyor." Marj bunu kısmen yakalar (%20 vs %2,5)
        ama asıl ölçü **bağlanan sermayenin verimi**: 10.000 ₺'yi rafta
        tutup 250 ₺ kazanmak ile 1.000 ₺'yi tutup 200 ₺ kazanmak aynı şey
        değildir.
        **ARBİTRAJDA ASIL ÖLÇÜT BUDUR:** faizsiz kart süresi işlerken ölü
        sermayeyi gösteren rakam bu. Yaşlanma listesinin "bağlı sermaye"
        sütunuyla aynı kavramın kâr tarafı.
        Paket 1'de yapılan (yeterli, yanıltmayı durdurur): marj rozeti +
        varsayılan sekmenin marj olması.

        **Karışma uyarısı ekranda:** düşük maliyetli üründe
        "NET-2 / maliyet" çok yüksek çıkar (aynı kâr, küçük payda). Etiket
        zorunlu; oran, tanımı görünmeden güvenilmez bir sayıdır.
      - Marj kanal kırılımında da yan yana (TY marjı eksi, HB %19 aynı
        ekranda görünsün).
      - Aylık tabloya marj% sütunu.
      - _Not: ürün bazlı marj 14.08.2026'da Aşama 2'ye eklendi
        (`marjYuzdesi`); buradaki iş KANAL ve DÖNEM seviyesidir._

      ✅ **2b KAPANDI 15.08.2026** (`8bff858`) — **HALİL TESTİ GEÇTİ
      (Z1–Z6, gerçek cihaz + canlı), MİMAR ONAYLI.**
      Dağılım sekmesinde "N satış zararda · −₺X" sayacı; tıklayınca
      `/satislar?kar=zarar`. Sıfırsa gizlenmiyor, "temiz" yazıyor.
      **Ölçüt TEK YERDE** (`zararOzeti`) ve süzgeç AYNI iki şartı arıyor
      (`CALCULATED` **ve** `net2 < 0`) — sayı ile liste birebir tutuyor.
      **Kârı hesaplanamayan satış zarar SAYILMIYOR:** zarar bir hükümdür,
      hesabı bitmemiş satış hakkında hüküm verilmez.
      `dagilim:dogrula` 58 → 66.

      _Özgün kapsam:_
      **2b. ZARARA GİDEN SATIŞLAR.** "NET-2'si eksi olan N satış" sayacı →
      tıkla → o satışlar süzülü liste (en çok götüren üstte). Dönem
      süzgecine bağlı.

      **ORTAK KURALLAR (iki pakete de):**
      - Hepsi **salt-okuma** bekleniyor; **migration ÇIKARSA DUR ve SQL'i
        onaya getir** (muhtemelen çıkmaz).
      - Yetki: para/marj sütunları `satis.kar.gor`'a bağlı (Operasyon marj
        görmez); **nakit takvimi ve zarar listesi de öyle**. "Bugün ne
        yapmalıyım" kutusundaki OPERASYONEL sayılar (kargo, iade, mal kabul)
        Operasyon'a AÇIK, kâr/oran sayıları KAPALI.
      - `panel:dogrula` genişletilir: nakit takvimi çıkacak/girecek
        toplamları kesin rakamla · net pozisyon işareti · "bugün" kutusundaki
        her sayının süzülü listenin kaydıyla BİREBİR tutması · marj% =
        NET-2/ciro doğrulaması · zarar sayacının gerçekten eksi NET-2'leri
        sayması.
      - Her paket AYRI teslim + AYRI Halil testi (tıklama düzeyinde,
        rakamlar taahhütlü).

- [x] ~~**UYARI MERKEZİ (ÇAN) — FAZ 1**~~ ✓ KAPANDI 16.08.2026 — mimar onaylı.
      _17.08: BEŞİNCİ ve ALTINCI kırmızı eklendi — yedek yaşı uyarıları
      (yedek 4 gün alınmadı ve kimse fark etmedi). Eşik 2 gün._
      _Mimar sözleşmesi 15.08.2026._ **SIRA: Panel Aşama 3'ün kalan
      maddelerinden SONRA** — çan onların hesaplarını kullanacak.

      **FAZ 1 KAPSAMI — yalnız KIRMIZI (para kaybı/riski):**
      1. **Nakit açığı** — 14 günde çıkacak > girecek → "Önümüzdeki 14 günde
         ₺X açık". Kaynak `lib/panel/nakit-takvimi.ts` (zaten var).
      2. **Maliyetsiz stok — ÖLÇÜT (a), ONAYLI 15.08.2026:** stokta adedi
         olan ama **birim maliyeti bilinmeyen FIFO partisi** bulunan
         varyantlar → "N ürünün maliyeti yok".
         **ÖNLEYİCİ:** satıştan ÖNCE yakalar, hâlâ düzeltilebilir (alım gir
         → NO_COST hiç doğmaz). Tepkisel okuma (`NO_COST`'a düşmüş
         satışların varyantları) ELENDİ: zaten 3. uyarının kapsamında,
         çift sayım olurdu.
      3. **Kârı hesaplanamayan satış** — NO_COST/RULE_MISSING → "N satışın
         kârı hesaplanamıyor".
      4. **Hakediş gecikti** — beklenen ödeme tarihi geçmiş, `paidAt` boş
         → "N hakediş gecikti, ₺X".

      **ÇAN BİLEŞENİ:** üst çubukta çan + sayı rozeti (kırmızı uyarı varsa
      rozet KIRMIZI). Tıkla → açılır panel, uyarılar listeli. Her uyarı
      başlık + sayı/tutar + **TIKLANABİLİR** (ilgili süzülü ekrana gider).
      Uyarı yoksa çan nötr ve **"temiz ✓" yazar — gizlenmez** (açık sıfır).
      **Her uyarı EYLEME götürür; bilgi için bilgi yok.**

      **VERİ TEMELİ ÖLÇÜLDÜ 15.08.2026 — DÖRDÜ DE MEVCUT ALANLARDAN ÇIKIYOR,
      MİGRATION GEREKMİYOR:**
      1. Nakit açığı → `lib/panel/nakit-takvimi.ts` (`netPozisyon` zaten var)
      2. Maliyetsiz stok → `Parti.birimMaliyet` **nullable**; açık partiler
         `acikPartilerToplu()` ile geliyor. `kalanAdet > 0 && birimMaliyet
         === null` olan varyantlar. Stok/envanter ekranlarıyla AYNI motor —
         panel kendi FIFO'sunu yazmaz.
      3. Kârı hesaplanamayan satış → `Sale.profitStatus` (`NO_COST` /
         `RULE_MISSING` / `CURRENCY_MISMATCH`). `/satislar?kar=eksik`
         süzgeci zaten aynı koşulu kuruyor.
      4. Hakediş gecikti → **`SettlementItem.dueDate` ve `.paidAt`** (ikisi
         de nullable). Ölçüt: `dueDate < bugün && paidAt === null`.
         ⚠ Tarih `Settlement`te DEĞİL **KALEMDE** — üst kayıttaki `paidAt`
         bir içe aktarma partisine ait, vade kalemde tutuluyor. Yanlış
         seviyeden okunursa uyarı sessizce boş çıkar.

      **MİMARİ:**
      - Her uyarı SAF FONKSİYON: `lib/uyari/*.ts` — "bu uyarı var mı, kaç,
        tutar, nereye" tek yerde. Çan bunları toplar. **TEK KAYNAK:** panel
        görev kutusu ve çan aynı hesabı çağırsın, kopya YASAK.
      - `seviye` alanı BAŞTAN olsun (kirmizi/amber/notr) ama Faz 1'de
        hepsi kırmızı. "Mimari genişlemeye hazır, içerik dar" — EUR
        kararıyla aynı ilke.
      - **Yetki etiketi her uyarıda:** finans/kâr uyarıları `satis.kar.gor`
        (Operasyon nakit açığı/kârsız satış GÖRMEZ); operasyonel olanlar
        (maliyetsiz stok) açık olabilir.
      - Salt-okuma; migration çıkmaz beklenir.

      **TEST:** `uyari:dogrula` — her uyarının doğru koşulda tetiklendiği ·
      tetiklenmemesi gerekende SESSİZ kaldığı · sayı/tutarın gerçek veriyle
      tuttuğu · çan rozetinin EN YÜKSEK seviyeyi gösterdiği.
      _Mutasyon: uyarı koşulunu gevşet → test kırmızı._

- [ ] **UYARI MERKEZİ — FAZ 2: AMBER VE NÖTR KATMAN**
      _Faz 1 kapanmadan başlanmaz._ **Faz 1 KAPANDI 16.08.2026** — Faz 2
      artık açılabilir.

      **UYARI ERTELEME — mimar sözleşmesi 16.08.2026.**

      Kullanıcı sezgisi: bilerek kabul edilen bir durum (ör. maliyeti hiç
      olmayacak numune) sonsuza dek kırmızı yanmasın.

      **CEVAP "KAPAT/OKUNDU" DEĞİL.** Faz 1'in dördü de DURUM uyarısıdır,
      olay değil: "1 ürünün maliyeti bilinmiyor" bir şeyin OLDUĞUNU değil,
      şu anda ÖYLE OLDUĞUNU söyler. Okundu diye kapatmak uyarıyı yalancı
      yapar — durum sürer, ekran temiz görünür. Üstelik "kapattım ve
      unuttum" diye yeni bir hata sınıfı doğar ki kalıcı kırmızı rozetten
      çok daha tehlikelidir.

      **CEVAP: ERTELE.**
      - Erteleme **SEBEP + BİTİŞ TARİHİ** ister. Sebepsiz/tarihsiz
        erteleme yok.
      - Panelde **"N uyarı ertelenmiş"** görünür — ayrı ama GÖRÜNÜR,
        sessizce saklanmaz.
      - Süre dolunca uyarı **kendiliğinden geri gelir**. Kalıcı unutma
        imkânsız.
      - Erteleme kaydı **iz bırakır** (kim, ne zaman, neden, ne kadar).
      - Şema: yeni tablo (`UyariErteleme`) — salt-ekleme, SQL onaya gelir.

      **AYRIM:** "kapat" durumu GÖRMEZDEN GELİR (yalan); "ertele" durumu
      KABUL EDER ama görünür ve geçici tutar (bilinçli karar). Panelin
      "sayı = gerçek durum" ilkesi ikisinde de korunur — biri onu bozar,
      diğeri bozmaz.

      _Faz 1 (4 kırmızı, kendiliğinden sönen) bugün için yeterli;
      erteleme amber katmanla birlikte gelir._

      **AMBER:** kart ödemesi yaklaşan · **geciken sipariş** · stok bitiyor ·
      bekleyen iade · zarar eden satış · **marj düştü**.
      **NÖTR:** ölü sermaye (60 gün) · **kanal SKU boş — KOŞULLU:**
      _yalnız STOĞU OLUP kanal kodu olmayan ürün._

      **DEĞERLENDİRME 18.08.2026 — mimar "yeni ürün formunda bilgi ibaresi"
      önerdi; ÖNERİLMİYOR, iş buraya bağlanmalı. İki ölçüm:**

      1. **Yeni ürün/varyant formu kanal kodunu HİÇ SORMUYOR.** İbare,
         kullanıcının o ekranda dolduramayacağı bir alanı işaret ederdi —
         "kural teslim edilebilir mi" ihlali (kart faizi kategori linkinin
         aynısı). Çalışması için `/kanal-sku`ya bağlantı gerekirdi.
      2. **Kayıt anında HER ürün kodsuzdur** — kod listeleme anında doğar.
         Yani ibare %100 ihtimalle çıkar. **Her zaman çıkan uyarı bilgi
         taşımaz;** panelde "beş kutuda aynı cümle" kararının aynısı.

      **Bilgi taşıyan an, kayıt anı değil:** ürünün STOĞU var ama kanal
      kodu yok — "alındı, listelenmedi". Bugünkü 5 yarı kör tam olarak bu
      kümedir ve gerçekten eyleme çağırır. Koşul bu yüzden eklendi; koşulsuz
      hâli 1072 üründen her yeni kaydı sarı yakardı.

      **EŞİKLER NETLEŞTİ (mimar kararı 15.08.2026):**
      - **Geciken sipariş: 7 GÜN SABİT.** Alım `ORDERED` + `purchasedAt`
        üstünden 7+ gün geçmiş + mal kabul edilmemiş → amber.
        _Tedarikçi bazlı ayar İLERİDE; şimdi sabit — erken özellik yasak._
      - **Marj düştü: NET-2 / brüt ciro < %10** → amber. Dönem/ürün bazında.
        **Eşik EKRANDA GÖRÜNÜR** ("%10 altı" yazılı) — uydurma bir sabit
        gibi durmasın.

- [x] ~~**DESTEK / TALEP MODÜLÜ — FAZ 1**~~ ✓ **KAPANDI 17.08.2026 — Halil testi geçti, mimar onaylı.**
      _Mimar sözleşmesi 15.08.2026._ **SIRA: Panel Aşama 3 bitmeden
      BAŞLANMAZ** (zarar/ölü sermaye → uyarı merkezi Faz 1 → destek).
      _Gerekçe: AXCALI eksik/taleplerini Telegram'dan dağınık iletiyor,
      sürdürülebilir değil. Telegram kaosu gerçek ama bir paket bitmeden
      diğeri başlamaz._

      **KAPSAM:**
      - Her ekranda erişilebilir **"Bildir"** düğmesi (üst çubukta, kalıcı).
        Tür: **HATA / İSTEK**.
      - Form: başlık + açıklama + ekran görüntüsü (opsiyonel, çoklu) +
        **OTOMATİK yakalanan**: sayfa (URL/route), tarayıcı (user-agent),
        kullanıcı, tarih/saat (Europe/Istanbul).
      - Ekran görüntüsü **MEVCUT `Attachment` altyapısı** (RMA'dan): Blob,
        jpeg/png/webp, boyut sınırı, N ek/kayıt. **Yeni tablo değil**,
        polimorfik tipe `TALEP` eklenir.
      - Liste ekranı (`/talepler`): durum akışı
        **AÇIK → İNCELENİYOR → YAPILIYOR → ÇÖZÜLDÜ → KAPANDI**
        (+ REDDEDİLDİ / ERTELENDİ). Tür ve durum süzgeci.
      - **AXCALI kendi bildirdiğinin DURUMUNU görür** ("aldık / yapılıyor /
        çözüldü") — kör kutuya atmıyor, takip edebiliyor.
      - **DIŞ BİLDİRİM YOK** (Telegram/e-posta). Geliştirici Selliora'ya
        girip bakar. _Faz 2'de eklenebilir; mimari hazır kalsın._

      **MİGRATION — SALT-EKLEME, SQL ONAYA GELİR:**
      yeni tablo `Talep` (id, tür, başlık, açıklama, durum, oluşturan,
      sayfa, userAgent, oluşturulma, güncellenme) + `Attachment` tipine
      `TALEP`. **Harf bekçisi:** tablo adı büyük harfle başlar.

      **YETKİ:**
      - **"Bildir" düğmesi HERKESE AÇIK** — AXCALI operasyon rolü de
        bildirebilmeli.
      - Talep **LİSTESİ ve durum değiştirme** = yeni izin **`destek.yonet`**
        (geliştirici/sahip rolünde). AXCALI kendi taleplerini görür ama
        **durumunu DEĞİŞTİREMEZ**.
      - ⚠ Yeni izin: anahtar `lib/yetki/izinler.ts`'e **VE**
        `prisma/seed-yetki.ts` → `SONRADAN_DOGAN` listesine yazılır,
        deploy sonrası `npm run canli:yetki` koşulur.

      **İLKELER:**
      - Durum değişikliği ledger DEĞİL ama **iz kalır**: kim, ne zaman,
        hangi duruma aldı (audit).
      - **Otomatik teknik bilgi "sessiz varsayım" olmaz:** ne yakalandığı
        formda KULLANICIYA GÖRÜNÜR. Gizli veri toplama izlenimi olmasın.

      **TEST — `destek:dogrula`:** otomatik alanların doğru yakalandığı ·
      durum akışının İZİNLİ geçişleri (ve izinsizin reddedildiği) · yetki
      ayrımı (AXCALI durum değiştiremez) · ek yükleme sınırları.

- [ ] **DESTEK / TALEP MODÜLÜ — FAZ 2**
      _Faz 1 kapanmadan başlanmaz._
      Öncelik/kategori · dış bildirim (Telegram bot / e-posta) ·
      geliştirici notu ve yanıtı (AXCALI ile yazışma) · çözüldü bildirimi.

## MELONTİK CASE — AÇIK DOSYA, BÜYÜYOR

_Mimar kararı 15.08.2026._ **SIRA: Panel Aşama 3 + destek modülünden SONRA.**
Bu başlık **kapanmaz**; kullanıcı bilgi verdikçe genişler.

**AMAÇ:** Melontik'in (rakip ticari araç) özelliklerini Selliora'ya
taşımak — ama **KLON DEĞİL.** Alınan şey ekranın kendisi değil, o ekranın
cevapladığı SORU. Selliora'nın odağı **kâr optimizasyonu**: "hangi fiyattan
satarsam ne kalır" sorusu, rakip aracın çözdüğü başka her şeyden önce gelir.

**DOĞRULANMIŞ TEMEL — bu case'in dayanağı budur:**
Selliora'nın kâr motoru (NET-2) Melontik ile **BİREBİR tutuyor** (aynı
sipariş, 15.08.2026): satış, komisyon, stopaj, hizmet bedeli, maliyet ve
net KDV mantığı aynı. Tek fark kargo GİRDİSİ (bizde manuel tahmin, onlarda
API) — formül değil. **Yani optimizasyon katmanı sağlam bir kâr hesabının
üstüne kurulacak.** Bu doğrulama olmasaydı, optimizasyon yanlış bir
temelin üstünde büyürdü.

### 1. FİYAT / KOMİSYON SİMÜLASYONU — ilk hedef

Netleşen ilk parça. **Salı tarifesi** (Trendyol komisyonlarını Salı,
Hepsiburada Çarşamba günceller — bkz. anayasa) üzerinden, her fiyat aralığı
için **NET-2**'yi hesaplar. Payda uydurma değil: **GERÇEK FIFO maliyeti**
kullanılır.

- Dosya yapısı çözüldü; örnek `veri/ozel/` altında (ticari veri, **depoya
  ASLA girmez**).
- Kâr motoruna YENİ bir hesap yazılmaz: mevcut `lib/kar.ts` farklı fiyat
  varsayımlarıyla çağrılır. **İki kâr tanımı doğmamalı** — bu oturumda
  `PARTIAL`/`PARTIALLY_RECEIVED` hatası tam olarak iki kopyadan çıkmıştı.
- Komisyon oranı **ChannelSku seviyesinde** ve satışta snapshot'lanıyor;
  simülasyon **o günkü** oranı kullanır ve hangi tarih/tarife ile hesapladığını
  EKRANDA yazar (sessiz varsayım yasağı).

### Kullanıcı öncelik sırası (TASLAK — ek bilgiyle netleşecek)

1. **Fiyat / komisyon simülasyonu** ← ilk hedef, yukarıda
2. Reklam analizi
3. API entegrasyonu _(Faz 4'ün 1. maddesiyle örtüşüyor; orada kargo da
   gerçek tutara bağlanacak)_
4. Kampanya aracı

_2–4 arası şimdilik BAŞLIK; kapsamları kullanıcının vereceği bilgiyle
yazılacak. Erken özellik yasağı burada da geçerli: bilgi gelmeden kod
yazılmaz._

**ANAYASA HATIRLATMASI:** rakip aracın adı bir REFERANSTIR, veri bile
değil — Selliora'nın yapısına, alan adlarına, ekran metinlerine **girmez.**

## Faz 3 kapanışı ve hemen sonrası

- [ ] **HAKEDİŞ CANLI TEYİDİ — ⏸ BEKLEMEDE (18.08.2026).**
      _Halil: "hakediş raporunu şu anda sistemden alamam."_ Kod tarafı
      HAZIR; iş taze rapora bağlı, bekleyen tek şey o.

      **DEVAM ETMEK İÇİN ÜÇ ADIM, SIRAYLA:**
      1. `npm run canli:hakedis-esle` — 5 sn, yazmaz. Alt kısımdaki
         **hesap kırılımına** bak: "ORTAK HESAP VAR" diyorsa yükleme
         güvenli; "ORTAK HESAP YOK" diyorsa değiştirilmesi gereken dönem
         değil HESAPTIR (yoksa dördüncü sıfır).
      2. Taze `.xlsx` yükle — **satışları sistemde olan dönem**
         (14.07.2026 sonrası). Bağ yükleme anında kurulur.
      3. `npm run canli:hakedis-teyit` — dört bölüm gerçek konuşur.

      _Araçlarda değişiklik gerekmiyor._

      **Faz 3'ün son parçası.**
      _Mimar kararı 18.08.2026._ Sistemin **ileri dönük iddiası** ilk kez
      gerçek ödemeyle sınanır: nakit takvimindeki "girecek" rakamı bu
      iddiadan besleniyor.

      **✓ HAZIRLIK BİTTİ 18.08.2026 (Halil'siz kısım):**
      - `npm run canli:hakedis-teyit` — salt-okunur, dört bölüm:
        (1) test koşulabilir mi (eşleşme oranı) · (2) beklenen vs
        gerçekleşen, sipariş bazında + toplam + durum dağılımı ·
        (3) iptal ↔ hakediş asimetrisi · (4) vade kuralı sınavı.
      - Ekranla **aynı fonksiyonlar** (`beklenenHakedis`, `odemeDurumu`,
        `beklenenVade`) — betik kendi formülünü yazsaydı "betik şunu diyor
        ama ekran bunu diyor" diye ikinci bir tartışma açardı.
      - **Eşik beyanı sabite bağlandı.** Beyan zaten vardı ama sayı sözlüğe
        ELLE yazılmıştı ("Fark 1 ₺"); sabit değişse ekran eski sayıyı
        söylemeye devam ederdi — beyan doğru GÖRÜNÜR, yanlış olurdu.
        `hakedis:dogrula` 87 → 90, iki mutasyon kırmızı.

      **○ ÖN UÇUŞ ŞARTI — test boş çıkabilir.** Karşılaştırma yalnız
      satışa BAĞLANMIŞ rapor kalemleri için çalışır. Bağ yükleme anında
      kurulur ve daha önce iki kez ölçüldü, ikisi de sıfır: 13.08'de
      651 kalemin 0'ı, 15.08'de 110 kalemin 0'ı. Eski yüklemeler satışlar
      girilmeden yapıldıysa bağ hiç kurulmamıştır. **Betik önce bunu
      söyler; sıfırsa taze rapor gerekir.**

      **✓ YENİDEN EŞLEŞTİRME ARACI HAZIR 18.08.2026** —
      `npm run canli:hakedis-esle` (rapor) / `-- --uygula` (yazar).

      Bağ yalnız YÜKLEME anında kuruluyordu; "önce rapor sonra satış" sırası
      kalemi SONSUZA DEK bağsız bırakıyor. **Tarihsel kaza değil yapısal kör
      nokta:** TY raporu haftalık, satışlar elle giriliyor — sıra bir daha
      ters dönebilir. Bu yüzden araç TEK SEFERLİK DEĞİL, tekrarlanabilir.

      - Kural saf fonksiyonda: `lib/hakedis/yeniden-esle.ts`. Betiğe
        gömülseydi eşleşme sistemde İKİ yerde yaşardı (ilk dersin aynısı).
      - Ölçüt yükleme yoluyla AYNI: kod birebir + satış iptalli değil.
      - **Tek yeni kontrol KANAL.** Yükleme tek kanalın raporunu işler,
        kodlar zaten o kanaldandır. Toplu tazeleme bütün kanalları tarar ve
        çapraz eşleşme İLK KEZ mümkün olur — ayrı kural değil, aynı niyetin
        yeni bağlamda yazılmış hâli.
      - Çift eşleşme REDDEDİLİR (tahmin = yanlış satışa para yazmak).
      - Yalnız boş `saleId`; yazma anında `saleId: null` şartı WHERE'de de
        durur (arada başkası bağlamışsa ezilmez).
      - `hakedis:dogrula` 90 → 105, üç mutasyon kırmızı.

      **○ UZUN VADE:** `/hakedis` ekranında "bağsız kalemleri eşleştir"
      düğmesi — betik canlıda kanıtlandıktan sonra (İlke #1: görünür eylem).

      **○ ÖLÇÜM SONUCU 18.08.2026 — TEŞHİS B2 (YOKLUK).**
      648 bağsız kalem, **0 bağlanabilir**. Kodların şekli AYNI (11 hane,
      yalnız rakam) → biçim sorunu YOK. Sistemde **34 satış** var
      (14.07–18.08.2026) ve hiçbiri raporlarda geçmiyor.
      **Normalleştirme YAZILMADI** — B2'de boşa iş olurdu.

      _Beklenti düzeltmesi: "651 kalem canlanır" faydası GERÇEKLEŞMEZ.
      Aracın gerekçesi daralır ama durur: geçmişi kurtarmak değil, ileriye
      dönük emniyet ağı — sıra bir daha ters döndüğünde kalem sessizce
      bağsız kalmayacak._

      **○ İKİ YAN BULGU (aynı ölçümden):**
      1. **Dönem damgası hiç yazılmıyor.** `Settlement.periodStart/periodEnd`
         şemada var, kodda HİÇBİR YERDE yazılmıyor. "Bu rapor hangi dönemi
         kapsıyor" sorusu sistemden cevaplanamıyor.
      2. **Hesap kırılımı ölçülmeli.** 34 satış ile 648 kalemin kesişimi
         sıfır; bunu tek başına dönem farkı açıklamaz. Raporlar bir kanal
         hesabına, satışlar başkasına düşüyorsa **taze rapor da boş çıkar**
         ve değiştirilmesi gereken dönem değil HESAPTIR. Betiğe kırılım
         eklendi.

      **○ HALİL'DEN GELECEK — koşullu.** Betiğin çıktısına göre:
      eşleşme varsa eldekiyle koşulur, yoksa taze hakediş dökümü istenir.

      **KAPSAM SINIRI — dürüst olalım.** Eldeki ekstreler **öngörüyü**
      sınayamaz (iddiadan önce girdiler), ama **öngörüyü üreten KURALI**
      sınayabilir: `beklenenHakedis` NET-1 ve komisyondan, `beklenenVade`
      hesabın `payoutDays` AYARINDAN üretilir — ikisi de rapordan
      türetilmez, bağımsız kaynaklardır. Yani tutar formülü ve vade kuralı
      bugün sınanabilir; "sistem önceden söyledi, kanal öyle yatırdı"
      cümlesi için taze dönem gerekir.

- [x] **HAFİF YETKİ DİLİMİ — KAPANDI 18.08.2026.**
      `satis.duzenle` ve `satis.iptal` izinleri açıldı.

      **AYRIMIN ÖLÇÜTÜ ROL DEĞİL ETKİ.** `satis.yaz` "yeni satış kaydet"
      demektir ve depo işidir. Bu ikisi YAZILMIŞ kaydı geriye dönük
      değiştirir: NET yeniden hesaplanır, adet değişince **stok defteri
      hareket alır**, iptalde mal stoğa döner. "Satış girebilen herkes
      fiyat da düzeltebilir" varsayımı, eleman alındığı gün sessizce
      yanlış olur.

      - **Operasyon bu ikisini ALMAZ** — ayrımın bütün değeri burada;
        test "izin var mı" kadar "yanlış role verilmemiş mi" diye de sorar.
      - Operasyon `satis.yaz`ı korur: satış girmeye devam eder.
      - **"İptali geri al" AYRI İZİN DEĞİL**, `satis.iptal`e bağlı. Ayrı
        tutulsaydı kendi hatasını düzeltemeyen bir rol doğardı ve iş yine
        sahibe düşerdi — 17.08.2026'da tam olarak bu yaşandı.
      - Altı sunucu eylemi + üç form bağlandı. **Ekran da süzüyor:**
        yapamayacağı düğme hiç çizilmiyor (sunucu ayrıca korunuyor —
        ekran süzgeci kolaylıktır, güvenlik değil).
      - Bekçi eşiği kontrol edildi: Operasyon 12/27 (%44), %80 eşiğinin
        çok altında → **yanlış alarm yok, beyan gerekmedi.**
      - Şema değişikliği YOK, migration YOK.
      - `yetki:dogrula` 34 → 52, dört mutasyon kırmızı.

      ⚠ **DEPLOY SONRASI `npm run canli:yetki` ŞART.** İzin kodda doğdu,
      veritabanına işlenmezse tam yetkili rol onu HİÇ görmez ve ekran
      canlıda sessizce kaybolur (13.08 `/iadeler` vakası). Mutasyon M1
      tam olarak bu unutmayı kırmızı yakıyor.

## Faz 3 kapanış borcu

- [x] **KANAL KODSUZ KAYITLAR — KAPANDI 18.08.2026, BORÇ ÇIKMADI.**

      Ölçüm (`npm run canli:kanal-kodsuz`): **6 / 1072** aktif varyant.
      _27 sayısı bayatmış._

      - **1 KÖR** (kanal kodu + barkod ikisi de yok): `ELK-AN-260811-01`
        — hiç alım/satışı olmayan **katalog taslağı.**
      - **5 yarı kör**: alınmış ama henüz kanala listelenmemiş ürünler.

      **Kalem yanlış çerçevelenmişti: bu bir VERİ BORCU değil, OPERASYON
      AKIŞI.** Kanal kodu ürün pazaryerine listelenirken doğar; ondan önce
      girilecek bir kod YOKTUR. "Eksik" sanılan alan, aslında henüz
      gelmemiş bir bilgiydi.

      > **Kanal kodu, ürün pazaryerine listelenirken girilir; kodsuz kalan
      > = henüz listelenmemiş. Aylık kontrol: `canli:kanal-kodsuz`.**

      _Ders: bir sayı bayatlar. "27 kayıt" bir zamanlar doğruydu; kalem
      açılırken ölçülmediği için borç sanıldı ve gerçek durum altı kayıt
      çıktı. Sayı taşıyan her kalem, işe başlarken YENİDEN ölçülür._

- [ ] **PANEL KART SIRASI + SÜZGEÇ ERİŞİMİ** — _Halil talebi 17.08.2026._

      **a) KART SIRASI — operasyon hunisi.** İstenen sıra:
      **Adet · Kargoya verilen · Ciro · NET-1 · NET-2**
      (bugünkü sırada ciro ile kargo yer değiştirecek).
      Gerekçe: göz önce "kaç iş var", sonra "kaçı çıktı", sonra para
      sütunlarını okuyor. Sıra işin akışını takip etmeli.

      **b) SÜZGEÇ ERİŞİMİ — telefonda uzak.** Çözüm Halil'in tek bir
      sorusuna bağlı: **"kanalı SIK mı NADİR mi değiştiriyorum?"**
      - **SIK** → sticky süzgeç çubuğu (kaydırınca üstte kalır)
      - **NADİR** → başlıkta **aktif süzgeç etiketi** (dokununca açılır);
        çubuk sürekli yer kaplamaz

      **CEVAP BEKLİYOR — tahminle yapılmaz.** İkisi ters yönde tasarım:
      sık değiştiren için etiket fazladan tıklama, nadir değiştiren için
      sticky çubuk sürekli çalınan dikey alandır (Kural #12: alanı verimli
      kullan). Yanlış seçilirse her gün küçük bir bedel ödenir.

      **✓ İKİSİ DE YAPILDI 18.08.2026.** Halil'in cevabı **SIK** geldi →
      yapışkan çubuk seçildi.
      - Sıra kuruldu; gerekçe koda yazıldı (yeni kutu sona değil, hunideki
        yerine eklenir).
      - Çubuk **yalnız telefonda** yapışıyor: masaüstünde zaten açık duruyor
        ve orada yapışkan olsaydı üst şeridi kalıcı yerdi (Kural #12).
      - Telefonda aktif seçim **düğmenin içinde** yazıyor (tek satır,
        `truncate`); yoksa kullanıcı neye baktığını görmek için her
        seferinde açmak zorunda kalırdı — yapışkanlığın amacı buydu.
      - Dokunma hedefi 44 px korundu (İlke #8).
      - `yapiskan` varsayılan KAPALI: hangi ekranda açılacağı ekran ekran
        karar ister, toptan değil.

      `panel:dogrula` 325 → 336. **Bekçi kendi işini yaptı:** sıra
      değişince kıyas ibaresinin çapası kaydı ve kontrol kırmızı yandı —
      yerleşim kuralı, yerleşim değişince yeniden soruldu.

      _Bir kontrol ilk yazılışında YETERSİZDİ:_ `ozetMetni`in yalnız
      TANIMLI olmasına bakıyordu; mutasyonda değişken durup düğme onu
      kullanmayınca yeşil kaldı. Kontrol düğme gövdesini arayacak şekilde
      sıkılaştırıldı.

- [x] **KIYAS İBARESİ — YAPILDI 18.08.2026.** Halil: "kıyas rozeti sessiz
      kalıyor, veri mi yok değişim mi yok anlaşılmıyor."

      **Sessizlik bilinçliydi** (15.08.2026: kıyas dönemi bomboşken beş
      kutuya aynı cümleyi basmak gürültüdür) ve o karar DURUYOR. Eksik olan
      YERDİ: ibare dönem seçicisinin altındaydı, telefonda rakamlardan
      ekranlar ötede kalıyordu. **Bilgi vardı, karar anında görünmüyordu —
      Ders 3.**

      Çözüm ikisini de korur: kutu başına DEĞİL, **kart başına bir satır**,
      rakamların hemen üstünde. `panel:dogrula` 321 → 325; kontroller ekran
      kodunu tarıyor çünkü hata hesapta değil **yerleşimdeydi** — değer
      testi göremezdi. Mutasyon: ibare kaldırılınca ve kutu başına tekrar
      geri gelince kırmızı.

## Sonraki uygun pakette

- [ ] **PANEL KANAL KARTLARI AYARLANABİLİR OLSUN** — _Kullanıcı isteği
      14.08.2026._ Bugün panel, o para biriminde satış yapan TÜM aktif
      kanalları çiziyor; satışı olmayan kanal soluk kart + sıfır olarak
      duruyor (açık sıfır). Bu, 2-4 kanalda doğru davranış.
      **11 kanala çıkınca ekranı doldurur.** O zaman ayarlardan seçilebilir
      olacak: hangi kanallar panelde görünsün, kaç tanesi, sıfır olanlar
      gizlensin mi. Ayar VERİDİR (kod değil) — SaaS'ta her müşteri kendi
      seçimini yapar.
      **İlke korunur:** gizleme SESSİZ olmaz; gizlenen kanal varsa altta
      "N kanal gizli" yazar ve tek tıkla açılır. Yoksa "kanalım neden yok"
      sorusu geri döner.

- [ ] **STOK TÜKENME SİNYALİ** — geçmiş satış hızından "kaç gün stok kaldı".
      _Mimar notu 14.08.2026: düşük öncelik, Aşama 3'e DEĞİL._
      **"Sinyal, karar değil" olarak sunulacak** — ortalama yanıltabilir
      (kampanya günü satışı sıradan güne yayılır). Yaşlanma listesinin
      tersi ucu: o "çok yavaş", bu "çok hızlı" diyor.

- [ ] **ÇOK PARA BİRİMİ (EUR) — ⏬ EN SONA ERTELENDİ.**
      _Kullanıcı kararı 18.08.2026: "şu anda euroya ihtiyacımız yok, en
      sona ertele. TÜRK PİYASASINA çalışacağız."_

      **YERİ NETLEŞTİ: SaaS ile birlikte.** _Kullanıcı 18.08.2026: "SaaS
      olduğunda para birimini koyarız."_ Bu, kalemi belirsiz bir "sonra"dan
      çıkarıp büyüme sırasındaki ÜÇÜNCÜ aşamaya bağlar (bkz. Büyüme sırası
      → 3 · SaaS). Mantıklı: çok para birimi tek firmanın değil, farklı
      ülkelerde çalışan MÜŞTERİLERİN ihtiyacıdır — yani bir SaaS özelliği,
      bir Axcalı özelliği değil.

      Sıralamada en alt: uyarı merkezi, stok sinyalleri ve pazaryeri işleri
      önüne geçer. Aşağıdaki açılma şartı (gerçek EUR işlemi) artık tek
      başına YETMEZ — tek bir EUR işlemi için ekran açılmaz, elle not
      düşülür ve SaaS penceresinde toplu çözülür.

      ⚠ **ERTELEME, TEK PARA BİRİMİ VARSAYIMINI DERİNLEŞTİRME İZNİ
      DEĞİLDİR.** Anayasa kuralı yürürlükte: parasal değer her zaman
      `Decimal + currency`. "Nasılsa hep TRY" diye para birimi alanını
      atlayan, TRY'yi sabit yazan ya da toplamayı para birimini sormadan
      yapan yeni kod YAZILMAZ. Erteleme EUR **özelliğini** erteler, veri
      **şeklini** değiştirmez — bugünkü kısayol, yarınki yeniden yazımdır.

      _(Özgün kayıt, karar 14.08.2026, mimar:)_
      Nakit takvimi ve panel bugün **tek para birimi konuşuyor: TRY.**
      Mimari EUR'ya **hazır** (para tutan yapılar ileride para birimi
      etiketi alabilecek biçimde), ama **EUR kodu / ekranı / mantığı YOK.**

      **NEDEN ŞİMDİ TASARLANMIYOR:** iki farklı akış iki farklı mimari
      demek ve gerçek akış görülmeden seçilemez —
      - (a) ayrı bir EUR hesabı tutulur, TRY'den bağımsız yaşar; ya da
      - (b) giriş anında TL'ye çevrilir, defter tek para birimli kalır.
      (a) çok para birimli defter ister (her toplam para birimi başına),
      (b) kur kaynağı ve çevrim anı kararı ister. Yanlış seçim, sonradan
      dönüşü pahalı bir yapı bırakır.

      **AÇILMA ŞARTI:** gerçek bir EUR işlemi doğduğunda VE akış
      netleştiğinde. O güne kadar yeni özellikler "tek para birimi"
      varsayımını DERİNLEŞTİRMEMELİ (bkz. CLAUDE.md → SaaS hazırlık
      kuralı): para tutan alanlar `Currency` taşımaya devam eder,
      toplamlar para birimine göre gruplanabilir kalır.

- [ ] **KOMİSYON ORANI TAZELİĞİ UYARISI** — "oranlar N gün önce yüklendi".
      Trendyol salı, Hepsiburada çarşamba güncelliyor; eski oranla fiyat
      koymak sessiz zarardır. _Mimar notu 14.08.2026, düşük öncelik._

- [ ] **İADE ORANI ve TEDARİKÇİ TESLİM SÜRESİ — RAPOR ekranına.**
      İade oranı kanal/ürün bazında; teslim süresi `purchasedAt` →
      `receivedAt` farkından. Panele değil rapora. _Mimar notu 14.08.2026._


- [ ] **HURDA / İKİNCİ EL STOK TAKİBİ** — Excel'deki "Hurda Takip"
      sekmesinin karşılığı. _Karar 13.08.2026, RMA modülünden SONRA
      ayrı iş._

      **ÖLÇÜLDÜ — bugün sistemde YERİ YOK.** Hasarlı mal yalnızca bir
      SAYAÇTIR (`PurchaseItem.damagedQuantity`, `ReturnItem.damagedQuantity`)
      ve o sayaçları sadece Tazminat ekranı okur. Stok defterine HİÇBİR
      hareket yazılmaz. Stok = Σ `StockMovement.quantityDelta` olduğu için
      sonuç şu: **mal fiziken depoda, sistemde yok.** Stok ekranında
      görünmez, envanter değerine girmez, aranamaz.

      **Bu bir kusur değil, bilinçli tasarımdı:** hasarlı mal SATILABİLİR
      stok değildir ve normal stoğa karışırsa FIFO'dan sağlam mal gibi
      düşülür. Ama kullanıcının gerçek akışı bunu aşıyor: hasarlı mal
      **ikinci el satılıyor ya da yedek parçayla onarılıp tekrar satışa
      giriyor.** Yani "maliyeti düşülmüş ama fiziken elde, ileride
      satılabilir" diye üçüncü bir hâl var.

      **Bugünkü engel somut:** satış akışı stok yetmezse `yetersizStok`
      hatası veriyor (`src/lib/satis.ts:118`). Hurda malın stoğu 0 olduğu
      için ikinci el satış BUGÜN KAYDEDİLEMEZ.

      **Çözüm yönü (tasarlanacak):** hasarlı mal için ayrı bir stok
      havuzu — muhtemelen `StockMovement`'a hurda ayrımı ya da ayrı bir
      raf/konum (Location) ile. Kritik kural: hurda stoğu **normal FIFO'ya
      KARIŞMAMALI**, ayrı listelenmeli, envanter değerinde ayrı satır
      olmalı (maliyeti zaten gider yazılmış).

      **Kâr tarafı:** ikinci el satış geliri normal kâr gibi değil,
      **"görünmeyen giderden kurtarım"** olarak görünmeli. Maliyeti
      geçmişte düşüldüğü için o satışın kârı neredeyse tamamı kârdır;
      normal marjla aynı tabloda göstermek kanal marjlarını yanıltır.

      **Tetikleyen vaka:** axcali1672, 2.980 TL'lik TY satışı, hasarlı
      döndü, 1.799 TL maliyet gider yazıldı. Tazminat talebi
      AÇILMAYACAK (kullanıcı kararı) — mal ikinci el satılacak ya da
      onarılacak. Panel −806,20 DOĞRU kalır.


- [ ] **Alımı ÜRÜN/SKU ile arama — önce ÖLÇ, sonra yaz.**
      _Karar 13.08.2026._ Alım araması bugün alım kodu, tedarikçi sipariş
      numarası ve tedarikçi adında çalışıyor (ayraç duyarsız). "Bu ürünü
      hangi alımlarda almıştım?" sorusu AYRI iştir: `PurchaseItem` →
      `ProductVariant` üzerinden join gerektirir ve alım listesinde
      sayfalama yok — 1054 ürünlük katalogda ölçmeden yazılmaz.
      **Ölçülecek:** kaç alım/kalem var, join'li aramanın süresi ne,
      sayfalama önce mi gelmeli. _Ürün ekranlarında sayfalama 50/sayfa
      olarak çözülmüştü; alımlarda henüz yok._

- [ ] **Veri temizliği: 3 ESKİ alımın kodu sipariş numarası olarak girilmiş.**
      _13.08.2026'da arama testinde görüldü:_ `431 231 579 6`,
      `405-8780105-5340330`, `482 929 661 2`. Bunlar alım numarasının
      ELLE girildiği dönemden kalma kayıtlar — o gün formda kod alanı
      açıktı ve "ewe", "25-23" gibi kodlar da bu yüzden oluşmuştu.
      **Kaynak sorun ZATEN kapalı:** alım numarası artık sistem üretiyor
      (`ALM-HE-260811-01`) ve elle girilemiyor. Geriye yalnız eski
      kayıtların görüntüsü kaldı; ikisinde Sipariş No alanı boş, o yüzden
      listede `—` görünecekler. Kullanıcı isterse düzenleme ekranından
      Sipariş No'yu doldurur; kod bir kere doğduğu için DEĞİŞMEZ.

- [x] ~~**Canlı veritabanı bağlantı sınırı ölçülsün.**~~
      _Tamamlandı 13.08.2026._ Ölçüldü: `max_user_connections` **25**,
      `wait_timeout` **120 sn**. Sürücü varsayılanları (10/10/1800 sn) bu
      sunucuya yanlıştı; üçüncü eşzamanlı Vercel örneğinde kota bitiyordu.
      Ayarlar `src/lib/veritabani-adresi.ts`'e yazıldı
      (3 · 1 · 60 sn), betikler tek bağlantıya indirildi,
      `npm run baglanti:olc` ile ölçüm kalıcı hâle getirildi.
      **Not:** `minimumIdle=0` denendi ve bağlantıyı tamamen kırıyor —
      dosyadaki uyarıya bakılmadan değiştirilmemeli.

- [x] ~~**Detay sayfası tabloları mobilde karta dönsün** — İlke #8~~
      _Tamamlandı 09.08.2026 (`e4c65b0`): alım kalemleri, ürün varyantları
      ve stok hareketleri tabloları karta çevrildi; gerçek cihazda
      kullanıcı tarafından doğrulandı._

- [x] ~~**Raf konumu düzenleme ve pasife alma** — İlke #1~~
      _Tamamlandı 08.08.2026 (`d4cd8ad`): düzenleme sayfası, pasife alma,
      kod değişikliğinde QR etiket uyarısı, mobil kart düzeni._

## İlk zorunlu migration ile birlikte

- [x] ~~**`axcaliSku` → `companySku` yeniden adlandırması**~~
      _Tamamlandı 09.08.2026, kâr motoru migration'ında
      (`20260809164359_kar_motoru`). Prisma'nın ürettiği DROP+ADD veri
      kaybettireceği için migration elle `ALTER TABLE ... CHANGE` olarak
      yazıldı; önce yedek alındı, sonra iki kaydın da değeri korunduğu
      doğrulandı. Adlandırma standardının son adımıydı._

- [ ] **Veritabanı adı `axcali_erp`**
      Bağlantı dizesindeki veritabanı adı da eski markayı taşıyor.
      Yeniden adlandırmak veri taşıma gerektirir; yukarıdaki alan
      adı değişikliğiyle aynı bakımda değerlendirilecek.

## Karara bağlandı — Faz 2 / Aşama 2'de uygulanacak

- [x] ~~**İş saat dilimi sabitlemesi**~~ → **`Europe/Istanbul` seçildi
      (09.08.2026).** Kural CLAUDE.md → Teknoloji kurallarına yazıldı.
      Uygulama Aşama 2 paketinde: `src/i18n/ayarlar.ts`'e sabit, hem
      `request.ts` (gösterim) hem `tarihGirdisi()` ("bugün" üretimi) o
      sabite bağlanacak.
      _Mevcut veri kontrol edildi (`scripts/saat-dilimi-kontrol.ts`):
      20 tarih alanından 2'si iki saat diliminde farklı gün gösteriyor,
      ikisi de `createdAt` denetim damgası. İş tarihleri
      (`purchasedAt`, `soldAt`, `occurredAt`) KAYMIYOR — tarih girdileri
      UTC gece yarısı olarak saklandığı için iki dilimde de aynı gün._

## Canlıya geçiş ön şartları

_Karar 09.08.2026. **CANLIYA GEÇİLDİ 10.08.2026** — Vercel + All-Inkl MySQL._

**Canlı ortam:** Vercel projesi `axc` · adres `axc-seven.vercel.app`
· veritabanı `d047df6e` @ `w0216a46.kasserver.com` (All-Inkl, dış erişim açık).
`DATABASE_URL` yalnızca Vercel ortam değişkenlerinde durur; depoda yoktur.

Canlı sağlık kontrolü (10.08.2026): 12 sayfa 200, tümü 1,3 sn altında ·
şablon üretimi 2,0 sn · hafif yedek 4,2 sn · tam yedek 15,2 MB / 9,4 sn
(60 sn sınırının altında).

- [x] ~~**Veri içe aktarma modülü (Excel/CSV)**~~ — _Tamamlandı 10.08.2026_
      `/ayarlar/ice-aktarma`: şablon indir → kip seç → denetle → önizle →
      onayla → tek transaction. Kullanıcı testinden geçti (hata → yazım
      önerisi → düzeltme → önizleme → yazım; 2 ürün, 3 parti, 75 adet).
      Asıl kapsam aşağıda duruyor, tarihe not olarak bırakıldı:
      Kapsam:
      1. Ürün + varyant listesi (kodlar, komisyon oranı, desi, raf dahil)
      2. Açılış stoğu — `INITIAL` hareketi olarak, mümkünse maliyetli
      3. Gerekirse açık alımlar
      Çalışma biçimi: **şablon indirme → yükleme → satır satır doğrulama
      → hata raporu** (hangi satır neden reddedildi). Yarım aktarma
      olmamalı; ledger kuralları içe aktarmada da geçerli.
      _SaaS: bu modül onboarding'in temeli — her yeni müşteri kendi
      Excel'ini yükleyerek başlayacak._

- [x] ~~**Dışa aktarma (Excel/CSV)**~~ — _Tamamlandı 10.08.2026_
      Beş liste ekranında "Excel indir" (ekrandaki filtreyi uygular) +
      `/ayarlar/disa-aktarma` altında tüm veri tek dosyada çok sayfalı.
      Özgün kapsam notu:
      İkisi aynı şablonu ve altyapıyı paylaşır, bu yüzden birlikte
      yapılır.
      1. Her ana liste ekranına "Excel/CSV indir" eylemi — ürünler,
         alımlar, satışlar, stok, kartlar. **Mevcut filtre/aramayı
         uygulayarak** indirir (ekranda ne görüyorsa onu).
      2. `/ayarlar` altında "tüm veriyi dışa aktar" — tablo tablo tam
         döküm.

- [x] ~~**TEK KULLANICILI GİRİŞ**~~ — _Tamamlandı 10.08.2026 (`36f8e84`)_
      `src/proxy.ts` varsayılan KAPALI: açıkça serbest bırakılmayan her yol
      giriş ister, yeni ekran korumalı doğar. Parola Node'un scrypt'i,
      jeton Web Crypto HMAC — sıfır yeni bağımlılık. Parola değişince açık
      oturumlar kapanır. `oturum:dogrula` 40 kontrol; sonuncusu kaynak
      ağacını tarayıp korumasız uç kalmadığını doğruluyor.
      Özgün karar notu:
      _Karar 10.08.2026, canlıya çıkışta ortaya çıktı._
      Sistemde hiç giriş yoktu; deploy edilince adres internete açıldı ve
      URL'yi bilen herkes kâr/maliyet verisini görebilir hâle geldi.
      Bugünkü çözüm **Vercel Authentication** (tek tık, geçici köprü).
      Kalıcısı uygulamanın kendi kapısı olmalı:
      e-posta/parola · oturum · tüm sayfalar korumalı · **RBAC YOK**.
      Faz 4'ü BEKLEMEZ — Faz 3 ekranları biterken yapılır, gerçek envanter
      içe aktarılmadan önce hazır olur.
      Kütüphane kısıtı için bkz. CLAUDE.md → Güvenlik katmanları:
      NextAuth v5 beta olduğu için eleniyor; `better-auth` (1.x) ya da
      elle yazılmış oturum.

- [x] ~~**Otomatik veritabanı yedeği**~~ — _Tamamlandı 10.08.2026 (`d40f782`)_
      Vercel Cron her gece 03:00 (İstanbul) → `/api/yedek/otomatik` →
      Vercel Blob (Frankfurt, ÖZEL). 30 gün saklanır, eskisi silinir.
      `CRON_SECRET` yoksa uç nokta kapalı. Canlıda elle tetiklenip
      doğrulandı. **Üç canlıya geçiş ön şartının üçü de tamam.**
      Özgün karar notu:
      _10.08.2026: hosting kararı verildi (Vercel), yol açıldı.
      Vercel panelinde **Cron Jobs** bölümü mevcut; `mysqldump` yok ama
      `/api/yedek` zaten çalışıyor ve canlıda ölçüldü (tam yedek 9,4 sn).
      Kalan karar: yedek dosyası NEREYE yazılacak (uzak depolama / e-posta)
      — Vercel'in dosya sistemi kalıcı değildir._
      Elle yedek 10.08.2026'da tamamlandı (`/ayarlar/disa-aktarma` →
      "Yedek al", JSON tam döküm; kargo tarifesiz hafif sürümü de var).
      Zamanlanmış olan hosting kararına bağlı:
      - **All-Inkl / VPS**: sunucu cron + `mysqldump`, saklama süreli —
        en sağlamı, muhtemel tercih.
      - **Vercel**: `mysqldump` YOK (mysql istemcisi bulunmuyor).
        Vercel Cron → route handler → JSON döküm → uzak depolama.
      Karar canlıya geçiş planında verilecek.

- [x] ~~**Yedekten geri yükleme ekranı**~~ ✓ 12.08.2026
      `/ayarlar/geri-yukleme`. Kaynak (depodaki gece yedeği ya da dosya) →
      denetle (hiçbir şey yazmaz) → fark tablosu → "GERİ YÜKLE" yazdırma +
      otomatik güvenlik yedeği → tek transaction. Kısmi geri yükleme YOK.
      `yedek:dogrula` gerçek turu koşuyor (30 kontrol).

- [ ] **YEDEK KAPSAM BOŞLUĞU — nasıl oluştuğu (ders)**
      12.08.2026'da bulundu: `YEDEK_TABLOLARI` 10.08.2026'da yazılmış, sonra
      eklenen **beş model listeye girmemişti** — Supplier, Settlement,
      SettlementItem, Compensation, User. Yani gece yedekleri iki gündür
      eksik alınıyordu ve felaket anında hakediş, tedarikçi, tazminat ve
      giriş hesapları kaybolacaktı. Hiçbir hata vermiyordu; yedek "başarılı"
      diyordu.
      Bekçi kuruldu (`yedek:dogrula` bölüm 1): şemadaki her model listede mi
      diye bakıyor, eksikse kırmızı yanıyor. **Bu maddenin açık kalma sebebi:
      aynı sınıf hatanın başka yerlerde de olabileceği.** "Yeni model
      eklendiğinde güncellenmesi gereken listeler" taranacak (dışa aktarma
      listeleri, içe aktarma şablonu, el kitabı sözlüğü).


- [ ] **27 katalog kaydı — kanal kodu yok (kullanıcı kararı: şimdilik dokunma)**
      Kodları pazaryeri deseninde değil (MTKRUPSGVX2, SGBRAUN072195, BD802253…);
      ön ekler kaynak mağaza gibi duruyor ama TEYİT EDİLMEDİ, tahminle
      yazılmadı. Üçünün de ortak özelliği: **stok 0 · alım yok · satış yok** —
      hiç hareket görmemiş katalog kayıtları. Taşımamak bugün hiçbir şeyi
      bozmuyor. İlk alım ya da satış geldiğinde hangi kanala ait oldukları
      kendiliğinden belli olur.  idempotenttir: ön ek→kanal
      eşlemesi verildiğinde ikinci tur güvenle koşar, taşınmışlara dokunmaz.
      _Karar 12.08.2026._


- [ ] **Hakedişten ürün bazlı komisyon oranı önerisi (ERTELENDİ)**
      Fikir sağlam — gerçekten ödenmiş orandan iyi kaynak yok — ama bugün
      girdisi boş. Ölçüldü 13.08.2026: 651 hakediş kaleminin **0 tanesi**
      satışa bağlı; oran hesaplanabilen 84 siparişin **hiçbiri** sistemde
      satış olarak yok (raporlar girilen satışlardan eski). Ayrıca yüklü
      Trendyol dosyalarında **hiç komisyon kalemi yok** — 92 komisyon
      satırının hepsi Hepsiburada; TY'de komisyon net hakedişin içinde eriyor,
      oran ancak çıkarma yoluyla bulunur ve kırılgandır.
      YAZILMA ŞARTI: eşleşen satış sayısı anlamlı olduğunda.
      KURALLAR (karar 13.08.2026):
      - Yalnız TEK KALEMLİ siparişten öneri üretilir.
      - Çok kalemliye "sipariş oranı %X, N kalem — ürün bazında
        ayrıştırılamaz" denir. %17 ve %23'lük iki ürün %20 gösterir ve
        ikisine de yanlış yazılır.
      - Her hakediş yüklemesinde kaç öneri üretilebildiği raporlanır.
      Kanal bazlı BANT bu maddeyi beklemeden yapıldı (src/lib/komisyon-bandi.ts).

- [x] ~~**Pazaryeri komisyon listesi okuyucusu**~~ ✓ 13.08.2026
      Ayrı bir ekran olarak çıktı: `/kanal-sku/komisyon-aktar` (bkz. AÇIK
      PAKET SIRASI → 1). "Gerçek dosya gelmeden okuyucu YAZILMAZ" kuralına
      uyuldu: iki gerçek dosyanın başlık satırları okundu, okuyucular onlara
      göre yazıldı ve başlıklar `komisyon:dogrula`nın 5. bölümüne kilitlendi
      (dosyalar depoya KONMADI — ticari veri, depo herkese açık).


## Faz 4 — açılış bekliyor (sıralama onayı gerekli)

_Karar 13.08.2026. Sistem şu an **BAKIM / KULLANIM** kipinde: kullanıcı
günlük veri giriyor, iki canlı teyit bekleniyor (2 Eylül kart ekstresi ve
ilk eşleşen hakediş). **Kullanıcı sıralamayı onaylayana kadar iş
AÇILMAZ** — analiz bile başlamaz._

Aday sıralama (mimar önerisi, kullanıcı onayı bekleniyor):

- [ ] **1. Pazaryeri API entegrasyonları**
      Satış/sipariş otomatik akışı. Elle satış girme biter; hakediş
      eşleşmeleri kendiliğinden dolar — bugün 651 hakediş kaleminin 0'ı
      satışa bağlı, sebebi tam olarak bu.
      Önce HB mi TY mi: **kullanıcının satış hacmine göre** karar verilecek.

      **KARGO GERÇEK TUTARA BAĞLANACAK (karar 15.08.2026).** Bugün kargo
      göz kararı desiden TAHMİN giriliyor; API bağlanınca pazaryerinin
      GERÇEK kestiği tutardan okunacak (Melontik'in yaptığı gibi) ve manuel
      tahmin otomatikle değişecek.

      > **O ZAMANA KADAR BİLİNEN SAPMA KABUL EDİLDİ.** NET-2'nin kargo
      > kaleminde küçük ve **yönü belli** bir iyimserlik var: ~₺9–10/sipariş,
      > kârı hafif YÜKSEK gösteriyor. Ayrı bir "gerçek kargo güncelle"
      > adımı manuel yükü artırır, farkın büyüklüğüne değmez.
      > _Bu bir sessiz varsayım DEĞİL: ölçüldü, yönü biliniyor, yazılı._

      > **KÂR MOTORU DIŞ KAYNAKLA DOĞRULANDI (15.08.2026).** Aynı sipariş
      > Melontik (rakip ticari araç) ile karşılaştırıldı: **satış, komisyon,
      > stopaj, hizmet bedeli, maliyet ve net KDV mantığı BİREBİR tutuyor.**
      > Tek fark kargo GİRDİSİ (tahmin vs API) — formül değil.
      > **NET-2 formülü sağlam; dokunulmuyor.** Bu, "sabit ≠ sabit, dış
      > kaynakla karşılaştır" ilkesinin en güçlü uygulaması: kendi testimiz
      > kendi varsayımımızı doğrular, bağımsız bir araç doğrulamaz.

- [ ] **2. Barkod okutma akışları**
      Mal kabul + sipariş karşılama, telefon kamerasıyla. SKU etiketleri
      zaten basılıyor, ortak bileşen (`barkod-okuyucu.tsx`) zaten var.

- [ ] **3. Depo/raf optimizasyonu + toplu sevkiyat**
      "4'ü X 5'i Y" Katman-2. Kargo maliyet önerisi mantığı Faz 2'de
      kurulmuştu; toplu sevkiyat ekranı aynı mantığı toplu işe uygular.

- [ ] **4. Çoklu kullanıcı + RBAC**
      TR ekibi sisteme girecekse ÖNE ÇEKİLİR. Bugün tek kullanıcıda boş
      katman; "depocu stok girsin ama kâr marjını görmesin" ihtiyacı
      eleman alınınca doğar.

- [ ] **Web sitesi kanalı — 2027 başı, ikas denemesiyle açılır**
      Faz 4'ün 1 numarası olmaktan ÇIKTI (karar 13.08.2026, ~6 ay
      ertelendi). Platform karşılaştırması yapıldı, eğilim **ikas**:
      TR ekip işletecek, TR pazarı, ilk yıl düşük hacim, uzun vadeli marka.
      WooCommerce yedekte (API sınırına çarpılırsa). Shopify **elendi**:
      TR'de Shopify Payments yok, USD maliyet, TR entegrasyonları üçüncü
      parti.
      SIRADAKİ ADIM KOD DEĞİL: TR ekibi ikas deneme hesabında 3-5 ürünle
      test siparişi çevirecek. Faz 4 planının site kanalı bölümü o
      denemeden sonra yazılır.
      Mimari hazır: `ChannelType`'a `WEBSITE` eklenmesi yeterli.

## Büyüme sırası — ÜÇ AŞAMA, SIRAYLA

_Karar 13.08.2026: **SaaS ERTELENDİ.** Önce tek firma için her şey
tamamlanır, sistem kendi işinde kanıtlanır, sonra SaaS._

**Mimari kararlar SaaS-uyumlu alınmaya devam eder; SaaS'a özel iş AÇILMAZ.**
Bu ayrım önemli: `Company` tablosu ve `UserCompanyRole` üyeliği bugün
kuruldu (13.08.2026) çünkü RBAC'i yarın yeniden yazmamak için gerekliydi —
ama bu "SaaS işine başladık" demek değil. Bugünkü kural değişmedi:
yeni yazılan hiçbir özellik "tek firma" varsayımını DERİNLEŞTİRMEZ.

### 1 · TEK FİRMA TAMAMLAMA — şimdi

Bu dosyadaki açık maddelerin tamamı buraya girer. Sistem tek firmada
eksiksiz çalışmadan sonraki aşamaya geçilmez. Bugünkü öncelikler:
pazaryeri API'leri, barkod akışları, depo/sevkiyat, RBAC ekranları.

- [ ] **Sistem kendi işinde kanıtlansın**
      Ölçüt kod değil KULLANIM: günlük veri girişi kesintisiz sürüyor mu,
      iki canlı teyit geçti mi (2 Eylül kart ekstresi · ilk eşleşen
      hakediş), kâr rakamlarına güveniliyor mu.

### 2 · ÇOK-FİRMA VERİ KATMANI — kendi alt firmaları ihtiyacı doğunca

- [ ] **companyId'nin veri katmanına yayılması**
      Bugün yalnız üyelik firma biliyor; ürün, alım, satış, stok gibi
      ~30 tablo bilmiyor. Yayılma AYRI PAKETTİR ve üç parçası var:
      1. **Damgalama** — her kayıt bir firmaya yazılır (migration + geriye
         dönük doldurma; bugünkü veri tek firmaya damgalanır).
      2. **Sorgu süzgeci** — her okuma aktif firmayla süzülür. Tek tek
         `where` yazmak sürdürülemez; merkezî bir katman gerekir.
      3. **SIZINTI BEKÇİSİ** — süzgeçsiz kalan sorguyu yakalayan denetim
         betiği. `yetki:dogrula`'nın "korumasız action" bekçisiyle aynı
         mantık: biri unutulursa başka firmanın verisi görünür ve bu
         SESSİZ olur.
      Tetikleyici: kullanıcının kendi ikinci firması doğduğunda.

### 3 · SaaS — EN SON

- [ ] **Kayıt · faturalama · firma bazlı yedek**
      Aşama 2 bittikten sonra. Kapsam: dışarıdan müşteri kaydı, abonelik
      ve faturalama, firma bazlı yedek/geri yükleme izolasyonu, onboarding
      (içe aktarma) ve offboarding (dışa aktarma) — ikisi de zaten
      birinci sınıf özellik olarak duruyor (bkz. VERİ SAHİPLİĞİ İLKESİ).
      _SaaS'a özel hiçbir iş bu aşamadan önce açılmaz._

## Kâr düzeltme yolundaki iki boşluk

10.08.2026'da "kâr hesaplanamadı" uyarısına çözüm yol haritası yazılırken
ortaya çıktı: uyarı kullanıcıyı bir yere göndermek istiyor ama o ekran yok.
Yol haritası bu yüzden "bu ekran henüz yok" diyerek dürüst kalıyor.

- [x] ~~**Alım düzenleme ekranı**~~ — _Tamamlandı 10.08.2026_
      `/alimlar/[id]/duzenle` + iptal. Kullanıcı kararı: mal kabul edilmiş
      alımda **maliyet düzeltilince defterdeki maliyet damgası da düzelir**
      (geçmiş satışlar etkilenmez, bundan sonrakiler doğru hesaplar).
      Adet de düzeltilebilir ama kabul edilmiş adedin altına inemez.
      Özgün not:
      `NO_COST` ve `CURRENCY_MISMATCH` durumlarının GERÇEK çözümü alım
      kaydını düzeltmektir: birim maliyet boş bırakılmış ya da para birimi
      yanlış seçilmiştir. Bugün `/alimlar/[id]` yalnızca detay gösteriyor,
      düzenleme yok. Stok defteri kaydı da (kural gereği) değiştirilemez;
      bu yüzden maliyeti sonradan girmenin bugün hiçbir yolu yok.
      Çözüm şekli kararlaştırılmalı: alım kalemi düzenleme mi, yoksa
      ters işaretli ADJUSTMENT + maliyetli yeni giriş üreten bir
      "stok düzeltme" ekranı mı?

- [x] ~~**Kanal SKU / komisyon oranı ekranı**~~ — _Tamamlandı 10.08.2026 (`9eba8f9`)_
      `/kanal-sku`: satır içi oran düzenleme, "yalnız oranı eksik olanlar"
      süzgeci, üstte kaç eşlemede oran yok uyarısı. Özgün not:
      Komisyon oranı `ChannelSku` seviyesinde tutuluyor (haftalık değiştiği
      için) ama onu YAZACAK ekran yok — oran her satışta forma elle
      giriliyor, `RULE_MISSING` de çoğunlukla bundan çıkıyor. Ekran gelince
      satış formu oranı hazır önerir ve bu uyarı büyük ölçüde kaybolur.

## Hakediş paketinden çıkan kararlar

- [x] ~~**Kanal hesabı rolü: ALIŞ / SATIŞ ayrımı**~~ ✓ 12.08.2026
      Kullanıcı arbitraj yaptığı için AYNI pazaryerinde iki tür hesabı var:
      kampanyada mal ALDIĞI kişisel hesaplar (hesap başına alım limiti
      nedeniyle birden çok) ve mal SATTIĞI mağaza. Ayrım yoktu; dört ekran
      13 hesabın hepsini gösteriyordu — Amazon'dan alım yaptığı hesaba
      hakediş raporu yükleyebiliyordu.
      Roller kullanımdan TÜRETİLDİ (tahmin edilmedi): 8 alış, 2 satış,
      1 çift rol, 2 rol seçilmemiş.
      Form TEK SEÇİM (radyo, varsayılansız). Rolü seçilmemiş hesap hiçbir
      formda listelenmez. Kaydı olan rol sunucuda kaldırılamaz.

- [x] ~~**Hepsiburada — S.Ahmet: çift rol düzeltmesi (kullanıcıda)**~~ ✓ 12.08.2026
      Kullanıcı 2 satışı Hepsiburada — AXCALI'ya taşıdı; hesap artık yalnız
      ALIŞ (7 alım). Canlıda doğrulandı: çift rollü hesap KALMADI, 13 kanal
      hesabının hepsi tek rolde.

- [x] ~~**Trendyol — SEDA ve N11 — AXCALI: rol seçimi (kullanıcıda)**~~ ✓ 12.08.2026
      Trendyol — SEDA alış, N11 — AXCALI satış olarak işaretlendi.

- [ ] **Gerçek hakediş dosyaları depoya KONMADI — bilinçli**
      5 Trendyol raporu okundu ve okuyucu onlarla doğrulandı, ama dosyalar
      `veri/` altına kopyalanmadı: içlerinde **"Müşteri Adı"** kolonu var ve
      depo herkese açık (github.com/technsug-ops/axc). Bunun yerine gerçek
      BAŞLIK SATIRI ve 12 işlem tipi `hakedis:dogrula`nın 5. bölümüne
      çıkarıldı; JBL zinciri (11471381662) altın senaryo olarak sabitlendi.
      Gerçek dosyayla yeniden koşum gerekirse yerel klasörden elle yapılır.
      _Karar 11.08.2026._

- [ ] **Resmî tatil takvimi (iş günü hesabı)**
      Trendyol vadesi İŞ GÜNÜ cinsinden. Bugün yalnız hafta sonu atlanıyor;
      resmî tatiller sayılmıyor çünkü VERİ gerektirir (yıl yıl değişir,
      dinî bayramlar kayar). Sonuç ÖLÇÜLDÜ: 28 iş günü hesapta 38 takvim
      günü, kullanıcının gözlemi ~41 — aradaki 3 gün tatil.
      Bu yüzden gecikme eşiği 3 iş günü. Tatil tablosu eklenirse EŞİK DE
      yeniden düşünülmeli; `hakedis:dogrula` bu bağı test olarak kilitliyor.
      _Karar 11.08.2026: önce hafta sonu._

- [ ] **Kupon → kâr yansıması (iade-etkisi modeliyle)**
      Trendyol "Kupon" satırı satışa bağlı ek kesintidir ama bugün YALNIZ
      hakediş tarafında duruyor; kâr snapshot'ına dokunmuyor (kullanıcı
      kararı 11.08.2026). Yani gerçek net kâr, kupon kadar daha düşük.
      İade motorunun "sonradan gelen etki" modeli bu iş için hazır kalıp;
      sırası gelince aynı yaklaşımla bağlanır.

- [ ] **Yerel veritabanı sürüklenmesi — `Expense_templateId_fkey`**
      Yerelde bu yabancı anahtar YOK, canlıda VAR (10.08 `gider_muhasebe`
      migration'ında oluşmuş). Prisma bu yüzden hakediş migration'ına
      alakasız bir `ADD CONSTRAINT` satırı ekledi; üretime gitseydi
      "duplicate foreign key" ile patlardı. Satır elle silindi.
      Yerel veritabanı bir ara elle kurcalanmış olmalı. Sonraki
      migration'da aynı gürültü çıkarsa yerel şemayı canlıyla eşitle.

## Gözlem üzerine yapılacaklar

- [x] ~~**Çıkmaz hatalar eyleme dönüştürüldü**~~ ✓ 11.08.2026
      "Zaten var" diyen ama nereye gidileceğini söylemeyen hatalar:
      · Kanal SKU eşleme çakışması → hangi ürün + "Var olan eşlemeye git"
        (liste o hesaba ve SKU'ya süzülür)
      · Satış sipariş no çakışması → "Var olan satışa git". Aynı satışı
        ikinci kez girmek stoğu iki kez düşürürdü.
      · Raf kodu çakışması → hangi raf olduğu yazıyor; kod PASİF bir rafta
        kayıtlıysa ayrıca söyleniyor (pasif raf listede görünmüyor, kullanıcı
        göremediği bir kayıtla çarpışıyordu).
      Ölü sözlük anahtarları silindi: `Alim.siparisNoZatenKayitli`,
      `siparisNoCakisti`, `siparisNoZorunlu` — alım numarası artık sistem
      ürettiği için çakışma oluşamıyor.

- [x] ~~**Kayıt sonrası yeşil başarı bildirimi** — İlke #5~~ ✓ 12.08.2026
      Tek bileşen, ana yerleşimde: her ekranda AYNI yerde, AYNI görünümde.
      Sonuç adreste taşınıyor (), metin sözlükten çözülüyor;
      gösterildikten sonra parametre adresten siliniyor ki yenilemede
      hayalet mesaj çıkmasın. nin ikizi.

## Faz 4'te yeniden değerlendirilecek

- [ ] **Tarayıcı otomasyonu (Playwright)**
      Şu an projede yok. Bu yüzden CLAUDE.md'deki "dar viewport etkileşim
      testi" kuralını asistan tek başına uygulayamıyor; mobil doğrulamayı
      kullanıcı gerçek cihazda yapıyor. Bu fiili durum 08.08.2026'da
      resmileştirildi.
      Playwright kurulursa menü aç/kapa, navigasyon, form gönderimi ve
      diyalog akışları otomatik test edilebilir — mobil menü regresyonu
      gibi hatalar teslimden önce yakalanır.
      _Karar 08.08.2026: şimdilik yok, Faz 4'te tekrar bakılacak._

## Faz 4'te sıraya girecek

- [ ] **Toplu sevkiyat optimizasyonu**
      Günün bekleyen gönderilerini tek ekranda toplayıp sipariş başına en
      ucuz firmayı öneren atama ekranı — *"4'ü X, 5'i Y, 1'i Z"* görünümü.
      Toplama/paketleme akışıyla birlikte kurulacak.
      **Tarife verisi ve öneri mantığı Katman 1'den hazır olacak**: kargo
      tarifeleri (44.841 satır) ve satış formundaki "en ucuz firma önerisi"
      Faz 2'de yazılıyor; bu ekran onları toplu işe uygular.
      _Karar 09.08.2026._

- [x] ~~**İlk entegrasyon: kendi web sitesi kanalı**~~ → **DEĞİŞTİ 13.08.2026**
      Bu madde "Faz 4'ün ilk kanalı web sitesidir" diyordu. Karar
      değişti: web sitesi ~6 ay ertelendi, Faz 4'ün 1 numarası pazaryeri
      API'leri oldu. Güncel hâli için bkz. **Faz 4 — açılış bekliyor**
      bölümü. Özgün not (09.08.2026) tarihe bırakıldı.

- [ ] **Ürün görselleri**
      Faz 4'te pazaryeri/site API'lerinden çekilecek. Erken ihtiyaç
      doğarsa manuel yükleme öne alınabilir.
      _Karar 09.08.2026._

## Faz 3 tazminat migration'ına binecek

- [x] ~~**Tedarikçi kartı (Supplier modeli)**~~ — _Tamamlandı 10.08.2026 (`60f3800`)_
      Faz 3 migration'ına bindi. Mevcut serbest metin adlar ayrı bir veri
      taşıma migration'ıyla Supplier kayıtlarına eşlendi; `supplierName`
      sütunu korundu. Özgün not:
      Bugün alımda tedarikçi **serbest metin** (`Purchase.supplierName`).
      Faz 3'te hasarlı ürün iadesi ve tazminat takibi gelince tedarikçinin
      kayıt olması gerekecek. O migration'a binecek; mevcut serbest metin
      değerleri aynı gün Supplier kayıtlarına eşlenecek — geçmiş alımlar
      tedarikçisiz kalmayacak.
      _Karar 09.08.2026: ayrı migration açmaya değmez._

## Faz 3 — kalan parçalar

- [x] ~~**Kart borcu ekranı**~~ — _Tamamlandı 10.08.2026_
      `/kart-borcu`: kart başına ay ay ekstre dökümü, hangi alım hangi
      ekstrede, taksit kalemleri, bekleyen toplam ve kalan limit. Ayrı
      ekstre kaydı TUTULMAZ — alımlardan türetilir. Kesim günü girilmemiş
      kartta uyarı EYLEME DÖNÜK: kart düzenlemeye bağlantı verir.

- [x] ~~**Hakediş içe aktarma**~~ ✓ 12.08.2026
      `/hakedis` (bekleyen para) + `/hakedis/yukle` (rapor yükleme).
      İki okuyucu tek iç modele iniyor; denetle → önizle → onayla → tek
      transaction. Tekrar yükleme idempotent (satır anahtarı).
      Gerçek dosyalarla doğrulandı: 5 TY (298 satır) + 1 HB (539 satır).

- [ ] **HAKEDİŞ CANLI TEYİDİ — ilk gerçek eşleşen hakediş geldiğinde**
      Karşılaştırma SENTETİK veriyle yazıldı ve doğrulandı (hakedis:dogrula
      6. bölüm, 87 kontrol). Ama sistemin ürettiği "beklenen" rakam henüz
      GERÇEK bir ödemeyle karşılaştırılmadı: raporlar girilen satışlardan
      eski, örtüşen veri yok.
      İlk eşleşen hakediş geldiğinde ekrandaki "beklenen" ve "gerçekleşen"
      rakamları pazaryeri panelindeki tutarla ELLE karşılaştırılacak.
      Kart borcu teyidinin (2 Eylül ekstresi) ikizi — motor doğru
      görünüyor ama gerçekle bir kez yüzleşmeden "doğrulandı" denmez.
      _Karar 12.08.2026._

- [x] ~~**Beklenen vs gerçekleşen tutar karşılaştırması**~~ ✓ 12.08.2026
      Bugün "bekleyen para" yalnız ödeme tarihine bakıyor: ödenmemiş
      kalemler bekliyor/gecikti diye ayrışıyor. TUTAR karşılaştırması
      (kâr motorunun beklediği net hakediş ile rapordan geleni yan yana)
      HENÜZ YOK — `odemeDurumu()` EKSIK_ODEME/FAZLA_ODEME üretebiliyor
      ama ekran onu beslemiyor. Kâr motoru ile hakediş kalemlerini
      eşleyen bir hesap gerekiyor; sıradaki iş.

- [ ] **Eski hakediş içe aktarma notu (tarihe)**
      Pazaryeri hakediş raporundaki sipariş numaraları satışlarla eşleştirilir;
      eşleşmeyenler hata listesinde. Şema hazır (Settlement/SettlementItem),
      `payoutDays` alanı bekliyor.
      _Karar 10.08.2026: kullanıcı gerçek TY + HB hakediş raporlarını
      toplayınca, o raporların GERÇEK kolon yapısıyla yazılacak. Uydurma
      bir kolon şemasına göre yazmak boşa iş olurdu._

- [x] ~~**Tazminat ekranı — ALIM TARAFI**~~ ✓ 11.08.2026
      `/tazminat`: açık alacak özeti (para birimi başına, toplanmaz) ·
      talep bekleyen hasar listesi (mal kabuldeki `damagedQuantity`) ·
      satır içi talep açma diyaloğu (adet + tutar önerili, değiştirilebilir) ·
      satır içi durum değiştirme (Açık → Bildirildi → Kabul/Red → Tahsil) ·
      tedarikçi kartında açık alacak rozeti.
      "Açık alacak" = OPEN + CLAIMED + ACCEPTED. Kabul edilmiş ama parası
      gelmemiş talep HÂLÂ alacaktır; kapanma yalnızca SETTLED veya REJECTED.
      Aynı hasar iki kez talep edilemez (kalan adet düşülür).
      `tazminat:dogrula` (18).

- [x] ~~**Tazminat — İADE TARAFI**~~ ✓ 11.08.2026
      `Compensation.returnItemId` eklendi (salt ekleme, SetNull FK) ve
      yerel + CANLI uygulandı. Müşteriden hasarlı dönen iade kalemleri de
      "talep bekleyen hasar" listesine akıyor; talep listesinde "iadeden"
      rozeti ve satışa bağlantı görünüyor.
      Bir talep YA alım kalemine YA iade kalemine bağlanır, ikisine değil.
      İade tarafında tedarikçi DOLAYLI bulunur: varyantın en son alındığı
      parti. Aynı ürünü iki tedarikçiden aldıysanız bu bir TAHMİNDİR —
      iade kaydı FIFO partisini bilmez. Form tedarikçiyi bu yüzden
      değiştirilebilir gösterir.

- [x] ~~**Kimlik standardı paketi — PARÇA 1 (temel)**~~ ✓ 10.08.2026
      Kararlar: SKU tireli `OYU-LG-260707-01` · alım no `ALM-ER-260810-01`
      sistem üretir, elle giriş kapalı · SKU = Firma SKU (aynı değer) ·
      hareket görmüş üründe kod kilitli · paket Faz 3 ekranlarından ÖNCE.
      Teslim: migration (Kategori.code, Supplier.code, Purchase.supplierOrderNo)
      · `src/lib/kimlik.ts` motoru · `kimlik:dogrula` (54) ·
      `migration:kontrol` harf bekçisi · kategori ekranında Kod alanı.

- [x] ~~**Kimlik standardı — PARÇA 2 (tedarikçi ve alım numarası)**~~ ✓ 11.08.2026
      `/ayarlar/tedarikciler` ekranı (kod zorunlu, "Öner" düğmesi) · alım
      formunda seçim kutusu + akış içi mini ekleme diyaloğu · `supplierId`
      ARTIK GERÇEKTEN YAZILIYOR · alım numarası sistem üretiyor
      (ALM-HE-260811-01), kod alanı formdan kalktı · Tedarikçi sipariş no
      alanı · arama sonuçsuzken "Yeni ürün oluştur" (yeni sekmede).
      Eski kayıtlar: düzenlemeye girildiğinde `supplierName` ADA GÖRE
      eşleştirilip ön seçiliyor. Alım numarası düzenlemede DEĞİŞMEZ.
      `alim-no:dogrula` (8) — canlıdaki serbest kodlar sayaca karışmıyor.

- [x] ~~**Kimlik standardı — PARÇA 3 (ürün kodları, raf, mükerrer)**~~ ✓ 11.08.2026
      SKU "Öner" (SKU = Firma SKU, F- öneki yok) · hareket görmüş üründe iki
      kod da kilitli — ekranda sebebiyle, sunucuda ayrıca reddediliyor ·
      raf deseni ekranda zorlanıyor + GÖZ AÇILIR LİSTEDEN seçiliyor
      (A5 + 3 → A5-3, düzenlemede geri ayrılıyor) · biçim dışı raflarda
      rozet + toplu uyarı · raf birleştirme aracı (önizle → onayla → yaz;
      ledger'a dokunmuyor) · kod çakışması eyleme dönük (barkod + SKU +
      Firma SKU: hangi üründe + "Ürüne git" + "Bu ürüne alım ekle") ·
      ad+marka benzerlik sorusu (engel değil, sorgu; "farklı ürün — devam
      et" aynı formu onay bayrağıyla yeniden gönderiyor) · içe aktarmada
      UYARI KANALI (hatadan ayrı, yüklemeyi durdurmuyor).
      `enYakin` + Levenshtein `src/lib/benzerlik.ts` ortak modülüne taşındı.
      `kimlik:dogrula` 71 kontrol (7. bölüm benzerlik).
      NOT: raf deseni `[A-Z]-d{2}(-d)?` DEĞİL — canlıdaki 40 rafı
      geçersiz sayıyordu, 11.08'de depoya uyduruldu (bkz. yukarısı).

- [x] ~~**Kimlik kodu türetme — mevcut kayıtlar**~~ ✓ 11.08.2026
      Kullanıcı tamamladı. Canlıda 14 kategorinin ve 8 tedarikçinin
      hepsinde kod var (GEN/IST/SUP/KIT/ELK/KUC/OYU/KAM/BIL/KNS/TEL/MUT/
      KOZ/DIS · AMZ/HB/TR/NON/TEK/MDIA/VTN/BI).

## Faz sırasına göre zaten planlı olanlar

Bunlar eksik değil, sırası gelmedi (bkz. CLAUDE.md → Faz sırası):

- Hasarlı ürünün satıcıya iadesi ve tazminat süreci → Faz 3
- Stok hareketlerinde "kim" bilgisi (kullanıcı/kimlik doğrulama) → Faz 4
- Kredi kartı borç ve ekstre takibi → Faz 3
- Kanal komisyon kuralları ve net kâr hesabı → Faz 2

## Tek ekrana sığmayan diğer listeler — ölçülecek

- [ ] **Geniş kalan liste ekranları (kullanıcı kuralı: sayfa sağa sola gitmez)**
      _Karar 14.08.2026._ Alımlar, Satışlar ve Ürünler tek ekrana sığdırıldı
      (sütunlar iki satırlı hücrelere bindi, bkz. `components/iki-satir.tsx`);
      ölçüm: 1232→859px · 1122→874px · 1189→802px, bütçe 1045px.
      **Sırada bakılacaklar (sütun sayıları, tek tablo değil sayfa toplamı):**
      hakediş 24 · iadeler 22 · envanter değeri 12 · stok 9 · kartlar 9 ·
      giderler 9 · ayarlar/kanallar 9.
      Bunların bir kısmı sayfada birden fazla tablo olduğu için yüksek
      görünüyor; **önce ölç, sonra dokun.** Ölçüm yöntemi hazır: gerçek
      metin uzunluklarından piksel tahmini (`veri/ozel/` altındaki geçici
      betik kalıbı) + `yerlesim:dogrula`nın sütun bütçesi bölümü.
      Bekçi bugün yalnız o üç ekranı tutuyor; buradakiler düzeltildikçe
      listeye eklenecek.

## DESTEK MODÜLÜ — VİZYON: ÇİFT YÖNLÜ İLETİŞİM KANALI

_Mimar sözleşmesi 16.08.2026._ Destek modülü **bugünün Telegram kaosunu
çözmekle sınırlı değil — ürünün KALICI destek kanalı.** Çok kullanıcıya
geçince kullanıcı ↔ yapıcı iletişimi buradan akmalı; her firmayla ayrı
Telegram yürütmek imkânsız.

**KURGU (16.08.2026 düzeltmesi):**
`TALEP AÇAN` → müşteri firma (AXCALI, ileride başkaları) ·
`TALEP ÇÖZEN` → geliştirici (`destek.yonet`)

### Faz 1 — YAZILDI (tek yönlü + durum)

Kullanıcı talep açar → yapıcı durum + çözüm notu verir → kullanıcı okur.
Karşılıklı konuşma YOK.

### Faz 2 — talep bir MESAJ DİZİSİ taşır

- **Kullanıcı → yapıcı:** hata/istek (mevcut) + sonradan mesaj ekleyebilir
- **Yapıcı → kullanıcı:** çözüm + soru ("şunu netleştir") + ara güncelleme
- **Kullanıcı → yapıcı:** yanıt ("hâlâ olmuyor", "oldu teşekkürler")
- `TalepMesaj` tablosu: `talepId · gonderenId · gonderenTipi
  (MUSTERI/GELISTIRICI) · metin · ek · zaman`
- Yeni yanıt bildirimi: çanla mı ayrı mı — **Faz 2'de karar**

### FAZ 1 MİMARİSİ FAZ 2'YE HAZIR — kısayol yasak

**DURUM İLE MESAJ AYRI KALIR.** Durum "NEREDE" der (YAPILIYOR), mesajlar
"NE KONUŞULDU" der. Karışsalardı Faz 2'de mesaj eklemek durumu
değiştirmek zorunda bırakırdı. `talep:dogrula` bunu ayrıca tutuyor.

**`cozumNotu` → `TalepMesaj[]` GÖÇÜ TEMİZ OLMALI, YENİDEN YAZIM DEĞİL:**

```sql
INSERT INTO TalepMesaj (talepId, gonderenId, gonderenTipi, metin, createdAt)
SELECT id, bildirenId,       'MUSTERI',     aciklama,  createdAt       FROM Talep;
INSERT INTO TalepMesaj (talepId, gonderenId, gonderenTipi, metin, createdAt)
SELECT id, cozumNotuYazanId, 'GELISTIRICI', cozumNotu, cozumNotuZamani  FROM Talep
  WHERE cozumNotu IS NOT NULL;
```

⚠ **BU SELECT İLK TESLİMDE ÇALIŞMAZDI.** Notun YAZARI ve ZAMANI
tutulmuyordu; o hâliyle göç yeniden yazım olurdu. `updatedAt` işe
yaramaz — her durum değişikliğinde ezilir ve notun yazıldığı anı değil
kaydın en son dokunulduğu anı söyler. `cozumNotuYazanId` +
`cozumNotuZamani` bu yüzden **Faz 1'e eklendi** (16.08.2026) ve testle
kilitlendi. _Vizyonu kaydetmek yetmez; bugünkü yapının o vizyona
gerçekten evrilip evrilmediği AYRICA sınanır._

**`companyId` zaten eklendi** → Faz 2'de her firmanın kendi konuşması
izole; izolasyon o zaman GERÇEK olur.

**`gonderenTipi` baştan düşünüldü:** Faz 1'de not hep GELİSTİRİCİ'den
gelir (yalnız `destek.yonet` yazabiliyor), Faz 2'de iki taraf yazar.

_EUR ve uyarı-erteleme ile aynı ilke: mimari genişlemeye hazır, içerik dar._

## ⛔ ENGELLEYİCİ ÖN ŞART — SAĞLAYICI / FİRMA AYRIMI

_Mimar kararı 16.08.2026, teşhis raporu sonrası._

> **İKİNCİ `Company` KAYDI AÇILMADAN ÖNCE sağlayıcı/firma ayrımı KURULUR.**

### Teşhis — neden engelleyici

Kullanıcı sezgisi doğruydu ama kırık daha derinde çıktı:

- **"Sağlayıcı" diye bir kavram sistemde HİÇ YOK.** `saglayici` · `isProvider`
  · `isGlobal` · `superAdmin` — kod tabanında sıfır eşleşme.
- **Roller GLOBAL.** `Role`de `companyId` yok, `name @unique`. Firma bilgisi
  yalnız `UserCompanyRole`da yaşıyor; rolün kendisi ve izinleri firma-üstü.
- **40 modelin yalnız 3'ünde `companyId` var** (`UserCompanyRole`,
  `AuditLog`, `Talep`). Ürün, alım, satış, stok, kart — hiçbiri firma
  taşımıyor.
- `/ayarlar/roller` ve `/ayarlar/kullanicilar` firma süzgeci UYGULAMIYOR;
  yeni kullanıcı **"ilk aktif firmaya"** bağlanıyor; `yetkiBaglami`
  **ilk üyeliği** alıyor.

İkinci firma açıldığında sızan yalnız talepler değil, **her şey** olur.

### Neden BUGÜN kurulmadı

**Kısmi izolasyon, izolasyon değildir.** Bugün kurulsaydı yalnız
taleplerde izolasyon olurdu; ikinci firmanın sahibi taleplerini göremezken
bütün ürün/satış/kâr verisini görmeye devam ederdi — bu, izolasyon
sanılan bir yarım önlemdir ve yanlış güven verir.

### Kapsam — çok-firma veri katmanının İLK MADDESİ

`companyId` yayılımından **ÖNCE** yapılır: kimin neyi gördüğü, yayılımın
tasarımını belirler.

- `User.isSaglayici` (ya da firma-üstü üyelik kaydı)
- **İzin çözümü iki düzleme ayrılır:** firma izni / sağlayıcı izni
- `SONRADAN_DOGAN` sağlayıcı izinlerini firma rollerine dağıtmaz ✓ _(bugün
  yapıldı, aşağıya bak)_
- Rol ve kullanıcı ekranlarına firma süzgeci
- Yeni kullanıcının "ilk aktif firmaya" bağlanması düzeltilir
- `yetkiBaglami` çok üyelikte firma seçimi (oturumdaki aktif firma)
- **Talepler tarafı HAZIR** — yalnız `destekVerir`in kaynağı değişir

### ✅ BUGÜN TAKILAN SİGORTA (16.08.2026)

Kavram kurulmadı ama **en keskin uç köreltildi**: sağlayıcı izinleri artık
hiçbir role OTOMATİK dağıtılmıyor.

- İşaret iznin TANIMINDA: `{ anahtar: "destek.yonet", saglayici: true }`
- `SAGLAYICI_IZINLERI` / `FIRMA_IZINLERI` tek kaynaktan türer
- `otomatikDagitilacak()` **saf fonksiyon** — seed'e gömülmedi ki test
  görebilsin
- **ÇİFT KATMAN:** izin `SONRADAN_DOGAN`a yanlışlıkla yazılsa bile
  `saglayici` işareti onu tekrar eler. Tek katman olsaydı listeye ekleyen
  kişi sigortayı farkında olmadan delerdi.
- **Bekçi aynı ölçütü kullanır** (`FIRMA_IZINLERI`) — iki yerde iki ölçüt
  olsaydı her tam yetkili rol kırmızı yanar, bekçi görmezden gelinen bir
  alarma dönerdi.
- **Bekçi neyi ölçmediğini YAZAR:** _"ölçüt DIŞI (sağlayıcı düzlemi,
  otomatik dağıtılmaz): destek.yonet"_. Sessiz hariç tutma, altı ay sonra
  cevapsız bir soru bırakırdı.

Mevcut roller korunur (izin elle verilmişti): CEO ve Sahip `25/25 tam
yetkili + SAĞLAYICI`. Yarın açılacak tam yetkili bir firma rolü —
**ikinci firmanın sahibi dahil** — bunu kendiliğinden ALMAZ.

`yetki:dogrula` 25 → 34. Dört mutasyonla doğrulandı.

_Bu turda ÜÇÜNCÜ yalancı yeşil kalıbı yakalandı: `?.[0]` isteğe bağlı
zinciri yüzünden desen hiç eşleşmediğinde kontrol yeşil yanıyordu. Ortak
kök hep aynı: **kontrol, aradığını bulamadığında başarılı sayılmamalı.**_

### ✅ DESTEK / TALEP MODÜLÜ FAZ 1 — KAPANDI 17.08.2026

Halil testi geçti (Kapandı: kutu kayboldu + çan söndü · Mobil: taşma yok,
süzgeçler basılabilir, otomatik bilgi katlanmış). Mimar onaylı.

**Teslim edilen:** Bildir düğmesi (her ekranda, izinsiz) → talep + otomatik
bağlam (görünür, katlanmış) + ekran görüntüsü (polimorfik `Attachment`,
yeni altyapı yok) · `/talepler` + durum akışı (son duraklar tek yön,
`COZULDU → YAPILIYOR` serbest) · çözüm notu yazar + zaman damgalı ·
`companyId` firma izolasyonu kodda hazır (tek firmada etkisiz, bilinçli) ·
`destek.yonet` sigortası · çan uyarısı (cevapsız talep).

**FAZ 2 EVRİLEBİLİRLİĞİ ÜÇ PROVAYLA KANITLANDI** — son ölçüm: 2 mesaj
(MUSTERI 1 · GELISTIRICI 1), kurulamayan 0. Göç temiz `INSERT … SELECT`.

**DÖRT KUSUR, DÖRDÜ DE YALNIZ GERÇEK VERİYLE ÇIKTI.** Hiçbirini tsc, lint
ya da mevcut testler göremezdi:
1. `destek.yonet` canlıda HİÇBİR rolde yoktu → durum kontrolü hiç çizilmedi
   (yetki iki bacaklı; `canli:yetki` koşulmamıştı).
2. Bağlam kutusu ham user-agent'ı formun ortasına seriyordu → katlandı.
3. Not alanı EYLEM DÜĞMESİNDEN SONRA duruyordu → kullanıcı görmeden
   kaydetti, not sessizce boş kaldı.
4. Not, DURUM DEĞİŞİKLİĞİNE BAĞIMLIYDI. `COZULDU`dan çıkış talebin anlamını
   değiştirdiği için "çözdüm, açıklamasını yazayım" demek İMKANSIZDI.
   **Sözleşme "durum nerede der, mesaj ne konuşuldu der" diyordu — kural
   YAZILIYDI, uygulama onu TUTMUYORDU.**

> **DERS:** Kuralı yazmak, kuralın uygulandığını göstermez. Sözleşmedeki
> her ayrım için "bu ayrım ekranda gerçekten yaşıyor mu?" ayrıca sorulur.

`talep:dogrula` 84 kontrol.

**FAZ 2 (sırada değil):** `TalepMesaj` thread'i (göç hazır) · dış bildirim ·
uyarı erteleme.

### ✅ GEÇMİŞ VERİ AKTARIMI — KAPANDI 17.08.2026

Halil testi gerçek Excel ile geçti, mimar onaylı. **Nakit tarihi 2025
Mayıs'a uzandı:** 16 ay × 10 kart beyan ekstresi sistemde, parti damgalı
(`iceAktarimKodu`), geri alınabilir.

Canlı ölçüm — kuru prova ile BİREBİR tuttu: `106 okundu · 10 kart · 4
atlandı` → `89 yazılacak · 17 çakışma (TÜRETİLEN kazandı)`.

**KAPSAM KÜÇÜLDÜ:** hakediş sayfası düştü — dosyada geçmiş hakediş yok,
yalnız cari Tem-Ağu 2026 var ve o dönem sistemde zaten 651
`SettlementItem` olarak duruyor. Aktarmak çift sayım olurdu; girişte
engellendi.

**ÇİFT AKTARIM KİLİDİ KANITLI:** ikinci yükleme SIFIR yazdı (89 "daha
önce aktarılmış" + 17 "türetilmiş var" = 106).

**GÜN EŞLEŞTİRMESİ KULLANILMADI** — ölçüldü, 10 karttan 4'ünde yanlıştı ve
biri SESSİZCE: "Akbank ( Hasan Akçalı Ayın 7 )" sistemde ayın 7'si olan
"S.ahmet Garanti"ye gidiyordu. Banka+sahip eşleşmesi 10/10 tuttu, yine de
her kart GÖREREK onaylandı.

`gecmis:dogrula` 116 kontrol.

---

- [x] ~~**ÜRÜN KÂRLILIK KARTI — ALIM KARARI ARACI**~~ ✓ KAPANDI 17.08.2026 —
      Halil testi geçti (5 madde), mimar onaylı.
      _Kapanışta iki canlı hata bulunup düzeltildi: (1) tedarikçi görünmüyordu
      — `Purchase` tedarikçiyi iki alanda taşıyor (`supplierId` ilişkisi ve
      `supplierName` serbest metin), kart yalnız birini okuyordu; kural
      `lib/tedarikci-adi.ts`te tek yere alındı. (2) tam eşleşmede fazladan
      tıklama — kural yalnız kamera yolundaydı, klavye yolu tek elemanlı liste
      gösteriyordu; karar `lib/kart-arama-karari.ts`te tek yere alındı._
      _Sözleşmenin \"görsel varsa\" maddesi YAPILAMADI: şemada ürün görseli
      alanı yok. Görsel istenirse ayrı iş (şema alanı + yükleme + depolama)._
      _Adet dilimi ve iptal ekranı bu paketin parçası DEĞİL; kendi
      kalemlerinde._

      Aşağıdaki sözleşme metni tarihe kaldı:

      **KULLANIM SENARYOSU:** mağazada, alım öncesi, telefonla barkod okut →
      "bu ürünü alayım mı" kararının tüm verisi TEK BAKIŞTA. Ekran mobil
      öncelikli tasarlanır; masaüstü ikincildir.

      **ARAMA:** barkod / SKU / ad ile yazarak VEYA **kamerayla okutarak**.
      Mevcut `components/barkod-okuyucu.tsx` buraya da bağlanır — ikinci bir
      okuyucu YAZILMAZ.

      **KART İÇERİĞİ (tek ekran):**
      - Kimlik: ad · barkod · firma SKU · görsel varsa
      - Satış geçmişi: kaç kez · toplam adet · son satış · hangi kanallar
      - Kârlılık: ortalama NET-2/adet · marj% · sermaye verimi (kâr/maliyet)
        · en son satışın NET-2'si
      - Maliyet: son alım maliyeti (FIFO) · ortalama maliyet · son alım
        tarihi ve tedarikçi
      - Risk: iade var mı (kaç, sebep) · `NO_COST` geçmişi · zarar eden
        satış var mı
      - Stok: eldeki adet · yaş (61+ gün rozetli) · raf konumu
      - **HIZ: alımdan satışa ortalama gün** — sermaye dönüş hızı
      - **ÜRÜN SİSTEMDE HİÇ YOKSA:** "kayıtlı değil — yeni ürün" der
        (sessiz boş DEĞİL) + "yeni ürün olarak ekle" bağlantısı

      **TAAHHÜTLER:**
      - Rakamlar NET-2 motorundan ve FIFO'dan okunur — **kopya hesap YOK**
      - Sessiz varsayım yok: maliyeti bilinmeyen "?" ile gösterilir; **tek
        satışlık marj "tek satış" uyarısıyla** verilir (marj tek başına
        yanıltır)
      - Renk sistemi: kârlı yeşil · zararlı kırmızı · bekleyen amber
      - Erişim: ürün analizi sekmelerine arama kutusu · ürünler ve stok
        ekranlarından karta bağlantı · panele hızlı arama (değerlendirilecek)
      - Dokunma hedefi 44×44 px; kart tek elle kaydırılabilir, kamera
        düğmesi büyük ve erişilebilir

      **YETKİ — KART İKİ PARÇADIR:** kimlik + stok herkese açıktır,
      **kârlılık `satis.kar.gor` iznine bağlıdır.** Operasyon rolü kartı
      açar, ürünü ve stoğunu görür, kâr bölümünü GÖRMEZ.

      > Bu, kartın tasarımını belirler: kâr bölümü sonradan gizlenen bir
      > kutu değil, **izinsiz kullanıcıya hiç render edilmeyen** bir bloktur.
      > Gizli kutu, sunucudan gelen veriyi tarayıcıya taşır; izin ölçütü
      > sunucuda uygulanır — rakam hiç yola çıkmaz.
      > Kâr bölümü izin yüzünden yoksa ekran **neden yok olduğunu yazar**
      > (sessiz boşluk yasağı, Kullanıcı Kolaylığı #5).
| K12 **[İPTAL]** | ~~HB bölünmüş paket taraması~~ | ⛔ **İPTAL 20.08.2026 — ÖLÇÜMLE, YAZILMADAN.** Betik yazılmadı çünkü sonucu peşinen belliydi ve **yanıltıcı olurdu.** `paketSayisi` alanı `20260820120000_bolunmus_paket` ile **BUGÜN** doğdu, `Int @default(1)`. Ölçüldü: 14 HB satışının **14'ünde de `1`** (NULL imkânsız, kolon NOT NULL). Tüm kanallarda `paketSayisi>1` olan tek satış var, o da TY (`11361665302`). Yani "HB'de bölünmüş paket yok" çıktısı **HB hakkında hiçbir şey söylemezdi** — alanın doğum tarihinden önceki sessizlik veri değildir. Ayrıca 13 satırlık CSV dosya açmayı hak etmiyor. **YENİDEN AÇILMAZ:** alan artık dolduğuna göre soru kendiliğinden ölçülebilir hâle gelecek; H8'in kapanış şartı zaten eylül ekstresi. |
| K14 | **Kanal eşleştirme deseni envanteri** | ✅ **KAPANDI 20.08.2026 — envanter, düzeltme YAPILMADI.** `kanalAdi` bir DB alanı DEĞİL; `kart-verisi.ts:105`'te türetilen gösterim dizisi. Gerçek kolon `Channel.name` ve **YALIN** (11 değer, TY dahil) → `where:{channel:{name:"Trendyol"}}` deseni **GÜVENLİ**, 5 betikte kullanımda. ⚠ **DESEN KAPANMADI, SESSİZ:** doğru tarif dar değil geniş — *sunum katmanında üretilen bir şeyin veri sanılması.* Türetilmiş dizi üreten **7 yer** envanterde, hepsi **id ile anahtarlı**; bugün hiçbiri tetiklenmiyor. ⚠ **"İkinci örnek yok" kaydım DÜZELTİLDİ:** `canli-komisyon-envanter.ts:55` kuzeni — kanal adına gömülü sabit sözlük, eşleşmezse **SESSİZCE BOŞ**. K13b'yi sonucun imkânsızlığı yakaladı; bunun boş dönüşü **makul görünür**. Düzeltilmiyor (iş değeri yok). **AÇILIŞ ŞARTI: kanal adının düzenlenmesi.** |
| K14t | **TUZAK — hesap ADLA bulunuyor** | 🕓 **DÜZELTİLMİYOR, AÇILIŞ ŞARTIYLA.** `panel.ts:251` hesabı adla buluyor. Hesap adları kanallar arası harf farkıyla tekrarlıyor (`S.Ahmet`/`S.ahmet`/`s.ahmet` · `AXCALI`×3 · `SEDA`×3). **Bugün güvenli:** arama kanal İÇİNDE ve tek kanalda çakışan ad yok. **AÇILIŞ ŞARTI:** tek bir kanala harf farkıyla ikinci hesap açılması — MySQL harf duyarsız karşılaştırması o an ikisini birleştirir. |
| K15 | **KAPSAM SORUSU #1 — KAPANDI, cevap DEĞİŞTİ** | ✅ **ÖLÇÜLDÜ 20.08.2026.** Soru: K9'un iki tarafı aynı kapsamı mı ölçüyor? **Mimarın ön kararı "BÜYÜKLÜK GEÇERSİZ" idi; ölçüm dayanağını kaldırdı.** ① Rapor dosyası `seller_**870249**`. ② `ChannelAccount.externalId` alanı var ve **`AXCALI.externalId = "870249"` — birebir aynı.** ③ TY'nin **tek SATIŞ hesabı var** (AXCALI); `s.ahmet` ve `SEDA` **ALIŞ** hesapları (`satisIcin=false`, `externalId=null`) ve K11a'da **0 satış**. **SONUÇ: iki taraf da AXCALI — kapsam KARIŞMIYOR, büyüklük cümlesi KURULABİLİR.** Kurulacak cümle: _"geniş pencerede rapor 227 adet, sistemde 9 — fark 218."_ ⚠ Ama **"64 adet eksik" yine kurulamaz**: o, dar pencerenin (72−8) sayısıydı ve geniş ölçüm onu aştı. |
| — | **PANO DİSİPLİNİ (kural, 20.08.2026)** | Bir kalemin **durumu** üç ayrı etiketle yazılır, niyetiyle karıştırılmaz: **[KOMUT]** verildi ama taşınmadı · **[YAZILDI]** betik var, koşmadı · **[KOŞTU]** ölçüm yapıldı. _Sebep: `K11a-rev` ve `K12-rev` panoda "Claude Code'da" yazılıydı; `scripts/` altında YOKLARDI. Var olmayan betiğe "koşmasın" emri verildi._ **Pano, işin DURUMUNU değil NİYETİNİ kaydederse zamanla kurgu üretir.** |
| K16 **[KOŞTU]** | **SİPARİŞ DÖKÜMÜYLE EŞLEŞTİRME — en temiz kapsam ölçümü** | ✅ **20.08.2026 gece.** Kaynak: `Komisyon Oranlari/kkk/` → TY sipariş dökümü `01.08–20.08` (144 kalem · **143 tekil sipariş** · 147 adet · `01.08 02:09 → 20.08 13:20`). 🔴 **SİPARİŞ NUMARASIYLA BİREBİR EŞLEŞTİRME — barkod, pencere, alt küme tartışması YOK: EŞLEŞEN 38 · RAPORDA VAR BİZDE YOK 105 · BİZDE VAR RAPORDA YOK 2.** Kapsam **%27**. Bu, `227/9`'dan daha güçlü: rapor tarafı **alt küme değil**, dönemin TÜM siparişleri; iki taraf da aynı hesap ve aynı pencere. **BİZDE FAZLA olan 2 kayıt:** `sfsfsf` (bilinen test satışı, iptali bekliyor) ve 🔴 **`115180181780` — SİPARİŞ NO YAZIM HATASI**: dökümdeki gerçek numara **`11518018178`** (11 hane), bizimkinde sonda fazladan bir `0` var (12 hane). Gerçek bir sipariş, yanlış numarayla girilmiş. |
| H20 | **`soldAt` saat taşımıyor** | ✅ **VERİ GELDİ — TY sipariş dökümü SAAT TAŞIYOR (144/144).** K9'un hüküm veremediği iki sınır kalemi çözüldü: `11475234462` → **04.08.2026 17:04**, `11518039572` → **18.08.2026 20:58**. **İkisi de 08:00 SONRASI → YENİ tarife penceresi.** Tarife pencereleri `08:00→07:59` olduğu için sınır belirsizliği bu iki kalemde **kalktı.** ⚠ Şemaya saat ALINMADI (ölçüm penceresi); alınacaksa ayrı karar. |
| H8 | **HB hizmet bedeli** | 🕓 **YENİ VERİ, SORU KAPANMADI.** HB sipariş dökümü (`03.08–15.08`, 51 kalem / 51 sipariş): **çok paketli sipariş 0** — bölünme örneği yine yok. `Hepsiburada Limiti Hizmet Bedeli` kolonu **51/51 satırda `0,0000`**. ⚠ **AMA BU KOLON EKSTREDEKİ `Hizmet bedeli` İLE AYNI ŞEY OLMAYABİLİR** — adı farklı ("Limiti" var) ve kolon başlığı bir iddiadır, kimlik değil. Ekstre ölçümüyle (99 siparişin 14'ünde ₺12,60) **tutarlı** ama onu **kanıtlamaz**. Kapanış şartı değişmedi: eylül ortasındaki HB ekstresi. |
| K17 | **TY'de yeni bölünmüş paket örneği** | 🕓 **KAYIT.** TY dökümünde 143 siparişin **1'i iki paketli**: `11522079868` · 20.08.2026 09:29 · 2 adet. `SABIT_GIDER` zaten `PER_PACKAGE`'a taşınmıştı; bu, taşımanın karşılığı olan **ikinci** gerçek vakadır. İş açılmadı. |
| — | **ÖLÇÜM ANI (kural, 20.08.2026)** | Rapor tarafı **DONMUŞ** (üretim damgası dosya adında), sistem tarafı **AKIYOR**. Aynı gün iki koşum: eşleşen `8→9`, fark `219→218`, ciro `₺751.583→₺747.024`. **Her kıyasta İKİ damga yazılır:** rapor üretim anı + sistem okuma anı. `canli:oran-denetimi` bunu artık kendiliğinden basıyor; damga yoksa **"donmuş kaynağın anı bilinmiyor"** diyor. _Beşinci kapsam sorusunun doğrudan uygulaması._ |
| H21 | **Pano bölünsün mü — aktif / arşiv?** | 🕓 **AÇIK SORU, cevap mimarın.** `BEKLEYENLER.md` 7022 satırdı = belge iki kez (3514+3508); düzenlemeler yalnız 1. kopyaya işliyordu. Diff'le B'ye özgü **0 satır** doğrulandı, 3512 satır silindi, **bilgi kaybı yok.** ⚠ **Kopyanın fark edilmesi TESADÜFTÜ** — 3.500 satırda bozulma görünmez. Soru: üst pano tek ekrana sığacak şekilde **aktif/arşiv ayrılsın mı?** Cevap "sonra" ise **öyle yazılacak.** |
| — | **AŞAMA 3 — GEREKÇE TAMAM** | ✅ Altı ölçüm; sonuncusu tartışmasız. **EN GÜÇLÜ CÜMLE:** _tüm TY defterimiz `43` brüt adet (01.06–20.08, HER TÜR satış); rapor YALNIZ indirimli komisyon ALT KÜMESİNDE `227` diyor. Her satışımız raporda olsa bile `184` eksik kalırdı._ Alt küme üst kümeden büyük olamaz — hesap/pencere/birim tartışmasından bağımsız. → **"gecikme mi kayıp mı" akademikleşti:** girişin ~%80'i yoksa buna gecikme denmez. ⚠ Mimar düzeltmesi: _"keşif ağustosta bitmez"_ **yanlıştı** — gerekçe ölçüme bağlıydı ve bitti; keşif (TY API uçları, yetkilendirme, sınırlar, salt-okuma kapsamı) ağustosun kapanmasına bağlı DEĞİL. **Aşama açma kararı Halil'de.** Beklemeye devam eden: **H3** (~20.09) ve ona kilitli Aşama 2. |
| K11a-b **[KOŞTU]** | **Dört ürün BARKODLA** | ⚠ **İPTAL KARARI GELDİĞİNDE ZATEN KOŞMUŞTU** (20.08 gece). Halil'e barkod istemi **hiç gitmedi** — barkodlar K9 kaynak raporunun `Barkod` kolonundaydı, maliyeti sıfırdı. **İptal gerekçesi geçerli:** `218`/`₺747K` değişmedi, karar aynı. **Ama iptalde öngörülmemiş bir bulgu çıktı:** 🔴 **BARKOD AYRIMI — rapordaki Soundcore Q21i `194645027819` sistemde HİÇ YOK;** sistemde adı Q21i geçen tek varyantın barkodu **`194644037819`**. K11a'nın "1 adet Q21i" bulgusu **başka bir kaydı** sayıyordu. Diğer üçü: OneBlade `8720689013949` ve Karaca Burby Wood `8683650111184` → **(c) ürün tanımlı + kanal-SKU aktif + satış YOK = giriş eksikliği**; Philips `8720689047586` → 3 satır, ağustos. Dördünde de başka kanalda satış yok. **Kalsın mı düşülsün mü — mimar kararı.** |
| — | **K11a ZERO'LARI ARTEFAKT DEĞİLDİ** | ⚠ **Mimar endişesi ölçümle düştü.** OneBlade sistemde `"Qp2824/10 Oneblade…"`, Burby `"Karaca Burby Wood…"` adıyla kayıtlı — K11a'nın desenleri (`/QP2824/i`, `/burby/i`) bu adlarla **eşleşirdi.** Sıfırın sebebi desen değil, **satırın hiç olmamasıydı** (K11a yalnız SATIŞ satırları arasında arıyordu). Yani zero'lar gerçekti; eksik olan **kategori bilgisiydi** ve K11a-b onu verdi. Kural yine de geçerli: kimlik varken dizeyle aranmaz. |
| K11a **[KOŞTU]** | **Sistem tarafı TY satış sayımı** | ✅ **20.08.2026, hesap kırılımlı.** `canli:k11a-sayim` · salt okuma · CSV `raporlar/` (gitignore). Dönem 01.06–20.08. **K14 ENDİŞESİ ÖLÇÜMLE DÜŞTÜ: TY'nin 3 hesabı var ama satışların TAMAMI `AXCALI`'da** (`s.ahmet` ve `SEDA` → 0 satış). Yani K9'un hesap ayrımı yapmaması `227/8` kıyasını BOZMUYOR. 🔴 **ASIL BULGU AYLIK KIRILIMDA: haziran 1 kalem · temmuz 1 kalem · ağustos 38 kalem.** Ve haziran/temmuzdaki ikisi de **tamamen iade** (net 0) — yani **kapanmış iki ayda sistemde fiilen TY satışı YOK.** Ağustos (dolmakta) brüt 41 · net 38. Taranan 43 kalem, iptalli 3 elendi, barkodsuz 0, iadeli 5 kalem. **İzlenen dört ürün:** OneBlade QP2824 **0** · Burby Wood **0** (K9'un `14/0` ve `10/0`'ıyla tutuyor) · Philips 5000 10in1 **3** (rapor 12 — KISMİ, eşleşme kuruluyor ama eksik) · Soundcore Q21i **1** (rapor 6). |
| K13 **[KOŞTU]** | **HIZMET_BEDELI'nin payı** | ✅ **20.08.2026, iki paydayla.** `canli:k13-pay` (fiyat) · `canli:k13b-marj` (marj), ikisi de salt okuma. **FİYAT payı:** A n=11 ortanca %0,32 max %1,29 · B n=28 ortanca %0,45 max %1,94 → "önemsiz". **MARJ payı (NET-2, fiyat kartıyla AYNI motor):** **A n=8 ortanca %3,38 max %5,54 · B n=15 ortanca %6,00 max %15,18.** 🔴 **PAYDA CEVABI TERSİNE ÇEVİRDİ — aynı ₺12,60 fiyatın binde 3'ü ama marjın onda biri.** ⚠ Kuralı motordan ÇIKARIP ölçülen GERÇEK etki daha düşük (A max %4,41 · B max %11,23); fark **KDV mahsubu** — `12,60/NET-2` oranı etkiyi ~%20 ABARTIYOR. **DURMA ŞARTI (marjın 1/10'u):** A'da sağlanıyor (max %5,54), **B'de SAĞLANMIYOR** (2 ürün %10 üstü) — B vekil fiyattır, hüküm mimarın. Kesişim **29** (fiyatlı 39 ∩ maliyetli 60); ⚠ maliyet AÇIK PARTİDEN gelir, tükenmiş ürün giremez. **Orana karıştırılmadı:** marj ≤ 0 → **6 ürün**, fiyat < maliyet → 0. ⚠ K13'ün %2 eşiği ve ondan türeyen ₺630 sınırı **uydurulmuştu**; K13b'de eşik KONMADI. |
| K13c | **HB'de zararına duran 6 ürün** | 🕓 **YAN BULGU 20.08.2026, K13b'den.** Bugünkü fiyat + açık parti maliyetiyle NET-2 **negatif**: Philips 5000 10in1 (−46,11) · LEGO 101 Dalmaçyalı (−301,77) · LEGO Endgame (−289,07) · Hogwarts Şatosu (−25,68) · LEGO "Yukarı Bak" (−291,92) · Hot Wheels Rhino (−58,13). Bunlar orana karıştırılmadı, **ayrı duruyor.** İş açılmadı — fiyat mı maliyet mi yanlış, önce bakılır. |
| — | **ŞEMA BULGUSU (kayıt, iş değil)** | Sistemde **"güncel satış fiyatı" alanı YOK** — `ProductVariant` / `ChannelSku` / `Product` üçünde de listeleme fiyatı yok. Şemadaki tek fiyat `SaleItem.unitPriceAmount` = geçmiş bir satışın fiyatı. Fiyat kartı `baslangicFiyati={null}` alıyor; fiyatı Halil elle giriyor. **SONUÇ: fiyatlama simülasyonunun girdisi kayıt dışı bir insan sayısıdır** — aynı ürüne iki gün arka arkaya bakılırsa aynı sonucun çıkacağı garanti değil. Bugün iş açılmıyor, **soru olarak duruyor.** |
| — | **ADLANDIRMA (bilgi bankası)** | TY sabit gideri = **`SABIT_GIDER` ₺13,19 · PER_PACKAGE** · HB sabit gideri = **`HIZMET_BEDELI` ₺12,60 · PER_SALE**. İkisi iki ayrı komutta karıştırıldı; **kural adı koddan teyit edilmeden komuta yazılmaz.** |

---

## ⛔ FIFO DEĞİŞMEZ — KAPANDI 24.08.2026, YENİDEN AÇILMAZ

**Kullanıcı kararı:** _"Hayır, değiştirme FIFO'yu. Sadece durumu anlattım."_

### Soru neydi

Kullanıcı `/satislar?kar=zarar` listesinde `11491734874`ün zararda
görünmesini sorguladı ve işleyişi anlattı: aynı üründen üç ayrı maliyetle
alım yapılmış, **buybox'a bakarak fiziken EN UCUZ partiden gönderilmiş**,
ama sistem en eski partiyi düşmüş. Soru: _"Ortalama satın alım fiyatına
göre mi belirleniyor kâr?"_

### Cevap — ölçüldü, varsayılmadı

**Ortalama DEĞİL, FIFO.** `npm run canli:parti-izi 11491734874`:

    LEGO NINJAGO 71863 (axcali1665) — bütün girişler, FIFO sırası
      29.07  +2 × ₺1.022,98   kalan 0   ← 10.08 satışı BUNU tüketti
      29.07  +2 × ₺1.048,00   kalan 0
      07.08  +2 × ₺873,99     kalan 2   ← DOKUNULMAMIŞ
      18.08  +1 × ₺1.074,00   kalan 1

    satış ₺1.232 · maliyet ₺1.022,98 · NET-2 −23,30
    fark ₺148,99 — NET'i eksiden artıya çeviren tam bu

⚠ Kullanıcının hatırladığı rakamlar (`1060 · 1060 · 874`) defterdekiyle
birebir DEĞİL (`1.022,98 · 1.048 · 873,99`). Yakın ama aynı değil; ölçüm
hatırlamanın yerine geçti.

### Bilinen sonuç — kabul edildi, gizlenmedi

FIFO korunduğu için şu üçü **bilerek** yaşıyor:

1. **Satır bazında NET kayabilir** — fiziken ucuz parti gönderilip pahalı
   parti düşülünce o satış zararda görünür. Toplamda kâr aynı çıkar;
   **hangi satırın taşıdığı** değişir.
2. **Parti kalıntısı fiziksel gerçekle ayrışabilir** — toplam adet doğru,
   hangi maliyetle durduğu yanlış olabilir.
3. **Fiyat kararının geri bildirimi zayıflar** — kullanıcı buybox'a bakıp
   belirli bir partinin maliyetiyle karar veriyor; sistem başka maliyet
   yazınca o kararın iyi olup olmadığını söyleyemiyor.

### Elenen seçenekler ve NİYE elendi

- **Satışta parti seçimi (specific identification)** — fiziksel gerçeği
  birebir yakalardı ama satış formuna her seferinde bir adım daha ekler
  (İlke #9'a doğrudan bedel) ve depoda hız kaybettirir.
- **Sonradan parti taşıma** — nadir vakada işe yarar, günlük akışta
  düzeltme borcu üretir.
- **Ortalama maliyet** — hiç önerilmedi; anayasa FIFO diyor ve iki yöntemi
  karıştırmak defterde ikinci bir gerçek doğururdu.

⚠ **BÜYÜKLÜK ÖLÇÜLMEDİ.** "Kaç satışta FIFO daha ucuz bir partiyi atladı"
sorusu soruldu, kullanıcı ölçüme gerek görmedi. Yani bu kalem
_"ölçüldü ve önemsiz çıktı"_ diye değil, **"kural korunacak, büyüklüğü
merak edilmedi"** diye kapandı. İkisi farklı şeydir ve karıştırılmamalıdır.

> **BU KALEM YENİDEN AÇILMAZ.** Yeniden açılması için gereken: kullanıcının
> kendi isteği, ya da satır bazlı sapmanın bir KARARI bozduğunun
> gösterilmesi (ör. doğru fiyatlanmış bir ürünün sürekli zararda görünüp
> listeden çıkarılması). "Rakam kaymış görünüyor" tek başına yeterli
> değildir — kayma FIFO'nun bilinen ve kabul edilmiş sonucudur.

| **K46** | **Yönlendirmeli paketleme — ✅ KAPANDI 25.08.2026** | 📦 **Halil tarifi 24.08.2026:** pazaryeri etiketindeki kargo kodu okutulur → sistem **ürün adı + adet + RAF** söyler → raftan alınan ürünün barkodu okutulur → eşleşirse görsel/sesli onay → *paketlendi*. **İki okutma, sıfır ezber** — yeni eleman tarifle çalışabilir. **Mevcut parçalar:** kargo kodundan sipariş bulma [K41a canlı] · ürün teyidi [K34a canlı] · paketlendi izi [K37 canlı]. ⚠ **"EKSİK HALKA: RAF" İDDİASI ÖLÇÜLDÜ VE ÇÜRÜDÜ (24.08.2026):** ① *"şemada varyanta konum alanı"* — **ZATEN VAR**: `ProductVariant.locationId` → `Location{ code, name }`, ürün sayfasında `Raf: A19` diye görünüyor, kârlılık kartında `rafKodu` basılıyor. ② *"1080 ürünün fiziksel adreslenmesi (BÜYÜK)"* — **1091 aktif varyantın 1090'ı raflı (%99,9)**, 41 tanımlı raf, ve **stokta olan 118 varyantın RAFSIZI SIFIR.** Yani büyük operasyon işi **bitmiş.** ⏭ **Gerçek eksik parça yalnız AKIŞ**: üç canlı parçayı tek ekranda birleştiren yönlendirme + eşleşme onayı. ⛔ **AÇILIŞ ŞARTI DEĞİŞMEDİ:** API-öncesi kapanış listesi bitmeden kod yazılmaz. <br><br>✅ **TESLİM EDİLDİ 25.08.2026 — `/paketle`.** Kullanıcı açılış şartını (API öncesi kapanış) bilerek aştı; kalan üç madde SİZDE olan testler, kod işi değildi, çakışma doğmadı. ⚠ **VE PANO YANILIYORDU: KOD ZATEN VARDI.** `src/lib/paketleme/yonlendirme.ts` (146 satır, saf kural, ölçülmüş kararlarla) depoda duruyordu ama ① **hiçbir yer import etmiyordu** — ölü kod, ② kendi yorumunda söz verdiği **`paketleme:dogrula` bekçisi YOKTU**, ③ `6db8ac7` commit'ine **kaçak binmişti** (o commit'in başlığı TY API ölçümü). *Beyin yazılmış, gövde yok.* **Bugün eklenen:** `/paketle` ekranı + `paketlemeIcinAra` sunucu eylemi + `paketleme:dogrula` (45 kontrol) + 25 sözlük anahtarı (tr/en) + menü satırı + **el kitabı bölümü**. ⚠ **ŞEMA DEĞİŞMEDİ, YENİ İZİN AÇILMADI.** Raf zaten vardı (`ProductVariant.locationId`), paketlendi izi zaten `AuditLog`ta (K37), izin `stok.gor` (okutma ekranıyla aynı). Merdivenin hiçbir basamağı atlanmadı. ⚠ **`/okut`TAN AYRI EKRAN — gerekçe:** ikisinin GİRİŞİ farklı. `/okut` *"bu kod ne"*, `/paketle` *"bu kutuyu nasıl paketlerim"*. Tek ekrana koymak her okumada *"ürün mü arıyorum sipariş mi"* belirsizliği üretirdi. Yazma yolu ORTAK: `paketlendiIsaretle` tek yerde, ikinci kapı açılmadı. 🧪 **8 mutasyonun 8'i yakalandı** — ama **ikisi önce YEŞİL KALDI** ve bekçi düzeltildi: ① `tonCal(` deseni dosyanın tamamında aranıyordu ve **TANIM SATIRI** onu ayakta tutuyordu (`tonCal(true)` mutasyonu geçti) → desen çağrı yerine daraltıldı ve ARGÜMAN okunuyor; ② bir mutasyon **hiç uygulanmamıştı** ve körlük sanıldı — *mutasyonun kendisi de doğrulanır*. ✅ **HALİL TESTİ GEÇTİ 25.08.2026 — ALTI BÖLÜMÜN ALTISI**, canlı adreste: **(A)** normal akış — kargo kodu → sipariş + adet + raf → ürün okut → yeşil onay + bip → paketlendi · **(B)** yanlış ürün **NÖTR** kaldı (gri kutu, alçak ses, hiçbir şey kilitlenmedi) · **(C)** kilitli düğme **sebebini yazdı** · **(D)** bulunamayan kod NİYE bulunamadığını söyledi · **(E)** kamera iki kutuda da çalıştı · **(F)** telefonda taşma/yana kayma yok. Mimar onayı: _"bunların hepsi tamam"_. |
| **K47** | **Tarife yükleme ekranı** | ✅ **KAPANDI 25.08.2026** — `/ayarlar/tarife` yazıldı. **Açılış sebebi:** panele *"tarife penceresi bitiyor"* satırı eklenecekti, ölçüldü ve yükleyecek ekran olmadığı görüldü (`grep -rln "komisyonTarifesi" src/app` → 0). Uyarı, kullanıcının yapamayacağı bir işi hatırlatacaktı. **İkisi birlikte teslim edildi**: ekran + panel satırı. Yeni mantık yazılmadı — `tarifeDenetle()`/`tarifeYaz()` zaten dışa açıktı ve betik de aynı gövdeyi çağırıyor. Yeni izin açılmadı (`kanalsku.yaz`). **8 mutasyonun 8'i yakalandı.** Yan bulgu: `canli-tarife-yukle.ts:13` olmayan bir ekrana atıf yapıyordu; yorum düzeltilmedi ama ekran artık gerçekten var.<br><br>✅ **HALİL TESTİ GEÇTİ 25.08.2026 — 11 adımın 11'i, canlı adreste, gerçek dosyayla.** Dosya `870249-25-08-2026-08-00-45.xlsx` (TY Salı yayını). Ekran: `712 kalem yazıldı · 2026-08-25 – 2026-09-01 · **1. yükleme**` — kuru koşumun beyanıyla **birebir** (712 = 178 satır × 4 dilim; 177 bağlı + 1 bağsız). Panelde tarife uyarısı söndü, kapsam kartında yeni satır `✓ Güncel` rozetiyle çıktı.<br>⚠ **ADIM 11 ÖNCE DÜŞTÜ VE KUSUR TESTTEYDİ, SİSTEMDE DEĞİL.** Test _"bir ürüne girip Fiyat dene'yi aç, dilimli oran vermeli"_ diyordu; kullanıcı rastgele bir ürün seçti ve ekran doğru olarak _"bu üründe dilim tarifesi yok"_ dedi — dosya katalogdaki ~1080 üründen yalnız **178**'ini taşıyor. Adım, **dosyada olduğu ölçülmüş** bir ürüne bağlanarak yeniden yazıldı (`axcali1618`, stok 8, üç kanalda da kodu var).<br>⚠ **VE TEK FİYAT YETMEDİ.** İlk deneme `1125 → %2,7 (4. dilim)` verdi; bu tek başına _"motor fiyata göre seçiyor"_ ile _"hep en ucuz dilimi veriyor"_ arasını **ayırt etmiyordu** (anayasa: _"örnek veri ayrımın iki yakasını göstermeli"_). İkinci fiyat istendi: `1400 → %14,75 (1. dilim)`. İki fiyat, iki dilim → motor doğrulandı. Alt dilim önerisi de bağımsız ölçülen tarifeyle tuttu: `₺1.300,31` gerçekten 2. dilimin tepesi (%5,7), `₺1.400`'ün %7,1 altı, NET-2 `₺157,41 → ₺185,49` (+₺28,08).<br>⛔ **YAN BULGU — KALICI 72 SAATLİK DELİK, K49 AÇILDI.** Pencere sınırları veritabanından okundu: `14.08 08:00→18.08 07:59` ile `21.08 08:00→25.08 07:59` arasında **18 · 19 · 20 Ağustos kapsamsız** (18.08 Salı dosyası hiç indirilmemiş, arşivden inmiyor → kapatılamaz). Ekran bu boşluğu **söylemiyor**; görünür kılınması K49. Ayrıca `21–25` ile `25–01` ekranda **örtüşüyor görünüyor** ama gerçekte bitişik — kart tarihi `.slice(0,10)` ile kırpıyor, gerçek sınır `07:59`/`08:00`. |

| **K48** | **`npm run bekci` derlemeyi sınamıyordu** | ✅ **KAPANDI 25.08.2026.** `"tsc:dogrula": "tsc --noEmit"` eklendi; bekçi listeyi `package.json`dan okuduğu için **kendiliğinden aldı**. **Tur 45/45 · 69sn → 46/46 · 81sn.** ⚠ Karar *"~41sn"* TAHMİNİYLE verilmişti; ölçüm (9.0 · 8.8 · 12.0sn) gerçek bedeli **+12sn** buldu — karar aynı yönde, rakam kaynağıyla düzeltildi. **Bekçinin bekçisi: 2/2 yakalandı** — tip hatası (`TS2322`) ve **ayrıştırma hatası (`TS1005`, 25.08 vakasının tam sınıfı)**. **Sınıf kapandı:** JSDoc'taki `"use server"` · `prisma format` CRLF'i · el kitabı tırnağı — üçü de bekçi yeşilken çıkmıştı. |
| **K48b** | **Ham renk taraması izlenmeyen dosyayı görmüyordu** | ✅ **KAPANDI 25.08.2026, K48 ile aynı gün.** `panel:dogrula` dosya listesini düz `git ls-files` ile alıyordu — **yeni yazılmış bir ekran commit edilene kadar hiç taranmıyordu.** Vaka: `/ayarlar/tarife`nin iki dosyası ham renk sınıfı taşıyordu, tur **45/45 yeşil** dedi, ihlal ancak COMMIT'ten SONRA kırmızı yandı. Yani *"push öncesi bekçi koş"* ritüeli, dosyayı henüz eklememiş biri için **yanlış cevap veriyordu.** Düzeltme: `--cached --others --exclude-standard` (izlenmeyen dahil, `.gitignore` hariç — onsuz `node_modules` da listeye girerdi). **Mutasyonla sınandı:** izlenmeyen ihlalli dosya YAKALANDI, taranan dosya 412 → 413. ⚠ **Kapsam ölçüldü, tek bekçi:** `grep -rln "git ls-files" scripts/` → yalnız `panel-dogrula.ts`. |
| **—** | **DÜZELTME: yorumdaki sınıf adı bekçiyi yakmıyor** | ⚠ **25.08.2026 — kendi commit mesajımdaki yanlış iddia.** `e56215c` şunu yazdı: *"`bg-amber-500` diye açıklama yazınca taramanın kendi deseni yorumun içinde eşleşip yalancı kırmızı üretti."* **ÖLÇÜLDÜ VE YANLIŞ ÇIKTI:** sınıf adı yoruma geri konup koşuldu → `panel:dogrula` **YEŞİL**. Tarama yorumları zaten ayıklıyor (`yorumsuz`, aynı tuzağa beş kez düşüldüğü için yazılmış). Gerçek sebep basitti: **iki dosya da KODDA ham renk kullanıyordu.** Sebebi ölçmeden yazdım; iddia doğru görünüyordu diye sınamadım. _Eski gerekçe silinmiyor — niye çevrildiğiyle birlikte duruyor._ |

## ✅ 30.08.2026 — kapanan kalemler (panodan taşındı)

> Pano yalnız AÇIK kalem tutar. Aşağıdakiler kapandığı için buraya
> alındı; satırlar **birebir** taşındı, özetlenmedi.

| # | İş | Durum |
|---|---|---|
| **H23** | **İadeler ekranı — sekmeli düzen** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üç sekme (Bildirimler / İşlenmiş iadeler / Kırılım), durum süzgeci, süzgeç yalnız etkilediği sekmede. ⚠ **Panel rozeti 0 → 3 oldu** (ölçüt düzeltildi: `ITIRAZ_RED` bekleyen sayılmıyordu). Test listesi teslim raporunda, 9 madde. |
| **H24** | **Tema görünürlüğü — üst çubuk + zemin** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üst çubuk kabuk renginde (telefonda temanın göründüğü tek yer), sayfa zemini bir kademe koyu. Test listesi teslim raporunda, 8 madde. |
| **K96** | **`SALE_CANCEL_IN` partiye bağlanırsa ÇİFT SAYILIR · [ÖLÇÜLDÜ, uygulama yolu RİSKLİ]** | 🕓 **[AÇILDI 30.08.2026]** İptal/geri alma hareketi POZİTİF olduğu için `acikPartiler` onu **yeni parti** sayar; ayrıca `sourceMovementId` doluysa eski partinin tüketimini de geri alır. **Aynı adet iki kez** FIFO'ya girer: ledger 1, FIFO 2. ⭐ **ÖLÇÜLDÜ:** defterdeki 14 `SALE_CANCEL_IN`in **12'sinde alan BOŞ** (doğru kullanım — geri dönen mal YENİ parti oluşturur); dolu olan 2'si bugün benim yazdıklarımdı ve **ayrışan tam o 2 varyanttı** (`axcali1633` · `axcali3134`). Alan boşaltılınca ayrışma **2 → 0**. ⚠ **AMA UYGULAMA YOLU HÂLÂ DOLDURUYOR:** `lib/satis-iptali-veri.ts` iptal ederken `sourceMovementId: h.sourceMovementId` yazıyor. Bugüne kadar patlamamasının sebebi ölçüldü — o satışların `SALE_OUT`larında kaynak zaten boştu. **Kaynağı DOLU bir satış iptal edilirse aynı çift sayım canlıda doğar** ve hiçbir şey hata vermez. ⏭ İki iş: ① `satis-iptali-veri.ts`te alanı boş bırak (ya da niye dolu olduğunu ölç ve yaz) ② bekçi: pozitif `quantityDelta` + dolu `sourceMovementId` birleşimi yasak desen — `EXCHANGE_IN`/iade yolları da taransın. |
| **K93** | **Ölçüt bloğu ÖZETTEN SONRA koşarsa hiçbir şey ölçmez · [ANAYASA ADAYI, BUGÜN İKİNCİ VAKA]** | 🕓 **[AÇILDI 30.08.2026]** `uyari:dogrula`ya dört yeni ölçüt dosyanın SONUNA eklendi. Ölçütler koştu, `OK` satırları ekrana bastı — ama **özet ve `process.exitCode` onlardan ÖNCE hesaplanıyordu.** Sonuç: `kalan` sayacı artıyor, kimse okumuyor; **üç mutasyon da yeşil geçti.** ⛔ **VE BU BUGÜNÜN İKİNCİ VAKASI** — aynı gün `fifo-sinir:dogrula`nın beyan penceresi de ölçtüğünü sandığı şeyi ölçmüyordu. Ortak kök: _ölçüm ile karar arasındaki boru da ölçümün parçasıdır_ (anayasa), ama o kural şimdiye kadar KABUK komutları için yazılmıştı (`\| tail -2` · `echo $?`); **bekçinin kendi İÇİNDE de aynı boru var.** ⭐ **ŞABLON KURALI:** her bekçide ölçüt blokları özet ve çıkış kodundan ÖNCE koşar; yeni ölçüt dosyanın sonuna eklenmez. ⚠ Ve bunu yakalamanın tek yolu mutasyondu: yeşil test, sınanmış kontrol demek değil. ✅ **ANAYASAYA GİRDİ ve TARAMA KOŞULDU (30.08.2026):** 62 bekçi tarandı, gerçek ikinci vaka **YOK**. ⚠ Tarayıcının kendisi önce kusurluydu (`awk` içinde `\b`, POSIX ERE desteklemiyor) ve hiçbir şey bulamıyordu; sentetik vaka enjekte edilip ısırdığı GÖRÜLDÜKTEN sonra koşuldu. ⭐ **VE DAHA İYİ ÇARE BULUNDU — SIRA DEĞİL SAYAÇ:** `suzgec-dogrula.ts` bu tuzağı mekanizmayla çözmüş (`BOLUM_SAYISI = 7` + `kosanBolumler.push`); bir blok koşmazsa bekçi "geçti" demiyor, **"KOŞUM YARIM KALDI — sonuç GEÇERSİZ"** deyip düşüyor. Blok sırası insan disiplini, sayaç mekanizma. |
| **K94** | **Prisma koşuluna SPREAD ile eklenen süzgeç SESSİZCE eziliyor · [KAPANDI, ders kayıtta]** | ✅ **[30.08.2026]** İçe aktarma şerhine ekranın süzgeci `...{ items: { some: … } }` diye eklendi; alttaki `items: { none: … }` onu **ezdi** — aynı anahtar iki kez yazılınca JS'de ikincisi kazanır. Süzgeç HİÇ uygulanmadı ve üç ölçüm de aynı sayıyı (9) verdi. ⚠ **KAYNAK OKUMASI YAKALAMAZDI** — kod doğru görünüyor; yakalayan şey DEĞER TESTİ oldu (süzgeçsiz 9 · aranan barkod 0 · gerçekten ayrışan ürün 8). Çare `AND: [...]`. ⛔ **BU ANAYASADA ZATEN YAZILIYDI** (_"koşul `AND` ile eklenir, spread ile değil"_, 17.08.2026 · `?iptal=1` açıkken ciro 105.184 → 106.618 sıçramıştı) ve yine yapıldı — kural bilinmesi değil, ÖLÇÜLMESİ gereken bir şey. Bekçisi eklendi ve dört mutasyonla sınandı. |
| **K95** | **"3 komisyon" AYRI KALEM DEĞİL — ve oran BUGÜN YAZILAMAZ · [KAPANDI, sıraya bağlandı]** | ✅ **[ÖLÇÜLDÜ 30.08.2026]** Sağlık taramasında _"komisyon oranı boş 3 kalem"_ ayrı bir iş sanılmıştı; ölçüm çürüttü: üçü de **zaten bekleyen iki satışın** kalemleri — `10559161422` (mükerrer, 2 kalem) ve `4120311526` (teslim edilemeyen). ⛔ **VE ORAN YAZILAMAZ:** satışlar `2025-10-02` ve `2026-07-04` tarihli; `ChannelSku.commissionRate` **bugünün** oranı (%16 · %10) ve Trendyol/HB bunu HAFTALIK değiştiriyor. Anayasa: _"kapsayan pencere yoksa hüküm verilmez"_ — bugünkü oranı 2025 satışına yazmak, geçmişi bugünün gözlüğüyle okumak olur. ⭐ **SIRA:** ① `4120311526` iptal (teslim edilemedi) · ② `10559161422` mükerrer kalem temizliği (⚠ K78: kalem silecek ekran YOK, betik işi) · ③ oran ancak ondan sonra ve kapsayan tarife penceresi varsa. |
| **H17** | **Yedek — ilk gece doğrulaması** | Dış zamanlayıcı kuruldu, test 200 verdi. `/ayarlar/disa-aktarma` → **kırmızı eksik gün kutusu kaybolmuş olmalı.** |
| **H16** | **Canlı tur** | Kart sırası · yapışkan çubuk · döküm görüntüsü · kıyas ibaresi — hepsi deploy'da, gerçek cihazda bakılacak. |
| **K92** | **5 varyantta `ledger ≠ FIFO` — iki AYRI mekanizma · [AÇIK]** | 🕓 **[AÇILDI 29.08.2026, TAM TARAMA]** 1052 varyantın **5'i** sapıyor, hepsi `−1`. ⚠ **İŞARET AYNI, MEKANİZMA TERS — tek kefeye konmaz:** **FAZLA TÜKETİM** (parti kendi adedinden fazla tüketilmiş; FIFO `max(0,…)` ile keser, ledger kesmez) → `axcali2723` 6↔7 · `axcalistan01` 0↔1 · `OYUNEN88141740` 3↔4. **EKSİK BAĞ** (partisiz `EXCHANGE_OUT`; ledger düşer, FIFO görmez) → `axcali1610` 12↔13 · `axcali1660` 4↔5. ⭐ **ÜÇÜNÜN ÇARESİ K91 ONARIMI** — bağ doğru partiye çevrilince üçünde de FIFO 1 düşer ve **ledger'a eşitlenir**; ölçüldü, üçünde de Halil'in saydığı rakam (6 · 0 · 3) KORUNUR. İkisinin çaresi ayrı (K54 sınıfı, eksik bağ kurmak). ⛔ **HÜKÜM VERİLMEDİ, YAZILMADI** — karar Halil'de. |

**Kapanış gerekçeleri:**

- **H23** — Halil onayı verdi 30.08.2026 — üç sekmeli iade ekranı kabul edildi.
- **H24** — Halil onayı verdi 30.08.2026 — tema görünürlüğü kabul edildi.
- **K96** — Kod + bekçi 30.08.2026'da teslim edildi (`f4faf7c`) ve BUGÜN ÖLÇÜLEREK doğrulandı: `satis-iptali-veri.ts` artık `sourceMovementId` yazmıyor (gerekçe kodda, satır ~209) ve `parti-bagi:dogrula` 14 ölçütle yeşil. Pano bayat kalmıştı.
- **K93** — Anayasaya girdi ve tarama koşuldu 30.08.2026: 62 bekçi tarandı, gerçek ikinci vaka YOK. Ayrıca `suzgec-dogrula`nın sayaç mekanizması şablon olarak benimsendi.
- **K94** — Kapandı 30.08.2026 — `AND` düzeltmesi + dört mutasyonla sınanmış bekçi.
- **K95** — Kapandı 30.08.2026 — ölçüm ayrı kalem olmadığını gösterdi, sıraya bağlandı.
- **H17** — Halil doğruladı 30.08.2026: yedek çalışıyor — `/ayarlar/disa-aktarma` ekranında kırmızı eksik gün kutusu yok. Dış zamanlayıcı gece koşuyor. _(Vercel Cron iki kez sessizce tetiklenmemişti; kontrol edilebilir alternatife geçme kararı böylece sahada doğrulandı.)_
- **H16** — Halil kapattı 30.08.2026 — canlı turda kart sırası, yapışkan çubuk, döküm görüntüsü ve kıyas ibaresi gerçek cihazda görüldü, itiraz yok.
- **K92** — Kapandı 30.08.2026: sapma **5 → 0**. İki BAĞIMSIZ ölçüm aynı sonucu verdi — `canli:defter-ayrismasi` (1053 varyant, 1053 temiz, 0 sapan, 0 incelenemeyen) ve `canli:bag-onar`ın kendi ön/son ölçümü (0 → 0). Üç vakanın çaresi K91'e bağlıydı ama onarım koşulmadan çözüldüler: bugünkü **K54 eksik bağ onarımı** ve **K96 bağ yazımı düzeltmesi** ikisini birden kapattı. Kalan iki vaka (`axcali1610` · `axcali1660`, eksik bağ sınıfı) da temiz. ⚠ K91 AÇIK KALIYOR — 780 bozuk bağ duruyor, ama bugün görünür sapma üretmiyor.

- **K14t** — Kapandı 01.09.2026, **düzeltilerek**. Kalem _"bugün güvenli, açılış: aynı kanala harf farkıyla ikinci hesap"_ diye bekliyordu. 📏 **AÇILIŞ ŞARTI ÖLÇÜLDÜ:** canlıda 19 kanal hesabı, aynı kanal içinde harf duyarsız çakışma **YOK** — şart bugün karşılanmıyor. ⚠ **AMA BEKLEMEK YANLIŞ CEVAPTI:** aynı ölçüm, aynı kişinin kanaldan kanala **ÜÇ farklı yazımla** durduğunu gösterdi (`S.Ahmet` · `S.ahmet` · `s.ahmet`). Yazım tutarsızlığı istisna değil **kural**; aynı kanalda tekrarlaması an meselesiydi ve olduğunda **sessiz** olurdu — iki mağazanın cirosu tek satırda toplanır, hiçbir hata çıkmazdı. _(Anayasa: "desen, örneği kalmadığında değil DOĞURAMADIĞINDA kapanır".)_ ✅ **ÇARE:** `PanelSatisi`/`PanelIadesi`/`HesapSatiri` `hesapId` taşıyor, `hesapSatiri` **kimlikle** eşleştiriyor, ad yalnız ekran etiketi; React anahtarı da kimliğe bağlandı ve sorgular `channelAccount.id` çekiyor. 🧪 `panel:dogrula` 645→654 — **değer testi**, kaynak taraması yalnız zincir (ekran) tarafında. **3 mutasyon, 3'ü de kırmızı**: adla arama geri geldi · gruplama tamamen kalktı (ters yön) · React anahtarı ada döndü. ⭐ Örnek veri ayrımın iki yakasını gösteriyor: adlar YALNIZ harf durumuyla ayrılıyor — farklı adlar seçilseydi eski gövde de testi geçerdi.
- **K14c** — Kapandı 01.09.2026, **düzeltilerek**. Kalem _"düzeltilmiyor (iş değeri yok), açılış: kanal adının düzenlenmesi"_ diyordu. 📏 **ÖLÇÜLDÜ:** canlı kanal adları sözlük anahtarlarıyla hâlâ birebir tutuyor (`Trendyol` · `Hepsiburada`) — şart karşılanmıyor. ⚠ **AMA "İŞ DEĞERİ YOK" HÜKMÜ, MALİYET ÖLÇÜLMEDEN VERİLMİŞTİ:** düzeltme ada bağlı sözlüğü **koda** çevirmekten ibaretti ve bu depoda aynı gerekçe zaten yazılıydı — `kanal-sirasi.ts`: _"ÖLÇÜT KOD, AD DEĞİL; 'Elden Satış' kanalının kodu `DEPO`"_. Aynı tuzağın ikinci örneğini bilerek bırakmak, ilkini düzeltmenin değerini düşürüyordu. ✅ **ÇARE:** sözlük + en-yakın-yayım-günü hesabı saf gövdeye taşındı (`src/lib/komisyon-ritmi.ts`), anahtar **kanal kodu**, bilinmeyen kanal `null` döndürüyor (**boş dizi değil** — "ritmi yok" ile "ritmini bilmiyorum" farklı iddialar) ve betiğin TANIMSIZ satırı artık **aranıp bulunamayan KODU yazıyor**, yani sessiz değil. 🧪 `komisyon:dogrula` 154→169 · **8 mutasyon, 8'i de kırmızı**. ⛔ **VE BİRİ ÖNCE KAÇTI — DERS:** betiğin kodla gruplandığını sınayan ölçüt tek `test()` idi; `const kod = ...channel.code;` deseni **İKİ yerde** geçiyor (özet + gün tablosu) ve birini bozan mutasyon ötekini ayakta buldu. Ölçüt **saymaya** çevrildi (`=== 2`) + ada dönen atama ayrıca yasaklandı; iki yer de ayrı ayrı mutasyonla sınandı. _(Anayasa: "ÖNCE DESENİ SAY".)_

---

## 01.09.2026 — pano temizliği: kapanmış 12 kalem arşive taşındı

> ⚠ **SATIRLAR BİREBİR TAŞINDI, ÖZETLENMEDİ.** 20.08'de arşiv kurulurken
> alınan karar burada da geçerli: özetleyerek taşımak, neyin kaybolduğunu
> ölçülemez hâle getirir.
>
> **Taşıma ölçütü — üçü birden:** ① kod teslim edildi · ② kalemin **kendi
> satırında** açık kalan bir soru YOK (`AÇIK KALAN` · `YAPILACAK` · `⏳` ·
> `AÇILIŞ ŞARTI` işareti taşımıyor) · ③ Halil testi gereken kalemlerde
> kullanıcı onayı **kayıtlı** (01.09.2026 saha listesi, _"buradaki
> testlerin hepsi geçti"_).
>
> ⛔ **ÖLÇÜT MEKANİK UYGULANMADI — İKİ KALEM ELDE AYRILDI.** Süzgeç `K50`yi
> taşınabilir gösterdi (açık işaret taşımıyordu) ama satırın sonunda
> _"⚠ BİLİNEN EKSİK: etiket basımının izi tutulmuyor"_ yazılı ve depo
> yerleşimi hâlâ kullanıcıda — panoda **kaldı**. `K98` · `K121` · `K123` ·
> `K124` Halil onayı almış olsalar da satırlarında `⏳` taşıdıkları için
> taşınmadı.
>
> ⚠ **HALİL TESTİ GEREKMEYEN ÜÇ KALEM:** `K54` (ölçüm + desen yasağı),
> `K10` (pano aracı) ve `K122` (açılmadan kapandı) ekran değişikliği
> içermiyor; kapanışları ölçüm ve mutasyonla kanıtlı.

| Kod | Konu | Durum |
|---|---|---|
| **K54** | **İki defter ayrışması — 2 birim, kaynağı bulundu · [KAPANDI 01.09.2026]** | ⚠ **K53 ÖLÇÜMÜ SIRASINDA ÇIKTI, ARANMIYORDU.** Bugün: **LEDGER 636 · FIFO 638 → +2**. `canli:defter-ayrismasi` doğruluyor: 150 varyantın **2'si sapan** (`axcali1660` M300 SSD 4→5 · `axcali1610` Vestel blender 11→12), incelenemeyen 0. 🔎 **KAYNAK BULUNDU:** 164 çıkış hareketinin **2'si `sourceMovementId` TAŞIMIYOR** — ikisi de `2026-08-23` tarihli `EXCHANGE_OUT`, notları _"Yanlış sıfırlama geri yüklendi — kullanıcı düzeltmesi"_ ve _"Değişim gerçekten yapıldı — yenisi gönderildi"_. Yani vaka-bazlı düzeltme betikleri partiye bağlamadan çıkış yazmış: **ledger düştü, FIFO düşmedi → hayalet adet.** ⚠ **BU K53'Ü DOĞRUDAN İLGİLENDİRİYOR:** tarihli envanter FIFO'dan okuyor, `/stok` ledger'dan — **iki ekran bugün 2 birim farklı gösteriyor.** ⛔ **HÜKÜM VERİLMEDİ:** hangi defterin doğru olduğu vakaya göre değişir; körlemesine hizalamak veriyi bozar. **Yapılacak:** iki hareketin geçmişi tek tek okunup karar verilir (ADJUSTMENT ile mi düzeltilir, parti bağı mı kurulur). _(Anayasa: "stoğun kendisi de iki defterdir" — üçüncü vaka.)_ ─── ② **KAPANDI 01.09.2026 — VAKA KENDİLİĞİNDEN TEMİZLENDİ, DESEN YASAKLA KAPANDI.** 📏 **ÖLÇÜLDÜ:** `canli:defter-ayrismasi` bugün **1056 varyantın 1056'sında temiz** (sapan 0 · incelenemeyen 0) ve tüm defterde **6091 çıkışın 0'ı** partiye bağsız. İki sapan varyantın (`axcali1660` · `axcali1610`) bağsız çıkışı da kalmamış. ⚠ **VE BU BİR ZAFER DEĞİL, BİR YAN ETKİ:** vaka tek tek karara bağlanmadı; 29–30.08 onarım turlarının birinde bağ kuruldu. Kapanış bunu SÖYLÜYOR ki altı ay sonra bakan "demek doğru teşhis edilmişti" sanmasın. ⛔ **ASIL İŞ DESENDİ: örneği kalmaması, desenin kapandığı anlamına gelmez.** Bir betik hâlâ partiye bağlamadan çıkış yazabilirdi — ledger düşer, FIFO düşmez, iki ekran aynı ürün için farklı adet gösterir ve **hiçbiri hata vermez.** Yeni ölçüt `fifo:dogrula`da: **hareket yazan her gövde partiyi bağlar**; yalnız pozitif yazan gövde `CIKIS YAZMAZ: <gerekçe>` diye BEYAN eder ve beyansız eksik hata sayılır. ⚠ **ÖLÇÜT BİR YANLIŞ YANMADAN SONRA DARALTILDI:** ilk hâli "negatif `quantityDelta` yazan" arıyordu ve **iki saf planlayıcı gövdeyi suçladı** (`iptal-geri-alma.ts` · `iade/yanlis-urun.ts`) — onlar plan dizisi kuruyor, veritabanına hiç yazmıyor. Ölçüt YAZAN gövdeye bağlandı. **Mutasyon 3/3 KIRMIZI** (satış çıkışı partiyi bağlamıyor · beyan gerekçesiz kaldı · tarama hiçbir gövde bulamıyor = yalancı yeşil). |
| **K10** | **Pano kodu ataması elle — 🔺 ÜÇÜNCÜ KEZ ÇAKIŞTI** | 🧹 Kodlar elle veriliyor. 20.08'de **iki satır da `H6`** oldu; **24.08'de iki satır da `K42`** oldu (biri fire zararı, biri yönlendirmeli paketleme — ikincisi `K46`ya alındı). ⚠ **ÇAKIŞMAYI MİMAR DEĞİL UYGULAYAN ÜRETTİ:** komutta verilen kodu **kullanılmakta mı diye bakmadan** yazdım. Kod verilmiş olması onu boş yapmıyor. Çare değişmedi: en büyük numaranın bir fazlası — betik ya da tek kaynaklı sayaç. Elle atama üçüncü kez tutmadı; **bu artık bir tercih değil, ölçülmüş bir kusur.** ─── ⑥ **KAPANDI 01.09.2026 — ÖNERİ ARTIK HATANIN YANINDA.** Bugün DÖRDÜNCÜ kez çakıştı (`K50-⑨` diye yeni satır açıldı, bekçi yakaladı, K50'nin devamı olarak katlandı). 📏 **ÖLÇÜM ŞUNU GÖSTERDİ: MEKANİZMA ZATEN VARDI, EKSİK OLAN ZAMANLAMAYDI.** Bekçi dört çakışmanın dördünü de yakaladı ve sıradaki boş kodu ZATEN basıyordu — ama **bölüm 2'de, yani hatadan SONRA**; kırmızı yanan kişi çareyi aşağıda aramak zorundaydı. ⭐ **İKİ DEĞİŞİKLİK:** ① kural saf gövdeye taşındı (`scripts/pano-kimlik.ts` → `sonrakiKodlar` · `kalemMi` · `cakismaCaresi`) ve **çakışma mesajının İÇİNE** kondu: artık `K50-⑨@4071, K50@4089 → K50 iki satırda geçiyor. Aynı kalemin ikinci fazıysa YENİ SATIR AÇMA — "─── ② …" diye ekle. Gerçekten yeni bir kalemse sıradaki boş kod: K128` yazıyor. ② **`npm run pano:sonraki`** — soruyu yazımdan ÖNCE cevaplıyor, hiçbir şey yazmıyor. ⛔ **BOŞLUK YENİDEN KULLANILMAZ (en büyük + 1):** kapanıp arşivden silinen bir kod bile bir daha verilmez — eski bir commit mesajında geçiyorsa o kodu ikinci bir işe vermek geçmişi yalancı yapar. ⚠ **VE İKİ GÖVDE AYRIŞMIŞTI:** `pano:sonraki` ilk yazımda beyan listesini bilmiyordu ve `N11` kanal adını kimlik sayıp uydurma bir `N12` öneki üretti; liste tek yere taşındı. **Bekçi `pano:dogrula` 6 → 18 ölçüt · mutasyon 5/5 KIRMIZI.** ⚠ **BİR MUTASYON KAÇTI VE SUÇLU BEKÇİ DEĞİL ÖRNEK VERİYDİ:** "en büyük yerine SONUNCUYU al" senaryosu yeşil geçti çünkü test verisinde en büyük kod zaten sonuncuydu; veri karıştırıldı (`K127, K1, K90 …`) ve mutasyon kırmızıya döndü. |
| **K122** | **TY ADET FARKI ÖRÜNTÜSÜ — [AÇILMADAN KAPANDI 01.09.2026]** | 21 üründe TY'nin bizden fazla adet bildirdiği ve **19'unda tam 2 kat** olduğu görüldü; "sistematik senkron arızası" diye ayrı kalem açılacaktı. ⛔ **ÖLÇÜM ÖNCE ARACI ŞÜPHELİ SAYDI VE HAKLI ÇIKTI:** 1629 TY listelemesinin **1262'sinde `barcode` = `stockCode`**, 4'ünde üç alan da aynı dize; ben adedi üç alanın üçünde de topluyordum. Aynı barkodla birden çok listeleme **SIFIR** — mükerrer listeleme yok. Araç düzeltilince adet farkı **21 → 0**, hayalet stok **1 → 0**. TY'nin bildirdiği adetler stoğumuzla **tam tutuyor**. _Kalem açılmadı; ders kılavuza geçti._ |
| **K101** | **STOK EKRANINDA SIRALAMA VE SIFIR SÜZGECİ YOKTU · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"Sırala tuşu yok. Sıfır stoklulari filtreleme tuşu da olsun; sıralama tarih, adet gibi."_ 📏 **ÖLÇÜLDÜ (canlı, salt okuma):** 1104 varyant · **stok > 0 → 230** · stok = 0 → 823 · **stok < 0 → 0** · **HİÇ hareketi olmayan 51** · `groupBy` 607 ms (ağ tabanı 34 ms). Yani ekranın **%79'u** operasyonda elde OLMAYAN mal. ⭐ **İKİ KARAR ÖLÇÜMDEN ÇIKTI:** ① süzgeç ölçütü **`≠ 0`**, `> 0` DEĞİL — bugün ikisi aynı 230 satırı veriyor ama `> 0` yarın doğacak bir **negatif stoğu sessizce gizlerdi** ve negatif stok tam da görülmesi gereken bir anomalidir; ② hareketi hiç olmayan 51 varyant `groupBy`'da YOK, sıralamada **0 sayılır** — yoksa sıralamaya basan kullanıcı onları sessizce kaybederdi. ⛔ **TUZAK: "mevcut stok" ve "son hareket" `ProductVariant` KOLONU DEĞİL**, `StockMovement` defterinden türer. Sayfayı çekip eldeki 50 satırı sıralamak ekranı yalancı yapardı (2. sayfada 1. sayfadan büyük adet çıkar, hiçbir şey hata vermez) — **sıra SÜZGECİN TAMAMI üzerinde kuruluyor, sonra sayfa dilimleniyor.** _(K61'in kardeşi: orada TOPLAM sayfaya düşüyordu, burada SIRA.)_ ⚠ Ölçüm YALNIZ gerektiğinde koşuyor; varsayılan sıra (ad) `orderBy` ile çözülüyor ve ek sorgu üretmiyor. ⚠ **EXCEL DE AYNI KÜMEYİ VERİYOR** — ölçüt paylaşılan `stoguVarMi` gövdesinden; yoksa ekran 230 gösterirken dosyada 1104 satır olurdu. ⏭ **HALİL TESTİ:** `/stok` → **"Sıfır stokluları gizle"** çipine bas, sayaç **230 varyant** olmalı · **Adet** çipine bas, en çok stoklu üstte gelmeli · tekrar bas, yön çevrilmeli · **Son hareket** çipine bas · sayfa 3'e geç, sonra sıra değiştir → **1. sayfaya dönmeli** · Excel indir → satır sayısı ekrandakiyle **aynı** olmalı. |
| **K102** | **KÂR CÜMLESİ OKUNAMIYORDU — satış fiyatı hiçbir yerde yoktu · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"ürüne tıkladığımda gelen kârlılık… satış fiyatı ile maliyet bir ekranda görülmeli, satış miktarı yok burda."_ ⛔ **BULGU DOĞRULANDI:** kartta maliyet, NET-2 ve marj vardı; **SATIŞ FİYATI hiçbir yerde yoktu.** Ekran _"%6,0 marj"_ diyordu ama **neyin %6'sı** olduğu okunamıyordu — operatör kârın hangi fiyattan çıktığını görmeden fiyat kararı veremez. ⭐ **ŞİMDİ DÖRT KUTU BİR CÜMLE KURUYOR:** `satış fiyatı − maliyet − kesintiler = NET-2` ve `marj = NET-2 / satış fiyatı`. Dördü de **AYNI paydadan** (`hesaplananAdet`) okunuyor; ayrışsalardı ekrandaki aritmetik tutmaz ve kullanıcı hangi kutunun bozuk olduğunu arardı. ⚠ **MALİYET `satilanBirimMaliyeti`** — sermaye veriminin de paydası. **Hesaplanıyordu ama HİÇBİR EKRANDA GÖSTERİLMİYORDU**; _"0.08x"_ kutusu paydasını söylemeden duruyordu. ⚠ Yukarıdaki "Maliyet ve hız" bölümündeki rakam **ELDE KALAN** partilerin ortalaması — satılanın maliyeti DEĞİL; ikisi yan yana konsa birbirini yalanlardı, bu yüzden ayrı kutu. ⚠ **SATILAN ADET DE BLOĞA GİRDİ:** ₺203,70 birim kâr, 1 adette ₺203,70 — 100 adette bambaşka bir iştir; ölçeksiz birim rakam kararın büyüklüğünü gizler. ⭐ **VE BİR KUTU ÖLÇÜMLE KALDIRILDI:** tek satışlı üründe `sonSatisNet2` ile `birimNet2` **matematik olarak aynı sayı** (ekran görüntüsünde ikisi de ₺203,70) — tek satışta gizleniyor, çok satışta ayrıştıkları için geri geliyor _(İlke #12)_. ⏭ **HALİL TESTİ:** Vestel ZİYAFET 8500 X kartını aç → Kârlılık bloğunda **Satış fiyatı / adet · Maliyet / adet · NET-2 / adet · Marj** yan yana olmalı; ikinci sırada **Satılan adet** görünmeli; `Satış fiyatı − Maliyet` farkı NET-2'den **büyük** olmalı (aradaki fark kesintiler). |
| **K103** | **ÜRÜN KARTININ SAĞI BOŞTU — fiyat denemesi sağ sütuna alındı · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı ekran görüntüsünde boş alanı çerçeveleyip sordu: _"Fiyat dene modülü direkt kırmızı çerçeveli yerde görünse nasıl olur?"_ ⭐ **DOĞRU FİKİR:** masaüstünde kartın sağı tamamen boştu ve fiyat denemesi için aşağı kaydırmak gerekiyordu — oysa iki blok **birlikte** okunur: solda _"bu ürün ne kazandırdı"_, sağda _"bu fiyattan ne kazandırır"_ _(İlke #12: ekranda boşluk bilgi taşımaz)_. ⚠ **AYRIM `xl:` — ALTINDA TEK SÜTUN.** Telefon ve tablette kart tek sütun kalır ve blokların bugünkü sırası korunur; `lg:` seçilseydi 1024 px'lik bir tablette iki sütun 500 px'e sıkışır ve **ikisi de okunmaz** olurdu _(İlke #8: depoda birincil cihaz telefon)_. ⛔ **YAPIŞKAN (`sticky`) YAPILMADI — VE BU ÖLÇÜLMÜŞ BİR KARAR:** `FiyatDene` **kanal başına** bir kart çiziyor, yani yüksekliği kanal sayısıyla büyüyor ve ekranı aşabiliyor; ekranı aşan yapışkan blok kendi içinde **ikinci bir kaydırma** ister — faydadan çok yük olurdu. Bekçide kendi ölçütü var, biri _"iyileştirme"_ diye eklerse kırmızı yanar ve gerekçeyi okur. ⚠ **ALT EYLEMLER VE SKU IZGARANIN DIŞINDA, TAM GENİŞLİKTE** — ilk yazımda sağ sütunun içinde kalmışlardı ve masaüstünde fiyat denemesinin ALTINA düşüyorlardı; onlar sayfa düzeyinde öğeler, bir sütunun kuyruğu değil _(İlke #10)_. ⭐ **② HİZALAMA VE VURGU — kullanıcı düzeltmesi 30.08.2026:** _"Fiyat dene kartı, kırmızı çizgiden soldaki kartla aynı hizadan başlasın; ayrıca biraz öne çıkacak şekilde makyajla."_ ⛔ **SEBEP YAPISALDI:** künye (ürün adı · kodlar · KDV künyesi) SOL SÜTUNUN İÇİNDEYDİ; sağdaki kart sayfanın en tepesinden, soldaki ilk kart ise künyenin altından başlıyordu. Künye zaten **sayfa düzeyinde bir başlık** — ızgaranın ÜSTÜNE, tam genişliğe alındı ve iki sütun artık aynı çizgiden başlıyor. ⚠ **VURGU RENKLE DEĞİL YÜZEYLE:** `bg-card` + `shadow-md` + daha yuvarlak köşe. Bu depoda renk **ANLAM** taşır (olumlu/olumsuz/uyarı); fiyat denemesine renk koymak olmayan bir hüküm iddia ederdi — o ne iyi ne kötü haber, sadece kartın tek EYLEM yüzeyi. Bekçide kendi ölçütü var ve renge çeviren mutasyon kırmızı yanıyor. ⏭ **HALİL TESTİ:** kartı **geniş masaüstünde** aç → Fiyat denemesi **sağda**, kâr kutuları **solda**, aynı anda görünmeli · pencereyi daraltarak küçült → tek sütuna dönmeli ve Fiyat denemesi **alta** inmeli · **telefonda** aç → bugünkü sırası aynen korunmalı. |
| **K104** | **STOK SÜZGECİ DETAYA GİRİP DÖNÜNCE KAYBOLUYORDU · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"Anker süz → sırala → ürüne gir → geri dön → filtre gitmiş."_ Marka/grup bazlı seri işlem (etiket · sayım · raf) bu ekranda yapılıyor; her dönüşte süzgeci yeniden kurmak doğrudan işçilik. ⚠ **KİMLİK NOTU: KULLANICI BUNU `K57` DİYE AÇTI, AMA O KOD ALINMIŞTI** (sayım tekrar koruması, 28.08) — kimlik tekildir, kalem K104 olarak açıldı. 📏 **ÖLÇÜM:** üç durumun **üçü de zaten adresteydi** (`q` baştan beri, `sirala`/`yon`/`stok` bugün K101'le) — yani _"durumu URL'ye taşı"_ işi büyük ölçüde yapılmıştı ve **tarayıcının geri tuşu bugün bile doğru çalışıyordu.** İki gerçek kopukluk vardı: ① `StokArama.ara()` adresi **sıfırdan kuruyordu** (`/stok?q=X`), yani arama yapmak sıralamayı ve sıfır süzgecini **siliyordu**; "Temizle" de düz `/stok`'a gidip her şeyi süpürüyordu. ② `/stok/[variantId]` detayındaki **"‹ Stok" bağlantısı sabit `href="/stok"`** idi — kullanıcının bildirdiği kaybın doğrudan sebebi. ⭐ **ÇARE:** arama artık mevcut parametreleri koruyor (`sayfa` bilerek düşüyor — yeni arama bambaşka bir liste), "Temizle" yalnız `q`'yu düşürüyor, ve geri bağlantısı `router.back()` çağırıyor. ⚠ **GÖVDE HÂLÂ GERÇEK BİR `<Link>`:** JS çalışmasa da, sayfa doğrudan linkle açılmış da olsa `/stok`'a gider; `back()` yalnız geçmiş varsa devreye giriyor. En kötü ihtimalde bugünkü davranışa düşer. ⛔ **TALİMATIN İKİ MADDESİNE ŞERH DÜŞÜLDÜ:** ① `router.replace` gerekçesi (_"her tuş vuruşu history'ye kayıt açmasın"_) bu kodda **geçersiz** — arama tuş başına değil Enter/düğme ile tetikleniyor, debounce yok; ayrıca sıralama çipleri `<Link>` (push) ve aramayı `replace` yapmak iki benzer eylemi ayrıştırırdı. ② _"kamera/barkod için ayrı state kalmasın"_ **uygulanmadı ve bu bir koruma:** yerel `sorgu` ayrı doğruluk kaynağı değil, **yazılmakta olan taslak**; kaldırılırsa kutu DOLDURULAMAZ hâle gelir (26.08 canlı arızası — kullanıcı yazar, React her tuşta eski değeri geri yazar, hiçbir hata çıkmaz). Okunan kod zaten `onOkundu` ile **doğrudan parametre** geçiyor. ⚠ **BEYAN EDİLEN SINIR:** tarayıcı _"geçmişteki önceki adres bizim sitemiz mi"_ sorusunu cevaplamıyor (`history.length` sekmenin TOPLAM geçmişini sayar). Tek kaçak durum: başka sitede gezinip AYNI sekmede doğrudan bir ürün detay linkini açmak. Operasyonda gerçekleşmiyor, bedeli bir geri tuşu. **Param şeması:** `/stok?q=Anker&sirala=ad|adet|hareket&yon=artan|azalan&stok=var`. ⏭ **HALİL TESTİ — İKİ YOL AYRI AYRI:** `/stok`ta "Anker" ara → **Adet**'e göre sırala → **Sıfır stokluları gizle** → bir ürüne gir → **(a) tarayıcı geri tuşu** ile dön, **(b) "‹ Stok"** bağlantısıyla dön. Her iki yolda da arama + sıralama + süzgeç **DURMALI**. Ayrıca: süzgeçler açıkken kutuya yeni bir şey yazıp Ara'ya bas → **sıralama ve süzgeç kaybolmamalı**; "Temizle"ye bas → yalnız arama düşmeli. |
| **K105** | **FİYAT DENEMESİNDE KARGO ÜCRETİ ZORUNLU OLDU · [KAPANDI · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"kargo ücreti girmek zorunlu olsun ve uyarı versin, yoksa unutuluyor."_ ⛔ **BOŞ BIRAKMAK SESSİZCE "KARGO YOK" DEMEKTİ.** Alanın kendi ipucu bunu teşvik ediyordu (_"Boş bırakırsan kargo hesaba girmez"_) ve NET **olduğundan YÜKSEK** çıkıyordu — fiyat kararı o iyimser rakamdan veriliyordu. Ekran susmuyor, **yanlış cevap veriyordu.** ⭐ **AMA YASAK DEĞİL, BEYAN: `0` GEÇERLİ.** Tam yasak, kargosuz meşru satışı (elden satış · alıcı ödemeli) **kilitlerdi** — düzeltme, düzelttiğinden büyük hasar verirdi. Sınır `null` ile `0` ARASINA konuldu, sıfırın kendisine değil: aradaki fark **unutmak ile karar vermek** arasındaki farktır. _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez"; 29.08 FIFO vakasının aynısı.)_ ⚠ **KAPI SESSİZ DEĞİL, HANGİ ALANI BEKLEDİĞİNİ SÖYLÜYOR.** `girdiEksikMi` yerine `eksikSebebi()` geçti: `FIYAT → ALIS → KDV → KARGO` sırasıyla, yani **doldurma sırasıyla** cevap veriyor. İki alan birden eksikken yazılan, kullanıcının BİR SONRAKİ adımı; rastgele biri seçilseydi ekran onu ileri geri gezdirirdi _(İlke #5, #9)_. ⚠ **UYARI KARGO ALANININ YANINDA**, sonuç kutusunda değil — çare tam orada ve gözü zaten orada. Metin çareyi de yazıyor: _"Kargoyu alıcı ödüyorsa 0 yaz."_ Alanın eski ipucu da düzeltildi. ✅ **BEKÇİ: `simulasyon:dogrula` 181 ölçüt** (K105 bölümü) · **`simulasyon-mutasyon:kontrol` 6/6** (− 4 · + 2). ⚠ **KAPSAM BEYAN EDİLDİ:** mutasyon harness'i 181 ölçütün TAMAMINI değil, **yalnız K105 kapısını** sınıyor; gerisi ayrı bir iş ve bugün açılmadı. ⚠ **VE İKİ ÖLÇÜT ESKİDİ, SUSTURULMADI:** bekçide `kargoUcreti: null` ile _"kargo yok"_ demek isteyen iki senaryo vardı; NİYETLERİ doğru, eskiyen şey ifade biçimiydi — `0`a çevrildi ve niye çevrildiği yerinde yazılı. ⚠ **HARNESS ÇAPASI DA DÜZELTİLDİ:** bir mutasyon bekçiyi K105 bölümüne VARMADAN çökertiyor ve harness haklı olarak _"ölçüm geçersiz"_ diyordu; çapa bekçinin AÇILIŞ başlığına taşındı — kapının işi _"bekçi koştu mu"_ sorusunu cevaplamak, koşum ortasındaki çökme zaten geçerli bir yakalamadır. ⏭ **HALİL TESTİ:** `/simulasyon` → ürün kodu bul · satış ve alış fiyatı gir · **kargoyu BOŞ BIRAK** → hesap **çıkmamalı**, kargo alanının altında turuncu uyarı ve sonuç yerinde _"Kargo ücreti bekleniyor"_ yazmalı · kargoya **0** yaz → hesap **anında çıkmalı** · kargoya **120** yaz → NET, 0'lı hâlinden **DÜŞÜK** olmalı (kargo gider). |
| **K108** | **MUHASEBE DÖNEMİ · [TESLİM EDİLDİ · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ **[KOD KOŞTU 31.08.2026]** Şema canlıda (`MuhasebeDonemi`, migration 42/42, `deploy:bekci` yeşil) · kapı **beş yola** bağlı · ısrar bloğu üç formda · kapatma ekranı · dönem raporu · panel göstergesi. ⛔ **SIRA KURALI TUTULDU:** kapatma ekranı ancak kapı bağlandıktan SONRA açıldı — önce açılsaydı Halil dönemi kapatır ve korunduğunu sanırdı. 📏 **KAPININ TABANI ÖLÇÜLDÜ:** günlük operasyonun 542 hareketinin **212'si (%39,1)** önceki aya yazılıyor ve **204'ü `PURCHASE_IN`** (%96,2 geç girilen alım) — tam yasak günlük işin %39'unu kilitlerdi. Halil'in _"ciddi bir uyarı olsun, kesin aşılmaz kural değil"_ düzeltmesi **veriyle doğrulandı**. ⚠ **İKİNCİ MANTIK YAZILMADI:** ısrar kapısı sayımın `israrGecerliMi` gövdesinden; kapı uygulaması `sayim-damgasi.ts` desenini birebir izliyor. Sebep listeleri AYRI (sayımınki FİZİKSEL, dönemin MALİ) ve ısrar bayrakları AYRI — tek bayrak ekranın YANLIŞ bloğu açmasına yol açardı. ⚠ **İÇE AKTARMA SORMAZ, ATLAR ve RAPORLAR;** sonuç PLANLANAN değil **gerçekten yazılan** sayıyı basıyor. ⛔ **GELECEK VE BUGÜNKÜ DÖNEM KAPATILAMAZ** — bitmemiş ay kapatılırsa o ay boyunca her kayıt ısrar ister ve kutu anlamını yitirir. ⚠ **RAPOR YENİ HESAP YAZMIYOR:** envanter `envanterVerisi(dönem sonu)`, kesintiler defterdeki `SaleFee`, NET'ler satışın snapshot'ı. Her rakam **kapsamıyla** ("N satış üstünden"), açık dönem **"değişebilir" şerhi** taşıyor, PDF tarayıcının yazdırması (ikinci bir biçimlendirme yolu açılmadı). ✅ **BEKÇİ: `donem:dogrula` 39 ölçüt · 5 bölüm · `donem-mutasyon:kontrol` 12/12** (− 5 · + 7). ⚠ **VE İKİ MUTASYON İLK TURDA KAÇTI, İKİSİ DE FARKLI SINIFTAN:** ① _"açık dönem yokken kilitleniyor"_ — ölçüldü, `size === 0` erken dönüşü **davranış için gereksiz** (`has()` boş kümede zaten `false`); anlamsız mutasyon **gerçek riskle** değiştirildi (koşulu ters çevirmek). ② _"içe aktarma atlamıyor"_ — bekçide **ölçütü yoktu**: çağrının varlığı sonucun KULLANILDIĞINI göstermiyor; üç ölçüt eklendi (süzülmüş liste yazılıyor · atlananlar raporlanıyor · sayı yazılandan). ✅ **HALİL TESTİ GEÇTİ 01.09.2026.** |
| **K125** | **ZAMAN TABLOSU EN YENİ ÜSTTE · [KOD KOŞTU 01.09.2026 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ Kullanıcı: _"tabloların devamı en yeni tarihi üst tarafa koymalı, diğer tablolarda da görünüm bu şekilde olsun."_ ⭐ **GRAFİK İLE TABLO AYNI DİZİYİ TERS OKUYOR VE İKİSİ DE DOĞRU:** grafik soldan sağa zamanı çizer (ters çevrilse yükselen seri DÜŞÜYOR görünür), tablo bir DÖKÜMDÜR ve dökümde göz önce en son olana bakar. ⛔ **TERS ÇEVİRME ORTAK GÖVDEDE** (`tabloNoktalari`), çağıranda değil — aynı `noktalar` dizisini hem grafik hem tablo kullanıyor; çeviren taraf karışsaydı grafik sessizce ters çizilir ve eğri yine "makul" görünürdü. ⛔ Gövde **kopya alıyor**: yerinde `reverse()` aynı diziyi kullanan grafiği bozardı. 📏 **KAPSAM ÖLÇÜLDÜ — KURAL HER YERE UYGULANMADI:** ters çevrilen tek tablo operasyon grafiğinin dökümü. Bilerek eski→yeni kalanlar ve gerekçeleri: **hakediş** (`dueDate` bir ÖDEME KUYRUĞU — en yakın vade önce; ters çevirmek en uzağı başa koyardı) · **nakit takvimi** (ileriye bakar) · **satış detayı / iade yazışması** (tek kaydın HİKÂYESİ, ileri okunur) · **kart borcu** (sıralama ekstre ve taksit HESABINI besliyor, gösterim değil). `/satislar` ve `/alimlar` zaten yeni→eski. ⚠ **ISI HARİTASI DOKUNULMADI:** satırları kanal, sütunları zaman — sütun ekseni grafik gibi kronolojik okunur. ⚠ **BİR BEKÇİ KIRMIZI YANDI VE HAKLIYDI — SUSTURULMADI:** `operasyon:dogrula` "tablo GRAFİĞİN dizisini geziyor" ölçütü `noktalar.map(` arıyordu ve satır SIRASINI değiştirmeyi de yasaklıyordu. Ölçütün koruduğu değişmez **KÜME**dir (tablo grafiğin kümesinin aynısını gösterir, kırpılmış alt küme değil), SIRA değil. Ölçüt **gevşetilmedi, daraltıldı**: kabul edilen tek dönüşüm ORTAK GÖVDE — serbest ifade kabul edilseydi `noktalar.filter(...)` de geçerdi. Ayrıca tablo gövdesinde çıplak `reverse()`/`sort()` yasaklandı. **Bekçi `panel:dogrula` 632 → 638 ölçüt · mutasyon 4/4 KIRMIZI** (ters çevirme kalktı · girdiyi bozuyor · tablo ham diziye döndü · GRAFİK ters çevrildi = yanlış yanma yönü). |
| **K126** | **GÜNLÜK OPERASYON DÖRT KALEM + 7 KUTU + SABİT ÜÇ KANAL · [KOD KOŞTU 01.09.2026 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ Kullanıcının verdiği TEK yeni özellik. **A)** Grafik dört kalem çiziyor: **satın alınan · mal kabul · satış · kargo** (+ toplam). ⛔ **BU "ALIM"IN ADINI DEĞİŞTİRMEK DEĞİL:** mevcut seri `receivedAt` ekseninde (gerçekten MAL KABUL), eklenen seri `purchasedAt` ekseninde — K114'te ölçüldü, ortanca **3 gün** ara ve yalnız **%1,4** örtüşme. ⛔ **AYRI SORGU ZORUNLU, TÜRETİLEMEZ:** mal kabulü yapılmamış **31 alımın** `receivedAt`i hiç yok; mevcut listeden süzmek onları sessizce düşürürdü. ⛔ **KDV SEKMESİNDE SİPARİŞ SERİSİ YOK** — indirilecek KDV mal kabulde doğar; konsaydı aynı alımın vergisi iki kez çizilirdi. ⚠ **TOPLAM DÖRDÜNÜ SAYAR:** sipariş + mal kabul çift sayım DEĞİL, aynı alımın iki ayrı günde iki ayrı işi. **B)** Seçili dönem kartı **7 kutu**: dört operasyon kalemi + Ciro + NET-1 + NET-2. Satın alınan kutusunun bağlantısı **ekseni adreste taşıyor** (`eksen=siparis`, K114) — varsayılan bir gün değişirse sessizce başka kümeye gitmesin. **C)** Pazaryeri sabit düzende **Trendyol · Hepsiburada · N11 satış olmasa da yerinde** (`0` yazarak). ⚠ **BU BİR REGRESYONUN ONARIMI:** K124'te tavan konulunca satışsız kanallar "açık sıfır" kartlarına düşüyor ve tavanla birlikte **ekrandan siliniyordu**; kullanıcı ekran görüntüsünde boş iki kutu çizip sordu. ⛔ Sabit üçlü ayrı bir liste değil, `KANAL_SIRASI`nın ilk üçü — ikinci liste açılsaydı sıra değiştiğinde ikisi ayrışırdı. **D)** İki sütun aynı yerde bitiyor (`items-stretch` + `h-full`), kullanıcı şartı. **Bekçi: `operasyon:dogrula` 71 → 86 · `panel:dogrula` 638 → 645 · `mal-kabul:dogrula` 33 → 37 · mutasyon 9/9 KIRMIZI.** ⚠ **BİR MUTASYON KAÇTI VE ÖLÇÜT EKLENDİ:** sabit düzeni ciro gibi dolduran senaryo bütün bekçilerden yeşil geçti — kaynak taraması "gövde çağrılıyor mu" diye soruyordu, "gövde NE DÖNDÜRÜYOR" diye değil; değer testleri eklendi. ⚠ **ÜÇ ÖLÇÜT ESKİDİ, SUSTURULMADI:** ① `kanalKipi,` SATIRLARINI sayan ölçüt (yeni bir çağrı üçüncü satırı ekleyince kırmızı yandı) çağrıya bağlandı ve penceresi **ölçüldü** (88 ↔ 739 karakter, 400 dardı → 1200); ② "gövdede TEK purchase sorgusu" ölçütü iki eksene ayrıştırıldı — korunan değişmez aynı: toplam ile grafik AYNI sorgudan; ③ `purchasedAt` istisna beyanı **tek cümleye kilitliydi** (elle tutulan liste), işaret sabit + gerekçe serbest hâline getirildi. |
| **K127** | **PARTİ MALİYETİ DÜZELTME · [KOD KOŞTU 01.09.2026 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ⛔ Kullanıcı bir satış detayında **₺340** birim maliyet gördü ve düzeltemedi: _"yanlış verilen verinin kullanıcı tarafından düzeltilememesi anlamsız."_ Haklıydı — **üç kapı da kapalıydı:** `/alimlar` düzenleme (partinin arkasında **alım kaydı yok**, `purchaseItemId` boş — onarım betiğinin açtığı parti) · "veri şüpheli" (işaretler, **düzeltmez**) · `/stok` düzeltme formu (stok ekler/çıkarır, **maliyeti değiştiremez**). ⭐ **BU, LEDGER DOKUNULMAZLIĞININ İSTİSNASI DEĞİL — KAPSAMI DIŞI:** snapshot dokunulmazlığı **doğru koşullarla hesaplanmış** bir damgayı korumak içindir; bir betiğin UYDURDUĞU maliyet o kapsama girmez, orada korunan geçmiş değil hatanın kendisidir. ⚠ **ADEDE DOKUNULMAZ** — yalnız birim maliyet damgası düzelir. ⛔ **ASIL MESELE: DÜZELTME ÇIKIŞLARA DA ULAŞIYOR.** 19.08 dersi yarım kalmıştı — alım ekranı `purchaseItemId` ile bağlı hareketleri güncelliyordu ama çıkışlar partiye `sourceMovementId` ile bağlı ve canlıda çıkışların **%0'ında** `purchaseItemId` dolu; düzeltme çıkışlara HİÇ ulaşmıyordu. Şimdi parti + ondan çekilmiş **bütün** çıkışlar birlikte damgalanıyor, sonra etkilenen satışların kârı `satisKarTazele` ile tazeleniyor. ⚠ **İKİ ADIM:** önce **önizleme** (kaç çıkış, kaç satış, kârın hangi YÖNE ne kadar kayacağı), sonra **açık onay kutusu** — geçmiş NET'lerin değişmesi sürpriz olmasın. ⚠ **İZ eski VE yeni değeri sebebiyle yazar**; geri alma ölçütü ize değil `sourceMovementId`'ye bağlı (yeniden hesaplanabilir). ⚠ Eylem **satış detayındaki "düşülen partiler" tablosunda** — sorunun görüldüğü yerde; ürün kartındaki açık parti listesi bu partiyi hiç göstermiyor çünkü tamamen tüketilmiş. Masaüstü + telefon (İlke #8). **Bekçi `parti-maliyeti:dogrula` 39 ölçüt · 3 bölüm · mutasyon 9/9 KIRMIZI** (sıfır maliyet kabul · sebep zorunluluğu kalktı · aynı maliyet yazılabiliyor · satışlar tekilleşmiyor · fark hep sıfır · **çıkışlar damgalanmıyor** · kâr tazelenmiyor · onay atlanıyor · çıkışın kimliği geçiyor). ⚠ **BİR BEKÇİ HAKLI OLARAK KIRMIZI YANDI:** `sunucu-eylemi:dogrula` — `"use server"` dosyası yalnız async fonksiyon dışa aktarabilir; sabit ve tip saf modüle taşındı (30.08'de bir sabit üç ekranı canlıda görünmez yapmıştı). |

### 01.09.2026 — K99 ve K90: panodaki metin bayattı, ÖLÇÜLDÜ ve kapatıldı

⚠ **İKİSİ DE "YAPILACAK" DİYORDU VE İKİSİ DE ÇOKTAN YAPILMIŞTI.** Bir
kalemin panoda durması, işin durduğunu göstermez — pano da doğrulanan bir
veridir. Kapanışı varsayımla değil **ölçümle** verdim:

- **K99** — panoda _"⏭ YAPILACAK: ① iki ölçütten hangisi doğru, tek kaynağa
  indir · ② ayrışmayı yakalayan ölçüt yaz"_ yazıyordu. Ölçüm: `izinler.ts`
  içinde **iki ölçüt de var, ayrı adlarıyla ve aynı dosyada** —
  `tamYetkiliMi` (satır 227) ve `sistemiAcabilirMi` (275), taban listesi
  `KILIT_ACMA_IZINLERI` (270) ve **boş-taban kapısı yerinde** (281:
  `if (…length === 0) return false`). `yetki-dogrula.ts` ikisine **20
  yerde** bağlı. ⭐ Karar "tek kaynağa indir" değil **AYIR** oldu ve gerekçesi
  anayasaya girdi: iki FARKLI soru vardı (_"sistemi kilitten çıkarabilecek
  biri kaldı mı"_ ↔ _"bu bakım rotasını kim açabilir"_) ve tek ölçüt,
  kilidi açabilecek meşru bir rolü "sahip değil" sayıp değişikliği
  engelliyordu. _(Anayasa: "iki soru varsa iki ölçüt olur — yeter ki adı
  sorusunu söylesin".)_
- **K90** — `StockMovement.updatedAt` sütunu için açılmıştı. **Migration'sız
  kapandı:** iz kapısı tek gövdeye alındı (`src/lib/iz.ts` → `izYaz`) ve
  `src/` altındaki **31 elle `auditLog.create` çağrısının hepsi** ona
  bağlandı. Bugün ölçüldü: `src/` içinde kalan 5 eşleşmenin **hiçbiri
  yazma değil** — 2'si açıklama satırı, 2'si Prisma'nın ürettiği belge
  örneği, 1'i `iz.ts`in kendi tek kapısı. ⛔ **AÇILIŞ ŞARTI KORUNUYOR:**
  izsiz bir hareket değişikliği şüphesi **ÖLÇÜLÜRSE** sütun açılır ve
  doğum tarihi beyan edilir; bugün o delik **desen yasağıyla** kapalı.
  _(Anayasa: "şema değişikliği en pahalı çözümdür" — merdiven inildi,
  sütuna gerek kalmadı.)_

| Kod | Konu | Panodaki son hâli (birebir) |
|---|---|---|
| **K99** | **İKİ FARKLI "TAM YETKİLİ" ÖLÇÜTÜ VARDI — anayasa tek ölçüt diyor · [KAPANDI 01.09.2026]** | 🕓 **[AÇILDI 30.08.2026, K98 kapısı kurulurken çıktı]** Anayasa açıkça şöyle diyor: _"Aynı ölçüt `lib/yetki/koruma.ts`'in kendini kilitleme korumasında da geçerlidir; iki yerde iki farklı ölçüt olmaz."_ **Ama var:** `koruma.ts` → `TUM_IZINLER.every(...)` · `scripts/yetki-bekci.ts` + seed'in sonradan-doğan dağıtımı → `FIRMA_IZINLERI`. Aradaki fark **sağlayıcı izinleri** (`saglayici: true`, bugün tek eleman: `destek.yonet`) ve bunlar firma rollerine **otomatik dağıtılmıyor**. ✅ **RİSK ÖLÇÜLDÜ VE ÇÜRÜDÜ — AYRIŞMA DURUYOR (30.08.2026, `npm run canli:yetki`):** kurduğum senaryo şuydu — _"CEO'da `destek.yonet` yoksa `tamYetkiliRolIdleri()` boş döner, `baskaSahipVarMi()` hep `false` verir ve kendini-kilitleme koruması meşru bir rol değişikliğini de engeller."_ Canlı ölçüm bunu **çürüttü:** `CEO 27/27 tam yetkili + SAĞLAYICI` · `Sahip 27/27 tam yetkili + SAĞLAYICI` · `Operasyon 12/27 kısıtlı (beklenen)`. Yani **iki rol de sağlayıcı iznini taşıyor**; `TUM_IZINLER` ölçütü bugün de tutuyor ve koruma kilitlenmiyor. ⚠ **AMA KALEM KAPANMIYOR — AYRIŞMANIN KENDİSİ DURUYOR.** Bugün ısırmamasının sebebi ölçütün doğruluğu değil, iki rolün TESADÜFEN sağlayıcı iznini taşıması. Ekrandan açılacak YENİ bir tam yetkili rol onu **otomatik almaz** (`otomatikDagitilacak` sağlayıcı izinlerini eliyor) ve o rolle açılan kullanıcı `koruma.ts` gözünde tam yetkili SAYILMAZ. ⏭ **YAPILACAK:** ① iki ölçütten hangisinin doğru olduğuna karar ver ve **tek kaynağa indir** · ② ayrışmayı yakalayan bir ölçüt yaz — bugün hiçbir bekçi iki tabanın ayrıştığını görmüyor · ③ K98'in kapısı (`FIRMA_IZINLERI`) karar hangi yöne çıkarsa ona hizalanır. ⛔ **K98'DE DÜZELTİLMEDİ, BİLEREK:** kendini-kilitleme koruması ayrı bir cephedir ve deneme rotasıyla birlikte değiştirilmesi paketin adının dışına çıkardı. K98 kendi kapısını `FIRMA_IZINLERI`ne bağladı (bekçi + seed ile aynı taban) ve gerekçesini koda yazdı. ─── ② **KAPANDI 01.09.2026 — ÖLÇÜT TEKE İNDİ.** 📏 **AYRIŞMA ÖLÇÜLDÜ:** 28 iznin **27'si firma izni**; fark tek sağlayıcı izni (`destek.yonet`). Ekrandan açılan, **bütün firma izinlerine sahip** bir rol için: `tamYetkiliMi(27)` → **true** (doğru), `TUM_IZINLER.every(27)` → **FALSE** ⛔ (eski ölçüt). Yani öyle bir rol "sahip" sayılmaz, `baskaSahipVarMi()` haksız yere `false` döner ve koruma **meşru bir rol değişikliğini engellerdi**. ⭐ **KARAR: `FIRMA_IZINLERI` DOĞRU TABAN — VE BU GEVŞEME DEĞİL DÜZELTMEDİR.** 27 iznin içinde `kullanici.yonet` ve `rol.yonet` **var**, yani o rol sistemi kilitten çıkarabilir. Korumanın sorduğu soru _"sağlayıcı mı"_ değil, **"sistemi açabilecek biri kaldı mı"** — `destek.yonet` (destek talebi yönetimi) o soruya cevap vermiyor. `koruma.ts` artık ortak gövdeyi (`tamYetkiliMi`) çağırıyor. ⛔ **ÇARE DOSYA LİSTESİ DEĞİL DESEN YASAĞI:** `lib/yetki` altında hiçbir gövde kendi tam-yetkili ölçütünü kuramaz (`TUM_IZINLER.every` yasak); yarın açılan üçüncü bir gövde de yakalanır. **Bekçi `yetki:dogrula` 55 → 64 ölçüt · mutasyon 6/6 KIRMIZI** (koruma eski ölçüte döndü · taban `TUM_IZINLER` oldu · `every` → `some` · sağlayıcı işareti kalktı · boş taban kapısı kalktı · taban boşaldı). ⚠ **BİR MUTASYON KAÇTI VE ÖLÇÜLEN ŞEY EKSİKTİ:** "boş taban kapısı kalktı" senaryosu yeşil geçti — boş KÜMEYLE sınamak boş TABAN dalını hiç çalıştırmıyor. İki ölçüt eklendi: taban **dolu olmalı** (≥20) ve gövdedeki kapı **yerinde durmalı**; ikisi de kırmızı yandı. |
| **K90** | **`StockMovement`'ta `updatedAt` YOK — bağ çevirisi izlenemiyor · [KAPANDI 01.09.2026 · MIGRATION'SIZ]** | 🕓 **[AÇILDI 29.08.2026, ÖLÇÜLDÜ]** Şemada yalnız `occurredAt` (iş anı) ve `createdAt` (yazılış anı) var. Bir hareketin `sourceMovementId`'si sonradan BAŞKA partiye çevrilirse **hiçbir iz kalmaz** — ne alan değişir, ne zaman damgası. ⛔ **BUGÜN SOMUT ZARARI ÖLÇÜLDÜ:** `axcali2723`'te bir parti iki kez tüketilmişti; ikinci tüketimin nasıl mümkün olduğu **cevaplanamadı**, çünkü ilk bağın ne zaman kurulduğu (ya da çevrildiği) sorulabilir değil. Teşhis tavana dayandı. ⚠ **VE BU LEDGER İLKESİYLE ÇELİŞMİYOR:** ilke tutarların değişmezliğini korur; `updatedAt` tutarı değiştirmez, **değişikliğin OLDUĞUNU görünür kılar**. `Purchase`'ta zaten var ve orada gerekçesi yazılı (_"`updatedAt` yalnız not düzeltmesi içindir"_). ⏭ **AÇILIŞ ŞARTI YOK — bu bir eksiklik, tercih değil.** Şema değişikliği en pahalı çözüm olduğu için merdiven inilecek: mevcut alanla türetilebilir mi (hayır, ölçüldü) → `AuditLog` yeterli mi (bağ çeviren betikler iz bırakmıyor, ölçüldü) → sütun. _(Anayasa: "şemadaki alan da bir iddiadır" — burada tersi: şemanın SÖYLEMEDİĞİ şey teşhisi kesiyor.)_ ─── ② **KAPANDI 01.09.2026 — MIGRATION'SIZ, ÖLÇÜLEREK.** 📏 **ÜÇ SORU SORULDU:** ① K127 izi ne yazıyor? → **ne · eski/yeni · neden · ne zaman ✓ · KİM ✗**. ② Sistem geneli? → `AuditLog` **721 kayıt, 478'inde `userId` DOLU**, 243'ünde boş; 31 çağrı yerinin **12'si** onu hiç doldurmuyordu — ve o 12'nin **DOKUZU İSTİSNA İZİYDİ** (`DONEM_ISTISNA_EYLEMI` · `SAYIM_KORUMASI_ISTISNASI`), yani bir insanın uyarıyı AŞTIĞINI kaydeden izler **kim aştığını söylemiyordu**. ③ `updatedAt`in tek başına cevaplayacağı soru? → **evet, bir tane: "bu hareket iz bırakmadan değiştirildi mi"** — ama yalnız gelecek için (geçmişte `updatedAt = createdAt` olur ve kanıtlayamayacağımız bir "hiç değişmedi" der). ⭐ **DAHA UCUZ VE DAHA GÜÇLÜ ÇARE SEÇİLDİ: deliği tespit etmek yerine KAYNAĞINDA kapatmak.** Ölçüldü — `src/` içinde `StockMovement` güncelleyen üç yol var ve **biri hiç iz bırakmıyordu**: `/alimlar` düzenleme, defterdeki maliyet damgasını `updateMany` ile değiştirip sessizce geçiyordu. **İKİ MEKANİZMA:** ① **`src/lib/iz.ts` → `izYaz`** — iz tek gövdeden geçer ve `userId`'yi KENDİSİ damgalar; **31 çağrı yerinin tamamı** buraya bağlandı. `null` ile `undefined` ayrı: `null` "oturuma bakma, kimse yok" (cron · betik), `undefined` "oturuma bak". Oturumsuz bağlamda `yetkiBaglami()` çöküyor → yakalanıyor, "oturum yok" olarak okunuyor, **uydurulmuyor**. ② **`iz:dogrula` desen yasağı** — `src/` içinde çıplak `auditLog.create` YOK, ve `StockMovement` güncelleyen her gövde iz bırakmak ZORUNDA. 33'üncü çağrı yerini yazan kişinin hatırlaması gerekmiyor. ⚠ **VE `/alimlar` İZİNE SINIRI DA YAZILDI:** o güncelleme yalnız `purchaseItemId` ile bağlı hareketlere ulaşıyor; partiden çekilmiş çıkışlar (`sourceMovementId`) K127'nin işi — iz bunu söylüyor ki okuyan "her yer düzeldi" sanmasın. **Bekçi `iz:dogrula` 8 ölçüt · mutasyon 4/4 KIRMIZI** (userId oturumdan çözülmüyor · oturumsuz bağlam yakalanmıyor · alımlar izsiz yazıyor · çıplak `auditLog.create` geri geldi). ⏭ **`updatedAt` AÇILIŞ ŞARTI:** izsiz bir hareket değişikliği şüphesi ÖLÇÜLÜRSE sütun açılır ve doğum tarihi beyan edilir. Bugün o delik desen yasağıyla kapalı. |

### 01.09.2026 — K26: yetim bekçi bağlandı, ve DESEN yasaklandı

📏 **ÖLÇÜLDÜ:** `scripts/kart-dogrula.ts` (352 satır, **48 ölçüt**) 16.08'den
beri duruyordu ve `package.json`da **hiçbir referansı yoktu.** Tur komut
listesini package.json'dan okuduğu için dosya **iki hafta boyunca hiç
koşmadı** — kredi kartı takvimi, son ödeme, taksit ve ekstre ölçütlerinin
tamamı sessizce korumasızdı. Bugün ilk kez koşturuldu: **48/48 yeşil**, yani
kod doğruydu; eksik olan yalnız BAĞLANTIYDI.

⛔ **SEBEP HATA DEĞİL, AD ÇAKIŞMASI:** `kart:dogrula` komutunu **ÜRÜN kartı**
bekçisi (`urun-karti-dogrula.ts`) aldı; kredi kartı bekçisi referanssız kaldı.
"Kart" bu depoda **iki farklı kavramın adı** — ve dosyanın kendi başlığı hâlâ
_"Çalıştırma: npm run kart:dogrula"_ diyordu, yani belge de yanlış yeri
gösteriyordu. _(31.08'de `donem.ts` ile birebir aynı sınıf: aynı kelime iki
kavram.)_ Komut `kart-borcu:dogrula` oldu ve başlığa niye değiştiği yazıldı.

⭐ **ASIL İŞ DÜZELTME DEĞİL, DESEN YASAĞIYDI.** Tek dosyayı bağlamak bu
vakayı kapatırdı ama **bir sonrakini kapatmazdı**; yarın yazılan bir bekçi
aynı sessizlikle yetim kalabilirdi. Yeni bekçi `bekci-yetim:dogrula` tersten
kuruludur: _`scripts/` altındaki HER `*-dogrula.ts` / `*-bekci.ts` /
`*-kontrol.ts` dosyasına ulaşılabilmeli_ — komutla ya da tur içindeki bir
bekçinin `import`uyla. Liste tutmaz. _(Anayasa: "bekçi ölçütü elle tutulan
liste değil, tersten kurulur".)_

⚠ **VE İLK YAZIMI İKİ KEZ YANLIŞ YANDI — ÖLÇÜMLE DÜZELTİLDİ:**
① `yetki-bekci.ts`yi yetim ilan etti; ölçüldü, o bir **kütüphane** —
`yetki-dogrula.ts` onu içe alıyor, yani her turda çalışıyor. Ölçüte içe
aktarım grafiği eklendi. ② _"bekçiye işaret edip tura girmeyen komut"_
ölçütü `prebuild` ve iki `canli:` komutunu suçladı; üçü de **tasarım**
gereği öyle. Soru düzeltildi: komut değil, **DOSYA** tur içinden koşuyor mu.
Kalan dördü `BEKCI SINIFI: BAGIMSIZ — <gerekçe>` ile beyan edildi;
**gerekçesiz muafiyet kırmızı yanıyor.**

🧪 **MUTASYON — 5 geçerli senaryo, 5'i de kırmızı:** komut geri alındı ·
muafiyet gerekçesiz bırakıldı · komut tur DIŞINA taşındı (bağlı ama koşmaz) ·
içe aktarım tanıma kaldırıldı (**ters yön: yanlış yanma**) · listeye
eklenmeden yeni yetim dosya doğdu. ⚠ **BİR SENARYO GEÇERSİZ SAYILDI:**
bekçinin KENDİ `yetimler.push` satırını silen mutasyon yeşil geçti — ama bu
bekçinin kusuru değil, benim kurgu hatam: **bir bekçi kendi ölçütünün
silinmesini yakalayamaz**, o dairesel bir beklenti. Kontrol koşumu (ölçüt
yerinde + aynı yetim veri) **kırmızı** yandı; ölçütün taşıyıcı olduğu böyle
kanıtlandı.

| Kod | Konu | Panodaki son hâli (birebir) |
|---|---|---|
| **K26** | 🧹 **`scripts/kart-dogrula.ts` HİÇ koşmuyor** | **ÖLÇÜLDÜ 21.08.2026.** 12 KB'lık "KART BORCU DOĞRULAMA" dosyası; kendi başlığında _"Çalıştırma: `npm run kart:dogrula`"_ yazıyor **ama o komut başka bir dosyayı koşuyor** (`urun-karti-dogrula.ts` — ürün kartı). İki farklı şey "kart" adını taşıyor ve biri sessizce yetim kalmış. Kart borcu tarafı `kart-odeme:dogrula` (121 kontrol) ile kısmen kapanıyor. **Karar:** ya npm girdisi açılır ya dosya silinir — ikisinden biri, ama _"duruyor"_ üçüncü seçenek değil. |

### 01.09.2026 — Halil saha turu: 14 madde geçti (kullanıcı onayı, artifact kanıtı)

✅ **KULLANICI ONAYI KAYITLI.** Saha listesi (artifact `1a760bde`) şunu yazıyor:
_"İlk 14 madde 01.09.2026'da koşuldu ve hepsi geçti."_ Gerçek cihaz + canlı
adres (`axc-seven.vercel.app`, sürüm `cbdd13c`) — anayasanın üç şartı sağlandı.

⛔ **AMA "HEPSİ GEÇTİ" KAPSAMIYLA OKUNDU — SAYFANIN KENDİSİ ÜÇ KALEMİ DIŞARIDA
TUTUYOR** ve bu yüzden onlar kapanmadı:

| Kalem | Niye kapanmadı |
|---|---|
| **K98 · B** | `VERITABANI_YOK` ve `SUNUCUYA_ULASILAMADI` yolları **tetiklenemiyor**. Sayfa bunu kendisi yazıyor: _"tetiklenemeyen bir yol geçti sayılmaz."_ A yolu (`SUNUCU_HATASI`) 30.08'de geçmişti; kalan dört yol açık. |
| **K50** | Kod tamam, **depo düzeni çizilmedi** — kılavuzdaki dört sorunun cevabı gerekiyor. |
| **K43** | Sayfada **geçti/kaldı maddesi DEĞİL**: _"o bir gözle yapılacak ölçüm."_ Sonuç bildirilmedi, kalem açık. |

⚠ **VE `K121` DE KAPANMADI — AMA BAŞKA SEBEPLE.** Ekran testi GEÇTİ; kalan iş
`gece-kanal-karsilastirma.ps1` için **Windows Görev Zamanlayıcı görevinin
tanımlanması** — ekran değil işletim adımı. Satır panoda kaldı ve kuyruğu
buna daraltıldı. _(Anayasa: "kapatılamayan madde kutunun tamamına olan güveni
eritir" — o yüzden kalan iş NE olduğu yazılarak bırakıldı.)_

Kapanan iki kalem:

| Kod | Konu | Panodaki son hâli (birebir) |
|---|---|---|
| **K123** | **KARGO BARKODU OKUMA HIZI · [KOD KOŞTU 01.09.2026 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ Kullanıcı bir Trendyol kargo etiketi gösterip _"bu barkodları okumakta hâlâ zorluk çekiyor"_ dedi. ⚠ **İLK ŞÜPHELİ BİÇİM LİSTESİYDİ VE SUÇSUZ ÇIKTI** — iki kez oradan yanmıştık (25.08 `ITF`, 31.08 `UPCA`), bu sefer değildi: kod `7260036664117470` **16 haneli**, `Code128`/`ITF` ikisi de listede ve **defterde tam eşleşmesi var** (509 satışın kargo kodu 16 haneli). 📏 **ÖLÇÜLDÜ — SORUN BİÇİM DEĞİL HIZ:** kod bulunmayan kare (1920×1080, koyu dokulu zemin — kullanıcının fotoğrafındaki gibi) `tryHarder` ile **668 ms**, onsuz **146 ms**. Döngü 250 ms'de bir tetikleniyor ama önceki kare bitmeden yenisi başlamıyor → sistem barkoda **saniyede ~1,5 kez** bakıyordu, telefon CPU'sunda çok daha az. 📏 **VE YÖN ÖLÇÜLDÜ (kısıt çevrilmeden önce):** zxing writer ile gerçek barkod üretilip **20 senaryoda** denendi (net · bulanık · ağır bulanık · DÖNÜK · dönük+bulanık · TERS · 2 px/modül · 1,2 px/modül × Code128/ITF) — **20'sinde de sonuç AYNI**, süre farkı **3×–14×** (en kötü 1848 → 118 ms). ⭐ **SEBEBİ:** `tryRotate` · `tryInvert` · `tryDownscale` zxing'de **AYRI bayraklar ve zaten açık**; dönük/ters/küçük kareyi kurtaran `tryHarder` değil. ⛔ **AMA YETENEK ATILMADI — ÖLÇÜM SENTETİKTİ:** ard arda **8** kare okunamazsa BİR kare zor ayarla taranıyor; emniyet duruyor, bedeli ~2 saniyede bir yavaş kare. ⛔ **ÇÖZÜNÜRLÜK DÜŞÜRÜLMEDİ** — ölçüldü ve reddedildi: 960×540 kareler 3,4× hızlı ama modül başına piksel yarıya iner ve ölçümde **1,2 px/modül okunmuyor**; hızı oradan almak okunabilirliği harcamak olurdu. ⛔ **BİÇİM LİSTESİ DE DARALTILMADI** — matris biçimleri yalnız `tryHarder` ile pahalıydı (11 biçim hızlı ayarla 146 ms), kısaltmak kapsam kaybettirirdi. **Bekçi `kamera:dogrula` 50 → 71 ölçüt · mutasyon 9/9 KIRMIZI** (zorKareMi hep true · hep false · hızlı karede tryHarder açık · tryRotate/tryInvert/tryDownscale kapatıldı · biçim listesi daraltıldı · okuyucu gövdeyi çağırmıyor · sayaç okumada sıfırlanmıyor). ⚠ Bir ölçüt **eskidiği için** kırmızı yandı ve susturulmadı, güncellendi: çapa `kareyiCozumle(canvas, video)` idi, üçüncü argüman eklenince tutmadı; çapa çağrıya bağlandı ve pencere **ölçülerek** 700 → 2600 karaktere çıkarıldı. ⏳ **HALİL TESTİ:** aynı etiketi gerçek telefonda `/okut` ve `/paketle` ekranlarında okut — okuma belirgin hızlanmalı. |
| **K124** | **PANELDE 3 KANAL KARTI + `/kanallar` DÖKÜM SAYFASI · [KOD KOŞTU 01.09.2026 · ✅ HALİL TESTİ GEÇTİ 01.09.2026]** | ✅ Kullanıcı: _"burada sadece 3 tane kart görünsün, devamını isterse başka bir sayfada görsün. Sabitte 1) Trendyol 2) Hepsiburada 3) N11; ciro ise en büyükten en küçüğe."_ ⭐ **TAVAN SIRALAMADAN BAĞIMSIZ ÇALIŞIYOR** — kesme sıralamadan SONRA yapılıyor, yani sabit düzende ilk üç Trendyol · Hepsiburada · N11, ciro kipinde en büyük üç. İkinci bir sıralama yazılmadı; kip değiştiğinde ekran ile kesme ayrışırdı. ⛔ **AYRI BİR BORU HATTI YAZILMADI:** `/kanallar` panelin KENDİ gövdesini çağırıyor (`yalnizKanallar` bayrağı) ve ondan yalnız kanal ızgarasını tavansız çizmesini istiyor. İkinci bir sorgu/eşleme yazılsaydı iki yerde iki hesap olur ve bir gün sessizce ayrışırlardı — panelin en temel sözü **"sayı = liste"**. ⚠ **BEDELİ BEYAN EDİLDİ:** döküm sayfası panelin BÜTÜN hesabını koşturuyor ama yalnız kanal bölümünü çiziyor; nadiren açılan bir ekran için kabul edilebilir, sayıların ayrışması değildi. ⛔ **ADRES BEYAZ LİSTE TUTMUYOR:** bağlantı panelin o anki bütün parametrelerini aynen taşıyor — beyaz liste olsaydı yarın eklenen bir süzgeç listeye girmediği için sessizce düşer ve döküm BAŞKA BİR KÜMEYİ gösterirdi. ⚠ **BİR TUZAK ÖLÇÜMLE YAKALANDI:** ilk yazımda bağlantı yalnız SATIŞI OLAN kanal kuyruğunu sayıyordu; canlıda o sayı **tam 3** (TY · HB · N11) ve açık sıfır kartları **2** (Amazon · Elden Satış) — yani bağlantı HİÇ çizilmez, o iki kart panelden sessizce düşer ve onlara ulaşacak hiçbir yol kalmazdı. Sayı artık **satışlı kuyruk + açık sıfır**. ⛔ **KAPI ROTADA:** `/kanallar` `sayfaIzni("satis.kar.gor")` istiyor (sayfanın tamamı para); yetkisiz istek 404 alıyor, rotanın varlığı bile sızmıyor — ve bu bekçi tarafından yakalandı, elle düşünülerek değil (`yetki:dogrula` "her sayfa yetki istiyor" kırmızı yandı). **Bekçi `panel:dogrula` 612 → 632 ölçüt · mutasyon 11/11 KIRMIZI.** ⚠ Bir mutasyon önce KAÇTI: `yalnizKanallar={false}` yapıldığında ölçüt yeşil kaldı çünkü yalnız ADI arıyordu; ölçüt bayrağın DEĞERİNE bağlandı (`={true}` ile de yeşil, `={false}` ve silinmesiyle kırmızı). ⏳ **HALİL TESTİ:** panelde 3 kart + "Tümünü gör · N kanal daha"; bağlantıya bas → `/kanallar` açılmalı, dönem ve sıra kipi KORUNMALI, tüm kanallar + satışı olmayanlar görünmeli. |

### 01.09.2026 — K41 ve K41a kapandı · K43'ün bekçi tarafı düzeltildi

- **K41** — `11473322212` iade tipi. 24.08.2026'da AXCALI'nın cevabıyla çözüldü
  (_"değişim oldu, para bizde kaldı"_): iade para iadesi gibi hesaplanmıştı,
  değişime çevrildi, NET-2 `−377,38 → +1.714,83`. Üç kök neden aynı gün bulundu
  ve üçü de düzeltildi. Kalem kapanış kaydını **taşıyordu ama açık listede
  duruyordu** — etiketi bayattı.
- **K41a** — gönderi numarası (`Sale.shipmentCode`). Canlıda, migration koştu,
  `arama:dogrula` 67 kontrol · **10 mutasyon, 10'u da yakalandı**. Açık ucu yoktu.

⭐ **K43 — KAPANMADI AMA YARISI DÜZELDİ, VE DÜZELEN YARI ASIL ARIZAYDI.**
Kalem _"yedi ekran sütun tavanının üstünde"_ diye duruyordu ve gerçek ölçüt
piksel genişliği olduğu için bekleniyordu. Ölçüm başka bir şey gösterdi:
**bekçinin kendisi elle tutulan DÖRT dosyayı sayıyordu**, oysa depoda
`<TableHeader>` taşıyan **24 dosya** var. Yedi ekran "biliniyordu" ama
sekizincisi yarın eklenseydi **sessizce yeşil** kalırdı.

Liste kaldırıldı, yerine beyan kondu. ⚠ **Tavan körlemesine uygulanmadı** —
yedi ekranı birden kırmızı yakmak, ölçülmemiş bir kısıtla çalışan ekranları
kilitlemek olurdu _(anayasa: "bir sınırın yönü ölçülmeden çevrilmez")_. Beyan
**sayıyla** okunuyor ve yedisi her koşumda **tutanak** olarak basılıyor, yani
muafiyet saklanma yeri değil.

⚠ **PİKSEL ÖLÇÜMÜ AÇIK — VE BİR ÖLÇÜM DENENİP TERK EDİLDİ.** Başlıkları
sözlükten çözüp karakter genişliğinden piksel tahmin etmeyi denedim;
başlıkların çoğu çözülemedi ve çözülemeyene 104px varsayarak "ölçtüm" demek
uydurma olurdu _(anayasa: "aykırı değer uydurularak düzeltilmez" — burada
eksik değer)_. Onun yerine **doğrulanabilir sinyaller** ölçülüp her ekranın
beyanına yazıldı: kaç sütun sağa yaslı sayı, gövdede kaç rozet/ikon, boş
başlıklı eylem sütunu var mı. Gerçek cihazdaki bakış artık hangi ekranda ne
aranacağını bilerek yapılır.

🧪 **Mutasyon 5/5 kırmızı** — ikisi önce kaçtı, ikisinin de sebebi ölçüldü:
biri **benim kurgu hatamdı** (gerekçeyi kısaltan mutasyon satırın yalnız
başını değiştiriyordu; tamamı kısaltılınca kırmızı yandı), öteki yine
**dairesel bir beklentiydi** — bekçinin kendi sayı kontrolünü silen senaryo;
kontrol koşumu (ölçüt yerinde + bayat veri) kırmızı yanarak ölçütün taşıyıcı
olduğunu gösterdi.

| Kod | Konu | Panodaki son hâli (birebir) |
|---|---|---|
| **K41** | **`11473322212` iade tipi — ✅ ÇÖZÜLDÜ 24.08.2026** | ✅ **CEVAP AXCALI'DAN GELDİ:** _"Değişim oldu, para bizde kaldı, yeni ürün gönderildi, hasarlı ürün çöp oldu."_ İade **para iadesi** gibi hesaplanmıştı; **değişime** çevrildi. **ÖNCE:** `KAYIP_GELIR −2.980` · `KOMISYON_IADE +439,55` · `STOPAJ_IADE +24,83` · NET-2 **−377,38**. **SONRA:** ciro ve komisyon DURUYOR, yalnız `MALIYET_GERI +1.799` ve `IADE_KARGO −101` kaldı · NET-2 **+1.714,83**. Fark **+2.092,21**. ⚠ **KÖK NEDEN ZİNCİRİ, ÜÇÜ DE AYNI GÜN BULUNDU:** ① iade formunun ön-doldurması GEREKÇEYE bağlıydı, müşteri sebebi `HASARLI` olduğu için ayrılan değişim ürünü forma hiç taşınmadı; ② motor değişimi tek satırdan anlıyor (`degisimMi = kalem.degisimMaliyeti !== null`), alan boş gelince `false`; ③ iade para iadesi gibi hesaplandı. Üçü de düzeltildi (ön-dolu artık VERİYE bakıyor). ⚠ **SNAPSHOT DOKUNULMAZLIĞI BURAYA UYMADI VE SEBEBİ YAZILDI:** o ilke DOĞRU koşullarla hesaplanmış damgayı korur; bu damga YANLIŞ GİRDİYLE hesaplanmıştı, korunacak olan geçmiş değil hatanın kendisiydi. ⚠ **`MALIYET_GERI` KALDI VE DOĞRU:** eski mal fiziken döndü, maliyeti geri geldi; sonra K38 ile hurdaya düşüp kayıp DÖNEM tarafına yazıldı (fire zararı ₺1.799). Aynı lira iki kez düşmüyor. 📌 Ledger'a dokunulmadı: yalnız kesinti dökümü (fotoğraf) ve NET damgası yeniden yazıldı; iz `AuditLog`ta önceki/yeni değerlerle. |
| **K41a** | **Gönderi numarası — ✅ [KOŞTU] 24.08.2026** | 📦 **CANLIDA.** `Sale.shipmentCode String? @unique` — migration koştu (33 migration · 470 kolon doğrulandı · damga güncellendi). **Sayım 125 → 125, dolu 0** (beklenen: kod satıştan SONRA oluşuyor, geri doldurulmaz). Yeni satış formunda + satış detayında **sonradan** girilebilir, ikisinde de **okutulabilir**. `/okut` varyant bulamazsa satış kimliğinde arar → sonuç **tekil** (`@unique`) → **Paketlendi doğrudan o satıra**. `/satislar` araması da bulur. ⚠ **"AYRI LİSTE YAZMA" NİYETİ KORUNDU, MEKANİZMA DEĞİŞTİ:** `kodKosulu` beş yerden çağrılıyor ve hepsi `ProductVariant` sorguluyor; gönderi no bir `Sale` kimliği. Liste **TEK** (`KOD_ROLLERI`), yayım kapsama göre ayrıldı (`ROL_KAPSAMI` **exhaustive** — altıncı rol derlenmeden eklenemez, nitekim beşinciyi eklerken `alanAdi` sözlüğü derhal kırıldı). 🧪 `arama:dogrula` 67 kontrol · **10 mutasyon, 10'u da yakalandı.** |

### 02.09.2026 — Maliyet doğrulama turu KAPANDI: 7/7 teyitli, düzeltme 0

📏 **ŞÜPHE ÖLÇÜM SONUCU DEĞİL, KAYNAĞIN YAZILI OLMAMASIYDI.** Yedi partinin
maliyeti "belgesiz" diye listelenmişti; kullanıcı yedisini de barkodla
doğruladı ve **yedisi de sistemde yazan değerle kuruşuna aynı** çıktı.
Düzeltilecek hiçbir şey yoktu.

| Barkod | Değer | Ürün |
|---|---|---|
| `3168430275010` | 759,90 | DeliBake kek kalıbı |
| `6939236348423` | 1.792,00 | Stanley shot bardak seti |
| `9723484564032` | 796,00 | Korbell bebek bezi çöp kovası |
| `8697975600803` | 2.361,50 | Tefal Easyblend |
| `8683650330486` | 1.275,00 | Refika Swiss Crystal |
| `8683650003847` | 427,48 | Cake Pro döküm kek kalıbı |
| `8699131860571` | 1.199,00 | Schafer Black Stone tava seti |

⭐ **VE BU BİR SONUÇTUR — SESSİZCE GEÇİLMEDİ.** Teyit yazılmasaydı liste aynı
satırları yarın da sorardı; sönmeyen bir uyarı okunmaz olur ve listenin
tamamına olan güveni götürür. Yeni iz: **`MALIYET_TEYIDI`** (doğum tarihi
02.09.2026). Damga partinin **o günkü** `unitCostAmount` değerini taşır —
maliyet değişirse teyit **düşer** ve satır listeye geri gelir; karşılaştırma
kuruşuna, tolerans yok. _(Anayasa K6.)_

⚠ **MEVCUT `VERI_DOGRULANDI` MEKANİZMASI BİLEREK KULLANILMADI:** kapsamı
açıkça dar (_"yalnız `veriSupheli`"_) ve hedefi SATIŞ kaydı; buradaki hedef
bir STOK HAREKETİ. Genişletmek, dar tutulmasının gerekçesini çiğnerdi.
_(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_

⛔ **BENİM İKİ HATAM ÖLÇÜMLE YAKALANDI:**
1. **Envanter betiği teyitlerin yarısını okumuyordu** — kapsamı (A+B),
   kullanıcıya verdiğim listeyle (A+B+sayım partileri) **ayrışmıştı**.
   C kümesi eklendi; 6/6 → 7/7 okunuyor. _("Sayı = liste".)_
2. **Dışarıda bırakılan küme görünmüyordu** — C satışa gidenlerle sınırlı,
   ama basılmayan **66 parti** artık ekranda sayılıyor.
   _("Sıfır satır gizlenmez".)_

⛔ **VE ASIL DERS ANAYASAYA GİRDİ — "ZAMAN İÇİNDEKİ FİYAT FARKI ŞÜPHE
ÜRETMEZ".** Stanley'nin ₺1.792'sini _"fiyatlar yükselir, düşmez"_ diye
şüpheli ilan etmiştim. Kullanıcı çürüttü: _"Fiyatlar düşebilir yükselebilir.
Kampanya takip edip kampanya döneminde alan, satan ve 2. kampanya döneminde
aynı döngüyü yapan bir firma."_ İki alım iki ayrı kampanyadan; **ikisi de
doğruydu.** Bir adım daha gitseydim doğru bir kaydı "düzelterek"
bozacaktım — ve bozulma düzeltme kılığında geldiği için fark edilmeyecekti.
📏 Kodda bu varsayımın olmadığı ayrıca **ölçüldü** (`veri-supheli.ts`
dağılımdan besleniyor, `urun-zemini.ts` trend hesaplamıyor); kusur akıl
yürütmeye aitti ve açılış şartıyla birlikte yazıldı.

⭐ **BETİK TEKRAR-KOŞULABİLİR:** aynı damgayı taşıyan iz varsa yenisi
yazılmaz. İkinci koşumda 6 satır atlandı, yalnız yeni olan yazıldı.

---

## ✅ K171 — PROMOSYON ALIMI: BEDAVA KALEM ₺0 BEYANIYLA — **KAPANDI 06.09.2026**

> ⚠ **SATIRLAR BİREBİR TAŞINDI, ÖZETLENMEDİ** — 20.08 ve 01.09'da alınan
> taşıma kararı burada da geçerli.

**KAPANIŞ — Halil el testi, 06.09.2026 (gerçek cihaz + canlı adres):**
① alım formundaki promosyon kutusu maliyeti **0'a kilitliyor** ✓ ·
② `PROMO-K171B-…` alım detayında **"Promosyon (₺0)"** etiketi var ✓ →
kullanıcı kararı: _"K171 tamamen kapandı."_

⚠ **③ BU TURDA EKRANDA AYRICA TEYİT EDİLMEDİ** (Arzum/Huawei satış
detayında NET hesaplı, NO_COST rozeti yok). Kanıtı 05.09'un veri
düzeltmesinden geliyor: 3 satış NO_COST→CALCULATED, ledger/FIFO tuttu,
NET-2 kargo dahil +₺6.799,54 ve başka rakam oynamadı — Halil onaylı.
Kapanış kullanıcının kararıdır; neyin **ekranda**, neyin **ölçümle**
doğrulandığı burada ayrı yazılıdır ki altı ay sonra bakan biri ikisini
karıştırmasın. _(Anayasa: bir sayı etiketiyle taşınır — "teyit edildi" ile
"ölçüldü" farklı fiillerdir.)_

### Panodan inen kayıt — birebir

_Yalnız başlık düzeyi indirildi (## → ###) ki bu bölümün altına otursun;
metnin tek satırı elden geçmedi._

### 🔶 K171 — PROMOSYON ALIMI: BEDAVA KALEM ₺0 BEYANIYLA · 05.09.2026 · [KOD KOŞTU — Halil testi bekliyor]

> **Halil teyidi (03.09):** Arzum Tostçu ×2 + Huawei Freebuds _"bedava
> geldi"_ — promosyon malı gerçek, defterde alımı HİÇ yoktu (NO_COST).

**KURULAN:** alım formunda kalem başına **"Promosyon (bedava geldi —
maliyet 0)"** kutusu (İlke #11: sessiz sıfır değil AÇIK BEYAN —
işaretlenince maliyet alanı 0'a kilitlenir ve pasifleşir; elle 0 girilirse
form "Promosyon kutusunu işaretleyin" der). Alım detayında **"Promosyon
(₺0)"** etiketi. FIFO/stok/kâr otomatik izler. + deploy-bekci katman H
(tablo adı harf uyumu). **KANIT:** 5+1 mutasyon kırmızı · migration
canlıda koştu · build ✓.

─── ② **K171b VERİ DÜZELTMESİ KOŞTU** (05.09, Halil onayı): 3 satış
NO_COST→CALCULATED — promosyon alımı ₺0 + parti `occurredAt=soldAt` (nota
"gerçek geliş bilinmiyor" — uydurma tarih kesinlik taklidi yapmaz).
Ledger/FIFO tuttu, NET-2 kargo dahil **+₺6.799,54**, başka rakam oynamadı.
(Kapsam dersi anayasada: düzeltme partisi yasağı İLK kaydı kapsamaz.)
Canlıda bugün **4 promosyon kalemi** ölçüldü: `PROMO-K171B-…-1/2/3`
(Arzum ×2 + Huawei) + `PROMO-KARCHER-…` (05.09 23:41, Karcher RM 503).

**HALİL TEST LİSTESİ (canlı adres):**
① Alımlar → yeni alım → kalem satırında "Promosyon (bedava geldi —
   maliyet 0)" kutusu; işaretle → maliyet alanı 0 yazar ve kilitlenir
   (KAYDETMEDEN çık — form davranışı yeterli).
② Alımlar → `PROMO-K171B-…` kayıtlarından birini aç → kalemde
   **"Promosyon (₺0)"** etiketi.
③ Arzum Tostçu / Huawei Freebuds satış detayında NET artık hesaplı
   (NO_COST/hesaplanamadı rozeti YOK).


---

## ✅ K172 — İADE KDV ETKİSİ AYRI GÖSTERİLİR — **KAPANDI 06.09.2026**

> ⚠ **SATIRLAR BİREBİR TAŞINDI, ÖZETLENMEDİ.**

**KAPANIŞ — Halil, 06.09.2026:** test listesinin İKİ maddesi de teyitli —
① sipariş `11538106902` → _"düzelmiş"_ · ② sipariş `4866824058` → _"var"_.

⚠ **PANO "Halil testi bekliyor" DİYORDU VE BU BAYATTI.** Teyit çoktan
alınmıştı; panoya yazılmadığı için kalem açık göründü ve kapanışı ancak
kullanıcı söyleyince oldu. Anayasa panonun **niyeti** durum sanmasını
yasaklıyor; burada ters yönü yaşandı — **gerçekleşen bir sonuç panoya hiç
geçmedi.** İkisi de aynı kusurun iki yüzü: pano ile gerçek ayrışırsa pano
kurgu üretir.

> **DERS:** teyit **alındığı anda** panoya yazılır. "Sonra işlerim", bir
> kalemi gereksiz yere açık tutar ve aynı testi ikinci kez istetir.

### Panodan inen kayıt — birebir

_Yalnız başlık düzeyi indirildi (`##` → `###`); metnin tek satırı elden
geçmedi — başlıktaki "Halil testi bekliyor" ibaresi de o günkü hâliyle
duruyor._

### 🔶 K172 — İADE KDV ETKİSİ AYRI GÖSTERİLİR · 06.09.2026 · [KOD KOŞTU — Halil testi bekliyor]

> **Halil (iade muhasebe spec'i):** _"iade KDV'si ayrı gösterilmeli."_

**KURULAN:** türetme gövdesi `src/lib/iade-kdv.ts` → `iadeKdvEtkisi(net1,
net2) = net1 − net2` (motor formülünün tersi; iki MEVCUT snapshot alanının
farkı — **sütun AÇILMADI**, anayasa: türetilebilen için şema en pahalı
çözüm; şemaya yalnız gerekçe yorumu girdi). Satış detayı iade bloğunda her
iadede **"İade KDV etkisi: ₺X"** satırı; net1/net2'den biri boşsa satır
çizilmez (uydurma sıfır yok). Negatif = satış KDV'si geri geldi, ödenecek
KDV azaldı (olağan iade). Ölü `KOMISYON_KDV_IADE` etiketi kaldırıldı
(0 kayıt, ölçüldü); `DEGISIM_MALIYET` kaldı (1 kayıt).

**KANITLAR:** bekçi `iade-kdv:dogrula` (değer testi + gösterim çağrısı +
"şema açılmadı") · 3 mutasyon iki yönlü kırmızı · build ✓ · push+deploy ✓
(06.09 09:28) · `canli:yetki` 28/28 (06.09). Beklenen ekran rakamları
**gerçek gövde çağrılarak canlı snapshot'lardan ölçüldü** (06.09).

**HALİL TEST LİSTESİ (canlı adres, gerçek cihaz):**
① Satışlar → sipariş **11538106902** (05.09 iadesi — K170 vakası) → detay →
   iade bloğunda NET satırlarının altında: **İade KDV etkisi: −₺907,22**.
② Sipariş **4866824058** (04.09 normal iade) → aynı yerde: **−₺254,51**.
③ Rakam birebir tutmalı — tutmayan tek rakam testi düşürür.

