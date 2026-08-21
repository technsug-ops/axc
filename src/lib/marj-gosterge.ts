/**
 * ============================================================================
 *  MARJ GÖSTERGESİ — TEK ÖLÇÜ, TEK DİL
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 17.08.2026: satış listesindeki NET rozetinin yanında
 *  marj görünsün — ama "ikisi birden" YOK.
 *
 *  ── NEDEN TEK ÖLÇÜ ──────────────────────────────────────────────────────
 *  Ciro marjı (%61) ile sermaye verimi (0,13×) yan yana durursa göz hangisinin
 *  ne olduğunu her satırda yeniden çözmek zorunda kalır ve iki yüzde
 *  birbirine karışır. Aynı gerekçe kârlılık kartında da uygulanmıştı
 *  ("tek ekran tek NET"). Kullanıcı ölçüyü SEÇER, ekran onu gösterir.
 *
 *  ── AYNI SAYI İKİ EKRANDA İKİ DİLDE KONUŞAMAZ ───────────────────────────
 *  ⚠ Bugünün kargo dersi: aynı rakam bir yerde KDV hariç, başka yerde KDV
 *  dahil anlamına geliyordu ve saatler kaybettirdi. Bu yüzden sermaye verimi
 *  HEM hesabı HEM biçimi bu dosyadan okur; kârlılık kartı da buradan çağırır.
 *
 *  ── YENİ HESAP YOK ──────────────────────────────────────────────────────
 *  Kaynak mevcut snapshot'lar: `SaleItem.net2Amount` ve `SaleFee` MALIYET
 *  satırı. Burada hiçbir rakam yeniden türetilmez.
 * ============================================================================
 */

import { marjBandi, type MarjBandi } from "./marj-bantlari";

export const MARJ_OLCULERI = ["ciro", "sermaye"] as const;
export type MarjOlcusu = (typeof MARJ_OLCULERI)[number];

/** Varsayılan ölçü — ciro marjı operasyonun günlük dilidir. */
export const VARSAYILAN_OLCU: MarjOlcusu = "ciro";

export function olcuGecerliMi(deger: string | undefined): deger is MarjOlcusu {
  return (MARJ_OLCULERI as readonly string[]).includes(deger ?? "");
}

/**
 * CİRO MARJI — NET-2 / satır tutarı, YÜZDE.
 *
 * Tutar sıfır ya da eksiyse oran anlamsızdır; `null` döner ve ekran gösterge
 * çizmez. Sıfıra bölüp "sonsuz" ya da "0" yazmak yanlış bir hüküm olurdu.
 */
export function ciroMarji(net2: number | null, tutar: number): number | null {
  if (net2 === null || tutar <= 0) return null;
  return (net2 / tutar) * 100;
}

/**
 * SERMAYE VERİMİ — kâr / maliyet. "Yatırdığım paranın kaç katı döndü."
 *
 * Kârlılık kartı da bu fonksiyonu çağırır; iki ekran aynı sayıyı aynı
 * yoldan üretir.
 */
export function sermayeVerimi(
  kar: number | null,
  maliyet: number | null,
): number | null {
  if (kar === null || maliyet === null || maliyet <= 0) return null;
  return kar / maliyet;
}

/**
 * ORTAK BİÇİM — sermaye verimi her yerde "0,13×" gibi görünür.
 * Kârlılık kartı ve satış listesi aynı metni üretir.
 */
export function sermayeVerimiMetni(oran: number | null): string | null {
  return oran === null ? null : `${oran.toFixed(2)}×`;
}

/**
 * CİRO MARJI BİÇİMİ — listede TAM SAYI (kullanıcı kararı 17.08.2026).
 * Satır taramasında ondalık gürültüdür; kartta ayrıntı için bir basamak
 * gösterilir, orası tek ürüne odaklanılan ekrandır.
 */
export function ciroMarjiMetni(yuzde: number | null): string | null {
  return yuzde === null ? null : `%${Math.round(yuzde)}`;
}

export type GostergeGirdisi = {
  olcu: MarjOlcusu;
  net2: number | null;
  /** Satır tutarı (KDV dahil ciro) — ciro marjının paydası. */
  tutar: number;
  /** Bu satışın maliyeti (MALIYET kesinti satırı) — sermayenin paydası. */
  maliyet: number | null;
  iptalliMi: boolean;
};

export type GostergeSonucu =
  /** Gösterge hiç çizilmez: iptalli satır ya da NET hesaplanamamış. */
  | { tur: "YOK" }
  /** Ölçü hesaplanamadı (ör. maliyet bilinmiyor) — "?" gösterilir. */
  | { tur: "BILINMIYOR" }
  | {
      tur: "DEGER";
      metin: string;
      zararMi: boolean;
      /**
       * PİL BANDI — yalnız CİRO marjında dolu.
       *
       * ⚠ SERMAYE VERİMİNDE `null`. Bantlar yüzde ölçeğinden ölçüldü;
       * "0,13×" değerini %0,13 sayıp "çok riskli" demek, iki farklı birimi
       * aynı cetvele vurmak olurdu (bkz. lib/marj-bantlari → yalnız ciro).
       */
      bant: MarjBandi | null;
    };

/**
 * Satır göstergesi — tek karar noktası.
 *
 * İPTALLİ SATIRDA GÖSTERGE YOK: iptal edilen satış hiç doğmamış sayılır,
 * onun marjını göstermek olmayan bir kârı tartışmak olurdu.
 */
export function satirGostergesi(girdi: GostergeGirdisi): GostergeSonucu {
  if (girdi.iptalliMi) return { tur: "YOK" };
  if (girdi.net2 === null) return { tur: "YOK" };

  if (girdi.olcu === "ciro") {
    const yuzde = ciroMarji(girdi.net2, girdi.tutar);
    const metin = ciroMarjiMetni(yuzde);
    if (metin === null) return { tur: "BILINMIYOR" };
    /**
     * ⚠ BANT YUVARLANMAMIŞ DEĞERDEN: `metin` listede tam sayıya yuvarlanıyor
     * ("%3"), bant ise ham yüzdeden çözülüyor. Yuvarlanmıştan çözseydim
     * %2,6'lık bir satır "%3" görünüp ZAYIF bandına atlardı — ekrandaki
     * rakam yüzünden hüküm değişirdi.
     */
    return {
      tur: "DEGER",
      metin,
      zararMi: girdi.net2 < 0,
      bant: marjBandi(yuzde),
    };
  }

  /** SERMAYE: maliyet bilinmiyorsa "?" — sıfır sayılmaz (NO_COST). */
  const metin = sermayeVerimiMetni(sermayeVerimi(girdi.net2, girdi.maliyet));
  if (metin === null) return { tur: "BILINMIYOR" };
  /** BANT YOK — kat sayısı yüzde cetveline vurulmaz. */
  return { tur: "DEGER", metin, zararMi: girdi.net2 < 0, bant: null };
}
