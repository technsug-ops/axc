/**
 * ============================================================================
 *  HATA EKRANI — OTOMATİK YENİDEN DENEME (K358, kullanıcı «evet yap önerini» 22.10.2026)
 * ----------------------------------------------------------------------------
 *  22.10 sabahı veritabanı ~20 dk bağlantı kabul etmedi (K355); kullanıcı «Bu ekran
 *  çizilemedi»yi görüp elle «Tekrar dene»ye basmak zorunda kaldı. Kısa sarsıntıda
 *  ekran kendisi denesin: 5 → 10 → 20 → 30 sn, en çok 4 kez; sonra durur ve düğme
 *  kalır (gerçek bir kod hatası sonsuz yenileme döngüsü üretmesin).
 *
 *  ⚠ SAYI SAYFA YENİLEMESİNİ ATLATMALI: yeniden deneme sayfayı yeniden yükler ve
 *  bileşen durumu sıfırlanır. Sayı tutulmasaydı ekran 5 sn'de bir sonsuza kadar
 *  yenilerdi. Kayıt adrese ve zamana bağlı: başka adres ya da pencere dışı = sıfırdan.
 *  ⚠ Ekranın «veritabanı çalışıyor» hükmü 22.10'da YANILTICI çıktı (kontrol, veritabanı
 *  geri geldikten sonra yapıldı) — bu yüzden deneme hükümden BAĞIMSIZ yapılır.
 * ============================================================================
 */

export const OTOMATIK_BEKLEMELER_SN = [5, 10, 20, 30] as const;
/** Bir dizi denemenin «aynı olay» sayıldığı süre: beklemeler toplamı (65 sn) + yükleme payı. */
export const DENEME_PENCERESI_MS = 3 * 60_000;

export type DenemeKaydi = { yol: string; sayi: number; ilk: number };

/** Saf: önceki kayıt + adres + an → bu açılışta kaç sn sonra denenecek (null = artık denenmez) ve yeni kayıt. */
export function otomatikDenemeKarari(
  kayit: DenemeKaydi | null,
  yol: string,
  simdi: number,
): { bekleSn: number | null; yeniKayit: DenemeKaydi } {
  const devam = kayit !== null && kayit.yol === yol && simdi - kayit.ilk <= DENEME_PENCERESI_MS && kayit.sayi >= 0;
  const sayi = devam ? kayit.sayi : 0;
  const ilk = devam ? kayit.ilk : simdi;
  const bekleSn = OTOMATIK_BEKLEMELER_SN[sayi] ?? null;
  return { bekleSn, yeniKayit: { yol, sayi: bekleSn === null ? sayi : sayi + 1, ilk } };
}

/** Depodan gelen ham değeri çözer; biçim tutmazsa `null` (uydurulmaz → sıfırdan başlar). */
export function denemeKaydiCoz(ham: string | null): DenemeKaydi | null {
  if (!ham) return null;
  try {
    const d = JSON.parse(ham) as Record<string, unknown>;
    if (typeof d.yol !== "string" || typeof d.sayi !== "number" || typeof d.ilk !== "number") return null;
    if (!Number.isInteger(d.sayi) || d.sayi < 0) return null;
    return { yol: d.yol, sayi: d.sayi, ilk: d.ilk };
  } catch {
    return null;
  }
}
