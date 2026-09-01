/**
 * ============================================================================
 *  SAAT DİLİMİ GÜN KAYMASI KONTROLÜ — salt okunur
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npx tsx scripts/saat-dilimi-kontrol.ts
 *
 *  Bugüne kadar tarihler ÇALIŞMA ORTAMININ saat dilimine göre gösteriliyordu
 *  (kullanıcı Almanya'da → Europe/Berlin). İş saat dilimi Europe/Istanbul'a
 *  sabitlenince, UTC anı gece yarısına yakın olan kayıtların GÜNÜ kayabilir.
 *
 *  Bu betik hiçbir şeyi değiştirmez; sadece hangi kayıtların iki saat
 *  diliminde FARKLI GÜN gösterdiğini sayar ve örnekler.
 * ============================================================================
 *
 * ⛔ BEKCI SINIFI: BAGIMSIZ — tek seferlik OLCUM betigi, olcut degil.
 * Saat dilimi kararinin (Europe/Istanbul sabiti) o gunku etkisini olcmustu; kuralin koşan karsiligi `i18n:kontrol` ve `tarih:dogrula` icinde.
 */

import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const BICIM_BERLIN = new Intl.DateTimeFormat("tr", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const BICIM_ISTANBUL = new Intl.DateTimeFormat("tr", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type Bulgu = { model: string; alan: string; id: string; berlin: string; istanbul: string };

const bulgular: Bulgu[] = [];
let toplamAlan = 0;

function karsilastir(model: string, alan: string, id: string, tarih: Date | null) {
  if (!tarih) return;
  toplamAlan++;
  const berlin = BICIM_BERLIN.format(tarih);
  const istanbul = BICIM_ISTANBUL.format(tarih);
  if (berlin !== istanbul) {
    bulgular.push({ model, alan, id, berlin, istanbul });
  }
}

async function main() {
  console.log("Mevcut ortam saat dilimi:", Intl.DateTimeFormat().resolvedOptions().timeZone);
  console.log("");

  const hareketler = await prisma.stockMovement.findMany({
    select: { id: true, occurredAt: true, createdAt: true },
  });
  for (const h of hareketler) {
    karsilastir("StockMovement", "occurredAt", h.id, h.occurredAt);
    karsilastir("StockMovement", "createdAt", h.id, h.createdAt);
  }

  const alimlar = await prisma.purchase.findMany({
    select: { id: true, code: true, purchasedAt: true, receivedAt: true, createdAt: true },
  });
  for (const a of alimlar) {
    karsilastir("Purchase", "purchasedAt", a.code, a.purchasedAt);
    karsilastir("Purchase", "receivedAt", a.code, a.receivedAt);
    karsilastir("Purchase", "createdAt", a.code, a.createdAt);
  }

  const satislar = await prisma.sale.findMany({
    select: { id: true, code: true, soldAt: true, createdAt: true },
  });
  for (const s of satislar) {
    karsilastir("Sale", "soldAt", s.code ?? s.id, s.soldAt);
    karsilastir("Sale", "createdAt", s.code ?? s.id, s.createdAt);
  }

  const urunler = await prisma.product.findMany({ select: { id: true, name: true, createdAt: true } });
  for (const u of urunler) karsilastir("Product", "createdAt", u.name, u.createdAt);

  console.log(`Kontrol edilen tarih alanı: ${toplamAlan}`);
  console.log(`Berlin ile İstanbul'da FARKLI GÜN gösteren: ${bulgular.length}`);
  console.log("");

  if (bulgular.length === 0) {
    console.log("GÜN KAYMASI YOK — saat dilimi sabitlenince hiçbir kaydın günü değişmez.");
  } else {
    console.log("KAYAN KAYITLAR:");
    for (const b of bulgular) {
      console.log(`  ${b.model}.${b.alan}  ${b.id}:  Berlin ${b.berlin}  ->  İstanbul ${b.istanbul}`);
    }
  }

  process.exit(0);
}

void main();
