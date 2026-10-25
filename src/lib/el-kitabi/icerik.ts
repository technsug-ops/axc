import type { ElKitabiVerisi } from "./veri";
import { UYGULAMA } from "@/lib/uygulama";
import { EKRANLAR, ekranAdresi } from "./ekranlar";

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
  { kimlik: "satis", ad: "Satış" },
  { kimlik: "iade", ad: "İade" },
  { kimlik: "okuma", ad: "Barkod okut — sistem ne biliyor" },
  { kimlik: "paketleme", ad: "Yönlendirmeli paketleme" },
  { kimlik: "yerlestirme", ad: "Yerleştir — ürünü rafa koy" },
  { kimlik: "malKabul", ad: "Mal kabul — günün girişleri" },
  { kimlik: "alim", ad: "Alım ve mal kabul" },
  { kimlik: "stok", ad: "Stok — elimde ne var" },
  { kimlik: "urun", ad: "Ürünler ve stok" },
  { kimlik: "kanalSku", ad: "Kanal SKU — ne işe yarar" },
  { kimlik: "kanalListeleme", ad: "Kanal listeleme durumu — ürünüm satışta mı" },
  { kimlik: "kanalGonderim", ad: "Kanala stok ve fiyat göndermek" },
  { kimlik: "komisyon", ad: "Komisyon oranı ve tarife" },
  { kimlik: "kanalHesabi", ad: "Ürün ve kanal — Kanal Hesapları" },
  { kimlik: "deneme", ad: "Hesaplama motoru — nerede satmalı" },
  { kimlik: "kart", ad: "Kârlılık kartı" },
  { kimlik: "urunAnalizi", ad: "Ürün analizi" },
  { kimlik: "gunlukOzet", ad: "Günlük özet" },
  { kimlik: "hedef", ad: "Ayarlar — Hedefler" },
  { kimlik: "gider", ad: "Giderler" },
  { kimlik: "kartBorcu", ad: "Kartlar ve kart borcu" },
  { kimlik: "finansman", ad: "Finansman — sermaye, borç ve kredi" },
  { kimlik: "ortaklik", ad: "İş Ortakları — proje, ortak ve katılım" },
  { kimlik: "hakedis", ad: "Hakediş — param ne zaman yatar" },
  { kimlik: "tazminat", ad: "Tazminat" },
  { kimlik: "nakit", ad: "Nakit takvimi" },
  { kimlik: "rapor", ad: "Dönem raporu" },
  { kimlik: "envanter", ad: "Envanter değeri" },
  { kimlik: "donemler", ad: "Ayarlar — Muhasebe dönemleri" },
  { kimlik: "maliyetYontemi", ad: "Ayarlar — Maliyet yöntemi" },
  { kimlik: "depo", ad: "Tanımlar — Depo kurulumu" },
  { kimlik: "raf", ad: "Tanımlar — Raf Konumları" },
  { kimlik: "kategori", ad: "Tanımlar — KDV Kategorileri" },
  { kimlik: "duzeltme", ad: "Tanımlar — Düzeltme nedenleri" },
  { kimlik: "tedarikci", ad: "Tanımlar — Tedarikçiler" },
  { kimlik: "marka", ad: "Tanımlar — Markalar" },
  { kimlik: "toplu", ad: "Toplu veri aktarımı" },
  { kimlik: "gecmisEkstre", ad: "Veri — Geçmiş ekstreler" },
  { kimlik: "komisyonKapisi", ad: "Veri — Komisyon yükleme" },
  { kimlik: "kargoTarifesi", ad: "Veri — Kargo tarifesi" },
  { kimlik: "yedek", ad: "Yedek" },
  { kimlik: "geceTuru", ad: "Veri — Gece bekçi turu" },
  { kimlik: "kullanici", ad: "Ayarlar — Kullanıcılar" },
  { kimlik: "rol", ad: "Ayarlar — Roller" },
  { kimlik: "menu", ad: "Ayarlar — Menü düzeni" },
  { kimlik: "kullanim", ad: "Ayarlar — Kullanım" },
  { kimlik: "bildirim", ad: "Ayarlar — Bildirimler" },
  { kimlik: "ozellikler", ad: "Ayarlar — Özellikler" },
  { kimlik: "talep", ad: "Destek talepleri" },
  { kimlik: "sorun", ad: "Bir şey ters giderse" },
  { kimlik: "sozluk", ad: "Sözlük" },
  { kimlik: "yolda", ad: "Henüz yok, yolda" },
] as const;

/** İÇİNDEKİLER GRUPLARI (kullanıcı 21.10.2026: «57 içerik, aşağı doğru gitmekte zorlanıyor»). Sıra = BOLUMLER sırası; el-kitabi:dogrula ikisinin aynı olduğunu sınar. */
export const GRUPLAR: readonly { ad: string; kimlikler: readonly string[] }[] = [
  { ad: "Başlarken", kimlikler: ["dusunce", "giris", "kurulum", "telefon", "panel"] },
  { ad: "Günlük operasyon", kimlikler: ["satis", "iade", "okuma", "paketleme", "yerlestirme", "malKabul", "alim", "stok"] },
  { ad: "Ürün ve kanal", kimlikler: ["urun", "kanalSku", "kanalListeleme", "kanalGonderim", "komisyon", "kanalHesabi"] },
  { ad: "Fiyat ve analiz", kimlikler: ["deneme", "kart", "urunAnalizi", "gunlukOzet", "hedef"] },
  { ad: "Para", kimlikler: ["gider", "kartBorcu", "finansman", "ortaklik", "hakedis", "tazminat", "nakit"] },
  { ad: "Raporlar ve dönem", kimlikler: ["rapor", "envanter", "donemler", "maliyetYontemi"] },
  { ad: "Tanımlar", kimlikler: ["depo", "raf", "kategori", "duzeltme", "tedarikci", "marka"] },
  { ad: "Veri", kimlikler: ["toplu", "gecmisEkstre", "komisyonKapisi", "kargoTarifesi", "yedek", "geceTuru"] },
  { ad: "Ayarlar", kimlikler: ["kullanici", "rol", "menu", "kullanim", "bildirim", "ozellikler", "talep"] },
  { ad: "Yardım", kimlikler: ["sorun", "sozluk", "yolda"] },
];


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
  /**
   * 03.10.2026: dört ekranın bölümü yazıldı — eskiden `null`dı ("olmayan bir
   * bölüme link verilmez"; bölüm yazıldığı gün doldurulur kuralı).
   */
  donemler: "donemler",
  malKabul: "malKabul",
  maliyetYontemi: "maliyetYontemi",
  gunlukOzet: "gunlukOzet",
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
  kanalListeleme: "kanalListeleme",
  giderler: "gider",
  rapor: "rapor",
  urunAnalizi: "urunAnalizi",
  /** K363 — Ürün analizinin rakamlarından kurulur; anlatımı o bölümün «Alım rehberi» başlığında. */
  alimRehberi: "urunAnalizi",
  buybox: "urunAnalizi",
  /** K363 Faz 2-b — özel gün takvimi; anlatımı Alım rehberi başlığında («Özel günler» sekmesiyle birlikte). */
  ozelGunler: "urunAnalizi",
  /** İki menü öğesi, tek bölüm: kart tanımı ile kart borcu aynı konudur. */
  kartlar: "kartBorcu",
  kartBorcu: "kartBorcu",
  finansman: "finansman",
  ortaklik: "ortaklik",
  ozellikler: "ozellikler",
  tazminat: "tazminat",
  hakedis: "hakedis",
  nakitTakvimi: "nakit",
  depoKurulumu: "depo",
  rafKonumlari: "raf",
  kategoriler: "kategori",
  duzeltmeNedenleri: "duzeltme",
  kanalHesaplari: "kanalHesabi",
  tedarikciler: "tedarikci",
  markalar: "marka",
  geceTuru: "geceTuru",
  veriAktarimi: "toplu",
  /** Yedek alma ve geri yükleme tek bölümde anlatılıyor. */
  geriYukleme: "yedek",
  veriDisari: "yedek",
  kullanicilar: "kullanici",
  roller: "rol",
  menuDuzeni: "menu",
  kullanimIzi: "kullanim",
  bildirimler: "bildirim",
  hedefler: "hedef",
  talepler: "talep",
  gecmisEkstre: "gecmisEkstre",
  komisyonKapisi: "komisyonKapisi",
  /** K234 — tarife hesaplama; anlatımı komisyon bölümünde ("her satırın yanında"). */
  tarifeHesaplama: "komisyonKapisi",
  kargoTarifesi: "kargoTarifesi",
  /** Kitabın KENDİSİ — kendi kendini anlatan bölüm açmak tekrar olurdu. */
  elKitabi: null,
};

const iki = (n: number) => String(n).padStart(2, "0");

/** Bölümün kitap sırasındaki numarası (01…) — grup kutularında da aynı numara yazar. */
function numara(kimlik: string): string {
  return iki(BOLUMLER.findIndex((b) => b.kimlik === kimlik) + 1);
}
function bolumAdi(kimlik: string): string {
  return BOLUMLER.find((b) => b.kimlik === kimlik)?.ad ?? kimlik;
}
function baglantilar(kimlikler: readonly string[]): string {
  return kimlikler
    .map((k) => `<li><a href="#${k}"><b>${numara(k)}</b><span>${bolumAdi(k)}</span></a></li>`)
    .join("");
}

/**
 * Yan menü (geniş ekran): GRUPLU ve katlanır. 57 satırlık düz liste kaydırılamıyordu
 * (kullanıcı 21.10.2026); her grup bir `<details>` — betik gerektirmez, indirilen tek
 * dosyada da çalışır.
 */
function icindekiler(): string {
  const gruplar = GRUPLAR.map(
    (g) =>
      `<details><summary>${g.ad}<i>${g.kimlikler.length}</i></summary><ol>${baglantilar(g.kimlikler)}</ol></details>`,
  ).join("");
  return `<nav class="ek-toc" aria-label="İçindekiler"><h2><a href="#icindekiler">İçindekiler</a></h2>${gruplar}</nav>`;
}

/**
 * Konu haritası: içeriğin BAŞINDA, her ekran genişliğinde görünür (yan menü telefonda
 * gizli). Her bölüm başlığındaki «↑ İçindekiler» buraya döner.
 */
function konuHaritasi(): string {
  const kutular = GRUPLAR.map(
    (g) => `<div class="ek-grup"><h3>${g.ad}</h3><ol>${baglantilar(g.kimlikler)}</ol></div>`,
  ).join("");
  return `<nav id="icindekiler" class="ek-harita" aria-label="Konu haritası"><h2 class="bolum">İçindekiler</h2><div class="ek-harita-izgara">${kutular}</div></nav>`;
}

/**
 * Bölümün ekran görüntüleri (K350-③, kullanıcı 21.10.2026: «el kitabına ekran görüntüleriyle
 * destek sağla»). Başlığın hemen altına konur; ÖRNEK veriden çekildikleri altyazıda yazar —
 * okuyan, rakamları kendi defteri sanmasın. İndirilen tek dosyada `uret.ts` bunları gömer.
 */
function ekranGorselleri(kimlik: string): string {
  return EKRANLAR.filter((e) => e.bolum === kimlik)
    .map(
      (e) =>
        `<figure class="ek-ekran${e.boyut === "TELEFON" ? " telefon" : ""}"><img src="${ekranAdresi(e.ad)}" alt="${kacir(e.aciklama)}" loading="lazy"><figcaption>${kacir(e.aciklama)} <span>Örnek veriyle çekildi.</span></figcaption></figure>`,
    )
    .join("");
}

function baslik(kimlik: string): string {
  const sira = BOLUMLER.findIndex((b) => b.kimlik === kimlik);
  const b = BOLUMLER[sira];
  const grup = GRUPLAR.find((g) => g.kimlikler[0] === kimlik);
  const grupBasi = grup ? `<div class="ek-grup-basi">${grup.ad}</div>` : "";
  return `${grupBasi}<h2 class="bolum"><b>${iki(sira + 1)}</b>${b.ad}<a class="ek-yukari" href="#icindekiler">↑ İçindekiler</a></h2>${ekranGorselleri(kimlik)}`;
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
  </div>
  <h1>${UYGULAMA.ad}</h1>
  <p>Çok kanallı e-ticaret operasyonunuzun tek defteri: ne aldınız, ne sattınız,
  ne kadar kaldı. Bu kitap sıfırdan başlayan birinin sistemi yardımsız
  kullanabilmesi için yazıldı.</p>
</div></header>

<div class="ek-duzen">
${icindekiler()}
<main class="ek-icerik">
${konuHaritasi()}

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
<p>${UYGULAMA.ad}'yı kullanmak, birkaç temel kararı anlamakla kolaylaşıyor. Bu bölüm
ekran anlatmıyor — sistemin kafasını anlatıyor. Bir ekranda "bu neden böyle"
diye takıldığında cevap çoğu zaman buradadır.</p>

<h3>Dört ayrı kod vardır ve karıştırılmaz</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Kod</th><th>Kimin</th><th>Ne işe yarar</th></tr></thead>
<tbody>
<tr><td class="kod">SKU</td><td>Sizin</td><td>Sistem içi ana kod. Stok bunun üstünden döner.</td></tr>
<tr><td class="kod">Firma SKU</td><td>Sizin</td><td>Ürünün üstüne yapıştırdığınız fiziksel etiket. Yeni biçimi <strong>KATEGORİ-MARKA-SIRA</strong>dır (örn. OYU-LEG-0001); eski etiket kodları okutulunca yine bulunur.</td></tr>
<tr><td class="kod">Barkod (EAN)</td><td>Üreticinin</td><td>Kutunun üstünde basılı gelen kod.</td></tr>
<tr><td class="kod">Kanal SKU</td><td>Pazaryerinin</td><td>Ürünün bir pazaryeri mağazasındaki stok kodu. <strong>Komisyon oranını da bu taşır</strong> — <a href="#kanalSku">ayrıntı</a>.</td></tr>
</tbody></table></div>
<p>Dördü de arama kutularında ve barkod okutmada aranır: hangisini okutursanız
okutun sistem ürünü bulur. Bir kod <strong>iki ayrı ürüne</strong> uyuyorsa
sistem tahmin etmez, "birden fazla ürüne uyuyor" der ve hiçbirini açmaz.</p>

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
hesaplanır — ortalama alınmaz. Partilerin maliyeti farklıysa formda bir
<strong>parti seçici</strong> çıkabilir; isterseniz başka bir partiyi seçersiniz.
Seçiciyi kimin kullanacağı (sistem mi, siz mi) <strong>Ayarlar → Maliyet
yöntemi</strong>'nden ayarlanır.</p>

<h3>İki kâr rakamı vardır</h3>
<div class="formul">NET-1 = satış − maliyet − komisyon − stopaj − kargo − sabit kesintiler
<b>NET-2 = NET-1 − ödenecek KDV</b></div>
<p><strong>NET-1</strong> stopaj düşülmüş kârdır. <strong>NET-2</strong> ise
devlete ödeyeceğiniz KDV de düşüldükten sonra cebinizde gerçekten kalan rakamdır.
Listelerde NET-2 gösterilir, çünkü sorulan soru odur.</p>

<h3>Genel gider ürün kârına karışmaz</h3>
<div class="formul"><b>GERÇEK NET</b> = Σ NET-2 (iadeler dahil) − dönem giderleri − fire/hasar/kayıp + tazminat geliri</div>
<p>Sayımda çıkan fazla ya da eksik <strong>kâr sayılmaz</strong>: çoğu zaman girilmemiş
bir alımın ya da hatalı bir kaydın düzeltmesidir. Raporda ayrı bir
<strong>veri düzeltmesi</strong> satırında görünür, GERÇEK NET'e girmez.</p>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Bir ürünü alıp almamaya karar verirken kirayı hesaba katarsanız, kararınızı
zaten ödediğiniz bir masraf bozar. Ürün kararı brüt kârla verilir; kira ay
sonunda topluca düşülür.</p></div>

<h3>Bilinmeyen değer uydurulmaz</h3>
<p>Komisyon oranı girilmemiş, maliyeti bilinmeyen ya da para birimleri farklı
bir satışın kârı <strong>sıfır sayılmaz ve tahmin edilmez</strong>: o satış
"hesaplanamadı" diye işaretlenir, nedeni yazılır ve NET-2 toplamına girmez.
Panelde ve listelerde kaç satışın bu durumda olduğu ayrıca yazar.</p>

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
${adimlar([
  {
    ad: "Adresi açın",
    ne: "Giriş ekranı çıkar: <strong>E-posta</strong> ve <strong>Parola</strong> kutuları.",
  },
  {
    ad: "Bilgilerinizi yazıp «Giriş yap»a basın",
    ne: "Bilgi hatalıysa ekranda <strong>«E-posta veya parola hatalı.»</strong> yazar. Sistem hangisinin yanlış olduğunu bilerek söylemez.",
  },
  {
    ad: "Gitmek istediğiniz yere düşersiniz",
    ne: "Bir adrese girmeye çalışıp giriş ekranına yönlendirildiyseniz, giriş yapınca <strong>o adrese</strong> gidersiniz; yoksa Panel açılır.",
  },
])}
<ul>
<li>Oturum <strong>30 gün</strong> açık kalır; bu sürede tekrar parola sorulmaz.</li>
<li>Bilgisayarda <strong>sol menünün en altında</strong> e-postanız görünür. Orası aynı zamanda çıkış düğmesidir; basınca <strong>«Çıkış yapılsın mı?»</strong> diye onay ister.</li>
<li>Pasife alınmış bir kullanıcı giriş yapamaz; ekranda yine «E-posta veya parola hatalı.» yazar.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Bu sistemde satış fiyatlarınız, maliyetleriniz, kâr marjlarınız ve
tedarikçileriniz duruyor. Parolanızı kimseyle paylaşmayın. Başka birine erişim
vermek için ona <strong>kendi kullanıcısını</strong> açın ve yalnız gereken
yetkileri olan bir rol verin (bkz. Ayarlar — Kullanıcılar ve Roller); örneğin
depocu stok girer ama kâr marjını görmez.</p></div>

<h3>Hatalı giriş kilidi</h3>
<p>Aynı e-postayla <strong>ya da</strong> aynı internet bağlantısından 15 dakika
içinde <strong>5 hatalı deneme</strong> yapılırsa giriş 15 dakika kapanır. Ekranda
<strong>«Çok fazla hatalı deneme…»</strong> yazar ve kaç dakika kaldığı söylenir.
Kilit sürerken doğru parola da kabul edilmez — süre dolana kadar bekleyin. Kilit
bağlantıya da bağlı olduğu için, aynı ev/iş ağındaki başka bir cihaz da o sürede
giremeyebilir.</p>

<h3>Parola değiştirmek</h3>
<p>Yeni kullanıcıyı açan ya da parolasını sıfırlayan yönetici, bir
<strong>başlangıç parolası</strong> belirler (en az 10 karakter) ve bunu size
iletir; sistem e-posta göndermez. Bu parolayla ilk girişinizde sistem sizi
kendiliğinden <strong>Parola değiştir</strong> ekranına götürür ve yeni parolanızı
belirlemeden başka ekran açılmaz:</p>
${adimlar([
  {
    ad: "Mevcut parola",
    ne: "Size verilen başlangıç parolasını yazın.",
  },
  {
    ad: "Yeni parola ve tekrarı",
    ne: "İkisi aynı olmalı ve eskisiyle aynı olamaz. Uymazsa ekranda nedeni yazar.",
  },
  {
    ad: "«Parolayı değiştir»",
    ne: "Kaydedince <strong>bütün cihazlardaki oturumlarınız kapanır</strong>; yeni parolanızla tekrar giriş yaparsınız.",
  },
])}
<p>Parolanızı unuttuysanız ya da sıfırlatmak istiyorsanız yöneticiniz
<strong>Ayarlar → Kullanıcılar</strong> ekranındaki <strong>«Parola sıfırla»</strong>
ile yeni bir başlangıç parolası koyar. O anda sizin açık oturumlarınız da kapanır —
telefonunuzda açık kalmış bir oturum varsa o da düşer.</p>
${sikHata([
  {
    hata: "Kilitlenince arka arkaya denemeye devam etmek",
    cozum: "Kilit sürerken doğru parola da reddedilir; her deneme işinizi uzatmaz ama sonucu da değiştirmez. Ekranda yazan dakika dolana kadar bekleyin.",
  },
  {
    hata: "Parola değişince telefonda «oturum düştü» sanıp hata aramak",
    cozum: "Parola değişince bütün oturumların kapanması bilerek böyledir. Telefonda yeni parolayla bir kez giriş yapmanız yeterli.",
  },
])}
<p>Toplu indirmeler (Excel dökümleri, yedek) kimin ne zaman indirdiğiyle kayda
geçer; arama motorları sisteme kapalıdır.</p>
</section>

<section id="kurulum">
${baslik("kurulum")}
<p>Boş bir sistemde bu sırayı izleyin. Sıra önemli: her adım bir sonrakinin
malzemesini hazırlıyor. Menü adları sol menüdeki gruplarla birlikte yazıldı
(telefonda aynı gruplar alt çubuktaki <strong>Menü</strong> sekmesinde durur).</p>
<ol class="adimlar">
<li><div><h3>Depo düzeni ve raflar</h3><p><strong>Tanımlar → Depo kurulumu.</strong> Deponuzun bölümlerini tarif edin (örn. bölüm adı «Salon», kısaltması «SLN»); sistem raf kodlarını sizin için üretir ve siz onaylamadan hiçbir raf açılmaz. Tek tek raf eklemek, raf etiketi basmak ya da iki rafı birleştirmek için <strong>Tanımlar → Raf Konumları</strong>. Mal kabulde, yerleştirmede ve paketlemede bu kodları göreceksiniz.</p></div></li>
<li><div><h3>KDV kategorileri</h3><p><strong>Tanımlar → KDV Kategorileri.</strong> Ürünün KDV oranı buradan okunur — ürün ürün oran girmezsiniz. Kategorinin <strong>kodu</strong> da girilmelidir: yeni Firma SKU'nun ilk parçası bu koddan gelir.</p></div></li>
<li><div><h3>Markalar</h3><p><strong>Tanımlar → Markalar.</strong> Her markaya 3 harfli bir kod verilir; Firma SKU'nun ikinci parçası budur. Ayrıca pasif bir ürünü yeniden aktif etmek için ürünün markası bu tabloda kayıtlı olmalıdır.</p></div></li>
<li><div><h3>Kanal hesapları</h3><p><strong>Ürün ve kanal → Kanal Hesapları.</strong> Hangi pazaryerinde hangi mağazanız var. Aynı pazaryerinde birden fazla mağazanız olabilir. Mağazanın <strong>satış</strong> mı yoksa yalnız <strong>alış</strong> hesabı mı olduğu burada belirlenir — komisyon yalnız satış hesabında anlamlıdır.</p></div></li>
<li><div><h3>Kredi kartları</h3><p><strong>Para → Kartlar.</strong> Kart numarasının yalnızca <strong>son 4 hanesi</strong> saklanır — tam numara ve CVV hiçbir zaman istenmez.</p></div></li>
<li><div><h3>Ürünler ve açılış stoğu</h3><p>Az ürününüz varsa <strong>Ürünler → «Yeni Ürün»</strong> ile tek tek girin. Listeniz varsa <strong>Veri → Veri Aktarımı</strong> ile topluca yükleyin.</p></div></li>
<li><div><h3>Kanal SKU ve komisyon oranları</h3><p><strong>Ürün ve kanal → Kanal kodları.</strong> Sattığınız her mağaza için ürünün oradaki kodunu ve <strong>komisyon oranını</strong> girin; çok ürününüz varsa aynı ekrandaki <strong>«Komisyon oranı içe aktarma»</strong> düğmesiyle pazaryerinin kendi ürün listesinden topluca yükleyin. <strong>Bu adımı atlamayın</strong> — atlanırsa satış kaydedilir ama kârı hesaplanamaz. <a href="#kanalSku">Ne işe yaradığı</a>.</p></div></li>
</ol>

${sikHata([
  {
    hata: "Kategori ve marka kodlarını girmeden ürün açmaya başlamak",
    cozum: "Ürün formundaki «Öner» düğmesi Firma SKU'yu kategori ve marka kodundan üretir. Kodlar yoksa öneri çıkmaz ve ekranda neyin eksik olduğu yazar («Kategori kodunu gir», «Markalar ekranında ekleyin»). Önce 2. ve 3. adımı bitirin.",
  },
  {
    hata: "Komisyon oranını «sonra girerim» diye bırakmak",
    cozum: "Oransız satışların kârı hesaplanmaz ve panelde uyarı olarak birikir. Oranı sonradan girip satıştaki «Yeniden Hesapla» ile düzeltebilirsiniz, ama her satışa tek tek gitmek gerekir.",
  },
])}

<div class="ek-not"><div class="etiket">Kendi tanımlarını nerede görürsün</div>
<p>Bu kitap <strong>senin verilerini yazmaz</strong> — sistemin nasıl
çalıştığını anlatır. Kendi raflarını, kategorilerini, markalarını ve mağaza
hesaplarını her zaman kendi ekranlarında, <strong>güncel hâliyle</strong>
görürsün: <strong>Raf Konumları</strong> · <strong>KDV Kategorileri</strong> ·
<strong>Markalar</strong> · <strong>Kanal Hesapları</strong>. Kitaba kopyalansaydı
bir ay sonra bayatlardı; ekran bayatlamaz.</p></div>
</section>

<section id="telefon">
${baslik("telefon")}
<p>${UYGULAMA.ad}'yı telefonunuza <strong>uygulama gibi</strong> kurabilirsiniz. Kurulunca
ana ekranda kendi simgesiyle durur ve açıldığında tarayıcının adres çubuğu
görünmez — ekranın tamamı işinize kalır. Ayrı bir program indirmezsiniz;
kurulan şey sitenin kendisidir, yani her zaman güncel sürümdür.</p>

${neZaman(
  "Depoda telefonla çalışırken. Barkod okutmak, mal kabul yapmak, ürünü rafa yerleştirmek ve paket hazırlamak için birincil cihaz telefondur.",
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

<h3>Telefonda ekran nasıl görünür</h3>
${ekranSemasi("Panel", [
  { no: 1, ad: "Üst çubuk", aciklama: "Telefonda yalnız düğmeler durur: hedefler (ciroyu görme yetkiniz varsa), tema, El Kitabı kısayolu, sorun bildirme, yeni sipariş sesi ve uyarı çanı. Menü ve Panel alt çubuktadır.", genis: true },
  { no: 2, ad: "Sayfanın kendisi", aciklama: "Telefonda tablolar kart kart alt alta dizilir; her kartta kodlar ve eylem düğmeleri durur.", genis: true },
  { no: 3, ad: "Alt çubuk", aciklama: "Panel · Satışlar · Paketle · Alımlar · Menü — her ekranda sabit.", genis: true, vurgulu: true },
])}
${adimlar([
  {
    ad: "Üst çubuk",
    ne: "Menüye alt çubuktaki «Menü»den, panele «Panel»den ulaşılır; telefonda üst çubukta bu ikisi tekrar edilmez, yer düğmelere kalır. Kitap simgesi bu El Kitabı'nı açar — bir şeyi bilmediğiniz anda en kısa yol odur.",
  },
  {
    ad: "Sayfa",
    ne: "Bilgisayardaki tablolar telefonda kartlara dönüşür; bilgi kaybolmaz, yalnız dizilişi değişir.",
  },
  {
    ad: "Alt çubuk",
    ne: "En sık kullanılan dört ekran tek dokunuşta açılır. <strong>Menü</strong> sekmesi bütün ekranları büyük düğmeler hâlinde gruplar; en üstte ürün, SKU, barkod ya da sipariş no ile arama kutusu (kamera dahil) vardır. Bekleyen işi olan ekranın (Paketle, Mal kabul, İadeler, Kanal kodları) simgesinin üstünde kırmızı sayı yazar.",
  },
])}
<div class="ek-not"><div class="etiket">Panel telefonda daha hafif açılır</div>
<p>Panelin altındaki <strong>son 12 aylık grafik</strong> ve <strong>ürün analizi</strong>
telefonda yüklenmez — panel hızlı açılsın diye. Telefonda onların yerine
<strong>Hızlı işlemler</strong> düğmeleri durur: Barkod okut · Paketle · Mal kabul ·
Yerleştir. Ürün analizine telefondan menüdeki <strong>Ürün analizi</strong>
sayfasından ulaşırsınız; grafiği bilgisayardan ya da tabletten görürsünüz.</p></div>

<div class="ek-not"><div class="etiket">Şifre her seferinde sorulmaz</div>
<p>Kurulan uygulama oturumunuzu hatırlar; telefonu kendiniz kilitliyorsanız
ek bir şey yapmanız gerekmez. Telefonu kaybederseniz, yöneticiniz bilgisayardan
<strong>Ayarlar → Kullanıcılar</strong> ekranında parolanızı sıfırlasın —
o telefondaki oturum anında düşer.</p></div>

<h3>İnternet giderse ne olur</h3>
<p>${UYGULAMA.ad} <strong>çevrimdışı çalışmaz ve bu bilerek böyledir.</strong> Bağlantı
yoksa <strong>«Bağlantı yok»</strong> sayfası çıkar; rakam gösterilmez. Sayfadaki
<strong>«Yeniden dene»</strong> düğmesiyle bağlantı gelince devam edersiniz.</p>
<div class="ek-not dikkat"><div class="etiket">Neden rakam göstermiyoruz</div>
<p>Telefonda saklanmış bir kâr rakamının <strong>güncel mi eski mi</strong> olduğu
anlaşılamaz. Dünkü NET-2'yi bugünkü gibi göstermektense hiç göstermemek
doğrudur — yanlış bir rakama bakarak alım kararı vermek, hiç bakmamaktan
pahalıdır. Bağlantı gelince kaldığınız yerden devam edersiniz.</p></div>

<h3>Kamera ile okutma</h3>
<p>Kod girilen alanların yanındaki kamera düğmesi telefonun kamerasını açar.
İlk seferde tarayıcı <strong>kamera izni</strong> ister; izin vermezseniz ekranda
bu yazar ve kodu elle yazmaya devam edebilirsiniz. Barkodu çerçeveye sığdırıp
10–20 cm yaklaşın; okunduğunda pencere kendiliğinden kapanır.</p>

${sikHata([
  {
    hata: "Menüde \"Uygulamayı yükle\" seçeneği çıkmıyor",
    cozum:
      "Sayfayı bir kez yenileyin. Bazı tarayıcılar teklifi siteyi birkaç kez ziyaret ettikten sonra gösterir. iPhone'da bu seçenek YOKTUR; oradaki yol <strong>Paylaş → Ana Ekrana Ekle</strong>'dir.",
  },
  {
    hata: "iPhone'da eklendi ama adres çubuğuyla açılıyor",
    cozum:
      "Kısayol Safari dışında bir tarayıcıdan eklenmiş olabilir. Silin ve Safari ile tekrar ekleyin.",
  },
  {
    hata: "Kamera açılmıyor ya da «izin verilmedi» yazıyor",
    cozum:
      "Telefonun tarayıcı ayarlarından bu siteye kamera izni verin. O sırada kodu kutuya elle yazarak işinize devam edebilirsiniz; hiçbir akış kameraya bağlı değildir.",
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
bakmam gerek.</em> Bilgisayarda üst çubuktaki marka adına, telefonda alt
çubuktaki «Panel»e basınca her ekrandan buraya dönersiniz.</p>
${neZaman(
  "Her sabah ilk açtığın yer. Gün içinde bir şey ters gittiğini hissedersen de önce buraya bak — rakamlar, bekleyen işler ve kanal durumları burada toplanır.",
)}
${ekranSemasi("Panel", [
  { no: 1, ad: "Dönem, kanal ve karşılaştırma", aciklama: "Açılışta «Bugün». Hızlı seçenekler: Dün · Bugün · Bu hafta · Son 30 gün · Bu ay; «Özel aralık» altında daha uzun dönemler ve tarih seçimi. Yanında kanal seçimi ve «Karşılaştır» düğmeleri.", genis: true },
  { no: 2, ad: "Para kutucukları", aciklama: "Ciro · NET-1 · NET-2 · NET-2 marjı · Sipariş sayısı · İade. Seçili dönemin rakamları.", vurgulu: true, genis: true },
  { no: 3, ad: "Huni ve bugünün işleri", aciklama: "Satın alınan · Mal kabul · Kargoya verilen; altında bekleyen işler şeridi." , genis: true },
  { no: 4, ad: "Pazaryeri performansı", aciklama: "Kanal kanal ciro, NET-2 ve marj; yanında ciro dağılımı halkası." },
  { no: 5, ad: "Rafta var, vitrinde yok · Günlük özet", aciklama: "Satılamayan stoklu ürünler ve günün kısa özeti." },
  { no: 6, ad: "Grafikler ve analiz", aciklama: "Ciro ve NET-2 · Günlük operasyon · Paranın dağılımı · Ürün analizi · Son 12 ay.", genis: true },
])}
${adimlar([
  {
    ad: "Dönemi ve kanalı seçin",
    ne: "Ekrandaki rakamların çoğu bu seçime göre değişir. Kanal seçince yalnız o kanalın rakamları kalır. Kâr görme yetkiniz varsa <strong>«Karşılaştır:»</strong> yanındaki <strong>Önceki dönem</strong> ya da <strong>Geçen yıl aynı dönem</strong> düğmesiyle her rakamın yanında eski dönemle farkı çıkar; aynı düğmeye tekrar basınca karşılaştırma kapanır.",
  },
  {
    ad: "Para kutucuklarını okuyun",
    ne: "<strong>Ciro</strong> satış tutarıdır; altında o dönemin iade tutarı ve iadeden sonra kalan net ciro yazar. <strong>NET-1</strong> stopaj sonrası, <strong>NET-2</strong> stopaj ve KDV sonrası kârdır. <strong>NET-2 marjı</strong> = NET-2 ÷ brüt ciro. <strong>İade</strong> kutusu iade adedini ve iade oranını gösterir. Kâr görme yetkisi olmayan kullanıcı NET kutucuklarını görmez.",
  },
  {
    ad: "Huniye ve iş şeridine bakın",
    ne: "<strong>Satın alınan</strong> dönemde verilen alım siparişleri, <strong>Mal kabul</strong> depoya fiilen giren adet, <strong>Kargoya verilen</strong> dönemde kargoya çıkan paketlerdir. Kargo kutusunda ayrıca <strong>Kargo bekleyen</strong> (şu an bekleyen — dönemden bağımsız), <strong>Yolda</strong> ve <strong>Teslim edildi</strong> sayıları durur. Altındaki şerit bekleyen işleri sayar (bkz. aşağıdaki tablo).",
  },
  {
    ad: "Kanallara bakın",
    ne: "<strong>Pazaryeri performansı</strong> her kanalın cirosunu, satış ve iade sayısını, NET-2'sini ve marjını gösterir. <strong>Kanal sırası</strong> düğmeleriyle kartları sabit düzende, ciroya ya da NET-2'ye göre dizebilirsiniz; ekrana sığmayan kanallar «Tümünü gör» bağlantısıyla açılır.",
  },
  {
    ad: "Satılamayan stoğa ve özete bakın",
    ne: "<strong>Rafta var, vitrinde yok</strong> kutusu elinizde malı olan ama bir pazaryerinde satılamayan ürünleri kanal kanal sayar; satıra basınca o ürünler süzülmüş açılır (bkz. <a href=\"#kanalListeleme\">Kanal listeleme</a>). <strong>Günlük Özet</strong> kutusu günün kısa anlatısını gösterir; «Tam özeti gör» ile açılır.",
  },
  {
    ad: "Grafikleri ve analizi inceleyin",
    ne: "<strong>Ciro ve NET-2</strong> grafiği seçili dönemi gün gün çizer; bir noktaya basınca o aralığın satışları açılır. <strong>Günlük operasyon</strong> mal kabul, satış ve kargo adetlerini (ya da ciroyu, KDV'yi) yan yana çizer. <strong>Paranın dağılımı</strong>, <strong>ABC analizi</strong> ve <strong>Stok verimi</strong> kâr yetkisi olanlara görünür. En altta <strong>Ürün analizi</strong> sekmeleri ve <strong>son 12 ay</strong> grafiği (Ciro ve NET-2 · Envanter · Satış adedi · Ortalama marj · İade oranı · Karşılaştırma) durur.",
  },
])}

<h3>Bekleyen işler şeridi</h3>
<p>Şerit <strong>dönem seçiminden etkilenmez</strong>: bugünün işini sayar. Her
satıra basınca o işin süzülmüş listesi açılır ve listedeki satır sayısı
şeritteki sayıyla aynıdır.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Şeritte yazan</th><th>Ne demek</th></tr></thead>
<tbody>
<tr><td>Onay bekleyen</td><td>Pazaryerinden (API ile) gelmiş ama henüz onaylamadığınız siparişler. Onaylanmadan stok düşmez ve paketleme ekranında çıkmaz.</td></tr>
<tr><td>Paketlenecek</td><td>Kargoya verilmemiş siparişler. Yanında «N paketlendi» yazıyorsa o kadarı paketleme ekranında hazırlandı ama henüz kargoya verilmedi.</td></tr>
<tr><td>İade bildirimi</td><td>Bekleyen iade bildirimleri.</td></tr>
<tr><td>Mal kabul bekleyen</td><td>Alımı girilmiş ama malı depoya henüz kabul edilmemiş alımlar.</td></tr>
<tr><td>Kârı hesaplanamayan</td><td>Komisyon oranı, kargo kuralı ya da maliyeti eksik olduğu için kârı hesaplanamayan satışlar.</td></tr>
</tbody></table></div>
<p>Hiç bekleyen iş yoksa şerit <strong>«Hepsi temiz»</strong> der; satırlara yine
de basıp listeleri görebilirsiniz.</p>

<div class="ek-not dikkat"><div class="etiket">Kırmızı yazı: hesaplanamayan satış</div>
<p>Para kutucuklarının altında <strong>«N satışın kârı hesaplanamadı — bu satışlar
NET-2 toplamına GİRMEDİ»</strong> yazıyorsa NET-2 eksik demektir, sıfır değil.
<strong>«Sorunlu satışlar»</strong> düğmesi o satışları açar; eksik oranı ya da
maliyeti tamamlayıp satıştaki «Yeniden Hesapla» ile düzeltirsiniz. Benzer şekilde
«kargo düşülmeden hesaplandı» notu, kargosu girilmemiş satışların NET'inin
iyimser olduğunu söyler.</p></div>

<div class="ek-not"><div class="etiket">Kanal çekiminin yaşı</div>
<p>Sayfa başlığının yanında her kanal için <strong>«… çekimi: N dk önce»</strong>
yazar: siparişlerin pazaryerinden en son ne zaman çekildiği. Bu yazı kırmızıya
dönüp <strong>«… DAKİKADIR koşmadı»</strong> diyorsa otomatik çekim durmuş
demektir; yeni siparişler panele gelmiyor olabilir — yöneticinize haber verin.</p></div>

<div class="ek-not"><div class="etiket">Uyarılar nerede</div>
<p>Para kaybı ya da riski taşıyan durumlar (nakit açığı, maliyeti bilinmeyen
stok, geciken hakediş, eski yedek, kanal kodu olmayan stok vb.) her ekranın sağ
üstündeki <strong>uyarı çanında</strong> toplanır. Çan rakam + bağlantı gösterir;
her satır ilgili ekrana götürür. Bekleyen uyarı yoksa «Temiz» yazar.</p></div>

<div class="ek-not"><div class="etiket">Neden döküm yok</div>
<p>Panel bir <strong>hüküm</strong> yeridir, döküm yeri değil. Satır sayısı veriyle
birlikte büyüyen hiçbir liste buraya konmaz: bugün 3 satırla masum görünen bir
liste, hacim artınca ekranı yutar. Panelde <strong>rakam + "aç" bağlantısı</strong>
kalır; dökümü kendi sayfasında görürsün. Ürün listeleri de en fazla birkaç satır
gösterir; tamamı Ürün analizi ve Stok ekranlarındadır.</p></div>
${sikHata([
  {
    hata: "Panelde rakamı görüp dönem seçiciyi kontrol etmemek",
    cozum: "Rakamın hangi döneme ait olduğu her zaman seçicide yazar. “Ciro düşmüş” demeden önce seçicinin “Bugün”de mi “Bu ay”da mı olduğuna bak.",
  },
  {
    hata: "Kargo bekleyen sayısının dönemle değişmesini beklemek",
    cozum: "«Kargo bekleyen», «Yolda» ve bekleyen işler şeridi ŞU ANKİ durumu sayar; dönemi değiştirmek onları değiştirmez. «Teslim edildi» ise seçili dönemde teslim edilenlerdir.",
  },
  {
    hata: "Uyarıyı görüp “sonra bakarım” demek",
    cozum: "Uyarılar kendiliğinden kaybolmaz; veri düzelene kadar her gün taşınırlar. Okunmayan uyarı, bir süre sonra hiç okunmayan bir rozete dönüşür.",
  },
  {
    hata: "Telefonda grafiği ya da ürün analizini aramak",
    cozum: "Panel telefonda hızlı açılsın diye son 12 ay grafiği ve ürün analizi telefonda yüklenmez. Ürün analizi için menüdeki «Ürün analizi» sayfasını açın; grafiği bilgisayardan görün.",
  },
])}
<h3>Teslim bilgisi hakkında</h3>
<p><strong>Yolda</strong> şu an kargoda olanları sayar — seçili dönemden bağımsızdır.
<strong>Teslim edildi</strong> seçili dönemde teslim edilenleri sayar. Teslimi
bildirmeyen kanallar ve eski kargolar <strong>«teslim bilgisi yok»</strong> sayılır;
kaç tane olduğu kutunun altında ayrıca yazar, gizlenmez.</p>
</section>

<section id="satis">
${baslik("satis")}
${neZaman(
  "Trendyol, Hepsiburada ve N11 siparişleri KENDİLİĞİNDEN gelir — siz onları yalnız ONAYLARSINIZ. Elle satış girmek yalnız bağlı olmayan kanallar (Amazon, elden satış vb.) içindir.",
)}

<h3>Satışlar listesi</h3>
<p><strong>Sol menü → Satışlar.</strong> Açılışta <strong>bu ayın</strong> satışları
gelir; zaman süzgecinden aralığı değiştirirsiniz. İptal edilen satışlar
varsayılan olarak <strong>gizlidir</strong>.</p>
${ekranSemasi("Satışlar", [
  { no: 1, ad: "Arama", aciklama: "Sipariş no, barkod, SKU, pazaryeri SKU ya da ürün adı. Okuyucu ve kamera destekli.", genis: true },
  { no: 2, ad: "Süzgeçler", aciklama: "Kanal · kanal hesabı · kâr durumu · iade · kargo · paketleme · marj ölçüsü · iptaller · zaman." , genis: true },
  { no: 3, ad: "Toplam", aciklama: "Süzgeçteki satışların toplam adedi, ciro toplamı ve NET-2 toplamı. İptaller ayrı yazar.", vurgulu: true },
  { no: 4, ad: "N siparişi kargoya verildi işaretle", aciklama: "Toplu kargo işareti — ekrandaki süzgece bağlı." },
  { no: 5, ad: "Satır düğmeleri", aciklama: "Onayla · kargo işareti · paketlendi işareti · Detay · İade Al.", genis: true },
])}
<ul>
<li><strong>Kâr durumu süzgeci:</strong> <em>Kârı hesaplanamayanlar</em> · <em>Kârı
hesaplananlar</em> · <em>Zarara gidenler</em> · <em>Kargo düşülmeden
hesaplananlar</em>. Panelde «hesaplanamadı» diyen bir sayıya tıklamak sizi bu
süzgeçle buraya getirir.</li>
<li><strong>Kargo süzgeci:</strong> kargoya verilenler · kargo bekleyenler · yolda ·
teslim edildi · teslim bilgisi yok.</li>
<li><strong>Marj:</strong> satırdaki marj rozetinin <em>ciro marjı</em> mı
<em>sermaye verimi</em> mi göstereceğini seçer; seçim bu cihazda hatırlanır.
Ciro marjındayken renklerin anlamı «Marj ölçeği» kutusunda yazar.</li>
<li><strong>Toplam:</strong> ekranda süzülen kümenin toplamıdır, görünen sayfanın
değil. Kârı hesaplanamayan satışlar NET-2 toplamına girmez ve kaç tane olduğu
toplamın altında yazar. NET-2 rakamını yalnız kâr görme yetkisi olan görür.</li>
<li><strong>Excel:</strong> ekrandaki süzgeci aynen uygulayarak indirir.</li>
</ul>

<h3>Pazaryeri siparişleri kendiliğinden gelir</h3>
<p>Trendyol, Hepsiburada ve N11'deki yeni siparişler birkaç dakikada bir çekilir
ve <strong>Satışlar</strong> listesine düşer. Bunları elle girmeyin — aynı sipariş
numarası ikinci kez kaydedilmeye çalışılırsa sistem tanır ve ikinci kaydı açmaz.</p>
<ul>
<li><strong>Onay:</strong> gelen sipariş önce <strong>onay bekler</strong>; stok henüz
düşmemiştir. Panelde «Onay bekleyen sipariş (API)» kutusu sayısını gösterir,
tıklayınca liste açılır. Satırdaki <strong>Onayla</strong> düğmesi her kalem için
hangi partiden düşüleceğini ve maliyetini gösterir: en eskisi «önerilen (FIFO)»
diye işaretlidir, isterseniz başka bir partiyi seçersiniz. Altta «Düşülecek
toplam maliyet» yazar. Onaylayınca stok düşer, kâr hesaplanır ve sipariş
kargolanacaklara girer.</li>
<li><strong>Otomatik onay:</strong> Trendyol ve N11 siparişinde her kalemin tek bir
açık partisi varsa (seçilecek bir şey yoksa) sistem kendisi onaylar.
<strong>Hepsiburada siparişleri şimdilik her zaman elle onaylanır</strong>; çok
partili siparişler ve sayım/dönem korumasına takılanlar da sizi bekler.</li>
<li><strong>Kargodan önce iptal:</strong> müşteri pazaryerinde kargodan önce vazgeçerse
sipariş burada da kendiliğinden iptal edilir; cirodan ve kârdan düşer, stok
geri gelir.</li>
<li><strong>«Aktarılan sipariş» rozeti:</strong> müşteri ürünü başka bir mağazadan
almış, o mağaza gönderemeyince pazaryeri siparişi size aktarmıştır. Sipariş
pazaryerindeki gibi <strong>ilk sipariş tarihiyle</strong> görünür (geçmiş bir
güne, hatta geçen aya düşebilir); stok ise siparişin sisteme düştüğü güne kadar
girmiş partilerden düşer. Bu yüzden «o tarihte stok yoktu» diye takılmaz.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Onay penceresinde «stok yetersiz»</div>
<p>Pencere satış gününde yeterli stok olmadığını ama bugün stok bulunduğunu
söylüyorsa, stok satış gününden sonra girmiş demektir. Siparişte «Aktarılan
sipariş» rozeti yoksa ilgili alım kaydının tarihini kontrol edin — mal aslında
daha önce geldiyse tarih yanlış girilmiştir.</p></div>

<h3>Kargo ve paketleme işaretleri</h3>
<ul>
<li><strong>Kargoya verildi olarak işaretle</strong> (satırdaki düğme): kargoya veriliş
tarihini girip kaydedersiniz. İşaretli satırda tarih görünür; yanlışsa
işaret kaldırılabilir.</li>
<li><strong>Paketlendi olarak işaretle</strong>: aynı mantık, paketleme için.</li>
<li><strong>Toplu kargo düğmesi</strong> ekranda süzülen ve henüz kargo işareti
olmayan siparişlere <strong>bugünün</strong> tarihini yazar. Zaten işaretli
olanlara ve iptallere dokunmaz. İçe aktarılmış (geçmiş) siparişler bu kümeye hiç
girmez — sistem onların gerçek kargo tarihini bilmiyor.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Toplu işaretin geri dönüşü yok</div>
<p>Toplu işaret tek tek satırdan geri alınır; toplu geri alma yoktur. Yazılan
tarih gerçek kargo tarihi değilse veri bozulur — yalnız o gün gerçekten
kargoya verdiğiniz siparişleri süzüp kullanın.</p></div>

<h3>Elle satış girmek</h3>
<p><strong>Sol menü → Satışlar</strong>, sağ üstte <strong>Yeni Satış</strong>. Bir satış
her zaman bir SATIŞ hesabına bağlıdır — hangi pazaryerinin hangi mağazasından
satıldığı kesintileri belirler.</p>
${adimlar([
  { ad: "Satış bilgileri", ne: "Kanal hesabı (zorunlu), sipariş numarası (okutulabilir; boş bırakılabilir ama girilirse benzersiz olmalı), satış tarihi ve isterseniz gönderi (kargo takip) numarası." },
  { ad: "Kalemler", ne: "Ürünü okutun ya da arayın. Her kalemin yanında «Stokta N» yazar. Birim satış fiyatı <strong>KDV dahildir</strong>." },
  { ad: "Komisyon", ne: "Oran ürünün Kanal SKU'sundan önerilir. Pazaryeri panelinde kampanya indirimi görünüyorsa <strong>komisyon tutarını</strong> doğrudan yazın — tutar girilirse oran kullanılmaz. Oran kayıtlı orandan ya da o fiyatın dilimindeki orandan farklıysa ekran uyarır; şüpheli düşük oranda devam etmek için «istisna olarak kaydet» kutusu işaretlenir." },
  { ad: "Parti seçimi (çıkarsa)", ne: "Ürünün birden fazla açık partisi varsa «Hangi partiden düşsün» kutusu çıkar. Varsayılan en eski parti (FIFO); dokunmazsanız öyle kalır." },
  { ad: "Kargo", ne: "Toplam desi kalemlerden hesaplanır, fiili tartım farklıysa değiştirin. Kargo firması listesinde her firmanın o desideki fiyatı yazar; en ucuzu «önerilen» diye işaretlidir, taşımayan firma seçilemez. Farklı bir tutar ödediyseniz «Kargo tutarı (KDV dahil)» alanına yazın — yazılan tutar tarifenin yerine geçer. Sipariş birden çok pakette gittiyse <strong>Paket sayısı</strong>nı girin." },
  { ad: "Kâr önizlemesi", ne: "Form, kaydetmeden önce her kalemin yaklaşık NET-2'sini yazar (tahmindir: maliyet açık partilerin ortalaması, kargo hariç). Zarardaysa uyarır ve bir alt komisyon dilimine inmenin kurtarıp kurtarmadığını söyler. Kayıt engellenmez." },
  { ad: "Satışı Kaydet", ne: "Stok düşer (seçtiğiniz partiden, yoksa en eskisinden), kâr hesaplanır ve <strong>o anki hâliyle kayda yazılır.</strong>" },
])}
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Komisyon oranları haftalık değişiyor. Kâr satış anında kaydedildiği için, oran
gelecek hafta değişse bile geçmiş satışın hesabı değişmez. Bilerek yeniden
hesaplatmak isterseniz satış detayında <strong>Yeniden Hesapla</strong> var.</p></div>

<h3>Stoktan fazla satılamaz</h3>
<p>Elinizde 3 varken 5 satmaya çalışırsanız kayıt <strong>reddedilir</strong> ve
elinizde kaç olduğu ekranda yazar. Yarım kaydedilmiş satış oluşmaz.</p>

<h3>Satış detayı — ne görürsünüz, neyi düzeltebilirsiniz</h3>
<p>Listede <strong>Detay</strong>. Üstte satış bilgileri ve onay durumu; altında
<strong>düşülen partiler</strong> (her parti kendi birim maliyetiyle) ve
<strong>kâr bloğu</strong>: kalem kârı, sipariş kesintileri, NET-1, NET-2 ve KDV
dökümü.</p>
<ul>
<li><strong>Düzenle:</strong> birim fiyat, adet, desi, kargo tutarı ve firması
düzeltilir; bir <strong>neden</strong> seçmek zorunludur. Önce önizleme gösterilir.
Sipariş no, kanal, tarih ve ürün değişmez — yanlış ürün ya da kanal girildiyse
yol iptal + yeni kayıttır. Adet artarsa stoktan düşer, azalırsa stoğa döner.</li>
<li><strong>Kanal hesabını değiştir:</strong> satış yanlış hesaba yazıldıysa taşınır;
kâr yeni kanalın kesinti kurallarıyla kendiliğinden yeniden hesaplanır.</li>
<li><strong>Yeniden Hesapla:</strong> kârı güncel değerlerle yeniden hesaplar ve kayıtlı
değerin üstüne yazar. Önce «Önizle» ile eski/yeni/fark görünür. Stok değişmez.</li>
<li><strong>Maliyeti düzelt:</strong> düşülen partinin birim maliyeti yanlışsa. O
partiden çıkmış bütün satışların kârı yeniden hesaplanır; stok adedi değişmez.</li>
<li><strong>Gönderi numarası:</strong> kargo kodu satıştan sonra oluştuysa sonradan
girilir; aynı kod iki satışta olamaz.</li>
<li><strong>Kalemi kaldır:</strong> yalnız <strong>hiç satılmamış</strong> bir satır için
(aynı kalem iki kez yazılmış ya da yanlış eklenmiş). İade değildir; satırın
malı stoğa geri döner, satır silinmez, üstü çizili durur ve geri alınabilir.</li>
<li><strong>Değişiklik izi:</strong> sayfanın altında satışa yapılan her düzenleme,
iptal ve onay kim/ne zaman bilgisiyle listelenir.</li>
</ul>

<h3>Sizde tanımlı kanal kesintileri</h3>
<p>Aşağıdakiler sisteminizde <strong>tanımlı olan</strong> kurallardır; kâr
hesabında bunlar uygulanır. Komisyon oranı ürün bazında Kanal SKU'da tutulur ve
bu tabloda görünmez.</p>
${canliTablo(
  ["Kanal", "Kesinti", "Değer", "Kapsam"],
  kesintiSatirlari,
  "Kanal kesinti kuralı tanımlı değil.",
)}
<p>Ayrıca her satışta <strong>stopaj</strong> düşülür: ürünün kendi KDV oranı
düşülmüş tutarın %1'i. Kargo, desi tarifesinden okunur ve üstüne %20 KDV
eklenir.</p>
<div class="ek-not"><div class="etiket">NET-1 ve NET-2</div>
<p><strong>NET-1</strong> = satış − maliyet − komisyon − stopaj (sipariş kesintileri
de düşülür). <strong>NET-2</strong> = NET-1'den ayrıca <strong>ödenecek KDV</strong>
düşülmüş hâli (satış KDV'si eksi indirilecek alış, komisyon ve kargo KDV'leri).
Maliyeti bilinmeyen, para birimi uyuşmayan ya da komisyon/kargo kuralı eksik
satışta kâr <strong>hesaplanmaz</strong> — sıfır da sayılmaz; sebebi satırda yazar.</p></div>

<h3>Satışı iptal etmek</h3>
<p>Satış detayında <strong>Satışı iptal et</strong>. İptal iade <strong>değildir</strong>:
mal hiç çıkmamıştır, komisyon kesilmemiş, kargo yanmamıştır. Sebep listeden
seçilir («Mağaza: diğer»de açıklama zorunlu) ve önce önizleme gösterilir: kaç
adet stoğa döneceği, cironun ve NET-2'nin ne kadar düşeceği. İptal edilen satış
ciroya, NET'e ve hakediş beklentisine girmez; stok geri gelir. Kayıt silinmez —
listede gizlenir, «İptaller» süzgeciyle üstü çizili görünür ve <strong>İptali geri
al</strong> ile geri alınabilir. İadesi olan satış iptal edilemez.</p>
${sikHata([
  {
    hata: "Toplu “kargoya verildi” düğmesini bütün liste için kullanmak",
    cozum: "Düğme süzgeçteki işaretsiz HER siparişe bugünün tarihini yazar ve toplu geri alması yoktur. Yalnız o gün gerçekten kargoya verdiğiniz siparişleri süzüp kullanın.",
  },
  {
    hata: "Müşterinin geri gönderdiği malı “Kalemi kaldır” ya da “iptal” ile düzeltmek",
    cozum: "Mal gerçekten satıldıysa ve geri geldiyse yol İade Al'dır. İptal hiç çıkmamış sipariş, kaldırma hiç satılmamış satır içindir.",
  },
  {
    hata: "İptal edilmiş bir siparişin numarasıyla yeni satış açmaya çalışmak",
    cozum: "Aynı numara ikinci kez kullanılamaz; numarayı değiştirmek pazaryeri ödemesiyle eşleşmeyi bozar. O satışı açıp «İptali geri al» deyin, gerekirse sonra düzenleyin.",
  },
])}
</section>

<section id="iade">
${baslik("iade")}
${neZaman(
  "Müşteri malı geri gönderdiğinde ya da kargo teslim edemeyip iade ettiğinde. Türü DOĞRU seçmek önemli: tür, malın stoğa geri girip girmeyeceğini belirler.",
)}
<p>İade iki aşamada izlenir: pazaryeri «müşteri iade istiyor» dediğinde bir
<strong>bildirim</strong> açılır (mal yolda, hesap yok); mal elinize geçince
<strong>iade kaydı</strong> girilir (stok ve kâr o an değişir). İade kaydı satış
listesinde ya da satış detayında <strong>İade Al</strong> düğmesiyle açılır.</p>

<h3>İade türü</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Tür</th><th>Ne oldu</th><th>Mal stoğa girer mi</th></tr></thead>
<tbody>
<tr><td><strong>Teslim edilemedi</strong></td><td>Müşteriye ulaşmadan geri döndü. Gidiş kargosu zaten kesilmişti; ek kargo yok</td><td>Evet, sağlam gelense</td></tr>
<tr><td><strong>Normal iade</strong></td><td>Müşteri aldı, iade etti. Dönüş kargosunu satıcı öder</td><td>Evet, sağlam gelense</td></tr>
<tr><td><strong>İtiraz kabul edildi</strong></td><td>İtirazınız kabul edildi, ürün müşteriye geri gönderildi; satış ayakta kalır</td><td><strong>Hayır</strong></td></tr>
</tbody></table></div>

<h3>İade Al — adım adım</h3>
${adimlar([
  { ad: "İade bilgileri", ne: "Türü seçin; iade tarihini ve isterseniz iade numarasını girin. Seçtiğiniz türün altında ne anlama geldiği yazar." },
  { ad: "Kalemler", ne: "Her kalem için <strong>iade adedi</strong>, bunun kaçının <strong>sağlam</strong> kaçının <strong>hasarlı</strong> olduğu (toplamı iade adedine eşit olmalı) ve sağlam gelenin yerleştirileceği <strong>raf</strong>. Hasarlı adet girdiyseniz <strong>hasar notu zorunludur</strong>: ne hasarı, kim tespit etti." },
  { ad: "Değişim (varsa)", ne: "Müşteriye yerine başka bir ürün gönderildiyse <strong>değişim ürünü</strong>nü seçin; o ürün stoktan düşer. Yanlış ürün gönderilip o geri geldiyse <strong>dönen ürün</strong>ü seçin. Değişim ürününün teslim tarihi hakediş vadesini yeniden başlatır." },
  { ad: "Kargo ve ceza", ne: "<strong>İade kargosu</strong>na yalnız dönüş kargosunu yazın. Değişimde ya da itirazda yeni gönderimin kargosunu ödediyseniz «Yeniden gönderim kargosu»na yazın — girilmezse bu gider defterde görünmez. Pazaryeri ceza kestiyse tutarı girin." },
  { ad: "Önizle", ne: "<strong>Önizle</strong> iadenin etkisini satır satır gösterir: kaybedilen gelir, geri gelen kesintiler, stoğa dönen ve dönmeyen maliyet, NET-1 ve NET-2 etkisi. Önizleme görülmeden kaydetme düğmesi açılmaz." },
  { ad: "İadeyi Kaydet", ne: "Bir onay penceresi daha çıkar. Sağlam adet stoğa girer, değişim ürünü stoktan düşer." },
])}

<h3>Hangi kesinti geri gelir</h3>
<div class="izgara">
<div class="ek-kart"><div class="ust" style="color:var(--iyi)">Geri gelir</div>
<p>Komisyon (KDV'siyle) · ödeme gideri · stopaj. Kısmi iadede hepsi <strong>adet oranında</strong>.</p></div>
<div class="ek-kart"><div class="ust" style="color:var(--tehlike)">Geri gelmez</div>
<p>Hizmet bedeli · sabit gider · <strong>gidiş kargosu</strong>. Bunlar yandı.</p></div>
</div>
<div class="ek-not"><div class="etiket">İki istisna</div>
<p><strong>İtiraz kabul edildi</strong> türünde satış ayakta kalır: gelir düşmez,
komisyon geri <strong>gelmez</strong>, mal stoğa girmez; yalnız katlandığınız
giderler (kargo, yeniden gönderim, ceza) yazılır.<br>
<strong>Değişimde</strong> pazaryeri siparişi açık tutar ve para sizde kalır: ciro ve
komisyon yerinde durur; geri gelen malın maliyeti geri gelir, yerine giden
ürünün maliyeti satışın kârına yazılır.</p></div>
<div class="ek-not dikkat"><div class="etiket">Sık yapılan hata</div>
<p>İade formundaki kargo alanına <strong>gidiş kargosunu yazmayın</strong>. O
zaten satışta düşüldü. Buraya yalnızca iade/dönüş kargosunu yazın.</p></div>

<h3>Hasarlı gelen mal</h3>
<p>Hasarlı adet stoğa girmez ve <strong>maliyeti üstünüzde kalır</strong>; önizleme
bunu «stoğa dönmeyen maliyet» satırıyla ayrıca gösterir. Hasar kargodan ya da
pazaryerinden kaynaklıysa satış detayındaki iade bloğunda <strong>Tazminat talebi
aç</strong> bağlantısıyla talep açabilirsiniz (bkz. <a href="#tazminat">Tazminat</a>).</p>

<h3>İade KDV'yi de geri alır</h3>
<p>İade, satışın KDV hesabını da tersine çevirir. <strong>Sağlam gelip stoğa dönen</strong>
malın alış KDV'si iadede geri alınır — çünkü o mal yeniden satılacak ve alış
KDV'si o satışta tekrar kullanılacak. Bu yüzden bir iadenin NET-2 etkisi NET-1
etkisinden farklı çıkabilir. Hasarlı gelen malda alış KDV'si geri alınmaz.</p>

<h3>Kaydettikten sonra</h3>
<p>Orijinal satış kârı <strong>silinmez</strong>: satış detayında her iade kendi
bloğunda görünür, en altta «iade sonrası net» yazar.</p>
<ul>
<li>Satış detayındaki iade bloğunda <strong>Düzenle</strong>: stoğa dokunmayan alanlar
(kargo ve ceza tutarları, notlar, değişim teslim tarihi) değiştirilir. Tutar
değişirse iadenin kâra etkisi yeniden hesaplanır.</li>
<li><strong>İadeyi geri al</strong>: tür, adet ya da sağlam/hasarlı ayrımı yanlış
girildiyse iade ters kayıtla geri çevrilir, sonra doğrusu yeniden girilir. Neden
seçilir ve önce stok etkisi gösterilir. İade silinmez; geri alınanlar
toplamlara girmez. İadeyle stoğa dönen mal bu arada satıldıysa geri alma
yapılamaz. Kalemine tazminat talebi açılmışsa önce o talep
sonuçlandırılmalıdır.</li>
</ul>

<h3>Ceza kademeleriniz</h3>
<p>Pazaryeri ceza kestiyse tutarı siz girersiniz; sistem sipariş tutarına göre bir
<strong>öneri</strong> gösterir. Kademesi olmayan tutarda öneri çıkmaz.</p>
${canliTablo(["Kanal", "Sipariş tutarı", "Ceza"], cezaSatirlari, "Ceza tarifesi tanımlı değil.")}

<h3>İadeler ekranı</h3>
<p><strong>Sol menü → İadeler.</strong> Üstte arama (sipariş no, gönderi no, talep
no, SKU, barkod, ürün ya da sebep — okutabilirsiniz) ve dönem süzgeci; altında üç
sekme vardır:</p>
<ul>
<li><strong>Bildirimler:</strong> pazaryeri «müşteri iade istiyor» dedi ve mal yolda.
<strong>Yeni bildirim kaydet</strong> ile satış, gerekçe, pazaryeri talep no ve
bildirim tarihi girilir; değişim için gönderilecek ürün <strong>ayrılabilir</strong>
(fiziksel stoğa dokunmaz, stok ekranında «ayrılmış» görünür). Burada stok ve kâr
hesabı <strong>yoktur</strong>. Her bildirimde bir sonraki adımın <strong>son
tarihi</strong> ve kalan gün sayısı yazar. Mal gelince <strong>İadeyi işle</strong> ile
iade kaydı açılır ve hesap o zaman yapılır. İtirazı kabul edilen iadeler
«Kargolanması gereken» kutusunda müşteriye geri gönderilmeyi bekler.</li>
<li><strong>İşlenmiş iadeler:</strong> seçili dönemde işlenen iadeler ve dönem özeti
(iade adedi, kaybedilen gelir, ceza toplamı, stoğa dönen/dönmeyen maliyet,
iade etkisi NET-2). Tür ve hasar süzgeçleriyle «tazminatı açılmamış hasarlılar»
bulunur.</li>
<li><strong>Kırılım:</strong> hangi pazaryeri ve hangi ürün iade üretiyor; iade oranı
ve en çok iade edilen ürünler. İade oranı = dönemde gelen iade ÷ dönemde
yapılan satış; operasyon yükünü ölçer, ürün kalitesini değil.</li>
</ul>
${sikHata([
  {
    hata: "Her iadeyi “normal iade” seçmek",
    cozum: "«İtiraz kabul edildi» türünde ürün MÜŞTERİDE kalır ve stoğa girmemelidir. Yanlış tür seçilirse elinde olmayan mal stokta görünür ve bir sonraki satış hatalı FIFO ile hesaplanır.",
  },
  {
    hata: "Tamamen hasarlı gelen iadede NET-2'nin düşmesini hesap hatası sanmak",
    cozum: "Hasarlı mal stoğa dönmez, maliyeti üstünüzde kalır. Önizlemedeki «stoğa dönmeyen maliyet» satırı bu tutarı gösterir; hasar başkasının kusuruysa tazminat talebi açın.",
  },
  {
    hata: "Mal gelmeden iade kaydı girmek",
    cozum: "Mal yoldayken yalnız bildirim açılır; stok ve kâr değişmez. Mal elinize geçip durumunu gördüğünüzde «İadeyi işle» ile iade kaydına geçin.",
  },
])}
</section>

<section id="okuma">
${baslik("okuma")}
<div class="ek-not"><div class="etiket">Bu ekran mı, öteki mi</div>
<p><strong>Bu ekran:</strong> elinde bir kod var ve <em>ne olduğunu</em>
bilmiyorsun. Ürün mü, sipariş mi, raf mı, kayıtlı mı &mdash; sistem ne biliyorsa
onu söyler.</p>
<p><strong>Öteki ekran</strong> (<a href="#paketleme">Yönlendirmeli
paketleme</a>): kutuyu hazırlıyorsun ve <em>hangi raftan ne alacağını</em>
soruyorsun.</p>
<p>Kararsızsan buradan başla: okuttuğun kod bir sipariş çıkarsa ekranda
<strong>&quot;Yönlendirmeli paketle&quot;</strong> düğmesi belirir ve seni
oraya sipariş yüklenmiş hâlde götürür.</p></div>
<p><strong>Sol menü → Barkod okut</strong>. Elindeki ürünü okutursun;
sistem o kod hakkında <strong>ne bildiğini</strong> söyler. Hiçbir şey
engellenmez, onay istenmez; okuma yalnız kayda geçer. (Bu ekrandan yalnız iki şey
kayıt yazar: bir siparişi <strong>Paketlendi</strong> diye işaretlemek ve
<strong>Sayım</strong> kipi — bkz. aşağıda.) Telefonda paneldeki <strong>Hızlı
işlemler</strong>in ilk düğmesi de bu ekrandır.</p>
${neZaman(
  "Depoda paket hazırlarken. Kutuyu eline aldığında okut, ekranda ne yazdığına bak, paketlemeye devam et. Bir rafın üstünde ne olması gerektiğini merak ettiğinde ve rafları sayarken de buradasın.",
)}
${ekranSemasi("Barkod okut", [
  { no: 1, ad: "Okutma kutusu", aciklama: "«Barkod okut veya yaz» · kamera düğmesi · «Okut».", genis: true, vurgulu: true },
  { no: 2, ad: "Sonuç", aciklama: "Ürün, sipariş ya da raf — sistemin bildiği her şey.", genis: true },
  { no: 3, ad: "Fiziksel sayım", aciklama: "«Sayım başlat» ya da açık sayıma devam." },
  { no: 4, ad: "Son dört hafta", aciklama: "Okumaların haftalık dökümü." },
])}
${adimlar([
  {
    ad: "Kodu okutun",
    ne: "USB okuyucuyla okutun (Enter kendiliğinden basılır), kamera düğmesiyle telefondan okutun ya da elle yazıp <strong>«Okut»</strong>a basın. Okunan kod <strong>«Son okuma»</strong> diye yazar ve kopyalanabilir.",
  },
  {
    ad: "Sonucu okuyun",
    ne: "Üç ihtimal var: kod bir <strong>ürün</strong>, bir <strong>sipariş</strong> ya da bir <strong>raf</strong> çıkar. Her birinin ne gösterdiği aşağıda.",
  },
  {
    ad: "Sayım (gerekirse)",
    ne: "Rafları saymak için <strong>«Sayım başlat»</strong>. Ayrıntısı aşağıda.",
  },
  {
    ad: "Haftalık döküm",
    ne: "Son dört haftanın okumaları dört kovada sayılır (aşağıda «Asıl işi ölçmek»).",
  },
])}

<h3>Kod bir ÜRÜN çıkarsa</h3>
<p>Ekranda <strong>«Tanındı: ürün adı · hangi alan»</strong> yazar — kodun Barkod
(EAN), Firma SKU, SKU, Kanal SKU ya da eski Firma SKU alanlarından hangisinde
bulunduğu. <strong>«Detay»</strong> düğmesi ürünün SKU, Firma SKU ve barkodunu
açar. Altında <strong>«Kargoya verilmemiş siparişler»</strong> listesi çıkar: bu
ürünün geçtiği, henüz kargoya verilmemiş her sipariş (sipariş no · adet · kanal).
Ürün hiçbir bekleyen siparişte yoksa <strong>«Kargoya verilmemiş siparişte
geçmiyor»</strong> yazar.</p>
<p>Listedeki her siparişin yanında <strong>«Paketlendi»</strong> düğmesi durur.
Bastığınızda o sipariş «Hazırlanıyor» işaretini alır ve düğme <strong>«Geri al»</strong>a
döner. Bu işaret yalnız bir iz bırakır: siparişi kargoya verilmiş saymaz, stoğa
dokunmaz, pazaryerine bir şey göndermez.</p>

<h3>Kod bir SİPARİŞ çıkarsa</h3>
<p>Kargo etiketindeki gönderi numarasını ya da sipariş numarasını okutursanız
<strong>«Sipariş bulundu»</strong> yazar ve hangi numarayla eşleştiği söylenir.
<strong>«Yönlendirmeli paketle»</strong> düğmesi o siparişi paketleme ekranında
açar. Paketleme ekranına geçmeden, aşağıdaki listeden siparişi doğrudan
«Paketlendi» diye de işaretleyebilirsiniz.</p>

<h3>Kod bir RAF çıkarsa</h3>
<p>Raf etiketini okutursanız <strong>«Raf …»</strong> başlığı altında o rafta
<strong>stoğu olan</strong> ürünler adetleriyle listelenir (SKU, Firma SKU, barkod
kopyalanabilir). Bu adetler <strong>defterden</strong> okunur — fiziksel sayım
değildir; kaydedilmeden taşınan ürünü sistem bilemez. Rafa kayıtlı ama stoğu
olmayan ürünler ayrıca sayılır: «rafta bulamazsınız» uyarısıyla.</p>

<h3>Bu ekran seni DURDURMAZ</h3>
<p>Bir uyarı ekranı değildir. &quot;Yanlış ürün&quot; demez, &quot;emin
misin&quot; diye sormaz, bir düğmeyi kilitlemez. Sebebi basit: sistemdeki
satış defteri her zaman <strong>eksiksiz</strong> olmayabilir. Uyarı koysaydık çoğu
zaman <em>haklı olarak</em> çalardı, sen her seferinde geçerdin ve iki
haftada uyarıyı okumadan tıklamayı öğrenirdin. O noktada uyarı işe
yaramaz hâle gelirdi &mdash; hem de tam gerektiği gün.</p>
<div class="ek-not"><div class="etiket">Asıl işi ölçmek</div>
<p>Her okuma kayda geçer ve dört kovaya ayrılır: <strong>Açık siparişte var</strong>,
<strong>Açık siparişte yok</strong>, <strong>Eşleştirildi</strong> (kod tanınmadı ama
sen ürünü gösterdin) ve <strong>Hüküm verilemedi</strong>. Ekranın altındaki
<strong>«Son dört hafta»</strong> tablosu bu kovaları hafta hafta, yüzdesiyle ve
toplamıyla gösterir. Bu dağılım, defterin ne kadarının eksik olduğunu
<em>pazaryerinden de sistemden de bağımsız</em> olarak söyler. «Hüküm verilemedi»
bir bulgu değildir: kod tanınmadı ve ürün de gösterilmedi.</p></div>

<h3>Kod bulunamazsa</h3>
<p>Ekran <strong>«Bu kod hiçbir alanda bulunamadı»</strong> der ve baktığı beş
alanı sayar: Barkod (EAN), Firma SKU, SKU, Kanal SKU, gönderi numarası. Altında
isteğe bağlı bir arama kutusu çıkar: elindeki ürünün hangisi olduğunu biliyorsan
adını ya da kodunu yazıp <strong>«Bu ürün»</strong> ile gösterebilirsin.
<strong>İstersen atla</strong> &mdash; hiçbir şey beklemiyor, paketlemeye devam
edebilirsin.</p>
<p>Gösterdiğinde sistem &quot;bu kod bu ürüne ait&quot; diye kaydeder ve
<strong>«Eşleştirildi»</strong> yazar. <strong>Neden</strong> tutmadığını sormaz:
ürünün barkodu gerçekten farklı olabilir, kayıtta yanlış girilmiş olabilir, ya da
o parti farklı bir barkodla gelmiş olabilir. Birkaç vaka birikince hangisi olduğu
görünür hâle gelir.</p>
<p>Kod <strong>birden fazla ürüne</strong> uyuyorsa ekran hiçbirini açmaz ve
kaç ürüne uyduğunu söyler. Bu durumda ürün kartlarından çakışan kodu düzeltmek
gerekir.</p>
${sikHata([
  {
    hata: "«Kargoya verilmemiş siparişte geçmiyor» yazınca ürünü paketlememek",
    cozum: "Bu bir hata mesajı değildir. Satış sisteme henüz girilmemiş olabilir; ürünün bugün paketlenmiyor olması da mümkündür. Ekran hangisi olduğunu bilemez ve iddia etmez — sen işine devam et.",
  },
  {
    hata: "Bulunamayan her kod için ürün göstermek zorunda hissetmek",
    cozum: "Zorunlu değil. Acelen varsa atla; kayıt yine tutulur ve raporda «Hüküm verilemedi» tarafında sayılır.",
  },
  {
    hata: "«Paketlendi»ye basınca siparişin kargoya verildiğini sanmak",
    cozum: "Paketlendi yalnız «hazırlandı» izidir. Sipariş kargoya verilene kadar «Kargoya verilmemiş» listesinde ve panelin «Paketlenecek» sayısında kalır; panelde «N paketlendi» diye ayrıca görünür.",
  },
])}

<h3>Fiziksel sayım</h3>
<p>Bu ekrandaki <strong>Sayım başlat</strong>, rafları sayma kipini açar. Düğmenin
altında kaç varyantın sayılacağı yazar: <strong>stoğu olan</strong> bütün varyantlar
sayımın <em>kapsamıdır</em>. Aynı anda yalnız <strong>bir</strong> sayım açık olabilir.</p>
${adimlar([
  {
    ad: "«Sayım başlat»",
    ne: "Ekranda <strong>«sayılan / kapsam»</strong> sayacı ve «kalan N» çıkar. O gün stok hareketi olmuşsa sarı bir uyarı da çıkar (aşağıda «belirsiz»).",
  },
  {
    ad: "«Kamerayı aç ve okut»",
    ne: "Kamera açık kalır, okuttukça sayılır; telefonun ekranı sayım sürerken kararmaz. Aynı ürünü sayarken her adedi kadrajdan çıkarıp yeniden sokun — kamera önünde sabit duran tek barkod bir kez sayılır. Okutulan her ürün listede adediyle durur; yanlış sayılanı <strong>−</strong> / <strong>+</strong> düğmeleriyle düzeltirsiniz.",
  },
  {
    ad: "Ara verebilirsiniz",
    ne: "Her okuma anında kaydedilir; uygulamayı kapatıp açtığınızda aynı sayıma dönersiniz.",
  },
  {
    ad: "«Sayımı bitir»",
    ne: "Sayım kapanır ve <strong>kapanış</strong> ekranı açılır: kapsam · sayıldı · sapan · SAYILMADI sayıları ve aşağıdaki kararlar.",
  },
])}
<p>Kapanış ekranında:</p>
<ul>
<li><strong>Okutulmayan varyantlar</strong> için karar verirsiniz: <strong>«Rafta yok»</strong>
(gerçek eksik, düzeltmesi yazılır) ile <strong>«Sayılmadı»</strong> (sistem o ürün
hakkında hiçbir şey söylemez) aynı şey değildir. Toplu düğmeler: «Hepsi rafta YOK →
0 say» ve «Hepsi SAYILMADI → dokunma».</li>
<li><strong>Eksik</strong> çıkan ürün (rafta sistemden az) için iki yol vardır:
<strong>«Satışı gir →»</strong> ya da <strong>«Sayım farkı yaz»</strong>.
<strong>Emin değilseniz Sayım farkı seçin</strong>: yanlış sayım farkı ters kayıtla
düzeltilebilir; yanlış satış ise ciroyu şişirir, KDV ve stopaj matrahına girer.</li>
<li><strong>Fazla</strong> çıkan ürün (rafta sistemden çok) için: <strong>«Alımı gir →»</strong>,
<strong>«Maliyetle yaz»</strong> ya da <strong>«Maliyeti bilmiyorum»</strong>.
<strong>Önce alımı girin</strong> — faturayı sonra girerseniz stok iki kez artar.
Ekran ürünün alım geçmişi olup olmadığını da söyler.</li>
<li>Sayım farkı bir satış değildir: ciroya ve NET-2'ye girmez; raporda ayrı
kalem olarak görünür.</li>
<li>Sayım günü hareket görmüş ürünler <strong>«belirsiz»</strong> işaretlenir ve
düzeltmeleri yazılmaz — ertesi gün tek tek bakarsınız.</li>
<li>Sayım başlarken stokta yok sanılan ama rafta bulunan ürünler
<strong>«kapsam dışı bulundu»</strong> diye işaretlenir ve fazla listesine girer.</li>
<li>Düzeltmesi yazılan satır kilitlenir; geri almak için ters işaretli ikinci bir
düzeltme gerekir.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Sayım son sözdür</div>
<p>Sayılmış bir ürünün stoğu, sonradan girilen <strong>sayım öncesi tarihli</strong>
bir kayıtla sessizce değişmez: sistem durur, ne olduğunu söyler ve ısrar
ederseniz istisnayı kayda geçirip o ürünün yeniden sayılmasını ister.</p></div>
</section>

<section id="paketleme">
${baslik("paketleme")}
<div class="ek-not"><div class="etiket">Bu ekran mı, öteki mi</div>
<p><strong>Bu ekran:</strong> kargo etiketi elinde, kutuyu hazırlıyorsun.
Sistem sana <em>hangi raftan ne alacağını</em> söyler ve doğru ürünü
aldığını <em>okutarak doğrular</em>.</p>
<p><strong>Öteki ekran</strong> (<a href="#okuma">Barkod okut</a>): elinde
bir kod var ama ne olduğunu bilmiyorsun &mdash; ürün mü, sipariş mi, raf mı.</p></div>
<p><strong>Sol menü → Paketle</strong>. Telefonda alt çubuktaki
<strong>Paketle</strong> sekmesi de buraya gelir; menüde simgesinin üstündeki sayı
kargo bekleyen sipariş sayısıdır. Bu ekran sana paketi <strong>tarif eder</strong>:
hangi üründen kaç adet, hangi raftan. Ezberlemen gereken hiçbir şey yok &mdash;
iki okutma yeter.</p>
${neZaman(
  "Kargo etiketi elinde, kutuyu hazırlamaya başladığında. Yeni bir eleman da bu ekranla tarifsiz çalışabilir.",
)}
${ekranSemasi("Paketle", [
  { no: 1, ad: "1. Kargo kodu", aciklama: "Kargo ya da sipariş numarası · kamera.", genis: true },
  { no: 2, ad: "Sipariş kartı", aciklama: "Sipariş no · Gönderi no · her kalem için ürün, SKU, Firma SKU, barkod, ADET ve RAF.", genis: true, vurgulu: true },
  { no: 3, ad: "2. Raftan al ve okut", aciklama: "Barkod, Firma SKU ya da SKU · kamera." },
  { no: 4, ad: "Paketlendi", aciklama: "Ürün okutulunca açılır · «Yeni kutu»." },
])}
${adimlar([
  {
    ad: "Kargo kodunu okutun",
    ne: "Pazaryeri etiketindeki <strong>kargo kodunu</strong> ya da <strong>sipariş numarasını</strong> okutun. Sistem siparişi bulur ve her kalem için <strong>ürün adını, adedini ve RAFI</strong> söyler.",
  },
  {
    ad: "Raftan alıp ürünü okutun",
    ne: "O raftan aldığınız ürünün üstündeki barkodu (ya da Firma SKU / SKU etiketini) okutun. Doğruysa ekran yeşile döner, <strong>bip</strong> sesi gelir ve telefon kısa titrer; yanlışsa daha kalın bir ses ve uzun titreşim gelir. Kulakla ayırt edebilirsiniz &mdash; ekrana bakmanız gerekmez.",
  },
  {
    ad: "Birden çok adet varsa her birini okutun",
    ne: "Kalemde 2 ya da daha fazla adet varsa ekran <strong>«Eşleşti — 1/3 okutuldu. Bu üründen 2 tane daha okutun.»</strong> der. Gereken adet tamamlanınca fazladan okutmaya gerek olmadığını söyler.",
  },
  {
    ad: "«Paketlendi»",
    ne: "En az bir kalemin bütün adetleri okutulunca düğme açılır. Basınca sipariş «hazırlandı» olarak işaretlenir. Sonraki siparişe geçmek için <strong>«Yeni kutu»</strong>.",
  },
])}
<div class="ek-not"><div class="etiket">Ürünü okutmadan paketleyemezsin</div>
<p>Bu bilerek böyle. Kargo kodunu okutup ürünü okutmadan &quot;paketlendi&quot;
demek, bu ekranın <em>tek işini</em> atlamak olurdu: doğru ürünü aldığını
kimse doğrulamamış olur. Düğme kilitliyse altında <strong>niye kilitli olduğu
yazar</strong>.</p></div>
<div class="ek-not dikkat"><div class="etiket">«Paketlendi» kargoya verildi demek değildir</div>
<p>Bu işaret yalnız «kutu hazırlandı» izidir: stoğa dokunmaz, siparişi kargoya
verilmiş saymaz, pazaryerine bir şey göndermez. Sipariş kargoya verilene kadar
panelin «Paketlenecek» sayısında kalır; yanında «N paketlendi» diye ayrıca görünür.
Yanlışlıkla bastıysanız <strong>«Paketlendi işaretini geri al»</strong> düğmesi
vardır.</p></div>
<h3>Raf etiketini de okutabilirsin</h3>
<p>Ürün kutusuna bir <strong>raf etiketi</strong> okutursan ekran
<strong>«… rafındasınız — bu siparişten burada N kalem var»</strong> der. Doğru rafın
önünde olduğunu teyit eder; ürünü yine okutman gerekir.</p>
<h3>Okuttuğun ürün siparişte yoksa</h3>
<p>Ekran «Okutulan kod (…) bu siparişte yok» der ve <strong>durur
orada</strong>. Seni engellemez, başka bir ürün okutabilirsin. Sebebi
<a href="#okuma">Barkod okut</a> bölümündekiyle aynı: kırmızı bir uyarı çoğu
zaman haksız yere çalar ve iki haftada okumadan geçmeyi öğrenirsin.</p>
<h3>Raf yazmıyorsa</h3>
<p>Kalemin rafı «girilmemiş» yazar ve kaç kalemin rafı olmadığı söylenir; ürünü
kendin bulman gerekir. Akış durmaz. Rafı <a href="#yerlestirme">Yerleştir</a>
ekranında ürünü okutarak bir kez yazarsın, hep işine yarar.</p>
<h3>İlk adımda ürün barkodu okuttuysan</h3>
<p>Ekran bunun bir <strong>ürün kodu</strong> olduğunu söyler ve o ürünü bekleyen,
kargoya verilmemiş siparişleri listeler — üstüne basıp o siparişle devam
edersin. Bekleyen sipariş yoksa bunu söyler.</p>
<h3>Kod bulunamazsa</h3>
<p>Ekran sebebini ayrı ayrı söyler:</p>
<ul>
<li><strong>Hiçbir satışta yok</strong> — çoğu zaman o satışa gönderi numarası
henüz girilmemiştir; satış detayından girip tekrar deneyin.</li>
<li><strong>Kargoya verilmiş</strong> — paketlenecekler arasında çıkmaz.</li>
<li><strong>Onay bekliyor</strong> — sipariş pazaryerinden API ile gelmiş, önce
onaylanmalı; stok düşünce burada paketlenir.</li>
<li><strong>İptal edilmiş.</strong></li>
</ul>
<p>Bu ekran yalnız <em>paketlenmeyi bekleyen</em> siparişleri gösterir.</p>
${sikHata([
  {
    hata: "Ürünü okutmadan Paketlendi aramak",
    cozum: "Düğme bilerek kilitli. Önce raftan aldığın ürünü okut; doğrulama olmadan işaret atılmaz.",
  },
  {
    hata: "Çok adetli kalemde tek okutmayla yetinmek",
    cozum: "Ekran kaç tane okutulduğunu «1/3» diye yazar. Kutuya koyduğun her adedi okut; eksik okutulan kalem tam teyitli sayılmaz.",
  },
  {
    hata: "Sipariş numarası yerine sadece kargo kodunu denemek",
    cozum: "İkisi de olur. Elindeki kâğıtta hangisi yazıyorsa onu okut.",
  },
  {
    hata: "«Bu siparişte yok» yazısını hata sanmak",
    cozum: "Hata değil, bilgi. Yanlış ürünü almış olabilirsin ya da o ürün sisteme farklı bir kodla girilmiş olabilir. Akış devam eder.",
  },
])}
</section>

<section id="yerlestirme">
${baslik("yerlestirme")}
<p><strong>Sol menü → Yerleştir</strong>. Bir ürünün <strong>hangi rafta
durduğunu</strong> sisteme yazdığın ekran budur. Akış tek yönlü: önce
<strong>raf etiketini</strong> okutursun, sonra o rafa koyduğun ürünleri
<strong>peş peşe</strong> okutursun. Raf seçili kalır; her ürün için yeniden
raf okutmana gerek yok.</p>
${neZaman(
  "Kargo açıp malı rafa koyarken. Ürünü rafa yerleştirdiğin an okut; sonraya bırakılan yerleştirme yapılmaz. Raf düzenini değiştirirken de buradasın.",
)}
${ekranSemasi("Yerleştir", [
  { no: 1, ad: "1 · Raf etiketini okutun", aciklama: "Raf kodu kutusu (örn. RAF-SLN1-2) · kamera · «Rafı seç». Seçilince raf kodu ve «Bu rafa kayıtlı N ürün var» yazar.", genis: true, vurgulu: true },
  { no: 2, ad: "2 · Ürünleri okutun", aciklama: "Barkod, SKU ya da Firma SKU · kamera · «Yerleştir».", genis: true },
  { no: 3, ad: "Bu oturumda yerleştirilenler", aciklama: "Okuttuğun her ürün, önceki yeriyle birlikte.", genis: true },
])}
${adimlar([
  {
    ad: "Raf etiketini okutun",
    ne: "Rafın üstündeki etiketi (QR ya da barkod) okutun ya da kodunu yazıp <strong>«Rafı seç»</strong>e basın. Kod yoksa <strong>«Bu kodda bir raf yok»</strong>, raf pasifse <strong>«… rafı pasif — buraya ürün yerleştirilemez»</strong> yazar.",
  },
  {
    ad: "Ürünleri peş peşe okutun",
    ne: "Her okutmada ürün seçili rafa yazılır ve listenin başına eklenir. Raf seçmeden ürün okutursanız ekran <strong>«önce raf etiketini okutun»</strong> der ve hiçbir şey yazmaz.",
  },
  {
    ad: "Sonucu kontrol edin",
    ne: "Her satırın altında ne olduğu yazar: <strong>«Önceki yeri: …»</strong> (ürün başka raftan taşındı), <strong>«İlk kez yerleştirildi»</strong> (daha önce yeri kayıtlı değildi) ya da <strong>«Zaten bu raftaydı — doğrulandı»</strong>.",
  },
])}
<h3>Rafı nasıl değiştirirsin</h3>
<p>Başka bir rafın önüne geçtiğinde <strong>o rafın etiketini okut</strong>
&mdash; ekran <strong>«Raf değişti: …»</strong> yazar ve bundan sonraki ürünler yeni
rafa yazılır. Raf etiketini ürün kutusuna da okutsan olur; sistem kodun raf
olduğunu anlar.</p>
<h3>Bu ekran STOĞA DOKUNMAZ</h3>
<p>Yazılan tek şey ürünün <strong>yeri</strong>dir. Adet değişmez, stok
hareketi oluşmaz, kâr hesabı etkilenmez. Yanlış rafa okutursan düzeltmesi
kolay: doğru rafı okut, ürünü tekrar okut. Bir ürünün tek bir kayıtlı rafı
olur; yeni rafa yazılınca eski yeri yerine geçer.</p>
<h3>Bir rafın tamamını başka rafa taşımak</h3>
<p>Raf düzenini değiştirdiğinde ürünleri tek tek okutmana gerek yok.
Yerleştir ekranındaki <strong>«Bir rafın tamamını başka rafa taşı»</strong>
bağlantısı <strong>Toplu raf taşıma</strong> ekranını açar:</p>
${adimlar([
  {
    ad: "1 · Kaynak raf (nereden)",
    ne: "Ürünlerin şu an durduğu rafı okutun. Ekran o rafta kaç ürün olduğunu yazar; raf boşsa «Kaynak rafta ürün yok» der.",
  },
  {
    ad: "2 · Hedef raf (nereye)",
    ne: "Ürünlerin gideceği rafı okutun. Kaynakla aynı raf ya da pasif bir raf seçerseniz taşıma yapılmaz ve nedeni yazar.",
  },
  {
    ad: "Taşınacakları seçin",
    ne: "Varsayılan olarak rafın <strong>tamamı</strong> seçili gelir («N üründen N seçili»). «Hepsini seç» ve «Seçimi temizle» düğmeleriyle ya da tek tek işaretleyerek değiştirirsiniz. Bir kısmını seçerseniz ekran <strong>«Bu kısmî bir taşıma»</strong> diye uyarır ve kaç ürünün eski rafta kalacağını söyler.",
  },
  {
    ad: "«Taşı»",
    ne: "Düğmenin üstünde <strong>kaç ürünün hangi raftan hangi rafa</strong> gideceği yazar. Bastığınızda ürünlerin yeri değişir; stok adedi değişmez.",
  },
])}
<div class="ek-not"><div class="etiket">Yanlış taşıdıysan</div>
<p>Geri almak için ayrı bir düğme yok &mdash; gerekmiyor da: aynı ekranda
<strong>hedefi kaynak, kaynağı hedef</strong> yapıp geri taşırsın. Bunu
kısmî taşımadan sonra yaparsan eski rafta zaten duran ürünler de seçili gelir;
yalnız geri götürmek istediklerini bırak.</p></div>
<div class="ek-not"><div class="etiket">Bir rafta ne var, buradan değil Barkod okut'tan</div>
<p>Bir rafta hangi ürünlerin stoğu olduğunu görmek için raf etiketini
<a href="#okuma">Barkod okut</a> ekranında okut: rafın ürünleri adetleriyle
listelenir.</p></div>
${sikHata([
  {
    hata: "Raf okutmadan ürün okutmak",
    cozum:
      "Ekran &quot;önce raf etiketini okutun&quot; der ve hiçbir şey yazmaz. Yukarıdaki kutuya rafı okut, sonra devam et.",
  },
  {
    hata: "Rafı değiştirmeyi unutup ürünleri eski rafa yazmak",
    cozum:
      "Üstteki kutuda hangi rafın seçili olduğu ve o rafa kaç ürün kayıtlı olduğu her zaman yazar. Yeni rafın önüne geçtiğinde etiketini okut. Yanlış rafa yazılanları doğru rafı okutup ürünleri tekrar okutarak düzeltirsin.",
  },
  {
    hata: "«Birden fazla ürüne uyuyor» uyarısını geçiştirmek",
    cozum:
      "Okuttuğun kod iki ürüne birden ait; sistem hangisini rafa yazacağını bilemez ve hiçbirini yazmaz. Ürün kartlarından çakışan kodu düzelttirin; o arada ürünü SKU'suyla okutabilirsin.",
  },
])}
</section>

<section id="malKabul">
${baslik("malKabul")}
<p><strong>Sol menü → Mal kabul.</strong> Seçili aralıkta depoya fiilen
<strong>giren</strong> ürünleri ürün düzeyinde listeler: aynı ürün birden çok
alımla gelmişse adetleri tek satırda toplanır. Paneldeki «Mal kabul» sayısına
tıklayınca da bu liste açılır. Mal kabulün kendisi burada <strong>yapılmaz</strong> —
o iş alımın içinden yapılır (bkz. <a href="#alim">Alım ve mal kabul</a>).</p>
${neZaman(
  "Gün sonunda «bugün depoya ne girdi» diye bakmak için; ve yeni gelen malı satışa açmadan önce hangi ürünün kanal kodunun eksik olduğunu görmek için.",
)}
${ekranSemasi("Mal kabul", [
  { no: 1, ad: "Arama", aciklama: "Barkod, SKU ya da ürün adı. Okuyucu ve kamera destekli.", genis: true },
  { no: 2, ad: "Zaman süzgeci", aciklama: "Hangi aralığın girişleri. Seçilmezse tüm zamanlar." },
  { no: 3, ad: "Ürün çeşidi · Gelen adet", aciklama: "Listenin toplamı: kaç farklı ürün, toplam kaç adet.", vurgulu: true },
  { no: 4, ad: "Kanal kodu eksik", aciklama: "Kaç üründe en az bir kanal kodu eksik. Kutuya tıklanınca yalnız onlar kalır; tekrar tıklayınca süzgeç kalkar." },
  { no: 5, ad: "Tablo", aciklama: "Barkod · ürün · gelen adet · raf · her satış kanalı için bir sütun.", genis: true },
])}
<h3>Tablodaki sütunlar</h3>
<ul>
<li><strong>Barkod:</strong> yanındaki ikonla tek tıkta kopyalanır.</li>
<li><strong>Ürün:</strong> tıklanınca ürünün kârlılık kartı açılır.</li>
<li><strong>Gelen adet:</strong> aralıkta stoğa giren sağlam adet. Liste en çok gireni
üstte gösterir.</li>
<li><strong>Raf:</strong> ürünün <strong>şu anki</strong> rafı (mal kabulde seçilen son raf).</li>
<li><strong>Kanal sütunları — Kod var / Kod yok:</strong> satış hesabı olan her pazaryeri
için bir sütun. «Kod yok» rozeti <strong>tıklanabilir</strong>: Kanal kodları
ekranını o ürünün barkoduyla süzülmüş ve yeni eşleme formu hazır hâlde açar.</li>
</ul>
<div class="ek-not"><div class="etiket">Neden kod önemli</div>
<p>Kanal kodu olmayan ürüne o pazaryeri için stok ve fiyat gönderilemez
(bkz. <a href="#kanalGonderim">Kanala stok ve fiyat göndermek</a>). Yeni gelen
malı satışa açmadan önce «Kod yok» rozetlerini kapatın.</p></div>
${sikHata([
  {
    hata: "Sipariş verdiğim alımı bu listede aramak",
    cozum: "Burada yalnız mal kabulü YAPILMIŞ girişler görünür. Sipariş verilmiş ama henüz gelmemiş alımlar Alımlar listesinde «Sipariş verildi» durumunda bekler.",
  },
  {
    hata: "Listenin boş çıkmasını «mal kabul kaydedilmedi» sanmak",
    cozum: "Önce zaman süzgecine bakın: seçili aralıkta giriş olmayabilir. Aralığı genişletin ya da süzgeci kaldırın.",
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

<h3>Alımlar listesi</h3>
<p><strong>Sol menü → Alımlar.</strong> Her satırda tarih (tıklanınca alım açılır),
altında tedarikçi sipariş no, <strong>alım kodu</strong> (tek tıkla kopyalanır),
kanal hesabı, ürün (tıklanınca kârlılık kartı açılır) ile adet · kalem · kart
bilgisi, tutar ve durum yazar.</p>
<ul>
<li><strong>Arama:</strong> alım kodu, sipariş no ya da tedarikçi. Kodu okutabilirsiniz (okuyucu ya da kamera).</li>
<li><strong>Süzgeçler:</strong> <em>Tarih ekseni</em> (sipariş tarihi ya da mal kabul
tarihi) · durum · kanal hesabı · tedarikçi · kart · zaman aralığı. Tarih ekseni
en baştadır, çünkü «ne aldım» ile «ne geldi» ayrı sorulardır. Liste boş çıkarsa
ekran öteki eksende kaç kayıt olduğunu söyler ve geçiş bağlantısı verir.</li>
<li><strong>Süzgeç toplamı:</strong> listenin üstünde, ekranda süzülen alımların
toplam tutarı ve toplam sipariş adedi. İptal edilen alımlar toplama girmez,
ayrı yazar.</li>
<li><strong>Excel:</strong> ekrandaki süzgeci aynen uygulayarak indirir.</li>
<li><strong>Satır düğmeleri:</strong> Detay · Düzenle · İptal · <strong>Mal Kabul</strong>
(yalnız henüz tamamen teslim alınmamış alımlarda).</li>
</ul>
<div class="ek-tablo"><table>
<thead><tr><th>Durum</th><th>Anlamı</th></tr></thead>
<tbody>
<tr><td><strong>Sipariş verildi</strong></td><td>Yeni alım bu durumla kaydedilir; mal henüz gelmedi</td></tr>
<tr><td><strong>Kısmen teslim alındı</strong></td><td>Kalemlerin bir kısmı kabul edildi, kalanı bekleniyor</td></tr>
<tr><td><strong>Teslim alındı</strong></td><td>Bütün kalemler kabul edildi</td></tr>
<tr><td><strong>İptal</strong></td><td>Kayıt silinmez; listede üstü çizili ve soluk durur</td></tr>
</tbody></table></div>

<h3>1. Alım girme</h3>
<p><strong>Sol menü → Alımlar</strong>, sağ üstte <strong>Yeni Alım</strong>. Ürün
detay sayfasındaki <strong>Alım gir</strong> düğmesinden gelirseniz ürün kalem
olarak hazır eklenmiş gelir.</p>
${adimlar([
  { ad: "Alım bilgileri", ne: "<strong>Alım no</strong> elle girilmez — kaydedince sistem tedarikçi kodundan üretir. <strong>Tedarikçi</strong> zorunludur; listede yoksa yanındaki <strong>+</strong> ile ad ve kod girip formdan çıkmadan ekleyin. <strong>Tedarikçi sipariş no</strong> isteğe bağlıdır ve okutulabilir. <strong>Alım tarihi</strong> zorunludur." },
  { ad: "Kanal hesabı, kart, taksit", ne: "Alım bir pazaryerinden yapıldıysa ALIŞ hesabını seçin. <strong>Ödenen kart</strong> seçilirse alım o kartın borcuna yazılır. <strong>Taksit sayısı</strong> 1–36 arası; 1 = tek çekim." },
  { ad: "Kalemler", ne: "«Ürün ekle» kutusuna barkodu okutun ya da kod/ad yazın. Okutunca kalem doğrudan eklenir; aynı ürün tekrar okutulursa adedi artar. Kod birden çok ürüne uyuyorsa sistem seçmez, listeden sizin seçmeniz istenir. Ürün yoksa «Yeni ürün oluştur» yeni sekmede açılır, form kaybolmaz." },
  { ad: "Adet, birim fiyat, para birimi", ne: "Her kalemde adet, <strong>birim fiyat</strong> ve para birimi (TRY/EUR). Bedava gelen ürün için <strong>Promosyon</strong> kutusunu işaretleyin — maliyet 0 olur. Promosyon işaretsizken 0 yazılırsa form kaydetmez." },
  { ad: "Alımı Kaydet", ne: "Alım «Sipariş verildi» durumunda kaydedilir. Stok henüz değişmez." },
])}

<h3>Fatura yapısı — KDV, kargo, gümrük</h3>
<p>Formdaki <strong>Fatura yapısı</strong> kutusu faturanın nasıl yazıldığını sorar.
Varsayılanı tedarikçiden gelir (<strong>Tanımlar → Tedarikçiler → Düzenle</strong>:
«Fiyatlar KDV dahil», «Kargo fiyata dahil»); alımda değiştirebilirsiniz.</p>
<ul>
<li><strong>Fiyatlar KDV dahil</strong> (varsayılan, çoğu perakende alım): birim fiyatı
KDV dahil yazarsınız.</li>
<li><strong>KDV hariç fatura</strong> (toptan alım): birim fiyatı KDV hariç yazar,
<strong>KDV tutarını faturadan</strong> girersiniz (zorunlu). Sistem bunu ürünlerin
KDV oranlarıyla hesapladığı tutarla kıyaslar; fark varsa <strong>uyarı</strong>
verir ama kaydı engellemez — esas olan faturadır.</li>
<li><strong>Kargo ayrı</strong> yazılmışsa kargo tutarı girilir (ücretsizse 0);
<strong>gümrük ve ithalat masrafı</strong> (yurtdışı alım) varsa o da. Ayrı ödenen
KDV, kargo ve gümrük kalemlere <strong>tutar oranında dağıtılır ve ürün
maliyetine girer</strong>. Yurtdışı alımda gümrükte ödenen KDV «KDV tutarı»na,
gümrük vergisi ve masraflar «gümrük» alanına yazılır.</li>
</ul>
<p>Formun altındaki kutu üç rakamı birlikte gösterir: <strong>fatura toplamı</strong>,
<strong>karta yazılacak</strong> tutar (gümrük karta yazılmaz) ve stoğa yazılacak
<strong>birim maliyet</strong> (payı dağıtılmış hâli). Para birimleri ayrı toplanır,
birbirine çevrilmez.</p>
<div class="ek-not dikkat"><div class="etiket">TL ve EUR aynı alımda</div>
<p>TL ve EUR kalemli bir alıma ayrıca KDV, kargo ya da gümrük tutarı
girilirse bu tutar kalemlere dağıtılamaz (kur çevrilmez) ve kayıt yapılamaz.
Alımı para birimine göre ikiye ayırın.</p></div>

<h3>Alımı düzeltmek ya da iptal etmek</h3>
<ul>
<li><strong>Düzenle</strong> (listede ya da alım detayında): mal kabul yapılmış
alımda da adet ve maliyet düzeltilebilir. Sipariş adedi kabul edilmiş adedin
altına indirilemez; mal kabulü yapılmış kalem çıkarılamaz. Maliyeti değiştirince
o partinin stok defterindeki maliyeti de düzelir, ama <strong>geçmiş satışların
kârı DEĞİŞMEZ</strong> — bundan sonraki satışlar doğru maliyeti kullanır.</li>
<li><strong>Geçmiş satışların kârını da düzeltmek</strong> için: o satışın detayında,
düştüğü partinin yanındaki <strong>Maliyeti düzelt</strong>. Önce «Önce göster» ile
kaç satışın kârının ne kadar değişeceği görünür; onay kutusu ve sebep
zorunludur. Stok adedi değişmez.</li>
<li><strong>İptal:</strong> yalnız mal kabul yapılmamış alımda. Onay ister; kayıt
silinmez, listede iptal olarak kalır. Mal kabul yapılmış alım iptal edilemez.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Birim maliyeti boş ya da yanlış bırakmayın. Maliyeti olmayan bir partiden satış
yapıldığında sistem kârı hesaplayamaz ve kârı sıfır da saymaz.</p></div>

<h3>2. Mal kabul</h3>
<p>Alım detayında <strong>Mal Kabul Et</strong> düğmesi; listede aynı iş satırdaki
<strong>Mal Kabul</strong> düğmesiyle açılır.</p>
${adimlar([
  { ad: "Teslim tarihi", ne: "Malın geldiği gün. Sipariş tarihinden önceyse ya da sipariş çok eskiyse ekran uyarır — geçmiş bir alım giriyorsanız tarihi düzeltin." },
  { ad: "Barkodla say (isteğe bağlı)", ne: "Gelen ürünü okutun; her okutma o kalemin <strong>sağlam</strong> sayacını 1 artırır. <strong>Hasarlı modu</strong> açıkken okutma <strong>hasarlı</strong> sayacını artırır. Kalan adet aşılırsa uyarır; alımda olmayan kod okutulursa «bulunamadı» der." },
  { ad: "Her kalem için sayılar", ne: "<strong>Gelen sağlam</strong> ve <strong>gelen hasarlı</strong> ayrı girilir; yanında beklenen · gelen · hasarlı · kalan rozetleri durur. <strong>Yerleştirilen raf</strong> ürünün mevcut rafıyla dolu gelir, değiştirebilirsiniz. Hasarlı varsa <strong>hasar notu</strong> yazın." },
  { ad: "Mal Kabulü Kaydet", ne: "Onay penceresi kaç adedin stoğa gireceğini söyler. Onaylayınca sağlam adet stoğa girer; hasarlı adet stoğa girmez, yalnız kalemde kayda geçer. Ürünün rafı, yerleştirdiğiniz raf olur." },
])}
<ul>
<li><strong>Parçalı teslimat olabilir:</strong> bugün 3, yarın 2 kabul edersiniz. Kalan
adetler için aynı düğmeyle tekrar gelinir.</li>
<li>Teslim tarihi o ürünün <strong>son sayımından önceyse</strong> «Sayım koruması»
çıkar: devam etmek için sebep seçip onay kutusunu işaretlemeniz gerekir ve o
ürünün sayımı geçersizleşir. Kapalı bir muhasebe dönemine yazıyorsanız da
benzer bir onay istenir.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Mal kabul geri alınamaz</div>
<p>Stok hareketleri silinmez. Yanlış bir giriş, ters yönde bir düzeltme kaydıyla
giderilir.</p></div>
${sikHata([
  {
    hata: "Mal kabul yapmadan “stok yok” demek",
    cozum: "Alım kaydı stok ARTIRMAZ; mal fiilen gelince Mal Kabul yapılır. Panelde “mal kabul bekleyen” kutusu tam bunun için var.",
  },
  {
    hata: "Alış fiyatına kargo/kupon etkisini yansıtmamak",
    cozum: "Sistem KASADAN FİİLEN ÇIKAN tutarı taşır. Kuponla ucuza aldıysan o ucuz rakam doğrudur — “piyasa değeri” yazılmaz.",
  },
  {
    hata: "Alımı düzenleyip geçmiş satışların kârının da düzeldiğini sanmak",
    cozum: "Alım düzenleme yalnız bundan sonraki satışları etkiler. Geçmiş satışın kârı için satış detayındaki «Maliyeti düzelt» kullanılır.",
  },
])}
</section>

<section id="stok">
${baslik("stok")}
<p><strong>Sol menü → Stok</strong>. Hangi üründen kaç adet olduğu ve
<strong>nerede durduğu</strong>. Ürün listesi "ne satıyorum" sorusuna,
bu ekran "elimde ne var" sorusuna cevap verir. Ürün listesinden farkı:
burada her satır bir <strong>varyant</strong>tır.</p>
${neZaman(
  "Sipariş toplarken (mal hangi rafta), yeniden sipariş verirken (ne bitti), sayım yaparken (sistem ne diyor, rafta ne var) ve bir ürünün stoğunun neden öyle olduğunu merak ettiğinde.",
)}
${ekranSemasi("Stok", [
  { no: 1, ad: "Başlık", aciklama: "«N varyant · toplam N adet» ve «Excel indir».", genis: true },
  { no: 2, ad: "Arama", aciklama: "Ürün adı, SKU veya barkod — okutabilirsiniz (kamera dahil).", genis: true },
  { no: 3, ad: "Sırala ve süzgeçler", aciklama: "Sırala: Ürün adı · Adet · Son hareket · Sıfır stokluları gizle · Raf yaşı · Kanalda kodu yok.", genis: true },
  { no: 4, ad: "Liste", aciklama: "Ürün · Varyant · Firma SKU · Barkod · Raf · Mevcut stok · Son hareket · Eylemler.", genis: true, vurgulu: true },
])}
${adimlar([
  {
    ad: "Başlığa bakın",
    ne: "Süzgece uyan varyant sayısı ve toplam adet yazar. <strong>Excel indir</strong> ekrandaki aramayı ve süzgeçleri dosyaya taşır.",
  },
  {
    ad: "Arayın ya da okutun",
    ne: "Ürünün adını, SKU'sunu ya da barkodunu yazın; elinizdeki ürünü USB okuyucuyla ya da kamerayla da okutabilirsiniz.",
  },
  {
    ad: "Sıralayın ve süzün",
    ne: "<strong>Sırala</strong> çiplerinden birine basınca liste ona göre dizilir; aynı çipe tekrar basmak yönü çevirir (ok işareti yönü gösterir). <strong>«Sıfır stokluları gizle»</strong> stoğu biten varyantları gizler. <strong>Raf yaşı</strong> ve <strong>«Kanalda kodu yok»</strong> çipleri aşağıda anlatılıyor.",
  },
  {
    ad: "Listeyi okuyun",
    ne: "<strong>Raf</strong> sütunu malın durduğu raf kodudur; boşsa «—» yazar. <strong>Mevcut stok</strong> o varyantın bütün stok hareketlerinin toplamıdır. Altında <strong>«N ayrıldı»</strong> rozeti varsa o kadar adet açık bir iade/değişim bildirimi için ayrılmıştır — stoktan düşülmemiştir, yalnız söz verilmiştir. <strong>Son hareket</strong> en son giriş ya da çıkışın tarihidir. Satırın sonundaki düğmeler: <strong>Hareketler</strong> (bu varyantın stok sayfası) ve <strong>Ürün kartı</strong>.",
  },
])}

<h3>Raf yaşı süzgeci</h3>
<p>Çip sırasından bir aralık seçince liste <strong>o kadar gündür rafta
bekleyen</strong> ürünlere daralır: <strong>15 gün ve altı · 16&ndash;30 ·
31&ndash;45 · 46&ndash;60 · 61&ndash;90 · 91&ndash;180 · 181 günden fazla</strong>.
Aynı çipe tekrar basmak süzgeci kaldırır. Süzgeç açıkken listenin üstünde hangi
süzgecin açık olduğu ve <strong>«Temizle»</strong> bağlantısı yazar.</p>
<p><strong>Yaş</strong>, o üründeki <strong>en eski açık partinin</strong> giriş
tarihinden bugüne geçen gündür &mdash; ortalama yaş ya da son giriş değil. FIFO'da
satılacak ilk mal en eski partidir; "rafta en uzun bekleyen para" odur. Üstüne
mal eklemek yaşı <strong>sıfırlamaz</strong>.</p>
<div class="ek-not"><div class="etiket">Aralıklar üst sınır DAHİL</div>
<p>&quot;16&ndash;30&quot; demek <strong>16 ile 30 arası, ikisi de dahil</strong>
demektir. Bitişik aralıklar ne çakışır ne boşluk bırakır: 30 günlük bir kalem
<em>yalnız</em> 16&ndash;30'da, 31 günlük kalem <em>yalnız</em> 31&ndash;45'te
görünür. Bu yüzden aralıkların kalem sayıları toplandığında raftaki toplam
çıkar.</p></div>
<div class="ek-not"><div class="etiket">Renkler ile aralıklar birbirini tutar</div>
<p>Satırlardaki uyarı renkleri <strong>31</strong> ve <strong>61</strong> günde
değişir (amber ve kırmızı). Aralıklar bu sınırlara göre kuruldu, dolayısıyla
<strong>bir aralığın içinde iki farklı renk çıkmaz</strong>: 15 ve altı ile
16&ndash;30 nötr, 31&ndash;45 ile 46&ndash;60 amber, kalan üçü kırmızıdır.
Panelin &quot;ölü sermaye&quot; uyarısına tıklayınca da aynı ekran açılır.</p></div>

<h3>«Kanalda kodu yok» çipleri</h3>
<p><strong>«Kanalda kodu yok:»</strong> etiketinin yanında her pazaryeri için bir çip
durur. Birine basınca o pazaryerinde <strong>Kanal SKU'su tanımlı olmayan</strong>
varyantlar listelenir. Bu çip "kodu yok" der, "satışta değil" demez — satışta olup
olmadığını <a href="#kanalListeleme">Kanal Listeleme</a> ekranı söyler.</p>

<h3>Bir varyantın stok sayfası (Hareketler)</h3>
<p>Satırdaki <strong>Hareketler</strong> düğmesi o varyantın sayfasını açar:</p>
<ul>
<li><strong>Mevcut stok</strong> ve altında elinizdeki açık partilerin birim maliyeti
(ya da ortalaması) ile toplam tutarı (KDV dahil, ödenen). Maliyeti bilinmeyen parti
varsa toplama girmediği ayrıca yazar. <strong>«Partileri gör»</strong> Kârlılık
kartındaki parti listesini açar.</li>
<li><strong>Kodlar</strong> kutusu: SKU, Firma SKU, barkod — tık-kopyala.</li>
<li><strong>Stok düzeltme</strong> formu (aşağıda).</li>
<li><strong>Hareket geçmişi</strong>: Tarih · Tip (Alım girişi, Satış çıkışı, İade
girişi, Düzeltme, Sayım farkı…) · Adet · Kaynak · Birim maliyet. Kaynak sütunundaki
bağlantı sizi ilgili alıma ya da satışa götürür.</li>
</ul>

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

<h3>Stok düzeltme — satış, alım ve iade dışındaki hareketler</h3>
<p>Kırılma, kayıp, fire ya da sayım farkı için varyantın stok sayfasındaki
<strong>Stok düzeltme</strong> formu kullanılır:</p>
${adimlar([
  {
    ad: "Ne oldu?",
    ne: "<strong>Stoktan düş</strong> (mal gitti: kırıldı, kayboldu, fire — maliyeti en eski partiden düşer) ya da <strong>Stoğa ekle</strong> (sayımda fazla çıktı — yeni bir parti olarak girer).",
  },
  {
    ad: "Neden",
    ne: "Listeden bir neden seçin. Nedenler Tanımlar → Düzeltme nedenleri ekranından gelir; her nedenin bir yönü vardır ve yanlış yönde kullanılamaz. Bazı nedenlerde açıklama zorunludur.",
  },
  {
    ad: "Adet ve tarih",
    ne: "Adet tam sayı ve pozitif yazılır; yönü yukarıdaki seçim belirler. Stoktan düşerken elinizdekinden fazlasını yazarsanız kayıt yapılmaz ve elinizde kaç adet olduğu söylenir.",
  },
  {
    ad: "Birim maliyet (yalnız «Stoğa ekle»de)",
    ne: "Biliyorsanız yazın. Boş bırakılırsa bu parti «değeri bilinmeyen stok» olur ve satıldığında kârı hesaplanamaz.",
  },
  {
    ad: "«Düzeltmeyi kaydet»",
    ne: "Kayıt sonradan silinemez; yanlış girerseniz ters yönde ikinci bir düzeltmeyle kapatılır.",
  },
])}
<div class="ek-not dikkat"><div class="etiket">Sayılmış ürüne geriye dönük kayıt</div>
<p>Ürün fiziksel sayımda sayıldıysa ve siz sayımdan <strong>önceki</strong> bir
tarihe kayıt girerseniz form durur, <strong>«Sayım koruması»</strong> kutusu çıkar ve
ne olacağını söyler. Devam etmek için onay kutusunu işaretleyip bir sebep seçmeniz
gerekir; bu durumda o ürünün sayımı geçersizleşir ve yeniden sayılması istenir.
Kapatılmış bir muhasebe dönemine yazarken de benzer bir onay sorulur.</p></div>
${sikHata([
  {
    hata: "Stok rakamını elle düzeltmeye çalışmak",
    cozum: "Elle yazılan rakam nedenini taşımaz. Rafları saymak için Barkod okut → Sayım başlat kullan; tek bir üründe fark çıktıysa o ürünün Hareketler sayfasından DÜZELTME hareketi gir ve nedenini seç — üç ay sonra o farkın neden oluştuğu okunabilir olur.",
  },
  {
    hata: "Eksik çıkan malı düzeltmeyle düşmek, oysa satılmıştı",
    cozum: "Mal satıldıysa doğru kayıt SATIŞTIR; düzeltme ciroya girmez ve kâr kaybolur. Düzeltme yalnız gerçekten kırılan, kaybolan ya da sayım hatası olan mal içindir.",
  },
  {
    hata: "Rafı boş bırakmak",
    cozum: "Raf yazılmazsa toplama sırasında malı aramak zorunda kalırsın. Depo büyüdükçe bu dakikalar toplanır. Raf, Yerleştir ekranından ürün okutularak kolayca yazılır.",
  },
])}
</section>

<section id="urun">
${baslik("urun")}
<p><strong>Sol menü → Ürünler</strong>. Sattığınız ve aldığınız her şeyin
kataloğu. Stok, alım ve satış ekranları ürünü buradan tanır.</p>
${neZaman(
  "Yeni bir ürün almadan ÖNCE — sistemde kaydı yoksa alım girişi yapamazsın. Bir de bir ürünün kodlarına, stoğuna ya da pazaryeri ilanına hızlıca bakmak istediğinde.",
)}
${ekranSemasi("Ürünler", [
  { no: 1, ad: "Başlık ve bağlantılar", aciklama: "Kayıt sayısı · Şüpheli ürünler · SKU önizlemesi · Ürün etiketi bas. Sağda «Excel indir» ve «Yeni Ürün».", genis: true },
  { no: 2, ad: "Arama ve süzgeç", aciklama: "Ad, marka, SKU, barkod, kanal kodu ya da sipariş no ile arama (kamera dahil) · «Stokta olmayanları gizle».", genis: true },
  { no: 3, ad: "Liste", aciklama: "Ürün · Pazaryeri · Firma SKU + Barkod · Toplam stok · Oluşturma · Eylemler.", genis: true, vurgulu: true },
])}
${adimlar([
  {
    ad: "Başlık ve bağlantılar",
    ne: "Başlığın altında süzgece uyan <strong>toplam kayıt sayısı</strong> yazar (sayfadaki satır değil, hepsi). Üç bağlantının ne işe yaradığı aşağıda anlatılıyor. <strong>Excel indir</strong> ekrandaki aramayı ve süzgeci olduğu gibi dosyaya taşır.",
  },
  {
    ad: "Arama ve süzgeç",
    ne: "Arama kutusuna yazın ya da barkodu okutun; ad, marka, SKU, Firma SKU, barkod, kanal kodu, eski Firma SKU, hatta bir siparişin numarası ile ürün bulunur. <strong>«Stokta olmayanları gizle»</strong> yalnız toplam stoğu sıfırdan büyük ürünleri bırakır; tekrar basınca süzgeç kalkar.",
  },
  {
    ad: "Listeyi okuyun",
    ne: "<strong>Ürün</strong> sütununda resim, ad ve marka durur; ada basınca doğrudan o ürünün <strong>Kârlılık kartı</strong> açılır (çok varyantlı üründe ürün sayfası açılır, varyantı siz seçersiniz). <strong>Pazaryeri</strong> sütunu her kanalın ilanına giden bağlantıyı taşır (hangi kanalların görüneceği Kanal Hesapları ekranında seçilir). <strong>Firma SKU</strong> ve <strong>barkod</strong> yanındaki simgeyle tek tıkta kopyalanır. <strong>Toplam stok</strong> bütün varyantların toplamıdır. Satırın sonundaki düğmeler: <strong>Detay · Alım gir · Düzenle · Sil</strong>.",
  },
])}

<h3>Rozetler ne demek</h3>
<ul>
<li><strong>pasif</strong> — ürün kullanımdan kaldırılmış.</li>
<li><strong>Varyantları pasif — aramada çıkmaz</strong> — ürün aktif görünse bile bütün varyantları pasif; okutmada ve formlarda bulunmaz.</li>
<li><strong>N varyantı pasif</strong> — bir kısmı pasif; diğerleri satılabilir.</li>
<li><strong>«Kanal adı» kodu: …</strong> — aradığınız kod bu ürünün o pazaryerindeki kodu çıktı.</li>
</ul>

<h3>Ürün ve varyant</h3>
<p>Her ürünün en az bir <em>varyantı</em> vardır. Formda ilk soru şudur:
<strong>«Bu üründe beden/renk gibi varyant var mı?»</strong> «Hayır, tek çeşit»
derseniz arka planda tek bir varsayılan varyant açılır. «Evet, varyantlı»
derseniz her varyantın kendi SKU, Firma SKU, barkod ve rafı olur. Stok, SKU ve
barkod her zaman varyant seviyesindedir — ürün seviyesinde stok yoktur.</p>
<p>Tişörtün M ve L bedeni: <strong>bir ürün, iki varyant.</strong></p>

<h3>Yeni ürün açmak</h3>
${adimlar([
  {
    ad: "Ürünler → «Yeni Ürün»",
    ne: "Önce arama kutusunda barkodla arayın; ürün zaten varsa yenisini açmayın.",
  },
  {
    ad: "Ürün bilgileri",
    ne: "<strong>Ürün adı</strong> (zorunlu), <strong>marka</strong> ve <strong>kategori</strong>. Kategori KDV oranını belirler; seçilmezse ekranda «varsayılan %20 kullanılır» uyarısı çıkar. <strong>KDV istisnası</strong>nı normalde boş bırakın — doldurulursa kategori oranını ezer. <strong>Desi</strong>yi girin: kargo ücreti bundan hesaplanır, varyantlar aynı desiyi paylaşır.",
  },
  {
    ad: "Kodlar",
    ne: "<strong>SKU</strong> ve <strong>Firma SKU</strong> zorunludur. SKU'nun yanındaki <strong>«Öner»</strong> düğmesi Firma SKU'yu <strong>KATEGORİ-MARKA-SIRA</strong> biçiminde üretir (SKU boşsa onu da doldurur). Öneri için kategorinin ve markanın kodu tanımlı olmalı; değilse düğmenin altında ne eksik olduğu ve nereden düzeltileceği yazar. <strong>Barkod (EAN)</strong> alanına kutudaki barkodu okutun; kamera simgesiyle telefondan da okutabilirsiniz.",
  },
  {
    ad: "Raf ve aktiflik",
    ne: "Varyantın durduğu <strong>raf</strong>ı seçin (henüz raf yoksa Raf konumları sayfasına bağlantı çıkar). <strong>«Aktif»</strong> işaretli varyant aramada, okutmada ve formlarda çıkar.",
  },
  {
    ad: "«Ürünü Kaydet»",
    ne: "Aynı kod başka bir üründe varsa kayıt yapılmaz ve hangi üründe olduğu yazar («Ürüne git» · «Bu ürüne alım ekle»). Adı benzeyen ürün varsa sistem <strong>«Benzer N ürün bulundu — aynısı olabilir mi?»</strong> diye sorar: aynısıysa «Var olana git», gerçekten farklıysa «Hayır, bu farklı ürün — devam et».",
  },
])}

<div class="ek-not dikkat"><div class="etiket">Hareket görmüş ürünün kodu kilitlenir</div>
<p>Bir üründe stok hareketi, alım, satış ya da iade kaydı oluştuktan sonra
<strong>SKU ve Firma SKU değiştirilemez</strong> — kod etikete basılıp ürüne
yapıştırılmış olabilir. Düzenleme ekranında bu yazar; diğer alanları
değiştirebilirsiniz. Aynı sebeple stok hareketi olan ürün <strong>silinemez</strong>;
kullanımdan kaldırmak için pasife alınır. Hareketi olmayan ürünü «Sil» ile
silebilirsiniz; sistem onay ister ve bu işlem geri alınamaz.</p></div>

<h3>Ürün sayfası (Detay)</h3>
<p>Ürünün KDV oranını ve <strong>nereden geldiğini</strong> (ürün istisnası ·
kategori · varsayılan), desisini ve varyant tablosunu gösterir: her varyantın
SKU, Firma SKU, barkod, raf ve stoğu, yanında Kârlılık kartı bağlantısı.
Üstte <strong>Alım gir</strong> ve <strong>Düzenle</strong> düğmeleri durur.</p>

<h3>Resim eklemek</h3>
<p>Resmi olan üründe resmin üstüne gelince (telefonda dokununca) büyük hâli
açılır. Resmi olmayan ürünün yerinde, köşesinde <strong>+</strong> işareti olan gri
bir kutu durur; ona basınca <strong>«Resim ekle»</strong> açılır (ürün düzenleme
yetkisi gerekir). Resmin <strong>linkini</strong>
yapıştırırsınız: pazaryeri ya da üretici sayfasında resme sağ tıklayıp «Resim
adresini kopyala» deyin. Link <strong>https://</strong> ile başlamalı ve resim
önizlemede açılmadan kaydedilmez.</p>

<h3>Pasif ürünü yeniden aktif etmek</h3>
<p>Pasif ürün aramalarda, okutmada ve alımda çıkmaz; kaydı ve geçmişi durur.
Aktif etmek için ürünü <strong>Düzenle</strong>, varyantın <strong>Aktif</strong>
kutusunu işaretleyin. Pasif bir kaydı aktif etmek için üç bilgi
<strong>zorunludur</strong>: geçerli <strong>EAN</strong> (son hanesi tutan gerçek
barkod), <strong>kategori</strong> ve marka tablosunda kayıtlı bir
<strong>marka</strong> (Tanımlar → Markalar). Eksik varsa kayıt yapılmaz ve ekranda
ne eksik olduğu yazar. En az bir varyantı aktif olan ürün aktif sayılır.</p>

<h3>Ürünler ekranındaki üç bağlantı</h3>
<ul>
<li><strong>Şüpheli ürünler: N</strong> — barkodu olmayan, gerçek EAN olmayan ya da
Trendyol'da o EAN ile bulunamayan aktif ürünler; sebebi yazar. Listeyi indirip
Excel'de «Doğru EAN» ve «Bu ürün sizin mi» sütunlarını doldurur, geri
yüklersiniz. Önce önizleme gösterilir (kaç ürüne EAN yazılacak, kaç ürün pasife
alınacak, kaç satırda hata var), onayınız olmadan hiçbir şey yazılmaz. «Hayır»
denen ürün pasife alınır — silinmez, geri açılabilir. «Kimlik» sütununa dokunmayın.</li>
<li><strong>SKU önizlemesi</strong> — yeni Firma SKU biçimi
<strong>KATEGORİ-MARKA-SIRA</strong> (örn. OYU-LEG-0001). Bu ekran <strong>hiçbir şey
değiştirmez</strong>, yalnız her ürünün hangi kodu alacağını ve kod alamayanların
nedenini (kategorisi yok · kategorisinin kodu yok · markası tabloya bağlı değil ·
kod çakışıyor) gösterir. Arama kutusu ve «Listeyi indir» vardır. Eski kodlar
aramada ve okutmada bulunmaya devam eder.</li>
<li><strong>Ürün etiketi bas</strong> — ürünü arayın, yanına kaç etiket basılacağını
yazın, <strong>Yazdır</strong>'a basın. Önce <strong>etiket ölçüsünü</strong> seçin.
Etikette Firma SKU barkodu, kodun kendisi ve ürün adı yazar. Yazdırma
penceresinde etiket yazıcınızı ve aynı ölçüyü seçin — rulo bu ölçüde olmalı,
yoksa etiketler kayar.</li>
</ul>

<div class="ek-not"><div class="etiket">Kısayol</div>
<p>Kod girilen her alan barkod okuyucuyla çalışır. USB okuyucu kodu yazıp Enter'a
basar; telefonda kamerayla da okutabilirsiniz. Listedeki «Alım gir» düğmesi alım
formunu o ürün seçili hâlde açar — ürünü bir daha aramazsınız.</p></div>
${sikHata([
  {
    hata: "Aynı ürünü ikinci kez açmak",
    cozum: "Almadan önce barkodla ARA. Aynı ürün iki kayıtla durursa stok ikiye bölünür ve kârlılık kartı iki ayrı yerde yarım rakam gösterir. Sistemin «Benzer ürün bulundu» sorusunu okumadan «devam et» demeyin.",
  },
  {
    hata: "Barkod ile SKU’yu karıştırmak",
    cozum: "Barkod (EAN) ÜRETİCİNİN kodudur, kutunun üstünde yazar. SKU sistemin kendi kodu. Firma SKU ise senin fiziksel etiketin. Üçü ayrı alan, üçü de aranabilir.",
  },
  {
    hata: "Kategori seçmeden kaydetmek",
    cozum: "Kategorisiz ürünün KDV'si varsayılan %20 sayılır ve SKU önerisi çıkmaz. Ürünün gerçek oranı farklıysa kâr hesabı da kayar — kategoriyi baştan seçin.",
  },
])}
</section>

<section id="kanalSku">
${baslik("kanalSku")}
<p>Kanal SKU, sistemdeki ürününüz ile <strong>o ürünün bir pazaryeri
mağazasındaki karşılığı</strong> arasındaki köprüdür. Ekranın menüdeki adı
<strong>Kanal kodları</strong>dır (Ürün ve kanal grubunda). Kurulumun en çok atlanan
adımıdır ve atlanınca ilk satışta karşınıza çıkar.</p>
${neZaman(
  "Bir ürünü yeni bir pazaryerinde satmaya başlamadan önce; pazaryeri komisyon oranlarını güncellediğinde (haftalık); ve panelde «kârı hesaplanamayan satış» gördüğünde.",
)}

<h3>İki işi vardır</h3>
<ol class="adimlar">
<li><div><h3>Eşleme — "bu ürün orada hangi kodla duruyor?"</h3>
<p>Sizin SKU'nuz sizindir; pazaryerinin stok kodu pazaryerinindir. İkisi
birbirini bilmez. Kanal SKU bu iki kodu birbirine bağlar. Bir sipariş
geldiğinde "bu hangi ürünüm?" sorusunun cevabı buradan çıkar; okutmada ve
aramada da kanal kodu bulunur.</p></div></li>
<li><div><h3>Komisyon oranını taşımak — asıl sebep budur</h3>
<p>Komisyon oranı ürüne göre <em>ve</em> pazaryerine göre değişir. Aynı
oyuncak bir pazaryerinde başka, ötekinde başka oran öder. Bu yüzden oran
ürün kartında değil, <strong>ürün × mağaza</strong> kesişiminde —
yani Kanal SKU'da — tutulur.</p></div></li>
</ol>

<p><strong>Sol menü → Kanal kodları</strong>. Ekranın düzeni:</p>
${ekranSemasi("Kanal kodları", [
  { no: 1, ad: "Başlık", aciklama: "Açıklama ve sağda «Komisyon oranı içe aktarma» düğmesi.", genis: true },
  { no: 2, ad: "Oranı eksik uyarısı", aciklama: "«N eşlemede komisyon oranı yok» · «Komisyon listesi aktar».", genis: true, vurgulu: true },
  { no: 3, ad: "Hakedişten: fiilen ödediğiniz komisyon", aciklama: "Her satış hesabının gerçek oran aralığı ve tipik oranı." },
  { no: 4, ad: "Yeni eşleme", aciklama: "Ürün · Kanal hesabı · Kanal kodu · Komisyon oranı (%)." },
  { no: 5, ad: "Süzgeç ve liste", aciklama: "Kanal hesabı seçimi · arama · «Yalnız oranı eksik olanlar» · eşleme listesi.", genis: true },
])}
${adimlar([
  {
    ad: "Başlık",
    ne: "Pazaryerinin kendi ürün listesinden oranları topluca yüklemek için <strong>«Komisyon oranı içe aktarma»</strong> (aşağıda).",
  },
  {
    ad: "Oranı eksik uyarısı",
    ne: "Oranı boş eşleme varsa sarı kutu kaç tane olduğunu söyler: bu ürünler o kanalda satıldığında kâr hesaplanamaz. Yanındaki düğme doğrudan toplu yüklemeye götürür.",
  },
  {
    ad: "Hakediş bandı",
    ne: "Hakediş dosyalarınızdaki <strong>gerçekten kesilen</strong> komisyonlardan hesaplanır: «%alt – %üst · tipik %X (N siparişten)». Tahmin değildir; her hakediş yüklemesinden sonra kendiliğinden güncellenir. Kanal bazındadır, ürün bazında değil — kampanyalı bir ürünün oranı bandın dışında olabilir.",
  },
  {
    ad: "Yeni eşleme",
    ne: "<strong>Ürün ara</strong> (ad, SKU, Firma SKU ya da barkod) ile ürünü seçin, <strong>Kanal hesabı</strong>nı seçin, <strong>Kanal kodu</strong>nu yazın (boş bırakırsanız sistemdeki SKU kullanılır) ve <strong>Komisyon oranı (%)</strong>nı girin (0 ile 100 arası). <strong>«Eşlemeyi ekle»</strong>.",
  },
  {
    ad: "Süzgeç ve liste",
    ne: "Üstte toplam eşleme sayısı yazar. Her satırda ürün, mağaza, hesabın rolü (satış / alış), kanal kodu (kopyalanabilir), komisyon oranı ve oranın en son ne zaman güncellendiği durur. Oranı boş satırda <strong>«oran eksik»</strong> rozeti çıkar.",
  },
])}

<h3>Satırdaki düğmeler</h3>
<ul>
<li><strong>Düzenle</strong> (kalem simgesi) — kanal kodunu ve oranı değiştirirsiniz.
Girdiğiniz oran o mağazanın hakediş bandının dışındaysa «Alışılmadık…» uyarısı
çıkar; yine de kaydedebilirsiniz.</li>
<li><strong>Pasife al / Aktifleştir</strong> (güç simgesi) — eşlemeyi silmeden
kullanımdan kaldırır ya da geri açar.</li>
<li><strong>Sil</strong> (çöp kutusu) — onay ister. Eşleme silinince o kanaldaki
komisyon oranı da gider; geçmiş satışlar etkilenmez.</li>
</ul>

<div class="ek-not dikkat"><div class="etiket">Atlanırsa ne olur</div>
<p>Satış kaydedilir, stok düşer, sipariş kaybolmaz — <strong>ama kâr
hesaplanamaz.</strong> Satış listesinde net kâr yerine <strong>kural
eksik</strong> yazar. Sistem komisyon oranını uydurmaz; uydurulmuş bir kâr
rakamı, boş bir hücreden çok daha tehlikelidir.</p>
<p>Oranı sonradan girip satış detayındaki <strong>Yeniden Hesapla</strong>
düğmesine basmanız yeterli — satış silinip yeniden girilmez.</p></div>

<h3>Satış hesabı, alış hesabı</h3>
<p>Kanal SKU bir <em>pazaryerine</em> değil, bir <strong>kanal hesabına</strong>
bağlıdır. Aynı pazaryerinde iki mağazanız varsa (hesap başına alım limiti
nedeniyle bu normaldir) her mağazanın kendi stok kodu ve kendi oranı olabilir.
Bu yüzden eşleme her mağaza için ayrı girilir.</p>
<p>Komisyon yalnız <strong>satış</strong> hesabında anlamlıdır. <strong>Alış</strong>
hesabında (mal aldığınız hesap) kanal kodu ürünün o hesaptaki karşılığıdır;
listede «alış hesabı — komisyon yok» yazar ve oran sorulmaz.</p>

<div class="ek-not"><div class="etiket">Aynı kod iki ürüne verilemez</div>
<p>Bir kanal kodu aynı mağazada başka bir üründe kullanılıyorsa, ya da başka bir
ürünün SKU / Firma SKU / barkodu ise eşleme yapılmaz ve hangi ürün olduğu yazar.
Aynı kod iki ürüne uyarsa okutmada sistem hangisi olduğunu bilemez. Aynı
ürünün aynı mağazada ikinci eşlemesi de açılmaz — «Var olan eşlemeye git» ile
eskisini düzenleyin.</p></div>

<h3>Oran haftalık değişir — ve geçmiş bozulmaz</h3>
<p>Pazaryerleri komisyon oranlarını düzenli olarak günceller
(<strong>Trendyol salı</strong>, <strong>Hepsiburada çarşamba</strong>).
Oran değişince Kanal SKU'daki değeri güncellersiniz.</p>
<div class="ek-not"><div class="etiket">Neden böyle</div>
<p>Satış anında geçerli oran <strong>satış kaydının içine kopyalanır</strong>.
Yani bugün oranı değiştirmeniz, geçen ayki satışların kârını değiştirmez.
Kâr rakamı bir kere hesaplanır ve o günün gerçeğiyle donar; yoksa kapanmış bir
ayın kârı her hafta oynardı. Buradaki oran bundan sonraki satışlara önerilir.</p></div>

<h3>Yüzlerce oranı tek tek girmeyin — Komisyon oranı içe aktarma</h3>
<p>Kanal kodları ekranındaki <strong>«Komisyon oranı içe aktarma»</strong> düğmesi
pazaryerinin satıcı panelinden indirdiğiniz <strong>ürün listesi</strong> dosyasını
okur ve oranları toplu yazar.</p>
${adimlar([
  {
    ad: "Dosyayı indirin",
    ne: "Trendyol'da <em>Ürünler → Ürünlerim → Excel'e aktar</em>; Hepsiburada'da <em>Listelerim → İndir</em>; N11'de «Komisyon Oranı» sütunlu toplu ürün dökümü (Ürün Bilgileri Güncelle sayfası).",
  },
  {
    ad: "Mağazayı seçip dosyayı yükleyin, «Denetle»",
    ne: "Hangi pazaryerine ait olduğu dosyanın kendisinden anlaşılır; seçtiğiniz mağazanın kanalıyla uyuşmayan dosya reddedilir. Alış hesabı seçilirse de reddedilir — komisyon yalnız satış mağazasında anlamlıdır.",
  },
  {
    ad: "«Ne olacak?» önizlemesini okuyun",
    ne: "Okunan satır · boş oran dolacak · oran değişecek · yeni eşleme · zaten aynı · bizde yok · oran okunamadı. Dolu oranın üzerine yazılacaklar eski → yeni biçiminde listelenir. Sistemde olup o mağazada kodu tanımlı olmayan ürünler için <strong>eşleme kendiliğinden açılır</strong>. Dosyada olup sistemde olmayan ürünler atlanır ve sayısı söylenir.",
  },
  {
    ad: "«Onayla ve yaz»",
    ne: "Onay sorusundan sonra hepsi tek seferde yazılır; bir şey ters giderse hiçbiri yazılmaz. Sonuçta kaç oranın güncellendiği, kaç eşlemenin açıldığı ve bu mağazada oranı hâlâ boş kaç eşleme kaldığı yazar.",
  },
])}
<p>Aynı dosyayı ikinci kez yüklemek zararsızdır: değişen bir şey yoksa «Hiçbir şey
değişmedi» der.</p>
<div class="ek-not dikkat"><div class="etiket">Kampanya / teklif dosyası komisyon listesi değildir</div>
<p>Pazaryerinin «Avantajlı Teklifler» ya da «Ürün Komisyon Teklifleri» dosyasını
ürün listesi kutusuna yüklerseniz reddedilir: içindeki düşük oranlar ancak
fiyatı düşürürseniz geçerlidir. Bu dosyalar <strong>Veri → Komisyon yükleme</strong>
ekranında, kanalın kartındaki ayrı kutuya yüklenir (bkz. <a href="#komisyonKapisi">Komisyon
yükleme</a>); orada o dosyadan yalnız <strong>«Mevcut Komisyon»</strong> sütunu —
kanalın bugünkü gerçek oranı — alınır, teklif oranlarına hiç bakılmaz.</p></div>

<h3>Ne zaman girilir</h3>
<ul>
<li><strong>Ürünü ilk satışa çıkarmadan önce.</strong> Alım yapmak için gerekmez, satış için gerekir.</li>
<li>Sadece <strong>gerçekten sattığınız</strong> mağazalar için girin. Satmadığınız kanal için eşleme açmak boş iş.</li>
<li>Kanal kodları ekranından tek tek, <strong>Veri → Veri Aktarımı</strong> ile topluca, ya da <strong>Komisyon oranı içe aktarma</strong> ile pazaryerinin kendi ürün listesinden.</li>
</ul>

<div class="ek-not"><div class="etiket">Eksik eşlemeni nasıl görürsün</div>
<p>Hangi ürünün hangi mağazada tanımlı olduğunu ve <strong>hangilerinde komisyon
oranı boş kaldığını</strong> Kanal kodları ekranındaki <strong>«Yalnız oranı eksik
olanlar»</strong> süzgecinden görürsün. Belirli bir pazaryerinde kodu olmayan
varyantları ise Stok ekranındaki <strong>«Kanalda kodu yok»</strong> çipleri gösterir.
Telefondaki Menü'de Kanal kodları simgesinin üstündeki sayı da oranı eksik eşleme
sayısıdır.</p></div>

<div class="ek-not"><div class="etiket">KDV oranı uyuşmayan ilanlar</div>
<p>Uyarı çanındaki «N ilanda KDV oranı uyuşmuyor» satırına basınca bu ekran
«KDV oranı uyuşmayan N ilan» süzgeciyle açılır ve satırlarda <strong>«KDV: ilanda %X · bizde %Y»</strong>
rozeti çıkar. Sistem hangisinin yanlış olduğunu bilemez: ilan yanlışsa
pazaryerinde düzeltin, ürün kartı yanlışsa rozete basıp ürünün kategorisini ya
da KDV istisnasını düzeltin. «Süzgeci kaldır» ile normal listeye dönersiniz.</p></div>

${sikHata([
  {
    hata: "Kanal kodunu boş bırakıp pazaryerinin kodunun farklı olduğunu unutmak",
    cozum: "Kanal kodu boşsa sistem sizin SKU'nuzu kullanır. Pazaryerinde ürün başka bir kodla duruyorsa siparişler bu ürüne bağlanamaz. Pazaryerinin kendi stok kodunu yazın — toplu içe aktarma bunu kendiliğinden yapar.",
  },
  {
    hata: "Teklif dosyasındaki düşük oranı gerçek oran sanmak",
    cozum: "Teklif oranı ancak fiyatı düşürürseniz geçerlidir. Gerçek oran için pazaryerinin ürün listesini kullanın; teklif dosyası yalnız Komisyon yükleme ekranındaki kampanya kutusuna yüklenir.",
  },
  {
    hata: "Oran güncellenince eski satışların kârının değişmesini beklemek",
    cozum: "Eski satışlar kendi günündeki oranla donmuştur. Bir satışın oranı gerçekten yanlış girildiyse o satıştaki «Yeniden Hesapla» kullanılır.",
  },
])}
</section>

<section id="kanalListeleme">
${baslik("kanalListeleme")}
<p><strong>Sol menü → Kanal Listeleme</strong> (Ürün ve kanal grubunda). Bir ürünün
<strong>rafınızda durması</strong> ile <strong>pazaryerinde satışta olması</strong>
ayrı şeylerdir. Bu ekran ikisini yan yana koyar ve tek bir soruyu cevaplar:
<strong>hangi malım satılamıyor?</strong></p>
${neZaman(
  "Haftada en az bir kez, ve panelde «Rafta var, vitrinde yok» kutusunda bir sayı gördüğünde. Satışların beklenmedik düştüğü bir kanalda da önce buraya bak.",
)}
${ekranSemasi("Kanal Listeleme", [
  { no: 1, ad: "Son karşılaştırma", aciklama: "Pazaryeriyle en son ne zaman karşılaştırıldığı.", genis: true },
  { no: 2, ad: "Beş kutu", aciklama: "Stok var, kanalda kapalı · Satışa açık · Stoksuz · Pasif · Ölçülmemiş — her birinde «aç».", genis: true, vurgulu: true },
  { no: 3, ad: "Süzgeç ve arama", aciklama: "Kanal hesabı · Listeleme durumu · ürün adı, SKU, Firma SKU, barkod veya kanal kodu ile arama.", genis: true },
  { no: 4, ad: "Listelemeler", aciklama: "Her satır bir ürünün bir mağazadaki ilanı; sayfa sayfa.", genis: true },
])}
${adimlar([
  {
    ad: "Rakamların yaşına bakın",
    ne: "En üstte <strong>«Kanalla son karşılaştırma: bugün»</strong> ya da <strong>«… N gün önce — rakamlar o kadar eski»</strong> yazar. 2. günden itibaren bu satır sarı yanar.",
  },
  {
    ad: "Kutuları okuyun",
    ne: "Her kutu bir sayı ve <strong>«aç»</strong> bağlantısı taşır. «aç»a basınca liste o kutunun durumuna süzülür; kutudaki sayı ile listedeki satır sayısı aynıdır.",
  },
  {
    ad: "Süzün ve arayın",
    ne: "<strong>Kanal hesabı</strong> seçimiyle tek bir mağazaya, <strong>Listeleme durumu</strong> seçimiyle tek bir duruma daralırsınız. Arama kutusu kamerayla da çalışır. Listenin üstünde kaç kaydın gösterildiği yazar.",
  },
  {
    ad: "Listeyi okuyun",
    ne: "Her satırda ürün adı (basınca Kârlılık kartı açılır), SKU ve kanal kodu (kopyalanabilir), mağaza, <strong>Bizdeki stok</strong>, <strong>Kanaldaki adet</strong> ve sağda durum rozeti durur. Stoğu olup kanalda kapalı duran satırlar <strong>renkli zeminle</strong> ve «satılamıyor» rozetiyle en üste dizilir; içlerinde parası büyük olan önce gelir.",
  },
])}

<h3>İlk kutu en önemlisi</h3>
<p><strong>"Stok var, kanalda kapalı"</strong> — elinizde mal var ama
pazaryerinde o ürün satılabilir değil. O mal rafta duruyor, para bağlı ve
<strong>kimse satın alamıyor.</strong> Kutunun «aç» bağlantısı tam o ürünlerin
listesini açar.</p>

<div class="ek-not dikkat"><div class="etiket">Yanındaki para neyin parası</div>
<p>Kutudaki tutar <strong>son sattığınız fiyat × elinizdeki adet</strong>tir —
pazaryerinin bugünkü etiket fiyatı değil, çünkü sistem onu saklamıyor. Hiç
satılmamış bir üründe fiyat yoktur; o satır <strong>sayılır ama tutara
girmez</strong> ve kutu kaç ürünün fiyatının bilinmediğini kendisi yazar. Yani
rakam bir <strong>alt sınırdır</strong>, gerçek kayıp daha büyük olabilir.</p></div>

<h3>Öteki kutular</h3>
<ul class="liste">
<li><strong>Satışa açık</strong> — pazaryeri satıyor, sorun yok.</li>
<li><strong>Stoksuz</strong> — pazaryerinde adet sıfır görünüyor ya da ilan
vitrine çıkmamış. Sizde de stok yoksa bu normaldir. <strong>Sizde stok varsa</strong>
aynı ürün ilk kutuda da sayılır: pazaryerine stok bildirmeniz gerekir (bkz.
<a href="#kanalGonderim">Kanala stok ve fiyat göndermek</a>).</li>
<li><strong>Pasif</strong> — ilan kapalı ya da onay bekliyor. Sebebi ürün kilidi
olabilir (arşiv, kara liste, kilit), pazaryerinin onayı bekleniyor olabilir, ya da
siz kendiniz kapatmış olabilirsiniz.</li>
<li><strong>Ölçülmemiş</strong> — bu kayıtlar pazaryeriyle <em>hiç
karşılaştırılmadı.</em> Kutunun altında da yazdığı gibi bu <strong>"temiz"
demek değildir</strong>; "bakmadık" demektir ve ikisi karıştırılmaz. Kanal kodu
yeni girilmiş ürünler bir sonraki karşılaştırmaya kadar burada durur.</li>
</ul>

<div class="ek-not dikkat"><div class="etiket">Rakamların yaşına bakın</div>
<p>Bayat bir rakam taze sanılırsa yanlış karar verdirir — bu yüzden yaş her zaman
görünür. Karşılaştırma <strong>her sabah kendiliğinden</strong> yapılır; ekran iki
günden eskiyse otomatik karşılaştırma bir sabah koşmamış olabilir — yöneticinize
haber verin.</p></div>

<h3>Bu ekran pazaryerine bir şey yazar mı?</h3>
<p><strong>Hayır.</strong> Sadece okur. Listeleme durumu pazaryerinin
cevabıdır; sistem onu değiştirmez, yalnız size gösterir. Kapalı bir ilanı yeniden
satışa açmak için pazaryerinin kendi panelini kullanırsınız; stoğu pazaryerine
bildirmek ise ayrı bir iştir (bkz. <a href="#kanalGonderim">Kanala stok ve fiyat
göndermek</a>).</p>

${sikHata([
  {
    hata: "«Ölçülmemiş» kutusundaki ürünleri sorunsuz saymak",
    cozum: "Ölçülmemiş = hüküm yok. O ürünlerin satışta olup olmadığını sistem bilmiyor. Ertesi sabahki karşılaştırmadan sonra tekrar bakın.",
  },
  {
    hata: "Kutudaki tutarı kesin kayıp sanmak",
    cozum: "Tutar son satış fiyatından hesaplanır ve fiyatı bilinmeyen ürünler toplama girmez; gerçek rakam bunun üstünde olabilir. Hüküm için tutara değil, listedeki ürünlere bakın.",
  },
  {
    hata: "Ekranda bir ilanı açmaya çalışmak",
    cozum: "Bu ekran yalnız gösterir. İlanı pazaryerinin kendi panelinden açın; ertesi sabahki karşılaştırmada ekran kendiliğinden düzelir.",
  },
])}
</section>

<section id="kanalGonderim">
${baslik("kanalGonderim")}
<p>Stok ve fiyat <strong>kendiliğinden</strong> pazaryerine gitmez. ${UYGULAMA.ad}'daki
rakamı pazaryerindeki ilana <strong>siz göndermedikçe</strong> ilan olduğu gibi
kalır. Gönderim düğmeleri ürünün detay sayfasında, her varyantın satırında
durur: <strong>Sol menü → Ürünler</strong>, ürünü bulun, adına tıklayın.</p>
${neZaman(
  "Mal kabul ya da sayım sonrası kanaldaki stok " + UYGULAMA.ad + "'dakinden farklıysa; ve bir kanalda fiyat değiştirmeye karar verdiğinde.",
)}
${ekranSemasi("Ürünler → ürün detayı → varyant satırı", [
  { no: 1, ad: "TY'ye Gönder · N11'e Gönder · HB'ye Gönder", aciklama: "Her kanalın kendi düğmesi. Stok ve/veya fiyat o kanala gider." },
  { no: 2, ad: "Stoğu bağlı kanallara gönder", aciklama: "Tek düğme, bütün bağlı kanallar. YALNIZ stok gider, fiyata dokunulmaz.", vurgulu: true },
  { no: 3, ad: "Kârlılık kartı", aciklama: "Aynı satırdaki bağlantı; gönderimle ilgisi yok, ürünün geçmişini açar." },
])}
<div class="ek-not"><div class="etiket">Düğmeleri göremiyorsanız</div>
<p>Kanal düğmeleri yalnız <strong>kanala yazma</strong> yetkisi olan kullanıcıya
çizilir. Yetkiniz yoksa satırda yalnız «Kârlılık kartı» bağlantısı görünür.
Telefonda düğmeler varyant kartının altında, alt alta sarılarak durur.</p></div>

<h3>Stok — tek düğme, bütün bağlı kanallar</h3>
${adimlar([
  { ad: "«Stoğu bağlı kanallara gönder»e basın", ne: "Pencere açılır ve önce kanalların bilgisi alınır. Her kanal için bir satır çıkar: <em>«Kanal: stok X → kanalda şu an Y»</em>. X sistemdeki stok, Y kanalın bildirdiği adettir (kanal söylemezse «ölçülmedi» yazar)." },
  { ad: "Atlanacak kanalları okuyun", ne: "Gönderilemeyecek kanal <em>«GÖNDERİLMEYECEK — sebep»</em> diye yazar. En sık sebep: ürünün o kanalda ilanı yok ya da ilan bu ürünle eşleştirilmemiş. Hiçbir kanala gidemiyorsa düğme kapalı kalır ve sebebi yazar." },
  { ad: "«Stoğu gönder (N kanal)» ile onaylayın", ne: "Rakamlar görünmeden düğme açılmaz. Gönderince her kanalın sonucu AYRI satırda yazar: biri reddederse ötekiler etkilenmez. Cevap yarım dakikayı bulabilir." },
])}
<p>Sonuç satırları ne demek:</p>
<ul>
<li><strong>Trendyol — «işlendi»:</strong> Trendyol kabul etti. «işliyor…» yazıyorsa
pencere 2 dakikaya kadar kendisi sorar; 2 dakikada bitmezse birkaç dakika
sonra Trendyol panelinden bakın.</li>
<li><strong>N11 — «N11 isteği aldı»:</strong> istek kuyruğa girdi; sonucu henüz geri
okunamıyor. Birkaç dakika sonra N11 panelinden kontrol edin.</li>
<li><strong>Hepsiburada:</strong> «görüldü, tamam» · «henüz görünmüyor» · «hâlâ
işliyor» · «kabul etmedi» — dört sonuçtan biri yazar.</li>
</ul>

<h3>Fiyat — her kanalın kendi düğmesi</h3>
<p>Fiyat kanal başına ayrı bir karardır: komisyon ve rekabet her kanalda
farklıdır. Bu yüzden «hepsine aynı fiyat» düğmesi yoktur. <strong>TY'ye
Gönder</strong>, <strong>N11'e Gönder</strong> ve <strong>HB'ye Gönder</strong>
ayrı ayrı çalışır.</p>
${adimlar([
  { ad: "Kanalın düğmesine basın", ne: "Pencerede sistemdeki stok, kanalın bildirdiği adet ve ilanın kodu görünür." },
  { ad: "Ne göndereceğinizi seçin", ne: "«Stoğu gönder» kutusu ve fiyat alanı ayrı. Fiyat alanını <strong>boş bırakırsanız fiyata dokunulmaz</strong>. İkisi de boşsa «gönderilecek bir şey yok» der." },
  { ad: "«Gönder»", ne: "Onaylamadan hiçbir şey kanala gitmez. Sonuç pencerede yazar. Trendyol işlerken pencereyi kapatırsanız gönderim iptal olmaz; sonucu birkaç dakika sonra Trendyol panelinden görürsünüz." },
])}
<div class="ek-not dikkat"><div class="etiket">Kanal kuralları</div>
<p><strong>N11:</strong> fiyat güncellemesinde liste fiyatı (üstü çizilen) ve satış
fiyatı <strong>birlikte</strong> gönderilir; liste fiyatı satış fiyatından
<strong>yüksek</strong> olmalı (eşit olamaz) ve küsurat en fazla 2 hane olur.
Kurala uymayan istek kanala hiç gönderilmez.<br>
<strong>Hepsiburada:</strong> yayındaki fiyatlardan çok sapan bir fiyatı
reddedebilir ya da kilitleyebilir; olursa sebebi ve önerilen aralık pencerede
yazar. Stok ile fiyat ayrı işlenir.<br>
<strong>Trendyol:</strong> barkodu (EAN) olmayan ürün gönderilemez — önce ürün
kartına barkod girin.</p></div>
${sikHata([
  {
    hata: "Trendyol'a aynı gönderimi hemen tekrar denemek",
    cozum: "Trendyol aynı isteği 15 dakika içinde ikinci kez kabul etmez — bu bir arıza değil, kanalın kuralı. Biraz bekleyip tekrar deneyin.",
  },
  {
    hata: "Ürün kanalda görünmüyor diye gönderim yapmak",
    cozum: "Gönderim yalnız VAR OLAN ve eşleştirilmiş ilana yazar. İlan yoksa önce kanalın panelinden açılır, sonra Kanal kodları ekranında eşleştirilir. Pencere bu durumda «bu ürün kanala bağlı değil» der.",
  },
  {
    hata: "«Stoğu bağlı kanallara gönder»in fiyatı da güncellediğini sanmak",
    cozum: "O düğme yalnız STOK gönderir; hiçbir kanalda fiyata dokunmaz. Fiyat için kanalın kendi düğmesini kullanın.",
  },
])}
</section>

<section id="komisyon">
${baslik("komisyon")}
<p>Komisyon, kârın en büyük kesintisidir ve <strong>her üründe, her
pazaryerinde farklıdır</strong>; üstelik pazaryerleri oranları her hafta
değiştirir. Sistem oranı ürün × satış hesabı düzeyinde, <strong>Kanal
SKU</strong> eşlemesinin üstünde tutar. Oran boşsa o üründe o kanalda yapılan
satışın kârı <strong>hesaplanamaz</strong>.</p>

${neZaman(
  "Pazaryeri komisyon oranlarını güncellediğinde. Trendyol SALI ve CUMA yayımlar, Hepsiburada ÇARŞAMBA. Yüklemezsen sistem eski oranla hesap yapar ve NET yanlış çıkar. Kanal kodları ekranında «komisyon oranı yok» uyarısı gördüğünde de buraya gelinir.",
)}

<h3>İki ayrı şey, karıştırma</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Ne</th><th>Nereden yüklenir</th><th>Ne işe yarar</th></tr></thead>
<tbody>
<tr><td><strong>Tek oran</strong> (ürün dökümü)</td><td><a href="#komisyonKapisi">Komisyon yükleme</a> → kanal kartı → «Haftalık komisyon oranı (ürün dökümü)»</td><td><strong>Kâr hesabını</strong> besler: satış anında kayda yazılan oran budur</td></tr>
<tr><td><strong>Dilim tarifesi</strong></td><td><a href="#komisyonKapisi">Komisyon yükleme</a> → kanal kartı → «Haftalık dilimli komisyon tarifesi»</td><td>Fiyata göre değişen oran — fiyat denemesi ve oran denetimi bunu kullanır</td></tr>
</tbody></table></div>
<p>Biri «bugün oranın ne», öteki «hangi fiyatta hangi oran» sorusunu cevaplar.
Hepsiburada ve N11 kartında üçüncü bir kutu da vardır: «Kampanya dosyasından
güncel oran» — teklif dosyasından <strong>yalnız «Mevcut Komisyon» sütununu</strong>
alır. Ayrıntısı <a href="#komisyonKapisi">Komisyon yükleme</a> bölümünde.</p>

<h3>Tek oranı yüklemek — adım adım</h3>
${ekranSemasi("Komisyon yükleme", [
  { no: 1, ad: "Kanal kartı", aciklama: "Her SATIŞ hesabı için bir kart. Kartın başında son yükleme tarihi yazar. Alış hesapları burada çıkmaz — komisyon yalnız sattığın mağazada anlamlı." },
  { no: 2, ad: "Dosya yükle", aciklama: "İlgili kutudaki düğme. Kabul edilen biçim .xlsx ve .xls." },
  { no: 3, ad: "Denetle", aciklama: "HİÇBİR ŞEY YAZILMAZ. Ne olacağı sayılarla gösterilir." },
  { no: 4, ad: "Onayla ve yaz", aciklama: "Bir onay penceresi daha açılır. Tek seferde yapılır: bir şey ters giderse hiçbiri yazılmaz.", vurgulu: true },
])}
${adimlar([
  { ad: "Kanalın panelinden dosyayı indirin", ne: "Trendyol: <em>Ürünler → Ürünlerim → Excel'e aktar</em> · Hepsiburada: <em>Listelerim → İndir</em> · N11: toplu ürün dökümü («Komisyon Oranı» sütunlu). Dosyayı dönüştürmeden, indirdiğiniz gibi yükleyin." },
  { ad: "Yükleme ekranını açın", ne: "<strong>Sol menü → Komisyon yükleme</strong>. Doğru mağazanın kartını bulun, «Haftalık komisyon oranı (ürün dökümü)» kutusunda <strong>Dosya yükle</strong>." },
  { ad: "Denetle", ne: "Önizleme kutuları çıkar: <em>Okunan satır · Boş oran dolacak · Oran değişecek · Yeni eşleme · Zaten aynı · Bizde yok · Oran okunamadı · Yazılacak</em>. Değişecek oranlar «eski → yeni» diye listelenir." },
  { ad: "Onayla ve yaz", ne: "Sonuçta kaç oranın güncellendiği, kaç yeni eşleme açıldığı ve bu mağazada oranı hâlâ boş kalan eşleme sayısı yazar." },
])}
<div class="ek-not"><div class="etiket">Önizlemedeki kutular ne demek</div>
<p><strong>Yeni eşleme:</strong> ürün kataloğunuzda var ama bu mağazada kanal kodu
yoktu; dosyadaki kod eşleme olarak açılır.<br>
<strong>Bizde yok:</strong> dosyada geçen ama sistemde kaydı olmayan ürün — atlanır,
hiçbir veriye dokunmaz. Ürünü ekledikten sonra aynı dosyayı yeniden
yükleyebilirsiniz.<br>
<strong>Oranı boş kalacak:</strong> eşlemenin kodu dosyada hiç geçmiyor. Oranı
<strong>Kanal kodları</strong> ekranından elle girilir.</p></div>

<h3>Oranı elle girmek ya da düzeltmek</h3>
<p><strong>Sol menü → Kanal kodları.</strong> Her eşleme satırında «Komisyon %» sütunu
ve düzenleme düğmesi vardır. Ekranın üstünde turuncu bir kutu «N eşlemede
komisyon oranı yok» diyorsa, yanındaki <strong>Komisyon listesi aktar</strong>
düğmesi sizi toplu yükleme ekranına götürür. Hakediş dosyası yüklendiyse
ekranda <em>«Hakedişten: fiilen ödediğiniz komisyon»</em> bandı da görünür —
kanalın gerçekten kestiği oran aralığı; elle oran girerken «normal ne kadar»
sorusunun cevabıdır.</p>
<div class="ek-not"><div class="etiket">Oran değişince geçmiş değişmez</div>
<p>Satış anındaki oran satışa yazılır. Buradaki oranı değiştirmek
<strong>geçmiş satışları etkilemez</strong>; bundan sonraki satışlara önerilir.</p></div>

<h3>Dilim tarifesi — haftalık rutin</h3>
<p>Trendyol <strong>fiyat indirimi karşılığında komisyon indirir</strong>: aynı
ürün 2.000 ₺'ye %10, 1.750 ₺'ye satılırsa %7 komisyon alabilir. Bu yüzden tek
bir oran yetmez; dilimli bir tarife gelir.</p>
<div class="ek-not dikkat"><div class="etiket">Kaçırılırsa geri alınamaz</div>
<p>Tam dilimli ileri tarife <strong>arşivden inmiyor.</strong> O hafta
indirilmezse bir daha elde edilemez ve fiyat denemesi o dönem için hüküm
veremez. Her <strong>Salı ve Cuma</strong> indirmek gerekiyor.</p></div>
${sikHata([
  {
    hata: "Yanlış mağazanın dosyasını yüklemek",
    cozum: "Sistem dosyanın hangi pazaryerine ait olduğunu içeriğinden anlar ve kartın mağazasıyla uyuşmazsa reddeder. Hata mesajı dosyanın hangi pazaryerine ait olduğunu yazar.",
  },
  {
    hata: "Kampanya (“Avantajlı Teklifler” / “Ürün Komisyon Teklifleri”) dosyasını ürün dökümü kutusuna yüklemek",
    cozum: "Reddedilir: içindeki düşük oranlar KOŞULLUDUR, ancak fiyatı düşürürseniz geçerli olur. Güncel oran için ürün dökümünü ya da aynı karttaki «Kampanya dosyasından güncel oran» kutusunu kullanın.",
  },
  {
    hata: "Denetleme adımını atlayıp doğrudan yazmak",
    cozum: "Denetleme hiçbir şey yazmaz. «Bizde yok» sayısı beklediğinizden büyükse kataloğunuzda eksik ürün var demektir — önce onu düzeltin.",
  },
  {
    hata: "Salı/Cuma tarifesini indirmeyi unutmak",
    cozum: "O haftanın tarifesi kaybolur. Hesaplama motorunda Trendyol kutusu “tarife penceresi bitmiş” der ve oran eski tarifeden okunur.",
  },
])}
</section>

<section id="kanalHesabi">
${baslik("kanalHesabi")}
<p><strong>Sol menü → Kanal Hesapları.</strong> Hangi pazaryerinde hangi hesapla
çalıştığınızı tanımlar. Bir <strong>kanal</strong> pazaryeridir; bir
<strong>hesap</strong> o pazaryerindeki hesabınızdır. Her hesabın bir
<strong>rolü</strong> vardır: ya <strong>satış hesabı</strong> (mal sattığınız
mağaza) ya <strong>alış hesabı</strong> (kampanyada mal aldığınız hesap). Bu ekran
ayar yetkisi ister.</p>
${neZaman(
  "İlk kurulumda ve yeni bir mağaza ya da alış hesabı açtığınızda. Satış girebilmek için en az bir satış hesabı, alım girebilmek için en az bir alış hesabı gerekir.",
)}
${ekranSemasi("Kanal Hesapları", [
  { no: 1, ad: "Uyarı kutuları", aciklama: "Rolü seçilmemiş hesap ya da hem alım hem satış kaydı olan hesap varsa sarı kutuda sayısı yazar.", genis: true },
  { no: 2, ad: "Ürün listesinde gösterilecek pazaryerleri", aciklama: "Ürünler listesindeki «Pazaryeri» sütununun en fazla üç kanalı ve sırası." },
  { no: 3, ad: "Pazaryerindeki mağaza adı", aciklama: "İlan linkinin sizin mağazanızı açması için, satış hesabı başına." },
  { no: 4, ad: "Yeni hesap", aciklama: "Rol · Kanal · Para birimi · Hesap adı · Hesap kodu · Pazaryeri satıcı kimliği.", vurgulu: true },
  { no: 5, ad: "Hesap tabloları", aciklama: "Üç ayrı kart: Satış hesapları · Alış hesapları · Rolü seçilmemiş hesaplar.", genis: true },
])}
<h3>Yeni hesap eklemek</h3>
${adimlar([
  { ad: "Bu hesap ne için?", ne: "Zorunlu. «Alış hesabı»: bu hesaptan MAL ALIYORSUNUZ. «Satış hesabı (mağaza)»: bu hesaptan MAL SATIYORSUNUZ. Aynı pazaryerinde ikisi de varsa AYRI hesap olarak tanımlayın." },
  { ad: "Kanal ve para birimi", ne: "Pazaryerini listeden seçin; para birimi TRY ya da EUR." },
  { ad: "Hesap adı ve kodu", ne: "Ad ekranlarda görünür (örn. «Ana Mağaza»). Kod kanal içinde benzersiz kısa bir koddur (örn. ANA)." },
  { ad: "Pazaryeri satıcı kimliği", ne: "İsteğe bağlı: pazaryerinin size verdiği satıcı numarası." },
  { ad: "«Hesap Ekle»", ne: "Hesap rolüne göre ilgili tabloya düşer." },
])}
<h3>Tablodaki sütunlar</h3>
<p>Kanal · Hesap · Kod (kopyalanır) · Para birimi · <strong>Bu hesap ne
için?</strong> (rol seçici) · Alım sayısı · Aktif/Pasif · işlemler. Satış
hesaplarında rol seçicinin altında <strong>Ödeme vadesi</strong> alanı
durur.</p>
<h3>Rol neyi değiştirir</h3>
<ul>
<li><strong>Satış hesapları</strong> satış, Kanal SKU, komisyon yükleme ve hakediş
ekranlarında çıkar.</li>
<li><strong>Alış hesapları</strong> alım formunda çıkar.</li>
<li><strong>Rolü seçilmemiş hesap hiçbir formda listelenmez.</strong> Üstteki sarı
kutu kaç tane olduğunu yazar; tablodan rolünü seçin.</li>
<li>Satış kaydı olan hesap alış hesabına, alım kaydı olan hesap satış hesabına
çevrilemez; ekran kaç kayıt olduğunu yazar. Önce o kayıtları doğru hesaba taşıyın.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Hem alım hem satış kaydı olan hesap</div>
<p>Bu genelde kayıt hatasıdır: satıcı ve alıcı hesabı aynı platformda ayrı
hesaplardır. Satırda «hem alış hem satış» yazar ve «Alımları gör» / «Satışları
gör» bağlantıları çıkar. Yanlış olanları doğru hesaba taşıyın; bir tarafın kaydı
kalmayınca hesabı tek role çevirme düğmesi çıkar.</p></div>
<h3>Ödeme vadesi (satış hesapları)</h3>
<p>Pazaryerinin parayı kaç gün sonra ödediği. <strong>Vade (gün)</strong> kutusuna
gün sayısını yazın; pazaryeri iş günü sayıyorsa <strong>«İş günü olarak say»</strong>
kutusunu işaretleyin ve <strong>«Vadeyi kaydet»</strong>e basın. Bu ayar yalnız
hakediş raporu henüz gelmemiş satışların ödeme gününü tahmin etmek için kullanılır;
rapor gelince vade rapordan okunur.</p>
<h3>Ürün listesindeki pazaryeri linkleri</h3>
<p><strong>«Ürün listesinde gösterilecek pazaryerleri»</strong> kartında üç sıra
vardır; seçtiğiniz kanallar Ürünler listesindeki «Pazaryeri» sütununda bu sırayla
görünür ve ilana giden link taşır. Hepsini boş bırakırsanız sütun kalkar.
<strong>«Pazaryerindeki mağaza adı»</strong> kartına, pazaryerindeki kendi mağaza
linkinizdeki <code>magaza=</code> değerini yazarsanız link ilanı sizin
mağazanızla açar; boş kalırsa pazaryeri öne çıkan satıcıyı açar. Bazı
pazaryerlerinde bu ad kendiliğinden gelir.</p>
<h3>Neden birden fazla hesap</h3>
<p>Aynı pazaryerinde birden çok hesap olabilir; alım limitleri hesap başınadır.
Kesinti kuralları ve komisyon oranları da hesap bazında farklılaşabildiği için,
satışın hangi mağazadan geldiği <strong>kârı doğrudan değiştirir</strong>.</p>
<div class="ek-not"><div class="etiket">Silmek ya da pasife almak</div>
<p>Yalnız <strong>hiç kullanılmamış</strong> hesap silinebilir (onay ister).
Alımı, satışı, Kanal SKU'su ya da hakediş kaydı olan hesap silinemez; ekran
nedenini sayıyla yazar. Kapanmış bir hesabı listelerden çıkarmak için
<strong>pasife alın</strong>: hiçbir formda çıkmaz ama geçmişi bozulmaz.</p></div>
${sikHata([
  {
    hata: "Satışı yanlış hesaba yazmak",
    cozum: "Kanal değişince kesinti kuralları da değişir ve NET yanlış çıkar. Satış detayından hesabı düzeltirseniz kâr yeniden hesaplanır.",
  },
  {
    hata: "Hesabı ekleyip rolünü seçmemek",
    cozum: "Rolü seçilmemiş hesap alım, satış, Kanal SKU ve hakediş ekranlarının hiçbirinde çıkmaz. Hesabı «yok» sanmadan önce bu ekranda «Rolü seçilmemiş hesaplar» kartına bakın.",
  },
])}
</section>

<section id="deneme">
${baslik("deneme")}
<p><strong>Sol menü → Hesaplama motoru.</strong> (Fiyatlandırma ve Analiz grubunda.) Tek soruyu cevaplar:
<em>bu ürünü şu fiyata satarsam elime ne kalır — ve hangi pazaryerinde en
çok kalır?</em> Hiçbir kayıt oluşturmaz; istediğin kadar deneyebilirsin.</p>

${neZaman(
  "Bir ürünü almadan önce (bu fiyata alırsam kâr eder miyim) ve satmadan önce (hangi pazaryerinde bırakayım). Buy box fiyatlarını pazaryerlerinden bakıp buraya girdiğinde, hangisinde satmanın daha kârlı olduğunu görürsün.",
)}

<h3>Neden tek bir fiyat yetmez</h3>
<p>Aynı ürünün buy box fiyatı her pazaryerinde farklıdır ve <strong>en düşük
fiyat en yüksek kârı verebilir.</strong> Örnek — alış 1.000 ₺, kargo 200 ₺,
KDV %20, tutarlar KDV dahil:</p>
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

${ekranSemasi("Hesaplama motoru", [
  { no: 1, ad: "Ürünü koddan bul", aciklama: "Barkod (EAN), SKU, firma SKU ya da pazaryeri SKU'su. Okuyucuyla okutabilirsin. Ürün seçmeden de elle rakam girerek kullanılır.", genis: true },
  { no: 2, ad: "Alış fiyatı", aciklama: "Ürün bulunduysa kendiliğinden gelir — EN SON ödediğin birim maliyet. Ortalama DEĞİL: ortalama, aylar önceki bir maliyeti bugünkü denemeye karıştırır. Ortalaman özet satırında ayrıca yazar." },
  { no: 3, ad: "Satış fiyatı (ortak)", aciklama: "İsteğe bağlı. Ürün bulunduysa EN SON sattığın fiyat gelir. Pazaryeri kutusunda fiyat boşsa bu fiyat kullanılır." },
  { no: 4, ad: "KDV oranı · kargo · girdiğim tutarlar", aciklama: "Kargo ZORUNLU: alıcı ödüyorsa 0 yaz. «Girdiğim tutarlar» ile rakamları KDV dahil mi hariç mi yazdığını seçersin." },
  { no: 5, ad: "Pazaryeri kutuları", aciklama: "Her pazaryeri için buy box fiyatı + komisyon. Yalnız merak ettiğini doldurabilirsin.", genis: true, vurgulu: true },
  { no: 6, ad: "Sonuç kartları", aciklama: "NET-2'ye göre sıralı; en çok bırakan kupalı ve yeşil şeritli. Kartta NET-1, NET-2, ciro marjı ve «satış fiyatı nereye gidiyor» pastası.", genis: true },
])}

<h3>Adım adım</h3>
${adimlar([
  { ad: "Ürünü bul", ne: "Barkodu okut ya da kodu yaz, <strong>Bul</strong>'a bas. Alış fiyatı, KDV oranı ve son satış fiyatın kendiliğinden dolar; altında kaç adet satıldığı, son ve ortalama alış/satış fiyatları özetlenir. Ürünü bırakmak için «Ürünü bırak»." },
  { ad: "Kargoyu gir", ne: "Kargo girilmeden hiçbir kanal hesaplanmaz — kargo NET kârın en büyük kalemlerinden biridir. Kargoyu alıcı ödüyorsa <strong>0</strong> yaz." },
  { ad: "Buy box fiyatlarını gir", ne: "Pazaryerlerine bakıp gördüğün fiyatları ilgili kutuya yaz. Boş bıraktığın kutuya üstteki ortak satış fiyatı girer ve altında «ortak fiyattan» yazar. Hiç fiyatı olmayan kanal susar, ötekileri etkilemez." },
  { ad: "Komisyonu kontrol et", ne: "Gri rakam veriden gelendir ve altında nereden geldiği yazar (dilim tarifesinden · kanal SKU'sundan · çözülemedi). Kampanyayı sistemden önce biliyorsan üstüne kendi oranını yaz; «veriye dön» ile geri alırsın." },
  { ad: "Kazanana bak", ne: "En üstteki kupalı kart en çok para bırakan pazaryeridir. Şerit kırmızıysa o kanalda o fiyata satmak ZARAR demektir. Baştan başlamak için «Hepsini temizle»." },
])}

<div class="ek-not"><div class="etiket">Kartlardaki rozetler</div>
<p>Her kartta pazaryeri adının altında <strong>kaynak rozeti</strong> durur: <strong>ölçüldü</strong>
(kesinti kuralları kanalın kendi belgesinden ya da kendi satışlarınızdan) ya da
<strong>referans · doğrulanmadı</strong> (dış kaynaktan; ilk belge gelince
düzelir). Ciro marjı bir banda yerleşir: <em>Zarar · Çok riskli · Zayıf · Kabul
edilebilir · İyi · Çok iyi</em>. Hesap <strong>tek adet</strong> üzerindendir;
sipariş başına alınan sabit kesintiler tek siparişe yazılır.</p></div>

<div class="ek-not"><div class="etiket">Rakamlar nereden geliyor</div>
<p>Alış fiyatı senin <strong>fiilen ödediğin</strong> tutardır (stok defterinden),
komisyon o haftanın <strong>gerçek tarifesinden</strong> ya da ürünün kanal
oranından, kesintiler kanal kurallarından. Bu ekranın değeri hesabın
kendisinde değil, <strong>girdilerin tahmin olmamasında</strong>.</p></div>

${sikHata([
  {
    hata: "Gri rakamı “girilmiş değer” sanmak",
    cozum: "Gri rakam kutu BOŞ bırakılırsa kullanılacak olan değerdir — yani gördüğün rakamla hesaplanır. Değiştirmek istiyorsan üstüne yaz; geri dönmek için yanındaki «veriye dön» / «ortak fiyata dön» bağlantısına bas.",
  },
  {
    hata: "Kargoyu boş bırakıp “hiçbir şey hesaplanmıyor” demek",
    cozum: "Kargo girilmeden hesap yapılmaz; ekran «Kargo ücreti bekleniyor» der. Alıcı ödüyorsa 0 yaz.",
  },
  {
    hata: "Bir kanalın “NET hesaplanamadı” demesini hata sanmak",
    cozum: "O kanala fiyat girmemişsindir ya da o üründe komisyon oranı yoktur. Sistem sıfır kâr uydurmaz, susar; sebep kartta yazar. Kutuya rakam yazınca hesaplanır.",
  },
  {
    hata: "Trendyol’da “tarife penceresi bitmiş” uyarısını görmezden gelmek",
    cozum: "O haftanın tarifesi yüklenmemiş demektir; oran eski tarifeden okunuyor ve yanlış olabilir. Salı/Cuma dosyasını indirip yükle.",
  },
  {
    hata: "Sonucu kayıt sanmak",
    cozum: "Bu ekran hiçbir şey kaydetmez — ne satış, ne stok, ne kesinti. Denemedir. Satışı gerçekten kaydetmek için Satışlar → Yeni Satış.",
  },
])}
</section>

<section id="kart">
${baslik("kart")}
<p><strong>Sol menü → Kârlılık kartı.</strong> Bir ürünün (varyantın) bütün
hikâyesini tek sayfada toplar: kaça aldın, kaça sattın, hangi kanalda ne kadar
sattın, ne kadar sürede satıldı, elinde ne kaldı, ne kadar kâr bıraktı. Kart
<strong>varyant</strong> düzeyindedir: aynı ürünün iki varyantı ayrı satar, ayrı
kâr eder.</p>
${neZaman(
  "Bir ürünü yeniden almadan önce. “Bu ürün iyi mi” sorusunun cevabı burada: satış hızı, marj, stoğun kaç gün yeteceği ve elde kalan partiler birlikte görünür.",
)}

<h3>Kartı açmak</h3>
${adimlar([
  { ad: "Ürünü arayın", ne: "Arama kutusuna barkod (EAN), SKU, firma SKU, pazaryeri SKU, <strong>sipariş no</strong> ya da ürün adı yazın; okuyucu ya da kamerayla okutabilirsiniz." },
  { ad: "Sonuca gidin", ne: "Tek ürün bulunursa kart doğrudan açılır. Birden çok ürün uyarsa kodlarıyla birlikte liste çıkar, doğru olana tıklarsınız. Hiçbiri uymazsa «Kayıtlı değil — yeni ürün» yazar ve <strong>Yeni ürün olarak ekle</strong> düğmesi çıkar." },
])}
<p>Başka ekranlardan da gelinir: ürün detayındaki varyant satırında
<strong>Kârlılık kartı</strong> bağlantısı, satış ve alım listelerinde ürün adına
tıklamak.</p>

${ekranSemasi("Kârlılık kartı", [
  { no: 1, ad: "Künye", aciklama: "Resim · ad · marka · SKU, Firma SKU, Barkod (tek tıkla kopyalanır) · pazaryeri ilan bağlantıları · KDV oranı ve kaynağı · kategori · desi · «Düzenle / alım gir →».", genis: true },
  { no: 2, ad: "Dönem ve iki büyük rakam", aciklama: "Dönem seçici (varsayılan son 30 gün) · Satılan adet · Ciro, önceki döneme göre değişimiyle.", vurgulu: true },
  { no: 3, ad: "Özet kutuları", aciklama: "Fiyat · Kâr özeti · Stok kaç gün yeter · İadeler.", genis: true },
  { no: 4, ad: "Sekmeler", aciklama: "Genel · Siparişler · Kâr raporu · Varyantlar · İadeler. Seçilen sekme adrese yazılır." },
  { no: 5, ad: "Fiyat dene", aciklama: "Geniş ekranda sağ sütunda, telefonda sayfanın sonunda." },
])}

<h3>Üst bölüm</h3>
<ul>
<li><strong>KDV satırı</strong> oranın yanında kaynağını yazar: ürün istisnası,
kategoriden ya da varsayılan. «Kategori girilmemiş» ya da «desi girilmemiş»
görüyorsanız ürün kartından tamamlayın.</li>
<li>Pazaryerinin kendi tartımı varsa <strong>kanal ölçümü … desi</strong> yazar ve
yanında <strong>bu değere güncelle</strong> bağlantısı çıkar: ürünün desisini
kanalın ölçtüğü değerle değiştirir. Örnek sayısı azsa «az örneklem» notu
düşer.</li>
<li>Tarih satırında ürünün kayıt günü, ilk satışı ve son satışı (kaç gün önce)
yazar.</li>
<li><strong>Dönem seçici:</strong> son 15 gün · son 30 gün · bu ay · son 3 ay ·
son 6 ay · son 1 yıl · özel aralık. Kartın grafikleri, kutuları ve sekmeleri bu
döneme göre hesaplanır.</li>
</ul>

<h3>Özet kutuları</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Kutu</th><th>Ne söyler</th></tr></thead>
<tbody>
<tr><td><strong>Fiyat</strong></td><td>Dönemin ortalama satış fiyatı, alış fiyatı geçmişi ve son alış fiyatı</td></tr>
<tr><td><strong>Kâr özeti</strong></td><td>Ciro · ürün maliyeti · NET-1 · NET-2 ve adet başına NET-1 / NET-2</td></tr>
<tr><td><strong>Stok kaç gün yeter</strong></td><td>Eldeki adet ve seçili dönemdeki satış hızıyla kaç gün yeteceği. Dönemde satış yoksa «hız ölçülemedi» der</td></tr>
<tr><td><strong>İadeler</strong></td><td>İade adedi ve iade oranı</td></tr>
</tbody></table></div>

<h3>Sekmeler</h3>
<ul>
<li><strong>Genel:</strong> günlük «Satış ve kâr» grafiği (ciro, NET-2, adet, iade;
bir günün noktasından o günün satışları Satışlar ekranında süzülmüş açılır) · kanala ve hesaba göre ciro · ürün
durumu (iade oranı, NET-2 marjı, toplam cirodaki pay) · stok ve fiyat grafiği ·
kanallara göre fiyat gelişimi. Altında <strong>Stok ve maliyet ayrıntıları</strong>:
stok yaşı, eldeki adet ve raf; ortalama maliyet ve alımdan satışa geçen gün;
<strong>açık partiler</strong>.</li>
<li><strong>Siparişler:</strong> seçili dönemin sipariş satırları (sipariş no,
tarih, kanal, adet, birim fiyat, ciro, NET-2). «Satışlar ekranında aç» aynı
listeyi süzülmüş hâlde açar; Excel oradan indirilir.</li>
<li><strong>Kâr raporu:</strong> dönemin kâr merdiveni (satılan · iptal · iade adedi
→ ciro → maliyet → komisyon ve stopaj → NET-1 → ödenecek KDV → NET-2) ve
«Kârlılık — tüm satışlar» kutuları: satış fiyatı / adet, maliyet / adet (satılan
malın FIFO maliyeti), NET-2 / adet, marj, sermaye verimi (kâr ÷ satılanın
maliyeti), son satışın NET-2'si. Satış geçmişi yeterliyse burada <strong>Yapay
zekâ tavsiyesi</strong> de alınabilir — öneridir, karar sizindir.</li>
<li><strong>Varyantlar:</strong> aynı ürünün öteki varyantları yan yana.</li>
<li><strong>İadeler:</strong> günlük iade grafiği ve risk sinyalleri: tüm zamanların
iadesi (sebepleriyle), kârı hesaplanamayan satış sayısı, zarar eden satış
sayısı.</li>
</ul>
<div class="ek-not"><div class="etiket">Karttaki NET-2 neden Satışlar ekranından farklı</div>
<p>Kart ürünün <strong>kendi</strong> marjını gösterir: kalem düzeyinden okunur,
sipariş kargosu ve hizmet bedeli <strong>dahil değildir</strong>. Satışlar
ekranındaki sipariş NET-2'si bu yüzden farklı çıkar. Rakamlar tek satıştan
geliyorsa kart bunu ayrıca uyarır: marj tek başına yanıltır.</p></div>

<h3>Açık partiler</h3>
<p>Elde kalan malın her partisi ayrı satırda: alım tarihi, alım kodu, kalan adet
ve <strong>gerçek birim maliyeti</strong>. Bir sonraki satışın düşeceği parti
«sıradaki» diye işaretlidir; en altta toplam adet ve tutar yazar.</p>

<h3>Fiyat dene</h3>
<p>Bir satış fiyatı yazın; her kanal için hangi komisyon dilimine düştüğü, NET
kâr ve başabaş fiyatı görünür. Bir alt dilime inmenin NET-2'yi nasıl
değiştirdiğini («kâra geçer», «zarar sürer» gibi) cümleyle söyler. İsteğe bağlı
<strong>takipçi kuponu</strong> yazarsanız kuponlu satışın NET-2'si ayrıca
gösterilir. Hiçbir şey kaydedilmez. Ürünün kanal kodu olmayan kanallar
hesaplanamaz ve adlarıyla yazılır.</p>
<div class="ek-not"><div class="etiket">Kâr yetkisi</div>
<p>Kâr görme yetkisi olmayan kullanıcı kimlik ve stok bilgilerini görür.
Kâr raporu sekmesi ve Fiyat dene ona hiç çizilmez; kâr bilgisinin durduğu
yerde «yetkiniz dahilinde değil» notu yazar.</p></div>
<p>Sayfanın en altında <strong>Stok ekranı</strong>, <strong>Ürün kartı</strong> ve
<strong>Yeni arama</strong> düğmeleri durur. Alım girmek, düzenlemek gibi
eylemler kartta yoktur; ürün sayfasındadır.</p>
${sikHata([
  {
    hata: "Ortalama maliyet ile açık parti maliyetini karıştırmak",
    cozum: "İkisi FARKLI sorulara cevap: ortalama “bu ürünü genelde kaça alıyorum”, açık parti “elimdeki malın maliyeti ne”. Kâr hesabı satılan partinin gerçek maliyetini kullanır.",
  },
  {
    hata: "Stok bitince “alım kaydı yok” sanmak",
    cozum: "Kart geçmişin tamamını gösterir; stok sıfır olsa da alım ve satış geçmişi durur. Açık parti listesi boşsa yalnız elde mal kalmamıştır.",
  },
  {
    hata: "Kartta grafik boş diye ürünün hiç satmadığını sanmak",
    cozum: "Grafik ve kutular seçili döneme göredir (varsayılan son 30 gün). Dönemi genişletin; tüm zamanların satış sayısı tarih satırında ayrıca yazar.",
  },
])}
</section>

<section id="urunAnalizi">
${baslik("urunAnalizi")}
<p><strong>Sol menü → Ürün analizi.</strong> «Param hangi üründe, hangi ürün
beni taşıyor, hangi mal rafta yatıyor?» sorularının tam listesi. Paneldeki
«Ürün analizi» kutusu size <strong>hükmü</strong> söyler («kârının %70'i şu
kadar üründen geliyor» gibi); <strong>dökümü</strong> bu sayfadadır. Panelde her
sekmenin altındaki <strong>«Tam listeyi aç»</strong> düğmesi ve yoğunlaşma
cümlesinin kendisi buraya götürür.</p>
${neZaman(
  "Hangi ürünü yeniden alacağınıza, hangisini bırakacağınıza karar verirken; rafta uzun süredir bekleyen malı bulmak istediğinizde; bir sonraki kampanya dönemi için geçen yıl aynı çeyrekte ne sattığınıza bakarken.",
)}
${ekranSemasi("Ürün analizi", [
  { no: 1, ad: "Sekmeler", aciklama: "Dağılım · Verim (marj) · Hacim · Stokta bekleyen ürünler · Mevsimsel. Telefonda yana kayar.", genis: true },
  { no: 2, ad: "Ara", aciklama: "Barkod (EAN), SKU, Firma SKU, kanal kodu ya da ürün adı. Kamerayla da okutulur." },
  { no: 3, ad: "Süzgeçler", aciklama: "Sırala · Yön · Satır · En az adet · En az ciro · Dönem · Kanal · Para birimi · Etiket · Mevsim · Marka · Kategori. Telefonda katlanır." },
  { no: 4, ad: "Süzgecin tamamı", aciklama: "Toplam ciro (ya da bağlı sermaye), adet, NET-2, marj ve kaç ürün olduğu.", vurgulu: true },
  { no: 5, ad: "Liste", aciklama: "Her satırda ürün adı (tıklanınca ürüne gider), kodlar ve etiket düğmeleri.", genis: true },
])}
<h3>Beş sekme</h3>
<ul>
<li><strong>Dağılım (nereye yoğunlaşmalıyım)</strong> — kâr hangi ürünlerde
toplanıyor. Varsayılan sıra NET-2'ye göre azalan; <strong>Kümülatif pay</strong>
sütunu baştan o satıra kadarki payı gösterir.</li>
<li><strong>Verim (marj)</strong> — hacimden bağımsız: hangi ürün daha verimli
satıyor. Varsayılan sıra marj.</li>
<li><strong>Hacim (adet ve tutar)</strong> — parayı bu dönemde hangi ürün getirdi.
Varsayılan sıra satılan adet.</li>
<li><strong>Stokta bekleyen ürünler</strong> — bugün rafta duran mal: raf yaşı (gün),
raftaki adet ve bağlı sermaye. Varsayılan sıra raf yaşı. Bu sekmede ayrıca
<strong>yaş kovaları</strong> çıkar (0-15 · 16-30 · 31-45 · 46-60 · 61-90 ·
91-180 · 181+ gün); birine basınca liste o kovaya daralır, tekrar basınca kalkar.</li>
<li><strong>Mevsimsel</strong> — <strong>bütün geçmiş</strong> satışlar, seçtiğiniz
takvim çeyreğine göre (1. Çeyrek Oca-Mar … 4. Çeyrek Eki-Ara), yıldan bağımsız
toplanır. Bu sekmede dönem, kanal ve para birimi süzgeci yoktur; para birimi
TRY sabittir. Varsayılan sıra ciro.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Sekmeler farklı kümelere bakar</div>
<p>İlk üç sekme <strong>seçtiğiniz dönemde satılmış</strong> ürünlere bakar
(iptal edilmiş satışlar girmez). «Stokta bekleyen» ise <strong>bugün rafta
duran</strong> mala bakar ve <strong>dönem ile kanal süzgecinden etkilenmez</strong>;
«Mevsimsel» tüm geçmişe bakar. Ekran her sekmede hangi kümeye bakıldığını
listenin üstünde yazar. Sebebi şu: dönemde <em>hiç satılmamış</em> ama aylardır
bekleyen mal, satış listesinde hiç görünmez; oysa ölü sermaye tam olarak odur.</p></div>
<h3>Süzgeçler</h3>
<ul>
<li><strong>Sırala / Yön / Satır</strong> — seçince hemen uygulanır. Sıralama
alanları: NET-2, NET-1, Marj, Satılan adet, Ciro, Birim satış fiyatı, Raf yaşı,
Bağlı sermaye, Raftaki adet, Ürün adı. Liste <strong>50 satır</strong> gösterir;
25 ya da 100 seçebilirsiniz.</li>
<li><strong>En az adet / En az ciro</strong> — sayıyı yazıp <strong>Uygula</strong>'ya
basın.</li>
<li><strong>Dönem</strong> — Bu ay · Son 3 ay · Son 6 ay · Özel aralık.
<strong>Kanal</strong> — yalnız satışı olan kanallar listelenir.
<strong>Para birimi</strong> — TRY ya da EUR.</li>
<li><strong>Etiket</strong> — «Yalnız favoriler», «Yalnız incelenecek».
<strong>Mevsim</strong> — Tümü · Yaz · Kış. <strong>Marka</strong> ve
<strong>Kategori</strong> — birden çok seçilebilir; yanında kaç ürün olduğu yazar.</li>
<li><strong>Süzgeçleri temizle</strong> — dönem, kanal ve para seçiminize
dokunmadan öteki süzgeçleri kaldırır.</li>
</ul>
<p>Seçimler sayfa adresine yazılır: adresi kopyalayıp paylaşırsanız karşı taraf
aynı listeyi görür.</p>
<h3>Satırdaki etiket düğmeleri</h3>
<p>Her ürün satırında <strong>favori</strong>, <strong>incelenecek</strong> ve
<strong>Yaz / Kış</strong> düğmeleri vardır. Basınca ürün işaretlenir, tekrar
basınca işaret kalkar. Bu işaretler ürüne yazılır; «Etiket» ve «Mevsim»
süzgeçleri bunları kullanır. Satırda ayrıca SKU, Firma SKU, Barkod (EAN) ve
kanal kodları tek tıkta kopyalanır.</p>
<div class="ek-not"><div class="etiket">Üstteki toplam sayfanın değil, süzgecin</div>
<p>Satır sayısını 100'den 25'e düşürdüğünüzde <strong>toplam değişmez</strong>,
yalnız görünen satır sayısı azalır; kartın başlığında «25 / 180 ürün
gösteriliyor» gibi yazar. Toplam her zaman <strong>süzgeçten geçen bütün
ürünlerin</strong> toplamıdır.</p></div>
<p>Kârı hesaplanamamış kalemler <strong>NET toplamına girmez</strong> ve kaç
tane oldukları yazar — sıfır sayılmazlar. Aynı şekilde maliyeti bilinmeyen mal
bağlı sermaye toplamına girmez; «&mdash;» görürsünüz, <strong>0 TL
değil</strong>, çünkü o mal bedava değil, maliyeti <em>bilinmiyor</em>.</p>
<p>Kümülatif pay sütunu <strong>yalnız Dağılım sekmesinde ve NET-2'ye göre
azalan sıralamada</strong> çıkar. Başka bir sıralama seçerseniz kaybolur ve niye
kaybolduğu yazar — alfabetik bir listede «ilk %70» diye bir şey yoktur.</p>
<p>Kâr görme yetkisi olmayan kullanıcı NET-2 ve marj sütunlarını görmez.</p>
${sikHata([
  {
    hata: "Stokta bekleyen sekmesinde dönemi değiştirip listenin neden değişmediğini sormak",
    cozum: "Bu sekme bugün rafta duranı gösterir; dönem ve kanal süzgecinden etkilenmez. Ekran bunu listenin üstünde yazar.",
  },
  {
    hata: "Satır sayısını düşürünce toplamın da düşeceğini sanmak",
    cozum: "Toplam süzgecin tamamıdır; satır seçimi yalnız kaç satırın görüneceğini değiştirir. Daha az ürünün toplamını görmek için süzgeç (marka, kategori, en az adet) kullanın.",
  },
])}
<h3 id="alimRehberi">Alım rehberi</h3>
<p><strong>Sol menü → Alım rehberi</strong> («Fiyatlandırma ve Analiz» grubunda). Ürün
analizinin rakamlarını <strong>alım kararına</strong> çeviren dört hazır liste.
Rakamlar Ürün analiziyle aynı hesaptan gelir: aynı dönemde iki ekran aynı adedi
ve aynı NET-2'yi gösterir.</p>
<ul>
<li><strong>Tükenen yıldızlar</strong> — iyi kâr eden ve hızlı satan ama rafta
1 ya da hiç kalmamış ürünler. İlk bakılacak liste.</li>
<li><strong>Azalan</strong> — aynı yıldızlardan, bugünkü satış hızıyla stoğu
«az stok» sınırından (başlangıç 30 gün) önce bitecek olanlar. Sınırı sayfadaki
kutudan değiştirebilirsiniz.</li>
<li><strong>Fazla stok</strong> — bugünkü hızla rafta çok uzun bekleyecek mal ve
bağladığı sermaye. Yeniden almadan önce bakılacak liste.</li>
<li><strong>Hızlı ama kârsız</strong> — çok satan ama marjı zayıf ürünler: alım
fiyatı ya da satış fiyatı gözden geçirilmeli.</li>
<li><strong>Geçen yıl bu dönem</strong> — önümüzdeki 30, 60 ya da 90 günün
<strong>geçen yılki aynı tarihlerinde</strong> en az 3 adet satıp kâr bırakmış ve
bugün rafında o satıştan az olan ürünler. <strong>Eksik</strong> sütunu = geçen
yıl satılan − bugün raf. Bu bir tahmin değil hatırlatmadır: geçen yılın satışı o
dönemin kampanyasına ve o günkü alımınıza da bağlıdır; ekran bunu yazar. Geçen
yılın o dönemi defterin ilk satışından önceyse liste boş kalır ve «bakılamadı»
der — «temiz» demez.</li>
<li><strong>Özel günler</strong> — önümüzdeki 90 günün özel günleri (Black Friday,
bayram, kampanya dönemi…). Bir gün seçince takvimdeki <strong>geçen yılki
karşılığına</strong> bakılır. <em>Satış gününde</em> önce mağazanın o günlerde
<strong>normalin kaç katı</strong> sipariş aldığı yazar (normal = önceki 28 günün
ortalaması); sonra o günlerde satılıp bugün rafta eksik kalan kârlı ürünler gelir.
Pencere çoğu zaman tek gün olduğu için burada «en az 3 adet» şartı yoktur.
<em>Alım kampanyasında</em> geçen kampanyada aldığınız ürünler, bugünkü rafı ve
bugünkü talebiyle listelenir. Geçen yılın tarihi takvimde yoksa liste «bakılamadı»
der. Bu sekmenin Excel dosyası yoktur.</li>
<li><strong>Kampanyada iyi aldıkların</strong> — seçili dönemde satılan ve
<strong>son alışı, en ucuz alışından pahalı</strong> olan ürünler: en ucuz alış
(tarihiyle — hangi kampanya), normal fiyat (ortanca), son alış ve aradaki fark.
Bir sonraki kampanyada hedefin olabilecek fiyatı hatırlatır; fiyat farkı tek başına
hata değildir. Yalnız KDV ve kargo dahil, bedava olmayan TL alışlar kıyaslanır.
Bu sekmenin Excel dosyası yoktur.</li>
</ul>
<p><strong>Alım girerken fiyat hafızası</strong>: Alımlar → Yeni alım'da ürünü
eklediğinizde fiyat kutusunun altında o ürünün geçmişi yazar: «9 alış · en ucuz …
(tarih) · normal … · son … (tarih)». Fiyatı yazınca en ucuz alışa göre ne kadar
yukarıda ya da aşağıda olduğunu söyler. Kutu kendiliğinden dolmaz, kayıt hiçbir
zaman engellenmez. Kupon ya da özel indirimle aldığınız kalemde
<strong>«Cari fiyat (kuponsuz)»</strong> kutusuna o gün rafta yazan fiyatı girin:
maliyet ve kâr yine ödediğiniz fiyattan hesaplanır, fiyat hafızası ise cari
fiyatı kullanır — böylece kuponla çok ucuza alınmış bir ürün hedef fiyatı
bozmaz.</p>
<p><strong>Özel gün takvimi</strong>: <strong>Sol menü → Özel günler</strong> («Ayarlar» grubunda).
Her özel günün türü (satış günü ya da alım kampanyası), isteğe bağlı kanalı ve
<strong>her yılın tarihi ayrı satır</strong> olarak girilir: Black Friday ve bayramlar
her yıl başka güne düştüğü için rehber bu yılki tarihi geçen yılkiyle böyle eşler.
Resmî kaynaktan kontrol edilmemiş tarih <strong>«Doğrulanacak»</strong> rozeti taşır;
rehber de bunu yazar. Geçmiş tarihi olan özel gün silinmez, <strong>pasife alınır</strong>
(geçen yılla kıyas onu kullanır).</p>
<div class="ek-not"><div class="etiket">«İyi kâr» ve «hızlı» sınırını sistem koymaz, verileriniz koyar</div>
<p>Dönemde en az 3 adet satmış ürünlerin <strong>ortanca</strong> marjı ve
ortanca satış hızı eşiktir; sayfada açıkça yazar. Dönemi değiştirince eşik de
değişir. Kâr görme yetkisi olmayan kullanıcı bu sayfayı açamaz — listeler kâra
dayanır. «Excel indir» ekranda ne varsa onu indirir; sayılar Excel'de
toplanabilir.</p></div>
${sikHata([
  {
    hata: "Alım rehberindeki bir ürünü listeye bakıp hemen almak",
    cozum: "Liste geçmiş satışa bakar; kampanya ve fiyat durumunu bilmez. Ürüne tıklayıp kartında son alış fiyatını ve kanal fiyatını kontrol edin.",
  },
])}
<h3 id="buybox">Buybox durumu</h3>
<p><strong>Sol menü → Buybox durumu</strong> («Fiyatlandırma ve Analiz» grubunda).
Rafta olan ve kanalda ilanı bulunan ürünlerde <strong>Buybox kimde, biz
kaçıncıyız</strong>. Trendyol ve Hepsiburada'nın <strong>resmî satıcı API'sinden</strong>,
sayfa her açıldığında canlı sorulur (birkaç saniye sürebilir). Üstten kanalı seçin.</p>
<p><strong>Buybox geçmişi</strong> — sayı kutularının yanındaki <strong>«Grafiği göster»</strong>
düğmesiyle açılır (aynı düğme «Grafiği gizle» olur). Sistem saatte bir kendiliğinden
ölçer ve iki grafik çizer: <strong>Buybox bizde</strong> (ürün sayısı) ve
<strong>kazanma oranı</strong>. <strong>Bugün</strong> saat saat gösterir (o saatin son
ölçümü); <strong>7 gün / 30 gün</strong> günlük ortalamayı gösterir. Kazanma oranı
yalnız <strong>birden fazla satıcılı</strong> ürünlerde ölçülür («9 / 120» gibi): tek
satıcılı üründe Buybox zaten sizdedir, sayılsaydı oranı şişirirdi. Ölçülemeyen saat
uydurulmaz: grafikte boş kalır ve altında «ölçülmeyen dilimler» diye adıyla yazar.
Otomatik ölçüm başlamadan önceki saatler kaçırma sayılmaz; grafiğin altında ölçümün
ne zaman başladığı yazar.
Liste canlıdır; kaydedilen yalnız saatlik sayılar ve durumu değişen ürünlerdir.</p>
<ul>
<li><strong>Buybox'ı kaybettiklerim</strong> — başka satıcı önde. Buybox'a en yakın
olanlar önce gelir: en az fiyat hareketiyle geri alınabilecekler.</li>
<li><strong>Buybox bizde</strong> — «2. fiyat» öndeki payınızı gösterir.</li>
<li><strong>Görünmüyor / sorgulanamadı</strong> — kanal bizi satıcı listesinde
göstermedi ya da sorgu tamamlanamadı; ekran nedenini yazar.</li>
</ul>
<p>Hepsiburada o üründeki <strong>bütün satıcıları</strong> adıyla ve fiyatıyla verir
(«Satıcılar» açılır listesi); Trendyol yalnız Buybox fiyatını, sıramızı ve 2. ile 3.
fiyatı verir, rakip adını vermez. İki kanal da rakibin stoğunu vermez.</p>
<p><strong>Fiyat kutusu</strong> (her satırda, kâr görme yetkisi olanlarda) — kutu
Buybox fiyatıyla dolu gelir. <strong>«Hesapla»</strong>ya basın: girilen fiyatta,
bizim fiyatta ve Buybox fiyatında <strong>NET-2 kâr ve marj</strong> çıkar; fiyatı
değiştirdikçe anında yeniden hesaplanır. Hesap ürün kartının fiyat denemesiyle
aynı motordur (komisyon dilimi, kanal kesintileri, stopaj, KDV), iki farkla:
<strong>maliyet</strong> rafta duran partilerin <strong>en düşüğüdür</strong> (stoku
bitmiş alış girmez) ve <strong>kargo dahildir</strong> (ürünün desisi + o kanaldaki son
satışın kargo firması + bugünkü tarife). Kargo bilinemiyorsa kutu «Kargo HARİÇ» diye
sebebiyle yazar. <strong>«Kaydet»</strong> (yalnız Trendyol) → onay penceresi eski ve
yeni fiyatı gösterir → «Evet, gönder». Yalnız fiyat gider, stok değişmez. Fiyat
zarar ettiriyorsa ya da kârı hesaplanamıyorsa, kutu işaretlenmeden gönderilmez ve bu
onay kayda geçer. Hepsiburada'ya gönderim şimdilik ürün kartından.</p>
</section>

<section id="gunlukOzet">
${baslik("gunlukOzet")}
<p><strong>Sol menü → Günlük Özet.</strong> Uyarıları, görevleri ve nakit /
tazminat / kart borcu sinyallerini birleştiren, <strong>günde bir kez</strong>
üretilen Türkçe anlatı. Panelde kısa hâli durur, <strong>«Tam özeti gör»</strong>
buraya getirir.</p>
${neZaman(
  "Güne başlarken, “bugün neye bakmam gerekiyor” sorusunun tek sayfalık cevabı için. Ayrıntıya inmek için özetin altındaki bağlantılarla ilgili ekrana geçersiniz.",
)}
${ekranSemasi("Günlük Özet", [
  { no: 1, ad: "Tazelik uyarısı", aciklama: "Yalnız sorun varsa görünür: «Bayat — son üretimden N saat geçti» ya da «Bu gün için henüz hiç üretim koşmadı»." },
  { no: 2, ad: "Özet metni", aciklama: "Üretildiği tarih ve saat ile birlikte anlatı; doğrulanamadıysa uyarı ve sade liste.", genis: true, vurgulu: true },
  { no: 3, ad: "Kaynağa git", aciklama: "Özetteki her konunun kendi ekranına bağlantısı." },
])}
<ul>
<li>Özetteki her rakam sistemin kendi doğrulanmış verisinden gelir. Otomatik
anlatı doğrulanamazsa ya da üretilemezse <strong>gösterilmez</strong>; yerine nedenini
söyleyen bir uyarı ve aynı verilerden üretilen <strong>sade bir liste</strong> çıkar.</li>
<li>Özet son üretimden <strong>36 saatten</strong> fazla geçtiyse ekranın üstünde
<strong>«Bayat»</strong> uyarı kutusu çıkar. Bayat özet bugünün rakamı sanılmamalı; güncel
rakam için ilgili ekrana gidin.</li>
<li>Metnin üstünde özetin <strong>üretildiği an</strong> yazar — rakamlar o anın
fotoğrafıdır, gün içinde girilen kayıtlar bir sonraki üretime kadar özete yansımaz.</li>
</ul>
</section>

<section id="hedef">
${baslik("hedef")}
<p>Bugün, bu hafta, bu ay, bu çeyrek ve bu yıl için <strong>ciro</strong>,
<strong>kâr (NET-2)</strong> ve <strong>sipariş adedi</strong> hedefi koyarsınız.
İki ayrı yer vardır:</p>
<ul>
<li><strong>Hedefleri görmek:</strong> üst çubuktaki <strong>Hedefler</strong>
düğmesi (hedef tahtası simgesi). Tıklayınca ayrı bir sayfada her hedefin
ilerlemesi açılır. Satışları görme izni olan herkes görür.</li>
<li><strong>Hedef koymak / değiştirmek:</strong> <strong>Sol menü → Hedefler</strong>
(Ayarlar grubunda). Yalnız «Satış hedeflerini gir» izni olan açar.</li>
</ul>
<p>Rakamlar paneldekiyle aynı tanımdan gelir: ciro iptaller hariç ve iadeler
düşülmüş hâlidir (iade, satışın gününe yazılır); yalnız <strong>Türk lirası</strong>
satışlar sayılır; hafta <strong>pazartesi</strong> başlar; günler İstanbul saatine göredir.
Hedeflerin panelde ayrı bir kartı yoktur.</p>
${neZaman("Ayın, çeyreğin ya da yılın başında; kampanya dönemine girerken. Gün içinde «hedefe ne kadar kaldı» diye bakmak için üst çubuktaki düğme.")}
${ekranSemasi("Hedefler", [
  { no: 1, ad: "Beş dönem kartı", aciklama: "Bugün · Bu hafta · Bu ay · Bu çeyrek · Bu yıl. Telefonda alt alta.", genis: true, vurgulu: true },
  { no: 2, ad: "Her kartta kutular", aciklama: "Ciro hedefi (₺) · Kâr hedefi — NET-2 (₺) · Sipariş adedi hedefi. Altında «Şu an: … · hedefin %…»." },
  { no: 3, ad: "Hedefleri kaydet", aciklama: "Tek düğme, bütün kutular birlikte kaydedilir." },
  { no: 4, ad: "Son 20 hedef değişikliği", aciklama: "Ne değişti, hangi dönemden geçerli, ne zaman, kim.", genis: true },
])}
<h3>Hedef koymak</h3>
${adimlar([
  { ad: "Ayar ekranını açın", ne: "<strong>Sol menü → Hedefler</strong>. Ya da üst çubuktaki Hedefler sayfasında sağ üstteki «Hedefleri düzenle» bağlantısı." },
  { ad: "Tutarı DÜZ SAYI olarak yazın", ne: "Örn. <strong>500000</strong> — nokta, boşluk, ₺ işareti yok. Kuruş gerekirse virgülle en çok iki basamak (örn. 1250,50). Sipariş adedi tam sayıdır (örn. 300)." },
  { ad: "Kaldırmak için boşaltın", ne: "Bir kutuyu boş bırakırsanız o hedef kaldırılır." },
  { ad: "«Hedefleri kaydet»", ne: "Ekran kaç hedefin güncellendiğini yazar; hiçbir şey değişmediyse «Değişiklik yok» der." },
])}
<div class="ek-not dikkat"><div class="etiket">«500.000» yazmayın</div>
<p>Noktalı yazım kabul edilmez ve ekran «yalnız sayı yazın» hatası verir. Sebebi:
«500.000» beş yüz bin de olabilir, beş yüz (ondalıklı) da. Sistem tahmin etmez;
yanlış bir tahmin hedefi bin kat kaydırırdı. <strong>500000</strong> yazın.</p></div>
<div class="ek-not"><div class="etiket">Değişiklik hangi dönemden geçerli</div>
<p>Değiştirdiğiniz hedef <strong>içinde bulunduğunuz dönemin başından</strong>
itibaren geçerli olur (bu ay değiştirdiyseniz bu ayın tamamı için). Geçmiş
dönemler eski hedefle kalır. Her değişiklik altta kim, ne zaman bilgisiyle listelenir.</p></div>
<h3>Hedefleri izlemek</h3>
<p>Üst çubuktaki <strong>Hedefler</strong> düğmesi her hedef için bir satır gösterir:
adı (örn. «Aylık ciro»), dolan bir çubuk ve yüzdesi, altında
«gerçekleşen / hedef». Geçilen hedefin adı yeşil yazar ve sayfanın tepesinde
«Tebrikler!» kutusu çıkar. Hedef hiç konmadıysa sayfa «Henüz hedef konmadı» der.</p>
<h3>Hedef geçilince</h3>
<ul>
<li>Ekranda bir <strong>kutlama penceresi</strong> açılır: «Tebrikler! Hedefinizi
geçtiniz» ve geçilen hedeflerin adı. <strong>«Teşekkürler»</strong> ya da
<strong>«Hedefleri gör»</strong> dediğinizde o cihazda o tebrik için bir daha açılmaz.
Başka bir cihazda (ör. telefonunuzda) o cihaz için ayrıca bir kez açılır.</li>
<li>Hedefler düğmesinin köşesinde <strong>yeşil nokta</strong> belirir; içinde
bulunduğunuz dönemde geçilmiş hedef olduğu sürece durur.</li>
<li>Bildirimi açık cihazlara <strong>«Tebrikler!»</strong> bildirimi gider (bkz.
<a href="#bildirim">Bildirimler</a>). Kilit ekranında tutar yazmaz.</li>
</ul>
<p>Her hedef, her dönem için <strong>bir kez</strong> kutlanır. Sistem hedefin
geçildiğini sipariş çekiminden sonra fark eder (5 dakikada bir); açık ekranda
pencere en geç bir dakika içinde çıkar.</p>
<div class="ek-not dikkat"><div class="etiket">Kâr hedefi herkese görünmez</div>
<p>Kâr (NET-2) hedefi, kutusu, ilerlemesi, tebriği ve bildirimi yalnız <strong>satış
kârını görme</strong> izni olanlara çıkar. Ötekiler ciro ve sipariş hedeflerini görür.</p></div>
<div class="ek-not dikkat"><div class="etiket">İade gelirse</div>
<p>Hedef geçildikten sonra gelen bir iade rakamı hedefin altına düşürebilir.
Hedefler sayfası güncel rakamı gösterir; verilmiş tebrik geri alınmaz.</p></div>
${sikHata([
  {
    hata: "Tutarı «1.100.000» ya da «500.000 ₺» diye yazmak",
    cozum: "Kabul edilmez. Düz sayı yazın: 1100000.",
  },
  {
    hata: "Hedefi panelde aramak",
    cozum: "Panelde hedef kartı yoktur. Üst çubuktaki Hedefler düğmesine basın.",
  },
  {
    hata: "Euro satışların hedefe sayılmasını beklemek",
    cozum: "Hedefler yalnız Türk lirası satışlarla ölçülür; kur çevrilmez.",
  },
  {
    hata: "Kutlama penceresini kapatıp tekrar görmek istemek",
    cozum: "O cihazda bir daha açılmaz. Hangi hedeflerin geçildiğini Hedefler sayfası her zaman gösterir.",
  },
  {
    hata: "Hedef geçildiği hâlde pencerenin ve bildirimin hiç gelmemesi",
    cozum: "Kutlama, anlık bildirim altyapısına bağlıdır. Bildirimler ekranında «henüz kurulmadı» yazıyorsa pencere de açılmaz; geliştiriciye bildirin. Hedefler sayfası ilerlemeyi yine doğru gösterir.",
  },
])}
</section>

<section id="gider">
${baslik("gider")}
${neZaman(
  "Kira, maaş, muhasebe ücreti, ambalaj, abonelik, banka masrafı, vergi gibi satışa DOĞRUDAN bağlı olmayan her harcamada. Satışın kendi kesintileri (komisyon, kargo, hizmet bedeli, stopaj) buraya girmez — onları sistem satıştan kendisi hesaplar.",
)}
<p><strong>Sol menü → Giderler.</strong> Bu ekrandaki giderler <strong>ürün kârının
içine girmez</strong>; <strong>dönem raporunda</strong> o ayın kârından topluca
düşülür. Yeni kayıt için sağ üstteki <strong>«Yeni gider»</strong> düğmesine basın.</p>

${ekranSemasi("Giderler", [
  { no: 1, ad: "Üst düğmeler", aciklama: "Excel indir · Dönem raporu · Tekrarlayan giderler · Yeni gider.", genis: true },
  { no: 2, ad: "Süzgeç ve arama", aciklama: "Ay (son 12 ay) · kategori · arama kutusu (açıklama, kategori, şablon ya da kart adı)." },
  { no: 3, ad: "Toplam şeridi", aciklama: "Süzgeçteki giderlerin toplamı: KDV dahil · indirilebilir KDV · gerçek net'ten düşen. Para birimi başına ayrı kutu.", vurgulu: true },
  { no: 4, ad: "Gider satırları", aciklama: "Kategori ve Sabit/Değişken rozeti · tarih · açıklama · ödeme şekli · oran · içindeki KDV · net'ten düşen · tutar. Her satırda Düzenle (kalem) ve Sil (çöp kutusu).", genis: true },
])}

<h3>Yeni gider girmek</h3>
${adimlar([
  { ad: "«Yeni gider»", ne: "Giderler ekranının sağ üstündeki düğmeye basın." },
  { ad: "Tarih ve kategori", ne: "Gider tarihi bugünle dolu gelir; gerekirse değiştirin. Kategoriyi seçince <strong>KDV oranı kendiliğinden gelir</strong>." },
  { ad: "Tutar", ne: "Tutarı <strong>KDV dahil</strong> yazın (faturanın alt toplamı). Para birimi TL ya da EUR seçilebilir." },
  { ad: "KDV oranı", ne: "Kategoriden gelen oran faturanızla tutmuyorsa düzeltin. KDV'siz giderde (maaş, vergi) <strong>0</strong> yazın." },
  { ad: "Nasıl ödendi?", ne: "Nakit · Havale / EFT · Kartla. Ayrıntısı aşağıda." },
  { ad: "Açıklama", ne: "İsteğe bağlı ama önerilir (örn. «Ağustos ofis kirası»); listede ve aramada bu metin görünür." },
  { ad: "«Gideri kaydet»", ne: "Kayıt listede hemen görünür ve toplam şeridi yenilenir." },
])}
<ul>
<li>Gerçek net'ten düşen kısım tutarın <strong>KDV hariç</strong> hâlidir. İçindeki KDV
«indirilebilir KDV» olarak ayrı gösterilir, çünkü ödenecek KDV'nizden düşülür.</li>
<li>Örnek: 1.200 TL'lik kira faturası, %20 KDV → içindeki KDV 200 TL, net'ten düşen
1.000 TL.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p><strong>KDV ödemenizi gider olarak girmeyin.</strong> NET-2 hesabı ödenecek
KDV'yi zaten düşüyor; ikinci kez düşerdi. «Vergi» kategorisi damga vergisi, MTV
gibi KDV dışı vergiler içindir — o kategoriyi seçtiğinizde form bu uyarıyı
ayrıca gösterir.</p></div>

<h3>Gider kategorileri</h3>
<p>Her gider bir <strong>kategoriye</strong> bağlanır ve kategori ya
<strong>sabit</strong> (kira gibi her ay aynı) ya da <strong>değişken</strong>
(ambalaj gibi hacimle değişen) türdedir; listede rozet olarak görünür. Bu ayrım dönem
raporunda sabit giderlerin ayrı toplanmasını sağlar.</p>
<p>Gider kategorilerinin listesi ve varsayılan KDV oranları sistemde hazır
tanımlıdır. <strong>Yeni gider kategorisi ekleyecek bir ekran henüz yok</strong>;
listede olmayan bir kategoriye ihtiyacınız olursa <strong>Destek talebi</strong>
açın.</p>

<h3>Her ay tekrar eden giderler</h3>
<p><strong>Giderler → «Tekrarlayan giderler».</strong> Kirayı bir kez şablon olarak
tanımlarsınız (ad, kategori, tutar, para birimi, KDV oranı, ayın kaçında ödendiği,
açıklama), her ay şablonun satırındaki <strong>«Bu ay için ekle»</strong> ile tek
dokunuşla girersiniz.</p>
<ul>
<li>Sistem <strong>kendiliğinden kayıt üretmez</strong>; her ay siz eklersiniz.</li>
<li>Gider, şablondaki günle bu aya yazılır (31 yazılı ve ay 30 çekiyorsa ayın son
gününe). Gün boşsa bugünün tarihi kullanılır.</li>
<li>Aynı şablondan o ay zaten gider girilmişse düğme <strong>«Bu ay eklendi»</strong>
olur ve pasifleşir — kirayı ikinci kez girmiş olmazsınız.</li>
<li>Kullanmadığınız şablonu <strong>«Pasife al»</strong> ile kapatın; pasif
şablondan gider eklenemez.</li>
<li>Şablondan eklenen giderin <strong>ödeme şekli boş</strong> gelir. Kartla
ödüyorsanız gideri açıp «Kartla»yı ve kartı işaretleyin; yoksa kart borcuna
girmez.</li>
</ul>

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
<strong>Kartla</strong>. Hiçbiri önceden işaretli gelmez. <strong>Kartla</strong>'yı
seçince altta <strong>kart listesi</strong> açılır (yalnız aktif kartlar).</p>
<ul>
<li>Kart seçtiğiniz an bu tutar <strong>o kartın borcuna</strong> ve
<strong>nakit takvimine</strong> girer. Seçmezseniz girmez — sistem hangi
kartla ödediğinizi tahmin etmez.</li>
<li><strong>Taksit sayısı isteğe bağlıdır</strong> (1–36). Boş bırakırsanız tek çekim
sayılır.</li>
<li>«Kartla» deyip kart seçmezseniz kayıt durur ve “hangi kart olduğunu seçmediniz”
der. «Nakit» ya da «Havale» seçili iken kart da seçili kalmışsa yine durur ve
hangisinin doğru olduğunu size sorar — sistem kartı kendiliğinden silmez.</li>
<li>Hiç aktif kartınız yoksa liste açılmaz; yerine önce <strong>Kartlar</strong>
ekranından kart tanımlamanız gerektiği yazar.</li>
</ul>
<div class="ek-not"><div class="etiket">Gerçek akış</div>
<p>Vergiyi devlete <strong>peşin</strong> kartla ödersiniz, sonra banka
uygulamasına girip <strong>taksite böldürürsünüz</strong>. Karta yansıyan borç
artık taksitlidir. O yüzden taksit sayısını <strong>böldürdükten sonra</strong>
gidere yazın: borç doğru aylara dağılsın, hepsi tek aya yığılmasın. Kayıt
girilmişse satırdaki <strong>Düzenle</strong> ile taksit sayısını sonradan da
yazabilirsiniz.</p></div>
<div class="ek-not dikkat"><div class="etiket">Para birimi çevrilmez</div>
<p>EUR bir gideri TRY bir karta yazamazsınız — sistem kur çevirmez, çünkü
uydurma bir rakam üretmiş olurdu. Böyle bir kayıt <strong>kart borcuna
girmez</strong> ve kart borcu ekranında <strong>“atlanan” sayısında</strong>
görünür: sessizce kaybolmaz, size söylenir.</p></div>

<h3>“Belirtilmedi” ne demek</h3>
<p>Ödeme yöntemi alanı <strong>25.08.2026'da</strong> açıldı. Ondan önce
girdiğiniz giderlerin nasıl ödendiğini sistem <strong>bilmiyor</strong> ve
listede <strong>“Belirtilmedi”</strong> yazar. Şablondan eklenen ve formda hiçbir
seçim yapılmadan kaydedilen gider de böyle görünür.</p>
<ul>
<li>Bu bir <strong>hata değil</strong>: sistem “Nakit” diye tahmin etmek yerine
bilmediğini söylüyor. Tahmin etseydi bir daha hiç sorgulamazdınız.</li>
<li>Eski bir kayıtta <strong>kart seçili ama yöntem boşsa</strong> liste
<strong>“Belirtilmedi · (kartın adı)”</strong> diye yazar — kartı gizlemez, ama
kartın varlığından “Kartla ödendi” sonucunu da <strong>çıkarmaz</strong>.</li>
<li>Biliyorsanız kaydı <strong>düzenleyip</strong> işaretleyebilirsiniz; formda
«Seçimi kaldır (belirtilmedi)» ile boşa da döndürebilirsiniz. Zorunlu değildir;
hiçbir hesap bu alandan yürümez. Kart borcunu belirleyen şey <strong>seçilen
karttır</strong>, bu alan değil.</li>
</ul>

<h3>Gideri bir ortaklık projesine yazmak</h3>
<p>İş Ortakları yetkiniz varsa gider formunun altında <strong>«Ortaklık projesi
payı»</strong> bölümü görünür: <strong>Projeye yazılmaz</strong> · <strong>Tek
proje</strong> · <strong>Birden çok projeye böl</strong>. Ayrıntısı İş Ortakları
bölümündedir. Bir ortağa yapılan ödemeden doğan gider bu ekrandan
<strong>değiştirilemez ve silinemez</strong>; düzeltmesi ortak hesabında ters
kayıtla yapılır.</p>

<h3>Düzeltmek ve silmek</h3>
<ul>
<li><strong>Düzenle</strong> (kalem simgesi): bütün alanlar değişebilir.</li>
<li><strong>Sil</strong> (çöp kutusu): onay sorar ve geri alınamaz; dönem raporundaki
rakamlar değişir.</li>
<li>Bir ayın giderlerini dışarı almak için ay süzgecini seçip <strong>«Excel
indir»</strong>'e basın — inen dosya ekrandaki süzgeci ve aramayı taşır.</li>
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
(etiket, banka, son 4 hane, para birimi, limit, kesim günü, son ödeme günü).
<strong>Kart Borcu</strong> o kartlarda biriken borcu, hangi ekstreye düştüğünü
ve ne zaman ödeneceğini gösterir.</p>
${neZaman(
  "Alım yapmadan önce (hangi kartta yer var) ve ay sonuna doğru (ne kadar ödeme çıkacak). Ekstreyi bankaya ödediğinizde de buraya gelip ödemeyi işaretlersiniz.",
)}

<h3>Kart tanımlamak</h3>
${adimlar([
  { ad: "Kartlar ekranını açın", ne: "<strong>Sol menü → Kartlar.</strong> Sağ üstte <strong>«Yeni Kart»</strong>." },
  { ad: "Kart bilgileri", ne: "<strong>Kart etiketi</strong> (listede görünecek ad) ve <strong>son 4 hane</strong> zorunlu; banka ve kart sahibi isteğe bağlı. Tam kart numarası, CVV ve son kullanma tarihi <strong>istenmez ve saklanmaz</strong>." },
  { ad: "Ekstre ve limit", ne: "Kartın para birimi (TL ya da EUR), limit, <strong>hesap kesim günü</strong> ve <strong>son ödeme günü</strong> (ayın günü, 1–31)." },
  { ad: "«Kartı Kaydet»", ne: "Kart artık alım ve gider formlarında seçilebilir." },
])}
<p>Kartlar listesinde her satırda <strong>Detay</strong> (o kartla yapılan alımlar),
<strong>Düzenle</strong> ve <strong>Pasife al</strong> düğmeleri durur. Pasife alınan
kart alım ve gider formlarında artık seçilemez.</p>
<div class="ek-not dikkat"><div class="etiket">Pasif kart borç ekranından çıkar</div>
<p>Kart Borcu ekranı yalnız <strong>aktif</strong> kartları gösterir. Borcu kapanmamış
bir kartı pasife alırsanız o borç bu ekranda görünmez olur. Kartı, son ekstresi
ödenip kapandıktan sonra pasife alın.</p></div>

<h3>Kesim günü neden önemli</h3>
<p>Bir alım, kartın kesim gününden ÖNCE yapılırsa o ayın ekstresine düşer ve
yakında ödenir; kesimden SONRA yapılırsa bir sonraki ekstreye kayar ve
<strong>bir ay daha nakitte kalırsın.</strong> Sistem her alımı ve kartla ödenmiş
her gideri doğru ekstreye kendisi yazar; taksitli olanları taksit sayısına bölüp
her taksiti kendi ayına koyar.</p>
<div class="ek-not"><div class="etiket">İki varsayım — ilk ekstrenizle karşılaştırın</div>
<p>Kesim <strong>gününde</strong> yapılan alım o ayın ekstresine düşer; taksitte
bölünmeyen kuruş son taksite eklenir. Bankanızın ilk gerçek ekstresiyle karşılaştırıp
teyit edin.</p></div>

<h3>Borç nereden gelir</h3>
<p>Ayrı bir ekstre kaydı tutulmaz; borç kayıtlarınızdan <strong>türetilir</strong>:</p>
<ul>
<li><strong>Alımlar</strong> — alım formunda kart seçilmişse (iptal edilmiş alım girmez).</li>
<li><strong>Giderler</strong> — gider formunda «Kartla» seçilip kart işaretlenmişse.</li>
<li><strong>Geçmiş ekstreler</strong> — sistemden önceki aylar için içe aktardığınız
beyan; ekstrede <strong>«geçmiş beyan»</strong> rozetiyle görünür.</li>
<li><strong>Alım iadeleri</strong> — mal kabulde hasarlı sayılıp tazminatı tahsil edilen
ve kartla ödenmiş alımın parası, tahsil gününden itibaren alımın taksitlerine bölünerek
borçtan düşer. Tahsil günü bilinmeyen eski iadeler ekranın üstünde ayrıca sayılır ve
Tazminat ekranına bağlantı verilir.</li>
</ul>

${ekranSemasi("Kart Borcu", [
  { no: 1, ad: "Toplam kutuları", aciklama: "Para birimi başına toplam bekleyen (gecikmiş varsa kırmızı rozet) ve kalan limit · sıradaki ödeme günü ve tutarı.", genis: true, vurgulu: true },
  { no: 2, ad: "Ödenmemiş ekstreler", aciklama: "Vadesi geçmiş ve kapanmamış ekstreler, en eskisi başta. Kart adına tıklayınca o kartın sekmesi açılır." },
  { no: 3, ad: "Kart sekmeleri", aciklama: "Her sekmede kart adı ve bekleyen tutar; en borçlu kart başta. Sekmede: kesim/son ödeme günü · bekleyen toplam · kalan limit ve doluluk yüzdesi." },
  { no: 4, ad: "Borç dökümü", aciklama: "Ekstre ekstre: kesim ve son ödeme tarihi, durum (ödendi · ödenmedi · kısmen ödendi), içindeki alım ve giderler (taksit sırasıyla), ödemeler ve «Ödendi işaretle».", genis: true },
])}

<h3>Ekstreyi ödediğinizi işaretlemek</h3>
${adimlar([
  { ad: "Kartın sekmesini açın", ne: "Ödediğiniz ekstrenin altında <strong>«Ödendi işaretle»</strong>'ye basın." },
  { ad: "Ödenen ana borç", ne: "Sistemin hesabı (ya da kısmen ödenmişse kalan) hazır yazılı gelir. Banka farklı kestiyse bankanın tutarını yazın." },
  { ad: "Ödeme tarihi", ne: "Bankadan çıktığı gün." },
  { ad: "Gecikme faizi", ne: "<strong>Faiz yok</strong> · <strong>Oran × gün</strong> (günlük oranı ve gün sayısını siz girersiniz, sistem yalnız çarpar) · <strong>Tutarı yazacağım</strong>. Faiz varsa hangi gider kategorisine yazılacağını seçersiniz." },
  { ad: "«Onayla ve kaydet»", ne: "Altta «Kaydedilecek» özeti durur: ekstre borcu, daha önce ödenen, ödeniyor, bu ödemeden sonra kalan ve faiz." },
])}
<ul>
<li><strong>Ana borç ödemesi kârı etkilemez</strong> — malın maliyeti zaten alımda
sayıldı. Kârı düşüren tek şey <strong>faizdir</strong>; seçtiğiniz gider kategorisine
yazılır ve o dönemin kârından düşer.</li>
<li>Ekstre henüz kesilmemişse, zaten kapanmışsa ya da yazdığınız tutar kalan borcu
aşıyorsa form uyarır ve devam etmek için <strong>«Biliyorum, yine de ekle»</strong>
kutusunu işaretlemenizi ister (mükerrer ödeme olabilir).</li>
<li>Yanlış girilen ödeme silinmez: ödeme satırındaki <strong>«Ters al»</strong> ile
ters kayıt yazılır.</li>
<li>Ödeme kaydetmek «satış kârını gör» yetkisi ister; yetkiniz yoksa form yerine
nedeni yazar.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Para birimi çevrilmez</div>
<p>Kart hangi para biriminde ekstre kesiyorsa yalnız o para birimindeki alım ve
giderler toplanır. Başka para birimindeki kayıtlar borca <strong>katılmaz</strong>
ve kartın sekmesinde “farklı para birimindeki N alım bu hesaba katılmadı” diye
yazar.</p></div>
${sikHata([
  {
    hata: "Kesim günü girilmemiş kart",
    cozum: "Kesim günü olmadan borcun hangi aya düştüğü BİLİNEMEZ. Sistem sıfır göstermez, “hesaplanamıyor” der ve sebebini yazar. Kartın sekmesindeki «Kartı düzenle» ile (ya da Kartlar → Düzenle) kesim gününü girin.",
  },
])}
</section>

<section id="finansman">
${baslik("finansman")}
<p><strong>Sol menü → Finansman.</strong> Firmaya giren ve geri ödenecek parayı
tutar. Dört kaynak türü vardır ve her birinde yapılabilecek hareket farklıdır:</p>
<div class="ek-tablo"><table>
<thead><tr><th>Kaynak türü</th><th>Yapılabilen hareket</th><th>Ne demek</th></tr></thead>
<tbody>
<tr><td><strong>Sermaye artırımı</strong></td><td>Giriş</td><td>Ortak firmaya kalıcı para koydu. Geri ödenmez.</td></tr>
<tr><td><strong>Ortaktan borç</strong></td><td>Giriş · Geri ödeme / taksit · Sermayeye mahsup</td><td>Ortak borç verdi. Geri ödenebilir ya da sermayeye çevrilebilir (mahsup): mahsup edilen tutar kalan borçtan düşer, sermaye sayılır, nakit hareketi değildir.</td></tr>
<tr><td><strong>Üçüncü kişiden borç</strong></td><td>Giriş · Geri ödeme / taksit</td><td>Ortak olmayan birinden alınan borç.</td></tr>
<tr><td><strong>Banka kredisi</strong></td><td>Giriş · Geri ödeme / taksit</td><td>Bankadan çekilen kredi; taksitlerde faiz ve vergi (BSMV vb.) ayrı yazılır.</td></tr>
</tbody></table></div>
${neZaman(
  "Firmaya sermaye ya da borç para girdiğinde, bir kredi çektiğinde, her taksit ödendiğinde ve bir ortağın borcu sermayeye çevrildiğinde.",
)}
<div class="ek-not dikkat"><div class="etiket">Bu para gelir DEĞİLDİR</div>
<p>Sermaye, borç ve kredinin kendisi ciroya ve kâra <strong>girmez</strong>.
Kâra düşen tek kalem, ödenmiş taksitteki <strong>faiz ve vergi</strong>dir —
«Gerçekleşti» dediğinde seçtiğin gider kategorisine yazılır ve NET-2'den
düşer. Faiz ve vergi yalnız <strong>geri ödeme / taksit</strong> hareketinde girilir.</p></div>

<h3>Yeni kaynak açmak</h3>
${adimlar([
  { ad: "«Yeni kaynak»", ne: "Finansman ekranının üstündeki düğme formu açar." },
  { ad: "Tür ve Kimden", ne: "Dört türden birini seçin; «Kimden» alanına kişinin ya da bankanın adını yazın." },
  { ad: "Borç birimi", ne: "TL ya da EUR. Ayarlar → Özellikler'den döviz ve altın açıksa USD ve altın birimleri de seçilebilir." },
  { ad: "Not ve «Kaynağı kaydet»", ne: "Kaynak listeye eklenir; adına tıklayıp hareketlerini girersiniz." },
])}

<h3>Hareket eklemek: plan ve gerçekleşme</h3>
<p>Kaynağın detayında <strong>«Hareket ekle»</strong>: hareket türü, vade, tutar (geri
ödemede anapara + faiz + vergi) ve not. Altta <strong>«Bu hareket gerçekleşti»</strong>
kutusu vardır:</p>
<ul>
<li><strong>İşaretlemezseniz PLAN</strong> olarak yazılır: nakit takviminde görünür ama
bakiyelere (kalan borç, sermaye) girmez.</li>
<li>Para girdiği ya da taksit ödendiği gün satırdaki <strong>«Gerçekleşti»</strong>
düğmesine basın ve gerçekleşme tarihini girin. Taksitse faiz + verginin yazılacağı gider
kategorisi sorulur.</li>
<li><strong>Gerçekleşmiş hareket değiştirilmez ve silinmez</strong>; yanlışsa
<strong>«Ters kayıt»</strong> yapılır (faizi gidere yazılmışsa o da terslenir). Henüz
gerçekleşmemiş planı <strong>«Planı sil»</strong> ile silebilirsiniz.</li>
<li>Yanlış açılmış kaynağı <strong>«Kaynağı sil»</strong> ile kaldırırsınız — yalnız
gerçekleşmiş hareketi yoksa.</li>
</ul>

<h3>Banka ödeme planı</h3>
<p>Faizi sistem hesaplamaz. Bankanın ödeme planındaki satırları kopyalayıp kaynağın
detayındaki <strong>«Ödeme planını yapıştır»</strong> kutusuna yapıştırırsın: her satır
tarih, anapara, faiz ve (varsa) vergi.</p>
<p>Örnek satır: <strong>15.10.2026 &nbsp; 8.333,33 &nbsp; 2.450,00 &nbsp; 122,50</strong>.
Kutu yazarken kaç taksit okunduğunu gösterir; <strong>«Planı kaydet»</strong> deyince
taksitler plan olarak eklenir. Tek satır okunamazsa hiçbiri yazılmaz ve hangi satır
olduğu söylenir. Bu kutu yalnız borç kaynaklarında (sermayede değil) görünür.</p>

${ekranSemasi("Finansman", [
  { no: 1, ad: "Yeni kaynak", aciklama: "Tür · Kimden · Borç birimi · Not." },
  { no: 2, ad: "Tür süzgeci ve arama", aciklama: "Hepsi · Sermaye artırımı · Ortaktan borç · Üçüncü kişiden borç · Banka kredisi; arama «Kimden» ve notta." },
  { no: 3, ad: "Toplam kutuları", aciklama: "Birim başına: sermaye · ortaklara, üçüncü kişilere ve bankaya kalan borç · ödenen faiz + vergi · plan (girecek · çıkacak, nakit takvimine bağlantı). Süzgeçle birlikte değişir.", genis: true, vurgulu: true },
  { no: 4, ad: "Kaynak listesi", aciklama: "Kimden, tür, giren, geri ödenen, (ortak borcunda) sermayeye mahsup, ödenen faiz, hareket sayısı ve sağda kalan borç ya da sermaye." },
  { no: 5, ad: "Kaynak detayı", aciklama: "Özet kutuları · hareketler (her satırda Gerçekleşti · Ters kayıt · Planı sil) · Hareket ekle · Ödeme planını yapıştır." },
])}

<h3>Döviz ve altın borç</h3>
<p>Ayarlar → Özellikler'de açıksa borç USD ya da altın (gram veya adet) cinsinden
tutulabilir. Borç kendi biriminde durur; ekranın üstünde <strong>«Toplam kalan borç — TL
karşılığı (tahmini)»</strong> kutusu, <strong>«Birim fiyatları»</strong> bölümüne
girdiğiniz son fiyatlarla hesaplanır. Fiyatı girilmemiş birim toplama katılmaz ve
adı kutuda yazar. Böyle bir borcun taksitinde faiz + verginin <strong>ödenen TL
karşılığı</strong> ayrıca sorulur, çünkü gidere TL yazılır; sistem kur çevirmez.</p>

<h3>Ortaklık projesiyle bağ</h3>
<p>Bir ortağın koyduğu sermaye ya da verdiği borç, İş Ortakları ekranında o ortağın
proje katılımına bağlanabilir. Bağlı kaynağın detayında proje ve ortak adı görünür;
hareketler yine burada girilir, kopyalanmaz.</p>
${sikHata([
  {
    hata: "Kredinin kendisini gelir sanmak",
    cozum: "Kredi girişi kasayı artırır ama kâr değildir. Finansman ekranına girilir, satış ya da gider olarak girilmez.",
  },
  {
    hata: "Taksiti ödeyip «Gerçekleşti» dememek",
    cozum: "Plan olarak kalan taksit nakit takviminde «çıkacak» görünmeye devam eder ve faizi gidere yazılmaz. Ödediğin gün işaretle.",
  },
])}
</section>

<section id="ortaklik">
${baslik("ortaklik")}
<p><strong>Sol menü → İş Ortakları.</strong> Bir ortakla birlikte yürüttüğün işi
<strong>proje</strong> olarak açarsın; kimin hangi projede ne katkı verdiğini, hangi
malın o projeye ait olduğunu, kârın nasıl bölüneceğini ve her ortağın ne kadar hak
edip ne kadar aldığını burada tutarsın. Pazaryeri hesabı ve satışlar yine senin
firmanındır; modül yeni bir satış ya da stok kaydı açmaz, var olan alımları projeye
<strong>işaretler</strong>.</p>
${neZaman(
  "Bir ortakla yeni bir iş başlattığında, ortak para koyduğunda ya da o işe ait mal aldığında; her ay kapandıktan sonra kârı kesinleştirmek için; ortağa ödeme yaptığında.",
)}

<h3>Beş ekran, tek akış</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Ekran</th><th>Nereden açılır</th><th>Ne işe yarar</th></tr></thead>
<tbody>
<tr><td><strong>İş Ortakları</strong></td><td>Sol menü</td><td>Proje, ortak kartı, katılım, finansman bağı, ürün kuralı.</td></tr>
<tr><td><strong>Proje sonucu</strong></td><td>Proje kartında «Sonucu aç»</td><td>Projenin satışları, iadeleri, gideri ve dönem sonucu.</td></tr>
<tr><td><strong>Paylaşım</strong></td><td>Proje kartında «Paylaşımı aç»</td><td>Anlaşma sürümleri, ay ay paylaşım, ayı kesinleştirme.</td></tr>
<tr><td><strong>Ortak hesabı</strong></td><td>Proje kartında «Ortak hesabı»</td><td>Her ortağın hakkı, ödenen ve kalan; ortağa ödeme.</td></tr>
<tr><td><strong>Ortaklık hesabım</strong></td><td>Ortak kendi girişiyle açar</td><td>Ortağın yalnız kendi hakkını ve ödemelerini gördüğü ekran.</td></tr>
</tbody></table></div>
<div class="ek-not"><div class="etiket">Sınırlar</div>
<p>Projeler <strong>Türk lirasıyla</strong> açılır. Projeden önce alınmış eski stok ve
geçmiş kâr projeye <strong>girmez</strong>. Proje adının yanındaki «Taslak» etiketi
projenin durumunu göstermez; kârın kesinleşmesi ay ay <strong>Paylaşım</strong>
ekranında olur.</p></div>

<h3>Kurulum sırası</h3>
${adimlar([
  { ad: "Yeni proje", ne: "Ad ve başlangıç tarihi. Başlangıç tarihi ve para birimi sonradan değişmez (bağlı alım ve finansman kayıtlarını etkiler); yalnız ad düzeltilebilir." },
  { ad: "Yeni ortak kartı", ne: "Ortağın adı. Aynı kişi birden çok projede yer alabilir. Kendiniz de bir ortaksanız kendinize de kart açın — anlaşma projedeki bütün ortakları ister." },
  { ad: "Projeye ortak ekle", ne: "Proje, ortak, <strong>sorumluluk</strong> (serbest metin) ve en az bir <strong>katkı türü</strong>. Her projede şartlar ayrıdır." },
  { ad: "Ortağın parasını bağla", ne: "Sermaye ya da ortak borcu önce Finansman'a girilir, sonra buradan katılıma bağlanır (aşağıda)." },
  { ad: "Malı projeye işaretle", ne: "Alım kalemlerini projeye işaretleyin ya da sık alınan ürüne kural koyun (aşağıda)." },
  { ad: "Anlaşmayı yaz", ne: "«Paylaşımı aç» → anlaşma sürümü: kâr nasıl bölünecek, zarar ne olacak, emek ücreti." },
])}

<h3>Katkı türleri neyi etkiler</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Katkı türü</th><th>Ne sağlar</th></tr></thead>
<tbody>
<tr><td><strong>Sermaye</strong></td><td>Bu katılıma Finansman'daki bir <strong>sermaye artırımı</strong> kaynağı bağlanabilir. Bağlıyken bu katkı kaldırılamaz.</td></tr>
<tr><td><strong>Borç finansmanı</strong></td><td>Bu katılıma bir <strong>ortaktan borç</strong> kaynağı bağlanabilir. Borcun yalnız <strong>sermayeye mahsup</strong> edilen kısmı sermaye sayılır; borç olarak duran kısım paylaşıma ağırlık vermez. Bağlıyken bu katkı kaldırılamaz.</td></tr>
<tr><td><strong>Emek</strong></td><td>Bilgi etiketidir. Emeğin karşılığı olan aylık <strong>emek ücreti</strong> anlaşma sürümünde yazılır.</td></tr>
<tr><td><strong>Satış komisyonu</strong></td><td>Bilgi etiketidir; bugün hiçbir hesaba girmez.</td></tr>
</tbody></table></div>

<h3>Hangi mal projeye ait</h3>
<p>Alım detayında, her kalemin altında <strong>«Ortaklık projesi kapsamı»</strong>
seçimi vardır; kapsam kalemin tamamına uygulanır. Mal kabul ya da hasar kaydı başlayınca
seçim kilitlenir. Sık alınan bir ürün için İş Ortakları ekranında <strong>ürün
kuralı</strong> tanımlarsın (barkodu okut ya da SKU yaz): o ürünün bundan sonraki
alımları kendiliğinden projeye işaretlenir. Kural eski alımları değiştirmez; Excel ile
içe aktarılan alımlara henüz uygulanmaz. Euro ile alınan kalem TL projeye girmez — alım
yine kaydedilir, form bunu önceden söyler.</p>

<h3>Ortağın parası</h3>
<p>Ortağın koyduğu sermaye ya da verdiği borç <strong>Finansman</strong> ekranına
girilir; sonra İş Ortakları'nda <strong>«Finansman kaynağını projeye bağla»</strong>
formunda proje-ortak ve kaynak seçilip <strong>«Bağla»</strong>'ya basılır. Bağ için üç
şart vardır, tutmazsa ekran nedenini yazar:</p>
<ul>
<li>Kaynağın birimi projenin para birimiyle (TL) aynı olmalı.</li>
<li>Sermaye kaynağı için katılımda <strong>Sermaye</strong>, ortak borcu için
<strong>Borç finansmanı</strong> katkısı işaretli olmalı.</li>
<li>Kaynak başka bir katılıma bağlı olmamalı.</li>
</ul>
<p>Kaynağın bütün geçmiş ve gelecek hareketleri o katılıma ait sayılır; hareketler
Finansman'da kalır, kopyalanmaz. Yanlış bağı <strong>«Bağı çöz»</strong> ile kaldırıp
doğru katılıma bağlayabilirsin.</p>

<h3>Projenin sonucu</h3>
<p>Proje kartındaki <strong>«Sonucu aç»</strong> projeye işaretli alımlardan çıkan
malın satışlarını gösterir: satılan adet, ciro, maliyet, NET-2, iade etkisi, projeye
yazılan gider ve <strong>dönem sonucu</strong>. Kâr, satışın kendi NET-2'sinden (kargo ve
sipariş kesintileri dahil) projenin adet payı kadar alınır — Satışlar ekranındaki
rakamla aynıdır. Kârı henüz hesaplanmamış satış toplama girmez ve ekranda ayrıca sayılır.
İade ya da iptalle geri gelip yeniden satılan mal bu sürümde projeye bağlanmaz.</p>
<p><strong>Dönem sonucu = iadeler sonrası NET-2 − projeye yazılan gider.</strong>
Paylaşım bu rakamı böler.</p>

<h3>Projeye gider yazmak</h3>
<p>Gider formundaki <strong>«Ortaklık projesi payı»</strong> bölümünde ya
<strong>tek proje</strong> ve yüzdesini (örn. maaşın %30'u) ya da <strong>birden çok
projeye böl</strong> seçeneğini seçersin; payların toplamı %100'ü aşamaz. Proje
sonucunda giderin <strong>KDV hariç</strong> tutarının bu payı düşülür — dönem raporuyla
aynı taban. Proje başlangıcından önceki gider projeye yazılamaz. Bu bölüm yalnız İş
Ortakları yetkisi olana görünür.</p>

<h3>Anlaşma: kâr nasıl bölünür</h3>
<p>Proje kartında <strong>«Paylaşımı aç»</strong>. Önce <strong>anlaşma sürümü</strong>
eklenir; form son sürümün değerleriyle dolu gelir:</p>
<ul>
<li><strong>Geçerlilik başlangıcı (ay)</strong> — proje başlangıç ayından önce olamaz;
aynı aya ikinci sürüm yazılamaz.</li>
<li><strong>Kalan kâr nasıl bölünsün</strong> — <strong>sabit oranla</strong> ·
<strong>sermayeye göre (gün ağırlıklı)</strong> · <strong>karma</strong> (kalanın yüzde
kaçının sermayeye gideceğini yazarsın, 0 ile 100 arası; gerisi sabit orana).</li>
<li><strong>Zarar olursa</strong> — sonraki kârdan mahsup · kâr oranıyla paylaşılır ·
sorumluluk payına göre paylaşılır.</li>
<li><strong>Kâr kullanımı</strong> — «Hak yazılır, ödeme ayrı» · «Tamamen yeniden
yatırım».</li>
<li>Her ortak için <strong>sabit oran (%)</strong>, <strong>aylık emek ücreti</strong>
ve <strong>sorumluluk payı (%)</strong>. Sabit oranların toplamı (sabit ya da karma
seçiliyse) ve sorumluluk paylarının toplamı (zarar sorumluluğa göre bölünecekse)
<strong>tam %100</strong> olmalı; form toplamı yazarken gösterir.</li>
</ul>
<p>Şartlar değişince yeni bir sürüm, ileri bir aydan geçerli olarak eklenir: önceki aylar
eski şartla, sonraki aylar yeni şartla hesaplanır. Sürümü <strong>«Sürümü
kaldır»</strong> ile silebilirsin; kapsadığı aylar bir önceki sürümle yeniden hesaplanır.</p>

<h3>Her ay hangi sırayla hesaplanır</h3>
<ol class="adimlar">
<li><div><h3>Emek ücretleri</h3><p>Her ortağın aylık emek ücreti <strong>her ay tam</strong>
yazılır. Kâr yetmezse fark zarar sayılır.</p></div></li>
<li><div><h3>Kâr kaldıysa</h3><p>Önce önceki aylardan <strong>devreden zarar</strong> kapatılır,
kalan seçilen yöntemle bölünür.</p></div></li>
<li><div><h3>Zarar kaldıysa</h3><p>Zarar kuralı uygulanır: ya devreder ya da ortaklara (kâr
oranıyla ya da sorumluluk payıyla) eksi pay olarak yazılır.</p></div></li>
</ol>
<p>Ortaklara yazılan toplam her zaman <strong>dönem sonucu + devreden zarardaki
değişim</strong>tir. Bölmede çıkan kuruş artığı en büyük paya eklenir.</p>

<h3>Sayısal örnek</h3>
<p>Kasım ayı (30 gün), dönem sonucu <strong>100.000 TL</strong>. <strong>Ortak A</strong>
300.000 TL sermayeyi ayın 1'inde koymuş; <strong>Ortak B</strong> 200.000 TL'yi ayın
16'sında koymuş ve aylık <strong>10.000 TL emek ücreti</strong> alıyor. Sabit oranlar
%50 / %50.</p>
<p><strong>Gün ağırlıklı sermaye:</strong> her gün o güne kadar gerçekleşmiş sermaye
toplanır, gün sayısına bölünür. A: 300.000 × 30/30 = <strong>300.000</strong> · B:
200.000 × 15/30 = <strong>100.000</strong> → ağırlık <strong>%75 / %25</strong>. Sayılan
para yalnız <strong>gerçekleşmiş</strong> hareketlerdir: sermaye kaynağında giriş, ortak
borcunda sermayeye mahsup — gerçekleşme gününden itibaren.</p>
<p>Önce B'nin 10.000 TL ücreti yazılır; bölünecek kalan <strong>90.000 TL</strong>.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Yöntem</th><th>Ortak A</th><th>Ortak B</th><th>Nasıl</th></tr></thead>
<tbody>
<tr><td><strong>Sabit oran</strong> (%50/%50)</td><td>45.000</td><td>10.000 + 45.000 = <strong>55.000</strong></td><td>90.000'in yarısı ikişer.</td></tr>
<tr><td><strong>Sermayeye göre</strong></td><td>67.500</td><td>10.000 + 22.500 = <strong>32.500</strong></td><td>90.000 × %75 / %25.</td></tr>
<tr><td><strong>Karma</strong> (%50 sermayeye)</td><td>33.750 + 22.500 = <strong>56.250</strong></td><td>10.000 + 11.250 + 22.500 = <strong>43.750</strong></td><td>45.000 sermayeye göre (%75/%25), 45.000 sabit orana (%50/%50).</td></tr>
</tbody></table></div>
<p>Üç satırda da toplam <strong>100.000 TL</strong> = dönem sonucu; devreden zarar yok.</p>

<h3>Zarar ayı örneği</h3>
<p>Aynı ortaklar, sabit oran %50/%50; ay sonucu yalnız <strong>6.000 TL</strong>. B'nin
10.000 TL ücreti yine tam yazılır, ücretten sonra <strong>−4.000 TL</strong> kalır.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Zarar kuralı</th><th>Ortak A</th><th>Ortak B</th><th>Devreden zarar</th></tr></thead>
<tbody>
<tr><td><strong>Sonraki kârdan mahsup</strong></td><td>0</td><td>10.000</td><td>4.000</td></tr>
<tr><td><strong>Kâr oranıyla</strong> (%50/%50)</td><td>−2.000</td><td>10.000 − 2.000 = 8.000</td><td>0</td></tr>
<tr><td><strong>Sorumluluk payına göre</strong> (A %30 · B %70)</td><td>−1.200</td><td>10.000 − 2.800 = 7.200</td><td>0</td></tr>
</tbody></table></div>
<p>Mahsup seçiliyse ertesi ay sonuç 30.000 TL olsun: B'nin ücreti 10.000, kalan 20.000'den
önce devreden 4.000 kapatılır, <strong>16.000</strong> bölünür → A <strong>8.000</strong>, B
10.000 + 8.000 = <strong>18.000</strong>; devreden zarar sıfırlanır.</p>
<div class="ek-not"><div class="etiket">Rakamlar nereden</div>
<p>Bu tablolar sistemin kendi paylaşım hesabı çalıştırılarak üretildi; aynı girdiyle
Paylaşım ekranı aynı sonucu verir.</p></div>

<h3>Paylaşım ekranı ve ayı kesinleştirmek</h3>
<p>Paylaşım ekranında üstte <strong>Ay</strong> seçilip <strong>«Göster»</strong>'e basılır.
Seçili ay için kutular (dönem sonucu · emek ücretleri · kapatılan devreden zarar ·
bölünen kâr/zarar · ay sonu devreden zarar · kâr kullanımı) ve ortak ortak tablo (emek
ücreti · kâr/zarar payı · toplam hak) çıkar. Altta <strong>Aylar</strong> tablosu her ayı
ve durumunu gösterir: <em>hesaplandı · anlaşma yok · sermaye yok · kesin · kesin ·
bayat</em>. Bu ekranın rakamları «satış kârını gör» yetkisi ister.</p>
<p>Ay doğruysa <strong>«Ayı kesinleştir»</strong>: rakamlar donar ve her ortağın hesabına
<strong>hak</strong> olarak yazılır. Düğme görünmüyorsa yerinde nedeni yazar:</p>
<div class="ek-tablo"><table>
<thead><tr><th>Ekranın yazdığı</th><th>Ne yapılır</th></tr></thead>
<tbody>
<tr><td>«Ay bitmeden kesinleştirilemez.»</td><td>İçinde bulunulan ay ve sonrası kesinleşmez; ayın bitmesini bekleyin.</td></tr>
<tr><td>«Kesinleştirmek için önce bu muhasebe ayı kapatılmalı (kaynak artık değişmesin).»</td><td>Yanındaki «Muhasebe dönemleri» bağlantısıyla o ayı kapatın.</td></tr>
<tr><td>«Bu ay hesaplanamadığı için kesinleştirilemez (anlaşma ya da sermaye eksik).»</td><td>O ayı kapsayan anlaşma sürümü ekleyin; sermayeye göre bölünüyorsa sermaye kaynağını katılıma bağlayın.</td></tr>
<tr><td>«Önce bundan önceki, anlaşması olan aylar sırayla kesinleştirilmeli.»</td><td>En eski kesinleşmemiş aydan başlayın; aylar sırayla kesinleşir.</td></tr>
<tr><td>«Bu ay ya da daha ileri bir ay zaten kesin.»</td><td>Bu ay zaten donmuş.</td></tr>
</tbody></table></div>
<p>Kesinleştirmeden önce şu uyarılara bakın: ayın kârı henüz hesaplanmamış satışlar
<strong>dönem sonucuna girmez</strong> ve ekran sayısını yazar; geçerli sürümde olmayan
ortak varsa o ay pay almaz ve adı yazar.</p>
<p><strong>Geri almak:</strong> yalnız <strong>son kesin ay</strong>, en az 5 karakterlik
gerekçeyle <strong>«Geri al»</strong> ile geri alınır. Hiçbir şey silinmez: ay geri alındı
diye işaretlenir, haklar ters kayıtla düşer; yapılmış ödemeler durur, bakiye eksiye
düşebilir. <strong>Bayat:</strong> kesin ayın kaynağı sonradan değişirse (geç gelen iade,
düzeltilen satış ya da gider) ekran ayı kırmızı «kesin · bayat» gösterir; donmuş rakam
kendiliğinden değişmez. Düzeltmek için ayı geri alıp yeniden kesinleştirin.</p>

${ekranSemasi("İş Ortakları → Paylaşım", [
  { no: 1, ad: "Ay seçimi", aciklama: "Ay · Göster. Proje sonucu ve ortak hesabına bağlantılar." },
  { no: 2, ad: "Kesinleştir / geri al", aciklama: "Ayı kesinleştir ya da (son kesin ayda) Geri al; olmuyorsa nedeni.", vurgulu: true },
  { no: 3, ad: "Ay kutuları ve ortak tablosu", aciklama: "Dönem sonucu · emek ücretleri · kapatılan zarar · bölünen · devreden · kâr kullanımı; ortak başına ücret, pay, toplam hak.", genis: true },
  { no: 4, ad: "Aylar", aciklama: "Her ay: sonuç, ücret, bölünen, devreden, durum. Aya tıklayınca o ay açılır." },
  { no: 5, ad: "Anlaşma sürümleri", aciklama: "Sürüm listesi (Sürümü kaldır) ve yeni sürüm formu." },
])}

<h3>Ortak hesabı ve ödeme</h3>
<p>Proje kartında <strong>«Ortak hesabı»</strong>. <strong>Bakiyeler</strong> tablosu her
ortağın <strong>hak · ödenen · kalan</strong> rakamını verir; hak yalnız
<strong>kesinleşmiş</strong> aylardan gelir, önizleme buraya yazılmaz.</p>
${adimlar([
  { ad: "Ortağa ödeme", ne: "Ortak, ödeme tarihi, tutar (TL) ve isteğe bağlı açıklama." },
  { ad: "«Gider olarak da kaydet»", ne: "Dış ortağa ödemede işaretleyin ve gider kategorisini seçin; ödeme KDV'siz gider olarak da yazılır. <strong>Kendinize ödemede işaretlemeyin.</strong> Bu kutu gider yazma yetkisi ister." },
  { ad: "Yeniden yatırım dönemi", ne: "Ödeme tarihi anlaşmanın «Tamamen yeniden yatırım» dönemine düşüyorsa form bir onay kutusu çıkarır; işaretlemeden kaydetmez ve onay kayda geçer." },
  { ad: "«Ödemeyi kaydet»", ne: "Ödeme ortağın kalanından düşer ve hareketlerde görünür." },
])}
<p>Kayıtlar değiştirilmez: yanlış ödeme satırdaki <strong>«Ters kayıt»</strong> ile
düzeltilir; ödeme gider de açtıysa eksi tutarlı ters gider yazılır. Ödemeden doğan gider
projeye yazılamaz (proje sonucu ikinci kez düşerdi) ve Giderler ekranından değiştirilemez.
Bakiyedeki ortak adına tıklayınca hareketler o ortağa süzülür; arama kutusu ortak adı ve
açıklamada arar ve altta gösterilen hareketlerin toplamı yazar.</p>
${ekranSemasi("İş Ortakları → Ortak hesabı", [
  { no: 1, ad: "Bakiyeler", aciklama: "Ortak başına hak · ödenen · kalan ve toplam satırı.", genis: true, vurgulu: true },
  { no: 2, ad: "Ortağa ödeme", aciklama: "Tarih · tutar · açıklama · Gider olarak da kaydet." },
  { no: 3, ad: "Hareketler", aciklama: "Hak · hak geri alındı · ödeme · ödeme ters kaydı; ödemede Ters kayıt düğmesi." },
])}

<h3>Ortağa kendi hesabını açmak</h3>
<p>Ortağın kendi hakkını ve ödemelerini görmesi için önce <strong>Ayarlar →
Kullanıcılar</strong>'da <strong>«Ortak»</strong> rolüyle bir kullanıcı açın, sonra İş
Ortakları'nda o ortağın kartındaki <strong>«Giriş hesabı»</strong> düğmesiyle bu
kullanıcıyı seçin (bu düğme kullanıcı yönetme yetkisi ister). Bir kullanıcı yalnız bir
ortak kartına bağlanabilir. Ortak giriş yapınca yalnız <strong>«Ortaklık
hesabım»</strong> ekranını görür: her projede hakkı, ödenen, kalan, projenin
<strong>kesinleşmiş</strong> aylarındaki dönem sonucu ve kendi payı, kendi hareketleri.
Panel, menü ve diğer ekranlar ona kapalıdır; diğer ortakların adı ve payı görünmez.
Kesinleşmemiş ay ona hiç görünmez. «Bağlı değil» seçerseniz ortağın girişi karttan
kopar.</p>

${ekranSemasi("İş Ortakları", [
  { no: 1, ad: "Üç form", aciklama: "Yeni proje · yeni ortak kartı · projeye ortak ekle.", genis: true, vurgulu: true },
  { no: 2, ad: "Bağ ve kural", aciklama: "Finansman kaynağını projeye bağla · yeni alımlar için ürün kuralı." },
  { no: 3, ad: "Arama", aciklama: "Proje, ortak adı ya da ürün kodu; kamera ile okutulabilir." },
  { no: 4, ad: "Ortak kartları", aciklama: "Kaç projede olduğu, giriş hesabı; Düzenle · Giriş hesabı · Sil." },
  { no: 5, ad: "Proje kartları", aciklama: "Sonucu aç · Paylaşımı aç · Ortak hesabı; katılımcılar, katkılar, bağlı kaynaklar, kurallar; her satırda Düzenle · Sil.", genis: true },
])}
${sikHata([
  {
    hata: "Eski stoğu projeye almaya çalışmak",
    cozum: "Proje başlangıcından önceki alım projeye bağlanamaz; ekran bunu söyler. Proje yalnız başlangıçtan sonraki yeni alımları kapsar.",
  },
  {
    hata: "Bağlı kaydı silmeye çalışmak",
    cozum: "Ortağı, alımı ya da kuralı olan proje silinmez. Önce bağları kaldır; yalnız yanlış açılmış boş kayıt silinir.",
  },
  {
    hata: "Muhasebe ayını kapatmadan «Ayı kesinleştir» aramak",
    cozum: "Düğme çıkmaz, yerine «önce bu muhasebe ayı kapatılmalı» yazar. Ekrandaki «Muhasebe dönemleri» bağlantısıyla ayı kapatıp Paylaşım ekranına dönün.",
  },
  {
    hata: "Kendinize yapılan ödemeyi «Gider olarak da kaydet» ile girmek",
    cozum: "Kendi payınızı almak firmanın gideri değildir; işaretlerseniz dönem kârı haksız yere düşer. Yanlış girildiyse ödemeyi Ters kayıt ile geri alıp işaretsiz yeniden girin.",
  },
])}
</section>

<section id="hakedis">
${baslik("hakedis")}
<p><strong>Sol menü → Hakediş.</strong> Pazaryeri sattığın malın parasını hemen
vermez. Hakediş, <em>ne kadar alacağın olduğunu ve ne zaman yatacağını</em>
takip eder: “Sattım, parayı ne zaman aldım?” sorusunun cevabı.</p>
${neZaman(
  "“Bu ay elime ne geçecek, eksik ödenen var mı” diye merak ettiğinde. Trendyol ve Hepsiburada ödemeleri kendiliğinden gelir; yalnız N11 dosyasını sen yüklersin.",
)}
<h3>Ödemeler nasıl gelir</h3>
<ul>
<li><strong>Trendyol ve Hepsiburada:</strong> ödeme kayıtları her sabah kanaldan
<strong>kendiliğinden</strong> çekilir; bir şey yapmanız gerekmez. Başlığın altında
<strong>«Son senkronizasyon»</strong> zamanı yazar; “henüz hiç çalışmadı” yazıyorsa
otomatik çekim gelmemiştir.</li>
<li><strong>N11:</strong> N11 satıcı panelinde <strong>Ödemelerim → Excel'e Aktar</strong>
ile dosyayı indirip burada yüklersiniz (aşağıdaki adımlar).</li>
<li>Aynı dosyayı ikinci kez yüklemek zararsızdır: zaten kayıtlı kalemler yeniden
yazılmaz.</li>
</ul>

<h3>Dosya yüklemek</h3>
${adimlar([
  { ad: "«Rapor yükle»", ne: "Hakediş ekranının sağ üstündeki düğme." },
  { ad: "Hangi mağazanın raporu?", ne: "Kanal hesabını seçin." },
  { ad: "Dosya", ne: "Pazaryerinden indirdiğiniz dosyayı <strong>değiştirmeden</strong> seçin. Kolon adları değiştirilmişse ekran hangi kolonu bulamadığını yazar." },
  { ad: "«Denetle»", ne: "Hiçbir şey yazmadan ne olacağını gösterir: dosyadaki satır · zaten yüklü (atlanacak) · yazılacak · satışa bağlanan · satışı bulunamayan · sipariş dışı (dönem kalemi) · eşleşen sipariş · net toplam. Uyarılar yüklemeyi durdurmaz; bilgi içindir." },
  { ad: "«Onayla ve yaz»", ne: "Kalemler yazılır ve kaç kalem yazıldığı söylenir." },
])}
<p>Her ödeme, sipariş sipariş <strong>beklenen hakedişle</strong> karşılaştırılır;
eksik, fazla ve geciken ödeme işaretlenir.</p>

<h3>Üç sekme</h3>
<ul>
<li><strong>Özet</strong> — <strong>Bekleyen para</strong> kutuları (bekleyen toplam ·
en yakın ödeme · gecikmiş kalem), <strong>kanal dağılımı</strong> grafiği ve
<strong>Kanal ödemeleri</strong> (gelecek ve geçmiş ödemeler, ödeme gününe göre
gruplu). Trendyol'un gelecek ödemesinde kargo, platform hizmet bedeli ve stopaj kanal
tarafından henüz yazılmadığı için <strong>tahminen</strong> düşülür ve satırda
«Tahmini hesaplanmıştır» rozeti durur.</li>
<li><strong>Detay</strong> — <strong>Ödeme özeti</strong>: pazaryerinin kendi panelindeki
düzen, bir satır bir ödeme. Satırı açınca kalem dökümü ve siparişler görünür. Sipariş ya
da fatura numarasıyla aranır; geçmiş ve gelecek ödemeler ayrı sekmededir.</li>
<li><strong>Kontrol</strong> — <strong>Beklenen vs gerçekleşen</strong>, eşleşmeyen
kalemler ve yüklenen raporların listesi.</li>
</ul>

<h3>Beklenen vs gerçekleşen nasıl okunur</h3>
<ul>
<li><strong>Beklenen</strong> = kâr hesabınızdaki net hakediş (NET-1 + maliyet).
<strong>Gerçekleşen</strong> = o satışa bağlanmış rapor kalemlerinin toplamı.</li>
<li>Fark <strong>1 TL'yi</strong> aşarsa satır <strong>eksik ödeme</strong> ya da
<strong>fazla ödeme</strong> diye işaretlenir; kuruş farkı yuvarlamadandır.</li>
<li>Vadesinden <strong>3 iş günü</strong> geçmiş ödenmemiş kalem <strong>gecikti</strong>
sayılır. Resmî tatiller hesaba katılmadığı için beklenen tarih birkaç gün erken çıkabilir.</li>
<li>İade edilmiş satışlar bu listeye girmez; onların hakedişi İadeler ekranında
görünür.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Ödeme dosyası GEÇ gelir</div>
<p>Ölçüldü: Trendyol ödeme dosyası siparişten <strong>ortanca 28 gün</strong>
sonra, Hepsiburada <strong>~34 gün</strong> sonra yayımlanıyor. Yani
“ağustos dosyası” haziran-temmuz siparişlerini taşır. Erken indirilen
dosya hiçbir satışla eşleşmez — bu bir arıza değil, <strong>takvimin
kendisi</strong>.</p></div>
${ekranSemasi("Hakediş", [
  { no: 1, ad: "Başlık", aciklama: "Son senkronizasyon zamanı · «Rapor yükle» (önce Denetle, sonra Onayla ve yaz)." },
  { no: 2, ad: "Özet sekmesi", aciklama: "Bekleyen para kutuları · kanal dağılımı · gelecek ve geçmiş kanal ödemeleri.", genis: true, vurgulu: true },
  { no: 3, ad: "Detay sekmesi", aciklama: "Ödeme özeti: bir satır bir ödeme; açınca kalem dökümü ve siparişler." },
  { no: 4, ad: "Kontrol sekmesi", aciklama: "Beklenen vs gerçekleşen · eşleşmeyen kalemler (ayrı sayılır) · yüklenen raporlar." },
])}
${sikHata([
  {
    hata: "Bağlanamayan kalemi “alacak” sanmak",
    cozum: "Satışına bağlanamamış kalem bir ALACAK değil, bir RAPOR SATIRIDIR. Sistem onun hakkında gecikme iddiası kurmaz — bilmediği bir şey hakkında hüküm vermez. Satışı girildiğinde kalem ona bağlanabilir.",
  },
  {
    hata: "Ödeme dosyasını çok erken indirmek",
    cozum: "Siparişten 28–34 gün geçmeden o siparişler dosyada olmaz. Erken yükleme, bağlanamayan kalem yığınını büyütür ve hiçbir şeyi bağlamaz.",
  },
])}
</section>

<section id="tazminat">
${baslik("tazminat")}
<p><strong>Sol menü → Tazminat.</strong> Hasarlı mal için <strong>alacak
takibi</strong>. Hasar iki yerden gelir: mal kabulde sayılan «hasarlı» adet ve
hasarlı dönen müşteri iadesi. Burada talep açılır, <strong>karşı taraf</strong>
seçilir ve sonucu izlenir.</p>
${neZaman("Mal kabulde hasarlı adet girdiğinde ya da hasarlı bir iade geldiğinde (talep aç), karşı taraf cevap verdikçe (durumu güncelle) ve para geldiğinde (tahsil edildi + tahsil günü).")}

${ekranSemasi("Tazminat", [
  { no: 1, ad: "Açık alacak", aciklama: "Açık + Bildirildi + Kabul edildi taleplerin toplamı, para birimi başına. Aramadan etkilenmez.", vurgulu: true },
  { no: 2, ad: "Arama", aciklama: "Ürün, SKU, alım/sipariş no ya da tedarikçi." },
  { no: 3, ad: "Talep bekleyen hasar", aciklama: "Hasarlı sayılmış ama talebi açılmamış kalemler; her satırda «Talep aç».", genis: true },
  { no: 4, ad: "Talepler", aciklama: "Her talep: ürün, alım ya da iade, adet, tutar, karşı taraf, durum seçici, not; tahsil edildiyse tahsil günü.", genis: true },
])}

<h3>Talep açmak</h3>
${adimlar([
  { ad: "«Talep aç»", ne: "Talep bekleyen hasar listesinde ilgili satırdaki düğme." },
  { ad: "Karşı taraf", ne: "Tazmini kim ödeyecek: tedarikçilerden biri ya da bir kargo firması. Önerilen, ürünün son alındığı tedarikçidir. Müşteri iadesinde tazmini çoğu zaman pazaryeri öder — pazaryeri Tedarikçiler listesinde kayıtlıysa onu seçin." },
  { ad: "Adet ve talep tutarı", ne: "Adet, kalan hasardan fazla olamaz. Tutar olarak adet × birim maliyet önerilir; anlaştığınız tutar farklıysa değiştirin." },
  { ad: "Hasar tarihi, durum ve not", ne: "Durum «Açık» gelir; talebi karşı tarafa ilettiyseniz hemen «Bildirildi» seçebilirsiniz." },
])}

<h3>Talebin durumları</h3>
<p>Durum, talep satırındaki seçiciden değiştirilir:
<strong>Açık → Bildirildi → Kabul edildi → Tahsil edildi</strong>, ya da
<strong>Reddedildi</strong>. Kabul edilmiş ama parası gelmemiş talep hâlâ
<strong>açık alacaktır</strong>. Talepler silinmez; reddedilen talep de “bu hasarı
istemiştik, kabul etmediler” bilgisi olarak kalır.</p>

<h3>Para geldiğinde</h3>
<ul>
<li>Durumu <strong>«Tahsil edildi»</strong> yapın. O gün tahsil günü sayılır; satırda
<strong>tahsil günü</strong> alanı açılır. Pazaryerinin «iade edildi» / ödeme
bildiriminin tarihi farklıysa oraya o günü girin (bugünden sonra ve talebin açıldığı
günden önce olamaz).</li>
<li><strong>Müşteri iadesinden doğan</strong> tahsil GERÇEK NET'e <strong>tazminat
geliri</strong> olarak eklenir ve dönem raporunda tahsil gününün ayına yazılır.</li>
<li><strong>Mal kabuldeki hasar</strong> için gelen para ise gelir sayılmaz — o adedin
maliyeti kâra hiç yansımamıştı. Alım kartla ödendiyse para alımın kartına geri döner ve
tahsil gününden itibaren kart borcundan düşer.</li>
<li>Bu özellikten önce kapatılmış ve tahsil günü bilinmeyen eski talepler satırda
“Tahsil günü girilmedi — kart borcuna yansımadı” yazar; Kart Borcu ekranı da bunları
ayrıca sayar. Tarihini girdiğinizde borçtan düşer.</li>
</ul>
${sikHata([
  {
    hata: "Tazminatı satışın kârına yazmak",
    cozum: "Tazminat ayrı bir kalemdir; satışın kârını değiştirmez. Satış zaten iade/kayıp olarak işlenir, tazminat onun üstüne gelir.",
  },
  {
    hata: "Tedarikçisi olmayan alım için talep açmaya çalışmak",
    cozum: "Alacağın kime yazılacağı belli olmadığı için talep kaydedilmez ve ekran nedenini yazar. Önce alımı düzenleyip tedarikçi seçin, sonra talebi açın.",
  },
])}
</section>

<section id="nakit">
${baslik("nakit")}
<p><strong>Sol menü → Nakit takvimi.</strong> Önümüzdeki günlerde
<em>kasadan ne çıkacak, kasaya ne girecek</em> — gün gün. Takvim <strong>ileriye</strong>
bakar ve dönem süzgeçlerinden etkilenmez; üstteki <strong>«14 gün»</strong> /
<strong>«30 gün»</strong> düğmeleriyle penceresini seçersiniz.</p>
${neZaman(
  "Büyük bir alım yapmadan önce. “Bu parayı harcarsam 10 gün sonra kart borcunu ödeyebilir miyim” sorusunun cevabı burada.",
)}
<h3>Takvime ne girer</h3>
<ul>
<li><strong>Çıkacak:</strong> kredi kartı ekstrelerinin son ödeme günleri (kartla yapılan
alım ve giderler) ve Finansman ekranındaki <strong>planlı</strong> geri ödemeler (kredi
taksidi, borç).</li>
<li><strong>Girecek:</strong> pazaryeri ödeme kayıtlarındaki (hakediş) vadesi gelen
tutarlar ve Finansman'daki planlı girişler.</li>
<li>Yalnız <strong>TL</strong> tutarlar gösterilir; kur çevrilmez. Pencere dışında kalan ya
da TL olmayan satırların sayısı altta yazar.</li>
</ul>
${ekranSemasi("Nakit takvimi", [
  { no: 1, ad: "Pencere ve kaynak bandı", aciklama: "14 gün · 30 gün. Girişlerin hangi hakediş partilerinden okunduğu ve takvimin ufku (son vadeden sonrası GÖRÜNMÜYOR, yok değil)." },
  { no: 2, ad: "Çıkacak · Girecek · Net pozisyon", aciklama: "Pencerenin toplamları ve «açık var / açık yok» hükmü.", genis: true, vurgulu: true },
  { no: 3, ad: "En dip nokta", aciklama: "Pencerede kasanın bugüne göre en aşağıda olacağı gün ve tutar." },
  { no: 4, ad: "Gün gün liste", aciklama: "Her dolu gün: çıkacak, girecek ve yürüyen bakiye; altında kaynak satırları (Kredi kartı · Hakediş (rapor) · Finansman)." },
  { no: 5, ad: "Gecikmiş ve vadesi bilinmeyen", aciklama: "Vadesi geçmiş kalemler ayrı listede; vadesi ya da tutarı bilinmeyenler toplamlara GİRMEZ." },
])}
<h3>«Açık yok» ne zaman yazar</h3>
<p>Ekran ancak üç şart birden tutarsa <strong>«Bu pencerede açık yok»</strong> der:</p>
<ol>
<li>Pencere sonundaki <strong>net pozisyon</strong> artıda,</li>
<li>arada hiçbir gün <strong>en dip nokta</strong> eksiye düşmüyor — para 20'sinde girip
borç 12'sinde ödeniyorsa 12'sinde para yoktur,</li>
<li><strong>vadesi geçmiş ama ödemesi görülmemiş</strong> hakediş tutarı yok. Böyle bir
tutar varsa ayrı kutuda yazar ve beklenen girişe <strong>dahil edilmez</strong>; kanal
ödemiş ama dosyaya düşmemiş olabilir.</li>
</ol>
<div class="ek-not"><div class="etiket">Yürüyen bakiye kasanız değildir</div>
<p>«Yürüyen» rakam bugünü sıfır kabul eder ve yalnız takvimdeki giriş-çıkışları toplar;
bankadaki paranızı bilmez. Vadesi geçmiş ama kalanı ödenmemiş <strong>çıkışlar</strong>
(ör. ödenmemiş kart ekstresi) hâlâ ödenecek para sayılır: «Çıkacak» toplamına ve yürüyen
bakiyenin başlangıcına girer. Vadesi geçmiş <strong>girişler</strong> ise ayrı kutuda
durur ve hiçbir toplama girmez.</p></div>
${sikHata([
  {
    hata: "Taksiti ödeyip Finansman'da «Gerçekleşti» dememek",
    cozum: "Planlı taksit takvimde «çıkacak» görünmeye devam eder ve pencereyi olduğundan ağır gösterir. Ödediğiniz gün Finansman'da işaretleyin.",
  },
])}
</section>

<section id="rapor">
${baslik("rapor")}
<p><strong>Sol menü → Rapor.</strong> Ekranın başlığı «Dönem raporu»dur.
«Bu ay gerçekte ne kazandım?» sorusunun cevabı burada. Ürün ve satış kârı
<strong>brüt</strong> kârdır (NET-1/NET-2); genel giderler ürün kârının içine
girmez, burada dönem seviyesinde düşülür. Ortaya çıkan rakam
<strong>GERÇEK NET</strong>'tir.</p>
${neZaman(
  "Ay sonunda ya da ay içinde «şu ana kadar ne kazandım» diye baktığınızda; bu ayı geçen ayla ya da geçen yılla karşılaştırmak istediğinizde; kârı hesaplanamayan satışları bulup düzeltmek istediğinizde.",
)}
${ekranSemasi("Rapor", [
  { no: 1, ad: "Dönem seçici", aciklama: "Bu ay · Son 3 ay · Son 6 ay · Özel aralık. Sağ üstte «Gider gir» düğmesi.", genis: true },
  { no: 2, ad: "Nakit ve hakediş özeti", aciklama: "Önümüzdeki günlerin nakit özeti ve beklenen hakediş — yetkiniz varsa görünür." },
  { no: 3, ad: "Karşılaştır", aciklama: "Önceki dönem · 3 ay öncesi · Geçen yıl aynı dönem. Seçili olana tekrar basınca kıyas kapanır." },
  { no: 4, ad: "Üst kartlar", aciklama: "Satış geliri · Σ NET-1 · Σ NET-2 · Dönem giderleri · Sipariş sayısı · İade adedi." },
  { no: 5, ad: "GERÇEK NET", aciklama: "Kalın çerçeveli kutu. Altında formülün rakamlı hâli yazar.", genis: true, vurgulu: true },
  { no: 6, ad: "Fire ve düzeltme · Tazminat geliri", aciklama: "Stok defterinden gelen kayıp/fazla ve tahsil edilmiş tazminatlar." },
  { no: 7, ad: "Gider dökümü · Referans göstergeler", aciklama: "Gider kategorisi başına tablo; satış başına ortalama gider ve brüt kâr." },
])}
<h3>Dönem seçimi</h3>
<ul>
<li><strong>Bu ay</strong> — ayın 1'inden bugüne.</li>
<li><strong>Son 3 ay / Son 6 ay</strong> — bu ay dahil, o kadar takvim ayı geriye.</li>
<li><strong>Özel aralık</strong> — düğmeye basınca Başlangıç ve Bitiş kutuları açılır;
iki tarihi girip <strong>Uygula</strong>'ya basın. Bitiş günü dahildir. Bitiş
başlangıçtan önceyse ekran hatayı yazar ve «Bu ay»ı gösterir.</li>
</ul>
<h3>Rakamlar nasıl bağlanır</h3>
<div class="formul">Satış geliri      satılan malın toplam tutarı (iptaller hariç)
Σ NET-1 / NET-2   brüt kâr, <b>iade etkileri dahil</b>
Dönem giderleri   KDV hariç, net'ten düşen kısım
Fire / hasar       gerçek kayıp, net'ten düşer
Tazminat geliri   tahsil edilen tazminat, eklenir
<b>GERÇEK NET      Σ NET-2 − dönem giderleri − fire + tazminat geliri</b>
Veri düzeltmesi   sayım fazlası/eksiği — AYRI satır, GERÇEK NET'e girmez</div>
<p>NET kartlarının altında <strong>ciroya oran</strong> yazar (NET'in satış
gelirine bölümü). İade nedeniyle ödenecek KDV eksiye düşerse ayrı bir
<strong>Devreden KDV</strong> kartı çıkar: bu tutar sonraki dönemin KDV'sinden
düşer, kâra karışmaz.</p>
<h3>Fire ve düzeltme kutusu</h3>
<p>Stok düzeltmelerinden türetilir; gider tablosuna yazılmaz. Dört kalem ayrı
sayılır: <strong>Fire / hasar / kayıp</strong>, <strong>Fazla çıkan mal</strong>,
<strong>Sayım farkı</strong>, <strong>Sayımda fazla çıkan</strong>. Yalnız
fire/hasar/kayıp GERÇEK NET'ten düşer. Sayım farkı ve fazla çıkan mal bir
<strong>veri düzeltmesidir</strong> (çoğunlukla girilmemiş alım ya da hatalı
kayıt) — işletme kârı değildir. Hangi düzeltmenin hangi kaleme düştüğünü,
düzeltmede seçilen nedenin tipi belirler (bkz.
<a href="#duzeltme">Düzeltme nedenleri</a>). Maliyeti bilinmeyen düzeltme
paraya çevrilemez ve kaç adet olduğu ayrıca yazar.</p>
<h3>Tazminat geliri</h3>
<p>Tahsil edilmiş tazminatlar (satış iadesi / kargo) GERÇEK NET'e eklenir;
«Talepleri gör» bağlantısı Tazminat ekranına gider. Mal kabulde hasarlı gelip
stoğa hiç girmemiş ürünün karta dönen parası ise <strong>alım iadesidir</strong>:
ayrı yazılır, gelir sayılmaz, GERÇEK NET'e girmez.</p>
<div class="ek-not"><div class="etiket">Önemli ayrıntı — iade hangi aya yazılır</div>
<p>Bu raporda ve panelde bir iade, <strong>iade edilen satışın ayına</strong> yazılır:
Temmuz satışının Ağustos iadesi <strong>Temmuz'u</strong> düşürür. Soru «o ay
gerçekte ne kazandım» olduğu için iade, sebebi olan satışın sorunudur —
pazaryeri de ödemeyi o siparişten keser. Bu yüzden geçmiş bir ayın rakamı, o
aya ait bir iade sonradan gelince değişebilir.</p>
<p><strong>Muhasebe dönem raporu bilerek farklıdır:</strong> KDV beyanı için iade,
yapıldığı aya yazılır (bkz. <a href="#donemler">Muhasebe dönemleri</a>). İki
ekranın aynı ay için farklı iade toplamı göstermesi bir hata değildir.</p></div>
<h3>Karşılaştırma</h3>
<p>«Karşılaştır:» satırındaki üç düğmeden birine basınca kartların altında
▲/▼ rozetler çıkar. Karşılaştırma <strong>aynı gün sayısıyla</strong> yapılır
(ayın 1–15'i, önceki ayın 1–15'iyle). Kıyas döneminde kayıt yoksa
«karşılaştırılamaz» yazar. İade kartında rozet çıkmaz: iade bir performans
ölçüsü değil, geçmişe dönük düzeltmedir. Aylık sabit giderler belirli bir güne
düştüğü için ay ortasında gider kıyası yanıltıcı olabilir; ekran bunu not olarak
yazar.</p>
<h3>Kârı hesaplanamayan satışlar</h3>
<p>Rapor bunları <strong>sessizce atlamaz</strong>: sarı bir kutuda sayısını,
nedenini (maliyet yok · para birimi farklı · kural eksik) ve ilk birkaçını
gösterir. Kayda tıklarsanız doğrudan o satışa gidersiniz; «+N kayıt daha —
hepsini gör» bağlantısı Satışlar listesini bu süzgeçle açar. Altında nasıl
düzeltileceği yazar. Gelirleri toplama katılır, kârları katılmaz — sıfır
sayılmazlar. Kargosu düşülmeden hesaplanmış satış varsa ayrıca «N satışın kârı
kargo düşülmeden hesaplandı» notu çıkar; tıklayınca o satışlar listelenir.</p>
<h3>Gider dökümü</h3>
<p>Kategori başına: tür (sabit/değişken), adet, KDV dahil tutar, içindeki KDV ve
net'ten düşen tutar. Altında sabit ve değişken gider toplamları ile
<strong>indirilebilir KDV toplamı</strong> (muhasebeci için) yazar. Dönemde hiç
gider yoksa «Gider gir» bağlantısı çıkar.</p>
<p><strong>Para birimleri ayrı raporlanır.</strong> Hem TRY hem EUR satış varsa
her biri kendi bloğunda durur; kur çevirisi yapılmaz.</p>

<h3>Panel ile ilişkisi</h3>
<p>Girişte karşınıza çıkan Panel açılışta <strong>Bugün</strong>ü gösterir, dönem
üstteki seçiciden değişir. Kanal kanal gösterir: kaç satış, ne kadar ciro, ne
kadar NET-2. Aynı pazaryerinde birden fazla hesabınız varsa <strong>tek satırda
birleşir</strong>.</p>
<div class="ek-not"><div class="etiket">NET-2 nereden geliyor</div>
<p>Panelin NET-2'si <strong>bu ekrandaki Σ NET-2 ile aynı şeydir</strong>:
satışların kârı <strong>artı iade etkileri</strong>, iade satışın ayına yazılarak.
İki ekranın aynı ay için farklı rakam vermemesi için tanım tektir.</p></div>
<p>Paneldeki grafik <strong>son 12 ayı</strong> çizer: dolu çizgi NET-2, kesikli
çizgi ciro. <strong>Satış olmayan ay grafikte atlanmaz</strong>, sıfır olarak
durur. Grafiğin altındaki tablo aynı rakamların okunabilir hâlidir; telefonda
asıl oradan bakılır.</p>
<p>Depoda duran malın değeri bu ekranda değil, <a href="#envanter">Envanter
değeri</a> ekranındadır.</p>
${sikHata([
  {
    hata: "Sayım farkını kâr ya da zarar sanmak",
    cozum: "Sayım farkı ve fazla çıkan mal «Veri düzeltmesi» satırındadır ve GERÇEK NET'e girmez. GERÇEK NET'ten yalnız fire / hasar / kayıp düşer.",
  },
  {
    hata: "Rapor ile muhasebe dönem raporunun iade toplamı farklı diye hata aramak",
    cozum: "Bu rapor iadeyi satışın ayına, muhasebe dönem raporu iadenin yapıldığı aya yazar. İkisi farklı sorulara cevap verir.",
  },
])}
</section>

<section id="envanter">
${baslik("envanter")}
<p><strong>Sol menü → Envanter değeri.</strong> Depoda duran malın
<strong>size kaça mal olduğunu</strong> gösterir — piyasa değeri değil, fiilen
ödediğiniz para. Hesap şudur: açık partilerin kalan adedi × o partinin birim
maliyeti. Satışta kullanılan FIFO sırasıyla aynı veriden okunur.</p>
${neZaman(
  "Ay sonunda «param nerede» diye baktığınızda; muhasebeciye ay başı ya da ay sonu envanteri vereceğinizde; iki tarih arasında stok değerinin ne kadar değiştiğini görmek istediğinizde. Kasada görünmeyen paranın çoğu buradadır: rafta duran mal.",
)}
${ekranSemasi("Envanter değeri", [
  { no: 1, ad: "Excel indir", aciklama: "Sağ üstte. Ekranda hangi tarih ya da dönem seçiliyse dosya da onu taşır. Telefonda yalnız indirme simgesi görünür." },
  { no: 2, ad: "Tarih seçici", aciklama: "Tek tarih (isteğe bağlı) ya da Dönem başı + Dönem sonu. Boş bırakırsanız bugünü görürsünüz.", genis: true },
  { no: 3, ad: "Arama ve sıralama", aciklama: "Ürün adı, SKU, Firma SKU ya da Barkod (EAN) ile arama; kamerayla da okutulabilir. Sıralama: Değere göre · En eski girişe göre · En yeni girişe göre." },
  { no: 4, ad: "Üç büyük rakam", aciklama: "Adet · Ödenen (KDV dahil) · Mal bedeli (KDV hariç). Para birimi başına ayrı kutu.", vurgulu: true },
  { no: 5, ad: "Ürün tablosu", aciklama: "Her ürün bir satır. Telefonda tablo yerine kart görünür.", genis: true },
  { no: 6, ad: "Değeri bilinmeyen stok", aciklama: "Maliyetsiz girilmiş partiler. Adet var, para yok; toplamlara girmez." },
])}
<h3>Üç büyük rakam ne demek</h3>
<div class="formul">Adet                     depoda duran toplam adet
Ödenen (KDV dahil)       tedarikçiye fiilen ödediğiniz tutar
Mal bedeli (KDV hariç)   malın KDV'siz değeri — muhasebenin istediği</div>
<p>KDV oranı önce ürünün kendi özel oranından, yoksa <strong>kategorisinden</strong>
okunur. İkisi de yoksa o satırda mal bedeli yerine <strong>«hesaplanamadı»</strong>
yazar ve o satır mal bedeli toplamına <strong>girmez</strong> — sistem %20
varsayıp size uydurma bir rakam vermez. Sarı kutu kaç üründe böyle olduğunu
söyler; <strong>«Kategorileri aç»</strong> düğmesi sizi KDV Kategorileri
ekranına götürür.</p>
<h3>Tablodaki sütunlar</h3>
<ul>
<li><strong>Ürün</strong> ve <strong>SKU</strong> — SKU'nun yanındaki simgeyle tek tıkta kopyalanır.</li>
<li><strong>Envantere giriş</strong> — o üründe hâlâ açık olan <strong>en eski</strong>
partinin tarihi. Yani «bu para ne zamandır depoda». Tarihi bilinmiyorsa «—» yazar.</li>
<li><strong>Adet</strong> · <strong>Ortalama birim</strong> (ödenen ÷ adet) · <strong>KDV</strong> oranı.</li>
<li><strong>Ödenen (KDV dahil)</strong> ve <strong>Mal bedeli (KDV hariç)</strong> — satırın toplamı.</li>
</ul>
<h3>Geçmiş bir tarihin envanteri</h3>
${adimlar([
  { ad: "Tek tarih seçin", ne: "«Tarih (isteğe bağlı)» kutusuna bir gün girin. Ekran o günün BAŞINDAKİ hâli gösterir — yani bir önceki günün akşamı. 1 Temmuz seçerseniz 30 Haziran akşamının envanterini görürsünüz." },
  { ad: "Ya da bir dönem seçin", ne: "«Dönem başı» ve «Dönem sonu»nun İKİSİNİ de doldurun. Açılış, dönem başı sabahıdır; kapanış, dönem sonu gecesidir — son günün hareketleri dahildir." },
  { ad: "Bugüne dönün", ne: "Bir tarih seçiliyken «Bugüne dön» düğmesi çıkar; seçimi temizler." },
  { ad: "İndirin", ne: "«Excel indir» seçili tarihi/dönemi taşır. Muhasebeciye «1 Haziran envanteri» diye bugünün dosyası gitmez." },
])}
<p>Dönem görünümünde üç rakam çıkar: <strong>Açılış · Kapanış · Fark</strong>
(her biri hem mal bedeli hem ödenen olarak). Altındaki tabloda her ürünün açılış
adedi, kapanış adedi, adet farkı ve <strong>fark değeri (mal bedeli)</strong>
yazar. Sıra sabittir: dönemde en çok para hareketi olan ürün üstte; hiç
değişmeyen ürünler listenin sonundadır ve bu hata değildir.</p>
<div class="ek-not"><div class="etiket">İç tutarlılık kontrolü</div>
<p>Dönem görünümü, fotoğraf farkını dönemdeki stok hareketlerinin toplamıyla
karşılaştırır. Tutuyorsa yeşil bir cümleyle «birebir tutuyor» der; tutmuyorsa
«DEFTER AYRIŞMASI» yazar. Bu bir hüküm değil, işarettir: hangi defterin doğru
olduğu vakaya göre değişir, kendiliğinden düzeltilmez.</p></div>
<div class="ek-not dikkat"><div class="etiket">Bu bir sayım değildir</div>
<p>Ekran kayıtlardan kurulmuş bir <strong>defter fotoğrafıdır</strong>: rafta ne
olduğunu değil, deftere ne yazıldığını gösterir. Girilmemiş bir satış stoğu
olduğundan <strong>yüksek</strong> gösterir. Ekranın üstünde kesik çizgili sarı
kutular çıkıyorsa (içe aktarılan satışların stok düşmemesi ya da alış defterinin
satış defterinden daha eskiye gitmesi), rakam bu yüzden şişkin olabilir; kutu
kaç adedin etkilendiğini yazar.</p></div>
<div class="ek-not"><div class="etiket">Değeri bilinmeyen stok</div>
<p>Maliyetsiz girilmiş partiler (açılış stoğu ya da elle düzeltme) <strong>ayrı
bir kutuda</strong> durur. Adetleri gerçektir, paraları bilinmez — bu yüzden
toplamlara katılmazlar. Sıfır sayılsalardı envanteriniz olduğundan ucuz
görünürdü.</p></div>
<div class="ek-not dikkat"><div class="etiket">Arama ve sıralama tarihi sıfırlar</div>
<p>Arama kutusu ve sıralama düğmeleri yalnız tek tarih / bugün görünümünde
çalışır; dönem görünümünde sıralama düğmeleri gizlenir. Arama yaptığınızda ya da
sıralamayı değiştirdiğinizde seçili tarih düşer ve ekran bugüne döner. Geçmiş bir
tarihte arama yapmak için <strong>önce arayın, sonra tarihi seçin</strong> —
tarih seçici aramayı ve sırayı korur.</p></div>
${sikHata([
  {
    hata: "Envanter değerini satış fiyatıyla düşünmek",
    cozum: "Bu ekran MALİYET gösterir. Satarsanız eline geçecek para değil, o malı almak için çıkardığınız paradır. Kâr, satış anında hesaplanır.",
  },
  {
    hata: "Dönemin yalnız bir ucunu girip «kaydetmiyor» sanmak",
    cozum: "Dönem ancak İKİ tarih de dolunca hesaplanır; sistem eksik ucu kendiliğinden tamamlamaz. Tek uç doluyken ekranın altında «İkinci tarihi de seçin» yazar.",
  },
  {
    hata: "Ödenen ile mal bedelini karıştırmak",
    cozum: "Muhasebeciye giden rakam çoğunlukla Mal bedeli (KDV hariç)'tir. İkisi arasındaki oran sabit değildir; ürünlerin KDV oranı farklı olabilir, akıldan 1,2'ye bölünmez.",
  },
])}
</section>

<section id="donemler">
${baslik("donemler")}
<p><strong>Sol menü → Muhasebe dönemleri.</strong> Son 14 ayı, en yeni ay üstte
olacak şekilde listeler. Her satırda ayın adı, durumu (<strong>Açık</strong> /
<strong>Kapalı</strong>), kapalıysa kimin ne zaman kapattığı ve kapanış notu
yazar. Biten bir ayı <strong>Kapat</strong> ile kapatırsınız. Bu ekran ayar
yetkisi ister.</p>
${neZaman("Bir ayın beyanı verildiğinde — o ayı kapatırsınız ki geriye dönük bir kayıt fark edilmeden rakamı değiştirmesin. Ayrıca İş Ortakları'nda bir ayı kesinleştirmeden önce.")}
${ekranSemasi("Muhasebe dönemleri", [
  { no: 1, ad: "Uyarı kutusu", aciklama: "Kapatmanın yasak değil uyarı koyduğunu hatırlatır.", genis: true },
  { no: 2, ad: "Ay satırı", aciklama: "Ay adı · kapatan kişi ve tarih · kapanış notu. Sağda Açık/Kapalı rozeti.", vurgulu: true },
  { no: 3, ad: "Raporu aç", aciklama: "O ayın muhasebe dönem raporu. Açık ayın raporu da açılır." },
  { no: 4, ad: "Kapat / Yeniden aç", aciklama: "Onay penceresi açar; kapatırken isteğe bağlı kapanış notu yazılır." },
])}
<h3>Bir ayı kapatmak</h3>
${adimlar([
  { ad: "Ayı bulun", ne: "Listede kapatacağınız ayın satırını bulun. Bugünkü ay dahil, bitmemiş bir ay kapatılamaz; denerseniz ekran nedenini yazar." },
  { ad: "«Kapat»a basın", ne: "Onay penceresi «… kapatılsın mı?» diye sorar ve ne olacağını yazar." },
  { ad: "Not yazın", ne: "İsteğe bağlı «Kapanış notu» — örn. «Beyan verildi, muhasebeci onayladı». Üç ay sonra neden kapattığınızın cevabıdır." },
  { ad: "«Evet, uygula»", ne: "Rozet Kapalı olur; satırda kapatan kişi ve tarih görünür. Kapanış kayda geçer." },
])}
<div class="ek-not"><div class="etiket">Kapatmak yasak koymaz, uyarı koyar</div>
<p>Kapalı döneme yazılmak istenen her kayıt (satış, sipariş onayı, mal kabul,
iade ve iadesini geri alma, stok düzeltmesi) <strong>durur</strong> ve
«Kapalı döneme yazıyorsunuz» der; o dönemde kaç satış hesaplandığını da yazar.
Bir sebep seçip (geç girilen kayıt · muhasebeci onayladı · dönem sehven
kapatılmıştı · diğer — açıklama zorunlu) «Uyarıyı okudum, yine de yaz» kutusunu
işaretlerseniz kayıt geçer ve uyarıya rağmen yazıldığı kayda geçer.</p></div>
<div class="ek-not"><div class="etiket">Yeniden açmak</div>
<p>Kapalı bir ayın satırında <strong>Yeniden aç</strong> düğmesi durur. O da onay
ister: dönemin koruması kalkar ve kayıtlar uyarısız yazılır. Kapanış kaydı
silinmez, izi kalır.</p></div>
<h3>Dönem raporu (muhasebeci için)</h3>
<p>Her satırdaki <strong>Raporu aç</strong> o ayın raporunu açar. Bölümler:
<strong>Gelir</strong> (ciro, iade tutarı) · <strong>Kesintiler</strong>
(komisyon, komisyon KDV'si, kargo, stopaj, ödenecek KDV ve diğerleri, kalem
kalem) · <strong>Kâr</strong> (NET-1, NET-2, gerekirse devreden KDV) ·
<strong>Envanter</strong> (ay sonundaki mal bedeli, KDV hariç) ·
<strong>Şerhler</strong> (kârı hesaplanamayan satış sayısı, uyarıya rağmen bu
döneme yazılmış kayıt sayısı). Açık bir ayın raporunun üstünde «Bu dönem HENÜZ
KAPANMADI» yazar. Rapor tarayıcının yazdır komutuyla PDF olarak kaydedilir;
yazdırırken üstteki gezinme bağlantısı çıkmaz.</p>
<p>Dönem raporunda iade, KDV beyanı için <strong>yapıldığı aya</strong> yazılır —
yönetim raporundan bilerek farklıdır (bkz. <a href="#rapor">Dönem raporu</a>).</p>
<div class="ek-not dikkat"><div class="etiket">İş Ortakları bu ekrana bağlıdır</div>
<p>İş Ortakları'nda bir projenin bir ayını <strong>kesinleştirmek</strong> için
önce o muhasebe ayının burada <strong>kapalı</strong> olması gerekir. Kapalı
değilse kesinleştirme yapılmaz ve «Kesinleştirmek için önce bu muhasebe ayı
kapatılmalı» yazar. Sebebi: kesinleşen ayın kaynağı (satışlar, giderler) artık
değişmemelidir. Sıra şudur: önce ayı burada kapatın, sonra
<a href="#ortaklik">İş Ortakları</a> ekranında kesinleştirin.</p></div>
${sikHata([
  {
    hata: "Bugünkü ayı kapatmaya çalışmak",
    cozum: "Bitmemiş ay kapatılamaz. Kapanış, ay bittikten ve beyan verildikten sonra verilen bir karardır.",
  },
  {
    hata: "Kapalı döneme gelen uyarıyı hata sanmak",
    cozum: "Uyarı bir koruma; kayıt gerçekten o aya aitse sebebini seçip onay kutusunu işaretleyin, kayıt geçer. Beyanı etkileyebileceği için muhasebecinize haber verin.",
  },
])}
</section>

<section id="maliyetYontemi">
${baslik("maliyetYontemi")}
<p><strong>Sol menü → Maliyet yöntemi.</strong> Stok maliyetinin nasıl
hesaplandığını ve satışta partiyi kimin seçtiğini belirler. Bu ekran ayar
yetkisi ister. Ekranın üstündeki «Muhasebe dönemleri →» bağlantısı dönem
ekranına götürür.</p>
${neZaman("İlk kurulumda bir kez; ya da satış formunda parti seçicinin çıkıp çıkmayacağını değiştirmek istediğinizde.")}
${ekranSemasi("Maliyet yöntemi", [
  { no: 1, ad: "Maliyet yöntemi", aciklama: "FIFO — parti bazlı, en eskiden tüketir. Hareketli ortalama listede görünür ama henüz seçilemez.", vurgulu: true },
  { no: 2, ad: "Partiyi kim seçer", aciklama: "Üç seçenek; altında seçilenin ne yaptığı yazar." },
  { no: 3, ad: "Değişiklikleri Kaydet", aciklama: "Bir şey değişmeden kilitli kalır ve nedenini yazar.", genis: true },
])}
<h3>Yöntem</h3>
<p><strong>FIFO:</strong> her mal kabul kendi partisini kurar; satış en eski
partiden düşer ve hangi partiden gittiği kayıtta kalır. Hareketli ortalama
seçeneği <strong>henüz açık değil</strong> — ekranda bu yazılıdır.</p>
<h3>Partiyi kim seçer</h3>
<ul>
<li><em>Sistem seçsin — seçici gizli:</em> satış formunda parti seçici çıkmaz; sistem
hep en eski partiyi tüketir.</li>
<li><em>İstersem ben seçeyim</em> (varsayılan): seçici yalnız partilerin maliyeti
farklıysa çıkar ve varsayılanı en eskisidir. Dokunmazsanız FIFO gibi davranır.</li>
<li><em>Her satışta ben seçeyim:</em> birden çok partisi olan üründe parti seçimi
zorunludur; seçilmeden satış kaydedilmez ve form nedenini yazar. Tek partili
üründe sorulmaz.</li>
</ul>
<p>Parti seçim ayarını değiştirmek maliyet hesabını değiştirmez, yalnız satış
formunun nasıl davrandığını değiştirir; bu yüzden ek onay istemez.</p>
<div class="ek-not dikkat"><div class="etiket">Yöntem değişikliği sebep ve onay ister</div>
<p>Yöntem değişikliği (açıldığında) <strong>ileriye dönüktür</strong>: geçmiş
satışların maliyeti ve kapanmış dönemlerin NET rakamları değişmez. Defterde
hareket varsa ekran uyarır — ay içinde zaten hareket varsa aynı ayın yarısı
bir kuralla, yarısı başka kuralla yazılmış olur; bu yüzden değişikliği dönem
kapandıktan sonra yapmanız önerilir. Kaydetmek için bir sebep seçmeniz ve
«Uyarıyı okudum, yöntemi yine de değiştir» kutusunu işaretlemeniz gerekir.</p></div>
${sikHata([
  {
    hata: "«Her satışta ben seçeyim»i seçip satış formunun neden kaydetmediğini sormak",
    cozum: "Bu kipte birden çok partisi olan ürünün partisini seçmek zorunludur. Form, partisi seçilmemiş kalemi yazar; seçince kayıt geçer.",
  },
])}
</section>

<section id="depo">
${baslik("depo")}
<p><strong>Sol menü → Depo kurulumu.</strong> Deponuzun düzenini bir kez tarif
edersiniz, sistem <strong>raf kodlarını üretir</strong>. Her firmanın deposu
farklıdır &mdash; bu yüzden şablon sisteme gömülü değil, siz çiziyorsunuz.
Onaylamadan hiçbir raf açılmaz. Bu ekran ayar yetkisi ister.</p>
${neZaman(
  "Depoyu ilk kurarken, ve sonradan bir bölüme ünite ya da kat eklediğinizde. Yılda birkaç kez açılır.",
)}
${ekranSemasi("Depo kurulumu", [
  { no: 1, ad: "Bugünkü durum", aciklama: "Tanımlı raf · Şablona uyan · Şablona uymayan · Bölüme bağlı · Bölümsüz. Altında yeri bilinmeyen ürün sayısı.", genis: true },
  { no: 2, ad: "Bölüm tarifi", aciklama: "Bölüm adı · Kısaltma · Ünite sayısı · Ünite başına göz sayısı.", vurgulu: true },
  { no: 3, ad: "Önce göster", aciklama: "Kaç kod üretileceğini, kaçının yeni, kaçının zaten var olduğunu gösterir." },
  { no: 4, ad: "N rafı aç", aciklama: "Önizleme doğruysa rafları açar." },
])}
<h3>Dört şey soruyor</h3>
<p><strong>Bölüm adı</strong> &mdash; serbest: «Salon», «Depo-2». Ekranlarda bu
görünür.</p>
<p><strong>Kısaltma (koda girer)</strong> &mdash; raf kodunun içine giren kısa
hâli: <code>SLN</code>. Yalnız büyük harf ve rakam, en fazla 6 karakter; boşluk ve
Türkçe karakter <strong>olmaz</strong>, çünkü barkod onları taşıyamaz.</p>
<p><strong>Bölümdeki ünite sayısı</strong> &mdash; yan yana duran ayrı raf
iskeleti sayısı. <strong>Ünite başına göz sayısı</strong> &mdash; bir ünitenin üst
üste kaç katı olduğu. İkisi de 1 ile 99 arasında; tek seferde en fazla 2000 raf
üretilir.</p>
<p>Bunlardan şunu üretir: <code>RAF-SLN1-1</code>, <code>RAF-SLN1-2</code>,
<code>RAF-SLN2-1</code> &hellip; (bölüm kısaltması + ünite numarası − göz
numarası).</p>
${adimlar([
  { ad: "Formu doldurun", ne: "Bölüm adı, kısaltma, ünite ve göz sayısı. Rakam kutularındaki gri «örn.» yazıları değer değildir; kendiniz yazın." },
  { ad: "«Önce göster»", ne: "Ekran «Ne açılacak» kutusunda toplam kod, yeni açılacak ve zaten var sayılarını, üretilecek kodların örneğini gösterir." },
  { ad: "«N rafı aç»", ne: "Rakamlar doğruysa basın. Sonuçta kaç rafın açıldığı ve kaçının zaten olduğu için atlandığı yazar." },
  { ad: "Etiketleri basın", ne: "Raf Konumları ekranındaki «QR Etiketleri» ile etiketleri yazdırıp raflara yapıştırın." },
])}
<div class="ek-not dikkat"><div class="etiket">Kısaltma sonradan değişmez</div>
<p>Kısaltma <strong>basılı etiketin içinde</strong>. Değiştirilseydi raflardaki
bütün etiketler yalan söylemeye başlardı. Aynı kısaltmayla ikinci kez raf
açarsanız (örneğin üniteye kat eklediniz) raflar <strong>aynı bölüme</strong>
eklenir; bölümün adı bu ekrandan değişmez. Tek tek rafların adı Raf Konumları
ekranında düzenlenebilir.</p></div>
<h3>Göz numarası neden yerden yukarı</h3>
<p><strong>1 = en alt kat.</strong> Üste kat eklerseniz mevcut etiketlerin
<strong>hiçbiri değişmez</strong>. Üstten saysaydık bir kat eklediğinizde bütün
numaralar kayar ve yapıştırdığınız etiketleri sökmeniz gerekirdi.</p>
<h3>Onaysız hiçbir raf açılmaz, var olan ezilmez</h3>
<p>Önizlemede <strong>zaten var</strong> görünen kodların <strong>üstüne
yazılmaz</strong> &mdash; onların üstünde ürün olabilir ve etiketleri basılmış
olabilir. Yalnız eksikler açılır. Düzenin tamamı zaten varsa «Açılacak yeni raf
yok» yazar.</p>
<h3>Eski raflar ve raf göçü</h3>
<p>Depo kurulumundan önce elle açılmış raflar (örn. <code>A5</code>) «şablona
uymayan» ve «bölümsüz» diye sayılır. Bu bir hata değildir; o raflar çalışmaya
devam eder. İsterseniz ekrandaki <strong>«N eski rafı yeni şablona taşı»</strong>
bağlantısıyla <strong>Raf göçü</strong> ekranına geçersiniz:</p>
${adimlar([
  { ad: "Hedef seçin", ne: "Her eski rafın karşısına gideceği yeni rafı seçin. Boş bıraktığınız raf dokunulmadan kalır. Sistem hangi rafın nereye denk geldiğini tahmin etmez." },
  { ad: "«Önce göster»", ne: "Kaç raf ve kaç ürünün taşınacağı, kaçının dokunulmayacağı yazar." },
  { ad: "«N ürünü taşı»", ne: "Ürünlerin rafı yeni rafa geçer. Boşalan eski raflar silinmez, pasife alınır." },
])}
<p>İki eski rafı aynı yeni rafa hedef seçemezsiniz; ekran reddeder (iki fiziksel
rafı tek rafa çökertmek ürünleri karıştırır). Gerçekten istiyorsanız iki turda
yapın ya da Raf Konumları ekranındaki «Rafları birleştir»i kullanın.</p>
<h3>Sonra ne olur</h3>
<p><a href="#raf">Raf Konumları</a> ekranından etiketleri yazdırır, raflara
yapıştırırsınız. <a href="#yerlestirme">Yerleştir</a> ile ürünleri raflara
koyarsınız; <a href="#okuma">Barkod okut</a> ile bir rafı okutunca o rafa
kayıtlı ürünleri görürsünüz. Ekrandaki «yeri bilinmeyen ürün» sayısı
yerleştirdikçe azalır.</p>
${sikHata([
  {
    hata: "Kısaltmaya Türkçe karakter yazmak",
    cozum: "Barkod Ç, Ğ, İ, Ö, Ş, Ü taşıyamaz. Kısaltmayı SLN, DEPO2 gibi yazın; ekran kuralsız kısaltmayı kabul etmez ve nedenini yazar.",
  },
  {
    hata: "Düzen değişince kısaltmayı değiştirmeye çalışmak",
    cozum: "Değişmez. Yeni bir kısaltmayla yeni bölüm açın, ürünleri Raf Konumları → «Rafları birleştir» ya da Yerleştir ile taşıyın; boşalan rafı pasife alın.",
  },
  {
    hata: "«Zaten var» satırını hata sanmak",
    cozum: "Hata değil, koruma. Var olan raflar korunuyor; yalnız eksikler açılıyor.",
  },
])}
</section>

<section id="raf">
${baslik("raf")}
<p><strong>Sol menü → Raf Konumları.</strong> Deponun içindeki yerlerin
listesi. Her rafın bir <strong>kodu</strong> (kısa, okunaklı), isteğe bağlı bir
<strong>adı</strong> ve açıklaması vardır. Ürün formundaki ve mal kabuldeki raf
seçimi bu listeden beslenir. Bu ekran ayar yetkisi ister.</p>
${neZaman(
  "Depoyu ilk kurarken; yeni bir raf ya da kutu eklediğinizde; raf etiketi basacağınızda; ve yanlışlıkla iki kez açılmış iki rafı birleştirmek istediğinizde.",
)}
${ekranSemasi("Raf Konumları", [
  { no: 1, ad: "Rafları birleştir · QR Etiketleri", aciklama: "Sağ üstteki iki düğme." },
  { no: 2, ad: "Yeni raf", aciklama: "Raf kodu + göz · ad · açıklama. «Raf Ekle» ile kaydedilir." },
  { no: 3, ad: "Tanımlı raflar (N)", aciklama: "Arama kutusu; her satırda kod (kopyalanır), ad, kaç ürünün o rafa bağlı olduğu, Aktif/Pasif rozeti, Düzenle ve Pasife al.", genis: true, vurgulu: true },
])}
<h3>Yeni raf eklemek</h3>
${adimlar([
  { ad: "Raf kodunu yazın ya da okutun", ne: "Kod bölge harfi + numaradır: A5 · A27 · R1 · DEPO. Raf etiketi zaten varsa kamera simgesiyle okutabilirsiniz." },
  { ad: "Gerekiyorsa göz seçin", ne: "Gözü yandaki listeden seçin (1–9). Tire yazmayın; sistem A5 ve 3'ü «A5-3» olarak birleştirir. Altında «Kaydedilecek kod» yazar." },
  { ad: "Ad ve açıklama", ne: "İsteğe bağlı. Uzun tarif ADA yazılır, koda değil: «Salon dolabı üst raf»." },
  { ad: "«Raf Ekle»", ne: "Kod biçime uymuyorsa ekran yazarken söyler; düzeltilebiliyorsa «Şunu mu demek istediniz?» diye önerir ama kendiliğinden değiştirmez." },
])}
<p>Depo kurulumu ekranından üretilen <code>RAF-SLN1-2</code> biçimli kodlar da
geçerlidir. Kodları depo düzenine göre topluca üretmek için
<a href="#depo">Depo kurulumu</a>nu kullanın.</p>
<h3>Etiket yazdırmak</h3>
<p><strong>«QR Etiketleri»</strong> bütün <strong>aktif</strong> rafların
etiketini koda göre sıralı açar. Her etikette aynı kod üç biçimde durur: el
terminali için çizgili barkod, telefon kamerası için QR ve göz için okunur yazı.
Etiket ölçüsü 50×30 mm (termal rulo). <strong>«Yazdır»</strong>a basıp
yazıcınızı seçin.</p>
<h3>Düzenlemek ve pasife almak</h3>
<p><strong>Düzenle</strong> rafın kodunu, gözünü, adını ve açıklamasını
değiştirir; ekranda o rafa kaç ürünün ve kaç stok hareketinin bağlı olduğu
yazar. Kodu değiştirirseniz basılı etiket artık yanlış koddur ve yeniden
basılmalıdır &mdash; ekran bunu uyarır.</p>
<p>Raflar <strong>silinmez, pasife alınır</strong> &mdash; ürünler ve stok
hareketleri bu raflara bağlı olabilir. Pasif raf seçim listelerinde çıkmaz ama
geçmiş kayıtlarda görünmeye devam eder; aynı satırdan yeniden aktifleştirilir.</p>
<h3>İki rafı birleştirmek</h3>
${adimlar([
  { ad: "«Rafları birleştir»", ne: "Sağ üstteki düğme. En az iki aktif raf gerekir." },
  { ad: "Kaynak ve hedef seçin", ne: "Kaynak raf boşalacak olan, hedef raf kalacak olandır. İkisi aynı olamaz; hedef aktif olmalı." },
  { ad: "«Önizle»", ne: "Kaç ürünün raf atamasının taşınacağını ve kaç geçmiş hareketin olduğu gibi kalacağını yazar." },
  { ad: "«Onayla ve birleştir»", ne: "Ürünlerin BUGÜNKÜ rafı hedefe geçer, kaynak raf pasife alınır. Geçmiş kayıtlar değişmez: «3 Ağustos'ta A2'den çıktı» kaydı A2'yi göstermeye devam eder." },
])}
<h3>Neden ayrı bir ekran</h3>
<p>Raf, ürünün <strong>özelliği değil konumu</strong>dur. Aynı raf onlarca ürün
taşıyabilir. Ayrı tutulduğu için raf adını değiştirmek hiçbir ürünü bozmaz.</p>
<div class="ek-not"><div class="etiket">«Biçim dışı» rozeti</div>
<p>Kodu standarda uymayan raflar satırda «biçim dışı» rozetiyle ve üstte sarı
bir kutuyla sayılır. Bunlar çalışmaya devam eder; standarda çekmek isterseniz
Düzenle ile kodu değiştirin ve etiketi yeniden basın.</p></div>
${sikHata([
  {
    hata: "Raf kodunu uzun ve karmaşık yapmak",
    cozum: "Kod okunacak ve yazılacak. «A5» iyi, «DEPO-SOL-DUVAR-UST-RAF-3» kötü — üstelik biçime uymaz. Uzun açıklama ADA yazılır, koda değil.",
  },
  {
    hata: "Pasif bir rafın koduyla yeni raf açmaya çalışmak",
    cozum: "Ekran «kod PASİF bir rafta kayıtlı» der. Yeni raf açmak yerine o rafı listede bulup yeniden aktifleştirin.",
  },
])}
</section>

<section id="kategori">
${baslik("kategori")}
<p><strong>Sol menü → KDV Kategorileri.</strong> Her ürün bir kategoriye
bağlanır ve <strong>KDV oranı o kategoriden okunur</strong> &mdash; ürün ürün
elle girilmez. Kategorinin kısa kodu ayrıca ürünün önerilen SKU'sunun ilk
parçasıdır. Bu ekran ayar yetkisi ister.</p>
${neZaman(
  "İlk kurulumda; yeni bir ürün grubu almaya başladığınızda (oyuncak, elektronik, gıda); mevzuat bir oranı değiştirdiğinde; ve Envanter değeri ekranı «KDV oranı çözülemedi» dediğinde.",
)}
${ekranSemasi("KDV Kategorileri", [
  { no: 1, ad: "Trendyol kategori eşleşmesi", aciklama: "Pazaryeri kategorilerinin bizdeki karşılığı. «Eşleşmeyi aç» ayrı bir ekrana götürür." },
  { no: 2, ad: "Yeni kategori", aciklama: "Hazır listeden seç · Ad · KDV oranı (%) · Kod. «Kategori Ekle» ile kaydedilir.", vurgulu: true },
  { no: 3, ad: "Tanımlı kategoriler (N)", aciklama: "Her satırda ad, kod (yoksa «kod yok»), oran, kaç ürün bağlı, Düzenle ve Pasife al.", genis: true },
])}
<h3>Yeni kategori eklemek</h3>
${adimlar([
  { ad: "İsterseniz hazır listeden seçin", ne: "«Hazır listeden seç» formu doldurur, kayıt açmaz. Oranlar tipik başlangıç değeridir, vergi tavsiyesi değildir; kendi ürününüzün oranını doğrulayın." },
  { ad: "Ad ve KDV oranı", ne: "Oran 0 ile 100 arasında bir sayı: örn. 20, 10, 1." },
  { ad: "Kod", ne: "2–4 harf, örn. OYU. Kod önerilen SKU'nun ilk parçasıdır; kodu olmayan kategorideki ürün için sistem SKU öneremez." },
  { ad: "«Kategori Ekle»", ne: "Aynı ad ya da aynı kod başka kategoride varsa ekran reddeder ve hangisi olduğunu yazar." },
])}
<h3>Oran nereden çözülür &mdash; sıra kesindir</h3>
<div class="formul"><b>ürünün özel oranı</b>  &rarr;  <b>kategori oranı</b>  &rarr;  varsayılan %20</div>
<p>Ürünün kendi formunda özel KDV oranı girilmişse o kazanır; yoksa kategorinin
oranı; o da yoksa satış ve kâr hesabında %20 kullanılır. Çözülen oran
<strong>satış anında satışa yazılır</strong>: oran sonradan değişse eski
satışların hesabı değişmez. Bu yüzden kategori oranını değiştirmek geçmiş
satışları etkilemez.</p>
<p><strong>Envanter değeri ekranı %20 varsaymaz:</strong> ne özel oranı ne
kategorisi olan üründe mal bedeli «hesaplanamadı» yazar ve toplama girmez.</p>
<h3>Pazaryeri kategori eşleşmesi</h3>
<p>Ürünün kategorisi pazaryerindeki kendi kategorisinden de gelebilir. Eşleşme
ekranında her pazaryeri kategorisinin bizdeki karşılığını bir kez seçersiniz; o
kategorideki ürünler buna göre güncellenir. Karşılığı seçilmemiş kategoriler
listenin en üstünde durur ve onlara sistem tahminle kategori yazmaz. Elle
kategori seçtiğiniz ürüne dokunulmaz; KDV oranını değiştirecek bir eşleşme o
ürüne yazılmaz, ürün «KDV bekliyor» olarak sayılır.</p>
<div class="ek-not"><div class="etiket">Silinmez, pasife alınır</div>
<p>Kategoriler silinmez &mdash; ürünler ve geçmiş satışlar onlara bağlı olabilir.
Pasif kategori ürün formunda çıkmaz ama mevcut ürünlerde görünmeye devam eder.
Kodu girilmemiş kategori varsa ekranın üstünde sarı kutu kaç tane olduğunu
yazar.</p></div>
${sikHata([
  {
    hata: "Ürünü kategorisiz bırakmak",
    cozum: "Kategorisi olmayan ürünün satışı varsayılan %20 ile hesaplanır. %1 ya da %10 grubundaysa KDV yanlış çıkar ve fark aylar sonra ödenecek KDV rakamında görünür. Envanterde de o ürünün mal bedeli hesaplanamaz.",
  },
])}
</section>

<section id="duzeltme">
${baslik("duzeltme")}
<p><strong>Sol menü → Düzeltme nedenleri.</strong> Ekranın başlığı «Stok
düzeltme nedenleri»dir. Stok ekranında bir düzeltme girildiğinde seçilen
<strong>neden</strong> listesini yönetir: kırılma, kayıp, fire, sayım farkı,
nakliye hasarı gibi. Bu ekran ayar yetkisi ister.</p>
${neZaman("İlk kurulumda; yeni bir düzeltme sebebi ortaya çıktığında; ve stok düzeltme ekranında aradığınız nedeni bulamadığınızda.")}
${ekranSemasi("Düzeltme nedenleri", [
  { no: 1, ad: "Yeni neden", aciklama: "Neden adı · Hareket tipi · Hangi yönde seçilebilir · Açıklama zorunlu olsun mu. «Nedeni ekle» ile kaydedilir.", vurgulu: true },
  { no: 2, ad: "Tanımlı nedenler (N)", aciklama: "Her satırda ad, tip, «açıklama zorunlu» rozeti, kaç stok hareketinin bağlı olduğu, Düzenle ve Pasife al.", genis: true },
])}
<h3>Dört alan</h3>
<ul>
<li><strong>Neden adı</strong> — örn. «Nakliye hasarı». Aynı ad iki kez olamaz.</li>
<li><strong>Hareket tipi</strong> — en önemli seçim:
<ul>
<li><em>Fire / kayıp</em>: gerçek kayıp — mal kırıldı, kayboldu, bozuldu. Dönem
raporunda «Fire / hasar / kayıp» satırına düşer ve <strong>GERÇEK NET'ten
düşer</strong>.</li>
<li><em>Sayım farkı</em>: ölçüm hatası — mal kaybolmadı, sayı tutmadı. Raporda
<strong>ayrı</strong> satırda görünür ve GERÇEK NET'e girmez.</li>
</ul></li>
<li><strong>Hangi yönde seçilebilir</strong> — Yalnız stoktan düşerken · Yalnız
stoğa eklerken · Her iki yönde. Fire ve hasar yalnız düşerken, bulunan mal yalnız
eklerken anlamlıdır. Emin değilseniz «Her iki yönde» bırakın.</li>
<li><strong>Bu nedende açıklama zorunlu olsun</strong> — «Diğer» gibi nedenlerde
işaretleyin; o nedeni seçen kişi açıklama yazmadan kaydedemez.</li>
</ul>
<h3>Neden sebep zorunlu</h3>
<p>Sebepsiz bir düzeltme, üç ay sonra <em>burada ne olmuştu</em> sorusuna
cevap bırakmaz. Kapalı bir listeden seçtirmek ayrıca
<strong>sayılabilir</strong> hâle getirir: hangi sebepten yılda kaç adet
kaybettiğiniz ancak liste tutarlıysa ölçülebilir.</p>
<div class="ek-not dikkat"><div class="etiket">Kullanılmış nedenin tipi değişmez</div>
<p>Bir nedene bağlı stok hareketi varsa, Düzenle'de hareket tipi kilitlenir ve
kaç hareketin bağlı olduğu yazar. Değiştirilebilseydi geçmiş raporlar oynardı:
dünkü fire bugün sayım farkı olurdu. Ad ve yön değiştirilebilir. Yanlış tipte
açılmış bir neden için doğru tipte yeni bir neden açıp eskisini pasife alın.</p></div>
<div class="ek-not"><div class="etiket">Silinmez, pasife alınır</div>
<p>Neden silinmez &mdash; geçmiş hareketler nedensiz kalmasın. Pasif neden yeni
kayıtta seçilemez, geçmiş hareketlerde görünmeye devam eder. Hiç aktif neden
kalmazsa ekran uyarır: stok düzeltmesi yapılamaz.</p></div>
${sikHata([
  {
    hata: "Sayımda eksik çıkan malı «Fire / kayıp» nedeniyle düzeltmek",
    cozum: "Mal gerçekten kırılmadı ya da kaybolmadıysa bu bir sayım farkıdır. Fire seçilirse fark GERÇEK NET'ten zarar olarak düşer; sayım farkı seçilirse ayrı satırda durur.",
  },
])}
</section>

<section id="tedarikci">
${baslik("tedarikci")}
<p><strong>Sol menü → Tedarikçiler.</strong> Mal aldığınız yerlerin listesi.
Alım kaydında tedarikçi seçilir; böylece bir ürünü kimden ve kaça aldığınız
sorusu geçmişe dönük cevaplanabilir. Alım numarası da tedarikçinin kodundan
üretilir (örn. <code>ALM-HE-260811-01</code>: ortadaki harfler tedarikçi kodu).
Bu ekran ayar yetkisi ister.</p>
${neZaman("İlk kurulumda ve yeni bir yerden ilk kez mal aldığınızda. Alım girebilmek için en az bir tedarikçi gerekir.")}
${ekranSemasi("Tedarikçiler", [
  { no: 1, ad: "Kodsuz tedarikçi uyarısı", aciklama: "Kodu girilmemiş tedarikçi varsa sarı kutuda sayısı yazar.", genis: true },
  { no: 2, ad: "Yeni tedarikçi", aciklama: "Ad · Kod (Öner düğmesiyle) · İletişim · Fiyatlar KDV dahil · Kargo fiyata dahil. «Tedarikçi Ekle» ile kaydedilir.", vurgulu: true },
  { no: 3, ad: "Tanımlı tedarikçiler (N)", aciklama: "Her satırda ad, kod (kopyalanır), fatura rozetleri, alım sayısı, varsa açık alacak, Düzenle ve Pasife al.", genis: true },
])}
<h3>Yeni tedarikçi eklemek</h3>
${adimlar([
  { ad: "Ad", ne: "Zorunlu. Aynı adla ikinci tedarikçi açılamaz." },
  { ad: "Kod", ne: "Zorunlu, yalnız harf, 2–4 harf (örn. HE). Adı yazdıktan sonra «Öner» düğmesi bir kod önerir; değiştirebilirsiniz. Aynı kod iki tedarikçide olamaz." },
  { ad: "İletişim", ne: "İsteğe bağlı: telefon, e-posta ya da kişi." },
  { ad: "Fatura yapısı", ne: "«Fiyatlar KDV dahil» ve «Kargo fiyata dahil» kutuları. Bu tedarikçiden alım girerken formun varsayılanı olur; her alımda yine değiştirilebilir." },
  { ad: "«Tedarikçi Ekle»", ne: "Tedarikçi listeye düşer ve alım formunda seçilebilir." },
])}
<h3>Listede ne görünür</h3>
<ul>
<li>Fatura yapısı varsayılanın dışındaysa satırda <strong>«KDV hariç fiyat»</strong>
ya da <strong>«Kargo ayrı»</strong> rozeti çıkar.</li>
<li><strong>Alım</strong> — bu tedarikçiden girilmiş alım sayısı.</li>
<li><strong>Açık alacak</strong> — bu tedarikçiden henüz tahsil edilmemiş tazminat
tutarı (varsa; sıfırsa hiç yazılmaz). Ayrıntısı <a href="#tazminat">Tazminat</a>
ekranındadır.</li>
</ul>
<h3>Ne işe yarar</h3>
<p>Aynı ürünü iki tedarikçiden farklı fiyata alıyorsanız, alım geçmişi bunu
gösterir. Ayrıca bir iade ya da garanti durumunda malın <strong>nereden
geldiği</strong> kayıtta durur, kutunun üstünde değil.</p>
<div class="ek-not"><div class="etiket">Silinmez, pasife alınır</div>
<p>Tedarikçiler silinmez &mdash; geçmiş alımlar onlara bağlıdır. Pasif tedarikçi
yeni alım formunda çıkmaz ama eski alımlarda görünmeye devam eder.</p></div>
${sikHata([
  {
    hata: "Tedarikçinin kodunu boş bırakmak",
    cozum: "Alım numarası tedarikçi kodundan üretilir; kodu olmayan tedarikçiyle yeni alım girilemez. Ekranın üstündeki sarı kutu kaç tedarikçide kod eksik olduğunu yazar — satırdaki Düzenle ile girin.",
  },
])}
</section>

<section id="marka">
${baslik("marka")}
<p><strong>Sol menü → Markalar.</strong> Her markanın <strong>3 karakterlik,
benzersiz bir kodu</strong> vardır (harf ya da rakam; örn. bir «Atlas» markası
için <code>ATL</code>). Bu kod ürünün önerilen SKU'sunun marka parçasıdır; ürün
formundaki «SKU öner» bu kodu kullanır. Bu ekran ayar yetkisi ister.</p>
${neZaman("Yeni bir markadan ilk kez ürün girdiğinizde — ürünün marka alanına yazdığınız marka ekranın «Bağlanmayı bekleyen» listesinde görünür. Ayrıca ürünlerin marka alanını topluca doldurmak istediğinizde.")}
${ekranSemasi("Markalar", [
  { no: 1, ad: "Üç sayı", aciklama: "Tabloda · Bağlanmayı bekleyen (kaç ürün) · Markası boş (ürün).", genis: true, vurgulu: true },
  { no: 2, ad: "Markası boş uyarısı", aciklama: "Marka alanı boş ürün varsa sarı kutu ve «Excel indir» düğmesi." },
  { no: 3, ad: "Yeni marka ekle", aciklama: "Marka adı · Kod (3 harf). «Markayı ekle»." },
  { no: 4, ad: "Doldurduğunuz listeyi yükleyin", aciklama: "Markası boş ürünler listesini doldurup geri yükleme." },
  { no: 5, ad: "Ara", aciklama: "Marka adı ya da kod; kaç sonuç bulunduğu yazar." },
  { no: 6, ad: "Bağlanmayı bekleyen markalar · Tablodaki markalar", aciklama: "İki liste; her satırda kaç ürün olduğu ve varsa farklı yazımları.", genis: true },
])}
<h3>Üç sayı ne demek</h3>
<ul>
<li><strong>Tabloda</strong> — kodu olan, kayıtlı marka sayısı.</li>
<li><strong>Bağlanmayı bekleyen</strong> — ürünlerin marka alanında yazan ama
tablodaki bir markaya bağlanmamış markalar (altında kaç ürün olduğu).</li>
<li><strong>Markası boş</strong> — marka alanı hiç doldurulmamış ürün sayısı.</li>
</ul>
<h3>Bekleyen bir markayı eklemek</h3>
${adimlar([
  { ad: "Listede bulun", ne: "«Bağlanmayı bekleyen markalar» kartında markanın satırına gidin. Kod kutusunda sistemin önerisi durur." },
  { ad: "Kodu kontrol edin", ne: "Öneri bir öneridir; tam 3 karakter (A–Z ya da rakam) olacak şekilde değiştirebilirsiniz. Sistem öneremediyse kodu siz yazarsınız." },
  { ad: "«Ekle» ya da «Bağla»", ne: "Marka tabloya girer ve o markadaki ürünler bağlanır. Marka tabloda zaten varsa (yalnız ürünleri bağlanmamışsa) düğme «Bağla» olur." },
])}
<p>Bekleyen çok marka varsa kartın başındaki <strong>«Önerilen kodlarla hepsini
ekle (N)»</strong> düğmesi hepsini tek seferde ekler; önce kaç markanın
ekleneceğini, kaçının bağlanacağını ve kodu bulunamayan kaçının atlanacağını
sorar. Atlananlara kodu elle girersiniz.</p>
<h3>Yeni marka eklemek</h3>
<p><strong>«Yeni marka ekle»</strong> kartında adı yazın; kodu boş bırakırsanız
sistem önerir. Aynı markanın farklı yazımı tabloda varsa yeni kayıt açılmaz ve
ekran mevcut kodu yazar.</p>
<h3>Aynı marka, farklı yazım</h3>
<p>Büyük/küçük harf ve Türkçe harf farkları yok sayılır: «ATLAS» ile «Atlas» aynı
markadır ve tek markada toplanır; satırda «Yazımlar» diye farklı yazımlar
listelenir. Ama «Atlas» ile «Atlas Bebek» gibi farklı adlar <strong>ayrı</strong>
yazılır — aynı marka mı, ayrı mı, siz karar verirsiniz.</p>
<h3>Markası boş ürünleri topluca doldurmak</h3>
${adimlar([
  { ad: "Listeyi indirin", ne: "Sarı kutudaki «Excel indir» ile «Markası boş ürünler» dosyasını indirin. İçinde Kimlik, ürün adı, SKU, Firma SKU, Barkod, kategori ve boş bir «Marka (doldurun)» sütunu vardır." },
  { ad: "Doldurun", ne: "Yalnız «Marka (doldurun)» sütununu doldurun. Kimlik sütununa dokunmayın; boş bıraktığınız satır atlanır." },
  { ad: "Yükleyin ve önizleyin", ne: "«Doldurduğunuz listeyi yükleyin» kartında dosyayı seçip «Önizle»ye basın. Kaç ürüne marka yazılacağı, kaçının tablodaki markaya bağlanacağı, kaç satırın boş ya da hatalı olduğu satır numarasıyla yazar." },
  { ad: "«Uygula»", ne: "Onay sorar; onay verince yazılır. Bu arada markası dolmuş bir ürünün markası ezilmez, atlanır." },
])}
<p>Toplu yükleme kartını yalnız ürün düzenleme yetkisi olan kullanıcı görür.</p>
<div class="ek-not dikkat"><div class="etiket">İki markaya aynı kod verilemez</div>
<p>Kod tabloda durur; kullanımdaki bir kodu ikinci bir markaya vermeye
çalışırsanız ekran reddeder ve nedenini yazar. Tablodaki bir markanın kodunu
sonradan bu ekrandan değiştirebilirsiniz; bu, <strong>mevcut ürünlerin
SKU'larını değiştirmez</strong>, yalnız bundan sonra önerilen SKU'lar yeni kodu
kullanır.</p></div>
${sikHata([
  {
    hata: "Marka alanını boş bırakmak",
    cozum: "Markası boş ürüne marka kodu verilemez, önerilen SKU'sunun marka parçası da olamaz. Ekrandaki «markası boş» listesini indirip doldurun ve aynı ekrandan geri yükleyin.",
  },
  {
    hata: "İndirilen listede Kimlik sütununu değiştirmek",
    cozum: "Sistem satırı ürüne Kimlik'ten bağlar. Kimlik değişirse o satır «Bu kimlikte ürün yok» hatasıyla atlanır.",
  },
])}
</section>

<section id="toplu">
${baslik("toplu")}
<p><strong>Sol menü → Veri Aktarımı</strong> (Veri grubunda). Ürünlerinizi,
açılış stoğunuzu ve kanal komisyon oranlarınızı tek Excel dosyasıyla topluca
yüklersiniz. Dosya <strong>önce denetlenir</strong>; tek satır bile hatalıysa hiçbir
şey yazılmaz. Bu ekranı ve dışa aktarmayı «Veri aktarımı ve yedek» izni olan açar.</p>
${neZaman("İlk kurulumda (ürünler ve elinizdeki stok); toplu ürün eklerken; kanal SKU kodlarını ya da komisyon oranlarını topluca güncellerken.")}
<h3>İçe aktarma</h3>
${adimlar([
  { ad: "Şablonu indirin", ne: "«Şablonu indir». Şablon her indirdiğinizde <strong>sizin güncel verinizle</strong> üretilir: «Listeler» sayfasında geçerli kategori, raf ve kanal hesabı adları, «Yardım» sayfasında doldurma kuralları yazar. Sayfalar: <strong>Ürünler</strong> · <strong>Açılış stoğu</strong> · <strong>Kanal SKU</strong>." },
  { ad: "Doldurun", ne: "Gri italik <strong>örnek satırları silin</strong>. Başlığında «(zorunlu)» yazan sütunlar boş bırakılamaz. Ürünler sayfasında her satır bir varyanttır: aynı ürün adı ve marka birebir aynı yazılırsa satırlar tek ürünün varyantları sayılır; grubun ilk satırı varsayılan varyant olur." },
  { ad: "Kipi seçin", ne: "<strong>Yalnız yeni ekle</strong> — sistemde olan bir SKU dosyada geçerse dosya reddedilir; ilk yüklemede bunu kullanın.<br><strong>Var olanları güncelle</strong> — olan SKU'lar dosyadaki değerlerle güncellenir, olmayanlar eklenir." },
  { ad: "«Dosyayı denetle»", ne: "Hiçbir şey yazmaz. Hata varsa «N satır reddedildi — hiçbir şey yazılmadı» başlığıyla sayfa ve satır numarasıyla listelenir. Dosyada düzeltip yeniden yükleyin." },
  { ad: "Özeti okuyun", ne: "Dosya temizse yazılacaklar sayılır: yeni ürün, yeni/güncellenecek varyant, açılış stok partisi ve toplam adet, yeni/güncellenecek kanal SKU." },
  { ad: "«Onayla ve yaz»", ne: "Onay penceresi ne yazılacağını bir kez daha söyler. Açılış stoğu stok defterine yazılır ve <strong>geri alınamaz</strong>. Bittiğinde «Ürünlere git» / «Stoğa git» bağlantıları çıkar." },
])}
<div class="ek-not"><div class="etiket">Kural</div>
<p><strong>Ya hepsi ya hiçi.</strong> 400 satırın 399'u kusursuz olsa bile, bir
satır hatalıysa hiçbir şey yazılmaz. Yarım aktarılmış bir stok, hiç aktarılmamış
stoktan daha kötüdür.</p></div>
<ul>
<li>Kategori veya raf sistemde yoksa satır reddedilir; benzer bir ad varsa «… mı demek istediniz?» diye önerilir.</li>
<li>«Listeler» sayfasına yeni bir ad yazmak o kaydı <strong>oluşturmaz</strong>. Yeni kategori ya da raf önce kendi ekranında açılır (Tanımlar grubunda), sonra şablon yeniden indirilir.</li>
<li>SKU ve Firma SKU benzersizdir; aynı kod iki satıra yazılamaz. Barkod da benzersizdir ama boş bırakılabilir.</li>
<li>Kategori boş bırakılırsa ürünün KDV oranı varsayılana düşer ve ekranda «kategori atanmamış» uyarısı görünür.</li>
<li>Açılış stoğunda <strong>aynı SKU birden çok satırda</strong> olabilir; her satır ayrı parti olur (farklı fiyata alınan mallar böyle girilir).</li>
<li>Birim maliyet yazarsanız para birimi (TRY veya EUR) de zorunludur. Maliyeti bilmiyorsanız ikisini de boş bırakın; o parti «maliyet yok» olur ve o partiden yapılan satışın kârı hesaplanamaz.</li>
<li>Tarih boşsa yükleme günü kullanılır; biçim 01.03.2026 ya da 2026-03-01.</li>
<li><strong>Kanal SKU sayfasını tek başına</strong> yükleyebilirsiniz; kanal SKU kodu boşsa sistemdeki SKU kullanılır.</li>
<li>Sistemde benzer adlı bir ürün varsa sarı bir <strong>uyarı</strong> çıkar ama yükleme durmaz: aynı ürünü ikinci kez açıyorsanız dosyayı düzeltin.</li>
</ul>
<div class="ek-not dikkat"><div class="etiket">Sayım koruması</div>
<p>Sayımı yapılmış bir ürüne açılış stoğunu sayım tarihinden <strong>önceye</strong>
yazmaya çalışırsanız denetim durur: sayan kişi o malı zaten saymış olabilir.
Gerçekten gerekiyorsa onay kutusunu işaretleyip bir sebep seçersiniz (diğer ise
açıklama zorunlu). O ürünlerin sayımı geçersizleşir ve yeniden sayılmaları gerekir.</p></div>
<h3>Dışa aktarma</h3>
<ul>
<li><strong>Ürünler, Alımlar, Satışlar, Stok, İadeler, Giderler</strong> ve
<strong>Envanter değeri</strong> ekranlarındaki <strong>«Excel indir»</strong> düğmesi
<strong>ekrandaki süzgeci uygular</strong>: ne görüyorsanız o iner.</li>
<li><strong>Sol menü → Dışa Aktarma</strong> (Veri grubunda): «Tüm veriyi indir» ürünleri,
alımları, satışları, stoğu ve giderleri tek dosyada, her biri ayrı sayfada indirir —
süzgeç uygulanmaz. Yedek dosyaları için bkz. <a href="#yedek">Yedek</a>.</li>
</ul>
${sikHata([
  {
    hata: "Örnek satırları silmeden yüklemek",
    cozum: "Sistem örnek satırları ayırt etmez; onları da gerçek veri gibi okur. Gri italik satırları silin.",
  },
  {
    hata: "Haftalık komisyon güncellemesini «Yalnız yeni ekle» kipiyle yüklemek",
    cozum: "Var olan kodlar «zaten kayıtlı» diye reddedilir. «Var olanları güncelle» kipini seçin.",
  },
  {
    hata: "Kategori adını şablondan kopyalamadan elle yazmak",
    cozum: "Tek harf farkı satırı reddettirir. «Listeler» sayfasındaki adı kopyalayın.",
  },
])}
</section>

<section id="gecmisEkstre">
${baslik("gecmisEkstre")}
<p><strong>Sol menü → Geçmiş ekstreler</strong> (Veri grubunda). Sistemi kullanmaya
başlamadan ÖNCEKİ döneme ait kredi kartı ekstrelerini Excel dosyasından yükler.
Böylece eski borçlar da kart borcu ekranında görünür. Bu ekranı «Veri aktarımı
ve yedek» izni olan açar.</p>
${neZaman(
  "Yalnız kuruluşta, bir kez. Sistem kullanılmaya başlandıktan sonraki alımlar zaten kendiliğinden doğru ekstreye düşer.",
)}
<div class="ek-not"><div class="etiket">Neden ayrı bir ekran</div>
<p>Normal alımlar ekstreye <strong>kesim gününe göre</strong> kendiliğinden
dağılır. Ama sistemden önceki borçların alım kaydı yoktur; onlar dışarıdan,
toplu olarak girilmek zorundadır. Bu ekrandan gelen ekstreler ayrı bir damgayla
durur; iki yol karışsaydı aynı borç iki kez sayılabilirdi.</p></div>
${adimlar([
  { ad: "Dosyayı seçin, «Dosyayı incele»", ne: "Kart ekstreleri sayfasını içeren .xlsx dosyası. Bu adım hiçbir şey yazmaz; kaç ekstre okunduğunu, kaç kart bulunduğunu ve kaç satırın atlandığını söyler. «… satır atlandı» yazısına tıklarsanız sebepleri görünür (yıllık toplam satırı, sıfır borç ya da gelecek ay, ay adı çözülemedi, yıl yok, borç sayı değil)." },
  { ad: "Kartları eşleştirin", ne: "Dosyadaki her kart için sistemdeki kartınızı seçin. Öneri hazır gelir ve yanında güveni yazar (örn. «Öneri güveni %90»); değiştirebilir ya da «Bu kartı atla» diyebilirsiniz. <strong>Onaylanmayan kart aktarılmaz.</strong>" },
  { ad: "«Önizlemeye geç»", ne: "Kaç ekstre yazılacağı, dönem aralığı ve toplam borç kart kart görünür. Aktarılmayacak satırlar sebebiyle ayrıca listelenir." },
  { ad: "«Onayla ve yaz»", ne: "Ekstreler yazılır ve bir parti kodu verilir. «Kart borcunda gör» ile sonucu kontrol edin." },
])}
<div class="ek-not dikkat"><div class="etiket">Hangi satırlar aktarılmaz</div>
<p>Aynı kart ve dönem için sistemde <strong>alımlardan türetilmiş</strong> bir
ekstre varsa o kazanır ve dosyadaki satır alınmaz. Aynı dönem daha önce bu
ekrandan aktarıldıysa ikinci kez yazılmaz. Atlanan kartın satırları da
aktarılmaz. Önizleme bunların hepsini sayısıyla söyler.</p></div>
<p>Sayfanın altındaki <strong>«Önceki aktarımlar»</strong> listesi daha önce
yaptığınız aktarımları parti kodu, ekstre sayısı ve dönem aralığıyla gösterir.</p>
${sikHata([
  {
    hata: "Sistemi kullanmaya başladıktan sonraki ayları da bu ekrandan yüklemek",
    cozum: "Gerek yok; o aylar alımlarınızdan kendiliğinden hesaplanır ve çakışırsa sistemin hesabı kazanır. Bu ekran yalnız eski dönem içindir.",
  },
  {
    hata: "Dosyada «kart ekstresi sayfası bulunamadı» hatası",
    cozum: "Sistem «Dönem» ve «Borç» başlıklarını arar; kart etiketleri başlık satırının üstünde olmalıdır. Sayfanın düzenini kontrol edin.",
  },
])}
</section>

<section id="komisyonKapisi">
${baslik("komisyonKapisi")}
<p><strong>Sol menü → Komisyon yükleme</strong> (Veri grubunda). Komisyon
dosyalarının <strong>tek kapısı</strong>. Her satış kanalı hesabınız için bir kart
vardır; kartta o kanalın kabul ettiği dosya türleri yazar ve dosyayı ilgili
kutunun içine yüklersiniz. Kanal seçip yanlış dosya yükleme karışıklığı böylece
biter. Bu ekranı «Kanal kodlarını yönet» izni olan açar.</p>
${neZaman(
  "Pazaryeri yeni bir komisyon dosyası yayımladığında: Trendyol Salı, Hepsiburada Çarşamba günceller. Üst çubuktaki uyarı çanında «Komisyon tarifesi yenilenmeli» satırı çıktığında da buraya gelinir.",
)}
${ekranSemasi("Komisyon yükleme", [
  { no: 1, ad: "Yüklü pencereler", aciklama: "Tek satırlık hüküm (kapsam kesintisiz mi) ve son 10 pencere: kanal · tarih aralığı · kalem sayısı · «Tarife hesaplama» · durum rozeti.", genis: true, vurgulu: true },
  { no: 2, ad: "Sarı not", aciklama: "Teklif dosyalarının nasıl okunduğu — bir kez, en üstte.", genis: true },
  { no: 3, ad: "Kanal kartları", aciklama: "Her satış hesabı için bir kart; başlığın altında «Son yükleme: tarih» ya da «Henüz yüklenmemiş».", genis: true },
  { no: 4, ad: "Kart içindeki kutular", aciklama: "Haftalık dilimli komisyon tarifesi · Haftalık komisyon oranı (ürün dökümü) · Kampanya dosyasından güncel oran." },
])}

<h3>Üç kutu vardır ve aynı şey değildirler</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Kutu</th><th>Hangi dosya</th><th>Neyi besler</th></tr></thead>
<tbody>
<tr><td><strong>Haftalık dilimli komisyon tarifesi</strong></td><td>Fiyat <strong>aralıklarına</strong> göre oran veren tablo (<em>«1.750'ye düşürürsen komisyon %7»</em>). Trendyol'da «komisyon tarifesi», Hepsiburada'da «Avantajlı Teklifler», N11'de «Ürün Komisyon Teklifleri» adıyla iner.</td><td>Hesaplama motoru, tarife hesaplama ve oran denetimi.</td></tr>
<tr><td><strong>Haftalık komisyon oranı (ürün dökümü)</strong></td><td>Pazaryeri panelinden inen ürün dökümündeki «Komisyon Oranı» sütunu — ürün başına TEK oran.</td><td><strong>Kâr hesabı</strong>: satış anında kayda işlenen oran budur.</td></tr>
<tr><td><strong>Kampanya dosyasından güncel oran</strong> (yalnız Hepsiburada ve N11)</td><td>Teklif dosyasındaki <strong>yalnız «Mevcut Komisyon»</strong> sütunu. Teklif kolonlarına dokunulmaz.</td><td>Kâr hesabı — ama yalnız dosyadaki ürünler için.</td></tr>
</tbody></table></div>
<div class="ek-not"><div class="etiket">Teklif dosyası iki kutuya da girer</div>
<p>Hepsiburada ve N11'in teklif dosyasını <strong>tarife kutusuna</strong>
yüklerseniz fiyat aralıkları ve her aralığın komisyonu okunur. Aynı dosyayı
<strong>kampanya kutusuna</strong> yüklerseniz yalnız bugünkü oran güncellenir.
Kampanya dosyası kataloğunuzun bir <strong>bölümünü</strong> kapsar; bütün ürünler
için ürün dökümü kutusunu kullanın. Teklif dosyasını ürün dökümü kutusuna
yüklerseniz <strong>reddedilir</strong> ve ekran nedenini yazar.</p></div>
<div class="ek-not"><div class="etiket">Teklif oranı KOŞULLUDUR — ama tablo bunu bilir</div>
<p>Teklifte yazan düşük oran, ancak fiyatı o aralığa <strong>indirirseniz</strong>
geçerli olur. Sistem bunu <strong>aralık</strong> olarak tutar: indirimli oranlar
yalnız kendi aralıklarında geçerlidir. Yani «komisyon %6'ya düşüyor» diye görünen
bir teklif, siz fiyatı düşürmedikçe kâr hesabınıza <strong>hiç girmez</strong>.</p></div>

<h3>Yükleme adımları</h3>
<p><strong>Tarife kutusunda:</strong></p>
${adimlar([
  { ad: "«Dosya yükle» → dosyayı seçin", ne: "Kabul edilen biçim .xlsx ve .xls. Kanal kartın içinde sabittir; seçmenize gerek yok." },
  { ad: "«Önce göster»", ne: "Hiçbir şey yazmaz. Pencere tarihleri, okunan satır, yazılacak kalem, eşleşen ürün ve <strong>bağsız ürün</strong> sayısı çıkar. Bağsız, dosyada geçen ama sizde kaydı olmayan barkod demektir; o ürünler için tarife yazılmaz, yükleme yine de yapılabilir." },
  { ad: "«Yükle»", ne: "Rakamlar beklediğiniz gibiyse. Ekran kaç kalemin yazıldığını yazar; ham dosya da arşive kopyalanır." },
])}
<p><strong>Oran kutularında</strong> (ürün dökümü ve kampanya):</p>
${adimlar([
  { ad: "«Dosya yükle» → dosyayı seçin → «Denetle»", ne: "Okunan satır, değişen oran, aynı kalan, yeni eşleşme ve «bizde yok» sayıları çıkar; değişen oranlar eski → yeni gösterilir." },
  { ad: "«Onayla ve yaz»", ne: "Onay penceresinden sonra yazılır." },
])}
<div class="ek-not"><div class="etiket">Aynı haftayı ikinci kez yüklersem</div>
<p>Tarife üzerine yazılır — eski kalemler silinir, dosyadaki hâli geçerli olur.
Ekran bunu «Bu pencere daha önce yüklenmiş» diye yüklemeden önce söyler. İlk
yükleme eksik geldiyse düzeltmenin yolu budur.</p></div>
<div class="ek-not"><div class="etiket">Kartta «okuyucusu yazılmadı» yazıyorsa</div>
<p>Bir kanalın kartında bir kutu için <em>«bu dosya sisteme hiç gelmedi,
okuyucusu da yazılmadı»</em> yazıyorsa, bu <strong>kanalın öyle bir dosya
yayımlamadığı anlamına gelmez</strong> — bizim o dosya için okuyucumuz olmadığı
anlamına gelir. Elinize geçerse gönderin, okuyucusu yazılır. Kartlarda yalnız
<strong>satış</strong> hesapları durur; alış hesabının komisyonu yoktur.</p></div>
<div class="ek-not"><div class="etiket">Eski biçim dosyalar da açılır</div>
<p>Bazı pazaryerleri dosyayı eski Excel biçiminde (<code>.xls</code>) veriyor —
N11 böyle. İkisi de okunur; dosyayı pazaryerinden indirdiğiniz gibi yükleyin,
dönüştürmeye çalışmayın.</p></div>

<h3>Yüklü pencereler</h3>
<p>Sayfanın en üstünde, <strong>yüklediğiniz son 10 pencere</strong> listelenir:
hangi kanal, hangi tarihten hangi tarihe, kaç kalem. Her satırda bir durum rozeti
vardır: <strong>Güncel</strong> · <strong>N gün kaldı</strong> · <strong>Bugün son
gün</strong> · <strong>Pencere bitti — kapsam yok</strong>. Bu liste yükleme yeri
değil, <strong>yüklenenlerin kaydıdır</strong> — «bu haftayı yükledim mi»
sorusunun cevabı buradadır.</p>
<div class="ek-not dikkat"><div class="etiket">Kaçırılan hafta geri gelmez</div>
<p>Bu dosya <strong>arşivden inmiyor</strong>. O hafta indirilmezse bir daha
elde edilemez ve o döneme ait satışlarda hesaplama motoru hüküm veremez —
susar, yanlış rakam vermez.</p></div>

<h3>Kapsam boşluğu — kaçırdığınız haftalar</h3>
<p>Listenin tepesinde tek satırlık bir <strong>hüküm</strong> durur: «kapsam
kesintisiz» ya da «N kapsam boşluğu · N tam gün tarifesiz». Boşluk varsa listenin
<strong>içinde</strong>, tam ilgili iki pencerenin arasında kırmızı bir satır çıkar:
hangi kanal · hangi saatten hangi saate · kaç saat · kaç tam gün ·
<strong>o aralıkta kaç satış olduğu</strong>. Boşluk sistemin ilk tarife kaydından
önceyse satır bunu da yazar: kaçırılmış bir indirme değil, sistemin görüş
alanının başlangıcıdır.</p>
<div class="ek-not dikkat"><div class="etiket">Bu satır bir görev DEĞİL</div>
<p>Boşluk <strong>kapatılamaz</strong> — dosya arşivden inmiyor. Satırın işi
sizi indirmeye göndermek değil, o dönemin satışlarında hesaplama motorunun
<strong>niye sustuğunu</strong> söylemek. Kapanmayacağı için uyarı çanında da
görünmez: kapanamayan bir uyarı sonsuza kadar yanar ve diğer uyarılara olan
güveni götürür.</p></div>
<p><strong>Saatler önemlidir.</strong> Pencere <em>08:00</em>'de başlar,
<em>07:59</em>'da biter. Yalnız tarihe bakılırsa <code>18 → 21</code> arası
bitişik görünür; aradaki <strong>72 saat</strong> ancak saatle görülür.
Bu yüzden boşluk satırı tarihi saatiyle birlikte yazar.</p>

<h3>Tarife hesaplama</h3>
<p>Yüklü pencerelerin her satırındaki <strong>«Tarife hesaplama»</strong> bağlantısı
— ya da <strong>Sol menü → Tarife hesaplama</strong> (Fiyatlandırma ve Analiz
grubunda) — o tarifeyi <strong>pazaryeri panelinin dilinde</strong> açar: ürün ürün
fiyat aralıkları ve her aralığın komisyonu. Menüden açınca en güncel pencere gelir;
üstteki seçiciden başka pencereye geçebilir, barkod ya da ürün adıyla arayabilirsiniz.</p>
${adimlar([
  { ad: "Ürünü açın, «NET hesapla»", ne: "Ürünün satırındaki düğme." },
  { ad: "Kargo ücretini yazın", ne: "Sistem bu ekranda ürünün kargo ücretini bilmez; kargo yoksa 0 yazın. Boş bırakılırsa NET hesaplanmaz." },
  { ad: "Şu anki satış fiyatını yazın (isteğe bağlı)", ne: "Boşsa o kanaldaki son satış fiyatı kullanılır — güncel olmayabilir." },
  { ad: "Sonucu okuyun", ne: "Her aralıkta <strong>NET-2</strong> yazar; en yüksek NET ◆ ile işaretlenir ve «Fiyatı … yaparsanız NET-2 … artar» önerisi çıkar. Maliyet ürünün son alışından gelir; alış kaydı yoksa NET hesaplanmaz." },
])}
<div class="ek-not dikkat"><div class="etiket">Düşük komisyon, yüksek kâr DEĞİLDİR</div>
<p>Gerçek ölçüm: bir üründe komisyon <strong>%16'dan %3'e</strong> düşerken
NET kâr <strong>800,78 TL'den 208,16 TL'ye</strong> indi — adet başına 592 TL
kayıp. «Komisyonu düşürüyoruz» teklifi cazip görünür; karar veren rakam
komisyon değil <strong>NET</strong>'tir. Pazaryeri bu sütunu gösteremez — sizin
maliyetinizi bilmiyor.</p></div>
${sikHata([
  {
    hata: "Teklif («Avantajlı Teklif») dosyasını «Haftalık komisyon oranı (ürün dökümü)» kutusuna yüklemek",
    cozum: "O kutu reddeder ve nedenini yazar. Teklif dosyası tarife kutusuna (aralıklar) ya da kampanya kutusuna (yalnız bugünkü oran) yüklenir.",
  },
  {
    hata: "Dosya seçicide N11 dosyasını görememek",
    cozum: "Eski biçim (.xls) de listelenir. Görünmüyorsa dosya türü süzgecini «tüm dosyalar» yapın; dosyayı dönüştürmeye gerek yok.",
  },
  {
    hata: "Bir kanalın kartında «okuyucusu yazılmadı» yazısını arıza sanmak",
    cozum: "Arıza değil, beyandır: o kanal ve o dosya türü için okuyucumuz yok. Kart bunu gizlemez, yazar.",
  },
  {
    hata: "Kırmızı boşluk satırını görüp o haftanın dosyasını indirmeye çalışmak",
    cozum: "İnmez. Tam dilimli tarife yalnız yayımlandığı hafta indirilebilir; satır geçmişin kaydıdır, yapılacak iş değil.",
  },
  {
    hata: "Yalnız tarihlere bakıp «aralık yok» sanmak",
    cozum: "Pencere 07:59'da bitip 08:00'de başlar. 18 ile 21 bitişik GÖRÜNÜR ama arada 72 saat olabilir; saati okuyun.",
  },
])}
</section>

<section id="kargoTarifesi">
${baslik("kargoTarifesi")}
<p><strong>Sol menü → Kargo tarifesi</strong> (Veri grubunda). Her pazaryerinin
desiye göre değişen kargo ücret tablosu burada durur. Satış formundaki kargo
firması önerileri ve kâr hesabındaki kargo tutarı buradan okunur. Bu ekranı
«Kanal kodlarını yönet» izni olan açar.</p>
${neZaman(
  "Pazaryeri satıcı panelinden yeni bir kargo tarifesi indiğinde — komisyon tarifesi gibi haftalık DEĞİL, yalnız fiyat değişikliği olduğunda yayımlanır. Bir kanalın kartında «tarife yok» gördüğünüzde.",
)}
${ekranSemasi("Kargo tarifesi", [
  { no: 1, ad: "Tarifesiz kanal uyarısı", aciklama: "«N kanalda kargo tarifesi HİÇ yok» — varsa en üstte.", genis: true, vurgulu: true },
  { no: 2, ad: "Kanal kartları", aciklama: "Tarifesi olmayanlar ve en eskiler üstte. Her kartta: satır · taşıyıcı sayısı · en son geçerlilik tarihi · kaç gün geçtiği.", genis: true },
  { no: 3, ad: "Kart içinde", aciklama: "Okuyucusu olan kanalda «Dosya yükle»; olmayanda nedenini anlatan not." },
])}
<p>Kartlarda yalnız <strong>satış</strong> hesabı olan kanallar durur: kargo tarifesi
sattığınız paketin maliyetidir, alış yaptığınız kanalın değil.</p>
<div class="ek-not dikkat"><div class="etiket">Tarifesi olmayan kanal</div>
<p>Bir kanalda hiç kargo tarifesi yoksa kart bunu açıkça yazar — çünkü o
kanalda <strong>kâr hesabı kargoyu bilemez</strong>. Bu susulacak bir şey
değildir; NET olduğundan yüksek görünür.</p></div>
<div class="ek-not"><div class="etiket">Bugün hangi kanal yüklenebiliyor</div>
<p>Resmî kargo tarifesi dosyası (.pdf) okuyucusu bugün yalnız
<strong>Hepsiburada</strong> için var. Öteki kanallarda yükleme düğmesi yoktur ve
kart <em>«okuyucusu yazılmadı»</em> der — bu, kanalın tarife yayımlamadığı
anlamına <strong>gelmez</strong>. Dosya elinize geçerse gönderin, okuyucusu yazılır.</p></div>
<div class="ek-not"><div class="etiket">«Kaç gün geçti» bir uyarı değil, bir ölçü</div>
<p>Sistem «bu tarife bayat» demez — çünkü tarifenin <strong>bitiş tarihi
verisi yok</strong>, yani kaç günde bayatladığını söyleyecek bir dayanak da
yok. Uydurma bir gün sayısı koymak yerine ekran ölçülebilir olanı yazar;
hükmü siz verirsiniz.</p></div>
<h3>PDF yüklemek</h3>
${adimlar([
  { ad: "«Dosya yükle» → PDF'i seçin", ne: "Satıcı panelinden indirdiğiniz resmî kargo tarifesi dosyası." },
  { ad: "«Önizle»", ne: "Sistem dosyayı okur; üstte «… itibariyle geçerli tarife» tarihi, altında okunan satır, yazılacak değer ve <strong>aynı kalan · değişen · yeni</strong> sayıları ile örnek değişimler çıkar. Hiçbir şey yazılmaz." },
  { ad: "«Tarifeyi Kaydet»", ne: "Rakamlar beklediğiniz gibiyse. Ekran kaç değer yazıldığını söyler; ham PDF de arşivlenir." },
])}
<div class="ek-not dikkat"><div class="etiket">Eski tarife SİLİNMEZ</div>
<p>Yeni tarife <strong>eklenir</strong>, üstüne yazılmaz. Geçmişte yapılmış
satışların kargo maliyeti kendi satış gününde geçerli olan tarifeden
hesaplanmaya devam eder — yeni bir tarife yüklemek geçmiş satışların
rakamlarını değiştirmez.</p></div>
<div class="ek-not"><div class="etiket">Aynı tarihi ikinci kez yüklerseniz</div>
<p>Dosyadaki değerler kayıtlıyla birebir aynıysa ekran «yazılacak bir değişiklik
yok» der. Farklıysa açıkça uyarır; onaylarsanız <strong>o tarihin</strong> eski
değerleri silinip yenisiyle değiştirilir.</p></div>
<p>PDF beklenen düzende değilse (taşıyıcı başlığı bulunamadı, geçerlilik tarihi
okunamadı, desi sırası bozuk ya da boşluklu, tanınmayan taşıyıcı) sistem
<strong>hiçbir şey yazmadan</strong> size Türkçe bir hata gösterir — eksik ya da
şüpheli bir rakam asla uydurulmaz.</p>
${sikHata([
  {
    hata: "Yeni tarife yüklenince geçmiş satışların kârının değişmesini beklemek",
    cozum: "Değişmez. Eski tarife silinmez ve yeni tarife yüklemek kayıtlı satışların rakamlarına dokunmaz.",
  },
])}
</section>

<section id="yedek">
${baslik("yedek")}
<p><strong>Sol menü → Dışa Aktarma</strong> (Veri grubunda). Verileriniz sizindir:
istediğiniz an tamamını indirebilirsiniz. Bu ekranı «Veri aktarımı ve yedek»
izni olan açar.</p>
${neZaman("Muhasebeciye dosya vereceğinizde; büyük bir değişiklikten (toplu içe aktarma, geri yükleme) önce; uyarı çanında «Son yedek N gün önce alındı» ya da «Elde doğrulanmış yedek YOK» satırı çıktığında.")}
<div class="ek-tablo"><table>
<thead><tr><th>Ne</th><th>İçinde ne var</th><th>Kim için</th><th>Ne zaman</th></tr></thead>
<tbody>
<tr><td><strong>Tüm veriyi indir</strong> (Excel)</td><td>Ürünler, alımlar, satışlar, stok ve giderler; her biri ayrı sayfada. Süzgeç uygulanmaz.</td><td>Siz, muhasebeciniz</td><td>İstediğiniz zaman</td></tr>
<tr><td><strong>Yedek dosyasını indir</strong> (JSON, tam)</td><td>Veritabanının tam dökümü: ilişkiler, stok defteri hareketleri, kesinti kalemleri, ayarlar, kargo tarifeleri.</td><td>Geri yükleme</td><td>Büyük bir değişiklikten önce</td></tr>
<tr><td><strong>Hafif yedek indir (tarifesiz)</strong></td><td>Tam yedeğin aynısı, yalnız kargo tarife tablosu hariç — çok daha küçük. Dosyanın içinde eksik olduğu yazar.</td><td>Geri yükleme</td><td>Her gün almaya elverişli</td></tr>
<tr><td><strong>Otomatik yedek</strong></td><td>İş verisinin tamamı (kargo tarifeleri hariç).</td><td>Sistem</td><td>Her gece; 30 günden eskiler kendiliğinden silinir</td></tr>
</tbody></table></div>
<h3>Otomatik yedek kutusu</h3>
<ul>
<li>Son yedekler tarih, boyut ve türüyle (<em>günlük</em> ya da <em>tam</em>) listelenir; her satırda <strong>«indir»</strong> bağlantısı vardır.</li>
<li><strong>«Şimdi yedek al»</strong> o anki hâlin yedeğini hemen alır ve listeye ekler. Ekran yedeğin satır sayısını ve boyutunu yazar.</li>
<li>Bir gece yedek alınmadıysa kutuda kırmızı <strong>«N günün yedeği ALINMAMIŞ»</strong> satırı ve eksik günler çıkar. «Şimdi yedek al» bugünü kurtarır; geçmiş günler geri gelmez.</li>
<li>Listede hiç yedek görmüyorsanız ya da kutu «Otomatik yedek HENÜZ ÇALIŞMIYOR» diyorsa bir sorun var demektir; geliştiriciye bildirin.</li>
</ul>
<div class="ek-not"><div class="etiket">Yedekten geri dönmek</div>
<p>Yedeği geri yüklemek ayrı bir ekrandır: <strong>Sol menü → Geri yükleme</strong>
(Veri grubunda). Adımları için bkz. <a href="#sorun">Bir şey ters giderse</a>.
Geri yükleme için gereken dosya JSON yedektir — Excel dosyası değil.</p></div>
<div class="ek-not dikkat"><div class="etiket">Dikkat</div>
<p>Yedek dosyasında satış, maliyet ve kâr bilgileriniz <strong>açık metin</strong>
durur. İndirdiğiniz dosyayı güvenli bir yerde saklayın.</p></div>
${sikHata([
  {
    hata: "Excel dosyasını yedek sanmak",
    cozum: "Excel dökümü ilişkileri ve stok defterini taşımaz; ondan geri yükleme yapılamaz. Yedek için JSON dosyasını indirin.",
  },
  {
    hata: "Günlük yedekte kargo tarifelerini aramak",
    cozum: "Günlük ve hafif yedek kargo tarifelerini bilerek içermez. Tarifeler de lazımsa «Yedek dosyasını indir» ile tam yedek alın.",
  },
])}
</section>

<section id="geceTuru">
${baslik("geceTuru")}
<p><strong>Sol menü → Gece bekçi turu</strong> (Veri grubunda). Bu ekran teknik
bir bakım ekranıdır. Sistemin kendi kendini denetleyen kontrolleri iki zamanda
koşar: her yeni sürüm gönderildiğinde davranışı koruyan <strong>bekçilerin
hepsi</strong>; <strong>her gece</strong>
ise bütün kontroller. Ekran son <strong>14 gecenin</strong> sonucunu ve canlı
sitenin güncel olup olmadığını gösterir.</p>
${neZaman("Üst çubuktaki uyarı çanında «Gece bekçi turunda … sorun» satırı çıktığında. Günlük işte buraya gelmeniz gerekmez.")}
${ekranSemasi("Gece bekçi turu", [
  { no: 1, ad: "Canlı yayın", aciklama: "Canlı site son sürümle mi çalışıyor: Güncel · Yayımlanıyor · GERİDE · Ölçülemedi.", genis: true, vurgulu: true },
  { no: 2, ad: "Son sunucu hataları", aciklama: "Son 7 günde sunucuda oluşan hatalar: saat, ekran, hata kodu ve sebep. Hata yoksa «hata yok» yazar.", genis: true },
  { no: 3, ad: "Kaçan gece uyarısı", aciklama: "Yalnız son tur 36 saatten eskiyse çıkan kırmızı kutu.", genis: true },
  { no: 4, ad: "Gece turları listesi", aciklama: "Her gece bir satır: saat, sonuç (Yeşil · 170/171 gibi), sürüm, süre ve varsa kırmızı denetimler.", genis: true },
])}
${adimlar([
  { ad: "Canlı yayın kutusuna bakın", ne: "«Güncel» yazıyorsa canlı site son sürümle çalışıyor. «Yayımlanıyor» birkaç dakikalık normal bekleyiştir. <strong>«GERİDE»</strong> yazıyorsa son sürüm o kadar dakikadır yayımlanmamış demektir; kutunun altındaki adımları uygulayın ya da geliştiriciye haber verin. «Ölçülemedi» bir hüküm DEĞİLDİR — «güncel» anlamına gelmez." },
  { ad: "«Bu ekran çizilemedi» gördüyseniz", ne: "O ekrandaki <strong>Hata kodu</strong>nu not edin ve buraya gelin: «Son sunucu hataları» kutusunda aynı kod bir satırda durur, sebebi altında yazar. Kodu ve sebebi olduğu gibi geliştiriciye iletin." },
  { ad: "Kırmızı kutu var mı", ne: "Son tur 36 saatten eskiyse ekran «en az bir gece KAÇMIŞ» der. Tur her gece iki yerde koşar: GitHub'da (bilgisayardan bağımsız) ve bilgisayar açıksa bilgisayarda; listede her gece iki satır görebilirsiniz. Kaçan gece sessiz geçmez, burada yazar." },
  { ad: "Son satırın sonucunu okuyun", ne: "<strong>Yeşil</strong> = bütün kontroller geçti. <strong>Kırmızı</strong> = en az bir denetim düştü; altında adı yazar. «Tur koşamadı — hazırlık düştü» ya da «sonucu okunamadı» da birer sorun satırıdır, yeşil sayılmaz." },
  { ad: "Kırmızıyı geliştiriciye iletin", ne: "Kırmızı denetimin altında «İlk kırmızı: …» satırı varsa sistem o kontrolü hangi sürümün bozduğunu kendisi bulmuştur. Denetim adını ve bu satırı olduğu gibi iletin." },
])}
<h3>Kırmızı ne demek</h3>
<p>Kırmızı, «program bozuldu, kullanmayın» demek <strong>değildir</strong>.
Davranışı koruyan bekçiler her yeni sürümde zaten koşuyor. Gece kırmızısı
çoğunlukla bir kontrolün <strong>dişinin körelmesidir</strong>: kontrol bir hatayı
artık yakalayamıyor. Kırmızı satırda <em>«Bekçi (davranış) kırmızısı»</em>
yazıyorsa sebep ortam da olabilir; geliştirici o denetimi elle yeniden koşar.</p>
<div class="ek-not dikkat"><div class="etiket">Henüz kayıt yoksa</div>
<p>Liste boşsa ekran «Henüz gece turu kaydı yok» der. Bu, «sorun yok» demek
değildir: ilk tur koşmadan önceki geceler için kayıt yokluğu bir sonuç sayılmaz.</p></div>
${sikHata([
  {
    hata: "Gece kırmızısını görüp programı kullanmayı bırakmak",
    cozum: "Gerek yok. Kırmızı çoğunlukla bir denetimin körelmesidir; günlük işe devam edin, kırmızı satırı geliştiriciye iletin.",
  },
  {
    hata: "«Ölçülemedi»yi «güncel» sanmak",
    cozum: "Ölçülemedi, sistemin canlı sürümü öğrenemediği anlamına gelir. Birkaç dakika sonra sayfayı yenileyin; yine ölçülemiyorsa bildirin.",
  },
])}
</section>

<section id="kullanici">
${baslik("kullanici")}
<p><strong>Sol menü → Kullanıcılar</strong> (Ayarlar grubunda). Sisteme kimlerin
girebileceğini yönetir. Her kullanıcının kendi e-postası, parolası ve
<strong>tek bir rolü</strong> vardır. Ne görebileceğini rol belirler (bkz.
<a href="#rol">Roller</a>). Bu ekranı yalnız «Kullanıcıları yönet» izni olan açar.</p>
${neZaman("Yeni biri işe başladığında, biri ayrıldığında, biri parolasını unuttuğunda ya da bir iş ortağına kendi hesabını açacağınızda.")}
${ekranSemasi("Kullanıcılar", [
  { no: 1, ad: "Yeni kullanıcı", aciklama: "E-posta · ad soyad · rol · başlangıç parolası.", genis: true, vurgulu: true },
  { no: 2, ad: "Kullanıcı listesi", aciklama: "Her satırda e-posta, rol, «siz», «parola değiştirmedi», «pasif» etiketleri ve son giriş tarihi.", genis: true },
  { no: 3, ad: "Satır düğmeleri", aciklama: "Parola sıfırla · Pasife al / Aktifleştir · rol seçimi ve «Değişiklikleri kaydet»." },
])}
<h3>Yeni kullanıcı açmak</h3>
${adimlar([
  { ad: "Bilgileri yazın", ne: "<strong>E-posta</strong> ve <strong>Rol</strong> zorunludur; ad soyad isteğe bağlıdır." },
  { ad: "Başlangıç parolasını siz belirleyin", ne: "En az 10 karakter. Parola bilerek açık yazılır, çünkü kişiye siz ileteceksiniz — sistem e-posta göndermez." },
  { ad: "«Kullanıcıyı ekle»ye basın", ne: "Kişi ilk girişte kendi parolasını koymak zorundadır. Koyana kadar listede «parola değiştirmedi» etiketi durur." },
])}
<h3>Parola unutulduğunda</h3>
<p>Kişinin satırında <strong>«Parola sıfırla»</strong> → yeni parolayı yazın →
<strong>«Parolayı kaydet»</strong>. Kişinin açık oturumları kapanır ve ilk
girişte bu parolayı değiştirmesi istenir.</p>
<h3>Rol değiştirmek</h3>
<p>Satırdaki rol listesinden yeni rolü seçin, <strong>«Değişiklikleri kaydet»</strong>.
Değişiklik bir sonraki sayfa açılışında geçerli olur; kişinin yeniden giriş
yapması gerekmez.</p>
<h3>İş ortağına kendi hesabını açmak</h3>
<p>Kurulumla gelen <strong>«Ortak»</strong> rolü, yalnız «Kendi ortak hesabımı gör»
iznini taşır. Bu rolle açılan kullanıcı giriş yapınca <strong>yalnız kendi ortaklık
hesabını</strong> görür: panel, sol menü, uyarı çanı ve diğer ekranlar ona hiç
açılmaz; üst çubukta yalnız «Hesabım», parola ve çıkış durur.</p>
${adimlar([
  { ad: "Kullanıcıyı «Ortak» rolüyle açın", ne: "Bu ekranda, yukarıdaki adımlarla." },
  { ad: "Ortak kartına bağlayın", ne: "<strong>Sol menü → İş Ortakları</strong>: o ortağın kartındaki <strong>«Giriş hesabı»</strong> düğmesiyle bu kullanıcıyı seçin. Bağlanmadan giriş yapan ortak «Giriş hesabınız henüz bir ortak kartına bağlı değil» yazısını görür." },
])}
<div class="ek-not dikkat"><div class="etiket">Ayrılan kullanıcı SİLİNMEZ</div>
<p>Kullanıcı <strong>«Pasife al»</strong> ile kapatılır. Pasif kullanıcı giriş
yapamaz, açık oturumları da kapanır. Silinseydi o kişinin girdiği kayıtlarda
«kim yaptı» bilgisi kaybolurdu; pasif kullanıcının geçmişteki imzası durur.
Gerekirse <strong>«Aktifleştir»</strong> ile geri açılır.</p></div>
<div class="ek-not dikkat"><div class="etiket">Son tam yetkili kullanıcı kilitlidir</div>
<p>Sistemde bütün izinlere sahip <strong>tek</strong> aktif kullanıcı kaldıysa
ekranın üstünde sarı bir uyarı çıkar ve o kişinin rolü düşürülemez, pasife
alınamaz (düğme «kilitli» yazar). Aksi hâlde kimse sisteme yönetici olarak
giremezdi. İkinci bir tam yetkili kullanıcı eklediğinizde kilit kalkar.</p></div>
${sikHata([
  {
    hata: "Parolayı paylaşmak",
    cozum: "İki kişi tek hesapla girerse hangi kaydı kimin yaptığı BİLİNEMEZ. Herkesin kendi hesabı olsun; sistemin izi ancak o zaman işe yarar.",
  },
  {
    hata: "İş ortağına çalışan rolü (ör. depo rolü) vermek",
    cozum: "Çalışan rolü olan kişi paneli ve firmanın cirosunu görür. Dışarıdan bir ortak için yalnız «Ortak» rolünü kullanın.",
  },
  {
    hata: "Ortak kullanıcıyı açıp karta bağlamayı unutmak",
    cozum: "Ortak giriş yapar ama «Giriş hesabınız henüz bir ortak kartına bağlı değil» yazısını görür. İş Ortakları ekranında kartındaki «Giriş hesabı» ile bağlayın.",
  },
])}
</section>

<section id="rol">
${baslik("rol")}
<p><strong>Sol menü → Roller</strong> (Ayarlar grubunda). Bir rolün hangi
ekranları açabileceğini ve hangi işlemleri yapabileceğini belirler. Kullanıcıya
izin değil <strong>rol</strong> verilir; böylece on kişiye tek tek izin dağıtmak
gerekmez. Bu ekranı yalnız «Rolleri yönet» izni olan açar.</p>
${neZaman(
  "Birden fazla kişi çalışmaya başladığında, birine bir ekranı açıp kapatmak istediğinizde ya da bir iş ortağına hesap açacağınızda. Tek kullanıcılıyken bu ekran boş bir katmandır: zaten her şeyi görüyorsunuz.",
)}
<h3>Kurulumla gelen roller</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Rol</th><th>Ne yapar</th></tr></thead>
<tbody>
<tr><td><strong>Tam yetkili rol</strong> (sistem rolü)</td><td>Bütün izinler. İzinleri kısılamaz, pasife alınamaz; adı değiştirilebilir. Sisteme yeni bir izin eklendiğinde bu rol onu kendiliğinden alır (destek taleplerini yönetme izni hariç — o, programı sağlayanın iznidir).</td></tr>
<tr><td><strong>Operasyon</strong></td><td>Depo işi: ürün, alım, mal kabul, stok, stok düzeltmesi, satış girme, iade ve el kitabı. Satışın kârını (NET-2), envanter değerini görmez; satışı düzeltemez, iptal edemez, kanala stok/fiyat gönderemez.</td></tr>
<tr><td><strong>Ortak</strong></td><td>Yalnız «Kendi ortak hesabımı gör». Bu rolle giren kişi panel, menü ve başka hiçbir ekranı görmez; yalnız kendi ortaklık hesabını açar (bkz. <a href="#kullanici">Kullanıcılar</a>).</td></tr>
</tbody></table></div>
<h3>Yeni rol açmak ya da izin değiştirmek</h3>
${adimlar([
  { ad: "Rol adını yazın", ne: "«Yeni rol» kutusuna bir ad (örn. Depo). Aynı adda ikinci rol açılamaz." },
  { ad: "İzinleri işaretleyin", ne: "İzinler dört grupta durur: <strong>Operasyon</strong> · <strong>Para ve marj</strong> · <strong>Ayarlar ve veri</strong> · <strong>Yönetim</strong>. Her iznin altında ne açtığı kısaca yazar. En az bir izin seçmeden rol kaydedilmez." },
  { ad: "Kaydedin", ne: "Değişiklik anında geçerli olur; o roldeki kimsenin yeniden giriş yapması gerekmez." },
])}
<h3>Sık sorulan izinler</h3>
<div class="ek-tablo"><table>
<thead><tr><th>İzin</th><th>Ne açar</th></tr></thead>
<tbody>
<tr><td>Satış kârını gör</td><td>Satış listesindeki NET-2 sütunu ve satış detayındaki kâr bloğu. Kâr hedefi de yalnız bu izinle görünür.</td></tr>
<tr><td>Satış hedeflerini gir</td><td>Hedefler ayar ekranı: günlük → yıllık ciro, kâr ve sipariş hedefleri.</td></tr>
<tr><td>Kanala stok ve fiyat gönder</td><td>Pazaryerine stok ve fiyat gönderimi — paraya dokunur.</td></tr>
<tr><td>Satışı düzelt · Satışı iptal et</td><td>Kayıtlı satışı geriye dönük değiştirir; satış girme izninden ayrıdır.</td></tr>
<tr><td>Kendi ortak hesabımı gör</td><td>Yalnız ortağın kendi hesabı. Bir rolde TEK izin buysa o kullanıcı «ortak kipinde» çalışır.</td></tr>
</tbody></table></div>
<div class="ek-not dikkat"><div class="etiket">Panel herkese açıktır</div>
<p>Panel bir izne bağlı değildir: giriş yapan her çalışan (Ortak rolü hariç)
paneli ve oradaki ciroyu görür. Dışarıdan biri için yalnız «Ortak» rolünü kullanın.</p></div>
<div class="ek-not"><div class="etiket">İzni olmayan ekran</div>
<p>Sol menü herkese aynı görünür. İzni olmayan biri bir ekrana tıklarsa
«sayfa bulunamadı» görür. Bu bir arıza değil, yetkinin çalıştığını gösterir.
O kişinin o ekranı açması gerekiyorsa rolüne ilgili izni işaretleyin.</p></div>
<div class="ek-not"><div class="etiket">Rol silinmez</div>
<p>Rol pasife alınır. İçinde kullanıcı olan rol pasife alınamaz; önce o
kullanıcıları başka bir role taşıyın.</p></div>
${sikHata([
  {
    hata: "Rol adına bakıp yetkisi vardır saymak",
    cozum: "Ölçüt İZİN KÜMESİDİR, rol adı değil. «Yönetici» adlı bir rol, izinleri işaretlenmemişse hiçbir şey yapamaz. Ad bir etikettir, yetki değil.",
  },
  {
    hata: "Yeni bir ekran gelince kendi açtığınız rolün onu kendiliğinden göreceğini sanmak",
    cozum: "Yeni izinleri yalnız tam yetkili rol kendiliğinden alır. Kendi açtığınız rollere yeni izni bu ekrandan siz işaretlersiniz; işaretlenmezse ekran menüde görünür ama açılmaz.",
  },
  {
    hata: "Ortağa «Ortak» rolünün yanında başka bir izin de vermek",
    cozum: "O kişi ortak kipinden çıkar ve çalışan gibi paneli görür. Ortak rolünde tek izin kalmalı.",
  },
])}
</section>

<section id="menu">
${baslik("menu")}
${neZaman(
  "Sol menüdeki sıra size ters geldiğinde. Günlük işinizde en çok açtığınız ekranlar en üstte olmalı.",
)}
<p><strong>Sol menü → Menü düzeni</strong> (Ayarlar grubunda). Sol menüdeki
sıralamayı ve hangi başlığın hangi grupta duracağını buradan değiştirirsiniz.
Bu ekranı «Ayarları yönet» izni olan açar.</p>
<div class="ek-not dikkat"><div class="etiket">Düzen bütün firmanındır</div>
<p>Kaydettiğiniz sıra kişiye özel değildir: sisteme giren <strong>herkesin</strong>
sol menüsü aynı düzene geçer. Başkaları için de değiştirdiğinizi bilerek kaydedin.</p></div>
${ekranSemasi("Menü düzeni", [
  { no: 1, ad: "Hep açık liste", aciklama: "Menüde her zaman görünen başlıklar (Panel, Satışlar…).", genis: true, vurgulu: true },
  { no: 2, ad: "Gruplar", aciklama: "Fiyatlandırma ve Analiz · Para · Ürün ve kanal · Tanımlar · Veri · Ayarlar. Açılır başlıkların altındakiler.", genis: true },
  { no: 3, ad: "Her satırda", aciklama: "Yukarı ok · aşağı ok · «hangi grupta duracak» listesi." },
  { no: 4, ad: "Altta", aciklama: "Kaydet düğmesi · «Varsayılana dön»." },
])}
${adimlar([
  { ad: "Sırayı değiştirin", ne: "Satırdaki <strong>yukarı/aşağı okları</strong> — bir tık bir adım. Taşıdığınız satır mavi çerçeveyle işaretlenir. En üstteki satırın yukarı, en alttakinin aşağı oku kapalıdır: gidecek yer yok." },
  { ad: "Grubunu değiştirin", ne: "Satırın yanındaki açılır listeden grubu seçin. <em>Hep açık liste</em>yi seçerseniz başlık menüde her zaman görünür." },
  { ad: "Kaydedin", ne: "Siz kaydedene kadar sol menü <strong>değişmez</strong>. Değişiklik varken altta «Kaydedilmemiş değişiklik var» yazar; kaydet düğmesi ancak o zaman açılır. Vazgeçmek isterseniz sayfadan çıkmanız yeter, eski düzen yerinde kalır." },
])}
<div class="ek-not"><div class="etiket">Sürükle-bırak niye yok</div>
<p>Telefonda parmakla tutup kaydırmak sayfayı da kaydırır. Ok düğmeleri her
cihazda aynı çalışır ve yanlış bastığınızda geri alması yine bir tık.</p></div>
<div class="ek-not dikkat"><div class="etiket">İki başlık kaldırılamaz</div>
<p><strong>Panel</strong> ve <strong>Menü düzeni</strong> yanında «(menüden
kaldırılamaz)» yazar. Taşıyabilir, istediğiniz gruba koyabilirsiniz ama menüden
düşüremezsiniz: menü düzenini kaldırsaydınız bu ekrana bir daha ulaşamaz,
düzeni geri alamazdınız. Bugün hiçbir başlık menüden gizlenemez; her başlık bir
yerde durur.</p></div>
<div class="ek-not"><div class="etiket">Yeni ekran eklenirse</div>
<p>Sisteme yeni bir ekran geldiğinde menüde <strong>kendiliğinden görünür</strong>
ve bu sayfa size <em>«… yeni ekran eklendi ve varsayılan yerine kondu»</em> der.
Sizin sıranız bozulmaz; yeni gelen kendi varsayılan grubuna eklenir, istediğiniz
yere taşırsınız. Kaldırılmış bir ekran kayıtta kaldıysa ekran bunu da söyler ve
bir sonraki kayıtta temizler.</p></div>
<p><strong>Varsayılana dön</strong> düğmesi kendi sıranızı silip sistemin
düzenine geri döner. Önce onay sorar; sonra sırayı yeniden dizebilirsiniz.</p>
${sikHata([
  {
    hata: "Sırayı değiştirip kaydetmeden sayfadan çıkmak",
    cozum: "Değişiklik kaybolur. Ekran altta «Kaydedilmemiş değişiklik var» diye yazar; kaydet düğmesi ancak değişiklik varken açılır.",
  },
  {
    hata: "Oklara bastıktan sonra sol menünün değişmediğini görüp bozuk sanmak",
    cozum: "Sol menü kayıttan sonra değişir. Önce kaydedin.",
  },
  {
    hata: "Bir grubun bütün başlıklarını taşıyıp grubu boş bırakmak",
    cozum: "Sorun değil: boş grup menüde görünmez. İçine bir başlık taşıdığınız an geri gelir.",
  },
  {
    hata: "Yeni grup açmaya ya da grubun adını değiştirmeye çalışmak",
    cozum: "Bugün yapılamaz; gruplar sabittir. Başlıkları var olan gruplar arasında taşıyabilirsiniz.",
  },
])}
</section>

<section id="kullanim">
${baslik("kullanim")}
<p><strong>Sol menü → Kullanım</strong> (Ayarlar grubunda). Programın nasıl
kullanıldığını gösterir: en çok hangi sayfaların açıldığı, hangi düğmelere
basıldığı, sayfalar arasında nereden nereye geçildiği ve kimin ne kadar
kullandığı. Amaç, sık yapılan işi kısaltmak ve hiç kullanılmayan ekranı görmek.
Bu ekranı «Ayarları yönet» izni olan açar.</p>
${neZaman("Bir ekranın kullanılıp kullanılmadığını merak ettiğinizde; yeni bir eleman işe başladıktan birkaç gün sonra; bir işin kaç tıkla yapıldığını görmek istediğinizde.")}
${ekranSemasi("Kullanım", [
  { no: 1, ad: "Dönem seçici", aciklama: "Bugün, bu hafta, bu ay… ya da kendi tarih aralığınız.", genis: true },
  { no: 2, ad: "Dört kutucuk", aciklama: "Sayfa açılışı · Tıklama · Aktif gün · Kullanıcı.", genis: true, vurgulu: true },
  { no: 3, ad: "Grafikler", aciklama: "Gün gün (uzun dönemde ay ay) kullanım · günün saatleri · cihaz payı (telefon, tablet, masaüstü)." },
  { no: 4, ad: "Arama ve sekmeler", aciklama: "En çok açılan sayfalar · En çok basılan düğmeler · Nereden nereye · Kullanıcılar." },
])}
${adimlar([
  { ad: "Dönemi seçin", ne: "Üstteki dönem seçiciden. Kutucuklar ve grafikler o dönemin tamamını sayar." },
  { ad: "Bir güne inin", ne: "Gün grafiğinde bir sütuna dokunun; ekran o güne (uzun dönemde o aya) süzülür." },
  { ad: "Sekmeyi seçin", ne: "Sayfalar, düğmeler, geçişler ya da kullanıcılar. Her sekmenin altında satırların neyi saydığı yazar." },
  { ad: "Gerekirse arayın", ne: "Arama kutusuna sayfa adı, adresi ya da düğme yazısı yazın. Liste daralır ve kaç satır bulunduğu yazar." },
])}
<h3>Ne kaydedilir, ne kaydedilmez</h3>
<p>Yalnız <strong>sayfa adresi</strong> ve <strong>düğme yazısı</strong>
kaydedilir. Kayıt numaraları tek kalıba iner (<code>/satislar/:id</code>),
düğme yazısındaki rakamlar <strong>#</strong> olur (sipariş no, tutar
görünmez) ve yazı kutularına yazılanlar <strong>hiç</strong> okunmaz.
Düğme listesinde başında <strong>→</strong> olan satır, bir bağlantıya
tıklandığını gösterir.</p>
<div class="ek-not dikkat"><div class="etiket">Kutucuklar aramadan etkilenmez</div>
<p>Üstteki sayılar ve grafikler seçili dönemin tamamıdır. Arama yalnız alttaki
listeyi daraltır ve liste kaç satır bulduğunu ayrıca yazar.</p></div>
<div class="ek-not"><div class="etiket">İz ne zaman başladı</div>
<p>Başlığın altında izin başladığı tarih yazar. O tarihten önceki günler için
«kayıt yok» bir sonuç değildir — o gün kimse kullanmadı demek değil, iz henüz
tutulmuyordu demektir.</p></div>
${sikHata([
  {
    hata: "Arama yapınca üstteki sayıların değişmesini beklemek",
    cozum: "Değişmez; kutucuklar dönemin tamamını sayar. Aramanın sonucu listenin üstündeki özet satırında yazar.",
  },
  {
    hata: "«Nereden nereye» sekmesinde ilk açılışları aramak",
    cozum: "Programın ilk açılışı (önceki sayfa yok) bu sekmede sayılmaz; yalnız program içindeki geçişler sayılır.",
  },
])}
</section>

<section id="bildirim">
${baslik("bildirim")}
<p><strong>Sol menü → Bildirimler</strong> (Ayarlar grubunda). Telefon kilitliyken
ya da program kapalıyken de yeni sipariş gelince haber verir: kilit ekranında
«3 yeni sipariş» gibi bir bildirim çıkar, dokununca <strong>Satışlar</strong> açılır.
Satış hedefi geçildiğinde «Tebrikler!» bildirimi de aynı yoldan gelir.
Bildirim <strong>her cihazda ayrı</strong> açılır — telefonda açtıysanız
bilgisayarda da ayrıca açın. Bu ekranı ve bildirimleri yalnız satışları görme
izni olan kişiler kullanır.</p>
${neZaman("Siparişi anında görmek istediğinizde; yeni bir telefon ya da bilgisayar kullanmaya başladığınızda; bildirim gelmiyorsa sebebini bulmak için.")}
${ekranSemasi("Bildirimler", [
  { no: 1, ad: "Bu cihaz", aciklama: "Bu cihazda bildirimin açık mı kapalı mı olduğu ve düğmeler.", genis: true, vurgulu: true },
  { no: 2, ad: "Bildirimi açık cihazlarım", aciklama: "Açtığınız her cihaz, açıldığı tarih ve «Kaldır»." },
  { no: 3, ad: "Son sipariş bildirimi", aciklama: "En son ne zaman, kaç sipariş için bildirim gönderildi." },
  { no: 4, ad: "Bildirim sesi", aciklama: "Varsayılan ses ya da kasa sesi — indirme düğmesi ve adımlar.", genis: true },
  { no: 5, ad: "Bilmeniz gerekenler", aciklama: "Android, iPhone ve bilgisayar sınırları.", genis: true },
])}
<h3>Bir cihazda açmak</h3>
${adimlar([
  { ad: "Ekranı o cihazda açın", ne: "Bildirimi hangi cihazda istiyorsanız Bildirimler ekranını <strong>o cihazdan</strong> açın. iPhone'da önce uygulamayı ana ekrana ekleyin (Safari → Paylaş → «Ana Ekrana Ekle») ve ana ekrandaki simgeden açın." },
  { ad: "«Bu cihazda bildirimleri aç»", ne: "Cihazın sorduğu izne <strong>İzin ver</strong> deyin. Ekranda «Bu cihazda bildirimler AÇIK» yazmalı." },
  { ad: "«Deneme bildirimi gönder»", ne: "Birkaç saniye içinde bildirim gelmelidir. Ekran kaç cihaza gönderildiğini yazar (örn. 2/2); deneme, bildirimi açık BÜTÜN cihazlarınıza gider." },
  { ad: "Kilit ekranında deneyin", ne: "<strong>«10 sn sonra gönder (telefonu kilitleyin)»</strong>ye basın ve hemen telefonu kilitleyin. Bildirim kilit ekranında sesli gelmelidir. Gelmezse telefonun tarayıcı (Chrome) pil ve bildirim ayarlarına bakın." },
])}
<p>Bildirimi bir cihazda kapatmak için o cihazda <strong>«Bu cihazda kapat»</strong>.
Artık kullanmadığınız bir cihazı (ör. değiştirdiğiniz eski telefon) listeden
<strong>«Kaldır»</strong> ile silebilirsiniz. Çalışmayan eski cihaz kayıtları
deneme sırasında kendiliğinden silinir ve ekran bunu yazar.</p>
<h3>Ses: telefonun sesi mi, kasa sesi mi</h3>
<p>Varsayılan olarak <strong>telefonun bildirim sesi</strong> çalar; bir şey
yapmanız gerekmez. Program açıkken çalan <strong>kasa sesini</strong> bildirimde de
duymak isterseniz sesi telefona bir kez tanıtmanız gerekir (Android):</p>
${adimlar([
  { ad: "«Kasa sesini indir»", ne: "Dosya telefonun İndirilenler klasörüne düşer." },
  { ad: "Dosyayı taşıyın", ne: "Dosyalarım uygulamasında dosyayı «Notifications» (Bildirimler) klasörüne taşıyın." },
  { ad: "Siteyi bulun", ne: "Telefonun Ayarlar → Uygulamalar → Chrome → Bildirimler bölümünde bu sitenin satırına dokunun." },
  { ad: "Sesi seçin", ne: "«Ses» → listeden kasa sesini seçin. Bundan sonra yalnız bu sitenin bildirimleri kasa sesiyle çalar; öteki bildirimleriniz değişmez." },
])}
<div class="ek-not"><div class="etiket">Program ekranda açıkken</div>
<p>Program ekranda açıkken <strong>sipariş</strong> bildirimi sessiz düşer, çünkü
programın kendi kasa sesi zaten çalar (üst çubuktaki hoparlör düğmesiyle açılıp
kapanır). Deneme bildirimi her zaman sesli gelir.</p></div>
<div class="ek-not dikkat"><div class="etiket">iPhone, bilgisayar ve gecikme</div>
<p><strong>iPhone/iPad:</strong> bildirim yalnız uygulama ana ekrana eklenmişse gelir
(iOS 16.4 ve üstü); bildirim sesi değiştirilemez.
<strong>Bilgisayar:</strong> sekme kapalıyken gelir ama tarayıcı tamamen kapalıysa gelmez.
<strong>Gecikme:</strong> siparişler 5 dakikada bir çekildiği için bildirim birkaç
dakika gecikebilir.</p></div>
${sikHata([
  {
    hata: "Telefonda açıp bilgisayarda da gelmesini beklemek",
    cozum: "Bildirim cihaz başınadır. Bilgisayarda da Bildirimler ekranını açıp «Bu cihazda bildirimleri aç»a basın.",
  },
  {
    hata: "İzin sorusuna yanlışlıkla «Engelle» demek",
    cozum: "Ekran «bildirim izni reddedilmiş» yazar ve düğme çıkmaz. Tarayıcının site ayarlarında bu siteye bildirim izni verip sayfayı yenileyin.",
  },
  {
    hata: "iPhone'da Safari sekmesinden açmaya çalışmak",
    cozum: "Çalışmaz; ekran bunu söyler. Önce Paylaş → «Ana Ekrana Ekle», sonra ana ekrandaki simgeden açıp bu sayfaya yeniden gelin.",
  },
  {
    hata: "Program açıkken sipariş bildiriminin sessiz gelmesini arıza sanmak",
    cozum: "Bilerek böyle: o anda kasa sesi zaten çalar. Kilit ekranında sesi «10 sn sonra gönder» ile sınayın.",
  },
  {
    hata: "Ekranda «Anlık bildirim bu sunucuda henüz kurulmadı» yazısı",
    cozum: "Sizin cihazınızla ilgili değil; sunucu ayarı eksik. Geliştiriciye bildirin — kurulana kadar hiçbir cihaza bildirim gitmez.",
  },
])}
</section>

<section id="ozellikler">
${baslik("ozellikler")}
<p><strong>Sol menü → Özellikler</strong> (Ayarlar grubunda). Her firmanın ihtiyacı
olmayan isteğe bağlı özellikler burada açılıp kapanır. <strong>Açıp kapatmak veriyi
silmez.</strong> Bu ekran ayar yazma yetkisi ister.</p>
${neZaman(
  "Finansman'da dolar ya da altın cinsinden bir borç kaydetmeniz gerektiğinde (Döviz ve altın borç), ya da artık kullanmadığınız bir özelliği yeni kayıtlarda gizlemek istediğinizde.",
)}
<h3>Döviz ve altın borç</h3>
<p>Satırda özelliğin durumu (<strong>Açık</strong> / <strong>Kapalı</strong>) ve yanında
<strong>«Aç»</strong> ya da <strong>«Kapat»</strong> düğmesi durur.</p>
<p>Açıkken Finansman'da yeni kaynak açarken <strong>USD</strong> ve
<strong>gram altın (24 / 22 ayar)</strong> ve adetle sayılan altın (<strong>çeyrek · yarım
· tam · Cumhuriyet · Ata lira</strong>) birimi seçilebilir. Adetli altın grama
çevrilmez; «5 adet çeyrek» olarak tutulur, fiyatı adet başına girilir. Borç kendi
biriminde tutulur («80 gr · 24 ayar»); TL karşılığı, Finansman sayfasına
girdiğin son fiyatla <strong>tahmini</strong> olarak ve fiyat tarihiyle
gösterilir. Kapatınca daha önce girilmiş kayıtlar gizlenmez, yalnız yeni
kayıtta bu birimler seçilemez.</p>
<ul>
<li>Böyle bir borcun taksitinde faiz + verginin <strong>ödenen TL karşılığı</strong>
ayrıca sorulur; gidere TL yazılır, sistem kur çevirmez.</li>
<li>USD ya da altın cinsinden kaynak bir ortaklık projesine <strong>bağlanamaz</strong>:
projeler TL ile açılır ve bağ için birimin projeyle aynı olması gerekir.</li>
</ul>
</section>

<section id="talep">
${baslik("talep")}
<p>Sistemle ilgili bir sorunu ya da isteği kayda geçirdiğiniz yer. Konuşmada
kalan bir talep unutulur; buraya yazılan kalır ve durumu takip edilebilir. İki
parçası vardır: <strong>bildirmek</strong> için üst çubuktaki düğme,
<strong>takip etmek</strong> için <strong>Sol menü → Destek talepleri</strong>
(menünün en altında, sabit durur).</p>
${neZaman(
  "Bir ekran beklediğiniz gibi çalışmadığında (HATA) ya da bugün olmayan bir şeyin olmasını istediğinizde (İSTEK). İkisini ayırmanız önemli: hata acildir, istek sıraya girer. Bildirimi sorunun yaşandığı ekrandayken yapın — hangi sayfada olduğunuz kendiliğinden eklenir.",
)}
<h3>Bildirmek — üst çubuktaki düğme</h3>
<p>Her ekranın üst çubuğunda, el kitabı simgesinin yanında konuşma balonu
simgeli bir düğme vardır (üstüne gelince «Hata veya istek bildir» yazar). Basınca
sağdan bir panel açılır.</p>
${adimlar([
  { ad: "Ne bildiriyorsunuz?", ne: "Hata mı İstek mi seçin. HATA: çalışması gerekirken çalışmayan bir şey. İSTEK: bugün olmayan ama olmasını istediğiniz bir şey." },
  { ad: "Kısa başlık", ne: "Zorunlu. Tek cümlede ne olduğu. Örnek: «Satış kaydederken kargo firması seçilmiyor»." },
  { ad: "Ne oldu, ne bekliyordunuz?", ne: "Zorunlu. Adım adım: ne yaptım, ne oldu, ne olmasını bekliyordum. Üç cümle yeter ama üçü de olsun." },
  { ad: "Otomatik gönderilen bilgiler", ne: "Hangi sayfadaydınız ve hangi tarayıcıyı kullandığınız kendiliğinden eklenir — tıklayıp görebilirsiniz. Başka hiçbir şey gönderilmez." },
  { ad: "Gönder", ne: "Talep bir numarayla kaydedilir ve numara ekranda yazar; «Taleplere git» bağlantısı çıkar." },
])}
<h3>Takip etmek — Destek talepleri ekranı</h3>
${ekranSemasi("Destek talepleri", [
  { no: 1, ad: "Durum ve tür süzgeci", aciklama: "Tüm durumlar · Açık · İnceleniyor · Yapılıyor · Çözüldü · Kapandı · Reddedildi · Ertelendi — ve Tüm türler · Hata · İstek.", genis: true },
  { no: 2, ad: "Sayaç", aciklama: "«N talep · M tanesi açık»." },
  { no: 3, ad: "Talep kartı", aciklama: "Talep no · durum ve tür rozetleri · başlık · açıklama · sayfa/tarayıcı bilgisi.", vurgulu: true },
  { no: 4, ad: "Çözüm notu ve dosya ekleri", aciklama: "Destek tarafının notu yeşil kutuda; altında ekran görüntüsü yükleme." },
])}
<ul>
<li>En yeni talep en üsttedir. Üstte <strong>durum</strong> süzgeci (Tüm durumlar ·
Açık · İnceleniyor · Yapılıyor · Çözüldü · Kapandı · Reddedildi · Ertelendi) ve
<strong>tür</strong> süzgeci (Tüm türler · Hata · İstek) vardır.</li>
<li>Altında «N talep · M tanesi açık» sayacı yazar.</li>
<li>Her kartta <strong>Talep no</strong> (tek tıkta kopyalanır), durum ve tür
rozetleri, başlık, açıklama ve katlanmış hâlde sayfa/tarayıcı bilgisi durur.</li>
<li>Destek tarafı bir <strong>Çözüm notu</strong> yazdıysa yeşil kutuda, kimin ve
ne zaman yazdığıyla görünür.</li>
<li>Durumu değiştirme alanını yalnız talepleri yönetme yetkisi olan kişi görür.</li>
</ul>
<h3>Ekran görüntüsü eklemek</h3>
${adimlar([
  { ad: "Önce talebi gönderin", ne: "Bildirim panelinde dosya eklenmez." },
  { ad: "Talebi listede bulun", ne: "Sol menü → Destek talepleri. Talep numarasıyla ya da başlığıyla bulun." },
  { ad: "Dosyayı seçin", ne: "Kartın «Dosya ekleri» bölümünden seçin. Seçer seçmez yüklenir; ayrı bir gönder düğmesi yoktur. JPG, PNG, WEBP ya da PDF; dosya başına en fazla 4 MB, talep başına en fazla 10 ek." },
])}

<h3>İyi bir bildirim nasıl yazılır</h3>
<p>Aradaki fark şudur — ikisi de aynı sorunu anlatıyor ama biri
<strong>çözülebilir</strong>:</p>
<div class="ek-tablo"><table>
<thead><tr><th>Zayıf</th><th>Güçlü</th></tr></thead>
<tbody>
<tr>
<td>«Satış ekranı bozuk»</td>
<td>«Satışlar → Yeni satış'ta kargo firmasını seçtim, kaydedince ücret 0 ₺ kaldı. 120 ₺ bekliyordum.»</td>
</tr>
<tr>
<td>«Rakamlar yanlış»</td>
<td>«11518039572 numaralı satışta NET-2 ₺651 görünüyor, elle hesabım ₺673. Komisyon %5 girmiştim.»</td>
</tr>
</tbody></table></div>
<p>Güçlü olanın farkı: <strong>hangi ekran · hangi kayıt · gördüğünüz rakam ·
beklediğiniz rakam.</strong> Bu dördü varsa sorun aranmaz, doğrudan bakılır.</p>

${sikHata([
  {
    hata: "Ekran görüntüsünü bildirim paneline eklemeye çalışmak",
    cozum: "Panel gönderilirken ek alınmaz. Önce talebi gönderin, sonra Destek talepleri listesinde o talebin kartından ekran görüntüsünü ekleyin.",
  },
  {
    hata: "Her şeyi «HATA» olarak bildirmek",
    cozum: "Olmayan bir özelliği istemek hata değil İSTEKTİR. Hepsi hata sayılırsa gerçek hatalar yığının içinde kaybolur.",
  },
  {
    hata: "«Bir ara olmuştu» diye yazmak",
    cozum: "Tekrarlanamayan bir sorun aranamaz. Hangi kayıtta, hangi tarihte olduğu yazılırsa bakılabilir; yazılmazsa talep açık kalır ve kimseye faydası olmaz.",
  },
])}
</section>

<section id="sorun">

${baslik("sorun")}
<p>Sistem sessiz kalmaz: bir şey olmadıysa <strong>neden olmadığı</strong> ekranda
yazar. Önce o yazıyı okuyun; aşağıda en sık görülenler ve ne yapılacağı var.
Çözemediğiniz bir durumda üst çubuktaki <strong>«Hata veya istek bildir»</strong> düğmesiyle ya da
<strong>Sol menü → Destek talepleri</strong> ekranından talep açın — talep açmak
izin istemez.</p>

<h3>Ekranda gördüğünüz yazılar</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Ekranda gördüğünüz</th><th>Anlamı ve çözümü</th></tr></thead>
<tbody>
<tr><td><strong>kural eksik</strong></td><td>Komisyon oranı ya da kargo tarifesi bulunamadı; sistem kâr rakamı uydurmaz. Satışı açıp <strong>«Yeniden hesapla»</strong> deyin: komisyon oranını ya da pazaryeri panelinden okuduğunuz komisyon tutarını girin; sorun kargodaysa kargo firmasını seçin ya da tutarı elle yazın. Kaydetmeden önce eski ve yeni NET yan yana gösterilir. Ürünün oranı hiç yoksa <strong>Kanal kodları</strong> ekranından girin.</td></tr>
<tr><td><strong>maliyet yok</strong></td><td>Satılan mal, birim maliyeti girilmemiş bir partiden düştü; kâr sıfır sayılmaz, hesaplanmaz. Satış detayındaki stok düşümü tablosunda, partinin yanındaki <strong>«Maliyeti düzelt»</strong> ile doğru birim maliyeti ve nedenini yazın; «Önce göster» kaç satışın kârının değişeceğini söyler, onay kutusunu işaretleyip «Düzelt»e basın. Bu düğme «Stok düzeltmesi yap» izni ister. Partinin para birimi hiç yoksa bu yol kapalıdır ve ekran bunu yazar.</td></tr>
<tr><td><strong>para birimi</strong> (farklı)</td><td>Maliyet ile satış farklı para biriminde. Kur çevrilmez. Alımın para birimini kontrol edin: gerçekten farklıysa bu satışın kârı bilerek hesaplanmaz, geliri raporda yine sayılır.</td></tr>
<tr><td><strong>… için stok yetersiz</strong></td><td>Satmaya çalıştığınız adet elinizdekinden fazla; satış kaydedilmedi. Mal kabul yapmayı unutmuş olabilirsiniz.</td></tr>
<tr><td><strong>Bu sipariş numarası zaten kayıtlı</strong></td><td>Aynı siparişi ikinci kez giriyorsunuz; ikinci kayıt stoğu iki kez düşürürdü. Ekrandaki bağlantıyla var olan satışa gidin.</td></tr>
<tr><td><strong>Bu sipariş numarası iptal edilmiş bir satışta duruyor</strong></td><td>Numarayı değiştirmeyin (sonuna rakam eklemek, satışın pazaryeri ödemesiyle eşleşmesini kalıcı olarak bozar). O satışı açıp <strong>«İptali geri al»</strong> deyin, gerekiyorsa sonra düzenleyin.</td></tr>
<tr><td><strong>«X» bulunamadı</strong> (içe aktarmada)</td><td>Dosyadaki kategori/raf/kanal hesabı sistemde tanımlı değil. Şablonun «Listeler» sayfasındaki adları kullanın; yeni ad gerekiyorsa önce kendi ekranında açın.</td></tr>
<tr><td><strong>Sayfa bulunamadı</strong> (menüdeki bir ekrana tıklayınca)</td><td>Rolünüzde o ekranın izni yok. Yönetici rolünüze izni işaretlemelidir (bkz. <a href="#rol">Roller</a>).</td></tr>
<tr><td><strong>Bildirim gelmiyor</strong></td><td>Bildirimler ekranını o cihazda açın: ekran nedenini yazar (izin reddedilmiş · iPhone'da ana ekrana eklenmemiş · tarayıcı desteklemiyor · sunucuda kurulmamış). «Deneme bildirimi gönder» ile sınayın (bkz. <a href="#bildirim">Bildirimler</a>).</td></tr>
<tr><td><strong>«… hedefi okunamadı: yalnız sayı yazın»</strong></td><td>Hedef kutusuna nokta ya da ₺ yazılmış. Düz sayı yazın: 500000 (bkz. <a href="#hedef">Hedefler</a>).</td></tr>
</tbody></table></div>
<div class="ek-not kritik"><div class="etiket">Yapmayın</div>
<p>Bir stok hareketini «düzeltmek» için silmeye çalışmayın — zaten silinemez.
Yanlış bir sayım varsa düzeltme hareketi girilir, geçmiş olduğu gibi kalır.
Yanlış bir satış silinmez, <strong>iptal edilir</strong>: iptal edilen satış ciroya
ve kâra girmez, mal stoğa döner ve iptal geri alınabilir.</p></div>

<h3>Yedekten geri dönme</h3>
<p><strong>Sol menü → Geri yükleme</strong> (Veri grubunda). Bu ekran felaket
içindir: veriler bozulduysa ya da yanlışlıkla silindiyse, bir yedekteki hâle
döndürür. «Veri aktarımı ve yedek» izni ister.</p>
${adimlar([
  { ad: "Yedeği seçin", ne: "Depodaki yedekler listede durur (gece yedekleri dahil); daha önce indirdiğiniz bir .json dosyasını da yükleyebilirsiniz. Büyük dosyalarda depodan seçmek daha güvenlidir. Seçip <strong>«Denetle»</strong>." },
  { ad: "Ne olacağını okuyun", ne: "Bu adım hiçbir şey yazmaz. Yedeğin tarihi, türü (hafif ya da tam) ve tablo tablo <strong>kaç satır silinecek, kaç satır gelecek</strong> yazar. Yedekte olmayan bir tablo boşalacaksa ya da bazı tablolarda kayıt azalacaksa ayrıca uyarır." },
  { ad: "Onaylayın", ne: "Kutuya <strong>GERİ YÜKLE</strong> yazmadan düğme çalışmaz (Türkçe harflerle). «Geri yükle»ye basınca sistem <strong>önce mevcut verinizin güvenlik yedeğini alır</strong>; yedek alınamazsa işlem hiç başlamaz. İşlem birkaç dakika sürebilir; sekmeyi kapatmayın." },
])}
<div class="ek-not"><div class="etiket">Yanlış dosyayı yüklediyseniz</div>
<p>İşlem bittiğinde ekranda <strong>güvenlik yedeğiniz</strong> duruyor: geri
yüklemeden hemen önceki hâliniz. O dosyayı seçip tekrar geri yükleyerek
dönebilirsiniz. Yani bu ekranın kendisi de geri alınabilir.</p></div>
<div class="ek-not dikkat"><div class="etiket">Kısmi geri yükleme yoktur</div>
<p>«Sadece ürünleri geri yükle» diye bir seçenek YOK. Yarısı eski yarısı yeni bir
veritabanı, hiç geri yüklememekten tehlikelidir: stok defteri ile satışlar
birbirini tutmaz. İşlem tek parça çalışır; bir hata olursa hiçbir şey değişmez
ve ekran «Veriniz DEĞİŞMEDİ» der.</p></div>
<div class="ek-not dikkat"><div class="etiket">Parolalar da geri döner</div>
<p>Giriş hesapları da yedekteki hâline döner: parolanızı yedek alındıktan sonra
değiştirdiyseniz eski parolanız geçerli olur. Yedekte hiç giriş hesabı yoksa
ekran kırmızı yazıyla uyarır — o dosyayla devam ederseniz sisteme giremezsiniz.</p></div>
${sikHata([
  {
    hata: "Excel dökümünü geri yüklemeye çalışmak",
    cozum: "Geri yükleme yalnız JSON yedek dosyasıyla yapılır. Excel dökümü yedek değildir.",
  },
  {
    hata: "Hafif yedekten dönünce kargo tarifelerinin boş kalması",
    cozum: "Hafif ve günlük yedek kargo tarifelerini içermez; ekran bunu önceden söyler. Tarifeler geliştirici tarafından kurulum verisinden yeniden yüklenir.",
  },
])}
</section>

<section id="sozluk">
${baslik("sozluk")}
<h3>Ürün ve stok</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Terim</th><th>Anlamı</th></tr></thead>
<tbody>
<tr><td><strong>Varyant</strong></td><td>Ürünün stok tutulan hâli. Tişörtün M bedeni bir varyanttır. Her ürünün bir varsayılan varyantı vardır.</td></tr>
<tr><td><strong>SKU</strong></td><td>Sistemin kendi iç kodu. Her varyantta tektir.</td></tr>
<tr><td><strong>Firma SKU</strong></td><td>Firmanın ürünün üstüne yapıştırdığı fiziksel etiket kodu.</td></tr>
<tr><td><strong>Barkod (EAN)</strong></td><td>Üreticinin kutuya bastığı kod.</td></tr>
<tr><td><strong>Kanal SKU</strong></td><td>Ürünün pazaryerindeki kodu. Bir varyantın her kanalda ayrı kanal SKU'su olabilir; komisyon oranı da bu kayıtta durur.</td></tr>
<tr><td><strong>Parti</strong></td><td>Tek seferde giren, kendi maliyetini taşıyan stok.</td></tr>
<tr><td><strong>FIFO</strong></td><td>«İlk giren ilk çıkar.» Satışta en eski parti önce tükenir.</td></tr>
<tr><td><strong>Stok hareketi</strong></td><td>Stoğu değiştiren her kayıt: alım girişi, satış çıkışı, iade girişi, düzeltme. Silinmez; yanlışsa ters işaretli düzeltme girilir.</td></tr>
<tr><td><strong>Raf</strong></td><td>Depodaki konum. Sistemde kod olarak tutulur.</td></tr>
<tr><td><strong>Desi</strong></td><td>Paketin hacim ölçüsü. Kargo ücreti desiye göre tarifeden okunur.</td></tr>
</tbody></table></div>
<h3>Kanal ve para</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Terim</th><th>Anlamı</th></tr></thead>
<tbody>
<tr><td><strong>Kanal</strong></td><td>Pazaryeri. Trendyol, Hepsiburada, Amazon…</td></tr>
<tr><td><strong>Kanal hesabı</strong></td><td>O pazaryerindeki mağazanız. Bir kanalda birden çok hesap olabilir; satış hesabı ile alış hesabı ayrıdır.</td></tr>
<tr><td><strong>Tarife penceresi</strong></td><td>Haftalık komisyon tarifesinin geçerli olduğu aralık. 08:00'de başlar, 07:59'da biter.</td></tr>
<tr><td><strong>Kapsam boşluğu</strong></td><td>İki tarife penceresi arasında hiç tarife yüklenmemiş süre. Kapatılamaz; o dönemin satışlarında hesaplama motoru hüküm vermez.</td></tr>
<tr><td><strong>Stopaj</strong></td><td>KDV hariç tutarın %1'i olarak kesilen vergi.</td></tr>
<tr><td><strong>NET-1</strong></td><td>Stopaj düşülmüş kâr.</td></tr>
<tr><td><strong>NET-2</strong></td><td>NET-1'den ödenecek KDV de düşülmüş kâr. Cebinizde kalan.</td></tr>
<tr><td><strong>GERÇEK NET</strong></td><td>Σ NET-2 − dönem giderleri − fire/hasar + tazminat geliri. Ayın gerçek sonucu. Sayım farkı buna girmez.</td></tr>
<tr><td><strong>Hakediş</strong></td><td>Pazaryerinin sattığınız malın parasını size ödemesi. Para satıştan hemen değil, birkaç hafta sonra yatar.</td></tr>
<tr><td><strong>Snapshot</strong></td><td>Bir rakamın o anki hâliyle kayda yazılması. Komisyon oranı sonradan değişse eski satışın hesabı kaymaz.</td></tr>
<tr><td><strong>İptal</strong></td><td>Satışı silmeden ciro ve kârdan çıkarmak; mal stoğa döner, iptal geri alınabilir.</td></tr>
</tbody></table></div>
<h3>Kullanıcı ve sistem</h3>
<div class="ek-tablo"><table>
<thead><tr><th>Terim</th><th>Anlamı</th></tr></thead>
<tbody>
<tr><td><strong>Rol</strong></td><td>Bir izin kümesi. Kullanıcıya rol verilir; ne görebileceğini izinler belirler, rolün adı değil.</td></tr>
<tr><td><strong>Tam yetkili rol</strong></td><td>Bütün izinlere sahip rol. Sistemde en az bir aktif tam yetkili kullanıcı kalmak zorundadır.</td></tr>
<tr><td><strong>Ortak (rol)</strong></td><td>İş ortağının girişi. Yalnız kendi ortaklık hesabını görür; panel, menü ve diğer ekranlar ona kapalıdır.</td></tr>
<tr><td><strong>Pasife almak</strong></td><td>Bir kaydı silmeden kullanım dışı bırakmak. Pasif kullanıcı giriş yapamaz ama geçmişteki imzası durur.</td></tr>
<tr><td><strong>Hedef</strong></td><td>Bir dönem (gün, hafta, ay, çeyrek, yıl) için ciro, kâr (NET-2) ya da sipariş adedi hedefi. Üst çubuktaki Hedefler düğmesinden izlenir.</td></tr>
<tr><td><strong>Anlık bildirim</strong></td><td>Telefon kilitliyken ya da program kapalıyken gelen yeni sipariş haberi. Her cihazda ayrı açılır.</td></tr>
<tr><td><strong>Uyarı çanı</strong></td><td>Üst çubuğun sağ ucundaki zil. Bakılması gereken uyarılar (tarife yenileme, yedek, gece turu…) burada toplanır.</td></tr>
<tr><td><strong>Gece bekçi turu</strong></td><td>Sistemin her gece kendi kontrollerini baştan sona koşması. Sonucu Gece bekçi turu ekranında yazar.</td></tr>
</tbody></table></div>
</section>

<section id="yolda">
${baslik("yolda")}
<p>Bunları sistemde <strong>aramayın</strong> — henüz yapılmadı ya da bilerek
kapalı tutuluyor.</p>
<div class="ek-tablo"><table>
<thead><tr><th>Özellik</th><th>Durum</th></tr></thead>
<tbody>
<tr><td>Pazaryerinde sistemden <strong>yeni ilan açmak</strong> (bugün ilan kanalın panelinden açılır, sonra Kanal SKU'da eşleştirilir)</td><td><span class="pul yok">ileride</span></td></tr>
<tr><td>Amazon ve diğer kanallardan otomatik sipariş çekme (bugün yalnız Trendyol, Hepsiburada, N11)</td><td><span class="pul yok">bağlı değil</span></td></tr>
<tr><td>Hepsiburada siparişlerinin otomatik onayı</td><td><span class="pul yok">bilerek kapalı</span></td></tr>
<tr><td>Hareketli ortalama maliyet yöntemi (bugün FIFO)</td><td><span class="pul yok">henüz açık değil</span></td></tr>
<tr><td>Hepsiburada dışındaki kanalların kargo tarifesi dosyasını yüklemek (okuyucu yalnız Hepsiburada için var)</td><td><span class="pul yok">dosya gelince</span></td></tr>
<tr><td>Menü düzeninde yeni grup açmak, grubu yeniden adlandırmak, bir başlığı menüden gizlemek</td><td><span class="pul yok">ileride</span></td></tr>
<tr><td>Kendi web sitenizi 12. kanal olarak bağlamak</td><td><span class="pul yok">planlı</span></td></tr>
<tr><td>Birden çok firmayı tek sistemde yönetmek</td><td><span class="pul yok">hazırlanıyor</span></td></tr>
</tbody></table></div>
<div class="ek-not"><div class="etiket">Program çevrimdışı çalışmaz — bilerek</div>
<p>Uygulama telefona kurulur ama internet yokken rakam göstermez, «Bağlantı yok»
der. Önbellekten gelen bir ekran dünkü kârı bugünkü gibi gösterebilirdi.</p></div>
</section>

</main>
</div>

<footer class="ek-dip"><div class="ek-dip-ic">
<div><strong style="color:var(--murekkep)">${UYGULAMA.ad} Kullanıcı El Kitabı</strong> · ${kacir(uretimTarihi)}</div>
<div>Bu belge sistemden ÜRETİLDİ. Kategori, raf, kanal hesabı ve kesinti listeleri
o anki veritabanınızdan okunur — elle güncellenmez, sapmaz.</div>
</div></footer>
</div>`;
}
