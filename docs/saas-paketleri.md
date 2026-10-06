# SaaS paketleri — özellik kataloğu

_Kullanıcı kararı 30.09.2026. Belge: karar kaydı. **06.10.2026'dan beri kod VAR (yalnız deneme kurulumu, `k303-cok-firma` dalı):** katalog `src/lib/paket/ozellikler.ts`, yönetim `src/lib/paket/yonetim.ts`, süper admin `/bezirga/paketler`. Uygulamanın paketi UYGULAMASI (menü kilidi) ayrı adım, henüz yazılmadı._

## 1. Ana karar — paket içeriği VERİDİR, KOD DEĞİL

> «İstediğim pakete istediğimi koyabilecek bir opsiyon olarak düşünmeye karar
> verdim — bunları ve diğer hepsini.»

Hiçbir özellik bir pakete **koda gömülerek** bağlanmaz. Aşağıdaki tablo
**başlangıç dağılımıdır**; sahibi herhangi bir özelliği herhangi bir pakete
ekranından taşıyabilir, pakete ekleyip çıkarabilir, yeni paket açabilir.
(Adlandırma standardının kardeşi: firma adı gibi paket içeriği de VERİ olur,
YAPI olmaz. KDV oranı ve kanal kesintilerinde olduğu gibi.)

## 2. Başlangıç dağılımı

| Paket | Özellikler |
|---|---|
| **Basic** | stok · alım · satış · kâr motoru · iade · gider · panel · dönem raporu · tanımlar · Excel içe/dışa aktarma ve yedek · hesaplama motoru ¹ |
| **Silver** | barkod, paketleme, raf, sayım, etiket · çoklu kullanıcı · kartlar ve kart borcu · nakit takvimi |
| **Gold** | pazaryeri siparişi, hakediş ve stok/fiyat gönderimi · listeleme sağlığı · komisyon tarifesi · kargo tarifesi · tazminat |
| **Premium** | kârlılık kartı · ürün analizi · envanter değeri · AI özeti |

¹ Hesaplama motoru bu turdaki listede yer almadı; önceki karar
(«hesaplama motorunu Basic'e alabiliriz») geçerli sayılıp Basic'e yazıldı.
Madde 1 gereği yeri ekrandan değiştirilebilir.

**Kapatılan ara karar:** 30.09'da hesaplama motoru ve kârlılık kartı için
«her pakette bonus (pazarlama)» önerildi. Aynı gün yerini yukarıdaki dağılım
ve **esnek paket** kararı aldı — bonus da artık bir veri seçimidir (bir
özelliği bütün paketlere eklemek), ayrı bir mekanizma gerektirmez.

## 2b. Individuel ve Finansman (kullanıcı kararı 06.10.2026)

- **Individuel = firmaya özel seçim.** Bu pakete alınan firmanın özelliklerini
  süper admin firma kartında tek tek işaretler; fiyat firma başına elle.
- **Finansman** (K304 — sermaye, ortak/banka borcu; 30.09 listesinde yoktu)
  hiçbir hazır pakette değil, yalnız Individuel'de seçilir.
- **Kâr motoru anahtar DEĞİL:** kendi ekranı yok, satışın parçası. Kapatılabilen
  bir anahtar olsaydı hiçbir şeyi kapatmayan bir söz verirdi.
- Var olan firmalar başlangıçta **Individuel + bütün özellikler** ile bağlandı
  (Premium'a bağlansalardı Finansman'ı kaybederlerdi).
- Individuel'e geçişte firmanın seçimi o anki açık kümeden yeniden kurulur;
  eski (bayat) bir seçim geri gelmez.

## 2c. Basic genişledi — 06.10.2026

- Kullanıcı kararı: Basic'te kartlar ve kart borcu, kanal kodları ve kanal hesapları olsun.
- Müşteri geri bildirimi: «API yoksa barkod olmadan her şey elle yazılır, program eziyet olur»
  → okut ve paketle Basic'e (alım mal kabulü ve satış formundaki barkod zaten Basic'teydi).
- Bölünen özellikler: Depo → Barkod (okut, paketle, sayım kipi) + Depo (raf, yerleştirme);
  Pazaryeri → Kanal tanımları (kodlar, hesaplar) + Pazaryeri (hakediş, geçmiş ekstre).
- Güncel dağılım: Basic 13 · Silver 16 · Gold 21 · Premium 25; Finansman yalnız Individuel.

## 3. Uygulama çerçevesi (açıldığında)

- **Özellik anahtarları kodda** (sabit liste, ekranı/eylemi korur); **paket ↔
  özellik eşlemesi ve firma ↔ paket veritabanında**, sahibin ekranından
  düzenlenir. Emsal bugün var: `Company.finansmanCokBirim` + Ayarlar →
  Özellikler.
- ⚠ **İKİ BACAK:** bu, yetki sisteminin aynı yapısıdır (anahtar kodda, atama
  veride). Yetkide yaşanan «menüde var, tıklayınca 404» vakası burada da
  doğabilir → yeni özellik anahtarı eklenince başlangıç eşlemesi de yazılır ve
  bir bekçi «hiçbir pakette olmayan özellik» ile «paketi olmayan firma»yı
  kırmızı yakar.
- **Bağımlılık uyarısı ekranda:** bazı özellikler başka birinin verisine
  dayanır. Sahip paketi kurarken sistem söyler, engellemez:
  - hesaplama motoru → komisyon ve kargo tarifesi (bugünkü dağılımda Gold).
    Tarifesiz pakette motor **elle oran girişiyle** çalışır; ekranda
    «tarifeler otomatik gelsin» notu durur. (Anayasa: «kural doğru mu değil,
    teslim edilebilir mi».)
  - stok/fiyat gönderimi → pazaryeri siparişi · nakit takvimi → hakediş
    beklentisi için pazaryeri verisi (yoksa yalnız kart ve gider ayağı).
- Paketten çıkarılan özelliğin **verisi silinmez**; yalnız ekran/eylem
  kapanır (veri sahipliği ilkesi — dışa aktarma her pakette açık kalır).

## 4. Açık kalan

- Üyeliksiz, ücretsiz web aracı (hesaplama motorunun sade hâli, müşteri
  çekmek için): SaaS aşamasına not. Bugün açılmaz.

## 5. Kim yönetir — sağlayıcı düzlemi (kullanıcı kararı 30.09.2026)

Paket tanımlama ve firmaya paket atama **yalnız sağlayıcının** işidir; firma
rollerine hiçbir koşulda dağıtılmaz.

- İzin: `paket.yonet`, `saglayici: true` işaretiyle (mekanizma bugün var:
  `SAGLAYICI_IZINLERI`, otomatik dağıtımı engeller). Yetkinin iki bacağı
  geçerli: anahtar `izinler.ts` + `seed-yetki` → `SONRADAN_DOGAN`, deploy
  sonrası `canli:yetki`.
- Firma yöneticisi kendi paketini **görür** (ne var, ne yok, neyi açmak için
  hangi paket gerekir), **değiştiremez**.
- Ayrıntı ve çok-firma tarafı (rol kopyası deliği, yetkinin kişiye bağlanması):
  `docs/cok-firma-tasarimi.md` §9.
