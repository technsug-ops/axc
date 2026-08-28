import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  HALİL'İN ON VAKASI — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:on-vaka
 *
 *  Halil 28.08.2026'da on kayıt bildirdi ve her biri için GERÇEĞİ yazdı.
 *  Burada yalnız SİSTEMİN NE DEDİĞİ ölçülüyor — düzeltme YAZILMIYOR.
 *  Halil'in beyanı ile defterin arası açıldığında hangisinin ne dediği
 *  yan yana basılır; hüküm Halil'e ait.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);

type P = PrismaClient;

/** Bir siparişin tam hâli — on vakanın dokuzu bunu istiyor. */
async function siparis(p: P, kod: string) {
  return p.sale.findFirst({
    where: { code: kod },
    select: {
      id: true, code: true, soldAt: true, iptalTarihi: true, profitStatus: true,
      net2Amount: true, importKaynak: true, note: true,
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
      items: {
        select: {
          id: true, quantity: true, unitPriceAmount: true, commissionRate: true,
          profitStatus: true, net2Amount: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
          stockMovements: {
            select: { id: true, type: true, quantityDelta: true, unitCostAmount: true,
              occurredAt: true, sourceMovementId: true, note: true },
          },
        },
      },
      fees: { select: { code: true, amount: true } },
      returns: { select: { returnType: true, occurredAt: true, returnCargoAmount: true } },
    },
  });
}

function bas(x: Awaited<ReturnType<typeof siparis>>, kod: string) {
  if (!x) { console.log("   ⛔ SİSTEMDE YOK — " + kod); return; }
  console.log("   " + (x.channelAccount?.channel.name ?? "—") + " · " +
    x.soldAt.toISOString().slice(0, 10) +
    " · kaynak " + (x.importKaynak ?? "elle") +
    " · kâr " + x.profitStatus + " · NET-2 " + s2(x.net2Amount) +
    (x.iptalTarihi ? "   ⛔ İPTALLİ" : ""));
  for (const k of x.items) {
    console.log("     " + (k.variant.sku ?? "—").padEnd(13) + "adet " + k.quantity +
      " · fiyat " + s2(k.unitPriceAmount).padStart(9) +
      " · oran " + (k.commissionRate === null ? "—" : s2(k.commissionRate)).padStart(6) +
      " · " + k.profitStatus + "  " + (k.variant.product.name ?? "").slice(0, 26));
    if (k.stockMovements.length === 0) {
      console.log("       ⛔ STOK HAREKETİ YOK — maliyet bağı kurulamıyor");
    }
    for (const h of k.stockMovements) {
      console.log("       " + h.type.padEnd(12) + String(h.quantityDelta).padStart(3) +
        " · birim " + s2(h.unitCostAmount).padStart(9) +
        " · " + h.occurredAt.toISOString().slice(0, 10) +
        (h.sourceMovementId ? " · partiye bağlı" : " · ⛔ PARTİSİZ") +
        (h.note ? "  " + h.note.slice(0, 30) : ""));
    }
  }
  if (x.fees.length > 0) {
    console.log("     kesinti: " + x.fees.map((f) => f.code + " " + s2(f.amount)).join(" · "));
  }
  console.log("     iade kaydı: " + (x.returns.length === 0 ? "YOK" :
    x.returns.map((r) => r.returnType + " " + r.occurredAt.toISOString().slice(0, 10) +
      " kargo " + s2(r.returnCargoAmount)).join(" · ")));
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("HALİL'İN ON VAKASI — ÖLÇÜM (yazma YOK)");
  console.log("=".repeat(100));

  // ── ① 11540657420 — Barbie ─────────────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("① 11540657420 — Barbie · Halil: \"10 tane alındı, 9'u sorunsuz\"");
  console.log("-".repeat(100));
  bas(await siparis(p, "11540657420"), "11540657420");
  const bb = await p.productVariant.findFirst({
    where: { sku: "axcali1869" }, select: { id: true },
  });
  if (bb) {
    const hh = await p.stockMovement.findMany({
      where: { variantId: bb.id },
      select: { quantityDelta: true, unitCostAmount: true, type: true },
    });
    const alinan = hh.filter((h) => h.quantityDelta > 0).reduce((t, h) => t + h.quantityDelta, 0);
    const satilan = -hh.filter((h) => h.quantityDelta < 0).reduce((t, h) => t + h.quantityDelta, 0);
    const kalemler = await p.saleItem.findMany({
      where: { variantId: bb.id },
      select: {
        quantity: true, profitStatus: true,
        sale: { select: { code: true, soldAt: true, iptalTarihi: true } },
        stockMovements: { select: { id: true } },
      },
      orderBy: { sale: { soldAt: "asc" } },
    });
    const gecerli = kalemler.filter((k) => k.sale.iptalTarihi === null);
    console.log("\n   ⭐ DEFTER: alınan " + alinan + " adet · satılan " + satilan + " adet");
    console.log("   ⭐ HALİL  : alınan 10 adet");
    console.log("   satış kalemi " + kalemler.length + " (iptalsiz " + gecerli.length + ")" +
      " · toplam satılan adet " + gecerli.reduce((t, k) => t + k.quantity, 0));
    const bagsiz = gecerli.filter((k) => k.stockMovements.length === 0);
    console.log("   ⛔ maliyet bağı OLMAYAN kalem: " + bagsiz.length);
    for (const k of bagsiz) {
      console.log("     " + (k.sale.code ?? "—") + " · " +
        k.sale.soldAt.toISOString().slice(0, 10) + " · adet " + k.quantity);
    }
    const birim = [...new Set(hh.filter((h) => h.quantityDelta > 0)
      .map((h) => s2(h.unitCostAmount)))];
    console.log("   alım birim maliyetleri: " + birim.join(" · "));
    console.log("\n   ⚠ FARK: defter " + alinan + " alım diyor, Halil 10 diyor →" +
      " eksik alım " + (10 - alinan) + " adet");
  }

  // ── ② 4120311526 — HB teslim edilmemiş iade ────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("② 4120311526 — Halil: teslim edilmedi, kargoda iptal, stoğa girdi,");
  console.log("   ₺94,20 kargo ödendi, sonra tekrar satıldı, şu an stokta YOK");
  console.log("-".repeat(100));
  const raz = await siparis(p, "4120311526");
  bas(raz, "4120311526");
  const razV = raz?.items[0]?.variant.id;
  if (razV) {
    const digerSatis = await p.saleItem.findMany({
      where: { variantId: razV, sale: { code: { not: "4120311526" } } },
      select: {
        quantity: true, profitStatus: true, unitPriceAmount: true,
        sale: { select: { code: true, soldAt: true, iptalTarihi: true } },
        stockMovements: { select: { id: true } },
      },
      orderBy: { sale: { soldAt: "asc" } },
    });
    const hh = await p.stockMovement.findMany({
      where: { variantId: razV },
      select: { type: true, quantityDelta: true, unitCostAmount: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
    console.log("\n   ⭐ AYNI ÜRÜNÜN (axcali1633) BÜTÜN HAREKETLERİ:");
    for (const h of hh) {
      console.log("     " + h.occurredAt.toISOString().slice(0, 10) + "  " +
        h.type.padEnd(12) + String(h.quantityDelta).padStart(3) +
        " · birim " + s2(h.unitCostAmount));
    }
    console.log("   net stok " + hh.reduce((t, h) => t + h.quantityDelta, 0) + " adet");
    console.log("\n   ⭐ AYNI ÜRÜNÜN DİĞER SATIŞLARI (\"tekrar satıldı\" iddiası):");
    if (digerSatis.length === 0) console.log("     ⛔ YOK — defterde ikinci bir satış hiç yok");
    for (const k of digerSatis) {
      console.log("     " + (k.sale.code ?? "—").padEnd(14) +
        k.sale.soldAt.toISOString().slice(0, 10) + " · " + s2(k.unitPriceAmount).padStart(9) +
        " · " + k.profitStatus + (k.sale.iptalTarihi ? " · İPTALLİ" : "") +
        (k.stockMovements.length === 0 ? " · ⛔ maliyet bağı YOK" : ""));
    }
  }

  // ── ③ ve ⑩ — aynı siparişte iki kalem, maliyetleri ayrışık ─────────────
  for (const [no, beyan] of [["10828937011", "1634"], ["4138485546", "2549"]] as const) {
    console.log("\n" + "-".repeat(100));
    console.log((no === "10828937011" ? "③ " : "⑩ ") + no +
      " — Halil: aynı üründen 2 adet, birim maliyet ₺" + beyan);
    console.log("-".repeat(100));
    bas(await siparis(p, no), no);
  }

  // ── ④ 4673224319 — tazmin kazanıldı ────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("④ 4673224319 — Halil: kullanılmış iade · HB kabul etti · tazmin");
  console.log("   KAZANILDI, 03.02.2026 hakedişinde ₺1.216,87 + hurda geliri ödendi");
  console.log("-".repeat(100));
  bas(await siparis(p, "4673224319"), "4673224319");
  const hakedis = await p.settlementItem.findMany({
    where: { orderNo: "4673224319" },
    select: { code: true, amount: true, dueDate: true, paidAt: true, rawType: true },
  });
  console.log("   hakediş satırı: " + (hakedis.length === 0 ? "⛔ YOK" :
    hakedis.map((h) => h.code + " " + s2(h.amount)).join(" · ")));

  // ── ⑤⑥⑦⑧ — promosyon, maliyet 0 ───────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("⑤⑥⑦⑧ PROMOSYON — Halil: maliyeti 0 olan ürünün satışı");
  console.log("-".repeat(100));
  for (const no of ["10635054169", "4762343000", "4405769515", "10571819650"]) {
    console.log("\n   ● " + no);
    bas(await siparis(p, no), no);
  }

  // ── ⑨ 10559161422 — mükerrer ───────────────────────────────────────────
  console.log("\n" + "-".repeat(100));
  console.log("⑨ 10559161422 — Halil: Excel'e MÜKERRER yazılmış, iptal edilecek");
  console.log("-".repeat(100));
  const muk = await siparis(p, "10559161422");
  bas(muk, "10559161422");
  if (muk) {
    /** ⚠ Mükerrer iddiası ÖLÇÜLÜR: aynı ürün + aynı gün + aynı tutar başka satış? */
    const vid = muk.items[0]?.variant.id;
    const fiyat = muk.items[0]?.unitPriceAmount;
    if (vid && fiyat) {
      const ikiz = await p.saleItem.findMany({
        where: { variantId: vid, unitPriceAmount: fiyat, sale: { code: { not: "10559161422" } } },
        select: {
          unitPriceAmount: true,
          sale: { select: { code: true, soldAt: true, iptalTarihi: true } },
        },
      });
      console.log("\n   ⭐ AYNI ÜRÜN + AYNI FİYAT taşıyan başka satış: " + ikiz.length);
      for (const k of ikiz) {
        console.log("     " + (k.sale.code ?? "—").padEnd(14) +
          k.sale.soldAt.toISOString().slice(0, 10) + " · " + s2(k.unitPriceAmount) +
          (k.sale.iptalTarihi ? " · İPTALLİ" : ""));
      }
    }
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
