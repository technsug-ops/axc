import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  FİYAT DENEMESİ — ORTALAMA ALIŞ ↔ SON ALIŞ FARKI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  ⚠ Kullanıcı 28.08.2026: "ortalama alış geldiği için yanıltıcı olabiliyor,
 *  direkt en son alım fiyatı gelebilir mi?"
 *
 *  ⛔ AYNI KARAR SATIŞ TARAFINDA ZATEN VERİLMİŞ (21.08.2026): "satış fiyatı
 *  yazan yere en son satılan ürün fiyatını yaz" — gerekçe: ortalama, aylar
 *  önceki bir fiyatı bugünkü denemeye karıştırır ve FİYAT KAYMASINI GİZLER.
 *  Alış tarafı o değişikliğin dışında kalmış; bu bir tutarsızlık (İlke #10).
 *
 *  ⛔ AMA ÖNCE ÖLÇÜLÜR: fark önemsizse değişiklik gereksiz gürültü olur.
 *  ÖLÇÜT — ekranın kendi zeminiyle AYNI küme: `purchaseItemId` dolu,
 *  `quantityDelta > 0`, `unitCostAmount` dolu hareketler.
 * ============================================================================
 */

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const hrk = await p.stockMovement.findMany({
    where: { purchaseItemId: { not: null }, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
    select: { variantId: true, quantityDelta: true, unitCostAmount: true, occurredAt: true,
      variant: { select: { sku: true, product: { select: { name: true } } } } },
    orderBy: { occurredAt: "asc" },
  });

  type V = { adet: number; tutar: number; son: number; sonTarih: Date; ad: string; sku: string; giris: number };
  const m = new Map<string, V>();
  for (const g of hrk) {
    const birim = Number(g.unitCostAmount!.toString());
    const v = m.get(g.variantId) ?? { adet: 0, tutar: 0, son: birim, sonTarih: g.occurredAt,
      ad: g.variant.product.name, sku: g.variant.sku, giris: 0 };
    v.adet += g.quantityDelta;
    v.tutar += g.quantityDelta * birim;
    v.giris++;
    /** ⚠ Sıralama `occurredAt asc` — son okunan EN YENİ olandır. */
    v.son = birim;
    v.sonTarih = g.occurredAt;
    m.set(g.variantId, v);
  }

  console.log("\n" + "=".repeat(100));
  console.log("ORTALAMA ALIŞ ↔ SON ALIŞ (salt okuma)");
  console.log("=".repeat(100));
  console.log("\n   alımı olan varyant: " + m.size);

  const tekGiris = [...m.values()].filter((v) => v.giris === 1).length;
  console.log("   tek girişli (fark İMKÂNSIZ): " + tekGiris);
  console.log("   çok girişli (fark MÜMKÜN)  : " + (m.size - tekGiris));

  const farklar: { sku: string; ad: string; ort: number; son: number; sapma: number; giris: number }[] = [];
  for (const v of m.values()) {
    if (v.adet === 0) continue;
    const ort = v.tutar / v.adet;
    if (ort === 0) continue;
    const sapma = ((v.son - ort) / ort) * 100;
    if (Math.abs(sapma) >= 0.01) farklar.push({ sku: v.sku, ad: v.ad, ort, son: v.son, sapma, giris: v.giris });
  }

  console.log("\n   ORTALAMA ile SON'un AYRIŞTIĞI varyant: " + farklar.length +
    " / " + m.size + "  (" + ((farklar.length / m.size) * 100).toFixed(1) + "%)");

  const mutlak = farklar.map((f) => Math.abs(f.sapma)).sort((a, b) => a - b);
  if (mutlak.length > 0) {
    const y = (q: number) => mutlak[Math.floor(mutlak.length * q)];
    console.log("   |sapma| dağılımı: min %" + mutlak[0].toFixed(2) +
      " · ortanca %" + y(0.5).toFixed(2) + " · p75 %" + y(0.75).toFixed(2) +
      " · p90 %" + y(0.9).toFixed(2) + " · max %" + mutlak[mutlak.length - 1].toFixed(2));
  }

  console.log("\n   EN BÜYÜK 12 SAPMA — denemede en çok yanıltacak olanlar");
  console.log("   SKU              girdi   ortalama       son      sapma   ürün");
  console.log("   " + "─".repeat(92));
  for (const f of [...farklar].sort((a, b) => Math.abs(b.sapma) - Math.abs(a.sapma)).slice(0, 12)) {
    console.log("   " + f.sku.padEnd(17) + String(f.giris).padStart(4) +
      f.ort.toFixed(2).padStart(12) + f.son.toFixed(2).padStart(11) +
      (f.sapma >= 0 ? "+" : "") + f.sapma.toFixed(1).padStart(8) + "%   " + f.ad.slice(0, 38));
  }

  /** ⚠ Ekrandaki vaka doğrudan sınanır — kullanıcının gördüğü rakam. */
  const lego = [...m.entries()].find(([, v]) => v.sku === "axcali2703");
  if (lego) {
    const v = lego[1];
    console.log("\n   EKRANDAKİ VAKA — axcali2703 (LEGO Kawasaki H2R 42170)");
    console.log("     giriş " + v.giris + " · ortalama " + (v.tutar / v.adet).toFixed(2) +
      " · SON " + v.son.toFixed(2) + " (" + v.sonTarih.toISOString().slice(0, 10) + ")");
  }

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
