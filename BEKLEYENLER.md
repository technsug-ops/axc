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
| **H21** | **Pano bölünmesi** | ✅ **YAPILDI 20.08.2026** — bu dosya açık işler, [ARSIV.md](ARSIV.md) geçmiş. _Kalem bir sonraki turda silinecek._ |

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
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K8** | **Hakediş eşleştirme mekanizması** | ⛔ **[KOMUT] H3'e bağlı — ~20.09'a kadar iş göremez.** Anahtar = sipariş no (biçim doğrulandı: HB 10 hane, TY 11 hane). Rapor/`--uygula` ayrımı; bağlanamayan kalemler **adıyla** beyan edilir. Bugün boş çalışacağını bilerek yazılacak. |
| **H11** | **Bağsız hakediş yığını büyüyor** | ⚠ Gecikme sayımı dışındaki kalem 19.08 sabahı 67, akşamı **168**. Yığın büyüdükçe sistemin "alacağım ne" sorusuna cevabı küçülüyor. K8 ile birlikte çözülür. |
| **K18** | **Sipariş no çakışması — SİSTEM OPERATÖRÜ YANLIŞA ZORLADI** | ✅ **KÖK SEBEP BULUNDU + DÜZELTİLDİ 20.08.2026.** Kullanıcı anlattı: siparişi girdi → hata fark etti → **iptal etti** → aynı numarayla yeniden girmek istedi → sistem _"bu sipariş mevcut"_ deyip **reddetti** → başka çıkış olmadığı için sona `0` ekledi. **Bu parmak hatası DEĞİL, tasarım kusuru:** `satisKaydet`'teki çakışma kontrolü `iptalTarihi`yi süzmüyordu. **DÜZELTME (şemaya dokunulmadı):** kural saf işleve çıktı (`siparisNoCakismaHukmu`), iptalli çakışma artık **ayrı hüküm** veriyor ve ekran _"o satışın iptalini geri alın"_ diyip **iptalli satışa bağlantı** veriyor. Test: `iptal:dogrula` 38 → **43**, mutasyon (iptalTarihi görmezden gelinsin) **2 kontrolü kırmızı yaktı.** ⚠ **VERİ DÜZELTMESİ HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K20** | 🔴 **STOK 1 EKSİK — beklenen sayı ÖLÇÜLDÜ** | **CANLI HATA 20.08.2026; kod düzeltildi, VERİ duruyor.** `11518018178`'in iptali geri alınırken stoktan **2 adet** düştü (satış 1 adetlik). ⚠ **DÜN "fiziksel sayım yap" demiştim — artık gerek yok, sayı iki bağımsız yoldan çıktı:** ① FIFO açık partileri **4** diyor (ledger 3). ② Aritmetik: alınan `2+1+2 = 5`, satılan `1`, düzeltmelerin tamamı birbirini götürüyor (`-2+2` ve `-1-1+2`) → **5 − 1 = 4.** **Doğru stok 4, ledger 1 eksik.** Sayım yine yapılabilir ama körlemesine değil — beklenen değer belli. |
| **K21** | 🔴 **MALİYETSİZ SATIŞ — maliyet SİSTEMDE VARMIŞ** | `11518018178` NET-2 **3.188,75** gösteriyor, doğrusu ~**190**. ⚠ **DÜN "alımın maliyeti neydi" diye sormuştum — sormamalıydım, sistem biliyor:** `ALM-NON-260813-02` · sipariş no `297577854427` · RECEIVED · **2 × 3.599**. **Kaybolan maliyet değil, BAĞ:** 17.08'de mal kabul edildi (parti 3599 damgalı) → 19.08 06:07 _"mükerrer kayıt"_ diye `-2` düzeltildi → 06:18'de geri eklendi ama **maliyetsiz**. Maliyetsiz doğan partiyi FIFO tüketti → `SALE_OUT.unitCostAmount = null`. **Doğru birim maliyet: 3.599.** ⚠ Bu satış şu an ciroya/kâra **şişik** giriyor. |
| **K22** | 🔴 **İKİ DEFTER AYRIŞIYOR — hayalet parti** | **ÖLÇÜLDÜ 20.08.2026, katalog geneli: 72 varyantın 2'sinde ledger ≠ FIFO, ikisi de `+1`.** ① `OYU-LG-598P-01` (ledger 3 / FIFO 4) — **dünkü hata:** fazla düşen `ADJUSTMENT`, 09:36'daki _"HATA DÜZELTME"_ ile **zaten tükenmiş** bir ayna partisini tüketmeye çalıştı; ledger `-1` yazdı, FIFO'da karşılığı olmadı. ② `axcali1667` (ledger 2 / FIFO 3) — **17.08 kalıntısı:** ayna hareket `sourceMovementId` taşıyor (`kaynak=VAR`), yani kodda gerekçesi yazılı **eski hayalet hatasından** kalma, düzeltmeden ÖNCE yazılmış. ⚠ **TÜKENMİŞ PARTİYİ TÜKETME DURUMU HÂLÂ SESSİZ** — adet doğrulaması dünkü senaryoyu engelliyor ama bu ayrı bir kusur ve kendi kontrolünü hak ediyor. |
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
- **Ölçüm anı:** rapor tarafı **donmuş**, sistem tarafı **akıyor** — aynı gün iki koşum 8→9 verdi. Her kıyasta iki damga yazılır.
