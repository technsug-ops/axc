import type { NoticeStatus, ReturnReason } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  İADE BİLDİRİMİ — DURUM MAKİNESİ (SAF MANTIK)
 * ----------------------------------------------------------------------------
 *  İKİ AŞAMALI AKIŞ (onaylı tasarım):
 *    AŞAMA A — BİLDİRİM. Pazaryeri "müşteri iade istiyor" der; mal daha
 *      yolda. KÂR ETKİSİ YOKTUR: ciro düşmez, komisyon dönmez, stok
 *      hareketi yazılmaz. Bu yüzden bildirimin `profitStatus`'ü de yoktur
 *      ve "kârı hesaplanamayan" sayacına DÜŞMEZ.
 *    AŞAMA B — İADE. Mal gelip hüküm verilince `Return` doğar; ledger ve
 *      kâr etkisi ancak burada işler.
 *
 *  NEDEN AYRI: bildirimi iade saymak, henüz olmamış bir gelir kaybını
 *  bugünün kârından düşmek olurdu. Müşteri vazgeçebilir (IPTAL), itiraz
 *  kazanılabilir (ITIRAZ_KABUL) — ikisinde de iade HİÇ doğmaz.
 *
 *  Veritabanına GİTMEZ; `rma:dogrula` bunu veri olmadan sınıyor.
 * ============================================================================
 */

/**
 * İZİNLİ GEÇİŞLER. Listede olmayan geçiş REDDEDİLİR.
 *
 * Serbest bırakılsaydı "kapanmış bildirimi tekrar açmak" ya da "mal
 * gelmeden iade işlemek" gibi geri alınamaz hatalar mümkün olurdu; ikisi de
 * ledger'a yanlış kayıt yazdırır.
 */
export const IZINLI_GECISLER: Record<NoticeStatus, NoticeStatus[]> = {
  // Mal yolda. Ya gelir, ya müşteri vazgeçer.
  BEKLENIYOR: ["MAL_GELDI", "IPTAL"],
  /**
   * Mal geldi. Üç yol var: iade işlenir (KAPANDI), kullanılmış çıktı ve
   * itiraz açılır, ya da hüküm beklenirken burada durur.
   * İPTAL YOK: mal elimizde, "hiç olmadı" sayılamaz.
   */
  MAL_GELDI: ["ITIRAZ_ACILDI", "KAPANDI"],
  ITIRAZ_ACILDI: ["ITIRAZ_INCELEMEDE", "ITIRAZ_KABUL", "ITIRAZ_RED"],
  ITIRAZ_INCELEMEDE: ["ITIRAZ_KABUL", "ITIRAZ_RED"],
  /**
   * LEHE sonuç: ürün müşteride kalır, para bizde kalır. İade İŞLENMEZ —
   * bu yüzden tek çıkışı KAPANDI ve o kapanışta `Return` doğmaz.
   */
  ITIRAZ_KABUL: ["KAPANDI"],
  /** ALEYHE sonuç: normal iade akışı işler, `Return` doğar. */
  ITIRAZ_RED: ["KAPANDI"],
  // Uç durumlar — buradan çıkış yok.
  KAPANDI: [],
  IPTAL: [],
};

/** Bu geçiş yapılabilir mi? */
export function gecisGecerliMi(
  mevcut: NoticeStatus,
  hedef: NoticeStatus,
): boolean {
  return IZINLI_GECISLER[mevcut].includes(hedef);
}

/** Kapanmış/iptal edilmiş bildirim değiştirilemez. */
export function kapaliMi(durum: NoticeStatus): boolean {
  return IZINLI_GECISLER[durum].length === 0;
}

/**
 * "İADEYİ İŞLE" HANGİ DURUMLARDA AÇIK?
 *
 * MAL_GELDI  — mal elimizde, hüküm verilebilir.
 * ITIRAZ_RED — itiraz kaybedildi, iade işlenecek.
 *
 * BEKLENIYOR'da KAPALI: mal gelmeden iade işlemek, gelmemiş malı stoğa
 * sokmak demek. ITIRAZ_KABUL'de KAPALI: ürün müşteride kaldı, iade YOK —
 * burada düğmeyi açık bırakmak, kazanılmış bir itirazdan sonra ciroyu
 * yanlışlıkla düşürmenin en kolay yolu olurdu.
 */
export const IADE_ISLENEBILIR: NoticeStatus[] = ["MAL_GELDI", "ITIRAZ_RED"];

export function iadeIslenebilirMi(durum: NoticeStatus): boolean {
  return IADE_ISLENEBILIR.includes(durum);
}

/**
 * AYRILMIŞ STOK — HANGİ BİLDİRİMLER SAYILIR?
 *
 * Değişim için ayrılan ürün FİZİKSEL STOKA VE FIFO'YA DOKUNMAZ; bu bir
 * defter kaydı değil, niyet beyanıdır (bkz. şema: `reservedVariantId`).
 * Stok ekranındaki "ayrılmış N adet" rozeti AÇIK bildirimlerden ANLIK
 * toplanır: bildirim kapanınca rozet kendiliğinden düşer ve
 * "rezervasyonu serbest bırakmayı unutma" diye bir iş doğmaz.
 *
 * ITIRAZ_KABUL AÇIK SAYILMAZ: ürün müşteride kaldı, değişim gönderilmiyor.
 */
export const AYRILMIS_SAYILAN_DURUMLAR: NoticeStatus[] = [
  "BEKLENIYOR",
  "MAL_GELDI",
  "ITIRAZ_ACILDI",
  "ITIRAZ_INCELEMEDE",
];

export function ayrilmisSayilirMi(durum: NoticeStatus): boolean {
  return AYRILMIS_SAYILAN_DURUMLAR.includes(durum);
}

/** Varyant başına ayrılmış adet — açık bildirimlerden anlık toplam. */
export function ayrilmisAdetler(
  bildirimler: {
    durum: NoticeStatus;
    reservedVariantId: string | null;
    reservedQuantity: number;
  }[],
): Map<string, number> {
  const toplam = new Map<string, number>();
  for (const b of bildirimler) {
    if (!b.reservedVariantId || b.reservedQuantity <= 0) continue;
    if (!ayrilmisSayilirMi(b.durum)) continue;
    toplam.set(
      b.reservedVariantId,
      (toplam.get(b.reservedVariantId) ?? 0) + b.reservedQuantity,
    );
  }
  return toplam;
}

/**
 * GEREKÇE → DEĞİŞİM ÜRÜNÜ AYRILIR MI?
 *
 * Değişim gerekçelerinde müşteriye yeni ürün gidecek; hangi ürünün
 * ayrıldığı bildirimde beyan edilir (senaryo 1, 2, 6). Diğer gerekçelerde
 * hüküm mal gelince verilir, peşin ayırma yapılmaz.
 */
export const DEGISIM_GEREKCELERI: ReturnReason[] = [
  "DEGISIM",
  "DEGISIM_KUSURLU",
  "YANLIS_URUN",
];

export function degisimAyrilirMi(gerekce: ReturnReason): boolean {
  return DEGISIM_GEREKCELERI.includes(gerekce);
}

/**
 * İTİRAZ DALINA GİREBİLİR Mİ?
 *
 * İtiraz, "ürün kullanılmış geldi" iddiasıyla pazaryerine yapılır — yani
 * mal ELİMİZDE olmalı. Bildirim aşamasında (mal yolda) itiraz açmak,
 * görmediğimiz bir malı kullanılmış ilan etmek olurdu.
 */
export function itirazAcilabilirMi(durum: NoticeStatus): boolean {
  return durum === "MAL_GELDI";
}

/**
 * KAPANIŞTA İADE DOĞAR MI?
 *
 * ITIRAZ_KABUL → HAYIR (lehe kapanış, ürün müşteride, kâr etkisi yok).
 * Diğer kapanışlar iade işlendiği için doğar.
 * IPTAL → HAYIR (mal hiç gelmedi).
 */
export function kapanistaIadeDogarMi(oncekiDurum: NoticeStatus): boolean {
  return iadeIslenebilirMi(oncekiDurum);
}

/**
 * "İADEYİ İŞLE" KAPALIYSA SEBEP ANAHTARI — BOŞ KALAMAZ.
 *
 * Mimar kuralı 14.08.2026: kapalı düğme PASİF görünür ve NEDENİ ekranda
 * yazar. Sebep metni sözlükten gelir; burada yalnız ANAHTARI duruyor ki
 * ekran ile kural aynı kaynaktan beslensin.
 *
 * `null` = düğme AÇIK, sebep gerekmez. `Record<NoticeStatus, …>` tipi
 * bilerek dar: şemaya yeni bir durum eklenip sebebi yazılmazsa proje
 * DERLENMEZ — sebepsiz pasif düğme çıkması imkânsız.
 */
export const IADE_ISLE_SEBEP_ANAHTARI: Record<NoticeStatus, string | null> = {
  MAL_GELDI: null,
  ITIRAZ_RED: null,
  BEKLENIYOR: "iadeIsleSebepBekleniyor",
  ITIRAZ_ACILDI: "iadeIsleSebepItirazSuruyor",
  ITIRAZ_INCELEMEDE: "iadeIsleSebepItirazSuruyor",
  ITIRAZ_KABUL: "iadeIsleSebepItirazKabul",
  KAPANDI: "iadeIsleSebepKapandi",
  IPTAL: "iadeIsleSebepIptal",
};
