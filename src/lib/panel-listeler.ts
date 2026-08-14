import type { KarDurumu } from "@/lib/kar";

/**
 * ============================================================================
 *  PANEL LİSTELERİ — EN ÇOK SATILAN / EN ÇOK KÂR / EN AZ KÂR (SAF HESAP)
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 14.08.2026: "bir nevi business intelligence olarak bana
 *  destek ol." Bu modül o listelerin hesabı; ekran yalnız çiziyor.
 *
 *  KÂR RAKAMI KALEM SNAPSHOT'INDAN OKUNUR (`SaleItem.net1/net2`), burada
 *  hiçbir kâr yeniden hesaplanmaz — panelin ve raporun ilkesi aynı.
 *
 *  ⚠ HESAPLANAMAYAN KÂR SIFIR SAYILMAZ. Kalemin durumu CALCULATED değilse
 *  NET'i toplama GİRMEZ; ayrıca sayılır ve ekranda yazılır. Sıfır saymak
 *  "en az kâr bırakan" listesinin başına, kârı bilinmeyen ürünleri
 *  koymak olurdu — en yanıltıcı sıralama bu olurdu.
 *
 *  ⚠ PARA BİRİMLERİ KARIŞMAZ. Çağıran taraf tek para biriminin satırlarını
 *  verir; TRY ile EUR aynı sıralamada buluşmaz (kur çevirisi yasak).
 *
 *  Veritabanına GİTMEZ; `panel:dogrula` bunu veri olmadan sınıyor.
 * ============================================================================
 */

/** Panelin bir satış KALEMİNDEN ihtiyaç duyduğu her şey. */
export type KalemGirdisi = {
  variantId: string;
  urunAdi: string;
  sku: string;
  adet: number;
  /** KDV dahil satış tutarı (kalemin tamamı). */
  ciro: number;
  net1: number | null;
  net2: number | null;
  durum: KarDurumu | null;
};

export type UrunSatiri = {
  variantId: string;
  urunAdi: string;
  sku: string;
  adet: number;
  ciro: number;
  /** Yalnız kârı HESAPLANABİLMİŞ kalemlerin toplamı. */
  net1: number;
  net2: number;
  /** Kârı hesaplanamayan kalem sayısı — ekranda yazılır, gizlenmez. */
  hesaplanamayanKalem: number;
  /** Kaç satış kaleminden geldi (aynı ürün birden çok satışta olabilir). */
  kalemSayisi: number;
};

function hesaplandi(durum: KarDurumu | null, net: number | null): net is number {
  return durum === "CALCULATED" && net !== null;
}

/** Kalemleri VARYANT bazında toplar. Ürün adı ilk görülenden alınır. */
export function urunlereTopla(kalemler: KalemGirdisi[]): UrunSatiri[] {
  const harita = new Map<string, UrunSatiri>();

  for (const k of kalemler) {
    let satir = harita.get(k.variantId);
    if (!satir) {
      satir = {
        variantId: k.variantId,
        urunAdi: k.urunAdi,
        sku: k.sku,
        adet: 0,
        ciro: 0,
        net1: 0,
        net2: 0,
        hesaplanamayanKalem: 0,
        kalemSayisi: 0,
      };
      harita.set(k.variantId, satir);
    }

    satir.adet += k.adet;
    satir.ciro += k.ciro;
    satir.kalemSayisi++;

    if (hesaplandi(k.durum, k.net2)) {
      satir.net2 += k.net2;
      // NET-1 aynı durum bayrağına bağlı: ikisi aynı hesaptan doğuyor.
      if (k.net1 !== null) satir.net1 += k.net1;
    } else {
      satir.hesaplanamayanKalem++;
    }
  }

  return [...harita.values()];
}

/** En çok satılan — ADET'e göre. Eşitlikte cirosu büyük olan üstte. */
export function enCokSatilan(satirlar: UrunSatiri[], kac: number): UrunSatiri[] {
  return [...satirlar]
    .sort((a, b) => (b.adet !== a.adet ? b.adet - a.adet : b.ciro - a.ciro))
    .slice(0, kac);
}

/**
 * EN ÇOK / EN AZ KÂR — NET-2'ye göre.
 *
 * KÂRI HİÇ HESAPLANAMAMIŞ ÜRÜN İKİ LİSTEYE DE GİRMEZ (tüm kalemleri
 * hesaplanamayan olanlar). Sıfır kâr sanılıp "en az kâr bırakan"ın başına
 * oturması, olmayan bir bulguyu gerçek gibi göstermek olurdu; o ürünler
 * ayrı sayılır ve ekranda "kârı hesaplanamayan N ürün" diye yazılır.
 */
export function karSiralamasi(
  satirlar: UrunSatiri[],
  yon: "en-cok" | "en-az",
  kac: number,
): UrunSatiri[] {
  const karlilar = satirlar.filter((s) => s.kalemSayisi > s.hesaplanamayanKalem);
  const sirali = [...karlilar].sort((a, b) =>
    yon === "en-cok" ? b.net2 - a.net2 : a.net2 - b.net2,
  );
  return sirali.slice(0, kac);
}

/** Kârı hiç hesaplanamamış ürün sayısı — listelerin dışında kalanlar. */
export function karsizUrunSayisi(satirlar: UrunSatiri[]): number {
  return satirlar.filter((s) => s.kalemSayisi === s.hesaplanamayanKalem).length;
}
