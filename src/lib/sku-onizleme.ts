/**
 * ============================================================================
 *  SKU ÖNİZLEMESİ — SAF KURAL (K286, 26.09.2026)
 * ----------------------------------------------------------------------------
 *  Yeni Firma SKU biçimi: KAT-MRK-NNNN   (örn. OYU-LEG-0001)
 *    KAT  = ürünün kategorisinin kodu (`Category.code`)
 *    MRK  = ürünün markasının tablo kodu (`Brand.code`, K285)
 *    NNNN = aynı KAT-MRK ön ekinde sıra numarası (4 hane)
 *
 *  Kullanıcı kararı 26.09.2026: model parçası ADDAN TAHMİN EDİLMEZ (gerçek
 *  veride «1000W» güç değeri, «KX» marka harfleri model sanıldı) → sıra no.
 *  Yeni kod FİRMA SKU'ya yazılacak; eski kod silinmeyecek (ayrı paket).
 *
 *  ⛔ BU MODÜL HİÇBİR ŞEY YAZMAZ. Sıra, girdinin verildiği sırayla dağıtılır
 *  (çağıran KALICI bir sıra verir: ürünün sisteme giriş anı) — aynı veri
 *  her koşumda aynı kodu üretir.
 *  Kod alamayan satır UYDURULMAZ: sebebi söylenir.
 * ============================================================================
 */

export const SIRA_HANESI = 4;

export function skuKodu(kategoriKodu: string, markaKodu: string, sira: number): string {
  return `${kategoriKodu}-${markaKodu}-${String(sira).padStart(SIRA_HANESI, "0")}`;
}

export type OnizlemeDurumu = "HAZIR" | "AYNI" | "KATEGORI_YOK" | "KATEGORI_KODSUZ" | "MARKA_YOK" | "CAKISMA";

export type OnizlemeGirdisi = {
  kimlik: string;
  eskiKod: string;
  kategoriVar: boolean;
  kategoriKodu: string | null;
  markaKodu: string | null;
  /** Bu kaydın KENDİ kodları (SKU · Firma SKU · barkod) — kendisiyle çakışmaz. */
  kendiKodlari: readonly string[];
};

export type OnizlemeSatiri = OnizlemeGirdisi & { yeniKod: string | null; durum: OnizlemeDurumu };

/**
 * @param girdiler KALICI sırada (sisteme giriş anı) — sıra numarası buna göre.
 * @param kullanilanKodlar BÜTÜN kayıtların (önizlenenler ve pasifler dahil)
 *   ŞU ANKİ SKU · Firma SKU · barkod değerleri. Yeni kod başka bir kaydın
 *   kullandığı bir koda denk gelirse o numara ATLANIR, sıradaki denenir.
 */
export function skuOnizlemesi(girdiler: readonly OnizlemeGirdisi[], kullanilanKodlar: ReadonlySet<string>): OnizlemeSatiri[] {
  const sayac = new Map<string, number>();
  return girdiler.map((g): OnizlemeSatiri => {
    if (!g.kategoriVar) return { ...g, yeniKod: null, durum: "KATEGORI_YOK" };
    if (!g.kategoriKodu) return { ...g, yeniKod: null, durum: "KATEGORI_KODSUZ" };
    if (!g.markaKodu) return { ...g, yeniKod: null, durum: "MARKA_YOK" };
    const onEk = `${g.kategoriKodu}-${g.markaKodu}`;
    const dolu = (k: string) => kullanilanKodlar.has(k) && !g.kendiKodlari.includes(k);
    let sira = (sayac.get(onEk) ?? 0) + 1;
    let kod = skuKodu(g.kategoriKodu, g.markaKodu, sira);
    /* Başka kayıtta duran kod atlanır ve SIRADAKİ denenir — çakışan numara kimseye verilmez. */
    let deneme = 0;
    while (dolu(kod) && deneme < 1000) {
      sira++;
      deneme++;
      kod = skuKodu(g.kategoriKodu, g.markaKodu, sira);
    }
    if (dolu(kod)) return { ...g, yeniKod: null, durum: "CAKISMA" };
    sayac.set(onEk, sira);
    return { ...g, yeniKod: kod, durum: kod === g.eskiKod ? "AYNI" : "HAZIR" };
  });
}
