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
| **A3** | 🔴 **AŞAMA 3 — pazaryeri API'si açılsın mı?** | ⏳ **GEREKÇE AĞIRLAŞTI 22.08.2026: SORUN TEK KANALDA DEĞİL.** Ölçüm iki kanala genişletildi (`npm run canli:eksik-siparis`, salt okuma):<br>**Trendyol** `01.08→20.08` — 143 sipariş, bizde **38**, eksik **105** (%73,4)<br>**Hepsiburada** `03.08→15.08` — 51 sipariş, bizde **6**, eksik **45** (%88,2)<br>İkisinde de **okunamayan satır 0** — yani bunlar soru değil, KANIT. ⚠ Pencereler farklı, iki kanal birbiriyle KIYASLANMAZ; her rakam kendi penceresinde okunur. **Hüküm:** elle giriş yetişmiyor ve bu Trendyol'a özel bir hacim sorunu değil — daha az sipariş gelen HB'de oran daha da kötü. Keşif ağustosun kapanmasını beklemiyor. |

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
| **H23** | **İadeler ekranı — sekmeli düzen** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üç sekme (Bildirimler / İşlenmiş iadeler / Kırılım), durum süzgeci, süzgeç yalnız etkilediği sekmede. ⚠ **Panel rozeti 0 → 3 oldu** (ölçüt düzeltildi: `ITIRAZ_RED` bekleyen sayılmıyordu). Test listesi teslim raporunda, 9 madde. |
| **H24** | **Tema görünürlüğü — üst çubuk + zemin** | ⏳ **TESLİM EDİLDİ 23.08.2026, ONAY BEKLİYOR.** Üst çubuk kabuk renginde (telefonda temanın göründüğü tek yer), sayfa zemini bir kademe koyu. Test listesi teslim raporunda, 8 madde. |
| **H25** | **İade süreci — iki ölçüm kaldı** | ✅ **10 GÜNLÜK SAAT KAPANDI:** Aras takibi `(KG)` "yola çıktı 21.08 12:35" ile TY ekranının sayacı **25 saniye** farkla buluştu; rozet `BEYAN → OLCULDU`. ⏳ **Kalan ①:** 5. sayaç (geri gönderim) — birimi ("2 gün" mü "2 iş günü" mü) ve çıpası (ret kararı mı kargo kodu mu) belirsiz, **dolarsa ne olduğu da bilinmiyor**. Gereken: "Reddedilen" sekmesindeki bir iadenin detayı (ret tarihi + kargo kodu + kalan süre aynı ekranda). ⏳ **Kalan ②:** N11 — tecrübe yok, süresiz bekler. |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K8** | **Hakediş eşleştirme mekanizması** | ⛔ **[KOMUT] H3'e bağlı — ~20.09'a kadar iş göremez.** Anahtar = sipariş no (biçim doğrulandı: HB 10 hane, TY 11 hane). Rapor/`--uygula` ayrımı; bağlanamayan kalemler **adıyla** beyan edilir. Bugün boş çalışacağını bilerek yazılacak. |
| **H11** | **Bağsız hakediş yığını büyüyor** | ⚠ Gecikme sayımı dışındaki kalem 19.08 sabahı 67, akşamı **168**. Yığın büyüdükçe sistemin "alacağım ne" sorusuna cevabı küçülüyor. K8 ile birlikte çözülür. |
| **K24** | 🕓 **Alım KDV oranı SNAPSHOT değil** | **AÇIK SINIR, beyan edildi 21.08.2026.** KDV sekmesi çalışıyor ama iki taraf farklı: **satış** oranı `SaleItem.vatRate` ile satış anında DONDURULMUŞ; **alım** oranı ürünün BUGÜNKÜ kategorisinden çözülüyor (`PurchaseItem`de oran alanı yok). Bir kategorinin oranı değişirse **geçmiş alımların KDV'si geriye dönük kayar** ve eski bir dönemin "ödenecek KDV"si bugün başka çıkar. Ekranda yazılı. **Çare:** `PurchaseItem.vatRate` snapshot alanı — şema işi, ayrı karar. ⚠ Bugün risk düşük: 18 kategorinin oranları mevzuata bağlı ve nadir değişir; ama değiştiğinde SESSİZ kayar. |
| **K18** | **Sipariş no çakışması — VERİ DÜZELTMESİ** | ✅ Kod tarafı kapandı (kök sebep: çakışma kontrolü `iptalTarihi`yi süzmüyordu; ayrıntı arşivde). ⏳ **KALAN, HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K31** | **İade durum makinesi — EKRAN kaldı** | ✅ **MODEL CANLIDA** (23.08.2026): migration koştu, 3 yeni aşama + 6 alan, `rma:dogrula` 282→303, 11 mutasyon kırmızı. ⚠ **Bulgu:** şema ve kod `ITIRAZ_KABUL` için "ürün müşteride kalır" diyordu — YANLIŞ, ürün BİZDE ve geri gönderilecek; para doğruydu ama fiziksel iş görünmüyordu. ⏳ **KALAN — EKRAN:** yeni aşamaların girişi · son tarih uyarıları · "kargolanması gereken" kutusu · ret gerekçesi ve analiz sonucu seçimi. |
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
| **H20** | **`soldAt` saat taşımıyor** | 🕓 **VERİ GELDİ, KARAR AÇIK.** TY sipariş dökümü saat taşıyor (144/144) ve K9'un iki sınır kalemi çözüldü (`11475234462` → 04.08 17:04 · `11518039572` → 18.08 20:58; ikisi de 08:00 sonrası → yeni pencere). **Şemaya saat ALINMADI.** Açılış: içe aktarma yazıldığında saat de alınsın mı — ayrı karar. |
| **K6** | **Eşik yeniden ölçümü** | Satış kalemi **200'ü geçince.** `veri-supheli.ts` eşikleri n=40 tabanından çıktı (p95 %154, p5 %44,8). Araç: `canli:bekleme-olcum`. _Eşik kaynağıyla anılır; taban büyüyünce kaynak eskir._ |
| **K7** | **`satis.veri.dogrula` ayrı izni** | **Faz 4 / RBAC.** Bugün `satis.duzenle` istiyor. Ayrı izin daha temiz ama iki bacaklı yetki işi doğurur ve tek kullanıcıda boş katmandır. |
| **K10** | **Pano kodu ataması elle** | 🧹 Kodlar elle veriliyor ve 20.08'de **iki satır da `H6`** oldu; çakışan kimlik panoyu taranamaz yapar. Çare: en büyük numaranın bir fazlası — betik ya da tek kaynaklı sayaç. |
| **K34** | **Sevkiyat doğrulaması — KİLİTLİ** | 📦 Depoda paketlerken barkod okutulur; sistem **kargoya verilmemiş** siparişler arasında arar, bulamazsa **uyarır**. Depo kuralı geçerli: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_ **İş değeri:** yanlış ürün göndermenin maliyeti = iade + iki kargo + ceza + itibar; entegratörler bunu ayrı paket olarak satıyor, bizde bu kontrol hiç yok. ⛔ **AÇILIŞ ŞARTI: AĞUSTOS DEFTERİNİN KAPANMASI.** Kontrol "kargoya verilmemiş siparişler" kümesinde arıyor ve o kümenin **%73,4'ü sistemde yok** (TY `01.08–20.08`: kanal 143, bizde 38 — araç `canli:eksik-siparis`; HB'de oran **%88,2**). Doğru ürün paketlenirken sistem "bulamadım" diyecek; sebep yanlış ürün değil, **satışın hiç girilmemiş olması.** Uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı her seferinde elle onaylar ve iki hafta içinde **uyarıyı okumadan tıklamayı öğrenir** — o noktada mekanizma yanmıştır, gerçek bir yanlış üründe de aynı tıkla geçilir. **YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR.** ⛔ **ÖLÇÜLMEMİŞ DÖRT ŞEY** (kural yazılmayacak): ① barkod hangi kayda bakacak — EAN mi, Firma SKU mu, Kanal SKU mu? Halil'den depo etiketi fotoğrafı bekleniyor. ⚠ **Tek alana bağlanmayacak:** üçünde de aransın ve **hangisinde bulduğunu SÖYLESİN** — Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ② çok satırlı siparişte "bu kalemi okuttum" izi yok (bugün yalnız `shippedAt: null`). ③ elle onayın izi nereye — `AuditLog` mu, satışa alan mı? Şema merdiveni: önce ucuzu ölçülür. ④ defter eksik (yukarıdaki şart). |
| **K35** | **Firma etiketi basımı — KİLİTLİ** | 🏷 Firma SKU barkoda çevrilir, etiket basılır; ürünün üstünde İKİ barkod olur (EAN üreticinin, Firma SKU bizim). Sistemde bugün barkod **ÜRETİMİ/BASIMI YOK** — yalnız okuma var. ⛔ **AÇILIŞ ŞARTI: yazıcı ve etiket kararı.** Etiket boyutu bilinmeden basım ekranı tasarlamak, ölçmeden kural yazmaktır. Ölçülecek: boyut · yazıcı türü (termal/lazer) · SKU'ların Code128 uygunluğu. ⚠ **GEREKÇE DÜZELTİLDİ 23.08.2026 — ÖLÇÜMLE.** Mimarın gerekçesi şuydu: _"EAN ürünü tanımlar, hangi MALI elde tuttuğunu tanımlamaz; Firma SKU o boşluğu kapatır."_ **Şemada karşılığı yok:** `sku` · `barcode` · `companySku` **üçü de varyant başına ve `@unique`**; FIFO partisi `StockMovement`ta ve **hiçbir etiket partiyi tanımlamıyor** — motor en eski açık partiyi kendi seçiyor. Firma SKU okutmak da "bu mal" demez. ⚠ **İKİNCİ GEREKÇE DE ÖLÇÜMLE DÜŞTÜ:** "EAN'ı olmayan ürün" — canlıda **1086 aktif varyantın 1085'inde EAN var** (%99,9); tek istisnada stok yok. Firma SKU'su boş olan: **0**. ✅ **AYAKTA KALAN TEK GEREKÇE:** kullanıcı beyanı — _"istisna birkaç üründe EAN farklı olabilir"_ (pakettekiyle kayıtlı olan tutmuyor). **Bu bizim defterimizden ölçülemez** çünkü fark ancak okutunca görünür. ⭐ **K34a tam bunu ölçüyor** — bir hafta paketlerken kaç EAN tutmadığı sayılırsa K35'in iş değeri rakama döner. Yani K35'in gerekçesi K34a'nın çıktısıdır. ⚠ **ÜÇ ALANDA ARANACAK** (bu kural ayakta): EAN · Firma SKU · Kanal SKU — ve **hangisinde bulduğu SÖYLENECEK**. Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ⚠ **YENİ RİSK SINIFI — VE BU GEREKÇE SAĞLAM:** bugüne kadar bütün kimlikler DIŞARIDAN geldi (EAN üreticiden, Kanal SKU pazaryerinden). Basımla birlikte **ilk kez kimlik ÜRETEN taraf biz oluyoruz.** Yanlış basılmış etiket, yanlış girilmiş satırdan KALICIDIR: satır düzeltilir, etiket kutunun üstünde depoda durur ve altı ay sonra okutulur. Kapsama baştan girenler: ① **basılan her etiketin izi** (hangi SKU · ne zaman · kaç adet) — iki kez basılmış kod ya da hiç basılmamış SKU ancak bu izle bulunur; ② **yeniden basım TEKİL** — aynı SKU'nun ikinci etiketi AYNI kodu taşır, yeni kod üretmez. Bu koda gömülecek kural değil, açıkça verilmiş karardır. |
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
