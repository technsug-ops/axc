import type { KanalListelemeDurumu } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  HB LİSTİNG → LİSTELEME DURUMU — SAF SINIFLAMA (K184, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  `lib/kanal-listeleme.ts` Trendyol'un alanlarına göre yazılmıştı
 *  (`approved · archived · onSale · rejected · blacklisted · locked`).
 *  Hepsiburada BAŞKA alanlar döndürüyor; bu gövde HB'nin kendi sözlüğünü
 *  AYNI enuma çevirir.
 *
 *  ⛔ NİYE İKİNCİ BİR GÖVDE, NİYE `listelemeDurumu`YA BAYRAK EKLEMEDİM:
 *  o gövde TY alan adlarını okuyor ve panel onu çağırıyor. İçine "HB ise
 *  şunlara bak" diye bir dal koymak, tek gövdeyi iki kanalın ortak paydası
 *  yapardı ve üçüncü kanal geldiğinde okunamaz hâle gelirdi. Enum ORTAK,
 *  ÇEVİRİ kanala özel. _(Anayasa: "farklı sorulara farklı ölçüt
 *  ZORUNLULUKTUR" — burada farklı olan soru değil, KAYNAĞIN DİLİ.)_
 *
 *  ── ⚠ ALAN ADLARI VE DAĞILIM UÇTAN ÖLÇÜLDÜ ─────────────────────────────
 *  `npm run canli:hb-listing-olcum` · 07.09.2026 · CANLI · 2189 listing:
 *
 *      1652  satılamaz · stoksuz              → STOKSUZ
 *       222  satılabilir · stoklu             → ACIK
 *       219  satılamaz · stoklu · kilitsiz    → PASIF   ⚠ aşağıya bak
 *        65  kilitli · stoksuz                → PASIF
 *        31  kilitli · stoklu                 → PASIF
 *      isSuspended / isFrozen : HİÇ görülmedi (0)
 *
 *  ── ⛔ "SATILAMAZ · STOKLU · KİLİTSİZ" — EN ÖNEMLİ KARAR (219 kayıt) ────
 *  HB "satılamaz" diyor ama raf DOLU ve kilit de yok; sebep genelde
 *  `ByMerchant` (504 kayıtta) — yani satıcı kendi kapatmış.
 *
 *  ⛔ BUNA `STOKSUZ` DEMEK YALAN OLURDU: raf boş değil. TY gövdesi
 *  `!onSale` durumunu STOKSUZ'a düşürüyor çünkü orada ayrı bir karşılık
 *  yoktu; HB'de mal VAR ve bunu bilmemek alım kararını bozar.
 *
 *  `PASIF` seçildi (mimar onayı 07.09.2026) çünkü YAPILACAK İŞ odur:
 *  "kanalda ürünü tekrar satılabilir hâle getir" — `engelGrubu` zaten
 *  `PASIF`i o kovaya koyuyor. ⚠ Ama hangi yoldan PASIF olduğu KAYBOLMASIN
 *  diye `kaynak` alanı ayrıca dönüyor: kilitli olan ile satıcının kapattığı
 *  aynı kutuya girer ama aynı şey DEĞİLDİR.
 *
 *  ── ⛔ ONAY DURUMU YOK, UYDURULMAZ ──────────────────────────────────────
 *  Listing ucu onay bilgisi VERMİYOR (ölçüldü: cevapta öyle bir alan yok).
 *  Bu gövde bu yüzden `ONAY_BEKLIYOR` DÖNDÜREMEZ — TY'de dönebiliyor olması
 *  HB'de de dönmesi gerektiği anlamına gelmez. Onay bilgisi başka bir uçtan
 *  (katalog) gelirse o gün ayrıca eklenir.
 *  _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında iddia
 *  kurmaz".)_
 * ============================================================================
 */

/** Uçtan okunan ham listing — yalnız karar veren alanlar. */
export type HbListing = {
  isSalable?: unknown;
  isSuspended?: unknown;
  isLocked?: unknown;
  isFrozen?: unknown;
  availableStock?: unknown;
};

/**
 * Durumun HANGİ YOLDAN kurulduğu. Enum ortak, ama iki farklı gerçek aynı
 * kutuya düşebiliyor; alt-iz onları ayırır.
 */
export type HbKaynak =
  | "kilitli"
  | "askida"
  | "donuk"
  | "satilamaz-kilitsiz"
  | "stok-sifir"
  | "satilabilir"
  | "stok-okunamadi";

function bayrak(v: unknown): boolean {
  return v === true;
}

/**
 * ⚠ ADET SAYIYA ÇEVRİLİRKEN "YOK" İLE "SIFIR" AYRILIR: alan hiç gelmediyse
 * `null` döner ve karar "bilmiyorum" tarafına düşer — `0` sayılıp "STOKSUZ"
 * denmez. _(Anayasa: bilinmeyen sıfıra çevrilmez.)_
 */
export function hbAdedi(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function hbListelemeDurumu(l: HbListing): {
  durum: KanalListelemeDurumu;
  kaynak: HbKaynak;
} {
  /** ① EN KISITLAYICI: kanalın kapattığı hâller. Sıra TY gövdesiyle aynı. */
  if (bayrak(l.isLocked)) return { durum: "PASIF", kaynak: "kilitli" };
  if (bayrak(l.isSuspended)) return { durum: "PASIF", kaynak: "askida" };
  if (bayrak(l.isFrozen)) return { durum: "PASIF", kaynak: "donuk" };

  const adet = hbAdedi(l.availableStock);
  /**
   * ⚠ ADET OKUNAMADIYSA HÜKÜM YOK — ve bu kapı SATILABİLİRLİK KAPISINDAN
   * ÖNCE gelir: `isSalable` false olsa bile adedi bilmeden "stoksuz mu,
   * kapatılmış mı" ayrımı yapılamaz.
   */
  if (adet === null) return { durum: "BILINMIYOR", kaynak: "stok-okunamadi" };

  if (adet <= 0) return { durum: "STOKSUZ", kaynak: "stok-sifir" };

  /**
   * ② RAFTA MAL VAR. Satılabiliyorsa açık; satılamıyorsa PASİF — çünkü
   * eksik olan STOK DEĞİL, kanaldaki durum.
   */
  if (bayrak(l.isSalable)) return { durum: "ACIK", kaynak: "satilabilir" };
  return { durum: "PASIF", kaynak: "satilamaz-kilitsiz" };
}

/**
 * ============================================================================
 *  EŞLEŞTİRME ANAHTARI — `hepsiburadaSku` (mimar onayı 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ ÖLÇÜLDÜ, SEÇİLMEDİ (2189 listing · 1098 defter kaydı):
 *
 *      merchantSku       benzersiz 2121/2189  ⛔ TEKİL DEĞİL (68 çakışma)
 *      hepsiburadaSku    benzersiz 2189/2189  ✓  eşleşen 1087 (defterin %99'u)
 *      uniqueIdentifier  hiç dolu değil (0)
 *
 *  `merchantSku` bizim kendi kodumuz ve 68 listing'de TEKRARLIYOR — anahtar
 *  olsaydı aynı kod iki listing'e bağlanır ve hangisinin durumu yazılacağı
 *  belirsiz kalırdı. `uniqueIdentifier` cevapta hiç dolu gelmiyor.
 *
 *  ⚠ VE TY VAKASI TEKRARLANMADI: orada üç alan (`barcode · stockCode ·
 *  productMainId`) TEK KÜMEYE KATLANMIŞTI ve hangisinin eşleştiği
 *  görünmüyordu. Burada alanlar ayrı ayrı ölçüldü, çakışma ayrı sayıldı.
 * ============================================================================
 */
export function hbAnahtari(l: { hepsiburadaSku?: unknown }): string {
  return l.hepsiburadaSku === null || l.hepsiburadaSku === undefined
    ? ""
    : String(l.hepsiburadaSku).trim();
}
