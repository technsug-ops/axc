/** Zararın kaynağı: satıştan mı, sonraki süreçten mi? (salt okuma) */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const KODLAR = ["11473322212", "11491734874", "11508762876"];

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  for (const kod of KODLAR) {
    const s = await prisma.sale.findFirst({
      where: { code: kod },
      select: {
        id: true, code: true, net1Amount: true, net2Amount: true,
        fees: { select: { code: true, amount: true, saleItemId: true } },
        returns: {
          select: {
            id: true, returnType: true, net1Amount: true, net2Amount: true,
            fees: { select: { code: true, amount: true } },
          },
        },
        items: {
          select: {
            quantity: true, unitPriceAmount: true,
            stockMovements: { select: { type: true, quantityDelta: true, unitCostAmount: true } },
          },
        },
      },
    });
    if (!s) { console.log(`\n${kod}: BULUNAMADI`); continue; }

    console.log(`\n${"=".repeat(64)}`);
    console.log(`${kod}  ·  SATIS NET-1 ${s.net1Amount?.toString()} · NET-2 ${s.net2Amount?.toString()}`);
    console.log(`${"=".repeat(64)}`);

    console.log(`  SATIS KESINTI DOKUMU (SaleFee):`);
    let toplam = 0;
    for (const f of s.fees) {
      const t = Number(f.amount.toString());
      toplam += t;
      console.log(`    ${f.code.padEnd(24)} ${t.toFixed(2).padStart(12)}`);
    }
    console.log(`    ${"— toplam —".padEnd(24)} ${toplam.toFixed(2).padStart(12)}`);

    console.log(`\n  IADE(LER): ${s.returns.length}`);
    for (const i of s.returns) {
      console.log(`    tip ${i.returnType} · NET-1 ${i.net1Amount?.toString()} · NET-2 ${i.net2Amount?.toString()}`);
      for (const f of i.fees) {
        console.log(`      ${f.code.padEnd(22)} ${Number(f.amount.toString()).toFixed(2).padStart(12)}`);
      }
    }

    console.log(`\n  STOK HAREKETLERI (kalem bazli):`);
    for (const k of s.items) {
      for (const h of k.stockMovements) {
        console.log(`    ${h.type.padEnd(16)} ${String(h.quantityDelta).padStart(3)} × ${h.unitCostAmount?.toString() ?? "—"}`);
      }
    }
  }
}
main();
