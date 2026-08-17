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

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { beklenenSemayiCikar } from "./migration-semasi";
import { DAMGA_YOLU, migrationKlasorleri } from "./deploy-bekci";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import {
  CANLI_DOSYA,
  canliYapilandirma,
  kurulumuAnlat,
  parolayiTemizle,
} from "./canli-ortak";

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

async function main() {
  console.log("\nCANLI MIGRATION\n");

  // --- 0) Adres dosyası -----------------------------------------------------
  // Okuma ve doğrulama `canli-ortak.ts` içinde; canlı adresin nereden geldiği
  // tek yerde tanımlı (canli:test aynı kaynaktan okur).
  const cozum = canliYapilandirma();
  if (!cozum.tamam) {
    if (cozum.hata.kod === "DOSYA_YOK") {
      basarisiz(`${CANLI_DOSYA} bulunamadı.`);
      kurulumuAnlat();
    } else if (cozum.hata.kod === "EKSIK") {
      basarisiz(`${CANLI_DOSYA} eksik: ${cozum.hata.eksikler.join(", ")}`);
    } else if (cozum.hata.kod === "BOS") {
      basarisiz(`${CANLI_DOSYA} içinde bağlantı bilgisi yok.`);
      kurulumuAnlat();
    } else {
      basarisiz("CANLI_DATABASE_URL okunamadı.");
      console.log("     Biçim: mysql://kullanici:parola@sunucu:3306/veritabani\n");
    }
    process.exitCode = 1;
    return;
  }

  const { ham, parola, adres, kaynak, yerelMi } = cozum.veri;

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
  console.log(`     kaynak      ${kaynak}`);
  console.log(`     sunucu      ${adres.hostname}`);
  console.log(`     veritabanı  ${adres.pathname.slice(1)}`);
  console.log(`     kullanıcı   ${adres.username}`);

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

    /**
     * DAMGAYI BURASI YAZAR — insan değil.
     *
     * `deploy-bekci.ts` katman B "hangi migration canlıda koştu" sorusunu bu
     * dosyadan cevaplıyor ve Vercel'in build makinesi canlı veritabanına
     * bağlanamayabiliyor (KAS uzak erişimi IP listesine bağlı). Liste elle
     * tutulsaydı, güncellemeyi unutan ilk kişide bekçi yalancı yeşil verirdi.
     * `migrate deploy` başarılı olduğu ana yazılıyor: uygulanan küme = disk
     * üzerindeki bütün migration'lar.
     */
    const uygulananlar = migrationKlasorleri();
    writeFileSync(
      DAMGA_YOLU,
      JSON.stringify(
        {
          aciklama:
            "CANLIDA UYGULANMIS MIGRATION LISTESI. Bu dosyayi ELLE DUZENLEMEYIN — npm run canli:migrate basariyla bitince kendisi yazar. deploy-bekci.ts katman B bunu okur.",
          guncelleme: new Date().toISOString().slice(0, 10),
          uygulananlar,
        },
        null,
        2,
      ) + "\n",
    );
    basarili(
      `damga güncellendi — ${uygulananlar.length} migration (prisma/canli-migrasyon-damgasi.json)`,
    );
    console.log("     Bu dosya COMMIT EDİLİR; bekçi onu okuyup deploy'a izin verir.");
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
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(betikAdresi(ham)) });
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

    /**
     * ════════════════════════════════════════════════════════════════════
     *  YAPISAL DOĞRULAMA — LİSTE ELLE TUTULMUYOR (16.08.2026)
     * --------------------------------------------------------------------
     *  Buradaki kontroller önce ELLE yazılıyordu ve yorumu bile "her
     *  migration'da genişletilir" diye uyarıyordu. Disiplin tam da
     *  öngörüldüğü gibi tutmadı: `GecmisEkstre` gönderildi, sağlık
     *  kontrolü onu HİÇ sormadı ve yine "CANLI ŞEMA GÜNCEL" dedi.
     *
     *  Beklenen şema artık MIGRATION DOSYALARINDAN türetiliyor ve canlının
     *  `information_schema`sıyla karşılaştırılıyor. Yeni tablo/kolon
     *  gönderen kişinin eklemesi gereken bir satır YOK — unutulabilecek
     *  adım ortadan kalktı.
     * ════════════════════════════════════════════════════════════════════
     */
    const { tablolar } = beklenenSemayiCikar();
    const canliSutunlar = await prisma.$queryRawUnsafe<
      { TABLE_NAME: string; COLUMN_NAME: string }[]
    >(
      "SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()",
    );
    const canli = new Map<string, Set<string>>();
    for (const r of canliSutunlar) {
      const k = canli.get(r.TABLE_NAME) ?? new Set<string>();
      k.add(r.COLUMN_NAME);
      canli.set(r.TABLE_NAME, k);
    }

    const eksikler: string[] = [];
    for (const [tablo, kolonlar] of tablolar) {
      const mevcut = canli.get(tablo);
      if (!mevcut) {
        eksikler.push(`tablo YOK: ${tablo}`);
        continue;
      }
      for (const kolon of kolonlar) {
        if (!mevcut.has(kolon)) eksikler.push(`kolon YOK: ${tablo}.${kolon}`);
      }
    }

    if (eksikler.length > 0) {
      for (const e of eksikler) basarisiz(e);
      throw new Error("Şema eksik");
    }
    const kolonSayisi = [...tablolar.values()].reduce((t, k) => t + k.size, 0);
    basarili(
      `${tablolar.size} tablo · ${kolonSayisi} eklenmiş kolon canlıda DOĞRULANDI`,
    );

    /** En son migration'ın getirdiği tablo(lar) ayrıca sayılır. */
    const gecmisEkstreSayisi = await prisma.gecmisEkstre.count();
    basarili(`GecmisEkstre okundu — ${gecmisEkstreSayisi} kayıt (yeni tablo)`);

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
