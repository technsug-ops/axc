/**
 * ============================================================================
 *  SATIŞ KALEMİNİN MALİYETİ — TEK KURAL
 * ----------------------------------------------------------------------------
 *  ⚠ 17.08.2026 CANLI HATASI. Satış 11513025054 (LEGO Mario Kart, ₺3.733)
 *  adedi 1→2 çıkarıldı, sonra 2→1 indirildi. Stok doğru döndü ama NET-2
 *  +₺695 kârdan −₺1.304 ZARARA düştü: kâr motoru hâlâ İKİ adetlik maliyet
 *  düşüyordu.
 *
 *  Sebep: maliyet YALNIZ `SALE_OUT` hareketlerinden toplanıyordu. Adet
 *  azalınca yazılan ayna giriş `ADJUSTMENT` tipindedir; süzgeç onu görmedi.
 *  Stok defteri iki hareketi de gördü, kâr defteri birini gördü — iki defter
 *  ayrıştı.
 *
 *  ── KURAL: TİP LİSTESİ DEĞİL, BAĞ ───────────────────────────────────────
 *  "Şu tipleri say" demek, yarın eklenecek her tipi sessizce dışarıda
 *  bırakır — düzeltilen hatanın tam kendisi. Ölçüt BAĞDIR:
 *
 *      Bir harekette `saleItemId` doluysa, o hareket O KALEMİN KENDİ
 *      STOK AKIŞIDIR ve maliyetine işaretiyle girer.
 *
 *  Ölçüldü (17.08.2026): `saleItemId` yazan yalnız iki yer var — satış
 *  çıkışı (`satis.ts`) ve adet düzenlemesi (`satis-duzenleme-veri.ts`).
 *  İade, iptal ve iptal geri alma hareketleri kaleme BAĞLANMAZ; onların
 *  kendi muhasebesi vardır ve bu toplama karışmazlar.
 *
 *  ── İŞARET ──────────────────────────────────────────────────────────────
 *  Maliyet = −Σ(quantityDelta × birimMaliyet)
 *    · çıkış  (−2 × 2.018,63) →  +4.037,26
 *    · ayna   (+1 × 2.018,63) →  −2.018,63
 *    · net                     =  2.018,63  ✓ tek adetlik maliyet
 * ============================================================================
 */

export type MaliyetHareketi = {
  /** NEGATİF çıkış, POZİTİF geri dönüş. */
  quantityDelta: number;
  birimMaliyet: string | null;
  birimMaliyetParaBirimi: string | null;
};

export type KalemMaliyeti = {
  /** Bilinmiyorsa null — hesaplanamayan maliyet SIFIR sayılmaz. */
  maliyet: number | null;
  paraBirimi: string | null;
};

/**
 * Kuruş tozunu siler. Decimal(18,4) ile aynı basamak.
 *
 * ŞART: gidiş-dönüş simetrisi buna bağlı. 2×2018,63 − 1×2018,63 kayan
 * noktada 2018,6299999999997 verebilir; "kuruşuna eşit" testi o zaman
 * sebepsiz kırmızı yanardı.
 */
function dortBasamak(d: number): number {
  return Math.round(d * 10000) / 10000;
}

export function kalemMaliyeti(hareketler: MaliyetHareketi[]): KalemMaliyeti {
  /**
   * ⛔ HAREKET YOKSA MALİYET **BİLİNMİYOR** — SIFIR DEĞİL (28.08.2026).
   *
   * Boş liste, FIFO bağının hiç kurulmadığı anlamına gelir: o kalem için
   * hangi partiden ne ödendiği sistemde YOK. Eski kod döngüye hiç girmeyip
   * `dortBasamak(0)` döndürüyordu ve sonuç şuydu — kalem `CALCULATED`
   * sayılıyor, `net2` maliyet düşülmeden yazılıyor, satış **tamamen kâr**
   * görünüyordu.
   *
   * ⚠ ÖLÇÜLDÜ 28.08.2026, canlı: bağı olmayan **2573 kalem** · ciro
   * ₺6.585.533 · yazılmış "net2" ₺4.573.976. Bunların **2493'ü
   * `CALCULATED`** damgalıydı. Ve ayrım TERTEMİZ çıktı — `MALIYET = 0`
   * olup HAREKETİ OLAN kalem sayısı **0**: yani gerçekten sıfır maliyetli
   * tek bir parti bile yok, her sıfır "bilinmiyor" demekti.
   *
   * ⚠ Bu, aynı gün komisyon tarafında düzeltilen null↔0 hatasının kâr
   * tarafındaki hâli — ama TERS yönde: orada `null` yazılıyordu ("komisyon
   * yok" denmesi gerekirken), burada `0` ("bilinmiyor" denmesi gerekirken).
   * _(Anayasa: "sessiz varsayım yok — hesaplanamayan sıfır DEĞİL, null.")_
   *
   * ⛔ Fonksiyonun kendi belgesi zaten bunu söylüyordu: _"Bilinmiyorsa null
   * — hesaplanamayan maliyet SIFIR sayılmaz."_ Kod o sözü boş listede
   * tutmuyordu.
   */
  if (hareketler.length === 0) return { maliyet: null, paraBirimi: null };

  let toplam = 0;
  let paraBirimi: string | null = null;

  for (const h of hareketler) {
    /**
     * MALİYETSİZ HAREKET → MALİYET BİLİNMİYOR. Sıfır saymak, maliyetsiz
     * bir satışı "tamamen kâr" göstermek olurdu.
     */
    if (h.birimMaliyet === null) return { maliyet: null, paraBirimi: null };
    toplam -= Number(h.birimMaliyet) * h.quantityDelta;
    paraBirimi = h.birimMaliyetParaBirimi;
  }

  return { maliyet: dortBasamak(toplam), paraBirimi };
}

/**
 * ============================================================================
 *  AÇIK ÇIKIŞLAR — HENÜZ GERİ DÖNMEMİŞ MAL
 * ----------------------------------------------------------------------------
 *  ⚠ Aynı kökün İKİNCİ yüzü, 17.08.2026 taramasında bulundu.
 *
 *  Maliyet hatası "SALE_OUT'ları TOPLA" idi. Aynı süzgeç bir de AYNA HAREKET
 *  YAZAN yerlerde duruyor: satış iptali ve "yanlış ürün gönderildi" iadesi,
 *  stoğa dönecek malı `SALE_OUT` satırlarından üretiyor.
 *
 *  Sonuç: adedi 2→1 indirilmiş bir satış İPTAL edilirse, defterde 1 adet
 *  açık olmasına rağmen stoğa 2 adet dönerdi. Kâr yanlış değil, STOK ŞİŞERDİ
 *  — ve şişme envanter değerine de yansırdı.
 *
 *  Bu fonksiyon "kaç adet hâlâ dışarıda" sorusunu yanıtlar: geri dönenler
 *  SON çıkıştan başlayarak kapatılır (`satis-adet.ts` azalışta hangi çıkışı
 *  aynaladıysa o sırayla), kalan açık çıkışlar döner.
 * ============================================================================
 */

export type StokHareketi = {
  quantityDelta: number;
  birimMaliyet: string | null;
};

export function acikCikislar<T extends StokHareketi>(
  hareketler: T[],
): (T & { adet: number })[] {
  const cikislar = hareketler.filter((h) => h.quantityDelta < 0);

  /** Geri dönen toplam — ayna girişler, iptal girişleri, düzeltmeler. */
  let donen = hareketler
    .filter((h) => h.quantityDelta > 0)
    .reduce((t, h) => t + h.quantityDelta, 0);

  /** SON ÇIKAN İLK KAPANIR — azalış aynasıyla aynı sıra. */
  const kalanlar = new Map<number, number>();
  for (let i = cikislar.length - 1; i >= 0; i--) {
    const adet = Math.abs(cikislar[i].quantityDelta);
    const kapanan = Math.min(adet, donen);
    donen -= kapanan;
    kalanlar.set(i, adet - kapanan);
  }

  return cikislar
    .map((h, i) => ({ ...h, adet: kalanlar.get(i) ?? 0 }))
    .filter((h) => h.adet > 0);
}
