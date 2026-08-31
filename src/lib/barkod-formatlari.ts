/**
 * ============================================================================
 *  OKUNAN BARKOD BİÇİMLERİ — SAF LİSTE (K111, 31.08.2026)
 * ----------------------------------------------------------------------------
 *  ⭐ NİYE AYRI DOSYA: bu listeyi sınayan bekçi onu ÇAĞIRARAK ölçsün, kaynak
 *  TARAYARAK değil. `barkod-okuyucu.tsx` modül düzeyinde `prepareZXingModule`
 *  çalıştırıyor ve wasm yolu ayarlıyor; bekçi onu içeri alsaydı tarayıcıya
 *  ait bir kurulum node içinde koşardı. Anayasa: _"saf hesap katmanı, desen
 *  tarayan bekçiye muhtaç olmaz"_.
 *
 *  ── ⛔ AYNI YARA İKİ KEZ AÇILDI ────────────────────────────────────────
 *  ① 25.08.2026 — kargo etiketi akışa girdi, liste `EAN13 · EAN8 · Code128 ·
 *    QRCode` idi ve `ITF` yoktu. hepsiJET etiketi okunmadı.
 *  ② 31.08.2026 — kullanıcı bir Mattel kutusu gösterdi: `1 94735 16205 5`,
 *    12 hane, **UPC-A**. `EAN13` açık olması yetmiyor — zxing kataloğunda
 *    `UPCA` ile `EAN13` KARDEŞ biçimler (ortak ata `EANUPC`), biri ötekini
 *    kapsamaz.
 *
 *  Ölçüldü (canlı, 1104 varyant): 12 haneli barkod **104** (101'i geçerli
 *  kontrol hanesiyle) — kataloğun **%9,2'si** kamerayla okunamıyordu.
 *
 *  ⚠ İKİSİNDE DE HATA "LİSTE KISAYDI" DEĞİL, **LİSTENİN ELLE TUTULMASIYDI.**
 *  Bu yüzden ölçüt tersine çevrildi: `perakendeBoslugu` kütüphanenin KENDİ
 *  perakende kataloğunu alır ve beyansız eksik bırakmayı yasaklar.
 * ============================================================================
 */

/** Ürün etiketlerinde görülen biçimler. */
export const URUN_FORMATLARI = [
  "EAN13",
  "EAN8",
  "UPCA",
  "UPCE",
  "Code128",
  "QRCode",
] as const;

/** Kargo/lojistik etiketlerinde yaygın olanlar. */
export const KARGO_FORMATLARI = [
  "ITF",
  "Code39",
  "Code93",
  "DataMatrix",
  "PDF417",
] as const;

/**
 * ⚠ OKUYUCU HER ZAMAN BİRLEŞİK LİSTEYLE TARAR. Ürün/kargo ayrımı BELGELEME
 * amaçlıdır, davranış değil — `readBarcodes` çağrısı tek liste alıyor.
 * Ayrımın davranışa dönüştüğü sanılırsa "ürün ekranında kargo biçimi kapalı"
 * gibi olmayan bir güvence varsayılır.
 */
export const DESTEKLENEN_FORMATLAR = [
  ...URUN_FORMATLARI,
  ...KARGO_FORMATLARI,
] as const;

/**
 * PERAKENDE AİLESİNDEN BİLEREK DIŞARIDA BIRAKILANLAR — GEREKÇESİYLE.
 *
 * ⚠ BU BİR SÜS DEĞİL, BEKÇİNİN ÖLÇÜTÜ. Beyansız eksik KIRMIZI yanar; yani
 * kütüphane yarın yeni bir perakende biçimi eklerse bekçi onu kendiliğinden
 * sorar ve kimsenin listeyi hatırlaması gerekmez.
 *
 * ⛔ GEREKÇESİZ İSTİSNA VERİLMEZ — muafiyet bedava olmaz.
 */
export const URUN_DISI_PERAKENDE: Record<string, string> = {
  EANUPC: "meta-biçim; EAN2/EAN5'i de içeri alır (aşağıdaki gerekçe)",
  EAN2: "iki haneli EK KOD — tek başına okunursa '12' gibi çöp değer döner",
  EAN5: "beş haneli EK KOD (fiyat eki) — aynı sebep",
  ISBN: "EAN-13 olarak zaten çözülüyor (978/979 öneki); ayrı biçim gereksiz",
  DataBar: "GS1 DataBar — kataloğumuzda ölçüldü, örneği yok",
  DataBarOmni: "DataBar varyantı — aynı gerekçe",
  DataBarStk: "DataBar varyantı — aynı gerekçe",
  DataBarStkOmni: "DataBar varyantı — aynı gerekçe",
  DataBarLtd: "DataBar varyantı — aynı gerekçe",
  DataBarExp: "DataBar varyantı — aynı gerekçe",
  DataBarExpStk: "DataBar varyantı — aynı gerekçe",
};

/**
 * Kütüphanenin perakende kataloğunda olup bizde NE AÇIK NE DE BEYAN EDİLMİŞ
 * biçimler. Boş dönmesi gerekir; dönmüyorsa ya biçim açılacak ya gerekçesi
 * yazılacak.
 *
 * ⭐ SAF: katalog DIŞARIDAN verilir. Gövde `zxing-wasm`i içeri almaz —
 * bekçi kütüphaneden okur, buraya parametre olarak geçer. Böylece bu dosya
 * hem tarayıcıda hem node'da bedelsiz kalır.
 *
 * ⚠ VE GEREKÇESİ BOŞ OLAN BEYAN, BEYAN SAYILMAZ: `"  "` yazarak muafiyet
 * alınamaz.
 */
export function perakendeBoslugu(katalog: readonly string[]): string[] {
  const acik = new Set<string>(URUN_FORMATLARI);
  return katalog.filter((biçim) => {
    if (acik.has(biçim)) return false;
    const gerekce = URUN_DISI_PERAKENDE[biçim];
    return gerekce === undefined || gerekce.trim() === "";
  });
}
