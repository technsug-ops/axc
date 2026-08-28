import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ALIM GİRİLDİKTEN SONRA — GERÇEKTEN DÜZELDİ Mİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:alim-teyit -- --kod=3168430275010
 *
 *  ⚠ NİYE: satırın LİSTEDEN KALKMASI, işin bittiğini göstermez. Sayım
 *  satırı kapanır ama o ürünün GEÇMİŞ satışları hâlâ maliyetsiz olabilir —
 *  yeni parti eski satışlara kendiliğinden bağlanmaz.
 *  _(Anayasa: "ekranın ne gösterdiği ölçülmeden iddia edilmez".)_
 * ============================================================================
 */
const KOD = process.argv.find((a) => a.startsWith("--kod="))?.slice(6) ?? "3168430275010";
const t2 = (n: number) => n.toFixed(2).padStart(13);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const v = await p.productVariant.findFirst({
    where: { OR: [{ barcode: KOD }, { sku: KOD }, { companySku: KOD },
      { channelSkus: { some: { channelSku: KOD } } }] },
    select: { id: true, sku: true, barcode: true, product: { select: { name: true } } },
  });
  if (!v) { console.log("\n⛔ KOD ÇÖZÜLEMEDİ: " + KOD + "\n"); await p.$disconnect(); return; }

  console.log("\n" + "=".repeat(96));
  console.log("ALIM SONRASI TEYİT — " + v.sku + " · " + v.product.name.slice(0, 46));
  console.log("=".repeat(96));

  const hrk = await p.stockMovement.findMany({
    where: { variantId: v.id },
    select: { type: true, quantityDelta: true, occurredAt: true, createdAt: true,
      unitCostAmount: true, saleItemId: true, sourceMovementId: true,
      purchaseItem: { select: { purchase: { select: { code: true } } } } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });
  console.log("\n① STOK DEFTERİ");
  let bakiye = 0;
  for (const h of hrk) {
    bakiye += h.quantityDelta;
    console.log("   " + h.occurredAt.toISOString().slice(0, 10) + "  " + h.type.padEnd(17) +
      String(h.quantityDelta).padStart(4) + "  bakiye " + String(bakiye).padStart(3) +
      "  maliyet " + (h.unitCostAmount?.toString() ?? "—").padStart(10) +
      (h.purchaseItem ? "  alım " + h.purchaseItem.purchase.code : "") +
      (h.saleItemId ? "  satışKalemi " + (h.sourceMovementId ? "BAĞLI" : "⛔ BAĞSIZ") : ""));
  }
  console.log("   → sistem adedi: " + bakiye);

  console.log("\n② SAYIM SATIRI");
  const sayim = await p.stokSayimSatiri.findFirst({
    where: { variantId: v.id },
    select: { sayilanAdet: true, duzeltmeYazildiAt: true,
      damgaSistemAdedi: true, kapsamdaydi: true,
      sayim: { select: { kod: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (!sayim) console.log("   (satır yok)");
  else {
    console.log("   sayım " + sayim.sayim.kod + "  sayılan " + sayim.sayilanAdet +
      "  damgaSistemAdedi " + (sayim.damgaSistemAdedi ?? "—") +
      "  kapsamda " + sayim.kapsamdaydi);
    console.log("   düzeltme yazıldı: " + (sayim.duzeltmeYazildiAt?.toISOString().slice(0, 16) ?? "HAYIR"));
    const fark = sayim.sayilanAdet === null ? null : sayim.sayilanAdet - bakiye;
    console.log("   ⭐ sayılan − ŞU ANKİ sistem = " + (fark === null ? "—" : fark) +
      (fark === 0 ? "   ✓ TUTUYOR" : "   ⚠ hâlâ fark var"));
  }

  console.log("\n③ ⚠ ASIL SORU — GEÇMİŞ SATIŞLAR MALİYETİNİ BULDU MU");
  const kalemler = await p.saleItem.findMany({
    where: { variantId: v.id, sale: { iptalTarihi: null } },
    select: { id: true, quantity: true, net2Amount: true, profitStatus: true,
      sale: { select: { code: true, soldAt: true } } },
    orderBy: { sale: { soldAt: "asc" } },
  });
  const hareketli = new Set(hrk.filter((h) => h.saleItemId).map((h) => h.saleItemId!));
  let bagli = 0, bagsiz = 0;
  for (const k of kalemler) {
    const b = hareketli.has(k.id);
    if (b) bagli++; else bagsiz++;
    console.log("   " + k.sale.soldAt.toISOString().slice(0, 10) + "  " +
      (k.sale.code ?? "—").padEnd(14) + " adet " + k.quantity +
      "  durum " + String(k.profitStatus).padEnd(13) +
      (b ? "✓ maliyet bağlı" : "⛔ MALİYET BAĞI YOK"));
  }
  console.log("\n   bağlı " + bagli + " · BAĞSIZ " + bagsiz);
  if (bagsiz > 0) {
    console.log("   ⛔ YENİ PARTİ ESKİ SATIŞLARA KENDİLİĞİNDEN BAĞLANMAZ.");
    console.log("     Sayım satırı kapandı ve stok doğru döndü — ama o satışların");
    console.log("     kârı hâlâ maliyetsiz. Bağı kuran ayrı bir koşum var:");
    console.log("     `npm run canli:stok-bagi`  (K55 kuyruğu).");
  } else {
    console.log("   ✓ Bu üründe bağsız satış kalmamış.");
  }
  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
