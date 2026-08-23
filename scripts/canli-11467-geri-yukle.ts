/**
 * ============================================================================
 *  11467064391 — YANLIŞ SIFIRLAMA GERİ ALINIR (kimliğe kilitli)
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"11467064391 bu gerçek iade."_
 *
 *  NE OLDU: kullanıcı üç siparişi "deneme testi" diye bildirdi ve
 *  `canli-deneme-sifirla.ts` üçüne de uygulandı. Sonra bu siparişin GERÇEK
 *  olduğu söylendi. Yapılan iş geri alınıyor.
 *
 *  ⚠ ÜÇÜNCÜ HAREKET YAZILIR, İKİNCİSİ SİLİNMEZ. Silmek en temiz GÖRÜNEN yol
 *  ama yaptığım hatayı gizlerdi. Üç satır, üçü de açıklanabilir:
 *      −1  değişim ürünü gönderildi   (gerçek olay)
 *      +1  yanlışlıkla geri alındı    (benim hatam)
 *      −1  geri yükleme               (bu betik)
 *  Defter, olanı anlatır — olması gerekeni değil.
 *
 *  ⚠ BİLDİRİM DURUMLARI İZDEN OKUNUR, TAHMİN EDİLMEZ. `DENEME_GERI_ALINDI`
 *  izi her bildirimin ÖNCEKİ durumunu ve serbest bırakılan adedi taşıyor;
 *  geri yükleme oradan besleniyor. İz olmasaydı bu betik yazılamazdı — bu,
 *  "istisna iz bırakır" kuralının niye kural olduğunun ölçüsü.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-11467-geri-yukle.ts           → RAPOR
 *    npx tsx scripts/canli-11467-geri-yukle.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "11467064391";
const GERI_ALMA_EYLEMI = "DENEME_GERI_ALINDI";
const YUKLEME_EYLEMI = "DENEME_GERI_YUKLENDI";
const GEREKCE =
  "Yanlış sıfırlama geri yüklendi — kullanıcı düzeltmesi 23.08.2026: bu gerçek iade";

type IzKaydi = {
  iptalEdilenBildirimler?: {
    id: string;
    oncekiDurum: string;
    serbestBirakilan: number;
  }[];
  geriAlinan?: { hareketId: string; sku: string; adet: number; birimMaliyet: string | null }[];
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
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log(`GERİ YÜKLEME — ${SIPARIS_NO}`);
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      id: true,
      net1Amount: true,
      net2Amount: true,
      items: { select: { id: true, variantId: true } },
    },
  });
  if (!satis) {
    console.log("satış bulunamadı — betik durdu.");
    process.exitCode = 1;
    return;
  }

  const zatenYuklendi = await prisma.auditLog.findFirst({
    where: { action: YUKLEME_EYLEMI, targetId: satis.id },
    select: { createdAt: true },
  });
  if (zatenYuklendi) {
    console.log(`Zaten geri yüklenmiş (${zatenYuklendi.createdAt.toISOString()}) — betik durdu.`);
    return;
  }

  const iz = await prisma.auditLog.findFirst({
    where: { action: GERI_ALMA_EYLEMI, targetId: satis.id },
    select: { detail: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (!iz?.detail) {
    console.log("Geri alma izi bulunamadı — betik durdu (tahmin yapılmaz).");
    process.exitCode = 1;
    return;
  }

  const kayit = JSON.parse(iz.detail) as IzKaydi;
  const bildirimler = kayit.iptalEdilenBildirimler ?? [];
  const hareketler = kayit.geriAlinan ?? [];

  console.log(`\nİZ  ${iz.createdAt.toISOString()}`);
  console.log(`  ÖNCE  NET-1 ${satis.net1Amount?.toString()} · NET-2 ${satis.net2Amount?.toString()}`);
  console.log(`\n  geri yüklenecek bildirim: ${bildirimler.length}`);
  for (const b of bildirimler) {
    console.log(
      `    ${b.id} → ${b.oncekiDurum}${b.serbestBirakilan > 0 ? ` · ayırma geri: ${b.serbestBirakilan}` : ""}`,
    );
  }
  console.log(`  yeniden yazılacak çıkış: ${hareketler.length}`);
  for (const h of hareketler) {
    console.log(`    ${h.sku} ${h.adet} × ${h.birimMaliyet ?? "?"}`);
  }

  if (!uygula) {
    console.log("\nRAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const h of hareketler) {
      const varyant = await tx.productVariant.findFirst({
        where: { sku: h.sku },
        select: { id: true },
      });
      if (!varyant) continue;
      const kalem =
        satis.items.find((k) => k.variantId === varyant.id) ?? satis.items[0];
      await tx.stockMovement.create({
        data: {
          variantId: varyant.id,
          type: "EXCHANGE_OUT",
          /* İz `adet: -1` tutuyor; çıkış aynı işaretle yeniden yazılır. */
          quantityDelta: h.adet,
          occurredAt: new Date(),
          saleItemId: kalem?.id ?? null,
          unitCostAmount: h.birimMaliyet,
          unitCostCurrency: "TRY",
          note: GEREKCE,
        },
      });
    }

    for (const b of bildirimler) {
      const varyant =
        b.serbestBirakilan > 0
          ? await tx.productVariant.findFirst({
              where: { sku: hareketler[0]?.sku ?? "" },
              select: { id: true },
            })
          : null;
      await tx.returnNotice.update({
        where: { id: b.id },
        data: {
          status: b.oncekiDurum as never,
          reservedVariantId: varyant?.id ?? null,
          reservedQuantity: b.serbestBirakilan,
          note: GEREKCE,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        action: YUKLEME_EYLEMI,
        targetType: "Sale",
        targetId: satis.id,
        detail: JSON.stringify({
          siparisNo: SIPARIS_NO,
          gerekce: GEREKCE,
          yuklenenBildirimler: bildirimler,
          yenidenYazilanCikislar: hareketler,
        }),
      },
    });
  });

  await satisKarTazele(satis.id);

  const sonra = await prisma.sale.findUnique({
    where: { id: satis.id },
    select: { net1Amount: true, net2Amount: true },
  });
  console.log(`\n  SONRA NET-1 ${sonra?.net1Amount?.toString()} · NET-2 ${sonra?.net2Amount?.toString()}`);

  for (const h of hareketler) {
    const v = await prisma.productVariant.findFirst({
      where: { sku: h.sku },
      select: { id: true },
    });
    const stok = await prisma.stockMovement.aggregate({
      where: { variantId: v?.id },
      _sum: { quantityDelta: true },
    });
    console.log(`    ${h.sku} stok: ${stok._sum.quantityDelta ?? 0}`);
  }
}

main();
