import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  GELECEKTEKİ PARTİYİ TÜKETEN SATIŞLAR — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:ileri-parti
 *
 *  ⛔ CANLI ARIZA 29.08.2026, HALİL BULDU:
 *  `10383153730` 27.07.2025'te satılmış ama tükettiği parti **13.08.2026**
 *  tarihli (`ALM-AMZ-260813-01`). Yani GEÇMİŞTEKİ bir satış BUGÜNKÜ malı
 *  yemiş. Sonuç: ekranda stok 0 görünüyor, yeni sipariş KAYDEDİLEMİYOR.
 *
 *  KÖKENİ: `canli:stok-bagi` (K55) partileri seçerken `sinir` parametresini
 *  BİLEREK vermiyor — o gün "satış tarihinden sonraki partiler de aday
 *  olsun" diye karar verilmişti. Kararın bedeli burada görünüyor:
 *  **gerçek stok tüketiliyor.**
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK. Önce kapsam.
 * ============================================================================
 */

const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);
const gun = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("GELECEKTEKİ PARTİYİ TÜKETEN SATIŞLAR — KAPSAM ÖLÇÜMÜ");
  console.log("=".repeat(104));

  /**
   * Çıkış hareketleri ve bağlı oldukları parti. Parti tarihi ÇIKIŞ
   * tarihinden SONRAYSA kronoloji bozulmuş demektir.
   */
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, sourceMovementId: { not: null } },
    select: {
      id: true, quantityDelta: true, occurredAt: true, note: true,
      unitCostAmount: true,
      variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
      sourceMovement: {
        select: { id: true, occurredAt: true, unitCostAmount: true, note: true },
      },
      saleItem: { select: { sale: { select: { code: true, soldAt: true } } } },
    },
  });

  const bozuk = cikislar.filter((x) =>
    x.sourceMovement !== null && x.sourceMovement.occurredAt > x.occurredAt);

  console.log("\n① KAPSAM");
  console.log("   partiye bağlı çıkış hareketi : " + cikislar.length);
  console.log("   ⛔ PARTİSİ ÇIKIŞTAN SONRA     : " + bozuk.length +
    "   (" + (bozuk.length / cikislar.length * 100).toFixed(1) + "%)");
  console.log("   etkilenen varyant            : " +
    new Set(bozuk.map((x) => x.variant.id)).size);
  console.log("   kilitlenen adet              : " +
    bozuk.reduce((t, x) => t + Math.abs(x.quantityDelta), 0));

  /** ⭐ ASIL SORU: bu yüzden BUGÜN stoğu yanlış görünen varyantlar. */
  const varyantlar = [...new Set(bozuk.map((x) => x.variant.id))];
  console.log("\n② HANGİ VARYANTLARDA STOK YANLIŞ GÖRÜNÜYOR");
  console.log("   (bağ çözülse stok kaça çıkardı — ekranın bugün göstermediği adet)");
  const satirlar: { sku: string; ad: string; simdi: number; olur: number; adet: number }[] = [];
  for (const vid of varyantlar) {
    const hh = await p.stockMovement.findMany({
      where: { variantId: vid },
      select: { id: true, quantityDelta: true, sourceMovementId: true },
    });
    const ledger = hh.reduce((t, x) => t + x.quantityDelta, 0);
    const kilitli = bozuk
      .filter((x) => x.variant.id === vid)
      .reduce((t, x) => t + Math.abs(x.quantityDelta), 0);
    const ilk = bozuk.find((x) => x.variant.id === vid)!;
    satirlar.push({
      sku: ilk.variant.sku ?? "—",
      ad: (ilk.variant.product.name ?? "").slice(0, 34),
      simdi: ledger, olur: ledger + kilitli, adet: kilitli,
    });
  }
  satirlar.sort((a, b) => b.adet - a.adet);
  console.log("\n   " + "SKU".padEnd(15) + "şimdi".padStart(6) + "→ olur".padStart(8) +
    "  kilitli  ürün");
  for (const r of satirlar) {
    console.log("   " + r.sku.padEnd(15) + String(r.simdi).padStart(6) +
      String(r.olur).padStart(8) + String(r.adet).padStart(9) + "  " + r.ad);
  }

  /** ③ HALİL'İN VAKASI — birebir */
  console.log("\n③ HALİL'İN VAKASI — `10383153730`");
  const vaka = cikislar.filter((x) => x.saleItem?.sale.code === "10383153730");
  for (const x of vaka) {
    console.log("   satış " + gun(x.saleItem!.sale.soldAt) +
      " · çıkış " + gun(x.occurredAt) + " · adet " + x.quantityDelta +
      " · ₺" + s2(x.unitCostAmount));
    console.log("   ⛔ tükettiği parti: " + gun(x.sourceMovement!.occurredAt) +
      " · ₺" + s2(x.sourceMovement!.unitCostAmount) +
      "   → satıştan " +
      Math.round((+x.sourceMovement!.occurredAt - +x.occurredAt) / 86400000) + " GÜN SONRA");
    console.log("     parti notu: " + (x.sourceMovement!.note ?? "—").slice(0, 70));
    console.log("     çıkış notu: " + (x.note ?? "—").slice(0, 70));
  }

  /** ④ BAĞI KİM KURDU — desenle, listeyle değil */
  console.log("\n④ BAĞI KİM KURDU (çıkış hareketinin notuna göre)");
  const kaynak = new Map<string, number>();
  for (const x of bozuk) {
    const not = (x.note ?? "").trim();
    const k = not === "" ? "⛔ NOTSUZ" : not.split("·")[0].trim().slice(0, 40);
    kaynak.set(k, (kaynak.get(k) ?? 0) + 1);
  }
  for (const [k, v] of [...kaynak].sort((a, b) => b[1] - a[1])) {
    console.log("   " + String(v).padStart(5) + "  " + k);
  }

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
