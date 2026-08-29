/** BETIK SINIFI: TEK_SEFERLIK — 29.08 tek vakalik ileri parti onarimi, `ileri-parti-onarim-20260829` partisine kilitli. */
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  GELECEKTEKİ PARTİYİ TÜKETEN SATIŞLAR — ONARIM
 * ----------------------------------------------------------------------------
 *      npm run canli:ileri-parti-onar                      → KURU KOŞUM (hepsi)
 *      npm run canli:ileri-parti-onar -- --sku=axcalistan01 → tek varyant
 *      npm run canli:ileri-parti-onar -- --sku=... --yaz    → yazar
 *      npm run canli:ileri-parti-onar -- --geri             → geri alır
 *
 *  ⛔ ARIZA: geçmiş tarihli bir satış, kendisinden SONRA gelen bir partiyi
 *  tüketiyor. Sonuç: bugünkü GERÇEK stok kilitleniyor, ekran 0 gösteriyor,
 *  yeni sipariş kaydedilemiyor. (Halil buldu 29.08.2026, `10383153730`.)
 *
 *  ⭐ ÇARE "BAĞI KOPARMAK" DEĞİL. Satış gerçek, mal gerçekten çıktı; bağı
 *  koparsak ledger düşük kalır, FIFO yükselir ve İKİ DEFTER AYRIŞIR
 *  (anayasa: "hayalet adet"). Eksik olan şey ALIM: o satışın alımı defterde
 *  yok. O yüzden:
 *      ① çıkışın ileri tarihli partiyle bağı KOPARILIR
 *      ② ÇIKIŞ TARİHİNE bir `PURCHASE_IN` açılır
 *      ③ çıkış ona bağlanır
 *  Ledger değişmez, FIFO'daki gerçek parti serbest kalır, ikisi de doğru.
 *
 *  ⛔ MALİYET UYDURULMAZ: satış dosyasının M sütunundan (`ÜRÜN ALIŞ FİYATI`)
 *  gelir. Dosyada karşılığı yoksa parti MALİYETSİZ açılır ve satış dürüstçe
 *  `NO_COST` der. Geleceğin partisinden ödünç alınmış rakam KORUNMAZ —
 *  o rakam zaten uydurmaydı.
 *
 *  ── GERİ ALMA (anayasa 28.08.2026) ──────────────────────────────────────
 *  KÜME deterministik ölçütten gelir: `note` içinde parti adı geçen
 *  hareketler. ESKİ BAĞLAR ise satır bazında ize yazılır — ama geri alma
 *  onlara BAĞLI DEĞİL, yalnız onlarla TAMAMLANIR.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const PARTI = "ileri-parti-onarim-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const SKU = (process.argv.find((a) => a.startsWith("--sku=")) ?? "").slice(6);
/** İz parçası başına satır — `AuditLog.detail` TEXT tavanına dayanmasın. */
const IZ_DILIM = 150;

const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);
const gun = (d: Date) => d.toISOString().slice(0, 10);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  /** ⚠ Adres HER ŞEYDEN ÖNCE — kâr motoru uygulamanın tekilini çağırıyor. */
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(104));
  console.log("İLERİ TARİHLİ PARTİ ONARIMI — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)") +
    (SKU ? "  ·  YALNIZ " + SKU : "  ·  TÜMÜ"));
  console.log("=".repeat(104));

  // ═══ GERİ ALMA ═══════════════════════════════════════════════════════
  if (GERI) {
    const yeniPartiler = await p.stockMovement.findMany({
      where: { note: { contains: PARTI } },
      select: { id: true },
    });
    console.log("\n   bu onarımın açtığı parti: " + yeniPartiler.length);
    if (yeniPartiler.length === 0) {
      console.log("   ⛔ GERİ ALINACAK KAYIT YOK.\n");
      await p.$disconnect();
      return;
    }
    const izler = await p.auditLog.findMany({
      where: { action: "ILERI_PARTI_ONARIMI_ESKI_BAGLAR" },
      orderBy: { createdAt: "asc" },
      select: { detail: true },
    });
    const eski = new Map<string, string>();
    for (const z of izler) {
      for (const r of JSON.parse(z.detail ?? "[]") as { c: string; e: string }[]) {
        eski.set(r.c, r.e);
      }
    }
    console.log("   izde eski bağ kaydı: " + eski.size);
    let donen = 0;
    for (const [cikisId, eskiParti] of eski) {
      await p.stockMovement.update({
        where: { id: cikisId },
        data: { sourceMovementId: eskiParti },
      });
      donen++;
    }
    await p.stockMovement.deleteMany({
      where: { id: { in: yeniPartiler.map((x) => x.id) } },
    });
    console.log("   ⭐ eski bağa döndürülen çıkış: " + donen);
    console.log("   ⭐ silinen parti: " + yeniPartiler.length);
    console.log("   ⚠ Kâr TAZELENMEDİ — ayrıca koşulmalı.\n");
    await p.$disconnect();
    return;
  }

  // ── DOSYADAN MALİYET ───────────────────────────────────────────────────
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => {
    const k = bas.indexOf(a);
    if (k < 0) throw new Error("KOLON YOK: " + a);
    return k;
  };
  /** ⚠ Anahtar: sipariş no + SKU — aynı siparişte farklı ürün olabilir. */
  const dosyaMaliyet = new Map<string, number>();
  for (const r of ss.data.slice(6)) {
    if (String(r[j("TÜR")] ?? "").trim() !== "satış") continue;
    const kod = String(r[j("Sipariş Numarası")] ?? "").trim();
    const sku = String(r[j("SKU")] ?? "").trim();
    const m = n(r[j("ÜRÜN ALIŞ FİYATI")]);
    if (kod === "" || m <= 0) continue;
    dosyaMaliyet.set(kod + "|" + sku, m);
    if (!dosyaMaliyet.has(kod)) dosyaMaliyet.set(kod, m);
  }

  // ── BOZUK BAĞLAR ───────────────────────────────────────────────────────
  const cikislar = await p.stockMovement.findMany({
    where: {
      quantityDelta: { lt: 0 }, sourceMovementId: { not: null },
      ...(SKU ? { variant: { sku: SKU } } : {}),
    },
    select: {
      id: true, quantityDelta: true, occurredAt: true, unitCostAmount: true,
      unitCostCurrency: true, sourceMovementId: true,
      variant: { select: { id: true, sku: true, barcode: true,
        product: { select: { name: true } } } },
      sourceMovement: { select: { id: true, occurredAt: true } },
      saleItem: { select: { id: true, sale: { select: { code: true, soldAt: true } } } },
    },
  });
  const bozuk = cikislar.filter((x) =>
    x.sourceMovement !== null && x.sourceMovement.occurredAt > x.occurredAt);

  type Plan = {
    cikisId: string; eskiParti: string; variantId: string; sku: string;
    adet: number; anParti: Date; maliyet: number | null; kod: string;
  };
  const plan: Plan[] = [];
  for (const x of bozuk) {
    const kod = x.saleItem?.sale.code ?? "";
    const sku = x.variant.sku ?? "";
    const m = dosyaMaliyet.get(kod + "|" + sku)
      ?? dosyaMaliyet.get(kod + "|" + (x.variant.barcode ?? ""))
      ?? dosyaMaliyet.get(kod)
      ?? null;
    plan.push({
      cikisId: x.id, eskiParti: x.sourceMovementId!, variantId: x.variant.id,
      sku, adet: Math.abs(x.quantityDelta), anParti: x.occurredAt,
      maliyet: m, kod,
    });
  }

  const maliyetli = plan.filter((x) => x.maliyet !== null);
  const maliyetsiz = plan.filter((x) => x.maliyet === null);

  console.log("\n① KAPSAM");
  console.log("   bozuk bağ (çıkış)          : " + plan.length);
  console.log("   etkilenen varyant          : " + new Set(plan.map((x) => x.variantId)).size);
  console.log("   serbest kalacak adet       : " + plan.reduce((t, x) => t + x.adet, 0));
  console.log("\n② MALİYET KAYNAĞI — dosyanın M sütunu");
  console.log("   ⭐ dosyada maliyeti OLAN    : " + maliyetli.length +
    "  · toplam " + t2(maliyetli.reduce((t, x) => t + x.adet * (x.maliyet ?? 0), 0)));
  console.log("   ⛔ dosyada YOK → NO_COST    : " + maliyetsiz.length);
  console.log("   ⚠ Geleceğin partisinden ödünç alınmış rakam KORUNMAZ.");

  /** ③ ÖDÜNÇ ALINMIŞ MALİYET — bugüne kadar kâra ne girdi. */
  const odunc = bozuk.reduce((t, x) =>
    t + Math.abs(x.quantityDelta) * Number((x.unitCostAmount ?? 0).toString()), 0);
  const yeniToplam = maliyetli.reduce((t, x) => t + x.adet * (x.maliyet ?? 0), 0);
  console.log("\n③ MALİYET ETKİSİ — ÖLÇÜLDÜ (tahmin değil)");
  console.log("   bugün kâra giren (ödünç)   : " + t2(odunc));
  console.log("   onarımdan sonra girecek    : " + t2(yeniToplam));
  console.log("   ⭐ FARK                     : " + t2(yeniToplam - odunc));
  console.log("   ⚠ NO_COST'a düşecek " + maliyetsiz.length + " kalemin maliyeti");
  console.log("     hesaptan TAMAMEN çıkar — o satışlar 'hesaplanamadı' der.");

  /** ④ STOK ETKİSİ */
  const varyantlar = [...new Set(plan.map((x) => x.variantId))];
  let envanterArtis = 0;
  for (const vid of varyantlar) {
    const kilit = plan.filter((x) => x.variantId === vid);
    /** Serbest kalan adet, o varyantın İLERİ TARİHLİ partisinin maliyetiyle. */
    for (const k of kilit) {
      const parti = await p.stockMovement.findUnique({
        where: { id: k.eskiParti },
        select: { unitCostAmount: true },
      });
      envanterArtis += k.adet * Number((parti?.unitCostAmount ?? 0).toString());
    }
  }
  console.log("\n④ STOK ETKİSİ");
  console.log("   serbest kalacak adet       : " + plan.reduce((t, x) => t + x.adet, 0));
  console.log("   ⭐ ENVANTER DEĞERİ ARTIŞI   : " + t2(envanterArtis));
  console.log("     (serbest kalan partilerin KENDİ maliyetiyle — ödenen, KDV dahil)");

  if (SKU) {
    console.log("\n⑤ SATIR SATIR");
    for (const x of plan) {
      console.log("   çıkış " + gun(x.anParti) + " · satış " + (x.kod || "—") +
        " · adet " + x.adet +
        " · maliyet " + (x.maliyet === null ? "⛔ DOSYADA YOK → NO_COST" : t2(x.maliyet)));
    }
  }

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:ileri-parti-onar -- " +
      (SKU ? "--sku=" + SKU + " " : "") + "--yaz");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect();
    return;
  }

  // ═══ YAZIM ═══════════════════════════════════════════════════════════
  /** ⭐ ÖNCE ölçülür — kıyas TAHMİN değil ÖLÇÜM olsun diye. */
  const etkilenenKalem = await p.saleItem.findMany({
    where: { id: { in: bozuk.map((x) => x.saleItem?.id).filter(Boolean) as string[] } },
    select: { saleId: true },
  });
  const etkilenenSatis = [...new Set(etkilenenKalem.map((k) => k.saleId))];
  const netOnce = await p.sale.aggregate({
    where: { id: { in: etkilenenSatis } },
    _sum: { net1Amount: true, net2Amount: true },
  });
  const durumOnce = await p.sale.groupBy({
    by: ["profitStatus"], where: { id: { in: etkilenenSatis } }, _count: { _all: true },
  });
  const o1 = Number((netOnce._sum.net1Amount ?? 0).toString());
  const o2 = Number((netOnce._sum.net2Amount ?? 0).toString());
  console.log("");
  console.log("⑤ ONCE — ETKILENEN " + etkilenenSatis.length + " SATIS");
  console.log("   NET-1 " + t2(o1) + " · NET-2 " + t2(o2));
  console.log("   kar durumu: " +
    durumOnce.map((g) => g.profitStatus + "=" + g._count._all).join(" · "));

  const stokOnce = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  console.log("\n⚠ YAZILIYOR — " + plan.length + " bağ");
  const eskiBaglar: { c: string; e: string }[] = [];
  let ok = 0;
  for (const x of plan) {
    await p.$transaction(async (tx) => {
      const yeni = await tx.stockMovement.create({
        data: {
          variantId: x.variantId, type: "PURCHASE_IN", quantityDelta: x.adet,
          occurredAt: x.anParti,
          unitCostAmount: x.maliyet === null ? null : String(x.maliyet),
          unitCostCurrency: x.maliyet === null ? null : "TRY",
          note: PARTI + " · satışın alımı defterde yoktu; ileri tarihli parti " +
            "serbest bırakıldı. Maliyet " +
            (x.maliyet === null ? "DOSYADA YOK (NO_COST)" : "satış dosyası M sütunu") + ".",
        },
      });
      await tx.stockMovement.update({
        where: { id: x.cikisId },
        data: {
          sourceMovementId: yeni.id,
          unitCostAmount: x.maliyet === null ? null : String(x.maliyet),
          unitCostCurrency: x.maliyet === null ? null : "TRY",
        },
      });
    });
    eskiBaglar.push({ c: x.cikisId, e: x.eskiParti });
    ok++;
    if (ok % 100 === 0) console.log("   … " + ok + "/" + plan.length);
  }
  console.log("   ⭐ onarılan bağ: " + ok);

  const stokSonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const fark = (stokSonra._sum.quantityDelta ?? 0) - (stokOnce._sum.quantityDelta ?? 0);
  console.log("\n   DOĞRULAMA — ledger DEĞİŞMEMELİ mi? HAYIR, ARTMALI:");
  console.log("     net stok farkı: " + fark + "   (beklenen +" +
    plan.reduce((t, x) => t + x.adet, 0) + " — eksik alımlar deftere girdi)");
  console.log("     ⚠ Çıkış zaten vardı; eklenen yalnız GİRİŞ. Yani stok");
  console.log("       ARTAR ve bu doğrudur: o mal gerçekten alınmıştı.");

  /** ⭐ ESKİ BAĞLAR SATIR BAZINDA, DİLİMLENEREK — TEXT tavanına dayanmasın. */
  for (let k = 0; k < eskiBaglar.length; k += IZ_DILIM) {
    await p.auditLog.create({
      data: {
        action: "ILERI_PARTI_ONARIMI_ESKI_BAGLAR",
        targetType: "StockMovement",
        detail: JSON.stringify(eskiBaglar.slice(k, k + IZ_DILIM)),
      },
    });
  }
  await p.auditLog.create({
    data: {
      action: "ILERI_PARTI_ONARIMI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        parti: PARTI,
        gerekce: "Geçmiş tarihli satışlar kendilerinden SONRA gelen partileri tüketiyordu; gerçek stok kilitleniyordu. Halil buldu 29.08.2026 (10383153730).",
        kapsam: SKU ? "yalnız " + SKU : "tümü",
        bag: ok,
        serbestAdet: plan.reduce((t, x) => t + x.adet, 0),
        maliyetDosyadan: maliyetli.length,
        maliyetsizNoCost: maliyetsiz.length,
        oduncMaliyet: odunc.toFixed(2),
        yeniMaliyet: yeniToplam.toFixed(2),
        geriAlmaOlcutu: "Kimlik listesi DEĞİL, desen: StockMovement.note içinde '" +
          PARTI + "' geçen partiler. Eski bağlar ILERI_PARTI_ONARIMI_ESKI_BAGLAR " +
          "izlerinde DİLİMLENMİŞ hâlde. Komut: npm run canli:ileri-parti-onar -- --geri",
        izDilimi: IZ_DILIM,
      }),
    },
  });
  console.log("   ✓ AuditLog: ILERI_PARTI_ONARIMI (+ eski bağlar " +
    Math.ceil(eskiBaglar.length / IZ_DILIM) + " dilimde)");

  console.log("\n⑥ KÂR TAZELENİYOR — uygulamanın kendi gövdesiyle");
  const { satisKarTazele } = await import("../src/lib/kar-yeniden");
  const satisIdleri = [...new Set(bozuk.map((x) => x.saleItem?.id).filter(Boolean))];
  const kalemler = await p.saleItem.findMany({
    where: { id: { in: satisIdleri as string[] } },
    select: { saleId: true },
  });
  const satislar = [...new Set(kalemler.map((k) => k.saleId))];
  let tz = 0;
  for (const sid of satislar) { if (await satisKarTazele(sid)) tz++; }
  console.log("   ⭐ tazelenen satış: " + tz + " / " + satislar.length);

  const netSonra = await p.sale.aggregate({
    where: { id: { in: etkilenenSatis } },
    _sum: { net1Amount: true, net2Amount: true },
  });
  const durumSonra = await p.sale.groupBy({
    by: ["profitStatus"], where: { id: { in: etkilenenSatis } }, _count: { _all: true },
  });
  const y1 = Number((netSonra._sum.net1Amount ?? 0).toString());
  const y2v = Number((netSonra._sum.net2Amount ?? 0).toString());
  console.log("\n⑦ ÖNCE / SONRA — ÖLÇÜLDÜ");
  console.log("   NET-1  önce " + t2(o1) + "  sonra " + t2(y1) +
    "  ⭐ FARK " + t2(y1 - o1));
  console.log("   NET-2  önce " + t2(o2) + "  sonra " + t2(y2v) +
    "  ⭐ FARK " + t2(y2v - o2));
  console.log("   kâr durumu SONRA: " +
    durumSonra.map((g) => g.profitStatus + "=" + g._count._all).join(" · "));

  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI. Geri alma: npm run canli:ileri-parti-onar -- --geri");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
