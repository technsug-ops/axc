import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K121b KURU KOŞUM — LİSTİNG SÜZGECİ KALKINCA NE DEĞİŞİYOR (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:k121-kuru
 *
 *  BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 *  ⚠ İKİ KOŞUL DA AYNI CANLI VERİDE KOŞULUYOR: eski (süzgeçli) ve yeni
 *  (süzgeçsiz). Fark "olabilir" değil, ÖLÇÜLMÜŞ farktır.
 * ============================================================================
 */

const KOD = "43217";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("⛔", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kodKosulu, kodEsdegerleri } = await import("../src/lib/varyant-arama-kurali");

  const kodlar = kodEsdegerleri(KOD);
  /** ESKİ koşul elle kuruluyor — kaldırılan satırın birebir aynısı. */
  const eskiKosul = [
    { barcode: { in: kodlar } },
    { companySku: { in: kodlar } },
    { sku: { in: kodlar } },
    { channelSkus: { some: { channelSku: { in: kodlar }, isActive: true } } },
  ];
  const yeniKosul = kodKosulu(KOD);

  console.log("");
  console.log("K121b KURU KOŞUM · " + new Date().toISOString());
  console.log("=".repeat(74));

  /* ① SAYIM YOLU — varyant süzgeci YOK */
  const sayimEski = await prisma.productVariant.findFirst({
    where: { OR: eskiKosul }, select: { sku: true, isActive: true },
  });
  const sayimYeni = await prisma.productVariant.findFirst({
    where: { OR: yeniKosul }, select: { sku: true, isActive: true },
  });
  console.log(`① SAYIM YOLU (/okut · varyant süzgeci YOK) — kod "${KOD}"`);
  console.log(`   ÖNCE : ${sayimEski ? sayimEski.sku : "BULUNAMADI ⛔"}`);
  console.log(`   SONRA: ${sayimYeni ? sayimYeni.sku + (sayimYeni.isActive ? " (aktif)" : " (PASİF — ama rafta)") : "BULUNAMADI"}`);
  console.log(`   → ${!sayimEski && sayimYeni ? "KAZANIM: okutulan kod artık çözülüyor ✓" : "değişiklik yok"}`);

  /* ② VARYANT SÜZGECİ KOYAN ÇAĞIRANLAR — hiçbir şey değişmemeli */
  const suzgecliEski = await prisma.productVariant.findMany({
    where: { isActive: true, OR: eskiKosul }, select: { sku: true },
  });
  const suzgecliYeni = await prisma.productVariant.findMany({
    where: { isActive: true, OR: yeniKosul }, select: { sku: true },
  });
  console.log("");
  console.log("② VARYANT SÜZGECİ KOYAN 5 ÇAĞIRAN (okut · yerleştir · kart · zemin · varyant-arama)");
  console.log(`   ÖNCE ${suzgecliEski.length} sonuç · SONRA ${suzgecliYeni.length} sonuç`);
  console.log(`   → ${suzgecliEski.length === suzgecliYeni.length ? "DEĞİŞİKLİK YOK ✓" : "⛔ DEĞİŞTİ — DUR"}`);

  /* ③ BÜTÜN KATALOG — süzgeç kalkınca kaç kod farklı cevap veriyor */
  const tumListingler = await prisma.channelSku.findMany({
    select: { channelSku: true, isActive: true, variantId: true },
  });
  let farkli = 0;
  const farklilar: string[] = [];
  for (const l of tumListingler) {
    if (l.isActive) continue;
    const e = await prisma.productVariant.count({
      where: { OR: [
        { barcode: { in: kodEsdegerleri(l.channelSku) } },
        { companySku: { in: kodEsdegerleri(l.channelSku) } },
        { sku: { in: kodEsdegerleri(l.channelSku) } },
        { channelSkus: { some: { channelSku: { in: kodEsdegerleri(l.channelSku) }, isActive: true } } },
      ] },
    });
    const s = await prisma.productVariant.count({ where: { OR: kodKosulu(l.channelSku) } });
    if (e !== s) { farkli++; farklilar.push(`${l.channelSku}: ${e} → ${s}`); }
  }
  console.log("");
  console.log(`③ BÜTÜN KATALOG (${tumListingler.length} listing) — farklı cevap veren kod: ${farkli}`);
  for (const f of farklilar) console.log("   " + f);

  /* ④ ÇAKIŞMA — bir kod birden çok varyanta gidiyor mu (SONRA hâlinde) */
  let cakisan = 0;
  for (const l of tumListingler) {
    if (l.isActive) continue;
    const n = await prisma.productVariant.count({ where: { OR: kodKosulu(l.channelSku) } });
    if (n > 1) cakisan++;
  }
  console.log("");
  console.log(`④ ÇAKIŞMA (kod → birden çok varyant, SONRA hâli): ${cakisan}`);
  console.log(`   → ${cakisan === 0 ? "findFirst hiçbir yerde belirsizleşmiyor ✓" : "⛔ BELİRSİZ — DUR"}`);

  await prisma.$disconnect();
}
main();
