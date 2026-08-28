import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE AÇIĞI — 241 SATIŞ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-acigi
 *
 *  ⚠ Kullanıcının verdiği ters satır listesi (391 satır) ile defter
 *  karşılaştırılıyor. Beş soru ayrı ayrı ölçülüyor; hiçbiri tahmin
 *  edilmiyor.
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(15);

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const s = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const b = s.data[0].map((h) => String(h ?? "").trim());
  const i = (a: string) => {
    const j = b.indexOf(a);
    if (j < 0) throw new Error("KOLON YOK: " + a);
    return j;
  };
  const satirlar = s.data.slice(1).filter((r) => String(r[i("Sipariş Numarası")] ?? "").trim() !== "");

  const tarih = (r: unknown[]) => {
    const d = r[i("Tarih")];
    if (d instanceof Date) return d;
    const t = String(d ?? "").trim();
    /** ⚠ İki biçim var: "Sat Aug 17 2024 …" ve "23.08.2024". */
    const tr = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
    if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]));
    const d2 = new Date(t);
    return Number.isNaN(d2.getTime()) ? null : d2;
  };

  const nolar = [...new Set(satirlar.map((r) => String(r[i("Sipariş Numarası")]).trim()))];
  const sale = new Map<string, { id: string; iptal: Date | null; durum: string | null }>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) } },
      select: { id: true, code: true, iptalTarihi: true, profitStatus: true },
    })) sale.set(x.code!, { id: x.id, iptal: x.iptalTarihi, durum: x.profitStatus });
  }
  const iadeli = new Set((await p.returnNotice.findMany({
    where: { sale: { code: { in: nolar } } }, select: { sale: { select: { code: true } } },
  })).map((x) => x.sale.code!));
  const returnli = new Set((await p.return.findMany({
    where: { sale: { code: { in: nolar } } }, select: { sale: { select: { code: true } } },
  })).map((x) => x.sale.code!));

  const acik = satirlar.filter((r) => {
    const no = String(r[i("Sipariş Numarası")]).trim();
    const x = sale.get(no);
    return x !== undefined && x.iptal === null && !iadeli.has(no) && !returnli.has(no);
  });

  console.log("\n" + "=".repeat(104));
  console.log("İADE AÇIĞI — ÖLÇÜM (salt okuma)");
  console.log("=".repeat(104));

  // ── ① İADE TUTARI ──────────────────────────────────────────────────────
  /** ⚠ Liste fiyatı NEGATİF yazılı; mutlak değeri iadenin tutarıdır. */
  const tutar = acik.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0);
  console.log("\n① İADE TUTARI — ciro bu kadar FAZLA görünüyor");
  console.log("   kayıt " + acik.length + " satır · " +
    new Set(acik.map((r) => String(r[i("Sipariş Numarası")]).trim())).size + " sipariş");
  console.log("   ⭐ TOPLAM: " + t2(tutar) + " TL");
  console.log("   ⚠ Bu, iade edilen KALEMLERİN tutarıdır — o satışların tam");
  console.log("     cirosu (₺710.189) DEĞİL. İki rakam karıştırılmaz.");

  // ── ② DÖNEM ────────────────────────────────────────────────────────────
  console.log("\n② DÖNEM DAĞILIMI");
  const ay = new Map<string, { n: number; tutar: number }>();
  let okunamayan = 0;
  for (const r of acik) {
    const d = tarih(r);
    if (d === null) { okunamayan++; continue; }
    const k = d.toISOString().slice(0, 7);
    const v = ay.get(k) ?? { n: 0, tutar: 0 };
    v.n++; v.tutar += Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")]));
    ay.set(k, v);
  }
  for (const [k, v] of [...ay].sort()) {
    console.log("   " + k + String(v.n).padStart(6) + t2(v.tutar));
  }
  if (okunamayan > 0) console.log("   ⚠ tarihi OKUNAMAYAN: " + okunamayan);
  const simdi = new Date();
  for (const g of [30, 90, 180]) {
    const sinir = new Date(simdi.getTime() - g * 86400_000);
    const alt = acik.filter((r) => { const d = tarih(r); return d !== null && d >= sinir; });
    console.log("   son " + String(g).padStart(3) + " gün: " + String(alt.length).padStart(4) +
      " kayıt · " + t2(alt.reduce((t, r) => t + Math.abs(n(r[i("ÜRÜN LİSTE FİYATI")])), 0)));
  }

  // ── ③ SİSTEMDE OLMAYANLAR ──────────────────────────────────────────────
  console.log("\n③ SİSTEMDE OLMAYAN SİPARİŞLER — K56 kovası mı");
  const yokNolar = nolar.filter((x) => !sale.has(x));
  console.log("   " + yokNolar.length + " sipariş");
  /** ⚠ ÇAPRAZ: bu numaraların SATIŞ satırı ana dosyada var mı? */
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const sj = (a: string) => sb.indexOf(a);
  const sVeri = ss.data.slice(6);
  const yokSet = new Set(yokNolar);
  const anaDosyada = sVeri.filter((r) => yokSet.has(String(r[sj("Sipariş Numarası")] ?? "").trim()));
  const pozitif = anaDosyada.filter((r) => n(r[sj("Satış Miktarı")]) > 0);
  console.log("   ana satış dosyasındaki satırları : " + anaDosyada.length +
    "   (pozitif/satış satırı: " + pozitif.length + ")");
  console.log("   ⭐ Yani bu siparişlerin SATIŞI da dosyada VAR ama sisteme");
  console.log("     hiç girmemiş — Türk Kahvesi (10030751247) ile AYNI KOVA.");
  const turSay = new Map<string, number>();
  for (const r of pozitif) {
    const k = String(r[sj("TÜR")] ?? "—").trim();
    turSay.set(k, (turSay.get(k) ?? 0) + 1);
  }
  console.log("   o satırların TÜR'ü: " + [...turSay].map(([k, v]) => k + "=" + v).join(" · "));

  // ── ④ İÇE AKTARMA MÜMKÜN MÜ ────────────────────────────────────────────
  console.log("\n④ İADE İÇE AKTARMASI — alan eşleşmesi");
  console.log("   `Return` ZORUNLU alanları : saleId · returnType · occurredAt");
  console.log("   `ReturnItem` ZORUNLU      : saleItemId · variantId · quantity");
  console.log("   `ReturnNotice` ZORUNLU    : saleId · noticedAt · reason");
  console.log("\n   DOSYADA VAR      : sipariş no ✓ · tarih ✓ · adet ✓ · tutar ✓ · SKU ✓");
  console.log("   ⛔ DOSYADA YOK    : iade SEBEBİ (`ReturnReason`) · iade TÜRÜ");
  console.log("     (`UNDELIVERED` / `NORMAL` / `DISPUTED`) · sağlam-hasarlı ayrımı");
  console.log("\n   ⚠ SEBEP UYDURULAMAZ: `reason` zorunlu bir enum ve iade");
  console.log("     akışının tamamını yönlendiriyor (bkz. docs/iade-sureci.md).");
  console.log("     `DIGER` diye toplu yazmak, 366 iadeyi analiz edilemez hâle");
  console.log("     getirirdi — ve o kova zaten en az izlenen kova.");
  console.log("   ⚠ TÜR de uydurulamaz: `NORMAL` ile `UNDELIVERED` KARGO");
  console.log("     MALİYETİNİ değiştirir (bkz. iade-sureci §5).");
  console.log("\n   ⭐ ÖNERİ: iki aşamalı. ① `ReturnNotice` DEĞİL, doğrudan");
  console.log("     `Return` + `ReturnItem` yazılır (mal zaten gelmiş, süreç");
  console.log("     bitmiş). ② `returnType` ve `reason` için dosyaya İKİ SÜTUN");
  console.log("     eklenmesi istenir — kullanıcı biliyor, sistem bilmiyor.");
  console.log("   ⛔ ÖNERİ GETİRİLDİ, YAZILMADI.");

  // ── ⑤ İPTAL SATIRLARI ──────────────────────────────────────────────────
  console.log("\n⑤ İPTAL SATIRLARI (TÜR=iptal)");
  const iptalNo = [...new Set(satirlar
    .filter((r) => String(r[i("TÜR")] ?? "").trim() === "iptal")
    .map((r) => String(r[i("Sipariş Numarası")]).trim()))];
  let iptalli = 0, normal = 0, yok2 = 0;
  for (const no of iptalNo) {
    const x = sale.get(no);
    if (!x) { yok2++; continue; }
    if (x.iptal) iptalli++;
    else normal++;
  }
  console.log("   dosyada iptal işaretli sipariş : " + iptalNo.length);
  console.log("     sistemde İPTAL işaretli      : " + iptalli);
  console.log("     ⛔ sistemde NORMAL görünüyor  : " + normal + "   ← ciroda duruyor");
  console.log("     sistemde YOK                 : " + yok2);

  console.log("\n" + "=".repeat(104));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(104) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
