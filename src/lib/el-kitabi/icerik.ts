import type { ElKitabiVerisi } from "./veri";

/**
 * ============================================================================
 *  EL KİTABI — METİN
 * ----------------------------------------------------------------------------
 *  NEDEN SÖZLÜKTE DEĞİL:
 *  Anayasa "kullanıcıya görünen her metin sözlükten gelir" der ve bu ARAYÜZ
 *  metinleri için doğrudur. El kitabı arayüz değil BELGE'dir: ~150 paragrafı
 *  sözlüğe koymak, arayüz sözlüğünü üç katına çıkarır ve i18n denetimini
 *  belge düzeltmeleriyle meşgul eder. İkinci dil geldiğinde çevrilecek şey de
 *  tek tek dizgiler değil, baştan yazılacak bir İngilizce el kitabıdır.
 *  Çözüm: dil başına AYRI DOSYA — `icerik.ts` bugün Türkçedir, İngilizce
 *  gelince `icerik.en.ts` yanına konur ve sayfa dile göre seçer.
 *  _Karar 10.08.2026._
 *
 *  CANLI BAĞLANTI:
 *  {{...}} yer tutucusu yok; canlı listeler doğrudan `veri` üzerinden
 *  yazılıyor. Ayarlardan bir raf eklendiğinde el kitabı da onu gösterir.
 * ============================================================================
 */

const kacir = (m: string) =>
  m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Bölüm başlıkları — hem içindekiler hem gövde buradan üretilir. */
export const BOLUMLER = [
  { kimlik: "dusunce", ad: "Sistem nasıl düşünür" },
  { kimlik: "giris", ad: "Giriş ve güvenlik" },
  { kimlik: "kurulum", ad: "İlk kurulum" },
  { kimlik: "telefon", ad: "Telefona kurma" },
  { kimlik: "panel", ad: "Panel — güne nereden bakılır" },
  { kimlik: "urun", ad: "Ürünler ve stok" },
  { kimlik: "stok", ad: "Stok — elimde ne var" },
  { kimlik: "okuma", ad: "Barkod okut — sistem ne biliyor" },
  { kimlik: "yerlestirme", ad: "Yerleştir — ürünü rafa koy" },
  { kimlik: "paketleme", ad: "Yönlendirmeli paketleme" },
  { kimlik: "kanalSku", ad: "Kanal SKU — ne işe yarar" },
  { kimlik: "komisyon", ad: "Komisyon oranı ve tarife" },
  { kimlik: "alim", ad: "Alım ve mal kabul" },
  { kimlik: "satis", ad: "Satış" },
  { kimlik: "iade", ad: "İade" },
  { kimlik: "deneme", ad: "Fiyat denemesi — nerede satmalı" },
  { kimlik: "kart", ad: "Kârlılık kartı" },
  { kimlik: "gider", ad: "Giderler" },
  { kimlik: "kartBorcu", ad: "Kartlar ve kart borcu" },
  { kimlik: "hakedis", ad: "Hakediş — param ne zaman yatar" },
  { kimlik: "tazminat", ad: "Tazminat" },
  { kimlik: "nakit", ad: "Nakit takvimi" },
  { kimlik: "envanter", ad: "Envanter değeri" },
  { kimlik: "rapor", ad: "Dönem raporu" },
  { kimlik: "talep", ad: "Destek talepleri" },
  { kimlik: "depo", ad: "Ayarlar — Depo kurulumu" },
  { kimlik: "raf", ad: "Ayarlar — Raf Konumları" },
  { kimlik: "kategori", ad: "Ayarlar — KDV Kategorileri" },
  { kimlik: "duzeltme", ad: "Ayarlar — Düzeltme nedenleri" },
  { kimlik: "kanalHesabi", ad: "Ayarlar — Kanal Hesapları" },
  { kimlik: "tedarikci", ad: "Ayarlar — Tedarikçiler" },
  { kimlik: "kullanici", ad: "Ayarlar — Kullanıcılar" },
  { kimlik: "rol", ad: "Ayarlar — Roller" },
  { kimlik: "menu", ad: "Ayarlar — Menü düzeni" },
  { kimlik: "toplu", ad: "Toplu veri aktarımı" },
  { kimlik: "gecmisEkstre", ad: "Ayarlar — Geçmiş ekstreler" },
  { kimlik: "tarife", ad: "Ayarlar — Komisyon tarifesi" },
  { kimlik: "yedek", ad: "Yedek" },
  { kimlik: "sorun", ad: "Bir şey ters giderse" },
  { kimlik: "sozluk", ad: "Sözlük" },
  { kimlik: "yolda", ad: "Henüz yok, yolda" },
] as const;

/**
 * ── MENÜ ↔ BÖLÜM EŞLEMESİ ───────────────────────────────────────────────
 *
 * Kullanıcı kararı 22.08.2026: _"el kitabında menü barda mevcut bulunan TÜM
 * sayfalar açıklanmalı."_ Bu eşleme onu **denetlenebilir** yapar: bekçi
 * `app-sidebar.tsx`teki menü anahtarlarını okur ve her birinin burada bir
 * bölüme bağlandığını sınar.
 *
 * ⚠ ELLE TUTULAN LİSTE DEĞİL, KAPI. Menüye yeni bir sayfa eklenip buraya
 * yazılmazsa bekçi kırmızı yanar — yani kılavuz, ekranın gerisinde
 * SESSİZCE kalamaz. Bugüne kadar tam bu oldu: son iki haftada eklenen on
 * ekranın hiçbiri kitapta yoktu.
 *
 * `null` = bilerek bölümü yok; gerekçesi yanında yazar.
 */
export const MENU_BOLUM: Record<string, string | null> = {
  panel: "panel",
  urunler: "urun",
  urunKarti: "kart",
  simulasyon: "deneme",
  alimlar: "alim",
  satislar: "satis",
  iadeler: "iade",
  stok: "stok",
  okut: "okuma",
  yerlestir: "yerlestirme",
  paketle: "paketleme",
  envanterDegeri: "envanter",
  kanalSkulari: "kanalSku",
  giderler: "gider",
  rapor: "rapor",
  /** İki menü öğesi, tek bölüm: kart tanımı ile kart borcu aynı konudur. */
  kartlar: "kartBorcu",
  kartBorcu: "kartBorcu",
  tazminat: "tazminat",
  hakedis: "hakedis",
  nakitTakvimi: "nakit",
  depoKurulumu: "depo",
  rafKonumlari: "raf",
  kategoriler: "kategori",
  duzeltmeNedenleri: "duzeltme",
  kanalHesaplari: "kanalHesabi",
  tedarikciler: "tedarikci",
  veriAktarimi: "toplu",
  /** Yedek alma ve geri yükleme tek bölümde anlatılıyor. */
  geriYukleme: "yedek",
  veriDisari: "yedek",
  kullanicilar: "kullanici",
  roller: "rol",
  menuDuzeni: "menu",
  talepler: "talep",
  gecmisEkstre: "gecmisEkstre",
  tarife: "tarife",
  /** Kitabın KENDİSİ — kendi kendini anlatan bölüm açmak tekrar olurdu. */
  elKitabi: null,
};

const iki = (n: number) => String(n).padStart(2, "0");

function icindekiler(): string {
  const satirlar = BOLUMLER.map(
    (b, i) =>
      `<li><a href="#${b.kimlik}"><b>${iki(i + 1)}</b><span>${b.ad}</span></a></li>`,
  ).join("");
  return `<nav class="ek-toc" aria-label="İçindekiler"><h2>İçindekiler</h2><ol>${satirlar}</ol></nav>`;
}

function baslik(kimlik: string): string {
  const sira = BOLUMLER.findIndex((b) => b.kimlik === kimlik);
  const b = BOLUMLER[sira];
  return `<h2 class="bolum"><b>${iki(sira + 1)}</b>${b.ad}</h2>`;
}

/** Canlı listeden tablo. Liste boşsa "henüz tanımlı değil" der. */
function canliTablo(
  basliklar: string[],
  satirlar: string[][],
  bosMesaj: string,
): string {
  if (satirlar.length === 0) {
    return `<div class="ek-not dikkat"><div class="etiket">Sizde henüz yok</div><p>${bosMesaj}</p></div>`;
  }
  const bas = basliklar.map((h) => `<th>${kacir(h)}</th>`).join("");
  const govde = satirlar
    .map((s) => `<tr>${s.map((h) => `<td>${h}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="ek-tablo"><table><thead><tr>${bas}</tr></thead><tbody>${govde}</tbody></table></div>`;
}

/**
 * ── EKRAN ŞEMASI ────────────────────────────────────────────────────────
 * Ekranın FOTOĞRAFI değil, ÇİZİMİ. Projede tarayıcı otomasyonu yok
 * (karar 08.08.2026); ama asıl gerekçe teknik değil: fotoğraf ekran her
 * değiştiğinde bayatlar ve bayat fotoğraf kılavuzu sessizce yanlış yapar.
 * Çizim kodun içinde yaşıyor — bir blok taşınırsa şema da düzeltilir.
 *
 * Amaç ekranı taklit etmek değil, YERİ tarif etmek: "sayfayı açtığında
 * şurada şu kutu var". Numaralar `adimlar` listesiyle eşleşir.
 */
function ekranSemasi(
  yol: string,
  bloklar: {
    /** Adım numarası — `adimlar` listesindeki sırayla aynı olmalı. */
    no?: number;
    ad: string;
    aciklama?: string;
    /** Tam satır kaplasın mı. */
    genis?: boolean;
    /** Ekranın HÜKÜM verdiği yer — göz önce buraya gitsin. */
    vurgulu?: boolean;
  }[],
): string {
  const govde = bloklar
    .map((b) => {
      const sinif = ["ekran-blok", b.genis ? "genis" : "", b.vurgulu ? "vurgulu" : ""]
        .filter(Boolean)
        .join(" ");
      const no = b.no === undefined ? "" : `<span class="ekran-no">${b.no}</span>`;
      const ac = b.aciklama ? `<p>${b.aciklama}</p>` : "";
      return `<div class="${sinif}"><h4>${no}${kacir(b.ad)}</h4>${ac}</div>`;
    })
    .join("");
  return `<figure class="ek-ekran"><figcaption>${kacir(yol)}</figcaption>
<div class="ekran-cerceve"><div class="ekran-cubuk">${kacir(yol)}</div>
<div class="ekran-govde">${govde}</div></div></figure>`;
}

/** "Ne zaman buraya gelirim" — bölümün ilk sorusu. */
function neZaman(metin: string): string {
  return `<div class="ek-nezaman"><div class="etiket">Ne zaman buraya gelirim</div><p>${metin}</p></div>`;
}

/**
 * "Sık yapılan hata" — belge ile OPERASYON arasındaki köprü.
 *
 * ⚠ HER MADDE GERÇEK BİR VAKADAN GELİR, uydurulmuş bir "dikkat edin"
 * listesi değildir. Uydurma uyarılar okunmaz hâle gelir ve gerçek olanı da
 * beraberinde götürür.
 */
function sikHata(maddeler: { hata: string; cozum: string }[]): string {
  const govde = maddeler
    .map((m) => `<dt>${m.hata}</dt><dd>${m.cozum}</dd>`)
    .join("");
  return `<div class="ek-hata"><div>Sık yapılan hata</div><dl>${govde}</dl></div>`;
}

/** Adım listesi — başlık + açıklama çiftlerinden. */
function adimlar(maddeler: { ad: string; ne: string }[]): string {
  const govde = maddeler
    .map((m) => `<li><div><h3>${m.ad}</h3><p>${m.ne}</p></div></li>`)
    .join("");
  return `<ol class="adimlar">${govde}</ol>`;
}

export function elKitabiGovdesi(
  veri: ElKitabiVerisi,
  uretimTarihi: string,
): string {
  // --- kanal kesintileri: kanal başına satır ---
  const kesintiAdi: Record<string, string> = {
    KOMISYON_KDV: "Komisyon KDV'si",
    ODEME_GIDERI: "Ödeme gideri",
    HIZMET_BEDELI: "Hizmet bedeli",
    SABIT_GIDER: "Sabit gider",
  };

  const kesintiSatirlari = veri.kanalKesintileri.map((k) => [
    kacir(k.kanal),
    kesintiAdi[k.kod] ?? kacir(k.kod),
    k.oran !== null ? `%${k.oran}` : `${k.tutar} ${k.paraBirimi ?? ""}`,
    /**
     * ⚠ TÜKETİCİ EŞLEME. Önce ikili koşuldu ("PER_SALE ? ... : ...") ve
     * `PER_PACKAGE` eklenince onu SESSİZCE "kalem başına" diye yazardı —
     * yanlış cümle, doğru görünümle. `switch` yeni kapsam eklendiğinde
     * derlemeyi durdurur.
     */
    ((): string => {
      switch (k.kapsam) {
        case "PER_SALE":
          return "sipariş başına";
        case "PER_ITEM":
          return "kalem başına";
        case "PER_PACKAGE":
          return "paket başına";
        default: {
          const asla: never = k.kapsam;
          return String(asla);
        }
      }
    })(),
  ]);

  const cezaSatirlari = veri.cezaTarifeleri.flatMap((c) =>
    c.kademeler.map((k, i) => [
      i === 0 ? kacir(c.kanal) : "",
      `${k.ustSinir} ₺'ye kadar`,
      `<span class="sayi">${k.tutar} ₺</span>`,
    ]),
  );

  return `
<div class="ek">
<header class="ek-kapak"><div class="ek-kapak-ic">
  <div class="ek-rozet">
    <span>Kullanıcı El Kitabı</span>
    <span>${kacir(uretimTarihi)}</span>
    <span>Sürüm bilgisi kapakta durur; kurulum sayıları DURMAZ</span>
  </div>
  <h1>Selliora</h1>
  <p>Çok kanallı e-ticaret operasyonunuzun tek defteri: ne aldınız, ne sattınız,
  ne kadar kaldı. Bu kitap sıfırdan başlayan birinin sistemi yardımsız
  kullanabilmesi için yazıldı.</p>
</div></header>

<div class="ek-duzen">
${icindekiler()}
<main class="ek-icerik">

<section aria-label="Günlük iş">
  <div class="ek-kart">
    <div class="ust">Günlük iş — üç hareket</div>
    <div class="izgara">
      <div class="ek-kart"><div class="ust">Mal geldi</div>
        <div class="buyuk">Alımlar → Mal kabul</div>
        <p>Sağlam ve hasarlı adedi ayrı sayın, rafı seçin. Stok o an artar.</p></div>
      <div class="ek-kart"><div class="ust">Satış oldu</div>
        <div class="buyuk">Satışlar → Yeni satış</div>
        <p>Kanal hesabı, ürün, adet, fiyat. Stok en eski partiden düşer, kâr anında hesaplanır.</p></div>
      <div class="ek-kart"><div class="ust">Müşteri iade etti</div>
        <div class="buyuk">Satış → İade Al</div>
        <p>Türü seçin, sağlam geleni rafa alın. Komisyon ve stopaj geri gelir.</p></div>
    </div>
  </div>
</section>

<section id="dusunce">
${baslik("dusunce")}
<p>Selliora'yı kullanmak, birkaç temel kararı anlamakla kolaylaşıyor. Bu bölüm
ekran anlatmıyor — sistemin kafasını anlatıyor.</p>

<h3>Dört ayrı kod vardır ve karıştırılmaz</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Kod</th><th>Kimin</th><th>Ne işe yarar</th></tr></thead>
<tbody>
<tr><td class="kod">SKU</td><td>Sizin</td><td>Sistem içi ana kod. Stok bunun üstünden döner.</td></tr>
<tr><td class="kod">Firma SKU</td><td>Sizin</td><td>Ürünün üstüne yapıştırdığınız fiziksel etiket.</td></tr>
<tr><td class="kod">Barkod (EAN)</td><td>Üreticinin</td><td>Kutunun üstünde basılı gelen kod.</td></tr>
<tr><td class="kod">Kanal SKU</td><td>Pazaryerinin</td><td>Trendyol veya Hepsiburada'daki stok kodu. <strong>Komisyon oranını da bu taşır</strong> — <a href="#kanalSku">ayrıntı</a>.</td></tr>
</tbody></table></div>

<h3>Stok bir defterdir, silinmez</h3>
<p>Stok sayısı bir kutuda tutulmuyor. Her giriş ve çıkış <em>hareket</em> olarak
yazılıyor; stok, hareketlerin toplamı. Yazılan hareket <strong>hiçbir zaman
silinmez veya değiştirilmez</strong> — yanlış varsa ters işaretli bir düzeltme
hareketi eklenir.</p>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Muhasebe defterleri de böyle çalışır. "Dün stok kaçtı?" sorusu ancak geçmiş
bozulmadığı zaman cevaplanabilir. Silinebilen bir kayıt, bir süre sonra kimsenin
güvenmediği bir kayda dönüşür.</p></div>

<h3>En eski parti önce satılır (FIFO)</h3>
<p>Aynı ürünü farklı zamanlarda farklı fiyata almış olabilirsiniz. Her alım ayrı
bir <em>parti</em>dir ve kendi maliyetini taşır. Satış olduğunda sistem
<strong>en eski partiden</strong> düşer; kâr o partinin gerçek maliyetiyle
hesaplanır — ortalama alınmaz.</p>

<h3>İki kâr rakamı vardır</h3>
<div class="formul">NET-1 = satış − maliyet − komisyon − stopaj − kargo − sabit kesintiler
<b>NET-2 = NET-1 − ödenecek KDV</b></div>
<p><strong>NET-1</strong> stopaj düşülmüş kârdır. <strong>NET-2</strong> ise
devlete ödeyeceğiniz KDV de düşüldükten sonra cebinizde gerçekten kalan rakamdır.
Listelerde NET-2 gösterilir, çünkü sorulan soru odur.</p>

<h3>Genel gider ürün kârına karışmaz</h3>
<div class="formul"><b>GERÇEK NET</b> = Σ NET-2 (iadeler dahil) − dönem giderleri</div>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Bir ürünü alıp almamaya karar verirken kirayı hesaba katarsanız, kararınızı
zaten ödediğiniz bir masraf bozar. Ürün kararı brüt kârla verilir; kira ay
sonunda topluca düşülür.</p></div>

<h3>Para birimleri birbirine çevrilmez</h3>
<p>Bir alımı avroyla, satışı lirayla yaptıysanız sistem kur uydurmaz — o satışın
kârını <strong>hesaplamaz</strong> ve nedenini yazar. Uydurma bir rakam, boş bir
hücreden daha tehlikelidir.</p>

<h3>Saat İstanbul saatidir</h3>
<p>Nerede olursanız olun, "bugün" Türkiye'nin günüdür. Ay raporu, kart kesim günü
ve tarih varsayılanları buna göre çalışır.</p>
</section>

<section id="giris">
${baslik("giris")}
<p>Sisteme e-posta ve parolanızla girersiniz. Giriş yapmadan hiçbir ekran açılmaz.</p>
<ul>
<li>Girdikten sonra <strong>sol menünün en altında</strong> e-postanız görünür. Orası aynı zamanda çıkış düğmesidir; onay ister.</li>
<li>Oturum <strong>30 gün</strong> açık kalır.</li>
<li>Bir adrese girmeye çalışıp giriş ekranına düşerseniz, giriş yapınca <strong>gitmek istediğiniz yere</strong> yönlendirilirsiniz.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Bu sistemde satış fiyatlarınız, maliyetleriniz, kâr marjlarınız ve
tedarikçileriniz duruyor. Parolanızı kimseyle paylaşmayın — şu an herkes aynı
yetkiyle giriyor, "sadece stok görsün" gibi bir ayrım yok.</p></div>
<p>Parola değişince <strong>açık olan tüm oturumlar kapanır</strong> —
telefonunuzda açık kalmış bir oturum varsa o da düşer.</p>
</section>

<section id="kurulum">
${baslik("kurulum")}
<p>Boş bir sistemde bu sırayı izleyin. Sıra önemli: her adım bir sonrakinin
malzemesini hazırlıyor.</p>
<ol class="adimlar">
<li><div><h3>Raf konumları</h3><p><strong>Ayarlar → Raf Konumları.</strong> Depodaki her rafa bir kod verin. Mal kabulde ve toplamada bu kodu göreceksiniz.</p></div></li>
<li><div><h3>KDV kategorileri</h3><p><strong>Ayarlar → KDV Kategorileri.</strong> Ürünün KDV oranı buradan okunur — ürün ürün oran girmezsiniz.</p></div></li>
<li><div><h3>Kanal hesapları</h3><p><strong>Ayarlar → Kanal Hesapları.</strong> Hangi pazaryerinde hangi mağazanız var. Aynı pazaryerinde birden fazla mağazanız olabilir.</p></div></li>
<li><div><h3>Kredi kartları</h3><p><strong>Kartlar.</strong> Kart numarasının yalnızca <strong>son 4 hanesi</strong> saklanır — tam numara ve CVV hiçbir zaman istenmez.</p></div></li>
<li><div><h3>Ürünler ve açılış stoğu</h3><p>Az ürününüz varsa tek tek girin. Listeniz varsa <strong>Ayarlar → Veri Aktarımı</strong> ile topluca yükleyin.</p></div></li>
<li><div><h3>Kanal SKU ve komisyon oranları</h3><p><strong>Kanal SKU.</strong> Sattığınız her pazaryeri için ürünün oradaki kodunu ve <strong>komisyon oranını</strong> girin. <strong>Bu adımı atlamayın</strong> — atlanırsa satış kaydedilir ama kârı hesaplanamaz. <a href="#kanalSku">Ne işe yaradığı</a>.</p></div></li>
</ol>

<div class="ek-not"><div class="etiket">Kendi tanımlarını nerede görürsün</div>
<p>Bu kitap <strong>senin verilerini yazmaz</strong> — sistemin nasıl
çalıştığını anlatır. Kendi raflarını, kategorilerini ve mağaza hesaplarını
her zaman kendi ekranlarında, <strong>güncel hâliyle</strong> görürsün:
Ayarlar → <strong>Raf Konumları</strong> · <strong>KDV Kategorileri</strong> ·
<strong>Kanal Hesapları</strong>. Kitaba kopyalansaydı bir ay sonra
bayatlardı; ekran bayatlamaz.</p></div>
</section>

<section id="telefon">
${baslik("telefon")}
<p>Selliora'yı telefonunuza <strong>uygulama gibi</strong> kurabilirsiniz. Kurulunca
ana ekranda kendi simgesiyle durur ve açıldığında tarayıcının adres çubuğu
görünmez — ekranın tamamı işinize kalır. Ayrı bir program indirmezsiniz;
kurulan şey sitenin kendisidir, yani her zaman güncel sürümdür.</p>

${neZaman(
  "Depoda telefonla çalışırken. Barkod okutmak, mal kabul yapmak ve mağazada fiyat denemesi yapmak için birincil cihaz telefondur.",
)}

<h3>Android (Chrome)</h3>
${adimlar([
  {
    ad: "Siteyi açın ve giriş yapın",
    ne: "Normal adresi tarayıcıda açmanız yeterli.",
  },
  {
    ad: "Sağ üstteki üç noktaya dokunun",
    ne: "Menüde <strong>Uygulamayı yükle</strong> ya da <strong>Ana ekrana ekle</strong> yazar. Chrome bunu kendiliğinden de teklif edebilir.",
  },
  {
    ad: "Onaylayın",
    ne: "Simge ana ekranda belirir. Bundan sonra oradan açılır.",
  },
])}

<h3>iPhone (Safari)</h3>
${adimlar([
  {
    ad: "Siteyi <strong>Safari</strong> ile açın",
    ne: "iPhone'da bu adım Safari'ye özeldir; Chrome'dan kurulmaz.",
  },
  {
    ad: "Alttaki paylaş düğmesine dokunun",
    ne: "Yukarı ok işareti olan kare.",
  },
  {
    ad: "<strong>Ana Ekrana Ekle</strong>",
    ne: "Listeyi biraz aşağı kaydırmanız gerekebilir. Ekleyince simge ana ekranda çıkar.",
  },
])}

<div class="ek-not"><div class="etiket">Şifre her seferinde sorulmaz</div>
<p>Kurulan uygulama oturumunuzu hatırlar; telefonu kendiniz kilitliyorsanız
ek bir şey yapmanız gerekmez. Telefonu kaybederseniz, bilgisayardan
<strong>Ayarlar → Kullanıcılar</strong> ekranından parolanızı değiştirin —
o telefondaki oturum anında düşer.</p></div>

<h3>İnternet giderse ne olur</h3>
<p>Selliora <strong>çevrimdışı çalışmaz ve bu bilerek böyledir.</strong> Bağlantı
yoksa "Bağlantı yok" sayfası çıkar; rakam gösterilmez.</p>
<div class="ek-not dikkat"><div class="etiket">Neden rakam göstermiyoruz</div>
<p>Telefonda saklanmış bir kâr rakamının <strong>güncel mi eski mi</strong> olduğu
anlaşılamaz. Dünkü NET-2'yi bugünkü gibi göstermektense hiç göstermemek
doğrudur — yanlış bir rakama bakarak alım kararı vermek, hiç bakmamaktan
pahalıdır. Bağlantı gelince kaldığınız yerden devam edersiniz.</p></div>

${sikHata([
  {
    hata: "Menüde \"Uygulamayı yükle\" seçeneği çıkmıyor",
    cozum:
      "Sayfayı bir kez yenileyin. Bazı tarayıcılar teklifi siteyi birkaç kez ziyaret ettikten sonra gösterir. iPhone'da bu seçenek YOKTUR; oradaki yol <strong>Paylaş → Ana Ekrana Ekle</strong>'dir.",
  },
  {
    hata: "iPhone'da eklendi ama adres çubuğuyla açılıyor",
    cozum:
      "Kısayol büyük ihtimalle Chrome'dan eklendi. Silin ve Safari ile tekrar ekleyin.",
  },
  {
    hata: "Uygulama eski bir ekran gösteriyor",
    cozum:
      "Kapatıp yeniden açın. Veri her zaman canlı çekilir; ekranın kendisi (düğmeler, yerleşim) yeni sürümde tazelenir.",
  },
])}
</section>

<section id="panel">
${baslik("panel")}
<p><strong>Sol menüde en üstteki <em>Panel</em>.</strong> Giriş yapınca açılan
sayfa burasıdır ve tek bir soruya cevap verir: <em>bugün ne oldu, neye
bakmam gerek.</em></p>
${neZaman(
  "Her sabah ilk açtığın yer. Gün içinde bir şey ters gittiğini hissedersen de önce buraya bak — sistemin bildiği bütün uyarılar burada toplanır.",
)}
${ekranSemasi("Panel", [
  { no: 1, ad: "Dönem seçici", aciklama: "Bugün · Dün · Bu ay · Son 30 gün. Ekrandaki BÜTÜN rakamlar bu seçime göre değişir.", genis: true },
  { no: 2, ad: "Ciro ve NET", aciklama: "Seçili dönemin satış tutarı ve elde kalan. İkisi yan yana durur çünkü biri olmadan öteki yanıltır.", vurgulu: true },
  { no: 3, ad: "Görev kutuları", aciklama: "Mal kabul bekleyen alım, kârı hesaplanamayan satış gibi ELİNDE İŞ olan kalemler." },
  { no: 4, ad: "Uyarılar", aciklama: "Sistemin şüphelendiği kayıtlar. Rakam + 'aç' bağlantısı; döküm kendi sayfasında." },
  { no: 5, ad: "Günlük operasyon", aciklama: "Alım (yeşil) · satış (mavi) · kargo (turuncu) — gün gün grafik." },
  { no: 6, ad: "Nakit özeti", aciklama: "Yaklaşan kart borcu ve beklenen hakediş.", },
])}
<div class="ek-not"><div class="etiket">Neden döküm yok</div>
<p>Panel bir <strong>hüküm</strong> yeridir, döküm yeri değil. Satır sayısı veriyle
birlikte büyüyen hiçbir liste buraya konmaz: bugün 3 satırla masum görünen bir
liste, hacim artınca ekranı yutar. Panelde <strong>rakam + "aç" bağlantısı</strong>
kalır; dökümü kendi sayfasında görürsün.</p></div>
${sikHata([
  {
    hata: "Panelde rakamı görüp dönem seçiciyi kontrol etmemek",
    cozum: "Rakamın hangi döneme ait olduğu her zaman seçicide yazar. “Ciro düşmüş” demeden önce seçicinin “Bugün”de mi “Bu ay”da mı olduğuna bak.",
  },
  {
    hata: "Uyarıyı görüp “sonra bakarım” demek",
    cozum: "Uyarılar kendiliğinden kaybolmaz; veri düzelene kadar her gün taşınırlar. Okunmayan uyarı, bir süre sonra hiç okunmayan bir rozete dönüşür.",
  },
])}
</section>

<section id="urun">
${baslik("urun")}
${neZaman(
  "Yeni bir ürün almadan ÖNCE — sistemde kaydı yoksa alım girişi yapamazsın. Bir de elindeki malın kaç adet olduğunu merak ettiğinde.",
)}
<h3>Ürün ve varyant</h3>
<p>Her ürünün en az bir <em>varyantı</em> vardır. Bedeni veya rengi olmayan bir
ürün için de tek bir varsayılan varyant açılır. Stok, SKU ve barkod her zaman
varyant seviyesindedir — ürün seviyesinde stok yoktur.</p>
<p>Tişörtün M ve L bedeni: <strong>bir ürün, iki varyant.</strong></p>

<h3>Desi</h3>
<p>Kargo ücreti desiye göre hesaplandığı için ürün kartına desi girilir. Satış
formunda kargo tutarı bu desiden okunur; fiili tartım farklıysa satışta elle
değiştirebilirsiniz.</p>

<h3>Stok ekranı</h3>
<ul>
<li>Her varyantın güncel adedi ve rafı listede görünür.</li>
<li><strong>Hareketler</strong> düğmesi o varyantın tüm geçmişini açar.</li>
<li>Her hareket kaynağına bağlıdır — satırdaki bağlantı sizi ilgili alıma veya satışa götürür.</li>
</ul>
<div class="ek-not"><div class="etiket">Kısayol</div>
<p>Kod girilen her alan barkod okuyucuyla çalışır. USB okuyucu kodu yazıp Enter'a
basar; telefonda kamerayla da okutabilirsiniz.</p></div>
${sikHata([
  {
    hata: "Aynı ürünü ikinci kez açmak",
    cozum: "Almadan önce barkodla ARA. Aynı ürün iki kayıtla durursa stok ikiye bölünür ve kârlılık kartı iki ayrı yerde yarım rakam gösterir.",
  },
  {
    hata: "Barkod ile SKU’yu karıştırmak",
    cozum: "Barkod (EAN) ÜRETİCİNİN kodudur, kutunun üstünde yazar. SKU sistemin kendi kodu. Firma SKU ise senin fiziksel etiketin. Üçü ayrı alan, üçü de aranabilir.",
  },
])}
</section>

<section id="stok">
${baslik("stok")}
<p><strong>Sol menü → Stok.</strong> Hangi üründen kaç adet olduğu ve
<strong>nerede durduğu</strong>. Ürün listesi "ne satıyorum" sorusuna,
bu ekran "elimde ne var" sorusuna cevap verir.</p>
${neZaman(
  "Sipariş toplarken (mal hangi rafta), yeniden sipariş verirken (ne bitti) ve sayım yaparken (sistem ne diyor, rafta ne var).",
)}
<h3>Stok bir DEFTERDİR, bir sayı değil</h3>
<p>Sistem stoğu "şu an 5 adet" diye tutmaz; her hareketi tek tek yazar ve
toplamını alır. Mal kabul <strong>+3</strong>, satış <strong>&minus;1</strong>,
iade <strong>+1</strong>&hellip; Bu yüzden bir rakam yanlış göründüğünde
<strong>neden</strong> yanlış olduğu her zaman bulunabilir: hareketleri
açarsın, hangi kaydın onu değiştirdiğini görürsün.</p>
<div class="ek-not"><div class="etiket">Kayıt silinmez</div>
<p>Yanlış girilen bir hareket <strong>silinmez</strong>; ters işaretli bir
<strong>düzeltme</strong> ile dengelenir. Böylece bir farkın neden oluştuğu
defterde kalır. Silme olsaydı cevap da silinirdi.</p></div>
${sikHata([
  {
    hata: "Stok rakamını elle düzeltmeye çalışmak",
    cozum: "Elle yazılan rakam nedenini taşımaz. Sayımda fark çıktıysa DÜZELTME hareketi gir ve nedenini seç \u2014 üç ay sonra o farkın neden oluştuğu okunabilir olur.",
  },
  {
    hata: "Rafı boş bırakmak",
    cozum: "Raf yazılmazsa toplama sırasında malı aramak zorunda kalırsın. Depo büyüdükçe bu dakikalar toplanır.",
  },
])}
</section>

<section id="okuma">
${baslik("okuma")}
<div class="ek-not"><div class="etiket">Bu ekran mı, öteki mi</div>
<p><strong>Bu ekran:</strong> elinde bir kod var ve <em>ne olduğunu</em>
bilmiyorsun. Ürün mü, sipariş mi, kayıtlı mı &mdash; sistem ne biliyorsa onu
söyler.</p>
<p><strong>Öteki ekran</strong> (<a href="#paketleme">Yönlendirmeli
paketleme</a>): kutuyu hazırlıyorsun ve <em>hangi raftan ne alacağını</em>
soruyorsun.</p>
<p>Kararsızsan buradan başla: okuttuğun kod bir sipariş çıkarsa ekranda
<strong>&quot;Yönlendirmeli paketle&quot;</strong> düğmesi belirir ve seni
oraya sipariş yüklenmiş hâlde götürür.</p></div>
<p><strong>Sol menü &rarr; Barkod okut.</strong> Elindeki ürünü okutursun;
sistem o barkod hakkında <strong>ne bildiğini</strong> söyler. Hepsi bu.
Hiçbir şey engellenmez, hiçbir kayıt değişmez, onay istenmez.</p>
${neZaman(
  "Depoda paket hazırlarken. Kutuyu eline aldığında okut, ekranda ne yazdığına bak, paketlemeye devam et.",
)}
<h3>Bu ekran seni DURDURMAZ</h3>
<p>Bir uyarı ekranı değildir. &quot;Yanlış ürün&quot; demez, &quot;emin
misin&quot; diye sormaz, bir düğmeyi kilitlemez. Sebebi basit: sistemdeki
satış defteri bugün <strong>eksik</strong>. Uyarı koysaydık çoğu zaman
<em>hakl&#305; olarak</em> çalardı, sen her seferinde geçerdin ve iki
haftada uyarıyı okumadan tıklamayı öğrenirdin. O noktada uyarı işe
yaramaz hâle gelirdi &mdash; hem de tam gerektiği gün.</p>
<div class="ek-not"><div class="etiket">Asıl işi ölçmek</div>
<p>Her okuma kayda geçer ve dört gruba ayrılır: ürün <strong>açık siparişte
var</strong>, ürün <strong>açık siparişte yok</strong>, kod tanınmadı ama
sen ürünü <strong>gösterdin</strong>, ya da <strong>hüküm verilemedi</strong>.
Bir hafta sonra bu dağılım, defterin ne kadarının eksik olduğunu
<em>pazaryerinden de sistemden de bağımsız</em> olarak söyler.</p></div>
<h3>Kod bulunamazsa</h3>
<p>Ekran sadece &quot;bu kod dört alanın hiçbirinde bulunamadı&quot; der.
Altında isteğe bağlı bir arama kutusu çıkar: elindeki ürünün hangisi
olduğunu biliyorsan gösterebilirsin. <strong>İstersen atla</strong> &mdash;
hiçbir şey beklemiyor, paketlemeye devam edebilirsin.</p>
<p>Gösterdiğinde sistem &quot;bu kod bu ürüne ait&quot; diye kaydeder.
<strong>Neden</strong> tutmadığını sormaz: ürünün barkodu gerçekten farklı
olabilir, kayıtta yanlış girilmiş olabilir, ya da o parti farklı bir
barkodla gelmiş olabilir. Bunlar farklı işlere yol açar; birkaç vaka
birikince hangisi olduğu kendiliğinden görünür hâle gelir.</p>
${sikHata([
  {
    hata: "\u0022Aç\u0131k siparişte yok\u0022 yaz\u0131nca ürünü paketlememek",
    cozum: "Bu bir hata mesaj\u0131 de\u011fildir. Sat\u0131ş sisteme girilmemiş olabilir; ürünün bugün paketlenmiyor olmas\u0131 da mümkündür. Ekran hangisi oldu\u011funu bilemez ve iddia etmez \u2014 sen işine devam et.",
  },
  {
    hata: "Bulunamayan her kod için ürün göstermek zorunda hissetmek",
    cozum: "Zorunlu de\u011fil. Acelen varsa atla; kay\u0131t yine tutulur ve raporda \u0022hüküm verilemedi\u0022 taraf\u0131nda say\u0131l\u0131r.",
  },
])}
</section>

<section id="yerlestirme">
${baslik("yerlestirme")}
<p><strong>Sol menü &rarr; Yerleştir.</strong> Bir ürünün <strong>hangi rafta
durduğunu</strong> sisteme yazdığın ekran budur. Akış tek yönlü: önce
<strong>raf etiketini</strong> okutursun, sonra o rafa koyduğun ürünleri
<strong>peş peşe</strong> okutursun. Raf seçili kalır; her ürün için yeniden
raf okutmana gerek yok.</p>
${neZaman(
  "Kargo açıp malı rafa koyarken. Ürünü rafa yerleştirdiğin an okut; sonraya bırakılan yerleştirme yapılmaz.",
)}
<h3>Rafı nasıl değiştirirsin</h3>
<p>Başka bir rafın önüne geçtiğinde <strong>o rafın etiketini okut</strong>
&mdash; ekran &quot;Raf değişti&quot; yazar ve bundan sonraki ürünler yeni
rafa yazılır. Ürün kutusuna raf etiketi okutsan da olur; sistem kodun raf
olduğunu anlar.</p>
<h3>Bu ekran STOĞA DOKUNMAZ</h3>
<p>Yazılan tek şey ürünün <strong>yeri</strong>dir. Adet değişmez, stok
hareketi oluşmaz, kâr hesabı etkilenmez. Yanlış rafa okutursan düzeltmesi
kolay: doğru rafı okut, ürünü tekrar okut.</p>
<div class="ek-not"><div class="etiket">Nereden geldiğini de yazar</div>
<p>Yerleştirdiğin her ürünün altında <strong>önceki yeri</strong> görünür
(&quot;Önceki yeri: RAF-SLN1-2&quot;). Yanlış ürünü okuttuysan bunu oradan
anlarsın. Ürün zaten o raftaysa &quot;Zaten bu raftaydı&quot; yazar
&mdash; bu bir hata değil, <em>doğrulama</em>dır.</p></div>
${sikHata([
  {
    hata: "Raf okutmadan ürün okutmak",
    cozum:
      "Ekran &quot;önce raf etiketini okutun&quot; der ve hiçbir şey yazmaz. Yukarıdaki kutuya rafı okut, sonra devam et.",
  },
  {
    hata: "Rafı değiştirmeyi unutup ürünleri eski rafa yazmak",
    cozum:
      "Üstteki kutuda hangi rafın seçili olduğu ve o rafta kaç ürün olduğu her zaman yazar. Yeni rafın önüne geçtiğinde etiketini okut.",
  },
])}
</section>

<section id="paketleme">
${baslik("paketleme")}
<div class="ek-not"><div class="etiket">Bu ekran mı, öteki mi</div>
<p><strong>Bu ekran:</strong> kargo etiketi elinde, kutuyu hazırlıyorsun.
Sistem sana <em>hangi raftan ne alacağını</em> söyler ve doğru ürünü
aldığını <em>okutarak doğrular</em>.</p>
<p><strong>Öteki ekran</strong> (<a href="#okuma">Barkod okut</a>): elinde
bir kod var ama ne olduğunu bilmiyorsun &mdash; ürün mü, sipariş mi.</p>
<p>⚠ Buraya <strong>ürün barkodu</strong> okutursan bir şey bulamaz: bu
ekranın ilk adımı <strong>kargo ya da sipariş numarasıdır</strong>. Ürün
barkodu ikinci adımda okutulur.</p></div>
<p><strong>Sol menü &rarr; Paketle.</strong> Bu ekran sana paketi
<strong>tarif eder</strong>: hangi üründen kaç adet, hangi raftan. Ezberlemen
gereken hiçbir şey yok &mdash; iki okutma yeter.</p>
${neZaman(
  "Kargo etiketi elinde, kutuyu hazırlamaya başladığında. Yeni bir eleman da bu ekranla tarifsiz çalışabilir.",
)}
<h3>İki okutma</h3>
<p><strong>1.</strong> Pazaryeri etiketindeki <strong>kargo kodunu</strong> okut.
Sistem siparişi bulur ve sana <strong>ürün adını, adedini ve RAFI</strong> söyler.</p>
<p><strong>2.</strong> O raftan aldığın ürünün üstündeki <strong>barkodu</strong>
okut. Doğruysa ekran yeşile döner ve <strong>bip</strong> sesi gelir; yanlışsa
daha kalın bir ses duyarsın. Kulakla ayırt edebilirsin &mdash; ekrana bakman
gerekmez.</p>
<p>Sonra <strong>Paketlendi</strong> tuşuna bas. Bitti.</p>
<div class="ek-not"><div class="etiket">Ürünü okutmadan paketleyemezsin</div>
<p>Bu bilerek böyle. Kargo kodunu okutup ürünü okutmadan &quot;paketlendi&quot;
demek, bu ekranın <em>tek işini</em> atlamak olurdu: doğru ürünü aldığını
kimse doğrulamamış olur. Tuş kilitliyse altında <strong>niye kilitli olduğu
yazar</strong>.</p></div>
<h3>Okuttuğun ürün siparişte yoksa</h3>
<p>Ekran gri bir kutuda &quot;bu siparişte yok&quot; der ve <strong>durur
orada</strong>. Kırmızı yanmaz, seni engellemez, başka bir ürün okutabilirsin.
Sebebi <a href="#okuma">Barkod okut</a> bölümündekiyle aynı: satış defteri
bugün eksik, kırmızı bir uyarı çoğu zaman haksız yere çalar ve iki haftada
okumadan geçmeyi öğrenirsin.</p>
<h3>Raf yazmıyorsa</h3>
<p>&quot;Raf girilmemiş&quot; yazar ve ürünü kendin bulman gerekir. Akış
durmaz. Rafı <a href="#raf">Ayarlar &rarr; Raf Konumları</a>ndan tanımlayıp
ürün kartından seçebilirsin &mdash; bir kez yaparsın, hep işine yarar.</p>
<h3>Kod bulunamazsa</h3>
<p>&quot;Paketlenmeyi bekleyen sipariş bulunamadı&quot; der. En sık sebebi:
o sipariş <strong>zaten kargoya verilmiş</strong> ya da <strong>iptal
edilmiş</strong>. Bu ekran yalnız <em>paketlenmeyi bekleyen</em> siparişleri
gösterir.</p>
${sikHata([
  {
    hata: "Ürünü okutmadan Paketlendi aramak",
    cozum: "Tuş bilerek kilitli. Önce raftan aldığın ürünü okut; doğrulama olmadan işaret atılmaz.",
  },
  {
    hata: "Sipariş numarası yerine sadece kargo kodunu denemek",
    cozum: "İkisi de olur. Elindeki kâğıtta hangisi yazıyorsa onu okut.",
  },
  {
    hata: "Gri &quot;siparişte yok&quot; kutusunu hata sanmak",
    cozum: "Hata değil, bilgi. Yanlış kutuyu almış olabilirsin ya da o ürün sisteme hiç girilmemiş olabilir. Akış devam eder.",
  },
])}
</section>

<section id="kanalSku">
${baslik("kanalSku")}
<p>Kanal SKU, sistemdeki ürününüz ile <strong>o ürünün bir pazaryerindeki
karşılığı</strong> arasındaki köprüdür. Kurulumun en çok atlanan adımıdır ve
atlanınca ilk satışta karşınıza çıkar.</p>

<h3>İki işi vardır</h3>
<ol class="adimlar">
<li><div><h3>Eşleme — "bu ürün orada hangi kodla duruyor?"</h3>
<p>Sizin SKU'nuz sizindir; Trendyol'un stok kodu Trendyol'undur. İkisi
birbirini bilmez. Kanal SKU bu iki kodu birbirine bağlar. Bir sipariş
geldiğinde "bu hangi ürünüm?" sorusunun cevabı buradan çıkar.</p></div></li>
<li><div><h3>Komisyon oranını taşımak — asıl sebep budur</h3>
<p>Komisyon oranı ürüne göre <em>ve</em> pazaryerine göre değişir. Aynı
oyuncak Trendyol'da başka, Hepsiburada'da başka oran öder. Bu yüzden oran
ürün kartında değil, <strong>ürün × pazaryeri</strong> kesişiminde —
yani Kanal SKU'da — tutulur.</p></div></li>
</ol>

<div class="ek-not dikkat"><div class="etiket">Atlanırsa ne olur</div>
<p>Satış kaydedilir, stok düşer, sipariş kaybolmaz — <strong>ama kâr
hesaplanamaz.</strong> Satış listesinde net kâr yerine <strong>kural
eksik</strong> yazar. Sistem komisyon oranını uydurmaz; uydurulmuş bir kâr
rakamı, boş bir hücreden çok daha tehlikelidir.</p>
<p>Oranı sonradan girip satış detayındaki <strong>Yeniden hesapla</strong>
düğmesine basmanız yeterli — satış silinip yeniden girilmez.</p></div>

<h3>Neden mağaza başına ayrı?</h3>
<p>Kanal SKU bir <em>pazaryerine</em> değil, bir <strong>kanal hesabına</strong>
bağlıdır. Aynı pazaryerinde iki mağazanız varsa (hesap başına alım limiti
nedeniyle bu normaldir) her mağazanın kendi stok kodu ve kendi oranı olabilir.
Bu yüzden eşleme her mağaza için ayrı girilir.</p>

<h3>Oran haftalık değişir — ve geçmiş bozulmaz</h3>
<p>Pazaryerleri komisyon oranlarını düzenli olarak günceller
(<strong>Trendyol salı</strong>, <strong>Hepsiburada çarşamba</strong>).
Oran değişince Kanal SKU'daki değeri güncellersiniz.</p>
<div class="ek-not"><div class="etiket">Yüzlerce oranı tek tek girmeyin</div>
<p>Kanal SKU ekranındaki <strong>Komisyon oranı içe aktarma</strong> düğmesi,
pazaryerinin satıcı panelinden indirdiğiniz <strong>ürün listesi</strong>
dosyasını okur ve oranları toplu yazar. Dosya nereden inecek: Trendyol'da
<em>Ürünler → Ürünlerim → Excel'e aktar</em>, Hepsiburada'da
<em>Listelerim → İndir</em>.</p>
<p>Yükleme iki adımlıdır: önce <strong>ne olacağını gösterir</strong> (kaç boş
oran dolacak, kaç oran değişecek, kaç ürün bizde bulunamadı), siz onaylayınca
yazar. Dosyada olup sistemde olmayan ürünler atlanır ve sayısı söylenir;
sistemde olup o mağazada kodu tanımlı olmayan ürünler için <strong>eşleme
kendiliğinden açılır</strong>. Aynı dosyayı ikinci kez yüklemek zararsızdır:
değişen bir şey yoksa "hiçbir şey değişmedi" der.</p></div>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Satış anında geçerli oran <strong>satış kaydının içine kopyalanır</strong>.
Yani bugün oranı değiştirmeniz, geçen ayki satışların kârını değiştirmez.
Kâr rakamı bir kere hesaplanır ve o günün gerçeğiyle donar; yoksa kapanmış bir
ayın kârı her hafta oynardı.</p></div>

<h3>Ne zaman girilir</h3>
<ul>
<li><strong>Ürünü ilk satışa çıkarmadan önce.</strong> Alım yapmak için gerekmez, satış için gerekir.</li>
<li>Sadece <strong>gerçekten sattığınız</strong> pazaryerleri için girin. Satmadığınız kanal için eşleme açmak boş iş.</li>
<li><strong>Kanal SKU</strong> ekranından tek tek, <strong>Ayarlar → Veri Aktarımı</strong> ile topluca (bu sayfa tek başına da yüklenebilir), ya da <strong>Kanal SKU → Komisyon oranı içe aktarma</strong> ile pazaryerinin kendi ürün listesinden.</li>
</ul>

<div class="ek-not"><div class="etiket">Eksik eşlemeni nasıl görürsün</div>
<p>Hangi ürünün hangi mağazada tanımlı olduğunu ve <strong>hangilerinde
komisyon oranı boş kaldığını</strong> <strong>Kanal SKU</strong> ekranındaki
süzgeçlerden görürsün. Oranı boş bir eşleme satış kaydını engellemez ama o
satışın <strong>kârı hesaplanamaz</strong> — panelde uyarı olarak çıkar.</p></div>
</section>

<section id="komisyon">
${baslik("komisyon")}
<p>Komisyon, kârın en büyük kesintisidir ve <strong>her üründe, her
pazaryerinde farklıdır.</strong> Ölçüldü: aynı ürünün kanaldan kanala oran
farkı ortanca 2 puan, en yükseği <strong>14,4 puan</strong> — 1.000 ₺'lik bir
satışta 144 ₺ demek.</p>

<h3>İki ayrı şey, karıştırma</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Ne</th><th>Nereden yüklenir</th><th>Ne işe yarar</th></tr></thead>
<tbody>
<tr><td><strong>Tek oran</strong></td><td>Kanal SKU → <em>Komisyon listesi aktar</em></td><td>Satış formunda önerilen oran</td></tr>
<tr><td><strong>Dilim tarifesi</strong></td><td>Komut satırından tarife yükleme</td><td>Fiyata göre değişen oran — fiyat denemesi bunu kullanır</td></tr>
</tbody></table></div>
<p>İkisi <strong>aynı dosyayı</strong> okuyabilir ama farklı şeyler kaydeder.
Biri "bugün oranın ne", öteki "hangi fiyatta hangi oran".</p>

${neZaman(
  "Pazaryeri komisyon oranlarını güncellediğinde. Trendyol SALI ve CUMA yayımlar, Hepsiburada ÇARŞAMBA. Yüklemezsen sistem eski oranla hesap yapar ve NET yanlış çıkar.",
)}
${ekranSemasi("Kanal SKU → Komisyon listesi aktar", [
  { no: 1, ad: "Mağaza seç", aciklama: "Hangi pazaryerinin hangi hesabı. ALIŞ hesabı seçilirse reddedilir — komisyon yalnız SATTIĞIN mağazada anlamlı." },
  { no: 2, ad: "Dosya seç", aciklama: "Satıcı panelinden indirdiğin ürün listesi. Hangi pazaryerine ait olduğu dosyanın kendisinden anlaşılır." },
  { no: 3, ad: "Denetle", aciklama: "HİÇBİR ŞEY YAZILMAZ. Kaç oran değişecek, kaç yeni eşleme açılacak, kaç satır bizde yok — hepsi listelenir." },
  { no: 4, ad: "Onayla ve yaz", aciklama: "Tek seferde yapılır: bir şey ters giderse hiçbiri yazılmaz.", vurgulu: true },
])}
<h3>Dosya nereden indirilir</h3>
<ul>
<li><strong>Trendyol:</strong> satıcı panelinde <em>Ürünler → Ürünlerim → Excel'e aktar</em></li>
<li><strong>Hepsiburada:</strong> satıcı panelinde <em>Listelerim → İndir</em></li>
</ul>

<h3>Dilim tarifesi — haftalık rutin</h3>
<p>Trendyol <strong>fiyat indirimi karşılığında komisyon indirir</strong>: aynı
ürün 2.000 ₺'ye %10, 1.750 ₺'ye satılırsa %7 komisyon alabilir. Bu yüzden tek
bir oran yetmez; dört dilimli bir tarife gelir.</p>
<div class="ek-not dikkat"><div class="etiket">Kaçırılırsa geri alınamaz</div>
<p>Tam dilimli ileri tarife <strong>arşivden inmiyor.</strong> O hafta
indirilmezse bir daha elde edilemez ve fiyat denemesi o dönem için hesap
yapamaz. Her <strong>Salı ve Cuma</strong> indirmek gerekiyor.</p></div>
${sikHata([
  {
    hata: "Yanlış mağazanın dosyasını yüklemek",
    cozum: "Sistem dosyanın hangi pazaryerine ait olduğunu içeriğinden anlar ve seçtiğin mağazayla uyuşmazsa reddeder. Hata mesajı hangi dosyanın hangi mağazaya ait olduğunu yazar.",
  },
  {
    hata: "Denetleme adımını atlayıp doğrudan yazmak",
    cozum: "Denetleme bedava ve geri dönüşsüz bir şey yapmıyor. “Bizde yok” diye atlanan satır sayısı beklediğinden büyükse, kataloğunda eksik ürün var demektir — önce onu düzelt.",
  },
  {
    hata: "Salı/Cuma tarifesini indirmeyi unutmak",
    cozum: "O haftanın tarifesi kaybolur. Fiyat denemesinde Trendyol kutusu “tarife penceresi bitmiş” der ve oran eski tarifeden okunur.",
  },
])}
</section>

<section id="alim">
${baslik("alim")}
${neZaman(
  "Tedarikçiye sipariş verdiğinde (alım kaydı) ve mal kapıya geldiğinde (mal kabul). İkisi AYRI adımdır: sipariş verdiğin an stok artmaz, mal geldiğinde artar.",
)}
<p>Alım iki aşamalıdır: önce <strong>siparişi</strong> kaydedersiniz, mal gelince
<strong>mal kabul</strong> yaparsınız. Stok, sipariş anında değil mal kabulde artar.</p>
<h3>1. Alım girme</h3>
<ul>
<li><strong>Alımlar → Yeni alım.</strong> Tedarikçi, tarih, kart ve taksit sayısı.</li>
<li>Her kalem için ürün, adet ve <strong>birim maliyet</strong> (KDV dahil).</li>
<li>Para birimi kalem bazında seçilir.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Birim maliyeti boş bırakmayın. Maliyeti olmayan bir partiden satış yapıldığında
sistem kârı hesaplayamaz. Sonradan düzeltmek şu an mümkün değil.</p></div>
<h3>2. Mal kabul</h3>
<ul>
<li>Alım detayında <strong>Mal Kabul</strong> düğmesi.</li>
<li><strong>Sağlam</strong> ve <strong>hasarlı</strong> adedi ayrı girilir. Yalnız sağlam olan stoğa girer.</li>
<li>Malın hangi rafa girdiğini seçersiniz; bu bilgi hareketin üstünde kalıcı durur.</li>
<li>Parçalı teslimat olabilir: bugün 3, yarın 2 kabul edersiniz.</li>
</ul>
${sikHata([
  {
    hata: "Mal kabul yapmadan “stok yok” demek",
    cozum: "Alım kaydı stok ARTIRMAZ; mal fiilen gelince Mal Kabul yapılır. Panelde “mal kabul bekleyen” kutusu tam bunun için var.",
  },
  {
    hata: "Alış fiyatına kargo/kupon etkisini yansıtmamak",
    cozum: "Sistem KASADAN FİİLEN ÇIKAN tutarı taşır. Kuponla ucuza aldıysan o ucuz rakam doğrudur — “piyasa değeri” yazılmaz.",
  },
])}
</section>

<section id="satis">
${baslik("satis")}
${neZaman(
  "Pazaryerinden sipariş düştüğünde. Ne kadar erken girersen kâr rakamın o kadar doğru olur — komisyon oranı satış anında dondurulur.",
)}
<p><strong>Satışlar → Yeni satış.</strong> Bir satış her zaman bir kanal hesabına
bağlıdır — hangi pazaryerinin hangi mağazasından satıldığı, kesintileri belirler.</p>
<ol class="adimlar">
<li><div><h3>Kanal hesabı ve sipariş numarası</h3><p>Sipariş numarası zorunlu değil ama girerseniz benzersiz olmalı.</p></div></li>
<li><div><h3>Kalemler</h3><p>Ürünü arayın veya barkodunu okutun; fiyat KDV dahildir.</p></div></li>
<li><div><h3>Kargo</h3><p>Firmayı seçin; ücret desiye göre tarifeden okunur. Farklıysa elle yazabilirsiniz.</p></div></li>
<li><div><h3>Kaydet</h3><p>Stok en eski partiden düşer, kâr hesaplanır ve <strong>o anki hâliyle kayda yazılır.</strong></p></div></li>
</ol>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Komisyon oranları haftalık değişiyor. Kâr satış anında kaydedildiği için, oran
gelecek hafta değişse bile geçmiş satışın hesabı değişmez. Bilerek yeniden
hesaplatmak isterseniz satış detayında <strong>Yeniden hesapla</strong> var.</p></div>

<h3>Stoktan fazla satılamaz</h3>
<p>Elinizde 3 varken 5 satmaya çalışırsanız kayıt <strong>reddedilir</strong> ve
elinizde kaç olduğu ekranda yazar. Yarım kaydedilmiş satış oluşmaz.</p>

<h3>Sizde tanımlı kanal kesintileri</h3>
<p>Aşağıdakiler sisteminizde <strong>tanımlı olan</strong> kurallardır; kâr
hesabında bunlar uygulanır. Komisyon oranı ürün bazında Kanal SKU'da tutulur ve
bu tabloda görünmez.</p>
${canliTablo(
  ["Kanal", "Kesinti", "Değer", "Kapsam"],
  kesintiSatirlari,
  "Kanal kesinti kuralı tanımlı değil.",
)}
<p>Ayrıca her satışta <strong>stopaj</strong> kesilir: KDV hariç tutarın %1'i.
Kargo, desi tarifesinden okunur ve üstüne %20 KDV eklenir.</p>

<h3>Kargo firması ve desi tarifesi</h3>
<p>Satış formunda kargo firmasını sen seçersin; ücret, o firmanın
<strong>desi tarifesinden</strong> okunur ve üstüne %20 KDV eklenir. Farklı bir
tutar ödediysen elle yazabilirsin — yazdığın tutar geçerli olur.</p>
<p>Kullandığın firmalar ve tarifeleri kurulumda tanımlanır; listeni satış
formundaki kargo seçiminde görürsün.</p>
</section>

<section id="iade">
${baslik("iade")}
${neZaman(
  "Müşteri malı geri gönderdiğinde ya da kargo teslim edemeyip iade ettiğinde. Türü DOĞRU seçmek önemli: tür, malın stoğa geri girip girmeyeceğini belirler.",
)}
<p>Satış listesinde veya satış detayında <strong>İade Al</strong> düğmesi. Önce
türü seçersiniz; tür, malın stoğa girip girmeyeceğini belirler.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Tür</th><th>Ne oldu</th><th>Mal stoğa girer mi</th></tr></thead>
<tbody>
<tr><td><strong>Teslim edilemedi</strong></td><td>Müşteriye ulaşmadan geri döndü</td><td>Evet, sağlam gelense</td></tr>
<tr><td><strong>Normal iade</strong></td><td>Müşteri aldı, iade etti</td><td>Evet, sağlam gelense</td></tr>
<tr><td><strong>İtirazlı iade</strong></td><td>İtiraz kabul edildi, ürün müşteride kaldı</td><td><strong>Hayır</strong></td></tr>
</tbody></table></div>

<h3>Hangi kesinti geri gelir</h3>
<div class="izgara">
<div class="ek-kart"><div class="ust" style="color:var(--iyi)">Geri gelir</div>
<p>Komisyon · komisyon KDV'si · ödeme gideri · stopaj. Kısmi iadede hepsi <strong>adet oranında</strong>.</p></div>
<div class="ek-kart"><div class="ust" style="color:var(--tehlike)">Geri gelmez</div>
<p>Hizmet bedeli · sabit gider · <strong>gidiş kargosu</strong>. Bunlar yandı.</p></div>
</div>
<div class="ek-not dikkat"><div class="etiket">Sık yapılan hata</div>
<p>İade formundaki kargo alanına <strong>gidiş kargosunu yazmayın</strong>. O
zaten satışta düşüldü. Buraya yalnızca iade/dönüş kargosunu yazın.</p></div>

<h3>Ceza kademeleriniz</h3>
<p>Pazaryeri ceza kestiyse tutarı siz girersiniz; sistem sipariş tutarına göre bir
<strong>öneri</strong> gösterir. Kademesi olmayan tutarda öneri çıkmaz.</p>
${canliTablo(["Kanal", "Sipariş tutarı", "Ceza"], cezaSatirlari, "Ceza tarifesi tanımlı değil.")}

<h3>Önizleme zorunludur</h3>
<p><strong>Önizle</strong> düğmesi etkiyi satır satır gösterir; Kaydet düğmesi siz
önizlemeyi görmeden açılmaz. Kaydettikten sonra orijinal kâr <strong>silinmez</strong>:
her iade kendi tarihli bloğunda görünür, en altta iade sonrası net yazar.</p>
${sikHata([
  {
    hata: "Her iadeyi “normal iade” seçmek",
    cozum: "İtirazlı iadede ürün MÜŞTERİDE kalır ve stoğa girmemelidir. Yanlış tür seçilirse elinde olmayan mal stokta görünür ve bir sonraki satış hatalı FIFO ile hesaplanır.",
  },
])}
</section>

<section id="deneme">
${baslik("deneme")}
<p><strong>Sol menü → Fiyat denemesi.</strong> Tek soruyu cevaplar:
<em>bu ürünü şu fiyata satarsam elime ne kalır — ve hangi pazaryerinde en
çok kalır?</em> Hiçbir kayıt oluşturmaz; istediğin kadar deneyebilirsin.</p>

${neZaman(
  "Bir ürünü almadan önce (bu fiyata alırsam kâr eder miyim) ve satmadan önce (hangi pazaryerinde bırakayım). Buy box fiyatlarını pazaryerlerinden bakıp buraya girdiğinde, hangisinde satmanın daha kârlı olduğunu görürsün.",
)}

<h3>Neden tek bir fiyat yetmez</h3>
<p>Aynı ürünün buy box fiyatı her pazaryerinde farklıdır ve <strong>en düşük
fiyat en yüksek kârı verebilir.</strong> Gerçek bir örnek — alış 1.000 ₺,
kargo 200 ₺:</p>
<div class="ek-tablo"><table>
<thead><tr><th>Pazaryeri</th><th>Buy box</th><th>Komisyon</th><th>Diğer kesinti</th><th>NET-2</th></tr></thead>
<tbody>
<tr><td><strong>Trendyol</strong></td><td>2.150 ₺</td><td>%5</td><td>13,19 ₺ sabit</td><td><span class="sayi"><strong>673,17 ₺</strong></span></td></tr>
<tr><td>N11</td><td>2.175 ₺</td><td>%12</td><td>pazarlama + pazaryeri bedeli</td><td><span class="sayi">540,62 ₺</span></td></tr>
<tr><td>Hepsiburada</td><td>2.250 ₺</td><td>%13 <em>+KDV</em></td><td>12,60 ₺ + %0,8</td><td><span class="sayi">538,25 ₺</span></td></tr>
</tbody></table></div>
<p>En pahalıya satabildiğin yer Hepsiburada ama <strong>en çok para Trendyol'da
kalıyor</strong> — çünkü komisyona KDV ekleniyor ve iki ayrı sabit kesinti daha
var. Bu tersliği gözle görmek mümkün değil; hesabı sistem yapar.</p>

${ekranSemasi("Fiyat denemesi", [
  { no: 1, ad: "Ürünü koddan bul", aciklama: "Barkod, SKU, firma SKU ya da pazaryeri SKU'su. Okuyucuyla okutabilirsin.", genis: true },
  { no: 2, ad: "Alış fiyatı", aciklama: "Ürün bulunduysa kendiliğinden gelir — EN SON ödediğin birim maliyet. Ortalama DEĞİL: ortalama, aylar önceki bir maliyeti bugünkü denemeye karıştırır. Ortalaman özet satırında ayrıca yazar." },
  { no: 3, ad: "Satış fiyatı (ortak)", aciklama: "İsteğe bağlı. Ürün bulunduysa EN SON sattığın fiyat gelir." },
  { no: 4, ad: "Kargo ve KDV", aciklama: "Kargo boş bırakılırsa hesaba girmez (alıcı ödüyorsa)." },
  { no: 5, ad: "Pazaryeri kutuları", aciklama: "Her pazaryeri için buy box fiyatı + komisyon. Yalnız merak ettiğini doldurabilirsin.", genis: true, vurgulu: true },
  { no: 6, ad: "Sonuç kartları", aciklama: "NET-2'ye göre sıralı; kazanan kupalı ve yeşil şeritli. Altında pasta: satış fiyatı nereye gidiyor.", genis: true },
])}

<h3>Adım adım</h3>
${adimlar([
  { ad: "Ürünü bul", ne: "Barkodu okut ya da kodu yaz, <strong>Bul</strong>'a bas. Alış fiyatı, KDV oranı ve son satış fiyatın kendiliğinden dolar." },
  { ad: "Buy box fiyatlarını gir", ne: "Pazaryerlerine bakıp gördüğün fiyatları ilgili kutuya yaz. Bakmadığın pazaryerini boş bırak — o kanal susar, ötekileri etkilemez." },
  { ad: "Komisyonu kontrol et", ne: "Gri rakam veriden gelendir ve kutunun altında nereden geldiği yazar. Kampanyayı sistemden önce biliyorsan üstüne kendi oranını yaz." },
  { ad: "Kazanana bak", ne: "En üstteki kupalı kart en çok para bırakan pazaryeridir. Şerit kırmızıysa o kanalda o fiyata satmak ZARAR demektir." },
])}

<div class="ek-not"><div class="etiket">Yeşil rakamlar nereden geliyor</div>
<p>Alış fiyatı senin <strong>fiilen ödediğin</strong> tutardır (stok defterinden),
komisyon o haftanın <strong>gerçek tarifesinden</strong>, kesintiler ölçülmüş
kanal kurallarından. Bu ekranın değeri hesabın kendisinde değil,
<strong>girdilerin tahmin olmamasında</strong>.</p></div>

${sikHata([
  {
    hata: "Gri rakamı “girilmiş değer” sanmak",
    cozum: "Gri rakam kutu BOŞ bırakılırsa kullanılacak olan değerdir — yani gördüğün rakamla hesaplanır. Değiştirmek istiyorsan üstüne yaz; geri dönmek için yanındaki × işaretine bas.",
  },
  {
    hata: "Bir kanalın “NET hesaplanamadı” demesini hata sanmak",
    cozum: "O kanala fiyat girmemişsindir ya da o üründe komisyon oranı yoktur. Sistem sıfır kâr uydurmaz, susar. Kutuya rakam yazınca hesaplanır.",
  },
  {
    hata: "Trendyol’da “tarife penceresi bitmiş” uyarısını görmezden gelmek",
    cozum: "O haftanın tarifesi yüklenmemiş demektir; oran eski tarifeden okunuyor ve yanlış olabilir. Salı/Cuma dosyasını indirip yükle.",
  },
  {
    hata: "Sonucu kayıt sanmak",
    cozum: "Bu ekran hiçbir şey kaydetmez — ne satış, ne stok, ne kesinti. Denemedir. Satışı gerçekten kaydetmek için Satışlar → Yeni satış.",
  },
])}
</section>

<section id="kart">
${baslik("kart")}
<p><strong>Sol menü → Kârlılık kartı.</strong> Bir ürünün tüm geçmişini tek
sayfada toplar: kaça aldın, kaça sattın, ne kadar sürede satıldı, elinde ne
kaldı, ne kadar kâr bıraktı.</p>
${neZaman(
  "Bir ürünü yeniden almadan önce. “Bu ürün iyi mi” sorusunun cevabı burada: satış hızı, ortalama marj ve elde kalan adet birlikte görünür.",
)}
${ekranSemasi("Kârlılık kartı", [
  { no: 1, ad: "Ürün arama", aciklama: "Barkod ya da kod. Okuyucu destekli.", genis: true },
  { no: 2, ad: "Özet rakamlar", aciklama: "Satılan adet · ortalama alış · ortalama satış · toplam NET-2.", vurgulu: true },
  { no: 3, ad: "Bekleme süresi", aciklama: "Alımdan satışa kaç gün geçmiş. Sermayenin ne kadar bağlı kaldığını söyler." },
  { no: 4, ad: "Açık partiler", aciklama: "Elde kalan mal ve her partinin GERÇEK maliyeti (FIFO)." },
  { no: 5, ad: "Fiyat dene", aciklama: "Kartın içinden doğrudan deneme — ürün zaten seçili." },
])}
${sikHata([
  {
    hata: "Ortalama maliyet ile açık parti maliyetini karıştırmak",
    cozum: "İkisi FARKLI sorulara cevap: ortalama “bu ürünü genelde kaça alıyorum”, açık parti “elimdeki malın maliyeti ne”. Kâr hesabı ikincisini kullanır.",
  },
  {
    hata: "Stok bitince “alım kaydı yok” sanmak",
    cozum: "Kart geçmişin tamamını gösterir; stok sıfır olsa da alım ve satış geçmişi durur.",
  },
])}
</section>

<section id="gider">
${baslik("gider")}
${neZaman(
  "Kira, kargo faturası, ambalaj, reklam gibi satışa DOĞRUDAN bağlı olmayan her harcamada. Satışın kendi kesintileri (komisyon, kargo) buraya girmez — onları sistem satıştan hesaplar.",
)}
<p>Kira, maaş, sarf malzeme, abonelik, banka masrafı. <strong>Giderler → Yeni gider.</strong></p>
<ul>
<li>Tutar <strong>KDV dahil</strong> girilir.</li>
<li>Kategoriyi seçince <strong>KDV oranı kendiliğinden gelir</strong>. Farklıysa değiştirin.</li>
<li>Gerçek net'ten düşen kısım tutarın <strong>KDV hariç</strong> hâlidir; içindeki KDV muhasebeciniz için ayrı satırda gösterilir.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p><strong>KDV ödemenizi gider olarak girmeyin.</strong> NET-2 hesabı ödenecek
KDV'yi zaten düşüyor; ikinci kez düşerdi. "Vergi" kategorisi damga vergisi, MTV
gibi KDV dışı vergiler içindir.</p></div>

<h3>Gider kategorileri</h3>
<p>Her gider bir <strong>kategoriye</strong> ve bir <strong>türe</strong>
bağlanır: <strong>sabit</strong> (kira gibi her ay aynı) ya da
<strong>değişken</strong> (ambalaj gibi hacimle değişen). Bu ayrım dönem
raporunda sabit giderlerin ayrı toplanmasını sağlar.</p>
<p>Kategorilerin kendi listesini ve varsayılan KDV oranlarını
<strong>Giderler → Şablonlar</strong> ekranında yönetirsin.</p>

<h3>Her ay tekrar eden giderler</h3>
<p><strong>Giderler → Tekrarlayan giderler.</strong> Kirayı bir kez şablon olarak
tanımlarsınız, her ay tek dokunuşla eklersiniz. Sistem
<strong>kendiliğinden kayıt üretmez</strong>. Aynı şablondan o ay zaten gider
girilmişse düğme pasifleşir — kirayı ikinci kez girmiş olmazsınız.</p>

<h3>Hangi vergi buraya yazılır, hangisi yazılmaz</h3>
<p>Bu soru en çok karıştıran yer, çünkü <strong>üç ayrı şey aynı kelimeyle
anılıyor.</strong> Ölçüt tek: <strong>kasadan para çıktı mı?</strong></p>
<div class="ek-tablo"><table>
<thead><tr><th>Kalem</th><th>Gider olarak yazılır mı</th><th>KDV oranı</th><th>Neden</th></tr></thead>
<tbody>
<tr><td><strong>Damga vergisi</strong> (ör. 791&nbsp;TL)</td><td><strong>EVET</strong> — Vergi kategorisi</td><td><strong>0</strong></td><td>Kasadan çıkan gerçek para. İçinde KDV yok, o yüzden oranı 0 girilir ve tutarın <strong>tamamı</strong> net'ten düşer.</td></tr>
<tr><td><strong>MTV, harç, ceza</strong></td><td><strong>EVET</strong> — Vergi kategorisi</td><td><strong>0</strong></td><td>Damga vergisiyle aynı mantık.</td></tr>
<tr><td><strong>Ödediğiniz gelir vergisi</strong></td><td><strong>EVET</strong> — Vergi kategorisi</td><td><strong>0</strong></td><td>Devlete fiilen ödediğiniz tutar. Ne zaman ödediyseniz o tarihe yazılır.</td></tr>
<tr><td><strong>Ödenecek KDV</strong></td><td><strong>HAYIR</strong></td><td>—</td><td>NET-2 hesabı ödenecek KDV'yi <strong>zaten düşüyor</strong>. Buraya da yazarsanız aynı para iki kez düşer ve ay olduğundan kötü görünür.</td></tr>
<tr><td><strong>Stopaj</strong></td><td><strong>HAYIR</strong></td><td>—</td><td>Satış başına NET-1 hesabında zaten kesiliyor.</td></tr>
</tbody></table></div>
<div class="ek-not dikkat"><div class="etiket">Karıştırmayın</div>
<p>Kâr ekranlarında bir zamanlar konuşulan <strong>“%15 gelir vergisi”</strong>
bir <strong>varsayımdı</strong> ve <strong>kullanılmıyor</strong> — hiçbir
hesaba girmiyor, hiçbir ekranda görünmüyor. Sizin ödediğiniz gerçek gelir
vergisi ise apayrı bir şeydir ve <strong>gider olarak yazılır</strong>. İkisinin
tek ortak yanı adıdır.</p></div>

<h3>Gideri kartla ödediyseniz</h3>
<p>Gider formunda <strong>“Nasıl ödendi?”</strong> diye sorulur ve üç cevap
vardır: <strong>Nakit</strong> · <strong>Havale / EFT</strong> ·
<strong>Kartla</strong>. <strong>Kartla</strong>'yı seçince altta
<strong>kart listesi</strong> açılır.</p>
<ul>
<li>Kart seçtiğiniz an bu tutar <strong>o kartın borcuna</strong> ve
<strong>nakit takvimine</strong> girer. Seçmezseniz girmez — sistem hangi
kartla ödediğinizi tahmin etmez.</li>
<li><strong>Taksit sayısı isteğe bağlıdır.</strong> Boş bırakırsanız tek çekim
sayılır.</li>
</ul>
<div class="ek-not"><div class="etiket">Gerçek akış</div>
<p>Vergiyi devlete <strong>peşin</strong> kartla ödersiniz, sonra banka
uygulamasına girip <strong>taksite böldürürsünüz</strong>. Karta yansıyan borç
artık taksitlidir. O yüzden taksit sayısını <strong>böldürdükten sonra</strong>
gidere yazın: borç doğru aylara dağılsın, hepsi tek aya yığılmasın. Kayıt
girilmişse <strong>Giderler → düzenle</strong> ile taksit sayısını sonradan da
yazabilirsiniz.</p></div>
<div class="ek-not dikkat"><div class="etiket">Para birimi çevrilmez</div>
<p>EUR bir gideri TRY bir karta yazamazsınız — sistem kur çevirmez, çünkü
uydurma bir rakam üretmiş olurdu. Böyle bir kayıt <strong>kart borcuna
girmez</strong> ve kart borcu ekranında <strong>“atlanan” sayısında</strong>
görünür: sessizce kaybolmaz, size söylenir.</p></div>

<h3>“Belirtilmedi” ne demek</h3>
<p>Ödeme yöntemi alanı <strong>25.08.2026'da</strong> açıldı. Ondan önce
girdiğiniz giderlerin nasıl ödendiğini sistem <strong>bilmiyor</strong> ve
listede <strong>“Belirtilmedi”</strong> yazar.</p>
<ul>
<li>Bu bir <strong>hata değil</strong>: sistem “Nakit” diye tahmin etmek yerine
bilmediğini söylüyor. Tahmin etseydi bir daha hiç sorgulamazdınız.</li>
<li>Eski bir kayıtta <strong>kart seçili ama yöntem boşsa</strong> liste
<strong>“Belirtilmedi · Garanti”</strong> gibi yazar — kartı gizlemez, ama
kartın varlığından “Kartla ödendi” sonucunu da <strong>çıkarmaz</strong>.</li>
<li>Biliyorsanız kaydı <strong>düzenleyip</strong> işaretleyebilirsiniz. Zorunlu
değildir; hiçbir hesap bu alandan yürümez. Kart borcunu belirleyen şey
<strong>seçilen karttır</strong>, bu alan değil.</li>
</ul>
${sikHata([
  {
    hata: "Ödenecek KDV'yi gider olarak girmek",
    cozum: "NET-2 zaten düşüyor; ikinci kez düşer ve ay olduğundan kötü görünür. “Vergi” kategorisi damga vergisi, MTV, harç gibi KDV DIŞI kalemler içindir.",
  },
  {
    hata: "Damga vergisine %20 KDV yazmak",
    cozum: "İçinde KDV yok. Oranı 0 girin ki tutarın tamamı net'ten düşsün; %20 yazarsanız 791 TL'nin 131 TL'si “indirilecek KDV” sanılır.",
  },
  {
    hata: "Kartla ödenen gideri kart seçmeden kaydetmek",
    cozum: "Tutar kart borcuna ve nakit takvimine hiç girmez; ay sonunda beklediğinizden fazla ödeme çıkar. Formda “Kartla” seçip kartı işaretleyin.",
  },
  {
    hata: "Bankada taksite böldürüp gidere tek çekim yazmak",
    cozum: "Borcun tamamı tek aya yığılır ve nakit takvimi o ayı olduğundan ağır gösterir. Böldürdükten sonra taksit sayısını düzenleyin.",
  },
])}
</section>

<section id="kartBorcu">
${baslik("kartBorcu")}
<p>İki ayrı ekran, aynı konu. <strong>Kartlar</strong> kredi kartlarını tanımlar
(limit, kesim günü, son ödeme günü). <strong>Kart Borcu</strong> o kartlarda
biriken borcu ve ne zaman ödeneceğini gösterir.</p>
${neZaman(
  "Alım yapmadan önce (hangi kartta yer var) ve ay sonuna doğru (ne kadar ödeme çıkacak).",
)}
<h3>Kesim günü neden önemli</h3>
<p>Bir alım, kartın kesim gününden ÖNCE yapılırsa o ayın ekstresine düşer ve
yakında ödenir; kesimden SONRA yapılırsa bir sonraki ekstreye kayar ve
<strong>bir ay daha nakitte kalırsın.</strong> Sistem her alımı doğru ekstreye
kendisi yazar.</p>
${ekranSemasi("Kart Borcu", [
  { no: 1, ad: "Kart kartları", aciklama: "Her kart için: bekleyen borç · kalan limit · son ödeme günü.", genis: true, vurgulu: true },
  { no: 2, ad: "Ekstre dökümü", aciklama: "Hangi alımlar hangi aya düştü." },
  { no: 3, ad: "Ödeme kaydı", aciklama: "Ödediğinde işaretlersin; borç düşer." },
])}
${sikHata([
  {
    hata: "Kesim günü girilmemiş kart",
    cozum: "Kesim günü olmadan borcun hangi aya düştüğü BİLİNEMEZ. Sistem sıfır göstermez, “hesaplanamıyor” der ve sebebini yazar. Kartlar → Düzenle'den kesim gününü gir.",
  },
])}
</section>

<section id="hakedis">
${baslik("hakedis")}
<p><strong>Sol menü → Hakediş.</strong> Pazaryeri sattığın malın parasını hemen
vermez. Hakediş, <em>ne kadar alacağın olduğunu ve ne zaman yatacağını</em>
takip eder.</p>
${neZaman(
  "Pazaryerinden ödeme dosyası indirdiğinde yüklemek için; ve “bu ay elime ne geçecek” diye merak ettiğinde.",
)}
<div class="ek-not dikkat"><div class="etiket">Ödeme dosyası GEÇ gelir</div>
<p>Ölçüldü: Trendyol ödeme dosyası siparişten <strong>ortanca 28 gün</strong>
sonra, Hepsiburada <strong>~34 gün</strong> sonra yayımlanıyor. Yani
“ağustos dosyası” haziran-temmuz siparişlerini taşır. Erken indirilen
dosya hiçbir satışla eşleşmez — bu bir arıza değil, <strong>takvimin
kendisi</strong>.</p></div>
${ekranSemasi("Hakediş", [
  { no: 1, ad: "Dosya yükle", aciklama: "Pazaryerinin ödeme/hakediş dosyası. Hangi kanala ait olduğu içeriğinden anlaşılır." },
  { no: 2, ad: "Kalemler", aciklama: "Her satır bir ödeme kalemi. Sipariş numarasıyla satışına bağlanır." },
  { no: 3, ad: "Bağlanamayanlar", aciklama: "Sistemde karşılığı bulunamayan kalemler AYRI sayılır ve adıyla listelenir.", vurgulu: true },
])}
${sikHata([
  {
    hata: "Bağlanamayan kalemi “alacak” sanmak",
    cozum: "Satışına bağlanamamış kalem bir ALACAK değil, bir RAPOR SATIRIDIR. Sistem onun hakkında gecikme iddiası kurmaz — bilmediği bir şey hakkında hüküm vermez.",
  },
  {
    hata: "Ödeme dosyasını çok erken indirmek",
    cozum: "Siparişten 28–34 gün geçmeden o siparişler dosyada olmaz. Erken yükleme, bağlanamayan kalem yığınını büyütür ve hiçbir şeyi bağlamaz.",
  },
])}
</section>

<section id="tazminat">
${baslik("tazminat")}
<p><strong>Sol menü → Tazminat.</strong> Kargo firması malı kaybederse ya da
hasar verirse ödediği bedel buraya kaydedilir.</p>
${neZaman("Kargo kaybı/hasarı için tazminat talebi açtığında ve sonuçlandığında.")}
${sikHata([
  {
    hata: "Tazminatı satışın kârına yazmak",
    cozum: "Tazminat ayrı bir kalemdir; satışın kârını değiştirmez. Satış zaten iade/kayıp olarak işlenir, tazminat onun üstüne gelir.",
  },
])}
</section>

<section id="nakit">
${baslik("nakit")}
<p><strong>Sol menü → Nakit takvimi.</strong> Önümüzdeki günlerde
<em>kasadan ne çıkacak, kasaya ne girecek</em> — gün gün.</p>
${neZaman(
  "Büyük bir alım yapmadan önce. “Bu parayı harcarsam 10 gün sonra kart borcunu ödeyebilir miyim” sorusunun cevabı burada.",
)}
${ekranSemasi("Nakit takvimi", [
  { no: 1, ad: "Çıkacaklar", aciklama: "Kart borçları, vadesi gelen giderler." },
  { no: 2, ad: "Girecekler", aciklama: "Beklenen hakediş ödemeleri." },
  { no: 3, ad: "Günlük denge", aciklama: "Girenden çıkanı düşünce kalan.", vurgulu: true },
])}
</section>

<section id="envanter">
${baslik("envanter")}
<p><strong>Sol menü → Envanter değeri.</strong> Elindeki malın
<strong>sana kaça mal olduğu</strong> — piyasa değeri değil, fiilen ödediğin.</p>
${neZaman(
  "Ay sonunda “param nerede” diye baktığında. Kasada görünmeyen paranın çoğu buradadır: rafta duran mal.",
)}
${sikHata([
  {
    hata: "Envanter değerini satış fiyatıyla düşünmek",
    cozum: "Bu ekran MALİYET gösterir. Satarsan eline geçecek para değil, o malı almak için çıkardığın paradır. Kâr, satış anında hesaplanır.",
  },
])}
</section>

<section id="rapor">
${baslik("rapor")}
<p><strong>Rapor.</strong> "Bu ay gerçekte ne kazandım?" sorusunun cevabı burada.</p>
<h3>Pencere seçimi</h3>
<ul>
<li><strong>Bu ay</strong> — ayın 1'inden bugüne.</li>
<li><strong>Son 3 ay / Son 6 ay</strong> — bu ay dahil, o kadar takvim ayı geriye.</li>
<li><strong>Özel aralık</strong> — iki tarih verirsiniz, bitiş günü dahildir.</li>
</ul>
<div class="formul">Satış geliri      satılan malın toplam tutarı
Σ NET-1 / NET-2   brüt kâr, <b>iade etkileri dahil</b>
Dönem giderleri   KDV hariç, net'ten düşen kısım
<b>GERÇEK NET      Σ NET-2 − dönem giderleri</b></div>
<div class="ek-not"><div class="etiket">Önemli ayrıntı</div>
<p>Bir iade, <strong>iadenin yapıldığı aya</strong> yazılır — satışın ayına değil.
Temmuz satışının Ağustos iadesi Ağustos'a düşer. Böylece kapanmış bir ayın raporu
sonradan değişmez.</p></div>
<h3>Kârı hesaplanamayan satışlar</h3>
<p>Rapor bunları <strong>sessizce atlamaz</strong>: sarı bir kutuda sayısını,
nedenini ve <strong>hangi satışlar olduğunu</strong> gösterir. Kayda tıklarsanız
doğrudan o satışa gidersiniz, altında nasıl düzeltileceği yazar. Gelirleri toplama
katılır, kârları katılmaz — sıfır sayılmazlar.</p>

<h3>Panel (ana sayfa)</h3>
<p>Girişte karşınıza çıkan ekran. <strong>Bu ayı kanal kanal</strong> gösterir:
kaç satış, ne kadar ciro, ne kadar NET-2. Aynı pazaryerinde birden fazla
hesabınız varsa <strong>tek satırda birleşir</strong> — "Trendyol bu ay ne yaptı"
sorusunun cevabı hesaplara bölünmez.</p>
<div class="ek-not"><div class="etiket">NET-2 nereden geliyor</div>
<p>Panelin NET-2'si <strong>Rapor ekranındaki Σ NET-2 ile aynı şeydir</strong>:
satışların kârı <strong>artı iade etkileri</strong>. Bir iade, iadenin yapıldığı
aya ve <strong>iade edilen satışın kanalına</strong> yazılır. İki ekranın aynı ay
için farklı rakam vermemesi için tanım tektir — kanal blokları, grafik çizgisi ve
aylık tablo, üçü de aynı hesabı kullanır.</p></div>
<p>Altındaki grafik <strong>son 12 ayı</strong> çizer: dolu çizgi NET-2, kesikli
çizgi ciro. Kanal ve para birimi süzgeçleri üstündedir. <strong>Satış olmayan ay
grafikte atlanmaz</strong>, sıfır olarak durur — yoksa çizgi iki ayı birleştirir ve
aradaki duruş hiç yaşanmamış gibi görünür. Grafiğin altındaki tablo aynı
rakamların okunabilir hâlidir; telefonda asıl oradan bakılır.</p>

<h3>Envanter değeri</h3>
<p><strong>"Depoda ne kadar param duruyor?"</strong> Açık partilerin kalan adedi,
o partinin birim maliyetiyle çarpılır. İki sütun vardır:</p>
<div class="formul">Ödenen (KDV dahil)      tedarikçiye fiilen ödediğiniz tutar
Mal bedeli (KDV hariç)  malın KDV'siz değeri</div>
<p>KDV oranı <strong>ürünün kategorisinden</strong> okunur. Ürüne kategori
atanmamışsa o satırda mal bedeli <strong>"hesaplanamadı"</strong> yazar ve toplama
girmez — sistem %20 varsayıp size uydurma bir rakam vermez. Sarı kutu kaç üründe
böyle olduğunu söyler ve kategori ekranına götürür.</p>
<div class="ek-not"><div class="etiket">Değeri bilinmeyen stok</div>
<p>Maliyetsiz girilmiş partiler (açılış stoğu ya da elle düzeltme) <strong>ayrı bir
kutuda</strong> durur. Adetleri gerçektir, paraları bilinmez — bu yüzden toplamlara
katılmazlar. Sıfır sayılsalardı envanteriniz olduğundan ucuz görünürdü.</p></div>
</section>

<section id="talep">
${baslik("talep")}
<p><strong>Sol menü → Destek talepleri.</strong> Sistemle ilgili bir sorunu ya
da isteği kayda geçirdiğin yer. Konuşmada kalan bir talep unutulur; buraya
yazılan kalır ve durumu takip edilebilir.</p>
${neZaman(
  "Bir ekran beklediğin gibi çalışmadığında (HATA) ya da bugün olmayan bir şeyin olmasını istediğinde (İSTEK). İkisini ayırman önemli: hata acildir, istek sıraya girer.",
)}
${ekranSemasi("Destek talepleri", [
  { no: 1, ad: "Ne bildiriyorsun", aciklama: "Hata mı istek mi. HATA: çalışması gerekirken çalışmayan bir şey. İSTEK: bugün olmayan ama olmasını istediğin bir şey." },
  { no: 2, ad: "Kısa başlık", aciklama: "Tek cümlede ne olduğu. Örnek: 'Satış kaydederken kargo firması seçilmiyor'." },
  { no: 3, ad: "Ne oldu, ne bekliyordun", aciklama: "Adım adım: ne yaptım, ne oldu, ne olmasını bekliyordum. Üç cümle yeter ama üçü de olsun.", genis: true, vurgulu: true },
  { no: 4, ad: "Otomatik eklenenler", aciklama: "Hangi sayfadaydın ve hangi tarayıcıyı kullandığın kendiliğinden eklenir — senin yazmana gerek yok." },
  { no: 5, ad: "Liste ve durum", aciklama: "Gönderdikten sonra talep listede durur; durumu buradan izlenir." },
])}

<h3>İyi bir bildirim nasıl yazılır</h3>
<p>Aradaki fark şudur — ikisi de aynı sorunu anlatıyor ama biri
<strong>çözülebilir</strong>:</p>
<div class="ek-tablo"><table>
<thead><tr><th>Zayıf</th><th>Güçlü</th></tr></thead>
<tbody>
<tr>
<td>"Satış ekranı bozuk"</td>
<td>"Satışlar → Yeni satış'ta kargo firmasını seçtim, kaydedince ücret 0 ₺ kaldı. 120 ₺ bekliyordum."</td>
</tr>
<tr>
<td>"Rakamlar yanlış"</td>
<td>"11518039572 numaralı satışta NET-2 ₺651 görünüyor, elle hesabım ₺673. Komisyon %5 girmiştim."</td>
</tr>
</tbody></table></div>
<p>Güçlü olanın farkı: <strong>hangi ekran · hangi kayıt · gördüğün rakam ·
beklediğin rakam.</strong> Bu dördü varsa sorun aranmaz, doğrudan bakılır.</p>

${sikHata([
  {
    hata: "Ekran görüntüsünü forma eklemeye çalışmak",
    cozum: "Form gönderilirken ek alınmaz. Önce talebi gönder, sonra LİSTEDEN o talebi açıp ekran görüntüsünü ekle.",
  },
  {
    hata: "Her şeyi “HATA” olarak bildirmek",
    cozum: "Olmayan bir özelliği istemek hata değil İSTEKTİR. Hepsi hata sayılırsa gerçek hatalar yığının içinde kaybolur.",
  },
  {
    hata: "“Bir ara olmuştu” diye yazmak",
    cozum: "Tekrarlanamayan bir sorun aranamaz. Hangi kayıtta, hangi tarihte olduğu yazılırsa bakılabilir; yazılmazsa talep açık kalır ve kimseye faydası olmaz.",
  },
])}
</section>

<section id="depo">
${baslik("depo")}
<p><strong>Sol menü &rarr; Tanımlar &rarr; Depo kurulumu.</strong> Deponuzun
düzenini bir kez tarif edersiniz, sistem <strong>raf kodlarını üretir</strong>.
Her firmanın deposu farklıdır &mdash; bu yüzden şablon sisteme gömülü değil,
siz çiziyorsunuz.</p>
${neZaman(
  "Depoyu ilk kurarken, ve sonradan raf/ünite eklediğinizde. Yılda birkaç kez açılır.",
)}
<h3>Üç şey soruyor</h3>
<p><strong>Bölüm adı</strong> &mdash; serbest: &quot;Salon&quot;, &quot;Depo-2&quot;.
Ekranlarda bu görünür.</p>
<p><strong>Kısaltma</strong> &mdash; raf kodunun içine giren kısa hâli:
<code>SLN</code>. Yalnız büyük harf ve rakam; boşluk ve Türkçe karakter
<strong>olmaz</strong>, çünkü barkod onları taşıyamaz.</p>
<p><strong>Ünite ve göz sayısı</strong> &mdash; kaç raf iskeleti, her birinde kaç
kat.</p>
<p>Bunlardan şunu üretir: <code>RAF-SLN1-1</code>, <code>RAF-SLN1-2</code>,
<code>RAF-SLN2-1</code> &hellip;</p>
<div class="ek-not dikkat"><div class="etiket">Kısaltma sonradan değişmez</div>
<p>Kısaltma <strong>basılı etiketin içinde</strong>. Değiştirilseydi raflardaki
bütün etiketler yalan söylemeye başlardı. Bölümün <em>görünen adı</em>
değişebilir, kısaltması değişemez &mdash; ekran bunu kurarken de söyler.</p></div>
<h3>Göz numarası neden yerden yukarı</h3>
<p><strong>1 = en alt kat.</strong> Üste kat eklerseniz mevcut etiketlerin
<strong>hiçbiri değişmez</strong>. Üstten saysaydık bir kat eklediğinizde bütün
numaralar kayar ve yapıştırdığınız etiketleri sökmeniz gerekirdi.</p>
<h3>Onaysız hiçbir raf açılmaz</h3>
<p><strong>Önce göster</strong>&apos;e bastığınızda ekran ne olacağını söyler:
kaç kod üretilecek, kaçı yeni, kaçı <strong>zaten var</strong>. Zaten olanların
<strong>üstüne yazılmaz</strong> &mdash; onların üstünde ürün olabilir ve
etiketleri basılmış olabilir. Rakamlar doğruysa <strong>&quot;N rafı aç&quot;</strong>.</p>
<h3>Sonra ne olur</h3>
<p><a href="#raf">Raf Konumları</a> ekranından etiketleri yazdırır, raflara
yapıştırırsınız. Sonra <a href="#okuma">Barkod okut</a> ile bir rafı okutunca
o rafa kayıtlı ürünleri görürsünüz.</p>
${sikHata([
  {
    hata: "Kısaltmaya Türkçe karakter yazmak",
    cozum: "Barkod Ç, Ğ, İ, Ö, Ş, Ü taşıyamaz. Kısaltmayı SLN, DEPO2 gibi yazın.",
  },
  {
    hata: "Düzen değişince kısaltmayı değiştirmeye çalışmak",
    cozum: "Değişmez. Yeni bir bölüm açıp ürünleri oraya taşıyın; eski bölüm boşalınca silinir.",
  },
  {
    hata: "\"Zaten var\" satırını hata sanmak",
    cozum: "Hata değil, koruma. Var olan raflar korunuyor; yalnız eksikler açılıyor.",
  },
])}
</section>

<section id="raf">
${baslik("raf")}
<p><strong>Ayarlar → Raf Konumları.</strong> Deponun içindeki yerlerin
listesi. Her rafın bir <strong>kodu</strong> (kısa, okunaklı) ve isteğe bağlı
bir <strong>adı</strong> vardır.</p>
${neZaman(
  "Depoyu ilk kurarken; yeni bir raf ya da kutu eklediğinde; ve iki rafı birleştirmek istediğinde.",
)}
<h3>Neden ayrı bir ekran</h3>
<p>Raf, ürünün <strong>özelliği değil konumu</strong>dur. Aynı ürün iki rafta
durabilir, aynı raf onlarca ürün taşıyabilir. Ayrı tutulduğu için raf adını
değiştirmek hiçbir ürünü bozmaz.</p>
<p>Bu ekranda ayrıca <strong>etiket yazdırma</strong> ve <strong>iki rafı
birleştirme</strong> vardır. Birleştirme, yanlışlıkla iki kez açılmış bir
konumu tek çatı altına alır ve stok hareketleri kaybolmaz.</p>
${sikHata([
  {
    hata: "Raf kodunu uzun ve karmaşık yapmak",
    cozum: "Kod okunacak ve yazılacak. \u201cA-03\u201d iyi, \u201cDEPO-SOL-DUVAR-UST-RAF-3\u201d kötü. Uzun açıklama ADA yazılır, koda değil.",
  },
])}
</section>

<section id="kategori">
${baslik("kategori")}
<p><strong>Ayarlar → KDV Kategorileri.</strong> Her ürün bir kategoriye
bağlanır ve <strong>KDV oranı o kategoriden okunur</strong> \u2014 ürün ürün
elle girilmez.</p>
${neZaman(
  "Yeni bir ürün grubu almaya başladığında (oyuncak, elektronik, gıda) ve mevzuat bir oranı değiştirdiğinde.",
)}
<h3>Oran nereden çözülür &mdash; sıra kesindir</h3>
<div class="formul"><b>ürün istisnası</b>  &rarr;  <b>kategori oranı</b>  &rarr;  varsayılan %20</div>
<p>Bir üründe özel oran girilmişse o kazanır; yoksa kategorinin oranı; o da
yoksa %20. Çözülen oran <strong>satış anında satışa yazılır</strong>: oran
sonradan değişse eski satışların hesabı değişmez.</p>
${sikHata([
  {
    hata: "Ürünü kategorisiz bırakmak",
    cozum: "Kategorisi olmayan ürün varsayılan %20 ile hesaplanır. %1 ya da %10 grubundaysa KDV yanlış çıkar ve fark aylar sonra ödenecek KDV rakamında görünür.",
  },
])}
</section>

<section id="duzeltme">
${baslik("duzeltme")}
<p><strong>Ayarlar → Düzeltme nedenleri.</strong> Bir stok düzeltmesi
girildiğinde seçilen <strong>neden</strong> listesini yönetir: sayım farkı,
kırık ya da hasarlı, kayıp, numune gibi.</p>
${neZaman("Yeni bir düzeltme sebebi ortaya çıktığında.")}
<h3>Neden sebep zorunlu</h3>
<p>Sebepsiz bir düzeltme, üç ay sonra <em>burada ne olmuştu</em> sorusuna
cevap bırakmaz. Kapalı bir listeden seçtirmek ayrıca
<strong>sayılabilir</strong> hâle getirir: hangi sebepten yılda kaç adet
kaybettiğin ancak liste tutarlıysa ölçülebilir.</p>
</section>

<section id="kanalHesabi">
${baslik("kanalHesabi")}
<p><strong>Ayarlar → Kanal Hesapları.</strong> Hangi pazaryerinde hangi
mağazayla satış yaptığını tanımlar. Bir <strong>kanal</strong> pazaryeridir;
bir <strong>hesap</strong> o pazaryerindeki mağazandır.</p>
${neZaman(
  "İlk kurulumda ve yeni bir mağaza açtığında. Satış girebilmek için en az bir hesap gerekir \u2014 satış her zaman BİR hesaba bağlıdır.",
)}
<h3>Neden birden fazla hesap</h3>
<p>Aynı pazaryerinde birden çok mağaza olabilir; alım limitleri hesap
başınadır. Kesinti kuralları ve komisyon oranları da hesap bazında
farklılaşabildiği için, satışın hangi mağazadan geldiği <strong>kârı doğrudan
değiştirir</strong>.</p>
<div class="ek-not dikkat"><div class="etiket">Alış hesabı, satış hesabı değildir</div>
<p>Bazı hesaplar yalnız <strong>alım</strong> içindir. Komisyon oranı
yüklerken alış hesabı seçilirse sistem reddeder: komisyon yalnız mal
SATTIĞIN mağazada anlamlıdır.</p></div>
${sikHata([
  {
    hata: "Satışı yanlış hesaba yazmak",
    cozum: "Kanal değişince kesinti kuralları da değişir ve NET yanlış çıkar. Satış detayından hesabı düzeltirsen kâr yeniden hesaplanır.",
  },
])}
</section>

<section id="tedarikci">
${baslik("tedarikci")}
<p><strong>Ayarlar → Tedarikçiler.</strong> Mal aldığın yerlerin listesi.
Alım kaydında tedarikçi seçilir; böylece bir ürünü kimden ve kaça aldığın
sorusu geçmişe dönük cevaplanabilir.</p>
${neZaman("Yeni bir yerden ilk kez mal aldığında.")}
<h3>Ne işe yarar</h3>
<p>Aynı ürünü iki tedarikçiden farklı fiyata alıyorsan, alım geçmişi bunu
gösterir. Ayrıca bir iade ya da garanti durumunda malın <strong>nereden
geldiği</strong> kayıtta durur, kutunun üstünde değil.</p>
</section>

<section id="kullanici">
${baslik("kullanici")}
<p><strong>Ayarlar → Kullanıcılar.</strong> Sisteme kimlerin girebileceğini
yönetir. Her kullanıcının kendi e-postası, parolası ve bir
<strong>rolü</strong> vardır.</p>
${neZaman("Yeni biri işe başladığında ve biri ayrıldığında.")}
<div class="ek-not dikkat"><div class="etiket">Ayrılan kullanıcı SİLİNMEZ</div>
<p>Kullanıcı <strong>pasife alınır</strong>. Silinseydi o kişinin girdiği
kayıtların kim tarafından yapıldığı bilgisi de kaybolurdu; defterin izi
koparadı. Pasif kullanıcı giriş yapamaz ama geçmişteki imzası durur.</p></div>
${sikHata([
  {
    hata: "Parolayı paylaşmak",
    cozum: "İki kişi tek hesapla girerse hangi kaydı kimin yaptığı BİLİNEMEZ. Herkesin kendi hesabı olsun; sistemin izi ancak o zaman işe yarar.",
  },
])}
</section>

<section id="rol">
${baslik("rol")}
<p><strong>Ayarlar → Roller.</strong> Bir rolün hangi ekranları görebileceğini
ve hangi işlemleri yapabileceğini belirler. Kullanıcıya rol verilir, izin
değil; böylece on kişiye tek tek izin dağıtmak gerekmez.</p>
${neZaman(
  "Birden fazla kişi çalışmaya başladığında. Tek kullanıcılıyken bu ekran boş bir katmandır: zaten her şeyi görüyorsun.",
)}
<h3>Yetki iki bacaklıdır</h3>
<p>Bir izin iki yerde yaşar: <strong>kodda</strong> ve
<strong>veritabanında</strong>. İkincisi eksikse ekran menüde görünür ama
tıklayınca açılmaz. Bu yüzden yeni bir izin eklendiğinde roller ekranından
ilgili role işaretlenmesi gerekir.</p>
${sikHata([
  {
    hata: "Rol adına bakıp yetkisi vardır saymak",
    cozum: "Ölçüt İZİN KÜMESİDİR, rol adı değil. \u201cYönetici\u201d adlı bir rol, izinleri işaretlenmemişse hiçbir şey yapamaz. Ad bir etikettir, yetki değil.",
  },
])}
</section>

<section id="menu">
${baslik("menu")}
${neZaman(
  "Sol menüdeki sıra size ters geldiğinde. Günlük işinizde en çok açtığınız ekranlar en üstte olmalı.",
)}
<p><strong>Ayarlar → Menü düzeni.</strong> Sol menüdeki sıralamayı ve hangi
başlığın hangi grupta duracağını buradan değiştirirsiniz. Eskiden bu bir kod
değişikliğiydi; artık sizin elinizde.</p>
<ul>
<li><strong>Yukarı/aşağı okları</strong> sırayı değiştirir — bir tık bir adım.</li>
<li><strong>Yanındaki açılır liste</strong> o başlığın hangi grupta duracağını
seçer. <em>Hep açık liste</em>yi seçerseniz menüde her zaman görünür.</li>
<li><strong>Kaydedene kadar hiçbir şey değişmez.</strong> Deneyip vazgeçmek
serbest — sayfadan çıkarsanız eski düzen yerinde kalır.</li>
</ul>
<div class="ek-not"><div class="etiket">Sürükle-bırak niye yok</div>
<p>Telefonda parmakla tutup kaydırmak sayfayı da kaydırır. Ok düğmeleri her
cihazda aynı çalışır ve yanlış bastığınızda geri alması yine bir tık.</p></div>
<div class="ek-not dikkat"><div class="etiket">İki başlık kaldırılamaz</div>
<p><strong>Panel</strong> ve <strong>Menü düzeni</strong> menüden
düşürülemez. Menü düzenini menüden kaldırsaydınız bu ekrana bir daha
ulaşamaz, düzeni geri alamazdınız.</p></div>
<div class="ek-not"><div class="etiket">Yeni ekran eklenirse</div>
<p>Sisteme yeni bir ekran geldiğinde menüde <strong>kendiliğinden görünür</strong>
ve bu sayfa size <em>"şu ekran eklendi, varsayılan yerine kondu"</em> der.
Sizin sıranız bozulmaz; yeni gelen listenin sonuna eklenir, istediğiniz yere
taşırsınız.</p></div>
<p><strong>Varsayılana dön</strong> düğmesi kendi sıranızı silip sistemin
düzenine geri döner. Onay sorar.</p>
${sikHata([
  {
    hata: "Sırayı değiştirip kaydetmeden sayfadan çıkmak",
    cozum: "Değişiklik kaybolur. Ekran altta “Kaydedilmemiş değişiklik var” diye yazar; kaydet düğmesi ancak değişiklik varken açılır.",
  },
  {
    hata: "Bir grubun bütün başlıklarını taşıyıp grubu boş bırakmak",
    cozum: "Sorun değil: boş grup menüde görünmez. İçine bir başlık taşıdığınız an geri gelir.",
  },
])}
</section>

<section id="toplu">
${baslik("toplu")}
<h3>İçe aktarma</h3>
<ol class="adimlar">
<li><div><h3>Şablonu indirin</h3><p>Şablon her indirdiğinizde <strong>sizin güncel verinizle</strong> üretilir: "Listeler" sayfasında geçerli kategori, raf ve kanal hesabı adları yazar.</p></div></li>
<li><div><h3>Kipi seçin</h3><p><strong>Yalnız yeni ekle</strong> — var olan SKU dosyada geçerse dosya reddedilir.<br><strong>Var olanları güncelle</strong> — haftalık komisyon güncellemesi için budur.</p></div></li>
<li><div><h3>Denetleyin, sonra yazın</h3><p><strong>Dosyayı denetle</strong> hiçbir şey yazmaz. Hata varsa satır satır listelenir; hata yoksa özet çıkar ve ancak ondan sonra yazma düğmesi belirir.</p></div></li>
</ol>
<div class="ek-not"><div class="etiket">Kural</div>
<p><strong>Ya hepsi ya hiçi.</strong> 400 satırın 399'u kusursuz olsa bile, bir
satır hatalıysa hiçbir şey yazılmaz. Yarım aktarılmış bir stok, hiç aktarılmamış
stoktan daha kötüdür.</p></div>
<ul>
<li>Şablondaki gri italik <strong>örnek satırları silin</strong>.</li>
<li>Kategori veya raf sistemde yoksa dosya reddedilir; benzer bir ad varsa önerilir.</li>
<li>Açılış stoğunda <strong>aynı SKU birden çok satırda</strong> olabilir; her satır ayrı parti olur.</li>
<li><strong>Kanal SKU sayfasını tek başına</strong> yükleyebilirsiniz.</li>
</ul>
<h3>Dışa aktarma</h3>
<ul>
<li>Ürünler, Alımlar, Satışlar, Stok ve Giderler ekranlarında <strong>Excel indir</strong> düğmesi <strong>ekrandaki filtreyi uygular</strong>.</li>
<li><strong>Ayarlar → Dışa Aktarma</strong> altında tüm veri tek dosyada iner.</li>
</ul>
</section>

<section id="gecmisEkstre">
${baslik("gecmisEkstre")}
<p><strong>Ayarlar → Geçmiş ekstreler.</strong> Sistemi kullanmaya
başlamadan ÖNCEKİ döneme ait kredi kartı ekstrelerini yükler. Böylece eski
borçlar da kart borcu ekranında görünür.</p>
${neZaman(
  "Yalnız kuruluşta, bir kez. Sistem kullanılmaya başlandıktan sonraki alımlar zaten kendiliğinden doğru ekstreye düşer.",
)}
<div class="ek-not"><div class="etiket">Neden ayrı bir ekran</div>
<p>Normal alımlar ekstreye <strong>kesim gününe göre</strong> kendiliğinden
dağılır. Ama sistemden önceki borçların alım kaydı yoktur; onlar dışarıdan,
toplu olarak girilmek zorundadır. İki yol karışsaydı aynı borç iki kez
sayılabilirdi.</p></div>
</section>

<section id="tarife">
${baslik("tarife")}
<p><strong>Ayarlar → Komisyon tarifesi.</strong> Pazaryerinin yayımladığı
tam dilimli komisyon dosyasını yükler. Fiyat denemesi bu dilimleri kullanır:
"bu ürünü 1.750'ye satarsam komisyon kaç olur" sorusunun cevabı buradan gelir.</p>
${neZaman(
  "Her hafta. Trendyol Salı, Hepsiburada Çarşamba yayımlıyor. Panelde “Komisyon tarifesi” kutusu turuncuya döndüğünde.",
)}
<div class="ek-not dikkat"><div class="etiket">Kaçırılan hafta geri gelmez</div>
<p>Bu dosya <strong>arşivden inmiyor</strong>. O hafta indirilmezse bir daha
elde edilemez ve o döneme ait satışlarda fiyat denemesi hüküm veremez —
susar, yanlış rakam vermez.</p></div>
<div class="ek-not"><div class="etiket">Yüklemeden önce ne yazılacağını görürsünüz</div>
<p>Önce <strong>Göster</strong> düğmesi dosyayı okur ve ne yazılacağını sayar:
okunan satır, yazılacak kalem, eşleşen ürün ve <strong>bağsız ürün</strong>.
Bağsız, dosyada geçen ama sizde kaydı olmayan barkod demektir; o ürünler için
tarife yazılmaz. Rakamlar beklediğiniz gibiyse <strong>Yükle</strong>.</p></div>
<div class="ek-not"><div class="etiket">Aynı haftayı ikinci kez yüklersem</div>
<p>Üzerine yazılır — eski kalemler silinir, dosyadaki hâli geçerli olur.
Ekran bunu yüklemeden önce söyler. İlk yükleme eksik geldiyse düzeltmenin
yolu budur.</p></div>

<h3>Kapsam boşluğu — kaçırdığınız haftalar</h3>
<p>Yüklü pencerelerin listesinin üstünde tek satırlık bir <strong>hüküm</strong>
durur: kapsam kesintisiz mi, yoksa arada boşluk var mı. Boşluk varsa listenin
<strong>içinde</strong>, tam ilgili iki pencerenin arasında kırmızı bir satır
çıkar ve şunu yazar: hangi kanal · hangi saatten hangi saate · kaç saat ·
kaç tam gün · <strong>o aralıkta kaç satış olduğu</strong>.</p>
<div class="ek-not dikkat"><div class="etiket">Bu satır bir görev DEĞİL</div>
<p>Boşluk <strong>kapatılamaz</strong> — dosya arşivden inmiyor. Satırın işi
sizi indirmeye göndermek değil, o dönemin satışlarında fiyat denemesinin
<strong>niye sustuğunu</strong> söylemek. Kapanmayacağı için panelde de
görünmez: kapanamayan bir uyarı görev kutusunda sonsuza kadar yanar ve
diğer uyarılara olan güveni götürür.</p></div>
<p><strong>Saatler önemlidir.</strong> Pencere <em>08:00</em>'de başlar,
<em>07:59</em>'da biter. Yalnız tarihe bakılırsa <code>18 → 21</code> arası
bitişik görünür; aradaki <strong>72 saat</strong> ancak saatle görülür.
Bu yüzden boşluk satırı tarihi saatiyle birlikte yazar.</p>
${sikHata([
  {
    hata: "Kırmızı boşluk satırını görüp o haftanın dosyasını indirmeye çalışmak",
    cozum: "İnmez. Tam dilimli ileri tarife yalnız yayımlandığı hafta indirilebilir; satır geçmişin kaydıdır, yapılacak iş değil.",
  },
  {
    hata: "Yalnız tarihlere bakıp “aralık yok” sanmak",
    cozum: "Pencere 07:59'da bitip 08:00'de başlar. 18 ile 21 bitişik GÖRÜNÜR ama arada 72 saat vardır; saati okuyun.",
  },
])}
</section>

<section id="yedek">
${baslik("yedek")}
<div class="ek-tablo"><table>
<thead><tr><th>Ne</th><th>Kim için</th><th>Ne zaman</th></tr></thead>
<tbody>
<tr><td>Tüm veri (Excel)</td><td>Siz, muhasebeciniz</td><td>İstediğiniz zaman</td></tr>
<tr><td>Yedek (JSON)</td><td>Geri yükleme</td><td>Büyük bir değişiklikten önce</td></tr>
<tr><td>Otomatik yedek</td><td>Sistem</td><td>Her gece, 30 gün saklanır</td></tr>
</tbody></table></div>
<p>Otomatik yedekler <strong>Ayarlar → Dışa Aktarma</strong> sayfasında tarih ve
boyutlarıyla listelenir. Listede yedek görmüyorsanız bir sorun var demektir.</p>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Yedek dosyasında satış, maliyet ve kâr bilgileriniz <strong>açık metin</strong>
durur. İndirdiğiniz dosyayı güvenli bir yerde saklayın.</p></div>
</section>

<section id="sorun">

${baslik("sorun")}
<h3>Yedekten geri dönme</h3>
<p><strong>Ayarlar → Geri yükleme.</strong> Bu ekran felaket icindir: veriler bozulduysa
ya da yanlislikla silindiyse, bir yedekteki hale dondurur.</p>
<ol class="adimlar">
<li><div><h3>Yedegi secin</h3><p>Gece yedekleri listede durur; disaridan indirdiginiz bir dosyayi da yukleyebilirsiniz.</p></div></li>
<li><div><h3>Denetleyin</h3><p><strong>Denetle</strong> hicbir sey yazmaz. Tablo tablo <strong>kac satir silinecek, kac satir gelecek</strong> yazar. Yedekte olmayan tablo bosalacaksa ayrica uyarir.</p></div></li>
<li><div><h3>Onaylayin</h3><p>Kutuya <strong>GERI YUKLE</strong> yazmadan dugme calismaz. Onaylayinca sistem <strong>once mevcut verinizin guvenlik yedegini alir</strong>; yedek alinamazsa islem hic baslamaz.</p></div></li>
</ol>
<div class="ek-not"><div class="etiket">Yanlis dosyayi yuklediyseniz</div>
<p>Islem bittiginde ekranda <strong>guvenlik yedeginiz</strong> duruyor: geri yuklemeden hemen onceki haliniz. O dosyayi secip tekrar geri yukleyerek donebilirsiniz. Yani bu ekranin kendisi de geri alinabilir.</p></div>
<div class="ek-not dikkat"><div class="etiket">Kismi geri yukleme yoktur</div>
<p>"Sadece urunleri geri yukle" diye bir secenek YOK. Yarisi eski yarisi yeni bir veritabani, hic geri yuklememekten tehlikelidir: stok defteri ile satislar birbirini tutmaz.</p></div>

<p>Sistem sessiz kalmaz: bir şey olmadıysa <strong>neden olmadığı</strong> ekranda
yazar. Aşağıda en sık görülenler.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Ekranda gördüğünüz</th><th>Anlamı ve çözümü</th></tr></thead>
<tbody>
<tr><td><strong>kural eksik</strong></td><td>Komisyon oranı ya da kargo tarifesi bulunamadı. <strong>Kanal SKU</strong> ekranından oranı girin; mevcut satış için <strong>Yeniden hesapla</strong>.</td></tr>
<tr><td><strong>maliyet yok</strong></td><td>Satılan mal, birim maliyeti girilmemiş bir partiden düştü. Sonradan düzeltmek şu an mümkün değil.</td></tr>
<tr><td><strong>para birimi</strong></td><td>Maliyet ile satış farklı para biriminde. Kur çevrilmez.</td></tr>
<tr><td><strong>Stokta yeterli ürün yok</strong></td><td>Satmaya çalıştığınız adet elinizdekinden fazla. Mal kabul yapmayı unutmuş olabilirsiniz.</td></tr>
<tr><td><strong>Bu sipariş numarası zaten var</strong></td><td>Aynı siparişi ikinci kez giriyorsunuz.</td></tr>
<tr><td><strong>satır 12: "X" bulunamadı</strong></td><td>Dosyadaki kategori/raf sistemde tanımlı değil. Şablonun "Listeler" sayfasındaki adları kullanın.</td></tr>
</tbody></table></div>
<div class="ek-not kritik"><div class="etiket">Yapmayın</div>
<p>Bir stok hareketini "düzeltmek" için silmeye çalışmayın — zaten silinemez.
Yanlış bir sayım varsa düzeltme hareketi girilir, geçmiş olduğu gibi kalır.</p></div>
</section>

<section id="sozluk">
${baslik("sozluk")}
<div class="ek-tablo"><table>
<thead><tr><th>Terim</th><th>Anlamı</th></tr></thead>
<tbody>
<tr><td><strong>Varyant</strong></td><td>Ürünün stok tutulan hâli. Tişörtün M bedeni bir varyanttır.</td></tr>
<tr><td><strong>Parti</strong></td><td>Tek seferde giren, kendi maliyetini taşıyan stok.</td></tr>
<tr><td><strong>FIFO</strong></td><td>"İlk giren ilk çıkar." Satışta en eski parti önce tükenir.</td></tr>
<tr><td><strong>Stok hareketi</strong></td><td>Stoğu değiştiren her kayıt: alım girişi, satış çıkışı, iade girişi, düzeltme.</td></tr>
<tr><td><strong>Raf</strong></td><td>Depodaki konum. Sistemde kod olarak tutulur.</td></tr>
<tr><td><strong>Kanal</strong></td><td>Pazaryeri. Trendyol, Hepsiburada, Amazon…</td></tr>
<tr><td><strong>Kanal hesabı</strong></td><td>O pazaryerindeki mağazanız.</td></tr>
<tr><td><strong>Stopaj</strong></td><td>KDV hariç tutarın %1'i olarak kesilen vergi.</td></tr>
<tr><td><strong>NET-1</strong></td><td>Stopaj düşülmüş kâr.</td></tr>
<tr><td><strong>NET-2</strong></td><td>NET-1'den ödenecek KDV de düşülmüş kâr. Cebinizde kalan.</td></tr>
<tr><td><strong>GERÇEK NET</strong></td><td>Σ NET-2 − dönem giderleri. Ayın gerçek sonucu.</td></tr>
<tr><td><strong>Snapshot</strong></td><td>Bir rakamın o anki hâliyle kayda yazılması.</td></tr>
</tbody></table></div>
</section>

<section id="yolda">
${baslik("yolda")}
<p>Bunları sistemde <strong>aramayın</strong> — henüz yapılmadı.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Özellik</th><th>Durum</th></tr></thead>
<tbody>
<tr><td>Hakediş takibi — "sattım, parayı ne zaman aldım?"</td><td><span class="pul yok">yapım aşamasında</span></td></tr>
<tr><td>Kredi kartı borç ve limit ekranı</td><td><span class="pul yok">hesap hazır, ekran yok</span></td></tr>
<tr><td>Tedarikçiden tazminat takibi</td><td><span class="pul yok">planlı</span></td></tr>
<tr><td>Alım kaydını sonradan düzenleme</td><td><span class="pul yok">planlı</span></td></tr>
<tr><td>Yedekten ekrandan geri yükleme</td><td><span class="pul yok">elle yapılıyor</span></td></tr>
<tr><td>Birden çok kullanıcı ve yetki ayrımı</td><td><span class="pul yok">sonraki aşama</span></td></tr>
<tr><td>Pazaryeri bağlantıları (otomatik sipariş çekme)</td><td><span class="pul yok">sonraki aşama</span></td></tr>
</tbody></table></div>
</section>

</main>
</div>

<footer class="ek-dip"><div class="ek-dip-ic">
<div><strong style="color:var(--murekkep)">Selliora Kullanıcı El Kitabı</strong> · ${kacir(uretimTarihi)}</div>
<div>Bu belge sistemden ÜRETİLDİ. Kategori, raf, kanal hesabı ve kesinti listeleri
o anki veritabanınızdan okunur — elle güncellenmez, sapmaz.</div>
</div></footer>
</div>`;
}
