import { prisma, type IslemIstemcisi } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  STOK MATEMATİĞİ — TEK KAYNAK
 * ----------------------------------------------------------------------------
 *  Stokla ilgili HER hesap burada yapılır. Ekranlar kendi groupBy sorgusunu
 *  yazmaz; böylece "stok nasıl hesaplanıyor" sorusunun tek bir cevabı olur.
 *
 *  TEMEL KURAL (CLAUDE.md): Varyantta "mevcut stok" kolonu yoktur.
 *  Stok = StockMovement.quantityDelta toplamıdır. Aynı şekilde bir alım
 *  kaleminin "teslim alınan sağlam" adedi de kolon değil, o kaleme ait
 *  PURCHASE_IN hareketlerinin toplamıdır.
 * ============================================================================
 */

/** Verilen varyantların güncel stoğu. Hareketi olmayan varyant haritada yer almaz. */
export async function varyantStoklari(
  varyantIdleri: string[],
): Promise<Map<string, number>> {
  if (varyantIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: varyantIdleri } },
    _sum: { quantityDelta: true },
  });

  return new Map(
    gruplar.map((g) => [g.variantId, g._sum.quantityDelta ?? 0]),
  );
}

/** Tek varyantın güncel stoğu. */
export async function varyantStogu(varyantId: string): Promise<number> {
  const sonuc = await prisma.stockMovement.aggregate({
    where: { variantId: varyantId },
    _sum: { quantityDelta: true },
  });
  return sonuc._sum.quantityDelta ?? 0;
}

/**
 * Ürün bazında toplam stok (varyantlarının toplamı).
 * Varyant listesi çağıran taraftan gelir; ek sorgu yapılmaz.
 */
export async function urunStoklari(
  urunler: { id: string; variants: { id: string }[] }[],
): Promise<Map<string, number>> {
  const varyantIdleri = urunler.flatMap((u) => u.variants.map((v) => v.id));
  const stoklar = await varyantStoklari(varyantIdleri);

  const sonuc = new Map<string, number>();
  for (const urun of urunler) {
    sonuc.set(
      urun.id,
      urun.variants.reduce((toplam, v) => toplam + (stoklar.get(v.id) ?? 0), 0),
    );
  }
  return sonuc;
}

/**
 * Alım kalemi başına TESLİM ALINAN SAĞLAM adet.
 * Ledger'dan türetilir — PurchaseItem'da böyle bir kolon bilerek yoktur.
 */
export async function kalemTeslimAlinanlar(
  kalemIdleri: string[],
): Promise<Map<string, number>> {
  if (kalemIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["purchaseItemId"],
    where: { purchaseItemId: { in: kalemIdleri }, type: "PURCHASE_IN" },
    _sum: { quantityDelta: true },
  });

  const harita = new Map<string, number>();
  for (const grup of gruplar) {
    if (grup.purchaseItemId) {
      harita.set(grup.purchaseItemId, grup._sum.quantityDelta ?? 0);
    }
  }
  return harita;
}

/** Varyant başına son hareket tarihi (stok listesinde gösterilir). */
export async function sonHareketTarihleri(
  varyantIdleri: string[],
): Promise<Map<string, Date>> {
  if (varyantIdleri.length === 0) return new Map();

  const gruplar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    where: { variantId: { in: varyantIdleri } },
    _max: { occurredAt: true },
  });

  const harita = new Map<string, Date>();
  for (const grup of gruplar) {
    if (grup._max.occurredAt) harita.set(grup.variantId, grup._max.occurredAt);
  }
  return harita;
}

// ---------------------------------------------------------------------------
//  FIFO — PARTİLER
// ---------------------------------------------------------------------------

/**
 * Bir giriş partisi. Parti = pozitif quantityDelta'lı bir stok hareketi
 * (INITIAL, PURCHASE_IN, pozitif ADJUSTMENT/COUNT_CORRECTION).
 *
 * `kalanAdet` KOLON DEĞİLDİR — girenden, o partiyi kaynak gösteren çıkışların
 * toplamı düşülerek türetilir. Ledger tek doğruluk kaynağıdır.
 */
export type Parti = {
  hareketId: string;
  occurredAt: Date;
  girenAdet: number;
  kalanAdet: number;
  /** Decimal string olarak taşınır; float'a çevrilmez. */
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: Currency | null;
  locationId: string | null;
};

/**
 * Varyantın tüketilebilir partileri — EN ESKİ ÖNCE (FIFO sırası).
 *
 * Sadece PURCHASE_IN değil, POZİTİF olan her hareket partidir. Aksi hâlde
 * açılış stoğu (INITIAL) veya elle düzeltmeyle girilen mal "stokta görünür
 * ama satılamaz" olurdu ve negatif stok engeli yanlış yerden tetiklenirdi.
 * Maliyeti olmayan partide `birimMaliyet` null kalır.
 *
 * Transaction içinde çağrılmalıdır (satışta `tx` geçilir); yoksa okuma ile
 * yazma arasında başka bir satış araya girip aynı partiyi tüketebilir.
 */
export async function acikPartiler(
  db: IslemIstemcisi,
  variantId: string,
): Promise<Parti[]> {
  return (await acikPartilerToplu(db, [variantId])).get(variantId) ?? [];
}

/**
 * Aynı hesap, TEK SORGUDA çok varyant için.
 *
 * Envanter değeri ekranı bütün depoyu değerler; varyant başına ayrı sorgu
 * atmak yüzlerce gidiş-geliş demekti. Türetme kuralı `acikPartiler` ile
 * AYNIDIR — tek gövde, iki giriş; iki ayrı FIFO tanımı doğmasın diye.
 *
 * ── TARİHLİ FOTOĞRAF (K53, 25.08.2026) ──────────────────────────────────
 * `sinir` verilirse defter O ANA KADAR okunur: "1 Haziran açılışında elimde
 * ne vardı" sorusunun cevabı.
 *
 * ⚠ İKİNCİ BİR MOTOR AÇILMADI — kullanıcı şartı. Aynı gövde
 * PARAMETRELENDİ. İki ayrı FIFO tanımı bir gün ayrışır ve o gün hangisinin
 * doğru olduğu anlaşılmaz.
 *
 * ⚠ SÜZGEÇ İKİ SORGUYA DA UYGULANIR — VE ASIL TUZAK BU. Yalnız GİRİŞLERE
 * uygulansaydı, temmuzda tüketilmiş bir parti 1 Haziran fotoğrafında da
 * TÜKETİLMİŞ görünürdü: stok olduğundan düşük çıkar ve rakam makul
 * göründüğü için kimse fark etmezdi.
 *
 * ⚠ VE SÜZGEÇ `occurredAt`TEN — `createdAt`ten DEĞİL. Rapor "o gün ne
 * OLMUŞTU"yu kurar, "o gün sistemde ne GÖRÜNÜYORDU"yu değil. Sonradan
 * girilmiş ama iş tarihi eski olan kayıt DAHİLDİR; kayıt anına bakan bir
 * süzgeç, geç girilen her alımı fotoğrafın dışında bırakırdı.
 *
 * @param variantIdleri  null verilirse BÜTÜN varyantlar.
 * @param sinir          verilirse yalnız bu ANDAN ÖNCEKİ hareketler.
 */
export async function acikPartilerToplu(
  db: IslemIstemcisi,
  variantIdleri: string[] | null,
  sinir?: Date,
): Promise<Map<string, Parti[]>> {
  if (variantIdleri !== null && variantIdleri.length === 0) return new Map();

  /** ⚠ `lt` — seçilen günün BAŞLANGICI itibarıyla (o gün henüz yaşanmadı). */
  const tarihKosulu = sinir ? { occurredAt: { lt: sinir } } : {};

  const girisler = await db.stockMovement.findMany({
    where: {
      ...(variantIdleri === null ? {} : { variantId: { in: variantIdleri } }),
      quantityDelta: { gt: 0 },
      ...tarihKosulu,
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      locationId: true,
    },
  });

  if (girisler.length === 0) return new Map();

  /**
   * ⚠ TÜKETİMLERE DE AYNI SÜZGEÇ. Bu satır olmadan tarihli fotoğraf
   * SESSİZCE YANLIŞ olurdu: 1 Haziran'da elde duran bir parti, temmuzda
   * satıldığı için o fotoğrafta da tükenmiş görünürdü. Rakam makul çıkar,
   * kimse sorgulamaz — en pahalı hata biçimi.
   */
  const tuketimler = await db.stockMovement.groupBy({
    by: ["sourceMovementId"],
    where: {
      sourceMovementId: { in: girisler.map((g) => g.id) },
      ...tarihKosulu,
    },
    _sum: { quantityDelta: true },
  });

  // Çıkışlar negatiftir; tüketilen adet toplamın mutlak değeridir.
  const tuketilen = new Map<string, number>();
  for (const grup of tuketimler) {
    if (grup.sourceMovementId) {
      tuketilen.set(
        grup.sourceMovementId,
        Math.abs(grup._sum.quantityDelta ?? 0),
      );
    }
  }

  // Sorgu zaten FIFO sırasında geldi; gruplama sırayı BOZMAZ (Map ekleme
  // sırasını korur, dizilere de sırayla itiliyor).
  const sonuc = new Map<string, Parti[]>();
  for (const giris of girisler) {
    const kalanAdet = giris.quantityDelta - (tuketilen.get(giris.id) ?? 0);
    if (kalanAdet <= 0) continue;

    const liste = sonuc.get(giris.variantId) ?? [];
    liste.push({
      hareketId: giris.id,
      occurredAt: giris.occurredAt,
      girenAdet: giris.quantityDelta,
      kalanAdet,
      birimMaliyet: giris.unitCostAmount?.toString() ?? null,
      birimMaliyetParaBirimi: giris.unitCostCurrency,
      locationId: giris.locationId,
    });
    sonuc.set(giris.variantId, liste);
  }
  return sonuc;
}

// ---------------------------------------------------------------------------
//  SAF HESAPLAR (veritabanına gitmez)
// ---------------------------------------------------------------------------

export type FifoPayi = { parti: Parti; adet: number };

export type FifoSonucu =
  | { yeterliMi: true; dagitim: FifoPayi[]; kalanPartiler: Parti[] }
  | { yeterliMi: false; mevcut: number };

/**
 * İstenen adedi en eski partiden başlayarak dağıtır.
 *
 * Stok yetmiyorsa HİÇBİR dağıtım yapmaz, mevcut adedi bildirir — çağıran taraf
 * satışı komple reddeder. Kısmî satış diye bir şey yok.
 *
 * `kalanPartiler` döner çünkü aynı satışta aynı varyant birden fazla kalemde
 * geçebilir; ikinci kalem, birincinin tükettiği partileri tekrar tüketmemeli.
 * Girdi dizisi DEĞİŞTİRİLMEZ.
 */
export function fifoDagit(partiler: Parti[], adet: number): FifoSonucu {
  const mevcut = partiler.reduce((toplam, p) => toplam + p.kalanAdet, 0);
  if (adet > mevcut) return { yeterliMi: false, mevcut };

  const dagitim: FifoPayi[] = [];
  const kalanPartiler: Parti[] = [];
  let kalanIhtiyac = adet;

  for (const parti of partiler) {
    if (kalanIhtiyac === 0) {
      kalanPartiler.push(parti);
      continue;
    }

    const alinan = Math.min(parti.kalanAdet, kalanIhtiyac);
    dagitim.push({ parti, adet: alinan });
    kalanIhtiyac -= alinan;

    const kalan = parti.kalanAdet - alinan;
    if (kalan > 0) kalanPartiler.push({ ...parti, kalanAdet: kalan });
  }

  return { yeterliMi: true, dagitim, kalanPartiler };
}

export type KalemIlerlemesi = {
  beklenen: number;
  saglam: number;
  hasarli: number;
  /** Henüz gelmemiş adet. */
  kalan: number;
  tamamlandiMi: boolean;
};

export function kalemIlerlemesi(
  beklenen: number,
  saglam: number,
  hasarli: number,
): KalemIlerlemesi {
  const islenen = saglam + hasarli;
  return {
    beklenen,
    saglam,
    hasarli,
    kalan: Math.max(0, beklenen - islenen),
    tamamlandiMi: islenen >= beklenen,
  };
}

/**
 * Alımın durumunu kalemlerin ilerlemesinden hesaplar.
 * DRAFT ve CANCELLED buraya girmez; onlar elle yönetilen durumlardır.
 */
export function alimDurumunuHesapla(
  kalemler: { beklenen: number; saglam: number; hasarli: number }[],
): "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" {
  if (kalemler.length === 0) return "ORDERED";

  const hepsiTamam = kalemler.every(
    (k) => k.saglam + k.hasarli >= k.beklenen,
  );
  if (hepsiTamam) return "RECEIVED";

  const hicIslemYok = kalemler.every((k) => k.saglam + k.hasarli === 0);
  return hicIslemYok ? "ORDERED" : "PARTIALLY_RECEIVED";
}
