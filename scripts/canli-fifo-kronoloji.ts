import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  FIFO KRONOLOJİ İHLALİ — SİSTEM GENELİ TARAMA (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:fifo-kronoloji
 *
 *  ⚠ VAKA (`axcali1686`, kullanıcı bildirdi 28.08.2026): alım 31.07'de
 *  girilmiş, 4 adet, TÜM satışlardan önce. Sekiz satışın dördü bağlı,
 *  dördü değil — ve **bağsız olanlar TARİH OLARAK DAHA ESKİ**
 *  (08-09…08-12), bağlılar daha yeni (08-14…08-21).
 *
 *  Sebep: erken satışlar `satis-excel` ile içe aktarılırken parti yoktu
 *  (hareket yazılmadı); geç satışlar normal akıştan geçip FIFO'yu anında
 *  tüketti. **Stok, satış TARİHİNE göre değil İŞLEM SIRASINA göre
 *  harcanmış.**
 *
 *  ⛔ ASIL SORU BU DEĞİL: "yanlış satışa bağlandı" bir sıra sorunudur;
 *  RAKAMI değiştirip değiştirmediği AYRI bir sorudur. Aynı varyantın
 *  bütün partileri AYNI birim maliyetteyse hangi satışın hangi partiyi
 *  aldığı NET toplamını değiştirmez — yalnız hangi satırda göründüğünü
 *  değiştirir. Bu betik ikisini AYRI ölçer.
 *
 *  ⛔ HÜKÜM YOK.
 * ============================================================================
 */

const t2 = (n: number) => n.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: {
      id: true, quantity: true, unitPriceAmount: true, variantId: true,
      sale: { select: { code: true, soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });
  const bagli = new Set(
    (await p.stockMovement.findMany({
      where: { saleItemId: { not: null } }, select: { saleItemId: true },
    })).map((h) => h.saleItemId!),
  );

  type Kalem = (typeof kalemler)[number];
  const varyant = new Map<string, { bagli: Kalem[]; bagsiz: Kalem[] }>();
  for (const k of kalemler) {
    const v = varyant.get(k.variantId) ?? { bagli: [], bagsiz: [] };
    (bagli.has(k.id) ? v.bagli : v.bagsiz).push(k);
    varyant.set(k.variantId, v);
  }

  console.log("\n" + "=".repeat(104));
  console.log("FIFO KRONOLOJİ İHLALİ — SİSTEM GENELİ (salt okuma)");
  console.log("=".repeat(104));
  console.log("\n   iptalsiz kalem " + kalemler.length + "   ·   varyant " + varyant.size);

  // ── ① KRONOLOJİ İHLALİ ─────────────────────────────────────────────────
  /**
   * ⛔ ÖLÇÜT: bağsız bir kalem, bağlı bir kalemden DAHA ESKİ mi.
   * Öyleyse parti, kronolojik olarak sonraki satışa gitmiş demektir.
   */
  type Ihlal = {
    sku: string; ad: string; enEskiBagsiz: Date; enYeniBagli: Date;
    bagsizSayi: number; bagliSayi: number; ihlalKalem: number; ciro: number;
    farkliMaliyet: number;
  };
  const ihlaller: Ihlal[] = [];
  let ihlalsizAmaKarisik = 0;

  /** Varyantın SALE_OUT damgalarındaki farklı birim maliyet sayısı. */
  const maliyetler = new Map<string, Set<string>>();
  for (const h of await p.stockMovement.findMany({
    where: { type: "PURCHASE_IN", unitCostAmount: { not: null } },
    select: { variantId: true, unitCostAmount: true },
  })) {
    const s = maliyetler.get(h.variantId) ?? new Set<string>();
    s.add(h.unitCostAmount!.toString());
    maliyetler.set(h.variantId, s);
  }

  for (const [vid, v] of varyant) {
    if (v.bagli.length === 0 || v.bagsiz.length === 0) continue;
    const enYeniBagli = v.bagli.reduce((a, b) => (a.sale.soldAt > b.sale.soldAt ? a : b));
    const ihlalKalemler = v.bagsiz.filter((k) => k.sale.soldAt < enYeniBagli.sale.soldAt);
    if (ihlalKalemler.length === 0) { ihlalsizAmaKarisik++; continue; }
    const enEski = ihlalKalemler.reduce((a, b) => (a.sale.soldAt < b.sale.soldAt ? a : b));
    ihlaller.push({
      sku: v.bagsiz[0].variant.sku,
      ad: v.bagsiz[0].variant.product.name,
      enEskiBagsiz: enEski.sale.soldAt,
      enYeniBagli: enYeniBagli.sale.soldAt,
      bagsizSayi: v.bagsiz.length,
      bagliSayi: v.bagli.length,
      ihlalKalem: ihlalKalemler.length,
      ciro: ihlalKalemler.reduce((t, k) => t + Number(k.unitPriceAmount.toString()) * k.quantity, 0),
      farkliMaliyet: (maliyetler.get(vid) ?? new Set()).size,
    });
  }

  console.log("\n① KRONOLOJİ İHLALİ — bağsız kalem, bağlıdan DAHA ESKİ");
  console.log("   hem bağlı hem bağsız kalemi olan varyant : " +
    (ihlaller.length + ihlalsizAmaKarisik));
  console.log("   ⛔ İHLALLİ varyant                        : " + ihlaller.length);
  console.log("   ✓ sırası doğru (bağsızlar daha yeni)     : " + ihlalsizAmaKarisik);
  console.log("   ihlalli kalem : " + ihlaller.reduce((t, x) => t + x.ihlalKalem, 0) +
    "   ·   ciro " + t2(ihlaller.reduce((t, x) => t + x.ciro, 0)));

  // ── ② RAKAMI DEĞİŞTİRİYOR MU ───────────────────────────────────────────
  /**
   * ⭐ AYIRT EDİCİ SORU: varyantın bütün partileri AYNI birim maliyetteyse
   * hangi satışın hangi partiyi aldığı NET TOPLAMINI DEĞİŞTİRMEZ — yalnız
   * hangi satırda göründüğünü değiştirir. Farklı maliyetli parti varsa
   * rakam da kayar.
   */
  const tekMaliyet = ihlaller.filter((x) => x.farkliMaliyet <= 1);
  const cokMaliyet = ihlaller.filter((x) => x.farkliMaliyet > 1);
  console.log("\n② ⭐ RAKAMI DEĞİŞTİRİYOR MU — parti maliyetleri farklı mı");
  console.log("   TEK maliyetli varyant (rakam AYNI kalır) : " + tekMaliyet.length +
    "  ·  " + tekMaliyet.reduce((t, x) => t + x.ihlalKalem, 0) + " kalem");
  console.log("   ÇOK maliyetli varyant (rakam KAYAR)      : " + cokMaliyet.length +
    "  ·  " + cokMaliyet.reduce((t, x) => t + x.ihlalKalem, 0) + " kalem" +
    "  ·  ciro " + t2(cokMaliyet.reduce((t, x) => t + x.ciro, 0)));
  console.log("\n   ⚠ TEK MALİYETLİDE SIRA YANLIŞ AMA RAKAM DOĞRU: hangi satışın");
  console.log("     maliyeti bulduğu değişir, NET toplamı değişmez.");

  console.log("\n   ÇOK MALİYETLİ — en büyük 15 (rakamın kaydığı küme)");
  console.log("   enEskiBağsız  enYeniBağlı  ihlal  maliyet  SKU / ürün");
  console.log("   " + "─".repeat(92));
  for (const x of [...cokMaliyet].sort((a, b) => b.ciro - a.ciro).slice(0, 15)) {
    console.log("   " + x.enEskiBagsiz.toISOString().slice(0, 10) + "    " +
      x.enYeniBagli.toISOString().slice(0, 10) +
      String(x.ihlalKalem).padStart(7) + String(x.farkliMaliyet).padStart(9) +
      "  " + x.sku.padEnd(18) + x.ad.slice(0, 28));
  }

  // ── ③ GERİYE DÖNÜK BAĞ — SİSTEM GENELİ ─────────────────────────────────
  /**
   * ⚠ AYRI BİR OLGU: parti, bağlandığı satıştan SONRA damgalıysa geriye
   * dönük bağdır. Bugün 12 tanesini biz kurduk (kullanıcı kararı); ÖNCEDEN
   * de var mıydı — ölçülmemişti.
   */
  const sale = await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, sourceMovementId: { not: null } },
    select: {
      occurredAt: true,
      sourceMovement: { select: { occurredAt: true } },
      saleItem: { select: { variant: { select: { sku: true } } } },
    },
  });
  const geriye = sale.filter(
    (h) => h.sourceMovement !== null && h.sourceMovement.occurredAt > h.occurredAt,
  );
  console.log("\n③ GERİYE DÖNÜK BAĞ — parti, satıştan SONRA damgalı");
  console.log("   bağlı SALE_OUT hareketi : " + sale.length);
  console.log("   ⛔ GERİYE DÖNÜK          : " + geriye.length +
    "  (" + ((geriye.length / Math.max(1, sale.length)) * 100).toFixed(1) + "%)");
  if (geriye.length > 0) {
    const g = geriye
      .map((h) =>
        Math.round(
          (h.sourceMovement!.occurredAt.getTime() - h.occurredAt.getTime()) / 86400_000,
        ),
      )
      .sort((a, b) => a - b);
    console.log("   gecikme: en küçük " + g[0] + " · ortanca " + g[Math.floor(g.length / 2)] +
      " · EN BÜYÜK " + g[g.length - 1] + " gün");
    console.log("   ⚠ Bunun " + Math.min(12, geriye.length) + " tanesi BUGÜN bilerek kuruldu");
    console.log("     (kullanıcı kararı 28.08.2026, `AuditLog.geriyeDonukBag`).");
  }

  // ── ④ ÜÇ KOVAYLA KESİŞİM ───────────────────────────────────────────────
  /**
   * ⚠ Kronoloji ihlali "üç sebep" kovalarının HANGİSİNDE? ③'te yoğunsa,
   * o kovanın bir kısmı "veri eksik" DEĞİL "veri YANLIŞ YERDE" demektir —
   * ve alım girmekle çözülmez.
   */
  const alimKaydi = new Map(
    (await p.purchaseItem.groupBy({ by: ["variantId"], _sum: { quantity: true } })).map(
      (x) => [x.variantId, x._sum.quantity ?? 0],
    ),
  );
  const purchaseIn = new Map(
    (await p.stockMovement.groupBy({
      by: ["variantId"], where: { type: "PURCHASE_IN" }, _sum: { quantityDelta: true },
    })).map((x) => [x.variantId, x._sum.quantityDelta ?? 0]),
  );
  const kovalar = { bir: 0, iki: 0, uc: 0 };
  for (const [vid, v] of varyant) {
    if (v.bagli.length === 0 || v.bagsiz.length === 0) continue;
    const enYeni = v.bagli.reduce((a, b) => (a.sale.soldAt > b.sale.soldAt ? a : b));
    if (!v.bagsiz.some((k) => k.sale.soldAt < enYeni.sale.soldAt)) continue;
    const a = alimKaydi.get(vid) ?? 0;
    const h = purchaseIn.get(vid) ?? 0;
    if (a <= 0) kovalar.bir++;
    else if (h <= 0) kovalar.iki++;
    else kovalar.uc++;
  }
  console.log("\n④ ÜÇ KOVAYLA KESİŞİM — ihlal hangi sınıfta");
  console.log("   ① alım kaydı hiç yok         : " + kovalar.bir);
  console.log("   ② alım var, hareket yok      : " + kovalar.iki);
  console.log("   ③ alım+hareket var, yetmiyor : " + kovalar.uc + "  / 200");

  // ── ⑤ DOĞRU FIFO SİMÜLASYONU ───────────────────────────────────────────
  /**
   * ⛔ SAPMA TAHMİN EDİLMEZ, SİMÜLE EDİLİR. Doğru FIFO: kalemler SATIŞ
   * TARİHİNE göre sıralanır, partiler sırayla tüketilir. Her kalemin
   * "olması gereken" maliyeti bugünküyle karşılaştırılır.
   */
  const partiHareketleri = await p.stockMovement.findMany({
    where: { type: "PURCHASE_IN", unitCostAmount: { not: null } },
    select: { variantId: true, quantityDelta: true, unitCostAmount: true },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });
  const partiHarita = new Map<string, { kalan: number; maliyet: number }[]>();
  for (const g of partiHareketleri) {
    const l = partiHarita.get(g.variantId) ?? [];
    l.push({ kalan: g.quantityDelta, maliyet: Number(g.unitCostAmount!.toString()) });
    partiHarita.set(g.variantId, l);
  }
  const bugunku = new Map<string, number>();
  for (const h of await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, unitCostAmount: { not: null } },
    select: { saleItemId: true, quantityDelta: true, unitCostAmount: true },
  })) {
    const t = Math.abs(h.quantityDelta) * Number(h.unitCostAmount!.toString());
    bugunku.set(h.saleItemId!, (bugunku.get(h.saleItemId!) ?? 0) + t);
  }

  let degisen = 0, ayni = 0, yeniBaglanan = 0, bagsizKalan = 0, toplamSapma = 0;
  const sapmalar: number[] = [];
  for (const [vid, v] of varyant) {
    const partiler = (partiHarita.get(vid) ?? []).map((x) => ({ ...x }));
    if (partiler.length === 0) continue;
    const hepsi = [...v.bagli, ...v.bagsiz].sort(
      (a, b) => a.sale.soldAt.getTime() - b.sale.soldAt.getTime(),
    );
    for (const k of hepsi) {
      let gerek = k.quantity;
      let tutar = 0;
      for (const parti of partiler) {
        if (gerek <= 0) break;
        if (parti.kalan <= 0) continue;
        const al = Math.min(parti.kalan, gerek);
        parti.kalan -= al;
        gerek -= al;
        tutar += al * parti.maliyet;
      }
      const simdi = bugunku.get(k.id);
      if (gerek > 0) { if (simdi === undefined) bagsizKalan++; continue; }
      if (simdi === undefined) { yeniBaglanan++; continue; }
      const fark = Math.abs(tutar - simdi);
      if (fark < 0.005) { ayni++; continue; }
      degisen++;
      toplamSapma += fark;
      sapmalar.push(simdi === 0 ? 100 : (fark / simdi) * 100);
    }
  }

  console.log("\n⑤ ⭐ DOĞRU FIFO SİMÜLASYONU — satış TARİHİNE göre yeniden dağıtım");
  console.log("   maliyeti DEĞİŞMEYEN kalem : " + ayni);
  console.log("   ⛔ maliyeti DEĞİŞEN kalem  : " + degisen + "   toplam sapma " + t2(toplamSapma));
  console.log("   ⭐ YENİ bağlanacak kalem   : " + yeniBaglanan + "   (bugün bağsız, doğru sırada bağlanır)");
  console.log("   hâlâ bağsız kalacak       : " + bagsizKalan);
  if (sapmalar.length > 0) {
    const srt = [...sapmalar].sort((a, b) => a - b);
    const y = (q: number) => srt[Math.floor(srt.length * q)];
    console.log("   |sapma| %: ortanca " + y(0.5).toFixed(2) + " · p90 " + y(0.9).toFixed(2) +
      " · max " + srt[srt.length - 1].toFixed(2));
  }

  console.log("\n⑥ DÜZELTME YOLU — MALİYETİ");
  console.log("   etkilenecek hareket: " + (degisen + yeniBaglanan) + " SALE_OUT");
  console.log("   ⚠ Bağları çözmek LEDGER SİLMEK DEĞİLDİR: mevcut hareket ters");
  console.log("     kayıtla geri verilir, yenisi yazılır (`--geri` deseni). Her");
  console.log("     etkilenen satış ayrıca `satisKarTazele` ister.");
  console.log("   ⛔ ÖNERİ GETİRİLDİ, YAZILMADI.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
