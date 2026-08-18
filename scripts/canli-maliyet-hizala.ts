/**
 * ============================================================================
 *  MALİYET HİZALAMA — PARTİ ↔ TÜKETİM DAMGASI
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *      npm run canli:maliyet-hizala             → YALNIZ RAPOR
 *      npm run canli:maliyet-hizala -- --uygula → damgaları hizalar + kârı tazeler
 *
 *  ⚠ NİYE VAR — ÖLÇÜLDÜ 19.08.2026, ZİNCİR KOPUK.
 *
 *  Alım düzenleme ekranı maliyeti değiştirdiğinde şunu yapıyor
 *  (`app/alimlar/actions.ts`):
 *      PurchaseItem.unitCostAmount     ← yeni değer
 *      StockMovement WHERE purchaseItemId = ...   ← yeni değer
 *
 *  İkinci satır YALNIZ GİRİŞ hareketine ulaşır. Ölçüm: canlıda 49 negatif
 *  hareketin **0 tanesinde** `purchaseItemId` dolu — çıkışlar partiye
 *  `sourceMovementId` ile bağlı. Yani satılmış bir malın maliyetini alım
 *  ekranından düzeltmek, o satışın SALE_OUT damgasını DEĞİŞTİRMEZ.
 *
 *  Ve kâr motoru maliyeti tam oradan okur (`kar-yeniden.ts` → kalemin
 *  `stockMovements`ı). Sonuç: alım düzeltilir, ekranda maliyet doğru
 *  görünür, **NET-2 eski yanlış maliyetle kalır.** "Yeniden hesapla"
 *  düğmesi de kurtarmaz — o da aynı bayat damgayı okur.
 *
 *  ── SORUNUN CEVABI: HİÇBİR MEKANİZMA GARANTİ ETMİYOR ────────────────────
 *  Mimar sordu: "maliyet değişince FIFO partisi → kalem maliyeti → NET-2
 *  zincirinin yeniden hesaplandığını hangi mekanizma garanti ediyor?"
 *  Ölçümün cevabı: **hiçbiri.** Bu betik o boşluğu kapatıyor.
 *
 *  ── TEK KAYDA ÖZEL DEĞİL ────────────────────────────────────────────────
 *  OneBlade için yazılmadı; AYRIŞMAYI GENEL OLARAK arar. Bir vaka için
 *  elle SQL yazsaydık, aynı boşluk bir dahaki maliyet düzeltmesinde
 *  sessizce tekrarlardı. Rapor kipi aynı zamanda bir BEKÇİDİR: ayrışma
 *  varsa sayısını söyler.
 *
 *  ── STOK DEFTERİNİN ADEDİNE DOKUNMAZ ────────────────────────────────────
 *  Tek bir hareket yazılmaz, silinmez, adedi değiştirilmez. Yalnız
 *  `unitCostAmount` damgası partisininkiyle hizalanır — ledger'ın
 *  MİKTAR dokunulmazlığı korunur.
 * ============================================================================
 */

import { kdvDahilKargo } from "../src/lib/kargo-kdv";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const UYGULA = process.argv.includes("--uygula");

function para(d: unknown): string {
  if (d === null || d === undefined) return "—";
  return Number(d.toString()).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { karYenidenYaz } = await import("../src/lib/kar-yeniden");

  console.log("");
  console.log("MALİYET HİZALAMA — parti ↔ tüketim damgası");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        " + (UYGULA ? "UYGULA — damga yazılacak" : "RAPOR — hiçbir şey yazılmaz"));
  console.log("");

  /** Partiye bağlı BÜTÜN tüketimler — tip listesi değil, BAĞ. */
  const tuketimler = await prisma.stockMovement.findMany({
    where: { sourceMovementId: { not: null } },
    select: {
      id: true,
      type: true,
      quantityDelta: true,
      unitCostAmount: true,
      unitCostCurrency: true,
      saleItemId: true,
      variant: { select: { sku: true, product: { select: { name: true } } } },
      sourceMovement: {
        select: { id: true, unitCostAmount: true, unitCostCurrency: true },
      },
      saleItem: { select: { saleId: true, sale: { select: { code: true } } } },
    },
  });

  const ayrisik = tuketimler.filter((h) => {
    const p = h.sourceMovement;
    if (!p) return false;
    const parti = p.unitCostAmount === null ? null : p.unitCostAmount.toString();
    const bizim = h.unitCostAmount === null ? null : h.unitCostAmount.toString();
    if (parti === null && bizim === null) return false;
    if (parti === null || bizim === null) return true;
    /** Decimal METİN karşılaştırması — float'a çevirip 0,004 farkı üretmeyelim. */
    return Number(parti) !== Number(bizim);
  });

  console.log("Taranan tüketim hareketi: " + tuketimler.length);
  console.log("Ayrışan damga          : " + ayrisik.length);
  console.log("");

  /**
   * ⚠ PARTİSİ OLMAYAN MALİYET DAMGALARI SESSİZCE ATLANMAZ.
   * `SALE_CANCEL_IN` gibi hareketler bir partiye bağlı olmayabilir;
   * onların damgası hizalanamaz çünkü kıyaslanacak referans yok.
   * Sayısı yazılıyor ki "hepsi hizalandı" izlenimi doğmasın.
   */
  const referanssiz = await prisma.stockMovement.count({
    where: { sourceMovementId: null, unitCostAmount: { not: null }, quantityDelta: { lt: 0 } },
  });
  if (referanssiz > 0) {
    console.log("  not: " + referanssiz + " negatif hareketin partisi yok — damgası");
    console.log("       hizalanamaz (kıyaslanacak referans yok). Kâra girmezler,");
    console.log("       çünkü kâr yalnız KALEME BAĞLI hareketleri toplar.");
    console.log("");
  }

  if (ayrisik.length === 0) {
    console.log("  ✓ Ayrışma yok — parti ve tüketim damgaları aynı.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  console.log(
    "  " + doldur("ürün", 34) + doldur("hareket", 15) + doldur("satış", 14) +
    doldur("damga", 12) + "parti",
  );
  const etkilenenSatis = new Set<string>();
  for (const h of ayrisik) {
    console.log(
      "  " + doldur(h.variant.product.name, 34) + doldur(h.type, 15) +
      doldur(h.saleItem?.sale.code ?? "—", 14) +
      doldur(para(h.unitCostAmount), 12) + para(h.sourceMovement?.unitCostAmount),
    );
    if (h.saleItem?.saleId) etkilenenSatis.add(h.saleItem.saleId);
  }
  console.log("");
  console.log("  Kârı tazelenecek satış: " + etkilenenSatis.size);
  console.log("");

  if (!UYGULA) {
    console.log("  RAPOR KİPİ — hiçbir şey yazılmadı.");
    console.log("  Rakamlar beklenene uyuyorsa:");
    console.log("      npm run canli:maliyet-hizala -- --uygula");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  // ── 1) DAMGALARI HİZALA ────────────────────────────────────────────
  let yazilan = 0;
  for (const h of ayrisik) {
    await prisma.stockMovement.update({
      where: { id: h.id },
      data: {
        unitCostAmount: h.sourceMovement!.unitCostAmount,
        unitCostCurrency: h.sourceMovement!.unitCostCurrency,
      },
    });
    yazilan++;
  }
  console.log("  ✓ " + yazilan + " damga hizalandı.");
  console.log("");

  // ── 2) ETKİLENEN SATIŞLARIN KÂRINI TAZELE ──────────────────────────
  for (const saleId of etkilenenSatis) {
    const satis = await prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        code: true,
        net1Amount: true,
        net2Amount: true,
        cargoCarrierId: true,
        cargoDesi: true,
        cargoAmount: true,
        items: { select: { id: true, commissionRate: true } },
      },
    });
    if (satis === null) continue;

    console.log("  satış " + satis.code);
    console.log("     NET-1 / NET-2 önce   " + para(satis.net1Amount) + " / " + para(satis.net2Amount));

    /**
     * ÇAĞRI DÜZENLEME YOLUYLA AYNI — oran kalemden, komisyon TUTARI null,
     * kargo saklı tutardan. Betik kendi çağrısını uydursaydı aynı satış
     * ekrandan farklı hesaplanırdı (`canli-kar-tazele` ile aynı desen).
     */
    const oldu = await karYenidenYaz({
      saleId,
      kalemler: satis.items.map((i) => ({
        saleItemId: i.id,
        commissionRate:
          i.commissionRate === null ? null : Number(i.commissionRate.toString()),
        commissionAmount: null,
      })),
      cargoCarrierId: satis.cargoCarrierId,
      cargoDesi: satis.cargoDesi === null ? null : Number(satis.cargoDesi.toString()),
      cargoAmountManual: kdvDahilKargo(
        satis.cargoAmount === null ? null : Number(satis.cargoAmount.toString()),
      ),
    });

    const sonra = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { net1Amount: true, net2Amount: true },
    });
    console.log(
      "     NET-1 / NET-2 sonra  " + para(sonra?.net1Amount) + " / " + para(sonra?.net2Amount) +
      "  " + (oldu ? "✓" : "(yazılamadı)"),
    );
    console.log("");
  }

  /**
   * ⚠ İZ BIRAKILIR. Damga düzeltmesi geriye dönük bir müdahaledir; kim
   * ne zaman kaç satır hizaladı, kayıtsız kalmaz. Yeni tablo AÇILMADI —
   * `AuditLog` bu işi zaten yapıyor (18.08.2026 dersi).
   */
  await prisma.auditLog.create({
    data: {
      action: "MALIYET_HIZALAMA",
      targetType: "StockMovement",
      detail: JSON.stringify({
        hizalananDamga: yazilan,
        tazelenenSatis: etkilenenSatis.size,
        kaynak: "canli:maliyet-hizala",
      }),
    },
  });
  console.log("  ✓ AuditLog: MALIYET_HIZALAMA yazıldı.");
  console.log("");

  await prisma.$disconnect();
}

main();
