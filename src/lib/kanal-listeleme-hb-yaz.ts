import { izYaz } from "@/lib/iz";
import { prisma } from "@/lib/prisma";
import type { KanalListelemeDurumu } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  HB LİSTELEME DURUMU — YAZIM (K184, 07.09.2026)
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE `src/lib`TE, BETİKTE DEĞİL: TY kardeşi (`kanal-listeleme-yaz.ts`)
 *  de burada. Yazımı betiğe koysaydım `api:dogrula` haklı olarak kırmızı
 *  yanardı — "ölçüm betiği deftere yazmaz" kuralı var ve istisna BEYANLA
 *  geçiliyor. Beyan etmek yerine YAPIYI kardeşine benzettim: aynı iş aynı
 *  yerde durur. _(İlke #10 — tutarlılık.)_
 *
 *  ⛔ ÜÇ ALAN — FAZLASI YOK (mimar kararı 07.09.2026):
 *  `listelemeDurumu` · `kanalAdet` · `kanalOlcumAt`.
 *  Fiyat, komisyon, ad başka kaynaklardan geliyor; buradan da yazılsaydı iki
 *  kaynak aynı alana yazar ve biri ötekini sessizce ezerdi.
 *
 *  ⛔ PAZARYERİNE HİÇBİR ŞEY YAZILMAZ. Bu gövde yalnız DEFTERİ günceller;
 *  HB istemcisinde yazma metodu tanımlı bile değil.
 * ============================================================================
 */

export type HbGuncelleme = {
  channelSkuId: string;
  durum: KanalListelemeDurumu;
  /** `null` = adet ÖLÇÜLEMEDİ — sıfır DEĞİL. */
  adet: number | null;
};

export type HbYazimSonucu = {
  yazilan: number;
  hata: number;
};

const KOSUM_IZI = "HB_LISTELEME_YAZIM";

/**
 * Satır satır yazar.
 *
 * ⚠ TEK DEV İŞLEM DEĞİL — her satır bağımsız ve ikinci koşum zararsız.
 * Yarım kalırsa kaldığı yerden devam eder.
 * _(Kılavuz: yarım commit mümkün olan hiçbir betik canlıya koşmaz.)_
 */
export async function hbListelemeDurumunuYaz(
  guncellemeler: HbGuncelleme[],
  /** Koşumun ait olduğu KANAL adı — kutu izleri buna göre ayırır. */
  kosumKanali: string,
  an: Date = new Date(),
): Promise<HbYazimSonucu> {
  const sonuc: HbYazimSonucu = { yazilan: 0, hata: 0 };

  for (const g of guncellemeler) {
    try {
      await prisma.channelSku.update({
        where: { id: g.channelSkuId },
        data: {
          listelemeDurumu: g.durum,
          kanalAdet: g.adet,
          /** Ölçümün ANI — "bu rakam ne zaman doğruydu" sorusunun cevabı. */
          kanalOlcumAt: an,
        },
      });
      sonuc.yazilan++;
    } catch {
      /**
       * ⛔ SESSİZ YUTMA YOK: sayaç ayrı tutuluyor ve çağıran onu BASIYOR.
       * Yutulsaydı "hepsi yazıldı" ile "yarısı düştü" aynı görünürdü.
       */
      sonuc.hata++;
    }
  }

  /**
   * ⛔ İZ ORTAK GÖVDEDEN — `userId` kendiliğinden damgalanır (K90).
   *
   * ⛔ VE TY KARDEŞİYLE AYNI SÖZLEŞME (07.09.2026): `kosumKanali` ·
   * `basarili` · `mesaj`. Eskiden yalnız sayaçlar yazılıyordu ve panel
   * kutusu bu izi HİÇ OKUYAMIYORDU — HB'yi çizip TY'nin koşum durumunu
   * gösteriyordu. Aynı soruyu soran iki iz aynı şekli taşır, yoksa okuyan
   * taraf birini görmez.
   */
  await izYaz({
    action: KOSUM_IZI,
    targetType: "ChannelSku",
    targetId: null,
    detail: JSON.stringify({
      kosumKanali,
      /** ⛔ TEK BİR SATIR DÜŞSE BİLE koşum BAŞARILI sayılmaz. */
      basarili: sonuc.hata === 0,
      mesaj: `yazılan ${sonuc.yazilan} · hata ${sonuc.hata} · istenen ${guncellemeler.length}`,
      istenen: guncellemeler.length,
      yazilan: sonuc.yazilan,
      hata: sonuc.hata,
      an: an.toISOString(),
    }),
  });

  return sonuc;
}
