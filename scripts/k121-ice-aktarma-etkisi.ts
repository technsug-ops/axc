import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * K121 — LİSTİNG SÜZGECİ İÇE AKTARMADA FİİLEN BİR ŞEY DÜŞÜRDÜ MÜ?
 * Salt okuma. BETIK SINIFI: SUREKLI.
 *
 * ⚠ "Düşürebilir" ile "düşürdü" ayrı cümlelerdir. Bugün pasif olan TEK kod
 * `43217`; izlerde o kodun eşleşmeyen kovasına düşüp düşmediği aranıyor.
 * Bulunmazsa fayda İLERİYE dönüktür ve öyle YAZILIR — geçmişe atfedilmez.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK121 — LISTING SUZGECININ ICE AKTARMA ETKISI");
  console.log("=".repeat(70));

  /** ① Bugun pasif olan listing kodlari */
  const pasif = await prisma.channelSku.findMany({
    where: { isActive: false },
    select: { channelSku: true, variant: { select: { sku: true } } },
  });
  console.log(`pasif listing kodu: ${pasif.map((p) => p.channelSku).join(", ") || "(yok)"}`);

  /** ② Ice aktarma izleri — hangi eylemler var */
  const eylemler = await prisma.auditLog.groupBy({
    by: ["action"],
    where: { action: { contains: "ICE_AKTARMA" } },
    _count: { action: true },
  });
  console.log("\nice aktarma izleri:");
  for (const e of eylemler) console.log(`   ${e.action.padEnd(32)} ${e._count.action}`);

  /** ③ Pasif kod izlerin DETAYINDA geciyor mu (eslesmeyen kovasi) */
  for (const p of pasif) {
    const gecen = await prisma.auditLog.findMany({
      where: { detail: { contains: p.channelSku } },
      select: { action: true, createdAt: true, detail: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    console.log(`\n"${p.channelSku}" (→ ${p.variant.sku}) izlerde: ${gecen.length} kayit`);
    for (const g of gecen) {
      const kirpik = g.detail === null ? "" : g.detail.slice(0, 160).replace(/\s+/g, " ");
      console.log(`   ${g.createdAt.toISOString()} · ${g.action}`);
      console.log(`      ${kirpik}`);
    }
  }

  /** ④ O varyanta ait satis/alim var mi — yani kod hic is gordu mu */
  for (const p of pasif) {
    const v = await prisma.productVariant.findFirst({
      where: { sku: p.variant.sku },
      select: {
        id: true,
        _count: { select: { stockMovements: true, saleItems: true, purchaseItems: true } },
      },
    });
    console.log(`\n${p.variant.sku} · hareket ${v?._count.stockMovements} · satis kalemi ${v?._count.saleItems} · alim kalemi ${v?._count.purchaseItems}`);
  }

  await prisma.$disconnect();
}
main();
