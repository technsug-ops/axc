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
  { kimlik: "urun", ad: "Ürünler ve stok" },
  { kimlik: "kanalSku", ad: "Kanal SKU — ne işe yarar" },
  { kimlik: "alim", ad: "Alım ve mal kabul" },
  { kimlik: "satis", ad: "Satış" },
  { kimlik: "iade", ad: "İade" },
  { kimlik: "gider", ad: "Giderler" },
  { kimlik: "rapor", ad: "Dönem raporu" },
  { kimlik: "toplu", ad: "Toplu veri aktarımı" },
  { kimlik: "yedek", ad: "Yedek" },
  { kimlik: "sorun", ad: "Bir şey ters giderse" },
  { kimlik: "sozluk", ad: "Sözlük" },
  { kimlik: "yolda", ad: "Henüz yok, yolda" },
] as const;

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

export function elKitabiGovdesi(
  veri: ElKitabiVerisi,
  uretimTarihi: string,
): string {
  const s = veri.sayimlar;

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
    k.kapsam === "PER_SALE" ? "sipariş başına" : "kalem başına",
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
    <span>${kacir(uretimTarihi)} tarihli sistemden üretildi</span>
    <span>${s.kullanici} kullanıcı · ${s.urun} ürün · ${s.satis} satış</span>
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

<div class="ek-not canli"><div class="etiket">Sizin sisteminizde şu an</div>
<p>${veri.raflar.length} raf · ${veri.kdvKategorileri.length} KDV kategorisi ·
${veri.kanalHesaplari.length} kanal hesabı · ${s.varyant} varyant ·
${s.kanalSku} kanal eşlemesi${s.kanalSkuOransiz > 0 ? ` (<strong>${s.kanalSkuOransiz} tanesinde komisyon oranı yok</strong>)` : ""}.</p></div>

<h3>Tanımlı raflarınız</h3>
${canliTablo(
  ["Kod", "Ad"],
  veri.raflar.map((r) => [`<span class="kod">${kacir(r.kod)}</span>`, kacir(r.ad ?? "—")]),
  "Henüz raf tanımlamamışsınız. Ayarlar → Raf Konumları ekranından başlayın.",
)}

<h3>KDV kategorileriniz</h3>
${canliTablo(
  ["Kategori", "KDV oranı"],
  veri.kdvKategorileri.map((k) => [kacir(k.ad), `<span class="sayi">%${k.oran}</span>`]),
  "Henüz KDV kategorisi yok.",
)}

<h3>Kanal hesaplarınız</h3>
${canliTablo(
  ["Hesap", "Para birimi"],
  veri.kanalHesaplari.map((h) => [kacir(h.etiket), kacir(h.paraBirimi)]),
  "Henüz kanal hesabı tanımlamamışsınız. Satış girebilmek için en az bir tane gerekir.",
)}
</section>

<section id="urun">
${baslik("urun")}
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
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Satış anında geçerli oran <strong>satış kaydının içine kopyalanır</strong>.
Yani bugün oranı değiştirmeniz, geçen ayki satışların kârını değiştirmez.
Kâr rakamı bir kere hesaplanır ve o günün gerçeğiyle donar; yoksa kapanmış bir
ayın kârı her hafta oynardı.</p></div>

<h3>Ne zaman girilir</h3>
<ul>
<li><strong>Ürünü ilk satışa çıkarmadan önce.</strong> Alım yapmak için gerekmez, satış için gerekir.</li>
<li>Sadece <strong>gerçekten sattığınız</strong> pazaryerleri için girin. Satmadığınız kanal için eşleme açmak boş iş.</li>
<li><strong>Kanal SKU</strong> ekranından tek tek, ya da <strong>Ayarlar → Veri Aktarımı</strong> ile topluca (bu sayfa tek başına da yüklenebilir).</li>
</ul>

<div class="ek-not canli"><div class="etiket">Sizin sisteminizde şu an</div>
<p>${s.kanalSku} kanal eşlemesi tanımlı${
  s.kanalSkuOransiz > 0
    ? `, <strong>${s.kanalSkuOransiz} tanesinde komisyon oranı girilmemiş</strong>`
    : ""
}. ${
  veri.eslenmemisVaryant > 0
    ? `<strong>${veri.eslenmemisVaryant} varyantın hiçbir kanal eşlemesi yok</strong> — bunlar satılırsa kârları hesaplanamaz.`
    : "Tüm varyantlarınızın en az bir kanal eşlemesi var."
}</p></div>

${
  veri.kanalSkuOzeti.length > 0
    ? `<h3>Mağaza başına eşlemeleriniz</h3>
${canliTablo(
  ["Kanal hesabı", "Eşleme", "Oranı girilmemiş"],
  veri.kanalSkuOzeti.map((o) => [
    kacir(o.hesap),
    `<span class="sayi">${o.adet}</span>`,
    o.oransiz > 0
      ? `<strong class="sayi">${o.oransiz}</strong>`
      : `<span class="sayi">0</span>`,
  ]),
  "",
)}`
    : ""
}
</section>

<section id="alim">
${baslik("alim")}
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
</section>

<section id="satis">
${baslik("satis")}
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

<h3>Kargo firmalarınız</h3>
<p>${veri.kargoFirmalari.length > 0 ? veri.kargoFirmalari.map(kacir).join(" · ") : "Tanımlı kargo firması yok."}</p>
</section>

<section id="iade">
${baslik("iade")}
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
</section>

<section id="gider">
${baslik("gider")}
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

<h3>Gider kategorileriniz</h3>
${canliTablo(
  ["Kategori", "Tür", "Varsayılan KDV"],
  veri.giderKategorileri.map((g) => [
    kacir(g.ad),
    g.sabitMi ? "Sabit" : "Değişken",
    `<span class="sayi">%${g.kdv}</span>`,
  ]),
  "Gider kategorisi tanımlı değil.",
)}

<h3>Her ay tekrar eden giderler</h3>
<p><strong>Giderler → Tekrarlayan giderler.</strong> Kirayı bir kez şablon olarak
tanımlarsınız, her ay tek dokunuşla eklersiniz. Sistem
<strong>kendiliğinden kayıt üretmez</strong>. Aynı şablondan o ay zaten gider
girilmişse düğme pasifleşir — kirayı ikinci kez girmiş olmazsınız.</p>
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
