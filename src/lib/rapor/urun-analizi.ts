import {
  birimSatisFiyati,
  marjYuzdesi,
  type UrunSatiri,
} from "@/lib/panel-listeler";
import { kovaBul, YAS_KOVALARI, type YasKovasi } from "@/lib/yaslanma";

/**
 * ============================================================================
 *  ÜRÜN ANALİZİ — SÜZGEÇ, SIRALAMA VE ADRES SÖZLEŞMESİ (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 02.09.2026: panelin "Ürün analizi" sekmeleri bir HÜKÜM
 *  veriyor ama dökümü yok — _"kârının %70,5'i 39 üründen geliyor, burası çok
 *  önemli bir veri, süzülebilir ve listelenebilir olmalı."_
 *
 *  ── NİYE TEK SAYFA, DÖRT SEKME ──────────────────────────────────────────
 *  Dört eksen (dağılım · marj · hacim · stokta bekleyen) AYNI kümeyi farklı
 *  sıralar. Dört ayrı sayfa dört ayrı süzgeç kodu ve dört ayrı bakım demek
 *  olurdu; ikisi ayrıştığı gün aynı soruya iki cevap doğardı (İlke #10).
 *
 *  ── ⛔ ADRES BU DOSYADAN ÜRETİLİR — EKRAN KENDİ ADRESİNİ KURAMAZ ────────
 *  Panelin en temel sözü **"sayı = liste"**. Panel _"39 üründen"_ diyorsa
 *  tıklanınca açılan liste TAM O 39 ürün olmalı. Ekran kendi adresini
 *  kurarsa koşul değiştiği gün sayı ile liste **sessizce** ayrışır ve bunu
 *  kimse fark etmez. _(Anayasa İlke #16 · `GOREV_ADRESLERI` deseni.)_
 *
 *  ── ⚠ TOPLAM SAYFANIN DEĞİL, SÜZGECİN TAMAMININ ────────────────────────
 *  Satır tavanı (25/50/100) bir SUNUM kararıdır. Toplamlar her zaman süzülmüş
 *  kümenin TAMAMINDAN hesaplanır (İlke #15). Tavana düşürülmüş bir toplam
 *  hiçbir hata vermez, yalnız sessizce yanlış olur.
 *
 *  Veritabanına GİTMEZ; bekçisi veri olmadan sınar.
 * ============================================================================
 */

/**
 * ⛔ TAVAN BİR SUNUM KARARIDIR, HESAP KARARI DEĞİL.
 * Kullanıcı: _"50 ürüne kadar listelensin. Kullanıcının isteği ile 100
 * ürüne çıkabilsin."_ 25 aşağı yön için duruyor — telefonda 50 satır
 * kaydırma yorgunluğu demek (İlke #8).
 */
export const SATIR_SAYILARI = [25, 50, 100] as const;
export type SatirSayisi = (typeof SATIR_SAYILARI)[number];
export const VARSAYILAN_SATIR: SatirSayisi = 50;

export function satirSayisiCoz(ham: string | undefined): SatirSayisi {
  const n = Number(ham);
  return (SATIR_SAYILARI as readonly number[]).includes(n)
    ? (n as SatirSayisi)
    : VARSAYILAN_SATIR;
}

/**
 * BEŞ EKSEN — panelin dört sekmesi + "mevsim" (K212, kullanıcı isteği
 * 11.09.2026: _"ürünlere mevsimsel bir sekme koymak istiyorum, 1. çeyrekte
 * çok satan, 2. çeyrekte çok satan..."_
 *
 * ⚠ "mevsim" DİĞER DÖRDÜNDEN FARKLI BİR SORUYA CEVAP VERİR: ötekiler
 * "seçili DÖNEMDE ne olmuş" sorar, mevsim "TÜM GEÇMİŞTE bu takvim
 * çeyreğinde ne olmuş" sorar (yıldan bağımsız, kullanıcı kararı — ölçüldü:
 * 4+ farklı ayda satılmış ürünlerde bile mevsimsel bir sinyal net değil,
 * bu yüzden dönem penceresine sıkıştırmak yerine TÜM geçmiş kullanılıyor).
 * Kendi pencere/kanal/para süzgecini YOK SAYAR — `stok` ekseninin dönem
 * süzgecini yok saymasıyla AYNI gerekçe ailesi, bkz. `urun-analizi-verisi.ts`.
 */
export const ANALIZ_EKSENLERI = [
  "dagilim",
  "marj",
  "hacim",
  "stok",
  "mevsim",
] as const;
export type AnalizEkseni = (typeof ANALIZ_EKSENLERI)[number];

/** Takvim çeyreği — yıldan bağımsız (K212). */
export const CEYREKLER = [1, 2, 3, 4] as const;
export type Ceyrek = (typeof CEYREKLER)[number];

export function ceyrekCoz(ham: string | undefined): Ceyrek {
  const n = Number(ham);
  return (CEYREKLER as readonly number[]).includes(n) ? (n as Ceyrek) : 1;
}

/** Bir ayın (1-12) hangi takvim çeyreğine düştüğü. */
export function ceyrekBul(ay: number): Ceyrek {
  if (ay <= 3) return 1;
  if (ay <= 6) return 2;
  if (ay <= 9) return 3;
  return 4;
}

export function eksenCoz(ham: string | undefined): AnalizEkseni {
  return (ANALIZ_EKSENLERI as readonly string[]).includes(ham ?? "")
    ? (ham as AnalizEkseni)
    : "dagilim";
}

/**
 * SIRALAMA ALANLARI — her eksende hepsi seçilebilir.
 *
 * ⚠ Eksene göre KISITLANMADI ve bu bilinçli: "en çok satılanı marja göre
 * sırala" meşru bir sorudur. Eksen KÜMEYİ belirler, sıra ise okuma yönünü;
 * ikisini birbirine kilitlemek kullanıcıyı kendi sorusunu soramaz hâle
 * getirirdi.
 */
export const SIRALAMA_ALANLARI = [
  "net2",
  "net1",
  "marj",
  "adet",
  "ciro",
  "birimFiyat",
  /** Stok ekseninin iki ölçütü — kullanıcı ikisini de istedi. */
  "yas",
  "sermaye",
  "rafAdedi",
  "ad",
] as const;
export type SiralamaAlani = (typeof SIRALAMA_ALANLARI)[number];

/**
 * EKSENİN KENDİ VARSAYILANI — hepsine `net2` vermek stok eksenini boş
 * gösterirdi (o eksende NET-2 tanım gereği sıfır; hepsi eşit çıkar ve
 * sıralama sessizce anlamsızlaşır).
 */
export const EKSEN_VARSAYILAN_SIRA: Record<AnalizEkseni, SiralamaAlani> = {
  dagilim: "net2",
  marj: "marj",
  hacim: "adet",
  stok: "yas",
  mevsim: "ciro",
};

export function siralamaCoz(
  ham: string | undefined,
  eksen: AnalizEkseni,
): SiralamaAlani {
  return (SIRALAMA_ALANLARI as readonly string[]).includes(ham ?? "")
    ? (ham as SiralamaAlani)
    : EKSEN_VARSAYILAN_SIRA[eksen];
}

export type Yon = "artan" | "azalan";
export function yonCoz(ham: string | undefined): Yon {
  return ham === "artan" ? "artan" : "azalan";
}

/**
 * Analiz satırı = panelin `UrunSatiri`ı + süzgecin ihtiyaç duyduğu kimlik.
 *
 * ⚠ `marka` NULLABLE ve öyle KALIYOR. Ölçüldü 02.09.2026: 1100 ürünün
 * 1090'ında dolu (%99,1). Boş olan 10'u "(marka yok)" diye uydurup gruba
 * sokmak, olmayan bir markayı varmış gibi göstermek olurdu; ayrı sayılır.
 */
export type AnalizSatiri = UrunSatiri & {
  urunId: string | null;
  marka: string | null;
  kategori: string | null;
  /**
   * Bu varyantın raftaki en eski açık partisinin yaşı (gün).
   * `null` = raftaki stok yok ya da yaş hesaplanamadı — SIFIR DEĞİL.
   */
  yasGun: number | null;
  /**
   * Rafta bağlı sermaye (KDV hariç), TRY. `null` = maliyeti bilinmiyor
   * YA DA partiler farklı para biriminde (kur çevirisi yasak).
   * ⛔ Sıfır saymak "bedava mal" demek olurdu.
   */
  bagliSermaye: number | null;
  /**
   * ⛔ RAF ADEDİ AYRI SÜTUN — `adet` ile BİRLEŞTİRİLEMEZ.
   * `adet` = dönemde SATILAN, `rafAdedi` = bugün RAFTA duran. İkisi farklı
   * soruların cevabı; tek sütuna sıkıştırmak, sıralamayı sessizce anlamsız
   * yapardı. `null` = bu eksende sorulmuyor.
   * _(Anayasa: "bir sayı etiketiyle taşınır".)_
   */
  rafAdedi: number | null;
  /**
   * ── KİMLİK KODLARI (İlke #3) — kullanıcı isteği 02.09.2026 ─────────────
   * _"Altına tüm bilgiler gelmez mi: barkod, TY SKU, Hepsiburada SKU?"_
   * Bir kaydı tanımlayan kodlar detaya girmeden LİSTEDE görünür.
   *
   * 📏 NE GÖSTERİLECEĞİ ÖLÇÜLDÜ (02.09.2026, 1110 aktif varyant):
   *   barcode      %99,9 dolu               → gösterilir
   *   companySku   %100 dolu AMA %97,7'si SKU ile AYNI
   *                → yalnız FARKLIYSA gösterilir; aynı değeri iki kez
   *                  basmak satırı gürültüye boğar ve hiçbir şey eklemez
   *   kanal SKU    varyant başına ortanca 2 (HB 1092 · TY 1070 · N11 49)
   */
  barkod: string | null;
  /** ⚠ `null` = SKU ile AYNI (ölçüldü: satırların %97,7'si). */
  firmaSku: string | null;
  kanalKodlari: { kanal: string; kod: string }[];
  /**
   * ── ETİKETLER (K212) — ÜRÜN seviyesinde, ORTAK (kullanıcı bazlı değil,
   * karar 11.09.2026). `Product.isFavorite`/`needsReview`/`season`den
   * BİREBİR okunur; burada TÜRETİLMEZ.
   */
  isFavorite: boolean;
  needsReview: boolean;
  /** Elle atanmış mevsim. Otomatik ÖNERİ YOK (ölçüldü 11.09.2026: veri
   *  yetersiz — bkz. BEKLEYENLER K212). */
  season: "YAZ" | "KIS" | null;
};

export type AnalizSuzgeci = {
  markalar: string[];
  kategoriler: string[];
  /** Bu adedin ALTINDA satan ürün listeye girmez. `null` = sınır yok. */
  minAdet: number | null;
  /** Bu cironun ALTINDA kalan ürün listeye girmez. `null` = sınır yok. */
  minCiro: number | null;
  /**
   * K131 — raf yaşı kovası. YALNIZ stok ekseninde anlamlı; satış
   * eksenlerinde `yasGun` zaten `null` ve kova seçilirse hiçbir satır
   * geçmez. ⚠ Bu bir kusur değil, tanımın sonucu — ekran kovaları yalnız
   * stok ekseninde çiziyor.
   * `null` = kova seçili değil.
   */
  kova: YasKovasi | null;
  /**
   * ARAMA (K212) — barkod/EAN, SKU, Firma SKU, kanal kodları ve ürün adı
   * içinde geçen METİN. Büyük/küçük harf ve TR karakter DUYARSIZ.
   * `null`/boş = arama kapalı.
   */
  arama: string | null;
  /** Yalnız favori işaretli ürünler. */
  favoriYalniz: boolean;
  /** Yalnız incelenecek işaretli ürünler. */
  incelenecekYalniz: boolean;
  /** Elle atanmış mevsime göre daralt. `null` = süzgeç kapalı. */
  sezon: "YAZ" | "KIS" | null;
};

export const BOS_SUZGEC: AnalizSuzgeci = {
  markalar: [],
  kategoriler: [],
  minAdet: null,
  minCiro: null,
  kova: null,
  arama: null,
  favoriYalniz: false,
  incelenecekYalniz: false,
  sezon: null,
};

/** Adres değeri → kova. Tanımadığını sessizce bir kovaya düşürmez. */
export function kovaCoz(ham: string | undefined): YasKovasi | null {
  const k = YAS_KOVALARI.find((x) => x.kod === ham);
  return k === undefined ? null : k.kod;
}

/**
 * ÇOKLU DEĞER — TEKRARLI PARAMETRE (`?marka=LEGO&marka=Karaca`).
 *
 * ⛔ İLK YAZIMDA KENDİ AYIRACIMI (`~`) KURMUŞTUM VE YANLIŞTI. İki sebep:
 *   ① Bir onay kutusu ızgarası zaten tekrarlı parametre üretir; ayıraç
 *      kurmak, tarayıcının hazır verdiği şeyi elle yeniden yazmaktı.
 *   ② Ayıraç bir GÜN marka adının içinde geçer ve o gün süzgeç sessizce
 *      iki markaya bölünür — hata vermez, yalnız yanlış küme döner.
 * Tekrarlı parametrede kaçış sorunu YOKTUR; kodlamayı tarayıcı yapar.
 */
export function coklucoz(ham: string | string[] | undefined): string[] {
  if (ham === undefined) return [];
  const liste = Array.isArray(ham) ? ham : [ham];
  return liste.map((x) => x.trim()).filter((x) => x !== "");
}

export function sayiCoz(ham: string | undefined): number | null {
  if (ham === undefined || ham === "") return null;
  const n = Number(ham);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Arama metni — kırpılır, boşsa `null` (İlke #11: boş alan dolu sanılmaz). */
export function aramaCoz(ham: string | undefined): string | null {
  const t = (ham ?? "").trim();
  return t === "" ? null : t;
}

/** `?favori=1` gibi bir bayrak — yalnız `"1"` açık sayılır, başka her şey kapalı. */
export function bayrakCoz(ham: string | undefined): boolean {
  return ham === "1";
}

export function sezonCoz(ham: string | undefined): "YAZ" | "KIS" | null {
  return ham === "YAZ" || ham === "KIS" ? ham : null;
}

/**
 * ARAMA EŞLEŞMESİ — İKİ NORMALLEŞTİRME BİRDEN, TEK BAŞINA HİÇBİRİ YETMEZ.
 *
 * ⛔ SAF `toLowerCase()` YETMEZ: Türkçe kelimede "İ" → "i̇" (noktalı, İKİ
 * karakter) olur, "i" ile eşleşmez.
 * ⛔ AMA `toLocaleLowerCase("tr")` DE TEK BAŞINA YETMEZ — VE BU DEĞER
 * TESTİYLE YAKALANDI (kaynak taramayla değil): Türkçe kuralında ASCII "I"
 * (barkod/SKU/kanal kodlarında sık) "ı" (NOKTASIZ) olur, kullanıcının
 * klavyeden yazdığı düz "i" ile ARTIK EŞLEŞMEZ. "HB-PHI-77" kodu tr-locale
 * ile "hb-phı-77" olur; arama kutusuna "hb-phi" yazan biri BULAMAZ.
 *
 * Çözüm: metin HER İKİ kuralla da normalleştirilir, biri eşleşirse yeter.
 * Kodlar (ASCII) düz kuralda, Türkçe kelimeler (ürün adı) tr-locale'de
 * doğru eşleşir; ikisini birden denemek hangisinin hangi alanda geçerli
 * olduğunu ayrıca bilmeyi gerektirmez.
 */
function aramaEsleserMi(aday: string, aranan: string): boolean {
  return (
    aday.toLowerCase().includes(aranan.toLowerCase()) ||
    aday.toLocaleLowerCase("tr").includes(aranan.toLocaleLowerCase("tr"))
  );
}

/**
 * SÜZGEÇ — küme daraltma. Sıralamadan ÖNCE koşar ve toplamların da
 * girdisidir; ikisi ayrı kümeye bakarsa toplam listeyi anlatmaz.
 */
export function suzgectenGecir(
  satirlar: AnalizSatiri[],
  suzgec: AnalizSuzgeci,
): AnalizSatiri[] {
  return satirlar.filter((s) => {
    /** Marka seçilmişse markası OLMAYAN satır da elenir — sessizce değil, kasten. */
    if (suzgec.markalar.length > 0) {
      if (s.marka === null || !suzgec.markalar.includes(s.marka)) return false;
    }
    if (suzgec.kategoriler.length > 0) {
      if (s.kategori === null || !suzgec.kategoriler.includes(s.kategori))
        return false;
    }
    if (suzgec.minAdet !== null && s.adet < suzgec.minAdet) return false;
    if (suzgec.minCiro !== null && s.ciro < suzgec.minCiro) return false;
    /**
     * ⛔ YAŞI OLMAYAN SATIR KOVA SÜZGECİNDEN GEÇMEZ. `yasGun === null`
     * "rafta değil ya da yaşı bilinmiyor" demek; bir kovaya sokmak
     * bilmediğimiz bir şeyi biliyormuş gibi göstermek olurdu.
     */
    if (suzgec.kova !== null) {
      if (s.yasGun === null || kovaBul(s.yasGun) !== suzgec.kova) return false;
    }
    if (suzgec.favoriYalniz && !s.isFavorite) return false;
    if (suzgec.incelenecekYalniz && !s.needsReview) return false;
    if (suzgec.sezon !== null && s.season !== suzgec.sezon) return false;
    if (suzgec.arama !== null) {
      /**
       * ⚠ HANGİ ALANLARDA ARANDIĞI — kullanıcı isteği 11.09.2026:
       * "barkod EA ve diğer SKU'larla ürün arama". Ürün adı da dahil:
       * bir arama kutusuna görünen metni yazıp bulamamak kullanıcıyı
       * şaşırtırdı (İlke #9 — az tıkla, aradığını bulsun).
       */
      const adaylar = [
        s.urunAdi,
        s.sku,
        s.firmaSku,
        s.barkod,
        ...s.kanalKodlari.map((k) => k.kod),
      ].filter((x): x is string => x !== null);
      if (!adaylar.some((a) => aramaEsleserMi(a, suzgec.arama!))) return false;
    }
    return true;
  });
}

/**
 * SIRALAMA. Değeri hesaplanamayan satır (marj · birim fiyat) **sona düşer**
 * — hangi yönde sıralanırsa sıralansın.
 *
 * ⛔ NİYE: `null`u sıfır saymak, marjı BİLİNMEYEN bir ürünü "en düşük
 * marjlı" listesinin başına oturturdu. Olmayan bir bulgu, gerçek bir
 * bulgudan daha zararlıdır çünkü peşine düşülür.
 * _(Anayasa: "varsayılan değer alanın anlamından türetilir".)_
 */
export function sirala(
  satirlar: AnalizSatiri[],
  alan: SiralamaAlani,
  yon: Yon,
): AnalizSatiri[] {
  const deger = (s: AnalizSatiri): number | null => {
    switch (alan) {
      case "net2":
        return s.hesaplanamayanKalem === s.kalemSayisi ? null : s.net2;
      case "net1":
        return s.hesaplanamayanKalem === s.kalemSayisi ? null : s.net1;
      case "marj":
        return marjYuzdesi(s);
      case "adet":
        return s.adet;
      case "ciro":
        return s.ciro;
      case "birimFiyat":
        return birimSatisFiyati(s);
      case "yas":
        return s.yasGun;
      case "sermaye":
        return s.bagliSermaye;
      case "rafAdedi":
        return s.rafAdedi;
      case "ad":
        return null;
    }
  };

  const carpan = yon === "azalan" ? -1 : 1;
  return [...satirlar].sort((a, b) => {
    if (alan === "ad") {
      return carpan * a.urunAdi.localeCompare(b.urunAdi, "tr");
    }
    const da = deger(a);
    const db = deger(b);
    /** Hesaplanamayan HER İKİ YÖNDE DE sona: yön değişince başa gelmemeli. */
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    /** Eşitlikte ikinci ölçüt hep toplam kâr — panelin kuralıyla aynı. */
    return carpan * (da - db) || b.net2 - a.net2;
  });
}

export type AnalizToplami = {
  /** Süzgeçten geçen ürün sayısı — tavandan BAĞIMSIZ. */
  urun: number;
  adet: number;
  ciro: number;
  net1: number;
  net2: number;
  /** Kârı hesaplanamayan kalem sayısı — gizlenmez, ekranda yazar. */
  hesaplanamayanKalem: number;
  /** Kârı HİÇ hesaplanamamış ürün sayısı — toplamlara girmeyen küme. */
  hesaplanamayanUrun: number;
  /** Süzgecin tamamının marjı (%). `null` = hesaplanabilir ciro yok. */
  marj: number | null;
  /** Rafta bağlı sermaye toplamı — maliyeti bilinenlerden. */
  bagliSermaye: number;
  /** Sermayesi bilinmediği için toplama giremeyen ürün sayısı. */
  sermayesiBilinmeyen: number;
};

/**
 * TOPLAM — SÜZGECİN TAMAMINDAN (İlke #15).
 *
 * ⛔ Bu gövdeye ASLA tavana düşürülmüş liste verilmez. Verilirse ekran
 * "50 üründen ₺X" der ve rakam doğru görünür; oysa süzgeçte 230 ürün
 * vardır. Sessiz yanlışın en pahalı biçimi budur.
 */
export function analizToplami(satirlar: AnalizSatiri[]): AnalizToplami {
  let adet = 0;
  let ciro = 0;
  let net1 = 0;
  let net2 = 0;
  let hesaplanamayanKalem = 0;
  let hesaplanamayanUrun = 0;
  let hesaplananCiro = 0;
  let bagliSermaye = 0;
  let sermayesiBilinmeyen = 0;

  for (const s of satirlar) {
    adet += s.adet;
    ciro += s.ciro;
    net1 += s.net1;
    net2 += s.net2;
    hesaplanamayanKalem += s.hesaplanamayanKalem;
    hesaplananCiro += s.hesaplananCiro;
    if (s.kalemSayisi > 0 && s.kalemSayisi === s.hesaplanamayanKalem) {
      hesaplanamayanUrun++;
    }
    if (s.bagliSermaye === null) sermayesiBilinmeyen++;
    else bagliSermaye += s.bagliSermaye;
  }

  return {
    urun: satirlar.length,
    adet,
    ciro,
    net1,
    net2,
    hesaplanamayanKalem,
    hesaplanamayanUrun,
    marj: hesaplananCiro > 0 ? (net2 / hesaplananCiro) * 100 : null,
    bagliSermaye,
    sermayesiBilinmeyen,
  };
}

/**
 * ============================================================================
 *  ADRES SÖZLEŞMESİ — PANELİN RAKAMLARI BURAYA GELİR
 * ----------------------------------------------------------------------------
 *  ⛔ Bu gövde TEK yazıcıdır. Panel de, sayfanın kendi süzgeç çubuğu da
 *  adresini buradan üretir. İki yerde iki üreteç olsaydı biri güncellenip
 *  öteki unutulurdu ve panelin sayısı ile listenin kümesi ayrışırdı.
 * ============================================================================
 */

export const ANALIZ_YOLU = "/rapor/urunler";

export type AnalizParametreleri = {
  eksen?: AnalizEkseni;
  /** Panelin pencere süzgeci — birebir taşınır, yeniden yorumlanmaz. */
  pencere?: string;
  baslangic?: string;
  bitis?: string;
  kanal?: string;
  para?: string;
  markalar?: string[];
  kategoriler?: string[];
  minAdet?: number | null;
  minCiro?: number | null;
  kova?: YasKovasi | null;
  arama?: string | null;
  favori?: boolean;
  incelenecek?: boolean;
  sezon?: "YAZ" | "KIS" | null;
  /** Yalnız `eksen: "mevsim"` iken anlamlı. */
  ceyrek?: Ceyrek;
  sirala?: SiralamaAlani;
  yon?: Yon;
  satir?: SatirSayisi;
};

export function analizAdresi(p: AnalizParametreleri): string {
  const q = new URLSearchParams();
  if (p.eksen !== undefined) q.set("eksen", p.eksen);
  if (p.pencere !== undefined && p.pencere !== "") q.set("pencere", p.pencere);
  if (p.baslangic !== undefined && p.baslangic !== "")
    q.set("baslangic", p.baslangic);
  if (p.bitis !== undefined && p.bitis !== "") q.set("bitis", p.bitis);
  if (p.kanal !== undefined && p.kanal !== "") q.set("kanal", p.kanal);
  if (p.para !== undefined && p.para !== "") q.set("para", p.para);
  /** Tekrarlı parametre — `append`, `set` DEĞİL: `set` öncekini ezerdi. */
  for (const m of p.markalar ?? []) q.append("marka", m);
  for (const k of p.kategoriler ?? []) q.append("kategori", k);
  if (p.minAdet !== undefined && p.minAdet !== null)
    q.set("minAdet", String(p.minAdet));
  if (p.minCiro !== undefined && p.minCiro !== null)
    q.set("minCiro", String(p.minCiro));
  if (p.kova !== undefined && p.kova !== null) q.set("kova", p.kova);
  if (p.arama !== undefined && p.arama !== null && p.arama !== "")
    q.set("arama", p.arama);
  if (p.favori) q.set("favori", "1");
  if (p.incelenecek) q.set("incelenecek", "1");
  if (p.sezon !== undefined && p.sezon !== null) q.set("sezon", p.sezon);
  if (p.ceyrek !== undefined) q.set("ceyrek", String(p.ceyrek));
  if (p.sirala !== undefined) q.set("sirala", p.sirala);
  if (p.yon !== undefined) q.set("yon", p.yon);
  if (p.satir !== undefined) q.set("satir", String(p.satir));
  const dize = q.toString();
  return dize === "" ? ANALIZ_YOLU : `${ANALIZ_YOLU}?${dize}`;
}

/**
 * PANELİN YOĞUNLAŞMA CÜMLESİNİN HEDEFİ — _"kârının %70,5'i 39 üründen"_.
 *
 * ⛔ SAYI İLE LİSTE AYNI KÜMEDEN: yoğunlaşma NET-2'ye göre AZALAN sıralı
 * paretodan çıkıyor; adres de tam bunu kurar (`sirala=net2`, `yon=azalan`).
 * Sıra başka olsaydı ilk 39 satır başka ürünler olurdu ve kullanıcı
 * cümledeki 39 ile ekrandaki 39'un aynı olmadığını göremezdi.
 *
 * ⚠ TAVAN KÜMEYİ DEĞİL GÖRÜNÜRLÜĞÜ SINIRLAR: 39 ürün 25'lik tavana
 * sığmadığı için tavan, yoğunlaşma sayısını KAPSAYAN en küçük seçenek
 * olarak kurulur. Sığmayan bir hedef, "sayı = liste" sözünü ekranda
 * görünür biçimde bozardı.
 */
export function yogunlasmaAdresi(
  urunSayisi: number,
  taban: Omit<AnalizParametreleri, "eksen" | "sirala" | "yon" | "satir">,
): string {
  const tavan =
    SATIR_SAYILARI.find((n) => n >= urunSayisi) ??
    SATIR_SAYILARI[SATIR_SAYILARI.length - 1];
  return analizAdresi({
    ...taban,
    eksen: "dagilim",
    sirala: "net2",
    yon: "azalan",
    satir: tavan,
  });
}
