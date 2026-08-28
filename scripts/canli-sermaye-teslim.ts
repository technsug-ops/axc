import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/** TESLIM OLCUMU — kac uründe ilk kez rakam ureildi. SALT OKUMA. */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const girisler = await p.stockMovement.findMany({
    where: { quantityDelta: { gt: 0 } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, variantId: true, quantityDelta: true, unitCostAmount: true },
  });
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 } },
    select: { quantityDelta: true, sourceMovementId: true },
  });
  const tuketim = new Map<string, number>();
  for (const x of cikislar) if (x.sourceMovementId)
    tuketim.set(x.sourceMovementId, (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));

  const acik = new Map<string, { a: number; t: number }>();
  for (const g of girisler) {
    const kalan = g.quantityDelta - (tuketim.get(g.id) ?? 0);
    if (kalan <= 0 || g.unitCostAmount === null) continue;
    const v = acik.get(g.variantId) ?? { a: 0, t: 0 };
    v.a += kalan; v.t += kalan * Number(g.unitCostAmount.toString());
    acik.set(g.variantId, v);
  }

  const so = await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, saleItem: { sale: { iptalTarihi: null } } },
    select: { variantId: true, quantityDelta: true, unitCostAmount: true },
  });
  const satilan = new Map<string, { a: number; t: number }>();
  for (const x of so) {
    if (x.unitCostAmount === null) continue;
    const v = satilan.get(x.variantId) ?? { a: 0, t: 0 };
    const ad = Math.abs(x.quantityDelta);
    v.a += ad; v.t += ad * Number(x.unitCostAmount.toString());
    satilan.set(x.variantId, v);
  }

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { variantId: true, quantity: true, net2Amount: true,
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });
  const urun = new Map<string, { adet: number; net2: number; net2Var: boolean; sku: string; ad: string }>();
  for (const k of kalemler) {
    const v = urun.get(k.variantId) ?? { adet: 0, net2: 0, net2Var: true, sku: k.variant.sku, ad: k.variant.product.name };
    v.adet += k.quantity;
    if (k.net2Amount === null) v.net2Var = false;
    else v.net2 += Number(k.net2Amount.toString());
    urun.set(k.variantId, v);
  }

  const oran = (t: { a: number; t: number } | undefined) => (t && t.a > 0 ? t.t / t.a : null);
  let eskiVar = 0, yeniVar = 0, ilkKez = 0;
  const liste: { sku: string; ad: string; adet: number; eski: number | null; yeni: number | null }[] = [];
  for (const [id, u] of urun) {
    if (u.adet === 0 || !u.net2Var) continue;
    const birim = u.net2 / u.adet;
    const eskiPayda = oran(acik.get(id));
    const yeniPayda = oran(satilan.get(id));
    const eski = eskiPayda !== null && eskiPayda > 0 ? birim / eskiPayda : null;
    const yeni = yeniPayda !== null && yeniPayda > 0 ? birim / yeniPayda : null;
    if (eski !== null) eskiVar++;
    if (yeni !== null) yeniVar++;
    if (eski === null && yeni !== null) ilkKez++;
    liste.push({ sku: u.sku, ad: u.ad, adet: u.adet, eski, yeni });
  }

  console.log("\n" + "=".repeat(96));
  console.log("TESLIM OLCUMU — sermaye verimi");
  console.log("=".repeat(96));
  console.log("\n  NET-2'si tam olan varyant : " + liste.length);
  console.log("  ESKI kodla rakam ureten   : " + eskiVar);
  console.log("  YENI kodla rakam ureten   : " + yeniVar);
  console.log("  ILK KEZ hesaplanan        : " + ilkKez + "  <-- kazanc");

  console.log("\n  EN COK SATAN 10 URUN — yeni sermaye verimi");
  console.log("  SKU               satilan     ESKI      YENI   urun");
  console.log("  " + "-".repeat(86));
  for (const x of [...liste].sort((a, b) => b.adet - a.adet).slice(0, 10)) {
    console.log("  " + x.sku.slice(0, 17).padEnd(18) + String(x.adet).padStart(6) +
      (x.eski === null ? "        —" : (x.eski.toFixed(2) + "x").padStart(9)) +
      (x.yeni === null ? "         —" : (x.yeni.toFixed(2) + "x").padStart(10)) +
      "   " + x.ad.slice(0, 38));
  }
  console.log("\nSALT OKUMA — HICBIR SEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
