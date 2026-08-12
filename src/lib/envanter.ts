import { kdvHaric } from "@/lib/kar";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  ENVANTER DEĞERİ — SAF HESAP
 * ----------------------------------------------------------------------------
 *  "Depoda duran malın parası ne kadar?"
 *
 *  Veritabanına GİTMEZ; açık partiler dışarıdan verilir. Değer, stok
 *  hesabıyla AYNI kaynaktan türer (StockMovement ledger'ı) — ayrı bir
 *  "envanter değeri" kolonu yoktur ve olmayacaktır.
 *
 *  İKİ SÜTUN, İKİ AYRI SORU (kullanıcı kararı 12.08.2026):
 *    ÖDENEN (KDV dahil)     — tedarikçiye fiilen ne ödendi
 *    MAL BEDELİ (KDV hariç) — malın KDV'siz değeri; KDV oranı ürünün
 *                             KATEGORİSİNDEN çözülür
 *
 *  SESSİZ VARSAYIM YOK: KDV oranı çözülemeyen üründe "hesaplanamadı" yazar.
 *  Kâr motorunda varsayılan %20'ye düşme kuralı vardır çünkü satış anında
 *  BİR SAYI ÜRETİLMEK ZORUNDADIR. Değerleme raporunda böyle bir zorunluluk
 *  yok; tahmini gerçek gibi toplamak envanteri olduğundan farklı gösterir.
 *
 *  DEĞERİ BİLİNMEYEN STOK AYRI DURUR: maliyetsiz girilmiş partiler (açılış
 *  stoğu, elle düzeltme) adet olarak gerçektir ama parası bilinmez. Sıfır
 *  sayılıp toplama katılsaydı envanter olduğundan UCUZ görünürdü.
 * ============================================================================
 */

/** Değerlemeye giren tek parti. */
export type EnvanterPartisi = {
  kalanAdet: number;
  /** Decimal metin olarak taşınır. null ise maliyet bilinmiyor. */
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
};

export type EnvanterVaryantGirdisi = {
  variantId: string;
  /** Ürünün KDV oranı (%). null ise ÇÖZÜLEMEDİ — varsayılana düşülmez. */
  kdvOrani: number | null;
  partiler: EnvanterPartisi[];
};

export type EnvanterSatiri = {
  variantId: string;
  paraBirimi: Currency;
  /** Maliyeti BİLİNEN partilerden gelen adet. */
  adet: number;
  /** KDV dahil toplam — ne ödendi. */
  odenen: number;
  /** KDV hariç toplam. Oran çözülemediyse null. */
  malBedeli: number | null;
  kdvOrani: number | null;
};

/** Maliyeti bilinmeyen partiler — para birimi de yok, o yüzden ayrı tip. */
export type BilinmeyenSatiri = {
  variantId: string;
  adet: number;
};

export type EnvanterBlogu = {
  paraBirimi: Currency;
  satirlar: EnvanterSatiri[];
  toplamAdet: number;
  toplamOdenen: number;
  /** Yalnızca KDV oranı ÇÖZÜLEBİLEN satırların toplamı. */
  toplamMalBedeli: number;
  /** Mal bedeli toplamına giremeyen satır sayısı — ekranda açıkça yazılır. */
  kdvCozulemeyenSatir: number;
};

export type EnvanterSonucu = {
  /** Cirosu değil, değeri yüksek para birimi başta. */
  bloklar: EnvanterBlogu[];
  bilinmeyenler: BilinmeyenSatiri[];
  bilinmeyenToplamAdet: number;
};

/**
 * Açık partileri para birimine ve varyanta göre toplar.
 *
 * BİR VARYANT BİRDEN FAZLA PARA BİRİMİNDE OLABİLİR: aynı ürün bir kez TRY,
 * bir kez EUR alınmış olabilir. Bu durumda varyant her para biriminde AYRI
 * satır olur — iki para birimini tek satırda toplamak kur çevirisi yapmak
 * olurdu ve anayasa bunu yasaklıyor.
 */
export function envanterHesapla(
  girdiler: EnvanterVaryantGirdisi[],
): EnvanterSonucu {
  const bloklar = new Map<Currency, Map<string, EnvanterSatiri>>();
  const bilinmeyenler = new Map<string, BilinmeyenSatiri>();

  for (const girdi of girdiler) {
    for (const parti of girdi.partiler) {
      if (parti.kalanAdet <= 0) continue;

      // --- maliyeti bilinmeyen parti: ayrı kovaya ---
      if (parti.birimMaliyet === null || parti.birimMaliyetParaBirimi === null) {
        const mevcut = bilinmeyenler.get(girdi.variantId) ?? {
          variantId: girdi.variantId,
          adet: 0,
        };
        mevcut.adet += parti.kalanAdet;
        bilinmeyenler.set(girdi.variantId, mevcut);
        continue;
      }

      const birim = Number(parti.birimMaliyet);
      // Bozuk sayı sessizce 0 sayılmaz; değeri bilinmeyen kovaya gider.
      if (!Number.isFinite(birim)) {
        const mevcut = bilinmeyenler.get(girdi.variantId) ?? {
          variantId: girdi.variantId,
          adet: 0,
        };
        mevcut.adet += parti.kalanAdet;
        bilinmeyenler.set(girdi.variantId, mevcut);
        continue;
      }

      const paraBirimi = parti.birimMaliyetParaBirimi;
      let satirlar = bloklar.get(paraBirimi);
      if (!satirlar) {
        satirlar = new Map();
        bloklar.set(paraBirimi, satirlar);
      }

      let satir = satirlar.get(girdi.variantId);
      if (!satir) {
        satir = {
          variantId: girdi.variantId,
          paraBirimi,
          adet: 0,
          odenen: 0,
          malBedeli: girdi.kdvOrani === null ? null : 0,
          kdvOrani: girdi.kdvOrani,
        };
        satirlar.set(girdi.variantId, satir);
      }

      const tutar = birim * parti.kalanAdet;
      satir.adet += parti.kalanAdet;
      satir.odenen += tutar;
      if (satir.malBedeli !== null && girdi.kdvOrani !== null) {
        satir.malBedeli += kdvHaric(tutar, girdi.kdvOrani);
      }
    }
  }

  const sonucBloklari = [...bloklar.entries()]
    .map(([paraBirimi, satirlar]) => {
      const liste = [...satirlar.values()].sort((a, b) => b.odenen - a.odenen);
      return {
        paraBirimi,
        satirlar: liste,
        toplamAdet: liste.reduce((t, s) => t + s.adet, 0),
        toplamOdenen: liste.reduce((t, s) => t + s.odenen, 0),
        toplamMalBedeli: liste.reduce((t, s) => t + (s.malBedeli ?? 0), 0),
        kdvCozulemeyenSatir: liste.filter((s) => s.malBedeli === null).length,
      };
    })
    .sort((a, b) => b.toplamOdenen - a.toplamOdenen);

  const bilinmeyenListe = [...bilinmeyenler.values()];

  return {
    bloklar: sonucBloklari,
    bilinmeyenler: bilinmeyenListe,
    bilinmeyenToplamAdet: bilinmeyenListe.reduce((t, b) => t + b.adet, 0),
  };
}
