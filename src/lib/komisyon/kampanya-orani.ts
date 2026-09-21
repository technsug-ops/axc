import { basligiNormalle } from "@/lib/tablo/hucre";
import type { SayfaGirdisi } from "@/lib/tablo/tablo-oku";

import {
  ORAN_ARALIGI,
  type KomisyonOkumasi,
  type KomisyonPlatformu,
  type KomisyonSatiri,
} from "./model";
import { yuzdeCoz } from "./okuyucu";

/**
 * ============================================================================
 *  KAMPANYA DOSYASINDAN "MEVCUT KOMİSYON" — SAF HESAP (K226-4, 21.09.2026)
 * ----------------------------------------------------------------------------
 *  Veritabanına GİTMEZ, dosya AÇMAZ. Girdi okunmuş sayfalar, çıktı
 *  `KomisyonOkumasi` — yani MEVCUT yazma yolunun beklediği şeklin AYNISI.
 *  İkinci bir yazma yolu açılsaydı iki yol iki farklı sonuç üretebilirdi.
 *
 *  ── NİYE VAR (kullanıcı kararı 21.09.2026) ─────────────────────────────
 *  Kullanıcı haklı bir soru sordu: _"bunları HB ve N11 yüklemek için
 *  yapmıyor muyuz zaten?"_ Elindeki dosya kampanya dosyası ve tarife olarak
 *  yüklenmesi yasak — ama o dosya İKİ şey birden taşıyor:
 *
 *      KOŞULLU teklif kolonları   → asla okunmaz (fiyatı düşürmedikçe geçersiz)
 *      `Mevcut Komisyon`          → kanalın O ANKİ GERÇEK oranı
 *
 *  İkincisi meşru bir kaynaktır ve kaynak önceliğinde **en üst basamaktır**
 *  (kanalın kendi belgesi). Atmak, elimizdeki gerçek veriyi çöpe atmaktı.
 *
 *  ⛔ TEKLİF KOLONLARINA HİÇ DOKUNULMAZ. Bu modül `Teklif N` / `Üst Limit` /
 *  `Teklif Komisyon` kolonlarını OKUMAZ bile. Okusaydı bir gün biri onları
 *  "indirimli oran" diye yazar ve kâr olduğundan yüksek görünürdü — bu
 *  paketin en başta engellediği şeyin ta kendisi.
 *
 *  ── ÖLÇÜLDÜ (21.09.2026, gerçek dosyalar) ──────────────────────────────
 *      HB  kampanya: 44/45 satırda kod + okunabilir oran · örn. %13 · %18
 *      N11 kampanya: 46/46 satırda kod + okunabilir oran · örn. %18
 *      kimlik uyumu: HB 36/44 ve N11 24/46 kod, oran listesinde de geçiyor
 *      → aynı kod uzayı; eşleşme çalışır. (Tam örtüşmemesi normal: oran
 *        listesi 18.08 tarihli, kampanya dosyası bugünün.)
 *
 *  ⚠ KAÇ ÜRÜNÜN TUTTUĞUNU BU MODÜL İDDİA ETMEZ — mevcut plan katmanı zaten
 *  `katalogdaYok` diye sayıyor ve önizleme onu ekrana basıyor. Tahmin
 *  etmektense saydırmak.
 * ============================================================================
 */

/**
 * KAMPANYA ORANI OKUYABİLDİĞİMİZ PLATFORMLAR — BEYAN, gerekçesiyle.
 *
 * ⚠ TRENDYOL YOK ve bu bir ÖLÇÜM SONUCU DEĞİL, bir BOŞLUK: Trendyol'un
 * kampanya/indirimli rapor dosyasında `Mevcut Komisyon` biçiminde tek bir
 * güncel oran kolonu olup olmadığı ÖLÇÜLMEDİ. "Trendyol yayımlamıyor"
 * demiyoruz — bakılmadı. Bakıldığı gün buraya eklenir.
 */
export const KAMPANYA_ORANI_OKUYUCUSU_OLAN: readonly KomisyonPlatformu[] = [
  "HEPSIBURADA",
  "N11",
];

/**
 * Başlık satırı dosyanın İLK satırı olmak zorunda değil — N11'de 11. satırda.
 * Tavan `tarife-okuyucu`daki tanıma ile aynı sebeple var: binlerce satırlık
 * bir dosyanın ortasındaki rastgele bir hücre başlık sanılmasın.
 */
const BASLIK_TARAMA_TAVANI = 20;

/**
 * AYIRT EDİCİ KOLONLAR — ortak başlıklara bakarak karar VERİLMEZ.
 * `Mevcut Komisyon` iki dosyada da var; hangi pazaryeri olduğunu yalnız
 * o dosyaya özgü kolon söyler.
 */
const IMZALAR: {
  platform: KomisyonPlatformu;
  /** Bunlardan EN AZ BİRİ bulunmalı. */
  ozgun: string[];
  /** Kanal kodunun okunacağı kolon — sırayla denenir. */
  kodBasliklari: string[];
  /** Varsa barkod kolonu — ikincil eşleştirme için. */
  barkodBasliklari: string[];
}[] = [
  {
    platform: "HEPSIBURADA",
    ozgun: ["teklif kodu"],
    kodBasliklari: ["sku"],
    barkodBasliklari: [],
  },
  {
    /**
     * ⚠ `deal_ıd` — Türkçe yerelinde `I` harfi `ı`ya düşüyor
     * (`toLocaleLowerCase("tr")`). Deseni büyük harf yazmak tanımayı hiç
     * tutturmazdı; normalleştiricinin ne ürettiği VARSAYILMADI, okundu.
     */
    platform: "N11",
    ozgun: ["deal_ıd", "product_ıd"],
    kodBasliklari: ["satıcı stok kodu", "stok kodu"],
    barkodBasliklari: ["gtın (barkod)", "barkod"],
  },
];

export type KampanyaTanimasi =
  | {
      durum: "TANINDI";
      platform: KomisyonPlatformu;
      sayfa: string;
      veri: unknown[][];
      basSatir: number;
      imza: (typeof IMZALAR)[number];
    }
  | { durum: "TANINMADI"; sayfalar: string[] };

function satirBasliklari(r: unknown[]): string[] {
  return r.map((c) => basligiNormalle(String(c ?? "")));
}

/** `Mevcut Komisyon` kolonu — iki dosyada da bu ada sahip. */
function mevcutKomisyonSutunu(bas: string[]): number {
  return bas.findIndex((b) => b.includes("mevcut") && b.includes("komisyon"));
}

/**
 * Sayfalardan kampanya dosyasını ve BAŞLIK SATIRINI bulur.
 *
 * ⚠ BAŞLIK SATIRI ARANIR, VARSAYILMAZ: HB'de 1., N11'de 11. satır. Sabit
 * bir satıra bakan bir okuyucu, iki dosyadan birini HİÇ göremezdi.
 */
export function kampanyaOraniTani(sayfalar: SayfaGirdisi[]): KampanyaTanimasi {
  for (const sayfa of sayfalar) {
    const veri = sayfa.data ?? [];
    const tavan = Math.min(veri.length, BASLIK_TARAMA_TAVANI);
    for (let i = 0; i < tavan; i++) {
      const bas = satirBasliklari(veri[i] ?? []);
      if (mevcutKomisyonSutunu(bas) < 0) continue;

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

/**
 * Tanınan kampanya dosyasından YALNIZ güncel oranı okur.
 *
 * ⚠ Aralık dışı ya da çözülemeyen oran `null` döner ve satır uyarı
 * listesine düşer — sessizce kırpılmaz, uydurulmaz.
 */
export function kampanyaOraniOku(tanima: KampanyaTanimasi): KomisyonOkumasi {
  if (tanima.durum === "TANINMADI") {
    return {
      platform: "HEPSIBURADA",
      sayfa: "",
      satirlar: [],
      eksikSutunlar: ["mevcut komisyon"],
    };
  }

  const bas = satirBasliklari(tanima.veri[tanima.basSatir] ?? []);
  const iOran = mevcutKomisyonSutunu(bas);
  const iKod = tanima.imza.kodBasliklari
    .map((k) => bas.indexOf(k))
    .find((x) => x >= 0);
  const iBarkod = tanima.imza.barkodBasliklari
    .map((k) => bas.indexOf(k))
    .find((x) => x >= 0);
  const iAd = bas.findIndex((b) => b === "ürün adı");

  const eksik: string[] = [];
  if (iOran < 0) eksik.push("Mevcut Komisyon");
  if (iKod === undefined) eksik.push(tanima.imza.kodBasliklari[0] ?? "kod");
  if (eksik.length > 0) {
    return {
      platform: tanima.platform,
      sayfa: tanima.sayfa,
      satirlar: [],
      eksikSutunlar: eksik,
    };
  }

  const satirlar: KomisyonSatiri[] = [];
  for (let r = tanima.basSatir + 1; r < tanima.veri.length; r++) {
    const ham = tanima.veri[r] ?? [];
    if (ham.every((c) => c === null)) continue;

    const kod = String(ham[iKod as number] ?? "").trim();
    if (kod === "") continue;

    const hamOran = String(ham[iOran] ?? "").trim();
    const barkod =
      iBarkod === undefined ? "" : String(ham[iBarkod] ?? "").trim();

    satirlar.push({
      kanalKodu: kod,
      ikinciKod: null,
      barkodlar: barkod === "" ? [] : barkod.split(";").map((b) => b.trim()),
      oran: yuzdeCoz(ham[iOran]),
      hamOran,
      urunAdi: iAd >= 0 ? (String(ham[iAd] ?? "").trim() || null) : null,
      /** Tabloda görünen satır numarası — hata mesajı buna işaret eder. */
      satirNo: r + 1,
    });
  }

  return {
    platform: tanima.platform,
    sayfa: tanima.sayfa,
    satirlar,
    eksikSutunlar: [],
  };
}

/** Oran aralığı dışına çıkan satır sayısı — ekranda ayrı sayılır. */
export function araliDisiSayisi(okuma: KomisyonOkumasi): number {
  return okuma.satirlar.filter(
    (s) =>
      s.oran === null &&
      s.hamOran !== "" &&
      Number.isFinite(Number(s.hamOran.replace(",", "."))) &&
      (Number(s.hamOran.replace(",", ".")) < ORAN_ARALIGI.enAz ||
        Number(s.hamOran.replace(",", ".")) > ORAN_ARALIGI.enFazla),
  ).length;
}
