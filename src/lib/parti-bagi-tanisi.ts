/**
 * ============================================================================
 *  PARTİ BAĞI TANISI — BİR VARYANTIN GEÇMİŞİ SAĞLAM MI (K91, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE VAR: canlıda 803 çıkış, İŞ TARİHİNDEN SONRAKİ bir partiye bağlı.
 *  Bu bağ, partinin KALAN ADEDİNİ bozuyor — ve `acikPartiler` gövdesini
 *  bütün sistem kullanıyor (FIFO dağıtımı, maliyet, K110 parti seçicisi).
 *  Ölçüldü: bugün stoğu olan 231 varyantın **54'ü** etkilenmiş, **24'ünde**
 *  2+ açık parti var — yani seçici orada YANLIŞ kalan adet gösteriyor.
 *
 *  ⚠ EKRAN SUSMAZ AMA UYDURMA KESİNLİK DE VERMEZ. Kullanıcı şartı:
 *  b ve c sınıfları AYRI metin alır, "uydurma kesinlik yok".
 *
 *  ── ⭐ ÜÇ SINIF, ÜÇ AYRI CÜMLE ────────────────────────────────────────
 *    TEMIZ  — imza yok, hiçbir şey yazılmaz
 *    KAYMIS — (b) aynı damgalı birden çok aday var; kalan adet partiler
 *             ARASINDA kaymış olabilir, ama MALİYET ETKİLENMEZ (damga
 *             doğru partiden geliyor; ölçüldü: 779 vakada damga bağlı
 *             partiden farklı ve damga DOĞRU olan)
 *    SUPHELI— (c) hiç aday yok; bağlar doğrulanamıyor, kalan adetler
 *             şüpheli
 *
 *  ⚠ `SUPHELI` DAHA AĞIR OLDUĞU İÇİN ÖNCE GELİR: bir varyantta hem b hem c
 *  vakası olabilir; ikisini birden yazmak yerine ağır olan söylenir.
 *
 *  ── ⚠ SAF: veritabanına gitmez ────────────────────────────────────────
 *  Bir varyantın hareketleri ÇAĞIRANDAN gelir. Bekçi gövdeyi çağırıp
 *  DEĞERİNİ ölçüyor; kaynak taramaya gerek yok.
 * ============================================================================
 */

export type BagHareketi = {
  id: string;
  /** İş tarihi — sıralama ve "o an açık mıydı" bunun üstünden. */
  occurredAt: Date;
  /** Eşitlikte ikinci ölçüt; olmazsa sıra veritabanının keyfine kalır. */
  createdAt: Date;
  quantityDelta: number;
  /** Decimal dizesi; bilinmiyorsa `null`. */
  unitCostAmount: string | null;
  sourceMovementId: string | null;
};

export type BagTanisi = "TEMIZ" | "KAYMIS" | "SUPHELI";

/** Kuruşa — `Decimal`→float kuyruğu sahte fark üretmesin. */
function kurus(x: string | null): string | null {
  if (x === null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

/**
 * Bir varyantın parti bağlarını yeniden oynatır ve tanı koyar.
 *
 * ⚠ SİMÜLASYON MEVCUT BAĞI TÜKETİR, ÖNERİLENİ DEĞİL — amaç bugünkü
 * defterin GERÇEK hâlini üretmek. Öneriyi tüketseydik var olmayan bir
 * defteri ölçerdik.
 *
 * ⚠ VE BU YÜZDEN `SUPHELI` KİRLENEBİLİR: mevcut bağlar kısmen yanlışsa,
 * "o an açıktı" görüşü aynı hatayı miras alır. Bu bir kusur değil, ölçümün
 * SINIRI — ve ekranda "şüpheli" denmesinin sebebi tam da bu.
 */
export function partiBagiTanisi(hareketler: readonly BagHareketi[]): BagTanisi {
  const sirali = [...hareketler].sort(
    (a, b) =>
      a.occurredAt.getTime() - b.occurredAt.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const kalan = new Map<string, number>();
  const maliyet = new Map<string, string | null>();
  let kaymis = false;

  for (const h of sirali) {
    if (h.quantityDelta > 0) {
      kalan.set(h.id, h.quantityDelta);
      maliyet.set(h.id, kurus(h.unitCostAmount));
      continue;
    }
    if (h.quantityDelta === 0) continue;
    if (h.sourceMovementId === null) continue;

    const damga = kurus(h.unitCostAmount);
    if (damga !== null) {
      let aday = 0;
      for (const [pid, k] of kalan) {
        if (k > 0 && maliyet.get(pid) === damga) aday += 1;
      }
      /**
       * ⛔ HİÇ ADAY YOKSA EN AĞIR TANI — ve hemen dönülüyor. Daha
       * hafif bir tanıyla üstünü örtmek, kullanıcıya olmayan bir güven
       * verirdi.
       */
      if (aday === 0) return "SUPHELI";
      if (aday > 1) kaymis = true;
    }

    const k = kalan.get(h.sourceMovementId) ?? 0;
    kalan.set(h.sourceMovementId, k - adetDus(h));
  }

  return kaymis ? "KAYMIS" : "TEMIZ";
}

function adetDus(h: BagHareketi): number {
  return -h.quantityDelta;
}

/**
 * "İleri parti yiyen" İMZASI — çıkışın iş tarihi, tükettiği partinin
 * tarihinden ÖNCE.
 *
 * ⚠ TANIDAN AYRI TUTULUYOR ve bu bilinçli: imza KESİN bir kusurdur (bir
 * satış, henüz gelmemiş bir maldan çıkamaz), tanı ise ÇÖZÜLEBİLİRLİK
 * hakkında. Bir varyantta imza olmadan da tanı `KAYMIS` çıkabilir.
 */
export function ileriPartiImzasi(hareketler: readonly BagHareketi[]): boolean {
  const tarih = new Map<string, Date>();
  for (const h of hareketler) if (h.quantityDelta > 0) tarih.set(h.id, h.occurredAt);
  for (const h of hareketler) {
    if (h.quantityDelta >= 0 || h.sourceMovementId === null) continue;
    const p = tarih.get(h.sourceMovementId);
    if (p !== undefined && p > h.occurredAt) return true;
  }
  return false;
}
