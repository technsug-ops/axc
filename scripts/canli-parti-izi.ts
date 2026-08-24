/** Bir satışın maliyeti HANGİ partiden geldi? (salt okuma) */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KOD = process.argv[2] ?? "11491734874";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const s = await prisma.sale.findFirst({
    where: { code: KOD },
    select: {
      code: true, soldAt: true, net2Amount: true,
      items: {
        select: {
          quantity: true, unitPriceAmount: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
          stockMovements: {
            select: { id: true, type: true, quantityDelta: true, unitCostAmount: true,
                      unitCostCurrency: true, occurredAt: true, sourceMovementId: true },
          },
        },
      },
    },
  });
  if (!s) { console.log("satis yok"); return; }

  for (const k of s.items) {
    console.log(`\nSATIS ${s.code} · ${s.soldAt.toISOString().slice(0,10)} · NET-2 ${s.net2Amount?.toString()}`);
    console.log(`URUN  ${k.variant.product.name} (${k.variant.sku})`);
    console.log(`SATIS FIYATI ${k.unitPriceAmount.toString()} × ${k.quantity}`);

    console.log(`\n  BU SATISIN TUKETTIGI PARTILER:`);
    for (const h of k.stockMovements) {
      console.log(`    ${h.type.padEnd(14)} ${String(h.quantityDelta).padStart(3)} × ${h.unitCostAmount?.toString() ?? "—"} ${h.unitCostCurrency ?? ""} · kaynak ${h.sourceMovementId ?? "(yok)"}`);
    }

    /** BU VARYANTIN BUTUN ALIM PARTILERI — FIFO sirasi gorulsun. */
    const girisler = await prisma.stockMovement.findMany({
      where: { variantId: k.variant.id, quantityDelta: { gt: 0 } },
      select: { id: true, type: true, occurredAt: true, quantityDelta: true,
                unitCostAmount: true, unitCostCurrency: true },
      orderBy: { occurredAt: "asc" },
    });
    console.log(`\n  BU URUNUN BUTUN GIRISLERI (FIFO sirasi):`);
    for (const g of girisler) {
      const tuketilen = await prisma.stockMovement.aggregate({
        where: { sourceMovementId: g.id },
        _sum: { quantityDelta: true },
      });
      const kalan = g.quantityDelta + (tuketilen._sum.quantityDelta ?? 0);
      console.log(`    ${g.occurredAt.toISOString().slice(0,10)} ${g.type.padEnd(14)} +${g.quantityDelta} × ${g.unitCostAmount?.toString() ?? "—"} ${g.unitCostCurrency ?? ""} · kalan ${kalan}`);
    }
  }
}
main();
