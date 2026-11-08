# Tanıtım vitrini — `tanitim/`

Dışarıya kendimizi anlatan herkese açık sayfa. **Canlı uygulamadan tamamen
ayrıdır.**

| | |
|---|---|
| Ne | Tek sayfalık statik site (HTML + CSS). Derleme yok, bağımlılık yok, JavaScript yok. |
| Nerede duracak | Kendi Vercel projesi → `tanitim.bezirga.com` |
| `axc` projesine etkisi | **Yok.** `bezirga.com`, oturumlar, telefondaki kurulu uygulama değişmez. |
| Bekçisi | `npm run tanitim:dogrula` · mutasyonu `npm run tanitim-mutasyon:kontrol` |

---

## İletişim adresi

**`info@bezirga.com`** (kullanıcı kararı 08.11.2026). Sayfada iki yerde geçiyor:
`index.html` → İletişim bölümündeki düğmenin `mailto:` hedefi ve görünen yazısı.

⚠ **Posta kutusunun KAS'ta gerçekten açık olması şarttır.** Açık değilse
gelen posta sessizce kaybolur ve kimse kaybolduğunu göremez — adres değiştirilirse
bu iki yer birlikte değişir.

---

## Ekran görüntüleri nereden geliyor

`tanitim/gorsel/` bir **aynadır**: içindeki her dosya `public/kitap-ekran/`
içindeki eşinin **bayt bayt aynısıdır**. O klasörü dolduran tek şey
`npm run ekran:cek`tir ve o betik örnek veritabanına bağlı değilse çekim
yapmayı reddeder.

Yani eşitlik, görüntünün **uydurma veriden geldiğinin kanıtıdır**.
`tanitim:dogrula` bunu her push'ta ölçer.

Görüntüleri tazelemek:

```
npm run ekran:veri          # örnek veritabanını kurar (bkz. betiğin başlığı)
EKRAN_PAROLA=... npm run ekran:cek
cp public/kitap-ekran/*.jpg tanitim/gorsel/
npm run tanitim:dogrula
```

⚠ **Vitrine ait başka bir görsel (ekip fotoğrafı, çizim) `gorsel/` klasörüne
KONMAZ** — ayna bozulur ve bekçi kırmızı yanar. Öyle bir ihtiyaç doğarsa
`tanitim/resim/` açılır; bekçi oraya karışmaz.

⚠ **Gerçek defterin ekran görüntüsü buraya hiçbir koşulda konmaz.** Müşteri,
tedarikçi, SKU, alış fiyatı ve kâr rakamı internete çıkar — ve arama motoru
önbelleği yüzünden silmek geri getirmez.

---

## Marka

Renkler ve logo yolları `src/lib/marka/cizim.tsx` → `MARKA_PALETI`'nden
**birebir** alındı (kobalt `#12356B` · safran `#E3A13A`). Elle "yakın bir
mavi" yazılmaz. Marka değişirse tek kaynak orasıdır ve buraya oradan taşınır.

---

## Sayfadaki rakamlar

Hepsi ölçüldü (06.11.2026) ve kaynağı `index.html` başındaki yorum bloğunda
yazılı. **Bu dosyaya yeni bir rakam yazan, önce onu ölçer ve kaynağını
yazar** — kaynağı yazılmayan sayı kullanılamaz.

İş hacmi rakamı (günlük paket, ciro, ürün adedi) **bilerek yok**: gerçek iş
verisidir ve kullanıcı onayı olmadan dışarı yazılmaz.

---

## Yayın

`vercel.json` yalnız `main` dalında dağıtıma izin verir (`gelistirme`,
`k303-cok-firma` ve `tasarim-canli` kapalı) — `axc` ile aynı düzen.

Kurulum (bir kez): Vercel'de **yeni proje** → aynı GitHub deposu →
**Root Directory = `tanitim`** → Framework **Other** → alan adı
`tanitim.bezirga.com`.
