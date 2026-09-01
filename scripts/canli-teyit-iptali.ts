/**
 * ============================================================================
 *  DÖNGÜSEL TEYİDİN İPTALİ — 02.09.2026
 * ----------------------------------------------------------------------------
 *  Çalıştırma:  npx tsx scripts/canli-teyit-iptali.ts [--yaz]
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tek bir vakanın düzeltmesi, rutin koşmaz.
 *
 *  ⛔ NİYE: `MALIYET_TEYIDI` izleri "kullanıcı doğruladı" diyor. O teyit
 *  GEÇERSİZDİR ve sebebi bendeydi — doğrulama sayfası her satırda sistemin
 *  yazdığı rakamı GÖSTERİYORDU ("Yazan maliyet" alanı) ve üstüne yer
 *  tutucuya da aynı rakamı koymuştum (`örn. 427,48`). Cevap iki kez
 *  veriliyordu; dönen yedi değerin yedisi de kuruşuna tuttu.
 *
 *  Kullanıcı tespiti: _"7 ürünün rakamlarının kuruşuna kadar tutmasının
 *  istatistiksel olarak mümkün olmadığını sen de biliyorsun."_ Haklı.
 *
 *  ⚠ VE DAHA DERİNİ: teyit BAĞIMSIZ OLAMAZDI. Rakamların kaynağı zaten
 *  kullanıcının kendi `satis.xlsx` dosyası; o listeden okunan bir teyit,
 *  kaynağın kendini doğrulaması demek.
 *  _(Anayasa: "kendi kendini doğrulayan ölçüm ölçüm değildir" ·
 *  "bağımsızlık KAYNAĞIN ayrılığıyla ölçülür, yolun ayrılığıyla değil".)_
 *
 *  ── ⛔ ESKİ İZ SİLİNMEZ ─────────────────────────────────────────────────
 *  Ledger disiplini izlere de işler: bozuk kayıt yerinde bırakılır, üstüne
 *  ONU AÇIKLAYAN ikinci bir iz yazılır ve geçerli olan o olur. Silmek, altı
 *  ay sonra "burada niye bir teyit vardı" sorusunu cevapsız bırakır.
 * ============================================================================
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { canliYapilandirma } from "./canli-ortak";

const IPTAL_EYLEMI = "MALIYET_TEYIDI_IPTAL";

const GEREKCE =
  "DONGUSEL TEYIT — GECERSIZ. Dogrulama sayfasi her satirda sistemin yazdigi " +
  "rakami gosteriyordu ve yer tutucu da ayni rakamdi; kullanici okudugu " +
  "degeri geri yazdi. Ustelik rakamlarin kaynagi zaten kullanicinin kendi " +
  "satis.xlsx dosyasi — teyit bagimsiz OLAMAZDI. Kusur olcumde degil, " +
  "olcum aracindaydi ve araci ben yaptim. Gecerli olan bu izdir.";

async function main() {
  const yaz = process.argv.includes("--yaz");
  const c = canliYapilandirma();
  if (!c.tamam) {
    console.log("Canlı yapılandırma okunamadı:", c.hata);
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(c.veri.ham) });

  const teyitler = await prisma.auditLog.findMany({
    where: { action: "MALIYET_TEYIDI" },
    select: { id: true, targetId: true, createdAt: true },
  });
  const iptaller = await prisma.auditLog.findMany({
    where: { action: IPTAL_EYLEMI },
    select: { targetId: true },
  });
  const zatenIptal = new Set(iptaller.map((x) => x.targetId));
  const kalan = teyitler.filter((t) => !zatenIptal.has(t.targetId));

  console.log(`  MALIYET_TEYIDI izi: ${teyitler.length}`);
  console.log(`  zaten iptal edilmiş: ${teyitler.length - kalan.length}`);
  console.log(`  iptal yazılacak: ${kalan.length}`);

  if (!yaz) {
    console.log("\n  PROVA — hiçbir şey yazılmadı. Yazmak için: --yaz");
    await prisma.$disconnect();
    return;
  }
  if (kalan.length === 0) {
    console.log("\n  Yazılacak iptal yok.");
    await prisma.$disconnect();
    return;
  }

  await prisma.auditLog.createMany({
    data: kalan.map((t) => ({
      action: IPTAL_EYLEMI,
      userId: null,
      targetType: "StockMovement",
      targetId: t.targetId,
      detail: JSON.stringify({
        iptalEdilenIz: t.id,
        gerekce: GEREKCE,
        yazildi: new Date().toISOString(),
      }),
    })),
  });
  console.log(`\n  ✓ ${kalan.length} iptal izi yazıldı (${IPTAL_EYLEMI}).`);
  await prisma.$disconnect();
}

main();
