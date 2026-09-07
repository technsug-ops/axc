import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K180 — KALDIRMA İZİ ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-kaldirma-izi.ts
 *
 *  BETIK SINIFI: SUREKLI — salt okuma, tekrar koşulabilir ve zararsız.
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  "Test geçti" bir İDDİADIR ve bu depoda iddia ölçülür. Kaldırma gerçekten
 *  denendiyse defterde izi vardır: `SATIS_KALEMI_KALDIRMA` izi, ayna
 *  `SALE_CANCEL_IN` hareketi ve (geri alındıysa) onu kapatan `ADJUSTMENT`.
 *
 *  ⭐ VE ASIL ÖLÇÜM GİDİŞ-DÖNÜŞ: kaldırıp geri alınan bir kalemde defter
 *  BAŞLANGICA dönmüş olmalı — kalem geçerli, aynanın tüketimi tam, stok
 *  net etkisi SIFIR. _(Anayasa: "testi başlangıca dönüş üzerine kur".)_
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK180 — KALDIRMA İZİ (SALT OKUMA)");
  console.log("  an  " + new Date().toISOString());
  console.log("=".repeat(72));

  /* ═══ ① İZLER ══════════════════════════════════════════════════════ */
  const izler = await prisma.auditLog.findMany({
    where: { action: { in: ["SATIS_KALEMI_KALDIRMA", "SATIS_KALEMI_KALDIRMA_GERI"] } },
    orderBy: { createdAt: "asc" },
    select: { action: true, createdAt: true, targetId: true, detail: true },
  });

  console.log("\n① İZLER");
  if (izler.length === 0) {
    /**
     * ⚠ "İZ YOK" İLE "TEST GEÇMEDİ" AYNI ŞEY DEĞİL: kullanıcı yalnız düğmeyi
     * GÖRMÜŞ de olabilir (madde 1 ve 2 hiçbir şey yazmaz). Bu satır bir
     * hüküm değil, bir ÖLÇÜMDÜR.
     */
    console.log("   kayıt YOK — kaldırma hiç UYGULANMAMIŞ.");
    console.log("   ⚠ Bu 'test geçmedi' demek değildir: listenin ilk iki maddesi");
    console.log("     (düğme görünüyor mu · tek kalemde pasif mi) hiçbir şey yazmaz.");
  }
  for (const iz of izler) {
    const d = ((): Record<string, unknown> => {
      try {
        return JSON.parse(iz.detail ?? "{}") as Record<string, unknown>;
      } catch {
        /** ⛔ ÇÖZÜLEMEYEN İZ SESSİZCE ATLANMAZ — bozukluğun kendisi bilgidir. */
        return { _COZULEMEDI: true };
      }
    })();
    console.log(
      `   ${iz.createdAt.toISOString()}  ${iz.action.padEnd(28)} kalem ${iz.targetId}`,
    );
    console.log(
      `     satış ${String(d.satisKodu ?? "?")} · ${String(d.urunAdi ?? "")} · ` +
        `sebep ${String(d.sebep ?? "-")} · adet ${String(d.geriDonenAdet ?? d.dusulecekAdet ?? "?")}`,
    );
  }

  /* ═══ ② ŞU AN KALDIRILMIŞ DURAN KALEMLER ═══════════════════════════ */
  const kaldirilmis = await prisma.saleItem.findMany({
    where: { kaldirildiAt: { not: null } },
    select: {
      id: true,
      kaldirildiAt: true,
      kaldirmaSebebi: true,
      quantity: true,
      unitPriceAmount: true,
      sale: { select: { code: true } },
      variant: { select: { sku: true } },
    },
  });
  console.log("\n② ŞU AN KALDIRILMIŞ DURAN KALEM: " + kaldirilmis.length);
  for (const k of kaldirilmis) {
    console.log(
      `   ${k.sale.code ?? "?"} · ${k.variant.sku} · ${k.quantity} × ` +
        `${k.unitPriceAmount.toString()} · ${k.kaldirmaSebebi}`,
    );
  }

  /* ═══ ③ GİDİŞ-DÖNÜŞ — DEFTER BAŞLANGICA DÖNDÜ MÜ ══════════════════ */
  const kalemIdleri = [...new Set(izler.map((i) => i.targetId).filter((x): x is string => !!x))];
  console.log("\n③ GİDİŞ-DÖNÜŞ (dokunulan kalem " + kalemIdleri.length + ")");

  for (const id of kalemIdleri) {
    const kalem = await prisma.saleItem.findUnique({
      where: { id },
      select: {
        quantity: true,
        kaldirildiAt: true,
        sale: { select: { code: true, net2Amount: true, profitStatus: true } },
        variant: { select: { sku: true } },
        stockMovements: {
          orderBy: { createdAt: "asc" },
          select: { type: true, quantityDelta: true, sourceMovementId: true },
        },
      },
    });
    if (kalem === null) {
      console.log(`   ⛔ ${id} — kalem BULUNAMADI`);
      continue;
    }
    const net = kalem.stockMovements.reduce((t, h) => t + h.quantityDelta, 0);
    const beklenen = kalem.kaldirildiAt === null ? -kalem.quantity : 0;
    /**
     * ⚠ ÖLÇÜT: kalem GEÇERLİYSE net hareket `−adet` olmalı (mal çıkmış);
     * KALDIRILMIŞSA `0` olmalı (çıkış + aynası birbirini götürmüş).
     * Tutmuyorsa defter ile durum AYRIŞMIŞ demektir.
     */
    const tuttu = net === beklenen;
    console.log(
      `   ${tuttu ? "✓" : "⛔"} ${kalem.sale.code ?? "?"} · ${kalem.variant.sku} · ` +
        `durum ${kalem.kaldirildiAt === null ? "GEÇERLİ" : "KALDIRILMIŞ"} · ` +
        `net hareket ${net} (beklenen ${beklenen})`,
    );
    console.log(
      "     hareketler: " +
        kalem.stockMovements
          .map((h) => `${h.type}${h.quantityDelta > 0 ? "+" : ""}${h.quantityDelta}` +
            (h.sourceMovementId ? "→parti" : ""))
          .join(" · "),
    );
    console.log(
      `     satışın NET-2 ${kalem.sale.net2Amount?.toString() ?? "yok"} · ` +
        `durum ${kalem.sale.profitStatus ?? "-"}`,
    );
  }

  console.log("\n" + "=".repeat(72));
  console.log("  SALT OKUMA — hiçbir şey yazılmadı.");
  await prisma.$disconnect();
}

void main();
