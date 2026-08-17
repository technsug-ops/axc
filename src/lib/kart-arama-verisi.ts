import { prisma } from "@/lib/prisma";
import { VARYANT_SECIMI, varyantiOzetle, type VaryantSonucu } from "@/lib/varyant-ozet";
import { aramaKosulu, kodKosulu } from "@/lib/varyant-arama-kurali";

/**
 * ============================================================================
 *  KÂRLILIK KARTI ARAMASI — EN GENİŞ PERSPEKTİF
 * ----------------------------------------------------------------------------
 *  Kullanıcı isteği 17.08.2026: "kârlılık kartı aramaları en geniş
 *  perspektiften yapılabilsin — ürün sipariş kodu, pazaryeri SKU, firma SKU,
 *  ürün barkod, EAN vs."
 *
 *  Ortak varyant araması (`varyant-arama-kurali.ts`) BEŞ alana bakıyordu:
 *  SKU · Firma SKU · barkod (EAN) · pazaryeri SKU · ürün adı. Eksik olan
 *  SİPARİŞ KODUYDU: elinde sipariş numarası olan biri o siparişteki ürünün
 *  kârlılığına bakamıyordu.
 *
 *  ── NEDEN ORTAK ARAMAYA EKLENMEDİ ───────────────────────────────────────
 *  `varyantAra` satış ve alım formlarında da kullanılıyor; orada ürün
 *  seçilirken sipariş numarası aramak anlamsız, hatta yanıltıcı olurdu
 *  (yanlış ürün seçilebilir). Genişletme KARTA ÖZGÜ tutuldu: kart bir
 *  SORGULAMA aracıdır, kayıt aracı değil.
 *
 *  ── HANGİ SİPARİŞ KODLARI ───────────────────────────────────────────────
 *  Satış sipariş no (`Sale.code`) · alım kodu (`Purchase.code`) · tedarikçiye
 *  verilen sipariş no (`Purchase.supplierOrderNo`). Üçü de operasyonda
 *  "sipariş kodu" diye anılıyor ve elde hangisi varsa onunla aranabilmeli.
 * ============================================================================
 */

/** Sipariş kodundan varyant kimlikleri — satış ve alım tarafı birlikte. */
async function siparisKodundanVaryantlar(
  sorgu: string,
  tamEslesme: boolean,
): Promise<string[]> {
  const esle = tamEslesme ? { equals: sorgu } : { contains: sorgu };

  const [satislar, alimlar] = await Promise.all([
    prisma.sale.findMany({
      where: { code: esle, iptalTarihi: null },
      select: { items: { select: { variantId: true } } },
      take: 20,
    }),
    prisma.purchase.findMany({
      where: {
        OR: [{ code: esle }, { supplierOrderNo: esle }],
        NOT: { status: "CANCELLED" },
      },
      select: { items: { select: { variantId: true } } },
      take: 20,
    }),
  ]);

  return [
    ...satislar.flatMap((s) => s.items.map((k) => k.variantId)),
    ...alimlar.flatMap((a) => a.items.map((k) => k.variantId)),
  ];
}

/**
 * KART ARAMASI — serbest metin.
 *
 * Ortak varyant araması + sipariş kodları. Sonuçlar TEKİLLEŞTİRİLİR: aynı
 * varyant hem barkoduyla hem sipariş numarasıyla eşleşirse listede bir kez
 * görünür.
 */
export async function kartAramaSonuclari(
  sorgu: string,
): Promise<VaryantSonucu[]> {
  const temiz = sorgu.trim();
  if (temiz.length < 2) return [];

  const [dogrudan, siparisVaryantlari] = await Promise.all([
    prisma.productVariant.findMany({
      where: { isActive: true, OR: aramaKosulu(temiz) },
      select: VARYANT_SECIMI,
      take: 20,
      orderBy: { createdAt: "desc" },
    }),
    siparisKodundanVaryantlar(temiz, false),
  ]);

  const bulunanlar = new Set(dogrudan.map((v) => v.id));
  const eksikler = siparisVaryantlari.filter((id) => !bulunanlar.has(id));

  const ekler =
    eksikler.length === 0
      ? []
      : await prisma.productVariant.findMany({
          where: { id: { in: [...new Set(eksikler)] } },
          select: VARYANT_SECIMI,
          take: 20,
        });

  return [...dogrudan, ...ekler].map(varyantiOzetle);
}

/**
 * OKUTULAN/YAZILAN KOD — TAM eşleşme.
 *
 * Kamera okuması ve klavye girişi buradan geçer; tam eşleşme bulunursa kart
 * doğrudan açılır (bkz. `lib/kart-arama-karari.ts`).
 *
 * ⚠ SİPARİŞ KODU TAM EŞLEŞMEDE TEK ÜRÜNE İNİYORSA kabul edilir. Çok kalemli
 * bir siparişin numarası yazıldığında hangi ürünün kartı açılacağı belli
 * değildir — o durumda tam eşleşme DÖNMEZ ve kullanıcı listeden seçer.
 */
export async function kartKodlaBul(kod: string): Promise<{ id: string } | null> {
  const temiz = kod.trim();
  if (temiz === "") return null;

  const dogrudan = await prisma.productVariant.findFirst({
    where: { isActive: true, OR: kodKosulu(temiz) },
    select: { id: true },
  });
  if (dogrudan) return dogrudan;

  const varyantlar = [...new Set(await siparisKodundanVaryantlar(temiz, true))];
  return varyantlar.length === 1 ? { id: varyantlar[0] } : null;
}
