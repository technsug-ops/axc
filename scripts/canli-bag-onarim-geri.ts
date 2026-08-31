import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K91 — BAĞ ONARIMINI GERİ AL
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-bag-onarim-geri.ts <parti>          → KURU
 *      npx tsx scripts/canli-bag-onarim-geri.ts <parti> --yaz    → GERİ ALIR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — belirli bir onarım partisini geri alır.
 *
 *  ⛔ NİYE GEREKTİ (31.08.2026): yazım koştu, değişmezlik turu KIRMIZI yandı.
 *  İleri partiye bağlı çıkış hedefe ulaştı (802 → 739) ve para/adet/stok
 *  sabit kaldı — ama **kalanı NEGATİF parti 1 → 32** çıktı. Onarım bir
 *  kusuru başka bir kusurla değiştirdi: yeni bağlar hedef partilerin
 *  KAPASİTESİNİ aşıyor.
 *
 *  ⛔ ÖLÇÜTÜN EKSİĞİ BURADA GÖRÜLDÜ: plan her çıkış için "o an açık ve
 *  damgaya eşit" tek aday buluyor, ama **birden çok çıkış aynı partiyi
 *  gösterebiliyor** ve toplamları partinin adedini aşabiliyor. Simülasyon
 *  MEVCUT bağı tükettiği için (bilinçli, defterin gerçek hâlini üretsin
 *  diye) önerilen hedefin kapasitesi HİÇ ölçülmüyordu.
 *
 *  ── ⭐ GERİ ALMA LİSTEYE DEĞİL, İZE BAĞLI ─────────────────────────────
 *  Küme `AuditLog` satırlarından **satır satır** üretiliyor; hiçbir yerde
 *  tek parça bir liste tutulmuyor. Her satır kendi `eski` değerini taşıyor.
 *  _(Anayasa: "geri alma kümesi yeniden hesaplanabilir bir ölçütten kurulur";
 *  ve 65.511 karakterde kırpılan JSON vakası.)_
 *
 *  ⚠ KESİK İZ SİLİNMEZ: geri alma, onarım izlerini SİLMEZ. Üstlerine
 *  `BAG_ONARIMI_GERI_ALINDI` yazılır ve geçerli olan o olur.
 * ============================================================================
 */

const PARTI = process.argv[2];
const YAZ = process.argv.includes("--yaz");

type Iz = { eski: string; yeni: string; parti: string };

async function main() {
  if (!PARTI || PARTI.startsWith("--")) {
    console.log("Kullanım: canli-bag-onarim-geri.ts <parti> [--yaz]");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nK91 — BAĞ ONARIMINI GERİ AL");
  console.log("  parti  " + PARTI);
  console.log("  kip    " + (YAZ ? "⚠ GERİ ALIYOR" : "KURU — hiçbir şey yazılmaz"));
  console.log("=".repeat(70));

  const izler = await prisma.auditLog.findMany({
    where: { action: "BAG_ONARILDI" },
    select: { id: true, targetId: true, detail: true },
  });

  const geri: { cikis: string; eski: string }[] = [];
  let cozulemeyen = 0;
  for (const iz of izler) {
    let v: Iz;
    try {
      v = JSON.parse(iz.detail ?? "{}") as Iz;
    } catch {
      /** ⛔ ÇÖZÜLEMEYEN İZ SESSİZCE ATLANMAZ — sayılır ve yazılır. */
      cozulemeyen += 1;
      continue;
    }
    if (v.parti !== PARTI) continue;
    if (typeof v.eski !== "string" || iz.targetId === null) {
      cozulemeyen += 1;
      continue;
    }
    geri.push({ cikis: iz.targetId, eski: v.eski });
  }

  console.log("\n   bu partiye ait iz     " + geri.length);
  console.log("   çözülemeyen iz        " + cozulemeyen);

  if (cozulemeyen > 0) {
    console.log("\n   ⛔ ÇÖZÜLEMEYEN İZ VAR — geri alma EKSİK olur, durduruldu.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  if (geri.length === 0) {
    console.log("\n   Geri alınacak satır yok.");
    await prisma.$disconnect();
    return;
  }

  if (!YAZ) {
    console.log("\n   KURU — yazmak için sonuna --yaz ekleyin.");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const g of geri) {
        await tx.stockMovement.update({
          where: { id: g.cikis },
          data: { sourceMovementId: g.eski },
        });
      }
      /**
       * ⚠ ESKİ İZ SİLİNMEZ, ÜSTÜNE YAZILIR — bir onarımın denenip geri
       * alındığı kendi başına bilgidir.
       */
      await tx.auditLog.createMany({
        data: geri.map((g) => ({
          action: "BAG_ONARIMI_GERI_ALINDI",
          targetType: "StockMovement",
          targetId: g.cikis,
          detail: JSON.stringify({
            parti: PARTI,
            geriYuklenen: g.eski,
            sebep: "degismezlik-turu-kirmizi: kalani NEGATIF parti 1 -> 32",
          }),
        })),
      });
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  console.log("\n   " + geri.length + " satır GERİ ALINDI.");
  console.log("   ⚠ Onarım izleri silinmedi; üstlerine geri alma izi yazıldı.");

  await prisma.$disconnect();
}

void main();
