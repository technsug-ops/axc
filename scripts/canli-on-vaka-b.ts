import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ON VAKA — ÜÇ AÇIK NOKTA (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:on-vaka-b
 *
 *  ① Barbie'de alım = satış (10 = 10) olmasına rağmen bir kalem maliyetsiz.
 *    Demek ki bir parti YANLIŞ kalemde duruyor — hangisinde?
 *  ② Promosyon ürününün (axcali3070) defterde hiç hareketi var mı?
 *  ③ `10559161422` mükerrerliği DOSYADA mı, deftere mi ait?
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
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
  console.log("ON VAKA — ÜÇ AÇIK NOKTA");
  console.log("=".repeat(100));

  // ── ① Barbie: parti hangi kalemde duruyor ──────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("① axcali1869 — alım 10 = satış 10, ama bir kalem maliyetsiz");
  console.log("-".repeat(100));
  const v = await p.productVariant.findFirst({ where: { sku: "axcali1869" }, select: { id: true } });
  if (v) {
    const kalemler = await p.saleItem.findMany({
      where: { variantId: v.id },
      select: {
        id: true, quantity: true, profitStatus: true,
        sale: { select: { code: true, soldAt: true, iptalTarihi: true, iptalSebebi: true } },
        stockMovements: { select: { type: true, quantityDelta: true, occurredAt: true } },
      },
      orderBy: { sale: { soldAt: "asc" } },
    });
    for (const k of kalemler) {
      console.log("   " + (k.sale.code ?? "—").padEnd(14) +
        k.sale.soldAt.toISOString().slice(0, 10) +
        " · adet " + k.quantity + " · " + String(k.profitStatus).padEnd(13) +
        (k.sale.iptalTarihi
          ? "⛔ İPTALLİ " + k.sale.iptalTarihi.toISOString().slice(0, 10) +
            " (" + k.sale.iptalSebebi + ")"
          : "") +
        "  hareket: " + (k.stockMovements.length === 0 ? "⛔ YOK" :
          k.stockMovements.map((h) => h.type + " " + h.quantityDelta).join(" · ")));
    }
    console.log("\n   ⭐ SORU: iptalli kalem hâlâ bir partiyi tutuyorsa, iptal");
    console.log("     stoğu geri VERMEMİŞ demektir — ve serbest kalan o parti");
    console.log("     `11540657420`in maliyeti olurdu.");
  }

  // ── ② Promosyon ürünü ─────────────────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("② axcali3070 — promosyon ürünü, defterdeki bütün hareketleri");
  console.log("-".repeat(100));
  const v2 = await p.productVariant.findFirst({
    where: { sku: "axcali3070" },
    select: { id: true, product: { select: { name: true } } },
  });
  if (!v2) console.log("   ⛔ VARYANT YOK");
  else {
    const hh = await p.stockMovement.findMany({
      where: { variantId: v2.id },
      select: { type: true, quantityDelta: true, unitCostAmount: true, occurredAt: true, note: true },
      orderBy: { occurredAt: "asc" },
    });
    console.log("   " + (v2.product.name ?? "").slice(0, 60));
    console.log("   hareket " + hh.length + (hh.length === 0 ? "  ⛔ HİÇ YOK — ne alım ne satış" : ""));
    for (const h of hh) {
      console.log("     " + h.occurredAt.toISOString().slice(0, 10) + "  " +
        h.type.padEnd(12) + String(h.quantityDelta).padStart(3) +
        " · birim " + s2(h.unitCostAmount) + (h.note ? "  " + h.note.slice(0, 34) : ""));
    }
    const kalem = await p.saleItem.count({ where: { variantId: v2.id } });
    const alim = await p.purchaseItem.count({ where: { variantId: v2.id } });
    console.log("   satış kalemi " + kalem + " · alım kalemi " + alim);
  }

  // ── ③ Mükerrer: dosyada kaç satır ─────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("③ 10559161422 — mükerrerlik DOSYADA mı?");
  console.log("-".repeat(100));
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => sb.indexOf(a);
  const satir = ss.data.slice(6).filter((r) =>
    String(r[j("Sipariş Numarası")] ?? "").trim() === "10559161422");
  console.log("   satış dosyasındaki satır sayısı: " + satir.length);
  for (const r of satir) {
    console.log("     TÜR " + String(r[j("TÜR")] ?? "—").padEnd(8) +
      " · adet " + String(r[j("Satış Miktarı")]).padStart(3) +
      " · liste " + Number(r[j("ÜRÜN LİSTE FİYATI")] ?? 0).toFixed(2).padStart(9) +
      " · alış " + Number(r[j("ÜRÜN ALIŞ FİYATI")] ?? 0).toFixed(2).padStart(9) +
      " · SKU " + String(r[j("SKU")] ?? "—") +
      " · " + String(r[j("Ürün")] ?? "").slice(0, 26));
  }
  console.log("\n   ⭐ İki satır varsa mükerrerlik DOSYADA; içe aktarma onu");
  console.log("     sadakatle iki kalem yapmış. Bir satır varsa mükerrerlik");
  console.log("     BAŞKA bir sipariş numarasında aranmalı.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
