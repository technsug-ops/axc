/**
 * İhtiyaç duyulan TEK yetenek: ham sorgu çalıştırmak.
 *
 * `IslemIstemcisi` bilerek `$` ile başlayan her şeyi dışarıda bırakıyor
 * (iç içe transaction açılmasın diye). O tipi gevşetmek yerine burada
 * yalnızca gereken imza tanımlanıyor — transaction istemcisi bunu karşılar.
 */
type HamSorguIstemcisi = {
  $executeRawUnsafe(sorgu: string, ...parametreler: unknown[]): Promise<number>;
};

/**
 * ============================================================================
 *  TOPLU GÜNCELLEME — TEK SORGUDA ÇOK SATIR
 * ----------------------------------------------------------------------------
 *  NEDEN VAR (ölçüldü 12.08.2026): İçe aktarmanın "güncelle" kipi satır
 *  başına bir `update` çağırıyordu. 1054 satırlık gerçek katalogda:
 *
 *      1054 tek tek update  ->  90.746 ms  (satır başına ~86 ms)
 *      Prisma işlem sınırı  -> 120.000 ms
 *
 *  Pay %25. Kalem sayısı büyüse ya da ağ yavaşlasa işlem zaman aşımına
 *  düşer ve HİÇBİR satır yazılmaz. Kullanıcının haftalık komisyon güncelleme
 *  akışı tam olarak bu yola dayanıyor.
 *
 *  Süreyi yapan hesap değil, GİDİŞ-GELİŞ SAYISI. Bu yüzden satırlar
 *  paketlenip tek `UPDATE ... CASE` cümlesine çevriliyor: 1054 gidiş-geliş
 *  yerine 3.
 *
 *  TEK İŞLEM GÜVENCESİ KORUNUR: fonksiyon `tx` alır, kendi işlemini AÇMAZ.
 *  "Hepsi ya da hiçbiri" kuralı aynen geçerlidir.
 *
 *  ÜRETİLEN SQL:
 *      UPDATE `Tablo`
 *         SET `kolon` = CASE `id` WHEN ? THEN ? WHEN ? THEN ? ELSE `kolon` END,
 *             ...
 *       WHERE `id` IN (?, ?)
 *
 *  `ELSE kolon END` bilerek var: WHERE listesindeki ama o kolon için değeri
 *  verilmemiş bir satır olursa değeri KORUNUR, NULL'a düşmez.
 * ============================================================================
 */

/** Tek sorguya kaç satır konur. */
export const PAKET_BOYUTU = 500;

/** Tablo ve kolon adları KOD İÇİNDEN gelir; yine de dışarı sızmasın diye süzülür. */
const AD_DESENI = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type TopluSatir = {
  /** Birincil anahtar değeri. */
  id: string;
  /** Kolon adı -> yeni değer. null yazılabilir. */
  degerler: Record<string, unknown>;
};

/**
 * Verilen satırları toplu günceller ve YAZILAN SATIR SAYISINI döndürür.
 *
 * @param tx      Açık transaction istemcisi — kendi işlemini açmaz.
 * @param tablo   Tablo adı (kod içinden sabit).
 * @param satirlar Güncellenecek satırlar. Boşsa hiçbir sorgu atılmaz.
 */
export async function topluGuncelle(
  tx: HamSorguIstemcisi,
  tablo: string,
  satirlar: TopluSatir[],
  paketBoyutu = PAKET_BOYUTU,
): Promise<number> {
  if (satirlar.length === 0) return 0;
  if (!AD_DESENI.test(tablo)) {
    throw new Error(`Geçersiz tablo adı: ${tablo}`);
  }

  let toplam = 0;

  for (let i = 0; i < satirlar.length; i += paketBoyutu) {
    const paket = satirlar.slice(i, i + paketBoyutu);

    // Paketteki TÜM kolonların birleşimi — satırlar farklı kolon kümesi
    // taşıyabilir (biri rafı da güncelliyor, öteki yalnız komisyonu).
    const kolonlar = [...new Set(paket.flatMap((s) => Object.keys(s.degerler)))];
    if (kolonlar.length === 0) continue;

    for (const kolon of kolonlar) {
      if (!AD_DESENI.test(kolon)) {
        throw new Error(`Geçersiz kolon adı: ${kolon}`);
      }
    }

    const parametreler: unknown[] = [];
    const atamalar: string[] = [];

    for (const kolon of kolonlar) {
      // Bu kolon için değeri OLAN satırlar. Olmayanlar ELSE dalına düşer.
      const ilgili = paket.filter((s) => kolon in s.degerler);
      if (ilgili.length === 0) continue;

      const dallar: string[] = [];
      for (const satir of ilgili) {
        dallar.push("WHEN ? THEN ?");
        parametreler.push(satir.id, satir.degerler[kolon] ?? null);
      }
      atamalar.push(
        `\`${kolon}\` = CASE \`id\` ${dallar.join(" ")} ELSE \`${kolon}\` END`,
      );
    }

    if (atamalar.length === 0) continue;

    const idler = paket.map((s) => s.id);
    parametreler.push(...idler);

    const sorgu =
      `UPDATE \`${tablo}\` SET ${atamalar.join(", ")} ` +
      `WHERE \`id\` IN (${idler.map(() => "?").join(", ")})`;

    toplam += await tx.$executeRawUnsafe(sorgu, ...parametreler);
  }

  return toplam;
}
