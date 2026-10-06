# Algoritmo UI & Veri Modeli — Ayrıntılı Analiz (Bezirga için)

Oct 7, 2026 · @Halil

## 1. Kaynak, kapsam ve kullanım çerçevesi

Analiz, 46 ekran görüntüsü (insight.algoritmo.de, 26.09.2026, HafenX UG hesabı, 3420×2214 px Retina) ve algoritmo.de'nin açık sayfası üzerinden yapıldı; piksel ölçüleri ve renk kodları görüntülerden doğrudan örneklendi.

| Konu | Durum |
| --- | --- |
| Ürün sahibi | Digital Hub Hannover GmbH (algoritmo.de). Konumlandırma: "Profit & Execution Platform" — Profitabilität · Vorausschau · Entscheidung |
| Modüller (siteye göre) | Profit Report, KPI-Center, Online Marketing, Bestandsplanung, Kundensegmentierung, Prognosen, KI-Empfehlungen, Activity Stream, KI-Assistent (MCP ile ChatGPT/Claude'dan erişim), B2B & EDI |
| Görüntülenen sayfalar | Dashboard (6), Orders (5), Products (2), Profit Report (3), Online Marketing (3), Activity Stream (1), Notification Settings (1), Audience (2), Warehouse Report (11), Demand Planning (7), Purchase (1), Forecast Center (1), KPI Center (3) |
| Veri içermeyen sayfalar | Online Marketing, Audience, Purchase ("Sorry, we couldn't find any results"), Forecast Center ("Not activated"), Recommendations/Report Center/EDI görüntülenmedi |
| Ölçek | Görüntü 2× Retina; metinde verilen px değerleri CSS px'e çevrilmiştir (görüntü px ÷ 2), yaklaşık ±2 px |

**Kullanım sınırları.** Yerleşim, kart tipleri, tablo davranışı, grafik seçimleri ve bilgi mimarisi tasarım kalıbıdır; Bezirga'da serbestçe yeniden üretilebilir. Alınmaması gerekenler: Algoritmo logosu ve adı, birebir pembe-bordo kimlik, ekran görüntülerindeki HafenX verileri (hesap no 430812, tedarikçi adları, EAN/ASIN/SKU, ciro ve stok rakamları) — demo, tanıtım ya da test verisi olarak dahi. Bezirga'nın mevcut paleti (Kobalt #12356B, Safran #E3A13A) marka rengi olarak kullanılır; bölüm 8'de token çevirisi verilmiştir.

## 2. Tasarım token'ları (ekrandan ölçülen)

Sistem tek bir marka rengi (#DE3D68) + üç semantik renk (yeşil/kırmızı/amber) + iki grafik rengi (mavi/yeşil) üzerine kurulu; gri ölçeği 5 kademede sabit.

### 2.1 Renk

| Token | Hex | Kullanım yeri |
| --- | --- | --- |
| color.brand | #DE3D68 | Primary buton, aktif menü yazısı ve dikey vurgu çizgisi, export ikonları (CSV/XLS), filtre-profil ikonları, olay tipi daire ikonları, bildirim koşul chip'leri (outline), toggle açık durumu, slider |
| color.brand.soft | #FCF0F3 | Aktif menü öğesi zemini |
| color.brand.chart | #E35A7E | Bar grafikte "Costs" serisi, KPI kart mini sparkline çubukları |
| color.chart.blue | #5C7CF7 | Bar grafikte "Revenue" serisi |
| color.chart.blue.2 | #448EF7 / #4065F6 | Donut dilimleri, stok halkalarında "Excess" |
| color.chart.green | #4B9831 | Line grafikte "Margin (DB1)" serisi (nokta + çizgi) |
| color.success | #7AD34D | Trend ok ikonu, donut dilimi, pozitif yüzde |
| color.success.soft | #EAF8E2 | "Standard" öncelik pill'i, "Available" stok pill'i, pozitif trend pill zemini |
| color.danger | #EC574C | Negatif trend, donut dilimi, Critical yazısı |
| color.danger.soft | #FCE4E2 | "Critical" pill'i, "Out of stock" / "No data" pill'i, negatif trend zemini |
| color.warning | #F6C444 | "Important" yazısı, Demand Planning "Order" kartı çerçevesi, Calculated Forecast serisi |
| color.warning.soft | #FEF5E1 | "Important" pill zemini, Order kartı zemini |
| color.bg.page | #F3F5F9 | İçerik alanı zemini |
| color.bg.card | #FFFFFF | Kartlar, sidebar |
| color.bg.muted | #F2F3F5 | Kiracı kartı, tablo başlık bandı, Summary satırı, KPI-Center koşul kutuları, Inactive pill |
| color.border | #DCE0E6 | Sidebar sağ kenarı, tablo satır ayırıcıları, input çerçeveleri |
| color.text.heading | #232B35 | Sayfa başlığı, kart başlığı, büyük KPI rakamları, ürün adı |
| color.text.body | #667380 | Menü yazıları, tablo hücreleri, breadcrumb |
| color.text.muted | #919FA4 | Etiketler ("Time period", "vs. previous period"), sütun başlıkları, eksen yazıları |

### 2.2 Tipografi

| Rol | Boyut (CSS px) | Ağırlık | Renk |
| --- | --- | --- | --- |
| Sayfa başlığı ("Dashboard") | 22–24 | 600 | heading |
| Breadcrumb ("Page • Dashboard") | 12 | 400 | body / muted |
| Kart başlığı ("Order Revenue and Costs") | 15–16 | 600 | heading |
| KPI büyük rakam | 20–22 | 700 | heading |
| KPI başlık | 12–13 | 500 | body |
| KPI ikincil değer (parantez) | 12 | 400 | muted |
| Trend pill yazısı | 11 | 500 | success / danger |
| Tablo sütun başlığı | 12 | 500 | muted |
| Tablo hücre | 13 | 400 | body (sayılar sağa hizalı, tabular) |
| Summary satırı | 13 | 700 (Total) / 500 (Current page) | heading |
| Ürün adı | 13 | 600 | heading |
| Ürün meta (Ean/Asin/Sku) | 11 | 400 etiket + 600 değer | body |
| Menü öğesi | 13 | 400 (aktif: 500) | body (aktif: brand) |
| Menü grup başlığı ("INSIGHT YOUR DATA") | 11 | 600, letter-spacing \~0.08em, uppercase | heading |
| Floating label (input üstü) | 10–11 | 400 | muted |

Yazı tipi geometrik humanist sans (Rubik ile aynı metrikler: yuvarlak terminaller, geniş x-yüksekliği). Rakamlarda tabular-nums kullanılmış; para birimi öneki (€) rakamla aynı ağırlıkta.

### 2.3 Boşluk, köşe, gölge

| Token | Değer | Not |
| --- | --- | --- |
| space.gutter | 40 px | Sidebar ile ilk kart arası ve sağ kenar boşluğu |
| space.card.gap | 24–32 px | Kartlar arası dikey ve yatay boşluk |
| space.card.pad | 24 px | Kart iç padding'i (başlık ve içerik) |
| space.row.y | 14–16 px | Tablo satır dikey padding'i; ürün hücreli satırlarda 20 px |
| radius.card | 12 px | Tüm kartlar |
| radius.input | 8 px | Select, input, chip grubu |
| radius.pill | 999 px | Durum/öncelik/trend pill'leri, chip'ler |
| radius.button | 8 px | Primary buton ("New Cost Rule") |
| shadow.card | 0 2px 8px rgba(35,43,53,0.06) | Çok hafif; kart kenarlığı yok |
| sidebar.width | 280 px | Logo alanı 64 px yüksek, kiracı kartı 88 px |
| topbar.height | 72 px | Başlık + breadcrumb, sağda bayrak (24 px) ve avatar (28 px) |
| icon.menu | 20 px | İki tonlu çizgi ikon; aktif olanda brand rengi |
| icon.action | 18 px | Tablo satır aksiyonları (göz, indir, mail), düzenle/sil |

## 3. Yerleşim iskeleti

Her sayfa aynı üç katmanlı iskeleti kullanır: 280 px sabit sidebar, 72 px topbar, tek sütunlu kart akışı (kartlar 1/1 veya 1/2 genişlikte).

### 3.1 Sidebar (280 px, beyaz, sağda 1 px #DCE0E6)

| Blok | İçerik | Ölçü / davranış |
| --- | --- | --- |
| Logo alanı | Marka logosu, ortalı | 64 px yükseklik; üstte sol-üst köşede daralt/genişlet, sağda grid ve liste görünüm ikonları (3 ikon, 16 px) |
| Kiracı kartı | Satır 1: hesap no (430812) · Satır 2: firma adı (HafenX UG) · Satır 3: kullanıcı adı | Zemin #F2F3F5, radius 8, padding 16, 88 px yükseklik; multi-tenant bağlam göstergesi |
| Grup başlığı | "INSIGHT YOUR DATA", "ACCOUNT", "EDI DATACENTER" | 11 px uppercase, gruplar arası 32 px boşluk |
| Menü öğesi | İkon (20 px) + etiket; alt menülüler sağda ">" / "⌄" | 40 px satır yüksekliği, ikon-etiket arası 12 px; hover zemin #F7F8FA |
| Aktif öğe | Zemin #FCF0F3 tam genişlik, sağ kenarda 3 px #DE3D68 dikey çizgi, etiket brand renk ve 500 ağırlık | Alt menü öğesi aktifken yalnızca zemin, çizgi yok ("Notification Settings", "Warehouse Report") |
| Alt menü | Girinti 32 px, ikon yok, 13 px | Akordeon; açıkken üst öğe "⌄" |

Menü ağacı (gözlenen): Dashboard · Orders · Products · Profit Report · Online Marketing · Activity Stream › Notification Settings · Recommendations · Audience · Stock Management › Warehouse Report / Demand Planning / Purchase / Forecast Center · KPI Center · Report Center ‖ ACCOUNT: User Management · Account Settings ‖ EDI DATACENTER: EDI Dashboard.

### 3.2 Topbar (72 px, sayfa zemininde, kenarlık yok)

- Sol: sayfa başlığı 22–24 px 600; altında breadcrumb "Page • \<Sayfa>" (ayırıcı nokta brand renk).
- Sağ: dil bayrağı (24 px, tıklanınca dil menüsü) + avatar daire ikonu (28 px). Arama, bildirim zili yok.
- Kaydırmada topbar sabit kalır; içerik altından geçer (arka planı sayfa zemini, blur yok).

### 3.3 İçerik alanı

- Maks. genişlik yok; sidebar hariç tüm genişlik, 40 px gutter.
- Grid: 2 sütun, 24–32 px gap. Dashboard'da sıra: tam genişlik (gelir/maliyet) → tam genişlik (Top Seller: 1/2 tablo + 1/2 donut) → 1/2 + 1/2 (kategori/sezon ve renk/beden) → 1/2 + 1/2 (ülke ve durum) → 1/2 + 1/2 (stok özet ve stok sağlığı) → 1/2 + 1/2 (stok durumu ve ABC).
- Rapor sayfalarında sıra: filtre kartı (tam) → KPI şeridi (3 sütun) → tablo kartı (tam).
- Kart başlığı sol üstte; zaman aralığı veya küçük filtreler başlıkla aynı hizada sağda ("Time period" floating-label input).

### 3.4 Sabit öğeler

| Öğe | Konum | Görünüm |
| --- | --- | --- |
| İpucu FAB | Sağ alt, 24 px kenar boşluğu | Beyaz daire 40 px, sarı ampul ikonu |
| Sohbet/asistan FAB | İpucu FAB'ın sağında, 12 px boşluk | Brand renkli daire 48 px, beyaz baloncuk ikonu |
| Scroll-to-top | Yok | — |
| Kaydırma çubuğu | Native, ince | Tablolarda yatay çubuk kartın içinde, 6 px |

## 4. Bileşen kütüphanesi

On üç tekrar eden bileşen tüm ekranları oluşturuyor; aşağıda her birinin yapısı, durumları ve ölçüleri.

### 4.1 Filtre kartı

| Parça | Spesifikasyon |
| --- | --- |
| Select (outlined) | 40 px yükseklik, radius 8, 1 px #DCE0E6; floating label 10–11 px muted, çerçeveyi kesecek şekilde sol üstte; sağda ▾ ikon 16 px. Seçili değer 13 px body. Çoklu seçimde değer yerine "All" |
| Grid | 4 sütun (Channel · Customer class · Account · Country) veya 2 sütun; satırlar arası 16 px; "Time period" her zaman en sağ sütunda |
| Date range | Tek input, "27/08/2026 – 25/09/2026" formatı; tıklanınca takvim; varsayılan son 30 gün |
| Spalten-chip alanı | Çerçeveli kutu, floating label "Selected columns"; chip'ler 24 px yükseklik, radius 999, zemin #F2F3F5, yazı 12 px, sağda × (12 px); satır sonunda "Select column" placeholder metni; sağ kenarda ▾ (tümünü göster) |
| Arama | Sol büyüteç ikonu, placeholder "Search products"; sağ ucunda arama kapsamı chip'leri (Name · GTIN · SKU · Supplier Article No) ve ▾ |
| Slider | Floating label ("Daily budget"), tek nokta 12 px brand, çizgi 2 px; altında "All" etiketi |
| Toggle | 36×20 px, açıkken zemin brand, kapalıyken #DCE0E6; sağında etiket ("Include bundles", "Use default order types") |
| Order Type kutusu | Çerçeveli chip grubu: Sales Order · Credit note · Warranty Order · Repair Order, her biri × ile; "Select order type" placeholder |
| Filtre profili | "Save Filter Profile" select ("No profile") + sağda 4 ikon (çöp, kaydet, kopyala, sıfırla) brand renk 18 px, 24 px aralık |
| Compare | Checkbox + "Compare to" date input (Profit Report); checkbox + "Start campaign"/"End campaign" (Online Marketing) |

### 4.2 KPI kartı (3'lü şerit)

| Parça | Spesifikasyon |
| --- | --- |
| Kutu | Beyaz, radius 12, padding 20, 1 px #EEF0F3 kenarlık (kart içinde kart olduğundan gölge yok); yükseklik \~96 px |
| Başlık | 12–13 px 500 body, tek satır, taşarsa … |
| Değer | 20–22 px 700 heading; yanında parantez içinde 12 px muted ikincil değer (brüt / önceki değer), taşarsa … |
| Trend pill | 20 px yükseklik, zemin success.soft/danger.soft, içinde eğik ok ikonu 12 px + "+16.2%" 11 px; ardından "· vs. previous period" veya "· Share of revenue 28.9%" muted |
| Sparkline | Sağ altta 5–6 dikey çubuk, 6 px genişlik, 4 px aralık, renk #E35A7E, yükseklik değere göre; eksen yok |
| Varyant | Kompakt (Stock Health): başlık + değer ortalı, trend yok, kenarlıklı kutu 1/3 genişlik |
| Varyant | Alt özet (Top Seller donut altı): "Excluding postage" etiket chip'i + iki kutu ("Revenue after…" / "Margin") değer + sağda yeşil/sarı ok ikonu + yüzde |

### 4.3 Veri tablosu

| Parça | Spesifikasyon |
| --- | --- |
| Başlık bandı | Zemin #F2F3F5, 44 px, sütun adları 12 px muted ortalı; sıralı sütunda ↓ ikon (13 px), aktif sıralı sütun body renk |
| İlk sütun | "Product" veya "Order ID": sabit (sticky), sağında 1 px dikey ayırıcı; genişlik \~360 px (ürün) / \~180 px (sipariş) |
| Summary satırı | Zemin #F2F3F5, sol "Summary" 13 px 600; sağında iki satır: "Current page" (13 px 500) / "Total" (13 px 700); her sayısal sütunda iki değer + sağda toplam türü ikonu: Σ (toplam), Ø (ortalama) 12 px |
| Satır | 1 px #EEF0F3 ayırıcı; hover zemin #FAFBFC; ürünlü satır 120–140 px, sipariş satırı 60 px |
| Hücre hizası | Metin sol, sayı sağ (tabular), pill/badge ortalı |
| Yatay kaydırma | Kart içinde, tablo altında 6 px çubuk; ilk sütun sabit |
| Export | Kart sağ üstünde CSV ve XLS ikonları (dosya + etiket, brand renk, 22 px); yalnızca CSV olan sayfalar: Online Marketing, Audience, Warehouse Report; yalnızca XLS: Demand Planning |
| Pagination | Sağ altta: "Rows per page" + select (5/10/…) · "1–10 of 4432" · ⏮ ◀ ▶ ⏭ (18 px, pasif olan muted) |
| Uyarı | Başlığın yanında kırmızı metin: "\[Some warehouses are disabled ⚠\]" |
| Bilgi satırı | Başlık altı ℹ ikon + italik 12 px: "KPIs in italic columns are informative and have no influence on the calculation." |
| Kebab | Purchase kartında sağ üstte ⋮ menü |

### 4.4 Ürün hücresi

Üç kolonlu kompakt blok; her tabloda aynı:

| Bölge | İçerik | Ölçü |
| --- | --- | --- |
| Üst satır | Dış-link ikonu (16 px, body) + ürün adı 13 px 600, tek satır, 42 karakterden sonra … | Satır yüksekliği 20 px |
| Sol | Thumbnail 48×48, beyaz zemin, radius 4; altında (varsa) "Bundle" badge: zemin #E8F0FF, yazı #2F62D9 11 px, radius 4 | Bundle satırının sol kenarında 3 px #448EF7 dikey çizgi, hücre boyunca |
| Orta | Etiket:değer çiftleri 11 px, etiket 400 body, değer 600 heading: Ean · Asin · Sku; boşluk; Parent ID · Variation ID · Supplier Article No | Satır aralığı 16 px |
| Sağ | Anzahl:SET ( 1 Stü… · Teilig:12-tlg. · Volumen:250ml · Variants:10 | Aynı stil |
| Alt şerit (Demand Planning) | Zemin #F2F3F5, radius 6, 28 px: "Tier: 1 | Model: ets" 11 px muted; sağda yeşil chip "🛒 Order for 30/01/2027" (zemin success.soft, yazı #2E7D32) |
| Komşu stok hücresi | Sayı 13 px 600 + altında pill: Available (success.soft), Out of stock (danger.soft), No data (danger.soft, açık); bundle'da "757 (Bundle)" + göz ikonu | Pill 20 px |

### 4.5 Hücre içi yüzde çubuğu

Değer (13 px 500, brand veya body) + altında 4 px yükseklik, 90 px genişlik iki tonlu çubuk: dolu kısım #DE3D68 (veya #EC574C), kalan #DDEFD6 (açık yeşil). Kullanım: ülke payı, status payı, iade oranı, maliyet payı. Sağında ikinci sütun olarak mutlak değer (€28,130.81) gösterilebilir.

### 4.6 Trend hücresi

24 px daire (zemin success.soft / danger.soft) içinde eğik ok 12 px + sağında yüzde 12 px (pozitif body, negatif danger). Veri yoksa "—". Cost Driver tablosunda iki satır: üstte ok+yüzde, altta önceki dönem tutarı muted.

### 4.7 Pill ve badge seti

| Tür | Örnek | Zemin / yazı |
| --- | --- | --- |
| Öncelik | Standard · Important · Critical | #EAF8E2/#3F8F1E · #FEF5E1/#B7791F · #FCE4E2/#C0392B |
| Durum | Active · Inactive | #EAF8E2/#3F8F1E · #F2F3F5/#667380 |
| Stok | Available · Out of stock · No data | #EAF8E2 · #FCE4E2 · #FCE4E2 (açık) |
| Bilgi | Bundle · Excluding postage | #E8F0FF/#2F62D9 · beyaz, 1 px kenarlık |
| Koşul chip (outline) | profitMax 0 · timePeriod 30\_DAYS · stockMax 10 | Beyaz zemin, 1 px #DE3D68 kenarlık, yazı brand 11 px, radius 999; çok satırlıysa radius 8 |
| Spalten-chip | Order ID × | #F2F3F5 / body |
| ABC harfi | A · B · C | 32 px daire, yazı 14 px 600; A yeşil #7AD34D/zemin açık, B amber, C kırmızı |

### 4.8 Olay satırı (Activity Stream)

Sütunlar: Date (12 px + altında öncelik pill'i) · Rule ID · Section · Event type (36 px brand daire içinde beyaz ikon + sağında kalın tür adı "Stock" ve altında "Last 30 days" muted) · Event (tam cümle, ortalı, 13 px) · Action (3 ikon: göz, indir, mail; 18 px, kenarlıklı 28 px daire).

### 4.9 Bildirim kuralı satırı

Sütunlar: Rule ID · Condition type (brand daire ikon + altında tür adı) · Alert definition (dikey yığılı outline koşul chip'leri, 6 px aralık) · Area · Priority pill · Rule status (toggle) · Time interval ("At 03:00 AM"). Üstte Event type / Sections / Priority select'leri + "Search by e-mail" + filtre profili.

### 4.10 Maliyet kuralı satırı (KPI Center)

Tek satırda okunan mantık: `🛒 Order` → `[Origin is one of 9 · Shopify] AND [Payment method is one of 6004 · PayPal, 6005 · PayPalExpress]` → `[2.00% of gross]` = `💳 Payment fees` · Validity (–) · Status pill · Last changed on · Actions (kalem, çöp). Koşul ve maliyet kutuları #F2F3F5 zemin, radius 6, padding 8; "AND" küçük gri pill; fazla kanallarda "+39" göz ikonlu sayaç. Sağ üstte brand primary buton "+ New Cost Rule" (40 px, radius 8). Kart alt başlığı: "Every condition column shows the two-level logic as a bracket line – without having to open a modal".

### 4.11 Demand Planning satırı

| Bölge | İçerik |
| --- | --- |
| Stock | Sayı + Available pill |
| Order forecast | Üç durum: (a) gri kutu "Not plannable – maintain master data"; (b) gri kutu Almanca açıklama "Lagerbestand (1330 Stk.) bleibt bis 30.09.2027 über dem Meldebestand…"; (c) sarı kenarlıklı sipariş kartı: "🛒 Order · 640 pcs until 30/01/2027 · 📊 Moonefe Weidezelt UG" + sağda "Soon" chip, ardından ok "DELIVERY TIME 30 days" → "Goods receipt 24/02/…" |
| Time range | Satır başına 240×120 px grafik: sarı alan (geçmiş satış), mavi çizgi (tahmin), pembe çubuklar (stok hareketi), yeşil dikey çizgi (bugün); x ekseni −13 ay … +7 ay, etiketler 45° |
| Çeyrek ızgarası | Sütunlar Q1 Jan Feb Mar … Q4; her satırda 4 seri: ● Prior Year Sales (gri) · ● Historical Data (kırmızı, değerler kırmızı badge) · ● Calculated Forecasts (sarı) · ● \[CALC\] Forecast calculated (mavi); değer yanında ↗/↘ küçük daire ikon; son sütun "← Sum" renkli toplamlar |
| Reorder Timeline | Her satır altında ince gri çizgi + nokta (planlanan sipariş tarihi) |
| Sütun ikonları | Product başlığında ≡ (sıralama) ve Order forecast başlığında ⊙ (ayarlar) 20 px gri kare buton |

### 4.12 Buton ve ikon butonları

| Tür | Spesifikasyon |
| --- | --- |
| Primary | Zemin #DE3D68, yazı beyaz 13 px 600, 40 px, radius 8, padding 0 20, sol ikon + |
| Icon button | 28–32 px, ikon 18 px brand veya body, hover zemin #F2F3F5; export, filtre profili, satır aksiyonları |
| Tab (kart içi) | Yazı 13 px, aktif: brand renk + 2 px alt çizgi brand; pasif: body ("All Products / Top 10 Products", "Category / Season", "Color / Size") |
| Chart toolbar | 6 ikon 14 px muted: zoom+, zoom−, seçim, pan, reset (ev), menü (indir) |

### 4.13 Boş durumlar

- Tablo: "Sorry, we couldn't find any results" ortalı 13 px body; başlık bandı ve Summary satırı yine çizilir; "0–0 of 0".
- Modül: "Not activated" 24 px 600, üstte 90 px çizgi illüstrasyon (klavye + anahtar, pembe vurgu); başka öğe yok.

## 5. Grafik tipleri ve ayarları

Sekiz grafik tipi kullanılıyor; toolbar ikonları ve legend biçimi ApexCharts'ın varsayılanlarıyla birebir, eksen tipografisi 11 px muted.

| # | Tip | Nerede | Seri / renk | Eksen ve ızgara | Etkileşim ve detay |
| --- | --- | --- | --- | --- | --- |
| 1 | Gruplu bar + çizgi (combo) | Dashboard "Order Revenue and Costs" | Revenue bar #5C7CF7 · Costs bar #E35A7E · Margin (DB1) çizgi #4B9831, nokta 6 px dolu | Y: €0–€6,000, 1.000'lik adım, noktalı yatay ızgara; X: gün, her 6 günde etiket (27/08, 01/09…); bar genişliği 6 px, grup aralığı 14 px | Sağ üst toolbar (zoom+/−, seçim, pan, ev, menü); legend sağ üstte nokta+etiket; hover tooltip |
| 2 | Donut (geniş halka) | Revenue by channel · Category · Color | 12+ dilim; palet sırası #448EF7 · #DE3D68 · #7AD34D · #EC574C · #F6C444 · #4065F6 · mor · turkuaz…; dilim içi beyaz yüzde etiketi (yalnız ≥3 %) | Halka kalınlığı dış yarıçapın %40'ı; dilimler arası 1 px beyaz boşluk | Sağda dikey legend: renkli nokta 8 px + "23.9% Amazon Germany" 12 px; legend kaydırılabilir; üstte sekmeler (All Products / Top 10) |
| 3 | Halka-donut (tek değer) | Stock status (5 adet) · Warehouse Report üst şeridi | Tek dilim renkli, kalan açık ton: Healthy yeşil #7AD34D / Understock kırmızı #EC574C / Excess mavi #448EF7 / No delivery time gri #667380 / Obsolete koyu gri #4D5560 | 64 px çap, 8 px kalınlık; ortada yüzde 11 px | Sağında 3 satır: ad 12 px 600 · € tutar · adet "Units" |
| 4 | Yarım-daire gauge | Stock Health "Fill rate total" / "Fill rate top seller" | Kırmızı→sarı→yeşil gradient (#CA4A3A → #DDDB47 → #59B133), 14 px kalınlık; siyah ibre ucu daire | 180°, değer ortada altta 16 px 600 ("79%") | Etkileşim yok |
| 5 | Alan (step-area) | Stock Overview | Total Net Stock yeşil çizgi + Sellable Stock kırmızı çizgi, altında kahverengi gradient dolgu | Y: 210k–360k, 30k adım; X: 5 günde bir tarih, 45° döndürülmüş | Legend altta ortalı |
| 6 | Mini sparkline (bar) | KPI kartları | 5–6 çubuk #E35A7E | Eksen yok | Statik |
| 7 | Satır içi zaman serisi | Demand Planning "Time range" | Sarı alan (geçmiş satış), mavi spline (tahmin), pembe bar (hareket), yeşil dikey "bugün" çizgisi, sağda tahmin alanı açık gri | 240×120 px; Y otomatik (176 / 1,100 / 10); X −13 ay…+7 ay | Satır hover ile tooltip; grafik satır yüksekliğini belirler |
| 8 | İkili eksen (hazırlanmış, veri yok) | Audience RFM | Sol Y Customer count 0–5, sağ Y Revenue €0–€5 / Trending Index | Noktalı ızgara | Boş durumda bile eksenler çizili |

Ortak kurallar: para birimi eksende € ile ve binlik ayraçla; ızgara her zaman noktalı ve açık gri; legend noktası daire; renk anlamı sabit (mavi = gelir/stok, pembe = maliyet, yeşil = marj/pozitif, kırmızı = negatif/eksik, sarı = tahmin/uyarı).

## 6. Sayfa sayfa envanter

URL şeması `/page/<slug>?from=…&till=…&columns=1-2-3…&searchType=…` — tüm filtre ve sütun seçimi URL'de taşınıyor, paylaşılabilir ve geri alınabilir.

### 6.1 Dashboard (`/page/dashboard`)

| Kart | Filtreler | İçerik |
| --- | --- | --- |
| Order Revenue and Costs | Channel · Customer class · Account · Country · Profit by (By order) · Time period | Combo grafik + 3 KPI: Revenue after cancellation and credit notes (€94,367.54, brüt parantezde) · Inbound Costs (+ "Share of revenue 28.9%") · Margin (DB1) (+ "DB1 share of revenue 71.1%") |
| Top Seller Overview | Channel · Customer class · Group by (Product) · Country · Time period | Sol: tablo Product / Stock / Qty, 5 satır, Summary (Current page 1,770 / Total 64,179 Σ); sağ: "Revenue by channel" donut, sekmeler All Products / Top 10; altında Excluding postage + Revenue after… / Margin kutuları |
| Revenue by category & season | sekme Category / Season | Donut + legend; altında Revenue Total ve Margin Total (+100 %) ve trend |
| Revenue by color & size | sekme Color / Size | Aynı yapı (%96.61 Color Not Assigned → veri kalitesi göstergesi olarak da işe yarıyor) |
| Revenue by Country | Account (All Shops) · Sources (All sources) · Time period | Tablo Country (bayrak + ad) / Tendency (yüzde çubuğu) / trend; Summary 22 % / 0.9 % Ø; 5 satır, 1–5 of 26 |
| Revenue share by status | Time period | Tablo Status ("7 \| Outgoing items booked") / Total share ↓ (yüzde çubuğu); 1–5 of 15 |
| Stock Overview | Time period | Alan grafiği + 2 KPI: Avg. Sellable Stock · Avg. Unavailable Stock ("vs. Ø") |
| Stock Health | — ("Last update: 26.09.2026") | 3 kompakt KPI (Total listing · Total Net Stock · Top 10 Articles Stock) + 2 gauge (Fill rate total 79 % · Fill rate top seller 32 %) |
| Stock status | — ("Last 24 months (01.09.2024 – 25.09.2026)") | 5 halka-donut: Healthy · Understock · Excess · No delivery time · Obsolete |
| ABC analysis by sales share | Time period (This year) | Tablo Share of sales / Number of SKU / Live Stock Value / Final Stock…; satırlar A (39 %) · B (40.7 %) · C (19.8 %), harf dairesi + yüzde çubuğu |

### 6.2 Orders (`/page/orders`)

| Kart | İçerik |
| --- | --- |
| Average Order Volume (AOV) | Tablo Source / (AOV) ↓ / Tendency; Summary €256.84 Ø / €67.61; kaynaklar: Manuelle Eingabe, Mandant (Shop), Metro.de, Amazon UK…; 1–5 of 25 |
| Returns Rate By Channel | Tablo Channel / Return rate ↓ (yüzde çubuğu) / Tendency; Summary 11.59 % / 3.19 % |
| Cost Driver (Ø per Order) | Tablo Cost Center / Total share ↓ (yüzde çubuğu + €) / Trend (ok + önceki tutar); Operating 31.86 % · Product 29.08 % · Marketplace Fees 15.91 % · Advertising 15.8 % · Storage 4.69 %; 1–5 of 11 |
| Order-Performance | Channel · Time period; 6 KPI: Order volumen (net) · Incoming orders · Shipped orders · (AOV) · DB3 · DB3 Rate, hepsi "vs. previous period" |
| Filtre kartı | Date Filter by (Incoming orders) · Time period · Selected columns (44 sütun, aşağıda) · Search (Order ID · External order ID · Enclosed SKU kapsamı) · Account · Channel · Customer class · Country · Status · Order Type chip grubu + "Use default order types" toggle · Save Filter Profile |
| Order Listing | CSV/XLS; Rows per page 10; 1–10 of 4432; sütunlar: Order ID ↓ (dış-link ikonu) · External order ID · Channel · Order Date · Order Type · Status… |

Sipariş sütun seti (44): Order ID · External order ID · Channel · Order Date · Order Type · Status · Payment · Invoice number · Invoice date · Forwarding WA Date · Dispatch date · WA Deviation (Days) · Shipping profile · Ship Country · Qty · Enclosed EAN · Enclosed SKU · Order volumen (net) · Order volumen (gross) · Tax value · Tax percent · Warehouse · Credit notes (net) · Cancellations · Incl. Shipping costs (net) · Freight costs (net) · Product costs (net) · Customs duties (net) · DB1 · DB1 Rate · Operating costs · Delivery costs (net) · Storage costs (net) · Payment Fees · DB2 · DB2 Rate · Advertising Costs · Marketplace Fees · Other costs · DB3 · DB3 Rate.

### 6.3 Products (`/page/products`)

Filtre: Time period · Selected columns (Product · Stock · Average price · Units sold · Net Revenue · Margin · Returns · Activity · Recommendations · Active markets · Sales rank · Product health · ABC · ABC-Ranking · Share of Turnover) · Search (Name · GTIN · SKU) · Channel · Customer class · Account · Stock Valuation · Save Filter Profile. Product Listing: CSV/XLS; Summary Stock 4,460/72,270 Σ · Average price €22.54/€20.60 Ø · Units sold 1,170/5,473 Σ · Net Revenue €18,860.22/€90,006.63 Σ; satır = ürün hücresi + 4 sayısal sütun; 1–10 of 760.

### 6.4 Profit Report (`/page/profit_report`)

Filtre: Group by (Product) · Profit by (By order) · Date Filter by (Order Date) · Time period · Time interval · Compare to (checkbox + tarih) · Selected columns (49) · Search (Name · GTIN · SKU) · Attributes · Category · Status · Customer class · Suppliers · Account · Channel · Ship Country · Stock (All) · Sales representative · Owner · Brand · Warehouse · Include bundles toggle · Save Filter Profile. Tablo "Profit": bilgi satırı (italik sütunlar hesaba girmez), CSV/XLS, 1–10 of 608; sütunlar Product · Current stock · Suppliers · Order Units…; satır tipleri: ürün hücresi, "Shipping Costs" (ürünsüz, "No data" pill), bundle (sol mavi çizgi). Tedarikçi hücresinde birden çok ad alt alta.

Kâr sütun seti (49): Current stock · Suppliers · Order Units · Orders Volume (Netto) · Orders Volume (Brutto) · Credit notes (net) · Order volume after credit note (Netto/Brutto) · Incl. discount (net) · Cancelled Units · Cancellations (net) · Units sold · Rev. after cancellations (net/gross) · Units returned · Units sold after returns · Incl. returns (net) · Return rate · Revenue after cancellations and returns · Incl. Shipping costs (net) · Freight costs (net) · Product costs (net) · Customs duties (net) · DB1 · DB1 Rate · DB1 per item · Operating costs (net) · Delivery costs (net) · Storage costs (net) · Payment fees (net) · DB2 · DB2 Rate · DB2 per item · Advertising costs (net) · Marketplaces fee (net) · DB3 · DB3 Rate · DB3 per item.

### 6.5 Online Marketing (`/page/online_marketing`)

Filtre: Group by (Ad-Channel) · Start/End campaign (checkbox + tarih) · Report date · Selected columns (Ad-Channel · Advertising channel · Campaign Name · Campaign ID · Ad group · AdGroup ID · Campaign Type · Daily budget · Start Date · End Date · Impressions · Clicks · CTR · CPC · Through CPC · CPM · eCPM · Conversion · CVR · Conv. Value · Costs · Costs/Conv. · ACoS · ROAS · Status) · 4 slider (Daily budget · Clicks · Impressions · Conversions) · Campaign · Campaign type · Ad group · Ad-Channel · Status of the campaign. Alt kartlar: Performance by Marketplace · Revenue by Marketplace · Returns by Marketplace · Profit by Marketplace (her biri Account · Country · Customer class · Sources · Time period; sütunlar marketplace / Tendency / Orders ↓ / Revenue / Ret…). Hesapta veri yok.

### 6.6 Activity Stream ve Notification Settings

Activity Stream filtre: Event type · Sections · Priority · Sources · Time period; tablo 1–5 of 155. Örnek olay cümleleri: "There are 163 products with a DB1 quota of at least 80%." · "According to demand planning, 680 products have a stock coverage of over 12 months." · "Stock of 293 products is low." · "146 products with stock ≤0 in the last 30 days." · "The return rate of 35 products is 20 higher than the average return rate of 3.77." Notification Settings: kural satırları (bkz. 4.9); gözlenen kurallar: #1 Profit Report profitMax 0 / 30\_DAYS Standard 07:45 · #3 Stock stockMax 10 / stockMin 1 / 30\_DAYS Standard 03:00 · #4 Returns thresholdMinPercent 20 / 30\_DAYS Critical 03:00 · #8 Stock stockMax 0 / 30\_DAYS Critical 03:00 · #11 Stock 365\_DAYS Important.

### 6.7 Audience (`/page/audience`)

İki grafik kartı (RFM Segment Analysis · Lifetime vs. Time-Based RFM Segmentation) + filtre: Group by (Customer) · Time period applies to (All orders) · Selected columns (Customer Name · Email · Country · Location · Customer Type · Gender · Customer class · Channel (initial/last contact) · Initial/Last purchase (date) · Recency (days) · Frequency (purchases) · Ø Purchase cycle · Churn score · Monetary (revenue in €) · RFM Code · Number of customers · Percentage (%) · RFM Segment (Lifetime) · RFM segment (time period) · Segment recommendation · CLV Segment (Lifetime/period) · Customer Lifetime Value (CLV €) · Average CLV (€) · DB1 · ARPU (€) · Average Order Volume (AOV) · Return rate · Shopping cart size (Ø Articles) · Discount usage (%) · Loyalty program status · Product preferences) · Search customer (tam eşleşme uyarısı) · Category · Account · RFM Segment (Lifetime) · Suppliers · Country · Customer Type · Customer class · CLV level · Brand. Veri yok.

### 6.8 Warehouse Report (`/page/warehouse_report`)

Filtre: Group by (Product) · Time period (This year) · Selected columns (48) · Search (Name · GTIN · SKU · Supplier Article No) · Category · Warehouse · Suppliers · Brand · ABC analysis · Stock Valuation · Article-Status (All articles) · Save Filter Profile. Üst şerit: 5 halka-donut (Last 24 months). Tablo: uyarı "\[Some warehouses are disabled ⚠\]", yalnız CSV, Summary satırı sütun tipine göre Σ/Ø.

Depo sütun seti (48): Product Name · SKU · GTIN · Supplier Article No · Internal SKU · Main Category · Primary Category · Usage · Stock Period · Live Stock Value · Final Stock Value · Turnover Rate · Minimum Stock · Reported Stock · Maximum stock · Last purchase price · Avg. Purchase Price · Actual stock · Final stock · Avg. Stock · Daily Consumption · Consumption per Week · ABC · ABC-Ranking · Supplier Number · Supplier · Avg. Delivery Time · Max. Delivery Time · Reorder Volume · Supplier Rating · Warehouse Name · Warehouse Number · Range 7/14/30/90/180/360 days · Share of Turnover · Cumulative share of turnover · Re-order time · Forecast · Healthy stock · Understock · Excess stock · Obsolete stock (son dördü "Last 24 months" alt etiketli).

### 6.9 Demand Planning (`/page/demand_planning`)

Filtre: Search (Name · GTIN · SKU) · Category · Suppliers · Order forecast · Inbound · Save Filter Profile. Tablo yalnız XLS; Summary: Stock 12,858 / 74,482 Σ; Order forecast "1 open / 0 overdue" (sayfa) ve "62 open / 83 overdue" (toplam, overdue kırmızı). Sütun blokları: Product (≡) · Stock ↓ · Order forecast (⊙) · Time range (−13 months ← Sept 2026 → +7 months) · Q1…Q4 ay ızgarası · ← Sum. 1–10 of 2390.

### 6.10 Purchase, Forecast Center, KPI Center

- Purchase: Search by Order ID · Suppliers · status (All) · Time period · filtre profili; tablo Order ID · Supplier · Status · Issued ↓ · Number of SKU · Net produc…; Summary €0.00; veri yok.
- Forecast Center: "Not activated" boş durumu.
- KPI Center: tek filtre "Cost type"; tablo Order type · Rule set · Costs · Cost type ↑ · Validity · Status · Last changed on · Actions; gözlenen kurallar: Shopify+PayPal 2.00 % of gross; Shopify €0.35/order + 2.99 % (Inactive); Shopify €0.30 + 2.10 % (Inactive); Amazon (4 + 39 kanal) €39.00/month + 15.00 %; OTTO €99.00/month + 15.00 %; eBay DE + mandant 65380 €39.95/month + €0.35/order + 11.00 %; eBay DE diğer 12.00 %; Kaufland DE €59.95/month + €0.35/order + 13.00 %. Maliyet türleri: Payment fees · Marketplace fees.

## 7. Ürün detay veri modeli

Ürün, her tabloda aynı 14 kimlik/nitelik alanı + sayfaya göre değişen 60'tan fazla hesaplanmış KPI ile gösteriliyor; kimlik alanları ürün hücresinde, KPI'lar komşu sütunlarda.

### 7.1 Kimlik ve nitelik alanları (ürün hücresi)

| Alan | Tip | Örnek (HafenX, yalnız biçim için) | Kaynak | Gösterim |
| --- | --- | --- | --- | --- |
| name | string | "Pasabahce Elysia Teeset – Teegläser Mit Untertassen, 170ml" | Ürün ana verisi | 600, tek satır, … |
| image | url | 48×48 thumbnail | Ana veri / kanal | Thumbnail |
| ean / gtin | string(13) | 8693357603165 | Ana veri | "Ean:" etiketi |
| asin | string(10), null | B0BSRZ44RB | Amazon kanal eşlemesi | Yoksa satır gizlenir (Wilmax örneği) |
| sku | string | NS16278-950097 | Ana veri (iç SKU) | "Sku:" |
| internalSku | int | 16278 | ERP | Warehouse Report sütunu |
| parentId | int | 16277 | Varyant ağacı | "Parent ID:" |
| variationId | int | 16278 | Varyant ağacı | "Variation ID:" |
| supplierArticleNo | string, null | – | Tedarikçi eşlemesi | "Supplier Article No:" (Demand Planning ve Warehouse) |
| packQuantity (Anzahl) | string | "SET ( 1 Stü…" / "SET ( 6 Stü…" | Ana veri | "Anzahl:" |
| pieces (Teilig) | string | "12-tlg." / "24-tlg." | Ana veri | "Teilig:" |
| volume (Volumen) | string | "250ml" / "550ml" | Ana veri | "Volumen:" (yalnız varsa) |
| variantCount | int | 10 | Varyant ağacı | "Variants:" |
| isBundle | bool | true | Ana veri | "Bundle" badge + mavi kenar çizgisi; stokta "(Bundle)" + göz ikonu (bileşen stoklarını gösterir) |
| planningTier / model | int / enum | Tier 1 · ets / Tier 2 · simple\_es / Tier 3 · average | Tahmin motoru | Alt şerit (ets = exponential smoothing, simple\_es = basit üstel, average = ortalama) |
| supplierNames\[\] | string\[\] | TANAY GLAS GmbH · Imex ulusoy – SHOV GmbH | Tedarikçi eşlemesi | Profit Report sütunu, alt alta |

### 7.2 Ürün bazlı KPI'lar (sayfaya göre)

| Grup | Alan | Birim | Toplam türü | Göründüğü sayfa |
| --- | --- | --- | --- | --- |
| Stok | stock (+status Available / Out of stock / No data) | adet | Σ | Products, Profit, Warehouse, Demand |
| Stok | Live Stock Value · Final Stock Value | € | Σ | Warehouse, ABC |
| Stok | Minimum / Maximum / Reported / Actual / Final / Avg. Stock | adet | Σ (Avg: Ø) | Warehouse |
| Stok | Usage · Stock Period · Daily Consumption · Consumption per Week · Turnover Rate | adet / gün / adet / adet / oran | Σ / Ø / Σ / Σ / Ø | Warehouse |
| Stok | Range 7 / 14 / 30 / 90 / 180 / 360 days · Re-order time · Reorder Volume · Forecast | gün / gün / adet / adet | Ø | Warehouse |
| Stok sağlığı | Healthy · Understock · Excess · Obsolete (Last 24 months) | adet | Σ | Warehouse (üst şeritte € ve adet toplamı) |
| Satış | Units sold · Order Units · Qty · Cancelled Units · Units returned · Units sold after returns | adet | Σ | Products, Profit, Dashboard |
| Satış | Average price · Net Revenue · Orders Volume (Netto/Brutto) · Rev. after cancellations · Revenue after cancellations and returns | € | Ø / Σ | Products, Profit |
| Satış | Sales rank · Share of Turnover · Cumulative share of turnover · ABC · ABC-Ranking | sıra / % / % / harf / sıra | — | Products, Warehouse |
| Maliyet | Product costs (net) · Freight · Customs duties · Incl. Shipping costs · Operating · Delivery · Storage · Payment fees · Advertising · Marketplaces fee · Other | € | Σ | Profit, Orders |
| Marj | DB1 · DB1 Rate · DB1 per item · DB2 · DB2 Rate · DB2 per item · DB3 · DB3 Rate · DB3 per item · Margin | € / % / € | Σ / Ø | Profit, Products |
| İade | Returns · Return rate · Incl. returns (net) | adet / % / € | Σ / Ø | Products, Profit |
| Satın alma | Last purchase price · Avg. Purchase Price · Supplier · Supplier Number · Avg./Max. Delivery Time · Supplier Rating | € / € / – / – / gün / puan | Ø | Warehouse |
| Kategori | Main Category · Primary Category · Brand · Warehouse Name/Number · Attributes | string | — | Warehouse, Profit filtreleri |
| Sinyal | Activity · Recommendations · Active markets · Product health | sayı / sayı / liste / skor | — | Products |
| Tahmin | Prior Year Sales · Historical Data · Calculated Forecasts · \[CALC\] Forecast calculated (ay bazında) · Sum | adet | Σ | Demand Planning |
| Sipariş önerisi | orderQty · orderUntil · supplier · deliveryDays · goodsReceiptDate · status (Soon) | adet / tarih / – / gün / tarih | — | Demand Planning |

### 7.3 Marj katmanı tanımı (sütun sırasından türetilmiş)

- **DB1** = Revenue after cancellations and returns − Incl. shipping costs − Freight − Product costs − Customs duties
- **DB2** = DB1 − Operating − Delivery − Storage − Payment fees
- **DB3** = DB2 − Advertising − Marketplace fees − Other costs
- Oranlar (Rate) = katman ÷ Revenue after cancellations and returns; "per item" = katman ÷ Units sold after returns.
- Dashboard'daki "Inbound Costs" = DB1'den önce düşülen kalemler toplamı; "Margin (DB1)" = DB1.

### 7.4 Stok sağlığı sınıflandırması (24 aylık pencere)

| Sınıf | Gözlenen tanım ipucu | Renk |
| --- | --- | --- |
| Healthy stock | Reichweite normal aralıkta, meldebestand üstünde | #7AD34D |
| Understock | Stok < minimum stok | #EC574C |
| Excess stock | Reichweite > planlama ufku (ör. 12 ay) | #448EF7 |
| No delivery time | Tedarik süresi tanımsız → planlanamaz | #667380 |
| Obsolete stock | 24 ayda satışsız / bedarf sıfır | #4D5560 |

HafenX hesabında Obsolete %77.90 (€730,743.38 / 255,240 adet) — sınıflandırmanın ana-veri eksikliğine ne kadar duyarlı olduğunu gösteriyor; "Not plannable – maintain master data" mesajı da aynı kaynağa işaret ediyor.

## 8. Bezirga eşlemesi

Algoritmo'nun marka rengi kobaltla, uyarı rengi safranla değiştirilir; diğer tüm token'lar ve bileşenler olduğu gibi taşınır.

### 8.1 Token çevirisi

| Algoritmo token | Algoritmo | Bezirga | Not |
| --- | --- | --- | --- |
| color.brand | #DE3D68 | #12356B (Kobalt) | Buton, aktif menü, export, koşul chip'leri, olay ikonları |
| color.brand.soft | #FCF0F3 | #E8EEF8 | Aktif menü zemini (kobaltın %10'u) |
| color.brand.chart (Costs) | #E35A7E | #E3A13A (Safran) | Maliyet serisi safran: marka ikilisi grafikte de görünür |
| color.chart.blue (Revenue) | #5C7CF7 | #3B6FD9 | Kobalta yakın, ayırt edilebilir |
| color.chart.green (Margin) | #4B9831 | #2F9E5B | NET-1 çizgisi |
| color.warning | #F6C444 | #E3A13A | "Önemli" öncelik, tahmin serisi — safranla çakışır; Costs serisi için safranın koyu tonu #C9862A kullanılabilir |
| color.success / danger | #7AD34D / #EC574C | #2F9E5B / #D64545 | Trend, pill |
| color.bg.page | #F3F5F9 | #F4F6FA | Kobalt light tema ("Kobalt") |
| Gece (dark) tema | yok | bg #0F1A2E, card #16233D, text #E6ECF5 | Selliora'da mevcut Gece teması ile aynı token adları |
| Tipografi | Rubik | Rubik veya Inter | Rubik Türkçe karakterleri tam destekler |

### 8.2 Terim sözlüğü (UI metinleri)

| Algoritmo | Bezirga (TR) | Açıklama |
| --- | --- | --- |
| DB1 / DB2 / DB3 | NET-1 / NET-2 / NET-3 | NET-3 yalnız reklam ve kupon (PAZARLAMA\_INDIRIMI) ayrı katman istenirse |
| Revenue after cancellation and credit notes | İptal ve iade sonrası ciro |  |
| Inbound Costs | Ürün + kargo maliyeti | Kampanya alış fiyatı + kargo |
| Marketplace fees | Pazaryeri komisyonu | Kanal tarifesi (TY/HB/N11) |
| Payment fees | Ödeme kesintisi | TY/HB hakediş kesintileri |
| Ean / Asin / Sku | Barkod / TY-SKU · HB-SKU · N11 kodu / Stok kodu | ChannelSku tablosu |
| Parent ID / Variation ID | Ürün / Varyant |  |
| Supplier / Supplier Article No | Kampanya kaynağı / Kaynak ürün kodu | Alım yapılan satıcı |
| Anzahl / Teilig / Volumen | Paket adedi / Parça / Hacim |  |
| Bundle | Set |  |
| Activity Stream | Uyarı Merkezi | Mevcut Uyarı Merkezi Faz 2 |
| Notification Settings | Uyarı kuralları |  |
| KPI Center | Maliyet kuralları |  |
| Warehouse Report | Stok raporu |  |
| Demand Planning | Talep planı | Kampanya modelinde ikincil |
| Healthy / Understock / Excess / No delivery time / Obsolete | Sağlıklı / Tükenmek üzere / Fazla / Teslimatsız / Ölü stok |  |
| Available / Out of stock / No data | Stokta / Tükendi / Veri yok |  |
| Standard / Important / Critical | Standart / Önemli / Kritik |  |
| Save Filter Profile | Filtre profili kaydet |  |
| Summary · Current page · Total | Özet · Bu sayfa · Toplam |  |
| vs. previous period | önceki döneme göre |  |

### 8.3 Sayfa karşılıkları

| Algoritmo sayfası | Bezirga karşılığı | Uyarlama notu |
| --- | --- | --- |
| Dashboard | Panel | Combo grafik: Ciro / Maliyet / NET-1; Top Seller tablosu; kanal donut'u TY/HB/N11/Amazon TR; "Rafta var, vitrinde yok" kutusu Stock Health yerine |
| Orders | Satışlar | AOV ve iade oranı kanal bazlı; Cost Driver: Ürün / Komisyon / Kargo / Ödeme / Pazarlama indirimi |
| Products | Ürünler | Ürün hücresi + Barkod / kanal kodları; "Product health" yerine Buy Box durumu |
| Profit Report | Kâr raporu | NET-1/NET-2 sütun seti; "Compare to" ve "Include bundles" aynen |
| KPI Center | Maliyet kuralları | Tarife satırı: `Satış → [Kanal = Trendyol] AND [Kategori = X] → %15 + ₺13.19/paket = Komisyon`; mevcut 640 tarife kalemi bu görünüme tam oturur |
| Activity Stream | Uyarı Merkezi | Olay cümleleri Türkçe; Rule ID mevcut K-numaralarıyla |
| Warehouse Report | Stok raporu | Partie/lot sütunu eklenir; FIFO/ortalama maliyet seçimi Stock Valuation filtresi olarak |
| Demand Planning | Buy Box izleme | Satır içi mini grafik: fiyatım / rakip fiyatı / Buy Box durumu; sipariş kartı yerine "Fiyat dene" kartı |
| Online Marketing · Audience | — | Kapsam dışı (B2C müşteri verisi pazaryerinde yok) |
| Forecast Center · EDI | — | Kapsam dışı |

## 9. Uygulama planı

Önerilen sıra: önce token'lar ve iskelet, sonra en çok tekrar eden üç bileşen (tablo, ürün hücresi, filtre kartı), en son grafikler; her adım mevcut Next.js + Tailwind stack'inde kalır.

| Adım | Çıktı | Kapsam | Bağımlılık |
| --- | --- | --- | --- |
| 1 | `tokens.css` / `tailwind.config` | Bölüm 2 ve 8.1'deki tüm renk, radius, gölge, boşluk değerleri; Kobalt ve Gece teması `data-theme` ile | — |
| 2 | `AppShell` | Sidebar (280 px, kiracı kartı, gruplu menü, akordeon, aktif durum) + topbar + içerik grid'i + 2 FAB | 1 |
| 3 | `DataTable` | Başlık bandı, Summary satırı (Σ/Ø), sticky ilk sütun, yatay kaydırma, sıralama, pagination, CSV/XLS, boş durum | 1 |
| 4 | `ProductCell` | 4.4'teki üç kolon + Set badge + alt şerit; `StockCell` pill'leri | 3 |
| 5 | `FilterCard` | Floating-label select, date range, Spalten-chip alanı, arama kapsamı chip'leri, slider, toggle, filtre profili ikonları; URL senkronu (`?from&till&columns`) | 1 |
| 6 | `KpiCard` · `TrendPill` · `PercentBar` · `StatusPill` | 4.2, 4.5, 4.6, 4.7 | 1 |
| 7 | `Charts` | ApexCharts veya Recharts ile 5.1–5.7; renk eşlemesi sabit | 1 |
| 8 | `RuleRow` | Maliyet kuralı cümle görünümü (4.10) ve uyarı kuralı satırı (4.9) | 3, 6 |
| 9 | `ActivityRow` · `ForecastRow` | 4.8 ve 4.11 | 3, 7 |
| 10 | Stil rehberi sayfası `/styleguide` | Tüm bileşenler sahte (kendi) veriyle; her bileşenin durumları yan yana | 1–9 |

Kabul ölçütleri:

- [ ] Token dosyası dışında hiçbir bileşende sabit hex kodu yok.
- [ ] `DataTable` Summary satırı her sayısal sütunda Σ veya Ø ikonu gösteriyor ve "Bu sayfa / Toplam" ayrımını yapıyor.
- [ ] `ProductCell` 360 px genişlikte 42 karakterlik adı taşmadan gösteriyor; ASIN/Volumen yoksa satır gizleniyor.
- [ ] Filtre durumu URL'ye yazılıyor; sayfa yenilendiğinde aynı görünüm geliyor.
- [ ] Gece temasında kontrast WCAG AA (metin ≥ 4.5:1).
- [ ] Stil rehberinde HafenX'e ait hiçbir isim, kod veya rakam yok.

Açık sorular (Halil'in kararı):

- Maliyet serisi rengi grafikte safran mı (marka ikilisi) yoksa ayrı bir kırmızı mı (uyarı rengiyle çakışmasın diye)?
- NET-3 katmanı açılacak mı, yoksa pazarlama indirimi NET-2 içinde mi kalacak?
- Demand Planning satır düzeni Buy Box izlemeye mi dönüştürülecek, yoksa şimdilik kapsam dışı mı?

Ürün hücresi ve ürün veri modelinin ayrı, derin incelemesi: Ürün detayı
