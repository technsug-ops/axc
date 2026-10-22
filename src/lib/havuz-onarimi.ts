/**
 * ============================================================================
 *  TAKILAN HAVUZUN KENDİNİ YENİLEMESİ (K359, kullanıcı «1 ve 2'yi yap» 22.10.2026)
 * ----------------------------------------------------------------------------
 *  22.10 akşamı (16:58–17:22 UTC) ana sayfa ~25 dk boyunca `pool timeout … active=0
 *  idle=0` ile düştü — AYNI anda: veritabanında bizim yalnız 5 bağlantımız vardı,
 *  sıcak tutma her dakika BAŞARILIYDI, ölçüm ucu 336–795 ms'de dönüyordu. Yani veritabanı
 *  ayakta, kota boş; bir sunucu kopyasının havuzu (16:59'daki kota dolmasından sonra)
 *  takılı kalmıştı ve kopya yeniden başlayana kadar düzelmedi. Aynı sürüm yeniden
 *  yayımlanınca (yeni kopyalar) hata SIFIRA indi.
 *  Çare: kopya bu hatayı görünce veritabanı istemcisini (ve havuzunu) YENİLER.
 *
 *  ⚠ YENİLEME FIRTINASI OLMAZ: aynı anda düşen onlarca istek her biri yeni havuz
 *  kursaydı kota daha da dolardı — en çok 30 sn'de bir yenilenir.
 *  ⚠ Kota GERÇEKTEN doluyken de aynı hata görülür; yenileme o durumda zararsızdır
 *  (yeni havuz da sırasını bekler) — ayırt edilmeye çalışılmaz, uydurma ölçüt yok.
 * ============================================================================
 */

export const ONARIM_ARALIGI_MS = 30_000;
/** Eski istemci bu kadar sonra kapatılır — o an süren başka sorgular yarıda kesilmesin. */
export const ESKI_ISTEMCI_KAPATMA_MS = 15_000;

/** Saf: hata, takılı havuzun imzasını taşıyor mu (sürücü mesajı: «pool timeout … active=0 idle=0»). */
export function havuzTakildiMi(hata: unknown): boolean {
  const metin = hata instanceof Error ? hata.message : String(hata);
  return /pool timeout/i.test(metin) && /active=0 idle=0/.test(metin);
}

/** Saf: son yenilemeden bu yana aralık doldu mu (ilk yenileme her zaman serbest). */
export function onarimYapilsinMi(sonOnarim: number | null, simdi: number): boolean {
  return sonOnarim === null || simdi - sonOnarim >= ONARIM_ARALIGI_MS;
}
