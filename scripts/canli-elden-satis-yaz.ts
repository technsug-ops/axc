/** BETIK SINIFI: TEK_SEFERLIK — V2'deki DEPO (elden) satislarini yazar; V2 md5 kilidi, tekrar kosum zararsiz. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ELDEN SATIŞ YAZIMI — V2'NİN DEPO SATIRLARI (9 SATIŞ)
 * ----------------------------------------------------------------------------
 *      npm run canli:elden-satis-yaz             → KURU KOŞUM
 *      npm run canli:elden-satis-yaz -- --uygula → YAZAR
 *
 *  ── YETKİ — İKİ HALİL BEYANI (03.09.2026) ───────────────────────────────
 *  ① _"Elden satışlarda KDV işlemez."_ → `SaleItem.vatRate = 0` snapshot
 *    (anayasa: satış anında çözülen oran kayda yazılır). Stopaj da yok —
 *    Elden Satış kanalının kesinti kuralı kümesi BOŞ (ölçüldü).
 *  ② V2 baz mandası: "stok hariç bütün düzeltmeleri bu verilere göre yap."
 *
 *  ── NİYE AKTARMA MOTORU DEĞİL ───────────────────────────────────────────
 *  Aktarmanın DEPO kapısı (adim2Bekliyor) İKİ gerekçeyle kapalıydı ve
 *  İKİSİ DE BURADA ÇÖZÜLÜYOR:
 *  · sipariş numarası kolonu BARKOD taşıyor → `Sale.code = null` yazılır
 *    (barkodu numara diye yazmak hem yanlış hem @unique çakışması);
 *    kapının kendi notu: "bunu ayrı bir akış yazmalı".
 *  · KDV/stopaj sorusu cevapsızdı → Halil cevapladı (①).
 *  Satış create ŞEKLİ aktarmadan birebir kopya; kâr ekranın motoruyla.
 *
 *  ── STOK YAZILMAZ ───────────────────────────────────────────────────────
 *  Bu satışlar geçmiş; stok gerçeğini 27.08 sayımı kapattı. Maliyet,
 *  dosya-maliyet deseniyle (satış tarihli PURCHASE_IN + SALE_OUT çifti,
 *  net stok 0) J kolonundan yazılır — kod null olduğu için genel
 *  dosya-maliyet betiği bu satışları göremezdi, çift burada kurulur.
 *
 *  ── TEKRAR KOŞULABİLİRLİK — KİMLİKSİZ SATIŞTA ÖLÇÜT ─────────────────────
 *  `code` yok; ölçüt: Elden hesabında AYNI GÜN + AYNI VARYANT + AYNI
 *  BİRİM FİYAT satış var mı → varsa atlanır. (Aynı gün aynı üründen iki
 *  elden satış bu ölçütte tek görünürdü — dosyada yok, ölçüldü.)
 * ============================================================================
 */

const V2 = "C:/Users/yapra/Downloads/Satislar_V2.xlsx";
const V2_MD5 = "3872cefdd19f158404a2498c37e83f4a";
const PARTI = "elden-v2-20260903";
const UYGULA = process.argv.includes("--uygula");

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

  const ham = readFileSync(V2);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("=".repeat(96));
  console.log(`  ELDEN SATIŞ YAZIMI · KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`);
  console.log(`  dosya ${V2.split("/").pop()} · md5 ${md5}`);
  console.log("=".repeat(96));
  if (md5 !== V2_MD5) {
    console.log("\n⛔ MD5 TUTMUYOR. ÇIKILDI.\n");
    process.exitCode = 1;
    return;
  }

  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { name: { contains: "Elden" } } },
    select: { id: true, name: true, channel: { select: { fees: { select: { id: true } } } } },
  });
  if (!hesap) { console.log("⛔ Elden Satış hesabı yok."); process.exitCode = 1; return; }
  if (hesap.channel.fees.length !== 0) {
    console.log("⛔ Elden kanalında kesinti kuralı DOĞMUŞ — betik o kuralları bilmiyor. ÇIKILDI.");
    process.exitCode = 1;
    return;
  }

  const varyantlar = await prisma.productVariant.findMany({
    select: { id: true, sku: true, companySku: true, barcode: true,
      channelSkus: { select: { channelSku: true } } } });
  const kodVar = new Map<string, string>();
  for (const v of varyantlar) {
    if (v.barcode) kodVar.set(v.barcode, v.id);
    kodVar.set(v.companySku, v.id);
    kodVar.set(v.sku, v.id);
    for (const k of v.channelSkus) kodVar.set(k.channelSku, v.id);
  }

  const sf = await readXlsxFile(paketiNormalle(ham).bayt);
  const sayfa = sf[0];
  const bas = sayfa.data[0].map((h) => metne(h));
  const K = (a: string) => bas.findIndex((h) => anahtarla(h) === anahtarla(a));
  const kol = { sip: K("Sipariş Numarası"), sku: K("SKU"), brk: K("AXCALI BARKOD"),
    pzr: K("PAZAR YERI"), urun: K("Ürün"), tur: K("TÜR"), adet: K("Satış Miktarı"),
    tarih: K("Tarih"), fiyat: K("ÜRÜN LİSTE FİYATI"), alis: K("ÜRÜN ALIŞ FİYATI") };
  const satisTuru = (t: string) => anahtarla(t).includes("satış") || anahtarla(t).includes("satis");

  type Satir = { no: number; variantId: string | null; kodlar: string[]; urun: string;
    adet: number; fiyat: number; alis: number; tarih: Date | null };
  const satirlar: Satir[] = [];
  for (let i = 1; i < sayfa.data.length; i += 1) {
    const r = sayfa.data[i];
    if (metne(r[kol.pzr]).toUpperCase() !== "DEPO") continue;
    if (!satisTuru(metne(r[kol.tur]))) continue;
    /** A kolonu elden satışta BARKOD taşıyor — o da eşleştirme adayı. */
    const kodlar = [metne(r[kol.sku]), metne(r[kol.brk]), metne(r[kol.sip])]
      .filter((k) => k !== "");
    const variantId = kodlar.map((k) => kodVar.get(k)).find((x) => x !== undefined) ?? null;
    const hamTarih = r[kol.tarih];
    satirlar.push({ no: i + 1, variantId, kodlar, urun: metne(r[kol.urun]),
      adet: num(r[kol.adet]) || 1, fiyat: num(r[kol.fiyat]), alis: num(r[kol.alis]),
      tarih: hamTarih instanceof Date ? hamTarih : null });
  }
  console.log(`\n① DEPO satış satırı: ${satirlar.length}`);
  for (const s of satirlar)
    console.log(`   r${String(s.no).padStart(5)} ${s.tarih ? s.tarih.toISOString().slice(0, 10) : "TARİH?"}` +
      ` x${s.adet} ₺${p2(s.fiyat).padStart(10)} alış ₺${p2(s.alis).padStart(10)}` +
      ` ${s.variantId ? "✓" : "⛔ VARYANT YOK"} ${s.urun.slice(0, 34)}`);
  const yazilabilir = satirlar.filter((s) => s.variantId && s.tarih && s.fiyat > 0);
  console.log(`\n   yazılabilir: ${yazilabilir.length} · ciro ₺${p2(yazilabilir.reduce((a, x) => a + x.fiyat * x.adet, 0))}`);
  if (yazilabilir.length !== satirlar.length)
    console.log("   ⛔ yazılamayanlar yukarıda işaretli — Halil'e sorulacak.");

  if (!UYGULA) {
    console.log("\n  KURU KOŞUM — hiçbir şey yazılmadı. Yazmak için: -- --uygula\n");
    await prisma.$disconnect();
    return;
  }

  let yazilan = 0, atlanan = 0, hata = 0;
  for (const s of yazilabilir) {
    try {
      const gunBasi = new Date(s.tarih!.toISOString().slice(0, 10) + "T00:00:00.000Z");
      const gunSonu = new Date(gunBasi.getTime() + 86_399_999);
      /** Yazım kapısı: aynı gün + varyant + birim fiyat elden satış var mı. */
      const varMi = await prisma.sale.findFirst({
        where: { channelAccountId: hesap.id,
          soldAt: { gte: gunBasi, lte: gunSonu },
          items: { some: { variantId: s.variantId!, unitPriceAmount: String(s.fiyat) } } },
        select: { id: true } });
      if (varMi) { atlanan += 1; continue; }
      const satis = await prisma.sale.create({
        data: {
          code: null,               // elden satışın sipariş numarası YOKTUR (kapı notu)
          channelAccountId: hesap.id,
          soldAt: gunBasi,
          importBatch: PARTI,
          importKaynak: "satis-excel-elden",
          items: { create: [{
            variantId: s.variantId!,
            quantity: s.adet,
            unitPriceAmount: String(s.fiyat),
            unitPriceCurrency: "TRY",
            commissionRate: "0",   // komisyonsuz kanal
            /** ⭐ HALİL BEYANI: elden satışta KDV İŞLEMEZ → snapshot 0. */
            vatRate: "0",
          }] },
        },
        select: { id: true, items: { select: { id: true } } },
      });
      /* maliyet çifti — dosya-maliyet deseni, net stok 0 */
      if (s.alis > 0) {
        await prisma.$transaction(async (tx) => {
          const parti = await tx.stockMovement.create({
            data: { variantId: s.variantId!, type: "PURCHASE_IN",
              quantityDelta: s.adet, occurredAt: gunBasi,
              unitCostAmount: String(s.alis), unitCostCurrency: "TRY",
              note: PARTI + " · dosya beyanı (Satislar_V2 · ÜRÜN ALIŞ FİYATI)" } });
          await tx.stockMovement.create({
            data: { variantId: s.variantId!, type: "SALE_OUT",
              quantityDelta: -s.adet, occurredAt: gunBasi,
              unitCostAmount: String(s.alis), unitCostCurrency: "TRY",
              sourceMovementId: parti.id, saleItemId: satis.items[0].id,
              note: PARTI } });
        });
      }
      const ok = await karYenidenYaz({
        saleId: satis.id,
        kalemler: [{ saleItemId: satis.items[0].id, commissionRate: 0, commissionAmount: null }],
        cargoCarrierId: null, cargoDesi: null, cargoAmountManual: null,
      });
      if (!ok) { hata += 1; continue; }
      yazilan += 1;
    } catch (e) {
      hata += 1;
      console.log(`   ⛔ r${s.no} — ${(e as Error).message.replace(/\n/g, " ").slice(-150)}`);
    }
  }
  const netKontrol = await prisma.stockMovement.aggregate({
    where: { note: { contains: PARTI } }, _sum: { quantityDelta: true } });
  console.log(`\n② YAZIM  yazılan ${yazilan} · atlanan ${atlanan} · hata ${hata}`);
  console.log(`   parti NET STOK ETKİSİ: ${netKontrol._sum.quantityDelta ?? 0} (0 OLMALI)`);
  if ((netKontrol._sum.quantityDelta ?? 0) !== 0) process.exitCode = 1;
  await prisma.auditLog.create({
    data: {
      action: "ELDEN_SATIS_YAZILDI",
      targetType: "Sale",
      targetId: PARTI,
      detail: JSON.stringify({
        dosya: V2.split("/").pop(), md5, yazilan, atlanan, hata,
        beyan: "Halil 03.09.2026: elden satista KDV ISLEMEZ (vatRate=0 snapshot); stopaj yok (kanal kural kumesi bos, olculdu); siparis numarasi yok → code null",
        maliyet: "dosya-maliyet deseni (satis tarihli cift, net stok 0), J kolonundan",
        geriAlmaOlcutu: "importBatch=" + PARTI + " satislari + note'unda parti gecen hareketler",
      }),
    },
  });
  console.log(`   iz: AuditLog → ELDEN_SATIS_YAZILDI / ${PARTI}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
