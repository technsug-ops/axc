/**
 * ============================================================================
 *  11473322212 — İADE "PARA İADESİ" SAYILMIŞ, OYSA DEĞİŞİMDİ (K41)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 24.08.2026 (AXCALI mağazasından teyit): _"Değişim oldu, para
 *  bizde kaldı, yeni ürün gönderildi, hasarlı ürün çöp oldu."_
 *
 *  ⚠ KÖK NEDEN ZİNCİRİ — üçü de bugün bulundu:
 *    ① iade formunun ön-doldurması gerekçeye bağlıydı; müşteri sebebi
 *       `HASARLI` olduğu için ayrılan değişim ürünü forma HİÇ taşınmadı
 *    ② motor değişimi şu tek satırdan anlıyor:
 *          const degisimMi = kalem.degisimMaliyeti !== null;
 *       alan boş geldiği için `degisimMi = false`
 *    ③ sonuç: iade PARA İADESİ gibi hesaplandı — ciro geri alındı
 *       (`KAYIP_GELIR −2.980`), komisyon iade edildi, stopaj geri geldi
 *
 *  ⚠ SNAPSHOT DOKUNULMAZLIĞI BURAYA UYMAZ. O ilke, DOĞRU koşullarla
 *  hesaplanmış bir damgayı sonraki değişikliklerden korumak için var. Burada
 *  damga YANLIŞ GİRDİYLE hesaplandı; korunan şey geçmiş değil, hatanın
 *  kendisi olurdu. (Anayasa: "ilke, kendi kapsamının dışına uygulanırsa
 *  hatayı korur" — kanal taşıması vakasının aynısı.)
 *
 *  ⚠ MALİYET_GERİ KALIYOR VE BU DOĞRU. Eski mal fiziken döndü, maliyeti geri
 *  geldi; sonra K38 ile hurdaya düşürüldü ve kayıp DÖNEM tarafına (fire
 *  zararı ₺1.799) yazıldı. Aynı lira iki kez düşmüyor: iadede geri geliyor,
 *  hurdada gidiyor.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-11473-degisim-kari.ts           → RAPOR
 *    npx tsx scripts/canli-11473-degisim-kari.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "11473322212";
const EYLEM = "IADE_DEGISIM_OLARAK_DUZELTILDI";
const GEREKCE =
  "Değişim olarak düzeltildi — para satıcıda kaldı, yeni ürün gönderildi (AXCALI teyidi 24.08.2026)";

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
  console.log(`İADE DEĞİŞİME ÇEVRİLİYOR — ${SIPARIS_NO}`);
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);

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
      fees: { select: { id: true, code: true, amount: true, returnItemId: true } },
    },
  });
  if (!iade) {
    console.log("iade bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  const zaten = await prisma.auditLog.findFirst({
    where: { action: EYLEM, targetId: iade.id },
    select: { createdAt: true },
  });
  if (zaten) {
    console.log(`Zaten düzeltilmiş (${zaten.createdAt.toISOString()}) — betik durdu.`);
    return;
  }

  console.log("\nMEVCUT (para iadesi gibi hesaplanmış):");
  console.log(`  tip ${iade.returnType} · NET-1 ${iade.net1Amount?.toString()} · NET-2 ${iade.net2Amount?.toString()}`);
  for (const f of iade.fees) {
    console.log(`    ${f.code.padEnd(22)} ${f.amount.toString().padStart(12)}`);
  }

  /**
   * ⚠ DEĞİŞİM MALİYETİ HAREKETTEN OKUNUR, ELLE VERİLMEZ. `EXCHANGE_OUT`
   * hareketi FIFO partisinden gelen gerçek birim maliyeti taşıyor; buraya
   * bir sayı yazmak, defterle çelişebilecek ikinci bir gerçek olurdu.
   */
  const degisimHareketleri = satis.items.flatMap((k) =>
    k.stockMovements.filter((h) => h.type === "EXCHANGE_OUT"),
  );
  const degisimMaliyeti = degisimHareketleri.reduce(
    (t, h) => t + Number(h.unitCostAmount?.toString() ?? 0) * -h.quantityDelta,
    0,
  );
  console.log(`\n  EXCHANGE_OUT hareketi: ${degisimHareketleri.length} · toplam maliyet ${degisimMaliyeti}`);
  if (degisimMaliyeti <= 0) {
    console.log("  ⚠ değişim maliyeti 0 — motor bunu değişim saymaz, betik durdu.");
    process.exitCode = 1;
    return;
  }

  const kalemGirdileri = iade.items.map((ik) => {
    const sk = satis.items.find((k) => k.id === ik.saleItemId)!;
    const satisTutari = Number(sk.unitPriceAmount.toString()) * sk.quantity;
    return {
      satilanAdet: sk.quantity,
      iadeAdedi: ik.quantity,
      saglamAdet: ik.quantity - ik.damagedQuantity,
      satisTutari,
      maliyet: satisCikisMaliyeti(
        sk.stockMovements.filter((h) => h.type === "SALE_OUT"),
      ),
      kdvOrani: Number(sk.vatRate?.toString() ?? 20),
      komisyon: komisyonToplami(sk.fees),
      /** ⚠ ASIL DÜZELTME: alan artık DOLU → `degisimMi = true`. */
      degisimMaliyeti,
    };
  });

  const odemeGideri = satis.fees
    .filter((f) => f.code === "ODEME_GIDERI")
    .reduce((t, f) => t + Math.abs(Number(f.amount.toString())), 0);

  const yeni = iadeEtkisiHesapla({
    returnType: iade.returnType,
    kalemler: kalemGirdileri,
    odemeGideri,
    /** Sipariş toplamı kalemlerden türer — `Sale`de tek alan yok. */
    siparisToplami: satis.items.reduce(
      (t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity,
      0,
    ),
    iadeKargosu:
      iade.returnCargoAmount === null ? null : Number(iade.returnCargoAmount.toString()),
    yenidenGonderimKargosu:
      iade.reshipCargoAmount === null ? null : Number(iade.reshipCargoAmount.toString()),
    ceza: iade.penaltyAmount === null ? null : Number(iade.penaltyAmount.toString()),
  });

  console.log("\nYENİ (değişim olarak):");
  console.log(`  durum ${yeni.durum} · NET-1 ${yeni.net1Etkisi.toFixed(4)} · NET-2 ${yeni.net2Etkisi.toFixed(4)}`);
  for (const satirlar of yeni.kalemSatirlari) {
    for (const s of satirlar) {
      console.log(`    ${s.code.padEnd(22)} ${s.tutar.toFixed(2).padStart(12)}`);
    }
  }
  for (const s of yeni.genelSatirlar) {
    console.log(`    ${s.code.padEnd(22)} ${s.tutar.toFixed(2).padStart(12)}`);
  }

  const fark2 = yeni.net2Etkisi - Number(iade.net2Amount?.toString() ?? 0);
  console.log(`\n  NET-2 FARKI: ${fark2 >= 0 ? "+" : ""}${fark2.toFixed(2)}`);

  if (!uygula) {
    console.log("\nRAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    /**
     * ⚠ ESKİ KESİNTİ DÖKÜMÜ SİLİNİP YENİSİ YAZILIYOR. Bu satırlar hesabın
     * FOTOĞRAFI — ledger değil (satış tarafında da `karYenidenYaz` aynısını
     * yapıyor). Ledger olan stok hareketlerine DOKUNULMUYOR.
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
        net1Amount: String(yeni.net1Etkisi),
        net2Amount: String(yeni.net2Etkisi),
        profitStatus: yeni.durum,
        note: GEREKCE,
      },
    });

    await tx.auditLog.create({
      data: {
        action: EYLEM,
        targetType: "Return",
        targetId: iade.id,
        detail: JSON.stringify({
          siparisNo: SIPARIS_NO,
          gerekce: GEREKCE,
          onceki: {
            net1: iade.net1Amount?.toString() ?? null,
            net2: iade.net2Amount?.toString() ?? null,
            kesintiler: iade.fees.map((f) => ({ kod: f.code, tutar: f.amount.toString() })),
          },
          yeni: {
            net1: yeni.net1Etkisi,
            net2: yeni.net2Etkisi,
            kesintiler: [
              ...yeni.kalemSatirlari.flat(),
              ...yeni.genelSatirlar,
            ].map((s) => ({ kod: s.code, tutar: s.tutar })),
          },
          degisimMaliyeti,
        }),
      },
    });
  });

  const sonra = await prisma.return.findUnique({
    where: { id: iade.id },
    select: { net1Amount: true, net2Amount: true },
  });
  console.log(`\n  SONRA NET-1 ${sonra?.net1Amount?.toString()} · NET-2 ${sonra?.net2Amount?.toString()}`);
}

main();
