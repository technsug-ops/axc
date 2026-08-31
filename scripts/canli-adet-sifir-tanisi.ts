import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ADET = 0 SATIŞ KALEMİ — TEŞHİS (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — bir aykırılığı tanır, rutin koşmaz.
 *
 *  ⛔ NİYE: 31.08.2026 rakam sağlığı ölçümü 6002 satış kaleminin **1'inde**
 *  adet `0` buldu. Adet sıfır olan bir satış kalemi anlamsızdır: ne stok
 *  düşürür ne ciro üretir — ama bir SATIRDIR ve sayımlara girer.
 *
 *  ⛔ VE BU BETİK KARAR VERMEZ. Anayasa: "imkânsız görünen değer önce
 *  DOĞRULANIR — düzeltilmez." Sil/düzelt kararı mimarda ve Halil'de; burada
 *  yalnız kaydın NE OLDUĞU ölçülür.
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nADET = 0 SATIŞ KALEMİ — TEŞHİS");
  console.log("  kip  SALT OKUMA — hiçbir şey yazılmaz");
  console.log("=".repeat(66));

  const kalemler = await prisma.saleItem.findMany({
    where: { quantity: 0 },
    select: {
      id: true,
      quantity: true,
      unitPriceAmount: true,
      vatRate: true,
      commissionRate: true,
      variant: { select: { sku: true, name: true } },
      sale: {
        select: {
          id: true,
          code: true,
          soldAt: true,
          iptalTarihi: true,
          importBatch: true,
          profitStatus: true,
          net1Amount: true,
          net2Amount: true,
          channelAccount: {
            select: { name: true, channel: { select: { name: true } } },
          },
          items: { select: { id: true, quantity: true } },
        },
      },
      stockMovements: {
        select: { id: true, type: true, quantityDelta: true },
      },
    },
  });

  console.log(`\n   adet = 0 olan kalem sayısı   ${kalemler.length}\n`);
  if (kalemler.length === 0) {
    console.log("   (yok — kayıt düzelmiş olabilir, ölçüm tarihine bakın)");
    await prisma.$disconnect();
    return;
  }

  for (const k of kalemler) {
    const s = k.sale;
    console.log("   " + "-".repeat(60));
    console.log(`   satış kodu        ${s.code ?? "—"}`);
    console.log(`   (kod = pazaryeri sipariş no)`);
    console.log(`   kanal / hesap     ${s.channelAccount.channel.name} / ${s.channelAccount.name}`);
    console.log(`   satış tarihi      ${s.soldAt.toISOString().slice(0, 10)}`);
    /** ⚠ KAYNAK: içe aktarma mı elle giriş mi — düzeltme yolu buna bağlı. */
    console.log(
      `   KAYNAK            ${s.importBatch === null ? "ELLE GİRİLMİŞ" : "İÇE AKTARMA (" + s.importBatch + ")"}`,
    );
    console.log(
      `   İPTAL Mİ          ${s.iptalTarihi === null ? "HAYIR — canlı kayıt" : "EVET (" + s.iptalTarihi.toISOString().slice(0, 10) + ")"}`,
    );
    console.log(`   kâr damgası       ${s.profitStatus ?? "—"}`);
    console.log(
      `   NET-1 / NET-2     ${s.net1Amount?.toString() ?? "—"} / ${s.net2Amount?.toString() ?? "—"}`,
    );
    console.log(`   ürün              ${k.variant.sku} — ${k.variant.name ?? "—"}`);
    console.log(`   birim fiyat       ${k.unitPriceAmount.toString()}`);
    /**
     * ⚠ NET'E ETKİSİ: adet 0 ise bu kalemin ciro katkısı 0'dır. Ama satışın
     * ÖTEKİ kalemleri varsa NET yine de gerçektir — kalem anlamsız, satış
     * değil. Ayrımı burada ölçüyoruz.
     */
    const digerler = s.items.filter((i) => i.id !== k.id);
    console.log(`   satıştaki DİĞER kalem sayısı  ${digerler.length}`);
    if (digerler.length > 0) {
      console.log(
        `     adetleri: ${digerler.map((d) => d.quantity).join(" · ")}`,
      );
    }
    console.log(
      `   bu kalemin ciro katkısı       ${(Number(k.unitPriceAmount.toString()) * k.quantity).toFixed(2)} (adet 0 → sıfır)`,
    );
    /**
     * ⚠ STOK HAREKETİ VAR MI: varsa stok bu kalem yüzünden kaymış olabilir
     * ve iş yalnız "satır silmek" değildir.
     */
    console.log(`   bağlı stok hareketi           ${k.stockMovements.length}`);
    for (const h of k.stockMovements) {
      console.log(`     ${h.type}  ${h.quantityDelta}`);
    }
  }

  console.log("\n   " + "-".repeat(60));
  console.log("   ⛔ BU BETİK KARAR VERMEZ — sil/düzelt kararı mimar + Halil'de.");

  await prisma.$disconnect();
}

void main();
