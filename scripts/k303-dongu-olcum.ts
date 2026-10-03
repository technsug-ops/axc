import { readFileSync } from "node:fs";

/**
 * K303 Aşama 3b — DENEME VERİTABANINDA ölçüm (salt okuma, hiçbir şey yazmaz).
 *     npx tsx scripts/k303-dongu-olcum.ts
 * ⛔ Hedef kilidi: `.env`deki adres selliora_deneme değilse durur.
 * Ölçülen: zamanlanmış iş döngüsü + ortak istemci (bağlamdan) + firma istemcisi
 * (sabit firma) + komut satırı firma seçimi, aynı satış sayısını veriyor mu.
 */
async function main() {
  const env = readFileSync(".env", "utf8");
  const adres = /^DATABASE_URL="?([^"\r\n]+)"?/m.exec(env)?.[1] ?? "";
  if (!/\/selliora_deneme(\?|$)/.test(adres)) {
    console.log("⛔ HEDEF selliora_deneme DEĞİL — durduruldu.");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = adres;
  const { prisma, sistemPrisma } = await import("../src/lib/prisma");
  const { zamanlanmisIsDongusu, aktifFirmalariOku } = await import("../src/lib/firma-dongusu");
  const { firmaIstemcisi } = await import("../src/lib/firma-istemcisi");
  const { betikFirmasi } = await import("./betik-firmasi");

  const firmalar = await aktifFirmalariOku();
  console.log("aktif firmalar:", firmalar.map((f) => `${f.code} · ${f.name}`).join(" | "));
  // SISTEM: ölçüm — süzgeçsiz toplam, firma başına kıyas için.
  const toplam = await sistemPrisma.sale.count();
  const firmaBasina = await sistemPrisma.sale.groupBy({ by: ["companyId"], _count: { _all: true } });
  console.log("süzgeçsiz satış toplamı:", toplam, "· firma başına:", JSON.stringify(firmaBasina.map((g) => [g.companyId, g._count._all])));

  let baglamsizHata = "";
  try {
    await prisma.sale.count();
  } catch (e) {
    baglamsizHata = e instanceof Error ? e.message : String(e);
  }
  console.log("bağlamsız ortak istemci:", baglamsizHata.startsWith("FIRMA_BAGLAMI_YOK") ? "HATA verdi ✓" : `HATA VERMEDİ ⛔ (${baglamsizHata})`);

  const dongu = await zamanlanmisIsDongusu({ kanalAnahtariGerekir: false }, async (companyId) => {
    const ortak = await prisma.sale.count();
    const fi = firmaIstemcisi(adres, companyId);
    const sabit = await fi.sale.count();
    await fi.$disconnect();
    return { ortak, sabit };
  });
  console.log("döngü (anahtar istemeyen):", JSON.stringify(dongu));
  const anahtarli = await zamanlanmisIsDongusu({ kanalAnahtariGerekir: true }, async () => prisma.sale.count());
  console.log("döngü (anahtar isteyen):", JSON.stringify(anahtarli));

  const secilen = await betikFirmasi(adres);
  console.log("komut satırı firması (argümansız):", secilen);
  process.argv.push("--firma=YOK_BOYLE_FIRMA");
  try {
    await betikFirmasi(adres);
    console.log("yanlış --firma: HATA VERMEDİ ⛔");
  } catch (e) {
    console.log("yanlış --firma:", e instanceof Error ? e.message : e);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
