import "dotenv/config";

/**
 * ============================================================================
 *  PAKET BAŞLANGIÇ DAĞILIMI (K303 ②, 06.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run paket:baslangic            → KURU KOŞUM (ne yapacağını yazar)
 *      npm run paket:baslangic -- --yaz   → yazar
 *
 *  Tekrar koşulabilir: yalnız EKSİK paketleri açar (ada göre) ve yalnız
 *  PAKETSİZ firmaları bağlar. Var olan paket içeriğine DOKUNMAZ (içerik
 *  veridir, süper admin ekrandan yönetir).
 *
 *  ⚠ Paketsiz firma → Individuel + BÜTÜN özellikler (kullanıcı kararı
 *  06.10.2026'nın sonucu): Premium'a bağlansaydı Finansman'ı kaybederdi.
 *  Hiçbir firma bu betik yüzünden ekran kaybetmez.
 * ============================================================================
 */

async function main() {
  const yaz = process.argv.includes("--yaz");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const { BASLANGIC_PAKETLERI, OZELLIKLER } = await import("../src/lib/paket/ozellikler");

  console.log(`\nPAKET BAŞLANGICI — ${yaz ? "YAZIM" : "KURU KOŞUM (--yaz ile yazar)"}\n`);
  // SISTEM: var olan paketler.
  const varOlan = new Set((await sistemPrisma.paket.findMany({ select: { ad: true } })).map((p) => p.ad));
  for (const p of BASLANGIC_PAKETLERI) {
    if (varOlan.has(p.ad)) { console.log(`  =  ${p.ad} zaten var — dokunulmadı`); continue; }
    console.log(`  +  ${p.ad} açılacak (${p.firmayaOzel ? "firmaya özel" : `${p.ozellikler.length} özellik`})`);
    if (yaz) {
      // SISTEM: başlangıç paketi.
      await sistemPrisma.paket.create({ data: { ad: p.ad, sira: p.sira, firmayaOzel: p.firmayaOzel, ozellikler: { create: p.ozellikler.map((ozellik) => ({ ozellik })) } } });
    }
  }
  // SISTEM: paketsiz firmalar.
  const paketsiz = await sistemPrisma.company.findMany({ where: { paketId: null }, select: { id: true, name: true, code: true } });
  // SISTEM: Individuel paketi (kuru koşumda henüz olmayabilir).
  const ozel = await sistemPrisma.paket.findFirst({ where: { firmayaOzel: true }, orderBy: { sira: "asc" }, select: { id: true, ad: true } });
  for (const f of paketsiz) {
    console.log(`  →  ${f.name} (${f.code}) → ${ozel?.ad ?? "Individuel"} + ${OZELLIKLER.length} özelliğin hepsi`);
    if (yaz) {
      if (!ozel) throw new Error("firmaya özel paket bulunamadı");
      // SISTEM: bağ + seçim + iz aynı işlemde.
      await sistemPrisma.$transaction([
        // SISTEM: firmanın paketi.
        sistemPrisma.company.update({ where: { id: f.id }, data: { paketId: ozel.id } }),
        // SISTEM: bütün özellikler.
        sistemPrisma.firmaOzelligi.createMany({ data: OZELLIKLER.map((ozellik) => ({ firmaId: f.id, ozellik })), skipDuplicates: true }),
        // SISTEM: iz.
        sistemPrisma.auditLog.create({ data: { action: "FIRMA_PAKETI_DEGISTI", targetType: "Company", targetId: f.id, userId: null, companyId: null, detail: JSON.stringify({ once: null, yeni: ozel.ad, kaynak: "paket:baslangic", acilan: OZELLIKLER }) } }),
      ]);
    }
  }
  if (paketsiz.length === 0) console.log("  =  paketsiz firma yok");
  console.log("");
  await sistemPrisma.$disconnect();
}

main().catch((e) => { console.error("\nÇÖKTÜ:", e); process.exit(1); });
