import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  RAKAM SAĞLIĞI — ALIŞ · SATIŞ · MALİYET (SALT OKUMA)
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-rakam-saglik.ts
 *
 *  BETIK SINIFI: TEK_SEFERLIK — kullanıcı sorusunun ("rakamlar reel mi")
 *  cevabını ölçer; hiçbir şey YAZMAZ.
 *
 *  ⛔ NİYE: "rakamlar doğru" bir GÜVENCE cümlesidir ve güvence ölçülmeden
 *  verilmez. Anayasa: sistem, kendi defterinde takip etmediği şey hakkında
 *  iddia kurmaz — ve "ekran şunu gösteriyor" bir İDDİADIR, kanıtı gövdeyi
 *  ÇAĞIRMAKTIR.
 *
 *  ⚠ HER BÖLÜM DÖRT SAYIYI AYRI YAZAR: incelenen · temiz · sapan ·
 *  İNCELENEMEYEN. Dördüncüsü sıfırdan büyükse sonucun kapsamı o kadar dardır.
 * ============================================================================
 */

function yuzde(pay: number, payda: number): string {
  return payda === 0 ? "—" : `%${((pay / payda) * 100).toFixed(1)}`;
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

  console.log("\nRAKAM SAĞLIĞI — ALIŞ · SATIŞ · MALİYET");
  console.log("  hedef  " + y.veri.adres.hostname);
  console.log("  kip    SALT OKUMA — hiçbir şey yazılmaz");
  console.log("  an     " + new Date().toISOString());
  console.log("=".repeat(66));

  /* ═══ ① SATIŞ — KÂR DAMGASI ══════════════════════════════════════ */
  const satisToplam = await prisma.sale.count();
  const iptal = await prisma.sale.count({ where: { iptalTarihi: { not: null } } });
  const gecerli = satisToplam - iptal;

  const durumlar = await prisma.sale.groupBy({
    by: ["profitStatus"],
    where: { iptalTarihi: null },
    _count: { _all: true },
    orderBy: { profitStatus: "asc" },
  });

  console.log("\n① SATIŞ — kâr damgası (iptaller hariç)\n");
  console.log(`   toplam satış kaydı        ${satisToplam}`);
  console.log(`   iptal                     ${iptal}`);
  console.log(`   GEÇERLİ                   ${gecerli}`);
  console.log("");
  for (const d of durumlar) {
    const n = d._count._all;
    console.log(
      `   ${String(d.profitStatus ?? "(boş)").padEnd(22)} ${String(n).padStart(5)}   ${yuzde(n, gecerli)}`,
    );
  }

  /* ═══ ② NET YAZILDI MI — KAPI TUTUYOR MU ════════════════════════ */
  /**
   * ⛔ 28.08 KARARI: `net1Amount`/`net2Amount` YALNIZ `CALCULATED` iken
   * yazılır. Bu bölüm o kapının FİİLEN tuttuğunu ölçer — beyanı değil.
   */
  const hesaplananNetsiz = await prisma.sale.count({
    where: { iptalTarihi: null, profitStatus: "CALCULATED", net2Amount: null },
  });
  const hesaplanmayanNetli = await prisma.sale.count({
    where: {
      iptalTarihi: null,
      profitStatus: { not: "CALCULATED" },
      net2Amount: { not: null },
    },
  });
  console.log("\n② NET YAZMA KAPISI — 28.08 kararı fiilen tutuyor mu\n");
  console.log(`   CALCULATED ama NET-2 BOŞ           ${hesaplananNetsiz}   (0 olmalı)`);
  console.log(`   CALCULATED DEĞİL ama NET-2 DOLU    ${hesaplanmayanNetli}   (0 olmalı)`);

  /* ═══ ③ MALİYET — ÇIKIŞLARDA DAMGA VAR MI ═══════════════════════ */
  const cikisToplam = await prisma.stockMovement.count({
    where: { quantityDelta: { lt: 0 } },
  });
  const cikisDamgasiz = await prisma.stockMovement.count({
    where: { quantityDelta: { lt: 0 }, unitCostAmount: null },
  });
  const cikisBagsiz = await prisma.stockMovement.count({
    where: { quantityDelta: { lt: 0 }, sourceMovementId: null },
  });
  console.log("\n③ MALİYET — çıkış hareketlerinde damga\n");
  console.log(`   çıkış hareketi            ${cikisToplam}`);
  console.log(`   birim maliyeti YOK        ${cikisDamgasiz}   ${yuzde(cikisDamgasiz, cikisToplam)}`);
  console.log(`   partiye BAĞLI DEĞİL       ${cikisBagsiz}   ${yuzde(cikisBagsiz, cikisToplam)}`);

  /* ═══ ④ ALIŞ — BİRİM MALİYET VE TARİH ═══════════════════════════ */
  const alimKalem = await prisma.purchaseItem.count();
  /**
   * ⚠ `unitCostAmount` ZORUNLU ALAN — "maliyeti yok" burada yapısal olarak
   * imkânsız. Anlamlı soru bu değil, **SIFIR** maliyetli kalem: bedava mal
   * gerçekten olabilir (hediye kuponu vakası, 19.08) ama sıfır maliyet kâr
   * hesabını da şişirir, o yüzden SAYILIR ve baktırılır.
   */
  const alimSifirMaliyet = await prisma.purchaseItem.count({
    where: { unitCostAmount: 0 },
  });
  const alimTarihsiz = await prisma.purchase.count({ where: { receivedAt: null } });
  const alimToplam = await prisma.purchase.count();
  console.log("\n④ ALIŞ — kalem ve tarih\n");
  console.log(`   alım kalemi               ${alimKalem}`);
  console.log(`   birim maliyeti SIFIR      ${alimSifirMaliyet}   ${yuzde(alimSifirMaliyet, alimKalem)}`);
  console.log(`   alım kaydı                ${alimToplam}`);
  console.log(`   mal kabul tarihi YOK      ${alimTarihsiz}   ${yuzde(alimTarihsiz, alimToplam)}`);

  /* ═══ ⑤ ÇOKLU ADET — TY İÇE AKTARMA HATASININ İZİ ═══════════════ */
  /**
   * ⚠ 29.08'de bulunan hata: `price` BİRİM fiyat olduğu hâlde satır toplamı
   * sanılmış ve adete BÖLÜNMÜŞTÜ; çok adetli satışlar cironun yarısıyla
   * girdi ve ZARARDA göründü. Bu bölüm kalan izi arar — hüküm kurmaz,
   * BAKTIRIR: adet>1 olup NET-2'si NEGATİF olan kalemler.
   */
  const cokAdetli = await prisma.saleItem.count({ where: { quantity: { gt: 1 } } });
  const cokAdetliZarar = await prisma.sale.count({
    where: {
      iptalTarihi: null,
      net2Amount: { lt: 0 },
      items: { some: { quantity: { gt: 1 } } },
    },
  });
  const tekAdetliZarar = await prisma.sale.count({
    where: {
      iptalTarihi: null,
      net2Amount: { lt: 0 },
      items: { every: { quantity: 1 } },
    },
  });
  console.log("\n⑤ ÇOKLU ADET — 29.08 hatasının izi (hüküm değil, DAVET)\n");
  console.log(`   adet>1 olan satış kalemi           ${cokAdetli}`);
  console.log(`   adet>1 İÇEREN ve NET-2 negatif     ${cokAdetliZarar}`);
  console.log(`   yalnız adet=1 ve NET-2 negatif     ${tekAdetliZarar}`);
  console.log("   ⚠ ikisi arasında BÜYÜK oran farkı varsa hata izi sürüyor demektir");


  /* ═══ ⑥ ASIL SORU — CALCULATED DAMGASI KARŞILIKLI MI ═══════════ */
  /**
   * ⛔ 28.08 HATASI TAM BURADAYDI: hareketi HİÇ OLMAYAN bir satış kalemi
   * `kalemMaliyeti([])` → **0** alıyordu, motor `null` görmediği için
   * `CALCULATED` diyordu ve 2493 satış maliyetsiz hâlde "hesaplandı"
   * sayılıyordu. Panel ₺4,5M sahte kâr gösterdi.
   *
   * ⚠ ①'DEKİ "%100 CALCULATED" TEK BAŞINA GÜVENCE DEĞİL — aynı rakam hatalı
   * hâlde de %100 çıkıyordu. Ayırt edici ölçüt BU: damganın arkasında
   * gerçekten bir çıkış hareketi var mı.
   * _(Anayasa: iki okumayla da uyumlu bir gözlem hiçbirini kanıtlamaz.)_
   */
  const kalemToplam = await prisma.saleItem.count();
  const hareketsizKalem = await prisma.saleItem.count({
    where: { stockMovements: { none: {} } },
  });
  const hareketsizSatis = await prisma.sale.count({
    where: { iptalTarihi: null, items: { some: { stockMovements: { none: {} } } } },
  });
  console.log("");
  console.log("⑥ ASIL SORU — CALCULATED damgasının arkasında hareket var mı");
  console.log("");
  console.log(`   satış kalemi                       ${kalemToplam}`);
  console.log(
    `   HİÇ stok hareketi OLMAYAN kalem    ${hareketsizKalem}   ${yuzde(hareketsizKalem, kalemToplam)}`,
  );
  console.log(`   böyle kalem İÇEREN geçerli satış   ${hareketsizSatis}`);
  console.log("   ⚠ 28.08 hatasında bunlar CALCULATED sayılıyordu — sıfır olmalı");

  /* ═══ ⑦ DAMGASIZ ÇIKIŞLAR NE ═══════════════════════════════════ */
  /**
   * ⚠ SAYI DEĞİL, KİMLİK. "6 çıkışın maliyeti yok" bir sayıdır ve okuyanı
   * "hangileri" diye aramaya bırakır (İlke #16). Satırlar burada dökülüyor.
   */
  const damgasizlar = await prisma.stockMovement.findMany({
    where: { quantityDelta: { lt: 0 }, unitCostAmount: null },
    select: {
      id: true,
      type: true,
      occurredAt: true,
      quantityDelta: true,
      saleItemId: true,
    },
  });
  console.log("");
  console.log("⑦ BİRİM MALİYETİ OLMAYAN ÇIKIŞLAR — ne oldukları");
  console.log("");
  for (const d of damgasizlar) {
    const gun = d.occurredAt.toISOString().slice(0, 10);
    const bagli = d.saleItemId === null ? "HAYIR" : "EVET";
    console.log(
      `   ${gun}  ${d.type.padEnd(18)} ${String(d.quantityDelta).padStart(4)}  satışa bağlı: ${bagli}`,
    );
  }
  if (damgasizlar.length === 0) console.log("   (yok)");

  await prisma.$disconnect();
}

void main();
