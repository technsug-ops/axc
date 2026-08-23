import { KOD_ROLLERI, type KodRolu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  DEPO OKUMASI — KAYIT ŞEKLİ (K34a ④)
 * ----------------------------------------------------------------------------
 *  Mimar 23.08.2026: _"AuditLog.detail alanı YAPILANDIRILMIŞ (JSON)
 *  yazılacak — okunan değer · hangi alanda bulunduğu · eşleştirilen varyant.
 *  Serbest metin YAZILMAYACAK; 'hangi alanda bulundu' sorgusu ileride metin
 *  ayrıştırmaya dönmesin."_
 *
 *  ⚠ NİYE ÖNEMLİ: `detail` serbest bir `Text` sütunu. Bugün oraya cümle
 *  yazmak kolaydır ve yarın _"kaç okuma Firma SKU'dan bulundu"_ sorusu
 *  geldiğinde cevap, cümleleri ayrıştırmaya kalır. O noktada eski kayıtlar
 *  ayrıştırılamaz ve soru geçmişe dönük CEVAPSIZ kalır. Şekil bugün sabit
 *  tutulursa aynı soru bir `JSON_EXTRACT` ile cevaplanır.
 * ============================================================================
 */
export type OkumaKaydi = {
  /** Okunan ham değer, kırpılmış. Kimliktir; asla cümle değildir. */
  kod: string;
  /**
   * Kod HANGİ ROLDE bulundu. Bulunamadıysa `null`.
   * ⚠ Prisma bir `OR` içinde hangi koşulun tuttuğunu SÖYLEMEZ; bu yüzden
   * varyant geldikten sonra `bulunanAlan` ile ayrıca çözülür.
   */
  alan: KodRolu | null;
  /**
   * Eşleşen ya da kullanıcının GÖSTERDİĞİ varyant. `targetId` ile aynı
   * değeri taşır; JSON'un tek başına okunabilir olması için burada da durur.
   */
  varyantId: string | null;
  /**
   * ⚠ BUGÜN HER KAYITTA `null` — VE BU BİR EKSİKLİK DEĞİL, MİMAR KARARI
   * (23.08.2026): _"SEBEP ALANI AYRICA AÇILACAK ve BOŞ BIRAKILACAK —
   * kullanıcıya sorulmayacak, ekranda seçtirilmeyecek. Vaka biriktiğinde
   * desen kendisi çıkar, hüküm o zaman verilir."_
   *
   * Alan ŞİMDİ açılıyor ki, doldurulmaya karar verildiği gün eski kayıtlar
   * da aynı şekli taşısın ve göç "yeniden yazım" olmasın (anayasa:
   * _"vizyonu kaydetmek yetmez — evrilebilirlik sınanır"_). Tipi bilerek
   * `null`: doldurmak isteyen, kapalı kümeyi VERİDEN türetip tipi bilinçli
   * olarak genişletmek zorunda kalsın — yani hükmü o gün versin.
   */
  sebep: null;
};

/**
 * KOD HANGİ ROLDE BULUNDU.
 *
 * ⚠ SIRA `KOD_ROLLERI` DEĞİL, `kodKosulu`NUN SIRASIDIR: barkod önce.
 * Aynı değer iki rolde birden durabilir (ör. Firma SKU olarak EAN yazılmış
 * bir varyant); o zaman "hangisiyle bulduk" sorusunun cevabı, aramanın
 * hangisine önce baktığıdır. Rastgele bir sıra, aynı okumayı iki koşumda
 * iki farklı alana yazardı.
 */
const ARAMA_SIRASI = ["barcode", "companySku", "sku", "channelSku"] as const;

export function bulunanAlan(
  kod: string,
  varyant: {
    sku: string;
    companySku: string | null;
    barcode: string | null;
    channelSkus: { channelSku: string }[];
  },
): KodRolu | null {
  const eslesme: Record<(typeof ARAMA_SIRASI)[number], boolean> = {
    barcode: varyant.barcode === kod,
    companySku: varyant.companySku === kod,
    sku: varyant.sku === kod,
    channelSku: varyant.channelSkus.some((k) => k.channelSku === kod),
  };
  return ARAMA_SIRASI.find((rol) => eslesme[rol]) ?? null;
}

/**
 * Kaydı JSON'a çevirir. Tek yerden geçer ki şekil kayıt başına
 * savrulmasın — ayrıştıran taraf tek bir şekle güvenebilsin.
 */
export function kaydiYaz(kayit: OkumaKaydi): string {
  return JSON.stringify(kayit);
}

/**
 * ⚠ OKUMA SAVUNMALI: `detail` geçmişte başka bir şey taşımış olabilir ve
 * bozuk bir satır YÜZÜNDEN rapor patlamamalı. Anayasa: _"çözülemeyen iz
 * susturmaz"_ — burada da çözülemeyen iz raporu düşürmez, `null` döner ve
 * sayımda "ayrıştırılamadı" tarafında kalır.
 */
export function kaydiOku(detail: string | null): OkumaKaydi | null {
  if (!detail) return null;
  try {
    const ham: unknown = JSON.parse(detail);
    if (typeof ham !== "object" || ham === null) return null;
    const n = ham as Record<string, unknown>;
    if (typeof n.kod !== "string") return null;
    const alan =
      typeof n.alan === "string" && (KOD_ROLLERI as readonly string[]).includes(n.alan)
        ? (n.alan as KodRolu)
        : null;
    return {
      kod: n.kod,
      alan,
      varyantId: typeof n.varyantId === "string" ? n.varyantId : null,
      sebep: null,
    };
  } catch {
    return null;
  }
}
