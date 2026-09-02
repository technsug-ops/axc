/**
 * ============================================================================
 *  YAZILAN KARGO DEĞERLERİ DOĞRU MU — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:kargo-degeri-dogrula
 *
 *  BETIK SINIFI: SUREKLI. ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ NİYE BU AYRI BİR ÖLÇÜM ───────────────────────────────────────────
 *  Kullanıcı: _"kargo kısmına tekrar baktın mı"_
 *
 *  ⛔ VE HAKLI — YANLIŞ SORUYU SORMUŞTUM. Şunları ölçtüm:
 *    · kaç satışta kargo VAR        (5806)
 *    · kaç satışta YOK              (57)
 *    · çift düşüm mümkün mü         (değil — alan mutlak)
 *  Hiçbiri **"yazılan değer DOĞRU MU"** sorusunu sormuyor. 5806 satırın
 *  hepsi yanlış olsaydı üç ölçüm de aynı sonucu verirdi.
 *  _(Anayasa: "alanın DOLU olması, olayın doğru olduğunu göstermez".)_
 *
 *  ── ÖLÇÜT ──────────────────────────────────────────────────────────────
 *  Yazım kuralı: `cargoAmount = dosyadaki KARGO ÷ 1,20` (kuruşuna).
 *  Bu kural her satırda TEKRAR hesaplanıp defterle karşılaştırılıyor.
 *
 *  ⚠ ÜÇ SONUÇ AYRI SAYILIR:
 *    (a) kuruşuna TUTUYOR        → kural uygulanmış
 *    (b) SAPIYOR                 → ⛔ değer yanlış ya da elle değişmiş
 *    (c) dosyada YOK             → kıyaslanamaz; "doğru" da denmez
 * ============================================================================
 */

import { readFileSync, writeFileSync } from "node:fs";

import readXlsxFile from "read-excel-file/node";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { paketiNormalle } from "../src/lib/tablo/paket";

const DOSYA = "C:/Users/yapra/Desktop/excel/satis.xlsx";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
/** Yazım betiğiyle AYNI yuvarlama — kuruşa. */
function kurus(x: number): number {
  return Math.round(x * 100) / 100;
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
  console.log("  YAZILAN KARGO DEĞERLERİ DOĞRU MU (salt okuma)");
  console.log("=".repeat(92));

  /** Kaynak — yazım betiğiyle BİREBİR aynı sayfa/satır/sütun. */
  const sayfalar = await readXlsxFile(paketiNormalle(readFileSync(DOSYA)).bayt);
  const sayfa = sayfalar.find((x) =>
    String((x as unknown as { sheet: string }).sheet).includes("SATIŞ"),
  ) as unknown as { data: unknown[][] } | undefined;
  if (sayfa === undefined) {
    console.log("  ⛔ 'SATIŞ' sayfası yok — ÖLÇÜM YOK.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const veri = sayfa.data;
  const bas = (veri[5] ?? []).map((c) => String(c ?? "").trim());
  const iNo = bas.indexOf("Sipariş Numarası");
  const iKargo = bas.indexOf("KARGO");
  const iTur = bas.indexOf("TÜR");
  if (iNo < 0 || iKargo < 0) {
    console.log("  ⛔ SÜTUN YOK — ÖLÇÜM YOK.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const dosya = new Map<string, { deger: number; celiski: boolean }>();
  for (const r of veri.slice(6)) {
    if (iTur >= 0 && String(r[iTur] ?? "").trim() !== "satış") continue;
    const no = String(r[iNo] ?? "").trim();
    if (no === "") continue;
    const d = Number(String(r[iKargo] ?? "").replace(",", "."));
    if (!Number.isFinite(d) || d === 0) continue;
    const o = dosya.get(no);
    if (o === undefined) dosya.set(no, { deger: d, celiski: false });
    else if (Math.abs(o.deger - d) > 0.005) o.celiski = true;
  }
  console.log(`\n  dosyada kargolu sipariş: ${dosya.size}`);

  const satislar = await prisma.sale.findMany({
    where: { cargoAmount: { not: null } },
    select: {
      code: true,
      soldAt: true,
      cargoAmount: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
    },
  });
  console.log(`  defterde kargolu satış : ${satislar.length}`);

  let tutan = 0;
  let sapan = 0;
  let dosyadaYok = 0;
  let celiskili = 0;
  let sapmaToplam = 0;
  const sapanlar: string[] = [];
  const satirlar = ["durum;siparisNo;tarih;kanal;defter;dosya;beklenen;fark"];

  for (const s of satislar) {
    const kod = s.code ?? "";
    const defter = Number((s.cargoAmount ?? 0).toString());
    const d = dosya.get(kod);
    if (d === undefined) {
      dosyadaYok += 1;
      satirlar.push(
        ["DOSYADA_YOK", kod, s.soldAt.toISOString().slice(0, 10),
          s.channelAccount.channel.name, defter.toFixed(2), "", "", ""].join(";"),
      );
      continue;
    }
    if (d.celiski) {
      celiskili += 1;
      satirlar.push(
        ["CELISKILI", kod, s.soldAt.toISOString().slice(0, 10),
          s.channelAccount.channel.name, defter.toFixed(2),
          d.deger.toFixed(2), "", ""].join(";"),
      );
      continue;
    }
    const beklenen = kurus(d.deger / 1.2);
    const fark = defter - beklenen;
    if (Math.abs(fark) < 0.005) {
      tutan += 1;
      satirlar.push(
        ["TUTUYOR", kod, s.soldAt.toISOString().slice(0, 10),
          s.channelAccount.channel.name, defter.toFixed(2),
          d.deger.toFixed(2), beklenen.toFixed(2), "0.00"].join(";"),
      );
    } else {
      sapan += 1;
      sapmaToplam += Math.abs(fark);
      if (sapanlar.length < 15) {
        sapanlar.push(
          `${kod} defter ${para(defter)} · dosya ${para(d.deger)}` +
            ` · beklenen ${para(beklenen)} · fark ${para(fark)}`,
        );
      }
      satirlar.push(
        ["SAPAN", kod, s.soldAt.toISOString().slice(0, 10),
          s.channelAccount.channel.name, defter.toFixed(2),
          d.deger.toFixed(2), beklenen.toFixed(2), fark.toFixed(2)].join(";"),
      );
    }
  }

  console.log("\n① YAZILAN DEĞER ↔ KURAL (dosya ÷ 1,20)");
  console.log(`   ✓ kuruşuna TUTUYOR : ${tutan}`);
  console.log(
    `   ⛔ SAPAN            : ${sapan}   toplam sapma ₺${para(sapmaToplam)}`,
  );
  console.log(`   ⚠ dosyada ÇELİŞKİLİ : ${celiskili}   ← yazım bilerek atlar`);
  console.log(
    `   ⚠ dosyada YOK       : ${dosyadaYok}   ← kıyaslanamaz, 'doğru' DENMEZ`,
  );
  const kapsam = tutan + sapan + celiskili + dosyadaYok;
  if (kapsam !== satislar.length) {
    console.log(`   ⛔ KOVA TOPLAMI ${kapsam} ≠ ${satislar.length}`);
    process.exitCode = 1;
  }
  if (sapanlar.length > 0) {
    console.log("\n   SAPANLAR:");
    for (const x of sapanlar) console.log(`      ${x}`);
  }

  /**
   * ② TABAN KANITI — oran dağılımı.
   * Dosya KDV DAHİL ise oran 1,20'ye oturmalı. Oturmuyorsa yazımın
   * dayandığı taban kararı yanlıştı ve 5806 satır birden kayar.
   */
  console.log("\n② TABAN KANITI — dosya ÷ defter oranı");
  const oranlar: number[] = [];
  for (const s of satislar) {
    const d = dosya.get(s.code ?? "");
    const defter = Number((s.cargoAmount ?? 0).toString());
    if (d === undefined || d.celiski || defter === 0) continue;
    oranlar.push(d.deger / defter);
  }
  oranlar.sort((a, b) => a - b);
  const yuzde = (p: number) =>
    oranlar.length === 0
      ? 0
      : oranlar[Math.min(oranlar.length - 1, Math.floor((oranlar.length * p) / 100))];
  console.log(`   örneklem n=${oranlar.length}`);
  console.log(
    `   p05 ${yuzde(5).toFixed(4)} · p25 ${yuzde(25).toFixed(4)}` +
      ` · ORTANCA ${yuzde(50).toFixed(4)}` +
      ` · p75 ${yuzde(75).toFixed(4)} · p95 ${yuzde(95).toFixed(4)}`,
  );
  const tam120 = oranlar.filter((o) => Math.abs(o - 1.2) < 0.0005).length;
  const tam100 = oranlar.filter((o) => Math.abs(o - 1.0) < 0.0005).length;
  console.log(`   ⭐ oranı tam 1,20 : ${tam120}   ← KDV DAHİL kanıtı`);
  console.log(`   oranı tam 1,00 : ${tam100}   ← KDV HARİÇ olsaydı bu büyürdü`);

  const cikti = "veri/ozel/kargo-degeri.csv";
  writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ TAM LİSTE: ${cikti} (${satirlar.length - 1} satır)`);

  console.log("\n" + "-".repeat(92));
  console.log("  ⛔ HÜKÜM SINIRI. 'Dosyada yok' kovası bir kusur DEĞİL ve");
  console.log("     bir teyit de DEĞİL: o satırlar bu ölçütle kıyaslanamaz.");
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
