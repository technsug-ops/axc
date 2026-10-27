# Buybox fiyat kuralı — tasarım (K366)

_Kullanıcı kararları 27.10.2026 — tasarım onaylandı («bu şekilde başla»)._

## Amaç

Buybox ekranındaki her ürün için sistem bir **önerilen fiyat** hesaplar:

1. **Buybox bizdeyse:** fiyat, sıradaki (2.) satıcının **bir adım altına** yükseltilir.
   Aradaki fark zaten adım kadar ya da daha azsa dokunulmaz — hâlâ öndeyiz, düşürmek
   boşuna kâr kaybı. Yükseltme NET-2'yi artırmıyorsa (fiyat bir üst komisyon dilimine
   geçip kesinti büyüyorsa) yapılmaz.
2. **Buybox başkasındaysa:** Buybox fiyatının bir adım altı denenir.
3. **Taban:** kârın satış fiyatına oranı minimum marjın altına düşen fiyat önerilmez.
   Öyleyse öneri «fiyata dokunma» olur ve o fiyattaki marj yanında yazar
   (ör. «₺950'de marj %4,1 — en az %6 isteniyor»).
4. **Rakip yoksa** (tek satıcıyız): fiyata dokunulmaz.

Kâr = **NET-2** (stopaj ve ödenecek KDV düşülmüş), motor ürün kartının fiyat
denemesiyle AYNI (`simulasyonKur` → `karHesapla`); komisyon önerilen fiyatın
dilimine göre çözülür (TY dilim tarifesi fiyatla değişir).

## Ayarlar

| Ayar | Genel varsayılan | Ürüne ayrı |
|---|---|---|
| Minimum marj | %6 (satış fiyatına göre) | var — siz değiştirene kadar kalır |
| Adım | ₺50 | var |
| Maliyet | **en düşük** (kullanıcı revizyonu 27.10) | var: **en düşük · ortalama · en yüksek** — hepsi ELDE KALAN stoğun partilerinden |
| Mod | Onaylı | var: **Onaylı · Otomatik** |

Genel değer değişince (ör. %6 → %8) ayrı değeri olmayan bütün ürünler yeniye geçer;
ayrı değeri olan ürün kendi değerinde kalır. «Ortalama» = elde kalan partilerin
adetle ağırlıklı ortalaması. Elde maliyeti bilinen parti yoksa öneri yapılmaz ve
sebebi yazar.

Buybox satırındaki mevcut fiyat kutusu da ürünün seçili maliyet tercihine bağlanır
(İlke #10): kutu ile öneri aynı rakamı gösterir. Varsayılan en düşük olduğu için
bugünkü kutu rakamları değişmez.

## Kargo

1. Ürün **o kanalda tek başına** (pakette başka ürün yok) daha önce satıldıysa:
   en son böyle satışın **kanalın tarttığı desi** ve **ödenen kargo tutarı**.
   Çok ürünlü paketlerin kargosu ürüne bölünemediği için sayılmaz.
2. Yoksa: ürün kartındaki desi + o kanalın kargo firması + bugünkü tarife.
3. Ürün kartında desi de yoksa öneri yapılmaz; satırda **«Desi bekliyor»** uyarısı
   çıkar ve tıklayınca ürün kartı açılır.

## Onaylı / otomatik

- **Onaylı:** Buybox ekranında satırda önerilen fiyat + gerekçe (2. satıcı, taban,
  NET-2, marj). «Gönder» tek tıkla kanala gider (mevcut izli gönderim yolu).
- **Otomatik:** sıklık aşağıda. Önerilen fiyat mevcut fiyattan farklıysa
  gönderilir. Her gönderim iz bırakır: ne zaman · kanal · eski → yeni · sebep
  (2. satıcı fiyatı, taban). Ekranda «son otomatik değişiklikler» listesi.
- Emniyet: otomatik gönderim tabanın altına ASLA inmez; maliyet, kargo ya da
  rakip fiyatı okunamayan üründe hiçbir şey göndermez (sebep yazar).

**Yazıldı (adım 3, 27.10.2026):**
- Mod seçimi: genel ayar penceresinde ve ürünün «Fiyatla» penceresindeki ürün
  kuralında (boş = genel ayarı izle). Genel varsayılan Onaylı.
- Gönderim kapısı `otomatikKarar` (ikinci savunma): öneri «gönder» değilse,
  NET-2 sıfır/eksi/bilinmiyorsa ya da Buybox'ı alma fiyatında marj minimumun
  altındaysa GİTMEZ. Onaylı moddaki «zararına fiyat onayı»nın otomatik
  karşılığı: onay verecek kimse yok, zararına fiyat hiç gitmez.
- Tekrar kapısı: aynı ürüne aynı kanalda aynı fiyat 15 dk içinde ikinci kez
  gönderilmez (TY'nin kendi «aynı istek 15 dk» kuralı).
- Gönderim, ürün kartının AYNI gövdesiyle (`lib/kanal-fiyat-yaz.ts` — kart
  eylemlerinden taşındı, davranış aynı): kanal kuralları, KANAL_GONDERIMI izi,
  HB'de ilan geri okuma. YALNIZ fiyat; stok gönderilmez.
- İz: her gönderim `BUYBOX_OTOMATIK_FIYAT` (eski → yeni · neden · rakip · NET-2
  · marj), her tur `BUYBOX_OTOMATIK_KOSUM`. Ekranda «Son otomatik
  değişiklikler (en yeni 20)» + «son kontrol»; otomatik ürün varken iş 45 dk
  koşmadıysa kırmızı.

## Sıklık

Bugün buybox **saatte bir** ölçülüyor (cron-job.org :00, yedek GitHub :35) ve ölçüm
saatlik istatistiğe yazılıyor. Kullanıcı daha sık istedi ve öneriyi onayladı (27.10):

- Fiyat kontrolü **15 dakikada bir** — ayrı uç, istatistik yazmaz.
- Saatlik istatistik olduğu gibi kalır (grafikler saat dilimine göre kurulu).
- ⚠ Önce ölçülecek: TY Buybox Kontrol ve HB uçlarının istek sınırı, ve her
  koşumun KAS bağlantı kotasına (25) etkisi. Sınır izin vermezse aralık büyütülür
  ve gerekçesi yazılır.
- **Ölçüldü 27.10.2026 (salt okuma, canlı anahtarla):** TY Buybox 20 ardışık
  istek 3,2 sn, 20/20 cevap (sınır görülmedi) · HB Buybox 30 ardışık istek
  3,6 sn, hiçbiri sınıra takılmadı (bilinmeyen SKU ile — 404 de olsa uç
  cevapladı, kısma yok) · TY onaylı liste `barcode` süzgecini kabul ediyor
  (1 kayıt, 430 ms) → otomatik turda kendi fiyatımız ürün başına tek istek
  (17'den az ürün), tam tarama yerine. Tur yalnız Otomatik ürünleri sorar;
  uç küçük havuzla koşar (en çok 3 bağlantı, K332). Aralık 15 dk kaldı.
  ⚠ Kanıtlanmayan: kanalların YAYIMLANMIŞ sınırı (belge yok); ölçülen,
  bugünkü hacmin sınıra takılmadığıdır.
- Tetikleyici: birincil cron-job.org (:00 :15 :30 :45 — kullanıcı kurar),
  yedek GitHub (:07 :22 :37 :52).

## Veri

- Genel ayarlar: `Company` üzerinde 4 alan (marj · adım · maliyet tercihi · mod).
  Firma başına olduğu için çok-firmaya hazırdır.
- Ürüne ayrı değerler: yeni tablo `BuyboxKurali` (varyant başına bir satır; boş
  alan = genel ayarı izle).
- Gönderim izi: mevcut `AuditLog` (yeni tablo yok — geriye bakmak için yeterli).
- ⚠ Şema değişikliği → migration ayrıca onaya sunulur.

## Sıra

1. Şema + ayar ekranı + öneri hesabı (saf gövde, bekçili) + Buybox satırında öneri — Onaylı mod.
2. Halil testi: öneriler gerçek ürünlerde kontrol edilir.
3. Otomatik mod + 15 dakikalık uç. ✓ yazıldı 27.10.2026 — Halil testi bekliyor.
