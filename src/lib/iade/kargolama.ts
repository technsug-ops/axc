import type { NoticeStatus } from "@/generated/prisma/enums";

/**
 * ============================================================================
 *  KARGOLANMASI GEREKEN İADELER (K31 ②)
 * ----------------------------------------------------------------------------
 *  İtirazımız kabul edildiğinde ürün BİZDE kalır ve müşteriye geri
 *  gönderilir. `docs/iade-sureci.md` §5: pazaryeri bir KARGO KODU atar ve
 *  ürün **2 iş günü içinde** o kodla gönderilir.
 *
 *  ⚠ BU FİZİKSEL İŞ BUGÜNE KADAR HİÇBİR YERDE GÖRÜNMÜYORDU. Durum rozetinde
 *  "İtiraz kabul" yazıyordu ve bu bir SONUÇ gibi okunuyordu — oysa orada
 *  yapılacak bir iş var ve süresi işliyor.
 *
 *  ⚠ YENİ DURUM/ALAN AÇILMADI — KURAL TÜRETİLDİ. Aynı yöntem Hepsiburada'nın
 *  iki sekmesi için de kullanılmıştı (§11.3): sekme modele gömülmedi, mevcut
 *  alanlardan türetildi.
 *
 *      ITIRAZ_KABUL + kargo kodu BOŞ  → GÖNDERIME HAZIR (kod bekleniyor
 *                                        ya da girilmedi)
 *      ITIRAZ_KABUL + kargo kodu DOLU → KARGODA (yola çıktı)
 *
 *  ⚠ VE KOD BOŞSA İŞ "YAPILMADI" DEĞİL "BAŞLAMADI"DIR. Pazaryeri kodu
 *  atamamış da olabilir; bu yüzden boşluk bir suçlama değil, bir sıradaki
 *  adımdır.
 * ============================================================================
 */

export const KARGOLAMA_DURUMLARI = ["GONDERIME_HAZIR", "KARGODA"] as const;
export type KargolamaDurumu = (typeof KARGOLAMA_DURUMLARI)[number];

/**
 * KARGOLAMA İŞİ HANGİ DURUMDA DOĞAR.
 *
 * ⚠ TEK DURUM VE BU BİLEREK DAR. `ITIRAZ_RED` de kapanışa gider ama orada
 * ürün MÜŞTERİYE GİTMEZ: itirazımız reddedilmiştir, iade onaylanır ve mal
 * bizde kalır (iade işlenir). Kutuya onu da koysaydık, yapılmayacak bir iş
 * her gün listede durur ve kutu okunmaz olurdu.
 */
export function kargolamaDogurur(durum: NoticeStatus): boolean {
  return durum === "ITIRAZ_KABUL";
}

/**
 * BİR BİLDİRİMİN KARGOLAMA DURUMU — `null` ise bu kayıt kutuya girmez.
 *
 * ⚠ ÖLÇÜT KARGO KODUNUN VARLIĞI, BİR BAYRAK DEĞİL. Ayrı bir "gönderildi"
 * alanı açsaydık iki gerçek olurdu ve biri gün gelip ötekinden ayrışırdı:
 * kodu olan ama bayrağı boş bir kayıt hangisidir? Kodun kendisi olayın
 * kanıtı.
 */
export function kargolamaDurumu(bildirim: {
  status: NoticeStatus;
  iadeKargoKodu: string | null;
}): KargolamaDurumu | null {
  if (!kargolamaDogurur(bildirim.status)) return null;
  return bildirim.iadeKargoKodu?.trim() ? "KARGODA" : "GONDERIME_HAZIR";
}

/**
 * ASKIDAKİ KAYIT — ARIZA KUTUSU.
 *
 * ⚠ BOŞ OLMASI BEKLENEN YER. Askı, sürecin DURDUĞU yerdir: ne saat işler
 * (bkz. `lib/iade/sayac.ts` → `DURUM_SAYACI.ASKIDA === null`) ne bir sonraki
 * adım bellidir. Boşken de gösterilir — anayasa "açık sıfır": bir şeyin
 * YOKLUĞUNDAN "sorun yok" sonucu çıkarmak imkânsızdır, kullanıcı boş bir
 * bölümü "ekran bozuk" diye okur.
 */
export function askidaMi(durum: NoticeStatus): boolean {
  return durum === "ASKIDA";
}
