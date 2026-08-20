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
| H3 | **AĞUSTOS DÖNEMİ HAKEDİŞ DOSYASI** | 🔁 **YENİDEN TANIMLANDI 20.08.2026.** Eskisi "hakediş .xlsx" idi; ölçüm gösterdi ki **temmuz dosyaları kapsam dışı**. Halil'e net: **satışları sistemde olan dönemin** (ağustos) hakediş/ödeme dosyası lazım. Temmuz dosyaları yüklenebilir ama hiçbir satışla eşleşmez. |
| H4 | **Philips kanal düzeltmesi** | 🔁 **YARISI ÇÜRÜDÜ 20.08.2026.** Kanal taşıması ✓ (Halil yaptı). ⛔ **ORAN DÜZELTMESİ İPTAL — `%2,70` DOĞRU:** Trendyol her Salı tarife yayımlıyor ve fiyat indirimi karşılığı komisyon indiriyor. **`~₺721` tahmini GEÇERSİZ** — hiçbir kayıp yok. _Eski hâli:_ `11492798173` · `11493262226` HB'de kayıtlı ama TY biçiminde sipariş no taşıyor (HB aralığı `4.01–4.99 milyar`, bunlar `11,49 milyar`; ayrıca 10.08'de dört satış tek TY dizisinde). **Taşıma onaylı**, kanal-değişince-kâr-tazelenir düzeltmesi canlıya çıkınca yapılır. ⚠ `%2,70` sapması AYRI kusur — her iki kanalda da kayıtlı oran `%15`. |
| H7⚡ | **GEÇMİŞ TARİFE PENCERELERİ EKSİK** | ⚠ **ÖLÇÜLDÜ 20.08.2026: yüklü pencere 1 (14–18.08), satışlar 17.06–20.08, `54 satışın YALNIZ 24'ü` bir pencereye düşüyor.** Kullanıcı bildirdi: farklı dönemlerde **%1'lik kampanyalar** da olmuş. Kapsayan pencere yoksa sistem dilim/düşüklük hükmü VERMİYOR (doğru davranış) — ama o satışlarda oran denetimi de yok. Trendyol'un Salı/Cuma yayımladığı geçmiş tarife dosyaları yüklenmeli. |
| H8 | **HB hizmet bedeli paket başına mı?** | 🕓 **ÖLÇÜLMEDEN TAŞINMAZ.** TY'nin ₺13,19'u paket başına olduğu ölçüldü (`11361665302`: 2 paket → −26,38). HB'nin ₺12,60'ı için aynı ölçüm YAPILMADI ve varsayım yapılmadı — kural `PER_SALE` olarak duruyor. Ölçüm yolu: HB hakediş/panelinde bölünmüş bir siparişin hizmet bedeli. |
| H5 | **`sfsfsf` test kaydı** | 🧹 Temizlik — Halil onaylayınca silinir/iptal edilir. |
| H3⚡ | **BAĞSIZ HAKEDİŞ YIĞINI BÜYÜYOR** | ⚠ **ACİLİYET ARTTI.** Gecikme sayımı dışındaki kalem 19.08 sabahı **67**, akşamı **168**. Yığın büyüyor demek, hakediş↔satış bağı kurulmadıkça sistemin "alacağım ne" sorusuna verecek cevabı KÜÇÜLÜYOR demektir. H2 (hakediş `.xlsx` teyidi) sırayı öne alıyor. _Kayıt 19.08.2026._ |
| H3 | **DÖRT satış özel satır** | `11493262226` · `11492798173` · `11492628481` (Philips 5000, ~−721 TL) **+ `11331575354` — i9000 Ultra SkinIQ** |
| H3b | **⚠ İ9000 — TEK BAŞINA ÜÇLÜDEN BÜYÜK** | `11331575354` · Trendyol · 17.06 · **₺12.960** · oran **%2,70** · ~12 puan fark ≈ **~₺1.590 potansiyel şişkinlik** · üstelik **"iade var" rozetli**. Hakediş teyidinde ÖNCE bu bakılır. |
| H4 | **Ödeme hizmeti hipotezi** | H2 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı |
| H5 | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor |
| H6 | **Canlı tur** | Kart sırası · yapışkan çubuk · döküm görüntüsü · kıyas ibaresi (hepsi deploy'da) |
| H7 | **Yedek — ilk gece doğrulaması** | ✅ Dış zamanlayıcı KURULDU ve test 200 verdi. Yarın sabah `/ayarlar/disa-aktarma` → **kırmızı eksik gün kutusu kaybolmuş olmalı** |
| H8 | **Melontik ölçütü** | Çapraz teyit için GERÇEK Melontik çıktısı (sunum demo çıktı) |

### 🔧 BİZDE — karar bekleyen

| # | İş | Durum |
|---|---|---|
| K7 | **`satis.veri.dogrula` ayrı izni** | 🕓 **SaaS/RBAC kalemi — bugün AÇILMAZ.** Veri doğrulama bugün `satis.duzenle` istiyor. Ayrı izin daha temiz olurdu ama iki bacaklı yetki işi doğurur (izin anahtarı + seed + canlı senkron) ve tek kullanıcıda boş katmandır. Faz 4'te RBAC ile birlikte. _Karar 19.08.2026._ |
| K9 | **Dilim bilinçli GEÇMİŞ oran denetimi** | 🕓 **BEKLİYOR.** `supheliOran` uyarısı ve `?oran=supheli` süzgeci 20.08'de KALDIRILDI (eşiği çürüdü, %100 yanlış pozitif). Yerine geçmişe dönük denetim: her satış kalemi için, satış tarihindeki tarife penceresinde o fiyatın dilimini bul ve yazılı oranla karşılaştır. **Tarife yoksa hüküm verilmez.** Form tarafı zaten dilim bilinçli (`oran-uyarisi.ts`). |
| K8 | **H2 — hakediş eşleştirme mekanizması** | 🔨 **KÜÇÜK TUTULACAK.** Anahtar = sipariş no (biçim testi yapıldı: HB 10 hane, TY 11 hane, satış kodlarıyla BİREBİR uyumlu). Rapor/`--uygula` ayrımı, bağlanamayan kalemler ADIYLA beyan edilir (648 dersi). ⚠ **Bugün BOŞ çalışacağını bilerek yazılıyor** — doğru dosya gelince anında iş görsün. |
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
| 3 | API salt okuma | Örtüşme temiz · ⚡ **GEREKÇE ÜÇÜNCÜ KEZ ÖLÇÜLDÜ (20.08.2026): `245 / 50 / 0`** — 245 hakediş sipariş no, 50 satış kodu, **sıfır kesişim**. Biçimler BİREBİR uyumlu (HB 10 hane, TY 11 hane); sorun anahtar değil KAPSAM. Zincir tek yerden kopuyor: **elle giriş → kapsam boşluğu → hakediş kör → K-5 kapalı** |
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
