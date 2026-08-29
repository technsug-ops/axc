/** BETIK SINIFI: TEK_SEFERLIK — sayim partilerine beyan maliyeti, `sayim-maliyet-20260830` kodlu. */
/** SAYIM KORUMASI YOK: hicbir HAREKET yazilmiyor/silinmiyor ve adet degismiyor — yalniz bos `unitCostAmount` dolduruluyor. Sayilmis stok tanimi geregi etkilenmez. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SAYIM PARTİLERİNE MALİYET — HALİL BEYANI
 * ----------------------------------------------------------------------------
 *      npm run canli:sayim-maliyeti            → KURU KOŞUM
 *      npm run canli:sayim-maliyeti -- --yaz   → yazar
 *      npm run canli:sayim-maliyeti -- --geri  → geri alır
 *
 *  ⛔ SORUN: 29.08 sayım düzeltmeleri 10 varyantta 19 adet MALİYETSİZ parti
 *  açtı (FIFO'da karşılığı yoktu, uydurma maliyet damgalanmadı). O adetler
 *  satıldığında kâr HESAPLANAMAZ kalır.
 *
 *  ⭐ KAYNAK: Halil'in beyanı (30.08.2026), barkod → birim maliyet.
 *  ⚠ BEYAN "OLCULDU" DEGILDIR — `AuditLog`a `kaynak: "BEYAN"` yazılır.
 *  _(Anayasa: "kaynak önceliği — içerden gelen bilgi üsttedir"; burada
 *  kanalın belgesi YOK, kendi defterimizde de kaydı YOK, geriye operatör
 *  beyanı kalıyor ve rozetiyle taşınıyor.)_
 *
 *  ═══ KDV TABANI — ÖLÇÜLDÜ, VARSAYILMADI ═══
 *  Halil: _"Listelerdeki tüm veriler KDV dahil."_ Defter de KDV DAHİL
 *  taşıyor (`lib/envanter.ts` `unitCostAmount`tan `kdvHaric()` alıyor), yani
 *  dönüşüm YOK. Beyan bağımsız iki kaynakla çaprazlandı:
 *
 *    alış dosyası · 8720689017237  beyan ₺10.346,00 ↔ dosya ₺10.345,99  ×1,000
 *    defter       · axcali1869     beyan ₺ 1.200,00 ↔ alım  ₺ 1.200,00  ×1,000
 *
 *  ⚠ VE KAPSAM AÇIKÇA YAZILIR: 10 kalemin 9'unda kıyas kurulamadı (o
 *  varyantların ne alım kaydı ne dosyada satırı var). Taban ÇÜRÜTÜLMEDİ;
 *  "iki kalemde doğrulandı" ile "onunda da doğrulandı" AYNI ŞEY DEĞİL.
 *  _(Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir".)_
 *
 *  ⚠ GERİ ALMA ÖLÇÜTE BAĞLI: "bu varyantın, bu tarihli, bu tutarı taşıyan
 *  `COUNT_CORRECTION` girişi" → maliyet `null`a döner. Liste saklanmaz.
 * ============================================================================
 */

const KOD = "sayim-maliyet-20260830";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

/** Halil beyanı 30.08.2026 — kimlik (barkod/SKU) → birim maliyet, KDV DAHİL. */
const BEYAN: { kimlik: string; birim: number; adet: number }[] = [
  { kimlik: "8684378166760", birim: 202, adet: 5 },
  { kimlik: "869008901848995360", birim: 2759.99, adet: 1 },
  { kimlik: "8695245896116", birim: 1582, adet: 1 },
  { kimlik: "8695245896130", birim: 1615, adet: 2 },
  { kimlik: "570201742520783067", birim: 6715, adet: 2 },
  { kimlik: "0622356294607", birim: 15999, adet: 1 },
  { kimlik: "8699131299791", birim: 2783, adet: 2 },
  { kimlik: "8720689017237", birim: 10346, adet: 1 },
  { kimlik: "194735129461", birim: 1491, adet: 2 },
  { kimlik: "8720389025273", birim: 499, adet: 2 },
];

const tl = (n: number) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(92));
  console.log(
    "SAYIM PARTİSİ MALİYETİ — " + (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"),
  );
  console.log("=".repeat(92));

  /** Beyan → varyant çözümü (kimlik barkod · firmaSku · sku olabilir). */
  const cozum: { kimlik: string; birim: number; adet: number; id: string; sku: string }[] = [];
  const cozulemeyen: string[] = [];
  for (const b of BEYAN) {
    const v = await p.productVariant.findFirst({
      where: { OR: [{ barcode: b.kimlik }, { companySku: b.kimlik }, { sku: b.kimlik }] },
      select: { id: true, sku: true },
    });
    if (!v) {
      cozulemeyen.push(b.kimlik);
      continue;
    }
    cozum.push({ ...b, id: v.id, sku: v.sku });
  }
  console.log("\n① KİMLİK ÇÖZÜMÜ");
  console.log("   çözülen " + cozum.length + "/" + BEYAN.length);
  if (cozulemeyen.length) console.log("   ⛔ ÇÖZÜLEMEYEN: " + cozulemeyen.join(", "));

  if (GERI) {
    let geri = 0;
    for (const x of cozum) {
      const sonuc = await p.stockMovement.updateMany({
        where: {
          variantId: x.id,
          type: "COUNT_CORRECTION",
          quantityDelta: { gt: 0 },
          unitCostAmount: x.birim.toFixed(2),
        },
        data: { unitCostAmount: null, unitCostCurrency: null },
      });
      geri += sonuc.count;
    }
    console.log("\n   ⭐ maliyeti BOŞA çevrilen hareket: " + geri + "\n");
    await p.auditLog.create({
      data: {
        action: "SAYIM_MALIYETI_GERI_ALINDI",
        targetType: "StockMovement",
        detail: JSON.stringify({ kod: KOD, bosaCevrilen: geri }),
      },
    });
    await p.$disconnect();
    return;
  }

  /**
   * ⚠ HEDEF YALNIZ MALİYETSİZ GİRİŞ. Maliyeti OLAN bir hareketin üstüne
   * yazılmaz — ölçülmüş bir damga, beyanla değiştirilmez.
   * _(Anayasa: "FIFO üstüne yazılmaz", kullanıcı kararı 28.08.2026.)_
   */
  console.log("\n② PLAN");
  const plan: { x: (typeof cozum)[number]; hareketId: string; adet: number }[] = [];
  const kovaAdetTutmaz: string[] = [];
  const kovaMaliyetliVar: string[] = [];
  /** ⭐ Zaten yazılmış — "adet tutmuyor" DEĞİL, "iş bitmiş". */
  const kovaZatenYazili: string[] = [];
  for (const x of cozum) {
    const hh = await p.stockMovement.findMany({
      where: {
        variantId: x.id,
        type: "COUNT_CORRECTION",
        quantityDelta: { gt: 0 },
        unitCostAmount: null,
      },
      select: { id: true, quantityDelta: true, occurredAt: true },
    });
    const toplam = hh.reduce((a, h) => a + h.quantityDelta, 0);
    /**
     * ⭐ "ZATEN YAZILMIŞ" İLE "ADET TUTMUYOR" AYRI SAYILIR.
     *
     * ⛔ İLK SÜRÜM İKİSİNİ TEK KEFEYE KOYDU: yazımdan sonraki koşum
     * "ADET TUTMAYAN 10" diyordu, oysa gerçek durum "iş bitmiş"ti. Doğru
     * sayı + yanlış etiket = yanlış bilgi; okuyan olmayan bir ayrışmayı
     * araştırmaya girişirdi.
     * _(Anayasa: "metin, sahip olmadığı anlamı iddia etmez".)_
     */
    if (toplam === 0) {
      const yazili = await p.stockMovement.aggregate({
        where: {
          variantId: x.id,
          type: "COUNT_CORRECTION",
          quantityDelta: { gt: 0 },
          unitCostAmount: x.birim.toFixed(2),
        },
        _sum: { quantityDelta: true },
      });
      if ((yazili._sum.quantityDelta ?? 0) === x.adet) {
        kovaZatenYazili.push(x.sku);
        continue;
      }
    }
    if (toplam !== x.adet) {
      /** ⛔ BEYANDAKİ ADET İLE DEFTERDEKİ MALİYETSİZ ADET TUTMUYORSA YAZILMAZ. */
      kovaAdetTutmaz.push(x.sku + " (beyan " + x.adet + " · defterde maliyetsiz " + toplam + ")");
      continue;
    }
    const maliyetli = await p.stockMovement.count({
      where: {
        variantId: x.id,
        type: "COUNT_CORRECTION",
        quantityDelta: { gt: 0 },
        unitCostAmount: { not: null },
      },
    });
    if (maliyetli > 0) kovaMaliyetliVar.push(x.sku + " (" + maliyetli + " hareket)");
    for (const h of hh) plan.push({ x, hareketId: h.id, adet: h.quantityDelta });
  }
  const planAdet = plan.reduce((a, q) => a + q.adet, 0);
  const planTutar = plan.reduce((a, q) => a + q.adet * q.x.birim, 0);
  console.log("   ⭐ MALİYET YAZILACAK hareket " + plan.length +
    " · adet " + planAdet + " · tutar ₺" + tl(planTutar));
  console.log("   ✓ ZATEN YAZILMIŞ               " + kovaZatenYazili.length +
    (kovaZatenYazili.length ? "   [" + kovaZatenYazili.join(", ") + "]" : ""));
  console.log("   ⛔ ADET TUTMAYAN               " + kovaAdetTutmaz.length);
  for (const k of kovaAdetTutmaz) console.log("     " + k);
  if (kovaMaliyetliVar.length)
    console.log("   ⚠ zaten maliyetli sayım girişi de VAR (dokunulmuyor): " +
      kovaMaliyetliVar.join(", "));

  console.log("\n③ SATIR SATIR");
  for (const q of plan) {
    console.log("   " + q.x.sku.padEnd(17) + " " + q.adet + " adet × ₺" +
      tl(q.x.birim).padStart(10) + " = ₺" + tl(q.adet * q.x.birim).padStart(11));
  }

  if (!YAZ) {
    console.log("\n   KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz\n");
    await p.$disconnect();
    return;
  }
  if (kovaAdetTutmaz.length > 0) {
    console.log("\n⛔ ADET TUTMAYAN KALEM VAR — YAZILMADI. Beyan ile defter ayrışıyor.\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  const oncekiMaliyetsiz = await p.stockMovement.count({
    where: { quantityDelta: { gt: 0 }, unitCostAmount: null },
  });
  for (const q of plan) {
    await p.stockMovement.update({
      where: { id: q.hareketId },
      data: { unitCostAmount: q.x.birim.toFixed(2), unitCostCurrency: "TRY" },
    });
  }
  const sonrakiMaliyetsiz = await p.stockMovement.count({
    where: { quantityDelta: { gt: 0 }, unitCostAmount: null },
  });
  console.log("\n④ YAZILDI");
  console.log("   maliyetsiz GİRİŞ hareketi  " + oncekiMaliyetsiz + " → " +
    sonrakiMaliyetsiz + "   (fark " + (sonrakiMaliyetsiz - oncekiMaliyetsiz) +
    ", beklenen -" + plan.length + ")" +
    (oncekiMaliyetsiz - sonrakiMaliyetsiz === plan.length ? "   ✓" : "   ⛔"));

  await p.auditLog.create({
    data: {
      action: "SAYIM_MALIYETI_YAZILDI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        kod: KOD,
        kaynak: "BEYAN",
        beyanSahibi: "Halil",
        beyanTarihi: "2026-08-30",
        hareket: plan.length,
        adet: planAdet,
        tutar: Number(planTutar.toFixed(2)),
        kdvTabani: "DAHIL",
        tabanCaprazi:
          "8720689017237 beyan 10346.00 ↔ alis dosyasi 10345.99 (x1.000) · " +
          "axcali1869 beyan 1200.00 ↔ defter alimi 1200.00 (x1.000). " +
          "10 kalemin 9'unda KIYAS KURULAMADI — taban curutulmedi, " +
          "dogrulanmis da sayilmaz.",
        satirlar: plan.map((q) => ({ sku: q.x.sku, adet: q.adet, birim: q.x.birim })),
        geriAlmaOlcutu:
          "o varyantin COUNT_CORRECTION girisi + unitCostAmount = beyan tutari " +
          "→ null. Liste saklanmaz, olcut yeniden hesaplanir.",
      }),
    },
  });
  console.log("   ✓ AuditLog: SAYIM_MALIYETI_YAZILDI");
  console.log("\n   GERİ ALMA: npm run canli:sayim-maliyeti -- --geri\n");
  await p.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
