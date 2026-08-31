import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  MALİYETİ BİLİNMEYEN — İKİ AYRI ŞEY, AYRI ÖLÇÜLÜR (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — K116③'ün öncülünü doğrular.
 *
 *  ⛔ NİYE: K116③ "maliyeti null olan stok (bugün 14 adet) toplam değere 0
 *  olarak karışmasın" diyor. Ama "14 adet" benim raporumdaki BAŞKA bir
 *  rakamdan geliyor olabilir. İki apayrı şey var ve karıştırılırsa var
 *  olmayan bir işe girişilir:
 *
 *    (a) ELDE DURAN, maliyeti bilinmeyen parti  → envanter DEĞERİNİ etkiler
 *    (b) ÇIKMIŞ, maliyeti damgalanmamış hareket → değerlemede BOŞLUK bırakır
 *
 *  Raporda geçen "29.08 sayımında 14 adet maliyetsiz düşülmüş" (b)'dir.
 *  (a) için ölçülen sayı AYRIDIR ve burada ikisi ayrı basılıyor.
 *  _(Anayasa: "sıfır üç farklı şey olabilir — üçü ayrı sayılır".)_
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
  const { acikPartilerToplu } = await import("../src/lib/stok");

  console.log("\nMALİYETİ BİLİNMEYEN — İKİ AYRI ŞEY");
  console.log("  kip  SALT OKUMA");
  console.log("=".repeat(66));

  /* ═══ (a) ELDE DURAN, MALİYETİ BİLİNMEYEN PARTİ ═══════════════════ */
  const harita = await acikPartilerToplu(prisma, null);
  let acikParti = 0;
  let bilinmeyenParti = 0;
  let bilinmeyenAdet = 0;
  for (const partiler of harita.values()) {
    for (const p of partiler) {
      acikParti += 1;
      if (p.birimMaliyet === null) {
        bilinmeyenParti += 1;
        bilinmeyenAdet += p.kalanAdet;
      }
    }
  }
  console.log("\n(a) ELDE DURAN STOK — envanter DEĞERİNİ etkiler\n");
  console.log(`   açık parti                  ${acikParti}`);
  console.log(`   maliyeti BİLİNMEYEN parti   ${bilinmeyenParti}`);
  console.log(`   bunların adedi              ${bilinmeyenAdet}`);

  /* ═══ (b) ÇIKMIŞ, MALİYETİ DAMGALANMAMIŞ HAREKET ══════════════════ */
  const damgasiz = await prisma.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, unitCostAmount: null },
    select: { type: true, quantityDelta: true, occurredAt: true },
  });
  const cikanAdet = damgasiz.reduce((t, h) => t + Math.abs(h.quantityDelta), 0);
  console.log("\n(b) ÇIKMIŞ HAREKET — değerlemede BOŞLUK bırakır\n");
  console.log(`   maliyeti damgalanmamış çıkış   ${damgasiz.length} hareket`);
  console.log(`   toplam adet                    ${cikanAdet}`);
  for (const h of damgasiz) {
    console.log(
      `     ${h.occurredAt.toISOString().slice(0, 10)}  ${h.type.padEnd(18)} ${h.quantityDelta}`,
    );
  }

  console.log("\n" + "-".repeat(66));
  console.log("   HÜKÜM:");
  if (bilinmeyenAdet === 0) {
    console.log("   ✓ (a) SIFIR — envanter değerine 0 olarak karışan stok YOK.");
    console.log("     K116③'ün istediği ayrım `envanter.ts`te ZATEN var:");
    console.log("     bilinmeyenler ayrı kovaya gidiyor ve toplama girmiyor.");
  } else {
    console.log(`   ⛔ (a) ${bilinmeyenAdet} adet — ayrım gerekli.`);
  }
  console.log(`   ⚠ (b) ${cikanAdet} adet çıkmış ve maliyeti damgalanmamış —`);
  console.log("     bu envanter DEĞERİ sorunu değil, GİDER tarafı boşluğu.");

  await prisma.$disconnect();
}

void main();
