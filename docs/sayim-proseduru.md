# Fiziksel Sayım Prosedürü

> **Bu belge operasyonun nasıl sayacağını anlatır.** Ekran bu belgeyi birebir
> uygular; ikisi ayrıştığında kazanan bu belgedir ve ekran düzeltilir.
>
> **Sürüm 2 — 28.08.2026.** Birinci sürümdeki iki hata düzeltildi:
> "Eksik" bölümünde **"alım yap"** yazıyordu (o FAZLA durumunun yolu) ve
> **"maliyet gider yazılır"** deniyordu (gider tablosuna YAZILMIYOR).
> _Aşılan sürüm sessizce değiştirilmedi; ne olduğu burada yazıyor._

---

## 0 · Sayım gününü seçin — iki gerçek seçenek

⛔ **"Sabah ilk satıştan önce yap" kuralı KALDIRILDI.** Sayım bir gün sürüyor;
gün boyu sayarken satış da çıkacak. Uygulanamayan bir kural, kural değildir.

| | Ne yaparsınız | Bedeli |
|---|---|---|
| **A · Temiz gün** | Sayım günü hiç kargo çıkarmazsınız | Bir günlük sevkiyat gecikmesi · sayım tertemiz |
| **B · Gün içinde çalış** ⭐ | Normal çalışırsınız, sayım paralel gider | O gün hareket gören ürünler **belirsiz** işaretlenir |

**Tavsiye: B.** Ölçüldü — son 30 günde **günde ortalama 9,6 satış kalemi**
çıkıyor. Yani kabaca **10 civarı varyant** belirsize düşer (kapsamın ~%5'i).
Onların düzeltmesi yazılmaz, ertesi gün tek tek bakılır.

**Neden belirsiz:** defter **gün** çözünürlüğünde çalışıyor (hareketlerin
%99,6'sı gün damgalı). Sabah 09:00'da çıkan kargo ile 14:00'te yapılan sayım
aynı güne yazılı; sistem hangisinin önce olduğunu **ayıramaz.** Uydurmak
yerine işaretliyoruz.

## ⏱ Süre — bir gün ayırın

Sebebi okutma hızı değil, **ürünü bulmak**: kapsamın **%65'i** tek bir `DEPO`
konumunda, raf adresi yok. Okutmak saniyeler sürer; hangi kutuda olduğunu
bulmak sürer.

---

## 1 · Açılış

`/okut` → **Sayım başlat**. Kapsam ekranda yazar (stoğu > 0 olan varyant
sayısı — sabit değil, o anki stoktan okunur).

O gün stok hareketi varsa ekran **açılışta** söyler — kapanışta değil, o zaman
geç olur.

Sistem kapsamdaki **her varyant için satır açar**; hepsi `sayılmadı` durumunda
başlar. Bu yüzden sayılmayan bir ürün asla sessizce kaybolmaz.

**Kod:** `sayim-YYYYMMDD`. Aynı gün ikinci sayım açılırsa `-2` eklenir.

## 2 · ⭐ Ara verin — sistem bekler

- **Her okuma anında kaydedilir** — oturum sonunda toplu değil
- Uygulamayı kapatıp açabilirsiniz; dönüşte **aynı sayıma** girersiniz
- Sayaç kaldığı yerden devam eder: `sayılan X / kapsam · kalan Z`
- Ekran uykuya geçmez (sayım oturumu boyunca)

Aynı anda **tek açık sayım** olabilir — dönüşü mümkün kılan kural budur.

## 3 · Sayım

Barkodu okutursunuz. **Her okuma +1.** 4 adet varsa 4 kez okutursunuz.

**Kamera açık kalır** — okuma kamerayı kapatmaz. Aynı ürünü kadrajda tutmak
adedi artırmaz; **kadrajdan çıkarıp yeniden göstermek** artırır. Yanlış
okumayı düzeltmek satırdaki `−` / `+` ile iki dokunuş.

**Listede olmayan bir şey çıkarsa → okutun.** Sistem reddetmez:
*"kapsam dışı bulundu"* diye işaretler. Bu hata değil, **bulgunun kendisi.**

**Bir ürün rafta hiç yoksa → okutmayın.** Kapanışta sorulacak.

---

## 4 · Kapanış

Ekran **önce** okutulmayanları sorar — **varsayılan YOK:**

- **Rafta yok → 0 say** (gerçek eksik olarak sayılır)
- **Sayılmadı → dokunma** (sistem hüküm vermez)

> ⛔ **BU AYRIM SİSTEMİN EN KRİTİK YERİ.** Karıştırılırsa **sayılmamış mal
> stoktan silinir.**

Sonra **dört sayı** çıkar — ve **beşincisi ayrı durur:**

```
kapsam · sayıldı · sapan · SAYILMADI          + belirsiz (ayrı)
```

`belirsiz` dörde **karışmaz**: o bir kapsam eksikliği değil, hüküm
verilemeyen bir satır.

## 5 · Karar — fazla ve eksik AYRI

Tek "fark" tablosu **yoktur.** 3 eksik + 3 fazla net sıfır eder ve "her şey
yolunda" der — oysa ortada bir satış ve bir alım kaydı eksiktir.

### 🔻 EKSİK — *"Sistem 7 diyor, rafta 5 var → sistem 2 FAZLA gösteriyor"*

Büyük ihtimalle **kaydı girilmemiş bir satış.** Maliyet **biliniyor** (FIFO
partisinden gelir).

| Yol | Ne zaman |
|---|---|
| **Satışı gir** | Mal müşteriye gitti ve satış sistemde YOK |
| **Sayım farkı yaz** | Nereye gittiği bilinmiyor (kayıp, kırık, yanlış raf) |

⚠ **ÜÇÜNCÜ İHTİMAL — ekran uyarır:** o üründe **stok hareketi olmayan satış
kaydı** varsa, satış zaten sistemdedir ve yeni satış girmek **ciroyu iki kez
sayar.** Ekran o satırda şunu yazar: *"Bu üründe stok hareketi olmayan N satış
kaydı var — yeni satış girmeden önce onlara bakın."* N sıfırsa satır çizilmez.

> ⭐ **EMİN DEĞİLSENİZ SAYIM FARKI SEÇİN.** Yanlış sayım farkı GERÇEK NET'i
> düşük gösterir ve **ters kayıtla düzeltilebilir**; yanlış satış **ciroyu
> şişirir, KDV ve stopaj matrahına girer, hakediş beklentisi doğurur.**
> Bu bir tavsiyedir, kapı değil — ikisini de seçebilirsiniz.

### 🔺 FAZLA — *"Sistem 0 diyor, rafta 2 var → sistem 2 AZ gösteriyor"*

Büyük ihtimalle **kaydı girilmemiş bir alım.** Maliyet **BİLİNMİYOR** ve
sistem uydurmaz. Üç yol, **sırası kural:**

1. **Alımı gir** ← önce bu. Fatura varsa maliyet gerçek gelir
2. **Maliyet gir + fazla yaz**
3. **Maliyeti bilmiyorum** → parti maliyetsiz doğar; o mal satılınca kâr
   *"hesaplanamadı"* der

> ⛔ **SIRA KURALDIR.** Önce fark yazıp sonra faturayı girerseniz **stok iki
> kez artar.** Düzeltmeyi yazdığınız an satır **kilitlenir.**
>
> Ölçüldü: elle girilen alımların **ortanca gecikmesi 31 gün** (p75 82). Yani
> bu listenin çoğu "maliyeti bilinmeyen mal" değil, **faturası daha girilmemiş
> alım.**

### ⚠ Belirsiz satırlar

Sayım gününde hareketi olan ürünler listede durur ama **düğmeleri kapalıdır**
ve sebebi yazar. Karar sizin; sistem sessizce yazmaz.

---

## 6 · Hesaplar karışır mı? — HAYIR

Sayım farkı **bir satış değildir:**

| | |
|---|---|
| **Ciro** | ⛔ değişmez |
| **NET-1 / NET-2** | ⛔ değişmez |
| **Gider tablosu** | ⛔ **YAZILMAZ** — tek kaynak stok defteri, çift kayıt olmaz |
| Dönem raporu | ✅ ayrı **"fire / sayım farkı"** kalemi |
| **GERÇEK NET** | ✅ o malın **alış maliyeti** kadar düşer |

Formül (`lib/rapor.ts`):
`gercekNet = brutNet2 − giderNetDusen − duzeltmeZarari`

> ⚠ **Sürüm 1'de "maliyet gider yazılır" yazıyordu — YANLIŞTI.** Gider
> tablosuna yazılmıyor; gider **gibi davranıyor** ama ciroya hiç dokunmuyor.

---

## 7 · Sonrası — sayım kendini denetler

Sayım gününe ait geç bir kaydı sonradan girerseniz o varyantın sayım günü
stoğu **değişir** ve satır **yeniden açılır:**

> *"Bu ürüne sayımdan sonra geriye dönük kayıt girildi. Sayım farkı yeniden
> hesaplanmalı."*

Kalıcı bir *"sayıldı, bir daha bakma"* damgası **yoktur** — doğrulanan ürün
değil, **ürünün o günkü hâlidir.**

Bu yüzden **kapanış sırası:** önce bekleyen belgeleri girin, sonra farkı yazın.

---

## Ekranın dili

> **Rafta ne varsa O DOĞRUDUR. Sistem yanılır, raf yanılmaz.**

Sapma cümlesi hep defterin tarafından kurulur — *"sistem 2 fazla gösteriyor"*,
asla *"sayımda 2 eksik"*. İkinci cümle sayımı sanık yapar.

Ve kapsam her raporda yazar: bu sayım kapsam dışındaki varyantlar hakkında
**hiçbir şey söylemez.**
