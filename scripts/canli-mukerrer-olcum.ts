/** BETIK SINIFI: TEK_SEFERLIK — mukerrer cift olcumu, SALT OKUMA. */
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MÜKERRER ÇİFT — BİRLEŞTİRME ÖNCESİ ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:mukerrer-olcum
 *
 *  Halil: _"İkisi aynı ürün. 14 stok `OYU-LG-598P-01`de toplansın; `axcali2601`
 *  sıfırlanıp pasife alınsın."_
 *
 *  ⚠ AMA YAZMADAN ÖNCE ÜÇ SORU — hepsi ölçülür, hiçbiri varsayılmaz:
 *   ① 43'ün bileşimi ne — nereden geldi?
 *   ② 43 + 14 = 57 → hedef 14 demek TOPLAM −43 demek. Bu doğru mu, yoksa
 *     43'ün bir kısmı GERÇEK mi? (Satışı girilmemiş mal varsa defter
 *     raftakinden YÜKSEK olmalı ve bu bir hata değildir.)
 *   ③ Kanal SKU · barkod · pasife alma — kaynak birleştirme ne gerektiriyor?
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const A = "OYU-LG-598P-01";
const B = "axcali2601";
const DOSYA = "C:/Users/yapra/Downloads/güncel seliora stok (1) (1).xlsx";
const ESKI = "C:/Users/yapra/Downloads/Stok (1).xlsx";
const m = (h: unknown) => String(h ?? "").trim();
const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("MÜKERRER ÇİFT — BİRLEŞTİRME ÖNCESİ ÖLÇÜM");
  console.log("=".repeat(100));

  const va = await p.productVariant.findFirst({ where: { sku: A },
    select: { id: true, sku: true, barcode: true, companySku: true, isActive: true } });
  const vb = await p.productVariant.findFirst({ where: { sku: B },
    select: { id: true, sku: true, barcode: true, companySku: true, isActive: true } });
  if (!va || !vb) { console.log("\n⛔ VARYANT YOK\n"); await p.$disconnect(); return; }

  // ── ① 43'ÜN BİLEŞİMİ ──────────────────────────────────────────────────
  const hh = await p.stockMovement.findMany({
    where: { variantId: va.id },
    select: { type: true, quantityDelta: true, occurredAt: true, createdAt: true,
      note: true, unitCostAmount: true,
      saleItem: { select: { sale: { select: { code: true } } } },
      purchaseItem: { select: { purchase: { select: { code: true } } } } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] });
  console.log("\n① " + A + " — 43'ÜN BİLEŞİMİ (" + hh.length + " hareket)");
  const kova = new Map<string, { n: number; adet: number }>();
  for (const h of hh) {
    const k = h.note?.includes("eksik-alim-20260829") ? "③ eksik-alım onarımı"
      : h.note?.includes("sayim-fiziksel-20260829") ? "④ sayım düzeltmesi"
      : h.note?.includes("dosya-maliyet") ? "dosya-maliyet"
      : h.purchaseItem ? "GERÇEK ALIM"
      : h.saleItem ? "SATIŞ"
      : h.type;
    const v = kova.get(k) ?? { n: 0, adet: 0 };
    v.n++; v.adet += h.quantityDelta; kova.set(k, v);
  }
  for (const [k, v] of [...kova].sort((a, b) => b[1].adet - a[1].adet)) {
    console.log("   " + k.padEnd(24) + String(v.n).padStart(3) + " hareket · net " +
      (v.adet > 0 ? "+" : "") + v.adet);
  }
  console.log("   ⭐ TOPLAM " + hh.reduce((t, x) => t + x.quantityDelta, 0));

  // ── ② 43 GERÇEK Mİ — SATIŞI GİRİLMEMİŞ MAL VAR MI ────────────────────
  console.log("\n② ⭐ 43'ÜN NE KADARI GERÇEK — 'satışı girilmemiş mal' testi");
  const alim = hh.filter((x) => x.purchaseItem).reduce((t, x) => t + x.quantityDelta, 0);
  const satis = -hh.filter((x) => x.saleItem).reduce((t, x) => t + x.quantityDelta, 0);
  const onarim = hh.filter((x) => x.note?.includes("eksik-alim-20260829"))
    .reduce((t, x) => t + x.quantityDelta, 0);
  console.log("   gerçek ALIM toplamı   : +" + alim);
  console.log("   gerçek SATIŞ toplamı  : −" + satis);
  console.log("   onarımın kattığı      : +" + onarim);
  console.log("   ⭐ alım − satış        : " + (alim - satis) +
    "   ← defterin 'olması gereken'i, onarım hariç");
  console.log("\n   ⚠ HALİL RAFTA 14 SAYDI. Defter " + (alim - satis) + " diyor.");
  console.log("     Aradaki " + (alim - satis - 14) + " adet iki şeyden biri:");
  console.log("       (a) satışı HENÜZ GİRİLMEMİŞ mal → defter haklı, sayım eksik");
  console.log("       (b) mal gerçekten yok → sayım haklı, defter fazla");
  console.log("   ⛔ VERİDEN AYIRT EDİLEMEZ — Halil'in cevabı gerekir.");
  const sonSatis = hh.filter((x) => x.saleItem).slice(-3);
  console.log("\n   son üç satış hareketi:");
  for (const x of sonSatis) {
    console.log("     " + x.occurredAt.toISOString().slice(0, 10) +
      " · " + x.saleItem!.sale.code + " · " + x.quantityDelta);
  }

  // ── ③ axcali2601'İN +14'Ü ─────────────────────────────────────────────
  const hb = await p.stockMovement.findMany({
    where: { variantId: vb.id },
    select: { type: true, quantityDelta: true, note: true, createdAt: true } });
  console.log("\n③ " + B + " — " + hb.length + " hareket");
  for (const x of hb) {
    console.log("   " + x.type.padEnd(18) + String(x.quantityDelta).padStart(4) +
      " · " + x.createdAt.toISOString().slice(5, 16).replace("T", " ") +
      "  " + (x.note ?? "").slice(0, 40));
  }
  console.log("\n   ⭐ GERİ ALMA MI, TERS KAYIT MI — İZ AÇISINDAN");
  console.log("     · GERİ ALMA (sayım turunu geri al): o hareketi SİLER ve");
  console.log("       defterde hiç olmamış gibi olur. AMA aynı turda yazılan");
  console.log("       180 hareket de silinir — orantısız.");
  console.log("     ⭐ · TERS KAYIT (−14): sayım kaydı YERİNDE kalır, üstüne");
  console.log("       'mükerrer kayıt birleştirildi' diyen ikinci kayıt gelir.");
  console.log("       Altı ay sonra 'bu 14 nereden geldi, niye gitti' sorusunun");
  console.log("       cevabı DEFTERDE durur. Ledger disiplini de bunu söyler:");
  console.log("       'hareket silinmez, ters işaretli ikinci hareketle kapanır'.");
  console.log("     ⛔ ÖNERİ: TERS KAYIT.");

  // ── ④ KAYNAK BİRLEŞTİRME ──────────────────────────────────────────────
  console.log("\n④ KAYNAK BİRLEŞTİRME");
  console.log("   " + A + " · barkod " + (va.barcode ?? "—") +
    " · firmaSku " + (va.companySku ?? "—") + " · aktif " + va.isActive);
  console.log("   " + B + " · barkod " + (vb.barcode ?? "—") +
    " · firmaSku " + (vb.companySku ?? "—") + " · aktif " + vb.isActive);
  const ka = await p.channelSku.findMany({ where: { variantId: va.id },
    select: { channelSku: true, channelAccount: { select: { name: true,
      channel: { select: { name: true } } } } } });
  const kb = await p.channelSku.findMany({ where: { variantId: vb.id },
    select: { channelSku: true, channelAccount: { select: { name: true,
      channel: { select: { name: true } } } } } });
  console.log("\n   KANAL SKU");
  for (const [ad, liste] of [[A, ka], [B, kb]] as const) {
    console.log("     " + ad + " — " + liste.length);
    for (const x of liste) console.log("       " + x.channelSku + " · " +
      (x.channelAccount?.channel.name ?? "—") + " / " + (x.channelAccount?.name ?? "—"));
  }
  /** ⚠ ÇAKIŞMA: aynı kanal hesabında aynı kod iki varyantta olamaz. */
  const cakisan = ka.filter((x) => kb.some((y) => y.channelSku === x.channelSku));
  console.log("   ⭐ AYNI KOD İKİSİNDE DE VAR MI: " +
    (cakisan.length === 0 ? "HAYIR ✓ taşıma çakışmaz" : "⛔ " + cakisan.length));
  const barkodCakisma = await p.productVariant.count({
    where: { barcode: vb.barcode ?? "___yok___", NOT: { id: vb.id } } });
  console.log("   " + (vb.barcode ?? "—") + " barkodunu taşıyan BAŞKA varyant: " +
    barkodCakisma + (barkodCakisma === 0 ? "   ✓" : "   ⛔"));
  console.log("\n   ⚠ BARKOD TEK ALANDIR — `ProductVariant.barcode` tekil.");
  console.log("     İkinci barkodu 'ikinci barkod' olarak eklemenin YERİ YOK;");
  console.log("     eklenecekse şema kalemi olur. Bugün: " + B + " PASİF kalır");
  console.log("     ve barkodu ONUN ÜSTÜNDE durur — okutulduğunda pasif kayıt");
  console.log("     bulunur, bu da bir bilgidir (yanlış kayda düşmez).");
  console.log("\n   PASİFE ALMA ALANI: `ProductVariant.isActive` (bugün " +
    vb.isActive + ")");
  console.log("     Ekranlarda: `uyari/topla` ve stok listeleri `isActive` süzüyor.");

  // ── ⑤ SAYIM DOSYASINDA KAÇ SATIR ─────────────────────────────────────
  console.log("\n⑤ SAYIM DOSYALARINDA BU ÜRÜN");
  for (const [ad, yol, sut] of [
    ["ESKİ", ESKI, "Olması gereken Stok"],
    ["YENİ", DOSYA, "27.08.2026 Sayım Stok"]] as const) {
    const tum = await readXlsxFile(paketiNormalle(readFileSync(yol)).bayt);
    const sh = tum.find((x) => /sell|son durum/i.test(String(x.sheet))) ?? tum[0];
    const b = sh.data[0].map(m); const i = (a: string) => b.indexOf(a);
    const rows = sh.data.slice(1).filter((r) =>
      /43217|Up.*House|Yukarı Bak/i.test(m(r[i("Ürün adı")])) ||
      [A, B].includes(m(r[i("SKU")])));
    console.log("\n   " + ad + " — " + rows.length + " satır");
    for (const r of rows) {
      console.log("     SKU " + m(r[i("SKU")]).padEnd(17) +
        " barkod " + m(r[i("Barkod (EAN)")]).padEnd(15) +
        " sayım " + (m(r[i(sut)]) || "⛔ BOŞ").padStart(5) +
        "  " + m(r[i("Ürün adı")]).slice(0, 30));
    }
  }
  console.log("\n   ⭐ EŞLEŞME NASIL AYRIŞTI: sayım betiği SKU ile eşleştiriyor;");
  console.log("     iki satırın SKU'su FARKLI olduğu için iki AYRI varyanta");
  console.log("     düştüler. Barkodlar da farklı — sistem bunları hiçbir");
  console.log("     aşamada 'aynı ürün' olarak görmedi.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
