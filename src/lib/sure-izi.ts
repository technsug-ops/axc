import { cache } from "react";

/**
 * ============================================================================
 *  SÜRE İZİ — TEST İÇİN AÇILDI, ÜRETİM ÖZELLİĞİ DEĞİL (K332, 12.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı onayı 12.10.2026 («ekleyelim»). Yerelde ölçülen hız kazançları
 *  canlıya yansımadı (panel telefonda 1,3–3,1 sn); yerel makine canlıyı
 *  temsil etmiyor (veritabanı aynı makinede, ağ gecikmesi yok). Bu yardımcı
 *  panelin her açılışında adımların istek başından itibaren kaç ms'de
 *  bittiğini Vercel'in sunucu kaydına TEK SATIR yazar (`[sure-izi]`).
 *
 *  · Ekranda HİÇBİR ŞEY değişmez; veritabanına HİÇBİR ŞEY yazılmaz.
 *  · Kayda yalnız adım adları ve milisaniyeler girer — kişisel veri, tutar,
 *    ürün adı YOK.
 *  · Ölçüm bitince bu dosya ve çağrıları KALDIRILIR (pano K332).
 *
 *  İstek kapsamı React `cache` ile: aynı isteğin bütün bileşenleri aynı izi
 *  görür, iki istek birbirine karışmaz. Saat, izin İLK çağrıldığı an başlar.
 * ============================================================================
 */

type Iz = { t0: number; kimlik: string; adimlar: string[] };

const istekIzi = cache(
  (): Iz => ({ t0: performance.now(), kimlik: Math.random().toString(36).slice(2, 8), adimlar: [] }),
);

/** Adımın istek başından bu yana kaçıncı ms'de bittiğini not eder. */
export function sureIsareti(ad: string): void {
  const iz = istekIzi();
  iz.adimlar.push(`${ad}=${Math.round(performance.now() - iz.t0)}`);
}

/** O ana kadarki notları tek satır olarak sunucu kaydına yazar. */
export function sureIziniYaz(bolum: string, ek: Record<string, string | number | boolean> = {}): void {
  const iz = istekIzi();
  console.log(`[sure-izi] ${JSON.stringify({ bolum, kimlik: iz.kimlik, ...ek, adimlar: iz.adimlar.join(" ") })}`);
}
