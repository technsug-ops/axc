# AXCALI ERP — Proje Anayasası

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
- Her üründe tam olarak bir isDefault=true varyant (uygulama katmanı garanti eder)

## İş sabitleri
- 11 satış kanalı: Trendyol, Hepsiburada, Amazon, N11, Bim, A101,
  Teknosa, Mediamarkt, Vatan, Pazarama, PTTAvm
- Bir kanalda birden fazla hesap olabilir (hesap başına alım limiti nedeniyle)
- Üç kod rolü ayrıdır: sku (iç), axcaliSku (fiziksel etiket), barcode (EAN)
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

## Çalışma kuralları
- Her aşamada önce ne yapacağını KISACA söyle, onay al, sonra uygula
- Şema değişikliği gerektiren işlerde migration'ı hemen çalıştırma;
  önce bildir
- Kullanıcı vibe-coder: teknik jargonu az, Türkçe açıkla
- Migration, silme, reset gibi geri dönüşsüz işlerde MUTLAKA onay iste
- Her tamamlanan aşamada commit + push (mesaj formatı: tip: Türkçe açıklama).
  Push öncesi .env sızıntısı kontrolü.
- Barkod/kod girilebilen her yeni alan, hem USB okuyucu (klavye emülasyonu +
  Enter) hem kamera okuma destekler. Manuel giriş her zaman yedek olarak kalır.
  Ortak bileşen: `src/components/barkod-okuyucu.tsx` (zxing-wasm).

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
