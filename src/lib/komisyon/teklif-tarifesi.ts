import { gunDegeri, isTakvimGunu } from "@/lib/donem";
import { basligiNormalle } from "@/lib/tablo/hucre";
import type { SayfaGirdisi } from "@/lib/tablo/tablo-oku";

import type { KomisyonPlatformu } from "./model";
import { yuzdeCoz } from "./okuyucu";
import type {
  TarifeDilimi,
  TarifeOkumasi,
  TarifeSatiri,
} from "./tarife-okuyucu";

/**
 * ============================================================================
 *  TEKLİF DOSYASI → DİLİMLİ TARİFE (K227, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, dosya AÇMAZ. Girdi okunmuş sayfalar, çıktı
 *  `TarifeOkumasi` — yani Trendyol tarifesinin ÜRETTİĞİ şeklin AYNISI.
 *  Aynı plan/yazma yolundan geçer; ikinci bir yazma yolu açılmadı.
 *
 *  ── ESKİ KARAR ÇEVRİLDİ — GEREKÇESİ SİLİNMEDİ ──────────────────────────
 *  02.09.2026'da (K-HB-TEKLIF) şu karar alınmıştı:
 *
 *      "Bu dosya tarife DEĞİL ve tarife olarak yüklenmesi kâr hesabını
 *       bozar. Tarife tablosuna girseydi `dilimBul` senin 15.269'dan
 *       sattığın ürün için %4,7 döndürürdü."
 *
 *  ⛔ O KORKU GERÇEKTİ AMA KOŞULLUYDU: yalnız **mevcut fiyat dilimi tabloya
 *  konmazsa** olur. Konursa `dilimBul(15.269)` → %13 döner, yani doğru.
 *  Trendyol'un tarifesi de aynı mekanizmadır — anayasa onu kendi sözleriyle
 *  yazıyor: _"TY fiyat indirimi karşılığı komisyon indiriyor: 2.000'e %10,
 *  1.750'ye satarsan %7"_. Yani koşulluluk ayırt edici değil; eksik olan
 *  tablonun TEPESİYDİ.
 *
 *  ⭐ KULLANICI TESPİTİ 21.09.2026: _"HB'de her Çarşamba ürünlerin bir kısmı
 *  için teklif veriliyor; teklif edilen rakamı satış fiyatı olarak
 *  işaretlersen o fiyatın komisyonu geçerli. Temel mantık Trendyol ile
 *  aynı."_ Üç kanalın paneli de aynı tabloyu gösteriyor (ölçüldü,
 *  ekran görüntüleriyle göz göze doğrulandı).
 *
 *  ── ÖLÇÜLEN YAPI — ÜÇ KANAL, TEK ŞEKİL ────────────────────────────────
 *  Braun IRT3030 · HB dosyası ve HB panelinin gösterdiği (birebir tuttu):
 *
 *      > 1.801,00            %18     ← mevcut komisyon, ÜST UÇ AÇIK
 *      1.711,01 – 1.801,00   %8,8    ← Teklif 1
 *      1.621,01 – 1.711,00   %7,2    ← Teklif 2
 *              ≤ 1.621,00    %6      ← Teklif 3, ALT UÇ AÇIK
 *
 *  ⚠ HB DOSYASI YALNIZ ÜST FİYATI VERİYOR: bir dilimin ALT sınırı, bir
 *  sonraki teklifin üst fiyatının **bir kuruş üstüdür**. Panelin kendi
 *  gösterimi bunu doğruluyor (`1.711,00 - 1.621,01`).
 *
 *  ⚠ N11 İKİ SINIRI DA VERİYOR (`Üst Limit` + `Alt Limit`) — orada türetme
 *  YAPILMAZ, dosyanın kendi değerleri kullanılır. Dosyanın kendi notu:
 *  _"Hesaplanan Komisyon, girilen fiyata ve sunulan fiyat ARALIKLARINA göre
 *  otomatik hesaplanır."_
 * ============================================================================
 */

/** Teklif tarifesi okunabilen platformlar — okuyucusu olan. */
export const TEKLIF_TARIFESI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [
  "HEPSIBURADA",
  "N11",
];

/**
 * Başlık satırı ilk satır olmak zorunda değil — N11'de 11. satırda.
 * Tavan, binlerce satırlık bir dosyanın ortasındaki rastgele bir hücrenin
 * başlık sanılmasını engeller.
 */
const BASLIK_TARAMA_TAVANI = 20;

/**
 * Bir kuruş. HB dosyasında dilimin alt sınırı türetilirken kullanılır.
 *
 * ⛔ TOLERANS DEĞİL, BİRİM SEÇİMİ: panel `1.711,00 - 1.621,01` yazıyor,
 * yani aralıklar kuruş düzeyinde bitişik. Yuvarlak bir pay bırakmak
 * (ör. 1 TL) iki dilim arasında kimsenin düşmediği bir boşluk açardı.
 */
const KURUS = 0.01;

type Imza = {
  platform: KomisyonPlatformu;
  /** Bu kolonlardan EN AZ BİRİ bulunmalı — dosyaya özgü. */
  ozgun: string[];
  /** Kanal kodunun okunacağı kolon; sırayla denenir. */
  kodBasliklari: string[];
  /** Pencere kolonları. */
  baslangicBasligi: string;
  bitisBasligi: string;
  /** Dilimler tek satırda mı (N11) yoksa iki satırlı başlıkta mı (HB). */
  sekil: "TEK_SATIR" | "IKI_SATIR";
};

const IMZALAR: Imza[] = [
  {
    platform: "HEPSIBURADA",
    ozgun: ["teklif kodu"],
    kodBasliklari: ["sku", "satıcı stok kodu"],
    baslangicBasligi: "başlangıç",
    bitisBasligi: "bitiş",
    sekil: "IKI_SATIR",
  },
  {
    platform: "N11",
    ozgun: ["deal_ıd", "product_ıd"],
    kodBasliklari: ["satıcı stok kodu", "stok kodu"],
    baslangicBasligi: "başlangıç zamnı",
    bitisBasligi: "bitiş zamanı",
    sekil: "TEK_SATIR",
  },
];

export type TeklifTanimasi =
  | {
      durum: "TANINDI";
      platform: KomisyonPlatformu;
      sayfa: string;
      veri: unknown[][];
      basSatir: number;
      imza: Imza;
    }
  | { durum: "TANINMADI"; sayfalar: string[] };

function basliklar(r: unknown[]): string[] {
  return r.map((c) => basligiNormalle(String(c ?? "")));
}

/** Teklif dosyasını ve başlık satırını bulur. */
export function teklifTarifesiTani(sayfalar: SayfaGirdisi[]): TeklifTanimasi {
  for (const sayfa of sayfalar) {
    const veri = sayfa.data ?? [];
    const tavan = Math.min(veri.length, BASLIK_TARAMA_TAVANI);
    for (let i = 0; i < tavan; i++) {
      const bas = basliklar(veri[i] ?? []);
      for (const imza of IMZALAR) {
        const ozgunVar = imza.ozgun.some((o) => bas.includes(o));
        const kodVar = imza.kodBasliklari.some((k) => bas.includes(k));
        if (ozgunVar && kodVar) {
          return {
            durum: "TANINDI",
            platform: imza.platform,
            sayfa: sayfa.sheet,
            veri,
            basSatir: i,
            imza,
          };
        }
      }
    }
  }
  return { durum: "TANINMADI", sayfalar: sayfalar.map((s) => s.sheet) };
}

/** Bir satırdaki ham teklif: üst fiyat, (varsa) alt fiyat, oran. */
type HamTeklif = { ust: number; alt: number | null; oran: number };

/**
 * HB şekli: ÜST satırda `Teklif N`, ALT satırda `Üst Fiyat` + `Komisyon`.
 * Dosya alt sınırı vermez; bir sonraki teklifin üstünden türetilir.
 */
function hbTeklifleri(
  ustBas: string[],
  altBas: string[],
  satir: unknown[],
): HamTeklif[] {
  const cikti: HamTeklif[] = [];
  for (let i = 0; i < ustBas.length; i++) {
    if (!/^teklif\s*\d+$/.test(ustBas[i] ?? "")) continue;
    /** `Üst Fiyat` bu kolonda, `Komisyon` bir sağında (birleşik başlık). */
    if (altBas[i] !== basligiNormalle("Üst Fiyat")) continue;
    const ust = sayiCoz(satir[i]);
    const oran = yuzdeCoz(satir[i + 1]);
    if (ust === null || oran === null) continue;
    cikti.push({ ust, alt: null, oran });
  }
  return cikti;
}

/** N11 şekli: tek satırda `N. Teklif Üst Limit / Alt Limit / Komisyon`. */
function n11Teklifleri(bas: string[], satir: unknown[]): HamTeklif[] {
  const cikti: HamTeklif[] = [];
  for (let i = 0; i < bas.length; i++) {
    const b = bas[i] ?? "";
    if (!/teklif.*üst limit/.test(b)) continue;
    const no = b.match(/(\d+)\s*\.\s*teklif/)?.[1];
    if (no === undefined) continue;
    const altIdx = bas.findIndex((x) => x === `${no}. teklif alt limit`);
    const oranIdx = bas.findIndex((x) => x === `${no}. teklif komisyon`);
    const ust = sayiCoz(satir[i]);
    const oran = oranIdx >= 0 ? yuzdeCoz(satir[oranIdx]) : null;
    if (ust === null || oran === null) continue;
    cikti.push({
      ust,
      alt: altIdx >= 0 ? sayiCoz(satir[altIdx]) : null,
      oran,
    });
  }
  return cikti;
}

/** Hücreden sayı — virgül ondalık ayıraç. Çözülemezse `null`. */
function sayiCoz(ham: unknown): number | null {
  if (typeof ham === "number") return Number.isFinite(ham) ? ham : null;
  const metin = String(ham ?? "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (metin === "") return null;
  /**
   * ⚠ NOKTA BİNLİK AYIRAÇ OLABİLİR: "1.801,00" → 1801. Virgül varsa nokta
   * binliktir; yoksa nokta ondalıktır ("7499.5").
   */
  const sayi = metin.includes(",")
    ? Number(metin.replace(/\./g, "").replace(",", "."))
    : Number(metin);
  return Number.isFinite(sayi) ? sayi : null;
}

/**
 * Ham tekliflerden DİLİM TABLOSU kurar — tepesine mevcut komisyonu koyarak.
 *
 * ⛔ TEPE DİLİM ŞART. Konmazsa `dilimBul(bugünkü fiyat)` en yakın İNDİRİMLİ
 * oranı döndürür: komisyon olduğundan düşük, kâr olduğundan YÜKSEK çıkar ve
 * rakam tamamen makul görünür. 02.09.2026'da bu dosyanın reddedilme sebebi
 * tam olarak buydu.
 */
export function dilimleriKur(
  teklifler: HamTeklif[],
  guncelKomisyon: number | null,
): TarifeDilimi[] {
  /** Yüksek fiyattan düşüğe — dilim sırası fiyat sırasıdır. */
  const sirali = [...teklifler].sort((a, b) => b.ust - a.ust);
  const dilimler: TarifeDilimi[] = [];

  if (sirali.length === 0) return dilimler;

  if (guncelKomisyon !== null) {
    dilimler.push({
      sira: 1,
      altLimit: sirali[0].ust + KURUS,
      ustLimit: null,
      oran: guncelKomisyon,
    });
  }

  sirali.forEach((t, i) => {
    const sonraki = sirali[i + 1];
    /**
     * ALT SINIR: dosya veriyorsa onunki (N11), vermiyorsa bir sonraki
     * teklifin üstünün bir kuruş üstü (HB). Son dilimin altı AÇIK.
     */
    const alt =
      t.alt !== null ? t.alt : sonraki ? sonraki.ust + KURUS : null;
    dilimler.push({
      sira: dilimler.length + 1,
      altLimit: alt,
      ustLimit: t.ust,
      oran: t.oran,
    });
  });

  return dilimler;
}

/** Tarih hücresi → `Date`; değilse `null`. */
function tarihCoz(ham: unknown): Date | null {
  return ham instanceof Date && !Number.isNaN(ham.getTime()) ? ham : null;
}

/**
 * Tanınan teklif dosyasını dilimli tarifeye çevirir.
 *
 * ⚠ PENCERE: teklifler ÜRÜN BAŞINA ayrı tarih taşıyor (ölçüldü: HB 44
 * üründe 27 farklı pencere). Kayıt yükleme başına TEK pencere tutuyor;
 * bu yüzden dosyadaki **en yaygın** aralık seçilir — HB'de bu, panelin
 * sekmesinde yazan haftalık aralığın aynısı. Dışarıda kalan satırlar
 * `pencereDisi` diye SAYILIR; sessizce yutulmaz.
 */
export function teklifTarifesiOku(tanima: TeklifTanimasi): TarifeOkumasi & {
  pencereDisi: number;
} {
  if (tanima.durum === "TANINMADI") {
    return {
      pencere: null,
      tarifeGrubu: null,
      satirlar: [],
      mukerrerElenen: 0,
      atlananlar: [],
      eksikSutunlar: ["teklif kolonları"],
      pencereDisi: 0,
    };
  }

  const ustBas = basliklar(tanima.veri[tanima.basSatir] ?? []);
  const altBas = basliklar(tanima.veri[tanima.basSatir + 1] ?? []);
  const veriBasi =
    tanima.imza.sekil === "IKI_SATIR" ? tanima.basSatir + 2 : tanima.basSatir + 1;

  const iKod = tanima.imza.kodBasliklari
    .map((k) => ustBas.indexOf(k))
    .find((x) => x >= 0);
  const iAd = ustBas.indexOf("ürün adı");
  const iFiyat = ustBas.findIndex((b) => b.includes("mevcut") && b.includes("fiyat"));
  const iOran = ustBas.findIndex((b) => b.includes("mevcut") && b.includes("komisyon"));
  const iBas = ustBas.indexOf(tanima.imza.baslangicBasligi);
  const iBit = ustBas.indexOf(tanima.imza.bitisBasligi);

  const eksik: string[] = [];
  if (iKod === undefined) eksik.push(tanima.imza.kodBasliklari[0] ?? "kod");
  if (iOran < 0) eksik.push("Mevcut Komisyon");
  if (eksik.length > 0) {
    return {
      pencere: null,
      tarifeGrubu: null,
      satirlar: [],
      mukerrerElenen: 0,
      atlananlar: [],
      eksikSutunlar: eksik,
      pencereDisi: 0,
    };
  }

  const satirlar: TarifeSatiri[] = [];
  const atlananlar: { satirNo: number; sebep: string }[] = [];
  const gorulenKod = new Set<string>();
  let mukerrerElenen = 0;
  /** Pencere adayları — en yaygını seçilecek. */
  const pencereSayaci = new Map<string, { adet: number; bas: Date; bit: Date }>();

  for (let r = veriBasi; r < tanima.veri.length; r++) {
    const ham = tanima.veri[r] ?? [];
    if (ham.every((c) => c === null)) continue;

    const kod = String(ham[iKod as number] ?? "").trim();
    if (kod === "") continue;
    if (gorulenKod.has(kod)) {
      mukerrerElenen++;
      continue;
    }

    const guncel = yuzdeCoz(ham[iOran]);
    const teklifler =
      tanima.imza.sekil === "IKI_SATIR"
        ? hbTeklifleri(ustBas, altBas, ham)
        : n11Teklifleri(ustBas, ham);

    if (teklifler.length === 0) {
      atlananlar.push({ satirNo: r + 1, sebep: "teklif yok" });
      continue;
    }

    const dilimler = dilimleriKur(teklifler, guncel);
    if (dilimler.length === 0) {
      atlananlar.push({ satirNo: r + 1, sebep: "dilim kurulamadı" });
      continue;
    }

    gorulenKod.add(kod);
    satirlar.push({
      barkod: kod,
      saticiStokKodu: null,
      urunAdi: iAd >= 0 ? String(ham[iAd] ?? "").trim() || null : null,
      dilimler,
      guncelKomisyon: guncel,
      satirNo: r + 1,
    });

    const b = iBas >= 0 ? tarihCoz(ham[iBas]) : null;
    const e = iBit >= 0 ? tarihCoz(ham[iBit]) : null;
    if (b && e) {
      /**
       * ⛔ GRUPLAMA GÜNE GÖRE, SANİYEYE GÖRE DEĞİL — ÖLÇÜMLE BULUNDU.
       * İlk yazımda anahtar tam zaman damgasıydı ve 44 satırın **41'i**
       * "pencere dışı" çıktı: HB teklifleri aynı haftanın aynı gününde ama
       * ÜRÜN BAŞINA farklı dakikada başlıyor (`00:07` · `00:10` · `00:16`
       * · `00:18` · `00:19`…). Saniyeye bakan bir sayaç 27 ayrı pencere
       * görüyordu; oysa operatörün ve panelin gördüğü TEK hafta.
       *
       * İş günü İstanbul takviminden okunur (anayasa: iş saat dilimi sabit).
       */
      const anahtar = `${gunDegeri(isTakvimGunu(b)).toISOString()}|${gunDegeri(
        isTakvimGunu(e),
      ).toISOString()}`;
      const kayit = pencereSayaci.get(anahtar) ?? { adet: 0, bas: b, bit: e };
      kayit.adet++;
      /** Pencerenin UÇLARI en geniş hâliyle tutulur; gün aynı, saat değil. */
      if (b < kayit.bas) kayit.bas = b;
      if (e > kayit.bit) kayit.bit = e;
      pencereSayaci.set(anahtar, kayit);
    }
    void iFiyat;
  }

  /** EN YAYGIN pencere; eşitlikte en erken başlayan. */
  const adaylar = [...pencereSayaci.values()].sort(
    (a, b) => b.adet - a.adet || a.bas.getTime() - b.bas.getTime(),
  );
  const secilen = adaylar[0] ?? null;
  const toplamPencereli = adaylar.reduce((t, a) => t + a.adet, 0);

  return {
    pencere: secilen ? { baslangic: secilen.bas, bitis: secilen.bit } : null,
    tarifeGrubu: null,
    satirlar,
    mukerrerElenen,
    atlananlar,
    eksikSutunlar: [],
    pencereDisi: secilen ? toplamPencereli - secilen.adet : 0,
  };
}
