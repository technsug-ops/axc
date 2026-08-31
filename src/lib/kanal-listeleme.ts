import type { KanalListelemeDurumu } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KANAL LİSTELEME DURUMU — SAF SINIFLAMA (K121, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  "Rafta var, vitrinde yok" kutusunun çekirdeği. Pazaryerinden OKUNAN bir
 *  ürün kaydını tek bir duruma indirger.
 *
 *  ⛔ BU GÖVDE PAZARYERİNE HİÇBİR ŞEY YAZMAZ ve yazan bir yol da bilmez.
 *  Stok senkronu (kanala adet yazma) KAPSAM DIŞI — kullanıcı şartı
 *  01.09.2026. Bekçi TY istemcisinde yazma metodu OLMADIĞINI ölçüyor.
 *
 *  ── ⛔ ÖNCELİK SIRALI: PASIF → ONAY_BEKLIYOR → STOKSUZ → ACIK ─────────
 *  Bir ürün birden çok bayrağı aynı anda taşıyabilir (arşivli VE stoksuz).
 *  Sıra olmasaydı aynı ürün iki kovada sayılır ve panel toplamı ŞİŞERDİ.
 *  **En kısıtlayıcı durum kazanır** — çünkü kullanıcının yapacağı iş odur:
 *  arşivden çıkarmadan stok bildirmenin anlamı yok.
 *
 *  ── ⚠ ALAN ADLARI VARSAYILMADI, UÇTAN ÖLÇÜLDÜ ────────────────────────
 *  01.09.2026 sondası (`size=3`), Trendyol ürün ucu:
 *  `approved · archived · onSale · rejected · blacklisted · locked ·
 *  quantity · barcode · stockCode · productMainId`.
 *
 *  ⭐ SAF: ağ yok, veritabanı yok. Bekçi kaynağı taramak yerine gövdeyi
 *  ÇAĞIRIP değerini ölçüyor.
 * ============================================================================
 */

/** Pazaryerinden okunan ham ürün kaydı — yalnız karar veren alanlar. */
export type KanalUrunu = {
  approved?: unknown;
  archived?: unknown;
  onSale?: unknown;
  rejected?: unknown;
  blacklisted?: unknown;
  locked?: unknown;
  quantity?: unknown;
};

function bayrak(v: unknown): boolean {
  return v === true;
}

/**
 * ⚠ ADET SAYIYA ÇEVRİLİRKEN "YOK" İLE "SIFIR" AYRILIR: alan hiç gelmediyse
 * `null` döner ve karar "bilmiyorum" tarafına düşer — `0` sayılıp
 * "STOKSUZ" denmez. _(Anayasa: bilinmeyen sıfıra çevrilmez.)_
 */
export function kanalAdedi(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export function listelemeDurumu(u: KanalUrunu): KanalListelemeDurumu {
  /** ① EN KISITLAYICI: pasif hâller. */
  if (bayrak(u.archived) || bayrak(u.locked) || bayrak(u.blacklisted)) {
    return "PASIF";
  }
  /** ② Onay engeli — pasif değilse ama satılamıyorsa sebep budur. */
  if (!bayrak(u.approved) || bayrak(u.rejected)) return "ONAY_BEKLIYOR";

  const adet = kanalAdedi(u.quantity);
  /**
   * ⚠ ADET OKUNAMADIYSA HÜKÜM YOK. `0` sayıp "STOKSUZ" demek, bakmadığımız
   * bir şey hakkında iddia kurmaktır.
   */
  if (adet === null) return "BILINMIYOR";
  if (adet <= 0) return "STOKSUZ";

  /**
   * ⚠ `onSale` SON KAPI: onaylı, arşivsiz, adedi var ama vitrine
   * çıkarılmamış olabilir. O da satılamaz — ve sebebi "stoksuz" değildir.
   */
  if (!bayrak(u.onSale)) return "STOKSUZ";
  return "ACIK";
}

/**
 * Bu durum SATIŞA ENGEL Mİ — panel kutusunun ölçütü.
 *
 * ⛔ `BILINMIYOR` ENGEL SAYILMAZ VE AÇIK DA SAYILMAZ. Ölçülmemiş bir kayıt
 * hakkında hüküm yoktur; kutuda AYRI satırda durur ve sayıya karışmaz.
 * _(Kullanıcı şartı 01.09.2026.)_
 */
export function satisaEngel(d: KanalListelemeDurumu): boolean {
  return d === "STOKSUZ" || d === "ONAY_BEKLIYOR" || d === "PASIF" || d === "YOK";
}

/** Kutuda hangi başlık altında sayılacağı — üç iş, üç satır. */
export type EngelGrubu = "STOK_KAPALI" | "PASIF" | "LISTELENMEMIS";

export function engelGrubu(d: KanalListelemeDurumu): EngelGrubu | null {
  if (d === "STOKSUZ") return "STOK_KAPALI";
  /**
   * ⚠ ONAY_BEKLIYOR PASİFLE AYNI KOVADA: ikisinde de yapılacak iş "kanalda
   * ürünü tekrar satılabilir hâle getir". Ayrı satır açmak, canlıda bugün
   * SIFIR olan bir kova için kutuya boş bir satır koymak olurdu (ölçüldü:
   * stoklu varyantlarda ONAY_BEKLIYOR = 0).
   */
  if (d === "PASIF" || d === "ONAY_BEKLIYOR") return "PASIF";
  if (d === "YOK") return "LISTELENMEMIS";
  return null;
}
