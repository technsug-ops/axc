import { basligiNormalle, basliklariDizinle } from "@/lib/tablo/hucre";

import {
  ORAN_ARALIGI,
  type KomisyonOkumasi,
  type KomisyonPlatformu,
  type KomisyonSatiri,
} from "./model";

/**
 * ============================================================================
 *  KOMİSYON LİSTESİ OKUYUCULARI — SAF HESAP
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, dosya AÇMAZ. Girdi: elektronik tablodan okunmuş ham
 *  hücre dizileri. Gerçek dosya olmadan sınanabilir (komisyon:dogrula).
 *
 *  Başlıklar `@/lib/tablo/hucre` ile TOLERANSLI eşleşir: fazladan boşluk,
 *  büyük/küçük harf ve kırılmaz boşluk farkı okuyucuyu kırmaz.
 * ============================================================================
 */

/**
 * "13%" → 13 · "8.5" → 8,5 · "16,67%" → 16,67 · 20 → 20
 *
 * Pazaryerleri aynı bilgiyi üç ayrı biçimde yazıyor (ölçüldü 13.08.2026):
 * HB yüzde işaretli metin ve ondalık VİRGÜL, TY işaretsiz metin ve ondalık
 * NOKTA veriyor. Hücre bazen sayı olarak da gelebiliyor.
 *
 * NEDEN PARA AYRIŞTIRICISI (`sayiCoz`) KULLANILMIYOR — ölçüldü, tuzağa
 * düşüldü ve doğrulama betiği yakaladı: o ayrıştırıcı noktayı BİNLİK
 * AYIRACI sayabiliyor ("1.234" → 1234, ki para için doğrudur). Yüzde
 * alanında bunun karşılığı yok: "16.666" değeri 16666'ya dönüşüp aralık
 * dışına düşüyor ve satır sessizce atlanıyordu. Komisyon oranı 0-100
 * arasında olduğu için binlik ayıracı HİÇ olmaz — bu yüzden nokta ve
 * virgülün ikisi de ONDALIK ayıraç kabul edilir.
 *
 * ARALIK DIŞI DEĞER null DÖNER — geçersiz oran, boş oran gibi işlenir ve
 * uyarı listesine düşer. Sessizce kırpmak (%150 → %100) uydurma olurdu.
 */
export function yuzdeCoz(ham: unknown): number | null {
  if (typeof ham === "number") return aralikSuz(ham);

  const metin = String(ham ?? "")
    .replace(/%/g, "")
    .replace(/\s/g, "")
    .trim();
  if (metin === "") return null;

  // Tek geçerli biçim: isteğe bağlı işaret + rakamlar + tek ondalık ayıraç.
  if (!/^-?\d+([.,]\d+)?$/.test(metin)) return null;

  const sayi = Number(metin.replace(",", "."));
  return Number.isFinite(sayi) ? aralikSuz(sayi) : null;
}

function aralikSuz(sayi: number): number | null {
  if (!Number.isFinite(sayi)) return null;
  if (sayi < ORAN_ARALIGI.enAz || sayi > ORAN_ARALIGI.enFazla) return null;
  // Kuruş hassasiyeti yeter: alan Decimal(5,2). Yuvarlama burada yapılır,
  // yoksa "16.666" veritabanında sessizce kısalırdı.
  return Math.round(sayi * 100) / 100;
}

// ---------------------------------------------------------------------------
//  PLATFORM TANIMA — YANLIŞ DOSYA REDDİ
// ---------------------------------------------------------------------------

/**
 * AYIRT EDİCİ BAŞLIKLAR. Ortak başlıklara (Barkod, Komisyon Oranı, Ürün Adı)
 * bakarak karar VERİLMEZ: iki dosyada da varlar. Bu yüzden her platform,
 * yalnız kendisinde bulunan bir kolonla tanınır. Böylece "belki HB, belki TY"
 * diye bir hâl oluşmaz.
 */
const IMZALAR: {
  platform: KomisyonPlatformu;
  /** Bunlardan EN AZ BİRİ bulunmalı — pazaryerine özgü kolonlar. */
  ozgun: string[];
  /** Bunların HEPSİ bulunmalı — okuyucunun çalışması için gerekli. */
  zorunlu: string[];
}[] = [
  {
    platform: "HEPSIBURADA",
    ozgun: ["satıcı stok kodu", "buybox sırası", "uniqueidentifier"],
    zorunlu: ["sku", "komisyon oranı"],
  },
  {
    platform: "TRENDYOL",
    ozgun: ["partner id", "tedarikçi stok kodu", "trendyol.com linki"],
    zorunlu: ["barkod", "komisyon oranı"],
  },
  {
    /**
     * N11 — eklendi 18.08.2026. Dosya `Ürün Bilgileri Güncelle` sayfasında
     * geliyor ve yanında iki sayfa daha var (`Kılavuz`,
     * `ShipmentTemplatesValidations`); tanıma sayfa sayfa yürüdüğü için
     * doğru olanı buluyor.
     *
     * ÖZGÜN KOLONLAR ölçüldü: `Catalog ID`, `Group ID`, `Seller ID` ve
     * `N11 Satış Fiyatı` yalnız bu dosyada var. Ortak başlıklara
     * (`Komisyon Oranı`, `Ürün Adı`) bakarak karar verilmiyor.
     */
    platform: "N11",
    ozgun: ["catalog id", "group id", "seller id", "n11 satış fiyatı (kdv dahil)"],
    zorunlu: ["stok kodu", "komisyon oranı"],
  },
];

export type SayfaGirdisi = { sheet: string; data: unknown[][] };

export type PlatformTanimasi =
  | { durum: "TANINDI"; platform: KomisyonPlatformu; sayfa: string; veri: unknown[][] }
  /** Dosya okundu ama hiçbir sayfa komisyon listesine benzemiyor. */
  | { durum: "TANINMADI"; sayfalar: string[] };

/**
 * Dosyadaki SAYFALARI tarayıp komisyon listesini bulur.
 *
 * NEDEN İLK SAYFAYA BAKMAK YETMİYOR: Trendyol ürün listesi iki sayfalı
 * geliyor ("Ürünler" + "Termin Süresi Bilgileri") ve sayfa sırası bizim
 * denetimimizde değil. Sayfayı ADIYLA seçmek de çözüm değildi — pazaryeri
 * sayfa adını değiştirdiğinde okuyucu sessizce boş liste okur. Bu yüzden
 * seçim BAŞLIK İMZASINA göre yapılır; ad yalnız kullanıcıya gösterilir.
 */
export function platformTani(sayfalar: SayfaGirdisi[]): PlatformTanimasi {
  for (const sayfa of sayfalar) {
    if (!sayfa?.data || sayfa.data.length === 0) continue;
    const dizin = basliklariDizinle(sayfa.data[0]);

    for (const imza of IMZALAR) {
      const zorunluTam = imza.zorunlu.every((z) => dizin.has(z));
      const ozgunVar = imza.ozgun.some((o) => dizin.has(o));
      if (zorunluTam && ozgunVar) {
        return {
          durum: "TANINDI",
          platform: imza.platform,
          sayfa: sayfa.sheet,
          veri: sayfa.data,
        };
      }
    }
  }
  return { durum: "TANINMADI", sayfalar: sayfalar.map((s) => s?.sheet ?? "?") };
}

// ---------------------------------------------------------------------------
//  OKUYUCULAR
// ---------------------------------------------------------------------------

/** Seçeneklerden ilk tutan kolonu bulur; hiçbiri yoksa eksik listesine yazar. */
function sutunSecici(dizin: Map<string, number>, eksik: string[]) {
  const al = (adaylar: readonly string[]) => {
    for (const aday of adaylar) {
      const sira = dizin.get(basligiNormalle(aday));
      if (sira !== undefined) return sira;
    }
    eksik.push(adaylar[0]);
    return undefined;
  };
  const secmeli = (adaylar: readonly string[]) => {
    for (const aday of adaylar) {
      const sira = dizin.get(basligiNormalle(aday));
      if (sira !== undefined) return sira;
    }
    return undefined;
  };
  return { al, secmeli };
}

const metin = (d: unknown) => String(d ?? "").trim();
const metinYaDaNull = (d: unknown) => (metin(d) === "" ? null : metin(d));

/** Çoklu barkod hücresini ayırır: "8697…995-1;8697…256" → iki kod. */
function barkodlariAyir(ham: unknown): string[] {
  return metin(ham)
    .split(/[;,]/)
    .map((b) => b.trim())
    .filter((b) => b !== "");
}

const HB_SUTUNLAR = {
  sku: ["SKU"],
  saticiStokKodu: ["Satıcı Stok Kodu"],
  oran: ["Komisyon Oranı"],
  barkod: ["Barkod"],
  urunAdi: ["Ürün Adı"],
} as const;

export function hepsiburadaKomisyonOku(satirlar: unknown[][]): KomisyonOkumasi {
  const bos: KomisyonOkumasi = {
    platform: "HEPSIBURADA",
    sayfa: "",
    satirlar: [],
    eksikSutunlar: ["(dosya boş)"],
  };
  if (satirlar.length === 0) return bos;

  const eksikSutunlar: string[] = [];
  const { al, secmeli } = sutunSecici(basliklariDizinle(satirlar[0]), eksikSutunlar);

  const s = {
    sku: al(HB_SUTUNLAR.sku),
    satici: secmeli(HB_SUTUNLAR.saticiStokKodu),
    oran: al(HB_SUTUNLAR.oran),
    barkod: secmeli(HB_SUTUNLAR.barkod),
    urunAdi: secmeli(HB_SUTUNLAR.urunAdi),
  };
  if (eksikSutunlar.length > 0) {
    return { platform: "HEPSIBURADA", sayfa: "", satirlar: [], eksikSutunlar };
  }

  const cikti: KomisyonSatiri[] = [];
  for (let i = 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    const hucre = (sira: number | undefined) =>
      sira === undefined ? undefined : satir[sira];

    const kanalKodu = metin(hucre(s.sku));
    const ikinciKod = metinYaDaNull(hucre(s.satici));
    // Kodu olmayan satır GENEL TOPLAM ya da boş satırdır.
    if (kanalKodu === "" && ikinciKod === null) continue;

    const hamOran = metin(hucre(s.oran));
    cikti.push({
      kanalKodu: kanalKodu === "" ? (ikinciKod ?? "") : kanalKodu,
      ikinciKod,
      barkodlar: barkodlariAyir(hucre(s.barkod)),
      oran: yuzdeCoz(hamOran),
      hamOran,
      urunAdi: metinYaDaNull(hucre(s.urunAdi)),
      satirNo: i + 1,
    });
  }

  return {
    platform: "HEPSIBURADA",
    sayfa: "",
    satirlar: cikti,
    eksikSutunlar: [],
  };
}

const TY_SUTUNLAR = {
  barkod: ["Barkod"],
  oran: ["Komisyon Oranı"],
  tedarikciStokKodu: ["Tedarikçi Stok Kodu"],
  urunAdi: ["Ürün Adı"],
} as const;

export function trendyolKomisyonOku(satirlar: unknown[][]): KomisyonOkumasi {
  if (satirlar.length === 0) {
    return {
      platform: "TRENDYOL",
      sayfa: "",
      satirlar: [],
      eksikSutunlar: ["(dosya boş)"],
    };
  }

  const eksikSutunlar: string[] = [];
  const { al, secmeli } = sutunSecici(basliklariDizinle(satirlar[0]), eksikSutunlar);

  const s = {
    barkod: al(TY_SUTUNLAR.barkod),
    oran: al(TY_SUTUNLAR.oran),
    tedStok: secmeli(TY_SUTUNLAR.tedarikciStokKodu),
    urunAdi: secmeli(TY_SUTUNLAR.urunAdi),
  };
  if (eksikSutunlar.length > 0) {
    return { platform: "TRENDYOL", sayfa: "", satirlar: [], eksikSutunlar };
  }

  const cikti: KomisyonSatiri[] = [];
  for (let i = 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    const hucre = (sira: number | undefined) =>
      sira === undefined ? undefined : satir[sira];

    const barkod = metin(hucre(s.barkod));
    if (barkod === "") continue;

    const hamOran = metin(hucre(s.oran));
    cikti.push({
      // TY'de kanal kodu geleneği BARKOD (canlıda 14/14 ölçüldü).
      kanalKodu: barkod,
      ikinciKod: metinYaDaNull(hucre(s.tedStok)),
      barkodlar: [barkod],
      oran: yuzdeCoz(hamOran),
      hamOran,
      urunAdi: metinYaDaNull(hucre(s.urunAdi)),
      satirNo: i + 1,
    });
  }

  return { platform: "TRENDYOL", sayfa: "", satirlar: cikti, eksikSutunlar: [] };
}

/** Tanınan platforma göre okuyucuyu seçer. */
const N11_SUTUNLAR = {
  /**
   * ⚠ KANAL KODU `Stok Kodu` — ÖLÇÜLDÜ, tahmin edilmedi.
   *
   * Dosyada dört aday tekil kolon var: `Stok Kodu` (EN10000226597),
   * `Ürün Kodu` (769381328), `Group ID`, `Catalog ID`. Sistemdeki üç
   * mevcut N11 kanal SKU'su `EN10000556236` biçiminde — yani `Stok Kodu`.
   * Başkası seçilseydi mevcut kayıtların HİÇBİRİ eşleşmez, üçü de
   * yeniden yaratılır ve N11 tarafında ikizler doğardı.
   */
  stokKodu: ["Stok Kodu"],
  /** İkinci aday: N11'in kendi ürün kodu. Yalnız eşleştirmede kullanılır. */
  urunKodu: ["Ürün Kodu"],
  oran: ["Komisyon Oranı"],
  barkod: ["Barcode", "Barkod"],
  urunAdi: ["Ürün Adı"],
} as const;

export function n11KomisyonOku(satirlar: unknown[][]): KomisyonOkumasi {
  if (satirlar.length === 0) {
    return {
      platform: "N11",
      sayfa: "",
      satirlar: [],
      eksikSutunlar: ["(dosya boş)"],
    };
  }

  const eksikSutunlar: string[] = [];
  const { al, secmeli } = sutunSecici(basliklariDizinle(satirlar[0]), eksikSutunlar);

  const s = {
    stok: al(N11_SUTUNLAR.stokKodu),
    urunKodu: secmeli(N11_SUTUNLAR.urunKodu),
    oran: al(N11_SUTUNLAR.oran),
    barkod: secmeli(N11_SUTUNLAR.barkod),
    urunAdi: secmeli(N11_SUTUNLAR.urunAdi),
  };
  if (eksikSutunlar.length > 0) {
    return { platform: "N11", sayfa: "", satirlar: [], eksikSutunlar };
  }

  const cikti: KomisyonSatiri[] = [];
  for (let i = 1; i < satirlar.length; i++) {
    const satir = satirlar[i];
    const hucre = (sira: number | undefined) =>
      sira === undefined ? undefined : satir[sira];

    const kanalKodu = metin(hucre(s.stok));
    const ikinciKod = metinYaDaNull(hucre(s.urunKodu));
    // Kodu olmayan satır boş satır ya da toplam satırıdır.
    if (kanalKodu === "" && ikinciKod === null) continue;

    const hamOran = metin(hucre(s.oran));
    cikti.push({
      kanalKodu: kanalKodu === "" ? (ikinciKod ?? "") : kanalKodu,
      ikinciKod,
      /**
       * Barkod ÖLÇÜLDÜ: 48 satırın 47'sinde dolu. Boş olan satır barkod
       * yoluyla eşleşemez ama stok koduyla eşleşir — bu yüzden barkod
       * ZORUNLU kolon değil.
       */
      barkodlar: barkodlariAyir(hucre(s.barkod)),
      oran: yuzdeCoz(hamOran),
      hamOran,
      urunAdi: metinYaDaNull(hucre(s.urunAdi)),
      satirNo: i + 1,
    });
  }

  return { platform: "N11", sayfa: "", satirlar: cikti, eksikSutunlar: [] };
}

export function komisyonOku(tanima: {
  platform: KomisyonPlatformu;
  sayfa: string;
  veri: unknown[][];
}): KomisyonOkumasi {
  const okuma =
    tanima.platform === "HEPSIBURADA"
      ? hepsiburadaKomisyonOku(tanima.veri)
      : tanima.platform === "N11"
        ? n11KomisyonOku(tanima.veri)
        : trendyolKomisyonOku(tanima.veri);
  return { ...okuma, sayfa: tanima.sayfa };
}
