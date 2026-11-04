import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * KART EKRANI — DÖNEM PENCERESİ ÖLÇÜMÜ (SALT OKUMA)
 * BETIK SINIFI: TEK_SEFERLIK — kullanicinin 04.11.2026 bildirimi.
 */
const BARKOD = process.argv[2] ?? "194735162055";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canli yapilandirma okunamadi:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kartAnalizi } = await import("../src/lib/urun-karti-analiz");
  const { pencereOlustur } = await import("../src/lib/donem");

  const v = await prisma.productVariant.findFirst({
    where: { barcode: BARKOD },
    select: { id: true, sku: true, name: true, companySku: true },
  });
  if (!v) { console.log("Varyant bulunamadi:", BARKOD); return; }
  console.log("VARYANT", v.sku, "|", v.companySku, "|", v.name);

  const kalemler = await prisma.saleItem.findMany({
    where: { variantId: v.id, sale: { iptalTarihi: null } },
    select: { quantity: true, sale: { select: { soldAt: true, code: true } } },
    orderBy: { sale: { soldAt: "asc" } },
  });
  console.log("\nTUM ZAMANLAR satis kalemi:", kalemler.length);
  for (const k of kalemler) {
    console.log("   ", k.sale.soldAt.toISOString().slice(0, 10), "adet", k.quantity, "·", k.sale.code);
  }

  const an = new Date();
  for (const tur of ["SON_30_GUN", "SON_3_AY", "SON_6_AY"] as const) {
    let p;
    try { p = pencereOlustur(tur, an); } catch { console.log("\n" + tur + ": pencere kurulamadi"); continue; }
    const a = await kartAnalizi(v.id, p, true);
    const say = kalemler.filter((k) => k.sale.soldAt >= p.baslangic && k.sale.soldAt < p.bitisHaric).length;
    console.log(
      "\n" + tur,
      p.baslangic.toISOString().slice(0, 10), "->", p.bitisHaric.toISOString().slice(0, 10),
      "| pencereye dusen kalem:", say,
      "| kartAnalizi satilanAdet:", JSON.stringify((a as Record<string, unknown> | null)?.ozet ?? null).slice(0, 160),
    );
  }
  await prisma.$disconnect();
}
main();
