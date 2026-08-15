/**
 * ============================================================================
 *  DAĞILIM ANALİZİ (2c) — "NEREYE YOĞUNLAŞMALIYIM"
 * ----------------------------------------------------------------------------
 *  Kullanıcının 1 numaralı sorusu. İki ayrı soruya iki ayrı cevap:
 *
 *    "Kârım nereden geliyor?"  → PARETO (kâr edenler, kümülatif %)
 *    "Nerede kanıyorum?"       → ZARAR KUTUSU (ayrı, kümülatife karışmaz)
 *
 *  ── NEDEN İKİ AYRI LİSTE (mimar kararı 15.08.2026) ──────────────────────
 *  Tek listede negatifleri de kümülatife katmak matematiği kırar: kümülatif
 *  %100'ü aşıp geri düşer, "%120" gibi anlamsız bir eğri çıkar ve pareto
 *  yalan söylüyormuş gibi durur. Ayırınca ikisi de temiz okunur ve rakam
 *  kaybolmaz — zarar kendi kutusunda toplamıyla durur.
 *
 *  ── SIFIR KÂR ÜRÜN HİÇBİR KUTUYA GİRMEZ ─────────────────────────────────
 *  Ne kâr ne zarar. Kâr kutusuna koysak payı %0 olur ve listeyi şişirir;
 *  zarar kutusuna koysak "zarar ettiriyor" demiş oluruz. Ayrı SAYILIR ve
 *  ekranda söylenir — sessizce kaybolmaz.
 * ============================================================================
 */

/** Dağılıma giren en küçük birim. */
export type DagilimGirdisi = {
  anahtar: string;
  ad: string;
  sku: string;
  net2: number;
};

export type ParetoSatiri = DagilimGirdisi & {
  /** Kendi kutusunun toplamı içindeki payı (%). */
  pay: number;
  /** Baştan buraya kadarki toplam pay (%). Son satır TAM 100'dür. */
  kumulatif: number;
};

export type ZararSatiri = DagilimGirdisi;

export type ParetoSonucu = {
  /** NET-2 pozitif ürünler, azalan sıralı, kümülatifli. */
  karEdenler: ParetoSatiri[];
  /** Kâr edenlerin NET-2 toplamı — kümülatifin paydası. */
  karToplami: number;
  /** NET-2 negatif ürünler, EN ÇOK ZARAR ETTİREN ÜSTTE. */
  zararEdenler: ZararSatiri[];
  /** Zarar toplamı — NEGATİF sayı olarak (işaret saklanmaz). */
  zararToplami: number;
  /** NET-2'si tam sıfır olan ürün sayısı. Hiçbir kutuya girmez. */
  notrAdet: number;
};

/**
 * Ürünleri kâr/zarar olarak ayırır ve kâr edenlere kümülatif pay yazar.
 *
 * KÜMÜLATİF TAM 100'DE BİTER. Kayan nokta toplamı 99,9999 bırakabilir;
 * son satır açıkça 100'e sabitleniyor. "Neredeyse 100" bir pareto grafiğinde
 * eğrinin ucunu havada bırakır ve kullanıcı "eksik bir şey mi var" diye
 * sorar — oysa yok.
 */
export function paretoKur(girdiler: DagilimGirdisi[]): ParetoSonucu {
  const karlilar = girdiler
    .filter((g) => g.net2 > 0)
    .sort((a, b) => b.net2 - a.net2);
  const zararlilar = girdiler
    .filter((g) => g.net2 < 0)
    .sort((a, b) => a.net2 - b.net2);
  const notrAdet = girdiler.filter((g) => g.net2 === 0).length;

  const karToplami = karlilar.reduce((t, g) => t + g.net2, 0);

  let yurur = 0;
  const karEdenler: ParetoSatiri[] = karlilar.map((g, i) => {
    const pay = karToplami > 0 ? (g.net2 / karToplami) * 100 : 0;
    yurur += pay;
    return {
      ...g,
      pay,
      // Son satır tam 100; aradaki kayan nokta artığı burada kapanır.
      kumulatif: i === karlilar.length - 1 ? 100 : yurur,
    };
  });

  return {
    karEdenler,
    karToplami,
    zararEdenler: zararlilar,
    zararToplami: zararlilar.reduce((t, g) => t + g.net2, 0),
    notrAdet,
  };
}

/**
 * "Kârının %X'i ilk N üründe" cümlesinin N'i ve X'i.
 *
 * Hedef yüzdeyi AŞAN ilk satırın sırası döner — "%70'i 5 üründe" derken
 * 5 ürün %70'e ULAŞMIŞ olmalı, yaklaşmış değil. Kâr eden ürün yoksa null.
 */
export function yogunlasma(
  pareto: ParetoSonucu,
  hedefYuzde: number,
): { urunSayisi: number; yuzde: number } | null {
  if (pareto.karEdenler.length === 0) return null;
  const yer = pareto.karEdenler.findIndex((s) => s.kumulatif >= hedefYuzde);
  const sira = yer === -1 ? pareto.karEdenler.length - 1 : yer;
  return {
    urunSayisi: sira + 1,
    yuzde: pareto.karEdenler[sira].kumulatif,
  };
}

/**
 * ZARARA GİDEN SATIŞ ÖZETİ (2b).
 *
 * Sayaç ile tıklanınca açılan listenin BİREBİR tutması şart. O yüzden ölçüt
 * burada tek yerde: NET-2 EKSİ **ve** kâr HESAPLANMIŞ. `lib/liste-suzgeci`
 * içindeki `kar=zarar` koşulu aynı iki şartı arıyor.
 *
 * Kârı hesaplanamayan satış zarar SAYILMAZ: zarar bir hükümdür, hesabı
 * bitmemiş satış hakkında hüküm verilmez. O kayıtlar kendi uyarısında
 * ("kârı hesaplanamayan") duruyor.
 */
export function zararOzeti(
  satislar: { net2: number | null; hesaplandiMi: boolean }[],
): { adet: number; toplam: number } {
  const zararlilar = satislar.filter(
    (s) => s.hesaplandiMi && s.net2 !== null && s.net2 < 0,
  );
  return {
    adet: zararlilar.length,
    toplam: zararlilar.reduce((t, s) => t + (s.net2 ?? 0), 0),
  };
}

// ---------------------------------------------------------------------------
//  KANAL DAĞILIMI
// ---------------------------------------------------------------------------

export type KanalGirdisi = {
  kanalKodu: string;
  kanalAdi: string;
  ciro: number;
  net2: number;
};

export type KanalPayi = KanalGirdisi & {
  /** Dönem cirosu içindeki pay (%). */
  ciroPayi: number;
  /**
   * Dönem NET-2'si içindeki pay (%). Toplam NET-2 sıfır ya da EKSİYSE
   * `null`: eksi bir toplamın içinde "pay" anlamsızdır ve işaretler
   * birbirini yiyerek %300 gibi rakamlar üretir.
   */
  net2Payi: number | null;
};

export type KanalDagilimi = {
  kanallar: KanalPayi[];
  ciroToplami: number;
  net2Toplami: number;
  /**
   * Dağılım ANLAMLI mı. Tek kanal varsa ya da ciro yoksa `false` — ekran
   * "tek kanaldan geliyor, dağılım yok" der. Sahte %100 GÖSTERİLMEZ.
   */
  anlamli: boolean;
};

/**
 * Yüzdeleri verilen basamağa yuvarlar ve YUVARLAMA ARTIĞINI KAYBETMEZ.
 *
 * Ham yüzdeler %100'e tam toplanır ama tek tek yuvarlanınca toplam 99,9 ya
 * da 100,1 olur. Artık EN BÜYÜK paya eklenir: orada bağıl hata en küçüktür
 * ve "toplam %100 değil" gibi bir çelişki ekrana çıkmaz.
 */
export function paylariDenkle(yuzdeler: number[], basamak = 1): number[] {
  if (yuzdeler.length === 0) return [];
  const kat = 10 ** basamak;
  const yuvarlanmis = yuzdeler.map((y) => Math.round(y * kat) / kat);

  /**
   * ⚠ DENKLEŞTİRME YALNIZ ZATEN %100 OLAN BİR DAĞILIMDA YAPILIR.
   *
   * İlk yazımda bu koruma yoktu ve `dagilim:dogrula` yakaladı: ciro sıfırken
   * girdiler [0, 0] geliyordu, artık 100 hesaplanıyordu ve en büyük paya
   * ekleniyordu — yani hiç satış olmayan bir dönemde ekrana "%100 Trendyol"
   * yazacaktı. Sözleşmenin ADIYLA yasakladığı SAHTE %100 buydu.
   *
   * Denkleştirme bir YUVARLAMA düzeltmesidir, eksik veriyi tamamlama aracı
   * değil. Ham toplam 100'e yakın değilse dokunulmaz.
   */
  const hamToplam = yuzdeler.reduce((t, y) => t + y, 0);
  if (Math.abs(hamToplam - 100) > 0.5) return yuvarlanmis;

  const toplam = yuvarlanmis.reduce((t, y) => t + y, 0);
  const artik = Math.round((100 - toplam) * kat) / kat;
  if (artik === 0) return yuvarlanmis;
  let enBuyuk = 0;
  for (let i = 1; i < yuvarlanmis.length; i += 1) {
    if (yuvarlanmis[i] > yuvarlanmis[enBuyuk]) enBuyuk = i;
  }
  const sonuc = [...yuvarlanmis];
  sonuc[enBuyuk] = Math.round((sonuc[enBuyuk] + artik) * kat) / kat;
  return sonuc;
}

export function kanalDagilimi(girdiler: KanalGirdisi[]): KanalDagilimi {
  const ciroToplami = girdiler.reduce((t, k) => t + k.ciro, 0);
  const net2Toplami = girdiler.reduce((t, k) => t + k.net2, 0);

  const ciroPaylari = paylariDenkle(
    girdiler.map((k) => (ciroToplami > 0 ? (k.ciro / ciroToplami) * 100 : 0)),
  );
  const net2Hesaplanabilir = net2Toplami > 0;
  const net2Paylari = net2Hesaplanabilir
    ? paylariDenkle(girdiler.map((k) => (k.net2 / net2Toplami) * 100))
    : [];

  return {
    kanallar: girdiler.map((k, i) => ({
      ...k,
      ciroPayi: ciroPaylari[i] ?? 0,
      net2Payi: net2Hesaplanabilir ? (net2Paylari[i] ?? 0) : null,
    })),
    ciroToplami,
    net2Toplami,
    anlamli: girdiler.length > 1 && ciroToplami > 0,
  };
}
