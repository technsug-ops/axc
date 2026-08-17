import type { SatisIptalSebebi } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  SATIŞ İPTALİ — SAF MEKANİK
 * ----------------------------------------------------------------------------
 *  Kullanıcı ihtiyacı 17.08.2026: "müşteri daha kargoya vermeden iptal etti,
 *  o gibi durumlarda ne yapacağız — her türlü iptalde düşen stok geri gelir."
 *
 *  ── İPTAL, İADE DEĞİLDİR ────────────────────────────────────────────────
 *  İadede mal gitti ve geri döndü: komisyon kesildi, kargo yandı, kanal
 *  kesintisi gerçekleşti. İptalde ise mal HİÇ ÇIKMADI. Bu yüzden iptal
 *  edilen satış ciroya, NET'e ve hakediş beklentisine "eksi" olarak
 *  YAZILMAZ — hiç doğmamış sayılır, kümeden ÇIKAR.
 *
 *  ── LEDGER SİLİNMEZ (anayasa) ───────────────────────────────────────────
 *  `SALE_OUT` hareketi DURUR. İptal, ters işaretli bir `SALE_CANCEL_IN`
 *  hareketiyle yapılır. Silmek defteri geçmişe dönük değiştirmek olurdu ve
 *  "o mal ne zaman çıktı, ne zaman döndü" sorusunun cevabı kaybolurdu.
 *
 *  ── MALİYET, ÇIKIŞ MALİYETİNİN AYNASI ───────────────────────────────────
 *  Giriş hareketi, çıktığı partinin maliyetiyle ve o partiye BAĞLI olarak
 *  yazılır (`sourceMovementId`). Yeni maliyet uydurulsaydı aynı mal defterde
 *  iki değerle durur, envanter değeri sessizce kayardı. Aynı kural iadede de
 *  geçerli (bkz. `lib/iade.ts` — "RETURN_IN, ÇIKIŞ MALİYETİNİN AYNASI").
 * ============================================================================
 */

/** İptal edilmiş satışın ait olduğu taraf — ekranda gruplamak için. */
export const MAGAZA_SEBEPLERI: readonly SatisIptalSebebi[] = [
  "MAGAZA_STOK_YOK",
  "MAGAZA_KOTU_NIYET",
  "MAGAZA_DIGER",
];

/** Açıklama ZORUNLU olan sebepler — "diğer" kendini anlatmak zorundadır. */
export const ACIKLAMA_ZORUNLU: readonly SatisIptalSebebi[] = ["MAGAZA_DIGER"];

export type IptalEngeli =
  | "ZATEN_IPTAL"
  | "IADE_VAR"
  | "SEBEP_YOK"
  | "ACIKLAMA_YOK";

export type CikisHareketi = {
  hareketId: string;
  variantId: string;
  /** Çıkışta düşülen adet (ledger'da negatif; burada POZİTİF beklenir). */
  adet: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
  /** Çıkışın düştüğü giriş partisi — ayna hareket ona bağlanır. */
  kaynakHareketId: string | null;
};

/** İptalin para tarafındaki etkisi — önizlemede özet satır olarak gösterilir. */
export type IptalEtkisi = {
  /** Satışın KDV dahil cirosu — bu tutar ciro toplamından düşecek. */
  ciro: number;
  /** Hesaplanmışsa NET-2; hesaplanamamışsa null ("?" gösterilir). */
  net2: number | null;
  paraBirimi: string;
  /**
   * Bu satış için hakediş kalemi eşleşmiş mi. Eşleşmişse iptal, BEKLENEN
   * TAHSİLATI da düşürür — kullanıcı bunu onaydan ÖNCE bilmeli.
   */
  hakedisEslesmisMi: boolean;
};

export type IptalGirdisi = {
  iptalEdilmisMi: boolean;
  /**
   * Bu satışa bağlı iadeler. TEK BİR KALEM bile iade edildiyse satışın
   * TAMAMI iptal edilemez (mimar kararı 17.08.2026) — kısmi iptal
   * REDDEDİLDİ: "hem iadeli hem iptal" diye melez bir satış türü doğar ve
   * her raporda ayrı bir istisna olarak yaşamaya başlar.
   */
  iadeler: { id: string; kod: string | null }[];
  sebep: SatisIptalSebebi | null;
  not: string | null;
  cikislar: CikisHareketi[];
  etki: IptalEtkisi;
};

export type YazilacakHareket = {
  variantId: string;
  /** POZİTİF — stoğa geri giriyor. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
  locationId: string | null;
  sourceMovementId: string | null;
};

export type IptalPlani =
  | {
      olur: false;
      engel: IptalEngeli;
      /**
       * ENGEL SESSİZ DUVAR OLMASIN (mimar şartı): iade yüzünden
       * engellendiyse kullanıcıyı O KAYDA götürecek bilgi de döner.
       * "Yapamazsın" demek yetmez, "şunu kullan" demek gerekir.
       */
      iade?: { id: string; kod: string | null };
    }
  | {
      olur: true;
      hareketler: YazilacakHareket[];
      geriDonenAdet: number;
      /**
       * ONAYDAN ÖNCE GÖSTERİLİR (mimar şartı 17.08.2026): kullanıcı neyin
       * düşeceğini görmeden onaylamaz. Onay düğmesi plan çizilmeden aktif
       * OLMAZ — "iptal et"e basıp ne olacağını sonradan öğrenmek, geri
       * alınamaz bir işlemde kabul edilemez.
       */
      etki: IptalEtkisi;
    };

/**
 * İptal edilebilir mi, edilirse hangi hareketler yazılır.
 *
 * HİÇBİR ŞEY YAZMAZ — çağıran taraf önce bunu gösterir, kullanıcı onaylar,
 * sonra yazılır (önizleme-önce kuralı).
 */
export function iptalPlani(girdi: IptalGirdisi): IptalPlani {
  // Zaten iptal edilmiş satış ikinci kez iptal edilemez: stok iki kez girerdi.
  if (girdi.iptalEdilmisMi) return { olur: false, engel: "ZATEN_IPTAL" };

  /**
   * ⚠ İADESİ OLAN SATIŞ İPTAL EDİLEMEZ — MİMARİ KARAR.
   *
   * İki kayıt birbiriyle çelişir: iade "mal gitti ve döndü" der, iptal "mal
   * hiç çıkmadı" der. İkisi aynı satışta bulunamaz. Teknik sonucu daha da
   * sert: iade zaten `RETURN_IN` ile stoğu geri getirdi; üstüne iptal
   * yazmak aynı malı İKİ KEZ stoğa sokardı ve envanter sessizce şişerdi.
   *
   * Kullanıcı bu satışı düzeltmek istiyorsa yolu iadedir, iptal değil.
   */
  if (girdi.iadeler.length > 0) {
    return { olur: false, engel: "IADE_VAR", iade: girdi.iadeler[0] };
  }

  if (girdi.sebep === null) return { olur: false, engel: "SEBEP_YOK" };

  /**
   * "DİĞER" KENDİNİ ANLATMAK ZORUNDA. Sebep listesi kapalı bir kümedir;
   * "diğer" seçilip boş bırakılırsa kayıt altı ay sonra hiçbir şey
   * söylemeyen bir satır olur.
   */
  if (
    ACIKLAMA_ZORUNLU.includes(girdi.sebep) &&
    (girdi.not === null || girdi.not.trim() === "")
  ) {
    return { olur: false, engel: "ACIKLAMA_YOK" };
  }

  const hareketler: YazilacakHareket[] = girdi.cikislar
    // Sıfır adetli çıkış hareketi yazılmaz — boş satır defteri kirletir.
    .filter((c) => c.adet > 0)
    .map((c) => ({
      variantId: c.variantId,
      quantityDelta: c.adet,
      // AYNA: çıkışın maliyeti aynen geri girer, yeni maliyet uydurulmaz.
      birimMaliyet: c.birimMaliyet,
      birimMaliyetParaBirimi: c.birimMaliyetParaBirimi,
      locationId: c.locationId,
      /**
       * Ayna hareket, çıkışın düştüğü GİRİŞ partisine bağlanır — mal hangi
       * partiden çıktıysa oraya döner. FIFO sırası bozulmaz ve kârlılık
       * kartındaki "alımdan satışa gün" hesabı doğru partiyi görmeye devam
       * eder.
       */
      sourceMovementId: c.kaynakHareketId,
    }));

  return {
    olur: true,
    hareketler,
    geriDonenAdet: hareketler.reduce((t, h) => t + h.quantityDelta, 0),
    etki: girdi.etki,
  };
}

/**
 * İptal edilen satış ciro/NET/hakediş kümesine GİRER Mİ — tek cevap.
 *
 * ⚠ Bu fonksiyon, süzgecin tek kaynağı olduğu için ayrıca vardır: her ekran
 * kendi `iptalTarihi === null` kontrolünü yazsaydı, biri unutulduğu gün o
 * ekran iptal edilmiş satışları ciroya sayardı ve fark aylarca görülmezdi.
 */
export function iptalliSayilirMi(satis: { iptalTarihi: Date | null }): boolean {
  return satis.iptalTarihi !== null;
}
