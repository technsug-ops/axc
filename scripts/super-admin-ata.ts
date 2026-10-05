import "dotenv/config";

import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { UYGULAMA } from "../src/lib/uygulama";

/**
 * ============================================================================
 *  SÜPER ADMİN ATA — Selliora yönetim katmanı (K303 4c-2, 04.10.2026)
 * ----------------------------------------------------------------------------
 *      npm run super-admin:ata -- --eposta=ceo@ornek.com --ad="Ad Soyad"
 *
 *  Kullanıcı kararı 04.10.2026: Selliora bir firma DEĞİL, süper admin
 *  katmanıdır; yetki KİŞİYE bağlıdır (`User.isSuperAdmin`). Giriş `/<teknik ad>` (05.10.2026 öncesi `/selliora`).
 *
 *  · Hesap YOKSA açılır: parola rastgele üretilir ve YALNIZ masaüstündeki
 *    dosyaya yazılır (ekrana basılmaz; dosya varsa ÜSTÜNE YAZILMAZ). Parola
 *    komut satırından ALINMAZ — kabuk geçmişinde kalırdı.
 *  · Hesap VARSA yalnız işaret konur; parolasına dokunulmaz.
 *  · Her atama `AuditLog`a iz bırakır (SUPER_ADMIN_ATANDI).
 *  · ⛔ Yalnız DENEME kurulumunda koşar — canlı Axcali K303 kanıtlanana kadar
 *    değişmez (anayasa). Geçiş günü bu kapı kaldırılır.
 * ============================================================================
 */

function arg(ad: string): string | undefined {
  const on = `--${ad}=`;
  return process.argv.find((a) => a.startsWith(on))?.slice(on.length);
}

async function main() {
  const { denemeOrtamiMi } = await import("../src/lib/deneme-ortami");
  if (!denemeOrtamiMi()) {
    console.log("\n  DURDU: yalnız deneme kurulumunda (DENEME_ORTAMI=1) koşar — hiçbir şey yazılmadı.\n");
    process.exitCode = 1;
    return;
  }
  const eposta = (arg("eposta") ?? "").trim().toLocaleLowerCase("tr");
  const ad = arg("ad")?.trim() || null;
  if (!eposta.includes("@")) {
    console.log('\n  Kullanım: npm run super-admin:ata -- --eposta=ad@ornek.com --ad="Ad Soyad"\n');
    process.exitCode = 1;
    return;
  }

  const { sistemPrisma } = await import("../src/lib/prisma");
  const { parolaOzetle } = await import("../src/lib/parola");
  const { izYaz } = await import("../src/lib/iz");

  // SISTEM: Model 2 (05.10.2026) — süper admin FİRMASIZ hesaptır; yalnız firmasız
  // hesaplar aranır. Aynı e-postalı bir FİRMA hesabı süper admin yapılmaz, ayrı kalır.
  const mevcut = await sistemPrisma.user.findFirst({ where: { email: eposta, hesapFirmasiId: null }, select: { id: true, isSuperAdmin: true } });
  let kullaniciId: string;
  if (mevcut) {
    if (mevcut.isSuperAdmin) {
      console.log(`\n  ${eposta} zaten süper admin — hiçbir şey değişmedi.\n`);
      await sistemPrisma.$disconnect();
      return;
    }
    // SISTEM: işaret kişiye yazılır.
    await sistemPrisma.user.update({ where: { id: mevcut.id }, data: { isSuperAdmin: true } });
    kullaniciId = mevcut.id;
    console.log(`\n  Var olan hesaba süper admin işareti kondu: ${eposta} (parolası değişmedi)`);
  } else {
    const dosya = join(homedir(), "Desktop", `${UYGULAMA.teknikAd}-super-admin-giris.txt`);
    if (existsSync(dosya)) throw new Error(`${dosya} zaten var — hiçbir şey yazılmadı (eski dosyayı kaldırın)`);
    const parola = randomBytes(12).toString("base64url");
    // SISTEM: kullanıcı küreseldir.
    const yeni = await sistemPrisma.user.create({
      // Parola betikle üretilip dosyaya yazıldı → ilk girişte değiştirmek ZORUNLU (05.10.2026).
      data: { email: eposta, name: ad, passwordHash: await parolaOzetle(parola), isSuperAdmin: true, mustChangePassword: true },
      select: { id: true },
    });
    kullaniciId = yeni.id;
    writeFileSync(dosya, `${UYGULAMA.ad.toLocaleUpperCase("tr")} — SÜPER ADMİN (deneme, yalniz bu bilgisayar)\nAdres  : http://localhost:3100/${UYGULAMA.teknikAd}\nE-posta: ${eposta}\nParola : ${parola}\n`, { flag: "wx" });
    console.log(`\n  Süper admin hesabı açıldı: ${eposta} · parola masaüstündeki ${UYGULAMA.teknikAd}-super-admin-giris.txt dosyasında (ekrana basılmadı)`);
  }
  await izYaz({ action: "SUPER_ADMIN_ATANDI", targetType: "User", targetId: kullaniciId, userId: null, detail: JSON.stringify({ eposta }) });
  const sayi = await sistemPrisma.user.count({ where: { isSuperAdmin: true } });
  console.log(`  Sistemdeki süper admin sayısı: ${sayi}\n`);
  await sistemPrisma.$disconnect();
}

main().catch((e) => {
  console.error("\n  HATA:", String(e).replace(/\s+/g, " "), "\n");
  process.exitCode = 1;
});
