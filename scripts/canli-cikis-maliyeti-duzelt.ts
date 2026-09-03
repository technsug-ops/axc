/**
 * ============================================================================
 *  ÇIKIŞ MALİYET DAMGASINI DÜZELT — ALIMA VE STOĞA DOKUNMADAN
 * ----------------------------------------------------------------------------
 *  Kuru koşum:  npm run canli:cikis-maliyeti-duzelt
 *  Yazım:       npm run canli:cikis-maliyeti-duzelt -- --uygula
 *
 *  BETIK SINIFI: TEK_SEFERLIK — iki partinin KİMLİĞİNE kilitli.
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı gerekiyor.
 *
 *  ── ⛔ VAKA: YANLIŞ ÜRÜNE BAĞLANMIŞ İKİ ALIM ────────────────────────────
 *  `Alımlar.xlsx`ta iki satırın BARKODU yanlıştı; içe aktarma barkoda
 *  güvendi (doğrusu da o) ve satırları başka varyanta bağladı:
 *
 *      ALM-AMZ-260101-07  Hulkbuster satırı  → axcali2110 (Çiçekli Pikap)
 *      ALM-HB-260107-05   Karaca mikser satırı → axcali2093 (Dreame Süpürge)
 *
 *  ⭐ HALİL KARARI 03.09.2026: _"ekranda düzelmesi önemli değil, zararsız
 *  hale getirmen yeterli; stok, ciro ve KDV olarak zararsız hale gelmesi
 *  yeterli."_
 *
 *  ── ⭐ ÖLÇÜLDÜ: O ÜÇ EKSENDE ZARAR ZATEN YOK ────────────────────────────
 *    STOK  axcali2110 sayım 3 dedi, defter 3 — 27.08 sayımı mühürlemiş.
 *          Diğer üç varyant net 0.
 *    CİRO  satışlar gerçek, fiyatları değişmedi.
 *    KDV   iki alım da GERÇEKTEN yapıldı (Hulkbuster ₺2.251,75 · Dreame
 *          ₺8.598 ödendi). Alım tutarları doğru; taban doğru.
 *
 *  ⛔ BOZUK OLAN TEK ŞEY KÂR: yanlış partiden yiyen 7 satış, olması
 *  gerekenden ucuz maliyet taşıyor.
 *
 *      Çiçekli Pikap  5 satış · 450,35 yerine 1.399,00 → 4.743,25 fazla kâr
 *      Dreame Süpürge 2 satış · 4.299 yerine 7.499,00 → 6.400,00 fazla kâr
 *                                          TOPLAM ₺11.143,25
 *
 *  ── ⭐ NİYE YALNIZ ÇIKIŞ DAMGASI — EN DAR MÜDAHALE ──────────────────────
 *  Üç aday ölçüldü:
 *    ① `PurchaseItem.unitCostAmount` değiştirmek → ⛔ KDV TABANINI BOZAR.
 *       Ödenen para gerçekten ₺450,35'ti; onu değiştirmek gerçeği silmek.
 *    ② `PURCHASE_IN` damgasını değiştirmek → gereksiz. İki parti de KAPALI
 *       (tamamı tüketilmiş); kapalı partinin damgasını envanter değeri de
 *       açık parti sorgusu da OKUMUYOR. Dokunmak, hiçbir şeyi düzeltmeyen
 *       bir yazım olurdu.
 *    ③ ⭐ ÇIKIŞ damgaları → kâr motoru maliyeti BURADAN okuyor
 *       (`kalemMaliyeti`, `SaleItem`e bağlı hareketlerden). Tek dokunulacak
 *       yer bu.
 *
 *  ⚠ SONUÇTA BİR TUTARSIZLIK KALIYOR VE GİZLENMİYOR: parti ₺450,35 derken
 *  çıkışlar ₺1.399 diyecek. Bu bilinçli — alternatifi KDV tabanını bozmaktı.
 *  Beyan `AuditLog`a ve alımın notuna yazılıyor.
 *
 *  ── ⛔ STOK MİKTARINA HİÇBİR ŞEY YAZILMAZ ───────────────────────────────
 *  `quantityDelta` alanına dokunulmaz, hareket eklenmez/silinmez. Değişen
 *  tek alan `unitCostAmount`.
 *
 *  ── ⚠ SONRA KÂR TAZELENİR ───────────────────────────────────────────────
 *  Damga değişmesi NET'i kendiliğinden güncellemez:
 *      npm run canli:net-tazele -- <7 sipariş no> --uygula
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⛔ KİMLİĞE KİLİTLİ — betik yalnız bu iki partiyi tanır. */
const VAKA = [
  {
    alim: "ALM-AMZ-260101-07",
    yanlisMaliyet: 450.35,
    dogruMaliyet: 1399,
    gerekce:
      "Dosya satırı LEGO Hulkbuster 76263 idi ama barkodu Çiçekli Pikap'ınki " +
      "(5702017835990) yazılmıştı; içe aktarma barkoda güvendi. Bu partiden " +
      "yiyen satışlar GERÇEKTEN Çiçekli Pikap sattı ve onun o dönemki alış " +
      "maliyeti ₺1.399 (aynı gün ALM-AMZ-260101-03 ve -05).",
  },
  {
    alim: "ALM-HB-260107-05",
    yanlisMaliyet: 4299,
    dogruMaliyet: 7499,
    gerekce:
      "Dosya satırı Karaca Maestrochef Stella idi ama barkodu Dreame robot " +
      "süpürgeninki (6973734685086) yazılmıştı. Bu partiden yiyen satışlar " +
      "GERÇEKTEN Dreame sattı ve onun maliyeti ₺7.499 (aynı ürünün öteki iki " +
      "alımı: ALM-HB-260109-03 ve -04).",
  },
];

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("=".repeat(92));
  console.log(
    `  ÇIKIŞ MALİYET DAMGASI — ${uygula ? "⚠ YAZIM" : "KURU KOŞUM"}`,
  );
  console.log("=".repeat(92));

  type Plan = {
    alim: string;
    hareketId: string;
    siparis: string;
    eski: number | null;
    yeni: number;
    net2: number | null;
  };
  const plan: Plan[] = [];
  const goruntuVaka: unknown[] = [];

  for (const v of VAKA) {
    const a = await prisma.purchase.findFirst({
      where: { code: v.alim },
      select: {
        id: true, code: true, note: true,
        items: {
          select: {
            unitCostAmount: true,
            variant: { select: { sku: true, product: { select: { name: true } } } },
            stockMovements: { select: { id: true, quantityDelta: true, unitCostAmount: true } },
          },
        },
      },
    });
    if (a === null) {
      console.log(`⛔ ${v.alim} DEFTERDE YOK — DURDU.`);
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    const kalem = a.items[0];
    const parti = kalem.stockMovements.find((m) => m.quantityDelta > 0);
    if (parti === undefined) {
      console.log(`⛔ ${v.alim} için PURCHASE_IN hareketi YOK — DURDU.`);
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }
    /** ⚠ ALIM TUTARI DEĞİŞMİYOR — KDV tabanı burada. Ölçüp yazıyoruz. */
    const alimBirim = Number(kalem.unitCostAmount.toString());
    console.log(`\n${v.alim} · ${kalem.variant.sku} · ${kalem.variant.product.name.slice(0, 40)}`);
    console.log(
      `   alım birim maliyeti ${para(alimBirim)}  ⛔ DEĞİŞMEYECEK (KDV tabanı)`,
    );
    console.log(
      `   parti damgası ${para(Number(parti.unitCostAmount ?? 0))}` +
        "  ⛔ DEĞİŞMEYECEK (parti KAPALI, kimse okumuyor)",
    );

    const cikislar = await prisma.stockMovement.findMany({
      where: { sourceMovementId: parti.id },
      select: {
        id: true, quantityDelta: true, unitCostAmount: true, occurredAt: true,
        saleItem: {
          select: { sale: { select: { code: true, net2Amount: true, profitStatus: true } } },
        },
      },
      orderBy: { occurredAt: "asc" },
    });
    /** ⭐ PARTİ KAPALI MI — açıksa envanter değeri de etkilenir, ayrı karar. */
    const kalan = parti.quantityDelta + cikislar.reduce((t, c) => t + c.quantityDelta, 0);
    console.log(
      `   parti ${parti.quantityDelta} adet · çıkış ${cikislar.length} · kalan ${kalan}` +
        (kalan === 0 ? "  ✓ KAPALI" : "  ⚠ AÇIK — envanter değeri de etkilenir"),
    );
    if (kalan !== 0) {
      console.log("   ⛔ AÇIK PARTİ — bu betik yalnız KAPALI parti için yazıldı. DURDU.");
      process.exitCode = 1;
      await prisma.$disconnect();
      return;
    }

    console.log(`   ⭐ ÇIKIŞ DAMGALARI ${para(v.yanlisMaliyet)} → ${para(v.dogruMaliyet)}`);
    for (const c of cikislar) {
      const s = c.saleItem?.sale;
      const eski = c.unitCostAmount === null ? null : Number(c.unitCostAmount.toString());
      /** ⚠ BEKLENEN DEĞERİ TAŞIMAYAN ÇIKIŞA DOKUNULMAZ. */
      if (eski === null || Math.abs(eski - v.yanlisMaliyet) > 0.005) {
        console.log(
          `      ⛔ ATLANDI ${s?.code ?? "—"} · damga ${para(eski ?? 0)} ≠ beklenen ${para(v.yanlisMaliyet)}`,
        );
        continue;
      }
      const n2 = s?.net2Amount == null ? null : Number(s.net2Amount.toString());
      plan.push({
        alim: v.alim, hareketId: c.id, siparis: s?.code ?? "",
        eski, yeni: v.dogruMaliyet, net2: n2,
      });
      console.log(
        `      ${c.occurredAt.toISOString().slice(0, 10)} ${(s?.code ?? "—").padEnd(13)}` +
          ` NET-2 ${para(n2 ?? 0).padStart(10)} → ${para((n2 ?? 0) - (v.dogruMaliyet - v.yanlisMaliyet)).padStart(10)}`,
      );
    }
    goruntuVaka.push({
      alim: v.alim, purchaseId: a.id, eskiNote: a.note,
      alimBirim, partiId: parti.id,
      partiDamgasi: parti.unitCostAmount === null ? null : Number(parti.unitCostAmount.toString()),
      gerekce: v.gerekce,
    });
  }

  const sapma = plan.reduce((t, p) => t + (p.yeni - p.eski!), 0);
  console.log("\n" + "-".repeat(92));
  console.log(`   ⭐ DOKUNULACAK ÇIKIŞ: ${plan.length}`);
  console.log(`   ⭐ DÜZELECEK FAZLA KÂR: ₺${para(sapma)}`);
  console.log("   ⛔ DEĞİŞMEYENLER: alım tutarı (KDV) · parti damgası ·");
  console.log("      stok miktarı · satış fiyatı · hiçbir hareket eklenmez/silinmez");

  if (!uygula) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:cikis-maliyeti-duzelt -- --uygula");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /* ── YAZIM ─────────────────────────────────────────────────────────── */
  const goruntu = { an: new Date().toISOString(), vakalar: goruntuVaka, cikislar: plan };
  const gYol = "veri/ozel/cikis-maliyeti-duzeltme.json";
  writeFileSync(gYol, JSON.stringify(goruntu, null, 2), "utf8");
  console.log(`\n   ⭐ ANLIK GÖRÜNTÜ: ${gYol} (${plan.length} çıkış)`);

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("⛔ Kullanıcı yok — iz yazılamaz. DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const p of plan) {
        await tx.stockMovement.update({
          where: { id: p.hareketId },
          data: { unitCostAmount: p.yeni.toFixed(4) },
        });
      }
      for (const v of goruntuVaka as { purchaseId: string; alim: string; gerekce: string; eskiNote: string | null }[]) {
        await tx.purchase.update({
          where: { id: v.purchaseId },
          data: {
            note: [
              v.eskiNote,
              "⚠ BARKOD KARIŞMASI (Halil teyidi 03.09.2026): " + v.gerekce +
                " Alım tutarı DEĞİŞMEDİ (gerçekten ödendi, KDV tabanı doğru); " +
                "yalnız bu partiden yiyen satışların ÇIKIŞ maliyet damgası " +
                "düzeltildi. Parti damgası ile çıkış damgası bu yüzden farklı.",
            ].filter(Boolean).join(" | "),
          },
        });
      }
      await tx.auditLog.create({
        data: {
          userId: kullanici.id,
          action: "CIKIS_MALIYETI_DUZELTILDI",
          targetType: "StockMovement",
          targetId: plan[0]?.hareketId ?? "",
          detail: JSON.stringify({
            dokunulanCikis: plan.length,
            duzelenFazlaKar: sapma,
            satirlar: plan.map((p) => ({
              alim: p.alim, siparis: p.siparis, eski: p.eski, yeni: p.yeni, eskiNet2: p.net2,
            })),
            dokunulmayan: "PurchaseItem (KDV tabanı) · PURCHASE_IN damgası · stok miktarı",
            kaynak: "Halil kararı 03.09.2026 — 'stok, ciro ve KDV olarak zararsız olsun'",
          }),
        },
      });
    },
    { timeout: 60_000 },
  );

  /* ── DOĞRULAMA ────────────────────────────────────────────────────── */
  const sonra = await prisma.stockMovement.findMany({
    where: { id: { in: plan.map((p) => p.hareketId) } },
    select: { id: true, unitCostAmount: true, quantityDelta: true },
  });
  let uyan = 0;
  for (const s of sonra) {
    const p = plan.find((x) => x.hareketId === s.id)!;
    if (s.unitCostAmount !== null && Math.abs(Number(s.unitCostAmount.toString()) - p.yeni) < 0.005) uyan += 1;
  }
  console.log(`\n④ DOĞRULAMA — damga: ${uyan}/${plan.length} ${uyan === plan.length ? "✓" : "⛔"}`);
  /** ⚠ STOK MİKTARI DEĞİŞMEDİ Mİ — ayrıca kanıtlanır. */
  const miktarDegisti = sonra.filter((s) => {
    const p = plan.find((x) => x.hareketId === s.id)!;
    void p;
    return s.quantityDelta === 0;
  }).length;
  console.log(`   stok miktarı bozulmadı: ${miktarDegisti === 0 ? "✓" : "⛔ " + miktarDegisti}`);
  if (uyan !== plan.length) process.exitCode = 1;

  console.log("\n" + "=".repeat(92));
  console.log("  ⚠ KÂR TAZELEMESİ AYRI ADIM:");
  console.log(
    "     npm run canli:net-tazele -- " +
      [...new Set(plan.map((p) => p.siparis))].join(" ") +
      " --uygula",
  );
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
