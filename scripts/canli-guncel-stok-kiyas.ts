/** BETIK SINIFI: TEK_SEFERLIK — 29.08 guncel stok kiyasi, salt okuma. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  GÜNCEL STOK KIYASI — HALİL'İN KESİN RAKAMLARI ↔ SİSTEM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:guncel-stok-kiyas
 *
 *  Halil: _"45 kalemde farklılık görünüyor."_
 *
 *  ⚠ ÖNCE SÜTUNLAR OKUNUR, TAHMİN EDİLMEZ. Dosyanın hangi sütunu "kesin
 *  stok", hangisi "sistemde görünen" — adına bakılır ve ekrana basılır.
 *
 *  ⚠ VE FARK ÜÇ KOVAYA AYRILIR (anayasa: "sıfır üç farklı şey olabilir"):
 *   (a) bugün düzelttiğimiz 207'nin İÇİNDE ve hâlâ farklı → DÜZELTMEM TUTMADI
 *   (b) 207'nin DIŞINDA → hiç sayım kümesine girmemişti (normal)
 *   (c) SKU sistemde bulunamadı → kıyas kurulamadı
 *  Üçü aynı kefeye konursa en güçlü kanıt en zayıfla aynı ağırlığa iner.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Downloads/güncel seliora stok (1) (1).xlsx";
const SAYIM = "C:/Users/yapra/Downloads/Stok (1).xlsx";
const metin = (h: unknown) => String(h ?? "").trim();

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const ham = readFileSync(DOSYA);
  console.log("\n" + "=".repeat(104));
  console.log("GÜNCEL STOK KIYASI — ÖLÇÜM (yazma YOK)");
  console.log("=".repeat(104));
  console.log("\n⓪ DOSYA");
  console.log("   md5 " + createHash("md5").update(ham).digest("hex"));
  const tum = await readXlsxFile(paketiNormalle(ham).bayt);
  console.log("   sayfalar: " + tum.map((x) => String(x.sheet)).join(" · "));
  /** ⚠ SAYFA ADIYLA SEÇİLİR: "SON DURUM" kıyas sayfası; ilk sayfa
   *  pazaryeri stok dökümü olabilir ve o BAŞKA bir iştir. */
  const s = tum.find((x) => /son durum|sell/i.test(String(x.sheet))) ?? tum[0];
  for (const sf of tum) {
    const b0 = sf.data[0].map((h) => metin(h)).filter((h) => h !== "");
    console.log("   · \"" + sf.sheet + "\" — " + (sf.data.length - 1) +
      " satır · sütun: " + b0.join(" | "));
  }
  const bas = s.data[0].map((h) => metin(h));
  console.log("   sayfa \"" + s.sheet + "\" · satır " + (s.data.length - 1));
  console.log("\n   SÜTUNLAR (ada bakılır, tahmin edilmez):");
  bas.forEach((h, i) => {
    if (h !== "") console.log("     " + String.fromCharCode(65 + i) + " — " + h);
  });

  const iSku = bas.findIndex((h) => /^sku$/i.test(h));
  const iFirma = bas.findIndex((h) => /firma/i.test(h));
  const iBarkod = bas.findIndex((h) => /barkod/i.test(h));
  /**
   * ⚠ TÜRKÇE BÜYÜK `İ` KÜÇÜLTMEYLE `selliora`YA DÖNMEZ — ilk denemede
   * "SELLİORA DA OLAN STOK" sütunu bu yüzden bulunamadı. Karşılaştırma
   * öncesi harfler normalleştirilir; yoksa desen sessizce ıskalar.
   */
  const kucult = (h: string) => h
    .replace(/İ/g, "i").replace(/I/g, "ı").replace(/Ş/g, "ş")
    .replace(/Ğ/g, "ğ").replace(/Ü/g, "ü").replace(/Ö/g, "ö").replace(/Ç/g, "ç")
    .toLowerCase();
  const iKesin = bas.findIndex((h) =>
    /kesin|gerçek|gercek|sayılan|sayilan|olması|olmasi|sayım stok|sayim stok/.test(kucult(h)));
  const iGorunen = bas.findIndex((h) =>
    /görünen|gorunen|selliora|mevcut|sistem/.test(kucult(h)));
  console.log("\n   SEÇİLEN SÜTUNLAR:");
  console.log("     SKU      : " + (iSku < 0 ? "⛔ YOK" : bas[iSku]));
  console.log("     Firma SKU: " + (iFirma < 0 ? "—" : bas[iFirma]));
  console.log("     Barkod   : " + (iBarkod < 0 ? "—" : bas[iBarkod]));
  console.log("     ⭐ KESİN  : " + (iKesin < 0 ? "⛔ YOK" : bas[iKesin]));
  console.log("     sistemde : " + (iGorunen < 0 ? "—" : bas[iGorunen]));
  if (iKesin < 0) {
    console.log("\n⛔ 'KESİN STOK' SÜTUNU BULUNAMADI — ölçüm YAPILMADI.");
    console.log("   (boş sonuç ile temiz sonuç ayrı şeylerdir)\n");
    await p.$disconnect();
    process.exitCode = 1;
    return;
  }

  /** ⚠ Yalnız KESİN sütunu DOLU satırlar — boş olan "sayılmadı" demektir. */
  type Sat = { anahtar: string; kesin: number; dosyaGorunen: number | null };
  const satirlar: Sat[] = [];
  let bos = 0;
  for (const r of s.data.slice(1)) {
    const a = [iSku, iFirma, iBarkod].filter((i) => i >= 0)
      .map((i) => metin(r[i])).find((x) => x !== "") ?? "";
    const k = r[iKesin];
    if (a === "") continue;
    if (k === null || k === undefined || metin(k) === "" || !Number.isFinite(Number(k))) {
      bos++; continue;
    }
    satirlar.push({
      anahtar: a, kesin: Number(k),
      dosyaGorunen: iGorunen < 0 || !Number.isFinite(Number(r[iGorunen]))
        ? null : Number(r[iGorunen]),
    });
  }
  console.log("\n① SATIRLAR");
  console.log("   kesin stok DOLU : " + satirlar.length);
  console.log("   boş / atlanan   : " + bos);

  /** ── SİSTEM TARAFI ─────────────────────────────────────────────────── */
  const anahtarlar = satirlar.map((x) => x.anahtar);
  const varyant = new Map<string, { id: string; sku: string; ad: string }>();
  for (let k = 0; k < anahtarlar.length; k += 300) {
    const d = anahtarlar.slice(k, k + 300);
    for (const v of await p.productVariant.findMany({
      where: { OR: [{ sku: { in: d } }, { companySku: { in: d } }, { barcode: { in: d } }] },
      select: { id: true, sku: true, companySku: true, barcode: true,
        product: { select: { name: true } } },
    })) {
      const kayit = { id: v.id, sku: v.sku ?? "—", ad: v.product.name ?? "" };
      for (const a of [v.sku, v.companySku, v.barcode]) if (a) varyant.set(a, kayit);
    }
  }
  const idler = [...new Set([...varyant.values()].map((x) => x.id))];
  const stok = new Map<string, number>();
  for (let k = 0; k < idler.length; k += 400) {
    for (const t of await p.stockMovement.groupBy({
      by: ["variantId"], where: { variantId: { in: idler.slice(k, k + 400) } },
      _sum: { quantityDelta: true },
    })) stok.set(t.variantId, t._sum.quantityDelta ?? 0);
  }
  /** Bugun duzeltilen 207'lik kume — farkin CINSINI ayirmak icin. */
  const sayimDosya = await readXlsxFile(paketiNormalle(readFileSync(SAYIM)).bayt);
  const sd = sayimDosya.find((x) => /sell/i.test(String(x.sheet)))!;
  const sb = sd.data[0].map((h) => metin(h));
  const sj = (a: string) => sb.indexOf(a);
  const sayilanKume = new Set<string>();
  for (const r of sd.data.slice(1)) {
    const o = r[sj("Olması gereken Stok")];
    if (o === null || o === undefined || metin(o) === "") continue;
    for (const i of [sj("SKU"), sj("Firma SKU"), sj("Barkod (EAN)")]) {
      if (i >= 0 && metin(r[i]) !== "") sayilanKume.add(metin(r[i]));
    }
  }

  type Fark = { anahtar: string; sku: string; ad: string; kesin: number;
    sistem: number; fark: number; kumede: boolean };
  const farklar: Fark[] = [];
  const tutan: string[] = [];
  const bulunamayan: string[] = [];
  for (const x of satirlar) {
    const v = varyant.get(x.anahtar);
    if (!v) { bulunamayan.push(x.anahtar); continue; }
    const sis = stok.get(v.id) ?? 0;
    if (sis === x.kesin) { tutan.push(x.anahtar); continue; }
    farklar.push({
      anahtar: x.anahtar, sku: v.sku, ad: v.ad, kesin: x.kesin,
      sistem: sis, fark: x.kesin - sis,
      kumede: sayilanKume.has(x.anahtar) || sayilanKume.has(v.sku),
    });
  }

  console.log("\n② ⭐ KIYAS");
  console.log("   TUTAN                 : " + tutan.length);
  console.log("   ⛔ FARKLI              : " + farklar.length + "   (Halil 45 dedi)");
  console.log("   ⛔ SKU BULUNAMADI      : " + bulunamayan.length);
  for (const b of bulunamayan.slice(0, 8)) console.log("     " + b);
  if (bulunamayan.length > 8) console.log("     … +" + (bulunamayan.length - 8));

  const icinde = farklar.filter((f) => f.kumede);
  const disinda = farklar.filter((f) => !f.kumede);
  console.log("\n③ FARKIN CİNSİ — ÜÇ KOVA AYRI");
  console.log("   ⛔ (a) bugün düzeltilen 207'nin İÇİNDE, hâlâ farklı : " + icinde.length);
  console.log("     ← düzeltmem TUTMADI demektir, sebebi ARANIR");
  console.log("   (b) 207'nin DIŞINDA (hiç sayılmamıştı)             : " + disinda.length);
  console.log("     ← normal, `axcali2997` gibi");
  console.log("   (c) SKU sistemde yok                               : " + bulunamayan.length);

  const yaz = (baslik: string, liste: Fark[]) => {
    if (liste.length === 0) return;
    console.log("\n   " + baslik);
    console.log("     " + "SKU".padEnd(17) + "kesin".padStart(6) + "sistem".padStart(8) +
      "fark".padStart(7) + "  ürün");
    for (const f of [...liste].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark))) {
      console.log("     " + f.sku.padEnd(17) + String(f.kesin).padStart(6) +
        String(f.sistem).padStart(8) + (f.fark > 0 ? "+" : "") + String(f.fark).padStart(6) +
        "  " + f.ad.slice(0, 34));
    }
  };
  yaz("⛔ (a) 207'NİN İÇİNDE — DÜZELTMEM TUTMADI:", icinde);
  yaz("(b) 207'NİN DIŞINDA — hiç sayılmamıştı:", disinda.slice(0, 40));
  if (disinda.length > 40) console.log("     … +" + (disinda.length - 40));

  const netFark = farklar.reduce((t, f) => t + f.fark, 0);
  console.log("\n④ TOPLAM");
  console.log("   sistem FAZLA gösteriyor : " + farklar.filter((f) => f.fark < 0).length +
    " kalem · " + farklar.filter((f) => f.fark < 0).reduce((t, f) => t + f.fark, 0) + " adet");
  console.log("   sistem AZ gösteriyor    : " + farklar.filter((f) => f.fark > 0).length +
    " kalem · +" + farklar.filter((f) => f.fark > 0).reduce((t, f) => t + f.fark, 0) + " adet");
  console.log("   ⭐ NET                   : " + (netFark > 0 ? "+" : "") + netFark + " adet");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
