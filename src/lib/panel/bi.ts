/**
 * ============================================================================
 *  PANEL İŞ ZEKÂSI METRİKLERİ — SAF HESAP (Algoritmo kıyası, 07.10.2026)
 * ----------------------------------------------------------------------------
 *  Kullanıcı kararı 07.10.2026: «Algoritmo'da olup bizde olmayanlardan bizim
 *  için değerli olanları içeri al» (`docs/algoritmo-analizi.md` §6.1–6.8).
 *  Burada yalnız EŞİK GEREKTİRMEYEN ölçüler var:
 *    · maliyet sürücüleri (paranın nereye gittiği — kesinti kodu başına pay)
 *    · ABC sınıfları (satış payına göre)
 *    · stok devir hızı ve «stok kaç gün yeter»
 *    · ortalama sipariş tutarı ve adet başına NET-2
 *  «Az / fazla / ölü stok» sınıflaması KULLANICININ gün sınırlarını bekliyor;
 *  sınır uydurulmaz (anayasa: «eşiği soruyu soran koyamaz»).
 *
 *  ⚠ BÖLME KAPISI: payda sıfır ya da eksiyse sonuç `null` — «0» değil.
 *  `null` = «hesaplanamaz», `0` = «ölçtüm, sıfır» (anayasa: varsayılan değer
 *  alanın anlamından türetilir).
 * ============================================================================
 */

/** Bir kesinti kodunun dönem toplamı ve cirodaki payı. */
export type SurucuSatiri = { kod: string; tutar: number; pay: number | null };

/**
 * MALİYET SÜRÜCÜLERİ — kesintiler büyükten küçüğe, her biri brüt ciroya oranla.
 * Pay ciroya göredir (Algoritmo «Cost Driver» toplam maliyete göre verir;
 * bizde soru «cironun ne kadarı nereye gitti» — NET-2 marjıyla aynı payda).
 * Sıfır tutarlı kod listeden düşmez: «ölçtüm, sıfır» da bir cevaptır.
 */
export function maliyetSurucuculeri(
  ciro: number,
  kesintiler: readonly { kod: string; tutar: number }[],
): SurucuSatiri[] {
  const toplam = new Map<string, number>();
  for (const k of kesintiler) toplam.set(k.kod, (toplam.get(k.kod) ?? 0) + k.tutar);
  return [...toplam.entries()]
    .map(([kod, tutar]) => ({ kod, tutar, pay: ciro > 0 ? tutar / ciro : null }))
    .sort((a, b) => b.tutar - a.tutar || a.kod.localeCompare(b.kod));
}

export type AbcSinifi = "A" | "B" | "C";
export const ABC_SINIRLARI = { A: 0.8, B: 0.95 } as const;

export type AbcGirdisi = { urunId: string; ciro: number; stokDegeri: number };
export type AbcSatiri = { urunSayisi: number; ciro: number; ciroPayi: number | null; stokDegeri: number };
export type AbcSonucu = Record<AbcSinifi | "SATISSIZ", AbcSatiri>;

/**
 * ABC — SATIŞ PAYINA GÖRE (klasik Pareto: kümülatif %80 / %95).
 * ⚠ SINIFLAR BİR SÖZLEŞMEDİR, ÖLÇÜLMÜŞ EŞİK DEĞİL — ekranda tanımıyla yazar.
 * Ürün, KENDİSİNDEN ÖNCEKİ kümülatif pay sınırın altındaysa o sınıfa girer:
 * en çok satan ürün tek başına cironun %90'ını yapsa bile A'dır.
 * Dönemde satışı OLMAYAN stoklu ürün ayrı satırdır («satışsız») — C'ye
 * karıştırılsaydı «kuyruk» ile «hiç satmayan» aynı görünürdü.
 */
export function abcSiniflari(urunler: readonly AbcGirdisi[]): AbcSonucu {
  const bos = (): AbcSatiri => ({ urunSayisi: 0, ciro: 0, ciroPayi: null, stokDegeri: 0 });
  const sonuc: AbcSonucu = { A: bos(), B: bos(), C: bos(), SATISSIZ: bos() };
  const satanlar = urunler.filter((u) => u.ciro > 0).sort((a, b) => b.ciro - a.ciro || a.urunId.localeCompare(b.urunId));
  const toplam = satanlar.reduce((t, u) => t + u.ciro, 0);
  let kumulatif = 0;
  for (const u of satanlar) {
    const onceki = toplam > 0 ? kumulatif / toplam : 0;
    const sinif: AbcSinifi = onceki < ABC_SINIRLARI.A ? "A" : onceki < ABC_SINIRLARI.B ? "B" : "C";
    const s = sonuc[sinif];
    s.urunSayisi += 1;
    s.ciro += u.ciro;
    s.stokDegeri += u.stokDegeri;
    kumulatif += u.ciro;
  }
  for (const u of urunler) {
    if (u.ciro > 0 || u.stokDegeri <= 0) continue;
    sonuc.SATISSIZ.urunSayisi += 1;
    sonuc.SATISSIZ.stokDegeri += u.stokDegeri;
  }
  for (const k of ["A", "B", "C"] as const) sonuc[k].ciroPayi = toplam > 0 ? sonuc[k].ciro / toplam : null;
  return sonuc;
}

/**
 * STOK DEVİR HIZI — dönemde satılan malın maliyeti ÷ bugünkü stok değeri.
 * ⚠ Payda BUGÜNÜN stok değeri (ortalama stok değil): ortalama için dönem
 * başı değeri gerekirdi ve o hesap ayrı bir sorgu ister; ekranda tanımı yazar.
 */
export function devirHizi(satilanMalinMaliyeti: number, stokDegeri: number): number | null {
  return stokDegeri > 0 && satilanMalinMaliyeti >= 0 ? satilanMalinMaliyeti / stokDegeri : null;
}

/** STOK KAÇ GÜN YETER — bugünkü stok değeri ÷ dönemin GÜNLÜK satılan mal maliyeti. */
export function stokGunu(stokDegeri: number, satilanMalinMaliyeti: number, gunSayisi: number): number | null {
  if (gunSayisi <= 0 || satilanMalinMaliyeti <= 0 || stokDegeri < 0) return null;
  return stokDegeri / (satilanMalinMaliyeti / gunSayisi);
}

/** Bölme kapılı oran: payda ≤ 0 ise `null`. */
export function oranVeyaBos(pay: number, payda: number): number | null {
  return payda > 0 ? pay / payda : null;
}
