import { readFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import readXlsxFile from "read-excel-file/node";

import { PrismaClient } from "../src/generated/prisma/client";
import { paketiNormalle } from "../src/lib/tablo/paket";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  SATIŞ DOSYASI · R SÜTUNU = KARGO ÜCRETİ — ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:kargo-kolonu
 *
 *  Halil: _"Satış dosyasının R kısmında kargo ücretleri mevcut."_
 *
 *  ⛔ YAZMADAN ÖNCE ÖLÇÜLECEKLER:
 *   ① R sütununun BAŞLIĞI ne — gerçekten kargo mu?
 *   ② Kaç satırda dolu, kaçı sistemde satış olarak var?
 *   ③ Değer dağılımı makul mü (min/ortanca/max) — ve TABANI ne?
 *   ④ Zaten kargosu OLAN satışlarla çakışıyor mu, tutuyor mu?
 *   ⑤ Kargo FİRMASI dosyada var mı — yoksa yalnız tutar mı yazılabilir?
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const SATIS = "C:/Users/yapra/Desktop/excel/satis.xlsx";
const n = (h: unknown) => (Number.isFinite(Number(h)) ? Number(h) : 0);
const t2 = (x: number) => x.toFixed(2).padStart(12);

function yuzdelik(dizi: number[], y: number) {
  if (dizi.length === 0) return 0;
  const s = [...dizi].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * y))];
}

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
  const bas = ss.data[5].map((h) => String(h ?? "").trim());
  const veri = ss.data.slice(6);

  console.log("\n" + "=".repeat(100));
  console.log("SATIŞ DOSYASI — KARGO SÜTUNU ÖLÇÜMÜ (yazma YOK)");
  console.log("=".repeat(100));

  // ── ① BAŞLIK — R kaçıncı sütun, adı ne ────────────────────────────────
  console.log("\n① SÜTUN HARİTASI — R = 18. sütun (A=1)");
  bas.forEach((h, i) => {
    const harf = String.fromCharCode(65 + i);
    if (i >= 14 && i <= 20) {
      console.log("   " + harf + " (" + (i + 1) + ")  " + (h || "⛔ BAŞLIKSIZ") +
        (i === 17 ? "   ⭐ R" : ""));
    }
  });
  const rIdx = 17;
  console.log("\n   ⭐ R sütununun başlığı: \"" + (bas[rIdx] || "⛔ BAŞLIKSIZ") + "\"");
  /** ⚠ Ada güvenilmez; kolon adı bir İDDİADIR — değerlere de bakılır. */
  const kargoAdli = bas.findIndex((h) => h.toUpperCase().includes("KARGO"));
  console.log("   \"KARGO\" geçen ilk sütun: " +
    (kargoAdli < 0 ? "⛔ YOK" : String.fromCharCode(65 + kargoAdli) + " — \"" + bas[kargoAdli] + "\""));
  if (kargoAdli !== rIdx && kargoAdli >= 0) {
    console.log("   ⚠ R ile adı KARGO olan sütun AYNI DEĞİL — ikisi de ölçülüyor.");
  }

  // ── ② KAPSAM ──────────────────────────────────────────────────────────
  const satisSatir = veri.filter((r) => String(r[bas.indexOf("TÜR")] ?? "").trim() === "satış");
  const noIdx = bas.indexOf("Sipariş Numarası");
  const dolu = satisSatir.filter((r) => n(r[rIdx]) !== 0);
  console.log("\n② KAPSAM");
  console.log("   dosyadaki satış satırı : " + satisSatir.length);
  console.log("   ⭐ R DOLU (≠0)          : " + dolu.length +
    "   (" + (dolu.length / satisSatir.length * 100).toFixed(1) + "%)");
  console.log("   R boş/sıfır            : " + (satisSatir.length - dolu.length));

  const nolar = [...new Set(dolu.map((r) => String(r[noIdx] ?? "").trim()).filter((x) => x !== ""))];
  const sistemde = new Map<string, { id: string; kargo: number | null; firma: string | null }>();
  for (let k = 0; k < nolar.length; k += 400) {
    for (const x of await p.sale.findMany({
      where: { code: { in: nolar.slice(k, k + 400) } },
      select: {
        id: true, code: true, cargoAmount: true, iptalTarihi: true,
        cargoCarrier: { select: { name: true } },
      },
    })) {
      if (x.iptalTarihi) continue;
      sistemde.set(x.code!, {
        id: x.id,
        kargo: x.cargoAmount === null ? null : Number(x.cargoAmount.toString()),
        firma: x.cargoCarrier?.name ?? null,
      });
    }
  }
  console.log("   farklı sipariş no      : " + nolar.length);
  console.log("   ⭐ SİSTEMDE (iptalsiz)  : " + sistemde.size +
    " · ⛔ sistemde YOK " + (nolar.length - sistemde.size));

  // ── ③ DEĞER DAĞILIMI ──────────────────────────────────────────────────
  const degerler = dolu.map((r) => n(r[rIdx])).filter((x) => x > 0);
  const eksi = dolu.filter((r) => n(r[rIdx]) < 0).length;
  console.log("\n③ DEĞER DAĞILIMI (pozitifler, n=" + degerler.length + ")");
  console.log("   min " + t2(Math.min(...degerler)) + " · p25 " + t2(yuzdelik(degerler, 0.25)) +
    " · ortanca " + t2(yuzdelik(degerler, 0.5)));
  console.log("   p75 " + t2(yuzdelik(degerler, 0.75)) + " · p95 " + t2(yuzdelik(degerler, 0.95)) +
    " · max " + t2(Math.max(...degerler)));
  console.log("   ⭐ TOPLAM " + t2(degerler.reduce((t, x) => t + x, 0)));
  console.log("   ⛔ NEGATİF değer: " + eksi + (eksi > 0 ? "   ← ayrı incelenmeli" : ""));

  // ── ④ ÇAKIŞMA — zaten kargosu olanlarla tutuyor mu ────────────────────
  console.log("\n④ ÇAKIŞMA — sistemde ZATEN kargosu olan satışlar");
  let zaten = 0, tutan = 0, tutmayan = 0;
  const ornek: string[] = [];
  for (const r of dolu) {
    const kod = String(r[noIdx] ?? "").trim();
    const s = sistemde.get(kod);
    if (!s || s.kargo === null) continue;
    zaten++;
    const fark = Math.abs(s.kargo - n(r[rIdx]));
    if (fark < 0.005) tutan++;
    else {
      tutmayan++;
      if (ornek.length < 6) {
        ornek.push(kod + "  defter " + s.kargo.toFixed(2) + "  ↔  dosya " + n(r[rIdx]).toFixed(2) +
          "  fark " + (s.kargo - n(r[rIdx])).toFixed(2));
      }
    }
  }
  console.log("   zaten kargosu olan     : " + zaten);
  console.log("     ⭐ kuruşuna TUTAN     : " + tutan);
  console.log("     ⛔ TUTMAYAN           : " + tutmayan);
  for (const o of ornek) console.log("       " + o);
  console.log("   ⚠ Tutan varsa dosya defteri DOĞRULUYOR; tutmayan varsa hangi");
  console.log("     tarafın geçerli olduğu ölçülmeden yazılmaz.");

  /**
   * ⭐ ④b TABAN — EN KRİTİK ÖLÇÜM.
   * `Sale.cargoAmount` KDV **HARİÇ** saklanıyor (`lib/kargo-kdv.ts`:
   * "ölçüldü 32/32 satışta KARGO kesintisi = cargoAmount × 1,20").
   * Dosyanın R sütunu hangi tabanda? Yanlış tabanda yazmak %20 hata demek.
   */
  console.log("\n④b TABAN — dosya KDV DAHİL mi HARİÇ mi (defterle kıyas)");
  let esitHaric = 0, esitDahil = 0, hicbiri = 0;
  const oranlar: number[] = [];
  for (const r of dolu) {
    const kod = String(r[noIdx] ?? "").trim();
    const s = sistemde.get(kod);
    if (!s || s.kargo === null || s.kargo === 0) continue;
    const d = n(r[rIdx]);
    if (Math.abs(d - s.kargo) < 0.02) esitHaric++;
    else if (Math.abs(d - s.kargo * 1.2) < 0.02) esitDahil++;
    else hicbiri++;
    oranlar.push(d / s.kargo);
  }
  console.log("   dosya == defter          (HARİÇ taban) : " + esitHaric);
  console.log("   ⭐ dosya == defter × 1,20 (DAHİL taban) : " + esitDahil);
  console.log("   ikisi de değil                         : " + hicbiri);
  if (oranlar.length > 0) {
    console.log("   oran (dosya ÷ defter): min " + yuzdelik(oranlar, 0).toFixed(4) +
      " · p25 " + yuzdelik(oranlar, 0.25).toFixed(4) +
      " · ortanca " + yuzdelik(oranlar, 0.5).toFixed(4) +
      " · p75 " + yuzdelik(oranlar, 0.75).toFixed(4) +
      " · max " + yuzdelik(oranlar, 0.999).toFixed(4));
    const bir2 = oranlar.filter((x) => Math.abs(x - 1.2) < 0.005).length;
    const bir0 = oranlar.filter((x) => Math.abs(x - 1.0) < 0.005).length;
    console.log("   ⭐ oranı 1,20 olan: " + bir2 + " · oranı 1,00 olan: " + bir0 +
      " · toplam " + oranlar.length);
  }
  console.log("   ⚠ Bu 147 kaydın hemen hepsi AMAZON siparişi (`403-…` biçimi):");
  const amz = [...sistemde.entries()].filter(([k]) => /^\d{3}-\d{7}-\d{7}$/.test(k)).length;
  console.log("     Amazon biçimli sipariş numarası: " + amz + " / " + sistemde.size);

  // ── ⑤ FİRMA VAR MI ────────────────────────────────────────────────────
  console.log("\n⑤ KARGO FİRMASI — dosyada var mı");
  const firmaIdx = bas.findIndex((h) =>
    /firma|taşıyıcı|tasiyici|kurye/i.test(h) && !/tedarik/i.test(h));
  console.log("   firma sütunu: " + (firmaIdx < 0 ? "⛔ YOK" :
    String.fromCharCode(65 + firmaIdx) + " — \"" + bas[firmaIdx] + "\""));
  const desiIdx = bas.findIndex((h) => /desi/i.test(h));
  console.log("   desi sütunu : " + (desiIdx < 0 ? "⛔ YOK" :
    String.fromCharCode(65 + desiIdx) + " — \"" + bas[desiIdx] + "\""));
  console.log("\n   ⚠ Firma yoksa YALNIZ TUTAR yazılabilir. `cargoCarrierId` boş");
  console.log("     kalır — ve boş kalması bir BEYANDIR: hangi firmayla gittiği");
  console.log("     bilinmiyor. Vekil bir firma seçmek, olmayan bir bilgi uydurmaktır.");

  // ── ⑥ YAZILABİLİR KÜME ────────────────────────────────────────────────
  let yazilabilir = 0, tutarToplam = 0;
  for (const r of dolu) {
    const kod = String(r[noIdx] ?? "").trim();
    const s = sistemde.get(kod);
    if (!s || s.kargo !== null) continue;
    yazilabilir++;
    tutarToplam += n(r[rIdx]);
  }
  console.log("\n⑥ YAZILABİLİR KÜME (sistemde var + kargosu henüz BOŞ)");
  console.log("   ⭐ satış " + yazilabilir + " · toplam kargo " + t2(tutarToplam));
  console.log("   ⚠ Bu tutar NET-2'yi AŞAĞI çeker — bugün eksik düşülen gider.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. HÜKÜM YOK.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
