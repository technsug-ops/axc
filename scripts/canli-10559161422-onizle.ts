import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K180 ⑦ — MÜKERRER SATIR ÖNİZLEMESİ · SATIŞ 10559161422 (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-10559161422-onizle.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir kaydın sorusunu cevaplar.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ. Kaldırmayı EKRAN yapacak; bu betiğin tek işi
 *  Halil'in ekranda göreceği rakamları ÖNCEDEN yazmak, ki teslim raporu ile
 *  ekran BİREBİR karşılaştırılabilsin.
 *  _(Anayasa: "ekrandaki rakamlar teslim raporundakiyle birebir tutmalı".)_
 *
 *  ── VAKA ────────────────────────────────────────────────────────────────
 *  İçe aktarma dosyası aynı satırı İKİ KEZ taşımış; içe aktarıcı sadakatle
 *  iki kalem yazmış. Halil: _"sadece 1 tanesi yanlış, diğeri doğru."_
 * ============================================================================
 */

const KOD = "10559161422";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kaldirmaOnizle } = await import("../src/lib/kalem-kaldirma-veri");

  console.log("\nK180 ⑦ — MÜKERRER SATIR ÖNİZLEMESİ · " + KOD);
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("=".repeat(72));

  const satis = await prisma.sale.findFirst({
    where: { code: KOD },
    select: {
      id: true,
      code: true,
      soldAt: true,
      iptalTarihi: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          net2Amount: true,
          kaldirildiAt: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
          returnItems: { select: { quantity: true } },
          stockMovements: { select: { type: true, quantityDelta: true } },
        },
      },
    },
  });

  if (satis === null) {
    console.log("⛔ Satış bulunamadı: " + KOD);
    await prisma.$disconnect();
    return;
  }

  console.log("\n① SATIŞIN BUGÜNKÜ HÂLİ");
  console.log("   satıldı   " + satis.soldAt.toISOString().slice(0, 10));
  console.log("   iptal     " + (satis.iptalTarihi ? "EVET" : "hayır"));
  console.log("   NET-1     " + (satis.net1Amount?.toString() ?? "yok"));
  console.log("   NET-2     " + (satis.net2Amount?.toString() ?? "yok"));
  console.log("   durum     " + (satis.profitStatus ?? "-"));
  console.log("\n   KALEMLER");
  let ciro = 0;
  for (const k of satis.items) {
    const tutar = Number(k.unitPriceAmount.toString()) * k.quantity;
    if (k.kaldirildiAt === null) ciro += tutar;
    const iade = k.returnItems.reduce((t, r) => t + r.quantity, 0);
    const net = k.stockMovements.reduce((t, h) => t + h.quantityDelta, 0);
    console.log(
      `     ${k.id}  ${k.variant.sku.padEnd(14)} ${k.quantity} × ` +
        `${k.unitPriceAmount.toString()} = ${tutar.toFixed(2)}` +
        (k.kaldirildiAt ? "  [KALDIRILMIŞ]" : "") +
        (iade > 0 ? `  iade ${iade}` : "") +
        `  · net hareket ${net}`,
    );
    console.log(`       ${k.variant.product.name.slice(0, 58)}`);
  }
  console.log(`   ciro (geçerli kalemler)  ${ciro.toFixed(2)}`);

  /* ═══ ② HANGİSİ KALDIRILACAK ═══════════════════════════════════════ */
  /**
   * ⚠ MÜKERRER OLAN İKİNCİSİ SAYILIR — "aynı varyanttan ikinci kalem".
   * Hangisinin kaldırılacağı KARARI ekranda Halil'in; burada yalnız aday
   * gösteriliyor ve ikisinin de AYNI olduğu ölçülüyor.
   */
  const gruplar = new Map<string, typeof satis.items>();
  for (const k of satis.items) {
    if (k.kaldirildiAt !== null) continue;
    const liste = gruplar.get(k.variant.sku) ?? [];
    liste.push(k);
    gruplar.set(k.variant.sku, liste);
  }
  const mukerrer = [...gruplar].filter(([, l]) => l.length > 1);

  console.log("\n② MÜKERRER ADAY");
  if (mukerrer.length === 0) {
    console.log("   YOK — aynı varyanttan ikinci geçerli kalem bulunmuyor.");
    console.log("   ⚠ Zaten düzeltilmiş olabilir; ① listesine bakın.");
  }
  for (const [sku, liste] of mukerrer) {
    console.log(`   ${sku} — ${liste.length} geçerli kalem (biri fazla)`);
    for (const k of liste) {
      const o = await kaldirmaOnizle(k.id, "MUKERRER_SATIR", null);
      if (o === null) continue;
      console.log(`     kalem ${k.id}`);
      if (!o.plan.olur) {
        console.log(`       ⛔ KALDIRILAMAZ — engel: ${o.plan.engel}`);
        continue;
      }
      console.log(
        `       ✓ kaldırılabilir · stoğa dönecek ${o.plan.geriDonenAdet} adet · ` +
          `ciro etkisi ${o.plan.etki.ciro.toFixed(2)} ${o.plan.etki.paraBirimi}`,
      );
      console.log(
        `       kalemin NET-2 ${o.plan.etki.net2 ?? "hesaplanamadı"} · ` +
          `kaldırınca kalan kalem ${o.plan.etki.kalanKalemSayisi}`,
      );
      for (const h of o.plan.hareketler) {
        console.log(
          `       ayna: +${h.quantityDelta} adet · birim maliyet ` +
            `${h.birimMaliyet ?? "?"} ${h.birimMaliyetParaBirimi ?? ""}`,
        );
      }
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("  SALT OKUMA — kaldırma EKRANDAN yapılır, bu betikten değil.");
  await prisma.$disconnect();
}

void main();
