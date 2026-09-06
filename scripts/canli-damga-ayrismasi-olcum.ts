import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  K176 — AYRIŞAN DAMGALARIN BÜYÜKLÜĞÜ VE YÖNÜ
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: SUREKLI — SALT OKUMA, hiçbir şey yazmaz.
 *      npm run canli:damga-olcum
 *
 *  `canli:maliyet-hizala` ayrışmayı SAYIYOR (783 damga / 771 satış) ama
 *  "bu kaç lira ve hangi yöne" sorusunu cevaplamıyor. Yazım kararı ancak
 *  bu iki rakam bilinince verilebilir.
 *
 *  ⛔ ÖLÇÜM YAZIMIN YERİNE GEÇMEZ: burada çıkan tutar "kâr şu kadar yanlış"
 *  demek DEĞİL, "damgalar hizalanırsa maliyet toplamı şu kadar oynar"
 *  demektir. NET etkisi ayrıca motordan ölçülür (maliyet KDV dahildir).
 * ============================================================================
 */

function para(x: number): string {
  return x.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("CANLI ADRES OKUNAMADI");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  /** Çıkışlar partiye `sourceMovementId` ile bağlı (ölçüldü 19.08: 49/49). */
  const cikislar = await p.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, sourceMovementId: { not: null } },
    select: {
      id: true, quantityDelta: true, unitCostAmount: true, occurredAt: true,
      sourceMovementId: true,
      saleItem: { select: { sale: { select: { code: true, soldAt: true, profitStatus: true } } } },
    },
  });
  const partiIdler = [...new Set(cikislar.map((x) => x.sourceMovementId!))];
  const partiler = await p.stockMovement.findMany({
    where: { id: { in: partiIdler } },
    select: { id: true, unitCostAmount: true },
  });
  const parti = new Map(partiler.map((x) => [x.id, x.unitCostAmount]));

  let incelenen = 0, temiz = 0, bakilamayan = 0;
  let damgaYUKSEK = 0, damgaDUSUK = 0;
  let maliyetArtar = 0, maliyetAzalir = 0;
  const ay = new Map<string, { adet: number; tutar: number }>();
  const satislar = new Set<string>();

  for (const c2 of cikislar) {
    const pm = parti.get(c2.sourceMovementId!);
    if (pm === null || pm === undefined || c2.unitCostAmount === null) { bakilamayan++; continue; }
    incelenen++;
    const damga = Number(c2.unitCostAmount.toString());
    const partiBirim = Number(pm.toString());
    const fark = Math.round((partiBirim - damga) * 100) / 100;
    if (Math.abs(fark) < 0.005) { temiz++; continue; }
    const adet = Math.abs(c2.quantityDelta);
    const etki = Math.round(fark * adet * 100) / 100;
    if (fark > 0) { damgaDUSUK++; maliyetArtar += etki; }
    else { damgaYUKSEK++; maliyetAzalir += etki; }
    const s = c2.saleItem?.sale;
    if (s?.code) satislar.add(s.code);
    const a = (s?.soldAt ?? c2.occurredAt).toISOString().slice(0, 7);
    const v = ay.get(a) ?? { adet: 0, tutar: 0 };
    v.adet += 1; v.tutar += etki;
    ay.set(a, v);
  }

  console.log("\n" + "=".repeat(84));
  console.log("  K176 — AYRIŞAN DAMGA: BÜYÜKLÜK VE YÖN   (salt okuma)");
  console.log("=".repeat(84));
  console.log(`  incelenen çıkış ${incelenen} · temiz ${temiz} · AYRIŞAN ${damgaDUSUK + damgaYUKSEK}` +
    ` · incelenemeyen ${bakilamayan} (parti ya da damga boş)`);
  console.log(`  etkilenen satış: ${satislar.size}`);
  console.log("\n  YÖN:");
  console.log(`    damga partiden DÜŞÜK  ${String(damgaDUSUK).padStart(4)}` +
    `  → hizalanırsa maliyet ARTAR  ${para(maliyetArtar).padStart(13)}   (kâr DÜŞER)`);
  console.log(`    damga partiden YÜKSEK ${String(damgaYUKSEK).padStart(4)}` +
    `  → hizalanırsa maliyet AZALIR ${para(maliyetAzalir).padStart(13)}   (kâr ARTAR)`);
  console.log(`\n  ⭐ NET MALİYET ETKİSİ: ${para(maliyetArtar + maliyetAzalir)}` +
    `   (artı = maliyet artar, kâr düşer)`);

  console.log("\n  AYA GÖRE (satış ayı):");
  for (const [a, v] of [...ay].sort()) {
    console.log(`    ${a}   çıkış ${String(v.adet).padStart(4)}   etki ${para(v.tutar).padStart(13)}`);
  }
  console.log("");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
