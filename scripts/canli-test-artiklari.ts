import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ÜÇ TEST DÜZELTMESİ — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:test-artiklari
 *
 *  Halil üç varyant için GERÇEĞİ bildirdi. Burada yalnız DEFTERİN ne
 *  dediği ölçülüyor ve beyanla karşılaştırılıyor.
 *
 *  ⭐ AYIRT EDİCİ SORU HER BİRİNDE AYNI: test hareketleri geri alınırsa
 *  stok, Halil'in söylediği rakama OTURUYOR MU? Oturmuyorsa YAZILMAZ —
 *  fark raporlanır. (Beklenen rakamı tutturmak için ikinci bir düzeltme
 *  uydurmak, defteri beyana uydurmak olurdu.)
 *
 *  ⚠ VE İKİNCİ SORU: "deneme amaçlı İADE oluşturuldu" deniyor. `ADJUSTMENT`
 *  yanında bir `Return`/`ReturnNotice` de doğmuş olabilir; doğduysa iade
 *  istatistikleri kirli kalır. O yüzden ayrıca aranıyor.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const VAKALAR: { sku: string; beklenen: number | null; beyan: string }[] = [
  {
    sku: "axcali1685", beklenen: 0,
    beyan: "3 adet vardı; 2'si Trendyol'dan, 1'i HB'den satıldı. TY'den birinin iadesi geldi, tekrar stoğa alınıp yeniden TY'den satıldı. Gerçek stok 0.",
  },
  { sku: "axcali1752", beklenen: 2, beyan: "Deneme amaçlı iade oluşturuldu; şu an 2 adet REEL stok var." },
  { sku: "axcali2595", beklenen: null, beyan: "Test amaçlı iade oluşturuldu. (Beklenen stok BEYAN EDİLMEDİ.)" },
];

/** ⚠ Desen: notu test/deneme geçen ve bir kayda BAĞLI OLMAYAN düzeltme. */
const TEST_DESENI = /test|deneme|dene\b/i;
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

  console.log("\n" + "=".repeat(104));
  console.log("ÜÇ TEST DÜZELTMESİ — ÖLÇÜM (yazma YOK)");
  console.log("=".repeat(104));

  for (const v of VAKALAR) {
    const varyant = await p.productVariant.findFirst({
      where: { sku: v.sku },
      select: { id: true, sku: true, product: { select: { name: true } } },
    });
    console.log("\n" + "-".repeat(104));
    console.log("● " + v.sku + " — " + (varyant?.product.name ?? "⛔ VARYANT YOK").slice(0, 60));
    console.log("  HALİL: " + v.beyan);
    console.log("-".repeat(104));
    if (!varyant) continue;

    const hh = await p.stockMovement.findMany({
      where: { variantId: varyant.id },
      select: {
        id: true, type: true, quantityDelta: true, unitCostAmount: true,
        occurredAt: true, createdAt: true, note: true, sourceMovementId: true,
        purchaseItemId: true, returnItemId: true,
        saleItem: { select: { sale: { select: { code: true, iptalTarihi: true,
          channelAccount: { select: { channel: { select: { name: true } } } } } } } },
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });

    console.log("\n  DEFTER (" + hh.length + " hareket):");
    for (const h of hh) {
      const bag = h.purchaseItemId ? "ALIM"
        : h.saleItem ? "SATIŞ " + (h.saleItem.sale.code ?? "—") +
            (h.saleItem.sale.iptalTarihi ? " İPTALLİ" : "") +
            " (" + (h.saleItem.sale.channelAccount?.channel.name ?? "—").slice(0, 3) + ")"
        : h.returnItemId ? "İADE" : "—";
      const test = TEST_DESENI.test(h.note ?? "") ? "  ⚠ TEST" : "";
      console.log("    " + h.occurredAt.toISOString().slice(0, 10) +
        " (yaz " + h.createdAt.toISOString().slice(5, 16).replace("T", " ") + ")  " +
        h.type.padEnd(14) + String(h.quantityDelta).padStart(3) +
        " · ₺" + s2(h.unitCostAmount).padStart(9) + " · " + bag.padEnd(28) + test);
      if (h.note) console.log("        not: " + h.note.slice(0, 78));
    }

    /** ① ŞİMDİKİ STOK — iki defter ayrı. */
    const ledger = hh.reduce((t, x) => t + x.quantityDelta, 0);
    const tuketim = new Map<string, number>();
    for (const x of hh) {
      if (x.sourceMovementId) {
        tuketim.set(x.sourceMovementId,
          (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
      }
    }
    const fifo = hh.filter((x) => x.quantityDelta > 0)
      .reduce((t, g) => t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)), 0);

    /** ② TEST HAREKETLERİ — desenle bulunur, listeyle değil. */
    const testler = hh.filter((x) =>
      x.type === "ADJUSTMENT" && x.purchaseItemId === null &&
      x.returnItemId === null && TEST_DESENI.test(x.note ?? ""));
    const testNet = testler.reduce((t, x) => t + x.quantityDelta, 0);

    console.log("\n  ⭐ STOK");
    console.log("    ŞİMDİ  : ledger " + ledger + " · FIFO açık parti " + fifo +
      (ledger === fifo ? "   ✓ tutuyor" : "   ⛔ AYRIŞIK"));
    console.log("    test hareketi " + testler.length + " · net etkisi " + testNet);
    const sonra = ledger - testNet;
    console.log("    GERİ ALINIRSA (ledger): " + sonra);
    if (v.beklenen === null) {
      console.log("    ⚠ BEKLENEN RAKAM BEYAN EDİLMEDİ — karşılaştırma yapılamaz.");
    } else if (sonra === v.beklenen) {
      console.log("    ⭐ HALİL " + v.beklenen + " diyor → TUTUYOR ✓");
    } else {
      console.log("    ⛔ HALİL " + v.beklenen + " diyor, hesap " + sonra +
        " veriyor → FARK " + (sonra - v.beklenen) + "   ⚠ YAZMA");
    }

    /** ③ İADE KAYITLARI — "deneme amaçlı iade" gerçekten doğmuş mu? */
    const iadeKalem = await p.returnItem.findMany({
      where: { variantId: varyant.id },
      select: {
        quantity: true, soundQuantity: true, damagedQuantity: true,
        return: {
          select: {
            id: true, returnType: true, occurredAt: true, createdAt: true, note: true,
            sale: { select: { code: true } },
          },
        },
      },
    });
    const bildirim = await p.returnNotice.findMany({
      where: { sale: { items: { some: { variantId: varyant.id } } } },
      select: { id: true, reason: true, status: true, noticedAt: true,
        createdAt: true, note: true, sale: { select: { code: true } } },
    });
    console.log("\n  İADE KAYITLARI");
    console.log("    ReturnItem " + iadeKalem.length + " · ReturnNotice " + bildirim.length);
    for (const k of iadeKalem) {
      console.log("    · Return " + k.return.returnType +
        " " + k.return.occurredAt.toISOString().slice(0, 10) +
        " (yaz " + k.return.createdAt.toISOString().slice(5, 16).replace("T", " ") + ")" +
        " · satış " + (k.return.sale.code ?? "—") +
        " · adet " + k.quantity + " (sağlam " + k.soundQuantity + " · hasarlı " + k.damagedQuantity + ")" +
        (TEST_DESENI.test(k.return.note ?? "") ? "   ⚠ NOTU TEST" : ""));
      if (k.return.note) console.log("        not: " + k.return.note.slice(0, 74));
    }
    for (const b of bildirim) {
      console.log("    · Notice " + b.reason + "/" + b.status +
        " " + b.noticedAt.toISOString().slice(0, 10) +
        " (yaz " + b.createdAt.toISOString().slice(5, 16).replace("T", " ") + ")" +
        " · satış " + (b.sale.code ?? "—") +
        (TEST_DESENI.test(b.note ?? "") ? "   ⚠ NOTU TEST" : ""));
      if (b.note) console.log("        not: " + b.note.slice(0, 74));
    }
    if (iadeKalem.length === 0 && bildirim.length === 0) {
      console.log("    ⭐ HİÇ İADE KAYDI YOK — \"deneme amaçlı iade\" beyanının");
      console.log("      defterde karşılığı BULUNAMADI. Yalnız `ADJUSTMENT` var.");
    }
  }

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
