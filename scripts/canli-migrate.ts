/**
 * ============================================================================
 *  CANLI MIGRATION — TEK KOMUT
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:migrate
 *
 *  NEDEN AYRI KOMUT:
 *  `.env` yerel veritabanını gösterir ve öyle kalmalıdır — geliştirme sırasında
 *  yanlışlıkla canlıya yazmamak için. Canlı adres AYRI dosyada durur ve
 *  yalnızca bu komut onu kullanır.
 *
 *  KURULUM (bir kez):
 *  Proje kökünde `.env.canli` dosyası açın, tek satır yazın:
 *
 *      CANLI_DATABASE_URL=mysql://kullanici:parola@sunucu.kasserver.com:3306/veritabani
 *
 *  `.gitignore` içindeki `.env*` kuralı bu dosyayı git'e SOKMAZ.
 *
 *  NE YAPAR (sırayla, biri başarısızsa durur):
 *    1. Harf bekçisi — migration dosyaları Linux'ta çalışacak yazımda mı
 *    2. Adres denetimi — hedef gerçekten uzak mı (yerel adres REDDEDİLİR)
 *    3. Bekleyen migration listesi — ne uygulanacağı UYGULAMADAN ÖNCE yazılır
 *    4. `prisma migrate deploy`
 *    5. Sağlık kontrolü — yeni kolonlar canlıda okunabiliyor mu
 *
 *  PAROLA HİÇBİR ZAMAN EKRANA YAZILMAZ. Çıktı ekran görüntüsü olarak
 *  paylaşılabilir.
 * ============================================================================
 */

import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

const CANLI_DOSYA = ".env.canli";

function basarili(mesaj: string) {
  console.log(`  ✓  ${mesaj}`);
}
function basarisiz(mesaj: string) {
  console.log(`  ✗  ${mesaj}`);
}

/** Hata metinleri bağlantı dizesini içerebiliyor; parola her hâlükârda silinir. */
function parolayiTemizle(metin: string, parola: string): string {
  let temiz = metin.replace(/(mysql:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1***$2");
  if (parola.length > 0) temiz = temiz.split(parola).join("***");
  return temiz;
}

async function main() {
  console.log("\nCANLI MIGRATION\n");

  // --- 0) Adres dosyası -----------------------------------------------------
  if (!existsSync(CANLI_DOSYA)) {
    basarisiz(`${CANLI_DOSYA} bulunamadı.`);
    console.log("");
    console.log("     Proje kökünde bu dosyayı açın ve tek satır yazın:");
    console.log("");
    console.log("       CANLI_DATABASE_URL=mysql://kullanici:parola@sunucu:3306/veritabani");
    console.log("");
    console.log("     Adresi Vercel > Settings > Environment Variables altındaki");
    console.log("     DATABASE_URL değerinden kopyalayabilirsiniz.");
    console.log(`     Dosya git'e GİRMEZ (.gitignore -> .env*).\n`);
    process.exitCode = 1;
    return;
  }

  const { parsed } = config({ path: CANLI_DOSYA });
  const ham = parsed?.CANLI_DATABASE_URL ?? "";
  if (!ham) {
    basarisiz(`${CANLI_DOSYA} içinde CANLI_DATABASE_URL yok.`);
    process.exitCode = 1;
    return;
  }

  let adres: URL;
  try {
    adres = new URL(ham);
  } catch {
    basarisiz("CANLI_DATABASE_URL okunamadı.");
    console.log("     Biçim: mysql://kullanici:parola@sunucu:3306/veritabani\n");
    process.exitCode = 1;
    return;
  }
  const parola = adres.password;

  // --- 1) Harf bekçisi ------------------------------------------------------
  console.log("1) MIGRATION DOSYALARI");
  try {
    execFileSync("npm", ["run", "--silent", "migration:kontrol"], {
      stdio: "pipe",
      shell: process.platform === "win32",
    });
    basarili("harf bekçisi temiz");
  } catch {
    basarisiz("harf bekçisi HATA verdi — canlıya gönderilmez.");
    console.log("     Ayrıntı için:  npm run migration:kontrol\n");
    process.exitCode = 1;
    return;
  }

  // --- 2) Hedef denetimi ----------------------------------------------------
  console.log("\n2) HEDEF (parola gizli)");
  console.log(`     sunucu      ${adres.hostname}`);
  console.log(`     veritabanı  ${adres.pathname.slice(1)}`);
  console.log(`     kullanıcı   ${adres.username}`);

  const yerelMi = ["localhost", "127.0.0.1", "::1"].includes(adres.hostname);
  if (yerelMi) {
    console.log("");
    basarisiz("BU ADRES YEREL VERİTABANI — canlı migration çalıştırılmadı.");
    console.log("     .env.canli içine üretim adresini yazın.\n");
    process.exitCode = 1;
    return;
  }
  basarili("uzak adres");

  // --- 3) Ne uygulanacak ----------------------------------------------------
  console.log("\n3) BEKLEYEN MIGRATION");
  const cocukOrtam = { ...process.env, DATABASE_URL: ham };
  try {
    const durum = execFileSync(
      "npx",
      ["prisma", "migrate", "status"],
      { env: cocukOrtam, stdio: "pipe", shell: process.platform === "win32" },
    ).toString();
    for (const satir of durum.split(/\r?\n/)) {
      if (satir.trim() !== "") console.log(`     ${satir}`);
    }
  } catch (e) {
    // `migrate status` bekleyen migration varsa 1 ile çıkar — bu HATA DEĞİL.
    const cikti = (e as { stdout?: Buffer }).stdout?.toString() ?? String(e);
    for (const satir of parolayiTemizle(cikti, parola).split(/\r?\n/)) {
      if (satir.trim() !== "") console.log(`     ${satir}`);
    }
  }

  // --- 4) Uygula ------------------------------------------------------------
  console.log("\n4) UYGULANIYOR");
  try {
    const cikti = execFileSync(
      "npx",
      ["prisma", "migrate", "deploy"],
      { env: cocukOrtam, stdio: "pipe", shell: process.platform === "win32" },
    ).toString();
    for (const satir of cikti.split(/\r?\n/)) {
      if (satir.trim() !== "") console.log(`     ${satir}`);
    }
    basarili("migrate deploy tamam");
  } catch (e) {
    const cikti =
      (e as { stdout?: Buffer }).stdout?.toString() +
      "\n" +
      ((e as { stderr?: Buffer }).stderr?.toString() ?? "");
    console.log(parolayiTemizle(cikti, parola));
    basarisiz("migrate deploy BAŞARISIZ — canlı şema değişmedi.");
    process.exitCode = 1;
    return;
  }

  // --- 5) Sağlık kontrolü ---------------------------------------------------
  console.log("\n5) SAĞLIK KONTROLÜ — yeni kolonlar canlıda okunuyor mu");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(ham) });
  try {
    const kategoriler = await prisma.category.findMany({
      select: { name: true, code: true },
      take: 5,
    });
    basarili(
      `Category.code okundu — ${kategoriler
        .map((k) => `${k.name}=${k.code ?? "boş"}`)
        .join(" · ")}`,
    );

    const tedarikciler = await prisma.supplier.findMany({
      select: { name: true, code: true },
      take: 5,
    });
    basarili(
      `Supplier.code okundu — ${
        tedarikciler.map((t) => `${t.name}=${t.code ?? "boş"}`).join(" · ") ||
        "(tedarikçi yok)"
      }`,
    );

    const alimSayisi = await prisma.purchase.count({
      where: { supplierOrderNo: null },
    });
    basarili(`Purchase.supplierOrderNo okundu — ${alimSayisi} kayıtta boş`);

    console.log("\nCANLI ŞEMA GÜNCEL.\n");
  } catch (e) {
    console.log(parolayiTemizle(String(e), parola));
    basarisiz("Kolonlar okunamadı — şema ile kod arasında fark var.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.log(`  ✗  beklenmeyen hata: ${String(e).slice(0, 400)}`);
  process.exitCode = 1;
});
