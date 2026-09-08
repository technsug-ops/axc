import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * 26.08.2026 vakasının KÖK SEBEBİ hangisiydi — eksik ALAN mı, isActive
 * SÜZGECİ mi? Salt okuma. BETIK SINIFI: SUREKLI.
 *
 * ⚠ Ayırt edici soru: `194645027819` kodunu taşıyan listing AKTİF mi?
 * Aktifse süzgeç o satırı hiç elemiyordu ve kayıp başka bir sebeptendi.
 */
const KOD = "194645027819";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kodEsdegerleri } = await import("../src/lib/varyant-arama-kurali");

  const kodlar = kodEsdegerleri(KOD);
  console.log(`\n26.08 VAKASI — ${KOD} (esdegerler: ${kodlar.join(", ")})`);
  console.log("=".repeat(70));

  const listingler = await prisma.channelSku.findMany({
    where: { channelSku: { in: kodlar } },
    select: {
      channelSku: true, isActive: true,
      variant: { select: { sku: true, isActive: true, barcode: true } },
      channelAccount: { select: { name: true } },
    },
  });
  console.log(`listing kaydi: ${listingler.length}`);
  for (const l of listingler) {
    console.log(
      `   ${l.channelSku} · listing ${l.isActive ? "AKTIF" : "PASIF"} · varyant ${l.variant.sku} ${l.variant.isActive ? "AKTIF" : "PASIF"} · hesap ${l.channelAccount.name}`,
    );
    console.log(`      varyantin kendi barkodu: ${l.variant.barcode ?? "(bos)"}`);
  }

  const varyantAlani = await prisma.productVariant.findMany({
    where: { OR: [{ barcode: { in: kodlar } }, { companySku: { in: kodlar } }, { sku: { in: kodlar } }] },
    select: { sku: true },
  });
  console.log(`\nvaryant ALANLARINDA (barkod/firmaSKU/SKU) bulunan: ${varyantAlani.length}`);

  console.log("\nHUKUM:");
  const aktifListing = listingler.some((l) => l.isActive);
  if (listingler.length > 0 && aktifListing) {
    console.log("   ⛔ isActive suzgeci bu satiri ELEMIYORDU — listing AKTIF.");
    console.log("      26.08 kaybinin sebebi ALAN EKSIKLIGI (channelSku hic aranmiyordu).");
  } else if (listingler.length > 0) {
    console.log("   ✓ listing PASIF — suzgec bu satiri eliyordu, atif dogru.");
  } else {
    console.log("   ? bu kod bugun hicbir listingde yok — hukum kurulamaz.");
  }
  await prisma.$disconnect();
}
main();
