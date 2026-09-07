import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K180 KAPANIŞ TURU — DEĞİŞMEZLİK ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-k180-kapanis.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir kapanışın şartlarını ölçer.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⚠ ÖNCEKİ ANLIK GÖRÜNTÜ YOK, VE BU AÇIKÇA YAZILIYOR ─────────────────
 *  Yazımı BEN yapmadım — Halil ekrandan yaptı. Dolayısıyla "yazımdan önce
 *  yerel anlık görüntü al" kuralının bit-bit karşılaştırması BURADA
 *  KURULAMAZ. Onun yerine ölçüt **zamana** bağlandı: kaldırma izinin anı
 *  bulunur ve o andan sonra kâr damgası tazelenen BAŞKA satış var mı diye
 *  bakılır. Bu bir vekildir ve vekil olduğu yazılıdır.
 *  _(Anayasa: "eşik güvenilirliğin vekilidir — vekil geçilse de asıl
 *  sorulur"; ve "boş sonuç ile temiz sonuç ayrılır".)_
 * ============================================================================
 */

const KOD = "10559161422";
const SKU = "axcali3134";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kalemGecerliMi } = await import("../src/lib/kalem-gecerli");

  console.log("\nK180 KAPANIŞ TURU — " + KOD);
  console.log("  kip  SALT OKUMA");
  console.log("=".repeat(72));

  let hata = 0;
  const olcut = (ad: string, tuttu: boolean, gorulen: string) => {
    if (!tuttu) hata++;
    console.log(`  ${tuttu ? "✓" : "⛔"} ${ad.padEnd(46)} ${gorulen}`);
  };

  /* ═══ ① KALDIRMA İZİ VE ANI ════════════════════════════════════════ */
  const iz = await prisma.auditLog.findFirst({
    where: { action: "SATIS_KALEMI_KALDIRMA" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, targetId: true, detail: true, userId: true },
  });
  if (iz === null) {
    console.log("⛔ Kaldırma izi YOK — kapanış ölçülemez.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  const d = JSON.parse(iz.detail ?? "{}") as Record<string, unknown>;
  console.log("\n① İZ");
  console.log("   an     " + iz.createdAt.toISOString());
  console.log("   satış  " + String(d.satisKodu));
  console.log("   sebep  " + String(d.sebep));
  console.log("   kullanıcı " + (iz.userId ?? "—"));
  olcut("iz sebebi MUKERRER_SATIR", d.sebep === "MUKERRER_SATIR", String(d.sebep));

  /* ═══ ② SATIŞIN HÂLİ ═══════════════════════════════════════════════ */
  const satis = await prisma.sale.findFirst({
    where: { code: KOD },
    select: {
      id: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      calculatedAt: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          net2Amount: true,
          kaldirildiAt: true,
          kaldirmaSebebi: true,
          variant: { select: { sku: true } },
        },
      },
    },
  });
  if (satis === null) {
    console.log("⛔ Satış bulunamadı.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  const gecerli = satis.items.filter(kalemGecerliMi);
  const kaldirilan = satis.items.filter((k) => !kalemGecerliMi(k));
  const ciro = gecerli.reduce(
    (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
    0,
  );

  console.log("\n② SATIŞ");
  olcut("ciro 1.039,00", Math.abs(ciro - 1039) < 0.005, ciro.toFixed(2));
  olcut("geçerli kalem 1", gecerli.length === 1, String(gecerli.length));
  olcut("kaldırılmış kalem 1", kaldirilan.length === 1, String(kaldirilan.length));
  olcut(
    "kaldırılan satır DURUYOR (silinmedi)",
    satis.items.length === 2,
    satis.items.length + " kalem",
  );
  olcut(
    "sebep rozeti verisi var",
    kaldirilan[0]?.kaldirmaSebebi === "MUKERRER_SATIR",
    String(kaldirilan[0]?.kaldirmaSebebi),
  );
  olcut(
    "kâr durumu CALCULATED",
    satis.profitStatus === "CALCULATED",
    String(satis.profitStatus),
  );
  /**
   * ⚠ NET-2 KALAN KALEMDEN YENİDEN HESAPLANDI MI — damganın TAZELİĞİ
   * ölçülür: `calculatedAt` kaldırma anından SONRA olmalı. Rakamın doğru
   * görünmesi yetmez; ESKİ damga da doğru görünebilirdi.
   */
  const tazelendi =
    satis.calculatedAt !== null && satis.calculatedAt >= iz.createdAt;
  olcut(
    "NET damgası kaldırmadan SONRA tazelendi",
    tazelendi,
    satis.calculatedAt?.toISOString() ?? "yok",
  );
  console.log(
    `   NET-1 ${satis.net1Amount?.toString()} · NET-2 ${satis.net2Amount?.toString()}`,
  );
  console.log(
    `   kalan kalemin NET-2 ${gecerli[0]?.net2Amount?.toString() ?? "yok"}`,
  );

  /* ═══ ③ STOK — AYNA GİRİŞİ ═════════════════════════════════════════ */
  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true },
  });
  const ayna = await prisma.stockMovement.findFirst({
    where: {
      type: "SALE_CANCEL_IN",
      saleItemId: iz.targetId,
    },
    select: {
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      sourceMovementId: true,
      note: true,
      occurredAt: true,
    },
  });
  console.log("\n③ STOK");
  olcut("ayna hareketi yazıldı", ayna !== null, ayna ? "SALE_CANCEL_IN" : "YOK");
  olcut("stoğa +1 adet", ayna?.quantityDelta === 1, String(ayna?.quantityDelta));
  olcut(
    "birim maliyet 699 (çıkışın aynası)",
    Number(ayna?.unitCostAmount?.toString() ?? "0") === 699,
    (ayna?.unitCostAmount?.toString() ?? "?") + " " + (ayna?.unitCostCurrency ?? ""),
  );
  /** ⛔ K96 — POZİTİF HAREKET KAYNAK BAĞI TAŞIMAZ (hayalet parti dersi). */
  olcut(
    "ayna `sourceMovementId` TAŞIMIYOR (K96)",
    ayna?.sourceMovementId === null || ayna?.sourceMovementId === undefined,
    String(ayna?.sourceMovementId ?? "boş"),
  );
  olcut(
    "not kaldırmayı ve sebebi anlatıyor",
    (ayna?.note ?? "").includes("MUKERRER_SATIR"),
    (ayna?.note ?? "").slice(0, 44),
  );

  /**
   * ⚠ İKİ DEFTER BİRDEN: ledger toplamı ile FIFO açık partileri ayrışabilir
   * ve hiçbiri hata vermez. Kaldırmadan sonra ikisi de artmalı.
   */
  if (varyant !== null) {
    const ledger = await prisma.stockMovement.aggregate({
      where: { variantId: varyant.id },
      _sum: { quantityDelta: true },
    });
    const { acikPartilerToplu } = await import("../src/lib/stok");
    const partiler = await acikPartilerToplu(prisma, [varyant.id]);
    const fifo = (partiler.get(varyant.id) ?? []).reduce((t, p) => t + p.kalanAdet, 0);
    console.log(`   ledger stok ${ledger._sum.quantityDelta ?? 0} · FIFO açık ${fifo}`);
    olcut(
      "ledger ile FIFO AYRIŞMIYOR",
      (ledger._sum.quantityDelta ?? 0) === fifo,
      `${ledger._sum.quantityDelta ?? 0} = ${fifo}`,
    );
  }

  /* ═══ ④ BAŞKA HİÇBİR ŞEY OYNAMADI ══════════════════════════════════ */
  /**
   * ⛔ VEKİL ÖLÇÜT — BİT-BİT KARŞILAŞTIRMA DEĞİL (başlıktaki nota bakın).
   * Kaldırma anından sonra kâr damgası tazelenen BAŞKA satış olmamalı ve
   * kaldırılmış başka kalem doğmamalı.
   */
  const sonrakiTazelenen = await prisma.sale.findMany({
    where: { calculatedAt: { gte: iz.createdAt }, id: { not: satis.id } },
    select: { code: true, calculatedAt: true },
    take: 20,
  });
  const digerKaldirilmis = await prisma.saleItem.count({
    where: { kaldirildiAt: { not: null }, saleId: { not: satis.id } },
  });
  const sonrakiHareket = await prisma.stockMovement.count({
    where: { createdAt: { gte: iz.createdAt }, saleItemId: { not: iz.targetId } },
  });

  console.log("\n④ DEĞİŞMEZLİK (kaldırma anından sonra)");
  olcut(
    "kârı tazelenen BAŞKA satış yok",
    sonrakiTazelenen.length === 0,
    sonrakiTazelenen.length + " satış",
  );
  for (const s2 of sonrakiTazelenen.slice(0, 5)) {
    console.log(`     ⛔ ${s2.code} · ${s2.calculatedAt?.toISOString()}`);
  }
  olcut(
    "başka kaldırılmış kalem yok",
    digerKaldirilmis === 0,
    String(digerKaldirilmis),
  );
  olcut(
    "başka stok hareketi yazılmadı",
    sonrakiHareket === 0,
    String(sonrakiHareket),
  );

  console.log("\n" + "=".repeat(72));
  console.log(
    hata === 0
      ? "  TEMİZ — kapanış şartlarının hepsi tuttu."
      : `  ⛔ ${hata} ŞART TUTMADI — kapanış YAPILMAZ.`,
  );
  console.log("  SALT OKUMA — hiçbir şey yazılmadı.");
  await prisma.$disconnect();
  process.exitCode = hata === 0 ? 0 : 1;
}

void main();
