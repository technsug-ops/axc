/**
 * ============================================================================
 *  KISA ÖNBELLEK — AĞIR PANEL BLOKLARI (K332, kullanıcı kararı 11.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı: «Panelin ağır blokları kısa süre hatırlansın» — rakam en
 *  fazla `PANEL_ONBELLEK_MS` eski olabilir. YALNIZ analiz blokları (iş zekası,
 *  kanal karşılaştırma) buradan geçer; bugünün rakamları ve görev kutusu ANLIK
 *  kalır. Blok, değerin NE ZAMAN hesaplandığını ekranda yazar (`an`) — eski bir
 *  rakam taze gibi görünmez.
 *
 *  ⚠ NİYE KENDİ YAZIMIMIZ: Next 16'da `unstable_cache` «yerini `use cache`a
 *  bıraktı» diye işaretli; `use cache` ayrı bir yapılandırma (Cache Components)
 *  ister. Anayasa: deneysel/geçiş aşamasındaki özellik kullanılmaz. Bu dosya
 *  sunucunun BELLEĞİNDE tutar — sunucu örneği yeniden başlarsa önbellek boşalır
 *  (zararsız: ilk açılış hesaplar).
 *
 *  ⚠ ANAHTAR FİRMAYI TAŞIR (çağıran yazar): çok firmalı yapıda bir firmanın
 *  rakamı ötekine gitmesin — tek firmalı bugün bile varsayım DERİNLEŞTİRİLMEZ.
 *  ⚠ HATA ÖNBELLEĞE YAZILMAZ: üretim düşerse kayıt silinir, sonraki açılış
 *  yeniden dener. Aynı anahtara eşzamanlı istekler TEK hesabı paylaşır.
 * ============================================================================
 */

/** Ağır panel bloklarının en fazla ne kadar eski gösterilebileceği (kullanıcı kararı: 2 dk). */
export const PANEL_ONBELLEK_MS = 2 * 60 * 1000;

/** Bellek tavanı — dönem/kanal birleşimleri sınırsız büyümesin; en eski kayıt düşer. */
const TAVAN = 200;

type Kayit = { bitis: number; an: Date; sonuc: Promise<unknown> };
const depo = new Map<string, Kayit>();

export type OnbellekSonucu<T> = { deger: T; an: Date };

export async function kisaOnbellek<T>(
  anahtar: string,
  sureMs: number,
  uret: () => Promise<T>,
  simdi: number = Date.now(),
): Promise<OnbellekSonucu<T>> {
  const kayit = depo.get(anahtar);
  if (kayit && kayit.bitis > simdi) {
    return { deger: (await kayit.sonuc) as T, an: kayit.an };
  }
  const an = new Date(simdi);
  const sonuc = uret();
  depo.set(anahtar, { bitis: simdi + sureMs, an, sonuc });
  if (depo.size > TAVAN) {
    const enEski = depo.keys().next().value;
    if (enEski !== undefined) depo.delete(enEski);
  }
  try {
    return { deger: await sonuc, an };
  } catch (hata) {
    if (depo.get(anahtar)?.sonuc === sonuc) depo.delete(anahtar);
    throw hata;
  }
}

/** Yalnız bekçi için: depoyu boşaltır (testler birbirini kirletmesin). */
export function kisaOnbellegiBosalt(): void {
  depo.clear();
}
