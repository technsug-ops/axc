import { writeFileSync, mkdirSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  YEREL BAĞ ANLIK GÖRÜNTÜSÜ — K91 YAZIMI İÇİN YEDEK (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-yerel-bag-anlik.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bir yazımın öncesini dosyaya alır.
 *
 *  ⛔ NİYE VAR: 31.08.2026'da `npm run canli:yedek` ve `canli:ham-yedek`
 *  İKİSİ DE düştü — **Vercel Blob deposu askıya alınmış**
 *  ("This store has been suspended"). Yani bugün canlının HİÇBİR yedeği
 *  alınamıyor; bu K91'den bağımsız ve ondan BÜYÜK bir arıza.
 *
 *  ⚠ BU DOSYA TAM YEDEK DEĞİLDİR VE ÖYLE ANLATILMAZ. Yalnız K91 yazımının
 *  DOKUNDUĞU alanı taşır: her stok hareketinin `id` → `sourceMovementId`
 *  eşlemesi. Başka bir tabloyu, başka bir alanı geri getirmez.
 *  _(Anayasa: metin, sahip olmadığı anlamı iddia etmez.)_
 *
 *  ⭐ AMA BU YAZIM İÇİN YETERLİ: yazım YALNIZ `sourceMovementId` alanını
 *  değiştiriyor (+ `AuditLog` ekliyor). Bu eşleme, 64 satırın hepsini —
 *  hatta defterin tamamını — eski hâline döndürmeye yeter.
 * ============================================================================
 */

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const hareketler = await prisma.stockMovement.findMany({
    select: { id: true, sourceMovementId: true, unitCostAmount: true },
    orderBy: { id: "asc" },
  });

  const an = new Date().toISOString().replace(/[:.]/g, "-");
  const klasor = "veri/yedek-yerel";
  mkdirSync(klasor, { recursive: true });
  const yol = `${klasor}/bag-anlik-${an}.json`;

  writeFileSync(
    yol,
    JSON.stringify(
      {
        _UYARI:
          "TAM YEDEK DEGILDIR. Yalniz StockMovement.sourceMovementId ve " +
          "unitCostAmount alanlarini tasir. Vercel Blob deposu askiya " +
          "alindigi icin (31.08.2026) normal yedek yolu calismiyordu.",
        alindi: new Date().toISOString(),
        hedef: y.veri.adres.hostname,
        adet: hareketler.length,
        hareketler: hareketler.map((h) => ({
          id: h.id,
          src: h.sourceMovementId,
          maliyet: h.unitCostAmount?.toString() ?? null,
        })),
      },
      null,
      1,
    ),
    "utf8",
  );

  console.log("\nYEREL BAĞ ANLIK GÖRÜNTÜSÜ");
  console.log("  hedef   " + y.veri.adres.hostname);
  console.log("  hareket " + hareketler.length);
  console.log("  dosya   " + yol);
  console.log(
    "\n  ⚠ TAM YEDEK DEĞİL — yalnız sourceMovementId + unitCostAmount.",
  );

  await prisma.$disconnect();
}

void main();
