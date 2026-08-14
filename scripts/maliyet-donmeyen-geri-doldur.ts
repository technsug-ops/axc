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
 *  DÖRT ŞART (kullanıcı 14.08.2026):
 *   1. İDEMPOTENT — ikinci koşum mükerrer satır YAZMAZ. Yazımdan ÖNCE
 *      GERÇEK bir deneme yapılır ve GERİ ALINIR: satırlar transaction içinde
 *      yazılır, aynı tarama tekrar koşturulur, sonuç 0 çıkmalı, sonra
 *      transaction bilerek düşürülür. İddiayı okumakla yetinmiyoruz.
 *   2. ÖNCE/SONRA NET — her iadenin NET-1 ve NET-2'si yazımdan önce ve sonra
 *      BİREBİR aynı olmalı. Değişirse betik HATA ile durur.
 *   3. Dönem toplamı yazımdan sonra raporlanır.
 *   4. TEK TRANSACTION — bütün kalemler tek işlemde; yarım yazım olamaz.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

/** Denemeyi geri almak için bilerek atılan istisna. */
class DenemeyiGeriAl extends Error {}

const YAPILANDIRMA = canliYapilandirma();

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(
    betikAdresi(YAPILANDIRMA.tamam ? YAPILANDIRMA.veri.ham : ""),
  ),
});

type Yazilacak = {
  returnItemId: string;
  returnId: string;
  sku: string;
  hasarli: number;
  satilan: number;
  tutar: number;
  paraBirimi: "TRY" | "EUR";
};

/** Eksik kırılımı olan iade kalemlerini bulur. Boş dizi = yapılacak iş yok. */
async function yazilacaklariBul(istemci: {
  returnItem: typeof prisma.returnItem;
}): Promise<{ liste: Yazilacak[]; atlanan: string[] }> {
  const kalemler = await istemci.returnItem.findMany({
    where: { damagedQuantity: { gt: 0 } },
    select: {
      id: true,
      damagedQuantity: true,
      returnId: true,
      return: { select: { profitCurrency: true } },
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

  const liste: Yazilacak[] = [];
  const atlanan: string[] = [];

  for (const k of kalemler) {
    const sku = k.saleItem.variant.sku;

    // İDEMPOTENS KAPISI: kırılımı olan kaleme bir daha yazılmaz.
    if (k.fees.some((f) => f.code === "MALIYET_DONMEYEN")) {
      atlanan.push(`${sku} — kırılım zaten var`);
      continue;
    }

    let maliyet = 0;
    let eksik = k.saleItem.stockMovements.length === 0;
    for (const h of k.saleItem.stockMovements) {
      if (h.unitCostAmount === null) {
        eksik = true;
        break;
      }
      maliyet += Number(h.unitCostAmount.toString()) * Math.abs(h.quantityDelta);
    }
    if (eksik) {
      atlanan.push(`${sku} — satış çıkışında maliyet YOK (uydurulmaz)`);
      continue;
    }

    liste.push({
      returnItemId: k.id,
      returnId: k.returnId,
      sku,
      hasarli: k.damagedQuantity,
      satilan: k.saleItem.quantity,
      tutar: maliyet * (k.damagedQuantity / k.saleItem.quantity),
      paraBirimi: (k.return.profitCurrency ?? "TRY") as "TRY" | "EUR",
    });
  }

  return { liste, atlanan };
}

/** İlgili iadelerin kayıtlı NET rakamları ve satır toplamı. */
async function netOlc(iadeIdleri: string[]) {
  const iadeler = await prisma.return.findMany({
    where: { id: { in: iadeIdleri } },
    select: {
      id: true,
      net1Amount: true,
      net2Amount: true,
      fees: { select: { amount: true } },
      items: { select: { saleItem: { select: { variant: { select: { sku: true } } } } } },
    },
  });
  return iadeler.map((i) => ({
    id: i.id,
    sku: i.items[0]?.saleItem.variant.sku ?? "?",
    net1: i.net1Amount === null ? null : Number(i.net1Amount.toString()),
    net2: i.net2Amount === null ? null : Number(i.net2Amount.toString()),
    satirToplami: i.fees.reduce((t, f) => t + Number(f.amount.toString()), 0),
  }));
}

const para = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("STOĞA DÖNMEYEN MALİYET — GERİYE DÖNÜK TAMAMLAMA");
  console.log(`  hedef   ${y.veri.adres.hostname}`);
  console.log(`  kip     ${UYGULA ? "UYGULA (yazar)" : "yalnız RAPOR"}`);

  const { liste, atlanan } = await yazilacaklariBul(prisma);

  console.log("");
  console.log("--- YAPILACAK İŞ ---");
  for (const a of atlanan) console.log(`  ATLA  ${a}`);
  for (const i of liste) {
    console.log(
      `  YAZ   ${i.sku} — hasarlı ${i.hasarli}/${i.satilan} → ${para(i.tutar)} ${i.paraBirimi}`,
    );
  }
  if (liste.length === 0) {
    console.log("  (yapılacak iş yok — hepsi tamam)");
    await prisma.$disconnect();
    return;
  }

  const iadeIdleri = [...new Set(liste.map((i) => i.returnId))];

  // ---------------------------------------------------------------- 2) ÖNCE
  const once = await netOlc(iadeIdleri);
  console.log("");
  console.log("--- YAZIMDAN ÖNCE (kayıtlı NET) ---");
  for (const o of once) {
    console.log(
      `  ${o.sku.padEnd(14)} NET-1 ${para(o.net1).padStart(12)}   NET-2 ${para(o.net2).padStart(12)}   satır toplamı ${para(o.satirToplami)}`,
    );
  }

  if (!UYGULA) {
    console.log("");
    console.log("  Yazmak için:  npm run maliyet:geri-doldur -- --uygula");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ------------------------------------------------ 1) İDEMPOTENS DENEMESİ
  /**
   * GERÇEK YAZIM DENEMESİ, SONRA GERİ ALMA. "Kod atlıyor" demek yetmez:
   * satırları yazıp taramayı TEKRAR koşturuyoruz. İkinci tarama boş
   * dönmezse betik hiç yazmadan durur.
   */
  console.log("");
  console.log("--- İDEMPOTENS DENEMESİ (yazılır, sonra GERİ ALINIR) ---");
  let denemeSonucu = -1;
  try {
    await prisma.$transaction(async (tx) => {
      for (const i of liste) {
        await tx.returnFee.create({
          data: {
            returnId: i.returnId,
            returnItemId: i.returnItemId,
            code: "MALIYET_GERI",
            amount: String(i.tutar),
            currency: i.paraBirimi,
          },
        });
        await tx.returnFee.create({
          data: {
            returnId: i.returnId,
            returnItemId: i.returnItemId,
            code: "MALIYET_DONMEYEN",
            amount: String(-i.tutar),
            currency: i.paraBirimi,
          },
        });
      }
      const tekrar = await yazilacaklariBul(tx as unknown as { returnItem: typeof prisma.returnItem });
      denemeSonucu = tekrar.liste.length;
      throw new DenemeyiGeriAl();
    });
  } catch (e) {
    if (!(e instanceof DenemeyiGeriAl)) throw e;
  }

  if (denemeSonucu !== 0) {
    console.log(
      `  BAŞARISIZ — ikinci tarama ${denemeSonucu} kalem daha yazmak istiyor. İDEMPOTENT DEĞİL, yazılmadı.`,
    );
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("  OK — ikinci tarama 0 kalem döndü (mükerrer yazım imkânsız)");

  const geriAlindi = await yazilacaklariBul(prisma);
  if (geriAlindi.liste.length !== liste.length) {
    console.log("  BAŞARISIZ — deneme GERİ ALINMAMIŞ. Yazılmadı.");
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }
  console.log("  OK — deneme geri alındı, veritabanı dokunulmamış durumda");

  // ------------------------------------------------- 4) TEK TRANSACTION YAZIM
  console.log("");
  console.log("--- YAZIM (tek transaction) ---");
  await prisma.$transaction(async (tx) => {
    for (const i of liste) {
      await tx.returnFee.create({
        data: {
          returnId: i.returnId,
          returnItemId: i.returnItemId,
          code: "MALIYET_GERI",
          amount: String(i.tutar),
          currency: i.paraBirimi,
        },
      });
      await tx.returnFee.create({
        data: {
          returnId: i.returnId,
          returnItemId: i.returnItemId,
          code: "MALIYET_DONMEYEN",
          amount: String(-i.tutar),
          currency: i.paraBirimi,
        },
      });
    }
  });
  console.log(`  ${liste.length} kalem × 2 satır yazıldı`);

  // --------------------------------------------------------------- 2) SONRA
  const sonra = await netOlc(iadeIdleri);
  console.log("");
  console.log("--- YAZIMDAN SONRA (kayıtlı NET) ---");
  let kaydi = false;
  for (const s of sonra) {
    const o = once.find((x) => x.id === s.id)!;
    const ayni = o.net1 === s.net1 && o.net2 === s.net2;
    if (!ayni) kaydi = true;
    console.log(
      `  ${s.sku.padEnd(14)} NET-1 ${para(s.net1).padStart(12)}   NET-2 ${para(s.net2).padStart(12)}   satır toplamı ${para(s.satirToplami)}   ${ayni ? "AYNI ✓" : "DEĞİŞTİ ✗"}`,
    );
  }
  if (kaydi) {
    console.log("");
    console.log("  ⚠ NET RAKAMI KAYDI — beklenmeyen durum, incelenmeli.");
    process.exitCode = 1;
  }

  // ------------------------------------------------------- 3) DÖNEM TOPLAMI
  const donmeyenSatirlar = await prisma.returnFee.findMany({
    where: { code: "MALIYET_DONMEYEN" },
    select: { amount: true, currency: true },
  });
  const toplam = donmeyenSatirlar.reduce(
    (t, f) => t + Math.abs(Number(f.amount.toString())),
    0,
  );
  console.log("");
  console.log("--- DÖNEM ÖZETİ İÇİN ---");
  console.log(`  Stoğa dönmeyen maliyet toplamı: ${para(toplam)} TRY`);
  console.log(`  (${donmeyenSatirlar.length} satır)`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((e) => {
  const y = canliYapilandirma();
  const metin = e instanceof Error ? e.message : String(e);
  console.log("HATA:", y.tamam ? parolayiTemizle(metin, y.veri.parola) : metin);
  process.exitCode = 1;
});
