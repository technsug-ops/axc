/**
 * ============================================================================
 *  KARDEŞ PARTİ SAPMASI — AYNI ÜRÜN, AYNI GÜN, FARKLI FİYAT
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kardes-parti-sapmasi
 *
 *  BETIK SINIFI: SUREKLI. ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR.
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı gerekiyor.
 *
 *  ── ⛔ NİYE ZAMAN EKSENİ YOK ────────────────────────────────────────────
 *  Anayasa: _"zaman içindeki fiyat farkı şüphe üretmez"_ — iş modeli
 *  arbitraj, kampanya döneminde alınır ve aynı ürün bir yıl arayla iki
 *  farklı fiyata alınmış olabilir; ikisi de doğrudur.
 *  ⭐ Bu tarama onun KAPSAMI DIŞINDA: kıyas **aynı gün · aynı varyant ·
 *  aynı tedarikçi · aynı para birimi**. Aynı gün 13 kat fark, gidişat
 *  varsayımı değil ölçülebilir bir aykırılıktır.
 *
 *  ── ⛔ İPTALLİ ALIM DIŞARIDA — VE BU BİR DÜZELTMEDİR ────────────────────
 *  İlk tarama (03.09, geçici betik) iptalli alımları ELEMİYORDU ve
 *  `axcali1603` (Zolo powerbank) `1,84×` diye şüpheli listesine düştü.
 *  Halil baktı ve gördü:
 *
 *      ALM-BI-260814-01   ₺1.111,00   ⛔ İPTAL
 *      ALM-BI-260814-02   ₺2.048,00   ✓ teslim alındı
 *
 *  Yani ortada fiyat farkı YOK — iptal edilmiş bir kayıt var. Karşılaştırma
 *  "kaybetmeyen" bir kaydı hesaba katıyordu.
 *  _(Anayasa: "kayıp abartısı, kayıp küçültmesi kadar yanlıştır — bir kayıp
 *  rakamı yazarken sorulur: bu sayının içinde KAYBETMEYEN kayıt var mı?")_
 *
 *  ⚠ VE `DRAFT` DE ELENİR: taslak bir alım henüz olmuş bir alım değildir.
 *
 *  ── ⚠ SONUÇ HÜKÜM DEĞİL, DAVETTİR ───────────────────────────────────────
 *  Aykırı değer önce DOĞRULANIR, düzeltilmez. `ALM-HB-260427-07` tam bunun
 *  örneği: `2,00×` çıktı, Halil faturaya baktı ve **₺1.500 DOĞRU** dedi
 *  (alış hesabını kendisi düzeltmişti). Ölçüm baktırdı, hüküm vermedi.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ⭐ EŞİK ÖLÇÜLDÜ, UYDURULMADI — 03.09.2026, n=538 grup:
 *   p50 1,000 · p75 1,011 · p90 1,051 · p95 1,099 · p99 1,319
 *   ────────── GÖVDE BİTER ──────────
 *   1,84 · 2,00 · 3,11 · 14,21
 * Eşik gövdenin bittiği yerin ÜSTÜNE, gediğe kondu.
 * ⚠ Örneklem büyüyünce yeniden ölçülür; bu betik dağılımı HER KOŞUMDA
 * basar ki eşiğin hâlâ gedikte durduğu görülsün.
 */
const ESIK = 1.5;

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(92));
  console.log("  KARDEŞ PARTİ SAPMASI — aynı ürün · aynı gün · salt okuma");
  console.log("=".repeat(92));

  const hepsi = await prisma.purchaseItem.count();
  const kalemler = await prisma.purchaseItem.findMany({
    /** ⛔ İPTALLİ VE TASLAK ALIM HESABA GİRMEZ. */
    where: { purchase: { status: { notIn: ["CANCELLED", "DRAFT"] } } },
    select: {
      quantity: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
      purchase: {
        select: {
          code: true,
          purchasedAt: true,
          status: true,
          supplierOrderNo: true,
          supplier: { select: { name: true } },
        },
      },
    },
  });
  console.log(
    `\n  alım kalemi ${hepsi} · iptalli/taslak ELENDİ → ${kalemler.length}` +
      `  (elenen ${hepsi - kalemler.length})`,
  );

  /* ── GRUPLAMA: varyant + gün + tedarikçi + para birimi ─────────────── */
  const grup = new Map<string, typeof kalemler>();
  for (const k of kalemler) {
    const g = [
      k.variant.sku,
      k.purchase.purchasedAt.toISOString().slice(0, 10),
      k.purchase.supplier?.name ?? "—",
      k.unitCostCurrency,
    ].join("|");
    if (!grup.has(g)) grup.set(g, []);
    grup.get(g)!.push(k);
  }
  const coklu = [...grup.entries()].filter(([, v]) => v.length >= 2);

  type Sapma = {
    oran: number;
    sku: string;
    gun: string;
    tedarikci: string;
    min: number;
    max: number;
    kalemler: typeof kalemler;
  };
  const oranlar: Sapma[] = [];
  let sifirli = 0;
  for (const [g, v] of coklu) {
    const bl = v.map((x) => Number(x.unitCostAmount.toString()));
    const min = Math.min(...bl);
    const max = Math.max(...bl);
    /** ⛔ SIFIRA BÖLÜNMEZ — sıfır maliyet ayrı bir bozukluktur, ayrı sayılır. */
    if (min <= 0) {
      sifirli += 1;
      continue;
    }
    const [sku, gun, tedarikci] = g.split("|");
    oranlar.push({ oran: max / min, sku, gun, tedarikci, min, max, kalemler: v });
  }
  oranlar.sort((a, b) => a.oran - b.oran);

  console.log("\n① DAĞILIM — max ÷ min birim maliyet");
  if (oranlar.length === 0) {
    console.log("   ⛔ ÖLÇÜLECEK GRUP YOK — hüküm verilemez.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const q = (n: number) =>
    oranlar[Math.min(oranlar.length - 1, Math.floor((oranlar.length * n) / 100))]
      .oran;
  console.log(
    `   grup ${oranlar.length}  ·  sıfır maliyetli grup ${sifirli} (ayrı, orana girmedi)`,
  );
  for (const n of [50, 75, 90, 95, 99]) {
    console.log(`   p${String(n).padStart(2)}  ${q(n).toFixed(3)}×`);
  }
  console.log(`   max  ${oranlar[oranlar.length - 1].oran.toFixed(3)}×`);
  /**
   * ⭐ EŞİK HÂLÂ GEDİKTE Mİ — her koşumda ölçülür.
   * p99'un üstünde ve en büyük değerin altında olmalı; değilse eşik
   * dağılımın İÇİNE düşmüş ve her satırda yanar.
   */
  const gedikte = ESIK > q(99) && ESIK < oranlar[oranlar.length - 1].oran;
  console.log(
    `   eşik ${ESIK.toFixed(2)}×  ·  p99 ${q(99).toFixed(3)}×  →  ` +
      (gedikte
        ? "⭐ eşik hâlâ GEDİKTE"
        : "⚠ EŞİK DAĞILIMIN İÇİNE DÜŞMÜŞ — yeniden ölçülmeli"),
  );

  /* ── ÜST KUYRUK ────────────────────────────────────────────────────── */
  const kuyruk = oranlar.filter((x) => x.oran >= ESIK).reverse();
  console.log(`\n② ÜST KUYRUK — oran ≥ ${ESIK.toFixed(2)}× (${kuyruk.length} grup)`);
  const satirlar = ["oran;sku;gun;tedarikci;minBirim;maxBirim;urun;alimlar"];
  for (const x of kuyruk) {
    /** ⚠ YÖN YAZILIR: aykırı olan YÜKSEK mi DÜŞÜK mü. */
    const bl = x.kalemler.map((k) => Number(k.unitCostAmount.toString()));
    const enCokSayi = bl.filter((b) => Math.abs(b - x.max) < 0.005).length;
    const yon = enCokSayi === 1 ? "aykırı = YÜKSEK olan" : "aykırı = DÜŞÜK olan";
    console.log(
      `\n   ${x.oran.toFixed(2)}×  ${x.sku.padEnd(15)} ${x.gun} · ${x.tedarikci}` +
        `   ${para(x.min)} → ${para(x.max)}   [${yon}]`,
    );
    console.log(`        ${x.kalemler[0].variant.product.name.slice(0, 56)}`);
    for (const k of [...x.kalemler].sort((a, b) =>
      a.purchase.code.localeCompare(b.purchase.code),
    )) {
      console.log(
        `        ${k.purchase.code.padEnd(20)} x${k.quantity}` +
          ` · ${para(Number(k.unitCostAmount.toString())).padStart(10)}` +
          ` · ${String(k.purchase.status).padEnd(10)}` +
          ` · sip ${k.purchase.supplierOrderNo ?? "—"}`,
      );
    }
    satirlar.push(
      [
        x.oran.toFixed(3),
        x.sku,
        x.gun,
        x.tedarikci,
        x.min.toFixed(2),
        x.max.toFixed(2),
        x.kalemler[0].variant.product.name.replace(/;/g, ","),
        x.kalemler
          .map(
            (k) =>
              `${k.purchase.code}=${Number(k.unitCostAmount.toString()).toFixed(2)}`,
          )
          .join(" | "),
      ].join(";"),
    );
  }
  const yol = "raporlar/kardes-parti-sapmasi.csv";
  writeFileSync(yol, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ LİSTE: ${yol} (${satirlar.length - 1} satır)`);

  console.log("\n" + "-".repeat(92));
  console.log("  ⛔ BU BİR HÜKÜM DEĞİL, DAVETTİR. Aykırı değer önce faturayla");
  console.log("     DOĞRULANIR — düzeltilmez. Gerçek çıkan değer yaşar.");
  console.log("     Kanıt: ALM-HB-260427-07 `2,00×` çıktı ve DOĞRU çıktı.");
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
