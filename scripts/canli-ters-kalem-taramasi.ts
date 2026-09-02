/**
 * ============================================================================
 *  TERS KALEM TARAMASI — NEGATİF FİYATLA "İPTAL" DESENİ · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ters-kalem
 *
 *  BETIK SINIFI: SUREKLI. ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ NİYE ─────────────────────────────────────────────────────────────
 *  `11265267349`de bulundu: aynı üründen İKİ kalem, biri `+2.550`, öteki
 *  `−2.550`. Fiyat ve komisyon netleşiyor, **MALİYET netleşmiyor** —
 *  `1.934 + 1.999 = 3.933` defterde kalıyor ve satış ₺3.946 zararda
 *  görünüyor.
 *
 *  Kullanıcı sordu: _"bunun gibi başka hata var mı"_
 *
 *  ⚠ VE ÖNCEKİ TARAMAM BUNU SAYAMAZDI: `canli:satis-saglik` SATIŞ
 *  düzeyinde sayıyordu ("negatif birim: 1 satış"). Desen KALEM
 *  düzeyindedir; bir satışta üç ters çift olabilir ve tek satır sayılırdı.
 *  _(Anayasa: "bir sayı etiketiyle taşınır; birim de etikettir".)_
 *
 *  ── ⚠ VE "TERS KALEM" HER ZAMAN HATA DEĞİLDİR ──────────────────────────
 *  Negatif bir satır meşru bir düzeltme de olabilir. Ayırt edici ölçüt
 *  şudur: **maliyet netleşiyor mu?** Netleşiyorsa defter doğru; netleşmiyor
 *  ve maliyet kalıyorsa satış sahte zarar taşır. İkisi AYRI sayılır.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

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

  console.log("=".repeat(94));
  console.log("  TERS KALEM TARAMASI — negatif fiyatla 'iptal' deseni");
  console.log("=".repeat(94));

  const satislar = await prisma.sale.findMany({
    select: {
      code: true,
      soldAt: true,
      iptalTarihi: true,
      profitStatus: true,
      net2Amount: true,
      importKaynak: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
          stockMovements: {
            select: { quantityDelta: true, unitCostAmount: true },
          },
        },
      },
    },
  });
  const kalemSayisi = satislar.reduce((t, s) => t + s.items.length, 0);
  console.log(`\n  satış ${satislar.length}  ·  KALEM ${kalemSayisi}`);

  /**
   * ① KALEM DÜZEYİNDE AYKIRILIK — BİRİM: KALEM
   */
  const negatifFiyat: { kod: string; sku: string; fiyat: number }[] = [];
  const negatifAdet: { kod: string; sku: string; adet: number }[] = [];
  for (const s of satislar) {
    for (const it of s.items) {
      const f = Number(it.unitPriceAmount.toString());
      if (f < 0) {
        negatifFiyat.push({ kod: s.code ?? "—", sku: it.variant.sku, fiyat: f });
      }
      if (it.quantity < 0) {
        negatifAdet.push({ kod: s.code ?? "—", sku: it.variant.sku, adet: it.quantity });
      }
    }
  }
  console.log("\n① KALEM DÜZEYİNDE (birim: KALEM, satış değil)");
  console.log(`   ⛔ negatif FİYATLI kalem : ${negatifFiyat.length}`);
  console.log(`   ⛔ negatif ADETLİ kalem  : ${negatifAdet.length}`);
  for (const x of negatifFiyat.slice(0, 20)) {
    console.log(`      ${x.kod.padEnd(14)} ${x.sku.padEnd(16)} ${para(x.fiyat)}`);
  }
  for (const x of negatifAdet.slice(0, 20)) {
    console.log(`      ADET  ${x.kod.padEnd(14)} ${x.sku.padEnd(16)} ${x.adet}`);
  }

  /**
   * ② TERS ÇİFT DESENİ — AYNI SATIŞ, AYNI VARYANT, FİYATLAR SIFIRLANIYOR
   *
   * ⭐ AYIRT EDİCİ ÖLÇÜT MALİYET: fiyat netleşip maliyet netleşmiyorsa
   * satış SAHTE ZARAR taşır. Netleşiyorsa defter doğrudur ve bu bir
   * kusur DEĞİLDİR — ikisi ayrı sayılır.
   */
  console.log("\n② TERS ÇİFT DESENİ (aynı satış + aynı varyant, fiyat sıfırlanıyor)");
  type Bulgu = {
    kod: string;
    tarih: Date;
    kanal: string;
    kaynak: string | null;
    sku: string;
    urun: string;
    fiyatNet: number;
    maliyetNet: number;
    net2: number | null;
  };
  const bozuk: Bulgu[] = [];
  const temiz: Bulgu[] = [];
  for (const s of satislar) {
    const gruplar = new Map<string, typeof s.items>();
    for (const it of s.items) {
      const g = gruplar.get(it.variant.id) ?? [];
      g.push(it);
      gruplar.set(it.variant.id, g);
    }
    for (const [, g] of gruplar) {
      if (g.length < 2) continue;
      const artiVar = g.some((i) => Number(i.unitPriceAmount.toString()) > 0);
      const eksiVar = g.some((i) => Number(i.unitPriceAmount.toString()) < 0);
      if (!artiVar || !eksiVar) continue;
      const fiyatNet = g.reduce(
        (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
        0,
      );
      /**
       * ⚠ MALİYET `Math.abs(quantityDelta)` İLE TOPLANMIYOR — İŞARETİYLE.
       * Ters kaydın hareketi POZİTİF delta taşıyorsa (mal geri geliyorsa)
       * maliyet netleşir. Mutlak değer alsaydım netleşen bir düzeltmeyi
       * de "bozuk" sayardım.
       */
      const maliyetNet = g.reduce(
        (t, i) =>
          t +
          i.stockMovements.reduce(
            (u, h) =>
              u +
              (h.unitCostAmount === null
                ? 0
                : Number(h.unitCostAmount.toString()) * -h.quantityDelta),
            0,
          ),
        0,
      );
      const b: Bulgu = {
        kod: s.code ?? "—",
        tarih: s.soldAt,
        kanal: s.channelAccount.channel.name,
        kaynak: s.importKaynak,
        sku: g[0].variant.sku,
        urun: g[0].variant.product.name,
        fiyatNet,
        maliyetNet,
        net2: s.net2Amount === null ? null : Number(s.net2Amount.toString()),
      };
      /** Fiyat sıfırlanmış ama maliyet duruyorsa BOZUK. */
      if (Math.abs(fiyatNet) < 0.02 && Math.abs(maliyetNet) > 0.02) bozuk.push(b);
      else temiz.push(b);
    }
  }
  console.log(`   ⛔ BOZUK (fiyat netleşti, MALİYET kaldı) : ${bozuk.length}`);
  console.log(`   ✓ netleşen / kusursuz ters çift          : ${temiz.length}`);
  for (const b of bozuk) {
    console.log(
      `      ${b.kod.padEnd(14)} ${b.tarih.toISOString().slice(0, 10)}` +
        ` ${b.kanal.padEnd(12)} ${b.sku.padEnd(15)}` +
        ` fiyatNet ${para(b.fiyatNet).padStart(9)}` +
        ` maliyetNet ${para(b.maliyetNet).padStart(11)}` +
        ` NET-2 ${para(b.net2 ?? 0).padStart(11)}`,
    );
    console.log(`         ${b.urun.slice(0, 60)}   kaynak: ${b.kaynak ?? "(elle)"}`);
  }

  /**
   * ③ GENİŞ DESEN — TERS ÇİFT OLMASA DA CİRO 0 / MALİYET VAR
   * Ters çift ölçütü aynı VARYANT şartı koyuyor; farklı varyantlarla
   * yapılmış bir sıfırlama onu kaçırır. Bu bölüm kümeyi genişletir.
   */
  console.log("\n③ GENİŞ DESEN — ciro ≈ 0 ama maliyet VAR (varyant şartı YOK)");
  let genis = 0;
  for (const s of satislar) {
    if (s.iptalTarihi !== null) continue;
    const ciro = s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
    const mal = s.items.reduce(
      (t, i) =>
        t +
        i.stockMovements.reduce(
          (u, h) =>
            u +
            (h.unitCostAmount === null
              ? 0
              : Number(h.unitCostAmount.toString()) * -h.quantityDelta),
          0,
        ),
      0,
    );
    if (Math.abs(ciro) < 0.02 && Math.abs(mal) > 0.02) {
      genis += 1;
      console.log(
        `      ⛔ ${String(s.code).padEnd(14)} ciro ${para(ciro)}` +
          ` · maliyet ${para(mal)} · NET-2 ${para(Number(s.net2Amount ?? 0))}`,
      );
    }
  }
  console.log(`   toplam: ${genis}`);

  const satirlar = ["sinif;siparisNo;tarih;kanal;kaynak;sku;fiyatNet;maliyetNet;net2;urun"];
  for (const [sinif, liste] of [
    ["BOZUK", bozuk],
    ["NETLESEN", temiz],
  ] as [string, Bulgu[]][]) {
    for (const b of liste) {
      satirlar.push(
        [
          sinif, b.kod, b.tarih.toISOString().slice(0, 10), b.kanal,
          b.kaynak ?? "", b.sku, b.fiyatNet.toFixed(2), b.maliyetNet.toFixed(2),
          b.net2 === null ? "" : b.net2.toFixed(2), b.urun.replace(/;/g, ","),
        ].join(";"),
      );
    }
  }
  const cikti = "veri/ozel/ters-kalem.csv";
  writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ TAM LİSTE: ${cikti} (${satirlar.length - 1} satır)`);

  console.log("\n" + "-".repeat(94));
  console.log("  ⛔ HÜKÜM SINIRI. 'Netleşen' ters çift bir KUSUR DEĞİLDİR —");
  console.log("     meşru bir düzeltme olabilir. Kusur, maliyeti KALAN");
  console.log("     çiftlerdedir; onlar sahte zarar taşır.");
  console.log("=".repeat(94) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
