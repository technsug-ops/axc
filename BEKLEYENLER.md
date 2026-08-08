# Bekleyen İşler

Karara bağlanmış ama bilinçli olarak sonraki pakete bırakılmış işler.
Sırası gelince CLAUDE.md'deki **Kullanıcı Kolaylığı İlkeleri** kontrol
listesiyle birlikte teslim edilir.

## Sonraki uygun pakette

- [ ] **Detay sayfası tabloları mobilde karta dönsün** — İlke #8
      Alım kalemleri, ürün varyantları ve stok hareketleri tabloları
      telefonda hâlâ yatay kayıyor. Liste sayfaları (ürün / alım / kart /
      stok) 08.08.2026'da karta çevrildi; detay sayfaları kaldı.
      _Karar 08.08.2026: depo aşamasına kadar telefonda detay sayfaları az
      kullanılacağı için acil değil._

- [x] ~~**Raf konumu düzenleme ve pasife alma** — İlke #1~~
      _Tamamlandı 08.08.2026 (`d4cd8ad`): düzenleme sayfası, pasife alma,
      kod değişikliğinde QR etiket uyarısı, mobil kart düzeni._

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

## Faz sırasına göre zaten planlı olanlar

Bunlar eksik değil, sırası gelmedi (bkz. CLAUDE.md → Faz sırası):

- Hasarlı ürünün satıcıya iadesi ve tazminat süreci → Faz 3
- Stok hareketlerinde "kim" bilgisi (kullanıcı/kimlik doğrulama) → Faz 4
- Kredi kartı borç ve ekstre takibi → Faz 3
- Kanal komisyon kuralları ve net kâr hesabı → Faz 2
