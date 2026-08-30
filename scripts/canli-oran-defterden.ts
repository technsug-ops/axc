/** BETIK SINIFI: TEK_SEFERLIK — 10559161422 oran yazimi (defterden olculdu), `oran-10559161422-20260830` kodlu. */
/** SAYIM KORUMASI YOK: hicbir stok hareketi yazilmiyor — yalniz `commissionRate` alani. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const KOD = "oran-10559161422-20260830";
const SIPARIS = "10559161422";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const g = (d: Date) => d.toISOString().slice(0, 10);
/**
 * ⭐ ORAN TAHMİN DEĞİL, DEFTERDEN ÖLÇÜLDÜ.
 * Aynı varyant · AYNI GÜN (2025-10-02) · aynı kanal hesabı üç satış:
 *   10559304350 %16 · 10559961102 %16 · 10560425106 %16   (+ 2025-10-25 %16)
 * ⚠ BUGÜNKÜ `ChannelSku` ORANI KULLANILMADI — o bugünün penceresi ve
 * haftalık değişiyor. Kapsayan tarife penceresi de YOK (yüklü 3 pencere
 * 2026-08). Ölçüt: o GÜN fiilen yazılmış oran.
 * _(Anayasa: "kaynak önceliği — kendi defterimiz" ve "aynı veri, farklı
 * soruya farklı pencereden bakar".)_
 */
async function main() {
  const c = canliYapilandirma(); if (!c.tamam) { process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const s = (await p.sale.findFirst({ where: { code: SIPARIS },
    select: { id: true, soldAt: true, profitStatus: true, channelAccountId: true,
      items: { select: { id: true, quantity: true, commissionRate: true,
        variantId: true, variant: { select: { sku: true } } } } } }))!;
  console.log("\n" + "=".repeat(84));
  console.log("ORAN YAZIMI — " + (GERI ? "GERİ ALMA" : YAZ ? "YAZIM" : "KURU KOŞUM"));
  console.log("=".repeat(84));
  if (GERI) {
    for (const i of s.items)
      await p.saleItem.update({ where: { id: i.id }, data: { commissionRate: null } });
    const { satisKarTazele } = await import("../src/lib/kar-yeniden");
    await satisKarTazele(s.id);
    console.log("\n   ⭐ oran boşaltılan kalem " + s.items.length + "\n");
    await p.$disconnect(); return;
  }
  /** ⭐ ÖLÇÜT: AYNI varyant · AYNI GÜN · AYNI hesap, oranı yazılı kalemler. */
  const gunBas = new Date(s.soldAt); gunBas.setUTCHours(0,0,0,0);
  const gunSon = new Date(gunBas); gunSon.setUTCDate(gunSon.getUTCDate()+1);
  const komsu = await p.saleItem.findMany({
    where: { variantId: s.items[0].variantId, commissionRate: { not: null },
      sale: { iptalTarihi: null, channelAccountId: s.channelAccountId,
        soldAt: { gte: gunBas, lt: gunSon }, code: { not: SIPARIS } } },
    select: { commissionRate: true, sale: { select: { code: true } } } });
  console.log("\n① AYNI GÜN · AYNI VARYANT · AYNI HESAP: " + komsu.length + " kalem");
  for (const k of komsu) console.log("     " + k.sale.code + "  " + k.commissionRate + "%");
  const oranlar = [...new Set(komsu.map(x => String(x.commissionRate)))];
  console.log("   tekil oran: " + oranlar.join(", "));
  if (komsu.length === 0 || oranlar.length !== 1) {
    console.log("\n⛔ TEK ORAN ÇIKMADI — YAZILMAZ. Hüküm verilemez.\n");
    await p.$disconnect(); process.exitCode = 1; return;
  }
  const oran = Number(oranlar[0]);
  console.log("\n② PLAN · satış " + SIPARIS + " (" + g(s.soldAt) + ") · durum " +
    s.profitStatus);
  for (const i of s.items) console.log("     " + i.variant.sku + " adet " + i.quantity +
    " · oran " + (i.commissionRate ?? "⛔ YOK") + " → " + oran + "%");
  if (!YAZ) { console.log("\n   KURU KOŞUM — yazılmadı.\n"); await p.$disconnect(); return; }
  for (const i of s.items)
    await p.saleItem.update({ where: { id: i.id }, data: { commissionRate: oran } });
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const ok = await satisKarTazele(s.id);
  const sonra = await p.sale.findFirst({ where: { id: s.id },
    select: { profitStatus: true, net1Amount: true, net2Amount: true } });
  console.log("\n③ YAZILDI · kâr tazelendi " + ok);
  console.log("   durum " + s.profitStatus + " → " + sonra?.profitStatus +
    " · NET-1 ₺" + (sonra?.net1Amount ?? "—") + " · NET-2 ₺" + (sonra?.net2Amount ?? "—"));
  await p.auditLog.create({ data: { action: "ORAN_DEFTERDEN_YAZILDI",
    targetType: "Sale", targetId: s.id,
    detail: JSON.stringify({ kod: KOD, siparis: SIPARIS, oran,
      olcut: "Ayni varyant, AYNI GUN (" + g(s.soldAt) + "), ayni kanal hesabi, " +
        "orani yazili " + komsu.length + " kalem; hepsi " + oran + "%.",
      kullanilmayanKaynak: "Bugunku ChannelSku orani KULLANILMADI — bugunun " +
        "penceresi, haftalik degisiyor. Kapsayan tarife penceresi de YOK.",
      komsular: komsu.map(k => k.sale.code) }) } });
  console.log("   ✓ AuditLog: ORAN_DEFTERDEN_YAZILDI\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
