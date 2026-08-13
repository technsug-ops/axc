# Bekleyen İşler

Karara bağlanmış ama bilinçli olarak sonraki pakete bırakılmış işler.
Sırası gelince CLAUDE.md'deki **Kullanıcı Kolaylığı İlkeleri** kontrol
listesiyle birlikte teslim edilir.

## Sonraki uygun pakette

- [ ] **Alımı ÜRÜN/SKU ile arama — önce ÖLÇ, sonra yaz.**
      _Karar 13.08.2026._ Alım araması bugün alım kodu, tedarikçi sipariş
      numarası ve tedarikçi adında çalışıyor (ayraç duyarsız). "Bu ürünü
      hangi alımlarda almıştım?" sorusu AYRI iştir: `PurchaseItem` →
      `ProductVariant` üzerinden join gerektirir ve alım listesinde
      sayfalama yok — 1054 ürünlük katalogda ölçmeden yazılmaz.
      **Ölçülecek:** kaç alım/kalem var, join'li aramanın süresi ne,
      sayfalama önce mi gelmeli. _Ürün ekranlarında sayfalama 50/sayfa
      olarak çözülmüştü; alımlarda henüz yok._

- [ ] **Veri temizliği: bir alımın kodu sipariş numarası olarak girilmiş.**
      _13.08.2026'da arama testinde görüldü:_ kodu `431 231 579 6` olan
      bir alım var (Alım Kodu alanına pazaryeri sipariş numarası
      yazılmış). Sistem hatası değil, veri girişi; kullanıcı isterse
      düzeltir. Not düşüldü ki ileride "kod neden böyle" diye
      şaşırılmasın.

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

- [ ] **Pazaryeri komisyon listesi okuyucusu**
      1039 kanal kodunun komisyon oranı boş; kâr motoru oranı oradan okuyor.
      En hızlı yol satıcı panelinden inen komisyon listesi + içe aktarma
      "güncelle" kipi (artık 417 ms).
      KURAL: gerçek dosya gelmeden okuyucu YAZILMAZ — hakediş okuyucusunda
      spec ile gerçek başlıklar tutmamıştı, aynı tuzağa iki kez düşülmez.


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
