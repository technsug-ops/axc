import { writeFileSync } from "node:fs";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  11518018178 — MALİYETSİZ PARTİYE MALİYET YAZ (Halil beyanı 07.09.2026)
 * ----------------------------------------------------------------------------
 *  BETIK SINIFI: TEK_SEFERLIK — tek satışa ve tek partiye kilitli; genel araç
 *  hâline getirilmez.
 *      npm run canli:11518-maliyet            → kuru koşum
 *      npm run canli:11518-maliyet -- --uygula
 *
 *  ⛔ NİYE: `canli:maliyet-hizala` (07.09) bu satışın çıkış damgasını bağlı
 *  partiye hizaladı; parti `unitCostAmount = NULL` olduğu için damga da NULL
 *  oldu ve satış `CALCULATED → NO_COST` düştü. Parti bir alım kalemine bağlı
 *  değil (muhtemelen 29.08 sayım düzeltmesinden doğdu), o yüzden maliyet
 *  hiçbir yerden türetilemiyordu.
 *
 *  ⭐ DEĞER UYDURULMADI — HALİL BEYANI: _"₺3.599, alış bu ve Excel'de vardı."_
 *  Aynı ürünün defterdeki alımları da bunu destekliyor: `ALM-NON-260813-01`
 *  ve `-02` (13.08.2026) ×2 @ **3.599,00** — satıştan (18.08) beş gün önce.
 *
 *  ⚠ PARTİ VE DAMGA BİRLİKTE YAZILIR. Yalnız çıkış damgası yazılsaydı bir
 *  sonraki `maliyet-hizala` koşumu onu partiye (NULL) hizalayıp SİLERDİ —
 *  yani bugünkü arıza aynı yoldan geri gelirdi.
 *  _(Anayasa: "düzeltme yolu TÜM okuyuculara ulaştığı ölçülmeden 'var'
 *  sayılmaz".)_
 * ============================================================================
 */

const UYGULA = process.argv.includes("--uygula");
const SATIS = "11518018178";
const YENI = 3599;

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("CANLI ADRES OKUNAMADI");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const satis = await p.sale.findFirst({
    where: { code: SATIS },
    select: {
      id: true, code: true, profitStatus: true, net1Amount: true, net2Amount: true,
      items: { select: { id: true, quantity: true, variant: { select: { sku: true } } } },
    },
  });
  if (satis === null) {
    console.log("SATIŞ YOK: " + SATIS);
    process.exitCode = 1;
    await p.$disconnect();
    return;
  }

  const cikislar = await p.stockMovement.findMany({
    where: { saleItemId: { in: satis.items.map((i) => i.id) } },
    select: { id: true, type: true, quantityDelta: true, unitCostAmount: true, sourceMovementId: true },
  });
  const partiIdler = [...new Set(cikislar.map((x) => x.sourceMovementId).filter((x): x is string => x !== null))];
  const partiler = await p.stockMovement.findMany({
    where: { id: { in: partiIdler } },
    select: { id: true, type: true, unitCostAmount: true, unitCostCurrency: true, occurredAt: true, purchaseItemId: true },
  });

  console.log("\n" + "=".repeat(80));
  console.log("  " + SATIS + " — MALİYET YAZIMI" + (UYGULA ? "  [YAZIM]" : "  [KURU KOŞUM]"));
  console.log("=".repeat(80));
  console.log("  durum " + satis.profitStatus + " · NET-1 " + (satis.net1Amount?.toString() ?? "—") +
    " · NET-2 " + (satis.net2Amount?.toString() ?? "—"));
  for (const x of cikislar) {
    console.log("  çıkış " + x.type + " adet " + x.quantityDelta +
      " · damga " + (x.unitCostAmount?.toString() ?? "NULL") + "  →  " + YENI);
  }
  for (const x of partiler) {
    console.log("  PARTİ " + x.type + " " + x.occurredAt.toISOString().slice(0, 10) +
      " · damga " + (x.unitCostAmount?.toString() ?? "NULL") + "  →  " + YENI +
      " · alım bağı " + (x.purchaseItemId ?? "YOK"));
  }

  if (!UYGULA) {
    console.log("\n  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:11518-maliyet -- --uygula\n");
    await p.$disconnect();
    return;
  }

  /** (a) Yerel anlık görüntü — geri alma için eski değerler. */
  const goruntu = {
    an: new Date().toISOString(), satis: SATIS, yeniBirim: YENI,
    eskiDurum: satis.profitStatus,
    eskiNet1: satis.net1Amount?.toString() ?? null,
    eskiNet2: satis.net2Amount?.toString() ?? null,
    cikislar: cikislar.map((x) => ({ id: x.id, eski: x.unitCostAmount?.toString() ?? null })),
    partiler: partiler.map((x) => ({ id: x.id, eski: x.unitCostAmount?.toString() ?? null })),
  };
  const yol = `veri/ozel/maliyet-11518018178-${Date.now()}.json`;
  writeFileSync(yol, JSON.stringify(goruntu, null, 2), "utf8");
  console.log("\n  ⭐ ANLIK GÖRÜNTÜ: " + yol);

  const kullanici = await p.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("  ⛔ Kullanıcı yok — iz yazılamaz. DURDU.");
    process.exitCode = 1;
    await p.$disconnect();
    return;
  }

  await p.$transaction(async (tx) => {
    for (const x of partiler) {
      await tx.stockMovement.update({
        where: { id: x.id },
        data: { unitCostAmount: YENI.toFixed(4), unitCostCurrency: "TRY" },
      });
    }
    for (const x of cikislar) {
      await tx.stockMovement.update({
        where: { id: x.id },
        data: { unitCostAmount: YENI.toFixed(4), unitCostCurrency: "TRY" },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: kullanici.id,
        action: "MALIYETSIZ_PARTIYE_MALIYET_YAZILDI",
        targetType: "Sale",
        targetId: satis.id,
        detail: JSON.stringify({
          ...goruntu,
          kaynak: "Halil beyanı 07.09.2026 — 'alış bu ve Excel'de vardı'",
          destek: "ALM-NON-260813-01/-02 · 13.08.2026 · ×2 @ 3599,00",
        }),
      },
    });
  }, { timeout: 60_000 });

  console.log("  ✓ parti " + partiler.length + " · çıkış " + cikislar.length + " damga yazıldı.");

  /** Kâr motoru maliyeti çıkış damgasından okur — tazeleme AYRI adım. */
  console.log("\n  ⏭ ŞİMDİ: npm run canli:net-tazele -- " + SATIS + " --uygula\n");
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
