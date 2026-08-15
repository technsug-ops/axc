/**
 * ============================================================================
 *  VARYANT ÖZETİ — FORMLARIN GÖRDÜĞÜ HAFİF KAYIT
 * ----------------------------------------------------------------------------
 *  Bu seçim ve dönüşüm daha önce `varyant-arama.ts` içinde duruyordu; ama o
 *  dosya `"use server"` olduğu için yalnız async fonksiyon dışa verebiliyor.
 *  Sonuç: alım sayfası aynı `select`i ELLE ikinci kez yazmıştı ve iki kopya
 *  zamanla ayrıştı — kanal kodları eklenince biri güncellendi, diğeri
 *  derlemeyi kırdı. Tek kaynak burada.
 * ============================================================================
 */

/** Formlarda ve barkod aramasında kullanılan hafif varyant özeti. */
export type VaryantSonucu = {
  id: string;
  urunAdi: string;
  marka: string | null;
  varyantAdi: string | null;
  sku: string;
  companySku: string;
  barcode: string | null;
  /** Eşleştirilmiş pazaryeri kodları — hangi kanalda hangi kodla satılıyor. */
  kanalKodlari: { kanal: string; kod: string }[];
};

/**
 * KANAL KODLARI DA ÇEKİLİR. Kullanıcı pazaryeri kodunu yazıp ürünü
 * bulduğunda o kodu satırda GÖRMELİ; yoksa "bu satır neden çıktı"
 * sorusu doğar (Kullanıcı Kolaylığı İlkeleri #3).
 */
export const VARYANT_SECIMI = {
  id: true,
  sku: true,
  companySku: true,
  barcode: true,
  name: true,
  product: { select: { name: true, brand: true } },
  channelSkus: {
    where: { isActive: true },
    select: {
      channelSku: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  },
} as const;

export function varyantiOzetle(v: {
  id: string;
  sku: string;
  companySku: string;
  barcode: string | null;
  name: string | null;
  product: { name: string; brand: string | null };
  channelSkus: {
    channelSku: string;
    channelAccount: { channel: { name: string } };
  }[];
}): VaryantSonucu {
  return {
    id: v.id,
    urunAdi: v.product.name,
    marka: v.product.brand,
    varyantAdi: v.name,
    sku: v.sku,
    companySku: v.companySku,
    barcode: v.barcode,
    kanalKodlari: v.channelSkus.map((k) => ({
      kanal: k.channelAccount.channel.name,
      kod: k.channelSku,
    })),
  };
}

/**
 * Arama sonucu satırında gösterilecek kod dizisi.
 *
 * KANAL KODLARI DA YAZILIR: kullanıcı "HBCV…" yazıp ürünü bulduğunda o kodu
 * satırda görmezse doğru ürüne baktığından emin olamaz. Kanal adı da yanında
 * durur — aynı ürünün iki pazaryerinde iki farklı kodu olabilir.
 *
 * Kırpma YOK: bir varyantın 11 kanal kodu varsa 11'i de yazılır. Sessizce
 * kesmek, olmayan bir eşleşmeyi yokmuş gibi göstermek olurdu.
 */
export function kodDizisi(v: VaryantSonucu): string {
  return [
    v.sku,
    v.companySku,
    v.barcode,
    ...v.kanalKodlari.map((k) => `${k.kanal}: ${k.kod}`),
  ]
    .filter((p): p is string => Boolean(p))
    .join(" · ");
}
