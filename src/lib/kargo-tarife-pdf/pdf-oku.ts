import { tutarBelirteclerineAyir, tutarCoz } from "./deger";
import { desiDizisiniDogrula, monotonlukUyarilari } from "./dogrulama";
import { sutunlaraEsle, type Sutun } from "./sutun-esleme";

/**
 * ============================================================================
 *  KARGO TARİFESİ PDF OKUMA (K202, 17.09.2026)
 * ----------------------------------------------------------------------------
 *  Hepsiburada resmi kargo tarifesi PDF'i (desi başına 11 taşıyıcı fiyatı)
 *  doğrudan tarayıcıdan yüklenip ayrıştırılır — dünkü tek seferlik betik
 *  (`canli-hb-kargo-tarifesi-yukle.ts`) elle `pdftotext` çalıştırıp CSV
 *  üretmemi gerektiriyordu; bu KALICI değildi (K202, kullanıcı kararı
 *  17.09.2026: "PDF ile bunun programın içerisinden çözümü olmalı").
 *
 *  ⛔ `pdftotext -table` KULLANILMADI — o CLI aracı Vercel'in serverless
 *  ortamında YOK (harici ikili, kurulum garanti değil) VE sütun genişliğini
 *  SAYFA BAŞINA yeniden hesaplıyor: bir taşıyıcının bir sayfada HİÇ değeri
 *  yoksa (ör. hepsiJET desi>60) o sayfanın TÜMÜNDE sütunlar KAYIYORDU —
 *  16.09.2026'da tam bu yüzden elle doğrulama gerekmişti.
 *
 *  ⭐ BUNUN YERİNE `pdfjs-dist` (saf JS/WASM, harici ikili YOK, Vercel Node
 *  çalışma zamanında sorunsuz) HER METİN PARÇASININ KENDİ X KONUMUNU verir.
 *  Sütun ataması sıra numarasıyla DEĞİL, KONUMLA yapılır (`sutun-esleme.ts`)
 *  — bu yüzden eksik bir taşıyıcı sütunu KAYMAZ, sadece o satırda YOK olur.
 *
 *  ⚠ CANLI ÖLÇÜM (17.09.2026, gerçek PDF ile): 4501 satırın 1643'ünde yüksek
 *  desi tutarı genişliği komşu sütuna dokunuyor ve pdfjs iki değeri TEK metin
 *  parçası olarak veriyor (`deger.ts` → `tutarBelirteclerineAyir`); HER ZAMAN
 *  tam iki değer, üç ve üzeri hiç görülmedi — yine de kod N'e genelleşir.
 *
 *  ⛔ BAŞLIK SATIRI YALNIZ SAYFA 1'DE VAR — sonraki sayfalar doğrudan veriyle
 *  başlıyor (ölçüldü). Sütun x konumları bu yüzden yalnız sayfa 1'den okunur
 *  ve BÜTÜN belgeye uygulanır — aynı PDF şablonunda sütun x'leri sayfa
 *  boyunca SABİTTİR (ölçüldü: sayfa 1/2/66 aynı x'lerde hizalı).
 *
 *  ⛔ HİÇBİR AYKIRILIK UYDURULARAK GEÇİLMEZ. Desi sırası bozuksa, mükerrer
 *  satır varsa ya da bir değer sayıya çevrilemiyorsa OKUMA DURUR ve HATA
 *  koduyla döner — kısmi/şüpheli bir sonuç önizlemeye hiç gelmez.
 * ============================================================================
 */

export type KargoTarifePdfHatasi =
  | "PDF_OKUNAMADI"
  | "SATIR_YOK"
  | "TARIH_BULUNAMADI"
  | "BASLIK_BULUNAMADI"
  | "GECERSIZ_DEGER"
  | "SUTUN_YETERSIZ"
  | "MUKERRER_DESI"
  | "SIRA_BOZUK"
  | "DESI_BOSLUGU";

export type PdfOkumaSonucu =
  | { tamam: false; kod: KargoTarifePdfHatasi; ayrinti: string }
  | {
      tamam: true;
      /** PDF'in kendi beyanı — "10 Eylül 2026 itibariyle geçerli". */
      etkinTarih: Date;
      /** Taşıyıcı adları, PDF'teki soldan sağa SIRASIYLA (DB adı DEĞİL — ham metin). */
      sutunlar: string[];
      satirlar: { desi: number; degerler: { ad: string; tutar: number }[] }[];
      /** Engelleyici değil — önizlemede gösterilir, karar kullanıcının. */
      uyarilar: string[];
    };

/** Türkçe ay adı → ay numarası (1-12). Türkçe yerel ayarı OLMADAN çözülür —
 *  sunucu saat dilimi/yerel ayarına bağımlı olmasın diye sabit tablo. */
const AY_ADLARI: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

/** "10 Eylül 2026 itibariyle geçerli olacaktır." → Date (UTC gece yarısı). */
export function etkinTarihiCoz(metin: string): Date | null {
  const m = metin.match(/(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/);
  if (!m) return null;
  const gun = Number(m[1]);
  const ay = AY_ADLARI[m[2]!.toLocaleLowerCase("tr-TR")];
  const yil = Number(m[3]);
  if (!ay || !Number.isFinite(gun) || gun < 1 || gun > 31 || !Number.isFinite(yil)) {
    return null;
  }
  return new Date(Date.UTC(yil, ay - 1, gun));
}

type MetinOgesi = { str: string; transform: number[]; width: number };

export async function hbKargoTarifesiPdfOku(bayt: Uint8Array): Promise<PdfOkumaSonucu> {
  let doc: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> };
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    doc = await pdfjsLib.getDocument({
      data: bayt,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
    }).promise;
  } catch (e) {
    return { tamam: false, kod: "PDF_OKUNAMADI", ayrinti: String(e).slice(0, 300) };
  }
  if (doc.numPages < 1) {
    return { tamam: false, kod: "SATIR_YOK", ayrinti: "PDF'te hiç sayfa yok" };
  }

  const sayfa1 = await doc.getPage(1);
  const icerik1 = await sayfa1.getTextContent();
  const itemler1 = (icerik1.items as MetinOgesi[]).filter((it) => it.str.trim() !== "");

  let etkinTarih: Date | null = null;
  for (const it of itemler1) {
    const t = etkinTarihiCoz(it.str);
    if (t) {
      etkinTarih = t;
      break;
    }
  }
  if (!etkinTarih) {
    return {
      tamam: false,
      kod: "TARIH_BULUNAMADI",
      ayrinti: "PDF metninde 'GG Ay YYYY' biçiminde bir geçerlilik tarihi bulunamadı",
    };
  }

  const desiBasligi = itemler1.find((it) => it.str.trim() === "Desi");
  if (!desiBasligi) {
    return { tamam: false, kod: "BASLIK_BULUNAMADI", ayrinti: "'Desi' başlık hücresi bulunamadı" };
  }
  const baslikY = desiBasligi.transform[5]!;
  const baslikSatiri = itemler1
    .filter((it) => Math.abs(it.transform[5]! - baslikY) < 0.5 && it.str.trim() !== "Desi")
    .sort((a, b) => a.transform[4]! - b.transform[4]!);
  if (baslikSatiri.length < 1) {
    return {
      tamam: false,
      kod: "BASLIK_BULUNAMADI",
      ayrinti: "'Desi' dışında hiçbir taşıyıcı sütun başlığı bulunamadı",
    };
  }
  const sutunlar: Sutun[] = baslikSatiri.map((it) => ({ ad: it.str.trim(), x: it.transform[4]! }));

  const satirlar: { desi: number; degerler: { ad: string; tutar: number }[] }[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const icerik = p === 1 ? icerik1 : await (await doc.getPage(p)).getTextContent();
    const itemler = (icerik.items as MetinOgesi[]).filter((it) => it.str.trim() !== "");

    const satirHaritasi = new Map<number, MetinOgesi[]>();
    for (const it of itemler) {
      const y = Math.round(it.transform[5]! * 100) / 100;
      const grup = satirHaritasi.get(y);
      if (grup) grup.push(it);
      else satirHaritasi.set(y, [it]);
    }
    /** ⚠ Y AZALAN — PDF koordinatı yukarıdan aşağı AZALIR; okuma sırası budur. */
    const yler = [...satirHaritasi.keys()].sort((a, b) => b - a);

    for (const y of yler) {
      const hucreler = satirHaritasi.get(y)!.sort((a, b) => a.transform[4]! - b.transform[4]!);
      const ilkMetin = hucreler[0]!.str.trim();
      if (!/^\d+$/.test(ilkMetin)) continue; // başlık/tarih satırı — veri değil

      const desi = Number(ilkMetin);
      const belirtecler: { x: number; tutar: number }[] = [];

      for (const h of hucreler.slice(1)) {
        const parcalar = tutarBelirteclerineAyir(h.str);
        if (parcalar.length === 0) continue;
        const toplamUzunluk = h.str.length;
        let ofset = 0;
        for (const parca of parcalar) {
          const tutar = tutarCoz(parca);
          if (tutar === null) {
            return {
              tamam: false,
              kod: "GECERSIZ_DEGER",
              ayrinti: `sayfa ${p}, desi=${desi}: "${parca}" bir tutar olarak okunamadı`,
            };
          }
          const parcaX = h.transform[4]! + (h.width ?? 0) * (toplamUzunluk === 0 ? 0 : ofset / toplamUzunluk);
          belirtecler.push({ x: parcaX, tutar });
          ofset += parca.length + 1;
        }
      }

      const esleme = sutunlaraEsle(sutunlar, belirtecler);
      if (!esleme.tamam) {
        return {
          tamam: false,
          kod: "SUTUN_YETERSIZ",
          ayrinti: `sayfa ${p}, desi=${desi}: ${esleme.belirtecSirasi + 1}. değer için uygun sütun kalmadı (${belirtecler.length} değer, ${sutunlar.length} sütun)`,
        };
      }
      satirlar.push({ desi, degerler: esleme.eslesenler });
    }
  }

  if (satirlar.length === 0) {
    return { tamam: false, kod: "SATIR_YOK", ayrinti: "PDF'te hiçbir veri satırı bulunamadı" };
  }

  const siraSonucu = desiDizisiniDogrula(satirlar.map((s) => s.desi));
  if (!siraSonucu.tamam) {
    return { tamam: false, kod: siraSonucu.kod, ayrinti: siraSonucu.ayrinti };
  }

  return {
    tamam: true,
    etkinTarih,
    sutunlar: sutunlar.map((s) => s.ad),
    satirlar,
    uyarilar: monotonlukUyarilari(satirlar),
  };
}
