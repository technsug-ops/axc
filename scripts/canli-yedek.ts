/**
 * ============================================================================
 *  CANLI GÜVENLİK YEDEĞİ — MIGRATION ÖNCESİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:yedek
 *
 *  NEDEN AYRI KOMUT:
 *  `canli:migrate` yedek ALMAZ — harf bekçisi, adres denetimi, bekleyen
 *  listesi ve sağlık kontrolü yapar. Gece yedeği ise en fazla 24 saat
 *  önceye aittir; arada girilen satışlar onda YOKTUR. Migration'dan hemen
 *  önce TAZE yedek almak ayrı bir iştir ve ayrı durmalıdır.
 *
 *  ⚠ CANLI VERİTABANINA BAĞLANIR. `yedekUret` istemciyi DIŞARIDAN alır —
 *  12.08.2026'da bunun tersi yakalanmıştı: paylaşılan `prisma` istemcisi
 *  kullanılsaydı canlı migration sırasında YEREL veritabanı yedeklenirdi
 *  ve "yedeğim var" sanılarak devam edilirdi.
 *
 *  Dosya `guvenlik-<zaman>.json` adıyla ÖZEL (private) olarak yüklenir;
 *  geri yükleme ekranındaki indirme vekili üzerinden okunabilir.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { put } from "@vercel/blob";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { yedegiMetneCevir, yedekUret } from "../src/lib/yedek";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

const KLASOR = "yedek";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  const jeton = y.veri.blobJetonu;
  if (!jeton) {
    console.log("");
    console.log("  DEPO JETONU YOK — yedek alınamaz, işlem durduruldu.");
    console.log("  .env.canli içine ekleyin:  BLOB_READ_WRITE_TOKEN=...");
    console.log("");
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("CANLI GÜVENLİK YEDEĞİ");
  console.log(`  hedef      ${y.veri.adres.hostname}`);

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)),
  });

  try {
    const an = new Date();
    const damga = an.toISOString().replace(/[:.]/g, "-");
    const ad = `guvenlik-${damga}.json`;

    const yedek = await yedekUret(an, false, prisma);
    const metin = yedegiMetneCevir(yedek);

    const { url } = await put(`${KLASOR}/${ad}`, metin, {
      access: "private",
      contentType: "application/json; charset=utf-8",
      addRandomSuffix: false,
      allowOverwrite: true,
      token: jeton,
    });

    const kb = Math.round(Buffer.byteLength(metin, "utf8") / 1024);
    const toplamSatir = Object.values(yedek.satirSayilari).reduce(
      (t, s) => t + s,
      0,
    );

    console.log(`  dosya      ${ad}`);
    console.log(`  boyut      ${kb} KB`);
    console.log(`  tablo      ${Object.keys(yedek.tablolar).length}`);
    console.log(`  satır      ${toplamSatir}`);
    console.log("");
    console.log("  DOLU TABLOLAR:");
    for (const [tablo, sayi] of Object.entries(yedek.satirSayilari)) {
      if (sayi > 0) console.log(`    ${tablo.padEnd(24)} ${sayi}`);
    }
    console.log("");
    console.log("  ✓ yedek depoya YAZILDI — migration güvenli");
    void url;
  } catch (e) {
    console.log("");
    console.log("  ✗ YEDEK ALINAMADI — migration ÇALIŞTIRMAYIN.");
    console.log(
      "   ",
      parolayiTemizle(String(e), y.veri.parola).slice(0, 400),
    );
    console.log("");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
