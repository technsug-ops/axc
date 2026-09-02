/**
 * ============================================================================
 *  BİR VARYANTIN TAM GEÇMİŞİ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:varyant-gecmisi -- <SKU>
 *
 *  BETIK SINIFI: SUREKLI. ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE ─────────────────────────────────────────────────────────────────
 *  `11265267349` siparişinde `axcali1739`dan İKİ kalem var (biri negatif
 *  fiyatlı) ve maliyet netleşmiyor. Kullanıcı: _"axcali1739 geçmişine bak
 *  çıkar."_
 *
 *  ⚠ EKRANDAKİ "hareket geçmişi" TABLOSU YETMEZ: orada tip ve adet var ama
 *  hangi hareketin hangi PARTİDEN düştüğü (`sourceMovementId`) ve partinin
 *  KALANI görünmüyor. Bu betik iki defteri birlikte basar:
 *    · LEDGER  — `quantityDelta` toplamı (ekranların gösterdiği)
 *    · FIFO    — açık partilerin kalanı (maliyetin okuduğu)
 *  _(Anayasa: "stoğun kendisi de İKİ DEFTERDİR" — ayrıştıklarında ekran bir
 *  sayı, kâr hesabı başka sayı üzerinden çalışır ve hiçbiri hata vermez.)_
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SKU = process.argv.slice(2).find((a) => !a.startsWith("-"));

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  if (!SKU) {
    console.log("Kullanım: npm run canli:varyant-gecmisi -- <SKU>");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const v = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: {
      id: true,
      sku: true,
      companySku: true,
      barcode: true,
      sayimGecersizAt: true,
      product: { select: { name: true } },
      location: { select: { name: true } },
    },
  });
  if (v === null) {
    console.log(`⛔ '${SKU}' bulunamadı — bu 'stok yok' DEMEK DEĞİL, KOD yok.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log("=".repeat(96));
  console.log(`  ${v.sku} — ${v.product.name}`);
  console.log("=".repeat(96));
  console.log(
    `  firma SKU ${v.companySku ?? "—"} · barkod ${v.barcode ?? "—"}` +
      ` · raf ${v.location?.name ?? "—"}`,
  );

  const hareketler = await prisma.stockMovement.findMany({
    where: { variantId: v.id },
    select: {
      id: true,
      type: true,
      quantityDelta: true,
      unitCostAmount: true,
      occurredAt: true,
      createdAt: true,
      note: true,
      sourceMovementId: true,
      purchaseItem: { select: { purchase: { select: { code: true } } } },
      saleItem: {
        select: {
          unitPriceAmount: true,
          sale: { select: { code: true, iptalTarihi: true } },
        },
      },
      returnItem: { select: { return: { select: { sale: { select: { code: true } } } } } },
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  console.log(`\n① HAREKET GEÇMİŞİ — ${hareketler.length} kayıt`);
  console.log(
    "   tarih       tip".padEnd(30) +
      "adet".padStart(6) +
      "birim mal.".padStart(12) +
      "  kaynak / parti",
  );
  console.log("   " + "-".repeat(90));
  let kosanStok = 0;
  const partiKalan = new Map<string, { kalan: number; birim: number | null; gun: string }>();
  for (const h of hareketler) {
    kosanStok += h.quantityDelta;
    /** Pozitif hareket = PARTİ. Negatifler `sourceMovementId` ile tüketir. */
    if (h.quantityDelta > 0) {
      partiKalan.set(h.id, {
        kalan: h.quantityDelta,
        birim: h.unitCostAmount === null ? null : Number(h.unitCostAmount.toString()),
        gun: gun(h.occurredAt),
      });
    } else if (h.sourceMovementId !== null) {
      const p = partiKalan.get(h.sourceMovementId);
      if (p) p.kalan += h.quantityDelta;
    }
    const kaynak =
      h.purchaseItem?.purchase.code ??
      (h.saleItem
        ? `satış ${h.saleItem.sale.code ?? "—"}` +
          (h.saleItem.sale.iptalTarihi !== null ? " [İPTAL]" : "") +
          ` @${para(h.saleItem.unitPriceAmount)}`
        : h.returnItem
          ? `iade ${h.returnItem.return.sale?.code ?? "—"}`
          : (h.note ?? "—").slice(0, 44));
    console.log(
      "   " +
        gun(h.occurredAt) +
        "  " +
        String(h.type).padEnd(16) +
        String(h.quantityDelta > 0 ? "+" + h.quantityDelta : h.quantityDelta).padStart(5) +
        para(h.unitCostAmount).padStart(12) +
        "  " +
        kaynak +
        (h.sourceMovementId ? "  ←parti" : ""),
    );
  }

  /**
   * ② İKİ DEFTER YAN YANA — AYRIŞMA VARSA BURADA GÖRÜNÜR.
   * Ledger = tüm `quantityDelta` toplamı.
   * FIFO   = açık partilerin kalanları toplamı.
   */
  const fifoKalan = [...partiKalan.values()].reduce((t, p) => t + p.kalan, 0);
  console.log("\n② İKİ DEFTER");
  console.log(`   LEDGER (delta toplamı)      : ${kosanStok}`);
  console.log(`   FIFO   (açık parti kalanı)  : ${fifoKalan}`);
  console.log(
    kosanStok === fifoKalan
      ? "   ✓ TUTUYOR"
      : `   ⛔ AYRIŞMA ${kosanStok - fifoKalan} — ekran ile kâr hesabı farklı sayı okuyor`,
  );

  console.log("\n③ AÇIK PARTİLER");
  let acikVar = false;
  for (const [, p] of partiKalan) {
    if (p.kalan === 0) continue;
    acikVar = true;
    console.log(
      `   ${p.gun}  kalan ${String(p.kalan).padStart(4)}` +
        `  birim ${para(p.birim).padStart(11)}`,
    );
  }
  if (!acikVar) console.log("   (açık parti yok — stok bitmiş)");

  if (v.sayimGecersizAt !== null) {
    console.log(`\n⚠ SAYIM GEÇERSİZ damgası: ${gun(v.sayimGecersizAt)}`);
  }

  console.log("\n" + "-".repeat(96));
  console.log("  ⛔ HÜKÜM YOK. Bu rapor defterin ne YAZDIĞINI gösterir;");
  console.log("     rafta ne olduğunu SÖYLEMEZ. Fiziksel sayım son sözdür.");
  console.log("=".repeat(96) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
