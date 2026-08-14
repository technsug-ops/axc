/**
 * ============================================================================
 *  GERİYE DÖNÜK: STOĞA DÖNMEYEN MALİYET SATIRI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run maliyet:geri-doldur            (yalnız RAPOR)
 *               npm run maliyet:geri-doldur -- --uygula (YAZAR)
 *
 *  NEDEN: 14.08.2026'ya kadar iade kaydında yalnız `MALIYET_GERI` satırı
 *  yazılıyordu ve o da SAĞLAM adede göreydi. Hasarlıya düşen maliyet hiçbir
 *  yere yazılmıyordu; "stoğa dönmeyen maliyet" kutusu onu dönen maliyetten
 *  türetmeye çalışıyor ve sağlam adet 0'ken ₺0,00 gösteriyordu. Kutunun
 *  altında "maliyeti üstünüzde kaldı" yazıyordu — rakam bunu yalanlıyordu.
 *
 *  GEÇMİŞ SATIR SİLİNMEZ / DEĞİŞTİRİLMEZ (anayasa). Düzeltme EKLEYEREK
 *  yapılır: eksik ayrıştırma için İKİ satır yazılır —
 *      MALIYET_GERI      +hasarlıya düşen maliyet   (eski satırı tamamlar)
 *      MALIYET_DONMEYEN  −hasarlıya düşen maliyet   (kutunun okuduğu satır)
 *  İKİSİNİN TOPLAMI SIFIRDIR: `net1 = satırların toplamı` olduğu için
 *  kayıtlı NET-1 / NET-2 rakamları AYNEN KALIR. Bu bir düzeltme değil,
 *  eksik kalmış bir kırılımın tamamlanmasıdır.
 *
 *  Yalnızca hasarlı adedi olan ve MALIYET_DONMEYEN satırı BULUNMAYAN iade
 *  kalemlerine dokunur; ikinci kez çalıştırmak zararsızdır.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)),
  });

  console.log("");
  console.log("STOĞA DÖNMEYEN MALİYET — GERİYE DÖNÜK TAMAMLAMA");
  console.log(`  hedef   ${y.veri.adres.hostname}`);
  console.log(`  kip     ${UYGULA ? "UYGULA (yazar)" : "yalnız RAPOR"}`);
  console.log("");

  const kalemler = await prisma.returnItem.findMany({
    where: { damagedQuantity: { gt: 0 } },
    select: {
      id: true,
      quantity: true,
      damagedQuantity: true,
      returnId: true,
      return: { select: { profitCurrency: true, occurredAt: true } },
      saleItem: {
        select: {
          quantity: true,
          variant: { select: { sku: true } },
          stockMovements: {
            where: { type: "SALE_OUT" },
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
      fees: { select: { code: true } },
    },
  });

  let yazilan = 0;
  let atlanan = 0;

  for (const k of kalemler) {
    const sku = k.saleItem.variant.sku;

    if (k.fees.some((f) => f.code === "MALIYET_DONMEYEN")) {
      console.log(`  ATLA  ${sku} — satır zaten var`);
      atlanan++;
      continue;
    }

    /** Satış çıkışının TOPLAM maliyeti; biri maliyetsizse hesap yapılamaz. */
    let maliyet = 0;
    let eksik = false;
    for (const h of k.saleItem.stockMovements) {
      if (h.unitCostAmount === null) {
        eksik = true;
        break;
      }
      maliyet +=
        Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta);
    }
    if (eksik || k.saleItem.stockMovements.length === 0) {
      console.log(`  ATLA  ${sku} — satış çıkışında maliyet YOK (uydurulmaz)`);
      atlanan++;
      continue;
    }

    const hasarliOran = k.damagedQuantity / k.saleItem.quantity;
    const tutar = maliyet * hasarliOran;
    const paraBirimi = k.return.profitCurrency ?? "TRY";

    console.log(
      `  YAZ   ${sku} — hasarlı ${k.damagedQuantity}/${k.saleItem.quantity} → ${tutar.toFixed(2)} ${paraBirimi}`,
    );

    if (UYGULA) {
      await prisma.$transaction([
        prisma.returnFee.create({
          data: {
            returnId: k.returnId,
            returnItemId: k.id,
            code: "MALIYET_GERI",
            amount: String(tutar),
            currency: paraBirimi,
          },
        }),
        prisma.returnFee.create({
          data: {
            returnId: k.returnId,
            returnItemId: k.id,
            code: "MALIYET_DONMEYEN",
            amount: String(-tutar),
            currency: paraBirimi,
          },
        }),
      ]);
    }
    yazilan++;
  }

  console.log("");
  console.log(`  ${yazilan} kalem ${UYGULA ? "yazıldı" : "yazılacak"}, ${atlanan} atlandı`);
  if (!UYGULA && yazilan > 0) {
    console.log("");
    console.log("  Yazmak için:  npm run maliyet:geri-doldur -- --uygula");
  }
  console.log("");
  console.log("  NET-1 / NET-2 DEĞİŞMEZ: eklenen iki satırın toplamı sıfırdır.");
  console.log("");

  await prisma.$disconnect();
}

main().catch((e) => {
  const y = canliYapilandirma();
  const metin = e instanceof Error ? e.message : String(e);
  console.log(
    "HATA:",
    y.tamam ? parolayiTemizle(metin, y.veri.parola) : metin,
  );
  process.exitCode = 1;
});
