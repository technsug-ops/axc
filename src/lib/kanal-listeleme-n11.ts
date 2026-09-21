import type { KanalListelemeDurumu } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  N11 LİSTELEME DURUMU — SAF ÇEVİRİ (22.09.2026)
 * ----------------------------------------------------------------------------
 *  `GET /ms/product-query` satırını `KanalListelemeDurumu`ya çevirir. Saf:
 *  veritabanına gitmez, `n11-listeleme:dogrula` gövdeyi ÇAĞIRARAK sınar.
 *
 *  ── EŞLEME ÖLÇÜMDEN GELİYOR, TAHMİNDEN DEĞİL (canlı, 22.09.2026) ──────
 *  113 listeleme, iki sayfa, alan doluluğu:
 *
 *      stockCode 113/113 · quantity 113/113 · saleStatus 113/113
 *      status 113/113 (HEPSİ "Active") · barcode 110/113
 *      saleStatus=Out_Of_Stock ⇔ quantity=0   58/58
 *      saleStatus=On_Sale      ⇔ quantity>0   55/55
 *
 *  ⛔ `status` İÇİN YALNIZ "Active" GÖRÜLDÜ. Başka bir değer (askıda?
 *  pasif?) HİÇ ölçülmedi; o değer geldiğinde ne anlama geldiğini
 *  BİLMİYORUZ — bu yüzden "Active" dışı → `BILINMIYOR`, "PASIF" değil.
 *  PASIF demek, ölçmediğimiz bir şey hakkında hüküm kurmak olurdu.
 *  _(Anayasa: "sistem, defterinde takip etmediği şey hakkında iddia
 *  kurmaz"; "alanın adı içeriğinin ne olduğunu söylemez".)_
 *
 *  ⚠ ANAHTAR `stockCode`: 113/113 dolu ve SATICININ girdiği kod — yani
 *  HBCV…, EN100…, LEGO numarası gibi karışık rollerde (tarife dosyasındaki
 *  bağsız kodların kaynağı buydu). Defterle eşleşme `ChannelSku.channelSku`
 *  üzerinden; oradaki kodun bu `stockCode` ile aynı olup olmadığı ilk kuru
 *  koşumda ÖLÇÜLÜR ("kanalda bulunan" sayısı).
 * ============================================================================
 */

export type N11Listing = {
  status?: unknown;
  saleStatus?: unknown;
  quantity?: unknown;
  stockCode?: unknown;
};

export type N11Kaynak =
  | "durum-olculmedi"
  | "stok-okunamadi"
  | "stok-sifir"
  | "satista"
  | "satista-degil";

export function n11Adedi(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function n11ListelemeDurumu(l: N11Listing): {
  durum: KanalListelemeDurumu;
  kaynak: N11Kaynak;
} {
  /** ① Ölçülmemiş `status` değeri → hüküm YOK. */
  if (l.status !== "Active") return { durum: "BILINMIYOR", kaynak: "durum-olculmedi" };

  /** ② Adet okunamadıysa hüküm yok — `0` sayıp STOKSUZ demek iddia olurdu. */
  const adet = n11Adedi(l.quantity);
  if (adet === null) return { durum: "BILINMIYOR", kaynak: "stok-okunamadi" };
  if (adet <= 0) return { durum: "STOKSUZ", kaynak: "stok-sifir" };

  /**
   * ③ Stok var; vitrinde mi? Ölçümde `On_Sale` ⇔ adet>0 birebirdi, ama
   * bağ VERİ DEĞİL GÖZLEMDİR: adet>0 iken başka bir saleStatus gelirse
   * satılamıyordur ve sebebi "stoksuz" DEĞİLDİR — ayrı iz taşır.
   */
  if (l.saleStatus === "On_Sale") return { durum: "ACIK", kaynak: "satista" };
  return { durum: "PASIF", kaynak: "satista-degil" };
}

export function n11Anahtari(l: { stockCode?: unknown }): string {
  return l.stockCode === null || l.stockCode === undefined
    ? ""
    : String(l.stockCode).trim();
}
