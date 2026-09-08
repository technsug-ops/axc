/** BETIK SINIFI: TEK_SEFERLIK — K188 zinciri adim 4, satis 4707418677 iadesi. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const YAZ = process.argv.includes("--yaz");
const KOD = "4707418677";

const NOT =
  "K188 zinciri adim 4 · mimar+Halil onayi 08.09.2026. Musteri aldi ve iade etti (NORMAL). " +
  "Tarih 17.08.2026, kanalin kendi kaydindan (HB lastStatusUpdateDate; talep o an acildi). " +
  "⚠ KANAL TALEBI HALA ACIK (ClaimCreated, 08.09 itibariyla) — mal 29.08 fiziksel sayiminda " +
  "rafta gorulduğu icin defter iadeyi TAMAMLANMIS yaziyor. Bu, kanalla BILINCLI bir ayrisma. " +
  "TETIKLEYICI: HB talebi kapandiginda sonuc defterle karsilastirilir; RED cikarsa bu iade " +
  "kaydi geri alinir, mal rafta + satis gecerli olur.";

const ISRAR =
  "Iade 17.08.2026, varyantin sayim damgasi 29.08.2026 — yani sayimdan ONCEYE yazilan bir " +
  "ARTIRAN kayit. Mal zaten 29.08 sayiminda RAFTA sayildi; bu iade o sayimi CELISMIYOR, " +
  "aciklıyor. Ayni zincirde 11.08 SALE_OUT ile dengeleniyor, net sayim etkisi 0.";

async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { iadeKaydet } = await import("../src/lib/iade");

  const s = await prisma.sale.findFirst({ where: { code: KOD },
    select: { id: true, net1Amount: true, net2Amount: true,
      returns: { select: { id: true } },
      items: { select: { id: true, quantity: true, variantId: true } } } });
  if (!s) { console.log("⛔ SATIS YOK"); return; }
  if (s.returns.length > 0) { console.log("⛔ IADE ZATEN VAR — atlandi"); return; }
  const k = s.items[0];
  const once = await prisma.stockMovement.aggregate({ where: { variantId: k.variantId }, _sum: { quantityDelta: true } });
  console.log(`ADIM 4 · IADE (NORMAL, 17.08.2026)  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   ledger ONCE ${once._sum.quantityDelta ?? 0} · NET-1 ${s.net1Amount} · NET-2 ${s.net2Amount}`);
  console.log(`   kalem ${k.id.slice(0,8)} · adet ${k.quantity} · iade 1 · saglam 1`);
  if (!YAZ) { console.log("\n   ÖNİZLEME — yazılmadı. Yazmak için: -- --yaz"); await prisma.$disconnect(); return; }

  const iadeId = await iadeKaydet({
    saleId: s.id, code: null, returnType: "NORMAL",
    occurredAt: new Date("2026-08-17T14:43:23.000Z"),
    note: NOT, userId: null, degisimTeslimTarihi: null,
    iadeKargosu: null, yenidenGonderimKargosu: null, ceza: null, cezaNotu: null,
    sayimIsrari: { onaylandi: true, sebep: "DIGER", aciklama: ISRAR },
    kalemler: [{ saleItemId: k.id, iadeAdedi: 1, saglamAdet: 1, hasarliAdet: 0,
      hasarNotu: null, locationId: null, exchangeVariantId: null }],
  });
  console.log(`   ✓ iade yazildi: ${iadeId.slice(0,10)}`);

  const sonra = await prisma.stockMovement.aggregate({ where: { variantId: k.variantId }, _sum: { quantityDelta: true } });
  const d = await prisma.sale.findUnique({ where: { id: s.id },
    select: { net1Amount: true, net2Amount: true, profitStatus: true } });
  console.log(`   ledger SONRA ${sonra._sum.quantityDelta ?? 0}  (beklenen 1 = fiziksel 1)`);
  console.log(`   durum ${d?.profitStatus} · NET-1 ${d?.net1Amount} · NET-2 ${d?.net2Amount}`);
  console.log(`   ${(sonra._sum.quantityDelta ?? 0) === 1 ? "✓ TUTTU" : "⛔ TUTMADI"}`);
  await prisma.$disconnect();
}
void main();
