import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ============================================================================
 *  DENEME KURULUMUNA CANLI KOPYASI — K303 (kullanıcı onayı 03.10.2026: «evet»)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — deneme veritabanını canlının o anki hâliyle
 *  doldurmak için; canlıya YAZMAZ, yalnız okur (gece yedeğiyle aynı tek geçiş).
 *
 *  Çalıştırma (DENEME klasöründen):
 *      cd Desktop/axcali-deneme && npx tsx scripts/deneme-canli-kopya-kosum.ts
 *  Canlı okuma ayarı (`.env.canli`) ANA klasörde durur ve deneme klasörüne
 *  KOPYALANMAZ; betik onu okurken yalnız o an ana klasöre geçer.
 *
 *  ⛔ HEDEF KİLİDİ: hedef adres deneme klasörünün `.env`inden okunur ve
 *  `@127.0.0.1:3307/selliora_deneme` DEĞİLSE hiçbir şey yazılmadan durur.
 *  (03.10.2026: deneme kurulumu canlıyla aynı motora — MariaDB 10.11.14, kapı 3307 —
 *  taşındı; eski MySQL 3306 kopyası yedek olarak duruyor, bu betik ona YAZMAZ.)
 *  `geriYukle` ortak istemciyi kullanır; ortam değişkeni prisma yüklenmeden
 *  ÖNCE kurulur — yanlış klasörden koşulsa bile geliştirme ya da canlı
 *  veritabanına yazamaz.
 *  Gövdeler sistemin kendisi: `yedekUret` (kaynak istemci parametreli) +
 *  `geriYukle` (tam yazım, tek işlem). Ayrı bir kopyalama yöntemi uydurulmadı.
 * ============================================================================
 */

const DENEME_KLASORU = join(__dirname, "..");

async function main() {
  const denemeEnv = readFileSync(join(DENEME_KLASORU, ".env"), "utf8");
  const hedef = /^DATABASE_URL="?([^"\r\n]+)"?/m.exec(denemeEnv)?.[1] ?? "";
  if (!/@127\.0\.0\.1:3307\/selliora_deneme(\?|$)/.test(hedef)) {
    console.log("⛔ HEDEF selliora_deneme DEĞİL — hiçbir şey yazılmadı.");
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = hedef;

  const { canliYapilandirma } = await import("./canli-ortak");
  const geri = process.cwd();
  process.chdir(join(DENEME_KLASORU, "..", "axcali"));
  const y = canliYapilandirma();
  process.chdir(geri);
  if (!y.tamam) {
    console.log("⛔ Canlı okuma ayarı yok (ana klasörden çalıştırın):", y.hata);
    process.exitCode = 1;
    return;
  }
  const { betikAdresi } = await import("../src/lib/veritabani-adresi");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const { PrismaClient } = await import("../src/generated/prisma/client");
  const canli = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)) });

  const { yedekUret, yedegiMetneCevir } = await import("../src/lib/yedek");
  const { yedegiCoz } = await import("../src/lib/geri-yukle");
  const { geriYukle } = await import("../src/lib/geri-yukle-calistir");
  const { prisma } = await import("../src/lib/prisma");

  /** İkinci kilit: ortak istemcinin GERÇEKTEN deneme veritabanına bağlı olduğu ölçülür. */
  const db = await prisma.$queryRawUnsafe<{ d: string }[]>("SELECT DATABASE() d");
  if (db[0]?.d !== "selliora_deneme") {
    console.log("⛔ Ortak istemci selliora_deneme'ye bağlı değil:", db[0]?.d, "— durduruldu.");
    process.exitCode = 1;
    await canli.$disconnect();
    return;
  }

  console.log("Canlıdan okunuyor (salt okuma)…");
  const t0 = Date.now();
  const yedek = await yedekUret(new Date(), false, canli as never);
  const ozet = Object.entries(yedek.tablolar).map(([t, s]) => `${t}:${(s as unknown[]).length}`);
  console.log(`okundu ${((Date.now() - t0) / 1000).toFixed(0)} sn · ${ozet.length} tablo`);
  await canli.$disconnect();

  /**
   * DOSYA YOLUNUN AYNISI: metne çevir → çöz. İlk koşumda bellekteki nesne
   * doğrudan verildi; Decimal'ler nesne kaldı ve `'"20"'` diye yazılıp MySQL
   * reddetti (tek işlem — hiçbir şey yazılmadı). Ekrandaki geri yükleme de
   * hep metinden geçer.
   */
  const cozum = yedegiCoz(yedegiMetneCevir(yedek));
  if (!cozum.tamam) {
    console.log("⛔ yedek metni çözülemedi:", JSON.stringify(cozum.hata));
    process.exitCode = 1;
    return;
  }
  console.log("selliora_deneme'ye yazılıyor…");
  const sonuc = await geriYukle(cozum.yedek);
  console.log(JSON.stringify(sonuc.tamam ? { tamam: true } : sonuc));
  if (sonuc.tamam) console.log(ozet.join("  "));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message.replace(/\s+/g, " ") : e);
  process.exitCode = 1;
});
