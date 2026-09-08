/** BETIK SINIFI: TEK_SEFERLIK — K188-② metadata duzeltmesi, TEK harekete kilitli. */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/**
 * ============================================================================
 *  METADATA DÜZELTMESİ — DAR İSTİSNA (anayasa, 19.08.2026)
 * ----------------------------------------------------------------------------
 *  Ledger dokunulmazlığı MİKTAR ve PARA içindir. Burada değişen alan bir
 *  TARİHTİR ve üç şart da sağlanıyor:
 *
 *  ① DEĞİŞEN ALAN miktar/para DEĞİL — yalnız `occurredAt`.
 *  ② ALTERNATİFLER ÖLÇÜLÜP ELENDİ (08.09.2026):
 *       ekrandan hareket tarihi düzeltme  → YOK
 *       iptali geri alma                  → YOK (ve çift sayımı geri getirir)
 *       ADJUSTMENT -1                     → stok düzelir ama satış SONSUZA
 *                                           KADAR maliyetsiz + kuyrukta (K49)
 *       FIFO tarih sınırını gevşetme      → K79'da ölçüldü: defterin
 *                                           %48,72'sini kilitler
 *  ③ İZ eski VE yeni değerle yazılıyor.
 *
 *  ⛔ VE BETİK TEK HAREKETİN KİMLİĞİNE KİLİTLİ — genel araç DEĞİL.
 *  Genel araç, istisnayı kurala çevirir.
 *
 *  ⭐ YENİ TARİH UYDURULMADI: hareketin TERSİNİ ALDIĞI çıkışın tam anı
 *  (`cmtcugsb` SALE_OUT, 2026-08-10T00:00:00Z). Bugünkü tarih "bugün rafa
 *  bir adet geldi" diyordu — Halil 08.09'da rafın BOŞ olduğunu teyit etti,
 *  yani o iddia yanlıştı.
 * ============================================================================
 */

const HAREKET_ID = "cmtsfyn1s0000uwvknpzhy69h";
const YENI_AN = new Date("2026-08-10T00:00:00.000Z");
const YAZ = process.argv.includes("--yaz");

async function main() {
  const y = canliYapilandirma(); if (!y.tamam) { console.log("⛔", y.hata); return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { acikPartiler, gunSonu } = await import("../src/lib/stok");

  const h = await prisma.stockMovement.findUnique({ where: { id: HAREKET_ID },
    select: { id: true, type: true, quantityDelta: true, occurredAt: true, variantId: true,
      variant: { select: { sku: true } } } });
  if (!h) { console.log("⛔ HAREKET YOK — kimlik degismis olabilir, DUR"); return; }
  if (h.type !== "SALE_CANCEL_IN" || h.quantityDelta !== 1 || h.variant.sku !== "axcali2383") {
    console.log(`⛔ HAREKET BEKLENENDEN FARKLI (${h.type} ${h.quantityDelta} ${h.variant.sku}) — DUR`); return;
  }
  const eskiAn = h.occurredAt;
  console.log(`ADIM · TARIH DUZELTMESI  ${YAZ ? "YAZIM" : "KURU KOSUM"}`);
  console.log(`   hareket ${h.id.slice(0,8)} · ${h.type} ${h.quantityDelta} · ${h.variant.sku}`);
  console.log(`   ESKI ${eskiAn.toISOString()}  →  YENI ${YENI_AN.toISOString()}`);
  if (eskiAn.getTime() === YENI_AN.getTime()) { console.log("   ⛔ ZATEN DUZELTILMIS — atlandi"); await prisma.$disconnect(); return; }

  const satis = await prisma.sale.findFirst({ where: { code: "4873413946" }, select: { soldAt: true } });
  const pOnce = await acikPartiler(prisma, h.variantId, gunSonu(satis!.soldAt));
  console.log(`   satis gunune (10.08) acik parti ONCE: ${pOnce.length}`);
  if (!YAZ) { console.log("\n   ÖNİZLEME — yazılmadı. Yazmak için: -- --yaz"); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.update({ where: { id: HAREKET_ID }, data: { occurredAt: YENI_AN } });
    await tx.auditLog.create({ data: {
      action: "K188_IPTAL_TARIHI_DUZELTILDI", targetType: "StockMovement", targetId: HAREKET_ID,
      detail: JSON.stringify({
        sku: "axcali2383", tip: "SALE_CANCEL_IN", adet: 1,
        eskiOccurredAt: eskiAn.toISOString(),
        yeniOccurredAt: YENI_AN.toISOString(),
        gerekce: "Iptal, tersini aldigi 10.08 tarihli SALE_OUT'un yerine BUGUN tarihli bir giris "
          + "yazmisti. Bu, 'bugun rafa bir adet geldi' iddiasidir ve Halil 08.09'da rafin BOS "
          + "oldugunu teyit etti — iddia yanlisti. Yeni tarih uydurulmadi: tersini aldigi cikisin "
          + "(cmtcugsb) tam ani. Boylece 10.08 satisi 4873413946 FIFO'da partiyi gorebiliyor.",
        alternatifler: "ekran yolu YOK · iptali geri alma YOK (cift sayimi geri getirir) · "
          + "ADJUSTMENT -1 satisi sonsuza kadar maliyetsiz birakir (K49) · FIFO sinirini gevsetmek "
          + "K79'da olculdu, defterin %48,72'sini kilitler",
        geriAlmaOlcutu: `StockMovement.id = ${HAREKET_ID} · occurredAt ${YENI_AN.toISOString()} → ${eskiAn.toISOString()}`,
      }) } });
  }, { timeout: 120000 });

  const pSonra = await acikPartiler(prisma, h.variantId, gunSonu(satis!.soldAt));
  console.log(`   satis gunune acik parti SONRA: ${pSonra.length} · kalan ${pSonra.reduce((t,x)=>t+x.kalanAdet,0)}`);
  console.log(`   ${pSonra.length === 1 ? "✓ PARTI GORUNUR OLDU" : "⛔ HALA GORUNMUYOR"}`);
  await prisma.$disconnect();
}
void main();
