/** BETIK SINIFI: SUREKLI — GitHub gece turunun BOŞ test veritabanına örnek veri kurar; yerel olmayan adreste DURUR. */
/**
 * ============================================================================
 *  GECE TURU TOHUMU — GITHUB'DAKİ BOŞ VERİTABANINA ÖRNEK VERİ (15.10.2026)
 *      npx tsx scripts/gece-turu-tohum.ts     (GitHub kipinde gece-turu.ts çağırır)
 * ----------------------------------------------------------------------------
 *  NİYE VAR: gece turu GitHub'a taşındı ve orada veritabanı her gece BOŞ başlar.
 *  Ölçüldü (15.10.2026, boş veritabanıyla tam tur provası): veri isteyen bekçiler
 *  boşta YEŞİL kalıyor ama ölçmüyor — `toplu` «en az 3 varyant gerekiyor» deyip
 *  ATLIYOR; `yedek` örnek satış/maliyet bulamayınca «NET-1 birebir aynı» gibi
 *  ölçütleri hiç koşmuyor. Yeşil, koruma olmadığını gizlerdi (anayasa: boş ≠ temiz).
 *
 *  NE KURAR: projenin temel tohumu (`prisma/seed.ts`: kanallar · kâr kuralları ·
 *  kargo tarifeleri · nedenler · roller) + `TOHUM-` önekli 4 ürün, alım partileri
 *  (maliyetli) ve sistemin KENDİ satış yolundan (`satisKaydet`: FIFO + kâr) 2 satış.
 *  ⛔ CANLIYA ASLA: adres yerel değilse (localhost/127.0.0.1) DURUR, çıkış 1.
 *  İkinci koşum zararsız: `TOHUM-` ürünleri varsa satır eklemez.
 * ============================================================================
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

async function main() {
  const adres = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(adres)) {
    console.error("⛔ TOHUM DURDU — DATABASE_URL yerel değil. Bu betik yalnız boş test veritabanına yazar.");
    process.exitCode = 1;
    return;
  }

  const temel = spawnSync("npx tsx prisma/seed.ts", { shell: true, encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 });
  console.log((temel.stdout ?? "").split("\n").slice(-6).join("\n"));
  if (temel.status !== 0) {
    console.error("⛔ temel tohum düştü:\n" + (temel.stderr ?? "") + (temel.stdout ?? ""));
    process.exitCode = 1;
    return;
  }

  const { prisma } = await import("../src/lib/prisma");
  const { satisKaydet } = await import("../src/lib/satis");
  try {
    if ((await prisma.product.count({ where: { name: { startsWith: "TOHUM-" } } })) > 0) {
      console.log("tohum zaten var — eklenmedi");
      return;
    }
    const kanal = await prisma.channel.findFirst({ where: { type: "MARKETPLACE" }, orderBy: { code: "asc" } });
    if (!kanal) throw new Error("temel tohumdan sonra pazaryeri kanalı yok");
    const hesap = await prisma.channelAccount.create({
      data: { channelId: kanal.id, code: "TOHUM-H", name: "TOHUM Hesap", defaultCurrency: "TRY" },
    });
    const kategori = await prisma.category.findFirst({ orderBy: { name: "asc" } });

    const varyantlar: string[] = [];
    const urunler = [
      { ad: "TOHUM-Tencere", maliyet: "1604.00", fiyat: "2834.00" },
      { ad: "TOHUM-Blender", maliyet: "999.00", fiyat: "1699.00" },
      { ad: "TOHUM-Ütü", maliyet: "450.50", fiyat: "799.90" },
      { ad: "TOHUM-Kettle", maliyet: "320.00", fiyat: "549.00" },
    ];
    for (const [i, u] of urunler.entries()) {
      const urun = await prisma.product.create({
        data: {
          name: u.ad,
          ...(kategori ? { categoryId: kategori.id } : {}),
          variants: { create: { sku: `TOHUM-SKU-${i + 1}`, companySku: `TOHUM-FSKU-${i + 1}`, isDefault: true } },
        },
        include: { variants: true },
      });
      const v = urun.variants[0]!.id;
      varyantlar.push(v);
      await prisma.stockMovement.create({
        data: { variantId: v, type: "PURCHASE_IN", quantityDelta: 10, occurredAt: new Date("2026-09-01T09:00:00Z"), unitCostAmount: u.maliyet, unitCostCurrency: "TRY" },
      });
    }

    for (const [i, gun] of ["2026-09-10T10:00:00Z", "2026-09-20T10:00:00Z"].entries()) {
      await satisKaydet({
        code: `TOHUM-SIP-${i + 1}`,
        shipmentCode: null,
        channelAccountId: hesap.id,
        soldAt: new Date(gun),
        note: null,
        cargoCarrierId: null,
        cargoDesi: null,
        cargoAmountManual: null,
        kalemler: [
          { variantId: varyantlar[i]!, quantity: 1, unitPriceAmount: urunler[i]!.fiyat, unitPriceCurrency: "TRY", vatRate: 20, commissionRate: 10, commissionAmount: Number(urunler[i]!.fiyat) * 0.1, secilenPartiId: null },
        ],
      });
    }
    const ozet = {
      urun: await prisma.product.count(),
      varyant: await prisma.productVariant.count(),
      hareket: await prisma.stockMovement.count(),
      satis: await prisma.sale.count(),
      net1Dolu: await prisma.sale.count({ where: { net1Amount: { not: null } } }),
    };
    console.log("tohum kuruldu:", JSON.stringify(ozet));
    /* Boş tohum «kuruldu» sayılmaz: veri isteyen bekçilerin tabanı burada ölçülür. */
    if (ozet.varyant < 3 || ozet.satis < 2 || ozet.net1Dolu < 1) {
      console.error("⛔ tohum EKSİK — veri isteyen bekçiler atlayabilir:", JSON.stringify(ozet));
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("⛔ TOHUM HATASI:", e);
  process.exitCode = 1;
});
