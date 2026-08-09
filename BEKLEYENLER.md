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

- [ ] **`axcaliSku` → `companySku` yeniden adlandırması**
      _09.08.2026: Faz 2 / Aşama 2 (kâr motoru) migration'ına binmesi
      kararlaştırıldı. Migration `ALTER TABLE ... RENAME COLUMN` ile
      elle yazılacak — Prisma'nın ürettiği DROP+ADD veri kaybettirir._
      Arayüzde her yerde "Firma SKU" yazıyor (09.08.2026), ama veritabanı
      alanı hâlâ eski marka adını taşıyor. Tek başına bir migration açmaya
      değmez; şema değişikliği gerektiren ilk işte birlikte yapılacak.
      Etkilenecek yerler: `prisma/schema.prisma`, ürün ve alım action'ları,
      ürün formu, arama sorguları.
      _Karar 09.08.2026: adlandırma standardının son adımı._

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

## SaaS dönüşümü

- [ ] **Çok-kiracılı (multi-tenant) mimari**
      Sistem ileride satılabilir bir SaaS olacak. Bugün tek firma
      varsayımıyla çalışıyoruz ama CLAUDE.md'deki adlandırma standardı
      gereği bu varsayımı derinleştiren kısayollardan kaçınıyoruz.
      Dönüşüm SaaS kararı netleşince planlanacak; kiracı (tenant) ayrımı,
      veri izolasyonu ve kimlik doğrulama birlikte ele alınmalı.
      _Karar 09.08.2026: bugün yapılmıyor, yön belli._

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

- [ ] **Tedarikçi kartı (Supplier modeli)**
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
