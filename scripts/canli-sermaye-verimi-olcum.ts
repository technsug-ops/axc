import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  sermayeVerimi — PAYDA ÖLÇÜMÜ · SALT OKUMA, DÜZELTME YOK
 * ----------------------------------------------------------------------------
 *      npm run canli:sermaye-olcum
 *
 *  ⛔ YORUM İLE KOD AYRIŞMIŞ (`src/lib/urun-karti.ts:186`):
 *
 *      yorum: "Payda olarak SATILAN adedin maliyeti kullanılır:
 *              elde kalan stok bu satışın sermayesi değildir."
 *      kod  : sermayeVerimi(birim, agirlikliOrtalama(acikPartiler))
 *              → elde KALAN partilerin ağırlıklı ortalaması
 *
 *  İkisi farklı şey söylüyor; biri yanlış. Bu betik hangisinin ne kadar
 *  fark ettiğini ölçer — HÜKÜM VERMEZ, düzeltme yazmaz.
 *
 *  ⚠ ÖÇÜT KARTIN KENDİ ÖLÇÜTÜ: açık parti = `quantityDelta > 0` girişlerin
 *  FIFO ile tüketilmemiş kalanı (`lib/stok.ts` → `acikPartilerToplu`).
 *  Başka bir küme sayılsaydı "kart başka diyor" derdik.
 * ============================================================================
 */

const t2 = (n: number) => n.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("sermayeVerimi — PAYDA ÖLÇÜMÜ (salt okuma, düzeltme yok)");
  console.log("=".repeat(104));

  /** ── FIFO: girişleri sırayla tüket, kalanları çıkar ──────────────────── */
  const girisler = await p.stockMovement.findMany({
    where: { quantityDelta: { gt: 0 } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, variantId: true, quantityDelta: true, unitCostAmount: true },
  });
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 } },
    select: { variantId: true, quantityDelta: true, sourceMovementId: true },
  });

  /** Parti başına tüketim — `sourceMovementId` FIFO bağının kendisi. */
  const tuketim = new Map<string, number>();
  for (const c2 of cikislar) {
    if (!c2.sourceMovementId) continue;
    tuketim.set(c2.sourceMovementId, (tuketim.get(c2.sourceMovementId) ?? 0) + Math.abs(c2.quantityDelta));
  }

  type Parti = { kalanAdet: number; birimMaliyet: number | null };
  const acik = new Map<string, Parti[]>();
  for (const g of girisler) {
    const kalan = g.quantityDelta - (tuketim.get(g.id) ?? 0);
    if (kalan <= 0) continue;
    const l = acik.get(g.variantId) ?? [];
    l.push({ kalanAdet: kalan, birimMaliyet: g.unitCostAmount === null ? null : Number(g.unitCostAmount.toString()) });
    acik.set(g.variantId, l);
  }
  /** Kartın kendi formülü — birebir. */
  const agirlikliOrtalama = (partiler: Parti[]): number | null => {
    let adet = 0, tutar = 0;
    for (const x of partiler) {
      if (x.birimMaliyet === null || x.kalanAdet <= 0) continue;
      adet += x.kalanAdet;
      tutar += x.birimMaliyet * x.kalanAdet;
    }
    return adet === 0 ? null : tutar / adet;
  };

  /** ── SATILANIN GERÇEK MALİYETİ — SALE_OUT damgalarından ─────────────── */
  const satisCikis = await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, saleItem: { sale: { iptalTarihi: null } } },
    select: { variantId: true, quantityDelta: true, unitCostAmount: true },
  });
  const satilan = new Map<string, { adet: number; tutar: number; damgasiz: number }>();
  for (const s of satisCikis) {
    const v = satilan.get(s.variantId) ?? { adet: 0, tutar: 0, damgasiz: 0 };
    const ad = Math.abs(s.quantityDelta);
    if (s.unitCostAmount === null) { v.damgasiz += ad; }
    else { v.adet += ad; v.tutar += ad * Number(s.unitCostAmount.toString()); }
    satilan.set(s.variantId, v);
  }

  const varyantlar = await p.productVariant.findMany({
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  const ad = new Map(varyantlar.map((v) => [v.id, { sku: v.sku, ad: v.product.name }]));

  /** Satış adedi — kalemden, ölçüt satışın kendisi. */
  const satisAdet = new Map<string, number>();
  for (const k of await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { variantId: true, quantity: true },
  })) {
    satisAdet.set(k.variantId, (satisAdet.get(k.variantId) ?? 0) + k.quantity);
  }

  // ═══ ① METRİK HİÇ HESAPLANMAYANLAR ══════════════════════════════════════
  console.log("\n① SERMAYE VERİMİ HİÇ HESAPLANMAYAN ÜRÜNLER");
  console.log("   (açık parti yok ya da hepsinin maliyeti bilinmiyor → payda null)");

  const satisliVaryant = [...satisAdet.entries()].filter(([, n]) => n > 0);
  const paydasiz = satisliVaryant.filter(([id]) => agirlikliOrtalama(acik.get(id) ?? []) === null);

  console.log("\n   satışı olan varyant : " + satisliVaryant.length);
  console.log("   PAYDASI NULL        : " + paydasiz.length +
    "  (" + ((paydasiz.length / satisliVaryant.length) * 100).toFixed(1) + "%)");

  console.log("\n   EN ÇOK SATANLARDAN 15'İ — metriğin en çok işe yarayacağı yer");
  console.log("   SKU                satılan   satılanMaliyet   ürün");
  console.log("   " + "─".repeat(88));
  for (const [id, n] of [...paydasiz].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    const s = satilan.get(id);
    const bilinen = s && s.adet > 0 ? (s.tutar / s.adet).toFixed(2) : "—";
    console.log("   " + (ad.get(id)?.sku ?? id).slice(0, 18).padEnd(19) +
      String(n).padStart(6) + bilinen.padStart(17) + "   " + (ad.get(id)?.ad ?? "").slice(0, 42));
  }
  const paydasizAdet = paydasiz.reduce((t, [, n]) => t + n, 0);
  const tumAdet = satisliVaryant.reduce((t, [, n]) => t + n, 0);
  console.log("\n   ⭐ bu ürünlerin satış adedi: " + paydasizAdet + " / " + tumAdet +
    "  (" + ((paydasizAdet / tumAdet) * 100).toFixed(1) + "% — SATIŞ HACMİNE göre pay)");
  console.log("   ⚠ Varyant sayısına göre pay ile HACME göre pay ayrı ayrı yazıldı;");
  console.log("     ikisi ayrışıyorsa 'kaç ürün' ile 'ne kadar iş' farklı şeyler söyler.");

  // ═══ ② PAYDA AYRIŞMASI ══════════════════════════════════════════════════
  console.log("\n\n② PAYDA AYRIŞMASI — açık parti ortalaması ↔ satılanın gerçek maliyeti");

  type Fark = { sku: string; ad: string; kart: number; gercek: number; sapma: number; satilan: number };
  const farklar: Fark[] = [];
  let karsilastirilabilir = 0;
  let olculemeyen = 0;
  for (const [id, n] of satisliVaryant) {
    const kart = agirlikliOrtalama(acik.get(id) ?? []);
    const s = satilan.get(id);
    if (kart === null || !s || s.adet === 0) { olculemeyen++; continue; }
    karsilastirilabilir++;
    const gercek = s.tutar / s.adet;
    if (gercek === 0) continue;
    const sapma = ((kart - gercek) / gercek) * 100;
    farklar.push({ sku: ad.get(id)?.sku ?? id, ad: ad.get(id)?.ad ?? "", kart, gercek, sapma, satilan: n });
  }

  console.log("\n   karşılaştırılabilir varyant : " + karsilastirilabilir);
  console.log("   ölçülemeyen (biri null)     : " + olculemeyen);

  const ayrisan = farklar.filter((f) => Math.abs(f.sapma) >= 0.01);
  console.log("\n   AYRIŞAN: " + ayrisan.length + " / " + karsilastirilabilir +
    "  (" + ((ayrisan.length / Math.max(1, karsilastirilabilir)) * 100).toFixed(1) + "%)");
  const mutlak = ayrisan.map((f) => Math.abs(f.sapma)).sort((a, b) => a - b);
  if (mutlak.length > 0) {
    const y = (q: number) => mutlak[Math.floor(mutlak.length * q)];
    console.log("   |sapma|: min %" + mutlak[0].toFixed(2) + " · ortanca %" + y(0.5).toFixed(2) +
      " · p75 %" + y(0.75).toFixed(2) + " · p90 %" + y(0.9).toFixed(2) +
      " · max %" + mutlak[mutlak.length - 1].toFixed(2));
  }

  console.log("\n   EN BÜYÜK 12 SAPMA");
  console.log("   SKU               satılan    kartPaydası  gerçekMaliyet    sapma   ürün");
  console.log("   " + "─".repeat(96));
  for (const f of [...ayrisan].sort((a, b) => Math.abs(b.sapma) - Math.abs(a.sapma)).slice(0, 12)) {
    console.log("   " + f.sku.slice(0, 17).padEnd(18) + String(f.satilan).padStart(6) +
      t2(f.kart) + t2(f.gercek) +
      ((f.sapma >= 0 ? "+" : "") + f.sapma.toFixed(1) + "%").padStart(9) + "   " + f.ad.slice(0, 32));
  }

  // ═══ ③ DOĞRU PAYDA HESAPLANABİLİR Mİ ════════════════════════════════════
  console.log("\n\n③ DOĞRU PAYDA — hesaplanabilir mi, maliyeti ne");

  const toplamSatisCikis = satisCikis.length;
  const damgasiz = [...satilan.values()].reduce((t, v) => t + v.damgasiz, 0);
  const damgali = [...satilan.values()].reduce((t, v) => t + v.adet, 0);
  console.log("\n   `SaleItem`da maliyet alanı: ⛔ YOK (şemada `unitPriceAmount`, `net1Amount`,");
  console.log("     `net2Amount` var; maliyet sütunu yok). Türetme ZORUNLU.");
  console.log("\n   KAYNAK: `StockMovement` · type=SALE_OUT · saleItemId dolu · iptalsiz");
  console.log("     hareket sayısı            : " + toplamSatisCikis);
  console.log("     maliyet damgası OLAN adet : " + damgali);
  console.log("     damgası OLMAYAN adet      : " + damgasiz +
    (damgasiz > 0 ? "   ⚠ bu adetler doğru paydaya GİREMEZ" : ""));

  const saleFee = await p.saleFee.count({ where: { code: "MALIYET" } });
  const iptalsizSatis = await p.sale.count({ where: { iptalTarihi: null } });
  console.log("\n   ALTERNATİF KAYNAK: `SaleFee` code=MALIYET");
  console.log("     kayıt: " + saleFee + "   ·   iptalsiz satış: " + iptalsizSatis);
  console.log("     ⚠ Bu kalem kâr motorunun ÇIKTISI — motor koşmamışsa yok. Hareket");
  console.log("       damgası ise motordan bağımsız ve FIFO'nun kendi kaydı.");

  console.log("\n   MOTOR DEĞİŞİKLİĞİ GEREKİR Mİ:");
  console.log("     ⛔ HAYIR — kâr motoru (`lib/kar.ts`) bu paydayı hiç kullanmıyor.");
  console.log("       `sermayeVerimi` yalnız ÜRÜN KARTI ekranının bir kutusu");
  console.log("       (`lib/urun-karti.ts` → `ozet`). Değişiklik tek dosyada kalır ve");
  console.log("       NET-1/NET-2'ye dokunmaz.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
