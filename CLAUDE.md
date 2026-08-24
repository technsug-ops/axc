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
  diğer iki ön şart için bkz. ARSIV.md → Canlıya geçiş ön şartları.)
- **VERİ SAHİPLİĞİ İLKESİ:** Müşteri verisini istediği an tam olarak
  dışa aktarabilir. **Onboarding = içe aktar, offboarding = dışa aktar;
  ikisi de birinci sınıf özelliktir**, sonradan eklenen eklenti değil.
  _Karar 09.08.2026._
- **PWA VAR, ÇEVRİMDIŞI YOK — BİLEREK (karar 22.08.2026).** Uygulama telefona
  kurulur (manifest + simge + servis çalışanı; `public/sw.js`), ama **veri
  önbelleklenmez.** Önbelleğe giren tek küme `/_next/static/` — adresinde
  içerik özeti olduğu için bayatlaması imkânsız. Ağ yokken rakam değil
  "Bağlantı yok" sayfası çıkar.
  _Gerekçe:_ önbellekten gelen bir panel DÜNKÜ NET-2'yi bugünkü gibi gösterir
  (kaynağı görünmez, yanlış olduğu anlaşılmaz) ve çıkıştan sonra aynı telefonu
  eline alan kişiye finansal ekran açar — kapı devreye girmez, cevap ağdan
  değil diskten gelir. **Bu kalem yeniden açılmaz**; "çevrimdışı çalışsın"
  istenirse cevap önbellek değil, ayrı bir *yazma kuyruğu* tasarımıdır.
  Bekçisi: `npm run pwa:dogrula`.
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
- **HİÇBİR DOĞRULAMA BORU SONUNA GÜVENMEZ.** `npm run x:dogrula | tail -2`
  yazıldığında çıkış kodu **`tail`den** gelir ve kırmızı test sessizce
  yutulur. 20.08.2026'da tam bu oldu: bir push, başarısız testle gitti.
  Doğrulama komutları çıkış koduyla kontrol edilir
  (`npm run x:dogrula > /dev/null 2>&1; echo $?`) ve push zinciri koda
  bağlanır.
- **PUSH ÖNCESİ `npm run bekci` KOŞULUR — BÜTÜN bekçiler, seçilmişler değil.**
  _Kullanıcı kararı 22.08.2026._ Depoda 42 doğrulama var ve hepsi çıkış kodu
  üretiyor; ama her teslimde rutin koşulan yalnız **yedisiydi** (simulasyon ·
  kar · panel · i18n · lint · tsc · build). Geri kalanı "dokunduğum alana
  göre" koşuluyordu ve sonuç şu oldu: **iki bekçi bir süredir kırmızı yanıyordu
  ve kimse görmüyordu** — `yerlesim:dogrula` ve `yedek:dogrula`.
  İkincisi en pahalı yerdeydi: tarife tabloları yedeğe hiç girmiyordu ve
  Trendyol'un tam dilimli ileri tarifesi arşivden **inmiyor**, yani kaybolsa
  yeniden üretilemezdi.
  **Tur ~65 saniye sürüyor.** Kod doğruydu; eksik olan koşma alışkanlığıydı ve
  _"bir dahaki sefere hepsini koşarım"_ bir çözüm değil bir niyettir.
  ⚠ Bekçi listesi `package.json`dan OKUNUR, elle tutulmaz — yoksa yarın
  eklenen bir bekçi listeye yazılmadığı için sessizce koşulmaz ve aynı hata
  bir kat yukarıda tekrarlanır.
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

### İLKE, KENDİ KAPSAMININ DIŞINA UYGULANIRSA HATAYI KORUR (KESİN KURAL)

_Mimar kararı 20.08.2026._ Doğru bir ilke, ait olmadığı yere uygulandığında
**koruduğu şey doğruluk değil, hata olur.** Bir kural savunulurken sorulacak
soru "bu kural doğru mu" değil, **"bu durum o kuralın kapsamına giriyor mu"**dur.

**Vaka:** satışın kanal hesabını değiştiren action kârı bilerek yeniden
hesaplamıyordu ve kodda şöyle savunuluyordu:

> _"Kâr snapshot'ı geçmişin kaydıdır; kullanıcı açıkça onaylamadan
> değişmemeli."_

İlke doğrudur — snapshot dokunulmazlığı bu deponun temel kurallarından
biri (oran sonradan değişse eski satışın hesabı kaymaz). **Ama kapsamı
şudur: DOĞRU koşullarla hesaplanmış bir snapshot'ı, sonraki değişikliklerden
korumak.** Yanlış kanalla hesaplanmış bir snapshot bu kapsama girmez:
orada korunan geçmiş değil, **hatanın kendisidir**.

Kanal değişince kesinti kuralları değişir (HB komisyona %20 KDV ekler +
₺12,60 hizmet; TY'de ₺13,19 sabit). Taşıma yapılıp kâr tazelenmeyince NET
eski kanalın kurallarıyla kalıyor ve ekranda **doğru görünüyordu.**

**KONTROL SORUSU:** bu ilke neyi korumak için kondu — ve elimdeki şey o mu?
Değilse ilke burada geçerli değildir; ilkeyi genişletmek onu güçlendirmez,
**körleştirir**.

⚠ **ESKİ GEREKÇE SİLİNMEZ.** Karar çevrildiğinde önceki savunma, NİYE
çevrildiğiyle birlikte dosyada bırakılır. Silmek, aynı gerekçenin altı ay
sonra yeniden keşfedilip yeniden uygulanmasına yol açar.

### KAYNAK TARAYAN KONTROL, DESENİ DOSYADA DEĞİL KULLANIM BLOĞUNDA ARAR (KESİN KURAL)

_Ders 19–20.08.2026, **beş tekrardan sonra**._ Bir ekran davranışını kaynak
metni tarayarak sınayan kontrol, aradığı deseni **dosyanın tamamında**
ararsa yalancı yeşil üretir. Desenin dosyada BULUNMASI, o davranışın
GERÇEKLEŞTİĞİNİ göstermez.

**İki bozulma biçimi — ikisi de aynı köke bağlı:**
1. **Koşul öldürülür, desen kalır.** `{false ? (` yapılan bir dal artık
   hiç çizilmez ama içindeki sözlük anahtarı dosyada durur.
2. **Aynı desen birden çok yerde geçer.** Birini bozan mutasyon ötekini
   ayakta bırakır; tarama ikincisini bulur ve yeşil kalır.

**DÖRT VAKA — hepsi mutasyonla yakalandı, hiçbiri değer testiyle:**

| # | Kontrol | Neden kör kaldı |
|---|---|---|
| 1 | Başabaş ekrana basılıyor mu | Render koşulu `{false ? (` yapıldı; `deneBasabas` anahtarı dosyada kaldı |
| 2 | Form K5 motorunu çağırıyor mu | `simulasyonKur(` deseni ALT DİLİM önerisinde de geçiyordu; hüküm satırı elle hesaba çevrilse bile desen ayaktaydı |
| 3 | Boş şüpheli mesajı süzgece bağlı mı | `p.veri === "supheli"` İKİ yerde (küme hesabı + boş mesaj); biri bozulunca öteki testi geçiriyordu |
| 4 | Kâr/zarar cümlesi maliyeti veriyor mu | `satis: bicim.para(fiyat` hem kâr hem zarar cümlesinde; birini silmek yakalanmıyordu |
| 5 | Kanal taşıması kârı tazeliyor mu | Sıra kontrolü `revalidatePath` arıyordu — o kelime **IMPORT satırında da** geçiyor; `indexOf` onu buluyor ve kontrol hep yanlış konuma bakıyordu |

**YÖNTEM — kontrol yazarken:**
0. ⚠ **ÖNCE DESENİ SAY.** Aradığın metin dosyada kaç kere geçiyor?
   Birden çoksa (import satırı · yorum · benzer çağrı · aynı yardımcının
   başka kullanımı) işaret **çağrı yerine** bağlanır, **ada değil**:
   `revalidatePath` değil ``revalidatePath(`/satislar/``;
   `karYenidenYaz(` değil `await karYenidenYaz({` satır başında.
1. Deseni **kullanım bloğuna daraltarak** ara: `metin.slice(baş, son)` ile
   ilgili dalı kes, sonra içinde ara.
2. Koşulu **sonucuyla birlikte** ara: `/p\.veri === "supheli"\s*\?\s*t\("bosSupheliVeri"\)/`
   — koşul da sonuç da aynı desende.
3. Aynı desen birden çok yerde geçiyorsa **her yeri ayrı ayrı** sına
   (döngüyle: `for (const [ad, blok] of [["kâr", karBloku], …])`).
4. **Kaynak SIRASINI ölçme, DAVRANIŞI ölç.** "A ile B arasında 400
   karakter yok" gibi bir kontrol yazıldı ve yanlış şeyi sınadığı için
   kırmızı yandı; doğrusu "kâr dalı öneriye varmadan erken dönüyor mu"
   idi.

> **VE HER KONTROL MUTASYONLA SINANIR.** Bu dördü de testler YEŞİLKEN
> yazılmıştı; körlüğü ortaya çıkaran tek şey mutasyon denemesiydi.
> Mutasyon sonucu GÖRÜLMEDEN push edilmez — yeşil test, sınanmış kontrol
> demek değildir.

### KONTROL TASARIMI, VERİ KAPSAMI DOĞRULANMADAN "FARK" ÜRETMEZ (KESİN KURAL)

_Mimar kararı 20.08.2026, K-5 kargo mutabakatı._ İki kaynağı karşılaştıran
her kontrolden önce sorulur: **iki taraf AYNI KÜMEYİ mi kapsıyor?**
Kapsamadıkları hâlde çıkarılan sayı "fark" değil **KAPSAM BOŞLUĞUDUR** —
ve fark diye okunduğu anda olmayan bir hata aranmaya başlanır.

**Vaka:** kargo mutabakatı için "Σ KARGO vs KARGO_FATURA" tasarlanmıştı.
Ölçüm iki şey gösterdi:
1. **93 `KARGO` satırının hepsi Hepsiburada, 4 `KARGO_FATURA` satırının
   hepsi Trendyol** — kıyas iki farklı kanalı karşılaştırıyordu.
2. Kanal bazına indirilse bile: TY temmuzda **₺12.521** kargo faturalıyor,
   bizim temmuz beklentimiz **tek satıştan ₺109,90**. Aradaki ₺12.411 bir
   kargo hatası DEĞİL; o dönemin satışları sisteme hiç girilmemiş.

"Yorumlanamaz" notu düşerek yayımlamak bile yetmez: rakam ekranda
durduğu sürece okunur, ve **doğru sayı + yanlış çerçeve = yanlış hüküm.**
Kontrol, kapsam kapanana kadar YAZILMAZ.

**KAPSAM SORULARI — kontrol yazılmadan önce:**
1. İki taraf aynı **kanalı/hesabı** mı kapsıyor?
2. Aynı **dönemi** mi?
3. Aynı **birimi** mi (sipariş başına ↔ toplu fatura)?
4. Bir tarafta olup ötekinde **hiç olmayan** kayıt var mı — ve oranı ne?
5. **AYNI OLAYI AYNI ZAMANDA mı görüyorlar?** _(eklendi 20.08.2026)_

Beşinden biri "hayır" ise üretilecek sayı farkı değil eksikliği ölçer.

⚠ **BEŞİNCİ SORU EN SİNSİSİ: VADE GECİKMESİ KAPSAM BOŞLUĞU GİBİ GÖRÜNÜR.**
Hakediş eşleştirmesinde üç turda üç kez `0` eşleşme çıktı ve her seferinde
başka bir katman suçlandı (anahtar biçimi · dosya dönemi · eksik giriş).
Gerçek sebep **takvimdi**: pazaryeri ödeme dosyası, siparişten **28–34 gün
SONRA** yayımlanıyor. "Ağustos dosyası" haziran/temmuz siparişlerini
taşıyordu; `0/188` bir kusur değil, **matematiksel zorunluluktu.**

Ölçüldü: TY sipariş→ödeme **ortanca 28 gün** (n=267, p25 23 · p75 32 ·
max 41) · HB **~34 gün** (24 iş günü, teslimden sonra başlar).

> Bir eşleştirme sıfır dönüyorsa, **önce iki tarafın olay ufkunu ölç**:
> aynı olaylar iki kaynağa aynı anda düşmüyor olabilir. Bunu ölçmeden
> "eşleştirme bozuk" ya da "veri eksik" demek, olmayan bir hatayı aramaktır.

### KOLON BAŞLIĞI BİR İDDİADIR — ÖDEME TARAFI

_Ders 20.08.2026._ Trendyol ödeme dosyasındaki **`İşlem Tarihi`** ödeme
günü DEĞİL: siparişten yalnız **1–4 gün** sonra, kaydın oluştuğu an.
Gerçek ödeme günü **dosya adında** duruyor (`OdemeDetay_TR_2026-08-11_…`).

İlk ölçüm bu alana güvendi ve "sipariş→ödeme 2 gün" gibi imkânsız bir
sonuç verdi. Alan adı makul görünüyordu ve tam da bu yüzden sorgulanmadı.

> **Bir alanın ADI, içeriğinin NE OLDUĞUNU söylemez.** Tarih alanları
> özellikle: `İşlem` · `Kayıt` · `Vade` · `Ödeme` aynı dosyada dört farklı
> ana işaret eder. Hangisinin aradığın olduğu, **değerlerin dağılımıyla**
> sınanır — makul görünen ilk alan seçilmez.


_"Tutarlılık ≠ doğruluk" ve "referansı doğrula" derslerinin kapsam hâli._

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

### UYARI SORAR, KULLANICI ISRAR EDERSE İSTİSNA KAYDEDİLİR (KESİN KURAL)

_Kullanıcı kararı 20.08.2026._ Bir uyarı gerçek bir riski gösteriyor ama
kullanıcı doğruyu daha iyi biliyorsa, iki kötü seçenek vardır: uyarıyı
kaldırmak (risk kör kalır) ya da kaydı engellemek (operasyoncu kilitlenir).

**Üçüncü yol:** uyarı **sorar**, kullanıcı **ısrar ederse** o kayıt
**istisna** olarak geçer ve **kural bozulmaz.**

**Şartlar:**
- **Eşik yerinde kalır.** Uyarı her seferinde çıkar; onay bir sonraki
  kayda taşınmaz. "Bir kez onayladım, artık sorma" yoktur.
- **Onay açıktır.** Kutu işaretlenmeden kayıt ilerlemez — "sorulsun"
  demek cevabı beklemek demektir.
- **Sebep ekranda yazar.** Kilitli düğme sessiz kalmaz (İlke #5): neden
  ilerlemediği ve nasıl ilerleyeceği yazılıdır.
- **İstisna İZ BIRAKIR.** "Devam edilsin" demek, kaydın sessizce geçmesi
  demek değildir; üç ay sonra "bu neden böyle" sorusunun cevabı olmalıdır.

_K6'nın (veri şüpheli → DOĞRULANDI) form içindeki kardeşi. Aradaki fark:
K6 geçmiş bir kaydı susturur ve kaydın HÂLİNE bağlanır; bu, kayıt
oluşurken sorar ve o SİPARİŞE bağlanır._

### KAPATMA KARARI DA PANOYA YAZILIR (KESİN KURAL)

_Ders 20.08.2026._ Bir kalemi **kapatma** kararı, açma kararı kadar kayda
değerdir. Konuşmada kalan karar **kapanmamış sayılır** — ve er ya da geç
yeniden sorulur.

**Vaka:** `min −28` (teslimi siparişten 28 gün önce damgalı alım) **üç
turda üç kez** soruldu ve üç kez aynı cevap verildi: bakılmayacak. Karar
her seferinde konuşmada kaldı, panoya yazılmadı; dördüncü kez sorulmasını
engelleyen hiçbir şey yoktu.

> **KURAL:** "bakılmayacak", "ertelendi", "gereksiz çıktı" da birer
> SONUÇTUR. Kalem panodan SİLİNMEZ; **kapalı olarak, GEREKÇESİYLE** durur
> ve gerekiyorsa _"bu kalem yeniden açılmaz"_ notunu taşır.

Gerekçe olmadan yazılan kapanış da yetmez: altı ay sonra bakan biri
gerekçeyi göremezse kalemi yeniden açar. _("Yeni izin doğum tarihi beyan
edilir" kuralının karar tarafındaki kardeşi.)_

### İŞARET KİMLİĞİN PARÇASI DEĞİLDİR (KESİN KURAL)

_Ders 20.08.2026._ Bir kayda aciliyet/durum işareti eklemek (`H3⚡`,
`K5*`, `H3b`) onu **yeni bir kayıt yapmaz.** `H3⚡` ile `H3` aynı
kimliktir; işaret yalnız bir vurgudur.

**Vaka:** BEKLEYENLER panosunda `H3` **üç kez**, `H4`·`H5`·`H7`·`H8`
**ikişer kez** geçiyordu — bir kısmı işaretli varyantlar olduğu için
"farklı" sanılmıştı. _"H3'e bak"_ demek üç satırdan hangisi belirsizdi;
kimlikler işlevsizdi.

> **KURAL:** kimlik TEKİLDİR. Aciliyet ayrı bir sütunda ya da metinde
> yaşar, kodun içinde değil. Aynı kimliği ikinci kez kullanmak, panoyu
> taranamaz hâle getirir.

_Bu kural elle atamayla korunamıyor: kimlik çakışması aynı gün içinde
tekrar üretildi (bkz. BEKLEYENLER → K10, kod atamasını otomatikleştir)._

### SİLME KARARI: İLKE İHLALİ DEĞİL, VERİ BOZAN İŞLEM (KESİN KURAL)

_Mimar düzeltmesi 20.08.2026._ "Kayıt silinmez" kuralı savunulurken
gerekçe **ilke** değil, **sonuç** olmalıdır. İlke tartışılabilir; bozulan
veri tartışılamaz.

**Vaka:** `sfsfsf` kodlu test satışı için "sil" istendi. Zayıf cevap
_"ledger dokunulmazlığı var"_ olurdu — bir test kaydı için istisna
açılabilirmiş gibi görünür. Güçlü cevap şemadan okundu:

- `Sale` → `SaleItem`: **Cascade** — kalemler de silinir
- `StockMovement` → `SaleItem`: **SetNull** — `saleItemId` boşalır

Yani satış silindiğinde **stok hareketleri KALIR ve hiçbir satışa bağlı
olmaz**: stok düşük kalır, **düşüren kaybolur**. Parti tüketilmiş görünür,
tüketen yoktur; maliyet damgaları sahipsiz kalır.

> **ÖLÇÜT:** "bu işlem hangi veriyi bozar" sorusu, "hangi ilkeyi çiğner"
> sorusundan daha güçlüdür ve tartışmayı bitirir. İptal aynı sonucu
> verir — kayıt ciroya/NET'e/hakedişe girmez, stok DOĞRU döner, geri
> alınabilir ve iz bırakır.

### BOŞ SONUÇ İLE TEMİZ SONUCU AYIRT EDEMEYEN DENETİM, DENETİM DEĞİLDİR (KESİN KURAL)

_Mimar kararı 20.08.2026._ Bir denetim aracının **hiçbir şey bulamaması**
iki apayrı şey olabilir:

- **temiz** — baktı, karşılaştırdı, sapma yok → **hüküm**
- **boş** — hiç bakamadı (kaynak okunamadı, kolon bulunamadı, eşleşme
  kurulamadı) → **hüküm DEĞİL**

İkisi ekranda aynı görünüyorsa araç, **en tehlikeli yalancı yeşili**
üretir: kimse bir daha bakmaz, çünkü "kontrol edildi" sanılır.

**Vaka:** `canli:oran-denetimi` rapordaki kolonları adıyla arıyor. Trendyol
başlıkları değiştirse, satır okunamaz, liste boş kalır ve çıktı **"sapma 0"**
derdi. Araç sessizce her koşumda yeşil yanardı.

Çare: kolon eksikse **hata fırlatılıyor** — denetim koşmuyor, "temiz"
demiyor.

**HER DENETİM ARACI ŞUNLARI AYRI SAYAR VE AYRI YAZAR:**
1. Kaç kayıt **incelendi**
2. Kaçı **temiz** çıktı
3. Kaçı **sapan**
4. Kaçı **incelenemedi** — ve NEDEN (kaynak yok · eşleşme kurulamadı ·
   belirsiz)

Dördüncüsü sıfırdan büyükse, sonucun kapsamı da o kadar dardır ve bu
**ekranda yazar**. _("Açık sıfır" ilkesinin denetim tarafı: hiçbir şey
bulunamadığında da NEDEN bulunamadığı söylenir.)_

### DIŞ KAYNAĞIN KENDİ ETİKETİYLE KARŞILAŞTIR — İÇ TUTARLILIK KAYMAYI GİZLER (KESİN KURAL)

_Ders 20.08.2026._ Dışarıdan gelen bir veriyi işlerken, çıktının **kaynağın
kendi yazdığıyla** karşılaştırılması gerekir. Kendi içinde tutarlı bir
çıktı, sistematik bir kaymayı **tamamen gizler**: bütün satırlar aynı
miktarda kaydığı için hiçbir iç kontrol kırmızı yanmaz.

**Vaka:** komisyon denetimi tarife pencerelerini `new Date(yıl, ay, gün)`
ile kuruyordu — **yerel** gece yarısı. `soldAt` ise veritabanında **UTC**
gece yarısı. TR'de aradaki 3 saat, pencereyi **bir gün geriye** kaydırdı.

Sonuçlar kendi içinde kusursuzdu: pencereler bitişikti, satışlar
pencerelere düşüyordu, sapma sayısı makuldü. Kaymayı gösteren tek şey
şuydu — **rapor `28-07` diyordu, çıktı `2026-07-27` yazdı.**

Ve kayma **sonucu tersine çevirmişti**: kaymalı hâlde `1 sapma · 6 sınır
günü`, düzeltilmiş hâlde `0 sapma · 2 sınır günü`. Yani yanlış bir bulgu
raporlanmak üzereydi.

> **KURAL:** dış kaynaktan okunan her etiket (tarih · kod · tutar) en az
> BİR kez, kaynağın kendi yazdığı hâliyle **göz göze** karşılaştırılır.
> "Rakamlar tutarlı görünüyor" bir doğrulama değildir.

⚠ **Saat dilimi hataları bu ailenin en sinsisidir:** değerler makul kalır,
yalnız yanlış kovaya düşer. Tarih penceresiyle çalışan her karşılaştırmada
iki tarafın da hangi saat diliminde kurulduğu **açıkça** yazılmalıdır.

### KAYDETME KARARI, TÜKETİCİSİ DOĞDUĞUNDA VERİLİR (KESİN KURAL)

_Mimar kararı 20.08.2026._ Dış bir veri elimize geçtiğinde ilk soru "nereye
kaydedelim" değildir. **Sığması, kaydedilmesi gerektiğini göstermez** — ve
karıştırma riski taşıyorsa sığması bir tehlikedir.

**Vaka:** Trendyol "İndirimli Komisyon Tarifeleri" raporu (74 satır).
Satır şekli `KomisyonTarifeKalemi`'ne **birebir oturuyordu**: `barkod` ·
`dilimSirasi` · `ustLimit` · `oran`, ve `altLimit` zaten nullable. Şemaya
girmek için hiçbir engel yoktu.

**Ama satırlar KISMİ:** rapor yalnız satış OLAN aralıkları taşıyor (74
satırın 71'inde tek aralık dolu). Aynı tabloya konsaydı
`satisTarihiTarifesi` onları **tam tarife sanıp** forma verirdi ve
`dilimBul` yanlış dilim döndürürdü. Yani kaydetmek, ayırt edici bir sütun
(`tur: YAYIN | GERCEKLESEN`) **zorunlu** kılardı.

Ve ölçüm asıl cevabı verdi: dosya bugün **bizim hiçbir satışımızı
kapsamıyor** (`0/39`). Kaydetseydik hiçbir sorgunun kullanmadığı 74 satır
ekler, bozma riskini **bedavaya** almış olurduk.

> **ÖLÇÜT:** bu veriyi BUGÜN kim okuyacak? Okuyanı yoksa kaydedilmez —
> betik okuma anında okur, karşılaştırır, raporlar. Tüketici doğduğu gün
> kaydetme kararı yeniden verilir, ve o gün de **yeni tablo değil, tek
> sütun** yeterli olabilir.

_K2'nin (yeni tablo yerine `AuditLog`) veri tarafındaki kardeşi: orada
"mevcut yapı taşıyor mu" soruldu, burada "taşıması gerekiyor mu"._

### DENETİM İÇİN "NE OLDU" DOĞRU REFERANSTIR, "NE OLACAKTI" DEĞİL (KESİN KURAL)

_Ders 20.08.2026._ Bir kaydın doğruluğunu sınarken referans, **kuralın
kendisi değil, kuralın FİİLEN nasıl uygulandığıdır.** İkisi aynı sanılırsa
doğru kayıt yanlış ilan edilir.

**Vaka — iki dosya, iki farklı iş:**

| Dosya | Ne der | Neye yarar |
|---|---|---|
| Salı/Cuma **tarifesi** | _"şu aralıkta şu oranı alırım"_ · ileri, tam dilimli | **simülasyon** (fiyat denemesi) |
| **İndirimli Komisyon raporu** | _"sen şu aralıkta sattın, şu oranı uyguladım"_ · geçmiş, kısmi | **denetim** |

Teşhis yapıdan çıktı: raporda aralıklar **yalnız satış olan yerlerde**
dolu. Yayımlanan bir tarifede her ürünün bütün dilimleri olurdu. **Bu bir
tarife değil, fatura özeti.**

`%2,70` vakası tam bunun kurbanıydı: yayımlanan orana (`%15`) bakan bir
denetim onu üç kez şüpheli ilan etti; raporun `Komisyon Değişimi` kolonu
(`%12.00 → %3.3`) mekanizmayı tek satırda açıkladı.

> Denetim referansı seçilirken sorulur: **bu kaynak neyi kaydediyor —
> niyeti mi, sonucu mu?** Para söz konusuysa sonuç kazanır.

### DONMUŞ KAYNAK, AKAN KAYNAKLA KARŞILAŞTIRILIRKEN İKİ DAMGA YAZILIR (KESİN KURAL)

_Mimar kararı 20.08.2026, K9._ Bir dış rapor **üretildiği anda donar**;
bizim defterimiz **akmaya devam eder.** Tek damga yazılırsa çıkan rakam
"sabit bir gerçek" sanılır — oysa fotoğraftır.

**Vaka:** aynı dosyayla aynı gün iki koşum: eşleşen adet `8→9`, fark
`219→218`, ciro `₺751.583→₺747.024`. Hiçbir şey bozulmadı; **gün içinde
satış girildi.** Her kıyasta **rapor üretim anı** (dosya adındaki damga)
ve **sistem okuma anı** birlikte basılır; damga yoksa bu da yazılır.

**KARDEŞ MADDELER — aynı gün, aynı cepheden:**

**· YOKLUK İDDİASI DA İDDİADIR.** _"Sistem şunu takip etmiyor"_ cümlesi,
_"şöyle yapıyor"_ kadar doğrulama gerektirir. Üç kez bakılmadan kuruldu ve
üçü de yanlış çıktı: `ChannelAccount.externalId` **vardı**
(`AXCALI = "870249"`, raporun satıcı kimliği); fiyat kartının davranışı
**koda bakılınca** başkaydı; `kanalAdi` bir DB alanı **değildi**.

**· AŞILAN RAKAM SESSİZCE AŞILMAZ.** Yeni ölçüm eskisini kapsıyorsa
_"X aşıldı, geçerli olan Y"_ cümlesi açıkça kurulur ve **ikisi de dosya
adıyla** yazılır. Sessiz değiştirme, eski rakamı elinde tutan biri için
kaynaksız bir sayı üretir.

**· ADET İŞ DEĞERİ CÜMLESİ KURMAZ, CİRO KURAR.** Bulgu para birimine
çevrilebiliyorsa öyle taşınır (`218 adet` → `₺747.024`). ⚠ **Ve paranın
ETİKETİ kaynağın kendi etiketidir:** kolon adı birebir yazılır
(`Toplam Tarifeli Brüt Ciro`), tabanı ise **tahmin edilmez, ölçülür.**
_Yöntem — susmak yerine SINIR çiz:_ "kuruşuna tutmadı" demek "taban
farklı" demek değildir. KDV ayrımı ~%16,7 fark üretirdi; ölçülen en büyük
sapma **%0,29** çıktı → **taban aynı.** Kalan küçük fark açıklanmadı ve
**açıklanmadığı yazıldı** — bir soruyu kapatmak, yanındakini de kapattığı
anlamına gelmez.

**· PANONUN KENDİSİ DE DOĞRULANAN BİR VERİDİR.** Okunamayacak kadar uzun
bir pano bozulmadığını göstermez — bozulmayı **gizler.** _(Vaka: belge iki
kopyaydı ve fark edilmesi tesadüftü.)_

### KİMLİK VARKEN DİZEYLE ARANMAZ — VE CEVAPSIZ KAPSAM SORUSUNUN ÜSTÜNE ÖLÇÜM KURULMAZ (KESİN KURAL)

_Mimar kararı 20.08.2026, K11a → K11a-b._

**1) CEVAPLANMAMIŞ KAPSAM SORUSUNUN ÜSTÜNE ÖLÇÜM KURULMAZ.** K11a komutu
haziran/temmuzu "kapanmış" VARSAYARAK kuruldu; o kapsam sorusu iki tur önce
sorulmuş, cevap gelmemişti. Soru sorulup cevap beklenmeden devam edilirse
ölçüm cevabı varsayar ve **varsayımı veri gibi basar.**

**2) KİMLİK VARKEN DİZEYLE ARAMA YAPILMAZ.** Dört ürün ADLA listelendi;
kaynak raporda `Barkod` kolonu vardı. Dize araması sıfır dönerse **yokluğu
değil bulunamamayı** gösterir ve ikisi rapora AYRI yazılır.

⚠ **AMA "DİZE ARADIM" DA TEK BAŞINA HÜKÜM DEĞİLDİR — O DA ÖLÇÜLÜR.** Aynı
vakada zero'ların artefakt olduğu varsayıldı; ölçüm bunu çürüttü: ürünler
sistemde `"Qp2824/10 Oneblade…"` ve `"Karaca Burby Wood…"` adıyla
kayıtlıydı, desenler **eşleşirdi**. Sıfırlar gerçekti; eksik olan sayı
değil **kategoriydi** (ürün mü yok, eşleştirme mi yok, satır mı yok).
Kural geçerli kalır, gerekçesi düzeltilir.

**3) SIFIR ÜÇ FARKLI ŞEY OLABİLİR — ÜÇÜ AYRI SAYILIR.**
`(a)` kimlik sistemde hiç yok · `(b)` kayıt var, eşleştirme yok ·
`(c)` kayıt + eşleştirme var, **satır yok**. Üçü "bulunamadı" diye tek
kefeye konursa **en güçlü kanıt en zayıfla aynı ağırlığa iner** —
`(c)` giriş eksikliğinin doğrudan kanıtıdır, `(a)` ise yalnızca bir soru.

**4) BENZER AD, AYNI KİMLİK DEĞİLDİR.** Rapordaki Soundcore Q21i
`194645027819`; sistemdeki tek Q21i kaydının barkodu `194644037819`.
Adla bakan biri "var, 1 adet girilmiş" der; **kimlikle bakan "bu ürün
sistemde hiç yok" der.** İkisi farklı işe yol açar — biri eksik satır
arar, öteki ürün tanımlar.

**5) EN GÜÇLÜ CÜMLE, EN ÇOK TARTIŞMADAN SAĞ ÇIKANDIR.** Kapsamı tartışmalı
bir FARK yerine kapsamdan bağımsız bir EŞİTSİZLİK kurulabiliyorsa o yazılır:
_"tüm TY geçmişimiz 43 brüt adet; rapor tek bir ALT KÜMEDE, daha KISA bir
aralıkta 72 adet diyor."_ Alt küme üst kümeden büyük olamaz — hesap, birim
ve sınır tartışmalarının hiçbiri bu eşitsizliği çeviremez.

### KAYNAĞI YAZILMAYAN SAYI KULLANILAMAZ — VE YÖN, BÜYÜKLÜK DEĞİLDİR (KESİN KURAL)

_Mimar kararı 20.08.2026, K9/K14._ Bir ölçüm panoya geçerken iki ayrı şey
kaybolabilir: **kaynağı** ve **kapsamı**. İkisi de kaybolunca sayı hâlâ
doğru olabilir ama artık kullanılamaz.

**1) KAYNAĞI YAZILMAYAN SAYI, DOĞRU OLSA BİLE KULLANILAMAZ.** Panoda
`227` yazıyordu ve penceresi de yazılıydı (97 satır, `30.06–21.08`) — ama
**hangi dosyadan geldiği yazılmamıştı** ve daha da kötüsü, önceki ölçümün
(`72`, dar pencere) **aşıldığı hiçbir yerde söylenmemişti.** Sayı sessizce
değiştirilince, elinde eski rakam olan biri için kaynaksız bir sayı doğar.

> **İki çelişen rakam panoda yan yana bırakılmaz.** Ama "çelişki" sanılan
> şey çoğu zaman iki farklı kapsamdır: doğrusu birini silmek değil,
> **ikisini de kaynağıyla yazıp hangisinin geçerli olduğunu söylemektir.**

**2) YÖNÜ DOĞRULANMIŞ BİR BULGUNUN BÜYÜKLÜĞÜ AYRICA DOĞRULANIR.** Kapsamı
karışmış bir kıyas **yön verir, sayı vermez**: "sistem tarafı eksik"
denebilir, "64 adet eksik" denemez. Büyüklük ancak iki tarafın aynı kümeyi
gördüğü ÖLÇÜLDÜKTEN sonra cümleye girer.

⚠ **VE BU ÖLÇÜM YAPILMADAN "GEÇERSİZ" DE DENMEZ.** Aynı vakada kapsamın
karıştığı VARSAYILDI ve büyüklük geçersiz ilan edildi; sonra ölçüldü:
rapor `seller_870249`, `AXCALI.externalId = "870249"`, ve TY'nin **tek
satış hesabı** AXCALI (ötekiler ALIŞ hesabı, sıfır satış). Kapsam
karışmıyordu. **"Kapsam şüpheli" de bir iddiadır ve o da ölçülür.**

**3) DESEN, ÖRNEĞİ KALMADIĞINDA DEĞİL, DOĞURAMADIĞINDA KAPANIR.**
_"Tek vakaydı, düzeltildi"_ ile _"bugün hiçbir yerde tetiklenmiyor"_ farklı
cümlelerdir. Birincisi kapanış, ikincisi **sessizlik** — ve sessiz bir
desenin açılış şartı yazılır. (Vaka: `canli-komisyon-envanter.ts:55`
kanal adına gömülü sözlük; eşleşmezse sessizce boş döner ve **boş dönüşü
makul görünür** — K13b'yi sonucun imkânsızlığı yakalamıştı, bunu
yakalayacak bir şey yok. Açılış şartı: kanal adının düzenlenmesi.)

**4) PANO, İŞİN DURUMUNU DEĞİL NİYETİNİ KAYDEDERSE KURGU ÜRETİR.**
Üç durum ayrı etiketlenir: **[KOMUT]** verildi/taşınmadı · **[YAZILDI]**
betik var/koşmadı · **[KOŞTU]**. _Vaka: `K11a-rev` ve `K12-rev` panoda
"Claude Code'da" yazılıydı, `scripts/` altında yoklardı; var olmayan bir
betiğe "koşmasın" emri verildi._

⚠ **VE PANONUN KENDİSİ DE DOĞRULANIR.** Aynı gün `BEKLEYENLER.md`'nin
**tamamının iki kopya** olduğu ortaya çıktı (7022 satır = 3514 + 3508) —
düzenlemeler yalnız birinci kopyaya işliyor, ikinci kopya bayat kalıyordu.
Aynı kalemin iki farklı sürümü, "çelişkili rakam" üretmenin en sessiz
yolu. Silmeden önce ikinci kopyanın **özgün tek satır taşımadığı** diff ile
doğrulandı.

**SONUÇ — PANO İKİYE AYRILDI (20.08.2026):** `BEKLEYENLER.md` yalnız
**açık** kalemleri taşır ve tek ekrana sığar; kapanmış iş, karar ve
dersler `ARSIV.md`'e geçti. **Kapanan kalem panodan SİLİNİR** ve arşive
**gerekçesiyle** yazılır — _"bakılmayacak"_ da bir sonuçtur.

⚠ **BÖLME YÖNTEMİ DE BİR RİSKTİR:** arşiv, o günkü panonun **birebir
kendisi** yapıldı (tek satır elden geçmedi) — özetleyerek taşımak, neyin
kaybolduğunu ölçülemez hâle getirirdi. Ve **taşınan dosyaya işaret eden
her satır düzeltildi** (`kar-orani.ts` · `panel-dogrula.ts` · `seed-xlsx.ts`
· `CLAUDE.md` · `README.md`): bir belgeyi bölmek, ona bakan bağlantıları
sessizce kırar.

### EŞİĞİ SORUYU SORAN KOYAMAZ — VE PAYDA, BOZULAN KARARDAN SEÇİLİR (KESİN KURAL)

_Mimar kararı 20.08.2026, K13 → K13b._ Bir oran ölçülürken iki ayrı yerden
hata girer: **eşik** ve **payda**. İkisi de "makul göründüğü" için sorgusuz
geçer, ve ikisi de sonucu tersine çevirebilir.

**1) EŞİĞİ SORUYU SORAN KOYAMAZ.** K13'te "pay %2'yi geçiyor mu" diye
soruldu; `%2` veriden türetilmedi, soruyu soran yazdı. Üstelik ondan
**₺630 sınırı** türetildi ve o sınırla 1030 ürün "geçemez" diye elendi.
Eşik `%1` olsaydı sınır `₺1.260` olurdu ve eleme çökerdi. **Kaynağı olmayan
eşik, üstüne kurulan bütün akıl yürütmeyi de dayanaksız yapar — argüman
zarif olsa bile.** Eşik ya dağılımın gediğinden gelir ya hiç konmaz.

**2) PAYDA, ÖLÇMESİ KOLAY OLANDAN DEĞİL, BOZULAN KARARDAN SEÇİLİR.**
K13 ₺12,60'ı FİYATA oranladı: ortanca `%0,32`, max `%1,29` → "önemsiz".
K13b aynı tutarı **MARJA** (NET-2) oranladı: ortanca `%3,38`, max
`%15,18`. Aynı veri, aynı gün, **on–yirmi kat fark** — çünkü ₺12,60'ın
bozduğu karar fiyat kararı değil marj kararıydı.

> **KONTROL SORUSU:** bu sayı hangi kararı bozuyor? Payda O kararın
> paydasıdır. Fiyat "kolay ölçülüyor" diye seçilirse cevap "önemsiz" çıkar
> ve soru cevaplanmamış olur.

**3) KENDİ SİSTEMİMİZİN DAVRANIŞI DA DOĞRULANIR.** _"Araç şunu yapıyor"_
cümlesi bakılmadan kurulursa dış kaynak iddiasından farksızdır. K13b bunu
**yazılırken** yaşadı: zemin `kanalAdi === "Hepsiburada"` ile aranıyordu,
oysa alan `"Hepsiburada — HesapAdı"` üretiyor (`kart-verisi.ts:105`).
Eşleşme hiç tutmadı, betik **29 ürünü sessizce eledi** ve tertemiz bir
tabloyla `n=0` bastı. Ad bir ETİKETTİR; eşleştirme **kimlikle**
(`channelAccountId`) yapılır. ⚠ Yakalanmasının tek sebebi sonucun imkânsız
görünmesiydi — sayılar makul çıksaydı yayımlanacaktı.

**4) SIFIRA VE NEGATİFE BÖLÜNMEZ.** Marjı ≤ 0 olan kayıt orana
karıştırılmaz: bölüm saçma büyük bir sayı üretir ve **kuyruk sanılır**.
Ayrı sayılır, ayrı listelenir. (K13b'de 6 ürün buraya düştü.)

⚠ **VE ELEME SEBEPLERİ AYRI SAYILIR.** K13b'nin ilk sürümü "zemin
bulunamadı" ile "NET-2 hesaplanamadı"yı tek sepete attı, `29 hesaplanamadı`
dedi; hangisinin neden düştüğü kayboldu ve yukarıdaki hata neredeyse
gizlendi. _("Boş sonuç ile temiz sonucu ayırt edemeyen denetim" kuralının
eleme tarafı.)_

### KESİNTİ KURALI "HER ZAMAN KESİLİR" İDDİASIDIR — SIKLIĞI DA ÖLÇÜLÜR (KESİN KURAL)

_Ders 20.08.2026, HB hizmet bedeli._ Bir kesinti kuralını tabloya yazmak iki
şey birden iddia eder: **tutarı bu** ve **her seferinde alınır.** İkincisi
neredeyse hiç sınanmaz, çünkü tutarı doğrulamak kolaydır ve doğru tutar
kuralın tamamını doğrulamış gibi görünür.

**Vaka:** `HIZMET_BEDELI` ₺12,60 doğruydu — kesilen her kayıt tam ₺12,60.
Ama ekstre ölçüldüğünde: hesabı kesilmiş **99 siparişin yalnız 14'ünde**
(%14) kesilmişti. Motor %100'ünden kesiyordu. Tutar doğru, **sıklık
yanlıştı** ve NET her HB satışında sessizce karamsar çıkıyordu.

Ve H8 bu ölçüm sayesinde soruyu değiştirdi: aylardır _"paket başına mı"_
diye aranıyordu; 2 paketli dört siparişin **dördünde de bedel hiç
kesilmemişti.** Yanlış soruya doğru cevap aranıyordu.

> **KURAL:** bir kesinti kuralı yazılırken/denetlenirken **iki sayı** ölçülür:
> **tutar** (kaç lira) ve **KAPSAMA** (kaç kayıtta geçiyor / kaç kayıtta
> geçmesi gerekirdi). İkincisi yazılmadan kural doğrulanmış sayılmaz.

⚠ **VE KOŞUL BULUNAMAZSA KURAL DEĞİŞTİRİLMEZ.** Sıklığı %14 ölçmek, kuralı
"%14 olasılıkla kes" yapmaz — defter olasılık taşımaz. Koşul bulunana kadar
mevcut hâl **beyanla** durur; sıfıra çekmek de en az mevcut hâli kadar
dayanaksızdır. _("Sistem, kendi defterinde takip etmediği şey hakkında iddia
kurmaz" kuralının kesinti tarafı.)_

### AYNI VERİ, FARKLI SORUYA FARKLI PENCEREDEN BAKAR (KESİN KURAL)

_Mimar kararı 20.08.2026._ Zamana bağlı bir referans (tarife, kur, oran)
sorgulanırken **hangi pencerenin doğru olduğu, sorunun kendisine bağlıdır.**
Tek bir "en güncel" cevabı her yere uygulamak, geçmişi bugünün gözlüğüyle
okumaktır.

| Soru | Doğru pencere |
|---|---|
| _"bugün ne yapayım"_ (fiyat denemesi, öneri) | **en yeni** |
| _"o gün ne geçerliydi"_ (kayıt girişi, denetim) | **kaydın tarihi** |

**Vaka:** komisyon tabanı en yeni tarife penceresinden okunuyordu. Kullanıcı
bildirdi ki farklı dönemlerde **%1'lik kampanyalar** da olmuş — temmuz
satışına girilen %1, ağustos tabanıyla (%2,7) kıyaslanıp **doğru bir oran
şüpheli** ilan edilecekti.

Ölçüm sorunun boyutunu verdi: yüklü pencere **1**, satışlar 17.06–20.08 ve
**54 satışın yalnız 24'ü** o pencereye düşüyor.

> **KAPSAYAN PENCERE YOKSA HÜKÜM VERİLMEZ.** "En yakınına yaklaşık bak"
> demek, bilmediğimiz bir dönem hakkında iddia kurmaktır. Susmak, yanlış
> cevaptan iyidir. _("Sistem, kendi defterinde takip etmediği şey hakkında
> iddia kurmaz" kuralının zaman eksenindeki hâli.)_

⚠ Aynı veriyi iki ekran farklı pencereden okuyorsa bu bir TUTARSIZLIK
DEĞİLDİR — iki farklı soruya iki doğru cevaptır. Ama **hangi ekranın hangi
soruyu sorduğu kodda yazılı olmalıdır**, yoksa biri ötekine "düzeltilir".

### MERDİVEN BASAMAKLARI ÖLÇÜMLE ELENİR, TERCİHLE DEĞİL (KESİN KURAL)

_Mimar kararı 20.08.2026._ "Şema değişikliği en pahalı çözümdür" kuralının
merdiveni (_mevcut alan → serbest metin → türetilebilir mi → sütun →
tablo_) **atlanarak inilmez.** Her basamak için "olmaz" demek yetmez;
**denenip tutmadığının gösterilmesi gerekir** — ve türetme denemesi de
bir ÖLÇÜMDÜR.

**Vaka — bölünmüş paket:** sipariş iki kargoyla gidince Trendyol'un
₺13,19 platform hizmet bedeli **iki kez** alınıyor (`11361665302`:
−26,38 = 2 × 13,19). Motor bunu sipariş başına sabit sayıyordu.

Merdiven **ölçümle** inildi:
1. **Mevcut alan** — `Sale`'de sayaç yok. ✗
2. **Serbest metin** — `note`'ta "paket" geçen satış: **0**. Ve asıl
   ölçüt: paket sayısı NET-2'nin **GİRDİSİ**, geriye bakış değil. ✗
3. **Türetilebilir mi** — kargo/tarife oranı **49 satışta ölçüldü, hiçbiri
   eşiği geçmedi**; üstelik TY kargoyu **ciro yüzdesi** olarak gösteriyor
   (`%3.0`, `%3.4`), yani desi tabanlı bile değil. Türetme tahmin olur ve
   **sessizce yanlış kesinti** üretirdi. ✗ _(Bu bir tercih değil, bir
   ölçüm sonucudur.)_
4. **Sütun** — `Sale.paketSayisi Int @default(1)`. ✓

**VE ENUM SEÇİMİ DE ÖLÇÜTE BAĞLI:** kapsam `FeeScope`e eklendi
(`PER_PACKAGE`), `basis`e değil. `basis` "nasıl hesaplanır", `scope`
"kaç kez alınır" der; paket sayısı ikincinin sorusudur.
`FIXED_PER_PACKAGE` diye bir basis, iki boyutu tek enuma sıkıştırıp
"paket başına yüzde" gerektiğinde çıkmaz sokak olurdu.

⚠ **`@default(1)` GERİ DOLDURMAYI GEREKSİZ KILAR** — bölünmemiş sipariş
zaten tek pakettir. Varsayılanı doğru seçmek, migration'ın yarısını
ortadan kaldırır.

### EŞİK, ÖLÇÜLDÜĞÜ POPÜLASYONUN DIŞINA UYGULANAMAZ (KESİN KURAL)

_Ders 20.08.2026, komisyon oranı vakası._ Bir eşik gerçek ölçümden gelse
bile, **ölçüldüğü kümenin dışına uygulandığında doğru kayıtları suçlar.**
Sorulacak soru "eşik ölçüldü mü" değil, **"ölçtüğüm küme, uyguladığım
kümeyle aynı mı"**dır.

**Vaka:** `SUPHELI_ORAN_ESIGI = 3` şöyle savunuluyordu — _"18.08.2026
canlı ölçümü: Trendyol %3,6–%23; görülmüş en düşük oran %3,6, eşik onun
altına konuldu."_ Ölçüm gerçekti. Ama ölçülen küme **`ChannelSku` TEK
ORANLARIYDI**; eşik ise **satışa yazılan oranlara** uygulanıyordu ve o
küme bir gün sonra yüklenen **dilim tarifesini** de içeriyordu (Fiorino:
%21 → %8,4 → %4,5 → %4,2).

Sonuç: dört DOĞRU kayıt (%2,70) aylarca "şüpheli" işaretlendi ve bir
düzeltme talimatı yazıldı. Kullanıcı durdurdu: Trendyol her Salı tarife
yayımlıyor ve **fiyat indirimi karşılığı komisyon indiriyor**
("2.000'e %10, 1.750'ye satarsan %7"). Düşük oran mekanizmanın sonucu.

**VE HİÇBİR SAYI BU İŞİ YAPAMAZ.** Eşiği %2'ye çekmek de çözmezdi:
indirim oranı ilkece istediği kadar aşağı inebilir. "Düşük oran
şüphelidir" cümlesi mekanizmayla çelişiyordu. Eşik düşürülmedi,
**KALDIRILDI** ve yerine ölçüt kondu: _oran, o ürünün O FİYATTAKİ
diliminde yazan oran mı?_ Tarife yoksa **hüküm verilmez**.

> **YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR.** %100 yanlış pozitif üreten
> `supheliOran` uyarısı ve süzgeci kaldırıldı; onları "eşiği ayarlayarak"
> yaşatmak, rozetin tamamına olan güveni harcamak olurdu.

**AMA UYARININ KENDİSİ KALDI — TABAN VERİDEN GELİYOR.** _Kullanıcı
düzeltmesi 20.08.2026:_ mekanizma kalksın istenmedi, **taban değişti.**
Artık sabit `%3` yok; ölçüt **o kanalın yüklü tarifesindeki en düşük
oran**. Bunun altı, kanalın hiçbir ürün için yayımlamadığı bir orandır.
Tarife her yüklendiğinde eşik kendiliğinden tazelenir — "18.08'de ölçtüm,
19.08'de küme değişti" durumu bir daha doğmaz.

> **DOĞRU EŞİK SABİT SAYI DEĞİL, VERİDEN TÜRETİLEN SINIRDIR.** Sabit sayı
> ölçüldüğü ana kilitlenir; veriden gelen sınır kümeyle birlikte yürür.

**KONTROL SORUSU — her eşikte:** bu sayıyı hangi kümeden ölçtüm, ve
uygulayacağım küme onunla AYNI mı? Farklıysa eşik değil, **ölçüt** yanlış.

⚠ Bu, "eşik dağılımın gediğine konur" kuralının kardeşi ve ondan
önceliklidir: **önce doğru dağılımı seçersin, sonra gediğini ararsın.**

### BİR OKUMA, OKUNAN DEĞERİ DOĞRUDAN TAŞIR (KESİN KURAL)

_Ders 23.08.2026, kamera vakası._ Dışarıdan gelen bir okuma (barkod, QR,
dosya, ölçüm) **ara bir duruma yazılıp oradan okunursa**, okuma anı ile
kullanım anı arasında bir gecikme doğar — ve sonuç **makul görünerek**
yanlış çıkar.

**Vaka:** fiyat denemesinde kamera barkodu okuyor, `setKod(...)` çağrılıyor,
hemen ardından arama tetikleniyordu. React durumu senkron güncellenmediği
için o an `kod` **hâlâ eski değeri** taşıyordu: kamera yeni barkodu okur,
sistem **bir öncekini** arardı. Ekranda hata yok, kilitlenme yok — yalnız
yanlış ürün gelir ve kimse sebebini anlamaz.

> **KURAL:** okunan değer, onu kullanacak yere **parametre olarak** geçer.
> Durum yalnız EKRANI beslemek içindir, kararı beslemek için değil.

⚠ Aynı tuzağın kardeşi: `onClick={ara}` yazmak. Tıklama olayı ilk
parametreye düşer ve fonksiyon onu "okunan kod" sanar. Bu vakada TypeScript
yakaladı; yakalamayabilirdi de.

---

### BEKÇİ ÖLÇÜTÜ ELLE TUTULAN LİSTE DEĞİL, TERSTEN KURULUR (KESİN KURAL)

_Ders 23.08.2026, kamera vakası._ Bir kuralın koşan karşılığını yazarken
_"şu altı ekranda var mı"_ diye saymak, **yedinci ekran eklendiğinde sessizce
yeşil kalır.** Liste bakım ister ve bakımı unutulan liste, koruduğunu sandığı
şeyi korumaz.

**Vaka:** anayasa (İlke #7) _"kod girilebilen her alan kamera destekler"_
diyordu. Kamera formlarda vardı; **liste aramalarının ALTISINDA DA yoktu.**
Kural yazılıydı, koşan bir ölçütü yoktu.

Doğru ölçüt sayım değil, **desen yasağı**:

> _"Kod arayan bir kutu, kamera taşıyan ortak bileşeni kullanmak
> ZORUNDA — çıplak `<input name="q">` hiçbir yerde kalamaz."_

Böyle kurulunca yarın eklenen ekran da yakalanır; kimse listeye eklemeyi
hatırlamak zorunda değildir. **Düzeltilecek olan satır değil DESENDİR.**

⚠ Bu, "tip listesi değil, BAĞ" ve `sw.js`teki "izin listesi, yasak listesi
değil" derslerinin bekçi tarafındaki hâli — üçü aynı kökten.

⚠ **VE ÖLÇÜT DE MUTASYONLA SINANIR.** Aynı gün iki ölçüt gevşek çıktı:
biri yalnız `<Input>` arıyordu (düz `<input>` kaçtı), öteki deseni dosyanın
tamamında arıyordu (aynı desen "temizle" satırında da geçiyor ve mutasyonu
ayakta tutuyordu).

---

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

### METNİ OKUYAN KONTROL, METNİN GELİŞ BİÇİMİNDEN BAĞIMSIZ OKUR (KESİN KURAL)

_Ders 24.08.2026._ Bir kontrolün ölçtüğü şey hiç değişmeden, **okuduğu
baytlar** değişebilir: satır sonu (CRLF/LF), BOM, kodlama. O anda kontrol
hata vermez — **sessizce boş bulur** ve boş bulmak "temiz" gibi görünür.

**Vaka:** `npx prisma format` şemayı CRLF'e çevirdi. Enum ayrıştıran kontrol
`split("
")` yapıyordu; satırlar `` ile bitince `/\/\/.*$/` deseni `$`i
bulamadı, yorum SİLİNMEDİ ve `^[A-Z_]+$` testi düştü. Sonuç:

    "NoticeObjectionReason: şemadaki 0 değerin hepsi formda"  → KIRMIZI

Şanslıydık: kontrol `degerler.length > 0` şartını da taşıyordu ve kırmızı
yandı. O şart olmasaydı **0 değerin hepsi formdadır** — boş küme her koşulu
sağlar — ve kontrol sonsuza kadar yeşil yanardı.

> **KURAL:** dosya okuyan her kontrol, okumayı **tek bir kapıdan** yapar ve
> o kapı biçimi normalleştirir. Düzeltme, deseni tek tek yamamak değil,
> **okuma kapısını** kurmaktır — yoksa yarın sekizinci bekçi aynı tuzağa
> düşer.

⚠ **VE "0 BULDUM" İLE "OKUYAMADIM" AYRI SÖYLENİR.** Ayırt edilemiyorsa okuma
kapısı eksiktir. _("Boş sonuç ile temiz sonucu ayırt edemeyen denetim,
denetim değildir" kuralının metin okuma tarafı.)_

### BEKÇİNİN KIRMIZISI HER ZAMAN "KOD YANLIŞ" DEMEZ (KESİN KURAL)

_Ders 24.08.2026._ Kırmızı yanan bir bekçi iki farklı şey söylüyor olabilir:

- **"kod yanlış"** — davranış bozuldu, kodu düzelt
- **"ölçütüm eskidi"** — davranış doğru, ölçüt artık yanlış şeyi ölçüyor

**İkisi de DURDURUR ve ikisi de DOĞRUDUR.** Bekçi haklı olmak için değil,
**sessiz kalmamak** için vardır.

**Vaka:** beşinci kod rolü (`shipmentCode`) eklenince iki bekçi kırmızı yandı:
_"serbest arama shipmentCode alanını kapsıyor"_ ve _"okutulan kod
shipmentCode alanını kapsıyor"_. Kod doğruydu — gönderi numarası bir SATIŞ
kimliği ve varyant koşulunda aranması **yanlış olurdu**. Eskiyen şey ölçüttü:
_"her rol varyant koşulunda aranıyor mu"_. Ölçüt kapsama bağlandı
(`VARYANT_ROLLERI`), satış rolleri için ayrı döngü açıldı.

> **YAPILMAYACAK ŞEY: BEKÇİYİ SUSTURMAK.** Kontrolü silmek ya da beklentiyi
> gevşetmek, ölçütü güncellemek değil **ölçmeyi bırakmaktır**. Eskiyen ölçüt
> güncellenir; güncellenirken NİYE eskidiği yazılır, yoksa altı ay sonra
> "burada niye böyle bir istisna var" sorusu cevapsız kalır.

### TOPLAM RAKAM YORUM KALDIRIR, SATIR KALDIRMAZ (KESİN KURAL)

_Ders 24.08.2026, kargo faturası vakası._ Bir toplamdan yapılan çıkarım kaç
kez tutarlı görünürse görünsün, kaynağın **satır düzeyindeki belgesi**
gelene kadar teşhis değil **varsayımdır**. Toplam, birden çok yorumu aynı
anda taşıyabilir; satır taşıyamaz.

**Vaka:** Trendyol paneli `11473322212` için `Kargo −315,74` diyordu, bizim
defterimizde `141,42` vardı. Aradaki `174,32`den iki teşhis üretildi ve
ikisi de tutarlı görünüyordu:

1. _"TY kendi kargo tarifesini uyguluyor, biz Aras tarifemizi"_ — çünkü
   `315,74 ÷ 2 = 157,87` temiz bir sayıydı ve iki bacağı açıklıyordu.
2. _"TY zaten Kargo sütununda kesmiş; elle yazmak çift sayım olur"_ —
   çünkü toplam iki bacağı da içeriyor görünüyordu.

**Fatura DETAYI ikisini birden çürüttü.** Satırlar şunu dedi:
`141,42` (Gönderi, 5 desi) ve `174,32` (**Değişim Gönderisi**, 8 desi) —
yani bizim rakamımız **kuruşuna doğruydu**, eksik olan yalnız ikinci
bacaktı ve yazmak çift sayım **değil** tamamlama olurdu.

> **ÖLÇÜT:** elimdeki şey bir TOPLAM mı, bir SATIR mı? Toplamsa üretilen
> cümle _"şu olabilir"_ kipinde kalır ve iş açmaz. Satır gelmeden
> düzeltmeye kalkmak, doğru çalışan bir motoru yanlış bir yorum uğruna
> bozmaktır.

⚠ Bu, _"iç tutarlılık kaymayı gizler"_ dersinin tersten hâli: orada tutarlı
görünen ÇIKTI hatayı saklıyordu, burada tutarlı görünen YORUM. İkisinin de
çaresi aynı — kaynağın kendi yazdığıyla göz göze karşılaştırmak.

### KAYNAK ÖNCELİĞİ: İÇERDEN GELEN BİLGİ ÜSTTEDİR (KESİN KURAL)

_Kullanıcı kararı 22.08.2026._ Bir pazaryeri kuralı yazılırken kaynaklar
**eşit değildir.** Dış bir hesaplayıcı referans olabilir ama **hüküm
kuramaz**; hükmü kanalın kendi belgesi kurar.

> _"Ne satılır'ı yanılmaz bir yer olarak düşünme, referans al ama önceliğin
> hakedişler, faturalar ve kanalın kendini anlattığı dokümantasyon olsun.
> İçerden ve asıldan bilgi her zaman daha değerlidir."_

**SIRA — yukarıdan aşağı, üsttteki varsa alttaki KULLANILMAZ:**

| # | Kaynak | Rozet |
|---|---|---|
| **1** | **Kanalın kendi belgesi** — komisyon faturası · hakediş ekstresi · satıcı paneli dökümü · resmî dokümantasyon | `OLCULDU` |
| **2** | **Kendi defterimiz** — ölçülmüş `SaleFee` kayıtları, gerçek satışlarımız | `OLCULDU` |
| **3** | **Dış hesaplayıcı** (nesatilir vb.) — yalnız 1 ve 2 YOKKEN | `REFERANS` |

**ÜST BASAMAK GELDİĞİNDE ALTTAKİ DEĞİŞTİRİLİR, ORTALANMAZ.** İki kaynak
çelişiyorsa "ikisinin ortası" diye bir sonuç yoktur; üstteki kazanır ve
alttakinin niye düştüğü yazılır.

**VE BU İKİ KEZ ÖLÇÜLDÜ — aynı dış kaynak, iki kanalda birden yanıldı:**

| Kanal | nesatilir | Gerçek belge | Fark |
|---|---|---|---|
| Hepsiburada · ödeme gideri | `9,60` | `8,00` (%0,8000, 113 sipariş) | %20 |
| N11 · hizmet giderleri | tek kalem `%1,258` | **iki kalem**: %1,20 + %0,80 | kalem eksik + oran yanlış |

N11'de dış kaynak yalnız oranı kaçırmadı, **bir kesinti kaleminin
varlığını hiç görmedi** (`Pazaryeri Bedeli`). Yani hata "biraz sapma"
değil, **yapısal**: dışarıdan bakan bir hesaplayıcı, kanalın faturasında
kaç satır olduğunu bilemez.

**UYGULAMA:**
- Dış kaynaktan yazılan her kural `REFERANS` rozeti + `belirsizlik` notu
  taşır; ekranda **görünür**.
- Kanalın belgesi eline geçtiğinde kural **deftere geçer** (`ChannelFee`)
  ve rozet `OLCULDU`ya döner.
- `OLCULDU` demek **"yeterince ölçüldü" demek DEĞİLDİR**: örneklem (`n=`)
  kaynak notunda yazar ve büyüyünce güncellenir.
- Belge **bir soruyu kapatırken başkasını açabilir**; kapanan yazılır,
  açık kalan `belirsizlik`te durur. _Vaka: N11 faturası oranları kesinleştirdi
  ama komisyonun indirilecek KDV içerip içermediğini söylemiyor._

⚠ **BU KURAL "DIŞ KAYNAK KULLANILMAZ" DEMEK DEĞİL.** Hiçbir belgesi
olmayan bir kanalda (bugün Amazon) dış kaynak tek seçenektir ve
kullanılır — ama rozetiyle, beyanıyla ve **ilk belge geldiğinde
düşeceği bilinerek.**

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

> ⚠ **İKİNCİ VAKA 23.08.2026 — VE BU SEFER KURAL SINAVI GEÇTİ.** İade
> sayacı üç kaynaktan okundu ve üçü de aynı anı gösterdi. Ama üçün **ikisi
> Trendyol'un kendi ekranıydı** (uygulama + masaüstü); onların örtüşmesi
> yalnız _"TY kendi içinde tutarlı"_ derdi. Doğrulamayı geçerli kılan
> **üçüncüsüydü: Aras Kargo'nun kendi takip kaydı** — kanaldan bağımsız.
> `10 gün` rozeti `BEYAN`dan `OLCULDU`ya bu yüzden geçti, üç kaynak
> olduğu için değil. _(Ayrıntı: `docs/iade-sureci.md` §12.2.)_
>
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

⚠ **VE STOĞUN KENDİSİ DE İKİ DEFTERDİR** _(eklendi 20.08.2026)_: **ledger**
(`quantityDelta` toplamı — ekranların gösterdiği) ve **FIFO** (açık partilerin
`kalanAdet` toplamı — maliyetin ve kârın okuduğu). Ayrıştıklarında ekran bir
sayı, kâr hesabı başka bir sayı üzerinden çalışır ve **hiçbiri hata vermez.**

İki farklı sebep aynı sonucu üretti: ① iptali geri alma, araya giren bir
düzeltmeyle **çoktan tüketilmiş** bir ayna partisini tüketmeye çalıştı —
ledger `−1` yazdı, FIFO'da düşecek parti yoktu; ② eski kayıtlarda ayna
hareket `sourceMovementId` taşıyordu, hem yeni parti sayılıyor hem eski
partinin tüketimini sıfırlıyordu. **Her ikisi de tek yönlü:** ledger düşer,
FIFO düşmez → hayalet adet.

> **Bir hareketi yazmadan önce sorulur: bu işlem İKİ deftere de aynı şeyi
> yazıyor mu?** Yazmıyorsa yazılmaz — ve yazılmışsa **görünür kılınır**:
> `npm run canli:defter-ayrismasi` (salt okuma; incelenen · temiz · sapan ·
> incelenemeyen ayrı sayılır, sapma varsa çıkış kodu `1`).

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
