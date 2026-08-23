/**
 * ============================================================================
 *  K38 — KIRIK axcali1672 HURDAYA DÜŞÜLÜR (tek vaka, kimliğe kilitli)
 * ----------------------------------------------------------------------------
 *  HALİL HÜKMÜ 23.08.2026: `11473322212` satışından dönen kırık kettle ÇÖP.
 *  Satılabilir stoktan düşülür.
 *
 *  VAKA NASIL DOĞDU: iade işlenirken form "1 sağlam" diye ön-dolu geliyordu
 *  (o hata 23.08'de düzeltildi) ve kırık mal STOĞA GİRDİ — `RETURN_IN +1 ×
 *  ₺1799`. Ürün bugün satılabilir görünüyor.
 *
 *  ⚠ KİMLİĞE KİLİTLİ, GENEL ARAÇ DEĞİL. Anayasa: _"betik o kaydın kimliğine
 *  kilitli olur; genel araç haline getirilmez — genel araç, istisnayı kurala
 *  çevirir."_ SKU ve sipariş no sabit; başka bir kayıt için koşmaz.
 *
 *  ⚠ NİYE `returnItemId` YOK — VE BU ÖLÇÜMLE KARARLAŞTIRILDI.
 *  Rapor "fire zararı"nı `ADJUSTMENT`/`COUNT_CORRECTION` hareketlerinden
 *  türetiyor ama `returnItemId` DOLU olanları bilerek DIŞLIYOR (çift sayım
 *  koruması: o paranın etkisi iadenin NET-2'sinde zaten var). Hurdayı iadeye
 *  bağlasaydık HİÇBİR YERE yazılmayacaktı.
 *  Mimar kararı: hareket bağsız yazılır → fire zararına girer; bağ
 *  `AuditLog`ta YAPILANDIRILMIŞ (JSON) durur.
 *
 *  ⚠ ELLE İKİNCİ GİDER YOLU KAPALI. Zarar hareketin KENDİSİNDEN doğuyor;
 *  ayrıca bir `Expense` satırı YAZILMIYOR. Aynı zarar iki kez yazılamaz.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-hurda-axcali1672.ts           → yalnız RAPOR
 *    npx tsx scripts/canli-hurda-axcali1672.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⚠ KİMLİK SABİT — betik yalnız bu vaka için. */
const SKU = "axcali1672";
const SIPARIS_NO = "11473322212";
const NEDEN_ADI = "Hasar / kırılma";
const HUKUM = "Halil hükmü 23.08.2026: çöp";
const HURDA_EYLEMI = "STOK_HURDA";

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
  const { acikPartiler, fifoDagit } = await import("../src/lib/stok");

  console.log("");
  console.log("K38 — HURDA DÜŞÜŞÜ");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  kip        ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (!varyant) {
    console.log(`${SKU} bulunamadı — betik durdu.`);
    process.exitCode = 1;
    return;
  }

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      id: true,
      code: true,
      net1Amount: true,
      net2Amount: true,
      returnNotices: {
        where: { NOT: { returnId: null } },
        select: { id: true, returnId: true },
      },
    },
  });
  if (!satis) {
    console.log(`${SIPARIS_NO} bulunamadı — betik durdu.`);
    process.exitCode = 1;
    return;
  }

  const neden = await prisma.stockAdjustmentReason.findFirst({
    where: { name: NEDEN_ADI, isActive: true },
    select: { id: true, name: true, movementType: true, yon: true },
  });
  if (!neden) {
    console.log(`"${NEDEN_ADI}" nedeni bulunamadı — betik durdu.`);
    process.exitCode = 1;
    return;
  }

  /** ⚠ İKİNCİ KEZ KOŞMAYI ENGELLE — aynı mal iki kez hurdaya düşmez. */
  const oncekiIz = await prisma.auditLog.findFirst({
    where: { action: HURDA_EYLEMI, targetId: varyant.id },
    select: { id: true, createdAt: true },
  });

  const oncekiStok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });
  const partiler = await acikPartiler(prisma, varyant.id);

  console.log("ÖNCE");
  console.log(`  ${varyant.sku} — ${varyant.product.name}`);
  console.log(`  ledger stoğu      ${oncekiStok._sum.quantityDelta ?? 0}`);
  console.log(`  açık parti        ${partiler.length}`);
  for (const p of partiler) {
    console.log(
      `    kalan ${p.kalanAdet} × ${p.birimMaliyet ?? "?"} ${p.birimMaliyetParaBirimi ?? ""}`,
    );
  }
  console.log(`  satış NET-1       ${satis.net1Amount?.toString() ?? "—"}`);
  console.log(`  satış NET-2       ${satis.net2Amount?.toString() ?? "—"}`);
  console.log(`  neden             ${neden.name} (${neden.movementType}, ${neden.yon})`);
  console.log(`  önceki hurda izi  ${oncekiIz ? oncekiIz.createdAt.toISOString() : "yok"}`);
  console.log("");

  if (oncekiIz) {
    console.log("Bu varyant için hurda izi ZATEN var — betik durdu.");
    return;
  }

  const dagitim = fifoDagit(partiler, 1);
  if (!dagitim.yeterliMi) {
    console.log(`Stok yetersiz: ${dagitim.mevcut} adet — betik durdu.`);
    process.exitCode = 1;
    return;
  }
  const pay = dagitim.dagitim[0];
  console.log(
    `YAZILACAK: ADJUSTMENT −1 × ${pay.parti.birimMaliyet ?? "?"} ${pay.parti.birimMaliyetParaBirimi ?? ""} (parti ${pay.parti.hareketId})`,
  );
  console.log(`           returnItemId YOK — fire zararına girsin diye`);
  console.log("");

  if (!uygula) {
    console.log("RAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  const bildirim = satis.returnNotices[0] ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        variantId: varyant.id,
        type: neden.movementType,
        quantityDelta: -1,
        occurredAt: new Date(),
        /** ⚠ returnItemId BİLEREK YOK — fire zararı dışlamasına takılmasın. */
        sourceMovementId: pay.parti.hareketId,
        locationId: pay.parti.locationId,
        unitCostAmount: pay.parti.birimMaliyet,
        unitCostCurrency: pay.parti.birimMaliyetParaBirimi,
        adjustmentReasonId: neden.id,
        note: `${HUKUM} · sipariş ${SIPARIS_NO}`,
      },
    });

    /**
     * ⚠ BAĞ BURADA VE YAPILANDIRILMIŞ. Serbest metin `note` tek başına
     * yetmez — üç ay sonra "hangi hurdalar hangi siparişten" sorusu
     * aranabilir olmalı.
     */
    await tx.auditLog.create({
      data: {
        action: HURDA_EYLEMI,
        targetType: "ProductVariant",
        targetId: varyant.id,
        detail: JSON.stringify({
          sku: varyant.sku,
          siparisNo: SIPARIS_NO,
          saleId: satis.id,
          bildirimId: bildirim?.id ?? null,
          returnId: bildirim?.returnId ?? null,
          adet: 1,
          birimMaliyet: pay.parti.birimMaliyet,
          paraBirimi: pay.parti.birimMaliyetParaBirimi,
          partiHareketId: pay.parti.hareketId,
          hukum: HUKUM,
        }),
      },
    });
  });

  const sonrakiStok = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });
  const sonrakiSatis = await prisma.sale.findUnique({
    where: { id: satis.id },
    select: { net1Amount: true, net2Amount: true },
  });

  console.log("SONRA");
  console.log(`  ledger stoğu      ${sonrakiStok._sum.quantityDelta ?? 0}`);
  console.log(`  satış NET-1       ${sonrakiSatis?.net1Amount?.toString() ?? "—"}`);
  console.log(`  satış NET-2       ${sonrakiSatis?.net2Amount?.toString() ?? "—"}`);
  console.log("");
  console.log("⚠ SATIŞIN NET'İ DEĞİŞMEMELİ — hurda DÖNEM kalemidir (fire zararı).");
}

main();
