/** BETIK SINIFI: TEK_SEFERLIK — V2 ile giren satislara dosya maliyeti; parti `dosya-maliyet-v2-20260903` kilidinde, dosya md5 dogrulamali. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DOSYA MALİYETİ → K152 SATIŞLARI — `dosya-maliyet-20260828`in İKİNCİ PARTİSİ
 * ----------------------------------------------------------------------------
 *      npm run canli:dosya-maliyet-2            → KURU KOŞUM (yazmaz)
 *      npm run canli:dosya-maliyet-2 -- --yaz   → YAZAR
 *
 *  ── YETKİ ───────────────────────────────────────────────────────────────
 *  Halil 03.09.2026: _"kontrol et ve hepsini içeri al."_ K152 1889 satışı
 *  yazdı; maliyetleri NO_COST kaldı (mekanizma sahte kâr üretmiyor ama
 *  NET de yazmıyor). Bu betik maliyeti dosyanın kendi beyanından yazar.
 *
 *  ── MEKANİZMA — 28.08 PARTİSİYLE BİREBİR AYNI ──────────────────────────
 *  Kalem başına: `PURCHASE_IN` (+N, satış tarihine damgalı) ve onu tüketen
 *  `SALE_OUT` (−N, `sourceMovementId` bağlı). Net stok etkisi SIFIR —
 *  27.08 sayımı bozulmaz. Purchase/PurchaseItem BELGESİ ÜRETİLMEZ: fatura
 *  yok, sahte belge kayıt uydurmak olurdu → KDV alım tabanına GİRMEZ.
 *
 *  ── KURALLAR (28.08 partisinden devralındı) ─────────────────────────────
 *  ⛔ FIFO ÜSTÜNE YAZILMAZ — yalnız stok hareketi HİÇ olmayan kalem.
 *  ⛔ Dosyada karşılığı olmayan kalem NO_COST KALIR; uydurulmaz.
 *  ⛔ Aykırı satır yazılmaz, kovada bekler: (a) ≤ ₺5 yer tutucu şüphesi
 *     (b) maliyet ≥ satış — zararına satış iddiası, Halil bakacak.
 *
 *  ── ⭐ "BİRİM Mİ TOPLAM MI" ÖLÇÜLÜR, VARSAYILMAZ ────────────────────────
 *  `ÜRÜN ALIŞ FİYATI` kolonunun birim olduğu ve KDV DAHİL olduğu, damgası
 *  ZATEN olan kalemlerle karşılaştırılarak her koşumda ölçülür (aşağıda
 *  ③). 28.08'de aynı ölçüm 1128 kalemde ×1,000 vermişti; yeni dosya için
 *  yeniden ölçülür — dosya değişti, ölçüm miras alınmaz.
 *
 *  ── TEKRAR KOŞULABİLİRLİK / GERİ ALMA ───────────────────────────────────
 *  Kalem başına işlem; ölçüt "kalemin stok hareketi var mı" — ikinci koşum
 *  yazılmışları atlar. Geri alma: `note` içinde parti kodu geçen hareketler.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/Satislar_V2.xlsx";
const BEKLENEN_MD5 = "3872cefdd19f158404a2498c37e83f4a"; // K152 aktarmasının izindeki dosya
const PARTI = "dosya-maliyet-v2-20260903";
const YAZ = process.argv.includes("--yaz");

const metne = (h: unknown): string =>
  h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? "").trim();
const anahtarla = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[\s_-]+/g, "");
const num = (h: unknown): number => (typeof h === "number" && Number.isFinite(h) ? h : 0);
const p2 = (x: number) =>
  x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");
  const { kdvDahilKargo } = await import("../src/lib/kargo-kdv");

  const ham = readFileSync(DOSYA);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  DOSYA MALİYETİ (2. parti) · KİP: ${YAZ ? "⚠ YAZAR" : "KURU KOŞUM (yazmaz)"}`);
  console.log(`  dosya ${DOSYA.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  /** ⛔ ANAYASA (03.09.2026): izdeki dosya kimliği tutmuyorsa kıyas KURULMAZ. */
  if (md5 !== BEKLENEN_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR — bu, K152'nin aktardığı dosya değil. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  const sayfalar = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sayfalar[0];
  const bi = sayfa.data.findIndex((r) =>
    r.some((h) => anahtarla(metne(h)) === anahtarla("Sipariş Numarası")));
  const bas = sayfa.data[bi].map((h) => metne(h));
  const K = (ad: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(ad));
  const kol = { sip: K("Sipariş Numarası"), sku: K("SKU"), brk: K("AXCALI BARKOD"),
    tur: K("TÜR"), adet: K("Satış Miktarı"), alis: K("ÜRÜN ALIŞ FİYATI"),
    satis: K("ÜRÜN LİSTE FİYATI") };
  for (const [ad, i] of Object.entries(kol))
    if (i < 0) { console.log(`⛔ KOLON YOK: ${ad}`); process.exitCode = 1; return; }
  const satisTuru = (t: string) => anahtarla(t).includes("satış") || anahtarla(t).includes("satis");

  /* ── Dosya: (sipariş|kod) → birim alış; sipariş tek kalemliyse (sipariş) → alış ── */
  const kodlu = new Map<string, number>();
  const sipTek = new Map<string, number | null>(); // null = çok kalemli, tekil anahtar kullanılamaz
  for (let i = bi + 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    if (!satisTuru(metne(r[kol.tur]))) continue;
    const sip = metne(r[kol.sip]).replace(/\s+/g, "");
    if (sip === "") continue;
    const alis = num(r[kol.alis]);
    if (alis <= 0) continue;
    for (const k of [metne(r[kol.sku]), metne(r[kol.brk])])
      if (k !== "") kodlu.set(`${sip}|${k}`, alis);
    if (sipTek.has(sip)) sipTek.set(sip, null);
    else sipTek.set(sip, alis);
  }
  console.log(`\n① DOSYA — alış fiyatlı anahtar: ${kodlu.size} (kod bazlı) · ${sipTek.size} sipariş`);

  /* ── Hedef: stok hareketi HİÇ olmayan, iptal edilmemiş satış kalemleri ── */
  const hedefler = await prisma.saleItem.findMany({
    where: { stockMovements: { none: {} }, sale: { iptalTarihi: null } },
    select: {
      id: true, quantity: true, unitPriceAmount: true, commissionRate: true,
      variant: { select: { id: true, sku: true, companySku: true, barcode: true } },
      sale: { select: { id: true, code: true, soldAt: true, cargoCarrierId: true,
        cargoDesi: true, cargoAmount: true } },
    },
  });
  console.log(`② HEDEF — hareketi olmayan aktif kalem: ${hedefler.length}`);

  /* ── ③ TABAN ÖLÇÜMÜ: dosya alış ↔ FIFO damgası olan kalemler ── */
  const damgali = await prisma.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, unitCostAmount: { not: null },
      note: null },
    select: { unitCostAmount: true,
      saleItem: { select: { quantity: true,
        variant: { select: { sku: true, companySku: true, barcode: true } },
        sale: { select: { code: true } } } } },
    take: 4000,
  });
  const oranlar: number[] = [];
  for (const d of damgali) {
    if (!d.saleItem?.sale.code) continue;
    const sip = d.saleItem.sale.code.replace(/\s+/g, "");
    const kodlar = [d.saleItem.variant.sku, d.saleItem.variant.companySku,
      d.saleItem.variant.barcode ?? ""].filter((k) => k !== "");
    const dosyaAlis = kodlar.map((k) => kodlu.get(`${sip}|${k}`)).find((x) => x !== undefined)
      ?? (sipTek.get(sip) || undefined);
    if (dosyaAlis === undefined || dosyaAlis <= 0) continue;
    oranlar.push(Number(d.unitCostAmount!.toString()) / dosyaAlis);
  }
  oranlar.sort((a, b) => a - b);
  const q = (n: number) => oranlar[Math.min(oranlar.length - 1,
    Math.floor((oranlar.length * n) / 100))] ?? NaN;
  console.log(`③ TABAN ÖLÇÜMÜ — damgalı ${oranlar.length} kalemde FIFO ÷ dosya alış:`);
  console.log(`   p25 ${q(25).toFixed(3)} · p50 ${q(50).toFixed(3)} · p75 ${q(75).toFixed(3)}`);
  const birebir = oranlar.filter((o) => Math.abs(o - 1) < 0.02).length;
  console.log(`   ×1,00±0,02 bandında: ${birebir} / ${oranlar.length}` +
    ` (%${((birebir / Math.max(1, oranlar.length)) * 100).toFixed(1)})`);
  if (oranlar.length >= 30 && birebir / oranlar.length < 0.5) {
    console.log("   ⛔ TABAN TUTMUYOR — kolon birim/KDV varsayımı bu dosyada geçersiz. ÇIKILDI.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /* ── Eşleştir + kovala ── */
  type Yaz = { kalem: (typeof hedefler)[number]; birim: number };
  const yazilacak: Yaz[] = [];
  const kova = { dosyadaYok: 0, ucuz: [] as Yaz[], zarar: [] as Yaz[] };
  for (const h of hedefler) {
    const sip = (h.sale.code ?? "").replace(/\s+/g, "");
    const kodlar = [h.variant.sku, h.variant.companySku, h.variant.barcode ?? ""]
      .filter((k) => k !== "");
    const alis = kodlar.map((k) => kodlu.get(`${sip}|${k}`)).find((x) => x !== undefined)
      ?? (sipTek.get(sip) || undefined);
    if (alis === undefined || alis <= 0) { kova.dosyadaYok += 1; continue; }
    const birimSatis = Number(h.unitPriceAmount.toString());
    if (alis <= 5) { kova.ucuz.push({ kalem: h, birim: alis }); continue; }
    if (alis >= birimSatis && birimSatis > 0) { kova.zarar.push({ kalem: h, birim: alis }); continue; }
    yazilacak.push({ kalem: h, birim: alis });
  }
  const toplamMaliyet = yazilacak.reduce((a, x) => a + x.birim * x.kalem.quantity, 0);
  console.log(`\n④ KOVALAR`);
  console.log(`   ⭐ YAZILACAK                    ${yazilacak.length} kalem · ₺${p2(toplamMaliyet)}`);
  console.log(`   dosyada karşılığı yok (NO_COST) ${kova.dosyadaYok}`);
  console.log(`   ≤ ₺5 yer tutucu şüphesi (BEKLER) ${kova.ucuz.length}`);
  console.log(`   maliyet ≥ satış (BEKLER)         ${kova.zarar.length}`);
  const csv = ["kova;siparis;sku;adet;birimAlis;birimSatis"];
  for (const [ad, liste] of [["ucuz", kova.ucuz], ["zarar", kova.zarar]] as const)
    for (const x of liste)
      csv.push([ad, x.kalem.sale.code, x.kalem.variant.sku, x.kalem.quantity,
        x.birim.toFixed(2), Number(x.kalem.unitPriceAmount.toString()).toFixed(2)].join(";"));
  writeFileSync("raporlar/dosya-maliyet-2-bekleyen.csv", "\uFEFF" + csv.join("\r\n"), "utf8");
  console.log(`   bekleyen listesi: raporlar/dosya-maliyet-2-bekleyen.csv (${csv.length - 1})`);

  if (!YAZ) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --yaz\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM — kalem başına atomik çift hareket ── */
  const onceHareket = await prisma.stockMovement.count({ where: { note: { contains: PARTI } } });
  let yazilan = 0, hata = 0;
  for (const x of yazilacak) {
    try {
      await prisma.$transaction(async (tx) => {
        /** Yazım kapısı = okuma ölçütü: kalemin hareketi hâlâ yok mu. */
        const varMi = await tx.stockMovement.count({ where: { saleItemId: x.kalem.id } });
        if (varMi > 0) return;
        const parti = await tx.stockMovement.create({
          data: {
            variantId: x.kalem.variant.id, type: "PURCHASE_IN",
            quantityDelta: x.kalem.quantity, occurredAt: x.kalem.sale.soldAt,
            unitCostAmount: String(x.birim), unitCostCurrency: "TRY",
            note: PARTI + " · dosya beyanı (Satislar_V2.xlsx · ÜRÜN ALIŞ FİYATI)",
          },
        });
        await tx.stockMovement.create({
          data: {
            variantId: x.kalem.variant.id, type: "SALE_OUT",
            quantityDelta: -x.kalem.quantity, occurredAt: x.kalem.sale.soldAt,
            unitCostAmount: String(x.birim), unitCostCurrency: "TRY",
            sourceMovementId: parti.id, saleItemId: x.kalem.id,
            note: PARTI,
          },
        });
        yazilan += 1;
      }, { timeout: 20000 });
    } catch (e) {
      hata += 1;
      console.log(`   ⛔ ${x.kalem.sale.code} — ${(e as Error).message.replace(/\n/g, " ").slice(-140)}`);
    }
    if (yazilan % 250 === 0 && yazilan > 0) console.log(`   … ${yazilan}/${yazilacak.length}`);
  }
  const sonraHareket = await prisma.stockMovement.count({ where: { note: { contains: PARTI } } });
  const netDelta = await prisma.stockMovement.aggregate({
    where: { note: { contains: PARTI } }, _sum: { quantityDelta: true } });
  console.log(`\n⑤ YAZIM  kalem ${yazilan} · hata ${hata}`);
  console.log(`   parti hareketi ${onceHareket} → ${sonraHareket} (beklenen +${yazilan * 2})`);
  console.log(`   ⭐ parti NET STOK ETKİSİ: ${netDelta._sum.quantityDelta ?? 0}  (0 OLMALI)`);
  if ((netDelta._sum.quantityDelta ?? 0) !== 0 || sonraHareket - onceHareket !== yazilan * 2) {
    console.log("   ⛔ SAYIM TUTMUYOR — İNCELE, kâr tazeleme KOŞULMADI.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /* ── KÂR TAZELE — ekranın kendi gövdesiyle ── */
  const saleIds = [...new Set(yazilacak.map((x) => x.kalem.sale.id))];
  const satislar = await prisma.sale.findMany({
    where: { id: { in: saleIds } },
    select: { id: true, code: true, cargoCarrierId: true, cargoDesi: true, cargoAmount: true,
      items: { select: { id: true, commissionRate: true } } },
  });
  let tazelendi = 0, tazelenemedi = 0;
  for (const s of satislar) {
    try {
      const ok = await karYenidenYaz({
        saleId: s.id,
        kalemler: s.items.map((k) => ({
          saleItemId: k.id,
          commissionRate: k.commissionRate === null ? null : Number(k.commissionRate.toString()),
          commissionAmount: null,
        })),
        cargoCarrierId: s.cargoCarrierId,
        cargoDesi: s.cargoDesi === null ? null : Number(s.cargoDesi.toString()),
        cargoAmountManual: kdvDahilKargo(
          s.cargoAmount === null ? null : Number(s.cargoAmount.toString())),
      });
      if (ok) tazelendi += 1; else tazelenemedi += 1;
    } catch { tazelenemedi += 1; }
    if (tazelendi % 250 === 0 && tazelendi > 0) console.log(`   … kâr ${tazelendi}/${satislar.length}`);
  }
  console.log(`\n⑥ KÂR TAZELEME  tazelendi ${tazelendi} · tazelenemedi ${tazelenemedi}`);

  await prisma.auditLog.create({
    data: {
      action: "DOSYA_MALIYETI_YAZILDI",
      targetType: "StockMovement",
      targetId: PARTI,
      detail: JSON.stringify({
        parti: PARTI, dosya: DOSYA.split("/").pop(), md5,
        yazilanKalem: yazilan, hareket: yazilan * 2, hata,
        tazelenenSatis: tazelendi, tazelenemedi,
        kovalar: { dosyadaYok: kova.dosyadaYok, ucuz: kova.ucuz.length, zarar: kova.zarar.length },
        tabanOlcumu: { n: oranlar.length, birebirBandi: birebir },
        damgalama: "PURCHASE_IN occurredAt = sale.soldAt; net stok etkisi 0. Purchase BELGESI URETILMEDI (fatura yok) — KDV alim tabanina girmez.",
        geriAlma: "note alani '" + PARTI + "' tasiyan hareketler.",
        gerekce: "Halil 03.09.2026: 'hepsini iceri al' — K152 satislarina maliyet",
      }),
    },
  });
  console.log(`\n   iz: AuditLog → DOSYA_MALIYETI_YAZILDI / ${PARTI}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
