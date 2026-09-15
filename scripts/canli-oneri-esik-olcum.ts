/**
 * ============================================================================
 *  K-ONERI EŞİK ÖLÇÜMÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:oneri-esik-olcum
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K-ONERI'nin `esikler.ts`'ini yazmadan önce
 *  gerçek dağılımı ölçmek için. Rutin koşmaz, HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE ÖLÇÜLÜYOR ──────────────────────────────────────────────────────
 *  Anayasa: "eşik dağılımın gediğine konur — uydurulmaz." Bu betik üç
 *  soruyu ölçer, hiçbirini varsaymaz:
 *   ① 7 ve 15 günlük pencerede "kalanGun" (stok kapsama günü) dağılımı —
 *      GÜNLÜK motorun `kritikKalanGun` eşiği buradan gelecek.
 *   ② Her pencerede varyant başına satış-adedi histogramı — GÜNLÜK ve
 *      STRATEJİK motorların `minOrneklem` eşikleri buradan gelecek.
 *   ③ Örneklem büyüklüğüne göre marj tahmini oynaklığı: aynı varyantın
 *      3 aylık penceredeki satışları KRONOLOJİK olarak ikiye bölünüp her
 *      yarı için AYRI marj hesaplanır (gerçek `urunlereTopla`/`marjYuzdesi`
 *      gövdeleri ile — ikinci bir kopya yazılmadı); iki yarı ne kadar
 *      ayrışıyor, örneklem büyüdükçe bu ayrışma küçülüyor mu?
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { KALEM_GECERLI } from "../src/lib/kalem-gecerli";
import { kdvOraniniCoz } from "../src/lib/kdv";
import { gunDegeri, isTakvimGunu, pencereOlustur } from "../src/lib/donem";
import { marjYuzdesi, urunlereTopla, type KalemGirdisi } from "../src/lib/panel-listeler";
import { acikPartilerToplu } from "../src/lib/stok";
import { yaslanmaListesi, type YaslanmaGirdisi } from "../src/lib/yaslanma";
import { canliYapilandirma } from "./canli-ortak";

function doldur(m: string, n: number): string {
  return m.length >= n ? m : m + " ".repeat(n - m.length);
}
function saga(m: string, n: number): string {
  return m.length >= n ? m : " ".repeat(n - m.length) + m;
}
function yuzdelikler(deger: number[]): string {
  if (deger.length === 0) return "(veri yok)";
  const s = [...deger].sort((a, b) => a - b);
  const p = (o: number) => s[Math.min(s.length - 1, Math.floor(s.length * o))];
  return (
    `min ${p(0).toFixed(1)} · p25 ${p(0.25).toFixed(1)} · ortanca ${p(0.5).toFixed(1)}` +
    ` · p75 ${p(0.75).toFixed(1)} · p90 ${p(0.9).toFixed(1)} · max ${s[s.length - 1].toFixed(1)}`
  );
}

/** `satisEkseniVerisi`'in AYNI sorgu şekli — canlı istemciyle, tek seferlik. */
async function satisKalemleriGetir(
  prisma: PrismaClient,
  baslangic: Date,
  bitisHaric: Date,
): Promise<KalemGirdisi[]> {
  const satislar = await prisma.sale.findMany({
    where: {
      iptalTarihi: null,
      soldAt: { gte: baslangic, lt: bitisHaric },
    },
    orderBy: { soldAt: "asc" },
    select: {
      soldAt: true,
      profitCurrency: true,
      items: {
        where: { ...KALEM_GECERLI },
        select: {
          variantId: true,
          quantity: true,
          unitPriceAmount: true,
          unitPriceCurrency: true,
          net1Amount: true,
          net2Amount: true,
          profitStatus: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  const kalemler: KalemGirdisi[] = [];
  for (const satis of satislar) {
    const para = satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";
    if (para !== "TRY") continue;
    for (const k of satis.items) {
      if (k.unitPriceCurrency !== para) continue;
      kalemler.push({
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        sku: k.variant.sku,
        adet: k.quantity,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
        net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
        durum: k.profitStatus,
      });
    }
  }
  return kalemler;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  K-ONERI EŞİK ÖLÇÜMÜ — salt okuma");
  console.log("=".repeat(78));

  const bugun = gunDegeri(isTakvimGunu(new Date()));

  // ── ① + ② SATIŞ EKSENİ: 7 / 15 / 30 GÜN ────────────────────────────────
  const pencereler = [
    { ad: "SON 7 GÜN", tur: "SON_15_GUN" as const, gun: 7 },
    { ad: "SON 15 GÜN", tur: "SON_15_GUN" as const, gun: 15 },
    { ad: "SON 30 GÜN", tur: "SON_30_GUN" as const, gun: 30 },
  ];

  // stok ekseni — bir kez, bütün pencerelerde kullanılacak
  const aktifVaryantlar = await prisma.productVariant.findMany({
    where: { isActive: true },
    select: {
      id: true,
      product: { select: { vatRateOverride: true, category: { select: { name: true, vatRate: true } } } },
    },
  });
  const partiHaritasi = await acikPartilerToplu(
    prisma,
    aktifVaryantlar.map((v) => v.id),
  );
  const yaslanmaGirdileri: YaslanmaGirdisi[] = aktifVaryantlar.map((v) => ({
    variantId: v.id,
    partiler: partiHaritasi.get(v.id) ?? [],
    kdvOrani: kdvOraniniCoz(v.product).oran,
  }));
  const stokSatirlari = yaslanmaListesi(yaslanmaGirdileri, bugun, "yas");
  const rafAdediHaritasi = new Map(stokSatirlari.map((s) => [s.variantId, s.adet]));

  console.log(`\n  aktif varyant: ${aktifVaryantlar.length} · rafta stoğu olan: ${stokSatirlari.length}`);

  for (const p of pencereler) {
    const an = new Date();
    // "SON 7 GÜN" için mevcut PencereTuru yok — elle 7 günlük yarı açık aralık kur.
    const pencere =
      p.gun === 7
        ? { baslangic: (() => { const d = new Date(bugun); d.setUTCDate(d.getUTCDate() - 7); return d; })(), bitisHaric: (() => { const d = new Date(bugun); d.setUTCDate(d.getUTCDate() + 1); return d; })() }
        : pencereOlustur(p.tur, an);

    const kalemler = await satisKalemleriGetir(prisma, pencere.baslangic, pencere.bitisHaric);
    const satirlar = urunlereTopla(kalemler);

    console.log("\n" + "-".repeat(78));
    console.log(`  ${p.ad}  (${pencere.baslangic.toISOString().slice(0, 10)} – ${new Date(pencere.bitisHaric.getTime() - 86400000).toISOString().slice(0, 10)})`);
    console.log("-".repeat(78));
    console.log(`  bu pencerede satılan farklı varyant: ${satirlar.length}`);

    // ② satış-adedi histogramı
    const kovalar = [1, 2, 3, 4, 5];
    for (const esik of kovalar) {
      const sayi = satirlar.filter((s) => s.adet >= esik).length;
      console.log(`    adet >= ${esik}: ${sayi} varyant`);
    }
    const adetler = satirlar.map((s) => s.adet);
    console.log(`  adet dağılımı: ${yuzdelikler(adetler)}`);

    // ① kalanGun dağılımı — yalnız SON 7/15 GÜN için anlamlı (GÜNLÜK motor adayı)
    if (p.gun === 7 || p.gun === 15) {
      const kalanGunler: number[] = [];
      let stoksuzSatan = 0;
      for (const s of satirlar) {
        const rafAdedi = rafAdediHaritasi.get(s.variantId) ?? 0;
        const gunlukHiz = s.adet / p.gun;
        if (gunlukHiz > 0 && rafAdedi === 0) {
          stoksuzSatan++;
          kalanGunler.push(0);
        } else if (gunlukHiz > 0 && rafAdedi > 0) {
          kalanGunler.push(rafAdedi / gunlukHiz);
        }
      }
      // satmayan ama stoklu olanlar bu pencerede HİÇ satış satırında yok —
      // ayrı ölçülmeleri gerekmiyor (aday değiller, kalanGun=null kalıyor).
      console.log(`\n  kalanGun (kapsama günü) dağılımı, ${p.ad.toLowerCase()} hızıyla:`);
      console.log(`    ${yuzdelikler(kalanGunler)}  (n=${kalanGunler.length})`);
      console.log(`    stoğu SIFIR olup hâlâ satan (kalanGun=0, EN ACİL): ${stoksuzSatan}`);
    }
  }

  // ── ③ ÖRNEKLEM BÜYÜKLÜĞÜNE GÖRE MARJ TAHMİNİ OYNAKLIĞI (SON 3 AY) ──────
  console.log("\n" + "=".repeat(78));
  console.log("  ③ MARJ TAHMİNİ OYNAKLIĞI — SON 3 AY, kronolojik yarı bölme");
  console.log("=".repeat(78));

  const uc = pencereOlustur("SON_3_AY", new Date());
  const satislar3Ay = await prisma.sale.findMany({
    where: { iptalTarihi: null, soldAt: { gte: uc.baslangic, lt: uc.bitisHaric } },
    orderBy: { soldAt: "asc" },
    select: {
      soldAt: true,
      profitCurrency: true,
      items: {
        where: { ...KALEM_GECERLI },
        select: {
          variantId: true,
          quantity: true,
          unitPriceAmount: true,
          unitPriceCurrency: true,
          net1Amount: true,
          net2Amount: true,
          profitStatus: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
    },
  });

  // variantId -> kronolojik kalem listesi (soldAt asc zaten sorguda)
  const kalemlerVaryantBazinda = new Map<string, KalemGirdisi[]>();
  for (const satis of satislar3Ay) {
    const para = satis.profitCurrency ?? satis.items[0]?.unitPriceCurrency ?? "TRY";
    if (para !== "TRY") continue;
    for (const k of satis.items) {
      if (k.unitPriceCurrency !== para) continue;
      const girdi: KalemGirdisi = {
        variantId: k.variantId,
        urunAdi: k.variant.product.name,
        sku: k.variant.sku,
        adet: k.quantity,
        ciro: Number(k.unitPriceAmount.toString()) * k.quantity,
        net1: k.net1Amount === null ? null : Number(k.net1Amount.toString()),
        net2: k.net2Amount === null ? null : Number(k.net2Amount.toString()),
        durum: k.profitStatus,
      };
      const liste = kalemlerVaryantBazinda.get(k.variantId) ?? [];
      liste.push(girdi);
      kalemlerVaryantBazinda.set(k.variantId, liste);
    }
  }

  const ilkYariKalemler: KalemGirdisi[] = [];
  const ikinciYariKalemler: KalemGirdisi[] = [];
  const toplamKalemSayisi = new Map<string, number>();
  for (const [variantId, liste] of kalemlerVaryantBazinda) {
    toplamKalemSayisi.set(variantId, liste.length);
    const orta = Math.ceil(liste.length / 2);
    ilkYariKalemler.push(...liste.slice(0, orta));
    ikinciYariKalemler.push(...liste.slice(orta));
  }

  const ilkYariSatirlari = new Map(urunlereTopla(ilkYariKalemler).map((s) => [s.variantId, s]));
  const ikinciYariSatirlari = new Map(urunlereTopla(ikinciYariKalemler).map((s) => [s.variantId, s]));

  type Bucket = { etiket: string; min: number; max: number };
  const bucketlar: Bucket[] = [
    { etiket: "2 kalem", min: 2, max: 2 },
    { etiket: "3 kalem", min: 3, max: 3 },
    { etiket: "4 kalem", min: 4, max: 4 },
    { etiket: "5-9 kalem", min: 5, max: 9 },
    { etiket: "10-19 kalem", min: 10, max: 19 },
    { etiket: "20+ kalem", min: 20, max: Infinity },
  ];

  console.log("\n  (yalnız İKİ yarıda da marj hesaplanabilen varyantlar dahil)");
  console.log(`  ${doldur("kova", 14)} ${saga("varyant", 8)}  |marjA-marjB| dağılımı (yüzde puan)`);
  console.log("-".repeat(78));

  for (const b of bucketlar) {
    const farklar: number[] = [];
    for (const [variantId, n] of toplamKalemSayisi) {
      if (n < b.min || n > b.max) continue;
      const a = ilkYariSatirlari.get(variantId);
      const c = ikinciYariSatirlari.get(variantId);
      if (!a || !c) continue;
      const marjA = marjYuzdesi(a);
      const marjB = marjYuzdesi(c);
      if (marjA === null || marjB === null) continue;
      farklar.push(Math.abs(marjA - marjB));
    }
    console.log(`  ${doldur(b.etiket, 14)} ${saga(String(farklar.length), 8)}  ${yuzdelikler(farklar)}`);
  }

  console.log("\n" + "=".repeat(78));
  console.log("  Salt okuma. Hiçbir şey yazılmadı.");
  console.log("=".repeat(78) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
