/** Kargonun KDV oranı — `lib/kar` ile AYNI sabit (lib/kar yalnız tip içe aktarır, istemcide güvenli). */
import { GENEL_KDV_ORANI as GENEL_KDV } from "@/lib/kar";

/**
 * ============================================================================
 *  ALIMIN GERÇEK MALİYETİ — TEK GÖVDE (K309, kullanıcı kararı 30.09.2026)
 * ----------------------------------------------------------------------------
 *  «Hep bu şekilde olmaz mal alışları — toptan alımda KDV ve kargo ayrı
 *  yazılabilir, yurtdışında gümrük olur.» Kararlar:
 *    · ayar tedarikçide varsayılan, alımda değişir (Purchase.fiyatKdvDahil ·
 *      kargoDahil)
 *    · KDV tutarı FATURADAN (taxAmount) — sistem oranla yalnız kontrol eder
 *    · ayrı ödenen kargo + gümrük (+ hariç alımda KDV) kalemlere TUTAR
 *      ORANINDA dağıtılır ve ÜRÜN MALİYETİNE girer
 *
 *  ⭐ MALİYET KDV DAHİL TUTULUR — sistemin bugünkü kuralı aynen (satış tarafı
 *  maliyeti KDV dahil okur; indirilecek KDV ayrıca KDV sekmesinde düşer).
 *  Hariç fiyatlı alımda KDV bu yüzden birim maliyete EKLENİR.
 *
 *  ⭐ VARSAYILANDA HİÇBİR RAKAM DEĞİŞMEZ: ek yoksa birim maliyet GİRİLEN
 *  fiyatın KENDİSİDİR (yuvarlama bile uygulanmaz) — 30.09 öncesi 625 kartlı
 *  alımın hepsi dahil/dahil/boş.
 *
 *  ⭐ KART: faturadaki KDV (hariç alımda) + ayrı kargo karta YAZILIR; gümrük
 *  YAZILMAZ (genelde gümrükte ayrıca ödenir — şema notu).
 *
 *  ⛔ KARIŞIK PARA BİRİMİ: TL ve EUR kalemli alımda ek tutar DAĞITILMAZ
 *  (kur çevrilmez); gövde bunu SÖYLER, sessizce bir birime yığmaz.
 * ============================================================================
 */

export type AlimFaturasi = {
  fiyatKdvDahil: boolean;
  kargoDahil: boolean;
  /** Faturadaki KDV tutarı — yalnız hariç alımda sayılır. */
  kdv: number | null;
  /** Ayrı kargo (KDV dahil) — yalnız kargo AYRI iken sayılır. */
  kargo: number | null;
  /** Gümrük vergisi + ithalat masrafı — her zaman maliyete. */
  gumruk: number | null;
};

export type AlimKalemi = {
  /** Çağıranın kalem kimliği (PurchaseItem.id ya da form sırası). */
  anahtar: string;
  adet: number;
  /** Faturadaki birim fiyat (`unitCostAmount`). */
  birim: number;
  paraBirimi: string;
};

const dortBasamak = (x: number) => Math.round(x * 10000) / 10000;
const pozitif = (x: number | null) => (x !== null && Number.isFinite(x) && x > 0 ? x : 0);

/** Faturanın maliyete ve karta eklediği tutarlar. */
export function alimEkleri(f: AlimFaturasi): { maliyetEki: number; kartEki: number; indirilecekKdv: number | null } {
  const kdv = f.fiyatKdvDahil ? 0 : pozitif(f.kdv);
  const kargo = f.kargoDahil ? 0 : pozitif(f.kargo);
  const gumruk = pozitif(f.gumruk);
  return {
    maliyetEki: kdv + kargo + gumruk,
    kartEki: kdv + kargo,
    /** Hariç alımda faturadaki KDV olduğu gibi; dahil alımda null (oranla ayrılır). */
    indirilecekKdv: f.fiyatKdvDahil ? null : kdv,
  };
}

export type InisMaliyeti =
  | { durum: "TAMAM"; birim: Map<string, number>; dagitilan: number }
  | { durum: "KARISIK_PARA"; birim: Map<string, number> }
  | { durum: "DEGER_YOK"; birim: Map<string, number> };

/**
 * Kalem başına İNİŞ (gerçek) birim maliyeti. Dağıtılamıyorsa `birim`
 * girilen fiyattır ve `durum` NEDENİNİ söyler.
 */
export function inisMaliyetleri(f: AlimFaturasi, kalemler: AlimKalemi[]): InisMaliyeti {
  const girilen = new Map(kalemler.map((k) => [k.anahtar, k.birim]));
  const { maliyetEki } = alimEkleri(f);
  if (maliyetEki === 0) return { durum: "TAMAM", birim: girilen, dagitilan: 0 };

  if (new Set(kalemler.map((k) => k.paraBirimi)).size > 1) return { durum: "KARISIK_PARA", birim: girilen };
  const toplam = kalemler.reduce((t, k) => t + k.birim * k.adet, 0);
  if (!(toplam > 0)) return { durum: "DEGER_YOK", birim: girilen };

  const birim = new Map<string, number>();
  for (const k of kalemler) {
    if (k.adet <= 0) {
      birim.set(k.anahtar, k.birim);
      continue;
    }
    const pay = (maliyetEki * (k.birim * k.adet)) / toplam;
    birim.set(k.anahtar, dortBasamak(k.birim + pay / k.adet));
  }
  return { durum: "TAMAM", birim, dagitilan: maliyetEki };
}

/** Karta yazılan tutar: kalemler (kartın para biriminde) + fatura eki. */
export function alimKartTutari(
  f: AlimFaturasi,
  kalemler: AlimKalemi[],
  kartParaBirimi: string,
): { tutar: number; farkliVar: boolean } {
  let tutar = 0;
  let farkliVar = false;
  for (const k of kalemler) {
    if (k.paraBirimi !== kartParaBirimi) {
      farkliVar = true;
      continue;
    }
    tutar += k.birim * k.adet;
  }
  /** Ek, kalemlerin para birimindedir; kartla aynıysa eklenir, değilse söylenir. */
  const ek = alimEkleri(f).kartEki;
  if (ek > 0) {
    const ekParaBirimi = kalemler[0]?.paraBirimi;
    if (ekParaBirimi === kartParaBirimi && !farkliVar) tutar += ek;
    else farkliVar = true;
  }
  return { tutar, farkliVar };
}

/** Prisma `Purchase` satırından fatura yapısını okur. */
export function faturaOku(a: {
  fiyatKdvDahil: boolean;
  kargoDahil: boolean;
  taxAmount: { toString(): string } | null;
  shippingAmount: { toString(): string } | null;
  customsAmount: { toString(): string } | null;
}): AlimFaturasi {
  const n = (d: { toString(): string } | null) => (d === null ? null : Number(d.toString()));
  return {
    fiyatKdvDahil: a.fiyatKdvDahil,
    kargoDahil: a.kargoDahil,
    kdv: n(a.taxAmount),
    kargo: n(a.shippingAmount),
    gumruk: n(a.customsAmount),
  };
}

/** Fatura yapısını okumak için gereken alanlar — kart kurucuları sorgusuna yayılır. */
export const ALIM_FATURA_SECIMI = {
  fiyatKdvDahil: true,
  kargoDahil: true,
  taxAmount: true,
  shippingAmount: true,
  customsAmount: true,
} as const;

/**
 * ============================================================================
 *  ALIMIN İNDİRİLECEK KDV'Sİ (K309)
 * ----------------------------------------------------------------------------
 *  · Fiyat KDV DAHİL (bütün eski alımlar): kalem tutarının İÇİNDEKİ KDV,
 *    ürünün oranıyla ayrılır — bugünkü hesabın AYNISI.
 *  · Fiyat KDV HARİÇ: FATURADAKİ KDV TUTARI olduğu gibi (kullanıcı kararı:
 *    kaynak fatura; oran yalnız kontrol).
 *  · Ayrı kargo (KDV dahil) → içindeki KDV genel oranla eklenir.
 *  · Gümrük vergisi/masrafı KDV DEĞİLDİR — eklenmez (ithalat KDV'si zaten
 *    `kdv` alanında).
 *  Yalnız verilen para birimindeki kalemler sayılır (kur çevrilmez).
 * ============================================================================
 */
export function alimIndirilecekKdv(
  f: AlimFaturasi,
  kalemler: { birim: number; adet: number; oran: number; paraBirimi: string }[],
  paraBirimi: string,
): number {
  const ayni = kalemler.filter((k) => k.paraBirimi === paraBirimi);
  const tekPara = new Set(kalemler.map((k) => k.paraBirimi)).size <= 1;
  let kdv = f.fiyatKdvDahil
    ? ayni.reduce((t, k) => {
        const satir = k.birim * k.adet;
        return t + (satir * k.oran) / (100 + k.oran);
      }, 0)
    : tekPara && ayni.length > 0
      ? pozitif(f.kdv)
      : 0;
  if (!f.kargoDahil && tekPara && ayni.length > 0) {
    const kargo = pozitif(f.kargo);
    kdv += (kargo * GENEL_KDV) / (100 + GENEL_KDV);
  }
  return kdv;
}

/** Alımın ÖDENEN (fatura) toplamı: mal bedeli + ayrı KDV + ayrı kargo + gümrük. */
export function alimFaturaToplami(f: AlimFaturasi, malBedeli: number): number {
  return malBedeli + alimEkleri(f).maliyetEki;
}

/**
 * ============================================================================
 *  FATURA KDV KONTROLÜ — BEKLENEN KDV (30.09.2026)
 * ----------------------------------------------------------------------------
 *  «KDV hariç» faturada girilen KDV tutarı, kalemlerin ürün oranlarıyla
 *  kıyaslanır: beklenen = Σ (birim × adet × oran / 100).
 *
 *  ⚠ YALNIZ UYARI — ESAS OLAN FATURADIR (kullanıcı kararı K309). Kayıt
 *  engellenmez; uyarı ya faturayı ya ürünün KDV oranını baktırır.
 *
 *  TOLERANS UYDURULMAZ, YUVARLAMADAN TÜRER: fatura KDV'yi en kötü ihtimalle
 *  BİRİM başına kuruşa yuvarlar; her yuvarlama en çok yarım kuruş kaydırır.
 *  → tolerans = 0,005 × toplam adet (en az 1 kuruş). Bunun üstündeki fark
 *  yuvarlamayla açıklanamaz.
 *
 *  HÜKÜM VERİLEMEYEN HÂLLER AYRI DÖNER (sessiz «tutuyor» değil):
 *    KARISIK_PARA — iki para birimi var, tek KDV tutarı hangisinin belli değil
 *    ORAN_YOK     — oranı bilinmeyen kalem var
 *    DEGER_YOK    — fiyatı girilmemiş kalem var ya da kalem yok
 * ============================================================================
 */
export type FaturaKdvKontrolu =
  | { durum: "TAMAM"; beklenen: number; tolerans: number }
  | { durum: "KARISIK_PARA" | "ORAN_YOK" | "DEGER_YOK" };

export function beklenenFaturaKdv(
  kalemler: { birim: number | null; adet: number; oran: number | null; paraBirimi: string }[],
): FaturaKdvKontrolu {
  if (kalemler.length === 0) return { durum: "DEGER_YOK" };
  if (new Set(kalemler.map((k) => k.paraBirimi)).size > 1) return { durum: "KARISIK_PARA" };
  let beklenen = 0;
  let adet = 0;
  for (const k of kalemler) {
    if (k.birim === null || !Number.isFinite(k.birim)) return { durum: "DEGER_YOK" };
    if (k.oran === null || !Number.isFinite(k.oran)) return { durum: "ORAN_YOK" };
    beklenen += (k.birim * k.adet * k.oran) / 100;
    adet += k.adet;
  }
  return { durum: "TAMAM", beklenen, tolerans: Math.max(0.01, 0.005 * adet) };
}

/** Girilen KDV beklenenden toleransı aşacak kadar farklı mı? Hüküm yoksa `false`. */
export function faturaKdvUyusmuyor(k: FaturaKdvKontrolu, girilen: number | null): boolean {
  if (k.durum !== "TAMAM" || girilen === null || !Number.isFinite(girilen)) return false;
  return Math.abs(girilen - k.beklenen) > k.tolerans;
}
