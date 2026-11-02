/**
 * ============================================================================
 *  SÜZGEÇ ADRESİ — SAF MANTIK
 * ----------------------------------------------------------------------------
 *  HER SÜZGEÇ URL'YE YAZILIR. Bileşen içinde saklanan bir süzgeç durumu YOK.
 *  Bedava gelenler:
 *    - Excel indirme ekrandakiyle BİREBİR aynı sonucu verir (alım aramasında
 *      tam tersini yaşadık: liste bir şey, inen dosya başka şey söylüyordu)
 *    - Geri/ileri tuşu çalışır
 *    - Süzülmüş liste linki paylaşılabilir, yer imine eklenebilir
 *    - Sunucu bileşeni doğrudan okur; istemciye durum taşımak gerekmez
 *
 *  Bu dosya veritabanına da React'e de dokunmaz — sınanabilir kalsın diye.
 * ============================================================================
 */

/** Sayfalama parametresi: süzgeç değişince HER ZAMAN sıfırlanır. */
export const SAYFA_PARAMETRESI = "sayfa";

/**
 * Mevcut parametrelerin üstüne değişiklikleri uygular ve adresi kurar.
 *
 * Boş değer (`""` veya `undefined`) parametreyi SİLER — "tümü" seçildiğinde
 * adreste `kanal=` gibi anlamsız bir kalıntı kalmasın.
 *
 * Sayfa numarası bilerek düşürülür: 7. sayfadayken süzgeç daraltılırsa
 * kullanıcı boş bir sayfaya düşer ve "kayıt yok" sanır. En sinsi liste
 * hatalarından biridir.
 */
export function suzgecAdresi(
  temel: string,
  mevcut: Record<string, string | undefined>,
  degisiklikler: Record<string, string | undefined>,
): string {
  const parametreler = new URLSearchParams();

  for (const [ad, deger] of Object.entries({ ...mevcut, ...degisiklikler })) {
    if (ad === SAYFA_PARAMETRESI) continue;
    const temiz = (deger ?? "").trim();
    if (temiz !== "") parametreler.set(ad, temiz);
  }

  const sorgu = parametreler.toString();
  return sorgu ? `${temel}?${sorgu}` : temel;
}

/** Ekranda rozet olarak gösterilecek aktif süzgeçler. */
export type AktifSuzgec = {
  ad: string;
  etiket: string;
  degerEtiketi: string;
};

/**
 * Hangi süzgeçler açık? Rozetler ve "Temizle" düğmesinin görünürlüğü
 * bundan beslenir. Aramanın (`q`) kendi kutusu olduğu için rozete girmez;
 * çağıran hangi parametrelerin rozetleneceğini kendisi verir.
 */
export function aktifSuzgecler(
  mevcut: Record<string, string | undefined>,
  tanimlar: {
    ad: string;
    etiket: string;
    cozumle?: (deger: string) => string;
  }[],
): AktifSuzgec[] {
  const sonuc: AktifSuzgec[] = [];
  for (const tanim of tanimlar) {
    const deger = (mevcut[tanim.ad] ?? "").trim();
    if (deger === "") continue;
    sonuc.push({
      ad: tanim.ad,
      etiket: tanim.etiket,
      degerEtiketi: tanim.cozumle ? tanim.cozumle(deger) : deger,
    });
  }
  return sonuc;
}

/**
 * ============================================================================
 *  DÖNEM ROZETİ VE "TEMİZLE" — SAF KURAL
 * ----------------------------------------------------------------------------
 *  ⚠ NİYE BURADA, BİLEŞENDE DEĞİL (21.08.2026):
 *  Kural önce doğrudan `SuzgecCubugu` içine yazılmıştı. Mutasyon denendi —
 *  kuralı devre dışı bırakmak hiçbir testi kırmadı, çünkü bileşenin içindeki
 *  koşul hiçbir yerden sınanmıyordu. Yeşil test, sınanmış kural demek
 *  değildir; kural saf işleve çıkarıldı.
 *
 *  ── SABİT DÖNEM NEDİR ───────────────────────────────────────────────────
 *  Bazı ekranlarda dönem BOŞ OLAMAZ (panel: seçilmemişse "Bu ay"a düşer).
 *  Orada dönemi kaldırılabilir bir rozet gibi göstermek YALAN olur —
 *  çarpıya basınca yine bir dönem seçili kalır. Listelerde ise "tüm
 *  zamanlar" gerçek bir seçenek ve rozet doğru.
 *
 *  Ayrıca seçili dönem zaten MAVİ DÜĞMEDE görünüyor; rozet onun tekrarıydı.
 * ============================================================================
 */
export function donemRozetiCizilirMi(
  zamanSecili: string,
  zamanSabit: boolean,
): boolean {
  return !zamanSabit && zamanSecili !== "";
}

/**
 * "Temizle" düğmesinin yazacağı boş parametreler.
 *
 * ⚠ SABİT DÖNEMLİ EKRANDA DÖNEM ELLENMEZ: temizlense de yine bir dönem
 * seçili kalacaktı, yani düğme kendi sözünü tutmamış olurdu.
 */
export function temizlemeDegisiklikleri(
  suzgecAdlari: readonly string[],
  zamanSabit: boolean,
): Record<string, string> {
  const giris: [string, string][] = suzgecAdlari.map((ad) => [ad, ""]);
  if (!zamanSabit) {
    giris.push(["pencere", ""], ["baslangic", ""], ["bitis", ""]);
  }
  return Object.fromEntries(giris);
}

/**
 * ============================================================================
 *  VARSAYILAN DONEM ADRESE YAZILMAZ (kullanici karari 02.11.2026, K367)
 * ----------------------------------------------------------------------------
 *  VAKA: kullanici telefonda paneli aciyor ve «Bu ay» secili geliyor — oysa
 *  panel varsayilani 21.08.2026'dan beri `BUGUN`. Olculdu: kodda `/` adresine
 *  `pencere=BU_AY` YAZAN hicbir yol yok (yonlendirme · ara katman · cerez ·
 *  menu/alt cubuk/kenar cubugu baglantisi · servis calisani · liste hafizasi —
 *  hafiza zaten `sessionStorage`, sekmeyle oluyor). Geriye tek yol kaliyor:
 *  ADRESIN KENDISI. Bir kez «Bu ay»a basilinca adres `/?pencere=BU_AY` olur ve
 *  telefon uygulamayi KALDIGI adresten acar.
 *
 *  VE ASIL KUSUR BIZDE: SABIT DONEMLI EKRANDA O PARAMETRE BIR DAHA
 *  SILINEMIYORDU. Rozet cizilmiyor (`donemRozetiCizilirMi`), yani carpi yok;
 *  «Temizle» de donemi bilerek ellemiyor (`temizlemeDegisiklikleri`). Panelde
 *  adrese yazilan bir donem orada SONSUZA KADAR kalir ve varsayilan gibi
 *  davranir — `PANEL_VARSAYILAN_PENCERE` ne derse desin. Kullanicinin gordugu
 *  sey bir varsayilan degil, UNUTULMUS BIR SECIMDI.
 *
 *  CARE: secilen donem ekranin VARSAYILANI ise parametre adrese yazilmaz,
 *  SILINIR. «Bugun»e basmak adresi `/` yapar; ve varsayilan yarin degisirse
 *  adrese cakilmis eski bir deger onu sessizce ezmez.
 *
 *  VARSAYILANI OLMAYAN EKRAN ETKILENMEZ: `varsayilan` bos gecilince hicbir
 *  gercek pencere ona esit sayilmaz ve davranis bugunkuyle AYNI kalir —
 *  bos secimin bos varsayilana esitlenmesi de ayrica eleniyor.
 * ============================================================================
 */
export function donemDegisikligi(
  secilen: string,
  varsayilan: string,
): Record<string, string> {
  /**
   * NIYE AYRICA BIR «SECILEN BOS MU» KAPISI YOK — OLCULDU (02.11.2026).
   * Ilk yazimda `secilen !== "" &&` diye bir kapi vardi. Hicbir girdi onunla
   * farkli sonuc vermiyor: `secilen` bos olsa `pencere` iki durumda da ""
   * olurdu. Ulasilamayan kapi koruma DEGIL, koruma IZLENIMIDIR — okuyan
   * «bos deger ayrica ele aliniyor» sanip asil olcute bakmaz. Silindi;
   * gerekcesi burada duruyor ki yarin biri geri koymasin.
   * _(Ayni gerekce: `liste-hafizasi.ts` -> `guvenliAdres`, 30.08.2026.)_
   */
  const varsayilanMi = secilen === varsayilan;
  return {
    pencere: varsayilanMi ? "" : secilen,
    baslangic: "",
    bitis: "",
  };
}

/** Geri dönüş sorgusunu taşıyan parametrenin adı. */
export const DONUS_PARAMETRESI = "donus";

/**
 * ============================================================================
 *  GERİ DÖNÜŞ ADRESİ — SÜZGEÇ DETAYA GİRİNCE KAYBOLMASIN
 * ----------------------------------------------------------------------------
 *  Kullanıcı bildirdi 21.08.2026: Alımlar'da süzgeç kurup bir kayda giriyor,
 *  "‹ Alımlar" tuşuna basınca SÜZGEÇSİZ listeye dönüyor. 190 kaydın içinde
 *  aradığı yeri yeniden kurmak zorunda kalıyor.
 *
 *  ── NİYE `donus` YOL DEĞİL, SORGU TAŞIYOR ───────────────────────────────
 *  ⚠ EN KOLAY ÇÖZÜM EN TEHLİKELİSİYDİ: dönülecek ADRESİ parametreye koymak
 *  (`?donus=/alimlar?durum=X`). O hâlde adres çubuğuna yazılan her şey bir
 *  yönlendirme hedefi olurdu — `?donus=//baska-site` yazan biri bizim
 *  sayfamızdaki bir bağlantıyı dışarı çevirebilirdi (açık yönlendirme).
 *
 *  Bu yüzden parametre YALNIZ SORGU DİZESİ taşır; yol HER ZAMAN çağıran
 *  ekranın kendi sabitinden gelir. Kullanıcıdan gelen metin bir yola
 *  DÖNÜŞEMEZ — kötü niyetli girdi en fazla anlamsız bir süzgeç üretir, onu
 *  da liste sayfası zaten kendi doğruluyor.
 *
 *  ── SESSİZ BÜYÜME YOK ───────────────────────────────────────────────────
 *  Sorgu, adres çubuğunda taşınıyor; sınırsız bırakılırsa zincir uzadıkça
 *  (liste → detay → düzenle) katlanarak büyüyebilir. Tavan konuldu ve
 *  aşılırsa parametre HİÇ taşınmaz: süzgeci kaybetmek, kırık bir bağlantı
 *  üretmekten iyidir.
 * ============================================================================
 */
export const DONUS_TAVANI = 512;

/**
 * Detay ekranına taşınacak dönüş değeri — listenin O ANKİ sorgu dizesi.
 *
 * Boş sorgu `undefined` döner: süzgeçsiz listeden girildiğinde adres
 * çubuğuna anlamsız bir `?donus=` eklemeye gerek yok.
 */
export function donusDegeri(
  mevcut: Record<string, string | undefined>,
): string | undefined {
  const parametreler = new URLSearchParams();
  for (const [ad, deger] of Object.entries(mevcut)) {
    // ⚠ `donus`un kendisi taşınmaz — yoksa her adımda kendini sarmalar.
    if (ad === DONUS_PARAMETRESI) continue;
    const temiz = (deger ?? "").trim();
    if (temiz !== "") parametreler.set(ad, temiz);
  }
  const sorgu = parametreler.toString();
  if (sorgu === "" || sorgu.length > DONUS_TAVANI) return undefined;
  return sorgu;
}

/**
 * Geri tuşunun gideceği adres.
 *
 * `temel` ÇAĞIRANIN SABİTİ (ör. "/alimlar"); `donus` kullanıcıdan gelebilir
 * ama yalnız sorgu olarak eklenir. Bu yüzden burada yol doğrulaması YOKTUR —
 * doğrulanacak bir yol hiç oluşmuyor.
 */
export function geriAdresi(temel: string, donus: string | undefined): string {
  const temiz = (donus ?? "").trim();
  if (temiz === "" || temiz.length > DONUS_TAVANI) return temel;
  /**
   * ⚠ ÇÖZÜMLENİP YENİDEN KURULUYOR. Ham metni yapıştırsaydım `?donus=a#b`
   * gibi bir girdi adrese çapa (`#`) ya da ikinci bir `?` sokabilirdi.
   * `URLSearchParams` girdiyi ayrıştırıp yeniden kodluyor.
   */
  const sorgu = new URLSearchParams(temiz).toString();
  return sorgu ? `${temel}?${sorgu}` : temel;
}

/**
 * ARADAKİ ADIMA dönüş değerini TAŞIR (tüketmez).
 *
 * ⚠ İKİ AYRI İŞ, İKİ AYRI İŞLEV:
 *   · `geriAdresi`   — TÜKETİR: `/alimlar?durum=X` (liste sahibinin adımı)
 *   · `donusTasiyan` — TAŞIR:   `/alimlar/123?donus=durum%3DX`
 *
 * İkisi karıştırılırsa zincir kopar: mal kabul ekranı `geriAdresi` kullansaydı
 * "geri" tuşu alım detayına DEĞİL, detayın adresine listenin süzgecini
 * yapıştırarak anlamsız bir yere giderdi.
 */
export function donusTasiyan(yol: string, donus: string | undefined): string {
  return suzgecAdresi(yol, {}, { [DONUS_PARAMETRESI]: donus });
}
