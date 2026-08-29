/** BETIK SINIFI: TEK_SEFERLIK — 29.08 eksik alim onarimi, `eksik-alim-20260829` partisine kilitli. */
/**
 * SAYIM KORUMASI YOK: kapi henuz baglanmadi (K84). Bu betik SAYIM
 * DUZELTMESINDEN ONCE kosar ve sayim ondan SONRA yeniden hesaplanir;
 * sira geregi sayimi ezmesi imkansiz.
 */
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  EKSİK ALIM ONARIMI — ÖLÇÜT DÜZELTİLDİ
 * ----------------------------------------------------------------------------
 *      npm run canli:eksik-alim-onar            → KURU KOŞUM
 *      npm run canli:eksik-alim-onar -- --yaz   → yazar
 *      npm run canli:eksik-alim-onar -- --geri  → geri alır
 *
 *  ⛔ ÖNCEKİ ÖLÇÜT YANLIŞTI VE GERİ ALINDI (29.08.2026, Halil bildirdi).
 *  `canli-ileri-parti-onar` şu varsayımla çalışıyordu:
 *
 *      "partisi çıkıştan SONRA tarihli  ⇒  o satışın alımı defterde YOK"
 *
 *  ⚠ YANLIŞ. Alım çoğu zaman defterde VARDIR, yalnız daha GEÇ tarihle
 *  girilmiştir. Her ileri bağ için yeni parti açmak AYNI MALI İKİ KEZ saydı:
 *  22 varyantta 70 adet fazladan eklendi ve `axcali2997` ekranda 20 göründü.
 *
 *  ⚠ VE DOĞRULAMAM YANLIŞ ŞEYİ DOĞRULUYORDU: "net stok +809, beklenen +809 ✓"
 *  dedim. Aritmetik doğruydu, ÖNCÜL yanlıştı. _(Anayasa: kendi öncülünü
 *  doğrulayan kontrol hiçbir şey doğrulamaz.)_
 *
 *  ── ✅ YENİ ÖLÇÜT — ADET, BAĞ DEĞİL ─────────────────────────────────────
 *  Varyantın GERÇEK alım toplamı, toplam çıkışını karşılıyor mu? Karşılamıyorsa
 *  eksik ADET kadar parti açılır — her ileri bağ için değil.
 *
 *  ⭐ VE PARTİ, EKSİĞİN İLK DOĞDUĞU ÇIKIŞIN TARİHİNE açılır: hareketler
 *  kronolojik yürütülür, karşılanamayan ilk çıkış nerede çıkarsa parti oraya
 *  damgalanır. Böylece FIFO sırası bozulmaz ve tarih uydurulmaz.
 *
 *  ⛔ MALİYET UYDURULMAZ: satış dosyasının M sütunundan; yoksa NO_COST.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const PARTI = "eksik-alim-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(14);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");

  console.log("\n" + "=".repeat(104));
  console.log("EKSİK ALIM ONARIMI — " +
    (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM (yazmaz)"));
  console.log("=".repeat(104));

  if (GERI) {
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: PARTI } }, select: { id: true } });
    console.log("\n   bu onarımın açtığı parti: " + hh.length);
    if (hh.length === 0) {
      console.log("   ⛔ GERİ ALINACAK KAYIT YOK.\n");
      await p.$disconnect();
      return;
    }
    /** ⚠ Bu partilerden tüketim yapılmışsa `Restrict` engeller — ölç, varsayma. */
    const tuketim = await p.stockMovement.count({
      where: { sourceMovementId: { in: hh.map((x) => x.id) } } });
    if (tuketim > 0) {
      console.log("   ⛔ " + tuketim + " tüketim bu partilere bağlı — SİLİNEMEZ.\n");
      await p.$disconnect();
      process.exitCode = 1;
      return;
    }
    await p.stockMovement.deleteMany({ where: { id: { in: hh.map((x) => x.id) } } });
    console.log("   ⭐ silinen parti: " + hh.length + "\n");
    await p.$disconnect();
    return;
  }

  /** ── DOSYADAN MALİYET ─────────────────────────────────────────────── */
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => bas.indexOf(a);
  const dosyaMaliyet = new Map<string, number>();
  for (const r of ss.data.slice(6)) {
    if (String(r[j("TÜR")] ?? "").trim() !== "satış") continue;
    const kod = String(r[j("Sipariş Numarası")] ?? "").trim();
    const m = n(r[j("ÜRÜN ALIŞ FİYATI")]);
    if (kod === "" || m <= 0) continue;
    if (!dosyaMaliyet.has(kod)) dosyaMaliyet.set(kod, m);
  }

  /** ── ⭐ YENİ ÖLÇÜT: VARYANT BAŞINA ADET AÇIĞI ──────────────────────── */
  const toplamlar = await p.stockMovement.groupBy({
    by: ["variantId"], _sum: { quantityDelta: true } });
  const adaylar = toplamlar.filter((t) => (t._sum.quantityDelta ?? 0) < 0);

  console.log("\n① ÖLÇÜT — 'ADET AÇIĞI', 'İLERİ BAĞ' DEĞİL");
  console.log("   hareketi olan varyant            : " + toplamlar.length);
  console.log("   ⭐ NET STOĞU NEGATİF olan varyant : " + adaylar.length);
  console.log("     (gerçek alım toplamı çıkışı karşılamıyor — eksik alım BURADA)");

  type Plan = { variantId: string; sku: string; ad: string; adet: number;
    an: Date; maliyet: number | null; kod: string };
  const plan: Plan[] = [];

  for (const a of adaylar) {
    const hh = await p.stockMovement.findMany({
      where: { variantId: a.variantId },
      select: { quantityDelta: true, occurredAt: true, createdAt: true,
        saleItem: { select: { sale: { select: { code: true } } } } },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });
    /**
     * ⭐ KRONOLOJİK YÜRÜYÜŞ: eksik ilk NEREDE doğuyorsa parti oraya damgalanır.
     * Böylece tarih uydurulmaz ve FIFO sırası bozulmaz.
     */
    let elde = 0;
    let acikAdet = 0;
    let ilkAcikAn: Date | null = null;
    let ilkAcikKod = "";
    for (const h of hh) {
      elde += h.quantityDelta;
      if (elde < 0) {
        if (ilkAcikAn === null) {
          ilkAcikAn = h.occurredAt;
          ilkAcikKod = h.saleItem?.sale.code ?? "";
        }
        acikAdet += -elde;
        elde = 0;
      }
    }
    if (acikAdet === 0 || ilkAcikAn === null) continue;
    const v = await p.productVariant.findUnique({
      where: { id: a.variantId },
      select: { sku: true, product: { select: { name: true } } } });
    plan.push({
      variantId: a.variantId, sku: v?.sku ?? "—",
      ad: v?.product.name ?? "", adet: acikAdet, an: ilkAcikAn,
      maliyet: dosyaMaliyet.get(ilkAcikKod) ?? null, kod: ilkAcikKod,
    });
  }

  const maliyetli = plan.filter((x) => x.maliyet !== null);
  const maliyetsiz = plan.filter((x) => x.maliyet === null);
  const toplamAdet = plan.reduce((t, x) => t + x.adet, 0);

  console.log("\n② PLAN — VARYANT BAŞINA TEK PARTİ");
  console.log("   ⭐ açılacak parti (varyant)  : " + plan.length);
  console.log("   ⭐ toplam eksik ADET         : " + toplamAdet);
  console.log("   maliyeti dosyadan gelen     : " + maliyetli.length +
    " · toplam " + t2(maliyetli.reduce((t, x) => t + x.adet * (x.maliyet ?? 0), 0)));
  console.log("   ⛔ maliyeti YOK → NO_COST    : " + maliyetsiz.length);

  console.log("\n③ ESKİ ÖLÇÜTLE KIYAS — DÜZELME ÖLÇÜLDÜ");
  console.log("   eski ölçüt (ileri bağ başına) : 810 parti · 810 adet · 182 varyant");
  console.log("   ⭐ YENİ ölçüt (adet açığı)     : " + plan.length + " parti · " +
    toplamAdet + " adet · " + plan.length + " varyant");
  console.log("   ⭐ FARK                        : " + (810 - toplamAdet) + " adet AZ");
  console.log("     (eski ölçüt bu kadar malı İKİ KEZ saymıştı)");

  console.log("\n④ EN BÜYÜK ON AÇIK");
  for (const x of [...plan].sort((a, b) => b.adet - a.adet).slice(0, 10)) {
    console.log("   " + x.sku.padEnd(16) + "eksik " + String(x.adet).padStart(3) +
      " · " + x.an.toISOString().slice(0, 10) +
      " · maliyet " + (x.maliyet === null ? "⛔ YOK" : x.maliyet.toFixed(2)) +
      "  " + x.ad.slice(0, 32));
  }
  const oyu = plan.find((x) => x.sku === "OYUNEN88141740");
  console.log("\n   ⭐ axcali2997 (OYUNEN88141740): " +
    (oyu ? "eksik " + oyu.adet + " adet · " + oyu.an.toISOString().slice(0, 10) : "AÇIK YOK"));

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("Yazmak için:  npm run canli:eksik-alim-onar -- --yaz");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect();
    return;
  }

  const once = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  console.log("\n⚠ YAZILIYOR — " + plan.length + " parti");
  let ok = 0;
  for (const x of plan) {
    await p.stockMovement.create({
      data: {
        variantId: x.variantId, type: "PURCHASE_IN", quantityDelta: x.adet,
        occurredAt: x.an,
        unitCostAmount: x.maliyet === null ? null : String(x.maliyet),
        unitCostCurrency: x.maliyet === null ? null : "TRY",
        note: PARTI + " · alimi defterde olmayan " + x.adet + " adet. Olcut: " +
          "varyantin gercek alim toplami cikisini karsilamiyor. Parti, acigin " +
          "ILK DOGDUGU cikisin tarihine damgalandi." +
          (x.maliyet === null ? " MALIYET DOSYADA YOK (NO_COST)." : ""),
      },
    });
    ok++;
  }
  const sonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const fark = (sonra._sum.quantityDelta ?? 0) - (once._sum.quantityDelta ?? 0);
  console.log("   ⭐ yazılan parti: " + ok);
  console.log("   net stok farkı: " + fark + "   (beklenen +" + toplamAdet + ")" +
    (fark === toplamAdet ? "   ✓" : "   ⛔"));

  await p.auditLog.create({
    data: {
      action: "EKSIK_ALIM_ONARILDI",
      targetType: "StockMovement",
      detail: JSON.stringify({
        parti: PARTI,
        gerekce: "canli-ileri-parti-onar'in olcutu YANLISTI ve geri alindi. Eski: 'partisi cikistan sonra tarihli'. Yeni: 'varyantin gercek alim toplami cikisini karsilamiyor'. Halil bildirdi 29.08.2026 (axcali2997 ekranda 20 gorunuyordu).",
        eskiOlcut: { parti: 810, adet: 810, varyant: 182 },
        yeniOlcut: { parti: plan.length, adet: toplamAdet, varyant: plan.length },
        maliyetDosyadan: maliyetli.length,
        noCost: maliyetsiz.length,
        geriAlmaOlcutu: "note icinde '" + PARTI + "' gecen hareketler. Komut: npm run canli:eksik-alim-onar -- --geri",
      }),
    },
  });
  console.log("   ✓ AuditLog: EKSIK_ALIM_ONARILDI");
  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI. Geri alma: npm run canli:eksik-alim-onar -- --geri");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
