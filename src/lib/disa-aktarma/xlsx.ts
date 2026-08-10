import writeXlsxFile, { type SheetData } from "write-excel-file/node";

/**
 * ============================================================================
 *  DIŞA AKTARMA — ORTAK XLSX ÜRETİCİ
 * ----------------------------------------------------------------------------
 *  Hem "ekrandaki listeyi indir" hem "tüm veriyi dök" aynı üreticiyi kullanır.
 *  Her sayfa: kalın başlık satırı + veri satırları.
 *
 *  HÜCRE DEĞERİ HER ZAMAN METİN. Sayıya çevirmek cazip ama tehlikeli:
 *  "0012" gibi kodların başındaki sıfır uçar, uzun barkodlar bilimsel
 *  gösterime düşer. Dışa aktarmanın işi veriyi KORUMAK.
 * ============================================================================
 */

export type Sayfa = {
  ad: string;
  basliklar: string[];
  satirlar: (string | number | null | undefined)[][];
  /** Sütun genişlikleri; verilmezse başlık uzunluğundan tahmin edilir. */
  genislikler?: number[];
};

function metne(deger: string | number | null | undefined): string {
  if (deger === null || deger === undefined) return "";
  return String(deger);
}

export async function xlsxUret(sayfalar: Sayfa[]): Promise<Buffer> {
  const veri = sayfalar.map((sayfa) => ({
    sheet: sayfa.ad.slice(0, 31), // Excel sayfa adı sınırı
    data: [
      sayfa.basliklar.map((b) => ({
        value: b,
        type: String,
        fontWeight: "bold" as const,
        backgroundColor: "#EEEEEE",
        align: "left" as const,
      })),
      ...sayfa.satirlar.map((satir) =>
        satir.map((hucre) => ({ value: metne(hucre), type: String })),
      ),
    ] as SheetData,
    columns: (
      sayfa.genislikler ??
      sayfa.basliklar.map((b) => Math.min(40, Math.max(12, b.length + 4)))
    ).map((width) => ({ width })),
  }));

  return writeXlsxFile(veri).toBuffer();
}

/** İndirme başlıkları — dosya adı tarayıcıda doğru görünsün. */
export function indirmeBasliklari(dosyaAdi: string) {
  return {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(dosyaAdi)}"`,
    "Cache-Control": "no-store",
  };
}
