# Bekleyen İşler

Karara bağlanmış ama bilinçli olarak sonraki pakete bırakılmış işler.
Sırası gelince CLAUDE.md'deki **Kullanıcı Kolaylığı İlkeleri** kontrol
listesiyle birlikte teslim edilir.

## Sonraki uygun pakette

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

- [ ] **Yedekten geri yükleme ekranı**
      Bugün yedek dosyası ELLE geri yükleniyor. Ekrandan tek tuşla geri
      yükleme bilinçli olarak yapılmadı: yanlış tuşla tüm verinin üzerine
      yazılması korumasını hak eden bir işlem. İçe aktarma altyapısı
      (önizle-önce-yaz + tek transaction) hazır; sırası gelince onun
      üzerine kurulur.
      _Karar 10.08.2026._

## SaaS dönüşümü

- [ ] **Çok-kiracılı (multi-tenant) mimari**
      Sistem ileride satılabilir bir SaaS olacak. Bugün tek firma
      varsayımıyla çalışıyoruz ama CLAUDE.md'deki adlandırma standardı
      gereği bu varsayımı derinleştiren kısayollardan kaçınıyoruz.
      Dönüşüm SaaS kararı netleşince planlanacak; kiracı (tenant) ayrımı,
      veri izolasyonu ve kimlik doğrulama birlikte ele alınmalı.
      _Karar 09.08.2026: bugün yapılmıyor, yön belli._

## Kâr düzeltme yolundaki iki boşluk

10.08.2026'da "kâr hesaplanamadı" uyarısına çözüm yol haritası yazılırken
ortaya çıktı: uyarı kullanıcıyı bir yere göndermek istiyor ama o ekran yok.
Yol haritası bu yüzden "bu ekran henüz yok" diyerek dürüst kalıyor.

- [ ] **Alım düzenleme ekranı**
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

## Gözlem üzerine yapılacaklar

- [ ] **Kayıt sonrası yeşil başarı bildirimi** — İlke #5
      Şimdilik "kaydedilen kaydın sayfasına düşmek" yeterli onay sayılıyor:
      gördüğünüz şey kanıt. Kullanırken "kaydoldu mu, kaydolmadı mı?"
      tereddüdü yaşanırsa formlara açık bildirim eklenecek.
      _Karar 08.08.2026: ihtiyaç doğarsa yapılacak, şimdi değil._

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

- [ ] **İlk entegrasyon: kendi web sitesi kanalı**
      Faz 4'te bağlanacak İLK kanal pazaryeri değil, kullanıcının kendi
      e-ticaret sitesidir (bkz. CLAUDE.md → Yol haritası notları).
      **Platform kararı bekleniyor** (Shopify / WooCommerce / ikas);
      Faz 3 sonuna kadar verilecek. Şemada `ChannelType`'a `WEBSITE`
      eklenmesi yetecek, kanal mimarisi değişmeyecek.
      _Karar 09.08.2026._

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

## Faz sırasına göre zaten planlı olanlar

Bunlar eksik değil, sırası gelmedi (bkz. CLAUDE.md → Faz sırası):

- Hasarlı ürünün satıcıya iadesi ve tazminat süreci → Faz 3
- Stok hareketlerinde "kim" bilgisi (kullanıcı/kimlik doğrulama) → Faz 4
- Kredi kartı borç ve ekstre takibi → Faz 3
- Kanal komisyon kuralları ve net kâr hesabı → Faz 2
