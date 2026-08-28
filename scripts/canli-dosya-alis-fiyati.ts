import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SATIŞ DOSYASINDAKİ `ÜRÜN ALIŞ FİYATI` — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:dosya-alis
 *
 *  ⚠ Kullanıcı bildirdi 28.08.2026: dosyada `ÜRÜN ALIŞ FİYATI` sütunu
 *  neredeyse tamamen dolu ve biz onu içe aktarmadık. İçe aktarmadaki
 *  _"hesap sütunları yazılmaz"_ kararı kâr/ROI/KDV için doğruydu; ama
 *  ALIŞ FİYATI bir hesap SONUCU değil, kullanıcının KAYDI — komisyon
 *  oranında bugün aynı hatayı yapıp düzeltmiştik.
 *
 *  ⛔ AMA "DOLU" DEMEK "DOĞRU" DEMEK DEĞİL. Bu betik üç ayrı şey ölçer:
 *    ① kapsam — bağsız satışların kaçında dolu, kaç TL
 *    ② ÇAPRAZ — FIFO maliyeti OLAN satışlarda dosya ile defter ne kadar
 *      ayrışıyor (hangisinin güvenilir olduğunu SINAR)
 *    ③ KDV — dosyanın rakamı KDV dahil mi (komisyonda tam bu tuzak vardı)
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
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
  const jAdet = J("Satış Miktarı");
  const jAlis = J("ÜRÜN ALIŞ FİYATI");
  const veri = s.data.slice(6).filter((r) => String(r[jUrun] ?? "").trim() !== "");

  console.log("\n" + "=".repeat(104));
  console.log("SATIŞ DOSYASI `ÜRÜN ALIŞ FİYATI` — ÖLÇÜM (salt okuma)");
  console.log("=".repeat(104));
  const dolu = veri.filter((r) => sayi(r[jAlis]) > 0);
  console.log("\n   dosya satırı " + veri.length + "   ·   alış fiyatı DOLU " + dolu.length +
    "  (" + ((dolu.length / veri.length) * 100).toFixed(2) + "%)");

  /** Kimlik indeksi — (sipariş no + varyant) anahtarı. */
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
  const dosyaAlis = new Map<string, number[]>();
  for (const r of veri) {
    const no = String(r[jSip] ?? "").trim();
    const birim = sayi(r[jAlis]);
    if (no === "" || birim <= 0) continue;
    const vid = kodVaryant.get(String(r[jSku] ?? "").trim()) ??
      kodVaryant.get(String(r[jBar] ?? "").trim());
    if (!vid) continue;
    const a = no + "|" + vid;
    dosyaAlis.set(a, [...(dosyaAlis.get(a) ?? []), birim]);
  }

  const kalemler = await p.saleItem.findMany({
    where: { sale: { iptalTarihi: null } },
    select: { id: true, quantity: true, variantId: true,
      sale: { select: { code: true, soldAt: true } },
      variant: { select: { sku: true, product: { select: { name: true } } } } },
  });
  /** FIFO maliyeti — `SALE_OUT` damgalarından. */
  const fifo = new Map<string, number>();
  for (const h of await p.stockMovement.findMany({
    where: { type: "SALE_OUT", saleItemId: { not: null }, unitCostAmount: { not: null } },
    select: { saleItemId: true, quantityDelta: true, unitCostAmount: true },
  })) {
    const t = Math.abs(h.quantityDelta) * Number(h.unitCostAmount!.toString());
    fifo.set(h.saleItemId!, (fifo.get(h.saleItemId!) ?? 0) + t);
  }

  const dosyadan = (k: (typeof kalemler)[number]): number | null => {
    if (!k.sale.code) return null;
    const l = dosyaAlis.get(k.sale.code + "|" + k.variantId);
    if (!l || l.length === 0) return null;
    /** ⚠ Aynı anahtarda farklı fiyat varsa BELİRSİZ — kullanılmaz. */
    if (new Set(l).size > 1) return null;
    return l[0] * k.quantity;
  };

  // ── ① KAPSAM ───────────────────────────────────────────────────────────
  const bagsiz = kalemler.filter((k) => !fifo.has(k.id));
  let kurtarilan = 0;
  let kurtarilanKalem = 0;
  const kurtarilamayan: string[] = [];
  for (const k of bagsiz) {
    const d = dosyadan(k);
    if (d === null) { if (kurtarilamayan.length < 10) kurtarilamayan.push((k.sale.code ?? "—") + " " + k.variant.sku); continue; }
    kurtarilanKalem++;
    kurtarilan += d;
  }
  console.log("\n① KAPSAM — bağsız kalemlerde dosya ne kadarını kapatır");
  console.log("   bağsız kalem                 : " + bagsiz.length);
  console.log("   ⭐ dosyada alış fiyatı BULUNAN: " + kurtarilanKalem +
    "  (" + ((kurtarilanKalem / bagsiz.length) * 100).toFixed(1) + "%)");
  console.log("   kurtarılabilecek MALİYET     : " + t2(kurtarilan) + " TL");
  console.log("   bulunamayan                  : " + (bagsiz.length - kurtarilanKalem));
  for (const x of kurtarilamayan) console.log("     · " + x);

  // ── ② ÇAPRAZ — DOSYA ↔ FIFO ────────────────────────────────────────────
  /**
   * ⛔ ASIL SINAV BU. Maliyeti ZATEN OLAN kalemlerde iki kaynak yan yana
   * konur. Büyük sapma varsa dosyanın rakamı güvenilmez demektir ve ①'deki
   * rakamın hiçbir kıymeti kalmaz.
   */
  type Kars = { sku: string; ad: string; siparis: string; fifo: number; dosya: number; oran: number };
  const kars: Kars[] = [];
  for (const k of kalemler) {
    const f = fifo.get(k.id);
    if (f === undefined || f <= 0) continue;
    const d = dosyadan(k);
    if (d === null || d <= 0) continue;
    kars.push({ sku: k.variant.sku, ad: k.variant.product.name,
      siparis: k.sale.code ?? "—", fifo: f, dosya: d, oran: d / f });
  }
  console.log("\n② ÇAPRAZ — FIFO maliyeti OLAN kalemlerde dosya ne diyor");
  console.log("   karşılaştırılabilir kalem: " + kars.length);
  if (kars.length > 0) {
    const sapma = kars.map((x) => Math.abs(x.oran - 1) * 100).sort((a, b) => a - b);
    const y = (q: number) => sapma[Math.floor(sapma.length * q)];
    console.log("   |sapma| %: min " + sapma[0].toFixed(2) + " · ortanca " + y(0.5).toFixed(2) +
      " · p90 " + y(0.9).toFixed(2) + " · max " + sapma[sapma.length - 1].toFixed(2));
    const birebir = kars.filter((x) => Math.abs(x.oran - 1) < 0.005).length;
    console.log("   ⭐ BİREBİR AYNI (±%0,5): " + birebir + " / " + kars.length +
      "  (" + ((birebir / kars.length) * 100).toFixed(1) + "%)");
  }

  // ── ③ KDV — oran kovaları ──────────────────────────────────────────────
  /**
   * ⚠ KOMİSYONDA TAM BU TUZAK VARDI: kolon KDV dahil miydi hariç miydi
   * diye SORULMADAN kullanılsaydı KDV iki kez uygulanırdı.
   */
  console.log("\n③ ⭐ KDV — dosya/FIFO oranı hangi kovada");
  const kovalar = new Map<string, number>();
  for (const x of kars) {
    const kova =
      Math.abs(x.oran - 1) <= 0.005 ? "×1,00  (aynı taban)"
      : Math.abs(x.oran - 1.2) <= 0.005 ? "×1,20  (dosya KDV DAHİL)"
      : Math.abs(x.oran - 1 / 1.2) <= 0.005 ? "×0,833 (dosya KDV HARİÇ)"
      : "başka";
    kovalar.set(kova, (kovalar.get(kova) ?? 0) + 1);
  }
  for (const [k, n] of [...kovalar].sort((a, b) => b[1] - a[1])) {
    console.log("     " + String(n).padStart(6) + "  " + k);
  }

  console.log("\n   ÖRNEK 20 SATIR");
  console.log("   sipariş         FIFO        dosya    oran   SKU / ürün");
  console.log("   " + "─".repeat(92));
  for (const x of [...kars].sort((a, b) => Math.abs(b.oran - 1) - Math.abs(a.oran - 1)).slice(0, 20)) {
    console.log("   " + x.siparis.padEnd(14) + x.fifo.toFixed(2).padStart(11) +
      x.dosya.toFixed(2).padStart(13) + x.oran.toFixed(3).padStart(8) +
      "   " + x.sku.padEnd(18) + x.ad.slice(0, 26));
  }

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
