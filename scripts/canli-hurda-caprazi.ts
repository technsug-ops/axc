import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  HURDA ÇAPRAZI — K73'ün İKİNCİ BİLİNMEZLİĞİ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:hurda-caprazi
 *
 *  Halil hurda takip listesini verdi. Hurdaya giden mal **hasarlı** dönmüş
 *  demektir — yani `saglamAdet = 0`. Bu, iade içe aktarmasının üç
 *  bilinmezliğinden BİRİNİ kapatabilir.
 *
 *  ⛔ AMA YALNIZ KESİŞENLERİ. "Hurda listesinde YOK" ile "sağlam döndü"
 *  AYNI ŞEY DEĞİLDİR: liste eksik de olabilir. Bu bir ÇIKARIMDIR ve
 *  ölçülmedi — Halil'e sorulacak, burada hüküm verilmiyor.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const HURDA = "C:/Users/yapra/Desktop/excel/hurda.xlsx";
const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(13);
const metin = (h: unknown) => String(h ?? "").trim();

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(104));
  console.log("HURDA ÇAPRAZI — ÖLÇÜM (yazma YOK)");
  console.log("=".repeat(104));

  /** ⚠ DOSYA KİMLİĞİ ÖNCE — Halil bir md5 bildirdi, aynı dosya mı? */
  const ham = readFileSync(HURDA);
  const md5 = createHash("md5").update(ham).digest("hex");
  console.log("\n⓪ DOSYA KİMLİĞİ");
  console.log("   md5 ölçülen : " + md5);
  console.log("   md5 beyan   : fa335fe21cd87bfd5cfb3eca93a80741");
  console.log("   " + (md5 === "fa335fe21cd87bfd5cfb3eca93a80741"
    ? "⭐ AYNI DOSYA ✓" : "⛔ FARKLI DOSYA — ölçüm başka bir dosyadan!"));

  const tum = await readXlsxFile(paketiNormalle(ham).bayt);
  console.log("   sayfalar    : " + tum.map((x) => String(x.sheet)).join(" · "));

  const s = tum.find((x) => String(x.sheet).toLowerCase().includes("hurda")) ?? tum[0];
  const bas = s.data[0].map((h) => metin(h));
  console.log("\n   sayfa \"" + s.sheet + "\" · satır " + (s.data.length - 1));
  console.log("   sütunlar    : " + bas.map((h, i) =>
    String.fromCharCode(65 + i) + "=" + (h || "⛔BOŞ")).join(" · "));

  /** ⚠ Sütun ADIYLA bulunur; iki sütun aynı adı taşıyorsa İKİSİ de tutulur. */
  const idx = (ad: string) => bas.map((h, i) => [h, i] as const)
    .filter(([h]) => h.toLowerCase() === ad.toLowerCase()).map(([, i]) => i);
  const iSip = idx("Sipariş no")[0] ?? bas.findIndex((h) => /sipari/i.test(h));
  const iSku = bas.findIndex((h) => /sku/i.test(h));
  const iPy = bas.findIndex((h) => /pazaryer/i.test(h));
  const iUrun = bas.findIndex((h) => /hurda ürün|hurda urun|ürün/i.test(h));
  const iTutar = bas.findIndex((h) => /tutar/i.test(h));
  const iOdendi = bas.findIndex((h) => /ödendi|odendi/i.test(h));
  const iDurum = bas.map((h, i) => [h, i] as const)
    .filter(([h]) => /durum/i.test(h)).map(([, i]) => i);

  const satirlar = s.data.slice(1).filter((r) => r.some((x) => metin(x) !== ""));

  // ── ① ÖN ÖLÇÜM TEYİDİ ─────────────────────────────────────────────────
  console.log("\n① ÖN ÖLÇÜM TEYİDİ (Halil'in verdiği rakamlar)");
  const py = new Map<string, number>();
  for (const r of satirlar) {
    const k = metin(r[iPy]) || "—";
    py.set(k, (py.get(k) ?? 0) + 1);
  }
  console.log("   satır         : " + satirlar.length + "   (beyan 62)");
  console.log("   pazaryeri     : " + [...py].map(([k, v]) => k + "=" + v).join(" · ") +
    "   (beyan HB 47 · TY 15)");
  const sipDolu = satirlar.filter((r) => metin(r[iSip]) !== "").length;
  const tutarDolu = satirlar.filter((r) => n(r[iTutar]) !== 0);
  const skuDolu = satirlar.filter((r) => metin(r[iSku]) !== "").length;
  console.log("   sipariş no    : " + sipDolu + "/" + satirlar.length + "   (beyan 61/62)");
  console.log("   tutar         : " + tutarDolu.length + "/" + satirlar.length +
    " · toplam " + t2(tutarDolu.reduce((t, r) => t + n(r[iTutar]), 0)) +
    "   (beyan 41/62 · ₺138.385)");
  console.log("   SKU           : " + skuDolu + "/" + satirlar.length + "   (beyan 16/62)");
  const odendiSay = new Map<string, number>();
  for (const r of satirlar) {
    const k = metin(r[iOdendi]) || "⛔ BOŞ";
    odendiSay.set(k, (odendiSay.get(k) ?? 0) + 1);
  }
  console.log("   Ödendi        : " + [...odendiSay].map(([k, v]) => k + "=" + v).join(" · ") +
    "   (beyan 51 evet / 10 hayır)");

  // ── ② İADE LİSTESİYLE KESİŞİM ─────────────────────────────────────────
  const ls = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const lb = ls.data[0].map((h) => metin(h));
  const li = (a: string) => lb.indexOf(a);
  const iadeSatir = ls.data.slice(1).filter((r) => metin(r[li("TÜR")]) === "iade");
  const iadeNo = new Map<string, { adet: number; tutar: number; n: number }>();
  for (const r of iadeSatir) {
    const kod = metin(r[li("Sipariş Numarası")]);
    if (kod === "") continue;
    const v = iadeNo.get(kod) ?? { adet: 0, tutar: 0, n: 0 };
    v.n++;
    v.adet += Math.abs(n(r[li("Satış Miktarı")])) || 1;
    v.tutar += Math.abs(n(r[li("ÜRÜN LİSTE FİYATI")]));
    iadeNo.set(kod, v);
  }
  const hurdaNo = [...new Set(satirlar.map((r) => metin(r[iSip])).filter((x) => x !== ""))];
  const kesisen = hurdaNo.filter((x) => iadeNo.has(x));
  const hurdaAma = hurdaNo.filter((x) => !iadeNo.has(x));

  console.log("\n② ⭐ İADE LİSTESİYLE KESİŞİM");
  console.log("   hurda listesinde farklı sipariş : " + hurdaNo.length);
  console.log("   iade listesinde farklı sipariş  : " + iadeNo.size);
  console.log("   ⭐ KESİŞEN                       : " + kesisen.length + "   (beyan 58)");
  console.log("   ⛔ hurdada VAR, iadede YOK       : " + hurdaAma.length);
  const kAdet = kesisen.reduce((t, k) => t + (iadeNo.get(k)?.adet ?? 0), 0);
  const kTutar = kesisen.reduce((t, k) => t + (iadeNo.get(k)?.tutar ?? 0), 0);
  console.log("\n   KESİŞENLERİN İADE SATIRLARI:");
  console.log("     adet " + kAdet + " · tutar " + t2(kTutar));
  console.log("   ⭐ BUNLAR HASARLI DÖNDÜ → saglamAdet=0 · hasarliAdet=adet");
  const kalan = iadeNo.size - kesisen.length;
  console.log("\n   ⛔ KALAN " + kalan + " İADE — SAĞLAM SAYILABİLİR Mİ? ÖLÇÜLMEDİ.");
  console.log("     \"Hurda listesinde yok\" ile \"sağlam döndü\" AYNI ŞEY DEĞİL:");
  console.log("     liste eksik de olabilir. Bu bir ÇIKARIM ve Halil'e sorulacak.");

  // ── ③ HURDADA VAR, İADEDE YOK ─────────────────────────────────────────
  console.log("\n③ HURDADA VAR AMA İADE LİSTESİNDE YOK — " + hurdaAma.length + " sipariş");
  for (const kod of hurdaAma) {
    const sale = await p.sale.findFirst({
      where: { code: kod },
      select: { soldAt: true, iptalTarihi: true, profitStatus: true,
        items: { select: { quantity: true, unitPriceAmount: true,
          variant: { select: { sku: true } } } } },
    });
    const r = satirlar.find((x) => metin(x[iSip]) === kod)!;
    console.log("   " + kod.padEnd(15) + metin(r[iPy]).padEnd(4) +
      " · tutar " + n(r[iTutar]).toFixed(2).padStart(10) +
      " · " + metin(r[iUrun]).slice(0, 30));
    console.log("     sistemde: " + (sale === null ? "⛔ SATIŞ YOK" :
      sale.soldAt.toISOString().slice(0, 10) + " · " + sale.profitStatus +
      (sale.iptalTarihi ? " · İPTALLİ" : "") +
      " · " + sale.items.map((k) => (k.variant.sku ?? "—")).join(",")));
  }

  // ── ④ DURUM SÜTUNLARI — ayrıştırılabilir mi ───────────────────────────
  console.log("\n④ DURUM SÜTUNLARI — ayrıştırılabilir mi");
  console.log("   \"durum\" adlı sütun sayısı: " + iDurum.length +
    " (" + iDurum.map((i) => String.fromCharCode(65 + i)).join(" · ") + ")");
  const durumDeger = new Map<string, number>();
  for (const r of satirlar) {
    for (const i of iDurum) {
      const d = metin(r[i]);
      if (d === "") continue;
      durumDeger.set(d, (durumDeger.get(d) ?? 0) + 1);
    }
  }
  console.log("   farklı değer: " + durumDeger.size);
  const sirali = [...durumDeger].sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sirali.slice(0, 18)) {
    console.log("     " + String(v).padStart(3) + "  " + k.slice(0, 74));
  }
  if (sirali.length > 18) console.log("     … +" + (sirali.length - 18) + " değer daha");
  /** ⚠ KOVAYA AYRILABİLİR Mİ — desenle ölç, gözle değil. */
  const kova = { odendi: 0, bekleyen: 0, itiraz: 0, tarih: 0, digger: 0 };
  for (const [k, v] of durumDeger) {
    if (/öden|odend|ödend/i.test(k)) kova.odendi += v;
    else if (/bekl|onay|talep|süre|surec|değerlend/i.test(k)) kova.bekleyen += v;
    else if (/itiraz|red|kabul edilme/i.test(k)) kova.itiraz += v;
    else if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(k) || /^\d{5}$/.test(k)) kova.tarih += v;
    else kova.digger += v;
  }
  console.log("\n   DESENE GÖRE KOVALAMA DENEMESİ:");
  console.log("     ödendi " + kova.odendi + " · bekleyen " + kova.bekleyen +
    " · itiraz " + kova.itiraz + " · TARİH " + kova.tarih +
    " · ⛔ sınıflanamayan " + kova.digger);
  console.log("   ⚠ Sınıflanamayan oranı yüksekse sütun KOVA değil NOT'tur.");

  // ── ⑤ TUTARSIZLAR ─────────────────────────────────────────────────────
  const tutarsiz = satirlar.filter((r) => n(r[iTutar]) === 0);
  console.log("\n⑤ TUTARI OLMAYAN " + tutarsiz.length + " SATIR — ne durumdalar");
  const tOdendi = new Map<string, number>();
  for (const r of tutarsiz) {
    const k = metin(r[iOdendi]) || "⛔ BOŞ";
    tOdendi.set(k, (tOdendi.get(k) ?? 0) + 1);
  }
  console.log("   Ödendi dağılımı: " + [...tOdendi].map(([k, v]) => k + "=" + v).join(" · "));
  console.log("   ⭐ \"Ödendi=evet ama tutar yok\" varsa KAYIT EKSİK demektir;");
  console.log("     \"Ödendi=hayır ve tutar yok\" ise HENÜZ TAZMİN ALINMAMIŞ olabilir.");
  for (const r of tutarsiz.slice(0, 8)) {
    console.log("     " + metin(r[iSip]).padEnd(15) + metin(r[iPy]).padEnd(4) +
      " · ödendi " + (metin(r[iOdendi]) || "—").padEnd(8) +
      " · " + metin(r[iUrun]).slice(0, 34));
  }

  // ── ⑥ ÜRÜN EŞLEŞTİRMESİ ───────────────────────────────────────────────
  console.log("\n⑥ ÜRÜN EŞLEŞTİRMESİ — SKU yalnız " + skuDolu + "/" + satirlar.length);
  let sipartenBulundu = 0, sipartenYok = 0, cokKalemli = 0;
  for (const kod of hurdaNo) {
    const sale = await p.sale.findFirst({
      where: { code: kod },
      select: { items: { select: { variant: { select: { sku: true } } } } },
    });
    if (!sale) { sipartenYok++; continue; }
    sipartenBulundu++;
    if (sale.items.length > 1) cokKalemli++;
  }
  console.log("   sipariş no ile sistemde bulunan : " + sipartenBulundu + "/" + hurdaNo.length);
  console.log("   ⛔ bulunamayan                   : " + sipartenYok);
  console.log("   ⚠ ÇOK KALEMLİ sipariş            : " + cokKalemli +
    "   ← burada SKU olmadan HANGİ ÜRÜN belli değil");
  console.log("   ⭐ Tek kalemli siparişte ürün sipariş numarasından ÇIKAR;");
  console.log("     çok kalemlide ÇIKMAZ — SKU ya da ürün adı gerekir.");

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
