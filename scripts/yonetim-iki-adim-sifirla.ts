import "dotenv/config";

/**
 * ============================================================================
 *  SÜPER ADMİN İKİ ADIMLI GİRİŞİ SIFIRLA — SON ÇARE (K303 ⑤, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/yonetim-iki-adim-sifirla.ts --eposta=<adres>          → KURU KOŞUM
 *      npx tsx scripts/yonetim-iki-adim-sifirla.ts --eposta=<adres> --yaz    → sıfırlar
 *
 *  Telefon da yedek kodlar da kaybolduğunda: yalnız SUNUCUYA/VERİTABANINA
 *  erişimi olan kişi koşabilir (ekranda karşılığı YOK — olsaydı iki adımın
 *  kendisini atlatan bir düğme olurdu). Sonraki girişte kurulum yeniden açılır.
 *  Bütün oturumları da düşürür (oturum sürümü artar) ve iz bırakır.
 *  Yalnız FİRMASIZ süper admin hesabına dokunur.
 * ============================================================================
 */

async function main() {
  const yaz = process.argv.includes("--yaz");
  const eposta = (process.argv.find((a) => a.startsWith("--eposta=")) ?? "").slice("--eposta=".length).trim().toLocaleLowerCase("tr");
  if (!eposta) throw new Error("--eposta=<adres> verilmedi");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { ikiAdimiSifirla } = await import("../src/lib/iki-adim/depo");
  // SISTEM: yalnız firmasız süper admin hesabı.
  const u = await sistemPrisma.user.findFirst({ where: { email: eposta, hesapFirmasiId: null, isSuperAdmin: true }, select: { id: true, totpAcildiAt: true, totpSifreli: true } });
  console.log(`\nİKİ ADIM SIFIRLAMA — ${yaz ? "YAZIM" : "KURU KOŞUM (--yaz ile yazar)"}\n`);
  if (!u) {
    console.log(`  ${eposta}: firmasız süper admin hesabı BULUNAMADI — hiçbir şey yapılmadı.\n`);
    await sistemPrisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log(`  ${eposta}: iki adım ${u.totpAcildiAt ? "AÇIK" : u.totpSifreli ? "kurulumda" : "kurulu değil"} → sıfırlanacak, bütün oturumlar düşecek`);
  if (yaz) {
    await ikiAdimiSifirla(u.id);
    // SISTEM: bütün oturumlar düşer (sürüm artar) + iz.
    await sistemPrisma.$transaction([
      // SISTEM: oturum sürümü.
      sistemPrisma.user.update({ where: { id: u.id }, data: { sessionVersion: { increment: 1 } } }),
      // SISTEM: iz — kim/neden sunucudan.
      sistemPrisma.auditLog.create({ data: { action: "YONETIM_IKI_ADIM_SIFIRLANDI", targetType: "User", targetId: u.id, userId: null, companyId: null, detail: JSON.stringify({ eposta, kaynak: "scripts/yonetim-iki-adim-sifirla.ts" }) } }),
    ]);
    console.log("  → sıfırlandı. Sonraki girişte kurulum ekranı açılır.");
  }
  console.log("");
  await sistemPrisma.$disconnect();
}

main().catch((e) => { console.error("\nÇÖKTÜ:", e); process.exit(1); });
