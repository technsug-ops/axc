/**
 * ============================================================================
 *  METİN BENZERLİĞİ — ORTAK MODÜL
 * ----------------------------------------------------------------------------
 *  Levenshtein uzaklığı önce `ice-aktarma/dogrula.ts` içinde yazılmıştı;
 *  kategori/raf adındaki yazım hatasını yakalamak içindi ("Elektonik" →
 *  "Elektronik"). Aynı hesap artık ÜRÜN FORMUNDA da gerekiyor: aynı ürünün
 *  ikinci kez açılmasını sormak için.
 *
 *  Ürün formunun içe aktarma modülünden bir şey çağırması yanlış olurdu —
 *  o modül elektronik tabloya özel. Hesap buraya taşındı, `dogrula.ts`
 *  buradan kullanıyor.
 * ============================================================================
 */

/** Karşılaştırma anahtarı: Türkçe küçük harf + kırpma. */
export function anahtarla(deger: string): string {
  return deger.trim().toLocaleLowerCase("tr");
}

/** İki metin arasındaki düzenleme uzaklığı (Levenshtein). */
export function uzaklikHesapla(a: string, b: string): number {
  const onceki = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let sonUstSol = onceki[0];
    onceki[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const gecici = onceki[j];
      onceki[j] = Math.min(
        onceki[j] + 1,
        onceki[j - 1] + 1,
        sonUstSol + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      sonUstSol = gecici;
    }
  }
  return onceki[b.length];
}

/**
 * Yazım hatasını yakalamak için EN YAKIN TEK adayı bulur.
 * "Elektonik" yazıldığında "Elektronik" önerilir.
 */
export function enYakin(aranan: string, adaylar: string[]): string | null {
  const hedef = anahtarla(aranan);
  let enIyi: string | null = null;
  let enIyiUzaklik = Infinity;

  for (const aday of adaylar) {
    const uzaklik = uzaklikHesapla(hedef, anahtarla(aday));
    if (uzaklik < enIyiUzaklik) {
      enIyiUzaklik = uzaklik;
      enIyi = aday;
    }
  }

  // Çok uzaksa öneri vermek kafa karıştırır.
  const esik = Math.max(2, Math.floor(hedef.length / 3));
  return enIyiUzaklik <= esik ? enIyi : null;
}

/**
 * Eşiğin altındaki TÜM adayları döndürür — "en yakın bir tane" değil.
 *
 * Mükerrer ürün sorusunda tek aday yetmez: "Kablosuz Kulaklık Siyah" ile
 * "Kablosuz Kulaklık Beyaz" ikisi birden gösterilmeli ki kullanıcı doğru
 * olanı seçebilsin.
 *
 * Eşik uzunlukla ölçeklenir: kısa adlarda 1-2 harf fark ciddi, uzun adlarda
 * değil. Sabit eşik kısa adlarda hiç yakalamaz, uzun adlarda her şeyi yakalar.
 */
export function benzerleriBul<T>(
  aranan: string,
  adaylar: T[],
  metniAl: (aday: T) => string,
  enFazla = 5,
): T[] {
  const hedef = anahtarla(aranan);
  if (hedef.length < 3) return [];

  const esik = Math.max(2, Math.floor(hedef.length / 4));

  return adaylar
    .map((aday) => ({
      aday,
      uzaklik: uzaklikHesapla(hedef, anahtarla(metniAl(aday))),
    }))
    .filter((k) => k.uzaklik <= esik)
    .sort((a, b) => a.uzaklik - b.uzaklik)
    .slice(0, enFazla)
    .map((k) => k.aday);
}
