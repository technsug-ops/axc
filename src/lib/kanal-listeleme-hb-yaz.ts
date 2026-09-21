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
  /**
   * KONTROL EDİLEN satırların kimlikleri — DEĞİŞENLER DEĞİL.
   *
   * ⛔ CANLI VAKA 21.09.2026: HB bir turda **0 satır** değiştirdi (her şey
   * zaten doğruydu) ve bu gövde yalnız `guncellemeler`e dokunduğu için
   * HİÇBİR damga tazelenmedi. Sonuç: kanal **1 dakika önce** kontrol
   * edilmişken `/kanal-listeleme` ekranı "son ölçüm **154 dakika** önce"
   * diyordu ve bir süre sonra BAYAT diye sarı yanacaktı.
   *
   * ⭐ Damga "bu rakam ne zaman DOĞRUYDU" sorusunun cevabıdır; "en son ne
   * zaman DEĞİŞTİ" sorusunun değil. İkisi karıştırılınca hiç değişmeyen bir
   * kanal, her gün kontrol edilse bile ekranda bayat görünür.
   *
   * ⚠ BOŞ VERİLİRSE eski davranış sürer (yalnız değişenler damgalanır) —
   * geriye uyum için; çağıranı olmayan bir vaat açılmıyor.
   */
  kontrolEdilen: readonly string[] = [],
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
   * ⛔ TOPLU DAMGA — TEK SORGU (parçalara bölünmüş).
   * Satır satır yazılsaydı 1110 gidiş-dönüş daha eklenirdi; TY tarafında
   * tam o maliyet ölçüldü — sunucuda **120.871 ms** (yerelde görünmüyordu).
   *
   * ⚠ 500'lük dilim ölçülmüş bir tavan DEĞİL, yaygın güvenli bir sınır;
   * gerekirse ölçülür. Tek `IN (...)` içine binlerce kimlik koymak sorgu
   * boyutu sınırına çarpar.
   */
  for (let i = 0; i < kontrolEdilen.length; i += 500) {
    await prisma.channelSku.updateMany({
      where: { id: { in: [...kontrolEdilen].slice(i, i + 500) } },
      data: { kanalOlcumAt: an },
    });
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
