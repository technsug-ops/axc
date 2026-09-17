/**
 * ============================================================================
 *  K201-2 ONARIMI — TARTIM VARKEN TAHMİNLE KİRLENEN cargoAmount
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — `satisKarTazele`nin `cargoAmountTahminiMi`
 *  bayrağı yalnız kaynak "TAHMINI" olduğunda korumayı açıyordu; "YOK"
 *  (sipariş ilk onaylanırken ne gerçekleşen ne tahmin hiç yoktu) durumunda
 *  koruma devre dışı kalıyor, `karOnizle` `cargoDesi` (ÜRÜN TAHMİNİ) ile taze
 *  bir tarife hesaplayıp bunu `cargoAmount`a "gerçekleşen" diye yazıyordu.
 *  Kod düzeltmesi: src/lib/kar-yeniden.ts (`!== "GERCEKLESEN"`).
 *
 *  İKİ AŞAMA — ikisi de gerekli:
 *
 *  A) TEMİZLE: `kanalKargoDesi` (kanalın GERÇEKTEN tarttığı) dolu VE
 *     `cargoDesi`den (bizim ürün tahminimiz) FARKLI VE `cargoAmount`,
 *     `cargoDesi`nin tarifesine kuruşuna eşit olan satışların `cargoAmount`ı
 *     `null`lanır. `kanalKargoDesi` boş (tartım hiç gelmemiş) satışlara
 *     DOKUNULMAZ — kanıt yok, "aykırı değer uydurularak düzeltilmez".
 *
 *  B) TAZELE: `satisKarTazele` `tahminiKargo`yu HİÇ YAZMAZ (yalnız
 *     `kargoTartimGeldiTazele` yazar). (A)'dan sonra `cargoAmount` boş ama
 *     `tahminiKargo` de boşsa `kargoSecimi` yine "YOK" döner ve `karOnizle`
 *     yine ESKİ `cargoDesi` ile hesaplar — tartım hiç devreye girmez. Bu
 *     yüzden `cargoAmount` boş + `tahminiKargo` boş + `kanalKargoDesi` dolu
 *     olan HER satış için `kargoTartimGeldiTazele` doğrudan çağrılır; bu
 *     hem (A)'da temizlenenleri hem BAŞKA sebeple aynı hâlde kalmış olası
 *     satışları kapsar.
 *
 *  Varsayılan: KURU KOŞUM (yazmaz).
 *      npm run canli:k201-2-onar
 *      npm run canli:k201-2-onar -- --yaz
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const UYGULA = process.argv.includes("--yaz");

  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });
  const { izYaz } = await import("../src/lib/iz");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const { kargoTartimGeldiTazele } = await import("../src/lib/kargo-tartim-tazele");

  console.log("");
  console.log("K201-2 ONARIMI — tartım varken tahminle kirlenen cargoAmount");
  console.log(`  hedef   ${y.veri.adres.hostname}`);
  console.log(`  kip     ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  // ── AŞAMA A: KANITLI KİRLENMEYİ BUL ────────────────────────────────────
  const tabanA = await prisma.sale.findMany({
    where: {
      cargoAmount: { not: null },
      cargoCarrierId: { not: null },
      cargoDesi: { not: null },
      kanalKargoDesi: { not: null },
      iptalTarihi: null,
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      cargoAmount: true,
      cargoDesi: true,
      kanalKargoDesi: true,
      kanalKargoFirmasi: true,
      cargoCarrierId: true,
      tahminiKargo: true,
      channelAccount: { select: { channel: { select: { id: true, name: true } } } },
    },
  });
  console.log(`  [A] taban (tartım+tahmin+firma dolu, iptal değil): ${tabanA.length}`);

  const kanitli: typeof tabanA = [];
  for (const s of tabanA) {
    const cargoDesiTamsayi = Math.max(0, Math.ceil(Number(s.cargoDesi)));
    const kanalDesiTamsayi = Math.max(0, Math.ceil(Number(s.kanalKargoDesi)));
    if (cargoDesiTamsayi === kanalDesiTamsayi) continue; // tahmin zaten tartımla aynıysa kanıt yok

    const tahminTarifesi = await prisma.cargoTariff.findFirst({
      where: { channelId: s.channelAccount.channel.id, carrierId: s.cargoCarrierId!, desi: cargoDesiTamsayi },
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true },
    });
    if (!tahminTarifesi) continue;
    const uyuyor = Math.abs(Number(tahminTarifesi.amount) - Number(s.cargoAmount)) < 0.01;
    if (uyuyor) kanitli.push(s);
  }

  console.log(`  [A] kanıtlı (tahmin tarifesine kuruşuna eşit, tartım farklı): ${kanitli.length}`);
  for (const s of kanitli) {
    console.log(
      `      ${s.code ?? s.id}  ${s.channelAccount.channel.name}  soldAt=${s.soldAt.toISOString().slice(0, 10)}  ` +
        `cargoDesi(tahmin)=${s.cargoDesi} → kanalKargoDesi(tartım)=${s.kanalKargoDesi}  cargoAmount(eski)=${s.cargoAmount}`,
    );
  }
  console.log("");

  if (!UYGULA) {
    // ── AŞAMA B ÖNİZLEME (rapor kipinde de görünür olsun) ────────────────
    const tabanBOnizleme = await prisma.sale.findMany({
      where: {
        cargoAmount: null,
        tahminiKargo: null,
        kanalKargoDesi: { not: null },
        cargoCarrierId: { not: null },
        iptalTarihi: null,
      },
      select: { id: true, code: true },
    });
    // (A)'daki kanıtlı satışlar henüz yazılmadı (rapor kipi); (B) bugün zaten
    // bu hâlde olanları gösterir — (A) yazıldıktan sonra kümeye 12 tane daha eklenecek.
    console.log(`  [B] ŞU AN bu hâlde olan (cargoAmount boş + tahmin boş + tartım dolu): ${tabanBOnizleme.length}`);
    console.log("      --yaz ile hem (A) temizlenir hem (A)+bu küme için (B) tazelenir.");
    console.log("");
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar doğruysa: npm run canli:k201-2-onar -- --yaz");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ── AŞAMA A: YAZ ────────────────────────────────────────────────────────
  for (const s of kanitli) {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: s.id }, data: { cargoAmount: null, cargoCurrency: null } });
      await izYaz(
        {
          action: "K201_2_KARGO_KIRLENME_TEMIZLE",
          targetType: "Sale",
          targetId: s.id,
          userId: null,
          detail: JSON.stringify({
            eskiCargoAmount: s.cargoAmount?.toString(),
            cargoDesiTahmin: s.cargoDesi?.toString(),
            kanalKargoDesiTartim: s.kanalKargoDesi?.toString(),
            neden: "cargoAmount, kanalKargoDesi tartımı varken cargoDesi tahmininin tarifesine kuruşuna eşitti (K201-2)",
          }),
        },
        tx,
      );
    });
  }
  console.log(`  [A] ── TEMİZLENDİ ── ${kanitli.length} satış (cargoAmount → null)`);

  // ── AŞAMA B: BUL (A yazıldıktan SONRA, taze sorgu) + TAZELE ────────────
  const tabanB = await prisma.sale.findMany({
    where: {
      cargoAmount: null,
      tahminiKargo: null,
      kanalKargoDesi: { not: null },
      cargoCarrierId: { not: null },
      iptalTarihi: null,
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      kanalKargoDesi: true,
      kanalKargoFirmasi: true,
      tahminiKargo: true,
      channelAccount: { select: { channel: { select: { id: true, name: true } } } },
    },
  });
  console.log(`  [B] taban (cargoAmount boş + tahmin boş + tartım dolu, iptal değil): ${tabanB.length}`);

  let tazelenen = 0;
  for (const s of tabanB) {
    const sonuc = await kargoTartimGeldiTazele(
      {
        saleId: s.id,
        channelId: s.channelAccount.channel.id,
        kanalAdi: s.channelAccount.channel.name,
        kanalKargoFirmasi: s.kanalKargoFirmasi,
        kanalKargoDesi: Number(s.kanalKargoDesi),
        cargoAmount: null,
        tahminiKargo: s.tahminiKargo === null ? null : Number(s.tahminiKargo.toString()),
        soldAt: s.soldAt,
      },
      prisma,
    );
    if (sonuc.yapildi) {
      tazelenen++;
    } else {
      console.log(`      ⚠ ${s.code ?? s.id}: tahmin tazelenemedi — ${sonuc.neden}`);
      // Tazeleme (firma eşlenemedi / tarife yok) başarısız olsa da kâr
      // yeniden hesaplanır — artık cargoAmount boş, satisKarTazele KORUNARAK yazar.
      await satisKarTazele(s.id, prisma);
    }
  }
  console.log(`  [B] ── TAZELENDİ ── ${tazelenen}/${tabanB.length} satış (tahminiKargo, gerçek tartımla)`);
  console.log("");

  await prisma.$disconnect();
}

main();
