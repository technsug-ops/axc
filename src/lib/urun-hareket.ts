import { prisma } from "@/lib/prisma";

/**
 * ============================================================================
 *  ÜRÜN HAREKET GÖRDÜ MÜ?
 * ----------------------------------------------------------------------------
 *  Kimlik kuralı: SKU ve Firma SKU DOĞDUKTAN SONRA DEĞİŞMEZ. Kod etikete
 *  basılıp ürüne yapıştırılıyor; değiştirmek depodaki etiketi yalancı yapar
 *  ve "bu kutu hangi ürün?" sorusunun cevabını bozar.
 *
 *  Ama kural yalnızca HAREKET GÖRMÜŞ ürün için geçerlidir. Yeni açılmış,
 *  hiç alım/satış girilmemiş bir ürünün kodu serbestçe düzeltilebilir —
 *  canlıdaki mevcut ürünler bu sayede yeni standarda çekilebilir.
 *
 *  DÖRT KAYNAK sorulur; biri bile varsa ürün "hareketli" sayılır:
 *    stok hareketi · alım kalemi · satış kalemi · iade kalemi
 *
 *  İade kalemi ayrıca sorulur çünkü iade, satışı olmayan bir varyanta
 *  DEĞİŞİM olarak da yazılabilir (ReturnItem.exchangeVariantId).
 * ============================================================================
 */
export async function urunHareketliMi(urunId: string): Promise<boolean> {
  const [hareket, alim, satis, iade, degisim] = await Promise.all([
    prisma.stockMovement.count({ where: { variant: { productId: urunId } } }),
    prisma.purchaseItem.count({ where: { variant: { productId: urunId } } }),
    prisma.saleItem.count({ where: { variant: { productId: urunId } } }),
    prisma.returnItem.count({ where: { variant: { productId: urunId } } }),
    prisma.returnItem.count({
      where: { exchangeVariant: { productId: urunId } },
    }),
  ]);

  return hareket + alim + satis + iade + degisim > 0;
}

/**
 * Kilitli üründe kod değişikliği denenmiş mi?
 * İstemcideki `disabled` yalnızca kolaylıktır; gerçek koruma buradadır —
 * form doğrudan da gönderilebilir.
 *
 * @returns Değişikliğe kalkışılan varyantların MEVCUT sku'ları.
 */
export async function degisenKodlar(
  urunId: string,
  gelen: { id?: string; sku: string; companySku: string }[],
): Promise<string[]> {
  const mevcutlar = await prisma.productVariant.findMany({
    where: { productId: urunId },
    select: { id: true, sku: true, companySku: true },
  });
  const harita = new Map(mevcutlar.map((v) => [v.id, v]));

  const degisenler: string[] = [];
  for (const v of gelen) {
    if (!v.id) continue; // yeni varyant — kilit onu bağlamaz
    const eski = harita.get(v.id);
    if (!eski) continue;
    if (eski.sku !== v.sku || eski.companySku !== v.companySku) {
      degisenler.push(eski.sku);
    }
  }
  return degisenler;
}
