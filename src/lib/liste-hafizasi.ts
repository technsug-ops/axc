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


/**
 * ============================================================================
 *  "EN SON HANGI LISTEYI GORDUM" — GENEL HAFIZA (K133, 02.09.2026)
 * ----------------------------------------------------------------------------
 *  SORUN: ustteki hafiza TABAN ADRESE gore sakliyor. Urun detayi
 *  `<ListeyeDon href="/urunler">` diyor, yani YALNIZ `/urunler` anahtarina
 *  bakiyor. Kullanici `/stok`tan ya da `/rapor/urunler`den geldiyse o anahtar
 *  bostur ve baglanti duz `/urunler`e gider — SUZGEC KAYBOLUR.
 *
 *  OLCULDU 02.09.2026: urun detayina ALTI ekrandan giriliyor
 *  (`/rapor/urunler` · `/stok` · `/kart` · `/alimlar/[id]` · `/satislar/[id]` ·
 *  panel kartlari). `/stok`ta hafiza VAR ama detay onu okumuyor — farkli
 *  anahtar. Kullanici bunu `/rapor/urunler`de fark etti; kusur yeni DEGIL.
 *
 *  MODUL KENDI DOGRU SORUSUNU BASLIGINDA ZATEN YAZMISTI:
 *  "'bir adim geri' degil, EN SON HANGI LISTEYI GORDUM." Uygulamasi taban
 *  basina kalmisti; bu blok o soruyu GENEL olarak cevapliyor.
 *
 *  -- ETIKET DE SAKLANIYOR, VE BU TASARIMIN CEKIRDEGI ---------------------
 *  Yalniz adres saklansaydi baglanti "< Urunler" yazarken `/satislar`a
 *  giderdi: metin, davranisi YANLIS soyler (Ilke #2). Etiketi taban->ad
 *  eslemesinden turetmek ise ELLE TUTULAN BIR LISTE dogururdu ve yedinci
 *  liste eklendiginde sessizce eskirdi. Cozum: etiketi listenin KENDISI
 *  yazar — sayfa zaten kendi basligini biliyor, esleme hic dogmuyor.
 *
 *  -- IKINCI MEKANIZMA KURULMADI -----------------------------------------
 *  Cazip alternatif donus adresini baglantiya parametre olarak tasimakti
 *  (`?donus=...`). Ayni isi yapan IKINCI bir yol olurdu ve ikisi zamanla
 *  ayrisirdi. Bu blok var olan hafizanin USTUNE biniyor, yanina degil.
 * ============================================================================
 */

/** Genel anahtar — taban adi degil, sabit. */
const SON_ANAHTAR = ONEK + "__son__";

export type SonListe = { temel: string; adres: string; etiket: string };

/** Etiket ekrana basiliyor; sismis/bozuk deger okunmaz. */
const ETIKET_TAVANI = 60;

/**
 * TABAN DA DOGRULANIR. `adres` zaten `guvenliAdres` ile tabanina karsi
 * sinaniyor; ama taban `//baska-site.com` olsaydi adres de onunla baslayip
 * kontrolu gecerdi. Taban tek egik cizgiyle baslamak ZORUNDA.
 *
 * ============================================================================
 *  ⛔ PANEL (`temel: "/"`) BU KAPIDAN GECEMEZ — VE BU BIR EKSIK DEGIL,
 *     BILINCLI BIR GUVENLIK KARARIDIR. GERI EKLEMEYIN.
 * ----------------------------------------------------------------------------
 *  `temel.length > 1` sarti panelin tabanini (`/`) eliyor. Sebep:
 *  `guvenliAdres` bir adresi TABANIYLA BASLIYOR MU diye siniyor. Taban `/`
 *  olsaydi bu sart hicbir seyi elemezdi — kokten baslayan HER adres gecerdi.
 *  Ve buradan okunan deger dogrudan bir GEZINME HEDEFINE donusuyor
 *  (`<GeriBaglanti href={hedef}>`): depoyu kirletebilen biri kullaniciyi
 *  istedigi yere goturebilirdi.
 *
 *  ⚠ PANEL BUNDAN ZARAR GORMUYOR: kendi TABAN BASINA hafizasi
 *  (`listeyiHatirla("/", …)`) eskisi gibi calisiyor. Kaybedilen tek sey,
 *  "en son gordugum liste PANELDI" diye geri donmek — panel zaten bir
 *  DOKUM degil, sol menude her zaman bir tik uzakta.
 *
 *  ⭐ UC AY SONRA "panel niye yok" diye bakan icin: eksik olan sey
 *  panelin EKLENMESI degil, bu gerekcenin OKUNMASI. Eklemek isteyen once
 *  `guvenliAdres`in `/` tabaniyla neyi eledigini olcsun.
 *  _(Anayasa: "eski gerekce silinmez" — karar cevrilecekse NIYE cevrildigi
 *  bu satirlarin yanina yazilir.)_
 * ============================================================================
 */
function guvenliTaban(temel: string): boolean {
  return (
    temel.length > 1 &&
    temel.length <= TAVAN &&
    temel.startsWith("/") &&
    !temel.startsWith("//")
  );
}

/** En son gorulen listeyi hatirlar — taban, adres ve EKRANDAKI adiyla. */
export function sonListeyiHatirla(kayit: SonListe): void {
  if (!guvenliTaban(kayit.temel)) return;
  const adres = guvenliAdres(kayit.temel, kayit.adres);
  if (adres === null) return;
  const etiket = kayit.etiket.trim();
  if (etiket === "" || etiket.length > ETIKET_TAVANI) return;
  try {
    window.sessionStorage.setItem(
      SON_ANAHTAR,
      JSON.stringify({ temel: kayit.temel, adres, etiket }),
    );
  } catch {
    /** Depolama engelliyse baglanti duz listeye gider — bugunku davranis. */
  }
}

/**
 * En son gorulen liste; yoksa ya da guvenilmezse `null`.
 *
 * BOZUK KAYIT SESSIZCE KULLANILMAZ. `JSON.parse` duserse, alanlar eksikse
 * ya da adres kendi tabanina karsi dogrulanamiyorsa `null` doner — cagiran
 * kendi duz adresine duser. (Anayasa: "cozulemeyen iz susturmaz".)
 */
export function hatirlananSonListe(): SonListe | null {
  try {
    const ham = window.sessionStorage.getItem(SON_ANAHTAR);
    if (ham === null) return null;
    const c = JSON.parse(ham) as Partial<SonListe>;
    if (
      typeof c.temel !== "string" ||
      typeof c.adres !== "string" ||
      typeof c.etiket !== "string"
    ) {
      return null;
    }
    if (!guvenliTaban(c.temel)) return null;
    const adres = guvenliAdres(c.temel, c.adres);
    if (adres === null) return null;
    const etiket = c.etiket.trim();
    if (etiket === "" || etiket.length > ETIKET_TAVANI) return null;
    return { temel: c.temel, adres, etiket };
  } catch {
    return null;
  }
}
