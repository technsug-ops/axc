import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K180 — HAYALET STOK DÜZELTMESİ · axcali3134 (KİMLİĞE KİLİTLİ)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-axcali3134-hayalet-stok.ts            → KURU
 *      npx tsx scripts/canli-axcali3134-hayalet-stok.ts --uygula   → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir kaydın tek bir düzeltmesi.
 *
 *  ⛔ GENEL ARAÇ DEĞİL, KİMLİĞE KİLİTLİ. Varyant `axcali3134`, satış
 *  `10559161422` ve o satışın KALDIRILMIŞ kalemi dışında hiçbir şeye
 *  dokunmaz. _(Anayasa: "genel araç, istisnayı kurala çevirir".)_
 *
 *  ── VAKA (Halil, 07.09.2026) ────────────────────────────────────────────
 *  _"sayım da yoktu, eski siparişlerden, mükerrer girmişim siparişi; şimdi
 *  onu düzeltti ama stoğa attı, stok 0 olması lazımken 1 görünüyor."_
 *
 *  📏 ÖLÇÜLDÜ — varyantın GERÇEK ALIMI HİÇ YOK. Bütün girişleri hizalama
 *  betiklerinin yazdığı kâğıt kayıtlar ve her biri kendi satışını dengeleyen
 *  bir çift (`dosya-maliyet-20260828` · `listeye-hizala-2`):
 *
 *      2025-10-02  PURCHASE_IN    +1  "listeye-hizala-2"   ← KÂĞIT giriş
 *      2025-10-02  SALE_OUT       -1  10559161422          ← mükerrer satır
 *      2026-08-29  SALE_CANCEL_IN +1  "mukerrer kalem"     ← ilk nötrleme
 *      2026-09-01  COUNT_CORRECTION -1                     ← SAYIM 0 dedi
 *      2026-09-07  SALE_CANCEL_IN +1  ← K180 kaldırması    ⛔ HAYALET +1
 *
 *  Kaldırma, satırın çıkışını aynalayıp malı stoğa geri veriyor; bu GERÇEKTEN
 *  sevk edilmiş bir satır için doğru. Mükerrer satırda çıkışın arkasındaki
 *  giriş de kâğıttı — geri dönecek mal YOK.
 *
 *  ── ⚠ NİYE `COUNT_CORRECTION` DEĞİL `ADJUSTMENT` ───────────────────────
 *  Halil "COUNT_CORRECTION −1" dedi. Ama aynı mesajda **"sayım da yoktu"**
 *  diyor: o türle yazmak, defterde OLMAMIŞ bir sayımı iddia etmek olurdu ve
 *  hareket bir `StokSayimSatiri`na da bağlanamazdı.
 *  `ADJUSTMENT` = "manuel düzeltme" (şema yorumu) — olanı olduğu gibi anlatan
 *  tür bu. Gerekçe metni Halil'in yazdığı gibi AYNEN taşınıyor.
 *  _(Anayasa: "mimar talimatları da bu süzgeçten geçer" — niyet karşılanır,
 *  mekanizması olmayan biçim sessizce uygulanmaz.)_
 *
 *  ⚠ SEBEP KAPALI KÜMEDEN: uygun bir neden yok, o yüzden **"Diğer"** ve
 *  açıklama ZORUNLU olarak dolduruluyor.
 * ============================================================================
 */

const SKU = "axcali3134";
const SATIS = "10559161422";
const UYGULA = process.argv.includes("--uygula");

/** Halil'in yazdığı gerekçe — BİREBİR, kısaltılmadan. */
const GEREKCE =
  "07.09 kaldırma aynası kâğıt girişe stok yazdı; 02.10.2025 girişi " +
  "hizalama betiği kaydıydı (listeye-hizala-2), dönecek mal yok.";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartilerToplu } = await import("../src/lib/stok");
  const { izYaz } = await import("../src/lib/iz");

  console.log("\nK180 — HAYALET STOK DÜZELTMESİ · " + SKU);
  console.log("  kip  " + (UYGULA ? "⚠ YAZAR" : "KURU KOŞUM — hiçbir şey yazılmaz"));
  console.log("=".repeat(74));

  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true },
  });
  if (varyant === null) {
    console.log("⛔ Varyant bulunamadı.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ HEDEF SAKLANAN KİMLİKTEN DEĞİL, YENİDEN HESAPLANABİLİR ÖLÇÜTTEN:
   * "bu satışın KALDIRILMIŞ kalemine bağlı `SALE_CANCEL_IN`". Kimlik
   * gömseydim, ikinci koşumda ya da başka bir ortamda anlamsız olurdu.
   */
  const ayna = await prisma.stockMovement.findMany({
    where: {
      variantId: varyant.id,
      type: "SALE_CANCEL_IN",
      saleItem: { kaldirildiAt: { not: null }, sale: { code: SATIS } },
    },
    select: { id: true, quantityDelta: true, unitCostAmount: true, unitCostCurrency: true, locationId: true, occurredAt: true },
  });

  console.log("\n① HEDEF AYNA (" + ayna.length + ")");
  for (const a of ayna) {
    console.log(
      `   ${a.id} · ${a.occurredAt.toISOString().slice(0, 10)} · +${a.quantityDelta} · maliyet ${a.unitCostAmount?.toString()}`,
    );
  }
  if (ayna.length !== 1) {
    /** ⛔ Beklenen tam BİR ayna. Fazlası/eksiği varsa el yordamıyla devam edilmez. */
    console.log("   ⛔ TAM OLARAK BİR AYNA BEKLENİYORDU — yazım YAPILMAZ.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const hedef = ayna[0];

  /* ═══ ② ANLIK GÖRÜNTÜ ═════════════════════════════════════════════ */
  const oncekiLedger = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });
  const oncekiFifo = ((await acikPartilerToplu(prisma, [varyant.id])).get(varyant.id) ?? [])
    .reduce((t, p) => t + p.kalanAdet, 0);
  console.log("\n② ÖNCE");
  console.log(`   ledger ${oncekiLedger._sum.quantityDelta ?? 0} · FIFO ${oncekiFifo}`);

  if ((oncekiLedger._sum.quantityDelta ?? 0) !== 1 || oncekiFifo !== 1) {
    /** ⚠ BEKLENEN HÂL DEĞİLSE DURULUR: başka bir şey araya girmiş olabilir. */
    console.log("   ⛔ Beklenen hâl 1/1 değil — durum değişmiş, yazım YAPILMAZ.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const neden = await prisma.stockAdjustmentReason.findFirst({
    where: { name: "Diğer", movementType: "ADJUSTMENT", isActive: true },
    select: { id: true, name: true },
  });
  if (neden === null) {
    console.log("⛔ 'Diğer' düzeltme nedeni bulunamadı — yazım YAPILMAZ.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  console.log("\n③ YAZILACAK HAREKET");
  console.log("   tür        ADJUSTMENT  (sayım YOK — COUNT_CORRECTION değil)");
  console.log("   adet       -1");
  console.log("   maliyet    " + hedef.unitCostAmount?.toString() + " " + hedef.unitCostCurrency);
  console.log("   parti      " + hedef.id + "  (bugünkü ayna TÜKETİLİR)");
  console.log("   neden      " + neden.name);
  console.log("   gerekçe    " + GEREKCE);

  if (!UYGULA) {
    console.log("\n   " + "-".repeat(68));
    console.log("   KURU KOŞUM — hiçbir şey yazılmadı.");
    console.log("   Yazmak için sonuna --uygula ekleyin.");
    await prisma.$disconnect();
    return;
  }

  /* ═══ ④ YAZIM ═════════════════════════════════════════════════════ */
  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        variantId: varyant.id,
        type: "ADJUSTMENT",
        quantityDelta: -1,
        occurredAt: new Date(),
        locationId: hedef.locationId,
        unitCostAmount: hedef.unitCostAmount,
        unitCostCurrency: hedef.unitCostCurrency,
        /** ⛔ NEGATİF HAREKET PARTİYİ TÜKETİR — bağ YAZILIR, yoksa ayna
         *  partisi FIFO'da sonsuza kadar açık kalır. */
        sourceMovementId: hedef.id,
        adjustmentReasonId: neden.id,
        userId: kullanici?.id ?? null,
        note: GEREKCE,
      },
    });
    await izYaz(
      {
        userId: kullanici?.id,
        action: "STOK_DUZELTME_HAYALET",
        targetType: "ProductVariant",
        targetId: varyant.id,
        detail: JSON.stringify({
          sku: SKU,
          satis: SATIS,
          aynaHareketId: hedef.id,
          oncekiLedger: oncekiLedger._sum.quantityDelta ?? 0,
          oncekiFifo,
          yazilan: -1,
          gerekce: GEREKCE,
          not: "Halil 'COUNT_CORRECTION' demişti; sayım olmadığı için ADJUSTMENT yazıldı.",
        }),
      },
      tx,
    );
  });

  /* ═══ ⑤ SONRA — DEĞİŞMEZLİK ═══════════════════════════════════════ */
  const sonrakiLedger = await prisma.stockMovement.aggregate({
    where: { variantId: varyant.id },
    _sum: { quantityDelta: true },
  });
  const sonrakiFifo = ((await acikPartilerToplu(prisma, [varyant.id])).get(varyant.id) ?? [])
    .reduce((t, p) => t + p.kalanAdet, 0);

  const satis = await prisma.sale.findFirst({
    where: { code: SATIS },
    select: { net1Amount: true, net2Amount: true, profitStatus: true },
  });

  console.log("\n⑤ SONRA");
  console.log(`   ledger ${sonrakiLedger._sum.quantityDelta ?? 0} · FIFO ${sonrakiFifo}`);
  const tamam =
    (sonrakiLedger._sum.quantityDelta ?? 0) === 0 && sonrakiFifo === 0;
  console.log(`   ${tamam ? "✓ STOK 0 — iki defter de" : "⛔ BEKLENEN 0/0 DEĞİL"}`);
  /** ⚠ CİRO/NET'E DOKUNULMADI — stok düzeltmesi kâr damgasını değiştirmez. */
  console.log(
    `   satışın NET-1 ${satis?.net1Amount?.toString()} · NET-2 ${satis?.net2Amount?.toString()} · ${satis?.profitStatus}`,
  );
  console.log("   (ciro/NET'e DOKUNULMADI — bu bir stok düzeltmesidir)");
  process.exitCode = tamam ? 0 : 1;
  await prisma.$disconnect();
}

void main();
