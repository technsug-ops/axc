/**
 * ============================================================================
 *  BİR ÜRÜNÜN TAM GEÇMİŞİ — ALIMLAR + SATIŞLAR TEK YERDE · SALT OKUMA
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npm run canli:urun-gecmisi -- axcali1805
 *
 *  BETIK SINIFI: SUREKLI. ⛔ HİÇBİR ŞEY YAZMAZ; yazma bayrağı YOKTUR.
 *
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanına ihtiyaç duyuyor, `npm run
 *  bekci` çevrimdışı koşmak zorunda. (Adı `-dogrula` ile bitmiyor ama beyan
 *  burada dursun ki sınıfı tahmine kalmasın.)
 *
 *  ── ⛔ NİYE VAR ─────────────────────────────────────────────────────────
 *  _Halil: "bu ürün birçok kez alınmış ve satılmış, bunları toplu aynı
 *  sayfaya koyma ihtimalin var mı?"_
 *
 *  Ürün kartı (`/kart/[variantId]`) SAYILARI gösteriyor ("13 kez satıldı")
 *  ama tek tek KALEMLERİ göstermiyor; alım ekranı ise tek bir alımı
 *  gösteriyor. Aradaki soru — _"hangi satış hangi partiden yedi"_ — hiçbir
 *  ekranda cevaplanmıyordu ve fatura kontrolü tam onu gerektiriyor.
 *
 *  ⭐ FIFO BAĞI (`sourceMovementId`) BU YÜZDEN TAŞINIYOR: `axcali1805`'te
 *  pahalı parti (`ALM-HB-260216-03`, ₺7.641,50) giriş sırasında İKİNCİYDİ
 *  ve FIFO onu erken tüketti — 04.03'teki iki satışın zarara düşmesinin
 *  sebebi tam bu. Bağ gösterilmeden o cümle kurulamaz.
 * ============================================================================
 */

import { writeFileSync } from "node:fs";
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";
const SKU = process.argv.slice(2).find(a => !a.startsWith("-")) ?? "axcali1805";
async function main() {
  const y = canliYapilandirma();
  if (!y.tamam) { console.log("yapilandirma yok"); process.exitCode = 1; return; }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const v = await prisma.productVariant.findFirst({
    where: { sku: SKU },
    select: { id: true, sku: true, companySku: true, barcode: true,
      location: { select: { name: true } },
      product: { select: { name: true, id: true } } },
  });
  if (v === null) { console.log(`${SKU} YOK`); return; }

  const har = await prisma.stockMovement.findMany({
    where: { variantId: v.id },
    select: { id: true, type: true, quantityDelta: true, occurredAt: true, createdAt: true,
      unitCostAmount: true, unitCostCurrency: true, note: true, sourceMovementId: true,
      purchaseItem: { select: { quantity: true, purchase: { select: { code: true, purchasedAt: true,
        supplierOrderNo: true, supplier: { select: { name: true } } } } } },
      saleItem: { select: { quantity: true, unitPriceAmount: true,
        sale: { select: { code: true, soldAt: true, iptalTarihi: true, profitStatus: true,
          net2Amount: true, cargoAmount: true,
          channelAccount: { select: { name: true, channel: { select: { name: true } } } } } } } } },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  });

  const partiKod = new Map<string, string>();
  for (const h of har) if (h.quantityDelta > 0 && h.purchaseItem)
    partiKod.set(h.id, h.purchaseItem.purchase.code);

  let yurur = 0;
  const olaylar = har.map(h => {
    yurur += h.quantityDelta;
    return {
      id: h.id, tur: h.type, adet: h.quantityDelta, bakiye: yurur,
      gun: h.occurredAt.toISOString().slice(0, 10),
      girisAni: h.createdAt.toISOString().slice(0, 16).replace("T", " "),
      birimMaliyet: h.unitCostAmount === null ? null : Number(h.unitCostAmount.toString()),
      paraBirimi: h.unitCostCurrency,
      not: h.note,
      partiKodu: h.purchaseItem?.purchase.code ?? null,
      tedarikci: h.purchaseItem?.purchase.supplier?.name ?? null,
      tedarikciNo: h.purchaseItem?.purchase.supplierOrderNo ?? null,
      yediginParti: h.sourceMovementId === null ? null : (partiKod.get(h.sourceMovementId) ?? "?"),
      siparisNo: h.saleItem?.sale.code ?? null,
      kanal: h.saleItem?.sale.channelAccount.channel.name ?? null,
      hesap: h.saleItem?.sale.channelAccount.name ?? null,
      satisFiyati: h.saleItem === null ? null : Number(h.saleItem.unitPriceAmount.toString()),
      satisAdedi: h.saleItem?.quantity ?? null,
      net2: h.saleItem?.sale.net2Amount == null ? null : Number(h.saleItem.sale.net2Amount.toString()),
      kargo: h.saleItem?.sale.cargoAmount == null ? null : Number(h.saleItem.sale.cargoAmount.toString()),
      karDurumu: h.saleItem?.sale.profitStatus ?? null,
      iptal: h.saleItem?.sale.iptalTarihi === null ? false : h.saleItem?.sale.iptalTarihi != null,
      satirToplami: h.purchaseItem === null ? null
        : h.purchaseItem.quantity * (h.unitCostAmount === null ? 0 : Number(h.unitCostAmount.toString())),
    };
  });

  const cikti = {
    sku: v.sku, firmaSku: v.companySku, barkod: v.barcode,
    urun: v.product.name, raf: v.location?.name ?? null,
    netStok: yurur, olaylar,
  };
  const yol = "raporlar/urun-gecmisi-" + SKU + ".json";
  writeFileSync(yol, JSON.stringify(cikti), "utf8");
  console.log(`${v.sku} · ${v.product.name}`);
  console.log(`hareket ${olaylar.length} · net stok ${yurur}`);
  const alim = olaylar.filter(o => o.partiKodu !== null);
  const satis = olaylar.filter(o => o.siparisNo !== null);
  console.log(`alım hareketi ${alim.length} · satış hareketi ${satis.length} · diğer ${olaylar.length - alim.length - satis.length}`);
  console.log(`FIFO bağı olan çıkış: ${olaylar.filter(o => o.yediginParti !== null).length}`);
  console.log(`JSON: ${yol} (${JSON.stringify(cikti).length} karakter)`);
  await prisma.$disconnect();
}
main().catch((e) => { console.error("HATA:", e instanceof Error ? e.stack : e); process.exitCode = 1; });
