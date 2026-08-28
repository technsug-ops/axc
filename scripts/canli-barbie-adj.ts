import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BARBIE — 28.08 TARİHLİ ADJUSTMENT KİM YAZDI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:barbie-adj
 *
 *  `axcali1869`de bugün tarihli bir `ADJUSTMENT -1` var ve son açık partiyi
 *  tüketmiş. Halil'in "10 alındı, 10 satıldı" beyanı DOĞRU; eksik olan alım
 *  değil — bu düzeltme satırı. Kim yazdı, hangi iz var?
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const v = await p.productVariant.findFirst({ where: { sku: "axcali1869" }, select: { id: true } });
  if (!v) { console.log("⛔ VARYANT YOK"); await p.$disconnect(); return; }

  const adj = await p.stockMovement.findMany({
    where: { variantId: v.id, type: "ADJUSTMENT" },
    select: {
      id: true, quantityDelta: true, occurredAt: true, createdAt: true,
      unitCostAmount: true, note: true, sourceMovementId: true,
      saleItemId: true, returnItemId: true, purchaseItemId: true, locationId: true,
    },
  });
  console.log("\n" + "=".repeat(100));
  console.log("axcali1869 — ADJUSTMENT satırları");
  console.log("=".repeat(100));
  for (const x of adj) {
    console.log("\n   id          " + x.id);
    console.log("   adet        " + x.quantityDelta + " · birim " +
      (x.unitCostAmount === null ? "—" : Number(x.unitCostAmount.toString()).toFixed(2)));
    console.log("   iş tarihi   " + x.occurredAt.toISOString().slice(0, 10));
    console.log("   YAZILDI     " + x.createdAt.toISOString().slice(0, 19).replace("T", " ") + " UTC");
    console.log("   bağ         " + (x.saleItemId ? "SATIŞ" : x.returnItemId ? "İADE" :
      x.purchaseItemId ? "ALIM" : "—") +
      " · parti " + (x.sourceMovementId ?? "—"));
    console.log("   NOT         " + (x.note ?? "⛔ BOŞ"));
  }

  /** ⚠ Aynı anda yazılmış BAŞKA ADJUSTMENT var mı — toplu bir iş miydi? */
  if (adj.length > 0) {
    const an = adj[0].createdAt;
    const komsu = await p.stockMovement.count({
      where: {
        type: "ADJUSTMENT",
        createdAt: { gte: new Date(+an - 120_000), lte: new Date(+an + 120_000) },
      },
    });
    console.log("\n   ⭐ AYNI DAKİKALARDA yazılan ADJUSTMENT sayısı: " + komsu);
    console.log("     (1 ise tekil bir işlem, çok ise toplu bir koşum)");
  }

  /** ⚠ O gün yazılan AuditLog izleri — hangi iş bunu yapmış olabilir? */
  const gun = new Date(Date.UTC(2026, 7, 28));
  const iz = await p.auditLog.findMany({
    where: { createdAt: { gte: gun } },
    select: { action: true, createdAt: true, targetType: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n   28.08.2026 AuditLog izleri:");
  for (const x of iz) {
    console.log("     " + x.createdAt.toISOString().slice(11, 19) + "  " +
      x.action + (x.targetType ? " · " + x.targetType : ""));
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
