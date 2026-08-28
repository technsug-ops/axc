import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  DOSYA MALİYETİ → FIFO BOŞ KALEMLERE — KURU KOŞUM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:dosya-maliyet-kuru
 *
 *  ═══ KULLANICI KARARLARI 28.08.2026 ═══
 *
 *  ⛔ ① FIFO ÜSTÜNE YAZILMAZ. Dosya maliyeti YALNIZ FIFO'nun BOŞ olduğu
 *  kalemlere yazılır; damgası olan kaleme DOKUNULMAZ.
 *    _"FIFO damgası gerçek partiden, gerçek alım kaydından geldi —
 *     ÖLÇÜLMÜŞ. Dosya elle tutulmuş BEYAN ve o dosyada üç hata bulundu
 *     (tarih, mağaza adı, sipariş no yerine barkod). Ölçülmüş gerçek,
 *     ölçülmemiş beyanla değiştirilmez."_
 *  ⚠ Çelişen kalemler AYRI kovada RAPORLANIR ve şerhli kalır — "iki
 *  kaynak ayrışıyor" bir BULGUDUR, sessizce kapatılmaz.
 *
 *  ⛔ ② AYKIRI SATIRLAR YAZILMAZ, ayrı kovada bekler (kullanıcı bakacak).
 *  İki alt sınıf AYRI listelenir — farklı sorunlar:
 *      (a) maliyet ≤ ₺5      → yer tutucu şüphesi
 *      (b) maliyet ≥ satış   → zararına satış iddiası
 *
 *  ⛔ ③ Dosyada karşılığı olmayan kalem `NO_COST` KALIR. Uydurulmaz.
 *
 *  ═══ KDV — ÖLÇÜLDÜ, VARSAYILMADI ═══
 *  Defterdeki `unitCostAmount` KDV DAHİLDİR: `lib/envanter.ts` ondan
 *  `kdvHaric()` alarak "mal bedeli" üretiyor. Dosya ile defter **1128
 *  kalemde BİREBİR** tutuyor (oran ×1,000) — yani dosya da KDV DAHİL.
 *  ⚠ Komisyonda tam bu tuzağa düşülmüştü; orada kolon KDV DAHİLDİ ve
 *  ×1,20 kovası bunu ele vermişti. Burada o kova neredeyse boş (2 kalem).
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const DOSYA = "C:/Users/yapra/Desktop/excel/satis.xlsx";

/**
 * ⭐ DOĞRULANMIŞ AYKIRI DEĞERLER — kural KALKMAZ, İSTİSNA BEYAN EDİLİR.
 *
 * Kullanıcı 28.08.2026, sorulunca doğruladı:
 *   _"bu ürünle promosyon geldi ve sattım, ondan dolayı maliyetlerini
 *    1 lira yazdım."_
 *
 * ⛔ ANAYASA GEREĞİ BÖYLE YAZILIYOR: _"aykırılık bir HÜKÜM değil, bir
 * DAVETTİR. Sıra şudur: işaretle → baktır → doğrula → (gerçekse)
 * işaretini kaldır ve YAŞAT."_ OneBlade vakasında ₺27,16 aynı şekilde
 * gerçek çıkmıştı (hediye kuponu) ve "düzeltilseydi" doğru bir kayıt
 * bozulacaktı.
 *
 * ⚠ VE ÖLÇÜT SİLİNMİYOR: `≤ ₺5` kuralı yerinde duruyor. Yarın doğan yeni
 * bir ucuz satır yine işaretlenecek ve yine SORULACAK. Beyan edilmemiş
 * hiçbir aykırı değer sessizce geçmez.
 * _(Anayasa: "sonsuza kadar yanan uyarı olmaz" — her şüphelinin bir
 * DOĞRULANDI yolu olmak zorundadır.)_
 */
const DOGRULANMIS_UCUZ = new Map<string, string>([
  ["10030751247", "promosyonla geldi — kullanıcı 28.08.2026 (⚠ satış sistemde YOK)"],
  ["10415881283", "promosyonla geldi — kullanıcı 28.08.2026 (⚠ FIFO damgası ₺849, çelişki ②'de)"],
  ["10415963548", "promosyonla geldi — kullanıcı 28.08.2026"],
  ["10415994329", "promosyonla geldi — kullanıcı 28.08.2026"],
  ["10416041845", "promosyonla geldi — kullanıcı 28.08.2026"],
]);
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
    select: { id: true, quantity: true, variantId: true, unitPriceAmount: true,
      sale: { select: { id: true, code: true, soldAt: true } },
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

  type Sat = (typeof kalemler)[number];
  const yazilacak: { k: Sat; birim: number }[] = [];
  const aykiriUcuz: { k: Sat; birim: number }[] = [];
  const aykiriPahali: { k: Sat; birim: number }[] = [];
  const karsiliksiz: Sat[] = [];
  const celisen: { k: Sat; birim: number; fifo: number }[] = [];
  let dokunulmayanAyni = 0;

  for (const k of kalemler) {
    const anahtar = k.sale.code ? k.sale.code + "|" + k.variantId : null;
    const l = anahtar === null ? undefined : dosyaAlis.get(anahtar);
    const birim = l && new Set(l).size === 1 ? l[0] : null;
    const f = fifo.get(k.id) ?? null;

    /** ⛔ ① FIFO DOLUYSA DOKUNULMAZ — çelişse bile. */
    if (f !== null) {
      if (birim === null) { dokunulmayanAyni++; continue; }
      const yeni = birim * k.quantity;
      if (Math.abs(yeni - f) < 0.005) dokunulmayanAyni++;
      else celisen.push({ k, birim, fifo: f });
      continue;
    }
    if (birim === null) { karsiliksiz.push(k); continue; }

    /** ⛔ ② AYKIRI — iki alt sınıf AYRI. */
    const satisBirim = Number(k.unitPriceAmount.toString());
    /** ⭐ DOĞRULANMIŞSA aykırı sayılmaz — işaret kalkar, rakam YAŞAR. */
    if (birim <= 5 && !DOGRULANMIS_UCUZ.has(k.sale.code ?? "")) {
      aykiriUcuz.push({ k, birim });
      continue;
    }
    if (satisBirim > 0 && birim >= satisBirim) { aykiriPahali.push({ k, birim }); continue; }
    yazilacak.push({ k, birim });
  }

  const tut = (l: { k: Sat; birim: number }[]) =>
    l.reduce((t, x) => t + x.birim * x.k.quantity, 0);

  console.log("\n" + "=".repeat(104));
  console.log("DOSYA MALİYETİ → FIFO BOŞ KALEMLERE — KURU KOŞUM (yazmaz)");
  console.log("=".repeat(104));

  console.log("\n① YAZILACAK — FIFO BOŞ, dosyada karşılığı var, aykırı değil");
  console.log("   kalem " + yazilacak.length + "   ·   maliyet " + t2(tut(yazilacak)) + " TL");
  console.log("   üretilecek `PURCHASE_IN` hareketi: " + yazilacak.length);
  console.log("   üretilecek `SALE_OUT` hareketi   : " + yazilacak.length);
  console.log("   etkilenecek satış                : " +
    new Set(yazilacak.map((x) => x.k.sale.id)).size);

  console.log("\n② DOKUNULMAYAN — FIFO damgası VAR");
  console.log("   iki kaynak AYNI ya da dosyada yok : " + dokunulmayanAyni + " kalem");
  console.log("   ⚠ İKİ KAYNAK ÇELİŞİYOR             : " + celisen.length + " kalem");
  console.log("     defter (FIFO) : " + t2(celisen.reduce((t, x) => t + x.fifo, 0)));
  console.log("     dosya         : " + t2(celisen.reduce((t, x) => t + x.birim * x.k.quantity, 0)));
  console.log("     ⛔ ÇELİŞKİ ŞERHLİ KALIR — sessizce kapatılmaz. Ölçülmüş gerçek,");
  console.log("       ölçülmemiş beyanla değiştirilmez (kullanıcı kararı).");

  console.log("\n③ ⚠ AYKIRI — YAZILMAZ, ayrı kovada bekler");
  console.log("\n   (a) MALİYET ≤ ₺5 — yer tutucu şüphesi   [" + aykiriUcuz.length + " kalem]");
  for (const x of aykiriUcuz) {
    console.log("       " + (x.k.sale.code ?? "—").padEnd(14) + x.birim.toFixed(2).padStart(9) +
      "   satış " + Number(x.k.unitPriceAmount.toString()).toFixed(2).padStart(9) +
      "   " + x.k.variant.sku.padEnd(18) + x.k.variant.product.name.slice(0, 26));
  }
  if (aykiriUcuz.length === 0) console.log("       (yok — hepsi doğrulandı)");
  console.log("\n   ⭐ DOĞRULANMIŞ UCUZ SATIRLAR — işaret kalktı, rakam YAŞIYOR");
  for (const [no, sebep] of DOGRULANMIS_UCUZ) {
    console.log("       " + no.padEnd(14) + sebep);
  }

  console.log("\n   (b) MALİYET ≥ SATIŞ — zararına satış iddiası   [" + aykiriPahali.length + " kalem]");
  for (const x of aykiriPahali) {
    console.log("       " + (x.k.sale.code ?? "—").padEnd(14) + x.birim.toFixed(2).padStart(9) +
      "   satış " + Number(x.k.unitPriceAmount.toString()).toFixed(2).padStart(9) +
      "   " + x.k.variant.sku.padEnd(18) + x.k.variant.product.name.slice(0, 26));
  }
  console.log("\n   ⛔ İkisi FARKLI sorun: (a) veri girişi şüphesi, (b) gerçek bir");
  console.log("     zarar da olabilir. Anayasa: aykırı değer önce DOĞRULANIR.");

  console.log("\n④ KARŞILIĞI OLMAYAN — `NO_COST` KALIR");
  console.log("   " + karsiliksiz.length + " kalem   ⛔ uydurulmaz");

  console.log("\n⑤ PARTİ DAMGALAMA PLANI");
  console.log("   Her kalem için `PURCHASE_IN` **satış tarihine** damgalanır");
  console.log("   (`occurredAt = sale.soldAt`) ve hemen ardından o kaleme bağlı");
  console.log("   `SALE_OUT` yazılır. Net stok etkisi SIFIR: +N sonra −N.");
  console.log("   ⚠ NİYE SATIŞ TARİHİ: gerçek alım tarihi bilinmiyor. Satış günü");
  console.log("     damgalamak, o malın en geç o gün elde olduğunu söyler — ve");
  console.log("     GERİYE DÖNÜK BAĞ üretmez (parti satıştan sonra damgalanmaz).");
  console.log("   ⚠ `Purchase`/`PurchaseItem` BELGESİ ÜRETİLMEZ: elimizde fatura");
  console.log("     yok, sahte alım belgesi üretmek kayıt uydurmak olurdu.");

  console.log("\n⑥ KRONOLOJİ DÜZELTMESİ — BU TURDA DEĞİL");
  console.log("   Ölçüldü (ayrı koşum): 309 kalemin maliyeti yanlış partiden,");
  console.log("   423 hareket etkilenir. ⛔ Bu tur ona DOKUNMUYOR — karıştırılırsa");
  console.log("   hangi değişikliğin neyi kaydırdığı ölçülemez hâle gelir.");

  console.log("\n⑦ NET ETKİSİ: ÖLÇÜLECEK, tahmin edilmiyor.");
  console.log("   Maliyet artacağı için NET düşecek; büyüklüğü yazımdan SONRA");
  console.log("   panelin kendi gövdesinden okunur.");

  console.log("\n⑧ GERİ ALMA");
  console.log("   Yazılan hareketler `importBatch` benzeri bir damga taşır ve");
  console.log("   ters kayıtla geri verilir (`--geri` deseni). Süre: yazımla aynı");
  console.log("   mertebe, ~" + Math.ceil((yazilacak.length * 2) / 60) + " dk (2 hareket/kalem).");

  console.log("\n" + "=".repeat(104));
  console.log("KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
