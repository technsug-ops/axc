import "dotenv/config";

/**
 * ============================================================================
 *  PAKET BÖLÜNMESİ 06.10.2026 — TEK SEFERLİK VERİ TAŞIMA
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/paket-bolunmesi-0610.ts          → KURU KOŞUM
 *      npx tsx scripts/paket-bolunmesi-0610.ts --yaz    → yazar
 *
 *  Katalogda iki özellik bölündü: «depo» → barkod (okut, paketle) + depo (raf);
 *  «pazaryeri» → kanalTanimlari (kanal kodları/hesapları) + pazaryeri (hakediş).
 *  ① EKRAN KAYBI YOK: eski ebeveyni açık olan her yerde (paket VE Individuel
 *     firma seçimi) yeni parça da açılır.
 *  ② Kullanıcı kararı: Basic'e kartlar + kanal tanımları + barkod. Silver'a
 *     kanal tanımları (her paket alttakini kapsar).
 *  Yazım `lib/paket/yonetim` gövdelerinden geçer → her değişiklik iz bırakır.
 *  Tekrar koşulabilir: eklenecek bir şey kalmadıysa hiçbir şey yazmaz.
 * ============================================================================
 */

const BOLUNME: Record<string, string> = { depo: "barkod", pazaryeri: "kanalTanimlari" };
const PAKETE_EK: Record<string, string[]> = { Basic: ["kartlar", "kanalTanimlari", "barkod"], Silver: ["kanalTanimlari"] };

async function main() {
  const yaz = process.argv.includes("--yaz");
  const { sistemPrisma } = await import("../src/lib/prisma");
  const Y = await import("../src/lib/paket/yonetim");
  console.log(`\nPAKET BÖLÜNMESİ 06.10 — ${yaz ? "YAZIM" : "KURU KOŞUM (--yaz ile yazar)"}\n`);
  // SISTEM: yazan — firmasız süper admin (iz için).
  const yazan = await sistemPrisma.user.findFirst({ where: { isSuperAdmin: true, hesapFirmasiId: null }, select: { id: true } });
  if (!yazan) throw new Error("süper admin yok — iz yazılamaz");

  for (const p of await Y.paketler()) {
    if (p.firmayaOzel) continue;
    const once = new Set(p.ozellikler);
    const sonra = new Set(once);
    for (const [eski, yeni] of Object.entries(BOLUNME)) if (once.has(eski)) sonra.add(yeni);
    for (const o of PAKETE_EK[p.ad] ?? []) sonra.add(o);
    const eklenen = [...sonra].filter((o) => !once.has(o));
    console.log(`  ${eklenen.length ? "+" : "="}  paket ${p.ad}: ${eklenen.join(", ") || "değişiklik yok"}`);
    if (yaz && eklenen.length) {
      const r = await Y.paketIceriginiKaydet(p.id, [...sonra], yazan.id);
      if (r.durum !== "TAMAM") throw new Error(`${p.ad}: ${r.hata}`);
    }
  }
  // SISTEM: Individuel firmalar (firmaya özel paket).
  const firmalar = await sistemPrisma.company.findMany({ where: { paket: { firmayaOzel: true } }, select: { id: true, code: true } });
  for (const f of firmalar) {
    const fp = await Y.firmaPaketi(f.id);
    const once = fp?.acik ?? new Set<string>();
    const sonra = new Set(once);
    for (const [eski, yeni] of Object.entries(BOLUNME)) if (once.has(eski)) sonra.add(yeni);
    const eklenen = [...sonra].filter((o) => !once.has(o));
    console.log(`  ${eklenen.length ? "+" : "="}  firma ${f.code} (Individuel): ${eklenen.join(", ") || "değişiklik yok"}`);
    if (yaz && eklenen.length) {
      const r = await Y.firmaOzellikleriniKaydet(f.id, [...sonra], yazan.id);
      if (r.durum !== "TAMAM") throw new Error(`${f.code}: ${r.hata}`);
    }
  }
  console.log("");
  await sistemPrisma.$disconnect();
}

main().catch((e) => { console.error("\nÇÖKTÜ:", e); process.exit(1); });
