import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DOSYA MALİYETİ ASIL KABUL EDİLİRSE — ETKİ ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:dosya-maliyet-etkisi
 *
 *  ⚠ KULLANICI KARARI 28.08.2026: _"M sütunundaki alış fiyatı ASIL VERİ.
 *  Bu rakamlar KDV DAHİL ve sahih."_
 *
 *  Karar alındı; bu betik onu SINAMAZ, **kapsamını ölçer**: kaç kalem
 *  etkilenir, NET ne kadar kayar, ve hangi satırlar ölçüme göre AYKIRI
 *  görünüyor.
 *
 *  ⛔ AYKIRI DEĞER İŞARETLENİR, DIŞLANMAZ. Anayasa: _"imkânsız görünen
 *  değer önce doğrulanır — düzeltilmez."_ OneBlade vakasında ₺27,16 gerçek
 *  çıkmıştı (hediye kuponu). Burada da aykırı olan satır YANLIŞ demek
 *  değildir; yalnız BAKILMASI gereken satırdır.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const sayi = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (n: number) => n.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = s.data[5].map((h) => String(h ?? "").trim());
  const J = (ad: string) => {
    const i = bas.indexOf(ad);
    if (i < 0) throw new Error("KOLON YOK: " + ad + " — ölçüm KOŞMAZ.");
    return i;
  };
  const jSip = J("Sipariş Numarası");
  const jSku = J("SKU");
  const jBar = J("AXCALI BARKOD");
  const jUrun = J("Ürün");
  const jAlis = J("ÜRÜN ALIŞ FİYATI");
  const jListe = J("ÜRÜN LİSTE FİYATI");
  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  const varyantlar = await p.productVariant.findMany({
    select: { id: true, sku: true, barcode: true, companySku: true,
      channelSkus: { select: { channelSku: true } } },
  });
  const kodVaryant = new Map<string, string>();
  for (const v of varyantlar) {
    for (const k of [v.sku, v.barcode, v.companySku, ...v.channelSkus.map((x) => x.channelSku)]) {
      if (k && k.trim() !== "") kodVaryant.set(k.trim(), v.id);
    }
  }
  const dosyaAlis = new Map<string, { birim: number[]; liste: number }>();
  for (const r of veri) {
    const no = String(r[jSip] ?? "").trim();
    const birim = sayi(r[jAlis]);
    if (no === "" || birim <= 0) continue;
    const vid = kodVaryant.get(String(r[jSku] ?? "").trim()) ??
      kodVaryant.get(String(r[jBar] ?? "").trim());
    if (!vid) continue;
    const a = no + "|" + vid;
    const m = dosyaAlis.get(a) ?? { birim: [], liste: sayi(r[jListe]) };
    m.birim.push(birim);
    dosyaAlis.set(a, m);
  }

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, quantity: true, variantId: true, net2Amount: true, profitStatus: true,
      unitPriceAmount: true,
      sale: { select: { code: true, soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });
  const fifo = new Map<string, number>();
  for (const h of await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, unitCostAmount: { not: null } },
    select: { saleItemId: true, quantityDelta: true, unitCostAmount: true },
  })) {
    const t = Math.abs(h.quantityDelta) * Number(h.unitCostAmount!.toString());
    fifo.set(h.saleItemId!, (fifo.get(h.saleItemId!) ?? 0) + t);
  }

  console.log("\n" + "=".repeat(104));
  console.log("DOSYA MALİYETİ ASIL KABUL EDİLİRSE — ETKİ (salt okuma)");
  console.log("=".repeat(104));

  let kapsanan = 0, kapsanmayan = 0;
  let yeniToplam = 0, eskiToplam = 0;
  let yeniMaliyetli = 0;    // bugün maliyetsiz, dosyadan gelecek
  let degisen = 0;          // ikisi de var, farklı
  let ayni = 0;
  const aykiri: { sip: string; sku: string; ad: string; birim: number; liste: number; fifo: number | null }[] = [];

  for (const k of kalemler) {
    const anahtar = k.sale.code ? k.sale.code + "|" + k.variantId : null;
    const m = anahtar === null ? undefined : dosyaAlis.get(anahtar);
    const f = fifo.get(k.id) ?? null;
    if (f !== null) eskiToplam += f;
    if (m === undefined || new Set(m.birim).size > 1) { kapsanmayan++; continue; }
    kapsanan++;
    const yeni = m.birim[0] * k.quantity;
    yeniToplam += yeni;
    if (f === null) yeniMaliyetli++;
    else if (Math.abs(yeni - f) < 0.005) ayni++;
    else degisen++;

    /**
     * ⛔ AYKIRI ÖLÇÜTÜ — VERİDEN, uydurma eşikten DEĞİL:
     *  · maliyet ≥ satış fiyatı  → o satış zararına satılmış olurdu
     *  · maliyet ≤ ₺5            → yer tutucu şüphesi (₺1,00 gibi)
     * İkisi de HÜKÜM değil, BAKILACAK satır işareti.
     */
    const birim = m.birim[0];
    const satisBirim = Number(k.unitPriceAmount.toString());
    if (birim <= 5 || (satisBirim > 0 && birim >= satisBirim)) {
      aykiri.push({ sip: k.sale.code ?? "—", sku: k.variant.sku,
        ad: k.variant.product.name, birim, liste: satisBirim, fifo: f });
    }
  }

  console.log("\n① KAPSAM");
  console.log("   iptalsiz kalem            : " + kalemler.length);
  console.log("   dosyada karşılığı OLAN    : " + kapsanan +
    "  (" + ((kapsanan / kalemler.length) * 100).toFixed(1) + "%)");
  console.log("   karşılığı YOK / belirsiz  : " + kapsanmayan);

  console.log("\n② MALİYET TOPLAMI");
  console.log("   BUGÜN (FIFO damgaları)    : " + t2(eskiToplam));
  console.log("   DOSYADAN (kapsanan küme)  : " + t2(yeniToplam));
  console.log("\n   bugün maliyetsiz → dosyadan gelecek : " + yeniMaliyetli + " kalem");
  console.log("   ikisi de var, AYNI                  : " + ayni + " kalem");
  console.log("   ikisi de var, FARKLI                : " + degisen + " kalem");

  console.log("\n③ ⚠ AYKIRI SATIRLAR — işaretlendi, DIŞLANMADI");
  console.log("   ölçüt: birim maliyet ≥ satış fiyatı  YA DA  ≤ ₺5");
  console.log("   " + aykiri.length + " kalem");
  console.log("\n   sipariş         maliyet      satış     FIFO   SKU / ürün");
  console.log("   " + "─".repeat(92));
  for (const x of aykiri.sort((a, b) => a.birim - b.birim).slice(0, 20)) {
    console.log("   " + x.sip.padEnd(14) + x.birim.toFixed(2).padStart(11) +
      x.liste.toFixed(2).padStart(11) +
      (x.fifo === null ? "        —" : x.fifo.toFixed(2).padStart(9)) +
      "   " + x.sku.padEnd(18) + x.ad.slice(0, 26));
  }
  if (aykiri.length > 20) console.log("   … ve " + (aykiri.length - 20) + " kalem daha");
  console.log("\n   ⛔ BUNLAR YANLIŞ DEMEK DEĞİL. OneBlade vakasında ₺27,16 GERÇEK");
  console.log("     çıkmıştı (hediye kuponu). Bakılması gereken satırlar bunlar;");
  console.log("     kullanıcı doğrularsa aynen kalır.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
