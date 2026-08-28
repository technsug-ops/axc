import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  İADE DOSYASI · O SÜTUNU = İADE KARGO ÜCRETİ — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:iade-kargo-kolonu
 *
 *  Halil: _"İade dosyası O sütununda iadelerin kargo ücretleri mevcut."_
 *
 *  ⭐ BU, K73'ÜN ÜÇÜNCÜ BİLİNMEYENİNE DOKUNUYOR (`iadeKargosu`). Ama
 *  "sütun var" ile "sütun benim aradığım şeyi taşıyor" AYNI ŞEY DEĞİL:
 *   ① O sütununun başlığı ne, R (satış kargosu) ile aynı sütun mu?
 *   ② Kaç satırda dolu, değerleri makul mü?
 *   ③ ⭐ AYNI SİPARİŞİN SATIŞ KARGOSUYLA AYNI MI — yoksa AYRI bir bacak mı?
 *      (Aynıysa sütun iade kargosunu DEĞİL, gidiş kargosunu taşıyor.)
 *   ④ Halil'in kuralıyla tutuyor mu: "teslim edilmeden dönen = TEK kargo"
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const LISTE = "C:/Users/yapra/Desktop/excel/Unbenannte Tabelle.xlsx";
const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(13);

function yy(dizi: number[], q: number) {
  if (dizi.length === 0) return 0;
  const s = [...dizi].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const ls = (await readXlsxFile(paketiNormalle(readFileSync(LISTE)).bayt))[0];
  const lb = ls.data[0].map((h) => String(h ?? "").trim());
  const li = (a: string) => lb.indexOf(a);

  console.log("\n" + "=".repeat(100));
  console.log("İADE DOSYASI — O SÜTUNU (iade kargo ücreti) ÖLÇÜMÜ");
  console.log("=".repeat(100));

  // ── ① SÜTUN HARİTASI ──────────────────────────────────────────────────
  console.log("\n① SÜTUN HARİTASI — O = 15. sütun (A=1)");
  lb.forEach((h, i) => {
    if (i >= 12 && i <= 17) {
      console.log("   " + String.fromCharCode(65 + i) + " (" + (i + 1) + ")  " +
        (h || "⛔ BAŞLIKSIZ") + (i === 14 ? "   ⭐ O" : ""));
    }
  });
  const oIdx = 14;
  console.log("\n   ⭐ O sütununun başlığı: \"" + (lb[oIdx] || "⛔ BAŞLIKSIZ") + "\"");
  const kargoAdli = lb.findIndex((h) => h.toUpperCase().includes("KARGO"));
  console.log("   \"KARGO\" geçen ilk sütun: " + (kargoAdli < 0 ? "⛔ YOK" :
    String.fromCharCode(65 + kargoAdli) + " (" + (kargoAdli + 1) + ") — \"" + lb[kargoAdli] + "\""));
  if (kargoAdli !== oIdx && kargoAdli >= 0) {
    console.log("   ⚠ O ile adı KARGO olan sütun AYNI DEĞİL. İkisi de ölçülüyor;");
    console.log("     hangisinin kastedildiği değerlerden anlaşılacak.");
  }

  // ── ② KAPSAM VE DEĞERLER ──────────────────────────────────────────────
  const iadeSatir = ls.data.slice(1).filter((r) =>
    String(r[li("TÜR")] ?? "").trim() === "iade");
  for (const [ad, idx] of [["O", oIdx], ["KARGO adlı", kargoAdli]] as const) {
    if (idx < 0) continue;
    const deger = iadeSatir.map((r) => n(r[idx])).filter((x) => x !== 0);
    const mutlak = deger.map(Math.abs);
    console.log("\n② " + ad + " SÜTUNU — iade satırlarında (n=" + iadeSatir.length + ")");
    console.log("   dolu " + deger.length + " (" +
      (deger.length / iadeSatir.length * 100).toFixed(1) + "%) · boş " +
      (iadeSatir.length - deger.length));
    console.log("   negatif " + deger.filter((x) => x < 0).length +
      " · pozitif " + deger.filter((x) => x > 0).length);
    if (mutlak.length > 0) {
      console.log("   |değer|: min " + t2(Math.min(...mutlak)) + " · ortanca " +
        t2(yy(mutlak, 0.5)) + " · p95 " + t2(yy(mutlak, 0.95)) +
        " · max " + t2(Math.max(...mutlak)));
      console.log("   ⭐ TOPLAM |değer|: " + t2(mutlak.reduce((t, x) => t + x, 0)));
    }
    if (idx === kargoAdli && kargoAdli !== oIdx) break;
  }

  // ── ③ ⭐ AYRI BACAK MI — satış dosyasının kargosuyla kıyas ────────────
  console.log("\n③ ⭐ AYRI BİR KARGO BACAĞI MI — satış dosyasıyla kıyas");
  console.log("   (aynıysa bu sütun GİDİŞ kargosunu taşıyor, iade kargosunu DEĞİL)");
  const ss = (await readXlsxFile(paketiNormalle(readFileSync(SATIS)).bayt))
    .find((x) => String(x.sheet).includes("SATIŞ"))!;
  const sb = ss.data[5].map((h) => String(h ?? "").trim());
  const sj = (a: string) => sb.indexOf(a);
  /** ⚠ Satış dosyasındaki kargo: sipariş başına, TÜR=satış satırından. */
  const satisKargo = new Map<string, number>();
  for (const r of ss.data.slice(6)) {
    if (String(r[sj("TÜR")] ?? "").trim() !== "satış") continue;
    const kod = String(r[sj("Sipariş Numarası")] ?? "").trim();
    if (kod === "") continue;
    if (!satisKargo.has(kod)) satisKargo.set(kod, n(r[sj("KARGO")]));
  }
  const kolon = kargoAdli >= 0 ? kargoAdli : oIdx;
  let ayni = 0, farkli = 0, satisYok = 0;
  const ornek: string[] = [];
  for (const r of iadeSatir) {
    const kod = String(r[li("Sipariş Numarası")] ?? "").trim();
    const iadeK = Math.abs(n(r[kolon]));
    if (iadeK === 0) continue;
    const sK = satisKargo.get(kod);
    if (sK === undefined) { satisYok++; continue; }
    if (Math.abs(Math.abs(sK) - iadeK) < 0.005) ayni++;
    else {
      farkli++;
      if (ornek.length < 8) {
        ornek.push(kod.padEnd(15) + "satış " + Math.abs(sK).toFixed(2).padStart(8) +
          "  ↔  iade " + iadeK.toFixed(2).padStart(8));
      }
    }
  }
  console.log("   satış kargosuyla AYNI  : " + ayni);
  console.log("   ⭐ FARKLI               : " + farkli);
  console.log("   satış satırı yok        : " + satisYok);
  for (const o of ornek) console.log("     " + o);
  console.log("\n   ⚠ OKUMA: 'AYNI' baskınsa sütun iade bacağını DEĞİL, aynı");
  console.log("     siparişin gidiş kargosunu tekrar yazıyor olabilir.");

  // ── ④ HALİL'İN KURALI — teslim edilmemiş vaka ─────────────────────────
  console.log("\n④ HALİL'İN ÖLÇÜTÜ — `4120311526` (teslim edilmeden dönen)");
  const raz = iadeSatir.filter((r) =>
    String(r[li("Sipariş Numarası")] ?? "").trim() === "4120311526");
  for (const r of raz) {
    console.log("   iade dosyası : O=" + n(r[oIdx]).toFixed(2) +
      (kargoAdli >= 0 && kargoAdli !== oIdx
        ? " · KARGO(" + String.fromCharCode(65 + kargoAdli) + ")=" + n(r[kargoAdli]).toFixed(2)
        : ""));
  }
  console.log("   satış dosyası: KARGO=" + (satisKargo.get("4120311526") ?? 0).toFixed(2));
  console.log("   ⭐ HB PANELİ  : −94,20 (kanalın kendi belgesi — üstün kaynak)");
  console.log("   ⚠ Üçü de farklıysa hangisinin geçerli olduğu ölçülmeden yazılmaz.");

  // ── ⑤ YAZILABİLİR KÜME ────────────────────────────────────────────────
  const nolar = [...new Set(iadeSatir
    .map((r) => String(r[li("Sipariş Numarası")] ?? "").trim()).filter((x) => x !== ""))];
  const sale = new Set<string>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) }, iptalTarihi: null },
      select: { code: true },
    })) sale.add(x.code!);
  }
  const kargoluVeSistemde = iadeSatir.filter((r) =>
    Math.abs(n(r[kolon])) > 0 && sale.has(String(r[li("Sipariş Numarası")] ?? "").trim()));
  console.log("\n⑤ K73 İÇİN KAPSAM");
  console.log("   iade satırı " + iadeSatir.length + " · kargosu dolu OLAN " +
    iadeSatir.filter((r) => Math.abs(n(r[kolon])) > 0).length);
  console.log("   ⭐ hem kargosu dolu HEM satışı sistemde: " + kargoluVeSistemde.length);
  console.log("   toplam iade kargosu: " +
    t2(kargoluVeSistemde.reduce((t, r) => t + Math.abs(n(r[kolon])), 0)));
  console.log("\n   ⚠ BU, K73'ÜN ÜÇ BİLİNMEYENİNDEN YALNIZ BİRİNİ KAPATIR.");
  console.log("     Kalan ikisi hâlâ açık: `returnType` (şemada nötr değer yok)");
  console.log("     ve `saglamAdet`/`hasarliAdet` (stoğu doğrudan değiştirir).");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
