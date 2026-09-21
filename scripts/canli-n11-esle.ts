import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { apiGet, baslikKur, kimlikOku } from "./n11/istemci";

/**
 * ============================================================================
 *  N11 — DEFTERDE OLMAYAN LİSTELEMELERİ EŞLE (22.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — ölçülmüş bir kümeye kilitli; yazma kapısı
 *  ortak gövdeden (`kodBaskaVaryantaAitMi`). Genel araç DEĞİLDİR.
 *
 *      npx tsx scripts/canli-n11-esle.ts             → KURU KOŞUM
 *      npx tsx scripts/canli-n11-esle.ts --uygula    → YAZAR
 *      npx tsx scripts/canli-n11-esle.ts --geri      → bu partinin açtıklarını SİLER
 *
 *  ── ÖLÇÜM (22.09.2026, canlı) ──────────────────────────────────────────
 *  N11'de 113 listeleme, defterde 51 kanal SKU kaydı → 62 listeleme defterde
 *  YOK. 62'nin kimliği (barkod + stockCode, dört rol, eşdeğerlerle):
 *      58  TEK varyanta çözülüyor  → bizim ürün, EŞLENMEMİŞ
 *       0  çakışma
 *       4  katalogda yok           → bu betiğin KAPSAMI DIŞI (ürün açılmaz)
 *  22'si N11'de şu an SATIŞTA: sipariş gelince içe aktarma kodu tanımaz.
 *
 *  ── NE YAZAR, NE YAZMAZ ────────────────────────────────────────────────
 *  YAZAR   `ChannelSku { channelAccountId: N11/AXCALI, variantId, channelSku: stockCode }`
 *  YAZMAZ  `commissionRate` (dosya yükleyicisinin kaynağı), `externalListingId`
 *          (kendi kaynağı var) — ikinci kaynak sessiz çakışma üretirdi.
 *
 *  ── KAPI: K231 ─────────────────────────────────────────────────────────
 *  Her stockCode, `kodBaskaVaryantaAitMi(stockCode, { variantId: hedef })`
 *  ile sınanır: kod BAŞKA bir varyantın kimliği/kanal koduysa AÇILMAZ ve
 *  raporlanır. Bu, ikizleri doğuran adımın ta kendisi — toplu yolda aynı
 *  kapı, aynı ölçüt.
 *
 *  ── GERİ ALMA — YENİDEN HESAPLANABİLİR ÖLÇÜT ──────────────────────────
 *  Saklanan liste DEĞİL: `channelAccountId = N11/AXCALI ∧ channelSku ∈
 *  {API'nin BUGÜN döndürdüğü stockCode'lar} ∧ createdAt ≥ parti damgası ∧
 *  listelemeDurumu = BILINMIYOR ∧ kanalOlcumAt = null`. Senkron bir kez
 *  koştuysa son iki koşul düşer ve geri alma DURUR — o satırlar artık
 *  ölçülmüş kayıttır, silinmez.
 * ============================================================================
 */

const N11_SATICI_ID = "4534966";
const PARTI = "n11-esle-20260922";

type Aday = { stockCode: string; barcode: string | null; title: string; onSale: boolean };

async function tumListelemeler(baslik: Record<string, string>): Promise<Aday[]> {
  const out: Aday[] = [];
  for (let p = 0; p < 50; p++) {
    const r = await apiGet(`/ms/product-query?page=${p}&size=100`, baslik);
    if (r.tur !== "VERI") throw new Error("N11 çekimi düştü: " + JSON.stringify(r));
    const g = r.govde as { content: Record<string, unknown>[]; totalPages: number };
    for (const x of g.content) {
      out.push({
        stockCode: String(x.stockCode ?? "").trim(),
        barcode: x.barcode === null || x.barcode === undefined ? null : String(x.barcode).trim(),
        title: String(x.title ?? ""),
        onSale: x.saleStatus === "On_Sale",
      });
    }
    if (p + 1 >= g.totalPages) break;
  }
  return out;
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const geri = process.argv.includes("--geri");

  const y = canliYapilandirma();
  if (!y.tamam) { console.log("Canlı yapılandırma okunamadı:", y.hata); process.exitCode = 1; return; }
  const k = kimlikOku();
  if (!k) { console.log("⛔ N11 kimliği okunamadı."); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { kodBaskaVaryantaAitMi, kodlaVaryantCoz } = await import("../src/lib/varyant-kod-cozumu");

  console.log("\nN11 — DEFTERDE OLMAYAN LİSTELEMELERİ EŞLE");
  console.log(`  kip  ${geri ? "GERİ ALMA" : uygula ? "⚠ YAZIM" : "KURU KOŞUM — hiçbir şey yazılmaz"}`);
  console.log("=".repeat(72));

  const hesap = await prisma.channelAccount.findFirst({
    where: { channel: { code: "N11" }, externalId: N11_SATICI_ID },
    select: { id: true, name: true },
  });
  if (!hesap) { console.log("⛔ N11 hesabı (externalId " + N11_SATICI_ID + ") yok."); process.exitCode = 1; await prisma.$disconnect(); return; }

  const listeler = await tumListelemeler(baslikKur(k));
  const defter = await prisma.channelSku.findMany({
    where: { channelAccountId: hesap.id },
    select: { channelSku: true },
  });
  const defterKodlari = new Set(defter.map((d) => d.channelSku.trim()));
  const yok = listeler.filter((l) => l.stockCode !== "" && !defterKodlari.has(l.stockCode));
  console.log(`\nN11 listeleme ${listeler.length} · defterde ${defterKodlari.size} · defterde YOK ${yok.length}`);

  /* ─────────────────────────────────────────────────────────── GERİ ── */
  if (geri) {
    const parti = process.argv.find((a) => a.startsWith("--parti="))?.slice(8);
    if (!parti) { console.log("⛔ --parti=<ISO an> gerekli (yazım çıktısındaki damga)."); process.exitCode = 1; await prisma.$disconnect(); return; }
    const apiKodlari = listeler.map((l) => l.stockCode).filter((s) => s !== "");
    const silinecek = await prisma.channelSku.findMany({
      where: {
        channelAccountId: hesap.id,
        channelSku: { in: apiKodlari },
        createdAt: { gte: new Date(parti) },
        listelemeDurumu: "BILINMIYOR",
        kanalOlcumAt: null,
      },
      select: { id: true, channelSku: true },
    });
    console.log(`geri alınacak (yeniden hesaplanan ölçüt): ${silinecek.length}`);
    if (silinecek.length === 0) { console.log("  ○ ölçüte uyan satır yok — senkron koştuysa artık ölçülmüş kayıttır, silinmez."); await prisma.$disconnect(); return; }
    await prisma.channelSku.deleteMany({ where: { id: { in: silinecek.map((s) => s.id) } } });
    await prisma.auditLog.create({ data: { action: "N11_ESLEME_GERI", targetType: "ChannelSku", targetId: hesap.id,
      detail: JSON.stringify({ parti, silinen: silinecek.length, kodlar: silinecek.map((s) => s.channelSku) }) } });
    console.log(`  ${silinecek.length} eşleştirme silindi · iz bırakıldı.`);
    await prisma.$disconnect();
    return;
  }

  /* ───────────────────────────────────────────────────── ÇÖZÜM + KAPI ── */
  const acilacak: { stockCode: string; variantId: string; sku: string; title: string; onSale: boolean }[] = [];
  const katalogdaYok: Aday[] = [];
  const cakisan: { stockCode: string; sebep: string }[] = [];
  const cokEslesme: Aday[] = [];

  for (const l of yok) {
    /** Hedef: barkod ya da stockCode ile TEK varyant. */
    const adaylar = new Set<string>();
    let adayBilgi: { id: string; sku: string } | null = null;
    for (const kod of [l.barcode, l.stockCode]) {
      if (!kod) continue;
      const c = await kodlaVaryantCoz(kod);
      if (c.durum === "TEK") { adaylar.add(c.id); adayBilgi = { id: c.id, sku: c.aday.sku }; }
      else if (c.durum === "COK") for (const a of c.adaylar) adaylar.add(a.id);
    }
    if (adaylar.size === 0) { katalogdaYok.push(l); continue; }
    if (adaylar.size > 1 || !adayBilgi) { cokEslesme.push(l); continue; }

    /** ⛔ K231 KAPISI: bu stockCode başka bir varyantın kimliği/kanal kodu mu? */
    const baskasi = await kodBaskaVaryantaAitMi(l.stockCode, { variantId: adayBilgi.id });
    if (baskasi) { cakisan.push({ stockCode: l.stockCode, sebep: `${baskasi.sku} (${baskasi.ad.slice(0, 40)})` }); continue; }

    acilacak.push({ stockCode: l.stockCode, variantId: adayBilgi.id, sku: adayBilgi.sku, title: l.title, onSale: l.onSale });
  }

  console.log(`\nAÇILACAK        ${acilacak.length}   (${acilacak.filter((a) => a.onSale).length}'i N11'de satışta)`);
  console.log(`katalogda yok   ${katalogdaYok.length}`);
  console.log(`çok eşleşme     ${cokEslesme.length}`);
  console.log(`K231 kapısı     ${cakisan.length}   (başkasının kodu — AÇILMADI)`);
  for (const c of cakisan) console.log(`   ⛔ ${c.stockCode} → sahibi ${c.sebep}`);
  for (const l of katalogdaYok) console.log(`   ○ katalogda yok  ${l.stockCode.padEnd(18)} brk=${l.barcode ?? "-"}  "${l.title.slice(0, 40)}"`);
  console.log("\n   ilk 10 açılacak:");
  for (const a of acilacak.slice(0, 10)) console.log(`   ${a.stockCode.padEnd(18)} → ${a.sku.padEnd(18)} ${a.onSale ? "SATIŞTA" : "stoksuz"}  "${a.title.slice(0, 36)}"`);

  if (!uygula) {
    console.log("\n" + "=".repeat(72));
    console.log("KURU KOŞUM BİTTİ — hiçbir şey yazılmadı.  Yazmak için: -- --uygula");
    await prisma.$disconnect();
    return;
  }

  /* ─────────────────────────────────────────────────────────── YAZIM ── */
  const damga = new Date();
  const goruntu = `veri/ozel/n11-esle-${damga.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(goruntu, JSON.stringify({ parti: PARTI, damga: damga.toISOString(), hesap: hesap.id, acilacak, katalogdaYok, cakisan }, null, 2), "utf8");
  console.log(`\nYEREL ANLIK GÖRÜNTÜ: ${goruntu}`);

  /** Satır satır, tekrar koşulabilir: zaten açılmış kod ikinci koşumda `yok` kümesine girmez. */
  let yazilan = 0;
  for (const a of acilacak) {
    await prisma.channelSku.create({
      data: { channelAccountId: hesap.id, variantId: a.variantId, channelSku: a.stockCode },
    });
    yazilan++;
  }
  await prisma.auditLog.create({ data: { action: "N11_ESLEME", targetType: "ChannelSku", targetId: hesap.id,
    detail: JSON.stringify({ parti: PARTI, damga: damga.toISOString(), yazilan, katalogdaYok: katalogdaYok.length, cakisan: cakisan.length, goruntu,
      gerekce: "62 listeleme defterde yoktu; 58'i tek varyanta cozuldu; K231 kapisindan gecerek acildi" }) } });
  console.log(`\n${yazilan} eşleştirme açıldı · iz bırakıldı.`);
  console.log(`geri almak için:  npx tsx scripts/canli-n11-esle.ts --geri --parti=${damga.toISOString()}`);
  console.log("=".repeat(72));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
