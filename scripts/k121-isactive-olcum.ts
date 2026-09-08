import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K121 — isActive SÜZGECİ NEREDE, KİMİ ELİYOR (ÖLÇÜM, SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/k121-isactive-olcum.ts
 *
 *  BETIK SINIFI: SUREKLI — rutin koşabilir. Hiçbir yere YAZMAZ.
 *
 *  ⚠ İKİ AYRI SÜZGEÇ VAR VE KARIŞTIRILIYOR:
 *    ① VARYANT düzeyi  — `where: { isActive: true }`, ÇAĞIRANIN kararı
 *    ② LİSTİNG düzeyi  — `channelSkus.some.isActive`, ORTAK GÖVDENİN içinde
 *  Talimat "varyant düzeyi" diyor; ölçüm hangisinin kimi elediğini söyler.
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kodEsdegerleri } = await import("../src/lib/varyant-arama-kurali");

  console.log("");
  console.log("K121 — isActive SÜZGECİ ÖLÇÜMÜ · " + new Date().toISOString());
  console.log("=".repeat(74));

  /* ① TABAN */
  const varyantToplam = await prisma.productVariant.count();
  const varyantPasif = await prisma.productVariant.count({ where: { isActive: false } });
  const listingToplam = await prisma.channelSku.count();
  const listingPasif = await prisma.channelSku.count({ where: { isActive: false } });
  console.log(`① TABAN`);
  console.log(`   varyant  ${varyantToplam} · PASİF ${varyantPasif}`);
  console.log(`   listing  ${listingToplam} · PASİF ${listingPasif}`);

  /* ② PASİF LİSTİNGLER — kodları başka yoldan çözülüyor mu */
  const pasifListingler = await prisma.channelSku.findMany({
    where: { isActive: false },
    select: {
      channelSku: true,
      variantId: true,
      variant: { select: { sku: true, isActive: true } },
    },
  });

  let baskaYoldanCozulen = 0;
  const yalnizPasiften: typeof pasifListingler = [];
  const cakisan: { kod: string; pasifVaryant: string; aktifVaryant: string }[] = [];

  for (const l of pasifListingler) {
    const kodlar = kodEsdegerleri(l.channelSku);
    /** Aynı kod AKTİF bir yoldan (varyant alanı ya da aktif listing) çözülüyor mu? */
    const aktifYol = await prisma.productVariant.findMany({
      where: {
        OR: [
          { barcode: { in: kodlar } },
          { companySku: { in: kodlar } },
          { sku: { in: kodlar } },
          { channelSkus: { some: { channelSku: { in: kodlar }, isActive: true } } },
        ],
      },
      select: { id: true, sku: true },
    });
    if (aktifYol.length > 0) {
      baskaYoldanCozulen++;
      /** ⛔ ÇAKIŞMA: aynı kod BAŞKA bir varyanta da gidiyorsa süzgeci
       *  kaldırmak `findFirst`i belirsiz hâle getirir. */
      for (const a of aktifYol) {
        if (a.id !== l.variantId) {
          cakisan.push({ kod: l.channelSku, pasifVaryant: l.variant.sku, aktifVaryant: a.sku });
        }
      }
    } else {
      yalnizPasiften.push(l);
    }
  }

  console.log("");
  console.log(`② PASİF LİSTİNG KODLARI (${pasifListingler.length})`);
  console.log(`   aktif bir yoldan ZATEN çözülüyor : ${baskaYoldanCozulen}`);
  console.log(`   YALNIZ pasif listingden çözülür  : ${yalnizPasiften.length}  ← süzgeç bunları eliyor`);
  console.log(`   ⛔ ÇAKIŞMA (kod başka varyanta da gidiyor): ${cakisan.length}`);
  for (const c of cakisan.slice(0, 10)) {
    console.log(`      ${c.kod}  pasif→${c.pasifVaryant}  aktif→${c.aktifVaryant}`);
  }

  console.log("");
  console.log("   süzgecin ELEDİĞİ kodlar (ilk 15):");
  for (const l of yalnizPasiften.slice(0, 15)) {
    console.log(
      `      ${l.channelSku.padEnd(22)} → ${l.variant.sku.padEnd(16)} varyant ${l.variant.isActive ? "AKTİF" : "PASİF"}`,
    );
  }

  /* ③ PASİF VARYANTLAR — sayım yolunda kod çözülüyor mu (bugün) */
  const pasifVaryantlar = await prisma.productVariant.findMany({
    where: { isActive: false },
    select: {
      sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true, isActive: true } },
      stockMovements: { select: { quantityDelta: true } },
    },
  });
  console.log("");
  console.log(`③ PASİF VARYANTLAR (${pasifVaryantlar.length}) — sayım yolu bunları BUGÜN çözüyor`);
  for (const v of pasifVaryantlar) {
    const stok = v.stockMovements.reduce((t, m) => t + m.quantityDelta, 0);
    const kodlar = [
      v.barcode ? "barkod" : null,
      v.companySku ? "firmaSKU" : null,
      ...v.channelSkus.map((c) => `kanal:${c.channelSku}${c.isActive ? "" : "(pasif)"}`),
    ].filter(Boolean);
    console.log(`   ${v.sku.padEnd(16)} stok ${String(stok).padStart(4)} · kod: ${kodlar.join(" · ") || "YOK"}`);
  }

  await prisma.$disconnect();
}
main();
