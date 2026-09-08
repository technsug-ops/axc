import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * K121c KENAR ÖLÇÜMÜ — `/urunler` ad araması varyant üstünden geçerse
 * VARYANTSIZ bir ürün kaybolur mu? Salt okuma. BETIK SINIFI: SUREKLI.
 *
 * ⚠ Ortak gövde `ProductVariant` koşulu üretiyor; ürün düzeyinde kullanmak
 * için `variants: { some: ... }` ile sarmalanıyor. Bu sarmalama, varyantı
 * OLMAYAN bir ürünü ad aramasından DÜŞÜRÜR. Anayasa "her üründe tam olarak
 * bir isDefault varyant" diyor ama bu UYGULAMA katmanının garantisi —
 * veritabanında doğrulanması gerekir, varsayılması değil.
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const urunToplam = await prisma.product.count();
  const varyantsiz = await prisma.product.count({ where: { variants: { none: {} } } });
  console.log("");
  console.log(`ürün ${urunToplam} · VARYANTSIZ ${varyantsiz}`);
  if (varyantsiz > 0) {
    const ornek = await prisma.product.findMany({
      where: { variants: { none: {} } }, take: 10, select: { name: true },
    });
    for (const u of ornek) console.log("   " + u.name);
    console.log("   ⛔ SARMALAMA BU ÜRÜNLERİ AD ARAMASINDAN DÜŞÜRÜR — doğrudan ad dalı KORUNMALI");
  } else {
    console.log("   ✓ varyantsız ürün yok — sarmalama kimseyi düşürmez");
    console.log("   ⚠ ama bu BUGÜNÜN ölçümü; doğrudan ad dalı ucuz bir emniyettir");
  }
  await prisma.$disconnect();
}
main();
