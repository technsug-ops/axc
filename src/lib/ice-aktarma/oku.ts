import readXlsxFile from "read-excel-file/node";

import { SAYFALAR, SUTUNLAR, type SayfaAnahtari } from "./sutunlar";

import type { HamSatir, HamVeri } from "./dogrula";

/**
 * ============================================================================
 *  YÜKLENEN DOSYAYI OKUMA
 * ----------------------------------------------------------------------------
 *  Dosyayı HAM METİN olarak okur; hiçbir doğrulama yapmaz, tip dönüştürmez.
 *  Yorumlama işi tamamen `dogrula.ts`e aittir — orası saf ve sınanabilir.
 *
 *  BAŞLIK EŞLEŞTİRME: sütunlar dosyadaki SIRAYA göre değil, BAŞLIK METNİNE
 *  göre bulunur. Kullanıcı sütunların yerini değiştirse veya araya kendi
 *  notunu eklese bile dosya okunur. Eşleştirme büyük/küçük harf ve baştaki
 *  sondaki boşluğa duyarsızdır.
 *
 *  Elektronik tablo hücreleri sayı/tarih olarak da gelebilir; hepsi metne
 *  çevrilir ki doğrulayıcı tek bir biçimle uğraşsın.
 * ============================================================================
 */

export type OkumaSonucu = {
  veri: HamVeri;
  /** Dosyada bulunamayan sayfalar — hepsi boş sayılır, hata değildir. */
  bulunmayanSayfalar: SayfaAnahtari[];
  /** Bir sayfada eksik olan zorunlu sütun başlıkları. */
  eksikSutunlar: { sayfa: SayfaAnahtari; sutun: string }[];
};

function metne(deger: unknown): string {
  if (deger === null || deger === undefined) return "";
  if (deger instanceof Date) {
    // Tarih hücresi Date olarak gelirse doğrulayıcının anladığı biçime çevir.
    const ay = String(deger.getUTCMonth() + 1).padStart(2, "0");
    const gun = String(deger.getUTCDate()).padStart(2, "0");
    return `${deger.getUTCFullYear()}-${ay}-${gun}`;
  }
  return String(deger).trim();
}

function anahtarla(deger: string): string {
  return deger.trim().toLocaleLowerCase("tr");
}

/**
 * @param basliklar Sayfa ve sütun anahtarlarının o anki dildeki karşılıkları.
 *                  Sözlükten gelir; kod dile bağlanmaz.
 */
export async function dosyayiOku(
  icerik: Buffer,
  basliklar: {
    sayfaAdlari: Record<SayfaAnahtari, string>;
    sutunAdlari: Record<string, string>;
    /**
     * Şablon zorunlu sütunların başlığına bu işareti ekler ("SKU (zorunlu)").
     * Okuyucu eşleştirmeden ÖNCE söker; aksi hâlde sistem kendi ürettiği
     * şablonu okuyamazdı. Bu hata 10.08.2026'da git-gel testinde yakalandı.
     */
    zorunluIsareti: string;
  },
): Promise<OkumaSonucu> {
  const isaret = anahtarla(basliklar.zorunluIsareti);

  /** Başlığı karşılaştırmaya hazırlar: işareti söker, normalleştirir. */
  function basligiSadelestir(ham: unknown): string {
    let metin = anahtarla(metne(ham));
    if (isaret && metin.endsWith(isaret)) {
      metin = metin.slice(0, -isaret.length).trim();
    }
    return metin;
  }

  const sayfalar = await readXlsxFile(icerik);

  const veri: HamVeri = { urunler: [], acilisStogu: [], kanalSku: [] };
  const bulunmayanSayfalar: SayfaAnahtari[] = [];
  const eksikSutunlar: { sayfa: SayfaAnahtari; sutun: string }[] = [];

  for (const sayfaAnahtari of SAYFALAR) {
    const aranan = anahtarla(basliklar.sayfaAdlari[sayfaAnahtari]);
    const sayfa = sayfalar.find((s) => anahtarla(s.sheet) === aranan);

    if (!sayfa || sayfa.data.length === 0) {
      bulunmayanSayfalar.push(sayfaAnahtari);
      continue;
    }

    // --- başlık satırı: sütun anahtarı -> kolon indeksi ---
    const basliksatiri = sayfa.data[0].map(basligiSadelestir);
    const kolonlar = new Map<string, number>();

    for (const sutun of SUTUNLAR[sayfaAnahtari]) {
      const baslik = anahtarla(basliklar.sutunAdlari[sutun.anahtar] ?? "");
      const indeks = basliksatiri.indexOf(baslik);
      if (indeks === -1) {
        // Zorunlu sütunun başlığı yoksa sayfa okunamaz.
        if (sutun.zorunlu) {
          eksikSutunlar.push({ sayfa: sayfaAnahtari, sutun: sutun.anahtar });
        }
        continue;
      }
      kolonlar.set(sutun.anahtar, indeks);
    }

    if (eksikSutunlar.some((e) => e.sayfa === sayfaAnahtari)) continue;

    // --- veri satırları (başlık 1. satır, veri 2'den başlar) ---
    const satirlar: HamSatir[] = [];
    for (let i = 1; i < sayfa.data.length; i++) {
      const hamSatir = sayfa.data[i];
      const hucreler: Record<string, string> = {};
      let doluMu = false;

      for (const [anahtar, indeks] of kolonlar) {
        const deger = metne(hamSatir[indeks]);
        hucreler[anahtar] = deger;
        if (deger !== "") doluMu = true;
      }

      // Tamamen boş satır sessizce atlanır — dosya sonundaki boşluklar
      // yüzünden "satır 4831: SKU zorunlu" hataları çıkmasın.
      if (doluMu) satirlar.push({ satirNo: i + 1, hucreler });
    }

    veri[sayfaAnahtari] = satirlar;
  }

  return { veri, bulunmayanSayfalar, eksikSutunlar };
}
