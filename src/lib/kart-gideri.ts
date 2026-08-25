import type { BorcAlimi } from "@/lib/kart-borcu";

/**
 * ============================================================================
 *  KARTLA ÖDENEN GİDER → KART BORCU (25.08.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı: _"giderleri ve vergileri de kartla ödüyorum; bugün 4-5 binlik
 *  vergi ödedim. Kartlarla sadece ürün almıyorum."_
 *
 *  ⚠ ÖLÇÜLEN BOŞLUK: `kartBorcuHesapla` YALNIZ alımlardan besleniyordu.
 *  Kartla ödenen gider borçta HİÇ görünmüyor, kart borcu ekranı ve NAKİT
 *  TAKVİMİ o kadar eksik gösteriyordu.
 *
 *  ⚠ DÖNÜŞÜM TEK GÖVDEDE — DÖRT ÇAĞRI YERİ VAR. `kartBorcuHesapla` dört
 *  yerden çağrılıyor (kart borcu özeti · kart borcu sekmesi · nakit takvimi ·
 *  geçmiş ekstre). Dönüşümü her birinde ayrı yazsaydık biri gün gelip
 *  ötekinden ayrışır ve iki ekran aynı kart için farklı borç gösterirdi —
 *  hangisinin doğru olduğu da anlaşılmazdı.
 *
 *  ⚠ HESAP MOTORU DEĞİŞMEDİ. Gider `BorcAlimi` şekline çevriliyor
 *  (`{ id, kod, tarih, tutar, taksitSayisi }`) ve motor onu bir alımdan
 *  ayırt etmiyor — ayırt etmesi de gerekmiyor: karta düşen borç, borçtur.
 * ============================================================================
 */

export type BorcGideri = {
  id: string;
  spentAt: Date;
  /** KDV DAHİL tutar — karta yansıyan da budur. */
  amount: { toString(): string };
  currency: string;
  creditCardId: string | null;
  installmentCount: number;
  description: string | null;
  category: { name: string } | null;
};

export type GiderBorcSonucu = {
  borclar: BorcAlimi[];
  /**
   * Kartın para biriminde OLMAYAN gider sayısı — sayıma girmedi.
   * ⚠ Sessizce düşmesin: kur çevirisi yapılmıyor (anayasa) ve atlanan bir
   * gider borcu eksik gösterir. Çağıran bunu ekranda söyleyebilmeli.
   */
  farkliParaBirimi: number;
};

/**
 * BİR KARTIN GİDER BORÇLARI.
 *
 * ⚠ PARA BİRİMİ ÇEVRİLMEZ — alım tarafındaki `kartTutari` ile aynı kural.
 * EUR bir gider TRY bir karta yazılamaz; kur çevirisi yapmak, olmayan bir
 * rakam uydurmaktır. Atlanan gider SAYILIR ve çağırana bildirilir.
 */
export function giderleriBorcaCevir(
  giderler: readonly BorcGideri[],
  kartId: string,
  kartParaBirimi: string,
): GiderBorcSonucu {
  const borclar: BorcAlimi[] = [];
  let farkliParaBirimi = 0;

  for (const g of giderler) {
    if (g.creditCardId !== kartId) continue;

    if (g.currency !== kartParaBirimi) {
      farkliParaBirimi++;
      continue;
    }

    const tutar = Number(g.amount.toString());
    /** ⚠ Sıfır ya da negatif tutar borç üretmez — veri hatası sayıma girmez. */
    if (!Number.isFinite(tutar) || tutar <= 0) continue;

    borclar.push({
      id: g.id,
      /**
       * ⚠ KOD YERİNE OKUNABİLİR ETİKET. Giderin alım gibi bir kodu yok ve
       * bu etiket ekranda taksit satırında GÖRÜNÜYOR — "cuid" göstermek
       * kullanıcıya hiçbir şey söylemezdi. Kategori adı + açıklama, o
       * satırın ne olduğunu anlatır.
       */
      kod: giderEtiketi(g),
      tarih: g.spentAt,
      tutar,
      taksitSayisi: g.installmentCount,
    });
  }

  return { borclar, farkliParaBirimi };
}

/** Taksit satırında görünecek ad. */
export function giderEtiketi(g: BorcGideri): string {
  const kategori = g.category?.name?.trim();
  const aciklama = g.description?.trim();
  if (kategori && aciklama) return `${kategori} — ${aciklama}`;
  return kategori || aciklama || "Gider";
}
