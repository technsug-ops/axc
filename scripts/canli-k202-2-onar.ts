/**
 * ============================================================================
 *  K202-2 ONARIMI — TARİFE TABANLI TAHMİNİN "GERÇEKLEŞEN" DİYE YAZILMASI
 * ----------------------------------------------------------------------------
 *  BETİK SINIFI: TEK_SEFERLIK — `karYenidenYaz`in beş doğrudan çağıranından
 *  dördü (`hesap-actions.ts` · `satis-duzenleme-veri.ts` · `iptal-geri-alma-
 *  veri.ts` · kullanıcının "Yeniden Hesapla" ekranı) `cargoAmountTahminiMi`
 *  bayrağını HİÇ geçirmiyordu (opsiyonel alandı, unutmak derlenirdi). Bu
 *  yüzden bizim `CargoTariff` tablomuzdan türetilen bir tahmin doğrudan
 *  "gerçekleşen" diye `cargoAmount`a yazılabiliyordu — hem YANLIŞ DESİ
 *  (`cargoDesi` ürün tahmini, `kanalKargoDesi` tartımı yerine) hem (K201-4
 *  düzeltmesinden önce) ESKİ TARİFE PARTİSİ aynı anda karışabiliyordu.
 *  Kod düzeltmesi: src/lib/kar-yeniden.ts (`CargoTutariBilgisi` birleşik
 *  tipi — artık kaynak ÇAĞIRANDAN değil `karOnizle`nin kendisinden gelir).
 *
 *  ── KANIT (AYKIRI DEĞER UYDURULMAZ) ─────────────────────────────────────
 *  Bir satış şu ÜÇ şart birden sağlanırsa "kirli" sayılır:
 *   1. `cargoAmount` dolu, `cargoCarrierId`+`cargoDesi` dolu, iptal değil.
 *   2. `cargoAmount`, `(channelId, cargoCarrierId, cargoDesi)` için var olan
 *      BİR `CargoTariff` partisine kuruşuna eşit — yani bizim tablomuzdan
 *      TÜRETİLMİŞ, kanaldan bağımsız bir sayı olduğu KANITLANMIŞ.
 *   3. VE ya `kanalKargoDesi` (biliniyorsa) `cargoDesi`den FARKLI (yanlış
 *      desi kullanılmış) ya da eşleşen parti `soldAt` için GEÇERLİ OLAN
 *      parti DEĞİL (eski tarife kullanılmış).
 *  Kanıtsız hiçbir satışa dokunulmaz.
 *
 *  ── İKİ AŞAMA (canli-k201-2-onar.ts ile AYNI desen) ─────────────────────
 *  A) TEMİZLE: kanıtlı satışların `cargoAmount`ı `null`lanır (izle).
 *  B) TAZELE (A commit olduktan SONRA, taze sorgu): `cargoAmount` boş +
 *     `kanalKargoDesi` dolu her satış için `kargoTartimGeldiTazele` çağrılır
 *     — bu HEM `tahminiKargo`yu (kanalKargoDesi + K201-4 düzeltilmiş tarife
 *     sırasıyla) HEM kârı (satisKarTazele) tazeler.
 *
 *  Varsayılan: KURU KOŞUM (yazmaz).
 *      npm run canli:k202-2-onar
 *      npm run canli:k202-2-onar -- --yaz
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
  const { kargoTartimGeldiTazele } = await import("../src/lib/kargo-tartim-tazele");

  console.log("");
  console.log("K202-2 ONARIMI — tarife tabanlı tahmin 'gerçekleşen' diye yazılmış satışlar");
  console.log(`  hedef   ${y.veri.adres.hostname}`);
  console.log(`  kip     ${UYGULA ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log("");

  // ── AŞAMA A: KANITLI KİRLENMEYİ BUL ────────────────────────────────────
  const tabanA = await prisma.sale.findMany({
    where: {
      cargoAmount: { not: null },
      cargoCarrierId: { not: null },
      cargoDesi: { not: null },
      iptalTarihi: null,
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      cargoAmount: true,
      cargoDesi: true,
      kanalKargoDesi: true,
      cargoCarrierId: true,
      tahminiKargo: true,
      channelAccount: { select: { channel: { select: { id: true, name: true } } } },
    },
  });
  console.log(`  [A] taban (cargoAmount+carrier+desi dolu, iptal değil): ${tabanA.length}`);

  const kanitli: (typeof tabanA[number] & {
    kanit: { desiYanlisMi: boolean; tarifeEskiMi: boolean; eslesenPartiTarihi: string; dogruPartiTarihi: string | null };
  })[] = [];
  for (const s of tabanA) {
    const cargoDesiTam = Math.max(0, Math.ceil(Number(s.cargoDesi)));
    const kanalDesiTam = s.kanalKargoDesi === null ? null : Math.max(0, Math.ceil(Number(s.kanalKargoDesi)));
    const cargoAmountNum = Number(s.cargoAmount);

    const partiler = await prisma.cargoTariff.findMany({
      where: { channelId: s.channelAccount.channel.id, carrierId: s.cargoCarrierId!, desi: cargoDesiTam },
      orderBy: { effectiveFrom: "asc" },
      select: { amount: true, effectiveFrom: true },
    });
    if (partiler.length === 0) continue;

    const eslesenParti = partiler.find((p) => Math.abs(Number(p.amount) - cargoAmountNum) < 0.01);
    if (!eslesenParti) continue; // tarifeden türememiş — kanıt yok, dokunulmaz

    const dogruParti = [...partiler].reverse().find((p) => p.effectiveFrom <= s.soldAt);
    const tarifeEskiMi = !!dogruParti && Math.abs(Number(dogruParti.amount) - cargoAmountNum) > 0.01;
    const desiYanlisMi = kanalDesiTam !== null && kanalDesiTam !== cargoDesiTam;

    if (!desiYanlisMi && !tarifeEskiMi) continue; // tarifeden türemiş ama zaten doğru satırla eşleşiyor

    kanitli.push({
      ...s,
      kanit: {
        desiYanlisMi,
        tarifeEskiMi,
        eslesenPartiTarihi: eslesenParti.effectiveFrom.toISOString().slice(0, 10),
        dogruPartiTarihi: dogruParti ? dogruParti.effectiveFrom.toISOString().slice(0, 10) : null,
      },
    });
  }

  console.log(`  [A] kanıtlı (tarifeden türemiş VE yanlış desi/eski tarife): ${kanitli.length}`);
  for (const s of kanitli) {
    console.log(
      `      ${s.code ?? s.id}  ${s.channelAccount.channel.name}  soldAt=${s.soldAt.toISOString().slice(0, 10)}  ` +
        `cargoAmount(eski)=${s.cargoAmount}  cargoDesi=${s.cargoDesi}  kanalKargoDesi=${s.kanalKargoDesi ?? "—"}  ` +
        `desiYanlış=${s.kanit.desiYanlisMi}  tarifeEski=${s.kanit.tarifeEskiMi}`,
    );
  }
  console.log("");

  if (!UYGULA) {
    const tabanBOnizleme = await prisma.sale.findMany({
      where: {
        cargoAmount: null,
        tahminiKargo: null,
        kanalKargoDesi: { not: null },
        cargoCarrierId: { not: null },
        iptalTarihi: null,
      },
      select: { id: true },
    });
    console.log(`  [B] ŞU AN bu hâlde olan (cargoAmount boş + tahmin boş + tartım dolu): ${tabanBOnizleme.length}`);
    console.log("      --yaz ile hem (A) temizlenir hem (A)+bu küme için (B) tazelenir.");
    console.log("");
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar doğruysa: npm run canli:k202-2-onar -- --yaz");
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
          action: "K202_2_KARGO_KIRLENME_TEMIZLE",
          targetType: "Sale",
          targetId: s.id,
          userId: null,
          detail: JSON.stringify({
            eskiCargoAmount: s.cargoAmount?.toString(),
            cargoDesi: s.cargoDesi?.toString(),
            kanalKargoDesi: s.kanalKargoDesi?.toString(),
            kanit: s.kanit,
            neden: "cargoAmount, CargoTariff'ten türemiş (tarife tabanlı tahmin) ve yanlış desi/eski tarife kanıtı taşıyordu (K202-2)",
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
      console.log(`      ✓ ${s.code ?? s.id}  yeni tahminiKargo=${sonuc.yeniTahmin.toFixed(2)}`);
    } else {
      console.log(`      ⚠ ${s.code ?? s.id}: tahmin tazelenemedi — ${sonuc.neden}`);
      const { satisKarTazele } = await import("../src/lib/kar-yeniden");
      await satisKarTazele(s.id, prisma);
    }
  }
  console.log(`  [B] ── TAZELENDİ ── ${tazelenen}/${tabanB.length} satış (tahminiKargo, gerçek tartımla)`);
  console.log("");

  await prisma.$disconnect();
}

main();
