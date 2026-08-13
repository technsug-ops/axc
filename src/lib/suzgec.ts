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
