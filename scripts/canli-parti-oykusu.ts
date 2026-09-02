/**
 * ============================================================================
 *  İKİ VARYANTIN PARTİ ÖYKÜSÜ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:parti-oykusu
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K128'in iki para riskli varyantına kilitli.
 *  HİÇBİR ŞEY YAZMAZ; yazma bayrağı yoktur.
 *
 *  ── ⛔ NİYE KULLANICIYA SORMAK YERİNE ÖLÇÜLÜYOR ─────────────────────────
 *  Soru şu: sayımda fazla çıkan mal, o varyantın EN SON partisinden mi geldi?
 *  Kullanıcıya "maliyet doğru mu" diye sormak, 02.09.2026 sabahı çürüğü
 *  çıkan yolun aynısıdır — rakamı ben gösteriyorum, o okuyup onaylıyor ve
 *  ölçtüğüm şey doğruluk değil YANKI oluyor.
 *
 *  ⭐ AMA DEFTERDE AYIRT EDİCİ BİR KANIT VAR: sayım anında hangi partiler
 *  AÇIKTI? Eski parti o tarihte çoktan tükenmişse, rafta bulunan fazla mal
 *  ondan OLAMAZ ve "en son parti" ataması doğrudur. Tersine eski parti hâlâ
 *  açıksa soru gerçekten açıktır.
 *
 *  ⚠ VE BU BİR HÜKÜM DEĞİL, KAPSAM DARALTMASIDIR. Defter fiziksel gerçeğin
 *  kaydıdır, kendisi değil — sayımın bulduğu şey zaten defterle rafın
 *  ayrıştığıdır. Ölçüm "hangi ihtimal defterle tutarlı" der, "gerçek şu" demez.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * Kullanıcının 02.09.2026'da bildirdiği iki satış — para riski oradaydı.
 * `--hepsi` ile SAYIM FAZLASI olan BÜTÜN varyantlar taranır.
 */
const SKULAR = ["axcali2467", "axcali2177"];
const HEPSI = process.argv.includes("--hepsi");
/** Halil'in fiziksel sayımı — fazla partiler bu gün açıldı. */
const SAYIM_KODU = "sayim-fiziksel-20260829";

function para(d: unknown): string {
  if (d === null || d === undefined) return "—";
  return Number(String(d)).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}
function saga(m: string, n: number): string {
  return m.length >= n ? m : " ".repeat(n - m.length) + m;
}

/**
 * BÜTÜN SAYIM FAZLALARI — soru kaç partide GERÇEKTEN açık?
 *
 * Ölçüt aynı: sayım anında SAYIM PARTİSİ DIŞINDA açık parti var mıydı?
 * Yoksa "en son parti" ataması defterle tutarlı TEK seçenektir ve soru
 * kapanır. Varsa soru açıktır ve para büyüklüğü yazılır.
 */
async function hepsiniTara(prisma: PrismaClient): Promise<void> {
  const fazlalar = await prisma.stockMovement.findMany({
    where: { quantityDelta: { gt: 0 }, note: { contains: SAYIM_KODU } },
    select: {
      id: true,
      variantId: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  });

  const varyantlar = [...new Set(fazlalar.map((f) => f.variantId))];
  const hepsi = await prisma.stockMovement.findMany({
    where: { variantId: { in: varyantlar } },
    select: {
      id: true,
      variantId: true,
      quantityDelta: true,
      occurredAt: true,
      unitCostAmount: true,
      sourceMovementId: true,
      note: true,
      saleItemId: true,
      saleItem: { select: { sale: { select: { iptalTarihi: true } } } },
    },
  });
  const varyantHareketleri = new Map<string, typeof hepsi>();
  for (const h of hepsi) {
    const l = varyantHareketleri.get(h.variantId) ?? [];
    l.push(h);
    varyantHareketleri.set(h.variantId, l);
  }

  let kapali = 0;
  let acik = 0;
  let acikSatilan = 0;
  let acikPara = 0;
  const acikSatirlar: string[] = [];

  for (const f of fazlalar) {
    const hs = varyantHareketleri.get(f.variantId) ?? [];
    const atanan =
      f.unitCostAmount === null ? null : Number(String(f.unitCostAmount));

    /** Sayım anında açık olan, SAYIM PARTİSİ OLMAYAN girişler. */
    const acikPartiler = hs.filter((h) => {
      if (h.quantityDelta <= 0) return false;
      if (h.note !== null && h.note.includes(SAYIM_KODU)) return false;
      const oGuneKadar = hs
        .filter(
          (c) =>
            c.quantityDelta < 0 &&
            c.sourceMovementId === h.id &&
            c.occurredAt <= f.occurredAt,
        )
        .reduce((x, c) => x + Math.abs(c.quantityDelta), 0);
      return h.quantityDelta - oGuneKadar > 0;
    });

    /**
     * ⚠ AÇIK PARTİ VARSA BİLE SORU ANCAK FİYAT FARKLIYSA DOĞAR.
     * Aynı fiyattan iki parti açıksa hangisinden geldiği maliyeti
     * değiştirmez — soru yoktur.
     */
    const fiyatlar = [
      ...new Set(
        acikPartiler
          .map((h) =>
            h.unitCostAmount === null ? null : Number(String(h.unitCostAmount)),
          )
          .filter((x): x is number => x !== null),
      ),
    ];
    const enUzak =
      atanan === null || fiyatlar.length === 0
        ? 0
        : Math.max(...fiyatlar.map((x) => Math.abs(x - atanan)));

    if (enUzak < 0.005) {
      kapali++;
      continue;
    }
    acik++;
    /** Bu partiden İPTAL OLMAYAN satışla çıkan adet — bugünkü para etkisi. */
    const satilan = hs
      .filter(
        (c) =>
          c.sourceMovementId === f.id &&
          c.quantityDelta < 0 &&
          c.saleItemId !== null &&
          c.saleItem?.sale?.iptalTarihi === null,
      )
      .reduce((x, c) => x + Math.abs(c.quantityDelta), 0);
    acikSatilan += satilan;
    acikPara += satilan * enUzak;
    acikSatirlar.push(
      `    ${doldur(f.variant.sku, 16)} ${doldur(f.variant.product.name, 34)}` +
        ` fazla ${saga(String(f.quantityDelta), 3)}` +
        ` · satılan ${saga(String(satilan), 3)}` +
        ` · en uzak fark ${saga(para(enUzak), 10)}`,
    );
  }

  console.log("\n" + "-".repeat(76));
  console.log("  BÜTÜN SAYIM FAZLALARI — soru kaç partide AÇIK?");
  console.log("-".repeat(76));
  console.log(`  incelenen sayım fazlası partisi : ${fazlalar.length}`);
  console.log(
    `  ✓ SORU KAPALI (açık parti yok ya da aynı fiyat) : ${kapali}`,
  );
  console.log(`  ⚠ soru AÇIK (farklı fiyatlı açık parti var)      : ${acik}`);
  if (acikSatirlar.length > 0) {
    console.log("\n" + acikSatirlar.join("\n"));
  }
  console.log("\n" + "-".repeat(76));
  console.log(`  ⭐ BUGÜNKÜ PARA ETKİSİ — satılmış adet: ${acikSatilan}`);
  console.log(`     en kötü hâlde toplam sapma  : ${para(acikPara)}`);
  /**
   * ⚠ "EN KÖTÜ HÂL" BİR HÜKÜM DEĞİL, ÜST SINIR. Her satırda EN UZAK
   * fiyatın seçildiği varsayılıyor; gerçek sapma bunun İÇİNDE bir yerde.
   * Üst sınır küçükse soru ölçümle kapanır — büyükse bakılır.
   */
  console.log(
    "\n  ⚠ Bu bir ÜST SINIR: her satırda en uzak fiyat seçilseydi." +
      "\n    Gerçek sapma bunun İÇİNDE bir yerde.",
  );
  console.log(
    "\n  ⛔ SATILMAMIŞ FAZLALAR bugün hiçbir NET üretmiyor —" +
      "\n    satıldıklarında üretecekler. 'Bugünkü etki' ile" +
      "\n    'ileride doğacak etki' AYRI sayılıyor.",
  );
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(76));
  console.log("  PARTİ ÖYKÜSÜ — sayım anında hangi parti AÇIKTI? (salt okuma)");
  console.log("=".repeat(76));

  /**
   * ⭐ `--hepsi`: soruyu bütün sayım fazlalarına sorar ve YALNIZ ÖZET basar.
   * Kullanıcı kriteri (02.09.2026): _"önemsiz bir fark; sistem akışını
   * bozmuyorsa mühim değil."_ Kriteri uygulayabilmek için önce BÜYÜKLÜĞÜ
   * bilmek gerekiyor — "muhtemelen küçüktür" bir ölçüm değildir.
   */
  if (HEPSI) {
    await hepsiniTara(prisma);
    await prisma.$disconnect();
    return;
  }

  for (const sku of SKULAR) {
    const v = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true, sku: true, product: { select: { name: true } } },
    });
    if (v === null) {
      console.log(`\n⛔ ${sku} BULUNAMADI — bu 'sorun yok' demek DEĞİL.`);
      continue;
    }

    console.log("\n" + "-".repeat(76));
    console.log(`  ${v.product.name}`);
    console.log(`  SKU ${v.sku}`);
    console.log("-".repeat(76));

    /** Bütün hareketler — giriş de çıkış da, iş tarihi sırasıyla. */
    const hareketler = await prisma.stockMovement.findMany({
      where: { variantId: v.id },
      select: {
        id: true,
        type: true,
        quantityDelta: true,
        occurredAt: true,
        unitCostAmount: true,
        sourceMovementId: true,
        note: true,
        saleItem: {
          select: { sale: { select: { soldAt: true, iptalTarihi: true } } },
        },
      },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });

    /** parti id → tüketilen adet (bütün zamanlar). */
    const tuketim = new Map<string, number>();
    for (const h of hareketler) {
      if (h.quantityDelta < 0 && h.sourceMovementId !== null) {
        tuketim.set(
          h.sourceMovementId,
          (tuketim.get(h.sourceMovementId) ?? 0) + Math.abs(h.quantityDelta),
        );
      }
    }

    /** Sayım hareketinin anı — fazla parti bu anda açıldı. */
    const sayimHareketi = hareketler.find(
      (h) => h.note !== null && h.note.includes(SAYIM_KODU),
    );
    if (sayimHareketi === undefined) {
      console.log("  ⛔ Bu varyantta sayım hareketi YOK — ölçüm yapılamadı.");
      continue;
    }
    const sayimAni = sayimHareketi.occurredAt;
    console.log(`  sayım anı: ${gun(sayimAni)}`);

    console.log("\n  PARTİLER (giriş hareketleri):");
    let acikVardi = 0;
    for (const h of hareketler) {
      if (h.quantityDelta <= 0) continue;
      const tuketilen = tuketim.get(h.id) ?? 0;
      const kalan = h.quantityDelta - tuketilen;

      /**
       * ⚠ SAYIM ANINDA ne kadar tüketilmişti — bugünkü tüketim DEĞİL.
       * Bugüne bakmak, sayımdan SONRA olan satışları da sayar ve "o gün
       * kapalıydı" diye yanlış hüküm verdirir.
       */
      const oGuneKadar = hareketler
        .filter(
          (c) =>
            c.quantityDelta < 0 &&
            c.sourceMovementId === h.id &&
            c.occurredAt <= sayimAni,
        )
        .reduce((x, c) => x + Math.abs(c.quantityDelta), 0);
      const sayimdaKalan = h.quantityDelta - oGuneKadar;
      const sayimKendisi = h.note !== null && h.note.includes(SAYIM_KODU);
      if (!sayimKendisi && sayimdaKalan > 0) acikVardi++;

      console.log(
        `    ${gun(h.occurredAt)}  ${saga(String(h.quantityDelta), 3)} adet` +
          `  birim ${saga(para(h.unitCostAmount), 10)}` +
          `  ${saga(String(h.type), 17)}` +
          (sayimKendisi ? "   ← SAYIM FAZLASI" : "") +
          (!sayimKendisi
            ? `   sayımda kalan: ${sayimdaKalan}` +
              (sayimdaKalan > 0 ? "  ⭐ AÇIKTI" : "  (tükenmişti)")
            : ""),
      );
    }

    console.log("\n  ÇIKIŞLAR:");
    for (const h of hareketler) {
      if (h.quantityDelta >= 0) continue;
      const iptal = h.saleItem?.sale?.iptalTarihi ?? null;
      console.log(
        `    ${gun(h.occurredAt)}  ${saga(String(h.quantityDelta), 3)} adet` +
          `  ${saga(String(h.type), 17)}` +
          (h.saleItem?.sale?.soldAt
            ? `   satış ${gun(h.saleItem.sale.soldAt)}`
            : "") +
          (iptal !== null ? "   ⚠ İPTAL" : "") +
          (h.occurredAt > sayimAni ? "   (sayımdan SONRA)" : ""),
      );
    }

    console.log("\n  ⭐ HÜKÜM:");
    if (acikVardi === 0) {
      console.log(
        "     Sayım anında SAYIM PARTİSİ DIŞINDA açık parti YOKTU.\n" +
          "     → Rafta bulunan fazla mal, defterin bildiği hiçbir eski\n" +
          "       partiden gelemez; 'en son partinin fiyatı' ataması\n" +
          "       DEFTERLE TUTARLI tek seçenektir.",
      );
    } else {
      console.log(
        `     Sayım anında ${acikVardi} eski parti HÂLÂ AÇIKTI.\n` +
          "     → Fazla mal onlardan da gelmiş olabilir; soru AÇIK kalır ve\n" +
          "       ancak fatura/kutu tarihiyle kapanır.",
      );
    }
  }

  console.log("\n" + "=".repeat(76));
  console.log("  Salt okuma. Hiçbir şey yazılmadı.");
  console.log("=".repeat(76) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  /** Mesaj TAM taşınır — kısaltma teşhisi kısaltır. */
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
