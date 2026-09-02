/**
 * ============================================================================
 *  SATIŞ DEFTERİ SAĞLIK TARAMASI — SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:satis-saglik
 *
 *  BETIK SINIFI: SUREKLI — soru tekrarladıkça koşulur. HİÇBİR ŞEY YAZMAZ.
 *
 *  ── ⛔ SORU ─────────────────────────────────────────────────────────────
 *  Kullanıcı, ₺0,00 tutarlı ve −₺3.288 zararda görünen bir satış bulup
 *  sordu: _"daha başka problem var mı? Kargo kısmında API'den önce problem
 *  yoktu. Satışlarda da hakeza."_
 *
 *  ⚠ TEK SATIŞA BAKARAK CEVAPLANMAZ. "Başka var mı" sorusunun cevabı
 *  SAYIMDIR: kaç satış hangi aykırılığı taşıyor, ve bu aykırılıklar
 *  ZAMANDA nereye kümeleniyor.
 *
 *  ⛔ VE "API'DEN ÖNCE YOKTU" BİR İDDİADIR — SINANIR, VARSAYILMAZ.
 *  Ölçüt: `importKaynak` alanı ve `createdAt` dağılımı. Aykırılıklar tek
 *  bir kaynağa kümeleniyorsa iddia desteklenir; her kaynağa yayılıyorsa
 *  çürür. _(Anayasa: "yokluk iddiası da iddiadır"; "iki okumayla da uyumlu
 *  bir gözlem hiçbirini kanıtlamaz".)_
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

  console.log("=".repeat(90));
  console.log("  SATIŞ DEFTERİ SAĞLIK TARAMASI (salt okuma)");
  console.log("=".repeat(90));

  const satislar = await prisma.sale.findMany({
    select: {
      code: true,
      soldAt: true,
      createdAt: true,
      iptalTarihi: true,
      profitStatus: true,
      net1Amount: true,
      net2Amount: true,
      cargoAmount: true,
      importKaynak: true,
      channelAccount: { select: { channel: { select: { name: true } } } },
      items: {
        select: {
          quantity: true,
          unitPriceAmount: true,
          variant: { select: { sku: true, product: { select: { name: true } } } },
        },
      },
      fees: { select: { code: true, amount: true } },
    },
  });
  const acik = satislar.filter((s) => s.iptalTarihi === null);
  console.log(`\n  toplam satış ${satislar.length}  ·  açık ${acik.length}`);

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ① AYKIRILIK SINIFLARI — HER BİRİ AYRI SAYILIR
   * ---------------------------------------------------------------------
   *  ⚠ TEK "sorunlu satış" RAKAMI BASILMAZ. Sınıflar farklı işlere yol
   *  açıyor: ciro 0 ile maliyetsiz satış aynı şey değil.
   * ══════════════════════════════════════════════════════════════════════
   */
  type Sinif = {
    ad: string;
    aciklama: string;
    tut: (s: (typeof acik)[number]) => boolean;
  };
  const ciro = (s: (typeof acik)[number]) =>
    s.items.reduce(
      (t, i) => t + Number(i.unitPriceAmount.toString()) * i.quantity,
      0,
    );
  const net2 = (s: (typeof acik)[number]) =>
    s.net2Amount === null ? null : Number(s.net2Amount.toString());

  const SINIFLAR: Sinif[] = [
    {
      ad: "CIRO_SIFIR",
      aciklama: "ciro ₺0 — birim fiyat hiç yazılmamış",
      tut: (s) => ciro(s) === 0,
    },
    {
      ad: "CIRO_SIFIR_AMA_NET_VAR",
      aciklama: "⛔ ciro ₺0 ama NET hesaplanmış — hesap boşluğa kuruldu",
      tut: (s) => ciro(s) === 0 && net2(s) !== null && net2(s) !== 0,
    },
    {
      ad: "KALEMSIZ",
      aciklama: "hiç kalemi yok",
      tut: (s) => s.items.length === 0,
    },
    {
      ad: "NEGATIF_BIRIM",
      aciklama: "birim fiyat negatif",
      tut: (s) => s.items.some((i) => Number(i.unitPriceAmount.toString()) < 0),
    },
    {
      ad: "ADET_SIFIR_VEYA_EKSI",
      aciklama: "adet ≤ 0",
      tut: (s) => s.items.some((i) => i.quantity <= 0),
    },
    {
      ad: "KARGOSUZ",
      aciklama: "kargo yazılmamış",
      tut: (s) => s.cargoAmount === null,
    },
    {
      ad: "HESAPLANAMAYAN",
      aciklama: "profitStatus CALCULATED değil",
      tut: (s) => s.profitStatus !== "CALCULATED",
    },
    {
      ad: "NET_YOK",
      aciklama: "durum CALCULATED ama NET-2 boş",
      tut: (s) => s.profitStatus === "CALCULATED" && s.net2Amount === null,
    },
    {
      ad: "ZARAR",
      aciklama: "NET-2 negatif",
      tut: (s) => (net2(s) ?? 0) < 0,
    },
    {
      ad: "ZARAR_CIROYU_ASAN",
      aciklama: "⛔ zarar cirodan BÜYÜK — kesinti/maliyet tutarsız",
      tut: (s) => {
        const n = net2(s);
        return n !== null && n < 0 && Math.abs(n) > ciro(s) && ciro(s) >= 0;
      },
    },
    {
      ad: "KOMISYONSUZ",
      aciklama: "hiç KOMISYON kesintisi yok",
      tut: (s) => !s.fees.some((f) => f.code === "KOMISYON"),
    },
  ];

  console.log("\n① AYKIRILIK SINIFLARI (yalnız AÇIK satışlar)");
  const kume = new Map<string, typeof acik>();
  for (const sinif of SINIFLAR) {
    const bulunan = acik.filter(sinif.tut);
    kume.set(sinif.ad, bulunan);
    const oran = ((bulunan.length / acik.length) * 100).toFixed(1);
    console.log(
      `   ${String(bulunan.length).padStart(5)}  %${oran.padStart(5)}  ` +
        `${sinif.ad.padEnd(24)} ${sinif.aciklama}`,
    );
  }

  /**
   * ══════════════════════════════════════════════════════════════════════
   *  ② "API'DEN ÖNCE YOKTU" İDDİASI — KAYNAK BAZINDA SINANIYOR
   * ══════════════════════════════════════════════════════════════════════
   */
  console.log("\n② KAYNAK DAĞILIMI — 'API'den önce yoktu' iddiası sınanıyor");
  const kaynakSayaci = new Map<string, number>();
  for (const s of acik) {
    const k = s.importKaynak ?? "(elle / kaynaksız)";
    kaynakSayaci.set(k, (kaynakSayaci.get(k) ?? 0) + 1);
  }
  console.log("   TÜM AÇIK SATIŞLAR:");
  for (const [k, n] of [...kaynakSayaci.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${String(n).padStart(5)}  ${k}`);
  }

  /** ⭐ Kritik sınıflar kaynak bazında — kümeleniyor mu, yayılıyor mu. */
  for (const ad of ["CIRO_SIFIR", "ZARAR_CIROYU_ASAN", "KOMISYONSUZ"]) {
    const liste = kume.get(ad) ?? [];
    if (liste.length === 0) continue;
    const g = new Map<string, number>();
    for (const s of liste) {
      const k = s.importKaynak ?? "(elle / kaynaksız)";
      g.set(k, (g.get(k) ?? 0) + 1);
    }
    console.log(`\n   ${ad} (${liste.length}) kaynak bazında:`);
    for (const [k, n] of [...g.entries()].sort((a, b) => b[1] - a[1])) {
      const toplam = kaynakSayaci.get(k) ?? 0;
      const oran = toplam > 0 ? ((n / toplam) * 100).toFixed(1) : "—";
      console.log(
        `      ${String(n).padStart(5)}  ${k.padEnd(28)} (o kaynağın %${oran}'i)`,
      );
    }
  }

  /**
   * ⚠ VE ZAMAN EKSENİ AYRI: `createdAt` deftere GİRİŞ anıdır, `soldAt`
   * satışın anı. "API'den önce" sorusu GİRİŞ anına bakar.
   */
  console.log("\n③ CIRO_SIFIR — DEFTERE GİRİŞ AYI (createdAt)");
  const aySayaci = new Map<string, number>();
  for (const s of kume.get("CIRO_SIFIR") ?? []) {
    const ay = s.createdAt.toISOString().slice(0, 7);
    aySayaci.set(ay, (aySayaci.get(ay) ?? 0) + 1);
  }
  for (const [ay, n] of [...aySayaci.entries()].sort()) {
    console.log(`      ${ay}  ${String(n).padStart(5)}`);
  }

  /** ④ En ağır sınıfın dökümü. */
  const agir = kume.get("ZARAR_CIROYU_ASAN") ?? [];
  if (agir.length > 0) {
    console.log("\n④ ZARAR CİROYU AŞAN SATIŞLAR (en ağır sınıf)");
    console.log(
      "   " +
        "tarih".padEnd(12) +
        "sipariş".padEnd(15) +
        "ciro".padStart(11) +
        "NET-2".padStart(13) +
        "  kaynak",
    );
    for (const s of agir.slice(0, 20)) {
      console.log(
        "   " +
          s.soldAt.toISOString().slice(0, 10).padEnd(12) +
          String(s.code ?? "—").padEnd(15) +
          para(ciro(s)).padStart(11) +
          para(net2(s) ?? 0).padStart(13) +
          "  " +
          (s.importKaynak ?? "(elle)"),
      );
    }
    if (agir.length > 20) console.log(`   … +${agir.length - 20}`);
  }

  /** CSV — bütün aykırı satışlar, sınıf etiketiyle. */
  const satirlar = ["sinif;tarih;siparisNo;kanal;kaynak;durum;ciro;net2;kargo"];
  for (const sinif of SINIFLAR) {
    for (const s of kume.get(sinif.ad) ?? []) {
      satirlar.push(
        [
          sinif.ad,
          s.soldAt.toISOString().slice(0, 10),
          s.code ?? "",
          s.channelAccount.channel.name,
          s.importKaynak ?? "",
          s.profitStatus ?? "",
          ciro(s).toFixed(2),
          net2(s) === null ? "" : (net2(s) as number).toFixed(2),
          s.cargoAmount === null ? "" : String(s.cargoAmount),
        ].join(";"),
      );
    }
  }
  const cikti = "veri/ozel/satis-saglik.csv";
  writeFileSync(cikti, "﻿" + satirlar.join("\r\n"), "utf8");
  console.log(`\n   ⭐ TAM LİSTE: ${cikti} (${satirlar.length - 1} satır)`);

  console.log("\n" + "-".repeat(90));
  console.log("  ⛔ HÜKÜM SINIRI. Sınıflar ÖRTÜŞÜR (bir satış birden çok");
  console.log("     sınıfta olabilir) — rakamlar TOPLANMAZ. Her sınıf ayrı");
  console.log("     bir soru sorar ve ayrı bir işe yol açar.");
  console.log("=".repeat(90) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
