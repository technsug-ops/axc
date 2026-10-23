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

/**
 * SÜTUN TÜRÜ (K363, kullanıcı sorusu 23.10.2026 «best practice bu mu»).
 * «Her hücre metin» kodlar için DOĞRU (baştaki sıfır, uzun barkod) ama sayılar
 * için değil: Excel'de toplam alınamıyor, «100» «20»den önce sıralanıyor.
 * Tür VERİLMEYEN sütun bugünkü gibi METİN kalır — mevcut indirmeler değişmez;
 * listeler türlerini tek tek alır. Sayı hücresine sayı olmayan değer gelirse
 * (ör. «hesaplanamadı») METİN yazılır — uydurulmaz, kaybolmaz.
 */
export type SutunTuru = "metin" | "tamsayi" | "ondalik" | "para" | "oran";
const BICIM: Record<Exclude<SutunTuru, "metin">, string> = {
  tamsayi: "0",
  ondalik: "0.000",
  para: "#,##0.00",
  oran: "0.0",
};

export type Sayfa = {
  ad: string;
  basliklar: string[];
  satirlar: (string | number | null | undefined)[][];
  /** Sütun genişlikleri; verilmezse başlık uzunluğundan tahmin edilir. */
  genislikler?: number[];
  /** Sütun türleri; verilmezse HEPSİ metin (geriye uyumlu). */
  turler?: SutunTuru[];
};

function metne(deger: string | number | null | undefined): string {
  if (deger === null || deger === undefined) return "";
  return String(deger);
}

/** Tek hücre — sayı sütununda sonlu sayı SAYI olarak, başka her şey metin. */
export function hucre(deger: string | number | null | undefined, tur: SutunTuru = "metin") {
  if (tur !== "metin" && typeof deger === "number" && Number.isFinite(deger)) {
    return { value: deger, type: Number, format: BICIM[tur] };
  }
  return { value: metne(deger), type: String };
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
        satir.map((deger, i) => hucre(deger, sayfa.turler?.[i] ?? "metin")),
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
