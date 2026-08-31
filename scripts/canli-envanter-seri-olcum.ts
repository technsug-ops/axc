import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  ENVANTER SERİSİ — MALİYET ÖLÇÜMÜ (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — bir tasarım kararını ölçer, rutin koşmaz.
 *
 *  ⛔ NİYE: panele "envanterin gelişimi" sekmesi eklenecek ve 12 ay sonu
 *  fotoğrafı gerekiyor. İki yol var ve ARALARINDAKİ FARK ÖLÇÜLMEDEN seçilmez:
 *    (a) `acikPartilerToplu(sınır)` 12 kez çağrılır — tek gövde, tek kural
 *    (b) hareketler bir kez çekilip 12 fotoğraf BELLEKTE üretilir — hızlı
 *        ama FIFO kuralının İKİNCİ bir gövdesi doğar
 *
 *  ⚠ (b) anayasaya aykırı olurdu ("aynı kural iki gövdede yaşamaz"), o yüzden
 *  asıl soru şu: (a) KABUL EDİLEBİLİR Mİ. Cevap süreden çıkar.
 *
 *  ⚠ VE AĞ TABANI AYRICA ÖLÇÜLÜR — uzaktaki veritabanında her ölçümün içinde
 *  gidiş-dönüş vardır ve çıkarılmazsa her rakam olduğundan yavaş görünür.
 *  _(Anayasa: "taban ölçülmeden hiçbir süre yorumlanmaz".)_
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
  const { acikPartilerToplu } = await import("../src/lib/stok");

  console.log("\nENVANTER SERİSİ — MALİYET ÖLÇÜMÜ");
  console.log("  kip  SALT OKUMA");
  console.log("=".repeat(60));

  /* ── AĞ TABANI ─────────────────────────────────────────────────── */
  const t0 = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const taban = Date.now() - t0;
  console.log(`\n   ağ tabanı (SELECT 1)        ${taban} ms`);
  console.log("   ⚠ aşağıdaki her rakamın İÇİNDE bu var\n");

  /* ── TEK FOTOĞRAF ──────────────────────────────────────────────── */
  const bugun = new Date();
  const t1 = Date.now();
  const tek = await acikPartilerToplu(prisma, null, bugun);
  const tekSure = Date.now() - t1;
  console.log(`   TEK fotoğraf                ${tekSure} ms   → iş ${tekSure - taban} ms`);
  console.log(`     varyant  ${tek.size}`);

  /* ── ON İKİ FOTOĞRAF ───────────────────────────────────────────── */
  const t2 = Date.now();
  const boyutlar: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const sinir = new Date(bugun.getFullYear(), bugun.getMonth() - i, 1);
    const harita = await acikPartilerToplu(prisma, null, sinir);
    boyutlar.push(harita.size);
  }
  const onIkiSure = Date.now() - t2;
  console.log(`\n   12 fotoğraf                 ${onIkiSure} ms   → iş ${onIkiSure - taban * 12} ms`);
  console.log(`     fotoğraf başına ortalama  ${(onIkiSure / 12).toFixed(0)} ms`);
  console.log(`     varyant sayıları          ${boyutlar.join(" · ")}`);

  console.log("\n   HÜKÜM:");
  if (onIkiSure < 1500) {
    console.log("   ✓ 12 çağrı KABUL EDİLEBİLİR — tek gövde korunur, ikinci FIFO yazılmaz");
  } else {
    console.log("   ⛔ 12 çağrı PAHALI — sekme ancak açılınca yüklenmeli ya da");
    console.log("      seri tek sorguya indirilmeli (ama FIFO gövdesi ÇOĞALTILMADAN)");
  }

  await prisma.$disconnect();
}

void main();
