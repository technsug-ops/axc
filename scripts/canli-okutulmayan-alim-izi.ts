import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  OKUTULMAYAN VARYANTLARIN ALIM DEFTERİ — SALT OKUMA
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-okutulmayan-alim-izi.ts
 *
 *  ⛔ HİÇBİR ŞEY YAZMAZ.
 *
 *  ⚠ NİYE: satış izi taraması Roborock'ta beklenmedik bir şey buldu —
 *  satış SİSTEMDE VARDI (sipariş 4114618000, 24.08, SALE_OUT −1). Rafta
 *  olmamasına rağmen sistemin 1 göstermesinin sebebi eksik satış değil,
 *  AYNI GÜNE damgalı İKİ AYRI `PURCHASE_IN` satırıydı:
 *
 *      2026-08-13  PURCHASE_IN  +1   (girildi 13.08 12:42)
 *      2026-08-13  PURCHASE_IN  +1   (girildi 22.08 11:54)
 *      2026-08-24  SALE_OUT     −1
 *
 *  Yani hipotez artık şu: eksiklerin bir kısmı KAYIP MAL değil, İKİ KEZ
 *  GİRİLMİŞ ALIM. İkisi ekranda aynı görünür (sistem fazla gösterir) ama
 *  yapılacak iş taban tabana zıttır.
 *
 *  ⛔ HÜKÜM YOK — burada yalnız DEFTER dökülüyor. "Aynı gün + aynı adet +
 *  aynı maliyet" bir ŞÜPHEDİR, kanıt değil: aynı üründen iki ayrı alım
 *  aynı gün gerçekten yapılmış olabilir. Kanıt, alım BELGESİDİR ve onu
 *  Halil'den başkası göremez.
 * ============================================================================
 */

const SAYIM = process.argv.find((a) => a.startsWith("--sayim="))?.slice(8) ?? "sayim-20260827-2";

async function main() {
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("\n⛔ CANLI ADRES OKUNAMADI\n");
    process.exitCode = 1;
    return;
  }
  const p = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const sayim = await p.stokSayimi.findFirst({
    where: { kod: SAYIM },
    select: { id: true, sayimGunu: true },
  });
  if (!sayim) {
    console.log("\n⛔ SAYIM YOK: " + SAYIM + "\n");
    process.exitCode = 1;
    return;
  }

  const satirlar = await p.stokSayimSatiri.findMany({
    where: { sayimId: sayim.id, kapsamdaydi: true, sayilanAdet: null },
    select: { variantId: true, variant: { select: { sku: true, product: { select: { name: true } } } } },
  });

  console.log("\n" + "=".repeat(110));
  console.log("OKUTULMAYAN " + satirlar.length + " VARYANTIN ALIM DEFTERİ — SALT OKUMA");
  console.log("=".repeat(110));

  let supheli = 0;
  let supheliAdet = 0;
  let supheliTutar = 0;
  const temiz: string[] = [];

  for (const st of satirlar) {
    const hrk = await p.stockMovement.findMany({
      where: { variantId: st.variantId },
      select: {
        type: true, quantityDelta: true, occurredAt: true, createdAt: true,
        unitCostAmount: true,
        purchaseItem: { select: { purchase: { select: { code: true, supplierName: true, supplierOrderNo: true } } } },
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });

    const girisler = hrk.filter((h) => h.type === "PURCHASE_IN");

    /**
     * ⛔ ŞÜPHE ÖLÇÜTÜ — aynı gün + aynı adet + aynı birim maliyet, AMA
     * FARKLI girilme anı. Girilme anının farklı olması şart: tek seferde
     * iki satır girilmiş bir alım (2 kalem) meşrudur ve elenir.
     *
     * ⚠ Ölçüt KİMLİĞE de bakar: iki hareket AYNI alım belgesine bağlıysa
     * (aynı `purchase.code`) bu bir kopya değil, o belgenin iki kalemidir.
     */
    const kova = new Map<string, typeof girisler>();
    for (const g of girisler) {
      const anahtar = g.occurredAt.toISOString().slice(0, 10) + "|" + g.quantityDelta + "|" +
        (g.unitCostAmount?.toString() ?? "—");
      kova.set(anahtar, [...(kova.get(anahtar) ?? []), g]);
    }
    const kopyalar = [...kova.entries()].filter(([, g]) =>
      g.length > 1 &&
      new Set(g.map((x) => x.createdAt.toISOString().slice(0, 16))).size > 1 &&
      new Set(g.map((x) => x.purchaseItem?.purchase.code ?? "?")).size > 1);

    if (kopyalar.length === 0) {
      temiz.push(st.variant.sku);
      continue;
    }

    supheli++;
    const fazlaAdet = kopyalar.reduce((t, [, g]) => t + (g.length - 1) * g[0].quantityDelta, 0);
    const fazlaTutar = kopyalar.reduce((t, [, g]) =>
      t + (g.length - 1) * g[0].quantityDelta * Number(g[0].unitCostAmount?.toString() ?? 0), 0);
    supheliAdet += fazlaAdet;
    supheliTutar += fazlaTutar;

    console.log("\n   ● " + st.variant.sku.padEnd(19) + st.variant.product.name.slice(0, 56));
    for (const h of hrk) {
      const belge = h.purchaseItem?.purchase;
      console.log("     " + h.occurredAt.toISOString().slice(0, 10) + "  " +
        h.type.padEnd(17) + String(h.quantityDelta).padStart(4) + "  " +
        (h.unitCostAmount?.toString() ?? "—").padStart(10) +
        "   girildi " + h.createdAt.toISOString().slice(0, 16).replace("T", " ") +
        (belge ? "   belge " + belge.code + " · " + (belge.supplierName ?? belge.supplierOrderNo ?? "—").slice(0, 18) : ""));
    }
    console.log("     ⚠ ŞÜPHELİ KOPYA: " + kopyalar.length + " küme · fazla görünen " +
      fazlaAdet + " ad · " + fazlaTutar.toFixed(2) + " TL");
  }

  console.log("\n\n   ═══ ÖZET ═══");
  console.log("   ŞÜPHELİ KOPYA ALIMI OLAN : " + supheli + " / " + satirlar.length +
    "   ·   " + supheliAdet + " ad   ·   " + supheliTutar.toFixed(2) + " TL");
  console.log("   KOPYA İZİ OLMAYAN        : " + temiz.length + " / " + satirlar.length);
  console.log("     " + temiz.join(" "));
  console.log("\n   ⛔ 'ŞÜPHELİ' HÜKÜM DEĞİLDİR: aynı üründen aynı gün iki AYRI alım gerçekten");
  console.log("     yapılmış olabilir. Ayırt eden şey alım BELGESİDİR — sistem onu bilemez.");

  console.log("\n" + "=".repeat(110));
  console.log("SALT OKUMA — HİÇBİR ŞEY YAZILMADI.");
  console.log("=".repeat(110) + "\n");
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
