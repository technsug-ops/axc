/**
 * ============================================================================
 *  K136a — YAZIM SONRASI TEYİT · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:iade-yazim-teyit
 *
 *  BETIK SINIFI: TEK_SEFERLIK — K136a yazımının kapanış kanıtı.
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE AYRI BİR TEYİT ─────────────────────────────────────────────────
 *  Yazım betiğinin kendi "✓ TUR TEMİZ" satırı YETMEZ: o, yazımı yapan
 *  aracın kendi beyanıdır. Bu betik VERİYE bakar — kayıtlar gerçekten
 *  orada mı, izler okunabiliyor mu, not metni bozulmadan indi mi.
 *  _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir"; "iz,
 *  yazımın kanıtı değildir — kanıt, verinin karşılaştırılmasıdır".)_
 *
 *  ⚠ VE İZİN OKUNABİLİRLİĞİ AYRICA SINANIR: `AuditLog.detail` MySQL `TEXT`
 *  (65.535 bayt) ve 28.08'de tam tavanda kırpılmış bir JSON `JSON.parse`ta
 *  düşmüştü — geri alma yolu YAZILDIĞI ANDA bozuktu ve kimse görmedi.
 *  Burada her iz AYRI AYRI parse ediliyor.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import { PLAN, notMetni } from "./k136a-plan";

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
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

  console.log("=".repeat(80));
  console.log("  K136a — YAZIM SONRASI TEYİT (salt okuma)");
  console.log("=".repeat(80));

  let kusur = 0;

  /** ① YAZILAN İADELER — ölçüt not önekinden, listeden DEĞİL. */
  const iadeler = await prisma.return.findMany({
    where: { note: { startsWith: "IADE_SEBEP[" } },
    select: {
      id: true,
      note: true,
      occurredAt: true,
      returnType: true,
      net1Amount: true,
      net2Amount: true,
      profitStatus: true,
      returnCargoAmount: true,
      sale: { select: { code: true } },
      items: {
        select: { quantity: true, soundQuantity: true, damagedQuantity: true },
      },
    },
    orderBy: { occurredAt: "asc" },
  });

  console.log(`\n① YAZILAN İADELER — ${iadeler.length} kayıt`);
  for (const r of iadeler) {
    const kod = r.sale?.code ?? "—";
    const plan = PLAN.find((p) => p.siparis === kod);
    console.log(
      `   ${kod.padEnd(13)} ${r.occurredAt.toISOString().slice(0, 10)}` +
        `  ${r.returnType.padEnd(7)}  NET-2 ${para(r.net2Amount).padStart(11)}` +
        `  ${r.profitStatus}` +
        `  sağlam ${r.items.map((i) => `${i.soundQuantity}/${i.quantity}`).join(",")}` +
        `  kargo ${r.returnCargoAmount === null ? "—" : para(r.returnCargoAmount)}`,
    );
    console.log(`      note = ${r.note}`);
    /**
     * ⭐ HAM DEĞER DE BASILIYOR — 1 KURUŞLUK FARKIN SEBEBİ BURADA GÖRÜLÜR.
     * Kuru koşum motorun FLOAT çıktısını 2 haneye yuvarlar; defter aynı
     * değeri `Decimal(18,4)` saklar ve gösterimde tekrar yuvarlanır. İki
     * yuvarlama tam yarım noktada ayrışabilir. Ham değer olmadan "hesap
     * farklı" ile "gösterim farklı" ayırt edilemez.
     * _(Anayasa: "para rakamı tabanıyla birlikte yazılır".)_
     */
    console.log(
      `      ham   : NET-1 ${r.net1Amount?.toString()} · NET-2 ${r.net2Amount?.toString()}`,
    );

    /** ⭐ NOT METNİ BİREBİR İNDİ Mİ — plandaki metinle karşılaştırılır. */
    if (plan === undefined) {
      console.log("      ⛔ BU KAYIT PLANDA YOK — beklenmeyen satır.");
      kusur += 1;
    } else if (r.note !== notMetni(plan)) {
      console.log(`      ⛔ NOT AYRIŞTI — beklenen: ${notMetni(plan)}`);
      kusur += 1;
    }
    /** Hasar iddiası yoktu → sağlam adet iade adedine eşit olmalı. */
    for (const i of r.items) {
      if (i.soundQuantity !== i.quantity || i.damagedQuantity !== 0) {
        console.log(
          `      ⛔ SAĞLAM/HASARLI AYRIŞTI: sağlam ${i.soundQuantity}` +
            ` hasarlı ${i.damagedQuantity} iade ${i.quantity}`,
        );
        kusur += 1;
      }
    }
  }
  if (iadeler.length !== PLAN.length) {
    console.log(
      `   ⛔ BEKLENEN ${PLAN.length}, BULUNAN ${iadeler.length} — eksik/fazla.`,
    );
    kusur += 1;
  }

  /**
   * ② DENETİM İZLERİ — HER BİRİ AYRI AYRI `JSON.parse` EDİLİYOR.
   * Sayı saymak yetmez: kırpılmış bir iz de sayılır ama okunamaz.
   */
  const izler = await prisma.auditLog.findMany({
    where: { action: "K136A_IADE_YAZIMI" },
    select: { targetId: true, detail: true, createdAt: true },
  });
  console.log(`\n② DENETİM İZLERİ — ${izler.length} kayıt`);
  let okunan = 0;
  let bozuk = 0;
  for (const i of izler) {
    const ham = i.detail ?? "";
    try {
      const d = JSON.parse(ham) as Record<string, unknown>;
      const tam =
        typeof d.siparis === "string" &&
        typeof d.note === "string" &&
        "oncekiNet2" in d &&
        "israrSebebi" in d;
      if (!tam) {
        console.log(`   ⛔ ${i.targetId} — JSON okundu ama ALANLAR EKSİK`);
        bozuk += 1;
      } else okunan += 1;
    } catch {
      console.log(
        `   ⛔ ${i.targetId} — JSON.parse DÜŞTÜ (uzunluk ${ham.length})`,
      );
      bozuk += 1;
    }
  }
  console.log(`   okunabilen ve alanları tam : ${okunan}/${izler.length}`);
  console.log(`   ⛔ bozuk                    : ${bozuk}`);
  if (izler.length !== PLAN.length || bozuk > 0) kusur += 1;

  /** ③ ÖNCEKİ DEĞERLER İZDE Mİ — geri alma bunlara muhtaç. */
  console.log("\n③ İZDEKİ ÖNCEKİ DEĞERLER (geri alma bunlara dayanır)");
  for (const i of izler) {
    try {
      const d = JSON.parse(i.detail ?? "") as Record<string, unknown>;
      console.log(
        `   ${String(d.siparis).padEnd(13)} önceki NET-1 ${para(
          d.oncekiNet1,
        ).padStart(11)}  NET-2 ${para(d.oncekiNet2).padStart(11)}` +
          `  durum ${String(d.oncekiDurum)}  kaynak ${String(d.sebepKaynagi)}`,
      );
    } catch {
      /* ②'de zaten sayıldı */
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log(kusur === 0 ? "  ✓ TEYİT TEMİZ." : `  ⛔ ${kusur} KUSUR VAR.`);
  console.log("=".repeat(80) + "\n");
  if (kusur > 0) process.exitCode = 1;

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
