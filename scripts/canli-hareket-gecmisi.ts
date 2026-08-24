/** Bir varyantın TÜM hareket geçmişi + FIFO parti durumu (salt okuma) */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const skular = process.argv.slice(2);
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  for (const sku of skular) {
    const v = await prisma.productVariant.findFirst({
      where: { sku }, select: { id: true, sku: true },
    });
    if (!v) { console.log(`${sku}: yok`); continue; }

    const h = await prisma.stockMovement.findMany({
      where: { variantId: v.id },
      select: {
        id: true, type: true, quantityDelta: true, occurredAt: true,
        unitCostAmount: true, sourceMovementId: true,
        saleItemId: true, returnItemId: true, purchaseItemId: true, note: true,
      },
      orderBy: { occurredAt: "asc" },
    });

    console.log(`\n${"=".repeat(78)}\n${sku} — ${h.length} hareket\n${"=".repeat(78)}`);
    let ledger = 0;
    for (const m of h) {
      ledger += m.quantityDelta;
      const baglar = [
        m.saleItemId ? "satis" : null,
        m.returnItemId ? "iade" : null,
        m.purchaseItemId ? "alim" : null,
        m.sourceMovementId ? `parti:${m.sourceMovementId.slice(-6)}` : null,
      ].filter(Boolean).join(" ");
      console.log(
        `${m.occurredAt.toISOString().slice(0,16).replace("T"," ")} ${m.type.padEnd(16)} ${String(m.quantityDelta).padStart(3)} ` +
        `× ${(m.unitCostAmount?.toString() ?? "—").padStart(9)} | yuruyen ${String(ledger).padStart(3)} | ${m.id.slice(-6)} | ${baglar}` +
        (m.note ? ` | "${m.note.slice(0,34)}"` : ""),
      );
    }

    console.log(`\n  LEDGER TOPLAMI: ${ledger}`);
    const girisler = h.filter((m) => m.quantityDelta > 0);
    let fifo = 0;
    console.log(`  FIFO PARTILERI:`);
    for (const g of girisler) {
      const tuketim = h.filter((m) => m.sourceMovementId === g.id)
        .reduce((t, m) => t + m.quantityDelta, 0);
      const kalan = g.quantityDelta + tuketim;
      fifo += kalan;
      console.log(`    ${g.id.slice(-6)} ${g.type.padEnd(16)} +${g.quantityDelta} tuketilen ${-tuketim} kalan ${kalan}`);
    }
    console.log(`  FIFO TOPLAMI: ${fifo}   ${fifo === ledger ? "(TUTUYOR)" : `>>> FARK ${fifo - ledger} <<<`}`);

    const oksuz = h.filter((m) => m.quantityDelta < 0 && !m.sourceMovementId);
    if (oksuz.length) {
      console.log(`  ⚠ PARTIYE BAGLANMAMIS CIKIS: ${oksuz.length}`);
      for (const m of oksuz) console.log(`      ${m.id.slice(-6)} ${m.type} ${m.quantityDelta}`);
    }
  }
}
main();
