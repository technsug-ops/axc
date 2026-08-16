# SELLIORA — Proje Anayasası

## Ne inşa ediyoruz
Çok kanallı e-ticaret arbitraj operasyonu için ERP. Bugün: ~30 paket/gün,
tek kullanıcı, ev içi mini depo. Hedef: ~150 paket/gün, çok kullanıcılı
depo. Mimari hedefe göre, özellikler bugüne göre: küçük başla,
yeniden yazmadan büyü.

## Teknoloji kuralları (değişmez)
- Next.js (App Router) + TypeScript + Prisma + MySQL + Tailwind + shadcn/ui
- Deneysel/beta özellik KULLANMA; stabil sürümde kal
- Parasal değerler: her zaman Decimal + currency (TRY|EUR). Asla Float.
- Stok: ledger (StockMovement). Kayıt silinmez/değiştirilmez; düzeltme
  ters işaretli ADJUSTMENT ile yapılır.
- **İŞ SAAT DİLİMİ: `Europe/Istanbul` — SABİT.** Kullanıcı Almanya'da ama
  operasyon Türkiye'de. Kart kesim günü, hakediş ve kâr tarihleri İstanbul
  gününe göre işler. Çalışma ortamının saat dilimi ASLA kullanılmaz
  (`Intl.DateTimeFormat().resolvedOptions().timeZone` yasak). Hem GÖSTERİM
  hem "bugün" ÜRETİMİ tek sabitten okunur: `src/i18n/ayarlar.ts`.
  _Karar 09.08.2026._
- Her üründe tam olarak bir isDefault=true varyant (uygulama katmanı garanti eder)

## Adlandırma standardı (KESİN KURAL)

Bu sistem ileride satılabilir bir SaaS olacak. **SIRA NET (karar 13.08.2026):**
önce tek firma için her şey tamamlanır ve sistem kendi işinde kanıtlanır;
sonra çok-firma veri katmanı; SaaS EN SON. Mimari kararlar SaaS-uyumlu
alınmaya devam eder ama **SaaS'a özel iş AÇILMAZ** (bkz. BEKLEYENLER →
Büyüme sırası).

Bu nedenle hiçbir firma/marka adı sistemin YAPISINA gömülmez.

- Alan adları, ekran başlıkları ve sistem metinleri hiçbir belirli
  firmaya/markaya bağlı olamaz. Firma adları yalnızca VERİ olabilir
  (ayar alanı değeri), YAPI olamaz.
- Uygulama adı TEK sabitten okunur: `src/lib/uygulama.ts` → `UYGULAMA.ad`.
  Sol menü markası, üst çubuk ve sekme başlıkları oradan beslenir; sekme
  başlıkları `layout.tsx`'teki metadata şablonuyla otomatik eklenir.
  Ad değişikliği tek satırlık iş olmalıdır.
- Standart terimler:
  - **SKU** — sistem içi kod
  - **Firma SKU** — firmanın fiziksel etiket kodu
  - **Barkod (EAN)** — üretici kodu
  - **Kanal SKU** — pazaryeri kodu
  - **Raf** (arayüz terimi; veri modelinde `Location`) — depo konumu için
    operasyonda konuşulan doğal dil esas alınır.
- Arayüz dili operasyonun konuşma dilidir; veri modeli dili teknik
  olabilir. İkisi çelişirse arayüzde konuşma dili kazanır.
- SaaS hazırlık kuralı: Yeni yazılan hiçbir özellik "tek firma" varsayımını
  DERİNLEŞTİRMEMELİ. Çok-kiracılılığı bugün kurmuyoruz ama onu ileride
  zorlaştıracak kısayollardan kaçınıyoruz. Şüpheli durumda kullanıcıya sor.

## Çok dillilik / i18n (KESİN KURAL)

Tek dil Türkçe, ama metinler altyapıdan akar — koda gömülü kalmaz.

- **Kullanıcıya görünen her yeni metin sözlük dosyasından gelir.**
  Koda gömülü metin yasak. Zod/sunucu hata mesajları, onay diyalogları,
  sekme başlıkları ve ekran-okuyucu metinleri de buna dahildir.
- **Her yeni ekran teslimi `i18n: ✓` kontrolü içerir.**
- Sözlükler: `messages/tr.json` (kaynak) ve `messages/en.json` (boş
  iskelet, ileride doldurulacak). Yeni anahtar ikisine birden eklenir.
- Kütüphane: **next-intl**. Server Actions içinde `getTranslations()`,
  sunucu bileşenlerinde `getTranslations()`, istemcide `useTranslations()`.
- **Para/tarih/sayı biçimleri de dil altyapısından geçer.** Doğrudan
  `Intl.*` veya elle biçimlendirme YASAK:
  - Sunucu: `const bicim = await bicimlendirici();` → `bicim.para(...)`, `bicim.tarih(...)`
  - İstemci: `const bicim = useBicim();`
  - Para birimi VERİDEN gelir (TRY/EUR), dilden değil; kur çevirisi yapılmaz.
- URL yönlendirmesi bugün YOK; rotalar dilden bağımsız. İngilizce
  eklenince `as-needed` kipine geçilir (Türkçe öneksiz, `/en/...` önekli),
  mevcut rotalar yine değişmez.
- **Arayüz metni sözlükten gelir ve çevrilir; veritabanına yazılan veri
  (notlar, kayıt açıklamaları) ÇEVRİLMEZ ve sözlüğe girmez.** Kayıtlar
  yazıldıkları dilde kalıcıdır — karışık dilli ledger oluşmaz.
- Devam eden geçiş: mevcut ekranlardaki metinler paket paket sözlüğe
  taşınıyor. Yeni yazılan hiçbir metin bu borca eklenmez.

## Kullanıcı Kolaylığı İlkeleri (KESİN KURALLAR)

Kullanıcı yazılımcı değil, operasyoncudur. Her ekran, ilk kez gören
birinin yardım almadan kullanabileceği kadar açık olmalıdır. Bu kurallar
tercih değil, zorunluluktur:

1. GÖRÜNÜR EYLEMLER: Bir kayıtta yapılabilecek işlemler (detay, düzenle,
   sil/pasife al, mal kabul vb.) o kaydın satırında GÖRÜNÜR buton/ikon
   olarak durur. Gizli tıklama alanına bel bağlanmaz.

2. TIKLANABİLİR GÖRÜNÜR: Tıklanabilir her öğe tıklanabilir görünür
   (link stili, hover, ikon). Düz metin gibi duran link yasaktır.

3. KİMLİK KODLARI LİSTEDE: Bir kaydı tanımlayan kodlar (SKU, Firma
   SKU, barkod/EAN, sipariş no) detaya girmeden LİSTEDE görünür.
   Mobilde yer darsa öncelik: ad > Firma SKU > barkod.

4. TIK-KOPYALA: Kod/kimlik niteliğindeki her değer (SKU, barkod,
   sipariş no vb.) yanındaki ikonla tek tıkta panoya kopyalanır ve
   "kopyalandı" onayı gösterir. Yeni eklenen her kod alanı bu bileşeni
   kullanır.

5. TÜRKÇE VE NET GERİ BİLDİRİM: Her işlem sonucu (başarı/hata) Türkçe
   ve görünür bildirilir. Sessiz başarısızlık yasaktır — bir şey
   olmadıysa NEDEN olmadığı ekranda yazar.

6. YIKICI EYLEM = ONAY: Silme ve geri alınamaz işlemler her zaman
   Türkçe onay diyaloğu ister.

7. BARKOD HER YERDE: Kod girilebilen her alan USB okuyucu (Enter) ve
   kamera okumayı destekler; manuel giriş yedek kalır.

8. MOBİL EŞİT VATANDAŞ: Her yeni ekran telefonda da kullanılabilir
   olmalı — depo aşamasında birincil cihaz telefon/tablet olacak.
   Dokunulabilir her öğe telefonda en az 44×44 px olmalıdır. shadcn'in
   `size="icon-sm"` (28px) ve `icon-xs` (24px) varyantları mobilde tek
   başına kullanılmaz.

9. AZ TIKLA: Sık yapılan işlem (alım girme, mal kabul, ürün arama) en
   az adımla tamamlanır. Bir bilgiye ulaşmak için detaya girmek
   ZORUNLUYSA, o bilgi muhtemelen listede de olmalıdır.

10. TUTARLILIK: Aynı işlem her ekranda aynı görünür ve aynı çalışır
    (aynı ikonlar, aynı yerleşim, aynı davranış).

11. YER TUTUCU DEĞER GİBİ GÖRÜNMEZ: Yer tutucu (placeholder) metin,
    girilmiş bir değer sanılmamalıdır. Sayısal alanlarda yer tutucu
    HER ZAMAN "örn. X" biçiminde yazılır ("1,5" değil "örn. 1,5";
    "0" değil "örn. 3").
    _09.08.2026'da aynı tuzağa iki kez düşüldü: kullanıcı ürün
    kartındaki gri "1,5"i ve satış formundaki gri "0"ı girilmiş değer
    sandı, boş alanı dolu zannedip sistemi hatalı sandı._

12. ALANI VERİMLİ KULLAN: Ekranda boşluk bilgi taşımaz. Yasak kalıp —
    **tam genişlikte "etiket solda, rakam en sağda" satır**: göz aradaki
    yüzlerce pikseli kat etmek zorunda kalır ve iki satırı karşılaştırmak
    zorlaşır. Doğrusu: sayı grupları için **kompakt kutucuk ızgarası**,
    listeler için **genişlik sınırı** (`max-w-3xl` gibi).
    _14.08.2026'da kullanıcı aynı şeyi ÜÇ ayrı ekranda söyledi: kanal
    tablosu, görev kutusu, yaşlanma listesi. Üçü de aynı kalıptı._

13. ÖZET EKRANDA DÖKÜM OLMAZ: Panel bir HÜKÜM yeridir. **Satır sayısı
    veriyle birlikte BÜYÜYEN hiçbir şey özet ekranına konmaz** — bugün 3
    satırla masum görünen liste, hacim artınca ekranı yutar. Döküm kendi
    sayfasına gider, özette rakam + "aç" bağlantısı kalır.
    **Sayfa içinde SEKME serbesttir** (kullanıcı kararı 14.08.2026): aynı
    anda karşılaştırılması GEREKMEYEN blokları ayırır. Birlikte okunması
    gereken rakamlar (ciro ile NET) sekmeye bölünmez — sekme, bilgiyi
    saklamanın kolay yolu değildir. Sekme seçimi URL'ye yazılır.
    _Gerekçe: nakit takvimi 14 günü gün gün panele basınca panel "özet
    olmaktan çıktı" (kullanıcı, 14.08.2026)._

14. ADSIZ SATIR YAZILMAZ: Kendini tanıtamayan (adı boş ya da "—") bir
    kayıt tek başına satır olmayı hak etmez; kardeşleriyle toplanıp
    "N kalem" olarak gösterilir. Rakam kaybolmaz, okunabilir olur.
    _14.08.2026: hakediş kalemleri sipariş SATIRI başına geldiği için tek
    günde 20+ "—" satırı çıktı; ekran isimsiz rakam duvarına döndü._

YENİ EKRAN KONTROL LİSTESİ: Her yeni ekran tesliminde bu 14 maddeye
uygunluk kontrol edilir ve rapora "kullanıcı kolaylığı: ✓" satırı eklenir.

## İş sabitleri
- 11 satış kanalı: Trendyol, Hepsiburada, Amazon, N11, Bim, A101,
  Teknosa, Mediamarkt, Vatan, Pazarama, PTTAvm
- Bir kanalda birden fazla hesap olabilir (hesap başına alım limiti nedeniyle)
- Üç kod rolü ayrıdır: SKU (sistem içi), Firma SKU (fiziksel etiket),
  Barkod/EAN (üretici). Veritabanı alanı `companySku`
  (yeniden adlandırma 09.08.2026'da kâr motoru migration'ında yapıldı).
- Kanal başına varyantın ayrı ChannelSku'su olabilir
- Kredi kartı seçim mantığı (ileride): limiti uygun + kesim günü en uzak
  + faizsiz maksimum taksit
- Stok toplama FIFO; raf konumu (Location) toplama ekranında gösterilir
- **Kanal kesinti kuralları (teyitli 09.08.2026 — önceki değerler yanlıştı):**
  - Hepsiburada: komisyona **+%20 KDV** · **%0,8 ödeme gideri** (sipariş
    tutarının binde sekizi, 100 TL'de 80 kuruş) · **12,60 TL hizmet bedeli**
    (sipariş başına). _Eski "%0,08" notu hatalıydı._
  - Trendyol: **13,19 TL sabit gider, SİPARİŞ BAŞINA BİR KEZ** (kalem
    sayısından bağımsız). Komisyonuna KDV eklenmez.
    _Eski "13,29 TL" notu hatalıydı._
  - Kargo: paket başına, desi bazlı tarifeden + %20 KDV. **Kargo firması
    satışta seçilir** (tarife tablosunda 10+ firma).
  - Komisyon oranı ürün×pazaryeri bazında farklıdır ve **haftalık değişir**
    (Trendyol Salı, Hepsiburada Çarşamba günceller). Bu yüzden oran
    ChannelSku seviyesinde tutulur ve satış anında kayda snapshot'lanır.
  - **Stopaj: KDV hariç tutarın %1'i.** Matrah, ürünün KENDİ KDV oranı
    düşülmüş tutardır (kategoriden gelir).
  - **%15 gelir vergisi KULLANILMIYOR** — kullanıcı bu rakama itibar
    etmiyor; hesaba katılmaz, ekranda gösterilmez.
- İki net kâr rakamı hesaplanır: **NET-1** (stopaj düşülmüş),
  **NET-2** (NET-1'den ödenecek KDV de düşülmüş).

## Faz sırası (sırayı atlama)
- Faz 0 ✓: şema (tamamlandı)
- Faz 1 ✓: ürün/varyant CRUD → alım girişi → stok görünümü → kart tanımları
- Faz 2 ✓: satış + kâr motoru + iade + gider
- Faz 3 (şimdi): hakediş + kart borcu takibi + tazminat
- **Faz 3,5 — TEK KULLANICILI GİRİŞ (canlıya geçişin ön maddesi)**
- Faz 4: pazaryeri API'leri + barkod + çoklu kullanıcı + yetki (RBAC)
Bir faza ait olmayan özelliği o fazda EKLEME.

## Güvenlik katmanları (KESİN AYRIM)

10.08.2026'da canlıya çıkınca ortaya çıktı: sistemde HİÇ giriş yoktu ve
adres internete açıldı. Üç ayrı katman var, karıştırılmamalı:

1. **Kapı kilidi — Vercel Authentication.** Koda dokunmadan siteyi yalnız
   hesap sahibine açar. GEÇİCİ KÖPRÜ; kaba bir araçtır (telefondan bakmak
   Vercel oturumu ister, muhasebeciye salt-okunur erişim verilemez).
2. **Gerçek giriş — uygulamanın kendi kapısı.** E-posta/parola, oturum,
   tüm sayfalar korumalı. RBAC YOK, sadece kapı.
   **GERÇEK ENVANTER İÇE AKTARILMADAN ÖNCE OLMALI.** Faz 4'ü beklemez.
   _Karar 10.08.2026._
3. **Yetki (RBAC) — kim neyi görebilir.** "Depocu stok girsin ama kâr
   marjını görmesin" ihtiyacı eleman alınınca ya da SaaS'laşınca doğar.
   Tek kullanıcıda boş katmandır. Faz 4'te çoklu kullanıcıyla birlikte.

### YETKİ İKİ BACAKLIDIR (KESİN KURAL — mimar kararı 13.08.2026)

Bir izin iki yerde yaşar: **KOD** (deploy ile gider) ve **VERİTABANI**
(rol-izin satırı). İkincisi unutulunca ekran **sessizce kaybolur** —
`sayfaIzni` izni bulamayınca `notFound()` döner; menüde görünür, tıklayınca
404. Canlıda tam olarak bu yaşandı (`/iadeler`, 13.08.2026).

- **Ölçüt İZİN KÜMESİDİR, ROL ADI DEĞİL. İsim bir etikettir, yetki değil.**
  Bu deploy'dan ÖNCE bütün izinlere sahip olan bir rol, bu deploy'dan SONRA
  da bütün izinlere sahip olur — adı "Sahip" olmasa da (kullanıcının rolü
  "CEO", seed'in kurduğu "Sahip" değil).
- Aynı ölçüt `lib/yetki/koruma.ts`'in kendini kilitleme korumasında da
  geçerlidir; iki yerde iki farklı ölçüt olmaz.
- **Yeni izin eklendiğinde:** anahtar `lib/yetki/izinler.ts`'e girer VE
  `prisma/seed-yetki.ts` → `SONRADAN_DOGAN` listesine yazılır. İkincisi
  unutulursa tam yetkili rol o izni hiç görmez.
- **Her deploy sonrası `npm run canli:yetki` KOŞULUR.** Komut önce
  senkronu yapar, sonra **bekçiyi** çalıştırır: tam yetkili rollerden birinin
  eksik izni varsa kırmızı yanar ve çıkış kodu 1 döner. Bilinçli kısıtlı
  roller `scripts/yetki-bekci.ts` içinde ADIYLA beyan edilir — beyan
  edilmeyen bir eksik, hata sayılır.
- Yeni bir izin EKLENMEDİĞİ paketlerde de koşmak zararsızdır ve alışkanlık
  hâline gelmesi gerekir; unutulan tek satır bir ekranı görünmez yapıyor.

**Kütüphane kısıtı (ölçüldü 10.08.2026):** `next-auth`ın kararlı sürümü
hâlâ 4.24; App Router'ın karşılığı olan v5 yalnızca `beta` etiketinde —
anayasa gereği KULLANILMAZ. `lucia` yazarı tarafından emekliye ayrıldı.
Geriye iki gerçek seçenek kalıyor: `better-auth` (1.x kararlı) veya
elle yazılmış oturum (parola özeti + HttpOnly imzalı çerez + oturum
tablosu). Tek kullanıcı için ikincisi yeterli ve bağımlılıksızdır.

## Yol haritası notları

Alınmış yön kararları. Bugün uygulanmıyor, ama bugünkü işler bunları
zorlaştıracak şekilde yazılmıyor.

- **WEB SİTESİ KANALI — 2027 BAŞINA ERTELENDİ (karar 13.08.2026).**
  Kullanıcı kendi e-ticaret sitesinde de satış yapacak. Mimari karar
  değişmedi: **Selliora mağaza OLMAZ, mağazayı yöneten beyin olur.** Kendi
  site, `WEBSITE` tipinde 12. kanal olarak bağlanır.
  Platform karşılaştırması yapıldı, **eğilim ikas**: TR ekip işletecek, TR
  pazarı, ilk yıl düşük hacim, uzun vadeli marka. `WooCommerce` yedekte
  (API sınırına çarpılırsa), `Shopify` **elendi** (TR'de Shopify Payments
  yok, USD maliyet, TR entegrasyonları üçüncü parti).
  Karar deneme ile mühürlenecek: TR ekibi ikas deneme hesabında 3-5 ürünle
  test siparişi çevirecek. **Faz 4'ün 1 numarası DEĞİL** — o sıra
  pazaryeri API'lerine geçti.
- **SaaS FEATURE:** "Kendi siteni bağla", SaaS'ta bir plan/feature kalemi
  olarak konumlanacak — pazaryeri + kendi site tek stoktan yönetilir,
  ayrışma noktası budur.
- Bu karar `ChannelType` yapısını **doğruluyor**: kanal mimarisine
  dokunulmaz, `WEBSITE` tipinin eklenmesi yeterli olacak.
- **KDV KATEGORİDEN GELİR, SaaS'a hazırdır:** KDV oranı ürün ürün elle
  girilmez; ürün bir kategoriye bağlanır, oran kategoriden okunur.
  Kategoriler ve oranları **ayarlanabilir veridir** (sabit kod değil), bu
  yüzden çok-kiracılı yapıda her müşteri kendi kategori/oran setini
  kullanabilir. Aynı ilke kanal kesinti kuralları için de geçerli:
  komisyon, ücret ve kargo tarifeleri veri olarak tutulur.
  Çözüm sırası: **ürün istisnası > kategori oranı > varsayılan %20.**
  Satış anında çözülen oran satış kaydına yazılır (snapshot) — oran
  sonradan değişse eski satışların hesabı değişmez.
  _Karar 09.08.2026._
- **Canlıya geçiş ön şartı: veri içe aktarma modülü.** (Ayrıntı ve
  diğer iki ön şart için bkz. BEKLEYENLER.md → Canlıya geçiş ön şartları.)
- **VERİ SAHİPLİĞİ İLKESİ:** Müşteri verisini istediği an tam olarak
  dışa aktarabilir. **Onboarding = içe aktar, offboarding = dışa aktar;
  ikisi de birinci sınıf özelliktir**, sonradan eklenen eklenti değil.
  _Karar 09.08.2026._
- **KARGO MALİYET ÖNERİSİ — satılabilir özellik.** Müşteriler kargo
  firmasını genelde alışkanlıkla seçer; sistemin o desideki fiyatları
  yan yana gösterip en ucuzu önermesi **doğrudan para tasarrufu vaadidir**.
  SaaS'ta öne çıkarılacak. Tarife verisi ve öneri mantığı Faz 2'de kuruluyor;
  Faz 4'teki toplu sevkiyat ekranı aynı mantığı toplu işe uygular.
  _Karar 09.08.2026._

## Çalışma kuralları
- Her aşamada önce ne yapacağını KISACA söyle, onay al, sonra uygula
- Şema değişikliği gerektiren işlerde migration'ı hemen çalıştırma;
  önce bildir
- **Migration + `prisma generate` sonrası dev sunucusu MUTLAKA yeniden
  başlatılır.** Çalışan sunucu üretilmiş Prisma istemcisini önbellekte
  tutar; yeni alan/model "Unknown field ..." hatası verir. Kod doğru
  olduğu hâlde ekran 500 döner ve hata koda aitmiş gibi görünür.
  _09.08.2026'da üç kez yaşandı; teşhis her seferinde dev sunucusu
  günlüğünden çıktı — tahmin etmeden önce kendi günlüğüne bak._
- Kullanıcı vibe-coder: teknik jargonu az, Türkçe açıkla
- Migration, silme, reset gibi geri dönüşsüz işlerde MUTLAKA onay iste
- Her tamamlanan aşamada commit + push (mesaj formatı: tip: Türkçe açıklama).
  Push öncesi .env sızıntısı kontrolü.
- Barkod/kamera okuma ortak bileşeni: `src/components/barkod-okuyucu.tsx`
  (zxing-wasm). Kuralın kendisi için bkz. Kullanıcı Kolaylığı İlkeleri #7.
- Arayüz değişikliği içeren her teslimde, dar viewport (mobil)
  emülasyonunda temel etkileşim akışı test edilir: menü aç/kapa,
  navigasyon, form gönderimi, diyalog açma. Sadece HTTP durum kontrolü
  yeterli değildir.
  Projede tarayıcı otomasyonu YOK (karar 08.08.2026, Faz 4'te yeniden
  değerlendirilecek). Bu doğrulamayı kullanıcı gerçek cihazda yapar;
  teslim raporunda "mobil doğrulama kullanıcıda" satırı açıkça yazılır.

## HALİL TESTİ — paketin kapanma şartı (KESİN KURAL)

_Mimar kararı 13.08.2026._ Bir paket, kod yeşil olduğu için değil, **gerçek
kullanımda doğrulandığı için** kapanır. Beş madde, hepsi zorunlu:

a) **Gerçek cihaz + CANLI adres.** Yerel sunucu sayılmaz.
b) **Gerçek dosya/veri ile.** Sentetik örnek sayılmaz.
c) **Ekrandaki rakamlar teslim raporundakiyle BİREBİR tutmalı.**
   Tutmayan tek rakam testi düşürür — "yaklaşık aynı" diye bir sonuç yok.
d) **Günlük iş akışında bir uçtan uca deneme.** Paketin çıktısı, günlük
   akışta gerçekten kullanılıyor mu?
e) **Sonuç mimara rapor; mimar onayı olmadan paket KAPANMAZ.**

**Teslim raporu kuralı:** her teslim raporu bir **"Halil test listesi"**
bölümü içerir — madde madde, **tıklama düzeyinde** (hangi ekran, hangi
düğme, hangi rakam beklenir). Kullanıcı listeyi okuyup uygulayabilmeli;
"test et" demek yeterli değildir.

Bir paket Halil testini geçmeden sıradaki pakete GEÇİLMEZ.

## "KURAL DOĞRU MU" DEĞİL, "KURAL TESLİM EDİLEBİLİR Mİ" (KESİN KURAL)

_Ders 16.08.2026._ Saf kural testi (matematik, mantık) geçse bile, kuralın
sistemde **yerine getirilebileceği VARSAYIMI ayrıca sınanmalıdır.** Doğru
hesap, teslim edilemeyen bir sözün üstünde durabilir.

**Ayrı sorulacak sorular — ekran-veri bağı:**
- Gösterdiğim link **var olan** bir ekrana mı gidiyor?
- Kullanıcıya "şunu tanımla" diyorsam, onu tanımlayacak **ekran var mı**?
- Beyan ettiğim sınır (dosya boyutu, adet, süre) sistemin **gerçekten
  taşıyabildiği** sınır mı?
- Saydığım küme ile tıklanınca açılan listenin kümesi **aynı** mı?

**Bu tuzağın ailesi — üçü de aynı kökten:**
1. **`varyantAra`** — arama kuralı doğruydu ama Kanal SKU'yu hiç sormuyordu;
   "sabit = sabit" varsayımı sınanmamıştı.
2. **RMA dosya tavanı** — "5 MB kabul edilir" testi geçiyordu, taşıma
   tavanı 1 MB'tı. Test, sistemin tutamayacağı bir sözü doğruluyordu.
3. **Kart faizi kategori linki** — form "ayarlardan ekle" diyordu; o ekran
   gider kategorisi yönetmiyordu ve gider kategorisi ekleyecek ekran **hiç
   yoktu.** Uyarı çıkmaza götürüyordu.

> **MİMAR TALİMATLARI DA BU SÜZGEÇTEN GEÇER.** Mimar "link göster" derse,
> o linkin **hedefi var mı** diye sorulur. Talimat niyeti söyler; niyetin
> sistemde karşılığı olup olmadığını kontrol etmek uygulayanın işidir.
> Karşılığı yoksa yapılacak şey talimatı sessizce uygulamak değil,
> **eksiği bildirip niyeti karşılayan yolu önermektir.**

## Commit düzeni
- Depo: https://github.com/technsug-ops/axc — ana dal `main`
- Her anlamlı iş biriminde commit at; günün sonunda değil, iş bitince
- Bir aşama (ör. "ürün ekranı") bittiğinde mutlaka commit + push
- Büyük bir işe başlamadan önce mevcut durum temizse commit at (geri dönüş noktası)
- Mesaj formatı: `tip: kısa Türkçe açıklama`
  - `feat` yeni özellik · `fix` düzeltme · `chore` altyapı/temizlik
  - `refactor` davranış değişmeden iyileştirme · `docs` belge
  - Örnek: `feat: ürün listesi ve yeni ürün formu`
- Migration dosyaları HER ZAMAN commit'e dahil edilir
- ASLA commit'e dahil etme: `.env*`, `node_modules`, `.next`
- Push öncesi kontrol listesi:
  1. `git status` çıktısında `.env` geçmiyor
  2. `git log --all -S "<parola>"` ile geçmişte sır aranmış ve temiz
  3. Sır bulunursa push ETME, önce kullanıcıya bildir
- **Deploy sonrası: `npm run canli:yetki`.** Senkron + bekçi tek komutta;
  bekçi kırmızı yanarsa ekran canlıda sessizce kayıp demektir (bkz.
  Güvenlik katmanları → Yetki iki bacaklıdır).

@AGENTS.md
