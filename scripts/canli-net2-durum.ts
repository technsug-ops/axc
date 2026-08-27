import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * net2Amount x profitStatus — SALT OKUMA.
 * ⛔ Varsayimimi sinamak icin: "RULE_MISSING satista net2 null" dedim,
 *    olcum bunu curuttu. Peki RULE_MISSING satista net2 NEYI tasiyor?
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const s = await p.sale.findMany({
    where: { iptalTarihi: null },
    select: { id: true, profitStatus: true, net1Amount: true, net2Amount: true,
      items: { select: { commissionRate: true, quantity: true, unitPriceAmount: true } } },
  });
  const kova = new Map<string, { n: number; net2Dolu: number; ciro: number; net2: number }>();
  for (const x of s) {
    const k = x.profitStatus ?? "(bos)";
    const v = kova.get(k) ?? { n: 0, net2Dolu: 0, ciro: 0, net2: 0 };
    v.n++;
    const ciro = x.items.reduce((t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity, 0);
    v.ciro += ciro;
    if (x.net2Amount !== null) { v.net2Dolu++; v.net2 += Number(x.net2Amount.toString()); }
    kova.set(k, v);
  }
  console.log("\n  profitStatus        satis   net2 DOLU            ciro             Sigma net2    marj");
  console.log("  " + "-".repeat(88));
  for (const [k, v] of [...kova].sort((a, b) => b[1].n - a[1].n)) {
    const marj = v.ciro > 0 ? ((v.net2 / v.ciro) * 100).toFixed(2) + "%" : "-";
    console.log("  " + k.padEnd(18) + String(v.n).padStart(6) + String(v.net2Dolu).padStart(11) +
      v.ciro.toFixed(2).padStart(17) + v.net2.toFixed(2).padStart(17) + marj.padStart(9));
  }
  console.log("\n  -> net2 DOLU sutunu satis sayisina esitse, o durumda da net2 YAZILIYOR demektir.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
