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
  /**
   * PARTİNİN ENVANTERE GİRİŞ TARİHİ (`occurredAt`).
   *
   * ⚠ NİYE LAZIM (kullanıcı isteği 21.08.2026): "bu para ne zamandır
   * depoda duruyor" sorusu, "ne kadar duruyor" sorusundan farklı ve
   * sıralama ondan yapılıyor.
   */
  girisTarihi: Date;
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
  /**
   * EN ESKİ AÇIK PARTİNİN tarihi — "bu mal ne zamandır burada".
   *
   * ⚠ EN YENİ DEĞİL EN ESKİ: bir varyantın üç partisi varsa parayı en uzun
   * bekleten en eskisidir. En yeniyi yazsaydık, aylardır duran mal dün
   * gelmiş gibi görünürdü.
   *
   * ⚠ YALNIZ MALİYETİ BİLİNEN partilerden: değeri bilinmeyen parti bu
   * satıra hiç girmiyor, tarihi de girmemeli.
   */
  girisTarihi: Date | null;
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
          girisTarihi: null,
        };
        satirlar.set(girdi.variantId, satir);
      }

      const tutar = birim * parti.kalanAdet;
      satir.adet += parti.kalanAdet;
      satir.odenen += tutar;
      /** EN ESKİ kazanır — parayı en uzun bekleten parti hangisiyse o. */
      if (
        satir.girisTarihi === null ||
        parti.girisTarihi.getTime() < satir.girisTarihi.getTime()
      ) {
        satir.girisTarihi = parti.girisTarihi;
      }
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

/**
 * ============================================================================
 *  ENVANTER SIRALAMASI — SAF
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026: _"ürün değerine göre ve envantere giriş
 *  sırasına göre sıralama olabilir"_.
 *
 *  ⚠ SIRA BİLEŞENDE DEĞİL BURADA: ekranla Excel aynı sırayı göstermeli.
 *  İki yerde iki sıralama olsaydı indirilen dosya ekrandakinden farklı
 *  sırada çıkardı (İlke #10).
 * ============================================================================
 */
export const ENVANTER_SIRALARI = ["deger", "eski", "yeni"] as const;
export type EnvanterSiralamasi = (typeof ENVANTER_SIRALARI)[number];

export function siralamaCoz(deger: string | undefined): EnvanterSiralamasi {
  return (ENVANTER_SIRALARI as readonly string[]).includes(deger ?? "")
    ? (deger as EnvanterSiralamasi)
    : "deger";
}

/**
 * ⚠ TARİHSİZ SATIR SONA — hükümsüz veri listeyi başa tıkamamalı. Tarihi
 * olmayan satır "en eski" de değildir "en yeni" de; ikisinde de sona
 * konuyor ve bu bilinçli.
 */
export function envanterSirala(
  satirlar: EnvanterSatiri[],
  sira: EnvanterSiralamasi,
): EnvanterSatiri[] {
  const kopya = [...satirlar];
  if (sira === "deger") return kopya.sort((a, b) => b.odenen - a.odenen);

  const yon = sira === "eski" ? 1 : -1;
  return kopya.sort((a, b) => {
    if (a.girisTarihi === null && b.girisTarihi === null) return 0;
    if (a.girisTarihi === null) return 1;
    if (b.girisTarihi === null) return -1;
    return yon * (a.girisTarihi.getTime() - b.girisTarihi.getTime());
  });
}

/**
 * ARAMA — ad · SKU · firma SKU · barkod.
 *
 * ⚠ KİMLİK DIŞARIDAN GELİR: `EnvanterSatiri` yalnız `variantId` taşıyor;
 * aranacak metinleri çağıran veriyor. Bu işlev veritabanı bilmez.
 * ⚠ Türkçe harf duyarsızlığı için `toLocaleLowerCase("tr")` — "İ" ve "ı"
 * aksi hâlde eşleşmez ve kullanıcı kendi ürününü bulamaz.
 */
export function envanterAra(
  satirlar: EnvanterSatiri[],
  arama: string,
  metin: (variantId: string) => string,
): EnvanterSatiri[] {
  const q = arama.trim().toLocaleLowerCase("tr");
  if (q === "") return satirlar;
  return satirlar.filter((s) =>
    metin(s.variantId).toLocaleLowerCase("tr").includes(q),
  );
}
