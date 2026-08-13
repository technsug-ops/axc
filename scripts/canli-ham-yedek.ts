/**
 * ============================================================================
 *  MIGRATION ÖNCESİ HAM YEDEK — ŞEMADAN BAĞIMSIZ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:ham-yedek
 *
 *  NEDEN AYRI BİR YEDEK YOLU VAR (13.08.2026'da ortaya çıktı):
 *
 *  Normal yedek (`yedekUret`) Prisma modellerini kullanır. Migration'dan
 *  HEMEN ÖNCE bu yol ÇALIŞMAZ: yerel istemci yeni şemaya göre üretilmiştir
 *  ve canlıda henüz olmayan kolonları sorar. Gerçek hata şuydu:
 *
 *      The column `StockAdjustmentReason.systemKey` does not exist
 *
 *  Yani tam da yedeğe en çok ihtiyaç duyulan anda — şema değişmeden hemen
 *  önce — model tabanlı yedek kilitleniyor. Tavuk-yumurta.
 *
 *  ÇÖZÜM: tabloları HAM SQL ile okumak. `SELECT *` şemanın ne olduğunu
 *  bilmez; canlıda hangi kolonlar varsa onları alır. Bu yüzden bu yedek
 *  "migration öncesi" için DOĞRU araçtır, bir yama değil.
 *
 *  Dosya `guvenlik-ham-<zaman>.json` adıyla ÖZEL yüklenir. Geri yükleme
 *  gerekirse migration ÖNCESİ şemaya dönülür — dosya o hâli taşır.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { put } from "@vercel/blob";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const KLASOR = "yedek";

/** JSON'a inmeyen tipler: BigInt sayıya, Date ISO metne. */
function guvenliCevir(deger: unknown): string {
  return JSON.stringify(
    deger,
    (_a, d) => {
      if (typeof d === "bigint") return Number(d);
      if (d instanceof Date) return d.toISOString();
      if (d instanceof Buffer) return d.toString("base64");
      return d;
    },
    0,
  );
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  if (!y.veri.blobJetonu) {
    console.log("\n  DEPO JETONU YOK — yedek alınamaz, işlem durduruldu.\n");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("MIGRATION ÖNCESİ HAM YEDEK");
  console.log(`  hedef      ${y.veri.adres.hostname}`);

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)),
  });

  try {
    // Tablo listesi CANLIDAN okunur — kod ne sanıyor değil, orada NE VAR.
    const tabloSatirlari = (await prisma.$queryRawUnsafe(
      `SELECT TABLE_NAME AS ad FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
    )) as { ad: string }[];

    const tablolar: Record<string, unknown[]> = {};
    const satirSayilari: Record<string, number> = {};

    for (const { ad } of tabloSatirlari) {
      // Tablo adı information_schema'dan geldi, kullanıcı girdisi değil.
      const satirlar = (await prisma.$queryRawUnsafe(
        `SELECT * FROM \`${ad}\``,
      )) as unknown[];
      tablolar[ad] = satirlar;
      satirSayilari[ad] = satirlar.length;
    }

    const an = new Date();
    const dosya = {
      bicim: "selliora-ham-yedek",
      surum: 1,
      olusturulmaAni: an.toISOString(),
      aciklama:
        "Migration öncesi ham SQL yedeği. Tablolar canlıdaki kolonlarıyla, " +
        "olduğu gibi alınmıştır; Prisma şemasına bağlı değildir.",
      satirSayilari,
      tablolar,
    };

    const metin = guvenliCevir(dosya);
    const ad = `guvenlik-ham-${an.toISOString().replace(/[:.]/g, "-")}.json`;

    await put(`${KLASOR}/${ad}`, metin, {
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: y.veri.blobJetonu,
    });

    const kb = Math.round(Buffer.byteLength(metin, "utf8") / 1024);
    const toplam = Object.values(satirSayilari).reduce((t, s) => t + s, 0);

    console.log(`  dosya      ${ad}`);
    console.log(`  boyut      ${kb} KB`);
    console.log(`  tablo      ${tabloSatirlari.length}`);
    console.log(`  satır      ${toplam}`);
    console.log("");
    console.log("  DOLU TABLOLAR:");
    for (const [tablo, sayi] of Object.entries(satirSayilari)) {
      if (sayi > 0) console.log(`    ${tablo.padEnd(26)} ${sayi}`);
    }
    console.log("");
    console.log("  ✓ yedek depoya YAZILDI — migration güvenli");
  } catch (e) {
    console.log("");
    console.log("  ✗ YEDEK ALINAMADI — migration ÇALIŞTIRMAYIN.");
    console.log("   ", parolayiTemizle(String(e), y.veri.parola).slice(0, 400));
    console.log("");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
