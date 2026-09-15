import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";
import { izYaz } from "../src/lib/iz";

/**
 * ============================================================================
 *  DÜZELTME: `kargoTartimGeldiTazele`NİN 15.09.2026'DA `cargoAmount`I
 *  YANLIŞLIKLA DOLDURDUĞU 19 SİPARİŞİ GERİ AL
 * ----------------------------------------------------------------------------
 *      Kuru koşum:  npm run canli:kargo-amount-kirlenme-duzelt
 *      Yazım:       npm run canli:kargo-amount-kirlenme-duzelt -- --yaz
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bugün (15.09.2026) `satisKarTazele`nin
 *  düzeltilmemiş hâliyle yazılan 19 kaydın kimliğine kilitli, genel araç
 *  hâline getirilmez.
 *
 *  ⛔ NİYE VAR: `kargoTartimGeldiTazele` → `satisKarTazele` çağrısı,
 *  `kar-yeniden.ts`teki `cargoAmountTahminiMi` bayrağı eklenmeden ÖNCE
 *  çalıştı ve TAHMİNİ kargo tutarını `cargoAmount`a (kanalın GERÇEKLEŞEN
 *  kesintisi alanına) yazdı — K197-4'ün "tahmin cargoAmount'ı hiçbir
 *  şekilde etkilemez" sözünü bozdu. `tahminiKargo`, `net1Amount`,
 *  `net2Amount`, `SaleFee` satırları DOĞRUYDU (kaynak sırası ve tutar
 *  isabetliydi); yalnız `cargoAmount` alanı yanlış yere yazıldı.
 *
 *  ⭐ ÖLÇÜT YENİDEN HESAPLANABİLİR (`AuditLog` üzerinden), sabit bir liste
 *  DEĞİL: `KARGO_TAHMIN_TARTIMLA_TAZELE` izinde `detail.yeniTahmin` alanı
 *  var olan ve `Sale.cargoAmount` şu an TAM O DEĞERE eşit olan kayıtlar.
 *  Eşitlik kuruşuna aranır (K6: "karşılaştırma kuruşuna").
 *
 *  ⚠ GÜVENLİK KAPISI: yalnız `cargoAmount === yeniTahmin` (kuruşuna) olan
 *  satırlara dokunulur. Arada BAŞKA bir yazım (ör. gerçek hakediş) bu
 *  değeri ÜSTÜNE YAZDIYSA eşitlik bozulur ve satır ATLANIR — gerçek bir
 *  gerçekleşen tutar YANLIŞLIKLA silinmez.
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
  console.log("  cargoAmount KİRLENMESİ DÜZELTMESİ (K197-4 ihlali, 15.09.2026)");
  console.log(`  kip: ${YAZ ? "YAZIM" : "KURU KOŞUM (önizleme)"}`);
  console.log("=".repeat(78));

  const izler = await prisma.auditLog.findMany({
    where: { action: "KARGO_TAHMIN_TARTIMLA_TAZELE" },
    select: { targetId: true, detail: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nKARGO_TAHMIN_TARTIMLA_TAZELE izi: ${izler.length}`);

  let duzeltilecek = 0;
  let zatenFarkli = 0;
  let cozulemeyen = 0;
  let yazilan = 0;

  for (const iz of izler) {
    if (!iz.targetId) {
      cozulemeyen++;
      continue;
    }
    let detay: { yeniTahmin?: number } | null = null;
    try {
      detay = iz.detail ? JSON.parse(iz.detail) : null;
    } catch {
      cozulemeyen++;
      console.log(`  ⏭  ${iz.targetId}  İZ ÇÖZÜLEMEDİ (bozuk JSON) — atlandı, dokunulmadı`);
      continue;
    }
    if (!detay || typeof detay.yeniTahmin !== "number") {
      cozulemeyen++;
      continue;
    }

    const satis = await prisma.sale.findUnique({
      where: { id: iz.targetId },
      select: { code: true, cargoAmount: true, tahminiKargo: true },
    });
    if (!satis || satis.cargoAmount === null) continue; // zaten temiz

    const kayitliCargoAmount = Number(satis.cargoAmount.toString());
    const fark = Math.abs(kayitliCargoAmount - detay.yeniTahmin);
    if (fark > 0.005) {
      zatenFarkli++;
      console.log(
        `  ⏭  ${satis.code}  cargoAmount=${kayitliCargoAmount.toFixed(2)} ≠ yazılan tahmin=${detay.yeniTahmin.toFixed(2)}` +
          `  → ARADA BAŞKA BİR YAZIM OLMUŞ, DOKUNULMADI`,
      );
      continue;
    }

    duzeltilecek++;
    console.log(
      `  ${YAZ ? "→" : "○"} ${satis.code}  cargoAmount ${kayitliCargoAmount.toFixed(2)} → null  (tahminiKargo ${Number(satis.tahminiKargo!.toString()).toFixed(2)} olarak KALIYOR)`,
    );

    if (YAZ) {
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: iz.targetId! },
          data: { cargoAmount: null, cargoCurrency: null },
        });
        await izYaz(
          {
            action: "KARGO_AMOUNT_KIRLENME_DUZELTILDI",
            targetType: "Sale",
            targetId: iz.targetId!,
            userId: null,
            detail: JSON.stringify({
              eskiCargoAmount: kayitliCargoAmount,
              yeni: null,
              gerekce: "kargoTartimGeldiTazele, cargoAmountTahminiMi bayrağı eklenmeden önce cargoAmount'a yanlışlıkla yazmıştı",
            }),
          },
          tx,
        );
      });
      yazilan++;
    }
  }

  console.log("\n" + "=".repeat(78));
  console.log(`  DÜZELTİLECEK (iz ile birebir tutan)   ${duzeltilecek}`);
  console.log(`  ARADA BAŞKA YAZIM OLMUŞ (atlandı)     ${zatenFarkli}`);
  if (cozulemeyen > 0) console.log(`  İZ ÇÖZÜLEMEDİ (atlandı)                ${cozulemeyen}`);
  if (YAZ) console.log(`  YAZILAN                                ${yazilan}`);
  console.log(YAZ ? "\n  YAZILDI." : "\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}
main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
