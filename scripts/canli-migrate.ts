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
 *  KURULUM (bir kez) — İKİ YOLDAN BİRİ:
 *
 *  A) HAZIR ADRESİ YAPIŞTIR (en kolay)
 *     Vercel > Settings > Environment Variables > DATABASE_URL değerini
 *     kopyalayın, `.env.canli` dosyasına tek satır yazın:
 *
 *         CANLI_DATABASE_URL=mysql://kullanici:parola@sunucu:3306/veritabani
 *
 *  B) PARÇA PARÇA YAZ (adres kurmakla uğraşmayın)
 *     KAS panelindeki dört değeri ayrı satırlara yazın; komut adresi
 *     kendisi kurar ve paroladaki özel karakterleri kendisi kaçırır:
 *
 *         CANLI_SUNUCU=w0216a46.kasserver.com
 *         CANLI_KULLANICI=d047df6e
 *         CANLI_PAROLA=parolaniz
 *         CANLI_VERITABANI=d047df6e
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
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";

const CANLI_DOSYA = ".env.canli";

/**
 * Alt komutlar SABİT metin olarak çalıştırılır (execSync), dizi argümanla
 * değil. İki sebep:
 *  - Windows'ta `npm`/`npx` birer .cmd dosyasıdır; Node 24 bunları kabuk
 *    açmadan çalıştırmayı güvenlik gereği reddeder (CVE-2024-27980).
 *  - Argüman dizisini kabuğa vermek kaçırma yapmadan birleştirir (DEP0190).
 * Komut metninde kullanıcıdan gelen HİÇBİR veri yok; bağlantı adresi
 * argümanla değil ORTAM DEĞİŞKENİYLE geçiyor, o yüzden ekrana da düşmüyor.
 */

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
  /** Dosya yoksa ya da eksikse: ne yazılacağı TAM OLARAK gösterilir. */
  function kurulumuAnlat() {
    console.log("");
    console.log(`     Proje kökünde "${CANLI_DOSYA}" dosyası açın.`);
    console.log("     İKİ YOLDAN BİRİ yeter:");
    console.log("");
    console.log("     A) Vercel > Settings > Environment Variables > DATABASE_URL");
    console.log("        değerini kopyalayıp tek satır yazın:");
    console.log("");
    console.log("          CANLI_DATABASE_URL=mysql://kullanici:parola@sunucu:3306/veritabani");
    console.log("");
    console.log("     B) Ya da KAS panelindeki dört değeri ayrı satırlara yazın,");
    console.log("        adresi komut kendisi kurar:");
    console.log("");
    console.log("          CANLI_SUNUCU=w0216a46.kasserver.com");
    console.log("          CANLI_KULLANICI=d047df6e");
    console.log("          CANLI_PAROLA=parolaniz");
    console.log("          CANLI_VERITABANI=d047df6e");
    console.log("");
    console.log("     Dosya git'e GİRMEZ (.gitignore -> .env*).\n");
  }

  if (!existsSync(CANLI_DOSYA)) {
    basarisiz(`${CANLI_DOSYA} bulunamadı.`);
    kurulumuAnlat();
    process.exitCode = 1;
    return;
  }

  const { parsed } = config({ path: CANLI_DOSYA });

  /**
   * Adres ya hazır verilir ya da parçalardan kurulur.
   * Parçadan kurarken parola KAÇIRILIR (encodeURIComponent): "@" ya da ":"
   * içeren bir parola elle yazılmış adreste bağlantıyı sessizce bozardı.
   */
  function adresiCoz(): { ham: string; kaynak: string } | null {
    const hazir = (parsed?.CANLI_DATABASE_URL ?? "").trim();
    if (hazir !== "") return { ham: hazir, kaynak: "CANLI_DATABASE_URL" };

    const sunucu = (parsed?.CANLI_SUNUCU ?? "").trim();
    const kullanici = (parsed?.CANLI_KULLANICI ?? "").trim();
    const parola = parsed?.CANLI_PAROLA ?? "";
    const veritabani = (parsed?.CANLI_VERITABANI ?? "").trim();

    const eksikler = [
      sunucu === "" ? "CANLI_SUNUCU" : null,
      kullanici === "" ? "CANLI_KULLANICI" : null,
      parola === "" ? "CANLI_PAROLA" : null,
      veritabani === "" ? "CANLI_VERITABANI" : null,
    ].filter(Boolean);

    // Hiçbiri yoksa "dosya boş" demektir; bazısı varsa eksik olanı söyle.
    if (eksikler.length === 4) return null;
    if (eksikler.length > 0) {
      basarisiz(`${CANLI_DOSYA} eksik: ${eksikler.join(", ")}`);
      return null;
    }

    const port = (parsed?.CANLI_PORT ?? "3306").trim();
    return {
      ham: `mysql://${encodeURIComponent(kullanici)}:${encodeURIComponent(parola)}@${sunucu}:${port}/${veritabani}`,
      kaynak: "parçalardan kuruldu",
    };
  }

  const cozum = adresiCoz();
  if (!cozum) {
    if (!parsed?.CANLI_SUNUCU) {
      basarisiz(`${CANLI_DOSYA} içinde bağlantı bilgisi yok.`);
      kurulumuAnlat();
    }
    process.exitCode = 1;
    return;
  }
  const ham = cozum.ham;

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
    execSync("npm run --silent migration:kontrol", { stdio: "pipe" });
    basarili("harf bekçisi temiz");
  } catch {
    basarisiz("harf bekçisi HATA verdi — canlıya gönderilmez.");
    console.log("     Ayrıntı için:  npm run migration:kontrol\n");
    process.exitCode = 1;
    return;
  }

  // --- 2) Hedef denetimi ----------------------------------------------------
  console.log("\n2) HEDEF (parola gizli)");
  console.log(`     kaynak      ${cozum.kaynak}`);
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
    const durum = execSync("npx prisma migrate status", {
      env: cocukOrtam,
      stdio: "pipe",
    }).toString();
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
    const cikti = execSync("npx prisma migrate deploy", {
      env: cocukOrtam,
      stdio: "pipe",
    }).toString();
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
