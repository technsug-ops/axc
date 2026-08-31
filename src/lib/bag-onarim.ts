/**
 * ============================================================================
 *  K91 — PARTİ BAĞI ONARIM PLANI (SAF GÖVDE, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE SAF GÖVDE: bu ölçüt İKİ yerde kullanılıyor — kuru koşum ve YAZIM.
 *  İkisi ayrı yazılsaydı biri ötekinin yazdığını göremezdi ve "kuru koşum 64
 *  dedi, yazım 61 yazdı" gibi bir ayrışma sessizce doğardı.
 *  _(Anayasa: "aynı ölçüt iki yerde kullanılır — yazımın yeniden
 *  koşulabilirlik kapısı ile geri alma kapısı AYNI ölçüde bakar".)_
 *
 *  ── ⭐ ÖLÇÜT ──────────────────────────────────────────────────────────
 *  Defter varyant varyant, İŞ TARİHİ sırasıyla yeniden oynatılır. Her çıkış
 *  için adaylar: **o an açık (kalan > 0)** ve birim maliyeti çıkışın
 *  damgasına **KURUŞUNA eşit** partiler.
 *    · aday 1 ve mevcut bağdan FARKLI → (a) YAZILACAK
 *    · aday 1 ve mevcut bağ ile AYNI  → (d) zaten doğru
 *    · aday > 1                        → (b) belirsiz, DOKUNULMAZ
 *    · aday 0                          → (c) çözülemez, DOKUNULMAZ
 *
 *  ── ⛔ SİMÜLASYON MEVCUT BAĞI TÜKETİR, ÖNERİLENİ DEĞİL ────────────────
 *  Amaç BUGÜNKÜ defterin gerçek hâlini yeniden üretmek. Öneriyi tüketseydik
 *  sonraki çıkışların aday kümesi DEĞİŞİR ve plan var olmayan bir defteri
 *  ölçerdi.
 *
 *  ── ⚠ KURUŞA YUVARLAMA TOLERANS DEĞİL, BİRİM SEÇİMİDİR ───────────────
 *  `Decimal`→float kuyruğu eşleşmeyi haksız yere düşürürdü. Para kuruşta
 *  yaşar; karşılaştırma da orada yapılır.
 * ============================================================================
 */

export type OnarimHareketi = {
  id: string;
  variantId: string;
  /** İş tarihi — sıralamanın BİRİNCİ ölçütü. */
  occurredAt: Date;
  /** Kayıt anı — aynı iş tarihinde sırayı belirler. */
  createdAt: Date;
  /** Pozitif = giriş (parti), negatif = çıkış. */
  quantityDelta: number;
  /** Decimal dize; bilinmiyorsa `null`. */
  unitCostAmount: string | null;
  /** Tüketilen parti; bağsızsa `null`. */
  sourceMovementId: string | null;
};

export type OnarimSatiri = {
  /** Düzeltilecek çıkış hareketi. */
  cikis: string;
  variantId: string;
  /** Bugünkü (yanlış) bağ. */
  eski: string;
  /** Ölçütün tek aday olarak bulduğu parti. */
  yeni: string;
  /** Çıkışın birim maliyet damgası — kuruşa yuvarlanmış. */
  damga: string;
};

export type OnarimPlani = {
  incelenen: number;
  /** (a) tek adaya çözülen ve bağı DEĞİŞEN — yazılacak küme. */
  yazilacak: OnarimSatiri[];
  /** (d) ölçüt mevcut bağı DOĞRULUYOR. */
  zatenDogru: number;
  /** (b) birden çok aday — belirsiz, dokunulmaz. */
  belirsiz: number;
  /** (c) hiç aday yok — çözülemez, dokunulmaz. */
  cozulemez: number;
  /** Damgası olmayan çıkış — ölçüte giremez. */
  damgasiz: number;
  /** Partiye hiç bağlı olmayan çıkış — kapsam dışı. */
  bagsiz: number;
};

/** ⚠ Kuruşa: `Decimal`→float kuyruğu sahte fark üretmesin. */
export function kurus(x: string | null): string | null {
  if (x === null) return null;
  const n = Number(x);
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

export function bagOnarimPlani(
  hareketler: readonly OnarimHareketi[],
): OnarimPlani {
  const varyantlar = new Map<string, OnarimHareketi[]>();
  for (const h of hareketler) {
    const l = varyantlar.get(h.variantId) ?? [];
    l.push(h);
    varyantlar.set(h.variantId, l);
  }

  const plan: OnarimPlani = {
    incelenen: hareketler.length,
    yazilacak: [],
    zatenDogru: 0,
    belirsiz: 0,
    cozulemez: 0,
    damgasiz: 0,
    bagsiz: 0,
  };

  for (const [, liste] of varyantlar) {
    /** ⚠ İŞ TARİHİ birinci, kayıt anı ikinci ölçüt. */
    const sirali = [...liste].sort(
      (x, z) =>
        x.occurredAt.getTime() - z.occurredAt.getTime() ||
        x.createdAt.getTime() - z.createdAt.getTime(),
    );

    /** Parti kimliği → o ana kadarki kalan. */
    const kalan = new Map<string, number>();
    /** Parti kimliği → kuruşa yuvarlanmış birim maliyet. */
    const maliyet = new Map<string, string | null>();

    for (const h of sirali) {
      if (h.quantityDelta > 0) {
        kalan.set(h.id, h.quantityDelta);
        maliyet.set(h.id, kurus(h.unitCostAmount));
        continue;
      }
      /** `0` delta bir hareket değildir. */
      if (h.quantityDelta === 0) continue;

      const adet = -h.quantityDelta;

      if (h.sourceMovementId === null) {
        plan.bagsiz += 1;
        continue;
      }

      const damga = kurus(h.unitCostAmount);
      if (damga === null) {
        /** ⚠ Damgası olmayan çıkış ölçüte GİREMEZ — dokunulmaz, sayılır. */
        plan.damgasiz += 1;
        kalan.set(
          h.sourceMovementId,
          (kalan.get(h.sourceMovementId) ?? 0) - adet,
        );
        continue;
      }

      const adaylar: string[] = [];
      for (const [pid, k] of kalan) {
        if (k <= 0) continue;
        if (maliyet.get(pid) !== damga) continue;
        adaylar.push(pid);
      }

      if (adaylar.length === 0) {
        plan.cozulemez += 1;
      } else if (adaylar.length > 1) {
        plan.belirsiz += 1;
      } else {
        const yeni = adaylar[0] as string;
        if (yeni === h.sourceMovementId) {
          plan.zatenDogru += 1;
        } else {
          plan.yazilacak.push({
            cikis: h.id,
            variantId: h.variantId,
            eski: h.sourceMovementId,
            yeni,
            damga,
          });
        }
      }

      /**
       * ⛔ MEVCUT BAĞ TÜKETİLİR, ÖNERİLEN DEĞİL — bkz. başlık.
       * Bu satır `if/else` zincirinin DIŞINDA olmak zorunda: her sınıfta
       * defter aynı şekilde ilerlemeli.
       */
      kalan.set(h.sourceMovementId, (kalan.get(h.sourceMovementId) ?? 0) - adet);
    }
  }

  return plan;
}
