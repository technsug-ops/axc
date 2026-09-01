/**
 * ============================================================================
 *  UYDURMA MALİYET ENVANTERİ — SALT OKUMA (K127 kuyruğu, 01.09.2026)
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npx tsx scripts/canli-uydurma-maliyet.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — sistemin uydurduğu maliyetleri sayar,
 *  rutin koşmaz. HİÇBİR ŞEY YAZMAZ; yazma bayrağı da yoktur.
 *
 *  ⛔ NİYE: 29.08'de eksik alımlar onarılırken bazı partilere maliyet
 *  UYDURULDU. O partileri tüketen her satışın NET'i yanlış — ve yanlış
 *  olduğu ekranda GÖRÜNMÜYOR. Kullanıcı gerçek alım fiyatlarını girecek;
 *  bu betik ona "hangi ürün, hangi tarih, kaç adet, şu an ne yazıyor"
 *  listesini verir.
 *
 *  ── ⚠ İKİ AYRI KÜME, AYRI SAYILIR ──────────────────────────────────────
 *  (A) `eksik-alim-20260829` partisi — maliyet UYDURULDU, satışlar var.
 *  (B) notu "MALIYET BILINMIYOR" diyen ama maliyet TAŞIYAN partiler —
 *      not ile veri ÇELİŞİYOR; hangisinin doğru olduğu ölçülmeli.
 *
 *  Anayasa: "boş sonuç ile temiz sonucu ayırt edemeyen denetim, denetim
 *  değildir" — incelenen · bulunan · satılmış · satılmamış AYRI basılır.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

const A_DESEN = "eksik-alim-20260829";
const B_DESEN = "MALIYET BILINMIYOR";

function para(d: unknown): string {
  if (d === null || d === undefined) return "—";
  return Number(String(d)).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function gun(d: Date | null): string {
  return d === null ? "—" : d.toISOString().slice(0, 10);
}
function doldur(m: string, n: number): string {
  return m.length >= n ? m.slice(0, n) : m + " ".repeat(n - m.length);
}

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(y.veri.ham) });

  console.log("=".repeat(78));
  console.log("  UYDURMA MALİYET ENVANTERİ — salt okuma");
  console.log("=".repeat(78));

  /** Parti = pozitif girişli StockMovement (kendi kendinin kaynağı). */
  const partiler = await prisma.stockMovement.findMany({
    where: {
      quantityDelta: { gt: 0 },
      OR: [{ note: { contains: A_DESEN } }, { note: { contains: B_DESEN } }],
    },
    select: {
      id: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      note: true,
      variant: {
        select: {
          companySku: true,
          barcode: true,
          product: { select: { name: true } },
        },
      },
    },
    orderBy: { occurredAt: "asc" },
  });

  console.log(`\n  incelenen parti: ${partiler.length}`);
  if (partiler.length === 0) {
    console.log("  ⚠ HİÇ PARTİ BULUNAMADI — desen değişmiş olabilir; 'temiz' DEMEK DEĞİL.");
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ "TÜKETİLEN" İLE "SATILAN" AYNI ŞEY DEĞİL — İLK YAZIMDA KARIŞTIRDIM.
   *
   * İlk sürüm çıkışları toplayıp sütuna "satılan" yazıyordu. Ölçüm çürüttü:
   * `axcali2601`in 14 adedi satış DEĞİL, tek bir `COUNT_CORRECTION` (sayım
   * düzeltmesi) ile çıkmış — hiçbir satışa bağlı değil ve kimseye yanlış
   * NET vermiyor. Yanlış etiket, olmayan bir para riskini rapor edecekti.
   * _(Anayasa: "bir sayı etiketiyle taşınır" — fiil de etikettir.)_
   *
   * Ölçüt `saleItemId`: dolu ise SATIŞ, boş ise başka bir çıkış.
   */
  const kimlikler = partiler.map((p) => p.id);
  const cikislar = await prisma.stockMovement.findMany({
    where: { sourceMovementId: { in: kimlikler }, quantityDelta: { lt: 0 } },
    select: {
      sourceMovementId: true,
      quantityDelta: true,
      saleItemId: true,
      type: true,
      saleItem: {
        select: { sale: { select: { profitStatus: true, iptalTarihi: true } } },
      },
    },
  });
  const satilan = new Map<string, number>();
  const baskaCikis = new Map<string, string>();
  for (const c of cikislar) {
    const kaynak = c.sourceMovementId;
    if (kaynak === null) continue;
    const adet = Math.abs(c.quantityDelta);
    if (c.saleItemId !== null) {
      /** ⚠ İPTAL EDİLMİŞ SATIŞ KAYIP SAYILMAZ — kârı zaten hesaplanmıyor.
       *  _(Anayasa: "kayıp abartısı, kayıp küçültmesi kadar yanlıştır".)_ */
      if (c.saleItem?.sale?.iptalTarihi !== null) continue;
      satilan.set(kaynak, (satilan.get(kaynak) ?? 0) + adet);
    } else {
      const onceki = baskaCikis.get(kaynak);
      baskaCikis.set(kaynak, onceki ? `${onceki},${c.type}` : String(c.type));
    }
  }

  const A = partiler.filter((p) => p.note?.includes(A_DESEN));
  const B = partiler.filter((p) => !p.note?.includes(A_DESEN));

  for (const [ad, kume] of [
    ["A · eksik-alim-20260829 — MALİYET UYDURULDU", A],
    ["B · notu 'MALIYET BILINMIYOR' ama maliyet TAŞIYOR", B],
  ] as const) {
    console.log(`\n  ── ${ad} — ${kume.length} parti ─────────────`);
    if (kume.length === 0) {
      console.log("     (bu kümede parti yok — sıfır, ve sıfır olduğu YAZILIYOR)");
      continue;
    }
    console.log(
      `     ${doldur("alım tarihi", 12)} ${doldur("Firma SKU", 18)} ${doldur("barkod", 15)} ` +
        `${doldur("adet", 5)} ${doldur("SATIŞA", 7)} ${doldur("başka çıkış", 13)} ${doldur("yazan birim maliyet", 20)} ürün`,
    );
    let toplamAdet = 0;
    let satilanAdet = 0;
    for (const p of kume) {
      const s = satilan.get(p.id) ?? 0;
      const b = baskaCikis.get(p.id) ?? "—";
      toplamAdet += p.quantityDelta;
      satilanAdet += s;
      console.log(
        `     ${doldur(gun(p.occurredAt), 12)} ${doldur(p.variant.companySku ?? "—", 18)} ` +
          `${doldur(p.variant.barcode ?? "—", 15)} ${doldur(String(p.quantityDelta), 5)} ` +
          `${doldur(String(s), 7)} ${doldur(b, 13)} ${doldur(para(p.unitCostAmount) + " " + (p.unitCostCurrency ?? ""), 20)} ` +
          `${(p.variant.product.name ?? "").slice(0, 34)}`,
      );
    }
    /** İlke #15: tek tek gösterilen yerde TOPLAM da olur. */
    console.log(
      `     ${doldur("TOPLAM", 12)} ${doldur("", 18)} ${doldur("", 15)} ` +
        `${doldur(String(toplamAdet), 5)} ${doldur(String(satilanAdet), 7)}`,
    );
  }

  console.log(
    `\n  ⚠ SATIŞA giden adet > 0 olan her satır YANLIŞ bir NET taşır. 'başka çıkış'
     (COUNT_CORRECTION vb.) hiçbir satışa BAĞLI DEĞİL — kâra girmez.` +
      `\n     Gerçek alım fiyatı girilince parti maliyeti düzeltilir, çıkış damgaları` +
      `\n     tazelenir ve o satışların kârı yeniden hesaplanır (K127 yolu).`,
  );
  await prisma.$disconnect();
}

main();
