# İş ortağı modülü — tasarım belgesi

_K347 · 17.10.2026 · Aşama 1 (tasarım). Bu belge KOD DEĞİLDİR; şema, migration ve ekran
yazılmadı. Kodun açılışı ayrı bir kullanıcı kararıdır (bkz. §0). Her uygulama aşaması ayrı
onayla açılır._

---

## 0. Karar ve sıra

**Kullanıcı isteği 17.10.2026:** _«İş ortağı modülü: sermaye katıp benimle farklı
sorumluluklarla birlikte çalışmak isteyen kişileri bünyeme katmak.»_

**Kullanıcı kararları 17.10.2026 (soru → cevap):**

| Soru | Cevap |
|---|---|
| Ortaklar için sistem neyi takip etsin? | **Hepsi:** sermaye katkıları · kâr payı hesabı · para çekme/ödeme · görev/sorumluluk |
| Ortaklar sisteme kendi kullanıcılarıyla girsin mi? | **Evet, sınırlı yetkiyle** |
| Kâr payı neye göre bölünsün? | _«Bir çok varyasyon üzerinde çalışabilsin sistem.»_ → tek model değil, **kural motoru** (§4) |
| Anayasadaki «yeni büyük faz açılmaz» kuralına takılırsa? | **Tasarım yap, kodu bekle** |

⚠ **SIRA:** anayasa bugün _«tek firma kendi işinde oturur — yeni büyük faz AÇILMAZ»_ diyor.
Bu modül büyük bir iştir (6 yeni tablo, yeni bir yetki kavramı, para hesabı). Bu yüzden bu
belge yalnız tasarımdır; **kod, kullanıcı açılış kararı verince başlar** ve o karar
anayasaya tarihiyle yazılır.

---

## 1. Ölçülen başlangıç durumu

_Ölçüldü 17.10.2026 — kod taraması + canlı veritabanı (salt okuma)._

| Konu | Bugün sistemde | Kaynak |
|---|---|---|
| Sermaye / ortak borcu | **VAR** — «Finansman» modülü: `SERMAYE` · `ORTAK_BORCU` türleri, defter (ledger) gibi çalışır, ters kayıtla düzeltilir | `src/lib/finansman/*`, `/finansman` |
| Ortağın kimliği | **YOK** — finansman kaydında ortak yalnız serbest bir İSİM (`kaynakAdi`); kişi kaydı ve kullanıcı bağı yok | `schema.prisma` → `Finansman` |
| Canlıdaki finansman verisi | 4 kaynak: `UCUNCU_KISI_BORCU` 3 · `ORTAK_BORCU` 1 («Deneme», çeyrek altın, 2 hareket — deneme kaydı) · **`SERMAYE` 0** | canlı, 17.10.2026 |
| Dönem kârı (firma geneli) | **VAR** — «GERÇEK NET» = NET-2 − giderler (KDV hariç) − fire/kayıp + tazminat; para birimleri ayrı, kur çevrilmez | `src/lib/rapor.ts → raporHesapla`, `/rapor` |
| Muhasebe dönemi kapatma | **VAR** (K108) — ay kapatılır/açılır, iz bırakır | `src/lib/muhasebe-donemi.ts` |
| Kapatılmış dönem (canlı) | **0** — hiçbir ay kapatılmamış | canlı, 17.10.2026 |
| Kullanıcı / rol / izin | **VAR** — kullanıcı · rol · 32 izin anahtarı; canlıda 3 aktif kullanıcı, roller CEO(32) · Sahip(32) · Operasyon(12) · Halil(5) | `src/lib/yetki/*` |
| «Yalnız kendi kaydını görsün» (satır bazlı yetki) | **YOK** — yetki EKRAN düzeyinde; tek alan istisnası `satis.kar.gor`. `izinler.ts` başlığı alan izinlerinin çoğalmasına karşı uyarıyor | `src/lib/yetki/izinler.ts:14-21` |
| Kâr payı · ortak cari · para çekme · kasa/banka bakiyesi | **YOK** — `nakit-takvimi.ts:109` «sistem banka/kasa bakiyesi tutmuyor» | tarama |
| İz (AuditLog) | **VAR** — her yazım `izYaz` ile, eklenir-silinmez | `src/lib/iz.ts` |
| Çok-firma | `main`'de iş tabloları `companyId` TAŞIMIYOR; `k303-cok-firma` dalında 52 alan taşıyor | `docs/cok-firma-tasarimi.md` |

**Sonuç:** sermayenin **hareketi** zaten tutuluyor; eksik olan **ortağın kendisi**, ortaklık
**anlaşması**, **kâr payı hesabı** ve **ortak carisi** (ortağa borçlanılan / ortağa ödenen
para). Tasarım Finansman'ın YANINA ikinci bir sermaye defteri açmaz, onu ortağa BAĞLAR.

---

## 2. Kavramlar

| Kavram | Ne demek | Örnek |
|---|---|---|
| **Ortak** | Firmanın bir ortağı — kişi. Sizin kendiniz de bir ortaksınız (paylar ancak böyle %100'e tamamlanır). İsteğe bağlı bir kullanıcıya bağlanır. | «Ahmet Y.» · kullanıcı `ahmet@…` |
| **Sorumluluk** | Ortağın üstlendiği iş alanı — kayıt. Sistemdeki YETKİ'yi rol belirler, sorumluluk yalnız «kim neyden sorumlu»yu yazar. | «Alım», «Depo», «Trendyol hesabı» |
| **Sermaye katkısı** | Ortağın firmaya koyduğu para. Finansman'daki `SERMAYE` kaydı — artık bir ortağa bağlı. | 15.11.2026 · ₺200.000 |
| **Ortaklık anlaşması** | Kârın nasıl bölüneceğini söyleyen kurallar. **Sürümlüdür:** değişince yenisi yazılır, eskisi silinmez; her sürümün geçerlilik başlangıcı vardır. | «01.01.2027'den itibaren: önce emek ücreti, sonra %60/%40» |
| **Kâr dağıtımı** | Bir dönemin kârını anlaşmaya göre ortaklara bölen hesap. Önce TASLAK, kullanıcı onaylayınca KESİNLEŞİR. | Kasım 2026 dağıtımı |
| **Ortak carisi** | Firma ile ortak arasındaki para hesabı: hak edilen kâr payı (+), ödenen para (−), avans/çekim (−). Bakiye = firmanın ortağa borcu. | Ahmet: hak edilen ₺18.000 − ödenen ₺10.000 = ₺8.000 alacaklı |

---

## 3. Sermaye: Finansman'a bağlanır, yeni defter açılmaz

- `Finansman` kaydına isteğe bağlı **`ortakId`** bağı eklenir. `SERMAYE` ve `ORTAK_BORCU`
  türlerinde ekranda ortak SEÇİLİR (serbest isim yerine).
- Ortağın sermaye özeti Finansman hareketlerinden **hesaplanır**, ayrıca saklanmaz:
  koyduğu · ortak borcundan sermayeye mahsup edilen · (iade edilen — bkz. açık soru S5).
- Sermaye **gelir değildir** (Finansman kuralı aynen): ciroya, NET-1/NET-2'ye, KDV'ye,
  GERÇEK NET'e girmez.
- Birim Finansman'daki gibi **veriden** gelir (TRY · EUR · altın…); kur çevrilmez. TL
  karşılığı gerekirse Finansman'ın beyan edilen birim fiyatı kullanılır ve «beyan» diye yazılır.

⚠ **Gün ağırlıklı sermaye** (bkz. §4 kademe C-b) Finansman hareketlerinin TARİHİNDEN
hesaplanır: ayın 20'sinde konan para o ayın kârında 11/30 ağırlık alır. Bu hesap bugünkü
veriden yeniden üretilebilir, ayrıca saklanmaz.

---

## 4. Kâr payı: kural motoru (çok model)

Kullanıcı tek bir model değil, **birçok varyasyon** istedi. Gerçek hayattaki ortaklık
anlaşmalarının hepsi aynı iskelete oturur: kâr **sırayla** dağıtılır — önce sabit haklar,
sonra sermayenin getirisi, kalan da oranlara göre. Bu yüzden anlaşma bir **kademe listesi**
olarak tutulur; motor kademeleri sırayla uygular.

### Kademeler

| Kademe | Ne yapar | Ayar |
|---|---|---|
| **A · Emek ücreti** (sabit ödeme) | Belirli ortağa dönem başına sabit tutar — kârdan ÖNCE | ortak · tutar/ay · para birimi |
| **B · Sermaye getirisi** (öncelikli getiri) | Sermayeye yıllık % getiri, gün ağırlıklı — kalan kârdan | yıllık oran (örn. %20) · hangi ortaklar |
| **C · Kalan kârın paylaşımı** | Kalanı böler | **a) sabit oran** (örn. %60/%40) · **b) sermaye oranı** (gün ağırlıklı) · **c) karma** (örn. kalanın %50'si sermayeye göre, %50'si sabit oranla) |
| **D · Zarar** | Dönem zarar ederse ne olur | **a)** aynı oranlarla paylaşılır · **b)** yalnız sermayedarlara · **c)** devreder: sonraki dönemin kârından ÖNCE kapanır |

Her kademe isteğe bağlıdır. Yalnız C-a seçilirse sonuç düz bir oran paylaşımıdır.

### Kademe sırası ve yetmeyen kâr

- Kâr A'yı karşılamaya yetmezse: A **orantılı kısılır** mı, yoksa eksik kalan kısım
  **ortağa borç olarak devreder** mi? → anlaşmada seçilir (açık soru S3).
- Kademeler yalnız KÂRDAN pay dağıtır; motor **olmayan parayı dağıtmaz.** Kademe toplamı her
  zaman dönem kârına **kuruşuna eşittir** (bekçi bunu değerle sınar).

### Sayısal örnek (Kasım 2026, uydurma rakamlar — yalnız mekanizmayı göstermek için)

Dönem kârı (GERÇEK NET): **₺100.000**. Ortaklar: **Siz** (sermaye ₺300.000, tüm ay) ·
**Ahmet** (sermaye ₺200.000, ayın 16'sında koydu; depo sorumlusu).
Anlaşma: A) Ahmet'e emek ücreti ₺10.000 · B) yok · C-c) kalanın %50'si sermayeye göre, %50'si
sabit %50/%50.

1. **A:** Ahmet ₺10.000 → kalan ₺90.000
2. **Gün ağırlıklı sermaye:** Siz 300.000 × 30/30 = 300.000 · Ahmet 200.000 × 15/30 = 100.000 → oran **%75 / %25**
3. **C-c:** sermaye yarısı ₺45.000 → Siz ₺33.750 · Ahmet ₺11.250 · sabit yarısı ₺45.000 → Siz ₺22.500 · Ahmet ₺22.500
4. **Sonuç:** Siz **₺56.250** · Ahmet **₺43.750** (10.000 + 11.250 + 22.500) · toplam **₺100.000** ✓

### Snapshot (dondurma) kuralı

Dağıtım KESİNLEŞTİĞİNDE şunlar kayda donar: kullanılan anlaşma sürümü · dönem kârı rakamı ·
her ortağın gün ağırlıklı sermayesi · her kademenin sonucu. Anlaşma sonradan değişse eski
dağıtım DEĞİŞMEZ (anayasa: «oran sonradan değişse eski satışın hesabı kaymaz»).

---

## 5. Hangi kâr bölünür

- **Taban: GERÇEK NET** (`raporHesapla`) — giderler düşülmüş firma kârı. NET-2 tek başına
  giderleri düşmez; onu bölmek, ortaklara harcanmış parayı dağıtmak olurdu. (Açık soru S1 — öneri.)
- **Yalnız KAPALI muhasebe dönemi dağıtılır.** Açık ayın kârı hâlâ değişir (iade, geç giren
  satış, gider). Canlıda bugün **hiç kapatılmış dönem yok** — bu modül kullanılmadan önce ay
  kapatma alışkanlığı başlamalıdır; ekran bunu söyler (kapatma ekranına bağlantıyla).
- **Para birimi ayrı:** TRY kârı TRY olarak, EUR kârı EUR olarak bölünür; kur çevrilmez.
- **Dönem yeniden açılırsa** o döneme ait kesinleşmiş dağıtım **«bayat»** işaretlenir ve
  kaynak kâr rakamı değiştiyse ekranda kırmızı yazar. Sessizce yeniden hesaplanmaz — kullanıcı
  iptal + yeniden hesap yapar (iz bırakır). _(Anayasa: «susturma kaydın hâline bağlanır».)_

---

## 6. Ortak carisi: para çekme ve ödeme

Ortak ile firma arasındaki para hesabı **defter (ledger)** olarak tutulur: kayıt silinmez,
düzeltme ters kayıtla yapılır (stok ve Finansman ile aynı disiplin).

| Hareket | Yön (ortağın alacağı) | Kaynak |
|---|---|---|
| `KAR_PAYI` (hak ediş) | **+** | dağıtım kesinleşince kendiliğinden |
| `ODEME` (ortağa ödenen kâr payı) | **−** | kullanıcı girer |
| `AVANS` (dönem kapanmadan çekilen para) | **−** | kullanıcı girer; bakiye eksiye düşebilir (ortak firmaya borçlu) |
| `DUZELTME` | ± | yalnız ters kayıt, gerekçe zorunlu |

- **Bakiye = Σ hareket.** Ekranda: artı → «firma ortağa borçlu», eksi → «ortak firmaya borçlu».
- ⛔ **Ortağa ödenen para GİDER DEĞİLDİR** — NET-2'ye, GERÇEK NET'e girmez (kâr payı kârın
  dağıtımıdır, kârı düşüren bir masraf değil). Emek ücreti kademesi de aynı: kârdan pay,
  gider değil. _(Ortağa maaş bordrosuyla ücret ödeniyorsa o ayrı bir giderdir ve Giderler'e
  girer — açık soru S6.)_
- Sermaye iadesi ortak carisinden DEĞİL Finansman'dan geçer (açık soru S5).
- Vergi: kâr payı stopajı/vergisi bu modülde HESAPLANMAZ (anayasa: «%15 gelir vergisi
  kullanılmıyor» çizgisi). Gerekirse muhasebeciye sorulur (açık soru S7).

---

## 7. Sorumluluk ve yetki

### Sorumluluk
Ortağa bir veya birkaç **sorumluluk** yazılır (serbest liste + öneriler: Alım · Depo ·
Paketleme · Kanal hesabı · Muhasebe). Bu bir KAYITTIR; sistemde ne yapabileceğini rol belirler.

### Ortağın girişi (kullanıcı kararı: sınırlı yetkiyle)
- Ortak, mevcut kullanıcı sistemiyle bir **kullanıcıya** bağlanır ve bir **rol** alır
  (ör. depo sorumlusu → «Operasyon» rolü). Var olan yetki altyapısı aynen kullanılır.
- **Yeni izinler** (iki bacaklı kural: `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN`,
  deploy sonrası `canli:yetki`):
  - `ortak.yonet` — ortakları, anlaşmayı, dağıtımı ve cariyi yönetir (sizin rolünüz)
  - `ortak.hesabim` — ortak YALNIZ kendi hesap özetini görür

### ⚠ «Yalnız kendi kaydı» yeni bir kavramdır
Bugünkü yetki modeli ekran düzeyindedir; satır bazında süzme YOK ve `izinler.ts` buna karşı
bilinçli uyarı taşıyor. Tasarım genel bir satır süzgeci AÇMAZ. Onun yerine **tek bir ekran**
(`/ortak-hesabim`) oturumdaki kullanıcının bağlı olduğu ortağı bulur ve yalnız onu gösterir:
kimlik adresten DEĞİL oturumdan gelir (adres değiştirilerek başkasının hesabı açılamaz).
Bu kapı mutasyonla sınanır (başka ortağın kimliğini adrese yazan deneme 404 almalı).

Ortağın göreceği: kendi sermayesi · kendi kâr payları (her dağıtımın kademe dökümüyle) ·
kendi cari hareketleri ve bakiyesi. **Firma geneli rakamları (dönem kârı, diğer ortakların
payı) görüp görmeyeceği açık soru S4.**

---

## 8. Veri taslağı (şema DEĞİL — migration yazılmadı)

Anayasa merdiveni (_mevcut alan → serbest metin → türetilebilir mi → sütun → tablo_) ile:

| Ne | Karar | Neden |
|---|---|---|
| Ortağın sermayesi | **türetilir** (Finansman hareketleri) | yeni defter açmak iki kaynak yaratırdı |
| Gün ağırlıklı sermaye | **türetilir** | hareket tarihlerinden yeniden üretilebilir |
| `Finansman.ortakId` | **sütun** (isteğe bağlı) | serbest isim kimlik değildir («kimlik varken dizeyle aranmaz») |
| Ortak | **tablo** `Ortak` (ad · `userId?` · aktif · not) | kişi kaydı yok |
| Sorumluluk | **tablo** `OrtakSorumlulugu` (ortak · ad) | ekranda listelenir/süzülür |
| Anlaşma | **tablo** `OrtaklikAnlasmasi` (sürüm · geçerlilik başlangıcı · not) + `AnlasmaKademesi` (sıra · tür · ayarlar) | kademeler SORGULANIR ve sürümlenir |
| Dağıtım | **tablo** `KarDagitimi` (dönem · para birimi · durum TASLAK/KESIN/IPTAL · donmuş girdiler) + `KarDagitimiSatiri` (ortak · kademe · tutar) | bakiye ve geçmiş sorgulanır |
| Cari | **tablo** `OrtakHareketi` (ortak · tür · tutar · para birimi · tarih · ters kayıt bağları) | bakiye = toplam sorgusu |

- Para: her tutar **Decimal + para birimi**; Float yok.
- Tarihler İstanbul günüyle (`src/i18n/ayarlar.ts`).
- **Çok-firma uyumu:** kod açıldığında her yeni tablo `docs/cok-firma-tasarimi.md` §2–§6'ya
  göre `companyId` taşır; benzersizlikler `(companyId, …)`. `main` ile dal arasında hangisinde
  yazılacağı açılış anında karar verilir (anayasa şartı ①: her `main` değişikliği aynı gün dala taşınır).
- Her yazım `izYaz` ile iz bırakır.

---

## 9. Ekranlar (taslak)

| Ekran | İçerik | İzin |
|---|---|---|
| `/ortaklar` | ortak listesi: ad · sorumluluklar · sermaye · cari bakiye · **toplamlar** (İlke #15) · arama (İlke #17) · satırda görünür eylemler (İlke #1) | `ortak.yonet` |
| `/ortaklar/[id]` | ortağın hesap özeti: sermaye hareketleri · kâr payları · cari · «ödeme gir» / «avans gir» | `ortak.yonet` |
| `/ortaklar/anlasma` | anlaşma sürümleri · kademe düzenleyici · **örnek dönemle önizleme** (kademe sonuçları + toplam = kâr kontrolü) | `ortak.yonet` |
| `/ortaklar/dagitim` | kapalı dönem seç → TASLAK hesap (kademe kademe döküm) → onay diyaloğu → KESİN | `ortak.yonet` |
| `/ortak-hesabim` | ortağın KENDİ özeti (§7) | `ortak.hesabim` |

Yıkıcı ya da geri alınamaz her işlem (dağıtımı kesinleştir · iptal · ters kayıt) Türkçe onay
diyaloğu ister (İlke #6). Telefonda kullanılabilir (İlke #8). Metinler sözlükten (i18n).

---

## 10. Aşamalar ve teslim ölçütleri

| Aşama | İş | Kapanış ölçütü |
|---|---|---|
| **0** ✓ | Ölçüm (§1) | bu belge |
| **1** ✓ | Tasarım (bu belge) | kullanıcı açık soruları cevaplar + açılış kararı |
| **2** | Ortak kaydı + sorumluluk + Finansman bağı (`ortakId`) + `/ortaklar` listesi | Halil testi: ortak ekle → sermaye kaydını ortağa bağla → listede sermaye ve toplam doğru |
| **3** | Ortak carisi (ödeme · avans · ters kayıt) + bakiye | Halil testi: avans gir → bakiye eksi; ters kayıt → eski hâl |
| **4** | Anlaşma + kademe motoru (saf gövde, değer testleri: kademe toplamı = kâr, kuruşuna) + dağıtım TASLAK/KESİN | Halil testi: §4 örneğinin aynısı gerçek veriyle; ekrandaki rakamlar birebir |
| **5** | Ortak girişi + `/ortak-hesabim` + izinler + kapı mutasyonu | Halil testi: ortak kullanıcısıyla giriş → yalnız kendi hesabı; başka ortağın adresi 404 |

Her aşama ayrı onayla açılır, ayrı Halil testiyle kapanır.

---

## 11. Açık sorular (kullanıcı kararı bekler)

| # | Soru | Öneri |
|---|---|---|
| S1 | Bölünecek kâr GERÇEK NET mi (giderler düşülmüş)? | **Evet** — NET-2 giderleri düşmez |
| S2 | Dağıtım ne sıklıkla? (aylık · üç aylık · yıllık · elle seçilen dönem) | aylık hesap, ödeme elle |
| S3 | Kâr emek ücretine (kademe A) yetmezse: orantılı kısılsın mı, eksik ortağa borç olarak devretsin mi? | anlaşmada seçilebilir |
| S4 | Ortak firma geneli rakamları (dönem kârı, diğer ortakların payı) görsün mü? | yalnız kendi payı + kendi payının hesaplandığı dönem kârı |
| S5 | Sermaye iadesi (ortak ayrılır ya da sermayesini çeker) nasıl kaydedilsin? Finansman'da `SERMAYE` bugün yalnız GİRİŞ kabul ediyor | Finansman'a «sermaye iadesi» hareketi |
| S6 | Ortağa maaş/ücret bordrosuyla mı ödeniyor (o zaman GİDER), yoksa yalnız kârdan pay mı? | ikisi ayrı tutulur |
| S7 | Kâr payı vergisi/stopajı hesaplansın mı? | hayır — muhasebeciye sorulur |
| S8 | Siz de bir «ortak» kaydı olarak duracak mısınız? | **evet** — paylar %100'e ancak böyle tamamlanır |
| S9 | Ortaklık başladığında geçmiş dönemler (ortak gelmeden önceki kâr) dağıtıma girer mi? | hayır — anlaşmanın geçerlilik başlangıcından itibaren |

---

## 12. Riskler

- **Kapatılmamış dönem:** canlıda 0 kapalı ay. Ay kapatılmadan dağıtım yapılamaz; ilk iş,
  kapatma alışkanlığıdır. Aksi hâlde modül açılır ama kullanılamaz.
- **Sermaye kayıtları boş:** canlıda `SERMAYE` 0. Gün ağırlıklı model (C-b) gerçek sermaye
  hareketleri girilmeden doğru sonuç vermez — geçmiş katkılar tarihleriyle girilmelidir.
- **Satır bazlı yetki emsali:** `/ortak-hesabim` modelde ilk «yalnız kendi kaydı» ekranıdır.
  Genel bir mekanizmaya dönüştürülmez; tek ekran, tek kapı, mutasyonla sınanır.
- **Para hesabı:** kademe motoru her dağıtımda «toplam = kâr» eşitliğini kuruşuna sağlamalı;
  yuvarlama artığı hangi ortağa yazılacağı anlaşmada tanımlanır (varsayılan: en büyük paya).
