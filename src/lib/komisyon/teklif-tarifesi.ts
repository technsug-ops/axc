import { basligiNormalle } from "@/lib/tablo/hucre";
import type { SayfaGirdisi } from "@/lib/tablo/tablo-oku";

import type { KomisyonPlatformu } from "./model";
import { yuzdeCoz } from "./okuyucu";
import { duvarSaatindenAn } from "./tarife-okuyucu";
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
  /**
   * Pencere kolonları — SIRAYLA denenir, ilk bulunan kullanılır.
   * ⛔ VAKA 01.10.2026: N11 kendi yazım hatasını düzeltti («Başlangıç Zamnı» →
   * «Başlangıç Zamanı»); okuyucu tek yazımı aradığı için dosya «tarih aralığı
   * yok» diye reddedildi. İki yazım da kabul edilir — eski dosyalar da okunur.
   */
  baslangicBasliklari: string[];
  bitisBasliklari: string[];
  /** Dilimler tek satırda mı (N11) yoksa iki satırlı başlıkta mı (HB). */
  sekil: "TEK_SATIR" | "IKI_SATIR";
};

const IMZALAR: Imza[] = [
  {
    platform: "HEPSIBURADA",
    ozgun: ["teklif kodu"],
    kodBasliklari: ["sku", "satıcı stok kodu"],
    baslangicBasliklari: ["başlangıç"],
    bitisBasliklari: ["bitiş"],
    sekil: "IKI_SATIR",
  },
  {
    platform: "N11",
    ozgun: ["deal_ıd", "product_ıd"],
    kodBasliklari: ["satıcı stok kodu", "stok kodu"],
    baslangicBasliklari: ["başlangıç zamanı", "başlangıç zamnı"],
    bitisBasliklari: ["bitiş zamanı", "bitiş zamnı"],
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

/**
 * N11 şekli: tek satırda `<ad> Teklif Üst Limit / Alt Limit / Komisyon`.
 *
 * ⛔ VAKA 01.10.2026: N11 teklif adlarını değiştirdi — «1. / 2. / 3. Teklif»
 * yerine «Avantajlı / Süper / Kaçmaz Teklif». Okuyucu yalnız NUMARALI adı
 * arıyordu; 45 satırın 45'i «teklif yok» diye atlandı. Teklifin adı artık
 * başlığın kendisinden okunur (`<ad> teklif üst limit`) ve alt limit/komisyon
 * AYNI adla eşlenir — numara da kelime de çalışır; sıra dilim kurulurken
 * fiyattan çıkar, addan değil.
 */
function n11Teklifleri(bas: string[], satir: unknown[]): HamTeklif[] {
  const cikti: HamTeklif[] = [];
  for (let i = 0; i < bas.length; i++) {
    const b = bas[i] ?? "";
    const ad = b.match(/^(.+?)\s*teklif\s*üst limit$/)?.[1]?.trim();
    if (ad === undefined || ad === "") continue;
    const altIdx = bas.findIndex((x) => x === `${ad} teklif alt limit`);
    const oranIdx = bas.findIndex((x) => x === `${ad} teklif komisyon`);
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

/**
 * Tarih hücresi → GERÇEK AN; değilse `null`. Hücre dosyanın duvar saatidir
 * (İstanbul) — `duvarSaatindenAn` olmadan 3 saat kayar (VTech vakası, 28.10.2026).
 */
function tarihCoz(ham: unknown): Date | null {
  return ham instanceof Date && !Number.isNaN(ham.getTime()) ? duvarSaatindenAn(ham) : null;
}

/**
 * Tanınan teklif dosyasını dilimli tarifeye çevirir.
 *
 * ⚠ PENCERE — KARAR ÇEVRİLDİ 28.10.2026, ESKİ GEREKÇE SİLİNMEDİ:
 * _Eski hâl:_ «Kayıt yükleme başına TEK pencere tutuyor; bu yüzden dosyadaki
 * **en yaygın** aralık seçilir — HB'de bu, panelin sekmesinde yazan haftalık
 * aralığın aynısı. Dışarıda kalan satırlar `pencereDisi` diye SAYILIR.»
 * O gün HB teklifleri haftalıktı ve en yaygın aralık gerçekten «bu hafta»ydı.
 * ⛔ 28.10.2026 dosyası (Hepsiburada «Tekliflerim» 14): haftalık ortak aralık
 * YOK, her ürünün kendi tarihi var (VTech 26 Ekim–13 Kasım · Fissler 26 Ekim–
 * 1 Kasım · Soundcore 2–31 Ekim). En yaygını seçmek 14 satırın 11'ini «pencere
 * dışı» bırakıyor ve 13 Kasım'a kadar süren teklifi 31 Ekim'de kesiyordu.
 * _Yeni hâl:_ her satır KENDİ aralığını taşır (`gecerlilik`, kaleme yazılır,
 * okuyucular ona bakar); kaydın penceresi bütün satırları KAPSAYAN aralıktır
 * (en erken başlangıç → en geç bitiş). `pencereDisi` artık TARİHİ OKUNAMAYAN
 * satır sayısıdır — onlar kaydın penceresiyle geçerli sayılır.
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
  const ilkBulunan = (adaylar: string[]) =>
    adaylar.map((a) => ustBas.indexOf(a)).find((x) => x >= 0) ?? -1;
  const iBas = ilkBulunan(tanima.imza.baslangicBasliklari);
  const iBit = ilkBulunan(tanima.imza.bitisBasliklari);

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
  /** Bütün satırları kapsayan aralık + tarihi okunamayan satır sayısı. */
  let enErken: Date | null = null;
  let enGec: Date | null = null;
  let tarihsiz = 0;

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

    const b = iBas >= 0 ? tarihCoz(ham[iBas]) : null;
    const e = iBit >= 0 ? tarihCoz(ham[iBit]) : null;
    /**
     * ⚠ SATIRIN KENDİ ARALIĞI, DAKİKASIYLA. Eski «güne göre gruplama» dersi
     * (HB teklifleri aynı gün farklı dakikada başlıyor: 00:07 · 00:19…) artık
     * gruplamayı değil, hiçbir şeyi bozmuyor: her satır kendi anıyla yazılır.
     * Bitişi başlangıcından önce olan aralık bozuktur — tarihsiz sayılır,
     * uydurulmaz.
     */
    const gecerlilik = b && e && e.getTime() >= b.getTime() ? { baslangic: b, bitis: e } : null;
    if (gecerlilik === null) tarihsiz++;
    else {
      if (enErken === null || gecerlilik.baslangic < enErken) enErken = gecerlilik.baslangic;
      if (enGec === null || gecerlilik.bitis > enGec) enGec = gecerlilik.bitis;
    }

    gorulenKod.add(kod);
    satirlar.push({
      barkod: kod,
      saticiStokKodu: null,
      urunAdi: iAd >= 0 ? String(ham[iAd] ?? "").trim() || null : null,
      dilimler,
      guncelKomisyon: guncel,
      satirNo: r + 1,
      gecerlilik,
    });
    void iFiyat;
  }

  /**
   * KAPSAYAN ARALIK: en erken başlangıç → en geç bitiş. Hiçbir satırın tarihi
   * okunamadıysa pencere YOK (yazma kapısı `PENCERE_YOK` der, uydurulmaz).
   */
  const pencere = enErken !== null && enGec !== null ? { baslangic: enErken, bitis: enGec } : null;

  return {
    pencere,
    tarifeGrubu: null,
    satirlar,
    mukerrerElenen,
    atlananlar,
    eksikSutunlar: [],
    pencereDisi: pencere === null ? 0 : tarihsiz,
  };
}
