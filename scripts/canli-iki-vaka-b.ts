import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İKİ VAKA — DERİNLEŞTİRME (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iki-vaka-b
 *
 *  ① axcali1869 — NİYE NO_COST: alım/satış defteri ve FIFO açık parti
 *  ② 4120311526 — dosyada iade satırı var mı, ne diyor
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("① axcali1869 — NİYE NO_COST");
  console.log("=".repeat(100));

  const v = await p.productVariant.findFirst({
    where: { sku: "axcali1869" },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (!v) { console.log("   ⛔ VARYANT YOK"); }
  else {
    const hh = await p.stockMovement.findMany({
      where: { variantId: v.id },
      select: { id: true, type: true, quantityDelta: true, occurredAt: true,
        unitCostAmount: true, sourceMovementId: true, purchaseItemId: true, saleItemId: true },
      orderBy: { occurredAt: "asc" },
    });
    const giren = hh.filter((x) => x.quantityDelta > 0).reduce((t, x) => t + x.quantityDelta, 0);
    const cikan = hh.filter((x) => x.quantityDelta < 0).reduce((t, x) => t + x.quantityDelta, 0);
    console.log("\n   " + (v.product.name ?? "—").slice(0, 66));
    console.log("   hareket " + hh.length + " · giren " + giren + " · çıkan " + cikan +
      " · ⭐ NET STOK " + (giren + cikan));
    console.log("\n   DEFTER:");
    for (const x of hh) {
      console.log("     " + x.occurredAt.toISOString().slice(0, 10) + "  " +
        x.type.padEnd(12) + String(x.quantityDelta).padStart(4) +
        " · birim " + s2(x.unitCostAmount).padStart(10) +
        (x.sourceMovementId ? " · partiye bağlı" : x.quantityDelta > 0 ? " · PARTİ" : " · ⛔ PARTİSİZ"));
    }
    /** ⚠ FIFO AÇIK PARTİ: giriş hareketi − ona bağlı tüketimler. */
    const girisler = hh.filter((x) => x.quantityDelta > 0);
    const tuketim = new Map<string, number>();
    for (const x of hh) {
      if (x.sourceMovementId) tuketim.set(x.sourceMovementId,
        (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
    }
    const acik = girisler.reduce((t, g) => t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)), 0);
    console.log("\n   ⭐ FIFO AÇIK PARTİ KALANI : " + acik + " adet");
    console.log("     (satış anında bu 0 ise SALE_OUT yazılamaz → NO_COST)");
    const satisKalem = await p.saleItem.count({ where: { variantId: v.id } });
    const bagsiz = await p.saleItem.count({
      where: { variantId: v.id, stockMovements: { none: {} } },
    });
    console.log("   satış kalemi " + satisKalem + " · ⛔ stok hareketi OLMAYAN " + bagsiz);
  }

  console.log("\n\n" + "=".repeat(100));
  console.log("② 4120311526 — DOSYA NE DİYOR");
  console.log("=".repeat(100));
  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => b.indexOf(a);
  const satir = s.data.slice(1).filter((r) =>
    String(r[i("Sipariş Numarası")] ?? "").trim() === "4120311526");
  console.log("\n   ters-satır listesinde: " + satir.length + " satır");
  for (const r of satir) {
    console.log("     TÜR " + String(r[i("TÜR")] ?? "—").padEnd(8) +
      " · adet " + String(r[i("Satış Miktarı")]) +
      " · liste " + n(r[i("ÜRÜN LİSTE FİYATI")]).toFixed(2) +
      " · alış " + n(r[i("ÜRÜN ALIŞ FİYATI")]).toFixed(2) +
      " · KARGO " + String(r[i("KARGO")] ?? "—") +
      " · tarih " + String(r[i("Tarih")] ?? "—").slice(0, 24));
  }

  console.log("\n   ⚠ HB PANELİ (kullanıcı ekranı, 29.07–28.08 penceresi):");
  console.log("     sipariş tutarı 0 · komisyon 0 · hizmet bedeli 0 · stopaj 0");
  console.log("     ⭐ KARGO KESİNTİSİ −94,20 · NET −94,20 · durum 'İade edildi'");
  console.log("\n   DEFTERİMİZ ŞUNU DİYOR:");
  const sale = await p.sale.findFirst({
    where: { code: "4120311526" },
    select: { fees: { select: { code: true, amount: true } },
      items: { select: { quantity: true, unitPriceAmount: true } } },
  });
  if (sale) {
    const ciro = sale.items.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
    console.log("     ciro " + ciro.toFixed(2) + " · kesinti " +
      sale.fees.map((f) => f.code + " " + s2(f.amount)).join(" · "));
    console.log("     ⛔ İADE KAYDI YOK · KARGO ÜCRETİ YOK");
    console.log("\n   ⭐ FARK: panel −94,20 diyor, defter " + ciro.toFixed(2) +
      " TL'lik GERÇEKLEŞMİŞ satış sayıyor.");
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
