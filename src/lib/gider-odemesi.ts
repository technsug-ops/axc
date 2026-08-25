/**
 * ============================================================================
 *  GİDER ÖDEME YÖNTEMİ — TEK METİN GÖVDESİ (25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"havale ile ödeme veya cash ödeme ana kategorileri olmalı,
 *  kartla ödeme tıklanırsa altta kartlar açılsın."_
 *
 *  ⚠ NİYE TEK GÖVDE — İKİ OKUYUCU VAR: gider LİSTESİ (ekran) ve EXCEL
 *  DIŞA AKTARMA. Ayrı ayrı yazılsalardı biri gün gelip ötekinden ayrışır ve
 *  liste bir şey, inen dosya başka şey söylerdi. Alım aramasında tam olarak
 *  bu yaşandı; kural oradan geliyor.
 *
 *  ⚠ İKİ AYRI OLGU, İKİSİ DE AYRI SÖYLENİR:
 *    · YÖNTEM — kullanıcının beyanı (`odemeYontemi`)
 *    · KART   — kaydın bağı (`creditCardId` → kartın adı)
 *  Yöntem boşken kart doluysa metin _"Belirtilmedi · Garanti"_ olur,
 *  _"Kartla"_ DEĞİL. Kartın varlığından yöntemi çıkarmak makul görünür ama
 *  bir ÇIKARIMDIR; kayıtta yazan şey YOKLUKTUR ve ekran yazanı söyler.
 *  _("Sistem, kendi defterinde takip etmediği şey hakkında iddia kurmaz.")_
 *
 *  ⚠ `null` = BELİRTİLMEDİ, ve bu alanın DOĞUM TARİHİ 25.08.2026'dır.
 *  Ondan önce girilmiş giderlerde boşluk bir eksiklik değil, bilginin hiç
 *  toplanmamış olmasıdır — "Nakit" varsayılmaz.
 * ============================================================================
 */

/** Ekranın/dışa aktarmanın ihtiyacı olan asgari alanlar. */
export type OdemeGosterimi = {
  odemeYontemi: "NAKIT" | "HAVALE" | "KART" | null;
  /** Kartın ADI — "cuid" hiçbir şey söylemez. Kart yoksa null. */
  kartAdi: string | null;
  installmentCount: number;
};

/** Sözlükten çözülen metinler — koda gömülü metin yasak (anayasa). */
export type OdemeMetinleri = {
  nakit: string;
  havale: string;
  kart: string;
  belirtilmedi: string;
  /** "{adet} taksit" — yalnız 1'den büyükse eklenir. */
  taksit: (adet: number) => string;
};

export function odemeMetni(
  kayit: OdemeGosterimi,
  metin: OdemeMetinleri,
): string {
  /** ⚠ Tek çekimde "1 taksit" yazmak gürültüdür — bilgi taşımaz. */
  const taksit =
    kayit.installmentCount > 1 ? ` · ${metin.taksit(kayit.installmentCount)}` : "";

  if (kayit.odemeYontemi === "KART") {
    return `${metin.kart}${kayit.kartAdi ? ` · ${kayit.kartAdi}` : ""}${taksit}`;
  }
  if (kayit.odemeYontemi === "NAKIT") return metin.nakit;
  if (kayit.odemeYontemi === "HAVALE") return metin.havale;

  /**
   * ⚠ YÖNTEM YOK AMA KART VAR — İKİSİ DE YAZILIR, biri ötekine çevrilmez.
   * Kartı görüp "demek kartla ödenmiş" demek okuyanın işidir; sistemin
   * işi, defterinde ne yazdığını söylemektir.
   */
  return kayit.kartAdi
    ? `${metin.belirtilmedi} · ${kayit.kartAdi}${taksit}`
    : metin.belirtilmedi;
}
