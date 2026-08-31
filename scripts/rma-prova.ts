/** BETIK SINIFI: TEK_SEFERLIK — PROVA — iade akisini sinar, canli stoga dokunmaz. */
/**
 * ============================================================================
 *  RMA PROVASI — 6. SENARYO, GERÇEK FIFO İLE (YEREL)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run rma:prova
 *
 *  `rma:dogrula`dan FARKI: o saf planı sınar (veritabanına gitmez), bu ise
 *  GERÇEK YAZIM YOLUNU sınar. Alım → mal kabul → satış → 6. senaryo iadesi
 *  zincirini kurar, defteri ve kâr durumunu veritabanından geri okur.
 *
 *  MİMAR KİLİTLERİ (14.08.2026) — kanıt burada üretilir:
 *    1. DÜZELTME +1'in birim maliyeti = ters çevirdiği SALE_OUT'un maliyeti,
 *       BİREBİR (veritabanından okunan iki Decimal metni karşılaştırılır).
 *    2. Satış kârı NO_COST/RULE_MISSING rozetine DÜŞMEZ — beş hareketlik
 *       defter kapandıktan sonra da CALCULATED kalır.
 *    3. Defter neti: satılan varyant −1, yanlış giden varyant 0.
 *
 *  ⚠ BU BETİK YAZAR. Canlı adreste çalışmayı REDDEDER; açtığı her kaydı
 *  `finally` içinde siler (kontroller patlasa bile).
 * ============================================================================
 */
import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { gunDegeri } from "../src/lib/donem";
import { iadeKaydet } from "../src/lib/iade";
import { satisKaydet } from "../src/lib/satis";

const ON_EK = "RMAPROVA-";
let gecti = 0;
let kaldi = 0;

function kontrol(ad: string, kosul: boolean, ayrinti?: unknown) {
  if (kosul) {
    gecti++;
    console.log(`  OK    ${ad}`);
  } else {
    kaldi++;
    console.log(`  HATA  ${ad}`);
    if (ayrinti !== undefined) console.log("        ", ayrinti);
  }
}

/** Yazan betik canlıya bağlanmaz — bkz. komisyon:prova ile aynı kapı. */
function yerelMi(adres: string | undefined): boolean {
  if (!adres) return false;
  try {
    const sunucu = new URL(adres).hostname.toLowerCase();
    return sunucu === "localhost" || sunucu === "127.0.0.1" || sunucu === "::1";
  } catch {
    return false;
  }
}

/** A'nın maliyeti: bu rakam kilidin öznesi. */
const A_MALIYET = "1799.0000";
/** B'nin maliyeti — A'dan FARKLI olmalı ki karışma yakalanabilsin. */
const B_MALIYET = "1250.5000";

/**
 * FIFO KENDİNE REFERANS VERİR (sourceMovementId): çocuk hareketler önce
 * silinmeli, yoksa yabancı anahtar kısıtı patlar. Temizlik sırası bu yüzden
 * iki geçişli.
 */
async function hareketleriSil(varyantlar: string[]) {
  await prisma.stockMovement.deleteMany({
    where: { variantId: { in: varyantlar }, NOT: { sourceMovementId: null } },
  });
  await prisma.stockMovement.deleteMany({
    where: { variantId: { in: varyantlar } },
  });
}

async function main() {
  if (!yerelMi(process.env.DATABASE_URL)) {
    console.log("\nKOŞULMADI — bu betik YAZAR ve yalnız yerel veritabanında çalışır.\n");
    process.exit(1);
  }

  const bugun = gunDegeri({ yil: 2026, ay: 8, gun: 14 });

  const kategori = await prisma.category.findFirst({ select: { id: true } });
  if (!kategori) throw new Error("yerelde kategori yok");

  const kanal = await prisma.channel.findFirst({ where: { code: "TRENDYOL" } });
  if (!kanal) throw new Error("yerelde TRENDYOL kanalı yok");

  // ------------------------------------------------------------------ KURULUM
  const hesap = await prisma.channelAccount.create({
    data: {
      channelId: kanal.id,
      code: `${ON_EK}H`,
      name: `${ON_EK}Mağaza`,
      defaultCurrency: "TRY",
      satisIcin: true,
    },
  });

  const urun = await prisma.product.create({
    data: {
      name: `${ON_EK}Ürün`,
      categoryId: kategori.id,
      variants: {
        create: [
          { sku: `${ON_EK}A`, companySku: `${ON_EK}A`, barcode: `${ON_EK}A`, isDefault: true },
          { sku: `${ON_EK}B`, companySku: `${ON_EK}B`, barcode: `${ON_EK}B` },
        ],
      },
    },
    include: { variants: true },
  });
  const A = urun.variants.find((v) => v.sku === `${ON_EK}A`)!.id;
  const B = urun.variants.find((v) => v.sku === `${ON_EK}B`)!.id;

  /**
   * FIFO PARTİLERİ — mal kabul hareketleriyle doğar. Alım kaydı üzerinden
   * gitmiyoruz: bu betiğin konusu iade defteri, alım akışı değil. Parti
   * doğuran hareket tipi aynı (PURCHASE_IN yerine INITIAL), FIFO motoru
   * ikisini de aynı okur.
   */
  await prisma.stockMovement.createMany({
    data: [
      {
        variantId: A,
        type: "INITIAL",
        quantityDelta: 5,
        occurredAt: bugun,
        unitCostAmount: A_MALIYET,
        unitCostCurrency: "TRY",
      },
      {
        variantId: B,
        type: "INITIAL",
        quantityDelta: 5,
        occurredAt: bugun,
        unitCostAmount: B_MALIYET,
        unitCostCurrency: "TRY",
      },
    ],
  });

  let satisId = "";
  try {
    // ------------------------------------------------------------- 1) SATIŞ
    console.log("\n1) SATIŞ — A satılıyor");
    satisId = await satisKaydet({
      code: `${ON_EK}SIP1`,
      shipmentCode: null,
      channelAccountId: hesap.id,
      soldAt: bugun,
      note: null,
      cargoCarrierId: null,
      cargoDesi: null,
      // Kargo elle veriliyor: tarife aranmasın, RULE_MISSING doğmasın.
      cargoAmountManual: 100,
      kalemler: [
        {
          variantId: A,
          quantity: 1,
          unitPriceAmount: "2500",
          unitPriceCurrency: "TRY",
          vatRate: 20,
          commissionRate: 15,
          commissionAmount: null,
          /** K110: seçim YOK — bu ölçütler FIFO varsayılanını sınıyor. */
          secilenPartiId: null,
        },
      ],
    });

    const satisOnce = await prisma.sale.findUnique({
      where: { id: satisId },
      select: { profitStatus: true, net2Amount: true },
    });
    kontrol(
      "satış kârı CALCULATED (ön şart)",
      satisOnce?.profitStatus === "CALCULATED",
      satisOnce?.profitStatus,
    );

    const saleOut = await prisma.stockMovement.findFirst({
      where: { variantId: A, type: "SALE_OUT" },
      select: { unitCostAmount: true, unitCostCurrency: true, quantityDelta: true },
    });
    kontrol(
      `SALE_OUT maliyeti ${A_MALIYET} (FIFO'dan)`,
      // Decimal METNİ sondaki sıfırları düşürüyor ("1799"): karşılaştırma
      // SAYISAL yapılır. Kilidin kendisi (DÜZELTME = SALE_OUT) yine
      // veritabanından okunan iki değer arasında.
      Number(saleOut?.unitCostAmount ?? NaN) === Number(A_MALIYET),
      saleOut?.unitCostAmount?.toString(),
    );

    // ------------------------------------------------- 2) 6. SENARYO İADESİ
    console.log("\n2) 6. SENARYO — A satıldı, B gönderildi, B dönüyor, A gidiyor");
    const kalem = await prisma.saleItem.findFirstOrThrow({
      where: { saleId: satisId },
      select: { id: true },
    });

    await iadeKaydet({
      saleId: satisId,
      code: `${ON_EK}IADE1`,
      returnType: "NORMAL",
      occurredAt: bugun,
      note: null,
      userId: null,
      degisimTeslimTarihi: bugun,
      iadeKargosu: 50,
      yenidenGonderimKargosu: 50,
      ceza: null,
      cezaNotu: null,
      kalemler: [
        {
          saleItemId: kalem.id,
          iadeAdedi: 1,
          saglamAdet: 1,
          hasarliAdet: 0,
          hasarNotu: null,
          locationId: null,
          // A şimdi gönderiliyor (değişim), B geri geliyor.
          exchangeVariantId: A,
          donenVaryantId: B,
        },
      ],
    });

    // ------------------------------------------------------- 3) KİLİTLER
    console.log("\n3) MİMAR KİLİTLERİ");

    const hareketler = await prisma.stockMovement.findMany({
      where: { variantId: { in: [A, B] } },
      select: {
        variantId: true,
        type: true,
        quantityDelta: true,
        unitCostAmount: true,
        unitCostCurrency: true,
        adjustmentReason: { select: { systemKey: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const duzeltmeArti = hareketler.find(
      (h) => h.variantId === A && h.type === "ADJUSTMENT" && h.quantityDelta > 0,
    );
    kontrol("A'ya DÜZELTME + yazıldı", duzeltmeArti !== undefined);
    /** KİLİT 1 — birebir maliyet. */
    kontrol(
      `DÜZELTME + maliyeti = SALE_OUT maliyeti (${A_MALIYET})`,
      duzeltmeArti?.unitCostAmount?.toString() === saleOut?.unitCostAmount?.toString(),
      {
        duzeltme: duzeltmeArti?.unitCostAmount?.toString(),
        saleOut: saleOut?.unitCostAmount?.toString(),
      },
    );
    kontrol(
      "  ...ve B'nin maliyetiyle KARIŞMADI",
      duzeltmeArti?.unitCostAmount?.toString() !== B_MALIYET,
    );
    kontrol(
      "düzeltme SEVKIYAT_HATASI nedenine bağlı (ada değil)",
      duzeltmeArti?.adjustmentReason?.systemKey === "SEVKIYAT_HATASI",
      duzeltmeArti?.adjustmentReason?.systemKey,
    );

    const bDuzeltmeEksi = hareketler.find(
      (h) => h.variantId === B && h.type === "ADJUSTMENT" && h.quantityDelta < 0,
    );
    kontrol("B'ye DÜZELTME − yazıldı", bDuzeltmeEksi !== undefined);
    kontrol(
      `B düzeltmesi kendi maliyetini taşıyor (${B_MALIYET})`,
      Number(bDuzeltmeEksi?.unitCostAmount ?? NaN) === Number(B_MALIYET),
      bDuzeltmeEksi?.unitCostAmount?.toString(),
    );

    const bReturnIn = hareketler.find(
      (h) => h.variantId === B && h.type === "RETURN_IN",
    );
    kontrol(
      "B'ye RETURN_IN yazıldı ve maliyeti çıkışın AYNASI",
      Number(bReturnIn?.unitCostAmount ?? NaN) === Number(B_MALIYET),
      bReturnIn?.unitCostAmount?.toString(),
    );

    const exchangeOut = hareketler.find(
      (h) => h.variantId === A && h.type === "EXCHANGE_OUT",
    );
    kontrol("A'ya EXCHANGE_OUT yazıldı (A şimdi gidiyor)", exchangeOut !== undefined);
    kontrol(
      "EXCHANGE_OUT maliyetsiz DEĞİL",
      exchangeOut?.unitCostAmount !== null,
      exchangeOut?.unitCostAmount?.toString(),
    );

    /** KİLİT 3 — defter neti. Başlangıç stoğu 5; A: 5−1=4, B: 5+0=5. */
    const net = (variantId: string) =>
      hareketler
        .filter((h) => h.variantId === variantId)
        .reduce((t, h) => t + h.quantityDelta, 0);
    kontrol("A stoğu 4 (5 giriş, net −1 hareket)", net(A) === 4, net(A));
    kontrol("B stoğu 5 (net 0 hareket)", net(B) === 5, net(B));

    /** KİLİT 2 — kâr rozeti temiz kaldı mı? */
    const satisSonra = await prisma.sale.findUnique({
      where: { id: satisId },
      select: { profitStatus: true, net1Amount: true, net2Amount: true },
    });
    kontrol(
      "satış kârı HÂLÂ CALCULATED (NO_COST/RULE_MISSING YOK)",
      satisSonra?.profitStatus === "CALCULATED",
      satisSonra?.profitStatus,
    );
    kontrol(
      "satışın NET-2'si hesaplı duruyor",
      satisSonra?.net2Amount !== null,
      satisSonra?.net2Amount?.toString(),
    );

    const iade = await prisma.return.findFirstOrThrow({
      where: { saleId: satisId },
      select: { profitStatus: true, net2Amount: true, fees: { select: { code: true } } },
    });
    kontrol(
      "iade kaydının kârı da CALCULATED",
      iade.profitStatus === "CALCULATED",
      iade.profitStatus,
    );
    /**
     * DEĞİŞİM OLDUĞU İÇİN CİRO DURUYOR: KAYIP_GELIR satırı OLUŞMAMALI.
     * 6. senaryoda müşteri parasını geri almıyor, doğru ürünü alıyor.
     */
    kontrol(
      "KAYIP_GELIR satırı YOK (değişimde ciro DURUR)",
      !iade.fees.some((f) => f.code === "KAYIP_GELIR"),
      iade.fees.map((f) => f.code),
    );
    kontrol(
      "DEGISIM_MALIYET satırı VAR (A'nın maliyeti gider yazıldı)",
      iade.fees.some((f) => f.code === "DEGISIM_MALIYET"),
      iade.fees.map((f) => f.code),
    );
  } finally {
    // ------------------------------------------------------------- TEMİZLİK
    console.log("\n4) TEMİZLİK");
    if (satisId) {
      const iadeler = await prisma.return.findMany({
        where: { saleId: satisId },
        select: { id: true },
      });
      await prisma.returnFee.deleteMany({
        where: { returnId: { in: iadeler.map((i) => i.id) } },
      });
      await hareketleriSil([A, B]);
      await prisma.returnItem.deleteMany({
        where: { returnId: { in: iadeler.map((i) => i.id) } },
      });
      await prisma.return.deleteMany({ where: { saleId: satisId } });
      await prisma.saleFee.deleteMany({ where: { saleId: satisId } });
      await prisma.saleItem.deleteMany({ where: { saleId: satisId } });
      await prisma.sale.delete({ where: { id: satisId } });
    }
    await hareketleriSil([A, B]);
    await prisma.channelSku.deleteMany({ where: { channelAccountId: hesap.id } });
    await prisma.productVariant.deleteMany({ where: { productId: urun.id } });
    await prisma.product.delete({ where: { id: urun.id } });
    await prisma.channelAccount.delete({ where: { id: hesap.id } });
    const kalan = await prisma.product.count({ where: { name: { startsWith: ON_EK } } });
    kontrol("prova kaydı kalmadı", kalan === 0, kalan);

    console.log("");
    console.log(
      kaldi === 0
        ? `TÜM KONTROLLER GEÇTİ (${gecti})`
        : `${kaldi} KONTROL BAŞARISIZ (${gecti + kaldi})`,
    );
    await prisma.$disconnect();
    process.exit(kaldi === 0 ? 0 : 1);
  }
}

main();
