/**
 * ============================================================================
 *  11473322212 — DEĞİŞİM GÖNDERİSİ KARGOSU ₺174,32 (A, 24.08.2026)
 * ----------------------------------------------------------------------------
 *  KAYNAK: KANAL BELGESİ — en üst basamak (türetme DEĞİL).
 *    dosya : prod_cargo-invoice_870249_TR_TRY_84044936_detaylar.xlsx
 *    satır : 11473322212 · "Değişim Gönderisi" · 8 desi · ARAS · 174,32 ₺
 *
 *  ⚠ KDV TABANI ÖLÇÜLDÜ, VARSAYILMADI. Fatura kolonu "Gönderi Ücreti
 *  (KDV Dahil)"; şemada `reshipCargoAmount` da "KDV DAHİL". Motor
 *  `kdvAyir(tutarDahil, oran)` ile KDV'yi tutarın İÇİNDEN çıkarıyor.
 *  İki taraf aynı tabanda → dönüşüm YOK, 174,32 doğrudan girer.
 *
 *  ⚠ ÇİFT SAYIM SINANDI VE YOK: bizim KARGO kesintimiz 141,42 ve fatura
 *  bunu AYRI bir satır olarak (ilk gönderi, 5 desi) yazıyor.
 *  141,42 + 174,32 = 315,74 = TY panelindeki Kargo sütunu, BİREBİR.
 *  Yani ikinci bacak ekleniyor, aynı bacak tekrarlanmıyor.
 *
 *  ⚠ SIFIR SAYIM DA SINANDI: "çift olur" korkusuyla bu bacak bugüne kadar
 *  HİÇ yazılmamıştı — korkulan hata değil, ters yüzü gerçekleşmişti.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-11473-degisim-kargosu.ts            → RAPOR
 *    npx tsx scripts/canli-11473-degisim-kargosu.ts --uygula   → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "11473322212";
const TUTAR = 174.32;
const EYLEM = "IADE_DEGISIM_KARGOSU_GIRILDI";
const BELGE = {
  kaynakRozeti: "KANAL_BELGESI",
  dosya: "prod_cargo-invoice_870249_TR_TRY_84044936_detaylar.xlsx",
  satir: {
    siparisNo: SIPARIS_NO,
    tur: "Değişim Gönderisi",
    desi: 8,
    kargoFirmasi: "ARAS",
    tutarKdvDahil: TUTAR,
  },
};

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
  const { iadeEtkisiHesapla, komisyonToplami, satisCikisMaliyeti } =
    await import("../src/lib/iade");

  console.log("");
  console.log(`DEĞİŞİM KARGOSU GİRİLİYOR — ${SIPARIS_NO}`);
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);
  console.log(`  kaynak ${BELGE.kaynakRozeti} · ${BELGE.dosya}`);
  console.log(
    `  satır  ${BELGE.satir.tur} · ${BELGE.satir.desi} desi · ${BELGE.satir.kargoFirmasi} · ${TUTAR}`,
  );

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          vatRate: true,
          fees: { select: { code: true, amount: true } },
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true, type: true },
          },
        },
      },
      fees: { where: { saleItemId: null }, select: { code: true, amount: true } },
    },
  });
  if (!satis) {
    console.log("satış bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  const iade = await prisma.return.findFirst({
    where: { saleId: satis.id },
    select: {
      id: true,
      returnType: true,
      net1Amount: true,
      net2Amount: true,
      returnCargoAmount: true,
      reshipCargoAmount: true,
      penaltyAmount: true,
      items: {
        select: {
          id: true,
          saleItemId: true,
          quantity: true,
          damagedQuantity: true,
        },
      },
      fees: { select: { code: true, amount: true } },
    },
  });
  if (!iade) {
    console.log("iade bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  /** ⚠ İDEMPOTENT: ikinci koşumda yazma (K38 dersi). İki ayrı bekçi. */
  if (iade.reshipCargoAmount !== null) {
    console.log(
      `\n  ZATEN DOLU: reshipCargoAmount = ${iade.reshipCargoAmount.toString()} — betik durdu.`,
    );
    return;
  }
  const zaten = await prisma.auditLog.findFirst({
    where: { action: EYLEM, targetId: iade.id },
    select: { createdAt: true },
  });
  if (zaten) {
    console.log(`\n  İZ VAR (${zaten.createdAt.toISOString()}) — betik durdu.`);
    return;
  }

  console.log("\nÖNCE:");
  console.log(
    `  NET-1 ${iade.net1Amount?.toString()} · NET-2 ${iade.net2Amount?.toString()}`,
  );
  for (const f of iade.fees) {
    console.log(`    ${f.code.padEnd(24)} ${f.amount.toString().padStart(12)}`);
  }

  /** ⚠ DEĞİŞİM MALİYETİ HAREKETTEN OKUNUR — elle sayı verilmez. */
  const degisimMaliyeti = satis.items
    .flatMap((k) => k.stockMovements.filter((h) => h.type === "EXCHANGE_OUT"))
    .reduce(
      (t, h) => t + Number(h.unitCostAmount?.toString() ?? 0) * -h.quantityDelta,
      0,
    );

  const kalemGirdileri = iade.items.map((ik) => {
    const sk = satis.items.find((k) => k.id === ik.saleItemId)!;
    return {
      satilanAdet: sk.quantity,
      iadeAdedi: ik.quantity,
      saglamAdet: ik.quantity - ik.damagedQuantity,
      satisTutari: Number(sk.unitPriceAmount.toString()) * sk.quantity,
      maliyet: satisCikisMaliyeti(
        sk.stockMovements.filter((h) => h.type === "SALE_OUT"),
      ),
      kdvOrani: Number(sk.vatRate?.toString() ?? 20),
      komisyon: komisyonToplami(sk.fees),
      degisimMaliyeti: degisimMaliyeti > 0 ? degisimMaliyeti : null,
    };
  });

  const yeni = iadeEtkisiHesapla({
    returnType: iade.returnType,
    kalemler: kalemGirdileri,
    odemeGideri: satis.fees
      .filter((f) => f.code === "ODEME_GIDERI")
      .reduce((t, f) => t + Math.abs(Number(f.amount.toString())), 0),
    siparisToplami: satis.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    ),
    iadeKargosu:
      iade.returnCargoAmount === null
        ? null
        : Number(iade.returnCargoAmount.toString()),
    /** ⚠ ASIL DEĞİŞİKLİK — belgeden gelen tutar. */
    yenidenGonderimKargosu: TUTAR,
    ceza:
      iade.penaltyAmount === null ? null : Number(iade.penaltyAmount.toString()),
  });

  console.log("\nSONRA (hesaplandı):");
  console.log(
    `  NET-1 ${yeni.net1Etkisi.toFixed(4)} · NET-2 ${yeni.net2Etkisi.toFixed(4)}`,
  );
  for (const s of [...yeni.kalemSatirlari.flat(), ...yeni.genelSatirlar]) {
    console.log(`    ${s.code.padEnd(24)} ${s.tutar.toFixed(2).padStart(12)}`);
  }
  const f1 = yeni.net1Etkisi - Number(iade.net1Amount?.toString() ?? 0);
  const f2 = yeni.net2Etkisi - Number(iade.net2Amount?.toString() ?? 0);
  console.log(
    `\n  NET-1 farkı ${f1 >= 0 ? "+" : ""}${f1.toFixed(2)} · NET-2 farkı ${f2 >= 0 ? "+" : ""}${f2.toFixed(2)}`,
  );

  if (!uygula) {
    console.log("\nRAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.\n");
    return;
  }

  await prisma.$transaction(async (tx) => {
    /**
     * Kesinti dökümü FOTOĞRAFTIR — silinip yeniden üretilir.
     * Stok hareketlerine (ledger) DOKUNULMUYOR.
     */
    await tx.returnFee.deleteMany({ where: { returnId: iade.id } });
    for (let i = 0; i < iade.items.length; i += 1) {
      for (const satir of yeni.kalemSatirlari[i] ?? []) {
        await tx.returnFee.create({
          data: {
            returnId: iade.id,
            returnItemId: iade.items[i].id,
            code: satir.code,
            amount: String(satir.tutar),
            currency: "TRY",
          },
        });
      }
    }
    for (const satir of yeni.genelSatirlar) {
      await tx.returnFee.create({
        data: {
          returnId: iade.id,
          code: satir.code,
          amount: String(satir.tutar),
          currency: "TRY",
        },
      });
    }
    await tx.return.update({
      where: { id: iade.id },
      data: {
        reshipCargoAmount: String(TUTAR),
        net1Amount: String(yeni.net1Etkisi),
        net2Amount: String(yeni.net2Etkisi),
        profitStatus: yeni.durum,
      },
    });
    await tx.auditLog.create({
      data: {
        action: EYLEM,
        targetType: "Return",
        targetId: iade.id,
        detail: JSON.stringify({
          belge: BELGE,
          onceki: {
            reshipCargoAmount: null,
            net1: iade.net1Amount?.toString() ?? null,
            net2: iade.net2Amount?.toString() ?? null,
          },
          yeni: {
            reshipCargoAmount: TUTAR,
            net1: yeni.net1Etkisi,
            net2: yeni.net2Etkisi,
          },
          gerekce:
            "TY kargo faturasında 'Değişim Gönderisi' satırı; bacak defterde yoktu.",
        }),
      },
    });
  });

  const sonra = await prisma.return.findUnique({
    where: { id: iade.id },
    select: { reshipCargoAmount: true, net1Amount: true, net2Amount: true },
  });
  console.log(
    `\n  YAZILDI: reship ${sonra?.reshipCargoAmount?.toString()} · NET-1 ${sonra?.net1Amount?.toString()} · NET-2 ${sonra?.net2Amount?.toString()}\n`,
  );
}

main();
