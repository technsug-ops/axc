import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K74 — HALİL'İN BİLDİRDİĞİ MALİYETLER
 * ----------------------------------------------------------------------------
 *      npm run canli:k74-maliyet            → KURU KOŞUM
 *      npm run canli:k74-maliyet -- --yaz   → yazar
 *      npm run canli:k74-maliyet -- --geri  → ters kayıtla geri alır
 *
 *  ⭐ KAPSAM DAR VE KİMLİĞE KİLİTLİ: yalnız aşağıdaki YEDİ sipariş. Genel
 *  bir "maliyet yaz" aracı DEĞİL — genel araç istisnayı kurala çevirir
 *  (anayasa: metadata düzeltmesi dar istisnadır).
 *
 *  ⛔ SIFIR MALİYET BURADA VARSAYIM DEĞİL, BEYAN: dört sipariş promosyonla
 *  gelmiş ürünün satışı ve Halil "maliyeti 0" dedi. `null` (bilinmiyor) ile
 *  `0` (ölçtüm, sıfır) ayrımı anayasada yazılı; buradaki `0` ikincisi.
 *
 *  ⚠ YAZILAN ŞEY: her kalem için satış anına damgalı bir `PURCHASE_IN` +
 *  ona bağlı `SALE_OUT` çifti. Aynı desen `canli:dosya-maliyet`te kullanıldı.
 * ============================================================================
 */

const PARTI = "k74-maliyet-20260828";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

/** ⭐ HALİL'İN BEYANI — her satırın gerekçesi yanında. */
const VAKALAR: { kod: string; birim: number; gerekce: string }[] = [
  {
    kod: "10828937011", birim: 1634,
    gerekce: "Halil: aynı siparişte aynı üründen 2 adet, birim maliyet ₺1.634. İki kalem de maliyetsizdi.",
  },
  {
    kod: "4138485546", birim: 2549,
    gerekce: "Halil: aynı üründen 2 adet, birim maliyet ₺2.549. ⚠ Halil 'diğerinde problem görünmüyor' dedi ama ÖLÇÜM İKİSİNİN DE maliyetsiz olduğunu gösterdi; ikisine de yazılıyor.",
  },
  {
    kod: "4673224319", birim: 575.04,
    gerekce: "Halil: kullanılmış iade, HB tazmini onayladı. Maliyet dosyanın SATIŞ satırındaki M sütunundan (₺575,04). ⚠ Tazmin satırı ₺575,40 diyor — rakamlar yer değiştirmiş görünüyor, hangisinin doğru olduğu ÖLÇÜLEMEDİ; satışa bağlı olan seçildi.",
  },
  { kod: "10635054169", birim: 0, gerekce: "Halil: promosyon olarak geldi, maliyeti 0." },
  { kod: "4762343000", birim: 0, gerekce: "Halil: promosyon olarak geldi, maliyeti 0." },
  { kod: "4405769515", birim: 0, gerekce: "Halil: promosyon olarak geldi, maliyeti 0." },
  { kod: "10571819650", birim: 0, gerekce: "Halil: promosyon olarak geldi, maliyeti 0." },
];

const t2 = (x: number) => x.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("K74 MALİYETLERİ — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(100));

  // ═══ GERİ ALMA ═══════════════════════════════════════════════════════
  if (GERI) {
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: PARTI } },
      select: { id: true, quantityDelta: true, sourceMovementId: true },
    });
    console.log("\n   partiye ait hareket: " + hh.length);
    if (hh.length === 0) {
      console.log("   ⛔ GERİ ALINACAK KAYIT YOK.\n");
      await p.$disconnect();
      return;
    }
    /** ⚠ ÖNCE tüketimler (SALE_OUT), SONRA partiler — FIFO bağı `Restrict`. */
    const cikis = hh.filter((x) => x.quantityDelta < 0).map((x) => x.id);
    const giris = hh.filter((x) => x.quantityDelta > 0).map((x) => x.id);
    await p.stockMovement.deleteMany({ where: { id: { in: cikis } } });
    await p.stockMovement.deleteMany({ where: { id: { in: giris } } });
    console.log("   ⭐ silinen: çıkış " + cikis.length + " · parti " + giris.length);
    console.log("   ⚠ Kâr TAZELENMEDİ — ayrıca koşulmalı.\n");
    await p.$disconnect();
    return;
  }

  const kodlar = VAKALAR.map((v) => v.kod);
  const satislar = await p.sale.findMany({
    where: { code: { in: kodlar } },
    select: {
      id: true, code: true, soldAt: true, iptalTarihi: true, profitStatus: true,
      items: {
        select: {
          id: true, quantity: true, unitPriceAmount: true, profitStatus: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
          stockMovements: { select: { id: true } },
        },
      },
    },
  });
  const harita = new Map(satislar.map((x) => [x.code!, x]));

  type Plan = {
    kod: string; saleItemId: string; variantId: string; sku: string;
    adet: number; birim: number; soldAt: Date; gerekce: string;
  };
  const plan: Plan[] = [];
  const atlanan: string[] = [];

  console.log("\n① PLAN");
  for (const v of VAKALAR) {
    const s = harita.get(v.kod);
    if (!s) { atlanan.push(v.kod + " — sistemde YOK"); continue; }
    if (s.iptalTarihi) { atlanan.push(v.kod + " — İPTALLİ"); continue; }
    console.log("\n   ● " + v.kod + " · " + s.soldAt.toISOString().slice(0, 10) +
      " · kâr " + s.profitStatus);
    for (const k of s.items) {
      if (k.stockMovements.length > 0) {
        console.log("     " + (k.variant.sku ?? "—").padEnd(13) +
          "⛔ ATLANDI — zaten stok hareketi VAR (maliyeti bağlı)");
        atlanan.push(v.kod + "/" + k.variant.sku + " — hareketi var");
        continue;
      }
      console.log("     " + (k.variant.sku ?? "—").padEnd(13) + "adet " + k.quantity +
        " · fiyat " + t2(Number(k.unitPriceAmount.toString())) +
        " · ⭐ MALİYET " + t2(v.birim) +
        (v.birim === 0 ? "   ← BEYAN EDİLMİŞ SIFIR" : ""));
      console.log("       " + (k.variant.product.name ?? "").slice(0, 62));
      plan.push({
        kod: v.kod, saleItemId: k.id, variantId: k.variant.id,
        sku: k.variant.sku ?? "—", adet: k.quantity, birim: v.birim,
        soldAt: s.soldAt, gerekce: v.gerekce,
      });
    }
  }

  const toplam = plan.reduce((t, x) => t + x.adet * x.birim, 0);
  console.log("\n② ÖZET");
  console.log("   yazılacak kalem " + plan.length + " · toplam maliyet " + t2(toplam));
  console.log("   ⭐ her kalem için: PURCHASE_IN (parti) + SALE_OUT (tüketim)");
  console.log("     ikisi de satış anına (`soldAt`) damgalanır — net stok DEĞİŞMEZ");
  if (atlanan.length > 0) {
    console.log("\n   ⛔ ATLANANLAR:");
    for (const a of atlanan) console.log("     " + a);
  }

  console.log("\n③ ⚠ SIFIR MALİYET — VARSAYIM DEĞİL BEYAN");
  const sifir = plan.filter((x) => x.birim === 0);
  console.log("   sıfır maliyetli kalem: " + sifir.length +
    (sifir.length > 0 ? "  (" + [...new Set(sifir.map((x) => x.sku))].join(" · ") + ")" : ""));
  console.log("   Halil: \"promosyon olarak geldi, maliyeti 0 olan ürünün satışıdır\".");
  console.log("   ⚠ `stok-duzeltme.ts` \"sıfır maliyet VARSAYILMAZ\" der — burada");
  console.log("     varsayılmıyor, BEYAN EDİLİYOR ve gerekçesi ize yazılıyor.");

  if (!YAZ) {
    console.log("\n" + "=".repeat(100));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:k74-maliyet -- --yaz");
    console.log("=".repeat(100) + "\n");
    await p.$disconnect();
    return;
  }

  // ═══ YAZIM ═══════════════════════════════════════════════════════════
  const stokOnce = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  console.log("\n⚠ YAZILIYOR — " + plan.length + " kalem");
  let ok = 0;
  for (const x of plan) {
    await p.$transaction(async (tx) => {
      const parti = await tx.stockMovement.create({
        data: {
          variantId: x.variantId, type: "PURCHASE_IN", quantityDelta: x.adet,
          occurredAt: x.soldAt,
          unitCostAmount: String(x.birim), unitCostCurrency: "TRY",
          note: PARTI + " · " + x.gerekce.slice(0, 160),
        },
      });
      await tx.stockMovement.create({
        data: {
          variantId: x.variantId, type: "SALE_OUT", quantityDelta: -x.adet,
          occurredAt: x.soldAt, saleItemId: x.saleItemId,
          sourceMovementId: parti.id,
          unitCostAmount: String(x.birim), unitCostCurrency: "TRY",
          note: PARTI,
        },
      });
    });
    ok++;
  }
  console.log("   ⭐ yazıldı " + ok);

  const stokSonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const fark = (stokSonra._sum.quantityDelta ?? 0) - (stokOnce._sum.quantityDelta ?? 0);
  console.log("\n   DOĞRULAMA:");
  console.log("     net stok farkı: " + fark + "   (beklenen 0 — parti ve tüketim eşit)" +
    (fark === 0 ? "   ✓" : "   ⛔"));
  const yazilan = await p.stockMovement.count({ where: { note: { contains: PARTI } } });
  console.log("     partiye ait hareket: " + yazilan + " / beklenen " + (ok * 2) +
    (yazilan === ok * 2 ? "   ✓" : "   ⛔"));

  console.log("\n④ KÂR TAZELENİYOR — uygulamanın kendi gövdesiyle");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const benzersiz = [...new Set(plan.map((x) => x.kod))];
  for (const kod of benzersiz) {
    const s = harita.get(kod)!;
    const ok2 = await satisKarTazele(s.id);
    const sonra = await p.sale.findUnique({
      where: { id: s.id },
      select: { profitStatus: true, net2Amount: true },
    });
    console.log("   " + kod.padEnd(14) + (ok2 ? "✓" : "⛔") +
      "  " + s.profitStatus + " → " + sonra?.profitStatus +
      " · NET-2 " + (sonra?.net2Amount === null || sonra?.net2Amount === undefined
        ? "—" : Number(sonra.net2Amount.toString()).toFixed(2)));
  }

  await p.auditLog.create({
    data: {
      action: "K74_MALIYET_YAZILDI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        parti: PARTI,
        gerekce: "Halil'in bildirdiği maliyetler, 28.08.2026. Her siparişin gerekçesi ayrı.",
        vakalar: VAKALAR,
        kalem: ok,
        toplamMaliyet: toplam.toFixed(2),
        atlanan,
        sifirMaliyet: "Dört promosyon siparişinde maliyet 0 — VARSAYIM DEĞİL, Halil'in beyanı.",
      }),
    },
  });
  console.log("\n   ✓ AuditLog: K74_MALIYET_YAZILDI");

  console.log("\n" + "=".repeat(100));
  console.log("YAZILDI. Geri alma: npm run canli:k74-maliyet -- --geri");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
