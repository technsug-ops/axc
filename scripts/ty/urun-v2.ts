import type { KanalUrunu } from "../../src/lib/kanal-listeleme";

/**
 * ============================================================================
 *  ÜRÜN v2 → NORMALLEŞTİRİCİ (K181, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  Trendyol eski `/products` ucunu **15.09.2026'da kapatıyor** ve yerine
 *  içerik (content) bazlı iki AYRI uç koydu. Bu gövde, o iki ucun BİRBİRİNDEN
 *  DE FARKLI olan şekillerini tek bir kayıt biçimine indirger.
 *
 *  ⭐ NİYE NORMALLEŞTİRİCİ, NİYE YENİ SINIFLANDIRICI DEĞİL: karar gövdesi
 *  `src/lib/kanal-listeleme.ts` → `listelemeDurumu` zaten var, panel onu
 *  okuyor ve bekçisi onu ölçüyor. İkinci bir sınıflandırıcı yazmak "iki yerde
 *  iki ölçüt" olurdu — biri güncellenirken öteki eski kuralla kalırdı.
 *  Değişen şey KARAR değil, kararın OKUDUĞU kaydın şekli.
 *
 *  ── ⚠ ALAN ADLARI VARSAYILMADI, UÇTAN ÖLÇÜLDÜ ────────────────────────────
 *  `npm run canli:ty-urun-v2-sonda` · 07.09.2026 · satıcı 870249 · `size=2`.
 *  Belgeye DEĞİL, ucun kendi cevabına bakıldı.
 *
 *  ONAYLI  `/products/approved`  — ürün 12 alan, **`variants[]` iç dizide**
 *      ürün    : contentId · productMainId · title · brand · category · …
 *      variant : barcode · stockCode · variantId · archived · blacklisted ·
 *                locked · onSale · hasViolation · docNeeded ·
 *                stock{quantity,lastModifiedDate} ·
 *                price{listPrice,salePrice,priceSeenByCustomer} · …
 *      ⛔ `approved` VE `rejected` ALANI YOK — onayı UCUN KİMLİĞİ söylüyor.
 *
 *  ONAYSIZ `/products/unapproved` — DÜZ yapı, **varyant dizisi YOK**
 *      barcode · stockCode · productMainId · title · `status` (dize) ·
 *      `quantity` (ürün seviyesinde!) · rejectReasonDetails[] · …
 *      ⛔ `archived` · `locked` · `blacklisted` · `onSale` BAYRAKLARI YOK.
 *
 *  ── ⛔ SATIR SAYISI DEĞİŞİYOR VE BU BİR KUSUR DEĞİL ──────────────────────
 *  v1'de bir ürün = bir satırdı. v2 onaylı uçta bir İÇERİK birden çok barkod
 *  taşıyor ve normalleştirme **varyant başına** satır üretiyor. Eşleştirmemiz
 *  zaten BARKODLA yapılıyor (anayasa: "kimlik varken dizeyle aranmaz"), yani
 *  yeni biçim soruya daha yakın. Ama toplamlar kayacak ve rapor bunu YAZAR —
 *  sessiz değişen bir sayı, düzeltilmiş sayıdan tehlikelidir.
 * ============================================================================
 */

/** Normalleştirilmiş satır — karar alanları + eşleştirme kimlikleri. */
export type NormalUrun = KanalUrunu & {
  barcode: string;
  stockCode: string;
  productMainId: string;
  /**
   * ⚠ Yalnız ONAYSIZ uçta dolu: ürünün NİÇİN reddedildiği. v1'de bu bilgi
   * HİÇ YOKTU — geçişin tek kazancı bu.
   */
  redSebepleri: string[];
  /**
   * ── GÖSTERİM ALANLARI — karara GİRMEZ, CSV'yi insan okuyabilsin diye ──
   * ⚠ Boş kalabilir ve boş olması KUSUR DEĞİL: onaysız uç `productUrl`
   * göndermiyor. "Uç vermedi" ile "değeri yok" aynı görünmesin diye
   * uydurulmuyor, boş bırakılıyor.
   * (Anahtar adları ölçüldü: `category.name` · `brand.name`.)
   */
  baslik: string;
  kategori: string;
  satisFiyati: string;
  urunUrl: string;
};

/** İç nesneden ad alanı — `category`/`brand` ikisi de `{id,name}`. */
function icAd(v: unknown): string {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return "";
  return dize((v as Record<string, unknown>).name);
}

function dize(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** Bilinmeyen sıfıra çevrilmez: alan yoksa `undefined` kalır. */
function sayiVeyaYok(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * ONAYLI ürün → VARYANT BAŞINA bir normal satır.
 *
 * ⛔ `approved: true` ve `rejected: false` **ucun kimliğinden** yazılır, ham
 * kayıttan değil — o alanlar cevapta YOK. Bunu yazmazsak `listelemeDurumu`
 * her onaylı ürüne "ONAY_BEKLIYOR" der ve panel baştan sona yanlış olurdu.
 *
 * ⚠ VARYANTI OLMAYAN ÜRÜN SESSİZCE DÜŞMEZ: dizi boşsa ürün seviyesinden tek
 * satır üretilir ve barkodu boş kalır — "okuyamadım" ile "yok" ayrı kalsın.
 */
export function onayliUrunuNormallestir(ham: Record<string, unknown>): NormalUrun[] {
  const productMainId = dize(ham.productMainId);
  const varyantlar = Array.isArray(ham.variants) ? ham.variants : [];

  if (varyantlar.length === 0) {
    return [
      {
        approved: true,
        rejected: false,
        archived: undefined,
        locked: undefined,
        blacklisted: undefined,
        onSale: undefined,
        quantity: undefined,
        barcode: "",
        stockCode: "",
        productMainId,
        redSebepleri: [],
        baslik: dize(ham.title),
        kategori: icAd(ham.category),
        satisFiyati: "",
        urunUrl: "",
      },
    ];
  }

  return varyantlar.map((hv) => {
    const v = (hv ?? {}) as Record<string, unknown>;
    const stok = (v.stock ?? {}) as Record<string, unknown>;
    const fiyat = (v.price ?? {}) as Record<string, unknown>;
    return {
      approved: true,
      rejected: false,
      archived: v.archived,
      locked: v.locked,
      blacklisted: v.blacklisted,
      onSale: v.onSale,
      /** ⚠ ADET `variants[].stock.quantity` — ürün seviyesinde YOK. */
      quantity: sayiVeyaYok(stok.quantity),
      barcode: dize(v.barcode),
      stockCode: dize(v.stockCode),
      productMainId,
      redSebepleri: [],
      baslik: dize(ham.title),
      kategori: icAd(ham.category),
      /** ⚠ FİYAT VARYANTTA — aynı içeriğin varyantları farklı fiyatlı olabilir. */
      satisFiyati: dize(fiyat.salePrice),
      urunUrl: dize(v.productUrl),
    };
  });
}

/**
 * ONAYSIZ ürün → tek normal satır.
 *
 * ⛔ BAYRAKLAR `undefined` BIRAKILIR — uç onları HİÇ göndermiyor. `false`
 * yazmak "ölçtüm, arşivli değil" demek olurdu; oysa bakmadık.
 * _(Anayasa: "varsayılan değer alanın anlamından türetilir".)_
 *
 * ⚠ `status` KAPALI KÜME DEĞİL, DİZE: ölçülen değerler `rejected` ve
 * `pendingApproval`. Tanınmayan bir değer `rejected` SAYILMAZ — bilmediğimiz
 * bir durumu "reddedildi" diye etiketlemek uydurma olurdu; kayıt zaten
 * onaysız uçtan geldiği için `approved: false` ile ONAY_BEKLIYOR'a düşer.
 */
export function onaysizUrunuNormallestir(ham: Record<string, unknown>): NormalUrun {
  const sebepler = Array.isArray(ham.rejectReasonDetails) ? ham.rejectReasonDetails : [];
  return {
    approved: false,
    rejected: dize(ham.status) === "rejected",
    archived: undefined,
    locked: undefined,
    blacklisted: undefined,
    onSale: undefined,
    /** ⚠ ADET BURADA ÜRÜN SEVİYESİNDE — onaylı uçtan FARKLI yer. */
    quantity: sayiVeyaYok(ham.quantity),
    barcode: dize(ham.barcode),
    stockCode: dize(ham.stockCode),
    productMainId: dize(ham.productMainId),
    redSebepleri: sebepler
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return [dize(o.rejectReason), dize(o.rejectReasonDetail)]
          .filter((x) => x !== "")
          .join(" — ");
      })
      .filter((x) => x !== ""),
    baslik: dize(ham.title),
    kategori: icAd(ham.category),
    /** ⚠ ONAYSIZ UÇTA FİYAT ÜRÜN SEVİYESİNDE — onaylıdan farklı yer. */
    satisFiyati: dize(ham.salePrice),
    /** ⛔ Onaysız uç `productUrl` GÖNDERMİYOR — ürün henüz vitrinde yok. */
    urunUrl: "",
  };
}

/** İki ucun ham kayıtları → tek normal liste. */
export function v2KayitlariniNormallestir(girdi: {
  onayli: Record<string, unknown>[];
  onaysiz: Record<string, unknown>[];
}): NormalUrun[] {
  return [
    ...girdi.onayli.flatMap(onayliUrunuNormallestir),
    ...girdi.onaysiz.map(onaysizUrunuNormallestir),
  ];
}

/**
 * ============================================================================
 *  ⛔ ÖLÇÜLDÜ AMA KULLANILMIYOR — `hasViolation`
 * ----------------------------------------------------------------------------
 *  Onaylı uçtaki varyantlar `hasViolation: boolean` taşıyor ve v1'de bu alan
 *  YOKTU. Adı "satılamaz" demeyi çağrıştırıyor — ama ne anlama geldiğini
 *  BİLMİYORUZ ve Trendyol belgesi bunu tanımlamıyor.
 *
 *  Sınıflandırmaya katılsaydı, anlamını ölçmeden bir ürünü "pasif" ilan etmiş
 *  olurduk. _(Anayasa: "sistem, kendi defterinde takip etmediği şey hakkında
 *  iddia kurmaz".)_
 *
 *  ⏭ AÇILIŞ ŞARTI: `hasViolation: true` olan bir ürün canlıda GERÇEKTEN
 *  satılamaz hâlde görülürse (ya da TY bunu belgelerse) alan karara katılır
 *  ve `listelemeDurumu`ya bir kapı olarak girer.
 * ============================================================================
 */
export const OLCULDU_KULLANILMIYOR = ["hasViolation", "docNeeded"] as const;
