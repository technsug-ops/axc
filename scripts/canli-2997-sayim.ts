/** BETIK SINIFI: TEK_SEFERLIK — 29.08 tek varyant sayim duzeltmesi, `sayim-2997-20260829` koduna kilitli. */
/** SAYIM KORUMASI YOK: bu betik SAYIMIN KENDISI — korunacak damgayi o yaziyor. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  axcali2997 (OYUNEN88141740) — TEK SATIRLIK SAYIM DÜZELTMESİ
 * ----------------------------------------------------------------------------
 *      npm run canli:2997-sayim            → KURU KOŞUM
 *      npm run canli:2997-sayim -- --yaz   → yazar
 *      npm run canli:2997-sayim -- --geri  → geri alır
 *
 *  ⭐ HALİL: _"Cuma sayımda 4 vardı, bugün sabah 1 sipariş girdim → 3
 *  kalmalı. Sonra 3 tane daha sattım ama o siparişleri henüz girmedim."_
 *
 *  ⚠ NİYE 207'LİK KÜMEYE GİRMEDİ: sayım dosyasında bu ürünün satırı VAR
 *  ama `Olması gereken Stok` sütunu BOŞ. Boş sütun "sayılmadı" demektir ve
 *  betik onu bilerek atlar — uydurmamak için.
 *
 *  ⚠ ÖLÇÜLDÜ, VARSAYILMADI: yazımdan önce fark tam **−3** çıktı.
 *  Başka bir sayı çıksaydı yazılmayacaktı.
 * ============================================================================
 */

const SKU = "OYUNEN88141740";
const HEDEF = 3;
const KOD = "sayim-2997-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { acikPartiler, fifoDagit, gunSonu } = await import("../src/lib/stok");

  console.log("\n" + "=".repeat(96));
  console.log("axcali2997 SAYIM DÜZELTMESİ — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"));
  console.log("=".repeat(96));

  const v = await p.productVariant.findFirst({
    where: { sku: SKU }, select: { id: true, companySku: true } });
  if (!v) { console.log("\n⛔ VARYANT YOK\n"); await p.$disconnect(); return; }

  if (GERI) {
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: KOD } }, select: { id: true } });
    await p.stockMovement.deleteMany({ where: { id: { in: hh.map((x) => x.id) } } });
    console.log("\n   ⭐ silinen: " + hh.length + "\n");
    await p.$disconnect();
    return;
  }

  const once = await p.stockMovement.aggregate({
    where: { variantId: v.id }, _sum: { quantityDelta: true } });
  const mevcut = once._sum.quantityDelta ?? 0;
  const fark = HEDEF - mevcut;
  console.log("\n   firma SKU " + v.companySku + " · sistem " + mevcut +
    " · Halil " + HEDEF + " · ⭐ FARK " + fark);

  /** ⚠ ÖLÇÜLEN FARK BEKLENENDEN BAŞKAYSA YAZILMAZ. */
  if (fark !== -3) {
    console.log("\n⛔ BEKLENEN −3 DEĞİL (" + fark + ") — YAZILMADI.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }
  const an = new Date(); an.setUTCHours(0, 0, 0, 0);
  const partiler = await acikPartiler(p, v.id, gunSonu(an));
  const d = fifoDagit(partiler, Math.abs(fark));
  /** ⚠ Yetersizlik ÖNCE elenir — `dagitim` yalnız yeterli dalda vardır. */
  if (!d.yeterliMi) {
    console.log("   ⛔ FIFO YETMEDİ (mevcut " + d.mevcut + ") — YAZILMADI.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("   FIFO: yeterli ✓ · dağıtım " + d.dagitim.length + " parti");
  for (const x of d.dagitim) {
    console.log("     " + x.adet + " adet · birim ₺" +
      (x.parti.birimMaliyet === null ? "—" : Number(x.parti.birimMaliyet).toFixed(2)));
  }

  if (!YAZ) {
    console.log("\n   KURU KOŞUM — yazılmadı. Yazmak için: -- --yaz\n");
    await p.$disconnect(); return;
  }

  for (const x of d.dagitim) {
    await p.stockMovement.create({
      data: {
        variantId: v.id, type: "COUNT_CORRECTION", quantityDelta: -x.adet,
        occurredAt: an, sourceMovementId: x.parti.hareketId,
        unitCostAmount: x.parti.birimMaliyet === null ? null : String(x.parti.birimMaliyet),
        unitCostCurrency: x.parti.birimMaliyet === null ? null : "TRY",
        note: KOD + " · Halil sayimi 29.08: 4 adet - 1 satis = 3. Sayim " +
          "dosyasinda 'Olmasi gereken' bos oldugu icin 207'lik kumeye girmemisti.",
      },
    });
  }
  const sonra = await p.stockMovement.aggregate({
    where: { variantId: v.id }, _sum: { quantityDelta: true } });
  console.log("\n   ⭐ SONRA: " + (sonra._sum.quantityDelta ?? 0) +
    "   (beklenen " + HEDEF + ")" +
    ((sonra._sum.quantityDelta ?? 0) === HEDEF ? "   ✓" : "   ⛔"));

  await p.auditLog.create({
    data: {
      action: "TEK_VARYANT_SAYIM_DUZELTMESI", targetType: "StockMovement",
      detail: JSON.stringify({
        kod: KOD, sku: SKU, firmaSku: v.companySku,
        halilBeyani: "Cuma sayimda 4 vardi, bugun sabah 1 siparis girdim → 3 kalmali. Sonra 3 tane daha sattim ama o siparisleri henuz girmedim.",
        oncekiStok: mevcut, hedef: HEDEF, fark,
        nedenKumeyeGirmedi: "Sayim dosyasinda satiri VAR ama 'Olmasi gereken Stok' sutunu BOS; bos sutun 'sayilmadi' demektir ve betik onu bilerek atlar.",
        acikIs: "Halil'in henuz girmedigi 3 satis var; girildiginde stok 0 olacak — dogru davranis.",
        geriAlmaOlcutu: "note icinde '" + KOD + "' gecen hareketler.",
      }),
    },
  });
  console.log("   ✓ AuditLog: TEK_VARYANT_SAYIM_DUZELTMESI\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
