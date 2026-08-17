/**
 * ============================================================================
 *  CANLI KÂR TAZELEME — ADET DÜZENLEMESİNDEN ETKİLENEN SATIŞLAR
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:kar-tazele             → YALNIZ RAPOR, hiçbir şey yazmaz
 *      npm run canli:kar-tazele -- --uygula → kârı yeniden yazar
 *
 *  ⚠ NİYE VAR — 17.08.2026 CANLI HATASI.
 *
 *  Satış 11513025054 (LEGO Mario Kart, ₺3.733) adedi 1→2 çıkarıldı, sonra
 *  2→1 indirildi. Stok doğru döndü ama kâr motoru maliyeti yalnız
 *  `SALE_OUT` satırlarından topluyordu: ayna girişi görmedi, İKİ adetlik
 *  maliyet düştü ve NET-2 +₺695 kârdan −₺1.304 ZARARA döndü.
 *
 *  Kural düzeltildi (`lib/kalem-maliyeti.ts`). Ama düzeltme geçmişi
 *  KENDİLİĞİNDEN onarmaz: kâr rakamları satışın üstüne YAZILI durur ve
 *  ancak yeniden hesaplanınca tazelenir. Bu betik onu yapar.
 *
 *  ── STOK DEFTERİNE DOKUNMAZ ─────────────────────────────────────────────
 *  Tek satır bile stok hareketi yazmaz/silmez. Yalnız satışın kâr
 *  alanlarını motorun düzeltilmiş hâliyle yeniden üretir.
 *
 *  ── ADRES BAŞTA SABİTLENİR ──────────────────────────────────────────────
 *  ⚠ Kâr motoru uygulamanın `prisma` TEKİLİNİ kullanır ve o tekil adresi
 *  ortam değişkeninden okur. Betik canlıya kendi istemcisiyle bağlanıp
 *  motoru öylece çağırsaydı, CANLIDAN OKUYUP YERELE YAZARDI. Bu yüzden
 *  `DATABASE_URL` her şeyden ÖNCE canlıya kurulur ve motor modülü ondan
 *  SONRA yüklenir (dinamik import bunun için).
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { kalemMaliyeti } from "../src/lib/kalem-maliyeti";
import { kdvDahilKargo } from "../src/lib/kargo-kdv";
import { canliYapilandirma } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

function para(d: unknown): string {
  if (d === null || d === undefined) return "?";
  return Number(d.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  // ADRESİ ÖNCE KUR — motor modülü yüklenmeden.
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);

  console.log("");
  console.log("CANLI KÂR TAZELEME");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  kip        ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  const { prisma } = await import("../src/lib/prisma");
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");

  /**
   * ETKİ ALANI — kaleme bağlı POZİTİF hareketi olan her satış.
   *
   * `saleItemId` dolu pozitif hareket YALNIZ adet azaltmadan doğar
   * (ölçüldü 17.08.2026: iade, iptal ve iptal geri alma hareketleri
   * kaleme bağlanmaz). Yani bu küme tam olarak "adedi düşürülmüş
   * satışlar"dır — tarihe ya da hatırlamaya dayanmaz, defterden gelir.
   */
  const etkilenen = await prisma.stockMovement.findMany({
    where: { saleItemId: { not: null }, quantityDelta: { gt: 0 } },
    select: { saleItemId: true },
    distinct: ["saleItemId"],
  });

  if (etkilenen.length === 0) {
    console.log("  Adet düşürülmüş satış YOK — tazelenecek kayıt yok.");
    await prisma.$disconnect();
    return;
  }

  const kalemler = await prisma.saleItem.findMany({
    where: { id: { in: etkilenen.map((h) => h.saleItemId!) } },
    select: {
      id: true,
      quantity: true,
      saleId: true,
      variant: { select: { product: { select: { name: true } } } },
      stockMovements: {
        orderBy: { createdAt: "asc" },
        select: { type: true, quantityDelta: true, unitCostAmount: true },
      },
    },
  });

  const satisIdleri = [...new Set(kalemler.map((k) => k.saleId))];
  console.log(`  ETKİLENEN SATIŞ: ${satisIdleri.length}  ·  KALEM: ${kalemler.length}`);
  console.log("");

  for (const k of kalemler) {
    /** ESKİ KURAL — hatanın kendisi; farkı görebilmek için hesaplanır. */
    const eskiKural = k.stockMovements
      .filter((h) => h.type === "SALE_OUT")
      .reduce(
        (t, h) =>
          t + Number(h.unitCostAmount?.toString() ?? 0) * Math.abs(h.quantityDelta),
        0,
      );
    const yeniKural = kalemMaliyeti(
      k.stockMovements.map((h) => ({
        quantityDelta: h.quantityDelta,
        birimMaliyet: h.unitCostAmount === null ? null : h.unitCostAmount.toString(),
        birimMaliyetParaBirimi: null,
      })),
    ).maliyet;
    const netAdet = -k.stockMovements.reduce((t, h) => t + h.quantityDelta, 0);

    console.log(`  ${k.variant.product.name}`);
    console.log(`     kalem adedi  ${k.quantity}     net stok çıkışı  ${netAdet}`);
    console.log(`     maliyet ESKİ ${para(eskiKural)}   (hatalı)`);
    console.log(`     maliyet YENİ ${para(yeniKural)}   (düzeltilmiş)`);
    console.log(
      `     hareketler   ${k.stockMovements
        .map((h) => `${h.type}${h.quantityDelta > 0 ? "+" : ""}${h.quantityDelta}`)
        .join(", ")}`,
    );
    if (netAdet !== k.quantity) {
      console.log(`     ⚠ UYARI: kalem adedi ile net çıkış UYUŞMUYOR`);
    }
    console.log("");
  }

  for (const saleId of satisIdleri) {
    const satis = await prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        code: true,
        net1Amount: true,
        net2Amount: true,
        cargoCarrierId: true,
        cargoDesi: true,
        cargoAmount: true,
        items: { select: { id: true, commissionRate: true } },
      },
    });
    if (satis === null) continue;

    console.log(`  satış ${satis.code}`);
    console.log(`     NET-1 / NET-2 şu an   ${para(satis.net1Amount)} / ${para(satis.net2Amount)}`);

    if (!UYGULA) {
      console.log(`     → --uygula ile yeniden hesaplanacak`);
      console.log("");
      continue;
    }

    /**
     * KARGO: `cargoAmount` KDV HARİÇ saklanır, motor elle tutarı KDV DAHİL
     * bekler. Çeviri tek kaynaktan (`kargo-kdv.ts`) — betik kendi çarpanını
     * yazsaydı motorla ayrışabilirdi.
     *
     * Saklı tutar tarife olarak DEĞİL elle tutar olarak verilir: böylece
     * tarife sonradan değişmiş olsa bile bu satışın kargosu OLDUĞU GİBİ
     * kalır; tazeleme yalnız maliyeti düzeltir, başka bir şeyi kaydırmaz.
     */
    const oldu = await karYenidenYaz({
      saleId,
      /**
       * KOMİSYON: oran kalemden, TUTAR null. Düzenleme yolu da böyle
       * çağırıyor (`satis-duzenleme-veri.ts`); ikisi ayrışırsa aynı satış
       * betikle ekrandan farklı hesaplanırdı.
       */
      kalemler: satis.items.map((i) => ({
        saleItemId: i.id,
        commissionRate:
          i.commissionRate === null ? null : Number(i.commissionRate.toString()),
        commissionAmount: null,
      })),
      cargoCarrierId: satis.cargoCarrierId,
      cargoDesi: satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
      cargoAmountManual: kdvDahilKargo(
        satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
      ),
    });

    const sonra = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { net1Amount: true, net2Amount: true },
    });
    console.log(
      `     NET-1 / NET-2 sonra   ${para(sonra?.net1Amount)} / ${para(sonra?.net2Amount)}  ${oldu ? "✓" : "(yazılamadı)"}`,
    );
    console.log("");
  }

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar beklenene uyuyorsa:  npm run canli:kar-tazele -- --uygula");
    console.log("");
  }

  await prisma.$disconnect();
}

main();
