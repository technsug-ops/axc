/** BETIK SINIFI: TEK_SEFERLIK — K188 zinciri adim 1, `K188-4707418677` koduna kilitli. */
import { writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KOD = "ALM-K188-4707418677";
const YAZ = process.argv.includes("--yaz");
const MALIYET = "1599.92";
const SKU = "axcali2399";

async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const v = await prisma.productVariant.findFirst({ where: { sku: SKU }, select: { id: true } });
  const kart = await prisma.creditCard.findFirst({ where: { last4: "3253" }, select: { id: true, label: true } });
  if (!v || !kart) { console.log("⛔ varyant ya da kart bulunamadi"); return; }

  /** GERI ALMA OLCUTU: kod. Liste saklanmiyor, yeniden hesaplanabilir. */
  const varMi = await prisma.purchase.count({ where: { code: KOD } });
  const stokOnce = await prisma.stockMovement.aggregate({ where: { variantId: v.id }, _sum: { quantityDelta: true } });
  writeFileSync("veri/ozel/_k188-adim1-goruntu.json", JSON.stringify({
    an: new Date().toISOString(), varyantId: v.id,
    stokOnce: stokOnce._sum.quantityDelta ?? 0,
    hareketOnce: await prisma.stockMovement.count({ where: { variantId: v.id } }),
    purchaseOnce: await prisma.purchase.count(),
  }, null, 2), "utf8");

  console.log(`ADIM 1 · ALIM  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   kart          ${kart.label}`);
  console.log(`   kod           ${KOD}  (zaten var mi: ${varMi})`);
  console.log(`   siparis       2025-07-11 · teslim 2025-07-13`);
  console.log(`   1 adet · birim ${MALIYET} TRY (KDV dahil) · 2 taksit`);
  console.log(`   stok ONCE     ${stokOnce._sum.quantityDelta ?? 0}`);
  if (varMi > 0) { console.log("   ⛔ BU KOD ZATEN VAR — yazim ATLANDI (tekrar kosulabilir)"); await prisma.$disconnect(); return; }
  if (!YAZ) { console.log("\n   ÖNİZLEME — hiçbir şey yazılmadı. Yazmak için: -- --yaz"); await prisma.$disconnect(); return; }

  const NOT = "K188 ZINCIRI · fatura HD22025000334550 (11.07.2025, teslim 13.07.2025) · "
    + "Sip.Ref 4041064539 · odeme: kart Ziraat *3253 2 taksit 1.582,01 + Hepsipay 17,91 = 1.599,92. "
    + "Bu alim defterde HIC YOKTU; satis 4707418677 (11.08.2026) maliyetsiz kalmisti. "
    + "Halil fatura+odeme ekrani teyidi 08.09.2026.";

  await prisma.$transaction(async (tx) => {
    const alim = await tx.purchase.create({
      data: {
        code: KOD, status: "RECEIVED", purchasedAt: new Date("2025-07-11T00:00:00.000Z"),
        supplierName: "Hepsiburada", supplierOrderNo: "4041064539",
        note: NOT, installmentCount: 2, creditCardId: kart.id,
        goodsAmount: MALIYET, goodsCurrency: "TRY",
        items: { create: [{ variantId: v.id, quantity: 1, unitCostAmount: MALIYET, unitCostCurrency: "TRY", promosyon: false }] },
      },
      select: { id: true, items: { select: { id: true } } },
    });
    await tx.stockMovement.create({
      data: {
        variantId: v.id, type: "PURCHASE_IN", quantityDelta: 1,
        occurredAt: new Date("2025-07-13T00:00:00.000Z"),
        purchaseItemId: alim.items[0].id,
        unitCostAmount: MALIYET, unitCostCurrency: "TRY",
        note: `Mal kabul — ${KOD}`,
      },
    });
    await tx.auditLog.create({ data: {
      action: "K188_EKSIK_ALIM_YAZILDI", targetType: "Purchase", targetId: alim.id,
      detail: JSON.stringify({
        kod: KOD, sku: SKU, adet: 1, birimMaliyet: MALIYET,
        fatura: "HD22025000334550", sipRef: "4041064539",
        odeme: { kart: "Ziraat *3253", taksit: 2, kartTutari: "1582.01", hepsipay: "17.91", toplam: MALIYET },
        gerekce: "Satis 4707418677 maliyetsizdi; alim defterde hic yoktu. Fatura+odeme ekrani Halil teyidi 08.09.2026.",
        geriAlmaOlcutu: `Purchase.code = ${KOD} ve note icinde '${KOD}' gecen StockMovement`,
      }) } });
  }, { timeout: 120000 });

  const stokSonra = await prisma.stockMovement.aggregate({ where: { variantId: v.id }, _sum: { quantityDelta: true } });
  console.log(`   stok SONRA    ${stokSonra._sum.quantityDelta ?? 0}   (beklenen ${(stokOnce._sum.quantityDelta ?? 0) + 1})`);
  console.log(`   ${(stokSonra._sum.quantityDelta ?? 0) === (stokOnce._sum.quantityDelta ?? 0) + 1 ? "✓ TUTTU" : "⛔ TUTMADI"}`);
  await prisma.$disconnect();
}
void main();
