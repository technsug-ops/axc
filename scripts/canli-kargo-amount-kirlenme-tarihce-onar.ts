import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { desiSecimi } from "../src/lib/kargo-kaynagi";
import { satisKarTazele } from "../src/lib/kar-yeniden";
import { izYaz } from "../src/lib/iz";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  GEÇMİŞ: "TAHMİNİ" KARGO TUTARI cargoAmount'A KİRLENMİŞ SATIŞLARI ONAR
 * ----------------------------------------------------------------------------
 *      Kuru koşum:  npm run canli:kargo-amount-kirlenme-tarihce-onar
 *      Yazım:       npm run canli:kargo-amount-kirlenme-tarihce-onar -- --yaz
 *
 *  BETIK SINIFI: TEK_SEFERLIK — 15.09.2026'da bulunan geçmiş kirlenmenin
 *  toplu onarımı. Kullanıcı kararı 15.09.2026: "tüm geçmiş (Ağustos'tan
 *  beri) düzeltilsin, basit tarife × 1,20 formülüyle (kullanıcının kendi
 *  hesabıyla birebir doğruladığı formül)."
 *
 *  ── KÖK SEBEP ──────────────────────────────────────────────────────────
 *  `cargoAmount` alanı "kanalın GERÇEKLEŞEN kestiği kargo" demek — ama
 *  `satisKarTazele` (K197-4 düzeltmesinden ÖNCE, bkz. `kar-yeniden.ts` git
 *  geçmişi) her kâr hesaplamasında ELİNDEKİ TEK TAHMİNİ (ürün bazlı
 *  `cargoDesi` × tarife) bu alana YAZIYORDU — hiç gerçek bir kesinti
 *  olmadığı hâlde. Ölçüldü (15.09.2026): kargo firması+desi bilinen 398
 *  satışın 376'sında `cargoAmount`, O SATIŞTA KULLANILMIŞ desi için tarife
 *  tutarıyla KURUŞUNA eşleşiyor — yani gerçek değil, tahmin.
 *
 *  ── PARMAK İZİ (yeniden hesaplanabilir ölçüt, saklanan liste DEĞİL) ────
 *  Bir satış "kirli" sayılır ⟺ cargoAmount dolu VE cargoCarrierId+cargoDesi
 *  dolu VE cargoAmount, (channelId, cargoCarrierId, ⌈cargoDesi⌉) için
 *  soldAt anında geçerli CargoTariff.amount'a kuruşuna eşit. Eşleşmeyen ya
 *  da tarifesi bulunamayan satışa DOKUNULMAZ — gerçek/mutabakat kaynaklı
 *  olabilir, tahmin edilmez.
 *
 *  ── ONARIM ──────────────────────────────────────────────────────────────
 *  `cargoAmount` NULL'a çekilir (hiç gerçek değildi), `tahminiKargo` en iyi
 *  bilinen desiyle (kanalKargoDesi TARTIM varsa o, yoksa aynı cargoDesi —
 *  `desiSecimi`, K201) YENİDEN hesaplanan tarife tutarıyla yazılır — bu,
 *  kullanıcının onayladığı "basit tarife" formülünün ta kendisi (TY/HB için
 *  `kanalTahminiHesapla`'nın da yaptığı: tarife.amount, KDV hariç, çarpansız).
 *  Firma (cargoCarrierId) SATIŞTA ZATEN SEÇİLİ — kanalın string adını
 *  eşleştirmeye gerek yok, doğrudan o firmanın tarifesi okunur.
 *  Ardından `satisKarTazele` ile kâr (NET-1/NET-2) tazelenir.
 *
 *  ⭐ 253 kayıtta (kanalKargoDesi hâlâ yok) sayı DEĞİŞMEZ — yalnız yanlış
 *  etiket (cargoAmount="gerçekleşen") doğrusuna (tahminiKargo="tahmini")
 *  taşınır. Bu bilerek yapılıyor: yanlış etiketli kalan bir kayıt, ileride
 *  gerçek bir hakediş/mutabakat değeri geldiğinde "zaten dolu" sanılıp asla
 *  yazılamaz — aynı kilit, düzeltilmezse bu 253'ü de kalıcı olarak tıkar.
 *
 *  ⭐ İDEMPOTENT: aday listesi ÖLÇÜTTEN türetilir, saklanmaz. cargoAmount
 *  temizlenen bir satış bir daha adaya girmez — kesintiye uğrarsa kaldığı
 *  yerden devam eder.
 *
 *  ⭐ İZ: her onarım `KARGO_AMOUNT_KIRLENME_TEMIZLE` ile eski cargoAmount,
 *  eski tahminiKargo, yeni tahminiKargo, kullanılan desi+kaynağı AuditLog'a
 *  yazar — geri alma buradan kurulur, bu betiğin ekran çıktısından değil.
 * ============================================================================
 */

const YAZ = process.argv.includes("--yaz");

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  GEÇMİŞ KARGO TUTARI KİRLENMESİ — ONARIM");
  console.log(`  kip: ${YAZ ? "YAZIM" : "KURU KOŞUM (önizleme)"}`);
  console.log("=".repeat(78));

  const adaylar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      cargoAmount: { not: null },
      cargoCarrierId: { not: null },
      cargoDesi: { not: null },
    },
    select: {
      id: true,
      code: true,
      soldAt: true,
      cargoAmount: true,
      cargoDesi: true,
      kanalKargoDesi: true,
      tahminiKargo: true,
      net2Amount: true,
      cargoCarrierId: true,
      channelAccount: { select: { channelId: true, channel: { select: { name: true } } } },
    },
    orderBy: { soldAt: "asc" },
  });

  console.log(`\nTABAN (cargoAmount+firma+desi dolu satış): ${adaylar.length}\n`);

  let kirli = 0;
  let temiz = 0;
  let tarifeYokParmakIzi = 0;
  let tarifeYokOnarim = 0;
  let numarasalDegisim = 0;
  let yalnizEtiketDegisim = 0;
  let yazilan = 0;
  let net2ToplamFark = 0;

  for (const s of adaylar) {
    const desiTahminOrijinal = Math.max(0, Math.ceil(Number(s.cargoDesi!.toString()) - 0.0001));
    const kanalAdi = s.channelAccount.channel.name;

    const kullanilanTarife = await prisma.cargoTariff.findFirst({
      where: {
        channelId: s.channelAccount.channelId,
        carrierId: s.cargoCarrierId!,
        desi: desiTahminOrijinal,
        effectiveFrom: { lte: s.soldAt },
      },
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true },
    });
    if (!kullanilanTarife) {
      tarifeYokParmakIzi++;
      continue;
    }

    const cargoAmount = Number(s.cargoAmount!.toString());
    const parmakIziFarki = Math.abs(cargoAmount - Number(kullanilanTarife.amount.toString()));
    if (parmakIziFarki >= 0.01) {
      temiz++;
      continue;
    }
    kirli++;

    const secim = desiSecimi({
      kanalKargoDesi: s.kanalKargoDesi === null ? null : Number(s.kanalKargoDesi.toString()),
      cargoDesi: Number(s.cargoDesi!.toString()),
    });
    const yeniDesiTam = Math.max(0, Math.ceil(secim.desi - 0.0001));

    const yeniTarife = await prisma.cargoTariff.findFirst({
      where: {
        channelId: s.channelAccount.channelId,
        carrierId: s.cargoCarrierId!,
        desi: yeniDesiTam,
        effectiveFrom: { lte: s.soldAt },
      },
      orderBy: { effectiveFrom: "desc" },
      select: { amount: true },
    });
    if (!yeniTarife) {
      tarifeYokOnarim++;
      console.log(`  ⏭  ${s.code ?? s.id}  ${kanalAdi}  yeniDesi=${secim.desi} (${secim.kaynak}) → tarife yok, atlandı`);
      continue;
    }

    const yeniTahmin = Number(yeniTarife.amount.toString());
    const eskiTahmin = s.tahminiKargo === null ? null : Number(s.tahminiKargo.toString());
    const sayiDegisti = Math.abs(yeniTahmin - cargoAmount) >= 0.01;
    if (sayiDegisti) numarasalDegisim++;
    else yalnizEtiketDegisim++;

    console.log(
      `  ${YAZ ? "→" : "○"} ${s.code ?? s.id}  ${kanalAdi}  soldAt=${s.soldAt.toISOString().slice(0, 10)}` +
        `  eskiDesi=${desiTahminOrijinal}→yeniDesi=${secim.desi}(${secim.kaynak})` +
        `  eski cargoAmount=${cargoAmount.toFixed(2)} → yeni tahminiKargo=${yeniTahmin.toFixed(2)}` +
        (sayiDegisti ? "  [SAYI DEĞİŞTİ]" : "  [yalnız etiket]"),
    );

    if (YAZ) {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: s.id },
          data: { cargoAmount: null, cargoCurrency: null, tahminiKargo: String(yeniTahmin) },
        });
        await izYaz(
          {
            action: "KARGO_AMOUNT_KIRLENME_TEMIZLE",
            targetType: "Sale",
            targetId: s.id,
            userId: null,
            detail: JSON.stringify({
              eskiCargoAmount: cargoAmount,
              eskiTahminiKargo: eskiTahmin,
              yeniTahminiKargo: yeniTahmin,
              eskiDesi: desiTahminOrijinal,
              yeniDesi: secim.desi,
              desiKaynagi: secim.kaynak,
              kanal: kanalAdi,
            }),
          },
          tx,
        );
      });
      const eskiNet2 = s.net2Amount === null ? null : Number(s.net2Amount.toString());
      await satisKarTazele(s.id, prisma);
      const guncel = await prisma.sale.findUnique({ where: { id: s.id }, select: { net2Amount: true } });
      const yeniNet2 = guncel?.net2Amount === null || guncel?.net2Amount === undefined ? null : Number(guncel.net2Amount.toString());
      if (eskiNet2 !== null && yeniNet2 !== null) net2ToplamFark += yeniNet2 - eskiNet2;
      yazilan++;
      console.log(`      ✓ YAZILDI — NET-2: ${eskiNet2?.toFixed(2) ?? "—"} → ${yeniNet2?.toFixed(2) ?? "—"}`);
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log(`  KİRLİ (parmak izi eşleşti)                    ${kirli}`);
  console.log(`    — sayı değişecek                            ${numarasalDegisim}`);
  console.log(`    — yalnız etiket değişecek (sayı aynı kalır)  ${yalnizEtiketDegisim}`);
  console.log(`  TEMİZ (parmak izi eşleşmedi — DOKUNULMADI)     ${temiz}`);
  console.log(`  TARİFE YOK (parmak izi kurulamadı, atlandı)    ${tarifeYokParmakIzi}`);
  console.log(`  TARİFE YOK (onarım için, atlandı)              ${tarifeYokOnarim}`);
  if (YAZ) {
    console.log(`  YAZILAN                                       ${yazilan}`);
    console.log(`  NET-2 TOPLAM DEĞİŞİM                          ₺${net2ToplamFark.toFixed(2)}`);
  }
  console.log(YAZ ? "\n  YAZILDI." : "\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
