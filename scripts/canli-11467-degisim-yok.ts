/**
 * ============================================================================
 *  11467064391 — DEĞİŞİM YAPILMADI, ÇIKIŞ GERİ ALINIR (kimliğe kilitli)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"Bu sipariş iade edildi ama ben reddettim ve
 *  itirazım kabul edilerek AYNI ÜRÜN müşteriye geri gönderildi. Değişim
 *  yapılmadı."_
 *
 *  ⚠ İKİ AYRI ŞEY VARDI VE İLK DÜZELTMEMDE KARIŞTIRDIM:
 *    · İADE GERÇEK       → bildirimler DURUR (iptal edilmez)
 *    · DEĞİŞİM YOK       → `EXCHANGE_OUT` hareketi OLMAMALI
 *  "Gerçek iade" cümlesini "her şey gerçek" diye okudum ve çıkışı da geri
 *  yükledim. Bu betik yalnız ÇIKIŞI kaldırıyor, bildirimlere dokunmuyor.
 *
 *  ⚠ DEPODAN İKİNCİ MAL ÇIKMADI. Satılan mal müşteriye gitti, iade geldi,
 *  itiraz kazanıldı ve AYNI mal geri gönderildi. Fiziksel net etki: satıştaki
 *  tek çıkış. `EXCHANGE_OUT` ikinci bir malın çıktığını iddia ediyor ve bu
 *  iddia yanlış — hem stoğu hem satışın NET'ini bozuyor.
 *
 *  ⚠ AYIRMA DA TEMİZLENİR. `ITIRAZ_KABUL` bildirimindeki ayrılmış ürün bir
 *  NİYET beyanıydı ve niyet gerçekleşmedi. Bırakılsaydı ekranda sonsuza
 *  kadar kırmızı _"ayrılan ürün stoktan düşülmedi"_ yanardı — sönmeyen
 *  uyarı, rozetin tamamına olan güveni götürür.
 *
 *  ⚠ SİLME YOK, DÖRDÜNCÜ HAREKET YAZILIR — ve bu ÇİRKİN ama DÜRÜST.
 *  Defterde bu satış için dört `EXCHANGE_OUT` satırı oluyor:
 *      −1  düğmeye basıldı (deneme)
 *      +1  "hepsi test" denince geri alındı
 *      −1  "gerçek iade" denince geri yüklendi   ← benim hatam
 *      +1  "değişim yapılmadı" (bu betik)
 *  Dördü de fiziksel bir olaya karşılık GELMİYOR. Silmek daha temiz
 *  görünürdü ama ilk hareket bir FIFO partisi tüketti; silmek o bağı
 *  koparır ve "parti tüketilmiş görünür, tüketen yoktur" durumunu yaratır.
 *  Dört satır kalıyor, her biri notunda niye var olduğunu yazıyor.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-11467-degisim-yok.ts           → RAPOR
 *    npx tsx scripts/canli-11467-degisim-yok.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "11467064391";
const EYLEM = "DEGISIM_YAPILMADI";
const GEREKCE =
  "Değişim yapılmadı — itiraz kabul, AYNI ürün müşteriye geri gönderildi (kullanıcı beyanı 23.08.2026)";

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
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log(`DEĞİŞİM YOK — ${SIPARIS_NO}`);
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      id: true,
      net1Amount: true,
      net2Amount: true,
      items: {
        select: {
          id: true,
          stockMovements: {
            where: { type: "EXCHANGE_OUT" },
            select: {
              id: true,
              variantId: true,
              quantityDelta: true,
              unitCostAmount: true,
              unitCostCurrency: true,
              locationId: true,
              variant: { select: { sku: true } },
            },
          },
        },
      },
      returnNotices: {
        where: { NOT: { reservedVariantId: null } },
        select: { id: true, status: true, reservedQuantity: true },
      },
    },
  });
  if (!satis) {
    console.log("satış bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  const zaten = await prisma.auditLog.findFirst({
    where: { action: EYLEM, targetId: satis.id },
    select: { createdAt: true },
  });
  if (zaten) {
    console.log(`Zaten uygulanmış (${zaten.createdAt.toISOString()}) — betik durdu.`);
    return;
  }

  const hareketler = satis.items.flatMap((k) =>
    k.stockMovements.map((h) => ({ ...h, saleItemId: k.id })),
  );
  /**
   * ⚠ NET BAKİYE ÜZERİNDEN ÇALIŞ. Dört ayrı satır var; tek tek terslemek
   * yerine TOPLAMI sıfıra getiren tek hareket yazılır. Aksi hâlde defter
   * sekiz satıra çıkar ve okunamaz olur.
   */
  const netBakiye = hareketler.reduce((t, h) => t + h.quantityDelta, 0);

  console.log(`\n  ÖNCE  NET-1 ${satis.net1Amount?.toString()} · NET-2 ${satis.net2Amount?.toString()}`);
  console.log(`  mevcut EXCHANGE_OUT satırı: ${hareketler.length}`);
  for (const h of hareketler) {
    console.log(`    ${h.variant.sku} ${h.quantityDelta > 0 ? "+" : ""}${h.quantityDelta}`);
  }
  console.log(`  net bakiye: ${netBakiye}  →  yazılacak düzeltme: ${-netBakiye}`);
  console.log(`  temizlenecek ayırma: ${satis.returnNotices.length}`);
  for (const b of satis.returnNotices) {
    console.log(`    ${b.id} ${b.status} · ayrılan ${b.reservedQuantity}`);
  }

  if (netBakiye === 0 && satis.returnNotices.length === 0) {
    console.log("\n  yapılacak bir şey yok.");
    return;
  }

  if (!uygula) {
    console.log("\nRAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  const ornek = hareketler[0];
  await prisma.$transaction(async (tx) => {
    if (netBakiye !== 0 && ornek) {
      await tx.stockMovement.create({
        data: {
          variantId: ornek.variantId,
          type: "EXCHANGE_OUT",
          quantityDelta: -netBakiye,
          occurredAt: new Date(),
          saleItemId: ornek.saleItemId,
          locationId: ornek.locationId,
          unitCostAmount: ornek.unitCostAmount,
          unitCostCurrency: ornek.unitCostCurrency,
          note: GEREKCE,
        },
      });
    }

    for (const b of satis.returnNotices) {
      await tx.returnNotice.update({
        where: { id: b.id },
        data: { reservedVariantId: null, reservedQuantity: 0, note: GEREKCE },
      });
    }

    await tx.auditLog.create({
      data: {
        action: EYLEM,
        targetType: "Sale",
        targetId: satis.id,
        detail: JSON.stringify({
          siparisNo: SIPARIS_NO,
          gerekce: GEREKCE,
          oncekiNetBakiye: netBakiye,
          yazilanDuzeltme: -netBakiye,
          temizlenenAyirmalar: satis.returnNotices.map((b) => ({
            id: b.id,
            durum: b.status,
            adet: b.reservedQuantity,
          })),
        }),
      },
    });
  });

  await satisKarTazele(satis.id);

  const sonra = await prisma.sale.findUnique({
    where: { id: satis.id },
    select: { net1Amount: true, net2Amount: true },
  });
  const stok = await prisma.stockMovement.aggregate({
    where: { variantId: ornek?.variantId },
    _sum: { quantityDelta: true },
  });
  console.log(`\n  SONRA NET-1 ${sonra?.net1Amount?.toString()} · NET-2 ${sonra?.net2Amount?.toString()}`);
  console.log(`    ${ornek?.variant.sku} stok: ${stok._sum.quantityDelta ?? 0}`);
}

main();
