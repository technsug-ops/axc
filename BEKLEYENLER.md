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

## 🔴 KARAR BEKLEYEN — sırada bu var

| # | İş | Durum |
|---|---|---|
| **A3** | **AŞAMA 3 — pazaryeri API'si açılsın mı?** | ⏳ **GEREKÇE TAMAM, KARAR SENDE.** Ölçüm bitti, tartışılacak yeri kalmadı: **1–20 Ağustos'ta Trendyol'a 143 sipariş geldi, Selliora'da 38'i var** (sipariş numarasıyla birebir eşleştirme — barkod/pencere/alt küme tartışması yok). 105 sipariş sistemde hiç yok. Elle giriş, en aktif ayımızda bile yetişmiyor. **Keşif ağustosun kapanmasını beklemiyor** (TY API uçları · yetkilendirme · sınırlar · salt-okuma kapsamı). |

---

## ⏸ HALİL'E BAĞLI — kod işi kalmadı

| # | İş | Ne gerekiyor |
|---|---|---|
| **H3** | **Satışlarımızın ödendiği dosya** | 🕓 **[BEKLİYOR] ~20.09 SONRASI.** Ödeme dosyası siparişten **28–34 gün sonra** yayımlanıyor; "ağustos dosyası" haziran/temmuz siparişlerini taşıyor (ölçüldü: TY ortanca 28 gün · HB ~34 gün). **İstenecek:** ~20.09 sonrası TY ödeme dosyaları + HB ekstresi. ⛔ Erken yükleme bağsız yığını büyütür, hiçbir şey bağlamaz. |
| **H8** | **HB hizmet bedeli — soru değişti** | 🕓 **[BEKLİYOR] eylül ortası HB ekstresi.** Ölçüldü: hesabı kesilmiş 99 siparişin yalnız **14'ünde** ₺12,60 kesilmiş; motorumuz **%100'ünden** kesiyor. Koşul hiçbir dosyada görünmüyor. **Kural DEĞİŞTİRİLMEDİ** — sıfıra çekmek de en az mevcut hâli kadar dayanaksız. Kapanış: 13 HB satışımızın ekstresi düşünce satış satış kıyaslanır. |
| **H10♻** | **RUTİN: her Salı/Cuma tarife dosyasını indir** | ♻ **SÜREKLİ.** Tam dilimli ileri tarife arşivden **inmiyor** — o hafta indirilmezse bir daha elde edilemez ve `Fiyat dene` o dönem için simülasyon yapamaz. Yükleme: `npm run canli:tarife-yukle`. |
| **H16** | **Canlı tur** | Kart sırası · yapışkan çubuk · döküm görüntüsü · kıyas ibaresi — hepsi deploy'da, gerçek cihazda bakılacak. |
| **H17** | **Yedek — ilk gece doğrulaması** | Dış zamanlayıcı kuruldu, test 200 verdi. `/ayarlar/disa-aktarma` → **kırmızı eksik gün kutusu kaybolmuş olmalı.** |
| **H18** | **Melontik ölçütü** | Çapraz teyit için **gerçek** Melontik çıktısı. _Sunumdaki rakamlar demoydu; doğrulanmamış ölçüte göre motor bozulmak üzereydi._ |
| **H22** | ✅ **N11 kesintileri ÖLÇÜLDÜ — kapandı 22.08.2026** | Gerçek N11 hakediş ekstresi geldi ve denklem **kuruşuna** kapandı (9.599 − 1.535,84 − 115,19 − 76,79 − 79,99 = 7.791,19). Ölçülen: komisyon **%16** üstüne KDV yok · **Pazarlama Bedeli %1,20** · **Pazaryeri Bedeli %0,80** (bizde HİÇ yoktu) · vergi kesintisi = stopaj (KDV hariç %1). Matrah **KDV DAHİL** — stopaj satırıyla bağımsız doğrulandı. nesatilir'in `%1,258`i çürüdü. Simülasyon kuralı düzeltildi, rozet `REFERANS → OLCULDU`. ⚠ **KALAN İKİ İŞ, aşağıda K27 ve K28.** |
| **K27** | ✅ **N11 kuralları DEFTERE geçti — 22.08.2026** | Canlıya yazıldı: `PAZARLAMA_HIZMET %1,20` · `PAZARYERI_BEDELI %0,80`, ikisi de `SALE_AMOUNT` (KDV dahil matrah). `AuditLog → N11_KESINTI_YAZ`. Geri alma yolu hazır: `npm run canli:n11-kesinti -- --geri --uygula`. ⚠ **GEÇMİŞ SATIŞLAR DEĞİŞMEDİ** — snapshot dokunulmazlığı korundu. İki N11 satışı (`284353754425` NET-2 138,04 · `283855414424` NET-2 664,31) hâlâ kesintisiz rakamı taşıyor; tazelenirse toplam **~₺80,80 düşer**. **Yeniden hesaplamak KULLANICI kararı** — bkz. K29. |
| **K29** | 🕓 **İki N11 satışının NET-2'si tazelensin mi** | **KARAR BEKLİYOR.** O satışlar %2'lik kesinti daha DEFTERDE YOKKEN hesaplandı; yani snapshot yanlış değil, **eksik kuralla doğru**. _"İlke kendi kapsamının dışına uygulanırsa hatayı korur"_ dersi burada geçerli: snapshot dokunulmazlığı DOĞRU koşullarla hesaplanmış bir kaydı korur. Tazeleme yolu: satış detayı → **Yeniden hesapla** (her satış için ayrı, kullanıcı onayıyla). Tazelenmezse iki satışın kârı ~₺80,80 iyimser kalır ve raporlara öyle girer. |
| **K28** | 🕓 **N11 komisyonunda indirilecek KDV var mı** | **AÇIK SINIR, beyan edildi.** Motor N11 komisyonunu KDV İÇEREN sayıp %20'sini indirilecek KDV'ye yazıyor (₺150 komisyonda ₺25). Ekstre bunu söylemiyor: komisyon tek satır, KDV ayrımı yok. Yanlışsa NET-2 her N11 satışında ciro×%2,5 kadar kayıyor. **Kapanış: N11 komisyon faturası.** |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K8** | **Hakediş eşleştirme mekanizması** | ⛔ **[KOMUT] H3'e bağlı — ~20.09'a kadar iş göremez.** Anahtar = sipariş no (biçim doğrulandı: HB 10 hane, TY 11 hane). Rapor/`--uygula` ayrımı; bağlanamayan kalemler **adıyla** beyan edilir. Bugün boş çalışacağını bilerek yazılacak. |
| **H11** | **Bağsız hakediş yığını büyüyor** | ⚠ Gecikme sayımı dışındaki kalem 19.08 sabahı 67, akşamı **168**. Yığın büyüdükçe sistemin "alacağım ne" sorusuna cevabı küçülüyor. K8 ile birlikte çözülür. |
| **K23** | 🔴 **`yerlesim:dogrula` KIRMIZI — ve öncesinde de kırmızıymış** | **ÖLÇÜLDÜ 21.08.2026.** Masaüstü liste tablolarının **sütun tavanı 7** (ölçüm: 7 sütun ~1045px'e sığıyor, 8. taşırıyor). Bekçi şunu diyor: `alimlar 8` · `satislar 8`. ⚠ **Bu benim değişikliğimden ÖNCE de böyleydi** — `git stash` ile doğrulandı. Yani bekçi bir süredir düşük ve **rutin doğrulama listemde hiç yoktu.** _`i18n:kontrol`un çıkış kodu üretmemesiyle aynı sınıf: bekçi var, koşulmuyor._ **KARAR GEREKİYOR:** ① iki sayfada birer sütun `iki-satir` hücresine katlanır, ② tavan ölçülüp yükseltilir (gerçek piksel ölçümü tarayıcı ister, projede otomasyon yok), ③ bilinçli borç olarak beyan edilir. **Bugün hiçbiri yapılmadı, iş açılmadı.** |
| **K24** | 🕓 **Alım KDV oranı SNAPSHOT değil** | **AÇIK SINIR, beyan edildi 21.08.2026.** KDV sekmesi çalışıyor ama iki taraf farklı: **satış** oranı `SaleItem.vatRate` ile satış anında DONDURULMUŞ; **alım** oranı ürünün BUGÜNKÜ kategorisinden çözülüyor (`PurchaseItem`de oran alanı yok). Bir kategorinin oranı değişirse **geçmiş alımların KDV'si geriye dönük kayar** ve eski bir dönemin "ödenecek KDV"si bugün başka çıkar. Ekranda yazılı. **Çare:** `PurchaseItem.vatRate` snapshot alanı — şema işi, ayrı karar. ⚠ Bugün risk düşük: 18 kategorinin oranları mevzuata bağlı ve nadir değişir; ama değiştiğinde SESSİZ kayar. |
| **K18** | **Sipariş no çakışması — SİSTEM OPERATÖRÜ YANLIŞA ZORLADI** | ✅ **KÖK SEBEP BULUNDU + DÜZELTİLDİ 20.08.2026.** Kullanıcı anlattı: siparişi girdi → hata fark etti → **iptal etti** → aynı numarayla yeniden girmek istedi → sistem _"bu sipariş mevcut"_ deyip **reddetti** → başka çıkış olmadığı için sona `0` ekledi. **Bu parmak hatası DEĞİL, tasarım kusuru:** `satisKaydet`'teki çakışma kontrolü `iptalTarihi`yi süzmüyordu. **DÜZELTME (şemaya dokunulmadı):** kural saf işleve çıktı (`siparisNoCakismaHukmu`), iptalli çakışma artık **ayrı hüküm** veriyor ve ekran _"o satışın iptalini geri alın"_ diyip **iptalli satışa bağlantı** veriyor. Test: `iptal:dogrula` 38 → **43**, mutasyon (iptalTarihi görmezden gelinsin) **2 kontrolü kırmızı yaktı.** ⚠ **VERİ DÜZELTMESİ HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K25** | 🔴 **`yedek:dogrula` KIRMIZI — tarife tabloları yedeğe girmiyor** | **ÖLÇÜLDÜ 21.08.2026, iş açılmadı.** Bekçi diyor ki: `EKSİK: KomisyonTarifesi, KomisyonTarifeKalemi`. ⚠ **H10 ile doğrudan çakışıyor:** tam dilimli ileri tarife arşivden İNMİYOR — o hafta indirilmezse bir daha elde edilemez. Veritabanı giderse **o tarifeler kalıcı olarak kaybolur**, çünkü yedeğe hiç girmiyorlar. Bugüne kadar görülmemesinin sebebi: bu bekçi rutin doğrulama listesinde yoktu. **Karar gerekiyor:** iki tabloyu yedek listesine ekle. |
| **K26** | 🧹 **`scripts/kart-dogrula.ts` HİÇ koşmuyor** | **ÖLÇÜLDÜ 21.08.2026.** 12 KB'lık "KART BORCU DOĞRULAMA" dosyası; kendi başlığında _"Çalıştırma: `npm run kart:dogrula`"_ yazıyor **ama o komut başka bir dosyayı koşuyor** (`urun-karti-dogrula.ts` — ürün kartı). İki farklı şey "kart" adını taşıyor ve biri sessizce yetim kalmış. Kart borcu tarafı `kart-odeme:dogrula` (121 kontrol) ile kısmen kapanıyor. **Karar:** ya npm girdisi açılır ya dosya silinir — ikisinden biri, ama _"duruyor"_ üçüncü seçenek değil. |
| **K13c** | **HB'de zararına duran 6 ürün** | 🕓 Bugünkü fiyat + açık parti maliyetiyle NET-2 **negatif**: Philips 5000 10in1 (−46,11) · LEGO 101 Dalmaçyalı (−301,77) · LEGO Endgame (−289,07) · Hogwarts (−25,68) · LEGO "Yukarı Bak" (−291,92) · Hot Wheels Rhino (−58,13). **Fiyat mı yanlış maliyet mi — önce bakılır**, düzeltilmez. |
| **H12/H13** | **Hakediş teyidinde önce bakılacak satışlar** | `11331575354` (i9000 Ultra · 17.06 · **₺12.960** · oran %2,70 · "iade var" rozetli) — **tek başına üçlüden büyük.** Ayrıca `11493262226` · `11492798173` · `11492628481`. |
| **H14** | **Ödeme hizmeti hipotezi** | H2/K8 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı. |
| **H4** | **Philips kanal düzeltmesi — kalan yarısı** | Kanal taşıması ✓ (Halil yaptı). ⛔ **Oran düzeltmesi İPTAL — `%2,70` DOĞRU** (TY fiyat indirimi karşılığı komisyon indiriyor; `~₺721` tahmini geçersiz). Kalan: kanal-değişince-kâr-tazelenir düzeltmesi canlıya çıkınca doğrulanacak. |

---

## 🕓 ZAMANA / KOŞULA BAĞLI — bugün açılmaz

| # | İş | Açılış şartı |
|---|---|---|
| **H20** | **`soldAt` saat taşımıyor** | 🕓 **VERİ GELDİ, KARAR AÇIK.** TY sipariş dökümü saat taşıyor (144/144) ve K9'un iki sınır kalemi çözüldü (`11475234462` → 04.08 17:04 · `11518039572` → 18.08 20:58; ikisi de 08:00 sonrası → yeni pencere). **Şemaya saat ALINMADI.** Açılış: içe aktarma yazıldığında saat de alınsın mı — ayrı karar. |
| **K6** | **Eşik yeniden ölçümü** | Satış kalemi **200'ü geçince.** `veri-supheli.ts` eşikleri n=40 tabanından çıktı (p95 %154, p5 %44,8). Araç: `canli:bekleme-olcum`. _Eşik kaynağıyla anılır; taban büyüyünce kaynak eskir._ |
| **K7** | **`satis.veri.dogrula` ayrı izni** | **Faz 4 / RBAC.** Bugün `satis.duzenle` istiyor. Ayrı izin daha temiz ama iki bacaklı yetki işi doğurur ve tek kullanıcıda boş katmandır. |
| **K10** | **Pano kodu ataması elle** | 🧹 Kodlar elle veriliyor ve 20.08'de **iki satır da `H6`** oldu; çakışan kimlik panoyu taranamaz yapar. Çare: en büyük numaranın bir fazlası — betik ya da tek kaynaklı sayaç. |
| **K14t** | **TUZAK: hesap ADLA bulunuyor** | `panel.ts:251`. **Bugün güvenli** (arama kanal içinde, tek kanalda çakışan ad yok). **Açılış: tek bir kanala harf farkıyla ikinci hesap açılması** — MySQL harf duyarsız karşılaştırması o an ikisini birleştirir. |
| **K14c** | **Sessiz desen: kanal adına gömülü sözlük** | `canli-komisyon-envanter.ts:55`. Eşleşmezse **sessizce boş** döner ve boş dönüşü **makul görünür**. Düzeltilmiyor (iş değeri yok). **Açılış: kanal adının düzenlenmesi.** |

---

## 📌 Ölçüm kayıtları — iş değil, gerekçe

Bunlar kapanmış ölçümlerin **bugün geçerli** özetleri; ayrıntı arşivde.

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
