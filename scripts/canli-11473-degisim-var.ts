/**
 * ============================================================================
 *  11473322212 — DEĞİŞİM GERÇEKTEN YAPILDI, ÇIKIŞ GERİ YAZILIR
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"Bu iade hasarlı geldi ve gerçekten yenisi ile
 *  değiştirilerek gönderildi, hasarlı ürün hurdaya çıktı çöp oldu."_
 *
 *  NE OLDU: sipariş "deneme testi" diye bildirilmişti ve
 *  `canli-deneme-sifirla.ts` değişim çıkışını geri aldı. Sonra değişimin
 *  GERÇEK olduğu söylendi.
 *
 *  ⚠ HURDA TARAFI ZATEN DOĞRU. `axcali1672` (kırık kettle) K38 ile hurdaya
 *  düşürüldü ve stoğu 0 — ona dokunulmuyor.
 *
 *  ⚠ NET BAKİYE ÜZERİNDEN. Defterde iki `EXCHANGE_OUT` satırı var (−1 ve
 *  +1), net 0. Hedef −1. Tek düzeltme yazılır; tek tek terslemek defteri
 *  dört satıra çıkarır ve okunamaz yapar.
 *
 *  ⚠ SİLME YOK: ilk çıkış bir FIFO partisi tüketti; silmek o bağı koparır.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-11473-degisim-var.ts           → RAPOR
 *    npx tsx scripts/canli-11473-degisim-var.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "11473322212";
const SKU = "axcali1610";
const HEDEF_BAKIYE = -1;
const EYLEM = "DEGISIM_GERI_YAZILDI";
const GEREKCE =
  "Değişim gerçekten yapıldı — yenisi gönderildi (kullanıcı beyanı 23.08.2026)";

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log(`DEĞİŞİM GERİ YAZILIYOR — ${SIPARIS_NO}`);
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      id: true,
      net1Amount: true,
      net2Amount: true,
      items: {
        select: {
          id: true,
          stockMovements: {
            where: { type: "EXCHANGE_OUT" },
            select: {
              quantityDelta: true,
              variantId: true,
              unitCostAmount: true,
              unitCostCurrency: true,
              locationId: true,
              variant: { select: { sku: true } },
            },
          },
        },
      },
    },
  });
  if (!satis) {
    console.log("satış bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  const zaten = await prisma.auditLog.findFirst({
    where: { action: EYLEM, targetId: satis.id },
    select: { createdAt: true },
  });
  if (zaten) {
    console.log(`Zaten uygulanmış (${zaten.createdAt.toISOString()}) — betik durdu.`);
    return;
  }

  const hareketler = satis.items.flatMap((k) =>
    k.stockMovements.map((h) => ({ ...h, saleItemId: k.id })),
  );
  const bakiye = hareketler.reduce((t, h) => t + h.quantityDelta, 0);
  const duzeltme = HEDEF_BAKIYE - bakiye;

  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true },
  });
  const oncekiStok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant?.id },
    _sum: { quantityDelta: true },
  });

  console.log(`\n  ÖNCE  NET-1 ${satis.net1Amount?.toString()} · NET-2 ${satis.net2Amount?.toString()}`);
  console.log(`  ${SKU} stok: ${oncekiStok._sum.quantityDelta ?? 0}`);
  console.log(`  EXCHANGE_OUT satırı: ${hareketler.length} · net bakiye ${bakiye} · hedef ${HEDEF_BAKIYE}`);
  console.log(`  yazılacak düzeltme: ${duzeltme}`);

  if (duzeltme === 0) {
    console.log("\n  bakiye zaten doğru — yapılacak bir şey yok.");
    return;
  }
  if (!uygula) {
    console.log("\nRAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  const ornek = hareketler.find((h) => h.variant.sku === SKU) ?? hareketler[0];
  if (!ornek) {
    console.log("örnek hareket bulunamadı — betik durdu (maliyet uydurulmaz).");
    process.exitCode = 1;
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        variantId: ornek.variantId,
        type: "EXCHANGE_OUT",
        quantityDelta: duzeltme,
        occurredAt: new Date(),
        saleItemId: ornek.saleItemId,
        locationId: ornek.locationId,
        unitCostAmount: ornek.unitCostAmount,
        unitCostCurrency: ornek.unitCostCurrency,
        note: GEREKCE,
      },
    });
    await tx.auditLog.create({
      data: {
        action: EYLEM,
        targetType: "Sale",
        targetId: satis.id,
        detail: JSON.stringify({
          siparisNo: SIPARIS_NO,
          sku: SKU,
          oncekiBakiye: bakiye,
          hedefBakiye: HEDEF_BAKIYE,
          yazilanDuzeltme: duzeltme,
          gerekce: GEREKCE,
        }),
      },
    });
  });

  await satisKarTazele(satis.id);

  const sonra = await prisma.sale.findUnique({
    where: { id: satis.id },
    select: { net1Amount: true, net2Amount: true },
  });
  const sonrakiStok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant?.id },
    _sum: { quantityDelta: true },
  });
  console.log(`\n  SONRA NET-1 ${sonra?.net1Amount?.toString()} · NET-2 ${sonra?.net2Amount?.toString()}`);
  console.log(`  ${SKU} stok: ${sonrakiStok._sum.quantityDelta ?? 0}`);
}

main();
