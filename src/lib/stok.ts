import { prisma, type IslemIstemcisi } from "@/lib/prisma";

import type { Currency } from "@/generated/prisma/enums";
import { gunDegeri, isTakvimGunu } from "@/lib/donem";

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

/**
 * STOK SÜZGECİ (kullanıcı isteği 07.10.2026: «stok olmayan ürünleri gösterme
 * butonu olsun»). Adres değeri `stok=var`; başka her değer = süzgeç yok.
 */
export const STOK_PARAMETRESI = "stok";
export function stokSuzgeciCoz(ham: string | undefined): boolean {
  return ham === "var";
}

/**
 * Toplam stoğu > 0 olan ürünler — SAF. Ölçü listedeki «Toplam stok» sütunuyla
 * AYNI: ürünün bütün varyantlarının defter toplamı (`urunStoklari`). Varyant
 * düzeyinde süzülseydi eksi stoklu bir varyant artı stoklu kardeşini sıfırlayan
 * ürünü «stokta» sayardı ve sayı ile sütun ayrışırdı.
 */
export function stokluUrunleriSec(
  varyantToplamlari: readonly { variantId: string; toplam: number }[],
  varyantUrunu: ReadonlyMap<string, string>,
): string[] {
  const urunToplami = new Map<string, number>();
  for (const v of varyantToplamlari) {
    const urunId = varyantUrunu.get(v.variantId);
    if (!urunId) continue;
    urunToplami.set(urunId, (urunToplami.get(urunId) ?? 0) + v.toplam);
  }
  return [...urunToplami].filter(([, t]) => t > 0).map(([id]) => id);
}

/** Toplam stoğu > 0 olan ürünlerin kimlikleri (liste + Excel aynı gövdeden). */
export async function stokluUrunIdleri(): Promise<string[]> {
  const gruplar = await prisma.stockMovement.groupBy({ by: ["variantId"], _sum: { quantityDelta: true } });
  const varyantlar = await prisma.productVariant.findMany({
    where: { id: { in: gruplar.map((g) => g.variantId) } },
    select: { id: true, productId: true },
  });
  return stokluUrunleriSec(
    gruplar.map((g) => ({ variantId: g.variantId, toplam: g._sum.quantityDelta ?? 0 })),
    new Map(varyantlar.map((v) => [v.id, v.productId])),
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
  sinir?: Date,
): Promise<Parti[]> {
  return (await acikPartilerToplu(db, [variantId], sinir)).get(variantId) ?? [];
}

/**
 * ============================================================================
 *  FIFO SINIRI — BİR OLAYIN GÜNÜNÜN SONU
 * ----------------------------------------------------------------------------
 *  ⛔ CANLI ARIZA 29.08.2026: 27.07.2025 tarihli bir satış, 13.08.2026
 *  tarihli bir partiyi tüketti. Gerçek stok kilitlendi, ekran 0 gösterdi,
 *  yeni sipariş KAYDEDİLEMEDİ. Kapsam ölçüldü: 809 bağ · 181 varyant.
 *
 *  ⭐ VE SINIRIN YÖNÜ ÖLÇÜLMEDEN SEÇİLMEDİ. İlk akla gelen `sinir = soldAt`
 *  idi — "satıştan önce alınmış parti" makul görünüyor. Ölçüm çürüttü:
 *
 *      partiye bağlı çıkış 5928
 *      parti ÖNCE   2506  %42,27
 *      parti AYNI AN 2888  %48,72   ← `soldAt` + `lt` BUNLARI KİLİTLERDİ
 *
 *  Aynı gün alıp aynı gün satmak KENAR DURUM DEĞİL, olağan iştir. O yüzden
 *  sınır GÜNÜN SONUDUR: olayın ertesi günü 00:00. Süzgeç operatörü (`lt`)
 *  DEĞİŞMEZ — değişen yalnız sınır DEĞERİdir.
 *
 *  ⚠ GÜN SINIRI İSTANBUL GÜNÜNE GÖRE (anayasa): `soldAt` ve kardeşleri
 *  zaten İstanbul gününün UTC gece yarısı damgası; +1 gün eklemek yeter.
 * ============================================================================
 */
export function gunSonu(an: Date): Date {
  const d = new Date(an);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * ============================================================================
 *  AKTARILAN SİPARİŞ — FIFO SINIRI SİSTEME DÜŞTÜĞÜ GÜNE KAYAR (K314)
 * ----------------------------------------------------------------------------
 *  Kullanıcı bulgusu 02.10.2026, HB 4622097086: müşteri 23.09'da BAŞKA bir
 *  mağazadan aldı, o mağaza gönderemedi, pazaryeri siparişi bize aktardı.
 *  Kanal siparişi kendi tarihiyle (23.09) veriyor; sisteme 02.10'da düştü.
 *  Stok 28.09'da girmişti ve `gunSonu(soldAt)` onu göremedi → «0/1».
 *  Mal BUGÜNKÜ stoktan gönderilir; Entegra da öyle düşüyor, tarihi 23.09'da
 *  bırakıyor. Satış tarihi DEĞİŞMEZ (kanalın etiketi; hakediş ona bağlı) —
 *  yalnız partinin arandığı sınır kayar.
 *
 *  ⭐ ÖLÇÜT VERİDEN, EŞİK GEDİKTEN (ölçüldü 02.10.2026, 08.09'dan beri 348
 *  satış): kayıt − satış farkı p50 0 · p99 0,10 gün · tek aykırı 9,30 gün
 *  (bu sipariş). Gövde 2,4 saatte bitiyor, eşik gedikte: **1 gün**.
 *
 *  ⛔ YALNIZ KANAL ÇEKİMİ — Excel/elle girilen satışta `createdAt` olayı
 *  anlatmaz (03.09'da 7.160 eski satış toplu aktarıldı; sınır kaysaydı
 *  29.08 arızası geri gelirdi).
 *  ⛔ KANALIN İLK ÇEKİM GÜNÜ HARİÇ — bağlantı kurulduğu gün geçmiş siparişler
 *  toplu çekildi (ölçüldü: TY 26.08 → 438, HB 07.09 → 2; hepsi o tek günde).
 *  Onlar o gün gönderilmedi. İlk çekim günü VERİDEN okunur (`_min.createdAt`),
 *  tarih gömülmez.
 *  ⚠ BEDELİ BEYAN: ileride aynı kaynak geçmişi YENİDEN toplu çekerse o
 *  satırlar «aktarılan» sayılır. O gün bu ölçüt yeniden kurulur.
 * ============================================================================
 */
export const KANAL_CEKIM_KAYNAKLARI: readonly string[] = [
  "enumerasyon",
  "hb-enumerasyon",
  "n11-enumerasyon",
];

/** Kayıt − satış farkı bunu aşarsa aktarılmış sayılır (gedik ölçümü yukarıda). */
export const AKTARIM_ESIGI_MS = 24 * 60 * 60 * 1000;

export type SinirSatisi = {
  soldAt: Date;
  createdAt: Date;
  importKaynak: string | null;
};

/** İş saat dilimindeki günün sonu (ertesi gün 00:00, UTC damgası). */
function isGunuSonu(an: Date): Date {
  return gunSonu(gunDegeri(isTakvimGunu(an)));
}

/**
 * SAF — aktarılan sipariş mi. `ilkCekimAni`: o kaynağın sistemdeki ilk kaydı
 * (bilinmiyorsa null → aktarılmış SAYILMAZ; eski davranış güvenli taraftır).
 */
export function aktarilanSiparisMi(
  s: SinirSatisi,
  ilkCekimAni: Date | null,
): boolean {
  if (s.importKaynak === null || !KANAL_CEKIM_KAYNAKLARI.includes(s.importKaynak)) {
    return false;
  }
  if (ilkCekimAni === null) return false;
  if (isGunuSonu(s.createdAt).getTime() <= isGunuSonu(ilkCekimAni).getTime()) {
    return false;
  }
  return s.createdAt.getTime() - s.soldAt.getTime() > AKTARIM_ESIGI_MS;
}

/**
 * MEVCUT BİR SATIŞIN STOK ZAMANI.
 *
 * · `sinir` — partinin arandığı üst sınır (`occurredAt < sinir`).
 * · `hareketTarihi` — yazılacak stok hareketinin İŞ TARİHİ. Aktarılan
 *   siparişte mal bugün çıkar; hareketi 23.09'a yazmak defterde «28.09'da
 *   giren mal 23.09'da çıktı» demek olurdu (geçmiş günün stoğu −1) ve sayım
 *   koruması yanlış güne bakardı. Satışın KENDİ tarihi (`soldAt`) değişmez.
 */
export type SatisStokZamani = {
  aktarilan: boolean;
  sinir: Date;
  hareketTarihi: Date;
};

/** SAF. */
export function satisStokZamaniHesapla(
  s: SinirSatisi,
  ilkCekimAni: Date | null,
): SatisStokZamani {
  const aktarilan = aktarilanSiparisMi(s, ilkCekimAni);
  return aktarilan
    ? { aktarilan, sinir: isGunuSonu(s.createdAt), hareketTarihi: s.createdAt }
    : { aktarilan, sinir: gunSonu(s.soldAt), hareketTarihi: s.soldAt };
}

/** Kaynağın ilk çekim anı — veriden. */
export async function ilkCekimAni(
  db: IslemIstemcisi,
  importKaynak: string | null,
): Promise<Date | null> {
  if (importKaynak === null || !KANAL_CEKIM_KAYNAKLARI.includes(importKaynak)) {
    return null;
  }
  const r = await db.sale.aggregate({
    where: { importKaynak },
    _min: { createdAt: true },
  });
  return r._min.createdAt;
}

/**
 * Bütün kanal çekim kaynaklarının ilk çekim anı — TEK sorguda. Liste
 * ekranları «aktarılan sipariş» rozetini satır başına sorgu açmadan bunla
 * kurar: `aktarilanSiparisMi(satis, harita.get(satis.importKaynak) ?? null)`.
 */
export async function ilkCekimAnlari(db: IslemIstemcisi): Promise<Map<string, Date>> {
  const satirlar = await db.sale.groupBy({
    by: ["importKaynak"],
    where: { importKaynak: { in: [...KANAL_CEKIM_KAYNAKLARI] } },
    _min: { createdAt: true },
  });
  const harita = new Map<string, Date>();
  for (const s of satirlar) {
    if (s.importKaynak !== null && s._min.createdAt !== null) {
      harita.set(s.importKaynak, s._min.createdAt);
    }
  }
  return harita;
}

/**
 * Onay, onay önizlemesi, otomatik onay ve adet düzenleme BURADAN okur.
 * Yeni satış girişi (`satis.ts`) `gunSonu`nu kullanmaya devam eder: elle
 * girilen satışta aktarım yoktur.
 */
export async function satisStokZamani(
  db: IslemIstemcisi,
  s: SinirSatisi,
): Promise<SatisStokZamani> {
  return satisStokZamaniHesapla(s, await ilkCekimAni(db, s.importKaynak));
}

/**
 * SINIRI BELLEKTE UYGULAR — partiler bir kez okunup taşınıyorsa.
 *
 * ⭐ NİYE VAR: toplu içe aktarma partileri **tek sorguda** okur ve tüketimi
 * koşum içinde taşır (aynı partiyi iki kaleme dağıtmamak için). Orada sınırı
 * OKUMA anında vermek imkânsızdır — her satışın tarihi başkadır. Sınır bu
 * yüzden DAĞITIM anında, bellekte uygulanır.
 *
 * ⚠ Dışarıda kalan partiler ÇAĞIRANDA durur ve tüketilmemiş olarak geri
 * konur; burada atılsalardı sonraki (daha yeni) satış onları bulamazdı.
 *
 * Ölçüt `acikPartiler` ile AYNI: `occurredAt < sinir` — sınır GÜN SONU
 * olduğu için aynı günün partisi İÇERİDEDİR.
 */
export function partileriSinirla(
  partiler: Parti[],
  sinir: Date,
): { uygun: Parti[]; disarida: Parti[] } {
  const uygun: Parti[] = [];
  const disarida: Parti[] = [];
  for (const p of partiler) {
    if (p.occurredAt < sinir) uygun.push(p);
    else disarida.push(p);
  }
  return { uygun, disarida };
}

/** Sınırlı dağıtımdan sonra partileri FIFO sırasında geri birleştirir. */
export function partileriBirlestir(kalan: Parti[], disarida: Parti[]): Parti[] {
  return [...kalan, ...disarida].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
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
 * ============================================================================
 *  SPESİFİK BELİRLEME — PARTİYİ OPERATÖR SEÇER (K110, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ YENİ DAĞITIM GÖVDESİ YAZILMADI. Seçim, `fifoDagit`e verilen listenin
 *  SIRASINI değiştirerek uygulanıyor — dağıtım kuralı tek yerde kalıyor.
 *  İkinci bir dağıtıcı yazılsaydı ikisi bir gün ayrışır ve hangisinin
 *  maliyeti yazdığı sorulamazdı.
 *
 *  ⚠ ŞEMA DEĞİŞMEDİ. Hangi partinin tüketildiği zaten `StockMovement.
 *  sourceMovementId`de duruyor (canlıda çıkışların %100'ü bağlı, ölçüldü
 *  31.08.2026). Seçimi ayrıca saklamak, aynı bilgiyi ikinci kez yazmak olurdu.
 *
 *  ── ⚠ NİYE GEREKLİ — ÖLÇÜLDÜ (canlı, 31.08.2026) ───────────────────────
 *      açık partisi olan varyant        230
 *        2+ açık partisi olan           102
 *        ...partilerin MALİYETİ FARKLI   41   ← seçim burada rakam değiştirir
 *      maliyet farkı: ortanca %2,3 · EN BÜYÜK %36 (₺3.749 → ₺5.099)
 *
 *  Aynı üründen iki fiyata alınmışsa ve pahalı olan gönderildiyse, FIFO
 *  ucuzun maliyetini yazar ve NET **olduğundan yüksek** çıkar. Muhasebede
 *  adı "spesifik belirleme"dir ve VUK'ta geçerli bir yöntemdir.
 *
 *  ── ⚠ SEÇİM YOKSA HİÇBİR ŞEY DEĞİŞMEZ ──────────────────────────────────
 *  Varsayılan FIFO'dur ve liste AYNEN döner. Bu gövde bugünkü davranışı
 *  bozarsa hata sessiz olurdu: bütün maliyetler kayar, hiçbir ekran uyarmaz.
 * ============================================================================
 */
export type PartiOncelikSonucu = {
  /** `fifoDagit`e verilecek liste — seçilen başta, kalanlar FIFO sırasında. */
  partiler: Parti[];
  /**
   * Seçim uygulandı mı.
   *
   * ⚠ BULUNAMAYAN SEÇİM SESSİZCE FIFO'YA DÜŞMEZ. Parti araya giren başka bir
   * satışla tükenmiş olabilir; o durumda operatör seçtiğini sanır, sistem
   * başka partiyi yazar ve kimse fark etmez. Çağıran bu bayrağa bakıp UYARIR
   * (İlke #5: sessiz başarısızlık yasak).
   */
  secimUygulandi: boolean;
  /**
   * Seçilen partinin kalan adedi — seçim yoksa/bulunamadıysa `null`.
   * Ekran "seçtiğin partide 2 var, 5 satıyorsun" cümlesini bundan kurar.
   */
  secilenKalan: number | null;
};

/**
 * Seçilen partiyi listenin BAŞINA alır; geri kalanların sırasına DOKUNMAZ.
 *
 * ⚠ KALANLARIN SIRASI KORUNUR ve bu bilinçli: yalnız seçilen öne alınır,
 * arkası FIFO'da kalır. Liste yeniden sıralansaydı seçim, seçilmeyen
 * partilerin de sırasını kaydırır ve seçimin kapsamadığı adet **yanlış
 * partiden** tamamlanırdı.
 *
 * ⚠ GİRDİ DİZİSİ DEĞİŞTİRİLMEZ — `fifoDagit` ile aynı söz. Çağıranlar aynı
 * listeyi birden çok kalem için kullanıyor.
 */
export function partileriOncele(
  partiler: Parti[],
  secilenHareketId: string | null,
): PartiOncelikSonucu {
  /**
   * ⚠ BOŞ DİZE DE "SEÇİM YOK" DEMEKTİR. Form alanı doldurulmadığında `""`
   * gönderiyor; onu kimlik sanan bir gövde hiçbir partiyi bulamaz ve her
   * satışta yanlışlıkla uyarı yakardı.
   */
  if (secilenHareketId === null || secilenHareketId === "") {
    return { partiler, secimUygulandi: false, secilenKalan: null };
  }

  const secilen = partiler.find((p) => p.hareketId === secilenHareketId);
  if (secilen === undefined) {
    return { partiler, secimUygulandi: false, secilenKalan: null };
  }

  return {
    partiler: [secilen, ...partiler.filter((p) => p.hareketId !== secilenHareketId)],
    secimUygulandi: true,
    secilenKalan: secilen.kalanAdet,
  };
}

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
