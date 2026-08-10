/**
 * ============================================================================
 *  EL KİTABINI DOSYAYA ÜRET
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run el-kitabi:uret
 *
 *  `docs/el-kitabi.html` dosyasını, o anki VERİTABANINDAN okuyarak yeniden
 *  yazar. Depodaki kopya bir ANLIK GÖRÜNTÜDÜR; her zaman güncel olanı
 *  uygulamadaki /el-kitabi sayfası ve oradaki indirme düğmesidir.
 *
 *  Canlı sistemden üretmek için:
 *    $env:DATABASE_URL="mysql://..."; npm run el-kitabi:uret
 * ============================================================================
 */

import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";

import { isTakvimGunu } from "../src/lib/donem";
import { elKitabiTekDosya } from "../src/lib/el-kitabi/uret";
import { prisma } from "../src/lib/prisma";

async function main() {
  const bugun = isTakvimGunu(new Date());
  const tarih = `${String(bugun.gun).padStart(2, "0")}.${String(bugun.ay).padStart(2, "0")}.${bugun.yil}`;

  const belge = await elKitabiTekDosya(tarih);

  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/el-kitabi.html", belge, "utf8");

  const kb = Math.round(Buffer.byteLength(belge, "utf8") / 1024);
  console.log(`\ndocs/el-kitabi.html yazildi — ${kb} KB, ${tarih} tarihli veriyle.`);
  console.log("Guncel surum her zaman uygulamadaki /el-kitabi sayfasidir.\n");

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Hata:", String(e).split("\n")[0]);
  await prisma.$disconnect();
  process.exitCode = 1;
});
