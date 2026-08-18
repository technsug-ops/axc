import type { TarifeOkumasi, TarifeSatiri } from "./tarife-okuyucu";

/**
 * ============================================================================
 *  TARİFE YAZIM PLANI — SAF HESAP, HİÇBİR ŞEY YAZMAZ
 * ----------------------------------------------------------------------------
 *  Girdi: okunmuş tarife + katalogdaki barkod→varyant haritası.
 *  Çıktı: yazılacak kalemler ve yükleme sonu raporunun sayıları.
 *
 *  ── EŞLEŞME İKİ AŞAMALI: ÖNCE KANAL SKU, SONRA KATALOG BARKODU ──────────
 *  ⚠ 19.08.2026 GERÇEK VERİ DÜZELTMESİ. İlk hâlde yalnız
 *  `ProductVariant.barcode`a bakılıyordu ve gerçek dosyada 3 ürün bağsız
 *  çıktı. Ölçüldü: üçünden biri (`Soundcore Q21i`, `axcali2755`) sistemde
 *  ZATEN VARDI — katalog barkodu `194644037819`, ama o ürünün **Trendyol
 *  kanal SKU'su `194645027819`**, yani tarife dosyasındaki barkodun ta
 *  kendisi. Yanlış negatif.
 *
 *  Sebebi basit: dosya PAZARYERİNİN KENDİ KODUNU taşıyor, bizim katalog
 *  barkodumuzu değil. İkisi çoğu üründe aynı ama aynı olmak ZORUNDA değil.
 *  Mevcut komisyon içe aktarması bunu zaten üç aşamalı yapıyordu; tarife
 *  tarafında tek aşamaya indirmek bir gerileme oldu.
 *
 *  SIRA: (1) o hesabın KANAL SKU'su, (2) katalog barkodu. Kanal kodu
 *  önce gelir çünkü dosyayla aynı dildedir.
 *
 *  _`SATICI STOK KODU` anahtar YAPILMADI: 161 satırda yalnız 98 farklı
 *  değer var ve bir kısmı boş; farklı ürünler aynı kayda düşerdi._
 *
 *  ── BAĞSIZ KALEM SAKLANIR VE SAYILIR ────────────────────────────────────
 *  ⚠ Mimar şartı: bağsızlık SESSİZ KALMAZ. Katalogda karşılığı olmayan
 *  barkod atılmaz — kalem `variantId: null` ile yazılır ve rapora "X kalem
 *  bağsız" diye girer.
 *
 *  Gerekçe hakediş dersidir: 648 hakediş kalemi aylarca bağsız durdu ve
 *  kimse fark etmedi, çünkü hiçbir yerde sayılmıyordu. Kalemi ATSAYDIK
 *  daha kötü olurdu — tarife eksik olur, üstelik eksikliği bilinmezdi.
 * ============================================================================
 */

/** Katalogdaki varyant — barkoddan varyanta gitmek için. */
export type VaryantKaydi = { id: string; barkod: string | null };

/** O kanal hesabındaki eşleme — pazaryerinin kendi kodu. */
export type KanalKodu = { kanalKodu: string; variantId: string };

/** Yazılacak tek kalem: bir ürünün bir dilimi. */
export type YazilacakKalem = {
  barkod: string;
  saticiStokKodu: string | null;
  urunAdi: string | null;
  variantId: string | null;
  dilimSirasi: number;
  altLimit: number | null;
  ustLimit: number | null;
  oran: number;
};

export type TarifePlani = {
  kalemler: YazilacakKalem[];
  /** Yükleme sonu raporunun sayıları. */
  rapor: {
    okunanSatir: number;
    yazilacakKalem: number;
    eslesenUrun: number;
    bagsizUrun: number;
    bagsizKalem: number;
    mukerrerElenen: number;
    atlananSatir: number;
  };
  /** Bağsız kalanların ilk örnekleri — ekranda gösterilir. */
  bagsizOrnekler: { barkod: string; urunAdi: string | null }[];
};

export function tarifePlaniKur(
  okuma: TarifeOkumasi,
  varyantlar: VaryantKaydi[],
  kanalKodlari: KanalKodu[] = [],
): TarifePlani {
  /**
   * İKİ DİZİN, İKİ AŞAMA. Kodlar KIRPILARAK karşılaştırılır; dosyadan
   * gelen değerde baştaki/sondaki boşluk olabiliyor ve iki taraf da
   * kırpılmazsa aynı ürün eşleşmez, sebebi de görünmez.
   */
  const kanalDizini = new Map<string, string>();
  for (const k of kanalKodlari) {
    const kod = k.kanalKodu.trim();
    if (kod !== "") kanalDizini.set(kod, k.variantId);
  }

  const barkodDizini = new Map<string, string>();
  for (const v of varyantlar) {
    const b = (v.barkod ?? "").trim();
    if (b !== "") barkodDizini.set(b, v.id);
  }

  const kalemler: YazilacakKalem[] = [];
  const bagsizOrnekler: { barkod: string; urunAdi: string | null }[] = [];
  let eslesen = 0;
  let bagsiz = 0;
  let bagsizKalem = 0;

  for (const satir of okuma.satirlar) {
    /**
     * ÖNCE KANAL SKU, SONRA KATALOG BARKODU. Kanal kodu dosyayla aynı
     * dilde olduğu için birincil; barkod yedek yoldur.
     */
    const kod = satir.barkod.trim();
    const variantId = kanalDizini.get(kod) ?? barkodDizini.get(kod) ?? null;
    if (variantId === null) {
      bagsiz++;
      bagsizKalem += satir.dilimler.length;
      if (bagsizOrnekler.length < 10) {
        bagsizOrnekler.push({ barkod: satir.barkod, urunAdi: satir.urunAdi });
      }
    } else {
      eslesen++;
    }

    for (const d of satir.dilimler) {
      kalemler.push({
        barkod: satir.barkod,
        saticiStokKodu: satir.saticiStokKodu,
        urunAdi: satir.urunAdi,
        variantId,
        dilimSirasi: d.sira,
        altLimit: d.altLimit,
        ustLimit: d.ustLimit,
        oran: d.oran,
      });
    }
  }

  return {
    kalemler,
    rapor: {
      okunanSatir: okuma.satirlar.length,
      yazilacakKalem: kalemler.length,
      eslesenUrun: eslesen,
      bagsizUrun: bagsiz,
      bagsizKalem,
      mukerrerElenen: okuma.mukerrerElenen,
      atlananSatir: okuma.atlananlar.length,
    },
    bagsizOrnekler,
  };
}

/**
 * Yükleme yazılabilir mi — pencere şart.
 *
 * ⚠ PENCERESİZ TARİFE YAZILMAZ. Tarifenin ömrü var; hangi aralığa ait
 * olduğu bilinmeyen bir oran "güncel mi bayat mı" sorusunu cevaplayamaz
 * ve tablonun varlık sebebini boşa çıkarır. Ayrıca tekillik anahtarı
 * (`hesap + pencereBaslangic`) penceresiz kurulamaz.
 */
export type YazimEngeli =
  | { olur: false; engel: "PENCERE_YOK" }
  | { olur: false; engel: "SATIR_YOK" }
  | { olur: false; engel: "SUTUN_EKSIK"; eksikler: string[] };

export function yazilabilirMi(
  okuma: TarifeOkumasi,
): { olur: true } | YazimEngeli {
  if (okuma.eksikSutunlar.length > 0) {
    return { olur: false, engel: "SUTUN_EKSIK", eksikler: okuma.eksikSutunlar };
  }
  if (okuma.pencere === null) return { olur: false, engel: "PENCERE_YOK" };
  if (okuma.satirlar.length === 0) return { olur: false, engel: "SATIR_YOK" };
  return { olur: true };
}

/** Rapor metni — betik ve ekran AYNI cümleyi kursun diye burada. */
export function raporMetni(
  plan: TarifePlani,
  pencere: { baslangic: Date; bitis: Date },
  bicimle: (d: Date) => string,
): string[] {
  const r = plan.rapor;
  const satirlar = [
    `pencere        ${bicimle(pencere.baslangic)} → ${bicimle(pencere.bitis)}`,
    `okunan satır   ${r.okunanSatir}`,
    `yazılan kalem  ${r.yazilacakKalem}`,
    `eşleşen ürün   ${r.eslesenUrun}`,
    `BAĞSIZ ürün    ${r.bagsizUrun}  (${r.bagsizKalem} kalem)`,
  ];
  if (r.mukerrerElenen > 0) {
    satirlar.push(`mükerrer elendi ${r.mukerrerElenen}`);
  }
  if (r.atlananSatir > 0) {
    satirlar.push(`atlanan satır  ${r.atlananSatir}`);
  }
  return satirlar;
}

/** Bir satırın kaç dilim taşıdığı — plan sayıları buna dayanıyor. */
export function dilimSayisi(satir: TarifeSatiri): number {
  return satir.dilimler.length;
}
