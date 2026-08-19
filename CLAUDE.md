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

15. TEK TEK GÖSTERİLEN YERDE TOPLAM DA OLUR: Para ya da adet taşıyan bir
    liste satır satır gösteriliyorsa, **o listenin toplamı da bir yerde
    görünür.** Toplam **süzgeçle birlikte değişir** — ekranda ne varsa
    onun toplamıdır; "hepsinin toplamı" değildir. Süzgeç "Bugün" ise
    bugünün toplamı yazar.
    _17.08.2026: kullanıcı KDV dengesi için aylık alım tutarını takip
    ediyor ve rakamı satırlardan kafadan topluyordu (3 satır: 7.558,20 +
    7.558,20 + 7.498,20 = 22.614,60). Sistem zaten biliyordu, söylemiyordu._
    Kural alım/satış/gider/iade gibi TUTAR taşıyan bütün listelere işler.
    Sayfalama varsa toplam **görünen sayfanın değil, süzgecin tamamının**
    toplamıdır ve bu ekranda yazar.

YENİ EKRAN KONTROL LİSTESİ: Her yeni ekran tesliminde bu 15 maddeye
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

### VİZYONU KAYDETMEK YETMEZ — EVRİLEBİLİRLİK SINANIR

_Ders 16.08.2026._ Aynı süzgecin **geleceğe dönük** hâli: "bu yapı ileride
şuna evrilecek" demek bir İDDİADIR ve iddia, **gerçek göç senaryosu
denenmeden doğru sayılmaz.**

Destek modülünde yaşandı. Sözleşme doğruydu ("Faz 1 dar olsun ama Faz 2'ye
mesaj dizisine temiz evrilsin"), tasarım da makul görünüyordu. Ama Faz 2'nin
göç sorgusu **yazılıp denenince** boşluk çıktı: `cozumNotu` notun YAZARINI
ve ZAMANINI tutmuyordu, dolayısıyla `INSERT ... SELECT` kurulamıyordu ve
göçün adı "temiz migration" değil **"yeniden yazım"** olurdu — tam
kaçınılmak istenen şey. (`updatedAt` işe yaramıyordu: her durum
değişikliğinde eziliyor ve notun yazıldığı anı değil kaydın en son
dokunulduğu anı söylüyor.)

**KURAL:** İleri uyumluluk iddiası taşıyan her teslimde,
1. Gelecekteki göç sorgusu/adımı **bugünden yazılır**,
2. **Gerçek veriyle prova edilir** (salt-okunur; hiçbir şey yazmaz),
3. Kurulamayan satır varsa eksik alan **bugün** eklenir.

"Sonra düşünürüz" denen alan, sonra düşünüldüğünde veri çoktan onsuz
birikmiştir; o noktada eklemek geçmişi uydurmak ya da kaybetmek olur.

### YÖNETİLEMEYEN BAĞIMLILIK — ÜÇÜNCÜ ŞANS VERİLMEZ (KESİN KURAL)

_Ders 19.08.2026._ Bir dış bağımlılık **iki kez** sessizce başarısız
olduysa ve **teşhis tavana dayandıysa** — yani neden başarısız olduğunu
görecek aracımız yoksa — o bağımlılığa üçüncü şans verilmez. **Kontrol
edilebilir alternatife geçilir.**

**Vaka:** Vercel Cron 18 ve 19.08'de hiç tetiklenmedi. Dört katman tek tek
ölçüldü ve hepsi temiz çıktı (yol · tanım geçmişi · ara katman · kimlik
kontrolü). Ayırt edici test `YETKISIZ` döndü: uç açık, sır mevcut,
doğrulama çalışıyor. Geriye zamanlayıcının kendisi kaldı — **ve Hobby
planında logu olmadığı için ne olduğu ÖĞRENİLEMEZ.**

**ÖLÇÜT — üçü birden varsa geç:**
1. Başarısızlık **tekrarladı** (bir kez tesadüf, iki kez örüntü).
2. Bizim tarafımız **ölçüldü ve temiz.**
3. Karşı tarafta **teşhis aracı yok** — bir daha olursa yine bilemeyeceğiz.

**Geçerken:** eski bağımlılık **tanımda bırakılabilir** (bedava
yedeklilik), ama **birincil sayılmaz.** Şart: işin **idempotent** olması —
çift tetiğin zararsız olduğu ÖLÇÜLMELİ, varsayılmamalı. _Bu vakada
ölçüldü: dosya adı güne sabit (`selliora-{gün}.json`), `addRandomSuffix:
false` + `allowOverwrite: true`, ve yazma ancak içerik TAM üretildikten
sonra yapılıyor — ikinci tetik aynı dosyayı tazeler, kopya üretmez._

**Ve kaçışın kendisi görünür kılınır:** yeni zamanlayıcı da kaçırabilir.
Var olanı listelemek, olmayanı göstermez — eksik günler ekranda kırmızı
yazmalı ki üçüncü kaçış birinin fark etmesine kalmasın.

### SUSTURMA, KAYDIN HÂLİNE BAĞLANIR (KESİN KURAL)

_Mimar kararı 19.08.2026, K6._ Bir uyarı bir kayıt için susturulabiliyorsa
susturma **kalıcı olamaz**: kaydın O GÜNKÜ değerlerine damgalanır. Değerler
değişirse susturma **düşer** ve uyarı yeniden yanar.

Kalıcı muafiyet, tam kaçındığımız şeyi üretir: susturulmuş bir kayıt
sonradan **gerçekten bozulduğunda** hiç konuşmaz. Doğrulanan şey kayıt
değil, **o kaydın o hâlidir.**

**Uygulama kuralları:**
- Damga **sunucuda** kurulur; istemciden gelen değer damgalanmaz (aksi
  hâlde bugünkü değerlere uydurulmuş bir damga kaydı susturur).
- Karşılaştırma **kuruşuna**. Tolerans, "ne kadar değişirse yeniden
  sorulur" diye ikinci bir uydurma eşik açardı. _Kuruşa yuvarlama tolerans
  DEĞİL birim seçimidir: `Decimal`→float kuyruğu susturmayı haksız yere
  düşürürdü._
- **Çözülemeyen iz susturmaz.** Bozuk bir kayıt "doğrulanmış" sayılsaydı,
  bozuk JSON bir kalemi sonsuza kadar sessizleştirebilirdi.
- Sebep **kapalı kümeden**, "diğer" ise açıklama zorunlu. Sebepsiz
  susturma, üç ay sonra "bunu neden geçmiştik" sorusuna cevap bırakmaz.
- **Kapsam dar tutulur.** Her uyarı susturulabilir olmaz: gerçek hata
  sınıfları (ör. şüpheli komisyon oranı) doğrulanamaz. Genel bir "sustur"
  düğmesi, uyarı merkezini kendi kendini iptal eden bir sisteme çevirir.
- Eski iz **silinmez**, yenisi yazılır ve en yenisi okunur — bir istisnanın
  kaç kez geri geldiği kendi başına bilgidir.

### İMKÂNSIZ GÖRÜNEN DEĞER ÖNCE DOĞRULANIR — DÜZELTİLMEZ (KESİN KURAL)

_Ders 19.08.2026, OneBlade vakası._ Bir uyarının görevi **baktırmaktır**,
hüküm vermek değil. Bakınca gerçek çıkan istisna **işaretlenir ve yaşar**;
sistemin "imkânsız" demesi, verinin yanlış olduğunu KANITLAMAZ.

**Vaka:** Philips OneBlade `₺27,16` maliyetle `%3612` sermaye verimi
gösterdi. İki bağımsız ölçüt aynı satırda buluştu, "virgül hatası"
hipotezi kuruldu, düzeltme yolu (`canli:maliyet-hizala`) yazıldı ve
Halil'e "maliyeti düzelt" tarifi verildi. Halil HB sipariş geçmişinden
doğruladı: ürün **hediye kuponuyla** alınmış, kasadan fiilen `27,16`
çıkmış. **Rakam gerçek, `₺981` kâr gerçek.**

Bir adım daha gidilseydi doğru bir kayıt "düzeltilerek" bozulacaktı —
ve bozulma, düzeltme kılığında geldiği için hiç fark edilmeyecekti.

> **KURAL:** aykırılık bir HÜKÜM değil, bir DAVETTİR. Sıra şudur:
> **işaretle → baktır → doğrula → (gerçekse) işaretini kaldır ve yaşat.**
> "Düzelt" adımı ancak doğrulama HATA derse gelir.

**KARDEŞ KARAR — kasa gerçeği gömülmez.** Kupon etkisi maliyete
yedirilmez: Selliora **fiilen ödeneni** taşır, FIFO da onu taşır. Ürünün
"piyasa değeri" ile "bize maliyeti" farklı şeylerdir ve defter ikincisini
yazar. _(Mimar kararı 19.08.2026.)_

**YAPISAL SONUÇ — SONSUZA KADAR YANAN UYARI OLMAZ.** Gerçek çıkan bir
istisna işaretlenemiyorsa uyarı hiç sönmez; sönmeyen uyarı okunmaz olur
ve rozetin tamamına olan güveni götürür. Bu yüzden her "şüpheli"
uyarısının bir **DOĞRULANDI** yolu olmak zorundadır — ve doğrulama,
kaydın o günkü değerlerine bağlanır ki değer değişince yeniden sorulsun.

**AYRICA — ÖLÇÜT DE ÇÜRÜDÜ.** Aykırı değer `canli:bekleme-olcum`'da
Aşama B'yi KİLİTLİYORDU. Gerçek bir istisna sonsuza kadar kilitlerdi ve
düzeltilecek bir şey yoktu. Aykırı artık **ortalamadan dışlanır**
(istisna ortalamayı temsil etmez) ve **beyan edilir** (kaybolmaz); kilit
yalnız gerçekten kaba olan eksende kalır.

### EŞİK, DAĞILIMIN GEDİĞİNE KONUR — GÖVDESİNE DEĞİL (KESİN KURAL)

_Ders 19.08.2026._ Bir uyarı eşiği seçilirken sorulacak soru "hangi sayı
makul görünüyor" değil, **"ölçülen dağılımda nereye düşüyor"**dur.
Gövdenin içine düşen eşik **her satırda yanar** ve yanan uyarı okunmaz
olur — uyarının kendisi gürültüye dönüşür.

**Vaka — alt dilim önerisinde "sınır uzak" eşiği.** Ölçüm (n=18, tarifesi
ve satışı olan ürünler):

    min %5,1 · ortanca %14,2 · p75 %20,6 · [GEDİK] · %30,6 · %35,9 · %41,3 · %45,6

Gövde `%5–%20,6` (18 ürünün 14'ü), sonra `%30,6`'ya **sıçrıyor**. Eşik o
gediğe konuldu: **%25**. Bugün 4 üründe yanıyor ve dördü de gerçekten
büyük kesinti. `%15` seçilseydi çoğu üründe yanardı; `%60` seçilseydi
hiç yanmazdı — ikisi de aynı ölçüde işe yaramaz.

**Aynı kural aynı gün ikinci kez kullanıldı:** `veri-supheli.ts`'te verim
eşiği p95'in (`%154`) üstüne, `%200`'e konuldu; `%100` seçilseydi meşru
bir yüksek marjlı kalemi ilk gün yanlış işaretlerdi.

**YÖNTEM — üç adım, atlanmaz:**
1. Dağılımı **ölç** (min · p25 · ortanca · p75 · p90 · p95 · max).
2. **Gediği ara** — gövdenin bittiği yer eşiğin yeridir; yuvarlak sayı
   değil.
3. Eşiği **kaynağıyla yaz** (`MESAFE_OLCUMU`, `SUPHE_OLCUMU` deseni:
   tarih · örneklem · yüzdelikler) ve testi eşiğin gövdeyle sıçrama
   ARASINDA kaldığını sabitlesin.

Örneklem büyüyünce eşik yeniden ölçülür (bkz. BEKLEYENLER → K6).

### METİN, SAHİP OLMADIĞI ANLAMI İDDİA ETMEZ (KESİN KURAL)

_Ders 19.08.2026._ Bir sayının yanındaki cümle, o sayının **gerçekten
ölçtüğü şeyi** söylemek zorundadır. Doğru sayı + yanlış cümle = yanlış
bilgi; üstelik sayı doğru olduğu için kimse şüphelenmez.

**Vaka:** uyarı _"67 hakediş kalemi **satışa bağlanamadı**"_ diyordu.
Bağsız kalem toplamı **658**'di; 67 ise **gecikme sayımından ÇIKARILAN**
kalem sayısıydı. Cümle, sayının taşımadığı bir anlamı iddia ediyordu ve
okuyan "demek 67 kalem bağsız" diye anlıyordu — 591 kalem yanlış tarafa
yazılmış oluyordu.

Düzeltilmiş hâli: _"67 hakediş kalemi **gecikme sayımı dışında**"_.

> **KONTROL SORUSU:** bu cümledeki sayıyı üreten sorguyu okusam, cümle
> onu mu anlatıyor? Anlatmıyorsa cümle değişir — sayı değil.

### SONDA PARAMETRESİ EKRANIN PARAMETRESİ DEĞİLDİR (KESİN KURAL)

_Ders 19.08.2026._ Bir rakamı ölçüp rapora yazarken, **ölçümün ekranla
AYNI parametreden üretildiği** doğrulanmalıdır. Aksi hâlde iki doğru sayı
çelişiyormuş gibi görünür ve olmayan bir hata aranır.

**Vaka:** muafiyet sayısını sonda ile ölçüp **83** yazdım; ekran **67**
diyordu. İkisi de kendi sınırında doğruydu — sonda `new Date()` (şu an),
ekran `bugun` (iş takvimi günü) kullanıyordu. Vadesi BUGÜN dolan 16 kalem
aradaki farktı ve vadesi bugün dolan kalem henüz gecikmiş değildir.

> **Ayrışan şey ölçüt değil, RAPORDU.** "Rapor sayısı, ekranın koşuluyla
> aynı parametreden üretilmeden ekran sayısı diye yazılmaz."

Yapısal çaresi: koşulu **tek gövdeye** almak (`gecikmeKosulu`) ve iki
sayının yalnız tek bir alanla ayrıldığını **testle** sabitlemek. Sonda da
o gövdeyi çağırırsa fark doğamaz.

### SİSTEM, KENDİ DEFTERİNDE TAKİP ETMEDİĞİ ŞEY HAKKINDA İDDİA KURMAZ (KESİN KURAL)

_Ders 19.08.2026._ İçe aktarılmış bir rapor satırı, bizim defterimizde
takip edilen bir kayıt DEĞİLDİR. Onun üzerine hüküm kurmak — "gecikti",
"eksik", "ödenmedi" — bilmediğimiz bir şeyi iddia etmektir.

**Vaka:** çan _"67 hakediş kalemi gecikti · ₺137.975"_ diyordu. Ölçüm: üç
hakediş partisinin **177 farklı sipariş numarasının HİÇBİRİ** bir satış
kaydıyla eşleşmiyordu — en yeni parti dahil. Kanal çoktan ödemiş olabilir;
sistem bunu bilemez. Her gün taşınan ₺138K'lık sahte panik, rozete olan
güveni bitirirdi.

> **ÖLÇÜT:** gecikme yalnız `saleId` dolu kalemde iddia edilir. Bağsız
> kalem alacak değil, **rapor satırıdır**.

⚠ Mimarın ilk teşhisi ("tarihsel damgalı partiler muaf tutulsun")
**ölçümle reddedildi**: şemada öyle bir alan yok, `periodStart/End` üç
partide de boş. Talimatın niyeti doğruydu, mekanizması sistemde yoktu —
"mimar talimatları da bu süzgeçten geçer" kuralının bir örneği daha.

**Ve kural kalkmaz, KAPSAM daralır:** bağlanmış + gecikmiş kalem hâlâ
kırmızıdır. Bağlama çalışır çalışmaz sayı kendiliğinden doğruya döner.

### MUAFİYETİN UYGULANMASI VE BEYANI AYRI SINANIR (KESİN KURAL)

_Ders 19.08.2026, mutasyon bulgusu._ Bir kaydı sayımdan çıkarmak ile
çıkarıldığını SÖYLEMEK iki ayrı davranıştır ve **ayrı ayrı sınanmalıdır.**

Muafiyeti beyan eden sayıyı sabit `0`'a çeviren mutasyon **yeşil kaldı**:
kural doğru çalışıyordu, yalnız ekrana bağlanması kopmuştu. O hâlde
₺138K hiçbir yerde görünmeden yok olurdu.

> **Doğru davranışın GÖRÜNMEZLİĞİ de yalancı yeşildir.** "Kural doğru
> çalışıyor" testi, "kuralın sonucu kullanıcıya ulaşıyor" testinin yerine
> geçmez. Sessiz muafiyet, muafiyetsizlikten daha tehlikelidir: ilkinde
> rakam yanlış, ikincisinde rakam yok ve kimse aramıyor.

### DÜZELTME YOLU, TÜM OKUYUCULARA ULAŞTIĞI ÖLÇÜLMEDEN "VAR" SAYILMAZ (KESİN KURAL)

_Ders 19.08.2026._ Bir veriyi düzeltecek ekran/akış yazılmış olması, o
verinin düzeldiği anlamına gelmez. Aynı veriyi **birden çok yer okuyorsa**,
düzeltme yolunun onların HEPSİNE ulaştığı **ölçülmelidir.** Ulaşmadığı
yer, düzeltmeden sonra **eski değeri taşımaya devam eder** — ve artık
ekran doğru göründüğü için kimse oraya bakmaz.

**Vaka:** alım düzenleme ekranı birim maliyeti değiştirince
`PurchaseItem`i ve `StockMovement WHERE purchaseItemId = ...` satırlarını
güncelliyordu. Bu doğru görünüyordu. Ölçüm:

> **Canlıda 49 negatif hareketin `0` tanesinde `purchaseItemId` dolu.**

Çıkışlar partiye `sourceMovementId` ile bağlı; güncelleme onlara HİÇ
ulaşmıyordu. Kâr motoru maliyeti tam o çıkış damgasından okuduğu için
sonuç şuydu: **alım düzeltilir, alım ekranı doğru gösterir, NET-2 eski
yanlış maliyetle kalır.** "Yeniden hesapla" düğmesi de kurtarmıyordu —
o da aynı bayat damgayı okuyor.

**KURAL — düzeltme yolu teslim edilirken üç soru:**
1. Bu veriyi **kaç yer okuyor**? (kopyası, snapshot'ı, damgası var mı)
2. Düzeltme onların **hepsine ulaşıyor mu** — ölçüldü mü, varsayıldı mı?
3. Ulaşmayan varsa **onu kapatan bir yol** ya da en azından **ayrışmayı
   gösteren bir bekçi** var mı?

Bekçisi: `npm run canli:maliyet-hizala` (rapor kipi ayrışmayı sayar).
"Kural doğru mu değil, kural teslim edilebilir mi" dersinin veri
yolları üzerindeki kardeşi.

### METADATA DÜZELTMESİ — DAR İSTİSNA (KESİN KURAL)

_Mimar kararı 19.08.2026._ Ledger dokunulmazlığı **miktar ve para**
içindir. Yanlış GİRİLMİŞ bir tarih gibi bir **metadata** hatası, ters
kayıtla düzeltilemez (ADJUSTMENT adet düzeltir, tarih düzeltmez) ve
kayıt silinemez (FIFO bağı `Restrict`).

**Üç şart birden sağlanırsa** izli betikle vaka-bazlı onayla düzeltilir:
1. Değişen alan **miktar ya da para DEĞİL**.
2. **Alternatifler ölçülüp elenmiş** — ekran var mı, ters kayıt işe yarar
   mı, silinip yeniden yazılabilir mi; hepsi denenmiş ve yazılmış.
3. **İz bırakılıyor** — `AuditLog`a eski ve yeni değer birlikte.

Ve betik **o kaydın kimliğine kilitli** olur; genel araç haline
getirilmez. Genel araç, istisnayı kurala çevirir.

### EŞİK GÜVENİLİRLİĞİN VEKİLİDİR — VEKİL GEÇİLSE DE ASIL SORULUR (KESİN KURAL)

_Ders 19.08.2026, bekleme maliyeti Aşama A._ Bir kapıya sayısal eşik
koymak, ölçmek istediğimiz şeyin **yerine geçen bir vekil** koymaktır.
Vekil kolay ölçülür; asıl olan odur sanılır. **Vekil geçildiğinde asıl
soru DÜŞMEZ, o zaman sorulur.**

**Vaka:** kapı "örneklem < 20 ise özellik bekletilir" idi. Ölçüm 40 kalem
buldu — eşik rahat geçildi. Ama asıl soru "bu rakam güvenilir mi"ydı ve
cevap HAYIRDI:
- Türetilmiş günlük oran, **ortalama mı ortanca mı** seçildiğine göre
  `%0,47` ↔ `%1,05` arasında oynuyordu — **2,30×**. Ekrana basılacak rakam
  veriyi değil, benim seçimimi söylerdi.
- Bir kalemin maliyeti **imkânsızdı** (Philips OneBlade `₺27,16` → `%3612`
  verim) ve basit ortalamayı tek başına `%116,7`'ye çekiyordu.

Kapı üç eksenli yapıldı: **örneklem · duyarlılık · aykırı değer**.

> **ÖLÇÜT: eşiği geçmiş olmak, sağlam olmak değildir.** Eşik "yeterince
> veri var mı" diye sorar; sağlamlık "bu veriden çıkan rakam seçimden
> bağımsız mı" diye sorar. İkincisi sorulmadan hiçbir türetilmiş rakam
> ekrana çıkmaz.

**KARDEŞ KURAL — GÖRÜNEN ≠ GÖRÜLEN.** `₺27,16`'lık maliyet günlerce
iptal önizleme ekranında yazılıydı; kimse görmedi. Ekranda olmak
fark edilmek değildir. **İmkânsız değerler kendini işaretlemelidir** —
bir insanın dikkatine bel bağlayan doğrulama, doğrulama değildir.
_Uyarı Merkezi Faz 2 adayı: verim/maliyet aykırılık sinyali._
Bu, "kaydedilen ≠ görünen" dersinin bir adım ilerisi: kaydedildi,
görüntülendi, yine de görülmedi.

### ŞEMA DEĞİŞİKLİĞİ EN PAHALI ÇÖZÜMDÜR (KESİN KURAL)

_Ders 18.08.2026._ Yeni tablo/sütun, çözüm sıralamasının **en sonundadır**.
Bedeli koddan ibaret değil: SQL onayı · canlı koşum · damga · push
disiplini · geri dönüşün zorluğu. Ucuzu varken pahalıya gidilmez.

**Vaka:** komisyon yükleme sonuçları hiçbir yere yazılmıyordu ve envanter
"yükleme koştu ama değişiklik yoktu" ile "yükleme hiç koşmadı" ayrımını
yapamıyordu. Çözüm olarak `KomisyonYuklemesi` tablosu önerildi ve
**onaylandı**. Sonra ölçüldü: `AuditLog` bu işi olduğu gibi yapıyor —
`userId` · `createdAt` (indeksli) · `targetType/targetId` · `detail`
(serbest metin) · `action` (indeksli). Migration, onay, canlı koşum ve
damga **tamamen gereksizmiş**.

**SORU SIRASI — yukarıdan aşağı, ilk "evet"te dur:**
1. Mevcut bir alan/tablo bunu **zaten taşıyabiliyor mu**?
2. Serbest metin (JSON/`detail`) yeterli mi?
3. Türetilebilir mi (hesaplanır, saklanmaz)?
4. …ancak bundan sonra yeni sütun, en son yeni tablo.

**AYIRT EDİCİ SORU:** bu veriyle ne yapılacak?
· **Geriye bakmak** → serbest metin yeter.
· **SORGU** (gruplama, toplam, grafik, süzgeç) → yapı gerekir.
İhtiyaç sorguya dönüştüğü gün tablo açılır; önce değil.

> **ONAY DA BİR REFERANSTIR — VE REFERANS DOĞRULANIR.**
> Bu kalem mimar tarafından ONAYLANMIŞTI. Onaylanmış olması onu doğru
> yapmadı; ölçüm yanlış olduğunu gösterdi ve **kendi önerimi geri
> almak** doğru davranıştı. "Tutarlılık ≠ doğruluk" kuralının kardeşi:
> bir kararın onaylanmış olması, gerekçesinin sınanmasını durdurmaz.
> Onayı aldıktan sonra daha ucuz bir yol görülürse **bildirilir**;
> sessizce pahalı yola gidilmez.


### YENİ İZİN DOĞUM TARİHİ BEYAN EDİLİR (KESİN KURAL)

_Ders 18.08.2026._ Bir iz/kayıt mekanizması açıldığında, **açılmadan
önceki sessizliği VERİ sanmak** en kolay yanlış okumadır. "Kayıt yok"
cümlesi iki farklı şey söyleyebilir:

- **iz açıldıktan sonra:** o iş gerçekten yapılmadı → **hüküm**
- **iz açılmadan önce:** o iş yapılmış da olabilir → **hüküm DEĞİL**

**KURAL:** Yeni bir iz yayına girdiğinde, onu gösteren her ekran/araç
**izin doğum tarihini yazar** ve o tarihten öncesi için "kayıt yok"un
hüküm sayılmayacağını belirtir.

**Vaka:** `AuditLog` → `KOMISYON_YUKLEME` kaydı 18.08.2026'da açıldı.
Envanter aracı kayıtları basıyor; yanına _"iz 18.08'de açıldı, ondan
önceki günler için 'kayıt yok' hüküm sayılmaz"_ yazılmasaydı, geçmişe
bakan biri "13.08'de HB yüklemesi yapılmamış" derdi — oysa o gün 1056 HB
kaydı damgalanmıştı.

Bu, "kaydedilen ≠ görünen" ve "ölçüt de kaynağıyla anılır" derslerinin
zaman eksenindeki kardeşidir: **bir verinin yokluğu, ancak o veriyi
üreten mekanizma o sırada ÇALIŞIYORSA anlam taşır.**

### TUTARLILIK ≠ DOĞRULUK — ÖNCE REFERANSI DOĞRULA (KESİN KURAL)

_Ders 18.08.2026, Melontik demo vakası._ Bir karşılaştırmanın değeri
ölçülen tarafa değil **ÖLÇÜTE** bağlıdır. Doğrulanmamış bir referanstan
çıkan fark teşhis değil **gürültüdür** — ve en tehlikeli hâli, gürültünün
tutarlı görünmesidir.

**Vaka:** Melontik sunumundaki kâr rakamlarıyla NET-2 karşılaştırıldı, iki
siparişte fark çıktı, fark maliyet ve masraf diye ayrıştırıldı, **denklem
kapandı.** Kapandığı için ikna ediciydi ve sıradaki adım "kâr motoruna
eksik kesinti kalemi ekle" olacaktı. Sonra öğrenildi: sunumdaki rakamlar
**demo**; Melontik'e maliyetler düzgün girilmemiş. Yani doğru çalışan bir
motor, yanlış bir ölçüt uğruna bozulmak üzereydi.

- **Ölçütün gerçekliği ölçümden ÖNCE sorulur.** "Rakamı çıkarabildim"
  ile "rakam doğrulandı" aynı şey değildir.
- Referans bir dosyadan geliyorsa **kaynağı ve güvenilirliği kayda
  yazılır**; araç onu ekrana basar ve şüpheliyse **hüküm vermez**
  (`veri/ozel/*.json` → `_UYARI` alanı deseni).
- **Türetilmiş büyüklükler referansın güvenilirliğini MİRAS ALIR.** Demo
  orandan türeyen maliyet de demodur; ondan kurulan denklemin kapanması
  hiçbir şey kanıtlamaz.
- Kardeş kural: kendi kendini doğrulayan ölçüm ölçüm değildir. NET-2'yi
  kâr motoru hesaplar, ekran gösterir, test sınar — üçü de aynı kaynaktan
  besleniyorsa **bağımsız doğrulama yapılmamış** demektir.

> **BAĞIMSIZLIK, KAYNAĞIN AYRILIĞIYLA ÖLÇÜLÜR — YOLUN AYRILIĞIYLA DEĞİL.**
> _Mimar düzeltmesi 19.08.2026._ Tarife yazımından sonra "iki bağımsız yol
> aynı sonucu verdi" dedim: `dilimBul(1999)` %18, `ChannelSku.commissionRate`
> %18. **Yol** ayrıydı (biri dilim tablosundan türetildi, öteki yükleme
> ekranından geldi) ama **KAYNAK aynıydı** — ikisi de Trendyol'un kendi
> beyanı, iki ayrı ihracı.
>
> O tutma değerlidir ama söylediği şey dardır: _bizim yolumuz doğru
> çalışıyor ve dosyalar kendi içinde tutarlı._ **Doğruluk kanıtı değildir.**
> Gerçek bağımsız teyit, kanalın FİİLEN kestiği komisyondur — hakediş
> dosyası. Kaynak değişmedikçe kaç yoldan geçtiğinin önemi yoktur.

### ÖRNEK VERİ AYRIMIN İKİ YAKASINI GÖSTERMELİ (KESİN KURAL)

_Ders 19.08.2026, üç kez arka arkaya._ Bir kuralı sınayan test verisi,
kuralın **ayırdığı iki durumu birbirinden farklı sonuca götürmelidir.**
Ayrışmayan örnek, **kuralı değil TESADÜFÜ sınar** — ve mutasyon yeşil
kalır.

**Aynı gün üç vaka:**
- _"Dilim BİRİM fiyattan çözülür, ciroya göre değil"_ → `1.000 × 3` ile
  sınandı; 1.000 de 3.000 de aynı dilimdeydi. `700 × 3` yapıldı (birim
  3. dilim, ciro 1. dilim) ve mutasyon kırmızıya döndü.
- _"Barkod kırpılır"_ → test okuyucudan geçiyordu, o zaten kırpıyordu;
  plan katmanının kırpması hiç çalışmıyordu.
- _"Yuvarlama kuruş tozunu siler"_ → tek maliyetle sınandı; `2c − c`
  kayan noktada TAM çıkıyor. Farklı maliyetli parti gerekti.

**KONTROL SORUSU:** _bu kuralı kaldırsam test kırmızı yanar mı?_ Cevap
"emin değilim" ise örnek veri ayrımı göstermiyordur. Mutasyon denemesi
bu sorunun mekanik hâlidir ve **yeşil kalan mutasyon, testin değil
VERİNİN kusurudur** — kod doğru, örnek kör.

### ÖLÇÜM İKİ DEFTERİ DE ÖLÇMELİ (KESİN KURAL)

_Ders 17.08.2026._ Bir işlem birden çok deftere yazıyorsa, testi de o
defterleri **birlikte** sınamalıdır. Tek defteri ölçen test, öbürü sessizce
ayrışırken yeşil yanar.

**Vaka:** satış adedi 1→2→1 çevrildi. **Stok defteri** doğru döndü ve stok
simetrisi zaten test ediliyordu. **Kâr defteri** dönmedi: maliyet yalnız
`SALE_OUT` satırlarından toplanıyordu, adet azalışının ayna girişi
(`ADJUSTMENT`) süzgece takılıyordu. NET-2 +₺695 kârdan −₺1.304 zarara düştü
ve ekranda 1 adetlik satış 2 adetlik maliyetle duruyordu.

- Testi **başlangıca dönüş** üzerine kur: gidiş-dönüş sonrası rakam
  başlangıca **kuruşuna eşit** olmalı.
- **Defterlerin birbiriyle tutarlılığını da yaz** (`maliyet = net adet ×
  birim`); ayrı ayrı doğru olup birbirinden kopmaları tam olarak yaşanan
  hataydı.
- Simetri testini **tek değerle yazma**: 2×c − c kayan noktada TAM çıkar,
  yuvarlamayı sınamaz. Farklı maliyetli parti kullan.

**KARDEŞ KURAL — TİP LİSTESİ DEĞİL, BAĞ.** "Şu tipleri say" diyen her
süzgeç, yarın eklenecek tipi sessizce dışarıda bırakır. Ölçüt bağ olmalı:
_hareket bu kaleme bağlıysa o kalemin akışıdır_ ve işaretiyle girer. Aynı
süzgeç sekiz yerde vardı; dördü hatalıydı.


## DEPLOY EDİLEN KOD, KOŞULMAYAN MIGRATION (KESİN KURAL)

_Ders 17.08.2026._ Migration onay disiplini, **kodun deploy disiplinini de
kapsar.** Migration'ı bekletmek, ona bağlı KODU da bekletmek demektir.

**Vaka `8cb0023`:** şemaya `Sale`'in dört iptal sütunu eklendi ve push
edildi. SQL onay bekliyordu, canlıda koşmadı — ama kod deploy oldu. Prisma
her `Sale` okumasında canlıda olmayan sütunu istedi; `Sale` okuyan **her
ekran 500 verdi.** Tek push'la canlı yattı.

> **KURAL:** Şema commit'i, migration canlıda koşana kadar PUSH EDİLMEZ.
> Zorunluysa ayrı dalda bekler. Kod, şemasının önüne geçemez.

**BEKÇİ — `scripts/deploy-bekci.ts`.** Disiplin bu oturumda üç kez
tutmadığı için kural yapısal: `prebuild` olarak Vercel'de her deploy'dan
önce koşar, kırmızı yanarsa **build durur.** Üç katman:

- **A) Şema ↔ migration dosyaları.** Şemada alan var, migration yazılmamış.
- **B) Migration dosyaları ↔ canlı damgası.** Dosya var, canlıda koşmamış
  — `8cb0023` vakası tam budur.
- **C)** Bağlantı varsa canlı doğrulaması (`canli:migrate` adım 5).

**DAMGA ELLE TUTULMAZ:** `prisma/canli-migrasyon-damgasi.json`'ı
`npm run canli:migrate` başarıyla bitince kendisi yazar. Sebebi çift:
build makinesi canlıya bağlanamayabiliyor (KAS uzak erişimi IP listesine
bağlı) ve elle tutulan liste er ya da geç kendi geçmişini doğrulayan bir
törene dönüşür. Damga **commit edilir**.

**Bekçi karar veremiyorsa bunu YAZAR** (damga yoksa "atlandı" der), sessiz
yeşil vermez.

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
- **ŞEMA COMMIT'İ, MIGRATION CANLIDA KOŞANA KADAR PUSH EDİLMEZ** — ya da
  ayrı dalda bekler. (Gerekçe ve vakası için bkz. "Deploy edilen kod,
  koşulmayan migration".) Bekçisi: `npm run deploy:bekci`, `prebuild`
  olarak her deploy'dan önce **kendiliğinden** koşar.
- ASLA commit'e dahil etme: `.env*`, `node_modules`, `.next`
- Push öncesi kontrol listesi:
  1. `git status` çıktısında `.env` geçmiyor
  2. `git log --all -S "<parola>"` ile geçmişte sır aranmış ve temiz
  3. Sır bulunursa push ETME, önce kullanıcıya bildir
- **Deploy sonrası: `npm run canli:yetki`.** Senkron + bekçi tek komutta;
  bekçi kırmızı yanarsa ekran canlıda sessizce kayıp demektir (bkz.
  Güvenlik katmanları → Yetki iki bacaklıdır).

@AGENTS.md
