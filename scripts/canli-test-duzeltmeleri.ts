import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  TEST NOTLU DÜZELTMELER + BARBIE GERİ ALMA KURU KOŞUMU (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:test-duzeltmeleri
 *
 *  ① Barbie: "test amaçlı" ADJUSTMENT geri alınırsa ne olur?
 *  ② GENEL TARAMA: aynı sınıftan başka kayıt var mı?
 *     ⚠ Ölçüt DOSYA LİSTESİ DEĞİL, DESEN: notu "test/deneme/dene" geçen
 *     ya da NOTSUZ her elle düzeltme taranır — yarın yazılan da yakalanır.
 *  ③ Kargo sütunundaki tek NEGATİF değer hangi satırda?
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
  console.log("TEST NOTLU DÜZELTMELER + BARBIE GERİ ALMA (salt okuma)");
  console.log("=".repeat(100));

  // ── ① BARBIE — geri alınırsa ne olur ──────────────────────────────────
  console.log("\n① BARBIE — `ADJUSTMENT −1` geri alınırsa");
  console.log("-".repeat(100));
  const v = await p.productVariant.findFirst({
    where: { sku: "axcali1869" }, select: { id: true },
  });
  if (!v) console.log("   ⛔ VARYANT YOK");
  else {
    const hh = await p.stockMovement.findMany({
      where: { variantId: v.id },
      select: { id: true, type: true, quantityDelta: true, unitCostAmount: true,
        occurredAt: true, sourceMovementId: true, note: true },
    });
    const tuketim = new Map<string, number>();
    for (const x of hh) {
      if (x.sourceMovementId) {
        tuketim.set(x.sourceMovementId,
          (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
      }
    }
    const acikSimdi = hh.filter((x) => x.quantityDelta > 0)
      .reduce((t, g) => t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)), 0);
    const test = hh.find((x) => x.type === "ADJUSTMENT" && /test/i.test(x.note ?? ""));
    console.log("   ŞU AN : ledger " + hh.reduce((t, x) => t + x.quantityDelta, 0) +
      " · FIFO açık parti " + acikSimdi);
    if (!test) console.log("   ⛔ test notlu ADJUSTMENT bulunamadı");
    else {
      console.log("   test kaydı: " + test.id + " · " + test.quantityDelta +
        " adet · ₺" + s2(test.unitCostAmount) + " · not \"" + test.note + "\"");
      console.log("\n   ⭐ TERS KAYIT (`ADJUSTMENT +1`) YAZILIRSA:");
      console.log("     ledger " + (hh.reduce((t, x) => t + x.quantityDelta, 0) + 1) +
        " · FIFO açık parti " + (acikSimdi + 1) + "   ← Barbie'ye maliyet çıkar");
      console.log("     ⚠ AMA TEK BAŞINA YETMEZ: `11540657420`in `SALE_OUT`u yok.");
      console.log("       Serbest kalan parti kendiliğinden o satışa BAĞLANMAZ —");
      console.log("       `canli:ice-aktarma-stok-bagi` (K55) ikinci adım olarak koşar.");
      console.log("     ⚠ VE ÇARE `SİLMEK` DEĞİL: ledger kuralı (`lib/stok-duzeltme.ts`)");
      console.log("       _\"hareket silinmez; yanlış düzeltme ters işaretli ikinci");
      console.log("       düzeltmeyle kapatılır\"_ diyor. Ters kayıt EKRANDAN yapılır —");
      console.log("       ikinci bir düzeltme mantığı YAZILMAZ.");
    }
  }

  // ── ② GENEL TARAMA — desen, liste değil ───────────────────────────────
  console.log("\n② GENEL TARAMA — aynı sınıftan başka kayıt");
  console.log("-".repeat(100));
  const elle = await p.stockMovement.findMany({
    where: {
      type: "ADJUSTMENT",
      purchaseItemId: null, saleItemId: null, returnItemId: null,
    },
    select: {
      id: true, quantityDelta: true, unitCostAmount: true, note: true,
      occurredAt: true, createdAt: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log("   bir kayda BAĞLI OLMAYAN düzeltme (elle girilmiş): " + elle.length);
  const supheli = elle.filter((x) => /test|deneme|dene\b|kontrol|sil(inecek)?/i.test(x.note ?? ""));
  const notsuz = elle.filter((x) => (x.note ?? "").trim() === "");
  console.log("   ⭐ notu \"test/deneme/kontrol\" geçen : " + supheli.length);
  console.log("   ⛔ NOTU HİÇ OLMAYAN                 : " + notsuz.length);
  if (supheli.length > 0) {
    console.log("\n   ŞÜPHELİ NOTLULAR:");
    for (const x of supheli) {
      console.log("     " + x.createdAt.toISOString().slice(0, 16).replace("T", " ") +
        "  " + (x.variant.sku ?? "—").padEnd(13) +
        String(x.quantityDelta).padStart(4) + " adet · ₺" + s2(x.unitCostAmount).padStart(9) +
        "  \"" + (x.note ?? "") + "\"");
      console.log("       " + (x.variant.product.name ?? "").slice(0, 62));
    }
  }
  if (notsuz.length > 0) {
    console.log("\n   NOTSUZ OLANLAR (ilk 10):");
    for (const x of notsuz.slice(0, 10)) {
      console.log("     " + x.createdAt.toISOString().slice(0, 16).replace("T", " ") +
        "  " + (x.variant.sku ?? "—").padEnd(13) +
        String(x.quantityDelta).padStart(4) + " adet · ₺" + s2(x.unitCostAmount));
    }
  }
  /** ⚠ Bugün yazılan HER hareket — test dışında da bir şey kaçtı mı? */
  const bugun = new Date(Date.UTC(2026, 7, 28));
  const bugunHepsi = await p.stockMovement.groupBy({
    by: ["type"],
    where: { createdAt: { gte: bugun } },
    _count: { _all: true }, _sum: { quantityDelta: true },
  });
  console.log("\n   BUGÜN (28.08) yazılan bütün stok hareketleri:");
  for (const g of bugunHepsi) {
    console.log("     " + String(g.type).padEnd(14) + String(g._count._all).padStart(6) +
      " kayıt · net " + (g._sum.quantityDelta ?? 0));
  }

  // ── ③ KARGO SÜTUNUNDAKİ NEGATİF ───────────────────────────────────────
  console.log("\n③ KARGO SÜTUNUNDAKİ TEK NEGATİF DEĞER");
  console.log("-".repeat(100));
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => bas.indexOf(a);
  const eksi = ss.data.slice(6).filter((r) => Number(r[j("KARGO")]) < 0);
  console.log("   negatif kargo satırı: " + eksi.length);
  /** ⭐ TÜRE GÖRE AYIR — "1 negatif" ölçümüm TÜR=satış süzgecinden geliyordu. */
  const turSay = new Map<string, { n: number; toplam: number }>();
  for (const r of eksi) {
    const t = String(r[j("TÜR")] ?? "—").trim() || "—";
    const v = turSay.get(t) ?? { n: 0, toplam: 0 };
    v.n++; v.toplam += Math.abs(Number(r[j("KARGO")]));
    turSay.set(t, v);
  }
  console.log("   TÜRE GÖRE: " + [...turSay]
    .map(([k, v]) => k + "=" + v.n + " (₺" + v.toplam.toFixed(2) + ")").join(" · "));
  console.log("   ⭐ Negatifler SATIŞ değil İADE satırlarında → bu sütun K73'ün");
  console.log("     üçüncü bilinmeyeni olan `iadeKargosu`nun ta kendisi olabilir.");
  console.log("     ⛔ Ama ÖLÇÜLMEDİ: gidiş kargosu mu, iade kargosu mu, ikisi mi?");
  for (const r of eksi.slice(0, 6)) {
    const kod = String(r[j("Sipariş Numarası")] ?? "—").trim();
    const s = kod === "" ? null : await p.sale.findFirst({
      where: { code: kod },
      select: { soldAt: true, iptalTarihi: true, profitStatus: true, cargoAmount: true },
    });
    console.log("     sipariş " + (kod || "⛔ BOŞ").padEnd(16) +
      " · TÜR " + String(r[j("TÜR")] ?? "—").padEnd(8) +
      " · KARGO " + Number(r[j("KARGO")]).toFixed(2).padStart(10) +
      " · liste " + Number(r[j("ÜRÜN LİSTE FİYATI")] ?? 0).toFixed(2).padStart(10));
    console.log("       ürün: " + String(r[j("Ürün")] ?? "").slice(0, 56));
    console.log("       sistemde: " + (s === null ? "⛔ YOK" :
      s.soldAt.toISOString().slice(0, 10) + " · kâr " + s.profitStatus +
      " · kargo " + s2(s.cargoAmount) + (s.iptalTarihi ? " · İPTALLİ" : "")));
  }
  console.log("\n   ⛔ YAZILMIYOR — negatif kargo bir ödeme değil, bir İADE ya da");
  console.log("     düzeltme olabilir. Hangisi olduğu ölçülmedi; Halil bakacak.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
