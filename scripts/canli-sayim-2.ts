/** BETIK SINIFI: TEK_SEFERLIK — 29.08 ikinci sayim turu, `sayim-2-20260829` koduna kilitli. */
/** SAYIM KORUMASI YOK: bu betik SAYIMIN KENDISI — korunacak damgayi o yaziyor. */
import { readFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { paketiNormalle } from "../src/lib/tablo/paket";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SAYIM 2. TUR — GÜNCEL DOSYA ESAS
 * ----------------------------------------------------------------------------
 *      npm run canli:sayim-2            → KURU KOŞUM
 *      npm run canli:sayim-2 -- --yaz   → yazar
 *      npm run canli:sayim-2 -- --geri  → geri alır
 *
 *  Halil'in güncel dosyası (`27.08.2026 Sayım Stok`) **1102 satırın
 *  tamamında** dolu. Dosyanın kendi `SELLİORA DA OLAN STOK` sütunu sistemle
 *  1101/1102 aynı — yani dosya ANLIK, kıyas aynı ana denk geliyor.
 *
 *  ⭐ BEŞ KALEMDE RAKAM DEĞİŞTİ ve Halil "yeni rakam geçerli" dedi:
 *  `axcali1630` 2→3 · `axcali2177` 9→7 · `axcali2686` 3→4 ·
 *  `axcali2723` 7→6 · `KUC-PH-10000-01` 1→2.
 *
 *  ── ⭐ MÜKERRER ÇİFT — AYRI KURAL, ÖLÇÜMLE DOĞRULANDI ───────────────────
 *  `OYU-LG-598P-01` ve `axcali2601` AYNI fiziksel ürün, iki kayıt (barkodlar
 *  farklı: `…866932` ↔ `…424842`). Sayım dosyasında İKİ SATIR var; sayan kişi
 *  raftaki tek yığını `axcali2601`e yazmış (14), ötekine 0.
 *
 *  ⚠ AMA GEÇMİŞ ÖTEKİNDE: `OYU-LG-598P-01` 23 alım · 6 satış · 39 hareket ·
 *  2 kanal SKU taşıyor; `axcali2601`in TEK hareketi bugün benim yazdığım
 *  sayım düzeltmesi. _(Halil kararı: 14 stok geçmişi olan kayıtta toplanır.)_
 *
 *      OYU-LG-598P-01 : 43 → 14      (dosyadaki 0 KULLANILMAZ)
 *      axcali2601     : 14 →  0  + PASİFE alınır
 *
 *  ⛔ SİLME YOK — VE GEREKÇESİ İLKE DEĞİL, VERİ: `StockMovement.variantId`
 *  `Restrict`; hareketi olan varyant silinemez. Silinebilseydi 39 hareket
 *  sahipsiz kalır, 6 satışın maliyet bağı kopardı.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/güncel seliora stok (1) (1).xlsx";
const KOD = "sayim-2-20260829";
const YAZ = process.argv.includes("--yaz");
const GERI = process.argv.includes("--geri");

/** ⭐ MÜKERRER ÇİFT — dosyanın rakamı DEĞİL, Halil'in kararı geçerli. */
const CIFT = { tutan: "OYU-LG-598P-01", hedef: 14, bosaltilan: "axcali2601" };

const metin = (h: unknown) => String(h ?? "").trim();
const t2 = (x: number) => x.toFixed(2).padStart(13);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) { console.log("\n⛔ CANLI ADRES OKUNAMADI\n"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(c.veri.ham);
  const { prisma: p } = await import("../src/lib/prisma");
  const { acikPartiler, fifoDagit, gunSonu } = await import("../src/lib/stok");

  console.log("\n" + "=".repeat(104));
  console.log("SAYIM 2. TUR — " + (GERI ? "⚠ GERİ ALMA" : YAZ ? "⚠ YAZIM" : "KURU KOŞUM"));
  console.log("=".repeat(104));

  if (GERI) {
    const hh = await p.stockMovement.findMany({
      where: { note: { contains: KOD } }, select: { id: true, quantityDelta: true } });
    console.log("\n   bu turun yazdığı hareket: " + hh.length);
    if (hh.length === 0) { console.log("   ⛔ GERİ ALINACAK KAYIT YOK.\n");
      await p.$disconnect(); return; }
    const cikis = hh.filter((x) => x.quantityDelta < 0).map((x) => x.id);
    const giris = hh.filter((x) => x.quantityDelta > 0).map((x) => x.id);
    await p.stockMovement.deleteMany({ where: { id: { in: cikis } } });
    await p.stockMovement.deleteMany({ where: { id: { in: giris } } });
    /** ⚠ Pasife alma da geri alınır — yoksa yarım bir geri dönüş kalır. */
    const v = await p.productVariant.findFirst({
      where: { sku: CIFT.bosaltilan }, select: { id: true } });
    if (v) await p.productVariant.update({
      where: { id: v.id }, data: { isActive: true } });
    console.log("   ⭐ silinen: çıkış " + cikis.length + " · giriş " + giris.length);
    console.log("   ⭐ " + CIFT.bosaltilan + " yeniden AKTİF\n");
    await p.$disconnect(); return;
  }

  const s = (await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt))[0];
  const bas = s.data[0].map((h) => metin(h));
  const i = (a: string) => bas.indexOf(a);
  const iSayim = i("27.08.2026 Sayım Stok");
  const rows = s.data.slice(1).filter((r) => metin(r[i("SKU")]) !== "");

  /** ── SİSTEM TARAFI ─────────────────────────────────────────────────── */
  const skular = rows.map((r) => metin(r[i("SKU")]));
  const vh = new Map<string, { id: string; sku: string; ad: string }>();
  for (let k = 0; k < skular.length; k += 300) {
    for (const v of await p.productVariant.findMany({
      where: { sku: { in: skular.slice(k, k + 300) } },
      select: { id: true, sku: true, product: { select: { name: true } } },
    })) if (v.sku) vh.set(v.sku, { id: v.id, sku: v.sku, ad: v.product.name ?? "" });
  }
  const idler = [...vh.values()].map((x) => x.id);
  const stok = new Map<string, number>();
  for (let k = 0; k < idler.length; k += 400) {
    for (const t of await p.stockMovement.groupBy({
      by: ["variantId"], where: { variantId: { in: idler.slice(k, k + 400) } },
      _sum: { quantityDelta: true },
    })) stok.set(t.variantId, t._sum.quantityDelta ?? 0);
  }

  type Sat = { sku: string; id: string; ad: string; hedef: number;
    sistem: number; fark: number; cift: boolean };
  const plan: Sat[] = [];
  for (const r of rows) {
    const sku = metin(r[i("SKU")]);
    const v = vh.get(sku);
    if (!v) continue;
    const sistem = stok.get(v.id) ?? 0;
    /** ⭐ ÇİFTİN İKİ UCU DOSYADAN DEĞİL, KARARDAN GELİR. */
    const hedef = sku === CIFT.tutan ? CIFT.hedef
      : sku === CIFT.bosaltilan ? 0
      : Number(r[iSayim] ?? 0);
    if (!Number.isFinite(hedef) || hedef === sistem) continue;
    plan.push({ sku, id: v.id, ad: v.ad, hedef, sistem, fark: hedef - sistem,
      cift: sku === CIFT.tutan || sku === CIFT.bosaltilan });
  }

  const normal = plan.filter((x) => !x.cift);
  const cift = plan.filter((x) => x.cift);
  console.log("\n① KAPSAM");
  console.log("   dosya satırı " + rows.length + " · sistemde bulunan " + vh.size);
  console.log("   ⭐ DÜZELTİLECEK          : " + plan.length);
  console.log("     normal kalem          : " + normal.length);
  console.log("     mükerrer çift         : " + cift.length);
  console.log("   sistem FAZLA " + plan.filter((x) => x.fark < 0).length +
    " (" + plan.filter((x) => x.fark < 0).reduce((t, x) => t + x.fark, 0) + " adet)" +
    " · sistem AZ " + plan.filter((x) => x.fark > 0).length +
    " (+" + plan.filter((x) => x.fark > 0).reduce((t, x) => t + x.fark, 0) + ")");
  console.log("   ⭐ NET " + plan.reduce((t, x) => t + x.fark, 0) + " adet");

  /** ── MALİYET KAYNAĞI ──────────────────────────────────────────────── */
  const an = new Date(); an.setUTCHours(0, 0, 0, 0);
  let artiFifo = 0, artiNoCost = 0, artiDeger = 0, eksiDeger = 0, eksiYetersiz = 0;
  const noCostListe: string[] = [];
  const yetersizListe: string[] = [];
  for (const x of plan) {
    if (x.fark > 0) {
      const parti = await p.stockMovement.findFirst({
        where: { variantId: x.id, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
        orderBy: [{ occurredAt: "desc" }], select: { unitCostAmount: true } });
      if (parti) { artiFifo++; artiDeger += x.fark * Number(parti.unitCostAmount!.toString()); }
      else { artiNoCost++; noCostListe.push(x.sku + " +" + x.fark); }
    } else {
      const d = fifoDagit(await acikPartiler(p, x.id, gunSonu(an)), Math.abs(x.fark));
      if (!d.yeterliMi) { eksiYetersiz++; yetersizListe.push(x.sku + " " + x.fark); continue; }
      for (const y of d.dagitim) eksiDeger += y.adet * Number(y.parti.birimMaliyet ?? 0);
    }
  }
  console.log("\n② MALİYET KAYNAĞI");
  console.log("   ARTI · FIFO'da parti VAR : " + artiFifo + " · değer " + t2(artiDeger));
  console.log("   ⛔ ARTI · parti YOK → NO_COST : " + artiNoCost +
    (noCostListe.length ? "   " + noCostListe.join(" · ") : ""));
  console.log("   EKSİ · düşülecek maliyet : " + t2(eksiDeger));
  console.log("   ⛔ EKSİ · FIFO YETMEYEN   : " + eksiYetersiz +
    (yetersizListe.length ? "   " + yetersizListe.join(" · ") : ""));
  console.log("   ⭐ ENVANTER DEĞERİ NET    : " + t2(artiDeger - eksiDeger));

  console.log("\n③ ⭐ MÜKERRER ÇİFT — dosyanın rakamı DEĞİL, Halil'in kararı");
  for (const x of cift) {
    console.log("   " + x.sku.padEnd(17) + "sistem " + String(x.sistem).padStart(3) +
      " → hedef " + String(x.hedef).padStart(3) + "   fark " +
      (x.fark > 0 ? "+" : "") + x.fark +
      (x.sku === CIFT.bosaltilan ? "   + PASİFE ALINACAK" : ""));
  }
  console.log("   ⚠ Dosya `" + CIFT.tutan + "` için 0 diyor; KULLANILMIYOR —");
  console.log("     sayan kişi raftaki tek yığını ötekine yazmış.");

  console.log("\n④ NORMAL KALEMLER (" + normal.length + ")");
  console.log("   " + "SKU".padEnd(17) + "sistem".padStart(7) + "hedef".padStart(7) +
    "fark".padStart(7) + "  ürün");
  for (const x of [...normal].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark))) {
    console.log("   " + x.sku.padEnd(17) + String(x.sistem).padStart(7) +
      String(x.hedef).padStart(7) + (x.fark > 0 ? "+" : "") + String(x.fark).padStart(6) +
      "  " + x.ad.slice(0, 32));
  }

  console.log("\n⑤ GERİ ALMA — DETERMİNİSTİK");
  console.log("   `note` içinde \"" + KOD + "\" · pasife alma da geri alınır.");
  console.log("   npm run canli:sayim-2 -- --geri");

  if (!YAZ) {
    console.log("\n" + "=".repeat(104));
    console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("=".repeat(104) + "\n");
    await p.$disconnect(); return;
  }

  const zaten = await p.stockMovement.count({ where: { note: { contains: KOD } } });
  if (zaten > 0) {
    console.log("\n⭐ BU TUR ZATEN YAZILMIŞ — " + zaten + " hareket. Yeni yazım: 0\n");
    await p.$disconnect(); return;
  }
  const once = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  console.log("\n⚠ YAZILIYOR — " + plan.length + " varyant");
  let hareket = 0;
  for (const x of plan) {
    const not = KOD + " · Halil sayimi (guncel dosya). Defter " + x.sistem +
      ", sayilan " + x.hedef + "." +
      (x.cift ? " MUKERRER CIFT: ayni fiziksel urun iki kayitta; 14 stok gecmisi " +
        "olan kayitta toplandi (Halil karari)." : "");
    if (x.fark > 0) {
      const parti = await p.stockMovement.findFirst({
        where: { variantId: x.id, quantityDelta: { gt: 0 }, unitCostAmount: { not: null } },
        orderBy: [{ occurredAt: "desc" }],
        select: { unitCostAmount: true, unitCostCurrency: true } });
      const mal = parti === null ? null : Number(parti.unitCostAmount!.toString());
      await p.stockMovement.create({ data: {
        variantId: x.id, type: "COUNT_CORRECTION", quantityDelta: x.fark, occurredAt: an,
        unitCostAmount: mal === null ? null : String(mal),
        unitCostCurrency: mal === null ? null : (parti!.unitCostCurrency ?? "TRY"),
        note: not + (mal === null ? " MALIYET BILINMIYOR (NO_COST)." : ""),
      } });
      hareket++;
    } else {
      const d = fifoDagit(await acikPartiler(p, x.id, gunSonu(an)), Math.abs(x.fark));
      if (!d.yeterliMi) { console.log("   ⛔ " + x.sku + " FIFO yetmedi, YAZILMADI"); continue; }
      for (const y of d.dagitim) {
        await p.stockMovement.create({ data: {
          variantId: x.id, type: "COUNT_CORRECTION", quantityDelta: -y.adet, occurredAt: an,
          sourceMovementId: y.parti.hareketId,
          unitCostAmount: y.parti.birimMaliyet === null ? null : String(y.parti.birimMaliyet),
          unitCostCurrency: y.parti.birimMaliyet === null ? null : "TRY",
          note: not,
        } });
        hareket++;
      }
    }
  }
  /** ⭐ PASİFE ALMA — silme DEĞİL; iz kalır, geçmiş okunur. */
  const bos = await p.productVariant.findFirst({
    where: { sku: CIFT.bosaltilan }, select: { id: true } });
  if (bos) await p.productVariant.update({
    where: { id: bos.id }, data: { isActive: false } });
  console.log("   ⭐ yazılan hareket: " + hareket);
  console.log("   ⭐ " + CIFT.bosaltilan + " PASİFE alındı (silinmedi — iz kalır)");

  const sonra = await p.stockMovement.aggregate({ _sum: { quantityDelta: true } });
  const fark = (sonra._sum.quantityDelta ?? 0) - (once._sum.quantityDelta ?? 0);
  const bek = plan.reduce((t, x) => t + x.fark, 0);
  console.log("\n   DOĞRULAMA: net stok farkı " + fark + "   (beklenen " + bek + ")" +
    (fark === bek ? "   ✓" : "   ⛔"));

  await p.auditLog.create({ data: {
    action: "SAYIM_2_TUR", targetType: "StockMovement",
    detail: JSON.stringify({
      kod: KOD, dosya: DOSYA, duzeltilen: plan.length, hareket, netFark: fark,
      besKalem: "Halil 'yeni rakam gecerli' dedi: axcali1630 2→3 · axcali2177 9→7 · axcali2686 3→4 · axcali2723 7→6 · KUC-PH-10000-01 1→2",
      mukerrerCift: CIFT,
      mukerrerGerekce: "Ayni fiziksel urun iki kayitta (barkodlar farkli). Sayim dosyasinda IKI SATIR; sayan kisi raftaki tek yigini axcali2601'e yazmis. Gecmis (23 alim, 6 satis, 39 hareket) OYU-LG-598P-01'de. Halil karari: 14 stok gecmisi olan kayitta toplanir, oteki 0 + PASIF.",
      silmeYok: "StockMovement.variantId Restrict; hareketi olan varyant silinemez. Silinebilseydi 39 hareket sahipsiz kalir, 6 satisin maliyet bagi kopardi.",
      envanterDegeri: { arti: artiDeger.toFixed(2), eksi: eksiDeger.toFixed(2) },
      noCost: noCostListe, fifoYetersiz: yetersizListe,
      geriAlmaOlcutu: "note icinde '" + KOD + "' gecen hareketler + pasife alma geri alinir. Komut: npm run canli:sayim-2 -- --geri",
    }),
  } });
  console.log("   ✓ AuditLog: SAYIM_2_TUR");
  console.log("\n" + "=".repeat(104));
  console.log("YAZILDI. Geri alma: npm run canli:sayim-2 -- --geri");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
