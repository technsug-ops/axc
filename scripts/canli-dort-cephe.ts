import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DÖRT CEPHE — ALIM · SATIŞ · İADE · KARGO (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:dort-cephe
 *
 *  ⭐ Halil'in sorusu: "alımlar satışlar iadeler kargolar düzeldi mi?"
 *  Cevap TAHMİN edilmez, DÖRDÜ AYRI ölçülür — ve her cephede
 *  "düzelen" ile "duran" AYRI sayılır.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const t2 = (x: number) => x.toFixed(2).padStart(15);
const yuzde = (a: number, b: number) => b === 0 ? "—" : (a / b * 100).toFixed(1) + "%";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("DÖRT CEPHE — BUGÜNKÜ HÂL (salt okuma)");
  console.log("=".repeat(100));

  // ══ ① ALIMLAR ═════════════════════════════════════════════════════════
  console.log("\n" + "-".repeat(100));
  console.log("① ALIMLAR");
  console.log("-".repeat(100));
  const alimSayi = await p.purchase.count();
  const alimKalem = await p.purchaseItem.count();
  const girisler = await p.stockMovement.findMany({
    where: { quantityDelta: { gt: 0 } },
    select: { id: true, quantityDelta: true, unitCostAmount: true },
  });
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 } },
    select: { quantityDelta: true, sourceMovementId: true },
  });
  const tuketim = new Map<string, number>();
  for (const x of cikislar) {
    if (x.sourceMovementId) {
      tuketim.set(x.sourceMovementId, (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
    }
  }
  const acikAdet = girisler.reduce((t, g) => t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)), 0);
  const acikDeger = girisler.reduce((t, g) =>
    t + (g.quantityDelta - (tuketim.get(g.id) ?? 0)) *
    Number((g.unitCostAmount ?? 0).toString()), 0);
  const ledgerNet = girisler.reduce((t, g) => t + g.quantityDelta, 0) +
    cikislar.reduce((t, x) => t + x.quantityDelta, 0);
  console.log("   alım " + alimSayi + " · kalem " + alimKalem);
  console.log("   stok — ledger neti " + ledgerNet + " adet   ·   FIFO açık parti " +
    acikAdet + " adet");
  console.log("   ⭐ İKİ DEFTER " + (ledgerNet === acikAdet ? "TUTUYOR ✓" :
    "AYRIŞMIŞ ⛔ fark " + (ledgerNet - acikAdet)));
  console.log("   FIFO açık parti değeri (ödenen, KDV dahil): " + t2(acikDeger));
  const cikisBagsiz = cikislar.filter((x) => x.sourceMovementId === null).length;
  console.log("   partisiz çıkış hareketi: " + cikisBagsiz +
    (cikisBagsiz === 0 ? "  ✓" : "  ⛔"));

  // ══ ② SATIŞLAR ════════════════════════════════════════════════════════
  console.log("\n" + "-".repeat(100));
  console.log("② SATIŞLAR");
  console.log("-".repeat(100));
  const satisSayi = await p.sale.count();
  const iptalSayi = await p.sale.count({ where: { iptalTarihi: { not: null } } });
  const kalemler = await p.saleItem.groupBy({
    by: ["profitStatus"],
    _count: { _all: true },
    where: { sale: { iptalTarihi: null } },
  });
  const oransiz = await p.saleItem.count({
    where: { sale: { iptalTarihi: null }, commissionRate: null },
  });
  const maliyetsiz = await p.saleItem.count({
    where: { sale: { iptalTarihi: null }, stockMovements: { none: {} } },
  });
  const netYazili = await p.sale.count({
    where: { iptalTarihi: null, net2Amount: { not: null } },
  });
  const hesaplanan = await p.sale.count({
    where: { iptalTarihi: null, profitStatus: "CALCULATED" },
  });
  console.log("   satış " + satisSayi + " · iptal " + iptalSayi +
    " · geçerli " + (satisSayi - iptalSayi));
  console.log("   kalem kâr durumu (iptalsiz):");
  for (const g of kalemler.sort((a, b) => b._count._all - a._count._all)) {
    console.log("     " + String(g.profitStatus).padEnd(18) + String(g._count._all).padStart(6));
  }
  console.log("   ⛔ komisyon oranı BOŞ kalem : " + oransiz);
  console.log("   ⛔ stok hareketi OLMAYAN kalem: " + maliyetsiz +
    "   ← maliyet bağı kurulamayanlar");
  console.log("   ⭐ NET-2 YAZILI satış: " + netYazili + " / CALCULATED " + hesaplanan +
    (netYazili === hesaplanan ? "   ✓ birebir" : "   ⛔ AYRIŞMA " + (netYazili - hesaplanan)));

  // ══ ③ İADELER ═════════════════════════════════════════════════════════
  console.log("\n" + "-".repeat(100));
  console.log("③ İADELER");
  console.log("-".repeat(100));
  const iadeSayi = await p.return.count();
  const iadeKalem = await p.returnItem.count();
  const bildirim = await p.returnNotice.count();
  const tazmin = await p.compensation.count();
  const iadeTur = await p.return.groupBy({ by: ["returnType"], _count: { _all: true } });
  console.log("   Return " + iadeSayi + " · ReturnItem " + iadeKalem +
    " · ReturnNotice " + bildirim + " · Compensation " + tazmin);
  console.log("   tür dağılımı: " +
    (iadeTur.map((g) => g.returnType + "=" + g._count._all).join(" · ") || "—"));
  console.log("\n   ⛔ AÇIK: dosyada 366 iade satırı var, defterde " + iadeSayi + " Return.");
  console.log("     236'sı yazılabilir hâlde bekliyor (₺683.923,92) ama K73");
  console.log("     KİLİTLİ — üç bilinmeyen ölçülmeden yazılmıyor.");

  // ══ ④ KARGOLAR ════════════════════════════════════════════════════════
  console.log("\n" + "-".repeat(100));
  console.log("④ KARGOLAR");
  console.log("-".repeat(100));
  const gecerli = satisSayi - iptalSayi;
  const firmali = await p.sale.count({ where: { iptalTarihi: null, cargoCarrierId: { not: null } } });
  const ucretli = await p.sale.count({ where: { iptalTarihi: null, cargoAmount: { not: null } } });
  const desili = await p.sale.count({ where: { iptalTarihi: null, cargoDesi: { not: null } } });
  const kargoya = await p.sale.count({ where: { iptalTarihi: null, shippedAt: { not: null } } });
  const kargoFee = await p.saleFee.aggregate({
    where: { code: { contains: "KARGO" }, sale: { iptalTarihi: null } },
    _count: { _all: true }, _sum: { amount: true },
  });
  console.log("   geçerli satış " + gecerli);
  console.log("     kargo FİRMASI seçili : " + String(firmali).padStart(6) + "   " + yuzde(firmali, gecerli));
  console.log("     kargo ÜCRETİ girili  : " + String(ucretli).padStart(6) + "   " + yuzde(ucretli, gecerli));
  console.log("     DESİ girili          : " + String(desili).padStart(6) + "   " + yuzde(desili, gecerli));
  console.log("     kargoya VERİLDİ      : " + String(kargoya).padStart(6) + "   " + yuzde(kargoya, gecerli));
  console.log("   kâr hesabındaki KARGO kesinti satırı: " + kargoFee._count._all +
    " · toplam " + t2(Number((kargoFee._sum.amount ?? 0).toString())));
  const tarife = await p.cargoTariff.count();
  const firma = await p.cargoCarrier.count();
  console.log("   tanımlı kargo firması " + firma + " · yüklü tarife satırı " + tarife);

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
