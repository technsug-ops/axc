import type { Prisma } from "@/generated/prisma/client";

/**
 * ============================================================================
 *  "RAFTA VAR, VİTRİNDE YOK" — SÜZGEÇ SÖZLEŞMESİNİN SAHİBİ (K121③)
 * ----------------------------------------------------------------------------
 *  ⛔ ADRES VE KOŞUL BURADAN ÜRETİLİR — ekran kendi koşulunu kurmaz.
 *  Anayasa: "sayı = liste". Panel kutusu bu gövdeden sayıyor, `/stok` aynı
 *  gövdeden süzüyor; ikisi ayrı yazılsaydı koşul değiştiğinde sessizce
 *  ayrışırlardı.
 *
 *  ── ⛔ SAYILAN KÜME: KANAL KAYDI OLUP DURUMU ENGELLİ OLANLAR ─────────
 *  Ölçüldü (01.09.2026): stoklu 231 varyantın 222'sinde TY kaydı var,
 *  **9'unda YOK**.
 *
 *  ⚠ VE İLK YAZIMDA O 9'U DA SAYIYA KATTIM — YANLIŞTI. Kutu 27 yerine 32
 *  gösterdi; ölçüm sebebi verdi: kaydı olmayan 9 varyantın **4'ü aslında
 *  kanalda VAR ve satışa açık.** "Vitrinde yok" saymak haksız suçlamaydı
 *  ve ₺33.857 fazla gösteriyordu.
 *
 *  ⭐ DOĞRU OKUMA: kanal kaydı olmayan varyant hakkında defterin BİLGİSİ
 *  YOKTUR. `kanalKaydiYokKosulu` ile AYRI satırda durur, sayıya karışmaz —
 *  ve kayıt UYDURULMAZ (olmayan bir kanal kodu yazmak, sistemin bilmediği
 *  şeyi beyan etmek olurdu).
 *
 *  ── ⛔ `BILINMIYOR` SAYIYA GİRMEZ ────────────────────────────────────
 *  Henüz karşılaştırılmamış bir kayıt hakkında hüküm yoktur. Kutuda AYRI
 *  satırda durur. _(Kullanıcı şartı 01.09.2026.)_
 * ============================================================================
 */

/** Satışa engel olan durumlar — `BILINMIYOR` ve `ACIK` dışındakiler. */
export const ENGELLI_DURUMLAR = [
  "STOKSUZ",
  "ONAY_BEKLIYOR",
  "PASIF",
  "YOK",
] as const;

/** Kutudaki üç satır — üç ayrı iş. */
export const VITRIN_SATIRLARI = [
  "LISTELENMEMIS",
  "PASIF",
  "STOK_KAPALI",
] as const;
export type VitrinSatiri = (typeof VITRIN_SATIRLARI)[number];

/**
 * Hangi durumlar hangi satıra düşer.
 *
 * ⚠ `PASIF` ve `ONAY_BEKLIYOR` AYNI SATIRDA: ikisinde de yapılacak iş
 * "kanalda ürünü tekrar satılabilir hâle getir". Ürünün yanında rozet ayrı
 * yazar, böylece hangisi olduğu kaybolmaz. _(Kullanıcı kararı 01.09.2026.)_
 */
export const SATIR_DURUMLARI: Record<VitrinSatiri, readonly string[]> = {
  LISTELENMEMIS: ["YOK"],
  PASIF: ["PASIF", "ONAY_BEKLIYOR"],
  STOK_KAPALI: ["STOKSUZ"],
};

/**
 * `ProductVariant` için Prisma koşulu — kanalda satılamayanlar.
 *
 * ⚠ STOK KOŞULU BURADA DEĞİL: ledger toplamı Prisma `where` ile sorulamıyor
 * (`groupBy` gerekiyor). Çağıran stoklu varyant kimliklerini verir; böylece
 * "stoklu" tanımı da tek yerde kalır.
 */
export function vitrinKosulu(g: {
  kanalHesabiId: string;
  /** Yalnız bu varyantlar arasında ara — stoklu küme. */
  variantIdleri: string[];
  /** Tek bir satırla sınırla; verilmezse hepsi. */
  satir?: VitrinSatiri;
}): Prisma.ProductVariantWhereInput {
  const durumlar =
    g.satir === undefined
      ? [...ENGELLI_DURUMLAR]
      : [...SATIR_DURUMLARI[g.satir]];

  /**
   * ⛔ "KANAL KAYDI YOK" SAYIYA GİRMEZ — VE BU ÖLÇÜLEREK DÜZELTİLDİ.
   * İlk yazımda kaydı olmayan varyantlar `LISTELENMEMIS` sayılıyordu ve
   * kutu 27 yerine **32** gösterdi. Ölçüm sebebi verdi: kaydı olmayan 9
   * varyantın **4'ü aslında kanalda VAR ve satışa açık**. Onları
   * "vitrinde yok" saymak haksız suçlamaydı.
   *
   * ⭐ DOĞRU OKUMA: kanal kaydı olmayan varyant hakkında defterin BİLGİSİ
   * YOKTUR — `BILINMIYOR`dur. Kutuda AYRI satırda durur, sayıya karışmaz.
   * _(Kullanıcı şartı: BILINMIYOR olanlar ayrı satır.)_
   */
  return {
    isActive: true,
    id: { in: g.variantIdleri },
    channelSkus: {
      some: {
        channelAccountId: g.kanalHesabiId,
        listelemeDurumu: { in: durumlar as never },
      },
    },
  };
}

/**
 * KANAL KAYDI OLMAYAN stoklu varyantlar — kutunun AYRI satırı.
 *
 * ⚠ BU BİR KUSUR SAYILMAZ, BİR BOŞLUKTUR: ürün kanalda olabilir de
 * olmayabilir de; defter bilmiyor. Ölçüldü (01.09.2026): 9 varyant, 4'ü
 * kanalda VAR. "Listelenmemiş" diye sayılsalardı kutu ₺33.857 fazla
 * gösterirdi.
 */
export function kanalKaydiYokKosulu(g: {
  kanalHesabiId: string;
  variantIdleri: string[];
}): Prisma.ProductVariantWhereInput {
  return {
    isActive: true,
    id: { in: g.variantIdleri },
    channelSkus: { none: { channelAccountId: g.kanalHesabiId } },
  };
}

/**
 * `/stok` adresi — kutudaki her satır buraya gider.
 *
 * ⛔ ADRESİ EKRAN KURMAZ, BU GÖVDE KURAR. Anayasa: "adres, süzgeç
 * sözleşmesinin sahibi DOSYADAN üretilir — ekran kendi adresini kurarsa
 * koşul değiştiğinde sayı ile liste sessizce ayrışır."
 */
/** Adres seçeneği — sayılan satırlar + kayıtsızlar. */
export type VitrinAdresi = VitrinSatiri | "KAYIT_YOK";

export function vitrinAdresi(satir?: VitrinAdresi): string {
  const p = new URLSearchParams({ vitrin: satir ?? "hepsi" });
  return `/stok?${p.toString()}`;
}

/** Adresten satır çözümü — tanınmayan değer "hepsi"ye düşer. */
/**
 * ⚠ `KAYIT_YOK` AYRI DÖNER: çağıran onu `kanalKaydiYokKosulu`ya götürmek
 * zorunda. `vitrinKosulu`ya verilirse hiçbir şey bulamaz ve liste sessizce
 * boşalır — kutuda 9 yazarken listede 0 çıkardı ("sayı = liste" bozulur).
 */
export function vitrinSatiriCoz(
  ham: string | undefined,
): VitrinAdresi | undefined {
  if (ham === "KAYIT_YOK") return "KAYIT_YOK";
  return (VITRIN_SATIRLARI as readonly string[]).includes(ham ?? "")
    ? (ham as VitrinSatiri)
    : undefined;
}
