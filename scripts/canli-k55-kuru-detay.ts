import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K55 KURU KOŞUM — AYRINTI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  `canli:stok-bagi` raporunun cevaplamadigi uc soru:
 *    ① Baglanacak 12 kalem HANGILERI, hangi doneme ait
 *    ② TARIH TERSLIGI: baglanacak parti, satistan SONRA mi damgali
 *    ③ profitStatus gecisi: kac satis NO_COST -> CALCULATED olacak
 * ============================================================================
 */
async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("CANLI ADRES OKUNAMADI"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kalemler = await p.saleItem.findMany({
    where: { sale: { importBatch: { not: null }, iptalTarihi: null }, stockMovements: { none: {} } },
    select: { id: true, quantity: true, variantId: true,
      sale: { select: { id: true, code: true, soldAt: true, profitStatus: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } } },
    orderBy: { sale: { soldAt: "asc" } },
  });

  /** Acik partiler — betigin kendi govdesiyle AYNI kaynaktan. */
  const girisler = await p.stockMovement.findMany({
    where: { quantityDelta: { gt: 0 } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, variantId: true, quantityDelta: true, occurredAt: true, unitCostAmount: true },
  });
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 } }, select: { quantityDelta: true, sourceMovementId: true },
  });
  const tuketim = new Map<string, number>();
  for (const x of cikislar) if (x.sourceMovementId)
    tuketim.set(x.sourceMovementId, (tuketim.get(x.sourceMovementId) ?? 0) + Math.abs(x.quantityDelta));
  const acik = new Map<string, { kalan: number; tarih: Date; maliyet: string | null }[]>();
  for (const g of girisler) {
    const kalan = g.quantityDelta - (tuketim.get(g.id) ?? 0);
    if (kalan <= 0) continue;
    const l = acik.get(g.variantId) ?? [];
    l.push({ kalan, tarih: g.occurredAt, maliyet: g.unitCostAmount?.toString() ?? null });
    acik.set(g.variantId, l);
  }

  console.log("\n" + "=".repeat(100));
  console.log("K55 KURU KOŞUM — AYRINTI");
  console.log("=".repeat(100));

  const baglanacak: typeof kalemler = [];
  const kalanPartiler = new Map([...acik].map(([k, v]) => [k, v.map((x) => ({ ...x }))]));
  const tersTarih: string[] = [];
  for (const k of kalemler) {
    const l = kalanPartiler.get(k.variantId) ?? [];
    let gerek = k.quantity, kullanilan: Date[] = [];
    for (const parti of l) {
      if (gerek <= 0) break;
      if (parti.kalan <= 0) continue;
      const al = Math.min(parti.kalan, gerek);
      parti.kalan -= al; gerek -= al; kullanilan.push(parti.tarih);
    }
    if (gerek > 0) continue;
    baglanacak.push(k);
    /** ⭐ TARIH TERSLIGI: parti satistan SONRA damgaliysa fiziken o mal olamaz. */
    const ters = kullanilan.filter((t) => t > k.sale.soldAt);
    if (ters.length > 0) {
      tersTarih.push(k.sale.soldAt.toISOString().slice(0, 10) + "  " +
        (k.sale.code ?? "—").padEnd(14) + k.variant.sku.padEnd(18) +
        "parti " + ters.map((t) => t.toISOString().slice(0, 10)).join(",") +
        "   " + k.variant.product.name.slice(0, 30));
    }
  }

  console.log("\n① BAĞLANACAK KALEMLER: " + baglanacak.length + " / " + kalemler.length);
  console.log("   satış tarihi   sipariş         SKU                 adet  ürün");
  for (const k of baglanacak) {
    console.log("   " + k.sale.soldAt.toISOString().slice(0, 10) + "     " +
      (k.sale.code ?? "—").padEnd(14) + k.variant.sku.padEnd(20) +
      String(k.quantity).padStart(4) + "  " + k.variant.product.name.slice(0, 34));
  }

  console.log("\n② ⭐ TARİH TERSLİĞİ — parti satıştan SONRA damgalı");
  console.log("   " + tersTarih.length + " / " + baglanacak.length + " kalem");
  for (const t of tersTarih) console.log("     " + t);
  if (tersTarih.length === baglanacak.length && baglanacak.length > 0) {
    console.log("   ⛔ HEPSİ TERS. Betik tarih sınırı UYGULAMIYOR: `acikPartilerToplu`");
    console.log("     `sinir` parametresi VERİLMEDEN çağrılıyor, yani satış tarihinden");
    console.log("     SONRA girilen parti de aday sayılıyor.");
  }

  console.log("\n③ profitStatus GEÇİŞİ");
  const satisDurum = new Map<string, string>();
  for (const k of baglanacak) satisDurum.set(k.sale.id, k.sale.profitStatus ?? "(boş)");
  const kova = new Map<string, number>();
  for (const d of satisDurum.values()) kova.set(d, (kova.get(d) ?? 0) + 1);
  console.log("   etkilenecek satış: " + satisDurum.size);
  for (const [d, n] of kova) console.log("     " + d.padEnd(16) + n + "  → CALCULATED olması beklenir");
  console.log("\n   ⚠ NET yeniden yazılır mı: EVET — betik her satış için `satisKarTazele`");
  console.log("     çağırıyor (satır 301) ve ④'ün kuralı gereği CALCULATED olunca");
  console.log("     `netYaz` NET'i yazar. İki iş AYNI turda, ayrı koşum gerekmiyor.");

  console.log("\n④ IDEMPOTENS — koşum sırasında yeni alım girilirse");
  console.log("   Ölçüt `stockMovements: { none: {} }` — bağı KURULMUŞ kalem bir daha");
  console.log("   aday olmaz. Yeni alım yeni açık parti üretir; ikinci koşum onları");
  console.log("   görür ve o an bağlanabilen kalemleri bağlar. Çift bağlama YOK.");

  console.log("\n⑤ PANEL MARJI: ölçülecek (tahmin edilmiyor) — küme değişiyor,");
  console.log("   önce/sonra oranları karşılaştırılamaz.\n");
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
