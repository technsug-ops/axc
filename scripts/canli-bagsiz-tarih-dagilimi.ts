import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  BAĞSIZ SATIŞLARIN TARİH DAĞILIMI — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npm run canli:bagsiz-tarih
 *
 *  Soru (kullanıcı, 28.08.2026): _"bu satışların en yakın tarihi ne?"_
 *
 *  ⚠ İKİ BİRİM AYRI SAYILIR: **satış** ile **kalem** aynı şey değil.
 *  Bir satış birden çok kalem taşıyabilir; "2510 satış" ile "2561 kalem"
 *  aynı olguyu iki ölçüyle anlatır ve karıştırılırsa rakam yanlış okunur.
 *  _(Anayasa: "bir sayı etiketiyle taşınır".)_
 *
 *  ⚠ TARİH `Sale.soldAt` — İstanbul gününe indirgenmiş UTC damgası.
 *  "Son N gün" penceresi ŞU ANDAN geriye sayılır ve ekranda yazılır.
 *
 *  ⛔ HÜKÜM YOK.
 * ============================================================================
 */

const t2 = (n: number) => n.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  /** ⚠ ÖLÇÜT `canli:stok-bagi` ile AYNI: hiç stok hareketi olmayan kalem. */
  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null }, stockMovements: { none: {} } },
    select: {
      id: true, quantity: true, unitPriceAmount: true, variantId: true,
      sale: { select: { id: true, soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });

  const okumaAni = new Date();
  const satislar = new Set(kalemler.map((k) => k.sale.id));
  const varyantlar = new Set(kalemler.map((k) => k.variantId));
  const tutar = (k: (typeof kalemler)[number]) =>
    Number(k.unitPriceAmount.toString()) * k.quantity;

  console.log("\n" + "=".repeat(104));
  console.log("BAĞSIZ SATIŞLARIN TARİH DAĞILIMI — SALT OKUMA");
  console.log("okuma anı: " + okumaAni.toISOString().slice(0, 16).replace("T", " ") + " UTC");
  console.log("=".repeat(104));
  console.log("\n   bağsız KALEM   " + kalemler.length);
  console.log("   bağsız SATIŞ   " + satislar.size + "   ⚠ ikisi ayrı ölçü, karıştırılmaz");
  console.log("   farklı VARYANT " + varyantlar.size);
  console.log("   toplam ciro    " + t2(kalemler.reduce((t, k) => t + tutar(k), 0)));

  // ── ① AYLIK DAĞILIM ────────────────────────────────────────────────────
  const ay = new Map<string, { kalem: number; satis: Set<string>; ciro: number }>();
  for (const k of kalemler) {
    const a = k.sale.soldAt.toISOString().slice(0, 7);
    const v = ay.get(a) ?? { kalem: 0, satis: new Set<string>(), ciro: 0 };
    v.kalem++;
    v.satis.add(k.sale.id);
    v.ciro += tutar(k);
    ay.set(a, v);
  }
  const sirali = [...ay].sort();
  console.log("\n① AYLIK DAĞILIM");
  console.log("   ay        kalem  satış           ciro");
  console.log("   " + "─".repeat(48));
  for (const [a, v] of sirali) {
    console.log("   " + a + String(v.kalem).padStart(8) + String(v.satis.size).padStart(7) + t2(v.ciro));
  }

  const tarihler = kalemler.map((k) => k.sale.soldAt).sort((a, b) => a.getTime() - b.getTime());
  console.log("\n   EN ESKİ satış : " + tarihler[0].toISOString().slice(0, 10));
  console.log("   ⭐ EN YENİ satış: " + tarihler[tarihler.length - 1].toISOString().slice(0, 10) +
    "   (bugünden " +
    Math.round((okumaAni.getTime() - tarihler[tarihler.length - 1].getTime()) / 86400_000) +
    " gün önce)");

  // ── ② PENCERELER ───────────────────────────────────────────────────────
  console.log("\n② SON N GÜN — ŞU ANDAN geriye");
  console.log("   pencere     kalem  satış           ciro    payı(ciro)");
  console.log("   " + "─".repeat(62));
  const toplamCiro = kalemler.reduce((t, k) => t + tutar(k), 0);
  for (const n of [30, 90, 180, 365]) {
    const sinir = new Date(okumaAni.getTime() - n * 86400_000);
    const alt = kalemler.filter((k) => k.sale.soldAt >= sinir);
    const ciro = alt.reduce((t, k) => t + tutar(k), 0);
    console.log("   son " + String(n).padStart(3) + " gün" +
      String(alt.length).padStart(9) +
      String(new Set(alt.map((k) => k.sale.id)).size).padStart(7) +
      t2(ciro) +
      ((toplamCiro > 0 ? (ciro / toplamCiro) * 100 : 0).toFixed(1) + "%").padStart(12));
  }

  // ── ③ VARYANT GÜNCELLİĞİ ───────────────────────────────────────────────
  type V = { sku: string; ad: string; kalem: number; adet: number; ciro: number; sonSatis: Date };
  const vHarita = new Map<string, V>();
  for (const k of kalemler) {
    const v = vHarita.get(k.variantId) ?? {
      sku: k.variant.sku, ad: k.variant.product.name,
      kalem: 0, adet: 0, ciro: 0, sonSatis: k.sale.soldAt,
    };
    v.kalem++;
    v.adet += k.quantity;
    v.ciro += tutar(k);
    if (k.sale.soldAt > v.sonSatis) v.sonSatis = k.sale.soldAt;
    vHarita.set(k.variantId, v);
  }

  console.log("\n③ VARYANT KIRILIMI — SON satışın güncelliğine göre");
  console.log("   pencere      varyant   kalem           ciro");
  console.log("   " + "─".repeat(52));
  const hepsi = [...vHarita.values()];
  for (const n of [30, 90, 180, 365]) {
    const sinir = new Date(okumaAni.getTime() - n * 86400_000);
    const alt = hepsi.filter((v) => v.sonSatis >= sinir);
    console.log("   son " + String(n).padStart(3) + " gün" +
      String(alt.length).padStart(11) +
      String(alt.reduce((t, v) => t + v.kalem, 0)).padStart(8) +
      t2(alt.reduce((t, v) => t + v.ciro, 0)));
  }
  const sinir90 = new Date(okumaAni.getTime() - 90 * 86400_000);
  const canli90 = hepsi.filter((v) => v.sonSatis >= sinir90);
  console.log("\n   ⭐ SON 90 GÜNDE SATIŞI OLAN: " + canli90.length + " / " + hepsi.length +
    " varyant  (" + ((canli90.length / hepsi.length) * 100).toFixed(1) + "%)");
  console.log("     Bu varyantlar HÂLÂ SATILIYOR — alımı girmek yalnız geçmişi değil,");
  console.log("     gelecekteki satışların maliyetini de kurtarır.");

  // ── ④ EN BÜYÜK 20 — GÜNCELLİĞE GÖRE ────────────────────────────────────
  console.log("\n④ EN GÜNCEL 20 VARYANT — son satış tarihine göre sıralı");
  console.log("   sonSatış    günÖnce  kalem  adet           ciro   SKU / ürün");
  console.log("   " + "─".repeat(96));
  for (const v of [...hepsi].sort((a, b) => b.sonSatis.getTime() - a.sonSatis.getTime()).slice(0, 20)) {
    console.log("   " + v.sonSatis.toISOString().slice(0, 10) +
      String(Math.round((okumaAni.getTime() - v.sonSatis.getTime()) / 86400_000)).padStart(9) +
      String(v.kalem).padStart(7) + String(v.adet).padStart(6) + t2(v.ciro) +
      "   " + v.sku.padEnd(18) + v.ad.slice(0, 30));
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
