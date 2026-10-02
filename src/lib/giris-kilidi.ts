/**
 * ============================================================================
 *  GİRİŞ KİLİDİ — KABA KUVVET DENEMESİNE SINIR (02.10.2026, kullanıcı onayı)
 * ----------------------------------------------------------------------------
 *  ⛔ NİYE: giriş denemesine hiçbir sınır yoktu — bir bot parolayı dakikada
 *  binlerce kez deneyebilirdi ve hiçbir yerde iz kalmıyordu.
 *
 *  KURAL: aynı e-posta YA DA aynı IP'den son 15 dakikada 5 başarısız deneme
 *  → o kaynak, 5. denemeden itibaren en eski denemenin üzerinden 15 dakika
 *  dolana kadar giriş yapamaz. Kilitliyken parola HİÇ denenmez (doğru parola
 *  da reddedilir — yoksa kilit «bu parola doğru» bilgisini sızdırırdı).
 *
 *  ⭐ SAF: tarih listesi alır, karar döner. Depolama `AuditLog`
 *  (`GIRIS_BASARISIZ`) — yeni tablo AÇILMADI (anayasa: şema en pahalı çözüm;
 *  mevcut iz tablosu `action` + `createdAt` indeksiyle bu soruyu taşıyor).
 * ============================================================================
 */

export const GIRIS_DENEME_SINIRI = 5;
export const GIRIS_KILIT_DK = 15;

export type GirisKilidi = { kilitli: false } | { kilitli: true; acilis: Date };

/** `denemeler`: bu kaynağın başarısız deneme anları (sıra önemsiz). */
export function girisKilidi(denemeler: Date[], simdi: Date): GirisKilidi {
  const pencere = GIRIS_KILIT_DK * 60_000;
  const yakin = denemeler
    .filter((d) => simdi.getTime() - d.getTime() < pencere && d.getTime() <= simdi.getTime())
    .sort((a, b) => b.getTime() - a.getTime());
  if (yakin.length < GIRIS_DENEME_SINIRI) return { kilitli: false };
  /** Kilit, sınırı dolduran en eski denemenin üstünden 15 dk dolunca açılır. */
  const sinirDolduran = yakin[GIRIS_DENEME_SINIRI - 1];
  return { kilitli: true, acilis: new Date(sinirDolduran.getTime() + pencere) };
}
