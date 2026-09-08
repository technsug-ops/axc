/** BETIK SINIFI: TEK_SEFERLIK — K188 zinciri adim 2, sayim vekilini notrler. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const YAZ = process.argv.includes("--yaz");
const IZ = "K188-SAYIM-VEKILI-NOTRLENDI";
async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartiler } = await import("../src/lib/stok");

  const v = await prisma.productVariant.findFirst({ where: { sku: "axcali2399" }, select: { id: true } });
  if (!v) return;
  const sayim = await prisma.stockMovement.findFirst({
    where: { variantId: v.id, type: "COUNT_CORRECTION", quantityDelta: 1 },
    select: { id: true, occurredAt: true, unitCostAmount: true, note: true } });
  if (!sayim) { console.log("⛔ SAYIM DUZELTMESI BULUNAMADI"); return; }

  const zaten = await prisma.stockMovement.count({ where: { variantId: v.id, note: { contains: IZ } } });
  const once = await prisma.stockMovement.aggregate({ where: { variantId: v.id }, _sum: { quantityDelta: true } });
  const pOnce = await acikPartiler(prisma, v.id);
  console.log(`ADIM 2 · SAYIM VEKILI NOTRLEME  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   hedef sayim hareketi ${sayim.id.slice(0,8)} · ${sayim.occurredAt.toISOString().slice(0,10)} · birim ${sayim.unitCostAmount ?? "NULL"}`);
  console.log(`   ledger ONCE ${once._sum.quantityDelta ?? 0} · FIFO acik ${pOnce.reduce((t,x)=>t+x.kalanAdet,0)}`);
  if (zaten > 0) { console.log("   ⛔ ZATEN NOTRLENMIS — atlandi"); await prisma.$disconnect(); return; }
  if (!YAZ) { console.log("\n   ÖNİZLEME — yazılmadı. Yazmak için: -- --yaz"); await prisma.$disconnect(); return; }

  const NOT = IZ + " · 29.08 sayim duzeltmesi bir stok hatasi DEGIL, eksik tarihcenin "
    + "VEKILIYDI (kendi notu: 'Defter 0, sayilan 1'). Gercek tarihce artik yazili: "
    + "ALM-K188-4707418677 alimi + satis 4707418677 onayi + 17.08 iadesi. Vekil "
    + "birakilsaydi ayni mal IKI KEZ sayilirdi. Kayit SILINMEDI; ters isaretli "
    + "duzeltme ile notrlendi ve sayim partisini TUKETIYOR (ledger ile FIFO ayrismasin).";

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({ data: {
      variantId: v.id, type: "ADJUSTMENT", quantityDelta: -1,
      occurredAt: sayim.occurredAt,
      sourceMovementId: sayim.id,
      unitCostAmount: sayim.unitCostAmount, unitCostCurrency: sayim.unitCostAmount === null ? null : "TRY",
      note: NOT } });
    await tx.auditLog.create({ data: {
      action: IZ, targetType: "StockMovement", targetId: sayim.id,
      detail: JSON.stringify({
        sku: "axcali2399", sayimHareketi: sayim.id, sayimTarihi: sayim.occurredAt.toISOString().slice(0,10),
        eskiNot: (sayim.note ?? "").slice(0, 160),
        gerekce: "Sayim vekili gercek tarihce yazilinca cift sayim uretirdi. Ters kayitla notrlendi, silinmedi.",
        geriAlmaOlcutu: `note icinde '${IZ}' gecen StockMovement`,
      }) } });
  }, { timeout: 120000 });

  const sonra = await prisma.stockMovement.aggregate({ where: { variantId: v.id }, _sum: { quantityDelta: true } });
  const pSonra = await acikPartiler(prisma, v.id);
  const led = sonra._sum.quantityDelta ?? 0;
  const fifo = pSonra.reduce((t,x)=>t+x.kalanAdet,0);
  console.log(`   ledger SONRA ${led} · FIFO acik ${fifo}`);
  console.log(`   ${led === 1 && fifo === 1 ? "✓ TUTTU — iki defter de 1" : "⛔ TUTMADI"}`);
  await prisma.$disconnect();
}
void main();
