/**
 * ============================================================================
 *  11265267349 ONARIMI — İADE NEGATİF SATIŞ SATIRI OLARAK GİRİLMİŞ
 * ----------------------------------------------------------------------------
 *  Çalıştırma:
 *    npm run canli:11265-onarim              → KURU KOŞUM (yazmaz)
 *    npm run canli:11265-onarim -- --uygula  → YAZAR
 *
 *  BETIK SINIFI: TEK_SEFERLIK — bu siparişin kimliğine KİLİTLİ. Genel araç
 *  DEĞİLDİR; genel araç hâline getirilirse istisna kurala döner.
 *
 *  ── ⛔ NE OLMUŞ (ölçüldü, `canli:varyant-gecmisi -- axcali1739`) ────────
 *  İade, `RETURN_IN` yerine **negatif fiyatlı ikinci bir satış kalemi**
 *  olarak girilmiş. Sonuç zinciri:
 *
 *      24.05  sat 3 → İKİ adet düştü (biri negatif satır)  → stok erken 0
 *      28.05  sat 4 → stok yok, maliyet betiği HAYALET parti açtı
 *      15.06  İADE  → hiç kaydedilmedi
 *      01.07  sat 5 → yine hayalet parti
 *
 *  ⭐ KANALIN KENDİ KAYDI (TY claims + satıcı ekranı) doğruluyor:
 *      27.05  DAMAGEDITEM "Kusurlu ürün gönderildi"  → Rejected
 *      15.06  SELLERREQUEST "Satıcı Talebi İle İade" → Accepted · 1 adet
 *
 *  ── ÜÇ ADIM VE NİYE ÜÇÜ BİRDEN ─────────────────────────────────────────
 *    A) negatif kalemin ADEDİ 0 → SALE_OUT geri alınır      stok +1
 *    B) gerçek İADE kaydı (1 adet, NORMAL, 15.06, sağlam 1) stok +1
 *    C) İKİ hayalet parti geri alınır                        stok −2
 *                                                    ────────────────
 *                                                     net değişim 0 ✓
 *
 *  ⛔ ÜÇÜ AYRILAMAZ: yalnız A yapılırsa defterde olmayan 1 adet doğar;
 *  A+B yapılırsa 2 adet doğar. Fiziksel stok 0 (hepsi satıldı) ve defter
 *  de 0'da kalmalı.
 *  _(Anayasa: "ölçüm iki defteri de ölçmeli" — ledger ve FIFO birlikte.)_
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS = "11265267349";
const SKU = "axcali1739";
const HAYALET_NOT = "dosya-maliyet-20260828";
const UYGULA = process.argv.includes("--uygula");

/** ⭐ Kanalın kendi kaydından — uydurulmadı. */
const IADE_TARIHI = new Date("2026-06-15T12:00:00.000Z");
const IADE_SEBEBI =
  "IADE_SEBEP[kaynak:ty-claims]: «Satıcı Talebi İle İade»";

function para(x: unknown): string {
  const n = Number(String(x));
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "—";
}
function gun(d: Date): string {
  return d.toISOString().slice(0, 10);
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

  console.log("=".repeat(92));
  console.log(
    `  ${SIPARIS} ONARIMI  ·  KİP: ${UYGULA ? "⚠ UYGULA (YAZAR)" : "KURU KOŞUM (yazmaz)"}`,
  );
  console.log("=".repeat(92));

  const varyant = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true, sku: true },
  });
  if (varyant === null) {
    console.log(`⛔ ${SKU} bulunamadı — ÖLÇÜM YOK.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ── ANLIK GÖRÜNTÜ ─────────────────────────────────────────────────── */
  const gorunuAl = async () => {
    const hareketler = await prisma.stockMovement.aggregate({
      where: { variantId: varyant.id },
      _sum: { quantityDelta: true },
      _count: { _all: true },
    });
    const satis = await prisma.sale.findFirst({
      where: { code: SIPARIS },
      select: {
        id: true,
        net1Amount: true,
        net2Amount: true,
        profitStatus: true,
        items: {
          select: {
            id: true,
            quantity: true,
            unitPriceAmount: true,
            stockMovements: { select: { id: true, quantityDelta: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    return {
      stok: hareketler._sum.quantityDelta ?? 0,
      hareketSayisi: hareketler._count._all,
      net1: satis?.net1Amount?.toString() ?? null,
      net2: satis?.net2Amount?.toString() ?? null,
      durum: satis?.profitStatus ?? null,
      satisId: satis?.id ?? null,
      kalemler: (satis?.items ?? []).map((i) => ({
        id: i.id,
        adet: i.quantity,
        fiyat: Number(i.unitPriceAmount.toString()),
        hareket: i.stockMovements.length,
      })),
    };
  };

  const once = await gorunuAl();
  console.log("\n① ANLIK GÖRÜNTÜ");
  console.log(`   ${SKU} stok (ledger)   : ${once.stok}`);
  console.log(`   hareket sayısı         : ${once.hareketSayisi}`);
  console.log(`   satış NET-1 ${para(once.net1)} · NET-2 ${para(once.net2)} · ${once.durum}`);
  for (const k of once.kalemler) {
    console.log(
      `   kalem ${k.id.slice(-8)}  adet ${k.adet}  fiyat ${para(k.fiyat).padStart(11)}` +
        `  hareket ${k.hareket}`,
    );
  }

  const negatif = once.kalemler.find((k) => k.fiyat < 0);
  if (negatif === undefined) {
    console.log("\n✓ Negatif kalem YOK — onarım GEREKMİYOR (ya da yapılmış).");
    await prisma.$disconnect();
    return;
  }

  /** ── HAYALET PARTİLER ──────────────────────────────────────────────── */
  const hayaletler = await prisma.stockMovement.findMany({
    where: {
      variantId: varyant.id,
      quantityDelta: { gt: 0 },
      note: { contains: HAYALET_NOT },
    },
    select: {
      id: true,
      occurredAt: true,
      quantityDelta: true,
      unitCostAmount: true,
    },
    orderBy: { occurredAt: "asc" },
  });
  console.log(`\n② HAYALET PARTİLER (${HAYALET_NOT})`);
  for (const h of hayaletler) {
    /** Bu parti tüketilmiş mi — tüketen çıkışlar `sourceMovementId` taşır. */
    const tuketen = await prisma.stockMovement.count({
      where: { sourceMovementId: h.id },
    });
    console.log(
      `   ${gun(h.occurredAt)}  +${h.quantityDelta}  @${para(h.unitCostAmount)}` +
        `   tüketen hareket: ${tuketen}` +
        (tuketen > 0 ? "  ⛔ TÜKETİLMİŞ — doğrudan silinemez (Restrict)" : ""),
    );
  }

  /** ── PLAN ──────────────────────────────────────────────────────────── */
  console.log("\n③ PLAN — ÜÇ ADIM, NET DEĞİŞİM 0");
  console.log(
    `   A) negatif kalem adedi ${negatif.adet} → 0` +
      `   (SALE_OUT geri alınır)              stok +1`,
  );
  console.log(
    `   B) iade kaydı: 1 adet · NORMAL · ${gun(IADE_TARIHI)} · sağlam 1   stok +1`,
  );
  console.log(
    `   C) ${hayaletler.length} hayalet parti ters ADJUSTMENT ile kapatılır  stok −${hayaletler.length}`,
  );
  console.log(
    `   ────────────────────────────────────────────────────────────────`,
  );
  console.log(
    `   beklenen son stok: ${once.stok} + 1 + 1 − ${hayaletler.length} = ` +
      `${once.stok + 2 - hayaletler.length}`,
  );
  console.log(`   not: ${IADE_SEBEBI}`);

  if (once.stok + 2 - hayaletler.length !== 0) {
    console.log(
      "\n   ⛔ BEKLENEN SON STOK 0 DEĞİL — plan bu hâliyle YAZILMAZ.",
    );
    console.log("     Hayalet parti sayısı ile adım sayısı uyuşmuyor.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /**
   * ⛔ C ADIMI İÇİN ENGEL ÖLÇÜLDÜ: tüketilmiş partiyi SİLMEK `Restrict`
   * yüzünden imkânsız ve zaten ledger disiplinine aykırı. Doğru yol ters
   * işaretli `ADJUSTMENT` — ama o da partiyi TÜKETMİŞ olur ve tüketen
   * satışın maliyet damgası yerinde kalır.
   *
   * ⚠ SONUÇ: satış 4 ve 5'in maliyeti hayalet partiden okunmaya DEVAM
   * eder (₺1.945). O rakam gerçeğe yakın (1.934 ↔ 1.999 arası) ama
   * kaynağı uydurma. Bu bir EKSİK ONARIMDIR ve öyle yazılır.
   */
  console.log("\n④ ⛔ BU ONARIMIN SINIRI — ŞİMDİ SÖYLENİYOR, SONRA DEĞİL");
  console.log("   Satış 4 ve 5'in maliyeti hayalet partiden okunuyor (₺1.945)");
  console.log("   ve ters ADJUSTMENT bunu DEĞİŞTİRMEZ — damga yerinde kalır.");
  console.log("   Rakam gerçeğe yakın (1.934 ↔ 1.999 arası) ama kaynağı");
  console.log("   uydurma. Tam onarım FIFO yeniden kurmayı gerektirir ve");
  console.log("   o, bu siparişin dışına taşar.");

  if (!UYGULA) {
    console.log("\n" + "-".repeat(92));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:11265-onarim -- --uygula");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  console.log("\n⑤ YAZIM — henüz bağlanmadı (bilerek).");
  console.log("   Adım A uygulamanın `duzenlemeyiUygula` gövdesinden,");
  console.log("   adım B `iadeKaydet`ten geçmeli — ikinci bir yazma yolu");
  console.log("   açılmayacak. Kuru koşum onaylandıktan sonra bağlanacak.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
