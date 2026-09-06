import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * BETIK SINIFI: SUREKLI — salt okuma, hicbir sey yazmaz.
 *
 * ALIM KALEM RAPORU. "Bu alimda kac adet, birim maliyet ne, toplam nasil
 * olusmus" sorusunun tek yerden cevabi. Dis bir faturayla kiyaslamadan ONCE
 * sistemin o kaydi NASIL tuttugu kendi izinden okunur.
 *
 * Kullanim: npm run canli:alim-kalem -- ALM-HB-260216-03
 */
async function main() {
  const kod = process.argv[2];
  if (!kod) {
    console.log("KULLANIM: npm run canli:alim-kalem -- <ALIM-KODU>");
    process.exitCode = 1;
    return;
  }
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const a = await p.purchase.findFirst({
    where: { code: kod },
    select: {
      id: true, code: true, status: true, purchasedAt: true, receivedAt: true,
      supplierName: true, supplierOrderNo: true, note: true,
      goodsAmount: true, goodsCurrency: true,
      shippingAmount: true, shippingCurrency: true,
      taxAmount: true, taxCurrency: true,
      installmentCount: true, importKaynak: true, importBatch: true,
      createdAt: true, updatedAt: true,
      supplier: { select: { name: true } },
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
      creditCard: { select: { label: true, bankName: true } },
      items: {
        select: {
          id: true, quantity: true, damagedQuantity: true, promosyon: true,
          unitCostAmount: true, unitCostCurrency: true,
          variant: { select: { sku: true, barcode: true, companySku: true,
            product: { select: { name: true } } } },
          stockMovements: { select: { quantityDelta: true, type: true, occurredAt: true, note: true } },
        },
      },
    },
  });

  if (!a) { console.log("ALIM BULUNAMADI: " + kod); process.exitCode = 1; await p.$disconnect(); return; }

  const s = (d: unknown) => (d === null || d === undefined ? null : Number(String(d)));
  console.log("\n" + "=".repeat(96));
  console.log("ALIM KALEM RAPORU — " + a.code);
  console.log("=".repeat(96));
  console.log("  durum        : " + a.status);
  console.log("  sipariş günü : " + a.purchasedAt.toISOString().slice(0, 10) +
    "   ·  mal kabul: " + (a.receivedAt ? a.receivedAt.toISOString().slice(0, 10) : "YOK"));
  console.log("  tedarikçi    : " + (a.supplier?.name ?? a.supplierName ?? "-") +
    "   ·  kanal: " + (a.channelAccount ? a.channelAccount.channel.name + "/" + a.channelAccount.name : "-"));
  console.log("  sipariş no   : " + (a.supplierOrderNo ?? "YOK"));
  console.log("  kart/taksit  : " + (a.creditCard ? a.creditCard.bankName + " " + a.creditCard.label : "-") + " · " + a.installmentCount);
  console.log("  içe aktarma  : kaynak=" + (a.importKaynak ?? "NULL") + " · parti=" + (a.importBatch ?? "NULL"));
  console.log("  yazıldı      : " + a.createdAt.toISOString().slice(0, 19).replace("T", " ") +
    "  ·  son dokunuş: " + a.updatedAt.toISOString().slice(0, 19).replace("T", " "));

  console.log("\n  ÖZET ALANLARI (opsiyonel — gerçek toplam KALEMLERDEN):");
  console.log("    goodsAmount    : " + (s(a.goodsAmount) ?? "NULL") + " " + (a.goodsCurrency ?? ""));
  console.log("    shippingAmount : " + (s(a.shippingAmount) ?? "NULL") + " " + (a.shippingCurrency ?? ""));
  console.log("    taxAmount      : " + (s(a.taxAmount) ?? "NULL") + " " + (a.taxCurrency ?? ""));

  console.log("\n  KALEMLER (" + a.items.length + ")");
  console.log("  " + "-".repeat(94));
  console.log("  " + "ÜRÜN".padEnd(38) + "SKU".padEnd(16) + "ADET".padStart(6) +
    "BİRİM MALİYET".padStart(16) + "SATIR".padStart(16));
  console.log("  " + "-".repeat(94));
  let toplam = 0;
  let adet = 0;
  for (const k of a.items) {
    const bm = s(k.unitCostAmount) ?? 0;
    const satirTutar = bm * k.quantity;
    toplam += satirTutar;
    adet += k.quantity;
    console.log("  " + k.variant.product.name.slice(0, 36).padEnd(38) +
      k.variant.sku.padEnd(16) + String(k.quantity).padStart(6) +
      bm.toFixed(4).padStart(16) + satirTutar.toFixed(2).padStart(16) +
      (k.promosyon ? "  PROMO" : "") + (k.damagedQuantity > 0 ? "  hasarlı " + k.damagedQuantity : ""));
    const giren = k.stockMovements.reduce((t, m) => t + m.quantityDelta, 0);
    console.log("      barkod " + (k.variant.barcode ?? "-") + " · firmaSKU " +
      (k.variant.companySku ?? "-") + " · hareket " + k.stockMovements.length +
      " (net " + giren + ")");
  }
  console.log("  " + "-".repeat(94));
  console.log("  " + "TOPLAM".padEnd(54) + String(adet).padStart(6) + "".padStart(16) + toplam.toFixed(2).padStart(16));

  console.log("\n  NOT ALANI:");
  console.log("    " + (a.note === null ? "BOŞ" : JSON.stringify(a.note)));

  const izler = await p.auditLog.findMany({
    where: { OR: [{ targetId: a.id }, { detail: { contains: a.code } }] },
    select: { action: true, createdAt: true, detail: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("\n  İZLER (" + izler.length + "):");
  for (const iz of izler) {
    console.log("    " + iz.createdAt.toISOString().slice(0, 19).replace("T", " ") + "  " +
      iz.action + "  " + (iz.detail ?? "").slice(0, 260).replace(/\s+/g, " "));
  }
  console.log("");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
