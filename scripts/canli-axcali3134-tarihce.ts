import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  axcali3134 — TAM HAREKET TARİHÇESİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-axcali3134-tarihce.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir çelişkiyi çözer.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE VAR — İKİ KAYIT ÇELİŞİYOR ─────────────────────────────────────
 *  Pano K74-⑨ (03.09.2026) şöyle diyor: _"kalem 2 · adet 0 · net maliyet 0 ·
 *  29.08'de SALE_CANCEL_IN ile nötrlenmiş — İŞ YOK."_
 *  Bugünkü ölçüm (07.09) tersini gösterdi: **iki kalem de adet 1**, ciro
 *  2.078,00 ve her kalemde yalnız bir `SALE_OUT`.
 *
 *  ⛔ TEHLİKE: 29.08'deki ayna kaleme BAĞLANMAMIŞ olabilir (eski iptal
 *  deseni `saleItemId` yazmıyordu). O hâlde kalemin kendi hareket listesinde
 *  GÖRÜNMEZ ama varyantın stoğunu yine de artırır — ve bugünkü kaldırma
 *  ikinci bir +1 yazdıysa mal **iki kez** stoğa girmiş olur.
 *
 *  Bu yüzden ölçüm KALEME değil, VARYANTA bağlı yapılıyor.
 *  _(Anayasa: "ölçüm iki defteri de ölçmeli" — ledger ve FIFO.)_
 * ============================================================================
 */

const SKU = "axcali3134";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (varyant === null) {
    console.log("⛔ Varyant bulunamadı: " + SKU);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  console.log("\n" + SKU + " — TAM HAREKET TARİHÇESİ (SALT OKUMA)");
  console.log("  " + varyant.product.name.slice(0, 62));
  console.log("=".repeat(78));

  const hareketler = await prisma.stockMovement.findMany({
    where: { variantId: varyant.id },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      quantityDelta: true,
      occurredAt: true,
      createdAt: true,
      unitCostAmount: true,
      sourceMovementId: true,
      saleItemId: true,
      purchaseItemId: true,
      returnItemId: true,
      note: true,
      saleItem: { select: { sale: { select: { code: true } } } },
    },
  });

  console.log("\n① VARYANTIN BÜTÜN HAREKETLERİ (" + hareketler.length + ")");
  let toplam = 0;
  for (const h of hareketler) {
    toplam += h.quantityDelta;
    const bag = h.saleItemId
      ? `satış ${h.saleItem?.sale.code ?? "?"}`
      : h.purchaseItemId
        ? "alım"
        : h.returnItemId
          ? "iade"
          : "⚠ BAĞSIZ";
    console.log(
      `   ${h.occurredAt.toISOString().slice(0, 10)}  ${h.type.padEnd(16)} ` +
        `${(h.quantityDelta > 0 ? "+" : "") + String(h.quantityDelta)} ` +
        `· maliyet ${h.unitCostAmount?.toString() ?? "—"} · ${bag.padEnd(22)} ` +
        `· parti ${h.sourceMovementId ? "bağlı" : "—"} · toplam ${toplam}`,
    );
    if (h.note) console.log(`       not: ${h.note.slice(0, 66)}`);
  }

  /* ═══ İKİ DEFTER ═══════════════════════════════════════════════════ */
  const { acikPartilerToplu } = await import("../src/lib/stok");
  const partiler = (await acikPartilerToplu(prisma, [varyant.id])).get(varyant.id) ?? [];
  const fifo = partiler.reduce((t, p) => t + p.kalanAdet, 0);

  console.log("\n② İKİ DEFTER");
  console.log(`   ledger toplamı   ${toplam}`);
  console.log(`   FIFO açık parti  ${fifo}`);
  console.log(
    `   ${toplam === fifo ? "✓ AYRIŞMA YOK" : "⛔ AYRIŞMA VAR — ekran ile kâr farklı sayı okur"}`,
  );
  for (const p of partiler) {
    console.log(
      `     parti ${p.occurredAt.toISOString().slice(0, 10)} · giren ${p.girenAdet} ` +
        `· kalan ${p.kalanAdet} · maliyet ${p.birimMaliyet ?? "—"}`,
    );
  }

  /* ═══ ÇİFT GERİ ALMA VAR MI ════════════════════════════════════════ */
  const girisler = hareketler.filter(
    (h) => h.quantityDelta > 0 && (h.type === "SALE_CANCEL_IN" || h.type === "ADJUSTMENT"),
  );
  console.log("\n③ GERİ ALMA GİRİŞLERİ (" + girisler.length + ")");
  /**
   * ⛔ AYIRT EDİCİ SORU: aynı mükerrer kalem için İKİ KEZ geri alma yazıldıysa
   * mal iki kez stoğa girmiştir ve stok +1 FAZLADIR.
   */
  for (const h of girisler) {
    console.log(
      `   ${h.occurredAt.toISOString().slice(0, 10)} ${h.type} +${h.quantityDelta} ` +
        `· ${h.saleItemId ? "kaleme BAĞLI" : "⚠ kaleme BAĞSIZ"} · ${h.note?.slice(0, 40) ?? ""}`,
    );
  }
  if (girisler.length > 1) {
    console.log("   ⚠ BİRDEN ÇOK GERİ ALMA GİRİŞİ — aynı olayın iki kez yazılmadığı");
    console.log("     ayrı ayrı doğrulanmalı (tarih ve bağa bakın).");
  }

  console.log("\n" + "=".repeat(78));
  console.log("  SALT OKUMA — hiçbir şey yazılmadı.");
  await prisma.$disconnect();
}

void main();
