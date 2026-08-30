/**
 * ============================================================================
 *  LİSTE HAFIZASI — "en son gördüğüm liste" (K104-②, 30.08.2026)
 * ----------------------------------------------------------------------------
 *  ⛔ SORUN: süzgeçli bir listeden bir kayda girip dönünce süzgeç kayboluyor.
 *  Liste durumunun tamamı ADRESTE olduğu için tarayıcının geri tuşu doğru
 *  çalışıyor; bozuk olan ekrandaki "‹ Liste" bağlantısı — sabit `/liste`
 *  yazıyor ve geliş adresini taşımıyor.
 *
 *  ── ⛔ NİYE `router.back()` DEĞİL — KARAR ÖLÇÜMLE ÇEVRİLDİ ──────────────
 *  İlk tasarım `router.back()` idi ve makul görünüyordu. Ölçüm çürüttü:
 *
 *      satislar/actions.ts:264   redirect(`/satislar/${yeniId}`)
 *      urunler/actions.ts:355    redirect(`/urunler/${yeniUrunId}`)
 *      urunler/actions.ts:496    redirect(`/urunler/${urunId}`)
 *
 *  Detay sayfasına listeden DEĞİL, **formdan yönlendirilerek** de geliniyor.
 *  Orada `back()` listeye değil FORMA döner — yani düzeltme, düzelttiği
 *  şeyden daha kötü bir davranış üretirdi. Ayrıca `history.length` "önceki
 *  adres bizim sitemiz mi" sorusunu cevaplamıyor.
 *
 *  ⭐ DOĞRU SORU "bir adım geri" değil, **"en son hangi listeyi gördüm"**.
 *  Cevabı tahmin edilmiyor, KAYDEDİLİYOR.
 *
 *  ── ⚠ DEPOLAMA ÖNKOŞUL DEĞİL, KOLAYLIK ─────────────────────────────────
 *  Yazma da okuma da sessizce başarısız olabilir (gizli sekme, site verisi
 *  engeli, kota). O hâlde bağlantı DÜZ listeye gider — yani bugünkü
 *  davranış. Hiçbir yolda bugünden KÖTÜ bir sonuç doğmuyor.
 *  _(Anayasa: "kalıcılık katmanı, çalışma katmanının önkoşulu yapılmaz".)_
 *
 *  ⚠ `sessionStorage` — `localStorage` DEĞİL. Hatırlanan şey o sekmedeki
 *  gezinme bağlamı; sekme kapanınca anlamını yitirir. `localStorage`
 *  kullanılsaydı üç gün önceki bir süzgeç bugün geri dönerdi ve kullanıcı
 *  hiç kurmadığı bir listeyle karşılaşırdı.
 * ============================================================================
 */

const ONEK = "selliora:liste:";

/** Adres kadar uzun bir değer saklanmaz — bozuk/şişmiş kayıt okunmaz. */
const TAVAN = 2048;

/**
 * ⚠ ÖLÇÜT DAR: yalnız aynı kökten, tek eğik çizgiyle başlayan göreli bir
 * adres kabul edilir. Depodan gelen değer bir gezinme hedefine dönüşüyor;
 * `//baska-site.com` gibi bir değer protokolsüz mutlak adres sayılır ve
 * kullanıcıyı dışarı taşırdı.
 */
function guvenliAdres(temel: string, deger: string): string | null {
  if (deger.length === 0 || deger.length > TAVAN) return null;
  if (!deger.startsWith(temel)) return null;
  /**
   * NIYE AYRICA BIR `//` KAPISI YOK — OLCULDU (30.08.2026).
   * Ilk yazimda `deger.startsWith("//")` diye ikinci bir kapi vardi ve
   * mutasyon onu KACIRDI. Sebep arandi: bu kapiyi kaldiran senaryoda
   * HICBIR girdi farkli sonuc vermiyor — asagidaki `kalan` olcutu
   * `//kotu.com`u da (temel "/" olsa bile) zaten eliyor.
   *
   * Hicbir girdinin ulasamadigi bir kapi koruma DEGIL, koruma IZLENIMIDIR:
   * okuyan "cift egik cizgi ayrica kontrol ediliyor" sanip asil olcute
   * bakmaz. Silindi; gerekcesi burada duruyor ki yarin biri "guvenlik
   * eksik" diye geri koymasin.
   */
  const kalan = deger.slice(temel.length);
  /** Ya tam olarak listenin kendisi ya da `?` ile başlayan bir sorgu. */
  if (kalan !== "" && !kalan.startsWith("?")) return null;
  return deger;
}

/** Listenin O ANKİ tam adresini hatırlar. Başarısızlık YUTULMAZ, geçilir. */
export function listeyiHatirla(temel: string, adres: string): void {
  const guvenli = guvenliAdres(temel, adres);
  if (guvenli === null) return;
  try {
    window.sessionStorage.setItem(ONEK + temel, guvenli);
  } catch {
    /**
     * ⚠ BOŞ DEĞİL — SEBEBİ VAR: depolama engelliyse yapılacak bir şey yok
     * ve kullanıcıya söylenecek bir şey de yok; bağlantı düz listeye gider.
     * Burada bir uyarı basmak, hiçbir işe yaramayan bir gürültü olurdu.
     */
  }
}

/** Hatırlanan adres; yoksa ya da güvenilmezse `null`. */
export function hatirlananListe(temel: string): string | null {
  try {
    const deger = window.sessionStorage.getItem(ONEK + temel);
    return deger === null ? null : guvenliAdres(temel, deger);
  } catch {
    return null;
  }
}
