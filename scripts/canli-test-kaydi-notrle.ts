/**
 * ============================================================================
 *  TEST KAYITLARINI NÖTRLE — 14.08.2026 · DAR İSTİSNA · VAKA BAZLI
 * ----------------------------------------------------------------------------
 *  Kuru koşum:  npm run canli:test-kaydi-notrle
 *  Yazım:       npm run canli:test-kaydi-notrle -- --uygula
 *
 *  BETIK SINIFI: TEK_SEFERLIK — iki kaydın KİMLİĞİNE kilitli
 *  (`ALM-BI-260814-02` ve ona bağlı 14.08 test iadesi).
 *  ⛔ GENEL ARAÇ HÂLİNE GETİRİLMEZ: genel bir "test kaydını sil" aracı,
 *  istisnayı kurala çevirir.
 *
 *  BEKCI SINIFI: BAGIMSIZ — canlı veritabanı gerekiyor.
 *
 *  ── ⛔ NİYE İSTİSNA — VE NİYE KAPIYI AŞIYORUZ ───────────────────────────
 *  Halil: _"buradaki her iki alım da yok. İptal edilende diğeri de."_ ve
 *  _"KDV'ye etki etmeyecek şekilde her şeye etkisinin sıfır olacağı şekle
 *  çevirebilir miyiz. Bu bir istisna olur."_
 *
 *  Uygulamanın kendi iptal yolu bunu REDDEDİYOR (`alimlar/actions.ts`):
 *
 *      if (toplamGelen > 0) return { hatalar: [t("iptalEdilemez")] };
 *
 *  Ve kapı HAKLI: malı gelmiş bir alımı iptal etmek, deftere girmiş bir
 *  hareketi dayanaksız bırakır. ⭐ Ama burada mal ZATEN GELMEDİ — kayıt
 *  bir testti ve stok etkisi 27.08 sayımıyla sıfırlandı. Kapı, gerçek bir
 *  alımı korumak için var; bu onun kapsamı DIŞINDA.
 *  _(Anayasa: "ilke, kendi kapsamının dışına uygulanırsa hatayı korur".)_
 *
 *  ── ⭐ ÖLÇÜLDÜ: NEREDEYSE HER ŞEY ZATEN SIFIR ───────────────────────────
 *      axcali1603  ledger 0 · FIFO açık 0 · UYUYOR
 *      axcali1752  ledger 0 · FIFO açık 0 · UYUYOR
 *      test iadesi NET-1 0 · NET-2 0
 *      iade kesintileri  MALIYET_GERI +1.438,99 · DEGISIM_MALIYET −1.438,99
 *                        → toplamı SIFIR
 *      bağlı gerçek satış 11502693455 · NET-2 189,265 · iade ona DOKUNMUYOR
 *
 *  ⛔ SIFIR OLMAYAN TEK ŞEY: alım, ağustos alım toplamına ₺2.048 katıyor
 *  ve o toplam **KDV takibinin tabanı** (`lib/alim-toplami.ts` `CANCELLED`
 *  eliyor). Düzeltilecek olan yalnızca bu.
 *
 *  ── ⛔ NİYE SİLMİYORUZ — ÖLÇÜLDÜ, VARSAYILMADI ──────────────────────────
 *  Şema silme kurallarına bakıldı:
 *
 *      Return → ReturnItem          : Cascade  (kalemler silinir)
 *      StockMovement.returnItemId   : SetNull  ⛔ 4 HAREKET SAHİPSİZ KALIR
 *      ReturnNotice.returnId        : SetNull  ⛔ bildirim sahipsiz kalır
 *
 *  Yani silmek, görünen bir test kaydını **görünmeyen bozuk veriye**
 *  çevirir — `sfsfsf` satış silme vakasının aynısı. Ve iadenin PARASAL
 *  etkisi zaten sıfır; silinecek bir etki yok.
 *  ⭐ Bu yüzden iade SİLİNMEZ, **BEYAN EDİLİR**: notuna test olduğu yazılır
 *  ve listede öyle görünür. Görünür bir test kaydı, görünmez bozuk veriden
 *  iyidir.
 *
 *  ── ⛔ HİÇBİR STOK HAREKETİNE DOKUNULMAZ ────────────────────────────────
 *  `PURCHASE_IN +1` deftere girmiş bir olaydır ve 29.08 sayım düzeltmesi
 *  onu zaten götürmüştür. Ters kayıt yazmak stoğu **−1**'e düşürürdü.
 *  ⭐ Ölçüldü: FIFO alım durumuna BAKMIYOR (`lib/stok.ts`), o yüzden
 *  durumu `CANCELLED` yapmak parti zincirini bozmaz. Parti zaten kapalı.
 *
 *  ── DEĞİŞEN ALAN PARA YA DA MİKTAR DEĞİL ────────────────────────────────
 *  Anayasanın "metadata düzeltmesi — dar istisna" üç şartı:
 *    ① değişen alan miktar/para DEĞİL  → `status` ve `note`   ✓
 *    ② alternatifler ölçülüp elendi    → yukarıda, ölçümle    ✓
 *    ③ iz bırakılıyor                  → eski değerle birlikte ✓
 * ============================================================================
 */

import { writeFileSync } from "node:fs";

import { betikAdresi } from "../src/lib/veritabani-adresi";
import { canliYapilandirma } from "./canli-ortak";

/** ⛔ KİMLİĞE KİLİTLİ — bu betik yalnız bu iki kaydı tanır. */
const ALIM_KODU = "ALM-BI-260814-02";
const IADE_VARYANTI = "axcali1603";
const IADE_GUNU = "2026-08-14";
const BEYAN =
  "TEST KAYDI — gerçek bir işlem DEĞİLDİR. Halil beyanı 03.09.2026: " +
  "\"bu alım kesin yok, bu test alımı\" ve iadesi de test. " +
  "⚠ Stok hareketleri SİLİNMEDİ (ledger disiplini); etkileri 27.08 sayımı " +
  "ve 29.08 COUNT_CORRECTION ile zaten sıfırlandı — ölçüldü: ledger 0, " +
  "FIFO açık parti 0. Alım CANCELLED yapıldı ki KDV tabanına girmesin.";

function para(x: number): string {
  return x.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

  console.log("=".repeat(92));
  console.log(
    `  TEST KAYITLARINI NÖTRLE — ${uygula ? "⚠ YAZIM" : "KURU KOŞUM"}`,
  );
  console.log("=".repeat(92));

  /* ── ① ALIM ────────────────────────────────────────────────────────── */
  const alim = await prisma.purchase.findFirst({
    where: { code: ALIM_KODU },
    select: {
      id: true, code: true, status: true, note: true, purchasedAt: true,
      items: {
        select: {
          id: true, quantity: true, unitCostAmount: true,
          variant: { select: { id: true, sku: true } },
          stockMovements: { select: { id: true, type: true, quantityDelta: true } },
        },
      },
    },
  });
  if (alim === null) {
    console.log(`⛔ ${ALIM_KODU} DEFTERDE YOK — DURDU.`);
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const alimTutari = alim.items.reduce(
    (t, i) => t + i.quantity * Number(i.unitCostAmount.toString()),
    0,
  );
  console.log(`\n① ALIM ${alim.code}`);
  console.log(`   durum ${alim.status} → CANCELLED   ·  tutar ₺${para(alimTutari)}`);
  console.log(
    `   stok hareketi ${alim.items.reduce((t, i) => t + i.stockMovements.length, 0)}` +
      "  ⛔ DOKUNULMAYACAK",
  );
  if (alim.status === "CANCELLED") {
    console.log("   ⭐ ZATEN İPTALLİ — bu adım atlanacak (tekrar koşulabilir).");
  }

  /* ── ② İADE ───────────────────────────────────────────────────────── */
  const v = await prisma.productVariant.findFirst({
    where: { sku: IADE_VARYANTI },
    select: { id: true },
  });
  const rin = v === null ? null : await prisma.stockMovement.findFirst({
    where: {
      variantId: v.id,
      type: "RETURN_IN",
      occurredAt: {
        gte: new Date(`${IADE_GUNU}T00:00:00.000Z`),
        lt: new Date(`${IADE_GUNU}T23:59:59.999Z`),
      },
    },
    select: { returnItemId: true },
  });
  const kalem = rin?.returnItemId == null ? null
    : await prisma.returnItem.findUnique({
        where: { id: rin.returnItemId },
        select: { returnId: true },
      });
  const iade = kalem === null ? null : await prisma.return.findUnique({
    where: { id: kalem.returnId },
    select: {
      id: true, code: true, note: true, occurredAt: true, returnType: true,
      net1Amount: true, net2Amount: true,
      sale: { select: { code: true } },
      fees: { select: { code: true, amount: true } },
      items: { select: { id: true } },
    },
  });
  console.log("\n② İADE");
  if (iade === null) {
    console.log("   ⛔ İADE BULUNAMADI — ölçüm yok ('iade yok' DEĞİL).");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }
  const kesintiToplam = iade.fees.reduce((t, f) => t + Number(f.amount.toString()), 0);
  console.log(`   ${iade.code ?? "(kodsuz)"} · ${iade.returnType} · bağlı satış ${iade.sale.code}`);
  console.log(
    `   NET-1 ${iade.net1Amount ?? "—"} · NET-2 ${iade.net2Amount ?? "—"}` +
      `  ·  kesinti ${iade.fees.length} · toplamı ${para(kesintiToplam)}` +
      (Math.abs(kesintiToplam) < 0.005 ? "  ⭐ SIFIR" : "  ⚠ SIFIR DEĞİL"),
  );
  console.log("   ⛔ SİLİNMEYECEK — notuna beyan yazılacak.");
  console.log(
    "      (silinseydi 4 stok hareketi ve 1 bildirim SAHİPSİZ kalırdı)",
  );

  /* ── ③ ETKİ ───────────────────────────────────────────────────────── */
  const bas = new Date("2026-08-01T00:00:00.000Z");
  const son = new Date("2026-09-01T00:00:00.000Z");
  const agustos = await prisma.purchaseItem.findMany({
    where: {
      purchase: { purchasedAt: { gte: bas, lt: son }, status: { not: "CANCELLED" } },
    },
    select: { quantity: true, unitCostAmount: true },
  });
  const agustosToplam = agustos.reduce(
    (t, i) => t + i.quantity * Number(i.unitCostAmount.toString()),
    0,
  );
  console.log("\n③ ETKİ — ağustos alım toplamı (KDV tabanı)");
  console.log(`   şu an        ₺${para(agustosToplam)}  (${agustos.length} kalem)`);
  const sonra = alim.status === "CANCELLED" ? agustosToplam : agustosToplam - alimTutari;
  console.log(`   sonra        ₺${para(sonra)}`);
  console.log(`   ⭐ fark      ₺${para(sonra - agustosToplam)}`);
  console.log("\n   ⛔ DEĞİŞMEYECEKLER: stok · FIFO · kâr · envanter değeri ·");
  console.log("      bağlı gerçek satışın NET'i · hiçbir stok hareketi");

  if (!uygula) {
    console.log("\n" + "=".repeat(92));
    console.log("  ⛔ KURU KOŞUM — HİÇBİR ŞEY YAZILMADI.");
    console.log("     Yazmak için: npm run canli:test-kaydi-notrle -- --uygula");
    console.log("=".repeat(92) + "\n");
    await prisma.$disconnect();
    return;
  }

  /* ══════════════════════════════════════════════════════════════════════
   *  YAZIM — anlık görüntü · tek işlem · iz eski değerle
   * ══════════════════════════════════════════════════════════════════════ */
  const goruntu = {
    an: new Date().toISOString(),
    alim: {
      id: alim.id, kod: alim.code,
      eskiStatus: alim.status, eskiNote: alim.note,
      tutar: alimTutari,
      hareketId: alim.items.flatMap((i) => i.stockMovements.map((m) => m.id)),
    },
    iade: {
      id: iade.id, kod: iade.code, eskiNote: iade.note,
      net1: iade.net1Amount === null ? null : Number(iade.net1Amount.toString()),
      net2: iade.net2Amount === null ? null : Number(iade.net2Amount.toString()),
      kesintiToplam,
    },
    agustosOncesi: agustosToplam,
  };
  const gYol = "veri/ozel/test-kaydi-notrleme.json";
  writeFileSync(gYol, JSON.stringify(goruntu, null, 2), "utf8");
  console.log(`\n   ⭐ ANLIK GÖRÜNTÜ: ${gYol}`);

  const kullanici = await prisma.user.findFirst({ select: { id: true } });
  if (kullanici === null) {
    console.log("⛔ Kullanıcı yok — iz yazılamaz. DURDU.");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  /** ⛔ TEK İŞLEM: ikisi birlikte değişir ya da hiçbiri. */
  await prisma.$transaction(
    async (tx) => {
      await tx.purchase.update({
        where: { id: alim.id },
        data: {
          status: "CANCELLED",
          note: [alim.note, BEYAN].filter(Boolean).join(" | "),
        },
      });
      await tx.return.update({
        where: { id: iade.id },
        data: { note: [iade.note, BEYAN].filter(Boolean).join(" | ") },
      });
      await tx.auditLog.create({
        data: {
          userId: kullanici.id,
          action: "TEST_KAYDI_NOTRLENDI",
          targetType: "Purchase",
          targetId: alim.id,
          detail: JSON.stringify({
            alim: alim.code,
            eskiStatus: alim.status,
            yeniStatus: "CANCELLED",
            tutar: alimTutari,
            iadeId: iade.id,
            iadeNet1: goruntu.iade.net1,
            iadeNet2: goruntu.iade.net2,
            stokHareketi: "DOKUNULMADI",
            gerekce:
              "Halil beyanı 03.09.2026 — test kaydı. Uygulamanın iptal " +
              "kapısı 'malı gelmiş alım iptal edilemez' diyor; kapı gerçek " +
              "alımı korumak için var, bu onun kapsamı dışında.",
          }),
        },
      });
    },
    { timeout: 60_000 },
  );

  /* ── DOĞRULAMA ────────────────────────────────────────────────────── */
  const sonAlim = await prisma.purchase.findUnique({
    where: { id: alim.id },
    select: { status: true, note: true },
  });
  const sonIade = await prisma.return.findUnique({
    where: { id: iade.id },
    select: { note: true },
  });
  const sonHareket = await prisma.stockMovement.count({
    where: { id: { in: goruntu.alim.hareketId } },
  });
  const sonAgustos = await prisma.purchaseItem.findMany({
    where: {
      purchase: { purchasedAt: { gte: bas, lt: son }, status: { not: "CANCELLED" } },
    },
    select: { quantity: true, unitCostAmount: true },
  });
  const sonToplam = sonAgustos.reduce(
    (t, i) => t + i.quantity * Number(i.unitCostAmount.toString()),
    0,
  );
  console.log("\n④ DOĞRULAMA");
  console.log(`   alım durumu     : ${sonAlim?.status} ${sonAlim?.status === "CANCELLED" ? "✓" : "⛔"}`);
  console.log(`   alım beyanı     : ${sonAlim?.note?.includes("TEST KAYDI") ? "✓" : "⛔ YOK"}`);
  console.log(`   iade beyanı     : ${sonIade?.note?.includes("TEST KAYDI") ? "✓" : "⛔ YOK"}`);
  console.log(
    `   stok hareketi   : ${sonHareket}/${goruntu.alim.hareketId.length}` +
      ` ${sonHareket === goruntu.alim.hareketId.length ? "✓ DOKUNULMADI" : "⛔ KAYIP VAR"}`,
  );
  console.log(`   ağustos toplamı : ₺${para(sonToplam)}  (fark ₺${para(sonToplam - agustosToplam)})`);
  if (
    sonAlim?.status !== "CANCELLED" ||
    sonHareket !== goruntu.alim.hareketId.length
  ) {
    process.exitCode = 1;
  }

  console.log("\n" + "=".repeat(92));
  console.log("  ⚠ STOK, FIFO, KÂR ve ENVANTER DEĞERİ DEĞİŞMEDİ — kâr");
  console.log("     tazelemesi GEREKMEZ.");
  console.log("=".repeat(92) + "\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.stack : e);
  process.exitCode = 1;
});
