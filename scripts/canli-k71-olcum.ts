import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K71 — TANINMAYAN TÜRLER · ÖLÇÜM (SALT OKUMA, EŞLEŞTİRME YOK)
 * ----------------------------------------------------------------------------
 *      npm run canli:k71-olcum
 *
 *  İçe aktarma yalnız `satış` türünü tanıyor. Geri kalan dört tür
 *  (`tazmin` 27 · `aktarma` 7 · `Zarar` 1 · `TATİL` 8) hiç girmedi.
 *
 *  ⛔ EŞLEŞTİRME YAPILMIYOR, TÜR ATANMIYOR, HİÇBİR ŞEY YAZILMIYOR.
 *  Sorulan tek şey: bu satırlar NE, ve sistem onlar hakkında ne biliyor?
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const TURLER = ["tazmin", "aktarma", "Zarar", "TATİL"];
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(12);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const j = (a: string) => {
    const k = sb.indexOf(a);
    if (k < 0) throw new Error("KOLON YOK: " + a);
    return k;
  };
  const veri = ss.data.slice(6);

  /** ⚠ Ters-satır listesi AYRI dosya; bu satırlar orada da geçiyor mu? */
  const ls = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const lb = ls.data[0].map((h) => String(h ?? "").trim());
  const tersNo = new Set(ls.data.slice(1)
    .map((r) => String(r[lb.indexOf("Sipariş Numarası")] ?? "").trim())
    .filter((x) => x !== ""));

  const tarih = (r: unknown[]) => {
    const d = r[j("Tarih")];
    if (d instanceof Date) return Number.isNaN(d.getTime()) ? null : d;
    const t = String(d ?? "").trim();
    const tr = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
    if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
    const d2 = new Date(t);
    return Number.isNaN(d2.getTime()) ? null : d2;
  };

  console.log("\n" + "=".repeat(104));
  console.log("K71 — TANINMAYAN TÜRLER · ÖLÇÜM (eşleştirme YOK, yazma YOK)");
  console.log("=".repeat(104));

  for (const tur of TURLER) {
    const satir = veri.filter((r) => String(r[j("TÜR")] ?? "").trim() === tur);
    console.log("\n" + "-".repeat(104));
    console.log("● " + tur.toUpperCase() + " — " + satir.length + " satır");
    console.log("-".repeat(104));

    /** ① PARA — liste ve alış AYRI toplanır; tabanları farklı. */
    const liste = satir.reduce((t, r) => t + n(r[j("ÜRÜN LİSTE FİYATI")]), 0);
    const alis = satir.reduce((t, r) => t + n(r[j("ÜRÜN ALIŞ FİYATI")]), 0);
    console.log("   liste toplamı " + t2(liste) + "   ·   alış toplamı " + t2(alis) +
      "   ·   fark " + t2(liste - alis));

    /** ② KİMLİK — sipariş no VAR MI, sistemde karşılığı var mı? */
    const nolar = satir.map((r) => String(r[j("Sipariş Numarası")] ?? "").trim());
    const dolu = [...new Set(nolar.filter((x) => x !== ""))];
    const bos = nolar.filter((x) => x === "").length;
    const sistemde = dolu.length === 0 ? [] : (await p.sale.findMany({
      where: { code: { in: dolu } },
      select: { code: true, iptalTarihi: true, soldAt: true },
    }));
    const sisSet = new Set(sistemde.map((x) => x.code!));
    console.log("   sipariş no: dolu " + dolu.length + " · ⛔ BOŞ " + bos +
      "   →  sistemde satış olarak VAR " + sisSet.size +
      " · ⛔ YOK " + (dolu.length - sisSet.size));
    console.log("   ters-satır listesinde de geçen: " + dolu.filter((x) => tersNo.has(x)).length);

    /** ③ ÜRÜN KİMLİĞİ — SKU/barkod sistemde tanınıyor mu? */
    const kodlar = [...new Set(satir.flatMap((r) => [
      String(r[j("SKU")] ?? "").trim(),
      String(r[j("AXCALI BARKOD")] ?? "").trim(),
    ]).filter((x) => x !== ""))];
    const varyant = kodlar.length === 0 ? [] : await p.productVariant.findMany({
      where: { OR: [{ sku: { in: kodlar } }, { barcode: { in: kodlar } }] },
      select: { sku: true, barcode: true },
    });
    const taninan = new Set([
      ...varyant.map((v) => v.sku),
      ...varyant.map((v) => v.barcode),
    ]);
    const satirTanindi = satir.filter((r) =>
      taninan.has(String(r[j("SKU")] ?? "").trim()) ||
      taninan.has(String(r[j("AXCALI BARKOD")] ?? "").trim())).length;
    console.log("   ürün kimliği : " + satirTanindi + "/" + satir.length +
      " satırın ürünü sistemde TANINIYOR");

    /** ④ ZAMAN */
    const gunler = satir.map(tarih).filter((d): d is Date => d !== null).sort((a, b) => +a - +b);
    console.log("   tarih        : " + (gunler.length === 0 ? "⛔ HİÇ OKUNAMADI" :
      gunler[0].toISOString().slice(0, 10) + " → " +
      gunler[gunler.length - 1].toISOString().slice(0, 10) +
      "  (okunan " + gunler.length + "/" + satir.length + ")"));

    /** ⑤ KANAL */
    const py = new Map<string, number>();
    for (const r of satir) {
      const k = String(r[j("PAZAR YERI")] ?? "—").trim() || "—";
      py.set(k, (py.get(k) ?? 0) + 1);
    }
    console.log("   pazaryeri    : " + [...py].map(([k, v]) => k + "=" + v).join(" · "));

    /** ⑥ SATIR SATIR — az sayıda oldukları için hepsi basılıyor. */
    console.log("\n   satırlar:");
    for (const r of satir) {
      const no = String(r[j("Sipariş Numarası")] ?? "").trim();
      const d = tarih(r);
      console.log("     " + (no === "" ? "⛔ NO YOK".padEnd(14) : no.padEnd(14)) +
        (d ? d.toISOString().slice(0, 10) : "  —       ") +
        " adet " + String(r[j("Satış Miktarı")]).padStart(5) +
        " · liste " + n(r[j("ÜRÜN LİSTE FİYATI")]).toFixed(2).padStart(9) +
        " · alış " + n(r[j("ÜRÜN ALIŞ FİYATI")]).toFixed(2).padStart(9) +
        (no !== "" ? (sisSet.has(no) ? " · sistemde VAR" : " · ⛔ sistemde YOK") : "") +
        "  " + String(r[j("Ürün")] ?? "").slice(0, 28));
    }
  }

  /**
   * ⭐ ÇAPRAZ — `tazmin`in 27/27'si ters-satır listesinde de geçiyor.
   * O listede AYNI sipariş numarasına ne yazmış? (Ölçüm; eşleştirme değil.)
   */
  console.log("\n\n" + "=".repeat(104));
  console.log("ÇAPRAZ — `tazmin` satırları ters-satır listesinde NE olarak duruyor");
  console.log("=".repeat(104));
  const tazminNo = new Set(veri
    .filter((r) => String(r[j("TÜR")] ?? "").trim() === "tazmin")
    .map((r) => String(r[j("Sipariş Numarası")] ?? "").trim())
    .filter((x) => x !== ""));
  const lturSay = new Map<string, number>();
  let ltoplam = 0;
  for (const r of ls.data.slice(1)) {
    const no = String(r[lb.indexOf("Sipariş Numarası")] ?? "").trim();
    if (!tazminNo.has(no)) continue;
    const tur = String(r[lb.indexOf("TÜR")] ?? "—").trim() || "—";
    lturSay.set(tur, (lturSay.get(tur) ?? 0) + 1);
    ltoplam += Math.abs(n(r[lb.indexOf("ÜRÜN LİSTE FİYATI")]));
  }
  console.log("   ters listedeki TÜR'leri : " +
    [...lturSay].map(([k, v]) => k + "=" + v).join(" · "));
  console.log("   o satırların tutarı     : " + t2(ltoplam));

  /** ⭐ Sistemde VAR olan 14 tazmin siparişi bugün ciroda mı? */
  const sisTaz = await p.sale.findMany({
    where: { code: { in: [...tazminNo] } },
    select: {
      code: true, iptalTarihi: true, profitStatus: true, soldAt: true,
      items: { select: { quantity: true, unitPriceAmount: true } },
      returns: { select: { id: true } },
    },
  });
  const ciroTaz = sisTaz.filter((x) => x.iptalTarihi === null)
    .reduce((t, x) => t + x.items.reduce((u, k) =>
      u + Number(k.unitPriceAmount.toString()) * k.quantity, 0), 0);
  const durum = new Map<string, number>();
  for (const x of sisTaz) durum.set(String(x.profitStatus), (durum.get(String(x.profitStatus)) ?? 0) + 1);
  console.log("\n   sistemde olan " + sisTaz.length + " tazmin siparişi:");
  console.log("     iptal edilmiş " + sisTaz.filter((x) => x.iptalTarihi !== null).length +
    " · iade kaydı olan " + sisTaz.filter((x) => x.returns.length > 0).length);
  console.log("     kâr durumu: " + [...durum].map(([k, v]) => k + "=" + v).join(" · "));
  console.log("     ⭐ bugün ciroda duran tutar: " + t2(ciroTaz));

  /** SİSTEM TARAFI — Compensation ne taşıyor */
  console.log("\n\n" + "=".repeat(104));
  console.log("SİSTEM TARAFI — `Compensation` (tazmin'in olası karşılığı)");
  console.log("=".repeat(104));
  const comp = await p.compensation.findMany({
    select: {
      quantity: true, status: true, occurredAt: true, note: true,
      supplierId: true, carrierId: true, purchaseItemId: true,
      returnItemId: true, returnNoticeId: true,
    },
  });
  console.log("   kayıt " + comp.length);
  for (const x of comp) {
    console.log("     adet " + String(x.quantity).padStart(3) + " · " +
      String(x.status).padEnd(10) + x.occurredAt.toISOString().slice(0, 10) +
      " · karşı taraf " + (x.supplierId ? "TEDARİKÇİ" : x.carrierId ? "KARGO" : "—") +
      (x.note ? "  " + x.note.slice(0, 40) : ""));
  }
  console.log("\n   ⛔ EŞLEŞTİRME YAPILMADI. `Compensation` karşı taraf olarak ya");
  console.log("     `supplierId` ya `carrierId` istiyor; dosyanın `tazmin` satırı");
  console.log("     KİMDEN tazmin alındığını söylemiyor. Ölçülmeden yazılamaz.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. TÜR ATANMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
