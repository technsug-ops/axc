import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/** ONCE/SONRA SAYIMI — salt okuma. Ice aktarma oncesi ve sonrasi kosulur. */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });
  const hesaplar = await p.channelAccount.findMany({
    select: { id: true, name: true, channel: { select: { code: true } } },
  });
  console.log("\n  KANAL         HESAP        SATIS   SALE_OUT");
  console.log("  " + "-".repeat(48));
  let ts = 0;
  for (const h of hesaplar) {
    const n = await p.sale.count({ where: { channelAccountId: h.id } });
    if (n === 0) continue;
    ts += n;
    console.log("  " + h.channel.code.padEnd(14) + h.name.padEnd(12) + String(n).padStart(6));
  }
  const kalem = await p.saleItem.count();
  const hrk = await p.stockMovement.count({ where: { type: "SALE_OUT" } });
  console.log("  " + "-".repeat(48));
  console.log("  TOPLAM satis=" + ts + "  kalem=" + kalem + "  SALE_OUT=" + hrk + "\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
