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

## 🔴 K265 — CİRO ve NET-2 KARTI SEÇİLİ DÖNEME BAĞLI, GÜNLER EKSENDE · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _«Paneldeki bu kart filtrelere bağlansın; operasyon ve diğer
kartlar gibi seçilen tarihe göre grafik güncellensin. Grafiğin altında günler
belirlensin.»_

### ⛔ K257 ÇEVRİLDİ — GEREKÇESİ DURUYOR

K257 kartı **bugüne kilitli 14 güne** bağlamıştı («dönem süzgecinden bağımsız»)
— demo öyleydi. Kullanıcı kartın öteki kartlarla **aynı evrende** olmasını
istedi (İlke #10). Ölçüldü ve bir kusur da çıktı: 14 günlük seri zaten **dönem
sorgusundan** besleniyordu (`satislar` dönem kapsamlı) — «Bugün» seçilince 14
günlük eksende tek gün doluydu, kart kendi başlığını tutamıyordu.

### YAPILAN

- `donemCiroNetSerisi(satislar, pencere, kırılım)` — saf gövde; kovalar operasyon
  grafiğiyle **aynı gövdeden** (`kova` · `sonrakiKova` dışa açıldı) ve **aynı
  kırılımdan** (`operasyonKirilimi`: ≤31 gün GÜN, ≤92 HAFTA, sonrası AY). Pencere
  dışı satış iki uçta da elenir; ilk/son kova pencereye kırpılır. NET-2 `null`
  sıfır sayılmaz. Değer testi 8 (İstanbul günü · null · boş gün · dışı · HAFTA
  kırpma) — K257'nin testleri aynı senaryolarla pencereye taşındı.
- Kart: başlık **«Ciro ve NET-2 — {pencere}»** (Son 30 gün / Bu ay / …), seri
  `donemSatislari` (kanal + para süzgeci, hüküm kartlarıyla aynı küme).
- **Günler eksende:** `CizgiGrafik` `etiketTavani` prop'u (varsayılan 12 = eski
  davranış, öteki grafikler değişmedi); bu kart 31 → günlük kırılımda **her gün**
  yazılır. Hafta/ay kırılımında kova başı tarih; tam aralık ipucunda.
- Bekçi: K257 bloğu K265'e taşındı (8 değer + 6 kaynak ölçütü); harness 4
  mutasyon taşındı + 1 yeni (her gün etiketi kalktı).

⚠ **Yazı boyu:** kart 3/5 sütunda 1240 px'lik kadrajı küçültüyor; eksen yazısı
telefonda küçük kalabilir. Bu turda geometri değişmedi (K258 sütun kipinde
yapıldığı gibi 3/5 için ayrı kadraj sonraki adım) — Halil testinde bakılacak.

### HALİL TEST LİSTESİ

1. `/` → «Son 30 gün» seçin → kart başlığı **«Ciro ve NET-2 — Son 30 gün»**,
   x ekseninde **30 gün numarası** (her gün), iki çizgi.
2. «Bu hafta» seçin → başlık değişmeli, eksen o haftanın günleri; «Bugün» → tek
   nokta (o günün cirosu = hüküm kartındaki Brüt ciro).
3. Kanal süzgeci Trendyol → çizgi yalnız Trendyol; hüküm kartlarıyla aynı toplam.
4. «Son 3 ay» → hafta kovaları (başlangıç tarihleri eksende); operasyon
   grafiğiyle **aynı kova sayısı ve aynı tarihler**.
5. Bir noktanın üstüne gelin → tam tarih (ya da hafta aralığı) ipucunda.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (`Panel.ciroNetBaslik` tr+en;
`son14Baslik` silindi) · **kullanıcı kolaylığı: ✓** (İlke #10 · #12)

---

## 🔴 K266 — «KOMİSYON ORANI BOŞ» ve «KOMİSYON TARİFESİ» ŞERİTTEN ÇANA · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _«Bunları bildirimde gösterebilirsin, bugün yapacaklarımda
olmasına gerek yok: Komisyon oranı boş kanal SKU · Komisyon tarifesi.»_

### YAPILAN

- Şerit (`bugun-ne-yapmaliyim.ts`): iki anahtar çıktı (**7 → 5**); **süre/acele
  mekanizması** (yalnız tarife kullanıyordu) onlarla birlikte kalktı — yazıcısı
  kalmayan alan bırakılmadı. `CANA_TASINAN_GOREVLER` beyanı + **eski gerekçe
  aynen** kodda; K47/K230 adres gerekçeleri `UYARI_ADRESLERI`ne **taşındı**.
- Çan (`lib/uyari`): `oransizKanalSku` (amber · `/kanal-sku?eksik=1` · sayı
  gerçek: 38) ve `tarifePenceresi` (amber · `/ayarlar/komisyon` · **sayı bayrak:
  1**, kapsamsız kanal adedi değil — pencere yaklaşırken o sayı 0 olurdu ve aynı
  alan iki şey söylerdi; `UYARI_SAYISI_ANLAMSIZ`a girdi). İkisi de izinsiz görünür.
  «Acele» kararı yine saf kuraldan (`tarifeUyarisiVarMi`).
- Sayım **tek gövdeden**: `gorevSayilariniTopla` (tip genişledi) — iki yerde iki
  sayım yok. `tarifeKapsaminiOlc()` toplayıcının `Promise.all`ına girdi.
- Günlük özet: iki kalem «görev» bölümünden **uyarı** bölümüne geçti (aynı
  gövdeden besleniyor); `UYARI_BAGLAMI` +2, `GOREV_BAGLAMI` −2.
- `UyariOlcumleri`: taşınan iki ölçüm **isteğe bağlı** — eski ölçüm kümeleri
  (fixture'lar dahil) değişmeden derleniyor; taban doluluğu bekçide ayrı ölçülüyor.
- Sözlük: `Uyari.baslik_/eylem_` ×2 (tr+en); `Gorevler`den 4 anahtar + 2 kısa silindi.
- Bekçi: `uyari:dogrula` **7 ölçüt** (çanda · susma · taban · adres ekranı VAR ·
  toplayıcı besliyor · şeritte yok); `panel:dogrula` 6 ölçüt eskidi/çevrildi
  (gerekçeleri yorumda); harness süre mutasyonu «dal geri geldi»ye taşındı.

### HALİL TEST LİSTESİ

1. `/` → «Bugün ne yapmalıyım» şeridinde **5 çip**: Onay bekleyen · Paketlenecek
   · İade bildirimi │ Mal kabul · Kârı hesaplanamayan. «Komisyon oranı boş kanal
   SKU» ve «Komisyon tarifesi» **yok**.
2. Sağ üstteki **çan** → «38 kanal SKU'sunun komisyon oranı boş» (amber) satırı
   görünmeli; tıklayınca `/kanal-sku?eksik=1` açılmalı ve **38 satır** listelemeli.
3. Tarife penceresi bugün **temiz** olduğu için çanda «Komisyon tarifesi
   yenilenmeli» **görünmemeli**; pencere bitmeye 3 gün kalınca görünecek.
4. Çandaki toplam bir arttıysa artan o olmalı (oransız SKU).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (`Uyari` ×4 tr+en; `Gorevler` −6) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #16)

---

## 🔴 K268 — ALIMLAR SATIRI: ÜRÜN/KALEM/KART ORTA SÜTUNA, SATIŞLAR DÜZENİ KORUNDU · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _«alımlardaki ara boşluğa dikdörtgendeki bilgiler geçsin»_ ve
satışlar tablosunu göstererek _«buradaki düzeni koruyamaz mıyız»_. K235 alımları
satır kartına almıştı; ürün/adet/kalem/kart manşetin altındaki bağlam satırında,
tutar+durum+eylemler sağda — arada koca bir boşluk.

### YAPILAN

- `SatirKarti` **`sagGenis`** prop'u: sağ blok satırın kalanını alır
  (`sm:flex-[2] sm:min-w-0`); verilmezse eski davranış AYNEN — öteki 7 ekran
  değişmedi. Satışlar tablosuna dokunulmadı.
- Alımlar: ürün (kârlılık kartına bağlantı, uzun ad kırpılır) + altında
  «adet · kalem · kart» sağ ızgaranın **ilk, esnek** sütununda; sonra tutar ·
  durum · eylemler. Sütun sırası satışlar tablosuyla aynı okunur (tarih/kod ·
  hesap · ürün · tutar · durum · eylemler). Telefonda ızgara çözülür, akar.
- Bekçi (`satir-karti:dogrula`): `sagGenis` sınıfı · alımlar geniş+esnek ızgara ·
  ürün/kalem/kart bağlamda DEĞİL ortada.

### HALİL TEST LİSTESİ

1. `/alimlar` (masaüstü): her satırda solda **kod + sipariş no · tarih · hesap**,
   ortada **ürün adı** ve altında «N adet sipariş · N kalem · Kart ••1234», sağda
   tutar · durum rozeti · eylem düğmeleri — ortadaki boşluk kalmamalı.
2. Ürün adına tıklayınca kârlılık kartı açılmalı (K235 davranışı).
3. Uzun ürün adı kırpılmalı, üstüne gelince tam ad ipucu olarak çıkmalı.
4. `/satislar` tablosu **aynen** (değişiklik yok).
5. Telefonda alımlar satırı: bilgiler alt alta sarar, yatay kaydırma yok.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #3 · #9 · #12)

---

## 🔴 K264 — N11 «ÇEKİM KOŞMADI» YANLIŞ ALARMDI: BOŞ ÇEKİM DAMGA YAZAR, ROTA 503 · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09 09:58: panel _«N11 çekimi 660 DAKİKADIR koşmadı — zamanlayıcıyı
kontrol edin»_ diyor, cron-job.org her 2 dk **200 OK** — _«N11 normal çalışıyor
görünüyor, problem nedir?»_

### ÖLÇÜM (canlı iz, `scripts/tmp/n11-iz-olcum.ts`, salt okuma)

    N11_SIPARIS_ICE_AKTARMA  son damga 23.09.2026 23:58:13  (paket 1 · yazılan 0)
    damga/gün: 20.09 387 · 21.09 741 · 22.09 751 · 23.09 748  (= her 2 dk)
    24.09 00:00'dan sonra: 0 damga
    canli:n11-saglik → AÇIK/BOŞ  «paketler (200, kayıt yok)»

Zamanlayıcı ve N11 API sağlam. Çekirdek `sellerId`yi **paketlerden** okuyor;
paket yoksa `sellerIdler.length !== 1` → **`atlandi: "HESAP"`** → damga yok →
rota **200** → cron-job.org yeşil → panel damgaya bakıp _«koşmadı»_ dedi ve
kullanıcıyı zamanlayıcıya yolladı. Boş ile başarısız ayırt edilmiyordu
(anayasa: «boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim değildir»).

### YAPILAN

- `canli-n11-ice-aktar.ts`: **0 paket = başarılı koşum.** Hesap defterden çözülür
  (`channel N11` + `externalId` dolu, **tekil** — ölçüldü: AXCALI · 4534966; SEDA
  externalId'siz, kümeye girmez); damga `apiPaket: 0` ile yazılır; K168 onay
  kuyruğu boş çekimde de işler; özet `kip: YAZIM`. Tekil değilse HESAP dalı meşru.
- Üç cron rotası (`ty` · `hb` · `n11`): **`atlandi` → HTTP 503**, koştuysa 200.
  cron-job.org'un yeşili artık «koştu» demek; kimlik/hesap arızası kırmızı görünür.
- Bekçi: `ice-aktarma:dogrula` 5 ölçüt (dal sellerId kapısından ÖNCE · damga ·
  YAZIM özeti · hesap defterden · rota 503); `cron-yollari:dogrula` bölüm 3, küme
  desenden (`CekimKos(` çağıran her rota, taban ≥ 3). Mutasyon 2 (dal kapalı ·
  damga yok) `ice-aktarma-mutasyon`da; rota 503 elle mutasyonla sınandı.
- Panel cümlesi değişmedi: damga artık gerçekten «koştu» demek.

⚠ **TY ve HB aynı desende mi?** İkisi de `atlandi: HESAP` taşıyor; TY hesabı
hangi yoldan çözüyor ölçülmedi (siparişi hiç boş dönmedi). Açılış şartı: TY/HB'de
ilk boş çekim damgası kaçarsa aynı dal oraya da yazılır.

### HALİL TEST LİSTESİ

1. Deploy'dan 2–4 dk sonra `/` → sağ üstteki kırmızı **«N11 çekimi … DAKİKADIR
   koşmadı»** satırı **kaybolmalı** (N11 hâlâ 0 paket dönse bile).
2. cron-job.org → N11 işi geçmişi: koşumlar **200 OK** kalmalı; süre 1–3 sn.
3. Kontrol (isteğe bağlı): cron-job.org'da işi 1 kez elle tetikleyin → yine 200;
   panelde N11 damgası «1 dk önce» olmalı.
4. N11'de gerçek bir sipariş düşünce: paket sayısı > 0 → normal içe aktarma
   yolu; sipariş `/satislar`da onay kuyruğunda görünmeli (davranış değişmedi).

**mobil doğrulama:** ekran değişikliği yok · **i18n: ✓** (metin yok)

---

## 🔴 K272 — İÇ SAYFALAR TELEFON ①: BEŞ ORTAK BİLEŞEN · 25.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 25.09 (alımlar · ürünler · stok · iade ekran görüntüleri): _«panel kartlarındaki
yapıyı iç sayfalarda da yapabilir miyiz? Çok dağınık, farklı boylarda, farklı genişlikte,
yazılar taşıyor»_. Demo (tuval Telefon ④–⑥) onaylandı. Kök ortak bileşenlerdeydi;
önce onlar — masaüstü AYNEN, hepsi `max-sm` / `max-md` / `md:`.

| bileşen | telefonda | kapsadığı |
|---|---|---|
| `SatirEylemleri` + `EYLEM_SINIFI` | tek satır EŞİT ızgara, ikon üstte ad altta, 52 px | 7 sayfa (alımlar · giderler · iadeler · kartlar · satışlar · stok · ürünler) |
| `ListeKarti` | alanlar eşit kutu (3'ün katıysa 3 sütun, tek kalan satırı doldurur), eylemler tek satır, başlık 2 satırda kırpılır | 13 sayfa |
| `SatirKarti` | sağ blok tam genişlik — alımlardaki taşan ürün adı (K268 artığı) | 11 sayfa |
| `KodAramaKutusu` | tam genişlik, «Ara» / «Temizle» ikon | 13 sayfa |
| `ExcelIndir` | ikon, 44 px | 7 sayfa |

Bekçi: `satir-karti:dogrula` yeni bölüm (sayaçlı, 36 → 47): eylem sınıfı DEĞERLE (52 px ·
tam genişlik · masaüstü md:h-8 md:w-8) + bileşen kullanım blokları. Harness +7 mutasyon,
18/18; kayan bir eski çapa (sağ blok) taşındı.

### SIRADAKİ (aynı iş, ayrı paketler)
② stok süzgeçleri tek satır kayan gruplar · ③ iade kartı eylemleri («İtiraz sonucu» 3 eşit
kutu) · ④ sayfa başlıkları ve kalan formlar (tek tek bakılır, düzgünse dokunulmaz).

### HALİL TEST LİSTESİ (telefon, canlı)

1. `/alimlar`: her kartta eylemler **tek satır, 4 eşit kutu** (Detay · Düzenle · İptal · Mal
   kabul); «Mal kabul» alt satıra düşmüyor. Ürün adı kartın içinde, taşmıyor.
2. `/urunler`: Detay · Alım gir · Düzenle · Sil **tek satır**; «Sil» dokununca onay soruyor.
3. `/satislar`, `/stok`: kartın bilgileri **eşit kutularda**; boş kutu yok; eylemler tek satır.
4. Arama kutusu tam genişlik, ipucu yazısı kesilmiyor; sağında kamera ve **büyüteç ikonu**.
   Bir şey arayınca **X** çıkıyor, dokununca temizliyor.
5. Başlıkta «Excel indir» **ikon** (dokununca dosya iniyor).
6. Masaüstünde hiçbir şey değişmemiş olmalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni metin yok) · **kullanıcı kolaylığı: ✓**
(İlke #1 · #8 · #10 · #12)

---

## 🔴 K271 — HALKA KADRAJIN %39'U → %47'Sİ · 25.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 25.09: _«pazaryeri arttıkça yuvarlak ufalıyor»_. Sebep: halka kadrajın
GENİŞLİĞİNE göre ölçekleniyor; pazaryeri kartı uzayınca halka kartı da uzuyor
ama halka büyüyemiyordu. Darboğaz okların iki yanda ayırdığı ~100 birimlik yazı
payıydı. **Ölçüldü:** en uzun ad/tutar ≈ 80 birim. Oklar kısaldı (dirsek halkadan
22, yatay 12), yazı payı 90; R 76→95, kalınlık 30→32 → dış çap **182 → 222**
(kadrajın %47'si). Merkez rakam delikten türediği için kendiliğinden büyüdü.

Bekçi: oran ≥ %45 ve yazı payı ≥ 80 birim değerle sınanıyor; sınır testleri artık
sabit sayı değil dışa açılan sınırları okuyor. Mutasyon: R 76'ya dönüş → kırmızı.

### HALİL TEST LİSTESİ

1. Masaüstü `/` → «Ciro kanala göre»: halka belirgin büyük; kanal adları ve tutarlar
   kesilmeden okunuyor (sol/sağ kenarda).
2. «Bu hafta» ve «Son 30 gün» arasında geçin — halka boyu değişmemeli.
3. Merkezdeki toplam deliğin içinde; %59/%39 bant yazıları okunur.

**mobil doğrulama:** telefonda kompakt halka (K270), değişmedi · **i18n: ✓**

---

## 🔴 K270 — TELEFON DÜZENİ: EŞİT KUTU IZGARASI, HIZLI İŞLEMLER, SABİT ALT BAR, MENÜ · 25.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 25.09: Entegra / Trendyol / Hepsiburada satıcı uygulamalarını gösterip
_«alt butonların fonksiyonelliği, kartların boyutlarının düzenli olması hem güven
veriyor hem kullanım kolaylığı… bizde kartlar ve içindeki yazılar çok büyük, boşluk
çok, kart boyutlarındaki farklar özensizlik hissi veriyor… özellikle hızlı menü
tuşları çok efektif olabilir»_. Önce HTML demo istendi; tasarım tuvaline üç telefon
ekranı eklendi (açılış · aşağı kaydırınca · menü). Kullanıcı: _«sadece pasta dilimi
biraz büyüyebilir, bu şekilde mobili onaylıyorum»_ — halka büyütüldü, koda geçildi.

### YAPILAN — MASAÜSTÜ AYNEN, her değişiklik `max-sm` / `max-md` / `md:hidden`

- **Alt bar** (`alt-cubuk.tsx`): sabit, 5 sekme — Panel · Satışlar · **Okut** (ortada)
  · Alımlar · Menü; güvenli alan, 44+ px; içerik `pb-24` ile barın arkasına kaymaz.
- **Menü sayfası** (`/menu`): 4 sütunlu gruplar, sıra/gruplar sol menüyle **aynı
  kaynaktan** (`menuDuzeni` — `/ayarlar/menu`den değişince ikisi birlikte değişir);
  bekleyen iş ikon üstünde **rozet** (paketle · mal kabul · iadeler · kanal SKU, panel
  sayacıyla aynı gövde); arama ortak `KodAramaKutusu` (kamera).
- **İkon kataloğu** (`lib/menu/ikonlar.ts`): harita sol menünün içindeydi, üç
  tüketici doğunca tek gövdeye çıktı; sol menüde kopya kalmadı (ölçütü var).
- **Panel — telefon:** başlık yalnız ekran okuyucuda, alt satır gizli (çekim uyarısı
  görünür) · **dönem çipleri hep görünür**, tek satır, yatay kayar (kanal/kıyas
  «Süzgeçler»in arkasında) · **KPI 6 sütun: [ciro] [NET-1 · NET-2] [marj · satış ·
  iade]** — satırlar tam ve eşit; açıklama satırları telefonda gizli, rakam bir kademe
  küçük · **huni 4 eşit kutu** (iki tarih ekseni notu altta, 14.08 kuralı) · **görev
  3×2 eşit kutu** (Paketlenecek geniş; temiz kutu bağlantı değil) · **Hızlı işlemler**
  (Okut koyu · Paketle · Mal kabul · Yerleştir) · kanal sırası tek satır üç eşit düğme
  · **pazaryeri yatay kayan kartlar** (%80, bir sonraki kartın kenarı görünür) ·
  **kompakt halka** (halka solda, liste sağda — ok çizgili kadraj 358 px'te okunmuyordu).
- **Telefonda gizlenenler** (demo dışı; masaüstünde ve menüde duruyor): «Rafta var,
  vitrinde yok» afişi · günlük operasyon grafiği · ürün analizi · 12 aylık grafik.
- **44 px:** demo dönem çiplerini 36 px çizmişti — kural demodan önce gelir, çipler
  `h-11` (İlke #8). Bekçi ikisini de sayıyor.

### BEKÇİ

`panel:dogrula` **+26 ölçüt** (866 → 892): değer testleri (`sekmeAktifMi` · alt bar
sırası · hızlı işlemlerin adres+ikon tabanı) ve kullanım bloğuna daraltılmış kaynak
ölçütleri — KPI satır toplamları **6 · 3+3 · 2+2+2** tek ölçütte (boş hücre yok).
Eskiyen iki ölçüt gerekçesiyle çevrildi: ikon ölçütü artık DEĞERİ sınıyor (harita
kataloğa çıktı), huni penceresi sabit 3500 karakter yerine bloğun gerçek sonuna bağlı
(telefon sınıfları eklenince not pencereden düşmüştü — «pencere ölçülür»).
Harness: **+14 mutasyon** — 84/84 (14 yeni hepsi kirmizi yandi; iki kor nokta — ayni desen telefon + masaustu IKI yerde — harness yakaladi, olcutler yer basina sayiyor).

### HALİL TEST LİSTESİ (telefon, canlı adres)

1. `/` açılış: üstte **dönem çipleri tek satır** (Dün · Bugün · Bu hafta · Son 30 gün
   · Bu ay · Özel ▾), sağa kaydırılabilir; «Panel» başlığı ve uzun alt satır **yok**.
2. Para kartı: **ciro tam genişlik**, altında **NET-1 | NET-2 yan yana**, altında
   **marj | satış | iade üçü eşit**. Hiçbir satırda boş kutu yok; rakamlar tek satır.
3. Altında huni: **4 eşit kutu** (Satın alınan · Mal kabul · Kargoya verilen · Kargo
   bekleyen), kargo bekleyende yalnız sayı; tarih ekseni notu altta.
4. «Bugün ne yapmalıyım»: **3×2 kutu** — Paketlenecek iki kutu genişliğinde, diğerleri
   eşit; temiz olanlar soluk + ✓ ve **tıklanmaz**, bekleyenler tıklanınca listesi açılır.
5. **Hızlı işlemler**: 4 daire (Barkod okut koyu) — her biri kendi ekranını açmalı.
6. Pazaryeri: kanal sırası **tek satır üç düğme**; kartlar **sağa kaydırılıyor**, bir
   sonraki kartın kenarı görünüyor.
7. Ciro kanala göre: **halka solda, kanallar sağda liste** (ad · tutar · yüzde).
8. En altta **sabit bar**: 5 sekme; sayfa kaydırılınca bar yerinde kalır, son satır
   barın altında kalmaz. Bulunduğunuz sekme vurgulu (Satışlar'a girince Satışlar).
9. **Menü** sekmesi: arama (kamera ikonlu) + gruplar 4 sütun; Paketle / Mal kabul /
   İadeler / Kanal SKU üstünde **bekleyen sayısı rozeti** — panel şeridindeki sayılarla
   **birebir**.
10. `/ayarlar/menu`de bir öğenin grubunu değiştirin → telefon menüsünde de değişmeli.
11. Masaüstünde **hiçbir şey değişmemeli** (alt bar yok, eski düzen).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (`AltCubuk` ×6 · `MobilMenu` ×4 ·
`Basliklar.menu` · `Panel.hizliIslemler`; tr+en) · **kullanıcı kolaylığı: ✓**
(İlke #1 · #2 · #7 · #8 · #9 · #10 · #12 · #13)

---

## 🟡 K269 — `uyari:dogrula` ve `cron-yollari:dogrula` MUTASYON HARNESS'İ YOK · 24.09.2026 · [ELLE TUR KOŞTU — KALICISI AÇIK]

K264 ve K266 bu iki bekçiye **11 yeni ölçüt** ekledi; ikisinin de mutasyon
harness'i yok (ölçüldü: `scripts/*mutasyon*.ts` içinde ikisine de çapa yok).
Anayasa «yeni ölçüt mutasyonsuz teslim edilmez» diyor, bu yüzden bu turda
**elle mutasyon turu** koşuldu ve sonuç GÖRÜLDÜ:

    10/10 beklendigi gibi  ·  2 ZARARSIZ YESIL (harness saglamasi) + 8 ISIRDI
      - oransiz SKU candan dustu            - can adresi olmayan ekrana gidiyor
      - toplayici olcumu beslemiyor         - TY rotasi atlandi'da yine 200
      - tarife sayisi bayrak degil          - TY hakedis rotasi dusen saymiyor
      - anahtarlar serite geri geldi        - N11 rotasi 503 dalini kaybetti

Tur, harness disiplininin üç şartını taşıdı: deseni SAYAR (1 değilse
«UYGULANAMADI», yeşil saymaz) · mutasyonun diske YAZILDIĞINI doğrular ·
geri almayı **kopyadan** yapar (`git checkout` DEĞİL — commit edilmemiş işi
silerdi) ve geri yazıldığını doğrular. Bekçinin ÇÖKMESİ «ısırdı» sayılmaz.

⚠ **AMA ELLE TUR BİR SEFERLİKTİR — REGRESYONDA KIRMIZI YANMAZ.** Bugün
ölçüldü, yarın bu ölçütlerden biri körelirse kimse görmez.

**YAPILACAK:** `scripts/uyari-cron-mutasyon-kontrol.ts` (bu turun betiği
TS'e çevrilir), `package.json`a bekçi olarak eklenir — böylece
`npm run bekci` turuna girer ve `bekci-yetim:dogrula` onu yetim saymaz.

**AÇILIŞ ŞARTI:** bu iki bekçiye bir sonraki ölçüt eklendiğinde (ya da
K262/K263 paketi açıldığında — üçü de «bekçi altyapısı» ailesi).

---

## 🟡 K263 — HARNESS YAZIMLARI ORTAK DAYANIKLI KAPIDAN · 24.09.2026 · [AÇIK — KOMUT VERİLMEDİ]

K251-②'nin genel hâli. Ölçüldü (24.09): **36 mutasyon harness'i** kaynağa
çıplak `writeFileSync` ile yazıyor; Windows geçici kilidi (`UNKNOWN`, errno
-4094) herhangi birini turun ortasında düşürebilir — ve **geri alma yazımı**
düşerse mutant diskte kalır. Panel harness'i bugün `dayanikliYaz` ile korunuyor.

**YAPILACAK:** bütün harness'ler `dayanikliYaz`a bağlanır; **desen yasağı**
bekçisi: `scripts/*mutasyon*.ts` içinde `writeFileSync` doğrudan içeri
alınamaz (istisna yalnız kapının kendisi, `mutasyon-deseni.ts`). Mutasyon:
kapıyı atlayan yeni harness kırmızı. Dosya listesi tutulmaz.

**AÇILIŞ ŞARTI:** bir sonraki harness paketi ya da bir başka harness'in aynı
imzayla çökmesi — hangisi önce gelirse. K262 (okuma kapısı) ile aynı pakette
gidebilir: ikisi de «bekçi altyapısı tek kapıdan» ailesi.

---

## 🟡 K262 — BEKÇİLERE ORTAK OKUMA KAPISI: KAYNAK SATIR SONUNDAN BAĞIMSIZ OKUNUR · 24.09.2026 · [AÇIK — KOMUT VERİLMEDİ]

K258-②'nin genel hâli. Ölçüldü (24.09): **87 bekçide 613** çıplak
`readFileSync` çağrısı; **12 bekçide** `\n` taşıyan dize çapası (api ·
cron-yollari · depo ×2 · gecmis · kanal-yazma ×2 · kart-odeme · rma · talep ·
tazminat · urun-analizi ×2 · yedek). Bugün hepsi yeşil — dosyaların **şu anki**
satır sonuyla. Bir dosyanın satır sonu değişirse (betikle yazım LF, git
dokunuşu CRLF) çapası ortada `\n` olan ölçüt **sessizce kırılır**: kırmızı
yanarsa şans, `indexOf → -1` ile boş dilime bakıp **yeşil kalırsa** felaket.

**YAPILACAK:** `scripts/kaynak-oku.ts` → `kaynakOku(yol)` (CRLF→LF, tek gövde);
bekçiler ona bağlanır; **desen yasağı** bekçisi: `scripts/*-dogrula.ts` içinde
`readFileSync` doğrudan içeri alınamaz (`hamOku` istisnası yalnız kapının
kendisinde). Mutasyon: kapıyı atlayan yeni bekçi kırmızı. Dosya listesi
tutulmaz — desen yasağı yarın eklenen bekçiyi de kapsar.

**AÇILIŞ ŞARTI:** bir sonraki bekçi paketi ya da ikinci bir satır sonu
kırılması — hangisi önce gelirse. Panel bekçisi bugün kendi kapısıyla korunuyor
(K258-②); bu kalem o kapıyı ORTAK yapar.

---

## 🔴 K261 — HALKA YAZILARI: OK ETİKETLERİ AYRIK, MERKEZ TOPLAM DELİĞE SIĞAR · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _"Pasta grafiğin yanındaki yazılar problemli."_ Ekran
görüntüsü henüz gelmedi; **sebep tahmini, teyit Halil testinde**. K256'nın ok
uçları dilimin açısından türetiliyordu: iki küçük dilim yan yanaysa oklar aynı
noktaya varır ve yazılar **üst üste biner**; uç kadraj kenarına yakınsa ad
**kesilir**. İkisi de "yazılar problemli" görüntüsünü üretir.

### YAPILAN

- `halka-grafik.tsx`: saf gövde **`okEtiketleriniAyir`** — aynı taraftaki uçlar
  y'ye göre sıralanır, aralarında en az **`OK_ETIKET_ARALIGI = 30`** birim
  (iki satırlık etiket ≈ 28) bırakılır; x, yazı payı (96) kadar kadraj içine
  kırpılır. Sıra korunur (girdi indeksine göre döner); SVG'den bağımsız,
  **değer testiyle** sınandı (3 ölçüt: yakınlar itiliyor · uzak dokunulmuyor ·
  iki kenar kırpılıyor) + gövdenin çizime **bağlı** olduğu ölçülüyor.
- Ok, dirsekten **ayrılmış** uca gider; halkanın kendisi, dilimler, yüzdeler,
  merkez toplam ve dipnot değişmedi.
- Mutasyonla: ayırma çağrısı kaldırıldı · gövde aralığı uygulamıyor.

### ─── ② GÖRÜNTÜ GELDİ — SEBEP BAŞKAYDI: MERKEZ TOPLAM DELİĞE SIĞMIYORDU

Ekran görüntüsü (24.09, `?pencere=SON_15_GUN`): ok etiketleri **düzgündü**;
sorun **merkezdeki toplam**. `₺622.904,97` sabit 20 birimle **133 birim**
genişliğe yayılıyor, delik **98** — yazı halkaya taşıp soldaki **%42**
bandının üstüne biniyordu. ① tahmini yanlış hedefti; gövde zararsız, kalıyor
(iki küçük dilim yan yana gelince yine gerekecek), ama sorunu o çözmedi.

- `merkezYaziBoyu(metin)` — saf gövde: boy = (delik − pay) / (0,6 em ×
  karakter), tavan 20, taban 10, yarım birime yuvarlı. 0,6 em **ekran
  görüntüsünden ölçüldü** (11 × 20 → 133), uydurulmadı. Kısa toplam (`₺9`)
  tavanda kalır — küçültme yalnız gerekince.
- Bugünkü toplam için boy **13** (11 karakter × 0,6 × 13 = 86 ≤ 98): bant
  yüzdesiyle aynı boy, deliğin içinde. Değer testi 3 + kullanım ölçütü 1;
  mutasyon 2 (sabit 20'ye dönüş · boy uzunluğa bakmıyor).

### HALİL TEST LİSTESİ

1. `/` → "Ciro — kanala göre" halka kartı: **merkezdeki toplam deliğin içinde**
   kalmalı, halkaya taşmamalı; "%42" / "%58" bant yazıları tam okunmalı.
   Toplam, hüküm kartındaki **Brüt ciro** ile birebir.
1b. Her dilimin oku ayrı bir etikete gitmeli; hiçbir yazı bir başkasının
   üstüne binmemeli.
2. Kanal adları kartın kenarında **kesilmemeli** (soldaki ve sağdaki en uç
   etiketler tam okunmalı).
3. Etiketteki tutarların toplamı (Diğer dahil) merkezdeki toplamla birebir.
4. Kanal süzgeci tek kanal yapıldığında tek dilim + tek etiket; yazı yerinde.
5. Dönem süzgecini "Bugün" yapın (kısa toplam) → merkez yazı **büyük** (20),
   yine deliğin içinde.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #12)

---

## 🔴 K260 — GÜNLÜK OPERASYON YIĞILMIŞ SÜTUN, GÜNÜN TOPLAMI TEPEDE · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _"Renklendirmesi güzel fakat hangi gün toplam ne yapıldığı
belli olmuyor; birbirinin üstüne eklenen bir grafik daha iyi."_ K258'in dört
çubuğu yan yanaydı; günün toplamı hiçbir yerde okunmuyordu.

### YAPILAN

- `UcSeriliGrafik` sütun kipi **adet görünümünde YIĞILMIŞ**: dört seri üst
  üste, çubuğun boyu günün toplamı, **tepesinde rakam** (`bicimle(yiginUstu)`).
  Yığın tabanları `reduce` ile (render içinde değişken mutasyonu yok —
  PastaGrafik dersi). Yuva 28 birimden darsa rakam yazılmaz (11 px yazı üç
  haneyi taşıyamaz); altta tablo zaten söyler.
- Kesikli **"Toplam" çizgisi** ve göstergedeki karşılığı yığılmışken **çizilmez**
  — çubuğun boyu zaten toplam, ikinci kez söylemek gürültü.
- Tıklama hedefleri (her dilim kendi süzülmüş listesine), gösterge, özet satırı,
  tablo **aynen**.

### ⛔ CİRO KİPİ GRUPLU KALDI — BİLEREK

Ciro görünümünde alım (para çıkıyor) ile satış (para giriyor) **zıt akışlardır**;
üst üste koymak _"para hangi yöne aktı"_ sorusunu bulandırır. `toplamVar` o kipte
zaten `false` (`serileriKur` kararı, 21.08); yığın yalnız `sutunMu && toplamVar`
ise açılır. Mutasyonla sınandı (3): yığın kalktı · toplam etiketi kalktı ·
kesikli toplam yığılmışken geri geldi (FAZLADAN). Panel harness'i tek başına:
**62/62 (K259 1 taşınan · K260 3 · K261 2 — hepsi kırmızı yandı)**.

### HALİL TEST LİSTESİ

1. `/` → "Günlük operasyon" kartı, **Adet** sekmesi: her gün **tek çubuk**,
   içinde dört renk dilim (mor sipariş · yeşil mal kabul · mavi satış · turuncu
   kargo) üst üste; çubuğun **tepesinde günün toplamı** yazılı.
2. Bir günün tepesindeki rakam, aynı gün için açılır tablodaki dört sütunun
   **toplamına birebir** eşit olmalı.
3. Göstergede "Toplam" (kesikli) artık **olmamalı**; dört seri adı durmalı.
4. **Ciro** sekmesine geçin → çubuklar yine **yan yana** (gruplu), tepede rakam
   yok — bilerek.
5. Bir dilime tıklayınca o günün ve o serinin süzülmüş listesi açılmalı.
6. Telefonda çubuklar okunur; günler sıkışınca tepedeki rakamlar kaybolabilir,
   tablo açılınca değerler orada.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #10 · #15)

---

## 🔴 K259 — GÖREV ŞERİDİ: ① TÜRLERE GÖRE SATIRLAR → ② DEMO BİREBİR TEK SATIR · 24.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı 24.09: _"Bugün ne yapalım kartı biraz karmaşık; türlerine göre
düzenlemek gerek."_ K254 iki grubu (sevkiyat · tedarik) **tek satırda** ince
bir ayraç ve ikonla ayırıyordu; iki emek göz için karışıyordu.

### YAPILAN

- `gorev-kutusu.tsx`: başlık satırı (ad + bekleyen/temiz rozeti) ayrı; altında
  **her grup kendi satırında** — başında ikon + **görünür grup adı** + o grubun
  bekleyen sayısı `(n)`, ardından çipler. Başlık sabit genişlikte (`sm:w-48`)
  ki iki satırın çipleri aynı hizadan başlasın. Telefonda çipler satır içinde
  sarar; yatay kaydırma yok.
- Çiplerin kendisi, ilerleme bağlantısı, sıfır çipin `<span>` kalması, `sinif`
  renkleri **aynen** (K254).

### ⚠ ÖLÇÜT ESKİDİ, SUSTURULMADI (①)

K254'ün _"gruplar ayraç + ikonla AYRILIYOR"_ ölçütü ayracı arıyordu; ① onu
başlığa taşıdı, ② ayraca geri getirdi — her seferinde gerekçesiyle.

### ─── ② «ÇOK KARIŞIK OLDU, ANLAMLANDIRAMIYORUM» — ① ÇEVRİLDİ, DEMO BİREBİR

①'in bedeli aynı gün çıktı. «Türlerine göre düzenlemek gerek» isteğini **iki
satır + görünür grup başlığı** diye yorumlamıştım; sonuç: üst başlığın altında
ikinci bir «Bugün ne göndermeliyim» cümlesi, «Mal ve kayıt» gibi belirsiz bir
başlık, yedi **uzun** çip («Onay bekleyen sipariş (API)», «Kargoya verilmemiş
sipariş 3 · 0 paketlendi», «Komisyon oranı boş kanal SKU 38») ve elma+armut
toplayan bir «75 bekleyen» rozeti. Demoyla yan yana konunca fark netti: demo
**tek satır, dört kısa çip** — «Onay bekleyen 3 · Paketlenecek 11 · Mal kabul 2
· Kârı hesaplanamayan 0 · temiz». Kullanıcıya üç şekil sunuldu, **demo birebir**
seçildi; toplam rozeti için de **kaldır**.

- Tek satır; **kısa etiketler** `Gorevler.kisa.*` (Onay bekleyen · Paketlenecek
  · İade bildirimi · Mal kabul · Kârı hesaplanamayan · Oransız kanal SKU ·
  Komisyon tarifesi); uzun ad `title`da (üstüne gelince).
- Gönderim işleri önce, tedarik sonra, **arada ince ayraç** — 20.08 «iki emek»
  gerekçesi sırada ve ayraçta yaşıyor; grup adı ekran okuyucuya `sr-only`
  (`baslikSevkiyat` → «Gönderim», `baslikTedarik` → «Tedarik»).
- **Toplam rozeti yok**; hepsi sıfırsa yalnız «Hepsi temiz». `Gorevler.bekleyen`
  anahtarı silindi (başka kullanıcısı yoktu).
- «0 paketlendi» **sıfırda çizilmez** — çipin dediğini tekrar ediyordu; ilk
  paket çıkınca rakam belirir.
- Bekçi: 5 ölçüt değişti/eklendi (tek satır+ayraç · sr-only grup adı · rozet
  yok · kısa etiket sözlükten, taban doluluğu ile · sıfır ilerleme yok);
  mutasyon 1 taşındı + 4 yeni (rozet geri · uzun etiket · 0 ilerleme · sr-only).

> **DERS:** kullanıcının isteğini demonun DIŞINA çıkacak biçimde yorumlama.
> Demo onaylı iskelet; «türlerine göre» demonun içinde de karşılanabiliyordu
> (sıra + ayraç). Önce demoya bak, sonra yorumla. _(Bellek: demo-iskelet-birebir.)_

### HALİL TEST LİSTESİ (② için)

1. `/` → hüküm kartlarının altında **tek satır**: solda «Bugün ne yapmalıyım»,
   yanında çipler; «N bekleyen» rozeti **yok**.
2. Çip metinleri kısa: «Onay bekleyen 1», «Paketlenecek 3», «İade bildirimi 1» │
   «Mal kabul 31», «Kârı hesaplanamayan 1», «Oransız kanal SKU 38», «Komisyon
   tarifesi ✓ temiz» — sayı çipin sağında, aynı satırda.
3. Bir çipin üstünde bekleyin → uzun ad ipucu olarak çıkmalı («Onay bekleyen
   sipariş (API)»).
4. Gönderim çipleri ile tedarik çipleri arasında **ince dikey çizgi** (masaüstü).
5. «Paketlenecek» yanında «0 paketlendi» **görünmemeli**; bir sipariş
   paketlenince «1 paketlendi» belirmeli ve tıklanınca listesi açılmalı.
6. Bir çipe tıklayınca o işin süzülmüş listesi açılmalı; temiz çip tıklanmaz.
7. Telefonda çipler alt alta sarar, yatay kaydırma yok.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (`Gorevler.kisa.*` 7 anahtar tr+en;
`bekleyen` silindi; 2 değer değişti) · **kullanıcı kolaylığı: ✓** (İlke #2 · #8 · #12)

## 🔴 K258 — PARA ve OPERASYON YAN YANA, OPERASYON SÜTUN (DÖRT SERİ) · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Demonun son bloğu: **"Ciro ve NET-2 — son 14 gün"** çizgi (3/5) ile **günlük
operasyon sütunları** (2/5) aynı satırda. K257'de ikisini de "bilerek
yapmıyorum" demiştim; kullanıcı _"demoyu sen çizdin, neden yapamıyorsun"_ dedi
ve haklıydı — engel bir karar değil, bir bileşen geometrisiydi. Çözüldü.

### YAPILAN

- `UcSeriliGrafik` **`sekil="sutun"`** kipi aldı: her kova için **gruplanmış
  dört çubuk** (sipariş · mal kabul · satış · kargo). Seriler, tıklama hedefleri
  (`<a>` çubuğu sarıyor), gösterge, özet ve tablo **aynen** — yalnız şekil ve
  geometri değişti. 2/5 sütun için ayrı geometri (640 px); çizgi kipi 1240'ta
  kaldı, öteki kullanımlar değişmedi.
- Panelde 14 gün kartı `xl:col-span-3`, operasyon `xl:col-span-2`, tek ızgara.

### ⛔ DÖRT SERİ KORUNDU — DEMO İKİ SERİYDİ

Kullanıcı isteği 21.08.2026: _"günlük kaç mal aldığımı, kaç mal sattığımı ve
kaç kargo verdiğimi AYNI grafikte görmek istiyorum."_ Demonun sütunu iki
seriliydi (kargoya verilen · bekleyen); birebir alınsaydı kayıtlı istek
yarıya inerdi. Sütun **dört seriyle** çizildi — demonun şekli, kullanıcının
içeriği. Mutasyonla: sütun kipini iki seriye indiren senaryo kırmızı.

### ⚠ NİYE ŞEKİL AYRI

Para **sürekli** bir değer (çizgi), operasyon **sayılabilir** bir olay (sütun).
İki tam genişlik çizgi alt alta durunca göz aynı şeyi iki kez çizilmiş
sanıyordu ("iki grafik akışı bozmuş"). Çare birini saklamak değil: sipariş
artarken cironun yerinde sayması ancak ikisi **birlikte** görülünce fark
edilir. Çare şekli ayırmak.

### ─── ② ÖLÇÜT GELİŞ BİÇİMİNE BAĞLIYDI — PUSH REDDEDİLDİ (24.09.2026)

K259–261 push'unda tur `panel:dogrula`yı **kırmızı** yaktı (3/857) — oysa aynı
bekçi commit'ten önce tek başına **yeşildi**. Ağaçta mutant yoktu; dosya
içeriği aynıydı. Değişen tek şey **satır sonuydu**: `uc-serili-grafik.tsx`
betikle LF yazılmıştı, lint kıyası için yapılan `git stash/pop` (autocrlf)
onu CRLF'e çevirdi. K258'in _"sutun dali bulundu"_ çapası
`"sutunMu" + "\n          ? "` — `\n` çapanın **ortasında**, CRLF'de tutmadı;
iki alt ölçüt de boş dilime bakıp düştü.

> Bu, 24.08 kuralının aynısı: _"metni okuyan kontrol, metnin geliş
> biçiminden bağımsız okur; düzeltme deseni yamamak değil OKUMA KAPISI
> kurmaktır."_ Kapı kuruldu: `panel-dogrula.ts`te `readFileSync` tek gövdeden
> geçiyor (CRLF→LF), 90 okumanın hepsi. Ayırt edici: `\n` çapanın **başında**
> ise (`\nexport`) CRLF'de de bulunur, **ortasında** ise kırılır.

İki yönde sınandı: dosya CRLF → 857 yeşil · dosya LF → 857 yeşil · kapıdaki
`.replace` kaldırılınca → **3 kırmızı** (kapı yük taşıyor). Öteki bekçiler
→ **K262**.

### HALİL TEST LİSTESİ

1. `/` → afiş/özetin altında **tek satırda iki kart**: solda "Ciro ve NET-2 —
   son 14 gün" (çizgi), sağda "Günlük operasyon" (**sütun**).
2. Operasyon kartında her gün için **dört çubuk** (mor sipariş · yeşil mal
   kabul · mavi satış · turuncu kargo); göstergede dört ad.
3. Bir çubuğa tıklayınca o günün **süzülmüş listesi** açılmalı (çizgideki
   noktayla aynı davranış).
4. "Adet / Ciro / KDV" sekmeleri çalışmaya devam etmeli; altta özet satırı ve
   açılır tablo aynen durmalı.
5. Telefonda iki kart alt alta; sütunlar okunur (yazılar küçülmemeli).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #10)

---

## 🔴 K257 — AFİŞ/ÖZET AŞAĞI, CİRO VE NET-2 SON 14 GÜN · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Demonun kalan sırası: hüküm → görev → pazaryeri + halka → **afiş + özet** →
**grafikler**. Afiş ("Rafta var, vitrinde yok") ve Günlük özet pazaryeri
satırının **altına** indi; yeni kart **"Ciro ve NET-2 — son 14 gün"** günlük
operasyon grafiğinin **üstüne** geldi.

### YAPILAN

- `lib/panel/son-gun-serisi.ts` — saf gövde: bugüne kilitli 14 gün, gün
  kovalama **İstanbul günü** (`isTakvimGunu` + `gunDegeri`, `operasyonSerisi`
  ile aynı). Dönem süzgecinden bağımsız; kanal + para birimi süzgeci uygulanır
  (hüküm kartlarıyla aynı küme). Kaynak, aylık grafiğin zaten çektiği 12 aylık
  `satislar` — ikinci sorgu yok.
- **NET-2 `null` sıfır sayılmaz**: kârı hesaplanamayan satış toplama girmez,
  `net2Var` günün hesaplı satışı olup olmadığını söyler. Değer testi: 00:30
  İstanbul'daki satış BUGÜNE yazılıyor (UTC'ye göre düne düşerdi); null NET-2
  dışarıda; pencere dışı satış eleniyor. Mutasyonla: 13 gün · null=0 · kart
  kalktı · kanal süzgeci düştü.

### ⚠ İLK TESLİMDE İKİ ŞEY ERTELENMİŞTİ — AYNI TURDA K258 KAPATTI

İlk yazımda «operasyon sütuna çevrilmesin, yan yana konmasın» demiştim;
gerekçe bir bileşen geometrisiydi (1240 px viewBox 2/5'te okunmaz) ve
21.08 dört seri isteğiydi. Kullanıcı _"demoyu sen çizdin, neden
yapamıyorsun"_ dedi; haklıydı — engel karar değil geometriydi. **K258**
sütun kipini ayrı geometriyle ve **dört seriyle** kurdu; bu kart onunla
yan yana (3/5 + 2/5). Aşağıdaki test listesinin 2. ve 6. maddeleri K258'e
göre okunur (kart tam genişlik değil, satırın sol yarısı).

### HALİL TEST LİSTESİ

1. `/` → pazaryeri + halka satırının **altında** "Rafta var, vitrinde yok" afişi
   ve Günlük özet yan yana olmalı (artık üstte değil).
2. Onların altında, satırın SOLUNDA **"Ciro ve NET-2 — son 14 gün"** kartı;
   x ekseninde gün numaraları (10 … 23), iki çizgi (ciro · NET-2).
3. Dönem süzgecini "Dün" yapın → 14 gün grafiği **değişmemeli** (bugüne kilitli).
4. Kanal süzgecini Trendyol yapın → 14 gün grafiği **yalnız Trendyol**u çizmeli.
5. Son noktanın (bugün) cirosu, "Bugün" süzgeciyle hüküm kartındaki **Brüt
   ciro** ile birebir aynı olmalı.
6. Aynı satırın SAĞINDA günlük operasyon grafiği — sütun, dört seri, sekmeler (K258).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (1 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓** (İlke #13 — sıra: hüküm → grafik)

---

## 🔴 K256 — CİRO KANALA GÖRE: OK ÇİZGİLİ HALKA, KENDİ KARTINDA · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı demo turunda açıkça istemişti: _"yuvarlak olmaz mı, her renkten
ok'la pazaryeri ismi çıkacak şekilde."_ K247 bunu **mevcut pasta + yan
liste** ile geçiştirmişti — ok yoktu, isim dilimin yanında değildi; bu kalem
o borcu kapatıyor.

### YAPILAN

- Yeni bileşen `components/halka-grafik.tsx`: her dilimden bir ok çizgisi,
  ucunda kanal adı + tutar; bantta yüzde; ortada toplam ciro. **Sunucuda
  çizilir** — fonksiyon prop yok, RSC sınırı yok (K247'deki "ekran çizilemedi"
  tuzağının tam tersi kurgu). Karanlık tema `currentColor` sınıflarıyla.
- Halka **kendi kartında** (2/5), pazaryeri kartı 3/5 — demo düzeni. K247'nin
  "aynı düzlem" kararı korunuyor (yan yana, `h-full` ile aynı boy) ve
  **K126-C geri geldi**: iki sütun aynı yerde biter.
- **Dördü aşan dilimler «Diğer»de toplanır ve dipnot bunu yazar**: 11 kanalda
  11 ok birbirine girerdi. Toplanan şey sessizce kaybolmaz (değer testi +
  dipnot mutasyonu).

### ⚠ ESKİ PASTA KALKMADI — HAKEDİŞ ONU KULLANIYOR

`PastaGrafik` / `KanalDagilimiGrafigi` `/hakedis`te duruyor; panelden yalnız
o sarmalayıcının ithali kalktı. K249'un efsane düzeltmesi orada yaşıyor.

### HALİL TEST LİSTESİ

1. `/` → "Pazaryeri performansı" kartının **sağında** ayrı bir kart: **"Ciro
   kanala göre"**, içinde halka. İki kart aynı yerde bitmeli.
2. Her dilimden bir **ok** çıkmalı, ucunda **kanal adı + tutar**; bantta yüzde.
3. Ortadaki toplam, hüküm kartlarındaki **Brüt ciro** ile birebir aynı olmalı.
4. Dilim renkleri, soldaki kanal kartlarının **kenar çizgisi ve çubuk
   renkleriyle** aynı olmalı (Trendyol mavi, HB turuncu, N11 sarı).
5. Beşten fazla kanalda satış varsa 4. dilim **"N kanal daha"** olmalı ve
   altta **"En küçük N kanal tek dilimde toplandı"** yazmalı.
6. Telefonda halka pazaryeri kartının **altına** inmeli, oklar okunur kalmalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (5 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓** (İlke #10 — aynı kanal her yerde aynı renk)

---

## 🔴 K255 — KANAL KARTI DEMO ANATOMİSİ + NET-2'YE GÖRE SIRALAMA · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Eski kart aynı bilgiyi beş ayrı rakam satırında dağıtıyordu; hiçbir şey öne
çıkmıyordu. Demo anatomisi: **renk noktası + ad · marj çipi · NET-2 büyük ·
gri satırda ciro/satış/iade · iki renkli çubuk · hüküm cümlesi.** Göz sırayla
okuyor: kim · ne kadar kârlı · kaç lira · hacim · pay · hüküm.

### ⛔ ÇEVRİLEN KARAR — GEREKÇESİ `PayCubugu`DE DURUYOR

> _"Kanala ayrı KİMLİK RENGİ verilmedi: 11 kanal için 11 ton, dört durum
> rengiyle karışır ve 'yeşil = iyi' anlamı çökerdi."_ (K247'de mutasyonla
> korunuyordu.)

Kullanıcı demoyu onayladı: çubuklar kanalın **kimlik** rengini taşıyor (halka
ile aynı palet — aynı kanal her yerde aynı renk, İlke #10). «Yeşil = iyi»
çökmüyor, çünkü kartta iyi/kötüyü söyleyen şey renk değil **marj çipi (durum
paleti) ve hüküm cümlesi**. Kategori paleti ile durum paleti karışmıyor.
K247'nin FAZLADAN mutasyonu **yön değiştirdi** (KALDIRAN): rengin düşmesi
artık hatadır. `renk` verilmezse `PayCubugu` eski nötr tonda — öteki
kullanımlar değişmedi.

### ⚠ 13.08 KURALI KAZANDI: GRİ SATIRDA `CiroSunumu`

Demonun gri satırı tek satırdı («₺17.890 ciro · 16 satış · 1 iade»). Mimar
kuralı: _panelin ciro gösterdiği her yerde aynı sunum (brüt · iade · net)._
Kural kazandı; gri satır `CiroSunumu` + «N satış · N iade». Mutasyonla
korunuyor (`<CiroSunumu\b`).

### ⚠ MARJ ÇİPİ — BÖLME KAPISI VE DURUM RENGİ

Oran `NET-2 ÷ ciro`; ciro sıfırsa çip **çizilmez** (NaN/∞ uydurulmaz). Renk
`marjDurumu(marj, ortalamaMarj)`'dan: zarar kırmızı, ortalamanın altı amber,
üstü yeşil — sabit yeşil değil. İkisi de mutasyonla korunuyor.

### ⚠ SIRALAMA: SABİT DÜZEN KALKMADI, NET-2 EKLENDİ

Demo iki düğme (NET-2'ye göre · Ciroya göre); K106 kararı («Trendyol'u nerede
bulacağım», yer sabit) yaşıyor → üç kip: **Sabit düzen · NET-2'ye göre ·
Ciroya göre.** Değer testi: NET-2 kipi kâra göre sıralar, eşitlikte sabit
düzen; ciro kipinden **ayrışan** örnekle sınandı.

### ⚠ ALT SATIR: SATIŞI OLMAYAN KANALLARIN ADI

Tavanlı panelde açık sıfır kartları çizilmiyordu (K124) ve «N11 neden yok?»
sorusu cevapsızdı. Alt satır adları yazıyor + «Tümünü gör». Mutasyonla.

### HALİL TEST LİSTESİ

1. `/` → her kanal kartının **sol kenarında** kanal renginde çizgi, adın
   yanında renk noktası, sağda **"%16,7 marj"** çipi.
2. Çip rengi: zararda kırmızı, dönem ortalamasının altında amber, üstünde
   yeşil. Satışı olmayan kanalda çip **olmamalı**.
3. Kartta **NET-2 büyük** rakam; altında gri kutuda ciro (brüt · iade · net) +
   "N satış · N iade".
4. İki çubuk **kanal renginde**: ciro payı soluk, NET payı tam. Hüküm cümlesi
   altta.
5. "Kanal sırası" düğmeleri: **Sabit düzen · NET-2'ye göre · Ciroya göre**;
   NET-2'ye göre seçince kartlar kâra göre dizilmeli.
6. Kartların altında **"Bu dönemde satışı olmayan N kanal · Amazon · …"** ve
   sağda "N kanal daha" bağlantısı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (6 yeni anahtar + 1 metin
değişti, tr+en) · **kullanıcı kolaylığı: ✓** (İlke #2 · #5 · #10 · #12)

### ÖLÇÜLDÜ (iki paket birlikte)

    panel:dogrula            837 ölçüt (K255 12 · K256 9 · K257 12 yeni; K247'nin 1 ölçütü çevrildi, 2'si taşındı)
    panel-mutasyon:kontrol   57/57 (K255 5 · K256 3 · K257 4 · K258 4 yeni; K247'nin 4'ü taşındı, 1'i yön değiştirdi)
    i18n · lint · kontrol-karakteri · mutasyon-cakisma · tsc   0

## 🔴 K254 — GÖREV ŞERİDİ: İKİ KART → TEK SATIR ÇİP · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Demonun ikinci bloğu. Görevler artık tek satır: **"Bugün ne yapmalıyım · 3
bekleyen · ⛟ Onay bekleyen 3 · Kargoya verilmemiş 2 · 3 paketlendi · … ·
📦 Mal kabul 31 · …"**, hüküm kartının hemen altında, tam genişlik.

### ⛔ ÇEVRİLEN KARAR — GEREKÇESİ KODDA DURUYOR

> _"İki kart, iki farklı emek"_ — kullanıcı isteği 20.08.2026: sevkiyat ile
> tedarik günün farklı saatlerinde, çoğu zaman farklı kişilerce yapılıyor.

Karar **çevrildi** (kullanıcı demoyu onayladı) ama gerekçesi **yaşıyor**:
şerit iki grubu ince ayraç + grup ikonuyla ayırıyor. Kaybolan şey iki kartın
kapladığı yer; kalan şey iki emeğin ayrımı. Bekçisi var: ayraç kalkarsa
kırmızı.

⚠ **K248 ÖNCEKİ TESLİMDE «şeridi kartın İÇİNE» almıştı** ve gerekçesi
K126-C'ydi (iki sütun aynı yerde biter). Demo o iki sütunu (görev | pazaryeri)
ortadan kaldırdığı için K126-C bu satırda **kapsam dışı** — kural, ait olduğu
düzenle birlikte gitti; ilke genişletilmedi.

### ⚠ SIFIR ÇİP BAĞLANTI DEĞİL (İlke #2) — ESKİ KUTUCUK BAĞLANTIYDI

Eski kutucuk sıfırda da tıklanıyordu ("listeleri yine de görebilirsiniz").
Demo ve İlke #2 bunu çevirdi: açılacak liste yoksa tıklanacak şey de yok.
Ama çip **kaybolmuyor** — «temiz ✓» yazıyor (açık sıfır). İki yön de
mutasyonla korunuyor.

### ⚠ ESKİYEN ÖLÇÜTLER SUSTURULMADI, GÜNCELLENDİ

| ölçüt | niye eskidi | yeni hâli |
|---|---|---|
| `z-10` + `absolute inset-0` (yayılan bağlantı) | çipte yayılan bağlantı yok; ana ↔ ilerleme KARDEŞ `<a>` | «ana bağlantı ilerlemeden ÖNCE kapanıyor» + «hile kalmadı» |
| `sr-only` etiket kopyası | etiket artık bağlantının İÇİNDE, kopya adı iki kez okuturdu | «etiket görünür ve içeride» + «kopya YOK» (yön FAZLADAN'a döndü) |
| «600 karakter öncesinde `karGorunur` yok» | şerit hüküm kartının altına gelince pencereye kartın kuyruğu girdi | yapısal: son `karGorunur ? (` şeritten önce `) : null}` ile kapanmış mı |

⚠ **BEKÇİ GERÇEK BİR GERİLEMEYİ YAKALADI:** ilerleme bağlantısı koşulunu
`!== null && !temizMi` yazmıştım; bekçinin çapası `!== null ?` idi ve kırmızı
yandı. Davranış doğruydu, çapa kopmuştu — kod çapaya uyduruldu (iç içe
koşul), ölçüt gevşetilmedi.

### HALİL TEST LİSTESİ

1. `/` → hüküm kartlarının hemen altında **tek satır** görev şeridi olmalı:
   solda "Bugün ne yapmalıyım" + "N bekleyen" rozeti, sonra çipler.
2. Şeritte **iki grup** ince bir çizgi ve ikonla (kamyon / paket) ayrılmalı.
3. Sayısı 0 olan çip **gri, "temiz ✓"** ve **tıklanmamalı**; sayısı olan çip
   **amber ve bağlantı** — tıklayınca süzülü liste açılmalı.
4. "Kargoya verilmemiş" çipinin yanında **"N paketlendi"** ayrı bir bağlantı
   olmalı; tıklayınca hazırlananların listesi açılmalı (ana çipin listesi değil).
5. Tarife çipi 0 iken **"N gün kaldı" / "Bugün son gün"** yazmalı (rakam değil).
6. Telefonda çipler alt alta sarmalı, yatay kaydırma olmamalı; her çip rahat
   dokunulmalı (44 px).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #8 · #12)

---

## 🔴 K253 — ALTI HÜKÜM KARTI + HUNİ İNCE SATIR · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Demonun birinci bloğu. Hüküm ızgarası **Brüt ciro · NET-1 · NET-2 · NET-2
marjı · Satış adedi · İade** — altı kart, tek sıra. Üç huni sayısı (satın
alınan · mal kabul · kargoya verilen · kargo bekleyen) ızgaranın **altında
ince bir satır** çip.

### ⚠ 01.09 KARARI ÇEVRİLMEDİ — KULLANICI SEÇTİ

01.09.2026: _"7 kart istiyorum — 4 huni + ciro + NET-1 + NET-2."_ Demoda huni
yoktu. Kullanıcıya üç seçenek sunuldu (yalnız demo · huni altta ince satır ·
hepsi tek şeritte); **"6 demo kartı + huni altta ince satır"** seçildi. Huni
sayıları, adresleri ve kıyas rozeti **aynen** taşındı — yalnız yer değişti.

### ⚠ İADE KENDİ KARTI — VE ROZETİ TERS YÖNLÜ

Eskiden satış adedinin altında küçük nottu. Artış **kötüdür**: rozet
`artisIyiMi = false` — iade artınca yeşil yanan bir rozet yanlış müjde olurdu.
Mutasyonla korunuyor. Adres iade listesine, aynı dönem + kanal süzgeciyle
(İlke #16: kartta 2 yazıyorsa liste 2 satır açar).

### ⚠ ROZET BİÇİMİ DEMODAN: «▲ %8 · önceki 29.150»

Eskisi «▲ ₺2.330 · %8». ORAN hükümdür, ÖNCEKİ DEĞER kanıtıdır; mutlak fark
ikisinden türetilir ve üçüncü sayı olarak gürültüydü. Yüzde kurulamıyorsa
(önceki 0) mutlak fark yazılır — rozet boş kalmaz. Tek gövde (`kiyasRozeti`),
bütün kartlar aynı anda değişti (İlke #10).

### ⚠ İKİ TARİH EKSENİ NOTU HUNİYE TAŞINDI

Kargo kutusunun altındaki _"kargoya verme tarihine göre"_ notu ve "tüm
kanallar" satırı **kaybolmadı** — huni satırının sonunda duruyor. 14.08 kuralı:
satış SATIŞ tarihine, kargo SEVKİYAT tarihine göre; not olmayınca "satış 2
kargo 6 neden tutmuyor" sorusu döner. Mutasyonla korunuyor.

⚠ **BEKÇİ İKİ GERİLEMEYİ YAKALADI:** ① kargo çipinin süzgeç açıkken KANAL
ADINI yazması düşmüştü (eski kutuda vardı) — geri kondu; ② eski sıra ölçütü
(adet → kargo → ciro → net) kırmızı yandı — niye eskidiği yazılarak yeni
sıraya güncellendi, susturulmadı. ⚠ **LİNT DE BİR GERİLEME YAKALADI:** mal
kabul kutusunun kıyas rozeti çipe geçerken düşmüş, `kiyasAlim` ölü kalmıştı
— rozet çipe geri kondu.

### HALİL TEST LİSTESİ

1. `/` → süzgeçlerin altında **altı kart tek sırada**: Ciro · NET-1 · NET-2 ·
   NET-2 marjı · Satış adedi · İade.
2. Karşılaştır açıkken her kartın altında rozet **«▲ %8 · önceki 29.150»**
   biçiminde olmalı (yüzde önce, önceki değer sonra).
3. İade kartı: iade **artınca kırmızı**, azalınca yeşil.
4. İade kartındaki sayıya tıklayınca iade listesi **aynı dönemle** açılmalı ve
   satır sayısı karttaki sayıya eşit olmalı.
5. Kartların altında ince satır: **Huni: Satın alınan N · Mal kabul N · Kargoya
   verilen N · Kargo bekleyen N** + "kargoya verme tarihine göre" notu. Her
   sayı tıklanınca kendi listesi.
6. Kanal süzgeci açıkken kargo çipi **"Kargoya verilen (Trendyol)"** yazmalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (4 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓** (İlke #12 · #15 · #16)

---

## 🔴 K252 — ÜST KABUK + TEK SATIR SÜZGEÇ (HER EKRANDA) · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı canlı panele bakıp **tek bir lira görmeden yedi satır kabuk** saydı:
açık dönem · N11 çekimi · başlık+aralık · 11 dönem düğmesi · kanal · 3 kıyas
düğmesi · afiş. Demo: başlık + tek alt satır, sağda çekim rozeti, altında
**bir satır** süzgeç. Kullanıcı kararı: süzgeç **her ekranda** böyle (İlke #10).

### YAPILAN

- **Başlık bloğu:** `Panel` + alt satır «aralık · dönem · kanal · (kıyas) ·
  açık dönem». Sağda çekim rozeti (nokta + metin; rutin kaçmışsa kırmızı —
  "kaçışın kendisi görünür kılınır"). Üç satır bire indi, hiçbir bilgi
  kaybolmadı; muhasebe dönemi satırı K108 gereği kutu değil bağlam olarak
  alt satırın sonunda.
- **Süzgeç tek satır (`SuzgecCubugu`, 9 ekran):** 5 hızlı dönem (Dün · Bugün ·
  Bu hafta · Son 30 gün · Bu ay) + **«Özel aralık ▾»** + ayraç + kanal + ayraç
  + kıyas yuvası. Kalan dört dönem (Son 15 gün · 3 ay · 6 ay · 1 yıl) açılırın
  içinde, tarih alanlarının yanında.
- **Kıyas düğmeleri aynı satırda** (`kiyas` yuvası, yalnız panel verir):
  Önceki dönem · Geçen yıl. «3 ay öncesi» **kalkmadı** — adreste seçiliyse
  düğmesi çizilir (İlke #5), yalnız varsayılan sırada yok.

### ⛔ `LISTE_PENCERELERI` DEĞİŞMEDİ VE DEĞİŞEMEZ

O liste yalnız düğme sırası değil, **adres doğrulaması** (`liste-suzgeci` ·
`iadeler` · dışa aktarma). Daraltılsaydı yer imindeki `pencere=SON_3_AY`
sessizce «tanınmadı»ya düşerdi. Yeni `HIZLI_PENCERELER` o sıranın bir **alt
kümesi**; `KATLANAN_PENCERELER` **türetiliyor** (elle liste değil) — yarın
eklenen pencere kendiliğinden açılıra düşer. Değer testleri: alt küme · aynı
sıra · DÜN önde (21.08) · hızlı + katlanan + OZEL = LISTE.

### ⚠ SEÇİLİ ŞEY GÖRÜNMEZ OLAMAZ (İlke #5)

Seçili pencere açılırın içindekilerden biriyse «Özel aralık» düğmesi **onun
adını** yazar. Mutasyonla korunuyor.

### HALİL TEST LİSTESİ

1. `/` → başlığın altında **tek satır**: "23.09.2026 – 23.09.2026 · Bugün ·
   Tüm kanallar · Açık dönem: Eylül 2026 · …"; sağda **"N11 çekimi: N dk önce"**
   yeşil noktayla.
2. Süzgeç **tek satır**: Dün · Bugün · Bu hafta · Son 30 gün · Bu ay ·
   **Özel aralık ▾** · | · Kanal · | · Karşılaştır: Önceki dönem · Geçen yıl.
3. «Özel aralık ▾» → açılan kutuda **Son 15 gün · Son 3 ay · Son 6 ay · Son 1
   yıl** düğmeleri + başlangıç/bitiş tarihleri.
4. "Son 3 ay" seçin → ana satırdaki düğme **"Son 3 ay"** yazmalı, "Özel
   aralık" değil.
5. Adrese `?kiyas=ucAy` ekleyin → "3 ay öncesi" düğmesi **görünmeli** ve
   seçili olmalı.
6. `/satislar`, `/alimlar`, `/iadeler` → süzgeç orada da **tek satır**.
7. Telefonda süzgeç düğmesi açılınca aynı satır sarmalı; dokunma 44 px.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (1 yeni anahtar; `altBaslik`
yetim kaldığı için silindi) · **kullanıcı kolaylığı: ✓** (İlke #5 · #10 · #12)

### ÖLÇÜLDÜ (üç paket birlikte)

    panel:dogrula            801 ölçüt (39'u yeni · 4'ü güncellendi)
    suzgec:dogrula           136 (3 ölçüt güncellendi, 1 yeni)
    donem · operasyon · rapor · vitrin · gunluk-ozet   hepsi yeşil
    panel-mutasyon:kontrol   41/41 (14'ü yeni · 4 K248 mutasyonu çipe taşındı · 1'i yön değiştirdi)
    i18n · lint (0 hata) · kontrol-karakteri · mutasyon-cakisma · tsc   0

## 🔴 K251 — TUR, KIRMIZI BEKÇİNİN TAM ÇIKTISINI SAKLIYOR · 23.09.2026 · [KOD KOŞTU]

### ⛔ VAKA — BİR TUR BOŞA GİTTİ

`panel-mutasyon:kontrol` turun içinde **27,9 saniyede çöktü** ve push düştü.
Tur özetinde tek satır vardı:

    panel-mutasyon:kontrol   ... KIRMIZI 27.9s  Node.js v24.18.1

`ozetle()` çıktıyı 64 karaktere indiriyor ve bilinen kalıp bulamayınca SON
satırı alıyor — bir Node dökümünde o satır sürüm numarasıdır. **Tur, kırmızı
yandığını söyledi ama NİYE yandığını söylemedi.** Aynı bekçi tek başına üç
kez 27/27 geçti; yani "ayrıntı: `npm run panel-mutasyon:kontrol`" tavsiyesi
de işe yaramadı — çıktı yalnız TUR SIRASINDA oluşmuştu ve atıldığı anda bir
daha ele geçmedi.
_(Anayasa: "hata mesajını kısaltan her işlem teşhisi kısaltır — kısaltma
yalnız gösterimde yapılır, kayıtta asla.")_

### YAPILAN

`scripts/bekci.ts`: her koşucu tam çıktıyı `Sonuc.cikti`de taşıyor; kırmızı
yanan bekçinin **son 25 satırı ekrana**, **tamamı `scripts/tmp/bekci-<ad>.log`**
dosyasına yazılıyor. Yazamazsa bunu da söylüyor (sessiz geçmez).

⚠ **KIRMIZI DAL HENÜZ TETİKLENMEDİ.** K251'den sonraki tam tur 154/154 yeşil
geçti; yeni kod yalnız `tsc` ile sınandı, kırmızı bekçi yolu bir kez bile
koşmadı. Tam turu bilerek kırmızıya boyamak 34 dakika; ilk gerçek kırmızıda
görülecek ve o gün buraya yazılacak. _(Anayasa: "sınanmayan dal sınanmamış
koddur" — beyan ediliyor, geçmiş sayılmıyor.)_

### ⚠ ÇÖKÜŞÜN KENDİSİ AÇIKLANAMADI — VE KAPATILMADI

Eşzamanlılık hipotezi **ölçüldü ve çürüdü**: panel + 4 paralel harness aynı
anda koştu, beşi de 0 döndü. K251'den sonraki tam tur `panel-mutasyon`'ı
**yeşil** geçti (103,6 sn). Elde kalan: bir kez, tur içinde, 27,9 sn'de,
çıktısı yok.

> **"Bir kez tesadüf, iki kez örüntü."** Kalem açık kalıyor; ikinci kez
> olursa artık çıktısı var ve o zaman teşhis edilir. Tahmin yazılmadı.

⚠ **BU TURDA KENDİ HATAM:** teşhis için tur koşarken ikinci bir mutasyon turu
başlattım — depoda yasak (iki tur aynı dosyaları bozup geri yazar). Fark
edip durdurdum; panelin dosyalarında mutant kalmadı, `git status` ile
doğrulandı.

### ─── ② İLK ÇÖKÜŞÜN SEBEBİ OKUNDU: WINDOWS GEÇİCİ KİLİDİ (24.09.2026)

K251 işini yaptı: harness tek başına koşarken **ikinci kez** çöktü ve bu kez
tam çıktı vardı —

    Error: UNKNOWN: unknown error, open 'src/app/page.tsx'   (errno -4094)
        at writeFileSync   ← 4. mutasyonu UYGULAYAN yazım

Harness aynı dosyayı saniyeler içinde onlarca kez yazıp geri alıyor;
Windows'ta bir tarayıcı/izleyici dosyayı bir an tutunca `open` düşüyor. Dosya
sağlam (`finally` geri yazdı; `cmp` HEAD ile bit-bit eşit). 23.09 turundaki
«Node.js v24.18.1» çöküşü aynı imza — o gün «açıklanamayan tek seferlik»
yazılmıştı; artık açıklandı. **Mekanizma:** `mutasyon-deseni.ts` →
`dayanikliYaz` (yalnız UNKNOWN/EBUSY/EPERM/EACCES'te 10 × 200 ms yeniden
dener; başka hatada anında fırlar); panel harness'i uygulama VE geri alma
yazımında onu kullanıyor. _(«Yönetilemeyen bağımlılık — üçüncü şans
verilmez»: iki tekrar, bizim taraf ölçüldü, teşhis var.)_ Öteki 36 harness
→ **K263**.

⚠ **VE BENİM HATAM:** çöken harness'in ardından zincir `;` ile bağlıydı, commit
**çöküşe rağmen** atıldı (`2b3d2bd`, yerel). Çıktıyı commit'ten SONRA okudum.
Push'a gitmedi; düzeltme sonraki commit'te, harness yeniden koştu. _(Anayasa:
«ölçüm ile karar arasındaki boru da ölçümün parçasıdır» — `&&` yerine `;`.)_

**Halil testi:** yok — tur aracı, ekran değil.

## 🔴 K250 — PARA EN ÜSTTE: 14.08 KARARI ÇEVRİLDİ · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı canlı panele bakıp **"dağ fare doğurdu mu demek lazım"** dedi. Haklıydı
ve sebebi K245–K249'un küçüklüğü değildi: **ekranda tek bir lira görmeden önce
yedi satır kabuk vardı** — dönem satırı · N11 çekimi · başlık · 11 dönem
düğmesi · kanal süzgeci · karşılaştır satırı · afiş. Para katlanın altındaydı.

### ⛔ ÇEVRİLEN KARAR VE ESKİ GEREKÇESİ (SİLİNMEDİ)

> _"Panel açılışında **EYLEM üstte, rapor altta**"_ — mimar kararı 14.08.2026

O gün doğruydu: panel bir **iş listesi** gibi kurulmuştu ve sorduğu soru
"şimdi ne yapacağım"dı. **Niye çevrildi:** o tarihten sonra panel bir HÜKÜM
yeri oldu (İlke #13), döküm kendi sayfalarına taşındı (K244), NET-2 marjı
(K245) ve kanal hükmü (K246) buraya geldi. Artık ilk soru **"bugün ne
kazandım"**. Eylem kutuları kaybolmadı, bir satır aşağı indi.

⚠ **KARAR KULLANICININ, BENİM DEĞİL.** Sıra çevrilmeden önce üç seçenek
sunuldu (para üstte · şimdiki sıra · ikisi yan yana) ve kullanıcı **"para en
üste"** dedi. Kayıtlı bir mimar kararını sessizce çevirmek yasak.

⚠ **"HÜKÜM → GRAFİK" SIRASI BOZULMADI (21.08.2026).** O kuralın koruduğu şey
grafiğin hükümden ÖNCE gelmemesiydi. Hüküm yukarı çıktı, grafik hâlâ ALTINDA —
araya afiş ve eylem kutuları girdi, sıra değişmedi. _(Anayasa: "ilke, kendi
kapsamının dışına uygulanırsa hatayı korur" — kapsam sorgulandı, genişletilmedi.)_

### ⛔ BU SIRANIN BEKÇİSİ YOK — VE NİYE YOK

Sıra ölçütü **yazılmadı**, çünkü tek bir `replace` ile bir BLOĞU taşıyan
mutasyon kurulamıyor; mutasyonu olmayan ölçüt de teslim edilmez (anayasa).
`indexOf` ile yazılan naif bir sıra ölçütü ayrıca **"yok" ile "önce"yi
ayırt edemez** (`-1 < n` doğrudur). Sıra bugün **kod yorumu + bu pano kaydı**
ile korunuyor.
⛔ **AÇILIŞ ŞARTI:** blok taşımasını tek adımda ifade edebilen bir mutasyon
biçimi (ör. çapa-arası kesip yapıştıran harness yeteneği) eklendiği gün ölçüt
yazılır.

### HALİL TEST LİSTESİ

1. `/` (Panel) → süzgeçlerin hemen altında **"Seçili dönem · TRY"** kartı
   olmalı; içinde Ciro · NET-1 · NET-2 · **NET-2 marjı** kutuları.
2. Onun ALTINDA "Rafta var, vitrinde yok" afişi + Günlük Özet.
3. Onun altında "Bugün ne göndermeliyim" / "Mal ve kayıt" ile
   "Pazaryeri performansı" yan yana.
4. Daha aşağıda günlük operasyon grafiği — **hükümden sonra** olmalı.
5. Telefonda aynı sıra korunmalı, yatay kaydırma olmamalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni metin yok) ·
**kullanıcı kolaylığı: ✓** (İlke #12 · #13)

---

## 🔴 K249 — EKRANDAKİ İKİ GÖRÜNÜR KUSUR · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcının canlı ekran görüntüsünden çıktı; ikisi de **ölçüldü**, tahmin değil.

### ① HALKA EFSANESİ KIRPILIYORDU

Sütun 240 px · halka 128 + boşluk 16 → efsaneye **96 px** kalıyor, satır
(renk + ad + tutar + yüzde) ~130 px istiyor. Kap `min-w-0 flex-1` ile 0'a
kadar eziliyor ama **içindeki kalemler `shrink-0`** — yani ezilmiyor,
TAŞIYOR ve kart kenarı kesiyor. Canlıda kanal adı tamamen yok olmuştu, yüzde
yarım kalmıştı (`%3`, `%`).

⚠ **ÇARE GENİŞLETMEK DEĞİL, SARMAK:** efsaneye taban genişlik (`min-w-[11rem]`)
kondu; sığmazsa kabın `flex-wrap`ı devreye girer ve efsane halkanın ALTINA
iner. Geniş kapta (hakediş) hiçbir şey değişmez.

### ② "GÜNLÜK ÖZET" HAM MARKDOWN BASIYORDU

Ekranda **`**Kırmızı**`** yazıyordu. İki kusur tek satırda:
· metin MARKDOWN ama kutu DÜZ YAZI — yıldızlar **karakter** olarak çizildi;
· seçilen satır bir **BAŞLIKTI** — kutu doluydu ama hiçbir şey söylemiyordu.

Kural saf gövdeye taşındı (`lib/ozet/teaser.ts`) ki **değerle** sınanabilsin.

⛔ **ÖLÇÜT UZUNLUK DEĞİL, YAPI.** _"4 kelimeden kısa satırı atla"_ gibi bir eşik
uydurma olurdu. Markdown'ın kendi yapısı kullanıldı: `#` ile başlayan **ya da
TAMAMI kalın** olan satır BAŞLIKTIR. Cümle İÇİNDEKİ kalın parça başlık yapmaz —
yoksa gerçek cümleler de atlanır ve kutu hep boş kalırdı.
⚠ **HEPSİ BAŞLIKSA KUTU BOŞ KALMAZ:** temizlenmiş ilk satır basılır. Sessizce
boşalan bir kutu "bugün özet üretilmedi" ile karışırdı (açık sıfır).

### ÖLÇÜLDÜ

    gunluk-ozet:dogrula          33/33 (8'i yeni · 7'si DEĞER testi)
    gunluk-ozet-mutasyon         8/8 (3'ü yeni)
    panel:dogrula                770 ölçüt (2'si yeni)
    panel-mutasyon:kontrol       27/27 (1'i yeni)

⚠ **HARNESS "GEÇTİ" DEMEDİ, "ÖLÇÜLEMEDİ" DEDİ.** Markdown söken mutasyonun
deseni çift kaçırılmıştı ve hedefle eşleşmiyordu; harness bunu yeşil saymadı,
`desen 0 kez geçiyor (1 olmalı)` diye durdurdu. Yeşil sayılsaydı o davranış
**korumasız kalır ve kimse göremezdi.**

### HALİL TEST LİSTESİ

1. `/` → "Pazaryeri performansı" kartındaki halkanın sağındaki liste
   **kırpılmamış** olmalı: kanal adı + tutar + yüzde üçü de tam görünmeli.
2. Dar ekranda (telefon) efsane halkanın **altına** inmeli, yanında ezilmemeli.
3. `/hakedis` sayfasındaki pasta grafiği **değişmemiş** olmalı.
4. Sağ üstteki **"Günlük Özet"** kutusunda `**` yıldızları GÖRÜNMEMELİ.
5. Aynı kutuda yazan satır bir **cümle** olmalı ("Kırmızı" gibi tek kelimelik
   başlık değil).
6. Hiç özet üretilmemişse kutu **"henüz yok"** demeli, boş kalmamalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #5 — sessiz/anlamsız çıktı yok)

---

## 🔴 K248 — GÖREV KUTUCUĞU ŞERİT BİÇİMİNDE · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Panel demosunun dördüncü paketi. Eski hâl: **büyük rakam ÜSTTE, 11 px etiket
ALTTA** — iki satır, ve dar hücrede etiket harf harf sarıyordu
("Kargo | ya verilm | emiş"). Bu zaten belgelenmiş bir sorundu. Şimdi
**etiket önde, rakam yanında, tek satır.**

### ⛔ DEMODAKİ "TAM GENİŞLİK ŞERİT" BİREBİR ALINMADI — VE SEBEBİ ÖLÇÜLDÜ

Demonun tek satırlık tam genişlik şeridi **iki kayıtlı kullanıcı kararını
sessizce geri alırdı**:
· **20.08.2026** — iki ayrı kart, çünkü sevkiyat ile tedarik _"günün farklı
  saatlerinde, çoğu zaman farklı kişilerce"_ yapılıyor;
· **K126-C, 01.09.2026** — _"Mal ve kayıt kartının bitişi ile pazaryeri
  performansı kartının bitişi aynı yerde olmalı."_ Sol sütunu inceltmek o
  hizayı bozardı — üstelik K247 sağ sütunu daha da uzattı.

Bu yüzden şerit **kartların İÇİNE** alındı: gruplama ve sütun hizası duruyor,
kazanılan şey okunabilirlik.

### ⚠ ÖLÇÜT YAZARKEN YAKALANAN İKİ KUSUR

**① "Görünür etiket var" ölçütü `{etiket}` SAYIYORDU.** Sınıfı `sr-only`
yapan mutasyon sayıyı değiştirmiyor — **yeşil geçerdi.** Ölçüt görünür span'in
kendisine bağlandı (desen VARLIĞI değil KULLANIMI).

**② Sıra ölçütü YAZILMADI.** Tek `replace` ile gerçek bir yer değiştirme
mutasyonu kurulamıyor; mutasyonsuz ölçüt teslim edilmez.

### ⛔ GÖRÜNÜR ETİKET, `sr-only`NİN YERİNE GEÇMEZ

Yayılan bağlantı (`absolute inset-0`) kutunun tamamını kaplıyor ve görünür
etiket onun **İÇİNDE DEĞİL** — dolayısıyla bağlantının erişilebilir adı ondan
gelmez. `sr-only` düşseydi ekran okuyucu "bağlantı" deyip NEREYE gittiğini
söyleyemezdi; hiçbir göz testi bunu göstermez. Ayrı mutasyonla korunuyor.

### ÖLÇÜLDÜ

    panel:dogrula                768 → 770 ölçüt (4'ü K248)
    panel-mutasyon:kontrol       26/26 (4'ü K248)
    taban yeşilliği              mutasyon turundan HEMEN ÖNCE ölçüldü

### HALİL TEST LİSTESİ

1. `/` → "Bugün ne göndermeliyim" ve "Mal ve kayıt" kartları. Her kutucukta
   **etiket ÖNDE, rakam YANINDA** tek satırda olmalı.
2. Hiçbir etiket harf harf sarmamalı ("Kargo | ya verilm | emiş" olmamalı).
3. "Kargoya verilmemiş sipariş" kutucuğundaki **"N paketlendi"** bağlantısı
   çalışmalı ve süzülü listeyi açmalı.
4. Sıfır olan kutucuk **kaybolmamalı**, yeşil ✓ "temiz" demeli.
5. Tarife kutucuğu 0 iken **"N gün kaldı"** yazmalı (rakam değil).
6. **Telefonda** her kutucuk rahat dokunulabilmeli (44 px) ve "N paketlendi"
   bağlantısına basınca ana kutunun hedefi DEĞİL, kendi listesi açılmalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #8 · #12)

## 🔴 K247 — CİRO HALKASI PANELDE, KANAL KARTLARIYLA AYNI DÜZLEMDE · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Panel demosunun üçüncü paketi. Kullanıcı kararı: _"pazaryeri performansı ile
ciroya göre kanal aynı düzlemde olamaz mı"_.

### ① NİYE AYNI DÜZLEM

İkisi **aynı soruyu** cevaplıyor: _hangi kanal ne getiriyor._ Ayrı kartlarda
dursalardı göz, halkadaki `%57`'yi karttaki NET payı `%57,5` ile birleştirmek
için ekranı iki kez dolaşırdı — oysa **asıl bilgi o iki sayının FARKINDA**
(K246 tam bunu cümleye çevirmişti).

Halka `xl` ve üstünde kartların **sağında** 240 px'e sabit duruyor, dar
ekranda kartların altına iniyor.

### ⛔ DEMODA VAR AMA YAPILMADI — VE SEBEBİ ÖLÇÜLDÜ

Demoda operasyon grafiğini çizgiden **sütuna** çevirmiş ve "iki grafik akışı
bozmuş" sorununu öyle çözmüştüm. Gerçek panelde o sorun **yok**:

    günlük operasyon   ~2988. satır
    ürün analizi       ~3178. satır
    son N ay           ~3657. satır

Üçü arasında yüzlerce satırlık başka blok var; demodaki sıkışıklık demonun
kendi kurgusundan geliyordu. **Sebebi olmayan bir değişiklik**, çalışan çizgi
grafiğini ve onun açılır tablosunu bozardı.
_(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez" — burada ölçüm değişikliği
eledi.)_

### ⛔ RENK KARARI KAPSAMIYLA BİRLİKTE UYGULANDI

Kanal renkleri **halkada** kullanılıyor, **kartlarda kullanılmıyor**. Kodun
kendi kararı duruyor:

> _"Kanala ayrı KİMLİK RENGİ verilmedi: 11 kanal için 11 ton, dört durum
> rengiyle karışır ve 'yeşil = iyi' anlamı çökerdi. Bilgiyi taşıyan renk
> değil UZUNLUK."_

Halka bir **KATEGORİ** grafiği — dilimleri ayırmaktan başka işi yok ve
`KANAL_RENKLERI` zaten tam bunun için var; hakediş pastası da aynı paleti
kullanıyor, yani **aynı kanal her ekranda aynı renkte**.
Bu bir "dokunmuyor" iddiası olduğu için **FAZLADAN yönlü mutasyonla**
korunuyor: kart çubuklarına kanal rengi sızdıran senaryo kırmızı yanıyor.

⚠ **TANINMAYAN KANAL ÜRETİLMİŞ RENK ALMAZ.** Paletin sırası renk körlüğü
ayrımı ölçülerek seçilmişti; aradan bir ton uydurmak o ölçümü bozar. Palet
dışı kanal `KANAL_RENGI_VARSAYILAN`'a düşer. Varsayılan olmasaydı renk
`undefined` olur ve **dilim hiç çizilmezdi** — ciro toplamdan düşmeden, sessizce.

### ⚠ BEKÇİ YAZILIRKEN YAKALANAN KENDİ HATAM

"Kart çubukları nötr kaldı" ölçütü bloğu şöyle kesiyordu:

    sayfa.indexOf("  return (")

`indexOf` satır başına çapalanmaz: derin girintili bir `      return (` de bu
diziyi **içerir** ve bloğun ÖNÜNDE bir konum döndürür. Dilim boş kaldı ve
ölçüt `!"".includes(...)` ile **her zaman yeşil yanacaktı.** Yakalayan şey
taban doluluk beyanı oldu (`bas >= 0 && son > bas`) — boş küme her koşulu
sağlar. Çapa `search(/\r?\n {2}return \(/)` ile satır başına bağlandı.
_(Anayasa: "ölçüt kullanıma bağlanır, ada ya da dizeye değil" + "`every`
kapısı taban doluluğunu ayrıca kanıtlar".)_

### ÖLÇÜLDÜ

    panel:dogrula                764 ölçüt (7'si yeni)
    panel-mutasyon:kontrol       22/22 (4'ü yeni — 3 KALDIRAN · 1 FAZLADAN)
    tsc --noEmit                 çıktı BOŞ
    taban yeşilliği              mutasyon turundan HEMEN ÖNCE ölçüldü (0)

### HALİL TEST LİSTESİ

1. `/` (Panel) → **"Pazaryeri performansı"** kartı. Geniş ekranda kanal
   kartlarının **sağında** bir halka (donut) olmalı.
2. Halkanın dilim renkleri kanal renkleriyle aynı olmalı: Trendyol **mavi**,
   Hepsiburada **turuncu**, N11 **sarı**, Amazon **yeşil**.
3. Aynı renkler `/hakedis` sayfasındaki pastada da aynı kanala denk gelmeli —
   iki ekranda aynı kanal aynı renkte.
4. Halkanın ortasındaki toplam, kartın üstündeki **brüt ciro** ile birebir
   aynı olmalı.
5. Dilim yüzdeleri, aynı kanalın kartındaki **ciro payı** çubuğunun yüzdesiyle
   birebir tutmalı.
6. Kanal **kartlarındaki çubuklar renkli OLMAMALI** — nötr kalmalı.
7. Telefonda halka kartların **altına** inmeli, yan yana sıkışmamalı.
8. Dönemde hiç satış yoksa halka yerine **"Bu dönemde satış yok"** yazmalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni anahtar yok, `donemBos`
yeniden kullanıldı) · **kullanıcı kolaylığı: ✓** (İlke #10 — aynı kanal her
ekranda aynı renk · İlke #12 — boşluk bilgi taşımıyordu, halka o alanı
dolduruyor)

### KALAN PAKET

    K248  görev kutusu şeridi  ✓ (kart İÇİNDE — tam genişlik şerit
          iki kayıtlı kullanıcı kararını çevirirdi, ölçüldü)

## 🔴 K246 — İKİ PAY ÇUBUĞUNUN FARKI ARTIK CÜMLE · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Panel demosunun ikinci paketi. Kullanıcının demoda en çok beğendiği şey
kanal kartındaki hüküm satırıydı.

### ① FARK ZATEN ÖNEMLİYDİ — AMA OKUNMUYORDU

Kanal kartı iki pay çubuğu çiziyor (cironun yüzde kaçı · NET-2'nin yüzde
kaçı) ve kodun kendi yorumu niye çizdiğini yazıyor:

> _"Biri hacmi, diğeri gerçek kazancı gösterir ve FARKLI OLABİLİRLER — o
> fark önemlidir: cironun %60'ını taşıyan kanal kârın %40'ını getiriyor."_

Gerekçe doğruydu, **teslim eksikti**: fark ÇUBUKLARDAN okunuyordu. İki
uzunluğu gözle kıyaslayıp aradaki birkaç pikseli yorumlamak gerekiyordu.

> **PANEL BİR HÜKÜM YERİDİR.** Cironun %31,6'sını taşıyan kanal NET'in
> %31,1'ini getiriyorsa **lira başına daha az kazandırıyor** demektir.
> Bunu okuyucunun çıkarmasına bırakmak, çoğu zaman çıkarılmaması demek.

### ② YAPILAN

`lib/panel/pay-farki.ts` — saf gövde, kartın altına tek cümle:

    NET payı ciro payının 0,7 puan ÜSTÜNDE      (olumlu tonu)
    NET payı ciro payının 0,5 puan ALTINDA      (olumsuz tonu)
    NET payı ciro payıyla aynı hizada           (nötr)

### ⚠ ÜÇ KURAL — ÜÇÜ DE MUTASYONLA KORUNUYOR

**KÂR HESAPLANAMADIYSA HÜKÜM YOK.** `net2Payi === null` ise cümle hiç
çizilmez. "Aynı hizada" demek, defterin bilmediği bir kanal hakkında
olmayan bir bilgiyi varmış gibi sunmak olurdu.
_(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında iddia
kurmaz".)_

**YUVARLAMA ARTIĞI HÜKÜM DEĞİLDİR.** İki pay yuvarlama yüzünden neredeyse
hiç kuruşuna eşit olmaz; eşik olmasaydı HER kartta "0,01 puan üstünde"
yazar ve cümle gürültüye dönerdi.

**EŞİK K245'İN ROZET EŞİĞİYLE AYNI (0,05 puan).** İki yerde iki eşik
olsaydı aynı kanal için kutu "değişim yok" derken kart "0,03 puan üstünde"
diyebilirdi.

### ⛔ DEMODAN ALINMAYAN ŞEY — VE NİYE

Demoda kanal kartlarında **kanal renkleri** kullanmıştım. Kodda bunun
aksine bilinçli bir karar var ve gerekçesi yazılı:

> _"Kanala ayrı KİMLİK RENGİ verilmedi: 11 kanal için 11 ton, dört durum
> rengiyle karışır ve 'yeşil = iyi' anlamı çökerdi. Bilgiyi taşıyan renk
> değil UZUNLUK."_

Gerekçe sağlam; çubuklar nötr kaldı. Kanal renkleri **halkada**
kullanılacak — orası bir KATEGORİ grafiği ve `KANAL_RENKLERI` zaten tam
bunun için var, hakediş pastasında da öyle kullanılıyor.
_(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur" —
burada tersi: kapsamı içindeki bir ilkeyi demo uğruna çiğnememek.)_

### ÖLÇÜLDÜ

    panel:dogrula                757 ölçüt (13'ü yeni · 7'si DEĞER testi)
    panel-mutasyon:kontrol       18/18 (3'ü yeni, üç yön)
    i18n:kontrol                 tr/en eşit · 0 eksik
    tsc --noEmit                 çıktı BOŞ

### HALİL TEST LİSTESİ

1. `/` (Panel) → "Pazaryeri performansı" kartı. Her kanal kartının
   ALTINDA tek satırlık cümle olmalı: **"NET payı ciro payının X puan
   ÜSTÜNDE/ALTINDA"**.
2. Cümlenin rengi yönle uyumlu olmalı: üstünde yeşil, altında kırmızı,
   aynı hizada gri.
3. Cümledeki puan, üstteki iki çubuğun yüzdelerinin FARKINA eşit olmalı.
   Örnek: ciro %31,6 · NET %31,1 → **0,5 puan ALTINDA**.
4. Kârı hesaplanamamış bir kanal varsa (NET çubuğu hiç çizilmiyorsa)
   cümle de **HİÇ ÇIKMAMALI** — "aynı hizada" yazmamalı.
5. Satışı olmayan kanalın kesik çizgili kartında cümle olmamalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (3 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓** (İlke #16)

### KALAN İKİ PAKET

    K247  ciro halkası panele  ✓ (operasyon sütuna ÇEVRİLMEDİ — ölçüm eledi)
    K248  görev kutusu → tek satırlık şerit

---

## 🔴 K245 — NET-2 MARJI KUTUSU: BİR ORANIN DEĞİŞİMİ PUAN, YÜZDE DEĞİL · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı panel tasarımı için bir demo istedi, demoyu onayladı ve
_"birebir yapabilir misin"_ dedi. Demo dört pakete bölündü; bu birincisi.

### ① DEMODAKİ KIRMIZI KUTU — VE NİYE KIRMIZI

Demoda altı hüküm kutusundan biri bilerek kırmızıydı: ciro %8 artarken
NET-2 marjı 0,6 puan geriliyordu. **Panelin söylemesi gereken şey tam
buydu ve hiçbir kutu onu söylemiyordu.** Tutar kutularının altısı da
yeşilken hiçbiri bir şey söylemez.

### ② ÖLÇÜM ÖNCE — MEKANİZMANIN YARISI ZATEN VARDI

Yazmaya başlamadan ölçtüm ve varsayımım yanlış çıktı:

    IstatistikKutusu       `kiyas` yuvası ZATEN var
    kiyasRozeti()          ZATEN yazılmış
    kullanan kutu          3 (ciro · NET-1 · NET-2)
    kıyas bloğu            `kiyasBlogu(paraBirimi)` ZATEN hesaplanıyor
    eksik olan             marj kutusunun KENDİSİ

Yani "en büyük değişiklik" diye sunduğum şeyin çoğu üründe duruyordu.
_(Anayasa: "yokluk iddiası da iddiadır" — üç kez bakılmadan kurulup üçü de
yanlış çıkmıştı; bu kez bakıldı.)_

### ⛔ ASIL TUZAK: HAZIR ROZETE BAĞLAMAK YANLIŞ RAKAM ÜRETİRDİ

Mevcut `kiyasRozeti` bir **TUTARIN** değişimini yüzdeyle anlatır ve orada
doğrudur. Marj ise zaten bir **ORAN**. Aynı rozete bağlansaydı:

    marj  %17,1 → %16,5
    kiyasRozeti  →  "▼ 0,6 · %3,7"      ← 0,6 / 17,1
    doğrusu      →  "▼ 0,6 puan"

Rakam matematiksel olarak doğru, **cümle yanlış**: okuyan marjın 3,5 puan
düştüğünü sanır. Ve yanlışlığı kendini belli etmez — sayı makul görünür.
_(Anayasa: "metin, sahip olmadığı anlamı iddia etmez" · "bir sayı
etiketiyle taşınır".)_

### ③ YAPILAN

· **`oranDegisimi()`** — saf gövde, `lib/karsilastirma.ts`. İki oranı
  hesaplar ve farkı **PUAN** olarak verir.
· **`oranKiyasRozeti()`** — panelde ayrı rozet. `kiyasRozeti` YERİNDE
  KALDI: iki ayrı soruya iki ayrı cevap, biri ötekini bozmaz.
· **NET-2 marjı kutusu** — NET-2'nin hemen ardında, huninin sonunda.
· **`bicim.sayi(deger, basamak = 0)`** — puan bir haneyle yazılır.
  Varsayılan değişmedi, çağıranların hiçbiri etkilenmedi.

### ⚠ İKİ KURAL DAHA — İKİSİ DE ÖLÇÜLDÜ

**CİRO YOKKEN MARJ "%0" DEĞİL.** `ciroyaOran` zaten payda ≤ 0 iken `null`
dönüyordu ve o kural aynen kullanıldı. "%0 marj" demek "hiç kâr yok"
demektir; doğru cevap **"hesaplanamıyor"**.

**0,05 PUAN ALTI DEĞİŞİM SAYILMAZ.** Eşik uydurma değil, rozetin işlevinden
geliyor: 0,02 puanlık bir kıpırtı "değişim" diye yazılırsa rozet HER GÜN
yanar ve okunmaz olur. _(Anayasa: "yanlış uyarı, uyarısızlıktan kötüdür".)_

### ÖLÇÜLDÜ

    panel:dogrula                744 ölçüt (16'sı yeni · 9'u DEĞER testi)
    panel-mutasyon:kontrol       15/15 (5'i yeni, üç yön)
    i18n:kontrol                 tr/en eşit · 0 eksik
    tsc --noEmit                 çıktı BOŞ

Mutasyonların ikisi doğrudan bu paketin varlık sebebini koruyor:
`oranDegisimi`yi yüzdeye çeviren ve marj kutusunu yüzde rozetine bağlayan
senaryolar — ikisi de KIRMIZI yandı.

### HALİL TEST LİSTESİ

1. `/` (Panel) → "Seçili dönem" kartında **sekiz** kutu olmalı; sonuncusu
   **NET-2 marjı**, altında `NET-2 ÷ brüt ciro` yazar.
2. Üstteki **Karşılaştır → Önceki dönem**e bas. Marj kutusunun altında
   rozet çıkmalı ve **"puan"** kelimesi geçmeli — "%" ile biten bir
   değişim yazmamalı.
3. Ciroyu sıfırlayan bir süzgeç seç (satışı olmayan bir gün). Kutu
   **"hesaplanamıyor"** yazmalı, **%0 YAZMAMALI**.
4. Karşılaştırmayı kapat. Rozet hiç çıkmamalı, rakam kalmalı.
5. Telefonda: sekiz kutu ikişerli sarmalı, yatay kaydırma çıkmamalı.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (4 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓**

### SIRADAKİ ÜÇ PAKET

    K246  pazaryeri kartları + ciro halkası AYNI DÜZLEMDE
    K247  operasyon çizgiden SÜTUNA; para ile yan yana
    K248  görev kutusu → tek satırlık şerit

---

## 🔴 K244 — PANEL BİR HÜKÜM YERİDİR: DÖKÜM KANAL LİSTELEMEYE TAŞINDI · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı aynı turda iki bildirim gönderdi; ikisi de panelin İLK EKRANINI
yiyen kutulardı ve tek satırda çözüldüler.

**①** _"bu bölüm Kanal Listeleme sekmesine alınabilir: panelde sadece küçük
bir uyarı olur."_ (Rafta var, vitrinde yok)
**②** _"yapay zeka günlük verisi çok yer kaplıyor, sağ tarafa alınabilir."_

### NİYE HAKLI — SATIR SAYISI VERİYLE BÜYÜYOR

"Rafta var, vitrinde yok" kutusu **kanal başına BİR kart** çiziyor ve her
kartta dört kutucuk var. Bugün 3 kanal = 3 kart · 12 kutucuk. Hedef **11
kanal**: aynı kutu panelin tamamını yerdi.

> **İlke #13 tam bunu yasaklıyor:** _"satır sayısı veriyle birlikte BÜYÜYEN
> hiçbir şey özet ekranına konmaz — bugün 3 satırla masum görünen liste,
> hacim artınca ekranı yutar."_ Kural yazılıydı; kutu yine de panelde
> doğmuştu çünkü doğduğu gün TEK kanal vardı.

Günlük Özet de tam genişlikteydi ve altındaki asıl iş kutularını katlanın
altına itiyordu (İlke #12: alanı verimli kullan).

### YAPILAN

· Döküm `/kanal-listeleme`ye taşındı — o sayfa zaten _"hangi ürün hangi
  kanalda ne durumda"_ sayfası; döküm orada **bağlamın içinde** duruyor,
  panelde bağlamsızdı.
· Panelde tek satırlık **şerh** kaldı: rakam + gerekçe + bağlantı.
· Şerh **solda 3/5**, Günlük Özet **sağda 2/5** — ızgara alttakiyle AYNI
  (5 sütun), yoksa kartların kenarları alt alta gelmezdi.

### ⛔ İKİ ŞEY PANELDEN KAYBOLMADI — İKİSİ DE ÖLÇÜLMÜŞ UYARI

① rafta yatan sermaye (adet + tutar),
② ölçümün **bayat ya da hiç yapılmamış** olması.

İkincisi gizlenseydi kaçırılan bir gece koşumu panelde hiçbir iz bırakmaz ve
rakam TAZE sanılırdı. _(Anayasa: "kaçışın kendisi görünür kılınır".)_

⚠ **SIFIRDA BAĞLANTI YOK** (İlke #2): açılacak liste yokken tıklanabilir
görünmek, kullanıcıyı boş ekrana yollamaktır. Ama ölçüm şüpheliyse bağlantı
KALIR — orada bakılacak bir şey vardır.

### ⭐ ÖLÇÜT ORTAK GÖVDEYE ÇIKTI — ÇÜNKÜ İKİNCİ OKUYUCU DOĞDU

Eşik (`BAYAT_SAAT = 48`) ve _"bu kanalın ölçümü şüpheli mi"_ ölçütü kutunun
İÇİNDE yerel bir ifadeydi. Şerh aynı soruyu sormak zorunda kalınca ikisi de
`lib/panel/vitrin-serhi.ts`e taşındı.

> İki yerde iki ölçüt olsaydı **panel "taze" derken kutu "bayat" derdi** —
> ve iki ekran aynı kanal için farklı hüküm verirdi.

Bekçi bunu iki parça hâlinde ölçüyor: gövde ölçüyü **kuruyor mu**, ve kutu
onu **çağırıyor mu**. Biri olup öteki olmayınca ölçüt sessizce düşer.

### ⚠ İKİ MUTASYON KAÇTI — İKİ ÖLÇÜT EKSİKMİŞ

Yeni harness ilk koşumda **6/8** verdi ve kaçanlar şunlardı:

    ✗ ŞERHE VERİ GİTMİYOR     `veri={[]}` ile besleme YEŞİL geçti
    ✗ SIFIRDA DA BAĞLANTI      Ilke #2 hiç ölçülmüyordu

Birincisi klasik tuzak: ölçüt **niteliğin varlığını** arıyordu (`veri={`),
değerini değil. Nitelik duruyor, içi boş — panel her zaman "temiz" der ve
rafta yatan sermaye hiç yazılmaz. Ölçüt `veri={vitrin}`e bağlandı.
_(Anayasa: "ölçüt kullanıma bağlanır — ada ya da dizeye değil".)_

### ⭐ TABAN KAPISI İŞİNİ YAPTI

Ölçütleri sıkılaştırırken bekçiyi bir tırnak hatasıyla çökerttim. Harness
mutasyonları koşmadı, **"TABAN KIRMIZI — ölçüm GEÇERSİZ"** deyip durdu.
K243'te eklenen kapı, eklendiğinin ertesi paketinde gerçek bir vakada
ısırdı.

### ÖLÇÜLDÜ

    vitrin:dogrula                 129 ölçüt (16'sı yeni · 11'i DEĞER testi)
    vitrin-mutasyon:kontrol        8/8 (YENİ harness · taban kapılı)
    panel:dogrula                  yeşil (renk jetonları)
    i18n:kontrol                   tr/en eşit · 0 eksik
    tsc --noEmit                   çıktı BOŞ

### HALİL TEST LİSTESİ

1. `/` (Panel) → üstte **tek satırlık** şerh olmalı: mağaza ikonu + "Rafta
   var, vitrinde yok" + **33 ürün · ₺105.613,16** (3 kanalın toplamı: 19+13+1 · 69.549,88 +
   25.267,28 + 10.796,00). ⚠ Bu rakam kullanıcının 23.09 ekran görüntüsünden
   toplanmıştır; defter o günden beri değiştiyse sayı da değişir — önemli
   olan **şerhin toplamı ile `/kanal-listeleme`deki üç kartın toplamının
   BİREBİR TUTMASI** +
   sağda **"Kanal listeleme →"**.
2. Aynı satırda ölçüm uyarısı: HB ve N11'de koşum izi yok, yani
   **"2 kanalın ölçümü şüpheli"** yazmalı ve satır turuncu olmalı.
3. Panelde **üç büyük kart artık OLMAMALI**. Günlük Özet kutusu **sağda**,
   şerhin yanında ve dar olmalı.
4. **"Kanal listeleme →"**ye bas. `/kanal-listeleme` açılmalı ve üç kanal
   kartı **başlığın hemen altında** durmalı — panelde görünenlerin aynısı.
5. Telefonda: şerh ile Günlük Özet alt alta sarmalı, yatay kaydırma
   ÇIKMAMALI.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (3 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓** (İlke #2 · #12 · #13)

---

## 🔴 K243 — DESİ VE KANAL KARGO FİRMASI DEFTERDE VARDI, EKRAN GÖSTERMİYORDU · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

**KULLANICI:** HB siparişi `4328856038` detayının ekran görüntüsü —
_"burada ürünün desisi ve kargo firması da çıkmalı; bunları API'den alıyor
olmalısın, kontrol eder misin?"_

### ① İLK ŞÜPHEM YANLIŞTI — VE ÖLÇÜM ÇÜRÜTTÜ

Kodu okuyunca çekim tarafında bir kör nokta göründü ve _"muhtemelen
çekilmemiş"_ dedim. **Ölçüm tersini söyledi** — defter O SİPARİŞTE DOLUYDU:

    kanalKargoDesi        5
    kanalKargoFirmasi     hepsiJET
    cargoDesi (tahmin)    5
    cargoCarrier (BİZİM)  SEÇİLMEDİ

API da veriyordu: sipariş detayında `cargoCompanyModel.name = hepsiJET`,
`/shipped` ucunda `Deci = 5` (17/17 kayıtta `Deci` dolu).

> **KUSUR ÇEKİMDE DEĞİL, GÖSTERİMDEYDİ.** İki bilinen değer, TEK bir koşulun
> (bizim firma seçimimiz) arkasında saklanıyordu. _(Anayasa: "bir ekranın ne
> gösterdiği, ölçülmeden iddia edilmez" — ve bu kez iddiayı BEN kurmuştum.)_

### ② YAPILAN — EKRAN

· **Desi artık firma seçimine bağlı değil**, ayrı satır.
· **Kaynağıyla yazılıyor:** `5 — kanal tartımı` ile `5 — tahmini` farklı
  şeylerdir ve hangisi olduğu yazılmazsa okuyanın kafasında çözülür.
· **Kanalın kargo firması AYRI satır.** Şema bunu açıkça ayırıyor:
  `cargoCarrierId` tarife/maliyet/kârın okuduğu BİZİM seçimimiz,
  `kanalKargoFirmasi` kanalın FİİLEN gönderdiği firma. İkisi ayrıştığında fark
  tam da tarife hatasının çıktığı yerdir — ve o fark ancak İKİSİ DE ekranda
  dururken görülür.
· **Bilinmiyorsa satır HİÇ çıkmıyor** — boş bir "—" kanalın bir şey
  söylemediğini değil, bizim bakmadığımızı düşündürürdü.

### ③ YAPILAN — ÇEKİM KÖR NOKTASI (gerçekti, ama başka satırlarda)

Geri doldurma döngüsü **İKİ ŞEY** yazıyor (takip kodu VE kargo firması) ama
seçimi yalnız `shipmentCode: null` diyordu. Kodu bir kez yazılmış sipariş bir
daha SEÇİLMİYOR ve firması sonsuza kadar boş kalıyordu.

    HB toplam satış                     3376
    kanalKargoFirmasi DOLU                84
    kanalKargoDesi DOLU                   76
    ── kör nokta ──
    takip kodu DOLU + firma BOŞ           53   ← bir daha hiç seçilmiyordu
    kargolanmış + desi BOŞ                59
    (TY kıyası: 4649 satış · firma 651 · desi 641)

Seçim artık iki alanı birden soruyor; **yazma İKİ AYRI sorgu kaldı** (tek
sorguda yazmak öbür alanı haksız ezerdi — dosyanın kendi yorumu bunu zaten
yazıyordu, eksik olan SEÇİM tarafıydı).

### ⚠ AÇIK KALAN — KANAL İKİ FARKLI DESİ SÖYLÜYOR

Aynı sipariş için sipariş detayı `deci = 15`, `/shipped` ucu `Deci = 5`
diyor; biz `/shipped`i alıyoruz (tartılmış, gerçekleşen desi). Hangisinin ne
olduğu **ölçülmedi** ve bu kalem açık. Kargo maliyeti bu sayıdan hesaplandığı
için önemsiz değil.
⛔ **AÇILIŞ ŞARTI:** kanalın kestiği gerçek kargo bedeliyle çapraz bir ölçüm
(hakediş satırı), yani hangisinin faturaya dönüştüğünü kanalın KENDİ belgesi
söyleyene kadar hüküm verilmez.

### ⭐ TUR SIRASINDA ÇIKAN ÜÇ BULGU — ÜÇÜ DE YALANCI YEŞİL AİLESİNDEN

**(a) TABAN KIRMIZIYKEN HER MUTASYON "YAKALANDI" GÖRÜNÜR.** K242'de bir çapa
taşınınca `stok-siralama:dogrula` ölçütü eskidi ve KIRMIZI kaldı; harness yine
de **"32/32 yakalandı"** dedi. Çünkü harness "bekçi kırmızı yandı → yakalandı"
diyor ve bekçi ZATEN kırmızıydı.
→ Harness'e **taban yeşili kapısı** eklendi ve kapı sınandı (kasten kırmızı
yapılıp "TABAN KIRMIZI — ölçüm GEÇERSİZ" dediği GÖRÜLDÜ).
⚠ **35 harness'in 34'ünde bu kapı YOK** — açık kalem, aşağıda.

**(b) KENDİ AÇIKLAMA YORUMUM BİR BEKÇİYİ KÖR ETTİ.** Taban yeşile dönünce
gerçekten korumasız bir mutasyon ortaya çıktı: `useState`i koddan tamamen
kaldıran senaryo bekçiyi yeşil bıraktı — çünkü K242'de yazdığım yorumda
`useState(baslangic)` geçiyordu ve desen dosyada AYAKTA kalıyordu.
→ Bekçi artık **yorumsuz koddan** okuyor. _(Anayasa'da yazılıydı; yine de
düşüldü — bu kez kuralı çiğneyen şey kuralı ANLATAN cümleydi.)_

**(c) 463 ÖLÇÜTLÜ BİR BEKÇİNİN HİÇ MUTASYONU YOKTU.**
`ice-aktarma:dogrula` en büyük bekçilerden biri ve hiçbir ölçütü mutasyonla
sınanmamıştı. Bu turda harness açıldı (3/3, taban kapılı) ama kapsamı
**yalnız K243 ölçütleri**; kalan 461 ölçüt hâlâ mutasyonsuz ve harness bunu
başlığında YAZIYOR.

### ÖLÇÜLDÜ

    kargo-kaynagi:dogrula            28 ölçüt (6'sı yeni)
    kargo-kaynagi-mutasyon:kontrol   10/10 (3'ü yeni)
    ice-aktarma:dogrula              463 ölçüt (2'si yeni)
    ice-aktarma-mutasyon:kontrol     3/3 (YENİ harness · taban kapılı)
    stok-siralama:dogrula            64 ölçüt (1'i güncellendi)
    stok-siralama-mutasyon:kontrol   32/32 (taban kapısı eklendi)
    i18n:kontrol                     tr/en eşit · 0 eksik
    tsc --noEmit                     çıktı BOŞ

### HALİL TEST LİSTESİ

1. `/satislar` → **4328856038**'i aç. Üç satır birden görünmeli:
   **Kargo firması: Kargo firması seçilmedi** · **Toplam desi: 5 — kanal
   tartımı** · **Kanalın kargo firması: hepsiJET**.
2. Kendi kargo firmanızı seçin. Beklenen: desi satırı **DEĞİŞMEZ** (5 — kanal
   tartımı), üstteki satır firmayı yazar.
3. Kanalın firmasını BİLMEDİĞİMİZ eski bir satış açın. Beklenen: o satır
   **HİÇ ÇIKMAZ** (boş "—" yok).
4. Elle girilmiş (kanalsız) bir satış açın. Beklenen: desi satırı ya
   **"— tahmini"** der ya hiç çıkmaz; "kanal tartımı" YAZMAZ.
5. Bir sonraki HB çekiminden sonra `/satislar`da takip kodu dolu ama firması
   boş bir sipariş açın — firma **dolmaya başlamış** olmalı (53 satırlık kör
   nokta tur tur kapanır, tavan 100/tur).

**mobil doğrulama kullanıcıda** · **i18n: ✓** (2 yeni anahtar, tr+en) ·
**kullanıcı kolaylığı: ✓**

### AÇIK KALEM — 34 HARNESS'TE TABAN KAPISI YOK

Ölçüldü: **35 mutasyon harness'inin 1'inde** taban yeşili kapısı var (bu
turda eklenen). Kalan 34'ünde bekçi zaten kırmızıysa tüm mutasyonlar
"yakalandı" görünür ve tur kusursuz raporlanır.
⛔ **TEK TEK YAMANMADI ÇÜNKÜ:** 34 dosyanın yapısı aynı değil (kimi tek
bekçi, kimi liste); körlemesine yama harness'leri bozabilir ve bozuk bir
harness, kapısız harness'ten kötüdür. Doğru şekil kapıyı **ortak gövdeye**
(`mutasyon-deseni.ts`) taşıyıp tek tek bağlamak.

---

## 🔴 K242 — BİR BAĞLAMIN DEĞERİ ÖTEKİNE SIZIYORDU: İKİ EKRAN, TEK KÖK · 23.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

Kullanıcı aynı turda iki ayrı ekran bildirdi; ikisi de **aynı sınıf**:
bir bağlama ait değer, bağlam değiştikten sonra ekranda kalıyor.

### ① TARİFE HESAPLAMA — ve bu YANLIŞ RAKAM ÜRETİYORDU

**KULLANICI:** _"Bir ürün için yazdığımız kargo ve satış fiyatı, diğer bir
ürüne geçtiğimizde de kalmaya devam ediyor."_

`kargo` ve `guncelFiyat` **LİSTE seviyesinde tek durumda** tutuluyor, ürün
başına değil. Açma/kapama yalnız `sonuc`u sıfırlıyordu.

> ⛔ **BU KOZMETİK DEĞİL.** A ürününün fiyatıyla B ürününün NET'i
> hesaplanır ve ekranda **makul görünür** — yanlış rakam, yanlış olduğunu
> söylemez. Kullanıcı bu ekrana _"fiyatı 1095 yap, daha fazla kazan"_ demesi
> için bakıyor; girdisi başka üründen geliyorsa öneri de yanlıştır.

**YAPILAN:** ürün değişince `setKargo("")` · `setGuncelFiyat("")` ·
`setSonuc(null)` birlikte koşuyor.

### ② `/stok` TEMİZLE — VE BU HATA 24.08'DE BİR KEZ DÜZELTİLMİŞTİ

**KULLANICI:** _"Barkod arattıktan sonra temizleme yaptığımız hâlde liste
yenileniyor fakat aranan barkod kalmaya devam ediyor."_

Sebep görünmez: Temizle bir `<Link>`ti; istemci tarafı yönlendirmede bileşen
yeniden **KURULMUYOR**, dolayısıyla `useState(baslangic)` ilk değerinde
kalıyor. Liste boşalıyor, kutu dolu duruyor.

⛔ **AYNI HATA 24.08.2026'DA ORTAK GÖVDEDE (`KodAramaKutusu`) DÜZELTİLMİŞTİ.**
`/stok` kendi kutusunu yazdığı için düzeltme oraya **hiç ulaşmadı** — ve bunu
bir ay boyunca hiçbir şey söylemedi.
_(Anayasa: "düzeltme yolu, TÜM OKUYUCULARA ulaştığı ölçülmeden 'var' sayılmaz".)_

**ÇARE DOSYA LİSTESİ DEĞİL, DESEN YASAĞI:**

> Sorguyu yerel durumda tutan **her** arama kutusu, temizlemeyi durumu da
> sıfırlayan bir **düğme** ile yapar. `<Link>` ile temizleyen kutu YASAK.

Bugün kapsamda üç kutu var ve bekçi taban doluluğunu ayrıca kanıtlıyor
(`kod-arama-kutusu` · `stok-arama` · `analiz-arama-kutusu`). Yarın açılan
dördüncü kutu da kendiliğinden kapsama girer; kimsenin listeye eklemeyi
hatırlaması gerekmez.

### ⭐ REFAKTÖR BİR ÇAPAYI SİLDİ — MUTASYON TAŞINDI, SİLİNMEDİ

`<Link>` kaldırılınca `stok-siralama-mutasyon:kontrol` içindeki bir mutasyonun
çapası yok oldu ve harness **"geçti" demedi, "ÖLÇÜLEMEDİ" dedi**:

    ⛔ temizle yine duz /stok'a gidiyor (her seyi supurur)
         desen src/app/stok/stok-arama.tsx icinde 0 kez geciyor (1 olmali)

Mutasyonun niyeti aynı kaldı (_"temizle her şeyi süpüren düz `/stok`'a
gitmemeli"_), çapası yeni koda taşındı: `router.push(adresKur(""))`.
_(Anayasa: "refaktör, çapalı harness'i de taşır".)_

### ÖLÇÜLDÜ

    arama:dogrula                   122 ölçüt (3'ü yeni · taban 3 kutu)
    tarife:dogrula                  225 ölçüt (4'ü yeni)
    stok-siralama-mutasyon:kontrol  32/32 (2'si yeni)
    teklif-tanima-mutasyon:kontrol  34/34 (2'si yeni)
    tsc --noEmit                    çıktı BOŞ

### HALİL TEST LİSTESİ

1. `/tarife` → bir üründe **Net hesapla**, kargo `110` ve fiyat `1102` yaz.
   **Kapat**'a bas, başka bir üründe **Net hesapla**'ya bas.
   Beklenen: iki alan da **BOŞ**, yer tutucu ("örn. 110") görünüyor.
2. Aynı üründe hesaplat, sonra aynı ürünü kapatıp yeniden aç.
   Beklenen: yine boş — yeni bir hesap yeni başlar.
3. `/stok` → bir barkod arat, sonuç gelsin. **Temizle**'ye bas.
   Beklenen: liste tamamlanır **VE kutu boşalır**.
4. `/stok` → sıralamayı "Adet" yap, sonra barkod arat, sonra Temizle.
   Beklenen: sıralama **"Adet" olarak KALIR** (temizle yalnız aramayı siler).
5. Telefonda aynı iki akış.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni metin yok) ·
**kullanıcı kolaylığı: ✓** (İlke #5 · #10)

---

## 🔴 K239 — HB ÖDEMESİ "GEÇMİŞ"E GEÇMEDİ: SEBEP KANALIN KENDİ UCUNDA · VE ÖLÇERKEN BİR GÜN KAYMASI BULUNDU · 23.09.2026 · [KOD KOŞTU]

**KULLANICI BİLDİRİMİ (Halil #5):** _"HB ödeme geçmiş sekmesine GEÇMEMİŞ."_
HB panelinde 22 Eylül ₺84.680,85 **Ödendi** yazıyor; bizde hâlâ "Gelecek".

### ① SEBEP BİZDE DEĞİL — KANALIN UCU HENÜZ ÇEVİRMEMİŞ

K232-②'de yazılan "ödendi geçişi" **çalıştı ve bugün koştu** (23.09 04:35,
`tazelenen: 0`). Çevirecek satır YOKTU. HB API'sine doğrudan soruldu:

    vade 2026-09-15 · Paid       · pay=2026-09-15 · 100 kayıt   ← mekanizma çalışıyor
    vade 2026-09-22 · Paid       · pay=2026-09-22 ·   1 kayıt
    vade 2026-09-22 · WillBePaid · pay=-          · 106 kayıt   ← panelde "ödendi"
    vade 2026-09-23 · WillBePaid · pay=-          ·   4 kayıt

**Panel ile API aynı şeyi söylemiyor:** panel ödemeyi gösteriyor, uç hâlâ
`WillBePaid` diyor. Aynısı dün de ölçülmüştü. Uç çevirdiği an satırlar
kendiliğinden "Geçmiş"e geçer — kodda yapılacak bir şey yok.
⚠ **VE UYDURULMAZ:** panelde gördüğümüz için `paidAt` yazmak, kanalın
söylemediği bir şeyi deftere yazmak olurdu _(anayasa: "sistem, kendi
defterinde takip etmediği şey hakkında iddia kurmaz")_.

### ② ÖLÇERKEN ÇIKAN GERÇEK KUSUR — ORTAMIN SAATİ DEFTERE SIZIYORDU

Defteri API ile yan yana koyunca her kova **tam bir gün** kaymış göründü
(API 16.09/18 kalem ↔ defter 15.09/18 kalem; 22.09/106 ↔ 21.09/106). Tek
satır kimliğiyle karşılaştırıldı:

    API     dueDate  "2026-09-16T00:00:00"     ← saat dilimi YOK
    OKUNAN  vade      2026-09-15T22:00:00.000Z  ← Europe/Berlin (UTC+2)
    DEFTER  dueDate   2026-09-15T22:00:00.000Z

`new Date(ham)` saat dilimsiz damgayı **makinenin saatinde** okuyordu. Aynı
satır Vercel'de (UTC) `2026-09-16T00:00:00Z` olarak yazılıyordu — yani **aynı
kayıt, yazıldığı makineye göre iki farklı değerle** deftere giriyordu.
Anayasanın adıyla yasakladığı şey: _"çalışma ortamının saat dilimi ASLA
kullanılmaz."_

📏 **ÖLÇÜLDÜ (3379 HB kalemi):**

    vade  UTC 00:00 → 1180   (doğru, Vercel'den)
    vade  UTC 22:00 → 2193   (kaymış, yerel koşumlardan)
    vade  UTC 23:00 →    6
    ödeme UTC 00:00 → 1048 · 22:00 → 1660 · 23:00 → 2

⚠ **EKRANDA GÖRÜNMÜYORDU** çünkü gösterim İstanbul gününe normalize ediyor
(`gunDegeri(isTakvimGunu(...))`, K222-④). Kusur ham `dueDate` ile SÜZEN her
sorguda yaşıyordu — bu ölçümde tam da o oldu ve teşhisi bir gün kaydırdı.

**YAPILAN:** `tarihCoz` artık tarih parçasını okuyup `gunDegeri` ile UTC gece
yarısına damgalıyor — makineden bağımsız. İş tarihi SAAT TAŞIMAZ (`donem.ts`
kuralı).

⛔ **GEÇMİŞ DÜZELTİLMEDİ VE BU BİR KARAR:** gösterim zaten doğru, düzeltme
bugün verilecek hiçbir kararı değiştirmiyor; 3379 satıra dokunmanın riski
kazancından büyük. _(Anayasa: "geçmişi düzeltmek ile mekanizmayı kurmak ayrı
kararlardır.")_ Bundan sonra yazılan her satır doğru; sayı yukarıda duruyor
ki altı ay sonra yeniden keşfedilmesin.

### BEKÇİ — GÖVDE HİÇ ÖLÇÜLMÜYORDU

`hbApiSatiriniOku` için TEK bir ölçüt yoktu; hata tam orada yaşadı.
`hakedis:dogrula` 10. bölüm (6 değer testi, 190) ·
`hakedis-ozeti-mutasyon:kontrol` **10/10** — yeni üç yön: `new Date(ham)`
geri gelsin · iş tarihi saat taşısın · `Paid` kapısı düşsün.
⭐ **VE BİR ÖLÇÜT BİLEREK İKİ TANE:** "gece yarısına damgalanır" ölçütü TEK
BAŞINA **UTC makinede eski kodla da geçerdi**. Diş, "SAATLİ damga da güne
indirilir" ölçütünde: `21:00` her iki makinede de ayrışır.

### HALİL TEST LİSTESİ

1. `/hakedis` → Kanal: **Hepsiburada** → **Detay** → Gelecek: 22.09 grubu hâlâ
   orada. **Bu doğru** — HB'nin ucu henüz "ödendi" demedi.
2. HB panelinde ödeme göründükten **1–2 gün sonra** tekrar bakın: satır
   kendiliğinden **Geçmiş**e geçmiş olmalı (gece çekimi yazar).
   ⛔ Bir hafta geçip hâlâ geçmediyse söyleyin — o zaman uçta başka bir şey
   var demektir ve yeniden ölçeriz.
3. Tarihlerin gün kayması: ekranda zaten doğruydu, değişiklik görünmez.

---

## 🔴 K238 — TAZMİNAT TUTARLARI ×10.000 YAZILMIŞ: FORM NOKTAYI ONDALIK, SUNUCU BİNLİK SANIYORDU · 23.09.2026 · [KOD + CANLI ONARIM KOŞTU]

**KULLANICI BİLDİRİMİ:** _"Uçuk fiyatlar var tazminatta."_ Ekranda tazminat
geliri **₺7.999.100** ve GERÇEK NET **₺8.085.623,47**.

### ÖLÇÜM — TAM ×10.000, DÖRT KAYIT

    2026-09-14   7.999.100  ←  799,91     Tefal Delibake Kek Kalıbı 27 cm
    2026-09-07  88.110.000  ←  8.811,00   Philips i9000 SkinIQ
    2026-08-20   7.599.000  ←  759,90     DeliBake Kek Kalıbı 24 cm
    2026-08-11  11.110.000  ←  1.111,00   Tefal Easyblend Blender
    (aynı gün 2 adetli bir talep ORAN 1,00 — elle virgüllü yazılmış, doğruydu)

### KÖK — İKİ YARI AYNI EKRANDA FARKLI BİÇİM KONUŞUYORDU

    varsayilanTalepTutari  →  "799.9100"   nokta = ONDALIK (Decimal(18,4))
    tutaraCevir            →  .replace(/\./g, "")   nokta = BİNLİK AYIRACI
                           →  7999100

İkisi de KENDİ İÇİNDE doğruydu ve **ayrı ayrı sınanıyordu**: bekçi
`varsayilanTalepTutari(3, 149.9) === "449.7000"` diyordu, çözücünün TR biçimi
doğru okuduğu da doğruydu. **Kimse ARADAKİ BAĞI ölçmemişti.**
_(Anayasa: "zincir, halkalarının varlığıyla değil BAĞLANTISIYLA sınanır" ·
"iki halka ayrı ayrı doğru olabilir — aradaki bağ yanlış".)_

### YAPILAN

- **Çözücü saf gövdeye alındı** (`talepTutariniCoz`, `lib/tazminat.ts`) ve
  deponun ORTAK sayı çözücüsüne bağlandı (`sayiCoz`). İkinci bir çözücü
  yazmak yerine var olanı kullanmak: Excel okuyucuları yıllardır onu
  kullanıyor, tazminat formu kendi kopyasını yazdığı için ayrışmıştı.
  Artık iki biçim de doğru okunuyor: `799.9100` ve `1.234,56`.
- **Bekçi — ZİNCİR ÖLÇÜTÜ:** `tazminat:dogrula` (69) artık formun ÜRETTİĞİ
  değeri sunucunun OKUDUĞU sayıyla karşılaştırıyor (7 vaka + elle yazım
  biçimleri + boş alan NaN). Eylemin kendi çözücüsünü kurması da yasak.
- **Yeni harness** `tazminat-mutasyon:kontrol` **5/5** — ilk mutasyon
  **hatanın tam kendisini** geri getiriyor (`.replace(/\./g,"")`) ve bekçi
  kırmızı yanıyor. Yani yeni ölçüt bu hatayı yakalardı.
- **CANLI ONARIM** (kullanıcı onayı "onarım yaz"):
  `npm run canli:tazminat-katsayi` · ölçüt _"alım kalemine bağlı ∧ oran TAM
  10.000"_ (yeniden hesaplanabilir, saklanan liste değil) · yerel anlık
  görüntü + iz + tek komutla geri alma.
  **4 kayıt onarıldı: ₺114.818.100 → ₺11.481,81.**
  Doğrulama: beş alım kaynaklı talebin beşi de ORAN **1,00**; tahsil edilmiş
  tazminat toplamı **₺86.443,86**.

### ⚠ BENİM HATAM — TUR KOŞARKEN KAYNAĞA DOKUNDUM

K237 push'u bekçi turundayken bu paketi yazmaya başladım. `stok-siralama-
mutasyon:kontrol` çöktü ve mutasyonunu diskte bıraktı:
`src/app/kart/[variantId]/page.tsx` benim dokunmadığım hâlde "değişmiş"
göründü (`xl:grid` → `grid`). Geri alındı, harness 30/30 yeşil.
> **KURAL PEKİŞTİ:** bekçi turu koşarken kaynağa DOKUNULMAZ — harness'ler
> dosyayı mutasyona uğratıp geri yazıyor; araya giren her düzenleme ya
> kaybolur ya da mutasyonu diskte bırakır. Tur bitene kadar hazırlık
> çalışma alanında yapılır.

### HALİL TEST LİSTESİ

1. `/tazminat` → "Talepler" listesi: dört satır artık **₺799,91 · ₺8.811,00 ·
   ₺759,90 · ₺1.111,00**. Milyonluk rakam KALMADI.
2. Üstteki **"Açık alacak"** ve `/rapor` → **GERÇEK NET** rakamı 114 milyonluk
   şişkinlikten kurtulmuş olmalı (tazminat geliri artık ₺86.443,86 üzerinden).
3. **Yeni talep aç:** "Talep bekleyen hasar" bloğunda **+ Talep aç** → tutar
   alanı önerilen değerle dolu gelir (ör. `799.9100`) → **hiç dokunmadan**
   kaydet → listede **₺799,91** yazmalı (eskiden ₺7.999.100 yazardı).
4. Aynı formda tutarı **elle** `1.234,56` yaz → kaydet → **₺1.234,56**.
   Tutarı boş bırak → "tutar sayı olmalı" uyarısı çıkmalı, 0 TL talep
   AÇILMAMALI.

---

## 🔴 K235 — SATIR KARTI: LİSTE ANATOMİSİ TEK GÖVDEYE ÇIKTI · 22.09.2026 · [① CANLIDA 9079642 · ② KOŞTU (7 ekran daha) · ③ SAĞ SÜTUNLAR SABİTLENDİ — HALİL TESTİ BEKLİYOR]

**KULLANICI KARARI:** _"Bu sayfalar ve diğer sayfalardaki kart yapısını yeni
yaptığın hakedişler sayfasındaki kart yapısına göre tekrar tasarla. Tüm
sistemdeki liste biçimlerini gözden geçir ve yeni hale uyarla, çünkü
hakedişlerdeki kart yapısı çok daha okunaklı ve düzenli."_
(Ekran görüntüleri: `/tazminat` · `/nakit-takvimi` · `/ayarlar/donemler` · `/hakedis`.)

### ANATOMİ — `src/components/satir-karti.tsx`

    ┌────────────────────────────────────────────────────────────┐
    │ BAŞLIK (iri/koyu)            SAĞ BLOK (tutar · rozet · eylem) │
    │ bağlam · bağlam · bağlam                            (⌄ açılır) │
    └────────────────────────────────────────────────────────────┘

`SatirKarti` + `SatirListesi`. Dört prop: `baslik` (+`vurgulu`) · `baglam[]`
(null/false girdiler ELENİR — koşullu bağlam için dışarıda dizi kurulmasın) ·
`sag` · `acilir` (+`acikMi`). Açılır satır `<details>`: JavaScript yok,
klavyeyle çalışır. Dokunma hedefi 56 px (İlke #8).

⛔ **KAYNAĞIN KENDİSİ DE ORTAK GÖVDEDEN BESLENİYOR:** `/hakedis` ödeme satırı
(hem Özet hem Detay) artık `SatirKarti` çağırıyor. Anatomi orada bırakılıp
bileşene KOPYALANSAYDI, "biri düzeltilir öteki unutulur" (İlke #10) — ve üç
ay sonra hangisinin doğru olduğu sorulamazdı.

⭐ **TEK RENDER — İKİNCİ KOPYA KALKTI.** Depoda yerleşik desen aynı listeyi
İKİ KEZ çiziyordu: masaüstü `<Table>` + telefon `ListeKarti`. Satır kartı
`flex-wrap` ile iki ekranda da çalışıyor; `/tazminat`ta 7 sütunluk tablo ve
onun telefon kopyası TEK listeye indi.

⚠ **TABLO YASAK DEĞİL — KAPSAM AYRIMI YAZILI.** Satır kartı, satırın BİR
manşet değeri + bağlamı olduğu listeler içindir. Sütunları KARŞILAŞTIRMAK
işin kendisiyse (stok · ürün analizi · rapor · envanter) tablo doğru
araçtır; oraya kart uygulamak ekranı uzatır ve karşılaştırmayı zorlaştırır
_(İlke #12: "ekranda boşluk bilgi taşımaz")_. Bu ayrım bileşenin başlığında
duruyor — yarın "hepsini karta çevirelim" diyen okusun.

### ÇEVRİLEN (4 ekran)

| ekran | ne değişti |
|---|---|
| `/hakedis` Özet | "Kanal ödemeleri" gelecek/geçmiş satırları → `SatirKarti` |
| `/hakedis` Detay | ödeme özeti satırları (açılır) → `SatirKarti` |
| `/tazminat` | "Talep bekleyen hasar" satırları + "Talepler" **çift render → tek liste** |
| `/ayarlar/donemler` | 4 sütunluk tablo → satır kartı (durum + rapor + kapat sağda) |
| `/nakit-takvimi` | gün kartları → satır kartı, **açık başlayan** açılır döküm |

### BEKÇİ

`satir-karti:dogrula` (22 ölçüt) — **çoğu DEĞER testi**: gövde ÇAĞRILIP dönen
React ağacı okunuyor (saf bileşen, kanca yok). Açılır/düz ayrımı · boş dize
açılır içerik hâlâ açılır (`!acilir` yazılsaydı sessizce düz kutuya düşerdi) ·
bağlam süzgeci · ayıraç yalnız araya · vurgulu/vurgusuz manşet · dokunma
hedefi. İkinci bölüm **çift render envanteri**: sayı ekranda yazar ve
çevrilmiş ekranın geri dönmediği ölçülür.
`satir-karti-mutasyon:kontrol` **6/6** (zararsız yeşil · açılır ölçütü gevşet ·
bağlam süzgecini kaldır · dokunma hedefini küçült · her manşeti irileştir ·
çift render'ı geri getir).

⚠ **BEKÇİ KENDİ KURALINI İLK KOŞUMDA YAKALADI:** tarama yorumları da
sayıyordu; `/tazminat`a yazdığım _"masaüstü `<Table>` ve telefon
`ListeKarti`"_ açıklaması, çevrilmiş ekranı "çift render" sanıp kırmızı
yaktı. Yorumsuz metne bağlandı. _(Anayasa: "bir yasağı ANLATAN yorum, o
yasağı ÇİĞNEMİŞ sayılmaz".)_

⚠ **ÖLÇÜT TAŞINDI, GEVŞETİLMEDİ:** `hakedis:dogrula` ham `<details>` arıyordu;
anatomi ortak gövdeye çıkınca o desen ekranda kalmadı. Ölçülen şey aynı
kaldı (bir satır bir ödeme + açılabilir), çapa `SatirKarti`ye taşındı ve
pencere ÖLÇÜLDÜ (973 → 1400). Aynısı `hakedis-ozeti-mutasyon` çapalarına da
uygulandı; ikisi de silinmedi.

─── **② YEDİ EKRAN DAHA ÇEVRİLDİ (kullanıcı onayı: "önerine katılıyorum")**

| ekran | ne değişti |
|---|---|
| `/kartlar` | 8 sütun + telefon kartı → satır; kesim/ödeme · limit · alım sayısı bağlamda |
| `/ayarlar/konumlar` | raf KODU manşet (depoda aranan o), biçim uyarısı rozetiyle |
| `/kanal-listeleme` | ürün manşet, kodlar bağlamda, durum rozeti sağda — **kapalı satırın zemini korundu** (`zemin` prop) |
| `/giderler` | 8 sütun → satır; kategori manşet, tutar sağda kalın, oran/KDV/net düşen bağlamda |
| `/kanal-sku` | 4 sütun → satır; **ayrışma bitti** — "oranı eksik" rozeti eskiden YALNIZ telefondaydı |
| `/alimlar` | 7 sütun → satır; adet/kalem/kart artık hücreye sıkıştırılmıyor |
| `/iadeler` ana liste | 9 sütun → satır; **ayrışma bitti** — "ceza" eskiden YALNIZ masaüstündeydi |

⭐ **ÇİFT RENDER'IN ÜRETTİĞİ İKİ SESSİZ AYRIŞMA ÖLÇÜLDÜ VE KAPANDI.** Aynı
listeyi iki kez çizmek bir stil tercihi değil, bir HATA KAYNAĞIYDI: kanal
SKU'da eksik oran rozeti yalnız telefonda, iadede ceza sütunu yalnız
masaüstünde vardı. Tek render bunu yapısal olarak imkânsız yapar (İlke #10).

⛔ **ÖNERİM İKİ EKRANDA ÖLÇÜMLE ÇÜRÜDÜ — ÇEVRİLMEDİ.** `/alimlar/[id]`
(beklenen · sağlam · hasarlı · kalan) ve `/satislar/[id]` (FIFO parti dökümü:
tarih · kaynak · raf · adet · birim maliyet) SAYI KARŞILAŞTIRMA ızgaralarıdır;
kart anatomisi o dört sayıyı bağlam satırına akıtır ve satırlar arası
karşılaştırmayı bitirir. Kullanıcıya önerdiğim listede "çevrilecek" yazıyordu,
ölçüm tersini söyledi ve **öneri geri alındı** _(anayasa: "onay da bir
referanstır — ve referans doğrulanır")_. Aynı gerekçeyle `/iadeler`in iki
analiz tablosu (kanal kırılımı · en çok iade edilen ürün) tablo kaldı.

### BEKÇİ — ② TURUNDA TAŞINAN ÖLÇÜTLER

Hiçbiri gevşetilmedi; hepsi **gerekliliğe** yeniden bağlandı ve gerekçesi kodda:
- `arama:dogrula` kanal-SKU bölümü baştan sona tablo şeklindeydi (`<TableHeader>`
  kes, KOMİSYON sütunu ara…). Gereklilik aynı kaldı: kanal kodu + komisyon
  listede, kopyalanabilir, oran hizalı, ürün adı kırpılmıyor.
  ⛔ **VE TAŞIRKEN ESKİ ÖLÇÜTÜN YALANCI YEŞİLİ GÖRÜLDÜ:**
  `slice(indexOf("md:hidden"))` — `indexOf` bulamayınca `-1` döner, `slice(-1)`
  son karakteri verir, `length > 0` DOĞRU çıkar. Mobil blok HİÇ YOKKEN bile
  "kesilebildi" diyordu.
- `arama:dogrula` kârlılık kartı bağlantısı: sabit "2 çağrı (tablo + mobil)"
  beklentisi tek render'da doğru kodu kırmızı yakıyordu → ölçüt **ekranın kendi
  şeklinden** türetiliyor (çift render varsa 2 ve mobil blokta; tek render varsa
  1 ve İKİNCİ KOPYANIN OLMAMASI).
- `rma:dogrula` iade sebebi: iki kopyayı ayrı ayrı arıyordu → satır bağlamında
  aranıyor + ikinci kopyanın yokluğu.
- `yerlesim:dogrula` taban **yeniden ölçüldü**: `<TableHeader>` taşıyan dosya
  24 → **19**; eşik 20 → 12, gerekçesiyle. Düşüş arıza değil karar.
- `satir-karti:dogrula` 26 ölçüt (yeni: `zemin` prop'u, boş dize bağlam) ·
  `satir-karti-mutasyon:kontrol` 6/6; iki çapa refaktörle taşındı.

### AÇIK — ③ TABLO KALAN EKRANLAR (karar: dokunulmuyor)

    stok · stok/[variantId] · urunler · urunler/[id] · rapor · rapor/urunler ·
    envanter-degeri(+aralik) · satislar · satislar/[id] · alimlar/[id] ·
    hakedis(kontrol sekmesi) · ayarlar/kanallar

Hepsinde iş **sütun karşılaştırması**. Çift render envanteri: **12**
(`satir-karti:dogrula` her koşumda yazar). Kullanıcı tek tek "şunu da çevir"
derse bu liste küçülür.

### HALİL TEST LİSTESİ

### HALİL TEST LİSTESİ — ② (yeni çevrilen yedi ekran)

6. `/kartlar` → her satır kart etiketi manşet; altında banka · son 4 (kopya
   ikonlu) · sahibi · `Kesim/Ödeme: 5 / 15` · `Limit: ₺…` · `Alım: 12`;
   sağda Aktif/Pasif rozeti + detay/düzenle/pasife al ikonları.
7. `/ayarlar/konumlar` → raf kodu manşet (kopyalanabilir), standart dışı
   kodda turuncu "biçimsiz" rozeti manşetin yanında; sağda durum + düzenle.
8. `/kanal-listeleme` → ürün manşet; **kanalda kapalı satırların zemini
   turuncu kaldı** (tabloda da öyleydi), rozet sağda.
9. `/giderler` → kategori + sabit/değişken rozeti manşet; tutar sağda kalın;
   bağlamda tarih · açıklama · ödeme yöntemi · oran · KDV · net düşen.
10. `/kanal-sku` → **oranı olmayan kayıtta turuncu rozet artık masaüstünde
    de var** (eskiden yalnız telefonda). Oran sağda, güncelleme tarihi
    bağlamda.
11. `/alimlar` → alım kodu manşet (kopya ikonlu); sipariş no · tarih · kanal
    hesabı · ürün (kârlılık kartına gider) · `Toplam adet` · `N kalem` ·
    kart bağlamda; tutar + durum rozeti + eylemler sağda.
12. `/iadeler` → sipariş no manşet; **ceza artık telefonda da görünür**;
    adet rozetleri (sağlam/hasarlı/talepsiz) ve NET-2 etkisi sağda.
13. **Tablo kalanlar değişmedi:** `/stok` · `/urunler` · `/satislar` ·
    `/rapor/urunler` · `/envanter-degeri` · alım ve satış DETAY sayfaları —
    oralarda sütunları yan yana karşılaştırmak işin kendisi.

### HALİL TEST LİSTESİ — ① (ilk dört ekran)

1. `/tazminat` → "Talep bekleyen hasar (3)": her satır **ürün adı** manşet,
   altında `Hepsi Burada · 11481463029 · [iadeden] · Hasarlı: 1 · Talep
   edilebilir: 1`, sağda **+ Talep aç**. "Talepler (20)": her satır ürün adı +
   `14.09.2026 · Hepsi Burada · ALM-HB-260911-16 · Adet: 1`, sağda
   **₺7.999.100,00** (açık talepte kalın) + durum seçici + not. **Tablo yok.**
2. Aynı sayfayı **telefonda** aç → aynı satırlar, yatay kaydırma yok,
   durum seçici ve not tıklanabiliyor. _(mobil doğrulama kullanıcıda)_
3. `/ayarlar/donemler` → her satır **"Eylül 2026"** manşet, sağda
   **Açık/Kapalı rozeti · Raporu aç · Kapat**. Kapalı dönemde bağlam satırı
   "kapatan · tarih (· not)" yazar.
4. `/nakit-takvimi` → gün satırları: manşet **22.09.2026**, bağlam
   `Girecek: ₺5.620,60`, sağda **Yürüyen: −₺43.076,63** (eksiyse kırmızı).
   Satırın sağındaki **oka** bas → gün kapanır, tekrar bas → açılır. Günler
   **açık başlar**.
5. `/hakedis` → Özet "Kanal ödemeleri" ve Detay "Ödeme özeti" satırları
   önceki hâliyle AYNI görünür (anatomi taşındı, görünüm değişmedi):
   **22.09.2026 · Hepsiburada · 138 kalem · ₺84.680,85 · Tahmini**.

### ─── ③ SAĞ SÜTUNLAR SABİTLENDİ — KULLANICI BİLDİRİMİ 23.09.2026

**KULLANICI:** tazminat ekranının ekran görüntüsü, sağ taraf kırmızıyla
çerçevelenmiş — _"burada problem var, kutular sabit olmalı değil mi"_. Evet.

#### SEBEP — SAĞ BLOK İÇERİĞİNE GÖRE GENİŞLİYOR

Satır `flex`; sol blok `flex-1`, sağ blok içeriği kadar yer kaplıyor ve
sağa yaslanıyor. Dolayısıyla **son öğenin sağ kenarı sabit, öndekilerin
konumu değişken.** Tazminatta sıra `[tutar][durum seçici][not]`:

    ₺799,91      → dar tutar   ┐
    ₺15.819,10   → geniş tutar │→ seçici her satırda BAŞKA x konumunda
    "Not ekle"   → dar not     │
    iki satırlık hepsijet kodu → geniş not ┘

⚠ **VE EN KÖTÜ ÖĞE ORTADAKİYDİ:** kayan şey bir rakam değil, bir
**KONTROL**— tıklanacak kutu. Göz her satırda onu yeniden arıyor.

#### ÇARE ORTAK GÖVDEDE, EKRANDA DEĞİL

`SatirKarti` yeni bir seçenek aldı: **`sagIzgara`**. Verilirse sağ blok
`sm:` ve üstünde SABİT sütunlu ızgaraya dönüşüyor; verilmezse davranış
**aynen** eskisi gibi kalıyor — 12 ekranı birden bozma riski yok.

⚠ **TELEFONDA SARMA KALDI:** 30rem'lik sabit sütun 360 px ekrana sığmaz;
dar ekranda `flex-wrap` doğru davranıştır ve zaten sorun orada değildi.
⚠ **GENİŞLİKLER UYDURULMADI:** tutar `8rem` (`₺123.456,78` 11 hane sığar),
seçici `10rem` (`w-40`, zaten öyleydi), not `12rem` (`w-48`).
⚠ **`max-w` YETMEDİ:** not alanı `max-w-48` idi, yani KİSA notta daralıyordu.
`sm:w-48` yapıldı.

#### ÖLÇÜLDÜ

    satir-karti:dogrula              33 ölçüt (7'si yeni)
    satir-karti-mutasyon:kontrol     11/11 (5'i yeni, üç yön)
    tsc --noEmit                     çıktı BOŞ

⭐ **BEYAN İLE GERÇEK GENİŞLİK BİRBİRİNE BAĞLANDI:** ızgara "seçici 10rem"
diyorsa bekçi seçicinin gerçekten `w-40` olduğunu da ölçüyor. `w-40`ı
`w-44` yapan mutasyon KIRMIZI yandı — yoksa ikisi ayrışır ve kayma
sessizce geri gelirdi. _(Anayasa: "iki yerde iki ölçüt olmaz".)_

#### ⚠ AYNI KUSUR BAŞKA EKRANLARDA DA VAR — ÖLÇÜLDÜ, DEĞİŞTİRİLMEDİ

`sag` bloğuna BİRDEN ÇOK öğe veren **12 ekran** var. Tazminat dışında
kaymaya açık olanlar:

| ekran | sağ blok | kayan |
|---|---|---|
| `/alimlar` | tutar · rozet · eylemler | tutar, rozet |
| `/giderler` | tutar · eylemler | tutar |
| `/kanal-sku` | komisyon · düzenleyici | komisyon |
| `/iadeler` | adet · rozetler · (koşullu kâr) | hepsi |
| `/hakedis` (Özet · 2 yer) | tutar · 2 rozet | tutar, ilk rozet |
| `/hakedis` ödeme özeti | kanal rozeti · durum rozeti | kanal adı değişken |

Kaymayanlar (tek öğe ya da eşit genişlikte rozet): `/kanal-listeleme` ·
`/nakit-takvimi` · `/kartlar` · `/ayarlar/konumlar` · `/ayarlar/donemler`.

⛔ **NİYE ŞİMDİ DEĞİŞTİRİLMEDİ:** her ekranın sütun genişliği O EKRANIN en
uzun içeriğine göre seçilmeli; körlemesine seçilen dar bir sütun **rakamı
kırpar** ve kırpılmış rakam yanlış okunur — hizasızlıktan kötü. Altı
ekranı görmeden değiştirmek "sınanmamış ekran, ekran değildir" kuralına da
aykırı. **Mekanizma hazır**; sıra kullanıcının hangisini istediğine göre.

#### HALİL TEST LİSTESİ (③)

1. `/tazminat` → Talepler listesi. **Bütün açılır kutular alt alta AYNI
   hizada** başlamalı — tutarı `₺799,91` olan satırla `₺15.819,10` olan
   satır dahil.
2. Tutarlar sağa dayalı ve alt alta okunabilir olmalı (`8rem` sütun).
3. Not sütunu: "Not ekle" yazan satırla iki satırlık not taşıyan satır
   **aynı genişlikte** olmalı.
4. Telefonda aynı ekran: yatay kaydırma ÇIKMAMALI; öğeler alt alta sarmalı.
5. Hiçbir rakam kırpılmamalı — en uzun tutar tam görünmeli.

**mobil doğrulama kullanıcıda** · **i18n: ✓** (yeni metin yok) ·
**kullanıcı kolaylığı: ✓** (İlke #10 tutarlılık · #12 alanı verimli kullan)

---

## 🔴 K234 — "FİYATLANDIRMA VE ANALİZ" GRUBU + TARİFE HESAPLAMA EKRANI · 22.09.2026 · [CANLIDA 835a010 — HALİL TESTİ BEKLİYOR · menü kaydını kullanıcı kendisi taşıdı]

**KULLANICI İSTEĞİ:** _"Fiyatlandırma ve Analiz isminde bir sekme açalım;
altına Ürün analizi · Fiyat denemesi · Kârlılık kartı · Tarife hesaplama."_
Ardından: _"Fiyat denemesi'nin ismi Hesaplama motoru olsun"_ ve tarife
ekranı için üç istek: _"şu anki fiyattan satarsam ne kalır"_ · _"Selliora
bana desin ki fiyatı 1095 yap daha fazla kazan; fark ufak ama sistem
önemli"_ · _"eksi kırmızı, artı yeşil"_ · _"arama kutusu olsa, barkodu
girince teklif varsa çıksa"_ (#6'nın devamı).

**KANAAT (verildi, kabul edildi):** dört ekran aynı soruya cevap veriyor —
"kaça satayım, ne kalır" — üç ayrı grupta duruyordu, dördüncüsü menüde
HİÇ yoktu (yalnız Komisyon yükleme → pencere satırından). Gruplama doğru.

### YAPILAN

- **Menü kataloğu:** `grupFiyatAnaliz` günlüğün hemen altında; varsayılan
  üyeler `urunAnalizi · urunKarti · simulasyon · tarifeHesaplama`.
  `simulasyon` günlükten gruba taşındı (25.08 kararı çevrildi, silinmedi).
- **Adlar:** Fiyat denemesi → **Hesaplama motoru** (menü · sekme başlığı ·
  ekran başlığı · el kitabı). Tarife aynası → **Tarife hesaplama** (aynı üç
  yer + komisyon ekranındaki bağlantı).
- **`/tarife`** (yeni, `tarife.gor` OKUMA izni): menü kayıt numarasına
  gitmez; sayfa **en güncel pencereyi** açar (saf gövde `guncelPencereSec`
  — adresteki kimlik yoksa 404, sessizce başka pencere açılmaz), üstte
  **pencere seçici** (kanal · tarih aralığı) ve **barkod / ürün adı
  araması** (ortak kod kutusu, kamera; barkod EŞDEĞERLERİYLE — UPC-A ↔
  EAN-13). Eski `/ayarlar/tarife/[id]` yönlendirir; komisyon ekranındaki
  satır bağlantısı yeni adrese.
- **Şu anki fiyat (K234-②):** NET kutusuna **"Şu anki satış fiyatı"** alanı
  — boş bırakılırsa o kanaldaki son satış (tarihiyle etiketli: _"son satış:
  20.09.2026"_), yazılırsa yazılan (_"girdiğiniz fiyat"_). Oran fiyatın
  düştüğü dilimden MOTOR tarafından çözülür; yeni hesap yok, aynı
  `simulasyonKarsilastir`. Sistem kanal satış fiyatını TUTMUYOR (ölçüldü:
  `ChannelSku`te fiyat alanı yok, listeleme senkronu fiyat çekmiyor) — bu
  yüzden SORULUR, uydurulmaz.
- **Öneri:** _"Fiyatı ₺1.095,95 yaparsanız NET-2 ₺1,07 artar."_ (yeşil) ya da
  _"Şu anki fiyat en yüksek NET-2'yi veriyor."_ Kuruş tozu (<1 kuruş) öneri
  üretmez. ⚠ 21.09 kararı ("hüküm vermesin") aynı kullanıcı tarafından
  22.09'da çevrildi; ikisi de kodda.
- **Renk:** NET-2 eksi → kırmızı, artı → yeşil, sıfır/bilinmeyen renksiz
  (`lib/renkler` tokenleri).
- **İzin:** `tarife.gor` (izinler + `SONRADAN_DOGAN`) — deploy sonrası
  `npm run canli:yetki` ŞART, yoksa ekran sessizce 404.
- **Bekçi:** `tarife:dogrula` K234 bloğu (18 değer testi: pencere seçimi ·
  arama · öneri · renk, 221/221); menü ölçütleri (`panel:dogrula`) yeşil;
  `teklif-tanima-mutasyon` çapası yeni adrese TAŞINDI (silinmedi).

### MENÜ KAYDI — KULLANICI KENDİSİ TAŞIDI (22.09, Ayarlar → Menü düzeni)

_Betik (`canli:menu-duzeni-yaz`) koşulmadı; kullanıcı üç kalemi sürükleyip kaydetti ("Menü düzeni kaydedildi"). Betik duruyor, geri alma/tekrar için._

─── **③ Sıkı dikey aralık (kullanıcı 22.09): "sekmeler kapalıyken scroll yapmak istemiyorum"** — grup başlıkları arası dikey dolgu 8→2 px (grup başına 12 px, altıda 72 px); telefonda başlık 44 px dokunma hedefi (İlke #8). Halil: masaüstünde bütün gruplar kapalıyken **Ayarlar** alt bloğun üstünde, kaydırmadan görünür.

Menü sırası VERİ (`Company.menuDuzeni`) ve kayıt varsayılanı ezer; kullanıcı
25.08'de bir düzen kaydetmiş. Kod tek başına dört kalemi taşımaz.
`npm run canli:menu-duzeni-yaz` kuru koşumu (22.09):

    çözülen kalem: eski 42 · yeni 42 · kaybolan 0
    yeni grup: urunAnalizi · urunKarti · simulasyon · tarifeHesaplama
    tanınmayan (eski anahtar, düşer): tarife

`--uygula` ile yazılır (yerel görüntü + iz + `--geri=<dosya>`). Alternatif:
kullanıcı Ayarlar → Menü düzeni'nden dördünü gruba sürükler.

### HALİL TEST LİSTESİ

1. Sol menüde **Fiyatlandırma ve Analiz** başlığı (günlük listenin altında,
   Para'nın üstünde) → içinde Ürün analizi · Kârlılık kartı · Hesaplama
   motoru · Tarife hesaplama. _(Menü kaydı yazıldıktan sonra; öncesinde grup
   yalnız "Tarife hesaplama" ile görünür, öteki üçü eski yerlerinde.)_
2. **Tarife hesaplama** → başlık "Trendyol tarife hesaplama · 22.09.2026 –
   29.09.2026 · 724 ürün" (en güncel pencere kendiliğinden). Pencere
   seçicisinden "Hepsiburada · 16.09 – 22.09" → 152 ürün.
3. Arama kutusuna **027084667271** yaz (Trendyol penceresi) → tek ürün:
   "Eğlen ve Öğren Eğitici Masalcı Tırtıl". "xyz" → "Ürün bulunamadı" +
   Temizle. Kamera simgesi çalışır.
4. O üründe **NET hesapla** → Kargo 107 · **Şu anki satış fiyatı boş** →
   Göster: dilim satırları + altta "Şu anki fiyat ₺1.102,00 · komisyon
   %11,5 · NET-2 ₺169,29 (son satış: <tarih>)" ve yeşil satır **"Fiyatı
   ₺1.095,95 yaparsanız NET-2 ₺1,07 artar."** NET-2 rakamları yeşil.
5. Aynı kutuda fiyata **1095,95** yaz → Göster: "Şu anki fiyat ₺1.095,95 …
   NET-2 ₺170,36 (girdiğiniz fiyat)" ve "Şu anki fiyat en yüksek NET-2'yi
   veriyor."
6. Hepsiburada penceresi → **HBCV00000EURKI** (Grundig) → NET hesapla,
   kargo 185 → NET-2'ler **kırmızı** (−₺201,40 · −₺829,03 …), öneri satırı
   "en yüksek" ya da "artar" — hepsi eksi olsa da en az kötüyü söyler.
7. Eski adres `/ayarlar/tarife/<id>` → `/tarife?pencere=<id>`e yönlenir;
   Komisyon yükleme → satırdaki "Tarife hesaplama" bağlantısı aynı yere.
8. Sekme başlığı ve menü "Hesaplama motoru"; `/simulasyon` ekranının
   başlığı da öyle. _(mobil doğrulama kullanıcıda)_

### AÇIK

- Kanalın **canlı satış fiyatını** çekmek (listeleme senkronuna fiyat
  alanı) — o gün "şu anki fiyat" sorulmaz, ölçülür. Ayrı kalem.
- N11 penceresi 142 ürün, tarife hesaplama N11 için de çalışır (ölçülmedi).

---

## 🔴 K232 — HAKEDİŞ "DETAY" PAZARYERİ PANELİ DÜZENİNE ÇEVRİLDİ · 22.09.2026 · [① CANLIDA e5b59ab · ② CANLIDA 9b2ef78 — HALİL TESTİ BEKLİYOR]

**KULLANICI BİLDİRİMİ (Halil testi #13):** _"Çok karışık, anlamak mümkün
değil. Müşteri alışık olduğu arayüzde hakedişlerini görsün. Toplam
hakedişler zaten özet duruyor, gerekirse ora ile de ilgileniriz."_
Trendyol panelinin **Ödeme Özeti** ekranı örnek verildi; HB ve N11'inki
**sonra** gelecek.

### ÖLÇÜM — VERİ DOĞRUYDU, SUNUM YANLIŞTI

Defterdeki TY ödeme emirleri (`paymentOrderId` ile gruplanınca) kanalın
kendi panelindeki satırlarla **kuruşuna** tutuyor:

    emir      ödeme günü   kalem  sipariş   defter          TY paneli
    77398614  21.09.2026     49     31     90.739,15 ₺     90.739,15 ₺
    77305532  17.09.2026     28     20     42.233,41 ₺     42.233,41 ₺
    77191081  14.09.2026     26     18     61.958,33 ₺     61.958,33 ₺
    77146154  10.09.2026     26     18     46.022,33 ₺     46.022,33 ₺
    77041243  07.09.2026     49     33     69.800,24 ₺     69.800,24 ₺

    toplam 8747 kalem · TY 92 ödeme emri (4995 ödenmiş, hepsi emirli) ·
    HB 2710 ödenmiş kalem → 30 ödeme günü (emir no yok) · bekleyen TY 379, HB 663

Eski "Detay" aynı veriyi **satış bazlı karşılaştırma + kalem dökümü** olarak
basıyordu — doğru ama operasyoncunun aradığı şekil değil.

### YAPILAN

- **`/hakedis` → Detay** artık **"Ödeme özeti"**: Geçmiş / Gelecek ödemeler
  sekmesi · **"Sipariş / fatura no ile ara"** (ortak kod kutusu, kamera
  dahil — İlke #7) · **bir satır = bir ödeme** (iri tutar · ödeme günü ·
  kanal rozeti · "Ödeme yapıldı" / "Tahmini hesaplanmıştır") · sağdaki ok
  ile açılınca **kalem dökümü** (kanalın kendi tür adlarıyla, toplam satırı
  satırın rakamına eşit) ve **siparişler** (sistemdeki satışa bağlıysa link,
  değilse kopyalanabilir no) · sayfalama (50/sayfa) · **süzgecin toplamı**
  üstte yazar, sayfa değiştikçe DEĞİŞMEZ (İlke #15).
- Eski Detay içeriği (Beklenen vs gerçekleşen · eşleşmemiş kalemler ·
  yüklenen raporlar · bekleyen kalem dökümü) **"Kontrol"** sekmesine taşındı —
  silinmedi.
- Özet'teki "Kanal ödemeleri" kartına **"Tüm ödemeleri gör →"** bağlantısı
  (İlke #13: döküm kendi sekmesinde). Özet'in kendisine DOKUNULMADI —
  kullanıcı kararı.
- **Grup anahtarı tek gövdeye taşındı** (`lib/hakedis/model.ts` →
  `gecmisOdemeAnahtari` · `gelecekOdemeAnahtari`): satırın rakamı ile
  açılan kalem listesi aynı anahtardan gelir; iki formül olsaydı sayı ile
  liste sessizce ayrışırdı. Arama ve toplam da saf gövdede
  (`odemeleriSuz` · `odemeToplamlari` · `kalemTuruDokumu` · `siparisDokumu`).
- **Bekçi:** `hakedis:dogrula` 9. bölüm (20 ölçüt, 166/166) +
  `hakedis-ozeti-mutasyon:kontrol` **7/7** (zararsız yeşil · toplam sayfadan ·
  arama yanlış parametreye · rozet yanlış iddia · arama kapalı · zincir
  koptu · siparişsiz kalem dökümde).

### HALİL TEST LİSTESİ — tıklama düzeyinde

1. `/hakedis` → Kanal: **Trendyol** → **Detay** sekmesi. "Ödeme özeti"
   kartı açılır, üstte "Geçmiş ödemeler" seçili. İlk beş satır **TY
   panelinizle birebir**: **₺90.739,15 · Ödeme günü 21.09.2026 · Ödeme
   emri 77398614 · Ödeme yapıldı** → ₺42.233,41 (17.09) → ₺61.958,33
   (14.09) → ₺46.022,33 (10.09) → ₺69.800,24 (07.09).
2. Üst satırda **"92 ödeme · toplam ₺…"** yazar; en altta "92 kayıt ·
   sayfa 1/2" ve ok düğmeleri. 2. sayfaya geçince üstteki toplam
   **DEĞİŞMEZ**.
3. İlk satırın sağındaki **oka** tıkla → "Kalem dökümü": Satış **33** satır
   ₺97.096,02 · Kupon **13** satır −₺177,63 · stopaj −₺874,90 · platform
   −₺414,88 · kargo faturası −₺4.889,46; **Toplam 49 · ₺90.739,15**.
   Altında **"Siparişler (31)"**; sipariş no'ları tıklanınca satışa gider.
4. **Arama:** açık satırdan bir sipariş no'sunu kopyala, "Sipariş / fatura
   no ile ara" kutusuna yapıştır, Ara → listede **yalnız o ödeme** kalır,
   üstte "1 ödeme · toplam ₺90.739,15". Kutuya **77398614** (emir no)
   yaz → aynı sonuç. "xyz" yaz → _"xyz" ile eşleşen ödeme yok_ ve
   "0 ödeme · toplam —". **Temizle** → tam liste.
5. **"Gelecek ödemeler"** sekmesi → satırlar "Tahmini ödeme günü" ve
   "Tahmini hesaplanmıştır" rozetiyle; ilk satırın **tarihi ve rakamı**
   Özet'teki **"En yakın ödeme"** kutusuyla aynı (TY'de Pazartesi/Perşembe
   günleri). Satırı açınca "brüt … − tahmini kesinti …" şerhi görünür.
6. **Kontrol** sekmesi → eski içerik aynen: "Beklenen vs gerçekleşen
   (4497)", "eşleşmemiş 10 kalem", "Yüklenen raporlar (42)", "Bekleyen
   para". Hiçbir rakam kaybolmadı.
7. **Özet** sekmesi → "Kanal ödemeleri" kartının altında **"Tüm ödemeleri
   gör →"** → Detay'a götürür.
8. Kanal: **Hepsiburada** → Detay → geçmiş satırlar **"Ödeme günü"** ile,
   **emir no yok** (HB API'si vermiyor), rozet "Ödeme yapıldı"; en yeni
   satır **15.09.2026**; 30 satır.
9. Kanal süzgeci **temizle** (Tümü) → TY ve HB satırları tarihe göre
   karışık, her satırda kanal rozeti; alt satırda "122 kayıt · sayfa 1/3".
10. **Telefon:** satıra dokununca açılır, ok döner; arama kutusundaki
    kamera simgesi çalışır. _(mobil doğrulama kullanıcıda)_

─── **② HB ÖDENDİ GEÇİŞİ HİÇ YAZILMIYORDU · 22.09.2026 · [KOD KOŞTU — ilk gerçek geçiş gece çekiminde]**

**BULGU (HB panel ekranı ile karşılaştırınca):** HB "Ekstreler" **22 Eylül
2026 · ₺84.680,85 · Ödendi** diyor; bizde aynı rakam hâlâ **"Gelecek"te**.
Sebep bir gecikme değil, **mekanizma yokluğu**: `canli-hb-hakedis-cekim.ts`
yalnız YENİ satır yazıyordu; `WillBePaid` görülüp yazılmış bir satır sonradan
`Paid` olunca `paidAt` **hiçbir zaman** dolmuyordu. Eldeki geçmiş ödemeler
doğruydu çünkü 19.09'daki ilk taramada **zaten Paid** görülmüşlerdi — hata
ilk günlerde görünemezdi; bugünden sonra hiçbir HB ödemesi "Geçmiş"e
geçmeyecekti. _(Anayasa: "yokluk iddiası da iddiadır" — başlıktaki "yalnız
yeni satır yeter" gerekçesi silinmedi, altına düzeltmesi yazıldı.)_

**ÖLÇÜM (API, 22.09 13:10 İstanbul):** 22.09 vadeli 104+2 satır API'de
**hâlâ `WillBePaid`** — panel "Ödendi" derken uç henüz dönmemiş. Yani geçiş
bugün yazılamadı; kod hazır, gece çekimi (04:35/04:45 UTC) uç döndüğünde
yazar. Kuru koşum: `YENİ 4 · TAZELENECEK 0 · ZATEN AYNI 799 · TUTARSIZ 1`.

⚠ **İKİNCİ BULGU — PENCERE GEÇİŞİ GÖREMEZDİ:** çekim kayıt tarihine göre 45
gün geriye bakıyor; HB siparişten ~35-40 gün sonra ödüyor → satır Paid'e
döndüğünde pencerenin **kıyısında** (ölçüldü: 22.09 vadeli 104 satırın kayıt
yaşı 29-45 gün). Uç bir hafta geç işaretlese ya da cron bir gün kaçırsa satır
pencereden çıkar, geçiş bir daha görülmezdi. Uç `dueDateStart/End` süzgecini
destekliyor (`UCLAR.hakedis`, ölçüldü) → **①b:** defterde `paidAt` boş ∧
vade ≤ bugün olan satırların vade aralığı ayrıca sorulur (yeniden
hesaplanabilir ölçüt, saklanan liste değil). Kuru koşum: _"138 satır → vade
penceresi 15.09→21.09 soruldu, 132 kayıt geldi"_.

**YAPILAN:** K220-①'in HB karşılığı — `paidAt` **yalnız boşsa** dolar, doluya
dokunulmaz, tutarı farklı satır tazelenmez; satır başına iz
`HB_HAKEDIS_ODENDI_TAZELE`; özet alanı `tazelenen`. **Bekçi:**
`hakedis-yazici:dogrula` ③b (koşul+küme+update+iz, kullanıma bağlı) + ①b;
bellek-içi mutasyonlar: koşul öldür · "boşsa" kapısını kaldır · iz sil ·
vade sorgusunu ödenmişe daralt · uca vade süzgeci gönderme — **beşi de
kırmızı yandı.**

**HB PANELİ ↔ DEFTER (ödenmiş 4 ekstre + bugünkü):**

    25.08.2026   panel 80.473,32   defter 80.473,32   ✓
    01.09.2026   panel 37.346,29   defter 37.346,29   ✓
    08.09.2026   panel 39.868,20   defter 39.868,19   −1 kuruş
    15.09.2026   panel 88.867,93   defter 88.867,94   +1 kuruş
    22.09.2026   panel 84.680,85   defter 84.680,85   ✓ (henüz "Gelecek"te)

1 kuruş: bütün kalemler 2 basamaklı (ölçüldü, 4 basamaklı kalem 0); HB'nin
ekstre toplamı yuvarlanmamış bileşenlerden geliyor olabilir — **AÇIK**,
kapatma yolu HB "Dışa Aktar" ekstre dosyasını satır satır karşılaştırmak.
Ayrı not: `TUTARSIZ 1` = Kargo Bedeli DB −325,19 ↔ API −423,58 (dokunulmaz,
raporlanır — tutar değişikliği ayrı karar).

**N11 (kullanıcı panel ekranı geldi):** düzen aynı mantık — _Transfer
Tarihi · Ödeme Türü · Transfer Durumu · Transfer Tutarı · Banka_, her
**Perşembe** (27.08 ₺5.056,56 · 10.09 ₺2.840,42 · 17.09 ₺1.424,58). Ama N11
hakediş verisi sistemde **HİÇ YOK**: `SettlementItem`da N11 satırı 0, API'de
hakediş ucu **bulunamadı** (`docs/a3-hb-n11-api-kesif.md`). Yol: panelin
**"Excel'e Aktar"** dosyası için okuyucu (`HakedisOkumasi.kanal`e N11) —
**YENİ KALEM, açılış şartı dosya.** Kullanıcıdan istenen: N11 → Arama Sonuç
Listesi → "Excel'e Aktar" dosyası + bir transferin üstüne tıklayınca açılan
detay (varsa onun da dışa aktarımı). `Ertelenen Tutar` ve `Kargo Hizmet
Bedeli` kesintileri panelde açıklanıyor; okuyucu yazılırken kalem kodlarına
eşlenecek.

**Halil test listesine ek (HB):** Kanal: Hepsiburada → Detay → Gelecek
ödemeler: ilk satır **22.09.2026 · ₺84.680,85 · Tahmini hesaplanmıştır**
(panelde "Ödendi" — uç dönünce Geçmiş'e geçer; **23.09 sabahı** yeniden
bakın: Geçmiş'te ilk satır 22.09 ₺84.680,85 "Ödeme yapıldı" olmalı, Gelecek'in
ilk satırı 29.09 ₺38.490,82).

### AÇIK

- ~~HB ve N11 panel ekranları bekleniyor~~ → **ikisi de geldi (22.09)**; HB ölçüldü
  ve ②'de, N11 dosyası geldi → okuyucu **K233**'te.
- N11 için otomatik hakediş çekimi yok; Detay'da N11 seçilince ekran
  bunu **yazar** ("gruplanamıyor, dosyalar elle yükleniyor").
- Özet sekmesi kullanıcı kararıyla dokunulmadı; "gerekirse ora ile de
  ilgileniriz".

---

## 🔴 K231 — BİR KOD İKİ ÜRÜNE UYUYORDU, SİSTEM SESSİZCE BİRİNİ SEÇİYORDU · 21.09.2026 · [KOD KOŞTU + CANLI YAZIM YAPILDI — HALİL TESTİ BEKLİYOR]

**KULLANICI BİLDİRİMİ:** _"Bu üründen 2 tane stok kaydı var, birinde 4 stok
var, diğeri sıfır; sipariş geldi, 0 stoktan düşmeye çalışıyor, düşemiyor,
siparişi kaydedemedim."_ (`HBCV00000R0H0K` · barkod `97393839282`)

⛔ **EKRANDAKİ RAKAM DOĞRUYDU — VE ARIZA TAM BU YÜZDEN GİZLENDİ.**
`Stok yetersiz (HBCV00000R0H0K: 0/1)` cümlesi kusursuzdu: o varyantın stoğu
GERÇEKTEN sıfırdı. Yanlış olan sayı değil, **kodun hangi kayda çözüldüğüydü.**
Doğru rakam, yanlış hedefi görünmez yaptı.

### MEKANİZMA — `findFirst` + SIRALAMA YOK

Beş ekran (sonradan **altı** çıktı) şunu yapıyordu:

    prisma.productVariant.findFirst({ where: { OR: kodKosulu(kod) } })

Bir kod iki aktif varyanta uyduğunda hangisinin geleceği **veritabanının o
anki sırasına** kalıyor ve **kaybeden sessizce düşüyor** — ne hata, ne uyarı.
_(Anayasa: "seçici ölçüt, evren genişlediğinde ne yapacağıyla tasarlanır —
bugün doğru cevabı vermesi, sınanmış olduğunu göstermez.")_

### KÖK — PAZARYERİ KODU KİMLİK ALANINA YAZILMIŞ

Üç çiftin üçünde de aynı şey: bir kanal kodu ikinci bir varyantın
`sku`/`firmaSku`/`barkod` alanında duruyor. Anayasadaki **üç kod rolü**
ayrımının ihlali — Kanal SKU bir KİMLİK değil, eşleştirmedir.

### ÖLÇÜM — `npm run canli:kod-carpismasi` (salt okuma, tekrar koşulabilir)

    TABAN 1865 aktif varyant · 4306 benzersiz kod · ÇARPIŞAN KÜME 3

    HBCV00000R0H0K · 97393839282   Philips BHD500    stok 0 <-> 4  ← bildirilen
    221000567899                   TEFAL bıçak seti  stok 0 <-> 2
    887961643367                   Fisher-Price      stok 0 <-> 1

**İkisi henüz patlamamıştı** — o ürünlere sipariş gelmemişti.

⚠ **ÖLÇÜM EŞDEĞERLERİ AÇAR VE BU ŞART:** `887961643367` ile `0887961643367`
iki ayrı dizedir, `@unique` ikisini de kabul eder — ama arama onları **DENK**
sayar (UPC-A ↔ EAN-13). Ham dize karşılaştırması bu çarpışmayı **göremezdi.**

### YAPILAN ① — CANLI YAZIM (`npm run canli:carpisma-onar`)

Kuru koşum gösterildi, sonra `--uygula`. **4 kayıt · iz bırakıldı · yerel
anlık görüntü alındı** (`veri/ozel/carpisma-onarim-*.json`).

· bloke siparişin kalemi gerçek varyanta çevrildi (sipariş ONAYSIZDI, stok
  hareketi henüz yazılmamıştı — ledger'a dokunulmadı)
· üç ikiz varyant pasife alındı

⚠ **SİLİNMEDİ — GEÇMİŞ TAŞIYORLAR:** Philips 2, TEFAL **17**, Fisher **11**
satış kalemi. Pasife almanın neyi gizlediği ÖNCE ölçüldü: satış ekseni/ciro/kâr
`Sale` üzerinden okunuyor (**değişmez**), `/urunler` ve `/stok` `isActive`
süzmüyor (**değişmez**), raporun stok ekseni süzüyor ama üçünün de stoğu `0`.

⚠ **BETİK KİMLİĞE KİLİTLİ VE `--geri` TAŞIYOR.** Geri alma ölçütü **kodun
içindeki sabit kimlik listesi** — veritabanı alanında değil, yani kırpılamaz.
_(Anayasa: "geri alma yolu saklanan listeye değil yeniden hesaplanabilir
ölçüte dayanır.")_

**DOĞRULANDI (iz değil, VERİ):** çarpışma **3 → 0** · aktif varyant 1865 → 1862
· sipariş artık `KUC-BR-BHD50-01`, stok **4**, onay bekliyor.

### YAPILAN ② — SESSİZ SEÇİM KAPATILDI

Ortak gövde: `src/lib/varyant-kod-cozumu.ts` → **seçmez, SAYAR**
(`YOK` · `TEK` · `COK`). `YOK` ile `COK` ayrı tutuluyor; tek kefeye konsaydı
operatör var olan ürünü **yeniden tanımlamaya** kalkar ve ikiz sayısı artardı
— arızayı besleyen bir mesaj.

⭐ **DESEN YASAĞI DOSYA LİSTESİNİ YENDİ — VE HEMEN KANITLADI.** Ben beş
çağıran saymıştım; bekçi **altıncısını** buldu (`okut/sayim-actions.ts`).
Elle liste tutulsaydı sayım yolu sessizce korumasız kalırdı — ve orası en
tehlikelisi: **sayım son sözdür**, yanlış varyanta yazılan adet ledger'a girer.

Ekranlar artık **söylüyor**: satış formu · alım formu (kodu arama kutusuna
yazıp listeyi açıyor) · `/okut` · `/yerlestir` · sayım kipi.
⛔ Ve `/okut` çakışmada **eşleştirme teklif ETMİYOR** — teklif etseydi zaten
fazla olan bağlara bir tane daha eklenirdi.

### YAPILAN ③ — DEĞİŞİKLİK EKRANDA GÖRÜNÜR OLDU

`/urunler` yalnız **ürün** düzeyini gösteriyordu; aramayı süzen alan ise
**varyantın** `isActive`i. Pasife alınan üç kayıt ekranda tamamen normal
görünüyordu. Rozet varyant düzeyine bağlandı ve **"hepsi" ile "bazısı" ayrı
yazılıyor** — tek varyantı pasif olan çok varyantlı bir ürün hâlâ satılabilir.

### ÖLÇÜLDÜ

`kod-cozumu:dogrula` **20 ölçüt** · `kod-cozumu-mutasyon` **9/9** (zararsız
sağlama + kaldıran + fazladan) · `simulasyon-mutasyon` **8/8** · `arama` 124 ·
`depo` 210 · `simulasyon` 182 · `i18n` · `tsc` · `lint` · `build`

⚠ **`depo:dogrula`NIN HARNESS'İ YOK** — taşınan ölçütü ELDEN mutasyonla
sınadım (mutantla çıkış `1`, geri alınca `0`, GÖRÜLDÜ). Aynı davranış ayrıca
harness'li `kod-cozumu:dogrula` altında da ölçülüyor, yani koruma tek bacağa
bağlı değil.

⛔ **ÜÇ MUTASYON İLK TURDA KAÇTI VE BEKÇİYİ DÜZELTTİRDİ** — üçü de anayasanın
adı konmuş körlükleri: ① `durum: "COK"` deseni **TİP TANIMINDA** da geçiyordu,
dönüşü `YOK`a çeviren mutasyon yeşil geçti · ② satış formunun dal **KOŞULU**
`false` yapıldı, sözlük anahtarı dosyada kaldı · ③ okuma ekranında aynısı.
Ölçütler koşul+sonuç **aynı desende** olacak şekilde yeniden yazıldı.

⛔ **VE PUSH TURU DÖRT BEKÇİYİ KIRMIZI YAKTI — DÖRDÜ DE "ÖLÇÜTÜM ESKİDİ".**
`arama:dogrula` (×2) · `depo:dogrula` · `simulasyon:dogrula`. Hepsi
`kodKosulu(temiz)` çapasını arıyordu ve refaktör o çağrıyı bir katman yukarı
taşıdı. **Hiçbiri susturulmadı** — çapa `kodlaVaryantCoz(temiz)`ye taşındı,
niye eskidiği koda yazıldı, ve her birinin yanına _"çok eşleşmede iş yapmıyor"_
ölçütü **koşul+sonuç aynı desende** eklendi.

⭐ **VE BU DESEN ARTIK BİR AİLE:** bu oturumda refaktör **üç ayrı turda**
bekçi çapası sildi (K230-③'te iki harness, burada dört bekçi).
_(Anayasa: "iyi bir refaktör bekçiyi kör etmemeli" — ölçülen bedel: her
teslimde bir tur kayıp.)_

⚠ **VE `arama:dogrula` İKİ KEZ KIRMIZI YANDI — İKİSİ DE "ÖLÇÜTÜM ESKİDİ".**
Refaktör onun aradığı çapayı (`kodKosulu(temiz)`) sildi. Ölçüt susturulmadı,
taşındı. İkincisi daha öğretici: taramayı yorumsuz okumaya çevirince ÜÇ
ekranın `PASİF DAHİL:` **beyanı** kayboldu ve bu kez onlar suçlandı —
**çağrı koddan, beyan yorumdan** okunmak zorundaymış.

─── ⑤ **İÇE AKTARMA PASİF SÜZMÜYORDU — 22.09.2026, kullanıcı yakaladı**

HB'nin 08:16 siparişi (**4748270482**, aynı Philips) yine ikize bağlandı, yine
`Stok yetersiz (0/1)`. Sebep: **üç içe aktarma** (`canli-hb/ty/n11-ice-aktar`)
varyantı `kodKosuluToplu` ile arıyor ve `isActive` **süzmüyordu**. Dün aramayı
düzelttim, içe aktarmayı düzeltmedim — _"kararın kapsamı, uygulandığı yerle
sınırlı sayılmaz"_ dersini bir gün sonra kendim çiğnedim. Üçüne de süzgeç
kondu; `ice-aktarma:dogrula` ölçütü taşındı + "yalnız aktif" şartı eklendi.

**ONARIM (`canli-pasif-bagi-onar.ts`, kuru koşum → `--uygula`):** ölçüt
"onaysız ∧ iptalsiz ∧ pasif varyant ∧ **stok hareketi YOK**". 30 kalem bulundu;
**29'u 2025 tarihli Excel geçmişi** (`satis-excel`, hareketleri ikizde) —
DOKUNULMADI, iki defter ayrışırdı. **1 kalem çevrildi** (4748270482 →
`KUC-BR-BHD50-01`, stok 3). Veriden doğrulandı: tekrar koşum 0. İz
`PASIF_BAGI_ONARIM`. ⚠ "Onaysız = hareketsiz" varsayımı YANLIŞTI; ölçüm
yazımdan önce yakaladı.

### AÇIK

- [x] ~~**Halil testi ①**~~ — **GEÇTİ 21.09.2026 19:44.** Defterden teyit
      edildi (kullanıcı beyanı değil, veri): onay damgası yazıldı, `SALE_OUT −1`
      **doğru varyanta** düştü, stok **4 → 3** (beklenen rakamla birebir).
      ⭐ Ve bir şeyi daha kanıtladı: kâr **hesaplandı** (`CALCULATED`,
      NET-1 ₺663,91 · NET-2 ₺549,32). İkize bağlı kalsaydı maliyet
      bulunamaz, `NO_COST` düşerdi — yani arıza yalnız "kaydedemiyorum"
      değil, **kârın sessizce hesaplanamaması** idi.
- [x] ~~**Halil testi ②**~~ — **GEÇTİ 22.09.2026, BULGUYLA.** İki kayıt, doğru
      stoklar, ikizde _"Varyantları pasif — aramada çıkmaz"_ yazısı VARDI —
      kullanıcı ekran görüntüsüyle geldi ve _"rozet hâlâ yok"_ dedi. Haklıydı:
      `variant="secondary"` bu temada **düz metin gibi** çıkıyor; yanındaki
      çerçeveli "Hepsiburada kodu" etiketinin yanında rozet sanılmıyor.
      ⭐ Kod doğru, veri doğru, deploy güncel — üçü ölçüldü ve üçü tuttu;
      **ekran yine de "yok" dedi.** İlke #2'nin rozet hâli: etiket etiket gibi
      GÖRÜNMELİ. `outline` + kehribar çerçeveye çevrildi. Dün "tarayıcı
      önbelleği" dedim — yanlıştı; sebep görünürlüktü.
- [ ] **Halil testi ③** — `/okut`ta `887961643367` okutun: artık **tek** ürün
      açılmalı (Fisher-Price, stok 1).
─── ④ **MUSLUK KAPANDI** — üç kalem de bitti (21.09.2026)

⭐ **KÖK BULUNDU VE BEKLEDİĞİM YERDE DEĞİLDİ.** İkizlerin bir içe aktarmadan
doğduğunu sanıyordum. Ölçüm başka şey söyledi: Philips ikizi **ÖNCE** doğmuş
(03.09, `URUN_TANIM_TOPLU`), gerçek kayıt **SONRA** (17.09). Yani çarpışmayı
üreten şey ürün tanımlama değil, **sonradan eklenen kanal eşleştirmesiydi.**

**GERÇEK SEBEP TEK CÜMLE: YAZMA KAPISI, OKUMA KAPISINDAN DARDI.**

| kapı | neye bakıyordu | neye BAKMIYORDU |
|---|---|---|
| ürün formu | kimlik alanları ↔ öteki kimlik alanları | **Kanal SKU'lara** |
| kanal eşleştirme | kanal kodu ↔ öteki kanal kodları | **kimlik alanlarına** |
| arama (`kodKosulu`) | **dört rolün hepsi** | — |

İki kapı da "temiz" diyor, sonra arama iki kayıt buluyor ve sessizce birini
seçiyordu. _(Anayasa: "yazımın kapısı ile okumanın kapısı AYNI ölçüde bakar;
iki yerde iki farklı ölçüt olursa biri ötekinin yazdığını göremez.")_

**Çare:** her iki kapı da ortak gövdeye bağlandı (`kodBaskaVaryantaAitMi`).
⚠ Ve yazma kapısı arama kapısından **DAHA GENİŞ** bakıyor (`pasifDahil`):
pasife alınmış bir ikizin kodunu ikinci kez kullanmak, temizlenen çarpışmayı
geri getirirdi — kapı kendi temizlediğini yeniden üretemez.

**② FİYAT DENEMESİ ARTIK SEBEBİ SÖYLÜYOR.** `urunZemini` çok eşleşmede `null`
döndürüyordu ve çağıran onu _"ürün bulunamadı"_ diye çiziyordu — yani **yanlış
sebebi** söylüyordu ve operatörü var olan ürünü yeniden tanımlamaya iterdi.
Sonuç ayrıldı: `BULUNDU` · `YOK` · `COK`.

**③ PASİFE ALMA KUTUSU EKLENDİ** — ürün formunda, varyant başına.
⛔ `isActive` aylardır şemadaydı, `/urunler` "pasif" rozetini ÇİZİYORDU ve o
durumu üreten **hiçbir düğme yoktu.** Zincirin beş halkası da ayrı ölçülüyor:
sorar · okur · doğrular · yazar · **geri verir** (sonuncusu en sinsisi —
okunmayan alan kaydette sessizce sıfırlanır ve hiçbir hata çıkmaz).

**ÖLÇÜLDÜ:** `kod-cozumu:dogrula` **30 ölçüt** · mutasyon **15/15** ·
`simulasyon-mutasyon` 8/8 · `simulasyon` 183 · `depo` 210 · `arama` 124

⚠ **VE BU TURDA ÖLÇÜT BİR KEZ DAHA ESKİDİ — BU KEZ DAVRANIŞ İYİLEŞTİĞİ İÇİN.**
Bir saat önce yazdığım _"çok eşleşmede zemin KURULMUYOR"_ ölçütü `null` dönüşünü
sabitliyordu; ayrı sonuca çevirince kırmızı yandı. Ölçüt ve ona çapalı mutasyon
birlikte taşındı. _(Anayasa: "bekçinin kırmızısı her zaman 'kod yanlış' demez".)_

### AÇIK
- [x] ~~**Toplu içe aktarmalar yazma kapısından GEÇMİYOR.**~~ **KAPANDI
      21.09.2026 — musluğun son yarısı.** Ölçüm iki yönde de açık buldu:
      kimlik dizinleri kanal kodlarını hiç indekslemiyordu; kanal eşleştirmesi
      `(hesap|varyant)` çiftine bakıyor, **kodun kendisine** bakmıyordu.
      Şekil, aynı dosyadaki dönem kapısının şekli: **sorma, atla, raporla** —
      iki yeni hata kodu (`KOD_BASKANIN_KANAL_KODU` · `KOD_BASKANIN_KIMLIGI`),
      atlanan satır kimliğiyle ekrana gidiyor. ⚠ Dosya İÇİ çarpışma da
      yakalanıyor: bir satır kodu kimlik olarak açıp başka satır kanal kodu
      yapamaz. **DEĞER TESTİ** (`toplu-kapi:dogrula`, 13 ölçüt — gövde saf,
      desen taranmadı) + **mutasyon 6/6** (kaldıran 3 · fazladan 2 · zararsız).
      ⛔ **VE BİR CÜMLEM YANLIŞTI, COMMIT'TEN ÖNCE YAKALANDI.** Panoya önce
      _"`komisyon/yukle.ts` kanal SKU yaratmaz, oraya kapı gerekmez"_ yazdım;
      kodu okuyunca tersi çıktı — **"EKSİK EŞLEMELER" bloğu `createMany` ile
      eşleme YARATIYOR** (dosyadaki barkodla varyantı bulup pazaryerinin
      kodunu bağlıyor). Yani K231'i doğuran adımın üçüncü kapısı buradaydı.
      Takıldı (22.09.2026): dört rollü kimlik dizini (`sku` · `firmaSku` ·
      `barkod` · **bütün hesapların** kanal kodları) → başkasının kimliği
      olan kod **eşleme açmaz**, sayılır (`kimlikCakisti`), önizlemede
      **hangi kod · hangi ürüne · sahibi kim** diye yazar. Hedefin KENDİ
      barkodu meşru (en yaygın durum). **Değer testi** `komisyon:dogrula`
      10. bölüm (7 ölçüt, gövde çağrılır) + mutasyon `komisyon-kapi-mutasyon`
      (kaldıran 2 · fazladan 2 · zararsız). _(Anayasa: "yokluk iddiası da
      iddiadır" — üç kez bakmadan kuruldu, üçü de yanlış çıktı; bu dördüncüsü,
      bakıldığı için yanlış çıkmadan düzeldi.)_

---

## 🔶 K230 — TEK KAPI SÖZÜ TAMAMLANDI + TARİFE AYNASI · 21.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

**KULLANICI SORUSU:** _"Bu ikisi arasındaki fark nedir, neden iki tane var?"_
(menüde `Komisyon tarifesi` ve `Komisyon yükleme`).

⛔ **SORU HAKLIYDI VE KUSUR BENDEYDİ.** K226'da _"tek kapı"_ sözü verildi ama
`/ayarlar/tarife`'nin KENDİ yükleyicisi yerinde bırakıldı. Menüde iki yükleme
yolu kaldı — yani karışıklığı bitirmesi gereken paket, karışıklığın yeni bir
biçimini üretti. **Yarım uygulanan söz, söz olmaktan çıkar.**

**A) DURUM EKRANI ARTIK YALNIZ DURUM.** `/ayarlar/tarife`'den yükleyici
kaldırıldı, yerine tek kapıya bağlantı kondu; adı **"Tarife pencereleri"**
oldu. Yükleme tek kapıdan, kapsam/boşluk kaydı kendi ekranında.

**B) TARİFE AYNASI — `/ayarlar/tarife/[id]`.** _(Kullanıcı isteği: "aynı
şekilde pazaryerini taklit eden arayüz"; kararı: **ayna + bizim NET'imiz**.)_
Yüklü tarife pazaryeri panelinin dilinde açılıyor: ürün ürün fiyat aralıkları
ve her aralığın komisyonu. Satır açılıp kargo yazılınca her aralıkta **NET-2**.

⭐ **EKRANIN VARLIK SEBEBİ TEK ÖLÇÜMDE GÖRÜNDÜ** (Stanley French Press, N11,
kargo ₺110 — gerçek veriyle):

    fiyat 4.174,00   komisyon %16     NET-2  800,78   ← bugünkü
    fiyat 3.026,14   komisyon %3,81   NET-2  333,38
    fiyat 2.933,17   komisyon %3,31   NET-2  273,41
    fiyat 2.840,20   komisyon %3      NET-2  208,16

**Komisyon %16'dan %3'e düşerken NET adet başına ₺592 eriyor.** Pazaryeri
paneli bunu gösteremez — senin maliyetini bilmiyor. _"Komisyonu düşürüyoruz"_
teklifi cazip görünür; karar veren rakam komisyon değil NET'tir.

⚠ **İKİNCİ BİR HESAP YAZILMADI.** NET, fiyat denemesinin MEVCUT motorundan
(`simulasyonKarsilastir`), maliyet `urunZemini`den geliyor. Kopya yazılsaydı
iki ekran aynı ürün için iki farklı rakam gösterebilirdi.

⚠ **KARGO SORULUYOR, UYDURULMUYOR.** `urunZemini` kargo taşımıyor (ölçüldü).
Sıfır varsayılsaydı her dilim olduğundan kârlı görünürdü — ekranın engellemek
için var olduğu yanılgının ta kendisi. Boş bırakılırsa hesaplanmıyor.

⚠ **ÜST UCU AÇIK DİLİMİN FİYATI SON SATIŞTAN** geliyor ve ekranda öyle
etiketleniyor — `ChannelSku` fiyat tutmuyor (ölçüldü), uydurma baz yazılmadı.

─── ② HALİL TESTİ RAKAMI ÖLÇÜLÜRKEN **SESSİZ BİR KUSUR** ÇIKTI

Teste yazacağım beklenen rakamları ölçtüm ve Braun'da NET **hiçbir dilimde**
hesaplanmıyordu. Tanı:

    girdiEksikMi: true   ·   eksikSebebi: FIYAT

Sebep: ayna NET'i `kanalFiyatlari: { [kanal ADI]: fiyat }` ile istiyordu; motor
ise fiyatı `SIMULASYON_KANALLARI`nin **KODUYLA** arıyor (`elleFiyat(k.kod, …)`).

    TRENDYOL    / Trendyol
    HEPSIBURADA / Hepsiburada     ← kod ≠ ad, eşleşme HİÇ tutmadı
    N11         / N11             ← kod = ad, orada TESADÜFEN çalışıyordu

⛔ **KUSUR KENDİNİ EN AZ GÖRÜNÜR KILAN KANALDA SAKLIYORDU** — ve sessizdi:
hata vermiyor, NET yalnızca boş çıkıyordu. _(Anayasa: "benzer ad aynı kimlik
değildir" · "kimlik varken dizeyle aranmaz" — K13b dersinin bu depoda kaçıncı
tekrarı olduğu ayrıca düşünülmeli.)_

Düzeltildikten sonra ölçülen (Braun · HB · kargo ₺110 · maliyet ₺1.024):

    1.801,01 ve üstü      %18     fiyat —          NET —   (ürün hiç satılmamış)
    1.711,01 – 1.801,00   %8,8    1.801,00      359,83  ◆
    1.621,01 – 1.711,00   %7,2    1.711,00      321,48
    1.621,00 ve altı      %6      1.621,00      273,76

⚠ **VE BU TUR BİR DİSİPLİN HATASI DA GÖSTERDİ:** düzeltmeyi **push turu
koşarken** yaptım; tur kaynağı yarım hâlde okudu ve `tarife:dogrula` kırmızı
yandı. Push durdu — ki doğrusu buydu, çünkü o commit kusurlu hâli taşıyordu.
**Tur koşarken kaynağa dokunulmaz.**

### BEKÇİ + MUTASYON

    tarife:dogrula   187 → 196 ölçüt
    teklif-tanima-mutasyon:kontrol   23/23 → 28/28

⛔ **"TEK KAPI" SÖZÜ ARTIK ÖLÇÜLÜYOR:** durum ekranına yükleyici geri koyan
mutasyon kırmızı yanıyor. Söz bir kez yarım uygulandı; ikinci kez olmasın diye
beyan değil **bekçi** kondu.

⛔ **VE KİMLİK/AD TUZAĞI DA ÖLÇÜLÜYOR:** kanalı yeniden ADLA arayan iki
mutasyon (fiyat anahtarı ve sonuç eşleşmesi) kırmızı yanıyor. Bu kusur hata
vermediği için yalnız mutasyonla yakalanabilirdi.

─── ③ AYNI SORU **İKİNCİ KEZ** SORULDU — İKİ EKRAN TEK EKRAN OLDU

**KULLANICI:** _"Tarife penceresi ile komisyon yüklemenin farkı ne?"_

⛔ **İKİNCİ KEZ SORULMASI, CEVABIN DEĞİL TASARIMIN SORUNU OLDUĞUNU GÖSTERİR.**
②'de verilen cevap _"biri yükleme kapısı, öteki durum ekranı"_ idi ve doğruydu —
ama bir ayrımı **her seferinde ANLATMAK** gerekiyorsa o ayrım ekranda GÖRÜNMÜYOR
demektir. Menüde hâlâ iki kalem vardı ve ikisi de "komisyon/tarife" diyordu;
kullanıcı hangisine gideceğini kodun gerekçesinden değil MENÜDEN okuyor.

**YAPILAN:** iki menü kalemi **tek kaleme** indi — `Komisyon yükleme`. Yüklü
pencereler, K49 kapsam boşluğu tutanağı ve tarife aynası bağlantıları artık
kanal kartlarının **üstünde**, aynı ekranda.

⚠ **GÖVDE TAŞINDI, YENİDEN YAZILMADI.** 394 satırlık durum gövdesi
`src/app/ayarlar/tarife/durum.tsx`e olduğu gibi çıktı (`TarifeDurumu`).
Özetleyerek taşımak, neyin kaybolduğunu ölçülemez yapardı. Ölçüldü — düşen
tek şey ekranın KENDİ başlığı ve "yükleme şurada" bağlantısıydı:

    düşen sözlük anahtarları : baslik · aciklama · yuklemeNerede · komisyonKapisi
    düşen bileşenler         : Button · ExternalLink
    düşen ölçüt              : YOK — K49 mantığı satır satır aynı

⚠ **ESKİ ADRES SİLİNMEDİ, YÖNLENDİRİYOR.** `/ayarlar/tarife` → `/ayarlar/komisyon`.
Yer imi ya da eski bir bağlantı 404 görmez. **Ama görev adresi yönlendirmeye
bel bağlamaz:** panelin `tarifePenceresi` görevi hedefin KENDİSİNİ gösteriyor
artık — yönlendirme kalktığı gün uyarı sessizce boşluğa götürürdü.

⛔ **SESSİZ BİR KUSUR DAHA KAPANDI: TAZELENECEK ADRES.** Yükleme sonrası
`revalidatePath` hâlâ `/ayarlar/tarife`'yi tazeliyordu. Liste artık orada
çizilmiyor — yani yükleme BAŞARILI olur, liste ESKİ hâlinde kalırdı. Hata
vermeyen, _"yüklemedi sandım"_ diye okunan bir ayrışma.

⭐ **EN KRİTİK ÖLÇÜT: GÖVDE ÇAĞRILIYOR MU.** Bu deponun en pahalı yalancı
yeşili tam bu sınıftaydı — _"tur 98/98 yeşildi ve panelde kutu YOKTU; gövdeler
kusursuz çalışıyordu ve onları kimse çağırmıyordu."_ 394 satırlık görünür bir
blok başka dosyaya taşındığında aynı tuzak açılır. Bekçi import satırını değil
**JSX'te çizildiğini** arıyor ve `<TarifeDurumu />`'yu `{null}` yapan mutasyon
kırmızı yanıyor.

⛔ **VE PUSH KAPISI BİR ŞEY YAKALADI — YÖNLENDİRME DE BİR SAYFADIR.**
`yetki:dogrula` kırmızı yandı: yönlendirme gövdesinde `sayfaIzni` yoktu
(72 korumalı · **1 KORUMASIZ**). Muafiyet beyan etmek daha kolaydı ama YANLIŞ
sınıfı kayda geçirip **meşrulaştırırdı**. Kapı kondu — ve kapı yalnız bir
tören değil: kapısız hâlde yetkisiz bir ziyaretçi yönlendirilip HEDEFTE 404
alırdı, yani **sıçramanın kendisi orada bir şey OLDUĞUNU söylerdi**. Artık
istek ilk adımda 404 alıyor. Ölçüm: **73 korumalı · 0 KORUMASIZ.**

**ÖLÇÜLDÜ:** `tarife:dogrula` 198 ölçüt · `teklif-tanima-mutasyon` **29/29**
(zararsız sağlama dâhil) · `el-kitabi` · `i18n` · `build` yeşil.

⚠ **REFAKTÖR ÇAPALI HARNESS'İ DE TAŞIDI.** Değişen her dosya için
`scripts/*mutasyon*.ts` tarandı; eski sayfaya çapalı iki mutasyon **silinmedi**,
niyeti korunup şekli yeni koda taşındı.

⚠ **EL KİTABI DA BİRLEŞTİ** — iki bölüm tek bölüm oldu, beş sık hata tek
listede. Kod düzeltilip belge eski hâlinde kalsaydı ikinci bir ayrışma doğardı.

### AÇIK
- [x] ~~**Halil testi ③**~~ — GEÇTİ 22.09 (3·4·5 ok). ~~menüde `Tarife pencereleri` kalemi GÖRÜNMEMELİ.~~
      `Ayarlar → Komisyon yükleme` açılınca ÜSTTE "Yüklü pencereler" kartı,
      ALTINDA kanal kartları olmalı. Bir pencere satırındaki **"Tarife aynası"**
      hâlâ çalışmalı. Adres çubuğuna elle `/ayarlar/tarife` yazınca
      `/ayarlar/komisyon`'a düşmeli (404 DEĞİL).
- [ ] **Halil testi ③-b** — bir tarife dosyası yükleyin; **aynı ekranda**
      "Yüklü pencereler" listesi yeni pencereyle tazelensin (eski adres
      tazeleniyordu, liste kalırdı).
- [x] ~~**Halil testi**~~ — GEÇTİ 22.09 (6·7 ok: Braun aynası 359,83 ◆, N11 teklif oranı).
- [ ] **⭐ İSTEK (kullanıcı, 22.09): aynada ÜRÜN ARAMA.** _"çok güzel olmuş ama
      ürün arama yeri lazım, tek tek listeden bulmak çok zor."_ HB aynası 44,
      N11 46 ürün; kod/ad kutusu + kamera (İlke #7) — küçük paket.
- [ ] **Braun hiç satılmamış** → üst dilimin fiyatı yok, NET de yok. Bu DOĞRU
      davranış (uydurma baz yazılmıyor) ama satılmamış ürünlerde tepe dilim
      hep boş kalacak. Kanal liste fiyatı tutulsaydı dolardı — ayrı kalem.
- [ ] Ayna listesi sayfalanmıyor — HB'de 43 ürün bugün sorun değil; ürün sayısı
      büyürse sayfalama gerekir _(anayasa: "satır sayısı veriyle birlikte
      BÜYÜYEN şey")_.

---

─── **Halil 22.09 (#6): "çok güzel olmuş ama ürün arama yeri lazım, tek tek
listeden ürün bulmak çok zor."** Tarife aynası (`/ayarlar/tarife/[id]`)
sayfalı liste; kod/ad araması yok. **AÇIK:** ortak kod kutusu (kamera dahil)
eklenecek — K121 desen yasağı gereği `KodAramaKutusu` + ortak çözüm gövdesi.

## 🔶 K229 — KARGO TARİFESİ KANAL BAĞIMSIZ OLDU · 21.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

**KULLANICI TESPİTİ:** _"Bu sadece HB'ye özel değil, diğer pazaryerleri de arada
bir değiştiriyor. Onlara has bir yer de olmalı."_ Ekranın **adında kanal
gömülüydü** — anayasanın adlandırma kuralına da aykırı: kanal VERİ olabilir,
YAPI olamaz.

⛔ **VE EKRAN OLMAYINCA GÖRÜNMEYEN BİR ARIZA BÜYÜMÜŞ — ÖLÇÜLDÜ:**

    Trendyol      4.210 satır · 10 taşıyıcı · tek parti 2026-07-16   ← 2 AY ESKİ
    Hepsiburada  85.702 satır · 11 taşıyıcı · 2026-08-01 + 2026-09-10
    N11 ve 9 kanal daha                       TARİFE YOK

Trendyol'unki **seed'den** gelmiş (`prisma/seed-kar-motoru.ts` →
`veri/kargo-tarifeleri.xlsx`) ve bir daha tazelenmemiş; tazeleyecek ekran da
yoktu. Yani TY satışlarında kargo maliyeti iki aylık bir tarifeden hesaplanıyor
ve bunu **hiçbir ekran söylemiyordu.**

### YAPILAN

**A) `/ayarlar/kargo-tarifesi`** — kanal kartları, komisyon ekranıyla aynı
desen. Kart üç ÖLÇÜLMÜŞ şeyi yazar: satır sayısı · en son yürürlük tarihi ·
**üstünden kaç gün geçtiği**. Tarifesi olmayan kanal da kart olur ve
_"kâr hesabı kargoyu bilemez"_ diye yazar.

**B) KANAL ARTIK KİMLİKLE ÇÖZÜLÜYOR.** Yazıcı kanalı
`name: { contains: "Hepsiburada" }` ile buluyordu. Bu deponun **K13b dersi**
o kalıbın bedelini ölçmüştü: ad alanı `"Hepsiburada — AXCALI"` üretiyor,
eşleşme tutmuyor ve kayıtlar sessizce eleniyordu. `Channel.code` ile değişti.

**C) VERİ MODELİ DEĞİŞMEDİ** — `CargoTariff.channelId` zaten herhangi bir
kanala bağlanıyordu (ölçüldü). Eksik olan yalnız ekran ve okuyucuydu.

⚠ **"BAYAT" EŞİĞİ KOYULMADI VE BU BİLİNÇLİ.** Tarifenin BİTİŞ tarihi veride
YOK (`CargoTariff`te yalnız `effectiveFrom` var), yani "kaç günde bayatlar"
sorusunun veriden türetilebilir cevabı yok. Uydurma bir gün sayısı, anayasanın
_"eşik dağılımın gediğine konur"_ kuralını çiğnerdi. Ekran ÖLÇÜLEBİLİR OLANI
yazıyor: tarih ve geçen gün. Hükmü operatör veriyor — ama artık rakamı görerek.

### API — ÖLÇÜLDÜ, İDDİA EDİLMEDİ

Mevcut istemcilerde **kargo TARİFESİ ucu YOK.** Trendyol'da bulunan tek kargo
ucu `cargo-invoice/{faturaNo}/items` — o **fatura**, yani fiilen kesilen;
ileriye dönük tarife değil. HB ve N11 istemcilerinde kargo ucu hiç yok.

⚠ **"Pazaryerleri böyle bir uç yayımlamıyor" DENMİYOR — dokümanlarına
BAKILMADI.** Yokluk iddiası da bir iddiadır; bakılmadan yazılmaz.

⭐ Ve iki soru ayrı: _"bu desiyi gönderirsem ne tutar"_ (simülasyon → **tarife**)
ile _"bu gönderiden ne kesildi"_ (denetim → **fatura**, TY'de ucu VAR).

### BEKÇİ + MUTASYON

    kargo-tarife-pdf:dogrula        24 → 35 ölçüt
    kargo-tarifesi-mutasyon:kontrol      6/6  (yeni)

⛔ **BEKÇİ YAZILIRKEN KENDİ KURALIMI YAKALADI:** _"adla arama kalmadı"_ ölçütü
kırmızı yandı çünkü desen, eski hâli **ANLATAN YORUMUN** içinde eşleşiyordu.
Anayasa: _"yorumsuz kodda arar — bir yasağı anlatan yorum, o yasağı çiğnemiş
sayılmaz."_ Okuma kapısı eklendi.

⚠ **VE HARNESS İKİ ÇAPAYI "ÖLÇÜLEMEDİ" DİYE REDDETTİ** (biri Türkçe karakter
farkı, biri sözdizimi bozan mutasyon) — "geçti" demedi. İkisi de onarıldı.

### AÇIK
- [x] ~~**Halil testi**~~ — GEÇTİ 22.09, **BULGUYLA (#8):** kullanıcı: _"listede
      sadece alım yaptığımız Bim ve MediaMarkt da var; yükleme yalnız
      Hepsiburada'da."_ İlki kusur: ekran `channel.findMany({isActive})` ile
      ALIŞ kanallarını da çiziyordu → **yalnız satış hesabı olan kanallar**
      (komisyon kapısıyla aynı ölçüt). İkincisi tasarım: okuyucu yalnız HB için
      var, kart bunu yazıyor — TY/N11 dosyası gelirse okuyucu yazılır.
- [x] ~~**Trendyol kargo tarifesi 2 aydır tazelenmiyor — okuyucusu yok.**~~
      **YANLIŞ ÇERÇEVE — 22.09.2026'da ölçüldü.** Kullanıcı: _"TY'nin fiilen
      kestiği kargoyu API'den okuyor olmalısın, kontrol et."_ **Okuyor:**
      `canli-ty-kargo-gercek-olcum.ts` (K220-②) TY'nin "Kargo Fatura"
      kayıtlarını API'den alıp `Sale.cargoAmount`a yazıyor — yalnız BOŞ olana,
      dolu olanı ezmez; `ty-hakedis-cekim` cron'undan **her gece** koşuyor
      (`TY_KARGO_GERCEK_YAZ`, 96 iz, son 21.09 04:21). Kâr motoru
      (`kargo-kaynagi.ts`) gerçek varsa onu, yoksa tahmini kullanıyor.

          ay        satış   GERÇEK(API)  yalnız TAHMİN   hiçbiri
          2026-07     290         290              0         0
          2026-08     230         173             57         0
          2026-09     223          10            207         6

      Yani tarife "tazelenmiyor" değil — tarife yalnız **fatura gelene kadarki
      pencerede** (TY faturası ~4 hafta sonra düşüyor; son 14 günün 154
      satışının 143'ü kargolanmış ama faturası henüz yok) NET-2'yi besliyor.
      Bu pencerede tahmin iki aylık tarifeden geliyor; fatura gelince
      **kendiliğinden düzeliyor.** Anayasa: "geçmişi düzeltmek ile mekanizmayı
      kurmak ayrı kararlardır" — mekanizma kurulu.
- [ ] **Eylül'de 6 TY satışı ne gerçek ne tahmini kargo taşıyor** — NET-2
      kargosuz hesaplanıyor ve durumu `CALCULATED` (K141'in bilinen açığı:
      "CALCULATED eksik maliyeti söylemiyor"). **Satış satış ölçüldü:** altısı
      da 21.09 siparişi, **onaylı, kargolanmamış, taşıyıcı SEÇİLMEMİŞ**, desi 3
      (`11628817256 · 11629058995 · 11629354592 · 11630018372 · 11630383131 ·
      11630389840`). Taşıyıcı seçilince tahmin dolar, fatura gelince gerçek —
      bir zamanlama hâli, kusur değil. Ama o ana kadar 6 satışın kârı kargo
      kadar ŞİŞİK görünür ve rozet bunu söylemiyor → K141'e bağlı.
- [x] ~~**API'de kargo tarifesi ucu var mı — ÖLÇÜLMEDİ.**~~ **ÖLÇÜLDÜ 21.09.2026**
      (kendi keşif belgelerimiz: `docs/a3-*-api-kesif.md`): **hiçbir kanal desi
      tarifesini API'den yayımlamıyor.** HB `product/cargo-providers` → yalnız
      taşıyıcı LİSTESİ; TY `Cargo Invoice Details` → **fiilen kesilen** kargo.
      ⭐ İkincisi tarifeden ÜSTÜN bir kaynak (anayasa kaynak sırası: kanalın
      kendi belgesi > bizim tahmin). TY tarifesinin iki aydır tazelenmemesi
      sorunu şekil değiştiriyor: tarifeyi tazelemek yerine **gerçek kesintiyi
      okumak** — ayrı kalem. ⚠ Sınır: satıcının tam uç kataloğu değil, bizim
      keşif notlarımız ölçüldü.

---

─── **Halil 22.09 (#8): "Kargo listelemede sadece satın alım yaptığımız
pazaryerleri de var (Bim, MediaMarkt); ayrıca sadece Hepsiburada kısmına
yükleme yapılıyor."** Kanal listesi `satisIcin: true` hesabı olan kanallardan
geliyor — demek ki Bim/MediaMarkt hesapları **satış hesabı olarak
işaretli**; ölçülmedi. **AÇIK:** ① hesapların `satisIcin` bayrağı ölçülüp
düzeltilecek (veri mi, kod mu) · ② "yalnız HB'ye yükleme" — hangi ekran,
hangi düğme netleştirilecek (kullanıcıdan ekran görüntüsü).

## 🔶 K227 — TEKLİF DOSYASI **TARİFEDİR** — ESKİ KARAR ÇEVRİLDİ · 21.09.2026 · [KOD KOŞTU — HALİL TESTİ BEKLİYOR]

**KULLANICI TESPİTİ:** _"HB'de her Çarşamba ürünlerin bir kısmı için teklif
veriliyor; teklif edilen rakamı satış fiyatı olarak işaretlersen o fiyatın
komisyonu geçerli. **Temel mantık Trendyol ile aynı.**"_

⛔ **VE HAKLIYDI. 02.09.2026'daki K-HB-TEKLIF KARARI YANLIŞTI.** O gün şu
yazılmıştı: _"Bu dosya tarife DEĞİL ve tarife olarak yüklenmesi kâr hesabını
bozar."_ Gerekçe şuydu: `dilimBul` bugünkü fiyata indirimli oranı uygulardı.

⭐ **GEREKÇE DOĞRUYDU AMA KOŞULLUYDU — VE KOŞUL HİÇ SORULMAMIŞTI:** o kayma
yalnız **MEVCUT FİYAT DİLİMİ tabloya konmazsa** olur. Konursa
`dilimBul(2.599)` → **%18** döner, yani doğru. Trendyol'un tarifesi de
**aynı koşullu mekanizma** — anayasa onu kendi sözleriyle yazıyor:
_"TY fiyat indirimi karşılığı komisyon indiriyor: 2.000'e %10, 1.750'ye
satarsan %7"_. Yani koşulluluk ayırt edici değildi; eksik olan **tablonun
TEPESİYDİ**. _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı
korur" — burada korunan şey, HB/N11'in tarifesiz kalmasıydı.)_

### ÖLÇÜM — üç kanalın paneli GÖZ GÖZE karşılaştırıldı

Braun IRT3030 · HB dosyası ↔ HB panelinin kendi ekranı, **birebir**:

    > 1.801,00            %18     ← mevcut komisyon, üst uç AÇIK
    1.711,01 – 1.801,00   %8,8
    1.621,01 – 1.711,00   %7,2
            ≤ 1.621,00    %6      ← alt uç AÇIK

| kanal | dosyadaki şekil |
|---|---|
| Trendyol | `1.Fiyat Alt Limit … 4.KOMİSYON` · tepe dilim dosyada VAR (`ve üstü`) |
| Hepsiburada | `Teklif 1/2/3` → yalnız **ÜST fiyat**; alt sınır bir sonrakinin **+1 kuruşu** (panel `1.711,00 - 1.621,01` yazarak doğruluyor) |
| N11 | `N. Teklif Üst Limit + Alt Limit + Komisyon` · **iki sınır da dosyada**, türetme YOK |

Dosyanın kendi notu da kanıt: _"Hesaplanan Komisyon, girilen fiyata ve
**sunulan fiyat aralıklarına** göre otomatik hesaplanır."_ (N11)

### YAPILAN

**A) Yeni saf gövde** `teklif-tarifesi.ts` — teklif dosyasını `TarifeOkumasi`
üretir, yani Trendyol okuyucusunun **çıktısının aynısı**. Aynı plan/yazma
yolundan geçer; ikinci bir yazma yolu açılmadı.

**B) Tarife yolu artık teklif dosyasını KABUL EDİYOR** — ve yalnız HATA
dalında deneniyor, geçerli bir TY tarifesi o satıra hiç gelmiyor.
`TEKLIF_DOSYASI` engel kodu **kaldırıldı** (üretilmeyen kod bırakılmaz);
yerine `PLATFORM_UYUSMAZ` geldi — dosya ile hesabın kanalı çelişirse yazmaz.

**C) `DILIMLI_TARIFE` artık ÜÇ kanalda** ve küme **elle değil beyandan**
türetiliyor (`...TEKLIF_TARIFESI_OKUYUCUSU_OLAN`).

**D) Kutu adları düzeltildi** (kullanıcı onayı): _"Güncel komisyon oranı
listesi"_ → **"Haftalık komisyon oranı (ürün dökümü)"**; tarife kutusu
**"Haftalık dilimli komisyon tarifesi"** oldu ve üç kanaldaki adlarını yazıyor.

⛔ **PENCERE — ÖLÇÜM BİR KUSUR YAKALADI.** İlk yazımda pencere tam zaman
damgasına göre gruplanıyordu ve **44 satırın 41'i "pencere dışı"** çıktı:
HB teklifleri aynı günün farklı DAKİKASINDA başlıyor (`00:07` · `00:19`…).
Gruplama İstanbul takvim gününe çevrildi → pencere **16.09 → 22.09**, yani
**panelin sekmesinde yazanın aynısı**; dışarıda kalan 14 satır ekranda sayılıyor.

⚠ **PENCERE YÜKLEME BAŞINA TEK — BEYAN.** Teklifler ürün başına ayrı tarih
taşıyor (HB'de 44 üründe 27 farklı). Kayıt tek pencere tutuyor; **en yaygın**
aralık seçiliyor. Gerekçe: dosya haftalık yükleniyor ve her yükleme o haftanın
geçerli tekliflerini yeniden getiriyor. _Kalem başına geçerlilik şema
değişikliği ister; bugünkü akışta karşılığı yok._

### BEKÇİ + MUTASYON

    tarife:dogrula   164 → 187 ölçüt
    teklif-tanima-mutasyon:kontrol   18/18 → 23/23

⛔ **EN KRİTİK ÖLÇÜT:** `dilimBul(2.599) → %18`. Tepe dilimi kaldıran mutasyon
kırmızı yanıyor — yani 02.09'daki korkunun kendisi artık **ölçülüyor**.
Diğerleri: kuruş payını kaldıran (dilimler çakışır) · alt sınır türetmeyi
kaldıran (HB dilimleri açık kalır) · pencereyi saniyeye döndüren · beyanı
boşaltan. Beşi de kırmızı.

⭐ **VE BİR MUTASYON KAÇTI, ÖLÇÜT DÜZELTİLDİ.** Bir türü BAŞKA bir türle
değiştiren mutasyon, yalnız SAYI sayan ölçütten kaçıyordu (adet aynı, küme
bozuk). Artık **türlerin KÜMESİ** karşılaştırılıyor — her kanal için.

⚠ **VE İKİ MUTASYONUN ÇAPASI REFAKTÖRLE KAYDI.** Harness _"geçti"_ demedi,
**"ÖLÇÜLEMEDİ"** dedi ve push'u durdurdu. Mutasyonlar SİLİNMEDİ; niyetleri
korunup yeni koda taşındı. _(Anayasa: "refaktör, çapalı harness'i de taşır".)_

### ✅ HALİL TESTİ GEÇTİ — 21.09.2026, canlı adres, gerçek dosyalar

    HB  yükleme : 44 satır · 152 kalem · 43 eşleşen · 1 bağsız
                  pencere 2026-09-16 → 2026-09-22  (panel sekmesiyle BİREBİR)
    N11 yükleme : 142 kalem · 33 eşleşen ürün · pencere 2026-09-21 → 2026-10-04
    ikisi de canlıya yazıldı (13:08 ve 13:09)

⭐ **VE ZİNCİR UÇTAN UCA ÇALIŞTI — ASIL KANIT BU.** Kullanıcı fiyat denemesinde
HB fiyatına **1801** yazdı ve komisyon kendiliğinden **%8,8** oldu; kutunun
altında _"oran dilim tarifesinden"_ yazıyor. Yani teklif dosyası tarifeye,
tarife dilime, dilim kâr hesabına ulaştı.

⚠ **"N11 ÇALIŞMIYOR" DENDİ — ÖLÇÜM ÇÜRÜTTÜ.** Denenen ürün (Braun IRT-3030)
N11 tekliflerinde **HİÇ YOK** (ölçüldü: 0 kalem); N11'in _"veri yok"_ demesi
DOĞRU davranıştı. N11 teklifi OLAN bir üründe motor sorunsuz çözüyor:

    1210001906501 (Stanley French Press)
      3.500 → %16    (tepe dilim)     2.950 → %3,81
      2.900 → %3,31                   2.500 → %3      · kaynak=DILIM

_(Anayasa: "sıfır üç farklı şey olabilir" — burada "oran gelmiyor", kusur
değil, o üründe teklif OLMAMASIYDI.)_

### AÇIK
─── ③ **BAĞSIZ ÜRÜNLERİN SEBEBİ ÖLÇÜLDÜ — VE PANODAKİ TEŞHİS YANLIŞTI**
_(21.09.2026 · `npm run canli:tarife-bagi`)_

Panoda şöyle yazıyordu: _"o ürünlerin N11 kodu bizde yok."_ **Ölçüm çürüttü.**
Bağsız kodların bir kısmı sistemde **ZATEN VARDI** — başka kanalın kodu olarak:

    HBCV00004U1QOR · HBCV00007ITCGF   -> HEPSİBURADA kodları
    5702017424842                     -> EAN (LEGO)
    40744 · 42221 · 43020             -> LEGO ürün numaraları

Yani N11 dosyası "pazaryerinin kendi kodunu" taşımıyor; **satıcı o ürüne hangi
kodu girdiyse onu** taşıyor. Yükleyici ise yalnız iki role bakıyordu: `barcode`
+ **o hesabın** kanal kodları. Kapsam dört role ve bütün kanallara genişletildi.

**ÖLÇÜLDÜ:** 17 bağsız koddan **6'sı** bulunuyor · bunun **3'ü yürürlükteki
N11 penceresinde** (bir sonraki yüklemede kendiliğinden düzelir).

⚠ **GEÇMİŞ PENCERELERE DOKUNULMADI VE DOKUNULMAYACAK.** Ölçüm şunu gösterdi:
`TYB03WJ27YHQ5LZU10` 09-08 penceresinde bağsız, 09-15'te bağlı — kanal SKU'su
**09-10'da kurulmuş.** Yani eski pencere yükleme anının FOTOĞRAFI ve doğru.
Bunu "kusur" diye okumak, doğru çalışan bir mekanizmayı bozmak olurdu.
_(Anayasa: "geçmişi düzeltmek ile mekanizmayı kurmak ayrı kararlardır".)_

⛔ **VE GENİŞLEYEN KAPSAM YENİ BİR SESSİZ SEÇİM ÜRETMİYOR:** bir kod iki
varyanta çözülüyorsa **bağlanmaz** — bağsız kalem görünür, yanlış bağlanmış
kalem görünmez. Bugün çakışma **0** ve bu tesadüf değil: K231'in yazma kapısı
bu kodların doğmasını engelliyor.

- [ ] **Kalan 11 kod gerçekten kataloğumuzda yok** — LEGO ürün numaraları
      (`40744`, `42221`), N11'in 18 haneli iç kodları, `BRİ924` model kodu.
      Kapatma yolu: **N11 listeleme senkronu** (aşağıda).
- [x] ~~**Teslim 2: pazaryeri aynası ekranı**~~ — **K230'DA YAPILDI**
      (`/ayarlar/tarife/[id]`). Kalem burada açık kalmıştı; kapatıldı 21.09. Panelin gösterdiği her dilimin yanında o fiyata satarsan
      NET-2 yazacak — pazaryerinin asla gösteremeyeceği rakam, çünkü maliyeti
      bilmiyor. Fiyat denemesi motoru yeniden yazılmayacak, çağrılacak.
- [ ] **Trendyol teklif/indirimli dosyası ölçülmedi** — TY'nin kampanya
      dosyasında `Mevcut Komisyon` biçiminde bir kolon var mı bakılmadı.
      "Yok" denmiyor, **bakılmadı**.

---

## 🔶 K226 — KOMİSYON YÜKLEME TEK KAPI + ESKİ BİÇİM (.xls) · 21.09.2026 · [KOŞTU — HALİL TESTİ BEKLİYOR]

**KULLANICI ARIZASI:** _"Hepsiburada tarifeler panodan yüklenemiyor."_ İki
dosya gönderildi, ikisi de düştü — ve **iki ayrı sebeple**.

### ÖLÇÜM — iki dosya da TARİFE DEĞİL, aynı cinsten KAMPANYA dosyası

| | Hepsiburada | N11 |
|---|---|---|
| dosya | `Avantajlı_Teklifler-21-09-2026-09_33.xlsx` · 290.427 bayt | `4534966-21-09-2026-09-35-13.xls` · 44.544 bayt |
| imza | `50 4B` → gerçek xlsx | `D0 CF 11 E0` → **gerçek eski biçim .xls** |
| sayfa | `Açıklama` + `Teklifler` | `Ürün Komisyon Teklifleri` |
| şekil | iki satırlı: `Teklif N` / `Üst Fiyat`+`Komisyon` | tek satırlı, **11. satırda**: `1. Teklif Üst Limit/Alt Limit/Komisyon` |

İkisi de **koşullu teklif**: oran ancak teklif kabul edilip fiyat düşürülürse
geçerli. HB ekranının reddi DOĞRUYDU; N11 hiç okunamadı.

### ÜÇ KUSUR

**① `.xls` OKUNAMIYORDU.** `read-excel-file` kendi cümlesiyle reddediyor —
_"You passed a legacy `.xls` file. Only `.xlsx` files are supported"_ — ama bu
cümle kullanıcıya ULAŞMIYOR; yerine onu suçlayan bir metin görünüyordu
(_"dosyanın bozuk olmadığından ve indirildiği hâlde olduğundan emin olun"_).
Dosya bozuk DEĞİLDİ. ⚠ Üstelik `accept=".xlsx"` yüzünden dosya seçicide
`.xls` dosyaları **görünmüyordu** bile.

**② N11 TEKLİF DOSYASI YAKALAYICIDAN KAÇIYORDU.** Ölçüldü:
`teklifDosyasiMi = false`. Tanıma yalnız 0. ve 1. satıra bakıyordu; N11'de
başlıklar 11. satırda. Yani `.xls` çözülse bile kullanıcı _"sütun eksik…
henüz desteklenmiyor"_ görecekti — doğru red, "yakında gelir" diye okunan
yanlış mesaj.

**③ EKRAN ÇIKMAZA GÖTÜRÜYORDU.** Kırmızı kutu dosyanın ne OLMADIĞINI
yazıyor, nereye gideceğini yazmıyordu. _(Anayasa: "kural doğru mu değil,
teslim edilebilir mi".)_

### YAPILAN

**A) OKUMA TEK KAPIYA ALINDI** — `src/lib/tablo/tablo-oku.ts`. Biçim
**BAYTTAN** tanınır (ad bir iddiadır); xlsx yolu DEĞİŞMEDİ (beş kapıda
kanıtlanmış + Trendyol ZIP64 normalleştiricisi), eski biçim SheetJS'e gider.
`src/` altındaki **beş yükleme kapısı** (hakediş · komisyon · tarife · içe
aktarma · geçmiş ekstre) bu gövdeye bağlandı; çıplak `readXlsxFile(` **desen
yasağıyla** kapatıldı — dosya listesiyle değil.

⛔ **İKİ YOLUN AYNI ŞEYİ SÖYLEDİĞİ ÖLÇÜLDÜ** (aynı içerik, iki kap) ve ölçüm
**üç sessiz ayrışma** yakaladı:

    ilk ölçüm      357 hücre ayrışıyor   → boş metin `""` vs `null`
    ikinci ölçüm    93 hücre ayrışıyor   → TARİH, tam 2 SAAT kaymış
    üçüncü ölçüm    39 hücre ayrışıyor   → metin kırpma + milisaniye
    son ölçüm        0 hücre             ✓

⚠ **EN PAHALISI SAAT DİLİMİYDİ:** SheetJS seri sayıyı **YEREL** saatte
kuruyor. Aynı dosya Berlin'deki makinede ve UTC koşan sunucuda **iki farklı
ana** çözülürdü ve hiçbir yerde hata vermezdi. Anayasa bunu adıyla yasaklıyor.
Çözüm: seri sayı saf UTC aritmetiğiyle çevriliyor. Formül **tahmin edilmedi,
ölçüldü** (n=92 tarih hücresi): `(seri − 25569) × 86400000` → **92/92**;
`Math.round`lu hâli **0/92**.

**B) KAMPANYA YAKALAYICISI İKİ ŞEKLİ DE TANIYOR.** Başlık satırı ilk 20 satır
içinde aranıyor; hem HB'nin iki satırlı hem N11'in tek satırlı şekli.
Ayırt edici kelime **`teklif`** — Trendyol'un gerçek tarifesi `1.KOMİSYON` +
`1.Fiyat Alt Limit` taşır ama "teklif" TAŞIMAZ.

📏 **ALTI GERÇEK DOSYAYLA ÖLÇÜLDÜ — 6/6:** N11 kampanya ✓ yakalandı · HB
kampanya ✓ yakalandı · **TY gerçek dilimli tarife ✗ dokunulmadı** (hâlâ tarife
olarak okunuyor) · TY indirimli rapor ✗ · HB komisyon listesi ✗ · TY temmuz
indirimli ✗.

**C) TEK KAPI EKRANI — `/ayarlar/komisyon`.** _Kullanıcı kararı: "her kanalın
kendi yükleme stili olsun; kişi kanala tıklasın, dosyayı içine koysun."_
Kanal kartları **veriden** türetiliyor (elle liste yok). Her kart o kanalın
kabul ettiği dosyaları adıyla yazar; **desteklenmeyen tür de SATIR olarak
durur** ve NİYE olmadığını söyler (sıfır satır gizlenmez). Yükleyiciler
yeniden yazılmadı — sabit hesapla içeri alındı.

⚠ **ESKİ EKRANLAR KALDI:** `/ayarlar/tarife` yüklü pencereleri ve kapsam
boşluğu tutanağını (K49) göstermeye devam ediyor — o bir DURUM ekranı.

**D) KAMPANYA TANIMASI İKİ YOLA DA BAĞLANDI.** Yakalayıcı önce yalnız TARİFE
yolundaydı; kullanıcı aynı dosyayı **öteki kutuya** da bırakabilir ve orada
_"ürün listesine benzemiyor"_ yazıyordu — doğru ama dosyanın NE olduğunu
söylemeyen bir cümle. Komisyon yolu da artık danışıyor (`TEKLIF_DOSYASI`).
⚠ Bağın KENDİSİ ölçülüyor: ölçüt `TANINMADI` dalına daraltıldı ve **sıra** da
sınanıyor (tanıma genel cevaptan ÖNCE gelmeli, yoksa hiç çalışmaz).

**E) EL KİTABI BÖLÜMÜ YAZILDI** — `el-kitabi:dogrula` push'u durdurdu:
menüdeki her ekranın kitapta karşılığı olmak zorunda (kullanıcı kararı
22.08.2026) ve yeni ekran yoktu. Bölüm iki dosya türünü, kampanya tuzağını ve
`.xls` biçimini anlatıyor. _Bekçi öğretti, kimse fark etmek zorunda kalmadı._

**F) ÜÇ MESAJ DÜZELTİLDİ** — kullanıcıyı suçlayan `.xls` metni, "henüz
desteklenmiyor" diye okunan sütun mesajı ve teklif dosyası uyarısı. Üçü de
artık aynı kartın altındaki **"Güncel komisyon oranı listesi"** kutusuna
yönlendiriyor — hedefi VAR OLAN bir kutu.

### BEKÇİ + MUTASYON

    tablo-oku:dogrula                  24 ölçüt  (yeni)
    tarife:dogrula                142 → 159 ölçüt
    komisyon:dogrula              169 → 174 ölçüt
    el-kitabi:dogrula                  53 ölçüt  (yeni bölüm)
    tablo-oku-mutasyon:kontrol         13/13     (yeni)
    teklif-tanima-mutasyon:kontrol     10/10     (yeni)

⭐ **ZARARSIZ MUTASYON DA SINANDI** (yorum değişikliği → YEŞİL). Yalnız gerçek
bozmalar denenseydi, hiçbir şey koşmayan bir harness "mükemmel" görünürdü.

⛔ **VE BİR MUTASYON KAÇTI — ÖLÇÜT DEĞİL, VERİ DÜZELTİLDİ.** _"Teklif şartını
gevşeten"_ mutasyon ilk turda yeşil geçti: mevcut örnekler o dalı hiç
çalıştırmıyordu. Ayrımı gösteren satır eklendi (`limit` var, `teklif` yok) ve
mutasyon kırmızıya döndü. _(Anayasa: "mutasyon kaçıyorsa önce test verisi
sorgulanır".)_

⚠ **YOL ÜSTÜNDE İKİ KAÇIŞ HATASI KENDİ ELİMDEN ÇIKTI** ve ikisini de ÖLÇÜM
yakaladı, dikkat değil: bekçinin yorum temizleyicisine fazladan bir ters bölü
girmişti (`/\/\\*/` — doğrusu `/\/\*/`) ve regex herhangi bir `/`'dan `*/`'a kadar **kodu
yiyordu** — taban ölçütü 6 yerine 4 sayıyordu. _(Anayasa: "kod üreten araç,
kaçış dizilerini bozuk yazabilir".)_

### BAĞIMLILIK KARARI — kullanıcı onayıyla

`.xls` için **SheetJS 0.20.3, yayıncının kendi adresinden**
(`cdn.sheetjs.com`). Ölçüldü ve **npm'deki `xlsx` paketi ELENDİ**: tek sürümü
`0.18.5`, **yüksek önem dereceli iki açık ve düzeltmesi YOK** (Prototype
Pollution + ReDoS; yayıncı npm'den ayrılmış). `exceljs` eski biçimi hiç
okumuyor. Seçilen sürümde açık **yok**, bağımlılığı **yok**.

⚠ **BEDELİ BEYAN EDİLİYOR:** her kurulum ve her Vercel deploy'u
`cdn.sheetjs.com`a bağlanır. Adres düşerse **build KIRMIZI yanar** — sessiz
değil, görünür bir arıza; yanlış rakam üretmez.

─── ② PUSH KAPISI BİR ÇAKIŞMA YAKALADI (aynı teslim)

`mutasyon-cakisma:dogrula` push'u durdurdu ve **haklıydı**: iki yeni harness de
`src/lib/komisyon/yukle.ts`i mutasyona uğratıp `finally`de geri yazıyor.
Paralel koşsalardı biri ötekinin **MUTANTINI** "asıl" sanıp geri yazardı —
ve bozulma sessiz olurdu. İkisi `SIRALI_MUTASYON_GRUP`a beyan edildi
(9 çakışan + 16 bağımsız). ⚠ Liste elle tutuluyor ama **her koşumda gerçek
taramayla karşılaştırılıyor**; beyan edilmemiş bir çakışma kırmızı yanıyor.

**Tur sonucu: 137/137 yeşil · push geçti.**

─── ③ HALİL TESTİ EKRANI DOĞRULADI + BİR AYLIK SESSİZ KUSUR ÇIKTI

**Ekran canlıda ve doğru davranıyor** (kullanıcı ekran görüntüsü, 21.09): HB
kartında kampanya dosyası reddedildi, kırmızı kutu ne olduğunu ve nereye
gidileceğini yazdı. ⚠ Deploy da geçmiş demektir — **cdn.sheetjs.com
bağımlılığı ilk gerçek deploy'da sorun çıkarmadı.**

⛔ **AMA AYNI EKRAN GÖRÜNTÜSÜNDE BİR AYLIK BİR KUSUR GÖRÜNDÜ.** N11 okuyucusu
**18.08.2026**'da eklendi; ekranın ELLE YAZILMIŞ iki yeri güncellenmedi ve
bir ay öyle kaldı:

| eksik | sonucu |
|---|---|
| `platformN11` sözlük etiketi HİÇ yazılmamış | önizlemede kanal adı **BOŞ** basılıyordu |
| "nereden indirilir" yazısı yalnız TY + HB | operatörün **tam o soruya** cevabı yoktu |

⭐ **VE BİRİNCİSİ GÖRÜNMEDEN YAŞIYORDU — ÖLÇÜLDÜ.** Önce _"next-intl patlar,
ekran kırılır"_ diye teşhis kurdum; ölçüm **çürüttü**: kütüphane hata
atmıyor, eksik parametreyi **sessizce boş** basıyor (`" listesi · okunan
sayfa: …"`). Yani kusur ne hata veriyor ne göze çarpıyordu.
_(Anayasa: "imkânsız görünen değer önce doğrulanır" — burada imkânsız
görünen ÇÖKÜŞTÜ ve olmadığı ölçüldü.)_

**ÇARE METİN DEĞİL, BAĞ:** ekranın platform tipi artık `KomisyonPlatformu`
tek gövdesine bağlı. Dördüncü pazaryeri eklendiğinde `Record` **DERLENMEZ** —
liste bakım istemez. _(Anayasa: "tip listesi değil, BAĞ".)_

**BEKÇİ — küme `IMZALAR`dan türetiliyor, elle liste yok:** her platform için
① sözlükte etiketi var mı ② "nereden indirilir" o kanalın yolunu anlatıyor mu
③ ekranda çıplak birlik yok. `komisyon:dogrula` 174 → **183**.
**Mutasyon 10/10 → 13/13**: etiketi silen · yolu çıkaran · tipi çıplak
birliğe döndüren; üçü de kırmızı yandı.

─── ④ KAMPANYA DOSYASINDAN "MEVCUT KOMİSYON" — ÜÇÜNCÜ KUTU

**KULLANICI İTİRAZI:** _"Bunları HB ve N11 yüklemek için yapmıyor muyuz zaten,
normalde Trendyol yükleniyordu."_ İtiraz haklıydı ve iki şeyi ayırmayı
gerektirdi:

⚠ **HB/N11 YÜKLEMESİ BU PAKETTEN ÖNCE DE VARDI** — `/kanal-sku/komisyon-aktar`
üç kanalı da **18.08.2026'dan beri** tanıyor. Trendyol'un ayrıcalığı yoktu.
Bozuk olan **kapının bulunamaması** ve ekranın yanlış cümle kurmasıydı.

⭐ **AMA İTİRAZIN ALTINDA GERÇEK BİR ŞEY VARDI:** kullanıcının ELİNDEKİ dosya
kampanya dosyası ve içinde `Mevcut Komisyon` sütunu duruyor — kanalın o anki
GERÇEK oranı, kaynak önceliğinde **en üst basamak**. Atmak, elimizdeki gerçek
veriyi çöpe atmaktı.

**ÖLÇÜLDÜ (gerçek dosyalar, 21.09.2026):**

    HB  kampanya  44/45 satırda kod + okunabilir oran   · kataloğun 2153'te 44'ü
    N11 kampanya  46/46 satırda kod + okunabilir oran   · kataloğun 48'de 46'sı
    kimlik uyumu  HB 36/44 · N11 24/46 kod oran listesinde de var → aynı kod uzayı

⭐ **N11'DE BU BÜYÜK:** indirdiği kampanya dosyası kataloğunun neredeyse
tamamının güncel oranını taşıyor. HB'de küçük (%2) — orada asıl kaynak yine
tam döküm. **Karar kullanıcıya soruldu, sessizce yapılmadı.**

**YAPILAN:** kartlarda üçüncü kutu — _"Kampanya dosyasından güncel oranları
al"_. ⛔ Teklif kolonları **OKUNMUYOR** (modül onları hiç görmüyor).
Aynı okuyucu/plan/yazma gövdesinden geçiyor; ikinci bir yazma yolu açılmadı.

⚠ **TRENDYOL KUTUSU AÇILMADI VE BU BİR ÖLÇÜM SONUCU DEĞİL, BOŞLUK:** TY
kampanya dosyasında `Mevcut Komisyon` biçiminde tek bir güncel oran kolonu
olup olmadığı **ölçülmedi**. "TY yayımlamıyor" denmiyor — bakılmadı.

**BEKÇİ:** `komisyon:dogrula` 183 → **203** · `tarife:dogrula` 159 → **163**.
Mutasyon **13/13** ve **18/18**.
⛔ **EN KRİTİK ÖLÇÜT:** okuyucuyu teklif kolonuna çeviren mutasyon KIRMIZI
yanıyor — örnek veri ayrımın iki yakasını gösteriyor (Mevcut %13 ↔ teklif %8,4).

⭐ **VE HARNESS'İN ZARARSIZ MUTASYON SAĞLAMASI ANINDA İŞE YARADI.** Zararsız
bir yorum değişikliği bekçiyi kırmızı yaktı → "YALANCI KIRMIZI" raporlandı.
Sebep mutasyon değildi: `tarife:dogrula`da **elle sayılmış** bir ölçüt
(_"iki tür döner"_) üçüncü tür eklenince eskimişti. **Susturulmadı,
beyandan türetildi** (`YUKLEME_TURLERI`) ve tamlık derleme zamanında
kapılandı. _(Anayasa: "bekçinin kırmızısı her zaman kod yanlış demez".)_
⚠ Yalnız gerçek bozmalar denenseydi bu görünmezdi.

### AÇIK
- [ ] **Halil testi** — canlı adreste, gerçek dosyalarla (liste raporda).
- [ ] **N11'in KOMİSYON dökümü hangi biçimde iniyor — ÖLÇÜLMEDİ.** Elimizdeki
      `.xls` dosya kampanya dosyasıydı. Ürün/komisyon dökümü de `.xls` ise
      kapı onu da açar; `.xlsx` ise bugün zaten çalışıyordu. Kapı iki biçimi
      de çözdüğü için **hangisi olursa olsun sonuç değişmiyor** — ama iddia
      ölçülmeden yazılmaz.
- [ ] **HB/N11 dilimli tarife yayımlıyor mu — BİLİNMİYOR.** Ekran "bizim
      okuyucumuz yok" diyor, "kanal yayımlamıyor" DEMİYOR. Yokluk iddiası da
      bir iddiadır ve ölçülmedi. Böyle bir dosya eline geçerse okuyucu yazılır.
- [ ] **FIRSAT (kusur değil):** her iki kampanya dosyasında `Mevcut Komisyon`
      sütunu duruyor — HB'de 45, N11'de 46 ürün için, **kanalın kendi beyanı**
      (kaynak önceliği: `OLCULDU`). Teklif kolonlarına dokunmadan yalnız o
      sütun okunabilir. **Karar kullanıcıya ait, sessizce yapılmadı.**

⚠ **DEPODA 12 GÜVENLİK AÇIĞI VAR VE BU PAKETTEN DEĞİL** (3 orta · 8 yüksek ·
1 kritik): `prisma`/`deepmerge-ts` · `fast-uri` · `hono` · `js-yaml` ·
`mariadb` · `sharp`. Eklenen `xlsx` audit'te **geçmiyor**. Prisma düzeltmesi
**kırıcı sürüm** istiyor; ayrı kalem, ayrı karar.

---

## 🔶 K225 — LİSTELEME SENKRONU ZAMANLANDI · 21.09.2026 · [KOŞTU — İLK OTOMATİK KOŞUM BEKLENİYOR]

K224'ün açık bıraktığı madde kapandı: _"senkron zamanlanmış değil; bugün elle
koşuldu, yarın yine bayatlar. Ekran bunu söylüyor ama söylemek çözmek
değildir."_

**İKİ BETİK ÇAĞRILABİLİR ÇEKİRDEĞE ÇEVRİLDİ.** İkisi de yalnız `main()`
taşıyordu; `void main()` / `main().catch()` kaldırıldı ve yerine
_"içeri alındığında koşmaz"_ kapısı geldi — cron ucu dosyayı **import**
ediyor ve yan etkiyle koşsaydı sunucu her ısındığında sessiz bir tarama
başlatırdı. Desen `canli-hb-hakedis-cekim.ts` ile AYNI (İlke #10).

**TEK UÇ, İKİ KANAL — BİLİNÇLİ AYRIM.** Sipariş/hakediş çekimleri kanal
başına ayrı uçlar çünkü farklı kadanslı farklı işler. Listeleme durumu ise
**her kanala sorulan TEK soru** ve ekran üçünü birlikte gösteriyor. N11
senkronu yazıldığı gün buraya **bir satır** eklenir; yeni rota + vercel
girdisi + Action üçlüsü açılmaz.

    POST yok — iki betik de yalnız GET; pazaryerine hiçbir şey yazılmıyor
    vercel.json  04:50 UTC   (birincil)
    GitHub Action 05:20 UTC  (yedek — Vercel Cron 18-19.08'de HİÇ tetiklenmedi
                              ve Hobby planında logu olmadığı için sebebi
                              ÖĞRENİLEMEDİ; anayasa "üçüncü şans verilmez")

⛔ **BİR KANALIN DÜŞMESİ ÖTEKİNİ DURDURMAZ** ve düşen kanal **500** döndürür —
`200` dönseydi Action yeşil yanar, yarısı koşmayan bir senkron "başarılı"
sayılırdı. Tetikleyicinin gördüğü tek şey durum kodudur.

⭐ **VE YOL ÜSTÜNDE GERÇEK BİR GÜVENLİK BOŞLUĞU BULUNDU.** `api:dogrula`nın
sır kapısı kontrolü **yalnız "SALT OKUMA" beyanlı uçlara** bakıyordu. Cron
uçlarının hepsi YAZAR — yani beyanlı değiller — ve **altısı da hiç
denetlenmiyordu.** Korumasız bir cron ucu, internete açık bir "defteri
değiştir" düğmesidir. Yeni bölüm dizinden türetiliyor (elle liste yok):
her `src/app/api/cron/**/route.ts` için üç ölçüt — sır ORTAMDAN okunuyor ·
karşılaştırılıyor · reddedilen istek **404** alıyor (401 değil; "yetkiniz
yok" demek orada bir şey OLDUĞUNU söyler).

**MUTASYON — 6 senaryo:** sır kapısı kalksın 🔴 · 404 yerine 401 🔴 · sır
sabitten okunsun 🔴 · küme boşalsın 🔴 · taban doluluğu kapısı kalksın 🟢
(EŞDEĞER — küme doluyken kapıyı kaldırmak davranışı değiştirmiyor; işi
boşalmayı yakalamak ve o kırmızı) · zararsız yorum 🟢 (harness sağlaması).

`api:dogrula` 187 → **237** ölçüt.

⛔ **VE PUSH KAPISI DÖRT BEKÇİYLE DAHA DURDURDU — DÖRDÜ DE HAKLIYDI.** İkisi
KAYIT eksikliği, ikisi REFAKTÖRÜN SİLDİĞİ ÇAPA:

| bekçi | ne dedi | ne yapıldı |
|---|---|---|
| `cron-yollari:dogrula` | uç `ACIK_YOLLAR`da değil | eklendi |
| `yetki:dogrula` | uç muafiyet listesinde değil | gerekçesiyle eklendi |
| `hb-listeleme:dogrula` | "varsayılan KURU" ölçütü düştü | ölçüt TAŞINDI |
| `vitrin:dogrula` | "çöküş de iz yazıyor" çapası düştü | ölçüt TAŞINDI |

⭐ **İLK İKİSİ DÖRDÜNCÜ KEZ ÖĞRETİLMEDİ — BEKÇİ ÖĞRETTİ.** `ACIK_YOLLAR`a
eklenmemiş bir cron ucu, kendi sır kapısına HİÇ ulaşamadan oturum duvarında
**401** düşer. Bu hata K166'da, K-HB-CRON'da ve `/api/olcum`da üç kez
yaşanmış; HB ucu **iki gün boyunca her koşumda sessizce 401 almış.** Bu sefer
kimse fark etmek zorunda kalmadı: push durdu.

⚠ **SON İKİSİ ANAYASADAKİ "REFAKTÖR, ÇAPALI HARNESS'İ DE TAŞIR" VAKASI.**
`const UYGULA = process.argv…` ve `main().catch(` çapaları refaktörle
silindi; **kod doğruydu, ölçütün tutunacağı yer kalmamıştı.** İkisi de
SUSTURULMADI, davranışa yeniden bağlandı — ve ÇAĞIRANA da: yalnız gövdeye
baksalardı, çağıran `yaz: true` sabitiyle çağırsa ölçüt bunu göremezdi.
Dört mutasyonla sınandı (CLI hep yazsın · gövde kapısı kalksın · çöküşte iz
yazılmasın · CLI korumasız gövdeyi çağırsın), dördü de kırmızı.

⛔ **İLK GERÇEK TETİK 504 VERDİ — VE ÜÇ AYRI KUSUR ÇIKTI.**

**① "~40 sn" İDDİASI YANLIŞ ÖLÇÜLMÜŞTÜ.** Koda _"ölçüldü, ikisi birlikte
~40 sn"_ yazmıştım; o ölçüm **yerel makinede** yapılmış ve sunucuya aitmiş
gibi yazılmıştı. Süre artık cevapta dönüyor (`tyMs`/`hbMs`) — 504 hiçbir
zamanlama bilgisi vermiyor ve elimizde tek sayı yoktu.

**② TY HER SATIRI KOŞULSUZ YAZIYORDU.** İlk başarılı koşum gerçeği söyledi:

    TY  120.871 ms   yazılan 1083      ← her satır, koşulsuz
    HB    3.836 ms   yazılan 0         ← yalnız değişen

Ölçüldü: 1097 satırın **1082'si BİREBİR AYNI**, yalnız 1'i farklı. Tek satır
güncellemesi **130 ms** → 1096 satır = 142 sn. Artık değişmeyen satıra
dokunulmuyor; gövde **1.134 ms**'ye indi.

**③ DAMGA "DEĞİŞTİM" DİYORDU, "KONTROL ETTİM" DEMİYORDU.** HB bir turda 0
satır değiştirdi ve **hiçbir damga tazelenmedi**: kanal 1 dakika önce
kontrol edilmişken ekran _"son ölçüm 154 dakika önce"_ diyordu ve bir süre
sonra BAYAT diye sarı yanacaktı. **Az önce teslim ettiğim ekran yalan
söyleyecekti.** Artık kontrol edilen HER satır tek toplu sorguyla
damgalanıyor.

⭐ **VE BİR HAYALET KOVALANMAKTAN DÖNÜLDÜ.** Yerel `--yaz` koşumu **251 sn**
sürüyordu ve bunu "optimize edilecek iş" sanmak kolaydı. Ölçüldü: yazım
gövdesi **1.134 ms**, tarama 8 sn — kalan ~242 sn **iş bittikten sonra
sürecin kapanmamasıydı** (yazım yolunda Prisma bağlanıyor, hiç kapatılmıyor;
kuru koşumda Prisma HİÇ yüklenmiyor, o yüzden 8 sn görünüyordu).
`$disconnect` CLI sarmalayıcısına kondu — **gövdeye konamaz**, aynı gövdeyi
cron ucu da çağırıyor ve orada `prisma` sunucunun PAYLAŞILAN istemcisi.
**251 sn → 10 sn.**

⚠ **VE YAZIM GÖVDEYE TAŞINDI, BETİKTE BIRAKILMADI:** toplu damgayı önce
betiğe koymuştum; `api:dogrula` + `hb-listeleme:dogrula` ikisi birden
kırmızı yandı (_"ölçüm betiği deftere yazmaz"_). Gövdeye taşındı.

**BEKÇİ — 5 yeni ölçüt, 5 mutasyon (hepsi kırmızı):** toplu damga kalksın ·
damga başka alana vurulsun · çağıran BOŞ küme geçirsin (gövdedeki kapı
gizlenir) · TY koşulsuz yazıma dönsün · TY damgası kalksın.

### AÇIK
- [ ] **İlk otomatik koşum 22.09 sabahı** — `AuditLog`dan doğrulanacak.
      Koşmazsa Vercel Cron yine kaçırmış demektir ve Action'ın tuttuğu
      görülür (ikisi birden kaçarsa sebep ORTAK, ayrıca ölçülür).
─── ② **N11 SENKRONU YAZILDI · 22.09.2026 · [KOD KOŞTU — İLK OTOMATİK KOŞUM BEKLENİYOR]**

Önce fark ölçüldü (21.09): **TY 1099/1096 (%99,7) · HB 1111/1110 (%99,9) ·
N11 51/0 (%0)** — listelemelerimizin canlıda olup olmadığını hiç bilmediğimiz
tek kanal. Uç 22.09'da ilk kez sondalandı (`GET /ms/product-query`, keşif
belgesinde 🟡 idi): **113 listeleme**, tek satıcı `4534966` =
`ChannelAccount.externalId` (kimlikle eşleşme hazırdı). Alan doluluğu 113/113;
`saleStatus` ⇔ `quantity` birebir (58 Out_Of_Stock/0 · 55 On_Sale/>0);
`status` **yalnız "Active"** — başka değer hiç görülmedi, bu yüzden "Active"
dışı → `BILINMIYOR`, PASIF değil (ölçülmemiş şey hakkında hüküm yok).

**KURU KOŞUM (canlı):** `kanalda bulunan 51/51` — defterdeki `channelSku` ile
N11 `stockCode`u AYNI; **51 satırın 51'i değişecek** (bugün hepsi BILINMIYOR).
⚠ **Ve 62 listeleme defterde HİÇ YOK** — N11'de satışta olup kanal SKU kaydı
açılmamış ürünler; tarife bağsızlarının kökü de bu.

Üçlü kalıp HB'nin aynası: `lib/kanal-listeleme-n11` (saf) ·
`canli-n11-listeleme-yaz` (tarayıcı, yalnız GET, hesap kimlikle) · yazıcı
ortak (`izAdi` parametresi: iz `N11_LISTELEME_YAZIM`, HB'nin izine yazmaz).
Cron `listeleme-cekim` ucuna üçüncü satır olarak girdi. `n11-listeleme:dogrula`
28 ölçüt (çeviri gövde çağrılarak) + `n11-listeleme-mutasyon` harness.

⛔ **YAZIM ELLE KOŞULMADI, BİLEREK.** TY/HB için onaylı mekanizma cron; N11
aynı uca girdi, ilk yazımı o yapacak. Sıfır eşleşmede tarayıcı yazımı kendisi
durdurur (anahtar uyuşmazlığı sessizce "YOK" yazmasın).

- [x] ~~**İlk OTOMATİK koşum (N11)**~~ — **GEÇTİ 22.09 04:50 UTC.** `AuditLog`: `KANAL_KARSILASTIRMA` (TY) · `HB_LISTELEME_YAZIM` yazılan 9 · `N11_LISTELEME_YAZIM` yazılan 0 / istenen 0 (1,5 saat önce elle koşmuştu, değişen yoktu — koştuğu ve karşılaştırdığı izde). Üç kanal, tek cron, aynı dakika. ~~cron `listeleme-cekim` gece koşacak;~~
      `AuditLog action=N11_LISTELEME_YAZIM` **ikinci** kez düşmeli (ilki elle).
      ⭐ **İLK YAZIM ELLE KOŞULDU 22.09.2026** (kullanıcı: _"senkron çalışmalı
      değil mi"_; gecelik mekanizmanın aynısı): 113 listeleme · **109/109
      eşleşti** · 109 satır güncellendi · hata 0. Deftere bakıldı: N11'de
      ölçülmüş **109/109** (sabah 0/51'di) — **ACIK 54 · STOKSUZ 55** (defterden; ilk yazımda tersini yazmıştım, düzeltildi).
      Kanalda var, defterde yok: 4 (katalogda olmayanlar).
- [x] ~~**62 listeleme defterde yok**~~ — **58'İ AÇILDI 22.09.2026 03:21** (kullanıcı onayı: _"bağla tabi"_). Kuru koşum → `--uygula`: 58 eşleştirme, K231 kapısı 0, iz `N11_ESLEME`, yerel görüntü `veri/ozel/n11-esle-2026-09-22T03-21-28-616Z.json`. **Doğrulandı veriden:** N11 kanal SKU 51 → **109**; tekrar kuru koşum 0 açılacak. Geri alma: `--geri --parti=2026-09-22T03:21:28.616Z` (yeniden hesaplanabilir ölçüt; senkron koştuktan sonra ölçülmüş satırı SİLMEZ). Kalan **4 katalogda yok** — ayrı kalem, ürün açmak gerekir. Ölçüm kaydı aşağıda:
      Barkod + stockCode, dört rol, eşdeğerlerle:

          TEK varyanta çözülüyor (bizde VAR, eşlenmemiş)   58
          birden çok varyanta (çakışma)                     0
          hiç çözülmüyor (katalogda YOK)                    4
          62'nin N11'de şu an SATIŞTA olanı                22

      Yani "N11'de bilmediğimiz ürünler" değil — **bizim ürünlerimiz N11'de
      satışta, defter bilmiyor.** Somut risk: o 22'ye sipariş gelince içe
      aktarma kodu tanımaz, satır düşer (tarife bağsızlarının kökü).
      **Öneri:** 58 eşleştirmeyi betikle aç — `channelSku = stockCode`, her
      biri K231 yazma kapısından; kuru koşum → onay → `--uygula`; geri alma
      ölçütü yeniden hesaplanabilir (API'deki 58 kod ∩ N11 hesabı ∩ parti
      damgası). Komisyon oranı ve `externalListingId` YAZILMAZ — ikisinin
      kendi kaynağı var, ikinci kaynak sessiz çakışma üretirdi.
      Katalogda olmayan 4'ü ayrı iş (Shark IZ380 · Hot Wheels · Arzum AR3081 ·
      Shark PX250): ürün açmak gerekir, otomatik yapılmaz.
      Yazıldığında bu uca bir satır eklenir.

⚠ **İKİ BETİK AYNI İŞİ FARKLI BAYRAKLA YAPIYOR** (`--uygula` ve `--yaz`) —
İlke #10'a aykırı. Bu turda DEĞİŞTİRİLMEDİ: bayrak adını çevirmek belgeleri
ve kas hafızasını kırar, ve cron ucu ikisini de `yaz: true` ile çağırdığı
için otomatik koşum bundan etkilenmiyor. Kalem açık.

---

## 🔶 K224 — KANAL LİSTELEME SAĞLIĞI EKRANI · 21.09.2026 · [KOŞTU — HALİL TESTİ BEKLİYOR]

`/kanal-listeleme` — **salt okuma**, kanala hiçbir şey yazmaz.

⛔ **NİYE DOĞDU:** K194-HB (HB'ye stok/fiyat gönderimi) açılacaktı; SIT ortamı
**401** döndü ve çekirdek soru (`stock-uploads` fiyat göndermeden kabul ediyor
mu) yalnız SIT'te ölçülebiliyor. Kullanıcı kararı: yazma beklesin, **okuma
ekranı şimdi yapılsın** — zaten yazmanın GİRDİSİ, neyin güncellenebileceği
bilinmeden gönderim yapılamaz.

⭐ **EKRANIN TEK SORUSU PARA SORUSU** — ölçüldü 21.09.2026, canlı:

    stok var, kanalda KAPALI     27 listing   ₺120.535,46
      ↳ fiyatı bilinmeyen          7          (toplamda YOK, ekranda yazar)
    satışa açık                 398
    stoksuz                    1662
    pasif                       123
    ölçülmemiş                   52          (hüküm YOK — "temiz" değil)

En büyüğü: `OYU-LG-598P-01` · 12 adet · Trendyol · durum **YOK** (hiç
listelenmemiş) · ₺38.040. Sayı = liste sözleşmesi ölçüldü: 27 = 27 ✓.

⚠ **AŞILAN RAKAM — SESSİZCE DEĞİŞTİRİLMEDİ.** İlk ölçüm **₺132.296,46** dedi
(6 fiyatsız); geçerli olan **₺120.535,46** (7 fiyatsız). Fark **₺11.761**, ve
sebebi bir kusurdu: "son satış fiyatı" sorgusu İPTAL EDİLMİŞ ve KALDIRILMIŞ
kalemleri de sayıyordu. `iptal:bekci` ve `kalem-gecerli:dogrula` yakaladı —
ikisi de push kapısında kırmızı yandı. Olmamış bir satışın fiyatı, fiyat
değildir. _(`axcali1664` · ₺10.685 böyle düştü.)_

⛔ **VE ASIL BULGU VERİNİN BAYATLIĞIYDI.** Listeleme durumu 07.09'dan beri
deftere yazılıyordu, **hiçbir ekran göstermiyordu** ve senkronu ÇAĞIRAN da
yoktu:

    Hepsiburada   son ölçüm 07.09  (14 gün bayat)
    Trendyol      son ölçüm 31.08  (21 gün bayat)
    N11           HİÇ ölçülmemiş

Kaydedilen ≠ görünen. İki senkron elle koşuldu (HB 106 satır, TY 1083 satır);
veri artık taze. **Ölçümün YAŞI ekranda yazar** ve 2 günü geçerse sarı yanar —
şemanın kendi şartıydı, tutulmuyordu.

**BEKÇİ:** `kanal-listeleme:dogrula` — 27 ölçüt, hepsi DEĞER testi (kaynak
taramaz, gövdeyi çağırır). 10 mutasyon, 10'u da kırmızı.

⛔ **VE PUSH KAPISI DÖRT BEKÇİYLE DURDURDU — DÖRDÜ DE HAKLIYDI:**
`iptal:bekci` + `kalem-gecerli:dogrula` (iptal/kaldırılmış kalem süzgeci
yoktu — rakamı ₺11.761 şişiriyordu) · `panel:dogrula` (ham Tailwind rengi
kullanmışım, palet jetonu var) · `el-kitabi:dogrula` (menüye ekran eklenip
kitaba yazılmamıştı). El kitabı bölümü `null` ile geçiştirilmedi, YAZILDI.

⛔ **VE İKİNCİ TUR BİR BEKÇİ DAHA DURDURDU — `arama:dogrula`.** Arama koşulunu
ELLE yazmıştım: `barcode` alanında düz `contains`. Bu, UPC-A ↔ EAN-13
eşdeğerliğini bilmiyor — katalogda 12 haneli `194644037598` dururken okuyucu
13 haneli `0194644037598` döndürürse UZUN sorgu KISA alanda bulunamaz ve
ekran susmaz, **yanlış cevap verir** (K100 canlı vakası: Halil `/yerlestir`de
okuttu, "bulunamadı" dedi, baştaki sıfır elle silinince ürün çıktı). Ortak
gövdeye bağlandı (`aramaKosulu` + `kodEsdegerleri`).

⭐ **VE O BEKÇİ İKİNCİ BİR KUSURU AÇIĞA ÇIKARDI:** `q` parametresini
okuyordum ama ekranda **onu girecek kutu YOKTU** — kurulamayan bir süzgeç,
tutulmayan bir sözdür. `KodAramaKutusu` eklendi; kamera da onunla geliyor
(İlke #7).

⚠ **PASİF VARYANT ELENMİYOR, BEYAN EDİLDİ** (`PASİF DAHİL:`) — ve gerekçe
ÖLÇÜLDÜ, varsayılmadı: bir varyantı pasife almak rafı boşaltmaz; stoğu duran
pasif bir varyant hâlâ bağlı paradır ve elenirse EKRANDAN KAYBOLUR. Ayrıca
arama bir süzgeçtir, aradığı SKU'yu bulamayan kullanıcı sistemi bozuk sanır.
Bugünkü etki ölçüldü ve küçük (2258 kanal SKU'sunun 1'i pasif, stoğu yok,
kapalı kovada değil) — karar bugünü değil yarını koruyor.

⭐ **BİR EŞDEĞER MUTASYON GERÇEK BİR EKSİĞİ GÖSTERDİ:** `if (fiyat !== null)
topla` yerine `topla(stok × (fiyat ?? 0))` yazan mutasyon YEŞİL kalıyordu ve
bu DOĞRUYDU (`stok × 0` eklemek ile eklememek aynı). Ama `?? 0` biçimi
"ölçtüm, sıfır çıktı" gibi okunur. Fiyatı bilinmeyen satırlar AYRICA sayılıp
ekrana yazıldı — **doğru bir sayı, kapsamı görünmezse yanlış bir hüküm
üretir.** Mutasyon artık eşdeğer değil ve ısırıyor.

### AÇIK — HALİL TESTİ
- [ ] `/kanal-listeleme` gerçek cihazda AÇILIYOR mu (bekçi yeşili ekranın
      çizildiğini kanıtlamaz)
- [ ] İlk kutudaki **27 / ₺120.535,46** — "aç"a basınca gelen liste **27
      satır** mı
- [ ] `OYU-LG-598P-01` gerçekten Trendyol'da listelenmemiş mi (kanal panelinden)
- [ ] Telefonda kartlar okunuyor mu, kod kopyalama çalışıyor mu

### AÇIK — SONRAKİ ADIMLAR
1. ~~⛔ **SENKRON ZAMANLANMIŞ DEĞİL.**~~ → **ZAMANLANDI 21.09.2026 (K225):** `listeleme-cekim` cron + GitHub yedek iş; 22.09'dan itibaren N11 de aynı uçta. Bu satır 19.09'dan kalmaydı — bayat bir "açık" okuyanı olmayan bir işe yollardı.
2. ~~**N11 listeleme senkronu YOK**~~ → **YAZILDI 22.09.2026** (K225-②): 51/51 eşleşti, cron'a girdi; ilk otomatik koşum bekleniyor. Yeni açık: 62 listeleme defterde yok.
3. **K194-HB SIT 401'de bekliyor** — kullanıcı HB'den SIT erişimini
   yeniletecek. Ölçülenler orada duruyor (`shippingProfileName` 2202/2202
   dolu, kargo firması alanı yalnız 253'ünde — kargo eşleştirme kuralından
   kaçılabilir).
4. **Kanal fiyatı defterde YOK.** Tutar SON SATIŞ fiyatından türetiliyor ve
   ekranda öyle yazıyor. Şema merdiveni inildi; sütun açmak gerekmedi.

---

## 🔶 K222/K223 — TRENDYOL HAKEDİŞ TURU · 20-21.09.2026 · [KOŞTU — HALİL TESTİ BEKLİYOR]

Bir günde üç ayrı kusur ölçüldü ve düzeltildi. **Üçü de canlıda; hiçbiri
henüz gerçek kullanımda doğrulanmadı — paket bu yüzden AÇIK.**

**① GELECEK ÖDEME BRÜT GÖSTERİLİYORDU (K222-⑨).** TY `/settlements` gelecek
ödemede yalnız Satış/Kupon/İade veriyor; kargo · platform hizmet · stopaj
ÖDEME ANINDA doğuyor. Ekran TY'nin kendi rakamından sürekli yüksekti.
Artık kendi kesinti tahminimiz düşülüyor ve **brüt de kesinti de ekranda
yazıyor** (para rakamı tabanıyla taşınır).

    21.09 · TY · 46 kalem
      ₺90.721,41   ← TY'nin kendi ekranı ₺90.739 diyordu (18 TL)
      brüt ₺96.918,39 − tahmini kesinti ₺6.196,98
    ortalama sapma 7.860 → 3.340

⚠ **KALAN SAPMA KAPATILAMAZ VE ÖYLE YAZILDI:** TY kargo faturasını ödemelere
DÜZENSİZ bindiriyor (24.09'da ₺8.703, 21.09'da ₺6.179). Rakam TAHMİNDİR.

**② ÖDEME GÜNÜ VADEDEN YAZILIYORDU (K223).** `ty-api-oku.ts` vade ile ödeme
gününü AYNI alandan (`paymentDate`) okuyordu ve dosyanın kendi yorumu
_"`paymentDate` bu durumda gerçek ödeme günüdür"_ diyordu. **Çürütüldü:**

    emir 76313675 · 112 kalem · ₺205.691,63
      GERÇEK    2026-08-11 (TEK gün, PaymentOrder kaydı)
      defterde  10·11·17·18·19·20·22·23·24·25 Ağu + 3 Eyl

Bir ödeme emri = BİR gün. 91 emrin 91'i de yanlıştı. Gerçek gün
`/otherfinancials?transactionType=PaymentOrder` kaydında; o kayıtlar KALEM
OLARAK YAZILMAZ (emrin toplamını taşır), yalnız tarihi için okunur.
**Gün bilinmiyorsa kalem ödenmiş yazılmaz** — vade uydurulmaz.

**③ GEÇMİŞ ONARILDI (K223-②).** Kaynak %100 mevcut olduğu için geçmiş de
düzeltildi: **4486 kalem · 91 emir.** Ölçüldü — geçmiş ödeme grupları
**118/118 tek güne düşüyor** (önceden 27). Son 8 TY ödemesi artık
17.09 · 14.09 · 10.09 · 07.09 …; defterde 20.09 · 16.09 · 13.09 · 09.09 yazıyordu.
Geri alma: `npm run canli:ty-odeme-gunu-onar -- --geri` (yerel anlık
görüntüden; iz TEŞHİS için, geri alma listeye BAĞLI DEĞİL).

**BEKÇİ:** `ty-api-oku.ts` bugüne kadar **hiç sınanmamıştı** — yanlış iddianın
ayakta kalma sebebi buydu. `hakedis:dogrula` 8. bölüm eklendi (146 ölçüt).
Mutasyon: 13 senaryo, 13'ü de kırmızı.

⭐ **İKİ KAPI AYRI İZOLE EDİLDİ:** "ödenmemiş kaleme gün yazılmasın" kuralını
iki kapı koruyordu ve biri ötekini gizliyordu — okuyucu kapısını kaldıran
mutasyon **YEŞİL KAÇTI**, çünkü harita zaten `"null"` anahtarını tutmuyor.
Her kapı ÖTEKİNİ BYPASS EDEN örnekle sınandı; ikinci turda kırmızı yandı.

⛔ **VE BİR HATAM PANOYA YAZILIYOR:** onarımın ilk koşumunda gün ölçütünü
**UTC'de** kurmuşum, ekran **İstanbul** gününde gruplar. `2026-07-27T21:30Z`
damgalı iki kalem UTC'de hedefle aynı gündü, İstanbul'da 28 Temmuz'du;
"zaten doğru" sayılıp atlandılar ve 5 emir iki güne yayılmış kaldı. Ölçüt
İstanbul'a çevrildi, 7 kalem ikinci koşumda düzeldi. Betik tekrar-koşulabilir
tasarlandığı için bedelsiz oldu — **(b) şartının niye var olduğunun kanıtı.**

### AÇIK — HALİL TESTİ

- [ ] **21.09 ödemesi bugün düştü.** Bankadaki GERÇEK tutar ile ekrandaki
      ₺90.721,41 karşılaştırılacak. _Bu tek ölçüm hem kesinti tahminini hem
      ödeme gününü birden sınar._
- [ ] ⛔ **DÜŞTÜ 22.09 (#13):** kullanıcı: _"çalışmıyor, karma karışık orası."_
      **VERİ ÖLÇÜLDÜ (22.09, sayfanın kendi gruplamasıyla):** 7705 kalem →
      **122 satır** = TY 92 (ödeme emri başına bir, **hiçbiri iki güne
      bölünmüyor**) + HB 30 (emir numarası yok → gün kovası). Son satırlar
      bankayla tutuyor (21.09 TY ₺90.739,15 · 17.09 ₺42.233,41). Yani "karma
      karışık" olan VERİ değil, büyük ihtimalle GÖRÜNÜM — HB'nin 129 kalemlik
      gün satırları TY'nin emirleriyle iç içe, emir numarasız. Görüntü gelince
      hangisi olduğu belli olacak.
      Ne gördüğü henüz belli değil — ekran görüntüsü istendi. Bilinen
      şüpheli: gelecek ödemeler bir ödeme emrini iki tarihe bölüyor (TY
      tahmini ₺6.197,07 eksik). Sayfa `paymentOrderId` ile grupluyor
      (`hakedis/page.tsx:389-444`); görüntü gelince ölçülecek.
      TY panelindekiyle aynı mı?
- [ ] `/nakit-takvimi`: geçmiş ödemeler artık günlere dağılmıyor mu?

### AÇIK — SONRAKİ KANAL

⚠ `gelecekOdemeBrutMu` yalnız **Trendyol**'a `true` dönüyor; HB ölçüldü ve
düşülmemesi doğru. **N11 hakedişi çekilmeye başladığı gün** o kanal brüt
görünecek ve bugünkü hatanın aynısını yaşayacak. Açılış şartı budur.
N11 ödeme günü YÖNÜ de ölçülmedi (kodda beyanlı: varsayılan İLERİ).

---

## 💤 K212-② — ÜRÜN ANALİZİNDE OTOMATİK MEVSİM ÖNERİSİ · 11.09.2026 · [UYUR — açılış şartlı]

K212'nin ana kısmı (arama, favori/incelenecek, mevsim sekmesi, filtre paneli)
19.09.2026'da Halil testini geçip kapandı (bkz. ARSIV.md). Otomatik mevsim
ÖNERİSİ bilerek yazılmadı: canlıda ölçüldü, ürünlerin %79'u yalnız 1-2 farklı
ayda satılmış — örneklem küçüklüğü gerçek mevsimsellikle karışıyor; en az 4
farklı ayda satılmış 163 üründe dağılım düz/rastgele çıktı, net sinyal yok.

**Açılış şartı:** örneklem büyüdükçe (daha çok ürün 4+ farklı ayda satıldıkça)
yeniden ölçülecek. Bugün yapılacak bir iş yok.

---

## 🔶 K206 — `/api/yedek/otomatik`: BLOB DEPOSU ASKIYA ALINMIŞ · 10.09.2026 · [ARA ÖNLEM KOŞTU — ASIL SEBEP AÇIK]

K205 sırasında (ARSIV.md) rastlantısal bulundu, KENDİSİYLE İLGİSİZ:
canlıda `curl` ile test edilince `"Error: Vercel Blob: This store has
been suspended."` döndü. `list()` yasağı hâlâ temiz (`yedek:dogrula`
ölçtü) — bugünkü kod bunu tetiklemiyor; K192'nin (08.09.2026) eski bir
kalıntısı ya da yeni bir sebep olabilir, **henüz ölçülmedi, sebep
uydurulmadı.**

⛔ **KULLANICI BULDU: HEM OTOMATİK HEM ELLE YEDEK ÇALIŞMIYORDU.** İkisi de
aynı `gunlukYedekYaz()`'ı çağırıp aynı Blob deposuna yazıyor
(`yedek-al-actions.ts`'in kendi yorumu: "kopya mantık yok") — depo
askıdayken ikisi de aynı anda düştü.

### ARA ÖNLEM — "HEM YEREL HEM BLOB" (kullanıcı kararı 10.09.2026)

⛔ **VERCEL'DE (ÜRETİMDE) KALICI DİSK YOK** — bu yüzden "yerel" seçeneği
Vercel'deki otomatik/elle düğmeye uygulanamaz, yalnız **bilgisayardan
koşan** bir yol anlamına gelir. Mevcut `canli-yedek-dosya.ts` (K119b,
31.08.2026'daki İLK Blob askısından kalma) tam bunu yapıyor: canlıdan
SALT OKUR, yerel diske yazar, geri okuyup **doğrular** (boyut · JSON ·
kayıt sayıları · rastgele 5 kayıt alan alan).

**Yeni görev: `Selliora Yerel Yedek`** (`scripts/yerel-yedek-al.cmd`,
`kanal-sik-cekim.cmd` ile aynı desen — klondan koşar). Günde bir (03:00,
orijinal Vercel yedeğiyle aynı sıklık). İlk koşum elle doğrulandı:

    47.107.394 B · StockMovement 14961=14961 · Sale 7976=7976 ·
    Purchase 2075=2075 · ProductVariant 1851=1851 · 5/5 alan birebir

Dosyalar `C:\Users\yapra\Desktop\axcali-operasyon\veri\yedek-yerel\`
altında (klonun kendi kopyası — dev ağacındaki `veri/yedek-yerel/`den
AYRI).

⚠ **BU BİR NİHAİ ÇÖZÜM DEĞİL, TEK NOKTA GÜVENCESİ.** Yerel disk de
tek nokta arızası taşır (bilgisayar bozulursa). Blob düzelince bu görev
**kaldırılmaz** — iki hedef birden (yerel + uzak) tutmak daha güvenli.

📋 **AÇILIŞ ŞARTI (asıl sebep hâlâ açık):** Vercel Blob panelinden askı
sebebi görülüp (kota mı, elle mi, ödeme mi) karar verilecek.

---

## 🔶 K201 — N11 KARGO MALİYETİ: TAHMİN AYRI SÜTUNDA · 09.09.2026 · [KOD KOŞTU]

> **Mimar kararı 09.09 — YOL 3, Yol 1 DEĞİL:** `cargoAmount` "kanalın
> GERÇEKLEŞEN kesintisi"dir; N11 tahminini oraya yazmak alanın anlamını
> KİRLETİR ve bekçiyi deler. `kanalKargoDesi` kararının birebir kardeşi.

**MIGRATION CANLIDA:** `Sale.tahminiKargo Decimal?(18,4)`
(ön şart: yedek 87.552 satır yazıldı+geri okundu · şema `.bak`)

### KAYNAK SIRALARI — İKİSİ DE TEK GÖVDEDE

    TUTAR  cargoAmount (GERÇEKLEŞEN) → tahminiKargo (TAHMİNİ) → YOK
    DESİ   kanalKargoDesi (tartım) → cargoDesi (ürüne-özel) → küresel

⛔ **ÜZERİNE YAZMA YOK:** hakediş gelince gerçekleşen DEVRALIR, tahmin
YERİNDE kalır. Silinseydi _"ne kadar yanılmışız"_ bir daha sorulamazdı — ve
o soru, tahmini iyileştirmenin tek yolu.

### ⭐ ARA BASAMAĞI ÖLÇÜM YAKALADI

İlk sıra "tartım → küresel ortalama" idi. Ölçüm:

    N11 ürünlerinin TY/HB'de tartılmış olanı   0/10   ← öğrenme HİÇ çalışmıyor
    N11 satışlarında ürüne-özel tahmin DOLU   10/10   ← elimizde ve kullanılmıyordu

Küresel sayı **EN SONA** kondu: "ürün hakkında hiçbir şey bilinmiyor" bir
SON ÇAREDİR, ilk tercih değil.

### 📏 KÜRESEL SAYI: ORTANCA (3), ORTALAMA (4,04) DEĞİL

    n=57 · min 1 · ortanca 3 · ORTALAMA 4,04 · max 19 · oran 1,345

Dağılım kuyruklu ve **seçim sonucu değiştiriyor** — bu yüzden sessiz
seçilmedi, kullanıcıya soruldu. Tek 19 desilik gönderi tipik tahmini
şişirmesin. _(Anayasa: "eşiği soruyu soran koyamaz".)_

### ⛔ İKİ BEKÇİ KÖRLÜĞÜ — MUTASYON YAKALADI, İKİSİ DE AYNI KÖKTEN

Kök: **okuma ile yazmayı ayırt edememek.**

**①** _"N11 defterdeki kargo tutarına dokunuyor"_ KAÇTI. Ölçüt yalnız nesne
alanını arıyordu; nokta-eşittir biçimindeki atamayı görmüyordu. Yani
Halil'in şartı **bir sözdizimi biçimi kadar** korunuyordu.
⚠ Ve ilk düzeltme de yetmedi: muafiyet SATIR düzeyindeydi, mutasyon satırı
hem tip anotasyonu hem atama içeriyordu ve **muafiyet gerçek bulguyu iptal
ediyordu.**

**②** _"TY kanal desisini hiç yazmıyor"_ KAÇTI. Çok satırlı bir OKUMA (alan
adı satırda tek başına, değeri sonraki satırda) N11'i "yazan" saydı ve taban
düşmedi.

⭐ **İKİSİNİN DE ÇARESİ AYNI:** ölçüt **yazma çağrısına** bağlandı —
Prisma'nın `create`/`update`/`updateMany` bloklarının İÇİ taranıyor. Okuma,
saf gövdeye geçirme ve `select` artık sayılmıyor.
⚠ Taban KÜME düzeyinde: alım içe aktarması satış yazmaz ve bu "bakamadım"
değil **"bakılacak şey yok"**tur.

### BEKÇİ 17/17 + 57/57 · MUTASYON 7/7 + 15/15 KIRMIZI

### 📋 KALAN

· NET'te tahmini kargonun EKRANDA "tahmini" diye görünmesi (gövde hazır:
  `kargoTahminiMi`) — ekran tarafı yazılmadı
· Şartlı kargo (300 TL altı sabit ücret) · Yurtiçi SMS · başarısız teslimat
  kalemleri tabloya girmedi; beyan edildi

---

## 💤 K195-② — "KAÇ PAKET YOLDA / TESLİM EDİLDİ" KUTUSU · 09.09.2026 · [AYRI KALEM — TASARIM ONAYI BEKLİYOR]

K195'in ana gövdesi (kanal teslim/kargo damgası — `deliveredAt` ·
`kanalKargoFirmasi` · `kargoTakipBaglantisi`) 19.09.2026'da Halil testini
geçip kapandı (bkz. ARSIV.md). **Bu alt kalem bilerek AYRI ve AÇIK
bırakıldı:** üç sütun da yazılıyor ama **hiçbir ekran okumuyor** —
anayasa gereği bu tek başına bir teslim sayılmaz ("altyapı tek başına
teslim değildir").

_Mimar beyanı 09.09.2026:_ **onay HENÜZ VERİLMEDİ.** Altyapı yeterli;
kutunun kendisi ayrı bir tasarım kararı:

    · kutu deseni ne olacak (panel kutusu mu, /satislar süzgeci mi)
    · nereye konacak
    · hangi SAYI yazacak — ve o sayı neye tıklayınca neyi açacak

⚠ **SORULMADAN YAZILMAZ:** İlke #16 gereği bir aksaklık sayısı ekranda
duruyorsa tıklanınca kaynağını açmak zorunda ("sayı = liste"). Kutuyu
tasarlamadan yazmak, adresi olmayan bir rakam üretirdi.

⚠ **KAPSAM SINIRI ŞİMDİDEN BELLİ VE KUTUYA YAZILACAK:** `deliveredAt` bugün
boş doğuyor ve yalnız **bundan sonraki** teslimlerle doluyor. "Teslim
edilmedi" ile "sistem bilmiyor" aynı görünürse kutu yanlış okunur.

---

## 🔶 K194-HB — HB'YE STOK/FİYAT GÖNDERİMİ (ÜÇÜNCÜ KANAL) · 09.09.2026 · [UÇ + GÖVDE RESMİ DOKÜMANDAN OKUNDU — SIT DENEMESİ + YAZMA KODU BEKLİYOR]

⛔ **N11 (K194) VE TY (K169) YAZMA TARAFI KAPANDI (Halil testi geçti,
bkz. ARSIV.md) — YALNIZ HB AÇIK.**

✅ **19.09.2026 — BİRİNCİL KAYNAKTAN OKUNDU (kullanıcı resmî portaldan
"Listeleme Entegrasyonu Önemli Bilgiler" sayfasını birebir yapıştırdı —
WebFetch bu siteye 403/401 ile kapalı, bu yüzden ilk turda yalnız arama
motoru ÖZETLERİNE dayanıyordum; o özetler artık bu birincil kaynakla
DOĞRULANDI/DÜZELTİLDİ).**

⚠ **DÜZELTME — ESKİ İYİMSER SONUÇ TAM DOĞRU DEĞİLDİ.** İlk turda "stok tek
başına, bayat fiyatı ezme riski yok" dedim; bu ikinci elden (arama motoru
özeti) bir gözlemdi. Birincil kaynak şunu söylüyor: _"Bilgilerden;
ProductName, ShippingProfileName ve MaximumPurchasableQuantity haricindeki
TÜM bilgilerin gönderilmesi ZORUNLUDUR."_ — yani `Price`, `AvailableStock`,
`DispatchTime`, `CargoCompany1` gibi alanlar birlikte gönderiliyor gibi
görünüyor; eski "hepsi zorunlu" engel notu tümüyle yanlış olmayabilir.
**Kaynak kendi içinde de belirsiz**: aynı sayfa "price-uploads / stock-uploads
body'de HepsiburadaSku ve MerchantSku tek başına ya da birlikte olabilir"
diyerek bunları AYRI iki uç gibi adlandırıyor, ama örnek gövde ve "tümü
zorunlu" cümlesi TEK BİRLEŞİK bir gövdeyi anlatıyor. **Bu çelişki düz metin
okuyarak çözülmez — SIT'te gerçek bir `stock-uploads` çağrısı `Price`
GÖNDERMEDEN denenip cevap ölçülecek** (aşağıdaki SONRAKİ ADIM).
_(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz".)_

📋 **UÇLAR (adları doğrulandı, tam gövde SIT'te ölçülecek):**

    POST  https://listing-external{-sit}.hepsiburada.com/listings/merchantid/{merchantId}/price-uploads
    POST  https://listing-external{-sit}.hepsiburada.com/listings/merchantid/{merchantId}/stock-uploads
    GET   .../{price|stock}-uploads/id/{id}   ← "Listing Güncelleme İşlem Kontrolü"

    Kimlik: HTTP Basic Auth (aynı Authorization başlığı, hâlâ scripts/hb/istemci.ts'teki gibi)
    Content-Type: application/xml (XML) veya Accept: application/json (JSON) — ikisi de var
    Tek istekte azami 4000 SKU · aynı anda azami 5 BEKLEYEN işlem (aşılırsa reddedilir, hata yok — önce eskisinin bitmesi beklenir)
    x-correlation-id cevap başlığı — 7 gün boyunca destek panelinden sorgulanabilir

**ÖRNEK GÖVDE (XML, dokümandan birebir):**

    <listings>
      <listing>
        <HepsiburadaSku>HBV00000TWKQJ</HepsiburadaSku>
        <MerchantSku>HBV00000TWKQJ_TEST</MerchantSku>
        <ProductName>Brita Intenza + Su Filtresi Kahve Makineleri Için</ProductName>
        <Price>118,97</Price>
        <AvailableStock>9</AvailableStock>
        <DispatchTime>3</DispatchTime>
        <MaximumPurchasableQuantity>0</MaximumPurchasableQuantity>
        <ShippingProfileName>MigratedProfile_…</ShippingProfileName>
      </listing>
    </listings>

⚠ **FİYAT VİRGÜLLE YAZILIR, NOKTAYLA DEĞİL** (`118,97`) — nokta gönderilirse
`InvalidPrice` hatası. `MaximumPurchasableQuantity: 0` = sınırsız.

**CEVAP (yükleme kabul edildiğinde):** `{ id, status: "Done"|"Failed",
createdAt, total, errors, priceValidations[] }`.

✅ **MinLock/MaxLock DOĞRULANDI — GERÇEK ÖRNEK CEVAPLA:**
`priceValidations[]` → `elementNo · hepsiburadaSku · merchantSku ·
type ("MinLock"|"MaxLock") · minPrice · maxPrice · description`.
Kilit açma **ayrı bir uç**: **"Toplu Kilit Kaldırma"**
([doküman](https://developers.hepsiburada.com/hepsiburada/reference/toplu-kilit-kaldırma))
— önerilen aralıkta yeni fiyatla toplu kilit kaldırıp satışa açıyor. Bu alan
ekranda gösterilmek ZORUNDA (kilitlenmiş bir ürünün sessizce satışta
kalmaması = İlke #5).

🆕 **YENİ BULGU — `OutOfPriceRange` — FİYAT SAĞLAMLIK MEKANİZMASI (bilinmiyordu):**
HB, yayındaki fiyatların (en düşük+en yüksek hariç) ortalamasına göre azami
sapma yüzdesi uyguluyor — aşan istek `OutOfPriceRange` hatasıyla reddediliyor:

    0–50 TL     → azami %250     500–2000 TL  → azami %90
    50–100 TL   → azami %150     2000 TL üzeri → azami %80
    100–200 TL  → azami %120
    200–500 TL  → azami %100

Bu **MinLock/MaxLock'tan AYRI** bir kapı — kilit değil doğrudan RED.
Fiyat gönderme ekranı bu bandı önceden hesaplayıp uyarmalı, göndermeden
sonra hata almak yerine.

🆕 **YENİ BULGU — KARGO FİRMASI EŞLEŞTİRME KURALI:** `HepsiJet` ·
`Horoz Lojistik` · `Borusan Lojistik` **TEK BAŞINA CargoCompany1 OLAMAZ** —
yanına `CargoCompany2`'ye "standart" bir firma (Yurtiçi Kargo · Aras Kargo ·
PTT Kargo · MNG Kargo · Sürat Kargo · Ceva Lojistik · UPS · Mağaza Hesabı)
eklenmezse `MissingStandardCargoCompany` hatası döner. **Alternatif:**
`ShippingProfileName` (merchant panelde tanımlı teslimat profili adı) —
CargoCompany alanları yerine TEK bu alan gönderilip gönderilemeyeceği
SIT'te ayrıca ölçülmeli; doğruysa kargo eşleştirme kuralının tamamından
kaçınıp işi ÇOK basitleştirir.

🆕 **YENİ BULGULAR — komşu uçlar (bugün kapsam dışı, ileride lazım olabilir):**
- **Listing Satışa Açma/Kapatma** — fiyat/stok=0 tetiğinden AYRI, doğrudan
  aç/kapa ucu var; açmak için fiyat+stok önceden dolu olmalı.
- **Listing Silme** — satışta olan listing silinemez.
- **ShippingProfileName Listeleme** — merchant paneldeki teslimat
  profillerini okur.
- **Buybox Bilgilerini Listeleme** — rakip fiyat+sıra+kargo süresi döndürüyor
  (azami 10 SKU). Eski ölçüm (21.08.2026, ARSIV.md) "HB fiyat vermiyor
  yalnız sıra veriyor" diyordu — o TOPLU LİSTİNG DIŞA AKTARIMI için doğruydu,
  bu AYRI, dedike bir API. _Buybox otomasyonu kullanıcı kararıyla kapalı
  kalmaya devam ediyor (bkz. ARSIV.md), bu yalnız bir gözlem — K194-HB'nin
  kapsamı değil._

⛔ **HATA KODLARI (dokümandan, ekranda Türkçeye çevrilecek):** `ProductNotFound` ·
`MismatchingSkusSpecified` · `DuplicateHepsiburadaSkuSpecified` ·
`DuplicateMerchantSkuSpecified` · `MissingHeaders` · `InvalidPrice` ·
`InvalidAvailableStock` · `InvalidDispatchTime` ·
`DiscountedListingPriceIncrease` · `MerchantAlreadyListedAgainstProduct` ·
`ListingDeletedRecently` · `ListingFrozen` · `MissingStandardCargoCompany` ·
`OutOfPriceRange` · `restrictedProductBrand` · `InvalidMaximumPurchasableQuantity`.

⛔ **HENÜZ DOĞRULANMADI — YAZMA KODU YAZILMADAN ÖNCE ŞART:**
1. **`stock-uploads`e `Price` GÖNDERMEDEN istek atılırsa ne olur** — kabul mü,
   `MissingHeaders` mi? Bu, K194-HB'nin ÇEKİRDEK sorusu (bayat fiyatı ezme
   riski var mı yok mu) ve yalnız SIT'te ölçülür.
2. `ShippingProfileName` tek başına CargoCompany alanlarının yerini
   tutuyor mu — tutuyorsa kargo eşleştirme kuralının hepsinden kaçınılır.
3. Kimlik zaten `scripts/hb/istemci.ts`te var (`kimlikOku`/`baslikKur`) ama
   o gövde YALNIZ `apiGet` taşıyor (bilerek — "YAZMA UCU TANIMLI DEĞİL").
   Yazma eklenecekse `api:dogrula`nın `hb/istemci` izini bildiği için o
   bekçi GÜNCELLENECEK, susturulmayacak.

**SONRAKİ ADIM:** SIT ortamında (gerçek kimlik zaten `.env.canli`de var)
TEK bir test SKU'suyla küçük, geri alınabilir bir `stock-uploads` denemesi
— gövde biçimi ve zorunlu alanlar SIT cevabından ÖLÇÜLÜR, dokümandan
TAHMİN edilmez. Bu adım + gerçek yazma kodu için kullanıcıdan AYRICA onay
istenecek (K194/K213'teki "önizle→onayla, asla körlemesine toplu"
disipliniyle aynı — bu SIT denemesi bile "önizle" tarafında kalır, CANLIYA
hiçbir şey yazmaz).

_Kaynaklar (19.09.2026, kullanıcı tarafından resmî portaldan yapıştırıldı):_
"Listeleme Entegrasyonu Önemli Bilgiler" (developers.hepsiburada.com) ·
[Toplu Kilit Kaldırma](https://developers.hepsiburada.com/hepsiburada/reference/toplu-kilit-kaldırma) ·
[Listing Tekil Fiyat/Stok Güncelleme (BETA — kullanılmayacak)](https://developers.hepsiburada.com/hepsiburada/reference/listing-tekil-fiyatstok-g%C3%BCncelleme)
— ⚠ **ayrıca elenen iki komşu uç, karıştırılmasın:** "Ürün Bilgisi Gönderme"
(`mpop-sit.hepsiburada.com/product/api/products/import`, katalog/YENİ ürün
girişi) ve "Ürün Güncelleme" (`hbSku`/ad/görsel/desi/barkod METADATA'sı,
fiyat-stok YOK) — ikisi de kullanıcı tarafından denendi, ikisi de bu iş
DEĞİL.

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

## 🔴 KARAR BEKLEYEN — sırada bu var · 19.09.2026

_Bu bölüm 25.08.2026'dan beri güncellenmemişti. Tek kalem **A3 — "pazaryeri
API'si açılsın mı?"** idi ve o karar çoktan verilip uygulandı: K169
(Trendyol yazma, Halil testi geçti), K194 (N11 yazma, Halil testi geçti),
K181/K184 (ürün v2 + Hepsiburada canlı listing), K165 (HB sipariş içe
aktarma) ile pazaryeri API'leri okuma+yazma olarak canlıda çalışıyor
(bkz. ARSIV.md). Kalem bu yüzden çıkarıldı, gerekçesiyle burada kayıtlı —
"bakılmayacak" değil "bakıldı ve bitti."_

**Şu an bekleyen karar yok.**

---

## ⏸ HALİL'E BAĞLI — kod işi kalmadı · 19.09.2026

_H3 ("satışlarımızın ödendiği dosya") bu listeden çıkarıldı: K134 ile
hakediş bağı kuruldu ve eşleşme oranı %9 → %95'e çıktı (bkz. ARSIV.md →
K134). H3'ün bağlı olduğu A3 de kapandı (bkz. yukarıdaki 🔴 KARAR BEKLEYEN
notu)._

| # | İş | Ne gerekiyor |
|---|---|---|
| **H8** | **HB hizmet bedeli — soru değişti** | 🕓 **[BEKLİYOR] eylül ortası HB ekstresi.** Ölçüldü: hesabı kesilmiş 99 siparişin yalnız **14'ünde** ₺12,60 kesilmiş; motorumuz **%100'ünden** kesiyor. Koşul hiçbir dosyada görünmüyor. **Kural DEĞİŞTİRİLMEDİ** — sıfıra çekmek de en az mevcut hâli kadar dayanaksız. Kapanış: 13 HB satışımızın ekstresi düşünce satış satış kıyaslanır. |
| **H10♻** | **RUTİN: her Salı/Cuma tarife dosyasını indir** | ♻ **SÜREKLİ — ERİŞİM AÇILDI 24.08.2026.** Tam dilimli ileri tarife arşivden **inmiyor**; o hafta indirilmezse bir daha elde edilemez. ✅ **SALI DOSYASI GELDİ VE YÜKLENDİ 25.08.2026** — ekrandan, terminalsiz. **Yüklü: 3 pencere, üçü de Trendyol.** ⚠ **BU HAFTAKİ DOSYA 7 GÜNLÜK** (Salı→Salı), öncekiler 4 günlüktü (Cuma→Salı) — dosyanın kendi kolonu da `Tarih aralığı (7 Gün)` diyor. Cuma dosyası yine de **beklenir**: gelmezse kapsam zaten var, gelirse yüklenir.<br><br>⛔ **VE ÖLÇÜM KALICI BİR DELİK BULDU — 72 SAAT.** Gerçek sınırlar (İstanbul, `canli:tarife-yukle` raporundan değil **veritabanından** okundu):<br>`14.08 08:00 → 18.08 07:59` 640 kalem<br>**⛔ 18 · 19 · 20 Ağustos — KAPSAYAN PENCERE YOK**<br>`21.08 08:00 → 25.08 07:59` 672 kalem<br>`25.08 08:00 → 01.09 07:59` 712 kalem<br>**18.08 Salı dosyası hiç indirilmemiş.** O üç günün satışlarında `Fiyat dene` dilim veremez ve komisyon denetimi hüküm kuramaz. Arşivden inmediği için **kapatılamaz** — rutinin niye rutin olduğunun somut kanıtı. ⛔ **BU SATIR 21.09.2026'DA ÇÜRÜDÜ — ESKİ HÂLİ AŞAĞIDA, GEREKÇESİYLE.** Ölçüldü (`npm run canli:tarife-bagi` ② bölümü): **N11 09-21→10-04 · 142 kalem** · **HB 09-16→09-22 · 152 kalem** · **TY 09-15→09-22 · 704 kalem** — **üçü de bugünü kapsıyor.** K226/K227 ile HB ve N11 teklif dosyaları tarife olarak yüklenebiliyor. ⚠ **VE BU BAYATLIK ZARARSIZ DEĞİLDİ:** satırı bugün okuyan biri fiyat denemesine güvenmemeye karar verebilirdi — yani pano yanlış bilgi veriyordu. _Aşılan hâli:_ ~~"HEPSİBURADA TARİFESİ HÂLÂ SIFIR; üç kanal eşit zeminde kıyaslanmıyor"~~ — doğruydu, 21.09'a kadar. ⏰ **VE YARIN İKİ DOSYA DÜŞÜYOR:** TY ve HB pencereleri **22.09'da bitiyor** (TY Salı, HB Çarşamba yayımlar). İnmezse o hafta bir daha elde edilemez — bu satırın altındaki 72 saatlik delik onun kalıcı kanıtı. |
| **H18** | **Melontik ölçütü** | Çapraz teyit için **gerçek** Melontik çıktısı. _Sunumdaki rakamlar demoydu; doğrulanmamış ölçüte göre motor bozulmak üzereydi._ |
| **H25** | **İade süreci — iki ölçüm kaldı** | ✅ **10 GÜNLÜK SAAT KAPANDI:** Aras takibi `(KG)` "yola çıktı 21.08 12:35" ile TY ekranının sayacı **25 saniye** farkla buluştu; rozet `BEYAN → OLCULDU`. 🔻 **Kalan ① KÜÇÜLDÜ 25.08.2026 — ÜÇ SORUNUN İKİSİ CEVAPLANDI `(K)`:** birim **2 İŞ GÜNÜ** (takvim günü değil) · çıpa **KARAR ANI** — _"analizden dönen ürün seçeneklerden biri seçildiğinde"_, kargo kodu DEĞİL. ⚠ İki aday çıpa arasındaki mesafe de ölçeğiyle geldi: seçimden sonra kayıt **~1 saat** "İhtilaflı"da bekleyip aksiyona geçiyor — yani fark **saat**, gün değil (gece yarısını geçerse 1 iş günü eder). ✅ **ÜÇÜNCÜ SORU DA CEVAPLANDI 25.08.2026 `(K)` — ve cevap şıkların hiçbiri değil:** _"iade otomatik olarak MÜŞTERİNİN AÇTIĞI SEÇENEKTEN kapanır; kusurlu üründen açılmışsa ve biz değişim deyip göndermediysek **kusurlu ürün gönderme cezasıyla** kapanır, müşteriye parası yatırılır."_ ⚠ **Sonucu bizim eylemimiz değil MÜŞTERİNİN SEBEBİ belirliyor** — "ceza kesilir" demek eksik olurdu. ⚠ **Beş sayacın EN PAHALISI:** 2 ve 3 dolunca mal yok/para gitti; beşinci dolunca **mal BİZDE kalır, para yine gider, üstüne ceza biner.** ⛔ **Cezanın KENDİSİ ölçülmedi** (hangi sebep hangi ceza, tutar ne) — sistem mekanizmayı yazar, rakamı YAZMAZ. ⚠ **ROZET `BEYAN`, `OLCULDU` DEĞİL:** tek kaynak var; §12.2'deki `10 gün` üç bağımsız kaynakla terfi etmişti. ⚠ **KOD TARAFINDA İKİ EKSİK ÖLÇÜLDÜ:** `SAYAC_KURALLARI`nda **birim alanı yok** (öteki dördü takvim günü, hesap `gunEkle`) ve `isGunuEkle` **resmî tatil saymıyor, yalnız hafta sonu**. Şema DEĞİŞMİYOR — çıpa `GECIS_ANI`, sütun `islemSonTarihi`, ikisi de mevcut. ⚠ **KAPSAM AÇIK:** beyan **analiz yolunu** anlatıyor, sayaç `ITIRAZ_KABUL`e gelen **üç yolda** işliyor (`ITIRAZ_ACILDI` · `ITIRAZ_INCELEMEDE` · `ANALIZ`). Gereken (hem (c) hem terfi için): "Reddedilen" sekmesindeki bir iadenin detayı (karar tarihi + kargo kodu + kalan süre aynı ekranda). ⏳ **Kalan ②:** N11 — tecrübe yok, süresiz bekler. |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen · 19.09.2026

_K8/H11 (hakediş eşleştirme) bu listeden çıkarıldı — K134 ile bağ kuruldu,
eşleşme %9 → %95 (bkz. ARSIV.md → K134). H4 (Philips kanal düzeltmesi)
çıkarıldı — kanal-değişince-kâr-tazelenir mekanizması çoktan canlıda ve
onlarca kanal taşımasında doğrulandı._

| # | İş | Durum |
|---|---|---|
| **K112b** | **TY TAM TARAMA — [AÇIK]** | 🕓 33 sayfa listeleme taraması, beş sınıf (A–E) + CSV + ham JSON. İki kez araç sorunundan düştü; sayılar **hâlâ bilinmiyor**. _(K112'nin ① ölçümü ve ② `K112a` panel sütunu 19.09.2026'da arşive taşındı — bu yalnız kalan ③ parçası.)_ |
| **K120** | **TÜKETİM ATAMASINI YENİDEN KURMA — [AÇIK · ŞARTA BAĞLI]** | K91 kapandığında geriye kalan TEK şekil. Kapasiteyi sağlayan bir onarım, satır satır yeniden yönlendirme DEĞİL, **varyant bazında bütün tüketim atamasının yeniden kurulması** olur. ⛔ **BUGÜN AÇILMAZ:** defterin yarısını yeniden yazar; para tarafına dokunmasa da risk/fayda oranı bugünkü ihtiyaca göre kötü — 803 ileri-yiyen bağ geçmiş çıkışların ATFINI etkiliyor, toplamı ve NET-2yi değil. ⭐ **AÇILIŞ ŞARTI: DIŞ TALEP** — bir müşteri ya da muhasebeci **parti bazlı maliyet denetimi** istediğinde. O gün atıf denetlenebilir olmak zorunda kalır ve iş kendini haklı çıkarır. _(Şartsız bekleyen kalem, unutulmuş kalemdir.)_ |
| **K109** | **PANEL GRAFİĞİNDE NOKTA TIKLANINCA RAKAM PENCERESİ · [AÇIK]** | 🕓 **[AÇILDI 31.08.2026]** Kullanıcı: _"buradaki noktalarda üzerine tıklandığında küçük bir pencerede rakamlar görünebilsin."_ Son 12 ay grafiğinde (NET-2 ve ciro çizgileri) nokta başına ay · ciro · NET-2 gösteren küçük bir pencere. ⚠ **ÖLÇÜLECEK:** grafik bugün hangi gövdeden çiziliyor ve dokunma hedefi telefonda 44 px'e çıkarılabiliyor mu (İlke #8) — nokta yarıçapı bugün küçük. Kod yazılmadı.
| **K107** | **MALİYET YÖNTEMİ SEÇENEĞİ (FIFO ↔ hareketli ortalama) · [ERTELENDİ — açılış şartı: İKİNCİ FİRMA]** | 🕓 **[ÖLÇÜLDÜ 31.08.2026, KOD YAZILMADI]** ⚠ **Kimlik notu: kullanıcı bunu `K99` diye açtı ama o kod ALINMIŞTI** (iki farklı "tam yetkili" ölçütü, 30.08) — K107 olarak açıldı. **⛔ KARAR: PAKET 2·3·4 BUGÜN AÇILMIYOR.** _Gerekçe (kullanıcı, 31.08.2026):_ ① canlıda **tek firma** var ve FIFO kullanıyor — ortalama yöntemini bugün kimse kullanmayacak, yani **tüketicisi doğmadan yapı açmak** olurdu (K52 sınıfı: yazıcısı olmayan alan, boş bir vaat); ② `Company` **hiçbir veriye bağlı DEĞİL** (ölçüldü: ilişkileri yalnız `uyelikler` · `auditLogs` · `talepler`), yani _"firma bazında yöntem"_ bugün **"tek firma"** demek — çok-firma katmanı olmadan seçenek **fiilen yok**. ⏭ **AÇILIŞ ŞARTI: ikinci firma kaydı.** O gün paketler **1→2→3→4 sırayla** açılır. 📏 **FİZİBİLİTE ÖLÇÜMÜ (salt okuma, canlı):** **① Dağınıklık YOK — hüküm bu.** Maliyete dokunan 68 dosya var ama _"maliyet nedir"_ sorusunu cevaplayan **TEK gövde**: `src/lib/stok.ts` (`acikPartiler` · `acikPartilerToplu` · `fifoDagit` · `partileriSinirla`). Kalanlar ya onu **çağırıyor** (15 dosya) ya **damgayı okuyor** (32 dosya). Kullanıcının ölçütüyle _"1'e yakınsa iş orta"_ — **1'dir**, yani asıl kod işi görece küçük. **② ASIL MALİYET BEKÇİDE:** `fifo:dogrula` **23** · `parti-bagi:dogrula` **14** · `fifo-sinir:dogrula` **19** ölçüt ortalama yönteminde **tamamen anlamsızlaşır** (toplam **56**); ayrıca 8 bekçide **63 ölçüt** daha parti/FIFO/maliyet/damga değiyor → **~119 ölçüt etkilenir.** ⭐ **VE BEKÇİ YÖNTEMİ KARARA BAĞLANDI (kullanıcı, 31.08):** 119 ölçütü **tek tek şartlandırmak DEĞİL**, bekçi turunu **İKİ KÜMEYE ayırmak** — FIFO bekçileri yalnız FIFO firmasında koşar. _(Öneri olarak kayıtta; o gün ölçülüp kesinleşir.)_ **③ HAREKET YAPISI — beklenenden İYİ:** `StockMovement.unitCostAmount` **zaten var ve zaten dolu** (şemadaki yorumu bile _"ileride stok değerlemesi için saklanır"_ diyor). Canlı ölçüm: 10.774 hareket · giriş 4694/**4689 damgalı** · çıkış 6080/**6074 damgalı**. Ortalama yönteminde `SALE_OUT` damgası hareket anındaki hareketli ortalamadan gelir — **damga için yeni alan GEREKMİYOR.** ⛔ **AMA `sourceMovementId` SORUN:** bugün çıkışların **6080/6080'i (%100)** partiye bağlı; ortalama yönteminde parti kavramı yok → alan boş kalır → `parti-bagi:dogrula` **her ortalama-firmada her harekette** kırmızı yanar. **④ ŞEMA:** merdiven inildi — damga için ① mevcut alan **yeterli** ✓; yöntem ayarı için ①✗ ②✗ (menuDuzeni menünündür, overload olur) ③✗ → **2 sütun/tablo**: `Company.maliyetYontemi` + dönem kaydı. **⑤ ÖNERİ: HAREKETLİ ortalama** — basit ortalama dönem sonu ister ve **üç şeyi birden kırar**: fiyat denemesi anlık maliyet istiyor · NET satış anında snapshot'lanıyor · dönem içinde her satış `NO_COST` damgalanırdı (anayasa: _"bilinmeyen sıfıra çevrilmez"_). Sistem her hareketi sıralı tuttuğu için hareketli ortalama **hesaplanabilir** (teyit edildi). **⑦ LOT TAKİBİ TANITIMDA VAAT EDİLEBİLİR ✅** — parti alanları `hareketId · occurredAt · girenAdet · kalanAdet · birimMaliyet · paraBirimi · locationId`; satış→parti sorgusu **%100 dolu**; parti kodu ürün kartında görünür (`ALM-HB-260821-13`, tedarikçi ve giriş tarihiyle). Tanıtım metni buna göre güçlendirildi (**raf** izlenebilirliği eklendi). ⛔ **LIFO KAPSAM DIŞI:** ölçülmedi, tartışılmadı, şemaya konmadı. _Gerekçe:_ VUK ve TMS 2'de **yasak**; sisteme koymak kullanılamayacak bir yöntemi taşımak ve **her bekçiye üçüncü bir şart** eklemek olurdu. |
| **K98** | **HATA EKRANI KİMİN HATASI OLDUĞUNU SÖYLEMİYORDU · [HALİL TESTİ: A GEÇTİ · B AÇIK]** | ⏳ **[YAZILDI + BEKÇİSİ KOŞTU 30.08.2026]** Barındırma kesintisinde Halil `A server error occurred. ERROR 800923320` gördü; ekran kimin hatası olduğunu söylemiyordu — operatör "ben mi bozdum, sistem mi çöktü" diye bilemeyince çalışmayı bırakıyor _(İlke #5)_. ⛔ **SEBEP YAZILAMAZDI:** hata sınırına düşen `Error` üretimde yalnız `digest` taşır, mesajı taşımaz — _"veritabanına bağlanılamıyor"_ yazmak sistemin bilmediği şey hakkında iddia kurmak olurdu. ⭐ **ÇARE: EKRAN SORAR.** `SELECT 1` sondası (`src/app/hata-sondasi.ts`, salt okuma) veritabanına ulaşılıp ulaşılamadığını ÖLÇER; ekran ölçtüğünü söyler. Dört hâl AYRI tutuldu ve üçü farklı işe yol açıyor: `VERITABANI_YOK` (sağlayıcıya bakılır) · `SUNUCUYA_ULASILAMADI` (beklenir) · `SUNUCU_HATASI` (kod iletilir) · `KONTROL_EDILIYOR`. ⚠ **SONDA YETKİ İSTEMİYOR VE BU BİLİNÇLİ:** 30.08'de düşen tam da **giriş ekranıydı** (korumalı rotalar 307, çizilen tek sayfa `/giris` 500). `yetkiIste` çağırsaydı veritabanı çöktüğünde sonda da çöker, yani tam gerektiği anda susardı. Sızdırdığı bilgi ÖLÇÜLDÜ: dönen tek şey `true`/`false`. Muafiyet `yetki-dogrula.ts`e **gerekçesiyle** beyan edildi. ⚠ **`global-error.tsx` KÖK YERLEŞİMİN YERİNE GEÇİYOR**, yani `NextIntlClientProvider` düşmüş oluyor — oraya konacak bir `useTranslations` tam da her şeyin yandığı anda hata ekranının KENDİSİNİ düşürürdü. Metin yine de koda gömülmedi: `lib/hata/metinler.ts` sözlükten doğrudan okuyor. ✅ **BEKÇİ: `hata:dogrula` · 60 ölçüt · 6 bölüm (tur 66 → 68 doğrulama: bekçi + mutasyon harness'i)** — §1–§3 saf gövdeleri ÇAĞIRIP değer sınıyor (desen aranmıyor), kaynak taraması yalnız çizim/sunucu eylemi için ve YORUMSUZ kodda, kullanım bloğuna daraltılmış; pencereler kapanış işaretiyle ÖLÇÜLÜYOR. Bölüm sayacı var _(K93 şablonu)_. ✅ **MUTASYON: `hata-mutasyon:kontrol` · 17/17 yakalandı** (− kaldıran 11 · + fazladan 6). En kritik ikisi: `useTranslations`ı global-error'a KOYAN mutasyon ve `if (!iptal) setSonda({durum:"CEVAPSIZ"})` koşulunu `if (false)` yapan mutasyon (desen dosyada kalıyor, dal hiç çizilmiyor — deponun en sık yalancı yeşili). ⚠ **VE HARNESS'İN KENDİSİ KUSURLU ÇIKTI:** devralınan kapı 2 (`diskten.includes(bul)`) **EKLEYEN** mutasyonlarda yanlış alarm veriyor — bir satırın ÜSTÜNE ekleyen mutasyonda eski satır zaten yerinde kalır. İki `FAZLADAN` mutasyonu bu yüzden "ölçülemedi" düştü. **Kolay çare onları SİLMEK olurdu, yani "yanlış yanma" yönünü tamamen korumasız bırakmak.** Kapı tam eşitliğe (`diskten !== mutant`) çevrildi ve **üç harness'in üçünde de** düzeltildi _(kararın kapsamı uygulandığı yerle sınırlı sayılmaz)_; öteki ikisinde bugün ısırmadığı ÖLÇÜLDÜ (21 ve 9 çiftin 0'ı ekleyen). ✅ **DENEME ROTASI AÇILDI (kullanıcı kararı 30.08.2026, (A) seçeneği):** `/sistem/hata-denemesi` — **K98 testi için açıldı, ÜRETİM ÖZELLİĞİ DEĞİL.** Menüye konmadı; adresi Halil test listesinde. Sayfa hiçbir şey yazmaz, yalnız hata atar; `SUNUCU_HATASI` yolu böylece gerçek cihazda görülebiliyor. ⛔ **KAPI: yalnız TAM YETKİLİ rol; başka rol 404 alır** — "yetkiniz yok" bile denmez, rotanın VARLIĞI sızmaz. Ölçüt **izin kümesi**, rol adı değil (`tamYetkiliMi`, saf gövde). ⚠ **VE TABAN ÖLÇÜLEREK SEÇİLDİ:** `TUM_IZINLER` denseydi canlıdaki **CEO** rolü kapıdan geçemez, Halil **404** alırdı — sağlayıcı izinleri (`saglayici: true`) firma rollerine otomatik dağıtılmıyor (`otomatikDagitilacak` onları eliyor), yani sonradan doğmuş bir sağlayıcı izni CEO'da olmayabilir. Taban `FIRMA_IZINLERI` seçildi: bekçinin ve seed'in tabanıyla AYNI. Bekçide bu senaryonun kendi ölçütü var ("sağlayıcı izni OLMAYAN tam yetkili rol de geçer — CEO vakası"). ✅ **BEKÇİ 60 → 71 ölçüt / 6 → 7 bölüm · MUTASYON 17 → 24 (15 kaldıran · 9 fazladan).** §7'nin yedi mutasyonu ayrı ayrı kırmızı yandı ve GÖRÜLDÜ: kapıyı SİLEN · kapı ile hatanın YER DEĞİŞTİRDİĞİ (ikisi de dosyada durur, varlık ölçütleri yeşil kalır — sırayı ölçen kontrol yakaladı) · ret dalını `if (false)` yapan · ölçütü `every → some` gevşeten · yetki tabanını BOŞALTAN · hatayı atmayan · sayfaya `prisma` sokan. ✅ **HALİL TESTİ KOŞTU 30.08.2026 — CANLI ADRES, GERÇEK CİHAZ.** `axc-seven.vercel.app/sistem/hata-denemesi`. **Masaüstü:** rota açıldı (CEO 404 almadı) · başlık _"Bu ekran çizilemedi"_ + turuncu üçgen · ölçülen durum **birebir** _"Veritabanı çalışıyor; hata bu ekranın kendisinde."_ · ne-yapmalı satırı birebir · `Hata kodu: 503434463` · **"Tekrar dene" → aynı ekran, AYNI kod** (digest hatadan türetiliyor; değişmemesi doğrusu — gerçek arızada değişmesi ya da ekranın açılması beklenirdi) · ham hata mesajı ekranda YOK. **Telefon:** giriş yapıldıktan sonra ekran düzgün çizildi, "Tekrar dene" çalıştı. ⚠ **VE RAPORUM DÜZELTİLDİ — DENEME ROTASI SAYFA SINIRINI SINIYOR, KÖK SINIRI DEĞİL.** Ekran görüntüsünde **sol menü duruyor**, yani devreye giren `src/app/error.tsx`; kök yerleşim ayakta. Oysa 30.08 vakası tam da kök yerleşimin düşmesiydi (yerleşim oturum için veritabanına gidiyor, düşüyor, `/giris` 500 veriyor) — yani `global-error.tsx` **hâlâ gerçek cihazda görülmedi.** Dünkü rapor "SUNUCU_HATASI yolu sınandı" diyordu; doğrusu **"sayfa sınırındaki SUNUCU_HATASI yolu"**. ✅ **B4 GEÇTİ — VE İKİNCİ KAPIYI GÖSTERDİ.** Telefondan oturumsuz girilince **giriş ekranı** çıktı, 404 değil: istek `src/proxy.ts`te (Next 16'da `middleware.ts`in yerine geçen dosya) durdu, sayfa hiç koşmadı. Kapı iki katmanlı ve **ikisi ayrı ayrı sınanır**: ① oturum yok → `/giris` (proxy, varsayılan KAPALI) · ② oturum var + izin eksik → **404** (`sayfaTamYetki`). ⏭ **KAPANMADI — DÖRT YOL AÇIK:** ① **B testi** (kısıtlı ROL → 404) — Operasyon rolünde kullanıcı gerekiyor, ikinci katman hâlâ gerçek cihazda sınanmadı · ② `global-error.tsx` kök sınırı · ③ `VERITABANI_YOK` · ④ `SUNUCUYA_ULASILAMADI`. Son üçü emirle tetiklenemiyor; **gerçek kesintide doğrulanacak**. Tetiklenemeyen yolu "geçti" saymak testi değil raporu düzeltmek olurdu. ⏭ **KONTROLLÜ TETİK YOLU AÇILSIN MI (kök sınır için) — KARAR AÇIK:** anayasa _"ekran tetiklenemiyorsa tetikleyecek yol açılır"_ diyor, ama bunun bedeli **kök yerleşime dokunmak**: kapı yanlış kurulursa siteyi düşürür. Ayrı paket, ayrı onay; bugün açılmadı. ⚠ _(Kimlik notu: K97 kullanılmadı — kod dosyalarındaki yorumlar zaten K98 diyor, gap kasıtlı.)_ |
| **K52** | **`SaleItem.commissionTarifeId` — yazıcısı YOK, şema taşımadığı bilgiyi vaat ediyor · [AÇIK — ŞARTLI]** | 🕓 **[AÇILDI 25.08.2026, ÖLÇÜLDÜ]** Şema diyor ki _"bu tarifeden oran snapshot'lamış satış kalemleri"_; **uygulamada sıfır atama var** ve canlıda **0/140 kalem** dolu — kapsanan pencerede duran 31 kalemde de boş. Yani sistem, yaptığını söylediği şeyi hiç yapmıyor. ⚠ **BUGÜN ZARARSIZ ve bu ölçüldü:** oranın kendisi `SaleItem.commissionRate`'te satış anında DONUYOR, doğruluk oradan geliyor; kayıp yalnız **KÖKEN İZİ** — bir oranın hangi tarife penceresinden geldiği. Tarife üzerine yazılabildiği için (aynı pencere ikinci kez yüklenirse kalemler silinip yeniden kuruluyor) köken izi bugün zaten kırılgan. ⚠ **AÇILIŞ ŞARTI:** bir oran itirazı ya da denetim, _"bu oran nereden geldi"_ sorusunu gerçekten sorduğunda. Bugün o soruyu soran yok; olmayan ihtiyaca sütun doldurulmaz. ⚠ **VE ÜÇÜNCÜ SEÇENEK YOK:** ya bağlanır ya kaldırılır — _"dursun, ileride lazım olur"_ bir karar değil, kararın ertelenmesidir. Alan durduğu **her ay yanıltıcılığı artar**: onu boş bırakan gerekçeyi hatırlayan kişi sayısı azalır. Anayasaya madde olarak girdi. _(Kardeşi: K31'de bulunan üç ölü sütun — orada da şema bir şey vaat ediyordu, kod tutmuyordu.)_ |
| **K50** | **RAF MOTORU — 🟡 KİLİT KALKTI, SIRA BEKLİYOR (üç komut birleşti)** | 📦 **ÜÇ KOMUT TEK KALEM.** 25.08'de sırayla geldi: ① _barkodlu raf sistemi_ (`K42-RAF` adıyla — çakışma, K50'ye alındı) ② _raf motoru: kurulum ekranı + esneklik + toplu taşıma_ ③ iki ek: _barkod üretimi sistemin içinde_ ve _etikette barkod + karekod birlikte_. İkinci komut birinciyi **kapsıyor ve düzeltiyor**, o yüzden ayrı kalem açılmadı.  ⚠ **ASIL DÜZELTME — DEPO DÜZENİ ARTIK VERİ, ŞABLON DEĞİL.** İlk komut Halil'den üç sayı istiyordu (koridor · ünite · göz). İkinci komut bunu iptal etti: _"depo düzeni firmadan firmaya değişir; kanal kesinti kuralları nasıl veri olduysa depo düzeni de VERİDİR — firma deposunu kendisi çizer."_ **Yani Halil'e soru sorulmuyor, ekran veriliyor** (`/ayarlar/depo`). Bu, benim _"üç sayıyı bekliyorum"_ dediğim engeli ortadan kaldırdı.  **KAPSAM — yedi başlık:** **①** `/ayarlar/depo`: bölüm ekle (ad serbest, KISALTMASI kurallı — büyük harf/rakam, boşluksuz, Türkçe karaktersiz, barkod-güvenli; ad ↔ kısaltma AYRI alanlar) · bölüme ünite, üniteye göz sayısı (bölüm bölüm farklı olabilir, ünite bazında istisna da) · **göz numarası YERDEN YUKARI, SABİT KURAL — ayar değil**, gerekçesi ekranda yazar (üste kat eklenince etiket sökülmez) · **ÖNİZLEME** (üretilecek kodlar + toplam) · onaysız tek raf yazılmaz. **②** **ETİKET SİSTEMİN İÇİNDE ÜRETİLİR** — SVG + kütüphane, **dış servis/API çağrısı YOK**. Her etikette **üç gösterim, TEK değer**: sol `Code128` (el terminali) · sağ `QR` (telefon) · alt okunabilir yazı (`RAF-A1-3`). ⚠ **QR'a zengin veri KONMAZ** (adres/URL/liste yasak) — iki kod ayrışırsa aynı etiket iki kimlik taşır. A4 toplu basım + **tek raf yeniden basımı**; yeniden basım AYNI kodu çizer (K35 kuralı). Basım izi `AuditLog`a. **③** `/yerlestir` okut-koy: raf okut → ürün okut → onay. Ardışık yerleştirme (tek raf, çok ürün). Konum GÜNCELLEMEDİR; eski→yeni `AuditLog`a. **④** `/paketle` konum doğrulaması (okut-al): _"beklenen rafta mıydı"_ → `AuditLog`, **NÖTR, akış DURMAZ**. Ekranda raf zaten var (K46), değişiklik yalnız iz. **⑤** `/okut` raf modu: `RAF-` önekli kod → o rafa kayıtlı ürün listesi. Başlık **"kayıt"**, "envanter" DEĞİL — adet iddiası yok. **⑥** **TOPLU TAŞIMA:** kaynak raf okut → hedef raf okut → liste + onay → tek harekette. **TEK `AuditLog` kaydı** (ürün başına satır değil), kısmî taşıma işaret kutularıyla. **⑦** **GÖÇ:** mevcut **41 raf** ilk açılışta gösterilir; düzen çizilince göç tablosu (eski ad → yeni kod) **önerilir**. ⚠ **ONAYSIZ TEK AD DEĞİŞMEZ.** 1090 ürünün raf bağı korunur, önce/sonra sayım raporlanır.  ⚠ **ESNEKLİK SINIRLARI — ekranda ve el kitabında da anlatılır:** raf kodu **KİMLİKTİR, KOORDİNAT DEĞİL** (ünite fiziksel taşınırsa sistemde hiçbir şey değişmez; _"rafı taşıdım"_ işlemi YOKTUR — eksiklik değil tasarım) · kapasite artırma = **ekleme**, mevcut kodlara dokunmaz · silme yalnız raf BOŞSA · **kod yeniden düzenleme YOK** (basılı etiket yalanlar, konum geçmişi kopar).  ✅ **İSİMLENDİRME ÇELİŞKİSİ KARARA BAĞLANDI 25.08.2026 — seçenek (a):** elle değişiklik **YALNIZ bölüm adı/kısaltmasında** ("Salon" → `SLN`; kısaltma kurallı: büyük harf/rakam, boşluksuz, TR karaktersiz). **Üretilen raf kodu ŞABLONA KİLİTLİ** (`RAF-<kısaltma><ünite>-<göz>`), elle düzenlenemez — içerikten ad türetme yasağı ve bekçileri aynen geçerli. ⚠ **KISALTMA SONRADAN DEĞİŞMEZ** (kod kalıcılığı): bölümün GÖRÜNEN adı değişebilir, kısaltması değişemez ve **ekran bunu baştan söyler**. _Gerekçe: kısaltma basılı etiketin içinde; değişirse etiket yalan söyler._  **SINIR (V1):** yalnız IZGARA düzeni (bölüm→ünite→göz). Serbest biçim (palet alanı, askı, tipli konum) **V2** — ihtiyaç ölçülünce. Olmayan ihtiyaca genel çözüm yazılmaz.  🧪 **BEKÇİ + MUTASYON (asgari set, komuttan):** şablon dışı kod üretimi · içerik-adlı raf · dolu raf silme · **göz numarasını üstten saydıran AYAR eklenmesi** (sabit kuralın kendisi sınanır) · kod yeniden adlandırma yolu · onaysız toplu taşıma · göç/taşımada ürün bağı kaybı (önce/sonra sayım) · **etiket sayfasında dış adres çağrısı** · **QR içeriği ≠ barkod içeriği**. Her mutasyonun UYGULANDIĞI teyit edilir.  ✅ **KOŞUM KİLİDİ AÇILDI** — API öncesi kapanış **5/5** kapandı (25.08). Bugünkü plan _"bugün başla"_ diyor. ⛔ **AMA ADIM (a) BUGÜN KOŞULAMIYOR:** iki ön ölçüm (raf doluluk + 41 adın biçimi) **canlı veritabanı gerektiriyor** ve yerel betikle bugün **altı kez** bağlanılamadı (`pool timeout`, `active=0` — tek bağlantı bile kurulamıyor). Canlı SİTE çalışıyor, yani veritabanı ayakta; tıkanan bizim yerel yolumuz. **Ölçüm yapılmadan göç tablosu üretilmez.** ─── ⑨ **İKİ RAF DESENİ BİRBİRİNİ TANIMIYORDU — [KAPANDI 01.09.2026]** ⛔ Kullanıcı _"depo düzeninin çalışma prensiplerini bilmediğimiz için çizmedik, kılavuz gerekiyor"_ dedi. Kılavuz yazılmadan ÖNCE ölçüldü ve kılavuzun okuyucuyu **duvara götüreceği** anlaşıldı: `kodSablonaUyuyorMu("RAF-SLN1-2")` **true**, `rafKoduGecerliMi("RAF-SLN1-2")` **FALSE**. Yani `/ayarlar/depo` bir raf üretir üretmez `/ayarlar/konumlar` onu **"biçimsiz"** diye işaretleyecek ve düzenleme formu kaydetmeyi reddedecekti — sadece ADINI değiştirmek isteyen biri duvara çarpardı. ⭐ İki biçim de geçerli oldu; **eski desen kaldırılmadı** (canlıdaki 43 rafın hepsi ona uyuyor ve göç onaylanana kadar yaşayacak), serbest metin hâlâ reddediliyor. **Bekçi `depo:dogrula` 196 → 209 · mutasyon 3/3 KIRMIZI** (şablon kodu reddediliyor · eski kodlar reddediliyor · kapı tamamen açıldı = yanlış yanma). ⏭ **KILAVUZ TESLİM EDİLDİ** — kod anatomisi, üç kavram, değişmeyen beş kural, Türkçe harf tuzağı, bugünkü 43 rafın ölçülmüş tablosu, dört adımlık kurulum, göç, geri alınabilirlik tablosu ve iki bilinen eksik. ⚠ **BİLİNEN EKSİK: etiket basımının izi tutulmuyor** — plan "basım izi kaydedilir" diyordu, kodda yok. | |
| **K41b** | **Barkodsuz iç etiket basılsın mı?** | 🔴 **KARAR HALİL'DE.** Gönderi numarası akışı bunu **BEKLEMİYOR** — pazaryeri etiketiyle çift okutma bugün çalışır durumda. Karar geciktiğinde hiçbir iş durmuyor. _(K35 etiket basımıyla kardeş; orada da açılış şartı yazıcı/etiket kararıydı.)_ |
| **K44** | **`Return` yazıldıktan sonra DÜZENLENEMİYOR** | 🕓 **[AÇILMADI, KAYDA GEÇTİ] 24.08.2026.** Sistemde bir iadeyi düzenleyecek ekran ya da eylem **yok** — `/satislar/[id]/iade/` yalnız YENİ iade oluşturuyor, `return.update` çağıran hiçbir uygulama yolu bulunmuyor. Bugünkü form düzeltmesi (değişim kargosu alanı) **bundan sonraki** iadeleri kapsıyor; geçmiş kayda ulaşamıyor — `11473322212` vaka-bazlı betikle düzeltildi. ⛔ **BUGÜN GEREKÇESİZ:** kargo mutabakatında `(b) eksik bacak = 0` ve `(d)` farkları sistematik yuvarlama çıktı, yani geçmişte düzeltilecek bacak görünmüyor. **Açılış şartı:** geçmiş bir kayda dokunma ihtiyacı doğuran ilk gerçek vaka. _(K39'un kardeşi: orada kapanmış BİLDİRİM düzeltilemiyordu, burada kapanmış İADE.)_ |
| **K45** | **Kargo faturası — düzenli mutabakat** | 🕓 **ARAÇ HAZIR, RUTİN KURULMADI.** `npm run canli:kargo-mutabakat "<fatura.xlsx>"` — salt okuma, kolon bulunamazsa **hata fırlatır** ("0 sapma" demez). İlk koşum (12 satır): (a) 1 · (b) 0 · (c) 8 · (d) 3. **(d)'nin üçü de tam `−0,01`** — bizde `106,75`, faturada `106,76`; `88,96 × 1,20 = 106,752`, biz aşağı TY yukarı yuvarlıyor. **HÜKÜM: sapma değil düzen farkı, iş açılmaz.** ⏭ Rutin hâline getirme kararı, TY'nin fatura yayım ritmi ölçüldükten sonra. |
| **K24** | 🕓 **Alım KDV oranı SNAPSHOT değil** | **AÇIK SINIR, beyan edildi 21.08.2026.** KDV sekmesi çalışıyor ama iki taraf farklı: **satış** oranı `SaleItem.vatRate` ile satış anında DONDURULMUŞ; **alım** oranı ürünün BUGÜNKÜ kategorisinden çözülüyor (`PurchaseItem`de oran alanı yok). Bir kategorinin oranı değişirse **geçmiş alımların KDV'si geriye dönük kayar** ve eski bir dönemin "ödenecek KDV"si bugün başka çıkar. Ekranda yazılı. **Çare:** `PurchaseItem.vatRate` snapshot alanı — şema işi, ayrı karar. ⚠ Bugün risk düşük: 18 kategorinin oranları mevzuata bağlı ve nadir değişir; ama değiştiğinde SESSİZ kayar. |
| **K18** | **Sipariş no çakışması — VERİ DÜZELTMESİ** | ✅ Kod tarafı kapandı (kök sebep: çakışma kontrolü `iptalTarihi`yi süzmüyordu; ayrıntı arşivde). ⏳ **KALAN, HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K32** | **HB "Hurda Geliri" — hakedişte karşılığı yok** | ⛔ **ÖLÇÜLMEDİ, AÇILMADI.** HB'de servis dalı Trendyol'dan farklı bitiyor: HB servisi beklemeden müşteriye parayı iade eder, satıcı tazmin talebi açar, kabul edilirse **HB'ye fatura keser**, ürün HB deposuna gider ve tutar hakedişe **"Hurda Geliri"** olarak düşer. İki eksik: ① iadenin `Compensation` kaydına bağlanması ② hakedişte bu GELİR kaleminin tanınması. ⚠ **Açılış şartı:** hurda gelirinin hakediş dosyasında hangi satır adıyla geldiğinin görülmesi — ölçmeden kalem açmak adını uydurmak olur. |
| **K13c** | **HB'de zararına duran 6 ürün** | 🕓 Bugünkü fiyat + açık parti maliyetiyle NET-2 **negatif**: Philips 5000 10in1 (−46,11) · LEGO 101 Dalmaçyalı (−301,77) · LEGO Endgame (−289,07) · Hogwarts (−25,68) · LEGO "Yukarı Bak" (−291,92) · Hot Wheels Rhino (−58,13). **Fiyat mı yanlış maliyet mi — önce bakılır**, düzeltilmez. |
| **H12/H13** | **Hakediş teyidinde önce bakılacak satışlar** | `11331575354` (i9000 Ultra · 17.06 · **₺12.960** · oran %2,70 · "iade var" rozetli) — **tek başına üçlüden büyük.** Ayrıca `11493262226` · `11492798173` · `11492628481`. |
| **H14** | **Ödeme hizmeti hipotezi** | H2/K8 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı. |

---

## 🕓 ZAMANA / KOŞULA BAĞLI — bugün açılmaz · 19.09.2026

_H20 ("`soldAt` saat taşımıyor") bu listeden çıkarıldı: K163 ile karar
verildi ve uygulandı — TY API çekimi artık `soldAt`e gerçek anı yazıyor
(bkz. ARSIV.md → K163, K195)._

| # | İş | Açılış şartı |
|---|---|---|
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
