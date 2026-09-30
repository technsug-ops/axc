/**
 * ============================================================================
 *  K32 — TERMOS TAZMİNİ (sipariş 4871211706) · TEK KAYITLIK CANLI YAZIM
 * ----------------------------------------------------------------------------
 *      npx tsx scripts/canli-k32-termos-tazmin.ts            ← kuru koşum
 *      npx tsx scripts/canli-k32-termos-tazmin.ts --uygula   ← yazar
 *
 *  BETIK SINIFI: TEK_SEFERLIK — tek iade kalemine kilitli; stoğa yazmaz.
 *
 *  Kullanıcı beyanı 30.09.2026: _«müşteri kullanmasına rağmen Hepsiburada
 *  iadeyi kabul etmiş ve biz tazmin talebinde bulunmuşuz, talebimiz kabul
 *  edilerek 3327,17 TL ödeme yaptı ve ürün bizde kaldı.»_
 *  Hakedişte: «Hurda geliri» · belge EFA2026000000068 · sipariş 4871211706 ·
 *  ₺3.327,17 · ödeme 14.04.2026 (İstanbul). Bu para kâra hiçbir yerden
 *  girmiyordu.
 *
 *  ⛔ EKRAN YOLU YOK: tazminat talebi yalnız HASARLI kalemden açılır; termos
 *  sağlam döndü ve yeniden satıldı. Hasarlı diye yeniden girmek stoktan
 *  çıkmış gibi gösterirdi.
 *
 *  YAZILAN (tek işlem):
 *    · Compensation — Hepsi Burada · termos iade kalemi · 1 adet · ₺3.327,17 ·
 *      SETTLED · occurredAt = iade günü
 *    · AuditLog TAZMINAT_TAHSIL_EDILDI — `tahsilGunu: 2026-04-14`
 *  ⛔ KİLİT: sipariş no + SKU + iade günü + sağlam adet tutmazsa YAZMAZ.
 *  ⛔ TEKRAR KOŞULABİLİR: iade kalemine bağlı tazminat zaten varsa YAZMAZ.
 *  GERİ ALMA: tazminat ekranında durumu «Kapandı»dan çevirmek tahsili geri
 *  alır (yeni iz); kayıt silinmez.
 * ============================================================================
 */
import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

const SIPARIS_NO = "4871211706";
const SKU = "axcali2176";
const IADE_GUNU = "2026-04-02";
const TUTAR = "3327.17";
const TAHSIL_GUNU = "2026-04-14";
const BELGE = "EFA2026000000068";
const NOT =
  "Hurda geliri EFA2026000000068 — müşteri kullanmasına rağmen HB iadeyi kabul etti; tazmin talebimiz kabul edildi, ürün bizde kaldı (kullanıcı beyanı 30.09.2026, K32)";

async function main() {
  const uygula = process.argv.includes("--uygula");
  const y = canliYapilandirma();
  if (!y.tamam) {
    console.log("Canlı yapılandırma okunamadı:", y.hata);
    process.exitCode = 1;
    return;
  }
  process.env.DATABASE_URL = betikAdresi(y.veri.ham);
  const { prisma } = await import("../src/lib/prisma");
  const { TAHSIL_GUNU_ALANI, TAZMINAT_TAHSIL_EDILDI_EYLEMI } = await import("../src/lib/tazminat");

  const satis = await prisma.sale.findFirst({
    where: { code: SIPARIS_NO },
    select: {
      items: {
        select: {
          variant: { select: { sku: true } },
          returnItems: {
            where: { return: { geriAlindiAt: null } },
            select: { id: true, soundQuantity: true, damagedQuantity: true, return: { select: { occurredAt: true } }, compensations: { select: { id: true } } },
          },
        },
      },
    },
  });
  const kalemler = (satis?.items ?? []).filter((k) => k.variant.sku === SKU).flatMap((k) => k.returnItems);
  if (kalemler.length !== 1) {
    console.log(`⛔ KİLİT TUTMADI: ${SIPARIS_NO}/${SKU} için geçerli iade kalemi ${kalemler.length} (1 olmalı). Yazılmadı.`);
    process.exitCode = 1;
    return;
  }
  const r = kalemler[0];
  const iadeGunu = r.return.occurredAt.toISOString().slice(0, 10);
  if (iadeGunu !== IADE_GUNU || r.soundQuantity !== 1 || r.damagedQuantity !== 0) {
    console.log("⛔ KİLİT TUTMADI:", { iadeGunu, saglam: r.soundQuantity, hasarli: r.damagedQuantity });
    process.exitCode = 1;
    return;
  }
  if (r.compensations.length > 0) {
    console.log(`✓ Zaten yazılmış — iade kalemine bağlı ${r.compensations.length} tazminat var. Hiçbir şey yapılmadı.`);
    return;
  }
  const hb = await prisma.supplier.findMany({ where: { code: "HB" }, select: { id: true, name: true } });
  if (hb.length !== 1) {
    console.log(`⛔ Hepsi Burada tedarikçisi ${hb.length} kayıt (1 olmalı). Yazılmadı.`);
    process.exitCode = 1;
    return;
  }

  console.log("YAZILACAK:");
  console.log(`  tazminat  ${hb[0].name} · iade kalemi ${r.id} · 1 adet · ₺${TUTAR} TRY · SETTLED · olay ${IADE_GUNU}`);
  console.log(`  not       ${NOT}`);
  console.log(`  tahsil    ${TAHSIL_GUNU} (izde ${TAHSIL_GUNU_ALANI})`);
  if (!uygula) {
    console.log("\nKURU KOŞUM — hiçbir şey yazılmadı. Yazmak için --uygula.");
    return;
  }

  const sonuc = await prisma.$transaction(async (tx) => {
    const c = await tx.compensation.create({
      data: {
        supplierId: hb[0].id,
        returnItemId: r.id,
        quantity: 1,
        amount: TUTAR,
        currency: "TRY",
        status: "SETTLED",
        occurredAt: new Date(`${IADE_GUNU}T12:00:00Z`),
        note: NOT,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        action: TAZMINAT_TAHSIL_EDILDI_EYLEMI,
        userId: null,
        targetType: "Compensation",
        targetId: c.id,
        detail: JSON.stringify({ tutar: TUTAR, paraBirimi: "TRY", [TAHSIL_GUNU_ALANI]: TAHSIL_GUNU, kaynak: "HAKEDIS_HURDA_GELIRI", belge: BELGE, betik: "canli-k32-termos-tazmin" }),
      },
    });
    return c.id;
  });
  const dogrula = await prisma.compensation.findUnique({ where: { id: sonuc }, select: { amount: true, status: true, returnItemId: true } });
  console.log("\n✓ YAZILDI:", sonuc, JSON.stringify({ tutar: dogrula?.amount.toString(), durum: dogrula?.status, iadeKalemi: dogrula?.returnItemId }));
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(String(e instanceof Error ? e.stack ?? e.message : e).replace(/mysql:\/\/\S+/g, "***"));
    process.exitCode = 1;
  })
  /* Erken dönüşlerde bağlantı havuzu açık kalıyor ve süreç bitmiyordu (kuru koşum takıldı). */
  .finally(() => process.exit());
