import writeXlsxFile, { type SheetData } from "write-excel-file/node";

import {
  ORNEK_SATIRLAR,
  SAYFALAR,
  SUTUNLAR,
  type SayfaAnahtari,
} from "./sutunlar";

/**
 * ============================================================================
 *  ŞABLON ÜRETİCİ
 * ----------------------------------------------------------------------------
 *  Boş bir dosya vermek yetmez: kullanıcı neyi nereye yazacağını, hangi
 *  kategorinin geçerli olduğunu ve tarihi hangi biçimde gireceğini bilmeli.
 *  Bu yüzden şablon beş sayfa taşır:
 *
 *    Ürünler · Açılış stoğu · Kanal SKU   -> doldurulacak, ÖRNEK satırlı
 *    Listeler                             -> geçerli kategori/raf/hesap adları
 *    Yardım                               -> kurallar
 *
 *  "Listeler" sayfası kritik: kategori ve raf bulunamazsa dosya REDDEDİLİYOR
 *  (kullanıcı kararı 10.08.2026), o yüzden geçerli adların kopyalanabilir
 *  hâlde elinin altında olması gerekiyor.
 *
 *  ÖRNEK SATIRLAR GRİ VE İTALİK: girilmiş veri sanılmasınlar (İlke #11'in
 *  elektronik tablodaki karşılığı). Yardım sayfasında "örnek satırları silin"
 *  yazar.
 * ============================================================================
 */

export type SablonMetinleri = {
  sayfaAdlari: Record<SayfaAnahtari, string>;
  yardimciSayfaAdlari: { listeler: string; yardim: string };
  sutunAdlari: Record<string, string>;
  /** Listeler sayfasındaki sütun başlıkları. */
  listeBasliklari: {
    kategoriler: string;
    kdvOrani: string;
    raflar: string;
    kanalHesaplari: string;
    paraBirimleri: string;
  };
  /** Yardım sayfasındaki satırlar — sırayla yazılır. */
  yardimSatirlari: string[];
  zorunluIsareti: string;
};

export type SablonVerisi = {
  kategoriler: { ad: string; kdvOrani: string }[];
  raflar: string[];
  kanalHesaplari: string[];
};

const BASLIK_BICIMI = {
  fontWeight: "bold" as const,
  backgroundColor: "#EEEEEE",
  align: "left" as const,
};

const ORNEK_BICIMI = {
  color: "#999999",
  fontStyle: "italic" as const,
};

export async function sablonUret(
  metinler: SablonMetinleri,
  veri: SablonVerisi,
): Promise<Buffer> {
  // NOT: sayfa adının anahtarı `sheet` — `name` DEĞİL. Yanlış anahtar hata
  // vermez, sessizce "Sheet1, Sheet2..." üretir ve okuyucu sayfayı bulamaz.
  const sayfalar: { sheet: string; data: SheetData; columns?: { width: number }[] }[] = [];

  // --- doldurulacak üç sayfa ---
  for (const sayfaAnahtari of SAYFALAR) {
    const sutunlar = SUTUNLAR[sayfaAnahtari];

    const baslikSatiri = sutunlar.map((s) => ({
      value:
        (metinler.sutunAdlari[s.anahtar] ?? s.anahtar) +
        (s.zorunlu ? ` ${metinler.zorunluIsareti}` : ""),
      type: String,
      ...BASLIK_BICIMI,
    }));

    const ornekler = ORNEK_SATIRLAR[sayfaAnahtari].map((satir) =>
      satir.map((hucre) => ({
        value: hucre,
        type: String,
        ...ORNEK_BICIMI,
      })),
    );

    sayfalar.push({
      sheet: metinler.sayfaAdlari[sayfaAnahtari],
      data: [baslikSatiri, ...ornekler] as SheetData,
      columns: sutunlar.map((s) => ({ width: s.genislik })),
    });
  }

  // --- LİSTELER: geçerli değerler, kopyala-yapıştır için ---
  const listeBaslik = [
    metinler.listeBasliklari.kategoriler,
    metinler.listeBasliklari.kdvOrani,
    "",
    metinler.listeBasliklari.raflar,
    "",
    metinler.listeBasliklari.kanalHesaplari,
    "",
    metinler.listeBasliklari.paraBirimleri,
  ].map((v) => ({ value: v, type: String, ...BASLIK_BICIMI }));

  const paraBirimleri = ["TRY", "EUR"];
  const satirSayisi = Math.max(
    veri.kategoriler.length,
    veri.raflar.length,
    veri.kanalHesaplari.length,
    paraBirimleri.length,
  );

  const listeSatirlari: SheetData = [];
  for (let i = 0; i < satirSayisi; i++) {
    listeSatirlari.push([
      { value: veri.kategoriler[i]?.ad ?? "", type: String },
      { value: veri.kategoriler[i]?.kdvOrani ?? "", type: String },
      { value: "", type: String },
      { value: veri.raflar[i] ?? "", type: String },
      { value: "", type: String },
      { value: veri.kanalHesaplari[i] ?? "", type: String },
      { value: "", type: String },
      { value: paraBirimleri[i] ?? "", type: String },
    ]);
  }

  sayfalar.push({
    sheet: metinler.yardimciSayfaAdlari.listeler,
    data: [listeBaslik, ...listeSatirlari] as SheetData,
    columns: [
      { width: 24 },
      { width: 12 },
      { width: 3 },
      { width: 14 },
      { width: 3 },
      { width: 32 },
      { width: 3 },
      { width: 14 },
    ],
  });

  // --- YARDIM ---
  sayfalar.push({
    sheet: metinler.yardimciSayfaAdlari.yardim,
    data: metinler.yardimSatirlari.map((satir, sira) => [
      {
        value: satir,
        type: String,
        ...(sira === 0 ? BASLIK_BICIMI : {}),
        wrap: true,
      },
    ]) as SheetData,
    columns: [{ width: 110 }],
  });

  return writeXlsxFile(
    sayfalar.map((s) => ({
      data: s.data,
      sheet: s.sheet,
      columns: s.columns,
    })),
  ).toBuffer();
}
