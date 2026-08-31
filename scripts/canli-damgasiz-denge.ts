import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
import {
  damgasizDenge,
  dengeBozukMu,
  type DengeSatiri,
} from "../src/lib/damgasiz-denge";

/**
 * ============================================================================
 *  DAMGASIZ HAREKET DENGESİ — AYNA MI, BOŞLUK MU (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:damgasiz-denge
 *
 *  BETIK SINIFI: SUREKLI — rutin koşabilir; hiçbir şey YAZMAZ.
 *
 *  ⛔ NİYE EKRAN DEĞİL BU: K118 "sayım eksiği çıkışları maliyeti
 *  giderleşmemiş olarak ayrı görünsün" diyordu. Ölçüm öncülü ÇÜRÜTTÜ
 *  (31.08.2026, canlı):
 *
 *      damgasız GİRİŞ   5 hareket · 19 adet
 *      damgasız ÇIKIŞ   6 hareket · 19 adet
 *      NET              0        — dört varyantın DÖRDÜNDE de
 *
 *  Bunlar iptal/geri-alma ve sayım düzeltme çevrimlerinin AYNA ÇİFTLERİ:
 *  damgasız bir giriş, damgasız bir çıkışla eşleşiyor. Gider tarafında
 *  boşluk YOK — ve bugün hep boş görünecek bir kart açmak, K49'un
 *  yasakladığı şeydir: okunmayan bir satır kutunun TAMAMINA olan güveni
 *  eritir. Onun yerine DEĞİŞMEZ ölçülüyor; gerçek bir boşluk doğduğu gün
 *  konuşur.
 *
 *  ⛔ VE ÇARE OTOMATİK DAMGA YAZMAK DEĞİL: bir ayna çiftinin yalnız çıkış
 *  yarısına türetilmiş maliyet yazmak boşluğu KAPATMAZ, AÇAR. (Ölçüldü:
 *  türetilebilir 3 satırın üçü de ayna yarısı, ₺7.902,45.)
 *
 *  ⭐ KARAR SAF GÖVDEDE (`damgasizDenge`) — bu betik yalnız VERİYİ getirir.
 * ============================================================================
 */

function yaz(d: DengeSatiri): string {
  return (
    `${d.sku.padEnd(24)} giriş ${String(d.giris).padStart(4)}` +
    ` · çıkış ${String(d.cikis).padStart(4)} · NET ${String(d.net).padStart(5)}`
  );
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  console.log("\nDAMGASIZ HAREKET DENGESİ");
  console.log("  hedef  " + y.veri.adres.hostname);
  console.log("  kip    SALT OKUMA — hiçbir şey yazılmaz");
  console.log("=".repeat(68));

  const hareketler = await prisma.stockMovement.findMany({
    where: { unitCostAmount: null },
    select: {
      quantityDelta: true,
      variantId: true,
      variant: { select: { sku: true } },
    },
  });

  const sonuc = damgasizDenge(
    hareketler.map((h) => ({
      variantId: h.variantId,
      sku: h.variant.sku,
      quantityDelta: h.quantityDelta,
    })),
  );

  console.log("\n   damgasız hareket        " + sonuc.hareket);
  console.log("   giriş adedi             " + sonuc.girisAdet);
  console.log("   çıkış adedi             " + sonuc.cikisAdet);
  console.log("\n   incelenen varyant       " + sonuc.incelenen);
  console.log("   TEMİZ (net 0, ayna)     " + sonuc.temiz);
  console.log("   maliyeti GİDERLEŞMEMİŞ  " + sonuc.giderlesmemis.length);
  console.log("   maliyeti BİLİNMEYEN mal " + sonuc.bilinmeyenGiren.length);

  if (sonuc.giderlesmemis.length > 0) {
    console.log("\n   ⛔ MALİYETİ GİDERLEŞMEDEN ÇIKMIŞ MAL:\n");
    for (const d of sonuc.giderlesmemis) console.log("     " + yaz(d));
  }
  if (sonuc.bilinmeyenGiren.length > 0) {
    console.log("\n   ⚠ MALİYETİ BİLİNMEYEN MAL GİRMİŞ:\n");
    for (const d of sonuc.bilinmeyenGiren) console.log("     " + yaz(d));
  }

  console.log("\n" + "-".repeat(68));
  if (!dengeBozukMu(sonuc)) {
    console.log("   OK  damgasız hareketlerin hepsi AYNA — net sıfır.");
    console.log("   ⚠ Bu 'damga eksikliği yok' demek DEĞİL: hareketler damgasız,");
    console.log("     ama giriş ve çıkış birbirini götürdüğü için değerlemede");
    console.log("     boşluk açmıyorlar.");
    await prisma.$disconnect();
    return;
  }
  console.log("   ⛔ DENGE BOZUK — yukarıdaki varyantlar bakılmayı bekliyor.");
  console.log("   ⚠ VE ÇARE OTOMATİK DAMGA YAZMAK DEĞİLDİR: bir çiftin yalnız");
  console.log("     bir yarısına damga yazmak boşluğu KAPATMAZ, AÇAR.");
  process.exitCode = 1;
  await prisma.$disconnect();
}

void main();
