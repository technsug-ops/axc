import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İKİ VAKA — 11540657420 (TY fatura) · 4120311526 (HB tek kargo) — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:iki-vaka
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK. Kullanıcı iki kayıt bildirdi; ne olduğu
 *  ölçülüyor — "hata veriyor" cümlesi bir SEMPTOM, sebebi değil.
 * ============================================================================
 */

const KODLAR = ["11540657420", "4120311526"];
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
  console.log("İKİ VAKA — SALT OKUMA");
  console.log("=".repeat(100));

  for (const kod of KODLAR) {
    console.log("\n" + "─".repeat(100));
    console.log("● " + kod);
    const sale = await p.sale.findFirst({
      where: { code: kod },
      select: {
        id: true, code: true, soldAt: true, iptalTarihi: true, iptalSebebi: true,
        profitStatus: true, net1Amount: true, net2Amount: true, calculatedAt: true,
        shippedAt: true, shipmentCode: true, paketSayisi: true, note: true,
        cargoAmount: true, cargoDesi: true, importKaynak: true,
        cargoCarrier: { select: { name: true } },
        channelAccount: { select: { name: true, channel: { select: { name: true } } } },
        items: {
          select: {
            id: true, quantity: true, unitPriceAmount: true, commissionRate: true,
            vatRate: true, profitStatus: true, net1Amount: true, net2Amount: true,
            stockMovements: { select: { type: true, quantityDelta: true,
              unitCostAmount: true, occurredAt: true, note: true } },
            variant: { select: { sku: true, barcode: true, product: { select: { name: true } } } },
          },
        },
        fees: { select: { code: true, name: true, amount: true, currency: true } },
        returns: { select: { id: true, returnType: true, occurredAt: true, note: true,
          returnCargoAmount: true, reshipCargoAmount: true, net2Amount: true } },
        returnNotices: { select: { id: true, reason: true, status: true, noticedAt: true } },
      },
    });
    if (!sale) {
      console.log("   ⛔ SİSTEMDE YOK — bu numarayla hiç satış kaydı bulunamadı.");
      continue;
    }
    console.log("   kanal      : " + (sale.channelAccount?.channel.name ?? "—") +
      " — " + (sale.channelAccount?.name ?? "—"));
    console.log("   satış anı  : " + sale.soldAt.toISOString().slice(0, 10) +
      " · kargo " + (sale.shippedAt ? sale.shippedAt.toISOString().slice(0, 10) : "YOK") +
      " · takip " + (sale.shipmentCode ?? "—") + " · paket " + sale.paketSayisi);
    console.log("   iptal      : " + (sale.iptalTarihi ? sale.iptalTarihi.toISOString().slice(0, 10) +
      " (" + sale.iptalSebebi + ")" : "hayır"));
    console.log("   kaynak     : " + (sale.importKaynak ?? "elle") +
      " · kargo firması " + (sale.cargoCarrier?.name ?? "SEÇİLMEMİŞ") +
      " · desi " + s2(sale.cargoDesi) + " · kargo ücreti " + s2(sale.cargoAmount));
    console.log("   ⭐ KÂR      : " + sale.profitStatus +
      " · NET-1 " + s2(sale.net1Amount) + " · NET-2 " + s2(sale.net2Amount) +
      " · hesap anı " + (sale.calculatedAt ? sale.calculatedAt.toISOString().slice(0, 16) : "—"));
    console.log("   kalemler:");
    for (const k of sale.items) {
      console.log("     " + (k.variant.sku ?? "—").padEnd(14) +
        "adet " + k.quantity +
        " · fiyat " + s2(k.unitPriceAmount).padStart(10) +
        " · oran " + (k.commissionRate === null ? "—" : s2(k.commissionRate)) +
        " · KDV " + (k.vatRate === null ? "—" : s2(k.vatRate)) +
        " · " + k.profitStatus);
      console.log("       " + (k.variant.product.name ?? "—").slice(0, 70));
      console.log("       stok hareketi (" + k.stockMovements.length + "):" +
        (k.stockMovements.length === 0 ? "  ⛔ HİÇ YOK — maliyet bağı kurulamaz" : ""));
      for (const h of k.stockMovements) {
        console.log("         " + h.type.padEnd(12) +
          String(h.quantityDelta).padStart(4) + " · birim " + s2(h.unitCostAmount).padStart(10) +
          " · " + h.occurredAt.toISOString().slice(0, 10) +
          (h.note ? "  " + h.note.slice(0, 44) : ""));
      }
    }
    console.log("   kesintiler (" + sale.fees.length + "):");
    for (const f of sale.fees) {
      console.log("     " + f.code.padEnd(22) + s2(f.amount).padStart(10) + " " + f.currency +
        (f.name ? "  " + f.name.slice(0, 40) : ""));
    }
    console.log("   iade kaydı : " + (sale.returns.length === 0 ? "YOK" :
      sale.returns.map((r) => r.returnType + " " + r.occurredAt.toISOString().slice(0, 10) +
        " · iade kargosu " + s2(r.returnCargoAmount) + " · yeniden gönderim " +
        s2(r.reshipCargoAmount) + " · NET-2 " + s2(r.net2Amount)).join(" · ")));
    console.log("   iade bildirimi: " + (sale.returnNotices.length === 0 ? "YOK" :
      sale.returnNotices.map((r) => r.reason + "/" + r.status).join(" · ")));
    if (sale.note) console.log("   not: " + sale.note.slice(0, 120));
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
