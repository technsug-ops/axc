/**
 * ============================================================================
 *  KULLANICI OLUŞTUR / PAROLA DEĞİŞTİR
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *    npm run kullanici:olustur -- ad@firma.com "parolam" "Görünen Ad"
 *
 *  Canlı veritabanı için ortam değişkeniyle:
 *    DATABASE_URL="mysql://..." npm run kullanici:olustur -- ad@firma.com "parola"
 *
 *  Var olan e-posta verilirse PAROLA DEĞİŞTİRİR ve `sessionVersion` artırır —
 *  yani açık tüm oturumlar kapanır. Parola değiştirmenin anlamı budur;
 *  eski parolayla açılmış oturumun yaşamaya devam etmesi doğru olmazdı.
 *
 *  Parola KOMUT SATIRINDAN alınır ve ekrana ASLA yazılmaz.
 * ============================================================================
 */

import "dotenv/config";

import {
  EN_AZ_PAROLA_UZUNLUGU,
  parolaOzetle,
  parolaYeterliMi,
} from "../src/lib/parola";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [epostaHam, parola, ad] = process.argv.slice(2);

  if (!epostaHam || !parola) {
    console.log(
      '\nKullanım: npm run kullanici:olustur -- ad@firma.com "parola" "Görünen Ad"\n',
    );
    process.exitCode = 1;
    return;
  }

  const eposta = epostaHam.trim().toLocaleLowerCase("tr");
  if (!eposta.includes("@")) {
    console.log("E-posta geçersiz.");
    process.exitCode = 1;
    return;
  }

  if (!parolaYeterliMi(parola)) {
    console.log(`Parola en az ${EN_AZ_PAROLA_UZUNLUGU} karakter olmalı.`);
    process.exitCode = 1;
    return;
  }

  const ozet = await parolaOzetle(parola);
  const mevcut = await prisma.user.findUnique({ where: { email: eposta } });

  if (mevcut) {
    await prisma.user.update({
      where: { id: mevcut.id },
      data: {
        passwordHash: ozet,
        isActive: true,
        // Parola değişti: açık oturumların hepsi kapanmalı.
        sessionVersion: { increment: 1 },
        ...(ad ? { name: ad } : {}),
      },
    });
    console.log(`\nParola değiştirildi: ${eposta}`);
    console.log("Açık tüm oturumlar kapatıldı; yeniden giriş gerekiyor.\n");
  } else {
    await prisma.user.create({
      data: { email: eposta, passwordHash: ozet, name: ad ?? null },
    });
    console.log(`\nKullanıcı oluşturuldu: ${eposta}\n`);
  }

  const toplam = await prisma.user.count();
  console.log(`Sistemdeki toplam kullanıcı: ${toplam}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Hata:", e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
