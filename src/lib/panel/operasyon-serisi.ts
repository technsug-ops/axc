import { gunEkle, gunMetni, type Pencere } from "@/lib/donem";

/**
 * ============================================================================
 *  GÜNLÜK OPERASYON SERİSİ — ALIM · SATIŞ · KARGO
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 21.08.2026, iki gerekçeyle:
 *    1. _"Günlük operasyonlarım bu üç kalemden oluşuyor."_
 *    2. _"Alım KDV'si ile satış KDV'si arasındaki fark o ay ödeyeceğim
 *       vergiyi belli ediyor."_
 *
 *  ⚠⚠ İKİNCİ GEREKÇE İÇİN BU GRAFİK YETMEZ — VE BUNU EKRAN DA YAZAR.
 *
 *  Ödenecek KDV = (satış KDV'si) − (alış KDV'si). Bu grafik CİRO gösterir,
 *  KDV değil. İki tutarın farkı vergiyi VERMEZ çünkü:
 *    · KDV oranı ürüne göre değişir (%1 · %10 · %20; kategoriden gelir),
 *    · satışa oran SNAPSHOT'lanır (`SaleItem.vatRate`), alımda ise oran
 *      kalem üstünde ayrı yaşar,
 *    · aynı ciroda farklı oranlı ürünler bambaşka KDV üretir.
 *
 *  Yani "alım cirosu 100.000, satış cirosu 120.000 → 20.000 fark" cümlesi
 *  vergi hakkında HİÇBİR ŞEY söylemez. Grafik günlük operasyonu gösterir;
 *  KDV için ayrı bir hesap gerekir (bkz. BEKLEYENLER → KDV dengesi).
 *
 *  ── ⚠ ÜÇ SAYININ BİRİMİ AYNI DEĞİL ──────────────────────────────────────
 *  ADET görünümünde:
 *    · alım  = ALIM KAYDI sayısı (sipariş), kalem/adet değil
 *    · satış = SATIŞ KAYDI sayısı (sipariş)
 *    · kargo = KARGOYA VERİLEN paket sayısı
 *  Üçü de "kaç iş yaptım" sorusunun cevabı ve panelin üstündeki kutularla
 *  AYNI ölçüttür — ekranda iki farklı "satış adedi" olmasın diye.
 *
 *  ── ⚠ ÜÇ FARKLI TARİH EKSENİ ────────────────────────────────────────────
 *  Alım `purchasedAt`, satış satış tarihi, kargo `shippedAt` ile kovaya
 *  girer. Bunlar AYNI GÜN OLMAK ZORUNDA DEĞİL: dün satılan bugün kargolanır.
 *  Tek eksene indirgemek (hepsini satış tarihine yazmak) 15.08.2026'da
 *  yaşanmış bir hatadır — kullanıcı 6 paket kargoladı, panel "2" dedi.
 *
 *  ── AÇIK SIFIR ──────────────────────────────────────────────────────────
 *  Penceredeki HER GÜN bir nokta üretir; hareketsiz gün atlanmaz. Atlansaydı
 *  grafikte iki gün yan yana çizilir ve aradaki boşluk görünmezdi.
 * ============================================================================
 */

/** Serinin bir günü. Üç kalem, her biri adet ve tutar olarak. */
export type OperasyonGunu = {
  /** "2026-08-21" — kova anahtarı, sıralama ve test için. */
  gun: string;
  alimAdet: number;
  alimTutar: number;
  satisAdet: number;
  satisCiro: number;
  kargoAdet: number;
  /** Kargoya verilen siparişlerin cirosu — "o gün ne kadar mal çıktı". */
  kargoCiro: number;
};

export type OperasyonGirdisi = {
  pencere: Pencere;
  /** Alımlar — `purchasedAt` ile kovaya girer. */
  alimlar: { tarih: Date; tutar: number }[];
  /** Satışlar — satış tarihiyle. */
  satislar: { tarih: Date; gelir: number }[];
  /** Kargoya verilenler — `shippedAt` ile; verilmemişler LİSTEDE OLMAMALI. */
  kargolar: { tarih: Date; gelir: number }[];
};

/**
 * Pencerenin her günü için tek nokta üretir.
 *
 * ⚠ PENCERE DIŞI KAYIT SESSİZCE DÜŞMEZ — hiç gelmemeli. Çağıran zaten
 * dönemle süzülmüş liste verir; burada ikinci bir süzgeç kurmak, iki yerde
 * iki farklı "dönem" tanımı doğururdu. Yine de kovası bulunamayan kayıt
 * ATLANIR (aşağıda), yoksa tek bir kayma bütün seriyi kaydırırdı.
 */
export function operasyonSerisi(girdi: OperasyonGirdisi): OperasyonGunu[] {
  const gunler: OperasyonGunu[] = [];
  const dizin = new Map<string, OperasyonGunu>();

  for (
    let g = girdi.pencere.baslangic;
    g.getTime() < girdi.pencere.bitisHaric.getTime();
    g = gunEkle(g, 1)
  ) {
    const nokta: OperasyonGunu = {
      gun: gunMetni(g),
      alimAdet: 0,
      alimTutar: 0,
      satisAdet: 0,
      satisCiro: 0,
      kargoAdet: 0,
      kargoCiro: 0,
    };
    gunler.push(nokta);
    dizin.set(nokta.gun, nokta);
  }

  for (const a of girdi.alimlar) {
    const n = dizin.get(gunMetni(a.tarih));
    if (!n) continue;
    n.alimAdet++;
    n.alimTutar += a.tutar;
  }
  for (const s of girdi.satislar) {
    const n = dizin.get(gunMetni(s.tarih));
    if (!n) continue;
    n.satisAdet++;
    n.satisCiro += s.gelir;
  }
  for (const k of girdi.kargolar) {
    const n = dizin.get(gunMetni(k.tarih));
    if (!n) continue;
    n.kargoAdet++;
    n.kargoCiro += k.gelir;
  }

  return gunler;
}

/** Grafiğin iki görünümü — sekme adreste yaşar (İlke #13). */
export const OPERASYON_GORUNUMLERI = ["adet", "ciro"] as const;
export type OperasyonGorunumu = (typeof OPERASYON_GORUNUMLERI)[number];

export function gorunumCoz(deger: string | undefined): OperasyonGorunumu {
  return deger === "ciro" ? "ciro" : "adet";
}

/**
 * Seçili görünümün üç serisi — grafik bunu çizer.
 *
 * ⚠ TEK YERDEN: ekranın hangi alanı okuduğu burada karar verilir. İki yerde
 * seçilseydi "adet sekmesinde ciro çizen" bir hata sessizce doğabilirdi.
 */
export function serileriKur(
  gunler: OperasyonGunu[],
  gorunum: OperasyonGorunumu,
): { alim: number[]; satis: number[]; kargo: number[] } {
  return gorunum === "ciro"
    ? {
        alim: gunler.map((g) => g.alimTutar),
        satis: gunler.map((g) => g.satisCiro),
        kargo: gunler.map((g) => g.kargoCiro),
      }
    : {
        alim: gunler.map((g) => g.alimAdet),
        satis: gunler.map((g) => g.satisAdet),
        kargo: gunler.map((g) => g.kargoAdet),
      };
}

/** Dönemin toplamı — grafiğin altında yazar (İlke #15). */
export function operasyonToplami(gunler: OperasyonGunu[]): {
  alimAdet: number;
  alimTutar: number;
  satisAdet: number;
  satisCiro: number;
  kargoAdet: number;
  kargoCiro: number;
} {
  return gunler.reduce(
    (t, g) => ({
      alimAdet: t.alimAdet + g.alimAdet,
      alimTutar: t.alimTutar + g.alimTutar,
      satisAdet: t.satisAdet + g.satisAdet,
      satisCiro: t.satisCiro + g.satisCiro,
      kargoAdet: t.kargoAdet + g.kargoAdet,
      kargoCiro: t.kargoCiro + g.kargoCiro,
    }),
    {
      alimAdet: 0,
      alimTutar: 0,
      satisAdet: 0,
      satisCiro: 0,
      kargoAdet: 0,
      kargoCiro: 0,
    },
  );
}
