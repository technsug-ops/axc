import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ÇOKLU ADET — BİRİM Mİ TOPLAM MI (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:coklu-adet
 *
 *  Halil: `11373352181`de 2 adet × ₺2.074 satılmış ama sistem birim fiyatı
 *  ₺1.037 gösteriyor ve satış ZARARDA görünüyor.
 *
 *  ⭐ AYIRT EDİCİ SORU — VE ÖNCE BU ÖLÇÜLÜR:
 *  `SaleItem.unitPriceAmount` alanında ne duruyor — BİRİM fiyat mı, SATIR
 *  TOPLAMI mı? Motor onu `× quantity` ile çarpıyor (`kar-yeniden.ts:154`,
 *  `satis.ts:367`). Alan birim ise doğru; satır toplamı ise ÇİFT SAYIM.
 *
 *  ⚠ VE ÜÇÜNCÜ İHTİMAL: alan birim ama İÇE AKTARMA onu BÖLMÜŞ olabilir.
 *  Üçü de ölçülür — kaynak dosyayla göz göze.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const KODLAR = [
  "11373352181",
  "11492207627", "11438745987", "11431419530", "11419703466", "11370752568",
];
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const s2 = (x: { toString(): string } | null | undefined) =>
  x === null || x === undefined ? "—" : Number(x.toString()).toFixed(2);
const t2 = (x: number) => x.toFixed(2).padStart(11);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  /** ⚠ KAYNAK DOSYA — dış kaynağın KENDİ yazdığıyla göz göze bakılır. */
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => bas.indexOf(a);
  const dosya = new Map<string, { adet: number; liste: number; alis: number }[]>();
  for (const r of ss.data.slice(6)) {
    if (String(r[j("TÜR")] ?? "").trim() !== "satış") continue;
    const kod = String(r[j("Sipariş Numarası")] ?? "").trim();
    if (!KODLAR.includes(kod)) continue;
    const v = dosya.get(kod) ?? [];
    v.push({
      adet: n(r[j("Satış Miktarı")]),
      liste: n(r[j("ÜRÜN LİSTE FİYATI")]),
      alis: n(r[j("ÜRÜN ALIŞ FİYATI")]),
    });
    dosya.set(kod, v);
  }

  console.log("\n" + "=".repeat(104));
  console.log("ÇOKLU ADET — BİRİM Mİ TOPLAM MI (salt okuma)");
  console.log("=".repeat(104));

  for (const kod of KODLAR) {
    const sale = await p.sale.findFirst({
      where: { code: kod },
      select: {
        soldAt: true, profitStatus: true, net1Amount: true, net2Amount: true,
        cargoAmount: true, importKaynak: true,
        channelAccount: { select: { channel: { select: { name: true } } } },
        items: {
          select: {
            quantity: true, unitPriceAmount: true, commissionRate: true,
            net1Amount: true, net2Amount: true, profitStatus: true,
            variant: { select: { sku: true, product: { select: { name: true } } } },
            stockMovements: {
              select: { quantityDelta: true, unitCostAmount: true, type: true },
            },
          },
        },
        fees: { select: { code: true, amount: true } },
      },
    });
    console.log("\n" + "-".repeat(104));
    console.log("● " + kod);
    if (!sale) { console.log("   ⛔ SİSTEMDE YOK"); continue; }
    console.log("   " + (sale.channelAccount?.channel.name ?? "—") + " · " +
      sale.soldAt.toISOString().slice(0, 10) + " · kaynak " +
      (sale.importKaynak ?? "elle") + " · kâr " + sale.profitStatus +
      " · NET-1 " + s2(sale.net1Amount) + " · NET-2 " + s2(sale.net2Amount));

    const df = dosya.get(kod) ?? [];
    console.log("\n   DOSYA (kaynağın kendi yazdığı):");
    for (const d of df) {
      console.log("     adet " + String(d.adet).padStart(3) +
        " · LİSTE FİYATI " + t2(d.liste) + " · ALIŞ " + t2(d.alis));
    }
    if (df.length === 0) console.log("     ⛔ dosyada satır YOK");

    console.log("\n   DEFTER:");
    for (const k of sale.items) {
      const birim = Number(k.unitPriceAmount.toString());
      const cikis = k.stockMovements.filter((h) => h.quantityDelta < 0);
      const maliyetToplam = cikis.reduce((t, h) =>
        t + Math.abs(h.quantityDelta) * Number((h.unitCostAmount ?? 0).toString()), 0);
      const birimMaliyet = cikis.length === 0 ? null :
        maliyetToplam / cikis.reduce((t, h) => t + Math.abs(h.quantityDelta), 0);
      console.log("     " + (k.variant.sku ?? "—").padEnd(14) +
        "adet " + k.quantity +
        " · unitPriceAmount " + t2(birim) +
        " · motor SATIŞ TUTARI " + t2(birim * k.quantity));
      console.log("       maliyet: birim " + (birimMaliyet === null ? "—" : t2(birimMaliyet)) +
        " · TOPLAM " + t2(maliyetToplam) +
        "   (hareket " + cikis.length + ")");
      console.log("       kalem NET-1 " + s2(k.net1Amount) +
        " · NET-2 " + s2(k.net2Amount) + " · " + k.profitStatus);

      /** ⭐ ASIL SORU — dosyayla göz göze. */
      const d = df.find((x) => Math.abs(x.adet) === k.quantity) ?? df[0];
      if (d) {
        const birimMi = Math.abs(birim - d.liste) < 0.01;
        const toplamMi = Math.abs(birim * k.quantity - d.liste) < 0.01;
        const bolunmusMu = Math.abs(birim - d.liste / k.quantity) < 0.01;
        console.log("       ⭐ KIYAS: dosya LİSTE " + d.liste.toFixed(2) +
          " ↔ defter unitPrice " + birim.toFixed(2));
        console.log("          dosya = defterin BİRİMİ  : " + (birimMi ? "✓ EVET" : "hayır"));
        console.log("          dosya = defterin TOPLAMI : " + (toplamMi ? "✓ EVET" : "hayır"));
        console.log("          defter = dosya ÷ adet    : " +
          (bolunmusMu && k.quantity > 1 ? "⛔ EVET — BÖLÜNMÜŞ" : "hayır"));
      }
    }
    console.log("\n   kesintiler: " +
      sale.fees.map((f) => f.code + " " + s2(f.amount)).join(" · "));
  }

  /** ═══ KAPSAM — bu bir vaka mı, desen mi ═══ */
  console.log("\n\n" + "=".repeat(104));
  console.log("KAPSAM — çoklu adetli satışlarda dosya ile defter tutuyor mu");
  console.log("=".repeat(104));
  const dosyaHepsi = new Map<string, { adet: number; liste: number }>();
  for (const r of ss.data.slice(6)) {
    if (String(r[j("TÜR")] ?? "").trim() !== "satış") continue;
    const kod = String(r[j("Sipariş Numarası")] ?? "").trim();
    const adet = Math.abs(n(r[j("Satış Miktarı")]));
    if (kod === "" || adet <= 1) continue;
    if (!dosyaHepsi.has(kod)) dosyaHepsi.set(kod, { adet, liste: n(r[j("ÜRÜN LİSTE FİYATI")]) });
  }
  console.log("\n   dosyada adet>1 olan sipariş: " + dosyaHepsi.size);
  const nolar = [...dosyaHepsi.keys()];
  let birimTutan = 0, toplamTutan = 0, bolunmus = 0, hicbiri = 0, yok = 0;
  const ornek: string[] = [];
  for (let k = 0; k < nolar.length; k += 300) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 300) }, iptalTarihi: null },
      select: { code: true, items: { select: { quantity: true, unitPriceAmount: true } } },
    })) {
      const d = dosyaHepsi.get(x.code!)!;
      const kalem = x.items.find((i) => i.quantity === d.adet) ?? x.items[0];
      if (!kalem) { yok++; continue; }
      const birim = Number(kalem.unitPriceAmount.toString());
      if (Math.abs(birim - d.liste) < 0.01) birimTutan++;
      else if (Math.abs(birim * kalem.quantity - d.liste) < 0.01) toplamTutan++;
      else if (kalem.quantity > 1 && Math.abs(birim - d.liste / kalem.quantity) < 0.01) {
        bolunmus++;
        if (ornek.length < 8) {
          ornek.push(x.code + "  adet " + kalem.quantity +
            " · dosya " + d.liste.toFixed(2) + " · defter " + birim.toFixed(2));
        }
      } else hicbiri++;
    }
  }
  console.log("   sistemde bulunan sipariş: " + (birimTutan + toplamTutan + bolunmus + hicbiri));
  console.log("   ⭐ defter = dosya (BİRİM fiyat)      : " + birimTutan);
  console.log("   ⛔ defter × adet = dosya (BÖLÜNMÜŞ)  : " + bolunmus);
  console.log("   ⚠ defter = dosya ÷ ... (TOPLAM yazılı): " + toplamTutan);
  console.log("   ⛔ hiçbirine uymayan                 : " + hicbiri);
  for (const o of ornek) console.log("     " + o);

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
