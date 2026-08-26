/**
 * ============================================================================
 *  İKİ DEFTER AYRIŞMASI — LEDGER ↔ FIFO
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:defter-ayrismasi
 *
 *  ⚠ SALT OKUMA. Yazma bayrağı YOK.
 *
 *  ── NİYE VAR ────────────────────────────────────────────────────────────
 *  Stok iki ayrı yerde yaşıyor:
 *    · **Ledger** — `StockMovement.quantityDelta` toplamı. Ekranların
 *      gösterdiği sayı budur (`varyantStogu`).
 *    · **FIFO** — açık partilerin `kalanAdet` toplamı. Maliyet buradan
 *      okunur; kâr motoru bu deftere bakar.
 *
 *  İkisi **her zaman eşit olmalıdır.** Ayrışırlarsa ekran bir sayı, kâr
 *  hesabı başka bir sayı üzerinden çalışır ve **hiçbiri hata vermez.**
 *
 *  ── VAKA 20.08.2026 — İKİ AYRI SEBEP, AYNI SONUÇ ────────────────────────
 *  ① `OYU-LG-598P-01` — ledger 3 / FIFO 4. İptali geri alma, araya giren
 *     bir "HATA DÜZELTME" ile ÇOKTAN TÜKENMİŞ bir ayna partisini tüketmeye
 *     çalıştı: ledger −1 yazdı, FIFO'da düşecek parti yoktu.
 *  ② `axcali1667` — ledger 2 / FIFO 3. 17.08 öncesinden kalma: ayna hareket
 *     `sourceMovementId` taşıyordu, hem yeni parti sayılıyor hem eski
 *     partinin tüketimini sıfırlıyordu.
 *
 *  İkisinin de kodu düzeltildi (`AYNA_TUKENMIS` ve `AYNA_ADET_UYUSMAZ`
 *  engelleri + kaynak bağı yazılmaması). **Ama düzeltilmiş kod, birikmiş
 *  veriyi geri getirmez** — bu betik onu görünür kılar.
 *
 *  ── ⚠ HÜKÜM VERMEZ, DÜZELTMEZ ───────────────────────────────────────────
 *  Hangi defterin doğru olduğu vakaya göre değişir; ikisini de körlemesine
 *  hizalamak veriyi bozar. Betik ayrışmayı SAYAR ve GÖSTERİR.
 * ============================================================================
 */

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartiler } = await import("../src/lib/stok");

  console.log("");
  console.log("İKİ DEFTER AYRIŞMASI — ledger ↔ FIFO");
  console.log("  hedef      " + y.veri.adres.hostname);
  console.log("  kip        SALT OKUMA — hiçbir şey yazılmaz");
  console.log("");

  /**
   * ⚠ HAREKETİ OLAN HER VARYANT taranır — "stoğu var olanlar" değil.
   * Ayrışma sıfır stoklu bir varyantta da olabilir ve orada daha sinsidir:
   * ekran "0" der, FIFO'da parti durur ve bir sonraki satış ondan tüketir.
   */
  const gruplar = await prisma.stockMovement.groupBy({
    by: ["variantId"],
    _sum: { quantityDelta: true },
  });

  let temiz = 0;
  const sapan: {
    sku: string;
    ad: string;
    ledger: number;
    fifo: number;
    fark: number;
  }[] = [];
  let incelenemeyen = 0;

  for (const g of gruplar) {
    const ledger = g._sum.quantityDelta ?? 0;
    let fifo: number;
    try {
      const partiler = await acikPartiler(prisma, g.variantId);
      fifo = partiler.reduce((t, p) => t + p.kalanAdet, 0);
    } catch {
      /** ⚠ OKUNAMAYAN VARYANT "TEMİZ" SAYILMAZ — ayrı sayılır. */
      incelenemeyen++;
      continue;
    }
    if (fifo === ledger) {
      temiz++;
      continue;
    }
    const v = await prisma.productVariant.findUnique({
      where: { id: g.variantId },
      select: { sku: true, product: { select: { name: true } } },
    });
    sapan.push({
      sku: v?.sku ?? g.variantId,
      ad: v?.product.name ?? "—",
      ledger,
      fifo,
      fark: fifo - ledger,
    });
  }

  /**
   * ⚠ DÖRT SAYI AYRI YAZILIR (anayasa): incelenen · temiz · sapan ·
   * incelenemeyen. "Bulunamadı" tek başına hüküm değildir.
   */
  console.log("  incelenen varyant   " + gruplar.length);
  console.log("  temiz               " + temiz);
  console.log("  SAPAN               " + sapan.length);
  console.log("  incelenemeyen       " + incelenemeyen);
  console.log("");

  /**
   * ═══ İÇE AKTARMA ŞERHİ — AYRI KOVA, K54'E KARIŞTIRILMAZ ═══════════════
   *
   * A3-③'te içe aktarılan satışlar stok hareketi üretmedi (bilinçli karar,
   * 26.08.2026). Bu, iki defterin ayrışması DEĞİLDİR: ledger de FIFO da
   * o satışları hiç görmedi, ikisi de aynı şeyi söylüyor.
   *
   * ⛔ AMA SAYILMASI ŞART. Bu sayı kovaya karıştırılsaydı K54'ün gerçek
   * ayrışması (2 adet, bağsız `EXCHANGE_OUT`) 425'lik bir gürültünün
   * içinde kaybolurdu — ve tersi de doğru: bu 425 "ayrışma" diye
   * okunsaydı olmayan bir arıza aranırdı.
   * _(Anayasa: "kontrol tasarımı, veri kapsamı doğrulanmadan FARK
   * üretmez" — burada iki taraf aynı kümeyi görüyor, fark YOK; eksik olan
   * BAĞ.)_
   */
  const iceAktarmaBagsiz = await prisma.sale.count({
    where: {
      importBatch: { not: null },
      /** ⚠ İPTALLİ SAYILMAZ — ekrandaki şerhle AYNI küme (`SERH_KAPSAMI`). */
      iptalTarihi: null,
      items: { none: { stockMovements: { some: {} } } },
    },
  });
  if (iceAktarmaBagsiz > 0) {
    console.log("  ── AYRI KOVA — İÇE AKTARMA ŞERHİ");
    console.log("     stok bağı kurulmamış içe aktarma satışı  " + iceAktarmaBagsiz);
    console.log("     ⚠ BU BİR AYRIŞMA DEĞİL: iki defter de o satışları hiç");
    console.log("       görmedi, ikisi de aynı şeyi söylüyor. Eksik olan BAĞ.");
    console.log("     ⚠ Yukarıdaki SAPAN sayısına DAHİL DEĞİL — karıştırılsaydı");
    console.log("       K54'ün gerçek ayrışması bu sayının içinde kaybolurdu.");
    console.log("");
  }

  if (sapan.length === 0) {
    console.log("  ✓ İki defter her varyantta birebir tutuyor.");
    console.log("");
    await prisma.$disconnect();
    return;
  }

  console.log(
    "  " + "SKU".padEnd(18) + "ledger".padStart(8) + "FIFO".padStart(7) +
      "fark".padStart(7) + "  ürün",
  );
  for (const s of [...sapan].sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark)))
    console.log(
      "  " + s.sku.padEnd(18) + String(s.ledger).padStart(8) +
        String(s.fifo).padStart(7) +
        (s.fark > 0 ? "+" + s.fark : String(s.fark)).padStart(7) +
        "  " + s.ad.slice(0, 40),
    );

  console.log("");
  console.log("  ⚠ FARK POZİTİFSE (FIFO > ledger): parti takibinde karşılığı");
  console.log("    olmayan adet var — ekran daha AZ gösteriyor.");
  console.log("  ⚠ FARK NEGATİFSE: ledger'da olan bir adedin partisi yok —");
  console.log("    satışta maliyetsiz çıkış üretebilir.");
  console.log("");
  console.log("  ⚠ HÜKÜM VERİLMEDİ. Hangi defterin doğru olduğu vakaya göre");
  console.log("    değişir; ikisini körlemesine hizalamak veriyi bozar.");
  console.log("    Her satır için hareket geçmişi okunup karar verilir.");
  console.log("");

  /** ⚠ Sapma varsa çıkış kodu 1 — boru sonuna güvenilmez, koda bakılır. */
  process.exitCode = 1;
  await prisma.$disconnect();
}

main();
