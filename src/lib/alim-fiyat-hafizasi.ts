import type { RehberSatiri } from "@/lib/rapor/alim-rehberi";

/**
 * ============================================================================
 *  ALIM FİYATI HAFIZASI — SAF HESAP (K363 Faz 2-d, kullanıcı onayı 24.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: «Fiyat indirimleri oluyor. Bu ürünü önceki partide şu kadara
 *  almışsın, sonra şu kadara, ama kampanyada iyi almışsın — takip etsek.»
 *
 *  ⛔ İŞ SABİTİ «FİYATIN YÖNÜ YOKTUR» GEÇERLİ: iki alım arasındaki fark HATA ya
 *  da ŞÜPHE değildir. Bu modül hüküm KURMAZ — HATIRLATIR: «en ucuz şu tarihte
 *  şu fiyattı». Hiçbir kayıt işaretlenmez, hiçbir giriş engellenmez, renk
 *  uyarı/olumsuz değil. (Anayasa açılış şartı: iki tarihli maliyeti kıyaslayan
 *  ilk kod — bekçisi `alim-fiyat-hafizasi:dogrula`, «şüphe üretmez» ölçütüyle.)
 *
 *  ── KIYAS AYNI TABANDA ───────────────────────────────────────────────────
 *  Kaynak `PurchaseItem.unitCostAmount` = faturadaki birim fiyat — formda
 *  yazılan sayının KENDİSİ. Yalnız KDV dahil · kargo dahil · gümrüksüz ·
 *  aynı para birimi · bedava olmayan kalem kıyasa girer; öteki SAYILIR
 *  (`kiyasDisi`) ve ekranda yazar. Ölçüldü 24.10.2026 (canlı): 2.461 gerçek
 *  kalemin hepsi KDV+kargo dahil, TRY; 5 bedava kalem.
 *
 *  ── «NORMAL» = ORTANCA ───────────────────────────────────────────────────
 *  En ucuz tek başına uç değere esirdir (OneBlade kuponla ₺27). Ortanca o tek
 *  alışı dengeler; ikisi yan yana ve TARİHLERİYLE yazar, okuyan karar verir.
 * ============================================================================
 */

export type ParaBirimi = "TRY" | "EUR";

export type AlisKaydi = {
  tarih: Date;
  birim: number;
  paraBirimi: ParaBirimi;
  kdvDahil: boolean;
  kargoDahil: boolean;
  gumrukVar: boolean;
  promosyon: boolean;
};

export type FiyatNoktasi = { fiyat: number; tarih: Date };

export type FiyatHafizasi = {
  /** Kıyasa giren kalem sayısı. */
  alisSayisi: number;
  /** Kıyasa giren kalemlerin kaç FARKLI günde alındığı (İstanbul değil, kayıt günü — UTC gün etiketi). */
  gunSayisi: number;
  /** En düşük birim fiyat; eşitse en YENİ tarihlisi (son başarılı alış daha anlamlı). */
  enUcuz: FiyatNoktasi;
  /** Ortanca birim fiyat — çift sayıda ortadaki ikisinin ortalaması. */
  normal: number;
  /** En yeni tarihli alış; aynı gün birden çok kalem varsa sırada SONUNCU. */
  son: FiyatNoktasi;
  /** Bu para biriminde olup tabanı farklı / bedava olduğu için kıyasa GİRMEYEN kalem. */
  kiyasDisi: number;
};

/** Kıyasa girer mi — aynı para birimi, KDV+kargo dahil, gümrüksüz, bedava değil, fiyat > 0. */
export function kiyaslanabilirMi(k: AlisKaydi, paraBirimi: ParaBirimi): boolean {
  return k.paraBirimi === paraBirimi && k.kdvDahil && k.kargoDahil && !k.gumrukVar && !k.promosyon && k.birim > 0;
}

export function ortanca(degerler: readonly number[]): number | null {
  if (degerler.length === 0) return null;
  const s = [...degerler].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[o] : (s[o - 1] + s[o]) / 2;
}

/**
 * Bir varyantın (bir para biriminde) fiyat hafızası. Kıyaslanabilir kalem yoksa
 * `null` — «geçmiş yok» ile «geçmiş var ama kıyaslanamaz» çağıranda ayrılır
 * (`kiyasDisiSayisi`).
 */
export function fiyatHafizasi(kayitlar: readonly AlisKaydi[], paraBirimi: ParaBirimi): FiyatHafizasi | null {
  const ayniBirim = kayitlar.filter((k) => k.paraBirimi === paraBirimi);
  const uygun = ayniBirim.filter((k) => kiyaslanabilirMi(k, paraBirimi));
  if (uygun.length === 0) return null;
  /* Tarihe göre KARARLI sıra — aynı gün içindeki kayıtlar geliş sırasını korur. */
  const sirali = uygun.map((k, i) => ({ k, i })).sort((a, b) => a.k.tarih.getTime() - b.k.tarih.getTime() || a.i - b.i).map((x) => x.k);
  let enUcuz = sirali[0];
  for (const k of sirali) if (k.birim <= enUcuz.birim) enUcuz = k;
  const son = sirali[sirali.length - 1];
  return {
    alisSayisi: sirali.length,
    gunSayisi: new Set(sirali.map((k) => k.tarih.toISOString().slice(0, 10))).size,
    enUcuz: { fiyat: enUcuz.birim, tarih: enUcuz.tarih },
    normal: ortanca(sirali.map((k) => k.birim)) as number,
    son: { fiyat: son.birim, tarih: son.tarih },
    kiyasDisi: ayniBirim.length - uygun.length,
  };
}

/** Bu para biriminde olup kıyasa girmeyen kalem sayısı (hafıza `null` olsa bile). */
export function kiyasDisiSayisi(kayitlar: readonly AlisKaydi[], paraBirimi: ParaBirimi): number {
  return kayitlar.filter((k) => k.paraBirimi === paraBirimi && !kiyaslanabilirMi(k, paraBirimi)).length;
}

/**
 * Fiyatın en ucuz alışa göre farkı, YÜZDE. Artı = en ucuzdan yukarı. `null` =
 * hesaplanamaz (en ucuz ≤ 0 ya da fiyat sayı değil). Bir yargı DEĞİL, ölçü.
 */
export function enUcuzaGoreFark(fiyat: number, enUcuz: number): number | null {
  if (!Number.isFinite(fiyat) || !Number.isFinite(enUcuz) || enUcuz <= 0) return null;
  return ((fiyat - enUcuz) / enUcuz) * 100;
}

export type IyiAlimSatiri = {
  satir: RehberSatiri;
  hafiza: FiyatHafizasi;
  /** Son alışın en ucuz alışa göre farkı, % (> 0). */
  fark: number;
};

/**
 * «KAMPANYADA İYİ ALDIKLARIN» LİSTESİ (kullanıcı kararı 24.10.2026: satılan +
 * farkı büyük). Girer: rehberin seçili döneminde ≥ 1 adet satılmış · TRY'de en
 * az İKİ FARKLI günde kıyaslanabilir alışı var · son alışı en ucuzundan PAHALI
 * (fark > 0 — son alış zaten en ucuzsa hatırlatılacak bir şey yok). Sıra: fark
 * büyükten küçüğe, eşitse dönemde çok satan önce. Eşik YOK — sıralama yeter.
 */
export function iyiAlimListesi(satirlar: readonly RehberSatiri[], hafizalar: ReadonlyMap<string, FiyatHafizasi>): IyiAlimSatiri[] {
  const liste: IyiAlimSatiri[] = [];
  for (const satir of satirlar) {
    if (satir.adet < 1) continue;
    const hafiza = hafizalar.get(satir.variantId);
    if (!hafiza || hafiza.gunSayisi < 2) continue;
    const fark = enUcuzaGoreFark(hafiza.son.fiyat, hafiza.enUcuz.fiyat);
    if (fark === null || fark <= 0) continue;
    liste.push({ satir, hafiza, fark });
  }
  return liste.sort((a, b) => b.fark - a.fark || b.satir.adet - a.satir.adet);
}

/** Arama — ad · SKU · Firma SKU · barkod (rehberle aynı kural). */
export function iyiAlimAra(satirlar: readonly IyiAlimSatiri[], arama: string | null): IyiAlimSatiri[] {
  const q = (arama ?? "").trim().toLocaleLowerCase("tr");
  if (q === "") return [...satirlar];
  return satirlar.filter(({ satir: s }) =>
    [s.urunAdi, s.sku, s.firmaSku, s.barkod].some((x) => x !== null && x.toLocaleLowerCase("tr").includes(q)),
  );
}

/** Ekrandaki listenin toplamı (İlke #15) — ürün · dönemde satılan · rafta. Para toplanmaz: birim fiyatların toplamı anlamsız. */
export function iyiAlimToplami(satirlar: readonly IyiAlimSatiri[]): { urun: number; adet: number; raf: number } {
  return satirlar.reduce((t, x) => ({ urun: t.urun + 1, adet: t.adet + x.satir.adet, raf: t.raf + x.satir.raf }), { urun: 0, adet: 0, raf: 0 });
}
