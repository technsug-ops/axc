# Bekleyen İşler

> **Yalnız AÇIK kalemler.** Kapanan iş buradan **silinir**, gerekçesiyle
> birlikte → **[ARSIV.md](ARSIV.md)**'e geçer.
>
> **Durum etiketi zorunlu:** `[KOMUT]` verildi/taşınmadı ·
> `[YAZILDI]` betik var/koşmadı · `[KOŞTU]` ölçüm yapıldı ·
> `[BEKLİYOR]` dış bir şeye bağlı.
> _Pano işin DURUMUNU değil NİYETİNİ kaydederse zamanla kurgu üretir._
>
> **Kimlik tekildir.** Aynı kod ikinci kez kullanılmaz; aciliyet ayrı
> sütunda yaşar, kodun içinde değil.

---

## 🚨 K48 — BEKÇİ DERLEMEYİ SINAMIYOR · 30.08.2026 · [ÖLÇÜLDÜ, DARALTILDI]

> **BEDELİ ÖLÇÜLDÜ:** 30.08'de **üç push boyunca üç ekran canlıda yoktu**
> (`/yerlestir`, `/paketle` raf okuması, toplu taşıma) ve **hiçbir bekçi
> görmedi.** Tur 63/63 yeşildi ve kod **yayınlanamıyordu.** Halil test
> listesini uygulayınca çıktı: A ✓ B ✓ (önceki deploy) · C ✗ D ✗ E ✗
> (yayınlanmamış üç paket). **"Yeşil" yanlış güvence verdi.**

### ⛔ KÖK — TEK SATIR, BÜTÜN MODÜLÜ DÜŞÜRDÜ

    // src/app/yerlestir/actions.ts   ("use server")
    export const YERLESTIRME_EYLEMI = "URUN_YERLESTIRILDI";

`"use server"` dosyasında yalnız async fonksiyon dışa aktarılabilir. Sabit
konunca modülün BÜTÜN dışa aktarımları düştü ve derleme patladı.

### 📏 ÖLÇÜM — `tsc` NEYİ GÖRMÜYOR (4 sınıf enjekte edildi, tek build)

| # | Sınıf | `tsc` | `next build` | Desen yasağı |
|---|---|---|---|---|
| 1 | `"use server"` async olmayan dışa aktarım | ✗ | ✓ | ✅ **KAPANDI** — `sunucu-eylemi:dogrula` (64. bekçi) |
| 2 | İstemci → sunucu modülü (`@/lib/prisma` → `fs`·`net`·`tls`) | ✗ | ✓ | ⏭ kapanabilir — içe aktarma grafı |
| 3 | İstemci → `next/headers` | ✗ | ✓ | ⏭ aynı grafla, 2 ile aynı bekçi |
| 4 | `"use client"` içinde `export const metadata` | ✗ | **✗** | ⛔ **İKİSİ DE GÖRMÜYOR** — sessiz sınıf |

⚠ **4. SINIF AYRI BİR KALEM:** ne `tsc` ne `build` yakalıyor; metadata
sessizce yok sayılıyor. Bir sekme başlığı yanlış kalır ve kimse anlamaz.

### 📏 MALİYET ÖLÇÜMÜ

    bekçi turu (bugün, 64 doğrulama)          218 sn
    next build — BAŞARILI (tip kontrolü KAPALI) 122 sn
    next build — BAŞARISIZ (hızlı düşer)         33 sn
    next build — tip kontrolü AÇIK          ⛔ BELLEKTEN DÜŞÜYOR
                                            (12,7 GB RAM, 0,5 GB boş)

⭐ **TİP KONTROLÜ `next build` İÇİNDE GEREKSİZ:** `tsc:dogrula` onu zaten
ayrı koşuyor. `typescript.ignoreBuildErrors` ile build **122 sn'de çıkış 0**
veriyor ve bellekten düşmüyor. Yani _"build yerelde koşamıyor"_ artık
doğru değil — ölçüldü.

### ⚠ İKİNCİ BULGU — `tsc` KENDİ BAŞINA YETMİYOR

`.next` silinince `tsc --noEmit` **düşüyor**: `LayoutProps` Next'in
ÜRETTİĞİ bir tip. Yani bekçi turu kendi kendine yeterli değil — temiz bir
klonda `tsc:dogrula` bir build/dev koşmadan kırmızı yanar.

### ⏭ KARAR BEKLEYEN — ÜÇ YOL, MALİYETLERİ ÖLÇÜLDÜ

| Yol | Maliyet | Yakalama gecikmesi |
|---|---|---|
| **(a)** Build her push'ta | tur 218 → **~340 sn** (+%56) | **sıfır** |
| **(b)** Yalnız desen yasakları | ~2 sn | bilinen sınıflarda sıfır, **bilinmeyende sonsuz** |
| **(c)** Günde bir / elle | ~0 | **24 saate kadar** — bugünkü bedelin ta kendisi |

### ✅ KARAR UYGULANDI — (a) + 2/3 bekçisi · 30.08.2026 [KOŞTU]

**Kullanıcı kararı:** build tura girer, tip kontrolü kapalı; 2+3 için içe
aktarma grafı bekçisi; sınıf 4 ölçülüp kapatılabiliyorsa eklenir; `.next`
bağımlılığı ayrı kalem.

    tur 64 → 66 doğrulama · 218 → 311 sn (öngörü ~340)
      derleme:dogrula        54,5 sn (sıcak önbellek; soğuk 122 sn)
      istemci-siniri:dogrula  2,8 sn
      sunucu-eylemi:dogrula   2,0 sn

· **① `derleme:dogrula`** — `next build`, tip kontrolü `BEKCI_DERLEME`
  değişkeniyle kapalı. ⚠ **Vercel o değişkeni KURMUYOR**, canlı deploy'da
  tip kontrolü tam koşuyor; son kapı körelmedi. Çıktı `.next-bekci`ye —
  `.next`e yazsaydı açık bir `next dev` sunucusunu ezerdi.
  ⚠ Bekçi "çıkış 0" ile yetinmiyor, `Compiled successfully` satırını da
  arıyor: yapılandırma bir gün derlemeyi atlarsa çıkış 0 gelir ve bekçi
  hiçbir şey ölçmemiş olurdu.
· **② + ③ + ④ `istemci-siniri:dogrula`** — üçü de aynı sınırın tarafında,
  tek bekçide. Graf `"use server"` sınırında DURUYOR (istemcinin sunucu
  eylemi çağırması meşru) ve `import type` sayılmıyor (derlemede silinir).
· **④ ÖLÇÜLDÜ VE KAPATILABİLDİ** — `"use client"` içinde `metadata`.
  Build bile görmüyordu; artık tek kapısı bu bekçi.

### ⛔ BEKÇİ YAZILIRKEN ÜÇ KUSUR ÇIKTI — ÜÇÜNÜ DE MUTASYON BULDU

1. **76 YANLIŞ POZİTİF:** graf `"use server"` sınırında durmuyordu; her
   istemci → eylem → `yetki` → `oturum` → `next/headers` zinciri kirli
   sayıldı. Ölçüm çürüttü: `next build` bu 76'nın hiçbirine kızmıyor.
2. **DESEN LİSTESİ YANLIŞTI:** `^@prisma/client$` yazmıştım, bu deponun
   gerçek zinciri `@prisma/client/runtime/client` ve `@prisma/adapter-mariadb`.
   Listeyi ölçmeden, genel Next dünyasından yazmışım — prisma'yı DOĞRUDAN
   içeri alan mutasyon YEŞİL geçti.
3. ⛔ **ÇIKARICI İÇE AKTARMALARI HİÇ GÖRMÜYORDU:** tembel `[\s\S]*?` aralığı
   dosyanın başındaki bir `export type`tan başlayıp ilk `from`a kadar her
   şeyi yutuyor, aradaki gerçek `import` satırları o aralıkta kalıyor ve
   "tip" sayılıp atlanıyordu. **Bekçi yeşildi çünkü BAKMIYORDU.**

### ⏭ AÇIK KALAN

· **Tamlık iddia EDİLMİYOR:** dört sınıf ölçüldü, Next sürümü değiştikçe
  sınıf doğar. Desen yasağı bilinen sınıfların listesi, build yer gerçeği —
  ikisi birbirinin yedeği. _(Anayasa: "bir kaynağın listesi kendi tamlığını
  kanıtlayamaz".)_
· **Süre büyürse çözüm build'i ÇIKARMAK değil** (kullanıcı kararı): paralel
  koşum ya da önbellek ölçülür. Ayrı kalem, bugün açılmadı.

### ✅ `.next` BAĞIMLILIĞI KALDIRILDI (madde 4)

Ölçüldü: `.next` yokken tur **63/64** — düşen tek şey `tsc:dogrula`, sebep
`layout.tsx`teki `LayoutProps<"/">` (Next'in ÜRETTİĞİ tip). Temiz bir klonda
tur, bir `build`/`dev` koşulmadan kırmızı yanardı ve sebebi koddaki bir hata
değil, eksik bir çıktı olurdu.

⭐ **Çare belgelemek değil, bağımlılığı kaldırmak:** tip elle yazıldı
(`{ children: React.ReactNode }`). Depoda başka üretilmiş tip kullanımı YOK
(tarandı). Doğrulandı: `.next` silinip `tsc --noEmit` koşuldu → **çıkış 0**.

---

## 📊 DÖRT CEPHE — 28.08.2026 [KOŞTU] `npm run canli:dort-cephe`

Halil sordu: _"alımlar satışlar iadeler kargolar düzeldi mi?"_ Dördü ayrı
ölçüldü; **ikisi düzeldi, biri kilitli, biri hiç başlamadı.**

| cephe | hâl |
|---|---|
| **ALIMLAR** | ✅ neredeyse temiz — 1971 alım · 2011 kalem · FIFO açık parti **811 adet / ₺2.235.150,51** (ödenen, KDV dahil) · ⚠ **2 varyantta ayrışma** |
| **SATIŞLAR** | ✅ **DÜZELDİ** — 5810 satış (37 iptal) · kalem `CALCULATED` **5880** · `NO_COST` **10** · `RULE_MISSING` **3** |
| **İADELER** | 🔒 **KİLİTLİ** — defterde **8** `Return`, dosyada **366** · bkz. K73 |
| **KARGOLAR** | ⛔ **HİÇ BAŞLAMADI** — 5773 geçerli satışın yalnız **%2,7'sinde** kargo var |

**② SATIŞLARDA ASIL KANIT — mekanizma tuttu:**

    NET-2 yazılı satış 5763  =  CALCULATED 5763   ✓ BİREBİR

Bugün alınan _"NET yalnız `CALCULATED` iken yazılır"_ kararı **ölçülerek
doğrulandı**: eksik hesaplı hiçbir satış NET taşımıyor.
Komisyon oranı boş kalem **5319 → 3** · maliyet bağı olmayan **2493 → 10**.

**① AYRIŞMANIN KAYNAĞI BULUNDU — VE BUGÜNÜN İŞİ DEĞİL.**
`canli:defter-ayrismasi`: incelenen 1040 · temiz 1038 · **sapan 2** ·
incelenemeyen 0. İkisi de **23.08.2026 tarihli `EXCHANGE_OUT`** satırı ve
ikisi de **partisiz çıkış** — ledger düşüyor, FIFO düşmüyor:

    axcali1660  ledger  2 ↔ FIFO  3   (cmt6bwbno… · 23.08 21:37)
    axcali1610  ledger 11 ↔ FIFO 12   (cmt6d7clk… · 23.08 22:14)

⭐ Anayasadaki **"hayalet adet"** deseninin ta kendisi. Değişim akışı
negatif hareketi `sourceMovementId` olmadan yazıyor. ⛔ Hüküm verilmedi —
hangi defterin doğru olduğu vakaya göre değişir.

**④ KARGO — ALTYAPI VAR, VERİ YOK.**

    tanımlı firma 12 · yüklü tarife satırı 44.841     ← hazır
    kargo firması seçili   153 / 5773   (%2,7)
    kargo ücreti girili    161 / 5773   (%2,8)
    desi girili            154 / 5773   (%2,7)
    kâr hesabındaki KARGO kesintisi: 161 satır · ₺21.843,97

⚠ **YÖN KESİN, BÜYÜKLÜK ÖLÇÜLMEDİ:** 5612 satışta kargo hiç düşülmüyor,
yani **NET-2 olduğundan YÜKSEK**. Kaç lira olduğu ancak desi × tarife ile
hesaplanır; gözlenen 161 satışın ortalamasını 5612'ye çarpmak **kaba bir
tahmin olurdu** ve o sayı ekrana yazılmaz.

---

## 🆕 K69 — DOSYA MALİYETİ ASIL VERİ · 28.08.2026

> **Kullanıcı kararı:** _"M sütunundaki alış fiyatı ASIL VERİ. Bu rakamlar
> KDV DAHİL ve sahih."_ Ve içe aktarmadaki _"hesap sütunları yazılmaz"_
> kararı kâr/ROI/KDV için doğruydu ama **alış fiyatı hesap SONUCU değil,
> kullanıcının KAYDI** — komisyon oranında aynı hata yapılıp düzeltilmişti.

**KDV ÖLÇÜLEREK DOĞRULANDI, KABUL EDİLMEDİ:** defterdeki `unitCostAmount`
KDV dahil (`envanter.ts` ondan `kdvHaric` alıyor) ve dosya **1128 kalemde
BİREBİR** tutuyor (×1,000). Komisyondaki ×1,20 tuzağı burada yok (2 kalem).

| # | İş | Durum |
|---|---|---|
| ① | FIFO boş kalemlere dosya maliyeti | **[KAPANDI 28.08.2026]** — 2551 kalem · ₺4.522.783 |
| ② | 2175 çelişen kalem | **[ŞERHLİ AÇIK]** — dokunulmadı |
| ③ | Kronoloji düzeltmesi | **[BEKLİYOR]** — ayrı iş, 309 kalem / 423 hareket |

**ÜÇ KARAR:**
· **FIFO ÜSTÜNE YAZILMAZ** — _"ölçülmüş gerçek, ölçülmemiş beyanla
  değiştirilmez."_ Çelişen 2175 kalem şerhli kalır (defter ₺4.917.625 ↔
  dosya ₺4.717.391).
· Aykırı satır yazılmaz, ayrı kovada bekler.
· Karşılığı olmayan 10 kalem `NO_COST` kalır — uydurulmaz.

**⭐ ₺1,00'LIK SATIRLAR DOĞRULANDI VE YAŞIYOR.** Kullanıcı: _"bu ürünle
promosyon geldi ve sattım, ondan dolayı maliyetlerini 1 lira yazdım."_
Dosyadaki **tüm** ucuz satırlar tarandı — tam 5, listesiyle birebir.
⛔ Ölçüt SİLİNMEDİ, istisna BEYAN edildi (`DOGRULANMIS_UCUZ`): yarın doğan
yeni bir ucuz satır yine işaretlenecek.

### ✅ ① KAPANDI — SONUÇ

    2551 kalem · 5102 hareket · hata 0 · 2505 satış tazelendi
    kutu         2516 → 21
    panel marjı  %11,56 → %12,63   (ÖLÇÜLDÜ, panelin kendi gövdesinden)
    CALCULATED 5753 · NO_COST 8 · RULE_MISSING 10 · (boş) 3
    ikinci koşum 0 ✓   ·   ihlal taraması 0 ✓
    geri alma: `note` = 'dosya-maliyet-20260828'

⚠ **TAHMİNİM YANLIŞ ÇIKTI:** _"maliyet artacağı için marj düşecek"_ demiştim,
**yükseldi.** Sebep: 2551 kalem `NO_COST`tan çıkıp hesaba GİRDİ — hem paya
hem paydaya eklendiler. Küme değişince oran karşılaştırılamaz kuralını kuru
koşuma yazmıştım, kendi cümlemde uygulamamışım.

⚠ **RAPOR "TUTMADI" DEDİ, SEBEBİ BİZDE DEĞİLDİ.** Genel sayaç kullanılmıştı
ve fark 5104/5102 · net stok 771→781 çıktı. Aradaki 2 hareket ve +10 stok,
koşum SÜRERKEN kullanıcının girdiği iki alımdı (`ALM-HB-260828-08/09`,
axcali3101, 10:59 ve 11:00). Sayaç kendi partisine daraltıldı: **5102
hareket, net stok 0 ✓**. Aynı anda başkası yazabiliyorsa genel sayaç
**yalancı kırmızı** üretir.

**KALAN:** `NO_COST` 8 (dosyada karşılığı yok) · `RULE_MISSING` 10 (8'i
Amazon — komisyon oranı yok, K64 ④'e bağlı).

---

## 🆕 K70 — İADE AÇIĞI · 28.08.2026

> Kullanıcı: _"iadeleri daha önce ters işlem yani negatif tutarla
> kapattım."_ Ters satırların tam listesini verdi (391 satır).

⚠ **SAYIM UYUŞMAZLIĞI LİSTEYLE ÇÖZÜLDÜ.** Kullanıcı "256" demişti, ölçüm
`ÜRÜN ALIŞ FİYATI` sütununda **391** diyordu. Listenin kendisi **391 satır**
çıktı — ölçüm doğruymuş. Rakamı tartışma değil **liste** kapattı.

    liste 391 satır · 385 sipariş · TÜR iade=366 · iptal=24 · satış=1

**⭐ İADE AÇIĞI ÖLÇÜLDÜ:**

    satış VAR, iade kaydı YOK : 243 satır · 238 sipariş
    ⭐ CİRO BU KADAR FAZLA     : ₺694.431,92
    son 90 gün 16 kayıt ₺60.606 · son 180 gün 64 kayıt ₺220.709
    en yoğun: 2025-11 (29) · 2025-12 (25) · 2026-01 (23) · 2026-05 (23)

⚠ ₺694.432 **iade edilen kalemlerin** tutarıdır; o satışların tam cirosu
(₺710.189) DEĞİL. İki rakam karıştırılmaz.

**③ 143 SİPARİŞ SİSTEMDE HİÇ YOK — Türk Kahvesi ile AYNI KOVA.** Ana satış
dosyasında 299 satırları var (155'i satış satırı; TÜR: satış=141 ·
tazmin=13 · Zarar=1). Yani satışları da girmemiş.

**④ İADE İÇE AKTARMASI — İKİ ALAN EKSİK, UYDURULAMAZ.**
Dosyada var: sipariş no · tarih · adet · tutar · SKU.
⛔ Dosyada YOK: **iade SEBEBİ** (`ReturnReason`) ve **iade TÜRÜ**
(`UNDELIVERED`/`NORMAL`/`DISPUTED`).
· `reason` iade akışının tamamını yönlendiriyor; `DIGER` diye toplu yazmak
  366 iadeyi analiz edilemez hâle getirirdi — ve o kova zaten en az izlenen.
· `returnType` **KARGO MALİYETİNİ** değiştiriyor (iade-sureci §5).
⭐ **ÖNERİ:** `ReturnNotice` değil doğrudan `Return` + `ReturnItem`
(mal gelmiş, süreç bitmiş) · ve dosyaya **iki sütun** eklenmesi istenir —
kullanıcı biliyor, sistem bilmiyor. **YAZILMADI.**

**⑤ 24 İPTAL SATIRI:** sistemde iptal işaretli **0** · **NORMAL görünen 5**
(ciroda duruyor) · sistemde yok 19.

### ⭐ HALİL DOĞRULADI — 5 DEĞİL, 4 İPTAL + 1 İADE

⚠ **DOSYADAKİ `TÜR` SÜTUNU TEK BAŞINA HÜKÜM VERMEZ.** Ölçüm beşini de
"iptal" saydı çünkü dosya öyle diyordu; kullanıcı ayırdı:

    İPTAL (4)  4234503772 · 4597407440 · 4852324050 · 4002405216
    ⛔ İADE (1) 4619254455 — satış GERÇEKLEŞTİ, mal döndü

`4619254455`e iptal yazmak satışı **hiç olmamış** gibi gösterirdi; o 243'lük
iade kovasına ait ve iade içe aktarma kararını bekliyor.

**✅ İPTAL YAZILDI — 28.08.2026** (`canli:iptal-yaz -- --yaz`,
uygulamanın kendi `iptalOnizle`/`iptalUygula` gövdesiyle; ikinci iptal
mantığı YAZILMADI). Ölçülen fark beklenenle **birebir**:

    ciro farkı  −5.475,00   (beklenen −5.475,00)   ✓
    stok farkı       +4     (beklenen +4 — mal geri döner) ✓
    düşen NET-2  ₺840,57  ·  iptal 4 · engellendi 0

İz: `AuditLog: DOSYADAN_IPTAL_ISARETLENDI` (hariç tutulan `4619254455`
gerekçesiyle birlikte yazıldı). Geri alma: satış ekranından iptal geri alınır.
⚠ **SEBEP BİR İDDİADIR VE UYDURULMADI:** dosya KİMİN iptal ettiğini
söylemiyor; `MAGAZA_DIGER` yalnız zorunlu alanı karşılamak için seçildi
(açıklamayı ZORUNLU kılan tek değer) ve gerçek durum nota yazıldı.
Ölçüldü: `iptalSebebi` hiçbir HESABI sürmüyor — yalnız ekran gruplaması
(`lib/satis-iptali.ts`), yani bedeli yanlış rakam değil yanlış ETİKET.

⚠ **Kâr tazelemesi GEREKMEZ:** iptal kârı yeniden hesaplamaz —
`iptalTarihi` dolunca satış bütün süzgeçlerden **düşer**. Kayıt yerinde
durur, yalnız sayılmaz.
⚠ **Stok:** iptalde mal geri döner. Toplu yazım yapılacaksa **iptal
akışının kendi gövdesi** kullanılmalı; ikinci bir iptal mantığı yazılmaz.

### ⭐ İADE İÇE AKTARMA — ÖNCEKİ RAPORUM EKSİKTİ

_"İki alan eksik: reason ve returnType"_ demiştim. Şema okundu:
**`Return` modelinde `reason` alanı HİÇ YOK.** O yalnız `ReturnNotice`ta
ve o model malın GELMESİNİ bekleyen aşamanın kaydı — burada süreç bitmiş.

⛔ **VE BU RAPORUM DA EKSİKTİ — BİR DEĞİL, ÜÇ BİLİNMEYEN VAR.** Yazma
gövdesi (`lib/iade.ts → iadeKaydet`) okundu; şemaya bakmak yetmiyormuş:

| # | bilinmeyen | bedeli |
|---|---|---|
| 1 | `returnType` | **şemada NÖTR DEĞER YOK** — üç değer de bir şey iddia ediyor |
| 2 | `saglamAdet` / `hasarliAdet` | ⭐ **EN AĞIRI: STOK.** `RETURN_IN` yalnız sağlam adet için yazılıyor |
| 3 | `iadeKargosu` | `KARGO` sütunu satışın mı iadenin mi — belirsiz |

**② EN AĞIR OLANI ÖNCEDEN HİÇ GÖRÜLMEMİŞTİ.** "Hepsi sağlam" dersek
**stok +236 adet** artar ve mal hurdaya gittiyse envanter değeri şişer;
"hepsi hasarlı" dersek gerçekten dönen mal kaybolur. Dosya bunu söylemiyor.

**B SEÇENEĞİ KURU KOŞUMU — YAZILABİLİR KÜME ÖLÇÜLDÜ:**

    dosyadaki iade satırı 366
    ⭐ YAZILABİLİR         236 Return + 236 ReturnItem · 236 adet · ₺683.923,92
    dışarıda: satış sistemde yok 125 · zaten iade kaydı var 4 · kalem eşleşmedi 1

⚠ **VE "CİRO ₺694.432 DÜZELİR" CÜMLEM FAZLA İYİMSERDİ.** `Return` yazmak
`Sale.items`i DEĞİŞTİRMEZ — ciro rakamı **aynı kalır**, iade etkisi kâr
motorunda AYRI taşınır. Bugünkü hâlden yine de iyi, ama beklenti düzeltilir.

**B için merdiven inildi:** `Return.note` serbest metin ve `code` boş —
tür BİLİNMİYOR diye işaretlenip **kargo hesabı dışında** bırakılabilir,
yeni sütun açmadan. Tür VARSAYMAK ise kargo maliyetini değiştirir
(iade-sureci §5) ve yasak.
⚠ Dosyada tür ipucu arandı: `KARGO` sütunu 193/366 satırda dolu — kullanıcı
bunun **KULLANILMAYACAĞINI** söyledi: ipucu ölçüm değildir.

✅ **KARAR VERİLDİ 28.08.2026 — B İPTAL, EKSTRE YOLU SEÇİLDİ.**
Ayrıntı ve açılış şartı: **K73** (kilitli). **YAZILMADI.**

---

## 🆕 K71 — TANINMAYAN TÜRLER · 28.08.2026

Dosyadaki `TÜR` sütununun tam dökümü ölçüldü; içe aktarmanın tanıdığı
yalnız `satış`:

    satış   9743 · 25.871.523,48      iade      387 · 1.020.513,02
    tazmin    27 ·     91.279,89      iptal      24 ·    51.077,00
    TATİL      8 ·          0,00      aktarma     7 ·    11.294,00
    Zarar      1 ·          0,00

**`tazmin` 27 · ₺91.279,89 liste / ₺71.485,89 alış** (HB 24 · TY 3),
23.08.2024 → 18.08.2026.

⭐ **ÇAPRAZ SONUCU DEĞİŞTİRDİ: `tazmin` AYRI BİR SATIŞ TÜRÜ DEĞİL.**
Ters-satır listesinde **27/27'si** geçiyor — ve orada **26'sı `iade`,
1'i `iptal`** yazıyor. Yani `tazmin`, satışın kendisi değil, **iade
edilmiş bir siparişe düşülmüş "tazmini istendi" NOTU.**

    sistemde satış olarak VAR 14 · ⛔ YOK 13
    o 14'ün hâli: iptal 0 · iade kaydı olan 1 · CALCULATED 13 · NO_COST 1
    ⭐ BUGÜN CİRODA DURAN TUTAR: ₺72.829,00

Yani **bu 14 sipariş K73'ün (iade açığı) içinde** — dosya iade diyor,
defter kâr sayıyor. Kalan 13 ise "hiç girilmemiş satış" kovasında.
⚠ Ürün kimliği yalnız **3/27** satırda tanınıyor (SKU/barkod eşleşmiyor).

`Compensation` modeli var, **4 kayıt** — ama **dördü de `supplierId`**
(karşı taraf TEDARİKÇİ). Dosya kimden tazmin alındığını söylemiyor;
model ya `supplierId` ya `carrierId` istiyor, ikisi farklı iş.
⛔ Ölçülmeden eşleştirilmedi.

**`aktarma` 7 · ₺11.294 liste / ₺6.778 alış** — hepsi HB, 13.06.2024 →
16.04.2025. **Bu kümede tutunacak hiçbir kimlik yok:**

    sipariş no BOŞ 3 · dolu 4 → sistemde VAR 0
    ters-satır listesinde geçen 0 · ürünü tanınan 0/7
    3 satır AYNI ürün (Homend Toastbuster), AYNI gün (31.01.2025)
    1 satırın "no"su aslında sipariş no değil: HBCV00003JIJSK (HB ürün kodu)

⛔ **BUGÜN YAPILACAK BİR ŞEY YOK** — bağlanacak kayıt da, tanınacak ürün
de yok. Kalem **kayıt** olarak durur, görev olarak değil.

**`Zarar` 1** — `4383491870`, 30.09.2024, liste ₺0,00 · alış ₺1.070,00
(Schafer granit tencere). Sistemde satış olarak YOK, ters listede VAR.
Tek satır; ürünü de tanınmıyor.

**`TATİL` 8** — ✅ **KAPANDI: VERİ DEĞİL.** 01–08.08.2024, sekiz ardışık
gün; sipariş no yok, tutar yok, `Satış Miktarı` sütununda bile "TATİL"
yazıyor. Tatil günlerini işaretleyen satırlar. **Bir daha sorulmaz.**

⛔ Hiçbiri eşleştirilmedi; tür atanmadı; yazılmadı.
Ölçüm: `npm run canli:k71-olcum` (salt okuma).


---

## 🆕 K72 — İKİ VAKA HALİL'DEN · 28.08.2026

### ✅ ① `11540657420` — Barbie · **ÇÖZÜLDÜ (teşhis)**

Fatura (e-Arşiv `TEA2026000002461`, 27.08) satışı doğruluyor: ₺1.944,00.
Sistemde satış VAR (`enumerasyon` ile TY API'den gelmiş) ama **stok
hareketi YOK** → maliyet bağı kurulamıyor.

⛔ **BU BÖLÜMDEKİ TEŞHİS YANLIŞTI — DÜZELTMESİ K74'TE.** Kesik bir çıktı
(`tail -45`) okunduğu için bir alım satırı görülmedi. Doğrusu: **10 alındı,
10 satıldı, alım eksiği YOK**; engel bugün elle yazılmış _"test amaçlı"_ bir
`ADJUSTMENT −1`. Aşağıdaki sayılar KESİK ÖLÇÜMDEN gelir, geçerli değildir:

    axcali1869 defteri: 9 giren · 9 çıkan · net stok 0
    ⭐ FIFO AÇIK PARTİ KALANI: 0
    satış kalemi 11 · stok hareketi OLMAYAN 2

Yani **satılan adet alınan adetten 2 fazla.** Satış anında düşecek parti
kalmadığı için `SALE_OUT` yazılamıyor. Alım girilince kendiliğinden düzelir.

⚠ **VE ÖNCEKİ CÜMLEMİ DÜZELTİYOR:** "alımı hiç girilmemiş" demiştim,
kullanıcı itiraz etmişti ve HAKLIYDI — alımlar girilmiş (dokuz kez, hepsi
₺1.200). Eksik olan **son iki adedin alımı.**

### ② `4120311526` — Razer mouse, teslim edilmeden iade

> Kullanıcı: _"Müşteri kargoda iptal ederse TEK kargo bize yansıyor.
> Bu ürün henüz teslim edilmeden iptal edildiği için tek kargo ücreti
> bize yansıdı."_

| kaynak | ne diyor |
|---|---|
| **HB paneli** (kanalın kendi belgesi) | tutar 0 · komisyon 0 · hizmet 0 · stopaj 0 · **KARGO −94,20** · net **−94,20** |
| ters-satır listesi | TÜR iade · adet −1 · liste −6.499 · alış −4.948 · **KARGO −101** |
| **defterimiz** | ₺6.499'luk GERÇEKLEŞMİŞ satış · STOPAJ 54,16 · ÖDEME_GİDERİ 51,99 · HİZMET 12,60 · ⛔ iade kaydı YOK · kargo YOK |

⭐ **KARGO İKİ KAYNAKTA FARKLI: 101 ≠ 94,20.** Kaynak önceliği kuralı
gereği **kanalın kendi belgesi kazanır** (₺94,20 `OLCULDU`, ₺101 kullanıcı
tahmini).

### ⭐ KULLANICININ ÖLÇÜTÜ `returnType`i TAHMİNDEN ÇIKARABİLİR

"Tek kargo = teslim edilmeden döndü" bir **sayılabilir** ölçüttür ve
ekstrede karşılığı var: `KARGO` ve **`KARGO_IADE`** ayrı kodlar.

**AMA KAPSAM ÖLÇÜLDÜ VE BUGÜN YETMİYOR:**

    dosyadaki iade siparişi 360
    ⭐ ekstrede görülen        9  (%2,5)
    ⛔ ekstrede hiç yok      351
    kargo bacağı sayılabilen  5 → 1 bacak=2 · 2 bacak=3

Ölçüt DOĞRU ve teslim edilebilir; **veri kapsamı yok.** 236 iadenin türü
bugün ölçülemez. **Açılış şartı: HB/TY hakediş ekstrelerinin yüklenmesi** —
o gün tür TAHMİN edilmeden ÖLÇÜLEREK yazılabilir.

---

## 🔒 K73 — İADE İÇE AKTARMA · KİLİTLİ · 28.08.2026

> ⚠ Halil bu kalemi "K72" diye adlandırdı; o kod bugün **İKİ VAKA**ya
> gitmişti. Kimlik tekil olmak zorunda (aynı kodu ikinci kez kullanmak
> panoyu taranamaz yapar), bu yüzden **K73**.

**⛔ B SEÇENEĞİ İPTAL — KARAR: EKSTRE YOLU.** _(Halil, 28.08.2026.)_

Gerekçe kayda geçti:
· Üç bilinmeyen çıktı; en ağırı `saglamAdet`/`hasarliAdet` — "hepsi
  sağlam" demek **stok +236** demek ve hurdaya gitmiş mal envanteri şişirir.
  **Bugün tam bu sınıftan bir hatayı düzelttik** (uydurma kargo tarihleri).
· Ciro zaten düzelmiyor: `Return` yazmak `Sale.items`i değiştirmiyor.
  **B'nin kazancı küçük, bedeli büyük.**
· Ekstre yolu türü **ÖLÇÜLEBİLİR** kılıyor — `KARGO` ↔ `KARGO_IADE` ayrı
  kodlar. Uydurma gerekmez.

**DURUM:** 236 iade · ₺683.924 yazılabilir hâlde bekliyor. Üç bilinmeyen:
`returnType` · `saglamAdet`/`hasarliAdet` · `iadeKargosu`.

⛔ **AÇILIŞ ŞARTI: HB/TY hakediş ekstrelerinin yüklenmesi.**
Bugünkü kapsam **%2,5** (360 iadenin 9'u ekstrede). Ekstre gelince tür
**kargo bacağı sayımıyla** belirlenir — tahmin edilmez.

⚠ **KAPANANA KADAR BU BİR BULGUDUR, GÖREV DEĞİL:** 243 satışın iadesi
defterde YOK. Somut örnek `4120311526` (Razer) — defter **₺6.499 kâr**
sayıyor, gerçek **₺94,20 zarar**. Bugün kapatılamaz; kaydı burada durur.

---

## 🆕 K74 — HALİL'İN ON VAKASI · 28.08.2026 · [ÖLÇÜLDÜ, YAZIM ONAY BEKLİYOR]

Ölçüm: `npm run canli:on-vaka` · `canli:on-vaka-b` · `canli:barbie-adj`
(üçü de salt okuma).

### ⛔ ÖNCE BİR DÜZELTME — BARBIE HAKKINDAKİ CÜMLEM YANLIŞTI

K72'de _"9 alınmış, 11 satılmış, son iki adedin alımı girilmemiş"_ yazmıştım.
**Yanlış.** Sebep: hareket dökümünü `tail -45` ile okumuştum ve **ilk satır
kesilmişti** (`2026-03-25 PURCHASE_IN 1`). Kesik çıktının üstüne hüküm kurdum.

    DOĞRUSU: alınan 10 · satılan 10 · Halil'in beyanı 10  →  TUTUYOR

⭐ **GERÇEK SEBEP BAŞKAYDI VE BUGÜN DOĞDU:**

    2026-08-28 14:02:57 UTC  ADJUSTMENT −1 · ₺1.200 · NOT: "test amaçlı"

Ekrandan elle yapılmış bir **test düzeltmesi** son açık partiyi tüketmiş;
`11540657420` o yüzden maliyetsiz kaldı. Alım eksiği YOK.
_(Anayasa dersi: boru sonuna güvenilmez — bu sefer `tail` kesti.)_

### ÖLÇÜM TABLOSU

| # | sipariş | Halil ne diyor | defter ne diyor |
|---|---|---|---|
| ① | `11540657420` | 10 alındı, 9'u sorunsuz | ✓ 10/10 · engel: bugünkü **"test amaçlı"** ADJUSTMENT |
| ② | `4120311526` | teslim edilmedi · stoğa girdi · ₺94,20 kargo · sonra satıldı | iade kaydı **YOK** · ₺6.499 ciroda · kargo **YOK** |
| ③ | `10828937011` | 2 adet · birim ₺1.634 | 2 kalem, **ikisi de** NO_COST |
| ④ | `4673224319` | kullanılmış iade · tazmin **kazanıldı** ₺1.216,87 + hurda | NO_COST · iade YOK · **hakediş satırı YOK** |
| ⑤⑥⑦⑧ | 4 sipariş | promosyon, maliyet **0** | dördü de NO_COST · `axcali3070` · 5 satış kalemi, **0 alım kalemi** |
| ⑨ | `10559161422` | mükerrer, iptal edilecek | ⭐ **mükerrerlik DOSYADA**: satış dosyasında **birebir aynı İKİ satır** |
| ⑩ | `4138485546` | 2 adet · birim ₺2.549, _"diğerinde problem yok"_ | ⚠ **İKİSİ DE** NO_COST |

### ✅ K74 MALİYETLERİ YAZILDI — 28.08.2026 [KOŞTU]

`npm run canli:k74-maliyet -- --yaz` + `-- --tazele`

    yazılan hareket 18 (9 kalem × PURCHASE_IN + SALE_OUT)
    net stok farkı 0 ✓  ·  partiye ait hareket 18/18 ✓
    ⭐ İKİNCİ KOŞUM: yazılacak kalem 0  ✓ (dokuzu da "hareketi var")

**YEDİSİ DE `NO_COST` → `CALCULATED`:**

    10828937011  NET-1   478,19 · NET-2   392,66
    4138485546   NET-1   960,83 · NET-2   790,83
    4673224319   NET-1   588,99 · NET-2   488,77
    10635054169  NET-1   148,52 · NET-2   123,33
    4762343000   NET-1   223,43 · NET-2   185,67
    4405769515   NET-1   239,67 · NET-2   199,17
    10571819650  NET-1   166,91 · NET-2   138,69
    ⭐ TOPLAM NET-2: ₺2.319,12   (önce: yedisi de NET taşımıyordu)

⚠ **VE BİR HATA YAPTIM, KOD DÜZELTİLDİ.** İlk koşumda hareketler yazıldı ama
kâr tazelemesi **düştü**: betik canlıya kendi istemcisiyle bağlanmıştı, kâr
motoru ise uygulamanın `prisma` tekilini çağırıyor → `DATABASE_URL` yok.
⭐ **Düşmesi ŞANSTI:** `canli-kar-tazele.ts` başlığı tam bu tuzağı anlatıyor —
_"betik kendi istemcisiyle bağlanıp motoru öylece çağırsaydı, CANLIDAN OKUYUP
YERELE YAZARDI."_ Adres artık her şeyden önce kuruluyor.
Hareketler ikinci kez YAZILMADI; `--tazele` kapısı yalnız kâr damgasını
tamamladı ve izi o yazdı (satır bazında önceki değerlerle).

### ⚠ ÜÇ SORU — YAZIMDAN ÖNCE CEVAP GEREKİYOR

**② stok aritmetiği 1 adet tutmuyor.** `axcali1633`: 3 alım · 3 satış
(`4662729595` 01.07 · `4120311526` 04.07 · `11473158422` 03.08). İade
yazılırsa mal stoğa döner ve **net stok 1** olur — Halil _"stokta yok"_
diyor. Ya bir alım fazladan girilmiş ya da bir satış eksik.

**④ iki bilinmeyen:** ürünün alış maliyeti ne (dosyadaki tazmin satırı
`₺575,40` diyor) ve ₺1.216,87 tazmin **nereye** yazılacak — `Compensation`
karşı tarafı `supplierId`/`carrierId` istiyor, oysa ödeyen **kanal**.

**⑨ tamamı mı, bir kalemi mi?** Sipariş 2 kalem taşıyor çünkü **dosyada iki
satır var**. Siparişin tamamını iptal etmek **gerçek olan 1 adedi de** siler.

⛔ **HİÇBİRİ YAZILMADI.**

---

## 🆕 K75 — KARGO SÜTUNU (R) · 28.08.2026 · [ÖLÇÜLDÜ, YAZIM ONAY BEKLİYOR]

> Halil: _"Satış dosyasının R kısmında kargo ücretleri mevcut."_

Ölçüm: `npm run canli:kargo-kolonu` (salt okuma).

    R sütununun başlığı  : "KARGO"  ✓ (adı da değeri de kargo diyor)
    satış satırı 9743 · R DOLU 9616 (%98,7) · boş 127
    değer: min 20 · p25 85 · ortanca 100 · p75 120 · p95 200 · max 659
    TOPLAM ₺1.075.311,77  ·  ⛔ negatif değer 1 (ayrı incelenecek)

**⭐ TABAN ÖLÇÜLDÜ — DOSYA KDV **DAHİL**.** Bu, yazımın en kritik kararıydı:
`Sale.cargoAmount` şemada **KDV HARİÇ** saklanıyor (`lib/kargo-kdv.ts`:
_"ölçüldü 32/32 satışta KARGO kesintisi = cargoAmount × 1,20"_). Yanlış
tabanda yazmak doğrudan **%20 hata** demekti.

    kargosu ZATEN olan 147 satışta oran (dosya ÷ defter):
      p25 1,2000 · ortanca 1,2028 · p75 1,2102
      ⭐ oranı tam 1,20 olan 74 · oranı 1,00 olan yalnız 2

Ortanca 1,20'ye oturuyor, 1,00'e değil → **dosya kullanıcının bildiği
KDV DAHİL tutarı taşıyor.** Yazarken **1,20'ye bölünür.**

⚠ **VE BİR TAHMİNİM ÖLÇÜMLE ÇÜRÜDÜ:** çakışan örneklerin ilk altısı Amazon
numarasıydı ve _"147'nin hemen hepsi Amazon"_ diye yazacaktım. Ölçüm:
Amazon biçimli sipariş **11/5752**. Örneklem sıralamadan geliyordu, kümeden
değil.

**YAZILABİLİR KÜME:**

    ⭐ 5721 satış · ₺681.081,46 (KDV DAHİL)  →  cargoAmount = R ÷ 1,20
    dokunulmayacak: kargosu ZATEN olan 147 (hangisi doğru — ölçülmedi)
    sistemde olmayan sipariş 3388 (K56 kovası)

⛔ **FİRMA VE DESİ DOSYADA YOK** (ölçüldü). `cargoCarrierId` ve `cargoDesi`
**BOŞ bırakılır** — boş kalması bir BEYANDIR: hangi firmayla gittiğini
sistem bilmiyor. Vekil bir firma seçmek olmayan bilgiyi uydurmak olurdu.

⚠ Yazım sonrası kâr tazelenir; **NET-2 ~₺681 bin AŞAĞI iner.** Bu bir
kayıp değil, bugüne kadar **eksik düşülmüş bir giderin** deftere girmesidir.

### ⭐ KURU KOŞUM [KOŞTU 28.08.2026] — `npm run canli:kargo-yaz`

⚠ **VE ÖNCEKİ RAKAMIM DÜZELDİ.** Ölçüm satır bazlıydı; kargo **SİPARİŞ**
başınadır. Sipariş bazına indirilince ve satırları çelişen siparişler
ayrılınca sayı düştü:

    önce (satır bazlı)  : 5721 · ₺681.081
    ⭐ ŞİMDİ (sipariş)   : 5583 · ₺669.760,96 KDV DAHİL

    KOVALAR
      dosyada kargolu sipariş  9140
      ⭐ YAZILACAK              5583
      ⛔ satırları ÇELİŞEN        28   ← aynı siparişe farklı kargo
      ⛔ kargosu ZATEN olan      143   ← DOKUNULMUYOR
      ⛔ sistemde yok / iptalli 3386

    ⭐ YAZILACAK DEĞER (KDV HARİÇ) : ₺558.134,04   ← `cargoAmount`
       aradaki KDV                 : ₺111.626,92

**NET ETKİSİ — MOTORA SORULDU, TAHMİN EDİLMEDİ.** `karHesapla` aynı girdiyle
iki kez çağrıldı (kargolu/kargosuz):

    ₺100 KDV-hariç kargo → ΔNET-1 −120,00 · ΔNET-2 −100,00
    ölçülen çarpan: NET-1 ×1,20 · NET-2 ×1,00

⚠ **VE BU BİR CÜMLEMİ DÜZELTTİ:** _"NET-2 ~₺681 bin aşağı iner"_ demiştim.
**Yanlış** — o rakam NET-1'in etkisi. Kargo KDV'si İNDİRİLİYOR
(`odenecekKdv`den düşüyor), o yüzden NET-2 yalnız **KDV HARİÇ** kadar iner:

    5583 satışın 5574'ü CALCULATED · kargosu ₺557.458,22 (hariç)
    ⭐ NET-1 düşüşü : ₺668.949,86
    ⭐ NET-2 düşüşü : ₺557.458,22

**NEGATİF — YAZILACAK KÜMEDE YOK, AMA DOSYADA 168 SATIR VAR.**

    TÜRE GÖRE: iade = 167 (₺20.771,00) · satış = 1 (₺125,00)

Tek negatif SATIŞ satırı `11265267349` — ve o sipariş **iki satır** taşıyor
(`+125/+2.550` ve `−125/−2.550`), yani çelişen 28'in içinde, yazılmıyor.
⭐ **VE 167 İADE SATIRI K73'ÜN ÜÇÜNCÜ BİLİNMEYENİNE DOKUNUYOR:** `iadeKargosu`
dosyada olabilir. ⛔ Ama ölçülmedi — gidiş kargosu mu, iade kargosu mu,
ikisi mi belli değil. İade işine geçince ilk ölçülecek şey bu.

**143 ŞERHLİ KAYIT — sapma para olarak KÜÇÜK.**

    oran (dosya ÷ defter): p25 1,2000 · ortanca 1,2028 · p75 1,2102
    tam 1,20 olan 74 · tam 1,00 olan 2 · ikisi de değil 67
    |dosya − defter×1,20| toplamı: ₺1.209,87

⛔ Dokunulmuyor (FIFO kararının aynısı: ölçülmüş gerçek beyanla
değiştirilmez), ama sapma burada şerhli duruyor.

---

## 🆕 K76 — TEST NOTLU STOK DÜZELTMELERİ · 28.08.2026 · [ÖLÇÜLDÜ]

Ölçüm: `npm run canli:test-duzeltmeleri` (salt okuma).
⚠ Ölçüt **dosya listesi değil DESEN**: bir kayda bağlı OLMAYAN (elle
girilmiş) her `ADJUSTMENT` taranıyor — yarın yazılan da yakalanır.

    elle girilmiş düzeltme 19 · notu test/deneme geçen 5 · NOTSUZ 2

| yazıldı | SKU | adet | birim | not |
|---|---|---|---|---|
| 28.08 14:02 | `axcali1869` | **−1** | ₺1.200,00 | _"test amaçlı"_ ← Barbie |
| 26.08 11:09 | `axcali1752` | **+1** | ₺1.438,99 | _"Test amaçlı **düşüldü**"_ ⚠ not ile yön ters |
| 25.08 21:14 | `axcali1685` | **−1** | ₺5.749,00 | _"Test amaçlı stok **girildi**"_ ⚠ not ile yön ters |
| 25.08 21:14 | `axcali1685` | **−1** | ₺5.749,00 | ⚠ **AYNI DAKİKA, İKİNCİ KEZ** |
| 12.08 23:39 | `axcali2595` | −1 | ₺279,00 | _"test - kutu ezildi"_ ← gerçek olabilir |

⚠ **İKİ AYRI KUSUR GÖRÜNÜYOR VE İKİSİ DE HÜKÜM DEĞİL:** üç kayıtta **notun
söylediği yön ile hareketin yönü ters**, ve `axcali1685` aynı dakikada iki
kez yazılmış (**−2 adet · ₺11.498**). Hangisinin kasıt hangisinin kaza
olduğu **ölçülemez** — kararı Halil verir.
NOTSUZ ikisi: `OYU-HT-260812-01` (+1 maliyetsiz · −2 ₺325,00).

### BARBIE GERİ ALMA — KURU KOŞUM

    ŞU AN                    : ledger 0 · FIFO açık parti 0
    ters kayıt (+1) sonrası  : ledger 1 · FIFO açık parti 1

⚠ **TEK BAŞINA YETMEZ:** `11540657420`in `SALE_OUT`u yok; serbest kalan
parti o satışa **kendiliğinden bağlanmaz**. İkinci adım
`canli:ice-aktarma-stok-bagi` (K55).
⚠ **VE ÇARE SİLMEK DEĞİL:** `lib/stok-duzeltme.ts` kuralı —
_"hareket silinmez; yanlış düzeltme ters işaretli ikinci düzeltmeyle
kapatılır."_ Ters kayıt **ekrandan** yapılır, ikinci bir düzeltme mantığı
yazılmaz.

---

## 🆕 K77 — İADE DOSYASI · O SÜTUNU · 28.08.2026 · [ÖLÇÜLDÜ]

> Halil: _"İade dosyası O sütununda iadelerin kargo ücretleri mevcut."_

Ölçüm: `npm run canli:iade-kargo-kolonu` (salt okuma).

    O sütununun başlığı: "KARGO" ✓ (dosyadaki tek KARGO sütunu da bu)
    iade satırı 366 · dolu 193 (%52,7) · negatif 167 · pozitif 26
    |değer|: min 50 · ortanca 110 · p95 200 · max 350 · TOPLAM ₺23.021,00

### ⛔ AMA SÜTUN ARADIĞIMIZ ŞEYİ TAŞIMIYOR — VE BU BİR UMUDUMU ÇÜRÜTTÜ

Bir önceki turda _"bu sütun `iadeKargosu`nun ta kendisi olabilir"_ demiştim.
Ölçüm çürüttü: **değerler satış dosyasının kargosuyla AYNI.**

    satış kargosuyla AYNI : 186
    FARKLI                :   4   (ve dördü de kuruş farkı: 114,14↔114,00 gibi)
    satış satırı yok      :   3

Yani O sütunu **yeni bir kargo bacağı değil, satışın kargosunun TERS
İŞARETLİ AYNASI.** `4120311526` bunu tek satırda gösteriyor:

    iade dosyası  O = −101,00
    satış dosyası KARGO = +101,00      ← aynı sayı, ters işaret
    ⭐ HB paneli   = −94,20            ← kanalın kendi belgesi

⚠ **VE ÜÇ KAYNAK ÜÇ FARKLI ŞEY SÖYLÜYOR.** Dosya kargoyu **sıfırlıyor**
(+101 −101 = 0), HB ise **fiilen ₺94,20 kesmiş.** Halil'in kuralı
(_"teslim edilmeden dönende TEK kargo yansır"_) HB'yi doğruluyor: kargo
sıfır değil, **bir bacak.** Dosyanın aynalaması o bacağı siliyor.

⛔ **SONUÇ: K73'ÜN ÜÇÜNCÜ BİLİNMEYENİ KAPANMADI.** `iadeKargosu` hâlâ
bilinmiyor; elimizdeki tek gerçek ölçüm kanal panelinden geliyor ve o da
tek vaka. Diğer iki bilinmeyen (`returnType` · `saglamAdet`/`hasarliAdet`)
zaten açıktı. **K73 kilitli kalır.**

⚠ Yine de sütun işe yaramaz değil: hangi iadede kargonun ters kaydedildiğini
söylüyor ve **163 iade satırı hem kargolu hem satışı sistemde** (₺19.738,00).
Ekstre geldiğinde kıyas tarafı olur.

---

## 🔓 K74 — HALİL'İN ÜÇ CEVABI GELDİ · 28.08.2026

**① `4120311526` (Razer) — ÇÖZÜLDÜ.** Halil: _"1 alım 2 kere kaydedilmiş."_
Yani gerçek **2 alım**, defterdeki 3'ün biri mükerrer. Aritmetik kapanıyor:

    gerçek alım 2 · kalıcı satış 2 (4662729595 · 11473158422) · stok 0 ✓
    aradaki 4120311526: satıldı → teslim edilemedi → stoğa döndü → yeniden satıldı

**② `4673224319` — HİKÂYE TAMAM, İKİ AYRINTI ÖLÇÜLDÜ.** Halil: HB tazmin
talebini onayladı, **ürün HB deposuna gönderildi, kargosunu BİZ ödedik
(₺100)**, tazmin ödemesi alındı.

⚠ **VE DOSYADA İKİ FARKLI ALIŞ FİYATI VAR — ikisi de M sütununda:**

    satış satırı  (05.11.2025) : liste 1.484,00 · alış **575,04** · KARGO 85,00
    tazmin satırı (03.02.2026) : liste 1.216,87 · alış **575,40**

`575,04` ↔ `575,40` — rakamlar yer değiştirmiş görünüyor, biri yazım hatası.
⛔ Hangisinin doğru olduğu **ölçülemez**; satışa bağlı olan `575,04`.
⚠ Ve ₺100 iade kargosu dosyanın hiçbir sütununda YOK (satış satırı ₺85 diyor,
o gidiş kargosu). **Halil'in beyanı tek kaynak.**

**⛔ TAZMİNİN KARŞI TARAFI ŞEMADA YOK — ÖLÇÜLDÜ.** `Compensation` modelinde
`supplierId` ve `carrierId` **ikisi de opsiyonel**, ama **`channelAccountId`
diye bir alan YOK.** Yani HB'nin ödediği tazmin bugün ancak _"karşı taraf
boş + not"_ olarak yazılabilir; **sorgulanamaz.**
_Bu zaten bilinen bir açık:_ `docs/iade-sureci.md` §11.4 aynı şeyi söylüyor
(_"Hurda Geliri" hakediş kalemi de tanınmıyor_).

**③ `10559161422` — TEYİT ALINDI.** Halil: _"sadece 1 tanesi yanlış, diğeri
doğru."_ ⭐ Siparişin **tamamı iptal EDİLMEYECEK**; **tek kalem** kaldırılır.

---

## ✅ KARGO YAZILDI · 28.08.2026 · [KOŞTU]

`npm run canli:kargo-yaz -- --yaz` — satış dosyasının **R (KARGO)** sütunu.

    yazıldı 5595 satış
    DOĞRULAMA: kayıt 5595/5595 ✓ · toplam ₺559.499,05 / ₺559.499,05 ✓
    kâr tazelendi 5595 · başarısız 0

    NET-1  2.444.999,67 → 1.776.097,22   (−668.902,45)
    NET-2  2.015.414,97 → 1.457.996,25   (−557.418,72)

⚠ **SAYI 5583 DEĞİL 5595 ÇIKTI, SEBEBİ YAZILI:** ilk deneme `$transaction`ın
5 sn tavanına çarpıp düştü (hiçbir satır yazılmadı — ölçüldü, kargolu satış
161→161). Yeniden koşulabilirlik için _"kargosu hedef değere kuruşuna eşit
olan kayıt bizimdir"_ ölçütü konuldu; bu ölçüt **zaten hedef değerde olan 12
kaydı** da kümeye aldı. Yazılan değer aynı, veri değişmedi — ama `--geri` o
12'yi de boşaltır. Küçük ve **bilinen** risk.

### ⛔ VE BİR KUSUR BULUNDU — İZ SESSİZCE KESİLMİŞTİ

`AuditLog.detail`e 5595 satış kimliği kondu. Alan MySQL `TEXT` (65.535 bayt)
ve JSON tam tavanda kırpıldı: **65.511 karakter, `JSON.parse` DÜŞÜYOR.**

> **Geri alma yolu YAZILDIĞI ANDA BOZUKTU ve hiçbir şey söylemedi.**

⭐ **ÇARE LİSTE SAKLAMAK DEĞİL, KÜMEYİ DETERMİNİSTİK KURMAK:** ölçüt
_"kargosu, dosyadaki değerin 1,20'ye bölümüne kuruşuna eşit"_. Aynı ölçüt
yazımın yeniden-koşulabilirlik kapısında da var; iki yerde iki ölçüt olmaz.
Kesilmiş iz **silinmedi**; üstüne onu açıklayan ikinci iz yazıldı
(`KARGO_DOSYADAN_YAZILDI_IZ_ONARIMI`) — ledger disiplini izlere de işler.

⚠ **DERS:** bir listeyi ize gömmek, ize sığdığını VARSAYMAKTIR. Sığmadığında
veritabanı hata vermez, **keser** — ve kesik iz sessizce yeşil görünür.

### ⚠ ₺1.404,50 AÇIKLANAMADI — VE UYDURULMADI

Beklenen NET-2 düşüşü (NET taşımayan 9 satışın kargosu düşülünce)
₺558.823,22; ölçülen ₺557.418,72. Fark **₺1.404,50** (değişimin %0,25'i).

**ARANDI, BULUNAMADI:**
· "bayat NET damgası" hipotezi **çürütüldü** — kargosuz 27 satışta motorun
  hesabı kayıtlı NET'e **birebir** eşit (fark 0).
· Yazılan kümede de durum aynı: **120/120 satışta kayıtlı NET = motor.**

⭐ **YANİ BUGÜNKÜ RAKAMLAR DOĞRU.** Açıklanamayan şey, yazımdan ÖNCEKİ
toplamın bileşimi — ve **satış bazında saklanmadığı için artık atfedilemez.**
⛔ Sebep uydurulmadı; açıklanamadığı yazıldı.

⚠ **SONRAKİ TOPLU YAZIMLARDA ÖNCEKİ DEĞER SATIŞ BAZINDA SAKLANIR** — yoksa
artık bir fark çıktığında kaynağı aranamaz. (Bu betikte toplam saklandı,
satır saklanmadı; eksik olan buydu.)

---

## 🆕 K78 — SİPARİŞ SATIRI KALDIRILAMIYOR · 28.08.2026 · [YAPISAL EKSİK]

`10559161422`de dosya aynı satırı **iki kez** taşıyor ve içe aktarma
sadakatle iki kalem yazmış. Halil: _"sadece 1 tanesi yanlış, diğeri doğru."_

⛔ **SİSTEMDE YOLU YOK — ÖLÇÜLDÜ:**
· `lib/satis-duzenleme.ts` → `yeniAdet <= 0` **reddediliyor** (`ADET_GECERSIZ`)
· kalem SİLME diye bir işlem hiç yok; kapsam **FİYAT + ADET + KARGO**

**İki kötü seçenek:**
· tamamını iptal → **gerçek olan 1 adet de** silinir
· betikle `SaleItem` sil → `StockMovement.saleItemId` **SetNull**, hareket
  sahipsiz kalır: _"stok düşük kalır, düşüren kaybolur"_ (anayasa)

⚠ **VE BU TEKRARLAYACAK:** dosyada mükerrer satır bir kez değil; içe aktarma
her seferinde sadakatle yazacak. Tek vaka değil, **desen.**
⛔ Bugün yazılmadı; **çözüm tasarımı AYRI TUR** (kullanıcı kararı 28.08.2026).

---

## 🚨 K79 — GEÇMİŞ SATIŞ GELECEĞİN PARTİSİNİ YİYOR · 29.08.2026

> **HALİL BULDU, SİSTEM DEĞİL.** `10383153730` 27.07.2025'te satılmış ama
> tükettiği parti **13.08.2026** tarihli. Ekranda stok 0 göründü, bekleyen
> sipariş **kaydedilemedi.**

⚠ **VE ÖNCE KENDİMİ DÜZELTTİM:** _"bu bugünkü işimden çıkmış"_ demiştim.
Ölçüm çürüttü: 810 bozuk bağın **809'u NOTSUZ**, bugün yazdığım her hareket
parti notu taşıyor. Bu **eski** bir durum — panoda _"809 geriye dönük FIFO
bağı"_ olarak zaten duruyordu, ama **kilitlenen gerçek stok** olarak hiç
ölçülmemişti. Sayı biliniyordu, **bedeli bilinmiyordu.**

### ✅ A — `axcalistan01` ONARILDI [KOŞTU]

    ÖNCE : 2025-07-27 SALE_OUT −1 → parti 2026-08-13 (382 gün sonra)
           ledger 0 · FIFO açık 0   ← sipariş girilemiyordu
    SONRA: 2025-07-27 PURCHASE_IN +1 ₺1.792,00 (dosya M sütunu)
           ledger 1 · FIFO açık 1   ✓ İKİ DEFTER TUTUYOR
           10383153730 → CALCULATED · NET-1 473,58 · NET-2 390,65

⭐ **VE ÖDÜNÇ ALINAN RAKAM YANLIŞTI:** satış ₺1.069,49 maliyet gösteriyordu
(2026 partisinin maliyeti); dosyadaki gerçek maliyet **₺1.792,00**. Yani
o satışın kârı **₺722,51 fazla** yazılıydı.

**ÇARE NİYE "BAĞI KOPARMAK" DEĞİL:** satış gerçek, mal çıktı. Bağ koparılsa
ledger 0 kalır FIFO 1 olur → **iki defter ayrışır** ("hayalet adet"). Eksik
olan ALIM'dı; satış tarihine parti açıldı.

### 📏 B — TÜMÜ ÖLÇÜLDÜ [KURU KOŞUM]

    bozuk bağ 809 · etkilenen varyant 181 · serbest kalacak adet 809
    dosyada maliyeti OLAN 808  ·  ⛔ NO_COST'a düşecek 1

    MALİYET  ödünç alınan 1.634.178,54 → gerçek 1.439.598,55
             ⭐ FARK −194.579,99   (maliyet DÜŞER → NET ARTAR)
    STOK     ⭐ ENVANTER DEĞERİ ARTIŞI 1.630.579,54

⚠ **Fark NEGATİF, yani ödünç alınan maliyetler toplamda GERÇEKTEN YÜKSEKTİ.**
`axcalistan01`da tersiydi (ödünç düşük çıkmıştı) — **tek vakadan yön
çıkarılmaz**, kümenin yönü ayrı ölçüldü.

### ✅ B YAZILDI + SINIR KAPATILDI — 29.08.2026 [KOŞTU]

    onarılan bağ 809 · net stok farkı +809  ✓ (beklenen +809)
    tazelenen satış 798/798 · hepsi CALCULATED
    NET-1  87.895,28 → 282.475,27   ⭐ FARK +194.579,99
    NET-2  70.336,79 → 232.486,78   ⭐ FARK +162.149,99

⭐ **NET-1 FARKI, KURU KOŞUMUN ÖNGÖRDÜĞÜ MALİYET FARKININ BİREBİR AYNASI:**
kuru koşum _"maliyet −194.579,99"_ demişti, ölçülen NET-1 artışı
**+194.579,99**. Kuruşuna tutuyor — motorun ve planın aynı şeyi söylediğinin
kanıtı.

### ⭐ KÖK KAPATILDI — `sinir` ALTI YAZMA YOLUNA GEÇTİ

    src/lib/stok.ts        acikPartiler'e `sinir?` EKLENDİ + `gunSonu()` yardımcısı
    src/lib/satis.ts       gunSonu(girdi.soldAt)        ← 809'un kaynağıydı
    src/lib/iade.ts (×2)   gunSonu(girdi.occurredAt)
    stok/duzeltme-actions  gunSonu(tarih)
    okut/sayim-yazim       gunSonu(tarih)
    iadeler/bildirim       gunSonu(new Date())
    satislar/[id]/iade     gunSonu(girdi.occurredAt)    ← önizleme, yazımla AYNI
    satis-duzenleme-veri   gunSonu(once.soldAt)         ← adet artışı da FIFO'dan düşer
    iptal-geri-alma-veri   `SINIR YOK:` beyanıyla açık

⚠ **VE İKİ ÖLÇÜM YOLU DÜZELTTİ:**
① `acikPartiler` `sinir`i **hiç kabul etmiyordu** — sorun "verilmedi" değil,
  **verilemiyordu.**
② `satis-duzenleme-veri` ilk taramada gözden kaçtı; `fifoDagit`e **dolaylı**
  besliyor (`adetPlani` → `satis-adet.ts`). Bekçi yakaladı, ben değil.

**BEKÇİ — `fifo-sinir:dogrula`, DESEN YASAĞI:**
> Sonucu `fifoDagit`e giden çağrı `sinir` geçirmek zorunda; sınır
> `gunSonu(...)` olmalı; `stok.ts` süzgeci `lt` kalmalı. İstisna yalnız
> `SINIR YOK: <gerekçe>` beyanıyla.

**DÖRT MUTASYON, DÖRDÜ DE KIRMIZI YANDI (görüldü):**
sınırı kaldıran · sınırı gün BAŞINA çeviren · `lt`→`lte` · beyansız istisna.
Beyanlı istisna yeşil kaldı (yanlış yanma yönü de sınandı).

⚠ **VE BEKÇİ YAZILIRKEN KENDİ KUSURUNU ÜRETTİ:** `\b` yine `0x08`e döndü
(betikle kod yazma tuzağı). `kontrol-karakteri:dogrula` yakaladı — ölçüt
kendisini ölçen bekçiye yakalandı.

---

## 🆕 K81 — HURDA ÇAPRAZI · 29.08.2026 · [ÖLÇÜLDÜ]

`hurda.xlsx` · md5 **teyit edildi** (`fa335f…41`) · sayfa "Hurda takip" · 62 satır.

**⭐ K73'ÜN İKİNCİ BİLİNMEZLİĞİNİ KISMEN KAPATIYOR:** hurdaya giden mal
**hasarlı** dönmüş demektir → `saglamAdet=0 · hasarliAdet=adet`.

    ⭐ İADE LİSTESİYLE KESİŞEN : 56 sipariş · 56 adet · ₺197.408,00
    ⛔ hurdada VAR, iadede YOK : 5

⚠ **İKİ ÖN RAKAM TUTMADI — ve fark BENDE DEĞİL, ölçümde:**

| beyan | ölçülen |
|---|---|
| kesişim **58** | **56** |
| tutar **41/62 · ₺138.385** | **15/62 · ₺45.854** |

Satır 62 ✓ · HB 47 / TY 15 ✓ · sipariş no 61/62 ✓ · SKU 16/62 ✓ · Ödendi
51/10 ✓ — **altı rakamdan dördü birebir tuttu**, ikisi tutmadı. Tutar
sütununda **47 satır boş**; beyandaki 41 başka bir sütundan sayılmış olabilir.

**⛔ KALAN 304 İADE SAĞLAM SAYILAMAZ — ÇIKARIM YAPILMADI.** _"Hurda
listesinde yok"_ ile _"sağlam döndü"_ aynı şey değildir; liste eksik de
olabilir. **Halil'e sorulacak.**

**③ 5 SİPARİŞ:** dördü sistemde **hiç yok** (K56 kovası), biri
(`10920524864`) var ve `CALCULATED`.

**④ DURUM SÜTUNLARI KOVA DEĞİL, NOT.** İki sütun (I·J), **38 farklı değer**,
üç ayrı "ödendi" yazımı (`ödendi` 26 · `ÖDENDİ` 3 · `Ödendi` 3), araya
serpilmiş tarihler ve serbest notlar. Desenle kovalama denendi:
**sınıflanamayan 31 / 85** — yani üçte biri hiçbir kovaya girmiyor.
⭐ **Hüküm: bu sütun ayrıştırılmaz, NOT olarak taşınır.**

**⑤ TUTARSIZ 47 SATIR:** 36'sında `Ödendi=1` ama tutar YOK → **kayıt eksik**;
10'unda `Ödendi=0` → henüz tazmin alınmamış olabilir.

**⑥ ÜRÜN EŞLEŞTİRME:** sipariş numarasıyla sistemde bulunan **31/61**.
⭐ **Çok kalemli sipariş 0** — yani bulunanlarda ürün sipariş numarasından
tek anlamlı çıkıyor, SKU'nun 16/62 olması engel DEĞİL.

### ⭐ KÖK BULUNDU — VE PARAMETRE HİÇ YOK

    export async function acikPartiler(db, variantId)   ← `sinir` YOK

Tek varyantlık yardımcı `sinir`i **hiç kabul etmiyor**; `acikPartilerToplu`
kabul ediyor ama bu kapıdan geçen çağrılar onu geçiremez. Yani sorun
"parametre verilmedi" değil, **verilemiyor.**

`fifoDagit`e besleyen 7 dosya var. Sınıflandırma:

| çağrı | tarih elde var mı | hüküm |
|---|---|---|
| `lib/satis.ts:188` **SATIŞ KAYDI** | `soldAt` ✓ | ⛔ **SINIR ZORUNLU — 809'un kaynağı bu** |
| `lib/iade.ts:599` · `:752` | `girdi.occurredAt` ✓ | ⛔ sınır gerekli |
| `app/stok/duzeltme-actions.ts:156` | form `tarih` alanı ✓ | ⛔ sınır gerekli (geri tarihli düzeltme aynı tuzağa düşer) |
| `app/okut/sayim-yazim-actions.ts:123` | `veri.sayimGunu` ✓ | ⛔ sınır gerekli — **sayım da geri tarihli olabiliyor** |
| `app/iadeler/bildirim-actions.ts:845` | değişim anı | ⛔ sınır gerekli |
| `app/satislar/[id]/iade/actions.ts:137` | önizleme | ⛔ yazma yoluyla **AYNI** olmalı |
| `lib/iptal-geri-alma-veri.ts:138` | — | ✅ **BİLİNÇLİ AÇIK:** "ayna partisi bugün tükenmiş mi" diye soruyor; tarih sınırı başka bir soruyu cevaplardı |

Görüntüleme yolları (`page.tsx` · `stok/page.tsx` · `kalem-bilgisi` ·
`urun-karti-verisi`) bugünün stoğunu gösteriyor → **açık kalır.**
`envanter-veri.ts` zaten parametreli.

⚠ **VE BİR TUZAK: `lt` mi `lte` mi.** `acikPartilerToplu` süzgeci
`occurredAt: { lt: sinir }` — **kesin ÖNCE**. Satışa `soldAt` verilirse
**aynı gün alınan mal dışarıda kalır** ve bugün çalışan satışlar
kaydedilemez hâle gelir. Sınır günün SONU olmalı; bu ölçülmeden değiştirilmez.

### BEKÇİ ÖNERİSİ — liste değil, DESEN

> Sonucu `fifoDagit`e giden bir `acikPartiler`/`acikPartilerToplu` çağrısı
> **`sinir` geçirmek ZORUNDA.** Geçirmeyen çağrı, yanında
> `/** SINIR YOK: <gerekçe> */` beyanı taşımıyorsa **KIRMIZI.**

Böyle kurulunca yarın açılan ekran da yakalanır; kimsenin listeye eklemeyi
hatırlaması gerekmez. İki yönde mutasyonla sınanır: sınırı KALDIRAN çağrı
kırmızı yanmalı, beyanlı istisna yeşil kalmalı.

⛔ **B YAZILMADI. Kod değişikliği (sinir) YAZILMADI** — ikisi de onay
bekliyor ve `lt`/`lte` sorusu önce ölçülmeli.

---

## 🚨 K82 — ÇOKLU ADETTE BİRİM FİYAT BÖLÜNÜYORDU · 29.08.2026 · [KAPANDI]

> **HALİL BULDU.** _"2 adet × ₺2.074 satılmış ama sistem birim fiyatı
> ₺1.037 gösteriyor ve satış zararda."_ `11373352181`

### ⭐ ÇELİŞKİ BAĞIMSIZ KANITLA ÇÖZÜLDÜ

İki kaynak çelişiyordu: TY API `price=2074` (adet 2) ↔ Halil'in dosyası
(iki satır, her biri adet 1 × ₺2.074). Hakem **kanalın kendi ödeme kaydı**
oldu:

    hakediş: SIPARIS_TUTARI 1897,71  ·  SIPARIS_TUTARI 1897,71   (İKİ SATIR)
             1897,71 = 2074 − 176,29   (2074'ün %8,5'i = komisyon)

İki satır = iki adet · her satır birim fiyattan komisyon düşülmüş hâli.
⭐ **Birim fiyat 2074, sipariş toplamı 4148. Bölme YANLIŞTI.**

### KÖK — ÖLÇÜM GERÇEKTİ, ÇIKARIM YANLIŞTI

`canli-ty-ice-aktar.ts → birimFiyatCoz` adete bölüyordu. Gerekçesi
26.08.2026 ölçümüydü: _"adet>1 olan 11 kalemin 11'inde de
`price === amount`"_. **Ölçüm gerçek, çıkarım yanlış:** o eşitlik **iki
okumayla da uyumlu** ve rakip hipotezi elemiyor. Ayırt edici kanıt hiç
aranmamıştı. → Anayasaya madde olarak geçti.

⚠ **VE HATA KENDİNİ EN AZ GÖRÜNÜR KILAN KÜMEDE YAŞIYORDU:** tek adetli 553
kalemde bölme fark yaratmıyor (`x/1 = x`), yalnız çok adetlilerde bozuyor.

⚠ **VE TEST HATAYI SABİTLEMİŞTİ.** `ice-aktarma:dogrula`da
_"adet 2 → satır toplamı ikiye bölünür"_ yazılıydı — bir KURALI değil kodun
DAVRANIŞINI sabitleyen ölçüt. Düzeltmeye kalkanın karşısına kırmızı yanarak
çıkardı. Tersine çevrildi, **üç mutasyonla** sınandı (bölmeyi geri getiren ·
adetle çarpan · sıfır kapısını kaldıran) — üçü de kırmızı.

### ✅ ONARIM [KOŞTU] — 7 kalem, hepsi zarardan kâra

    kalem 7 · hepsi adet 2 · hepsi `enumerasyon` kaynaklı
    ciro 16.766,00 → 33.532,00   ⭐ EKSİK CİRO 16.766,00
    ⭐ hâlâ NET-1 negatif olan: 0 / 7

| sipariş | NET-1 önce → sonra | NET-2 önce → sonra |
|---|---|---|
| `11492207627` | −1.401,70 → **482,77** | −1.170,80 → 396,88 |
| `11438745987` | −899,08 → **1.643,26** | −753,29 → 1.361,28 |
| `11431419530` | −377,94 → **4.943,28** | −323,10 → 4.103,10 |
| `11419703466` | −217,94 → **706,55** | −183,20 → 585,63 |
| `11399165160` | −286,55 → **1.059,09** | −241,18 → 877,79 |
| `11373352181` | −1.255,96 → **624,46** | −1.049,52 → 514,63 |
| `11370752568` | −344,94 → **604,30** | −288,97 → 500,56 |

⭐ **HALİL'İN HESABI BİREBİR TUTTU:** `11373352181` için brüt kâr
4.148 − 3.036,20 = **1.111,80** (Halil ₺1.112 demişti); kesintiler sonrası
NET-1 **624,46**.

⚠ **VERDİĞİ BEŞE EK OLARAK İKİ SİPARİŞ DAHA BULUNDU** (`11373352181`
örnekti, `11399165160` hiç bildirilmemişti) — küme listeden değil
**ölçütten** kuruldu: `enumerasyon` kaynaklı + adet>1 + iptalsiz.

⛔ **ELLE GİRİLEN 3 ÇOK ADETLİ KALEME DOKUNULMADI** — onların birim fiyatını
kullanıcı kendi girdi, bölme oraya hiç uğramadı.

**Maliyet tarafı DOĞRUYDU** (FIFO birim maliyeti × adet); yalnız fiyat
bölünüyordu. Komisyon ORAN olarak saklı olduğu için kendiliğinden düzeldi.

---

## 🆕 K83 — FİZİKSEL SAYIM ESAS · 29.08.2026 · [KURU KOŞUM, YAZIM ONAY BEKLİYOR]

> Halil **7 saat** fiziksel sayım yaptı ve kuralı koydu: **fiziki varlık
> esastır.** Sonraki Excel aktarımları stok rakamlarını bozdu — sıra
> yanlıştı, sayım SON SÖZ olmalı.

Ölçüm: `npm run canli:sayim-esas` (salt okuma).
Dosya md5 **birebir teyit edildi** (`41d7b2…52`) · sayfa `SELLİORA` 1103 satır.
⛔ `TRENDYOL` sayfası (218 barkod) bu işe **dahil değil** — kanal listeleme stoğu.

    "Olması gereken" DOLU : 207   ✓ (beyanla aynı)
    ⭐ SKU EŞLEŞMESİ       : 207/207 BULUNDU · bulunamayan 0

### ⭐ İKİ FARK AYRI ÖLÇÜLDÜ — VE KAYMA ÇOK KÜÇÜK ÇIKTI

    ① SAYIM ANINDAKİ (dosyanın kendi iki sütunu)
       tutuyor 106 · FAZLA 52 (−207) · AZ 49 (+104) · net −103
       ⭐ mimarın ölçümüyle BİREBİR

    ② BUGÜNKÜ (sistemin şu anki adedi ↔ sayılan)
       tutuyor 104 · FAZLA 53 (−208) · AZ 50 (+105) · net −103

    ⚠ SAYIMDAN BUGÜNE KAYAN SATIR: 2 / 207

⭐ **Yani sayımdan bu yana yalnız 2 satır oynamış.** Düzeltme ②'ye göre
yapılır; ① kayıt olarak durur.

### DÜZELTME PLANI — `COUNT_CORRECTION`

    EKSİ yön (mal gitmiş) : 53 varyant · −208 adet
    ARTI yön (mal fazla)  : 50 varyant · +105 adet

    ARTI'da maliyet: FIFO'da parti VAR 43 (₺135.195,16) · ⛔ parti YOK → NO_COST 7
    EKSİ'de FIFO   : düşülecek maliyet ₺499.809,07 · ⛔ parti YETMEYEN 0

⭐ **ENVANTER DEĞERİ NET ETKİSİ: −₺364.613,91** (499.809,07 çıkar,
135.195,16 girer). Bu bir kayıp TESPİTİ değil, kaydı: mal zaten yoktu,
defter fazla gösteriyordu.

⛔ **UYDURMA MALİYET YAZILMAZ:** 7 varyantta FIFO'da hiç parti yok; onların
partisi **NO_COST** doğar ve satıldığında kâr dürüstçe "hesaplanamadı" der.

### KÂR ETKİSİ — YOK (bilerek)

`COUNT_CORRECTION` **kâr tablosuna girmez** (kullanıcı kararı 12.08.2026):
düzeltme bir satış değildir, NET-1/NET-2'ye karışmaz; dönem raporunda AYRI
kalem olarak GERÇEK NET'ten düşer.
⚠ Bu varyantlarda maliyet bağı olmayan satış kalemi **0** — yani ARTI
partileri bekleyen bir bağlama işi yok.

### GERİ ALMA — DETERMİNİSTİK

Kimlik listesi DEĞİL: `note` içinde `sayim-fiziksel-20260829` geçen
hareketler. `npm run canli:sayim-esas -- --geri`

### ✅ YAZILDI [KOŞTU 29.08.2026] — 181 hareket

    yazılan hareket 181 (COUNT_CORRECTION) · eksi 132 · artı 49
    net stok 1617 → 1515   fark −102   (beklenen −102)   ✓
    envanter değeri: ARTI +₺133.823,64 · EKSİ −₺499.009,17
    ⭐ NET −₺365.185,53

⭐ **DOĞRULAMA — SAYILAN 207 VARYANTIN 207'Sİ ARTIK TUTUYOR:**
kuru koşum yeniden koşuldu → `tutuyor 207 · fazla 0 · az 0 · net 0`.
**İkinci koşum: 0 yeni hareket** (betik kendi damgasını görüp duruyor).

⚠ **RAKAM 103 DEĞİL 102 ÇIKTI VE SEBEBİ YAZILI:** kuru koşum ile yazım
arasında bir varyantın farkı kapandı (defter oynadı). Ölçüm anı ile yazım
anı aynı an değildir; sapma değil, zamandır.

**7 NO_COST PARTİ** (FIFO'da hiç parti yok, maliyet UYDURULMADI):
`axcali1604` +1 · `axcali1696` +1 · `axcali1820` +2 · `axcali2587` +2 ·
`axcali2601` +14 · `axcali2850` +2 · `KOZ-PH-BRI92-01` +1

**İZ:** `AuditLog → FIZIKSEL_SAYIM_ESAS_ALINDI` · 1748 karakter, JSON
sağlam. ⭐ **Sayım anındaki fark (①) ize YAZILDI** — `tutuyor 106 · fazla 52
· az 49 · net −103` orada duruyor, kaybolmuyor.

**GERİ ALMA ÖLÇÜTÜ DOĞRULANDI:** `note` içinde sayım kodu geçen hareket
**181/181** buluyor.
⚠ **AMA TAM TUR CANLIDA KOŞULMADI** — 181 hareketi silip yeniden yazmak,
arada stoğu yanlış bırakırdı. **Ölçüt sınandı, kapı sınanmadı;** istenirse
koşulur. _(Dürüstlük notu: dün kargo yazımında geri alma yolu bozuktu ve
ancak sorulunca çıktı.)_

⚠ **İKİ DEFTER:** 102 varyantın 100'ünde `ledger = FIFO`. Ayrışık 2
(`axcali1660` · `axcali1610`) — **dünkü `EXCHANGE_OUT` partisiz çıkış
vakasının aynısı, yeni ayrışma DOĞMADI.**

---

## 🆕 K84 — SAYIM KORUMASI · 29.08.2026 · [ÖLÇÜLDÜ, KOD YAZILMADI]

Ölçüm: `npm run canli:sayim-korumasi` (salt okuma).

**① STOK YAZAN 10 YOL — DOKUZU GERİYE DÖNÜK YAZABİLİYOR.** Yalnız
`iadeler/bildirim-actions` `new Date()` kullanıyor; kalan dokuzun tarihi
dışarıdan geliyor (dosya · form · satış tarihi).

**② ⭐ MEŞRU GERİYE DÖNÜK VAKA VAR — TAM YASAK YANLIŞ OLURDU:**

    sayımdan SONRA yazılan hareket
      iş tarihi sayımdan SONRA (normal) : 16
      ⛔ iş tarihi sayımdan ÖNCE         : 15   ← HEPSİ `PURCHASE_IN`

Onbeşi de **geç girilen alım** (`OYU-LG-598P-01`, iş tarihi ocak/mart,
yazılış 26.08). Yasaklasaydık gerçekten olmuş bir mal kabulünü kaydetmek
imkânsızlaşırdı. _(29.08 `sinir` dersinin aynısı: makul görünen kısıt
çalışan akışı kilitler.)_

**③ YÖN AYRIMI — ASIL TEHLİKE AŞAĞI YÖNDE:**
· stoğu **ARTIRAN** geç kayıt (alım) sayılmış rafı düşürmez; sayımın
  "fazla" dediğini haklı çıkarabilir — çelişki değil, bilgi.
· stoğu **DÜŞÜREN** geç kayıt (satış · içe aktarma · düzeltme) sayılmış
  malı yok eder. **29.08 arızasının kaynağı bu.**

**④ ÖNERİ — YASAK DEĞİL DURAKSAMA (⛔ kod yazılmadı):**
(a) sayım damgasından öncesine yazılacaksa işlem **DURUR ve sebebi
yazar**; kullanıcı ısrar ederse istisna **iz bırakarak** geçer.
(b) geçen her istisnada varyant **"sayım geçersizleşti"** diye işaretlenir
ve yeniden sayılması istenir.

**⑤ BEKÇİ ÖNERİSİ — desen yasağı, liste değil:**
> `stockMovement.create` çağıran ve `occurredAt`i sabit OLMAYAN her yol,
> yazmadan önce `sayimKorumasi(variantId, occurredAt)` kapısından geçmek
> ZORUNDA. Geçmeyen çağrı, yanında `SAYIM KORUMASI YOK: <gerekçe>` beyanı
> taşımıyorsa KIRMIZI. İki yönde mutasyonla sınanır.

### ✅ GERİ ALMA KAPISI KOŞULDU [29.08.2026] — ÇALIŞIYOR

_"Ölçüt sınandı, kapı sınanmadı"_ demiştim; kapı da koşuldu.
⚠ **Önce risk ölçüldü:** artı partilerden tüketim **0**, son 1 saatte başka
hareket **0** → en kötü ihtimal bir saat önceki hâle dönmekti, o da dosyadan
yeniden yazılabilirdi.

    yazım        1617 → 1515 · 181 hareket
    GERİ ALMA    1515 → 1617 · 0 hareket        ✓ tam eski değere döndü
    yeniden yaz  1617 → 1515 · 181 hareket      ✓ rakamlar BİREBİR aynı
                 (ARTI +133.823,64 · EKSİ −499.009,17 · net −365.185,53)

⭐ Yeniden yazımın **aynı rakamları** üretmesi ayrıca bir belirlenimlilik
kanıtı: küme listeden değil ölçütten kuruluyor.

---

## 🔒 K84 — SAYIM KORUMASI · 29.08.2026 · [KURAL VE BEKÇİ HAZIR · KAPI BAĞLI DEĞİL]

**⭐ (c) SORUSUNUN CEVABI — ARTIRAN HAFİF DEĞİL, ve gerekçe FİZİKSEL:**

| yön | ne olur |
|---|---|
| **DÜŞÜREN** (satış · aktarma · eksi düzeltme) | sayılmış malı **yok eder** — rafta vardı, defterden siliniyor |
| **ARTIRAN** (geç girilen alım) | mal sayım sırasında raftaysa **sayan kişi onu ZATEN saydı**; geriye dönük alım aynı malı **ikinci kez** ekler, stok **şişer** |

⭐ **İkisi de sayımı geçersiz kılar → ikisi de AYNI sertlikte duraksatır.**
Değişen tek şey **kullanıcıya söylenen cümle**, çünkü yapılacak kontrol farklı.

⚠ **VE KENDİ ÖLÇÜMÜMDE KUSUR BULDUM:** ilk turda sayımın **iş tarihi** ile
**yazılış anını** tek değişkende tutmuşum; meşru hareketleri tehlikeli
gösteriyordu. İki çıpa ayrıldı, ölçüm tekrarlandı:

    iş tarihi sayımdan SONRA (normal) : 16 → 11
    ⛔ iş tarihi sayımdan ÖNCE         : 15   (değişmedi, hepsi `PURCHASE_IN`)

⚠ **VE ÖRNEKLEM DAR OLDUĞU YAZILI:** bugünden önce sistemde yalnız birkaç
sayım vardı; _"yalnız alım geriye dönüyor"_ gözlemi **zayıf tabanlı.** Kural
bu gözleme değil, yukarıdaki **fiziksel gerekçeye** dayanıyor.

**TESLİM EDİLEN:**
· `src/lib/sayim-korumasi.ts` — saf gövde. Sayım damgası yoksa/hareket
  sonraysa/adet 0 ise SERBEST; öncesine yazılıyorsa **DURAKSA** + yön + sebep.
· ⭐ **AYNI GÜN SERBEST — bilerek:** sayım günü yapılan satış sayımdan önce
  de sonra da olabilir; kilitlersek sayım gününün TAMAMI kapanırdı.
  _(FIFO `sinir` kararının TERS yöndeki kardeşi.)_
· `sayim-korumasi:dogrula` — ① saf gövde **çağrılır**, değeri sınanır
  ② geriye dönük yazabilen her yol kapıdan geçmeli, geçmiyorsa beyan taşımalı.
  **Desen yasağı, liste değil.**
· **DÖRT MUTASYON, DÖRDÜ DE KIRMIZI:** artıranı serbest yapan · aynı günü
  kilitleyen · korumayı kaldıran · beyansız yol ekleyen.

### ⛔ KAPI HİÇBİR YOLA BAĞLANMADI — VE BU KODA YAZILI

Dokuz yolun dokuzunda `SAYIM KORUMASI YOK:` **borç kaydı** duruyor. Gerekçe
uydurulmadı; beyan aynen şunu diyor: _"kapı henüz bağlanmadı, eksik olan
KULLANICI TARAFI — duraksama bir soru sorar ve ısrar yolu gerektirir, o ekran
yok. Ekransız bağlamak meşru bir işi SESSİZCE kilitlerdi."_

⚠ **VE BİR KAPSAM BULGUSU:** arızayı yapan aktarım **`src/` içinde değil,
`scripts/` altında.** Bekçi bugün yalnız `src`i tarıyor — betikler kapsam
dışı. Bu, bekçinin bilinen sınırı olarak burada yazılı.

### İSTİSNA EKRANDA NEREYE — ÖNERİ

Halil: _"AuditLog yeterli değil, kullanıcı yeniden sayması gerektiğini
bilmeli."_ Katılıyorum. Önerim:
· **Uyarı merkezine YENİ ANAHTAR:** `sayimGecersizlesti` — _"N varyantın
  sayımı geçersizleşti, yeniden sayılmalı."_ Bu kalem **kapatılabilir**
  (yeniden say → kapanır), yani K49 ölçütünü geçiyor: uyarı kutusuna girer.
· Rakama tıklayınca **süzülmüş liste** açılır (İlke #16).
⛔ Yazılmadı — kapı bağlanmadan uyarının besleyeceği veri doğmaz.

---

## 🆕 K85 — `scripts/` KAPSAMI · 29.08.2026 · [ÖLÇÜLDÜ]

> Halil'in tespiti: _"koruma bugün ARIZANIN GELDİĞİ YERİ kapsamıyor."_
> **Doğru** — ve ölçüm bunu daha da kötü gösterdi.

Ölçüm: `npm run scripts-kapsami:olc` (salt okuma).

    `scripts/` altında .ts dosyası      : 213
    ⭐ `stockMovement.create` ÇAĞIRAN   : 14
       occurredAt SABİT (zaten temiz)  :  4
       kapıdan geçen                   :  0
       beyanı olan                     :  0
    ⛔ KAPSAM UZATILIRSA YENİ İHLAL     : 10

### ⛔ VE SINIFLANDIRMA DENEMEM ÇÖKTÜ — ASIL BULGU BU

_"Tek seferlik onarım"_ ile _"sürekli koşan aktarım"_ı desenle ayırmayı
denedim (`PARTI =` · `KODLAR =` · `--geri` işaretleri). **Ölçüt çöktü:**

    canli-alis-ice-aktar.ts   → "tek seferlik" sayıldı
    canli-satis-ice-aktar.ts  → "tek seferlik" sayıldı
    ⛔ OYSA ARIZAYI YAPAN AKTARIMLAR TAM BUNLAR.

İşaretler **iki sınıfta da** geçiyor; desen NİYETİ ayırt edemiyor.
_(Anayasa: "iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz" —
bugün ikinci kez aynı tuzak, bu sefer kendi bekçimde.)_

⚠ **VE YANLIŞ SINIFLANDIRMA SESSİZ OLURDU:** bekçi "sürekli koşan 3 araç"
diye rapor vermişti ve o üçü (`fifo-dogrula` · `rma-prova` ·
`canli-deneme-sifirla`) **risksiz olanlardı.** Gerçek risk taşıyan iki
aktarım muaf sayılıp geçecekti.

### ⭐ ÖNERİ — SINIF TAHMİN EDİLMEZ, BEYAN EDİLİR

    /** BETİK SINIFI: SUREKLI */                    → kapıdan geçmeli
    /** BETİK SINIFI: TEK_SEFERLIK — <gerekçe> */    → muaf

Beyanı **olmayan** betik KIRMIZI. Böylece yarın eklenen bir aktarım
_"tek seferlik sanılıp"_ sessizce geçemez ve muafiyet **insan kararı**
olarak koda yazılır.

**ON İHLAL — sınıfını Halil belirler:**

| betik | npm komutu |
|---|---|
| `canli-alis-ice-aktar` | VAR ⛔ **aktarım** |
| `canli-satis-ice-aktar` | VAR ⛔ **aktarım** |
| `canli-ice-aktarma-stok-bagi` | VAR |
| `canli-dosya-maliyet-kuru` | VAR |
| `canli-ileri-parti-onar` | VAR |
| `canli-k74-maliyet` | VAR |
| `canli-sayim-esas` | VAR |
| `fifo-dogrula` · `rma-prova` | VAR (test/bekçi) |
| `canli-deneme-sifirla` | yok |

⛔ **KOD DEĞİŞMEDİ.** Doğru sıra: **önce beyan kuralı, sonra kapsam.**

---

### ✅ BEYAN KURALI YAZILDI + KAPSAM `scripts/`E UZATILDI [29.08.2026]

    bekçi ölçütü 21 → 31 kontrol
    ⭐ VE TAM OLARAK ARIZAYI YAPAN İKİ AKTARIMI YAKALADI:
       canli-alis-ice-aktar · canli-satis-ice-aktar → "SUREKLI ama kapı yok"

**ON BETİĞİN SINIFI — Halil'in kararıyla, körlemesine değil:**

| sınıf | betik | gerekçe |
|---|---|---|
| **SUREKLI** | `canli-alis-ice-aktar` · `canli-satis-ice-aktar` | her yeni dosyada yeniden koşar; **29.08 arızasını bu sınıf yaptı** |
| TEK_SEFERLIK | `canli-ice-aktarma-stok-bagi` | K55, `--geri=<parti>` ile geri alınır |
| TEK_SEFERLIK | `canli-dosya-maliyet-kuru` | `dosya-maliyet-20260828` partisine kilitli |
| TEK_SEFERLIK | `canli-ileri-parti-onar` | `ileri-parti-onarim-20260829` partisine kilitli |
| TEK_SEFERLIK | `canli-k74-maliyet` | YEDİ sipariş kimliğine kilitli |
| TEK_SEFERLIK | `canli-sayim-esas` | sayım koduna kilitli, ikinci koşum 0 döndürür |
| TEK_SEFERLIK | `fifo-dogrula` · `rma-prova` | bekçi/prova — canlı stoğa dokunmaz |
| TEK_SEFERLIK | `canli-deneme-sifirla` | 23.08, ÜÇ sipariş numarasına kilitli |

**⚠ KOMUTSUZ BETİK — ÖLÇÜLDÜ, ÖLÜ KOD DEĞİL.** `canli-deneme-sifirla`
`package.json`da hiç yok (0 eşleşme) ama **koşulmuş**: üç sipariş
numarasına kilitli, ve iki betik (`canli-11467-geri-yukle` ·
`canli-11473-degisim-var`) ondan söz ediyor — biri onun bir kısmını GERİ
ALMIŞ. Yani "gövdesiz beyin" değil, **kayıt dışı koşulmuş bir araç.**
⭐ Asıl bulgu: `tsx` ile doğrudan koşulan betikler `package.json`
listesinde görünmüyor — **bekçi listesi oradan okunduğu için o betikler
hiçbir listeye girmiyor.** Beyan kuralı bunu kapatıyor: liste değil, dosyanın
kendisi konuşuyor.

**ÜÇ MUTASYON — AYRIM DOĞRU ÇALIŞTI:**
· beyanı SİL → **KIRMIZI** ✓
· `SUREKLI`→`TEK_SEFERLIK` gerekçeli çevir → **YEŞİL** ✓ (insan kararı)
· `TEK_SEFERLIK` gerekçesiz → **KIRMIZI** ✓ (muafiyet bedava değil)

⛔ İki `SUREKLI` aktarımda kapı hâlâ bağlı değil; **borç beyanı en görünür
yere** (dosyanın ilk satırlarına) konuldu ve doğru davranış yazılı:
_"betikte SORU SORULMAZ — ATLA VE RAPORLA."_

---

## 📐 ŞEMA KURU KOŞUMU — `sayimGecersizAt`

    KOLON   ProductVariant.sayimGecersizAt  DateTime?  · nullable
    İNDEKS  @@index([sayimGecersizAt])
    ETKİLENEN SATIR  1104 (hepsi) — hepsi NULL doğar, GERİ DOLDURMA YOK
    GERİ DÖNÜŞ       kolon nullable, varsayılansız → `DROP COLUMN` yeter

⭐ **NİYE VARYANTTA:** uyarı merkezi _"N varyantın sayımı geçersizleşti"_
diye **SORGULAMAK** zorunda. Serbest metin geriye bakmaya yeter, sorguya
yetmez — merdivenin 2. basamağından 4.'ye çıkış gerekçesi bu.

⚠ **İNDEKS BUGÜN GEREKLİ DEĞİL, YARIN GEREKLİ:** 1104 satır küçük bir
tablo. Kolonla birlikte açmak migration'ı ikiye bölmemek için.
⚠ **VERİ KAYBI RİSKİ YOK:** damgaların ikinci kopyası `AuditLog`ta
(iz iki yere yazılıyor).

⛔ **MIGRATION KOŞULMADI, ŞEMA DEĞİŞMEDİ.** Anayasa: şema commit'i
migration canlıda koşana kadar push edilmez. **Onay bekliyor.**

### ✅ `sayimGecersizAt` MIGRATION KOŞTU [29.08.2026]

    SQL (yalnız iki ifade, adının dışına çıkmadı):
      ALTER TABLE `ProductVariant` ADD COLUMN `sayimGecersizAt` DATETIME(3) NULL;
      CREATE INDEX `ProductVariant_sayimGecersizAt_idx` ON `ProductVariant`(`sayimGecersizAt`);

    ⚠ deploy:bekci ÖNCE  : ÇIKIŞ 1  ← migration koşmadan push edilemez (doğru)
    canlı migrate         : 40 migration, yenisi uygulandı ✓
    damga güncellendi     : prisma/canli-migrasyon-damgasi.json (commit edilir)
    sağlık kontrolü       : 45 tablo · 502 kolon canlıda doğrulandı
    yerel migrate deploy  : ✓   ·   prisma generate: ✓
    ⚠ deploy:bekci SONRA : ÇIKIŞ 0  ✓

**MIGRATION SONRASI SAYIM — hepsi tuttu:**

    ProductVariant toplam : 1104   (beklenen 1104)  ✓
    sayimGecersizAt DOLU  :    0   (beklenen 0)     ✓
    NULL                  : 1104   ✓ hepsi
    ⭐ kolon canlıdan OKUNDU: EVET ✓ (axcali3026 → null)

⭐ **Son satır önemli:** kolon yazılarak değil **okunarak** doğrulandı —
şemada olması canlıda okunabildiğini göstermez _(8cb0023 dersi)_.

⚠ **DEV SUNUCUSU YENİDEN BAŞLATILMALI** — `prisma generate` sonrası çalışan
sunucu eski istemciyi önbellekte tutar ve "Unknown field" verir. **Bu adım
Halil'de.**

---

## 📌 PANO — BEKÇİ LİSTESİNİN KÖR NOKTASI KAPANDI

`tsx` ile **doğrudan** koşulan betikler `package.json`da görünmüyor; bekçi
listesi oradan okunduğu için o betikler **hiçbir listeye girmiyordu.**
Vaka: `canli-deneme-sifirla` — koşulmuş, canlı veriyi değiştirmiş, bir kısmı
sonradan geri alınmış, ama hiçbir listede yok.

⭐ **Beyan kuralı bunu kapattı: liste değil, DOSYANIN KENDİSİ konuşuyor.**
Bir betik `stockMovement.create` çağırıyorsa sınıfını beyan etmek zorunda —
`package.json`da olsun olmasın.

## 📐 ISRAR EKRANI — TASARIM (kod yazılmadı)

**NEREDE ÇIKAR:** duraksama, stok yazan **her yolun kendi onay adımında**
çıkar — ayrı bir ekran açılmaz. Üç yer:

| yol | nerede |
|---|---|
| **ekran işlemleri** (mal kabul · stok düzeltme · satış · iade) | kaydet düğmesine basınca, **kaydetmeden önce** araya giren onay bloğu |
| **toplu aktarım** (betikler) | ekran yok → **SORULMAZ, ATLANIR ve raporlanır**: "N satır sayım korumasına takıldı" |
| **API/otomatik** | aynı: atlanır + raporlanır |

⭐ **BETİKTE SORU SORULMAZ — VE BU BİLEREK.** Kimse başında değil; "ısrar"
kavramı orada yok. Atlamak, sessizce yazmaktan iyidir çünkü **atlanan satır
raporda görünür**, sessizce yazılan görünmez.

**NE SORAR** (metin sözlükten, İlke #5 — sebep ekranda yazar):

    ⚠ Bu ürün 29.08.2026'da SAYILDI.
    Yazmak üzere olduğunuz hareketin tarihi 27.07.2025 — sayımdan ÖNCE.

    [DÜŞÜREN ise]
    Sayımda rafta bulunan mal, bu kayıtla defterden düşecek.
    Sayım o malı GÖRDÜ; şimdi yok sayıyorsunuz.

    [ARTIRAN ise]
    Bu mal sayım sırasında raftaysa SAYAN KİŞİ ONU ZATEN SAYDI.
    Bu kayıt aynı malı İKİNCİ KEZ ekleyebilir ve stok şişer.

    ☐ Anlıyorum, yine de kaydet — bu varyantın sayımı GEÇERSİZLEŞECEK
      ve yeniden sayılması istenecek.
    Sebep: [kapalı liste ▾]  (açıklama zorunlu değilse "diğer" hariç)

⚠ **ONAY HER SEFERİNDE SORULUR** — "bir kez onayladım, artık sorma"
YOKTUR (anayasadaki ısrar kuralı).

**İZ NEYE YAZILIR — İKİ YERE:**
① `AuditLog` → `SAYIM_KORUMASI_ASILDI`: varyant · sayım tarihi · hareket
  tarihi · yön · sebep · kullanıcı. _(Geçmişe bakmak için.)_
② ⭐ **VARYANTIN KENDİSİNE**: `sayimGecersizAt` damgası — çünkü uyarı
  merkezi bunu **sorgulamak** zorunda ("N varyantın sayımı geçersizleşti").
  Merdiven: serbest metin geriye bakmaya yeter ama **sorgu gerekiyor**,
  o yüzden sütun. _(Anayasa: "geriye bakmak → serbest metin; SORGU → yapı".)_

⛔ Şema kalemi olduğu için **migration onayı ayrıca istenir.**

---

## 🚨 K88 — İLERİ PARTİ ONARIMININ ÖLÇÜTÜ YANLIŞTI · 29.08.2026 · [DÜZELTİLDİ]

> **HALİL BULDU:** _"bundan sayımda 4 tane saydık, 1 satış girdim, 3 kalması
> lazım — 20 görünüyor."_ (`axcali2997`)

### ⛔ HATA BENDEYDİ VE ÖNCÜLDEYDİ

`canli-ileri-parti-onar` şu varsayımla çalışıyordu:

    "partisi çıkıştan SONRA tarihli  ⇒  o satışın alımı defterde YOK"

**Yanlış.** Alım çoğu zaman defterde VARDIR, yalnız daha GEÇ tarihle
girilmiştir. Her ileri bağ için yeni parti açmak **aynı malı iki kez saydı.**

⚠ **VE DOĞRULAMAM YANLIŞ ŞEYİ DOĞRULUYORDU:** _"net stok +809, beklenen
+809 ✓"_ demiştim. Aritmetik doğruydu, **öncül yanlıştı.**

### ✅ DÖRT ADIM — her adımdan sonra ölçüldü

    başlangıç      net stok 1515 · axcali2997 = 20
    ① sayım geri al        1617 · sayım hareketi 0
    ② ileri-parti geri al   807 · axcali2997 = −1
       ⭐ İZ TAM: 810/810 eski bağ geri yüklendi · NO_COST satış 1 → 1
         (hiçbir satış maliyetini KAYBETMEDİ — yazmadan önce ölçüldü)
    ③ eksik-alim yaz        830 · negatif stoklu varyant 3 → 0
    ④ sayım yeniden koş     962 · ⭐ tutuyor 207/207 · net 0

### ⭐ YENİ ÖLÇÜT VE FARKI

    ⛔ ESKİ (ileri bağ başına) : 810 parti · 810 adet · 182 varyant
    ✅ YENİ (adet açığı)       :   3 parti ·  23 adet ·   3 varyant
    ⭐ FARK                    : 787 adet AZ

**179 varyantın hiç açığı yokmuş** — alımları defterde zaten vardı.
Gerçekten eksik olan üç varyant: `axcali2723` +15 · `OYUNEN88141740` +7 ·
`axcalistan01` +1. Üçünün de maliyeti dosyadan; **NO_COST yok.**

**Yeni ölçüt nasıl çalışıyor:** varyantın hareketleri kronolojik yürütülür;
stok ilk nerede negatife düşerse parti **o çıkışın tarihine** damgalanır.
Tarih uydurulmaz, FIFO sırası bozulmaz, varyant başına **tek parti**.
⚠ Net stoğu ≥ 0 olup geçmişte anlık negatife düşen varyant **kapsam dışı** —
orada mal alınmış, sadece geç kaydedilmiş; parti eklemek çift sayım olurdu.

### ✅ `axcali2997` KAPANDI

    sistem 6 · Halil 3 · fark −3   ← ölçüldü, VARSAYILMADI
    6'nın bileşimi: gerçek alım +22 · mal kabul +4 · ③'ün eklediği +7 · satış −27
    bugünkü satış `11548483041` sistemde VAR ve stok hareketi doğmuş ✓
    ⭐ COUNT_CORRECTION −3 (FIFO'dan, birim ₺796,00) → SONRA 3 ✓
    ikinci koşum: "BEKLENEN −3 DEĞİL (0) — YAZILMADI" ✓

⚠ **NİYE 207'LİK KÜMEYE GİRMEMİŞTİ:** sayım dosyasında satırı VAR ama
`Olması gereken Stok` sütunu **BOŞ**. Boş sütun _"sayılmadı"_ demektir ve
betik onu bilerek atlar — uydurmamak için.

### ⏭ AÇIK İŞ — HALİL'DE

Halil'in **henüz girmediği 3 satış** var (`axcali2997`). Girildiğinde stok
**0** olacak ve bu doğru davranıştır. API otomatik çekmiyorsa elle girilecek.

---

## 🆕 K89 — AD KARMAŞASININ SOMUT KANITI · 29.08.2026 · [ÖLÇÜLDÜ]

Dosya: `ISIM UZELLMEMIS.xlsx` · md5 **8e6df13a…** (teyit edildi) · 44 satır,
tek ürün (`LEGO Disney 43217 Up House`).

    ⭐ AD tekil değer : 5     ← aynı ürün, beş ad
    ⭐ SKU tekil      : 3     ← 41'i aynı: 5702017424842

**Beş ad:** ikisi görünmez karakterle ayrışıyor — `│` (U+2502) ve `|`
(U+007C). Gözle bakan "aynı ad" der, makine "farklı" der.

⭐ **AD EŞLEŞTİRMEYİ REDDETME KARARININ (26.08) SOMUT KANITI.** Karcher
`SC 3 → SC 4` vakasının kardeşi: orada ad **yanlış ürünü** buluyordu,
burada ad **aynı ürünü beş parçaya** bölüyor. Kodla eşleşen 41 satır
sorunsuz.

⚠ **AMA "SKU HEP AYNI" DEĞİL — KALAN ÜÇÜ ÖLÇÜLDÜ:** `trendyol` (2) ve
`B0BBSBDCP7` (1, Amazon ASIN'i). Yani kod sütunu da kirli; ad eşleştirmesi
reddedilirken bu üçü **başka bir kovaya** düşer, sessizce geçmez.

### ⛔ VE "FİRMA BARKODU BOŞ" TESPİTİ SİSTEME UYMUYOR — ÖLÇÜLDÜ

Dosyada `AXCALI BARKOD` sütunu **44/44 boş** ✓. Ama bu, üründe firma
kimliği olmadığı anlamına GELMİYOR:

    SİSTEMDE (1104 varyant)
      Firma SKU BOŞ         : 0     %0,0
      Barkod (EAN) BOŞ      : 1     %0,1
      HEM ikisi birden boş  : 0

⭐ **Boşluk DOSYANIN sütununda, KATALOGDA değil.** K35 (firma etiketi)
kaleminin gerekçesi bu rakamla **zayıflıyor** — okutulacak kimliği olmayan
varyant yok. _(Kalem kapanmıyor ama gerekçesi düzeltiliyor: sorun etiket
eksikliği değil, dosyaya yazılmaması.)_

### ⛔ İSİM DÜZELTME GEREKMİYOR — SİSTEMDE ZATEN İKİ AD VAR, BEŞ DEĞİL

    OYU-LG-598P-01  5702017866932  LEGO ® Disney "Yukarı Bak" Evi 43217 …
    axcali2601      5702017424842  Disney 43217 'Up' House
    ⭐ sistemdeki tekil ad: 2   (dosyada 5)

Beş ad **pazaryerinden gelen satış dosyasının** metni; katalogda karşılığı
yok. Mükerrer çift birleşince **tek ad kalır** — ayrı bir isim temizliği
işine gerek yok.

---

### ⚠ İKİ AÇIK NOT

**· `10415881283` — aynı kampanyanın dördü FARKLI maliyetle duruyor.**
Üçü ₺1,00 yazıldı, dördüncüsünde FIFO damgası ₺849 var ve ① kararı gereği
dokunulmadı. **Kararın doğal sonucu, hata değil.**
⭐ **AMA defterdeki ₺849 muhtemelen promosyon kaydedilirken yanlış
girilmiş. FIFO damgalarının doğruluğu bir gün ölçülürse İLK BAKILACAK
VAKA budur.**

**· `10030751247` — Türk Kahvesi ₺1.700, dosyada VAR, sisteme HİÇ girmemiş.**
K56 içe aktarmasının kaçırdıklarından olabilir.
⭐ **ÖLÇÜM (yazımdan sonra, ayrı iş):** dosyada olup sistemde hiç olmayan
BAŞKA satış var mı? Kaç tane, kaç TL? K56 bunu hangi kovaya koymuştu?

---

## ✅ K66 KAPANDI + ⚠ K68b AÇILDI — 28.08.2026

**KOMİSYON AÇIĞI KAPANDI.** 5200 satış · 5319 kalem yazıldı, **başarısız 0**.
`AuditLog: KOMISYON_ORANI_GERIYE_DOLDURULDU` · geri alma
`npm run canli:komisyon-doldur -- --geri`.
Oranı hâlâ boş: **14 kalem** (Amazon 11 + TY 2 + HB 1) — planlandığı gibi.
K67'nin kör kovası (**yalnız komisyon eksik**) `2829 → 3`.

⚠ **"MARJ DÜŞECEK" DEDİM, TABLO %34,00 GÖSTERDİ — İKİSİ DE YANLIŞ OKUMA.**
Önce/sonra toplamları **karşılaştırılamaz**: 2443 satışın `net2`'si YOKTU,
şimdi VAR. Küme değişti, oran değil. Kendi kuralımı kendi raporuma
uygulamam gerekti. _(Anayasa: "kıyasın iki tarafı aynı kümeden gelmeli".)_

Komisyonun etkisi doğrudan ölçüldü: `SaleFee KOMISYON` toplamı
**₺2.066.869,50**. ⚠ Bu defterdeki **TÜM** komisyondur; kuru koşumun
₺1.811.040'ı yalnız YENİ yazılanların tahminiydi — farklı kümeler.

### ⭐ %34,00 GEÇERSİZ — iki farklı rakamın karışımı

| | satış | ciro | Σ net2 | marj |
|---|---|---|---|---|
| **maliyeti OLAN** | 3248 | 10.406.700,83 | 1.151.847,40 | **%11,07** |
| **maliyeti YOK** | 2443 | 6.370.520,17 | 4.552.585,02 | **%71,46** ⚠ |

**GERÇEK MARJ ~%11,07** ve iki bağımsız ölçüm aynı yeri gösteriyor:
yazımdan ÖNCE `CALCULATED` kümesi **%11,10** diyordu.

### ⚠ K68b — KÖK BULUNDU: `kalemMaliyeti` boş listede `0` dönüyordu

`for (const h of hareketler)` hiç dönmeyince `dortBasamak(0)` dönüyordu.
Yani **"FIFO bağı yok"** ile **"maliyet gerçekten sıfır"** aynı görünüyordu:
kalem `CALCULATED` sayılıyor, `net2` maliyet düşülmeden yazılıyordu.

    bağı olmayan kalem      2573   ciro 6.585.533,44   yazılmış "net2" 4.573.976,43
      bunun CALCULATED'ı      2493   <-- maliyet 0 sayıldı

⭐ **AYRIM TERTEMİZ:** `MALIYET = 0` olup HAREKETİ OLAN kalem sayısı **0**.
Yani gerçekten sıfır maliyetli tek bir parti bile yok — her sıfır
"bilinmiyor" demekti. Belirsizlik yok, hipotez yok.

⚠ Bu, aynı gün komisyon tarafında düzeltilen null↔0 hatasının **kâr
tarafındaki hâli — ama TERS yönde**: orada `null` yazılıyordu ("komisyon
yok" denmesi gerekirken), burada `0` ("bilinmiyor" denmesi gerekirken).

| # | İş | Durum |
|---|---|---|
| ① | `kalemMaliyeti` boş listede `null` dönsün | **[KOŞTU 28.08.2026]** — 4 mutasyon, 4'ü de kırmızı |
| ② | Bağsız satışların kârının TAZELENMESİ | **[KOŞTU 28.08.2026]** — 2525/2525, hata 0 |
| ③ | Maliyet bağının kurulması | **[KOŞTU 28.08.2026]** — 12 bağlandı, **2561 kaldı** |

**③ SONUÇ — küçük çıktı ve sebebi yapısal:**

    BAĞLANACAK 12 · ATLANAN 2561 (528 varyant, hepsinin AÇIK PARTİSİ 0)
    StockMovement 5350 → 5362 (+12) ✓   ·   kâr tazelendi 12/12
    hâlâ bağsız satış 2510              ·   ikinci koşum: 0 ✓
    PANEL MARJI 11,56% — DEĞİŞMEDİ (12 kalem 5893'ün içinde iz bırakmadı)

⛔ **KALAN 2561 SATIŞ TARAFINDA KAPANMAZ** — ama sebebi TEK DEĞİL.

⚠ **BENİM HATAM, KULLANICI DÜZELTTİ (28.08.2026).** Hem betik hem raporum
_"o ürünlerin alımı sisteme hiç girilmemiş"_ diyordu. `axcali1869` bunu
çürüttü: alım **GİRİLMİŞ** (`ALM-HB-260815-09`, 4 adet, teslim alınmış)
ama **10 adet satılmış**. Alım yok değil, **YETMİYOR.**

    ⛔ ALIM HİÇ GİRİLMEMİŞ    328 varyant · 1501 kalem · ₺3.814.348
    ⚠ ALIM VAR AMA YETMİYOR   200 varyant · 1060 kalem · ₺2.758.690

**İKİSİ FARKLI İŞ TARİF EDER** ve tek cümle 200 varyanta yanlış iş
söylüyordu:
· _"alım hiç yok"_ → o ürünün alımını **GİR**
· _"alım yetmiyor"_ → **EKSİK ADEDİ** gir (mevcut alım doğru, tam değil)

Mesaj kaynağında düzeltildi; ayrım artık `PURCHASE_IN` toplamından
**ÖLÇÜLÜYOR**, tahmin edilmiyor. Üç ölçüt eklendi, üçü de mutasyonla
kırmızı yandı — biri özellikle **eski yanlış cümlenin geri gelmesini**
yasaklıyor.
_(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_

### ⚠ GERİYE DÖNÜK BAĞ — kabul edildi, İZLİ

**12/12 hareket geriye dönük**: parti satıştan SONRA damgalı.

    gecikme: en küçük 96 gün · ortanca 142 gün · EN BÜYÜK 384 gün
    en uçtaki: satış 2025-08-09 → parti 2026-08-28

**KULLANICI KARARI 28.08.2026:** _"o malın gerçek alımı hiç kaydedilmedi;
bugün girilen alım o eksik kaydın yerine geçiyor. Maliyet GERÇEK (aynı
ürün, gerçek fatura), yalnız tarihi geç. Alternatif 'hiç maliyet' — daha
doğru değil, daha az bilgi."_

⚠ **VE TARİH SINIRI KONSAYDI KOŞUM 0 KALEM BAĞLARDI** — yani kullanıcının
alım girme işi hiçbir şey kazandırmazdı: girdiği her alım, girmeden önceki
satışlara bağlanamazdı.

**İZ:** her geriye dönük bağ `AuditLog`a gecikme günüyle yazılıyor
(`geriyeDonukBag`) **ve ekranda da basılıyor** — kaydedilip görünmemek
"kaydedilen ≠ görünen" hatası olurdu.

### ⚠ `sinir` PARAMETRESİ — İKİ KULLANIM AYRI, BEKÇİYLE SABİT

| Kullanım | `sinir` | Soru |
|---|---|---|
| **K55 stok bağı** | **VERİLMEZ** | "bu satışın maliyeti ne?" |
| **tarihli envanter** _(K53)_ | **ZORUNLU** | "o TARİHTE elimde ne vardı?" |

Karıştırılırsa iki farklı soruya tek cevap verilmiş olur. Beş ölçüt
eklendi (`ice-aktarma:dogrula`), beşi de mutasyonla kırmızı yandı:
K55'e `sinir` eklemek · tarihli envanterden kaldırmak · `AuditLog` izini silmek ·
ekran satırını silmek · gerekçe yorumunu silmek.
| ④ | `CALCULATED` olmayan satırlarda NET alanları | **[KOŞTU 28.08.2026]** — kod + veri |

**② SONUÇ — panel marjı ÖLÇÜLDÜ (tahmin değil):**

    ÖNCE                              SONRA
    CALCULATED  5691  5.704.432,43    CALCULATED  3245  1.147.279,90
    (boş)         82          0,00    NO_COST     2525  4.714.528,05
                                      (boş)          3          0,00
    PANEL MARJI  34,43%          →    PANEL MARJI  11,56%

⛔ Σ net2 yan yana yazıldı, **oranları BÖLÜNMEDİ** — küme değişti.
İkinci koşum: hedef aynı 2525, panel marjı **değişmedi (11,56%)** → idempotent.
Doğrulama taraması: **`CALCULATED` + maliyetsiz kalem = 0** (çıkış kodu 0).

**⚠ KULLANICININ YAKALADIĞI DÖRT SATIR — kaçış DEĞİLDİ.** `4071382273 ·
4558198425 · 4088751365 · 4106341348` teyit çıktısında hem `CALCULATED`
hem "maliyet bağı yok" görünüyordu. Ölçüldü: o an **107 kalem** o hâldeydi
ve **107/107'si hedef kümedeydi** — yani koşum onlara henüz ulaşmamıştı.
Koşum bitince sayı **0**'a indi. _(İki ihtimalden hangisi olduğu tahmin
edilmedi, ölçüldü.)_

### ⚠ ④ AÇIK — `NO_COST` satırlarda `net2Amount` DOLU

`karYenidenYaz` durumdan bağımsız olarak `net2Amount` yazıyor. Sonuç:
**2525/2525 `NO_COST` satırında `net2Amount` dolu** ve toplamı
**₺4.714.528** — maliyeti düşülmemiş bir rakam.

✅ **BUGÜN KİMSE ONU TOPLAMIYOR** (ölçüldü): `satis-toplami.ts` süzgeçte
`profitStatus: "CALCULATED"` şartını taşıyor, panel `durum`a bakıyor.
⛔ Ama alan bir İDDİADIR: `net2Amount` dolu olan bir satır "kârı budur"
der. Süzgeci unutan İLK tüketici ₺4,7M'yi kâra yazar.
_(Anayasa: "şemadaki alan da bir iddiadır — yazıcısı yoksa vaat boştur"
kuralının tersi: burada yazıcı VAR ama yazdığı şey geçersiz.)_
**KARAR VE SONUÇ (kullanıcı, 28.08.2026):** _"₺4,7M'lik iddiayı disipline
değil MEKANİZMAYA bağlarız."_

    ÖNCE   NO_COST 2525 · net1 5.668.424,24 · net2 4.714.528,05
    SONRA  NO_COST 2525 · net1         0,00 · net2         0,00
    temizlenen: satış 2526 · kalem 2574   ·   kalan ihlal: 0 ✓
    PANEL MARJI: 11,56% — DEĞİŞMEDİ (zaten süzülüyordu) ✓
    ikinci koşum: hedef 0 ✓

⚠ **`net1` DE ŞİŞİKTİ** — ölçüldü, ₺5.668.424. `net1 = satış − maliyet −
komisyon − stopaj` ve maliyet `0` sayılıyordu. İkisi birlikte temizlendi.

⚠ **KURAL DURUMA GENEL YAZILDI**, `NO_COST`a özel değil: `RULE_MISSING` ve
`CURRENCY_MISMATCH` de eksik bir hesabı temsil eder. Bugün o durumda satır
yok ama yarın doğan bir satır aynı yalanı taşırdı.

⚠ **TEMİZLİK 1 SATIR FAZLA:** 2526/2574 güncellendi (2525/2573 değil) —
fazlası bir İPTAL EDİLMİŞ satış. Ölçüt `iptalTarihi` süzmüyor ve bu
bilinçli: iptal satışın da geçersiz bir NET taşımasının sebebi yok.

⚠ **NE SİLİNDİ, NE KALDI:** yalnız `net1Amount` ve `net2Amount`.
`profitStatus`, `profitCurrency`, `SaleFee` kalemleri ve stok defteri
ELLENMEDİ — kesintiler ÖLÇÜLMÜŞ gerçeklerdir, geçersiz olan yalnız
onlardan türetilen NET.

⚠ **`karYenidenYaz` KULLANILMADI:** kod düzeltildi (`netYaz`) ama o yalnız
YENİ yazmaları etkiler. Var olan satırlar için motoru yeniden koşturmak
~40 dk sürer ve hiçbir hesabı değiştirmezdi — yapılacak tek şey geçersiz
bir değeri SİLMEKTİ. Hesaplama değil, temizlik.

**Süzgeç zorunluluğu KALDIRILMADI** — `satis-toplami.ts`teki
`profitStatus: "CALCULATED"` şartı ikinci savunma olarak duruyor.

⚠ **① TEK BAŞINA EKRANI DEĞİŞTİRMEZ:** `profitStatus` ve `net2Amount`
SAKLANIYOR; kod düzeldi ama defterdeki damgalar eski. Tazeleme koşmadan
panel hâlâ ₺4,5M sahte kârı gösterir.

✅ **VE PANEL KENDİLİĞİNDEN DÜZELECEK:** `donemOrtalamaMarji` hesaplanamayan
kalemleri hem paydan hem PAYDADAN çıkarıyor (`hesaplananCiro`). Yani ayrı
bir ekran yaması GEREKMİYOR — tazeleme yeter.

⚠ **BİR BEKÇİ ESKİ DAVRANIŞI SABİTLEMİŞTİ:** `iade:dogrula` içinde
_"hareket yoksa maliyet sıfır"_ ölçütü vardı ve **gerekçesizdi** — kodun o
anki davranışını sabitliyordu, bir kuralı değil. Sarmalayıcının kendi
belgesi zaten _"uydurulmaz"_ diyordu. Ölçüt tersine çevrildi, eski hâli
gerekçesiyle bırakıldı.

### ⚠ BEKÇİ KÖR NOKTASI — İlke #16 ölçütlerinde yaşandı

Yeni yazılan altı ölçüt **kör kaldı** ve sebebi öğreticiydi: blok
`panel-dogrula.ts`te **özetten SONRA** koşuyordu, `process.exitCode` çoktan
yazılmıştı. Ölçüm doğruydu, **karara ulaşmıyordu.**
_(Anayasa: "ölçüm ile karar arasındaki boru da ölçümün parçasıdır" —
`| tail -2` ve `echo $?` vakalarının bekçi içindeki hâli.)_
Blok özetin ÖNÜNE alındı, altı mutasyonun altısı da kırmızı yandı.

---

## ⭐ K66 — commissionRate BOŞ YAZILIYOR · 28.08.2026 · **EN BÜYÜK BULGU**

> İçe aktarma `commissionRate` alanını **hiç yazmıyor**. `null` "bilinmiyor"
> demek olduğu için kâr motoru komisyonu HİÇ DÜŞMÜYOR — ve NET olduğundan
> **YÜKSEK** çıkıyor.

| # | İş | Durum |
|---|---|---|
| ① | Kapsam ölçümü | **[KOŞTU 28.08.2026]** |
| ② | Geriye doldurma kuru koşumu | **[KOŞTU]** — `npm run canli:komisyon-doldur` |
| ③ | Yazma + `karYenidenYaz` | **[KURU KOŞUM HAZIR · ONAY BEKLİYOR]** |
| ④ | İçe aktarmanın oranı YAZMASI | **[KOŞTU 28.08.2026]** — beş yeni bekçi ölçütü, beşi de mutasyonla kırmızı yandı |
| ⑤ | AMAZON 11 kalem | **[BEKLİYOR]** — %1,00 doğrulanacak, HARİÇ tutuldu |

**③ KURU KOŞUM — Amazon HARİÇ:**

    DOLDURULABİLİR   5319 / 5333        TRENDYOL 3381 · HEPSIBURADA 1938
    etkilenecek satış  5200             belirsiz 2 · dosyada yok 1
    ciro          15.087.879,55
    komisyon (KDV hariç)   1.811.040,15
    komisyon (HB KDV'li)   1.979.025,43
    HARİÇ: AMAZON 11 kalem · 45.221,00 TL  (oran %1,00 — yer tutucu şüphesi)

⛔ **SONRAKİ NET-2 TAHMİN EDİLMEDİ.** Komisyon KDV'si indirilecek KDV'ye
giriyor ve NET-2 ödenecek KDV'yi de düşüyor; zinciri yalnız kâr motoru
bilir. Tahmini bir rakam basmak, sistemin kendi hesabı sanılacak bir sayı
üretirdi. Yazımdan SONRA aynı tablo yeniden basılır ve fark ÖLÇÜLÜR.

⚠ **MARJ DÜŞECEK VE BU BEKLENEN.** ₺1.811.040 komisyon ilk kez düşülüyor.
Düşüş **"bozuldu" değil, "İLK KEZ DOĞRU"** demektir.

**④ NE YAPILDI:** içe aktarma artık `KOMİSYON ORANI` kolonunu okuyup
`SaleItem.commissionRate`e yazıyor. Oranı okunamayan kalem **`oranYok`
kovasına düşüyor, sessizce boş yazılmıyor.** Komisyonsuz kanalda (DEPO)
oran `0` yazılır — `null` değil.

Beş ölçüt eklendi ve **beşi de mutasyonla kırmızı yandığı GÖRÜLDÜ**:
kaldıran yön (yazma satırı silindi · kapı silindi · `0` yerine `null` ·
makul aralık kapısı silindi) ve **yanlış kaynak yönü** (oran `KOMİSYON
TUTARI`ndan türetildi → KDV iki kez uygulanırdı).

**KAPSAM — ölçüldü:**

    iptalsiz kalem 5891 · oranı BOŞ 5333 (%90,5)
      TRENDYOL     3383 / 3910   (%86,5)
      HEPSIBURADA  1939 / 1964   (%98,7)
      AMAZON         11 /   11  (%100)
      N11             0 /    6    (%0)

    KAYNAK BAZINDA — ayrım keskin:
      satis-excel      5333 / 5333   (%100 boş)   ⭐
      elle girilmiş       0 /  147
      enumerasyon         0 /  411

**⭐ YÖN TERSİNE ÇIKTI — İLK HİPOTEZİM YANLIŞTI VE SİLİNMİYOR.**
"Oranı olmayan satışın `net2Amount`i null kalır, marj DÜŞÜK çıkar" dedim.
Ölçüm çürüttü: `net2Amount` **RULE_MISSING satışlarda da yazılıyor** —
yalnızca komisyon düşülmeden.

    profitStatus     satış   ciro            Σ net2          marj
    RULE_MISSING      2757    8.708.782,38    1.856.720,88   %21,32   ⭐
    CALCULATED         489    1.688.824,45      187.731,37   %11,12
    (boş)             2525    6.590.842,44             0,00       —

Yani ekrandaki marj **olduğundan YÜKSEK**, düşük değil. Komisyonu düşülmüş
kümenin marjı %11,12; düşülmemiş kümenin marjı %21,32.
⚠ **%11,12 "GERÇEK MARJ" DEĞİLDİR — BAYAT OKUMA RİSKİ.** Yalnız 489
satışlık, temsili olmayabilecek bir kümenin marjı; o küme `elle` ve
`enumerasyon` kaynaklı satışlardan oluşuyor ve `satis-excel` kümesini
temsil etmesi için hiçbir sebep yok. Kanıtladığı tek şey **yönün ters**
olduğu. Bu satır bir rapora alıntılanacaksa yanında bu şerh de gider.

**MARJ ŞERHİ BUNU HİÇ GÖRMÜYOR** — çünkü şerh MALİYET BAĞINI ölçüyor:

    ✓ ikisi de tam (maliyet + oran)            489 kalem
    ⚠ yalnız maliyet bağı eksik (oran var)      69 kalem   ← şerhin gördüğü
    ⭐ yalnız komisyon oranı eksik (maliyet var) 2829 kalem  ← şerh KÖR
    ⛔ ikisi de eksik                          2504 kalem

**② KURU KOŞUM SONUCU — dosyanın kendi kolonundan:**

    DOLDURULABİLİR 5330 / 5333  (%99,9)
      TRENDYOL 3381 · HEPSIBURADA 1938 · AMAZON 11
      belirsiz 2 · dosyada yok 1
    ciro 15.133.100,55  →  düşülecek komisyon (KDV hariç) 1.811.492,36

**KAYNAK SEÇİMİ — ikisi ölçümle ELENDİ:**
- **Tarife defteri:** yüklü 3 pencere var, oranı boş **5333 kalemin 0 tanesi**
  bir pencereye düşüyor. Ve zaten yasaktı — `dilimBul` kendi belgesinde
  _"kayda YAZILMAZ, kayıt kanalın kendi beyanından gelir (mimar kararı
  18.08.2026)"_ diyor. Tarife "ne olurdu"yu yanıtlar, "ne oldu"yu değil.
- **Hakediş:** 1284 kalem var, satışa bağlı olan **13**. Kaynak önceliğinde
  1. basamak ama kapsamı ~%1.
- **Satış dosyasının kolonu:** 2. basamak (kendi defterimiz), kapsam %99,9.

**⚠ KOLONUN NE ANLATTIĞI ÖLÇÜLDÜ — VE İLK OKUMAM YANLIŞTI:**
`(TUTAR/FİYAT) ÷ ORAN` dağılımı 3705 satırda `×1,20` çıkıyordu ve bunları
"tutmayan" diye saymıştım. Sapma değil — **Hepsiburada'nın komisyona
eklediği %20 KDV.** Anayasada yazılıydı; ölçütüm hesaba katmıyordu.

    5734 satır  ×1,00   (KDV'siz)
    3705 satır  ×1,20   (komisyona +%20 KDV)
      40 satır  başka   (kuyruk, ayrı sayılır)

⛔ Bu yüzden yazılacak değer `KOMİSYON ORANI` (**KDV HARİÇ**) olmalı,
`TUTAR/FİYAT` değil: motorda `HEPSIBURADA · KOMISYON_KDV · %20` kuralı
yüklü ve KDV'yi kendisi ekliyor. KDV dahil oran yazılsaydı **iki kez**
uygulanırdı.

**⚠ MARJ ŞERHİ ÜÇÜNCÜ SEBEBİ DE SAYMALI — AYRI KALEM (K67).** Şerh bugün
iki sebep ayrıştırıyor (`alimYok` · `bekleyen` · `donemDisi`), üçü de
MALİYET tarafında. **Komisyon oranı eksikliği hiç sayılmıyor** ve 2829
kalemi kör bırakıyor: o kalemlerin maliyeti VAR, şerh onları "kapsanan"
sayıyor, ama NET'leri komisyonsuz. Şerhin `kapsanmayanPay` ölçütü
maliyeti ölçüyor; NET'in DOĞRU hesaplandığını ölçmüyor.
⛔ ③ koştuktan sonra bu kova küçülecek ama SIFIRLANMAYACAK (Amazon 11 +
belirsiz 2 + dosyada yok 1 kalır) — o yüzden şerh yine de saymalı.

**⚠ AMAZON'UN %1'İ ŞÜPHELİ — YAZILMADAN ÖNCE DOĞRULANMALI.** 11 kalemin
hepsi tam `%1,00`. Amazon TR komisyonu tipik olarak %8–15. Bu bir yer
tutucu olabilir. _(Anayasa: "imkânsız görünen değer önce doğrulanır.")_

**⛔ ③ YAZMA TEK BAŞINA YETMEZ:** oran yazıldıktan sonra her satışın kârı
`karYenidenYaz` ile tazelenmeli, yoksa `net2Amount` komisyonsuz hâliyle
kalır ve ekran hiç değişmez.

**④ AÇIK KAPANMAZSA YENİDEN DOĞAR:** içe aktarma oranı yazmadığı sürece
her yeni koşum yine boş kalem üretir. Bugünkü 23 satış da öyle girdi.

---

## 🆕 K65 — ELDEN SATIŞ (DEPO) KANALI · 28.08.2026

> Kullanıcı düzeltmesi: `DEPO` bir depo hareketi DEĞİL, **elden yapılan
> satışların yazıldığı yer.** İçe aktarmadaki eski gerekçe çürüdü ve
> `canli-satis-ice-aktar.ts` içinde NIYE çevrildiğiyle birlikte duruyor.

| # | İş | Durum |
|---|---|---|
| ① | `DEPO` kanalı + `Elden Satış` hesabı + `KANAL_ESLEMESI` satırı | **[KOŞTU 28.08.2026]** — `AuditLog: KANAL_ACILDI`. Şema değişikliği YOK. |
| ② | 10 elden satışın içe aktarılması | **[BEKLİYOR]** — artık YALNIZ barkod/`Sale.code` sorunu |
| ③ | `Channel.type` vekil kaydı | **[KAYIT]** — kapanamaz, açılış şartı aşağıda |

**② NİYE BEKLİYOR — İKİ SEBEP, İKİSİ DE ÖLÇÜLDÜ:**
1. `Sipariş Numarası` kolonu DEPO satırlarında **BARKOD** taşıyor
   (`8720389039577`, `5702017747682`…). Olduğu gibi yazılsaydı barkod
   `Sale.code`a girerdi — hem yanlış hem `@unique` çakışması. Elden satışın
   sipariş numarası **yoktur**; doğru değer `null`.
2. ~~KDV ve stopaj elden satışta işliyor mu?~~ **CEVAPLANDI 28.08.2026** —
   kullanıcı: _"Elden satışta kargo ve pazaryeri yok, gerisi aynı."_
   Ve ölçüldü: **hiçbir `ChannelFee` gerekmiyor.**
   · KDV ürünün KENDİ kategorisinden geliyor (`kalem.kdvOrani`)
   · Stopaj motorun genel kuralı (`kar.ts:37`, `STOPAJ_ORANI = 1`)
   · Komisyon ve kargo YOK → kalem `commissionRate = 0` ile yazılır
   ⚠ `null` DEĞİL `0`: `null` "bilinmiyor" der ve `RULE_MISSING` üretir;
   `0` "komisyon yok" der ve NET hesaplanır (`kar.ts:198`).

Kapı mekanik: `ADIM2_BEKLEYEN` kümesi. Kuru koşumda **`adim2Bekliyor: 10`**
saydı — satırlar görünüyor ama yazılmıyor. Cevap gelince kümeden `DEPO`
çıkarılır.

**③ `type = OWN_STORE` VEKİLDİR — kapanamaz kayıt, görev DEĞİL.**
Elden satış "kendi siteniz" değildir; örtüşen şey DAVRANIŞ (üçüncü taraf
komisyonu yok), ad değil. Bugün zararsız çünkü **ölçüldü: `Channel.type`
kodun hiçbir yerinde OKUNMUYOR** — seed yazıyor, hiçbir ekran/karar branch
etmiyor. Şema değişikliği bu yüzden **hak edilmedi**.
> ⛔ **AÇILIŞ ŞARTI:** bir rapor/ekran ilk kez `Channel.type`a göre
> dallandığında gerçek enum değeri (`DIRECT`) eklenir — o gün migration hak
> edilmiş olur. Şartsız bekleyen alan, unutulmuş alandır.

**AYRI KOVALAR — 10'luk kümeye KARIŞTIRILMAZ:**
- `4440897248` — 10 hane "4" ile başlıyor: **HB iadesi**, DEPO değil ve
  **sistemde zaten var.** Kuru koşumda `TÜR=iade` olduğu için `turFarkli`
  kovasına düştü; DEPO kovasına hiç girmiyor. Bu turda **işlenmez.**
- `2024-07-07` — "Elden ( ahmet pekel )", komisyon 637 · kargo 120, kimliği
  çözülmüyor. Öteki 11'den farklı; `numarasiz` kovasında ayrı duruyor.

---

## 🆕 K64 — AMAZON SATIŞLARI · 28.08.2026

> Kullanıcı haklı çıktı: Amazon satışları **zaten `satis.xlsx` içinde** —
> 64/64 orada. Sisteme girmemeleri sessiz bir düşme değil, içe aktarmanın
> **bilinçli bekletmesiydi** (`KANAL_ESLEMESI` yalnız TY/HB/N11 taşıyordu).

| # | İş | Durum |
|---|---|---|
| ① | Amazon **SATIŞ** hesabı (`AMZN`) | **[KOŞTU 28.08.2026]** — `AuditLog: KANAL_HESABI_ACILDI` |
| ② | 23 satışın içe aktarılması (AMZN 11 + TY 12) | **[KOŞTU 28.08.2026]** — parti `satis-20260827234322` |
| ③ | 54 ASIN → varyant eşleştirmesi | **[BEKLİYOR]** — ②'den sonra |
| ④ | Amazon `ChannelFee` kuralları | **[BEKLİYOR]** — Amazon'un kendi hakediş raporu |
| ⑤ | `AMZN` hesabını PASİFE al | **[BEKLİYOR]** — ② bittikten sonra, Ayarlar → Kanallar |

**② KOŞTU — önce/sonra sayımı tuttu, ikinci koşum 0:**

    Sale           5780 → 5803   (fark 23, beklenen 23) ✓
    SaleItem       5900 → 5923   (fark 23, beklenen 23) ✓
    SALE_OUT       3323 → 3326   (fark  3, beklenen  3) ✓
    ikinci koşum:  plan 0 satış ✓

⚠ **23 KALEMİN YALNIZ 3'ÜNE STOK HAREKETİ YAZILDI — 20'sinde FIFO PARTİSİ
YOKTU.** Bu bir kusur değil, kural: parti yoksa hareket yazılmaz, negatif
stok üretilmez. Ama sonucu şu: o 20 ürünün stoğu DÜŞMEDİ ve maliyetleri
bağlanmadı — K55'in (alım defteri açığı) aynı kuyruğu.
Geri alma: `npm run canli:satis-aktar -- --geri=satis-20260827234322 --yaz`

**MAĞAZA KAPALI (kullanıcı, 28.08.2026) — hesap yine de açıldı.** Kapanmış bir
mağazanın geçmiş satışları da defterin parçasıdır; bağlanacak hesap olmasa
64 satış (₺255.555) hiçbir yere yazılamaz ve ciro eksik kalır. Kapanmışlık
`isActive` ile ifade edilir, hesabın YOKLUĞUYLA değil.
> ⚠ `isActive = true` açıldı ve sebebi yazılı: `false` olsaydı hesap satış
> listesinin SÜZGEÇ menüsünde de görünmezdi (`satislar/page.tsx:166`) ve
> kullanıcı kendi Amazon satışlarını süzemezdi. ② bitince ⑤ ile kapatılır.

**⚠ SORUM YANLIŞTI VE ÖLÇÜMLE DÜZELTİLDİ.** "Hangi hesap — S.ahmet, SEDA,
EKREM?" diye sordum; varsayımım satış hesabının bu üçünün içinde olduğuydu.
Ölçüm bunu çürüttü — **üçü de ALIŞ hesabı:**

    YAN1  EKREM     alisIcin=EVET  satisIcin=hayir   19 alım ·  0 satış
    ANA   S.ahmet   alisIcin=EVET  satisIcin=hayir   44 alım ·  0 satış
    YAN   SEDA      alisIcin=EVET  satisIcin=hayir   25 alım ·  0 satış

Yani Amazon **satış mağazası sistemde HİÇ TANIMLI DEĞİL.** Doğru soru:
_"Amazon'da sattığınız mağaza hesabının adı ne?"_ (TY/HB'de bu `AXCALI`.)

**ÖLÇÜLEN KAPSAM:** dosyada 65 Amazon satış satırı var; **54'ü SKU
kolonunda ASIN** (`B0…`) taşıyor ve hiçbir varyanta bağlı değil.
Kimliği bugün çözülen **11 satır · ₺45.221**.

**② KURU KOŞUM — içe aktarmanın KENDİ gövdesinden:**

    ② PLAN
       satış   23        KANAL BAŞINA:
       kalem   23          TY     12 satış     15856.00
       tutar   61077.00    AMZN   11 satış     45221.00

⚠ **AYRI SONDA YAZILDI VE `76` SAYDI — YANLIŞTI.** Sonda tarih kapısını,
belirsiz SKU elemesini ve kanal çelişkisi süzgecini taşımıyordu. Döküm
artık `yazilacaklar` dizisinden üretiliyor ve bunu bir bekçi ölçütü
sabitliyor (iki mutasyonla kırmızı yandığı görüldü).
_(Anayasa: "sonda parametresi ekranın parametresi değildir".)_

---

## 📌 AÇIK KALAN ÖLÇÜM ŞERHLERİ — 28.08.2026

| Kalem | Durum |
|---|---|
| **`axcali1752`** (Bialetti Moka Pot) | **[AÇIK]** — sistem dosyadan FAZLA gösteriyor; öteki yönün sorusu, ayrı ölçülecek |
| **A kalemi (HBCV) kapsamı** | **[KAPANMADI]** — "Listelerim" dökümü yalnız **AKTİF** listingleri veriyor; eşleşmeyen 385 kod KAPALI listinglerdir. Halil'in indirdiği dosya yanlış değil, **KAPSAMI dar.** Çare: kapalı listing dökümü ya da HB API |
| **C bölümü ölçüm kusuru** | **[KAYIT]** — "eşleşmeyen satırlar bu varyantların kodlarını taşıyor mu" sorusunun cevabı **tanım gereği sıfırdı**; döngüsel bir soruydu ve bulgu diye sunulmadı |

---

## 🚨 [YANLIŞ CEVAP VEREN EKRAN] — bu etiket varken YENİ CEPHE AÇILMAZ

> Bir ekran **rakam gösteriyor ve rakam yanlışsa**, o ekran susan bir
> ekrandan tehlikelidir: kullanıcı ona bakıp karar verir. Bu etiketi
> taşıyan kalem varken yeni bir cephe açılmaz — önce yanlış cevap susar.

| Ekran | Durum |
|---|---|
| **Nakit takvimi** | ✅ **ETİKET KALKTI 24.08.2026** — ekranın verdiği cevap, koşumun ölçtüğü diple **aynı**: 14 gün `−₺143.485,15` (dip 03.09) · 30 gün `−₺242.975,35` (dip 18.09). "Açık yok" artık yazılamıyor. |

> **Şu an bu etiketi taşıyan kalem YOK.**

---

## 🏁 API ÖNCESİ KAPANIŞ — beşi kapanmadan Faz 4 kodu YAZILMAZ

| # | İş | Durum |
|---|---|---|
| 1 | **K20 sayımı** | ✅ **[KOŞTU 24.08.2026]** — `npm run canli:k20-sayim` |
| 2 | **Nakit takvimi düzeltmesi** | ✅ **[KOŞTU 24.08.2026]** — girişler kanal belgesinden, tahmin kaldırıldı |
| 3 | **Halil'de üç madde** | ✅ **ÜÇÜ DE KAPANDI 25.08.2026.** ✅ API anahtarı geldi. ✅ **Test 4 GEÇTİ** — `/okut`'ta `7260036314074719` okutuldu, sipariş gönderi numarasıyla eşleşti. ✅ 5. sayaç **CEVAPLANDI** (3/3 — rozet `BEYAN`, terfi için ekran görüntüsü, bkz. H25①). ✅ **`11473322212` değişim düğmesi — KONUSUZ KALDI, test yapıldı ve sonucu bu:** düğme çıkmıyor çünkü bildirim **`İPTAL`** durumunda (_"Bildirim iptal edildi, mal hiç gelmedi"_ — K39 ile temizlenen test artığı). ⚠ **BU BİR KUSUR DEĞİL, DOĞRU DAVRANIŞ:** görünme şartı üç bacaklı (ayrılan ürün var · iadeye bağlanmamış · **`status !== IPTAL`**) ve iptal edilmiş bir bildirim _"bu hiç olmadı"_ demektir; üstünden `EXCHANGE_OUT` yazmak stok defterine **sahipsiz bir çıkış** koyardı. ⏭ Aynı satışa **açık** bir bildirim doğarsa düğme kendiliğinden görünür; ayrıca iş yok. |
| 4 | **H10 Salı tarifesi** | ✅ **[KOŞTU 25.08.2026]** — dosya geldi (`870249-25-08-2026-08-00-45.xlsx`), **ekrandan** yüklendi. Yeni pencere `25.08 08:00 → 01.09 07:59` · **712 kalem** · 177 bağlı, 1 bağsız. Boşluk doğmadı: önceki pencere `25.08 07:59`da bitti, yenisi `08:00`da başladı. |
| 5 | **A3-① sağlık ölçümü** | ✅ **[KOŞTU 25.08.2026, İKİNCİ KEZ TAZELENDİ]** — `npm run canli:ty-saglik` · **YETKİSİZ = 0**, anahtar tam çalışıyor.<br>**AÇIK 4:** SİPARİŞ (5 kayıt) · **HAKEDİŞ (86 kayıt)** · İADE (5) · ÜRÜN süzgeci (5) — dördünün de alan haritası çıktı. **AÇIK/BOŞ 1:** diğer finans (uç çalışıyor, pencerede kayıt yok). **ULAŞILAMADI 2:** sağlık ucu + kargo firmaları — ⚠ ikisinin de **yolu tahmin edilmişti**, `556` TY'nin kapalı olduğunu GÖSTERMEZ; kendi bilgisizliğimiz karşı tarafın kusuru gibi raporlanmaz.<br>✅ **GERİYE DÖNÜK SINIR DA ÖLÇÜLDÜ — [KOŞTU 26.08.2026]** `npm run canli:ty-sinir` (salt okuma, yalnız GET). ⛔ işareti kalktı; A3-② tasarımının beklediği sayı artık elde:<br>**SİPARİŞ ucu** — 14 günlük pencere `3 ay` öncesine kadar **veri getiriyor** (112 kayıt); `6 ay` öncesi 0 kayıt (**KABUL/BOŞ — hüküm değil**). Pencere GENİŞLİĞİ: `90 gün` tek istekte **kabul** (112 kayıt), `180 gün` 0.<br>**HAKEDİŞ ucu** — **15 GÜN SERT TAVAN, KANITLI:** 30/60/90 gün `400` ile reddedildi ve mesaj birebir yazıyor: _"Başlangıç ve bitiş tarihi arasındaki fark 15 günden büyük olamaz"_. Bu bir tahmin değil, ucun kendi beyanı.<br>**İADE ucu** — `3 ay` öncesine kadar kabul.<br>⚠ **DOKÜMANDAKİ ÇELİŞKİ ÇÖZÜLDÜ:** bir sayfa *"geriye 1 ay"*, öteki *"3 ay"* diyordu — **ölçüm 3 ayı doğruluyor**, sipariş ucunda 1 aylık sınır YOK. ⚠ **VE "KABUL/BOŞ" SINIR KANITI SAYILMADI:** uç pencereyi kabul edip o tarihlerde kayıt olmadığını söylüyor olabilir; kendi defterimizle kıyaslanmadan *"sınır burası"* denmez ve bu çıktıda **ayrı kova** olarak duruyor. **Sayım: KABUL 19 · KABUL/BOŞ 2 · REDDETTİ 3 · YETKİSİZ 0 · ULAŞILAMADI 0.** |

---

## 🔬 A3-② MUTABAKAT — [KOŞTU 26.08.2026] · SALT OKUMA

> `npm run canli:ty-mutabakat -- --gun=30` · veritabanına hiçbir şey yazılmadı,
> hiçbir yazma ucu çağrılmadı.

**KAPSAM BEYANI (rakamlardan önce):** Trendyol · AXCALI (`externalId 870249`,
kimlikle bulundu, adla değil) · `2026-07-27 → 2026-08-26` · defter tarafı
iptaller DAHİL, ayrı işaretli · API tarafı 3 günlük 20 dilim, 60 günlük
DEĞİŞİKLİK penceresi.

| Kova | Adet | Kanıt değeri |
|---|---|---|
| **(a)** API'de VAR, defterde YOK | **123 sipariş · 124 adet · ₺446.537,36** | ✅ **TEK YÖNLÜ KANIT** |
| **(b)** İkisinde de var, alanlar tutuyor | **83** | temiz |
| **(c)** İkisinde de var, ALAN FARKI | **22** | desen çıktı ↓ |
| **(d)** Defterde VAR, API'de YOK | **2** | ⛔ yorumlanamaz — ve ikisi de bilinen test artığı (`sfsfsf` · `115180181780`, ikisi de İPTAL) |
| eşleştirilemeyen | **1** | sipariş numarası YOK — hiçbir kovaya giremez |

### ⚠ İLK TASARIM ÇÖPE ATILDI — VE RAKAMLAR YAYIMLANMADAN

**① `startDate/endDate` `orderDate`i SÜZMÜYOR.** Paketin SON DEĞİŞİKLİK anını
süzüyor. Ölçüm: `10.08→27.08` penceresi `orderDate 04.08→21.08` döndürdü.
İlk tasarım bunu `orderDate` sanmıştı; o varsayımla üretilen **(a)=104 ·
(d)=74** rakamları **fark değil KAPSAM BOŞLUĞUYDU.**

**② TEK GENİŞ PENCERE SESSİZCE EKSİK DÖNÜYOR — 7 KAT.**
`tek 90 günlük pencere → 114 kayıt (totalPages: 1)` · `13 × 7 günlük dilim →
804 FARKLI sipariş`. Hiçbir hata vermeden, `totalElements: 114` diyerek.

**③ DİLİM ÖLÇÜLEREK SEÇİLDİ:** `14 gün → 234 · 7 gün → 234 · 3 gün → 260 ·
1 gün → 198 (5 hata)`. 3 gün seçildi.

**④ ⛔ YAKINSAMA SAĞLANMADI:** 3 günlük dilim 7 günlükten 26 kayıt fazla
buluyor. Yani **API tarafı bir ALT SINIRDIR.** Bunun iki sonucu var ve ikisi
de rapora yazılı: **(a) tek yönlü kanıttır** (görülen kayıt yok sayılamaz),
**(d) kanıt DEĞİLDİR** (API'de görünmemek orada olmadığını göstermez).

⚠ **VE DÜZELTME KENDİNİ DOĞRULADI:** dilimleme açılınca **(d) 74 → 2**'ye
düştü, **(b) 26 → 83**'e çıktı. Eski 74'ün tamamı enumerasyon artefaktıymış.

### (c) — 22 SAPMA, İKİ DESEN ÇIKTI

`ALAN DAĞILIMI: tarih=20 · tutar=5 · adet=1 · paketSayisi=1`

· **TARİH KAYMALARI: `+1 gün × 20` — hepsi aynı yönde, sistematik.**
  Bu 20 ayrı hata değil BİR mekanizma: `orderDate` saat taşıyor (**H20**).
· **TUTAR SAPMALARI: `15,00 × 3` · `−7.798,00 × 1` · `−21,00 × 1`.**
  `₺15` takipçi kuponu (**K19**). Diğer ikisi **tek tek bakılacak** —
  `−7.798` büyük ve açıklanmadı.

### ⚠ İKİ AÇIKLANMAMIŞ SAPMA — DOSYA AÇILDI, BİRİ ARACIN KUSURU ÇIKTI

**`−7.798,00` → ARACIN KUSURUYDU, VERİ DEĞİL.** `11522079868` siparişinde API
**üç paket** döndürdü: `4090482527` (`order-creation`, UnPacked, 2 adet) ve
onun bölünmüşleri `4090491834` + `4090491835` (`split`, Delivered, 1'er adet).
Araç üçünü de topluyor, **15.596** çıkarıyordu; siparişin gerçeği **7.798** ve
**defter `paketSayisi: 2` ile DOĞRUYU söylüyordu.**
⚠ **ÖLÇÜT `createdBy` DEĞİL, BAĞ:** _"`order-creation` olanı at"_ demek
bölünmemiş siparişlerin hepsini atardı. Doğru ölçüt ilişkidir — bir paketin
kimliği başka bir paketin `originPackageIds`inde geçiyorsa o **EBEVEYNDİR** ve
yerini çocukları almıştır. Düzeltildi: **(b) 83→84 · (c) 22→21**, sapma kayboldu.

**`−21,00` → AÇIKLANAMADI, UYDURULMADI.** `11467475277` · 01.08 · tek kalem
`8720689013949` · 1 adet · API `1.833,00` · defter `1.812,00` · **indirim 0 ·
iade yok · tek paket.** İki taraf da tek satır; fark neden 21, görünmüyor.
⏭ **[AÇIK — FATURA BEKLİYOR]** Halil'in faturasından bakılacak; kaynak sırasında fatura 1. basamak.

### ⚠ ENUMERASYON TAMLIĞI — ÇAPRAZ KURULDU, CEVAP: EKSİK

| Kaynak | Sayı |
|---|---|
| ① API dilimlemesi (3 günlük, 60 gün) | **497** farklı sipariş no |
| ② Hakediş satırları | 431 `orderNo` → **283 sipariş numarası biçiminde** · **148 BAŞKA CİNS ⛔ kıyasa girmez** |
| ③ Defter (tüm TY geçmişi) | **110** |

**ÇAPRAZ: hakedişte VAR · API dilimlemesinde YOK = 70.** Hepsinin hakediş anı
**21–26 Temmuz**, yani paketleri API'nin 60 günlük değişiklik penceresinin
**içinde** dokunulmuş olmalıydı. Sınıra yakın 0, açıkça eski 0.

> **⛔ DİLİMLEME EKSİK. `123` rakamı bir ALT SINIRDIR ve öyle yazılacak.**

⚠ **VE ÇAPRAZIN KENDİSİ ÖNCE KİRLİ ÇIKTI:** ilk koşum **"134 bulunamadı"**
dedi; ölçüldü ki `SettlementItem.orderNo` **iki cins kimlik** taşıyor
(283 × `1…` 11 hane = sipariş no · **148 × `4…` 10 hane = PAKET kimliği**).
Biçime göre ayrılınca gerçek sayı **70**. _"Bulunamadı"_ ile
_"karşılaştırılamadı"_ ayrı sayıldı.

### ✅ A3-③a — YANLIŞ ALARM, ÖLÇÜMLE KAPANDI (26.08.2026)

⛔ **BENİM TEŞHİSİM YANLIŞTI ve kalem açılmamalıydı.** `orderNo`daki 10
haneli "4…" kodlara _"paket kimliği"_ demiştim; **biçim benzerliğine
bakmıştım.** Ölçüm çürüttü:

    Trendyol — AXCALI : 409 kalem · hepsi 11 hane "1…" · diğer 0
    Hepsiburada       : 820 kalem · hepsi 10 hane "4…" · diğer 0

Ayrılan şey başka bir kimlik cinsi değil **BAŞKA BİR KANAL**. HB sipariş
numaraları gerçekten 10 hane "4" ile başlıyor; defterdeki **24 HB satışının
hepsi** o biçimde ve **ikisi doğrudan eşleşti** (`4006304001` · `4702310503`).
Kolonda **şema sorunu YOK**, ayırt edici sütuna da gerek yok.

⚠ **VE BU, KIYASI DAHA SAĞLAM YAPTI:** süzgeç biçimden **kanal hesabı
kimliğine** çevrildi. Biçim süzgeci doğru kümeyi **tesadüfen** veriyordu —
biçim değiştiği gün sessizce yanlış küme verirdi. Çapraz sayısı **70 → 37**.

⚠ **K8 SAYISI DA DÜZELDİ:** 1271 bağsız kalemin **816'sı HEPSİBURADA** kalemi
— TY eşleştirmesinin onları bağlayamaması **kusur değil, kapsam**. TY tarafında
bağsız kalem **400**, `orderNo` boş **55**. _("Kapsam boşluğu fark değildir"
kuralının hakediş tarafı.)_

### 🔬 ENUMERASYON — MEKANİZMA ADLANDIRILDI (26.08.2026)

**Kaçan 37 siparişten 8 örnek TEK TEK çekildi — 8/8 ✓.** Yani kayıtlar API'de
VAR; enumerasyon onları düşürüyor.

**Ortak özellik ARANDI, BULUNAMADI:** 8'inin de `status: Delivered` ·
`createdBy: order-creation` · `shipmentPackageStatus: Delivered` ·
`deliveryType: normal` · aynı kargo firması. **Ayırt edici bir alan yok** —
yani düşme, kaydın bir özelliğinden değil **enumerasyon davranışından**
geliyor.

**SIRALAMA/SAYFALAMA ELENDİ:** aynı 3 günlük dilim dört farklı sıralamayla
(varsayılan · `PackageLastModifiedDate` ASC/DESC · `CreatedDate` ASC)
**dördünde de 14 kayıt, 14 farklı sipariş** döndürdü. Sayfalama kayması
değil.

⚠ **VE DİLİM KÜÇÜLTMEK ÇARE DEĞİL:** 1 günlük dilim 5 hata alıyor ve DAHA AZ
buluyor (198 < 260). Ayrıca aynı ölçüm iki koşumda 497 ↔ 560 verdi — tarih
penceresi enumerasyonu **kararlı bile değil.**

> **MEKANİZMA:** _tarih penceresi enumerasyonu sessizce kayıt düşürüyor;
> sebebi kaydın özelliği ya da sıralama DEĞİL._ Bu bir TY davranışı ve
> bizim tarafımızdan kapatılamıyor.

**⏭ TELAFİ YOLU ÖLÇÜLDÜ VE ÇALIŞIYOR:** `?orderNumber=` ile **tek tek çekme
8/8 başarılı.** Kuru koşum bu mekanizmayı telafi ederek kurulacak — sipariş
numarası BAŞKA bir kaynaktan biliniyorsa (hakediş · kargo faturası) o sipariş
tek tek çekilip doğrulanabilir.
⚠ **AMA BU TAMLIK VERMEZ:** hiçbir kaynakta adı geçmeyen bir sipariş yine
görünmez. Liste **ALT SINIR** olarak kalır ve raporda öyle yazar.

### 🆕 A3-④/⑤ — OTOMATİK ÇEKİM + HAKEDİŞ/KARGO UÇLARI (tasarım turu, 26.08)

**KOD YAZILMADI.** Ölçüm koştu, tasarım raporlandı, karar Halil'de.

⛔ **HIZ LİMİTİ BAŞLIĞI YOK.** Yanıt başlıkları ölçüldü (17 başlık, hepsi
basıldı): `rate` · `limit` · `remain` · `retry` · `quota` geçen TEK BAŞLIK
YOK. Uç sınırını beyan etmiyor → sıklık **ölçümle** seçilecek, beyanla değil.

⚠ **VE AŞIRI YÜKLENME `429` DEĞİL `500` OLARAK GELİYOR.** Aynı çağrı 2 sn
arayla `200` + 3 kayıt, hızlı ardışıkta `13/13 HTTP 500`. Naif bir yeniden
deneme döngüsü bunu "uç bozuk" diye okur. _(Ölçüldü: `Stoppage`.)_

**⑥ HAKEDİŞ UCU — KURU KOŞUM:** 15 günlük 13 dilim · **hata 0 · boş 0** ·
**1863 kalem** (6 ay). Defterde bu hesapta **463** → API **4 KAT** fazla.
✅ Kalem `id` alanı taşıyor (`14020236951`) → kimlik anahtarı hazır, uydurma
bileşik anahtar gerekmiyor.
✅ `orderNumber` **VE** `shipmentPackageId` **AYRI ALANLAR** — 26.08'de
düzelttiğim karışıklığın kaynağı burada kapanıyor.
✅ `commissionRate` + `commissionAmount` **kalem düzeyinde** → K9 dilim
şemasının bağımsız teyidi mümkün. ⚠ Ölçüm planı yazıldı, **hüküm verilmedi.**

**⑦ KARGO FATURASI — API'DE VAR.** ⚠ İlk sondam bulamadı ve sebep **benim
kusurumdu**: `size=50` gönderiyordum, uç `500 ya da 1000` istiyor ve hatayı
`400` diye döndürüyor. "Uç yok" diye rapor edilecekti.
`otherfinancials?transactionType=DeductionInvoices` → **`Kargo Fatura`
63 kalem · ₺284.674,65** (6 ay). Ayrıca `Platform Hizmet Bedeli` 59 kalem ·
₺26.003,90 → ₺13,19'un kanalın kendi belgesindeki karşılığı.

⛔ **HTTP 500 VEREN DÖRT TÜR:** `Stoppage` · `CreditNote` ·
`CommissionInvoice` · `FinancialItem` (4/13). TY tarafı — bizim
parametremiz değil (aynı çağrı yavaş koşulunca `Stoppage` 200 döndü).

**⑧ GEÇMİŞ SINIRI — YAZILDI:** API sipariş **90 gün**, hakediş **6 ay**.
Defterin en eski hareketi **2025-08**. ⛔ **ARADAKİ DÖNEM API'DEN KAPANMAZ**
— elle giriş ya da dosya dökümü. Bu bir SINIR, çözülecek sorun değil.

⏭ **KARAR BEKLEYEN:** anahtarın Vercel'e taşınması (risk raporu verildi) ·
iki mod (geçmişi doldur / yeni sipariş al) · sıklık.

### ⚠ −21 VAKASI — ÖLÇÜLDÜ, DÜZELTİLMEDİ (26.08)

`11467475277` · 01.08 · **elle girilmiş** (`importBatch` boş) ·
tek kalem `8720689013949` × 1 @ **1.812,00** · API/fatura **1.833,00**.
Kâr hesaplanmış: NET-1 `280,11` · NET-2 `230,91`.
⛔ **DÜZELTİLMEDİ:** tutar bir PARA alanı ve metadata istisnası kapsamına
girmiyor; düzeltme satış düzenleme ekranından yapılır ve kârı tazeler.
⏭ Halil ekrandan düzeltir; ya da açık talimat verirse izli betikle.

### ✅ TEST ARTIĞI TARAMASI — NEREDEYSE TEMİZ (26.08)

| Kova | Sonuç |
|---|---|
| (a) sipariş kodu şüpheli | **1** — `sfsfsf`, **zaten İPTALLİ** |
| (b) sipariş numarasız satış | **2** (biri iptalli, biri aktif 03.08) |
| (c) tutarı sıfır/negatif | **0** |
| (d) kalemsiz satış | **0** |
| (e) ürün adı şüpheli | **0** |
| (f) alım/gider açıklaması | **0** |

⚠ **İLK DESENİM GÜRÜLTÜ ÜRETTİ ve düzeltildi:** `111` gerçek sipariş
numaralarını (`11453897111`), `zzz` LEGO **DREAMZzz**'i, `xxx` **XXXL**'i
yakaladı — 11 gerçek ürün "şüpheli" işaretlendi. Rakam ve tek harf
tekrarları elendi. _Bir desen 11 gerçek kaydı işaretliyorsa o desen ölçüt
değil gürültüdür._
⚠ **HÜKÜM YOK** — bunlar aday; işaret Halil'in.

### ⚠ MARJ ŞERHİ — KOŞUYOR (26.08.2026)

İçe aktarılan satışlar **ciroya giriyor, NET'e girmiyor**. Ekran marjı
**%2,58**, maliyet bağı olanlarda **%9,31**. Haziran **%0,3** (47 satışın
46'sı içe aktarma), temmuz **%0,2** (287'nin 283'ü) — o aylarda ekran marjı
**anlamsız**.

Panel · satışlar · rapor ekranlarında iki rakamlı şerh. Sönme ölçütü
`profitStatus` (⚠ `importBatch` DEĞİL — bağ kurulunca satır hâlâ
`importBatch` taşıyacak, şerh sönmezdi).

### ✅ KİMLİK ARAMASI — 11 SİPARİŞ KURTARILDI (26.08.2026)

İçe aktarma barkodu **yalnız `ProductVariant.barcode`da** arıyordu.
`194645027819` sistemde **VARDI** — `axcali2755`in **Trendyol Kanal SKU'su**
olarak — sorgu göremiyordu. ₺27.807 defterin dışındaydı.

⚠ **ŞEMA DEĞİŞİKLİĞİ GEREKMEDİ:** merdiven 1. basamakta durdu. `ChannelSku`
bu iş için zaten var; ikinci barkod alanı da yeni tablo da gereksiz.
⚠ **AYRI LİSTE YAZILMADI:** `kodKosuluToplu`, `kodKosulu` ile aynı
`VARYANT_KOD_ALANLARI` sabitinden türüyor.
⚠ **BELİRSİZ KOD YAZILMIYOR:** `channelSku` yalnız (hesap, kod) çiftinde
tekil — aynı kod iki hesapta iki farklı varyanta işaret edebilir.

**İkinci parti koştu:** 12 sipariş (2 iptal dahil) · 574 → 586 ·
`ty-20260826130847`. ✅ **ÜÇÜNCÜ PARTİ KOŞTU (26.08):** Halil iki ürün kartını açtı, ikisi de
`barcode` alanında doğrulandı (`ELK-DJ-DM-01` · `OYU-LG-LMC10-01`).
2 sipariş yazıldı · **586 → 588** ✓ · `ty-20260826151804` · ikinci koşum **0**.

> **⛔ 13'LÜK LİSTE KAPANDI.** Son koşumda `YAZILAMAZ: 0`.
> 11'i Kanal SKU düzeltmesiyle, 2'si ürün tanımıyla girdi.

### ✅ STOK + MALİYET BAĞI — KOŞTU (26.08.2026)

**Karar: bağlanabilen bağlanır.** 82 satış bağlandı, kârları tazelendi.
`StockMovement` **541 → 624** (+83) ✓ · `AuditLog: ICE_AKTARMA_STOK_BAGI`.
⛔ **329 satış ATLANDI** — hareket YAZILMADI. Negatif stok yok, kaynaksız
çıkış kovası yok. Sebep: o ürünlerin **alımı deftere hiç girmemiş** (K55).

**defter-ayrışması:** SAPAN **2** — K54'ün iki hayaleti, ayrı kovada.
⚠ Bağdan hemen sonraki koşum **3** demişti, sonraki iki koşum **2**; bir
varyant arada temize geçti. _Defter akıyor — ölçüm anı yazılır._

**Geri alma** (ters kayıt, silme değil):

    npm run canli:stok-bagi -- --geri=ty-20260826111346 --uygula
    npm run canli:stok-bagi -- --geri=ty-20260826130847 --uygula
    npm run canli:stok-bagi -- --geri=ty-20260826151804 --uygula

<details><summary>tasarım ölçümü (26.08, arşiv)</summary>

### 🔬 K55 — STOK + MALİYET BAĞI · TASARIM ÖLÇÜMÜ

**KOD YAZILMADI.** Ölçüm (26.08.2026, salt okuma):

| | |
|---|---|
| bağsız kalem | **437** (iptalsiz **409**) |
| farklı varyant | **152** · toplam **416 adet** |
| tarih aralığı | 27.06 → 26.08 |
| **FIFO YETERLİ** | **24 varyant** (%16) |
| FIFO yetersiz | 23 |
| **HİÇ hareket yok** | **105** (%69) |
| **karşılıksız kalacak adet** | **336 / 416 (%81)** |

⛔ **"PARTİ YETMEZSE" BİR İSTİSNA DEĞİL, ÇOĞUNLUK.** Tasarımın merkezi
soru buydu ve cevap ölçümle geldi: kalemlerin **%81'i** maliyet kaynağı
bulamayacak. Bu, üç seçenek arasındaki tercihi bir ayrıntı olmaktan çıkarıp
**işin kendisi** yapıyor.

✅ **`occurredAt` KARARI ÖLÇÜLDÜ:** `Sale.soldAt` (İstanbul gününün UTC gece
yarısı). Mevcut `SALE_OUT` hareketlerinin **151/152**'si zaten birebir böyle
— yeni kayıtların farklı davranması bir tutarsızlık olurdu.

</details>

### ✅ K55 — ALIM DEFTERİ AÇIĞI · **BÜYÜK ÖLÇÜDE KAPANDI** (26.08.2026)

**1569 alım · 1609 kalem · 1608 `PURCHASE_IN` yazıldı.** Stok bağı **260
kalem** kurdu.

| | önce | sonra |
|---|---|---|
| **ekran marjı** | %2,58 | **%10,12** |
| maliyet bağı olanların | %9,31 | **%11,12** ⚠ |
| şerhteki satış | 329 | **69** |

⚠ **`%11,12` O GÜNÜN KAPSAMIYDI ve AŞILDI** — geçerli olan **%19,67**
(27.08 kâr tazeleme, 3244 satış üstünden).

✅ **`[YANLIŞ CEVAP VEREN EKRAN]` ETİKETİ MARJ İÇİN KALKTI** — ekran artık
gerçeği gösteriyor. İki rakam birbirine yaklaştı; kalan **69 adıyla şerhli**.

**KALAN 69:** 29 bağ bekliyor (alım VAR) + 40 **alım kaydı yok**.
Kaynağı: **130 eşleşmeyen barkod** + **79 barkodsuz satır**.

⚠ **8 ALIM: teslim tarihi okunamadı** (`"11.02.0202"` — 2026 yerine 0202
yazılmış). Satın alma tarihine düşüldü, **ekranda sayılı, UYDURULMADI.**

<details><summary>açık ölçümü (26.08, arşiv)</summary>

### 🆕 K55 — ALIM DEFTERİ AÇIĞI (AÇILIŞ ÖLÇÜMÜ)

**329 satış maliyet bağı kuramıyor** çünkü o ürünlerin alımı deftere hiç
girmemiş. 128 varyant · 335 adet karşılıksız.

> **Satışlar API'den akıyor, alımlar elle giriliyor — makas buradan
> açılıyor.** Bu bir satış arızası değil; satış tarafında yapılacak bir şey
> yok.

### 📐 K55 ÖLÇÜLDÜ (26.08.2026) — ÖNERİ YOK, DÖRT TABLO

**① AÇIK DAĞINIK, TOPLU DEĞİL.** 128 varyant · 335 adet · **₺1.156.864**.

    ilk  5 ürün → %16,8      ilk 20 ürün → %42,0
    ilk 10 ürün → %26,7      ilk 40 ürün → %63,7   ilk 64 → %81,2

⛔ **Az sayıda üründe TOPLANMIYOR** — %80'i kapatmak **64 ayrı ürün** ister.
47 varyant tek kalemlik. En büyük tek kalem ₺61.671 (Philips espresso).

**② ZAMAN — İKİ FARKLI SORUN, İKİSİ DE VAR.**

| Ay | Kalem | Adet | Tutar | Pay |
|---|---|---|---|---|
| 2026-06 | 36 | 37 | 128.231 | %11,1 |
| **2026-07** | **244** | **249** | **856.279** | **%74,0** |
| 2026-08 | 49 | 49 | 172.354 | %14,9 |

Temmuz ağırlıklı (geçmiş dönem) **ama ağustos da 49 kalem** — bugünkü akışta
da boşluk var.

**③ ALIM DEFTERİ KAPSAMI — İLK KEZ ÖLÇÜLDÜ.**
380 alım · 380 kalem · **886 adet** · 30.05.2024 → 26.08.2026.
**174 / 1097 varyanta dokunuyor (%15,9).**
⚠ Defter **yeni**: 2026-03'ten itibaren ciddileşiyor (03: 24 · 06: 62 ·
07: 79 · **08: 144**).

**④ TEDARİKÇİ.** Hepsi Burada 248 alım / 537 adet · Amazon 83 / 236 ·
N11 13 · Trendyol 9. Karşılıksız varyantların ürünü **yalnız 25'inde**
başka bir alımda geçiyor — 13'ü Hepsi Burada, 11'i Amazon.

⛔ **VE ASIL BULGU — SORUN NİCELİK DEĞİL KAPSAM:**

    ALINAN  886 adet   ·   SATILAN 566 adet   →  alım defteri 320 adet FAZLA

Yani defter **küçük değil, BAŞKA ÜRÜNLERİ** kapsıyor:

| | |
|---|---|
| alımı olan varyant | 174 |
| satışı olan varyant | 194 |
| **ikisi de olan** | **91** |
| satışı var alımı **hiç yok** | **103** |

**Açığın şekli:** miktar eksiği **97 adet** (ürün var, adet yetmiyor) ·
**ürün eksiği 231 adet** (o ürün deftere hiç girmemiş). **%70'i ürün eksiği.**

⚠ **VE 25 VARYANTIN ALIMI VAR AMA AÇIK PARTİSİ YOK — SEBEP ÖLÇÜLDÜ:**
31/35 alım kalemi `RECEIVED` ve stok hareketi VAR. Yani mal girmiş, önceki
satışlarda FIFO'dan tükenmiş. **"Mal kabul bekliyor" DEĞİL** (yalnız 4 kalem:
3 `CANCELLED` + 1 `ORDERED`).

⚠ **BİR OKUMAM YANLIŞTI — DÜZELTMESİ:** ilk tabloda "Hepsi Burada 248" ile
"Hepsiburada 7" yan yana çıkınca **çift tedarikçi kaydı** sandım. `Supplier`
tablosunda tek kayıt var; 7'si `supplierId` BOŞ olan alımların **serbest
metin** adı. Gerçek bulgu: **22 alımın tedarikçi bağı yok** (14'ü adsız).

### 📗 ALIŞ EXCEL'İ ÖLÇÜLDÜ (26.08.2026) — AÇIĞIN **%92'Sİ KAPANIYOR**

`Downloads/alislar (5).xlsx` · sayfa `ALIŞLAR` · **salt okuma, hiçbir şey
yazılmadı.** Dosya depoya GİRMEDİ.

**⓪ BEYAN DOĞRULANDI — üç sapma var, üçü de küçük:**

| | beyan | ölçülen |
|---|---|---|
| satır | 2280 | **2283** |
| barkod dolu | 2128 | **2128** ✓ |
| barkod boş | 152 | **155** |
| tekil barkod | 771 | **771** ✓ |
| toplam tutar | 11.913.849 | **11.913.849,46** ✓ |
| tarih aralığı | 25.10.25→25.08.26 | ✓ |

⚠ **3 satır fazla ve 3 satırın TARİHİ OKUNAMIYOR** — aynı 3 satır olması
muhtemel. ⚠ Ayrıca komut metni `alislar (4).xlsx` diyor, yol `(5)` veriyor;
**ikisi farklı dosya** (md5 ayrı). Verilen yol kullanıldı.

**① EŞLEŞME:** 771 tekil barkodun **698'i bulundu** (%90,5) · 73 bulunamadı ·
belirsiz 0. Alan kırılımı: `barcode` **697** · `channelSku` **1**.

> **⭐ ASIL CEVAP:** K55'in 128 karşılıksız varyantının **111'i dosyada var**
> (109 adedi TAM karşılıyor, 2 kısmi). **295/335 adet · ₺1.072.764 · %92,7.**

**② ÇAKIŞMA:** `supplierOrderNo` **işe yarar bir kimlik anahtarı**:
sistemdeki 385 alımın 355'inde dolu, **314'ü dosyayla eşleşiyor**.
İkinci aday (varyant+gün+adet) **321 satır** buluyor — iki yöntem tutarlı.
Yani **~2.000 satır YENİ**.

⛔ **`Envantere İşlendimi` KOLONU TAMAMEN BOŞ (2283/2283).** Halil'in elle
takibi bu dosyada hiç doldurulmamış. Bu yüzden _"dosya işlenmedi der,
sistemde var: 321"_ satırı bir ÇELİŞKİ DEĞİL — boş kolonun artefaktı.
**İki taraf ayrı sayıldı ve biri ötekinin yerine geçmedi.**

**③ TEMİZLİK:**
· **155 barkodsuz satır** — ürün adıyla tam eşleşen yalnız **5**.
· **Barkod uzunluğu:** 13 hane 671 · 12 hane 86 · 11 hane 11 · 14 hane 1 ·
  **8 hane 2 → değerleri `İSTANBUL` ve `iSTANBUL`** (çöp veri; üstelik tam
  I/i tuzağının kendisi).
· ⚠ **Kısa barkodlar SIFIR KAYBI DEĞİL:** 99 kısa koddan başa `0` eklenince
  sistemde bulunan yalnız **2**. Gerisi farklı standart (UPC-A 12 hane).
· **Mağaza → tedarikçi:** 8 ad eşleşti, **5 yeni aday**: `BEYMEN` · `A101` ·
  `HUAWEİ` · `Ahmet Pekel` · `(boş)` (4 satır).

**④ FIFO ETKİSİ:** 329 karşılıksız kalemin **285'i bağ kurar** —
290 adet · **₺1.065.534 · açığın %92,1'i.**
✅ **SIRA HATASI 0** — hiçbir alım satıştan sonraya düşmüyor.
⛔ Kalan **44 kalem / 45 adet** dosyada da yok.

### 🚦 K55 KURU KOŞUM ÜRETİLDİ — **ONAY BEKLİYOR** (26.08.2026)

`npm run canli:alis-kuru -- --dosya="…"` · **salt okuma, tek satır yazılmadı.**

**① DOSYA KİMLİĞİ RAPORUN İLK SATIRINDA** (artık her koşumda):
`alislar (5).xlsx` · md5 `b4ccfd3b0e99388a2ed0780c2770dcc6` · **2283 satır**.

**② YAZILACAK:** **1574 alım** (sipariş no başına gruplanmış) · **1615 kalem** ·
3266 adet · **₺7.788.253** · kaynak `alis-excel`.
⚠ 1614'ü barkodla, **1'i ürün adıyla** — ad eşleşmesi ayrı işaretli.
Tarih: 2025-10 → 2026-08, en yoğun 2026-01 (251 kalem).

**③ DIŞARIDA — altı ayrı kova, toplamı satır sayısıyla TUTUYOR (668+1615=2283):**

| Kova | Adet | Sebep |
|---|---|---|
| `zatenVar` | **348** | sipariş no ya da varyant+gün+adet eşleşti |
| `eslesmeyenBarkod` | **130** | barkod var, ürün sistemde YOK |
| `iadeli` | **106** | iade edilmiş — stok vermez |
| `barkodsuz` | **79** | barkod yok, ürün adı da eşleşmedi |
| `adetSifir` | 3 | adet ≤ 0 |
| `copBarkod` | **2** | `İSTANBUL` · `iSTANBUL` |

**④ TEDARİKÇİ:** 8 eşleşti · **2 yeni aday: `A101` · `Ahmet Pekel`** (1'er kalem).
⛔ **Otomatik AÇILMAZ** — onay gelene kadar o 2 kalem dışarıda.

**⑤ İDEMPOTENTLİK:** ikinci koşum **0** — beyan değil, aynı sınıflandırma
yazım sonrası hâlle yeniden koşularak **simüle edildi**.

**⑦ STOK:** `PURCHASE_IN`, `occurredAt` = Satın Alma Tarihi.
`StockMovement` **636 → 2251** · `PURCHASE_IN` **358 → 1973**.
⚠ Satış tarafındaki karardan farklı ve sebebi net: orada parti YOKTU,
burada parti **bizzat bu kayıtlar**.

**⑧ SONRASI:** stok bağı yeniden koşunca **260 kalem** bağ kurar ·
₺990.061 · **açığın %85,6'sı**. Yine bağlanamayan 69 kalem.

⚠ **RAKAM DÜŞTÜ: 285 → 260 — VE SEBEBİ ÖLÇÜLDÜ, VARSAYILMADI.**

    süzgeçsiz (ilk ölçümün yaptığı)   289
    yalnız iade elendi                285   ← önceki rapordaki rakam
    yalnız zatenVar elendi            264
    ikisi de elendi (kuru koşum)      260   ← GEÇERLİ OLAN

İlk ölçüm sistemde **zaten olan 348 satırı yeni parti sayıyordu** — aynı malı
iki kez stoğa koymak olurdu. `285` aşıldı, geçerli olan **260**.

⛔ **RAPORUN AÇTIĞI TEK ŞEMA KALEMİ** (yazımdan ÖNCE ayrı migration onayı):

    Purchase.importBatch  String?   @@index([importBatch])
    Purchase.importKaynak String?   ← 'alis-excel'

⚠ Merdiven ölçüldü: `supplierOrderNo` bu işi **göremez** — o tedarikçinin
numarası ve elle girilen kayıtlarda da dolu; parti kimliği yapmak iki anlamı
tek kolona koyardı. `note` da sorgulanacağı için yetmez.

### ✅ K55 ALIŞ İÇE AKTARMA — KOŞTU (26.08.2026)

**Migration:** `Purchase.importBatch` + `importKaynak` · canlı + yerel · damga **38**.

| | önce | sonra | fark |
|---|---|---|---|
| `Purchase` | 386 | **1955** | +1569 ✓ |
| `PurchaseItem` | 386 | **1995** | +1609 ✓ |
| `StockMovement` | 636 | **2244** | +1608 ✓ |
| `PURCHASE_IN` | 358 | **1966** | +1608 ✓ |

**İdempotentlik:** son koşum **0 yazdı**, `zatenVar` 1961 ✓

⛔ **İLK KOŞUMDA 44 ALIM DÜŞTÜ VE SEBEBİ İKİ KUSURDU:**

**① Sınanmayan dal.** `tariheCevir` geçerliliği YALNIZ metin dalında
sınıyordu; `Date` ve `number` dalları doğrulamasız geçiyordu.

**② Yutulan hata mesajı.** `message.split()[0]` Prisma hatalarında **boş
satır** düşürüyordu — ekrana `⛔ 471 054 764 0 — ` yazıldı, sebep KAYBOLDU.
44 alım düştü ve niye düştüğü **ölçülemedi**. _(İlke #5'in tam ihlali:
sessiz başarısızlık.)_

**GERÇEK SEBEP — KAYNAK VERİ:** 8 satırın Teslim Tarihi **`"11.02.0202"`**
(birinin `2026` yerine `0202` yazması). `new Date()` bunu **yıl 202** diye
geçerli sayıyor, `Intl` `202-11-02` (üç haneli yıl) biçimliyor,
`new Date("202-11-02T…")` **Invalid Date** dönüyor. Zincirin başındaki hata
SONUNDA görünüyor.

⚠ **UYDURULMADI.** _"0202 demek ki 2026'ymış"_ diye düzeltmek bir tahmindir.
Makul yıl kapısı kondu (2000–2100), değer **kullanılamaz** sayıldı, satın
alma tarihine düşüldü ve **ekranda sayıldı**: `⚠ TESLİM TARİHİ OKUNAMAYAN 8`.

**Kalan 8 alım yazıldı, hata 0.**

### ✅ STOK BAĞI YENİDEN KOŞTU — 260 kalem

Kuru koşumun öngördüğü rakam **birebir tuttu**: 329 → **260 bağlandı** ·
`StockMovement` 2244 → 2504 ✓ · 260 satışın kârı tazelendi ·
**69 kalem** atlandı.

**MARJ — önce/sonra:**

| | önce | sonra |
|---|---|---|
| ekran marjı | %2,58 | **%10,12** |
| maliyet bağı olanların | %9,31 | **%11,12** ⚠ |
| şerhteki satış | 329 | **69** |

⚠ **`%11,12` O GÜNÜN KAPSAMIYDI ve AŞILDI** — geçerli olan **%19,67**
(27.08 kâr tazeleme, 3244 satış üstünden).

⚠ Şerh artık **iki satır**: `29` bağ bekliyor (alım var) · `40` **ALIM KAYDI
YOK**. İçe aktarma satışlarının **342/411**'inin kârı hesaplanmış.

**DEFTER AYRIŞMASI:** incelenen 707 · temiz 705 · **SAPAN 2** ·
incelenemeyen 0. K54'ün iki hayaleti yerinde, **yeni sapan DOĞMADI**.
Ayrı kova 329 → **69**.

⏭ **K55 KÜÇÜLDÜ AMA KAPANMADI:** 69 kalem hâlâ alım kaydı bekliyor —
130 eşleşmeyen barkod + 79 barkodsuz satır oradan besleniyor.

_(Çözüm bulundu: alış Excel'i içe aktarıldı — yukarıdaki özete bak.)_

</details>

### ⚠ ENVANTER — İKİNCİ ŞERH KOŞUYOR (26.08.2026)

Halil bildirdi: alışlar girince stok **₺8,5M / 3595 adet** göründü.
Sebep ölçülüydü ama **ekranda yazılı değildi.**

    alım defteri   1955 kayıt · en eski 2024-05-30
    satış defteri   556 kayıt · en eski 2026-06-17
    → satış defteri 748 GÜN SIĞ
    → kapsanmayan pencerede HÂLÂ AÇIK: 3115 adet

Envanter değeri **ve** stok ekranlarında ikinci şerh — **mevcut 69'luk
şerhin YANINA, yerine değil.** İki ayrı sebep, iki ayrı çözüm:
· `MarjSerhi` → satış defterde **VAR**, maliyet bağı yok
· yeni şerh → satış defterde **HİÇ YOK**

⚠ **ÖLÇÜT GÜN FARKINA BAĞLI DEĞİL — ve bu kasıtlı.** Gün farkına
bağlansaydı satış aktarımından sonra da (~18 gün) fark kalır ve şerh
**sönmezdi**. Ölçüt farkın ÜRETTİĞİ çarpıklık: kapsanmayan pencerede
**hâlâ açık** parti adedi. Sıfırlanınca şerh kendiliğinden söner.

### ⏭ K56 — SATIŞ EXCEL'İ (sıradaki)

**ÖLÇÜLDÜ 26.08.2026 — salt okuma, yazma yok.**
`satis.xlsx` · md5 `0674f15faf27ed5c661f55fc75a278a3` **birebir tuttu** ·
sayfa `SATIŞ` · **10205 satır** (beyan 10197 → 8 fark).

**⓪ BEYAN — tür ve kanal BİREBİR tuttu:**
satış **9743** · iade 387 · tazmin 27 · iptal 24 · TATİL 8 · aktarma 7 ·
Zarar 1 · **(boş) 8** ← beyanda yoktu, 8 farkın kaynağı bu.
TY 6186 · HB 3917 · AMZN 68 · DEPO 12 · N11 6 · **(boş) 16**.

⚠ **TARİH ARALIĞI BEYANDAN GENİŞ:** beyan `2024-06→2026-08`, ölçülen
**`2024-01-14 → 2029-03-30`**. Gelecek tarihli **3** satır teyit edildi
(`2027-10-11` · `2029-03-30` · `2026-09-28`) · **11 satırın tarihi
okunamıyor**.

> ### ⭐ ÇAKIŞMA — ASIL CEVAP
>
> | | |
> |---|---|
> | dosyadaki tekil sipariş no | **9163** |
> | **defterde de VAR** | **544** |
> | defterde YOK | **8619** |
> | eşleşen dosya satırı | 565 / 10205 |
>
> **Çift kayıt riski dar: dosyanın %94'ü defterde YOK.**
> Eşleşen 544'ün **410'u içe aktarma**, 134'ü elle girilen.

✅ **KANAL DOĞRULAMASI 564/565 TUTTU** — numara eşleşmesi tesadüf değil.
⚠ Tek istisna `4702310503`: dosya **TY** diyor, defter **Hepsiburada**.
_(HB numaraları 10 hane "4" ile başlar — dosyadaki kanal etiketi şüpheli.)_

⛔ **YAZILAMAZ OLANLAR — ürün eşleşmesi zayıf:**
SKU ile eşleşen **6210** · barkodla **0** · belirsiz 41 ·
**hiçbiri 3954** (737 tekil SKU). Eşleşmeyenlerin çoğu **Hepsiburada
listing kodu** (`HBCV…` / `HBV…`) — bunlar `ChannelSku` alanına ait,
`sku` alanına değil.

**YENİLERİN YILI:** 2024 → 1335 · 2025 → **4921** · 2026 → 2954.
⛔ **419 satırın sipariş numarası HİÇ YOK.**

### 🔬 K56-② — 737 EŞLEŞMEYEN SKU TEŞHİSİ (26.08.2026, salt okuma)

⛔ **ÖNCE BİR RAKAMIMI DÜZELTİYORUM: ₺181.160 → ₺9.084.024 (50 KAT).**
`Satış Fiyat` kolonunu okumuştum; başlık doğru görünüyordu ama **yalnız 85
satırda dolu** (hepsi 2024). Doluluk ölçülünce gerçek kolon göründü:

    Alış fiyatı        63      Satış Fiyat        85
    ÜRÜN ALIŞ FİYATI 10153    ÜRÜN LİSTE FİYATI 10162   ← gerçek
    Satış tutarı      7874    Toplam kar        10186

_"%100'ü ilk 10 SKU'da" gibi imkânsız bir yoğunlaşma çıkmasa fark
edilmezdi._ **₺181.160 aşıldı, geçerli olan ₺9.084.024.**

**② KOD BİÇİMİ — ve en büyük grup ÇÖP:**

| Biçim | Kod | Satır | Örnek |
|---|---|---|---|
| `HBCV…` HB listing | 385 | 1171 | `HBCV00003GJJF7` |
| sadece rakam (barkod) | 127 | 408 | `194735192069` |
| `HBV…` eski listing | 120 | 388 | `HBV00000XYB03` |
| başka desen | 96 | 296 | `HRBSCPFS2000` |
| ⛔ **RAKAM YOK (çöp)** | **8** | **1671** | `trendyol` · `hepsiburada` |
| `axcali…` bizim SKU | 1 | 3 | `AXCALI180734` |

⛔ **8 ÇÖP KOD 1671 SATIR TAŞIYOR** — SKU sütununa kod yerine **pazaryeri
adı** yazılmış. `trendyol` tek başına **1473 satır · ₺3.128.321 = açığın
%34'ü.**

**③ HACİM:** 737 SKU · **₺9.084.024**. İlk 10 → %43,4 · ilk 30 → %51,6 ·
ilk 120 → %69,4. **Dağınık değil, ama tepe de tek koda bağlı.**

**① AD EŞLEŞTİRMESİ — İŞE YARAMIYOR.** Yöntem: Levenshtein, eşik
`max(2, uzunluk/4)` (`benzerleriBul`, ortak gövde). En büyük 120 SKU'dan
**yalnız 13'ü** aday buldu. Sebep ölçüldü: dosyadaki adlar **pazaryeri
listing başlığı**, bizimkiler ürün adı.
⛔ **VE ADAYLARIN BİR KISMI YANLIŞ ÜRÜNE İŞARET EDİYOR:**
`Karcher SC 3` → `Karcher SC 4` · `JBL Charge6 Mor` → `JBL Charge6 Mavi` ·
`Homend Artfood Siyah` → `Homend Artfood Krem`. **Ad eşleşmesi bu veride
kullanılamaz.**

**④ ALIŞ ÇAPRAZI:** en büyük 120'den **13'ü** alış dosyasında karşılık
buldu — köprü yine ADLA kuruldu, yani aynı zayıflık.

> ### ⑤ DÖNEM — EN GÜÇLÜ BULGU
>
> | Yıl | Eşleşmeyen | Tutar | Eşleşen | **Eşleşmeme** |
> |---|---|---|---|---|
> | 2024 | 1382 | 2.884.910 | 364 | **%79,2** |
> | 2025 | 2429 | 5.614.917 | 2492 | **%49,4** |
> | **2026** | **133** | 576.981 | **3392** | **%3,8** |
>
> **Sorun ESKİ dönemde.** 2026 zaten %96 eşleşiyor; eşleşmeme geriye
> gidildikçe artıyor. Son aylarda 8–45 satır.

### 🚦 K56 KURU KOŞUM — **ONAY BEKLİYOR** (26.08.2026)

`npm run canli:satis-kuru -- --dosya="…"` · **salt okuma, tek satır yazılmadı.**
`satis.xlsx` · md5 `0674f15faf27ed5c661f55fc75a278a3` · **10205 satır**.

**② YAZILACAK:** **5219 satış** (sipariş no başına) · **5339 kalem** ·
5339 adet · **₺15.178.095** · kaynak `satis-excel`.
Yıla göre: 2024 → 290 · 2025 → 2359 · **2026 → 2690**.

**③ DIŞARIDA — sekiz kova, toplam satır sayısıyla TUTUYOR (4866+5339=10205):**

| Kova | Adet | Sebep |
|---|---|---|
| `eslesmeyenListing` | **1932** | HBCV/HBV/başka desen — ürün sistemde YOK |
| `copSku` | **1491** | SKU yerine pazaryeri adı — ürün bilgisi dosyada YOK |
| `zatenVar` | **553** | çakışmada ATLA, ezme yok |
| `turFarkli` | **462** | satış DEĞİL |
| `numarasiz` | 381 | sipariş numarası hiç yok |
| `belirsizSku` | 36 | kod >1 varyanta işaret ediyor |
| `tarihOkunamayan` | 8 | |
| `gelecekTarihli` | **3** | tarih GELECEKTE |

⚠ **`gelecekTarihli` KOVASI SONRADAN AÇILDI — ve 1 satır yazılabilir listeye
SIZMIŞTI.** Makul yıl kapısı (2000–2100) `2029-03-30`u geçiriyor: yıl geçerli
ama gün gelmedi. Kova ayrılmasaydı yazıma kadar görünmezdi.

**TÜR KIRILIMI — sistemde karşılığı ne (hiçbiri bu turda yazılmıyor):**
iade 387 → `Return`/`ReturnItem` · tazmin 27 → `Compensation` ·
iptal 24 → `Sale.iptalTarihi` · **TATİL 8 → ⛔ karşılığı YOK** ·
(boş) 8 → ⛔ tür belirsiz · **aktarma 7 → ⛔ karşılığı YOK** ·
Zarar 1 → `ADJUSTMENT`/hurda, ayrı karar.

⚠ **KANAL ETİKETİ ↔ NUMARA BİÇİMİ ÇELİŞKİSİ: 8 satır.** `4637289070` HB
deseni taşıyor ama etiket `TY`; `10711449394` tersi. Bu satırların defterde
karşılığı YOK — _"defter kazanır"_ kuralı **uygulanamaz**, karar gerekiyor.

**④ STOK:** 885 varyanttan **542'sinde açık parti var**.
✓ `SALE_OUT` yazılır **2629 kalem** · ⛔ parti yok, atlanır **2710 kalem**.
_(Satış tarafındaki kural: parti yoksa hareket yazılmaz, negatif stok yok.)_

**⑤ ENVANTER ETKİSİ:** kapsanmayan pencerede açık **3115** → bu aktarım
**2629 adet** eritir → kalan **~486**.
⚠ **KABA TAHMİN VE NİYE KABA OLDUĞU YAZILI:** şerhin ölçütü "satış
defterinin en eski tarihinden önce alınmış açık parti"; bu aktarım satış
defterini 2024'e indirdiği için **pencerenin kendisi de daralacak** —
gerçek düşüş bundan büyük olabilir.

**⑥ İDEMPOTENTLİK:** ikinci koşum **0** ✓ (anahtar `Sale.code`, global unique).

### ✅ K56 SATIŞ İÇE AKTARMA — KOŞTU (26–27.08.2026)

Parti `satis-20260826215218` · **hata 0** · `AuditLog: SATIS_ICE_AKTARMA`.

| | önce | sonra | fark |
|---|---|---|---|
| `Sale` | 588 | **5778** | +5190 ✓ |
| `SaleItem` | 588 | **5898** | +5310 ✓ |
| `StockMovement` | 2505 | **5331** | +2826 ✓ |
| `SALE_OUT` | 495 | **3321** | +2826 ✓ |

**Dört sayım da tuttu.** İkinci koşum **0 yazdı** (`zatenVar` 5865) ✓

⚠ **İki kova ölçümle doğdu ve YAZILMADI:** `kanalCozulemedi` **21**
(dosya kanalı söylüyor, hesabı değil — Amazon'da üç hesap, üçü sıfır
satışlı) · `kanalCeliskisi` **8** (etiket TY, numara HB deseni — yanlış
kanal kesinti kurallarını değiştirir, NET sessizce yanlış çıkardı).

> ### ⭐ ENVANTER — DERİNLİK ŞERHİ SÖNDÜ
>
>     satış defteri en eski   2026-06-17  →  2024-01-14
>     alım defteri en eski                   2024-05-30
>     kapsanmayan pencerede AÇIK   3115  →  0
>
> Satış defteri artık alım defterinden **derin**; şerhin ölçütü
> sağlanmıyor ve şerh **kendiliğinden söndü** — sabit sayıya
> bağlanmadığı için.
>
> **Envanter: 3595 → 770 adet · ₺2.193.421** (ödenen, KDV dahil).

⛔ **AMA MARJ EKRANI YİNE ÇÖKTÜ: %10,12 → %1,11.** 5190 yeni satış ciroya
girdi, yalnız 2826'sı stok hareketi aldı — gerisinin kârı hesaplanamadı.
Maliyet bağı olanların marjı **%11,12** (o anki kapsam).
Marj şerhi **yanıyor ve doğru sebebi söylüyor**: bağ bekleyen **3810** ·
alım kaydı yok **1452**.

⚠ **BU SATIRDAKİ ÜÇ RAKAM DA AŞILDI** (27.08 kâr tazeleme sonrası):
`%1,11 → %12,08` · `%11,12 → %19,67` · bağ bekleyen `3810 → 691`.

**STOK BAĞI YENİDEN KOŞTU → 0 kalem bağlandı.** Sebep: içe aktarma
FIFO'yu **koşum içinde zaten tüketti** (2826 hareket). Geriye açık parti
kalmadı; 2553 kalem karşılıksız.

**DEFTER AYRIŞMASI:** incelenen 707 · temiz 705 · **SAPAN 2** ·
incelenemeyen 0. **Yeni sapan DOĞMADI**; K54'ün iki hayaleti yerinde.
Ayrı kova (stok bağı kurulmamış) **2502**.

### ⚠ MARJ EKRANI — SEBEP ÜÇE AYRILDI, RAKAM SUSTURULDU (27.08.2026)

**⛔ `[YANLIŞ CEVAP VEREN EKRAN]` etiketi marj için GERİ GELDİ** ve iki iş
yapıldı.

**① ŞERH ÜÇ SATIR:**

| Sebep | Sayı | Ne demek |
|---|---|---|
| (a) bağ bekliyor | **3809** ⚠→691 | alım VAR, henüz bağlanmadı |
| (b) alım kaydı YOK | **1452** ⚠→1441 | o varyantın alımı hiç girilmemiş |
| **(c) DÖNEMİ KAPSAMIYOR** | **1** | satış, alım defteri başlamadan önce |

⚠ **(c) BEKLENENDEN ÇOK KÜÇÜK ÇIKTI — 1 satış.** Yazılan 5778 satışın
yalnız biri `2024-05-30`dan önce. Kova gerekliydi ve doğru çalışıyor, ama
bugünkü açığı açıklayan sebep değil; **açığın %72'si (a)**.
⛔ (c) **kapatılabilir bir açık DEĞİL, tutanaktır** — ekran bunu yazıyor ki
kimse kapatmaya çalışmasın. Ölçüt `min(Purchase.purchasedAt)`, sabit tarih
değil: alım defteri geriye büyürse sayı kendiliğinden düşer.

**② MARJ RAKAMI ARTIK BASILMIYOR.**

    kapsanmayan pay  %90,06   ·   eşik %0,50        ⚠ AŞILDI → %38,59
    ekran            "hesaplanamıyor (5259/5746 satışın maliyeti yok)"
    şerhte           maliyet bağı olanların marjı %11,12  ⚠ AŞILDI → %19,67

⚠ **EŞİK VERİDEN DEĞİL, GÖSTERİM HASSASİYETİNDEN TÜRETİLDİ — ve niye:**
aylık kapsanmayan pay dağılımı ölçüldü (n=27): `22,6 · 30,8 · 87,0 ·
100,0 × 24`, en büyük gedik 56,2 puan (ortası %58,9). **Ama o gedik
_"hangi aylar kapsanıyor"_ sorusunu cevaplıyor**, bizimki _"rakam ne zaman
yanıltır"_. Marj tek ondalıkla yazılıyor; ~%11'lik bir marjda tek ondalık
= göreli **%0,45**. Kapsanmayan pay bunun üstündeyse ekrandaki basamak
zaten yanlış.
⚠ **Komuttaki `%X` gelmedi (mesaj kesilmişti)** — eşik bu yüzden
türetildi. Başka bir değer isteniyorsa tek satır.

⛔ **ÖLÇÜLEN ÇARPIKLIK:** ekran **%1,11**, gerçek **%11,12** — **on kat**.
⚠ _(İkisi de o günün kapsamı; 27.08'de aşıldı → %12,08 ve %19,67.)_
Bir rakamı on kat yanlış basmak, hiç basmamaktan kötüdür.

**BEKÇİ 207 kontrol** · 9 mutasyon kırmızı. Ve **beş ölçüt eskidiği için
kırmızı yandı** (kod doğruydu): gövde üçüncü sebeple büyüyünce blok
penceresi yetmedi, "iki sebep" kontrolleri üçe çıkarıldı.

### 🔬 (a) KOVASI TEŞHİSİ — HİPOTEZ ÇÜRÜDÜ, SEBEP BAŞKA (27.08.2026)

⛔ **ASIL BULGU BENİM KUSURUM: satış aktarımı KÂR MOTORUNU ÇAĞIRMIYORDU.**

    kârı hesaplanmamış içe aktarma satışı      5259
      ⭐ stok hareketi VAR, kârı yok            2757   ← HESAP eksiği
         stok hareketi YOK                     2502   ← VERİ eksiği

Alım tarafındaki `canli:stok-bagi` kârı **zaten tazeliyordu**; satış
aktarımı tazelemiyordu — **iki yol sessizce ayrışmıştı.** Ekran 2757'yi
"bağ bekliyor" diye sayıyordu: sayı doğru, **anlamı yanlıştı.**
✅ `--kar-tazele` eklendi ve koşuyor.

✅ **BEKÇİ ARTIK BU AYRIŞMAYI YAKALIYOR:** _"`SALE_OUT` yazan her betik kâr
tazeleme yolunu taşır"_ — dosya listesi değil DAVRANIŞ ölçütü, yarın
üçüncü yol eklenirse de tutar. 27.08 kusurunun kendisi mutasyonla kırmızı
yandı.

**① DÖNEM — hipotez ÇÜRÜDÜ.** Beklenen "2024 + 2025 ilk yarı ağırlıklı"
değil, **tam tersi**: 2024→57 · 2025→432 · **2026→578**. Yoğunlaşma
**2025-10'dan SONRA** — yani alım defterinin başladığı dönemde.

**② VARYANT BAZINDA:** 201 varyant · adet yetmiyor **63** · tarih sonra
**0** · **ikisi de 137**. Sorduğun ayrımın cevabı: _"tarih sonra" tek
başına HİÇ YOK._

**③ `min(purchasedAt)` YANILTICIYDI — seyrek kuyruk:**

    2024-05    1 alım ·   1 adet    ← tek kayıt, sınırı buraya çekiyordu
    2025-08    2 alım ·   5 adet
    2025-10   55 alım · 162 adet    ← defterin GERÇEK başlangıcı

### ✅ (c) ÖLÇÜTÜ VARYANT BAZLI OLDU — EŞİKSİZ

`min(purchasedAt)` **bırakıldı**; "yoğun ay" eşiği de **kullanılmadı**
(dağılımdan türetilmemiş sayı uydurmadır).

    satış < o VARYANTIN ilk alımı   → (c) KAPSAM DIŞI, kapatılamaz
    satış ≥ ilk alım, parti yok     → (a) ADET AÇIĞI, kapatılabilir
    varyantın hiç alımı yok         → (b) ALIM KAYDI YOK

| Kova | YENİ | ESKİ | fark |
|---|---|---|---|
| (a) adet açığı | **2669** | 3051 | −382 |
| (b) alım kaydı yok | 1443 | 1443 | 0 |
| **(c) KAPSAM DIŞI** | **382** | **0** | **+382** |

⭐ Eski ölçüt **382 kapatılamaz satışı kapatılabilir sanıyordu.**
`axcali2534` artık doğru: ilk satış 2024-11, ilk alım 2026-02 → kapsam dışı.

### 📗 (a) KAPANABİLİRLİK — **kalıcı DEĞİL**

525 varyant · **ilk satış ayına göre neredeyse tamamı 2025-12 ve sonrası**
(2025-12: 89 varyant · 2026-01: 92 · 2026-02: 81). 2025-11 öncesi yalnız
**3 varyant**.

> ⭐ **Eksik alımlar alış dosyasının KAPSADIĞI dönemde** (2025-10+). Yani
> belge bulunabilir — **kalıcı bir açık değil.**

⚠ **ÖLÇÜLMEYEN:** kaç varyantta *toplam alım < toplam satış* olduğu ayrıca
ölçülmedi; "belge bulunabilir" bir DÖNEM tespiti, adet tespiti değil.

### 📐 (a) KOVASI — ADET TESPİTİ (27.08.2026, salt okuma)

**(a) kovası: 446 varyant · 1892 kalem.** Üçe ayrıldı:

| Kova | Varyant | Kalem | Tutar |
|---|---|---|---|
| alım < satış → **BELGE EKSİK** | **188** | 913 | 2.608.868 |
| alım ≥ satış → ⭐ **ADET YETERLİ** | **258** | 979 | **3.605.118** |
| alım = 0 | — | — | (b) kovası |

⭐ **İkinci kova BOŞ DEĞİL** — `axcali2032` tekil bir görünüm değilmiş.

**İKİNCİ KOVANIN SEBEBİ ÖLÇÜLDÜ (240 varyant):**

    stoğa HİÇ girmemiş        0 varyant
    kısmen girmiş             3
    tamamı girmiş           237      ← sipariş = teslim, sorun burada DEĞİL

    açık parti VAR           69
    açık parti YOK (tükenmiş) 171

> ### ✅ VE KALEM DÜZEYİNDE SORU KAPANDI — AÇIKLANAMAYAN YOK
>
>     BAĞSIZ KALEM: 2550
>       açık parti HİÇ YOK                 2550
>       açık parti VAR ama TARİHİ SONRA       0
>       açık parti var, ADET yetmiyor         0
>       ⛔ KURULABİLİRDİ (açıklanamayan)      0
>
> **Her bağsız kalemin açık partisi sıfır.** "Parti yanlış dağıtıldı"
> iddiası **kurulamadı** — desen yok, tek vaka da yok.

⚠ **VARYANT DÜZEYİNDEKİ 69 İLE KALEM DÜZEYİNDEKİ 0 ÇELİŞMİYOR:** o 69
varyantın açık partisi var ama kârı bekleyen kalemleri **hareket almış**
durumda (kâr tazeleme kuyruğunda). Gerçekten bağsız olanların hiçbirinde
parti yok.

**`axcali2032` DÖKÜMÜ — FIFO doğru çalışıyor:** 5 alım (+6, +5, +5, +7,
+5), 22 satış çıkışı, **0 bağsız kalem**, ledger bakiye 9. Sipariş
`11303193632` 7 adet ve **iki partiye bölünmüş** (`8sqwp1xx` × 4 +
`3qtmm27x` × 3) — dağıtım beklendiği gibi.

### ✅ KÂR TAZELEME KOŞTU — 2757/2757 (27.08.2026)

`AuditLog: SATIS_ICE_AKTARMA_KAR` · hata 0.

| | önce | sonra | **KAPSAM (sonra)** |
|---|---|---|---|
| genel marj | %1,11 | **%12,08** | 5746 satış |
| maliyet bağı olanların | %11,12 | **%19,67** | **3244 satış** |
| kapsanmayan pay | %90,06 | **%38,59** | 2502 / 5746 |
| kârı hesaplanmış satış | 342 | **3099** | — |

⚠ **KAPSAM SÜTUNU BOŞUNA DEĞİL:** `%11,12` ile `%19,67` aynı şeyin iki
ölçümü DEĞİL — **iki farklı kümenin** marjı. Kapsam yazılmasaydı ikisi
çelişiyor sanılırdı.

⛔ **RAKAM HÂLÂ BASILMIYOR** — kapsanmayan pay **%38,59**, eşik **%0,50**.
Ekran: _"hesaplanamıyor (2502/5746 satışın maliyeti yok)"_.

⚠ **VE MALİYET BAĞI OLANLARIN MARJI DA DEĞİŞTİ: %11,12 → %19,67.** Kapsam
değişince payda değişti; **iki rakam da aynı anda hareket etti** ve bu
beklenen bir şey — ama _"gerçek marj %11,12"_ diye kaydedilmiş bir cümle
varsa **artık geçersiz**, geçerli olan **%19,67**.

**ÜÇ KOVA:** (a) **691** _(önce 3809)_ · (b) **1441** · (c) **370**.
(a)'daki büyük düşüş kâr tazelemenin kendisi — o satışların bağı zaten
vardı.

### 📗 BELGE EKSİK LİSTESİ — HALİL İÇİN ÇALIŞMA DOSYASI

`npm run canli:belge-eksik -- --excel="…"` · **salt okuma**.

**188 varyant · 700 kalem · açık fark 984 adet · ₺1.971.340**

    ilk  10 varyant → %20,9      ilk  60 → %65,6
    ilk  30 varyant → %43,8      ilk 100 → %84,0

⚠ **DAĞINIK: %84'ü kapatmak 100 ayrı ürünün belgesini ister.** En büyük
kalem `KUC-AN-260812-01` (Anker Motion Boom): alım 7, satış 21, **açık 14
adet, ₺61.667**.

📄 **Dosya: `C:/Users/yapra/Downloads/belge-eksik-varyantlar.csv`**
_(CSV — Excel doğrudan açar; `;` ayraç + BOM, Türkçe karakterler için.)_

⛔ **LİSTEYE KAPSAM DIŞI VE ALIMI HİÇ OLMAYAN VARYANT GİRMEDİ** — onlar
belge aramakla kapanmaz. Bekçi bu üç elemeyi ayrı ayrı sınıyor; biri
düşerse Halil bulunamayacak bir belgenin peşine giderdi.

⏭ **AÇIK KALAN — 2502 satış, üç ayrı iş:**
· **370 kapsam dışı** → ⛔ KAPANMAZ, kalıcı şerh
· **188 varyant / ₺1,97M** → belge aranabilir _(liste hazır)_
· **1441 alım kaydı yok** → o ürünlerin alımı hiç girilmemiş

⚠ **EKRANDA GÖRÜNÜYOR ve sebebi AYRI yazıyor** — marj şerhi iki satır:
_"N satış maliyet bağı bekliyor"_ ile _"M satış: ALIM KAYDI YOK"_ tek cümleye
karışmıyor, çünkü **çözümün yeri farklı.**

### ⛔ ANAHTAR — YALNIZ-OKUMA ANAHTARI **BULUNAMADI** (26.08.2026)

Resmî dokümantasyon (`developers.trendyol.com/docs/2-authorization`) okundu:
**çoklu anahtar · kapsamlı (scoped) anahtar · salt-okuma anahtarı · rotasyon
· iptal · yeniden üretme — HİÇBİRİ GEÇMİYOR.** Doküman yalnız "Hesap
Bilgilerim → Entegrasyon Bilgileri"nden alınacağını söylüyor.

⚠ **VE BU "YOK" DEMEK DEĞİL — "DOKÜMANDA YOK" DEMEK.** Panelde bir
yenileme düğmesi olabilir; dokümantasyon onu yazmıyor. _(Anayasa: "yokluk
iddiası da iddiadır".)_

⏭ **HALİL ÖLÇECEK — tek soru:** partner.trendyol.com → Mağaza → Hesap
Bilgilerim → Entegrasyon Bilgileri sayfasında **"yenile / sıfırla / yeni
anahtar üret"** benzeri bir düğme var mı? Ekran görüntüsü yeterli.
· **VARSA** → rotasyon yolu belgelenir, sonra Vercel'e taşınır.
· **YOKSA** → taşıma bir KARARDIR: sızma hâlinde anahtarı iptal etmenin tek
yolu Trendyol desteğidir ve süresi bilinmiyor.

### 📊 ÜÇ ÖLÇÜM — SAYIM ÖNCESİ TABAN (27.08.2026, salt okuma)

**① KAYNAK KIRILIMI — ilk kez alındı**

| SATIŞ (iptalsiz) | Kayıt | Adet | Tutar | Aralık | Kârlı |
|---|---|---|---|---|---|
| aktarım: satis-excel | 5190 | 5310 | 15.072.024 | 2024-01→2026-08 | %53,1 |
| aktarım: TY API | 411 | 418 | 1.348.454 | 2026-06→2026-08 | %83,2 |
| **ELLE GİRİLEN** | 145 | 148 | 499.561 | 2026-06→2026-08 | **%100,0** |

| ALIM | Kayıt | Adet | Tutar | Aralık |
|---|---|---|---|---|
| aktarım: alis-excel | 1569 | 3251 | 7.759.477 | 2025-10→2026-08 |
| ELLE GİRİLEN | 386 | 899 | 2.169.011 | 2024-05→2026-08 |

> ### ✅ ELLE GİRİLENLERDE AÇIK YOK
>
> | Kaynak | (a) | (b) | (c) | Toplam |
> |---|---|---|---|---|
> | satis-excel | 662 | 1401 | 370 | **2433** |
> | TY API | 29 | 40 | 0 | **69** |
> | **ELLE** | **0** | **0** | **0** | **0** |
>
> **Giriş disiplini bulgusu YOK** — açığın tamamı aktarımdan geliyor.

**ENVANTER 770 ADEDİN KAYNAĞI:** elle **458** (₺1.213.040) · alis-excel
**306** (₺957.107) · ⛔ alıma bağlı değil **6** (₺23.274).

---

**② 188 VARYANTIN BOŞLUK TARİHİ**

Boşluk **2025-10-26 → 2026-08-26**, tepe **2026-01 (115 kalem)**.
Alım tarihleri: **150 varyantta alım YALNIZ satıştan önce** · 22'sinde
arada da var · 16'sında kısmen sonra.

⛔ **ÇAPRAZ CEVABI: ÇAKIŞIYOR.** Boşluğun her ayında alım defteri
**yoğun** (2026-01: 115 boşluk kalemi ↔ 515 alım adedi). Yani **dosya o
dönemi kapsıyor ama BU ürünleri kapsamıyor** — sebep dosya kapsamı değil.

⛔ **(d) BARKODSUZ SATIRLAR BOŞLUĞU AÇIKLAMIYOR:** 155 barkodsuz alış
satırından 188 varyantla **TAM eşleşen 2**, yakın **4**, eşleşmeyen
**182**. Belge aramaya gerek var.

---

**③ TERS YÖN — alım var, satış yok**

**202 varyant · 770 adet · ₺2.193.421**

⛔ **HİÇ SATIŞI OLMAYAN: 81 varyant · 299 adet · ₺930.766**
**80'inin kanal SKU'su VAR** — yani ürünler fiilen satışta.

⚠ **HÜKÜM YOK — İKİ OKUMA DA MÜMKÜN ve ölçüm ikisini AYIRAMAZ:**
satışı deftere girilmemiş olabilir **ya da** gerçekten satılmamış stok.
**Ayrımı yalnız FİZİKSEL SAYIM kurar.**

⚠ **BEKLEME SÜRESİ TEK BAŞINA AYIRT ETMİYOR:** `axcali1610` 3 gün
beklemiş ve hiç satışı yok (normal), `axcali1834` 178 gün beklemiş ve hiç
satışı yok (şüpheli) — ama `OYU-LG-598P-01` 1 gün beklemiş, satışı VAR ve
37 adet açık. Üç desen de aynı listede.

**Açık partilerin alım ayı:** 2026-06 (₺424.246) · 2026-07 (₺428.781) ·
2026-08 (₺251.714) — **yeni alım ağırlıklı, bu normal stok görüntüsü.**
Eski uçta 2025-03'te 1 varyant / 1 adet.

📄 **SAYIM ADAY LİSTESİ: `C:/Users/yapra/Downloads/sayim-adaylari.csv`**
202 satır · tutara göre sıralı · SKU · ürün · açık adet · ödenen · en
eski/yeni parti · son satış · bekleme günü · kanal SKU sayısı.

### 🔬 K57 — FİZİKSEL SAYIM · [MIGRATION CANLIDA BEKLİYOR] (27.08.2026)

**Tasarım turu onaylandı** (iki tablo · kapsam 202 varyantın tamamı).
Migration `20260827061946_stok_sayimi` **yerelde koştu, canlıda KOŞMADI** —
canlı veritabanına erişim yok (bkz. K59). `deploy:bekci` bu yüzden bilerek
kırmızı; şema commit'i **push EDİLMEZ** (`8cb0023` vakası).

    ALTER StockMovement +sayimSatiriId · CREATE StokSayimi · CREATE StokSayimSatiri
    2 CreateTable · 1 AlterTable · 1 CreateIndex · 4 AddForeignKey · 0 yıkıcı ifade

**Saf gövde YAZILDI ve bekçisi koşuyor** — `src/lib/sayim/`
(`kova` · `ozet` · `oturum` · `karar`), veritabanına hiç dokunmuyor.

| Bekçi | Sonuç |
|---|---|
| `sayim:dogrula` | ✅ **62 ölçüt** · değer testi, kaynak taraması YOK |
| `sayim:mutasyon` | ✅ **15/15 yakalandı** (− kaldıran 7 · + fazladan 8) · 40 sn |

⚠ **HARNESS BİR KÖR NOKTA BULDU VE BEKÇİ DÜZELTİLDİ** (mutasyon silinmedi):
`sayilmadi` sayacının kapsam kapısını (`if (g.kapsamdaydi)`) silen mutasyon
**yeşil geçti** — çünkü test verisinde kapsam DIŞI + SAYILMAMIŞ satır yoktu.
Ayrımın iki yakasını gösteren satır eklendi, mutasyon kırmızıya döndü.
_Ölçüt doğruydu, ÖRNEK VERİ kördü — "örnek veri ayrımın iki yakasını
göstermeli" kuralının dokuzuncu vakası._

⚠ **`yedek:dogrula` da kırmızı yandı ve haklıydı:** iki yeni tablo yedek
listesinde yoktu. Eklendi — ve **stok defterinden ÖNCEye**, çünkü
`StockMovement.sayimSatiriId` sayım satırına bakıyor; ters sırada geri
yükleme yabancı anahtar hatası verirdi.

**Kalan (migration canlıya inince):** `/okut` ikinci kipi + açılış
hatırlatması · kapanış ekranı (fazla/eksik ayrı, belge yolu üstte, yazınca
kilit) · Halil test listesi.

✅ **`sayim-mutasyon:kontrol` TURA GİRDİ** (kullanıcı kararı 27.08.2026):
_"mutasyon turu koşmuyorsa bekçinin bekçisi yoktur."_

⚠ **İKİ DÜZELTME — ikisi de benim hatam, sessizce geçilmiyor:**

**① ÖNERDİĞİM AD TURA GİRMİYORDU.** `sayim:mutasyon-kontrol` dedim; seçici
`ad.endsWith(":kontrol")` arıyor ve o ad `-kontrol` ile bitiyor. Tur 52
bekçiyle koştu, mutasyon **hiç çalışmadı** ve fark ancak koşum listesinde
görüldü. Doğru ad **`sayim-mutasyon:kontrol`** (`migration:kontrol` deseni).
_"Kural doğru mu değil, teslim edilebilir mi" — ad bir SÖZDÜ, seçici onu
tanımıyordu._

**② BEYAN ETTİĞİM BEDEL AŞILDI.** Ölçüldü:

    tahminim   +40 sn  →  tur ~140 sn      (tek başına koşum: 40 sn)
    GERÇEK     +89 sn  →  tur  189 sn      (tur içinde adım: 52,9 sn)

Fark, harness'in **15 alt süreç** açmasından: `bekci.ts` bekçileri
**SIRAYLA** koşuyor (`for (const ad of liste)`, paralel yok), ama harness'in
kendi alt süreçleri makineyi doldurup öteki adımları da yavaşlatıyor.
Karar aynı yönde kalıyor — ama tahmini bilen biri için kaynaksız bir sayı
doğmasın.

⚠ **AÇIK KALEM (kullanıcı şartı): süre büyürse çözüm mutasyonu ÇIKARMAK
DEĞİL**, paralel koşum ya da önbellek ölçmek. `bekci.ts` bugün tamamen
sırayla koşuyor — ölçülecek ilk yer orası.

### 🆕 K58 — ENUM SIRA AYRIŞMASI · ŞEMA ↔ VERİTABANI (27.08.2026)

`ReturnReason` şemada ile veritabanında **AYNI 14 DEĞERİ FARKLI SIRAYLA**
taşıyordu: `YANLIS_URUN` veritabanında 6., şemada 13. sıradaydı. Ayrışma
**23.08'den beri** vardı.

MySQL'de ENUM **sıralıdır** (değerler içeride sıra numarasıyla saklanır), o
yüzden Prisma bunu bir kusur sayıyor ve **her yeni migration'a kendiliğinden
yamıyordu**: K57'nin sayım migration'ına

    ALTER TABLE `returnnotice` MODIFY `reason` ENUM(...) NOT NULL;

satırı böyle girdi. Yani adı `stok_sayimi` olan bir paket, canlıda **veri
taşıyan** bir kolonu yeniden sıralayacaktı.

✅ **ÇÖZÜM: ALTER YAZILMADI, GEREKSİZ KILINDI.** Şemanın sırası
veritabanınınkine uyduruldu (değer kümesi zaten aynıydı) → migration'da
`returnnotice` geçen satır **0**, canlıda hiçbir ALTER koşmayacak, hiçbir
veri değişmedi. Enum'un yanına niye o sırada olduğu yazıldı; sona taşınırsa
aynı kaçak geri gelir.

⛔ **AÇIK KALEM — `deploy:bekci` KATMAN A ENUM DEĞER SIRASINA BAKMIYOR.**
_"Şemadaki her alanın migration'ı var"_ diyor ve ALANLARI sayıyor; enum
değerlerinin sırasını (hatta kümesini) hiç ölçmüyor. Ayrışma **4 gün boyunca
yeşil yandı** ve ancak alakasız bir migration üretilirken göründü.
**Açılış şartı yok — bu doğrudan iştir:** katman A enum kümesi + sırası
karşılaştırmasıyla genişletilir, ve genişletme **iki yönlü mutasyonla**
sınanır (sıra bozan · değer ekleyen).

### 🆕 K59 — CANLI VERİTABANINA ERİŞİM YOK · **HALİL'DE** (27.08.2026)

Sebep **ölçüldü ve daraltıldı — KAS'ta değil, AĞDA:**

| Hedef | Sonuç |
|---|---|
| `w0216a46.kasserver.com:3306` | `ECONNREFUSED` (~2 sn sonra) |
| `github.com:443` · `example.com:80` | **AÇIK** (15–32 ms) |
| `8.8.8.8:53` · `1.1.1.1:53` · `github.com:22` | `ECONNREFUSED` |
| `127.0.0.1:3306` (yerel) | AÇIK (1 ms) |

**8.8.8.8:53 kapalı olamaz** — yani reddeden karşı taraf değil, **çıkış
yolu**. Dışarı yalnız **80/443** açık.

    Bağlanılan ağ:  SSID "i-Punkt HOTSPOT" · şifresiz (Offen) · 192.168.179.6
    Çıkış IP:       109.250.119.195      DNS: 192.168.179.1

⛔ **AÇIK BİR HOTSPOT'A BAĞLANILMIŞ** ve o hotspot yalnız web'e izin veriyor.
Kum havuzu dışında da aynı sonuç — yani araç kısıtı değil, ağın kendisi.
Canlı SİTE çalışıyor (`/giris` 200), Selliora'da bir arıza YOK.

**Halil'in yapacağı:** kendi WiFi'ına (ya da telefon hotspot'una) geç →
`npm run canli:migrate` tek komutla biter. **KAS panelinde değişiklik
GEREKMİYOR** — ilk teşhisim IP izin listesini işaret ediyordu, ölçüm onu
çürüttü.

### 🚨 K60 — GÖREV KUTUSU: "5192 KARGOYA VERİLMEMİŞ" · **[YANLIŞ CEVAP VEREN EKRAN]** (27.08.2026)

Panel _"Bugün ne göndermeliyim"_ **5192 bekleyen** · **0 paketlendi** diyor.
Rakam gerçek bir iş DEĞİL: K56'nın içe aktardığı geçmiş satışlar.

**MEKANİZMA — koddan okundu, kesin:**

    panel.ts:314   if (kargo.kargoTarihi === null) → bekleyen++
                   "DÖNEM KONTROLÜ YOK: bekleyen zamansızdır"

    canli-satis-ice-aktar.ts:401  sale.create({ code, channelAccountId,
                                   soldAt, importBatch, importKaynak, items })
                                   ⛔ shippedAt YAZILMIYOR
    canli-ty-ice-aktar.ts:379     shipmentCode YAZIYOR, shippedAt YAZMIYOR

⛔ **VE KAYNAK DOSYADA KARGO TARİHİ YOK** (ölçüldü — `satis.xlsx` · SATIŞ
sayfası · 31 kolon): `Tarih` var, kargo/teslim tarihi kolonu **hiç yok**.
Yani geri doldurulacak bir veri de yok.

**KÖK SEBEP — `shippedAt = null` İKİ AYRI ŞEY DEMEK:**

| null'ın anlamı | Doğru davranış |
|---|---|
| elle girilen satış, **henüz kargolanmadı** | ✅ GÖREV |
| içe aktarılan satış, **sistem hiç bilmiyor** | ⛔ görev DEĞİL — KAYIT |

Panel kuralı _"bekleyen zamansızdır"_ **doğruydu**: her satış kendi günü
girildiğinde null yalnız birinci anlamı taşıyordu. 14 aylık geçmiş deftere
girince ikinci anlam doğdu ve kural kendi kapsamının dışına taştı.
_(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_

⚠ **VE KUTU ARTIK KAPANAMAZ.** Halil aylar önce teslim edilmiş 5192 siparişi
kargolayamaz. K49: _"görev kutusundaki her madde kapatılabilir olmalıdır;
kapatılamayan madde kutunun TAMAMINA olan güveni eritir."_ "0 paketlendi"
ilerleme satırı da bu yüzden sonsuza kadar 0.

**ÖNERİ — ÜÇ KOVA, hepsi elimizdeki veriden (yeni alan YOK, uydurma YOK):**

| Koşul | Sonuç |
|---|---|
| `importKaynak = null` + `shippedAt = null` | **GÖREV** (bugünkü davranış korunur) |
| içe aktarılmış + `shipmentCode` DOLU | kargo numarası var → çıkmış → görev değil |
| içe aktarılmış + `shipmentCode` BOŞ | **BİLİNMİYOR** → görev değil, **tutanakta sayılır** |

⛔ **`shippedAt` GERİ DOLDURULMAZ.** Ne dosyada ne API'de kargo tarihi var;
bir tarih uydurmak ledger'a sahte bir olay yazmak olurdu.
_(Anayasa: "kolon başlığı bir iddiadır — vekil alan gösterilmez".)_

⚠ **VE KAYBOLMAZ:** üçüncü kova ekranda **yazar** — _"N içe aktarılmış
siparişin kargo bilgisi sistemde yok; bu sayım onları kapsamıyor."_

⚠ **`panel:dogrula` KIRMIZI YANACAK ve HAKLI OLMAYACAK:** `panel-dogrula.ts:898`
_"bekleyen 3 — BUGÜN penceresinde"_ tam da bugünkü (yanlışa dönmüş) davranışı
sabitliyor. Ölçüt ESKİDİ; susturulmaz, **kapsamına bağlanır** ve niye
değiştiği yazılır.

**KARDEŞ SATIR — aynı kutuda "5259 Kârı hesaplanamayan satış".** Aynı
aileden ama **aynı şey değil:** o kova K55/K56 ile **kapanabilir** (bağ
bekleyen 691 · alım kaydı yok 1441) ve marj şerhi sebebini üçe ayırıp zaten
söylüyor. Dokunulmadı — kapanabilir bir açık görev kutusunda kalabilir.

⛔ **SAYILARIN BİLEŞİMİ ÖLÇÜLMEDİ** (5192'nin kaçı excel, kaçı TY API,
kaçında `shipmentCode` var): canlı veritabanına erişim yok (K59). Mekanizma
koddan **kesin**, dağılım ölçülünce yazılacak.

### 🚦 K60-② UYDURMA KARGO TARİHİ — KURU KOŞUM KOŞTU, **YAZIM ONAY BEKLİYOR** (27.08.2026)

`npm run canli:kargo-geri-al` (salt okuma). **Hiçbir şey yazılmadı.**

    ① o iki günde kargo tarihi taşıyan satış      5613   ← tahmin 5613, TUTTU
       içe aktarılmış (etkilenir)                 5601
       ELLE GİRİLMİŞ (dokunulmaz)                   12

    ② kaynak:  satis-excel  5190   (27.08: 5190)
               enumerasyon   411   (26.08: 410 · 27.08: 1)

    ③ elle girilenler, YERİNDE KALIR:  26.08 → 11  ·  27.08 → 1

⚠ **TAHMİNİM TUTMADI, DÜZELTİLİYOR:** elle girilenler için `26.08 → 13,
27.08 → 0` demiştim; gerçek **11 ve 1**. Küçük fark ama rakamı bilen biri
için kaynaksız bir sayı doğmasın.

**④ RİSK ÖLÇÜMÜ — VE ÖLÇÜT DEĞİŞTİRİLDİ.** İstenen ölçüt _"shipmentCode dolu
olanlar hariç"_ idi. **Mekanizma niyeti karşılamıyor:** TY içe aktarması
`shipmentCode`u HER siparişe yazıyor, yani o alanın dolu olması _"26/27.08'de
kargolandı"_ demek değil. Ona göre hariç tutmak **409 satırda uydurma tarihi
KORUMAK** olurdu.

Gerçek ayırt edici **`updatedAt` yığılması** — toplu tık binlerce satırı
saniyeler içinde günceller:

    2026-08-27, 09:55    5191 satır   %92,7   ← TEK DAKİKADA. Toplu tık, tartışmasız.
    2026-08-26, 22:39–43   260 satır          ← o günün tıkları
    2026-08-26, 18:19       74 · 15:30  68
    2026-08-26, 19:20–21     2 satır          ← DAĞINIK, hariç tutuluyor

    GERİ ALINACAK   5599      (5601 − 2 dağınık)
    iptalli hedef      0
    shipmentCode: var 409 · yok 5190   (ölçüldü, ölçüt DEĞİL)

⚠ **KURU KOŞUMUN KENDİ KUSURU DA BULUNDU VE DÜZELTİLDİ:** "dakika" kovası
`slice(0, 16)` ile kesiliyordu ve dakikanın son hanesi düşüyordu — kova
aslında **10 DAKİKALIKTI**. Sayılar makul göründüğü için fark edilmesi zordu;
etiket "dakika" diyordu, ölçtüğü başkaydı. `slice(0, 17)` ile düzeltildi ve
tablo yeniden üretildi.

**⛔ YAZIM İÇİN ONAY BEKLİYOR** — ölçütü DEĞİŞTİRDİĞİM için kendiliğinden
koşmadım. Komut: `npm run canli:kargo-geri-al -- --yaz` (tek toplu `AuditLog`
kaydı, gerekçesiyle).

### ✅ K60-② GERİ ALMA — KOŞTU (27.08.2026)

    önce  5601   →   sonra  2      (etkilenen 5599)
    ikinci koşum:  GERİ ALINACAK 0        ← idempotent

**Elle girilen 12'ye DOKUNULMADI** — teyit: 26.08 → 11 · 27.08 → 1, ikinci
koşumda aynı. Hariç tutulan 2 dağınık damgalı satır da yerinde.

`AuditLog: KARGO_TARIHI_GERI_ALINDI` — gerekçe · ölçüt · hariç tutulanlar ·
öncesi/sonrası/etkilenen, hepsi kayıtta.

**PANELİN GÖRECEĞİ (K60 gövdesiyle canlı veri üzerinde hesaplandı):**

| Kova | Adet |
|---|---|
| **GÖREV** (kargoya verilmemiş) | **0** |
| ÇIKMIŞ | 556 |
| **BİLİNMİYOR** (ekranda şerh) | **5190** |

Günlük grafik: 26.08 **421 → 13** · 27.08 **5192 → 1**. Sahte gün silindi.

⛔ **AMA K60 KODU CANLIDA DEĞİL — VE BU BİR AÇIK PENCERE.** Geri alma canlı
VERİYİ düzeltti; üç kovayı uygulayan KOD hâlâ commit'siz. Bugünkü canlı
panel eski kuralla sayıyor, yani görev kutusu şimdi **~5599 bekleyen**
gösteriyor.

⚠ **VE DÜĞME KAPISI DA CANLIDA DEĞİL:** aynı toplu düğme bugün yine
tıklanırsa aynı hasar tekrarlanır. `.githooks/pre-push` → `deploy:bekci`
migration canlıda koşmadığı için push'u durduruyor, yani K60 ekranı
**migration'dan önce canlıya çıkamaz.**

**Halil'e:** _"Kargoya verildi olarak işaretle"_ düğmesine migration + deploy
tamamlanana kadar **BASMAYIN.**

### ✅ K60-③ DÜĞME KAPISI — KURULDU (27.08.2026)

Aynı turda, tekrar olmasın diye.

| Katman | Ne yapıldı |
|---|---|
| **Sunucu** | `updateMany` koşuluna `importKaynak: null` — içe aktarılmış sipariş toplu işaretlenemez |
| **Ekran** | düğmeye giden küme aynı süzgeci uyguluyor (düğmedeki sayı = işlenecek sayı) |
| **Onay metni** | artık SOMUT: _"{sayi} sipariş için KARGO TARİHİ olarak {tarih} yazılacak. ⛔ Bu tarih gerçek kargo tarihi değilse veri bozulur."_ |
| **Elenen küme** | sessizce elenmiyor: _"⛔ İçe aktarılmış N sipariş bu kümede YOK: sistem onların gerçek kargo tarihini bilmiyor…"_ |

⚠ **Tarih İSTANBUL gününden kuruluyor** — çıplak yerel tarih, Almanya'da gece
yarısından sonra sunucunun yazacağından FARKLI gün gösterirdi.
⚠ **Tek tek işaretleme AÇIK kaldı:** orada kullanıcı tarihi KENDİSİ giriyor,
yani bir kaynağı var.

**Bekçiler:** `toplu-kargo:dogrula` **14 ölçüt** · `toplu-kargo-mutasyon:kontrol`
**9/9 mutasyon** (− kaldıran 6 · + fazladan 3).

⚠ **HARNESS ÜÇÜNCÜ KAPISI İŞE YARADI — ÜÇ MUTASYON "YEŞİL" GÖRÜNECEKTİ.**
`src/app/satislar/actions.ts` **CRLF**, öteki dosyalar LF; çok satırlı
desenler `
` arıyordu ve o dosyada **0 kez** eşleşti. Harness bunu
"yakalandı" saymadı, **HARNESS HATASI** dedi. Çare desen yamamak değil
**okuma/eşleşme kapısı** oldu (`desenNormalle`) — yoksa yarın eklenen
dördüncü desen aynı tuzağa düşerdi.

⚠ **Sayfalama hâlâ YOK** (`/satislar` bütün defteri çekiyor) — ayrı kalem,
bu turda kapsam dışı.

### ⛔ K60-④ DÜZELTME BEŞ OKUYUCUYA ULAŞMAMIŞTI (27.08.2026)

**Kullanıcı buldu, bekçi değil:** geri alma koştu, K60 kodu yazıldı, ekran
düzeltilmiş görünüyordu — **görev kutusu hâlâ 5599 gösteriyordu.**

Sebep: aynı soruyu **ALTI** yer soruyor, ben **birini** düzeltmişim.

    ✓ panel.ts                     ← düzeltilmişti (pazaryeri kartı)
    ✗ panel/gorev-verisi.ts (×2)   ← GÖREV KUTUSU · ekrandaki rakam
    ✗ liste-suzgeci.ts             ← rakama tıklayınca açılan liste
    ✗ paketle/actions.ts           ← paketleme ekranı
    ✗ okut/actions.ts (×2)         ← barkod okuma akışı

**ÇARE — TEK GÖVDE + DESEN YASAĞI:** `src/lib/kargo-bekleyen.ts` açıldı, altı
okuyucu oradan besleniyor. Bekçi **dosya listesi TUTMUYOR**; çıplak
`shippedAt: null` yazmayı yasaklıyor — yarın eklenen yedinci ekran da
yakalanır. Üç istisna gerekçesiyle beyan edildi.

`kargo-bekleyen:dogrula` **14 ölçüt · 6/6 mutasyon**, sonuncusu belirleyici:
**hiçbir listeye eklenmemiş YENİ bir dosya** çıplak koşul yazınca kırmızı
yandı.

⚠ **İKİ BEKÇİ KIRMIZI YANDI VE HAKLI OLMADILAR** — `paketleme:dogrula` ve
`panel:dogrula` çıplak metni arıyordu. **Susturulmadılar**, `KARGO_BEKLEYEN`e
bağlandılar, niye eskidikleri koda yazıldı ve **dişleri mutasyonla sınandı**
(ikisi de kırmızı yandı). `paketleme`nin eski gerekçesi (_"sabite saklanmış
süzgeci bekçi göremez"_) `iptalTarihi` için HÂLÂ geçerli ve o koşul çağrı
yerinde bırakıldı.

### ✅ K57 MIGRATION CANLIDA KOŞTU (27.08.2026)

    39 migration · damga 2026-08-27 · deploy:bekci YEŞİL
    45 tablo · 501 kolon canlıda doğrulandı

**DÖRT SAYIM:**

    StokSayimi            0    ✓
    StokSayimSatiri       0    ✓
    StockMovement      5336
    sayimSatiriId dolu    0    ✓ geri doldurma YOK

⚠ **`StockMovement` İÇİN "DEĞİŞMEDİ" DİYEMEM — ölçüm penceresi kaçtı.**
Migration'dan hemen ÖNCE sayım almadım; elimdeki taban bu sabah 02:00'daki
`5331`. Fark **+5** ve ölçüldü: **beşi de `PURCHASE_IN`, bugün yazılmış** —
yani Halil'in gün içi alım girişi, migration değil (migration hiçbir hareket
yazmaz; migration anından sonra doğan 3 hareketin hepsi de alım). Doğru
cümle _"değişmedi"_ değil, **"migration hareket yazmadı, fark gün içi
giriştir."**

### ✅ K61 — YAVAŞLIK: SAYFALAMA + TOPLAMLAR VERİTABANINA (27.08.2026)

**Kullanıcı düzeltmesi çerçeveyi değiştirdi:** _"Milyonlarca data ile çalışan
ERP'ler var."_ Haklı — 5778 satır AZ bir veri. İlk çerçevem ("veri büyüdü")
tetiği anlatıyordu, kusuru değil.

**AYIRT EDİCİ ÖLÇÜM — ağ tabanı çıkarılmış:**

    SELECT 1 (saf gidiş-dönüş)                  29 ms   ← taban
    sale.count() — 5778 satır                   30 ms   →   1 ms iş
    50 satış, sığ seçim                         32 ms   →   3 ms iş
    50 satış + kalemleri                        94 ms   →  65 ms iş
    TÜM defter + derin include                1600 ms   → 1571 ms iş
    aggregate: NET-2 / adet                  57 / 58 ms

**Veritabanı 5778 satırı 1 ms'de sayıyor.** `Sale_soldAt_idx` planı
`type=index · rows=50 · Using index` — bu sorgu MİLYONLARCA satırda da 50
satır maliyetinde çalışır. Yavaş olan veri değil, **ekranın satır sayısıyla
DOĞRUSAL büyüyen yazılış biçimiydi.**

**ÜÇ KUSUR, hepsi yazım:** ① `/satislar` ve `/alimlar`da sayfalama yok ·
② derin `include` zinciri (satır başına 5+ tablo) · ③ **toplamlar bellekte**
— ekranın defteri komple çekmesinin ASIL sebebi buydu.

⚠ ③ çözülmeden ① yapılsaydı ekran hızlanır, **toplamlar sessizce sayfanın
toplamına düşerdi** (İlke #15). Yavaşlıktan tehlikeli: yanlış rakam.

**SONUÇ — ölçüldü:**

    ÖNCE   sorgu 1609 ms · 5746 satır · 10,1 MB
    SONRA  sorgu  158 ms ·   50 satır ·   91 KB     ← yük 111 KAT küçük
           toplamlar (veritabanı) 200 ms
           ────────────────────────────
           1609 ms  →  358 ms

Toplamlar süzgecin TAMAMINI ölçüyor: `5746 kayıt · ciro ₺16.920.038,27 ·
5876 adet · NET-2 ₺187.008,67 · hesaplanamayan 5259`.

**Yeni gövdeler:** `lib/satis-toplami.ts` · `lib/alim-toplami.ts`.
İptal koşulu **`AND` ile** ekleniyor — spread, kullanıcının kendi `?iptal=1`
süzgecini sessizce ezerdi (17.08.2026 vakası).

**Bekçi:** `sayfalama-toplami:dogrula` **18 ölçüt · 8/8 mutasyon** —
sayfalanmış diziden toplayan her ifade, `take`/`skip` silinmesi, süzgeç
taşımayan çubuk, spread'e dönen gövde: hepsi kırmızı yanıyor.

⚠ **İKİ BEKÇİ DAHA ESKİDİ, SUSTURULMADI:**
· `toplam:dogrula` — `adetToplami(` arıyordu; ölçüt **yer değiştirdi**,
  gevşemedi: adet toplamının ekrana vardığı hâlâ ölçülüyor, kaynağı artık
  veritabanı gövdesi.
· `iptal:bekci` — yeni gövdedeki 6 sorguda süzgeç bir satır YUKARIDA
  (`iptalsiz()`), bekçinin penceresi dışında. **Gerekçesiyle beyan edildi**
  ve süzgecin varlığı `sayfalama-toplami:dogrula` tarafından ayrıca ölçülüyor
  — beyanla geçilmedi.

⛔ **AÇILIŞ ŞARTI YAZILI:** ciro toplamı çarpım gerektirdiği için (`SUM(a*b)`
`_sum`la yapılamaz, `kosul` ham SQL'e çevrilemez) kalemleri okuyor — satır
başına ÜÇ skaler alan, 5898 kalem ≈ 0,2 MB. **~200 bin kalemi geçince**
çözüm `SaleItem.lineTotalAmount` sütunu + `_sum`; bugün eklemek tüketicisi
doğmadan sütun açmak olurdu.

⚠ **KALAN, AÇILMADI:** `/satislar` derin `include` zinciri hâlâ satır başına
5+ tablo çekiyor (50 satırda sorun değil) · panel kargo sorgusu 5600 satışın
bütün kalemlerini ciro için çekiyor, `groupBy`a inebilir · `/satislar`
varsayılan penceresi "tüm zamanlar" — 12.08.2026'da bilinçle böyle bırakıldı
(_"süzgeç eklemek kayıt gizlemek anlamına gelmemeli"_), **dokunulmadı.**

### 🟡 K57 SAYIM EKRANI — ① SAYIM KİPİ KOŞUYOR · ② KAPANIŞ EKRANI KALDI (28.08.2026)

**TESLİM EDİLEN — sayıma BUGÜN başlanabilir:**

| Parça | Durum |
|---|---|
| Şema (2 tablo + bağ) | ✅ canlıda (39 migration) |
| Hesap gövdeleri (`lib/sayim/`) | ✅ `kova · ozet · oturum · karar · okuma` |
| Sunucu eylemleri | ✅ `sayimAc · sayimaOkut · sayimiKapat · okutulmayanlariCevapla` |
| `/okut` sayım kipi | ✅ yapışık sayaç · sürekli kamera · `−`/`+` · wakeLock |
| **Kapanış ekranı** | ⏳ **YOK** — fazla/eksik listesi, belge yolu, düzeltme yazımı |

**ÜÇ ÖLÇÜM YAPILDI, ÜÇÜ DE TASARIMI DEĞİŞTİRDİ:**

    ① kamera HER OKUMADA kapanıyordu (`onOkundu` → `onKapat`)
       768 adet × (getUserMedia + play + odak) ≈ 10–25 dk yalnız açılış
       → `surekli` kipi eklendi; varsayılan KAPALI, öteki ekranlar aynen

    ② tekrar koruması YOKTU — gerekmiyordu da (kamera zaten kapanıyordu)
       açık kalınca sabit barkod SANİYEDE 4 KEZ sayılırdı
       → BOŞ KARE KURALI (eşiksiz), onaylandı

    ③ wakeLock hiç kullanılmıyordu → tam günde telefon uyur, kamera ölür
       → yalnız oturum açıkken tutulur, kapanışta BIRAKILIR

**BEKÇİLER:** `sayim:dogrula` **80 ölçüt** · `sayim-mutasyon:kontrol`
**20/20** · `sayim-ekran:dogrula` **30 ölçüt · 18/18 mutasyon**.

⚠ **BOŞ DİZE ÜÇÜNCÜ HÂL ÇIKTI.** İlk yazımda çözücünün döndürdüğü `""` bir
KOD sayılıyordu: kilit ona geçiyor ve gerçek ürün yeniden sayılıyordu
(`["A","","A"]` → 2, doğrusu 1). Ne ürün ne boş kare — kilit hiç oynatılmaz.
Değer testi yakaladı.

⚠ **PENCERE ÖLÇÜLDÜ, TAHMİN EDİLMEDİ.** `sayim-ekran:dogrula` ilk yazımda
2600 karakterlik pencere kullandı ve bir sonraki fonksiyona taşıp MEŞRU bir
`updateMany`yi "toplu yazım" sanarak yanlış yandı. Gövde ölçüldü: 1740.

⚠ **İKİ ÖLÇÜT DESEN SAYMA KÖRLÜĞÜNE DÜŞTÜ, MUTASYON YAKALADI.**
`Math.max(0,` okuma bloğunda İKİ kez (create + update dalı), `surekli = false`
kamera dosyasında İKİ kez. İkisi de ATAMAYA/SAYIYA bağlandı.

**KALAN (② — kapanış ekranı):** dört sayı + **beşinci ayrı: belirsiz** ·
fazla/eksik AYRI liste · fazlada belge yolu ÜSTTE · düzeltme yazılınca satır
KİLİTLENİR · `stok.duzelt` izni · Halil test listesi kapanış kısmı.

### 🆕 K62-② BEKÇİ BELGELERE GENİŞLETİLDİ — ALTI VAKA DAHA (28.08.2026)

İlk yazımda yalnız `src/` ve `scripts/` taranıyordu. Aynı gün ölçüldü:

    CLAUDE.md         5 backspace   ← İKİSİ tam da BU KURALI anlatan örneğin içinde
    BEKLEYENLER.md    1 backspace

⛔ **KURAL, KENDİ METNİNİ BOZARAK YAZILMIŞTI.** _"Ters bölülü desenler ham
dizeyle kurulur"_ diyen paragraf betikle eklendi ve içindeki kaçışlar yine
backspace'e döndü. Ekranda `/Date/` gibi görünüyordu.

⚠ **BELGE BOZULMASI KODDAN SİNSİ:** derleyici yok, test yok, mutasyon yok —
yalnız okuyan biri **yanlış öğrenir.** Kapsam köke uzatıldı (`CLAUDE.md` ·
`BEKLEYENLER.md` · `ARSIV.md` · `README.md` · `AGENTS.md`), 595 dosya
taranıyor, mutasyonla kırmızı yandığı görüldü.

**Ders yazıldı:** bu tuzak _"dikkat edilerek"_ atlatılmıyor. Aynı oturumda
**üç kez** düşüldü ve üçünü de ölçüm yakaladı, göz değil.

### 🆕 K62 — GÖRÜNMEZ KARAKTER BEKÇİSİ · ÜÇÜNCÜ VAKA BULUNDU (28.08.2026)

Python'un ham OLMAYAN dizesinde ters bölü + `b` yazmak → **0x08 backspace**. Dosyaya düşen
desen ekranda `/Date/` gibi görünür ama hiçbir şeyle eşleşmez → ölçüt
**her zaman yeşil.**

`kontrol-karakteri:dogrula` yazıldı (585 dosya taranıyor, liste tutmuyor) ve
**aylardır duran üçüncü bir vakayı buldu:** `talep-dogrula.ts` →
_"varsayılan KAPALI (open özniteliği yok)"_ ölçütü
`!/<details[^>]*<BS>open<BS>/` idi, yani `!false` = **her koşumda yeşil.**
Onarıldı, mutasyonla dişi olduğu görüldü.

### 🚨 K57-③ CANLI ÇÖKME — GÜNDE İKİNCİ SAYIM (28.08.2026, DÜZELTİLDİ)

Halil "Sayım başlat"a bastı, ekran **`This page couldn't load`** verdi.

**ÖLÇÜM — tahmin edilmedi, canlıdan okundu:**

    sayim-20260827   204 satır
      açılış  13:37:31
      kapanış 13:37:47      ← 16 saniye sonra kapatılmış

**SEBEP:** `kod` şemada `@unique`, `sayimKodu` günde **TEK** kod üretiyor.
Oturum açılıp kapandıktan sonra ikinci "Sayım başlat" **tekillik ihlaliyle**
düştü — ve hata yakalanmadığı için 500 döndü.

⛔ **İKİ AYRI KUSUR, İKİSİ DE DÜZELTİLDİ:**

**① Kod tekilleşmesi.** Çare _"günde bir sayım"_ DEĞİL — aynı gün ikinci
sayım meşrudur (ilki yarım kalmış olabilir, bir raf yeniden sayılabilir).
`bosSayimKodu` boş olanı seçiyor: `sayim-20260827-2`. Rastgele sonek de
tekilliği sağlardı ama kod düzeltme hareketine damgalanıyor ve **insanın
okuyacağı bir iz** — üç ay sonra "bu hangi sayımdı" sorusuna cevap vermeli.

**② Yakalanmamış hata 500 döndürüyordu.** Kullanıcı yalnız _"This page
couldn't load"_ gördü, hiçbir yerde NEDEN yazmadı (İlke #5 ihlali).
`create` artık `try/catch` içinde: mesaj **tam** loglanıyor, ekrana
_"Sayım açılamadı"_ düşüyor.

**Bekçi:** `sayim:dogrula` **85 ölçüt** (5 yeni) · `sayim-mutasyon:kontrol`
**22/22**.

⚠ **HARNESS ÜÇÜNCÜ KAPISI YİNE İŞE YARADI.** İlk mutasyon döngü gövdesini
siliyordu; o hâlde `bosSayimKodu` 99 turdan sonra `throw` ediyor, bekçi
ÇÖKÜYOR ve harness bunu **"yakalandı" saymadı** — çökme, ölçütün ölçtüğünü
kanıtlamaz. Mutasyon değer bozan hâle çevrildi.

⚠ **CANLIDA DURAN KAYIT:** `sayim-20260827` (204 satır, kapalı, hiç okuma
yok, düzeltme yazmamış). Silinebilir — `StockMovement → satır` bağı
`Restrict` olduğu için düzeltme yazmış bir oturum zaten silinemezdi.
**Karar Halil'de**; durması da zararsız (kapanmış bir sayım kaydı).

### ✅ K57-② KAPANIŞ EKRANI — TESLİM (28.08.2026)

**Sayım artık uçtan uca kullanılabilir:** başlat → okut → kapat → **hüküm ver**.

| Parça | Durum |
|---|---|
| `lib/sayim/kapanis-verisi.ts` | ✅ üç ölçüm: sayım günü sonu stoğu · aynı gün hareketi · **hareketsiz satış** |
| `okut/sayim-yazim-actions.ts` | ✅ `COUNT_CORRECTION` · FIFO · damga · sunucu kilidi |
| `okut/sayim-kapanis.tsx` | ✅ beş sayı · fazla/eksik AYRI · belge yolu üstte |
| `docs/sayim-proseduru.md` | ✅ **sürüm 2** — belge ilk kez dosya oldu |

**ÜÇ EK UYGULANDI:**

**① Üçüncü bilgi.** Eksik satırında _"Bu üründe stok hareketi olmayan N satış
kaydı var"_ — N=0 ise satır ÇİZİLMEZ. Ölçüm gerçek: canlıda 2553/5866 satış
kalemi (%43,5) stok hareketi taşımıyor; kapsamdaki 204 varyanttan **1'i** bu
durumda. Risk düşük ama sıfır değil.

**② Dil düzeltildi.** _"maliyet gider yazılır"_ cümlem YANLIŞTI — gider
tablosuna yazılmıyor. Doğru metin: _"Ciroya ve NET-2'ye GİRMEZ, gider
tablosuna YAZILMAZ; GERÇEK NET'ten düşer."_ **Bekçi dil ölçütü taşıyor:**
hiçbir sayım metni "gider yazılır" diyemez.

**③ Asimetri ekranda.** _"Emin değilseniz SAYIM FARKI seçin…"_ — tavsiye
satırı, kapı değil.

**Bekçiler:** `sayim:dogrula` **85** · `sayim-mutasyon:kontrol` **22/22** ·
`sayim-ekran:dogrula` **61 ölçüt · 13/13 mutasyon**.

⚠ **BİR MUTASYON ÖN-EK KÖRLÜĞÜNDEN KAÇTI.** Sıra kontrolü
`indexOf("yolBelgeGirFazla")` yapıyordu; mutasyon anahtarı
`yolBelgeGirFazlaSonra` yapınca `indexOf` onu **yine buldu** (ön ek) ve sıra
aynı konumu ölçüp yeşil kaldı. Desen tam çağrıya bağlandı
(`t("yolBelgeGirFazla")`), mutasyon kırmızıya döndü.

⚠ **BELGE DOSYA OLARAK YOKMUŞ.** _"HTML prosedürü düzeltilecek"_ denince
arandı: `docs/`te sayım belgesi **hiç yoktu** — prosedür şimdiye kadar yalnız
sohbette yaşamıştı. `docs/sayim-proseduru.md` kuruldu ve aşılan sürüm
**sessizce değiştirilmedi**: sürüm 2'nin başında hangi iki cümlenin niye
düzeldiği yazıyor.

⛔ **HENÜZ YOK — ekranda "yakında" yazıyor:** "Satışı gir" ve "Alımı gir"
düğmeleri kapalı. O iki yol mevcut satış/alım formlarına bağlanacak; bugün
kullanıcı ilgili ekrana kendisi gidiyor.

### ✅ K57-④ PROSEDÜR SÜRÜM 3 + BELGE ÜRETECİ (28.08.2026)

**§3.1 eklendi — "Okuttuğunuz kod bulunamazsa".** Gerçek kullanımın ilk
gününde çıktı, belgede yoktu: ① önce ürünü ADIYLA ara ② varsa o üründe kodu
TANIT ③ gerçekten yoksa yeni ürün aç. Dört kod rolü tablosu ve "yeni ürünün
stoğu 0'dır" notu da girdi.

**Bekleyen iki düzeltme sürüm 2'de ZATEN yapılmıştı** — doğrulandı, tekrar
edilmedi: `"alım yap"` ve `"gider yazılır"` yalnız _"ne değişti"_ notlarında
geçiyor, canlı talimat olarak değil.

**ÖLÇÜLDÜ — Halil'in yaptığı doğruydu:**

    mevcut varyanta kod eklendi      9   ← DOĞRU YOL
    yeni kanal SKU                   3
    yeni ürün + varyant açıldı       4
    aynı barkod iki üründe           0   ← çakışma YOK

Açılan 4 ürün tek tek kontrol edildi: ikisi gerçekten yeni, ikisi (LEGO)
benzer seriden ama **farklı setler, barkodlar ayrı.** Dördü de haklı.

### 🆕 K63 — BELGE ÜRETECİ + BAYATLIK BEKÇİSİ (28.08.2026)

⚠ **`docs/iade-sureci.html` ELLE üretilmişti ve üretecin kendisi depoda
YOKTU.** HTML'in başındaki _"Bu dosya ... ÜRETİLDİ"_ uyarısı, gerçekten üreten
bir komut olmadıkça bir İDDİADIR — ve kaynak değişip HTML üretilmezse **yalan**
olur.

`belge:uret` yazıldı (`docs/*.md → docs/*.html`, `iade-sureci.html`in stilini
tek kaynaktan alıyor). ⛔ **Bağımlılık EKLENMEDİ:** depoda markdown kütüphanesi
yok ve bu belgelerin sözdizimi dar/bilinen. Tanınmayan satır **sessizce
yutulmaz**, paragraf olarak çıkar.

`belge:dogrula` — belgeyi yeniden üretip **bayt bayt** karşılaştırıyor.
Mutasyon: `.md`ye tek satır eklendi, bekçi kırmızı yandı ✓

⛔ **VE BEKÇİ KENDİ ARACIMDA KUSUR BULDU:** `belge-uret.ts` ilk yazımda kod
yer tutucusu olarak **0x00 (NUL)** kullanıyordu; `kontrol-karakteri:dogrula`
onu yakaladı. Teknik olarak işe yarardı ama görünmez karakteri kaynağa yazmak
tam da o bekçinin yasakladığı şey — **kural kendi araçlarım için de geçerli.**
Görünür bir işarete çevrildi. Aynı turda ikinci kusur: `new RegExp(... "(\d+)"
...)` — JS dizesinde `\d` sadece `d` oluyordu ve satır içi kod HİÇ
üretilmiyordu; kaçış düzeltildi (11 satır içi kod → 12 `<code>`).

⚠ **KAPSAM DIŞI GEREKÇESİYLE BEYAN EDİLDİ:** `iade-sureci` (üreteçten önce
elle üretildi, bayt bayt eşleşmiyor — açılış şartı: bir kez `belge:uret` ile
üretilmesi) · `el-kitabi` (veritabanından üretiliyor, md kaynağı yok).

### ⏭ SIRADAKİ — VE ONAY KAPISI

**(a) kovası içe aktarmanın kuru koşumunu doğuruyor.** Yazma ancak Halil'in
onayından sonra (kendi çerçevesi: _"içe aktarma başlamadan önce kuru koşum
raporu + onayım"_).
⛔ **ENUMERASYON TAMLIĞI ÖLÇÜLDÜ VE SAĞLANMADI:** çapraz, API dilimlemesinin
bulamadığı **37 sipariş** gösterdi (kanal kimliğiyle süzülmüş hâli; biçim
süzgeciyle 70 çıkıyordu). `123` bir ALT SINIRDIR ve kuru koşum raporunda
sayıyla desteklenerek öyle yazılacak.
✅ **MEKANİZMA ADLANDIRILDI VE TELAFİ YOLU ÖLÇÜLDÜ** — bkz. yukarıdaki
"ENUMERASYON — MEKANİZMA" bölümü. Kuru koşum artık kurulabilir.

### ✅ A3-③ İÇE AKTARMA — KOŞTU (26.08.2026)

**425 satış yazıldı · sayım tuttu (145→570) · ikinci koşum 0.**
Parti `ty-20260826111346` · `AuditLog: TY_SIPARIS_ICE_AKTARMA`.
⛔ **13 sipariş YAZILAMADI** (₺52.842) — 3 barkod kataloğumuzda yok.
⚠ Yazımdan önce üç ölçüm üç hatayı yakaladı: `price` satır toplamı ·
komisyon alanı `commission` · `orderDate` 3 saat kaymış.

<details><summary>kuru koşum raporu (26.08, arşiv)</summary>

### 🚦 A3-③ KURU KOŞUM — RAPOR (26.08.2026)

`npm run canli:ty-kuru-kosum -- --gun=60` · **salt okuma, tek satır yazılmadı**
(`api:dogrula` bunu koşulur hâlde tutuyor: yalnız GET · prisma yazma çağrısı yok).

**KAPSAM:** Trendyol — AXCALI (`externalId 870249`) · `2026-06-27 → 2026-08-26`
(`orderDate`e göre) · 3 günlük 30 dilim · okuma anı `2026-08-26T10:27:47Z`.

| | |
|---|---|
| aday sipariş | **441** · 449 adet · **₺1.549.713,55** |
| ⛔ **YAZILABİLİR** | **428** |
| ⛔ barkodu kataloğumuzda olmayan | **13** — önce ÜRÜN tanımlanmalı |
| durum | Delivered 411 · **Cancelled 28** (₺165.511) · Returned 2 |
| çakışma | defterde 111 kod var → **106 aday atlandı** |
| bölünmüş | 1 sipariş (2 ebeveyn paket elendi) |

**⛔ VARYANT KAPISI EN SERT SINIR:** `SaleItem.variantId` **zorunlu**
(`onDelete: Restrict`). Bu bir tercih değil **şemanın kendisi** — barkodu
bilinmeyen siparişin kalemi yazılamaz. _13 sipariş bu yüzden dışarıda._

**⚠ ÇAPRAZ BU KOŞUMDA `0` DÖNDÜ — VE BU TAMLIK KANITI DEĞİL.** Aynı çapraz
önceki koşumda **37** vermişti. Enumerasyon bu turda o kayıtları yakaladı;
bir sonraki turda yine kaçırabilir. Sıfırı "boşluk yok" diye okumak, en sinsi
yalancı yeşil olurdu — betik bunu **ekrana kendisi yazıyor.**

**⛔ RAPORUN AÇTIĞI TEK ŞEMA KALEMİ** (yazımdan ÖNCE, ayrı migration onayı):

    Sale.importBatch  String?   @@index([importBatch])
    Sale.importKaynak String?   ← 'enumerasyon' | 'hakediş çaprazı'

İkincisi Halil'in kendi ①. şartının gereği: **kaynak raporda değil KAYITTA
durmalı.** Rapor silinir, kayıt kalır.

**KARARLAR — rapor bunları öneriyor, onay bekliyor:**
- **İptaller listeye GİRER**, `iptalTarihi` dolu yazılır. Hiç yazılmasaydı o
  sipariş "hiç olmadı" olurdu ve kargo gideri sahipsiz kalırdı.
- **Çakışmada ATLA, ÜZERİNE YAZMA** — elle girilmiş kayıt üstün (Halil'in
  girdiği kupon düşülmüş tutar API brütünden daha doğru olabilir).
- **`StockMovement` ÜRETİLMEZ.** `SALE_OUT` yazsaydı FIFO'dan mal düşerdi ve
  geri alması ledger'a ters kayıt gerektirirdi. Stok bağı **ayrı ve sonraki**
  bir karar.
- Geri alma **silme değil işaretleme** (`iptalTarihi`).

_(Onay verildi ve yazım koştu — yukarıdaki özete bak.)_

</details>

---

## 📏 PANO KURALI — ORAN SAYISI KAPSAMIYLA YAZILIR

_Kullanıcı kararı 27.08.2026._ Bir marj/oran sayısı panoya girerken
**yanına ölçüldüğü KAPSAM da yazılır** — "kaç satış üstünden".

**Vaka:** _"gerçek marj %11,12"_ panoda **beş ayrı yerde** duruyordu. Kâr
tazeleme koşunca **%19,67** oldu ve eski rakam **çelişki gibi** göründü —
oysa ikisi de doğruydu: biri 487 satışın, öteki 3244 satışın marjı.

> **Kapsam yazılmayan bir oran, kapsam değiştiği an BAYATLAR — ve
> bayatlığı GÖRÜNMEZ olur.** Sayı hâlâ doğru göründüğü için kimse
> sorgulamaz; iki rakam yan yana gelince "hangisi doğru" diye tartışılır,
> oysa soru **"hangi küme"** olmalıdır.

⚠ Aşılan rakam **SİLİNMEZ**, `⚠ AŞILDI → yeni` diye işaretlenir. Elinde
eski rakam olan biri için kaynaksız bir sayı doğmasın.
⚠ **VE AYNI TABLO İKİ YERDEYSE İKİSİ DE İŞARETLENİR** — birini işaretleyip
ötekini bırakmak "hangisi güncel" sorusunu doğurur.
_("Kaynağı yazılmayan sayı kullanılamaz" kuralının oran tarafı.)_

## 📎 KAYIT ÇELİŞKİSİ — 25.08.2026, mimar düzeltmesi

> **Mimar tarafı da bir KAYIT KAYNAĞIDIR — ve pano ile çeliştiğinde
> ÖLÇÜM kazanır.** Bugün *"sıradaki teslim nakit takvimi, üç turdur
> bekliyor"* denildi; pano ise işi **24.08'de kapanmış** gösteriyordu
> (iki ayrı satırda, rakamlarıyla). Tahmin edilmedi, panoya bakıldı,
> çelişki kapandı: **kayıt geçerliydi, hatırlama bayattı.**

⚠ Aynı gün ikinci kez oldu: bugünün planı *"A3-① anahtar girilir
girilmez koş"* diyordu; pano **koştuğunu** yazıyordu. Yeniden koşuldu —
pano haklıydı, üstelik ölçüm tazelenmiş oldu.

**Not (iş değil, hatırlatma):** hakediş partilerinin düzenli yüklenmesi
**nakit ufkunun kendisidir** — tarife rutini (H10♻) gibi bir rutin satırı
hak ediyor. Sırası gelince açılır.

---

## ✅ 25.08.2026 — GÜN İÇİ KAPANANLAR

| İş | Durum |
|---|---|
| **K53 — TARİHLİ ENVANTER DEĞERİ** | ✅ **[KOŞTU]** — `/envanter-degeri?tarih=YYYY-MM-DD`. Kullanıcı tarih seçer, ekran o ana kadarki defteri kurar. 📊 **ÖLÇÜM ① — TÜR × İŞ TARİHİ ALANI:** sorunun varsayımı düzeltildi — **tür başına ayrı alan YOK, tek defter tek alan**: `StockMovement.occurredAt`, `[variantId, occurredAt]` indeksli. **15 yazma noktasının hepsi okundu, hepsi `occurredAt`i açıkça yazıyor** — yani "alanı olmayan tür" sınıfı yok. **Ama anlamı türe göre değişiyor ve asıl bulgu bu:** `PURCHASE_IN`·`SALE_OUT`·`RETURN_IN`·`ADJUSTMENT`·`COUNT_CORRECTION` → kullanıcı seçiyor (canlıda geriye tarihli kayıt VAR: 241/320 · 66/143 · 1/3 · 6/20 · 1/3 farklı gün) · `SALE_CANCEL_IN` ve satış düzenleme `ADJUSTMENT`'ları → `girdi.an` = işlem ANI, kullanıcı seçmiyor (0/7 farklı) · **`EXCHANGE_OUT` → `new Date()`, tek gerçek boşluk** (0/8 farklı). ⚠ **VEKİL KULLANILMADI** — `createdAt`e bağlamak tam yasaklanan şeydi; boşluk şerhle yaşıyor (bugün 8 hareket). 📊 **ÖLÇÜM ② — KURU KOŞUM:** `1 Haziran açılışı` → 78 `PURCHASE_IN`, net 265 adet, **başka tür YOK**; kaynak belge 84 alım · **0 satış** · 0 iade; defterin en eski hareketi `2025-08-18`. ⚠ **1 HAZİRAN SATIŞ TARAFINI HİÇ SINAMIYOR** (o tarihte defterde satış yok) — kullanıcı şartı gereği **İKİNCİ KURU KOŞUM `1 Ağustos`** koşuldu: giriş 531 · çıkış −5 · **LEDGER 526 = FIFO 526 ✓** — tüketim süzgeci ÇALIŞIYOR. **MOTOR:** `acikPartilerToplu(db, ids, sinir?)` — **ikinci motor açılmadı**, mevcut gövde parametrelendi; süzgeç **girişlere VE tüketimlere** uygulanıyor (yalnız girişlere uygulansaydı temmuzda tüketilen parti haziran fotoğrafında da tükenmiş görünürdü — stok DÜŞÜK çıkar, rakam makul, kimse fark etmez) ve **`occurredAt`ten, `createdAt`ten DEĞİL**. **DİL:** ekran adı "değer/fotoğraf", **"sayım" yasak ve bekçili**; kalıcı şerh _"kayıtlardan kurulmuş defter fotoğrafıdır — fiziksel sayım değildir"_ **koşulsuz** yazıyor (bugünün rakamı da fotoğraftır). **Pirinç şerh** kapsam için, **ay adı VERMEDEN** (ağustos %48 ölçüldü, öteki aylar ölçülmedi). **Sınır örnekle:** _"seçilen günün BAŞLANGICI itibarıyla"_. **Geçersiz/gelecek tarih sessizce bugüne DÜŞMEZ**, ekranda söylenir. **Excel aynı sınırı taşır** ve aynı gövdeden çözer. 🧪 `panel:dogrula` 507→**533** · **6 mutasyon** (tüketim süzgeci kaldırıldı · `createdAt`e bağlandı · başlığa "sayım" kondu · şerh koşula bağlandı · geçersiz tarih sessizleşti · Excel tarihi taşımadı) — 6'sı da kırmızı. ─── **② ARALIK MODU (26.08.2026, Halil seçimi):** ✅ **[KOŞTU]** — Halil dört okuma arasından bunu seçti (ölçülmüş rakamlarla soruldu: A 261 · B 266 · C 526 · D 531 adet — iki kata varan fark). **İKİ UÇ DA AÇIKÇA SEÇİLİR, BAZ TARİH YOK.** 📊 **GERÇEK KOŞUM:** `01.06 → 31.07` → açılış **265** (₺543.664,54) · kapanış **526** (₺1.379.065,09) · fark **+261** (₺835.400,55) · **çapraz ✓ ledger neti +261**. ⚠ **KOMUTTAKİ "1 Ağustos" BEKLENTİSİ DÜZELTİLDİ, RAKAM BÜKÜLMEDİ:** kabul edilen kurala göre **bitiş günü döneme DAHİL**, o yüzden `01.06 → 01.08` kapanışı **529** çıkıyor (1 Ağustos'ta 3 adet daha girmiş). Beklenen 526, `bitiş = 31 Temmuz`da çıkıyor. İkisi de doğru; sınır kuralı tam da tasarlandığı gibi çalışıyor. **SINIRLAR ASİMETRİK VE BİLİNÇLİ:** açılış = başlangıç gününün BAŞI, kapanış = bitiş gününün SONU. Aynı kuralla kurulsaydı dönem bir gün eksik olurdu ve **3 adet sessizce kaybolurdu**. ⚠ **ÜÇÜNCÜ HESAP YOLU AÇILMADI:** fark, iki fotoğrafın ÇIKARMASI; aynı motor iki kez koşuyor. ⚠ **İÇ TUTARLILIK ÇAPRAZI ÖLÇÜLDÜ, VARSAYILMADI — VE HEM SUSMAYI HEM KONUŞMAYI BİLİYOR:** `01.06–31.07` ve `01.06–01.08` → **✓ tutuyor**; `20.08–25.08` → **✗ ayrışma 2** — yani **K54 kendiliğinden görünür oldu**. Ekran bunu söylüyor ama **hüküm vermiyor**. ⚠ **TEK UÇ = HATA**, ters sıra = hata, gelecek = hata — **her sebep AYRI mesaj** (tek bir "geçersiz" mesajı NE yanlış yapıldığını gizlerdi). **Aynı gün geçerli** (tek günlük dönem meşru). ⚠ **TEK TARİH DAVRANIŞI KORUNDU** (geriye uyumlu, mutasyonla sınandı). **Excel ÜÇ SAYFA** — açılış · kapanış · fark, ve **çapraz şerhi dosyanın İÇİNDE** (ekranda uyarı görüp dosyayı indiren biri orada bulamazsa temiz sanır). 🧪 `panel:dogrula` 533→**560** · **6 mutasyon** (bitiş sınırı gün başı · ters sıra serbest · tek uç varsayılsın · fark ayrı sorgudan · tek tarih bozuldu · çapraz hep tutuyor desin) — 6'sı da kırmızı. ⚠ **"BİR ÇOK ÜRÜNDE BU DEĞER SIFIR, HESAPLAR YANLIŞ MI" — HESAP DOĞRU, SAĞLAMASI YAPILDI.** Kullanıcı üst üste `₺0,00` görüp sordu. **DÖRT BAĞIMSIZ YOLLA sağlandı** (`01.06→05.07`): ① ham hareketlerden ELLE kurulan FIFO **265 → 399 · ₺543.664,54 → ₺886.463,48** ② motor **birebir aynı, kuruşuna** ③ saf ledger toplamı (FIFO'ya hiç bakmadan) **265 → 399, fark +134** ④ kaynak belgeler **alım +136 · satış −2 = +134**. ⚠ **Motor kendi kendini onaylamasın diye ELLE yol motoru HİÇ ÇAĞIRMIYOR** (anayasa: kendi kendini doğrulayan ölçüm ölçüm değildir). **YANLIŞ OLAN EKRANDI:** 73 satırın **43'ü** dönemde hiç değişmemişti ve tablo **SIRASIZDI** (`Map` ekleme sırası) — hepsi tepede duruyordu. Üstelik **sıralama düğmeleri aralık görünümüne hiç etki etmiyordu**: duran ama iş yapmayan düğme (İlke #5). **Çözüm:** satırlar **mutlak para hareketine göre** sıralanıyor (azalış da üstte — stok erimesi görülmesi gereken şeydir), sıra **kararlı**, değişmeyen satır **gizlenmiyor ama SAYILIYOR ve ekranda söyleniyor**, ölü sıralama düğmeleri aralıkta çizilmiyor. 🧪 +7 kontrol · 5 mutasyon. ⚠ **VE HALİL TESTİ RAKAM UYUŞMAZLIĞIYLA DÜŞTÜ — HATA BENDEYDİ:** ekran açılışta `₺453.053,78`, teslim raporum `₺543.664,54` diyordu. **İKİSİ DE DOĞRUYDU:** ekran `Mal bedeli (KDV hariç)`, raporum ham `Ödenen (KDV dahil)` toplamını ölçmüştü. ⚠ **ADET RAKAMLARI BİREBİR TUTUYORDU** (265 · 526 · +261) — sapan yalnız paraydı. ⚠ **VE FARK SABİT ÇARPAN DEĞİL:** ölçüldü, açılışta oran tam `1,200000` (hepsi %20), kapanışta `1,194847` (karışık oran, KDV kategoriden). _"1,2'ye böl"_ diye çevrilemez. **Çözüm:** aralık görünümü artık **iki tabanı da ETİKETLİ** taşıyor — tek fotoğraf görünümü zaten öyle yapıyordu, aralığın yapmaması İlke #10 ihlaliydi. Sütun başlıkları ve Excel sütunları da tabanı söylüyor. Anayasaya madde: _"para rakamı tabanıyla birlikte yazılır."_ 🧪 +4 kontrol · 4 mutasyon — **biri önce YEŞİL kaldı** (desen fark sayfasının başlığında da geçiyordu → 9. vaka). ⚠ **CANLI ARIZA — HALİL BULGULADI VE ÖZELLİK HİÇ KULLANILAMIYORDU:** _"tarihler giriliyor fakat program tarihleri kaydetmiyor ve envanter rakamı değişmiyor."_ **Aralık alanına yazmak İMKÂNSIZDI:** alanların değeri doğrudan ADRESTEN geliyordu ve adrese gidiş yalnız iki uç da doluyken tetikleniyordu; ilk tarihi girerken ikinci uç zorunlu olarak boş → gidiş yok → adres değişmiyor → `value` hâlâ `""` → **React her tuşta girdiyi siliyor.** ⚠ **565 KONTROL YEŞİLDİ VE HİÇBİRİ SÖYLEMEDİ** — saf kural, sunucu, sözlük, Excel hepsi doğruydu; kullanıcıya ULAŞAN yol kopuktu. **Çözüm:** gerçeğin kaynağı YEREL DURUM, adres yalnız tamamlanmış sonucu taşır; öteki uç da yerelden okunuyor (çekirdek buydu). Yarım seçimde ekran ne beklendiğini SÖYLÜYOR. Anayasaya madde: _"kontrollü girdi, durumu olmadan yazılamaz."_ 🧪 +5 kontrol · 5 mutasyon — **biri önce YEŞİL kaldı** (render koşulu öldürüldü, iki desen dosyada durdu → desen tablosuna 8. vaka). ⚠ **VE DÖRT ÖLÇÜT ESKİDİ, SUSTURULMADI GENİŞLETİLDİ:** Excel parametresi tekten üçe çıktı · hata mesajı tekilden çoğula geçti · motor sayımı `typeof` yüzünden 3 sayıyordu (çağrı yerine bağlandı). |
| **K54** | **İki defter ayrışması — 2 birim, kaynağı bulundu · [AÇIK]** | ⚠ **K53 ÖLÇÜMÜ SIRASINDA ÇIKTI, ARANMIYORDU.** Bugün: **LEDGER 636 · FIFO 638 → +2**. `canli:defter-ayrismasi` doğruluyor: 150 varyantın **2'si sapan** (`axcali1660` M300 SSD 4→5 · `axcali1610` Vestel blender 11→12), incelenemeyen 0. 🔎 **KAYNAK BULUNDU:** 164 çıkış hareketinin **2'si `sourceMovementId` TAŞIMIYOR** — ikisi de `2026-08-23` tarihli `EXCHANGE_OUT`, notları _"Yanlış sıfırlama geri yüklendi — kullanıcı düzeltmesi"_ ve _"Değişim gerçekten yapıldı — yenisi gönderildi"_. Yani vaka-bazlı düzeltme betikleri partiye bağlamadan çıkış yazmış: **ledger düştü, FIFO düşmedi → hayalet adet.** ⚠ **BU K53'Ü DOĞRUDAN İLGİLENDİRİYOR:** tarihli envanter FIFO'dan okuyor, `/stok` ledger'dan — **iki ekran bugün 2 birim farklı gösteriyor.** ⛔ **HÜKÜM VERİLMEDİ:** hangi defterin doğru olduğu vakaya göre değişir; körlemesine hizalamak veriyi bozar. **Yapılacak:** iki hareketin geçmişi tek tek okunup karar verilir (ADJUSTMENT ile mi düzeltilir, parti bağı mı kurulur). _(Anayasa: "stoğun kendisi de iki defterdir" — üçüncü vaka.)_ |
| **K51 — MENÜ VERİYE DÖNDÜ** | ✅ **[KOŞTU]** — `/ayarlar/menu`. Sıra ve gruplama artık `Company.menuDuzeni`de; kullanıcı ok düğmeleriyle diziyor, açılır listeyle gruba taşıyor. 📊 **MERDİVEN ÖLÇÜLDÜ:** ① `Company`de serbest metin YOK (6 kolon ölçüldü) ② `AuditLog` current-state deposu DEĞİL — menü HER RENDER'da okunuyor, `ORDER BY + LIMIT 1` gerekirdi (232 satır, büyüyor) ③ türetilemez ④ **SÜTUN** (yeni tablo değil). Kuru koşum → canlı → **36 migration** → yerel. ⚠ **EN KRİTİK KİLİT: KAYITLI DÜZEN BİR EKRANI GİZLEYEMEZ.** Katalog KODDA; kayıt yalnız sırayı söyler. Tersi yapılsaydı koda eklenen yeni ekran menüde HİÇ görünmezdi ve kimse ayarlara girip eklemeyi düşünmezdi — `/iadeler`in 13.08'de sessizce kaybolmasının menü hâli. Katalogda var/kayıtta yok → varsayılan yerine **eklenir ve BEYAN edilir**; kayıtta var/katalogda yok → **yok sayılır ve SAYILIR**. ⚠ **BOŞ KAYIT MENÜYÜ BOŞALTAMAZ**, **bozuk JSON ÇÖKERTMEZ** (menü her sayfada çiziliyor), **aynı öğe iki yerde duramaz**, **grubu bulunamayan ekran günlüğe düşer**. ⚠ **`Panel` ve `Menü düzeni` KİLİTLİ** — kullanıcı kendi menüsünü kilitleyip bir daha açamasın diye; kilit hem katalogda hem YAZMA eyleminde, ikisi de mutasyonla sınandı. ⚠ **SÜRÜKLE-BIRAK YOK, bilerek:** telefonda parmakla tutup kaydırmak sayfayı da kaydırır; ok düğmeleri her cihazda aynı (44 px, İlke #8). ⚠ **V2 (grup ekleme/adlandırma) İÇİN BİÇİM HAZIR VE PROVA EDİLDİ:** grup kaydı isteğe bağlı `ad` alanı kabul ediyor, V1 yazmıyor ama **silmiyor da** — bekçi V2 şekilli bir kaydı V1 gövdesinden geçirip sıranın korunduğunu ölçüyor. İddia değil prova. ⚠ **BEKÇİ ÖLÇÜTÜ TAŞINDI, SUSTURULMADI:** _"hep açık liste en fazla N öğe"_ ve elle tutulan _"kullanıcının verdiği SIRA"_ kontrolleri **kaldırıldı** — ikisi de artık kullanıcının TERCİHİNİ polisliyordu. Yerlerine YAPI kontrolleri geldi: her katalog kaleminin ikonu/adresi/etiketi var mı · varsayılan grubu tanımlı mı · mükerrer anahtar var mı · sabit liste kenar çubuğuna geri geldi mi. **"7 → 8 → 9" tartışması böylece kapandı.** ⚠ **VE `el-kitabi:dogrula` KIRMIZI YANDI — HAKLIYDI:** menü kaynağı değişince `app-sidebar.tsx` metnini tarayan ölçüt "2 öğe buldum" dedi. Kod yanlış değildi, ölçüt eskimişti; katalogtan İÇERİ ALINACAK şekilde taşındı. ⚠ **VE `npm run build` BİR KUSUR YAKALADI — `tsc` + 51 BEKÇİ YEŞİLKEN:** `MENU_IZNI` sabiti `"use server"` dosyasından dışa aktarılıyordu, _"a 'use server' file can only export async functions"_. Derleme, bekçilerin görmediği ayrı bir kapıdır. 🧪 `panel:dogrula` 469→**503** · **8 mutasyon** (yeni ekran gizlensin · tanınmayan sessizce geçsin · aynı öğe iki yerde · bozuk JSON çöksün · ikonsuz kalem · kilit kalksın · yanlış grup adı · sabit liste geri gelsin) + **2 V2 mutasyonu** (`ad` reddedilsin · yazma `ad`ı silsin) — hepsi kırmızı. `el-kitabi:dogrula` +1 bölüm (Ayarlar — Menü düzeni, 2 sık hata). ⚠ **VE HALİL BULGULADI — TESLİMDEN DAKİKALAR SONRA:** _"ok'a bastım, bir üste çıkmıyor."_ **Taşıma ÇALIŞIYORDU; GÖRÜNMÜYORDU.** Saf mantık ayrıca koşturulup doğrulandı, buton doğru bağlıydı, deploy bekçisi yeşildi. Kusur **geri bildirimdeydi ve İKİ TANEYDİ:** ① sol menü kaydedene kadar değişmiyor (tasarım gereği) ama **ekran bunu söylemiyordu** — kullanıcı oka basıp SOL MENÜYE bakıyordu ② _"Kaydedilmemiş değişiklik var"_ ve **Kaydet düğmesi ~30 satırın altındaydı**, ekranın dışında. Çözüm: taşınan satır **mavi çerçeveyle vurgulanıyor** (ok VE grup seçici) · kaydet şeridi **yapışkan** · _"sol menü kaydettikten sonra değişir"_ ekranda yazıyor. ⚠ **DERS ANAYASADA ZATEN VARDI:** _"doğru davranışın GÖRÜNMEZLİĞİ de yalancı yeşildir"_ — muafiyet vakasının arayüz tarafı. **503 kontrol yeşildi ve hiçbiri özelliğin KULLANILAMAZ olduğunu söylemedi.** `panel:dogrula` 503→**507**, 4 mutasyon. ⚠ **VE ASIL KEŞİF SORUNU ORTAYA ÇIKTI:** kullanıcı `Menü düzeni` ekranını **`Ayarlar` altında aradı** — öyle bir grup YOKTU (ayar ekranları `Tanımlar` ve `Veri` altına dağılmıştı) ve ekrana hiç ulaşamadı. **`Ayarlar` grubu açıldı:** `Kullanıcılar · Roller · Menü düzeni`. Ölçüt net — `Tanımlar` **İŞ VERİSİ** tanımlar (raf, kategori, tedarikçi: operasyonun konuştuğu şeyler), `Ayarlar` **sistemin kendisidir**. _Bir ekranın nerede olması gerektiğini, onu ARAYAN söyler._ ⚠ Ve ölçüldü ki `menuDuzeni` canlıda **NULL** — kullanıcı hiç kaydetmemiş, yani yeni grup ona görünecek (kayıtlı düzen olsaydı kendi tercihi kazanırdı ve grup boş kalırdı). |
| **Menü sırası — kullanıcı listesi** | ✅ **[KOŞTU]** — kullanıcı sırayı 25.08'de BİREBİR verdi: `Panel · Satış · Alımlar · Ürünler · Stok · İade · Paketleme · Barkod okut · Fiyat Denemesi`. ⚠ **ÖNCEKİ SIRA BENİM ÇIKARIMIMDI** (_alım önce, çünkü stok önce gelir_); kullanıcı günü tersten yaşıyor — gün **satışla** açılıyor. **Sıra gerekçe istemez: sırayı işi yapan bilir.** ⚠ **İKİ EKRAN GRUPTAN GÜNLÜĞE ÇIKTI:** `urunler` ve `okut`. İkincisi 22.08'de *"sıklığa göre günlük listeye ait"* diye işaretlenmiş ve karar kullanıcıya SORULMUŞTU — cevap bu listeyle geldi. ⚠ **VE BİR EKRAN GÜNLÜKTEN ÇIKTI: `Kârlılık kartı` listede YOK.** Silinmedi, "Ürün ve kanal" grubuna taşındı; adresi (`/kart`) ve davranışı aynı, geri alınması **tek satır**. ✅ **ONAYLANDI 25.08.2026:** listeden düşmesi kasıtlı değildi (kullanıcı unutmuş) ama **grupta kalması onaylandı** — yani sonuç aynı, gerekçe netleşti. ⚠ **KAYDA GEÇEN İLKE:** _menü sırası KULLANIM GERÇEĞİNDEN gelir, çıkarımdan değil._ Benim dizilimim mantıklıydı (alım→stok→satış) ve **yanlıştı**; kullanıcının günü satışla açılıyor. Eski gerekçe (_"mağazada telefonla barkod okutup alım kararı verilen an"_) dosyada bırakıldı — çürüdüğü için değil, kullanıcı gününü daha iyi bildiği için taşındı. 🧪 `panel:dogrula` +1 kontrol · **sınır 8 → 9, kaynağıyla** (bu sayı bir ölçüm değil, kullanıcının onayladığı listenin uzunluğu — üç kararın üçü de yazılı). ⚠ **VE ARTIK YALNIZ SAYI DEĞİL SIRA DA SINANIYOR:** sayı sınırı listenin UZAMASINI durdurur ama İÇİNİN karışmasını durdurmaz; iki satırın yeri sessizce değişse hiçbir bekçi görmezdi. 2 mutasyon (sıra bozuldu · onuncu öge eklendi) — ikisi de kırmızı. ⏭ Kalıcı çözüm **K51**. |
| **K49 — tarife kapsam boşluğu** | ✅ **[KOŞTU]** — ekran üç pencereyi de AYRI AYRI doğru gösteriyordu ama **aralarındaki deliği hiç söylemiyordu**; 72 saat ancak veritabanına elle bakınca göründü. 📊 **ÖLÇÜM (canlı, salt okuma):** 3 pencere · `14–18.08` (96,0sa · 640 kalem) · `21–25.08` (96,0sa · 672) · `25.08–01.09` (**168,0sa** · 712). **DELİK: `18.08 07:59 → 21.08 08:00` = 72 saat 1 dakika · 2 TAM gün (19 · 20 Ağustos) · o aralıkta 14 SATIŞ var.** ⚠ **İLK ÖLÇÜM 16'YDI, AŞILDI — ve niye aşıldığı yazılıyor:** ilk sorguda iptal süzgeci yoktu ve `iptal:bekci` bunu KIRMIZI yakaladı. İptal edilmiş satışta zaten kâr hesaplanmıyor; onu saymak kaybı **olduğundan büyük** gösterirdi. Geçerli rakam **14**, eski **16** iptalli iki kaydı da içeriyordu. ⚠ **KAYIP TELAFİ EDİLEMEZ:** TY'nin tam dilimli ileri tarifesi arşivden inmiyor — delik **kapanmaz, yalnız görünür olur.** ⚠ **EŞİK GEDİĞE KONDU:** kaynak dosya pencereyi `07:59` bitirip `08:00` başlatıyor, yani bitişik pencerelerde bile **60 saniyelik dikiş** var. Ölçülen dağılım iki noktadan ibaret ve arası uçurum — `0,017sa (dikiş)` … `72sa (delik)`; eşik **1 saat**, tam gediğin içinde. ⚠ **GÜN SAYIMI EŞİKSİZ VE UÇLARI SAYMAZ:** 18.08 saat 07:59'a kadar, 21.08 saat 08:00'den sonra kapsanıyor — "4 gün" deseydik iki günü haksız yere kayıp ilan ederdik. Saat dilimi aritmetiği hiç yapılmadı, yalnız takvim günü kıyası. ⚠ **BOŞLUK BÜTÜN GEÇMİŞTEN hesaplanıyor**, listelenen son 10'dan değil — kesilmiş listeden hesaplansaydı 11. pencerenin öncesindeki delik hiç doğmaz ve ekran *"kapsam kesintisiz"* derdi (sayfalamanın yalancı yeşili). Listelenemeyen boşluk varsa **sayısı yazılıyor**. ⚠ **PANELE TAŞINMADI, BİLEREK:** kapanamayan bir uyarı görev kutusunda sonsuza kadar yanar ve rozetin tamamına olan güveni götürür. **İki yön de sınandı** — geçmiş delik rozeti YAKMIYOR, biten pencere hâlâ YAKIYOR. ⚠ **TUTANAK KUSUR İLE SINIRI AYIRT ETTİRİYOR (kullanıcı düzeltmesi):** kayıt ilk hâlinde _"ara verdin"_ diye okundu; **kronoloji tersini söylüyor ve ölçüldü** — sistemin İLK tarife kaydı `18.08 14:36` ve o kayıt bile **geriye dönük** (yüklediği pencere o sabah 07:59'da bitmişti); delik penceresi `18.08 08:00`'de, yani sistemde **henüz tek bir tarife bile yokken** 6,6 saat önce açıldı. `21.08` penceresi `22.08 00:50`'de (pencere AÇIKKEN), `25.08` penceresi `25.08 03:00`'te (pencere BAŞLAMADAN) yüklendi → **rutin kurulduğundan beri kaçan pencere 0.** Ekran artık bunu kendisi söylüyor. ⚠ **Ölçüt tarih gömülerek değil VERİDEN** (`min(yuklendiAt)`) — ve `pencereBaslangic` DEĞİL, çünkü ilk yükleme geriye dönüktü. ⚠ **Muafiyet sınırsız değil:** rutinden SONRA kaçan pencere hâlâ kusur (mutasyonla sınandı). ⚠ **UÇ DAMGASINDA SAAT VAR:** `.slice(0,10)` yapılsaydı 72 saatlik delik *"18→21, arada bir şey yok"* diye okunurdu — ekranın zaten bir kez düştüğü tuzağın ters yönü. ⚠ **VE BEKÇİ BU TESLİMDE GERÇEK BİR KUSUR YAKALADI:** boşluğa düşen satışları sayan sorgu iptal süzgeci taşımıyordu; `iptal:bekci` (kaynak tarayan, liste tutmayan bekçi) `page.tsx:121`'i adıyla gösterdi. Ekrana basılacak rakam **16 → 14**. ⚠ **VE BU BİR KAYIP ABARTISIYDI:** kaybı olduğundan küçük göstermek açık hatadır ve aranır; **büyük göstermek de aynı ölçüde hatadır ama kimse kontrol etmez** — kötü haber, iyi haberden daha az sorgulanır. Anayasaya madde olarak girdi. Bekçi turu rutin koşulmasaydı yanlış bir sayı yayımlanacaktı. ✅ **"14 SATIŞIN KOMİSYON ORANINI DÜZELTELİM Mİ" — KAPANDI 25.08.2026, ÖLÇÜLDÜ, DÜZELTİLECEK BİR ŞEY YOK.** Kullanıcı sordu; ölçüm (canlı, salt okuma): **14 satış · 14 kalem · komisyon oranı YOK: 0 · NET-2 hesaplanmamış: 0 · hepsi `CALCULATED`.** Oranlar kayıtlı ve kâr hesaplanmış. ⚠ **VE DELİK BU SATIŞLARA HİÇBİR ŞEY KAYBETTİRMEDİ:** tarife snapshot'ı (`commissionTarifeId`) **bütün defterde 0/140** — KAPSANAN pencerede duran 31 kalemde de boş. Yani deliğin bedeli bu satışlarda değil, **`Fiyat dene`de**: o dönem için _"şu fiyata satsam komisyon ne olur"_ sorusu cevapsız kalır. ⚠ **DELİĞİN GERÇEK BEDELİ BÖYLECE TANIMLANDI:** satış defteri DEĞİL, o dönem için `Fiyat dene`nin susması. Kayıp yeri yanlış tarif edilseydi düzeltilecek bir şey aranır ve doğru çalışan kayıtlara dokunulurdu. ⚠ **BULGU — `commissionTarifeId`'nin HİÇBİR YAZICISI YOK** (uygulama genelinde sıfır atama): şema _"bu tarifeden oran snapshot'lamış satış kalemleri"_ diyor, kod bunu hiç yapmıyor. Kolon başlığı bir iddiadır. **Bugün zararsız** — oran zaten `SaleItem.commissionRate`'te donmuş durumda ve doğruluğu ondan geliyor; kayıp yalnız **köken izi** (hangi pencereden geldiği). Kalem açıldı: **K52**. ⚠ **ORAN DOĞRU MU sorusu AYRIDIR ve cevabı tarifede değil FATURADADIR** — kullanıcının önerisi (_"satış faturalarından bakarız"_) kaynak sırasında **1. basamak**, tarifeden üstün: tarife niyeti, fatura sonucu söyler. Araç zaten var: `npm run canli:oran-denetimi -- --dosya="…"`. 🧪 `tarife:dogrula` 98→**132** · **16 mutasyon, 16'sı da kırmızı** (eşik ↑ · eşik ↓ · hesap ayrımı · gömülü pencere · gün sayımı uçları · render koşulu · kesilmiş liste · "kapanmaz" cümlesi · saat kırpması · **panel deliği görev sayarsa** · **rozet susturulursa** · görüş sınırı hepsini affeder · hiçbirini affetmez · kayıt yokken sınır iddia eder · sınır cümlesi çizilmez · sınır pencere tarihinden okunur). |
| **Gider kartla ödenebiliyor** | ✅ **[KOŞTU]** — kullanıcı: _"giderleri ve vergileri de kartla ödüyorum; bugün 4-5 binlik vergi ödedim."_ Ölçülen boşluk: `kartBorcuHesapla` YALNIZ alımlardan besleniyordu, kartla ödenen gider kart borcunda ve **nakit takviminde HİÇ görünmüyordu**. `Expense.creditCardId` + `installmentCount` (adlar alımla birebir aynı — iki ad, iki zihin modeli demekti). ⚠ **Taksit var çünkü kullanıcı SONRADAN böldürüyor:** _"devlete peşin kartla ödüyorum, sonra banka uygulamasına girip taksit seçeneği varsa böldürüyorum."_ Tek çekim varsayılsaydı borç yanlış aya yığılırdı. ⚠ **GERİ DOLDURMA YOK ve bu bilinçli** — mevcut giderlerin hangisinin kartla ödendiğini sistem bilmiyor; uydurulmuş bir kart bağı kart borcunu **olmayan bir borçla** şişirirdi. ⚠ **DÖNÜŞÜM TEK GÖVDEDE** (`lib/kart-gideri.ts`), dört çağrı yeri var; ayrı yazılsaydı iki ekran aynı kart için farklı borç gösterirdi. ⚠ **Para birimi ÇEVRİLMEZ**, atlanan gider **sayılır** ve ekranda söylenir. |
| **Gider formu kaydedilemiyordu** | ✅ **[KOŞTU] — CANLI HATA, BENİM HATAM.** Her kayıtta _"Taksit sayısı tam sayı olmalı"_ ve gider hiç kaydedilemiyordu. Kök neden: şema doğruluyordu, yazma kullanıyordu, **ama `formuOku` alanları formdan HİÇ OKUMUYORDU** — `veri.installmentCount` hep `undefined`. ⚠ **BEKÇİ NİYE YAKALAMADI:** zincirin **iki ucunu** sınıyordu (formda alan var mı · yazmada kullanılıyor mu) ama **ORTASINI** değil. Anayasaya madde olarak girdi: _"bir zincir, halkalarının VARLIĞIYLA değil BAĞLANTISIYLA sınanır."_ **Taksit isteğe bağlı yapıldı** (kullanıcı kararı): boş bırakmak meşru bir cevap — tek çekim. |
| **Ödeme yöntemi — Nakit / Havale / Kart** | ✅ **[KOŞTU]** — kullanıcı: _"havale ile ödeme veya cash ödeme ana kategorileri olmalı, kartla ödeme tıklanırsa altta kartlar açılsın."_ `Expense.odemeYontemi ENUM('NAKIT','HAVALE','KART') NULL` — kuru koşum (canlı, salt okuma: kolon yok · 11 gider · MariaDB 10.11) → canlı koşum → damga (**35 migration**) → yerel. ⚠ **SAKLANDI, ÇÜNKÜ SAKLAMAMANIN BEDELİ ÖLÇÜLDÜ:** form üç seçenek gösterip seçimi saklamasaydı düzenlemeye girildiğinde "Havale" seçilmiş bir gider ekranda **başka türlü görünürdü**. Ekranın yanlış bir şey göstermesi bir sütundan pahalıdır. ⚠ **GERİ DOLDURMA YOK:** eski kayıtlar `null` kalır, ekran **"Belirtilmedi"** der — "Nakit" VARSAYILMAZ. _(Alanın doğum tarihi 25.08.2026; ondan öncesi için boşluk hüküm değildir.)_ ⚠ **YÖNTEM YOK + KART VAR ise ekran "Kartla" DEMEZ**, `"Belirtilmedi · Garanti"` der — iki olgu ayrı yazılır, kartın varlığından yöntem **çıkarılmaz**. ⚠ **HİÇBİR HESABA GİRMİYOR** (bilinçli, bekçiyle kilitli): borç `creditCardId`den yürür, bu alan beyan/görünüm. Biri gün gelip hesaba bağlarsa bekçi kırmızı yanar ve karar **yeniden verilir**. ⚠ **NAKİT/HAVALE seçilince kart SESSİZCE SİLİNMEZ** — çelişki ekranda söylenir, kullanıcı tek tıkla kaldırır; sessiz silme kart borcunu uyarısız azaltırdı. ⚠ **Sütun AÇILMADI** (tablo zaten 8 sütunla tavanın üstünde); bilgi açıklama hücresinin ikinci satırında. Ekran ve Excel **aynı gövdeyi** çağırıyor (`lib/gider-odemesi.ts`). 🧪 `kart-odeme:dogrula` 135→**169** · **13 mutasyon**, ikisi önce YEŞİL kaldı ve bekçi düzeltildi (① `const celiski =` aranıyordu, render koşulu `{false ? (` yapılınca dal hiç çizilmedi ② `yontemSec`in karta dokunmadığı hiç ölçülmüyordu). |
| **Menü grupları açılıp kapanmıyordu** | ✅ **[KOŞTU] — İKİ AYRI KUSUR.** ① _"Tanımlar devamlı açık kalıyor"_: `acik = icindeSecili \|\| acikKayit` ifadesi, o grubun içindeki bir sayfadayken grubu **zorla açık** tutuyordu — başlığa basmak hiçbir şey yapmıyordu (tıklanınca iş yapmayan düğme = sessiz başarısızlık, #5). **Üç durum** yapıldı; otomatik açılma kaldırılmadı ama **açık tercih onu yeniyor**. ② _"Para kategorisi açılıp kapanmıyor"_: durum YALNIZ `localStorage`'ta yaşıyordu ve yazma başarısız olursa `catch {}` onu **sessizce yutuyordu**. Artık gerçeğin kaynağı **bellek**, depolama yalnız kalıcılık. ⚠ Anayasaya madde: _"kalıcılık katmanı, çalışma katmanının önkoşulu yapılmaz"_ — **sessiz yutma sınıfının üçüncü üyesi** (kamera `catch`i · menü `catch {}`). 🧪 `panel:dogrula` +3 kontrol · 3 mutasyon. |
| **Geçici betik kalıbı** | ✅ **[KOŞTU]** — `scripts/tmp/` + `.gitignore`. 24.08'de bir ölçüm betiği commit'e sızmıştı; sebep dikkatsizlik değil **sıralamaydı** (silme komutu yazma komutuyla aynı zincirde koşunca dosya doğmadan çalıştı). ⚠ **MEKANİZMA, ALIŞKANLIK DEĞİL:** _"bir dahaki sefere silerim"_ bir niyettir; niyet unutulur, `.gitignore` unutmaz. ⚠ **İZİN LİSTESİ, YASAK LİSTESİ DEĞİL:** her şey yok sayılır, `BENIOKU.md` tek istisna — `*.ts` yok sayılsaydı yarın yazılan bir `.mjs` sızardı. 🧪 `gecici:dogrula` (11 kontrol) — **ölçüt metin değil DAVRANIŞ**: `.gitignore` okunmuyor, **git'in kendisine soruluyor** (`git check-ignore`), yoksa kuralı ileride ezen bir satır görünmezdi. 3 mutasyon (kural kaldırıldı · `.ts`'e daraltıldı · istisna kaldırıldı) — 3'ü de kırmızı. **Bekçi sayısı 50 → 51.** |
| **El kitabı — gider bölümü** | ✅ **[KOŞTU]** — kullanıcı sormuştu: _"KDV yazmayın diyor; KDV çıkmadığı zaman ödenen damga vergisi var, 791 TL, onu yazıyor muyuz? Bir de gelir vergisini yazıyor muyuz? Kitapta detay yok."_ Kitap gerçekten susuyordu. **Eklendi:** hangi vergi nereye tablosu (damga · MTV · ödenen gelir vergisi → **EVET, KDV 0** · ödenecek KDV · stopaj → **HAYIR**) · **fark bloğu** (kâr motorunun reddedilmiş varsayımsal %15'i ≠ fiilen ödenen gelir vergisi — tek ortak yanı adı) · kart/taksit akışı (kullanıcının kendi anlattığı "bankada sonradan böldürme" sırasıyla) · para birimi kuralı · "Belirtilmedi" ne demek · 4 sık hata. 🧪 `el-kitabi:dogrula` 41→**52** · 6 mutasyon; **biri İKİ KEZ yeşil kaldı** — `"Damga vergisi"` bölümde ÜÇ kez geçiyor, satıra daraltınca da MTV satırının GEREKÇE hücresi (_"Damga vergisiyle aynı mantık"_) yakalanıyordu. Ancak **ilk hücreye** (kalem adı) bağlanınca kırmızı yandı. |
| **Push kapısı** | ✅ **[KOŞTU]** `.githooks/pre-push` → bekçi sıfır dönmeden push geçmez. `core.hooksPath` ile kurulur (`prepare`), yani **depoyla gelir** — kişisel alışkanlık değil. 🧪 **Mutasyonla sınandı** (kasıtlı derleme hatası → `exit 1`) **ve ilk gün gerçek bir push durdurdu**: `okuma:dogrula` eskimişti (raf dalı öne geçince desen kaydı), ölçüt **güncellendi, susturulmadı**. ⚠ **DÜRÜSTLÜK SINIRI KAYITLI:** `git push --no-verify` bu kapıyı atlar ve git'ten kaldırılamaz — koruma **"kazayla imkânsız"**, "mekanik imkânsız" DEĞİL. |
| **Kamera — kargo barkodu** | ✅ **KAPANDI 25.08.2026, Halil doğruladı: _"şimdi çalışıyor"_.** Kök neden **çözünürlük**: `getUserMedia` yalnız `facingMode` istiyordu, tarayıcı çoğu cihazda **640×480** veriyor. EAN-13 ürün barkodu ~95 modül → modül başına **~6 px** (okur); 16 haneli kargo barkodu ~220 modül, üstelik A4'ün köşesinde → **~3 px** (okumaz). `1920×1080` **`ideal`** ile istendi (`min` DEĞİL — desteklemeyen cihazda kamera hiç açılmazdı) + sürekli odak denemesi.

⚠ **TEŞHİSİ ÇÖZEN ŞEY HALİL'İN YAN CÜMLESİYDİ:** _"Okut kısmına ürün barkodu denedim OKUDU."_ O cümle olmadan iki yanlış yolda daha ilerlerdim. **Neyin ÇALIŞTIĞI, neyin çalışmadığı kadar bilgidir** — arıza raporunda "şu da denendi ve oldu" satırı, arızanın kendisinden daha ayırt edicidir.

⚠ **İKİ HİPOTEZ ÖLÇÜMLE ELENDİ, TAHMİNLE DEĞİL:** ① wasm sürüm uyumsuzluğu — `public/zxing_reader.wasm` paketteki 3.1.2 ile **birebir aynı bayt**; ② biçim listesi fırlatıyor — Node'da eski ve yeni liste denendi, **ikisi de OK** döndü.

⚠ **VE İKİNCİ BİR KUSUR ORTAYA ÇIKTI:** tarama döngüsünde `catch {}` vardı, **her kareyi sessizce yutuyordu.** Çözücü hiç çalışmasa bile kamera açık kalır ve teşhis edilecek tek iz kalmazdı — _"kameralar okumuyor"_ bildirildiğinde elimizde hiçbir hata kaydı yoktu. Artık ilk hata ekranda yazıyor (her karede değil). 🧪 `kamera:dogrula` 25→29 · **3 mutasyon, biri önce yeşil kaldı** (desen kamerayı AÇARKEN kullanılan başka bir `catch(e)+setHata` çiftini buluyordu → tarama döngüsüne daraltıldı). |
| **Raf modu `/okut`'ta** | ✅ **[KOŞTU]** — K50 ⑤. Etiketler zaten vardı (`/ayarlar/konumlar/etiketler`), **okuma tarafı yoktu**; Halil bulguladı. Sıra: ürün → satış → **RAF**. ⚠ **Ölçüm kovalarına GİRMİYOR** (`iziYaz`dan önce dönülüyor): raf okuması ürün okuması değildir, kovaya girseydi `BILINMEYEN` şişer ve haftalık kapsam ölçümü *"defter eksik"* derken aslında *"raf okutuldu"* demiş olurdu. ⚠ Başlık **"kayıt"**, envanter değil — çıkışlar rafı boşaltmıyor, adet iddiası yok. ⚠ **Son-yerleştirme sütunu YOK çünkü İZİ YOK** (K50 ③ gelince eklenir); `updatedAt` vekil YAPILMADI. |

---

## 🧭 OPERASYON — Halil, bugünden itibaren

### ⏳ HALİL'DE BEKLEYEN — dördü de kısa

| # | İş | Not |
|---|---|---|
| 1 | **Raf QR testi** | `/okut`'ta bir raf QR'ı okut (`A1`, `A10`…). Beklenen: *"Raf A1"* + o rafa kayıtlı ürünler + *"konum kaydıdır, adet sayımı değil"* notu. |
| 3 | **`11504122276` → İptal et** | Depodan ürün ÇIKMADIYSA `İptal et`. ⚠ `Değişim ürünü gönderildi` **geri alınamaz** bir stok çıkışı yazar. |
| 4 | **31.08 ekran görüntüsü** | "Reddedilen" detayı: **karar tarihi + kargo kodu + kalan süre aynı karede.** H25① rozetini `BEYAN` → `OLCULDU` yapar. ⚠ Sayaç **31.08.2026 12:35**'te doluyor — bugünden **6 gün**. _(Komutta "4 gün" yazıyordu; tarih yazıldı, gün sayısı bayatlamasın.)_ |

- **Yeni satış girerken panelden GÖNDERİ NUMARASINI da gir.** Alan formda
  duruyor; okutarak da girilebilir. Alan doluysa `/okut` **tekil siparişe**
  düşer ve elle sipariş seçme adımı kalkar.
- **Eski 121 satışa geri doldurma YOK** — kod uydurulamaz. Sonradan panelde
  görürsen satış detayından girilebilir; **zorunlu değil.**

---

## 🛡 A3 GÜVENLİK ÇERÇEVESİ — mimar kararı 25.08.2026

> **TEST DOMAİNİ AÇILMAYACAK.** Canlıda salt okuma disipliniyle
> ilerlenecek. Gerekçe: _"iki defter ayrışır, üçüncü bir mutabakat işi
> doğurur; koruma domain ayrımı değil, **YAZAMAYAN İSTEMCİDİR**."_

| # | Şart | Durum |
|---|---|---|
| 1 | API istemcisi TEK modülden çıkar, **yalnız GET/okuma** uçlarını bilir. Yazma ucu fonksiyon olarak BİLE tanımlanmaz — _çağrılamayan şey yanlışlıkla çağrılamaz._ İleride yazma gerekirse ayrı modül + ayrı karar. | ✅ bugün geçerli (iki betik, ikisi de yalnız GET) |
| 2 | **Bekçi:** API'ye dokunan kodda `POST/PUT/DELETE/PATCH` → KIRMIZI | ✅ **[KOŞTU]** `npm run api:dogrula` · mutasyonla sınandı |
| 3 | Ölçüm betikleri deftere YAZMAZ (`prisma.create/update/delete` → KIRMIZI) | ✅ **[KOŞTU]** aynı bekçide |
| 4 | Anahtar yalnız `.env.canli`de; log/rapor/commit'te maskeli | ✅ bekçi anahtar **DEĞERİNİ** arıyor (adı sır değil) |
| 5 | **İçe aktarma (A3-③) başlamadan kuru koşum raporu + mimar onayı** — migration disipliniyle aynı kapı | ⏳ sırası gelmedi |

⚠ **DOSYALAR ADLA DEĞİL İÇERİKLE BULUNUR** (`apigw.trendyol.com` izi):
yarın başka adla yazılan bir modül de kendiliğinden kapsama girer.
Elle liste tutulsaydı, listeye eklenmeyen dosya sessizce korumasız kalırdı.

---

## 🔴 KARAR BEKLEYEN — sırada bu var

| # | İş | Durum |
|---|---|---|
| **A3** | 🔴 **AŞAMA 3 — pazaryeri API'si açılsın mı?** | ⏳ **GEREKÇE AĞIRLAŞTI 22.08.2026: SORUN TEK KANALDA DEĞİL.** Ölçüm iki kanala genişletildi (`npm run canli:eksik-siparis`, salt okuma):<br>**Trendyol** `01.08→20.08` — 143 sipariş, bizde **38**, eksik **105** (%73,4)<br>**Hepsiburada** `03.08→15.08` — 51 sipariş, bizde **6**, eksik **45** (%88,2)<br>İkisinde de **okunamayan satır 0** — yani bunlar soru değil, KANIT. ⚠ Pencereler farklı, iki kanal birbiriyle KIYASLANMAZ; her rakam kendi penceresinde okunur. **Hüküm:** elle giriş yetişmiyor ve bu Trendyol'a özel bir hacim sorunu değil — daha az sipariş gelen HB'de oran daha da kötü. Keşif ağustosun kapanmasını beklemiyor.<br>🔺 **AĞIRLAŞTI 24.08.2026 — ÜÇÜNCÜ, BAĞIMSIZ ÖLÇÜM.** Eksiklik artık sipariş dökümünden değil **hakediş tarafından** da görünüyor: kanalın ödeme kalemleri **385 farklı sipariş** adlandırıyor, bizim TÜM defterimizde **121 satış** var (kanal ve dönem farkı gözetmeden). Bu bir kapsam tartışmasına dayanmaz — üst küme alt kümeden büyük. **A3 artık üç kalemi birden kilitliyor: H3 · K8 · K19①.**<br>🔺 **BEŞİNCİ TANIK 24.08.2026 — VE TÜRCE FARKLI: GEREKÇE DOSYASI KAPANDI.** Önceki dört tanık BELGEydi (sipariş dökümü · hakediş raporu · iade paneli · kargo faturası). Beşincisi belge değil, **sistemin KENDİ eşleştirme motorunun cevabı**: `npm run canli:k8-olcum` → bağlanamayan **1081 kalem / 380 sipariş**, ve bunların **hiçbiri** biçim/kanal sorunu değil (b kovası = **0**). Motor 13 partide 13 kez boşa attı. ⛔ **Beş bağımsız kaynak, tek yön. A3 için toplanacak gerekçe kalmadı** — kalan tek şey karar.<br>🔎 **KEŞİF RAPORU HAZIR 24.08.2026** — `docs/a3-trendyol-api-kesif.md` (salt okuma araştırma, kod yazılmadı, hiçbir uca istek atılmadı). **TEKNİK ENGEL YOK:** ihtiyacımız olan üçü de API'de ve üçü de salt okuma — **sipariş çekme** (A3'ün kendisi) · **hakediş** (H3·K8·K19① kilitlerini birden açar) · **kargo faturası** (K45'in elle indirdiği dosya). ⚠ **İKİ SINIR TASARIMI BELİRLİYOR:** sipariş ucu tek istekte **en fazla 2 hafta**, geriye **1 ay** (bir sayfada 3 ay yazıyor — **çelişki, ölçülmeli**), **10.000 kayıt tavanı**. ⚠ **İKİ BULGU BUGÜNKÜ İŞLERİ DOĞRULADI:** `orderDate` **saat taşıyor** (H20'nin açık kararı artık teorik değil) · paket bölünmesi `createdBy:"split"` + `originPackageIds` ile **görünüyor** (`Sale.paketSayisi` türetilebilir; `11473322212`'de elle bulduğumuz 2×₺13,19 bir daha elle bulunmaz). ⚠ **HAKEDİŞ SATIRI `orderNumber` TAŞIYOR** → K8'in eşleştirme kuralı **değişmiyor**, veri başka kapıdan giriyor. Üstelik `commissionRate` VE `commissionAmount` ikisi de var — kanalın **fiilen kestiği** komisyon, yani anayasadaki "gerçek bağımsız teyit". ✅ **ANAHTAR GELDİ VE ÖLÇÜLDÜ 25.08.2026** (`npm run canli:ty-saglik`, **yalnız GET**): **YETKİSİZ 0** — anahtar tam yetkili. **SİPARİŞ ✅** · **HAKEDİŞ ✅ 15 günde 86 kayıt** (`commissionRate` + `commissionAmount` ikisi de geliyor → kanalın FİİLEN kestiği komisyon) · **İADE ✅** (`cargoTrackingNumber` dahil) · **ÜRÜN ✅** · **DİĞER FİNANS açık ama pencerede kayıt yok.** ⚠ İki uç 556 döndü ama **yolları TAHMİNDİ** (dokümantasyon indeksi adı veriyor, tam yolu vermiyor) — "TY kapalı" demek, kendi bilgisizliğimi karşı tarafın kusuru gibi raporlamak olurdu. ⚠ İlk koşumda `size=5` gönderip hakediş uçlarından 400 aldım; onu "ULAŞILAMADI" saymak çalışan bir ucu kapalı göstermekti — ayrı kova açıldı (**İSTEK HATALI**), `size=500` ile açıldı. ⏭ **SIRADAKİ ADIM KOD DEĞİL:** ~~satıcı panelinden **API anahtarı**~~ (⚠ yalnız ANA KULLANICI alabilir) + `HealthCheck` ile hangi uçların **hesabımızda açık** olduğunu ölçmek. Rapordaki her şey dokümantasyondan; hesabın gerçeği ancak anahtarla görülür.<br>🔺 **DÖRDÜNCÜ BAĞIMSIZ TANIK 24.08.2026 — GEREKÇE ARTIK MUTABAKAT.** TY **kargo faturası** detayı okundu (`npm run canli:kargo-mutabakat`, salt okuma): **12 satırın 8'i** (7 farklı sipariş) defterimizde **hiç olmayan** siparişlere ait — `11249504556` · `11462653918` · `11409234590` · `11429466372` · `11428406427` · `11429908093` · `11400535991`. Artık dört ayrı BELGE TÜRÜ aynı yönü gösteriyor: sipariş dökümü · hakediş raporu · iade paneli · kargo faturası. ⚠ **VE NİTELİK AĞIRLAŞTI:** bu siparişlerin kargo gideri **fiilen ÖDENMİŞ**. Boşluk yalnız görünmeyen ciro değil, **hiçbir satışa bağlanamayan gerçek para** — o siparişlerde kâr tanım gereği yanlış. ⏭ Bu 7 numara, defter kapatma işinde **çapraz kontrol**: eksik-sipariş içe aktarım listesinde de var mı? Yoksa **beşinci** boşluk türü — dökümde de olmayan sipariş.<br>✅ **KULLANICI TEYİDİ 24.08.2026:** _"bunlar reel siparişler."_ Yani `(c)` kovası **veri artefaktı DEĞİL** — o siparişler gerçekten oldu, kargoları gerçekten ödendi, sistemde yoklar. ⚠ **SORUNUN CİNSİ DEĞİŞTİ:** eksik sipariş artık yalnız _görünmeyen ciro_ (kazanılmamış para) değil, **çıkmış para** — ödenmiş bir gider hiçbir satışa bağlanamıyor. NET-2 yalnız eksik değil, **fazla iyimser.** |

---

## ⏸ HALİL'E BAĞLI — kod işi kalmadı

| # | İş | Ne gerekiyor |
|---|---|---|
| **H3** | **Satışlarımızın ödendiği dosya** | 🔻 **[KOŞTU 24.08.2026] GEREKÇE ÇÜRÜDÜ — DARBOĞAZ TAKVİM DEĞİL, BİZ.** Eski gerekçe _"dosya ~20.09'a kadar yok"_ idi. Ölçüldü (`npm run canli:hakedis-ortusme`, salt okuma): elimizdeki **1136 kalem zaten `08.07 → 03.09` vade aralığını taşıyor** — yani doğru dönem ELİMİZDE. **Kesişim yine de 5.** Sebep biçim değil (hakediş 10 hane×129 + 11 hane×256; satış aynı biçimde), **KAPSAM**: hakediş **385 farklı sipariş** adlandırıyor, bizim TÜM defterimizde **121 satış** var. ⛔ **Yeni dosya indirmek bu tabloyu değiştirmez** — eksik olan onların satırı değil bizim siparişimiz. **H3 artık A3'e bağlı**, takvime değil. |
| **H8** | **HB hizmet bedeli — soru değişti** | 🕓 **[BEKLİYOR] eylül ortası HB ekstresi.** Ölçüldü: hesabı kesilmiş 99 siparişin yalnız **14'ünde** ₺12,60 kesilmiş; motorumuz **%100'ünden** kesiyor. Koşul hiçbir dosyada görünmüyor. **Kural DEĞİŞTİRİLMEDİ** — sıfıra çekmek de en az mevcut hâli kadar dayanaksız. Kapanış: 13 HB satışımızın ekstresi düşünce satış satış kıyaslanır. |
| **H10♻** | **RUTİN: her Salı/Cuma tarife dosyasını indir** | ♻ **SÜREKLİ — ERİŞİM AÇILDI 24.08.2026.** Tam dilimli ileri tarife arşivden **inmiyor**; o hafta indirilmezse bir daha elde edilemez. ✅ **SALI DOSYASI GELDİ VE YÜKLENDİ 25.08.2026** — ekrandan, terminalsiz. **Yüklü: 3 pencere, üçü de Trendyol.** ⚠ **BU HAFTAKİ DOSYA 7 GÜNLÜK** (Salı→Salı), öncekiler 4 günlüktü (Cuma→Salı) — dosyanın kendi kolonu da `Tarih aralığı (7 Gün)` diyor. Cuma dosyası yine de **beklenir**: gelmezse kapsam zaten var, gelirse yüklenir.<br><br>⛔ **VE ÖLÇÜM KALICI BİR DELİK BULDU — 72 SAAT.** Gerçek sınırlar (İstanbul, `canli:tarife-yukle` raporundan değil **veritabanından** okundu):<br>`14.08 08:00 → 18.08 07:59` 640 kalem<br>**⛔ 18 · 19 · 20 Ağustos — KAPSAYAN PENCERE YOK**<br>`21.08 08:00 → 25.08 07:59` 672 kalem<br>`25.08 08:00 → 01.09 07:59` 712 kalem<br>**18.08 Salı dosyası hiç indirilmemiş.** O üç günün satışlarında `Fiyat dene` dilim veremez ve komisyon denetimi hüküm kuramaz. Arşivden inmediği için **kapatılamaz** — rutinin niye rutin olduğunun somut kanıtı. ⚠ **HEPSİBURADA TARİFESİ HÂLÂ SIFIR** (HB Çarşamba yayımlıyor); bugün HB ve N11 `Fiyat dene`de _"dilim tarifesi yok — tek oranla hesaplandı"_ diyor, yani üç kanal **eşit zeminde kıyaslanmıyor**. _(Gerekçe ve ölçüm: ARSIV → K47.)_ |
| **H18** | **Melontik ölçütü** | Çapraz teyit için **gerçek** Melontik çıktısı. _Sunumdaki rakamlar demoydu; doğrulanmamış ölçüte göre motor bozulmak üzereydi._ |
| **H25** | **İade süreci — iki ölçüm kaldı** | ✅ **10 GÜNLÜK SAAT KAPANDI:** Aras takibi `(KG)` "yola çıktı 21.08 12:35" ile TY ekranının sayacı **25 saniye** farkla buluştu; rozet `BEYAN → OLCULDU`. 🔻 **Kalan ① KÜÇÜLDÜ 25.08.2026 — ÜÇ SORUNUN İKİSİ CEVAPLANDI `(K)`:** birim **2 İŞ GÜNÜ** (takvim günü değil) · çıpa **KARAR ANI** — _"analizden dönen ürün seçeneklerden biri seçildiğinde"_, kargo kodu DEĞİL. ⚠ İki aday çıpa arasındaki mesafe de ölçeğiyle geldi: seçimden sonra kayıt **~1 saat** "İhtilaflı"da bekleyip aksiyona geçiyor — yani fark **saat**, gün değil (gece yarısını geçerse 1 iş günü eder). ✅ **ÜÇÜNCÜ SORU DA CEVAPLANDI 25.08.2026 `(K)` — ve cevap şıkların hiçbiri değil:** _"iade otomatik olarak MÜŞTERİNİN AÇTIĞI SEÇENEKTEN kapanır; kusurlu üründen açılmışsa ve biz değişim deyip göndermediysek **kusurlu ürün gönderme cezasıyla** kapanır, müşteriye parası yatırılır."_ ⚠ **Sonucu bizim eylemimiz değil MÜŞTERİNİN SEBEBİ belirliyor** — "ceza kesilir" demek eksik olurdu. ⚠ **Beş sayacın EN PAHALISI:** 2 ve 3 dolunca mal yok/para gitti; beşinci dolunca **mal BİZDE kalır, para yine gider, üstüne ceza biner.** ⛔ **Cezanın KENDİSİ ölçülmedi** (hangi sebep hangi ceza, tutar ne) — sistem mekanizmayı yazar, rakamı YAZMAZ. ⚠ **ROZET `BEYAN`, `OLCULDU` DEĞİL:** tek kaynak var; §12.2'deki `10 gün` üç bağımsız kaynakla terfi etmişti. ⚠ **KOD TARAFINDA İKİ EKSİK ÖLÇÜLDÜ:** `SAYAC_KURALLARI`nda **birim alanı yok** (öteki dördü takvim günü, hesap `gunEkle`) ve `isGunuEkle` **resmî tatil saymıyor, yalnız hafta sonu**. Şema DEĞİŞMİYOR — çıpa `GECIS_ANI`, sütun `islemSonTarihi`, ikisi de mevcut. ⚠ **KAPSAM AÇIK:** beyan **analiz yolunu** anlatıyor, sayaç `ITIRAZ_KABUL`e gelen **üç yolda** işliyor (`ITIRAZ_ACILDI` · `ITIRAZ_INCELEMEDE` · `ANALIZ`). Gereken (hem (c) hem terfi için): "Reddedilen" sekmesindeki bir iadenin detayı (karar tarihi + kargo kodu + kalan süre aynı ekranda). ⏳ **Kalan ②:** N11 — tecrübe yok, süresiz bekler. |
| **H15** | **N11 ritmi** | Komisyonlar hangi sıklıkla değişiyor? Cevapsızken envanter "ölçülemedi" diyor. |

---

## 🔨 BİZDE — iş bekleyen

| # | İş | Durum |
|---|---|---|
| **K110** | **PARTİYİ BEN SEÇEYİM (belirli tanımlama) · [KOD KOŞTU 31.08.2026]** | ✅ Satış formunda parti seçici; şema değişikliği **SIFIR** — yeni dağıtım gövdesi yazılmadı, `fifoDagit`e verilen listenin SIRASI değiştirildi (`partileriOncele`). ⚠ **SEÇİCİ DARALTILDI:** ölçüt "2+ parti" değil **"maliyeti FARKLI 2+ parti"** — ölçüldü, 102 çok partili varyantın **61'inde maliyetler aynı**, yani gürültünün %60'ı bu ölçütle düştü. Bekçi `parti-secimi:dogrula` 29/29 · mutasyon 7/7. |
| **K111** | **UPC-A OKUNMUYORDU · [KOD KOŞTU 31.08.2026]** | ✅ `UPCA`/`UPCE` `EAN13`in KARDEŞİ (`EANUPC` altında) — EAN13'ü açmak onları KAPSAMIYOR. Mattel kutusu bu yüzden okunmuyordu; katalogun **%9,2'si** okunamaz hâldeydi. Biçim listeleri `src/lib/barkod-formatlari.ts`e taşındı ki bekçi kaynağı taramak yerine **çağırsın**. Bekçi `kamera:dogrula` 50/50 · mutasyon 8/8. |
| **K112** | **MAL KABUL → SATIŞA AÇILMA · [ÖLÇÜM YAPILDI 31.08.2026]** | ✅ Ölçüm koştu, CSV üretildi. ─── ② **K112a PANEL SÜTUNU · [KOD KOŞTU]** — panelin "Alım" ekseni `receivedAt`e çevrildi ve adı **"Mal kabul"** oldu; rakama tıklanınca `/mal-kabul` günün girişlerini VARYANT düzeyinde açıyor (kanal rozetleri: yalnız **"kod var" / "kod yok"** — _"satışta"_, _"aktif"_, _"yayında"_ ibareleri YASAK, sistem onu bilmiyor). Süzgeç + arama + `eksik=1` var. Bekçi `mal-kabul:dogrula` 31/31 · mutasyon 10/10. ─── ③ **K112b TY TAM TARAMA — [AÇIK]** 33 sayfa listeleme taraması, beş sınıf (A–E) + CSV + ham JSON. İki kez araç sorunundan düştü; sayılar **hâlâ bilinmiyor**. |
| **K113** | **BARKOD YAKALAMA TEŞHİSİ · [KOD KOŞTU 31.08.2026]** | ✅ Teşhis satırı + "Kareyi kaydet" düğmesi + masaüstü çözme aracı. ⛔ Davranış DEĞİŞMEDİ (çözünürlük isteği ve biçim listesi elden geçmedi — kullanıcı şartı). Aras etiketi için üç hipotez elendi; **yakalama yolu gerçek cihazda ölçülmeden dördüncü hipotez kurulmaz.** Bekçi `kare-tanisi:dogrula` 35/35 · mutasyon 9/9. |
| **K114** | **`/alimlar` TARİH EKSENİ SEÇİCİSİ — [AÇIK]** | Kullanıcı 31.08'de "bugün teslim aldıklarım çıkmıyor" dedi; liste **sipariş** tarihine göre süzüyor, mal kabul tarihine göre değil. K112a paneli çözdü ama `/alimlar` ekranı hâlâ tek eksenli. ⚠ **BOŞ SONUÇ KENDİNİ ANLATMALI** — "kayıt yok" değil, "bu ekran SİPARİŞ tarihine bakıyor" yazmalı. |
| **K115** | **MALİYET YÖNTEMİ FİRMA SEÇENEĞİ · [① KOD KOŞTU 31.08.2026]** | ✅ **①** Şema canlıda (`MaliyetYontemi` · `LotKipi`, migration 43) — **taban birebir doğrulandı** (hareket 10780 · negatif 6082/6082 · satış 5843 · NET-2 1.713.105,5422 önce/sonra AYNI). Üç lot kipi (FIFO · HIBRIT · LOT) **tek motor** üstünde; varsayılan `HIBRIT` (`FIFO` seçilseydi K110 seçicisi sütun eklendiği an sessizce kaybolurdu). Hareketli ortalama gövdesi yazıldı ama **ARAYÜZDE KAPALI ve sunucuda REDDEDİLİYOR** (`ACIK_YONTEMLER = ["FIFO"]`). Ayar ekranı + dönem sınırı kapısı (`yontemDegisimKarari`) hazır. Bekçi `lot-kipi:dogrula` 22/22 · mutasyon 8/8. ─── ② **[KOD KOŞTU 31.08.2026 — YARISI TESLİM EDİLEMEDİ, GEREKÇE ÖLÇÜLDÜ]** ⛔ **"Kurgu firmayı FIFO'ya sabitle" BUGÜN ETKİSİZ:** `fifo-dogrula.ts`te firma kurgusu YOK (eşleşen şey `companySku`, ürün alanı) · `maliyetYontemi` sütununu **hiçbir yer OKUMUYOR** · `hareketliOrtalama` gövdesinin **ÇAĞIRANI YOK**. Sabitleme satırı yazılsaydı hiçbir şey yapmaz ve onu kaldıran mutasyon YEŞİL kalırdı — anayasa bunu yasaklıyor ("ölçüt mutasyonsuz teslim edilmez"). **③ bağlandığı gün anlam kazanır ve o gün yazılır.** ✅ **TESLİM EDİLEN YARISI: `maliyet-yontemi:dogrula` 27/27 · 6 bölüm · mutasyon 11/11** (− 6 · + 5) — motor VE değişim kapısı birlikte. İki değişmez her senaryoda ayrıca ölçülüyor (havuz maliyeti ≥ 0 · havuz adedi = ledger adedi). ⚠ **İKİ MUTASYON İLK TURDA KAÇTI, İKİSİ DE KÖR VERİ:** ① fazla çıkış kapısı — `2@100 → −5` iki okumada da `STOK_YOK` veriyordu; ayrım ancak çıkıştan SONRA yeni giriş gelince göründü. ② kuruş tozu sıfırlaması — **200+ kurgu tarandı, kalıntı üreten TEK BİRİ YOK**; satır savunma amaçlı ve **bugün tetiklenemiyor**, korumasız olduğu harness'te BEYAN edildi ve kaynaktaki abartılı iddia ("0,0001 sızardı") ölçüme göre düzeltildi. ─── ③ ortalama motorunu bağla → seçeneği görünür yap → mutasyon turu. ─── ④ **KART PARTİ PANELİ [KOD KOŞTU 31.08.2026]** — ürün kartında açık partiler (tarih · adet · maliyet · alım kodu · "sıradaki" rozeti · toplam). İki ölçüm tasarımı değiştirdi: şerh **107/231 varyantta (%46,3)** yanıyor ve K91b kapandığı için kapatılamaz → uyarı şeridi değil **gri dipnot**; kodsuz 100 partinin **88'i `COUNT_CORRECTION`** → "bağlanamadı" değil hareketin ADI yazıyor. Bekçi `kart-partileri:dogrula` 12/12 · mutasyon 8/8. |
| **K116** | **SAĞLIK TURU KALICILAŞTIRMA — [KOD KOŞTU 31.08.2026]** | ✅ **①** `siparisKesintiKurallari` ORTAK GÖVDEYE çıkarıldı — ⛔ ölçüldü ki aynı kural **İKİ YERDE birden** yazılıydı (`satis.ts` + `kar-yeniden.ts`); biri kaysaydı bir yol çift sabit gider yazar, öteki yazmazdı. Korunan değişmez: **sipariş başına kesinti BİR KEZ** (`SABIT_GIDER`·`HIZMET_BEDELI`·`ODEME_GIDERI`). Ölçüldü (canlı): bölünmüş 86 satışın HİÇBİRİNDE ikinci satır yok — doğru çalışıyordu ama **korumasızdı**. `kar:dogrula` 74 → **82 ölçüt**; 5 mutasyon (tekilleştirmeyi kaldıran · `PER_PACKAGE` düşüren · `PER_ITEM` sızdıran · paket işaretini hep true yapan · kodu her seferinde yeni yapan) **beşi de kırmızı**. ⚠ **VE ESKİ ÖLÇÜT REFAKTÖRLE KÖRELDİ:** `kar:dogrula` `.filter(...)` desenini iki dosyada arıyordu, davranış ortak gövdeye taşınınca kırmızı yandı — kod doğruydu, aranan DİZE taşınmıştı _(anayasa: "dize, davranışın vekilidir")_. Ölçüt gevşetilmedi, **değer testine çevrildi**: artık desen aranmıyor, gövde ÇAĞRILIP değeri ölçülüyor. ─── ✅ **②** ADET=0 kalemi TEŞHİS EDİLDİ: TY `10559161422` (02.10.2025, içe aktarma `satis-20260826215218`), **iptal DEĞİL**, `CALCULATED`, NET-2 ₺69,475; satışta **başka bir kalem daha var** (adet 1) ve bağlı iki hareket `SALE_OUT −1` + `SALE_CANCEL_IN +1` = **net 0**. Yani bu bir bozulma değil, **adedi 1→0 indirilmiş bir kalemin ledger-tutarlı izi**; ciro katkısı 0, stok etkisi 0. ⛔ **Sil/düzelt kararı mimar + Halil’de** — silmek indirimin izini yok eder. ─── ⛔ **③ ÖNCÜLÜ ÖLÇÜMLE ÇÜRÜDÜ, İŞ AÇILMADI:** "maliyeti null olan stok (bugün 14 adet)" — **elde duran böyle stok YOK** (431 açık partinin **0**’ında maliyet boş). İstenen ayrım `envanter.ts`te **zaten var** ve çalışıyor: `bilinmeyenler` ayrı kovada, toplama girmiyor, `/envanter-degeri`de kendi kartı var. ⚠ **"14 adet" BENİM RAPORUMDAKİ BAŞKA BİR RAKAMDI** ve eksik yazmışım: maliyeti damgalanmamış **ÇIKIŞ** hareketleri — 6 hareket, **19 adet** (14 değil; `COUNT_CORRECTION −14` + 4 `ADJUSTMENT` + `COUNT_CORRECTION −1`). Bu envanter DEĞERİ sorunu değil, **gider tarafı boşluğu**: o mallar defterden maliyetleri giderleşmeden çıktı. → **K118 açıldı.** ─── ✅ **④** pano satırı yazıldı (ölçüm kayıtlarında). |
| **K118** | **MALİYETİ DAMGALANMAMIŞ ÇIKIŞLAR — [ÖLÇÜLDÜ · ÖNCÜL ÇÜRÜDÜ · KAPALI]** | ⛔ **BENİM KURDUĞUM CÜMLE YANLIŞTI ve ölçümle düzeltildi.** _"O mallar defterden maliyetleri giderleşmeden çıktı"_ demiştim; ölçüldü (31.08.2026, canlı): damgasız **GİRİŞ 5 hareket · 19 adet**, damgasız **ÇIKIŞ 6 hareket · 19 adet**, **NET 0 — dört varyantın DÖRDÜNDE de.** Bunlar iptal/geri-alma ve sayım düzeltme çevrimlerinin **AYNA ÇİFTLERİ**; gider tarafında boşluk YOK. ─── **①** FIFO'dan türetme ÖLÇÜLDÜ (yazılmadı): 6 çıkışın **3'ü türetilebilir (₺7.902,45)**, 3'ü türetilemez (o an açık parti yok — sayım eksiği olduğu için mal zaten FIFO'da değil). ⛔ **AMA TÜRETİLENİ YAZMAK BOŞLUK KAPATMAZ, AÇAR:** o üçü de bir ayna çiftinin çıkış yarısı ve giriş yarısı da damgasız; yalnız birine damga yazmak ₺7.902'lik bir dengesizlik ÜRETİRDİ. ⚠ Ve ölçümün kendisi bir yalancı yeşil ürettiği için düzeltildi: `p.birimMaliyet === null` kontrolü `FifoPayi` şekli `{parti, adet}` olduğu için **`undefined`**e bakıyordu; üç satır `NaN` tutarla "✓ türetilebilir" işaretlendi. Çıkış TEK KAPIDAN (`Number.isFinite`) geçirildi. ─── ⛔ **② EKRAN YAZILMADI — GEREKÇESİYLE.** Boşluk olmadığı için kart hep boş görünürdü; K49: okunmayan satır kutunun TAMAMINA olan güveni eritir. Yerine **DEĞİŞMEZ** kuruldu: `npm run canli:damgasiz-denge` — damgasız hareketler varyant bazında net sıfır olmalı; **iki yön AYRI** sayılır (net&lt;0 giderleşmemiş mal çıkmış · net&gt;0 maliyeti bilinmeyen mal girmiş). Gerçek bir boşluk doğduğu gün konuşur. ─── ✅ **③ SINIF ALANI AÇILMADI, VARSAYILAN YAZILMADI** — kullanıcı şartına uyuldu; vergi sınıflaması kodda karar edilmedi. ─── **BEKÇİ:** `damgasiz-denge:dogrula` **26/26** (4 bölüm) · mutasyon **5/6 kırmızı**. ⚠ Karar canlı betiğin İÇİNDEYDİ ve sınanamıyordu (canlıda dengesizlik yok → `net<0` ve `net>0` dalları hiç çalışmıyor; iki mutasyon yeşil geçti). Saf gövdeye (`damgasiz-denge.ts`) taşınıp kurguyla sınandı. ⚠ Kalan 1 mutasyon **davranışsal olarak ETKİSİZ** (`Math.abs(0) === 0`) ve **beyan edildi** — sahte ölçüt yazılıp "6/6" denmedi. ⚠ **VE HARNESS'İN KENDİSİ İKİ KEZ KUSURLUYDU:** grep desenine Türkçe karakter yazılmıştı (kabuk kodlaması tutmadı) ve ayıraç desendeki iki dik çizgiyle çakıştı; ikisi de "bekçi çöktü" diye YANLIŞ rapor üretti — bekçi aslında yakalamıştı.
| **K108** | **MUHASEBE DÖNEMİ · [TESLİM EDİLDİ · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 31.08.2026]** Şema canlıda (`MuhasebeDonemi`, migration 42/42, `deploy:bekci` yeşil) · kapı **beş yola** bağlı · ısrar bloğu üç formda · kapatma ekranı · dönem raporu · panel göstergesi. ⛔ **SIRA KURALI TUTULDU:** kapatma ekranı ancak kapı bağlandıktan SONRA açıldı — önce açılsaydı Halil dönemi kapatır ve korunduğunu sanırdı. 📏 **KAPININ TABANI ÖLÇÜLDÜ:** günlük operasyonun 542 hareketinin **212'si (%39,1)** önceki aya yazılıyor ve **204'ü `PURCHASE_IN`** (%96,2 geç girilen alım) — tam yasak günlük işin %39'unu kilitlerdi. Halil'in _"ciddi bir uyarı olsun, kesin aşılmaz kural değil"_ düzeltmesi **veriyle doğrulandı**. ⚠ **İKİNCİ MANTIK YAZILMADI:** ısrar kapısı sayımın `israrGecerliMi` gövdesinden; kapı uygulaması `sayim-damgasi.ts` desenini birebir izliyor. Sebep listeleri AYRI (sayımınki FİZİKSEL, dönemin MALİ) ve ısrar bayrakları AYRI — tek bayrak ekranın YANLIŞ bloğu açmasına yol açardı. ⚠ **İÇE AKTARMA SORMAZ, ATLAR ve RAPORLAR;** sonuç PLANLANAN değil **gerçekten yazılan** sayıyı basıyor. ⛔ **GELECEK VE BUGÜNKÜ DÖNEM KAPATILAMAZ** — bitmemiş ay kapatılırsa o ay boyunca her kayıt ısrar ister ve kutu anlamını yitirir. ⚠ **RAPOR YENİ HESAP YAZMIYOR:** envanter `envanterVerisi(dönem sonu)`, kesintiler defterdeki `SaleFee`, NET'ler satışın snapshot'ı. Her rakam **kapsamıyla** ("N satış üstünden"), açık dönem **"değişebilir" şerhi** taşıyor, PDF tarayıcının yazdırması (ikinci bir biçimlendirme yolu açılmadı). ✅ **BEKÇİ: `donem:dogrula` 39 ölçüt · 5 bölüm · `donem-mutasyon:kontrol` 12/12** (− 5 · + 7). ⚠ **VE İKİ MUTASYON İLK TURDA KAÇTI, İKİSİ DE FARKLI SINIFTAN:** ① _"açık dönem yokken kilitleniyor"_ — ölçüldü, `size === 0` erken dönüşü **davranış için gereksiz** (`has()` boş kümede zaten `false`); anlamsız mutasyon **gerçek riskle** değiştirildi (koşulu ters çevirmek). ② _"içe aktarma atlamıyor"_ — bekçide **ölçütü yoktu**: çağrının varlığı sonucun KULLANILDIĞINI göstermiyor; üç ölçüt eklendi (süzülmüş liste yazılıyor · atlananlar raporlanıyor · sayı yazılandan). ⏭ **HALİL TESTİ BEKLİYOR.** |
| **K109** | **PANEL GRAFİĞİNDE NOKTA TIKLANINCA RAKAM PENCERESİ · [AÇIK]** | 🕓 **[AÇILDI 31.08.2026]** Kullanıcı: _"buradaki noktalarda üzerine tıklandığında küçük bir pencerede rakamlar görünebilsin."_ Son 12 ay grafiğinde (NET-2 ve ciro çizgileri) nokta başına ay · ciro · NET-2 gösteren küçük bir pencere. ⚠ **ÖLÇÜLECEK:** grafik bugün hangi gövdeden çiziliyor ve dokunma hedefi telefonda 44 px'e çıkarılabiliyor mu (İlke #8) — nokta yarıçapı bugün küçük. Kod yazılmadı.
| **K107** | **MALİYET YÖNTEMİ SEÇENEĞİ (FIFO ↔ hareketli ortalama) · [ERTELENDİ — açılış şartı: İKİNCİ FİRMA]** | 🕓 **[ÖLÇÜLDÜ 31.08.2026, KOD YAZILMADI]** ⚠ **Kimlik notu: kullanıcı bunu `K99` diye açtı ama o kod ALINMIŞTI** (iki farklı "tam yetkili" ölçütü, 30.08) — K107 olarak açıldı. **⛔ KARAR: PAKET 2·3·4 BUGÜN AÇILMIYOR.** _Gerekçe (kullanıcı, 31.08.2026):_ ① canlıda **tek firma** var ve FIFO kullanıyor — ortalama yöntemini bugün kimse kullanmayacak, yani **tüketicisi doğmadan yapı açmak** olurdu (K52 sınıfı: yazıcısı olmayan alan, boş bir vaat); ② `Company` **hiçbir veriye bağlı DEĞİL** (ölçüldü: ilişkileri yalnız `uyelikler` · `auditLogs` · `talepler`), yani _"firma bazında yöntem"_ bugün **"tek firma"** demek — çok-firma katmanı olmadan seçenek **fiilen yok**. ⏭ **AÇILIŞ ŞARTI: ikinci firma kaydı.** O gün paketler **1→2→3→4 sırayla** açılır. 📏 **FİZİBİLİTE ÖLÇÜMÜ (salt okuma, canlı):** **① Dağınıklık YOK — hüküm bu.** Maliyete dokunan 68 dosya var ama _"maliyet nedir"_ sorusunu cevaplayan **TEK gövde**: `src/lib/stok.ts` (`acikPartiler` · `acikPartilerToplu` · `fifoDagit` · `partileriSinirla`). Kalanlar ya onu **çağırıyor** (15 dosya) ya **damgayı okuyor** (32 dosya). Kullanıcının ölçütüyle _"1'e yakınsa iş orta"_ — **1'dir**, yani asıl kod işi görece küçük. **② ASIL MALİYET BEKÇİDE:** `fifo:dogrula` **23** · `parti-bagi:dogrula` **14** · `fifo-sinir:dogrula` **19** ölçüt ortalama yönteminde **tamamen anlamsızlaşır** (toplam **56**); ayrıca 8 bekçide **63 ölçüt** daha parti/FIFO/maliyet/damga değiyor → **~119 ölçüt etkilenir.** ⭐ **VE BEKÇİ YÖNTEMİ KARARA BAĞLANDI (kullanıcı, 31.08):** 119 ölçütü **tek tek şartlandırmak DEĞİL**, bekçi turunu **İKİ KÜMEYE ayırmak** — FIFO bekçileri yalnız FIFO firmasında koşar. _(Öneri olarak kayıtta; o gün ölçülüp kesinleşir.)_ **③ HAREKET YAPISI — beklenenden İYİ:** `StockMovement.unitCostAmount` **zaten var ve zaten dolu** (şemadaki yorumu bile _"ileride stok değerlemesi için saklanır"_ diyor). Canlı ölçüm: 10.774 hareket · giriş 4694/**4689 damgalı** · çıkış 6080/**6074 damgalı**. Ortalama yönteminde `SALE_OUT` damgası hareket anındaki hareketli ortalamadan gelir — **damga için yeni alan GEREKMİYOR.** ⛔ **AMA `sourceMovementId` SORUN:** bugün çıkışların **6080/6080'i (%100)** partiye bağlı; ortalama yönteminde parti kavramı yok → alan boş kalır → `parti-bagi:dogrula` **her ortalama-firmada her harekette** kırmızı yanar. **④ ŞEMA:** merdiven inildi — damga için ① mevcut alan **yeterli** ✓; yöntem ayarı için ①✗ ②✗ (menuDuzeni menünündür, overload olur) ③✗ → **2 sütun/tablo**: `Company.maliyetYontemi` + dönem kaydı. **⑤ ÖNERİ: HAREKETLİ ortalama** — basit ortalama dönem sonu ister ve **üç şeyi birden kırar**: fiyat denemesi anlık maliyet istiyor · NET satış anında snapshot'lanıyor · dönem içinde her satış `NO_COST` damgalanırdı (anayasa: _"bilinmeyen sıfıra çevrilmez"_). Sistem her hareketi sıralı tuttuğu için hareketli ortalama **hesaplanabilir** (teyit edildi). **⑦ LOT TAKİBİ TANITIMDA VAAT EDİLEBİLİR ✅** — parti alanları `hareketId · occurredAt · girenAdet · kalanAdet · birimMaliyet · paraBirimi · locationId`; satış→parti sorgusu **%100 dolu**; parti kodu ürün kartında görünür (`ALM-HB-260821-13`, tedarikçi ve giriş tarihiyle). Tanıtım metni buna göre güçlendirildi (**raf** izlenebilirliği eklendi). ⛔ **LIFO KAPSAM DIŞI:** ölçülmedi, tartışılmadı, şemaya konmadı. _Gerekçe:_ VUK ve TMS 2'de **yasak**; sisteme koymak kullanılamayacak bir yöntemi taşımak ve **her bekçiye üçüncü bir şart** eklemek olurdu. |
| **K105** | **FİYAT DENEMESİNDE KARGO ÜCRETİ ZORUNLU OLDU · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"kargo ücreti girmek zorunlu olsun ve uyarı versin, yoksa unutuluyor."_ ⛔ **BOŞ BIRAKMAK SESSİZCE "KARGO YOK" DEMEKTİ.** Alanın kendi ipucu bunu teşvik ediyordu (_"Boş bırakırsan kargo hesaba girmez"_) ve NET **olduğundan YÜKSEK** çıkıyordu — fiyat kararı o iyimser rakamdan veriliyordu. Ekran susmuyor, **yanlış cevap veriyordu.** ⭐ **AMA YASAK DEĞİL, BEYAN: `0` GEÇERLİ.** Tam yasak, kargosuz meşru satışı (elden satış · alıcı ödemeli) **kilitlerdi** — düzeltme, düzelttiğinden büyük hasar verirdi. Sınır `null` ile `0` ARASINA konuldu, sıfırın kendisine değil: aradaki fark **unutmak ile karar vermek** arasındaki farktır. _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez"; 29.08 FIFO vakasının aynısı.)_ ⚠ **KAPI SESSİZ DEĞİL, HANGİ ALANI BEKLEDİĞİNİ SÖYLÜYOR.** `girdiEksikMi` yerine `eksikSebebi()` geçti: `FIYAT → ALIS → KDV → KARGO` sırasıyla, yani **doldurma sırasıyla** cevap veriyor. İki alan birden eksikken yazılan, kullanıcının BİR SONRAKİ adımı; rastgele biri seçilseydi ekran onu ileri geri gezdirirdi _(İlke #5, #9)_. ⚠ **UYARI KARGO ALANININ YANINDA**, sonuç kutusunda değil — çare tam orada ve gözü zaten orada. Metin çareyi de yazıyor: _"Kargoyu alıcı ödüyorsa 0 yaz."_ Alanın eski ipucu da düzeltildi. ✅ **BEKÇİ: `simulasyon:dogrula` 181 ölçüt** (K105 bölümü) · **`simulasyon-mutasyon:kontrol` 6/6** (− 4 · + 2). ⚠ **KAPSAM BEYAN EDİLDİ:** mutasyon harness'i 181 ölçütün TAMAMINI değil, **yalnız K105 kapısını** sınıyor; gerisi ayrı bir iş ve bugün açılmadı. ⚠ **VE İKİ ÖLÇÜT ESKİDİ, SUSTURULMADI:** bekçide `kargoUcreti: null` ile _"kargo yok"_ demek isteyen iki senaryo vardı; NİYETLERİ doğru, eskiyen şey ifade biçimiydi — `0`a çevrildi ve niye çevrildiği yerinde yazılı. ⚠ **HARNESS ÇAPASI DA DÜZELTİLDİ:** bir mutasyon bekçiyi K105 bölümüne VARMADAN çökertiyor ve harness haklı olarak _"ölçüm geçersiz"_ diyordu; çapa bekçinin AÇILIŞ başlığına taşındı — kapının işi _"bekçi koştu mu"_ sorusunu cevaplamak, koşum ortasındaki çökme zaten geçerli bir yakalamadır. ⏭ **HALİL TESTİ:** `/simulasyon` → ürün kodu bul · satış ve alış fiyatı gir · **kargoyu BOŞ BIRAK** → hesap **çıkmamalı**, kargo alanının altında turuncu uyarı ve sonuç yerinde _"Kargo ücreti bekleniyor"_ yazmalı · kargoya **0** yaz → hesap **anında çıkmalı** · kargoya **120** yaz → NET, 0'lı hâlinden **DÜŞÜK** olmalı (kargo gider). |
| **K104** | **STOK SÜZGECİ DETAYA GİRİP DÖNÜNCE KAYBOLUYORDU · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"Anker süz → sırala → ürüne gir → geri dön → filtre gitmiş."_ Marka/grup bazlı seri işlem (etiket · sayım · raf) bu ekranda yapılıyor; her dönüşte süzgeci yeniden kurmak doğrudan işçilik. ⚠ **KİMLİK NOTU: KULLANICI BUNU `K57` DİYE AÇTI, AMA O KOD ALINMIŞTI** (sayım tekrar koruması, 28.08) — kimlik tekildir, kalem K104 olarak açıldı. 📏 **ÖLÇÜM:** üç durumun **üçü de zaten adresteydi** (`q` baştan beri, `sirala`/`yon`/`stok` bugün K101'le) — yani _"durumu URL'ye taşı"_ işi büyük ölçüde yapılmıştı ve **tarayıcının geri tuşu bugün bile doğru çalışıyordu.** İki gerçek kopukluk vardı: ① `StokArama.ara()` adresi **sıfırdan kuruyordu** (`/stok?q=X`), yani arama yapmak sıralamayı ve sıfır süzgecini **siliyordu**; "Temizle" de düz `/stok`'a gidip her şeyi süpürüyordu. ② `/stok/[variantId]` detayındaki **"‹ Stok" bağlantısı sabit `href="/stok"`** idi — kullanıcının bildirdiği kaybın doğrudan sebebi. ⭐ **ÇARE:** arama artık mevcut parametreleri koruyor (`sayfa` bilerek düşüyor — yeni arama bambaşka bir liste), "Temizle" yalnız `q`'yu düşürüyor, ve geri bağlantısı `router.back()` çağırıyor. ⚠ **GÖVDE HÂLÂ GERÇEK BİR `<Link>`:** JS çalışmasa da, sayfa doğrudan linkle açılmış da olsa `/stok`'a gider; `back()` yalnız geçmiş varsa devreye giriyor. En kötü ihtimalde bugünkü davranışa düşer. ⛔ **TALİMATIN İKİ MADDESİNE ŞERH DÜŞÜLDÜ:** ① `router.replace` gerekçesi (_"her tuş vuruşu history'ye kayıt açmasın"_) bu kodda **geçersiz** — arama tuş başına değil Enter/düğme ile tetikleniyor, debounce yok; ayrıca sıralama çipleri `<Link>` (push) ve aramayı `replace` yapmak iki benzer eylemi ayrıştırırdı. ② _"kamera/barkod için ayrı state kalmasın"_ **uygulanmadı ve bu bir koruma:** yerel `sorgu` ayrı doğruluk kaynağı değil, **yazılmakta olan taslak**; kaldırılırsa kutu DOLDURULAMAZ hâle gelir (26.08 canlı arızası — kullanıcı yazar, React her tuşta eski değeri geri yazar, hiçbir hata çıkmaz). Okunan kod zaten `onOkundu` ile **doğrudan parametre** geçiyor. ⚠ **BEYAN EDİLEN SINIR:** tarayıcı _"geçmişteki önceki adres bizim sitemiz mi"_ sorusunu cevaplamıyor (`history.length` sekmenin TOPLAM geçmişini sayar). Tek kaçak durum: başka sitede gezinip AYNI sekmede doğrudan bir ürün detay linkini açmak. Operasyonda gerçekleşmiyor, bedeli bir geri tuşu. **Param şeması:** `/stok?q=Anker&sirala=ad|adet|hareket&yon=artan|azalan&stok=var`. ⏭ **HALİL TESTİ — İKİ YOL AYRI AYRI:** `/stok`ta "Anker" ara → **Adet**'e göre sırala → **Sıfır stokluları gizle** → bir ürüne gir → **(a) tarayıcı geri tuşu** ile dön, **(b) "‹ Stok"** bağlantısıyla dön. Her iki yolda da arama + sıralama + süzgeç **DURMALI**. Ayrıca: süzgeçler açıkken kutuya yeni bir şey yazıp Ara'ya bas → **sıralama ve süzgeç kaybolmamalı**; "Temizle"ye bas → yalnız arama düşmeli. |
| **K100** | **BARKOD BAŞTAKİ SIFIR — okutulan kod bulunamıyordu · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Halil `/yerlestir`de `0194644037598` okuttu, ekran _"Bu kod ne ürün ne raf olarak bulundu"_ dedi; baştaki sıfır ELLE silinince ürün çıktı. Bilgi sistemde VARDI — ekran susmuyor, **YANLIŞ CEVAP** veriyordu. ⭐ **TEŞHİS: UPC-A ↔ EAN-13.** UPC-A 12 hanedir, EAN-13 aynı kodun başına `0` konmuş hâli; okuyucu 13 hane döndürüyor, katalogda 12 hane yazılı. ⛔ **KURAL ÖLÇÜLMEDEN YAZILMADI** — soru _"kırpmak doğru mu"_ değil, **"kırpınca iki AYRI ürün aynı koda düşüyor mu"** idi (kodlar TAM eşleşmeyle aranıyor; yanlış eşleşme YANLIŞ ÜRÜNE yazar). `npm run canli:barkod-sifir` (salt okuma, n=1104): **12 hane 104 · 13 hane 925 · kural yüzünden çakışan anahtar 0 · zaten çakışan 0 · KURTARILAN okuma 104** (katalogun %9,4'ü) · gönderi numarası 12/13 hane **0** (o role hiç dokunmuyor). Beş kod rolünün beşinde de çakışma sıfır. ⚠ **BEYAN EDİLEN SINIR: yalnız 12↔13 ölçüldü.** Katalogdaki **3 adet 14 haneli (GTIN-14)** barkodun eşdeğerliği ÖLÇÜLMEDİ ve kural onlara DOKUNMUYOR; bir GTIN-14 okuması kaçarsa açılış şartı aynı ölçümü 14 hane için koşmaktır. ⚠ **VE ALTI KOPYA BULUNDU:** `/stok` · `/urunler` · `alim-arama` · `liste-suzgeci` · dışa aktarmada iki yer paylaşılan kuralı **kullanmıyordu** — yani _"düzelttim"_ demek o ekranlara ulaşmamak olurdu. Hepsi bağlandı, rol kümeleri ve `isActive` şartları DEĞİŞMEDİ. ⛔ **ÇARE DOSYA LİSTESİ DEĞİL DESEN YASAĞI:** çıplak `barcode: { contains: X }` yazılamaz, `X` `kodEsdegerleri(...)` dönüşünden gelmek zorunda (**532 dosya taranır, liste tutulmaz**) — yedinci ekran eklendiğinde de yakalanır. ⏭ **HALİL TESTİ:** `/yerlestir`de `0194644037598` okut → **Soundcore K20i Mor-A3994** gelmeli; `/stok` arama kutusuna aynı kodu yapıştır → ürün çıkmalı. |
| **K101** | **STOK EKRANINDA SIRALAMA VE SIFIR SÜZGECİ YOKTU · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"Sırala tuşu yok. Sıfır stoklulari filtreleme tuşu da olsun; sıralama tarih, adet gibi."_ 📏 **ÖLÇÜLDÜ (canlı, salt okuma):** 1104 varyant · **stok > 0 → 230** · stok = 0 → 823 · **stok < 0 → 0** · **HİÇ hareketi olmayan 51** · `groupBy` 607 ms (ağ tabanı 34 ms). Yani ekranın **%79'u** operasyonda elde OLMAYAN mal. ⭐ **İKİ KARAR ÖLÇÜMDEN ÇIKTI:** ① süzgeç ölçütü **`≠ 0`**, `> 0` DEĞİL — bugün ikisi aynı 230 satırı veriyor ama `> 0` yarın doğacak bir **negatif stoğu sessizce gizlerdi** ve negatif stok tam da görülmesi gereken bir anomalidir; ② hareketi hiç olmayan 51 varyant `groupBy`'da YOK, sıralamada **0 sayılır** — yoksa sıralamaya basan kullanıcı onları sessizce kaybederdi. ⛔ **TUZAK: "mevcut stok" ve "son hareket" `ProductVariant` KOLONU DEĞİL**, `StockMovement` defterinden türer. Sayfayı çekip eldeki 50 satırı sıralamak ekranı yalancı yapardı (2. sayfada 1. sayfadan büyük adet çıkar, hiçbir şey hata vermez) — **sıra SÜZGECİN TAMAMI üzerinde kuruluyor, sonra sayfa dilimleniyor.** _(K61'in kardeşi: orada TOPLAM sayfaya düşüyordu, burada SIRA.)_ ⚠ Ölçüm YALNIZ gerektiğinde koşuyor; varsayılan sıra (ad) `orderBy` ile çözülüyor ve ek sorgu üretmiyor. ⚠ **EXCEL DE AYNI KÜMEYİ VERİYOR** — ölçüt paylaşılan `stoguVarMi` gövdesinden; yoksa ekran 230 gösterirken dosyada 1104 satır olurdu. ⏭ **HALİL TESTİ:** `/stok` → **"Sıfır stokluları gizle"** çipine bas, sayaç **230 varyant** olmalı · **Adet** çipine bas, en çok stoklu üstte gelmeli · tekrar bas, yön çevrilmeli · **Son hareket** çipine bas · sayfa 3'e geç, sonra sıra değiştir → **1. sayfaya dönmeli** · Excel indir → satır sayısı ekrandakiyle **aynı** olmalı. |
| **K102** | **KÂR CÜMLESİ OKUNAMIYORDU — satış fiyatı hiçbir yerde yoktu · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı: _"ürüne tıkladığımda gelen kârlılık… satış fiyatı ile maliyet bir ekranda görülmeli, satış miktarı yok burda."_ ⛔ **BULGU DOĞRULANDI:** kartta maliyet, NET-2 ve marj vardı; **SATIŞ FİYATI hiçbir yerde yoktu.** Ekran _"%6,0 marj"_ diyordu ama **neyin %6'sı** olduğu okunamıyordu — operatör kârın hangi fiyattan çıktığını görmeden fiyat kararı veremez. ⭐ **ŞİMDİ DÖRT KUTU BİR CÜMLE KURUYOR:** `satış fiyatı − maliyet − kesintiler = NET-2` ve `marj = NET-2 / satış fiyatı`. Dördü de **AYNI paydadan** (`hesaplananAdet`) okunuyor; ayrışsalardı ekrandaki aritmetik tutmaz ve kullanıcı hangi kutunun bozuk olduğunu arardı. ⚠ **MALİYET `satilanBirimMaliyeti`** — sermaye veriminin de paydası. **Hesaplanıyordu ama HİÇBİR EKRANDA GÖSTERİLMİYORDU**; _"0.08x"_ kutusu paydasını söylemeden duruyordu. ⚠ Yukarıdaki "Maliyet ve hız" bölümündeki rakam **ELDE KALAN** partilerin ortalaması — satılanın maliyeti DEĞİL; ikisi yan yana konsa birbirini yalanlardı, bu yüzden ayrı kutu. ⚠ **SATILAN ADET DE BLOĞA GİRDİ:** ₺203,70 birim kâr, 1 adette ₺203,70 — 100 adette bambaşka bir iştir; ölçeksiz birim rakam kararın büyüklüğünü gizler. ⭐ **VE BİR KUTU ÖLÇÜMLE KALDIRILDI:** tek satışlı üründe `sonSatisNet2` ile `birimNet2` **matematik olarak aynı sayı** (ekran görüntüsünde ikisi de ₺203,70) — tek satışta gizleniyor, çok satışta ayrıştıkları için geri geliyor _(İlke #12)_. ⏭ **HALİL TESTİ:** Vestel ZİYAFET 8500 X kartını aç → Kârlılık bloğunda **Satış fiyatı / adet · Maliyet / adet · NET-2 / adet · Marj** yan yana olmalı; ikinci sırada **Satılan adet** görünmeli; `Satış fiyatı − Maliyet` farkı NET-2'den **büyük** olmalı (aradaki fark kesintiler). |
| **K103** | **ÜRÜN KARTININ SAĞI BOŞTU — fiyat denemesi sağ sütuna alındı · [KAPANDI · HALİL TESTİ BEKLİYOR]** | ✅ **[KOD KOŞTU 30.08.2026]** Kullanıcı ekran görüntüsünde boş alanı çerçeveleyip sordu: _"Fiyat dene modülü direkt kırmızı çerçeveli yerde görünse nasıl olur?"_ ⭐ **DOĞRU FİKİR:** masaüstünde kartın sağı tamamen boştu ve fiyat denemesi için aşağı kaydırmak gerekiyordu — oysa iki blok **birlikte** okunur: solda _"bu ürün ne kazandırdı"_, sağda _"bu fiyattan ne kazandırır"_ _(İlke #12: ekranda boşluk bilgi taşımaz)_. ⚠ **AYRIM `xl:` — ALTINDA TEK SÜTUN.** Telefon ve tablette kart tek sütun kalır ve blokların bugünkü sırası korunur; `lg:` seçilseydi 1024 px'lik bir tablette iki sütun 500 px'e sıkışır ve **ikisi de okunmaz** olurdu _(İlke #8: depoda birincil cihaz telefon)_. ⛔ **YAPIŞKAN (`sticky`) YAPILMADI — VE BU ÖLÇÜLMÜŞ BİR KARAR:** `FiyatDene` **kanal başına** bir kart çiziyor, yani yüksekliği kanal sayısıyla büyüyor ve ekranı aşabiliyor; ekranı aşan yapışkan blok kendi içinde **ikinci bir kaydırma** ister — faydadan çok yük olurdu. Bekçide kendi ölçütü var, biri _"iyileştirme"_ diye eklerse kırmızı yanar ve gerekçeyi okur. ⚠ **ALT EYLEMLER VE SKU IZGARANIN DIŞINDA, TAM GENİŞLİKTE** — ilk yazımda sağ sütunun içinde kalmışlardı ve masaüstünde fiyat denemesinin ALTINA düşüyorlardı; onlar sayfa düzeyinde öğeler, bir sütunun kuyruğu değil _(İlke #10)_. ⭐ **② HİZALAMA VE VURGU — kullanıcı düzeltmesi 30.08.2026:** _"Fiyat dene kartı, kırmızı çizgiden soldaki kartla aynı hizadan başlasın; ayrıca biraz öne çıkacak şekilde makyajla."_ ⛔ **SEBEP YAPISALDI:** künye (ürün adı · kodlar · KDV künyesi) SOL SÜTUNUN İÇİNDEYDİ; sağdaki kart sayfanın en tepesinden, soldaki ilk kart ise künyenin altından başlıyordu. Künye zaten **sayfa düzeyinde bir başlık** — ızgaranın ÜSTÜNE, tam genişliğe alındı ve iki sütun artık aynı çizgiden başlıyor. ⚠ **VURGU RENKLE DEĞİL YÜZEYLE:** `bg-card` + `shadow-md` + daha yuvarlak köşe. Bu depoda renk **ANLAM** taşır (olumlu/olumsuz/uyarı); fiyat denemesine renk koymak olmayan bir hüküm iddia ederdi — o ne iyi ne kötü haber, sadece kartın tek EYLEM yüzeyi. Bekçide kendi ölçütü var ve renge çeviren mutasyon kırmızı yanıyor. ⏭ **HALİL TESTİ:** kartı **geniş masaüstünde** aç → Fiyat denemesi **sağda**, kâr kutuları **solda**, aynı anda görünmeli · pencereyi daraltarak küçült → tek sütuna dönmeli ve Fiyat denemesi **alta** inmeli · **telefonda** aç → bugünkü sırası aynen korunmalı. |
| **K99** | **İKİ FARKLI "TAM YETKİLİ" ÖLÇÜTÜ VAR — anayasa tek ölçüt diyor · [ÖLÇÜLDÜ, KOD YAZILMADI]** | 🕓 **[AÇILDI 30.08.2026, K98 kapısı kurulurken çıktı]** Anayasa açıkça şöyle diyor: _"Aynı ölçüt `lib/yetki/koruma.ts`'in kendini kilitleme korumasında da geçerlidir; iki yerde iki farklı ölçüt olmaz."_ **Ama var:** `koruma.ts` → `TUM_IZINLER.every(...)` · `scripts/yetki-bekci.ts` + seed'in sonradan-doğan dağıtımı → `FIRMA_IZINLERI`. Aradaki fark **sağlayıcı izinleri** (`saglayici: true`, bugün tek eleman: `destek.yonet`) ve bunlar firma rollerine **otomatik dağıtılmıyor**. ✅ **RİSK ÖLÇÜLDÜ VE ÇÜRÜDÜ — AYRIŞMA DURUYOR (30.08.2026, `npm run canli:yetki`):** kurduğum senaryo şuydu — _"CEO'da `destek.yonet` yoksa `tamYetkiliRolIdleri()` boş döner, `baskaSahipVarMi()` hep `false` verir ve kendini-kilitleme koruması meşru bir rol değişikliğini de engeller."_ Canlı ölçüm bunu **çürüttü:** `CEO 27/27 tam yetkili + SAĞLAYICI` · `Sahip 27/27 tam yetkili + SAĞLAYICI` · `Operasyon 12/27 kısıtlı (beklenen)`. Yani **iki rol de sağlayıcı iznini taşıyor**; `TUM_IZINLER` ölçütü bugün de tutuyor ve koruma kilitlenmiyor. ⚠ **AMA KALEM KAPANMIYOR — AYRIŞMANIN KENDİSİ DURUYOR.** Bugün ısırmamasının sebebi ölçütün doğruluğu değil, iki rolün TESADÜFEN sağlayıcı iznini taşıması. Ekrandan açılacak YENİ bir tam yetkili rol onu **otomatik almaz** (`otomatikDagitilacak` sağlayıcı izinlerini eliyor) ve o rolle açılan kullanıcı `koruma.ts` gözünde tam yetkili SAYILMAZ. ⏭ **YAPILACAK:** ① iki ölçütten hangisinin doğru olduğuna karar ver ve **tek kaynağa indir** · ② ayrışmayı yakalayan bir ölçüt yaz — bugün hiçbir bekçi iki tabanın ayrıştığını görmüyor · ③ K98'in kapısı (`FIRMA_IZINLERI`) karar hangi yöne çıkarsa ona hizalanır. ⛔ **K98'DE DÜZELTİLMEDİ, BİLEREK:** kendini-kilitleme koruması ayrı bir cephedir ve deneme rotasıyla birlikte değiştirilmesi paketin adının dışına çıkardı. K98 kendi kapısını `FIRMA_IZINLERI`ne bağladı (bekçi + seed ile aynı taban) ve gerekçesini koda yazdı. |
| **K98** | **HATA EKRANI KİMİN HATASI OLDUĞUNU SÖYLEMİYORDU · [HALİL TESTİ: A GEÇTİ · B AÇIK]** | ⏳ **[YAZILDI + BEKÇİSİ KOŞTU 30.08.2026]** Barındırma kesintisinde Halil `A server error occurred. ERROR 800923320` gördü; ekran kimin hatası olduğunu söylemiyordu — operatör "ben mi bozdum, sistem mi çöktü" diye bilemeyince çalışmayı bırakıyor _(İlke #5)_. ⛔ **SEBEP YAZILAMAZDI:** hata sınırına düşen `Error` üretimde yalnız `digest` taşır, mesajı taşımaz — _"veritabanına bağlanılamıyor"_ yazmak sistemin bilmediği şey hakkında iddia kurmak olurdu. ⭐ **ÇARE: EKRAN SORAR.** `SELECT 1` sondası (`src/app/hata-sondasi.ts`, salt okuma) veritabanına ulaşılıp ulaşılamadığını ÖLÇER; ekran ölçtüğünü söyler. Dört hâl AYRI tutuldu ve üçü farklı işe yol açıyor: `VERITABANI_YOK` (sağlayıcıya bakılır) · `SUNUCUYA_ULASILAMADI` (beklenir) · `SUNUCU_HATASI` (kod iletilir) · `KONTROL_EDILIYOR`. ⚠ **SONDA YETKİ İSTEMİYOR VE BU BİLİNÇLİ:** 30.08'de düşen tam da **giriş ekranıydı** (korumalı rotalar 307, çizilen tek sayfa `/giris` 500). `yetkiIste` çağırsaydı veritabanı çöktüğünde sonda da çöker, yani tam gerektiği anda susardı. Sızdırdığı bilgi ÖLÇÜLDÜ: dönen tek şey `true`/`false`. Muafiyet `yetki-dogrula.ts`e **gerekçesiyle** beyan edildi. ⚠ **`global-error.tsx` KÖK YERLEŞİMİN YERİNE GEÇİYOR**, yani `NextIntlClientProvider` düşmüş oluyor — oraya konacak bir `useTranslations` tam da her şeyin yandığı anda hata ekranının KENDİSİNİ düşürürdü. Metin yine de koda gömülmedi: `lib/hata/metinler.ts` sözlükten doğrudan okuyor. ✅ **BEKÇİ: `hata:dogrula` · 60 ölçüt · 6 bölüm (tur 66 → 68 doğrulama: bekçi + mutasyon harness'i)** — §1–§3 saf gövdeleri ÇAĞIRIP değer sınıyor (desen aranmıyor), kaynak taraması yalnız çizim/sunucu eylemi için ve YORUMSUZ kodda, kullanım bloğuna daraltılmış; pencereler kapanış işaretiyle ÖLÇÜLÜYOR. Bölüm sayacı var _(K93 şablonu)_. ✅ **MUTASYON: `hata-mutasyon:kontrol` · 17/17 yakalandı** (− kaldıran 11 · + fazladan 6). En kritik ikisi: `useTranslations`ı global-error'a KOYAN mutasyon ve `if (!iptal) setSonda({durum:"CEVAPSIZ"})` koşulunu `if (false)` yapan mutasyon (desen dosyada kalıyor, dal hiç çizilmiyor — deponun en sık yalancı yeşili). ⚠ **VE HARNESS'İN KENDİSİ KUSURLU ÇIKTI:** devralınan kapı 2 (`diskten.includes(bul)`) **EKLEYEN** mutasyonlarda yanlış alarm veriyor — bir satırın ÜSTÜNE ekleyen mutasyonda eski satır zaten yerinde kalır. İki `FAZLADAN` mutasyonu bu yüzden "ölçülemedi" düştü. **Kolay çare onları SİLMEK olurdu, yani "yanlış yanma" yönünü tamamen korumasız bırakmak.** Kapı tam eşitliğe (`diskten !== mutant`) çevrildi ve **üç harness'in üçünde de** düzeltildi _(kararın kapsamı uygulandığı yerle sınırlı sayılmaz)_; öteki ikisinde bugün ısırmadığı ÖLÇÜLDÜ (21 ve 9 çiftin 0'ı ekleyen). ✅ **DENEME ROTASI AÇILDI (kullanıcı kararı 30.08.2026, (A) seçeneği):** `/sistem/hata-denemesi` — **K98 testi için açıldı, ÜRETİM ÖZELLİĞİ DEĞİL.** Menüye konmadı; adresi Halil test listesinde. Sayfa hiçbir şey yazmaz, yalnız hata atar; `SUNUCU_HATASI` yolu böylece gerçek cihazda görülebiliyor. ⛔ **KAPI: yalnız TAM YETKİLİ rol; başka rol 404 alır** — "yetkiniz yok" bile denmez, rotanın VARLIĞI sızmaz. Ölçüt **izin kümesi**, rol adı değil (`tamYetkiliMi`, saf gövde). ⚠ **VE TABAN ÖLÇÜLEREK SEÇİLDİ:** `TUM_IZINLER` denseydi canlıdaki **CEO** rolü kapıdan geçemez, Halil **404** alırdı — sağlayıcı izinleri (`saglayici: true`) firma rollerine otomatik dağıtılmıyor (`otomatikDagitilacak` onları eliyor), yani sonradan doğmuş bir sağlayıcı izni CEO'da olmayabilir. Taban `FIRMA_IZINLERI` seçildi: bekçinin ve seed'in tabanıyla AYNI. Bekçide bu senaryonun kendi ölçütü var ("sağlayıcı izni OLMAYAN tam yetkili rol de geçer — CEO vakası"). ✅ **BEKÇİ 60 → 71 ölçüt / 6 → 7 bölüm · MUTASYON 17 → 24 (15 kaldıran · 9 fazladan).** §7'nin yedi mutasyonu ayrı ayrı kırmızı yandı ve GÖRÜLDÜ: kapıyı SİLEN · kapı ile hatanın YER DEĞİŞTİRDİĞİ (ikisi de dosyada durur, varlık ölçütleri yeşil kalır — sırayı ölçen kontrol yakaladı) · ret dalını `if (false)` yapan · ölçütü `every → some` gevşeten · yetki tabanını BOŞALTAN · hatayı atmayan · sayfaya `prisma` sokan. ✅ **HALİL TESTİ KOŞTU 30.08.2026 — CANLI ADRES, GERÇEK CİHAZ.** `axc-seven.vercel.app/sistem/hata-denemesi`. **Masaüstü:** rota açıldı (CEO 404 almadı) · başlık _"Bu ekran çizilemedi"_ + turuncu üçgen · ölçülen durum **birebir** _"Veritabanı çalışıyor; hata bu ekranın kendisinde."_ · ne-yapmalı satırı birebir · `Hata kodu: 503434463` · **"Tekrar dene" → aynı ekran, AYNI kod** (digest hatadan türetiliyor; değişmemesi doğrusu — gerçek arızada değişmesi ya da ekranın açılması beklenirdi) · ham hata mesajı ekranda YOK. **Telefon:** giriş yapıldıktan sonra ekran düzgün çizildi, "Tekrar dene" çalıştı. ⚠ **VE RAPORUM DÜZELTİLDİ — DENEME ROTASI SAYFA SINIRINI SINIYOR, KÖK SINIRI DEĞİL.** Ekran görüntüsünde **sol menü duruyor**, yani devreye giren `src/app/error.tsx`; kök yerleşim ayakta. Oysa 30.08 vakası tam da kök yerleşimin düşmesiydi (yerleşim oturum için veritabanına gidiyor, düşüyor, `/giris` 500 veriyor) — yani `global-error.tsx` **hâlâ gerçek cihazda görülmedi.** Dünkü rapor "SUNUCU_HATASI yolu sınandı" diyordu; doğrusu **"sayfa sınırındaki SUNUCU_HATASI yolu"**. ✅ **B4 GEÇTİ — VE İKİNCİ KAPIYI GÖSTERDİ.** Telefondan oturumsuz girilince **giriş ekranı** çıktı, 404 değil: istek `src/proxy.ts`te (Next 16'da `middleware.ts`in yerine geçen dosya) durdu, sayfa hiç koşmadı. Kapı iki katmanlı ve **ikisi ayrı ayrı sınanır**: ① oturum yok → `/giris` (proxy, varsayılan KAPALI) · ② oturum var + izin eksik → **404** (`sayfaTamYetki`). ⏭ **KAPANMADI — DÖRT YOL AÇIK:** ① **B testi** (kısıtlı ROL → 404) — Operasyon rolünde kullanıcı gerekiyor, ikinci katman hâlâ gerçek cihazda sınanmadı · ② `global-error.tsx` kök sınırı · ③ `VERITABANI_YOK` · ④ `SUNUCUYA_ULASILAMADI`. Son üçü emirle tetiklenemiyor; **gerçek kesintide doğrulanacak**. Tetiklenemeyen yolu "geçti" saymak testi değil raporu düzeltmek olurdu. ⏭ **KONTROLLÜ TETİK YOLU AÇILSIN MI (kök sınır için) — KARAR AÇIK:** anayasa _"ekran tetiklenemiyorsa tetikleyecek yol açılır"_ diyor, ama bunun bedeli **kök yerleşime dokunmak**: kapı yanlış kurulursa siteyi düşürür. Ayrı paket, ayrı onay; bugün açılmadı. ⚠ _(Kimlik notu: K97 kullanılmadı — kod dosyalarındaki yorumlar zaten K98 diyor, gap kasıtlı.)_ |
| **K52** | **`SaleItem.commissionTarifeId` — yazıcısı YOK, şema taşımadığı bilgiyi vaat ediyor · [AÇIK — ŞARTLI]** | 🕓 **[AÇILDI 25.08.2026, ÖLÇÜLDÜ]** Şema diyor ki _"bu tarifeden oran snapshot'lamış satış kalemleri"_; **uygulamada sıfır atama var** ve canlıda **0/140 kalem** dolu — kapsanan pencerede duran 31 kalemde de boş. Yani sistem, yaptığını söylediği şeyi hiç yapmıyor. ⚠ **BUGÜN ZARARSIZ ve bu ölçüldü:** oranın kendisi `SaleItem.commissionRate`'te satış anında DONUYOR, doğruluk oradan geliyor; kayıp yalnız **KÖKEN İZİ** — bir oranın hangi tarife penceresinden geldiği. Tarife üzerine yazılabildiği için (aynı pencere ikinci kez yüklenirse kalemler silinip yeniden kuruluyor) köken izi bugün zaten kırılgan. ⚠ **AÇILIŞ ŞARTI:** bir oran itirazı ya da denetim, _"bu oran nereden geldi"_ sorusunu gerçekten sorduğunda. Bugün o soruyu soran yok; olmayan ihtiyaca sütun doldurulmaz. ⚠ **VE ÜÇÜNCÜ SEÇENEK YOK:** ya bağlanır ya kaldırılır — _"dursun, ileride lazım olur"_ bir karar değil, kararın ertelenmesidir. Alan durduğu **her ay yanıltıcılığı artar**: onu boş bırakan gerekçeyi hatırlayan kişi sayısı azalır. Anayasaya madde olarak girdi. _(Kardeşi: K31'de bulunan üç ölü sütun — orada da şema bir şey vaat ediyordu, kod tutmuyordu.)_ |
| **K90** | **`StockMovement`'ta `updatedAt` YOK — bağ çevirisi izlenemiyor · [AÇIK]** | 🕓 **[AÇILDI 29.08.2026, ÖLÇÜLDÜ]** Şemada yalnız `occurredAt` (iş anı) ve `createdAt` (yazılış anı) var. Bir hareketin `sourceMovementId`'si sonradan BAŞKA partiye çevrilirse **hiçbir iz kalmaz** — ne alan değişir, ne zaman damgası. ⛔ **BUGÜN SOMUT ZARARI ÖLÇÜLDÜ:** `axcali2723`'te bir parti iki kez tüketilmişti; ikinci tüketimin nasıl mümkün olduğu **cevaplanamadı**, çünkü ilk bağın ne zaman kurulduğu (ya da çevrildiği) sorulabilir değil. Teşhis tavana dayandı. ⚠ **VE BU LEDGER İLKESİYLE ÇELİŞMİYOR:** ilke tutarların değişmezliğini korur; `updatedAt` tutarı değiştirmez, **değişikliğin OLDUĞUNU görünür kılar**. `Purchase`'ta zaten var ve orada gerekçesi yazılı (_"`updatedAt` yalnız not düzeltmesi içindir"_). ⏭ **AÇILIŞ ŞARTI YOK — bu bir eksiklik, tercih değil.** Şema değişikliği en pahalı çözüm olduğu için merdiven inilecek: mevcut alanla türetilebilir mi (hayır, ölçüldü) → `AuditLog` yeterli mi (bağ çeviren betikler iz bırakmıyor, ölçüldü) → sütun. _(Anayasa: "şemadaki alan da bir iddiadır" — burada tersi: şemanın SÖYLEMEDİĞİ şey teşhisi kesiyor.)_ |
| **K91** | **787 bağ YANLIŞ PARTİYE bakıyor — maliyet doğru, bağ yanlış · [AÇIK, KAPSAM ÖLÇÜLDÜ]** | 🕓 **[AÇILDI 29.08.2026]** `sinir` kökü bugün kapandı ama **geçmiş yaralar duruyor**: 810 bağda çıkışın iş tarihi, tükettiği partinin tarihinden ÖNCE (182 varyant · parti ortanca **114 gün** ileride, max 721). ⭐ **AYIRT EDİCİ KANIT — MALİYET DAMGASI DOĞRU YERİ GÖSTERİYOR:** 6036 bağlı hareket tarandı, **788'inde** `unitCostAmount` bağlı partinin maliyetinden FARKLI ve bu 788'in **787'si** ileri parti yiyen küme. Yani içe aktarma maliyeti DOĞRU partiden damgalamış, `sourceMovementId`'yi YANLIŞ partiye kurmuş. **Üç vakada birebir doğrulandı:** `axcali2723` damga ₺340 ↔ 2024-09-24 partisi ₺340 · `axcalistan01` ₺1792 ↔ 2025-07-27 ₺1792 · `OYUNEN88141740` ₺796 ↔ 2025-08-03 ₺796. ⭐ **ONARIM ÖLÇÜTÜ YENİDEN HESAPLANABİLİR** (liste saklanmaz): _"çıkışın iş tarihinde açık olan ve `unitCostAmount`'ı damgaya kuruşuna eşit parti"_. ⚠ **PARA DEĞİŞMEZ** — damga zaten doğru; değişen yalnız bağ, yani anayasadaki dar metadata istisnasının üç şartı da sağlanıyor. ⛔ **BUGÜN GÖRÜNÜR ZARAR 3 VARYANT** (aşağıda K92), ama kalan 784 bağ **gizli tehlike**: o partilere ileride düşen meşru bir satış partiyi eksiye indirir ve yeni ayrışma doğar — bugünkü üç vaka tam olarak böyle doğdu. ⛔ **30.08.2026 — KURU KOŞUM KOŞULDU VE PLAN BOŞ ÇIKTI.** `npm run canli:bag-onar` (salt okuma): bozuk bağ **810 → 780** (bugünkü K54 + K96 düzeltmeleri 30 tanesini kendiliğinden çözmüş), ama **ONARILACAK = 0**. Dağılım: _aday YOK_ **615** · _BİRDEN ÇOK aday_ **116** (2 aday×58 · 3×20 · 4×15 · 5×10 · 6×4 · 7×3 · 9×6) · _hedef parti KAPASİTESİZ_ **49** · _damgası yok_ 0. ⚠ **YANİ 29.08'DE ÜÇ VAKADA DOĞRULANAN ÖLÇÜT, BUGÜNKÜ DEFTERDE HİÇBİR BAĞI ONARAMIYOR.** Sebep ölçülmedi: aradaki gün içinde `canli:eksik-bag` yeni `PURCHASE_IN` partileri açtı ve K96 bağ yazımını değiştirdi — yani _"çıkışın iş tarihinde AÇIK olan parti"_ kümesi değişmiş olabilir. ⛔ **ÖLÇÜT GEVŞETİLMEDİ.** Aday sayısını artırmak için tarih ya da kuruş şartını gevşetmek, yanlış partiye BİLEREK bağlamak olurdu (anayasa: _"bir sınırın yönü ölçülmeden çevrilmez"_). ⭐ **VE ACİLİYET DÜŞTÜ:** bugün `ledger ≠ FIFO` sapması **0** (iki bağımsız ölçüm: `canli:defter-ayrismasi` 1053/1053 temiz · `bag-onar` 0 → 0). Yani görünür zarar YOK; kalan 780 bağ **gizli tehlike** olarak duruyor — o partilere ileride düşen meşru bir satış partiyi eksiye indirebilir. ⏭ **SIRADAKİ ÖLÇÜM (kod değil):** 615 _"aday yok"_ vakasında damga hangi partiyi gösteriyor ve o parti niye _açık_ sayılmıyor — tarih şartı mı eliyor, kapasite mi? Cevap gelmeden onarım yazılmaz. |
| **K50** | **RAF MOTORU — 🟡 KİLİT KALKTI, SIRA BEKLİYOR (üç komut birleşti)** | 📦 **ÜÇ KOMUT TEK KALEM.** 25.08'de sırayla geldi: ① _barkodlu raf sistemi_ (`K42-RAF` adıyla — çakışma, K50'ye alındı) ② _raf motoru: kurulum ekranı + esneklik + toplu taşıma_ ③ iki ek: _barkod üretimi sistemin içinde_ ve _etikette barkod + karekod birlikte_. İkinci komut birinciyi **kapsıyor ve düzeltiyor**, o yüzden ayrı kalem açılmadı.  ⚠ **ASIL DÜZELTME — DEPO DÜZENİ ARTIK VERİ, ŞABLON DEĞİL.** İlk komut Halil'den üç sayı istiyordu (koridor · ünite · göz). İkinci komut bunu iptal etti: _"depo düzeni firmadan firmaya değişir; kanal kesinti kuralları nasıl veri olduysa depo düzeni de VERİDİR — firma deposunu kendisi çizer."_ **Yani Halil'e soru sorulmuyor, ekran veriliyor** (`/ayarlar/depo`). Bu, benim _"üç sayıyı bekliyorum"_ dediğim engeli ortadan kaldırdı.  **KAPSAM — yedi başlık:** **①** `/ayarlar/depo`: bölüm ekle (ad serbest, KISALTMASI kurallı — büyük harf/rakam, boşluksuz, Türkçe karaktersiz, barkod-güvenli; ad ↔ kısaltma AYRI alanlar) · bölüme ünite, üniteye göz sayısı (bölüm bölüm farklı olabilir, ünite bazında istisna da) · **göz numarası YERDEN YUKARI, SABİT KURAL — ayar değil**, gerekçesi ekranda yazar (üste kat eklenince etiket sökülmez) · **ÖNİZLEME** (üretilecek kodlar + toplam) · onaysız tek raf yazılmaz. **②** **ETİKET SİSTEMİN İÇİNDE ÜRETİLİR** — SVG + kütüphane, **dış servis/API çağrısı YOK**. Her etikette **üç gösterim, TEK değer**: sol `Code128` (el terminali) · sağ `QR` (telefon) · alt okunabilir yazı (`RAF-A1-3`). ⚠ **QR'a zengin veri KONMAZ** (adres/URL/liste yasak) — iki kod ayrışırsa aynı etiket iki kimlik taşır. A4 toplu basım + **tek raf yeniden basımı**; yeniden basım AYNI kodu çizer (K35 kuralı). Basım izi `AuditLog`a. **③** `/yerlestir` okut-koy: raf okut → ürün okut → onay. Ardışık yerleştirme (tek raf, çok ürün). Konum GÜNCELLEMEDİR; eski→yeni `AuditLog`a. **④** `/paketle` konum doğrulaması (okut-al): _"beklenen rafta mıydı"_ → `AuditLog`, **NÖTR, akış DURMAZ**. Ekranda raf zaten var (K46), değişiklik yalnız iz. **⑤** `/okut` raf modu: `RAF-` önekli kod → o rafa kayıtlı ürün listesi. Başlık **"kayıt"**, "envanter" DEĞİL — adet iddiası yok. **⑥** **TOPLU TAŞIMA:** kaynak raf okut → hedef raf okut → liste + onay → tek harekette. **TEK `AuditLog` kaydı** (ürün başına satır değil), kısmî taşıma işaret kutularıyla. **⑦** **GÖÇ:** mevcut **41 raf** ilk açılışta gösterilir; düzen çizilince göç tablosu (eski ad → yeni kod) **önerilir**. ⚠ **ONAYSIZ TEK AD DEĞİŞMEZ.** 1090 ürünün raf bağı korunur, önce/sonra sayım raporlanır.  ⚠ **ESNEKLİK SINIRLARI — ekranda ve el kitabında da anlatılır:** raf kodu **KİMLİKTİR, KOORDİNAT DEĞİL** (ünite fiziksel taşınırsa sistemde hiçbir şey değişmez; _"rafı taşıdım"_ işlemi YOKTUR — eksiklik değil tasarım) · kapasite artırma = **ekleme**, mevcut kodlara dokunmaz · silme yalnız raf BOŞSA · **kod yeniden düzenleme YOK** (basılı etiket yalanlar, konum geçmişi kopar).  ✅ **İSİMLENDİRME ÇELİŞKİSİ KARARA BAĞLANDI 25.08.2026 — seçenek (a):** elle değişiklik **YALNIZ bölüm adı/kısaltmasında** ("Salon" → `SLN`; kısaltma kurallı: büyük harf/rakam, boşluksuz, TR karaktersiz). **Üretilen raf kodu ŞABLONA KİLİTLİ** (`RAF-<kısaltma><ünite>-<göz>`), elle düzenlenemez — içerikten ad türetme yasağı ve bekçileri aynen geçerli. ⚠ **KISALTMA SONRADAN DEĞİŞMEZ** (kod kalıcılığı): bölümün GÖRÜNEN adı değişebilir, kısaltması değişemez ve **ekran bunu baştan söyler**. _Gerekçe: kısaltma basılı etiketin içinde; değişirse etiket yalan söyler._  **SINIR (V1):** yalnız IZGARA düzeni (bölüm→ünite→göz). Serbest biçim (palet alanı, askı, tipli konum) **V2** — ihtiyaç ölçülünce. Olmayan ihtiyaca genel çözüm yazılmaz.  🧪 **BEKÇİ + MUTASYON (asgari set, komuttan):** şablon dışı kod üretimi · içerik-adlı raf · dolu raf silme · **göz numarasını üstten saydıran AYAR eklenmesi** (sabit kuralın kendisi sınanır) · kod yeniden adlandırma yolu · onaysız toplu taşıma · göç/taşımada ürün bağı kaybı (önce/sonra sayım) · **etiket sayfasında dış adres çağrısı** · **QR içeriği ≠ barkod içeriği**. Her mutasyonun UYGULANDIĞI teyit edilir.  ✅ **KOŞUM KİLİDİ AÇILDI** — API öncesi kapanış **5/5** kapandı (25.08). Bugünkü plan _"bugün başla"_ diyor. ⛔ **AMA ADIM (a) BUGÜN KOŞULAMIYOR:** iki ön ölçüm (raf doluluk + 41 adın biçimi) **canlı veritabanı gerektiriyor** ve yerel betikle bugün **altı kez** bağlanılamadı (`pool timeout`, `active=0` — tek bağlantı bile kurulamıyor). Canlı SİTE çalışıyor, yani veritabanı ayakta; tıkanan bizim yerel yolumuz. **Ölçüm yapılmadan göç tablosu üretilmez.** |
| **K41a** | **Gönderi numarası — ✅ [KOŞTU] 24.08.2026** | 📦 **CANLIDA.** `Sale.shipmentCode String? @unique` — migration koştu (33 migration · 470 kolon doğrulandı · damga güncellendi). **Sayım 125 → 125, dolu 0** (beklenen: kod satıştan SONRA oluşuyor, geri doldurulmaz). Yeni satış formunda + satış detayında **sonradan** girilebilir, ikisinde de **okutulabilir**. `/okut` varyant bulamazsa satış kimliğinde arar → sonuç **tekil** (`@unique`) → **Paketlendi doğrudan o satıra**. `/satislar` araması da bulur. ⚠ **"AYRI LİSTE YAZMA" NİYETİ KORUNDU, MEKANİZMA DEĞİŞTİ:** `kodKosulu` beş yerden çağrılıyor ve hepsi `ProductVariant` sorguluyor; gönderi no bir `Sale` kimliği. Liste **TEK** (`KOD_ROLLERI`), yayım kapsama göre ayrıldı (`ROL_KAPSAMI` **exhaustive** — altıncı rol derlenmeden eklenemez, nitekim beşinciyi eklerken `alanAdi` sözlüğü derhal kırıldı). 🧪 `arama:dogrula` 67 kontrol · **10 mutasyon, 10'u da yakalandı.** |
| **K41b** | **Barkodsuz iç etiket basılsın mı?** | 🔴 **KARAR HALİL'DE.** Gönderi numarası akışı bunu **BEKLEMİYOR** — pazaryeri etiketiyle çift okutma bugün çalışır durumda. Karar geciktiğinde hiçbir iş durmuyor. _(K35 etiket basımıyla kardeş; orada da açılış şartı yazıcı/etiket kararıydı.)_ |
| **K44** | **`Return` yazıldıktan sonra DÜZENLENEMİYOR** | 🕓 **[AÇILMADI, KAYDA GEÇTİ] 24.08.2026.** Sistemde bir iadeyi düzenleyecek ekran ya da eylem **yok** — `/satislar/[id]/iade/` yalnız YENİ iade oluşturuyor, `return.update` çağıran hiçbir uygulama yolu bulunmuyor. Bugünkü form düzeltmesi (değişim kargosu alanı) **bundan sonraki** iadeleri kapsıyor; geçmiş kayda ulaşamıyor — `11473322212` vaka-bazlı betikle düzeltildi. ⛔ **BUGÜN GEREKÇESİZ:** kargo mutabakatında `(b) eksik bacak = 0` ve `(d)` farkları sistematik yuvarlama çıktı, yani geçmişte düzeltilecek bacak görünmüyor. **Açılış şartı:** geçmiş bir kayda dokunma ihtiyacı doğuran ilk gerçek vaka. _(K39'un kardeşi: orada kapanmış BİLDİRİM düzeltilemiyordu, burada kapanmış İADE.)_ |
| **K45** | **Kargo faturası — düzenli mutabakat** | 🕓 **ARAÇ HAZIR, RUTİN KURULMADI.** `npm run canli:kargo-mutabakat "<fatura.xlsx>"` — salt okuma, kolon bulunamazsa **hata fırlatır** ("0 sapma" demez). İlk koşum (12 satır): (a) 1 · (b) 0 · (c) 8 · (d) 3. **(d)'nin üçü de tam `−0,01`** — bizde `106,75`, faturada `106,76`; `88,96 × 1,20 = 106,752`, biz aşağı TY yukarı yuvarlıyor. **HÜKÜM: sapma değil düzen farkı, iş açılmaz.** ⏭ Rutin hâline getirme kararı, TY'nin fatura yayım ritmi ölçüldükten sonra. |
| **K8** | **Hakediş eşleştirme — 🔻 KÜÇÜLDÜ, KOD İŞİ DEĞİL** | ✅ **[KOŞTU 24.08.2026] 8 KALEM BAĞLANDI** (0 → 8, iki sipariş: `11466103125` · `11466139735` · `11467064391` · `11470255175` · `11471381662`). İkinci koşum 0 yazdı — idempotent. İz artık `AuditLog`ta (`HAKEDIS_ESLESTIRME`). ⚠ **KALEM YENİDEN TANIMLANDI:** _"eşleştirme mekanizmasını yaz"_ diye duruyordu; ölçüm çürüttü. Mekanizma **var** (`lib/hakedis/eslestir.ts`, yükleme anında koşuyor), tekrar-koşum betiği **var** (`canli:hakedis-esle`), ve **doğru çalışıyor**. 📊 **ÖLÇÜM (`npm run canli:k8-olcum`):** 1136 kalem · sipariş no boş 47 · bağlanacak 8 · **(a) defterde hiç yok 1081 kalem / 380 sipariş** · **(b) sipariş var ama eşleşme kurulamadı = 0.** Ham kod ve temizlenmiş kod ayrı denendi, fark çıkmadı: **sistematik biçim/kanal bozukluğu YOK.** Yani motor kusursuz, **defter eksik.** ⏭ **KALAN ÜÇ PARÇA A3 SONRASINA:** ① koşum tetiği (satış girilince / rapor yüklenince) ② bağsız kalem ekranı ③ eşleşme oranı rozeti. **Defter dolmadan tetik kurmanın anlamı yok** — tetik her koşumda 1081 kez boşa arar. |
| **H11** | **Bağsız hakediş yığını büyüyor** | ⚠ Gecikme sayımı dışındaki kalem 19.08 sabahı 67, akşamı **168**. Yığın büyüdükçe sistemin "alacağım ne" sorusuna cevabı küçülüyor. K8 ile birlikte çözülür. |
| **K24** | 🕓 **Alım KDV oranı SNAPSHOT değil** | **AÇIK SINIR, beyan edildi 21.08.2026.** KDV sekmesi çalışıyor ama iki taraf farklı: **satış** oranı `SaleItem.vatRate` ile satış anında DONDURULMUŞ; **alım** oranı ürünün BUGÜNKÜ kategorisinden çözülüyor (`PurchaseItem`de oran alanı yok). Bir kategorinin oranı değişirse **geçmiş alımların KDV'si geriye dönük kayar** ve eski bir dönemin "ödenecek KDV"si bugün başka çıkar. Ekranda yazılı. **Çare:** `PurchaseItem.vatRate` snapshot alanı — şema işi, ayrı karar. ⚠ Bugün risk düşük: 18 kategorinin oranları mevzuata bağlı ve nadir değişir; ama değiştiğinde SESSİZ kayar. |
| **K18** | **Sipariş no çakışması — VERİ DÜZELTMESİ** | ✅ Kod tarafı kapandı (kök sebep: çakışma kontrolü `iptalTarihi`yi süzmüyordu; ayrıntı arşivde). ⏳ **KALAN, HALİL'DE:** `115180181780` iptal → `11518018178` iptali geri al. Numara yeniden adlandırılamaz (`Sale.code @unique`). |
| **K20** | **Gecikmiş borç sayımı — ✅ [KOŞTU] 24.08.2026** | 📊 `npm run canli:k20-sayim` (salt okuma). **Damga:** döküm DONMUŞ, defter AKIYOR — sistem okuma `24.08 21:06 UTC`.<br>**TRENDYOL / AXCALI** · `01–20.08` satır 71 · brüt 71 · net 65 · **₺233.239,73** · iptal 3 · `20–24.08` satır 28 · brüt 28 · **₺72.951,00** · iptal 0<br>**HEPSİBURADA / AXCALI** · `01–20.08` satır 21 · brüt 20 · **₺76.503,00** · iptal 1 · `20–24.08` satır 2 · **₺38.268,00**<br>**N11 / AXCALI** · `01–20.08` satır 3 · **₺8.397,00** · `20–24.08` **sıfır**<br>⚖ **DÖKÜM KIYASI (yalnız TY, yalnız 01–20.08):** döküm **147 adet / ₺464.657** · bizde **71 adet / ₺233.239,73** → **FARK −76 adet / −₺231.417,27.** Yani defterde **kayıtlı olan, olması gerekenin YARISI kadar** (%48). ⚠ **20–24.08 KIYASA GİRMEZ** — o pencere hiçbir dökümle kapatılmadı; 28 satış girilmiş ama karşılığı ölçülmedi. ⚠ **HB DÖKÜMÜ 15.08'E KADARDI** → o kanalda kıyas KURULAMAZ, rakamlar yalnız sayımdır. ✅ **ÇİFT KAYIT YOK:** 121 farklı (sipariş no + barkod) ikilisi, **tekrar eden 0**. |
| **K19** | **₺15 TAKİPÇİ KUPONU — kâr motorunda karşılığı yok** | 🕓 **ÖLÇÜLDÜ 20.08.2026, iş açılmadı.** Mağazayı takip edene **₺15 kupon** (tek sefer, tüm ürünler, amaç takipçi artırmak) — TY ve HB'de var. **TY dökümü: 144 satırın 52'sinde (%36) `İndirim Tutarı = 15,00`; `Trendyol İndirim Tutarı` 144/144 SIFIR → kuponu tamamen MAĞAZA ödüyor.** ✅ **KAYIT DOĞRU:** Halil `Faturalanacak Tutar`ı giriyor (4.185), yani kupon düşülmüş hâli — düzeltilecek bir şey yok. Bu, gece boyunca üç üründe çıkan **"bizde ₺15 eksik"** farkının da açıklamasıdır. ⚠ **İKİ AÇIK SORU:** ① **Komisyon tabanı** — TY komisyonu 4.200'den mi 4.185'ten mi alıyor? Bu dosyada komisyon TUTARI yok, ölçülemez → **H3** ödeme dosyasıyla bakılır. ② **Fiyatlama simülasyonu** kuponu bilmiyor: Halil 4.200 deneyince aracın gösterdiği NET, satışların %36'sında ₺15 fazla çıkıyor. Bu ürünün marjı ~₺190 olduğuna göre ₺15 **marjın ~%8'i** — HB'nin ₺12,60'ıyla aynı mertebede. |
| **K31** | **İade durum makinesi — ✅ ①②③④ TESLİM 23.08.2026 (H25① hariç)** | ✅ **MODEL CANLIDA** (23.08.2026). ✅ **① SON TARİH UYARILARI TESLİM:** dört ölçülmüş sayaç ekranda ve panel çanında (müşteri kargoya versin 7g→iptal · kargo ulaşsın 10g→**otomatik onay** · onay/red 2g→otomatik onay · analiz 28g→otomatik onay). Her sayaç **sonucunu da yazıyor** — "3 gün kaldı" tek başına uyarı değil. ⚠ **ŞEMA DEĞİŞMEDİ:** K31 migration'ında açılıp **ölü duran** iki sütun kullanıldı (`otomatikOnayTarihi`, `islemSonTarihi` — ölçüldü: sıfır okuyucu, sıfır yazıcı). ⚠ **YAZILAN HER TARİH TÜRETMEDİR, ÇIPA DEĞİL:** `AuditLog`a hangi geçişte hangi kuralla hangi andan hesaplandığı yazılıyor (`IADE_SON_TARIH`, `kaynak: TURETME|PANEL`), ekranda **nötr** gösteriliyor ve _"bu tarih hesaplandı"_ diye beyan ediliyor. **Pazaryeri paneliyle ayrışırsa KAZANAN PANEL** — elle yazılabiliyor ve türetmeyi eziyor. ⚠ **2. SAYACIN ÇIPASI BİZDE DOĞMUYOR** (kargoya veren müşteri): isteğe bağlı elle giriş var, girilmezse sayaç **boş durur ve "çıpa girilmedi" der** — uydurulmaz. ⚠ **5. SAYAÇ (geri gönderim) SATIR OLARAK VAR, TARİH YOK** — birim ve başlangıç anı ölçülmedi (H25①); ölçülmemiş sayacın **sütunu da yok** ki yanlışlıkla tarih yazılamasın. ⚠ **BİLİNMEYEN ÇANA DÜŞMEZ:** kalan süresi bilinmeyen kayıt acil sayılmıyor — cevaplanamayan uyarı rozetin tamamına olan güveni götürür. Eşik sayacın kendi uzunluğuna bağlı (çeyrek, en az 1 gün) ve **sözleşme olduğu beyan edildi**, ölçüm değil. 🧪 `rma:dogrula` 311→352 · **10 mutasyon, 10'u da yakalandı**. ✅ **④ RET GEREKÇESİ + ANALİZ SONUCU TESLİM** (kullanıcı bildirdi 23.08: _"iadeye itiraz edince red sebepleri gelmiyor"_). Ölçüldü: `itirazGerekcesi` ve `analizSonucu` da **ölü sütunlardı** — sıfır okuyucu, sıfır yazıcı. İtiraz diyaloğunda **8 ret gerekçesi ZORUNLU** (pazaryeri de gerekçesiz itiraz kurdurmuyor; seçilmeden onay düğmesi basılmıyor ve sebebi ekranda yazıyor), **3 analiz sonucu SORULUYOR ama boş geçilebiliyor** (pazaryerinin zorunlu tutup tutmadığı ölçülmedi — ölçmediğimiz kuralı dayatmayız). ⚠ **BUGÜNKÜ HATANIN TEKRARI YAPISAL OLARAK ENGELLENDİ:** kabul kümesi de etiket kümesi de TEK exhaustive `Record`tan türüyor; bekçi formun sunduğu 8+3 değeri sunucuda **tek tek ÇAĞIRARAK** sınıyor. Boş ile tanınmayan **ayrı mesaj** veriyor. ⚠ Gerekçe **para tarafını belirliyor** (docs §5): `DEGISIM` seçilirse kargo her kanalda satıcıya ait, satıcı haklı bulunduğunda TY yansıtmıyor. Seçilen gerekçe **listede görünüyor** — yazılıp görünmeyen alan yazılmamış gibidir. 🧪 `rma:dogrula` 352→376 · **10 mutasyon, 10'u da yakalandı** (biri önce yeşil kaldı: ölçüt varlığa bakıyordu, yokluğa değil). ✅ **② KARGOLANACAK KUTUSU:** `ITIRAZ_KABUL`de ürün BİZDE ve geri gönderilecek — bu fiziksel iş hiçbir yerde görünmüyordu. Kural **TÜRETİLDİ, yeni durum/alan AÇILMADI**: kargo kodu boş → *gönderime hazır*, dolu → *kargoda* (HB'nin iki sekmesinin türetildiği yöntemin aynısı). `iadeKargoKodu` da **ölü sütundu** — üçüncü çift; artık ekrandan yazılıyor. ⚠ Kutu **50'lik listeden türetilmiyor, AYRI sorgudan** besleniyor: süzülmüş listeden süzseydik 51. sıradaki iş sessizce görünmezdi (15.08 tuzağı). ⚠ **İki hâl de NÖTR** — "gönderime hazır" bir gecikme değil sıradaki adım; pazaryeri kodu henüz atamamış olabilir. ✅ **③ ASKIDA ARIZA KUTUSU:** boş olması beklenen yer, boşken de yazıyor (**açık sıfır**), doluysa sayı kırmızı. `KARGOYA_VERILDI` düğmesi zaten vardı ve **atlanabilir** olduğu bekçiyle sabitlendi (HB'de bu aşama yok — zorunlu olsaydı her HB iadesinde fazladan tık). 🧪 `rma:dogrula` 376→396 · **10 mutasyon, 10'u da yakalandı** (biri önce yeşil kaldı: dilim, aranan `className`'in ÖNÜNDEN değil ARDINDAN kesiliyordu). ⏳ **TEK KALAN: H25① — beşinci sayacın birimi/çıpası** (N11 deneyimi yok, süresiz). |
| **K32** | **HB "Hurda Geliri" — hakedişte karşılığı yok** | ⛔ **ÖLÇÜLMEDİ, AÇILMADI.** HB'de servis dalı Trendyol'dan farklı bitiyor: HB servisi beklemeden müşteriye parayı iade eder, satıcı tazmin talebi açar, kabul edilirse **HB'ye fatura keser**, ürün HB deposuna gider ve tutar hakedişe **"Hurda Geliri"** olarak düşer. İki eksik: ① iadenin `Compensation` kaydına bağlanması ② hakedişte bu GELİR kaleminin tanınması. ⚠ **Açılış şartı:** hurda gelirinin hakediş dosyasında hangi satır adıyla geldiğinin görülmesi — ölçmeden kalem açmak adını uydurmak olur. |
| **K34a** | **Uyarısız okuma — ✅ TESLİM 23.08.2026** | 📷 `/okut` — barkodu okut, sistem o barkod hakkında ne bildiğini söyler. **UYARI YOK · ONAY KAPISI YOK · İSTİSNA KAYDI YOK · hiçbir şey engellenmez** (bekçi bunu koşulur hâlde tutuyor: ekranda `destructive`/`AlertDialog`/`required` yasak). ⚠ **ŞEMA DEĞİŞMEDİ** — merdiven birinci basamakta durdu: iz `AuditLog`ta yaşıyor (`action` → kova, indeksli; `createdAt` → hafta, indeksli; `targetType/targetId` → varyant; `detail` → yapılandırılmış JSON; `userId` → kim okuttu). Migration · canlı koşum · damga bedeli hiç doğmadı (K2 vakasıyla aynı karar). ⚠ **DÖRT KOVA** (`ACIK_SIPARISTE_VAR` · `ACIK_SIPARISTE_YOK` · `ESLESTIRILDI` · `BILINMEYEN`) ve bu bir DENETİM ÇERÇEVESİDİR: temiz · sapan · sapan · **incelenemedi**. `BILINMEYEN` bir bulgu DEĞİL — ekranda da öyle yazıyor. Tek "bulunamadı" rakamı basılmıyor. ⚠ **ÜÇÜNCÜ KOVANIN ADI EYLEMDİR, HÜKÜM DEĞİL** (mimar düzeltmesi): `BASKA_BARKOD` → `ESLESTIRILDI`. Kullanıcının yaptığı şey eşleştirme; kodun NİYE tutmadığı (ürünün barkodu farklı · kayıtta EAN yanlış · parti farklı geldi) üç ayrı işe yol açar ve SORULMUYOR. **`sebep` alanı açıldı ve boş** — vaka birikince desen kendisi çıkacak; alan şimdi açıldı ki o gün göç "yeniden yazım" olmasın. ⚠ **"Biliyorsan göster" bir KAPI DEĞİL:** isteğe bağlı, atlanabilir, metinde de öyle yazıyor; gösterilirse `BILINMEYEN` → `ESLESTIRILDI`. ⚠ **DÖRT ALANDA ARANIYOR** (ortak `kodKosulu`): EAN · Firma SKU · sistem SKU · Kanal SKU — ve **hangisinde bulduğu yazıyor**; çakışmada sıra sabit (barkod kazanır). 🕐 **Saat dilimi**: `createdAt` bir AN, iş günü UTC gece yarısı — hafta kovalaması İstanbul takvim gününe çevrilerek yapılıyor, yoksa gece 00:00–03:00 okumaları bir önceki haftaya düşerdi. ⚠ **MENÜ: "Ürün ve kanal" grubunda, günlük listede DEĞİL** — hep açık liste kullanıcının onayladığı 7 satır (22.08.2026) ve eşiği kendi işime uyduramam. **Sıklığa göre günlük listeye ait** (paket başına ≥1, ~30/gün → hedef 150): takas kullanıcıya soruldu, karar gelirse tek satır. 🧪 `okuma:dogrula` (52 kontrol) + **9 mutasyon, 9'u da yakalandı**. ⏭ Bir hafta sonra kova dağılımı K34'ün ve K35'in gerekçesini üretecek. |
| **K26** | 🧹 **`scripts/kart-dogrula.ts` HİÇ koşmuyor** | **ÖLÇÜLDÜ 21.08.2026.** 12 KB'lık "KART BORCU DOĞRULAMA" dosyası; kendi başlığında _"Çalıştırma: `npm run kart:dogrula`"_ yazıyor **ama o komut başka bir dosyayı koşuyor** (`urun-karti-dogrula.ts` — ürün kartı). İki farklı şey "kart" adını taşıyor ve biri sessizce yetim kalmış. Kart borcu tarafı `kart-odeme:dogrula` (121 kontrol) ile kısmen kapanıyor. **Karar:** ya npm girdisi açılır ya dosya silinir — ikisinden biri, ama _"duruyor"_ üçüncü seçenek değil. |
| **K13c** | **HB'de zararına duran 6 ürün** | 🕓 Bugünkü fiyat + açık parti maliyetiyle NET-2 **negatif**: Philips 5000 10in1 (−46,11) · LEGO 101 Dalmaçyalı (−301,77) · LEGO Endgame (−289,07) · Hogwarts (−25,68) · LEGO "Yukarı Bak" (−291,92) · Hot Wheels Rhino (−58,13). **Fiyat mı yanlış maliyet mi — önce bakılır**, düzeltilmez. |
| **H12/H13** | **Hakediş teyidinde önce bakılacak satışlar** | `11331575354` (i9000 Ultra · 17.06 · **₺12.960** · oran %2,70 · "iade var" rozetli) — **tek başına üçlüden büyük.** Ayrıca `11493262226` · `11492798173` · `11492628481`. |
| **H14** | **Ödeme hizmeti hipotezi** | H2/K8 sırasında bakılacak: dosyada tahsilat/ödeme bedeli satırı var mı. |
| **H4** | **Philips kanal düzeltmesi — kalan yarısı** | Kanal taşıması ✓ (Halil yaptı). ⛔ **Oran düzeltmesi İPTAL — `%2,70` DOĞRU** (TY fiyat indirimi karşılığı komisyon indiriyor; `~₺721` tahmini geçersiz). Kalan: kanal-değişince-kâr-tazelenir düzeltmesi canlıya çıkınca doğrulanacak. |

---

## 🕓 ZAMANA / KOŞULA BAĞLI — bugün açılmaz

| # | İş | Açılış şartı |
|---|---|---|
| **H20** | **`soldAt` saat taşımıyor** | 🕓 **VERİ GELDİ, KARAR AÇIK.** TY sipariş dökümü saat taşıyor (144/144) ve K9'un iki sınır kalemi çözüldü (`11475234462` → 04.08 17:04 · `11518039572` → 18.08 20:58; ikisi de 08:00 sonrası → yeni pencere). **Şemaya saat ALINMADI.** Açılış: içe aktarma yazıldığında saat de alınsın mı — ayrı karar.<br>🔎 **CEVAP VERİDEN GELDİ 24.08.2026:** TY API'sinde `orderDate` **epoch milisaniye, GMT+3** — yani saat **var ve API veriyor**. Karar artık teorik değil; A3 yazılırken saat alınacak mı, o an belli olur. |
| **K6** | **Eşik yeniden ölçümü** | Satış kalemi **200'ü geçince.** `veri-supheli.ts` eşikleri n=40 tabanından çıktı (p95 %154, p5 %44,8). Araç: `canli:bekleme-olcum`. _Eşik kaynağıyla anılır; taban büyüyünce kaynak eskir._ |
| **K7** | **`satis.veri.dogrula` ayrı izni** | **Faz 4 / RBAC.** Bugün `satis.duzenle` istiyor. Ayrı izin daha temiz ama iki bacaklı yetki işi doğurur ve tek kullanıcıda boş katmandır. |
| **K10** | **Pano kodu ataması elle — 🔺 ÜÇÜNCÜ KEZ ÇAKIŞTI** | 🧹 Kodlar elle veriliyor. 20.08'de **iki satır da `H6`** oldu; **24.08'de iki satır da `K42`** oldu (biri fire zararı, biri yönlendirmeli paketleme — ikincisi `K46`ya alındı). ⚠ **ÇAKIŞMAYI MİMAR DEĞİL UYGULAYAN ÜRETTİ:** komutta verilen kodu **kullanılmakta mı diye bakmadan** yazdım. Kod verilmiş olması onu boş yapmıyor. Çare değişmedi: en büyük numaranın bir fazlası — betik ya da tek kaynaklı sayaç. Elle atama üçüncü kez tutmadı; **bu artık bir tercih değil, ölçülmüş bir kusur.** |
| **K34** | **Sevkiyat doğrulaması — KİLİTLİ** | 📦 Depoda paketlerken barkod okutulur; sistem **kargoya verilmemiş** siparişler arasında arar, bulamazsa **uyarır**. Depo kuralı geçerli: _"uyarı sorar, kullanıcı ısrar ederse istisna kaydedilir."_ **İş değeri:** yanlış ürün göndermenin maliyeti = iade + iki kargo + ceza + itibar; entegratörler bunu ayrı paket olarak satıyor, bizde bu kontrol hiç yok. ⛔ **AÇILIŞ ŞARTI: AĞUSTOS DEFTERİNİN KAPANMASI.** Kontrol "kargoya verilmemiş siparişler" kümesinde arıyor ve o kümenin **%73,4'ü sistemde yok** (TY `01.08–20.08`: kanal 143, bizde 38 — araç `canli:eksik-siparis`; HB'de oran **%88,2**). Doğru ürün paketlenirken sistem "bulamadım" diyecek; sebep yanlış ürün değil, **satışın hiç girilmemiş olması.** Uyarı çoğunlukla HAKLI OLARAK çalar, kullanıcı her seferinde elle onaylar ve iki hafta içinde **uyarıyı okumadan tıklamayı öğrenir** — o noktada mekanizma yanmıştır, gerçek bir yanlış üründe de aynı tıkla geçilir. **YANLIŞ UYARI, UYARISIZLIKTAN KÖTÜDÜR.** ⛔ **ÖLÇÜLMEMİŞ DÖRT ŞEY** (kural yazılmayacak): ① barkod hangi kayda bakacak — EAN mi, Firma SKU mu, Kanal SKU mu? Halil'den depo etiketi fotoğrafı bekleniyor. ⚠ **Tek alana bağlanmayacak:** üçünde de aransın ve **hangisinde bulduğunu SÖYLESİN** — Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ② çok satırlı siparişte "bu kalemi okuttum" izi yok (bugün yalnız `shippedAt: null`). ③ elle onayın izi nereye — `AuditLog` mu, satışa alan mı? Şema merdiveni: önce ucuzu ölçülür. ④ defter eksik (yukarıdaki şart). |
| **K35** | **Firma etiketi basımı — KİLİTLİ** | 🏷 Firma SKU barkoda çevrilir, etiket basılır; ürünün üstünde İKİ barkod olur (EAN üreticinin, Firma SKU bizim). Sistemde bugün barkod **ÜRETİMİ/BASIMI YOK** — yalnız okuma var. ⛔ **AÇILIŞ ŞARTI: yazıcı ve etiket kararı.** Etiket boyutu bilinmeden basım ekranı tasarlamak, ölçmeden kural yazmaktır. Ölçülecek: boyut · yazıcı türü (termal/lazer) · SKU'ların Code128 uygunluğu. ⚠ **GEREKÇE DÜZELTİLDİ 23.08.2026 — ÖLÇÜMLE.** Mimarın gerekçesi şuydu: _"EAN ürünü tanımlar, hangi MALI elde tuttuğunu tanımlamaz; Firma SKU o boşluğu kapatır."_ **Şemada karşılığı yok:** `sku` · `barcode` · `companySku` **üçü de varyant başına ve `@unique`**; FIFO partisi `StockMovement`ta ve **hiçbir etiket partiyi tanımlamıyor** — motor en eski açık partiyi kendi seçiyor. Firma SKU okutmak da "bu mal" demez. ⚠ **İKİNCİ GEREKÇE DE ÖLÇÜMLE DÜŞTÜ:** "EAN'ı olmayan ürün" — canlıda **1086 aktif varyantın 1085'inde EAN var** (%99,9); tek istisnada stok yok. Firma SKU'su boş olan: **0**. ✅ **AYAKTA KALAN TEK GEREKÇE:** kullanıcı beyanı — _"istisna birkaç üründe EAN farklı olabilir"_ (pakettekiyle kayıtlı olan tutmuyor). **Bu bizim defterimizden ölçülemez** çünkü fark ancak okutunca görünür. ⭐ **K34a tam bunu ölçüyor** — bir hafta paketlerken kaç EAN tutmadığı sayılırsa K35'in iş değeri rakama döner. Yani K35'in gerekçesi K34a'nın çıktısıdır. ⚠ **ÜÇ ALANDA ARANACAK** (bu kural ayakta): EAN · Firma SKU · Kanal SKU — ve **hangisinde bulduğu SÖYLENECEK**. Soundcore vakası (`194645027819` / `194644037819`) tam bu yüzden hayalet kayıt doğurmuştu. ⚠ **YENİ RİSK SINIFI — VE BU GEREKÇE SAĞLAM:** bugüne kadar bütün kimlikler DIŞARIDAN geldi (EAN üreticiden, Kanal SKU pazaryerinden). Basımla birlikte **ilk kez kimlik ÜRETEN taraf biz oluyoruz.** Yanlış basılmış etiket, yanlış girilmiş satırdan KALICIDIR: satır düzeltilir, etiket kutunun üstünde depoda durur ve altı ay sonra okutulur. Kapsama baştan girenler: ① **basılan her etiketin izi** (hangi SKU · ne zaman · kaç adet) — iki kez basılmış kod ya da hiç basılmamış SKU ancak bu izle bulunur; ② **yeniden basım TEKİL** — aynı SKU'nun ikinci etiketi AYNI kodu taşır, yeni kod üretmez. Bu koda gömülecek kural değil, açıkça verilmiş karardır. |
| **K36a** | **Değişim MAL maliyeti satışın NET'ine — ✅ [KOŞTU] 23.08.2026** | 💱 **Mimar kararı 23.08.2026:** değişimde giden ürünün **FIFO maliyeti + kargosu** o **SATIŞIN** NET'ine yazılır; iadenin NET'inde bırakılmaz. _Gerekçe: değişim o satışı kurtarmanın bedelidir; ayrı cebe konursa satış kârlı görünür, değildir._ ⚠ **HURDADAN FARKI AÇIKÇA KONDU:** hurdada satış ÖLDÜ (dönem kalemi), değişimde satış YAŞIYOR (satışın maliyeti). ⚠ **BUGÜN BÖYLE DEĞİL — ÖLÇÜLDÜ:** `EXCHANGE_OUT` hareketi yalnız `returnItemId` taşıyor ve para `iade.ts`te _"Değişim: yerine giden ürünün maliyeti"_ satırıyla **iadenin** `net2Amount`'ına yazılıyor. Satışın NET'i yalnız `saleItemId` taşıyan hareketlerden hesaplanıyor (`kalemMaliyeti`, tip bakmaz). ⚠ **İKİ YOL BİRDEN değişecek** (form yolu + yeni düğme) yoksa aynı fiziksel olay iki farklı cebe yazılır ve üç ay sonra karşılaştırılamaz. ⚠ **ÇİFT SAYIM TUZAĞI:** harekete `saleItemId` eklenirse `degisimMaliyeti` satırı iadeden KALDIRILMALI — yoksa aynı lira iki kez. 📌 Kapsam: canlıda bugün **1** `EXCHANGE_OUT` hareketi var; değişen kural mevcut kâr damgalarını bayatlatır, yeniden hesap gerekir. |
| **K41** | **`11473322212` iade tipi — ✅ ÇÖZÜLDÜ 24.08.2026** | ✅ **CEVAP AXCALI'DAN GELDİ:** _"Değişim oldu, para bizde kaldı, yeni ürün gönderildi, hasarlı ürün çöp oldu."_ İade **para iadesi** gibi hesaplanmıştı; **değişime** çevrildi. **ÖNCE:** `KAYIP_GELIR −2.980` · `KOMISYON_IADE +439,55` · `STOPAJ_IADE +24,83` · NET-2 **−377,38**. **SONRA:** ciro ve komisyon DURUYOR, yalnız `MALIYET_GERI +1.799` ve `IADE_KARGO −101` kaldı · NET-2 **+1.714,83**. Fark **+2.092,21**. ⚠ **KÖK NEDEN ZİNCİRİ, ÜÇÜ DE AYNI GÜN BULUNDU:** ① iade formunun ön-doldurması GEREKÇEYE bağlıydı, müşteri sebebi `HASARLI` olduğu için ayrılan değişim ürünü forma hiç taşınmadı; ② motor değişimi tek satırdan anlıyor (`degisimMi = kalem.degisimMaliyeti !== null`), alan boş gelince `false`; ③ iade para iadesi gibi hesaplandı. Üçü de düzeltildi (ön-dolu artık VERİYE bakıyor). ⚠ **SNAPSHOT DOKUNULMAZLIĞI BURAYA UYMADI VE SEBEBİ YAZILDI:** o ilke DOĞRU koşullarla hesaplanmış damgayı korur; bu damga YANLIŞ GİRDİYLE hesaplanmıştı, korunacak olan geçmiş değil hatanın kendisiydi. ⚠ **`MALIYET_GERI` KALDI VE DOĞRU:** eski mal fiziken döndü, maliyeti geri geldi; sonra K38 ile hurdaya düşüp kayıp DÖNEM tarafına yazıldı (fire zararı ₺1.799). Aynı lira iki kez düşmüyor. 📌 Ledger'a dokunulmadı: yalnız kesinti dökümü (fotoğraf) ve NET damgası yeniden yazıldı; iz `AuditLog`ta önceki/yeni değerlerle. |
| **K42** | **Fire zararı düzeltme trafiğini kayıp sayıyor — [ÖLÇÜLDÜ, KARAR BEKLİYOR]** | 🔥 **MERDİVEN İNİLDİ 24.08.2026 ve UCUZ ÇÖZÜM ÇÜRÜDÜ.** **ÖLÇÜM:** ağustos fire zararı ₺15.951,36 · kazanç ₺13.475,20 · net **−2.476**. Eşleşen çift **4 tane, ₺13.475 — zararın %84,5'i**. Gerçek kayıp yalnız iki harekette: `Fire` ₺650 + `Hasar/kırılma` ₺1.799 ≈ **₺2.449**. **BASAMAK 1 DENENDİ:** elle düzeltme neden seçmeyi ZORUNLU tutuyor (`duzeltme-actions.ts`), sistem yazıcıları (`iptal-geri-alma`, `satis-duzenleme`) hiç neden vermiyor → _"fire zararı = BEYAN EDİLMİŞ kayıp"_ ölçütü mevcut alanla (`adjustmentReasonId`) kurulabiliyor, şema açılmıyor. ⚠ **AMA ÖLÇÜM ONU ÇÜRÜTTÜ:** süzgeçle zarar 9.926 · kazanç 11.076 · net **+1.150** — görünen net gerçeğe (−2.449) YAKLAŞMIYOR, UZAKLAŞIYOR. Sebep: sistem aynaları ASİMETRİK (zarar 6.025 ↔ kazanç 2.399), çünkü iptalin `+` tarafı `SALE_CANCEL_IN` fire süzgecinde HİÇ YOK, geri almanın `−` tarafı VAR. **Tek yönlü sızıntı.** ⚠ **VE ASIL GÜRÜLTÜ KALIYOR:** kalan ₺9.926 zararın ₺7.198'i KULLANICI GİRDİSİ bir çift (`OYU-LG-598P-01`: _"mükerrer kayıt"_ ↔ _"Sayım farkı"_) ve **hiçbir alan bu ikisini "aynı olay" diye işaretlemiyor.** Veriden ayırt edilemez. 💡 **İKİ AYRI İŞ, İKİ AYRI KARAR:** ① **tek yönlü sızıntı** — `SALE_CANCEL_IN`in `+` tarafı sayılmadığı hâlde geri almanın `−` tarafı sayılıyor; bu bir DOĞRULUK hatası, ayrı düzeltilebilir. ② **düzeltme mi kayıp mı** — nedenlere bir ayrım gerekir (`StockAdjustmentReason`e bayrak = **şema, basamak 4**) ya da rakam olduğu gibi bırakılıp ekranda kayıp/kazanç/net ÜÇÜ BİRDEN okunur yapılır. ⛔ **HİÇBİRİ UYGULANMADI** — ölçüm, ucuz çözümün işe yaramadığını gösterdi; yarım düzeltme görünen rakamı daha yanlış yapardı. |
| **K43** | **Yedi liste ekranı sütun tavanının üstünde — [AÇIK]** | 📐 **ÖLÇÜLDÜ 23.08.2026.** `yerlesim:dogrula` liste tablolarında **7 sütun tavanı** tutuyor ama ölçütü **elle tutulan üç dosyaydı**; `src/app` altında `<TableHeader>` taşıyan **20 sayfa** var ve **YEDİSİ tavanın üstünde**: `iadeler` **9** · `stok` · `kartlar` · `giderler` · `envanter-degeri` · `ayarlar/kanallar` · `alimlar/[id]` **8**. ⚠ **HÜKÜM DEĞİL, SORU.** Tavan (7) o üç ekranın İÇERİK genişliğine göre ölçüldü (_"~1045px'e sığıyor, 8. sütun taşırıyor"_). Sütunları dar olan bir ekran (rozet · ikon · kısa sayı) sekizle de sığabilir. Gerçek ölçüt piksel genişliği ve o **tarayıcı ister** — projede otomasyon yok (karar 08.08.2026). Yani sayı bir **VEKİLDİR** ve vekil, ölçüldüğü kümenin dışına uygulanamaz. ⚠ **BU YÜZDEN ÖLÇÜT KÖRLEMESİNE TERSİNE ÇEVRİLMEDİ:** hepsine uygulamak yedi ekranı birden **uydurma kırmızıyla** yakardı. `/kanal-sku` listeye eklendi (aynı şekilde metin ağırlıklı, tam 7 sütun). ⛔ **AÇILIŞ ŞARTI: gerçek cihazda bakış.** Halil dar viewport'ta yedi ekranı açıp yatay kaydırma çubuğu çıkıyor mu diye bakar; çıkanlar `iki-satir.tsx` ile daraltılır, çıkmayanlar için tavan o ekran sınıfına göre yeniden ölçülür. |
| **K36b** | **Değişim kargosu — ✅ [KOŞTU] 24.08.2026, ŞEMA GEREKMEDİ** | 🚚 **KAPANDI.** Kalem _"kargo yanlış cebe yazılıyor"_ diye açılmıştı; ölçüm gösterdi ki kargo **hiçbir cebe yazılamıyordu** — alan (`Return.reshipCargoAmount`) ŞEMADA VARDI ama **iki kapıyla** birden kapalıydı: ① blok yalnız `returnType === DISPUTED` iken çiziliyordu (o iade NORMAL'di), ② input `disputedReshipPaidBySeller` false ise DISABLED'dı (TY'de false). ⚠ **BAYRAK YANLIŞ DEĞİL, KAPSAMININ DIŞINA UYGULANIYORDU** — şemadaki tanımı _"itirazlı iadede AYNI ürün müşteriye geri gönderilirken"_; değişimde giden YENİ bir üründür ve şema zaten _"değişimde her zaman satıcıda"_ diyordu. Ölçüt artık **"müşteriye mal çıkıyor mu"**; politika **kilit değil ipucu**. ✅ **VAKA KAPATILDI:** `11473322212`ye kanal belgesinden `₺174,32` yazıldı (`Değişim Gönderisi · 8 desi · ARAS`), iade NET-1 `1.698,00 → 1.523,68` · NET-2 `1.714,83 → 1.569,57`. Betik idempotent, iz `AuditLog`ta belgesiyle. ⚠ **ÇİFT SAYIM VE SIFIR SAYIM BİRLİKTE SINANDI:** `141,42 + 174,32 = 315,74` = TY panelindeki Kargo sütunu birebir; korkulan çift sayım değil, **ters yüzü** gerçekleşmişti — bacak hiç yazılmamıştı. 🧪 `rma:dogrula` 495→507 · 7 mutasyon, 7'si yakalandı. ⏭ **AÇIK KALAN (K36b'nin asıl sorusu):** kargo hâlâ İADENİN NET'inde; K36a kuralına göre SATIŞIN NET'ine mi gitmeli? Bu bir **atıf** sorusu, "kaydedilebiliyor mu" sorusu değil — ayrı karar. |
| **K37** | **Değişim ürünü gönderildi düğmesi — ✅ [KOŞTU] 23.08.2026** | 🔘 Bildirim satırında düğme: `EXCHANGE_OUT` hareketini **FIFO'dan doğrudan** yazar, iade formuna hiç uğramaz. ⚠ **NİYE GEREKLİ — ÖLÇÜLDÜ:** `11473322212` satışının 1 adedi zaten iade edilmiş, form _"Tamamı iade edildi"_ diyerek kapanıyor; oysa gönderilen değişim ürünü bir **iade değil bir ÇIKIŞ**. Kalan iade hakkı, iadeyle ilgisi olmayan bir stok çıkışını engelliyor. Hareket **bağlı** doğar (satış + bildirim) ve maliyeti K36 kuralıyla satışın NET'ine gider. 📌 İlk vaka: `11473322212`'nin açık `ITIRAZ_KABUL` bildirimi, 1 × `axcali1610` → stok **12 → 11** beklenir. |
| **K38** | **Hurda zararı — ✅ [KOŞTU] 23.08.2026** | 🗑 **Halil hükmü 23.08.2026:** `11473322212`'den dönen kırık `axcali1672` **çöp** — satılabilir stoktan düşülür. ⚠ **VAKA NASIL DOĞDU:** iade işlenirken form `1 sağlam` diye ön-dolu geliyordu (o hata bugün düzeltildi) ve kırık mal **stoğa girdi**: `RETURN_IN +1 × ₺1799`, ledger stoğu **1**. ✅ **KÂR TARAFI ÖLÇÜLDÜ — CEVAP (a)'ya YAKIN:** rapor **zaten** _fire zararı_ tutuyor (`ADJUSTMENT`+`COUNT_CORRECTION`, **FIFO maliyetiyle**, kayıp ve kazanç AYRI, **dönem** tarafında — satışın NET'ine değil). Yani istenen tasarımın çoğu kurulu. ⚠ **AMA BİR İSTİSNASI TAM BURAYA ÇARPIYOR:** `returnItemId` dolu hareketler fire toplamından **bilerek dışlanıyor** (çift sayım koruması; canlıda 08.2026'da net etki −1.327,99 ölçülmüş). Hurdayı iadeye bağlasaydık **hiçbir yere** yazılmayacaktı. **KARAR (mimar, 23.08):** hareket `returnItemId`**siz** yazılır → fire zararına girer; bağ **`AuditLog`'da YAPILANDIRILMIŞ (JSON)** durur: satış no + bildirim id + _"Halil hükmü 23.08: çöp"_. Serbest metin `note` tek başına yetmez — üç ay sonra aranamaz. 📌 Neden zaten var: _"Hasar / kırılma"_ (`ADJUSTMENT`, `EKSI`). Şema açılmıyor. Beklenen: `axcali1672` **1 → 0**. |
| **K39** | **Kapanmış bildirim iptal edilebilsin — ✅ [KOŞTU] 24.08.2026** | ✅ **TESLİM.** `KAPANDI → IPTAL` geçişi açıldı; ekranda gerekçe zorunlu diyalog (`en az 10 karakter`), iz `AuditLog`ta **önceki durum + gerekçe + kim** ile. ⚠ **SESSİZ YAN ETKİ YAKALANDI VE KAPATILDI:** `kapaliMi` eskiden _"ileri geçişi kalmamış"_ diye TÜRETİLİYORDU ve bu tesadüfen doğruydu. `KAPANDI`ya çıkış eklenince türetme bozulacaktı — `kapaliMi("KAPANDI")` **false** dönerdi ve iki şey birden sessizce yanlış çalışırdı: ① panel çanı kapanmış HER bildirimi "bekleyen iş" sayardı, ② `durumDegistir`in kapalı-bildirim kapısı açılırdı. Ölçüt artık AÇIKÇA yazılı (`UC_DURUMLAR`): kapalı olmak, çıkışı olmamak değildir. ⚠ **ÖLÇÜT "HANGİ VERİYİ BOZAR":** `returnId` doluysa arkasında işlenmiş iade var — iptal onu SAHİPSİZ bırakırdı (iade yaşar, doğuran bildirim "hiç olmadı" der). Bu kayıtlarda düğme **hiç çizilmiyor** ve sunucu ayrıca reddediyor. ⚠ **"TEST" İŞARETİ KONMADI** (mimar kararı): ikinci doğruluk kanalı yok, durum tek dil. ⚠ **İPTAL PARAYA VE STOĞA DOKUNMAZ** — bekçi bunu koşulur hâlde tutuyor (`stockMovement` ve `satisKarTazele` yasak). 📌 **SAYIM AŞILDI:** pano _"3 aday"_ diyordu; o rakam yalnız `11473322212`nin bildirimlerini sayıyordu. **Tüm defterde ölçüm (`npm run canli:k39-adaylar`): 19 bildirim · 11 KAPANDI · 8 IPTAL · aday 8 · korunan 3** (`11502693455` · `11471381662` · `11473322212`). Geçerli olan **8**. ⚠ Adaylardan biri (`11504122276`, 14.08 10:59) **1 adet ayrılmış** taşıyor — iptal ayırmayı düşürür, bakılsın. 🧪 `rma:dogrula` 464→495 · **22 mutasyon, 22'si de yakalandı.** |
| **K40** | **Hasarlı iadede tazmin sorusu geç kalıyor — ⏸ YARIN (iade paketi)** | ⏱ Tazmin sorusu iade **İŞLENMEDEN** sorulmalı; işlendikten sonra geç kalınıyor — bu vakada kaçtı (`11473322212`, kırık `axcali1672` stoğa girdi, tazmin hiç açılmadı). K31 ekranına ileride hatırlatma satırı olabilir. ⛔ **BUGÜN DEĞİL** — mimar açıkça iş açmadı, kalem yalnız kaydedildi ki unutulmasın. |
| **K14t** | **TUZAK: hesap ADLA bulunuyor** | `panel.ts:251`. **Bugün güvenli** (arama kanal içinde, tek kanalda çakışan ad yok). **Açılış: tek bir kanala harf farkıyla ikinci hesap açılması** — MySQL harf duyarsız karşılaştırması o an ikisini birleştirir. |
| **K14c** | **Sessiz desen: kanal adına gömülü sözlük** | `canli-komisyon-envanter.ts:55`. Eşleşmezse **sessizce boş** döner ve boş dönüşü **makul görünür**. Düzeltilmiyor (iş değeri yok). **Açılış: kanal adının düzenlenmesi.** |

---

## 📌 Ölçüm kayıtları — iş değil, gerekçe

Bunlar kapanmış ölçümlerin **bugün geçerli** özetleri; ayrıntı arşivde.

- **TY İÇE AKTARMA ÇOK ADEDİ ÇOK SATIRA ÇEVİRİR (31.08.2026):** içe
  aktarılan satışların **%0,12'sinde** adet>1 (7/5688), elle girilenlerin
  **%1,5'inde** (3/194) — **12 kat** fark. Aynı satışta aynı varyanttan
  birden çok satır olan **86** satış var. **Para etkisi ÖLÇÜLDÜ: YOK** —
  sabit giderler (`SABIT_GIDER` 33 · `HIZMET_BEDELI` 4 · `ODEME_GIDERI` 4)
  bölünmüş satışların **hiçbirinde** birden çok kez yazılmamış; kalem
  başına olanlar (`KOMISYON` · `MALIYET` · `STOPAJ`) doğru şekilde satır
  başına. ⚠ **SATIR SAYISINA DAYALI BİR METRİK YAZILIRSA BU BİLİNMELİ** —
  "kaç kalem sattık" sorusuna satır sayarak cevap veren her rapor, içe
  aktarılan satışları olduğundan çok gösterir. _(Ölçüm:
  `scripts/canli-rakam-saglik.ts` · `scripts/canli-sabit-gider-kontrol.ts`)_

- **RAKAM SAĞLIĞI — ALIŞ · SATIŞ · MALİYET (31.08.2026, canlı):**
  geçerli satış **5843** (39 iptal), tamamı `CALCULATED` — ve damga
  **karşılıklı**: hareketi hiç olmayan 28 satış kalemi var ama bunları
  içeren **geçerli satış SIFIR** (hepsi iptallerde). Yani 28.08'in
  "2493 satış maliyetsiz hâlde hesaplandı sayılıyor" hatası **kapandı**.
  NET yazma kapısı iki yönde de temiz (0 / 0). Çıkışların **6082'sinin
  6'sında** birim maliyet yok ve **hiçbiri satışa bağlı değil**
  (`ADJUSTMENT`/`COUNT_CORRECTION`); parti bağı olmayan çıkış **0**.
  Alışta sıfır maliyetli kalem **0**; 1986 alımın **27'sinde** (%1,4) mal
  kabul tarihi yok.
  ⚠ **AÇIK KALAN ÜÇ ŞEY:** ① stoklu 231 varyantın **107'sinde** parti bağı
  şüpheli (K91b kapandı, onarım yolu yok) — geçmiş satışların maliyet
  ATFINI etkiler, toplamı değil; ② **1 satış kaleminde adet = 0**
  (K116②); ③ 29.08 sayımında **14 adet maliyetsiz** düşülmüş — envanter
  değerlemesinde boşluk, satış kârında değil (K116③).

- **K98 turunun üç bulgusu (30.08.2026):**
  · **Renk anlam taşır ve tek kaynaktan gelir.** Hata ekranının simgesine
    `text-amber-600` yazdım; `panel:dogrula` kırmızı yandı ve **haklıydı**.
    Doğrusu `DURUM_YAZISI.uyari` (`src/lib/renkler.ts`). Bekçi izlenmeyen
    dosyaları da tarıyor, o yüzden commit'ten ÖNCE yakaladı.
  · **Mutasyon harness'inin kapısı EKLEYEN mutasyonu ölçemiyordu.** Kapı
    _"diskte hâlâ eski satır var mı"_ diye bakıyordu; bir satırın ÜSTÜNE
    ekleyen mutasyonda eski satır zaten yerinde kalır. İki `FAZLADAN`
    mutasyonu "ölçülemedi" düştü. ⛔ **Kolay çare onları SİLMEK olurdu —
    yani "yanlış yanma" yönünü büsbütün korumasız bırakmak.** Kapı tam
    eşitliğe çevrildi ve **üç harness'e birden** uygulandı; ötekilerde bugün
    ısırmadığı ölçüldü (21 ve 9 çiftin 0'ı ekleyen).
  · **Bildirilen çıkış kodu İKİ KEZ yalan söyledi.** Hem bekçi turu hem push
    için ortam _"exit code 0"_ dedi; gerçek kod boruda başka yerdeydi
    (`| tail` ve `; echo` ikisi de yutuyor). İlk tur aslında **1**'di
    (`panel:dogrula`). Çıktı okunmasaydı **kırmızıyla push edilecekti** —
    anayasadaki `| tail -2` dersinin üçüncü vakası.
- **PWA Halil testi (22.08.2026, gerçek cihaz — Android, canlı adres):**
  **8/8 geçti.** İlk turda 7 madde ölçüldü, madde 4 (iPhone) cihaz yoktu;
  aynı gün iPhone bulundu ve **sorunsuz** geçti. Ölçülenler:
  kurulum teklifi çıktı · simge ve adres çubuksuz açılış ✓ · sistem çubuğu
  temayla döndü ✓ · uçak modunda **rakam değil "Bağlantı yok"** çıktı ✓ ·
  bağlantı gelince panel açıldı ✓ · el kitabında bölüm ✓ · **bilgisayardan
  değiştirilen satış telefonda yenileyince YENİ rakamla geldi ✓** — yani
  önbellek veriye dokunmuyor, tasarım sahada doğrulandı.
- **Eksik sipariş (22.08.2026, iki kanal, salt okuma):** TY `01.08–20.08` → 143 sipariş, bizde 38, **eksik 105** · HB `03.08–15.08` → 51 sipariş, bizde 6, **eksik 45**. Okunamayan satır **0/0**. Araç: `npm run canli:eksik-siparis -- "<dosya>"`. ⚠ HB dosyasında adresler tırnak içinde SATIR SONU taşıyor: naif ayrıştırma 62 ham satırı 62 kayıt sanıp "9 okunamadı" diye **olmayan bir eksiklik uydurmuştu**; doğru ayrıştırmayla 51 kayıt, 0 okunamayan.
- **N11 (fatura, 22.08.2026):** komisyon faturasındaki 3 siparişin **üçü de sistemde yok** (`218135584424` · `218277164422` · `231686994420`). Temmuzda 60 alım kaydına karşı **1 satış**; temmuzda stok düzeltmesi **0**, yani girmek çift düşme yaratmaz.
- **Hakediş örtüşmesi (24.08.2026, salt okuma — `npm run canli:hakedis-ortusme`):** 1136 kalem · **385 farklı sipariş no** · sistemde 121 satış · **kesişim 5**. Sipariş no BOŞ olan kalem 47. Biçim **uyuşuyor** (hakediş 10hane×129 + 11hane×256; satış 10hane×20 + 11hane×92 + 12hane×7). Vade ufku `08.07 → 03.09`, satış ufku `17.06 → 24.08` — **dönemler örtüşüyor.** ⚠ Yani `0`a yakın eşleşme bir gecikme değil, **kapsam boşluğu**: eksik olan kanalın satırı değil bizim siparişimiz. _Bu ölçüm H3'ün "~20.09'a kadar bekle" gerekçesini düşürdü._
- **Kapsam (en güçlü):** TY sipariş dökümü `01.08–20.08` → **143 sipariş, bizde 38, eksik 105.** Sipariş numarasıyla eşleştirildi.
- **Kapsam (tarife raporu):** geçerli olan **geniş** dosya `…19_04_51.xlsx` (97 satır, `30.06–21.08`) → rapor 227 adet, bizde 9, ciro **₺747.024** (`Toplam Tarifeli Brüt Ciro`, **KDV dahil** — ölçüldü, en büyük sapma %0,29). **Aşıldı:** dar dosya `…18_40_30.xlsx` → 72/8.
- **Oran denetimi:** **sapma 0** — _"~₺18.000 eksik kâr"_ tahmini çürüdü.
- **Aylık:** haziran 1 satır (net 0) · temmuz 1 satır (net 0) · ağustos 38 satır. **Ağustostan önce net sıfır TY satışı.**
- **Hesap:** TY'nin tek satış hesabı **AXCALI** (`externalId = 870249`, rapor dosyasının satıcı kimliği). `s.ahmet` ve `SEDA` **alım** hesapları, sıfır satış → kapsam karışmıyor.
- **`HIZMET_BEDELI` ₺12,60'ın payı:** fiyatın **binde 3'ü**, marjın **onda biri** (NET-2'ye oranla A max %5,54 · B max %15,18).
- **Buy box verisi (ölçüldü 21.08.2026, gerçek dosyalar):** Trendyol ürün
  listesinde **`BuyBox Fiyatı` kolonu VAR** — 1581 satırın 189'unda dolu ve
  o 189, `Durum` alanı temiz olan **canlı listelerin tamamı** (kalan 1392'nin
  hepsinde bir sorun var: 790 "stok girin", 373 "fiyat girin", 136 orijinallik
  şüphesi, 40 arşiv). Barkod **189/189** dolu → kimlikle eşleşir.
  **Hepsiburada fiyat VERMİYOR**, yalnız sıra veriyor (`Buybox Sırası`:
  1. sırada 1071 · 2-3'te 515 · 4+'ta 565). N11 dosyası elde yok, ölçülmedi.
  ⛔ **OTOMASYON BİLEREK AÇILMADI** — kullanıcı kararı 21.08.2026:
  _"buybox fiyatlarını manuel gireceğim, ürün arama sırasında anlık takip
  ediyorum; otomasyona ihtiyacım şu an yok."_ `ChannelSku`'ya sütun eklemek
  ve dosyadan doldurmak **teknik olarak hazır**; açılış şartı kullanıcının
  elle takibi yetersiz bulması. _Bu kalem yeniden açılana kadar iş değildir._
- **Fiyat farkı (aynı dosya):** bizim TY fiyatımız buy box'a göre ortanca
  **+%24,1** (p25 +5,6 · p75 +47,1 · max +177,2); **170/189 listede buy
  box'ın ÜSTÜNDEYİZ.** Kasıtlı mı bayat mı — sorulmadı.
- **Bekçi taraması (21.08.2026, hepsi koşturuldu):** 36 `dogrula` betiğinden
  **34'ü yeşil**, ikisi kırmızı (`yerlesim` → K23 · `yedek` → K25). Bütün
  bekçiler çıkış kodu üretiyor — sorun kodda değil, **koşulmuyor olmasında**.
  Her teslimde rutin olarak koşulan: `simulasyon · kar · panel · i18n · lint ·
  tsc · build` = **7 tanesi**. Kalan 29'u yalnız dokunulan alana göre
  koşuluyordu; `yedek:dogrula`nın kırmızısı bu yüzden görünmemişti.
  _Yetim dosya: `kart-dogrula.ts` (K26), npm girdisi yok._
- **Ölçüm anı:** rapor tarafı **donmuş**, sistem tarafı **akıyor** — aynı gün iki koşum 8→9 verdi. Her kıyasta iki damga yazılır.
