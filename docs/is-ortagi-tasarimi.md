# İş ortağı (ortaklık projesi) modülü — tasarım belgesi

_K347 · Sürüm 2 · 17.10.2026 · Aşama 1 (tasarım). Bu belge KOD DEĞİLDİR; şema, migration ve
ekran yazılmadı. Kodun açılışı ayrı bir kullanıcı kararıdır (§0). Her uygulama aşaması ayrı
onayla açılır._

_Girdiler: kullanıcının 17.10.2026 kararları (§0) · kullanıcının verdiği «Ortaklık Yönetimi —
Kapsamlı Ortaklık Senaryoları ve Proje Planı» raporu (Sürüm 1.0, 17.10.2026; bundan sonra
**RAPOR**) · kod taraması ve canlı ölçüm (§1)._

---

## 0. Karar ve sıra

**Kullanıcı isteği 17.10.2026:** _«İş ortağı modülü: sermaye katıp benimle farklı
sorumluluklarla birlikte çalışmak isteyen kişileri bünyeme katmak.»_

| Soru (17.10.2026) | Kullanıcı cevabı |
|---|---|
| Ne takip edilsin? | **Hepsi:** sermaye · kâr payı · para çekme/ödeme · görev/sorumluluk |
| Ortaklar giriş yapsın mı? | **Evet, sınırlı yetkiyle** |
| Kâr payı neye göre? | _«Bir çok varyasyon üzerinde çalışabilsin sistem.»_ |
| «Yeni büyük faz açılmaz» kuralına takılırsa? | **Tasarım yap, kodu bekle** |
| (sonra) | Kullanıcı RAPOR'u verdi → kapsam ve ilkeler RAPOR'dan alındı |

⚠ **SÜRÜM 1 NİYE DEĞİŞTİ (eski gerekçe silinmez).** Sürüm 1 _firmanın TÜM kârını_ (GERÇEK
NET) ortaklar arasında bölüyordu. RAPOR'un ana ilkesi bununla çelişir: _«Mevcut envanter ve
bundan doğan kâr proje kapsamı dışındadır»_ · _«Proje açılışından önceki stoklar ve geçmiş
kazançlar yeni ortaklığa kendiliğinden aktarılmaz»_. Ortaklık firma değil, **PROJE** düzeyinde
kurulur. Sürüm 1'in kademe motoru, ortak carisi, yetki ve Finansman bağı kararları **korundu**;
değişen şey **hangi kârın bölündüğüdür** (§5).

⚠ **SIRA:** anayasa bugün _«tek firma kendi işinde oturur — yeni büyük faz AÇILMAZ»_ diyor.
Bu modül büyüktür. Kod, kullanıcı açılış kararı verince başlar ve karar anayasaya tarihiyle
yazılır.

---

## 1. Ölçülen başlangıç durumu

_Ölçüldü 17.10.2026 — kod taraması + canlı veritabanı (salt okuma)._

| Konu | Bugün sistemde | Kaynak |
|---|---|---|
| Maliyet yöntemi | **FIFO** · lot kipi HİBRİT | canlı `Company` |
| **Satışın hangi partiden çıktığı** | **VAR, %100** — her satış çıkışı (`SALE_OUT`) tükettiği partiyi `sourceMovementId` ile taşır | canlı, aşağıda |
| ↳ son 30 gün | 426 adet · partiye bağlı **%100** · doğrudan ALIM kalemine **%83,6** (kalan: sayım fazlası 50 · iptal girişi 15 · iade girişi 4 · değişim 1) | canlı |
| ↳ son 90 gün | 1.123 adet · **%100** · alım kalemine **%82,1** | canlı |
| ↳ son 365 gün | 5.494 adet · **%100** · alım kalemine %64,2 (eski içe aktarılmış alımlarda kalem bağı yok: 1.826 adet) | canlı |
| Sermaye / ortak borcu | **VAR** — Finansman (`SERMAYE` · `ORTAK_BORCU`), defter gibi, ters kayıtla düzeltilir | `src/lib/finansman/*` |
| Ortağın kimliği | **YOK** — Finansman'da ortak yalnız serbest isim | `Finansman.kaynakAdi` |
| Canlı finansman verisi | `SERMAYE` **0** · `ORTAK_BORCU` 1 («Deneme» — deneme kaydı) · `UCUNCU_KISI_BORCU` 3 | canlı |
| Firma dönem kârı | VAR — GERÇEK NET (`raporHesapla`) | `src/lib/rapor.ts` |
| Muhasebe dönemi kapatma | VAR (K108) · canlıda kapalı ay **0** | `muhasebe-donemi.ts` · canlı |
| Gider tahsisi (bir gideri işe/projeye bölmek) | **YOK** — `Expense` bir kategoriye bağlı, başka bağı yok; ayrıca `Expense` düzenlenebilir/silinebilir (defter değil) | `schema.prisma → Expense` |
| Onay akışı (ikinci onay, tutar limiti) | **YOK** | tarama |
| «Yalnız kendi kaydı» yetkisi | **YOK** — yetki ekran düzeyinde | `src/lib/yetki/izinler.ts:14-21` |
| Kâr payı · ortak cari · kasa/banka bakiyesi | **YOK** | tarama |
| Çok-firma | `main`'de iş tablolarında `companyId` yok; `k303-cok-firma` dalında var | `docs/cok-firma-tasarimi.md` |

**Sonuç:** RAPOR'un en zor teknik şartı — _«satış eşleştirmesinde SKU yetmez: lot, parti,
giriş hareketi gerekir»_ — sistemde **zaten karşılanıyor**. Proje kârı tahminle değil, FIFO
izinden hesaplanabilir. Eksik olanlar: proje, ortak, anlaşma, gider tahsisi, onay, cari.

---

## 2. Değişmez ilkeler (RAPOR §1 + anayasa)

1. **Satış hesabı mevcut işletmenindir.** Pazaryeri hesabı projeye geçmez.
2. **Eski stok ve geçmiş kâr projeye girmez.** Proje açılış tarihinden önceki partiler kapsam dışıdır.
3. **Tek işlem, tek kayıt.** Proje ikinci satış/stok kaydı açmaz; var olan kayıtları BAĞLAR.
4. **Ayrı kavramlar ayrı tutulur:** sermaye · borç · karşılıksız destek · gider avansı · hizmet ücreti · kâr payı.
5. **Dört ayrı gösterge** (§5.3): sonuç · nakit · dağıtılabilir · ortak hakkı.
6. **Kural değişikliği geçmişi değiştirmez:** anlaşma sürümlüdür, geçerlilik tarihi ve onay izi taşır; kesinleşen hesap donar.
7. **Para:** Decimal + para birimi; kur çevrilmez (anayasa).
8. **Defter disiplini:** sermaye, cari, dağıtım kaydı silinmez; ters kayıtla düzeltilir.

---

## 3. Kavramlar

| Kavram | Ne demek |
|---|---|
| **Proje** | Bir ortaklık birimi: adı · açılış tarihi · (varsa) bitiş tarihi · durum (AÇIK / KAPANIŞTA / KAPALI) · kapsam kuralları · ortaklar · anlaşma. Bir firmada birden çok proje olabilir. |
| **Kapsam** | Projeye hangi malın girdiği (§4). |
| **Ortak** | Kişi. Sizin kendiniz de bir projede ortak olarak durursunuz. İsteğe bağlı kullanıcıya bağlanır. |
| **Katılım** | Ortağın bir projedeki rolü: katkı türleri · sorumluluklar · pay sınıfı. Aynı ortak birden çok projede olabilir. |
| **Anlaşma** | Projenin kâr/zarar/dağıtım kuralları — sürümlü kademe listesi (§6). |
| **Dönem sonucu** | Projenin bir dönemdeki hesabı: dört gösterge + ortak bazlı hak (§5). TASLAK → KESİN. |
| **Ortak carisi** | Ortak ile proje arasındaki para hesabı (§7). |

---

## 4. Kapsam: projeye hangi mal girer

### 4.1 Kapsam kuralları (RAPOR §3 «kapsam» satırı)

| Kural | Nasıl çalışır | İlk sürümde |
|---|---|---|
| **Alım kalemi / parti** | Seçilen alım kalemleri projeye işaretlenir | ✅ **temel** — en kesin |
| **Kural ile otomatik işaret** | Açılış tarihinden SONRA girilen alımlardan seçilen SKU · marka · kategori · tedarikçi · alım kartı olanlar **alım kaydedilirken** projeye işaretlenir; kullanıcı formda görür ve değiştirebilir | ✅ (işaret alım kalemine yazılır; kural kendisi değil) |
| Depo / raf | Raf bazında kapsam | ⏳ sonra (bugün tek depo) |
| Satış kanalı / kampanya | Proje malı yalnız belirli kanalda satılır | ⏳ sonra |

⛔ **SKU tek başına kapsam DEĞİLDİR** (RAPOR §6, senaryo 15 riski: _«aynı SKU'nun eski ve proje
stokunda bulunması»_). SKU/kategori kuralı yalnız **alım anında işaret koymanın** yoludur;
satış eşleştirmesi her zaman PARTİ üzerinden yapılır.

### 4.2 Ortak alım havuzu (senaryo 14)
Bir alım kalemi projeye **tamamen** ya da **paylı** (ör. %60 proje · %40 firma) işaretlenebilir.
Paylı kalemden satılan malın sonucu aynı oranla bölünür. (Açık soru S10 — ilk sürümde gerekli mi?)

### 4.3 Proje partisinin kenar durumları (ölçülen kaynak dağılımına göre)

| Durum | Karar |
|---|---|
| Proje malı **iade** gelir (`RETURN_IN` partisi) | iade partisi **köken satışın** projesine bağlanır (zincir: iade → satış kalemi → tükettiği parti) |
| Proje malı satışı **iptal** edilir (`SALE_CANCEL_IN`) | aynı zincir — mal projeye döner |
| **Sayım fazlası** partisi (`COUNT_CORRECTION`) | kökeni bilinmez → **proje DIŞI** (varsayılan); kullanıcı belgeyle projeye alabilir (iz) |
| Sayım **eksiği / fire / hasar** proje partisinden | proje sonucuna **zarar** olarak girer (RAPOR §9: «normal ticari risk ile ihmal ayrımı» → açık soru S11) |

---

## 5. Proje sonucu

### 5.1 Satış tarafı
Proje partisinden çıkan her satış adedi projeye aittir. Bir satış kalemi birden çok partiden
çıkabilir (FIFO zaten parti başına ayrı çıkış yazar) → kalem, **proje partisinden çıkan adet
oranında** projeye girer.

**Projenin satış sonucu = Σ (proje adedine düşen) ciro − maliyet − kanal kesintileri.**
Maliyet, proje partisinin kendi birim maliyetidir (FIFO damgası).

⚠ **ÖLÇÜLECEK (T1):** satır (kalem) düzeyinde NET-2 bugün kârlılık kartında hesaplanıyor; ama
sipariş düzeyindeki kesintiler (kargo, platform hizmet bedeli) kalemlere nasıl dağıtıldığı
ayrıca ölçülmeli — kart notu: _«Kart kalem NET-2'sini gösterir; /satislar sipariş NET-2'sini
(kargo + hizmet bedeli dahil)»_. Karma siparişte (proje + proje dışı ürün) sipariş kesintisinin
paylaştırma kuralı Aşama 3'te ölçülerek seçilir (RAPOR §6: «karma sipariş … işlem satırı
üzerinden uygun projeye dağıtılır»).

### 5.2 Gider tahsisi (RAPOR §6)
Projeye ait giderler (reklam, personel, depo, paketleme…) **tahsis kaydı** ile projeye yazılır:
- yöntem: **doğrudan** (tamamı) · satış tutarı oranı · sipariş sayısı oranı · adet oranı · **belgeli elle**;
- ⛔ bir giderin tahsisleri toplamı giderin kendisini **aşamaz**; aynı gider ikinci kez yazılamaz;
- ⚠ `Expense` bugün düzenlenebilir/silinebilir: tahsis edilmiş bir gider sonradan değişirse
  tahsis **bayat** işaretlenir ve dönem sonucu kırmızı yazar (sessizce kaymaz).

**Proje dönem sonucu = satış sonucu − tahsis edilen giderler − proje partisi fire/kayıp ± iade etkisi.**

### 5.3 Dört gösterge (RAPOR §5 — zorunlu)

| # | Gösterge | Ne söyler |
|---|---|---|
| 1 | **Dönem sonucu** | yukarıdaki yönetimsel kâr/zarar |
| 2 | **Nakit** | projenin cebindeki para: sermaye girişi + tahsil edilen satış − ödenen alım/gider − ortaklara ödenen. ⚠ Sistem kasa/banka bakiyesi TUTMUYOR (`nakit-takvimi.ts:109`) → nakit **hesaplanır**, «hesaplanan» diye etiketlenir; hakediş (pazaryeri ödemesi) gelmeden satış nakit sayılmaz (açık soru S12) |
| 3 | **Dağıtılabilir** | nakit − rezerv − (yeniden yatırım kararı) − öncelikli haklar; negatif olamaz |
| 4 | **Ortak hakkı** | anlaşmaya göre her ortağın hak ettiği (ödenmese de) |

⛔ **Yeniden yatırılan kâr satış geliri DEĞİLDİR** (RAPOR §5). Hak (4) cariye yazılır, nakit (2)
projede kalır; ertesi dönemin sonucunu şişirmez.

### 5.4 Dönem ve kapanış
- Hesap dönemi: aylık · üç aylık · yıllık · kampanya sonu · özel aralık (RAPOR §3).
- Dönem sonucu yalnız **kapalı muhasebe dönemleri** üstünde KESİNLEŞİR (canlıda 0 kapalı ay →
  ön şart, §12). Taslak her zaman görülebilir.
- Kesinleşen sonuç donar (girdiler + anlaşma sürümü + sonuç). Kaynak sonradan değişirse
  **bayat** — kırmızı, sessiz yeniden hesap yok.

---

## 6. Paylaşım: kademe motoru

RAPOR §5'teki paylaşım kurallarının hepsi aynı iskelete oturur: sonuç **sırayla** dağıtılır.
Anlaşma **sürümlü bir kademe listesidir**; motor kademeleri sırayla uygular.

| Kademe | Ne yapar | RAPOR karşılığı |
|---|---|---|
| **A · Yönetim/emek ücreti** | belirli ortağa dönem başına sabit tutar (ertelenebilir) | senaryo 01 · 07 · 08 |
| **B · Öncelikli sermaye iadesi** | dağıtılabilir nakit önce sermayeyi geri öder (şelale) | senaryo 06 |
| **C · Öncelikli getiri** | sermayeye yıllık % getiri, gün ağırlıklı | «öncelikli getiri» |
| **D · Kalan paylaşım** | a) sabit oran · b) sermaye ağırlıklı (gün ağırlıklı) · c) emek+sermaye katsayılı · d) kademeli (eşiklere göre oran değişir) | «sabit · sermaye ağırlıklı · emek+sermaye · kademeli oran» |
| **E · Satış komisyonu** | ortağa ciro / tahsilat / kâr bazlı komisyon, **iadeden sonra kesinleşir** | senaryo 11 |
| **F · Zarar** | aynı oranla · yalnız sermayedarlara · zarar sınırı · devreder | senaryo 01 «zarar sınırı» |
| **G · Kâr kullanımı** | tam yeniden yatırım · kısmi dağıtım · rezerv önceliği · hedefe bağlı dağıtım | senaryo 16 · RAPOR §3 «kâr politikası» |

- Her kademe isteğe bağlı. Kurallar **birbirini dışlıyorsa** motor kaydı reddeder ve nedenini
  yazar (RAPOR §3: «birbirini dışlayan kurallar için öncelik sırası ve doğrulama gerekir»).
- **Kademe toplamı = dönem sonucu, kuruşuna.** Yuvarlama artığı anlaşmada seçilen ortağa
  (varsayılan: en büyük paya) — bekçi değerle sınar.
- **Performansa bağlı (senaryo 18):** kademe D-d'nin eşikleri ölçülebilir göstergelere
  bağlanır (marj · satış · stok devir hızı). Eşik GÖSTERGESİ sistemin zaten ürettiği rakamdan
  okunur; yeni ölçü uydurulmaz.

### Sayısal örnek (uydurma rakamlar — mekanizmayı göstermek için)
Kasım projesi sonucu **₺100.000**. Siz (sermaye ₺300.000, tüm ay) · Ahmet (₺200.000, ayın
16'sında; depo). Anlaşma: A) Ahmet ₺10.000 · D-c) kalanın %50'si sermayeye, %50'si sabit
%50/%50 · G) kalanın tamamı dağıtılır.
1. A: Ahmet ₺10.000 → kalan ₺90.000
2. Gün ağırlıklı sermaye: Siz 300.000×30/30 · Ahmet 200.000×15/30 → **%75 / %25**
3. Sermaye yarısı ₺45.000 → Siz ₺33.750 · Ahmet ₺11.250 · sabit yarısı → ₺22.500 / ₺22.500
4. **Siz ₺56.250 · Ahmet ₺43.750 · toplam ₺100.000** ✓
5. G «tam yeniden yatırım» seçilseydi: haklar aynı, **nakit ödenmez**, cari bakiyeye yazılır.

---

## 7. Katkı, sermaye ve ortak carisi (RAPOR §4)

| Katkı / hareket | Nerede tutulur |
|---|---|
| **Sermaye taahhüdü** | projede ortak başına taahhüt tutarı (ödenenden AYRI) |
| **Fiilen yatırılan sermaye** | **Finansman** `SERMAYE` kaydı → `ortakId` + `projeId` bağı (ikinci sermaye defteri açılmaz); belge eki |
| **Ortak borcu / avans** | Finansman `ORTAK_BORCU` (anapara · vade · geri ödeme zaten var) |
| **Gider finansmanı** (ortak bir gideri cebinden öder) | gider + ortağa **alacak** cari hareketi; ikisi karıştırılmaz |
| **Mal / ekipman katkısı** | değerlemesiyle cari/sermaye hareketi; stok ise alım kalemi olarak girer |
| **Ek sermaye çağrısı** | çağrı kaydı (tutar · son tarih) + katılmama sonucu anlaşmada |
| **Sermaye iadesi** | Finansman'da yeni hareket (bugün `SERMAYE` yalnız GİRİŞ) — **kâr dağıtımı DEĞİL** |

**Ortak carisi** (defter): kâr payı hakkı (+) · ödeme (−) · avans/çekim (−) · gider finansmanı
alacağı (+) · ters kayıt. Bakiye = Σ. ⛔ Ortağa ödenen kâr payı **gider değildir**; ortağa
bordrolu ücret ödeniyorsa o ayrı bir GİDERDİR (RAPOR §7 · açık soru S6).

---

## 8. Personel ve sorumluluk (RAPOR §7)

- Ortağın sorumlulukları kayıt olarak tutulur (Alım · Depo · Paketleme · Kanal hesabı …).
- Proje personel gideri **gider tahsisi** ile projeye yazılır (§5.2): işletmenin çalışanı →
  süre/görev oranında · yatırımcının çalışanı → belgeli maliyet · ilk ayların ücretini ortak
  öderse → avans / ek sermaye / karşılıksız katkı (seçim kayda yazılır).
- ⚠ RAPOR'un uyarısı aynen: _«Çalışanı kimin finanse ettiği, işverenin kim olduğu sorusunun
  yerine geçmez.»_ Sistem bordro/SGK hesabı yapmaz; ekranda bu not durur.

---

## 9. Yetki, onay ve ortak girişi (RAPOR §8)

### 9.1 Ortak girişi (kullanıcı kararı: sınırlı yetkiyle)
- Ortak bir **kullanıcıya** bağlanır ve sorumluluğuna uygun **rol** alır (mevcut yetki altyapısı).
- Yeni izinler (iki bacaklı kural: `izinler.ts` + `seed-yetki.ts → SONRADAN_DOGAN`, deploy
  sonrası `canli:yetki`): `ortaklik.yonet` (proje · anlaşma · dönem · cari) · `ortaklik.hesabim`
  (ortak yalnız kendi özeti).
- ⚠ **«Yalnız kendi kaydı» yeni bir kavramdır.** Genel satır süzgeci AÇILMAZ; tek ekran
  (`/ortaklik/hesabim`) kimliği **oturumdan** alır, adresten değil. Başka ortağın kimliğini
  adrese yazan deneme 404 alır — kapı mutasyonla sınanır.

### 9.2 Onay merkezi
RAPOR'un yetki tablosu (limit aşan alım · yeni tedarikçi · kâr dağıtımı · sermaye çekimi ·
yeni ortak/çıkış · tasfiye) **bugün sistemde hiç olmayan** bir akış ister: ikinci onay / tutar
limiti / oy oranı / veto. Bu modülün **en büyük yeni parçasıdır** ve proje çekirdeğinden bağımsız
kurulabilir → **ayrı aşama** (§11, Aşama 6). İlk aşamalarda «onay» = `ortaklik.yonet` sahibinin
onay diyaloğu + iz.

---

## 10. Senaryo kataloğu → motor bileşenleri

RAPOR'un 18 senaryosu ayrı ayrı kod DEĞİLDİR; hepsi aynı bileşenlerin **ayar kombinasyonu**dur.
Hazır şablonlar (RAPOR §12) bu ayarları önceden doldurur.

| # | Senaryo | Gereken bileşen | Aşama |
|---|---|---|---|
| 01 | Sermaye + operasyon yöneticisi | kademe A + D + F + G | 4 |
| 02 | Çok sermayedarlı | çok ortak · pay sınıfı · ek yatırım | 4 |
| 03 | Kredi/finansman sağlayıcı | **Finansman zaten yapıyor** (vade · faiz · taksit) — projeye bağ yeter | 2 |
| 04 | Pasif/sessiz yatırımcı | `ortaklik.hesabim` + raporlama; veto → onay merkezi | 5 / 6 |
| 05 | Kademeli yatırım | sermaye taahhüdü + dilim + hedef eşiği | 4 |
| 06 | Öncelikli sermaye iadesi | kademe B (şelale) + rezerv | 4 |
| 07 | Yönetim ücreti + kâr payı | kademe A (ertelenmiş ücret dahil) + D | 4 |
| 08 | Operasyon emeği | kademe A/D-c · sorumluluk | 4 |
| 09 | Satış altyapısı/hesap sağlayıcı | hizmet ücreti/komisyon kademesi (hesap işletmede kalır — ilke 1) | 4 |
| 10 | Çalışan sağlayan ortak | gider tahsisi + gider finansmanı alacağı | 3 |
| 11 | Satış komisyonu | kademe E (iadeden sonra kesinleşir) | 4 |
| 12 | Mal sağlayıcı + satışçı | mal katkısı + ödeme tarihi | 4 |
| 13 | **Konsinye** | malın MÜLKİYETİ sağlayıcıda — bugünkü stok modeli (FIFO + maliyet) bunu taşımıyor | ⛔ **kapsam dışı** (S13) |
| 14 | Ortak satın alma havuzu | paylı alım kalemi (§4.2) | 3 |
| 15 | Ürün/kategori bazlı | kapsam kuralı (§4.1) | 2 |
| 16 | Kârı içeride tutan büyüme | kademe G + dört gösterge | 4 |
| 17 | Süreli/kampanya | bitiş tarihi + kapanış rezervi + son stok tasfiyesi | 7 |
| 18 | Performansa bağlı | kademe D-d eşikleri | 4 |

---

## 11. Aşamalar ve teslim ölçütleri

| Aşama | İş | Kapanış ölçütü (Halil testi) |
|---|---|---|
| **0** ✓ | Ölçüm (§1) | bu belge |
| **1** ✓ | Tasarım (bu belge) | kullanıcı açık soruları cevaplar + **açılış kararı** |
| **2** | Proje + ortak + katılım/sorumluluk + Finansman bağı + **kapsam** (alım kalemi işareti, kural ile otomatik işaret) | yeni alım gir → projeye işaretli görünür; eski stok listede «proje dışı» |
| **3** | Proje satış sonucu (FIFO izinden) · iade/iptal zinciri · karma sipariş paylaştırması (T1 ölçümüyle) · gider tahsisi · paylı alım | proje partisinden satılan 1 ürünün sonucu ekranda; kart/satış ekranıyla **birebir** |
| **4** | Anlaşma + kademe motoru (saf gövde, değer testleri: toplam = sonuç) · dört gösterge · dönem TASLAK/KESİN · ortak carisi | §6 örneğinin aynısı gerçek veriyle; rakamlar birebir |
| **5** | Ortak girişi + `/ortaklik/hesabim` + izinler + kapı mutasyonu | ortak kullanıcısı yalnız kendi hesabını görür; başka ortağın adresi 404 |
| **6** | Onay merkezi (limit · ikinci onay · veto) | limit aşan alım onaysız kesinleşmez |
| **7** | Çıkış/tasfiye (RAPOR §10 sırası) · pay devri · senaryo karşılaştırma (RAPOR Aşama 7) | örnek tasfiye sırası ekranda adım adım |

RAPOR §13'ün kabul ölçütleri bekçiye çevrilir: eski stok sonucu etkilemez · karma SKU satışları
ayrılır · iadeler doğru projeye düşer · gider/avans mükerrer yazılmaz · yeniden yatırım gelire
dönüşmez · farklı firma verisi birleşmez · kapalı dönemin izi korunur.

---

## 12. Ön şartlar ve riskler

- **Ay kapatma:** canlıda 0 kapalı ay. Dönem sonucu ancak kapalı ay üstünde kesinleşir.
- **Sermaye kayıtları:** canlıda `SERMAYE` 0 → gerçek katkılar tarihleriyle girilmeli (gün ağırlıklı pay buna bakar).
- **Kalem bağsız eski alımlar:** son 365 günde 1.826 adet satış, kalem bağı olmayan eski içe aktarılmış partilerden. İlke 2 gereği bunlar zaten proje dışıdır — sorun değil, ama ekranda «proje dışı (eski stok)» diye görünür.
- **Gider defter değil:** tahsisli gider değişirse bayat işareti (§5.2).
- **Onay merkezi** genel bir altyapı ister; aceleyle yazılırsa yetki modelini bozar → ayrı aşama.
- **Hukuk/vergi:** RAPOR'un hukuki notu aynen geçerli — sistem yönetimsel hesap yapar; sözleşme, işveren yükümlülüğü, vergi muhasebeci/hukukçu işidir.

---

## 13. Açık sorular (kullanıcı kararı bekler)

| # | Soru | Öneri |
|---|---|---|
| S1 | ~~Bölünecek kâr GERÇEK NET mi?~~ → **RAPOR ile çözüldü:** proje sonucu bölünür (§5) | — |
| S2 | Hesap dönemi? | aylık sonuç, dağıtım politikası anlaşmada |
| S3 | Kâr emek ücretine (A) yetmezse: orantılı kısılır mı, ertelenip borç olarak mı devreder? | anlaşmada seçilir |
| S4 | Ortak, proje sonucunu ve diğer ortakların payını görsün mü? | proje sonucu + kendi payı; diğerlerinin payı anlaşmaya göre |
| S5 | Sermaye iadesi Finansman'a yeni hareket olarak eklensin mi? | evet |
| S6 | Ortağa bordrolu ücret var mı (GİDER), yoksa yalnız kârdan pay mı? | ikisi ayrı tutulur |
| S7 | Kâr payı vergisi hesaplansın mı? | hayır — muhasebeci |
| S8 | Siz de projede ortak kaydı olarak duracak mısınız? | evet |
| S9 | ~~Geçmiş dönemler dağıtıma girer mi?~~ → **RAPOR ile çözüldü:** girmez (ilke 2) | — |
| S10 | Paylı alım kalemi (ortak alım havuzu, §4.2) ilk sürümde gerekli mi? | Aşama 3'te |
| S11 | Proje partisinden fire/hasar: her zaman proje zararı mı, «ihmal» ayrımı mı? | proje zararı + gerekçe alanı |
| S12 | Nakit göstergesinde satış ne zaman nakit sayılsın: satışta mı, hakediş gelince mi? | hakediş gelince |
| S13 | Konsinye (senaryo 13) gerekli mi? Mülkiyet modeli gerektirir — kapsam dışı önerildi | kapsam dışı |
| S14 | İlk somut proje hangisi? (RAPOR §14 örnek profili mi?) — ilk aşamalar ona göre doğrulanır | RAPOR §14 |
