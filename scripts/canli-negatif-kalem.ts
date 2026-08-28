import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  NEGATİF FİYATLI SATIŞ KALEMİ — SINIF TARAMASI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  ⚠ Kullanıcı bildirdi (11265267349): dosyada iadeyi TERS SATIRLA kaydediyor
 *  (+1 adet 2550 · −1 adet −2550). İçe aktarma bu ters satırı bir SATIŞ
 *  KALEMİ olarak yazmış: `quantity 1`, `unitPriceAmount −2550`.
 *
 *  ⛔ SONUÇ: iki kalem birbirini götürmüyor — İKİSİ DE FIFO maliyeti aldı
 *  (1934 + 1999) ve NET-2 **−3.288,49** çıktı. Uydurulmuş bir zarar.
 *
 *  ⚠ İçe aktarmada `if (s.adet <= 0) continue` kapısı VAR ama o ADEDE
 *  bakıyor; bu satırda adet POZİTİF, FİYAT negatif. Kapı yanlış alanı
 *  koruyor. _(Anayasa: "kapsam genişlemesi, bağımlı listelerin de
 *  genişlemesidir".)_
 * ============================================================================
 */
const t2 = (n: number) => n.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const negFiyat = await p.saleItem.findMany({
    where: { unitPriceAmount: { lt: 0 } },
    select: { id: true, quantity: true, unitPriceAmount: true, net2Amount: true,
      profitStatus: true,
      sale: { select: { code: true, soldAt: true, iptalTarihi: true, importKaynak: true } },
      stockMovements: { select: { type: true, quantityDelta: true, unitCostAmount: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });
  const negAdet = await p.saleItem.count({ where: { quantity: { lt: 0 } } });

  console.log("\n" + "=".repeat(100));
  console.log("NEGATİF SATIŞ KALEMİ — SINIF TARAMASI (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   negatif FİYATLI kalem : " + negFiyat.length);
  console.log("   negatif ADETLİ kalem  : " + negAdet);

  const iptalsiz = negFiyat.filter((k) => k.sale.iptalTarihi === null);
  console.log("\n   iptalsiz olan         : " + iptalsiz.length);
  const ciro = iptalsiz.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0);
  const maliyet = iptalsiz.reduce((t, k) =>
    t + k.stockMovements.filter((h) => h.type === "SALE_OUT")
      .reduce((a, h) => a + Math.abs(h.quantityDelta) * Number(h.unitCostAmount?.toString() ?? 0), 0), 0);
  console.log("   ciroya etkisi         : " + t2(ciro));
  console.log("   ⛔ ALDIKLARI FIFO MALİYETİ: " + t2(maliyet) +
    "   ← ters satır maliyet TÜKETMEMELİYDİ");

  const kaynak = new Map<string, number>();
  for (const k of iptalsiz) {
    const s = k.sale.importKaynak ?? "elle";
    kaynak.set(s, (kaynak.get(s) ?? 0) + 1);
  }
  console.log("\n   KAYNAK BAZINDA:");
  for (const [s, n] of kaynak) console.log("     " + s.padEnd(16) + n);

  console.log("\n   EN BÜYÜK 20");
  console.log("   sipariş         tarih       adet      fiyat     FIFOmal   durum  SKU / ürün");
  console.log("   " + "─".repeat(96));
  for (const k of [...iptalsiz].sort((a, b) =>
    Number(a.unitPriceAmount.toString()) - Number(b.unitPriceAmount.toString())).slice(0, 20)) {
    const mal = k.stockMovements.filter((h) => h.type === "SALE_OUT")
      .reduce((a, h) => a + Math.abs(h.quantityDelta) * Number(h.unitCostAmount?.toString() ?? 0), 0);
    console.log("   " + (k.sale.code ?? "—").padEnd(14) + k.sale.soldAt.toISOString().slice(0, 10) +
      String(k.quantity).padStart(6) + Number(k.unitPriceAmount.toString()).toFixed(2).padStart(11) +
      mal.toFixed(2).padStart(12) + "  " + String(k.profitStatus).slice(0, 6).padEnd(7) +
      k.variant.sku.padEnd(16) + k.variant.product.name.slice(0, 22));
  }

  /** ⚠ EŞLEŞEN ÇİFT: aynı siparişte hem + hem − aynı varyant. */
  const cift: string[] = [];
  for (const k of iptalsiz) {
    if (!k.sale.code) continue;
    const es = await p.saleItem.count({
      where: { sale: { code: k.sale.code }, variantId: (await p.saleItem.findUnique({
        where: { id: k.id }, select: { variantId: true } }))!.variantId,
        unitPriceAmount: { gt: 0 } },
    });
    if (es > 0 && cift.length < 30) cift.push(k.sale.code);
  }
  console.log("\n   ⭐ EŞLEŞEN ÇİFTİ OLAN (aynı siparişte + ve − aynı varyant): " + cift.length);
  console.log("     Bunlar iade kaydı; iki satır birbirini GÖTÜRMELİYDİ ama");
  console.log("     ikisi de maliyet tüketti ve NET uydurma bir zarar gösteriyor.");

  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
