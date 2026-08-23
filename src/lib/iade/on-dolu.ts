import { onDoluHedefKalem } from "./bildirim";

import type { ReturnReason } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  BİLDİRİMDEN İADE FORMUNA ÖN-DOLU GEÇİŞ — SAF KARAR
 * ----------------------------------------------------------------------------
 *  NEDEN AYRI DOSYA VE NEDEN SAF:
 *
 *  T4/14 iki kez düştü. İkinci düşüşte 142 kontrolün hepsi yeşildi çünkü
 *  kontroller yanlış şeyi sınıyordu: kaynak dosyada `AranabilirSecim` geçiyor
 *  mu, `hedefKalemId` yazılmış mı... Yani "KOD VAR MI" sorusuna cevap
 *  veriyorlardı, "EKRANA HANGİ DEĞER GİDİYOR" sorusuna değil. Metin araması
 *  bir alanın çizildiğini kanıtlayamaz; olsa olsa satırın silinmediğini
 *  kanıtlar. Kör nokta tam buradaydı.
 *
 *  Çözüm: ekranın verdiği İKİ kararı da buraya taşıdık —
 *    1. hangi kaleme, hangi değerler yazılır (`iadeFormuOnDolu`)
 *    2. ürün alanları çizilir mi (`urunAlanlariCizilirMi`)
 *  İkisi de saf; `rma:dogrula` bunları GERÇEK T4 şekliyle çağırıp dönen
 *  DEĞERLERİ sınıyor. Bileşen aynı fonksiyonları çağırıyor, kopya mantık yok.
 *
 *  Not: bu hâlâ bir DOM testi DEĞİLDİR. Projede tarayıcı otomasyonu yok
 *  (karar 08.08.2026); son söz gerçek cihazdaki Halil testinindir. Ama artık
 *  "değer doğru üretiliyor mu" sorusu koddan bağımsız olarak cevaplanıyor.
 * ============================================================================
 */

export type OnDoluBildirimi = {
  reason: ReturnReason;
  /** Geri GELEN (yanlışlıkla gitmiş) varyant. */
  returnedVariantId: string | null;
  /** Müşteriye ÇIKACAK doğru varyant (ayrılan). */
  reservedVariantId: string | null;
};

export type OnDoluKalemi = { saleItemId: string; variantId: string };

export type OnDoluSonucu = {
  /** Ön-dolu hangi kaleme yazılır; `null` ise TAHMİN YAPILMAZ. */
  hedefKalemId: string | null;
  /** Dönen ürün alanının başlangıç değeri (boş = satılan malın kendisi). */
  donenVaryantId: string;
  /** Değişim ürünü alanının başlangıç değeri (boş = değişim yok). */
  gonderilecekVaryantId: string;
  /** Hedef kalemin başlangıç adedi — alanların çizilmesini de tetikler. */
  adet: string;
  /** Bildirimden gerçekten ÜRÜN bilgisi geldi mi? */
  urunVar: boolean;
};

export const ON_DOLU_YOK: OnDoluSonucu = {
  hedefKalemId: null,
  donenVaryantId: "",
  gonderilecekVaryantId: "",
  adet: "",
  urunVar: false,
};

/**
 * ÖN-DOLU YALNIZ YANLIS_URUN'DA ÜRÜN TAŞIR. Diğer gerekçelerde dönen mal
 * satılan malın kendisidir; alanlara değer yazmak yanlış beyan olurdu.
 */
export function iadeFormuOnDolu(girdi: {
  bildirim: OnDoluBildirimi | null;
  kalemler: OnDoluKalemi[];
}): OnDoluSonucu {
  const { bildirim, kalemler } = girdi;
  if (bildirim === null) return ON_DOLU_YOK;

  /**
   * ⚠ AYRILAN ÜRÜN HER GEREKÇEDE TAŞINIR — 23.08.2026'DA DÜZELTİLDİ.
   *
   * Kural eskiden `reason !== "YANLIS_URUN"` ise HİÇBİR ŞEY taşımıyordu.
   * Yazıldığı gün doğruydu: ayırma yalnız `YANLIS_URUN`da doğuyordu. Sonra
   * iki kapı daha açıldı ve kural onları hiç görmedi:
   *   · müşterinin `DEGISIM` / `DEGISIM_KUSURLU` sebepleri
   *   · SATICININ itiraz gerekçesi `DEGISIM` (23.08.2026'da eklendi)
   *
   * Kullanıcı bildirdi: müşteri sebebi `HASARLI`, satıcı itirazı `DEGISIM`,
   * ayrılan ürün `axcali1610`. Form değişim alanını BOŞ açtı, kullanıcı
   * doldurmadı, `EXCHANGE_OUT` hiç yazılmadı — ürün depodan çıktı, defter
   * öğrenmedi.
   *
   * ⚠ ÖLÇÜT ARTIK GEREKÇE DEĞİL VERİ: ayrılmış bir ürün varsa taşınır.
   * Gerekçe listesine bağlı bir kural, yarın üçüncü bir kapı açıldığında
   * yine sessizce dışarıda bırakırdı.
   */
  const donen =
    bildirim.reason === "YANLIS_URUN" ? (bildirim.returnedVariantId ?? "") : "";
  const gonderilecek = bildirim.reservedVariantId ?? "";
  const urunVar = donen !== "" || gonderilecek !== "";
  if (!urunVar) return ON_DOLU_YOK;

  const hedefKalemId = onDoluHedefKalem({
    kalemler,
    ayrilanVaryantId: bildirim.reservedVariantId,
  });

  // Hedef yoksa değer YAZILMAZ; ekran bunu kullanıcıya söyler.
  if (hedefKalemId === null) {
    return { ...ON_DOLU_YOK, urunVar: true };
  }

  return {
    hedefKalemId,
    donenVaryantId: donen,
    gonderilecekVaryantId: gonderilecek,
    /**
     * ADET 1 — amaç kolaylık değil GÖRÜNÜRLÜK. Ürün alanları adet girilene
     * kadar çizilmiyordu; seçili gelen ürün ekranda hiç görünmüyordu.
     *
     * ⚠ AMA YALNIZ `YANLIS_URUN`DA — VE BU SINIR BİLEREK DAR (23.08.2026).
     * Form bu değeri hem "iade adedi" hem "SAĞLAM adet" alanına yazıyor.
     * `YANLIS_URUN`da mal kesin sağlam döner: yanlış ürün gönderilmiştir,
     * malın kusuru yoktur. Orada varsayım güvenli.
     *
     * `HASARLI` gibi bir sebeple gelen malın sağlam mı hasarlı mı olduğunu
     * SİSTEM BİLEMEZ. "1 sağlam" diye ön-doldursaydık ve kullanıcı düzeltmeyi
     * unutsaydı, HASARLI MAL STOĞA GİRERDİ (`RETURN_IN` yalnız sağlam
     * adetten yazılır) — bir kaybı düzeltirken başka bir kaydı bozardık.
     * Boş bırakmak, bilinmeyeni uydurmamaktır.
     */
    adet: bildirim.reason === "YANLIS_URUN" ? "1" : "",
    urunVar: true,
  };
}

/**
 * ÜRÜN ALANLARI (raf / değişim / dönen) ÇİZİLİR Mİ?
 *
 * Eski ölçüt yalnız `adet > 0` idi ve ön-dolu geçişi görünmez yapıyordu.
 * Yeni ölçüt: DOLU BİR DEĞER ASLA GİZLENMEZ.
 *
 * `stogaGirer` false ise (itirazlı iade) mal müşteride kalır; raf ve değişim
 * alanları anlamsızdır ve çizilmez.
 */
export function urunAlanlariCizilirMi(girdi: {
  stogaGirer: boolean;
  adet: number;
  gonderilecekVaryantId: string;
  donenVaryantId: string;
}): boolean {
  if (!girdi.stogaGirer) return false;
  return (
    girdi.adet > 0 ||
    girdi.gonderilecekVaryantId !== "" ||
    girdi.donenVaryantId !== ""
  );
}
