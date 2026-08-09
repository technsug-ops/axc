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

Bu sistem ileride satılabilir bir SaaS olacak (çok-kiracılı dönüşüm SONRA).
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

YENİ EKRAN KONTROL LİSTESİ: Her yeni ekran tesliminde bu 10 maddeye
uygunluk kontrol edilir ve rapora "kullanıcı kolaylığı: ✓" satırı eklenir.

## İş sabitleri
- 11 satış kanalı: Trendyol, Hepsiburada, Amazon, N11, Bim, A101,
  Teknosa, Mediamarkt, Vatan, Pazarama, PTTAvm
- Bir kanalda birden fazla hesap olabilir (hesap başına alım limiti nedeniyle)
- Üç kod rolü ayrıdır: SKU (sistem içi), Firma SKU (fiziksel etiket),
  Barkod/EAN (üretici). Veritabanı alanı hâlâ `axcaliSku`; yeniden
  adlandırması BEKLEYENLER.md'de.
- Kanal başına varyantın ayrı ChannelSku'su olabilir
- Kredi kartı seçim mantığı (ileride): limiti uygun + kesim günü en uzak
  + faizsiz maksimum taksit
- Stok toplama FIFO; raf konumu (Location) toplama ekranında gösterilir
- İleriki fazlarda gelecek kanal kuralları: Hepsiburada komisyonuna +%20 KDV
  ve %0,08 ödeme ücreti; Trendyol 13,29 TL sabit gider + Aras desi kargo.
  İki net kâr rakamı hesaplanır: (1) stopaj düşülmüş, (2) stopaj+KDV düşülmüş.

## Faz sırası (sırayı atlama)
- Faz 0 ✓: şema (tamamlandı)
- Faz 1 (şimdi): ürün/varyant CRUD → alım girişi → stok görünümü → kart tanımları
- Faz 2: satış + kâr motoru + iade + gider
- Faz 3: hakediş + kart borcu takibi + tazminat
- Faz 4: pazaryeri API'leri + barkod + çoklu kullanıcı
Bir faza ait olmayan özelliği o fazda EKLEME.

## Yol haritası notları

Alınmış yön kararları. Bugün uygulanmıyor, ama bugünkü işler bunları
zorlaştıracak şekilde yazılmıyor.

- **WEB SİTESİ KANALI:** Kullanıcı kendi e-ticaret sitesinde de satış
  yapacak. Mimari karar: **Selliora mağaza OLMAZ, mağazayı yöneten beyin
  olur.** Kendi site, `WEBSITE` tipinde 12. kanal olarak bağlanır (hazır
  platform: Shopify/WooCommerce/ikas — platform kararı Faz 3 sonuna kadar
  verilecek). Faz 4 entegrasyon sırasında web sitesi kanalı **1
  NUMARADIR**; pazaryeri API'lerinden (Trendyol vb.) önce gelir.
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

## Çalışma kuralları
- Her aşamada önce ne yapacağını KISACA söyle, onay al, sonra uygula
- Şema değişikliği gerektiren işlerde migration'ı hemen çalıştırma;
  önce bildir
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

@AGENTS.md
