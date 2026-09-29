# SaaS paketleri — özellik kataloğu

_Kullanıcı kararı 30.09.2026. Belge: karar kaydı. **Kod yok** — SaaS'a özel iş
bugün AÇILMAZ (CLAUDE.md → Büyüme sırası). Uygulama, özellik kataloğu adımı
açıldığında bu belgeden yapılır._

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
