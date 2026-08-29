import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  `sinir` — `lt` mi `lte` mi? ÖLÇÜM (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npm run canli:sinir-olcum
 *
 *  ⛔ KOD DEĞİŞİKLİĞİNDEN ÖNCE. `acikPartilerToplu` süzgeci
 *  `occurredAt: { lt: sinir }` — **kesin ÖNCE**. Satış kaydına `soldAt`
 *  sınır olarak verilirse **aynı gün alınan mal dışarıda kalır** ve o satış
 *  kaydedilemez hâle gelir. Yanlış tarafa çevirmek, bugün çalışan akışı
 *  kilitler.
 *
 *  ÖLÇÜLECEKLER:
 *   ① `occurredAt` damgaları gün başına mı yazılıyor (UTC 00:00)?
 *   ② `soldAt` hangi tabanda — gün başı mı, saat taşıyor mu?
 *   ③ ⭐ AYNI GÜN alınıp AYNI GÜN satılan kaç vaka var? `lt` ile kaçı
 *     kilitlenirdi?
 *
 *  ⛔ HÜKÜM YOK, YAZMA YOK.
 * ============================================================================
 */

const yuzde = (a: number, b: number) => b === 0 ? "—" : (a / b * 100).toFixed(2) + "%";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  console.log("\n" + "=".repeat(100));
  console.log("`sinir` ÖLÇÜMÜ — lt mi lte mi (salt okuma)");
  console.log("=".repeat(100));

  // ── ① occurredAt gün başına mı ────────────────────────────────────────
  const hh = await p.stockMovement.findMany({
    select: { occurredAt: true, quantityDelta: true },
  });
  const gunBasi = hh.filter((x) =>
    x.occurredAt.getUTCHours() === 0 && x.occurredAt.getUTCMinutes() === 0 &&
    x.occurredAt.getUTCSeconds() === 0 && x.occurredAt.getUTCMilliseconds() === 0);
  console.log("\n① `StockMovement.occurredAt` TABANI");
  console.log("   hareket " + hh.length);
  console.log("   ⭐ UTC 00:00:00.000 olan : " + gunBasi.length +
    "   " + yuzde(gunBasi.length, hh.length));
  console.log("   ⛔ saat taşıyan          : " + (hh.length - gunBasi.length));
  const girisSaatli = hh.filter((x) => x.quantityDelta > 0 &&
    !(x.occurredAt.getUTCHours() === 0 && x.occurredAt.getUTCMinutes() === 0));
  console.log("   bunlardan GİRİŞ (parti) olanı: " + girisSaatli.length);

  // ── ② soldAt tabanı ───────────────────────────────────────────────────
  const satislar = await p.sale.findMany({ select: { soldAt: true } });
  const sGunBasi = satislar.filter((x) =>
    x.soldAt.getUTCHours() === 0 && x.soldAt.getUTCMinutes() === 0 &&
    x.soldAt.getUTCSeconds() === 0 && x.soldAt.getUTCMilliseconds() === 0);
  console.log("\n② `Sale.soldAt` TABANI");
  console.log("   satış " + satislar.length);
  console.log("   ⭐ UTC 00:00:00.000 olan : " + sGunBasi.length +
    "   " + yuzde(sGunBasi.length, satislar.length));
  console.log("   ⛔ saat taşıyan          : " + (satislar.length - sGunBasi.length));

  // ── ③ AYNI GÜN alınıp AYNI GÜN satılan ────────────────────────────────
  /**
   * ⭐ ASIL SORU. `lt` kullanılırsa, partisi satışla AYNI ANI taşıyan her
   * çıkış aday listesinin DIŞINDA kalırdı — yani o satış bugün
   * kaydedilemezdi.
   */
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, sourceMovementId: { not: null } },
    select: {
      occurredAt: true, quantityDelta: true,
      sourceMovement: { select: { occurredAt: true } },
      variant: { select: { sku: true } },
      saleItem: { select: { sale: { select: { code: true } } } },
    },
  });
  const ayniAn = cikislar.filter((x) =>
    x.sourceMovement !== null &&
    +x.sourceMovement.occurredAt === +x.occurredAt);
  const ayniGun = cikislar.filter((x) =>
    x.sourceMovement !== null &&
    x.sourceMovement.occurredAt.toISOString().slice(0, 10) ===
      x.occurredAt.toISOString().slice(0, 10));
  const oncekiGun = cikislar.filter((x) =>
    x.sourceMovement !== null && x.sourceMovement.occurredAt < x.occurredAt);
  const sonraki = cikislar.filter((x) =>
    x.sourceMovement !== null && x.sourceMovement.occurredAt > x.occurredAt);

  console.log("\n③ ⭐ PARTİ İLE ÇIKIŞ ARASINDAKİ ZAMAN İLİŞKİSİ");
  console.log("   partiye bağlı çıkış      : " + cikislar.length);
  console.log("   parti ÖNCE (sağlıklı)    : " + oncekiGun.length +
    "   " + yuzde(oncekiGun.length, cikislar.length));
  console.log("   ⭐ parti AYNI AN          : " + ayniAn.length +
    "   " + yuzde(ayniAn.length, cikislar.length) + "   ← `lt` BUNLARI KİLİTLERDİ");
  console.log("   parti AYNI GÜN           : " + ayniGun.length +
    "   " + yuzde(ayniGun.length, cikislar.length));
  console.log("   parti SONRA (bozuk)      : " + sonraki.length);

  console.log("\n④ HÜKÜM");
  if (ayniAn.length > 0) {
    console.log("   ⛔ `lt` KULLANILAMAZ. Aynı anı taşıyan " + ayniAn.length +
      " çıkış var;");
    console.log("     `lt` ile bu partiler aday listesinin DIŞINDA kalır ve o");
    console.log("     satışlar kaydedilemez. Örnekler:");
    for (const x of ayniAn.slice(0, 5)) {
      console.log("       " + (x.variant.sku ?? "—").padEnd(15) +
        (x.saleItem?.sale.code ?? "—").padEnd(15) +
        x.occurredAt.toISOString().slice(0, 10));
    }
  } else {
    console.log("   Aynı anı taşıyan çıkış YOK — ama bu, YARIN olmayacağı");
    console.log("   anlamına gelmez: aynı gün alıp satmak olağan bir iştir.");
  }
  console.log("\n   ⭐ ÖNERİLEN SINIR: günün SONU (satış gününün ertesi 00:00).");
  console.log("     Böylece aynı gün alınan mal İÇERİDE kalır, ertesi gün");
  console.log("     alınan mal DIŞARIDA. `lt` operatörü değişmez — sınır");
  console.log("     DEĞERİ değişir; süzgecin kendisine dokunulmaz.");
  console.log("   ⚠ VE GÜN SINIRI İSTANBUL GÜNÜNE GÖRE ÇİZİLİR (anayasa):");
  console.log("     `soldAt` zaten İstanbul gününün UTC gece yarısı damgası.");

  console.log("\n" + "=".repeat(100));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI. KOD DEĞİŞMEDİ.");
  console.log("=".repeat(100) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
