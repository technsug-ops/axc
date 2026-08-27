import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * KOPYA ALIM BELGESİ — SALT OKUMA. Ölçüt KİMLİK: `supplierOrderNo`.
 * ⛔ Aynı tedarikçi sipariş numarası iki AYRI alım belgesinde ise, o sipariş
 *    iki kez içe aktarılmış demektir. Benzerlik değil, kimlik eşleşmesi.
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("⛔ CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const alimlar = await p.purchase.findMany({
    where: { supplierOrderNo: { not: null } },
    select: {
      id: true, code: true, supplierOrderNo: true, purchasedAt: true, createdAt: true,
      items: { select: { quantity: true, unitCostAmount: true,
        variant: { select: { sku: true, product: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const kova = new Map<string, typeof alimlar>();
  for (const a of alimlar) {
    const k = a.supplierOrderNo!.trim();
    if (k === "") continue;
    kova.set(k, [...(kova.get(k) ?? []), a]);
  }
  const kopya = [...kova.entries()].filter(([, g]) => g.length > 1);

  console.log("\n" + "=".repeat(104));
  console.log("KOPYA ALIM BELGESİ — aynı tedarikçi sipariş no, birden çok alım kaydı");
  console.log("=".repeat(104));
  console.log("\n   sipariş no'su OLAN alım kaydı : " + alimlar.length);
  console.log("   farklı sipariş no             : " + kova.size);
  console.log("   ⚠ BİRDEN ÇOK KAYDA DÜŞEN      : " + kopya.length);

  let fazlaAdet = 0, fazlaTutar = 0;
  for (const [no, g] of kopya.sort((a, b) => b[1].length - a[1].length)) {
    console.log("\n   ● sipariş " + no + "   —   " + g.length + " alım kaydı");
    for (const a of g) {
      const ad = a.items.reduce((t, i) => t + i.quantity, 0);
      const tt = a.items.reduce((t, i) => t + i.quantity * Number(i.unitCostAmount?.toString() ?? 0), 0);
      console.log("     " + a.code.padEnd(22) + " alım " + a.purchasedAt.toISOString().slice(0, 10) +
        "   girildi " + a.createdAt.toISOString().slice(0, 16).replace("T", " ") +
        "   " + String(ad).padStart(3) + " ad · " + tt.toFixed(2).padStart(11) + " TL   " +
        a.items.slice(0, 2).map((i) => i.variant.sku).join(","));
    }
    const ilk = g[0];
    for (const a of g.slice(1)) {
      fazlaAdet += a.items.reduce((t, i) => t + i.quantity, 0);
      fazlaTutar += a.items.reduce((t, i) => t + i.quantity * Number(i.unitCostAmount?.toString() ?? 0), 0);
    }
    void ilk;
  }
  console.log("\n\n   ═══ ÖZET ═══");
  console.log("   KOPYA SİPARİŞ NO : " + kopya.length);
  console.log("   FAZLADAN GİRİLEN : " + fazlaAdet + " ad · " + fazlaTutar.toFixed(2) + " TL");
  console.log("   ⛔ HÜKÜM DEĞİL: aynı sipariş no'nun iki kez girilmesi kopya İZİDİR; kesin");
  console.log("     ayrım alım BELGESİNDEDİR (bir sipariş iki sevkiyata bölünmüş olabilir).");
  console.log("\nSALT OKUMA — HİÇBİR ŞEY YAZILMADI.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
