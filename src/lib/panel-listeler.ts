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
  /**
   * KÂRI HESAPLANABİLMİŞ kalemlerin cirosu ve adedi — MARJIN PAYDASI.
   *
   * Neden ayrı tutuluyor: marj = NET-2 / ciro. Pay yalnız hesaplanabilmiş
   * kalemlerden gelirken payda TÜM kalemlerden gelseydi marj olduğundan
   * DÜŞÜK çıkardı ve kullanıcı sağlam bir ürünü "zayıf marjlı" sanardı.
   * Pay ve payda aynı kalem kümesinden okunur.
   */
  hesaplananCiro: number;
  hesaplananAdet: number;
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
        hesaplananCiro: 0,
        hesaplananAdet: 0,
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
      satir.hesaplananCiro += k.ciro;
      satir.hesaplananAdet += k.adet;
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

/**
 * ---------------------------------------------------------------------------
 *  KÂR MARJI — HACİMDEN BAĞIMSIZ VERİMLİLİK ÖLÇÜSÜ
 * ---------------------------------------------------------------------------
 *  Kullanıcı kararı 14.08.2026: "En çok kâr edilen ürünü iki şekilde
 *  görebiliriz: 1) 3 tane satmış, o yüzden en yüksek kârı ondan etmiş.
 *  2) Ürünün kâr marjı diğerlerinden üstün. İkisini de ayrı ayrı görmek
 *  istiyorum."
 *
 *  İki liste iki AYRI soruyu cevaplar ve biri diğerinin yerine geçmez:
 *    toplam kâr → "bu ay parayı hangi ürün getirdi?"   (hacim × verim)
 *    marj       → "hangi ürün daha verimli satıyor?"    (hacimden bağımsız)
 *  3 adet satıp 1.234 ₺ kazandıran ürün TOPLAMDA birincidir; 1 adet satıp
 *  %31 marj bırakan ürün MARJDA birinci olabilir. İkisi karıştığında yanlış
 *  ürüne stok yapılır.
 *
 *  PAYDA "KDV DAHİL SATIŞ TUTARI" — yani pazaryerinde YAZAN fiyat. Sebebi:
 *  kullanıcı fiyatı o rakam üzerinden koyuyor, "100 liralık maldan kaç lira
 *  kalıyor" diye düşünüyor. KDV hariç paydaya geçilirse marj yüzdesi yukarı
 *  fırlar ve satış fiyatıyla kıyaslanamaz hâle gelir.
 *
 *  ⚠ MARJ TEK BAŞINA BAKILDIĞINDA YANILTIR: tek adet satılmış küçük bir
 *  ürün yüksek yüzdeyle listenin başına çıkabilir. Bu yüzden ekran marjın
 *  yanında ADEDİ ve TOPLAM KÂRI de yazar; sıralama gizli bir eşikle
 *  budanmaz (sessiz filtre yasak).
 * ---------------------------------------------------------------------------
 */

/**
 * Kâr marjı yüzdesi (12.5 = %12,5). Hesaplanamıyorsa null:
 *   - kârı hesaplanabilmiş kalem yoksa
 *   - hesaplanan ciro sıfır ya da negatifse (sıfıra bölme / anlamsız oran)
 */
export function marjYuzdesi(satir: UrunSatiri): number | null {
  if (satir.kalemSayisi === satir.hesaplanamayanKalem) return null;
  if (satir.hesaplananCiro <= 0) return null;
  return (satir.net2 / satir.hesaplananCiro) * 100;
}

/** Adet başına NET-2 kâr. Hesaplanan adet yoksa null. */
export function birimKar(satir: UrunSatiri): number | null {
  if (satir.hesaplananAdet <= 0) return null;
  return satir.net2 / satir.hesaplananAdet;
}

/**
 * Marja göre sıralama. Marjı hesaplanamayan ürün listeye GİRMEZ — sıfır
 * sayılıp "en düşük marjlı" gibi görünmesi, olmayan bir bulguyu gerçek gibi
 * göstermek olurdu (toplam kâr listesindeki kuralın aynısı).
 */
export function marjSiralamasi(
  satirlar: UrunSatiri[],
  yon: "en-cok" | "en-az",
  kac: number,
): UrunSatiri[] {
  const marjli = satirlar
    .map((s) => ({ s, marj: marjYuzdesi(s) }))
    .filter((x): x is { s: UrunSatiri; marj: number } => x.marj !== null);

  marjli.sort((a, b) =>
    yon === "en-cok"
      ? b.marj - a.marj || b.s.net2 - a.s.net2
      : a.marj - b.marj || a.s.net2 - b.s.net2,
  );
  // Eşit marjda parası büyük olan üstte: ikinci ölçüt hep toplam kâr.
  return marjli.slice(0, kac).map((x) => x.s);
}

/**
 * ---------------------------------------------------------------------------
 *  MARJ RENGİ — EŞİK UYDURULMAZ, DÖNEMİN KENDİ ORTALAMASI ÖLÇÜTTÜR
 * ---------------------------------------------------------------------------
 *  14.08.2026, kullanıcı uyarısı: "renk eşiği sessiz varsayım olmasın —
 *  kaçın altı kırmızı, kaçın üstü yeşil, o eşik nereden geliyor?"
 *
 *  Haklı bir uyarı. "%5'in altı kötüdür" demek, hiçbir yere dayanmayan bir
 *  sayıyı sisteme gömmek olurdu; sektöre, ürüne ve kanala göre değişir ve
 *  yanlış olduğu gün kimse fark etmez.
 *
 *  ÖLÇÜT DÖNEMİN KENDİSİ: bir ürünün marjı, o dönemde yapılan TÜM satışın
 *  ortalama marjıyla karşılaştırılır. "Ortalamanın altında" cümlesi
 *  kanıtlanabilir; "%5'in altında" cümlesi değil. Ortalama ekranda YAZAR,
 *  böylece rengin nereden geldiği görünür.
 *
 *  ÜÇ DURUM, ÜÇÜ DE AÇIK:
 *    zarar     — marj negatif: ürün para kaybettiriyor
 *    zayif     — ortalamanın altında
 *    guclu     — ortalama ve üstü
 */
export type MarjDurumu = "zarar" | "zayif" | "guclu";

export function donemOrtalamaMarji(satirlar: UrunSatiri[]): number | null {
  let ciro = 0;
  let net2 = 0;
  for (const s of satirlar) {
    if (s.kalemSayisi === s.hesaplanamayanKalem) continue;
    ciro += s.hesaplananCiro;
    net2 += s.net2;
  }
  if (ciro <= 0) return null;
  return (net2 / ciro) * 100;
}

export function marjDurumu(
  marj: number | null,
  ortalama: number | null,
): MarjDurumu | null {
  if (marj === null) return null;
  if (marj < 0) return "zarar";
  // Ortalama hesaplanamıyorsa karşılaştıracak bir şey yok: nötr sayılır.
  if (ortalama === null) return "guclu";
  return marj < ortalama ? "zayif" : "guclu";
}
