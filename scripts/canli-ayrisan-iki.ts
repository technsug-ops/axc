import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  AYRIŞAN İKİ VARYANT — HAREKET GEÇMİŞİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:ayrisan-iki
 *
 *  `canli:defter-ayrismasi` iki SKU'da ledger ↔ FIFO ayrışması gösteriyor.
 *  Araç bilerek hüküm vermiyor; burada o iki satırın geçmişi okunuyor.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SKULAR = ["axcali1660", "axcali1610"];
const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("AYRIŞAN İKİ VARYANT — HAREKET GEÇMİŞİ");
  console.log("=".repeat(100));

  for (const sku of SKULAR) {
    const v = await p.productVariant.findFirst({
      where: { sku },
      select: { id: true, product: { select: { name: true } } },
    });
    if (!v) { console.log("\n⛔ " + sku + " — VARYANT YOK"); continue; }
    const hh = await p.stockMovement.findMany({
      where: { variantId: v.id },
      select: {
        id: true, type: true, quantityDelta: true, occurredAt: true, createdAt: true,
        unitCostAmount: true, sourceMovementId: true, purchaseItemId: true,
        saleItemId: true, returnItemId: true, note: true,
      },
      orderBy: { occurredAt: "asc" },
    });
    const tuketim = new Map<string, number>();
    for (const x of hh) {
      if (x.sourceMovementId) {
        tuketim.set(x.sourceMovementId, (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
      }
    }
    console.log("\n" + "-".repeat(100));
    console.log("● " + sku + " — " + (v.product.name ?? "—").slice(0, 60));
    console.log("-".repeat(100));
    for (const x of hh) {
      const acik = x.quantityDelta > 0
        ? "  açık " + (x.quantityDelta - (tuketim.get(x.id) ?? 0))
        : x.sourceMovementId ? "  partiye bağlı" : "  ⛔ PARTİSİZ ÇIKIŞ";
      console.log("   " + x.occurredAt.toISOString().slice(0, 10) +
        " (yazıldı " + x.createdAt.toISOString().slice(0, 10) + ")  " +
        x.type.padEnd(12) + String(x.quantityDelta).padStart(4) +
        " · birim " + s2(x.unitCostAmount).padStart(9) +
        " · bağ " + (x.purchaseItemId ? "ALIM" : x.saleItemId ? "SATIŞ" :
          x.returnItemId ? "İADE" : "—").padEnd(6) + acik +
        (x.note ? "  " + x.note.slice(0, 34) : ""));
    }
    const ledger = hh.reduce((t, x) => t + x.quantityDelta, 0);
    const fifo = hh.filter((x) => x.quantityDelta > 0)
      .reduce((t, g) => t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)), 0);
    console.log("   ⭐ ledger " + ledger + "  ·  FIFO " + fifo + "  ·  fark " + (ledger - fifo));
    const partisiz = hh.filter((x) => x.quantityDelta < 0 && x.sourceMovementId === null);
    console.log("   partisiz çıkış: " + partisiz.length +
      (partisiz.length > 0 ? "  ← ayrışmanın kaynağı bu" : ""));
    for (const x of partisiz) {
      console.log("     " + x.id + " · " + x.type + " · " +
        x.occurredAt.toISOString().slice(0, 10) + " · yazıldı " +
        x.createdAt.toISOString().slice(0, 19).replace("T", " ") +
        " · bağ " + (x.saleItemId ? "SATIŞ" : x.returnItemId ? "İADE" : "—"));
    }
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
