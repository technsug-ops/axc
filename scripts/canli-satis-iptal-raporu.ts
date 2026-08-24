/**
 * ============================================================================
 *  SATIŞ İPTALİ — ÖNCE RAPOR (salt okuma, --uygula YOK)
 * ----------------------------------------------------------------------------
 *  ⚠ BU BETİK YAZMAZ. Görevi tek: "bu satışı iptal edersek NE DEĞİŞİR" ve
 *  "iptal edilebilir mi" sorularını ÖLÇMEK. Yazma kararı rapor okunduktan
 *  sonra verilir.
 *
 *  ⚠ SİLME DEĞİL İPTAL — ve gerekçe ilke değil, ŞEMA:
 *    · Sale → SaleItem  : Cascade  → kalemler de silinir
 *    · StockMovement → SaleItem : SetNull → HAREKET KALIR, sahipsiz olur
 *  Yani silinirse stok düşük kalır ama DÜŞÜREN kaybolur; parti tüketilmiş
 *  görünür, tüketen yoktur. İptal aynı sonucu verir ve hiçbirini bozmaz:
 *  ciroya/NET'e/hakedişe girmez, stok DOĞRU döner, geri alınabilir, iz bırakır.
 *
 *  ⚠ İADESİ OLAN SATIŞ AYRI BİR VAKA. İade malı zaten stoğa döndürdü;
 *  iptal onu İKİNCİ KEZ sokar. Ekrandaki kapı tam bunu engelliyor ve
 *  DOĞRU çalışıyor. Bu betik o durumu ölçer ve adını koyar.
 *
 *  KOŞUM: npx tsx scripts/canli-satis-iptal-raporu.ts 11502693455
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

async function main() {
  const kod = process.argv[2];
  if (!kod) {
    console.log("Kullanim: npx tsx scripts/canli-satis-iptal-raporu.ts <siparisNo>");
    process.exitCode = 1;
    return;
  }
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapılandırma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");

  const s = await prisma.sale.findFirst({
    where: { code: kod },
    select: {
      id: true, code: true, soldAt: true, shippedAt: true, iptalTarihi: true,
      net1Amount: true, net2Amount: true,
      channelAccount: { select: { name: true, channel: { select: { name: true } } } },
      items: {
        select: {
          id: true, quantity: true, unitPriceAmount: true,
          variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
          stockMovements: {
            select: { id: true, type: true, quantityDelta: true,
                      unitCostAmount: true, sourceMovementId: true },
          },
        },
      },
      returns: { select: { id: true, returnType: true, net2Amount: true,
                           items: { select: { id: true, quantity: true } } } },
      fees: { select: { code: true, amount: true } },
    },
  });
  if (!s) { console.log(`${kod}: satış BULUNAMADI`); process.exitCode = 1; return; }

  console.log(`\n${"=".repeat(72)}`);
  console.log(`İPTAL RAPORU — ${s.code}   (RAPOR KİPİ · hiçbir şey yazılmaz)`);
  console.log(`${"=".repeat(72)}`);
  console.log(`  hedef      ${y.veri.adres.hostname}`);
  console.log(`  satış      ${s.soldAt.toISOString().slice(0,10)} · ${s.channelAccount?.channel.name ?? "?"} / ${s.channelAccount?.name ?? "?"}`);
  console.log(`  kargo      ${s.shippedAt ? "VERİLDİ " + s.shippedAt.toISOString().slice(0,10) : "bekliyor"}`);
  console.log(`  durum      ${s.iptalTarihi ? "ZATEN İPTAL (" + s.iptalTarihi.toISOString().slice(0,10) + ")" : "aktif"}`);
  console.log(`  NET-1 ${s.net1Amount?.toString() ?? "—"} · NET-2 ${s.net2Amount?.toString() ?? "—"}`);

  if (s.iptalTarihi) {
    console.log(`\n  ⛔ ZATEN İPTAL EDİLMİŞ — yapılacak bir şey yok.`);
    return;
  }

  console.log(`\n  KALEMLER VE STOK ETKİSİ`);
  for (const k of s.items) {
    console.log(`    ${k.variant.sku} · ${k.variant.product.name.slice(0,44)} · ${k.quantity} × ${k.unitPriceAmount.toString()}`);
    for (const h of k.stockMovements) {
      console.log(`      ${h.type.padEnd(14)} ${String(h.quantityDelta).padStart(3)} × ${h.unitCostAmount?.toString() ?? "—"} · parti ${h.sourceMovementId ? h.sourceMovementId.slice(-6) : "YOK"}`);
    }
    const mevcut = await prisma.stockMovement.aggregate({
      where: { variantId: k.variant.id }, _sum: { quantityDelta: true },
    });
    const cikan = k.stockMovements.reduce((t, h) => t + h.quantityDelta, 0);
    console.log(`      → stok şu an ${mevcut._sum.quantityDelta ?? 0}; iptal geri yazarsa ${(mevcut._sum.quantityDelta ?? 0) - cikan}`);
  }

  console.log(`\n  KESİNTİ DÖKÜMÜ (iptalde ciroya/NET'e girmez)`);
  for (const f of s.fees) console.log(`    ${f.code.padEnd(22)} ${f.amount.toString().padStart(12)}`);

  /**
   * ⚠ ENGEL AYRI SAYILIR. "İptal edilemez" tek kelimeyle geçilirse
   * kullanıcı NEYİ düzelteceğini bilemez (İlke #5).
   */
  const engeller: string[] = [];
  if (s.returns.length > 0) {
    engeller.push(
      `İADESİ VAR (${s.returns.length}) — iade malı zaten stoğa döndürdü; ` +
      `iptal onu İKİNCİ KEZ sokar. Ekrandaki kapı bunu doğru engelliyor.`,
    );
  }
  const hakedis = await prisma.settlementItem.count({ where: { saleId: s.id } });
  if (hakedis > 0) engeller.push(`HAKEDİŞ KALEMİ BAĞLI (${hakedis}) — kanal bu satışı ödemiş.`);
  const bildirim = await prisma.returnNotice.count({ where: { saleId: s.id } });

  console.log(`\n  BAĞLI KAYITLAR`);
  console.log(`    iade kaydı        ${s.returns.length}`);
  for (const i of s.returns) console.log(`      ${i.id.slice(-6)} ${i.returnType} · NET-2 ${i.net2Amount?.toString()} · ${i.items.length} kalem`);
  console.log(`    iade bildirimi    ${bildirim}`);
  console.log(`    hakediş kalemi    ${hakedis}`);

  console.log(`\n  ${"—".repeat(68)}`);
  if (engeller.length === 0) {
    console.log(`  ✓ ENGEL YOK — bu satış ekrandaki "Satışı iptal et" kutusundan`);
    console.log(`    iptal edilebilir. Betiğe gerek yok; sebep + açıklama girip onaylayın.`);
  } else {
    console.log(`  ⛔ İPTAL EDİLEMEZ — ${engeller.length} engel:`);
    for (const e of engeller) console.log(`     · ${e}`);
    console.log(`\n  ⚠ ENGEL KALDIRILMAZ, SIRA DEĞİŞİR: önce iade tarafı ele alınır,`);
    console.log(`    sonra satış iptal edilir. Engeli atlayan bir betik yazmak,`);
    console.log(`    ekrandaki doğru kapıyı arkadan dolaşmak olurdu.`);
  }
  console.log(`\n  RAPOR KİPİ — hiçbir şey yazılmadı.\n`);
}
main();
