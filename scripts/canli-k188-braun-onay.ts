/** BETIK SINIFI: TEK_SEFERLIK — K188-② adim 2, satis 4873413946 onayi. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const YAZ = process.argv.includes("--yaz");
class Geri extends Error {}
async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { onayCekirdegi } = await import("../src/lib/onay-cekirdegi");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const { acikPartiler } = await import("../src/lib/stok");

  const s = await prisma.sale.findFirst({ where: { code: "4873413946" },
    select: { id: true, onaylandiAt: true, items: { select: { variantId: true } } } });
  if (!s) { console.log("⛔ SATIS YOK"); return; }
  if (s.onaylandiAt) { console.log("⛔ ZATEN ONAYLI — atlandi"); return; }
  const vId = s.items[0].variantId;
  const once = await prisma.stockMovement.aggregate({ where: { variantId: vId }, _sum: { quantityDelta: true } });
  console.log(`ADIM · BRAUN ONAYI  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   ledger ONCE ${once._sum.quantityDelta ?? 0}`);
  let sonuc: unknown = null;
  try {
    await prisma.$transaction(async (tx) => {
      /** ⚠ ISRAR YOK — bu varyantta sayim damgasi hic olmadigi icin kapi
       *  zaten SERBEST. Israr gecirmek, gerekmeyen bir istisna yazmak olurdu. */
      sonuc = await onayCekirdegi(tx, { saleId: s.id, secimler: {}, otomatik: false });
      console.log(`   cekirdek: ${JSON.stringify(sonuc)}`);
      if ((sonuc as { tamam?: boolean }).tamam !== true) throw new Geri("cekirdek TAMAM donmedi");
      if (!YAZ) throw new Geri("KURU KOSUM — geri sariliyor");
    }, { timeout: 120000 });
  } catch (e) {
    if (e instanceof Geri) { console.log(`   ↩ GERI SARILDI: ${e.message}`); await prisma.$disconnect(); return; }
    throw e;
  }
  await satisKarTazele(s.id, prisma);
  const sonra = await prisma.stockMovement.aggregate({ where: { variantId: vId }, _sum: { quantityDelta: true } });
  const p = await acikPartiler(prisma, vId);
  const d = await prisma.sale.findUnique({ where: { id: s.id },
    select: { profitStatus: true, net1Amount: true, net2Amount: true } });
  const istisna = await prisma.auditLog.count({ where: { action: "SAYIM_KORUMASI_ISTISNASI", targetId: s.id } });
  console.log(`   ledger SONRA ${sonra._sum.quantityDelta ?? 0} · FIFO ${p.reduce((t,x)=>t+x.kalanAdet,0)}  (beklenen 0/0)`);
  console.log(`   durum ${d?.profitStatus} · NET-1 ${d?.net1Amount} · NET-2 ${d?.net2Amount}`);
  console.log(`   sayim istisnasi yazildi mi: ${istisna} (beklenen 0 — kapi zaten serbestti)`);
  await prisma.$disconnect();
}
void main();
