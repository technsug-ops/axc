import { kodEsdegerleri } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  TARİFE HESAPLAMA — PENCERE SEÇİMİ VE SATIR ARAMASI (K234, 22.09.2026)
 * ----------------------------------------------------------------------------
 *  Menüdeki "Tarife hesaplama" kalemi bir KAYIT NUMARASINA gidemez: kullanıcı
 *  `…/tarife/cmub9i…` verdi, o adres gelecek Salı'dan sonra ESKİ pencereyi
 *  açar. Menü `/tarife`ye gider; hangi pencerenin açılacağı BURADA, saf
 *  gövdede karar verilir — ekran değil, değer testi sınar.
 *
 *  ⛔ SESSİZ SEÇİM YOK (K231 dersi): adreste bir pencere kimliği VARSA ve o
 *  kimlik yoksa "en güncel" AÇILMAZ — bulunamadı döner, ekran 404 verir.
 *  Kullanıcı eski bir bağlantıya bastıysa başka bir pencereyi "buymuş"
 *  sanmamalı.
 * ============================================================================
 */

export type PencereSecimi<T> =
  | { durum: "SECILI"; pencere: T }
  | { durum: "GUNCEL"; pencere: T }
  | { durum: "BULUNAMADI" }
  | { durum: "BOS" };

/**
 * En güncel pencere = başlangıcı EN GEÇ olan; eşitlikte SON yüklenen (aynı
 * haftanın dosyası ikinci kez yüklenmişse yenisi geçerlidir).
 */
export function guncelPencereSec<
  T extends { id: string; pencereBaslangic: Date; yuklendiAt: Date },
>(pencereler: readonly T[], seciliId: string | null | undefined): PencereSecimi<T> {
  if (pencereler.length === 0) return { durum: "BOS" };
  const istenen = (seciliId ?? "").trim();
  if (istenen !== "") {
    const bulunan = pencereler.find((p) => p.id === istenen);
    return bulunan ? { durum: "SECILI", pencere: bulunan } : { durum: "BULUNAMADI" };
  }
  const sirali = [...pencereler].sort(
    (a, b) =>
      b.pencereBaslangic.getTime() - a.pencereBaslangic.getTime() ||
      b.yuklendiAt.getTime() - a.yuklendiAt.getTime(),
  );
  return { durum: "GUNCEL", pencere: sirali[0]! };
}

/**
 * "Barkod / ürün adı ile ara" (Halil #6: "tek tek listeden ürün bulmak çok
 * zor"). Kod tarafı EŞDEĞERLERİYLE eşleşir (UPC-A ↔ EAN-13 — K231'de ölçülen
 * çarpışma bu yüzden vardı); ad tarafı Türkçe küçük harfle parça araması.
 */
export function aynaSatirlariniSuz<T extends { kod: string; urunAdi: string | null }>(
  satirlar: readonly T[],
  sorgu: string,
): T[] {
  const q = sorgu.trim();
  if (q === "") return [...satirlar];
  const kodlar = new Set(kodEsdegerleri(q));
  const kucuk = q.toLocaleLowerCase("tr");
  return satirlar.filter(
    (s) =>
      kodlar.has(s.kod) ||
      s.kod.toLocaleLowerCase("tr").includes(kucuk) ||
      (s.urunAdi ?? "").toLocaleLowerCase("tr").includes(kucuk),
  );
}
