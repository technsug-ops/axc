/**
 * ============================================================================
 *  CANLI İZİN SENKRONU
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:yetki
 *
 *  NEDEN AYRI KOMUT VAR (13.08.2026'da canlıda 404 ile ortaya çıktı):
 *
 *  Yeni bir izin eklendiğinde iki yerde iş var: KOD (deploy ile gider) ve
 *  VERİTABANI (rol-izin satırları). İkincisi unutulunca ekran sessizce
 *  KAYBOLUR — `sayfaIzni` izni bulamayınca `notFound()` döner ve kullanıcı
 *  "sayfa yok" sanır. Menüde görünür ama açılmaz; en kafa karıştırıcı hata
 *  türü. Tam olarak bu yaşandı: /iadeler menüye geldi, tıklayınca 404.
 *
 *  `npx prisma db seed` bu işi yapardı AMA tüm seed'i çalıştırır (kanallar,
 *  kategoriler, 44.841 satırlık kargo tarifesi...). Canlıda gereksiz ve
 *  ağır. Bu komut YALNIZ rol-izin satırlarına dokunur.
 *
 *  Kural değişmedi: SAHİP'in izinleri her koşuda tazelenir, OPERASYON'un
 *  izinleri toptan EZİLMEZ — yalnız "sonradan doğan" izinler eklenir.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { yetkiSeed } from "../prisma/seed-yetki";
import { canliYapilandirma, parolayiTemizle } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }

  console.log("");
  console.log("CANLI İZİN SENKRONU");
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log("");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(betikAdresi(y.veri.ham)),
  });

  try {
    await yetkiSeed(prisma);
    console.log("");
    console.log("  ✓ izinler canlıda güncel");
  } catch (e) {
    console.log("  ✗ HATA:", parolayiTemizle(String(e), y.veri.parola).slice(0, 300));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
