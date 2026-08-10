/**
 * ============================================================================
 *  VERİTABANI BAĞLANTI TESTİ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run baglanti:test
 *
 *  Canlıya geçmeden önce sorulacak tek soru: "bu veritabanına DIŞARIDAN
 *  bağlanılabiliyor mu?" Vercel'deki sunucu sizin bilgisayarınızı göremez;
 *  paylaşımlı hostinglerin çoğu da MySQL'e dışarıdan erişimi varsayılan
 *  olarak KAPATIR.
 *
 *  Bu betik `.env` içindeki DATABASE_URL'i okur ve üç şeyi sırayla dener:
 *    1. Adres çözülüyor mu (DNS)
 *    2. Port açık mı (TCP)
 *    3. Kullanıcı/parola geçiyor mu ve şema yerinde mi (gerçek sorgu)
 *
 *  PAROLA HİÇBİR ZAMAN EKRANA YAZILMAZ. Çıktıyı ekran görüntüsü olarak
 *  paylaşmak güvenlidir.
 * ============================================================================
 */

import "dotenv/config";
import { lookup } from "node:dns/promises";
import { connect } from "node:net";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

const TCP_ZAMAN_ASIMI_MS = 8000;

/**
 * Hata metinleri bağlantı dizesini içerebiliyor. Bu çıktının ekran görüntüsü
 * olarak paylaşılması bekleniyor, o yüzden parola ne olursa olsun silinir.
 */
function parolayiTemizle(metin: string): string {
  let temiz = metin.replace(/(mysql:\/\/[^:\s]+:)[^@\s]+(@)/gi, "$1***$2");
  const parola = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").password;
    } catch {
      return "";
    }
  })();
  if (parola.length > 0) temiz = temiz.split(parola).join("***");
  return temiz;
}

function basarili(mesaj: string) {
  console.log(`  ✓  ${mesaj}`);
}
function basarisiz(mesaj: string, ayrinti?: unknown) {
  console.log(`  ✗  ${mesaj}`);
  if (ayrinti !== undefined) {
    console.log(`     ${parolayiTemizle(String(ayrinti))}`);
  }
}

function portuDene(host: string, port: number): Promise<boolean> {
  return new Promise((coz) => {
    const soket = connect({ host, port });
    const bitir = (sonuc: boolean) => {
      soket.destroy();
      coz(sonuc);
    };
    soket.setTimeout(TCP_ZAMAN_ASIMI_MS);
    soket.once("connect", () => bitir(true));
    soket.once("timeout", () => bitir(false));
    soket.once("error", () => bitir(false));
  });
}

async function main() {
  const ham = process.env.DATABASE_URL;
  if (!ham) {
    basarisiz("DATABASE_URL tanımlı değil — .env dosyasını kontrol edin.");
    process.exitCode = 1;
    return;
  }

  let adres: URL;
  try {
    adres = new URL(ham);
  } catch {
    basarisiz("DATABASE_URL okunamadı. Biçim: mysql://kullanici:parola@host:3306/veritabani");
    process.exitCode = 1;
    return;
  }

  const host = adres.hostname;
  const port = Number(adres.port || 3306);
  const veritabani = adres.pathname.slice(1);
  const kullanici = adres.username;

  console.log("\nBAĞLANTI HEDEFİ (parola gizli)");
  console.log(`  host        ${host}`);
  console.log(`  port        ${port}`);
  console.log(`  veritabanı  ${veritabani}`);
  console.log(`  kullanıcı   ${kullanici}`);

  const yerelMi =
    host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (yerelMi) {
    console.log("\n⚠  BU ADRES SİZİN BİLGİSAYARINIZ.");
    console.log(
      "   Vercel'deki sunucu buraya ASLA ulaşamaz. Canlı için internetten",
    );
    console.log("   erişilebilen bir MySQL adresi gerekir.");
  }

  console.log("\n1) ADRES ÇÖZÜMLEME (DNS)");
  if (yerelMi) {
    basarili("yerel adres — çözümleme gerekmiyor");
  } else {
    try {
      const { address } = await lookup(host);
      basarili(`${host} → ${address}`);
    } catch (e) {
      basarisiz(`${host} çözümlenemedi — adres yanlış olabilir`, e);
      process.exitCode = 1;
      return;
    }
  }

  console.log("\n2) PORT AÇIK MI (TCP)");
  const acik = await portuDene(host, port);
  if (acik) {
    basarili(`${host}:${port} yanıt veriyor`);
  } else {
    basarisiz(`${host}:${port} yanıt vermedi`);
    console.log(
      "     En olası sebep: hosting MySQL'e DIŞARIDAN erişimi kapatmış.",
    );
    console.log(
      "     Paylaşımlı hostinglerde bu ayar panelden açılır; açılamıyorsa",
    );
    console.log("     o veritabanı Vercel ile kullanılamaz.");
    process.exitCode = 1;
    return;
  }

  console.log("\n3) GİRİŞ VE ŞEMA");
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(ham) });
  try {
    await prisma.$queryRaw`SELECT 1`;
    basarili("kullanıcı adı ve parola geçti");
  } catch (e) {
    basarisiz("giriş başarısız — kullanıcı/parola veya yetki sorunu", e);
    await prisma.$disconnect();
    process.exitCode = 1;
    return;
  }

  try {
    const urun = await prisma.product.count();
    const satis = await prisma.sale.count();
    const hareket = await prisma.stockMovement.count();
    basarili(
      `şema yerinde — ${urun} ürün · ${satis} satış · ${hareket} stok hareketi`,
    );
    if (urun === 0 && satis === 0) {
      console.log("     (boş veritabanı — migration ve seed bekliyor olabilir)");
    }
  } catch {
    basarisiz("tablolar bulunamadı");
    console.log("     Bu veritabanına henüz migration uygulanmamış.");
    console.log("     Sıradaki adım:  npx prisma migrate deploy");
  }

  await prisma.$disconnect();
  console.log("");
}

main().catch((e) => {
  basarisiz("beklenmeyen hata", e);
  process.exitCode = 1;
});
