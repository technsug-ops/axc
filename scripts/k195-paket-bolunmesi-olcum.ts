import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * K195-2 — BÖLÜNMÜŞ SİPARİŞ NE KADAR YAYGIN? (SALT OKUMA)
 *      npm run canli:paket-bolunmesi
 *
 * BETIK SINIFI: SUREKLI — hiçbir yere YAZMAZ.
 *
 * ⛔ NİYE ÖLÇÜLÜYOR: `deliveredAt` yazılırken bir hüküm kurulacak —
 * "sipariş teslim edildi" ne demek? İki okuma var ve İKİSİ DE MAKUL:
 *   (a) EN AZ BİR paketi teslim edildi  → basit, ama iki koliden biri hâlâ
 *       yoldayken sipariş "teslim" görünür — sistem BİLMEDİĞİ şeyi iddia eder
 *   (b) BÜTÜN paketleri teslim edildi   → doğru, ama paket sayısı bilinmeyen
 *       kanalda (HB) uygulanamaz
 * Hangisinin seçileceği "bu kural bugünkü defterin ne kadarına dokunur"
 * ölçüsüyle kararlaşır. _(Anayasa: "bir sınırın yönü ölçülmeden çevrilmez".)_
 */
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("⛔", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  try {
    const toplam = await prisma.sale.count();
    const gruplar = await prisma.sale.groupBy({
      by: ["paketSayisi"],
      _count: { _all: true },
      orderBy: { paketSayisi: "asc" },
    });
    console.log("\nK195-2 — PAKET SAYISI DAĞILIMI · " + new Date().toISOString());
    console.log("  satış toplam " + toplam);
    for (const g of gruplar) {
      const n = g._count._all;
      console.log(
        "   paket " +
          String(g.paketSayisi).padStart(2) +
          " → " +
          String(n).padStart(5) +
          "  %" +
          ((n / toplam) * 100).toFixed(2),
      );
    }
    const bolunmus = gruplar
      .filter((g) => g.paketSayisi > 1)
      .reduce((t, g) => t + g._count._all, 0);
    console.log(
      "\n  BÖLÜNMÜŞ (paket>1): " +
        bolunmus +
        "  %" +
        ((bolunmus / toplam) * 100).toFixed(2),
    );
    /** Kanal kırılımı — kural kanal başına uygulanacak. */
    const kanalli = await prisma.sale.groupBy({
      by: ["channelAccountId"],
      where: { paketSayisi: { gt: 1 } },
      _count: { _all: true },
    });
    for (const k of kanalli) {
      const h = await prisma.channelAccount.findUnique({
        where: { id: k.channelAccountId ?? "" },
        select: { name: true, channel: { select: { name: true } } },
      });
      console.log(
        "   " +
          ((h?.channel.name ?? "?") + " · " + (h?.name ?? "?")).padEnd(34) +
          k._count._all,
      );
    }
  } finally {
    /** ⛔ K189: `$disconnect` yoksa görev "Running"de asılı kalır. */
    await prisma.$disconnect();
  }
}
main();
