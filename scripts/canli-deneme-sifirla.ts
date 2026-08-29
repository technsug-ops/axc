/** BETIK SINIFI: TEK_SEFERLIK — 23.08 tek vakalik, UC siparis numarasina kilitli (SIPARISLER). Kosuldu ve bir kismi geri alindi; package.json'a hic yazilmadi. */
/**
 * ============================================================================
 *  DENEME TESTLERİNİ SIFIRLA — ÜÇ SATIŞ, KİMLİĞE KİLİTLİ
 * ----------------------------------------------------------------------------
 *  Kullanıcı 23.08.2026: _"11467064391 / 11473322212 / 11471381662 — bunlarla
 *  deneme testi yaptık, bütün denemeleri sıfırlayabilir misin, ortalık çok
 *  karıştı."_
 *
 *  ⚠⚠ SONRADAN DÜZELTİLDİ — 11467064391 GERÇEK ÇIKTI.
 *  Kullanıcı üçünü de "deneme" diye bildirmişti; koştuktan sonra
 *  `11467064391`in GERÇEK bir iade olduğunu söyledi ve o sipariş
 *  `canli-11467-geri-yukle.ts` ile birebir eski hâline döndürüldü
 *  (NET ve stok kuruşuna tuttu).
 *
 *  ⚠ DERS: "hepsi test" bir BEYANDIR ve toplu uygulanmadan önce
 *  kalem kalem teyit edilmeliydi. Betiğin izi (`DENEME_GERI_ALINDI`,
 *  her bildirimin ÖNCEKİ durumu + serbest bırakılan adet) olmasaydı geri
 *  yükleme YAZILAMAZDI. "İstisna iz bırakır" kuralının bedeli burada ölçüldü.
 *
 *  ⚠ SİLME YOK — VE GEREKÇESİ İLKE DEĞİL, VERİ. `Return` silinseydi
 *  `ReturnItem` cascade ile giderdi; `StockMovement.returnItemId` ise
 *  `SetNull`. Sonuç: stok hareketleri KALIR ve hiçbir iadeye bağlı olmaz —
 *  stok düşük kalır, düşüren kaybolur. Parti tüketilmiş görünür, tüketen
 *  yoktur. Bu yüzden geri alma TERS KAYITLA yapılır.
 *
 *  ⚠ NE YAPILIR:
 *    · bugün düğmeyle yazılan test `EXCHANGE_OUT` hareketleri ters kayıtla
 *      geri alınır (stok geri gelir, satışın NET'i eski hâline döner)
 *    · etkilenen satışların kâr damgası yeniden hesaplanır
 *
 *  ⚠ NE YAPILMAZ (sormadan dokunulmaz):
 *    · satışların kendisi — gerçek Trendyol siparişleri
 *    · İŞLENMİŞ iadeler — gerçek bir iade olmuş olabilir
 *    · K38 hurda düşüşü — kullanıcının açık hükmü ("çöp")
 *    · bildirimlerin iptali — `KAPANDI → IPTAL` geçişi henüz YOK (K39)
 *
 *  ⚠ TERS KAYIT AYNI TİPTE (`EXCHANGE_OUT`, pozitif) — VE BU BİLEREK.
 *  `ADJUSTMENT` yazsaydık hareket fire raporunda "fazla çıkan mal" olarak
 *  görünür ve olmayan bir kazanç doğardı (fire yalnız `ADJUSTMENT` /
 *  `COUNT_CORRECTION` sayıyor). Aynı tipte ayna kayıt hem stoğu geri getirir
 *  hem satışın maliyetini düşürür, hiçbir rapora yanlış girmez.
 *
 *  KOŞUM:
 *    npx tsx scripts/canli-deneme-sifirla.ts           → yalnız RAPOR
 *    npx tsx scripts/canli-deneme-sifirla.ts --uygula  → yazar
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⚠ KİMLİK SABİT — betik yalnız bu üç vaka için. */
const SIPARISLER = ["11467064391", "11473322212", "11471381662"];
const GERI_ALMA_EYLEMI = "DENEME_GERI_ALINDI";
const GEREKCE = "Deneme testi geri alındı — kullanıcı talebi 23.08.2026";

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
  console.log("DENEME TESTLERİNİ SIFIRLA");
  console.log(`  hedef  ${y.veri.adres.hostname}`);
  console.log(`  kip    ${uygula ? "UYGULA (yazar)" : "RAPOR (yazmaz)"}`);

  for (const kod of SIPARISLER) {
    const satis = await prisma.sale.findFirst({
      where: { code: kod },
      select: {
        id: true,
        code: true,
        net1Amount: true,
        net2Amount: true,
        returnNotices: {
          select: {
            id: true,
            status: true,
            returnId: true,
            reservedQuantity: true,
            reservedVariant: { select: { sku: true } },
          },
        },
        items: {
          select: {
            id: true,
            variant: { select: { sku: true } },
            stockMovements: {
              where: { type: "EXCHANGE_OUT" },
              select: {
                id: true,
                variantId: true,
                /**
                 * ⚠ HAREKETİN KENDİ VARYANTI — satış kaleminin DEĞİL.
                 * İlk sürüm etiketi `k.variant.sku`dan alıyordu ve rapor
                 * `axcali1610` yerine `axcali1672` yazdı: değişimde ÇIKAN
                 * mal satılan maldan farklı olabilir. Mantık doğruydu, etiket
                 * yalan söylüyordu — "kolon başlığı bir iddiadır".
                 */
                variant: { select: { sku: true } },
                quantityDelta: true,
                unitCostAmount: true,
                unitCostCurrency: true,
                locationId: true,
                occurredAt: true,
              },
            },
          },
        },
      },
    });

    console.log("");
    console.log("=".repeat(66));
    if (!satis) {
      console.log(`${kod}: satış bulunamadı — atlandı`);
      continue;
    }

    const cikislar = satis.items.flatMap((k) =>
      k.stockMovements.map((h) => ({ ...h, saleItemId: k.id, sku: h.variant.sku })),
    );

    console.log(`${satis.code}`);
    console.log(
      `  ÖNCE  NET-1 ${satis.net1Amount?.toString() ?? "—"} · NET-2 ${satis.net2Amount?.toString() ?? "—"}`,
    );
    console.log(`  geri alınacak EXCHANGE_OUT: ${cikislar.length}`);

    /** ⚠ ZATEN GERİ ALINMIŞ MI — ikinci koşum stoğu iki kez şişirmesin. */
    const oncekiIz = await prisma.auditLog.findFirst({
      where: { action: GERI_ALMA_EYLEMI, targetId: satis.id },
      select: { createdAt: true },
    });
    if (oncekiIz) {
      console.log(
        `  ⚠ zaten geri alınmış (${oncekiIz.createdAt.toISOString()}) — atlandı`,
      );
      continue;
    }

    for (const h of cikislar) {
      const stok = await prisma.stockMovement.aggregate({
        where: { variantId: h.variantId },
        _sum: { quantityDelta: true },
      });
      console.log(
        `    ${h.sku} ${h.quantityDelta} × ${h.unitCostAmount?.toString() ?? "?"} (${h.occurredAt.toISOString().slice(0, 10)}) · şu anki stok ${stok._sum.quantityDelta ?? 0}`,
      );
    }

    /**
     * ⚠ İPTAL EDİLECEK BİLDİRİMLER — YALNIZ İADESİ İŞLENMEMİŞ OLANLAR.
     *
     * `returnId` DOLU bir bildirim gerçek bir iade doğurmuş demektir: stok
     * hareketi yazılmış, kesintiler hesaplanmış, para kıpırdamış. Onu iptal
     * etmek "olmamış" demek olurdu ve defteri bozardı. Zaten iptal olanlar da
     * atlanır — ikinci kez iptal bir şey düzeltmez.
     *
     * Karışıklığın kaynağı iadesiz deneme bildirimleri; sıfırlanan onlar.
     */
    const iptalAdaylari = satis.returnNotices.filter(
      (b) => b.returnId === null && b.status !== "IPTAL",
    );
    const dokunulmayan = satis.returnNotices.filter(
      (b) => b.returnId !== null || b.status === "IPTAL",
    );
    console.log(`  iptal edilecek bildirim: ${iptalAdaylari.length}`);
    for (const b of iptalAdaylari) {
      console.log(
        `    ${b.id} ${b.status}${b.reservedQuantity > 0 ? ` · ayrılan ${b.reservedQuantity}×${b.reservedVariant?.sku ?? "—"} serbest bırakılacak` : ""}`,
      );
    }
    console.log(`  DOKUNULMAYAN bildirim: ${dokunulmayan.length}`);
    for (const b of dokunulmayan) {
      console.log(
        `    ${b.id} ${b.status} · ${b.returnId ? "iadesi İŞLENMİŞ (gerçek olay)" : "zaten iptal"}`,
      );
    }

    if (cikislar.length === 0 && iptalAdaylari.length === 0) {
      console.log("  geri alınacak bir şey yok");
      continue;
    }

    if (!uygula) continue;

    await prisma.$transaction(async (tx) => {
      for (const h of cikislar) {
        await tx.stockMovement.create({
          data: {
            variantId: h.variantId,
            /** ⚠ AYNI TİP, TERS İŞARET — fire raporuna yanlış girmesin. */
            type: "EXCHANGE_OUT",
            quantityDelta: -h.quantityDelta,
            occurredAt: new Date(),
            saleItemId: h.saleItemId,
            locationId: h.locationId,
            unitCostAmount: h.unitCostAmount,
            unitCostCurrency: h.unitCostCurrency,
            note: `${GEREKCE} · ters kayıt: ${h.id}`,
          },
        });
      }

      /**
       * ⚠ AYRILAN ÜRÜN SERBEST BIRAKILIR. Bildirim iptal olurken ayırma
       * kaydı kalsaydı, o mal başka bir bildirime ayrılamaz ve stok
       * ekranında sonsuza kadar "ayrılmış" görünürdü.
       */
      for (const b of iptalAdaylari) {
        await tx.returnNotice.update({
          where: { id: b.id },
          data: {
            status: "IPTAL",
            reservedVariantId: null,
            reservedQuantity: 0,
            note: GEREKCE,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: GERI_ALMA_EYLEMI,
          targetType: "Sale",
          targetId: satis.id,
          detail: JSON.stringify({
            siparisNo: satis.code,
            gerekce: GEREKCE,
            iptalEdilenBildirimler: iptalAdaylari.map((b) => ({
              id: b.id,
              oncekiDurum: b.status,
              serbestBirakilan: b.reservedQuantity,
            })),
            dokunulmayanBildirimler: dokunulmayan.map((b) => ({
              id: b.id,
              durum: b.status,
              sebep: b.returnId ? "iadesi işlenmiş" : "zaten iptal",
            })),
            geriAlinan: cikislar.map((h) => ({
              hareketId: h.id,
              sku: h.sku,
              adet: h.quantityDelta,
              birimMaliyet: h.unitCostAmount?.toString() ?? null,
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
    console.log(
      `  SONRA NET-1 ${sonra?.net1Amount?.toString() ?? "—"} · NET-2 ${sonra?.net2Amount?.toString() ?? "—"}`,
    );
    for (const h of cikislar) {
      const stok = await prisma.stockMovement.aggregate({
        where: { variantId: h.variantId },
        _sum: { quantityDelta: true },
      });
      console.log(`    ${h.sku} yeni stok ${stok._sum.quantityDelta ?? 0}`);
    }
  }

  console.log("");
  if (!uygula) {
    console.log("RAPOR KİPİ — hiçbir şey yazılmadı. Yazmak için --uygula.");
  }
}

main();
