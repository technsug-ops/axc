import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { urunlereTopla, type KalemGirdisi } from "../src/lib/panel-listeler";

/**
 * BETIK SINIFI: TEK_SEFERLIK — K173-③ kararının örnek kaydı için ölçüm.
 * SALT OKUMA. Hiçbir şey yazmaz.
 *
 * ⛔ Ölçüm EKRANIN KENDİ GÖVDESİNDEN yapılır (`urunlereTopla`); burada
 *    yeniden toplama YAZILMAZ. Sonda parametresi ekranın parametresi
 *    değildir — aynı gövde çağrılmazsa iki doğru sayı çelişiyor görünür.
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: {
      variantId: true, quantity: true, unitPriceAmount: true,
      net1Amount: true, net2Amount: true, profitStatus: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });

  const girdiler: KalemGirdisi[] = kalemler.map((k) => ({
    variantId: k.variantId,
    urunAdi: k.variant.product.name,
    sku: k.variant.sku,
    adet: k.quantity,
    ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
    net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
    net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
    durum: k.profitStatus,
  }));

  const satirlar = urunlereTopla(girdiler);
  const asan = satirlar.filter((s) => s.net2 > s.net1);

  console.log("\n" + "=".repeat(100));
  console.log("K173-③ — ÜRÜN DÜZEYİNDE net2 > net1 (kırpma YOK kararının örnekleri)");
  console.log("=".repeat(100));
  console.log("  kaynak : canlı · " + new Date().toISOString());
  console.log("  gövde  : src/lib/panel-listeler.ts -> urunlereTopla()");
  console.log("  kalem  : " + kalemler.length + " (iptal edilmemiş satışların kalemleri)");
  console.log("  varyant: " + satirlar.length);
  console.log("  AŞAN   : " + asan.length + "\n");

  console.log("  " + "SKU".padEnd(18) + "ÜRÜN".padEnd(42) +
    "NET-1".padStart(13) + "NET-2".padStart(13) + "FARK".padStart(12));
  console.log("  " + "-".repeat(96));
  for (const s of asan.sort((a, b) => (b.net2 - b.net1) - (a.net2 - a.net1))) {
    console.log("  " + s.sku.padEnd(18) + s.urunAdi.slice(0, 40).padEnd(42) +
      s.net1.toFixed(2).padStart(13) + s.net2.toFixed(2).padStart(13) +
      (s.net2 - s.net1).toFixed(2).padStart(12));
  }
  console.log("");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
