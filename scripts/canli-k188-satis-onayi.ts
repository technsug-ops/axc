/** BETIK SINIFI: TEK_SEFERLIK — K188 zinciri adim 3, satis 4707418677 onayi (sayim israriyla). */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const YAZ = process.argv.includes("--yaz");
const KOD = "4707418677";
class Geri extends Error {}

const ISRAR_ACIKLAMASI =
  "K188 zinciri · mimar+Halil onayi 08.09.2026. Gec SALE_OUT 11.08.2026, AYNI zincirde " +
  "gec IADE_IN 17.08.2026 ile dengeleniyor; zincirin net sayim etkisi 0 ve 29.08 sayimiyla " +
  "TUTARLI (rafta 1). Alim ALM-K188-4707418677 (fatura HD22025000334550) yazildi, sayim " +
  "vekili notrlendi. Kapi hareketi tek basina degerlendirdigi icin duraksadi.";

async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { onayCekirdegi } = await import("../src/lib/onay-cekirdegi");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const { acikPartiler } = await import("../src/lib/stok");

  const s = await prisma.sale.findFirst({ where: { code: KOD },
    select: { id: true, onaylandiAt: true, items: { select: { variantId: true } } } });
  if (!s) { console.log("⛔ SATIS YOK"); return; }
  if (s.onaylandiAt) { console.log("⛔ ZATEN ONAYLI — atlandi"); return; }
  const vId = s.items[0].variantId;
  const once = await prisma.stockMovement.aggregate({ where: { variantId: vId }, _sum: { quantityDelta: true } });
  const pOnce = await acikPartiler(prisma, vId);
  console.log(`ADIM 3 · SATIS ONAYI (sayim israri)  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   ledger ONCE ${once._sum.quantityDelta ?? 0} · FIFO acik ${pOnce.reduce((t,x)=>t+x.kalanAdet,0)}`);

  let sonuc: unknown = null;
  try {
    await prisma.$transaction(async (tx) => {
      sonuc = await onayCekirdegi(tx, {
        saleId: s.id, secimler: {}, otomatik: false,
        israr: { onaylandi: true, sebep: "GEC_GIRILEN_SATIS", aciklama: ISRAR_ACIKLAMASI },
      });
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
  const d = await prisma.sale.findUnique({ where: { id: s.id },
    select: { profitStatus: true, net1Amount: true, net2Amount: true } });
  const v = await prisma.productVariant.findUnique({ where: { id: vId }, select: { sayimGecersizAt: true } });
  const iz = await prisma.auditLog.count({ where: { action: "SAYIM_KORUMASI_ISTISNASI", targetId: s.id } });
  console.log(`   ledger SONRA ${sonra._sum.quantityDelta ?? 0}  (beklenen 0)`);
  console.log(`   durum ${d?.profitStatus} · NET-1 ${d?.net1Amount} · NET-2 ${d?.net2Amount}`);
  console.log(`   sayimGecersizAt ${v?.sayimGecersizAt?.toISOString().slice(0,16) ?? "null"} · istisna izi ${iz}`);
  console.log(`   ${(sonra._sum.quantityDelta ?? 0) === 0 && iz === 1 ? "✓ TUTTU" : "⛔ TUTMADI"}`);
  await prisma.$disconnect();
}
void main();
