/**
 * ============================================================================
 *  KÂR ORANLARI — İKİ ORAN, İKİ AYRI SORU
 * ----------------------------------------------------------------------------
 *  Tanımlar ARSIV.md'de mühürlü (14.08.2026):
 *
 *    Kâr / Maliyet       payda: ürün maliyeti, KDV HARİÇ
 *    Kâr / Satış fiyatı  payda: brüt ciro, KDV DAHİL
 *
 *  NEDEN MALİYET KDV HARİÇ: KDV eklemek paydayı yapay şişirir, oran
 *  olduğundan düşük görünür. ⚠ Bu KENDİLİĞİNDEN GELMİYOR — FIFO maliyeti
 *  KDV DÂHİL saklanıyor (`lib/kar.ts` başlığı: "TUTARLAR KDV DAHİLDİR —
 *  satış, maliyet, komisyon…"). Ayrıştırma çağıran tarafta `kdvHaric` ile
 *  yapılır; atlanırsa oran sessizce düşük çıkar ve kimse fark etmez.
 *
 *  NEDEN CİRO BRÜT: rakip araçlar müşteri ödemesi üzerinden hesaplıyor;
 *  karşılaştırılabilir olsun diye. Tanım ekranda yazılı olduğu için
 *  savunulabilir.
 *
 *  SIFIRA BÖLME SESSİZ GEÇMEZ: payda yoksa oran `null` döner ve ekran
 *  "—" gösterir. %0 yazmak "kâr yok" demek olurdu; oysa doğru cevap
 *  "hesaplanamıyor"dur — ikisi farklı şeydir.
 * ============================================================================
 */

/** Yüzde olarak oran; payda sıfır ya da eksiyse hesaplanamaz. */
export function karOrani(kar: number, payda: number): number | null {
  if (!Number.isFinite(kar) || !Number.isFinite(payda)) return null;
  if (payda <= 0) return null;
  return (kar / payda) * 100;
}

/**
 * Bir kutunun iki oranı.
 *
 * PAY, O KUTUNUN KENDİ KÂRIDIR — NET-1 kutusunda NET-1, NET-2 kutusunda
 * NET-2. Kullanıcı kararı 15.08.2026: _"net 1 kendi içinde, net 2 kendi
 * içinde değerlendirilmeli."_
 *
 * 14.08.2026'daki ilk mühür "pay ikisinde de NET-2" diyordu; aynı sayıyı
 * iki kutuda tekrarlamak bilgi taşımadığı için değişti. O kararın uyarısı
 * ise HÂLÂ GEÇERLİ: NET-1 stopaj öncesidir, bu yüzden NET-1'in oranı
 * NET-2'ninkinden HEP yüksek çıkar. İki oran birbirinin yerine geçmez;
 * aynı hesabın iki aşamasıdır.
 */
export function kutuOranlari(girdi: {
  kar: number;
  /** Ürün maliyeti, KDV HARİÇ (çağıran `kdvHaric` ile ayrıştırır). */
  maliyetKdvHaric: number;
  /** Brüt ciro, KDV DAHİL — iade düşülmemiş hâli. */
  brutCiro: number;
}): { maliyete: number | null; satisa: number | null } {
  return {
    maliyete: karOrani(girdi.kar, girdi.maliyetKdvHaric),
    satisa: karOrani(girdi.kar, girdi.brutCiro),
  };
}

// ---------------------------------------------------------------------------
//  SERMAYE VERİMİ — ÜRÜN KIRILIMI
// ---------------------------------------------------------------------------

/**
 * ============================================================================
 *  "PARAM NEREDE VERİMLİ ÇALIŞIYOR"
 * ----------------------------------------------------------------------------
 *  Kullanıcının örneği (14.08.2026): "1.000 ₺'lik üründen 200 ₺, 10.000 ₺'lik
 *  üründen 250 ₺ kazandım; sistemde 250 kazandığım 'en çok kazandıran'
 *  oluyor." Mutlak tutar yanıltıyor — 10.000 ₺'yi rafta tutup 250 ₺ kazanmak
 *  ile 1.000 ₺'yi tutup 200 ₺ kazanmak aynı şey değildir (%2,5 ve %20).
 *
 *  ── MARJDAN FARKI ───────────────────────────────────────────────────────
 *  Marj      = NET-2 / ciro     → "SATIŞTAN ne kaldı"
 *  Sermaye v.= NET-2 / maliyet  → "BAĞLI PARADAN ne kazandım"
 *  İkisi farklı soru; ekranda etiketleri ayrı yazılır, karışmasın.
 *
 *  ⚠ MALİYET KDV DÂHİL SAKLANIYOR. Payda `kdvHaric` ile ürünün KENDİ oranıyla
 *  ayrıştırılır. Bu adım atlanırsa oran sessizce DÜŞÜK çıkar ve kimse fark
 *  etmez — sözleşmenin adıyla işaretlediği tuzak (ARSIV.md).
 * ============================================================================
 */

/**
 * ── İKİ ORAN, İKİ KARAR EKSENİ (mimar kararı 15.08.2026) ────────────────
 *
 * ANA ORAN — NET-2 / maliyet KDV HARİÇ → "sermaye verimi"
 *   Malın KENDİSİNDEN kazanç. Pay ile payda aynı tabanda: NET-2'nin içinde
 *   alışta ödenen KDV zaten geri verilmiş durumda (`lib/kar.ts`:
 *   `net2 = net1 − (satisKdv − alisKdv − komisyonKdv)`). Paydaya KDV dahil
 *   koymak iki farklı taban karıştırır ve oranı yapay olarak DÜŞÜRÜR.
 *   SIRALAMA BUNDAN YAPILIR.
 *
 * İKİNCİL ORAN — NET-2 / maliyet KDV DAHİL → "bağlı nakit verimi"
 *   Kasadan çıkan paranın verimi. Kullanıcının işi faizsiz kart süresine
 *   dayalı: kartla ödenen 1.200 ₺'nin TAMAMI bağlı kalır, 200 ₺ KDV aylar
 *   sonra beyannameyle geri gelir. "Ekonomik kâr" ile "nakit bağlılığı"
 *   iki ayrı gerçek; tek rakam yanıltır — "en çok kâr eden vs sermaye
 *   verimi" ayrımının aynısı.
 *
 * HİYERARŞİ ŞART: ana oran baskın, nakit oranı küçük ve ikincil. Yoksa asıl
 * soru ("param nerede verimli") bulanır.
 */
export type SermayeGirdisi = {
  anahtar: string;
  ad: string;
  sku: string;
  net2: number;
  /** KDV HARİÇ maliyet — ANA oranın paydası. Bilinmiyorsa null. */
  maliyetKdvHaric: number | null;
  /** KDV DAHİL maliyet — nakit oranının paydası. Bilinmiyorsa null. */
  maliyetKdvDahil: number | null;
};

export type SermayeSatiri = SermayeGirdisi & {
  /** ANA: NET-2 / maliyet (KDV hariç), %. Sıralama ölçütü. */
  verim: number | null;
  /** İKİNCİL: NET-2 / maliyet (KDV dahil), %. */
  nakitVerimi: number | null;
};

/**
 * Ürünleri ANA orana (KDV hariç) göre AZALAN sıralar.
 *
 * ⚠ SIRALAMA NAKİT ORANDAN YAPILMAZ. İkisi çok yakın ama aynı değil; nakit
 * orandan sıralamak listeyi sessizce başka bir soruya göre dizerdi.
 *
 * MALİYETİ BİLİNMEYEN ÜRÜN LİSTEDEN ATILMAZ, SONA KONUR ve oranı `null`
 * kalır. Atılsaydı kullanıcı "bu ürün nerede" diye sorardı ve rakam sessizce
 * kaybolurdu; sıfır saysaydık en verimsiz gibi görünürdü — ikisi de yalan.
 */
export function sermayeVerimiSiralamasi(
  girdiler: SermayeGirdisi[],
): SermayeSatiri[] {
  return girdiler
    .map((g) => ({
      ...g,
      verim:
        g.maliyetKdvHaric === null ? null : karOrani(g.net2, g.maliyetKdvHaric),
      nakitVerimi:
        g.maliyetKdvDahil === null ? null : karOrani(g.net2, g.maliyetKdvDahil),
    }))
    .sort((a, b) => {
      if (a.verim === null && b.verim === null) return 0;
      if (a.verim === null) return 1;
      if (b.verim === null) return -1;
      return b.verim - a.verim;
    });
}
