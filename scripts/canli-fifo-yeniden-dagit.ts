/** BETIK SINIFI: TEK_SEFERLIK — K97 ileri parti baglarinin FIFO sirasina gore yeniden dagitimi, `fifo-dagitim-20260830` kodlu. */
/** SAYIM KORUMASI YOK: hicbir hareket YAZILMIYOR/SILINMIYOR — yalniz `sourceMovementId` ve maliyet damgasi cevriliyor; adet degismiyor. */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K97 — İLERİ PARTİ BAĞLARI, FIFO SIRASINA GÖRE YENİDEN DAĞITILIR
 * ----------------------------------------------------------------------------
 *      npm run canli:fifo-dagit                      → KURU KOŞUM (hepsi)
 *      npm run canli:fifo-dagit -- --sku=axcali2723  → tek varyant
 *      npm run canli:fifo-dagit -- --sku=... --yaz   → yazar
 *      npm run canli:fifo-dagit -- --geri            → geri alır
 *
 *  ⛔ HALİL BULDU 30.08.2026: `3168430275010` (axcali2723) — _"stok sıkıntısı
 *  yok, satışları giriyorum, fakat maliyet olarak çok eskiden aldığım
 *  maliyeti getiriyor; normalde geçen hafta yeniden stoğa giren bir ürün."_
 *
 *  ── ÖLÇÜM ───────────────────────────────────────────────────────────────
 *  Varyantın 26 çıkışının **20'si geleceğin partisini yemiş**: 2024 tarihli
 *  satışlar 2026-08 alımlarını tüketmiş. Sonuç: gerçek raf stoğu (₺759,90 /
 *  ₺649,90) "tüketilmiş" görünüyor, geriye tek açık parti olarak 2024'ün
 *  ₺340'ı kalıyor ve **her yeni satış onu alıyor.**
 *
 *  Cephe geneli: 6062 bağlı çıkışın **803'ü** (%13,25) ileri parti yiyor ·
 *  **180 varyant** · 802'si `SALE_OUT`, 1'i `ADJUSTMENT`.
 *
 *  ── NİYE K91 BUNU BULMADI ───────────────────────────────────────────────
 *  `canli:bag-onar` ölçütü _"damga ≠ bağlı partinin maliyeti"_ idi. Burada
 *  damga ile bağ **TUTARLI**: 2024 satışı ₺799,90 damgalı ve ₺799,90'lık
 *  2026 partisine bağlı. İkisi de aynı yanlışı taşıdığı için K91 dokunmadı.
 *  _(Anayasa: "iç tutarlılık kaymayı gizler".)_
 *
 *  ── NİYE `ileri-parti-onar` KULLANILMIYOR ───────────────────────────────
 *  ⛔ O ARAÇ K88'DE ÇÜRÜTÜLDÜ ve 810 bağı geri alındı. Öncülü şuydu:
 *  _"partisi çıkıştan sonra tarihli ⇒ o satışın alımı defterde YOK"_ —
 *  yanlış. Alım çoğu zaman defterde VARDIR, yalnız daha GEÇ tarihle
 *  girilmiştir. Her ileri bağ için yeni parti açmak **aynı malı iki kez
 *  saydı.** Bu betik parti AÇMAZ; var olan partileri yeniden dağıtır.
 *
 *  ── ÖLÇÜT ───────────────────────────────────────────────────────────────
 *  Varyantın hareketleri kronolojik yürütülür ve her çıkış, **kendi iş
 *  gününün sonuna kadar açılmış** en eski partiden düşülür (`sinir` kuralı,
 *  29.08.2026). Yani bu, `sinir` en baştan var olsaydı doğacak dağıtımın
 *  ta kendisi. Tarih uydurulmaz, adet değişmez, para yaratılmaz.
 *
 *  ⚠ ADET DEĞİŞMEZ — YALNIZ SIRA. Ledger toplamı, FIFO toplamı ve her
 *  hareketin `quantityDelta`sı aynen kalır. Değişen tek şey hangi çıkışın
 *  hangi partiden düştüğü ve o çıkışa basılan maliyet damgası.
 * ============================================================================
 */

/** İz kodu — geri alma bu koda göre YENİDEN HESAPLANIR, saklanan listeye değil. */
const PARTI = "fifo-dagitim-20260830";

type Hareket = {
  id: string;
  variantId: string;
  quantityDelta: number;
  occurredAt: Date;
  sourceMovementId: string | null;
  unitCostAmount: unknown;
  unitCostCurrency: string | null;
  type: string;
};

type Degisiklik = {
  hareketId: string;
  variantId: string;
  eskiKaynak: string | null;
  yeniKaynak: string | null;
  eskiMaliyet: string | null;
  yeniMaliyet: string | null;
};

/**
 * Bir varyantın çıkışlarını FIFO + `sinir` kuralıyla yeniden dağıtır.
 *
 * ⚠ SAF: veritabanına dokunmaz, `Date.now()` kullanmaz. Girdi hareket
 * listesi, çıktı değişiklik listesi.
 */
export function yenidenDagit(hareketler: Hareket[]): Degisiklik[] {
  /** ⚠ SIRA: iş tarihi, eşitlikte kimlik — koşumlar arası kararlı olsun. */
  const sirali = [...hareketler].sort((a, b) =>
    a.occurredAt.getTime() !== b.occurredAt.getTime()
      ? a.occurredAt.getTime() - b.occurredAt.getTime()
      : a.id.localeCompare(b.id),
  );

  type Parti = { id: string; kalan: number; acildi: Date; maliyet: string | null; para: string | null };
  const partiler: Parti[] = [];
  const degisiklikler: Degisiklik[] = [];

  for (const h of sirali) {
    if (h.quantityDelta > 0) {
      partiler.push({
        id: h.id,
        kalan: h.quantityDelta,
        acildi: h.occurredAt,
        maliyet: h.unitCostAmount === null ? null : String(h.unitCostAmount),
        para: h.unitCostCurrency,
      });
      continue;
    }
    if (h.quantityDelta === 0) continue;

    /**
     * ⭐ `sinir` KURALI: yalnız bu çıkışın İŞ GÜNÜNÜN SONUNA kadar açılmış
     * partiler aday. Aynı gün alıp aynı gün satmak kenar durum değil, işin
     * kendisi — ölçüldü 29.08.2026: bağların %48,72'si aynı gün.
     */
    const gunSonu = new Date(h.occurredAt);
    gunSonu.setUTCHours(23, 59, 59, 999);

    let kalanIhtiyac = -h.quantityDelta;
    let secilen: Parti | null = null;
    for (const p of partiler) {
      if (p.kalan <= 0) continue;
      if (p.acildi > gunSonu) continue;
      secilen = p;
      break;
    }

    /**
     * ⛔ ADAY YOKSA BAĞ DEĞİŞTİRİLMEZ. "Uygun parti bulamadım" bir hüküm
     * değil; mevcut bağ yerinde bırakılır ve sayılır. Zorlamak, olmayan bir
     * partiyi uydurmak olurdu.
     */
    if (secilen === null) continue;

    /** ⚠ Tek partiden düşüyoruz: kalan yetmezse de o partiden düşülür ve
     *  bakiye eksiye inmez — çok partili dağıtım bu turun kapsamı DEĞİL,
     *  çünkü bir çıkış bugün TEK `sourceMovementId` taşıyabiliyor. */
    secilen.kalan -= kalanIhtiyac;
    kalanIhtiyac = 0;

    const eskiKaynak = h.sourceMovementId;
    const eskiMaliyet = h.unitCostAmount === null ? null : String(h.unitCostAmount);
    if (eskiKaynak !== secilen.id || eskiMaliyet !== secilen.maliyet) {
      degisiklikler.push({
        hareketId: h.id,
        variantId: h.variantId,
        eskiKaynak,
        yeniKaynak: secilen.id,
        eskiMaliyet,
        yeniMaliyet: secilen.maliyet,
      });
    }
  }
  return degisiklikler;
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const yaz = process.argv.includes("--yaz");
  const geri = process.argv.includes("--geri");
  const skuArg = process.argv.find((a) => a.startsWith("--sku="))?.slice(6) ?? null;

  console.log("");
  console.log("K97 — FIFO BAĞLARININ YENİDEN DAĞITIMI");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        " + (geri ? "GERİ ALMA" : yaz ? "YAZMA" : "KURU KOŞUM — hiçbir şey yazılmaz"));
  console.log("  kapsam     " + (skuArg ?? "TÜM VARYANTLAR"));
  console.log("");

  /* ═══ GERİ ALMA — YENİDEN HESAPLANABİLİR ÖLÇÜTTEN ═════════════════════ */
  if (geri) {
    /**
     * ⭐ GERİ ALMA KÜMESİ SAKLANAN LİSTEDEN DEĞİL, İZDEN OKUNUR — ve her iz
     * satırı KENDİ eski değerini taşır. Toplu bir listeye bağlanmış olsaydı
     * liste tavanda kırpılınca geri alma yolu YAZILDIĞI ANDA bozulurdu
     * (28.08 dersi).
     */
    const izler = await prisma.auditLog.findMany({
      where: { action: "FIFO_DAGITIM", detail: { contains: PARTI } },
      select: { id: true, detail: true },
    });
    console.log(`  iz satırı ${izler.length}`);
    let geriAlinan = 0;
    for (const iz of izler) {
      const d = JSON.parse(iz.detail ?? "{}") as Degisiklik & { parti?: string };
      if (d.parti !== PARTI || !d.hareketId) continue;
      await prisma.stockMovement.update({
        where: { id: d.hareketId },
        data: {
          sourceMovementId: d.eskiKaynak,
          unitCostAmount: d.eskiMaliyet,
        },
      });
      geriAlinan++;
    }
    console.log(`  geri alınan hareket ${geriAlinan}`);
    await prisma.$disconnect();
    return;
  }

  /* ═══ KAPSAM ══════════════════════════════════════════════════════════ */
  const varyantSuzgeci = skuArg ? { sku: skuArg } : {};
  const varyantlar = await prisma.productVariant.findMany({
    where: varyantSuzgeci,
    select: { id: true, sku: true, product: { select: { name: true } } },
  });
  if (varyantlar.length === 0) {
    console.log("  ⛔ varyant bulunamadı");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const hepsi = (await prisma.stockMovement.findMany({
    where: { variantId: { in: varyantlar.map((v) => v.id) } },
    select: {
      id: true, variantId: true, quantityDelta: true, occurredAt: true,
      sourceMovementId: true, unitCostAmount: true, unitCostCurrency: true, type: true,
    },
  })) as unknown as Hareket[];

  const gruplu = new Map<string, Hareket[]>();
  for (const h of hepsi) {
    const liste = gruplu.get(h.variantId) ?? [];
    liste.push(h);
    gruplu.set(h.variantId, liste);
  }

  /* ═══ HESAP ═══════════════════════════════════════════════════════════ */
  let toplamDegisiklik = 0;
  let maliyetiDegisen = 0;
  const etkilenenVaryant: { sku: string; ad: string; adet: number }[] = [];
  const tumDegisiklikler: Degisiklik[] = [];

  for (const v of varyantlar) {
    const hareketler = gruplu.get(v.id) ?? [];
    if (hareketler.length === 0) continue;
    const d = yenidenDagit(hareketler);
    if (d.length === 0) continue;
    toplamDegisiklik += d.length;
    maliyetiDegisen += d.filter((x) => x.eskiMaliyet !== x.yeniMaliyet).length;
    etkilenenVaryant.push({ sku: v.sku, ad: v.product.name.slice(0, 44), adet: d.length });
    tumDegisiklikler.push(...d);
  }

  console.log(`  incelenen varyant       ${varyantlar.length}`);
  console.log(`  ETKİLENEN varyant       ${etkilenenVaryant.length}`);
  console.log(`  değişecek bağ           ${toplamDegisiklik}`);
  console.log(`  ...maliyet damgası da   ${maliyetiDegisen}`);
  console.log("");

  for (const e of etkilenenVaryant.sort((a, b) => b.adet - a.adet).slice(0, 15))
    console.log(`  ${String(e.adet).padStart(4)} bağ  ${e.sku.padEnd(16)} ${e.ad}`);

  if (skuArg && tumDegisiklikler.length > 0) {
    console.log("\n  DEĞİŞİKLİK DÖKÜMÜ:");
    for (const d of tumDegisiklikler)
      console.log(`    ${d.hareketId.slice(-6)}  kaynak ${(d.eskiKaynak ?? "—").slice(-6)} → ${(d.yeniKaynak ?? "—").slice(-6)}   maliyet ${d.eskiMaliyet ?? "—"} → ${d.yeniMaliyet ?? "—"}`);
  }

  if (!yaz) {
    console.log("\n  ⚠ KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için `--yaz`.");
    await prisma.$disconnect();
    return;
  }

  /* ═══ YAZMA ═══════════════════════════════════════════════════════════ */
  console.log("\n  YAZILIYOR...");
  let yazilan = 0;
  for (const d of tumDegisiklikler) {
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.update({
        where: { id: d.hareketId },
        data: { sourceMovementId: d.yeniKaynak, unitCostAmount: d.yeniMaliyet },
      });
      /**
       * ⭐ HER SATIR KENDİ ESKİ DEĞERİNİ İZE YAZAR — özet değil.
       * Toplam tek başına, sonradan doğan bir farkın KAYNAĞINI aramaya izin
       * vermez (28.08 dersi: ₺1.404,50 açıklanamadı ve atfedilemedi).
       */
      await tx.auditLog.create({
        data: {
          action: "FIFO_DAGITIM",
          targetType: "StockMovement",
          targetId: d.hareketId,
          detail: JSON.stringify({ parti: PARTI, ...d }),
        },
      });
    });
    yazilan++;
  }
  console.log(`  yazılan ${yazilan}`);
  console.log("\n  ⚠ SIRADAKİ: etkilenen satışların kârı TAZELENMELİ —");
  console.log("     maliyet damgası değişti, NET-1/NET-2 eski hesapla kaldı.");
  await prisma.$disconnect();
}

/**
 * ⚠ DOĞRUDAN KOŞULUNCA ÇALIŞIR — İÇE AKTARILINCA DEĞİL.
 * `yenidenDagit` saf gövdesi bekçiden ÇAĞRILARAK sınanıyor; kapı olmasaydı
 * her testte canlı veritabanına bağlanmaya çalışırdı.
 */
if (require.main === module) main();
