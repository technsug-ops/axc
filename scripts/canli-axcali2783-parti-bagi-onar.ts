/**
 * ============================================================================
 *  axcali2783 — PARTİ BAĞI ONARIMI (23.10.2026, kullanıcı «düzeltelim»)
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — iki hareketin KİMLİĞİNE kilitli; genel araç değil.
 *
 *  VAKA (canlı defter ayrışması 23.10: ledger 0 · FIFO 1, salt okumayla izlendi):
 *  03.09 «listeye-hizala-2» onarımı iki ADJUSTMENT yazdı —
 *    q67dgh  +1  satış 4747680294'ün adet-0 kaleminin fazladan SALE_OUT'unu (h0f93d) geri alır
 *    8t8cis  −1  «parti kapama: raf sayıldı, mal fiziki değil» (Halil 04.09)
 *  İkisi de `sourceMovementId = jk0bc9` (ALM-AMZ-251030-19 partisi). FIFO (`acikPartilerToplu`)
 *  pozitif hareketi YENİ PARTİ sayar VE kaynağının tüketimini düşer: jk0bc9 tüketimi
 *  −5 +1 −1 = 5 (kalan 0) · q67dgh kendisi parti, onu tüketen yok (kalan 1). Ledger 0.
 *
 *  ONARIM — METADATA (anayasa «metadata düzeltmesi — dar istisna»; miktar/para DEĞİŞMEZ):
 *    q67dgh.sourceMovementId  jk0bc9 → NULL     (geri alma kendi partisidir)
 *    8t8cis.sourceMovementId  jk0bc9 → q67dgh   (kapama O partiyi kapatır)
 *  Sonuç: jk0bc9 tüketimi 5 (kalan 0) · q67dgh tüketimi 1 (kalan 0) → FIFO 0 = ledger 0.
 *  Alternatifler elendi: ters ADJUSTMENT ledger'ı −1'e düşürür (fiziki 0 bozulur); silme
 *  yasak (ledger); başka bağ birleşimleri FIFO'yu 1'de bırakır (ölçüldü, kuru koşum basar).
 *  Kâr DEĞİŞMEZ: hiçbir satış q67dgh'yi tüketmiyor; kalem maliyeti adet × birimden.
 *
 *      npx tsx scripts/canli-axcali2783-parti-bagi-onar.ts            (kuru koşum)
 *      npx tsx scripts/canli-axcali2783-parti-bagi-onar.ts --yaz
 *      npx tsx scripts/canli-axcali2783-parti-bagi-onar.ts --geri-al
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const VARYANT_SKU = "axcali2783";
const JK0BC9 = "cmtah3p73003alwvkn2jk0bc9";
const Q67DGH = "cmtm4426p0000zsvku1q67dgh";
const T8CIS = "cmtm4428p0001zsvk5z8t8cis";
const ESKI = { [Q67DGH]: JK0BC9, [T8CIS]: JK0BC9 } as const;
const YENI = { [Q67DGH]: null, [T8CIS]: Q67DGH } as const;

async function main() {
  const YAZ = process.argv.includes("--yaz");
  const GERI = process.argv.includes("--geri-al");
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)) });
  const { acikPartiler } = await import("../src/lib/stok");
  const { izYaz } = await import("../src/lib/iz");

  try {
    const v = await prisma.productVariant.findFirstOrThrow({ where: { sku: VARYANT_SKU }, select: { id: true } });
    const hareketler = await prisma.stockMovement.findMany({ where: { variantId: v.id }, select: { id: true, quantityDelta: true, sourceMovementId: true } });
    const ledger = hareketler.reduce((t, h) => t + h.quantityDelta, 0);
    const fifo = (await acikPartiler(prisma, v.id)).reduce((t, p) => t + p.kalanAdet, 0);
    const simdiki = Object.fromEntries([Q67DGH, T8CIS].map((id) => [id, hareketler.find((h) => h.id === id)?.sourceMovementId ?? null]));
    console.log(`\n${VARYANT_SKU} · ŞİMDİ ledger ${ledger} · FIFO ${fifo} · bağlar ${JSON.stringify(simdiki)}`);

    /* Kuru: yeni bağlarla FIFO'yu bellekte yeniden hesapla (acikPartilerToplu ile aynı kural). */
    const bag = (id: string, kaynak: string | null) => (id in YENI ? (YENI as Record<string, string | null>)[id] : kaynak);
    const girisler = hareketler.filter((h) => h.quantityDelta > 0);
    let fifoSonra = 0;
    for (const g of girisler) {
      const tuketim = Math.abs(hareketler.filter((h) => bag(h.id, h.sourceMovementId) === g.id).reduce((t, h) => t + h.quantityDelta, 0));
      if (tuketim > g.quantityDelta) { console.log(`⛔ parti ${g.id} aşırı tüketilir (${tuketim}/${g.quantityDelta}) — DURDU`); process.exitCode = 1; return; }
      fifoSonra += g.quantityDelta - tuketim;
    }
    console.log(`ONARIMDAN SONRA (hesap) ledger ${ledger} · FIFO ${fifoSonra}`);

    if (GERI) {
      await prisma.$transaction(async (tx) => {
        for (const [id, kaynak] of Object.entries(ESKI)) await tx.stockMovement.update({ where: { id }, data: { sourceMovementId: kaynak } });
        await izYaz({ action: "PARTI_BAGI_ONARIM_GERI_AL", targetType: "ProductVariant", targetId: v.id, userId: null, detail: JSON.stringify({ sku: VARYANT_SKU, geri: ESKI }) }, tx);
      });
      console.log("✓ geri alındı");
      return;
    }
    if (!YAZ) { console.log("\nKURU KOŞUM — hiçbir şey yazılmadı.\n"); return; }

    if (JSON.stringify(simdiki) !== JSON.stringify(ESKI)) { console.log("⛔ Bağlar beklenen ESKİ hâlde değil — YAZILMADI (zaten onarılmış ya da değişmiş)."); process.exitCode = 1; return; }
    if (fifoSonra !== ledger) { console.log("⛔ Hesap iki defteri eşitlemiyor — YAZILMADI."); process.exitCode = 1; return; }
    await prisma.$transaction(async (tx) => {
      for (const [id, kaynak] of Object.entries(YENI)) await tx.stockMovement.update({ where: { id }, data: { sourceMovementId: kaynak } });
      await izYaz({
        action: "PARTI_BAGI_ONARIM",
        targetType: "ProductVariant",
        targetId: v.id,
        userId: null,
        detail: JSON.stringify({ sku: VARYANT_SKU, eski: ESKI, yeni: YENI, onceLedger: ledger, onceFifo: fifo, gerekce: "03.09 listeye-hizala-2: kapama hareketi yanlış partiye bağlıydı; miktar/para değişmedi" }),
      }, tx);
    });
    const fifoYeni = (await acikPartiler(prisma, v.id)).reduce((t, p) => t + p.kalanAdet, 0);
    console.log(`✓ yazıldı · ÖLÇÜLDÜ ledger ${ledger} · FIFO ${fifoYeni}${fifoYeni === ledger ? " — EŞİT" : " ⛔ EŞİT DEĞİL"}\n`);
    if (fifoYeni !== ledger) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.log("HATA", String((e as Error).message ?? e)); process.exitCode = 1; });
